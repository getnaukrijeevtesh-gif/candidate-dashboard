import React, { useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShieldCheck, Eye, Lock, Mail, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to={from} replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-surface-50">
      <div className="absolute inset-0 watermark pointer-events-none" />

      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-brand-600 via-violet-600 to-fuchsia-600 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[32rem] w-[32rem] rounded-full bg-fuchsia-400/30 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3 text-white">
            <div className="h-11 w-11 rounded-2xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight">AdminConsole</span>
          </div>
          <div className="space-y-6 max-w-md">
            <h1 className="text-4xl font-extrabold text-white leading-tight">
              Candidate Analytics Dashboard
            </h1>
            <p className="text-white/80 text-base leading-relaxed">
              Monitor registrations, track engagement, and gain data-driven insights across
              your entire candidate pipeline — all in one secure administrator workspace.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              {[
                { label: 'Live dashboards', Icon: LayoutDashboard },
                { label: 'Role-level access', Icon: ShieldCheck },
                { label: 'Visitor insights', Icon: Eye },
                { label: 'End-to-end encryption', Icon: Lock },
              ].map(({ label, Icon }) => (
                <div key={label} className="rounded-2xl bg-white/10 backdrop-blur border border-white/15 p-4 text-white">
                  <Icon className="h-5 w-5 mb-2 opacity-90" />
                  <div className="text-sm font-medium">{label}</div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm text-white/60">© {new Date().getFullYear()} AdminConsole · Secure access portal</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative z-10">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-surface-900">Welcome back</h2>
            <p className="text-surface-500 mt-1.5">Sign in with your administrator credentials</p>
          </div>

          <form onSubmit={onSubmit} className="card p-7 space-y-5">
            {error && (
              <div className="flex gap-2 items-start rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-700 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
                <input
                  type="email"
                  required
                  className="input pl-10"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
                <input
                  type="password"
                  required
                  className="input pl-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base bg-brand-gradient">
              {loading ? (
                <span className="h-5 w-5 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
              ) : 'Sign in to dashboard'}
            </button>

            <div className="rounded-xl bg-surface-50 border border-surface-200 p-3.5 text-xs text-surface-500 leading-relaxed">
              <div className="font-medium text-surface-700 mb-1">Demo credentials</div>
              admin@example.com &nbsp;·&nbsp; Admin@123
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
