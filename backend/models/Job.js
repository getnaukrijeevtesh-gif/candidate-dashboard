import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: { type: String, trim: true },
  description: { type: String, default: '' },
  location: { type: String, default: '' },
  state: { type: String, default: '' },
  category: { type: String, default: '' },
  type: { type: String, default: 'Full-Time' },
  company: { type: mongoose.Schema.Types.ObjectId, index: true },
  salaryMin: { type: Number, default: 0 },
  salaryMax: { type: Number, default: 0 },
  salaryFrequency: { type: String, default: '' },
  isClosed: { type: Boolean, default: false, index: true },
  applicationCount: { type: Number, default: 0 },
  gender: { type: String, default: '' },
  isBlueCollar: { type: Boolean, default: false },
  openPositions: { type: Number, default: 1 },
  workMode: { type: String, default: '' },
}, { collection: 'jobs', strict: false, timestamps: true });

jobSchema.index({ isClosed: 1, createdAt: -1 });
jobSchema.index({ title: 'text', location: 'text', category: 'text' });
jobSchema.index({ company: 1 });
jobSchema.index({ type: 1 });
jobSchema.index({ createdAt: -1 });

const Job = mongoose.model('Job', jobSchema);
export default Job;
