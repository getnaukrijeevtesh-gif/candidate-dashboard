import mongoose from 'mongoose';

const PAGES = [
  'home',
  'jobs',
  'job_details',
  'registration',
  'login',
  'candidate_dashboard',
  'profile',
  'other',
];

const visitorSchema = new mongoose.Schema({
  visitorId: { type: String, index: true },
  sessionId: { type: String, default: '' },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', index: true },
  isRegistered: { type: Boolean, default: false, index: true },
  page: { type: String, enum: PAGES, default: 'other', index: true },
  pageTitle: { type: String, default: '' },
  path: { type: String, default: '' },
  referrer: { type: String, default: '' },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  deviceType: { type: String, enum: ['desktop', 'mobile', 'tablet'], default: 'desktop' },
  browser: { type: String, default: '' },
  os: { type: String, default: '' },
  country: { type: String, default: '' },
  city: { type: String, default: '' },
  durationSeconds: { type: Number, default: 0 },
}, { collection: 'visitors', strict: false, timestamps: true });

visitorSchema.index({ createdAt: -1 });
visitorSchema.index({ visitorId: 1, createdAt: -1 });
visitorSchema.index({ page: 1, createdAt: -1 });

const Visitor = mongoose.model('Visitor', visitorSchema);
export default Visitor;
