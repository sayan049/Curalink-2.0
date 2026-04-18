import authService from '../services/auth/authService.js';
import { sendWelcomeEmail ,sendResetPasswordEmail} from '../services/auth/emailService.js';
import User from '../models/User.js';

// @desc    Request OTP for registration
// @route   POST /api/v1/auth/register/request-otp
// @access  Public
export const requestRegistrationOTP = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    console.log('📧 Registration OTP request:', { email, name });

    // Validate
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email and password',
      });
    }

    // Check if user already exists and verified
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Create/update user
    const user = await authService.register(name, email, password);

    // Send OTP
    const otpResult = await authService.createAndSendOTP(
      email,
      'registration',
      name,
      req.ip,
      req.get('user-agent')
    );

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email',
      expiresAt: otpResult.expiresAt,
    });
  } catch (error) {
    console.error('❌ Registration OTP Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send OTP',
    });
  }
};

// @desc    Verify OTP and complete registration
// @route   POST /api/v1/auth/register/verify-otp
// @access  Public
export const verifyRegistrationOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    console.log('✅ Verify registration OTP:', { email });

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP',
      });
    }

    // Verify OTP and email
    const user = await authService.verifyEmail(email, otp);

    // Send welcome email (non-blocking)
    sendWelcomeEmail(email, user.name).catch(err => 
      console.error('Welcome email error:', err)
    );

    // Send token response
    authService.sendTokenResponse(user, 201, res, 'Registration successful');
  } catch (error) {
    console.error('❌ Verify Registration Error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Verification failed',
    });
  }
};

// @desc    Direct login (no OTP)
// @route   POST /api/v1/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    console.log('🔑 Login attempt:', { email });

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Verify credentials
    const user = await authService.login(email, password);

    console.log('✅ Login successful for:', user.email);

    // Send token response immediately
    authService.sendTokenResponse(user, 200, res, 'Login successful');
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(401).json({
      success: false,
      message: error.message || 'Invalid email or password',
    });
  }
};

// @desc    Request OTP for login (2FA option - optional)
// @route   POST /api/v1/auth/login/request-otp
// @access  Public
export const requestLoginOTP = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    console.log('🔑 Login OTP request:', { email });

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Verify credentials
    const user = await authService.login(email, password);

    console.log('✅ User found, sending OTP');

    // Send OTP
    const otpResult = await authService.createAndSendOTP(
      email,
      'login',
      user.name,
      req.ip,
      req.get('user-agent')
    );

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email',
      expiresAt: otpResult.expiresAt,
    });
  } catch (error) {
    console.error('❌ Login OTP Error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Login failed',
    });
  }
};

// @desc    Verify login OTP
// @route   POST /api/v1/auth/login/verify-otp
// @access  Public
export const verifyLoginOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    console.log('✅ Verify login OTP:', { email });

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP',
      });
    }

    // Verify OTP
    await authService.verifyOTP(email, otp, 'login');

    // Get user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Send token response
    authService.sendTokenResponse(user, 200, res, 'Login successful');
  } catch (error) {
    console.error('❌ Verify Login Error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Verification failed',
    });
  }
};

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('❌ Get Me Error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to get user',
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/v1/auth/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const updates = req.body;
    const user = await authService.updateProfile(req.user.id, updates);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    console.error('❌ Update Profile Error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Update failed',
    });
  }
};

// @desc    Logout
// @route   POST /api/v1/auth/logout
// @access  Private
export const logout = async (req, res, next) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('❌ Logout Error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Logout failed',
    });
  }
};




// @desc    Request password reset
// @route   POST /api/v1/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    console.log('🔐 Password reset request for:', email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email address',
      });
    }

    // Request password reset
    const { user, resetLink } = await authService.requestPasswordReset(email);

    // Send reset email
    await sendResetPasswordEmail(email, user.name, resetLink);

    console.log('✅ Reset email sent to:', email);

    res.status(200).json({
      success: true,
      message: 'Password reset link sent to your email',
    });
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to process request',
    });
  }
};

// @desc    Verify reset token
// @route   GET /api/v1/auth/reset-password/:token
// @access  Public
export const verifyResetToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    console.log('🔍 Verifying reset token');

    const result = await authService.verifyResetToken(token);

    res.status(200).json({
      success: true,
      message: 'Token is valid',
      email: result.email,
    });
  } catch (error) {
    console.error('❌ Verify reset token error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Invalid or expired reset link',
    });
  }
};

// @desc    Reset password
// @route   POST /api/v1/auth/reset-password/:token
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    console.log('🔐 Resetting password');

    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide password and confirm password',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters',
      });
    }

    // Reset password
    const user = await authService.resetPassword(token, password);

    console.log('✅ Password reset successful for:', user.email);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
    });
  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to reset password',
    });
  }
};