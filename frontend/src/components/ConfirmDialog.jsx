import React, { useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  loading = false,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const toneClass = tone === 'danger'
    ? 'bg-rose-50 text-rose-600 ring-rose-100'
    : tone === 'warning'
      ? 'bg-amber-50 text-amber-600 ring-amber-100'
      : 'bg-brand-50 text-brand-600 ring-brand-100';

  const btnClass = tone === 'danger'
    ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500'
    : tone === 'warning'
      ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
      : 'bg-brand-600 hover:bg-brand-700 focus:ring-brand-500';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-surface-900/40 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white border border-surface-200 shadow-2xl animate-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 btn-ghost !p-1.5 z-10"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={clsx('h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center ring-1', toneClass)}>
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h3 className="font-semibold text-surface-900 text-lg">{title}</h3>
              {description && <p className="mt-1.5 text-sm text-surface-500 leading-relaxed">{description}</p>}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-surface-100 bg-surface-50/50 rounded-b-2xl">
          <button onClick={onClose} disabled={loading} className="btn-secondary">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={clsx('btn text-white shadow-sm', btnClass)}
          >
            {loading ? (
              <span className="h-4 w-4 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
