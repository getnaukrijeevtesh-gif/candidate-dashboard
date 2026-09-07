import express from 'express';
import {
  getVisitorStats,
  getVisitorTrends,
  getTopPages,
  getVisitorBreakdown,
} from '../controllers/visitorController.js';

const router = express.Router();

router.get('/stats', getVisitorStats);
router.get('/trends', getVisitorTrends);
router.get('/top-pages', getTopPages);
router.get('/breakdown', getVisitorBreakdown);

export default router;
