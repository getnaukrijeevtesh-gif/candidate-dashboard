import dns from 'dns';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
dns.setServers(['8.8.8.8']);

const log = (label, value) => {
  console.log(`\n  ▸ ${label}:`);
  console.log(`    ${JSON.stringify(value, null, 2).split('\n').join('\n    ')}`);
};

const sampleFields = async (collName, db, limit = 3) => {
  const coll = db.collection(collName);
  const count = await coll.estimatedDocumentCount().catch(() => coll.countDocuments({}).catch(() => -1));
  console.log(`\n  ▸ ${collName} collection: ${count.toLocaleString()} docs`);
  if (count <= 0) return;
  const samples = await coll.find().limit(limit).toArray();
  samples.forEach((doc, i) => {
    const fields = Object.keys(doc).sort();
    console.log(`    [sample ${i + 1}] _id=${doc._id}`);
    console.log(`      fields: ${fields.join(', ')}`);
    for (const f of ['createdAt', 'updatedAt', 'lastLoginAt', 'lastActivityAt', 'appliedAt', 'registeredAt', 'role', 'email', 'name', 'status', 'activityType', 'source', 'visitorId', 'candidateId', 'applicant', 'jobseeker', 'userId', 'job']) {
      if (doc[f] !== undefined) {
        let v = doc[f];
        if (v instanceof Date) v = v.toISOString();
        else if (typeof v === 'string' && v.length > 60) v = v.slice(0, 60) + '...';
        else if (mongoose.Types.ObjectId.isValid(v)) v = String(v);
        console.log(`      ${f}: ${v}`);
      }
    }
  });

  // Date range of createdAt if it exists
  try {
    const withCreatedAt = await coll.aggregate([
      { $match: { createdAt: { $exists: true, $type: 'date' } } },
      { $group: { _id: null, min: { $min: '$createdAt' }, max: { $max: '$createdAt' }, count: { $sum: 1 } } },
    ]).toArray();
    if (withCreatedAt.length > 0) {
      console.log(`      createdAt range: ${withCreatedAt[0].min?.toISOString()} to ${withCreatedAt[0].max?.toISOString()} (${withCreatedAt[0].count.toLocaleString()} docs with date)`);
    } else {
      console.log(`      createdAt: no valid date fields found`);
    }
  } catch (e) {
    console.log(`      createdAt range: error ${e.message}`);
  }
};

const run = async () => {
  console.log('\n========================================');
  console.log('   Database Diagnostic — Read-Only');
  console.log('========================================');

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 15000,
    socketTimeoutMS: 30000,
    family: 4,
  });
  const db = mongoose.connection.db;
  console.log(`\n✅ Connected. Database: ${db.databaseName}`);

  const collections = await db.listCollections().toArray();
  const names = collections.map((c) => c.name).sort();
  console.log(`\nCollections in DB: ${names.join(', ')}`);

  for (const name of names) {
    try {
      await sampleFields(name, db, 2);
    } catch (e) {
      console.log(`  ▸ ${name}: ERROR - ${e.message}`);
    }
  }

  // Cross-check: count candidates & applications in last 365 days that have valid dates
  try {
    const now = new Date();
    const yearAgo = new Date(now.getTime() - 365 * 86400000);
    const candsInYear = await db.collection('candidates').countDocuments({ createdAt: { $gte: yearAgo, $lte: now } }).catch(() => -1);
    const appsInYear = await db.collection('applications').countDocuments({ createdAt: { $gte: yearAgo, $lte: now } }).catch(() => -1);
    const actsInYear = await db.collection('candidateactivities').countDocuments({ createdAt: { $gte: yearAgo, $lte: now } }).catch(() => -1);
    const visInYear = await db.collection('visitors').countDocuments({ createdAt: { $gte: yearAgo, $lte: now } }).catch(() => -1);
    const usersInYear = names.includes('users') ? await db.collection('users').countDocuments({ createdAt: { $gte: yearAgo, $lte: now } }).catch(() => -1) : -1;
    console.log('\n  ▸ Documents with valid createdAt in last 365 days:');
    console.log(`    candidates:        ${candsInYear.toLocaleString()}`);
    console.log(`    applications:      ${appsInYear.toLocaleString()}`);
    console.log(`    candidateactivities: ${actsInYear.toLocaleString()}`);
    console.log(`    visitors:          ${visInYear.toLocaleString()}`);
    if (names.includes('users')) console.log(`    users:             ${usersInYear.toLocaleString()}`);
  } catch (e) {
    console.log('\n  ▸ Date range check error:', e.message);
  }

  // Check if users collection exists and what roles it has
  if (names.includes('users')) {
    try {
      const userCount = await db.collection('users').estimatedDocumentCount();
      console.log(`\n  ▸ users collection total: ${userCount.toLocaleString()}`);
      if (userCount > 0) {
        const roles = await db.collection('users').aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]).toArray();
        console.log('    roles:', roles.map((r) => `${r._id ?? '(none)'}=${r.count}`).join(', '));
      }
    } catch (e) {
      console.log(`  ▸ users role check error: ${e.message}`);
    }
  } else {
    console.log('\n  ⚠️  "users" collection does NOT exist in this database!');
  }

  // If candidates have dates, check active candidates (lastActivityAt, lastLoginAt, or createdAt) in last 30 days
  try {
    const monthAgo = new Date(now.getTime() - 30 * 86400000);
    const cand30 = await db.collection('candidates').countDocuments({
      $or: [
        { lastActivityAt: { $gte: monthAgo, $lte: now } },
        { lastLoginAt: { $gte: monthAgo, $lte: now } },
        { createdAt: { $gte: monthAgo, $lte: now } },
      ],
    }).catch(() => -1);
    console.log(`\n  ▸ candidates "active" (any date field in last 30 days): ${cand30.toLocaleString()}`);
  } catch (e) {
    console.log(`\n  ▸ active candidates check error: ${e.message}`);
  }

  await mongoose.connection.close();
  console.log('\n✅ Done. Connection closed.\n');
  process.exit(0);
};

run().catch((e) => {
  console.error('\n❌ Fatal:', e.message);
  try { mongoose.connection.close(); } catch {}
  process.exit(1);
});
