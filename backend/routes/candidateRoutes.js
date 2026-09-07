import express from 'express';
import {
  getCandidates,
  getCandidateById,
  updateCandidateStatus,
  deleteCandidate,
} from '../controllers/candidateController.js';
import { protectAdmin, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getCandidates);
router.get('/:id', getCandidateById);
router.patch('/:id/status', protectAdmin, requireRole('superadmin', 'admin'), updateCandidateStatus);
router.delete('/:id', protectAdmin, requireRole('superadmin'), deleteCandidate);

export default router;
