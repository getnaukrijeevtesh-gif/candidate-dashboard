import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String, default: '' },
  resume_file: { type: String, default: '' },
  company: { type: String, default: null },
  education: { type: mongoose.Schema.Types.Mixed, default: null },
  experience: { type: mongoose.Schema.Types.Mixed, default: null },
  job_role: { type: String, default: null },
  location: { type: String, default: null },
  skills: { type: mongoose.Schema.Types.Mixed, default: null },
}, { collection: 'candidates', strict: false, _id: true });

candidateSchema.index({ email: 1 });
candidateSchema.index({ location: 1 });

candidateSchema.post('save', async function (doc) {
  try {
    const activitiesColl = mongoose.connection.collection('candidateactivities');
    if (this.isNew) {
      await activitiesColl.insertOne({
        candidateId: doc._id,
        activityType: 'registration',
        details: 'Candidate profile created or imported',
        createdAt: doc.createdAt || new Date(),
      });
    } else {
      const changes = Array.isArray(this.modifiedPaths) ? this.modifiedPaths() : [];
      const changed = new Set(changes);
      changed.delete('updatedAt');
      if (changed.has('resume_file')) {
        await activitiesColl.insertOne({
          candidateId: doc._id,
          activityType: 'resume_upload',
          details: 'Resume file updated on candidate profile',
          createdAt: new Date(),
        });
        changed.delete('resume_file');
      }
      if (changed.size > 0) {
        await activitiesColl.insertOne({
          candidateId: doc._id,
          activityType: 'profile_update',
          details: 'Updated fields: ' + Array.from(changed).join(', '),
          createdAt: new Date(),
        });
      }
    }
  } catch (_hookErr) {
    // Swallow hook errors so they never break the original save
  }
});

const Candidate = mongoose.model('Candidate', candidateSchema);
export default Candidate;
