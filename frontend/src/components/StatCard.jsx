import React from 'react';
import clsx from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({
  title, value, change, changeLabel = 'vs previous', Icon, accent = 'brand', footer, className,
}) {
  const positive = change > 0;
  const neutral = change === 0 || change == null;
  const accents = {
    brand: 'from-brand-500/10 to-violet-500/10 text-brand-600',
    emerald: 'from-emerald-500/10 to-teal-500/10 text-emerald-600',
    amber: 'from-amber-500/10 to-orange-500/10 text-amber-600',
    rose: 'from-rose-500/10 to-pink-500/10 text-rose-600',
    sky: 'from-sky-500/10 to-cyan-500/10 text-sky-600',
    violet: 'from-violet-500/10 to-indigo-500/10 text-violet-600',
    fuchsia: 'from-fuchsia-500/10 to-pink-500/10 text-fuchsia-600',
  };

  return (
    <div className={clsx('card card-hover p-5 overflow-hidden relative', className)}>
      <div className={clsx('absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br blur-2xl opacity-70', accents[accent])} />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-surface-500">{title}</p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-surface-900">{value}</p>
          </div>
          <div className={clsx('h-11 w-11 rounded-2xl bg-gradient-to-br flex items-center justify-center', accents[accent])}>
            {Icon && <Icon className="h-5 w-5" />}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {!neutral ? (
            <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
              positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
              {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {positive ? '+' : ''}{Number(change || 0).toFixed(2)}%
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-100 text-surface-500">
              <Minus className="h-3.5 w-3.5" /> 0.00%
            </span>
          )}
          <span className="text-xs text-surface-500">{changeLabel}</span>
        </div>
        {footer && <div className="mt-3 text-xs text-surface-500">{footer}</div>}
      </div>
    </div>
  );
}
