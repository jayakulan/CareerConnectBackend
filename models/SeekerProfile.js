import mongoose from 'mongoose';

const seekerProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  headline: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  skills: [{
    type: String,
    trim: true
  }],
  education: [{
    institution: String,
    degree: String,
    field: String,
    startYear: Number,
    endYear: Number,
    current: Boolean
  }],
  experience: [{
    title: String,
    company: String,
    location: String,
    startDate: Date,
    endDate: Date,
    current: Boolean,
    description: String
  }],
  resumeUrl: String,
  resumePublicId: String, // For Cloudinary
  skillsMatched: [{
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    matchPercentage: Number,
    missingSkills: [String]
  }]
}, { timestamps: true });

const SeekerProfile = mongoose.model('SeekerProfile', seekerProfileSchema);
export default SeekerProfile;
