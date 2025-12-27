/**
 * Creates PDF buffer from document definition using pdfmake
 */

async function createPdfBuffer(printer, docDefinition) {
  try {
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    
    return new Promise((resolve, reject) => {
      const chunks = [];
      pdfDoc.on('data', (chunk) => {
        chunks.push(Buffer.from(chunk));
      });
      pdfDoc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
      pdfDoc.on('error', (err) => {
        reject(err);
      });
      
      pdfDoc.end();
    });
  } catch (error) {
    throw new Error(`Error creating PDF buffer: ${error.message}`);
  }
}

module.exports = { createPdfBuffer };
