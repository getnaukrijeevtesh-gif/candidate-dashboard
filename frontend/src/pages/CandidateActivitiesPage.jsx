import React, { useEffect, useState } from 'react';
import {
  Search, Filter, Eye, Activity as ActivityIcon, UserCheck, Shield,
  FileText, Upload, Briefcase, Clock, BarChart3, DollarSign,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import PageHeader from '../components/PageHeader.jsx';
import Pagination from '../components/Pagination.jsx';
import Spinner from '../components/Spinner.jsx';
import Avatar from '../components/Avatar.jsx';
import DateFilterPicker from '../components/DateFilterPicker.jsx';
import api from '../services/api.js';
import { useDateFilter } from '../context/DateFilterContext.jsx';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

const ACTIVITY_META = {
  registration: { Icon: UserCheck,    color: 'bg-emerald-50 text-emerald-700', label: 'Registration' },
  login:        { Icon: Shield,      color: 'bg-sky-50 text-sky-700',        label: 'Login' },
  logout:       { Icon: Shield,      color: 'bg-surface-100 text-surface-700', label: 'Logout' },
  profile_update: { Icon: FileText,  color: 'bg-violet-50 text-violet-700',   label: 'Profile Update' },
  resume_upload: { Icon: Upload,    color: 'bg-amber-50 text-amber-700',    label: 'Resume Upload' },
  job_search:    { Icon: BarChart3,  color: 'bg-indigo-50 text-indigo-700',   label: 'Job Search' },
  job_view:     { Icon: Briefcase,    color: 'bg-blue-50 text-blue-700',       label: 'Job View' },
  job_save:    { Icon: Briefcase,    color: 'bg-fuchsia-50 text-fuchsia-700', label: 'Job Save' },
  job_unsave:  { Icon: Briefcase,    color: 'bg-pink-50 text-pink-700',       label: 'Job Unsave' },
  job_application: { Icon: FileText, color: 'bg-rose-50 text-rose-700',     label: 'Application' },
  payment:        { Icon: DollarSign, color: 'bg-amber-50 text-amber-700',     label: 'Payment' },
};

const PIE_COLORS = ['#3464ff', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#ef4444', '#84cc16', '#a855f7'];

export default function CandidateActivitiesPage() {
  const { params } = useDateFilter();
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [activityTypes, setActivityTypes] = useState([]);
  const [byType, setByType] = useState([]);
  const [timeline, setTimeline] = useState([]);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [type, setType] = useState('');

  useEffect(() => { const t = setTimeout(() => setDebounced(search), 300); return () => clearTimeout(t); }, [search]);

  const fetchAll = async () => {
    setLoading(true); setStatsLoading(true);
    try {
      const [{ data: a }, { data: s }] = await Promise.all([
        api.get('/activities', { params: { page, limit: 20, activityType: type, candidateSearch: debounced, ...params } }),
        api.get('/activities/stats', { params }),
      ]);
      setActivities(a.activities);
      setPagination(a.pagination);
      setActivityTypes(a.filters.activityTypes);
      setByType(s.byType);
      setTimeline(s.timeline);
    } catch (e) { console.error(e); } finally { setLoading(false); setStatsLoading(false); }
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, [page, debounced, type, params.range, params.startDate, params.endDate]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Candidate Activities"
        subtitle="Timeline of meaningful candidate actions across the platform"
        breadcrumbs={['Home', 'Candidate Activities']}
        actions={<DateFilterPicker />}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-5">
        <div className="xl:col-span-2 card p-5">
          <h3 className="font-semibold text-surface-900 mb-1.5">Activity Volume Trend</h3>
          <p className="text-sm text-surface-500 mb-4">Daily candidate activity events</p>
          <div className="h-60">
            {statsLoading ? (
              <div className="h-full flex items-center justify-center"><Spinner /></div>
            ) : (
              <ResponsiveContainer>
                <AreaChart data={timeline} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="actA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0' }} />
                  <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#actA)" activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-surface-900 mb-1.5">Activity Distribution</h3>
          <p className="text-sm text-surface-500 mb-4">By type in selected range</p>
          <div className="h-60">
            {statsLoading ? (
              <div className="h-full flex items-center justify-center"><Spinner /></div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byType.map(b => ({ ...b, value: b.count, name: b.label }))}
                    dataKey="value" cx="50%" cy="50%" innerRadius={48} outerRadius={76} paddingAngle={2}>
                    {byType.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="card p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
            <input
              className="input pl-10"
              placeholder="Search candidate by name or email…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="relative">
            <select
              className="input !py-2.5 pr-9 appearance-none"
              value={type}
              onChange={e => { setType(e.target.value); setPage(1); }}
            >
              <option value="">All activity types</option>
              {activityTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <Filter className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr>
                <th className="table-header">Candidate</th>
                <th className="table-header">Activity</th>
                <th className="table-header">Description</th>
                <th className="table-header">Page / Source</th>
                <th className="table-header text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="table-cell text-center py-16">
                  <div className="flex flex-col items-center gap-3"><Spinner /><span className="text-sm text-surface-500">Loading activities…</span></div>
                </td></tr>
              )}
              {!loading && activities.length === 0 && (
                <tr><td colSpan={5} className="table-cell text-center py-16 text-sm text-surface-500">No activities found.</td></tr>
              )}
              {!loading && activities.map((a) => {
                const meta = ACTIVITY_META[a.activityType] || { Icon: Clock, color: 'bg-surface-100 text-surface-700', label: a.activityType || 'Activity' };
                const Icon = meta.Icon;
                const name = a.candidate?.name || 'Unknown';
                return (
                  <tr key={a._id} className="hover:bg-surface-50/60 transition">
                    <td className="table-cell">
                      {a.candidate ? (
                      <Link to={`/candidates/${a.applicant || a.candidateId}`} className="flex items-center gap-3 hover:opacity-80">
                        <Avatar name={name} src={a.candidate?.avatar} />
                        <div className="min-w-0">
                          <div className="font-semibold text-surface-800 truncate">{name}</div>
                          <div className="text-xs text-surface-500 truncate">{a.candidate?.email}</div>
                        </div>
                      </Link>
                      ) : (
                        <span className="text-surface-500">Unknown candidate</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <span className={clsx('inline-flex items-center gap-2')}>
                        <span className={`h-8 w-8 rounded-lg flex items-center justify-center ${meta.color}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-medium text-surface-800">{meta.label}</span>
                      </span>
                    </td>
                    <td className="table-cell text-sm text-surface-600">{a.description}</td>
                    <td className="table-cell text-sm text-surface-500">
                      {a.page && <span className="badge bg-surface-50 text-surface-600 ring-1 ring-surface-200 mr-1 mb-1">{a.page}</span>}
                      {a.source && <span className="badge bg-brand-50 text-brand-600 ring-1 ring-brand-200">{a.source}</span>}
                    </td>
                    <td className="table-cell text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-xs text-surface-500">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
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
