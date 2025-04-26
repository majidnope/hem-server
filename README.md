# PDF Search API with AI

This application provides an API for uploading, indexing, and searching PDF documents using AI-powered vector embeddings.

## Features

- Upload PDF documents (with automatic vector indexing)
- Extract text from PDFs
- Index PDF contents using all-MiniLM-L6-v2 embeddings
- Store embeddings in Qdrant vector database
- Semantic search across indexed PDFs

## Requirements

- Node.js (v16+)
- MongoDB
- Docker (for running Qdrant)

## Installation

1. Clone the repository
2. Install dependencies:
   ```
   yarn install
   ```
3. Create a `.env` file with the following content:
   ```
   # MongoDB Connection
   MONGODB_URI=mongodb://localhost:27017/pdf_search

   # Qdrant Vector Database
   QDRANT_URL=http://localhost:6333

   # Server Port
   PORT=3000
   ```

## Troubleshooting

If you encounter module resolution errors, make sure all dependencies are properly installed:

```bash
yarn add @xenova/transformers @qdrant/js-client-rest pdfjs-dist
```

The application uses `@xenova/transformers` which is a JavaScript-only implementation of Hugging Face's transformers library, making it compatible with Node.js without Python dependencies.

## Running Qdrant with Docker

Run Qdrant vector database using Docker:

```bash
docker run -d --name qdrant \
    -p 6333:6333 \
    -p 6334:6334 \
    -v qdrant_storage:/qdrant/storage \
    qdrant/qdrant
```

To check if Qdrant is running properly:
```bash
curl http://localhost:6333/collections
```

## Starting the Application

Development mode:
```
yarn dev
```

Production mode:
```
yarn start
```

## API Endpoints

### PDF Management

- `POST /api/pdfs/upload` - Upload a PDF file (automatically indexed for search)
- `GET /api/pdfs` - List all uploaded PDFs
- `GET /api/pdfs/:id` - Get PDF details by ID
- `GET /api/pdfs/:id/index-status` - Check indexing status for a specific PDF

### PDF Search

- `POST /api/search/index/:pdfId` - Manually re-index a PDF for search
- `GET /api/search/query?query=your_search_term` - Search across indexed PDFs
- `GET /api/search/status` - Get indexing status for all PDFs

## Example Usage

1. Upload a PDF (automatic indexing begins):
   ```
   curl -X POST -F "pdf=@/path/to/your/file.pdf" -F "description=My PDF document" http://localhost:3000/api/pdfs/upload
   ```

2. Check indexing status:
   ```
   curl http://localhost:3000/api/pdfs/your_pdf_id/index-status
   ```

3. Search across PDFs:
   ```
   curl "http://localhost:3000/api/search/query?query=your%20search%20query&limit=5"
   ```

## How It Works

1. PDFs are uploaded and stored on the server
2. Indexing process automatically begins in the background:
   - PDF text is extracted and split into chunks
   - Each chunk is embedded using the all-MiniLM-L6-v2 model from @xenova/transformers
   - Embeddings are stored in Qdrant vector database
3. When a search query is submitted:
   - Query is embedded using the same model
   - Qdrant finds the most similar text chunks using cosine similarity
   - Results are returned with the matching text and metadata

## Technologies Used

- Express.js - Web framework
- Mongoose - MongoDB object modeling
- PDF.js - PDF text extraction
- @xenova/transformers - Text embeddings (all-MiniLM-L6-v2)
- Qdrant - Vector database for similarity search
- Docker - Container platform for running Qdrant 