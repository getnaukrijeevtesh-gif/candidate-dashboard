import express from 'express';
import { body, query, validationResult } from 'express-validator';
import {
  getDashboardStats,
  getDailyRegistrations,
  getWeeklyRegistrations,
  getMonthlyGrowth,
  getActivityTrends,
  getApplicationTrends,
  getRegistrationAnalytics,
  getRegistrationTrend,
  getApplicationTrend,
  getRecentActivities,
  getOverview,
} from '../controllers/dashboardController.js';

const router = express.Router();

const validRangeValues = ['today', 'yesterday', 'last7days', 'last30days', '7d', '30d', 'thisMonth', 'lastMonth', 'custom', 'all', 'allTime'];

const rangeQueryValidators = [
  query('range').optional().isIn(validRangeValues).withMessage(`range must be one of: ${validRangeValues.join(', ')}`),
  query('startDate').optional().isISO8601().withMessage('startDate must be a valid ISO date (YYYY-MM-DD)'),
  query('endDate').optional().isISO8601().withMessage('endDate must be a valid ISO date (YYYY-MM-DD)'),
];

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const mapped = errors.array().map((e) => `${e.param}: ${e.msg}`).join('; ');
    return res.status(400).json({ message: `Invalid parameters: ${mapped}`, errors: errors.array() });
  }
  next();
};

router.get('/overview', [...rangeQueryValidators, handleValidation], getOverview);
router.get('/stats', [...rangeQueryValidators, handleValidation], getDashboardStats);

router.get('/registration-trend', [...rangeQueryValidators, handleValidation], getRegistrationTrend);
router.get('/application-trend', [...rangeQueryValidators, handleValidation], getApplicationTrend);

router.get('/daily-registrations', [...rangeQueryValidators, handleValidation], getDailyRegistrations);
router.get('/weekly-registrations', [...rangeQueryValidators, handleValidation], getWeeklyRegistrations);
router.get('/monthly-growth', getMonthlyGrowth);

router.get('/activity-trends', [...rangeQueryValidators, handleValidation], getActivityTrends);
router.get('/application-trends', [...rangeQueryValidators, handleValidation], getApplicationTrends);

router.get(
  '/recent-activities',
  [
    ...rangeQueryValidators,
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt().withMessage('limit must be an integer between 1 and 200'),
    handleValidation,
  ],
  getRecentActivities,
);

router.get('/registration-analytics', [...rangeQueryValidators, handleValidation], getRegistrationAnalytics);

export default router;
