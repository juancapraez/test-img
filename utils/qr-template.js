/**
 * QR Code Template for Satori
 * Generates JSX-like structure for QR code rendering
 */

function maskBusinessName(name) {
  if (!name) return name;
  
  return name
    .split(' ')
    .map(word => {
      if (!word || word.length <= 3) {
        return word;
      }
      // Take first 2 letters + 3 asterisks
      return word.substring(0, 2) + '***';
    })
    .join(' ');
}

function createQrTemplate(data) {
  const {
    qrDataUri,
    logoDataUri,
    external_reference,
    terminal,
    main_color_brand = '#000000',
    secondary_color_brand = '#f3f4f6',
  } = data;

  // Dynamic height based on terminal presence
  const qrWidth = 700;
  const qrHeight = terminal ? 820 : 760; // Smaller when no terminal

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: qrWidth,
        height: qrHeight,
        backgroundColor: secondary_color_brand,
        padding: 25,
        fontFamily: 'Red Hat Display',
        position: 'relative',
      },
      children: [
        // Main QR container
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              height: '100%',
              backgroundColor: '#ffffff',
              borderRadius: 10,
              padding: 20,
              position: 'relative',
            },
            children: [
              // QR Code
              {
                type: 'img',
                props: {
                  src: qrDataUri,
                  style: {
                    width: 610,
                    height: 610,
                    alignSelf: 'center',
                  },
                },
              },
              // Bottom section with logo and reference
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    marginTop: 15,
                    marginBottom: 15,
                    gap: 10,
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        },
                        children: [
                          // Logo
                          {
                            type: 'img',
                            props: {
                              src: logoDataUri,
                              style: {
                                width: 130,
                                height: 45,
                                objectFit: 'contain',
                              },
                            },
                          },
                          // Reference
                          {
                            type: 'div',
                            props: {
                              style: {
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-end',
                                gap: 5,
                              },
                              children: [
                                {
                                  type: 'span',
                                  props: {
                                    style: {
                                      fontSize: 16,
                                      color: '#000000',
                                      fontWeight: 400,
                                    },
                                    children: 'REFERENCIA',
                                  },
                                },
                                {
                                  type: 'span',
                                  props: {
                                    style: {
                                      fontSize: 26,
                                      color: '#000000',
                                      fontWeight: 700,
                                    },
                                    children: external_reference,
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                    // Alert message - shown only if terminal exists
                    terminal ? {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          padding: '8px 12px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: 6,
                          border: '1px solid #e9ecef',
                        },
                        children: {
                          type: 'span',
                          props: {
                            style: {
                              fontSize: 13,
                              color: '#6c757d',
                              textAlign: 'center',
                              lineHeight: 1.4,
                              gap: 5,
                            },
                            children: [
                              {
                                type: 'span',
                                props: {
                                  style: {
                                    fontWeight: 700,
                                  },
                                  children: 'Al pagar verás el nombre:',
                                },
                              },
                              {
                                type: 'span',
                                props: {
                                  children: `${terminal} (${maskBusinessName(terminal)}) | Trazo Tecnología`,
                                },
                              },
                            ],
                          },
                        },
                      },
                    } : null,
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

module.exports = { createQrTemplate };
