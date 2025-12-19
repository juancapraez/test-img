/**
 * Generates QR code as data URI
 */

const QRCode = require('qrcode');

async function generateQr(data, options = {}) {
  const defaultOptions = {
    type: 'image/png',
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
    const dataUri = await QRCode.toDataURL(data, qrOptions);
    return dataUri;
  } catch (error) {
    throw new Error(`Error generating QR code: ${error.message}`);
  }
}

module.exports = { generateQr };
