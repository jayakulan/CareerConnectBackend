import mongoose from 'mongoose';

const seekerProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  phone: {
    type: String,
    trim: true
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
  skills: [String],
  education: [{
    degree: String,
    school: String,
    year: String,
    id: Number
  }],
  experience: [{
    title: String,
    company: String,
    duration: String,
    description: String,
    id: Number
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
