import express from 'express';
import Contact from '../models/Contact.js';

const router = express.Router();

// @route   POST /api/contact
// @desc    Submit contact form
// @access  Public
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;

        // Validate required fields
        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields (name, email, subject, message)'
            });
        }

        // Create new contact entry
        const contact = new Contact({
            name,
            email,
            phone,
            subject,
            message
        });

        await contact.save();

        res.status(201).json({
            success: true,
            message: 'Thank you for contacting us! We will get back to you soon.',
            data: {
                id: contact._id,
                name: contact.name,
                email: contact.email,
                subject: contact.subject
            }
        });
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit contact form. Please try again later.',
            error: error.message
        });
    }
});

// @route   GET /api/contact
// @desc    Get all contact submissions (for admin)
// @access  Private/Admin
router.get('/', async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            count: contacts.length,
            data: contacts
        });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch contacts',
            error: error.message
        });
    }
});

// @route   GET /api/contact/:id
// @desc    Get single contact submission
// @access  Private/Admin
router.get('/:id', async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact submission not found'
            });
        }

        res.json({
            success: true,
            data: contact
        });
    } catch (error) {
        console.error('Error fetching contact:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch contact',
            error: error.message
        });
    }
});

// @route   PATCH /api/contact/:id/status
// @desc    Update contact status
// @access  Private/Admin
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;

        if (!['new', 'in-progress', 'resolved'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be one of: new, in-progress, resolved'
            });
        }

        const contact = await Contact.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact submission not found'
            });
        }

        res.json({
            success: true,
            message: 'Status updated successfully',
            data: contact
        });
    } catch (error) {
        console.error('Error updating contact status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update status',
            error: error.message
        });
    }
});

export default router;
