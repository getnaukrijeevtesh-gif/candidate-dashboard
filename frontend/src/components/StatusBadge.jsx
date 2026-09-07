import React from 'react';
import clsx from 'clsx';

const STATUS_MAP = {
  active: 'badge-active',
  inactive: 'badge-inactive',
  pending: 'badge-pending',
  suspended: 'badge-suspended',
  reviewing: 'badge-reviewing',
  shortlisted: 'badge-shortlisted',
  interview: 'badge-interview',
  hired: 'badge-hired',
  rejected: 'badge-rejected',
  'pending-app': 'badge-pending-app',
  Applied: 'badge-pending-app',
  Accepted: 'badge-hired',
  'In Review': 'badge-reviewing',
  Rejected: 'badge-rejected',
};

const LABEL_MAP = {
  Applied: 'Applied',
  Accepted: 'Accepted',
  'In Review': 'In Review',
  Rejected: 'Rejected',
  'pending-app': 'Pending',
};

export function getStatusBadge(status) {
  return STATUS_MAP[status] || (status === 'pending' ? 'badge-pending-app' : 'badge-inactive');
}

export function StatusBadge({ status }) {
  if (!status) return <span className="text-surface-400">—</span>;
  const label = LABEL_MAP[status] || (typeof status === 'string'
    ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')
    : '');
  return <span className={clsx(getStatusBadge(status))}>{label}</span>;
}

export default StatusBadge;
