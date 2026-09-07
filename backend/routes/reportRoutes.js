import express from 'express';
import {
  getReportSummary,
  exportCandidatesCSV,
  exportActivitiesCSV,
  exportApplicationsCSV,
  exportVisitorsCSV,
} from '../controllers/reportController.js';

const router = express.Router();

router.get('/summary', getReportSummary);
router.get('/export/candidates.csv', exportCandidatesCSV);
router.get('/export/activities.csv', exportActivitiesCSV);
router.get('/export/applications.csv', exportApplicationsCSV);
router.get('/export/visitors.csv', exportVisitorsCSV);

export default router;
