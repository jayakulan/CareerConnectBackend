import express from 'express';
import { authUser, registerUser, googleAuth } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', authUser);
router.post('/register', registerUser);
router.post('/google', googleAuth);

export default router;
