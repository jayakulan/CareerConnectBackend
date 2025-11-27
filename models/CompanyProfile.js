import mongoose from 'mongoose';

const companyProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  logo: {
    url: String,
    publicId: String // For Cloudinary
  },
  industry: {
    type: String,
    trim: true
  },
  companySize: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
  },
  founded: Number,
  location: {
    address: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  contact: {
    email: String,
    phone: String
  },
  socialMedia: {
    linkedin: String,
    twitter: String,
    facebook: String
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const CompanyProfile = mongoose.model('CompanyProfile', companyProfileSchema);
export default CompanyProfile;
