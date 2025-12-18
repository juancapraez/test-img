const satori = require('satori').default;
const sharp = require('sharp');
const { createReceiptTemplate } = require('../receipt-template');
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

async function generateReceiptImage(receiptData, format = 'png') {
  const { fontData, fontBoldData } = await loadFonts();

  const template = createReceiptTemplate(receiptData);
  const satoriElement = convertToSatoriElement(template);

  // Generate SVG with Satori
  const svg = await satori(satoriElement, {
    width: 400,
    height: 800,
    fonts: [
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
    ],
  });

  // Convert SVG to PNG using Sharp (much faster than Resvg)
  const pngBuffer = await sharp(Buffer.from(svg))
    .png()
    .toBuffer();

  return pngBuffer;
}

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const receiptData = req.body;

    if (!receiptData || typeof receiptData !== 'object') {
      return res.status(400).json({
        error: 'Invalid request body. Expected JSON object with receipt data.',
      });
    }

    const format = req.query.format || 'png';
    const responseType = req.query.response || 'image'; // 'image' or 'base64'

    const startTime = Date.now();
    const imageBuffer = await generateReceiptImage(receiptData, format);
    const generationTime = Date.now() - startTime;

    if (responseType === 'base64') {
      return res.status(200).json({
        success: true,
        format,
        generationTimeMs: generationTime,
        image: `data:image/${format};base64,${imageBuffer.toString('base64')}`,
      });
    }

    res.setHeader('Content-Type', `image/${format}`);
    res.setHeader('X-Generation-Time-Ms', generationTime.toString());
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).send(imageBuffer);

  } catch (error) {
    console.error('Error generating receipt:', error);
    return res.status(500).json({
      error: 'Failed to generate receipt image',
      details: error.message,
    });
  }
};

// Export for local testing
module.exports.generateReceiptImage = generateReceiptImage;
