import mongoose from 'mongoose';
import {
  parseRange,
  validateAndParseRange,
  getPreviousRange,
  growthPercent,
  safeDivide,
  toFixedNumber,
  clamp,
  startOfDay,
  endOfDay,
  startOfNDaysAgo,
  startOfToday,
  endOfToday,
  startOfYesterday,
  endOfYesterday,
  startOfMonth,
  startOfPreviousMonth,
  endOfPreviousMonth,
  rangeBucketStrategy,
  formatDateKey,
  formatWeekKey,
  formatMonthKey,
  formatDayLabel,
  formatWeekLabel,
  formatMonthLabel,
  daysBetween,
} from '../utils/dateUtils.js';

const MS_PER_DAY = 86400000;
const ACTIVE_WINDOW_DAYS = 30;
const Y2K = new Date(Date.UTC(2000, 0, 1));

const clampStart = (d) => (d < Y2K ? new Date(Y2K.getTime()) : new Date(d.getTime()));

const db = () => mongoose.connection.db;

const coll = (name) => db().collection(name);

const firstAgg = (pipelineResult, fallback) =>
  Array.isArray(pipelineResult) && pipelineResult[0] ? pipelineResult[0] : fallback;

const parseLimit = (value, def = 10, min = 1, max = 200) => clamp(value, min, max);

const buildPresetRanges = () => {
  const now = new Date();
  return {
    today: { start: startOfToday(), end: endOfToday() },
    yesterday: { start: startOfYesterday(), end: endOfYesterday() },
    last7Days: { start: startOfNDaysAgo(7), end: endOfToday() },
    last30Days: { start: startOfNDaysAgo(30), end: endOfToday() },
    thisMonth: { start: startOfMonth(now), end: endOfToday() },
    lastMonth: { start: startOfPreviousMonth(), end: endOfPreviousMonth() },
  };
};

const countInRangeNative = async (collectionName, field, start, end, extraFilter = {}) => {
  const s = clampStart(start);
  const filter = {
    ...extraFilter,
    [field]: { $gte: s, $lte: end },
  };
  try {
    return await coll(collectionName).countDocuments(filter);
  } catch {
    return 0;
  }
};

const estimatedCountSafe = async (collectionName) => {
  try {
    return await coll(collectionName).estimatedDocumentCount();
  } catch {
    try {
      return await coll(collectionName).countDocuments({});
    } catch {
      return 0;
    }
  }
};

const buildActiveWindow = (windowDays = ACTIVE_WINDOW_DAYS, endDate = new Date()) => {
  const end = endOfDay(endDate);
  const start = startOfDay(new Date(end.getTime() - (windowDays - 1) * MS_PER_DAY));
  return { start, end, windowDays };
};

const countActiveCandidates = async (start, end) => {
  const s = clampStart(start);
  const active = new Set();
  try {
    const userIds = await coll('users')
      .find(
        {
          role: 'jobseeker',
          $or: [
            { createdAt: { $gte: s, $lte: end } },
            { updatedAt: { $gte: s, $lte: end } },
            { lastLoginAt: { $gte: s, $lte: end } },
            { lastActivityAt: { $gte: s, $lte: end } },
          ],
        },
        { projection: { _id: 1 }, batchSize: 1000 },
      )
      .toArray();
    userIds.forEach((u) => active.add(String(u._id)));
  } catch {}
  try {
    const ids = await coll('applications').distinct('applicant', {
      createdAt: { $gte: s, $lte: end },
    });
    ids.forEach((id) => active.add(String(id)));
  } catch {}
  try {
    const ids = await coll('savedjobs').distinct('jobseeker', {
      createdAt: { $gte: s, $lte: end },
    });
    ids.forEach((id) => active.add(String(id)));
  } catch {}
  try {
    const ids = await coll('payments').distinct('userId', {
      createdAt: { $gte: s, $lte: end },
    });
    ids.forEach((id) => active.add(String(id)));
  } catch {}
  try {
    const ids = await coll('candidateactivities').distinct('candidateId', {
      createdAt: { $gte: s, $lte: end },
    });
    ids.forEach((id) => active.add(String(id)));
  } catch {}
  try {
    const candIds = await coll('candidates')
      .find(
        {
          $or: [
            { lastActivityAt: { $gte: s, $lte: end } },
            { lastLoginAt: { $gte: s, $lte: end } },
          ],
        },
        { projection: { _id: 1 }, batchSize: 1000 },
      )
      .toArray();
    candIds.forEach((c) => active.add(`cand_${String(c._id)}`));
  } catch {}
  return active.size;
};

const mapAppStatus = (status) => {
  switch (status) {
    case 'Applied':
      return 'pending';
    case 'In Review':
      return 'reviewing';
    case 'Accepted':
      return 'hired';
    case 'Rejected':
      return 'rejected';
    default:
      return null;
  }
};

const buildTrendGroupStage = (dateField, bucket) => {
  const id = {};
  if (bucket === 'day') {
    id.year = { $year: dateField };
    id.month = { $month: dateField };
    id.day = { $dayOfMonth: dateField };
  } else if (bucket === 'week') {
    id.year = { $isoWeekYear: dateField };
    id.week = { $isoWeek: dateField };
  } else {
    id.year = { $year: dateField };
    id.month = { $month: dateField };
  }
  return { $group: { _id: id, count: { $sum: 1 } } };
};

