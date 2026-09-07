import React, { useEffect, useState } from 'react';
import {
  Search, Filter, Eye, BarChart3, FileText, Clock, Briefcase,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Avatar from '../components/Avatar.jsx';
import Pagination from '../components/Pagination.jsx';
import Spinner from '../components/Spinner.jsx';
import DateFilterPicker from '../components/DateFilterPicker.jsx';
import StatCard from '../components/StatCard.jsx';
import api from '../services/api.js';
import { useDateFilter } from '../context/DateFilterContext.jsx';
import { format } from 'date-fns';
import clsx from 'clsx';

const STATUS_COLOR = {
  pending: 'bg-sky-500',
  reviewing: 'bg-indigo-500',
  shortlisted: 'bg-violet-500',
  interview: 'bg-amber-500',
  rejected: 'bg-rose-500',
  hired: 'bg-emerald-500',
  Applied: 'bg-sky-500',
  'In Review': 'bg-indigo-500',
  Accepted: 'bg-emerald-500',
  Rejected: 'bg-rose-500',
};

export default function JobApplicationsPage() {
  const { params } = useDateFilter();
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [apps, setApps] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [statusOptions, setStatusOptions] = useState([]);
  const [statusCounts, setStatusCounts] = useState([]);
  const [byJob, setByJob] = useState([]);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => { const t = setTimeout(() => setDebounced(search), 300); return () => clearTimeout(t); }, [search]);

  const fetchAll = async () => {
    setLoading(true); setStatsLoading(true);
    try {
      const [{ data: a }, { data: s }] = await Promise.all([
        api.get('/applications', { params: { page, limit: 20, status, search: debounced, ...params } }),
        api.get('/applications/stats', { params }),
      ]);
      setApps(a.applications);
      setPagination(a.pagination);
      setStatusOptions(a.statusOptions);
      setStatusCounts(a.statusCounts);
      setByJob(s.byJob);
    } catch (e) { console.error(e); } finally { setLoading(false); setStatsLoading(false); }
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, [page, debounced, status, params.range, params.startDate, params.endDate]);

  const total = statusCounts.reduce((a, b) => a + (b.count || 0), 0);
  const shortlisted = statusCounts.find(s => s.status === 'shortlisted')?.count || 0;
  const interviews = statusCounts.find(s => s.status === 'interview')?.count || 0;
  const hired = statusCounts.find(s => s.status === 'hired' || s.status === 'Accepted')?.count || 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Job Applications"
        subtitle="Track, review, and manage candidate job applications across roles"
        breadcrumbs={['Home', 'Job Applications']}
        actions={<DateFilterPicker />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        <StatCard title="Total Applications" value={total.toLocaleString()} Icon={FileText} accent="brand" change={null} />
        <StatCard title="Shortlisted" value={shortlisted.toLocaleString()} Icon={BarChart3} accent="violet" change={null} />
        <StatCard title="Interviews Scheduled" value={interviews.toLocaleString()} Icon={Briefcase} accent="amber" change={null} />
        <StatCard title="Hires" value={hired.toLocaleString()} Icon={Eye} accent="emerald" change={null} />
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-surface-900 mb-1.5">Funnel by Status</h3>
        <p className="text-sm text-surface-500 mb-4">Application volume across pipeline stages</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statusOptions.map(s => {
            const count = statusCounts.find(x => x.status === s)?.count || 0;
            const pct = total === 0 ? 0 : (count / total) * 100;
            return (
              <div key={s} className="rounded-2xl border border-surface-200 bg-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <StatusBadge status={s} />
                  <span className="text-xs text-surface-500">{pct.toFixed(0)}%</span>
                </div>
                <div className="text-2xl font-extrabold text-surface-900">{count.toLocaleString()}</div>
                <div className="mt-3 h-1.5 rounded-full bg-surface-100 overflow-hidden">
                  <div className={clsx('h-full rounded-full', STATUS_COLOR[s] || 'bg-brand-500')} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-surface-900 mb-4">Top Jobs by Applications</h3>
        <div className="h-64">
          {statsLoading ? (
            <div className="h-full flex items-center justify-center"><Spinner /></div>
          ) : (
            <ResponsiveContainer>
              <BarChart data={byJob} layout="vertical" margin={{ top: 5, right: 10, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="jobTitle" type="category" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={160} />
                <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="count" fill="#ec4899" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
            <input
              className="input pl-10"
              placeholder="Search job title, company, or candidate…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="relative">
            <select
              className="input !py-2.5 pr-9 appearance-none"
              value={status}
              onChange={e => { setStatus(e.target.value); setPage(1); }}
            >
              <option value="">All statuses</option>
              {statusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>)}
            </select>
            <Filter className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[900px]">
            <thead><tr>
              <th className="table-header">Candidate</th>
              <th className="table-header">Job</th>
              <th className="table-header">Status</th>
              <th className="table-header">Source</th>
              <th className="table-header text-right">Applied</th>
            </tr></thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="table-cell text-center py-16">
                  <div className="flex flex-col items-center gap-3"><Spinner /><span className="text-sm text-surface-500">Loading applications…</span></div>
                </td></tr>
              )}
              {!loading && apps.length === 0 && (
                <tr><td colSpan={5} className="table-cell text-center py-16 text-sm text-surface-500">No applications found.</td></tr>
              )}
              {!loading && apps.map(a => {
                const name = a.candidate?.name || 'Unknown';
                return (
                  <tr key={a._id} className="hover:bg-surface-50/60 transition">
                    <td className="table-cell">
                      <Link to={a.candidate ? `/candidates/${a.applicant || a.candidateId}` : '#'} className="flex items-center gap-3 hover:opacity-80">
                        <Avatar name={name} src={a.candidate?.avatar} />
                        <div className="min-w-0">
                          <div className="font-semibold text-surface-800 truncate">{name}</div>
                          {a.candidate?.email && <div className="text-xs text-surface-500 truncate">{a.candidate.email}</div>}
                          {a.candidate?.location && <div className="text-[11px] text-surface-400 truncate">{a.candidate.location}</div>}
                        </div>
                      </Link>
                    </td>
                    <td className="table-cell">
                      <div className="font-medium text-surface-800">{a.job?.title || a.jobTitle || 'Unknown Job'}</div>
                      {(a.job?.company || a.companyName) && <div className="text-xs text-surface-500">{a.job?.company || a.companyName}</div>}
                    </td>
                    <td className="table-cell"><StatusBadge status={a.status} /></td>
                    <td className="table-cell">
                      {a.source ? <span className="badge bg-surface-50 text-surface-600 ring-1 ring-surface-200">{a.source}</span> : <span className="text-surface-400">—</span>}
                    </td>
                    <td className="table-cell text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-xs text-surface-500">
                        <Clock className="h-3 w-3" />
                        {(a.appliedAt || a.createdAt) ? format(new Date(a.appliedAt || a.createdAt), 'MMM d, yyyy') : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} onChange={setPage} />
      </div>
    </div>
  );
}
