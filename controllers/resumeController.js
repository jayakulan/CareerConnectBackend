import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';

export const uploadResume = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Resume file is required." });
        }

        // Upload to Cloudinary (root folder, public)
        // We pass originalname so it can be used as the public_id if configured in utils
        const uploadResult = await uploadToCloudinary(req.file.buffer, req.file.originalname);

        res.status(201).json({
            message: "Resume uploaded successfully",
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id
        });

    } catch (error) {
        console.error("Error uploading resume:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const deleteResume = async (req, res) => {
    try {
        const { publicId } = req.body;
        if (!publicId) return res.status(400).json({ message: "publicId is required" });

        await deleteFromCloudinary(publicId);
        res.json({ message: "Resume deleted successfully" });
    } catch (error) {
        console.error("Error deleting resume:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
