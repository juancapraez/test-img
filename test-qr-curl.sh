#!/bin/bash

# Test QR payment endpoint with curl

curl -X POST http://localhost:3000/qr/payment \
  -H "Content-Type: application/json" \
  -d '{
    "external_reference": "TEST-'$(date +%s)'",
    "data": "https://example.com/payment/123456",
    "business": {
      "logo": "https://via.placeholder.com/130x45/2563eb/ffffff?text=LOGO",
      "main_color_brand": "#2563eb",
      "secondary_color_brand": "#f3f4f6"
    }
  }' | jq .
