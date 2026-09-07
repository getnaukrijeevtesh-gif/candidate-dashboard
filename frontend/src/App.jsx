import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardOverview from './pages/DashboardOverview.jsx';
import CandidatesPage from './pages/CandidatesPage.jsx';
import CandidateProfilePage from './pages/CandidateProfilePage.jsx';
import RegistrationAnalyticsPage from './pages/RegistrationAnalyticsPage.jsx';
import CandidateActivitiesPage from './pages/CandidateActivitiesPage.jsx';
import VisitorAnalyticsPage from './pages/VisitorAnalyticsPage.jsx';
import JobApplicationsPage from './pages/JobApplicationsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route index element={<DashboardOverview />} />
        <Route path="candidates" element={<CandidatesPage />} />
        <Route path="candidates/:id" element={<CandidateProfilePage />} />
        <Route path="registration-analytics" element={<RegistrationAnalyticsPage />} />
        <Route path="activities" element={<CandidateActivitiesPage />} />
        <Route path="visitors" element={<VisitorAnalyticsPage />} />
        <Route path="applications" element={<JobApplicationsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
