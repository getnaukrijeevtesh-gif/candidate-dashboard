import React from 'react';

export default function PageHeader({ title, subtitle, actions, breadcrumbs }) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        {breadcrumbs && (
          <div className="text-xs text-surface-500 mb-1 flex items-center gap-2">
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-surface-300">/</span>}
                <span className={i === breadcrumbs.length - 1 ? 'text-surface-700 font-medium' : ''}>{b}</span>
              </React.Fragment>
            ))}
          </div>
        )}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900">{title}</h1>
        {subtitle && <p className="text-surface-500 mt-1.5 text-sm sm:text-base">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
