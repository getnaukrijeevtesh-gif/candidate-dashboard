import mongoose from 'mongoose';
import { parseRange, formatDateKey } from '../utils/dateUtils.js';

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ACTIVITY_LABELS = {
  registration: 'Registration',
  login: 'Login',
  logout: 'Logout',
  profile_update: 'Profile Update',
  resume_upload: 'Resume Upload',
  job_search: 'Job Search',
  job_view: 'Job View',
  job_save: 'Job Save',
  job_unsave: 'Job Unsave',
  job_application: 'Job Application',
  payment: 'Payment',
};

const ACTIVITY_TYPES_LIST = [
  'registration',
  'login',
  'logout',
  'profile_update',
  'resume_upload',
  'job_search',
  'job_view',
  'job_save',
  'job_unsave',
  'job_application',
  'payment',
];

const ACTIVITY_DESCRIPTIONS = {
  registration: 'Candidate registered',
  login: 'Candidate logged in',
  logout: 'Candidate logged out',
  profile_update: 'Profile updated',
  resume_upload: 'Resume uploaded',
  job_search: 'Performed a job search',
  job_view: 'Viewed a job',
  job_save: 'Saved a job',
  job_unsave: 'Removed a saved job',
  job_application: 'Applied to a job',
  payment: 'Payment event',
};

const getUsersColl = () => mongoose.connection.collection('users');
const getAppsColl = () => mongoose.connection.collection('applications');
const getSavedJobsColl = () => mongoose.connection.collection('savedjobs');
const getPaymentsColl = () => mongoose.connection.collection('payments');
const getCandidateActivitiesColl = () => mongoose.connection.collection('candidateactivities');
const getCandidatesColl = () => mongoose.connection.collection('candidates');

const fetchRealCandidateActivities = async (filter = {}, userIds = []) => {
  const match = {};
  if (filter.createdAt) match.createdAt = filter.createdAt;
  if (filter.activityType) match.activityType = filter.activityType;
  if (userIds && userIds.length > 0) {
    match.candidateId = { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) };
  }

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'users',
        let: { cid: '$candidateId' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$cid'] } } },
          { $project: { _id: 1, name: 1, email: 1 } },
        ],
        as: 'userJoin',
      },
    },
    { $unwind: { path: '$userJoin', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'candidates',
        let: { cid: '$candidateId' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$cid'] } } },
          { $project: { _id: 1, name: 1, email: 1 } },
        ],
        as: 'candidateJoin',
      },
    },
    { $unwind: { path: '$candidateJoin', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'jobs',
        let: { jid: '$jobId' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$jid'] } } },
          { $project: { _id: 1, title: 1 } },
        ],
        as: 'jobJoin',
      },
    },
    { $unwind: { path: '$jobJoin', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id_suffix: { $toString: '$_id' },
        candidateId: 1,
        activityType: 1,
        details: 1,
        createdAt: 1,
        jobId: 1,
        relatedJobId: 1,
        metadata: 1,
        userName: '$userJoin.name',
        userEmail: '$userJoin.email',
        candName: '$candidateJoin.name',
        candEmail: '$candidateJoin.email',
        jobTitle: '$jobJoin.title',
      },
    },
  ];
  try {
    const rows = await getCandidateActivitiesColl().aggregate(pipeline).toArray();
    return rows.map((r) => ({
      _id: 'act_' + (r._id_suffix || String(r._id)),
      candidateId: r.candidateId,
      activityType: r.activityType,
      description: r.details || (r.jobTitle && (r.activityType === 'job_view'
        ? ('Viewed ' + r.jobTitle)
        : ((r.activityType === 'job_save' || r.activityType === 'job_unsave')
          ? ((r.activityType === 'job_save' ? 'Saved ' : 'Removed ') + r.jobTitle)
          : (ACTIVITY_DESCRIPTIONS[r.activityType] || 'Activity occurred'))))
        || ACTIVITY_DESCRIPTIONS[r.activityType] || 'Activity occurred',
      createdAt: r.createdAt,
      relatedJobId: r.jobId || r.relatedJobId || null,
      jobTitle: r.jobTitle,
      candidateName: r.userName || r.candName,
      candidateEmail: r.userEmail || r.candEmail,
      metadata: r.metadata,
    }));
  } catch (e) {
    console.error('fetchRealCandidateActivities error (safe):', e.message);
    return [];
  }
};

