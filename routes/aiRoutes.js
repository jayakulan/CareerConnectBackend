import express from 'express';
import multer from 'multer';
import { analyzeResume } from '../controllers/aiController.js';

const router = express.Router();

// Configure Multer (Memory Storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/analyze', upload.single('resumeFile'), analyzeResume);

export default router;
