import React, { useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import CandidateTable from '../components/CandidateTable.jsx';
import DateFilterPicker from '../components/DateFilterPicker.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import api from '../services/api.js';
import { candidateApi, downloadBlob } from '../services/modules.js';
import { useDateFilter } from '../context/DateFilterContext.jsx';
import { useCandidates } from '../hooks/useApi.js';
import { FileText, Download, Loader2 } from 'lucide-react';

export default function CandidatesPage() {
  const { params } = useDateFilter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortBy, setSortBy] = useState('_id');
  const [sortOrder, setSortOrder] = useState('desc');
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const query = {
    page,
    limit: 10,
    search,
    status: statusFilter,
    location: locationFilter,
    sortBy,
    sortOrder,
    ...params,
  };

  const { data, loading, refresh } = useCandidates(query);
  const candidates = data?.candidates || [];
  const pagination = data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };
  const filters = data?.filters || { statusOptions: [], locationOptions: [] };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data: blob } = await candidateApi.exportCSV({
        status: statusFilter,
        location: locationFilter,
        search,
        ...params,
      });
      const ts = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `candidates_${ts}.csv`);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Candidates"
        subtitle={`${pagination.total.toLocaleString()} candidates · Manage, review, and engage candidates`}
        breadcrumbs={['Home', 'Candidates']}
        actions={
          <>
            <DateFilterPicker />
            <button
              onClick={() => setExportOpen(true)}
              className="btn-secondary"
              disabled={exporting}
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </>
        }
      />

      <CandidateTable
        candidates={candidates}
        loading={loading}
        pagination={pagination}
        filters={filters}
        search={search}
        setSearch={(v) => { setSearch(v); setPage(1); }}
        statusFilter={statusFilter}
        setStatusFilter={(v) => { setStatusFilter(v); setPage(1); }}
        locationFilter={locationFilter}
        setLocationFilter={(v) => { setLocationFilter(v); setPage(1); }}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        onPageChange={setPage}
        onExport={() => setExportOpen(true)}
      />

      <ConfirmDialog
        open={exportOpen}
        onClose={() => !exporting && setExportOpen(false)}
        onConfirm={handleExport}
        title="Export candidates to CSV?"
        description={`This will export all matching candidates for the current filters and date range. Sensitive fields (email, phone) will be included — ensure authorized use.`}
        confirmLabel={exporting ? 'Generating…' : 'Download CSV'}
        cancelLabel="Cancel"
        tone="warning"
        loading={exporting}
      />
    </div>
  );
}
