const express = require("express");
const Joi = require("joi");
const { v4: uuidv4 } = require("uuid");
const { downloadImageAsBase64 } = require("../../utils/imageBase64");
const { generateQr } = require("../../utils/generateQr");
const { createQrTemplate } = require("../../utils/qr-template");
const { renderSvg } = require("../../services/satoriRenderer");
const { convertSvgToJpg } = require("../../services/svgToJpg");
const { uploadFileToS3 } = require("../../services/uploadS3");
const router = express.Router();

// Cache para logos (12 horas) con LRU
const MAX_CACHE_SIZE = 1000; // Máximo 1000 logos en caché
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 horas en milisegundos
const logoCache = new Map();

// Cleanup interval para evitar memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of logoCache.entries()) {
    if (now - value.timestamp >= CACHE_TTL) {
      logoCache.delete(key);
    }
  }
}, 60 * 60 * 1000); // Limpiar cada hora

async function getCachedLogo(logoUrl) {
  const cacheKey = logoUrl;
  const cached = logoCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    // Mover al final (LRU)
    logoCache.delete(cacheKey);
    logoCache.set(cacheKey, cached);
    return cached.dataUri;
  }
  
  const dataUri = await downloadImageAsBase64(logoUrl);
  
  // Evict si excede el tamaño máximo
  if (logoCache.size >= MAX_CACHE_SIZE) {
    const firstKey = logoCache.keys().next().value;
    logoCache.delete(firstKey);
  }
  
  logoCache.set(cacheKey, {
    dataUri,
    timestamp: Date.now()
  });
  
  return dataUri;
}

router.post("/qr/payment", async (req, res) => {
  // --- Validación del request (normalmente usamos Joi: https://joi.dev/) ---
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
    const qrDataUri = await generateQr(data);
    const logoDataUri = await getCachedLogo(logo);

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

    // --- Subir a S3 ---
    const filename = `${uuidv4()}-${Date.now()}.jpg`;
    const { url } = await uploadFileToS3({
      path: "payments/qr-codes",
      filename,
      type: "image/jpeg",
      buffer: jpgBuffer,
    });

    // --- Respuesta ---
    res.status(200).json({
      status: "success",
      message: "QR JPG creado exitosamente",
      url,
      extension: "jpg",
    });
  } catch (err) {
    res
      .status(500)
      .json({
        status: "error",
        code: 500,
        message: "Error interno generando QR" + (err.message ? ": " + err.message : ""),
      });
  }
});

module.exports = router;
