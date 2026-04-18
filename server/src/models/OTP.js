import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['registration', 'login', 'password-reset', 'email-verification'],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index - auto delete expired OTPs
    },
    attempts: {
      type: Number,
      default: 0,
      max: 5,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
  }
);

// Compound index for faster lookups
otpSchema.index({ email: 1, purpose: 1, isUsed: 1, expiresAt: 1 });

// Auto-generate expiry date before saving - MODERN APPROACH (NO next)
otpSchema.pre('save', function () {
  if (!this.expiresAt) {
    const expireMinutes = parseInt(process.env.OTP_EXPIRE_MINUTES) || 10;
    this.expiresAt = new Date(Date.now() + expireMinutes * 60 * 1000);
    console.log(`⏰ OTP expiry set to ${expireMinutes} minutes`);
  }
});

// Method to increment attempts
otpSchema.methods.incrementAttempts = async function () {
  this.attempts += 1;
  return this.save();
};

// Method to mark as used
otpSchema.methods.markAsUsed = async function () {
  this.isUsed = true;
  return this.save();
};

// Static method to clean up old OTPs
otpSchema.statics.cleanup = async function () {
  const result = await this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isUsed: true, createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    ],
  });
  console.log(`🗑️  Cleaned up ${result.deletedCount} old OTPs`);
  return result;
};

const OTP = mongoose.model('OTP', otpSchema);

export default OTP;