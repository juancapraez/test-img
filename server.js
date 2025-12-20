/**
 * Local development server
 * Run with: node server.js
 */

require('dotenv').config();
const http = require('http');
const qrHandler = require('./api/qr/payment');
const paymentHandler = require('./api/receipt/image/payment');
const payoutHandler = require('./api/receipt/image/payout');

const PORT = process.env.PORT || 3015;

const server = http.createServer(async (req, res) => {
  // Parse URL and query params
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  // Add query params to req
  req.query = Object.fromEntries(url.searchParams);
  
  // Route handling
  if (url.pathname.startsWith('/qr/payment')) {
    await handleRequest(req, res, qrHandler);
  } else if (url.pathname.startsWith('/receipt/image/payment')) {
    await handleRequest(req, res, paymentHandler);
  } else if (url.pathname.startsWith('/receipt/image/payout')) {
    await handleRequest(req, res, payoutHandler);
  } else if (url.pathname.startsWith('/api/receipts/payment')) {
    await handleRequest(req, res, paymentHandler);
  } else if (url.pathname.startsWith('/api/receipts/payout')) {
    await handleRequest(req, res, payoutHandler);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Not found',
      available_endpoints: [
        'POST /qr/payment',
        'POST /receipt/image/payment',
        'POST /receipt/image/payout',
        'POST /api/receipts/payment',
        'POST /api/receipts/payout'
      ]
    }));
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
});
