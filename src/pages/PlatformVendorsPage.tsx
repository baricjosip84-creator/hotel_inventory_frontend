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
import './PlatformVendorsPage.css';

type PlatformUser = { id: string; email: string; name?: string | null; is_active?: boolean };
type Pagination = { limit: number; offset: number; total: number; has_more: boolean };
type EvidenceAccess = { platform_user_identity: boolean };
type EvidenceContract = {
  application_registry_only: boolean;
  vendor_relationship_not_verified_externally: boolean;
  contract_and_sla_references_are_metadata: boolean;
  risk_and_status_are_internal_operator_classifications: boolean;
};
type Vendor = {
  id: string; name: string; category: string; status: string; risk_level: string;
  primary_contact_name?: string | null; primary_contact_email?: string | null; primary_contact_phone?: string | null;
  website_url?: string | null; account_reference?: string | null; sla_reference?: string | null;
  contract_start_date?: string | null; contract_renewal_date?: string | null;
  owner_platform_user_id?: string | null; owner_email?: string | null; dependency_notes?: string | null; internal_notes?: string | null;
  archived_at?: string | null; is_archived?: boolean; created_at?: string | null; updated_at?: string | null; updated_by_email?: string | null;
};
type VendorsResponse = {
  vendors: Vendor[];
  summary: { total: number; archived: number; renewal_due: number; critical_risk: number; high_risk: number; by_category: Record<string, number>; by_status: Record<string, number>; by_risk: Record<string, number> };
  pagination: Pagination;
  evidence_access: EvidenceAccess;
  evidence_contract: EvidenceContract;
  categories: string[]; statuses: string[]; mutable_statuses: string[]; risk_levels: string[];
};

type VendorForm = {
  name: string; category: string; status: string; risk_level: string; primary_contact_name: string; primary_contact_email: string;
  primary_contact_phone: string; website_url: string; account_reference: string; sla_reference: string; contract_start_date: string;
  contract_renewal_date: string; owner_platform_user_id: string; dependency_notes: string; internal_notes: string;
};

const PAGE_SIZE = 50;
const CATEGORY_OPTIONS = ['payment', 'infrastructure', 'messaging', 'integrations', 'support', 'security', 'legal', 'other'];
const STATUS_OPTIONS = ['active', 'watch', 'renewal_due', 'inactive', 'archived'];
const MUTABLE_STATUS_OPTIONS = ['active', 'watch', 'renewal_due', 'inactive'];
const RISK_OPTIONS = ['low', 'medium', 'high', 'critical'];
const emptyForm = (): VendorForm => ({ name: '', category: 'other', status: 'active', risk_level: 'medium', primary_contact_name: '', primary_contact_email: '', primary_contact_phone: '', website_url: '', account_reference: '', sla_reference: '', contract_start_date: '', contract_renewal_date: '', owner_platform_user_id: '', dependency_notes: '', internal_notes: '' });

