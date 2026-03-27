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
      manual_date: Joi.string().allow(null, ""),
      logo: Joi.string().required(),
      main_color_brand: Joi.string().required(),
      secondary_color_brand: Joi.string().required(),
      transactions: Joi.object({
        success: Joi.array().items(Joi.object()).default([]),
        review: Joi.array().items(Joi.object()).default([]),
        return: Joi.array().items(Joi.object()).default([]),
        credit: Joi.array().items(Joi.object()).default([]),
        external: Joi.array().items(Joi.object()).default([]),
        pending: Joi.array().items(Joi.object()).default([]),
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

    const techLogoData =
      "https://trazo-co.s3.amazonaws.com/logos/Logo+Trazo+Gris+100px.png";
    const techLogoDataUri = await downloadImageAsBase64(techLogoData);
    const logoDataUri = await downloadImageAsBase64(logo);

    function formatDateToSpanish(dateString) {
      const monthsFull = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
      ];

      const monthsShort = [
        "ene", "feb", "mar", "abr", "may", "jun",
        "jul", "ago", "sep", "oct", "nov", "dic",
      ];

      const [year, month, day] = dateString.split("-");
      return {
        day: parseInt(day, 10),
        monthFull: monthsFull[parseInt(month, 10) - 1],
        monthShort: monthsShort[parseInt(month, 10) - 1],
        year,
      };
    }

    function formatDateRange(start_date, end_date) {
      if (start_date === end_date) {
        const { day, monthFull, year } = formatDateToSpanish(start_date);
        return `${day} de ${monthFull} de ${year}`;
      }

      const start = formatDateToSpanish(start_date);
      const end = formatDateToSpanish(end_date);

      if (start.year === end.year) {
        if (start.monthFull === end.monthFull) {
          return `Del ${start.day} al ${end.day} de ${start.monthFull} de ${start.year}`;
        } else {
          return `Del ${start.day} de ${start.monthShort} al ${end.day} de ${end.monthShort} de ${start.year}`;
        }
      } else {
        return `Del ${start.day} de ${start.monthShort} de ${start.year} al ${end.day} de ${end.monthShort} de ${end.year}`;
      }
    }

    // Crear template para Satori
    const createReportTemplate = () => {
      return {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            flexDirection: 'column',
            width: '800px',
            height: '880px',
            backgroundColor: secondary_color_brand || '#DFEEEB',
            position: 'relative',
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
                  position: 'absolute',
                  left: '40px',
                  top: '60px',
                  width: '710px',
                  height: '740px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  padding: '20px',
                },
                children: [
                  // Header
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
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
                            },
                            children: [
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    fontSize: '40px',
                                    color: main_color_brand || '#007867',
                                    marginBottom: '6px',
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
                              width: '130px',
                              height: '80px',
                              objectFit: 'contain',
                            },
                          },
                        },
                      ],
                    },
                  },
                  // Tarjetas de métricas
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '30px',
                        marginTop: '20px',
                      },
                      children: [
                        // Fila 1
                        {
                          type: 'div',
                          props: {
                            style: {
                              display: 'flex',
                              gap: '30px',
                            },
                            children: [
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    display: 'flex',
                                    flex: 1,
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #D9D9D9',
                                    borderRadius: '10px',
                                    padding: '15px',
                                  },
                                  children: [
                                    {
                                      type: 'div',
                                      props: {
                                        style: {
                                          display: 'flex',
                                          flexDirection: 'column',
                                        },
                                        children: [
                                          {
                                            type: 'div',
                                            props: {
                                              style: {
                                                fontSize: '24px',
                                                color: '#065E49',
                                                fontWeight: 'bold',
                                                marginBottom: '4px',
                                              },
                                              children: 'EXITOSOS',
                                            },
                                          },
                                          {
                                            type: 'div',
                                            props: {
                                              style: {
                                                fontSize: '36px',
                                                color: 'black',
                                                fontWeight: 'bold',
                                                marginBottom: '4px',
                                              },
                                              children: `$${formatNumberNoDecimals(total_success)}`,
                                            },
                                          },
                                          {
                                            type: 'div',
                                            props: {
                                              style: {
                                                fontSize: '22px',
                                                color: '#637381',
                                              },
                                              children: `${success.length} cobros`,
                                            },
                                          },
                                        ],
                                      },
                                    },
                                  ],
                                },
                              },
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    display: 'flex',
                                    flex: 1,
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #D9D9D9',
                                    borderRadius: '10px',
                                    padding: '15px',
                                  },
                                  children: [
                                    {
                                      type: 'div',
                                      props: {
                                        style: {
                                          display: 'flex',
                                          flexDirection: 'column',
                                        },
                                        children: [
                                          {
                                            type: 'div',
                                            props: {
                                              style: {
                                                fontSize: '24px',
                                                color: '#B71D18',
                                                fontWeight: 'bold',
                                                marginBottom: '4px',
                                              },
                                              children: 'POR CONCILIAR',
                                            },
                                          },
                                          {
                                            type: 'div',
                                            props: {
                                              style: {
                                                fontSize: '36px',
                                                color: 'black',
                                                fontWeight: 'bold',
                                                marginBottom: '4px',
                                              },
                                              children: `$${formatNumberNoDecimals(total_review)}`,
                                            },
                                          },
                                          {
                                            type: 'div',
                                            props: {
                                              style: {
                                                fontSize: '22px',
                                                color: '#637381',
                                              },
                                              children: `${review.length} cobros`,
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
                        // Fila 2
                        {
                          type: 'div',
                          props: {
                            style: {
                              display: 'flex',
                              gap: '30px',
                            },
                            children: [
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    display: 'flex',
                                    flex: 1,
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #D9D9D9',
                                    borderRadius: '10px',
                                    padding: '15px',
                                  },
                                  children: [
                                    {
                                      type: 'div',
                                      props: {
                                        style: {
                                          display: 'flex',
                                          flexDirection: 'column',
                                        },
                                        children: [
                                          {
                                            type: 'div',
                                            props: {
                                              style: {
                                                fontSize: '24px',
                                                color: '#006C9C',
                                                fontWeight: 'bold',
                                                marginBottom: '4px',
                                              },
                                              children: 'CRÉDITO',
                                            },
                                          },
                                          {
                                            type: 'div',
                                            props: {
                                              style: {
                                                fontSize: '36px',
                                                color: 'black',
                                                fontWeight: 'bold',
                                                marginBottom: '4px',
                                              },
                                              children: `$${formatNumberNoDecimals(total_credit)}`,
                                            },
                                          },
                                          {
                                            type: 'div',
                                            props: {
                                              style: {
                                                fontSize: '22px',
                                                color: '#637381',
                                              },
                                              children: `${credit.length} cobros`,
                                            },
                                          },
                                        ],
                                      },
                                    },
                                  ],
                                },
                              },
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    display: 'flex',
                                    flex: 1,
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #D9D9D9',
                                    borderRadius: '10px',
                                    padding: '15px',
                                  },
                                  children: [
                                    {
                                      type: 'div',
                                      props: {
                                        style: {
                                          display: 'flex',
                                          flexDirection: 'column',
                                        },
                                        children: [
                                          {
                                            type: 'div',
                                            props: {
                                              style: {
                                                fontSize: '24px',
                                                color: '#4D5B68',
                                                fontWeight: 'bold',
                                                marginBottom: '4px',
                                              },
                                              children: 'PAGO EXTERNO',
                                            },
                                          },
                                          {
                                            type: 'div',
                                            props: {
                                              style: {
                                                fontSize: '36px',
                                                color: 'black',
                                                fontWeight: 'bold',
                                                marginBottom: '4px',
                                              },
                                              children: `$${formatNumberNoDecimals(total_external)}`,
                                            },
                                          },
                                          {
                                            type: 'div',
                                            props: {
                                              style: {
                                                fontSize: '22px',
                                                color: '#637381',
                                              },
                                              children: `${external.length} cobros`,
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
                        // Fila 3
                        {
                          type: 'div',
                          props: {
                            style: {
                              display: 'flex',
                              gap: '30px',
                            },
                            children: [
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    display: 'flex',
                                    flex: 1,
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #D9D9D9',
                                    borderRadius: '10px',
                                    padding: '15px',
                                  },
                                  children: [
                                    {
                                      type: 'div',
                                      props: {
                                        style: {
                                          display: 'flex',
                                          flexDirection: 'column',
                                        },
                                        children: [
                                          {
                                            type: 'div',
                                            props: {
                                              style: {
                                                fontSize: '24px',
                                                color: '#5119B7',
                                                fontWeight: 'bold',
                                                marginBottom: '4px',
                                              },
                                              children: 'DEVOLUCIONES',
                                            },
                                          },
                                          {
                                            type: 'div',
                                            props: {
                                              style: {
                                                fontSize: '36px',
                                                color: 'black',
                                                fontWeight: 'bold',
                                                marginBottom: '4px',
                                              },
                                              children: `$${formatNumberNoDecimals(total_return)}`,
                                            },
                                          },
                                          {
                                            type: 'div',
                                            props: {
                                              style: {
                                                fontSize: '22px',
                                                color: '#637381',
                                              },
                                              children: `${return_data.length} cobros`,
                                            },
                                          },
                                        ],
                                      },
                                    },
                                  ],
                                },
                              },
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    display: 'flex',
                                    flex: 1,
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #D9D9D9',
                                    borderRadius: '10px',
                                    padding: '15px',
                                  },
                                  children: [
                                    {
                                      type: 'div',
                                      props: {
                                        style: {
                                          display: 'flex',
                                          flexDirection: 'column',
                                        },
                                        children: [
                                          {
                                            type: 'div',
                                            props: {
                                              style: {
                                                fontSize: '24px',
                                                color: '#7A4100',
                                                fontWeight: 'bold',
                                                marginBottom: '4px',
                                              },
                                              children: 'SIN GESTIONAR',
                                            },
                                          },
                                          {
                                            type: 'div',
                                            props: {
                                              style: {
                                                fontSize: '36px',
                                                color: 'black',
                                                fontWeight: 'bold',
                                                marginBottom: '4px',
                                              },
                                              children: `$${formatNumberNoDecimals(total_pending)}`,
                                            },
                                          },
                                          {
                                            type: 'div',
                                            props: {
                                              style: {
                                                fontSize: '22px',
                                                color: '#637381',
                                              },
                                              children: `${pending.length} cobros`,
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
                  position: 'absolute',
                  bottom: '30px',
                  left: '0',
                  right: '0',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '10px',
                },
                children: [
                  {
                    type: 'div',
                    props: {
                      style: {
                        fontSize: '16px',
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
                        width: '100px',
                        height: '20px',
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

    // Generar SVG y convertir en imagen JPG
    const template = createReportTemplate();
    const svgString = await renderSvg(template, { width: 800, height: 880 });
    const imageBuffer = await convertSvgToJpg(svgString, { width: 800, height: 880 });

    const filename = `${crypto.randomUUID()}-${Date.now()}.jpg`;
    const { url } = await uploadFileToS3({
      path: "reports",
      filename,
      type: "image/jpeg",
      buffer: imageBuffer,
    });

    res.status(200).json({
      status: "success",
      message: "Reporte JPG creado exitosamente",
      url,
      extension: "jpg",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: "error",
      code: 500,
      message:
        "Error interno generando imagen" +
        (err.message ? ": " + err.message : ""),
    });
  }
};
