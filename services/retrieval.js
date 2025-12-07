import { getPineconeClient } from "./pineconeClient.js";
import { getEmbeddings } from "./embedding.js";

/**
 * Query Pinecone for relevant context with advanced filtering and ranking
 * @param {string} queryText - The text to search for
 * @param {Object} options - Query options
 * @param {number} options.topK - Number of results to return (default: 5)
 * @param {string} options.category - Filter by category (optional)
 * @param {number} options.minScore - Minimum similarity score threshold (default: 0.7)
 * @returns {Promise<Array>} Array of matching results
 */
export const queryPinecone = async (queryText, options = {}) => {
    const {
        topK = 5,
        category = null,
        minScore = 0.7
    } = options;

    try {
        const pinecone = getPineconeClient();

        if (!pinecone) {
            console.warn("Pinecone not available - skipping retrieval");
            return [];
        }

        // Ensure the index name matches your Pinecone index
        const indexName = "careerconnect";
        const index = pinecone.index(indexName);

        // Generate embedding for query
        const vector = await getEmbeddings(queryText);

        // Build query parameters
        const queryParams = {
            vector,
            topK: topK * 2, // Fetch more results for filtering
            includeMetadata: true,
        };

        // Add category filter if specified
        if (category) {
            queryParams.filter = { category: { $eq: category } };
        }

        // Execute query
        const queryResponse = await index.query(queryParams);

        // Filter by minimum score and limit results
        const filteredMatches = queryResponse.matches
            .filter(match => match.score >= minScore)
            .slice(0, topK);

        console.log(`✓ Retrieved ${filteredMatches.length} relevant chunks (score >= ${minScore})`);

        return filteredMatches;
    } catch (error) {
        console.error("Error querying Pinecone:", error.message);
        return [];
    }
};

/**
 * Format retrieved context for LLM consumption
 * @param {Array} matches - Array of Pinecone matches
 * @returns {string} Formatted context string
 */
export const formatContext = (matches) => {
    if (!matches || matches.length === 0) {
        return "";
    }

    const contextParts = matches.map((match, index) => {
        const category = match.metadata?.category || "Unknown";
        const text = match.metadata?.text || "";
        const score = match.score ? match.score.toFixed(3) : "N/A";

        return `[Source ${index + 1}: ${category} (Relevance: ${score})]\n${text}`;
    });

    return contextParts.join("\n\n---\n\n");
};

/**
 * Get category-specific context for resume analysis
 * @param {string} queryText - The query text
 * @param {string} jobRole - Job role/category to focus on
 * @returns {Promise<Object>} Object containing general and role-specific context
 */
export const getResumeAnalysisContext = async (queryText, jobRole = null) => {
    try {
        // Get general resume best practices
        const generalContext = await queryPinecone(queryText, {
            topK: 3,
            category: "resume_best_practices",
            minScore: 0.65
        });

        // Get role-specific technical skills if job role is provided
        let roleContext = [];
        if (jobRole) {
            roleContext = await queryPinecone(`${jobRole} skills requirements`, {
                topK: 2,
                category: "technical_skills_keywords",
                minScore: 0.65
            });
        }

        // Get interview and career advice
        const careerContext = await queryPinecone(queryText, {
            topK: 2,
            category: "interview_career_advice",
            minScore: 0.65
        });

        return {
            general: formatContext(generalContext),
            roleSpecific: formatContext(roleContext),
            career: formatContext(careerContext),
            allMatches: [...generalContext, ...roleContext, ...careerContext]
        };
    } catch (error) {
        console.error("Error getting resume analysis context:", error.message);
        return {
            general: "",
            roleSpecific: "",
            career: "",
            allMatches: []
        };
    }
};
