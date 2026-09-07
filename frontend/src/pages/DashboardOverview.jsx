import React, { useEffect, useMemo, useState } from 'react';
import {
  Users, UserPlus, Activity as ActivityIcon, FileText, CalendarRange,
  UserCheck, Sparkles, TrendingUp, TrendingDown, RefreshCw, AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend, Area, AreaChart, PieChart, Pie, Cell,
} from 'recharts';
import PageHeader from '../components/PageHeader.jsx';
import StatCard from '../components/StatCard.jsx';
import Spinner from '../components/Spinner.jsx';
import DateFilterPicker from '../components/DateFilterPicker.jsx';
import ErrorState from '../components/ErrorState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ActivityTimeline from '../components/ActivityTimeline.jsx';
import { dashboardApi } from '../services/modules.js';
import { useDateFilter } from '../context/DateFilterContext.jsx';

const PIE_COLORS = ['#3464ff', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

function ChartCard({ title, subtitle, children, actions }) {
  return (
    <div className="card p-5 overflow-hidden">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-surface-900">{title}</h3>
          {subtitle && <p className="text-sm text-surface-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="h-72">{children}</div>
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5 h-32 bg-surface-50" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-5">
        <div className="xl:col-span-2 card h-96 bg-surface-50" />
        <div className="card h-96 bg-surface-50" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-5">
        <div className="card h-96 bg-surface-50" />
        <div className="card h-96 bg-surface-50" />
      </div>
    </div>
  );
}

const APP_STATUSES = ['pending', 'reviewing', 'shortlisted', 'interview', 'rejected', 'hired'];

export default function DashboardOverview() {
  const { params } = useDateFilter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overview, setOverview] = useState(null);
  const [weeklyRegs, setWeeklyRegs] = useState([]);
  const [monthly, setMonthly] = useState([]);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: ov }, { data: wr }, { data: mg }] = await Promise.all([
        dashboardApi.getOverview(params),
        dashboardApi.getWeeklyRegistrations(params),
        dashboardApi.getMonthlyGrowth(),
      ]);
      setOverview(ov);
      setWeeklyRegs(wr?.data || []);
      setMonthly(mg?.data || []);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load dashboard';
      setError(msg);
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, [params.range, params.startDate, params.endDate]);

  const stats = overview?.candidates || {};
  const appStats = overview?.applications || {};
  const regTrend = overview?.registrationTrend?.trend || [];
  const appTrend = overview?.applicationTrend?.trend || [];
  const regItems = overview?.registrationTrend?.items || [];
  const activities = overview?.recentActivities || [];
  const actItems = overview?.activityTrends?.items || [];

  const totalRegs = useMemo(
    () => regItems.reduce((a, b) => a + (Number(b.registrations) || 0), 0),
    [regItems],
  );
  const totalApps = useMemo(
    () => appTrend.reduce((a, b) => a + (Number(b.applications) || 0), 0),
    [appTrend],
  );

  const regChartData = useMemo(
    () => regItems.map((i) => ({ label: i.label, date: i.date, registrations: Number(i.registrations) || 0, count: Number(i.count) || 0 })),
    [regItems],
  );

  const appTrendBreakdown = useMemo(() => {
    const days = (overview?.applicationTrend?.items || []);
    if (days.length && days[0]?.total != null) return days;
    return appTrend.map((t) => ({
      label: t.label, date: t.date, total: Number(t.applications) || 0,
      pending: 0, reviewing: 0, shortlisted: 0, interview: 0, rejected: 0, hired: 0,
    }));
  }, [overview?.applicationTrend?.items, appTrend]);

  const activityBreakdown = useMemo(() => {
    if (actItems.length) return actItems.map((i) => ({
      label: i.label,
      date: i.date,
      total: Number(i.total) || 0,
      registrations: Number(i.registrations) || 0,
      logins: Number(i.logins) || 0,
      applications: Number(i.applications) || 0,
      profileUpdates: Number(i.profileUpdates) || 0,
      jobViews: Number(i.jobViews) || 0,
      jobSearches: Number(i.jobSearches) || 0,
      resumeUploads: Number(i.resumeUploads) || 0,
    }));
    return appTrendBreakdown.map((t) => ({
      label: t.label, date: t.date, total: 0,
      registrations: 0, logins: 0, applications: 0, profileUpdates: 0, jobViews: 0,
      jobSearches: 0, resumeUploads: 0,
    }));
  }, [actItems, appTrendBreakdown]);

  const appStatusData = useMemo(() => {
    const agg = { pending: 0, reviewing: 0, shortlisted: 0, interview: 0, rejected: 0, hired: 0 };
    appTrendBreakdown.forEach((r) => {
      APP_STATUSES.forEach((k) => { if (r[k] != null) agg[k] += Number(r[k]) || 0; });
    });
    const total = Object.values(agg).reduce((a, b) => a + b, 0);
    if (total === 0 && totalApps > 0) {
      agg.pending = totalApps;
    }
    return Object.entries(agg).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1), value,
    }));
  }, [appTrendBreakdown, totalApps]);

  if (loading && !overview) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard Overview"
          subtitle="Real-time analytics and insights across your candidate ecosystem"
          breadcrumbs={['Home', 'Dashboard']}
          actions={<DateFilterPicker />}
        />
        <SectionSkeleton />
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard Overview"
          subtitle="Real-time analytics and insights across your candidate ecosystem"
          breadcrumbs={['Home', 'Dashboard']}
          actions={<DateFilterPicker />}
        />
        <ErrorState
          title="Could not load dashboard"
          description={error}
          onRetry={fetchAll}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Overview"
        subtitle="Real-time analytics and insights across your candidate ecosystem"
        breadcrumbs={['Home', 'Dashboard']}
        actions={
          <div className="flex items-center gap-2">
            <DateFilterPicker />
            <button
              onClick={fetchAll}
              className="btn btn-ghost !p-2"
              aria-label="Refresh data"
              title="Refresh"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        <StatCard
          title="Total Candidates"
          value={stats.totalCandidates?.toLocaleString() ?? 0}
          change={stats.candidateGrowthPercentage}
          Icon={Users}
          accent="brand"
          footer={`${stats.registrationsToday ?? 0} new today · ${stats.activeCandidates ?? 0} active`}
        />
        <StatCard
          title="New (Last 7 Days)"
          value={stats.registrationsLast7Days?.toLocaleString() ?? 0}
          change={stats.candidateGrowthPercentage}
          Icon={UserPlus}
          accent="emerald"
          footer={`Yesterday: ${stats.registrationsYesterday ?? 0} · 30d: ${stats.registrationsLast30Days ?? 0}`}
        />
        <StatCard
          title="Active Candidates"
          value={stats.activeCandidates?.toLocaleString() ?? 0}
          change={null}
          Icon={UserCheck}
          accent="violet"
          footer={`7d: ${stats.activeLast7Days ?? 0} · 30d: ${stats.activeLast30Days ?? 0}`}
        />
        <StatCard
          title="Total Job Applications"
          value={appStats.totalApplications?.toLocaleString() ?? 0}
          change={appStats.applicationGrowthPercentage}
          Icon={FileText}
          accent="fuchsia"
          footer={`Today: ${appStats.applicationsToday ?? 0} · Period: ${appStats.applicationsInSelectedPeriod ?? 0}`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-5">
        <div className="xl:col-span-2">
          <ChartCard
          title="Candidate Registrations"
          subtitle={`${totalRegs.toLocaleString()} new candidates across selected date range`}
        >
          {overview?.registrationTrend?.empty || regChartData.length === 0 ? (
            <EmptyState
              title="No registrations"
              message={overview?.registrationTrend?.message || 'No registrations in the selected range.'}
              Icon={UserPlus}
              compact
            />
          ) : (
              <ResponsiveContainer>
                <AreaChart data={regChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cReg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3464ff" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#3464ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -12px rgba(2,6,23,0.15)' }}
                    cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 4' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="registrations"
                    stroke="#3464ff"
                    strokeWidth={2.5}
                    fill="url(#cReg)"
                    activeDot={{ r: 5, fill: '#3464ff', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <ChartCard
          title="Application Status Mix"
          subtitle={`${totalApps.toLocaleString()} applications in range`}
        >
          {overview?.applicationTrend?.empty || appStatusData.every((r) => r.value === 0) ? (
            <EmptyState
              title="No applications"
              message={overview?.applicationTrend?.message || 'No application data in the selected range.'}
              Icon={FileText}
              compact
            />
          ) : (
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={appStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => percent > 0.04 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                >
                  {appStatusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-5">
        <ChartCard
          title="Candidate Activity Trends"
          subtitle="Logins, applications, profile updates, job views"
        >
          {overview?.activityTrends?.empty || activityBreakdown.length === 0 || activityBreakdown.every((r) => (r.total || 0) === 0) ? (
            <EmptyState
              title="No activity"
              message={overview?.activityTrends?.message || 'No candidate activity recorded in this range.'}
              Icon={ActivityIcon}
              compact
            />
          ) : (
            <ResponsiveContainer>
              <LineChart data={activityBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="logins" stroke="#8b5cf6" strokeWidth={2.2} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="applications" stroke="#ec4899" strokeWidth={2.2} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="jobViews" stroke="#f59e0b" strokeWidth={2.2} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="profileUpdates" stroke="#10b981" strokeWidth={2.2} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="registrations" stroke="#3464ff" strokeWidth={2.2} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="jobSearches" stroke="#06b6d4" strokeWidth={2.2} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="resumeUploads" stroke="#ef4444" strokeWidth={2.2} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Job Application Trends"
          subtitle="Application volume and pipeline stages"
        >
          {overview?.applicationTrend?.empty || appTrendBreakdown.length === 0 ? (
            <EmptyState
              title="No data"
              message={overview?.applicationTrend?.message || 'No applications in selected range.'}
              Icon={FileText}
              compact
            />
          ) : (
            <ResponsiveContainer>
              <BarChart data={appTrendBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="pending" stackId="a" fill="#3464ff" radius={[0, 0, 0, 0]} />
                <Bar dataKey="reviewing" stackId="a" fill="#6366f1" />
                <Bar dataKey="shortlisted" stackId="a" fill="#8b5cf6" />
                <Bar dataKey="interview" stackId="a" fill="#f59e0b" />
                <Bar dataKey="rejected" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-5">
        <ChartCard title="Weekly Registrations" subtitle="Week-over-week candidate sign-ups">
          {weeklyRegs.length === 0 ? (
            <EmptyState title="No weekly data" message="Weekly buckets are not yet available for the range." Icon={CalendarRange} compact />
          ) : (
            <ResponsiveContainer>
              <BarChart data={weeklyRegs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="registrations" fill="#3464ff" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Monthly Candidate Growth" subtitle="Cumulative growth trend">
          {monthly.length === 0 ? (
            <EmptyState title="No history" message="Monthly growth data not yet available." Icon={TrendingUp} compact />
          ) : (
            <ResponsiveContainer>
              <LineChart data={monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="left" type="monotone" dataKey="newCandidates" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4, fill: '#fff', stroke: '#8b5cf6', strokeWidth: 2 }} />
                <Line yAxisId="right" type="monotone" dataKey="totalCandidates" stroke="#3464ff" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div>
        <ActivityTimeline activities={activities} maxHeight={520} />
      </div>
    </div>
  );
}