const trendKeyFromId = (id, bucket) => {
  if (bucket === 'day') return `${id.year}-${String(id.month).padStart(2, '0')}-${String(id.day).padStart(2, '0')}`;
  if (bucket === 'week') return `${id.year}-W${String(id.week).padStart(2, '0')}`;
  return `${id.year}-${String(id.month).padStart(2, '0')}`;
};

const buildRegistrationTrend = async (start, end) => {
  const s = clampStart(start);
  const strategy = rangeBucketStrategy(s, end);
  const { bucket, formatKey, formatLabel, iter } = strategy;
  try {
    const rawGroups = await coll('users')
      .aggregate([
        {
          $match: {
            role: 'jobseeker',
            createdAt: { $gte: s, $lte: end },
          },
        },
        buildTrendGroupStage('$createdAt', bucket),
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1, '_id.day': 1 } },
      ])
      .toArray();

    const map = {};
    rawGroups.forEach((g) => {
      map[trendKeyFromId(g._id, bucket)] = g.count;
    });
    const buckets = iter(start, end);
    return {
      bucket,
      items: buckets.map((d) => {
        const key = formatKey(d);
        return {
          key,
          label: formatLabel(d),
          date: d.toISOString(),
          count: map[key] ?? 0,
          registrations: map[key] ?? 0,
        };
      }),
    };
  } catch {
    const buckets = iter(start, end);
    return {
      bucket: strategy.bucket,
      items: buckets.map((d) => ({
        key: strategy.formatKey(d),
        label: strategy.formatLabel(d),
        date: d.toISOString(),
        count: 0,
        registrations: 0,
      })),
    };
  }
};

const buildApplicationTrend = async (start, end) => {
  const s = clampStart(start);
  const strategy = rangeBucketStrategy(s, end);
  const { bucket, formatKey, formatLabel, iter } = strategy;
  try {
    const rawGroups = await coll('applications')
      .aggregate([
        {
          $match: {
            createdAt: { $gte: s, $lte: end },
          },
        },
        buildTrendGroupStage('$createdAt', bucket),
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1, '_id.day': 1 } },
      ])
      .toArray();

    const map = {};
    rawGroups.forEach((g) => {
      map[trendKeyFromId(g._id, bucket)] = g.count;
    });
    const buckets = iter(start, end);
    return {
      bucket,
      items: buckets.map((d) => {
        const key = formatKey(d);
        return {
          key,
          label: formatLabel(d),
          date: d.toISOString(),
          count: map[key] ?? 0,
          applications: map[key] ?? 0,
        };
      }),
    };
  } catch {
    const buckets = iter(start, end);
    return {
      bucket: strategy.bucket,
      items: buckets.map((d) => ({
        key: strategy.formatKey(d),
        label: strategy.formatLabel(d),
        date: d.toISOString(),
        count: 0,
        applications: 0,
      })),
    };
  }
};

