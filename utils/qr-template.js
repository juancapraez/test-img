/**
 * QR Code Template for Satori
 * Generates JSX-like structure for QR code rendering
 */

function createQrTemplate(data) {
  const {
    qrDataUri,
    logoDataUri,
    external_reference,
    terminal,
    main_color_brand = '#000000',
    secondary_color_brand = '#f3f4f6',
  } = data;

  const qrWidth = 700;
  const qrHeight = 760;

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'row',
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
              width: terminal ? qrWidth - 50 : qrWidth - 25,
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
                  ],
                },
              },
            ],
          },
        },
        // Terminal text column - shown only if terminal exists
        terminal ? {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              width: '30px',
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
            },
            children: {
              type: 'div',
              props: {
                style: {
                  fontSize: 10,
                  fontWeight: 400,
                  color: '#9ca3af',
                  whiteSpace: 'nowrap',
                  transform: 'rotate(90deg)',
                  transformOrigin: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                children: terminal,
              },
            },
          },
        } : null,
      ],
    },
  };
}

module.exports = { createQrTemplate };
