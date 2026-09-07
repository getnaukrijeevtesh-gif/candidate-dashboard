import React from 'react';
import clsx from 'clsx';

const colors = [
  'from-brand-500 to-violet-500 text-white',
  'from-emerald-500 to-teal-500 text-white',
  'from-amber-500 to-orange-500 text-white',
  'from-rose-500 to-pink-500 text-white',
  'from-sky-500 to-cyan-500 text-white',
  'from-fuchsia-500 to-purple-500 text-white',
  'from-indigo-500 to-blue-500 text-white',
  'from-lime-500 to-green-500 text-white',
];

export default function Avatar({ name = '', src = '', size = 'md', className = '' }) {
  const sizes = {
    xs: 'h-7 w-7 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-xl',
    '2xl': 'h-20 w-20 text-2xl',
  };

  const initials = name ? name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
  const colorIdx = Math.abs(Array.from(name || 'A').reduce((a, c) => a + c.charCodeAt(0), 0)) % colors.length;

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={clsx('rounded-full object-cover ring-2 ring-white shadow-sm', sizes[size], className)}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    );
  }

  return (
    <div className={clsx('rounded-full bg-gradient-to-br flex items-center justify-center font-semibold ring-2 ring-white shadow-sm', sizes[size], colors[colorIdx], className)}>
      {initials}
    </div>
  );
}
