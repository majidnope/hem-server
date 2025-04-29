import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFExtract } from 'pdf.js-extract';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { HNSWLib } from '@langchain/community/vectorstores/hnswlib';
import { Document } from '@langchain/core/documents';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PdfService {
  constructor(apiKey) {
    this.openaiApiKey = apiKey;
    this.pdfDir = path.join(__dirname, '..', 'pdf');
    this.vectorStorePath = path.join(__dirname, '..', 'vectorstore');
    this.embeddings = new OpenAIEmbeddings({ 
      openAIApiKey: this.openaiApiKey,
      modelName: 'text-embedding-3-small'
    });
    this.pdfExtract = new PDFExtract();
  }

  async extractTextFromPdf(pdfPath) {
    console.log(`Extracting text from ${pdfPath}`);
    try {
      const options = {}; // See docs for options
      const data = await this.pdfExtract.extract(pdfPath, options);
      const pages = data.pages || [];
      
      let fullText = '';
      
      for (let i = 0; i < pages.length; i++) {
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

  async splitDocumentIntoChunks(text, metadata) {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    const docs = await splitter.createDocuments([text], [metadata]);
    return docs;
  }

  async processAllPdfs() {
    if (!fs.existsSync(this.pdfDir)) {
      throw new Error(`PDF directory does not exist: ${this.pdfDir}`);
    }

    const pdfFiles = fs.readdirSync(this.pdfDir)
      .filter(file => file.toLowerCase().endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
      throw new Error('No PDF files found in the directory');
    }

    let allDocs = [];
    
    for (const pdfFile of pdfFiles) {
      const pdfPath = path.join(this.pdfDir, pdfFile);
      const text = await this.extractTextFromPdf(pdfPath);
      
      const metadata = {
        source: pdfFile,
        filename: pdfFile,
        path: pdfPath
      };
      
      const docs = await this.splitDocumentIntoChunks(text, metadata);
      allDocs = allDocs.concat(docs);
      
      console.log(`Processed ${pdfFile}: created ${docs.length} chunks`);
    }
    
    console.log(`Total chunks created: ${allDocs.length}`);
    return allDocs;
  }

  async createVectorStore(docs) {
    console.log('Creating vector store...');
    const vectorStore = await HNSWLib.fromDocuments(docs, this.embeddings);
    
    // Ensure directory exists
    if (!fs.existsSync(this.vectorStorePath)) {
      fs.mkdirSync(this.vectorStorePath, { recursive: true });
    }
    
    // Save the vector store
    await vectorStore.save(this.vectorStorePath);
    console.log(`Vector store saved to ${this.vectorStorePath}`);
    
    return vectorStore;
  }

  async loadVectorStore() {
    if (!fs.existsSync(this.vectorStorePath)) {
      throw new Error('Vector store has not been created yet. Run processAndIndex first.');
    }
    
    console.log('Loading vector store...');
    return await HNSWLib.load(this.vectorStorePath, this.embeddings);
  }

  async processAndIndex() {
    const docs = await this.processAllPdfs();
    return await this.createVectorStore(docs);
  }

  async searchPdfs(query, k = 5) {
    let vectorStore;
    
    try {
      vectorStore = await this.loadVectorStore();
    } catch (error) {
      console.log('Vector store not found, creating it first...');
      vectorStore = await this.processAndIndex();
    }
    
    const results = await vectorStore.similaritySearch(query, k);
    
    return results.map(doc => ({
      content: doc.pageContent,
      score: doc.metadata.score,
      source: doc.metadata.source,
      path: doc.metadata.path
    }));
  }
}

export default PdfService; 