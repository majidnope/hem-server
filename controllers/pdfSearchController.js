import { extractTextFromPDF, splitTextIntoChunks } from '../services/pdfExtractor.js';
import { storeEmbeddings, searchPDFs, initializeQdrant } from '../services/vectorService.js';
import PDFDocument from '../models/PDFDocument.js';
import path from 'path';

// Initialize Qdrant collection on server start
export async function initializeVectorDB() {
  try {
    await initializeQdrant();
    console.log('Vector database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize vector database:', error);
  }
}

/**
 * Index a PDF file for vector search
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function indexPDF(req, res) {
  try {
    const { pdfId } = req.params;
    
    // Find PDF document
    const pdf = await PDFDocument.findById(pdfId);
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }
    
    // Check if already vectorized
    if (pdf.vectorized) {
      return res.status(200).json({ 
        message: 'PDF is already indexed', 
        pdf
      });
    }
    
    // Extract text from PDF
    const pdfPath = pdf.path;
    const text = await extractTextFromPDF(pdfPath);
    
    // Split text into chunks
    const chunks = splitTextIntoChunks(text);
    
    // Store chunks in vector database
    await storeEmbeddings(pdfId, chunks, pdfPath);
    
    // Update PDF document to mark as vectorized
    pdf.vectorized = true;
    pdf.vectorizedAt = new Date();
    pdf.chunkCount = chunks.length;
    await pdf.save();
    
    res.status(200).json({
      message: 'PDF indexed successfully',
      pdf
    });
  } catch (error) {
    console.error('Error indexing PDF:', error);
    res.status(500).json({
      message: 'Failed to index PDF',
      error: error.message
    });
  }
}

/**
 * Search across indexed PDFs
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function searchInPDFs(req, res) {
  try {
    const { query } = req.query;
    const limit = parseInt(req.query.limit) || 5;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    // Search in vector database
    const results = await searchPDFs(query, limit);
    
    // Get unique PDF IDs from results
    const pdfIds = [...new Set(results.map(result => result.pdfId))];
    
    // Fetch PDF details from database
    const pdfDetails = await PDFDocument.find({ _id: { $in: pdfIds } });
    
    // Enhance results with PDF details
    const enhancedResults = results.map(result => {
      const pdfDetail = pdfDetails.find(pdf => pdf._id.toString() === result.pdfId);
      return {
        ...result,
        pdf: pdfDetail ? {
          id: pdfDetail._id,
          filename: pdfDetail.filename,
          originalName: pdfDetail.originalName,
          description: pdfDetail.description,
          uploadDate: pdfDetail.uploadDate
        } : null
      };
    });
    
    res.status(200).json({
      message: 'Search completed successfully',
      results: enhancedResults
    });
  } catch (error) {
    console.error('Error searching PDFs:', error);
    res.status(500).json({
      message: 'Failed to search PDFs',
      error: error.message
    });
  }
}

/**
 * Get index status for all PDFs
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function getIndexStatus(req, res) {
  try {
    const pdfs = await PDFDocument.find().select('_id originalName vectorized vectorizedAt chunkCount');
    
    res.status(200).json({
      message: 'Retrieved indexing status',
      pdfs
    });
  } catch (error) {
    console.error('Error getting index status:', error);
    res.status(500).json({
      message: 'Failed to get index status',
      error: error.message
    });
  }
} 