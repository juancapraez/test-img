/**
 * Local development server
 * Run with: node server.js
 */

const http = require('http');
const handler = require('./api/generate-receipt');

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  // Parse URL and query params
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  // Add query params to req
  req.query = Object.fromEntries(url.searchParams);
  
  // Only handle /api/generate-receipt
  if (!url.pathname.startsWith('/api/generate-receipt')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found. Use POST /api/generate-receipt' }));
    return;
  }

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
});

server.listen(PORT, () => {
  console.log(`🧾 Receipt Generator Server running at http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST /api/generate-receipt          → Returns PNG image`);
  console.log(`  POST /api/generate-receipt?response=base64  → Returns base64 JSON`);
  console.log(`\nExample test command:`);
  console.log(`  curl -X POST http://localhost:${PORT}/api/generate-receipt \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d @example-request.json \\`);
  console.log(`    --output receipt.png`);
});
