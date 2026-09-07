import mongoose from 'mongoose';
import Candidate from '../models/Candidate.js';
import JobApplication from '../models/JobApplication.js';
import { parseRange } from '../utils/dateUtils.js';

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getUsersCollection = () => mongoose.connection.collection('users');
const getSavedJobsCollection = () => mongoose.connection.collection('savedjobs');
const getPaymentsCollection = () => mongoose.connection.collection('payments');

export const getCandidates = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      sortBy = '_id',
      sortOrder = 'desc',
      status,
      location,
      range,
      startDate,
      endDate,
    } = req.query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(100, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (search && search.trim()) {
      const re = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [
        { name: re },
        { email: re },
        { phone: re },
        { location: re },
      ];
    }

    if (location) filter.location = { $regex: escapeRegex(location), $options: 'i' };

    if (range || startDate || endDate) {
      const { start, end } = parseRange(range, startDate, endDate);
      const rangeDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
      const isEffectivelyAllTime = rangeDays >= 365 * 10 || (range === 'allTime' || range === 'all');
      if (!isEffectivelyAllTime) {
        const usersColl = getUsersCollection();
        const matchingUsers = await usersColl
          .find({
            role: 'jobseeker',
            createdAt: { $gte: start, $lte: end },
          })
          .project({ email: 1, _id: 0 })
          .toArray();
        const emails = matchingUsers.map((u) => u.email).filter(Boolean);
        if (emails.length === 0) {
          return res.status(200).json({
            candidates: [],
            pagination: {
              page: pageNum,
              limit: limitNum,
              total: 0,
              totalPages: 0,
            },
            filters: {
              locationOptions: [],
            },
          });
        }
        filter.email = { $in: emails };
      }
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    if (!sort._id) sort._id = sortOrder === 'asc' ? 1 : -1;

    const [candidates, total] = await Promise.all([
      Candidate.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Candidate.countDocuments(filter),
    ]);

    const locationOptions = await Candidate.aggregate([
      { $match: { location: { $ne: null, $ne: '', $exists: true } } },
      { $group: { _id: '$location' } },
      { $sort: { _id: 1 } },
      { $limit: 50 },
    ]);

    res.status(200).json({
      candidates,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
      filters: {
        locationOptions: locationOptions.map((l) => l._id),
      },
    });
  } catch (error) {
    console.error('Get candidates error:', error);
    res.status(500).json({ message: 'Server error fetching candidates' });
  }
};

export const getCandidateById = async (req, res) => {
  try {
    const { id } = req.params;
    const candidate = await Candidate.findById(id).lean();
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    const usersColl = getUsersCollection();
    const savedJobsColl = getSavedJobsCollection();
    const paymentsColl = getPaymentsCollection();

    const matchingUser = candidate.email
      ? await usersColl.findOne({ email: candidate.email, role: 'jobseeker' }, { _id: 1, name: 1, email: 1, createdAt: 1 })
      : null;

    const userId = matchingUser ? matchingUser._id : null;

    const candidateOids = [];
    if (userId) candidateOids.push(new mongoose.Types.ObjectId(userId));
    try { candidateOids.push(new mongoose.Types.ObjectId(id)); } catch (_e) { /* not oid */ }

    const activitiesColl = mongoose.connection.collection('candidateactivities');

    const [applications, savedJobsCount, paymentsCount, realActivitiesByType, realActivityTimeline] = await Promise.all([
      userId
        ? JobApplication.aggregate([
            { $match: { applicant: new mongoose.Types.ObjectId(userId) } },
            { $sort: { createdAt: -1 } },
            { $limit: 50 },
            {
              $lookup: {
                from: 'jobs',
                localField: 'job',
                foreignField: '_id',
                as: 'jobInfo',
              },
            },
            { $unwind: { path: '$jobInfo', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 1,
                job: 1,
                applicant: 1,
                status: 1,
                createdAt: 1,
                updatedAt: 1,
                jobTitle: '$jobInfo.title',
                jobType: '$jobInfo.type',
                jobLocation: '$jobInfo.location',
              },
            },
          ])
        : [],
      userId
        ? savedJobsColl.countDocuments({ jobseeker: new mongoose.Types.ObjectId(userId) })
        : 0,
      userId
        ? paymentsColl.countDocuments({ $or: [{ userId: new mongoose.Types.ObjectId(userId) }, { candidateEmail: candidate.email }] })
        : 0,
      (async () => {
        try {
          const groups = await activitiesColl
            .aggregate([
              { $match: { candidateId: { $in: candidateOids } } },
              { $group: { _id: '$activityType', count: { $sum: 1 } } },
            ])
            .toArray();
          const map = {};
          groups.forEach((g) => { map[g._id] = g.count; });
          return map;
        } catch (_e) { return {}; }
      })(),
      (async () => {
        try {
          const rows = await activitiesColl
            .find({ candidateId: { $in: candidateOids } })
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray();
          return rows.map((r) => ({
            _id: r._id,
            candidateId: r.candidateId,
            activityType: r.activityType,
            description: r.details || r.metadata ? JSON.stringify(r.metadata) : null,
            createdAt: r.createdAt,
            relatedJobId: r.jobId || r.relatedJobId || null,
          }));
        } catch (_e) { return []; }
      })(),
    ]);

    const realTypesSeen = new Set(Object.keys(realActivitiesByType));

    const activityStats = {
      registration: realActivitiesByType.registration ?? (matchingUser ? 1 : 0),
      login: realActivitiesByType.login ?? 0,
      logout: realActivitiesByType.logout ?? 0,
      profile_update: realActivitiesByType.profile_update ?? 0,
      resume_upload: realActivitiesByType.resume_upload ?? 0,
      job_search: realActivitiesByType.job_search ?? 0,
      job_view: realActivitiesByType.job_view ?? 0,
      job_save: realActivitiesByType.job_save ?? savedJobsCount,
      job_unsave: realActivitiesByType.job_unsave ?? 0,
      job_application: realActivitiesByType.job_application ?? applications.length,
    };

    const syntheticFallback = (realTypesSeen.has('job_application') ? 0 : applications.length)
      + (realTypesSeen.has('job_save') ? 0 : savedJobsCount)
      + paymentsCount
      + (realTypesSeen.has('registration') ? 0 : (matchingUser ? 1 : 0));
    const realCount = Object.values(realActivitiesByType).reduce((a, b) => a + b, 0);
    const totalActivities = realCount + syntheticFallback;

    const synthesizedCounts = {
      applicationsCount: applications.length,
      savedJobsCount,
      paymentsCount,
      activitiesCount: totalActivities,
    };

    res.status(200).json({
      candidate: {
        ...candidate,
        ...(matchingUser ? { userCreatedAt: matchingUser.createdAt, userId: matchingUser._id } : {}),
      },
      activityStats,
      applications,
      activityTimeline: realActivityTimeline,
      activityCount: totalActivities,
      empty: totalActivities === 0,
      message: totalActivities === 0 ? 'No candidate activity data available.' : undefined,
      synthesizedCounts,
    });
  } catch (error) {
    console.error('Candidate detail error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateCandidateStatus = async (req, res) => {
  return res.status(400).json({
    message: 'Status field not supported on real candidates collection. The candidates collection does not contain a status field.',
  });
};

export const deleteCandidate = async (req, res) => {
  return res.status(405).json({
    message: 'Deletion of real candidate records is disabled in production mode to preserve data integrity.',
  });
};
