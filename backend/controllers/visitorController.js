import mongoose from 'mongoose';
import Visitor from '../models/Visitor.js';
import { parseRange, rangeBucketStrategy, formatDateKey, formatWeekKey, formatMonthKey, formatDayLabel, formatWeekLabel, formatMonthLabel, daysBetween, weeksBetween, monthsBetween, safeDivide } from '../utils/dateUtils.js';

const Y2K = new Date(Date.UTC(2000, 0, 1));
const clampStart = (d) => (d < Y2K ? new Date(Y2K.getTime()) : new Date(d.getTime()));

const db = () => mongoose.connection.db;
const coll = (name) => db().collection(name);

const countInRange = async (collectionName, field, start, end, extraFilter = {}) => {
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

const trendKeyFromId = (id, bucket) => {
  if (bucket === 'day') return `${id.year}-${String(id.month).padStart(2, '0')}-${String(id.day).padStart(2, '0')}`;
  if (bucket === 'week') return `${id.year}-W${String(id.week).padStart(2, '0')}`;
  return `${id.year}-${String(id.month).padStart(2, '0')}`;
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
  return { $group: { _id: id, count: { $sum: 1 }, uniqueVisitorIds: { $addToSet: '$visitorId' } } };
};

const buildIdForBucket = (d, bucket) => {
  const id = { year: d.getFullYear() };
  if (bucket === 'day') {
    id.month = d.getMonth() + 1;
    id.day = d.getDate();
  } else if (bucket === 'week') {
    const MS_PER_DAY = 86400000;
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil((((d - onejan) / MS_PER_DAY) + onejan.getDay() + 1) / 7);
    id.week = week;
  } else {
    id.month = d.getMonth() + 1;
  }
  return id;
};

export const getVisitorStats = async (req, res) => {
  try {
    const { range, startDate, endDate } = req.query;
    const { start, end } = parseRange(range, startDate, endDate);
    const s = clampStart(start);
    const dateFilter = { createdAt: { $gte: s, $lte: end } };

    const [totalVisits, registeredVisits] = await Promise.all([
      countInRange('visitors', 'createdAt', start, end),
      countInRange('visitors', 'createdAt', start, end, { isRegistered: true }),
    ]);

    let uniqueVisitors = 0;
    let registeredUnique = 0;
    let returningVisitors = 0;
    let newVisitors = 0;

    try {
      const uniqueAgg = await coll('visitors').aggregate([
        { $match: dateFilter },
        { $group: { _id: '$visitorId', firstSeen: { $min: '$createdAt' }, visitCount: { $sum: 1 } } },
      ]).toArray();
      uniqueVisitors = uniqueAgg.length;

      const beforeRangeStart = start;
      const visitorIdsInRange = uniqueAgg.map(u => u._id);
      const seenBefore = await coll('visitors').aggregate([
        { $match: { visitorId: { $in: visitorIdsInRange }, createdAt: { $lt: beforeRangeStart, $gte: Y2K } } },
        { $group: { _id: '$visitorId' } },
      ]).toArray();
      const seenBeforeSet = new Set(seenBefore.map(s => s._id));

      returningVisitors = uniqueAgg.filter(u => seenBeforeSet.has(u._id)).length;
      newVisitors = uniqueVisitors - returningVisitors;

      const regUniqueAgg = await coll('visitors').aggregate([
        { $match: { ...dateFilter, isRegistered: true } },
        { $group: { _id: '$visitorId' } },
      ]).toArray();
      registeredUnique = regUniqueAgg.length;
    } catch (_e) {
      // fall through with defaults
    }

    const averageVisitsPerVisitor = safeDivide(totalVisits, uniqueVisitors);

    const empty = totalVisits === 0 && uniqueVisitors === 0;

    res.status(200).json({
      stats: {
        totalVisits,
        uniqueVisitors,
        returningVisitors,
        newVisitors,
        registeredVisits,
        registeredUnique,
        averageVisitsPerVisitor: Number(averageVisitsPerVisitor.toFixed(2)),
      },
      range: { start: start.toISOString(), end: end.toISOString() },
      empty,
      message: empty ? 'No visitor tracking data available yet.' : undefined,
    });
  } catch (error) {
    console.error('Visitor stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getVisitorTrends = async (req, res) => {
  try {
    const { range, startDate, endDate } = req.query;
    const { start, end } = parseRange(range, startDate, endDate);
    const s = clampStart(start);
    const strategy = rangeBucketStrategy(s, end);
    const { bucket, iter } = strategy;
    const fmtKey = bucket === 'day' ? formatDateKey : bucket === 'week' ? formatWeekKey : formatMonthKey;
    const fmtLabel = bucket === 'day' ? formatDayLabel : bucket === 'week' ? formatWeekLabel : formatMonthLabel;
    const actualIter = strategy.iter;

    const dateFilter = { createdAt: { $gte: s, $lte: end } };

    let rawGroups = [];
    try {
      rawGroups = await coll('visitors')
        .aggregate([
          { $match: dateFilter },
          buildTrendGroupStage('$createdAt', bucket),
          { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1, '_id.day': 1 } },
        ])
        .toArray();
    } catch (_e) {
      rawGroups = [];
    }

    const countsMap = {};
    const uniqueMap = {};
    rawGroups.forEach((g) => {
      const key = trendKeyFromId(g._id, bucket);
      countsMap[key] = g.count || 0;
      uniqueMap[key] = Array.isArray(g.uniqueVisitorIds) ? g.uniqueVisitorIds.filter(Boolean).length : 0;
    });

    const buckets = actualIter(start, end);
    const data = buckets.map((d) => {
      const trendKey = trendKeyFromId(buildIdForBucket(d, bucket), bucket);
      return {
        date: fmtKey(d),
        label: fmtLabel(d),
        visits: countsMap[trendKey] ?? 0,
        unique: uniqueMap[trendKey] ?? 0,
      };
    });

    const empty = data.every(r => (r.visits || 0) === 0 && (r.unique || 0) === 0);

    res.status(200).json({
      bucket,
      data,
      range: { start: start.toISOString(), end: end.toISOString() },
      empty,
      message: empty ? 'No visitor trend data for the selected range.' : undefined,
    });
  } catch (error) {
    console.error('Visitor trends error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTopPages = async (req, res) => {
  try {
    const { range, startDate, endDate, limit = 20 } = req.query;
    const { start, end } = parseRange(range, startDate, endDate);
    const s = clampStart(start);
    const limitNum = Math.max(1, Math.min(100, Number(limit)));

    const dateFilter = { createdAt: { $gte: s, $lte: end } };

    let raw = [];
    try {
      raw = await coll('visitors')
        .aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: { page: '$page', path: '$path', pageTitle: '$pageTitle' },
              views: { $sum: 1 },
              unique: { $addToSet: '$visitorId' },
            },
          },
          { $sort: { views: -1 } },
          { $limit: limitNum },
        ])
        .toArray();
    } catch (_e) {
      raw = [];
    }

    const data = raw.map((r) => ({
      page: r._id.page || 'other',
      path: r._id.path || '',
      title: r._id.pageTitle || r._id.page || 'Other',
      views: r.views,
      unique: Array.isArray(r.unique) ? r.unique.filter(Boolean).length : 0,
    }));

    const empty = data.length === 0;

    res.status(200).json({
      data,
      range: { start: start.toISOString(), end: end.toISOString() },
      empty,
      message: empty ? 'No page view data for the selected range.' : undefined,
    });
  } catch (error) {
    console.error('Visitor top pages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getVisitorBreakdown = async (req, res) => {
  try {
    const { range, startDate, endDate } = req.query;
    const { start, end } = parseRange(range, startDate, endDate);

    const dateFilter = {
      $and: [
        { createdAt: { $gte: start, $lte: end } },
      ],
    };

    const [byDeviceRaw, byBrowserRaw, byCountryRaw] = await Promise.all([
      coll('visitors').aggregate([
        { $match: dateFilter },
        { $group: { _id: '$deviceType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).toArray().catch(() => []),
      coll('visitors').aggregate([
        { $match: dateFilter },
        { $group: { _id: '$browser', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]).toArray().catch(() => []),
      coll('visitors').aggregate([
        { $match: dateFilter },
        { $group: { _id: '$country', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
      ]).toArray().catch(() => []),
    ]);

    const byDevice = byDeviceRaw
      .filter(r => r._id)
      .map(r => ({ type: r._id, label: String(r._id).charAt(0).toUpperCase() + String(r._id).slice(1), count: r.count }));
    const byBrowser = byBrowserRaw
      .filter(r => r._id)
      .map(r => ({ browser: r._id, count: r.count }));
    const byCountry = byCountryRaw
      .filter(r => r._id)
      .map(r => ({ country: r._id, count: r.count }));

    const empty = byDevice.length === 0 && byBrowser.length === 0 && byCountry.length === 0;

    res.status(200).json({
      byDevice,
      byBrowser,
      byCountry,
      range: { start: start.toISOString(), end: end.toISOString() },
      empty,
      message: empty ? 'No visitor breakdown data available yet.' : undefined,
    });
  } catch (error) {
    console.error('Visitor breakdown error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export default {
  getVisitorStats,
  getVisitorTrends,
  getTopPages,
  getVisitorBreakdown,
};
