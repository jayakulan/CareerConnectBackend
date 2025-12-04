import express from 'express';
import { getJobs, getJobById, createJob, applyJob, getMyJobs, updateJob, deleteJob, toggleSaveJob, getSavedJobs } from '../controllers/jobController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../utils/cloudinary.js';

const router = express.Router();

router.route('/')
    .get(getJobs)
    .post(protect, createJob);

router.route('/myjobs')
    .get(protect, getMyJobs);

router.route('/saved')
    .get(protect, getSavedJobs);

router.route('/:id')
    .get(getJobById)
    .put(protect, updateJob)
    .delete(protect, deleteJob);

router.route('/:id/save')
    .post(protect, toggleSaveJob);

router.route('/:id/apply')
    .post(protect, upload.single('resume'), applyJob);

export default router;
