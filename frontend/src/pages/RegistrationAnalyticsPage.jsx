import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import PageHeader from '../components/PageHeader.jsx';
import DateFilterPicker from '../components/DateFilterPicker.jsx';
import StatCard from '../components/StatCard.jsx';
import Spinner from '../components/Spinner.jsx';
import api from '../services/api.js';
import { useDateFilter } from '../context/DateFilterContext.jsx';
import {
  Users, UserPlus, TrendingUp, MapPin, Globe, Sun, CalendarDays,
} from 'lucide-react';

const PIE_COLORS = ['#3464ff', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#ef4444'];

const statusLabels = {
  active: 'Active', inactive: 'Inactive', pending: 'Pending', suspended: 'Suspended',
};

export default function RegistrationAnalyticsPage() {
  const { params } = useDateFilter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [regsData, setRegsData] = useState([]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [{ data: a }, { data: b }] = await Promise.all([
        api.get('/dashboard/registration-analytics', { params }),
        api.get('/dashboard/daily-registrations', { params }),
      ]);
      setData(a);
      setRegsData(b.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, [params.range, params.startDate, params.endDate]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center"><Spinner size="lg" /></div>
    );
  }

  const total = (data?.byStatus || []).reduce((a, b) => a + (b.count || 0), 0);
  const activeCount = data?.byStatus?.find(s => s.status === 'active')?.count || 0;
  const pendingCount = data?.byStatus?.find(s => s.status === 'pending')?.count || 0;
  const activeRate = total === 0 ? 0 : (activeCount / total) * 100;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Registration Analytics"
        subtitle="Candidate registration volume, demographics, and distribution insights"
        breadcrumbs={['Home', 'Registration Analytics']}
        actions={<DateFilterPicker />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        <StatCard title="Total Registrations" value={total.toLocaleString()} Icon={Users} accent="brand" change={null} />
        <StatCard title="Active Candidates" value={activeCount.toLocaleString()} Icon={UserPlus} accent="emerald" change={null} />
        <StatCard title="Pending Onboarding" value={pendingCount.toLocaleString()} Icon={TrendingUp} accent="amber" change={null} />
        <StatCard title="Activation Rate" value={`${activeRate.toFixed(1)}%`} Icon={Sun} accent="violet" change={null} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-5">
        <div className="xl:col-span-2 card p-5">
          <h3 className="font-semibold text-surface-900 mb-1.5">Daily Registrations</h3>
          <p className="text-sm text-surface-500 mb-4">New candidate sign-ups across selected period</p>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={regsData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="registrations" fill="#3464ff" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-surface-900 mb-1.5">Status Mix</h3>
          <p className="text-sm text-surface-500 mb-4">New registrations by status</p>
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={(data?.byStatus || []).map(b => ({ ...b, name: statusLabels[b.status] || b.status, value: b.count }))}
                  cx="50%" cy="50%" innerRadius={52} outerRadius={86} paddingAngle={2} dataKey="value"
                  label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}>
                  {(data?.byStatus || []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4"><MapPin className="h-4 w-4 text-brand-600" />
          <h3 className="font-semibold text-surface-900">Top Locations</h3></div>
          <div className="space-y-3">
            {(data?.byLocation || []).slice(0, 8).map((loc, i) => {
              const max = (data?.byLocation?.[0]?.count || 1);
              const pct = (loc.count / max) * 100;
              return (
                <div key={loc.location}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium text-surface-800">{loc.location}</span>
                    <span className="text-surface-500">{loc.count} candidates</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-100 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-brand-500 to-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {(!data?.byLocation?.length) && <p className="text-sm text-surface-500">No location data.</p>}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4"><Globe className="h-4 w-4 text-brand-600" />
          <h3 className="font-semibold text-surface-900">Sign-up Source Channels</h3></div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={data?.bySource || []} layout="vertical" margin={{ top: 5, right: 10, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="source" type="category" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={80} />
                <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4"><CalendarDays className="h-4 w-4 text-brand-600" />
          <h3 className="font-semibold text-surface-900">Registrations by Day of Week</h3></div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={data?.byDay || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
