import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import clsx from 'clsx';

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen flex bg-surface-50">
      <div className="hidden lg:block shrink-0">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-surface-900/50 backdrop-blur-sm animate-in fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85%] animate-in slide-in-from-left">
            <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          onToggleSidebar={() => {
            if (window.innerWidth < 1024) {
              setMobileOpen(o => !o);
            } else {
              setCollapsed(c => !c);
            }
          }}
        />
        <main className={clsx('flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-[1600px] mx-auto', 'watermark')}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
