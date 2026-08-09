import { Fragment, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';

type TenantAuditRow = {
  id: string;
  tenant_id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type TenantAuditPageResponse = {
  rows: TenantAuditRow[];
  has_more: boolean;
  limit: number;
  offset: number;
};

type AuditFilters = {
  limit: '25' | '50' | '100';
  action: string;
  entityType: string;
  supportOnly: boolean;
};

const DEFAULT_FILTERS: AuditFilters = {
  limit: '50',
  action: '',
  entityType: '',
  supportOnly: false
};

const GENERIC_ACTIONS = new Set(['create', 'update', 'delete', 'replace', 'write']);

const PATH_ACTION_LABELS: Record<string, string> = {
  acknowledge: 'Acknowledged',
  activate: 'Activated',
  allocate: 'Allocated',
  approve: 'Approved',
  cancel: 'Cancelled',
  close: 'Closed',
  complete: 'Completed',
  deactivate: 'Deactivated',
  disable: 'Disabled',
  escalate: 'Escalated',
  execute: 'Executed',
  expire: 'Expired',
  finalize: 'Finalized',
  fulfill: 'Fulfilled',
  noop: 'Marked no-op',
  pause: 'Paused',
  receive: 'Received',
  release: 'Released',
  reopen: 'Reopened',
  resolve: 'Resolved',
  resume: 'Resumed',
  submit: 'Submitted',
  'create-shipment': 'Created shipment',
  'send-to-supplier': 'Sent to supplier'
};

function readableError(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'Unknown error';
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString();
}

function metadataValue(metadata: Record<string, unknown> | null, key: string): string | null {
  const value = metadata?.[key];
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function formatLabel(value: string | null | undefined): string {
  if (!value) return '-';
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((part) => {
      const upper = part.toUpperCase();
      if (['ID', 'API', 'PO', 'IP', 'SLA'].includes(upper)) return upper;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ');
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function pathOperation(row: TenantAuditRow): string | null {
  const path = metadataValue(row.metadata, 'path');
  if (!path) return null;

  const segments = path.split('?')[0].split('/').filter(Boolean);
  const normalized = segments[0] === 'api' ? segments.slice(1) : segments;
  if (normalized.length < 3) return null;

  const last = normalized[normalized.length - 1]?.toLowerCase();
  const previous = normalized[normalized.length - 2] || '';
  if (!last || isUuid(last) || !isUuid(previous)) return null;

  return PATH_ACTION_LABELS[last] || formatLabel(last);
}

function operationLabel(row: TenantAuditRow): string {
  if (row.action && !GENERIC_ACTIONS.has(row.action)) {
    return formatLabel(row.action);
  }

  const fromPath = pathOperation(row);
  if (fromPath) return fromPath;

  if (row.action === 'create') return 'Created';
  if (row.action === 'update') return 'Updated';
  if (row.action === 'delete') return 'Deleted';
  if (row.action === 'replace') return 'Replaced';
  return formatLabel(row.action);
}

function actorLabel(row: TenantAuditRow): { primary: string; secondary?: string; support: boolean } {
  const actorType = metadataValue(row.metadata, 'actor_type');

  if (actorType === 'support_session') {
    const platformName = metadataValue(row.metadata, 'platform_user_name');
    const platformEmail = metadataValue(row.metadata, 'platform_user_email');
    const supportSessionId = metadataValue(row.metadata, 'support_session_id');

    return {
      primary: platformName || platformEmail || 'Platform support',
      secondary: platformEmail && platformName ? platformEmail : supportSessionId || undefined,
      support: true
    };
  }

  return {
    primary: row.user_name || row.user_email || row.user_id || 'Tenant user',
    secondary: row.user_email && row.user_name ? row.user_email : row.user_id || undefined,
    support: false
  };
}

function shortId(value: string | null | undefined): string {
  if (!value) return '-';
  if (value.length <= 20) return value;
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function requestSummary(row: TenantAuditRow): {
  method: string | null;
  path: string | null;
  status: string | null;
  supportReason: string | null;
  requestId: string | null;
} {
  return {
    method: metadataValue(row.metadata, 'method'),
    path: metadataValue(row.metadata, 'path'),
    status: metadataValue(row.metadata, 'status_code'),
    supportReason: metadataValue(row.metadata, 'support_reason'),
    requestId: metadataValue(row.metadata, 'request_id')
  };
}

async function fetchAuditPage(queryString: string): Promise<TenantAuditPageResponse> {
  return apiRequest<TenantAuditPageResponse>(`/audit?${queryString}`);
}

async function fetchAuditDetail(id: string): Promise<TenantAuditRow> {
  return apiRequest<TenantAuditRow>(`/audit/${id}`);
}

export default function TenantAuditPage() {
  const [draftFilters, setDraftFilters] = useState<AuditFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<AuditFilters>(DEFAULT_FILTERS);
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    const limit = Number(appliedFilters.limit);
    params.set('limit', String(limit));
    params.set('offset', String(pageIndex * limit));
    params.set('response_mode', 'page');
    params.set('metadata_mode', 'summary');
    if (appliedFilters.action.trim()) params.set('action', appliedFilters.action.trim());
    if (appliedFilters.entityType.trim()) params.set('entity_type', appliedFilters.entityType.trim());
    if (appliedFilters.supportOnly) params.set('support_only', 'true');
    return params.toString();
  }, [appliedFilters, pageIndex]);

  const auditQuery = useQuery({
    queryKey: ['tenant', 'audit', queryString],
    queryFn: () => fetchAuditPage(queryString),
    staleTime: 15_000,
    refetchOnWindowFocus: false
  });

  const detailQuery = useQuery({
    queryKey: ['tenant', 'audit', 'detail', selectedAuditId],
    queryFn: () => fetchAuditDetail(selectedAuditId as string),
    enabled: Boolean(selectedAuditId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false
  });

  const rows = auditQuery.data?.rows || [];
  const hasMore = Boolean(auditQuery.data?.has_more);
  const lastRefreshedText = auditQuery.dataUpdatedAt
    ? `Last refreshed ${formatDateTime(new Date(auditQuery.dataUpdatedAt).toISOString())}`
    : 'Not refreshed yet';

  const filtersChanged = JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters);
  const anyFilterApplied = Boolean(
    appliedFilters.action.trim() ||
    appliedFilters.entityType.trim() ||
    appliedFilters.supportOnly ||
    appliedFilters.limit !== DEFAULT_FILTERS.limit
  );

  const applyFilters = () => {
    setAppliedFilters({
      ...draftFilters,
      action: draftFilters.action.trim(),
      entityType: draftFilters.entityType.trim()
    });
    setPageIndex(0);
    setSelectedAuditId(null);
    setRefreshMessage(null);
    setRefreshError(null);
  };

  const resetFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setPageIndex(0);
    setSelectedAuditId(null);
    setRefreshMessage(null);
    setRefreshError(null);
  };

  const handleRefreshAudit = async () => {
    setRefreshMessage(null);
    setRefreshError(null);

    const result = await auditQuery.refetch();

    if (result.error) {
      setRefreshError(readableError(result.error));
      return;
    }

    setRefreshMessage('Tenant audit refreshed.');
  };

  const goToPreviousPage = () => {
    setPageIndex((current) => Math.max(0, current - 1));
    setSelectedAuditId(null);
  };

  const goToNextPage = () => {
    if (!hasMore) return;
    setPageIndex((current) => current + 1);
    setSelectedAuditId(null);
  };

  return (
    <div style={styles.page}>
      <header>
        <h1 style={styles.title}>Tenant Audit</h1>
        <p style={styles.subtitle}>Tenant-scoped write history, including support-session activity performed through the platform.</p>
      </header>

      <section style={styles.panel}>
        <div style={styles.filterHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Filters</h2>
            <p style={styles.helper}>Set filters, then apply them once. Typing does not send a new server request on every keystroke.</p>
          </div>
          <div style={styles.filterActions}>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={resetFilters}
              disabled={!anyFilterApplied && !filtersChanged}
            >
              Reset
            </button>
            <button
              type="button"
              style={styles.primaryButton}
              onClick={applyFilters}
              disabled={!filtersChanged || auditQuery.isFetching}
            >
              Apply filters
            </button>
          </div>
        </div>
        <div style={styles.filters}>
          <label style={styles.label}>
            Events per page
            <select
              value={draftFilters.limit}
              onChange={(event) => setDraftFilters((current) => ({ ...current, limit: event.target.value as AuditFilters['limit'] }))}
              style={styles.input}
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </label>
          <label style={styles.label}>
            Action code
            <input
              value={draftFilters.action}
              onChange={(event) => setDraftFilters((current) => ({ ...current, action: event.target.value }))}
              placeholder="create / update / export_csv"
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            Entity type
            <input
              value={draftFilters.entityType}
              onChange={(event) => setDraftFilters((current) => ({ ...current, entityType: event.target.value }))}
              placeholder="shipments / products / tenant_user"
              style={styles.input}
            />
          </label>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={draftFilters.supportOnly}
              onChange={(event) => setDraftFilters((current) => ({ ...current, supportOnly: event.target.checked }))}
            />
            Support-session actions only
          </label>
        </div>
      </section>

      {auditQuery.isLoading ? <div className="app-empty-state">Loading tenant audit…</div> : null}
      {auditQuery.error ? <div className="app-error-state">{readableError(auditQuery.error)}</div> : null}
      {refreshError ? <div className="app-error-state">{refreshError}</div> : null}
      {refreshMessage ? <div className="app-success-state">{refreshMessage}</div> : null}

      <section style={styles.panel}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Audit Events</h2>
            <p style={styles.refreshMeta}>
              {lastRefreshedText} · Page {pageIndex + 1} · {rows.length} event{rows.length === 1 ? '' : 's'} loaded
              {auditQuery.isFetching && !auditQuery.isLoading ? ' · Updating…' : ''}
            </p>
          </div>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={handleRefreshAudit}
            disabled={auditQuery.isFetching}
            title="Reload the current audit page from the server"
          >
            {auditQuery.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {rows.length ? (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Time</th>
                  <th style={styles.th}>Operation</th>
                  <th style={styles.th}>Actor</th>
                  <th style={styles.th}>Entity</th>
                  <th style={styles.th}>Request</th>
                  <th style={styles.th}>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const actor = actorLabel(row);
                  const request = requestSummary(row);
                  const isSelected = selectedAuditId === row.id;
                  return (
                    <Fragment key={row.id}>
                      <tr>
                        <td style={styles.td}>{formatDateTime(row.created_at)}</td>
                        <td style={styles.td}>
                          <div style={styles.operationPrimary}>{operationLabel(row)}</div>
                          <div style={styles.codeText}>{row.action}</div>
                        </td>
                        <td style={styles.td}>
                          <span style={actor.support ? styles.supportBadge : styles.userBadge}>
                            {actor.support ? 'SUPPORT' : 'TENANT'}
                          </span>
                          <div style={styles.actorPrimary}>{actor.primary}</div>
                          {actor.secondary ? <div style={styles.muted}>{actor.secondary}</div> : null}
                        </td>
                        <td style={styles.td}>
                          <span style={styles.entityType}>{formatLabel(row.entity_type)}</span>
                          {row.entity_id ? <div style={styles.muted}>{shortId(row.entity_id)}</div> : null}
                        </td>
                        <td style={styles.tdRequest}>
                          <div style={styles.requestTopLine}>
                            {request.method ? <span style={styles.methodBadge}>{request.method}</span> : null}
                            {request.status ? <span style={styles.statusCode}>{request.status}</span> : null}
                          </div>
                          {request.path ? <div style={styles.pathText}>{request.path}</div> : <span style={styles.muted}>No HTTP request metadata</span>}
                          {request.supportReason ? <div style={styles.supportReason}>Reason: {request.supportReason}</div> : null}
                          {request.requestId ? <div style={styles.muted}>Request {shortId(request.requestId)}</div> : null}
                        </td>
                        <td style={styles.td}>
                          <button
                            type="button"
                            style={styles.detailsButton}
                            onClick={() => setSelectedAuditId(isSelected ? null : row.id)}
                            aria-expanded={isSelected}
                          >
                            {isSelected ? 'Hide details' : 'View details'}
                          </button>
                        </td>
                      </tr>
                      {isSelected ? (
                        <tr>
                          <td colSpan={6} style={styles.detailCell}>
                            {detailQuery.isLoading ? <div className="app-empty-state">Loading full audit evidence…</div> : null}
                            {detailQuery.error ? <div className="app-error-state">{readableError(detailQuery.error)}</div> : null}
                            {detailQuery.data?.id === row.id ? (
                              <div style={styles.detailPanel}>
                                <div style={styles.detailGrid}>
                                  <div><strong>Event ID</strong><div style={styles.detailValue}>{detailQuery.data.id}</div></div>
                                  <div><strong>User ID</strong><div style={styles.detailValue}>{detailQuery.data.user_id || '-'}</div></div>
                                  <div><strong>Entity ID</strong><div style={styles.detailValue}>{detailQuery.data.entity_id || '-'}</div></div>
                                </div>
                                <div>
                                  <strong>Full metadata</strong>
                                  <pre style={styles.metadataPre}>{JSON.stringify(detailQuery.data.metadata || {}, null, 2)}</pre>
                                </div>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : !auditQuery.isLoading && !auditQuery.error ? <div className="app-empty-state">No tenant audit events match the applied filters.</div> : null}

        <div style={styles.pagination}>
          <div style={styles.paginationMeta}>Page {pageIndex + 1}</div>
          <div style={styles.paginationButtons}>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={goToPreviousPage}
              disabled={pageIndex === 0 || auditQuery.isFetching}
            >
              Previous
            </button>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={goToNextPage}
              disabled={!hasMore || auditQuery.isFetching}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: '20px' },
  title: { margin: 0, fontSize: '30px' },
  subtitle: { margin: '8px 0 0', color: '#6b7280' },
  panel: { background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 12px 36px rgba(15,23,42,0.08)' },
  filterHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '14px', flexWrap: 'wrap' },
  filterActions: { display: 'flex', gap: '10px', alignItems: 'center' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '14px' },
  sectionTitle: { margin: '0 0 6px', fontSize: '20px' },
  helper: { margin: 0, color: '#64748b', fontSize: '13px', lineHeight: 1.5 },
  refreshMeta: { margin: 0, color: '#6b7280', fontSize: '12px' },
  filters: { display: 'grid', gridTemplateColumns: 'minmax(150px, 0.7fr) repeat(2, minmax(220px, 1.3fr)) minmax(220px, 1fr)', gap: '14px', alignItems: 'end' },
  label: { display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#374151' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', minHeight: '42px', fontSize: '13px', fontWeight: 700, color: '#374151' },
  input: { width: '100%', border: '1px solid #d1d5db', borderRadius: '10px', padding: '10px 12px', fontSize: '14px', background: '#fff', boxSizing: 'border-box' },
  primaryButton: {
    border: '1px solid #2563eb', borderRadius: '10px', background: '#2563eb', color: '#fff', padding: '10px 14px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
  },
  secondaryButton: {
    border: '1px solid #cbd5e1', borderRadius: '10px', background: '#ffffff', color: '#0f172a', padding: '10px 14px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
  },
  tableWrap: { width: '100%', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '1040px' },
  th: { textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '10px', color: '#6b7280', fontSize: '13px', whiteSpace: 'nowrap' },
  td: { borderBottom: '1px solid #f3f4f6', padding: '12px 10px', verticalAlign: 'top' },
  tdRequest: { borderBottom: '1px solid #f3f4f6', padding: '12px 10px', verticalAlign: 'top', minWidth: '300px', maxWidth: '460px' },
  muted: { color: '#6b7280', fontSize: '12px', marginTop: '4px', wordBreak: 'break-word' },
  codeText: { color: '#64748b', fontSize: '11px', marginTop: '4px', fontFamily: 'monospace', wordBreak: 'break-word' },
  operationPrimary: { fontWeight: 800, color: '#0f172a' },
  actorPrimary: { marginTop: '6px', fontWeight: 700 },
  entityType: { fontWeight: 700 },
  supportBadge: { display: 'inline-flex', borderRadius: '999px', padding: '4px 8px', background: '#fffbeb', color: '#92400e', fontSize: '11px', fontWeight: 800 },
  userBadge: { display: 'inline-flex', borderRadius: '999px', padding: '4px 8px', background: '#eff6ff', color: '#1d4ed8', fontSize: '11px', fontWeight: 800 },
  requestTopLine: { display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' },
  methodBadge: { display: 'inline-flex', borderRadius: '6px', padding: '3px 6px', background: '#f1f5f9', color: '#334155', fontSize: '11px', fontWeight: 800, fontFamily: 'monospace' },
  statusCode: { display: 'inline-flex', borderRadius: '6px', padding: '3px 6px', background: '#ecfdf5', color: '#047857', fontSize: '11px', fontWeight: 800, fontFamily: 'monospace' },
  pathText: { color: '#334155', fontFamily: 'monospace', fontSize: '11px', lineHeight: 1.45, wordBreak: 'break-all' },
  supportReason: { marginTop: '5px', color: '#92400e', fontSize: '12px' },
  detailsButton: { border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', color: '#0f172a', padding: '7px 10px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
  detailCell: { padding: 0, borderBottom: '1px solid #e2e8f0', background: '#f8fafc' },
  detailPanel: { padding: '16px', display: 'grid', gap: '14px' },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' },
  detailValue: { marginTop: '4px', fontFamily: 'monospace', fontSize: '12px', color: '#475569', wordBreak: 'break-all' },
  metadataPre: { margin: '8px 0 0', padding: '12px', borderRadius: '10px', background: '#0f172a', color: '#e2e8f0', fontSize: '12px', overflow: 'auto', maxHeight: '320px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' },
  paginationMeta: { color: '#64748b', fontSize: '13px', fontWeight: 700 },
  paginationButtons: { display: 'flex', gap: '8px' }
};
