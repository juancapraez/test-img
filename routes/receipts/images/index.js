/**
 * Receipt Images API Routes
 * Generates receipt images using Satori (SVG to JPG conversion)
 */

const express = require("express");
const crypto = require("crypto");
const Joi = require("joi");
const { downloadImageAsBase64 } = require("../../../utils/imageBase64");
const { uploadFileToS3 } = require("../../../services/uploadS3");
const { createReceiptTemplate } = require("../../../utils/receipt-template");
const { renderSvg } = require("../../../services/satoriRenderer");
const { convertSvgToJpg } = require("../../../services/svgToJpg");
const { humanDate } = require("../../../utils/humanDate");
const { formatNumber } = require("../../../utils/formatNumber");
const { TRAZO_LOGO_BASE64 } = require("../../../utils/trazo-logo");

const router = express.Router();

// --- In-memory logo cache with 12-hour TTL ---
const logoCache = new Map();
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
const MAX_CACHE_SIZE = 1000;

// Cleanup expired entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of logoCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      logoCache.delete(key);
    }
  }
}, 60 * 60 * 1000); // 1 hour

function getCachedLogo(logoUrl) {
  const cached = logoCache.get(logoUrl);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    // Move to end (LRU)
    logoCache.delete(logoUrl);
    logoCache.set(logoUrl, cached);
    return cached.dataUri;
  }
  return null;
}

function setCachedLogo(logoUrl, dataUri) {
  // If cache is full, remove oldest entry
  if (logoCache.size >= MAX_CACHE_SIZE) {
    const firstKey = logoCache.keys().next().value;
    logoCache.delete(firstKey);
  }
  logoCache.set(logoUrl, {
    dataUri,
    timestamp: Date.now()
  });
}

async function downloadAndCacheLogo(logoUrl) {
  let logoDataUri = getCachedLogo(logoUrl);
  
  if (!logoDataUri) {
    try {
      logoDataUri = await downloadImageAsBase64(logoUrl, "image/png");
      setCachedLogo(logoUrl, logoDataUri);
    } catch (error) {
      // If logo download fails, use a placeholder
      console.error('Error downloading logo:', error);
      logoDataUri = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTMwIiBoZWlnaHQ9IjQ1IiB2aWV3Qm94PSIwIDAgMTMwIDQ1IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMzAiIGhlaWdodD0iNDUiIGZpbGw9IiNGM0Y0RjYiLz48dGV4dCB4PSI2NSIgeT0iMjciIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlDQTNBRiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TE9HTzwvdGV4dD48L3N2Zz4=';
    }
  }
  
  return logoDataUri;
}

function splitTextInTwoLines(text, maxLength = 35) {
  if (!text) return ["", ""];
  if (text.length <= maxLength) return [text.trim(), ""];
  const breakpoint = text.lastIndexOf(" ", maxLength);
  let firstLine = "";
  let secondLine = "";
  if (breakpoint === -1) {
    firstLine = text.slice(0, maxLength).trim();
    secondLine = text.slice(maxLength).trim();
  } else {
    firstLine = text.slice(0, breakpoint).trim();
    secondLine = text.slice(breakpoint + 1).trim();
  }
  // If second line is still too long, truncate it and add "..."
  if (secondLine.length > maxLength) {
    secondLine = secondLine.slice(0, maxLength - 3).trim() + "...";
  }
  return [firstLine, secondLine];
}

