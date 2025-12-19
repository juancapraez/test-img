/**
 * Downloads an image from URL and converts it to base64 data URI
 */

const axios = require('axios');

async function downloadImageAsBase64(imageUrl) {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
    });
    
    const mimeType = response.headers['content-type'] || 'image/jpeg';
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    const dataUri = `data:${mimeType};base64,${base64}`;
    
    return dataUri;
  } catch (error) {
    throw new Error(`Error downloading image: ${error.message}`);
  }
}

module.exports = { downloadImageAsBase64 };
