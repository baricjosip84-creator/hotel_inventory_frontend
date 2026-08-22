import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import { ApiError } from '../lib/api';
import { platformApiRequest, platformDownload } from '../lib/platformApi';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '../lib/platformPermissions';
import type { PlatformPermission } from '../lib/platformPermissions';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './PlatformAuditPage.css';

type PlatformAuditRow = {
  id: string;
  platform_user_id: string | null;
  platform_user_email: string | null;
  platform_user_name: string | null;
  action: string;
  source: string;
  target_type: string | null;
  target_id: string | null;
  tenant_id: string | null;
  tenant_name: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};
type AuditCountRow = { count: number };
type AuditActionCount = AuditCountRow & { action: string };
type AuditActorCount = AuditCountRow & { platform_user_id: string | null; actor: string };
type AuditTenantCount = AuditCountRow & { tenant_id: string | null; tenant_name: string };
type AuditSourceCount = AuditCountRow & { source: string };
type AuditSummary = {
  total: { total_events: number; first_event_at: string | null; last_event_at: string | null };
  top_actions: AuditActionCount[];
  top_actors: AuditActorCount[] | null;
  top_tenants: AuditTenantCount[] | null;
  sources: AuditSourceCount[];
  available_sources: string[];
  omitted_sources: string[];
  evidence_access: Record<string, boolean> & { platform_user_identity: boolean; tenant_identity: boolean };
  evidence_complete: boolean;
  required_permissions_by_source: Record<string, string[]>;
  generated_at: string;
};
type PlatformAuditResponse = {
  events: PlatformAuditRow[];
  summary: AuditSummary;
  pagination: { limit: number; offset: number; total: number; has_more: boolean };
  available_sources: string[];
  omitted_sources: string[];
  evidence_access: AuditSummary['evidence_access'];
  evidence_complete: boolean;
  required_permissions_by_source: Record<string, string[]>;
  evidence_contract: {
    audit_events_are_application_control_plane_evidence: boolean;
    event_presence_does_not_prove_external_business_or_infrastructure_outcome: boolean;
    restricted_source_events_are_not_queried_or_counted_as_zero: boolean;
    actor_and_tenant_identity_require_independent_read_permissions: boolean;
    csv_export_obeys_the_same_source_and_identity_permissions: boolean;
  };
  generated_at: string;
};

