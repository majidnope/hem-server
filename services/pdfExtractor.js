import * as pdfjsLib from 'pdfjs-dist';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Configure PDF.js worker
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
pdfjsLib.GlobalWorkerOptions.workerSrc = path.resolve(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.mjs');

/**
 * Extracts text from a PDF file
 * @param {string} pdfPath - Path to the PDF file
 * @returns {Promise<string>} - Extracted text from the PDF
 */
export async function extractTextFromPDF(pdfPath) {
  try {
    // Check if file exists
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF file not found at ${pdfPath}`);
    }

    // Load the PDF document
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const pdfDocument = await pdfjsLib.getDocument({ data }).promise;
    
    const numPages = pdfDocument.numPages;
    let text = '';

    // Extract text from each page
    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      text += pageText + ' ';
    }

    return text.trim();
  } catch (error) {
    console.error(`Error extracting text from PDF: ${error.message}`);
    throw error;
  }
}

/**
 * Splits text into chunks of specified size with overlap
 * @param {string} text - Text to split
 * @param {number} chunkSize - Number of characters per chunk
 * @param {number} overlap - Number of characters to overlap between chunks
 * @returns {Array<string>} - Array of text chunks
 */
export function splitTextIntoChunks(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  
  if (text.length <= chunkSize) {
    return [text];
  }

  let startIndex = 0;
  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    chunks.push(text.substring(startIndex, endIndex));
    startIndex = endIndex - overlap;
    
    // Break if we've reached the end of text
    if (startIndex >= text.length - overlap) {
      break;
    }
  }

  return chunks;
} 