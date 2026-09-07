import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, ChevronUp, ChevronDown, Filter, X, SlidersHorizontal,
  Mail, Phone, MapPin, Calendar, Eye,
} from 'lucide-react';
import Avatar from './Avatar.jsx';
import StatusBadge from './StatusBadge.jsx';
import Pagination from './Pagination.jsx';
import EmptyState from './EmptyState.jsx';
import LoadingState from './LoadingState.jsx';
import clsx from 'clsx';
import { format } from 'date-fns';

const SORTABLE = ['name', 'email', 'location', '_id'];

export default function CandidateTable({
  candidates = [],
  loading = false,
  pagination = { page: 1, limit: 10, total: 0, totalPages: 0 },
  filters = { statusOptions: [], locationOptions: [] },
  search, setSearch,
  statusFilter, setStatusFilter,
  locationFilter, setLocationFilter,
  sortBy = 'createdAt', setSortBy,
  sortOrder = 'desc', setSortOrder,
  onPageChange,
  onExport,
}) {
  const navigate = useNavigate();
  const debouncedRef = React.useRef(null);
  const [localSearch, setLocalSearch] = React.useState(search || '');

  React.useEffect(() => { setLocalSearch(search || ''); }, [search]);

  React.useEffect(() => {
    if (debouncedRef.current) clearTimeout(debouncedRef.current);
    debouncedRef.current = setTimeout(() => setSearch?.(localSearch), 300);
    return () => clearTimeout(debouncedRef.current);
  }, [localSearch, setSearch]);

  const toggleSort = (key) => {
    if (!SORTABLE.includes(key)) return;
    if (sortBy === key) setSortOrder?.(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy?.(key); setSortOrder?.('desc'); }
  };

  const SortIndicator = ({ col }) => {
    if (sortBy !== col) return null;
    return sortOrder === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />;
  };

  const hasActiveFilters = search || statusFilter || locationFilter;
  const clearAll = () => { setLocalSearch(''); setSearch?.(''); setStatusFilter?.(''); setLocationFilter?.(''); onPageChange?.(1); };

  return (
    <div className="space-y-4">
      <div className="card p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 max-w-lg">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
            <input
              className="input pl-10"
              placeholder="Search name, email, phone, or location…"
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(filters.statusOptions && filters.statusOptions.length > 0) && (
              <div className="relative">
                <select
                  className="input !py-2.5 pr-9 appearance-none"
                  value={statusFilter || ''}
                  onChange={e => { setStatusFilter?.(e.target.value); onPageChange?.(1); }}
                >
                  <option value="">All statuses</option>
                  {(filters.statusOptions || []).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
                <Filter className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
              </div>
            )}
            <div className="relative">
              <select
                className="input !py-2.5 pr-9 appearance-none"
                value={locationFilter || ''}
                onChange={e => { setLocationFilter?.(e.target.value); onPageChange?.(1); }}
              >
                <option value="">All locations</option>
                {(filters.locationOptions || []).map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <MapPin className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
            </div>
            {onExport && (
              <button onClick={onExport} className="btn-secondary">
                <Eye className="h-4 w-4" /> Export CSV
              </button>
            )}
            {hasActiveFilters && (
              <button onClick={clearAll} className="btn-ghost">
                <X className="h-4 w-4" /> Clear
              </button>
            )}
          </div>
        </div>
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 font-medium text-surface-500"><SlidersHorizontal className="h-3.5 w-3.5" /> Active filters:</span>
            {search && <span className="badge bg-brand-50 text-brand-700 ring-1 ring-brand-200">Search: {search}</span>}
            {statusFilter && <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Status: {statusFilter}</span>}
            {locationFilter && <span className="badge bg-sky-50 text-sky-700 ring-1 ring-sky-200">Location: {locationFilter}</span>}
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr>
                {[
                  { key: 'name', label: 'Candidate' },
                  { key: 'email', label: 'Contact' },
                  { key: 'location', label: 'Location' },
                  { key: '_id', label: 'Registered' },
                  { key: 'none', label: 'Last Active' },
                  { key: 'none', label: 'Status' },
                  { key: 'none', label: 'Applications' },
                  { key: 'actions', label: '' },
                ].map((h) => (
                  <th key={h.key}
                    className="table-header"
                    onClick={() => h.key !== 'none' && h.key !== 'actions' && toggleSort(h.key)}
                  >
                    <span className={SORTABLE.includes(h.key) ? 'inline-flex items-center gap-1 cursor-pointer select-none hover:text-surface-700' : ''}>
                      {h.label} {SORTABLE.includes(h.key) && <SortIndicator col={h.key} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="table-cell text-center py-16"><LoadingState label="Loading candidates…" /></td></tr>
              )}
              {!loading && candidates.length === 0 && (
                <tr><td colSpan={8} className="table-cell"><EmptyState icon="users" title="No candidates found" description="Try adjusting your filters or date range." /></td></tr>
              )}
              {!loading && candidates.map((c) => (
                <tr key={c._id}
                  onClick={() => navigate(`/candidates/${c._id}`)}
                  className="cursor-pointer hover:bg-surface-50/60 transition"
                >
                  <td className="table-cell">
                    <div className="flex items-center gap-3 min-w-[220px]">
                      <Avatar name={c.name} src={c.avatar} />
                      <div className="min-w-0">
                        <div className="font-semibold text-surface-900 truncate">{c.name}</div>
                        {c.headline && <div className="text-xs text-surface-500 truncate">{c.headline}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex items-center gap-1.5 text-sm text-surface-700"><Mail className="h-3.5 w-3.5 text-surface-400" />{c.email}</span>
                      {c.phone && <span className="inline-flex items-center gap-1.5 text-xs text-surface-500"><Phone className="h-3.5 w-3.5 text-surface-400" />{c.phone}</span>}
                    </div>
                  </td>
                  <td className="table-cell">
                    {c.location ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-surface-700"><MapPin className="h-3.5 w-3.5 text-surface-400" />{c.location}</span>
                    ) : <span className="text-sm text-surface-400">—</span>}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1.5 text-sm text-surface-700">
                      <Calendar className="h-3.5 w-3.5 text-surface-400" />
                      {(c.createdAt || c.userCreatedAt) ? format(new Date(c.createdAt || c.userCreatedAt), 'MMM d, yyyy') : '—'}
                    </div>
                  </td>
                  <td className="table-cell text-sm text-surface-700">
                    {(c.lastActivityAt || c.lastLoginAt || c.updatedAt)
                      ? format(new Date(c.lastActivityAt || c.lastLoginAt || c.updatedAt), 'MMM d, HH:mm')
                      : '—'}
                  </td>
                  <td className="table-cell">
                    {c.status ? <StatusBadge status={c.status} /> : <span className="text-surface-400">—</span>}
                  </td>
                  <td className="table-cell">
                    <span className="inline-flex items-center justify-center min-w-[36px] px-2.5 py-1 rounded-lg bg-surface-100 text-surface-700 font-semibold text-sm">
                      {c.applicationCount || c.totalApplications || 0 || '—'}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/candidates/${c._id}`); }} className="btn-ghost !p-2" title="View details">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 pb-4">
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onChange={onPageChange || (() => {})}
          />
        </div>
      </div>
    </div>
  );
}
