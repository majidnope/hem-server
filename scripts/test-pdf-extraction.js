import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFExtract } from 'pdf.js-extract';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pdfExtract = new PDFExtract();

async function extractTextFromPdf(pdfPath) {
  console.log(`Extracting text from ${pdfPath}`);
  try {
    const options = {}; // Default options
    const data = await pdfExtract.extract(pdfPath, options);
    const pages = data.pages || [];
    
    console.log(`PDF has ${pages.length} pages`);
    
    let fullText = '';
    
    // Extract text from each page (limit to first 2 pages for preview)
    for (let i = 0; i < Math.min(pages.length, 2); i++) {
      console.log(`Processing page ${i + 1}...`);
      const page = pages[i];
      const pageText = page.content.map(item => item.str).join(' ');
      fullText += `[Page ${i + 1}]\n${pageText}\n\n`;
    }
    
    return fullText;
  } catch (error) {
    console.error(`Error extracting text from ${pdfPath}:`, error);
    return `[Error extracting text from ${path.basename(pdfPath)}]`;
  }
}

async function main() {
  const pdfDir = path.join(__dirname, '..', 'pdf');
  
  if (!fs.existsSync(pdfDir)) {
    console.error(`PDF directory does not exist: ${pdfDir}`);
    return;
  }

  const pdfFiles = fs.readdirSync(pdfDir)
    .filter(file => file.toLowerCase().endsWith('.pdf'));
  
  if (pdfFiles.length === 0) {
    console.error('No PDF files found in the directory');
    return;
  }

  // Process just the first PDF file as a test
  const firstPdf = pdfFiles[0];
  const pdfPath = path.join(pdfDir, firstPdf);
  
  console.log(`Testing extraction on: ${pdfPath}`);
  const text = await extractTextFromPdf(pdfPath);
  
  // Print a preview of the extracted text
  console.log('\nExtracted Text Preview (first 500 chars):');
  console.log(text.substring(0, 500) + '...');
  
  console.log('\nExtraction complete!');
}

main().catch(error => {
  console.error('Error:', error);
}); 