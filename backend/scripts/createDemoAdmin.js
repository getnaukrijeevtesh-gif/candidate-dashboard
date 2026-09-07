import dns from 'dns';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';

dns.setServers(['8.8.8.8']);

dotenv.config();

const createDemoAdmin = async () => {
  try {
    console.log('Connecting to MongoDB...');

    await mongoose.connect(process.env.MONGO_URI);

    console.log('MongoDB connected');

    const email = 'admin@example.com';
    const password = 'Admin@123';

    // Delete existing demo admin
    await Admin.deleteOne({ email });

    console.log('Old demo admin removed if it existed');

    // Hash password manually
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert directly to avoid double hashing
    const admin = await Admin.collection.insertOne({
      name: 'Demo Admin',
      email: email,
      password: hashedPassword,
      role: 'superadmin',
      avatar: '',
      permissions: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('\n====================================');
    console.log('DEMO ADMIN CREATED SUCCESSFULLY');
    console.log('====================================');
    console.log('Email: admin@example.com');
    console.log('Password: Admin@123');
    console.log('====================================\n');

    await mongoose.connection.close();

    process.exit(0);

  } catch (error) {
    console.error('Error creating demo admin:', error);

    await mongoose.connection.close().catch(() => {});

    process.exit(1);
  }
};

createDemoAdmin();