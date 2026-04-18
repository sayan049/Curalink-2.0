import express from 'express';
import authRoutes from './auth.js';
import chatRoutes from './chat.js';
import researchRoutes from './research.js';
import userRoutes from './user.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/chat', chatRoutes);
router.use('/research', researchRoutes);
router.use('/user', userRoutes);

export default router;