type SourceOption = { value: string; label: string; permissions: PlatformPermission[] };
const P = PLATFORM_PERMISSIONS;
const PAGE_SIZE = 50;
const EXPORT_LIMIT = 10000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SOURCE_OPTIONS: SourceOption[] = [
  { value: 'audit', label: 'Audit native', permissions: [P.AUDIT_READ] },
  { value: 'tenants', label: 'Tenants', permissions: [P.TENANTS_READ] },
  { value: 'tenant_exports', label: 'Tenant exports', permissions: [P.TENANTS_READ, P.TENANTS_EXPORT] },
  { value: 'platform_users', label: 'Platform users', permissions: [P.PLATFORM_USERS_READ] },
  { value: 'platform_sessions', label: 'Platform sessions', permissions: [P.PLATFORM_SESSIONS_READ] },
  { value: 'support_sessions', label: 'Support sessions', permissions: [P.SUPPORT_SESSION_READ] },
  { value: 'notifications', label: 'Notifications', permissions: [P.PLATFORM_NOTIFICATIONS_READ] },
  { value: 'billing', label: 'Billing', permissions: [P.PLATFORM_BILLING_READ] },
  { value: 'security', label: 'Security', permissions: [P.PLATFORM_SECURITY_READ] },
  { value: 'maintenance', label: 'Maintenance', permissions: [P.PLATFORM_MAINTENANCE_READ] },
  { value: 'announcements', label: 'Announcements', permissions: [P.PLATFORM_ANNOUNCEMENTS_READ] },
  { value: 'incidents', label: 'Incidents', permissions: [P.PLATFORM_INCIDENTS_READ] },
  { value: 'data_retention', label: 'Data retention', permissions: [P.PLATFORM_DATA_RETENTION_READ] },
  { value: 'sla', label: 'Tenant SLA', permissions: [P.PLATFORM_SLA_READ] },
  { value: 'runbooks', label: 'Runbooks', permissions: [P.PLATFORM_RUNBOOKS_READ] },
  { value: 'changes', label: 'Change management', permissions: [P.PLATFORM_CHANGES_READ] },
  { value: 'api_keys', label: 'API keys', permissions: [P.PLATFORM_API_KEYS_READ] },
  { value: 'webhooks', label: 'Webhooks', permissions: [P.PLATFORM_WEBHOOKS_READ] },
  { value: 'access_reviews', label: 'Access reviews', permissions: [P.PLATFORM_ACCESS_REVIEWS_READ] },
  { value: 'compliance', label: 'Compliance', permissions: [P.PLATFORM_COMPLIANCE_READ] },
  { value: 'privacy', label: 'Privacy requests', permissions: [P.PLATFORM_PRIVACY_READ] },
  { value: 'vendors', label: 'Vendors', permissions: [P.PLATFORM_VENDORS_READ] },
  { value: 'dependencies', label: 'Service dependencies', permissions: [P.PLATFORM_DEPENDENCIES_READ] },
  { value: 'releases', label: 'Releases', permissions: [P.PLATFORM_RELEASES_READ] },
  { value: 'risks', label: 'Risk register', permissions: [P.PLATFORM_RISKS_READ] },
  { value: 'capacity', label: 'Capacity planning', permissions: [P.PLATFORM_CAPACITY_READ] },
  { value: 'jobs', label: 'Operational jobs', permissions: [P.PLATFORM_JOBS_READ] },
  { value: 'role_permissions', label: 'Role permissions', permissions: [P.PLATFORM_ROLE_PERMISSIONS_READ] },
  { value: 'provisioning_presets', label: 'Provisioning presets', permissions: [P.PLATFORM_PROVISIONING_PRESETS_READ] },
  { value: 'provisioning', label: 'Provisioning', permissions: [P.TENANTS_READ, P.PLATFORM_PROVISIONING_PRESETS_READ] },
  { value: 'system_health', label: 'System health', permissions: [P.SYSTEM_HEALTH_READ, P.TENANTS_READ] }
];

