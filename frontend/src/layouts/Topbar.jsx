import React, { useState, useRef, useEffect } from 'react';
import {
  Bell, Search, LogOut, User as UserIcon, Settings as SettingsIcon,
  ChevronDown, Menu, FileText, Activity, Users, Eye,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar.jsx';
import DateFilterPicker from '../components/DateFilterPicker.jsx';

const sampleNotifications = [
  { id: 1, type: 'registration', title: '5 new candidates registered today', time: '2h ago', Icon: Users, color: 'text-brand-600' },
  { id: 2, type: 'application', title: '12 new job applications received', time: '3h ago', Icon: FileText, color: 'text-violet-600' },
  { id: 3, type: 'activity', title: 'Candidate activity spike detected', time: '5h ago', Icon: Activity, color: 'text-amber-600' },
  { id: 4, type: 'visitor', title: 'Visitor traffic increased by 24%', time: '1d ago', Icon: Eye, color: 'text-emerald-600' },
];

export default function Topbar({ onToggleSidebar, showDateFilter = true }) {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const doc = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', doc);
    return () => document.removeEventListener('mousedown', doc);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const initials = admin?.name || 'Admin';

  return (
    <header className="sticky top-0 z-40 h-16 bg-white/80 backdrop-blur border-b border-surface-200 flex items-center gap-3 px-4 sm:px-6">
      <button onClick={onToggleSidebar} className="lg:hidden btn-ghost !p-2" title="Toggle sidebar">
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden md:flex items-center relative flex-1 max-w-md">
        <Search className="absolute left-3 h-4 w-4 text-surface-500" />
        <input
          placeholder="Quick search candidates, applications, reports…"
          className="input pl-10 !py-2 bg-surface-50 !border-surface-200 focus:bg-white"
        />
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {showDateFilter && <DateFilterPicker />}

        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen(o => !o)}
            className="btn-ghost !p-2 relative"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>

          {notifOpen && (
            <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl bg-white border border-surface-200 shadow-xl overflow-hidden animate-in fade-in">
              <div className="px-4 py-3 border-b border-surface-100 flex items-center justify-between">
                <div className="font-semibold text-surface-900">Notifications</div>
                <button className="text-xs font-medium text-brand-600 hover:underline">Mark all read</button>
              </div>
              <ul className="max-h-80 overflow-y-auto scrollbar-thin">
                {sampleNotifications.map((n) => (
                  <li key={n.id} className="flex gap-3 px-4 py-3 border-b border-surface-50 hover:bg-surface-50 cursor-pointer transition">
                    <div className={clsx('h-9 w-9 shrink-0 rounded-xl bg-surface-50 flex items-center justify-center', n.color)}>
                      <n.Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-surface-800 leading-snug">{n.title}</div>
                      <div className="text-xs text-surface-500 mt-0.5">{n.time}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="px-4 py-3 border-t border-surface-100">
                <button className="w-full text-sm font-medium text-brand-600 hover:underline text-left">View all notifications</button>
              </div>
            </div>
          )}
        </div>

        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen(o => !o)}
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-surface-50 transition"
          >
            <Avatar name={initials} src={admin?.avatar} size="sm" />
            <div className="hidden sm:block text-left leading-tight">
              <div className="text-sm font-semibold text-surface-800">{admin?.name || 'Admin'}</div>
              <div className="text-[11px] text-surface-500 capitalize">{admin?.role || 'Administrator'}</div>
            </div>
            <ChevronDown className={clsx('hidden sm:block h-4 w-4 text-surface-400 transition', profileOpen && 'rotate-180')} />
          </button>

          {profileOpen && (
            <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl bg-white border border-surface-200 shadow-xl overflow-hidden animate-in fade-in">
              <div className="px-4 py-4 bg-gradient-to-br from-brand-50 via-violet-50 to-fuchsia-50 border-b border-surface-100">
                <div className="flex items-center gap-3">
                  <Avatar name={initials} src={admin?.avatar} size="lg" />
                  <div className="min-w-0">
                    <div className="font-semibold text-surface-900 truncate">{admin?.name || 'Admin'}</div>
                    <div className="text-xs text-surface-600 truncate">{admin?.email}</div>
                    <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider bg-white/70 text-brand-700 px-2 py-0.5 rounded-full ring-1 ring-white">
                      {admin?.role || 'Admin'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-2">
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-surface-50 text-sm text-surface-700 transition">
                  <UserIcon className="h-4 w-4 text-surface-500" />
                  My Profile
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-surface-50 text-sm text-surface-700 transition">
                  <SettingsIcon className="h-4 w-4 text-surface-500" />
                  Admin Settings
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-surface-50 text-sm text-surface-700 transition">
                  <Users className="h-4 w-4 text-surface-500" />
                  Manage Team
                </button>
              </div>
              <div className="border-t border-surface-100 p-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-rose-50 text-sm text-rose-600 transition"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
