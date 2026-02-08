import Admin from '../models/Admin.js';
import jwt from 'jsonwebtoken';
import sendLoginNotification from '../utils/sendLoginNotification.js';

// ── Register ── only allowed when ZERO admins exist
export const registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const adminCount = await Admin.countDocuments();
    if (adminCount >= 1) {
      return res.status(403).json({
        message: 'Only one admin account is allowed. Admin already exists.',
      });
    }

    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const admin = new Admin({ name, email, password });
    await admin.save();

    return res.status(201).json({
      message: 'First (and only) admin created successfully',
      email: admin.email,
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── Login + "Was this you?" email every time ──
export const loginAdmin = async (req, res) => {
  try {
    // Defensive check – prevents the destructuring crash
    const body = req.body || {};
    const { email, password } = body;

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required (JSON format expected)',
      });
    }

    // Trim & normalize
    const cleanEmail = email.trim().toLowerCase();

    const admin = await Admin.findOne({ email: cleanEmail }).select('+password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = jwt.sign(
      {
        id: admin._id,
        email: admin.email,
        role: admin.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      success: true,
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.lastLogin.toISOString(),
      },
    });
  } catch (err) {
    console.error('Login error:', err.message, err.stack);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};