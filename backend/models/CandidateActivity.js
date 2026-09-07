import mongoose from 'mongoose';

const ACTIVITY_TYPES = [
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
];

const candidateActivitySchema = new mongoose.Schema({
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', index: true },
  activityType: { type: String, enum: ACTIVITY_TYPES, index: true },
  description: { type: String, default: '' },
  relatedJobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', index: true },
  page: { type: String, default: '' },
  source: { type: String, default: 'web' },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { collection: 'candidateactivities', strict: false, timestamps: true });

candidateActivitySchema.index({ candidateId: 1, createdAt: -1 });
candidateActivitySchema.index({ activityType: 1, createdAt: -1 });
candidateActivitySchema.index({ createdAt: -1 });

const CandidateActivity = mongoose.model('CandidateActivity', candidateActivitySchema);
export default CandidateActivity;
