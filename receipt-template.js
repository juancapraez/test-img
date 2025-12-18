/**
 * Receipt Template for Satori
 * Generates JSX-like structure for receipt rendering
 */

function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function createReceiptTemplate(data) {
  const {
    businessName = 'Mi Negocio',
    businessLogo = null,
    receiptNumber = '000001',
    date = new Date().toISOString(),
    customerName = 'Cliente',
    customerEmail = '',
    customerPhone = '',
    items = [],
    subtotal = 0,
    tax = 0,
    total = 0,
    currency = 'COP',
    paymentMethod = 'Efectivo',
    footerMessage = 'Gracias por su compra',
    reference = '',
  } = data;

  const receiptWidth = 400;

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: receiptWidth,
        backgroundColor: '#ffffff',
        padding: 32,
        fontFamily: 'Red Hat Display',
        color: '#1a1a1a',
      },
      children: [
        // Header
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: 24,
              borderBottom: '2px dashed #e0e0e0',
              paddingBottom: 20,
            },
            children: [
              businessLogo ? {
                type: 'img',
                props: {
                  src: businessLogo,
                  width: 80,
                  height: 80,
                  style: { marginBottom: 12 },
                },
              } : {
                type: 'div',
                props: {
                  style: {
                    width: 60,
                    height: 60,
                    backgroundColor: '#2563eb',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  },
                  children: [{
                    type: 'span',
                    props: {
                      style: {
                        color: '#ffffff',
                        fontSize: 24,
                        fontWeight: 700,
                      },
                      children: businessName.charAt(0).toUpperCase(),
                    },
                  }],
                },
              },
              {
                type: 'span',
                props: {
                  style: {
                    fontSize: 22,
                    fontWeight: 700,
                    color: '#1a1a1a',
                  },
                  children: businessName,
                },
              },
            ],
          },
        },

        // Receipt Info
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              marginBottom: 20,
              gap: 6,
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 13,
                  },
                  children: [
                    {
                      type: 'span',
                      props: {
                        style: { color: '#6b7280', fontWeight: 500 },
                        children: 'Recibo #',
                      },
                    },
                    {
                      type: 'span',
                      props: {
                        style: { fontWeight: 600 },
                        children: receiptNumber,
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
                    fontSize: 13,
                  },
                  children: [
                    {
                      type: 'span',
                      props: {
                        style: { color: '#6b7280', fontWeight: 500 },
                        children: 'Fecha',
                      },
                    },
                    {
                      type: 'span',
                      props: {
                        style: { fontWeight: 500 },
                        children: formatDate(date),
                      },
                    },
                  ],
                },
              },
              reference ? {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 13,
                  },
                  children: [
                    {
                      type: 'span',
                      props: {
                        style: { color: '#6b7280', fontWeight: 500 },
                        children: 'Referencia',
                      },
                    },
                    {
                      type: 'span',
                      props: {
                        style: { fontWeight: 500 },
                        children: reference,
                      },
                    },
                  ],
                },
              } : null,
            ].filter(Boolean),
          },
        },

        // Customer Info
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#f8fafc',
              padding: 14,
              borderRadius: 8,
              marginBottom: 20,
              gap: 4,
            },
            children: [
              {
                type: 'span',
                props: {
                  style: {
                    fontSize: 11,
                    color: '#6b7280',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  },
                  children: 'Cliente',
                },
              },
              {
                type: 'span',
                props: {
                  style: {
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#1a1a1a',
                  },
                  children: customerName,
                },
              },
              customerEmail ? {
                type: 'span',
                props: {
                  style: { fontSize: 12, color: '#6b7280' },
                  children: customerEmail,
                },
              } : null,
              customerPhone ? {
                type: 'span',
                props: {
                  style: { fontSize: 12, color: '#6b7280' },
                  children: customerPhone,
                },
              } : null,
            ].filter(Boolean),
          },
        },

        // Items
        items.length > 0 ? {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              marginBottom: 16,
            },
            children: [
              // Items Header
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #e5e7eb',
                    paddingBottom: 8,
                    marginBottom: 8,
                  },
                  children: [
                    {
                      type: 'span',
                      props: {
                        style: {
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#6b7280',
                          textTransform: 'uppercase',
                        },
                        children: 'Descripción',
                      },
                    },
                    {
                      type: 'span',
                      props: {
                        style: {
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#6b7280',
                          textTransform: 'uppercase',
                        },
                        children: 'Valor',
                      },
                    },
                  ],
                },
              },
              // Items List
              ...items.map((item) => ({
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    paddingTop: 6,
                    paddingBottom: 6,
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          flexDirection: 'column',
                          flex: 1,
                        },
                        children: [
                          {
                            type: 'span',
                            props: {
                              style: {
                                fontSize: 14,
                                fontWeight: 500,
                                color: '#1a1a1a',
                              },
                              children: item.description,
                            },
                          },
                          item.quantity > 1 ? {
                            type: 'span',
                            props: {
                              style: {
                                fontSize: 12,
                                color: '#6b7280',
                              },
                              children: `${item.quantity} x ${formatCurrency(item.unitPrice, currency)}`,
                            },
                          } : null,
                        ].filter(Boolean),
                      },
                    },
                    {
                      type: 'span',
                      props: {
                        style: {
                          fontSize: 14,
                          fontWeight: 600,
                          color: '#1a1a1a',
                        },
                        children: formatCurrency(item.quantity * item.unitPrice, currency),
                      },
                    },
                  ],
                },
              })),
            ],
          },
        } : null,

        // Totals
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              borderTop: '1px solid #e5e7eb',
              paddingTop: 12,
              gap: 6,
            },
            children: [
              subtotal > 0 ? {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 13,
                  },
                  children: [
                    {
                      type: 'span',
                      props: {
                        style: { color: '#6b7280' },
                        children: 'Subtotal',
                      },
                    },
                    {
                      type: 'span',
                      props: {
                        children: formatCurrency(subtotal, currency),
                      },
                    },
                  ],
                },
              } : null,
              tax > 0 ? {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 13,
                  },
                  children: [
                    {
                      type: 'span',
                      props: {
                        style: { color: '#6b7280' },
                        children: 'IVA',
                      },
                    },
                    {
                      type: 'span',
                      props: {
                        children: formatCurrency(tax, currency),
                      },
                    },
                  ],
                },
              } : null,
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 18,
                    fontWeight: 700,
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '2px solid #1a1a1a',
                  },
                  children: [
                    {
                      type: 'span',
                      props: {
                        children: 'Total',
                      },
                    },
                    {
                      type: 'span',
                      props: {
                        style: { color: '#2563eb' },
                        children: formatCurrency(total, currency),
                      },
                    },
                  ],
                },
              },
            ].filter(Boolean),
          },
        },

        // Payment Method
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              justifyContent: 'center',
              marginTop: 16,
              padding: 10,
              backgroundColor: '#ecfdf5',
              borderRadius: 6,
            },
            children: [{
              type: 'span',
              props: {
                style: {
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#059669',
                },
                children: `✓ Pagado - ${paymentMethod}`,
              },
            }],
          },
        },

        // Footer
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginTop: 24,
              paddingTop: 16,
              borderTop: '2px dashed #e0e0e0',
              gap: 4,
            },
            children: [
              {
                type: 'span',
                props: {
                  style: {
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#374151',
                    textAlign: 'center',
                  },
                  children: footerMessage,
                },
              },
              {
                type: 'span',
                props: {
                  style: {
                    fontSize: 11,
                    color: '#9ca3af',
                    marginTop: 8,
                  },
                  children: 'Generado automáticamente',
                },
              },
            ],
          },
        },
      ].filter(Boolean),
    },
  };
}

module.exports = { createReceiptTemplate, formatCurrency, formatDate };
