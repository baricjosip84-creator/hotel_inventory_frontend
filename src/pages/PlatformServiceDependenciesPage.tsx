import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';
import { scrollToFormSection } from '../lib/scrollToForm';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './PlatformServiceDependenciesPage.css';

type PlatformUser = { id: string; email: string; name?: string | null; is_active?: boolean };
type Vendor = { id: string; name: string; status?: string; archived_at?: string | null };
type VendorsResponse = { vendors: Vendor[] };
type Pagination = { limit: number; offset: number; total: number; has_more: boolean };
type EvidenceAccess = { vendor_identity: boolean; platform_user_identity: boolean };
type EvidenceContract = {
  application_registry_only: boolean;
  dependency_status_is_operator_recorded: boolean;
  last_checked_at_is_application_check_metadata: boolean;
  external_service_health_not_verified: boolean;
  vendor_relationship_not_proven: boolean;
  historical_check_timestamps_may_include_legacy_registry_edits: boolean;
};
type Dependency = {
  id: string; vendor_id?: string | null; vendor_name?: string | null; name: string; category: string; status: string; business_impact: string;
  owner_platform_user_id?: string | null; owner_email?: string | null; owner_present?: boolean; status_page_url?: string | null; escalation_url?: string | null;
  check_notes?: string | null; last_checked_at?: string | null; last_status_change_at?: string | null; archived_at?: string | null; is_archived?: boolean;
  created_at?: string | null; updated_at?: string | null; updated_by_email?: string | null;
};
type DependenciesResponse = {
  dependencies: Dependency[];
  summary: { total: number; archived: number; attention: number; major_outage: number; critical_impact: number; by_status: Record<string, number>; by_category: Record<string, number>; by_impact: Record<string, number> };
  pagination: Pagination;
  evidence_access: EvidenceAccess;
  evidence_contract: EvidenceContract;
  categories: string[]; statuses: string[]; mutable_statuses: string[]; impacts: string[];
};
type DependencyForm = {
  name: string; vendor_id: string; category: string; status: string; business_impact: string; owner_platform_user_id: string;
  status_page_url: string; escalation_url: string; check_notes: string;
};

