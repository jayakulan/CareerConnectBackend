// aiController.js
import OpenAI from "openai";
import { getResumeAnalysisContext, formatContext } from "../services/retrieval.js";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Extract potential job role from job description
 */
function extractJobRole(jobDescription) {
    const roleKeywords = {
        'software': ['software engineer', 'developer', 'programmer', 'software development'],
        'data': ['data scientist', 'data analyst', 'data engineer', 'machine learning'],
        'product': ['product manager', 'product owner', 'product management'],
        'design': ['designer', 'ui/ux', 'user experience', 'user interface'],
        'marketing': ['marketing', 'digital marketing', 'content marketing', 'seo'],
        'sales': ['sales', 'business development', 'account manager'],
        'devops': ['devops', 'site reliability', 'infrastructure', 'cloud engineer'],
        'security': ['security', 'cybersecurity', 'information security'],
        'project': ['project manager', 'scrum master', 'agile coach'],
        'business': ['business analyst', 'consultant', 'strategy']
    };

    const lowerDesc = jobDescription.toLowerCase();

    for (const [role, keywords] of Object.entries(roleKeywords)) {
        if (keywords.some(keyword => lowerDesc.includes(keyword))) {
            return role;
        }
    }

    return null;
}

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
                console.log("Extracting text from PDF...");

                // Use createRequire to load pdf-parse to avoid ESM "module.parent" issues
                // which cause the library to think it's running in test mode
                const { createRequire } = await import("module");
                const require = createRequire(import.meta.url);
                const pdfParse = require("pdf-parse");

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

        // Extract job role for targeted context retrieval
        const jobRole = extractJobRole(jobDescription);
        console.log(`Detected job role: ${jobRole || 'general'}`);

        // Enhanced RAG: Get relevant context from knowledge base
        let ragContext = {
            general: "",
            roleSpecific: "",
            career: "",
            allMatches: []
        };

        try {
            console.log("Retrieving relevant context from knowledge base...");

            // Combine resume and job description for better context matching
            const queryText = `${resumeText.substring(0, 500)} ${jobDescription.substring(0, 500)}`;

            ragContext = await getResumeAnalysisContext(queryText, jobRole);

            console.log(`✓ Retrieved context:`);
            console.log(`  - General best practices: ${ragContext.general ? 'Yes' : 'No'}`);
            console.log(`  - Role-specific guidance: ${ragContext.roleSpecific ? 'Yes' : 'No'}`);
            console.log(`  - Career advice: ${ragContext.career ? 'Yes' : 'No'}`);
            console.log(`  - Total matches: ${ragContext.allMatches.length}`);

        } catch (e) {
            console.warn("RAG context retrieval failed (continuing without context):", e.message);
        }

        // Build comprehensive context for the LLM
        const contextSections = [];

        if (ragContext.general) {
            contextSections.push(`=== RESUME BEST PRACTICES ===\n${ragContext.general}`);
        }

        if (ragContext.roleSpecific) {
            contextSections.push(`=== ROLE-SPECIFIC GUIDANCE ===\n${ragContext.roleSpecific}`);
        }

        if (ragContext.career) {
            contextSections.push(`=== CAREER ADVICE ===\n${ragContext.career}`);
        }

        const fullContext = contextSections.join("\n\n");

        // Prepare enhanced prompt for OpenAI with RAG context
        const prompt = `You are an expert Resume Analyzer with access to comprehensive career guidance knowledge.

${fullContext ? `KNOWLEDGE BASE CONTEXT:\n${fullContext}\n\n` : ''}RESUME TO ANALYZE:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

TASK:
Analyze how well the resume matches the job description. Use the knowledge base context above to provide expert guidance.

Evaluate the following:
1. Match Score (0-100): Overall alignment between resume and job requirements
2. Strengths: Specific qualifications, skills, or experiences that match well
3. Weaknesses: Areas where the resume falls short or could be improved
4. Missing Keywords: Important skills or qualifications from the job description not found in resume
5. Verdict: Overall assessment and recommendation

Return ONLY valid JSON with this exact structure:
{
  "match_score": <number 0-100>,
  "strengths": [<array of specific strengths>],
  "weaknesses": [<array of specific weaknesses>],
  "missing_keywords": [<array of missing skills/keywords>],
  "verdict": "<detailed assessment and recommendation>"
}`;

        // Call OpenAI with fallback
        const callOpenAI = async (modelName) => {
            const completion = await openai.chat.completions.create({
                model: modelName,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.3, // Slightly higher for more nuanced analysis
                max_tokens: 2000,
            });
            return completion.choices[0].message.content;
        };

        let aiResponse;

        try {
            console.log("Calling OpenAI GPT-4o...");
            aiResponse = await callOpenAI("gpt-4o");
        } catch (err) {
            console.log("GPT-4o failed. Falling back to GPT-3.5:", err.message);
            aiResponse = await callOpenAI("gpt-3.5-turbo");
        }

        // Clean and parse JSON from AI
        let analysisJson;
        try {
            const cleanJson = aiResponse.replace(/```json|```/g, "").trim();
            analysisJson = JSON.parse(cleanJson);
        } catch (e) {
            console.error("Failed to parse AI response JSON:", e);
            return res.status(500).json({
                message: "Failed to parse AI response",
                error: e.message,
                rawResponse: aiResponse
            });
        }

        // Add metadata about RAG usage
        const response = {
            analysis: analysisJson,
            metadata: {
                ragEnabled: ragContext.allMatches.length > 0,
                contextSources: ragContext.allMatches.length,
                jobRole: jobRole || 'general',
                timestamp: new Date().toISOString()
            }
        };

        console.log("✓ Analysis completed successfully");
        res.json(response);

    } catch (err) {
        console.error("AI Controller Error:", err);
        res.status(500).json({
            message: "Internal Server Error",
            error: err.message,
        });
    }
};

