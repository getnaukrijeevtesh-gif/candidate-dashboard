import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, Clock, FileText, UserCheck, Briefcase, BookOpen, Award,
  Upload, Shield, BarChart3, Activity as ActivityIcon, File, DollarSign,
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import Avatar from '../components/Avatar.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Spinner from '../components/Spinner.jsx';
import api from '../services/api.js';
import { format, formatDistanceToNow } from 'date-fns';

const ACTIVITY_STYLES = {
  registration: { icon: UserCheck, color: 'bg-emerald-50 text-emerald-700' },
  login:        { icon: Shield,      color: 'bg-sky-50 text-sky-700' },
  logout:       { icon: Shield,      color: 'bg-surface-100 text-surface-700' },
  profile_update: { icon: BookOpen, color: 'bg-violet-50 text-violet-700' },
  resume_upload: { icon: Upload,   color: 'bg-amber-50 text-amber-700' },
  job_search:    { icon: BarChart3, color: 'bg-indigo-50 text-indigo-700' },
  job_view:     { icon: Briefcase,  color: 'bg-blue-50 text-blue-700' },
  job_save:    { icon: Award,     color: 'bg-fuchsia-50 text-fuchsia-700' },
  job_unsave:  { icon: Award,     color: 'bg-pink-50 text-pink-700' },
  job_application: { icon: FileText, color: 'bg-rose-50 text-rose-700' },
  payment:        { icon: DollarSign, color: 'bg-amber-50 text-amber-700' },
};

const ACTIVITY_LABELS = {
  registration: 'Registration', login: 'Login', logout: 'Logout', profile_update: 'Profile Update',
  resume_upload: 'Resume Upload', job_search: 'Job Search', job_view: 'Job View',
  job_save: 'Job Save', job_unsave: 'Job Unsave', job_application: 'Job Application',
  payment: 'Payment',
};

function StatTile({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-surface-200 bg-white p-4">
      <div className="text-xs font-medium text-surface-500 uppercase tracking-wide">{label}</div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight text-surface-900">{value}</div>
    </div>
  );
}

