import express from 'express';
import { upload } from '../utils/cloudinary.js';
import { uploadResume, deleteResume } from '../controllers/resumeController.js';

const router = express.Router();

// Upload resume
router.post('/upload', upload.single('resume'), uploadResume);

// Delete resume
router.post('/delete', deleteResume);

export default router;
