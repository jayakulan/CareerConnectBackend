import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const analyzeCV = async (cvText, jobDescription) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
      You are an expert HR AI. Analyze the following CV against the Job Description.
      
      Job Description:
      ${jobDescription}
      
      CV Content:
      ${cvText}
      
      Provide a JSON response with the following structure:
      {
        "matchPercentage": Number (0-100),
        "strengths": [String],
        "weaknesses": [String],
        "recommendation": String (Hire/Interview/Reject),
        "summary": String
      }
      Do not include markdown formatting like \`\`\`json. Just return the raw JSON string.
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up if there are markdown code blocks
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(cleanText);
    } catch (error) {
        console.error("AI Analysis Error:", error);
        throw new Error("Failed to analyze CV");
    }
};
