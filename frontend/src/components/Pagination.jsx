import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import clsx from 'clsx';

export default function Pagination({ page, totalPages, total, limit, onChange }) {
  const pages = [];
  const maxVisible = 5;
  const start = Math.max(1, Math.min(page - Math.floor(maxVisible / 2), totalPages - maxVisible + 1));
  const end = Math.min(totalPages, start + maxVisible - 1);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4">
      <div className="text-sm text-surface-500">
        Showing <span className="font-semibold text-surface-700">{total === 0 ? 0 : (page - 1) * limit + 1}</span>
        {' '}–{' '}<span className="font-semibold text-surface-700">{Math.min(page * limit, total)}</span>
        {' '}of <span className="font-semibold text-surface-700">{total}</span> results
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(1)} disabled={page === 1} className="btn-ghost !p-2 disabled:opacity-40">
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button onClick={() => onChange(page - 1)} disabled={page === 1} className="btn-ghost !p-2 disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map(p => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={clsx('min-w-[36px] h-9 rounded-lg text-sm font-medium transition',
              p === page ? 'bg-brand-600 text-white shadow-sm' : 'text-surface-600 hover:bg-surface-100')}
          >
            {p}
          </button>
        ))}
        <button onClick={() => onChange(page + 1)} disabled={page === totalPages || totalPages === 0} className="btn-ghost !p-2 disabled:opacity-40">
          <ChevronRight className="h-4 w-4" />
        </button>
        <button onClick={() => onChange(totalPages)} disabled={page === totalPages || totalPages === 0} className="btn-ghost !p-2 disabled:opacity-40">
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
