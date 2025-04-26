import mongoose from 'mongoose';

const PDFDocumentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ""
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  vectorized: {
    type: Boolean,
    default: false
  },
  vectorizedAt: {
    type: Date,
    default: null
  },
  chunkCount: {
    type: Number,
    default: 0
  }
});

export default mongoose.model('PDFDocument', PDFDocumentSchema); 