// scripts/checkPineconeStatus.js
// Utility script to check Pinecone index status and stats

import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

dotenv.config();

const INDEX_NAME = 'careerconnect';

async function checkPineconeStatus() {
    console.log('=== Pinecone Index Status Check ===\n');

    // Validate environment variables
    if (!process.env.PINECONE_API_KEY) {
        console.error('❌ PINECONE_API_KEY not found in environment variables');
        process.exit(1);
    }

    try {
        // Initialize Pinecone
        const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        console.log('✓ Pinecone client initialized\n');

        // List all indexes
        console.log('Available Indexes:');
        const indexes = await pinecone.listIndexes();

        if (indexes.indexes && indexes.indexes.length > 0) {
            indexes.indexes.forEach((idx, i) => {
                console.log(`  ${i + 1}. ${idx.name} (${idx.dimension} dimensions, ${idx.metric} metric)`);
            });
        } else {
            console.log('  No indexes found');
        }
        console.log('');

        // Check if our index exists
        const indexExists = indexes.indexes?.some(idx => idx.name === INDEX_NAME);

        if (!indexExists) {
            console.error(`❌ Index "${INDEX_NAME}" not found!`);
            console.log('\nTo create the index:');
            console.log('1. Go to https://app.pinecone.io/');
            console.log('2. Click "Create Index"');
            console.log(`3. Name: ${INDEX_NAME}`);
            console.log('4. Dimensions: 1536');
            console.log('5. Metric: cosine');
            process.exit(1);
        }

        console.log(`✓ Index "${INDEX_NAME}" exists\n`);

        // Get index stats
        const index = pinecone.index(INDEX_NAME);
        const stats = await index.describeIndexStats();

        console.log('=== Index Statistics ===');
        console.log(`Total vectors: ${stats.totalRecordCount || 0}`);
        console.log(`Dimension: ${stats.dimension || 'N/A'}`);
        console.log(`Index fullness: ${((stats.indexFullness || 0) * 100).toFixed(2)}%`);

        if (stats.namespaces) {
            console.log('\nNamespaces:');
            Object.entries(stats.namespaces).forEach(([name, data]) => {
                console.log(`  - ${name || 'default'}: ${data.recordCount || 0} vectors`);
            });
        }

        // Check if index is populated
        if (stats.totalRecordCount === 0) {
            console.log('\n⚠️  Index is empty! Run ingestion to populate:');
            console.log('   npm run ingest');
        } else {
            console.log(`\n✅ Index is populated with ${stats.totalRecordCount} vectors`);
        }

        // Test query if index has data
        if (stats.totalRecordCount > 0 && process.env.OPENAI_API_KEY) {
            console.log('\n=== Testing Query ===');

            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const testQuery = "resume best practices";

            console.log(`Query: "${testQuery}"`);

            // Generate embedding
            const response = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: testQuery,
            });
            const queryEmbedding = response.data[0].embedding;

            // Query Pinecone
            const queryResponse = await index.query({
                vector: queryEmbedding,
                topK: 3,
                includeMetadata: true
            });

            console.log(`\nFound ${queryResponse.matches.length} matches:`);
            queryResponse.matches.forEach((match, i) => {
                console.log(`\n${i + 1}. Score: ${match.score.toFixed(4)}`);
                console.log(`   ID: ${match.id}`);
                if (match.metadata) {
                    console.log(`   Category: ${match.metadata.category || 'N/A'}`);
                    console.log(`   Filename: ${match.metadata.filename || 'N/A'}`);
                    if (match.metadata.text) {
                        console.log(`   Preview: ${match.metadata.text.substring(0, 100)}...`);
                    }
                }
            });

            console.log('\n✅ Query test successful!');
        }

        console.log('\n=== Status Check Complete ===');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    checkPineconeStatus();
}

export { checkPineconeStatus };
