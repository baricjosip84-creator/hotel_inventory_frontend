import { Fragment, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiDownloadFile, apiRequest } from '../lib/api';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './TenantAuditPage.css';

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

type TenantAuditSummary = {
  total_events: number;
  tenant_events: number;
  support_events: number;
  unique_actors: number;
  first_event_at: string | null;
  last_event_at: string | null;
};

type AuditFilters = {
  limit: '25' | '50' | '100';
  search: string;
  from: string;
  to: string;
  action: string;
  entityType: string;
  supportOnly: boolean;
};

const DEFAULT_FILTERS: AuditFilters = {
  limit: '50',
  search: '',
  from: '',
  to: '',
  action: '',
  entityType: '',
  supportOnly: false
};

const GENERIC_ACTIONS = new Set(['create', 'update', 'delete', 'replace', 'write']);
const TECHNICAL_METADATA_KEYS = new Set([
  'actor_type',
  'method',
  'path',
  'status_code',
  'request_id',
  'ip',
  'user_agent',
  'support_session_id',
  'platform_user_id',
  'support_expires_at',
  'support_tenant_name'
]);

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
      if (['ID', 'API', 'PO', 'IP', 'SLA', 'AI'].includes(upper)) return upper;
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
  if (row.action && !GENERIC_ACTIONS.has(row.action)) return formatLabel(row.action);

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
  source: string | null;
} {
  return {
    method: metadataValue(row.metadata, 'method'),
    path: metadataValue(row.metadata, 'path'),
    status: metadataValue(row.metadata, 'status_code'),
    supportReason: metadataValue(row.metadata, 'support_reason'),
    requestId: metadataValue(row.metadata, 'request_id'),
    source: metadataValue(row.metadata, 'source')
  };
}

function statusTone(status: string | null): string {
  const code = Number(status);
  if (!Number.isFinite(code)) return 'neutral';
  if (code >= 500) return 'bad';
  if (code >= 400) return 'warn';
  if (code >= 200 && code < 400) return 'good';
  return 'neutral';
}

function metadataDisplayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function visibleEvidenceEntries(metadata: Record<string, unknown> | null): Array<[string, unknown]> {
  return Object.entries(metadata || {}).filter(([key, value]) => !TECHNICAL_METADATA_KEYS.has(key) && value !== null && value !== undefined && value !== '');
}

function buildAppliedFilterParams(filters: AuditFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.action.trim()) params.set('action', filters.action.trim());
  if (filters.entityType.trim()) params.set('entity_type', filters.entityType.trim());
  if (filters.supportOnly) params.set('support_only', 'true');
  return params;
}

async function fetchAuditPage(queryString: string): Promise<TenantAuditPageResponse> {
  return apiRequest<TenantAuditPageResponse>(`/audit?${queryString}`);
}

async function fetchAuditSummary(queryString: string): Promise<TenantAuditSummary> {
  return apiRequest<TenantAuditSummary>(`/audit/summary?${queryString}`);
}

async function fetchAuditDetail(id: string): Promise<TenantAuditRow> {
  return apiRequest<TenantAuditRow>(`/audit/${id}`);
}

