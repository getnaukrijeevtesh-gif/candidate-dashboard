import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Candidate from '../models/Candidate.js';
import CandidateActivity from '../models/CandidateActivity.js';
import JobApplication from '../models/JobApplication.js';

dotenv.config();

const toNum = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;

const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const endOfDay = (d) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };
const addDays = (d, n) => new Date(d.getTime() + n*86400000);
const todayS = () => startOfDay(new Date());
const todayE = () => endOfDay(new Date());

const pick = (obj, keys) => {
  const o = {};
  keys.forEach(k => o[k] = obj?.[k]);
  return o;
};

const test = async (label, fn) => {
  process.stdout.write(`  • ${label}… `);
  try {
    const r = await fn();
    console.log(`✅ ${r === undefined || r === null ? '' : JSON.stringify(r).slice(0, 180)}`);
    return { ok: true };
  } catch (err) {
    console.log(`❌ ${err.message}`);
    return { ok: false, error: err.message };
  }
};

const main = async () => {
  console.log('\n=== Dashboard Sanity Checks (direct DB reads vs aggregation) ===');
  if (!process.env.MONGO_URI) {
    console.error('No MONGO_URI in env; skipping. Run with node to test against real DB.');
    process.exit(0);
  }
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected. Running against live data — no writes performed.\n');

  const regYesterday = await Candidate.countDocuments({ createdAt: { $gte: startOfDay(addDays(new Date(),-1)), $lte: endOfDay(addDays(new Date(),-1)) } });
  const regToday = await Candidate.countDocuments({ createdAt: { $gte: todayS(), $lte: todayE() } });
  const appsToday = await JobApplication.countDocuments({ appliedAt: { $gte: todayS(), $lte: todayE() } });

  const totalCands = await Candidate.estimatedDocumentCount();
  const totalApps = await JobApplication.estimatedDocumentCount();

  const statusDist = await Candidate.aggregate([{ $group: { _id: '$status', c: { $sum: 1 } } }, { $sort: { c: -1 } }]);
  const activeStatus = (statusDist.find(s => s._id === 'active')?.c) ?? 0;

  const now = new Date();
  const s30 = startOfDay(new Date(now.getTime() - 29*86400000));
  const e30 = endOfDay(now);
  const reg30 = await Candidate.countDocuments({ createdAt: { $gte: s30, $lte: e30 } });
  const prevEnd = new Date(s30.getTime() - 1);
  const prevStart = startOfDay(new Date(prevEnd.getTime() - (e30.getTime()-s30.getTime())));
  const regPrev = await Candidate.countDocuments({ createdAt: { $gte: prevStart, $lte: prevEnd } });
  const growth = regPrev === 0 ? (reg30 === 0 ? 0 : 100) : ((reg30-regPrev)/Math.abs(regPrev))*100;

  const active30Win = await Candidate.countDocuments({
    $or: [
      { lastActivityAt: { $gte: startOfDay(new Date(now.getTime()-29*86400000)), $lte: todayE() } },
      { lastLoginAt: { $gte: startOfDay(new Date(now.getTime()-29*86400000)), $lte: todayE() } },
      { createdAt: { $gte: startOfDay(new Date(now.getTime()-29*86400000)), $lte: todayE() } },
    ],
  });

  const inactive30Win = Math.max(0, totalCands - active30Win);
  const uniqAppCands30 = (await JobApplication.aggregate([
    { $match: { appliedAt: { $gte: s30, $lte: e30 } } },
    { $group: { _id: '$candidateId' } }, { $count: 'n' },
  ]))[0]?.n ?? 0;

  const cases = [
    ['Counts: totalCandidates, totalApplications', () => ({ totalCands, totalApps })],
    ['Preset counts: reg today, reg yesterday, apps today', () => ({ regToday, regYesterday, appsToday })],
    ['Registrations last 30 days + previous period + growth%', () => ({ reg30, regPrev, growth: growth.toFixed(2) })],
    ['Candidate status distribution (top 6)', () => statusDist.slice(0, 6)],
    ['Active candidates (30-day window: lastActivityAt OR lastLoginAt OR createdAt)', () => ({ active30Win, inactive30Win, status_active: activeStatus })],
    ['Unique candidateId in jobapplications (last30d)', () => ({ uniqAppCands30 })],
    ['Registration trend sample: last 7 days (day buckets)', async () => {
      const arr = [];
      for (let i=6;i>=0;i--) {
        const d = startOfDay(addDays(now, -i));
        const c = await Candidate.countDocuments({ createdAt: { $gte: d, $lte: endOfDay(d) } });
        arr.push({ date: d.toISOString().slice(0,10), count: c });
      }
      return arr;
    }],
    ['Application trend sample: last 7 days (day buckets)', async () => {
      const arr = [];
      for (let i=6;i>=0;i--) {
        const d = startOfDay(addDays(now, -i));
        const c = await JobApplication.countDocuments({ appliedAt: { $gte: d, $lte: endOfDay(d) } });
        arr.push({ date: d.toISOString().slice(0,10), count: c });
      }
      return arr;
    }],
    ['Recent 3 candidate activities with candidate+job join (sanity)', async () => {
      const rows = await CandidateActivity.find().sort({ createdAt: -1 }).limit(3)
        .populate({ path: 'candidateId', select: 'firstName lastName email' })
        .populate({ path: 'relatedJobId', select: 'title company' })
        .select('activityType description createdAt candidateId relatedJobId')
        .lean();
      return rows.map(r => ({
        activityType: r.activityType,
        createdAt: r.createdAt,
        candidate: r.candidateId && typeof r.candidateId === 'object'
          ? `${r.candidateId.firstName||''} ${r.candidateId.lastName||''}`.trim() || '(no candidate)'
          : '(not joined)',
        job: r.relatedJobId && typeof r.relatedJobId === 'object'
          ? `${r.relatedJobId.title||''}@${r.relatedJobId.company||''}` || '(no job)'
          : null,
      }));
    }],
    ['NaN/Infinity guards: zero previous case', () => {
      const safe = (prev, curr) => {
        const c = Number(curr), p = Number(prev);
        if (p===0 && c===0) return 0;
        if (p===0) return c>0 ? 100 : 0;
        const pct = ((c-p)/Math.abs(p))*100;
        if (!Number.isFinite(pct)) return 0;
        return Math.max(-1e6, Math.min(1e6, pct));
      };
      return {
        '0→0': safe(0,0),
        '0→5': safe(0,5),
        '10→20': safe(10,20),
        '20→10': safe(20,10),
        'NaN→any': safe(NaN, 10),
      };
    }],
  ];

  let passed = 0, total = 0;
  for (const [label, fn] of cases) {
    const r = await test(label, fn);
    total++;
    if (r.ok) passed++;
  }
  console.log(`\nResult: ${passed}/${total} checks completed against live MongoDB.`);
  console.log('Note: If network is unavailable, run this script locally to confirm numbers match API responses.');

  await mongoose.connection.close();
  process.exit(0);
};

main().catch(err => {
  console.error('Test error:', err.message);
  try { mongoose.connection.close(); } catch (_) {}
  process.exit(1);
});
