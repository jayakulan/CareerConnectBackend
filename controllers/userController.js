import User from '../models/User.js';
import SeekerProfile from '../models/SeekerProfile.js';
import CompanyProfile from '../models/CompanyProfile.js';

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        let profileData = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            googleId: user.googleId,
        };

        // If seeker, get their profile details
        if (user.role === 'seeker' && user.profile) {
            const seekerProfile = await SeekerProfile.findById(user.profile);
            if (seekerProfile) {
                profileData = {
                    ...profileData,
                    phone: seekerProfile.phone,
                    location: seekerProfile.location,
                    title: seekerProfile.headline,
                    bio: seekerProfile.bio,
                    skills: seekerProfile.skills,
                    experience: seekerProfile.experience,
                    education: seekerProfile.education,
                    resumeUrl: seekerProfile.resumeUrl,
                };
            }
        }
        // If company, get their profile details
        else if (user.role === 'company' && user.profile) {
            const companyProfile = await CompanyProfile.findById(user.profile);
            if (companyProfile) {
                profileData = {
                    ...profileData,
                    companyName: companyProfile.companyName,
                    description: companyProfile.description,
                    website: companyProfile.website,
                    location: companyProfile.location,
                    industry: companyProfile.industry,
                    companySize: companyProfile.companySize,
                    logo: companyProfile.logo
                };
            }
        }

        res.json(profileData);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update user name and email if provided
        if (req.body.name) user.name = req.body.name;
        if (req.body.email) user.email = req.body.email;

        await user.save();

        // If seeker, update or create their profile
        if (user.role === 'seeker') {
            let seekerProfile;

            if (user.profile) {
                seekerProfile = await SeekerProfile.findById(user.profile);
            }

            if (!seekerProfile) {
                // Create new profile
                seekerProfile = new SeekerProfile({
                    user: user._id,
                });
                user.profile = seekerProfile._id;
                user.profileModel = 'SeekerProfile';
                await user.save();
            }

            // Update profile fields
            if (req.body.phone !== undefined) seekerProfile.phone = req.body.phone;
            if (req.body.location !== undefined) seekerProfile.location = req.body.location;
            if (req.body.title !== undefined) seekerProfile.headline = req.body.title;
            if (req.body.bio !== undefined) seekerProfile.bio = req.body.bio;
            if (req.body.skills !== undefined) seekerProfile.skills = req.body.skills;
            if (req.body.experience !== undefined) seekerProfile.experience = req.body.experience;
            if (req.body.education !== undefined) seekerProfile.education = req.body.education;

            await seekerProfile.save();

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: seekerProfile.phone,
                location: seekerProfile.location,
                title: seekerProfile.headline,
                bio: seekerProfile.bio,
                skills: seekerProfile.skills,
                experience: seekerProfile.experience,
                education: seekerProfile.education,
            });
        }
        // If company, update or create their profile
        else if (user.role === 'company') {
            let companyProfile;

            if (user.profile) {
                companyProfile = await CompanyProfile.findById(user.profile);
            }

            if (!companyProfile) {
                companyProfile = new CompanyProfile({
                    user: user._id,
                    companyName: req.body.companyName || user.name // Default to user name if not provided
                });
                user.profile = companyProfile._id;
                user.profileModel = 'CompanyProfile';
                await user.save();
            }

            // Update fields
            if (req.body.companyName) companyProfile.companyName = req.body.companyName;
            if (req.body.description) companyProfile.description = req.body.description;
            if (req.body.website) companyProfile.website = req.body.website;
            if (req.body.industry) companyProfile.industry = req.body.industry;
            if (req.body.companySize) companyProfile.companySize = req.body.companySize;

            // Handle location object update
            if (req.body.location) {
                // If it's a string (from simple form), treat as city/address
                if (typeof req.body.location === 'string') {
                    companyProfile.location = { ...companyProfile.location, city: req.body.location };
                } else {
                    // If it's an object
                    companyProfile.location = { ...companyProfile.location, ...req.body.location };
                }
            }

            await companyProfile.save();

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                companyName: companyProfile.companyName,
                description: companyProfile.description,
                website: companyProfile.website,
                location: companyProfile.location,
                industry: companyProfile.industry,
                companySize: companyProfile.companySize
            });
        } else {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
    const users = await User.find({});
    res.json(users);
};

export { getUserProfile, updateUserProfile, getUsers };
