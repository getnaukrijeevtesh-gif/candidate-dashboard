import mongoose from 'mongoose';
import JobApplication from '../models/JobApplication.js';
import { parseRange } from '../utils/dateUtils.js';

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const VALID_STATUSES = ['Applied', 'Accepted', 'Rejected', 'In Review'];

const getUsersCollection = () => mongoose.connection.collection('users');

export const getApplications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      candidateId,
      search,
      range,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(200, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const matchFilter = {};

    if (status && VALID_STATUSES.includes(status)) {
      matchFilter.status = status;
    }

    if (candidateId) {
      const usersColl = getUsersCollection();
      let applicantId = null;
      try {
        const oid = new mongoose.Types.ObjectId(candidateId);
        const fromCandidates = await mongoose.connection.collection('candidates').findOne({ _id: oid }, { email: 1 });
        if (fromCandidates && fromCandidates.email) {
          const userRec = await usersColl.findOne({ email: fromCandidates.email, role: 'jobseeker' }, { _id: 1 });
          if (userRec) applicantId = userRec._id;
        }
        if (!applicantId) {
          const directUser = await usersColl.findOne({ _id: oid }, { _id: 1 });
          if (directUser) applicantId = directUser._id;
        }
      } catch (_e) {
        // candidateId is not a valid ObjectId, skip
      }
      if (applicantId) {
        matchFilter.applicant = new mongoose.Types.ObjectId(applicantId);
      } else {
        matchFilter.applicant = new mongoose.Types.ObjectId(candidateId);
      }
    }

    if (range || startDate || endDate) {
      const { start, end } = parseRange(range, startDate, endDate);
      matchFilter.createdAt = { $gte: start, $lte: end };
    }

    let searchMatch = null;
    if (search && search.trim()) {
      const re = new RegExp(escapeRegex(search.trim()), 'i');
      searchMatch = { $or: [] };
      const usersColl = getUsersCollection();
      const userMatches = await usersColl.find({
        role: 'jobseeker',
        $or: [{ name: re }, { email: re }],
      }).project({ _id: 1 }).toArray();
      const userIds = userMatches.map((u) => u._id);
      if (userIds.length > 0) {
        searchMatch.$or.push({ applicant: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) } });
      }
      const jobMatches = await mongoose.connection.collection('jobs').find({
        title: re,
      }).project({ _id: 1 }).toArray();
      const jobIds = jobMatches.map((j) => j._id);
      if (jobIds.length > 0) {
        searchMatch.$or.push({ job: { $in: jobIds.map((id) => new mongoose.Types.ObjectId(id)) } });
      }
      if (searchMatch.$or.length === 0) {
        return res.status(200).json({
          applications: [],
          pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 },
          statusOptions: VALID_STATUSES,
          statusCounts: VALID_STATUSES.map((s) => ({ status: s, count: 0 })),
        });
      }
    }

    const finalMatch = searchMatch
      ? { $and: [matchFilter, searchMatch] }
      : matchFilter;

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    if (sortBy !== 'createdAt') sort.createdAt = -1;

    const pipeline = [
      { $match: finalMatch },
      { $sort: sort },
      { $skip: skip },
      { $limit: limitNum },
      {
        $lookup: {
          from: 'users',
          localField: 'applicant',
          foreignField: '_id',
          as: 'candidate',
        },
      },
      { $unwind: { path: '$candidate', preserveNullAndEmptyArrays: true } },
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
          candidate: {
            _id: '$candidate._id',
            name: '$candidate.name',
            email: '$candidate.email',
          },
          jobTitle: '$jobInfo.title',
          jobType: '$jobInfo.type',
          jobLocation: '$jobInfo.location',
          jobInfo: {
            title: '$jobInfo.title',
            type: '$jobInfo.type',
            location: '$jobInfo.location',
            company: '$jobInfo.company',
          },
        },
      },
    ];

    const countPipeline = [
      { $match: finalMatch },
      { $count: 'total' },
    ];

    const statusCountsPipeline = [
      { $match: finalMatch },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ];

    const [applications, countResult, statusCountsRaw] = await Promise.all([
      JobApplication.aggregate(pipeline),
      JobApplication.aggregate(countPipeline),
      JobApplication.aggregate(statusCountsPipeline),
    ]);

    const total = countResult[0]?.total ?? 0;
    const countMap = {};
    statusCountsRaw.forEach((s) => { countMap[s._id] = s.count; });
    const statusCounts = VALID_STATUSES.map((s) => ({ status: s, count: countMap[s] ?? 0 }));

    res.status(200).json({
      applications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
      statusOptions: VALID_STATUSES,
      statusCounts,
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getApplicationById = async (req, res) => {
  try {
    const pipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
      {
        $lookup: {
          from: 'users',
          localField: 'applicant',
          foreignField: '_id',
          as: 'candidate',
        },
      },
      { $unwind: { path: '$candidate', preserveNullAndEmptyArrays: true } },
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
          candidate: {
            _id: '$candidate._id',
            name: '$candidate.name',
            email: '$candidate.email',
            phone: '$candidate.phone',
            location: '$candidate.location',
          },
          job: '$jobInfo._id',
          jobTitle: '$jobInfo.title',
          jobInfo: {
            _id: '$jobInfo._id',
            title: '$jobInfo.title',
            description: '$jobInfo.description',
            location: '$jobInfo.location',
            state: '$jobInfo.state',
            category: '$jobInfo.category',
            type: '$jobInfo.type',
            salaryMin: '$jobInfo.salaryMin',
            salaryMax: '$jobInfo.salaryMax',
            salaryFrequency: '$jobInfo.salaryFrequency',
            workMode: '$jobInfo.workMode',
          },
        },
      },
    ];

    const results = await JobApplication.aggregate(pipeline);
    const application = results[0];
    if (!application) return res.status(404).json({ message: 'Application not found' });
    res.status(200).json({ application });
  } catch (error) {
    console.error('Get application by id error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }
    const app = await JobApplication.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true },
    );
    if (!app) return res.status(404).json({ message: 'Application not found' });

    const pipeline = [
      { $match: { _id: app._id } },
      {
        $lookup: {
          from: 'users',
          localField: 'applicant',
          foreignField: '_id',
          as: 'candidate',
        },
      },
      { $unwind: { path: '$candidate', preserveNullAndEmptyArrays: true } },
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
          applicant: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          candidate: {
            _id: '$candidate._id',
            name: '$candidate.name',
            email: '$candidate.email',
          },
          jobTitle: '$jobInfo.title',
        },
      },
    ];
    const populated = await JobApplication.aggregate(pipeline);
    res.status(200).json({ application: populated[0] || app });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getApplicationStats = async (req, res) => {
  try {
    const { range, startDate, endDate } = req.query;
    const parsed = parseRange(range, startDate, endDate);
    const filter = { createdAt: { $gte: parsed.start, $lte: parsed.end } };

    const [byStatus, byJob, totalCount] = await Promise.all([
      JobApplication.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      JobApplication.aggregate([
        { $match: filter },
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
          $group: {
            _id: { jobId: '$job', title: '$jobInfo.title' },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      JobApplication.countDocuments(filter),
    ]);

    const statusMap = {};
    byStatus.forEach((b) => { statusMap[b._id] = b.count; });
    const byStatusResult = VALID_STATUSES.map((s) => ({ status: s, count: statusMap[s] ?? 0 }));

    const byJobResult = byJob.map((b) => ({
      jobId: b._id.jobId,
      jobTitle: b._id.title || '(Unknown job)',
      count: b.count,
    }));

    const bySource = [{ source: 'unknown', count: totalCount }];

    res.status(200).json({
      byStatus: byStatusResult,
      byJob: byJobResult,
      bySource,
      range: { start: parsed.start.toISOString(), end: parsed.end.toISOString() },
    });
  } catch (error) {
    console.error('Get application stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
