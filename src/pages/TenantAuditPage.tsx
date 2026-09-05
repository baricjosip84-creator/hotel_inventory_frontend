import { Fragment, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppTranslation } from '../i18n/I18nContext';
import type { AppLocale } from '../i18n/config';
import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
import { ApiError, apiDownloadFile, apiRequest } from '../lib/api';
import { hasPermission, TENANT_PERMISSIONS } from '../lib/permissions';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  // OperationalWorkspaceMetaPill, // v3.49.107: tenant title info pills intentionally hidden.
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

function readableError(error: unknown, ui: (englishText: string) => string): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return ui('Unknown error');
}

function formatDateTime(value: string | null | undefined, locale: AppLocale): string {
  return formatLocalizedDateTime(value, locale);
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

function pathOperation(row: TenantAuditRow, ui: (englishText: string) => string): string | null {
  const path = metadataValue(row.metadata, 'path');
  if (!path) return null;

  const segments = path.split('?')[0].split('/').filter(Boolean);
  const normalized = segments[0] === 'api' ? segments.slice(1) : segments;
  if (normalized.length < 3) return null;

  const last = normalized[normalized.length - 1]?.toLowerCase();
  const previous = normalized[normalized.length - 2] || '';
  if (!last || isUuid(last) || !isUuid(previous)) return null;

  return PATH_ACTION_LABELS[last] ? ui(PATH_ACTION_LABELS[last]) : formatLabel(last);
}

function operationLabel(row: TenantAuditRow, ui: (englishText: string) => string): string {
  if (row.action && !GENERIC_ACTIONS.has(row.action)) return formatLabel(row.action);

  const fromPath = pathOperation(row, ui);
  if (fromPath) return fromPath;

  if (row.action === 'create') return ui('Created');
  if (row.action === 'update') return ui('Updated');
  if (row.action === 'delete') return ui('Deleted');
  if (row.action === 'replace') return ui('Replaced');
  return formatLabel(row.action);
}

function actorLabel(row: TenantAuditRow, ui: (englishText: string) => string): { primary: string; secondary?: string; support: boolean } {
  const actorType = metadataValue(row.metadata, 'actor_type');

  if (actorType === 'support_session') {
    const platformName = metadataValue(row.metadata, 'platform_user_name');
    const platformEmail = metadataValue(row.metadata, 'platform_user_email');
    const supportSessionId = metadataValue(row.metadata, 'support_session_id');

    return {
      primary: platformName || platformEmail || ui('Platform support'),
      secondary: platformEmail && platformName ? platformEmail : supportSessionId || undefined,
      support: true
    };
  }

  return {
    primary: row.user_name || row.user_email || row.user_id || ui('Tenant user'),
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
  const { locale, ui } = useAppTranslation();
  const [draftFilters, setDraftFilters] = useState<AuditFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<AuditFilters>(DEFAULT_FILTERS);
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [technicalDetailsRequested, setTechnicalDetailsRequested] = useState(false);
  const canViewTechnicalDetails = hasPermission(TENANT_PERMISSIONS.TENANT_DIAGNOSTICS_READ);
  const showTechnicalDetails = canViewTechnicalDetails && technicalDetailsRequested;
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
    ? ui('Last refreshed {date}').replace('{date}', formatDateTime(new Date(auditQuery.dataUpdatedAt).toISOString(), locale))
    : ui('Not refreshed yet');

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
      setFilterError(ui('From date must be before or equal to To date.'));
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
      setRefreshError(readableError(error, ui));
      return;
    }

    setRefreshMessage(ui('Tenant audit refreshed.'));
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    setRefreshError(null);
    setRefreshMessage(null);

    try {
      const params = new URLSearchParams(filterParams);
      await apiDownloadFile(`/audit/export.csv?${params.toString()}`, `tenant-audit-${new Date().toISOString().slice(0, 10)}.csv`);
      setRefreshMessage(ui('Audit CSV export downloaded.'));
      await Promise.all([auditQuery.refetch(), summaryQuery.refetch()]);
    } catch (error) {
      setRefreshError(readableError(error, ui));
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
        eyebrow={ui('Accountability & evidence')}
        title={ui('Tenant audit trail')}
        description={ui('Review tenant-scoped business changes and attributed support-session activity. Audit evidence is read-only and remains isolated to the current tenant.')}
        meta={
          undefined /*
            v3.49.107 — Tenant simplification. Title-area info pills intentionally hidden.
            Previous rendering preserved for easy restoration:
                      <>
                        <OperationalWorkspaceMetaPill>{ui('Tenant-scoped')}</OperationalWorkspaceMetaPill>
                        <OperationalWorkspaceMetaPill>{ui('Read-only evidence')}</OperationalWorkspaceMetaPill>
                        <OperationalWorkspaceMetaPill>{ui('Support activity attributed')}</OperationalWorkspaceMetaPill>
                        <OperationalWorkspaceMetaPill>{ui('CSV export')}</OperationalWorkspaceMetaPill>
                      </>
                    
          */
        }
        aside={<OperationalWorkspaceStatus value={summary ? formatLocalizedNumber(summary.total_events, locale) : '—'} label={ui('events matching applied filters')} />}
      />

      <OperationalWorkspaceStats ariaLabel={ui('Tenant audit overview')}>
        <OperationalWorkspaceStatCard label={ui('Matching events')} value={summary ? formatLocalizedNumber(summary.total_events, locale) : '—'} helper={ui('Across the applied audit filters')} tone="blue" iconPath="/audit" loading={summaryQuery.isLoading} />
        <OperationalWorkspaceStatCard label={ui('Tenant actions')} value={summary ? formatLocalizedNumber(summary.tenant_events, locale) : '—'} helper={ui('Actions attributed to tenant users or tenant services')} tone="neutral" iconPath="/users" loading={summaryQuery.isLoading} />
        <OperationalWorkspaceStatCard label={ui('Support actions')} value={summary ? formatLocalizedNumber(summary.support_events, locale) : '—'} helper={ui('Audited platform support-session activity')} tone={summary?.support_events ? 'warn' : 'good'} iconPath="/sessions" loading={summaryQuery.isLoading} />
        <OperationalWorkspaceStatCard label={ui('Unique actors')} value={summary ? formatLocalizedNumber(summary.unique_actors, locale) : '—'} helper={ui('Distinct tenant or support actors in scope')} tone="good" iconPath="/users" loading={summaryQuery.isLoading} />
      </OperationalWorkspaceStats>

      {summaryQuery.error ? <div className="app-error-state tenant-audit-message">{ui('Audit summary could not be loaded: {error}').replace('{error}', readableError(summaryQuery.error, ui))}</div> : null}
      {filterError ? <div className="app-error-state tenant-audit-message" role="alert">{filterError}</div> : null}
      {refreshError ? <div className="app-error-state tenant-audit-message" role="alert">{refreshError}</div> : null}
      {refreshMessage ? <div className="app-success-state tenant-audit-message" role="status">{refreshMessage}</div> : null}

      <section className="app-panel tenant-audit-panel">
        <OperationalSectionHeader
          iconPath="/audit"
          title={ui('Audit filters')}
          description={ui('Narrow the audit trail by date, actor or evidence. Filters are applied only when you choose Apply filters.')}
          actions={
            <>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={resetFilters}
                disabled={!anyFilterApplied && !filtersChanged}
              >
                {ui('Reset')}
              </button>
              <button
                type="button"
                className="app-button app-button--primary"
                onClick={applyFilters}
                disabled={!filtersChanged || auditQuery.isFetching || draftDateRangeInvalid}
              >
                {ui('Apply filters')}
              </button>
            </>
          }
        />

        <div className="tenant-audit-filter-grid">
          <label className="tenant-audit-field tenant-audit-field--search">
            <span>{ui('Search audit history')}</span>
            <input
              value={draftFilters.search}
              onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder={ui('Actor, action, entity, request ID, or support reason')}
            />
          </label>
          <label className="tenant-audit-field">
            <span>{ui('From')}</span>
            <input
              type="date"
              value={draftFilters.from}
              onChange={(event) => setDraftFilters((current) => ({ ...current, from: event.target.value }))}
              aria-invalid={draftDateRangeInvalid}
              aria-describedby={draftDateRangeInvalid ? 'tenant-audit-date-range-error' : undefined}
            />
          </label>
          <label className="tenant-audit-field">
            <span>{ui('To')}</span>
            <input
              type="date"
              value={draftFilters.to}
              onChange={(event) => setDraftFilters((current) => ({ ...current, to: event.target.value }))}
              aria-invalid={draftDateRangeInvalid}
              aria-describedby={draftDateRangeInvalid ? 'tenant-audit-date-range-error' : undefined}
            />
            {draftDateRangeInvalid ? (
              <span id="tenant-audit-date-range-error" className="tenant-audit-field-error" role="alert">
                {ui('From date must be before or equal to To date.')}
              </span>
            ) : null}
          </label>
          <label className="tenant-audit-field">
            <span>{ui('Events per page')}</span>
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
            <span>{ui('Action code')}</span>
            <input
              value={draftFilters.action}
              onChange={(event) => setDraftFilters((current) => ({ ...current, action: event.target.value }))}
              placeholder={ui('Example: shipment.receive')}
            />
          </label>
          <label className="tenant-audit-field">
            <span>{ui('Entity type')}</span>
            <input
              value={draftFilters.entityType}
              onChange={(event) => setDraftFilters((current) => ({ ...current, entityType: event.target.value }))}
              placeholder={ui('Example: shipments')}
            />
          </label>
          <label className="tenant-audit-checkbox">
            <input
              type="checkbox"
              checked={draftFilters.supportOnly}
              onChange={(event) => setDraftFilters((current) => ({ ...current, supportOnly: event.target.checked }))}
            />
            <span>{ui('Support-session actions only')}</span>
          </label>
          <div className="tenant-audit-filter-note">{ui('CSV export uses the currently applied filters, not unfinished filter edits.')}</div>
        </div>
      </section>

      {auditQuery.isLoading ? <div className="app-empty-state">{ui('Loading tenant audit…')}</div> : null}
      {auditQuery.error ? <div className="app-error-state">{ui('Failed to load tenant audit: {error}').replace('{error}', readableError(auditQuery.error, ui))}</div> : null}

      <section className="app-panel tenant-audit-panel tenant-audit-events-panel">
        <OperationalSectionHeader
          iconPath="/audit"
          title={ui('Audit event log')}
          description={`${lastRefreshedText} · ${ui('Page {page}').replace('{page}', formatLocalizedNumber(pageIndex + 1, locale))} · ${(rows.length === 1 ? ui('{count} event loaded') : ui('{count} events loaded')).replace('{count}', formatLocalizedNumber(rows.length, locale))}${auditQuery.isFetching && !auditQuery.isLoading ? ` · ${ui('Updating…')}` : ''}`}
          actions={
            <>
              {canViewTechnicalDetails ? (
                <button
                  type="button"
                  className="app-button app-button--secondary"
                  onClick={() => setTechnicalDetailsRequested((current) => !current)}
                  aria-pressed={showTechnicalDetails}
                >
                  {showTechnicalDetails ? ui('Hide technical details') : ui('Show technical details')}
                </button>
              ) : null}
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={handleExport}
                disabled={exporting || auditQuery.isFetching}
              >
                {exporting ? ui('Exporting…') : ui('Export CSV')}
              </button>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={handleRefreshAudit}
                disabled={auditQuery.isFetching}
              >
                {auditQuery.isFetching ? ui('Refreshing…') : ui('Refresh')}
              </button>
            </>
          }
        />

        {rows.length ? (
          <div className="tenant-audit-table-wrap">
            <table className="tenant-audit-table">
              <thead>
                <tr>
                  <th>{ui('Time')}</th>
                  <th>{ui('Operation')}</th>
                  <th>{ui('Actor')}</th>
                  <th>{ui('Entity')}</th>
                  <th>{ui('Source')}</th>
                  <th>{ui('Evidence')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const actor = actorLabel(row, ui);
                  const request = requestSummary(row);
                  const isSelected = selectedAuditId === row.id;
                  return (
                    <Fragment key={row.id}>
                      <tr>
                        <td className="tenant-audit-time">{formatDateTime(row.created_at, locale)}</td>
                        <td>
                          <div className="tenant-audit-primary">{operationLabel(row, ui)}</div>
                          {showTechnicalDetails ? <div className="tenant-audit-code">{row.action}</div> : null}
                        </td>
                        <td>
                          <span className={`tenant-audit-badge ${actor.support ? 'tenant-audit-badge--support' : 'tenant-audit-badge--tenant'}`}>
                            {actor.support ? ui('SUPPORT') : ui('TENANT')}
                          </span>
                          <div className="tenant-audit-primary tenant-audit-actor">{actor.primary}</div>
                          {actor.secondary ? <div className="tenant-audit-muted">{actor.secondary}</div> : null}
                          {showTechnicalDetails && row.user_id ? <div className="tenant-audit-code">{ui('User {id}').replace('{id}', shortId(row.user_id))}</div> : null}
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
                            {!request.method && !request.source && actor.support ? <span className="tenant-audit-source-label">{ui('Support event')}</span> : null}
                            {!request.method && !request.source && !actor.support ? <span className="tenant-audit-source-label">{ui('System event')}</span> : null}
                          </div>
                          {request.supportReason ? <div className="tenant-audit-support-reason">{ui('Reason: {reason}').replace('{reason}', request.supportReason)}</div> : null}
                          {showTechnicalDetails && request.path ? <div className="tenant-audit-path">{request.path}</div> : null}
                          {showTechnicalDetails && request.requestId ? <div className="tenant-audit-muted">{ui('Request {id}').replace('{id}', request.requestId)}</div> : null}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="app-button app-button--secondary tenant-audit-details-button"
                            onClick={() => setSelectedAuditId(isSelected ? null : row.id)}
                            aria-expanded={isSelected}
                          >
                            {isSelected ? ui('Hide details') : ui('View details')}
                          </button>
                        </td>
                      </tr>
                      {isSelected ? (
                        <tr className="tenant-audit-detail-row">
                          <td colSpan={6}>
                            {detailQuery.isLoading ? <div className="app-empty-state">{ui('Loading full audit evidence…')}</div> : null}
                            {detailQuery.error ? <div className="app-error-state">{ui('Audit evidence could not be loaded: {error}').replace('{error}', readableError(detailQuery.error, ui))}</div> : null}
                            {detailQuery.data?.id === row.id ? (
                              <div className="tenant-audit-detail-panel">
                                <div className="tenant-audit-detail-heading">
                                  <div>
                                    <strong>{ui('Recorded evidence')}</strong>
                                    <p>{ui('Business evidence is shown first. Technical identifiers and request metadata stay hidden unless technical details are enabled.')}</p>
                                  </div>
                                  <span>{formatDateTime(detailQuery.data.created_at, locale)}</span>
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
                                ) : <div className="tenant-audit-no-extra-evidence">{ui('No additional business evidence was recorded for this event.')}</div>}

                                {showTechnicalDetails ? (
                                  <>
                                    <div className="tenant-audit-id-grid">
                                      <div><span>{ui('Event ID')}</span><strong>{detailQuery.data.id}</strong></div>
                                      <div><span>{ui('User ID')}</span><strong>{detailQuery.data.user_id || '-'}</strong></div>
                                      <div><span>{ui('Entity ID')}</span><strong>{detailQuery.data.entity_id || '-'}</strong></div>
                                    </div>
                                    <div>
                                      <strong className="tenant-audit-raw-title">{ui('Raw metadata')}</strong>
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
        ) : !auditQuery.isLoading && !auditQuery.error ? <div className="app-empty-state tenant-audit-empty">{ui('No tenant audit events match the applied filters.')}</div> : null}

        <div className="tenant-audit-pagination">
          <div className="tenant-audit-pagination-meta">{ui('Page {page}').replace('{page}', formatLocalizedNumber(pageIndex + 1, locale))}</div>
          <div className="tenant-audit-pagination-buttons">
            <button
              type="button"
              className="app-button app-button--secondary"
              onClick={goToPreviousPage}
              disabled={pageIndex === 0 || auditQuery.isFetching}
            >
              {ui('Previous')}
            </button>
            <button
              type="button"
              className="app-button app-button--secondary"
              onClick={goToNextPage}
              disabled={!hasMore || auditQuery.isFetching}
            >
              {ui('Next')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