const getStatusDistribution = async () => {
  try {
    const raw = await coll('applications')
      .aggregate([
        { $match: { createdAt: { $gte: Y2K } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $project: { status: '$_id', count: 1, _id: 0 } },
        { $sort: { count: -1 } },
      ])
      .toArray();

    const mapped = { pending: 0, reviewing: 0, shortlisted: 0, interview: 0, rejected: 0, hired: 0 };
    raw.forEach((r) => {
      const m = mapAppStatus(r.status);
      if (m) mapped[m] += r.count;
    });
    return Object.entries(mapped).map(([status, count]) => ({ status, count }));
  } catch {
    return [
      { status: 'pending', count: 0 },
      { status: 'reviewing', count: 0 },
      { status: 'shortlisted', count: 0 },
      { status: 'interview', count: 0 },
      { status: 'rejected', count: 0 },
      { status: 'hired', count: 0 },
    ];
  }
};

const countUniqueApplicantsInRange = async (start, end) => {
  try {
    const s = clampStart(start);
    const result = await coll('applications')
      .aggregate([
        {
          $match: {
            createdAt: { $gte: s, $lte: end },
          },
        },
        { $group: { _id: '$applicant' } },
        { $count: 'count' },
      ])
      .toArray();
    return result[0]?.count ?? 0;
  } catch {
    return 0;
  }
};

const registrationPipelinesNative = async (selected) => {
  const presets = buildPresetRanges();
  const allRanges = {
    selected,
    today: presets.today,
    yesterday: presets.yesterday,
    last7Days: presets.last7Days,
    last30Days: presets.last30Days,
    thisMonth: presets.thisMonth,
    lastMonth: presets.lastMonth,
  };
  const result = {};
  for (const [key, r] of Object.entries(allRanges)) {
    result[key] = [
      {
        count: await countInRangeNative('users', 'createdAt', r.start, r.end, { role: 'jobseeker' }),
      },
    ];
  }
  return [result];
};

const synthesizeActivities = async (start, end, limit) => {
  try {
    const hasRange = start && end;
    const s = hasRange ? clampStart(start) : Y2K;
    const dateFilter = (field) =>
      hasRange ? { [field]: { $gte: s, $lte: end } } : { [field]: { $gte: Y2K } };

    const [realActivities, regActs, appActs, saveActs, payActs] = await Promise.all([
      coll('candidateactivities')
        .aggregate([
          { $match: dateFilter('createdAt') },
          { $sort: { createdAt: -1 } },
          { $limit: limit * 2 },
          {
            $lookup: {
              from: 'users',
              localField: 'candidateId',
              foreignField: '_id',
              as: 'userDoc',
            },
          },
          {
            $lookup: {
              from: 'candidates',
              localField: 'candidateId',
              foreignField: '_id',
              as: 'candDoc',
            },
          },
          {
            $project: {
              _id: 1,
              activityType: 1,
              description: 1,
              createdAt: 1,
              page: 1,
              source: 1,
              candidateName: {
                $ifNull: [
                  { $arrayElemAt: ['$userDoc.name', 0] },
                  { $arrayElemAt: ['$candDoc.name', 0] },
                ],
              },
              candidateEmail: {
                $ifNull: [
                  { $arrayElemAt: ['$userDoc.email', 0] },
                  { $arrayElemAt: ['$candDoc.email', 0] },
                ],
              },
            },
          },
        ])
        .toArray()
        .catch(() => []),
      coll('users')
        .aggregate([
          { $match: { role: 'jobseeker', ...dateFilter('createdAt') } },
          { $sort: { createdAt: -1 } },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              activityType: { $literal: 'registration' },
              description: { $literal: 'New candidate registered' },
              candidateName: '$name',
              candidateEmail: '$email',
              createdAt: 1,
            },
          },
        ])
        .toArray()
        .catch(() => []),
      coll('applications')
        .aggregate([
          { $match: dateFilter('createdAt') },
          { $sort: { createdAt: -1 } },
          { $limit: limit },
          {
            $lookup: {
              from: 'users',
              localField: 'applicant',
              foreignField: '_id',
              as: 'user',
            },
          },
          {
            $lookup: {
              from: 'jobs',
              localField: 'job',
              foreignField: '_id',
              as: 'jobDoc',
            },
          },
          {
            $project: {
              _id: 1,
              activityType: { $literal: 'job_application' },
              description: {
                $concat: [
                  { $literal: 'Applied for job: ' },
                  { $ifNull: [{ $arrayElemAt: ['$jobDoc.title', 0] }, 'Unknown Position'] },
                ],
              },
              candidateName: { $arrayElemAt: ['$user.name', 0] },
              candidateEmail: { $arrayElemAt: ['$user.email', 0] },
              createdAt: 1,
            },
          },
        ])
        .toArray()
        .catch(() => []),
      coll('savedjobs')
        .aggregate([
          { $match: dateFilter('createdAt') },
          { $sort: { createdAt: -1 } },
          { $limit: limit },
          {
            $lookup: {
              from: 'users',
              localField: 'jobseeker',
              foreignField: '_id',
              as: 'user',
            },
          },
          {
            $lookup: {
              from: 'jobs',
              localField: 'job',
              foreignField: '_id',
              as: 'jobDoc',
            },
          },
          {
            $project: {
              _id: 1,
              activityType: { $literal: 'job_save' },
              description: {
                $concat: [
                  { $literal: 'Saved job: ' },
                  { $ifNull: [{ $arrayElemAt: ['$jobDoc.title', 0] }, 'Unknown Position'] },
                ],
              },
              candidateName: { $arrayElemAt: ['$user.name', 0] },
              candidateEmail: { $arrayElemAt: ['$user.email', 0] },
              createdAt: 1,
            },
          },
        ])
        .toArray()
        .catch(() => []),
      coll('payments')
        .aggregate([
          { $match: dateFilter('createdAt') },
          { $sort: { createdAt: -1 } },
          { $limit: limit },
          {
            $lookup: {
              from: 'users',
              localField: 'userId',
              foreignField: '_id',
              as: 'user',
            },
          },
          {
            $project: {
              _id: 1,
              activityType: { $literal: 'payment' },
              description: { $concat: [{ $literal: 'Payment of amount ' }, { $toString: { $ifNull: ['$amount', 0] } }] },
              candidateName: { $arrayElemAt: ['$user.name', 0] },
              candidateEmail: { $arrayElemAt: ['$user.email', 0] },
              createdAt: 1,
            },
          },
        ])
        .toArray()
        .catch(() => []),
    ]);

    const synthesizedTypes = new Set(realActivities.map(a => a.activityType));
    let fallbackActivities = [];
    if (!synthesizedTypes.has('registration')) fallbackActivities = fallbackActivities.concat(regActs);
    if (!synthesizedTypes.has('job_application')) fallbackActivities = fallbackActivities.concat(appActs);
    if (!synthesizedTypes.has('job_save')) fallbackActivities = fallbackActivities.concat(saveActs);
    if (!synthesizedTypes.has('payment')) fallbackActivities = fallbackActivities.concat(payActs);

    const all = [...realActivities, ...fallbackActivities];
    all.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    return all.slice(0, limit).map((a, idx) => ({
      _id: a._id ? `${a.activityType}_${a._id}_${idx}` : `${a.activityType}_${idx}`,
      activityType: a.activityType,
      description: a.description,
      candidate: a.candidateName || a.candidateEmail
        ? {
            name: a.candidateName || 'Unknown',
            email: a.candidateEmail || null,
          }
        : null,
      createdAt: a.createdAt,
    }));
  } catch {
    return [];
  }
};

