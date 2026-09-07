import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB, sanitizeErrorMessage } from './config/db.js';
import { protectAdmin } from './middleware/authMiddleware.js';

import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import candidateRoutes from './routes/candidateRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import visitorRoutes from './routes/visitorRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

dotenv.config();

process.on('unhandledRejection', (err) => {
  console.error(`[Process] Unhandled Rejection: ${sanitizeErrorMessage(err.message)}`);
});

connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Admin dashboard backend is running', uptime: process.uptime() });
});

app.use('/api/admin/auth', authRoutes);
app.use('/api/admin/dashboard', protectAdmin, dashboardRoutes);
app.use('/api/admin/candidates', protectAdmin, candidateRoutes);
app.use('/api/admin/activities', protectAdmin, activityRoutes);
app.use('/api/admin/visitors', protectAdmin, visitorRoutes);
app.use('/api/admin/applications', protectAdmin, applicationRoutes);
app.use('/api/admin/reports', protectAdmin, reportRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Admin backend running on port ${PORT} (env: ${process.env.NODE_ENV})`);
});

export default app;