const fetchRegistrationEvents = async (filter = {}, extraMatch = {}) => {
  const match = { role: 'jobseeker', ...extraMatch };
  if (filter.createdAt) match.createdAt = filter.createdAt;
  const pipeline = [
    { $match: match },
    {
      $project: {
        _id_raw: { $toString: '$_id' },
        candidateId: '$_id',
        activityType: { $literal: 'registration' },
        createdAt: '$createdAt',
        candidateName: '$name',
        candidateEmail: '$email',
      },
    },
  ];
  try {
    const rows = await getUsersColl().aggregate(pipeline).toArray();
    return rows.map((r) => ({
      _id: 'reg_' + r._id_raw,
      candidateId: r.candidateId,
      activityType: r.activityType,
      description: 'Candidate registered',
      createdAt: r.createdAt,
      candidateName: r.candidateName,
      candidateEmail: r.candidateEmail,
    }));
  } catch { return []; }
};

const fetchApplicationEvents = async (filter = {}, extraMatch = {}) => {
  const match = { ...extraMatch };
  if (filter.createdAt) match.createdAt = filter.createdAt;
  const pipeline = [
    { $match: match },
    { $lookup: { from: 'users', localField: 'applicant', foreignField: '_id', as: 'user' } },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'jobs', localField: 'job', foreignField: '_id', as: 'job' } },
    { $unwind: { path: '$job', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id_raw: { $toString: '$_id' },
        candidateId: '$applicant',
        activityType: { $literal: 'job_application' },
        createdAt: '$createdAt',
        candidateName: '$user.name',
        candidateEmail: '$user.email',
        jobTitle: '$job.title',
        relatedJobId: '$job._id',
      },
    },
  ];
  try {
    const rows = await getAppsColl().aggregate(pipeline).toArray();
    return rows.map((r) => ({
      _id: 'app_' + r._id_raw,
      candidateId: r.candidateId,
      activityType: r.activityType,
      description: 'Applied to ' + (r.jobTitle || 'a job'),
      createdAt: r.createdAt,
      candidateName: r.candidateName,
      candidateEmail: r.candidateEmail,
      jobTitle: r.jobTitle,
      relatedJobId: r.relatedJobId,
    }));
  } catch { return []; }
};

const fetchSavedJobEvents = async (filter = {}, extraMatch = {}) => {
  const match = { ...extraMatch };
  if (filter.createdAt) match.createdAt = filter.createdAt;
  const pipeline = [
    { $match: match },
    { $lookup: { from: 'users', localField: 'jobseeker', foreignField: '_id', as: 'user' } },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'jobs', localField: 'job', foreignField: '_id', as: 'job' } },
    { $unwind: { path: '$job', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id_raw: { $toString: '$_id' },
        candidateId: '$jobseeker',
        activityType: { $literal: 'job_save' },
        createdAt: '$createdAt',
        candidateName: '$user.name',
        candidateEmail: '$user.email',
        jobTitle: '$job.title',
        relatedJobId: '$job._id',
      },
    },
  ];
  try {
    const rows = await getSavedJobsColl().aggregate(pipeline).toArray();
    return rows.map((r) => ({
      _id: 'save_' + r._id_raw,
      candidateId: r.candidateId,
      activityType: r.activityType,
      description: 'Saved ' + (r.jobTitle || 'a job'),
      createdAt: r.createdAt,
      candidateName: r.candidateName,
      candidateEmail: r.candidateEmail,
      jobTitle: r.jobTitle,
      relatedJobId: r.relatedJobId,
    }));
  } catch { return []; }
};

const fetchPaymentEvents = async (filter = {}, extraMatch = {}) => {
  const match = { ...extraMatch };
  if (filter.createdAt) match.createdAt = filter.createdAt;
  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'users',
        let: { uid: '$userId' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$uid'] } } },
          { $project: { name: 1, email: 1 } },
        ],
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id_raw: { $toString: '$_id' },
        candidateId: '$userId',
        activityType: { $literal: 'payment' },
        createdAt: '$createdAt',
        candidateName: '$user.name',
        candidateEmail: '$user.email',
        amount: '$amount',
        currency: '$currency',
        status: '$status',
      },
    },
  ];
  try {
    const rows = await getPaymentsColl().aggregate(pipeline).toArray();
    return rows.map((r) => ({
      _id: 'pay_' + r._id_raw,
      candidateId: r.candidateId,
      activityType: r.activityType,
      description: 'Payment event',
      createdAt: r.createdAt,
      candidateName: r.candidateName,
      candidateEmail: r.candidateEmail,
      metadata: { amount: r.amount, currency: r.currency, status: r.status },
    }));
  } catch { return []; }
};

