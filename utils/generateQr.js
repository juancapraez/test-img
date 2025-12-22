/**
 * Generates QR code as data URI
 */

const QRCode = require('qrcode');

async function generateQr(data, options = {}) {
  const defaultOptions = {
    type: 'svg',
    quality: 0.92,
    margin: 0,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    width: 610,
  };

  const qrOptions = { ...defaultOptions, ...options };

  try {
    if (qrOptions.type === 'svg') {
      // QRCode.toString usa callbacks, necesitamos promisificarlo
      const svgString = await new Promise((resolve, reject) => {
        QRCode.toString(data, qrOptions, (err, svg) => {
          if (err) reject(err);
          else resolve(svg);
        });
      });
      // Convertir SVG a data URI para compatibilidad con template existente
      const base64Svg = Buffer.from(svgString).toString('base64');
      return `data:image/svg+xml;base64,${base64Svg}`;
    } else {
      const dataUri = await QRCode.toDataURL(data, qrOptions);
      return dataUri;
    }
  } catch (error) {
    throw new Error(`Error generating QR code: ${error.message}`);
  }
}

module.exports = { generateQr };
