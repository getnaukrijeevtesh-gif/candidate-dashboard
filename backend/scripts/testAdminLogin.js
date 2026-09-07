import dns from 'dns';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';

dns.setServers(['8.8.8.8']);

dotenv.config();

const testLogin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = 'admin@example.com';
    const password = 'Admin@123';

    const admin = await Admin.findOne({ email });

    if (!admin) {
      console.log('❌ Admin not found');
      process.exit(1);
    }

    console.log('✅ Admin found');
    console.log('Name:', admin.name);
    console.log('Email:', admin.email);
    console.log('Role:', admin.role);
    console.log('Active:', admin.isActive);

    const isMatch = await bcrypt.compare(password, admin.password);

    console.log('\nPassword test:', isMatch ? '✅ CORRECT' : '❌ INCORRECT');

    await mongoose.connection.close();

    process.exit(0);

  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
};

testLogin();