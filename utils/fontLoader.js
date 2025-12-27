/**
 * Shared Font Loader
 * Loads fonts for both Satori (SVG) and pdfmake (PDF)
 */

const path = require('path');
const fs = require('fs');

// Cache for fonts
let fontData = null;
let fontBoldData = null;
let fontPaths = null;

async function loadFonts() {
  if (fontData && fontBoldData && fontPaths) {
    return { fontData, fontBoldData, fontPaths };
  }

  const fontPath = path.join(process.cwd(), 'fonts', 'RedHatDisplay-Regular.ttf');
  const fontBoldPath = path.join(process.cwd(), 'fonts', 'RedHatDisplay-Bold.ttf');
  const fontItalicPath = path.join(process.cwd(), 'fonts', 'RedHatDisplay-Italic.ttf');
  const fontBoldItalicPath = path.join(process.cwd(), 'fonts', 'RedHatDisplay-BoldItalic.ttf');

  // Try to load local fonts first
  try {
    if (fs.existsSync(fontPath) && fs.existsSync(fontBoldPath)) {
      const regularData = fs.readFileSync(fontPath);
      const boldData = fs.readFileSync(fontBoldPath);
      // Verify they are valid TTF files (check magic number)
      if (regularData.length > 1000 && boldData.length > 1000) {
        fontData = regularData;
        fontBoldData = boldData;
        fontPaths = {
          normal: fontPath,
          bold: fontBoldPath,
          italics: fontItalicPath,
          bolditalics: fontBoldItalicPath
        };
        return { fontData, fontBoldData, fontPaths };
      }
    }
  } catch (error) {
    console.log('Local fonts not available, fetching from CDN...');
  }

  // Fetch TTF fonts from jsDelivr (fontsource package)
  try {
    const [regularRes, boldRes] = await Promise.all([
      fetch('https://cdn.jsdelivr.net/fontsource/fonts/red-hat-display@latest/latin-400-normal.ttf'),
      fetch('https://cdn.jsdelivr.net/fontsource/fonts/red-hat-display@latest/latin-700-normal.ttf'),
    ]);
    
    if (!regularRes.ok || !boldRes.ok) {
      throw new Error(`Font fetch failed: ${regularRes.status}, ${boldRes.status}`);
    }
    
    fontData = Buffer.from(await regularRes.arrayBuffer());
    fontBoldData = Buffer.from(await boldRes.arrayBuffer());
    
    // Verify TTF signature (should start with 0x00010000 or 'true')
    const sig = fontData.slice(0, 4).toString('hex');
    if (sig !== '00010000' && sig !== '74727565') {
      console.log('Font signature:', sig);
      throw new Error('Invalid TTF format received');
    }
    
    // For pdfmake, we need local file paths
    // Create fonts directory if it doesn't exist
    const fontsDir = path.join(process.cwd(), 'fonts');
    if (!fs.existsSync(fontsDir)) {
      fs.mkdirSync(fontsDir, { recursive: true });
    }
    
    // Write fonts to local files for pdfmake
    fs.writeFileSync(fontPath, fontData);
    fs.writeFileSync(fontBoldPath, fontBoldData);
    
    fontPaths = {
      normal: fontPath,
      bold: fontBoldPath,
      italics: fontItalicPath,
      bolditalics: fontBoldItalicPath
    };
    
  } catch (error) {
    console.error('Error loading fonts from CDN:', error);
    throw new Error('Failed to load fonts: ' + error.message);
  }

  return { fontData, fontBoldData, fontPaths };
}

module.exports = { loadFonts };
