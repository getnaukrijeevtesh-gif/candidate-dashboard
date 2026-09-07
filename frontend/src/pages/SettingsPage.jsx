import React, { useState } from 'react';
import {
  Bell, Shield, Palette, Database, User as UserIcon, Eye, Lock, Users,
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import Avatar from '../components/Avatar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import clsx from 'clsx';

const SECTIONS = [
  { id: 'profile', label: 'Admin Profile', Icon: UserIcon },
  { id: 'security', label: 'Security', Icon: Lock },
  { id: 'notifications', label: 'Notifications', Icon: Bell },
  { id: 'access', label: 'Access & Permissions', Icon: Shield },
  { id: 'tracking', label: 'Tracking Settings', Icon: Eye },
  { id: 'appearance', label: 'Appearance', Icon: Palette },
  { id: 'system', label: 'System & Database', Icon: Database },
];

export default function SettingsPage() {
  const { admin } = useAuth();
  const [active, setActive] = useState('profile');
  const [settings, setSettings] = useState({
    emailAlerts: true,
    candidateSignup: true,
    weeklyDigest: false,
    newApplications: true,
    unusualActivity: true,
    trackVisitors: true,
    trackActivities: true,
    trackJobViews: true,
    maskEmails: false,
  });

  const toggle = (k) => setSettings(s => ({ ...s, [k]: !s[k] }));

  const Switch = ({ on }) => (
    <button onClick={() => {}} className={clsx('relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500', on ? 'bg-brand-600' : 'bg-surface-200')}>
      <span className={clsx('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out', on ? 'translate-x-5' : 'translate-x-0')} />
    </button>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        subtitle="Manage your profile, security preferences, and platform-wide behavior"
        breadcrumbs={['Home', 'Settings']}
      />

      <div className="flex flex-col lg:flex-row gap-5">
        <aside className="lg:w-64 shrink-0">
          <nav className="card p-2 space-y-1 sticky top-20">
            {SECTIONS.map(s => (
              <button key={s.id}
                onClick={() => setActive(s.id)}
                className={clsx('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition',
                  active === s.id ? 'bg-brand-50 text-brand-700' : 'text-surface-600 hover:bg-surface-50')}>
                <s.Icon className="h-4.5 w-4.5" /> {s.label}
              </button>
            ))}
          </nav>
        </aside>

        <section className="flex-1 space-y-5">
          {active === 'profile' && (
            <div className="card p-5 sm:p-6">
              <h3 className="font-semibold text-surface-900 mb-5">Admin Profile</h3>
              <div className="flex items-start gap-5 mb-6">
                <Avatar name={admin?.name || 'Admin'} src={admin?.avatar} size="2xl" />
                <div>
                  <button className="btn-secondary !py-1.5 text-xs">Upload photo</button>
                  <p className="text-xs text-surface-500 mt-2">JPG or PNG. Max size 5 MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-surface-700 mb-1.5">Full name</label><input className="input" defaultValue={admin?.name} /></div>
                <div><label className="block text-sm font-medium text-surface-700 mb-1.5">Email</label><input className="input" defaultValue={admin?.email} /></div>
                <div><label className="block text-sm font-medium text-surface-700 mb-1.5">Role</label><input className="input bg-surface-50" defaultValue={admin?.role || 'admin'} readOnly /></div>
                <div><label className="block text-sm font-medium text-surface-700 mb-1.5">Phone</label><input className="input" placeholder="Optional" /></div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button className="btn-secondary">Cancel</button>
                <button className="btn-primary">Save changes</button>
              </div>
            </div>
          )}

          {active === 'security' && (
            <div className="card p-5 sm:p-6 space-y-6">
              <h3 className="font-semibold text-surface-900">Security</h3>
              <div>
                <div className="font-medium text-surface-800 mb-1">Change password</div>
                <div className="text-sm text-surface-500 mb-4">Strong passwords mix letters, numbers, and symbols.</div>
                <div className="grid grid-cols-1 gap-3 max-w-md">
                  <input className="input" type="password" placeholder="Current password" />
                  <input className="input" type="password" placeholder="New password" />
                  <input className="input" type="password" placeholder="Confirm new password" />
                </div>
                <div className="mt-4"><button className="btn-primary">Update password</button></div>
              </div>
              <div className="pt-4 border-t border-surface-100 flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-surface-800">Two-factor authentication (2FA)</div>
                  <div className="text-sm text-surface-500">Extra layer of security using authenticator app or SMS.</div>
                </div>
                <Switch on={false} />
              </div>
            </div>
          )}

          {active === 'notifications' && (
            <div className="card p-5 sm:p-6 space-y-4">
              <h3 className="font-semibold text-surface-900">Email notifications</h3>
              {[
                ['newApplications', 'New job applications', 'Alert when a candidate submits an application.'],
                ['candidateSignup', 'New candidate sign-ups', 'Daily digest of new registrations.'],
                ['weeklyDigest', 'Weekly analytics digest', 'Monday summary of key metrics.'],
                ['unusualActivity', 'Unusual activity alerts', 'Notify on spikes, logins from new locations.'],
              ].map(([k, title, desc]) => (
                <div key={k} className="flex items-start justify-between gap-4 p-3 rounded-xl border border-surface-100 bg-surface-50/50">
                  <div>
                    <div className="font-medium text-surface-800">{title}</div>
                    <div className="text-sm text-surface-500">{desc}</div>
                  </div>
                  <button onClick={() => toggle(k)}>
                    <Switch on={settings[k]} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {active === 'access' && (
            <div className="card p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-surface-900">Admin team</h3>
                  <p className="text-sm text-surface-500">Invite and manage admin users and role-based access.</p>
                </div>
                <button className="btn-primary"><Users className="h-4 w-4" /> Invite admin</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr>
                    <th className="table-header">User</th>
                    <th className="table-header">Role</th>
                    <th className="table-header">Last active</th>
                    <th className="table-header text-right">Actions</th>
                  </tr></thead>
                  <tbody>
                    <tr>
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <Avatar name={admin?.name || 'Super Admin'} src={admin?.avatar} />
                          <div>
                            <div className="font-medium">{admin?.name || 'Super Admin'}</div>
                            <div className="text-xs text-surface-500">{admin?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell"><span className="badge bg-brand-50 text-brand-700 ring-1 ring-brand-200">superadmin</span></td>
                      <td className="table-cell text-sm text-surface-500">Just now</td>
                      <td className="table-cell text-right"><button className="btn-secondary !py-1.5 text-xs">Edit</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {active === 'tracking' && (
            <div className="card p-5 sm:p-6 space-y-4">
              <h3 className="font-semibold text-surface-900">Tracking & data collection</h3>
              <p className="text-sm text-surface-500">Only toggle off if necessary as it will affect analytics accuracy.</p>
              {[
                ['trackVisitors', 'Website visitor tracking', 'Track anonymous & logged-in page visits.'],
                ['trackActivities', 'Candidate activity tracking', 'Store registration, login, profile, job actions.'],
                ['trackJobViews', 'Job view tracking', 'Track individual job listing views.'],
                ['maskEmails', 'Mask emails in exports', 'Privacy: hide raw email values in CSVs and PDFs.'],
              ].map(([k, title, desc]) => (
                <div key={k} className="flex items-start justify-between gap-4 p-3 rounded-xl border border-surface-100 bg-surface-50/50">
                  <div>
                    <div className="font-medium text-surface-800">{title}</div>
                    <div className="text-sm text-surface-500">{desc}</div>
                  </div>
                  <button onClick={() => toggle(k)}><Switch on={settings[k]} /></button>
                </div>
              ))}
            </div>
          )}

          {active === 'appearance' && (
            <div className="card p-5 sm:p-6 space-y-4">
              <h3 className="font-semibold text-surface-900">Appearance</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { id: 'brand', title: 'Brand Blue', bg: 'bg-gradient-to-br from-brand-500 to-violet-500' },
                  { id: 'emerald', title: 'Emerald', bg: 'bg-gradient-to-br from-emerald-500 to-teal-500' },
                  { id: 'amber', title: 'Amber', bg: 'bg-gradient-to-br from-amber-500 to-orange-500' },
                  { id: 'rose', title: 'Rose', bg: 'bg-gradient-to-br from-rose-500 to-pink-500' },
                  { id: 'fuchsia', title: 'Fuchsia', bg: 'bg-gradient-to-br from-fuchsia-500 to-violet-500' },
                  { id: 'slate', title: 'Slate', bg: 'bg-gradient-to-br from-slate-700 to-slate-900' },
                ].map(t => (
                  <button key={t.id} className="rounded-2xl border-2 border-surface-100 hover:border-brand-500 transition p-3 text-left">
                    <div className={clsx('h-16 rounded-xl mb-3', t.bg)} />
                    <div className="text-sm font-medium text-surface-800">{t.title}</div>
                    <div className="text-xs text-surface-500 mt-0.5">Primary accent</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {active === 'system' && (
            <div className="card p-5 sm:p-6 space-y-4">
              <h3 className="font-semibold text-surface-900">System & database</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-surface-100 bg-surface-50/60 p-4">
                  <div className="text-xs font-medium text-surface-500 uppercase tracking-wide">Database</div>
                  <div className="mt-1 font-semibold text-surface-900">MongoDB · Connected</div>
                  <div className="text-xs text-surface-500 mt-1">Connection pool healthy</div>
                </div>
                <div className="rounded-2xl border border-surface-100 bg-surface-50/60 p-4">
                  <div className="text-xs font-medium text-surface-500 uppercase tracking-wide">Server</div>
                  <div className="mt-1 font-semibold text-surface-900">Node.js · Express</div>
                  <div className="text-xs text-surface-500 mt-1">Port 5000 · Running</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button className="btn-secondary">Run analytics vacuum</button>
                <button className="btn-secondary">Rebuild indexes</button>
                <button className="btn-secondary">Backup database</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
