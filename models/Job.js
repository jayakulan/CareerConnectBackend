import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CompanyProfile',
    required: true
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  jobType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'],
    required: true
  },
  location: {
    type: String,
    required: true
  },
  remote: {
    type: Boolean,
    default: false
  },
  salary: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'USD'
    },
    period: {
      type: String,
      enum: ['hour', 'week', 'month', 'year']
    }
  },
  skills: [{
    type: String,
    trim: true
  }],
  experience: {
    min: Number,
    max: Number
  },
  education: {
    type: String,
    enum: ['High School', 'Associate', 'Bachelor', 'Master', 'PhD', 'Any']
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'closed', 'archived'],
    default: 'draft'
  },
  applications: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['applied', 'reviewed', 'interview', 'rejected', 'hired'],
      default: 'applied'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    resume: {
      url: String,
      publicId: String
    },
    coverLetter: String,
    matchPercentage: Number,
    missingSkills: [String]
  }]
}, { timestamps: true });

// Indexes for better query performance
jobSchema.index({ title: 'text', description: 'text', 'skills': 'text' });

const Job = mongoose.model('Job', jobSchema);
export default Job;
