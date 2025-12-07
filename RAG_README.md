# RAG (Retrieval-Augmented Generation) Architecture

## Overview

CareerConnect now implements a **fully functional RAG architecture** to enhance the AI Resume Analyzer with expert career guidance knowledge. The system retrieves relevant context from a curated knowledge base to provide more accurate and insightful resume analysis.

## Architecture Components

### 1. Knowledge Base (`data/knowledge_base/`)

The knowledge base contains curated documents covering:

- **resume_best_practices.txt**: Comprehensive resume writing guidelines, formatting tips, ATS optimization, and industry-specific advice
- **technical_skills_keywords.txt**: Role-specific technical skills, tools, frameworks, and keywords for various job categories
- **interview_career_advice.txt**: Interview preparation, salary negotiation, career development, and job search strategies

### 2. Data Ingestion Pipeline (`scripts/ingestKnowledgeBase.js`)

The ingestion script processes knowledge base documents through the following steps:

1. **Document Loading**: Reads all `.txt` and `.md` files from the knowledge base directory
2. **Text Chunking**: Splits documents into overlapping chunks (1000 chars with 200 char overlap)
3. **Embedding Generation**: Creates vector embeddings using OpenAI's `text-embedding-3-small` model
4. **Batch Upsert**: Uploads embeddings to Pinecone in batches with metadata
5. **Verification**: Validates ingestion and tests retrieval

**Usage:**
```bash
npm run ingest
```

### 3. Enhanced Retrieval Service (`services/retrieval.js`)

The retrieval service provides advanced RAG capabilities:

**Functions:**

- `queryPinecone(queryText, options)`: Query Pinecone with filtering and score thresholds
  - Options: `topK`, `category`, `minScore`
  
- `formatContext(matches)`: Format retrieved chunks for LLM consumption with source attribution

- `getResumeAnalysisContext(queryText, jobRole)`: Get category-specific context
  - Retrieves general resume best practices
  - Fetches role-specific technical guidance
  - Includes career advice
  - Returns structured context object

### 4. AI Controller (`controllers/aiController.js`)

The enhanced AI controller implements the full RAG workflow:

1. **Job Role Detection**: Automatically identifies job category from description
2. **Context Retrieval**: Fetches relevant knowledge from multiple categories
3. **Prompt Enhancement**: Injects retrieved context into LLM prompt
4. **Analysis Generation**: Uses GPT-4o (with GPT-3.5 fallback) for analysis
5. **Metadata Tracking**: Returns RAG usage statistics

## RAG Workflow

```
User Input (Resume + Job Description)
    ↓
Job Role Detection (software, data, marketing, etc.)
    ↓
Multi-Category Context Retrieval:
  - General Resume Best Practices (3 chunks)
  - Role-Specific Technical Skills (2 chunks)
  - Career & Interview Advice (2 chunks)
    ↓
Context Filtering (score >= 0.65)
    ↓
Prompt Construction with Retrieved Context
    ↓
LLM Analysis (GPT-4o)
    ↓
Structured JSON Response + RAG Metadata
```

## Configuration

### Environment Variables

Required in `.env`:
```
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
```

### Pinecone Index

- **Index Name**: `careerconnect`
- **Dimension**: 1536 (text-embedding-3-small)
- **Metric**: Cosine similarity
- **Cloud**: AWS (recommended)

## Knowledge Base Management

### Adding New Documents

1. Create a new `.txt` or `.md` file in `data/knowledge_base/`
2. Use a descriptive filename (becomes the category)
3. Structure content with clear sections and headers
4. Run ingestion: `npm run ingest`

### Document Format

```
SECTION TITLE

=== SUBSECTION ===

Content with clear structure...

Key points:
- Point 1
- Point 2
- Point 3

Examples:
- Example 1
- Example 2
```

### Best Practices

- Use clear, descriptive section headers
- Include specific examples and data
- Maintain consistent formatting
- Keep chunks focused on single topics
- Update regularly with industry trends

## Retrieval Configuration

### Score Thresholds

- **Default**: 0.7 (high relevance)
- **Resume Analysis**: 0.65 (balanced)
- **Adjust based on**: precision vs. recall needs

### Top-K Values

- **General queries**: 3-5 chunks
- **Role-specific**: 2-3 chunks
- **Total context**: 7-10 chunks max

### Categories

Current categories:
- `resume_best_practices`
- `technical_skills_keywords`
- `interview_career_advice`

