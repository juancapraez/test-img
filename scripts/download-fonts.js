/**
 * Script to download Red Hat Display fonts from Google Fonts
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const FONTS = [
  {
    name: 'RedHatDisplay-Regular.ttf',
    url: 'https://cdn.jsdelivr.net/fontsource/fonts/red-hat-display@latest/latin-400-normal.ttf',
  },
  {
    name: 'RedHatDisplay-Bold.ttf',
    url: 'https://cdn.jsdelivr.net/fontsource/fonts/red-hat-display@latest/latin-700-normal.ttf',
  },
];

const FONTS_DIR = path.join(__dirname, '..', 'fonts');

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  console.log('📦 Downloading Red Hat Display fonts...\n');

  // Ensure fonts directory exists
  if (!fs.existsSync(FONTS_DIR)) {
    fs.mkdirSync(FONTS_DIR, { recursive: true });
  }

  for (const font of FONTS) {
    const destPath = path.join(FONTS_DIR, font.name);
    console.log(`  Downloading ${font.name}...`);
    
    try {
      await downloadFile(font.url, destPath);
      const stats = fs.statSync(destPath);
      console.log(`  ✅ ${font.name} (${(stats.size / 1024).toFixed(1)} KB)`);
    } catch (error) {
      console.error(`  ❌ Failed to download ${font.name}:`, error.message);
    }
  }

  console.log('\n✅ Fonts downloaded to ./fonts/');
}

main().catch(console.error);