const buildCandidateFilter = async (candidateId, candidateSearch) => {
  const userIds = new Set();
  const candidateEmails = new Set();

  if (candidateId) {
    try {
      const oid = new mongoose.Types.ObjectId(candidateId);
      const candidate = await getCandidatesColl().findOne({ _id: oid }, { email: 1 });
      if (candidate && candidate.email) {
        const user = await getUsersColl().findOne({ email: candidate.email, role: 'jobseeker' }, { _id: 1 });
        if (user) userIds.add(user._id.toString());
      }
      const directUser = await getUsersColl().findOne({ _id: oid }, { _id: 1 });
      if (directUser) userIds.add(directUser._id.toString());
      userIds.add(oid.toString());
    } catch (_e) { /* not a valid ObjectId */ }
  }

  if (candidateSearch && candidateSearch.trim()) {
    const re = new RegExp(escapeRegex(candidateSearch.trim()), 'i');
    const candidates = await getCandidatesColl().find({
      $or: [{ name: re }, { email: re }],
    }).project({ email: 1, _id: 1 }).toArray();
    candidates.forEach((c) => {
      if (c.email) candidateEmails.add(c.email);
      userIds.add(c._id.toString());
    });
    const users = await getUsersColl().find({
      role: 'jobseeker',
      $or: [{ name: re }, { email: re }],
    }).project({ _id: 1, email: 1 }).toArray();
    users.forEach((u) => {
      userIds.add(u._id.toString());
      if (u.email) candidateEmails.add(u.email);
    });
  }

  const oidIds = Array.from(userIds).map((id) => {
    try { return new mongoose.Types.ObjectId(id); } catch { return null; }
  }).filter(Boolean);

  return {
    userIds: oidIds,
    candidateEmails: Array.from(candidateEmails),
    hasFilter: Boolean(candidateId || (candidateSearch && candidateSearch.trim())),
  };
};

