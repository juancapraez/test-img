/**
 * PDF fonts configuration for pdfmake
 * Uses shared font loader to ensure consistency with image generation
 */

const pdfMake = require('pdfmake');
const { loadFonts } = require('./fontLoader');

// Initialize printer with fonts
let printer = null;

async function getPrinter() {
  if (printer) {
    return printer;
  }

  // Load fonts using shared loader
  const { fontPaths } = await loadFonts();
  
  // Register fonts for pdfmake
  const fonts = {
    RedHatDisplay: {
      normal: fontPaths.normal,
      bold: fontPaths.bold,
      italics: fontPaths.italics,
      bolditalics: fontPaths.bolditalics,
    }
  };

  printer = new pdfMake(fonts);
  return printer;
}

// Export a function that returns the printer
module.exports = { getPrinter };