// --- Payment Receipt Route ---
router.post("/receipt/image/payment", async (req, res) => {
  try {
    // --- Validación del request ---
    const schema = Joi.object({
      logo: Joi.string().required(),
      manual_date: Joi.string().allow(null, ""),
      external_reference: Joi.string().required(),
      description: Joi.string().required(),
      amount: Joi.number().required(),
      currency: Joi.string().allow(null, ""),
      reference_one: Joi.string().allow(null, ""),
      payment_method: Joi.string().allow(null, ""),
      payment_provider_source: Joi.string().allow(null, ""),
      client: Joi.string().allow(null, ""),
      user_phone: Joi.string().allow(null, ""),
      user_id_type: Joi.string().allow(null, ""),
      user_id: Joi.string().allow(null, ""),
      user_email: Joi.string().allow(null, ""),
      merchant_name: Joi.string().allow(null, ""),
      merchant_id: Joi.string().allow(null, ""),
      merchant_id_type: Joi.string().allow(null, ""),
      main_color_brand: Joi.string().required(),
      secondary_color_brand: Joi.string().required(),
      resolution: Joi.string().valid("1x", "2x").default("1x"), // New parameter
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res
        .status(400)
        .json({ error: "Invalid request", details: error.details });
    }

    const {
      logo,
      manual_date,
      external_reference,
      description,
      amount,
      currency,
      reference_one,
      payment_method,
      payment_provider_source,
      client,
      user_phone,
      user_id_type,
      user_id,
      user_email,
      merchant_name,
      merchant_id,
      merchant_id_type,
      main_color_brand,
      secondary_color_brand,
      resolution,
    } = value;

    // --- Preparación de datos para el recibo ---
    const formatted_date = humanDate();
    const formatted_amount = formatNumber(amount);
    const description_reference_one = reference_one
      ? description + ` (${reference_one})` 
      : description;

    const description_fixed = description_reference_one;

    const client_fixed =
      client.length > 45 ? client.slice(0, 44) + "..." : client;

    const [descriptionLine1, descriptionLine2] = splitTextInTwoLines(description_fixed, 30);
    const [clientLine1, clientLine2] = splitTextInTwoLines(client_fixed, 30);

    // Download logos with caching
    const logoDataUri = await downloadAndCacheLogo(logo);
    const techLogoDataUri = TRAZO_LOGO_BASE64; // Use cached base64 instead of downloading

    const height = 560 + (descriptionLine2 ? 30 : 0) + (clientLine2 ? 30 : 0);
    const heightBkg = height - 40;

    // --- Create receipt template using Satori ---
    const template = createReceiptTemplate({
      logoDataUri,
      techLogoDataUri,
      manual_date,
      external_reference,
      description,
      amount,
      currency,
      reference_one,
      payment_method,
      payment_provider_source,
      client,
      user_phone,
      user_id_type,
      user_id,
      user_email,
      merchant_name,
      merchant_id,
      merchant_id_type,
      main_color_brand,
      secondary_color_brand,
      formatted_date,
      formatted_amount,
      descriptionLine1,
      descriptionLine2,
      clientLine1,
      clientLine2,
      type: 'payment',
    });

    // Calculate exact height based on template content
    // Outer padding: 25 * 1.5 * 2 = 75
    // White card padding: 20 * 1.5 * 2 = 60
    // Logo container: 60 * 1.5 + margins (20 * 1.5 + 20 * 1.5) = 90 + 30 + 30 = 150
    // Title: 25 * 1.5 + margin 12 * 1.5 = 37.5 + 18 = 55.5
    // Date: 12 * 1.5 + margin 18 * 1.5 = 18 + 27 = 45
    // Divider 1: 1 + margin 16 = 17
    // Card 1: padding 16 * 1.5 * 2 = 48 + title 25 * 1.5 + margin 12 * 1.5 + 4 rows * (16 * 1.5 + gap 8 * 1.5) = 37.5 + 18 + 4 * (24 + 12) = 55.5 + 144 = 247.5
    // Divider 2: 1 + margin 16 = 17
    // Card 2: padding 16 * 1.5 * 2 = 48 + title 25 * 1.5 + margin 12 * 1.5 + 3 rows * (16 * 1.5 + gap 8 * 1.5) = 37.5 + 18 + 3 * (24 + 12) = 55.5 + 108 = 211.5
    // Divider 3: 1 + margin 16 = 17
    // Footer with text and logo: 20 * 1.5 + margin 10 * 1.5 = 30 + 15 = 45
    // Total base height = 75 + 60 + 150 + 55.5 + 45 + 17 + 247.5 + 17 + 211.5 + 17 + 45 = 940
    
    const baseHeight = 998 + (descriptionLine2 ? 30 * 1.5 : 0) + (clientLine2 ? 30 * 1.5 : 0);
    const baseWidth = 750; // 500 * 1.5
    
    // Apply resolution multiplier
    const imageHeight = resolution === "2x" ? baseHeight * 2 : baseHeight;
    const imageWidth = resolution === "2x" ? baseWidth * 2 : baseWidth;

    // --- Generate SVG and convert to JPG ---
    const svgString = await renderSvg(template, { width: imageWidth, height: imageHeight });
    const imageBuffer = await convertSvgToJpg(svgString, { width: imageWidth, height: imageHeight });

    // --- Subir a S3 ---
    const filename = `${crypto.randomUUID()}-${Date.now()}.jpg`;
    const { url } = await uploadFileToS3({
      path: "payments/receipts",
      filename,
      type: "image/jpeg",
      buffer: imageBuffer,
    });

    // --- Responder ---
    res.status(200).json({
      status: "success",
      message: "Recibo JPG creado exitosamente",
      url,
      extension: "jpg",
    });
  } catch (err) {
    console.error("Error generando recibo:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message:
        "Error interno generando recibo" +
        (err.message ? ": " + err.message : ""),
    });
  }
});

