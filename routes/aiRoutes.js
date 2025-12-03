import express from "express";
import multer from "multer";
import { analyzeResume } from "../controllers/aiController.js";

const router = express.Router();

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") cb(null, true);
  else cb(new Error("Only PDF files are allowed"), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

router.post("/analyze", upload.single("resumeFile"), analyzeResume);

export default router;
