import Application from '../models/Application.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import SeekerProfile from '../models/SeekerProfile.js';
import Notification from '../models/Notification.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';

// Apply for a job
export const applyForJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { coverLetter } = req.body;
        const seekerId = req.user.id;

        // Check if job exists
        const job = await Job.findById(jobId).populate('company');
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Check if already applied
        const existingApplication = await Application.findOne({ job: jobId, seeker: seekerId });
        if (existingApplication) {
            return res.status(400).json({ message: 'You have already applied for this job' });
        }

        // Get seeker profile
        const seekerProfile = await SeekerProfile.findOne({ user: seekerId });
        if (!seekerProfile) {
            return res.status(404).json({ message: 'Seeker profile not found' });
        }

        // Check if resume file is uploaded
        if (!req.file) {
            return res.status(400).json({ message: 'Resume is required' });
        }

        // Upload resume to Cloudinary
        // Upload resume to Cloudinary
        const resumeUpload = await uploadToCloudinary(req.file.buffer);

        // Calculate match percentage (simple version based on skills)
        let matchPercentage = 0;
        let missingSkills = [];

        if (job.skills && job.skills.length > 0 && seekerProfile.skills && seekerProfile.skills.length > 0) {
            const jobSkills = job.skills.map(s => s.toLowerCase());
            const seekerSkills = seekerProfile.skills.map(s => s.toLowerCase());
            const matchedSkills = jobSkills.filter(skill => seekerSkills.includes(skill));
            matchPercentage = Math.round((matchedSkills.length / jobSkills.length) * 100);
            missingSkills = jobSkills.filter(skill => !seekerSkills.includes(skill));
        }

        // Create application
        const application = await Application.create({
            job: jobId,
            seeker: seekerId,
            seekerProfile: seekerProfile._id,
            company: job.postedBy,
            resume: {
                url: resumeUpload.secure_url,
                publicId: resumeUpload.public_id,
                filename: req.file.originalname
            },
            coverLetter,
            matchPercentage,
            missingSkills,
            status: 'applied'
        });

        // Create notification for company
        await Notification.create({
            recipient: job.postedBy,
            sender: seekerId,
            type: 'new_application',
            title: 'New Job Application',
            message: `New application received for ${job.title}`,
            relatedJob: jobId,
            relatedApplication: application._id,
            link: `/company/applicants/${application._id}`
        });

        // Populate the application before sending response
        const populatedApplication = await Application.findById(application._id)
            .populate('seeker', 'name email')
            .populate('job', 'title company')
            .populate('seekerProfile');

        res.status(201).json({
            message: 'Application submitted successfully',
            application: populatedApplication
        });
    } catch (error) {
        console.error('Error applying for job:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get all applications for a seeker
export const getSeekerApplications = async (req, res) => {
    try {
        const seekerId = req.user.id;
        const { status } = req.query;

        const filter = { seeker: seekerId };
        if (status && status !== 'all') {
            filter.status = status;
        }

        const applications = await Application.find(filter)
            .populate('job', 'title company location jobType salary createdAt')
            .populate({
                path: 'job',
                populate: {
                    path: 'company',
                    select: 'companyName logo'
                }
            })
            .sort({ createdAt: -1 });

        res.json(applications);
    } catch (error) {
        console.error('Error fetching seeker applications:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get all applications for a company
export const getCompanyApplications = async (req, res) => {
    try {
        const companyId = req.user.id;
        const { status, jobId } = req.query;

        const filter = { company: companyId };
        if (status && status !== 'all') {
            filter.status = status;
        }
        if (jobId) {
            filter.job = jobId;
        }

        const applications = await Application.find(filter)
            .populate('seeker', 'name email')
            .populate('seekerProfile')
            .populate('job', 'title location jobType')
            .sort({ createdAt: -1 });

        res.json(applications);
    } catch (error) {
        console.error('Error fetching company applications:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get single application details
export const getApplicationById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const application = await Application.findById(id)
            .populate('seeker', 'name email')
            .populate('seekerProfile')
            .populate('job')
            .populate({
                path: 'job',
                populate: {
                    path: 'company',
                    select: 'companyName logo'
                }
            });

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        // Check if user is authorized to view this application
        if (application.seeker._id.toString() !== userId && application.company.toString() !== userId) {
            return res.status(403).json({ message: 'Not authorized to view this application' });
        }

        res.json(application);
    } catch (error) {
        console.error('Error fetching application:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update application status (company only)
export const updateApplicationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes, interviewDetails } = req.body;
        const companyId = req.user.id;

        const application = await Application.findById(id)
            .populate('seeker', 'name email')
            .populate('job', 'title');

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        // Check if user is the company that posted the job
        if (application.company.toString() !== companyId) {
            return res.status(403).json({ message: 'Not authorized to update this application' });
        }

        // Update application
        application.status = status;
        if (notes) application.notes = notes;
        if (interviewDetails) application.interviewDetails = interviewDetails;
        application.updatedAt = Date.now();

        await application.save();

        // Create notification for seeker
        let notificationMessage = '';
        let notificationTitle = '';

        switch (status) {
            case 'reviewing':
                notificationTitle = 'Application Under Review';
                notificationMessage = `Your application for ${application.job.title} is being reviewed`;
                break;
            case 'interview':
                notificationTitle = 'Interview Scheduled';
                notificationMessage = `You have been shortlisted for an interview for ${application.job.title}`;
                break;
            case 'accepted':
                notificationTitle = 'Application Accepted!';
                notificationMessage = `Congratulations! Your application for ${application.job.title} has been accepted`;
                break;
            case 'rejected':
                notificationTitle = 'Application Update';
                notificationMessage = `Your application for ${application.job.title} has been updated`;
                break;
            default:
                notificationTitle = 'Application Status Update';
                notificationMessage = `Your application status for ${application.job.title} has been updated`;
        }

        await Notification.create({
            recipient: application.seeker._id,
            sender: companyId,
            type: 'application_status',
            title: notificationTitle,
            message: notificationMessage,
            relatedJob: application.job._id,
            relatedApplication: application._id,
            link: `/seeker/applications/${application._id}`
        });

        // Send email notification (optional - won't fail if not configured)
        try {
            const { sendInterviewEmail, sendStatusUpdateEmail } = await import('../services/emailService.js');

            // Get company details
            const company = await User.findById(companyId).populate('profile');
            const companyName = company.profile?.companyName || company.name || 'Company';

            if (status === 'interview' && interviewDetails) {
                // Send interview scheduling email
                await sendInterviewEmail(
                    application.seeker.email,
                    application.seeker.name,
                    interviewDetails,
                    application.job.title,
                    companyName
                );
                console.log('✓ Interview email sent successfully');
            } else {
                // Send general status update email
                await sendStatusUpdateEmail(
                    application.seeker.email,
                    application.seeker.name,
                    status,
                    application.job.title,
                    companyName
                );
                console.log('✓ Status update email sent successfully');
            }
        } catch (emailError) {
            // Email sending failed - log but don't crash
            console.warn('⚠️  Email notification not sent (email not configured):', emailError.message);
            // Continue anyway - status update was successful
        }


        res.json({
            message: 'Application status updated successfully',
            application
        });
    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Respond to interview (Seeker)
export const respondToInterview = async (req, res) => {
    try {
        const { status } = req.body; // 'confirmed' or 'declined'
        const application = await Application.findById(req.params.id);

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        // Check ownership
        if (application.seeker.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (application.status !== 'interview' || !application.interviewDetails) {
            return res.status(400).json({ message: 'No interview scheduled for this application' });
        }

        application.interviewDetails.status = status;
        await application.save();

        res.json(application);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete application (seeker can withdraw)
export const deleteApplication = async (req, res) => {
    try {
        const { id } = req.params;
        const seekerId = req.user.id;

        const application = await Application.findById(id);

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        // Check if user is the seeker who applied
        if (application.seeker.toString() !== seekerId) {
            return res.status(403).json({ message: 'Not authorized to delete this application' });
        }

        // Delete resume from Cloudinary
        if (application.resume.publicId) {
            await deleteFromCloudinary(application.resume.publicId);
        }

        await Application.findByIdAndDelete(id);

        res.json({ message: 'Application withdrawn successfully' });
    } catch (error) {
        console.error('Error deleting application:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Download/View resume
export const downloadResume = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const application = await Application.findById(id);

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        // Check if user is authorized (either the seeker or the company)
        if (application.seeker.toString() !== userId && application.company.toString() !== userId) {
            return res.status(403).json({ message: 'Not authorized to view this resume' });
        }

        // For Cloudinary URLs, generate a signed URL for private resources
        if (application.resume.publicId && application.resume.url.includes('cloudinary.com')) {
            // If the URL is already public (type="upload"), just return it
            if (!application.resume.url.includes('/authenticated/')) {
                return res.json({ url: application.resume.url });
            }

            const { generateSignedUrl } = await import('../utils/cloudinary.js');

            // It is authenticated, so we need to sign it
            const type = 'authenticated';

            let publicId = application.resume.publicId;
            // Ensure publicId has extension for raw files
            const urlExtension = application.resume.url.split('.').pop();
            if (urlExtension && urlExtension.length < 5 && !publicId.endsWith(`.${urlExtension}`)) {
                publicId = `${publicId}.${urlExtension}`;
            }

            const signedUrl = generateSignedUrl(publicId, type);

            // Return the signed URL
            return res.json({ url: signedUrl });
        }

        // Fallback to the stored URL
        res.json({ url: application.resume.url });
    } catch (error) {
        console.error('Error downloading resume:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
