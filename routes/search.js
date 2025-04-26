import express from 'express';
import { indexPDF, searchInPDFs, getIndexStatus } from '../controllers/pdfSearchController.js';

const router = express.Router();

// Index a PDF for search
router.post('/index/:pdfId', indexPDF);

// Search across all indexed PDFs
router.get('/query', searchInPDFs);

// Get indexing status for all PDFs
router.get('/status', getIndexStatus);

export default router; 