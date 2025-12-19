/**
 * Local development server
 * Run with: node server.js
 */

require('dotenv').config();
const http = require('http');
const receiptHandler = require('./api/generate-receipt');
const qrHandler = require('./routes/qrCodes');

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  // Parse URL and query params
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  // Add query params to req
  req.query = Object.fromEntries(url.searchParams);
  
  // Route handling
  if (url.pathname.startsWith('/api/generate-receipt')) {
    await handleRequest(req, res, receiptHandler);
  } else if (url.pathname.startsWith('/qr/payment')) {
    await handleRequest(req, res, qrHandler);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found. Available endpoints: POST /api/generate-receipt, POST /qr/payment' }));
    return;
  }
});

// Helper function to handle requests
async function handleRequest(req, res, handler) {
  // Parse JSON body for POST requests
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        req.body = JSON.parse(body);
      } catch (e) {
        req.body = {};
      }
      
      // Mock res methods for compatibility with Vercel handler
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (data) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
      };
      res.send = (data) => {
        res.end(data);
      };

      await handler(req, res);
    });
  } else {
    // Mock res methods
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    };
    res.send = (data) => {
      res.end(data);
    };
    
    await handler(req, res);
  }
}

server.listen(PORT, () => {
  console.log(`🧾 Receipt Generator Server running at http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST /api/generate-receipt          → Returns PNG image`);
  console.log(`  POST /api/generate-receipt?response=base64  → Returns base64 JSON`);
  console.log(`  POST /qr/payment                    → Returns QR JPG image`);
  console.log(`\nExample test commands:`);
  console.log(`  Receipt: curl -X POST http://localhost:${PORT}/api/generate-receipt \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d @example-request.json \\`);
  console.log(`    --output receipt.png`);
  console.log(`  QR: curl -X POST http://localhost:${PORT}/qr/payment \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"external_reference":"TEST-123","data":"https://example.com","business":{"logo":"https://via.placeholder.com/130x45/2563eb/ffffff?text=LOGO","main_color_brand":"#2563eb","secondary_color_brand":"#f3f4f6"}}'`);
});