export default function TenantAuditPage() {
  const [draftFilters, setDraftFilters] = useState<AuditFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<AuditFilters>(DEFAULT_FILTERS);
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const filterParams = useMemo(() => buildAppliedFilterParams(appliedFilters), [appliedFilters]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams(filterParams);
    const limit = Number(appliedFilters.limit);
    params.set('limit', String(limit));
    params.set('offset', String(pageIndex * limit));
    params.set('response_mode', 'page');
    params.set('metadata_mode', 'summary');
    return params.toString();
  }, [appliedFilters.limit, filterParams, pageIndex]);

  const summaryQueryString = useMemo(() => filterParams.toString(), [filterParams]);

  const auditQuery = useQuery({
    queryKey: ['tenant', 'audit', queryString],
    queryFn: () => fetchAuditPage(queryString),
    staleTime: 15_000,
    refetchOnWindowFocus: false
  });

  const summaryQuery = useQuery({
    queryKey: ['tenant', 'audit', 'summary', summaryQueryString],
    queryFn: () => fetchAuditSummary(summaryQueryString),
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
  const summary = summaryQuery.data;
  const lastRefreshedText = auditQuery.dataUpdatedAt
    ? `Last refreshed ${formatDateTime(new Date(auditQuery.dataUpdatedAt).toISOString())}`
    : 'Not refreshed yet';

  const filtersChanged = JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters);
  const anyFilterApplied = Boolean(
    appliedFilters.search.trim() ||
    appliedFilters.from ||
    appliedFilters.to ||
    appliedFilters.action.trim() ||
    appliedFilters.entityType.trim() ||
    appliedFilters.supportOnly ||
    appliedFilters.limit !== DEFAULT_FILTERS.limit
  );

  const draftDateRangeInvalid = Boolean(draftFilters.from && draftFilters.to && draftFilters.from > draftFilters.to);

  const applyFilters = () => {
    if (draftDateRangeInvalid) {
      setFilterError('From date must be before or equal to To date.');
      return;
    }

    setAppliedFilters({
      ...draftFilters,
      search: draftFilters.search.trim(),
      action: draftFilters.action.trim(),
      entityType: draftFilters.entityType.trim()
    });
    setPageIndex(0);
    setSelectedAuditId(null);
    setFilterError(null);
    setRefreshMessage(null);
    setRefreshError(null);
  };

  const resetFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setPageIndex(0);
    setSelectedAuditId(null);
    setFilterError(null);
    setRefreshMessage(null);
    setRefreshError(null);
  };

  const handleRefreshAudit = async () => {
    setRefreshMessage(null);
    setRefreshError(null);

    const [listResult, summaryResult] = await Promise.all([auditQuery.refetch(), summaryQuery.refetch()]);
    const error = listResult.error || summaryResult.error;
    if (error) {
      setRefreshError(readableError(error));
      return;
    }

    setRefreshMessage('Tenant audit refreshed.');
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    setRefreshError(null);
    setRefreshMessage(null);

    try {
      const params = new URLSearchParams(filterParams);
      await apiDownloadFile(`/audit/export.csv?${params.toString()}`, `tenant-audit-${new Date().toISOString().slice(0, 10)}.csv`);
      setRefreshMessage('Audit CSV export downloaded.');
      await Promise.all([auditQuery.refetch(), summaryQuery.refetch()]);
    } catch (error) {
      setRefreshError(readableError(error));
    } finally {
      setExporting(false);
    }
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
    <div className="tenant-audit-page io-operational-page io-workspace-page" id="tenant-audit-workspace-top">
      <OperationalWorkspaceHero
        iconPath="/audit"
        eyebrow="Accountability & evidence"
        title="Tenant audit trail"
        description="Review tenant-scoped business changes and attributed support-session activity. Audit evidence is read-only and remains isolated to the current tenant."
        meta={
          <>
            <OperationalWorkspaceMetaPill>Tenant-scoped</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Read-only evidence</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Support activity attributed</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>CSV export</OperationalWorkspaceMetaPill>
          </>
        }
        aside={<OperationalWorkspaceStatus value={summary?.total_events ?? '—'} label="events matching applied filters" />}
      />

      <OperationalWorkspaceStats ariaLabel="Tenant audit overview">
        <OperationalWorkspaceStatCard label="Matching events" value={summary?.total_events ?? '—'} helper="Across the applied audit filters" tone="blue" iconPath="/audit" loading={summaryQuery.isLoading} />
        <OperationalWorkspaceStatCard label="Tenant actions" value={summary?.tenant_events ?? '—'} helper="Actions attributed to tenant users or tenant services" tone="neutral" iconPath="/users" loading={summaryQuery.isLoading} />
        <OperationalWorkspaceStatCard label="Support actions" value={summary?.support_events ?? '—'} helper="Audited platform support-session activity" tone={summary?.support_events ? 'warn' : 'good'} iconPath="/sessions" loading={summaryQuery.isLoading} />
        <OperationalWorkspaceStatCard label="Unique actors" value={summary?.unique_actors ?? '—'} helper="Distinct tenant or support actors in scope" tone="good" iconPath="/users" loading={summaryQuery.isLoading} />
      </OperationalWorkspaceStats>

      {summaryQuery.error ? <div className="app-error-state tenant-audit-message">Audit summary could not be loaded: {readableError(summaryQuery.error)}</div> : null}
      {filterError ? <div className="app-error-state tenant-audit-message" role="alert">{filterError}</div> : null}
      {refreshError ? <div className="app-error-state tenant-audit-message" role="alert">{refreshError}</div> : null}
      {refreshMessage ? <div className="app-success-state tenant-audit-message" role="status">{refreshMessage}</div> : null}

      <section className="app-panel tenant-audit-panel">
        <OperationalSectionHeader
          iconPath="/audit"
          title="Audit filters"
          description="Narrow the audit trail by date, actor or evidence. Filters are applied only when you choose Apply filters."
          actions={
            <>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={resetFilters}
                disabled={!anyFilterApplied && !filtersChanged}
              >
                Reset
              </button>
              <button
                type="button"
                className="app-button app-button--primary"
                onClick={applyFilters}
                disabled={!filtersChanged || auditQuery.isFetching || draftDateRangeInvalid}
              >
                Apply filters
              </button>
            </>
          }
        />

        <div className="tenant-audit-filter-grid">
          <label className="tenant-audit-field tenant-audit-field--search">
            <span>Search audit history</span>
            <input
              value={draftFilters.search}
              onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Actor, action, entity, request ID, or support reason"
            />
          </label>
          <label className="tenant-audit-field">
            <span>From</span>
            <input
              type="date"
              value={draftFilters.from}
              onChange={(event) => setDraftFilters((current) => ({ ...current, from: event.target.value }))}
              aria-invalid={draftDateRangeInvalid}
              aria-describedby={draftDateRangeInvalid ? 'tenant-audit-date-range-error' : undefined}
            />
          </label>
          <label className="tenant-audit-field">
            <span>To</span>
            <input
              type="date"
              value={draftFilters.to}
              onChange={(event) => setDraftFilters((current) => ({ ...current, to: event.target.value }))}
              aria-invalid={draftDateRangeInvalid}
              aria-describedby={draftDateRangeInvalid ? 'tenant-audit-date-range-error' : undefined}
            />
            {draftDateRangeInvalid ? (
              <span id="tenant-audit-date-range-error" className="tenant-audit-field-error" role="alert">
                From date must be before or equal to To date.
              </span>
            ) : null}
          </label>
          <label className="tenant-audit-field">
            <span>Events per page</span>
            <select
              value={draftFilters.limit}
              onChange={(event) => setDraftFilters((current) => ({ ...current, limit: event.target.value as AuditFilters['limit'] }))}
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </label>
          <label className="tenant-audit-field">
            <span>Action code</span>
            <input
              value={draftFilters.action}
              onChange={(event) => setDraftFilters((current) => ({ ...current, action: event.target.value }))}
              placeholder="Example: shipment.receive"
            />
          </label>
          <label className="tenant-audit-field">
            <span>Entity type</span>
            <input
              value={draftFilters.entityType}
              onChange={(event) => setDraftFilters((current) => ({ ...current, entityType: event.target.value }))}
              placeholder="Example: shipments"
            />
          </label>
          <label className="tenant-audit-checkbox">
            <input
              type="checkbox"
              checked={draftFilters.supportOnly}
              onChange={(event) => setDraftFilters((current) => ({ ...current, supportOnly: event.target.checked }))}
            />
            <span>Support-session actions only</span>
          </label>
          <div className="tenant-audit-filter-note">CSV export uses the currently applied filters, not unfinished filter edits.</div>
        </div>
      </section>

      {auditQuery.isLoading ? <div className="app-empty-state">Loading tenant audit…</div> : null}
      {auditQuery.error ? <div className="app-error-state">Failed to load tenant audit: {readableError(auditQuery.error)}</div> : null}

      <section className="app-panel tenant-audit-panel tenant-audit-events-panel">
        <OperationalSectionHeader
          iconPath="/audit"
          title="Audit event log"
          description={`${lastRefreshedText} · Page ${pageIndex + 1} · ${rows.length} event${rows.length === 1 ? '' : 's'} loaded${auditQuery.isFetching && !auditQuery.isLoading ? ' · Updating…' : ''}`}
          actions={
            <>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={() => setShowTechnicalDetails((current) => !current)}
                aria-pressed={showTechnicalDetails}
              >
                {showTechnicalDetails ? 'Hide technical details' : 'Show technical details'}
              </button>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={handleExport}
                disabled={exporting || auditQuery.isFetching}
              >
                {exporting ? 'Exporting…' : 'Export CSV'}
              </button>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={handleRefreshAudit}
                disabled={auditQuery.isFetching}
              >
                {auditQuery.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </>
          }
        />

        {rows.length ? (
          <div className="tenant-audit-table-wrap">
            <table className="tenant-audit-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Operation</th>
                  <th>Actor</th>
                  <th>Entity</th>
                  <th>Source</th>
                  <th>Evidence</th>
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
                        <td className="tenant-audit-time">{formatDateTime(row.created_at)}</td>
                        <td>
                          <div className="tenant-audit-primary">{operationLabel(row)}</div>
                          {showTechnicalDetails ? <div className="tenant-audit-code">{row.action}</div> : null}
                        </td>
                        <td>
                          <span className={`tenant-audit-badge ${actor.support ? 'tenant-audit-badge--support' : 'tenant-audit-badge--tenant'}`}>
                            {actor.support ? 'SUPPORT' : 'TENANT'}
                          </span>
                          <div className="tenant-audit-primary tenant-audit-actor">{actor.primary}</div>
                          {actor.secondary ? <div className="tenant-audit-muted">{actor.secondary}</div> : null}
                          {showTechnicalDetails && row.user_id ? <div className="tenant-audit-code">User {shortId(row.user_id)}</div> : null}
                        </td>
                        <td>
                          <div className="tenant-audit-primary">{formatLabel(row.entity_type)}</div>
                          {showTechnicalDetails && row.entity_id ? <div className="tenant-audit-code">{row.entity_id}</div> : null}
                        </td>
                        <td className="tenant-audit-source-cell">
                          <div className="tenant-audit-request-topline">
                            {request.method ? <span className="tenant-audit-method">{request.method}</span> : null}
                            {request.status ? <span className={`tenant-audit-status tenant-audit-status--${statusTone(request.status)}`}>{request.status}</span> : null}
                            {!request.method && request.source ? <span className="tenant-audit-source-label">{formatLabel(request.source)}</span> : null}
                            {!request.method && !request.source && actor.support ? <span className="tenant-audit-source-label">Support event</span> : null}
                            {!request.method && !request.source && !actor.support ? <span className="tenant-audit-source-label">System event</span> : null}
                          </div>
                          {request.supportReason ? <div className="tenant-audit-support-reason">Reason: {request.supportReason}</div> : null}
                          {showTechnicalDetails && request.path ? <div className="tenant-audit-path">{request.path}</div> : null}
                          {showTechnicalDetails && request.requestId ? <div className="tenant-audit-muted">Request {request.requestId}</div> : null}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="app-button app-button--secondary tenant-audit-details-button"
                            onClick={() => setSelectedAuditId(isSelected ? null : row.id)}
                            aria-expanded={isSelected}
                          >
                            {isSelected ? 'Hide details' : 'View details'}
                          </button>
                        </td>
                      </tr>
                      {isSelected ? (
                        <tr className="tenant-audit-detail-row">
                          <td colSpan={6}>
                            {detailQuery.isLoading ? <div className="app-empty-state">Loading full audit evidence…</div> : null}
                            {detailQuery.error ? <div className="app-error-state">Audit evidence could not be loaded: {readableError(detailQuery.error)}</div> : null}
                            {detailQuery.data?.id === row.id ? (
                              <div className="tenant-audit-detail-panel">
                                <div className="tenant-audit-detail-heading">
                                  <div>
                                    <strong>Recorded evidence</strong>
                                    <p>Business evidence is shown first. Technical identifiers and request metadata stay hidden unless technical details are enabled.</p>
                                  </div>
                                  <span>{formatDateTime(detailQuery.data.created_at)}</span>
                                </div>

                                {visibleEvidenceEntries(detailQuery.data.metadata).length ? (
                                  <div className="tenant-audit-evidence-grid">
                                    {visibleEvidenceEntries(detailQuery.data.metadata).map(([key, value]) => (
                                      <div key={key}>
                                        <span>{formatLabel(key)}</span>
                                        <strong>{metadataDisplayValue(value)}</strong>
                                      </div>
                                    ))}
                                  </div>
                                ) : <div className="tenant-audit-no-extra-evidence">No additional business evidence was recorded for this event.</div>}

                                {showTechnicalDetails ? (
                                  <>
                                    <div className="tenant-audit-id-grid">
                                      <div><span>Event ID</span><strong>{detailQuery.data.id}</strong></div>
                                      <div><span>User ID</span><strong>{detailQuery.data.user_id || '-'}</strong></div>
                                      <div><span>Entity ID</span><strong>{detailQuery.data.entity_id || '-'}</strong></div>
                                    </div>
                                    <div>
                                      <strong className="tenant-audit-raw-title">Raw metadata</strong>
                                      <pre className="tenant-audit-metadata-pre">{JSON.stringify(detailQuery.data.metadata || {}, null, 2)}</pre>
                                    </div>
                                  </>
                                ) : null}
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
        ) : !auditQuery.isLoading && !auditQuery.error ? <div className="app-empty-state tenant-audit-empty">No tenant audit events match the applied filters.</div> : null}

        <div className="tenant-audit-pagination">
          <div className="tenant-audit-pagination-meta">Page {pageIndex + 1}</div>
          <div className="tenant-audit-pagination-buttons">
            <button
              type="button"
              className="app-button app-button--secondary"
              onClick={goToPreviousPage}
              disabled={pageIndex === 0 || auditQuery.isFetching}
            >
              Previous
            </button>
            <button
              type="button"
              className="app-button app-button--secondary"
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
