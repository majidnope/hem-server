import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from '../models/PDFDocument.js';
import { extractTextFromPDF, splitTextIntoChunks } from '../services/pdfExtractor.js';
import { storeEmbeddings } from '../services/vectorService.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads/'));
  },
  filename: function(req, file, cb) {
    // Generate unique filename with timestamp and original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to accept only PDFs
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed!'), false);
  }
};

// Initialize multer upload
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
});

// Helper function to index PDF content
async function indexPDFContent(pdf) {
  try {
    // Extract text from PDF
    const text = await extractTextFromPDF(pdf.path);
    
    // Split text into chunks
    const chunks = splitTextIntoChunks(text);
    
    // Store chunks in vector database
    await storeEmbeddings(pdf._id.toString(), chunks, pdf.path);
    
    // Update PDF document to mark as vectorized
    pdf.vectorized = true;
    pdf.vectorizedAt = new Date();
    pdf.chunkCount = chunks.length;
    await pdf.save();
    
    console.log(`PDF ${pdf._id} indexed successfully with ${chunks.length} chunks`);
    return true;
  } catch (error) {
    console.error(`Error indexing PDF ${pdf._id}:`, error);
    return false;
  }
}

// Route to upload PDF file
router.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No PDF file uploaded' });
    }

    // Create new PDF document in database
    const newPDF = new PDFDocument({
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      description: req.body.description || ''
    });

    // Save to database
    await newPDF.save();

    // Start indexing process (non-blocking)
    indexPDFContent(newPDF)
      .then(success => {
        console.log(`PDF ${newPDF._id} indexing completed, success: ${success}`);
      })
      .catch(err => {
        console.error(`Error during PDF ${newPDF._id} indexing:`, err);
      });

    res.status(201).json({
      message: 'PDF uploaded successfully and indexing started',
      pdf: newPDF,
      indexing: 'in_progress'
    });
  } catch (error) {
    console.error('Error uploading PDF:', error);
    res.status(500).json({ 
      message: 'Failed to upload PDF',
      error: error.message 
    });
  }
});

// Get all PDFs
router.get('/', async (req, res) => {
  try {
    const pdfs = await PDFDocument.find().sort({ uploadDate: -1 });
    res.status(200).json(pdfs);
  } catch (error) {
    console.error('Error fetching PDFs:', error);
    res.status(500).json({ 
      message: 'Failed to fetch PDFs',
      error: error.message 
    });
  }
});

// Get single PDF by ID
router.get('/:id', async (req, res) => {
  try {
    const pdf = await PDFDocument.findById(req.params.id);
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }
    res.status(200).json(pdf);
  } catch (error) {
    console.error('Error fetching PDF:', error);
    res.status(500).json({ 
      message: 'Failed to fetch PDF',
      error: error.message 
    });
  }
});

// Get indexing status for a specific PDF
router.get('/:id/index-status', async (req, res) => {
  try {
    const pdf = await PDFDocument.findById(req.params.id).select('_id originalName vectorized vectorizedAt chunkCount');
    
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }
    
    const status = pdf.vectorized ? 'completed' : 'pending';
    
    res.status(200).json({
      id: pdf._id,
      name: pdf.originalName,
      status: status,
      chunksProcessed: pdf.chunkCount,
      completedAt: pdf.vectorizedAt
    });
  } catch (error) {
    console.error('Error fetching indexing status:', error);
    res.status(500).json({ 
      message: 'Failed to fetch indexing status',
      error: error.message 
    });
  }
});

export default router; 