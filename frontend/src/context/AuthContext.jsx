import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import api, { authApi } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('admin_token') || null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('admin_user');
    if (saved && token) {
      try { setAdmin(JSON.parse(saved)); } catch { /* ignore */ }
    }
    setIsLoading(false);
  }, [token]);

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.post('/login', { email, password });
    setToken(data.token);
    setAdmin(data.admin);
    localStorage.setItem('admin_token', data.token);
    localStorage.setItem('admin_user', JSON.stringify(data.admin));
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.post('/logout'); } catch { /* ignore */ }
    setToken(null);
    setAdmin(null);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const { data } = await authApi.get('/profile');
      setAdmin(data.admin);
      localStorage.setItem('admin_user', JSON.stringify(data.admin));
    } catch { /* ignore */ }
  }, []);

  const value = useMemo(() => ({
    admin, token, isAuthenticated: !!token, isLoading, login, logout, refreshProfile,
  }), [admin, token, isLoading, login, logout, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
