import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();
// Use public DNS because the local DNS resolver is refusing MongoDB SRV queries
dns.setServers(['8.8.8.8', '8.8.4.4']);
const SENSITIVE_FIELDS = ['password', 'pwd', 'secret', 'token', 'jwt', 'apiKey', 'apikey', 'authorization'];
const REDACTED = '[REDACTED]';

const isSensitive = (key) => {
  const k = String(key).toLowerCase();
  return SENSITIVE_FIELDS.some((s) => k.includes(s));
};

const sanitizeValue = (key, value) => {
  if (isSensitive(key)) return REDACTED;
  if (typeof value === 'string' && value.length > 200) {
    return value.slice(0, 200) + '... [truncated]';
  }
  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }
  if (value && typeof value === 'object' && value instanceof Date) {
    return value.toISOString();
  }
  if (value && typeof value === 'object' && value._bsontype === 'ObjectId') {
    return `ObjectId(${String(value)})`;
  }
  if (Buffer.isBuffer(value)) {
    return `Buffer(${value.length})`;
  }
  return value;
};

const getFieldType = (value) => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'Array';
  if (value instanceof Date) return 'Date';
  if (value && typeof value === 'object' && value._bsontype === 'ObjectId') return 'ObjectId';
  if (value && typeof value === 'object' && value._bsontype === 'Binary') return 'Binary';
  if (typeof value === 'object' && !Array.isArray(value)) return 'Object';
  return typeof value;
};

const inspectCollection = async (db, collectionName, sampleSize = 3) => {
  const collection = db.collection(collectionName);
  const count = await collection.estimatedDocumentCount();
  const sample = await collection.find().limit(sampleSize).toArray();

  const fieldsMap = new Map();

  for (const doc of sample) {
    for (const [key, value] of Object.entries(doc)) {
      if (!fieldsMap.has(key)) {
        fieldsMap.set(key, new Set());
      }
      fieldsMap.get(key).add(getFieldType(value));
    }
  }

  const fields = [];
  for (const [name, types] of fieldsMap.entries()) {
    fields.push({ name, types: Array.from(types) });
  }

  const sanitizedSamples = sample.map((doc) => {
    const cleaned = {};
    for (const [key, value] of Object.entries(doc)) {
      cleaned[key] = sanitizeValue(key, value);
    }
    return cleaned;
  });

  return { name: collectionName, count, fields, samples: sanitizedSamples };
};

const printSeparator = (label) => {
  console.log('\n' + '='.repeat(80));
  console.log(`  ${label}`);
  console.log('='.repeat(80));
};

