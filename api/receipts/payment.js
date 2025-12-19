/**
 * Receipt Payment API Route for Vercel
 * Generates payment receipt images with PDF to JPG conversion
 */

const crypto = require("crypto");
const Joi = require("joi");
const { downloadImageAsBase64 } = require("../../utils/imageBase64");
const { uploadFileToS3 } = require("../../services/uploadS3");
const { createPdfBuffer } = require("../../utils/createPdfBuffer");
const { convertPdfToJpg } = require("../../services/pdfToJpg");
const { printer } = require("../../utils/pdfFonts");
const { humanDate } = require("../../utils/humanDate");
const { formatNumber } = require("../../utils/formatNumber");

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
  if (secondLine.length > maxLength) {
    secondLine = secondLine.slice(0, maxLength - 3).trim() + "...";
  }
  return [firstLine, secondLine];
}

module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
    } = value;

    // --- Preparación de datos para el recibo ---
    const formatted_date = humanDate();
    const formatted_amount = formatNumber(amount);
    const description_reference_one = reference_one
      ? description + ` (${reference_one})` 
      : description;

    const description_fixed =
      description_reference_one.length > 45
        ? description_reference_one.slice(0, 44) + "..."
        : description_reference_one;

    const client_fixed =
      client.length > 45 ? client.slice(0, 44) + "..." : client;

    const [descriptionLine1, descriptionLine2] = splitTextInTwoLines(description_fixed);
    const [clientLine1, clientLine2] = splitTextInTwoLines(client_fixed);

    // Download logos with caching
    const logoDataUri = await downloadAndCacheLogo(logo);
    const techLogoData = "https://trazo-co.s3.amazonaws.com/logos/Logo+Trazo+Gris+100px.png";
    const techLogoDataUri = await downloadAndCacheLogo(techLogoData);

    const height = 560 + (descriptionLine2 ? 30 : 0) + (clientLine2 ? 30 : 0);
    const heightBkg = height - 40;

    // --- Estructura del PDF ---
    const docDefinition = {
      pageSize: { width: 500, height: height },
      pageMargins: [25, 25, 25, 25],
      background: [
        {
          canvas: [
            {
              type: "rect",
              x: 0,
              y: 0,
              w: 500,
              h: height,
              color: secondary_color_brand,
            },
            {
              type: "rect",
              x: 20,
              y: 20,
              w: 460,
              h: heightBkg,
              r: 12,
              color: "white",
            },
          ],
        },
      ],
      content: [
        {
          stack: [
            {
              image: logoDataUri,
              height: 130,
              maxWidth: 260,
              alignment: "center",
              margin: [0, 20, 0, 20],
              objectFit: 'contain'
            },
            {
              text: "¡Pago exitoso!",
              font: "RedHatDisplay",
              fontSize: 27,
              color: main_color_brand,
              alignment: "center",
              bold: true,
              margin: [0, 0, 0, 12],
            },
            {
              text: formatted_date || manual_date,
              font: "RedHatDisplay",
              fontSize: 12,
              color: "#848688",
              alignment: "center",
              margin: [0, 0, 0, 18],
            },
            {
              canvas: [
                {
                  type: "line",
                  x1: 0,
                  y1: 0,
                  x2: 402,
                  y2: 0,
                  lineWidth: 1.5,
                  lineColor: "#E6E6E6",
                },
              ],
              margin: [8, 0, 8, 18],
            },
            {
              stack: [
                {
                  columns: [
                    {
                      text: "Valor de la transacción:",
                      font: "RedHatDisplay",
                      fontSize: 17,
                      bold: true,
                      color: "#222",
                      width: 220,
                    },
                    {
                      text: formatted_amount,
                      font: "RedHatDisplay",
                      fontSize: 17,
                      color: "#222",
                      alignment: "right",
                    },
                  ],
                  margin: [0, 0, 0, 8],
                },
                {
                  columns: [
                    {
                      text: "Descripción:",
                      font: "RedHatDisplay",
                      fontSize: 17,
                      bold: true,
                      color: "#222",
                      width: 100,
                    },
                    {
                      text: descriptionLine1,
                      font: "RedHatDisplay",
                      fontSize: 17,
                      color: "#222",
                      alignment: "right",
                    },
                  ],
                  margin: [0, 0, 0, descriptionLine2 ? 0 : 8],
                },
                ...(descriptionLine2
                  ? [
                      {
                        columns: [
                          { text: "", width: 180 },
                          {
                            text: descriptionLine2,
                            font: "RedHatDisplay",
                            fontSize: 17,
                            color: "#222",
                            alignment: "right",
                          },
                        ],
                        margin: [0, 0, 0, 8],
                      },
                    ]
                  : []),
                {
                  columns: [
                    {
                      text: "Cliente:",
                      font: "RedHatDisplay",
                      fontSize: 17,
                      bold: true,
                      color: "#222",
                      width: 70,
                    },
                    {
                      text: clientLine1,
                      font: "RedHatDisplay",
                      fontSize: 17,
                      color: "#222",
                      alignment: "right",
                    },
                  ],
                  margin: [0, 0, 0, clientLine2 ? 0 : 8],
                },
                ...(clientLine2
                  ? [
                      {
                        columns: [
                          { text: "", width: 180 },
                          {
                            text: clientLine2,
                            font: "RedHatDisplay",
                            fontSize: 17,
                            color: "#222",
                            alignment: "right",
                          },
                        ],
                        margin: [0, 0, 0, 8],
                      },
                    ]
                  : []),
                {
                  columns: [
                    {
                      text: "Medio de contacto:",
                      font: "RedHatDisplay",
                      fontSize: 17,
                      bold: true,
                      color: "#222",
                      width: 220,
                    },
                    {
                      text: user_phone || user_email,
                      font: "RedHatDisplay",
                      fontSize: 17,
                      color: "#222",
                      alignment: "right",
                    },
                  ],
                  margin: [0, 0, 0, 8],
                },
                {
                  columns: [
                    {
                      text: "Medio de pago:",
                      font: "RedHatDisplay",
                      fontSize: 17,
                      bold: true,
                      color: "#222",
                      width: 220,
                    },
                    {
                      text: payment_method,
                      font: "RedHatDisplay",
                      fontSize: 17,
                      color: "#222",
                      alignment: "right",
                    },
                  ],
                  margin: [0, 0, 0, 8],
                },
                {
                  columns: [
                    {
                      text: "Código de transacción:",
                      font: "RedHatDisplay",
                      fontSize: 17,
                      bold: true,
                      color: "#222",
                      width: 220,
                    },
                    {
                      text: external_reference,
                      font: "RedHatDisplay",
                      fontSize: 17,
                      color: "#222",
                      alignment: "right",
                    },
                  ],
                  margin: [0, 0, 0, 8],
                },
              ],
              margin: [0, 0, 0, 18],
            },
            {
              text: [
                "Puedes validar este pago en ",
                {
                  text: "validar.trazo.co",
                  italics: true,
                },
              ],
              font: "RedHatDisplay",
              fontSize: 13,
              color: "#848688",
              alignment: "center",
              margin: [0, 20, 0, 5],
            },
            {
              columns: [
                {
                  text: "Con la tecnología de",
                  font: "RedHatDisplay",
                  fontSize: 13,
                  color: "#848688",
                  alignment: "right",
                  margin: [0, 3, 117, 0],
                },
                {
                  image: techLogoDataUri,
                  width: 48,
                  alignment: "right",
                  margin: [0, 0, 58, 0],
                },
              ],
              columnGap: 0,
              alignment: "center",
              margin: [0, 10, 0, 0],
            },
          ],
          margin: [18, 0, 18, 0],
        },
      ],
      defaultStyle: {
        font: "RedHatDisplay",
        fontSize: 14,
      },
    };

    // --- Generar buffer PDF y convertir en imagen ---
    const pdfBuffer = await createPdfBuffer(printer, docDefinition);
    const imageBuffer = await convertPdfToJpg(pdfBuffer);

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
};
