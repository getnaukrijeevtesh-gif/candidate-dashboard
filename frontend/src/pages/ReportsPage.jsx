import React, { useState, useEffect } from 'react';
import {
  BarChart3, FileDown, Users, Activity as ActivityIcon, Eye, FileText, CalendarDays,
  Download, Loader2, CheckCircle2, TrendingUp,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import PageHeader from '../components/PageHeader.jsx';
import DateFilterPicker from '../components/DateFilterPicker.jsx';
import StatCard from '../components/StatCard.jsx';
import LoadingState from '../components/LoadingState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useDateFilter } from '../context/DateFilterContext.jsx';
import { useReportSummary } from '../hooks/useApi.js';
import { reportApi } from '../services/modules.js';
import { downloadBlob } from '../services/modules.js';
import clsx from 'clsx';

const PIE_COLORS = ['#3464ff', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

const STATUS_LABELS = { active: 'Active', inactive: 'Inactive', pending: 'Pending', suspended: 'Suspended' };
const ACTIVITY_LABELS = {
  registration: 'Registration', login: 'Login', logout: 'Logout', profile_update: 'Profile Update',
  resume_upload: 'Resume Upload', job_search: 'Job Search', job_view: 'Job View',
  job_save: 'Job Save', job_unsave: 'Job Unsave', job_application: 'Application',
  payment: 'Payment',
};

const REPORTS = [
  {
    id: 'candidates',
    title: 'Candidate Summary Report',
    Icon: Users,
    formats: ['CSV'],
    desc: 'Full candidate roster with fields, status, and registration dates.',
    accent: 'from-brand-500/10 to-violet-500/10 text-brand-600',
    exporter: (params) => reportApi.exportCandidates(params),
    filename: 'candidates.csv',
  },
  {
    id: 'applications',
    title: 'Applications Pipeline Report',
    Icon: FileText,
    formats: ['CSV'],
    desc: 'Pipeline by job, stage, and candidate.',
    accent: 'from-rose-500/10 to-pink-500/10 text-rose-600',
    exporter: (params) => reportApi.exportApplications(params),
    filename: 'applications.csv',
  },
  {
    id: 'activities',
    title: 'Candidate Activity Report',
    Icon: ActivityIcon,
    formats: ['CSV'],
    desc: 'Tracked candidate actions across date ranges.',
    accent: 'from-violet-500/10 to-indigo-500/10 text-violet-600',
    exporter: (params) => reportApi.exportActivities(params),
    filename: 'activities.csv',
  },
  {
    id: 'visitors',
    title: 'Website Traffic Report',
    Icon: Eye,
    formats: ['CSV'],
    desc: 'Visits, unique visitors, devices, and page-level analytics.',
    accent: 'from-emerald-500/10 to-teal-500/10 text-emerald-600',
    exporter: (params) => reportApi.exportVisitors(params),
    filename: 'visitors.csv',
  },
];

function useExport() {
  const [state, setState] = useState({ id: null, loading: false });
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, tone = 'success') => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3000);
  };

  const run = async (report, params) => {
    setState({ id: report.id, loading: true });
    try {
      const { data } = await report.exporter(params);
      downloadBlob(data, report.filename || `${report.id}_${Date.now()}.csv`);
      showToast(`${report.title} exported successfully`, 'success');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Export failed';
      showToast(msg, 'error');
    } finally {
      setState({ id: null, loading: false });
    }
  };

  const request = (report) => setConfirm(report);

  return { state, confirm, setConfirm, toast, run, request };
}

