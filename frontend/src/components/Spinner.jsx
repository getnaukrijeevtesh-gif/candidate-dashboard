import React from 'react';
import clsx from 'clsx';

export default function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' };
  return <div className={clsx('rounded-full border-2 border-brand-500 border-t-transparent animate-spin', sizes[size], className)} />;
}
