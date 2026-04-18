import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import validator from 'validator';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    diseaseOfInterest: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    medicalHistory: [
      {
        condition: String,
        diagnosedDate: Date,
        notes: String,
      },
    ],
    preferences: {
      notifications: { type: Boolean, default: true },
      language: { type: String, default: 'en' },
      theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
    },
    avatar: {
      type: String,
      default: '',
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for conversation count
userSchema.virtual('conversations', {
  ref: 'Conversation',
  localField: '_id',
  foreignField: 'userId',
  count: true,
});

// Hash password before saving - MODERN APPROACH (NO next callback)
userSchema.pre('save', async function () {
  // Only hash if password is modified
  if (!this.isModified('password')) {
    return;
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('✅ Password hashed successfully');
  } catch (error) {
    console.error('❌ Password hash error:', error);
    throw error;
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('❌ Password compare error:', error);
    throw new Error('Password comparison failed');
  }
};

// Update last active
userSchema.methods.updateLastActive = async function () {
  this.lastActive = new Date();
  return this.save({ validateBeforeSave: false });
};

// Generate avatar URL
userSchema.methods.generateAvatar = function () {
  return `https://ui-avatars.com/api/?background=667eea&color=fff&name=${encodeURIComponent(
    this.name
  )}&size=200`;
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  obj.avatar = obj.avatar || this.generateAvatar();
  return obj;
};

const User = mongoose.model('User', userSchema);

export default User;