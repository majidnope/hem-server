import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import { initializeVectorDB } from './controllers/pdfSearchController.js';

import indexRouter from './routes/index.js';
import pdfsRouter from './routes/pdfs.js';
import searchRouter from './routes/search.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize vector database
initializeVectorDB();

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(path.dirname(new URL(import.meta.url).pathname), 'public')));

app.use('/', indexRouter);
app.use('/api/pdfs', pdfsRouter);
app.use('/api/search', searchRouter);

// Error handling middleware for multer errors
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File size too large. Max 10MB allowed.' });
  }
  if (err.message === 'Only PDF files are allowed!') {
    return res.status(400).json({ message: err.message });
  }
  console.error(err);
  res.status(500).json({ message: 'Server error', error: err.message });
});

export default app;
