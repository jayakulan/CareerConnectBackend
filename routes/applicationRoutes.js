import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../utils/cloudinary.js';
import {
    applyForJob,
    getSeekerApplications,
    getCompanyApplications,
    getApplicationById,
    updateApplicationStatus,
    deleteApplication,
    downloadResume,
    respondToInterview
} from '../controllers/applicationController.js';

const router = express.Router();

// Seeker routes
router.post('/apply/:jobId', protect, upload.single('resume'), applyForJob);
router.get('/seeker', protect, getSeekerApplications);
router.delete('/:id', protect, deleteApplication);
router.put('/:id/interview-response', protect, respondToInterview);

// Company routes
router.get('/company', protect, getCompanyApplications);
router.put('/:id/status', protect, updateApplicationStatus);

// Shared routes
router.get('/:id', protect, getApplicationById);
router.get('/:id/resume', protect, downloadResume);

export default router;
