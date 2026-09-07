import React from 'react';
import clsx from 'clsx';

export function Skeleton({ className = '', style }) {
  return (
    <div
      className={clsx('animate-pulse rounded-xl bg-surface-200/60', className)}
      style={style}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2 w-full">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-36" />
        </div>
        <Skeleton className="h-11 w-11 rounded-2xl shrink-0" />
      </div>
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

export function StatGridSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}

export function ChartSkeleton({ className }) {
  return (
    <div className={clsx('card p-5', className)}>
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="table-header">
                  <Skeleton className="h-3 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c} className="table-cell">
                    <Skeleton className="h-4 w-full" style={{ maxWidth: c === 0 ? 220 : undefined }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Skeleton;
