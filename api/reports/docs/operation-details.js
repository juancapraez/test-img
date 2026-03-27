/**
 * PDF Report API Route - Operation Details
 * Generates detailed PDF reports for operations
 */

const crypto = require("crypto");
const Joi = require("joi");
const { downloadImageAsBase64 } = require("../../../utils/imageBase64");
const { uploadFileToS3 } = require("../../../services/uploadS3");
const { createPdfBuffer } = require("../../../utils/createPdfBuffer");
const { getPrinter } = require("../../../utils/pdfFonts");
const { humanDate } = require("../../../utils/humanDate");
const { formatNumber, formatNumberNoDecimals } = require("../../../utils/formatNumber");

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const schema = Joi.object({
      business_id: Joi.string().required(),
      contact_id: Joi.string().required(),
      start_date: Joi.string().required(),
      end_date: Joi.string().required(),
      manual_date: Joi.string().allow(null, ""),
      logo: Joi.string().required(),
      main_color_brand: Joi.string().required(),
      secondary_color_brand: Joi.string().required(),
      first_name: Joi.string().required(),
      last_name: Joi.string().required(),
      id_type: Joi.string().required(),
      id_number: Joi.string().required(),
      transactions: Joi.object({
        success: Joi.array().items(Joi.object()).default([]),
        review: Joi.array().items(Joi.object()).default([]),
        return: Joi.array().items(Joi.object()).default([]),
        credit: Joi.array().items(Joi.object()).default([]),
        external: Joi.array().items(Joi.object()).default([]),
        pending: Joi.array().items(Joi.object()).default([]),
      }).required(),
      cards: Joi.object({
        expected_amount: Joi.number().default(0),
        missing_count: Joi.number().default(0),
        missing_amount: Joi.number().default(0),
        missing_percentage: Joi.number().default(0),
        expected_count: Joi.number().default(0),
      }).required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res
        .status(400)
        .json({ error: "Invalid request", details: error.details });
    }

    const {
      business_id,
      contact_id,
      start_date,
      end_date,
      manual_date,
      logo,
      main_color_brand,
      secondary_color_brand,
      first_name,
      last_name,
      id_type,
      id_number,
      transactions,
      cards,
    } = value;

    const currency = "COP";
    const formatted_date = humanDate();

    const {
      success,
      review,
      return: return_data,
      credit,
      external,
      pending,
    } = transactions;

    const {
      expected_amount,
      missing_count,
      missing_amount,
      missing_percentage,
      expected_count,
    } = cards;

    const total_success = (
      success && success.length > 0 ? success : [{ amount: 0 }]
    ).reduce((acc, curr) => acc + curr.amount, 0);

    const total_return = (
      return_data && return_data.length > 0 ? return_data : [{ amount: 0 }]
    ).reduce((acc, curr) => acc + curr.amount, 0);

    const total_review = (
      review && review.length > 0 ? review : [{ amount: 0 }]
    ).reduce((acc, curr) => acc + curr.amount, 0);

    const total_credit = (
      credit && credit.length > 0 ? credit : [{ amount: 0 }]
    ).reduce((acc, curr) => acc + curr.amount, 0);

    const total_external = (
      external && external.length > 0 ? external : [{ amount: 0 }]
    ).reduce((acc, curr) => acc + curr.amount, 0);

    const total_pending = (
      pending && pending.length > 0 ? pending : [{ amount: 0 }]
    ).reduce((acc, curr) => acc + curr.amount, 0);

    const techLogoData =
      "https://trazo-co.s3.amazonaws.com/logos/Logo+Trazo+Gris+100px.png";
    const techLogoDataUri = await downloadImageAsBase64(techLogoData);
    const logoDataUri = await downloadImageAsBase64(logo);

    function formatAsPercentage(effectiveAmount) {
      if (typeof effectiveAmount !== "number") return "Invalid amount";
      return (effectiveAmount * 100).toFixed(2) + "%";
    }

    function formatDateToSpanish(dateString) {
      const months = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
      ];

      const [year, month, day] = dateString.split("-");
      const formattedDate = `${parseInt(day, 10)} de ${months[parseInt(month, 10) - 1]} de ${year}`;
      return formattedDate;
    }

    function formatDateRange(start_date, end_date) {
      if (start_date === end_date) {
        return formatDateToSpanish(start_date);
      } else {
        return `Del ${formatDateToSpanish(start_date)} al ${formatDateToSpanish(end_date)}`;
      }
    }

    const lightGray = '#d9d9d9';

    const tableWithHeader = (color, fillColor, stateName, description, headers, rows) => {
      return {
        table: {
          headerRows: 2,
          widths: Array(headers.length).fill('*'),
          body: [
            [
              {
                text: stateName,
                colSpan: Math.floor(headers.length / 2),
                style: 'tableMainTitle',
                alignment: 'left',
                color: color,
                fontSize: 9,
                bold: true,
                fillColor: fillColor,
                margin: [6, 2, 0, 2]
              },
              ...Array(Math.floor(headers.length / 2) - 1).fill({}),
              {
                text: description,
                colSpan: Math.ceil(headers.length / 2),
                alignment: 'right',
                style: 'tableDescription',
                fontSize: 8,
                color: 'gray',
                fillColor: fillColor,
                margin: [0, 2, 6, 2]
              },
              ...Array(Math.ceil(headers.length / 2) - 1).fill({})
            ],
            headers.map(h => ({ text: h, fontSize: 8, fillColor: '#fafafa', alignment: 'center', color: 'gray' })),
            ...(rows.length === 0
              ? [[{ text: 'No hay transacciones en este estado', colSpan: headers.length, fontSize: 8, color: 'gray', alignment: 'center' }, ...Array(headers.length - 1).fill({})]]
              : rows.map(r =>
                r.map(cell => ({
                  text: String(cell),
                  fontSize: 8,
                  color: 'black',
                  alignment: 'center',
                  font: "RedHatDisplay"
                }))
              )
            )
          ]
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: (i, node) => {
            if (i === 0 || i === node.table.widths.length) {
              return 0.5;
            }
            return 0;
          },
          hLineColor: () => lightGray,
          vLineColor: () => lightGray,
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 4,
          paddingBottom: () => 4
        },
        margin: [0, 10, 0, 12]
      };
    };

    function createBox(position, color, title, amount, description) {
      const cardWidth = 86;
      const cardHeight = 56;
      const radius = 8;

      return {
        width: '33%',
        stack: [
          {
            canvas: [
              {
                type: 'rect',
                x: 0,
                y: 0,
                w: cardWidth,
                h: cardHeight,
                r: radius,
                lineColor: '#cccccc',
                lineWidth: 0.5
              }
            ],
            absolutePosition: position
          },
          {
            stack: [
              { text: title, color: color, bold: true, fontSize: 9, font: "RedHatDisplay" },
              { text: amount, fontSize: 11, font: "RedHatDisplay" },
              { text: description, fontSize: 8, color: 'gray', font: "RedHatDisplay" }
            ],
            margin: [6, 4, 6, 4]
          }
        ],
        margin: [0, 2, 0, 10]
      };
    }

    const docDefinition = {
      pageMargins: [10, 10, 10, 30],
      content: [
        {
          margin: [0, 0, 0, 10],
          table: {
            widths: ['*', 70],
            body: [
              [
                {
                  stack: [
                    {
                      text: 'Informe final de ruta',
                      color: main_color_brand || '#007867',
                      fontSize: 20,
                      bold: true,
                      margin: [0, 0, 0, 2],
                      font: "RedHatDisplay"
                    },
                    {
                      text: `${first_name} ${last_name} (${id_type} ${id_number})`,
                      fontSize: 11,
                      color: '#000000',
                      margin: [0, 0, 0, 2],
                      font: "RedHatDisplay"
                    },
                    {
                      text: formatDateRange(start_date, end_date),
                      fontSize: 8,
                      color: 'gray',
                      margin: [0, 2, 0, 0],
                      font: "RedHatDisplay"
                    }
                  ]
                },
                {
                  image: logoDataUri || 'https://qentaz-pagos.s3.amazonaws.com/Business+Logos/qentaz-green.png',
                  width: 100,
                  maxHeight: 50,
                  alignment: 'right',
                  margin: [0, 4, 0, 0]
                }
              ]
            ]
          },
          layout: {
            hLineWidth: function (i, node) {
              return i === 0 ? 0 : 1;
            },
            vLineWidth: () => 0,
            hLineColor: () => '#7a7a7a',
            paddingTop: () => 14,
            paddingBottom: () => 14,
            paddingLeft: () => 14,
            paddingRight: () => 14,
            fillColor: () => secondary_color_brand || '#DFEEEB'
          }
        },
        {
          columns: [
            {
              width: '50%',
              stack: [
                { text: 'Resumen', fontSize: 12, margin: [0, 0, 0, 4] },
                {
                  canvas: [
                    {
                      type: 'line',
                      x1: 0, y1: 0,
                      x2: 200, y2: 0,
                      lineWidth: 0.5,
                      lineColor: '#cccccc'
                    }
                  ],
                  margin: [0, 2, 0, 8]
                },

                { text: 'RECAUDO ESPERADO', fontSize: 10, color: 'gray', font: "RedHatDisplay" },
                { text: 'Monto esperado según las entregas programadas en la fecha', fontSize: 8, color: 'gray' },
                {
                  text: [
                    { text: `$${formatNumberNoDecimals(expected_amount)}\u00A0\u00A0`, fontSize: 12 },
                    { text: `(${expected_count} cobros)`, fontSize: 9, color: 'gray' }
                  ],
                  margin: [0, 4, 0, 8]
                },

                { text: 'FALTANTE', fontSize: 10, color: 'gray', font: "RedHatDisplay" },
                { text: 'Porcentaje de entregas pendientes de legalizar', fontSize: 8, color: 'gray' },
                {
                  text: [
                    { text: `${formatAsPercentage(missing_percentage)}\u00A0\u00A0`, fontSize: 12 },
                    { text: `($${formatNumberNoDecimals(missing_amount)})`, fontSize: 9, color: 'gray' }
                  ],
                  margin: [0, 4, 0, 12]
                }
              ],
              marginLeft: 10
            },
            {
              width: '50%',
              stack: [
                {
                  columns: [
                    createBox({ x: 296, y: 108 }, '#065E49', 'EXITOSOS', `$${formatNumberNoDecimals(total_success)}`, `${success.length} cobros`),
                    createBox({ x: 391, y: 108 }, '#B71D18', 'POR CONCILIAR', `$${formatNumberNoDecimals(total_review)}`, `${review.length} cobros`),
                    createBox({ x: 486, y: 108 }, '#006C9C', 'CRÉDITO', `$${formatNumberNoDecimals(total_credit)}`, `${credit.length} cobros`)
                  ],
                  margin: [0, 4, 0, 0]
                },
                {
                  columns: [
                    createBox({ x: 296, y: 176 }, '#4D5B68', 'PAGO EXTERNO', `$${formatNumberNoDecimals(total_external)}`, `${external.length} cobros`),
                    createBox({ x: 391, y: 176 }, '#5119B7', 'DEVOLUCIONES', `$${formatNumberNoDecimals(total_return)}`, `${return_data.length} cobros`),
                    createBox({ x: 486, y: 176 }, '#7A4100', 'SIN GESTIONAR', `$${formatNumberNoDecimals(total_pending)}`, `${pending.length} cobros`)
                  ],
                  margin: [0, 10, 0, 14]
                }
              ]
            }
          ]
        },

        tableWithHeader(
          '#005D4A',
          '#EBFAF3',
          'Pagos exitosos',
          'Recaudos completados y confirmados en el sistema.',
          ['Código', 'Descripción', 'Referencia 1', 'Referencia 2', 'Valor'],
          success.map(item => [
            item.external_reference,
            item.description,
            item.reference_one,
            item.reference_two,
            `$${formatNumber(item.amount)}`
          ])
        ),
        tableWithHeader(
          '#C31C21',
          '#FFF2F0',
          'Por conciliar',
          'Recaudos realizados por el conductor pendientes de consignación.',
          ['Código', 'Descripción', 'Referencia 1', 'Referencia 2', 'Valor'],
          review.map(item => [
            item.external_reference,
            item.description,
            item.reference_one,
            item.reference_two,
            `$${formatNumber(item.amount)}`
          ])
        ),
        tableWithHeader(
          '#006F99',
          '#EBFAFC',
          'Crédito',
          'Producto entregado sin recaudo realizado en el momento.',
          ['Código', 'Descripción', 'Referencia 1', 'Referencia 2', 'Valor'],
          credit.map(item => [
            item.external_reference,
            item.description,
            item.reference_one,
            item.reference_two,
            `$${formatNumber(item.amount)}`
          ])
        ),
        tableWithHeader(
          '#495C67',
          '#F6F7F8',
          'Pago externo',
          'Recaudo realizado directamente a la cuenta del comercio.',
          ['Código', 'Descripción', 'Referencia 1', 'Referencia 2', 'Comentario', 'Valor'],
          external.map(item => [
            item.external_reference,
            item.description,
            item.reference_one,
            item.reference_two,
            item.comment,
            `$${formatNumber(item.amount)}`
          ])
        ),
        tableWithHeader(
          '#482FB2',
          '#F6F1FF',
          'Devoluciones',
          'Producto no entregado y sin recaudo generado.',
          ['Código', 'Descripción', 'Referencia 1', 'Referencia 2', 'Razón devolución', 'Valor'],
          return_data.map(item => [
            item.external_reference,
            item.description,
            item.reference_one,
            item.reference_two,
            item.comment,
            `$${formatNumber(item.amount)}`
          ])
        ),
        tableWithHeader(
          '#81400F',
          '#FFF8EF',
          'Sin gestionar',
          'Entregas que aun no se han procesado.',
          ['Código', 'Descripción', 'Referencia 1', 'Referencia 2', 'Valor'],
          pending.map(item => [
            item.external_reference,
            item.description,
            item.reference_one,
            item.reference_two,
            `$${formatNumber(item.amount)}`
          ])
        ),
        {
          text: 'NOTA: Toda la información contenida es generada a partir de la operación de recaudo realizada en Trazo. Para validar la información contrastar con el dashboard o directamente con el equipo de soporte.',
          fontSize: 8,
          margin: [10, 20, 10, 0],
          color: '#212B36',
          fillColor: '#F4F6F8',
          border: [false, false, false, false],
          padding: [8, 8, 8, 8]
        }
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          font: "RedHatDisplay"
        },
        subheader: {
          fontSize: 14,
          bold: true,
          font: "RedHatDisplay"
        },
        title: {
          bold: true,
          alignment: 'right',
          font: "RedHatDisplay"
        },
        tableHeader: {
          bold: true,
          fontSize: 12,
          color: 'black',
          font: "RedHatDisplay"
        },
        tableTitle: { fontSize: 14, bold: true, margin: [0, 5, 0, 2], font: "RedHatDisplay" },
        tableSubtitle: { fontSize: 10, margin: [0, 0, 0, 8], font: "RedHatDisplay" }
      },
      defaultStyle: {
        font: 'RedHatDisplay',
        fontSize: 10
      },

      footer: function (currentPage, pageCount) {
        return {
          margin: [20, 10, 20, 0],
          fontSize: 8,
          layout: 'noBorders',
          columns: [
            { text: `Generado el ${manual_date || formatted_date}`, fontSize: 8, color: 'gray', alignment: 'left' },
            {
              text: `Con la tecnología de`,
              alignment: 'right',
              color: '#888888'
            },
            {
              image: techLogoDataUri,
              width: 20,
              margin: [3, 0, 0, 0]
            }
          ]
        };
      }
    };

    const printer = await getPrinter();
    const pdfBuffer = await createPdfBuffer(printer, docDefinition);

    const filename = `${crypto.randomUUID()}-${Date.now()}.pdf`;
    const { url } = await uploadFileToS3({
      path: "reports",
      filename,
      type: "application/pdf",
      buffer: pdfBuffer,
    });

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
