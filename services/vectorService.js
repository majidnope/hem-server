import { QdrantClient } from '@qdrant/js-client-rest';
import { pipeline } from '@xenova/transformers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Initialize Qdrant client
const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
const qdrantClient = new QdrantClient({ url: qdrantUrl });

const COLLECTION_NAME = 'pdf_embeddings';
const VECTOR_SIZE = 384; // all-MiniLM-L6-v2 dimension
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

/**
 * Initialize Qdrant collection
 */
export async function initializeQdrant() {
  try {
    // Check if collection exists
    const collections = await qdrantClient.getCollections();
    const collectionExists = collections.collections.some(c => c.name === COLLECTION_NAME);

    if (!collectionExists) {
      // Create collection if it doesn't exist
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine',
        },
      });

      console.log(`Collection ${COLLECTION_NAME} created successfully`);
    } else {
      console.log(`Collection ${COLLECTION_NAME} already exists`);
    }
  } catch (error) {
    console.error('Error initializing Qdrant:', error);
    throw error;
  }
}

// Cache for the model to avoid reloading it for every embedding
let embeddingModel = null;

/**
 * Get the embedding model (loading it only once)
 */
async function getEmbeddingModel() {
  if (!embeddingModel) {
    // Load the embedding pipeline
    embeddingModel = await pipeline('feature-extraction', MODEL_NAME);
  }
  return embeddingModel;
}

/**
 * Generate embedding for text using all-MiniLM-L6-v2
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} - Vector embedding
 */
export async function generateEmbedding(text) {
  try {
    const model = await getEmbeddingModel();
    // Generate embedding
    const result = await model(text, { pooling: 'mean', normalize: true });
    // Convert to array
    return Array.from(result.data);
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Store PDF chunk embeddings in Qdrant
 * @param {string} pdfId - MongoDB ID of the PDF
 * @param {Array<string>} chunks - Text chunks from the PDF
 * @param {string} pdfPath - Path to the PDF file
 * @returns {Promise<void>}
 */
export async function storeEmbeddings(pdfId, chunks, pdfPath) {
  try {
    console.log(`Starting embedding generation for ${chunks.length} chunks...`);
    
    const pointsToUpsert = [];
    
    // Process chunks in batches to avoid memory issues
    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batchChunks = chunks.slice(i, i + batchSize);
      console.log(`Processing batch ${i/batchSize + 1} of ${Math.ceil(chunks.length/batchSize)}`);
      
      const batchPoints = await Promise.all(batchChunks.map(async (chunk, idx) => {
        const embedding = await generateEmbedding(chunk);
        return {
          id: `${pdfId}_${i + idx}`,
          vector: embedding,
          payload: {
            pdfId,
            text: chunk,
            chunkIndex: i + idx,
            pdfPath
          }
        };
      }));
      
      pointsToUpsert.push(...batchPoints);
    }

    console.log(`Generated embeddings for ${pointsToUpsert.length} chunks, now storing in Qdrant...`);
    
    await qdrantClient.upsert(COLLECTION_NAME, {
      wait: true,
      points: pointsToUpsert
    });

    console.log(`Stored ${pointsToUpsert.length} embeddings for PDF ${pdfId}`);
  } catch (error) {
    console.error('Error storing embeddings:', error);
    throw error;
  }
}

/**
 * Search for similar text in PDFs
 * @param {string} query - Search query
 * @param {number} limit - Max number of results to return
 * @returns {Promise<Array>} - Search results
 */
export async function searchPDFs(query, limit = 5) {
  try {
    const queryEmbedding = await generateEmbedding(query);
    
    const searchResults = await qdrantClient.search(COLLECTION_NAME, {
      vector: queryEmbedding,
      limit,
      with_payload: true
    });

    return searchResults.map(result => ({
      pdfId: result.payload.pdfId,
      text: result.payload.text,
      score: result.score,
      pdfPath: result.payload.pdfPath
    }));
  } catch (error) {
    console.error('Error searching PDFs:', error);
    throw error;
  }
} 