// --- Payout Receipt Route ---
router.post("/receipt/image/payout", async (req, res) => {
  try {
    // --- Validación del request ---
    const schema = Joi.object({
      logo: Joi.string().required(),
      manual_date: Joi.string().allow(null, ""),
      external_reference: Joi.string().required(),
      description: Joi.string().required(),
      amount: Joi.number().required(),
      currency: Joi.string().allow(null, ""),
      reference_one: Joi.string().allow(null, ""),
      payment_method: Joi.string().allow(null, ""),
      payment_provider_source: Joi.string().allow(null, ""),
      client: Joi.string().allow(null, ""),
      user_phone: Joi.string().allow(null, ""),
      user_id_type: Joi.string().allow(null, ""),
      user_id: Joi.string().allow(null, ""),
      user_email: Joi.string().allow(null, ""),
      merchant_name: Joi.string().allow(null, ""),
      merchant_id: Joi.string().allow(null, ""),
      merchant_id_type: Joi.string().allow(null, ""),
      bank_name: Joi.string().allow(null, ""),
      bank_account_type: Joi.string().allow(null, ""),
      bank_account_number: Joi.string().allow(null, ""),
      main_color_brand: Joi.string().required(),
      secondary_color_brand: Joi.string().required(),
      resolution: Joi.string().valid("1x", "2x").default("1x"), // New parameter
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res
        .status(400)
        .json({ error: "Invalid request", details: error.details });
    }

    const {
      logo,
      merchant_name,
      merchant_id,
      merchant_id_type,
      main_color_brand,
      secondary_color_brand,
      external_reference,
      amount,
      currency,
      description,
      reference_one,
      client,
      user_phone,
      user_email,
      user_id,
      user_id_type,
      payment_method,
      payment_provider_source,
      bank_name,
      bank_account_type,
      bank_account_number,
      manual_date,
      resolution,
    } = value;

    // --- Preparación de datos para el recibo ---
    const formatted_date = humanDate();
    const formatted_amount = formatNumber(amount);
    const description_reference_one = reference_one
      ? description + ` (${reference_one})` 
      : description;

    const description_fixed = description_reference_one;

    const client_fixed =
      client.length > 45 ? client.slice(0, 44) + "..." : client;

    const [descriptionLine1, descriptionLine2] = splitTextInTwoLines(description_fixed, 30);
    const [clientLine1, clientLine2] = splitTextInTwoLines(client_fixed, 30);

    // Download logos with caching
    const logoDataUri = await downloadAndCacheLogo(logo);
    const techLogoDataUri = TRAZO_LOGO_BASE64; // Use cached base64 instead of downloading

    const height = 560 + (descriptionLine2 ? 30 : 0) + (clientLine2 ? 30 : 0);
    const heightBkg = height - 40;
    
    // --- Create receipt template using Satori ---
    const template = createReceiptTemplate({
      logoDataUri,
      techLogoDataUri,
      manual_date,
      external_reference,
      description,
      amount,
      currency,
      reference_one,
      payment_method,
      payment_provider_source,
      client,
      user_phone,
      user_id_type,
      user_id,
      user_email,
      merchant_name,
      merchant_id,
      merchant_id_type,
      main_color_brand,
      secondary_color_brand,
      formatted_date,
      formatted_amount,
      descriptionLine1,
      descriptionLine2,
      clientLine1,
      clientLine2,
      type: 'payout',
      bank_name,
      bank_account_type,
      bank_account_number,
    });

    // Calculate exact height based on template content
    // Outer padding: 25 * 1.5 * 2 = 75
    // White card padding: 20 * 1.5 * 2 = 60
    // Logo container: 60 * 1.5 + margins (20 * 1.5 + 20 * 1.5) = 90 + 30 + 30 = 150
    // Title: 25 * 1.5 + margin 12 * 1.5 = 37.5 + 18 = 55.5
    // Date: 12 * 1.5 + margin 18 * 1.5 = 18 + 27 = 45
    // Divider 1: 1 + margin 16 = 17
    // Card 1: padding 16 * 1.5 * 2 = 48 + title 25 * 1.5 + margin 12 * 1.5 + 4 rows * (16 * 1.5 + gap 8 * 1.5) = 37.5 + 18 + 4 * (24 + 12) = 55.5 + 144 = 247.5
    // Divider 2: 1 + margin 16 = 17
    // Card 2: padding 16 * 1.5 * 2 = 48 + title 25 * 1.5 + margin 12 * 1.5 + 3 rows * (16 * 1.5 + gap 8 * 1.5) = 37.5 + 18 + 3 * (24 + 12) = 55.5 + 108 = 211.5
    // Card 3 (bank info): padding 16 * 1.5 * 2 = 48 + title 25 * 1.5 + margin 12 * 1.5 + 3 rows * (16 * 1.5 + gap 8 * 1.5) = 37.5 + 18 + 3 * (24 + 12) = 55.5 + 108 = 211.5
    // Divider 3: 1 + margin 16 = 17
    // Footer with text and logo: 20 * 1.5 + margin 10 * 1.5 = 30 + 15 = 45
    // Total base height = 75 + 60 + 150 + 55.5 + 45 + 17 + 247.5 + 17 + 211.5 + 211.5 + 17 + 45 = 1152
    
    const baseHeight = 1152 + 60 + (descriptionLine2 ? 30 * 1.5 : 0) + (clientLine2 ? 30 * 1.5 : 0);
    const baseWidth = 720; // 480 * 1.5
    
    // Apply resolution multiplier
    const imageHeight = resolution === "2x" ? baseHeight * 2 : baseHeight;
    const imageWidth = resolution === "2x" ? baseWidth * 2 : baseWidth;

    // --- Generate SVG and convert to JPG ---
    const svgString = await renderSvg(template, { width: imageWidth, height: imageHeight });
    const imageBuffer = await convertSvgToJpg(svgString, { width: imageWidth, height: imageHeight });

    // --- Subir a S3 ---
    const filename = `${crypto.randomUUID()}-${Date.now()}.jpg`;
    const { url } = await uploadFileToS3({
      path: "payments/receipts",
      filename,
      type: "image/jpeg",
      buffer: imageBuffer,
    });

    // --- Responder ---
    res.status(200).json({
      status: "success",
      message: "Recibo JPG creado exitosamente",
      url,
      extension: "jpg",
    });
  } catch (err) {
    console.error("Error generando recibo:", err);
    res.status(500).json({
      status: "error",
      code: 500,
      message:
        "Error interno generando recibo" +
        (err.message ? ": " + err.message : ""),
    });
  }
});

module.exports = router;
