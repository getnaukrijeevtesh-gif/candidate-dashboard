import React from 'react';
import Spinner from './Spinner.jsx';
import clsx from 'clsx';

export default function LoadingState({
  label = 'Loading…',
  size = 'lg',
  className,
}) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-12 px-6', className)}>
      <Spinner size={size} />
      {label && <p className="mt-4 text-sm text-surface-500">{label}</p>}
    </div>
  );
}