const main = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('[INSPECT] FATAL: MONGO_URI is not defined in environment variables');
    process.exit(1);
  }

  printSeparator('MongoDB Database Inspection (Read-Only)');
  console.log('\n[INSPECT] Connecting to MongoDB...');

  let conn;
  try {
    conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 30000,
      maxPoolSize: 2,
      family: 4,
    });
    console.log('[INSPECT] ✅ Connection established');
  } catch (err) {
    console.error(`[INSPECT] ❌ Connection failed: ${err.message}`);
    console.error('[INSPECT]    (This may be a DNS/network issue in this environment.');
    console.error('[INSPECT]     Run `node scripts/inspectDatabase.js` locally to inspect the real DB.)');
    process.exit(1);
  }

  const db = conn.connection.db;
  const dbName = db.databaseName;
  const host = conn.connection.host;

  printSeparator('1. Database Info');
  console.log(`  Database Name : ${dbName}`);
  console.log(`  Host          : ${host}`);

  let collections;
  try {
    collections = await db.listCollections().toArray();
  } catch (err) {
    console.error(`[INSPECT] ❌ Failed to list collections: ${err.message}`);
    await conn.connection.close();
    process.exit(1);
  }

  const collectionNames = collections.map((c) => c.name).sort();

  printSeparator('2. Collections Found');
  if (collectionNames.length === 0) {
    console.log('  (No collections found in this database)');
  } else {
    for (const name of collectionNames) {
      const coll = collections.find((c) => c.name === name);
      const type = coll?.type || 'collection';
      console.log(`  - ${name}  (${type})`);
    }
  }

  printSeparator('3. Collection Details (schema sampling)');
  const inspections = [];
  for (const name of collectionNames) {
    console.log(`\n  Collection: ${name}`);
    try {
      const info = await inspectCollection(db, name, 3);
      inspections.push(info);
      console.log(`    Document count: ${info.count}`);
      console.log(`    Fields (${info.fields.length}):`);
      for (const f of info.fields) {
        const sensitive = isSensitive(f.name) ? '  ⚠️  sensitive' : '';
        console.log(`      - ${f.name}: ${f.types.join(' | ')}${sensitive}`);
      }
      if (info.samples.length > 0) {
        console.log(`    Sample document keys: ${Object.keys(info.samples[0]).join(', ')}`);
      }
    } catch (err) {
      console.error(`    ⚠️  Inspection error: ${err.message}`);
    }
  }

  printSeparator('4. Role / Collection Mapping');
  const roleMap = {
    candidates: [],
    jobs: [],
    applications: [],
    admins: [],
    activity: [],
    visitors: [],
    other: [],
  };

  const nameHints = {
    candidates: ['candidate', 'user', 'users', 'applicant', 'profile'],
    jobs: ['job', 'position', 'posting', 'vacancy'],
    applications: ['application', 'apply', 'submission'],
    admins: ['admin', 'administrator', 'staff', 'recruiter'],
    activity: ['activity', 'audit', 'event', 'log'],
    visitors: ['visitor', 'visit', 'traffic', 'session'],
  };

  for (const col of inspections) {
    const n = col.name.toLowerCase();
    let matched = false;
    for (const [role, hints] of Object.entries(nameHints)) {
      if (hints.some((h) => n.includes(h))) {
        roleMap[role].push(col.name);
        matched = true;
        break;
      }
    }
    if (!matched) roleMap.other.push(col.name);
  }

  for (const [role, cols] of Object.entries(roleMap)) {
    const colEntry = inspections.find((i) => cols.includes(i.name));
    const count = colEntry?.count ?? 0;
    console.log(`  ${role.padEnd(14)}: ${cols.length ? cols.join(', ') : '(none)'}  [docs: ${count}]`);
  }

  printSeparator('5. Candidate Identification & Role Storage');
  const candidateCollections = [...roleMap.candidates, ...roleMap.admins, ...roleMap.other]
    .filter(Boolean)
    .map((n) => inspections.find((i) => i.name === n))
    .filter(Boolean);

  for (const col of candidateCollections) {
    const hasRole = col.fields.some((f) => f.name.toLowerCase() === 'role');
    const hasStatus = col.fields.some((f) => f.name.toLowerCase() === 'status');
    const hasType = col.fields.some((f) => f.name.toLowerCase().includes('type') && f.name !== '__t');
    const hasPassword = col.fields.some((f) => f.name.toLowerCase() === 'password');
    const hasEmail = col.fields.some((f) => f.name.toLowerCase() === 'email');
    const hasDiscriminator = col.fields.some((f) => f.name === '__t');
    console.log(`  ${col.name}:`);
    console.log(`    has role field    : ${hasRole}`);
    console.log(`    has user type     : ${hasType}`);
    console.log(`    has status field  : ${hasStatus}`);
    console.log(`    has password      : ${hasPassword}`);
    console.log(`    has email         : ${hasEmail}`);
    console.log(`    discriminator (__t): ${hasDiscriminator}`);
  }

  printSeparator('6. Analytics-Useful Fields by Collection');
  for (const col of inspections) {
    const dateFields = col.fields.filter((f) => f.types.includes('Date'));
    const idFields = col.fields.filter((f) => f.types.includes('ObjectId') && f.name !== '_id');
    const enumishFields = col.fields.filter((f) =>
      ['status', 'role', 'type', 'level', 'source', 'page', 'activityType', 'deviceType', 'isActive']
        .map((n) => n.toLowerCase())
        .includes(f.name.toLowerCase())
    );
    const numFields = col.fields.filter((f) => f.types.includes('number'));
    console.log(`\n  ${col.name} (${col.count} docs):`);
    if (dateFields.length) console.log(`    Date fields       : ${dateFields.map((f) => f.name).join(', ')}`);
    if (idFields.length) console.log(`    Reference fields  : ${idFields.map((f) => f.name).join(', ')}`);
    if (enumishFields.length) console.log(`    Categorical fields: ${enumishFields.map((f) => f.name).join(', ')}`);
    if (numFields.length) console.log(`    Numeric fields    : ${numFields.map((f) => f.name).join(', ')}`);
  }

  printSeparator('7. Missing / Future Activity Tracking Fields');
  const candidateCol = inspections.find((c) => roleMap.candidates.includes(c.name));
  if (candidateCol) {
    const activityWishlist = [
      'lastLoginAt',
      'lastActivityAt',
      'totalApplications',
      'source',
      'profileViews',
      'searchCount',
      'savedJobs',
      'emailVerified',
      'onboardingCompleted',
    ];
    const existing = candidateCol.fields.map((f) => f.name);
    const missing = activityWishlist.filter((w) => !existing.some((e) => e.toLowerCase() === w.toLowerCase()));
    console.log(`  Based on collection: ${candidateCol.name}`);
    console.log(`  Already present: ${activityWishlist.filter((w) => existing.some((e) => e.toLowerCase() === w.toLowerCase())).join(', ') || '(none)'}`);
    console.log(`  Missing for activity tracking: ${missing.join(', ') || '(none, all present!)'}`);
  }

  printSeparator('8. Summary Table');
  console.log('\n  | Collection | Count | Candidates | Apps | Jobs | Admins | Activity | Visitors |');
  console.log('  |------------|-------|------------|------|------|--------|----------|----------|');
  for (const col of inspections) {
    const n = col.name;
    const mark = (list) => (list.includes(n) ? 'YES' : '-');
    console.log(
      `  | ${n.padEnd(10)} | ${String(col.count).padEnd(5)} | ${mark(roleMap.candidates).padEnd(10)} | ${mark(roleMap.applications).padEnd(4)} | ${mark(roleMap.jobs).padEnd(4)} | ${mark(roleMap.admins).padEnd(6)} | ${mark(roleMap.activity).padEnd(8)} | ${mark(roleMap.visitors).padEnd(8)} |`
    );
  }

  printSeparator('Inspection Complete');
  console.log('\n[INSPECT] ✅ Read-only inspection finished. No data modified.');
  console.log('[INSPECT] Closing MongoDB connection...');

  await conn.connection.close();
  console.log('[INSPECT] ✅ Connection closed safely.\n');
  process.exit(0);
};

main().catch((err) => {
  console.error(`[INSPECT] ❌ Fatal error: ${err.message}`);
  process.exit(1);
});
