import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    seeker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    seekerProfile: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SeekerProfile',
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    resume: {
        url: {
            type: String,
            required: true
        },
        publicId: String,
        filename: String
    },
    coverLetter: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['applied', 'reviewing', 'interview', 'accepted', 'rejected'],
        default: 'applied'
    },
    matchPercentage: {
        type: Number,
        min: 0,
        max: 100
    },
    missingSkills: [String],
    notes: {
        type: String,
        trim: true
    },
    interviewDate: Date,
    appliedAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Indexes for better query performance
applicationSchema.index({ job: 1, seeker: 1 }, { unique: true }); // Prevent duplicate applications
applicationSchema.index({ company: 1, status: 1 });
applicationSchema.index({ seeker: 1, status: 1 });

const Application = mongoose.model('Application', applicationSchema);
export default Application;