export default function CandidateProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: d } = await api.get(`/candidates/${id}`);
        setData(d);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading && !data) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3"><Spinner size="lg" /><span className="text-sm text-surface-500">Loading profile…</span></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card p-10 text-center">
        <p className="text-surface-500">Candidate not found.</p>
        <button onClick={() => navigate('/candidates')} className="btn-secondary mt-4">Back to candidates</button>
      </div>
    );
  }

  const { candidate, activityStats, applications, activityTimeline, activityCount } = data;

  return (
    <div className="space-y-5">
      <PageHeader
      title={candidate.name}
      subtitle={candidate.email}
      breadcrumbs={[<Link key="c" to="/candidates" className="text-brand-600 hover:underline">Candidates</Link>, `Profile`]}
      actions={
        <>
          <button onClick={() => navigate('/candidates')} className="btn-secondary">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <select className="input !py-2 !max-w-[160px]">
            <option>More Actions</option>
            <option>Send email</option>
            <option>Suspend account</option>
          </select>
        </>
      }
    />

      <div className="card overflow-hidden">
        <div className="h-28 bg-gradient-to-br from-brand-500 via-violet-500 to-fuchsia-500 relative">
          <div className="absolute inset-0 opacity-40 watermark" />
        </div>
        <div className="px-5 sm:px-7 pb-6 -mt-10 relative">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex items-end gap-4">
              <Avatar name={candidate.name} src={candidate.avatar} size="2xl" className="!ring-4 !ring-white" />
              <div className="pb-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-surface-900 tracking-tight">
                  {candidate.name}
                </h2>
                {candidate.headline && <div className="text-sm text-surface-500 mt-0.5">{candidate.headline}</div>}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {candidate.status && <StatusBadge status={candidate.status} />}
                  {candidate.source && <span className="badge bg-surface-50 text-surface-600 ring-1 ring-surface-200">Source: {candidate.source}</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Email', value: candidate.email, Icon: Mail },
              { label: 'Phone', value: candidate.phone || '—', Icon: Phone },
              { label: 'Location', value: candidate.location ? `${candidate.location}${candidate.country ? `, ${candidate.country}` : ''}` : '—', Icon: MapPin },
              { label: 'Registered', value: candidate.createdAt ? format(new Date(candidate.createdAt), 'MMM d, yyyy') : '—', Icon: Calendar },
            ].map(({ label, value, Icon }) => (
              <div key={label} className="rounded-2xl border border-surface-100 bg-surface-50/60 p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-surface-500 uppercase tracking-wide"><Icon className="h-3.5 w-3.5" />{label}</div>
                <div className="mt-1.5 text-sm font-medium text-surface-800 break-words">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatTile
          label="Experience"
          value={typeof candidate.experience === 'string' && candidate.experience.length > 0
            ? (candidate.experience.length > 40 ? candidate.experience.slice(0, 40) + '…' : candidate.experience)
            : '—'}
        />
        <StatTile label="Applications" value={activityCount || applications?.length || 0 || '—'} />
        <StatTile label="Activities" value={activityCount || 0} />
        <StatTile label="Logins" value={candidate.updatedAt ? formatDistanceToNow(new Date(candidate.updatedAt), { addSuffix: true }) : '—'} />
        <StatTile label="Job Views" value={activityStats?.job_view || 0} />
        <StatTile label="Last Login" value={candidate.lastLoginAt ? formatDistanceToNow(new Date(candidate.lastLoginAt), { addSuffix: true }) : '—'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        <div className="lg:col-span-2 space-y-5">
          {candidate.bio && (
            <div className="card p-5">
              <h3 className="font-semibold text-surface-900 mb-3">About</h3>
              <p className="text-sm text-surface-700 leading-relaxed">{candidate.bio}</p>
            </div>
          )}

          {candidate.skills && (typeof candidate.skills !== 'string' ? candidate.skills.length > 0 : candidate.skills.length > 0) && (
            <div className="card p-5">
              <h3 className="font-semibold text-surface-900 mb-3">Skills</h3>
              {Array.isArray(candidate.skills) ? (
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map(s => (
                    <span key={s} className="px-3 py-1 rounded-full text-xs font-medium bg-brand-50 text-brand-700 ring-1 ring-brand-200">{s}</span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-surface-700 whitespace-pre-wrap leading-relaxed">{candidate.skills}</p>
              )}
            </div>
          )}

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-surface-900 flex items-center gap-2"><Briefcase className="h-4 w-4 text-surface-500" />Experience</h3>
            </div>
            {candidate.experienceHistory && candidate.experienceHistory.length ? (
              <ul className="space-y-4">
                {candidate.experienceHistory.map((e, i) => (
                  <li key={i} className="flex gap-3">
                  <div className="mt-1.5 h-9 w-9 rounded-lg bg-surface-100 flex items-center justify-center shrink-0">
                    <Briefcase className="h-4 w-4 text-surface-500" />
                  </div>
                  <div className="flex-1 pb-4 border-b last:border-0 border-surface-100">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-surface-900">{e.title}</div>
                        <div className="text-sm text-surface-500">{e.company}</div>
                      </div>
                      <div className="text-xs text-surface-500 whitespace-nowrap">
                        {e.startDate ? format(new Date(e.startDate), 'MMM yyyy') : ''} — {e.endDate ? format(new Date(e.endDate), 'MMM yyyy') : 'Present'}
                      </div>
                    </div>
                    {e.description && <p className="mt-2 text-sm text-surface-600">{e.description}</p>}
                  </div>
                </li>
                ))}
              </ul>
            ) : (typeof candidate.experience === 'string' && candidate.experience.length > 0) ? (
              <p className="text-sm text-surface-700 whitespace-pre-wrap leading-relaxed">{candidate.experience}</p>
            ) : <p className="text-sm text-surface-500">No experience history yet.</p>}
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-surface-900 flex items-center gap-2"><BookOpen className="h-4 w-4 text-surface-500" />Education</h3>
            </div>
            {candidate.education && Array.isArray(candidate.education) && candidate.education.length ? (
              <ul className="space-y-4">
                {candidate.education.map((e, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="mt-1.5 h-9 w-9 rounded-lg bg-surface-100 flex items-center justify-center shrink-0">
                      <BookOpen className="h-4 w-4 text-surface-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-surface-900">{e.degree} · {e.field}</div>
                          <div className="text-sm text-surface-500">{e.institution}</div>
                        </div>
                        <div className="text-xs text-surface-500 whitespace-nowrap">{e.startYear} — {e.endYear}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (typeof candidate.education === 'string' && candidate.education.length > 0) ? (
              <p className="text-sm text-surface-700 whitespace-pre-wrap leading-relaxed">{candidate.education}</p>
            ) : <p className="text-sm text-surface-500">No education details yet.</p>}
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-surface-900 flex items-center gap-2"><FileText className="h-4 w-4 text-surface-500" />Job Applications ({applications.length})</h3>
            </div>
            {applications.length ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr>
                    <th className="table-header !rounded-tl-xl">Job</th>
                    <th className="table-header">Company</th>
                    <th className="table-header">Status</th>
                    <th className="table-header !rounded-tr-xl text-right">Applied</th>
                  </tr></thead>
                  <tbody>
                    {applications.map(a => (
                      <tr key={a._id}>
                        <td className="table-cell font-medium text-surface-800">{a.job?.title || a.jobTitle || 'Unknown'}</td>
                        <td className="table-cell text-surface-600 text-sm">{a.job?.company || a.companyName || '—'}</td>
                        <td className="table-cell"><StatusBadge status={a.status} /></td>
                        <td className="table-cell text-right text-sm text-surface-500">{(a.appliedAt || a.createdAt) ? format(new Date(a.appliedAt || a.createdAt), 'MMM d, yyyy') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-surface-500">No applications yet.</p>}
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-1"><File className="h-4 w-4 text-surface-500" />
            <h3 className="font-semibold text-surface-900">Resume</h3>
            </div>
            {(candidate.resume?.fileName || candidate.resume?.url || candidate.resume_file) ? (
              <div className="mt-3 rounded-2xl border border-dashed border-surface-200 bg-surface-50 p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white border border-surface-200 flex items-center justify-center text-rose-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-surface-800 truncate">{candidate.resume?.fileName || candidate.resume_file || 'Resume document'}</div>
                  {candidate.resume?.uploadedAt && (
                    <div className="text-xs text-surface-500">Uploaded {format(new Date(candidate.resume.uploadedAt), 'MMM d, yyyy')}</div>
                  )}
                </div>
                <a className="btn-secondary !py-1.5 text-xs">View</a>
              </div>
            ) : (
              <p className="mt-3 text-sm text-surface-500">No resume uploaded.</p>
            )}
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-surface-900 mb-4 flex items-center gap-2"><ActivityIcon className="h-4 w-4 text-surface-500" />Activity Timeline</h3>
            {activityTimeline.length ? (
              <ol className="relative border-l border-surface-200 ml-2 space-y-5 max-h-[560px] overflow-y-auto scrollbar-thin pr-2">
                {activityTimeline.map((a, idx) => {
                  const meta = ACTIVITY_STYLES[a.activityType] || { icon: Clock, color: 'bg-surface-100 text-surface-700' };
                  const Icon = meta.icon;
                  return (
                    <li key={a._id || idx} className="ml-4">
                      <span className={`absolute -left-[11px] flex items-center justify-center h-5 w-5 rounded-full bg-white ring-2 ring-surface-200`}>
                        <span className={`h-4 w-4 rounded-full flex items-center justify-center ${meta.color}`}>
                          <Icon className="h-2.5 w-2.5" />
                        </span>
                      </span>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-surface-800">{ACTIVITY_LABELS[a.activityType] || a.activityType}</span>
                        </div>
                        {a.description && <p className="text-xs text-surface-500 mt-0.5">{a.description}</p>}
                        <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-surface-400">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : <p className="text-sm text-surface-500">No recorded activities.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
