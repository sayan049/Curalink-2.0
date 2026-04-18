import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// 🔑 Generate key based on User ID (if logged in) or securely handled IP (if guest)
const generateKey = (req, res) => {
  return req.user?._id || ipKeyGenerator(req, res);
};

// ============================================
// 1. AUTH LIMITER (Strict - prevents brute force)
// ============================================
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many auth attempts' },
  keyGenerator: generateKey,
});

// ============================================
// 2. OTP LIMITER (Very Strict - prevents spam)
// ============================================
export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 5 : 50,
  message: { success: false, message: 'Too many OTP requests' },
  keyGenerator: generateKey,
});

// ============================================
// 3. CHAT LIMITER (Generous)
// ============================================
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: { success: false, message: 'Slow down! You are messaging too fast.' },
  keyGenerator: generateKey,
});

// ============================================
// 4. RESEARCH LIMITER
// ============================================
export const researchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { success: false, message: 'Too many search requests' },
  keyGenerator: generateKey,
});

// ============================================
// 5. GENERAL API LIMITER
// ============================================
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Too many requests' },
  keyGenerator: generateKey,
});