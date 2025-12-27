/**
 * Receipt Template for Satori
 * Generates JSX-like structure for receipt rendering
 */

function createReceiptTemplate(data) {
  const {
    logoDataUri,
    techLogoDataUri,
    manual_date,
    external_reference,
    description,
    amount,
    currency,
    reference_one,
    payment_method,
    client,
    user_phone,
    user_email,
    merchant_name,
    merchant_id,
    merchant_id_type,
    main_color_brand = '#000000',
    secondary_color_brand = '#f3f4f6',
    formatted_date,
    formatted_amount,
    descriptionLine1,
    descriptionLine2,
    clientLine1,
    clientLine2,
    type = 'payment', // 'payment' or 'payout'
    bank_name,
    bank_account_type,
    bank_account_number,
  } = data;

  // Dynamic height based on content - 1.5x larger with minimal base height
  const baseHeight = 950 * 1.5;
  const extraHeight = (descriptionLine2 ? 30 * 1.5 : 0) + (clientLine2 ? 30 * 1.5 : 0);
  const receiptHeight = baseHeight + extraHeight;

  const title = type === 'payment' ? '¡Pago exitoso!' : '¡Transferencia confirmada!';
  const width = type === 'payment' ? 500 * 1.5 : 480 * 1.5;

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: width,
        backgroundColor: secondary_color_brand,
        padding: 25 * 1.5,
        fontFamily: 'Red Hat Display',
        position: 'relative',
      },
      children: [
        // White container
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              backgroundColor: '#ffffff',
              borderRadius: 12 * 1.5,
              padding: 20 * 1.5,
              position: 'relative',
            },
            children: [
              // Logo
              {
                type: 'div',
                props: {
                  style: {
                    width: 160 * 1.5,
                    height: 60 * 1.5,
                    alignSelf: 'center',
                    marginTop: 10 * 1.5,
                    marginBottom: 20 * 1.5,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  },
                  children: [
                    {
                      type: 'img',
                      props: {
                        src: logoDataUri,
                        style: {
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                        },
                      },
                    },
                  ],
                },
              },
              // Title
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: 25 * 1.5,
                    color: main_color_brand,
                    fontWeight: 700,
                    alignSelf: 'center',
                    marginBottom: 12 * 1.5,
                  },
                  children: title,
                },
              },
              // Date
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: 12 * 1.5,
                    color: '#848688',
                    alignSelf: 'center',
                    marginBottom: 18 * 1.5,
                  },
                  children: formatted_date || manual_date,
                },
              },
              // Divider 1
              {
                type: 'div',
                props: {
                  style: {
                    height: 1,
                    backgroundColor: '#e5e7eb',
                    margin: '8px 0',
                  },
                },
              },
              // Card 1: Transaction Information
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    borderRadius: 8 * 1.5,
                    paddingTop: 16 * 1.5,
                    paddingBottom: 8 * 1.5,
                    paddingLeft: 0,
                    paddingRight: 0,
                    marginBottom: 8 * 1.5,
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          fontSize: 16 * 1.5,
                          color: main_color_brand,
                          fontWeight: 700,
                          marginBottom: 12 * 1.5,
                        },
                        children: 'Información de la transacción',
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8 * 1.5,
                        },
                        children: [
                          {
                            type: 'div',
                            props: {
                              style: {
                                display: 'flex',
                                justifyContent: 'space-between',
                              },
                              children: [
                                {
                                  type: 'span',
                                  props: {
                                    style: {
                                      fontSize: 16 * 1.5,
                                      color: '#666',
                                    },
                                    children: 'Código:',
                                  },
                                },
                                {
                                  type: 'span',
                                  props: {
                                    style: {
                                      fontSize: 16 * 1.5,
                                      color: '#222',
                                      fontWeight: 500,
                                    },
                                    children: external_reference,
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
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                              },
                              children: [
                                {
                                  type: 'span',
                                  props: {
                                    style: {
                                      fontSize: 16 * 1.5,
                                      color: '#666',
                                    },
                                    children: 'Descripción:',
                                  },
                                },
                                {
                                  type: 'div',
                                  props: {
                                    style: {
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'flex-end',
                                    },
                                    children: [
                                      {
                                        type: 'span',
                                        props: {
                                          style: {
                                            fontSize: 16 * 1.5,
                                            color: '#222',
                                            fontWeight: 500,
                                            maxWidth: 200 * 1.5,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                          },
                                          children: descriptionLine1,
                                        },
                                      },
                                      ...(descriptionLine2 ? [{
                                        type: 'span',
                                        props: {
                                          style: {
                                            fontSize: 16 * 1.5,
                                            color: '#222',
                                            fontWeight: 500,
                                            maxWidth: 200 * 1.5,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                          },
                                          children: descriptionLine2,
                                        },
                                      }] : []),
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
                                justifyContent: 'space-between',
                              },
                              children: [
                                {
                                  type: 'span',
                                  props: {
                                    style: {
                                      fontSize: 16 * 1.5,
                                      color: '#666',
                                    },
                                    children: 'Valor:',
                                  },
                                },
                                {
                                  type: 'span',
                                  props: {
                                    style: {
                                      fontSize: 16 * 1.5,
                                      color: '#222',
                                      fontWeight: 500,
                                    },
                                    children: `${currency} ${formatted_amount}`,
                                  },
                                },
                              ],
                            },
                          },
                          ...(type === 'payout' ? [
                            // Bank information for payouts
                            {
                              type: 'div',
                              props: {
                                style: {
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                },
                                children: [
                                  {
                                    type: 'span',
                                    props: {
                                      style: {
                                        fontSize: 16 * 1.5,
                                        color: '#666',
                                      },
                                      children: 'Entidad bancaria:',
                                    },
                                  },
                                  {
                                    type: 'span',
                                    props: {
                                      style: {
                                        fontSize: 16 * 1.5,
                                        color: '#222',
                                        fontWeight: 500,
                                      },
                                      children: bank_name || 'N/A',
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
                                  justifyContent: 'space-between',
                                },
                                children: [
                                  {
                                    type: 'span',
                                    props: {
                                      style: {
                                        fontSize: 16 * 1.5,
                                        color: '#666',
                                      },
                                      children: 'Cuenta:',
                                    },
                                  },
                                  {
                                    type: 'span',
                                    props: {
                                      style: {
                                        fontSize: 16 * 1.5,
                                        color: '#222',
                                        fontWeight: 500,
                                        textAlign: 'right',
                                        maxWidth: 200 * 1.5,
                                      },
                                      children: `${bank_account_type || 'N/A'} - ${bank_account_number || 'N/A'}`,
                                    },
                                  },
                                ],
                              },
                            },
                          ] : [
                            // Payment method for payments
                            {
                              type: 'div',
                              props: {
                                style: {
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                },
                                children: [
                                  {
                                    type: 'span',
                                    props: {
                                      style: {
                                        fontSize: 16 * 1.5,
                                        color: '#666',
                                      },
                                      children: 'Método de pago:',
                                    },
                                  },
                                  {
                                    type: 'span',
                                    props: {
                                      style: {
                                        fontSize: 16 * 1.5,
                                        color: '#222',
                                        fontWeight: 500,
                                      },
                                      children: payment_method || 'N/A',
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
                                  justifyContent: 'space-between',
                                },
                                children: [
                                  {
                                    type: 'span',
                                    props: {
                                      style: {
                                        fontSize: 16 * 1.5,
                                        color: '#666',
                                      },
                                      children: 'Medio de pago:',
                                    },
                                  },
                                  {
                                    type: 'span',
                                    props: {
                                      style: {
                                        fontSize: 16 * 1.5,
                                        color: '#222',
                                        fontWeight: 500,
                                      },
                                      children: data.payment_provider_source || 'N/A',
                                    },
                                  },
                                ],
                              },
                            },
                          ]),
                        ],
                      },
                    },
                  ],
                },
              },
              // Payment provider note for payouts
              ...(type === 'payout' && data.payment_provider_source ? [
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      justifyContent: 'flex-start',
                      alignItems: 'center',
                      marginBottom: 8 * 1.5,
                    },
                    children: {
                      type: 'span',
                      props: {
                        style: {
                          fontSize: 14 * 1.5,
                          color: main_color_brand || '#374550',
                          fontWeight: 500,
                          textAlign: 'left',
                        },
                        children: `Este pago aparecerá como ${data.payment_provider_source} en tus movimientos.`,
                      },
                    },
                  },
                },
                // Divider after payment provider note
                {
                  type: 'div',
                  props: {
                    style: {
                      height: 1,
                      backgroundColor: '#e5e7eb',
                      margin: '8px 0',
                    },
                  },
                },
              ] : []),
              // Card 2: Customer Data
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    borderRadius: 8 * 1.5,
                    paddingTop: 16 * 1.5,
                    paddingBottom: 16 * 1.5,
                    paddingLeft: 0,
                    paddingRight: 0,
                    marginBottom: 8 * 1.5,
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          fontSize: 16 * 1.5,
                          color: main_color_brand,
                          fontWeight: 700,
                          marginBottom: 12 * 1.5,
                        },
                        children: 'Datos del cliente',
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8 * 1.5,
                        },
                        children: [
                          {
                            type: 'div',
                            props: {
                              style: {
                                display: 'flex',
                                justifyContent: 'space-between',
                              },
                              children: [
                                {
                                  type: 'span',
                                  props: {
                                    style: {
                                      fontSize: 16 * 1.5,
                                      color: '#666',
                                    },
                                    children: 'Nombre:',
                                  },
                                },
                                {
                                  type: 'span',
                                  props: {
                                    style: {
                                      fontSize: 16 * 1.5,
                                      color: '#222',
                                      fontWeight: 500,
                                    },
                                    children: client || 'N/A',
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
                                justifyContent: 'space-between',
                              },
                              children: [
                                {
                                  type: 'span',
                                  props: {
                                    style: {
                                      fontSize: 16 * 1.5,
                                      color: '#666',
                                    },
                                    children: 'Identificación:',
                                  },
                                },
                                {
                                  type: 'span',
                                  props: {
                                    style: {
                                      fontSize: 16 * 1.5,
                                      color: '#222',
                                      fontWeight: 500,
                                    },
                                    children: data.user_id ? `${data.user_id.slice(0, 2)}***${data.user_id.slice(-2)}` : 'N/A',
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
                                justifyContent: 'space-between',
                              },
                              children: [
                                {
                                  type: 'span',
                                  props: {
                                    style: {
                                      fontSize: 16 * 1.5,
                                      color: '#666',
                                    },
                                    children: 'Contacto:',
                                  },
                                },
                                {
                                  type: 'span',
                                  props: {
                                    style: {
                                      fontSize: 16 * 1.5,
                                      color: '#222',
                                      fontWeight: 500,
                                      textAlign: 'right',
                                      maxWidth: 200 * 1.5,
                                    },
                                    children: user_phone || user_email || 'N/A',
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
              // Footer with tech logo
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#f9fafb',
                    padding: '12px 20px',
                    margin: '0 -20px -20px',
                    borderBottomLeftRadius: 12 * 1.5,
                    borderBottomRightRadius: 12 * 1.5,
                  },
                  children: [
                    {
                      type: 'span',
                      props: {
                        style: {
                          fontSize: 10 * 1.5,
                          color: '#848688',
                        },
                        children: merchant_name && merchant_id ? `${merchant_name} (${merchant_id})` : '',
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4 * 1.5,
                        },
                        children: [
                          {
                            type: 'span',
                            props: {
                              style: {
                                fontSize: 10 * 1.5,
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
                                height: 15 * 1.5,
                                objectFit: 'contain',
                              },
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
  };
}

module.exports = { createReceiptTemplate };
