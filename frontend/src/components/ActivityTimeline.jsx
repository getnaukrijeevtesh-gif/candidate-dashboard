import React from 'react';
import {
  UserCheck, Shield, BookOpen, Upload, BarChart3, Briefcase, Award, FileText, Clock, DollarSign,
} from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';

const ACTIVITY_META = {
  registration:   { Icon: UserCheck,  color: 'bg-emerald-50 text-emerald-700', label: 'Registration' },
  login:          { Icon: Shield,     color: 'bg-sky-50 text-sky-700',        label: 'Login' },
  logout:         { Icon: Shield,     color: 'bg-surface-100 text-surface-700', label: 'Logout' },
  profile_update: { Icon: BookOpen,   color: 'bg-violet-50 text-violet-700',   label: 'Profile Update' },
  resume_upload:  { Icon: Upload,     color: 'bg-amber-50 text-amber-700',    label: 'Resume Upload' },
  job_search:     { Icon: BarChart3,  color: 'bg-indigo-50 text-indigo-700',   label: 'Job Search' },
  job_view:       { Icon: Briefcase,  color: 'bg-blue-50 text-blue-700',       label: 'Job View' },
  job_save:       { Icon: Award,      color: 'bg-fuchsia-50 text-fuchsia-700', label: 'Job Save' },
  job_unsave:     { Icon: Award,      color: 'bg-pink-50 text-pink-700',       label: 'Job Unsave' },
  job_application:{ Icon: FileText,   color: 'bg-rose-50 text-rose-700',     label: 'Application' },
  payment:        { Icon: DollarSign, color: 'bg-amber-50 text-amber-700',     label: 'Payment' },
};

export default function ActivityTimeline({ activities = [], maxHeight }) {
  if (!activities.length) {
    return (
      <div className="card p-5">
        <div className="text-sm text-surface-500 text-center py-8">No recorded activities.</div>
      </div>
    );
  }
  return (
    <div className="card p-5">
      <h3 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4 text-surface-500" />Activity Timeline
      </h3>
      <ol
        className={clsx('relative border-l border-surface-200 ml-2 space-y-5 overflow-y-auto scrollbar-thin pr-2')}
        style={maxHeight ? { maxHeight } : undefined}
      >
        {activities.map((a, idx) => {
          const meta = ACTIVITY_META[a.activityType] || { Icon: Clock, color: 'bg-surface-100 text-surface-700', label: a.activityType || 'Activity' };
          const Icon = meta.Icon;
          return (
            <li key={a._id || idx} className="ml-4">
              <span className="absolute -left-[11px] flex items-center justify-center h-5 w-5 rounded-full bg-white ring-2 ring-surface-200">
                <span className={clsx('h-4 w-4 rounded-full flex items-center justify-center', meta.color)}>
                  <Icon className="h-2.5 w-2.5" />
                </span>
              </span>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-surface-800">{meta.label}</span>
                  {a.page && <span className="badge bg-surface-50 text-surface-600 ring-1 ring-surface-200 !py-0.5 text-[10px]">{a.page}</span>}
                </div>
                {a.description && <p className="text-xs text-surface-500 mt-0.5">{a.description}</p>}
                <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-surface-400">
                  <Clock className="h-3 w-3" />
                  {a.createdAt ? formatDistanceToNow(new Date(a.createdAt), { addSuffix: true }) : ''}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
