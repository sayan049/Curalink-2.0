import mongoose from 'mongoose';
import crypto from 'crypto';

const resetTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Generate random token
resetTokenSchema.statics.generateToken = function () {
  return crypto.randomBytes(32).toString('hex');
};

const ResetToken = mongoose.model('ResetToken', resetTokenSchema);

export default ResetToken;