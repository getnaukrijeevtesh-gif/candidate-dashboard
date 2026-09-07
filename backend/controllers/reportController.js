import mongoose from 'mongoose';
import { parseRange } from '../utils/dateUtils.js';
import { format } from 'date-fns';

const Y2K = new Date(Date.UTC(2000, 0, 1));
const clampStart = (d) => (d < Y2K ? new Date(Y2K.getTime()) : new Date(d.getTime()));

const countActiveCandidatesFast = async (usersColl, start, end) => {
  const s = clampStart(start);
  const active = new Set();
  try {
    const userIds = await usersColl
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
    const ids = await mongoose.connection.db.collection('applications').distinct('applicant', {
      createdAt: { $gte: s, $lte: end },
    });
    ids.forEach((id) => active.add(String(id)));
  } catch {}
  try {
    const ids = await mongoose.connection.db.collection('savedjobs').distinct('jobseeker', {
      createdAt: { $gte: s, $lte: end },
    });
    ids.forEach((id) => active.add(String(id)));
  } catch {}
  try {
    const ids = await mongoose.connection.db.collection('payments').distinct('userId', {
      createdAt: { $gte: s, $lte: end },
    });
    ids.forEach((id) => active.add(String(id)));
  } catch {}
  try {
    const ids = await mongoose.connection.db.collection('candidateactivities').distinct('candidateId', {
      createdAt: { $gte: s, $lte: end },
    });
    ids.forEach((id) => active.add(String(id)));
  } catch {}
  try {
    const candIds = await mongoose.connection.db
      .collection('candidates')
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

const toCSV = (rows) => {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(',')];
  rows.forEach((r) => lines.push(headers.map((h) => escape(r[h])).join(',')));
  return lines.join('\n');
};

const sendCSV = (res, filename, rows) => {
  const csv = toCSV(rows);
  const bom = '\uFEFF';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(bom + csv);
};

const flattenCandidate = (c) => ({
  ID: String(c._id),
  Name: c.name || '',
  Email: c.email || '',
  Phone: c.phone || '',
  Location: c.location || '',
  Company: c.company || '',
  Education: c.education || '',
  Experience: c.experience || '',
  'Job Role': c.job_role || '',
  Skills: c.skills ? String(c.skills) : '',
  Resume: c.resume_file ? 'Yes' : 'No',
});

const flattenActivity = (a) => ({
  ID: String(a._id || ''),
  'Candidate ID': a.candidateId ? String(a.candidateId) : '',
  'Candidate Name': a.candidateName || '',
  'Candidate Email': a.candidateEmail || '',
  'Activity Type': a.activityType || '',
  Description: a.description || '',
  Page: a.page || '',
  Source: a.source || '',
  'IP Address': a.ipAddress || '',
  'Created At': a.createdAt ? format(new Date(a.createdAt), 'yyyy-MM-dd HH:mm') : '',
});

const flattenApplication = (a) => ({
  ID: String(a._id),
  'Candidate ID': a.applicant ? String(a.applicant) : '',
  'Candidate Name': a.applicantName || '',
  'Candidate Email': a.applicantEmail || '',
  'Job Title': a.jobTitle || '',
  Status: a.status || '',
  'Applied At': a.createdAt ? format(new Date(a.createdAt), 'yyyy-MM-dd HH:mm') : '',
  'Updated At': a.updatedAt ? format(new Date(a.updatedAt), 'yyyy-MM-dd HH:mm') : '',
});

const flattenVisitor = (v) => ({
  'Visitor ID': v.visitorId || '',
  'Session ID': v.sessionId || '',
  'Is Registered': v.isRegistered ? 'Yes' : 'No',
  'Candidate ID': v.candidateId ? String(v.candidateId) : '',
  Page: v.page || '',
  'Page Title': v.pageTitle || '',
  Path: v.path || '',
  Referrer: v.referrer || '',
  Device: v.deviceType || '',
  Browser: v.browser || '',
  OS: v.os || '',
  Country: v.country || '',
  City: v.city || '',
  'Duration (sec)': v.durationSeconds ?? 0,
  'Visited At': v.createdAt ? format(new Date(v.createdAt), 'yyyy-MM-dd HH:mm') : '',
});

const firstAgg = (pipelineResult, fallback) => (Array.isArray(pipelineResult) && pipelineResult.length > 0) ? pipelineResult[0] : fallback;

const safeColl = (name) => mongoose.connection.db.collection(name);

export const getReportSummary = async (req, res) => {
  try {
    const { range = '30d', startDate, endDate } = req.query;
    const { start, end } = parseRange(range, startDate, endDate);

    const db = mongoose.connection.db;
    const candidatesColl = db.collection('candidates');
    const usersColl = db.collection('users');
    const applicationsColl = db.collection('applications');
    const savedjobsColl = db.collection('savedjobs');
    const paymentsColl = db.collection('payments');
    const candidateActivitiesColl = db.collection('candidateactivities');
    const visitorsColl = db.collection('visitors');

    const usersDateFilter = { createdAt: { $gte: start, $lte: end } };
    const usersUpdatedFilter = { updatedAt: { $gte: start, $lte: end } };
    const jobseekerFilter = { role: 'jobseeker' };
    const appsDateFilter = {
      createdAt: { $gte: start, $lte: end },
      $expr: { $gt: [{ $year: '$createdAt' }, 2000] },
    };
    const activitiesDateFilter = {
      createdAt: { $gte: start, $lte: end },
      $expr: { $gt: [{ $year: '$createdAt' }, 2000] },
    };
    const visitorsDateFilter = {
      createdAt: { $gte: start, $lte: end },
      $expr: { $gt: [{ $year: '$createdAt' }, 2000] },
    };

    const [
      totalCandidatesAllTime,
      totalJobseekersAllTime,
      periodUserEmails,
      activeCandidatesAgg,
      registrationCount,
      applicationCount,
      savedJobCount,
      paymentCount,
      totalApplicationsInRange,
      byStatusAgg,
      realActivityCounts,
      totalVisitsCount,
      uniqueVisitorsCount,
    ] = await Promise.all([
      candidatesColl.estimatedDocumentCount().catch(() => candidatesColl.countDocuments({})),
      usersColl.countDocuments(jobseekerFilter).catch(() => 0),
      usersColl.distinct('email', { ...jobseekerFilter, ...usersDateFilter }).catch(() => []),
      usersColl.aggregate([
        { $match: jobseekerFilter },
        {
          $lookup: {
            from: 'applications',
            let: { uid: '$_id' },
           pipeline: [
  {
    $match: {
      $expr: {
        $and: [
          { $eq: ['$applicant', '$$uid'] },
          { $gte: ['$createdAt', start] },
          { $lte: ['$createdAt', end] }
        ]
      }
    }
  },
  {
    $limit: 1
  }
],
            as: 'hasApp',
          },
        },
        {
          $lookup: {
            from: 'savedjobs',
            let: { uid: '$_id' },
            pipeline: [
  {
    $match: {
      $expr: {
        $and: [
          { $eq: ['$applicant', '$$uid'] },
          { $gte: ['$createdAt', start] },
          { $lte: ['$createdAt', end] }
        ]
      }
    }
  },
  {
    $limit: 1
  }
],
            as: 'hasSj',
          },
        },
        {
          $lookup: {
            from: 'payments',
            let: { uid: '$_id' },
            pipeline: [
  {
    $match: {
      $expr: {
        $and: [
          { $eq: ['$applicant', '$$uid'] },
          { $gte: ['$createdAt', start] },
          { $lte: ['$createdAt', end] }
        ]
      }
    }
  },
  {
    $limit: 1
  }
],
            as: 'hasPay',
          },
        },
        {
          $lookup: {
            from: 'candidateactivities',
            let: { uid: '$_id' },
            pipeline: [
  {
    $match: {
      $expr: {
        $and: [
          { $eq: ['$applicant', '$$uid'] },
          { $gte: ['$createdAt', start] },
          { $lte: ['$createdAt', end] }
        ]
      }
    }
  },
  {
    $limit: 1
  }
],
            as: 'hasActivity',
          },
        },
        {
          $match: {
            $or: [
              usersDateFilter,
              usersUpdatedFilter,
              { lastLoginAt: { $gte: start, $lte: end } },
              { lastActivityAt: { $gte: start, $lte: end } },
              { 'hasApp.0': { $exists: true } },
              { 'hasSj.0': { $exists: true } },
              { 'hasPay.0': { $exists: true } },
              { 'hasActivity.0': { $exists: true } },
            ],
          },
        },
        { $count: 'count' },
      ]).toArray(),
      usersColl.countDocuments({ ...jobseekerFilter, ...usersDateFilter }),
      applicationsColl.countDocuments(appsDateFilter),
      savedjobsColl.countDocuments({ createdAt: { $gte: start, $lte: end } }).catch(() => 0),
      paymentsColl.countDocuments({ createdAt: { $gte: start, $lte: end } }).catch(() => 0),
      applicationsColl.countDocuments(appsDateFilter),
      applicationsColl.aggregate([
        { $match: appsDateFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $project: { status: '$_id', count: 1, _id: 0 } },
        { $sort: { count: -1 } },
      ]).toArray(),
      candidateActivitiesColl.aggregate([
        { $match: activitiesDateFilter },
        { $group: { _id: '$activityType', count: { $sum: 1 } } },
      ]).toArray().catch(() => []),
      visitorsColl.countDocuments(visitorsDateFilter).catch(() => 0),
      visitorsColl.aggregate([
        { $match: visitorsDateFilter },
        { $group: { _id: '$visitorId' } },
        { $count: 'count' },
      ]).toArray().then(r => r[0]?.count ?? 0).catch(() => 0),
    ]);

    const totalCandidatesBase = totalCandidatesAllTime > 0 ? totalCandidatesAllTime : totalJobseekersAllTime;
    const totalCandidatesInPeriod = periodUserEmails && periodUserEmails.length > 0
      ? await candidatesColl.countDocuments({ email: { $in: periodUserEmails } }).catch(() => 0)
      : 0;
    const candidatesInPeriodFinal = totalCandidatesInPeriod > 0 ? totalCandidatesInPeriod : registrationCount;

    const activeCandidates = firstAgg(activeCandidatesAgg, { count: 0 }).count || 0;

    const realActivityMap = {};
    realActivityCounts.forEach(a => { realActivityMap[a._id] = a.count; });
    const realRegistrationCount = realActivityMap['registration'] ?? 0;
    const realApplicationCount = realActivityMap['job_application'] ?? 0;
    const realLoginCount = realActivityMap['login'] ?? 0;
    const realProfileUpdateCount = realActivityMap['profile_update'] ?? 0;
    const realResumeUploadCount = realActivityMap['resume_upload'] ?? 0;
    const realJobViewCount = realActivityMap['job_view'] ?? 0;
    const realJobSearchCount = realActivityMap['job_search'] ?? 0;
    const realSavedJobCount = realActivityMap['job_save'] ?? 0;
    const realPaymentCount = realActivityMap['payment'] ?? 0;

    const hasRealActivities = Object.keys(realActivityMap).length > 0;
    const finalRegistrationCount = hasRealActivities && realRegistrationCount > 0 ? Math.max(realRegistrationCount, registrationCount) : registrationCount;
    const finalApplicationCount = hasRealActivities && realApplicationCount > 0 ? Math.max(realApplicationCount, applicationCount) : applicationCount;
    const finalSavedJobCount = hasRealActivities && realSavedJobCount > 0 ? Math.max(realSavedJobCount, savedJobCount) : savedJobCount;
    const finalPaymentCount = hasRealActivities && realPaymentCount > 0 ? Math.max(realPaymentCount, paymentCount) : paymentCount;

    const totalActivities = finalRegistrationCount + finalApplicationCount + finalSavedJobCount + finalPaymentCount + realLoginCount + realProfileUpdateCount + realResumeUploadCount + realJobViewCount + realJobSearchCount;

    const byActivity = [];
    if (totalActivities > 0) {
      if (finalRegistrationCount > 0) byActivity.push({ activityType: 'registration', count: finalRegistrationCount });
      if (finalApplicationCount > 0) byActivity.push({ activityType: 'job_application', count: finalApplicationCount });
      if (finalSavedJobCount > 0) byActivity.push({ activityType: 'job_save', count: finalSavedJobCount });
      if (finalPaymentCount > 0) byActivity.push({ activityType: 'payment', count: finalPaymentCount });
      if (realLoginCount > 0) byActivity.push({ activityType: 'login', count: realLoginCount });
      if (realProfileUpdateCount > 0) byActivity.push({ activityType: 'profile_update', count: realProfileUpdateCount });
      if (realResumeUploadCount > 0) byActivity.push({ activityType: 'resume_upload', count: realResumeUploadCount });
      if (realJobViewCount > 0) byActivity.push({ activityType: 'job_view', count: realJobViewCount });
      if (realJobSearchCount > 0) byActivity.push({ activityType: 'job_search', count: realJobSearchCount });
      byActivity.sort((a, b) => b.count - a.count);
    }

    const byStatus = byStatusAgg && byStatusAgg.length > 0
      ? byStatusAgg.map(s => ({ status: s.status, count: s.count }))
      : [];

    res.status(200).json({
      period: {
        start: format(new Date(start), 'yyyy-MM-dd'),
        end: format(new Date(end), 'yyyy-MM-dd'),
      },
      summary: {
        totalCandidates: totalCandidatesBase,
        totalCandidatesInPeriod: candidatesInPeriodFinal,
        activeCandidates,
        inactiveCandidates: Math.max(0, candidatesInPeriodFinal - activeCandidates),
        totalActivities,
        totalVisits: totalVisitsCount,
        uniqueVisitors: uniqueVisitorsCount,
        totalApplications: totalApplicationsInRange,
      },
      byStatus,
      byActivity,
    });
  } catch (error) {
    console.error('Report summary error:', error);
    res.status(500).json({ message: 'Server error fetching report summary' });
  }
};

export const exportCandidatesCSV = async (req, res) => {
  try {
    const { range, startDate, endDate, location, search } = req.query;
    const db = mongoose.connection.db;
    const candidatesColl = db.collection('candidates');
    const usersColl = db.collection('users');

    const filter = {};

    if (range || startDate || endDate) {
      const { start, end } = parseRange(range, startDate, endDate);
      const userEmailsInRange = await usersColl.distinct('email', {
        role: 'jobseeker',
        createdAt: { $gte: start, $lte: end },
      }).catch(() => []);
      if (userEmailsInRange.length > 0) {
        filter.email = { $in: userEmailsInRange };
      } else {
        filter.email = { $in: [] };
      }
    }
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (search && search.trim()) {
      const re = new RegExp(String(search).trim(), 'i');
      filter.$or = [{ name: re }, { email: re }];
    }

    const cursor = candidatesColl.find(filter);
    const rows = [];
    for await (const doc of cursor) {
      rows.push(flattenCandidate(doc));
    }
    const fname = `candidates_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    sendCSV(res, fname, rows);
  } catch (error) {
    console.error('Export candidates CSV error:', error);
    res.status(500).json({ message: 'Server error exporting candidates' });
  }
};

const buildSynthesizedActivities = async (start, end, activityTypeFilter) => {
  const db = mongoose.connection.db;
  const activities = [];

  const pushIfMatches = (type, arr) => {
    if (!activityTypeFilter || activityTypeFilter === type) {
      for (const a of arr) activities.push(a);
    }
  };

  const realActivitiesFromDB = await db.collection('candidateactivities')
    .aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          $expr: { $gt: [{ $year: '$createdAt' }, 2000] },
          ...(activityTypeFilter ? { activityType: activityTypeFilter } : {}),
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: 10000 },
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
          candidateId: 1,
          activityType: 1,
          description: 1,
          page: 1,
          source: 1,
          ipAddress: 1,
          createdAt: 1,
          candidateName: { $ifNull: [{ $arrayElemAt: ['$userDoc.name', 0] }, { $arrayElemAt: ['$candDoc.name', 0] }] },
          candidateEmail: { $ifNull: [{ $arrayElemAt: ['$userDoc.email', 0] }, { $arrayElemAt: ['$candDoc.email', 0] }] },
        },
      },
    ])
    .toArray()
    .catch(() => []);

  realActivitiesFromDB.forEach(a => pushIfMatches(a.activityType, [a]));

  const realTypesSeen = new Set(realActivitiesFromDB.map(a => a.activityType));

  if (!realTypesSeen.has('registration') && (!activityTypeFilter || activityTypeFilter === 'registration')) {
    const regActivities = await db.collection('users').aggregate([
      { $match: { role: 'jobseeker', createdAt: { $gte: start, $lte: end } } },
      { $sort: { createdAt: -1 } },
      { $limit: 10000 },
      { $project: { _id: 1, name: 1, email: 1, createdAt: 1 } },
    ]).toArray().catch(() => []);

    pushIfMatches('registration', regActivities.map((u, i) => ({
      _id: `reg_${u._id}_${i}`,
      candidateId: u._id,
      candidateName: u.name || '',
      candidateEmail: u.email || '',
      activityType: 'registration',
      description: `Registered new account`,
      page: 'Sign Up',
      source: 'website',
      ipAddress: '',
      createdAt: u.createdAt,
    })));
  }

  if (!realTypesSeen.has('job_application') && (!activityTypeFilter || activityTypeFilter === 'job_application')) {
    const appActivities = await db.collection('applications').aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          $expr: { $gt: [{ $year: '$createdAt' }, 2000] },
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: 10000 },
      {
        $lookup: {
          from: 'users',
          localField: 'applicant',
          foreignField: '_id',
          as: 'applicantDoc',
        },
      },
      { $unwind: { path: '$applicantDoc', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'jobs',
          localField: 'job',
          foreignField: '_id',
          as: 'jobDoc',
        },
      },
      { $unwind: { path: '$jobDoc', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          applicant: 1,
          status: 1,
          createdAt: 1,
          'applicantDoc.name': 1,
          'applicantDoc.email': 1,
          'jobDoc.title': 1,
        },
      },
    ]).toArray().catch(() => []);

    pushIfMatches('job_application', appActivities.map((a, i) => ({
      _id: `app_${a._id}_${i}`,
      candidateId: a.applicant,
      candidateName: a.applicantDoc?.name || '',
      candidateEmail: a.applicantDoc?.email || '',
      activityType: 'job_application',
      description: `Applied for job: ${a.jobDoc?.title || 'Unknown Position'} (Status: ${a.status || 'Applied'})`,
      page: 'Job Application',
      source: 'website',
      ipAddress: '',
      createdAt: a.createdAt,
    })));
  }

  if (!realTypesSeen.has('job_save') && (!activityTypeFilter || activityTypeFilter === 'job_save')) {
    const sjActivities = await db.collection('savedjobs').aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $sort: { createdAt: -1 } },
      { $limit: 10000 },
      {
        $lookup: {
          from: 'users',
          localField: 'jobseeker',
          foreignField: '_id',
          as: 'jsDoc',
        },
      },
      { $unwind: { path: '$jsDoc', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'jobs',
          localField: 'job',
          foreignField: '_id',
          as: 'jobDoc',
        },
      },
      { $unwind: { path: '$jobDoc', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          jobseeker: 1,
          createdAt: 1,
          'jsDoc.name': 1,
          'jsDoc.email': 1,
          'jobDoc.title': 1,
        },
      },
    ]).toArray().catch(() => []);

    pushIfMatches('job_save', sjActivities.map((sj, i) => ({
      _id: `sj_${sj._id}_${i}`,
      candidateId: sj.jobseeker,
      candidateName: sj.jsDoc?.name || '',
      candidateEmail: sj.jsDoc?.email || '',
      activityType: 'job_save',
      description: `Saved job: ${sj.jobDoc?.title || 'Unknown Position'}`,
      page: 'Job Details',
      source: 'website',
      ipAddress: '',
      createdAt: sj.createdAt,
    })));
  }

  if (!realTypesSeen.has('payment') && (!activityTypeFilter || activityTypeFilter === 'payment')) {
    const payActivities = await db.collection('payments').aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $sort: { createdAt: -1 } },
      { $limit: 10000 },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userDoc',
        },
      },
      { $unwind: { path: '$userDoc', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          userId: 1,
          amount: 1,
          status: 1,
          txnid: 1,
          createdAt: 1,
          email: 1,
          'userDoc.name': 1,
        },
      },
    ]).toArray().catch(() => []);

    pushIfMatches('payment', payActivities.map((p, i) => ({
      _id: `pay_${p._id}_${i}`,
      candidateId: p.userId,
      candidateName: p.userDoc?.name || '',
      candidateEmail: p.userDoc?.email || p.email || '',
      activityType: 'payment',
      description: `Payment of ${p.amount || '0'} completed (Transaction: ${p.txnid || 'N/A'}, Status: ${p.status || 'unknown'})`,
      page: 'Checkout',
      source: 'payment_gateway',
      ipAddress: '',
      createdAt: p.createdAt,
    })));
  }

  activities.sort((a, b) => {
    const ta = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt || 0).getTime();
    const tb = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });

  return activities.slice(0, 10000);
};

export const exportActivitiesCSV = async (req, res) => {
  try {
    const { range, startDate, endDate, activityType } = req.query;

    let start = new Date(0);
    let end = new Date();
    if (range || startDate || endDate) {
      const parsed = parseRange(range, startDate, endDate);
      start = parsed.start;
      end = parsed.end;
    }

    const activities = await buildSynthesizedActivities(start, end, activityType);
    const rows = activities.map(flattenActivity);
    const fname = `activities_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    sendCSV(res, fname, rows);
  } catch (error) {
    console.error('Export activities CSV error:', error);
    res.status(500).json({ message: 'Server error exporting activities' });
  }
};

export const exportApplicationsCSV = async (req, res) => {
  try {
    const { range, startDate, endDate, status } = req.query;
    const db = mongoose.connection.db;
    const applicationsColl = db.collection('applications');

    const filter = {};
    if (range || startDate || endDate) {
      const { start, end } = parseRange(range, startDate, endDate);
      filter.createdAt = { $gte: start, $lte: end };
    }
    if (status) filter.status = status;
    filter.$expr = { $gt: [{ $year: '$createdAt' }, 2000] };

    const data = await applicationsColl.aggregate([
      { $match: filter },
      { $sort: { createdAt: -1 } },
      { $limit: 10000 },
      {
        $lookup: {
          from: 'users',
          let: { aid: '$applicant' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$aid'] } } },
            { $project: { _id: 1, name: 1, email: 1 } },
          ],
          as: 'applicantDoc',
        },
      },
      { $unwind: { path: '$applicantDoc', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'jobs',
          let: { jid: '$job' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$jid'] } } },
            { $project: { _id: 1, title: 1 } },
          ],
          as: 'jobDoc',
        },
      },
      { $unwind: { path: '$jobDoc', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          applicant: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          applicantName: '$applicantDoc.name',
          applicantEmail: '$applicantDoc.email',
          jobTitle: '$jobDoc.title',
        },
      },
    ]).toArray();

    const rows = data.map(flattenApplication);
    const fname = `applications_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    sendCSV(res, fname, rows);
  } catch (error) {
    console.error('Export applications CSV error:', error);
    res.status(500).json({ message: 'Server error exporting applications' });
  }
};

export const exportVisitorsCSV = async (req, res) => {
  try {
    const { range, startDate, endDate } = req.query;
    const db = mongoose.connection.db;
    const visitorsColl = db.collection('visitors');

    const filter = {};
    if (range || startDate || endDate) {
      const { start, end } = parseRange(range, startDate, endDate);
      filter.createdAt = { $gte: start, $lte: end };
      filter.$expr = { $gt: [{ $year: '$createdAt' }, 2000] };
    }

    const cursor = visitorsColl.find(filter).sort({ createdAt: -1 }).limit(10000);
    const rows = [];
    for await (const doc of cursor) {
      rows.push(flattenVisitor(doc));
    }
    const fname = `visitors_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    sendCSV(res, fname, rows);
  } catch (error) {
    console.error('Export visitors CSV error:', error);
    res.status(500).json({ message: 'Server error exporting visitors' });
  }
};

export default {
  getReportSummary,
  exportCandidatesCSV,
  exportActivitiesCSV,
  exportApplicationsCSV,
  exportVisitorsCSV,
};
