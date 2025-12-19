/**
 * Satori SVG Renderer Service
 * Converts JSX-like templates to SVG strings
 */

const satori = require('satori').default;
const path = require('path');
const fs = require('fs');

// Cache for fonts
let fontData = null;
let fontBoldData = null;

async function loadFonts() {
  if (fontData && fontBoldData) return { fontData, fontBoldData };

  const fontPath = path.join(process.cwd(), 'fonts', 'RedHatDisplay-Regular.ttf');
  const fontBoldPath = path.join(process.cwd(), 'fonts', 'RedHatDisplay-Bold.ttf');

  // Try to load local fonts first
  try {
    if (fs.existsSync(fontPath) && fs.existsSync(fontBoldPath)) {
      const regularData = fs.readFileSync(fontPath);
      const boldData = fs.readFileSync(fontBoldPath);
      // Verify they are valid TTF files (check magic number)
      if (regularData.length > 1000 && boldData.length > 1000) {
        fontData = regularData;
        fontBoldData = boldData;
        return { fontData, fontBoldData };
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
    
  } catch (error) {
    console.error('Error loading fonts from CDN:', error);
    throw new Error('Failed to load fonts: ' + error.message);
  }

  return { fontData, fontBoldData };
}

function convertToSatoriElement(node) {
  if (!node) return null;
  if (typeof node === 'string' || typeof node === 'number') return node;

  const { type, props } = node;
  const { children, ...restProps } = props || {};

  let convertedChildren;
  if (Array.isArray(children)) {
    convertedChildren = children.map(convertToSatoriElement).filter(Boolean);
  } else if (children) {
    convertedChildren = convertToSatoriElement(children);
  }

  return {
    type,
    props: {
      ...restProps,
      children: convertedChildren,
    },
  };
}

async function renderSvg(template, options = {}) {
  const defaultOptions = {
    width: 700,
    height: 760,
    fontFamily: 'Red Hat Display',
  };

  const renderOptions = { ...defaultOptions, ...options };

  try {
    // Load fonts
    const { fontData, fontBoldData } = await loadFonts();
    
    // Add fonts to render options
    renderOptions.fonts = [
      {
        name: 'Red Hat Display',
        data: fontData,
        weight: 400,
        style: 'normal',
      },
      {
        name: 'Red Hat Display',
        data: fontData,
        weight: 500,
        style: 'normal',
      },
      {
        name: 'Red Hat Display',
        data: fontBoldData,
        weight: 600,
        style: 'normal',
      },
      {
        name: 'Red Hat Display',
        data: fontBoldData,
        weight: 700,
        style: 'normal',
      },
    ];

    // Convert template to satori element
    const satoriElement = convertToSatoriElement(template);
    
    const svg = await satori(satoriElement, renderOptions);
    return svg;
  } catch (error) {
    throw new Error(`Error rendering SVG: ${error.message}`);
  }
}

module.exports = { renderSvg };
