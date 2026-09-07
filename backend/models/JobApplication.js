import mongoose from 'mongoose';

const jobApplicationSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', index: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  status: {
    type: String,
    enum: ['Applied', 'Accepted', 'Rejected', 'In Review'],
    default: 'Applied',
    index: true,
  },
}, { collection: 'applications', strict: false, timestamps: true });

jobApplicationSchema.index({ applicant: 1, job: 1 });
jobApplicationSchema.index({ status: 1, createdAt: -1 });
jobApplicationSchema.index({ applicant: 1, createdAt: -1 });
jobApplicationSchema.index({ job: 1, createdAt: -1 });
jobApplicationSchema.index({ createdAt: -1 });

jobApplicationSchema.post('save', async function (doc) {
  try {
    if (this.isNew && doc.applicant) {
      const activitiesColl = mongoose.connection.collection('candidateactivities');
      await activitiesColl.insertOne({
        candidateId: doc.applicant,
        activityType: 'job_application',
        jobId: doc.job,
        relatedJobId: doc.job,
        status: doc.status,
        details: doc.status ? ('Applied with status: ' + doc.status) : 'Applied to job',
        createdAt: doc.createdAt || new Date(),
      });
    }
  } catch (_hookErr) {
    // Swallow hook errors so they never break the original save
  }
});

const JobApplication = mongoose.model('JobApplication', jobApplicationSchema);
export default JobApplication;
