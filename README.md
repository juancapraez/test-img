# Receipt Generator

Generador de recibos y códigos QR para transacciones.

## Estructura del Proyecto

```
/api
  /generate-receipt.js    - Genera recibo PNG
  /qr
    /payment.js          - Genera QR JPG
  /receipt
    /image
      /payment.js        - Recibo de pago JPG
      /payout.js         - Recibo de transferencia JPG
/utils                   - Utilidades (templates, formatos, etc.)
/services                - Servicios (S3, Satori, etc.)
```

## Endpoints

### Generar QR
```bash
POST /qr/payment
```

### Generar Recibo JPG
```bash
POST /receipt/image/payment
POST /receipt/image/payout
POST /api/receipts/payment    # Vercel
POST /api/receipts/payout     # Vercel
```

## Ejemplo de Uso

### QR
```bash
curl -X POST http://localhost:3015/qr/payment \
  -H "Content-Type: application/json" \
  -d '{
    "external_reference": "TEST-123",
    "data": "https://example.com",
    "business": {
      "logo": "https://via.placeholder.com/130x45/2563eb/ffffff?text=LOGO",
      "main_color_brand": "#2563eb",
      "secondary_color_brand": "#f3f4f6"
    }
  }'
```

### Recibo
```bash
curl -X POST http://localhost:3015/receipt/image/payment \
  -H "Content-Type: application/json" \
  -d @example-request.json \
  --output receipt.jpg
```

## Desarrollo Local

```bash
npm install
npm run dev
```

El servidor corre en `http://localhost:3015`.

## Variables de Entorno

Copiar `.env.example` a `.env` y configurar:
- AWS credentials para S3
- Otras variables de configuración

## Deploy

El proyecto está configurado para deploy en Vercel con serverless functions.