const PAGE_SIZE = 50;
const CATEGORY_OPTIONS = ['payment', 'email', 'sms', 'storage', 'hosting', 'monitoring', 'integration', 'security', 'support', 'other'];
const STATUS_OPTIONS = ['operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance', 'unknown', 'archived'];
const MUTABLE_STATUS_OPTIONS = ['operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance', 'unknown'];
const IMPACT_OPTIONS = ['low', 'medium', 'high', 'critical'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emptyForm = (): DependencyForm => ({ name: '', vendor_id: '', category: 'other', status: 'operational', business_impact: 'medium', owner_platform_user_id: '', status_page_url: '', escalation_url: '', check_notes: '' });

function readableError(error: unknown) { return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error'; }
function clean(value: string) { const trimmed = value.trim(); return trimmed || null; }
function pretty(value?: string | null) { return value ? value.replaceAll('_', ' ') : 'Not recorded'; }
function dateTime(value?: string | null) { if (!value) return 'Not recorded'; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? 'Not recorded' : parsed.toLocaleString(); }
function validExternalUrl(value?: string | null) { if (!value) return false; try { const parsed = new URL(value); return parsed.protocol === 'https:' || parsed.protocol === 'http:'; } catch { return false; } }
function statusTone(value?: string, archived?: boolean) { if (archived || value === 'archived') return 'neutral'; if (value === 'major_outage' || value === 'partial_outage') return 'danger'; if (value === 'degraded' || value === 'unknown' || value === 'maintenance') return 'warn'; if (value === 'operational') return 'good'; return 'neutral'; }
function impactTone(value?: string) { if (value === 'critical') return 'danger'; if (value === 'high') return 'warn'; if (value === 'low') return 'good'; return 'neutral'; }
function toForm(row: Dependency): DependencyForm { return { name: row.name || '', vendor_id: row.vendor_id || '', category: row.category || 'other', status: MUTABLE_STATUS_OPTIONS.includes(row.status) ? row.status : 'unknown', business_impact: row.business_impact || 'medium', owner_platform_user_id: row.owner_platform_user_id || '', status_page_url: row.status_page_url || '', escalation_url: row.escalation_url || '', check_notes: row.check_notes || '' }; }

export default function PlatformServiceDependenciesPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_WRITE);
  const canReadVendors = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_VENDORS_READ);
  const canReadPlatformUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);
  const canReadCapacity = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_CAPACITY_READ);

  const requestedStatus = searchParams.get('status') || '';
  const requestedCategory = searchParams.get('category') || '';
  const requestedImpact = searchParams.get('business_impact') || '';
  const requestedVendorId = searchParams.get('vendor_id') || '';
  const requestedSearch = searchParams.get('search') || '';
  const requestedOnlyAttention = searchParams.get('only_attention') || '';
  const requestedIncludeArchived = searchParams.get('include_archived') || '';
  const status = STATUS_OPTIONS.includes(requestedStatus) ? requestedStatus : '';
  const category = CATEGORY_OPTIONS.includes(requestedCategory) ? requestedCategory : '';
  const businessImpact = IMPACT_OPTIONS.includes(requestedImpact) ? requestedImpact : '';
  const vendorId = requestedVendorId && canReadVendors && UUID_RE.test(requestedVendorId) ? requestedVendorId : '';
  const search = requestedSearch.length <= 200 ? requestedSearch : '';
  const onlyAttention = requestedOnlyAttention === 'true';
  const includeArchived = requestedIncludeArchived === 'true';
  const invalidFilters = Boolean(
    (requestedStatus && !status) || (requestedCategory && !category) || (requestedImpact && !businessImpact) ||
    (requestedVendorId && !vendorId) || (requestedSearch && !search) ||
    (requestedOnlyAttention && !['true', 'false'].includes(requestedOnlyAttention)) ||
    (requestedIncludeArchived && !['true', 'false'].includes(requestedIncludeArchived))
  );

  const [offset, setOffset] = useState(0);
  const [form, setForm] = useState<DependencyForm>(() => emptyForm());
  const [editingId, setEditingId] = useState('');
  const [message, setMessage] = useState('');
  const [mutationError, setMutationError] = useState('');

  useEffect(() => { setOffset(0); }, [status, category, businessImpact, vendorId, search, onlyAttention, includeArchived, invalidFilters]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (status) params.set('status', status);
    if (category) params.set('category', category);
    if (businessImpact) params.set('business_impact', businessImpact);
    if (vendorId) params.set('vendor_id', vendorId);
    if (search.trim()) params.set('search', search.trim());
    if (onlyAttention) params.set('only_attention', 'true');
    if (includeArchived) params.set('include_archived', 'true');
    return params.toString();
  }, [status, category, businessImpact, vendorId, search, onlyAttention, includeArchived, offset]);

  const dependencies = useQuery({
    queryKey: ['platform', 'service-dependencies', status, category, businessImpact, vendorId, search, onlyAttention, includeArchived, offset],
    queryFn: () => platformApiRequest<DependenciesResponse>(`/platform/service-dependencies?${queryString}`), enabled: !invalidFilters,
    refetchOnWindowFocus: false, staleTime: 30_000
  });
  const vendors = useQuery({
    queryKey: ['platform', 'dependency-vendors'], queryFn: () => platformApiRequest<VendorsResponse>('/platform/vendors?limit=500'),
    enabled: canReadVendors, refetchOnWindowFocus: false, staleTime: 30_000
  });
  const users = useQuery({
    queryKey: ['platform', 'dependency-owner-users'], queryFn: () => platformApiRequest<PlatformUser[]>('/platform/users'),
    enabled: canWrite && canReadPlatformUsers, refetchOnWindowFocus: false, staleTime: 30_000
  });

  const payloadFromForm = () => {
    const payload: Record<string, unknown> = {
      name: form.name.trim(), category: form.category, status: form.status, business_impact: form.business_impact,
      status_page_url: clean(form.status_page_url), escalation_url: clean(form.escalation_url), check_notes: clean(form.check_notes)
    };
    if (canReadVendors) payload.vendor_id = clean(form.vendor_id);
    if (canReadPlatformUsers) payload.owner_platform_user_id = clean(form.owner_platform_user_id);
    return payload;
  };

  const saveDependency = useMutation({
    mutationFn: () => platformApiRequest(editingId ? `/platform/service-dependencies/${editingId}` : '/platform/service-dependencies', { method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(payloadFromForm()) }),
    onSuccess: async () => { setMessage(editingId ? 'Dependency changes saved. Ordinary edits do not advance the check timestamp.' : 'Dependency created. It is not considered checked until Record check is used.'); setMutationError(''); setEditingId(''); setForm(emptyForm()); await queryClient.invalidateQueries({ queryKey: ['platform', 'service-dependencies'] }); },
    onError: (error) => setMutationError(readableError(error))
  });
  const markChecked = useMutation({
    mutationFn: (dependency: Dependency) => platformApiRequest(`/platform/service-dependencies/${dependency.id}/check`, { method: 'POST', body: JSON.stringify({ status: dependency.status, check_notes: dependency.check_notes || null }) }),
    onSuccess: async (_data, dependency) => { setMessage(`Application check recorded: ${dependency.name}`); setMutationError(''); await queryClient.invalidateQueries({ queryKey: ['platform', 'service-dependencies'] }); },
    onError: (error) => setMutationError(readableError(error))
  });
  const archiveDependency = useMutation({
    mutationFn: (dependency: Dependency) => platformApiRequest(`/platform/service-dependencies/${dependency.id}/archive`, { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: async (_data, dependency) => { setMessage(`Dependency archived: ${dependency.name}`); setMutationError(''); if (editingId === dependency.id) { setEditingId(''); setForm(emptyForm()); } await queryClient.invalidateQueries({ queryKey: ['platform', 'service-dependencies'] }); },
    onError: (error) => setMutationError(readableError(error))
  });

  const categories = dependencies.data?.categories || CATEGORY_OPTIONS;
  const statuses = dependencies.data?.statuses || STATUS_OPTIONS;
  const mutableStatuses = dependencies.data?.mutable_statuses || MUTABLE_STATUS_OPTIONS;
  const impacts = dependencies.data?.impacts || IMPACT_OPTIONS;
  const rows = dependencies.data?.dependencies || [];
  const summary = dependencies.data?.summary;
  const pagination = dependencies.data?.pagination;
  const access = dependencies.data?.evidence_access || { vendor_identity: canReadVendors, platform_user_identity: canReadPlatformUsers };
  const activeUsers = (users.data || []).filter((user) => user.is_active !== false);
  const availableVendors = (vendors.data?.vendors || []).filter((vendor) => !vendor.archived_at && vendor.status !== 'archived');
  const pageNumber = Math.floor(offset / PAGE_SIZE) + 1;
  const initialError = dependencies.isError && dependencies.data === undefined;
  const refreshError = dependencies.isError && dependencies.data !== undefined;
  const hasInvalidStatusUrl = Boolean(form.status_page_url.trim() && !validExternalUrl(form.status_page_url.trim()));
  const hasInvalidEscalationUrl = Boolean(form.escalation_url.trim() && !validExternalUrl(form.escalation_url.trim()));
  const saveDisabled = !form.name.trim() || hasInvalidStatusUrl || hasInvalidEscalationUrl || saveDependency.isPending;
  const saveHelp = !form.name.trim() ? 'Enter a dependency name.' : hasInvalidStatusUrl ? 'Status page must be a valid HTTP or HTTPS URL.' : hasInvalidEscalationUrl ? 'Escalation destination must be a valid HTTP or HTTPS URL.' : '';
  const mutating = saveDependency.isPending || markChecked.isPending || archiveDependency.isPending;

  const setFilter = (key: string, value: string) => { const next = new URLSearchParams(searchParams); if (value) next.set(key, value); else next.delete(key); setSearchParams(next, { replace: true }); };
  const setBooleanFilter = (key: string, checked: boolean) => setFilter(key, checked ? 'true' : '');
  const clearFilters = () => setSearchParams(new URLSearchParams(), { replace: true });
  const startEdit = (dependency: Dependency) => { setMessage(''); setMutationError(''); setEditingId(dependency.id); setForm(toForm(dependency)); scrollToFormSection('platform-service-dependencies-form'); };
  const cancelEdit = () => { setEditingId(''); setForm(emptyForm()); setMutationError(''); setMessage('Dependency edit cancelled.'); };

  return <div className="io-operational-page io-workspace-page platform-service-dependencies">
    <OperationalWorkspaceHero
      iconPath="/platform/service-dependencies" eyebrow="Platform operations" title="Service dependencies"
      description="Maintain application-recorded dependencies on external services, their operator-recorded status, business impact, escalation destinations, ownership, and vendor linkage."
      meta={<><OperationalWorkspaceMetaPill>Filtered registry summary</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>Page size {PAGE_SIZE}</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>{access.vendor_identity ? 'Vendor identity visible' : 'Vendor identity redacted'}</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>{access.platform_user_identity ? 'Owner identity visible' : 'Owner identity redacted'}</OperationalWorkspaceMetaPill></>}
      aside={<div className="platform-service-dependencies__hero-aside"><OperationalWorkspaceStatus value={(summary?.major_outage || 0) > 0 ? 'Review required' : (summary?.attention || 0) > 0 ? 'Attention recorded' : dependencies.data ? 'No recorded findings' : 'Loading'} label="Application dependency posture" /><div className="platform-service-dependencies__refresh-block"><button type="button" className="app-button app-button--secondary" onClick={() => dependencies.refetch()} disabled={dependencies.isFetching || invalidFilters}>{dependencies.isFetching ? 'Refreshing…' : 'Refresh'}</button><span>{dependencies.data ? `Last successful snapshot · ${pagination?.total ?? 0} matched` : 'No successful snapshot loaded yet'}</span></div></div>}
    />

    <div className="platform-service-dependencies__truth-note"><strong>Dependency evidence boundary</strong>Status, impact, check notes, timestamps, URLs, owner linkage and vendor linkage are application-maintained evidence. They do not prove the external service is actually healthy, degraded, reachable, contractually supported, or acknowledged by a vendor. Historical check timestamps can include legacy registry edits recorded before this hardening; ordinary edits no longer advance the check timestamp.</div>
    {!access.vendor_identity || !access.platform_user_identity ? <div className="platform-service-dependencies__restricted"><strong>Some linked evidence is redacted.</strong><span>{!access.vendor_identity ? 'Vendor identity/filtering requires PLATFORM_VENDORS_READ. ' : ''}{!access.platform_user_identity ? 'Owner and updater identities require PLATFORM_USERS_READ.' : ''} Dependency records remain readable under PLATFORM_DEPENDENCIES_READ.</span></div> : null}
    {invalidFilters ? <div className="platform-service-dependencies__blocking-error"><strong>Invalid or forbidden URL filter</strong><span>One or more Service Dependency filters are unsupported, malformed, or require a permission you do not have. Clear them before loading registry evidence.</span><button type="button" className="app-button app-button--secondary" onClick={clearFilters}>Clear filters</button></div> : null}
    {refreshError ? <div className="platform-service-dependencies__warning"><strong>Showing the last successful snapshot.</strong><span>{readableError(dependencies.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => dependencies.refetch()}>Retry</button></div> : null}
    {message ? <div className="platform-service-dependencies__success"><span>{message}</span><button type="button" className="app-button app-button--secondary" onClick={() => setMessage('')}>Dismiss</button></div> : null}
    {mutationError ? <div className="platform-service-dependencies__warning"><strong>Dependency action failed.</strong><span>{mutationError}</span><button type="button" className="app-button app-button--secondary" onClick={() => setMutationError('')}>Dismiss</button></div> : null}

    <OperationalWorkspaceStats ariaLabel="Service dependency registry summary">
      <OperationalWorkspaceStatCard label="Matched dependencies" value={summary?.total ?? 0} helper="Across current filters, not only this page" iconPath="/platform/service-dependencies" loading={dependencies.isLoading} />
      <OperationalWorkspaceStatCard label="Attention recorded" value={summary?.attention ?? 0} helper="Degraded, outage or unknown application statuses" tone={(summary?.attention || 0) > 0 ? 'warn' : 'neutral'} loading={dependencies.isLoading} />
      <OperationalWorkspaceStatCard label="Major outage" value={summary?.major_outage ?? 0} helper="Operator-recorded status, not independently verified" tone={(summary?.major_outage || 0) > 0 ? 'danger' : 'neutral'} loading={dependencies.isLoading} />
      <OperationalWorkspaceStatCard label="Critical impact" value={summary?.critical_impact ?? 0} helper="Internal business-impact classification" tone={(summary?.critical_impact || 0) > 0 ? 'danger' : 'neutral'} loading={dependencies.isLoading} />
    </OperationalWorkspaceStats>

    <section className="io-workspace-panel platform-service-dependencies__section">
      <OperationalSectionHeader iconPath="/platform/service-dependencies" title="Filter registry" description="Filters are URL-backed so the current application-evidence view can be reopened or shared." actions={<button type="button" className="app-button app-button--secondary" onClick={clearFilters} disabled={!searchParams.toString()}>Clear filters</button>} />
      <div className="platform-service-dependencies__filter-grid">
        <label>Status<select value={status} onChange={(event) => setFilter('status', event.target.value)}><option value="">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label>Category<select value={category} onChange={(event) => setFilter('category', event.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label>Business impact<select value={businessImpact} onChange={(event) => setFilter('business_impact', event.target.value)}><option value="">All impacts</option>{impacts.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        {canReadVendors ? <label>Vendor<select value={vendorId} onChange={(event) => setFilter('vendor_id', event.target.value)}><option value="">All vendors</option>{availableVendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label> : <div className="platform-service-dependencies__filter-restricted"><strong>Vendor filter restricted</strong><span>PLATFORM_VENDORS_READ required.</span></div>}
        <label className="platform-service-dependencies__search">Search<input value={search} maxLength={200} onChange={(event) => setFilter('search', event.target.value)} placeholder={canReadVendors ? 'Name, category, status, notes or vendor' : 'Name, category, status or notes'} /></label>
        <label className="platform-service-dependencies__checkbox"><input type="checkbox" checked={onlyAttention} onChange={(event) => setBooleanFilter('only_attention', event.target.checked)} />Only attention statuses</label>
        <label className="platform-service-dependencies__checkbox"><input type="checkbox" checked={includeArchived} onChange={(event) => setBooleanFilter('include_archived', event.target.checked)} />Include archived history</label>
      </div>
    </section>

    {canWrite ? <section id="platform-service-dependencies-form" className="io-workspace-panel platform-service-dependencies__section">
      <OperationalSectionHeader iconPath="/platform/service-dependencies" title={editingId ? 'Edit dependency registry entry' : 'Add dependency registry entry'} description={editingId ? 'Archived dependencies are immutable. Ordinary edits preserve restricted linkages and do not advance the check timestamp.' : 'Create an internal dependency record. Creation is not treated as an explicit service check.'} actions={editingId ? <button type="button" className="app-button app-button--secondary" onClick={cancelEdit} disabled={mutating}>Cancel edit</button> : undefined} />
      <div className="platform-service-dependencies__form-grid">
        <label>Name<input value={form.name} maxLength={200} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} /></label>
        <label>Category<select value={form.category} onChange={(event) => setForm((value) => ({ ...value, category: event.target.value }))}>{categories.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label>Status<select value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value }))}>{mutableStatuses.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label>Business impact<select value={form.business_impact} onChange={(event) => setForm((value) => ({ ...value, business_impact: event.target.value }))}>{impacts.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        {canReadVendors ? <label>Vendor<select value={form.vendor_id} onChange={(event) => setForm((value) => ({ ...value, vendor_id: event.target.value }))}><option value="">No vendor linked</option>{availableVendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label> : <div className="platform-service-dependencies__link-restricted"><strong>Vendor linkage restricted</strong><span>Existing linkage is preserved; PLATFORM_VENDORS_READ is required to view or change it.</span></div>}
        {canReadPlatformUsers ? <label>Owner<select value={form.owner_platform_user_id} onChange={(event) => setForm((value) => ({ ...value, owner_platform_user_id: event.target.value }))}><option value="">Unassigned</option>{activeUsers.map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}</select></label> : <div className="platform-service-dependencies__link-restricted"><strong>Owner linkage restricted</strong><span>Existing linkage is preserved; PLATFORM_USERS_READ is required to view or change it.</span></div>}
        <label>Status page URL<input value={form.status_page_url} maxLength={2048} placeholder="https://status.example" onChange={(event) => setForm((value) => ({ ...value, status_page_url: event.target.value }))} /></label>
        <label>Escalation URL<input value={form.escalation_url} maxLength={2048} placeholder="https://support.example" onChange={(event) => setForm((value) => ({ ...value, escalation_url: event.target.value }))} /></label>
        <label className="platform-service-dependencies__span-all">Current check notes<textarea value={form.check_notes} maxLength={5000} onChange={(event) => setForm((value) => ({ ...value, check_notes: event.target.value }))} /><small>Saving notes edits the current registry note only. Use Record check on the dependency card to advance the check timestamp.</small></label>
      </div>
      {saveHelp ? <div className="platform-service-dependencies__validation">{saveHelp}</div> : null}
      <div className="platform-service-dependencies__actions"><button type="button" className="app-button app-button--primary" disabled={saveDisabled} onClick={() => { setMessage(''); setMutationError(''); saveDependency.mutate(); }}>{saveDependency.isPending ? 'Saving…' : editingId ? 'Save changes' : 'Create dependency'}</button></div>
    </section> : null}

    <section className="io-workspace-panel platform-service-dependencies__section">
      <OperationalSectionHeader iconPath="/platform/service-dependencies" title="Dependency evidence" description="Registry-wide summary is above; cards below are only the currently loaded page." actions={<span className="platform-service-dependencies__page-note">Page {pageNumber} · {rows.length} loaded · {pagination?.total ?? 0} matched</span>} />
      {initialError ? <div className="platform-service-dependencies__blocking-error"><strong>Dependency registry could not be loaded.</strong><span>{readableError(dependencies.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => dependencies.refetch()}>Retry</button></div> : null}
      {dependencies.isLoading ? <div className="platform-service-dependencies__loading">Loading service dependency evidence…</div> : null}
      {dependencies.data && rows.length ? <div className="platform-service-dependencies__list">{rows.map((dependency) => <article key={dependency.id} className="platform-service-dependencies__card">
        <div className="platform-service-dependencies__card-header"><div><h4>{dependency.name}</h4><p>{pretty(dependency.category)} dependency · application registry record</p></div><div className="platform-service-dependencies__badges"><span data-tone={statusTone(dependency.status, dependency.is_archived)}>{pretty(dependency.status)}</span><span data-tone={impactTone(dependency.business_impact)}>{pretty(dependency.business_impact)} impact</span></div></div>
        <div className="platform-service-dependencies__metrics-grid">
          <div><span>Vendor</span><strong>{access.vendor_identity ? (dependency.vendor_name || 'Unlinked') : 'Redacted'}</strong></div>
          <div><span>Owner</span><strong>{access.platform_user_identity ? (dependency.owner_email || (dependency.owner_present ? 'Assigned identity unavailable' : 'Unassigned')) : (dependency.owner_present ? 'Assigned · identity redacted' : 'Unassigned')}</strong></div>
          <div><span>Recorded check time</span><strong>{dateTime(dependency.last_checked_at)}</strong></div>
          <div><span>Status changed</span><strong>{dateTime(dependency.last_status_change_at)}</strong></div>
          <div><span>Updated</span><strong>{dateTime(dependency.updated_at)}</strong></div>
          <div><span>Updated by</span><strong>{access.platform_user_identity ? (dependency.updated_by_email || 'Not recorded') : 'Redacted'}</strong></div>
        </div>
        {dependency.check_notes ? <div className="platform-service-dependencies__notes"><strong>Current check notes</strong><span>{dependency.check_notes}</span></div> : null}
        <div className="platform-service-dependencies__card-footer"><div className="platform-service-dependencies__source-links">{validExternalUrl(dependency.status_page_url) ? <a href={dependency.status_page_url || '#'} target="_blank" rel="noreferrer">Status page</a> : null}{validExternalUrl(dependency.escalation_url) ? <a href={dependency.escalation_url || '#'} target="_blank" rel="noreferrer">Escalation destination</a> : null}{canReadVendors && dependency.vendor_id ? <Link to={`/platform/vendors?search=${encodeURIComponent(dependency.vendor_name || '')}`}>Vendor registry</Link> : null}{canReadAudit ? <Link to={`/platform/audit?target_type=service_dependency&target_id=${encodeURIComponent(dependency.id)}`}>Audit history</Link> : null}</div>{canWrite && !dependency.is_archived ? <div className="platform-service-dependencies__actions"><button type="button" className="app-button app-button--secondary" onClick={() => startEdit(dependency)} disabled={mutating}>Edit</button><button type="button" className="app-button app-button--secondary" onClick={() => markChecked.mutate(dependency)} disabled={mutating}>Record check</button><button type="button" className="app-button app-button--danger" onClick={() => { if (window.confirm(`Archive dependency ${dependency.name}? Archived dependencies become immutable.`)) archiveDependency.mutate(dependency); }} disabled={mutating}>Archive</button></div> : dependency.is_archived ? <span className="platform-service-dependencies__immutable">Archived · immutable</span> : null}</div>
      </article>)}</div> : dependencies.data ? <div className="platform-service-dependencies__empty"><strong>No dependency records matched.</strong><span>No permitted application dependency evidence matched the current filters. This does not prove that no external dependency exists or that external services have no issues.</span></div> : null}
      {dependencies.data ? <div className="platform-service-dependencies__pagination"><button type="button" className="app-button app-button--secondary" onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))} disabled={offset === 0 || dependencies.isFetching}>Previous</button><span>Page {pageNumber} · up to {PAGE_SIZE} dependencies</span><button type="button" className="app-button app-button--secondary" onClick={() => setOffset((value) => value + PAGE_SIZE)} disabled={!pagination?.has_more || dependencies.isFetching}>Next</button></div> : null}
    </section>

    <section className="io-workspace-panel platform-service-dependencies__section"><OperationalSectionHeader iconPath="/platform/service-dependencies" title="Supporting operations" description="Only destinations allowed by the current Platform permission snapshot are shown." /><div className="platform-service-dependencies__supporting-links"><Link to="/platform/integration-monitoring?source=service_dependencies">Integration monitoring</Link>{canReadVendors ? <Link to="/platform/vendors">Vendors</Link> : null}{canReadCapacity ? <Link to="/platform/capacity-planning">Capacity planning</Link> : null}{canReadPlatformUsers ? <Link to="/platform/users">Platform users</Link> : null}{canReadAudit ? <Link to="/platform/audit">Platform audit</Link> : null}</div></section>
  </div>;
}
