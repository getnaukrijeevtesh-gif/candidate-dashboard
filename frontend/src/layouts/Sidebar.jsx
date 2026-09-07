import React from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import {
  LayoutDashboard, Users, TrendingUp, Activity as ActivityIcon, Eye,
  FileText, BarChart3, Settings, ChevronLeft, ChevronRight, ShieldCheck,
} from 'lucide-react';

const sections = [
  {
    title: 'Main',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard Overview', end: true },
      { to: '/candidates', icon: Users, label: 'Candidates' },
      { to: '/registration-analytics', icon: TrendingUp, label: 'Registration Analytics' },
      { to: '/activities', icon: ActivityIcon, label: 'Candidate Activities' },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { to: '/visitors', icon: Eye, label: 'Visitor Analytics' },
      { to: '/applications', icon: FileText, label: 'Job Applications' },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/reports', icon: BarChart3, label: 'Reports' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle, onNavigate }) {
  const handleClick = () => onNavigate?.();
  return (
    <aside className={clsx(
      'sticky top-0 h-screen shrink-0 bg-white border-r border-surface-200 transition-all duration-300 flex flex-col',
      collapsed ? 'w-[76px]' : 'w-64',
    )}>
      <div className={clsx('h-16 flex items-center gap-3 px-4 border-b border-surface-100')}>
        <div className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-brand-600 via-violet-600 to-fuchsia-600 text-white flex items-center justify-center shadow-sm">
          <ShieldCheck className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-surface-900">AdminConsole</span>
            <span className="text-[11px] text-surface-500">Candidate Analytics</span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3 space-y-6">
        {sections.map((sec) => (
          <div key={sec.title}>
            {!collapsed && (
              <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-surface-400">
                {sec.title}
              </div>
            )}
            <ul className="space-y-1">
              {sec.items.map(({ to, icon: Icon, label, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={handleClick}
                    className={({ isActive }) => clsx(collapsed && 'justify-center',
                      isActive ? 'sidebar-link-active' : 'sidebar-link'
                    )}
                    title={collapsed ? label : undefined}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-surface-100 p-3">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-surface-500 hover:bg-surface-100 hover:text-surface-800 transition"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /><span className="text-sm font-medium">Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}
