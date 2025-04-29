# PDF Semantic Search

A Node.js application for performing semantic search on PDF documents. This application extracts text from PDFs, creates vector embeddings, and allows users to search for content semantically across multiple documents.

## Features

- Extract text from PDF documents
- Process and chunk text for optimal semantic search
- Create vector embeddings using OpenAI's text embeddings
- Search PDFs semantically based on natural language queries
- Simple web interface for searching and indexing
- Returns source information (which PDF a match was found in)

## Prerequisites

- Node.js (v14+)
- An OpenAI API key

## Installation

1. Clone the repository
2. Install dependencies:

```bash
yarn install
```

3. Create a `.env` file in the project root with your OpenAI API key:

```
OPENAI_API_KEY=your_openai_api_key_here
```

## Usage

1. Place your PDF files in the `pdf` directory.

2. Start the development server:

```bash
yarn dev
```

3. Open your browser and navigate to `http://localhost:3000`

4. Click the "Index PDFs" button to extract text and create embeddings.

5. Enter a search query in the search box and click "Search" to find relevant content in your PDFs.

## API Endpoints

- **POST /api/pdf/index**: Index all PDFs in the `pdf` directory
- **POST /api/pdf/search**: Search indexed PDFs with a query
  - Request body: `{ "query": "your search query", "limit": 5 }`
  - Response: `{ "success": true, "results": [...] }`

## How It Works

1. **PDF Text Extraction**: The application reads PDF files and extracts their text content.
2. **Text Processing**: The extracted text is split into manageable chunks with overlapping content to maintain context.
3. **Vector Embedding**: Each chunk is converted into a vector embedding using OpenAI's text-embedding model.
4. **Vector Store**: The embeddings are stored in a local vector database using HNSWLib.
5. **Semantic Search**: User queries are converted to embeddings and compared against the document embeddings to find the most semantically similar content.

## Technologies Used

- Express.js: Web framework
- pdf-parse: PDF text extraction
- LangChain.js: Vector embeddings and text processing
- HNSWLib: Efficient vector storage and similarity search
- OpenAI API: Text embeddings

## Project Structure

- `/pdf`: Directory for PDF files
- `/services`: Service layer for PDF processing and search
- `/routes`: API endpoints
- `/public`: Static files and frontend interface
- `/vectorstore`: Generated vector database (created after indexing) 