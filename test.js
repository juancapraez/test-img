/**
 * Test script to generate a receipt locally
 */

const fs = require('fs');
const path = require('path');
const { generateReceiptImage } = require('./api/generate-receipt');

const testData = {
  businessName: "Café El Buen Sabor",
  receiptNumber: "REC-2024-001542",
  date: "2024-12-18T16:30:00.000Z",
  reference: "TRX-8847291",
  customerName: "Juan Carlos Pérez",
  customerEmail: "juan.perez@email.com",
  customerPhone: "+57 300 123 4567",
  items: [
    {
      description: "Café Americano Grande",
      quantity: 2,
      unitPrice: 8500
    },
    {
      description: "Croissant de Almendras",
      quantity: 1,
      unitPrice: 12000
    },
    {
      description: "Sandwich Club Premium",
      quantity: 1,
      unitPrice: 25000
    },
    {
      description: "Agua Mineral 500ml",
      quantity: 2,
      unitPrice: 4500
    }
  ],
  subtotal: 63000,
  tax: 11970,
  total: 74970,
  currency: "COP",
  paymentMethod: "Tarjeta de Crédito",
  footerMessage: "¡Gracias por visitarnos! Vuelve pronto"
};

async function main() {
  console.log('🧾 Generating test receipt...\n');
  
  const startTime = Date.now();
  
  try {
    const imageBuffer = await generateReceiptImage(testData);
    const generationTime = Date.now() - startTime;
    
    const outputPath = path.join(__dirname, 'test-receipt.png');
    fs.writeFileSync(outputPath, imageBuffer);
    
    console.log(`✅ Receipt generated successfully!`);
    console.log(`   Time: ${generationTime}ms`);
    console.log(`   Size: ${(imageBuffer.length / 1024).toFixed(1)} KB`);
    console.log(`   Output: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Error generating receipt:', error);
    process.exit(1);
  }
}

main();
