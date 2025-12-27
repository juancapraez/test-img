/**
 * PDF Payout Receipt API Route
 * Generates PDF receipts for payouts
 */

const crypto = require("crypto");
const Joi = require("joi");
const { downloadAndCacheLogo } = require("../../../utils/logoCache");
const { uploadFileToS3 } = require("../../../services/uploadS3");
const { createPdfBuffer } = require("../../../utils/createPdfBuffer");
const { getPrinter } = require("../../../utils/pdfFonts");
const { humanDate } = require("../../../utils/humanDate");
const { hasValidApiKey } = require("../../../utils/auth");
const { formatNumber } = require("../../../utils/formatNumber");

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
      bank_name: Joi.string().allow(null, ""),
      bank_account_type: Joi.string().allow(null, ""),
      bank_account_number: Joi.string().allow(null, ""),
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
      bank_name,
      bank_account_type,
      bank_account_number,
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

    // --- Formateo de datos ---
    const formatted_date = manual_date || humanDate(new Date());
    const formatted_amount = formatNumber(amount, currency);
    const hasKey = hasValidApiKey(req);
    
    // --- Carga de logos ---
    let logoDataUri = null;
    let techLogoDataUri = null;
    
    try {
      logoDataUri = await downloadAndCacheLogo(logo);
      // Convert SVG to data URI that pdfmake can handle
      if (logoDataUri && logoDataUri.startsWith('data:image/svg+xml')) {
        // For SVG, use fallback or convert to PNG
        console.log('SVG logo detected, pdfmake requires PNG/JPG');
        logoDataUri = null; // Use fallback
      }
    } catch (error) {
      console.log('Error loading logo:', error.message);
      logoDataUri = null;
    }
    
    try {
      techLogoDataUri = await downloadAndCacheLogo("https://trazo-co.s3.amazonaws.com/logos/Logo+Trazo+Color+Secundario.png");
    } catch (error) {
      console.log('Error loading tech logo:', error.message);
      techLogoDataUri = null;
    }

    const truncate = (value, max = 40) => {
      if (value === null || value === undefined) return "-";
      const str = String(value);
      if (str.length <= max) return str;
      return `${str.slice(0, max - 1)}…`;
    };

    const maskId = (value) => {
      if (!value) return "-";
      const str = String(value);
      if (str.length <= 6) return `${str.slice(0, 1)}***${str.slice(-1)}`;
      return `${str.slice(0, 3)}***${str.slice(-2)}`;
    };

    const safeDescription = truncate(description, 60);
    const safeReference = truncate(reference_one || "-", 40);
    const safeExternalRef = truncate(external_reference, 40);
    const safeClient = truncate(client, 32);
    const safeEmail = truncate(user_email || "-", 40);
    const safePaymentMethod = truncate(payment_method || "-", 28);
    const safePaymentProvider = truncate(payment_provider_source || "-", 28);
    const safeMerchantDisplay = truncate(
      merchant_name && merchant_id
        ? `${merchant_name} (${merchant_id})`
        : merchant_name || "",
      46
    );
    const maskedUserId = `${user_id_type} ${maskId(user_id)}`;
    const safeBankName = truncate(bank_name || "-", 28);
    const safeBankAccountType = truncate(bank_account_type || "-", 28);
    const safeBankAccountNumber = truncate(bank_account_number || "-", 28);
    // --- Estructura del PDF ---
    const docDefinition = {
      pageSize: { width: 578, height: 827 },
      pageMargins: [40, 40, 40, 32],
      watermark: hasKey
        ? null
        : {
            text: "Prueba Prueba",
            color: "#ff0000",
            opacity: 0.06,
            bold: true,
            angle: 315,
          },
      background: () => {
        const baseCanvas = [
          {
            type: "rect",
            x: 0,
            y: 0,
            w: 578,
            h: 827,
            color: secondary_color_brand || "#DBFDBA",
          },
          {
            type: "rect",
            x: 18,
            y: 18,
            w: 542,
            h: 791,
            r: 12,
            color: "white",
          },
        ];

        const layers = [{ canvas: baseCanvas }];

        if (!hasKey) {
          const wmStyle = {
            color: "#ff0000",
            opacity: 0.08,
            bold: true,
            fontSize: 45,
            angle: 315,
          };
          layers.push(
            { text: "/   /   /   /   /   /   /   /   /   /   /   /", ...wmStyle, absolutePosition: { x: 0, y: 0 } },
            { text: "/   /   /   /   /   /   /   /   /   /   /   /", ...wmStyle, absolutePosition: { x: 0, y: 75 } },
            { text: "Versión de prueba.", ...wmStyle, absolutePosition: { x: 60, y: 150 } },
            { text: "/   /   /   /   /   /   /   /   /   /   /   /", ...wmStyle, absolutePosition: { x: 0, y: 225 } },
            { text: "/   /   /   /   /   /   /   /   /   /   /   /", ...wmStyle, absolutePosition: { x: 0, y: 300 } },
            { text: "Documento no válido como comprobante", ...wmStyle, absolutePosition: { x: 60, y: 375 } },
            { text: "/   /   /   /   /   /   /   /   /   /   /   /", ...wmStyle, absolutePosition: { x: 0, y: 500 } },
            { text: "/   /   /   /   /   /   /   /   /   /   /   /", ...wmStyle, absolutePosition: { x: 0, y: 575 } },
            { text: "{ Developer mode }", ...wmStyle, absolutePosition: { x: 60, y: 650 } },
            { text: "/   /   /   /   /   /   /   /   /   /   /   /", ...wmStyle, absolutePosition: { x: 0, y: 725 } },
          );
        }

        return layers;
      },
      content: [
        {
          stack: [
            {
              columns: [
                {
                  stack: [
                    { text: "¡Transferencia confirmada!", style: "h1", color: main_color_brand || "#374550" },
                    { text: formatted_date, style: "muted" },
                  ],
                  width: "*",
                },
                logoDataUri
                  ? {
                      image: logoDataUri,
                      width: 82,
                      alignment: "right",
                      margin: [0, 4, 0, 0],
                    }
                  : { width: 82, text: "" },
              ],
              columnGap: 8,
              margin: [0, 0, 0, 10],
            },
            {
              text: "A continuación encontrarás la información de la transferencia completada:",
              fontSize: 12,
              margin: [0, 0, 0, 10],
            },
            {
              canvas: [
                {
                  type: "line",
                  x1: 0,
                  y1: 0,
                  x2: 498,
                  y2: 0,
                  color: "#e5e7eb",
                  lineWidth: 1,
                },
              ],
              margin: [0, 0, 0, 6],
            },
            { text: "Detalles", style: "sectionTitle", color: main_color_brand || "#374550" },
            {
              table: {
                widths: ["*", "*"],
                body: [
                  [
                    {
                      stack: [
                        { text: "Monto", style: "label" },
                        { text: formatted_amount, style: "value" },
                      ],
                      margin: [0, 2, 0, 4],
                    },
                    {
                      stack: [
                        { text: "Código de transacción", style: "label" },
                        { text: safeExternalRef, style: "value", noWrap: true },
                      ],
                      margin: [0, 2, 0, 4],
                    },
                  ],
                  [
                    {
                      stack: [
                        { text: "Descripción", style: "label" },
                        { text: safeDescription, style: "value", noWrap: true },
                      ],
                      colSpan: 2,
                      margin: [0, 2, 0, 4],
                    },
                    {},
                  ],
                  [
                    {
                      stack: [
                        { text: "Referencia", style: "label" },
                        { text: safeReference, style: "value", noWrap: true },
                      ],
                      colSpan: 2,
                      margin: [0, 2, 0, 4],
                    },
                    {},
                  ],
                ],
              },
              layout: {
                hLineWidth: () => 0,
                vLineWidth: () => 0,
                paddingLeft: () => 0,
                paddingRight: () => 0,
                paddingTop: () => 2,
                paddingBottom: () => 4,
              },
              margin: [0, 2, 0, 8],
            },
            {
              canvas: [
                {
                  type: "line",
                  x1: 0,
                  y1: 0,
                  x2: 498,
                  y2: 0,
                  color: "#e5e7eb",
                  lineWidth: 1,
                },
              ],
              margin: [0, 0, 0, 8],
            },
            { text: "Datos del pago", style: "sectionTitle", color: main_color_brand || "#374550" },
            {
              table: {
                widths: ["*", "*"],
                body: [
                  [
                    {
                      stack: [
                        { text: "Entidad", style: "label" },
                        { text: safeBankName, style: "value", noWrap: true },
                      ],
                    },
                    {
                      stack: [
                        { text: "Tipo de cuenta", style: "label" },
                        { text: safeBankAccountType, style: "value", noWrap: true },
                      ],
                    },
                  ],
                  [
                    {
                      stack: [
                        { text: "Metodo de pago", style: "label" },
                        { text: payment_method || "-", style: "value", noWrap: true },
                      ],
                    },
                    {
                      stack: [
                        { text: "No. de cuenta", style: "label" },
                        { text: safeBankAccountNumber, style: "value", noWrap: true },
                      ],
                    },
                  ],
                ],
              },
              layout: {
                hLineWidth: () => 0,
                vLineWidth: () => 0,
                paddingLeft: () => 0,
                paddingRight: () => 0,
                paddingTop: () => 6,
                paddingBottom: () => 6,
              },
              margin: [0, 2, 0, 8],
            },
            {
              text: [
                { text: "Este pago aparecerá como ", fontSize: 10, color: main_color_brand || "#374550" },
                { text: payment_provider_source || 'Trazo Tecnología', fontSize: 10, bold: true, color: main_color_brand || "#374550" },
                { text: " en tus movimientos.", fontSize: 10, color: main_color_brand || "#374550" },
              ],
              margin: [0, 0, 0, 15],
            },
            {
              canvas: [
                {
                  type: "line",
                  x1: 0,
                  y1: 0,
                  x2: 498,
                  y2: 0,
                  color: "#e5e7eb",
                  lineWidth: 1,
                },
              ],
              margin: [0, 0, 0, 8],
            },
            { text: "Cliente", style: "sectionTitle", color: main_color_brand || "#374550" },
            {
              table: {
                widths: ["*", "*"],
                body: [
                  [
                    {
                      stack: [
                        { text: "Nombre", style: "label" },
                        { text: safeClient, style: "value", noWrap: true },
                      ],
                    },
                    {
                      stack: [
                        { text: "Identificación", style: "label" },
                        { text: maskedUserId, style: "value", noWrap: true },
                      ],
                    },
                  ],
                  [
                    {
                      stack: [
                        { text: "Celular", style: "label" },
                        { text: user_phone || "-", style: "value" },
                      ],
                    },
                    {
                      stack: [
                        { text: "Correo", style: "label" },
                        { text: safeEmail, style: "value", noWrap: true },
                      ],
                    },
                  ],
                ],
              },
              layout: {
                hLineWidth: () => 0,
                vLineWidth: () => 0,
                paddingLeft: () => 0,
                paddingRight: () => 0,
                paddingTop: () => 6,
                paddingBottom: () => 6,
              },
              margin: [0, 2, 0, 10],
            },
            {
              text: `Este pago fue realizado por ${merchant_name} identificado con ${merchant_id_type} ${merchant_id} usando la tecnología de Trazo. Toda la información contenida es suministrada por el comercio y el manejo de la información se da de acuerdo a nuestra política de privacidad. Este comprobante puede ser considerado un título valor según el artículo 488 del Código General del Proceso de Colombia.`,
              fontSize: 10,
              color: "#6B7280",
              alignment: "justify",
              margin: [0, 12, 0, 10],
            },
          ],
        },
      ],
      footer: () => ({
        margin: [22, -22, 22, 16],
        stack: [
          {
            canvas: [
              {
                type: "rect",
                x: 0,
                y: 0,
                w: 534,
                h: 32,
                r: 12,
                color: "#f9fafb",
              },
            ],
          },
          {
            table: {
              widths: ["*", "auto"],
              body: [
                [
                  {
                    text:
                      merchant_name && merchant_id
                        ? `${merchant_name} (${merchant_id})`
                        : merchant_name || "",
                    fontSize: 9,
                    bold: true,
                    color: "#374550",
                  },
                  {
                    columns: [
                      {
                        text: "Con la tecnología de",
                        fontSize: 9,
                        color: "#6b7280",
                        margin: [0, 0, 2, 0],
                      },
                      techLogoDataUri
                        ? { image: techLogoDataUri, width: 28, alignment: "right" }
                        : { width: 28, text: "" },
                    ],
                    columnGap: 2,
                    alignment: "right",
                  },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0,
              vLineWidth: () => 0,
              paddingLeft: () => 10,
              paddingRight: () => 10,
              paddingTop: () => 5,
              paddingBottom: () => 5,
              fillColor: () => "#f9fafb",
            },
            margin: [0, -27, 0, 0],
          },
        ],
      }),
      styles: {
        h1: { font: "RedHatDisplay", fontSize: 22, bold: true, margin: [0, 0, 0, 2] },
        muted: { fontSize: 10, color: "#989898", margin: [0, 2, 0, 10] },
        sectionTitle: { fontSize: 14, bold: true, margin: [0, 0, 0, 8] },
        label: { fontSize: 10, color: "#6B7280", margin: [0, 0, 0, 2] },
        value: { fontSize: 12, bold: true },
      },
      defaultStyle: {
        font: "RedHatDisplay",
      },
    };

    // --- Generación del PDF ---
    const printer = await getPrinter();
    const pdfBuffer = await createPdfBuffer(printer, docDefinition);

    // --- Generar nombre de archivo único ---
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const hash = crypto.createHash("md5").update(JSON.stringify(value)).digest("hex");
    const fileName = `receipt-payout-${timestamp}-${hash.substring(0, 8)}.pdf`;

    // --- Subir a S3 ---
    const { url: s3Url } = await uploadFileToS3({
      path: "receipts",
      filename: fileName,
      type: "application/pdf",
      buffer: pdfBuffer
    });

    // --- Responder ---
    res.json({
      status: "success",
      message: "PDF receipt generated successfully",
      url: s3Url,
      extension: "pdf",
    });

  } catch (error) {
    console.error("Error generating PDF receipt:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};
