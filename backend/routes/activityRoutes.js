import express from 'express';
import {
  getActivities,
  getActivityStats,
  getActivityTypes,
} from '../controllers/activityController.js';

const router = express.Router();

router.get('/', getActivities);
router.get('/stats', getActivityStats);
router.get('/types', getActivityTypes);

export default router;
