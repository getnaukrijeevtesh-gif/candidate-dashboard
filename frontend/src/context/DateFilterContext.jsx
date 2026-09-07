import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { format } from 'date-fns';

const DateFilterContext = createContext(null);

const PRESETS = [
  { value: 'allTime', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'custom', label: 'Custom Range' },
];

export function DateFilterProvider({ children }) {
  const [range, setRange] = useState('30d');
  const [customStart, setCustomStart] = useState(null);
  const [customEnd, setCustomEnd] = useState(null);

  const setCustom = useCallback((start, end) => {
    setRange('custom');
    setCustomStart(start);
    setCustomEnd(end);
  }, []);

  const params = useMemo(() => {
    const base = { range };
    if (range === 'custom') {
      if (customStart) base.startDate = format(new Date(customStart), 'yyyy-MM-dd');
      if (customEnd) base.endDate = format(new Date(customEnd), 'yyyy-MM-dd');
    }
    return base;
  }, [range, customStart, customEnd]);

  const reset = useCallback(() => {
    setRange('30d');
    setCustomStart(null);
    setCustomEnd(null);
  }, []);

  const value = useMemo(() => ({
    range, setRange,
    customStart, customEnd, setCustom,
    params, presets: PRESETS, reset,
  }), [range, customStart, customEnd, setCustom, params, reset]);

  return <DateFilterContext.Provider value={value}>{children}</DateFilterContext.Provider>;
}

export const useDateFilter = () => {
  const ctx = useContext(DateFilterContext);
  if (!ctx) throw new Error('useDateFilter must be used within DateFilterProvider');
  return ctx;
};

export default DateFilterContext;
