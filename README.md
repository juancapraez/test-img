# Receipt Generator API

Servicio serverless para generar recibos en formato imagen (PNG) sin dependencia de navegador.

## Stack Técnico

- **Satori** - Convierte JSX a SVG (sin browser)
- **@resvg/resvg-js** - Convierte SVG a PNG
- **Vercel Functions** - Serverless runtime
- **Red Hat Display** - Tipografía

## Instalación

```bash
npm install
```

## Desarrollo Local

```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3000`

## Uso de la API

### Endpoint

```
POST /api/generate-receipt
```

### Query Parameters

| Parámetro | Valores | Default | Descripción |
|-----------|---------|---------|-------------|
| `response` | `image`, `base64` | `image` | Formato de respuesta |
| `format` | `png` | `png` | Formato de imagen |

### Request Body

```json
{
  "businessName": "Mi Negocio",
  "receiptNumber": "REC-001",
  "date": "2024-12-18T16:30:00.000Z",
  "reference": "TRX-123456",
  "customerName": "Juan Pérez",
  "customerEmail": "juan@email.com",
  "customerPhone": "+57 300 123 4567",
  "items": [
    {
      "description": "Producto A",
      "quantity": 2,
      "unitPrice": 15000
    }
  ],
  "subtotal": 30000,
  "tax": 5700,
  "total": 35700,
  "currency": "COP",
  "paymentMethod": "Efectivo",
  "footerMessage": "Gracias por su compra"
}
```

### Campos del Request

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `businessName` | string | No | Nombre del negocio |
| `businessLogo` | string | No | URL de logo (base64 o http) |
| `receiptNumber` | string | No | Número de recibo |
| `date` | string | No | Fecha ISO 8601 |
| `reference` | string | No | Referencia de transacción |
| `customerName` | string | No | Nombre del cliente |
| `customerEmail` | string | No | Email del cliente |
| `customerPhone` | string | No | Teléfono del cliente |
| `items` | array | No | Lista de ítems |
| `items[].description` | string | Sí* | Descripción del ítem |
| `items[].quantity` | number | Sí* | Cantidad |
| `items[].unitPrice` | number | Sí* | Precio unitario |
| `subtotal` | number | No | Subtotal |
| `tax` | number | No | Impuesto |
| `total` | number | No | Total a pagar |
| `currency` | string | No | Código de moneda (COP, USD, etc.) |
| `paymentMethod` | string | No | Método de pago |
| `footerMessage` | string | No | Mensaje de pie |

## Ejemplos

### Obtener imagen PNG

```bash
curl -X POST http://localhost:3000/api/generate-receipt \
  -H "Content-Type: application/json" \
  -d @example-request.json \
  --output receipt.png
```

### Obtener base64

```bash
curl -X POST "http://localhost:3000/api/generate-receipt?response=base64" \
  -H "Content-Type: application/json" \
  -d @example-request.json
```

## Despliegue en Vercel

```bash
npm install -g vercel
vercel
```

## Performance

- ⚡ ~50-100ms generación por imagen
- 📦 ~15MB bundle size
- 🚀 Cold start: ~500ms

## Licencia

MIT
