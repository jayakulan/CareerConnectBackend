// aiController.js
import OpenAI from "openai";
import * as pdfParseModule from "pdf-parse";
import { queryPinecone } from "../services/retrieval.js";
import dotenv from "dotenv";

dotenv.config();

// Extract the actual function from the module
const pdfParse = pdfParseModule.default || pdfParseModule;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const analyzeResume = async (req, res) => {
    try {
        console.log("=== AI Analyze Request Received ===");
        console.log("Request body keys:", Object.keys(req.body));

        let resumeText = req.body.resumeText || "";
        const jobDescription = req.body.jobDescription || "";

        // Handle PDF file if uploaded
        if (req.file) {
            try {
                console.log("Extracting text from PDF...");
                const pdfData = await pdfParse(req.file.buffer);
                resumeText = pdfData.text;
                console.log("PDF extraction successful, text length:", resumeText.length);
            } catch (err) {
                console.error("PDF parsing error details:", err);
                return res.status(400).json({
                    message: "Unable to extract text from PDF",
                    error: err.message,
                });
            }
        }

        // Ensure we have some resume text
        if (!resumeText.trim()) {
            return res.status(400).json({
                message: "Resume text or PDF must be provided",
            });
        }

        // Optional Pinecone RAG context
        let context = "";
        try {
            const matches = await queryPinecone(resumeText);
            if (matches?.length > 0) {
                context = matches.map(m => m.metadata?.text || "").join("\n");
            }
        } catch (e) {
            console.log("Pinecone RAG skipped:", e.message);
        }

        // Prepare prompt for OpenAI
        const prompt = `
You are an expert Resume Analyzer.

Resume:
${resumeText}

Job Description:
${jobDescription}

Context from Pinecone:
${context}

Return ONLY valid JSON with:
{
  "match_score": number,
  "strengths": [...],
  "weaknesses": [...],
  "missing_keywords": [...],
  "verdict": "string"
}
    `;

        // Call OpenAI safely
        const callOpenAI = async (modelName) => {
            const completion = await openai.chat.completions.create({
                model: modelName,
                messages: [{ role: "user", content: prompt }],
                temperature: 0,
            });
            return completion.choices[0].message.content;
        };

        let aiResponse;

        try {
            aiResponse = await callOpenAI("gpt-4o");
        } catch (err) {
            console.log("GPT-4o failed. Falling back to GPT-3.5:", err.message);
            aiResponse = await callOpenAI("gpt-3.5-turbo");
        }

        // Clean and parse JSON from AI
        let analysisJson;
        try {
            const cleanJson = aiResponse.replace(/```json|```/g, "");
            analysisJson = JSON.parse(cleanJson);
        } catch (e) {
            console.error("Failed to parse AI response JSON:", e);
            return res.status(500).json({
                message: "Failed to parse AI response",
                error: e.message,
            });
        }

        res.json({ analysis: analysisJson });
    } catch (err) {
        console.error("AI Controller Error:", err);
        res.status(500).json({
            message: "Internal Server Error",
            error: err.message,
        });
    }
};
