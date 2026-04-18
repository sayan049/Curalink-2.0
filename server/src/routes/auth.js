import express from 'express';
import {
  requestRegistrationOTP,
  verifyRegistrationOTP,
  login,
  requestLoginOTP,
  verifyLoginOTP,
  getMe,
  updateProfile,
  logout,
  forgotPassword,
  verifyResetToken,
  resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter, otpLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Registration
router.post('/register/request-otp', otpLimiter, requestRegistrationOTP);
router.post('/register/verify-otp', authLimiter, verifyRegistrationOTP);

// Login
router.post('/login', authLimiter, login);
router.post('/login/request-otp', otpLimiter, requestLoginOTP);
router.post('/login/verify-otp', authLimiter, verifyLoginOTP);

// ✅ Password Reset
router.post('/forgot-password', otpLimiter, forgotPassword);
router.get('/reset-password/:token', verifyResetToken);
router.post('/reset-password/:token', resetPassword);

// Protected
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/logout', protect, logout);

export default router;