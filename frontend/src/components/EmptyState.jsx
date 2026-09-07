import React from 'react';
import { FileX, SearchX, Users, Inbox } from 'lucide-react';
import clsx from 'clsx';

const ICONS = {
  data: Inbox,
  search: SearchX,
  users: Users,
  generic: FileX,
};

export default function EmptyState({
  title = 'No data to display',
  description = 'Try adjusting your filters or check back later for updates.',
  icon = 'generic',
  action,
  className,
}) {
  const Icon = ICONS[icon] || ICONS.generic;
  return (
    <div className={clsx('flex flex-col items-center justify-center text-center py-12 px-6', className)}>
      <div className="h-16 w-16 rounded-3xl bg-surface-100 text-surface-400 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold text-surface-900 mb-1.5">{title}</h3>
      <p className="text-sm text-surface-500 max-w-md">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
