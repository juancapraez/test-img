/**
 * SVG to JPG Converter Service
 * Converts SVG strings to JPG image buffers
 */

const sharp = require('sharp');

async function convertSvgToJpg(svgString, options = {}) {
  const defaultOptions = {
    width: 700,
    height: 760, // Default height
    format: 'jpeg',
    quality: 95,
    background: { r: 255, g: 255, b: 255, alpha: 1 }, // White background
    density: 300, // Higher DPI for better quality
  };

  const convertOptions = { ...defaultOptions, ...options };

  try {
    const buffer = Buffer.from(svgString);
    
    const jpgBuffer = await sharp(buffer, { density: convertOptions.density })
      .resize(convertOptions.width, convertOptions.height, {
        fit: 'fill',
        kernel: sharp.kernel.lanczos3, // Best quality for downscaling
      })
      .flatten(convertOptions.background)
      .jpeg({ 
        quality: convertOptions.quality,
        progressive: true, // Better for web
      })
      .toBuffer();

    return jpgBuffer;
  } catch (error) {
    throw new Error(`Error converting SVG to JPG: ${error.message}`);
  }
}

module.exports = { convertSvgToJpg };