function readableError(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'Unknown error';
}
function formatDateTime(value?: string | null): string {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString();
}
function localInputValue(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
function toIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
function metadataPreview(metadata: Record<string, unknown> | null): string {
  if (!metadata || !Object.keys(metadata).length) return 'No metadata recorded';
  try { return JSON.stringify(metadata); } catch { return '[unreadable metadata]'; }
}
function pretty(value: string): string { return value.replaceAll('_', ' '); }

export default function PlatformAuditPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const source = searchParams.get('source') || '';
  const category = searchParams.get('category') || '';
  const action = searchParams.get('action') || '';
  const targetType = searchParams.get('target_type') || searchParams.get('entity_type') || '';
  const targetId = searchParams.get('target_id') || searchParams.get('entity_id') || '';
  const tenantId = searchParams.get('tenant_id') || '';
  const platformUserId = searchParams.get('platform_user_id') || '';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const search = searchParams.get('search') || '';
  const offset = Math.max(0, Number(searchParams.get('offset') || 0) || 0);

  const [draft, setDraft] = useState({ source, action, targetType, targetId, tenantId, platformUserId, from: localInputValue(from), to: localInputValue(to), search });
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const canReadTenants = hasPlatformPermission(P.TENANTS_READ);
  const canReadUsers = hasPlatformPermission(P.PLATFORM_USERS_READ);
  const allowedSourceOptions = SOURCE_OPTIONS.filter((item) => item.permissions.every((permission) => hasPlatformPermission(permission)));

  useEffect(() => {
    setDraft({ source, action, targetType, targetId, tenantId, platformUserId, from: localInputValue(from), to: localInputValue(to), search });
  }, [source, action, targetType, targetId, tenantId, platformUserId, from, to, search]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (source) params.set('source', source);
    if (category) params.set('category', category);
    if (action) params.set('action', action);
    if (targetType) params.set('target_type', targetType);
    if (targetId) params.set('target_id', targetId);
    if (tenantId) params.set('tenant_id', tenantId);
    if (platformUserId) params.set('platform_user_id', platformUserId);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (search) params.set('search', search);
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(offset));
    return params.toString();
  }, [source, category, action, targetType, targetId, tenantId, platformUserId, from, to, search, offset]);

  const auditQuery = useQuery({
    queryKey: ['platform', 'audit', queryString],
    queryFn: () => platformApiRequest<PlatformAuditResponse>(`/platform/audit?${queryString}`),
    refetchOnWindowFocus: false,
    staleTime: 15_000,
    placeholderData: (previous) => previous
  });

  const data = auditQuery.data;
  const rows = data?.events || [];
  const summary = data?.summary;
  const pagination = data?.pagination;
  const initialLoadError = auditQuery.isError && !data;
  const refreshError = auditQuery.isError && Boolean(data);
  const targetIdInvalid = Boolean(draft.targetId) && !UUID_PATTERN.test(draft.targetId);
  const tenantIdInvalid = Boolean(draft.tenantId) && !UUID_PATTERN.test(draft.tenantId);
  const userIdInvalid = Boolean(draft.platformUserId) && !UUID_PATTERN.test(draft.platformUserId);
  const fromIso = toIso(draft.from);
  const toIsoValue = toIso(draft.to);
  const dateInvalid = (Boolean(draft.from) && !fromIso) || (Boolean(draft.to) && !toIsoValue) || Boolean(fromIso && toIsoValue && new Date(fromIso).getTime() > new Date(toIsoValue).getTime());
  const identityFilterForbidden = (!canReadTenants && Boolean(draft.tenantId)) || (!canReadUsers && Boolean(draft.platformUserId));
  const filtersInvalid = targetIdInvalid || tenantIdInvalid || userIdInvalid || dateInvalid || identityFilterForbidden;
  const exportWouldTruncate = Number(summary?.total.total_events || 0) > EXPORT_LIMIT;

  function updateParams(patch: Record<string, string | null>, resetOffset = true) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value); else next.delete(key);
    }
    next.delete('entity_type'); next.delete('entity_id');
    if (resetOffset) next.delete('offset');
    setSearchParams(next, { replace: true });
  }

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    if (filtersInvalid) return;
    updateParams({
      source: draft.source || null,
      category: null,
      action: draft.action.trim() || null,
      target_type: draft.targetType.trim() || null,
      target_id: draft.targetId.trim() || null,
      tenant_id: canReadTenants ? (draft.tenantId.trim() || null) : null,
      platform_user_id: canReadUsers ? (draft.platformUserId.trim() || null) : null,
      from: fromIso,
      to: toIsoValue,
      search: draft.search.trim() || null
    });
  }

  function clearFilters() {
    setSearchParams({}, { replace: true });
    setStatusMessage(''); setExportError('');
  }

  async function refresh() {
    setStatusMessage(''); setExportError('');
    await auditQuery.refetch();
  }

  async function exportCsv() {
    if (!data || filtersInvalid) return;
    setStatusMessage(''); setExportError('');
    const message = exportWouldTruncate
      ? `This filtered view contains ${summary?.total.total_events ?? 0} visible events. CSV export is capped at ${EXPORT_LIMIT.toLocaleString()} rows and will be explicitly partial. Continue?`
      : `Export ${summary?.total.total_events ?? 0} visible filtered audit event(s) to CSV? The export action itself will be written to Platform Audit.`;
    if (!window.confirm(message)) return;
    setExporting(true);
    try {
      const params = new URLSearchParams(queryString);
      params.delete('offset');
      params.set('limit', String(EXPORT_LIMIT));
      await platformDownload(`/platform/audit/export.csv?${params.toString()}`, 'platform-audit.csv');
      setStatusMessage(exportWouldTruncate
        ? `CSV prepared with the newest ${EXPORT_LIMIT.toLocaleString()} visible events. The filtered evidence set is larger, so this export is partial.`
        : 'Audit CSV prepared. The export action is recorded in Platform Audit.');
    } catch (error) { setExportError(readableError(error)); } finally { setExporting(false); }
  }

  const supportingLinks = [
    { label: 'Audit retention', to: '/platform/audit-retention', allowed: true },
    { label: 'Security Center', to: '/platform/security-center', allowed: hasPlatformPermission(P.PLATFORM_SECURITY_READ) },
    { label: 'Support Sessions', to: '/platform/support-sessions', allowed: hasPlatformPermission(P.SUPPORT_SESSION_READ) },
    { label: 'Tenant Exports', to: '/platform/tenant-exports', allowed: canReadTenants && hasPlatformPermission(P.TENANTS_EXPORT) },
    { label: 'Incidents', to: '/platform/incidents', allowed: hasPlatformPermission(P.PLATFORM_INCIDENTS_READ) },
    { label: 'Platform Users', to: '/platform/users', allowed: canReadUsers }
  ].filter((item) => item.allowed);

  return (
    <div className="io-operational-page io-workspace-page platform-audit">
      <OperationalWorkspaceHero
        iconPath="/platform/audit"
        eyebrow="Platform Governance"
        title="Platform Audit"
        description="Immutable control-plane application evidence, scoped to the source families and identities the current Platform permission snapshot is allowed to inspect. Audit records do not prove external business, infrastructure, delivery, or customer outcomes."
        meta={<>
          <OperationalWorkspaceMetaPill>AUDIT_READ base permission</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>{data?.evidence_complete ? 'Complete source visibility' : 'Permission-scoped evidence'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Read only</OperationalWorkspaceMetaPill>
        </>}
        aside={<div className="platform-audit__hero-aside">
          <OperationalWorkspaceStatus value={summary ? summary.total.total_events : '—'} label="visible filtered events" />
          <div className="platform-audit__refresh-block">
            <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
            <button type="button" className="app-button app-button--secondary" onClick={() => void refresh()} disabled={auditQuery.isFetching}>{auditQuery.isFetching ? 'Refreshing…' : 'Refresh'}</button>
          </div>
        </div>}
      />

      {refreshError ? <div className="platform-audit__warning">Showing the last successful snapshot. Refresh failed: {readableError(auditQuery.error)} <button type="button" onClick={() => void refresh()}>Retry</button></div> : null}
      {statusMessage ? <div className="platform-audit__success">{statusMessage}</div> : null}
      {exportError ? <div className="platform-audit__error-text">{exportError}</div> : null}
      {data && !data.evidence_complete ? <div className="platform-audit__warning"><strong>Partial evidence:</strong> restricted source families are omitted rather than counted as zero. Omitted: {data.omitted_sources.map(pretty).join(', ') || 'none'}.</div> : null}
      {category ? <div className="platform-audit__warning">Legacy category filter active: <strong>{pretty(category)}</strong>. Applying the filter form will replace it with the exact source filter where selected. <button type="button" onClick={() => updateParams({ category: null })}>Clear category</button></div> : null}
      {exportWouldTruncate ? <div className="platform-audit__warning">The filtered visible evidence set exceeds {EXPORT_LIMIT.toLocaleString()} rows. CSV export is capped and will be partial.</div> : null}

      <OperationalWorkspaceStats ariaLabel="Platform Audit evidence summary">
        <OperationalWorkspaceStatCard label="Visible events" value={summary?.total.total_events ?? '—'} helper={`First: ${formatDateTime(summary?.total.first_event_at)}`} iconPath="/platform/audit" />
        <OperationalWorkspaceStatCard label="Visible sources" value={summary?.sources.length ?? '—'} helper={`${data?.omitted_sources.length ?? 0} source families restricted`} tone={data?.evidence_complete ? 'good' : 'warn'} iconPath="/platform/audit" />
        <OperationalWorkspaceStatCard label="Top action" value={summary?.top_actions[0]?.action || '—'} helper={summary?.top_actions[0] ? `${summary.top_actions[0].count} events` : 'No visible evidence'} iconPath="/platform/audit" />
        <OperationalWorkspaceStatCard label="Actor identity" value={data?.evidence_access.platform_user_identity ? 'Available' : 'Restricted'} helper="PLATFORM_USERS_READ" tone={data?.evidence_access.platform_user_identity ? 'good' : 'neutral'} iconPath="/platform/users" />
        <OperationalWorkspaceStatCard label="Tenant identity" value={data?.evidence_access.tenant_identity ? 'Available' : 'Restricted'} helper="TENANTS_READ" tone={data?.evidence_access.tenant_identity ? 'good' : 'neutral'} iconPath="/platform/tenants" />
      </OperationalWorkspaceStats>

      <section className="io-workspace-panel platform-audit__section">
        <OperationalSectionHeader iconPath="/platform/audit" title="Evidence filters" description="Deep links use exact target filters. Restricted identity/source filters fail closed instead of returning a misleading empty result." actions={<button type="button" className="app-button app-button--secondary" onClick={clearFilters}>Clear filters</button>} />
        <form className="platform-audit__filters" onSubmit={applyFilters}>
          <label>Source<select value={draft.source} onChange={(e) => setDraft((current) => ({ ...current, source: e.target.value }))}><option value="">All authorized sources</option>{allowedSourceOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label>Action<input value={draft.action} onChange={(e) => setDraft((current) => ({ ...current, action: e.target.value }))} placeholder="platform_incident.update" /></label>
          <label>Target type<input value={draft.targetType} onChange={(e) => setDraft((current) => ({ ...current, targetType: e.target.value }))} placeholder="platform_vendor" /></label>
          <label>Target ID<input className={targetIdInvalid ? 'is-invalid' : ''} value={draft.targetId} onChange={(e) => setDraft((current) => ({ ...current, targetId: e.target.value }))} placeholder="UUID" /></label>
          {canReadTenants ? <label>Tenant ID<input className={tenantIdInvalid ? 'is-invalid' : ''} value={draft.tenantId} onChange={(e) => setDraft((current) => ({ ...current, tenantId: e.target.value }))} placeholder="UUID" /></label> : <div className="platform-audit__restricted-filter"><strong>Tenant filter restricted</strong><span>TENANTS_READ required.</span></div>}
          {canReadUsers ? <label>Platform user ID<input className={userIdInvalid ? 'is-invalid' : ''} value={draft.platformUserId} onChange={(e) => setDraft((current) => ({ ...current, platformUserId: e.target.value }))} placeholder="UUID" /></label> : <div className="platform-audit__restricted-filter"><strong>Actor filter restricted</strong><span>PLATFORM_USERS_READ required.</span></div>}
          <label>From<input type="datetime-local" value={draft.from} onChange={(e) => setDraft((current) => ({ ...current, from: e.target.value }))} /></label>
          <label>To<input type="datetime-local" value={draft.to} onChange={(e) => setDraft((current) => ({ ...current, to: e.target.value }))} /></label>
          <label className="platform-audit__search">Search<input value={draft.search} onChange={(e) => setDraft((current) => ({ ...current, search: e.target.value }))} placeholder="action, target or authorized metadata/identity" /></label>
          {filtersInvalid ? <div className="platform-audit__validation">Use valid UUIDs and an ordered date range. Identity filters also require their independent read permissions.</div> : null}
          <div className="platform-audit__filter-actions"><button type="submit" className="app-button app-button--primary" disabled={filtersInvalid}>Apply filters</button><button type="button" className="app-button app-button--secondary" disabled={!data || exporting || filtersInvalid} onClick={() => void exportCsv()}>{exporting ? 'Exporting…' : 'Export CSV'}</button></div>
        </form>
      </section>

      {initialLoadError ? <section className="io-workspace-panel platform-audit__blocking-error"><strong>Platform Audit failed to load.</strong><span>{readableError(auditQuery.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => void refresh()}>Retry</button></section> : null}
      {!data && auditQuery.isLoading ? <section className="io-workspace-panel platform-audit__loading">Loading authorized Platform audit evidence…</section> : null}

      {data ? <section className="io-workspace-panel platform-audit__section">
        <OperationalSectionHeader iconPath="/platform/audit" title="Audit evidence" description={`${pagination?.total ?? 0} visible event(s) across the current authorized/filter scope. Restricted source events are not included in this count.`} />
        {rows.length ? <div className="platform-audit__table-wrap"><table><thead><tr><th>Time</th><th>Source / action</th><th>Actor</th><th>Tenant</th><th>Target</th><th>Request evidence</th><th>Metadata</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}>
          <td>{formatDateTime(row.created_at)}</td>
          <td><strong>{pretty(row.source)}</strong><code>{row.action}</code></td>
          <td>{data.evidence_access.platform_user_identity ? <>{row.platform_user_name || row.platform_user_email || row.platform_user_id || 'System / unavailable'}{row.platform_user_name && row.platform_user_email ? <small>{row.platform_user_email}</small> : null}</> : <span className="platform-audit__restricted">Restricted</span>}</td>
          <td>{data.evidence_access.tenant_identity ? <>{row.tenant_name || row.tenant_id || 'No tenant'}{row.tenant_name && row.tenant_id ? <small>{row.tenant_id}</small> : null}</> : <span className="platform-audit__restricted">Restricted</span>}</td>
          <td>{row.target_type || 'Not recorded'}{row.target_id ? <small>{row.target_id}</small> : null}</td>
          <td>{row.ip_address || 'Not recorded'}{row.user_agent ? <small>{row.user_agent}</small> : null}</td>
          <td><code className="platform-audit__metadata">{metadataPreview(row.metadata)}</code>{row.target_id ? <Link className="platform-audit__evidence-link" to={`/platform/audit?action=${encodeURIComponent(row.action)}&target_type=${encodeURIComponent(row.target_type || '')}&target_id=${encodeURIComponent(row.target_id)}`}>Exact evidence query</Link> : null}</td>
        </tr>)}</tbody></table></div> : <div className="platform-audit__empty"><strong>No authorized audit events match these filters.</strong><span>This is not evidence that restricted source families contain zero events.</span></div>}
        <div className="platform-audit__pagination"><button type="button" className="app-button app-button--secondary" disabled={!pagination || pagination.offset <= 0} onClick={() => updateParams({ offset: String(Math.max(0, (pagination?.offset || 0) - PAGE_SIZE)) }, false)}>Previous</button><span>{pagination ? `${pagination.offset + (rows.length ? 1 : 0)}–${pagination.offset + rows.length} of ${pagination.total}` : '—'}</span><button type="button" className="app-button app-button--secondary" disabled={!pagination?.has_more} onClick={() => updateParams({ offset: String((pagination?.offset || 0) + PAGE_SIZE) }, false)}>Next</button></div>
      </section> : null}

      {summary ? <section className="io-workspace-panel platform-audit__section">
        <OperationalSectionHeader iconPath="/platform/audit" title="Visible evidence profile" description="These aggregates describe only source families available under the current permission snapshot; restricted aggregates remain Restricted rather than zero." />
        <div className="platform-audit__summary-grid">
          <SummaryList title="Sources" rows={summary.sources.map((row) => ({ label: pretty(row.source), count: row.count }))} />
          <SummaryList title="Top actions" rows={summary.top_actions.map((row) => ({ label: row.action, count: row.count }))} />
          <SummaryList title="Top actors" rows={summary.top_actors?.map((row) => ({ label: row.actor, count: row.count })) ?? null} restrictedLabel="PLATFORM_USERS_READ required" />
          <SummaryList title="Top tenants" rows={summary.top_tenants?.map((row) => ({ label: row.tenant_name, count: row.count })) ?? null} restrictedLabel="TENANTS_READ required" />
        </div>
        <div className="platform-audit__truth-note"><strong>Evidence boundary</strong><span>An audit row proves that this application recorded the event. It does not prove that an external system processed it, a customer received it, infrastructure actually changed, a deployment succeeded, or a legal/business obligation was satisfied.</span></div>
      </section> : null}

      <section className="io-workspace-panel platform-audit__section">
        <OperationalSectionHeader iconPath="/platform/audit" title="Supporting governance" description="Only destinations allowed by the current Platform permission snapshot are shown." />
        <div className="platform-audit__supporting-links">{supportingLinks.map((item) => <Link key={item.to} to={item.to}>{item.label}</Link>)}</div>
      </section>
    </div>
  );
}

function SummaryList({ title, rows, restrictedLabel }: { title: string; rows: { label: string; count: number }[] | null; restrictedLabel?: string }) {
  return <div className="platform-audit__summary-list"><h4>{title}</h4>{rows === null ? <div className="platform-audit__restricted-summary">Restricted · {restrictedLabel}</div> : rows.length ? rows.map((row) => <div key={`${title}-${row.label}`}><span>{row.label || 'Not recorded'}</span><strong>{row.count}</strong></div>) : <span className="platform-audit__quiet">No visible evidence.</span>}</div>;
}
