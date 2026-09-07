import dns from 'dns';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Use Google DNS for MongoDB Atlas SRV lookups
dns.setServers(['8.8.8.8']);

dotenv.config();

const REDACTED = '[REDACTED]';

const sanitizeErrorMessage = (msg) => {
  if (!msg) return msg;

  return String(msg)
    .replace(
      /mongodb(\+srv)?:\/\/[^\s@]+@[^\s]+/gi,
      `mongodb://${REDACTED}@${REDACTED}`
    )
    .replace(
      /(password|pwd|secret|token|key)=[^\s&]+/gi,
      `$1=${REDACTED}`
    )
    .replace(
      /user=[^\s&]+/gi,
      `user=${REDACTED}`
    );
};

const connectionState = {
  isConnected: false,
  dbName: null,
  host: null,
};

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('[DB] FATAL: MONGO_URI is not defined');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
      retryWrites: true,
      retryReads: true,
    });

    connectionState.isConnected =
      conn.connection.readyState === 1;

    connectionState.dbName =
      conn.connection.db.databaseName;

    connectionState.host =
      conn.connection.host;

    console.log('[DB] MongoDB connected successfully');
    console.log(`[DB] Host: ${connectionState.host}`);
    console.log(`[DB] Database: ${connectionState.dbName}`);

    conn.connection.on('error', (err) => {
      console.error(
        `[DB] Connection error: ${sanitizeErrorMessage(err.message)}`
      );

      connectionState.isConnected = false;
    });

    conn.connection.on('disconnected', () => {
      console.warn('[DB] MongoDB disconnected');
      connectionState.isConnected = false;
    });

    conn.connection.on('reconnected', () => {
      console.log('[DB] MongoDB reconnected');
      connectionState.isConnected = true;
    });

    return conn;

  } catch (error) {
    console.error('[DB] Failed to connect to MongoDB');
    console.error(
      `[DB] Reason: ${sanitizeErrorMessage(error.message)}`
    );

    process.exit(1);
  }
};

const gracefulShutdown = async (signal) => {
  console.log(`\n[DB] Received ${signal}. Shutting down safely...`);

  try {
    await mongoose.connection.close(false);

    connectionState.isConnected = false;

    console.log('[DB] MongoDB connection closed safely');

    process.exit(0);

  } catch (error) {
    console.error(
      `[DB] Shutdown error: ${sanitizeErrorMessage(error.message)}`
    );

    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export {
  connectDB,
  connectionState,
  sanitizeErrorMessage,
  gracefulShutdown,
};

export default connectDB;