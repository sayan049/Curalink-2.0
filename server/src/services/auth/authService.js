import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../../models/User.js';
import OTP from '../../models/OTP.js';
import ResetToken from '../../models/ResetToken.js';
import { sendEmail } from './emailService.js';

class AuthService {
  // ... existing methods ...

  // Generate OTP
  generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
  }

  // Create and send OTP
  async createAndSendOTP(email, purpose, name = 'User', ipAddress = '', userAgent = '') {
    try {
      await OTP.deleteMany({ email, purpose, isUsed: false });

      const otpCode = this.generateOTP(parseInt(process.env.OTP_LENGTH) || 6);
      
      const expiresAt = new Date(
        Date.now() + parseInt(process.env.OTP_EXPIRE_MINUTES || 10) * 60 * 1000
      );

      await OTP.create({
        email,
        otp: otpCode,
        purpose,
        expiresAt,
        ipAddress,
        userAgent,
      });

      await sendEmail(email, name, otpCode, purpose);

      return {
        success: true,
        message: 'OTP sent successfully',
        expiresAt,
      };
    } catch (error) {
      console.error('Create OTP error:', error);
      throw new Error('Failed to send OTP');
    }
  }

  // Verify OTP
  async verifyOTP(email, otpCode, purpose) {
    try {
      const otp = await OTP.findOne({
        email,
        otp: otpCode,
        purpose,
        isUsed: false,
        expiresAt: { $gt: new Date() },
      });

      if (!otp) {
        const expiredOTP = await OTP.findOne({ email, otp: otpCode, purpose });
        
        if (expiredOTP) {
          if (expiredOTP.isUsed) throw new Error('OTP has already been used');
          if (expiredOTP.expiresAt < new Date()) throw new Error('OTP has expired');
        }
        
        await OTP.updateMany(
          { email, purpose, isUsed: false },
          { $inc: { attempts: 1 } }
        );
        
        throw new Error('Invalid OTP');
      }

      if (otp.attempts >= parseInt(process.env.OTP_MAX_ATTEMPTS || 5)) {
        throw new Error('Maximum OTP attempts exceeded');
      }

      await otp.markAsUsed();

      return { success: true, message: 'OTP verified successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Generate JWT token
  generateToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '7d',
    });
  }

  // Send token response
  sendTokenResponse(user, statusCode, res, message = 'Success') {
    const token = this.generateToken(user._id);

    const options = {
      expires: new Date(
        Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRE || 7) * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    };

    res.status(statusCode).cookie('token', token, options).json({
      success: true,
      message,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        diseaseOfInterest: user.diseaseOfInterest,
        location: user.location,
        avatar: user.avatar || user.generateAvatar(),
      },
    });
  }

  // Register user
  async register(name, email, password) {
    try {
      const existingUser = await User.findOne({ email });
      
      if (existingUser) {
        if (existingUser.isVerified) {
          throw new Error('User already exists with this email');
        } else {
          await User.deleteOne({ _id: existingUser._id });
        }
      }

      const user = await User.create({
        name,
        email,
        password,
        isVerified: false,
      });

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Login user
  async login(email, password) {
    try {
      console.log('🔍 Attempting login for:', email);
      
      const user = await User.findOne({ email }).select('+password');

      console.log('👤 User found:', user ? 'Yes' : 'No');
      
      if (!user) {
        throw new Error('No account found with this email. Please register first.');
      }

      console.log('✅ User verified:', user.isVerified);
      
      if (!user.isVerified) {
        throw new Error('Account not verified. Please check your email for verification code.');
      }

      const isPasswordMatch = await user.comparePassword(password);
      
      console.log('🔑 Password match:', isPasswordMatch);

      if (!isPasswordMatch) {
        throw new Error('Incorrect password. Please try again.');
      }

      await user.updateLastActive();

      console.log('✅ Login successful');

      return user;
    } catch (error) {
      console.error('❌ Login error:', error.message);
      throw error;
    }
  }

  // Verify email
  async verifyEmail(email, otpCode) {
    try {
      await this.verifyOTP(email, otpCode, 'registration');

      const user = await User.findOneAndUpdate(
        { email },
        { isVerified: true },
        { returnDocument: 'after' }
      );

      if (!user) throw new Error('User not found');

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Update user profile
  async updateProfile(userId, updates) {
    try {
      const allowedUpdates = ['name', 'diseaseOfInterest', 'location', 'medicalHistory', 'preferences'];
      const filteredUpdates = {};

      for (const key of allowedUpdates) {
        if (updates[key] !== undefined) {
          filteredUpdates[key] = updates[key];
        }
      }

      const user = await User.findByIdAndUpdate(
        userId,
        filteredUpdates,
        { returnDocument: 'after', runValidators: true }
      );

      if (!user) throw new Error('User not found');

      return user;
    } catch (error) {
      throw error;
    }
  }

  // ✅ NEW: Request password reset
  async requestPasswordReset(email) {
    try {
      const user = await User.findOne({ email });
      
      if (!user) {
        throw new Error('No account found with this email address.');
      }

      if (!user.isVerified) {
        throw new Error('Account not verified. Please verify your email first.');
      }

      // Delete any existing reset tokens for this user
      await ResetToken.deleteMany({ userId: user._id });

      // Generate reset token
      const token = ResetToken.generateToken();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      await ResetToken.create({
        userId: user._id,
        email: user.email,
        token,
        expiresAt,
      });

      // Generate reset link
      const resetLink = `${process.env.CLIENT_URL}/auth?reset=${token}`;

      console.log('🔗 Reset link generated:', resetLink);

      return {
        user,
        token,
        resetLink,
      };
    } catch (error) {
      throw error;
    }
  }

  // ✅ NEW: Reset password
  async resetPassword(token, newPassword) {
    try {
      // Find valid reset token
      const resetToken = await ResetToken.findOne({
        token,
        isUsed: false,
        expiresAt: { $gt: new Date() },
      });

      if (!resetToken) {
        throw new Error('Invalid or expired reset link. Please request a new one.');
      }

      // Find user
      const user = await User.findById(resetToken.userId).select('+password');
      
      if (!user) {
        throw new Error('User not found.');
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Mark token as used
      resetToken.isUsed = true;
      await resetToken.save();

      // Delete all reset tokens for this user
      await ResetToken.deleteMany({ userId: user._id });

      console.log('✅ Password reset successful for:', user.email);

      return user;
    } catch (error) {
      throw error;
    }
  }

  // ✅ NEW: Verify reset token (check if valid)
  async verifyResetToken(token) {
    try {
      const resetToken = await ResetToken.findOne({
        token,
        isUsed: false,
        expiresAt: { $gt: new Date() },
      });

      if (!resetToken) {
        throw new Error('Invalid or expired reset link.');
      }

      return {
        valid: true,
        email: resetToken.email,
      };
    } catch (error) {
      throw error;
    }
  }
}

export default new AuthService();