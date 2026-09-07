const MS_PER_DAY = 86400000;

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.getTime());

const toDate = (value) => {
  if (value == null) return null;
  if (value instanceof Date) return new Date(value.getTime());
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isValidDate(d) ? d : null;
  }
  return null;
};

export const startOfDay = (date = new Date()) => {
  const d = toDate(date) || new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const endOfDay = (date = new Date()) => {
  const d = toDate(date) || new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

export const startOfToday = () => startOfDay();
export const endOfToday = () => endOfDay();

export const startOfYesterday = () => startOfDay(new Date(Date.now() - MS_PER_DAY));
export const endOfYesterday = () => endOfDay(new Date(Date.now() - MS_PER_DAY));

export const startOfNDaysAgo = (n, endExclusive = true) => {
  const d = new Date();
  d.setDate(d.getDate() - (endExclusive ? n - 1 : n));
  return startOfDay(d);
};

export const startOfMonth = (date = new Date()) => {
  const d = toDate(date) || new Date();
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
};

export const endOfMonth = (date = new Date()) => {
  const d = toDate(date) || new Date();
  return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
};

export const startOfWeek = (date = new Date()) => {
  const d = startOfDay(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
};

export const endOfWeek = (date = new Date()) => {
  const s = startOfWeek(date);
  return endOfDay(new Date(s.getTime() + 6 * MS_PER_DAY));
};

export const startOfPreviousMonth = () => {
  const now = new Date();
  return startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
};

export const endOfPreviousMonth = () => endOfMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 0));

export const VALID_RANGES = ['today', 'yesterday', 'last7days', 'last30days', '7d', '30d', 'thisMonth', 'lastMonth', 'custom', 'all', 'allTime'];

export const parseRange = (range, startDate, endDate) => {
  const now = new Date();
  const key = String(range || '').trim() || 'last30days';
  switch (key) {
    case 'today':
      return { start: startOfToday(), end: endOfToday() };
    case 'yesterday':
      return { start: startOfYesterday(), end: endOfYesterday() };
    case 'last7days':
    case '7d':
      return { start: startOfNDaysAgo(7), end: endOfToday() };
    case 'last30days':
    case '30d':
      return { start: startOfNDaysAgo(30), end: endOfToday() };
    case 'thisMonth':
      return { start: startOfMonth(now), end: endOfDay(now) };
    case 'lastMonth':
      return { start: startOfPreviousMonth(), end: endOfPreviousMonth() };
    case 'all':
    case 'allTime': {
      const epoch = new Date(0);
      epoch.setUTCFullYear(2000);
      return { start: startOfDay(epoch), end: endOfToday() };
    }
    case 'custom': {
      const s = toDate(startDate);
      const e = toDate(endDate);
      const start = s ? startOfDay(s) : startOfNDaysAgo(30);
      const end = e ? endOfDay(e) : endOfToday();
      return start <= end ? { start, end } : { start: end, end: start };
    }
    default:
      return { start: startOfNDaysAgo(30), end: endOfToday() };
  }
};

export const validateAndParseRange = (range, startDate, endDate) => {
  if (range && !VALID_RANGES.includes(range)) {
    return { error: `Invalid range preset. Use one of: ${VALID_RANGES.join(', ')}` };
  }
  if (range === 'custom') {
    const s = toDate(startDate);
    const e = toDate(endDate);
    if (startDate && !s) return { error: 'Invalid startDate. Expected ISO date (YYYY-MM-DD).' };
    if (endDate && !e) return { error: 'Invalid endDate. Expected ISO date (YYYY-MM-DD).' };
    if (s && e && s > e) return { error: 'startDate cannot be after endDate.' };
    const span = (Math.abs((e?.getTime() || endOfToday().getTime()) - (s?.getTime() || startOfNDaysAgo(30).getTime())) / MS_PER_DAY) + 1;
    if (span > 365 * 5) return { error: 'Date range is too wide. Maximum 5 years.' };
  }
  return { value: parseRange(range, startDate, endDate) };
};

export const getPreviousRange = (start, end) => {
  const duration = Math.max(1, end.getTime() - start.getTime() + 1);
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - duration + 1);
  return { start: prevStart, end: prevEnd };
};

export const formatDateKey = (date) => {
  const d = toDate(date) || new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const formatWeekKey = (date) => {
  const d = toDate(date) || new Date();
  const year = d.getFullYear();
  const onejan = new Date(year, 0, 1);
  const week = Math.ceil((((d - onejan) / MS_PER_DAY) + onejan.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
};

export const formatMonthKey = (date) => {
  const d = toDate(date) || new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const formatDayLabel = (date) => {
  const d = toDate(date) || new Date();
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
};

export const formatWeekLabel = (date) => {
  const s = startOfWeek(date);
  const e = endOfWeek(date);
  return `${MONTH_NAMES[s.getMonth()]} ${s.getDate()} – ${MONTH_NAMES[e.getMonth()]} ${e.getDate()}`;
};

export const formatMonthLabel = (date) => {
  const d = toDate(date) || new Date();
  return `${MONTH_NAMES[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`;
};

export const formatDayName = (date) => DAY_NAMES[(toDate(date) || new Date()).getDay()];

export const daysBetween = (start, end) => {
  const result = [];
  const s = startOfDay(start);
  const e = endOfDay(end);
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) result.push(new Date(d));
  return result;
};

export const weeksBetween = (start, end) => {
  const result = [];
  let d = startOfWeek(start);
  const stop = endOfWeek(end);
  while (d <= stop) {
    result.push(new Date(d));
    d = new Date(d.getTime() + 7 * MS_PER_DAY);
  }
  return result;
};

export const monthsBetween = (start, end) => {
  const result = [];
  const s = startOfMonth(start);
  const e = endOfMonth(end);
  let d = new Date(s);
  while (d <= e) {
    result.push(new Date(d));
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  return result;
};

export const rangeBucketStrategy = (start, end) => {
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1);
  if (days <= 60) return { bucket: 'day', formatKey: formatDateKey, formatLabel: formatDayLabel, iter: daysBetween };
  if (days <= 365) return { bucket: 'week', formatKey: formatWeekKey, formatLabel: formatWeekLabel, iter: weeksBetween };
  return { bucket: 'month', formatKey: formatMonthKey, formatLabel: formatMonthLabel, iter: monthsBetween };
};

export const safeDivide = (a, b) => {
  const bNum = Number(b);
  if (!Number.isFinite(bNum) || bNum === 0) return 0;
  const aNum = Number(a);
  if (!Number.isFinite(aNum)) return 0;
  return aNum / bNum;
};

export const growthPercent = (current, previous) => {
  const c = Number(current);
  const p = Number(previous);
  if (!Number.isFinite(c) || !Number.isFinite(p)) return 0;
  if (p === 0 && c === 0) return 0;
  if (p === 0) return c > 0 ? 100 : 0;
  const pct = ((c - p) / Math.abs(p)) * 100;
  if (!Number.isFinite(pct)) return 0;
  return Math.max(-1000000, Math.min(1000000, pct));
};

export const clamp = (value, min, max) => Math.max(min, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : min));

export const toFixedNumber = (value, digits = 2) => {
  const v = Number(value);
  if (!Number.isFinite(v)) return 0;
  return Number(v.toFixed(digits));
};
