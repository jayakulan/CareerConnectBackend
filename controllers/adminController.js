import User from '../models/User.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getAdminStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalCompanies = await User.countDocuments({ role: 'company' });
        const totalSeekers = await User.countDocuments({ role: 'seeker' });
        const activeJobs = await Job.countDocuments({ status: 'published' });
        const totalApplications = await Application.countDocuments();

        // Recent activity (simplified)
        const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5).select('name role createdAt');
        const recentJobs = await Job.find().sort({ createdAt: -1 }).limit(5).select('title company createdAt').populate('company', 'companyName');

        res.json({
            stats: {
                totalUsers,
                totalCompanies,
                totalSeekers,
                activeJobs,
                totalApplications
            },
            recentActivity: {
                users: recentUsers,
                jobs: recentJobs
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export { getAdminStats };
