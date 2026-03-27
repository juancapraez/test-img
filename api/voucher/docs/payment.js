/**
 * PDF Payment Voucher API Route
 * Generates PDF vouchers for payments
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
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // --- Validación del request con Joi ---
    const schema = Joi.object({
      contact_id: Joi.string().required(),
      amount: Joi.number().required(),
      description: Joi.string().required(),
      reference_one: Joi.string().allow(null, ""),
      cash_id: Joi.number().allow(null, ""),
      cash_reference: Joi.string().allow(null, ""),
      external_reference: Joi.string().required(),
      limit_date: Joi.string().allow(null, ""),
      currency: Joi.string().allow(null, ""),
      manual_date: Joi.string().allow(null, ""),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res
        .status(400)
        .json({ error: "Invalid request", details: error.details });
    }

    const {
      contact_id,
      amount,
      description,
      reference_one,
      cash_id,
      cash_reference,
      external_reference,
      limit_date,
      currency,
      manual_date,
    } = value;

    // --- Preparación de datos para el recibo ---
    const formatted_date = manual_date || humanDate(new Date());
    const formatted_amount = formatNumber(amount, currency || "COP");
    const hasKey = hasValidApiKey(req);

    // Helper functions (these should be implemented or imported)
    const getUserInfo = async (data) => {
      // Implement getUserInfo logic here
      throw new Error("getUserInfo not implemented");
    };

    const getBankEntities = async () => {
      // Implement getBankEntities logic here
      throw new Error("getBankEntities not implemented");
    };

    const downloadImageAsBase64 = async (url) => {
      // Use downloadAndCacheLogo utility
      try {
        return await downloadAndCacheLogo(url);
      } catch (error) {
        console.log('Error downloading image:', error.message);
        return null;
      }
    };

    const getBarcode = async (data) => {
      // Implement getBarcode logic here
      throw new Error("getBarcode not implemented");
    };

    const formatDateToYYYYMMDD = (date) => {
      // Implement date formatting logic here
      return date;
    };

    const tomorrow = () => {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      return date;
    };

    const getUserInfoHandler = async (data) => {
      try {
        const user_info = await getUserInfo(data);
        return user_info.data;
      } catch (error) {
        console.error("Error al obtener la información del conductor.", error);
        throw new Error("Error al obtener la información del conductor.");
      }
    };

    const getEntities = async () => {
      try {
        const entities_info = await getBankEntities();
        return entities_info.data;
      } catch (error) {
        console.error("Error al obtener la información del comercio.", error);
        throw new Error("Error al obtener la información del comercio.");
      }
    };

    const entities_info = await getEntities();
    const cash_info = entities_info.find((entity) => entity.id == cash_id);

    const {
      name: agreement_bank,
      logo: agreement_logo,
      instructions,
    } = cash_info;
    const { code: agreement_number, name: agreement_name } =
      cash_info?.agreement;

    const agreement_logo_uri = await downloadImageAsBase64(agreement_logo);

    const info = { type: "hash_id", identifier: contact_id };
    const user_info = await getUserInfoHandler(info);

    const { first_name, last_name, id_type, id_number } =
      user_info?.merchant;
    const { logo, main_color_brand, secondary_color_brand } =
      user_info?.merchant;

    const description_reference_one = reference_one
      ? description + ` (${reference_one})` 
      : description;
    const techLogoData =
      "https://trazo-co.s3.amazonaws.com/logos/Logo+Trazo+Gris+100px.png";
    const techLogoDataUri = await downloadImageAsBase64(techLogoData);
    const logoDataUri = await downloadImageAsBase64(logo);

    const final_limit_date = limit_date
      ? limit_date
      : formatDateToYYYYMMDD(tomorrow());

    const timestamp = Math.floor(Date.now() / 1000);

    const barcodeBase64 = await (async () => {
      try {
        const barcode = await getBarcode({
          reference: cash_reference,
          amount,
          limit_date: final_limit_date,
        });
        return barcode || "00000000";
      } catch (error) {
        console.error("Error al obtener el código de barras:", error);
        throw new Error("Error generando el código de barras.");
      }
    })();

    const barcodeUri = `data:image/png;base64,${barcodeBase64}`;

    function formatDateToSpanish(dateString) {
      // Implement date formatting to Spanish
      return dateString;
    }

    const payer_name = `${first_name} ${last_name}`;
    const payer_id = `${id_type}-${id_number}`;

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
        // Cabecera principal
        {
          stack: [
            {
              canvas: [
                {
                  type: 'rect',
                  x: 0,
                  y: 0,
                  w: 498,
                  h: 80,
                  r: 12,
                  color: secondary_color_brand || '#DFEEEB'
                }
              ],
              margin: [0, 0, 0, 10]
            },
            {
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      columns: [
                        {
                          width: '*',
                          stack: [
                            {
                              text: 'Pago en efectivo',
                              color: main_color_brand || '#007867',
                              fontSize: 20,
                              bold: true,
                              margin: [0, 0, 0, 4],
                            },
                            {
                              text: formatted_date,
                              fontSize: 10,
                              color: '#7a7a7a',
                              margin: [0, 0, 0, 8],
                            }
                          ]
                        },
                        {
                          image: logoDataUri,
                          width: 100,
                          maxHeight: 50,
                          alignment: 'right',
                          margin: [0, -6, 0, 0],
                        }
                      ]
                    }
                  ]
                ]
              },
              layout: {
                paddingLeft: () => 14,
                paddingRight: () => 14,
                paddingTop: () => 20,
                paddingBottom: () => 20,
                hLineWidth: () => 0,
                vLineWidth: () => 0
              },
              margin: [0, -80, 0, 2]
            }
          ]
        },

        // Sección: Datos de la transacción
        { text: 'Datos de la transacción', style: 'sectionTitle', color: main_color_brand || '#007867' },
        {
          columns: [
            [
              { text: 'Código de la transacción', style: 'caption' },
              { text: external_reference, style: 'value' },
            ],
            [
              { text: 'Total a pagar', style: 'caption' },
              { text: formatted_amount, style: 'value' },
            ]
          ]
        },
        {
          columns: [
            [
              { text: 'Descripción', style: 'caption' },
              { text: description, style: 'value' },
            ],
            [
              { text: 'Referencia 1', style: 'caption' },
              { text: reference_one || '-', style: 'value' },
            ]
          ]
        },

        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 498, y2: 0, lineWidth: 1, lineColor: '#e3e3e3' }], margin: [0, 10, 0, 10] },

        // Sección: Datos del pago
        { text: 'Datos del pago', style: 'sectionTitle', color: main_color_brand || '#007867' },
        {
          columns: [
            [
              { text: 'Entidad bancaria', style: 'caption' },
              { text: agreement_bank, style: 'value' },
            ],
            [
              { text: 'Nombre del convenio', style: 'caption' },
              { text: agreement_name, style: 'value' },
            ]
          ]
        },
        {
          columns: [
            [
              { text: 'Número del convenio', style: 'caption' },
              { text: agreement_number, style: 'value' },
            ],
            [
              { text: 'Referencia de pago', style: 'caption' },
              { text: cash_reference, style: 'value' },
            ]
          ]
        },
        {
          text: 'Fecha límite de pago',
          style: 'caption'
        },
        {
          text: formatDateToSpanish(final_limit_date),
          style: 'value'
        },

        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 498, y2: 0, lineWidth: 1, lineColor: '#e3e3e3' }], margin: [0, 10, 0, 10] },

        // Sección: Datos del pagador
        { text: 'Datos del pagador', style: 'sectionTitle', color: main_color_brand || '#007867' },
        {
          columns: [
            [
              { text: 'Nombre del pagador', style: 'caption' },
              { text: payer_name, style: 'value' },
            ],
            [
              { text: 'Identificación del pagador', style: 'caption' },
              { text: payer_id, style: 'value' },
            ]
          ]
        },

        // Instrucciones
        {
          stack: [
            {
              canvas: [
                {
                  type: 'rect',
                  x: 0,
                  y: 0,
                  w: 498,
                  h: 140,
                  r: 8,
                  color: '#f2f2f2'
                }
              ],
              margin: [0, 20, 0, 0]
            },
            {
              margin: [0, -130, 0, 0],
              stack: [
                { text: '¿Cómo pagar en efectivo?', style: 'instructionTitle' },
                { text: '1. Dirígete a la entidad bancaria más cercana.', style: 'instructionText' },
                { text: '2. Indica el número de convenio, número de pago y monto a pagar. También funciona con el código de barras.', style: 'instructionText' },
                { text: '3. Cuando la entidad bancaria nos confirme, recibirás un comprobante a tu medio de contacto.', style: 'instructionText' },
                {
                  columns: [
                    {
                      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="none" stroke="' + (main_color_brand || '#007867') + '" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.37 3.37 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386z"/></svg>',
                      width: 18,
                      height: 18,
                      margin: [0, 2, 4, 0],
                    },
                    {
                      text: instructions,
                      style: 'instructionNote',
                    }
                  ]
                }
              ],
              margin: [20, 10, 20, 10]
            }
          ]
        },

        // Footer instrucciones
        {
          text: '¿Necesitas ayuda? Estamos para ayudarte, escribe a la línea de Trazo Soporte en WhatsApp +57 316 099 1644',
          style: 'footerHelp'
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 498, y2: 0, lineWidth: 1, lineColor: '#e3e3e3' }], margin: [0, 10, 0, 10] },

        // Código de barras
        {
          columns: [
            // Código de barras (sin fondo)
            {
              image: 'data:image/png;base64,' + barcodeBase64,
              width: 350,
              margin: [0, 20, 0, 0]
            },

            // Columna con ambos cuadros (Referencia/Convenio + Total)
            {
              width: '*',
              margin: [0, 20, 0, 0],
              stack: [
                // Cuadro para Referencia y Convenio
                {
                  canvas: [
                    {
                      type: 'rect',
                      x: 0,
                      y: 0,
                      w: 148,
                      h: 34,
                      r: 8,
                      lineColor: '#e3e3e3',
                      lineWidth: 1
                    },
                    {
                      type: 'line',
                      x1: 74,
                      y1: 0,
                      x2: 74,
                      y2: 34,
                      lineColor: '#e3e3e3',
                      lineWidth: 1
                    }
                  ]
                },
                {
                  margin: [0, -30, 0, 0],
                  stack: [
                    {
                      columns: [
                        {
                          width: '50%',
                          stack: [
                            { text: 'Referencia', style: 'captionSmall' },
                            { text: cash_reference, style: 'barcodeText' }
                          ]
                        },
                        {
                          width: '50%',
                          stack: [
                            { text: 'Convenio', style: 'captionSmall' },
                            { text: agreement_number, style: 'barcodeText' }
                          ]
                        }
                      ]
                    }
                  ]
                },

                // Cuadro para Total a pagar
                {
                  canvas: [
                    {
                      type: 'rect',
                      x: 0,
                      y: 14,
                      w: 148,
                      h: 32,
                      r: 8,
                      color: secondary_color_brand
                    }
                  ]
                },
                {
                  canvas: [
                    {
                      type: 'rect',
                      x: 60,
                      y: -27,
                      w: 88,
                      h: 22,
                      r: 8,
                      color: 'white'
                    }
                  ]
                },
                {
                  margin: [-140, -40, 0, 10],
                  columns: [
                    { text: 'Total a pagar', style: 'captionSmall', margin: [148, 16, 0, 2], width: 'auto', bold: true, color: 'black' },
                    { text: '$' + formatNumber(parseFloat(amount), currency), style: 'barcodeAmount' }
                  ]
                }
              ]
            }
          ]
        },

        // Footer
        {
          columns: [
            { text: 'DESPRENDIBLE ENTIDAD RECAUDADORA - BANCO', style: 'footerNote' },
            { text: 'Con la tecnología de', style: 'footerNoteRight' },
            {
              image: techLogoDataUri,
              width: 34,
              margin: [2, 18, 0, 0]
            }
          ]
        },
      ],
      styles: {
        sectionTitle: { font: "RedHatDisplay", fontSize: 14, bold: true, color: main_color_brand || '#007867', margin: [0, 8, 0, 8] },
        caption: { font: "RedHatDisplay", fontSize: 10, color: 'gray', margin: [0, 0, 0, 2] },
        value: { font: "RedHatDisplay", fontSize: 13, bold: true, color: 'black', margin: [0, 0, 0, 8] },
        instructionTitle: { font: "RedHatDisplay", fontSize: 12, bold: true, margin: [0, 0, 0, 6] },
        instructionText: { font: "RedHatDisplay", fontSize: 11, margin: [0, 0, 0, 2] },
        instructionNote: { font: "RedHatDisplay", fontSize: 10, color: main_color_brand || '#007867', maxWidth: 430, margin: [2, 4, 0, 0] },
        footerHelp: { font: "RedHatDisplay", fontSize: 10, color: 'gray', alignment: 'center', margin: [0, 6, 0, 10] },
        captionSmall: { font: "RedHatDisplay", fontSize: 9, color: 'gray', alignment: 'center', margin: [0, -1, 0, 2] },
        barcodeText: { font: "RedHatDisplay", fontSize: 12, bold: true, alignment: 'center' },
        barcodeAmount: { font: "RedHatDisplay", fontSize: 10, italic: true, bold: true, alignment: 'right', color: '#000', margin: [0, 17, 8, 0] },
        footerNote: { font: "RedHatDisplay", fontSize: 8, color: '#848688', margin: [0, 20, 0, 0] },
        footerNoteRight: { font: "RedHatDisplay", fontSize: 9, color: '#848688', margin: [0, 20, 0, 0], alignment: 'right' },
      },
      defaultStyle: {
        font: "RedHatDisplay",
      },
    };

    // --- Generar buffer PDF y convertir en imagen ---
    const printer = await getPrinter();
    const pdfBuffer = await createPdfBuffer(printer, docDefinition);

    // --- Subir a S3 ---
    const filename = `${crypto.randomUUID()}-${Date.now()}.pdf`;
    const { url } = await uploadFileToS3({
      path: "vouchers",
      filename,
      type: "application/pdf",
      buffer: pdfBuffer,
    });

    // --- Responder ---
    res.status(200).json({
      status: "success",
      message: "Documento PDF creado exitosamente",
      url,
      extension: "pdf",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: "error",
      code: 500,
      message:
        "Error interno generando documento" +
        (err.message ? ": " + err.message : ""),
    });
  }
};