export const getActivities = async (req, res) => {
  try {
    const {
      page = 1, limit = 20, activityType, candidateId, candidateSearch,
      range, startDate, endDate, sortOrder = 'desc',
    } = req.query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(200, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (range || startDate || endDate) {
      const { start, end } = parseRange(range, startDate, endDate);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const candidateFilter = await buildCandidateFilter(candidateId, candidateSearch);
    let regMatch = {};
    let appMatch = {};
    let saveMatch = {};
    let payMatch = {};

    if (candidateFilter.hasFilter && candidateFilter.userIds.length === 0) {
      return res.status(200).json({
        activities: [],
        pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 },
        filters: {
          activityTypes: ACTIVITY_TYPES_LIST.map((k) => ({ value: k, label: ACTIVITY_LABELS[k] || k })),
        },
        empty: true,
        message: 'No matching candidates found.',
      });
    }

    if (candidateFilter.hasFilter && candidateFilter.userIds.length > 0) {
      regMatch._id = { $in: candidateFilter.userIds };
      appMatch.applicant = { $in: candidateFilter.userIds };
      saveMatch.jobseeker = { $in: candidateFilter.userIds };
      payMatch.userId = { $in: candidateFilter.userIds };
    }

    const realActivityFilter = { ...filter };
    if (activityType) realActivityFilter.activityType = activityType;
    const realActivities = await fetchRealCandidateActivities(
      realActivityFilter,
      candidateFilter.userIds,
    );

    const seenTypes = new Set(realActivities.map((a) => a.activityType).filter(Boolean));

    const sources = [Promise.resolve(realActivities)];
    if ((!activityType || activityType === 'registration') && !seenTypes.has('registration')) {
      sources.push(fetchRegistrationEvents(filter, regMatch));
    }
    if ((!activityType || activityType === 'job_application') && !seenTypes.has('job_application')) {
      sources.push(fetchApplicationEvents(filter, appMatch));
    }
    if ((!activityType || activityType === 'job_save') && !seenTypes.has('job_save')) {
      sources.push(fetchSavedJobEvents(filter, saveMatch));
    }
    if ((!activityType || activityType === 'payment') && !seenTypes.has('payment')) {
      sources.push(fetchPaymentEvents(filter, payMatch));
    }

    const results = await Promise.all(sources);
    let merged = [];
    results.forEach((r) => { merged = merged.concat(r || []); });

    if (activityType) {
      merged = merged.filter((a) => a.activityType === activityType);
    }

    merged.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sortOrder === 'asc' ? ta - tb : tb - ta;
    });

    const total = merged.length;
    const pageItems = merged.slice(skip, skip + limitNum).map((e) => ({
      _id: e._id,
      candidateId: e.candidateId,
      activityType: e.activityType,
      description: e.description || ACTIVITY_DESCRIPTIONS[e.activityType] || 'Activity',
      relatedJobId: e.relatedJobId || null,
      createdAt: e.createdAt,
      jobTitle: e.jobTitle || undefined,
      metadata: e.metadata || undefined,
      candidate: {
        _id: e.candidateId,
        name: e.candidateName || null,
        email: e.candidateEmail || null,
      },
    }));

    return res.status(200).json({
      activities: pageItems,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: limitNum > 0 ? Math.ceil(total / limitNum) : 0,
      },
      filters: {
        activityTypes: ACTIVITY_TYPES_LIST.map((k) => ({ value: k, label: ACTIVITY_LABELS[k] || k })),
      },
      empty: total === 0,
      message: total === 0 ? 'No activities found in the selected range.' : undefined,
    });
  } catch (error) {
    console.error('Get activities error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getActivityStats = async (req, res) => {
  try {
    const { range = '30d', startDate, endDate } = req.query;
    const { start, end } = parseRange(range, startDate, endDate);
    const dateFilter = { createdAt: { $gte: start, $lte: end } };

    let realByType = {};
    try {
      const realGroups = await getCandidateActivitiesColl()
        .aggregate([
          { $match: dateFilter },
          { $group: { _id: '$activityType', count: { $sum: 1 } } },
        ])
        .toArray();
      realGroups.forEach((g) => { realByType[g._id] = g.count; });
    } catch (_e) { /* leave empty */ }

    const seenTypes = new Set(Object.keys(realByType));

    const legacySources = [];
    if (!seenTypes.has('registration')) legacySources.push(fetchRegistrationEvents(dateFilter, {}));
    if (!seenTypes.has('job_application')) legacySources.push(fetchApplicationEvents(dateFilter, {}));
    if (!seenTypes.has('job_save')) legacySources.push(fetchSavedJobEvents(dateFilter, {}));
    if (!seenTypes.has('payment')) legacySources.push(fetchPaymentEvents(dateFilter, {}));

    const legacyResults = await Promise.all(legacySources);
    const mergedLegacy = [];
    legacyResults.forEach((r) => { r.forEach((e) => mergedLegacy.push(e)); });

    const legacyByType = {};
    mergedLegacy.forEach((e) => {
      if (e.activityType) legacyByType[e.activityType] = (legacyByType[e.activityType] || 0) + 1;
    });

    const byTypeMap = {};
    ACTIVITY_TYPES_LIST.forEach((t) => {
      byTypeMap[t] = (realByType[t] || 0) + (legacyByType[t] || 0);
    });

    const byType = Object.entries(byTypeMap)
      .map(([type, count]) => ({ type, label: ACTIVITY_LABELS[type] || type, count }))
      .sort((a, b) => b.count - a.count);

    let realTimeline = {};
    try {
      const timelineRaw = await getCandidateActivitiesColl()
        .aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                day: { $dayOfMonth: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray();
      timelineRaw.forEach((g) => {
        const y = g._id.year;
        const m = String(g._id.month).padStart(2, '0');
        const d = String(g._id.day).padStart(2, '0');
        realTimeline[y + '-' + m + '-' + d] = g.count;
      });
    } catch (_e) { /* leave empty */ }

    const byDate = { ...realTimeline };
    mergedLegacy.forEach((e) => {
      const d = e.createdAt ? formatDateKey(new Date(e.createdAt)) : null;
      if (!d) return;
      if (!byDate[d]) byDate[d] = 0;
      byDate[d] += 1;
    });

    const timeline = Object.entries(byDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    const totalCount = Object.values(byTypeMap).reduce((a, b) => a + b, 0);

    return res.status(200).json({
      byType,
      timeline,
      total: totalCount,
      empty: totalCount === 0,
      message: totalCount === 0 ? 'No activity statistics available for the selected range.' : undefined,
      range: { start: start.toISOString(), end: end.toISOString() },
    });
  } catch (error) {
    console.error('Activity stats error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getActivityTypes = (req, res) => {
  return res.status(200).json({
    types: ACTIVITY_TYPES_LIST.map((k) => ({ value: k, label: ACTIVITY_LABELS[k] || k })),
  });
};

export default {
  getActivities,
  getActivityStats,
  getActivityTypes,
};
