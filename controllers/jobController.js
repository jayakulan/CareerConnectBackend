import Job from '../models/Job.js';
import User from '../models/User.js';
import { analyzeCV } from '../utils/aiService.js';
// import { cloudinary } from '../utils/cloudinary.js'; // If needed for direct access

// @desc    Get all jobs
// @route   GET /api/jobs
// @access  Public
const getJobs = async (req, res) => {
    try {
        const keyword = req.query.keyword
            ? {
                $or: [
                    { title: { $regex: req.query.keyword, $options: 'i' } },
                    { description: { $regex: req.query.keyword, $options: 'i' } },
                    { skills: { $regex: req.query.keyword, $options: 'i' } },
                ],
            }
            : {};

        const jobs = await Job.find({ ...keyword, status: 'published' })
            .populate('company', 'name logo location')
            .sort({ createdAt: -1 });

        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get job by ID
// @route   GET /api/jobs/:id
// @access  Public
const getJobById = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id).populate('company', 'name logo description website');

        if (job) {
            res.json(job);
        } else {
            res.status(404).json({ message: 'Job not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a job
// @route   POST /api/jobs
// @access  Private/Company
const createJob = async (req, res) => {
    try {
        const {
            title,
            description,
            jobType,
            location,
            remote,
            salary,
            skills,
            experience,
            education,
        } = req.body;

        // Ensure user is a company
        if (req.user.role !== 'company') {
            return res.status(403).json({ message: 'Only companies can post jobs' });
        }

        // Check if user has a company profile
        // For now assume user.profile is the company profile ID or we find it
        // In User model: profile: { type: ObjectId, refPath: 'profileModel' }

        if (!req.user.profile) {
            return res.status(400).json({ message: 'Please complete your company profile first' });
        }

        const job = new Job({
            title,
            description,
            company: req.user.profile,
            postedBy: req.user._id,
            jobType,
            location,
            remote,
            salary,
            skills,
            experience,
            education,
            status: 'published', // Default to published for now
        });

        const createdJob = await job.save();
        res.status(201).json(createdJob);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Apply for a job
// @route   POST /api/jobs/:id/apply
// @access  Private/Seeker
const applyJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Check if already applied
        const alreadyApplied = job.applications.find(
            (app) => app.user.toString() === req.user._id.toString()
        );

        if (alreadyApplied) {
            return res.status(400).json({ message: 'You have already applied for this job' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a resume' });
        }

        // AI Analysis
        // We need the text content of the resume. 
        // Since we uploaded to Cloudinary as raw/auto, we might not have the text directly.
        // For this demo, I'll assume we can extract text or the user sends text content too?
        // Or we use a dummy text extractor if we can't easily parse PDF/Docx here without another lib.
        // Realistically, we'd use a parser.
        // For now, I'll use a placeholder text or if the user sends 'resumeText' in body.

        const resumeText = req.body.resumeText || "Candidate resume content placeholder";
        // Ideally we parse the file at req.file.path (url) or req.file.buffer if memory storage.
        // Since we used Cloudinary storage, we have the URL.

        const analysis = await analyzeCV(resumeText, job.description);

        const application = {
            user: req.user._id,
            resume: {
                url: req.file.path,
                publicId: req.file.filename,
            },
            coverLetter: req.body.coverLetter,
            matchPercentage: analysis.matchPercentage,
            missingSkills: analysis.weaknesses, // Mapping weaknesses to missing skills
            status: 'applied',
        };

        job.applications.push(application);
        await job.save();

        res.status(201).json({ message: 'Application submitted successfully', analysis });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get jobs posted by current company
// @route   GET /api/jobs/myjobs
// @access  Private/Company
const getMyJobs = async (req, res) => {
    try {
        const jobs = await Job.find({ postedBy: req.user._id })
            .sort({ createdAt: -1 })
            .populate('applications.user', 'name email'); // Populate applicant details
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export { getJobs, getJobById, createJob, applyJob, getMyJobs };
