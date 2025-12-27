/**
 * Satori SVG Renderer Service
 * Converts JSX-like templates to SVG strings
 */

const satori = require('satori').default;
const { loadFonts } = require('../utils/fontLoader');

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
    width: 750, // 500 * 1.5 for payment receipts
    height: 1425, // 950 * 1.5 to match new template height
    fontFamily: 'Red Hat Display',
  };

  const renderOptions = { ...defaultOptions, ...options };

  try {
    // Load fonts using shared loader
    const { fontData, fontBoldData } = await loadFonts();
    
    const svg = await satori(convertToSatoriElement(template), {
      width: renderOptions.width,
      height: renderOptions.height,
      fonts: [
        {
          name: renderOptions.fontFamily,
          data: fontData,
          weight: 400,
          style: 'normal',
        },
        {
          name: renderOptions.fontFamily,
          data: fontBoldData,
          weight: 700,
          style: 'normal',
        },
      ],
    });
    
    return svg;
  } catch (error) {
    throw new Error(`Error rendering SVG: ${error.message}`);
  }
}

module.exports = { renderSvg };
