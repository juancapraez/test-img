/**
 * QR Payment API Route for Vercel
 * Generates QR codes with optional terminal text
 */

const Joi = require("joi");
const crypto = require("crypto");
const { downloadImageAsBase64 } = require("../../utils/imageBase64");
const { generateQr } = require("../../utils/generateQr");
const { createQrTemplate } = require("../../utils/qr-template");
const { renderSvg } = require("../../services/satoriRenderer");
const { convertSvgToJpg } = require("../../services/svgToJpg");
const { uploadFileToS3 } = require("../../services/uploadS3");

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
      logoDataUri = await downloadImageAsBase64(logoUrl);
      setCachedLogo(logoUrl, logoDataUri);
    } catch (error) {
      // If logo download fails, use a placeholder
      console.error('Error downloading logo:', error);
      logoDataUri = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTMwIiBoZWlnaHQ9IjQ1IiB2aWV3Qm94PSIwIDAgMTMwIDQ1IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMzAiIGhlaWdodD0iNDUiIGZpbGw9IiNGM0Y0RjYiLz48dGV4dCB4PSI2NSIgeT0iMjciIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlDQTNBRiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TE9HTzwvdGV4dD48L3N2Zz4=';
    }
  }
  
  return logoDataUri;
}

module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // --- Validación del request ---
  const schema = Joi.object({
    external_reference: Joi.string().required(),
    data: Joi.string().required(),
    terminal: Joi.string().optional(),
    business: Joi.object({
      logo: Joi.string().required(),
      main_color_brand: Joi.string().required(),
      secondary_color_brand: Joi.string().required(),
    }).required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res
      .status(400)
      .json({ error: "Invalid request", details: error.details });
  }

  const { external_reference, data, terminal, business } = value;
  const { main_color_brand, secondary_color_brand, logo } = business;

  try {
    // --- Ejecutar QR generation y logo download en paralelo ---
    const [qrDataUri, logoDataUri] = await Promise.all([
      generateQr(data),
      downloadAndCacheLogo(logo)
    ]);

    // --- Estructura del QR usando Satori ---
    const template = createQrTemplate({
      qrDataUri,
      logoDataUri,
      external_reference,
      terminal,
      main_color_brand,
      secondary_color_brand,
    });

    // Dynamic height based on terminal presence
    const imageHeight = terminal ? 820 : 760;

    // --- Generar SVG y convertir en imagen JPG ---
    const svgString = await renderSvg(template, { height: imageHeight });
    const jpgBuffer = await convertSvgToJpg(svgString, { height: imageHeight });

    // --- Preparar upload a S3 en paralelo ---
    const filename = `${crypto.randomUUID()}-${Date.now()}.jpg`;
    const uploadPromise = uploadFileToS3({
      path: 'qr-codes',
      filename,
      type: 'image/jpeg',
      buffer: jpgBuffer,
    });
    
    const uploadResult = await uploadPromise;

    // --- Responder con la URL de la imagen ---
    res.status(200).json({
      status: "success",
      message: "QR JPG creado exitosamente",
      url: uploadResult.url,
      extension: "jpg",
    });
  } catch (error) {
    console.error("Error generando QR:", error);
    res.status(500).json({
      status: "error",
      code: 500,
      message: `Error interno generando QR: ${error.message}`,
    });
  }
};
