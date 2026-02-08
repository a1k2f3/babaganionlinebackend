import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false,           // ← important: don't return password in queries
  },
  role: {
    type: String,
    default: 'admin',
    enum: ['admin'],
  },
  lastLogin: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,          // optional: adds updatedAt automatically
});

// Hash password before saving (only if modified)
adminSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return 
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
adminSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
adminSchema.methods.generateAuthToken = function () {
  const payload = {
    id: this._id,
    email: this.email,
    role: this.role,
  };

  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET || 'your-super-secret-key-change-this-immediately',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',   // or '1h', '30d', etc.
    }
  );

  return token;
};

// Optional: You can also add a method to generate refresh token if needed
// adminSchema.methods.generateRefreshToken = function () { ... }

export default mongoose.model('Admin', adminSchema);