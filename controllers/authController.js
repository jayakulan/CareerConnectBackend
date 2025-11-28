import User from '../models/User.js';
import CompanyProfile from '../models/CompanyProfile.js';
import SeekerProfile from '../models/SeekerProfile.js';
import generateToken from '../utils/generateToken.js';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });
    } else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password, role } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400).json({ message: 'User already exists' });
        return;
    }

    const user = await User.create({
        name,
        email,
        password,
        role,
    });

    if (user) {
        // Create Profile based on role
        if (role === 'company') {
            const profile = await CompanyProfile.create({
                user: user._id,
                companyName: name,
                contact: { email: email }
            });
            user.profile = profile._id;
            user.profileModel = 'CompanyProfile';
            await user.save();
        } else if (role === 'seeker') {
            const profile = await SeekerProfile.create({
                user: user._id,
            });
            user.profile = profile._id;
            user.profileModel = 'SeekerProfile';
            await user.save();
        }

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

// @desc    Google Auth
// @route   POST /api/auth/google
// @access  Public
const googleAuth = async (req, res) => {
    const { tokenId } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: tokenId,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const { name, email, sub: googleId } = ticket.getPayload();

        let user = await User.findOne({ email });

        if (user) {
            // If user exists, update googleId if not present (linking accounts)
            if (!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }
        } else {
            // Create new user
            // Default role? Or ask user to choose role?
            // For now, default to 'seeker' if not specified, but usually Google login is for existing users or we need to ask role.
            // I'll assume 'seeker' for now or handle it differently.
            // Ideally, the frontend should send the role if it's a new registration via Google.

            // Let's assume the request body might contain role if it's a signup.
            const role = req.body.role || 'seeker';

            user = await User.create({
                name,
                email,
                googleId,
                role,
                password: Math.random().toString(36).slice(-8), // Dummy password
                isVerified: true // Google emails are verified
            });
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });

    } catch (error) {
        res.status(400).json({ message: 'Google auth failed', error: error.message });
    }
};

export { authUser, registerUser, googleAuth };