export const getDashboardStats = async (req, res, next) => {
  try {
    const { range, startDate, endDate } = req.query;
    const validation = validateAndParseRange(range, startDate, endDate);
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }
    const { start, end } = validation.value;
    const prev = getPreviousRange(start, end);

    const presets = buildPresetRanges();
    const activeWindow = buildActiveWindow(ACTIVE_WINDOW_DAYS, new Date());
    const activeTodayRange = buildActiveWindow(1, new Date());
    const active7dRange = buildActiveWindow(7, new Date());
    const active30dRange = buildActiveWindow(30, new Date());

    const [
      registrationFacet,
      totalApplicationsCount,
      totalCandidates,
      applicationsSelected,
      applicationsPrevious,
      applicationsToday,
      applicationsYesterday,
      applicationsLast7,
      applicationsLast30,
      applicationsThisMonth,
      applicationsLastMonth,
      activeInRange,
      activeCandidates,
      activeToday,
      activeLast7,
      activeLast30,
      statusDistribution,
      uniqueApplicantsInRange,
    ] = await Promise.all([
      registrationPipelinesNative({ start, end }),
      estimatedCountSafe('applications'),
      estimatedCountSafe('candidates'),
      countInRangeNative('applications', 'createdAt', start, end),
      countInRangeNative('applications', 'createdAt', prev.start, prev.end),
      countInRangeNative('applications', 'createdAt', presets.today.start, presets.today.end),
      countInRangeNative('applications', 'createdAt', presets.yesterday.start, presets.yesterday.end),
      countInRangeNative('applications', 'createdAt', presets.last7Days.start, presets.last7Days.end),
      countInRangeNative('applications', 'createdAt', presets.last30Days.start, presets.last30Days.end),
      countInRangeNative('applications', 'createdAt', presets.thisMonth.start, presets.thisMonth.end),
      countInRangeNative('applications', 'createdAt', presets.lastMonth.start, presets.lastMonth.end),
      countActiveCandidates(start, end),
      countActiveCandidates(activeWindow.start, activeWindow.end),
      countActiveCandidates(activeTodayRange.start, activeTodayRange.end),
      countActiveCandidates(active7dRange.start, active7dRange.end),
      countActiveCandidates(active30dRange.start, active30dRange.end),
      getStatusDistribution(),
      countUniqueApplicantsInRange(start, end),
    ]);

    const reg = registrationFacet?.[0] ?? {};
    const pickCount = (key) => reg[key]?.[0]?.count ?? 0;
    const registrationsInSelectedPeriod = pickCount('selected');
    const registrationsPreviousCount = await countInRangeNative(
      'users',
      'createdAt',
      prev.start,
      prev.end,
      { role: 'jobseeker' }
    );
    const inactiveCandidates = Math.max(0, totalCandidates - activeCandidates);

    const candidateGrowth = toFixedNumber(growthPercent(registrationsInSelectedPeriod, registrationsPreviousCount));
    const applicationGrowth = toFixedNumber(growthPercent(applicationsSelected, applicationsPrevious));

    return res.status(200).json({
      range: {
        preset: range || 'last30days',
        start: start.toISOString(),
        end: end.toISOString(),
        previous: { start: prev.start.toISOString(), end: prev.end.toISOString() },
        activeWindowDays: ACTIVE_WINDOW_DAYS,
        timezone: 'Server (UTC-aligned local time, day-buckets use server local startOfDay)',
      },
      candidates: {
        totalCandidates,
        registrationsInSelectedPeriod,
        registrationsToday: pickCount('today'),
        registrationsYesterday: pickCount('yesterday'),
        registrationsLast7Days: pickCount('last7Days'),
        registrationsLast30Days: pickCount('last30Days'),
        registrationsThisMonth: pickCount('thisMonth'),
        registrationsLastMonth: pickCount('lastMonth'),
        candidateGrowthPercentage: candidateGrowth,
        candidatePreviousPeriodRegistrations: registrationsPreviousCount,
        activeCandidates,
        activeInSelectedPeriod: activeInRange,
        activeToday,
        activeLast7Days: activeLast7,
        activeLast30Days: activeLast30,
        inactiveCandidates,
        statusDistribution,
      },
      applications: {
        totalApplications: totalApplicationsCount,
        applicationsInSelectedPeriod: applicationsSelected,
        applicationsPreviousPeriod: applicationsPrevious,
        applicationsToday,
        applicationsYesterday,
        applicationsLast7Days: applicationsLast7,
        applicationsLast30Days: applicationsLast30,
        applicationsThisMonth,
        applicationsLastMonth,
        applicationGrowthPercentage: applicationGrowth,
        uniqueApplicantsInRange: uniqueApplicantsInRange,
      },
      computedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

export const getRegistrationTrend = async (req, res, next) => {
  try {
    const { range, startDate, endDate } = req.query;
    const validation = validateAndParseRange(range, startDate, endDate);
    if (validation.error) return res.status(400).json({ message: validation.error });
    const { start, end } = validation.value;
    const data = await buildRegistrationTrend(start, end);
    return res.status(200).json({
      range: { preset: range || 'last30days', start: start.toISOString(), end: end.toISOString() },
      bucket: data.bucket,
      items: data.items,
      trend: data.items.map((i) => ({ date: i.date, label: i.label, registrations: i.count })),
    });
  } catch (err) {
    next(err);
  }
};

export const getApplicationTrend = async (req, res, next) => {
  try {
    const { range, startDate, endDate } = req.query;
    const validation = validateAndParseRange(range, startDate, endDate);
    if (validation.error) return res.status(400).json({ message: validation.error });
    const { start, end } = validation.value;
    const data = await buildApplicationTrend(start, end);
    return res.status(200).json({
      range: { preset: range || 'last30days', start: start.toISOString(), end: end.toISOString() },
      bucket: data.bucket,
      items: data.items,
      trend: data.items.map((i) => ({ date: i.date, label: i.label, applications: i.count })),
    });
  } catch (err) {
    next(err);
  }
};

const buildIdForBucket = (d, bucket) => {
  const id = { year: d.getFullYear() };
  if (bucket === 'day') {
    id.month = d.getMonth() + 1;
    id.day = d.getDate();
  } else if (bucket === 'week') {
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil((((d - onejan) / MS_PER_DAY) + onejan.getDay() + 1) / 7);
    id.week = week;
  } else {
    id.month = d.getMonth() + 1;
  }
  return id;
};

export const getDailyRegistrations = async (req, res, next) => {
  try {
    const { range, startDate, endDate } = req.query;
    const validation = validateAndParseRange(range, startDate, endDate);
    if (validation.error) return res.status(400).json({ message: validation.error });
    const { start, end } = validation.value;
    const s = clampStart(start);
    const strategy = rangeBucketStrategy(s, end);
    const { iter } = strategy;
    const forceDay = strategy.bucket !== 'day' ? iter(s, end).length <= 180 : true;
    const useDays = forceDay || strategy.bucket === 'day';
    const bucket = useDays ? 'day' : strategy.bucket;
    const fmtKey = useDays ? formatDateKey : bucket === 'week' ? formatWeekKey : formatMonthKey;
    const fmtLabel = useDays ? formatDayLabel : bucket === 'week' ? formatWeekLabel : formatMonthLabel;
    const actualIter = useDays ? daysBetween : strategy.iter;
    try {
      const raw = await coll('users')
        .aggregate([
          {
            $match: {
              role: 'jobseeker',
              createdAt: { $gte: s, $lte: end },
            },
          },
          buildTrendGroupStage('$createdAt', bucket),
          { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1, '_id.day': 1 } },
        ])
        .toArray();
      const counts = {};
      raw.forEach((r) => {
        counts[trendKeyFromId(r._id, bucket)] = r.count;
      });
      const data = actualIter(s, end).map((d) => {
        const key = fmtKey(d);
        const trendKey = trendKeyFromId(buildIdForBucket(d, bucket), bucket);
        const c = counts[trendKey] ?? 0;
        return {
          date: key,
          label: fmtLabel(d),
          registrations: c,
          count: c,
        };
      });
      return res.status(200).json({ bucket, data });
    } catch {
      const data = actualIter(s, end).map((d) => ({
        date: fmtKey(d),
        label: fmtLabel(d),
        registrations: 0,
        count: 0,
      }));
      return res.status(200).json({ bucket, data });
    }
  } catch (err) {
    next(err);
  }
};

export const getWeeklyRegistrations = async (req, res, next) => {
  try {
    const { range, startDate, endDate } = req.query;
    const validation = validateAndParseRange(range, startDate, endDate);
    if (validation.error) return res.status(400).json({ message: validation.error });
    const { start, end } = validation.value;
    const s = clampStart(start);
    const bucket = 'week';
    try {
      const raw = await coll('users')
        .aggregate([
          {
            $match: {
              role: 'jobseeker',
              createdAt: { $gte: s, $lte: end },
            },
          },
          buildTrendGroupStage('$createdAt', bucket),
          { $sort: { '_id.year': 1, '_id.week': 1 } },
        ])
        .toArray();
      const data = raw.map((r) => ({
        week: `${r._id.year}-W${String(r._id.week).padStart(2, '0')}`,
        label: `Week ${r._id.week} (${r._id.year})`,
        registrations: r.count,
        count: r.count,
      }));
      return res.status(200).json({ bucket, data });
    } catch {
      return res.status(200).json({ bucket, data: [] });
    }
  } catch (err) {
    next(err);
  }
};

export const getMonthlyGrowth = async (req, res, next) => {
  try {
    let raw = [];
    try {
      raw = await coll('users')
        .aggregate([
          {
            $match: {
              role: 'jobseeker',
              createdAt: { $gte: Y2K },
            },
          },
          {
            $group: {
              _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ])
        .toArray();
    } catch {
      raw = [];
    }
    let cumulative = 0;
    const data = raw.map((r) => {
      cumulative += r.count;
      return {
        month: `${r._id.year}-${String(r._id.month).padStart(2, '0')}`,
        label: new Date(r._id.year, r._id.month - 1, 1).toLocaleString('en-US', {
          month: 'short',
          year: '2-digit',
        }),
        newCandidates: r.count,
        totalCandidates: cumulative,
      };
    });
    return res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
};

const buildActivityTrends = async (start, end) => {
  const s = clampStart(start);
  const strategy = rangeBucketStrategy(s, end);
  const useDays = strategy.bucket === 'day' || strategy.iter(s, end).length <= 180;
  const bucket = useDays ? 'day' : strategy.bucket;
  const actualIter = useDays ? daysBetween : strategy.iter;
  const fmtKey = useDays ? formatDateKey : bucket === 'week' ? formatWeekKey : formatMonthKey;
  const fmtLabel = useDays ? formatDayLabel : bucket === 'week' ? formatWeekLabel : formatMonthLabel;

  const byDate = new Map();
  actualIter(s, end).forEach((d) => {
    const dateKey = fmtKey(d);
    const intKey = trendKeyFromId(buildIdForBucket(d, bucket), bucket);
    byDate.set(intKey, {
      key: intKey,
      date: new Date(d).toISOString(),
      label: fmtLabel(d),
      total: 0,
      registrations: 0,
      logins: 0,
      applications: 0,
      profileUpdates: 0,
      jobViews: 0,
      jobSearches: 0,
      resumeUploads: 0,
    });
  });

  const dateFilter = {
    createdAt: { $gte: s, $lte: end },
  };

  try {
    const [realActivityGroups, regGroups, appGroups] = await Promise.all([
      coll('candidateactivities')
        .aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: {
                ...(bucket === 'day'
                  ? { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } }
                  : bucket === 'week'
                    ? { year: { $isoWeekYear: '$createdAt' }, week: { $isoWeek: '$createdAt' } }
                    : { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }),
                activityType: '$activityType',
              },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray()
        .catch(() => []),
      coll('users')
        .aggregate([
          {
            $match: {
              role: 'jobseeker',
              createdAt: { $gte: s, $lte: end },
            },
          },
          buildTrendGroupStage('$createdAt', bucket),
        ])
        .toArray()
        .catch(() => []),
      coll('applications')
        .aggregate([
          {
            $match: {
              createdAt: { $gte: s, $lte: end },
            },
          },
          buildTrendGroupStage('$createdAt', bucket),
        ])
        .toArray()
        .catch(() => []),
    ]);

    const realActivityTypesSeen = new Set();
    realActivityGroups.forEach((g) => {
      const { activityType, ...idOnly } = g._id;
      const key = trendKeyFromId(idOnly, bucket);
      const row = byDate.get(key);
      if (!row) return;
      realActivityTypesSeen.add(activityType);
      row.total += g.count;
      switch (activityType) {
        case 'registration':
          row.registrations += g.count;
          break;
        case 'login':
          row.logins += g.count;
          break;
        case 'job_application':
          row.applications += g.count;
          break;
        case 'profile_update':
          row.profileUpdates += g.count;
          break;
        case 'job_view':
          row.jobViews += g.count;
          break;
        case 'job_search':
          row.jobSearches += g.count;
          break;
        case 'resume_upload':
          row.resumeUploads += g.count;
          break;
        default:
          break;
      }
    });

    if (!realActivityTypesSeen.has('registration')) {
      regGroups.forEach((g) => {
        const key = trendKeyFromId(g._id, bucket);
        const row = byDate.get(key);
        if (row) {
          row.registrations += g.count;
          row.total += g.count;
        }
      });
    }
    if (!realActivityTypesSeen.has('job_application')) {
      appGroups.forEach((g) => {
        const key = trendKeyFromId(g._id, bucket);
        const row = byDate.get(key);
        if (row) {
          row.applications += g.count;
          row.total += g.count;
        }
      });
    }
  } catch (_e) {
    // leave at 0
  }

  return { bucket, items: Array.from(byDate.values()) };
};

export const getActivityTrends = async (req, res, next) => {
  try {
    const { range, startDate, endDate } = req.query;
    const validation = validateAndParseRange(range, startDate, endDate);
    if (validation.error) return res.status(400).json({ message: validation.error });
    const { start, end } = validation.value;
    const { bucket, items } = await buildActivityTrends(start, end);
    const empty = items.length === 0 || items.every((i) =>
      !(Number(i.registrations) || Number(i.logins) || Number(i.applications) ||
        Number(i.profileUpdates) || Number(i.jobViews) || Number(i.jobSearches) ||
        Number(i.resumeUploads)));
    return res.status(200).json({
      bucket,
      data: items,
      empty,
      message: empty ? 'No candidate activity recorded in the selected range.' : undefined,
    });
  } catch (err) {
    next(err);
  }
};

export const getApplicationTrends = async (req, res, next) => {
  try {
    const { range, startDate, endDate } = req.query;
    const validation = validateAndParseRange(range, startDate, endDate);
    if (validation.error) return res.status(400).json({ message: validation.error });
    const { start, end } = validation.value;
    const strategy = rangeBucketStrategy(start, end);
    const useDays = strategy.bucket === 'day' || strategy.iter(start, end).length <= 180;
    const bucket = useDays ? 'day' : strategy.bucket;
    const actualIter = useDays ? daysBetween : strategy.iter;
    const fmtKey = useDays ? formatDateKey : bucket === 'week' ? formatWeekKey : formatMonthKey;
    const fmtLabel = useDays ? formatDayLabel : bucket === 'week' ? formatWeekLabel : formatMonthLabel;

    const byDate = new Map();
    actualIter(start, end).forEach((d) => {
      const dateKey = fmtKey(d);
      const intKey = trendKeyFromId(buildIdForBucket(d, bucket), bucket);
      byDate.set(intKey, {
        date: dateKey,
        label: fmtLabel(d),
        total: 0,
        pending: 0,
        reviewing: 0,
        shortlisted: 0,
        interview: 0,
        rejected: 0,
        hired: 0,
      });
    });

    try {
      const idObj = {};
      if (bucket === 'day') {
        idObj.year = { $year: '$createdAt' };
        idObj.month = { $month: '$createdAt' };
        idObj.day = { $dayOfMonth: '$createdAt' };
      } else if (bucket === 'week') {
        idObj.year = { $isoWeekYear: '$createdAt' };
        idObj.week = { $isoWeek: '$createdAt' };
      } else {
        idObj.year = { $year: '$createdAt' };
        idObj.month = { $month: '$createdAt' };
      }

      const raw = await coll('applications')
        .aggregate([
          {
            $match: {
              createdAt: { $gte: start, $lte: end },
            },
          },
          { $group: { _id: { ...idObj, status: '$status' }, count: { $sum: 1 } } },
        ])
        .toArray();

      raw.forEach((r) => {
        const { status, ...idOnly } = r._id;
        const key = trendKeyFromId(idOnly, bucket);
        const row = byDate.get(key);
        if (!row) return;
        row.total += r.count;
        const mapped = mapAppStatus(status);
        if (mapped && row[mapped] !== undefined) row[mapped] += r.count;
      });
    } catch {
      // leave at 0
    }

    return res.status(200).json({ bucket, data: Array.from(byDate.values()) });
  } catch (err) {
    next(err);
  }
};

const getRecentActivitiesInner = async ({ query }) => {
  const { limit = 15, range, startDate, endDate } = query;
  const validation =
    range || startDate || endDate ? validateAndParseRange(range, startDate, endDate) : null;
  if (validation?.error) throw Object.assign(new Error(validation.error), { statusCode: 400 });
  const lim = parseLimit(limit, 15, 1, 100);
  const start = validation?.value?.start;
  const end = validation?.value?.end;
  return await synthesizeActivities(start, end, lim);
};

export const getRecentActivities = async (req, res, next) => {
  try {
    const { limit = 15, range, startDate, endDate } = req.query;
    const validation =
      range || startDate || endDate ? validateAndParseRange(range, startDate, endDate) : null;
    if (validation?.error) return res.status(400).json({ message: validation.error });
    const lim = parseLimit(limit, 15, 1, 100);
    const start = validation?.value?.start;
    const end = validation?.value?.end;
    const data = await synthesizeActivities(start, end, lim);

    return res.status(200).json({
      limit: lim,
      count: data.length,
      data,
      activities: data,
    });
  } catch (err) {
    next(err);
  }
};

export const getRegistrationAnalytics = async (req, res, next) => {
  try {
    const { range, startDate, endDate } = req.query;
    const validation = validateAndParseRange(range, startDate, endDate);
    if (validation.error) return res.status(400).json({ message: validation.error });
    const { start, end } = validation.value;

    const [byStatus, byLocation, byDayOfWeek] = await Promise.all([
      coll('applications')
        .aggregate([
          {
            $match: {
              createdAt: { $gte: start, $lte: end },
            },
          },
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $project: { status: '$_id', count: 1, _id: 0 } },
        ])
        .toArray()
        .then((raw) => {
          const mapped = { pending: 0, reviewing: 0, shortlisted: 0, interview: 0, rejected: 0, hired: 0 };
          raw.forEach((r) => {
            const m = mapAppStatus(r.status);
            if (m) mapped[m] += r.count;
          });
          return Object.entries(mapped).map(([status, count]) => ({ status, count }));
        })
        .catch(() => []),
      coll('candidates')
        .aggregate([
          { $match: { location: { $ne: '' } } },
          { $group: { _id: '$location', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          { $project: { location: '$_id', count: 1, _id: 0 } },
        ])
        .toArray()
        .catch(() => []),
      coll('users')
        .aggregate([
          {
            $match: {
              role: 'jobseeker',
              createdAt: { $gte: start, $lte: end },
            },
          },
          { $group: { _id: { $dayOfWeek: '$createdAt' }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ])
        .toArray()
        .then((r) => r.map((x) => ({ _id: x._id, count: x.count })))
        .catch(() => []),
    ]);

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const byDayData = dayLabels.map((label, idx) => {
      const found = byDayOfWeek.find((d) => d._id === idx + 1);
      return { label, count: found?.count ?? 0, index: idx + 1 };
    });

    return res.status(200).json({
      range: { start: start.toISOString(), end: end.toISOString() },
      byStatus,
      byLocation,
      bySource: [{ source: 'unknown', count: 0 }],
      byDayOfWeek: byDayData,
    });
  } catch (err) {
    next(err);
  }
};

const getDashboardStatsInner = async ({ query }) => {
  const { range, startDate, endDate } = query;
  const validation = validateAndParseRange(range, startDate, endDate);
  if (validation.error) throw Object.assign(new Error(validation.error), { statusCode: 400 });
  const { start, end } = validation.value;
  const prev = getPreviousRange(start, end);

  const presets = buildPresetRanges();
  const activeWindow = buildActiveWindow(ACTIVE_WINDOW_DAYS, new Date());
  const activeTodayRange = buildActiveWindow(1, new Date());
  const active7dRange = buildActiveWindow(7, new Date());
  const active30dRange = buildActiveWindow(30, new Date());

  const [
    registrationFacet,
    totalApplicationsCount,
    totalCandidates,
    applicationsSelected,
    applicationsPrevious,
    applicationsToday,
    applicationsYesterday,
    applicationsLast7,
    applicationsLast30,
    applicationsThisMonth,
    applicationsLastMonth,
    activeInRange,
    activeCandidates,
    activeToday,
    activeLast7,
    activeLast30,
    statusDistribution,
    uniqueApplicantsInRange,
  ] = await Promise.all([
    registrationPipelinesNative({ start, end }),
    estimatedCountSafe('applications'),
    estimatedCountSafe('candidates'),
    countInRangeNative('applications', 'createdAt', start, end),
    countInRangeNative('applications', 'createdAt', prev.start, prev.end),
    countInRangeNative('applications', 'createdAt', presets.today.start, presets.today.end),
    countInRangeNative('applications', 'createdAt', presets.yesterday.start, presets.yesterday.end),
    countInRangeNative('applications', 'createdAt', presets.last7Days.start, presets.last7Days.end),
    countInRangeNative('applications', 'createdAt', presets.last30Days.start, presets.last30Days.end),
    countInRangeNative('applications', 'createdAt', presets.thisMonth.start, presets.thisMonth.end),
    countInRangeNative('applications', 'createdAt', presets.lastMonth.start, presets.lastMonth.end),
    countActiveCandidates(start, end),
    countActiveCandidates(activeWindow.start, activeWindow.end),
    countActiveCandidates(activeTodayRange.start, activeTodayRange.end),
    countActiveCandidates(active7dRange.start, active7dRange.end),
    countActiveCandidates(active30dRange.start, active30dRange.end),
    getStatusDistribution(),
    countUniqueApplicantsInRange(start, end),
  ]);

  const reg = registrationFacet?.[0] ?? {};
  const pickCount = (key) => reg[key]?.[0]?.count ?? 0;
  const registrationsInSelectedPeriod = pickCount('selected');
  const registrationsPreviousCount = await countInRangeNative(
    'users',
    'createdAt',
    prev.start,
    prev.end,
    { role: 'jobseeker' }
  );
  const inactiveCandidates = Math.max(0, totalCandidates - activeCandidates);

  const candidateGrowth = toFixedNumber(growthPercent(registrationsInSelectedPeriod, registrationsPreviousCount));
  const applicationGrowth = toFixedNumber(growthPercent(applicationsSelected, applicationsPrevious));

  return {
    range: {
      preset: range || 'last30days',
      start: start.toISOString(),
      end: end.toISOString(),
      previous: { start: prev.start.toISOString(), end: prev.end.toISOString() },
      activeWindowDays: ACTIVE_WINDOW_DAYS,
      timezone: 'Server (UTC-aligned local time, day-buckets use server local startOfDay)',
    },
    candidates: {
      totalCandidates,
      registrationsInSelectedPeriod,
      registrationsToday: pickCount('today'),
      registrationsYesterday: pickCount('yesterday'),
      registrationsLast7Days: pickCount('last7Days'),
      registrationsLast30Days: pickCount('last30Days'),
      registrationsThisMonth: pickCount('thisMonth'),
      registrationsLastMonth: pickCount('lastMonth'),
      candidateGrowthPercentage: candidateGrowth,
      candidatePreviousPeriodRegistrations: registrationsPreviousCount,
      activeCandidates,
      activeInSelectedPeriod: activeInRange,
      activeToday,
      activeLast7Days: activeLast7,
      activeLast30Days: activeLast30,
      inactiveCandidates,
      statusDistribution,
    },
    applications: {
      totalApplications: totalApplicationsCount,
      applicationsInSelectedPeriod: applicationsSelected,
      applicationsPreviousPeriod: applicationsPrevious,
      applicationsToday,
      applicationsYesterday,
      applicationsLast7Days: applicationsLast7,
      applicationsLast30Days: applicationsLast30,
      applicationsThisMonth,
      applicationsLastMonth,
      applicationGrowthPercentage: applicationGrowth,
      uniqueApplicantsInRange: uniqueApplicantsInRange,
    },
    computedAt: new Date().toISOString(),
  };
};

export const getOverview = async (req, res, next) => {
  try {
    const { range, startDate, endDate } = req.query;
    const validation = validateAndParseRange(range, startDate, endDate);
    if (validation.error) return res.status(400).json({ message: validation.error });
    const { start, end } = validation.value;
    const [stats, regTrend, appTrend, actTrend, recentActivities] = await Promise.all([
      getDashboardStatsInner({ query: req.query }),
      buildRegistrationTrend(start, end),
      buildApplicationTrend(start, end),
      buildActivityTrends(start, end),
      getRecentActivitiesInner({ query: { limit: 15, range, startDate, endDate } }),
    ]);
    return res.status(200).json({
      ...stats,
      registrationTrend: {
        bucket: regTrend.bucket,
        items: regTrend.items,
        trend: regTrend.items.map((i) => ({ date: i.date, label: i.label, registrations: i.count })),
        empty: regTrend.items.length === 0 || regTrend.items.every((i) => !Number(i.count)),
        message: regTrend.items.length === 0 || regTrend.items.every((i) => !Number(i.count))
          ? 'No registrations recorded in the selected range.'
          : undefined,
      },
      applicationTrend: {
        bucket: appTrend.bucket,
        items: appTrend.items,
        trend: appTrend.items.map((i) => ({ date: i.date, label: i.label, applications: i.count })),
        empty: appTrend.items.length === 0 || appTrend.items.every((i) => !Number(i.count)),
        message: appTrend.items.length === 0 || appTrend.items.every((i) => !Number(i.count))
          ? 'No applications recorded in the selected range.'
          : undefined,
      },
      activityTrends: {
        bucket: actTrend.bucket,
        items: actTrend.items,
        empty: actTrend.items.length === 0 || actTrend.items.every((i) =>
          !(Number(i.registrations) || Number(i.logins) || Number(i.applications) ||
            Number(i.profileUpdates) || Number(i.jobViews) || Number(i.jobSearches) ||
            Number(i.resumeUploads))),
        message: actTrend.items.length === 0 || actTrend.items.every((i) =>
          !(Number(i.registrations) || Number(i.logins) || Number(i.applications) ||
            Number(i.profileUpdates) || Number(i.jobViews) || Number(i.jobSearches) ||
            Number(i.resumeUploads)))
          ? 'No candidate activity recorded in the selected range.'
          : undefined,
      },
      recentActivities,
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getDashboardStats,
  getRegistrationTrend,
  getApplicationTrend,
  getDailyRegistrations,
  getWeeklyRegistrations,
  getMonthlyGrowth,
  getActivityTrends,
  getApplicationTrends,
  getRecentActivities,
  getRegistrationAnalytics,
  getOverview,
};
