import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();
dns.setServers(['8.8.8.8', '8.8.4.4']);

const main = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) { console.error('MONGO_URI missing'); process.exit(1); }

  console.log('=== DEEP INSPECTION START ===\n');
  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000, maxPoolSize: 2, family: 4,
  });
  const db = conn.connection.db;

  // --- 1. Users roles distribution ---
  console.log('1. USERS COLLECTION ROLES:');
  const roles = await db.collection('users').aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]).toArray();
  roles.forEach(r => console.log(`   role="${r._id}": ${r.count} users`));

  // --- 2. Sample user docs with different roles ---
  console.log('\n2. SAMPLE USER DOCS (by role, 1 each):');
  const roleList = await db.collection('users').distinct('role');
  for (const role of roleList.slice(0, 5)) {
    console.log(`\n   [role=${role}]`);
    const projection = { password: 0, legacyPasswordHash: 0, resetPasswordCode: 0, resetPasswordExpires: 0, resetPasswordLastRequest: 0 };
    const samples = await db.collection('users').find({ role }).limit(1).project(projection).toArray();
    for (const s of samples) {
      const info = {
        _id: s._id.toString(),
        name: s.name,
        email: s.email,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        skills_len: Array.isArray(s.skills) ? s.skills.length : null,
        companyName: s.companyName || null,
      };
      console.log('   -', JSON.stringify(info).slice(0, 350));
    }
  }

  // --- 3. Sample candidate docs ---
  console.log('\n3. SAMPLE CANDIDATE DOCS (5 samples):');
  const candSamples = await db.collection('candidates').find().limit(5).toArray();
  candSamples.forEach((s, i) => {
    const info = {
      _id: s._id.toString(),
      name: s.name,
      email: s.email,
      phone: s.phone ? 'set' : null,
      resume_file: s.resume_file ? 'set' : null,
      company: s.company,
      education: s.education,
      experience: s.experience,
      job_role: s.job_role,
      location: s.location,
      skills_len: s.skills ? String(s.skills).length : null,
    };
    console.log(`   [${i + 1}]`, JSON.stringify(info).slice(0, 400));
  });

  // --- 4. Check email overlap ---
  console.log('\n4. EMAIL OVERLAP: candidates <-> users');
  const candEmailArr = await db.collection('candidates').find({ email: { $exists: true, $ne: '' } }).limit(500).project({ email: 1 }).toArray();
  const firstBatchEmails = candEmailArr.map(c => c.email);
  console.log(`   Sampled ${firstBatchEmails.length} candidate emails`);

  const overlapCount = await db.collection('users').countDocuments({ email: { $in: firstBatchEmails } });
  console.log(`   First ${firstBatchEmails.length} emails found in users collection: ${overlapCount}`);

  console.log('   Checking specific candidate emails in users:');
  for (const ce of firstBatchEmails.slice(0, 5)) {
    const found = await db.collection('users').findOne({ email: ce }, { projection: { _id: 1, role: 1, name: 1, createdAt: 1 } });
    if (found) {
      console.log(`     ${ce}: FOUND user_id=${found._id.toString()}, role=${found.role}, created=${found.createdAt?.toISOString?.()}`);
    } else {
      console.log(`     ${ce}: NOT FOUND in users`);
    }
  }

  // --- 5. Applications deep dive ---
  console.log('\n5. APPLICATIONS DEEP DIVE:');
  const appCount = await db.collection('applications').estimatedDocumentCount();
  console.log(`   Total applications: ${appCount}`);

  const appSamples = await db.collection('applications').find().limit(5).toArray();
  appSamples.forEach((a, i) => {
    console.log(`   [${i + 1}] app_id=${a._id.toString()}, applicant=${a.applicant?.toString?.() || a.applicant}, job=${a.job?.toString?.() || a.job}, status=${a.status}, createdAt=${a.createdAt?.toISOString?.() || a.createdAt}`);
  });

  console.log('\n   Checking applications.applicant -> users vs candidates:');
  const applicantIds = appSamples.filter(a => a.applicant).map(a => a.applicant);
  for (const aid of applicantIds.slice(0, 5)) {
    const inUsers = await db.collection('users').findOne({ _id: aid }, { projection: { _id: 1, role: 1, name: 1, email: 1, createdAt: 1 } });
    const inCandidates = await db.collection('candidates').findOne({ _id: aid }, { projection: { _id: 1, name: 1, email: 1 } });
    console.log(`     applicant=${aid.toString()}: users=${!!inUsers}${inUsers ? `(role=${inUsers.role},email=${inUsers.email})` : ''}, candidates=${!!inCandidates}${inCandidates ? `(email=${inCandidates.email})` : ''}`);
  }

  console.log('\n   Checking applications.job -> jobs:');
  const jobIds = appSamples.filter(a => a.job).map(a => a.job);
  for (const jid of jobIds.slice(0, 5)) {
    const inJobs = await db.collection('jobs').findOne({ _id: jid }, { projection: { _id: 1, title: 1, company: 1, createdAt: 1 } });
    console.log(`     job=${jid.toString()}: jobs=${!!inJobs}${inJobs ? `(title="${inJobs.title}")` : ''}`);
  }

  console.log('\n   Application status distribution:');
  const statusDist = await db.collection('applications').aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]).toArray();
  statusDist.forEach(s => console.log(`     status="${s._id}": ${s.count}`));

  console.log('\n   Applications date range (createdAt):');
  const dateRange = await db.collection('applications').aggregate([
    { $group: { _id: null, minDate: { $min: '$createdAt' }, maxDate: { $max: '$createdAt' } } },
  ]).toArray();
  if (dateRange[0]) {
    console.log(`     Min: ${dateRange[0].minDate?.toISOString?.() || 'N/A'}`);
    console.log(`     Max: ${dateRange[0].maxDate?.toISOString?.() || 'N/A'}`);
  }

  // --- 6. Saved jobs references ---
  console.log('\n6. SAVED JOBS REFERENCES:');
  const sjSamples = await db.collection('savedjobs').find().limit(3).toArray();
  sjSamples.forEach((sj, i) => {
    console.log(`   [${i + 1}] jobseeker=${sj.jobseeker?.toString?.()}, job=${sj.job?.toString?.()}, createdAt=${sj.createdAt?.toISOString?.()}`);
  });
  if (sjSamples[0]?.jobseeker) {
    const jsInUsers = await db.collection('users').findOne({ _id: sjSamples[0].jobseeker }, { projection: { _id: 1, role: 1, email: 1 } });
    const jsInCandidates = await db.collection('candidates').findOne({ _id: sjSamples[0].jobseeker }, { projection: { _id: 1, email: 1 } });
    console.log(`   jobseeker ref check: in users=${!!jsInUsers}${jsInUsers ? `(role=${jsInUsers.role})` : ''}, in candidates=${!!jsInCandidates}`);
  }

  // --- 7. Users collection date range per role ---
  console.log('\n7. USERS DATE RANGE BY ROLE:');
  const roleStats = await db.collection('users').aggregate([
    { $group: { _id: '$role', count: { $sum: 1 }, minCreated: { $min: '$createdAt' }, maxCreated: { $max: '$createdAt' } } },
    { $sort: { count: -1 } },
  ]).toArray();
  roleStats.forEach(r => {
    const min = r.minCreated?.toISOString?.()?.slice(0, 10) || 'N/A';
    const max = r.maxCreated?.toISOString?.()?.slice(0, 10) || 'N/A';
    console.log(`     role="${r._id}": count=${r.count}, ${min} -> ${max}`);
  });

  // --- 8. Jobs stats ---
  console.log('\n8. JOBS STATS:');
  const jobsDateRange = await db.collection('jobs').aggregate([
    { $group: { _id: null, minDate: { $min: '$createdAt' }, maxDate: { $max: '$createdAt' } } },
  ]).toArray();
  if (jobsDateRange[0]) {
    const mn = jobsDateRange[0].minDate?.toISOString?.()?.slice(0, 10) || 'N/A';
    const mx = jobsDateRange[0].maxDate?.toISOString?.()?.slice(0, 10) || 'N/A';
    console.log(`   Date range: ${mn} to ${mx}`);
  }
  const isClosedDist = await db.collection('jobs').aggregate([
    { $group: { _id: '$isClosed', count: { $sum: 1 } } },
  ]).toArray();
  isClosedDist.forEach(j => console.log(`   isClosed=${j._id}: ${j.count}`));
  const typeDist = await db.collection('jobs').aggregate([
    { $group: { _id: '$type', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]).toArray();
  console.log('   Job types:');
  typeDist.slice(0, 5).forEach(j => console.log(`     type="${j._id}": ${j.count}`));

  // --- 9. Candidate _id vs User _id overlap ---
  console.log('\n9. CANDIDATE._id vs USER._id OVERLAP:');
  let idOverlap = 0;
  for (const cs of candSamples) {
    const inUsers = await db.collection('users').findOne({ _id: cs._id }, { projection: { _id: 1 } });
    if (inUsers) idOverlap++;
  }
  console.log(`   Sample candidates with same _id in users: ${idOverlap}/${candSamples.length}`);

  // --- 10. Payments sample ---
  console.log('\n10. PAYMENTS SAMPLE (3 docs):');
  const payProjection = { payuHash: 0, payuResponse: 0 };
  const paySamples = await db.collection('payments').find().limit(3).project(payProjection).toArray();
  paySamples.forEach((p, i) => {
    const info = {
      txnid: p.txnid,
      amount: p.amount,
      status: p.status,
      userId: p.userId?.toString?.(),
      source: p.source,
      createdAt: p.createdAt?.toISOString?.()?.slice(0, 10),
      email: p.email,
    };
    console.log(`   [${i + 1}]`, JSON.stringify(info));
  });

  // --- 11. Aggregated: Applications joined with jobs and users ---
  console.log('\n11. AGGREGATED: Application join check (1 sample):');
  const joinedApp = await db.collection('applications').aggregate([
    { $limit: 1 },
    { $lookup: { from: 'jobs', localField: 'job', foreignField: '_id', as: 'jobDoc' } },
    { $lookup: { from: 'users', localField: 'applicant', foreignField: '_id', as: 'applicantDoc' } },
    { $lookup: { from: 'candidates', localField: 'applicant', foreignField: '_id', as: 'candidateDoc' } },
    { $project: { status: 1, createdAt: 1, jobDoc: { $slice: ['$jobDoc', 1] }, applicantDoc: { $slice: ['$applicantDoc', 1] }, candidateDoc: { $slice: ['$candidateDoc', 1] } } },
  ]).toArray();
  if (joinedApp[0]) {
    const j = joinedApp[0];
    console.log(`   status=${j.status}, createdAt=${j.createdAt?.toISOString?.()}`);
    console.log(`   job joined: ${j.jobDoc?.length > 0 ? 'YES (title=' + j.jobDoc[0].title + ')' : 'NO'}`);
    console.log(`   applicant joined to users: ${j.applicantDoc?.length > 0 ? 'YES (role=' + j.applicantDoc[0].role + ',email=' + j.applicantDoc[0].email + ')' : 'NO'}`);
    console.log(`   applicant joined to candidates: ${j.candidateDoc?.length > 0 ? 'YES (email=' + j.candidateDoc[0].email + ')' : 'NO'}`);
  }

  console.log('\n=== DEEP INSPECTION COMPLETE ===');
  await conn.connection.close();
};

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
