// scripts/ingestKnowledgeBase.js
// This script ingests documents from the knowledge base into Pinecone

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import { chunkText } from '../services/chunkText.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

// Configuration
const KNOWLEDGE_BASE_DIR = path.join(__dirname, '../data/knowledge_base');
const INDEX_NAME = 'careerconnect';
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const BATCH_SIZE = 100;
const EMBEDDING_MODEL = 'text-embedding-3-small';

/**
 * Generate embeddings for text using OpenAI
 */
async function generateEmbedding(text) {
    try {
        const response = await openai.embeddings.create({
            model: EMBEDDING_MODEL,
            input: text,
        });
        return response.data[0].embedding;
    } catch (error) {
        console.error('Error generating embedding:', error.message);
        throw error;
    }
}

/**
 * Read all documents from knowledge base directory
 */
function readKnowledgeBaseDocuments() {
    const documents = [];

    if (!fs.existsSync(KNOWLEDGE_BASE_DIR)) {
        console.error(`Knowledge base directory not found: ${KNOWLEDGE_BASE_DIR}`);
        return documents;
    }

    const files = fs.readdirSync(KNOWLEDGE_BASE_DIR);

    for (const file of files) {
        const filePath = path.join(KNOWLEDGE_BASE_DIR, file);
        const stats = fs.statSync(filePath);

        if (stats.isFile() && (file.endsWith('.txt') || file.endsWith('.md'))) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const category = path.basename(file, path.extname(file));

            documents.push({
                filename: file,
                category: category,
                content: content,
                size: stats.size
            });

            console.log(`✓ Loaded: ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
        }
    }

    return documents;
}

/**
 * Process documents into chunks with metadata
 */
function processDocuments(documents) {
    const chunks = [];
    let chunkId = 0;

    for (const doc of documents) {
        const textChunks = chunkText(doc.content, CHUNK_SIZE, CHUNK_OVERLAP);

        for (let i = 0; i < textChunks.length; i++) {
            chunks.push({
                id: `chunk_${chunkId++}`,
                text: textChunks[i],
                metadata: {
                    filename: doc.filename,
                    category: doc.category,
                    chunkIndex: i,
                    totalChunks: textChunks.length,
                    text: textChunks[i] // Store text in metadata for retrieval
                }
            });
        }

        console.log(`✓ Processed: ${doc.filename} into ${textChunks.length} chunks`);
    }

    return chunks;
}

/**
 * Generate embeddings for all chunks
 */
async function generateEmbeddings(chunks) {
    console.log(`\nGenerating embeddings for ${chunks.length} chunks...`);
    const embeddings = [];

    for (let i = 0; i < chunks.length; i++) {
        try {
            const embedding = await generateEmbedding(chunks[i].text);
            embeddings.push({
                id: chunks[i].id,
                values: embedding,
                metadata: chunks[i].metadata
            });

            // Progress indicator
            if ((i + 1) % 10 === 0) {
                console.log(`Progress: ${i + 1}/${chunks.length} embeddings generated`);
            }

            // Rate limiting - wait 100ms between requests
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error(`Error generating embedding for chunk ${chunks[i].id}:`, error.message);
            throw error;
        }
    }

    console.log(`✓ Generated ${embeddings.length} embeddings`);
    return embeddings;
}

/**
 * Upsert embeddings to Pinecone in batches
 */
async function upsertToPinecone(embeddings) {
    console.log(`\nUpserting ${embeddings.length} vectors to Pinecone...`);

    const index = pinecone.index(INDEX_NAME);

    // Upsert in batches
    for (let i = 0; i < embeddings.length; i += BATCH_SIZE) {
        const batch = embeddings.slice(i, i + BATCH_SIZE);

        try {
            await index.upsert(batch);
            console.log(`✓ Upserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(embeddings.length / BATCH_SIZE)}`);
        } catch (error) {
            console.error(`Error upserting batch:`, error.message);
            throw error;
        }

        // Wait between batches to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`✓ Successfully upserted all vectors to Pinecone`);
}

/**
 * Verify Pinecone index stats
 */
async function verifyIndexStats() {
    try {
        const index = pinecone.index(INDEX_NAME);
        const stats = await index.describeIndexStats();

        console.log('\n=== Pinecone Index Statistics ===');
        console.log(`Total vectors: ${stats.totalRecordCount || 0}`);
        console.log(`Dimension: ${stats.dimension || 'N/A'}`);
        console.log(`Index fullness: ${((stats.indexFullness || 0) * 100).toFixed(2)}%`);

        if (stats.namespaces) {
            console.log('Namespaces:', Object.keys(stats.namespaces));
        }

        return stats;
    } catch (error) {
        console.error('Error fetching index stats:', error.message);
        return null;
    }
}

/**
 * Test retrieval with a sample query
 */
async function testRetrieval() {
    console.log('\n=== Testing Retrieval ===');

    const testQuery = "What are the best practices for writing a resume?";
    console.log(`Query: "${testQuery}"`);

    try {
        const queryEmbedding = await generateEmbedding(testQuery);
        const index = pinecone.index(INDEX_NAME);

        const queryResponse = await index.query({
            vector: queryEmbedding,
            topK: 3,
            includeMetadata: true
        });

        console.log(`\nFound ${queryResponse.matches.length} matches:`);
        queryResponse.matches.forEach((match, i) => {
            console.log(`\n${i + 1}. Score: ${match.score.toFixed(4)}`);
            console.log(`   Category: ${match.metadata.category}`);
            console.log(`   Text preview: ${match.metadata.text.substring(0, 100)}...`);
        });

        return queryResponse;
    } catch (error) {
        console.error('Error testing retrieval:', error.message);
        return null;
    }
}

/**
 * Main ingestion function
 */
async function main() {
    console.log('=== CareerConnect Knowledge Base Ingestion ===\n');

    // Validate environment variables
    if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OPENAI_API_KEY not found in environment variables');
        process.exit(1);
    }

    if (!process.env.PINECONE_API_KEY) {
        console.error('❌ PINECONE_API_KEY not found in environment variables');
        process.exit(1);
    }

    try {
        // Step 1: Read documents
        console.log('Step 1: Reading knowledge base documents...');
        const documents = readKnowledgeBaseDocuments();

        if (documents.length === 0) {
            console.error('❌ No documents found in knowledge base');
            process.exit(1);
        }

        console.log(`\n✓ Loaded ${documents.length} documents\n`);

        // Step 2: Process into chunks
        console.log('Step 2: Processing documents into chunks...');
        const chunks = processDocuments(documents);
        console.log(`\n✓ Created ${chunks.length} chunks\n`);

        // Step 3: Generate embeddings
        console.log('Step 3: Generating embeddings...');
        const embeddings = await generateEmbeddings(chunks);

        // Step 4: Upsert to Pinecone
        console.log('\nStep 4: Upserting to Pinecone...');
        await upsertToPinecone(embeddings);

        // Step 5: Verify
        console.log('\nStep 5: Verifying ingestion...');
        await verifyIndexStats();

        // Step 6: Test retrieval
        await testRetrieval();

        console.log('\n✅ Knowledge base ingestion completed successfully!');

    } catch (error) {
        console.error('\n❌ Ingestion failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { main as ingestKnowledgeBase };
