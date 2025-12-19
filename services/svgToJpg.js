/**
 * SVG to JPG Converter Service
 * Converts SVG strings to JPG image buffers
 */

const sharp = require('sharp');

async function convertSvgToJpg(svgString, options = {}) {
  const defaultOptions = {
    format: 'jpeg',
    quality: 90,
    background: { r: 255, g: 255, b: 255, alpha: 1 }, // White background
  };

  const convertOptions = { ...defaultOptions, ...options };

  try {
    const buffer = Buffer.from(svgString);
    
    const jpgBuffer = await sharp(buffer)
      .resize(700, 760) // Ensure consistent dimensions
      .flatten(convertOptions.background)
      .jpeg({ quality: convertOptions.quality })
      .toBuffer();

    return jpgBuffer;
  } catch (error) {
    throw new Error(`Error converting SVG to JPG: ${error.message}`);
  }
}

module.exports = { convertSvgToJpg };
