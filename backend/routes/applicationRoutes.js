import express from 'express';
import {
  getApplications,
  getApplicationById,
  updateApplicationStatus,
  getApplicationStats,
} from '../controllers/applicationController.js';
import { protectAdmin, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getApplications);
router.get('/stats', getApplicationStats);
router.get('/:id', getApplicationById);
router.patch('/:id/status', protectAdmin, requireRole('superadmin', 'admin'), updateApplicationStatus);

export default router;
