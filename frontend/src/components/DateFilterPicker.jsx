import React, { useState, useRef, useEffect } from 'react';
import { CalendarDays, ChevronDown, RotateCcw } from 'lucide-react';
import { useDateFilter } from '../context/DateFilterContext.jsx';
import clsx from 'clsx';
import { format } from 'date-fns';

export default function DateFilterPicker({ compact = false }) {
  const { range, setRange, presets, customStart, customEnd, setCustom, reset } = useDateFilter();
  const [open, setOpen] = useState(false);
  const [localStart, setLocalStart] = useState(customStart || '');
  const [localEnd, setLocalEnd] = useState(customEnd || '');
  const ref = useRef(null);

  useEffect(() => {
    setLocalStart(customStart ? format(new Date(customStart), 'yyyy-MM-dd') : '');
    setLocalEnd(customEnd ? format(new Date(customEnd), 'yyyy-MM-dd') : '');
  }, [customStart, customEnd]);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const currentLabel = presets.find(p => p.value === range)?.label || (range === 'custom' ? `${localStart} → ${localEnd}` : 'Custom');

  const applyCustom = () => {
    if (localStart && localEnd) {
      setCustom(new Date(localStart), new Date(localEnd));
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={clsx('btn-secondary justify-start min-w-[180px]', compact && '!py-1.5 !text-xs')}
      >
        <CalendarDays className="h-4 w-4" />
        <span className="truncate">{currentLabel}</span>
        <ChevronDown className={clsx('h-4 w-4 ml-auto transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl bg-white border border-surface-200 shadow-xl p-3 animate-in fade-in">
          <div className="space-y-1 mb-3">
            {presets.map(p => (
              <button
                key={p.value}
                onClick={() => { if (p.value !== 'custom') { setRange(p.value); setOpen(false); } }}
                className={clsx(
                  'w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-left transition',
                  range === p.value && p.value !== 'custom' ? 'bg-brand-50 text-brand-700 font-medium' : 'hover:bg-surface-50 text-surface-700',
                )}
              >
                <span>{p.label}</span>
                {range === p.value && p.value !== 'custom' && <span className="h-2 w-2 rounded-full bg-brand-500" />}
              </button>
            ))}
          </div>

          <div className="border-t border-surface-100 pt-3 space-y-2">
            <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider px-1">Custom Range</div>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={localStart} onChange={e => setLocalStart(e.target.value)} className="input !py-1.5 !text-xs" />
              <input type="date" value={localEnd} onChange={e => setLocalEnd(e.target.value)} className="input !py-1.5 !text-xs" />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={applyCustom} className="btn-primary flex-1 !py-1.5 !text-xs">Apply</button>
              <button onClick={() => { reset(); setOpen(false); }} className="btn-ghost !py-1.5" title="Reset">
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
