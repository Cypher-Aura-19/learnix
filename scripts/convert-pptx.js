const fs = require('fs');
const path = require('path');
const pptxToPdf = require('pptx-to-pdf');

async function main() {
  const inputFile = process.argv[2];
  const outputFile = process.argv[3];

  if (!inputFile || !outputFile) {
    console.error("Usage: node convert-pptx.js <input.pptx> <output.pdf>");
    process.exit(1);
  }

  try {
    const pptxBuffer = fs.readFileSync(inputFile);
    const pdfBuffer = await pptxToPdf.convert(pptxBuffer);
    fs.writeFileSync(outputFile, pdfBuffer);
    console.log("Converted successfully!");
    process.exit(0);
  } catch (err) {
    console.error("PPTX conversion script failed:", err);
    process.exit(1);
  }
}

main();
