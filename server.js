import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import aiRoutes from "./routes/aiRoutes.js";
import { initPinecone } from "./services/pineconeClient.js";

// Load env vars (forcing restart)
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(express.json({ limit: "10mb" }));
// Manual CORS to handle Vercel serverless quirks
app.use((req, res, next) => {
    const origin = req.headers.origin;
    // Allow all Vercel deployments and localhost
    if (origin && (origin.endsWith('.vercel.app') || origin.includes('localhost'))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-requested-with');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});
app.use(express.urlencoded({ extended: true }));

// Initialize Pinecone
await initPinecone();

// Routes
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Define Routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import resumeRoutes from './routes/resumeRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/contact', contactRoutes);
app.use("/api/ai", aiRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
