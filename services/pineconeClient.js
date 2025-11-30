import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config();

let pinecone;

export const initPinecone = async () => {
    if (!process.env.PINECONE_API_KEY) {
        console.warn("Pinecone API Key missing! Skipping Pinecone initialization.");
        return;
    }
    try {
        pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });
        console.log("Pinecone initialized successfully");
        return pinecone;
    } catch (error) {
        console.error("Error initializing Pinecone:", error);
    }
};

export const getPineconeClient = () => {
    if (!pinecone) {
        console.warn("Pinecone not initialized - returning null");
        return null;
    }
    return pinecone;
};
