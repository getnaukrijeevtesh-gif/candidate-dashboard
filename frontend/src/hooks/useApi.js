import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  dashboardApi, candidateApi, activityApi, visitorApi, applicationApi, reportApi } from '../services/modules.js';

const DEFAULT_ERROR = 'Failed to fetch data';

function useApiCall(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  const refresh = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.resolve(fn())
      .then((res) => { if (!cancelled) setData(res.data ?? res); })
      .catch((err) => { if (!cancelled) setError(err?.response?.data?.message || err?.message || DEFAULT_ERROR); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line
  }, [...deps, attempt]);

  return { data, loading, error, refresh, setData };
}

export function useDashboardOverview(params) {
  const memoParams = useMemo(() => ({ ...params }), [params?.range, params?.startDate, params?.endDate]);
  return useApiCall(() => dashboardApi.getOverview(memoParams), [memoParams]);
}

export function useDashboardStats(params) {
  const memoParams = useMemo(() => ({ ...params }), [params?.range, params?.startDate, params?.endDate]);
  return useApiCall(() => dashboardApi.getStats(memoParams), [memoParams]);
}

export function useRegistrationTrend(params) {
  const memoParams = useMemo(() => ({ ...params }), [params?.range, params?.startDate, params?.endDate]);
  return useApiCall(() => dashboardApi.getRegistrationTrend(memoParams), [memoParams]);
}

export function useApplicationTrend(params) {
  const memoParams = useMemo(() => ({ ...params }), [params?.range, params?.startDate, params?.endDate]);
  return useApiCall(() => dashboardApi.getApplicationTrend(memoParams), [memoParams]);
}

export function useRecentActivities(params) {
  const memoParams = useMemo(() => ({ ...params }), [params?.range, params?.startDate, params?.endDate, params?.limit]);
  return useApiCall(() => dashboardApi.getRecentActivities(memoParams), [memoParams]);
}

export function useDailyRegistrations(params) {
  const memoParams = useMemo(() => ({ ...params }), [params?.range, params?.startDate, params?.endDate]);
  return useApiCall(() => dashboardApi.getDailyRegistrations(memoParams), [memoParams]);
}

export function useWeeklyRegistrations(params) {
  const memoParams = useMemo(() => ({ ...params }), [params?.range, params?.startDate, params?.endDate]);
  return useApiCall(() => dashboardApi.getWeeklyRegistrations(memoParams), [memoParams]);
}

export function useMonthlyGrowth() {
  return useApiCall(() => dashboardApi.getMonthlyGrowth(), []);
}

export function useActivityTrends(params) {
  const memoParams = useMemo(() => ({ ...params }), [params?.range, params?.startDate, params?.endDate]);
  return useApiCall(() => dashboardApi.getActivityTrends(memoParams), [memoParams]);
}

export function useApplicationTrends(params) {
  const memoParams = useMemo(() => ({ ...params }), [params?.range, params?.startDate, params?.endDate]);
  return useApiCall(() => dashboardApi.getApplicationTrends(memoParams), [memoParams]);
}

export function useCandidates(query) {
  const memoQuery = useMemo(() => ({ ...query }),
    [query?.page, query?.limit, query?.search, query?.status, query?.location,
     query?.sortBy, query?.sortOrder, query?.range, query?.startDate, query?.endDate]);
  return useApiCall(() => candidateApi.list(memoQuery), [memoQuery]);
}

export function useCandidateById(id) {
  return useApiCall(() => candidateApi.getById(id), [id]);
}

export function useActivities(query) {
  const memoQuery = useMemo(() => ({ ...query }),
    [query?.page, query?.limit, query?.activityType, query?.candidateSearch,
     query?.range, query?.startDate, query?.endDate]);
  return useApiCall(() => activityApi.list(memoQuery), [memoQuery]);
}

export function useActivityStats(params) {
  const memoParams = useMemo(() => ({ ...params }), [params?.range, params?.startDate, params?.endDate]);
  return useApiCall(() => activityApi.getStats(memoParams), [memoParams]);
}

export function useVisitorStats(params) {
  const memoParams = useMemo(() => ({ ...params }), [params?.range, params?.startDate, params?.endDate]);
  return useApiCall(() => visitorApi.getStats(memoParams), [memoParams]);
}

export function useVisitorTrends(params) {
  const memoParams = useMemo(() => ({ ...params }), [params?.range, params?.startDate, params?.endDate]);
  return useApiCall(() => visitorApi.getTrends(memoParams), [memoParams]);
}

export function useVisitorTopPages(params) {
  const memoParams = useMemo(() => ({ ...params }), [params?.range, params?.startDate, params?.endDate]);
  return useApiCall(() => visitorApi.getTopPages(memoParams), [memoParams]);
}

export function useVisitorBreakdown(params) {
  const memoParams = useMemo(() => ({ ...params }), [params?.range, params?.startDate, params?.endDate]);
  return useApiCall(() => visitorApi.getBreakdown(memoParams), [memoParams]);
}

export function useApplications(query) {
  const memoQuery = useMemo(() => ({ ...query }),
    [query?.page, query?.limit, query?.status, query?.search,
     query?.range, query?.startDate, query?.endDate]);
  return useApiCall(() => applicationApi.list(memoQuery), [memoQuery]);
}

export function useApplicationStats(params) {
  const memoParams = useMemo(() => ({ ...params }), [params?.range, params?.startDate, params?.endDate]);
  return useApiCall(() => applicationApi.getStats(memoParams), [memoParams]);
}

export function useReportSummary(params) {
  const memoParams = useMemo(() => ({ ...params }), [params?.range, params?.startDate, params?.endDate]);
  return useApiCall(() => reportApi.getSummary(memoParams), [memoParams]);
}
