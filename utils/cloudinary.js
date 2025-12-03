import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

/* ================================
   CLOUDINARY CONFIG
================================ */
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ================================
   MULTER MEMORY STORAGE
================================ */
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only PDF, DOC and DOCX allowed."));
        }
    }
});

/* ================================
   UPLOAD BUFFER TO CLOUDINARY
   - Public access
   - Root folder (no folder specified)
================================ */
export const uploadToCloudinary = (buffer, originalName) => {
    return new Promise((resolve, reject) => {
        const options = {
            resource_type: "raw",
            type: "upload",        // Public
            access_mode: "public"  // Explicitly public
            // No folder specified -> uploads to root
        };

        if (originalName) {
            // Ensure public_id has .pdf extension for proper format recognition
            let publicId = originalName;
            if (!publicId.toLowerCase().endsWith('.pdf')) {
                publicId += '.pdf';
            }

            options.public_id = publicId;
            options.use_filename = true;
            options.unique_filename = false;
        }

        cloudinary.uploader.upload_stream(
            options,
            (error, result) => {
                if (error) {
                    console.error("Cloudinary upload error:", error);
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        ).end(buffer);
    });
};

/* ================================
   DELETE RAW FILE FROM CLOUDINARY
================================ */
export const deleteFromCloudinary = async (publicId) => {
    try {
        return await cloudinary.uploader.destroy(publicId, {
            resource_type: "raw"
        });
    } catch (error) {
        console.error("Cloudinary delete error:", error);
        throw error;
    }
};

/* ================================
   GENERATE SIGNED URL (Helper)
   - Kept for backward compatibility if needed
================================ */
export const generateSignedUrl = (publicId) => {
    return cloudinary.url(publicId, {
        resource_type: "raw",
        type: "authenticated",
        sign_url: true,
        secure: true
    });
};

export { cloudinary, upload };
