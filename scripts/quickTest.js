// scripts/quickTest.js
// Quick test to verify RAG setup is working

import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

dotenv.config();

async function quickTest() {
    console.log('=== Quick RAG Setup Test ===\n');

    // Test 1: Environment Variables
    console.log('1. Checking environment variables...');
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasPinecone = !!process.env.PINECONE_API_KEY;

    console.log(`   OpenAI API Key: ${hasOpenAI ? '✅ Found' : '❌ Missing'}`);
    console.log(`   Pinecone API Key: ${hasPinecone ? '✅ Found' : '❌ Missing'}`);

    if (!hasOpenAI || !hasPinecone) {
        console.log('\n❌ Missing API keys. Check your .env file.');
        process.exit(1);
    }

    // Test 2: Pinecone Connection
    console.log('\n2. Testing Pinecone connection...');
    try {
        const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        const indexes = await pinecone.listIndexes();
        console.log(`   ✅ Connected to Pinecone`);
        console.log(`   Found ${indexes.indexes?.length || 0} index(es)`);

        const hasCareerConnect = indexes.indexes?.some(idx => idx.name === 'careerconnect');
        if (hasCareerConnect) {
            console.log('   ✅ Index "careerconnect" exists');

            // Get stats
            const index = pinecone.index('careerconnect');
            const stats = await index.describeIndexStats();
            console.log(`   Record count: ${stats.totalRecordCount || 0}`);

            if (stats.totalRecordCount === 0) {
                console.log('   ⚠️  Index is empty - run: npm run ingest');
            } else {
                console.log('   ✅ Index is populated');
            }
        } else {
            console.log('   ❌ Index "careerconnect" not found');
        }
    } catch (error) {
        console.log(`   ❌ Pinecone error: ${error.message}`);
    }

    // Test 3: OpenAI Connection
    console.log('\n3. Testing OpenAI connection...');
    try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: 'test',
        });
        console.log(`   ✅ OpenAI API working`);
        console.log(`   Embedding dimension: ${response.data[0].embedding.length}`);
    } catch (error) {
        console.log(`   ❌ OpenAI error: ${error.message}`);
    }

    // Test 4: Knowledge Base Files
    console.log('\n4. Checking knowledge base files...');
    try {
        const fs = await import('fs');
        const path = await import('path');
        const { fileURLToPath } = await import('url');

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const kbDir = path.join(__dirname, '../data/knowledge_base');

        if (fs.existsSync(kbDir)) {
            const files = fs.readdirSync(kbDir);
            const txtFiles = files.filter(f => f.endsWith('.txt') || f.endsWith('.md'));
            console.log(`   ✅ Knowledge base directory exists`);
            console.log(`   Found ${txtFiles.length} document(s):`);
            txtFiles.forEach(file => {
                const filePath = path.join(kbDir, file);
                const stats = fs.statSync(filePath);
                console.log(`      - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
            });
        } else {
            console.log('   ❌ Knowledge base directory not found');
        }
    } catch (error) {
        console.log(`   ❌ Error checking files: ${error.message}`);
    }

    console.log('\n=== Test Complete ===\n');
    console.log('Next steps:');
    console.log('1. If index is empty, run: npm run ingest');
    console.log('2. Start server: npm run dev');
    console.log('3. Test AI Resume Analyzer in frontend\n');
}

quickTest().catch(console.error);
