import api from './api.js';

export const dashboardApi = {
  getOverview: (params) => api.get('/dashboard/overview', { params }),
  getStats: (params) => api.get('/dashboard/stats', { params }),
  getRegistrationTrend: (params) => api.get('/dashboard/registration-trend', { params }),
  getApplicationTrend: (params) => api.get('/dashboard/application-trend', { params }),
  getDailyRegistrations: (params) => api.get('/dashboard/daily-registrations', { params }),
  getWeeklyRegistrations: (params) => api.get('/dashboard/weekly-registrations', { params }),
  getMonthlyGrowth: () => api.get('/dashboard/monthly-growth'),
  getActivityTrends: (params) => api.get('/dashboard/activity-trends', { params }),
  getApplicationTrends: (params) => api.get('/dashboard/application-trends', { params }),
  getRecentActivities: (params) => api.get('/dashboard/recent-activities', { params }),
  getRegistrationAnalytics: (params) => api.get('/dashboard/registration-analytics', { params }),
};

export const candidateApi = {
  list: (params) => api.get('/candidates', { params }),
  getById: (id) => api.get(`/candidates/${id}`),
  updateStatus: (id, status) => api.patch(`/candidates/${id}/status`, { status }),
  remove: (id) => api.delete(`/candidates/${id}`),
  exportCSV: (params) => api.get('/reports/export/candidates.csv', { params, responseType: 'blob' }),
};

export const activityApi = {
  list: (params) => api.get('/activities', { params }),
  getStats: (params) => api.get('/activities/stats', { params }),
  getTypes: () => api.get('/activities/types'),
  exportCSV: (params) => api.get('/reports/export/activities.csv', { params, responseType: 'blob' }),
};

export const visitorApi = {
  getStats: (params) => api.get('/visitors/stats', { params }),
  getTrends: (params) => api.get('/visitors/trends', { params }),
  getTopPages: (params) => api.get('/visitors/top-pages', { params }),
  getBreakdown: (params) => api.get('/visitors/breakdown', { params }),
  exportCSV: (params) => api.get('/reports/export/visitors.csv', { params, responseType: 'blob' }),
};

export const applicationApi = {
  list: (params) => api.get('/applications', { params }),
  getById: (id) => api.get(`/applications/${id}`),
  updateStatus: (id, status) => api.patch(`/applications/${id}/status`, { status }),
  getStats: (params) => api.get('/applications/stats', { params }),
  exportCSV: (params) => api.get('/reports/export/applications.csv', { params, responseType: 'blob' }),
};

export const reportApi = {
  getSummary: (params) => api.get('/reports/summary', { params }),
  exportCandidates: (params) => api.get('/reports/export/candidates.csv', { params, responseType: 'blob' }),
  exportActivities: (params) => api.get('/reports/export/activities.csv', { params, responseType: 'blob' }),
  exportApplications: (params) => api.get('/reports/export/applications.csv', { params, responseType: 'blob' }),
  exportVisitors: (params) => api.get('/reports/export/visitors.csv', { params, responseType: 'blob' }),
};

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default dashboardApi;