export default function ReportsPage() {
  const { params } = useDateFilter();
  const summary = useReportSummary(params);
  const { state, confirm, setConfirm, toast, run, request } = useExport();
  const [period, setPeriod] = useState(null);

  useEffect(() => {
    if (summary.data?.period) setPeriod(summary.data.period);
  }, [summary.data]);

  const confirmExport = () => {
    if (!confirm) return;
    run(confirm, params);
    setConfirm(null);
  };

  const s = summary.data?.summary;
  const byStatus = summary.data?.byStatus || [];
  const byActivity = summary.data?.byActivity || [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        subtitle="Export actionable reports across candidates, applications, and traffic"
        breadcrumbs={['Home', 'Reports']}
        actions={<DateFilterPicker />}
      />

      {toast && (
        <div className={clsx(
          'fixed bottom-6 right-6 z-[80] flex items-center gap-3 rounded-2xl px-4 py-3 shadow-xl border animate-in slide-in-from-right',
          toast.tone === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        )}>
          {toast.tone === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <BarChart3 className="h-5 w-5" />}
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      {summary.loading && !summary.data ? (
        <LoadingState label="Loading report summary…" />
      ) : summary.error ? (
        <EmptyState icon="data" title="Unable to load summary" description={summary.error} />
      ) : (
        <>
          {period && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 text-xs font-medium ring-1 ring-brand-200">
              <CalendarDays className="h-3.5 w-3.5" />
              Period: {period.start} → {period.end}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            <StatCard title="Registrations" value={(s?.totalCandidates || 0).toLocaleString()} Icon={Users} accent="brand" change={null} />
            <StatCard title="Active" value={(s?.activeCandidates || 0).toLocaleString()} Icon={TrendingUp} accent="emerald" change={null} />
            <StatCard title="Activities" value={(s?.totalActivities || 0).toLocaleString()} Icon={ActivityIcon} accent="violet" change={null} />
            <StatCard title="Applications" value={(s?.totalApplications || 0).toLocaleString()} Icon={FileText} accent="rose" change={null} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-5">
            <div className="xl:col-span-2 card p-5">
              <h3 className="font-semibold text-surface-900 mb-1.5">Registrations by status</h3>
              <p className="text-sm text-surface-500 mb-4">Snapshot of candidate status distribution</p>
              <div className="h-64">
                {byStatus.length === 0 ? (
                  <EmptyState icon="data" title="No status data" description="No registrations in the selected period." />
                ) : (
                  <ResponsiveContainer>
                    <BarChart data={byStatus.map((b) => ({ name: STATUS_LABELS[b._id] || b._id, count: b.count }))}
                      margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0' }} />
                      <Bar dataKey="count" fill="#3464ff" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-surface-900 mb-1.5">Activity distribution</h3>
              <p className="text-sm text-surface-500 mb-4">Top activity types</p>
              <div className="h-64">
                {byActivity.length === 0 ? (
                  <EmptyState icon="data" title="No activity data" description="No activity recorded in the selected period." />
                ) : (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={byActivity.map((b) => ({ name: ACTIVITY_LABELS[b._id] || b._id, value: b.count })).slice(0, 6)}
                        cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={2} dataKey="value">
                        {byActivity.slice(0, 6).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <div>
        <h3 className="font-semibold text-surface-900 mb-3 flex items-center gap-2"><FileDown className="h-4 w-4 text-brand-600" />Exportable reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5">
          {REPORTS.map((r) => {
            const busy = state.loading && state.id === r.id;
            return (
              <div key={r.id} className="card card-hover p-5 group">
                <div className="flex items-start gap-4">
                  <div className={clsx('h-12 w-12 rounded-2xl bg-gradient-to-br flex items-center justify-center', r.accent)}>
                    <r.Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-surface-900 tracking-tight">{r.title}</h3>
                    <p className="text-sm text-surface-500 mt-1">{r.desc}</p>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {r.formats.map((f) => (
                      <span key={f} className="badge bg-surface-50 text-surface-600 ring-1 ring-surface-200">{f}</span>
                    ))}
                  </div>
                  <button onClick={() => request(r)} disabled={busy} className="btn-primary !py-2 text-xs min-w-[88px]">
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    {busy ? 'Exporting' : 'Export'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={confirmExport}
        title={`Export ${confirm?.title || 'report'}?`}
        description={`This will download a CSV file for the current date range. Large datasets may take a few seconds to generate.`}
        confirmLabel="Download CSV"
        cancelLabel="Cancel"
      />
    </div>
  );
}
