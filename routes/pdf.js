import express from 'express';
import dotenv from 'dotenv';
import PdfService from '../services/pdfService.js';

dotenv.config();

const router = express.Router();
const pdfService = new PdfService(process.env.OPENAI_API_KEY);

// Index PDFs route
router.post('/index', async (req, res) => {
  try {
    await pdfService.processAndIndex();
    res.json({ success: true, message: 'PDFs indexed successfully' });
  } catch (error) {
    console.error('Error indexing PDFs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search PDFs route
router.post('/search', async (req, res) => {
  try {
    const { query, limit = 5 } = req.body;
    
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }
    
    const results = await pdfService.searchPdfs(query, limit);
    res.json({ success: true, results });
  } catch (error) {
    console.error('Error searching PDFs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router; 