/**
 * Image Report API Route - Operation Summary
 * Generates image reports for operation summaries
 */

const crypto = require("crypto");
const Joi = require("joi");
const { downloadImageAsBase64 } = require("../../../utils/imageBase64");
const { uploadFileToS3 } = require("../../../services/uploadS3");
const { renderSvg } = require("../../../services/satoriRenderer");
const { convertSvgToJpg } = require("../../../services/svgToJpg");
const { humanDate } = require("../../../utils/humanDate");
const { formatNumberNoDecimals } = require("../../../utils/formatNumber");

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
      logo: Joi.string().required(),
      main_color_brand: Joi.string().required(),
      secondary_color_brand: Joi.string().required(),
      first_name: Joi.string().optional(),
      last_name: Joi.string().optional(),
      id_type: Joi.string().optional(),
      id_number: Joi.string().optional(),
      user_email: Joi.string().allow(null, ""),
      user_phone: Joi.string().allow(null, ""),
      manual_date: Joi.string().allow(null, ""),
      transactions: Joi.object({
        success: Joi.array().items(Joi.object({
          external_reference: Joi.string().required(),
          description: Joi.string().required(),
          reference_one: Joi.string().allow(null, ""),
          amount: Joi.number().required(),
          date: Joi.string().allow(null, ""),
          updated_at: Joi.string().allow(null, ""),
        })).required(),
        review: Joi.array().items(Joi.object({
          external_reference: Joi.string().required(),
          description: Joi.string().required(),
          reference_one: Joi.string().allow(null, ""),
          amount: Joi.number().required(),
          date: Joi.string().allow(null, ""),
          updated_at: Joi.string().allow(null, ""),
        })).required(),
        return: Joi.array().items(Joi.object({
          external_reference: Joi.string().required(),
          description: Joi.string().required(),
          reference_one: Joi.string().allow(null, ""),
          amount: Joi.number().required(),
          date: Joi.string().allow(null, ""),
          updated_at: Joi.string().allow(null, ""),
          return_reason: Joi.string().allow(null, ""),
        })).required(),
        credit: Joi.array().items(Joi.object({
          external_reference: Joi.string().required(),
          description: Joi.string().required(),
          reference_one: Joi.string().allow(null, ""),
          amount: Joi.number().required(),
          date: Joi.string().allow(null, ""),
          updated_at: Joi.string().allow(null, ""),
        })).required(),
        external: Joi.array().items(Joi.object({
          external_reference: Joi.string().required(),
          description: Joi.string().required(),
          reference_one: Joi.string().allow(null, ""),
          amount: Joi.number().required(),
          date: Joi.string().allow(null, ""),
          updated_at: Joi.string().allow(null, ""),
        })).required(),
        pending: Joi.array().items(Joi.object({
          external_reference: Joi.string().required(),
          description: Joi.string().required(),
          reference_one: Joi.string().allow(null, ""),
          amount: Joi.number().required(),
          date: Joi.string().allow(null, ""),
          updated_at: Joi.string().allow(null, ""),
        })).required(),
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
      logo,
      main_color_brand,
      secondary_color_brand,
      first_name,
      last_name,
      id_type,
      id_number,
      manual_date,
      transactions,
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

    // Calcular valores de las tarjetas (lógica original de summary)
    const expected_amount = total_success + total_review + total_credit + total_external;
    const expected_count = success.length + review.length + credit.length + external.length;
    const processed_amount = total_success + total_return;
    const missing_amount = expected_amount - processed_amount;
    const missing_count = expected_count - (success.length + return_data.length);
    const missing_percentage = expected_amount > 0 ? missing_amount / expected_amount : 0;

    const techLogoData =
      "https://trazo-co.s3.amazonaws.com/logos/Logo+Trazo+Gris+100px.png";
    const techLogoDataUri = await downloadImageAsBase64(techLogoData);
    const logoDataUri = await downloadImageAsBase64(logo);

    function formatDateToSpanish(dateString) {
      const monthsFull = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
      ];

      const [year, month, day] = dateString.split("-");
      const formattedDate = `${parseInt(day, 10)} de ${monthsFull[parseInt(month, 10) - 1]} de ${year}`;
      return formattedDate;
    }

    function formatDateRange(start_date, end_date) {
      if (start_date === end_date) {
        return formatDateToSpanish(start_date);
      } else {
        return `Del ${formatDateToSpanish(start_date)} al ${formatDateToSpanish(end_date)}`;
      }
    }

    // Crear template para Satori
    const createReportTemplate = () => {
      return {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            width: '720px',
            height: '660px',
            backgroundColor: secondary_color_brand || '#DFEEEB',
            fontFamily: 'Red Hat Display',
          },
          children: [
            // Contenedor blanco principal
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  margin: '30px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  padding: '30px',
                  height: '600px',
                  width: '640px',
                },
                children: [
                  // Header
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        borderBottom: '1px solid #D9D9D9',
                        paddingBottom: '20px',
                        marginBottom: '8px',
                      },
                      children: [
                        {
                          type: 'div',
                          props: {
                            style: {
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                            },
                            children: [
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    fontSize: '40px',
                                    color: main_color_brand || '#007867',
                                    marginBottom: '6px',
                                    width: '100%',
                                  },
                                  children: 'Resumen de ruta',
                                },
                              },
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    fontSize: '18px',
                                    color: 'gray',
                                  },
                                  children: formatDateRange(start_date, end_date),
                                },
                              },
                            ],
                          },
                        },
                        {
                          type: 'img',
                          props: {
                            src: logoDataUri,
                            style: {
                              maxWidth: '120px',
                              maxHeight: '60px',
                              objectFit: 'contain',
                            },
                          },
                        },
                      ],
                    },
                  },
                  // Tarjetas de métricas - Fila 1
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        margin: '20px 0 30px 0',
                        maxWidth: '100%',
                      },
                      children: [
                        // Tarjeta EXITOSOS
                        {
                          type: 'div',
                          props: {
                            style: {
                              display: 'flex',
                              flexDirection: 'column',
                              width: '275px',
                              marginRight: '30px',
                              backgroundColor: '#EBFAF3',
                              border: '1px solid #065E49',
                              borderRadius: '10px',
                              padding: '15px',
                            },
                            children: [
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    fontSize: '12px',
                                    color: '#065E49',
                                    fontWeight: 'bold',
                                    marginBottom: '5px',
                                  },
                                  children: 'EXITOSOS',
                                },
                              },
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    fontSize: '24px',
                                    fontWeight: 'bold',
                                    color: '#065E49',
                                    marginBottom: '2px',
                                  },
                                  children: `$${formatNumberNoDecimals(total_success)}`,
                                },
                              },
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    fontSize: '12px',
                                    color: '#666666',
                                  },
                                  children: `${success.length} transacciones`,
                                },
                              },
                            ],
                          },
                        },
                        // Tarjeta POR CONCILIAR
                        {
                          type: 'div',
                          props: {
                            style: {
                              display: 'flex',
                              flexDirection: 'column',
                              width: '275px',
                              backgroundColor: '#FFF2F0',
                              border: '1px solid #B71D18',
                              borderRadius: '10px',
                              padding: '15px',
                            },
                            children: [
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    fontSize: '12px',
                                    color: '#B71D18',
                                    fontWeight: 'bold',
                                    marginBottom: '5px',
                                  },
                                  children: 'POR CONCILIAR',
                                },
                              },
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    fontSize: '24px',
                                    fontWeight: 'bold',
                                    color: '#B71D18',
                                    marginBottom: '2px',
                                  },
                                  children: `$${formatNumberNoDecimals(total_review)}`,
                                },
                              },
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    fontSize: '12px',
                                    color: '#666666',
                                  },
                                  children: `${review.length} transacciones`,
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                  // Tarjetas de métricas - Fila 2
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        margin: '0 0 30px 0',
                      },
                      children: [
                        // Tarjeta CRÉDITO
                        {
                          type: 'div',
                          props: {
                            style: {
                              display: 'flex',
                              flexDirection: 'column',
                              width: '275px',
                              marginRight: '30px',
                              backgroundColor: '#E6F7FF',
                              border: '1px solid #006C9C',
                              borderRadius: '10px',
                              padding: '15px',
                            },
                            children: [
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    fontSize: '12px',
                                    color: '#006C9C',
                                    fontWeight: 'bold',
                                    marginBottom: '5px',
                                  },
                                  children: 'CRÉDITO',
                                },
                              },
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    fontSize: '24px',
                                    fontWeight: 'bold',
                                    color: '#006C9C',
                                    marginBottom: '2px',
                                  },
                                  children: `$${formatNumberNoDecimals(total_credit)}`,
                                },
                              },
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    fontSize: '12px',
                                    color: '#666666',
                                  },
                                  children: `${credit.length} transacciones`,
                                },
                              },
                            ],
                          },
                        },
                        // Tarjeta PAGO EXTERNO
                        {
                          type: 'div',
                          props: {
                            style: {
                              display: 'flex',
                              flexDirection: 'column',
                              width: '275px',
                              backgroundColor: '#F6F7F8',
                              border: '1px solid #4D5B68',
                              borderRadius: '10px',
                              padding: '15px',
                            },
                            children: [
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    fontSize: '12px',
                                    color: '#4D5B68',
                                    fontWeight: 'bold',
                                    marginBottom: '5px',
                                  },
                                  children: 'PAGO EXTERNO',
                                },
                              },
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    fontSize: '24px',
                                    fontWeight: 'bold',
                                    color: '#4D5B68',
                                    marginBottom: '2px',
                                  },
                                  children: `$${formatNumberNoDecimals(total_external)}`,
                                },
                              },
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    fontSize: '12px',
                                    color: '#666666',
                                  },
                                  children: `${external.length} transacciones`,
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                  // Tarjetas de métricas - Fila 3
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        margin: '0 0 10px 0',
                      },
                      children: [
                        // Tarjeta DEVOLUCIONES
                        {
                          type: 'div',
                          props: {
                            style: {
                              display: 'flex',
                              flexDirection: 'column',
                              width: '275px',
                              marginRight: '30px',
                              backgroundColor: '#F9F0FF',
                              border: '1px solid #5119B7',
                              borderRadius: '10px',
                              padding: '15px',
                            },
                            children: [
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    fontSize: '12px',
                                    color: '#5119B7',
                                    fontWeight: 'bold',
                                    marginBottom: '5px',
                                  },
                                  children: 'DEVOLUCIONES',
                                },
                              },
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    fontSize: '24px',
                                    fontWeight: 'bold',
                                    color: '#5119B7',
                                    marginBottom: '2px',
                                  },
                                  children: `$${formatNumberNoDecimals(total_return)}`,
                                },
                              },
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    fontSize: '12px',
                                    color: '#666666',
                                  },
                                  children: `${return_data.length} transacciones`,
                                },
                              },
                            ],
                          },
                        },
                        // Tarjeta SIN GESTIONAR
                        {
                          type: 'div',
                          props: {
                            style: {
                              display: 'flex',
                              flexDirection: 'column',
                              backgroundColor: '#FFF8EF',
                              border: '1px solid #7A4100',
                              width: '275px',
                              borderRadius: '10px',
                              padding: '15px',
                            },
                            children: [
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    fontSize: '12px',
                                    color: '#7A4100',
                                    fontWeight: 'bold',
                                    marginBottom: '5px',
                                  },
                                  children: 'SIN GESTIONAR',
                                },
                              },
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    fontSize: '24px',
                                    fontWeight: 'bold',
                                    color: '#7A4100',
                                    marginBottom: '2px',
                                  },
                                  children: `$${formatNumberNoDecimals(total_pending)}`,
                                },
                              },
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    fontSize: '12px',
                                    color: '#666666',
                                  },
                                  children: `${pending.length} transacciones`,
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
            // Footer
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: '2px',
                  position: 'absolute',
                  bottom: '50px',
                  left: '30px',
                  right: '30px',
                  width: 'auto',
                },
                children: [
                  {
                    type: 'div',
                    props: {
                      style: {
                        fontSize: '14px',
                        color: '#848688',
                      },
                      children: 'Con la tecnología de',
                    },
                  },
                  {
                    type: 'img',
                    props: {
                      src: techLogoDataUri,
                      style: {
                        maxWidth: '45px',
                        maxHeight: '15px',
                        objectFit: 'contain',
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      };
    };

    // Renderizar SVG
    const template = createReportTemplate();
    const imageHeight = 660;
    const svgString = await renderSvg(template, { height: imageHeight });
    
    // Convertir a JPG
    const jpgBuffer = await convertSvgToJpg(svgString, { height: imageHeight });
    
    // Subir a S3
    const filename = `${crypto.randomUUID()}-${Date.now()}.jpg`;
    const { url } = await uploadFileToS3({
      path: "reports",
      filename,
      type: "image/jpeg",
      buffer: jpgBuffer,
    });

    res.status(200).json({
      status: "success",
      message: "Imagen generada exitosamente",
      url,
      extension: "jpg",
    });
  } catch (error) {
    console.error("Error generating image report:", error);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Error interno generando imagen" +
        (error.message ? ": " + error.message : ""),
    });
  }
};
