import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, AreaChart, Area } from 'recharts';
import { ChartWrapper } from './RegistrationChart.jsx';

export default function ActivityChart({ data = [] }) {
  const total = data.reduce((a, b) => a + (b.total || 0), 0);
  return (
    <ChartWrapper
      title="Candidate Activity Trends"
      subtitle={`${total.toLocaleString()} tracked activities`}
    >
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0' }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="logins" stroke="#8b5cf6" strokeWidth={2.2} dot={false} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="applications" stroke="#ec4899" strokeWidth={2.2} dot={false} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="jobViews" stroke="#f59e0b" strokeWidth={2.2} dot={false} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="profileUpdates" stroke="#10b981" strokeWidth={2.2} dot={false} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

export function ActivityVolumeArea({ data = [] }) {
  return (
    <ChartWrapper
      title="Activity Volume Trend"
      subtitle="Daily candidate activity events"
      height={240}
    >
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="actArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0' }} />
          <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#actArea)" activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}