function readableError(error: unknown) { return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error'; }
function clean(value: string) { const trimmed = value.trim(); return trimmed || null; }
function pretty(value?: string | null) { return value ? value.replaceAll('_', ' ') : 'Not recorded'; }
function dateOnly(value?: string | null) { if (!value) return ''; return String(value).slice(0, 10); }
function dateTime(value?: string | null) { if (!value) return 'Not recorded'; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? 'Not recorded' : parsed.toLocaleString(); }
function riskTone(value?: string) { if (value === 'critical') return 'danger'; if (value === 'high') return 'warn'; if (value === 'low') return 'good'; return 'neutral'; }
function statusTone(value?: string, archived?: boolean) { if (archived || value === 'archived') return 'neutral'; if (value === 'watch' || value === 'renewal_due') return 'warn'; if (value === 'active') return 'good'; return 'neutral'; }
function validExternalUrl(value?: string | null) { if (!value) return false; try { const parsed = new URL(value); return parsed.protocol === 'https:' || parsed.protocol === 'http:'; } catch { return false; } }
function toForm(vendor: Vendor): VendorForm { return { name: vendor.name || '', category: vendor.category || 'other', status: MUTABLE_STATUS_OPTIONS.includes(vendor.status) ? vendor.status : 'inactive', risk_level: vendor.risk_level || 'medium', primary_contact_name: vendor.primary_contact_name || '', primary_contact_email: vendor.primary_contact_email || '', primary_contact_phone: vendor.primary_contact_phone || '', website_url: vendor.website_url || '', account_reference: vendor.account_reference || '', sla_reference: vendor.sla_reference || '', contract_start_date: dateOnly(vendor.contract_start_date), contract_renewal_date: dateOnly(vendor.contract_renewal_date), owner_platform_user_id: vendor.owner_platform_user_id || '', dependency_notes: vendor.dependency_notes || '', internal_notes: vendor.internal_notes || '' }; }

export default function PlatformVendorsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_VENDORS_WRITE);
  const canReadPlatformUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canReadDependencies = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ);
  const canReadCompliance = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_COMPLIANCE_READ);
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);

  const requestedCategory = searchParams.get('category') || '';
  const requestedStatus = searchParams.get('status') || '';
  const requestedRisk = searchParams.get('risk_level') || '';
  const requestedSearch = searchParams.get('search') || '';
  const requestedRenewalDue = searchParams.get('renewal_due') || '';
  const requestedIncludeArchived = searchParams.get('include_archived') || '';
  const category = CATEGORY_OPTIONS.includes(requestedCategory) ? requestedCategory : '';
  const status = STATUS_OPTIONS.includes(requestedStatus) ? requestedStatus : '';
  const riskLevel = RISK_OPTIONS.includes(requestedRisk) ? requestedRisk : '';
  const search = requestedSearch.length <= 200 ? requestedSearch : '';
  const renewalDue = requestedRenewalDue === 'true';
  const includeArchived = requestedIncludeArchived === 'true';
  const invalidFilters = Boolean((requestedCategory && !category) || (requestedStatus && !status) || (requestedRisk && !riskLevel) || (requestedSearch && !search) || (requestedRenewalDue && !['true', 'false'].includes(requestedRenewalDue)) || (requestedIncludeArchived && !['true', 'false'].includes(requestedIncludeArchived)));

  const [offset, setOffset] = useState(0);
  const [form, setForm] = useState<VendorForm>(() => emptyForm());
  const [editingId, setEditingId] = useState('');
  const [message, setMessage] = useState('');
  const [mutationError, setMutationError] = useState('');

  useEffect(() => { setOffset(0); }, [category, status, riskLevel, search, renewalDue, includeArchived, invalidFilters]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (category) params.set('category', category);
    if (status) params.set('status', status);
    if (riskLevel) params.set('risk_level', riskLevel);
    if (search.trim()) params.set('search', search.trim());
    if (renewalDue) params.set('renewal_due', 'true');
    if (includeArchived) params.set('include_archived', 'true');
    return params.toString();
  }, [category, status, riskLevel, search, renewalDue, includeArchived, offset]);

  const vendors = useQuery({
    queryKey: ['platform', 'vendors', category, status, riskLevel, search, renewalDue, includeArchived, offset],
    queryFn: () => platformApiRequest<VendorsResponse>(`/platform/vendors?${queryString}`), enabled: !invalidFilters,
    refetchOnWindowFocus: false, staleTime: 30_000
  });
  const users = useQuery({
    queryKey: ['platform', 'vendor-owner-users'], queryFn: () => platformApiRequest<PlatformUser[]>('/platform/users'),
    enabled: canWrite && canReadPlatformUsers, refetchOnWindowFocus: false, staleTime: 30_000
  });

  const payloadFromForm = () => {
    const payload: Record<string, unknown> = {
      name: form.name.trim(), category: form.category, status: form.status, risk_level: form.risk_level,
      primary_contact_name: clean(form.primary_contact_name), primary_contact_email: clean(form.primary_contact_email), primary_contact_phone: clean(form.primary_contact_phone),
      website_url: clean(form.website_url), account_reference: clean(form.account_reference), sla_reference: clean(form.sla_reference),
      contract_start_date: clean(form.contract_start_date), contract_renewal_date: clean(form.contract_renewal_date),
      dependency_notes: clean(form.dependency_notes), internal_notes: clean(form.internal_notes)
    };
    if (canReadPlatformUsers) payload.owner_platform_user_id = clean(form.owner_platform_user_id);
    return payload;
  };

  const saveVendor = useMutation({
    mutationFn: () => platformApiRequest(editingId ? `/platform/vendors/${editingId}` : '/platform/vendors', { method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(payloadFromForm()) }),
    onSuccess: async () => { setMessage(editingId ? 'Vendor changes saved.' : 'Vendor created.'); setMutationError(''); setEditingId(''); setForm(emptyForm()); await queryClient.invalidateQueries({ queryKey: ['platform', 'vendors'] }); },
    onError: (error) => setMutationError(readableError(error))
  });
  const archiveVendor = useMutation({
    mutationFn: (vendor: Vendor) => platformApiRequest(`/platform/vendors/${vendor.id}/archive`, { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: async (_data, vendor) => { setMessage(`Vendor archived: ${vendor.name}`); setMutationError(''); if (editingId === vendor.id) { setEditingId(''); setForm(emptyForm()); } await queryClient.invalidateQueries({ queryKey: ['platform', 'vendors'] }); },
    onError: (error) => setMutationError(readableError(error))
  });

  const categories = vendors.data?.categories || CATEGORY_OPTIONS;
  const statuses = vendors.data?.statuses || STATUS_OPTIONS;
  const mutableStatuses = vendors.data?.mutable_statuses || MUTABLE_STATUS_OPTIONS;
  const riskLevels = vendors.data?.risk_levels || RISK_OPTIONS;
  const rows = vendors.data?.vendors || [];
  const summary = vendors.data?.summary;
  const access = vendors.data?.evidence_access || { platform_user_identity: canReadPlatformUsers };
  const pagination = vendors.data?.pagination;
  const pageNumber = Math.floor(offset / PAGE_SIZE) + 1;
  const initialError = vendors.isError && vendors.data === undefined;
  const refreshError = vendors.isError && vendors.data !== undefined;
  const activeUsers = (users.data || []).filter((user) => user.is_active !== false);
  const hasInvalidContractWindow = Boolean(form.contract_start_date && form.contract_renewal_date && form.contract_renewal_date < form.contract_start_date);
  const hasInvalidWebsite = Boolean(form.website_url.trim() && !validExternalUrl(form.website_url.trim()));
  const saveDisabled = !form.name.trim() || hasInvalidContractWindow || hasInvalidWebsite || saveVendor.isPending;
  const saveHelp = !form.name.trim() ? 'Enter a vendor name.' : hasInvalidContractWindow ? 'Renewal date must be on or after the contract start date.' : hasInvalidWebsite ? 'Website must be a valid HTTP or HTTPS URL.' : '';
  const mutating = saveVendor.isPending || archiveVendor.isPending;

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const setBooleanFilter = (key: string, checked: boolean) => setFilter(key, checked ? 'true' : '');
  const clearFilters = () => setSearchParams(new URLSearchParams(), { replace: true });
  const startEdit = (vendor: Vendor) => { setMessage(''); setMutationError(''); setEditingId(vendor.id); setForm(toForm(vendor)); scrollToFormSection('platform-vendors-form'); };
  const cancelEdit = () => { setEditingId(''); setForm(emptyForm()); setMutationError(''); setMessage('Vendor edit cancelled.'); };

  return <div className="io-operational-page io-workspace-page platform-vendors">
    <OperationalWorkspaceHero
      iconPath="/platform/vendors" eyebrow="Platform operations" title="Vendors"
      description="Maintain the internal registry of external vendors and partners that can affect Platform operations, contracts, dependencies, security, and compliance."
      meta={<><OperationalWorkspaceMetaPill>Filtered registry summary</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>Page size {PAGE_SIZE}</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>{access.platform_user_identity ? 'Operator identity visible' : 'Operator identity redacted'}</OperationalWorkspaceMetaPill></>}
      aside={<div className="platform-vendors__hero-aside"><OperationalWorkspaceStatus value={summary?.critical_risk ? 'Review required' : vendors.data ? 'Registry evidence' : 'Loading'} label="Internal vendor posture" /><div className="platform-vendors__refresh-block"><button type="button" className="app-button app-button--secondary" onClick={() => vendors.refetch()} disabled={vendors.isFetching || invalidFilters}>{vendors.isFetching ? 'Refreshing…' : 'Refresh'}</button><span>{vendors.data ? `Last successful snapshot · ${pagination?.total ?? 0} matched` : 'No successful snapshot loaded yet'}</span></div></div>}
    />

    <div className="platform-vendors__truth-note"><strong>Vendor evidence boundary</strong>Vendor status, risk, contacts, SLA references, contract dates and notes are application-maintained registry evidence. They do not prove an external contract is valid, an SLA is contractually agreed, the vendor acknowledged anything, or the real-world vendor relationship is currently active.</div>
    {!access.platform_user_identity ? <div className="platform-vendors__restricted"><strong>Platform-user identity is redacted.</strong><span>Owner and updater identities require PLATFORM_USERS_READ. Vendor records remain readable under PLATFORM_VENDORS_READ.</span></div> : null}
    {invalidFilters ? <div className="platform-vendors__blocking-error"><strong>Invalid URL filter</strong><span>One or more Vendor filters are unsupported. Clear them before loading registry evidence.</span><button type="button" className="app-button app-button--secondary" onClick={clearFilters}>Clear filters</button></div> : null}
    {refreshError ? <div className="platform-vendors__warning"><strong>Showing the last successful snapshot.</strong><span>{readableError(vendors.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => vendors.refetch()}>Retry</button></div> : null}
    {message ? <div className="platform-vendors__success"><span>{message}</span><button type="button" className="app-button app-button--secondary" onClick={() => setMessage('')}>Dismiss</button></div> : null}
    {mutationError ? <div className="platform-vendors__warning"><strong>Vendor action failed.</strong><span>{mutationError}</span><button type="button" className="app-button app-button--secondary" onClick={() => setMutationError('')}>Dismiss</button></div> : null}

    <OperationalWorkspaceStats ariaLabel="Vendor registry summary">
      <OperationalWorkspaceStatCard label="Matched vendors" value={summary?.total ?? 0} helper="Across current filters, not only this page" iconPath="/platform/vendors" loading={vendors.isLoading} />
      <OperationalWorkspaceStatCard label="Renewal due ≤60 days" value={summary?.renewal_due ?? 0} helper="Includes overdue recorded renewal dates" tone={(summary?.renewal_due || 0) > 0 ? 'warn' : 'neutral'} loading={vendors.isLoading} />
      <OperationalWorkspaceStatCard label="Critical risk" value={summary?.critical_risk ?? 0} helper="Internal operator classification" tone={(summary?.critical_risk || 0) > 0 ? 'danger' : 'neutral'} loading={vendors.isLoading} />
      <OperationalWorkspaceStatCard label="Archived matched" value={summary?.archived ?? 0} helper="Historical registry evidence" tone="slate" loading={vendors.isLoading} />
    </OperationalWorkspaceStats>

    <section className="io-workspace-panel platform-vendors__section">
      <OperationalSectionHeader iconPath="/platform/vendors" title="Filter registry" description="Filters are URL-backed so the current evidence view can be reopened or shared." actions={<button type="button" className="app-button app-button--secondary" onClick={clearFilters} disabled={!searchParams.toString()}>Clear filters</button>} />
      <div className="platform-vendors__filter-grid">
        <label>Category<select value={category} onChange={(event) => setFilter('category', event.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label>Status<select value={status} onChange={(event) => setFilter('status', event.target.value)}><option value="">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label>Risk<select value={riskLevel} onChange={(event) => setFilter('risk_level', event.target.value)}><option value="">All risk levels</option>{riskLevels.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label className="platform-vendors__search">Search<input value={search} maxLength={200} onChange={(event) => setFilter('search', event.target.value)} placeholder="Name, contact, account, SLA or notes" /></label>
        <label className="platform-vendors__checkbox"><input type="checkbox" checked={renewalDue} onChange={(event) => setBooleanFilter('renewal_due', event.target.checked)} />Renewal due / overdue</label>
        <label className="platform-vendors__checkbox"><input type="checkbox" checked={includeArchived} onChange={(event) => setBooleanFilter('include_archived', event.target.checked)} />Include archived history</label>
      </div>
    </section>

    {canWrite ? <section id="platform-vendors-form" className="io-workspace-panel platform-vendors__section">
      <OperationalSectionHeader iconPath="/platform/vendors" title={editingId ? 'Edit vendor registry entry' : 'Add vendor registry entry'} description={editingId ? 'Archived vendors are immutable. Saving an active record preserves fields you are not authorized to view or change.' : 'Create an internal vendor record. External relationship or contract validity is not verified by this action.'} actions={editingId ? <button type="button" className="app-button app-button--secondary" onClick={cancelEdit} disabled={mutating}>Cancel edit</button> : undefined} />
      <div className="platform-vendors__form-grid">
        <label>Name<input value={form.name} maxLength={300} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} /></label>
        <label>Category<select value={form.category} onChange={(event) => setForm((value) => ({ ...value, category: event.target.value }))}>{categories.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label>Status<select value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value }))}>{mutableStatuses.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label>Risk<select value={form.risk_level} onChange={(event) => setForm((value) => ({ ...value, risk_level: event.target.value }))}>{riskLevels.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label>Contact name<input value={form.primary_contact_name} maxLength={200} onChange={(event) => setForm((value) => ({ ...value, primary_contact_name: event.target.value }))} /></label>
        <label>Contact email<input type="email" value={form.primary_contact_email} maxLength={320} onChange={(event) => setForm((value) => ({ ...value, primary_contact_email: event.target.value }))} /></label>
        <label>Contact phone<input value={form.primary_contact_phone} maxLength={80} onChange={(event) => setForm((value) => ({ ...value, primary_contact_phone: event.target.value }))} /></label>
        <label>Website URL<input value={form.website_url} maxLength={2048} placeholder="https://vendor.example" onChange={(event) => setForm((value) => ({ ...value, website_url: event.target.value }))} /></label>
        <label>Account/reference<input value={form.account_reference} maxLength={160} onChange={(event) => setForm((value) => ({ ...value, account_reference: event.target.value }))} /></label>
        <label>SLA reference<input value={form.sla_reference} maxLength={160} onChange={(event) => setForm((value) => ({ ...value, sla_reference: event.target.value }))} /></label>
        <label>Contract start<input type="date" value={form.contract_start_date} onChange={(event) => setForm((value) => ({ ...value, contract_start_date: event.target.value }))} /></label>
        <label>Renewal date<input type="date" value={form.contract_renewal_date} onChange={(event) => setForm((value) => ({ ...value, contract_renewal_date: event.target.value }))} /></label>
        {canReadPlatformUsers ? <label>Owner<select value={form.owner_platform_user_id} onChange={(event) => setForm((value) => ({ ...value, owner_platform_user_id: event.target.value }))}><option value="">Unassigned</option>{activeUsers.map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}</select></label> : <div className="platform-vendors__owner-restricted"><strong>Owner linkage restricted</strong><span>PLATFORM_USERS_READ is required to view or change the Platform owner.</span></div>}
        <label className="platform-vendors__span-all">Dependency notes<textarea value={form.dependency_notes} maxLength={5000} onChange={(event) => setForm((value) => ({ ...value, dependency_notes: event.target.value }))} /></label>
        <label className="platform-vendors__span-all">Internal notes<textarea value={form.internal_notes} maxLength={5000} onChange={(event) => setForm((value) => ({ ...value, internal_notes: event.target.value }))} /></label>
      </div>
      {saveHelp ? <div className="platform-vendors__validation">{saveHelp}</div> : null}
      <div className="platform-vendors__actions"><button type="button" className="app-button app-button--primary" disabled={saveDisabled} onClick={() => { setMessage(''); setMutationError(''); saveVendor.mutate(); }}>{saveVendor.isPending ? 'Saving…' : editingId ? 'Save changes' : 'Create vendor'}</button></div>
    </section> : null}

    <section className="io-workspace-panel platform-vendors__section">
      <OperationalSectionHeader iconPath="/platform/vendors" title="Vendor evidence" description="Registry-wide summary is above; cards below are only the currently loaded page." actions={<span className="platform-vendors__page-note">Page {pageNumber} · {rows.length} loaded · {pagination?.total ?? 0} matched</span>} />
      {initialError ? <div className="platform-vendors__blocking-error"><strong>Vendor registry could not be loaded.</strong><span>{readableError(vendors.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => vendors.refetch()}>Retry</button></div> : null}
      {vendors.isLoading ? <div className="platform-vendors__loading">Loading vendor registry evidence…</div> : null}
      {vendors.data && rows.length ? <div className="platform-vendors__list">{rows.map((vendor) => <article key={vendor.id} className="platform-vendors__card">
        <div className="platform-vendors__card-header"><div><h4>{vendor.name}</h4><p>{vendor.account_reference || 'No account/reference recorded'}</p></div><div className="platform-vendors__badges"><span data-tone={statusTone(vendor.status, vendor.is_archived)}>{pretty(vendor.status)}</span><span data-tone={riskTone(vendor.risk_level)}>{pretty(vendor.risk_level)} risk</span><span>{pretty(vendor.category)}</span></div></div>
        <div className="platform-vendors__metrics-grid">
          <div><span>Contact</span><strong>{vendor.primary_contact_name || vendor.primary_contact_email || vendor.primary_contact_phone || 'Not recorded'}</strong></div>
          <div><span>Owner</span><strong>{access.platform_user_identity ? (vendor.owner_email || 'Unassigned') : 'Redacted'}</strong></div>
          <div><span>Contract start</span><strong>{dateOnly(vendor.contract_start_date) || 'Not recorded'}</strong></div>
          <div><span>Renewal</span><strong>{dateOnly(vendor.contract_renewal_date) || 'Not recorded'}</strong></div>
          <div><span>SLA reference</span><strong>{vendor.sla_reference || 'Not recorded'}</strong></div>
          <div><span>Updated</span><strong>{dateTime(vendor.updated_at)}</strong></div>
        </div>
        {(vendor.dependency_notes || vendor.internal_notes) ? <div className="platform-vendors__notes">{vendor.dependency_notes ? <div><strong>Dependency notes</strong><span>{vendor.dependency_notes}</span></div> : null}{vendor.internal_notes ? <div><strong>Internal notes</strong><span>{vendor.internal_notes}</span></div> : null}</div> : null}
        <div className="platform-vendors__card-footer"><div className="platform-vendors__source-links">{validExternalUrl(vendor.website_url) ? <a href={vendor.website_url || '#'} target="_blank" rel="noreferrer">Vendor website</a> : null}{vendor.primary_contact_email ? <a href={`mailto:${vendor.primary_contact_email}`}>Email contact</a> : null}{canReadDependencies ? <Link to={`/platform/service-dependencies?vendor_id=${encodeURIComponent(vendor.id)}`}>Service dependencies</Link> : null}{canReadAudit ? <Link to={`/platform/audit?target_type=platform_vendor&target_id=${encodeURIComponent(vendor.id)}`}>Audit history</Link> : null}</div>{canWrite && !vendor.is_archived ? <div className="platform-vendors__actions"><button type="button" className="app-button app-button--secondary" onClick={() => startEdit(vendor)} disabled={mutating}>Edit</button><button type="button" className="app-button app-button--danger" onClick={() => { if (window.confirm(`Archive vendor ${vendor.name}? Archived vendors become immutable.`)) archiveVendor.mutate(vendor); }} disabled={mutating}>Archive</button></div> : vendor.is_archived ? <span className="platform-vendors__immutable">Archived · immutable</span> : null}</div>
      </article>)}</div> : vendors.data ? <div className="platform-vendors__empty"><strong>No vendor records matched.</strong><span>No application vendor evidence matched the current filters. This does not prove that no external vendor relationship exists.</span></div> : null}
      {vendors.data ? <div className="platform-vendors__pagination"><button type="button" className="app-button app-button--secondary" onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))} disabled={offset === 0 || vendors.isFetching}>Previous</button><span>Page {pageNumber} · up to {PAGE_SIZE} vendors</span><button type="button" className="app-button app-button--secondary" onClick={() => setOffset((value) => value + PAGE_SIZE)} disabled={!pagination?.has_more || vendors.isFetching}>Next</button></div> : null}
    </section>

    <section className="io-workspace-panel platform-vendors__section"><OperationalSectionHeader iconPath="/platform/vendors" title="Supporting operations" description="Only destinations allowed by the current Platform permission snapshot are shown." /><div className="platform-vendors__supporting-links">{canReadDependencies ? <Link to="/platform/service-dependencies">Service dependencies</Link> : null}{canReadDependencies ? <Link to="/platform/integration-monitoring?source=service_dependencies">Integration monitoring</Link> : null}{canReadCompliance ? <Link to="/platform/legal-compliance-reporting">Legal compliance reporting</Link> : null}{canReadPlatformUsers ? <Link to="/platform/users">Platform users</Link> : null}{canReadAudit ? <Link to="/platform/audit">Platform audit</Link> : null}</div></section>
  </div>;
}
