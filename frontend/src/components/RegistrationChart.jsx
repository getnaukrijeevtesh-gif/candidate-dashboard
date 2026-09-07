import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';

export function ChartWrapper({ title, subtitle, children, actions, height = 288 }) {
  return (
    <div className="card p-5 overflow-hidden">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-surface-900">{title}</h3>
          {subtitle && <p className="text-sm text-surface-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div style={{ height }}>{children}</div>
    </div>
  );
}

export default function RegistrationChart({ data = [], variant = 'area' }) {
  const total = data.reduce((a, b) => a + (b.registrations || 0), 0);
  return (
    <ChartWrapper
      title="Daily Candidate Registrations"
      subtitle={`${total.toLocaleString()} total · across selected period`}
    >
      <ResponsiveContainer>
        {variant === 'bar' ? (
          <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -12px rgba(2,6,23,0.15)' }} />
            <Bar dataKey="registrations" fill="#3464ff" radius={[8, 8, 0, 0]} />
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="regFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3464ff" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#3464ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -12px rgba(2,6,23,0.15)' }}
              cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 4' }}
            />
            <Area
              type="monotone"
              dataKey="registrations"
              stroke="#3464ff"
              strokeWidth={2.5}
              fill="url(#regFill)"
              activeDot={{ r: 5, fill: '#3464ff', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </ChartWrapper>
  );
}
