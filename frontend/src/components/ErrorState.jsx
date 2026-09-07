import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function ErrorState({
  title = 'Something went wrong',
  description = 'We couldn\u2019t load this data right now. Please try again.',
  error,
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="h-16 w-16 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4 ring-1 ring-rose-100">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold text-surface-900 mb-1.5">{title}</h3>
      <p className="text-sm text-surface-500 max-w-md mb-1">{description}</p>
      {error && typeof error === 'string' && (
        <p className="text-xs text-rose-500 font-mono mt-1 max-w-md truncate">{error}</p>
      )}
      {onRetry && (
        <button onClick={onRetry} className="btn-primary mt-5">
          <RefreshCcw className="h-4 w-4" /> Try again
        </button>
      )}
    </div>
  );
}
