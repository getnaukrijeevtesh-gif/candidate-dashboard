import Admin from '../models/Admin.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
});

export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!admin.isActive) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    admin.lastLoginAt = new Date();
    await admin.save({ validateBeforeSave: false });

    const token = signToken(admin._id);
    const { password: _, ...adminData } = admin.toObject();

    res.status(200).json({
      token,
      admin: adminData,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

export const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, role = 'admin' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const exists = await Admin.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({ message: 'Admin with this email already exists' });
    }

    const admin = await Admin.create({ name, email, password, role });
    const token = signToken(admin._id);
    const { password: _, ...adminData } = admin.toObject();

    res.status(201).json({
      token,
      admin: adminData,
    });
  } catch (error) {
    console.error('Register admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select('-password');
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    res.status(200).json({ admin });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const logoutAdmin = async (req, res) => {
  res.status(200).json({ message: 'Logged out successfully' });
};