## Monitoring and Debugging

### Ingestion Logs

The ingestion script provides detailed logging:
- Document loading progress
- Chunk creation statistics
- Embedding generation progress
- Upsert batch status
- Index statistics
- Test retrieval results

### Runtime Logs

The AI controller logs:
- Detected job role
- Context retrieval status
- Number of matches per category
- RAG enabled/disabled status
- Total context sources

### Response Metadata

Each analysis includes metadata:
```json
{
  "analysis": { ... },
  "metadata": {
    "ragEnabled": true,
    "contextSources": 7,
    "jobRole": "software",
    "timestamp": "2025-12-06T14:54:56.000Z"
  }
}
```

## Performance Optimization

### Embedding Generation

- Rate limiting: 100ms between requests
- Batch processing for large datasets
- Caching for repeated queries (future enhancement)

### Pinecone Queries

- Fetch 2x topK for filtering
- Apply score threshold post-retrieval
- Use metadata filters for category-specific queries

### Context Management

- Limit total context to prevent token overflow
- Prioritize by relevance score
- Format with clear source attribution

## Troubleshooting

### Common Issues

**Issue**: No context retrieved
- **Check**: Pinecone index populated (`npm run ingest`)
- **Check**: API keys configured correctly
- **Check**: Index name matches configuration

**Issue**: Low relevance scores
- **Solution**: Lower `minScore` threshold
- **Solution**: Improve query text quality
- **Solution**: Add more diverse knowledge base content

**Issue**: Embedding generation fails
- **Check**: OpenAI API key valid
- **Check**: Rate limits not exceeded
- **Check**: Network connectivity

**Issue**: Pinecone upsert fails
- **Check**: Pinecone API key valid
- **Check**: Index exists and is ready
- **Check**: Dimension matches (1536)

## Future Enhancements

### Planned Features

1. **Hybrid Search**: Combine semantic and keyword search
2. **Re-ranking**: Use cross-encoder for better relevance
3. **Query Expansion**: Enhance queries with synonyms
4. **Caching Layer**: Redis cache for frequent queries
5. **Analytics Dashboard**: Track RAG performance metrics
6. **Dynamic Updates**: Real-time knowledge base updates
7. **Multi-language Support**: Embeddings for multiple languages
8. **User Feedback Loop**: Improve retrieval based on user ratings

### Knowledge Base Expansion

- Industry-specific resume templates
- Company culture guides
- Salary benchmarking data
- Skill trend analysis
- Interview question banks
- Career path recommendations

## API Endpoints

### Analyze Resume (with RAG)

**POST** `/api/ai/analyze`

**Request:**
```javascript
FormData {
  resumeFile: File (PDF) OR resumeText: String,
  jobDescription: String
}
```

**Response:**
```json
{
  "analysis": {
    "match_score": 85,
    "strengths": ["..."],
    "weaknesses": ["..."],
    "missing_keywords": ["..."],
    "verdict": "..."
  },
  "metadata": {
    "ragEnabled": true,
    "contextSources": 7,
    "jobRole": "software",
    "timestamp": "2025-12-06T14:54:56.000Z"
  }
}
```

## Testing

### Test Ingestion

```bash
npm run ingest
```

Expected output:
- ✓ Documents loaded
- ✓ Chunks created
- ✓ Embeddings generated
- ✓ Vectors upserted
- ✓ Test retrieval successful

### Test Analysis

Use the AI Resume Analyzer frontend:
1. Upload a resume or paste text
2. Provide a job description
3. Click "Analyze with AI"
4. Check browser console for RAG metadata
5. Verify context sources > 0

## Maintenance

### Regular Tasks

- **Weekly**: Review retrieval logs for quality
- **Monthly**: Update knowledge base with new trends
- **Quarterly**: Re-ingest entire knowledge base
- **Yearly**: Audit and refresh all content

### Monitoring Metrics

- Average relevance scores
- Context sources per query
- RAG enabled percentage
- User satisfaction ratings
- Analysis quality feedback

## Resources

- [Pinecone Documentation](https://docs.pinecone.io/)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [RAG Best Practices](https://www.pinecone.io/learn/retrieval-augmented-generation/)

## Support

For issues or questions:
1. Check troubleshooting section
2. Review logs for error messages
3. Verify configuration and API keys
4. Test with sample data

---

**Status**: ✅ Fully Implemented
**Version**: 1.0.0
**Last Updated**: 2025-12-06
