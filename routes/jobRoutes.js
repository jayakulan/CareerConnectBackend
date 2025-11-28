import express from 'express';
import { getJobs, getJobById, createJob, applyJob, getMyJobs } from '../controllers/jobController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../utils/cloudinary.js';

const router = express.Router();

router.route('/')
    .get(getJobs)
    .post(protect, createJob);

router.route('/myjobs')
    .get(protect, getMyJobs);

router.route('/:id')
    .get(getJobById);

router.route('/:id/apply')
    .post(protect, upload.single('resume'), applyJob);

export default router;
