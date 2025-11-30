import { getPineconeClient } from "./pineconeClient.js";
import { getEmbeddings } from "./embedding.js";

export const queryPinecone = async (queryText, topK = 5) => {
    try {
        const pinecone = getPineconeClient();

        if (!pinecone) {
            console.log("Pinecone not available - skipping retrieval");
            return [];
        }

        // Ensure the index name matches your Pinecone index
        const indexName = "careerconnect";
        const index = pinecone.index(indexName);

        const vector = await getEmbeddings(queryText);

        const queryResponse = await index.query({
            vector,
            topK,
            includeMetadata: true,
        });

        return queryResponse.matches;
    } catch (error) {
        console.error("Error querying Pinecone:", error);
        return [];
    }
};
