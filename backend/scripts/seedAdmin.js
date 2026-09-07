import dns from 'dns';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../models/Admin.js';

dotenv.config();

// Fix MongoDB Atlas SRV DNS lookup issue
dns.setServers(['8.8.8.8']);

const seedAdmin = async () => {
  try {
    console.log('\n========================================');
    console.log('   Creating Demo Admin Account');
    console.log('========================================\n');

    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI is not defined in .env file');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 30000,
      family: 4,
    });

    console.log('✅ MongoDB connected successfully');
    console.log(`Database: ${mongoose.connection.db.databaseName}\n`);

    const email = 'admin@example.com';
    const password = 'Admin@123';

    // Check whether the admin already exists
    const existingAdmin = await Admin.findOne({ email });

    if (existingAdmin) {
      console.log('ℹ️ Demo admin already exists.');

      existingAdmin.password = password;
      existingAdmin.name = 'Super Admin';
      existingAdmin.role = 'superadmin';
      existingAdmin.isActive = true;

      await existingAdmin.save();

      console.log('✅ Demo admin password updated successfully');
    } else {
      // Create new admin — pre-save hook handles bcrypt hashing
      await Admin.create({
        name: 'Super Admin',
        email,
        password,
        role: 'superadmin',
        isActive: true,
      });

      console.log('✅ Demo admin created successfully');
    }

    console.log('\n========================================');
    console.log('   DEMO LOGIN CREDENTIALS');
    console.log('========================================');
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log('========================================\n');

    console.log('🔒 Existing candidates, jobs, applications, and other data were NOT deleted.');

    await mongoose.connection.close();

    console.log('\n✅ Database connection closed safely');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Seed error:', error.message);

    try {
      await mongoose.connection.close();
    } catch {
      // Ignore close errors
    }

    process.exit(1);
  }
};

seedAdmin();