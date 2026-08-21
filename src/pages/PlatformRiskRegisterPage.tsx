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
import './PlatformRiskRegisterPage.css';

type Tenant = { id: string; name: string };
type PlatformUser = { id: string; email: string; name?: string | null; is_active?: boolean };
type Pagination = { limit: number; offset: number; total: number; has_more: boolean };
type EvidenceAccess = { tenant_identity: boolean; platform_user_identity: boolean };
type EvidenceContract = {
  application_registry_only: boolean;
  likelihood_and_impact_are_operator_recorded: boolean;
  severity_score_is_derived_from_recorded_levels: boolean;
  status_is_application_workflow_state: boolean;
  accepted_status_does_not_prove_external_acceptance: boolean;
  closed_status_does_not_prove_external_risk_elimination: boolean;
  tenant_linkage_is_application_context_only: boolean;
};
type Risk = {
  id: string;
  tenant_id?: string | null;
  tenant_name?: string | null;
  tenant_present?: boolean;
  title: string;
  description?: string | null;
  category: string;
  status: string;
  likelihood: string;
  impact: string;
  severity_score: number;
  owner_platform_user_id?: string | null;
  owner_email?: string | null;
  owner_present?: boolean;
  mitigation_plan?: string | null;
  contingency_plan?: string | null;
  review_due_at?: string | null;
  closed_at?: string | null;
  updated_at: string;
  updated_by_email?: string | null;
};
type RisksResponse = {
  risks: Risk[];
  summary: { total: number; open: number; high_attention: number; review_due: number; by_status: Record<string, number>; by_category: Record<string, number> };
  pagination: Pagination;
  evidence_access: EvidenceAccess;
  evidence_contract: EvidenceContract;
  categories: string[];
  statuses: string[];
  levels: string[];
};
type RiskForm = {
  tenant_id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  likelihood: string;
  impact: string;
  owner_platform_user_id: string;
  mitigation_plan: string;
  contingency_plan: string;
  review_due_at: string;
};

const PAGE_SIZE = 50;
const CATEGORY_OPTIONS = ['operational', 'security', 'billing', 'vendor', 'compliance', 'data', 'release', 'support', 'other'];
const STATUS_OPTIONS = ['open', 'monitoring', 'mitigating', 'accepted', 'closed', 'cancelled'];
const LEVEL_OPTIONS = ['low', 'medium', 'high', 'critical'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const terminalStatus = (status?: string | null) => status === 'closed' || status === 'cancelled';
const emptyForm = (): RiskForm => ({ tenant_id: '', title: '', description: '', category: 'operational', status: 'open', likelihood: 'medium', impact: 'medium', owner_platform_user_id: '', mitigation_plan: '', contingency_plan: '', review_due_at: '' });

function readableError(error: unknown) { return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error'; }
function clean(value: string) { const trimmed = value.trim(); return trimmed || null; }
function pretty(value?: string | null) { return value ? value.replaceAll('_', ' ') : 'Not recorded'; }
function dateTime(value?: string | null) { if (!value) return 'Not recorded'; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? 'Not recorded' : parsed.toLocaleString(); }
function toLocalDateTimeInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function toForm(row: Risk): RiskForm {
  return {
    tenant_id: row.tenant_id || '', title: row.title || '', description: row.description || '', category: row.category || 'operational', status: row.status || 'open',
    likelihood: row.likelihood || 'medium', impact: row.impact || 'medium', owner_platform_user_id: row.owner_platform_user_id || '', mitigation_plan: row.mitigation_plan || '',
    contingency_plan: row.contingency_plan || '', review_due_at: toLocalDateTimeInput(row.review_due_at)
  };
}
function statusTone(value?: string) { if (value === 'closed') return 'good'; if (value === 'cancelled') return 'neutral'; if (value === 'mitigating' || value === 'monitoring' || value === 'accepted') return 'warn'; return 'neutral'; }
function severityTone(score: number) { if (score >= 12) return 'danger'; if (score >= 9) return 'warn'; return score <= 4 ? 'good' : 'neutral'; }

export default function PlatformRiskRegisterPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RISKS_WRITE);
  const canReadTenants = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ);
  const canReadUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canReadVendors = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_VENDORS_READ);
  const canReadDependencies = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ);
  const canReadIncidents = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ);
  const canReadReleases = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RELEASES_READ);
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);

  const requestedStatus = searchParams.get('status') || '';
  const requestedCategory = searchParams.get('category') || '';
  const requestedTenantId = searchParams.get('tenant_id') || '';
  const requestedOwnerId = searchParams.get('owner_platform_user_id') || '';
  const requestedSearch = searchParams.get('search') || '';
  const requestedDueOnly = searchParams.get('due_only') || '';
  const status = STATUS_OPTIONS.includes(requestedStatus) ? requestedStatus : '';
  const category = CATEGORY_OPTIONS.includes(requestedCategory) ? requestedCategory : '';
  const tenantId = requestedTenantId && canReadTenants && UUID_RE.test(requestedTenantId) ? requestedTenantId : '';
  const ownerId = requestedOwnerId && canReadUsers && UUID_RE.test(requestedOwnerId) ? requestedOwnerId : '';
  const search = requestedSearch.length <= 200 ? requestedSearch : '';
  const dueOnly = requestedDueOnly === 'true';
  const invalidFilters = Boolean(
    (requestedStatus && !status) || (requestedCategory && !category) || (requestedTenantId && !tenantId) ||
    (requestedOwnerId && !ownerId) || (requestedSearch && !search) || (requestedDueOnly && !['true', 'false'].includes(requestedDueOnly))
  );

  const [offset, setOffset] = useState(0);
  const [form, setForm] = useState<RiskForm>(() => emptyForm());
  const [editingId, setEditingId] = useState('');
  const [message, setMessage] = useState('');
  const [mutationError, setMutationError] = useState('');
  const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>({});

  useEffect(() => { setOffset(0); }, [status, category, tenantId, ownerId, search, dueOnly, invalidFilters]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (status) params.set('status', status);
    if (category) params.set('category', category);
    if (tenantId) params.set('tenant_id', tenantId);
    if (ownerId) params.set('owner_platform_user_id', ownerId);
    if (search.trim()) params.set('search', search.trim());
    if (dueOnly) params.set('due_only', 'true');
    return params.toString();
  }, [status, category, tenantId, ownerId, search, dueOnly, offset]);

  const risks = useQuery({
    queryKey: ['platform', 'risk-register', status, category, tenantId, ownerId, search, dueOnly, offset],
    queryFn: () => platformApiRequest<RisksResponse>(`/platform/risk-register?${queryString}`),
    enabled: !invalidFilters, refetchOnWindowFocus: false, staleTime: 30_000
  });
  const tenants = useQuery({
    queryKey: ['platform', 'risk-tenants'], queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants'),
    enabled: canReadTenants, refetchOnWindowFocus: false, staleTime: 30_000
  });
  const users = useQuery({
    queryKey: ['platform', 'risk-users'], queryFn: () => platformApiRequest<PlatformUser[]>('/platform/users'),
    enabled: canReadUsers, refetchOnWindowFocus: false, staleTime: 30_000
  });

  const updateFilter = (key: string, value: string | boolean) => {
    const next = new URLSearchParams(searchParams);
    if (value === '' || value === false) next.delete(key); else next.set(key, String(value));
    setSearchParams(next, { replace: true });
  };
  const clearFilters = () => { setSearchParams({}, { replace: true }); setOffset(0); };

  const payloadFromForm = () => {
    const body: Record<string, unknown> = {
      title: form.title.trim(), description: clean(form.description), category: form.category,
      likelihood: form.likelihood, impact: form.impact, mitigation_plan: clean(form.mitigation_plan),
      contingency_plan: clean(form.contingency_plan), review_due_at: form.review_due_at ? new Date(form.review_due_at).toISOString() : null
    };
    if (!editingId) body.status = form.status;
    if (canReadTenants) body.tenant_id = clean(form.tenant_id);
    if (canReadUsers) body.owner_platform_user_id = clean(form.owner_platform_user_id);
    return body;
  };

  const saveRisk = useMutation({
    mutationFn: () => platformApiRequest(editingId ? `/platform/risk-register/${editingId}` : '/platform/risk-register', { method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(payloadFromForm()) }),
    onSuccess: async () => {
      setMessage(editingId ? 'Risk details saved.' : 'Risk created.'); setMutationError(''); setEditingId(''); setForm(emptyForm());
      await queryClient.invalidateQueries({ queryKey: ['platform', 'risk-register'] });
    },
    onError: (error) => { setMessage(''); setMutationError(readableError(error)); }
  });
  const transitionRisk = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: string }) => platformApiRequest(`/platform/risk-register/${id}/status`, { method: 'POST', body: JSON.stringify({ status: nextStatus }) }),
    onSuccess: async (_result, variables) => {
      setMessage(`Risk status changed to ${pretty(variables.nextStatus)}.`); setMutationError('');
      setStatusDrafts((current) => { const next = { ...current }; delete next[variables.id]; return next; });
      if (editingId === variables.id && terminalStatus(variables.nextStatus)) { setEditingId(''); setForm(emptyForm()); }
      await queryClient.invalidateQueries({ queryKey: ['platform', 'risk-register'] });
    },
    onError: (error) => { setMessage(''); setMutationError(readableError(error)); }
  });

  const response = risks.data;
  const summary = response?.summary;
  const pagination = response?.pagination;
  const categories = response?.categories || CATEGORY_OPTIONS;
  const statuses = response?.statuses || STATUS_OPTIONS;
  const levels = response?.levels || LEVEL_OPTIONS;
  const blockingError = risks.isError && !response;
  const staleWarning = risks.isError && Boolean(response);
  const refreshBusy = risks.isFetching || tenants.isFetching || users.isFetching;
  const pageNumber = Math.floor(offset / PAGE_SIZE) + 1;
  const invalidReviewDate = Boolean(form.review_due_at && Number.isNaN(new Date(form.review_due_at).getTime()));
  const saveDisabled = saveRisk.isPending || !form.title.trim() || invalidReviewDate;
  const accessLabel = response?.evidence_access?.tenant_identity && response?.evidence_access?.platform_user_identity ? 'Full identity evidence' : 'Partial identity evidence';

  const startEdit = (risk: Risk) => {
    if (terminalStatus(risk.status)) return;
    setMessage(''); setMutationError(''); setEditingId(risk.id); setForm(toForm(risk)); scrollToFormSection('platform-risk-register-form');
  };

  return <div className="platform-risk-register">
    <OperationalWorkspaceHero
      iconPath="/platform/risk-register" eyebrow="Platform operations" title="Risk register"
      description="Maintain the application risk registry, review cadence, mitigation context and explicit workflow status without presenting internal records as proof of external risk outcomes."
      meta={<><OperationalWorkspaceMetaPill>Registry-wide filtered summary</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>{accessLabel}</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>50 rows per page</OperationalWorkspaceMetaPill></>}
      aside={<div className="platform-risk-register__hero-aside"><OperationalWorkspaceStatus value={summary?.high_attention ?? '—'} label="High-attention risks" /><div className="platform-risk-register__refresh-block"><button type="button" className="app-button app-button--secondary" disabled={refreshBusy || invalidFilters} onClick={() => { setMessage(''); setMutationError(''); void risks.refetch(); if (canReadTenants) void tenants.refetch(); if (canReadUsers) void users.refetch(); }}>{refreshBusy ? 'Refreshing…' : 'Refresh'}</button><span>{risks.dataUpdatedAt ? `Last successful snapshot ${new Date(risks.dataUpdatedAt).toLocaleString()}` : 'No successful snapshot yet'}</span></div></div>}
    />

    {invalidFilters ? <div className="platform-risk-register__warning"><strong>Invalid or forbidden URL filter.</strong><span>Tenant and owner filters require their matching source permissions. Clear the filters to load the registry safely.</span><button type="button" className="app-button app-button--secondary" onClick={clearFilters}>Clear filters</button></div> : null}
    {staleWarning ? <div className="platform-risk-register__warning"><strong>Showing the last successful snapshot.</strong><span>{readableError(risks.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => void risks.refetch()} disabled={risks.isFetching}>Retry</button></div> : null}
    {message ? <div className="platform-risk-register__success"><span>{message}</span><button type="button" className="app-button app-button--ghost" onClick={() => setMessage('')}>Dismiss</button></div> : null}
    {mutationError ? <div className="platform-risk-register__warning"><strong>Action failed.</strong><span>{mutationError}</span><button type="button" className="app-button app-button--ghost" onClick={() => setMutationError('')}>Dismiss</button></div> : null}

    <OperationalWorkspaceStats ariaLabel="Risk register summary">
      <OperationalWorkspaceStatCard iconPath="/platform/risk-register" label="Filtered risks" value={summary?.total ?? 0} helper="Across the full filtered registry, not only this page." />
      <OperationalWorkspaceStatCard iconPath="/platform/risk-register" label="Active / tracked" value={summary?.open ?? 0} helper="Everything except closed or cancelled." tone="slate" />
      <OperationalWorkspaceStatCard iconPath="/platform/risk-register" label="High attention" value={summary?.high_attention ?? 0} helper="Derived severity score 12–16 while active." tone={(summary?.high_attention || 0) > 0 ? 'danger' : 'good'} />
      <OperationalWorkspaceStatCard iconPath="/platform/risk-register" label="Review due" value={summary?.review_due ?? 0} helper="Application review dates currently due or overdue." tone={(summary?.review_due || 0) > 0 ? 'warn' : 'good'} />
    </OperationalWorkspaceStats>

    <section className="io-workspace-panel platform-risk-register__section">
      <OperationalSectionHeader iconPath="/platform/risk-register" title="Risk evidence boundary" description="These fields are registry evidence, not an external assurance system." />
      <div className="platform-risk-register__truth-note"><strong>Application-maintained evidence only.</strong> Likelihood and impact are operator-recorded inputs; severity is derived from those values. “Accepted” does not prove external/customer/legal acceptance, and “Closed” does not prove the underlying real-world risk was eliminated. Tenant linkage is application context, not external proof.</div>
      {response && (!response.evidence_access.tenant_identity || !response.evidence_access.platform_user_identity) ? <div className="platform-risk-register__restricted"><strong>Some identity evidence is intentionally omitted.</strong><span>{!response.evidence_access.tenant_identity ? 'Tenant identity is hidden without TENANTS_READ. ' : ''}{!response.evidence_access.platform_user_identity ? 'Platform owner/actor identity is hidden without PLATFORM_USERS_READ.' : ''}</span></div> : null}
    </section>

    <section className="io-workspace-panel platform-risk-register__section">
      <OperationalSectionHeader iconPath="/platform/risk-register" title="Filters" description="Filters persist in the URL. Protected identity filters are available only with their source permissions." actions={<button type="button" className="app-button app-button--ghost" onClick={clearFilters}>Reset</button>} />
      <div className="platform-risk-register__filter-grid">
        {canReadTenants ? <label>Tenant<select value={tenantId} onChange={(event) => updateFilter('tenant_id', event.target.value)}><option value="">All permitted tenants</option>{(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label> : <div className="platform-risk-register__filter-restricted"><strong>Tenant filter restricted</strong><span>TENANTS_READ required.</span></div>}
        {canReadUsers ? <label>Owner<select value={ownerId} onChange={(event) => updateFilter('owner_platform_user_id', event.target.value)}><option value="">All permitted owners</option>{(users.data || []).map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}</select></label> : <div className="platform-risk-register__filter-restricted"><strong>Owner filter restricted</strong><span>PLATFORM_USERS_READ required.</span></div>}
        <label>Status<select value={status} onChange={(event) => updateFilter('status', event.target.value)}><option value="">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label>Category<select value={category} onChange={(event) => updateFilter('category', event.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label className="platform-risk-register__search">Search<input value={search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Title, description, plans, permitted identities" /></label>
        <label className="platform-risk-register__checkbox"><input type="checkbox" checked={dueOnly} onChange={(event) => updateFilter('due_only', event.target.checked)} /> Review due only</label>
      </div>
    </section>

    {canWrite ? <section id="platform-risk-register-form" className="io-workspace-panel platform-risk-register__section">
      <OperationalSectionHeader iconPath="/platform/risk-register" title={editingId ? 'Edit risk details' : 'Create risk'} description={editingId ? 'Status is intentionally changed through the explicit status action, not through ordinary detail edits.' : 'Register application risk evidence. New entries may start in the appropriate workflow state.'} actions={editingId ? <button type="button" className="app-button app-button--ghost" onClick={() => { setEditingId(''); setForm(emptyForm()); setMutationError(''); }}>Cancel edit</button> : undefined} />
      <div className="platform-risk-register__form-grid">
        <label>Risk title<input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} maxLength={240} /></label>
        <label>Category<select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>{categories.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        {!editingId ? <label>Initial status<select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>{statuses.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label> : <div className="platform-risk-register__form-restricted"><strong>Status handled separately</strong><span>Use the status control on the risk card so the transition is audited independently.</span></div>}
        <label>Review due<input type="datetime-local" value={form.review_due_at} onChange={(event) => setForm((current) => ({ ...current, review_due_at: event.target.value }))} /></label>
        <label>Likelihood<select value={form.likelihood} onChange={(event) => setForm((current) => ({ ...current, likelihood: event.target.value }))}>{levels.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label>Impact<select value={form.impact} onChange={(event) => setForm((current) => ({ ...current, impact: event.target.value }))}>{levels.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        {canReadTenants ? <label>Tenant<select value={form.tenant_id} onChange={(event) => setForm((current) => ({ ...current, tenant_id: event.target.value }))}><option value="">Platform-wide risk</option>{(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label> : <div className="platform-risk-register__form-restricted"><strong>Tenant linkage restricted</strong><span>Existing linkage is preserved. TENANTS_READ is required to create/change it.</span></div>}
        {canReadUsers ? <label>Owner<select value={form.owner_platform_user_id} onChange={(event) => setForm((current) => ({ ...current, owner_platform_user_id: event.target.value }))}><option value="">No owner</option>{(users.data || []).filter((user) => user.is_active !== false).map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}</select></label> : <div className="platform-risk-register__form-restricted"><strong>Owner linkage restricted</strong><span>Existing owner is preserved. PLATFORM_USERS_READ is required to create/change it.</span></div>}
        <label className="platform-risk-register__span-all">Description<textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} maxLength={5000} placeholder="Describe the application-recorded risk and affected context." /></label>
        <label className="platform-risk-register__span-all">Mitigation plan<textarea value={form.mitigation_plan} onChange={(event) => setForm((current) => ({ ...current, mitigation_plan: event.target.value }))} maxLength={5000} /></label>
        <label className="platform-risk-register__span-all">Contingency plan<textarea value={form.contingency_plan} onChange={(event) => setForm((current) => ({ ...current, contingency_plan: event.target.value }))} maxLength={5000} /></label>
      </div>
      {!form.title.trim() ? <div className="platform-risk-register__validation">Enter a risk title before saving.</div> : invalidReviewDate ? <div className="platform-risk-register__validation">Review due must be a valid local date and time.</div> : null}
      <div className="platform-risk-register__actions"><button type="button" className="app-button app-button--primary" disabled={saveDisabled} onClick={() => saveRisk.mutate()}>{saveRisk.isPending ? 'Saving…' : editingId ? 'Save details' : 'Create risk'}</button></div>
    </section> : null}

    <section className="io-workspace-panel platform-risk-register__section">
      <OperationalSectionHeader iconPath="/platform/risk-register" title="Risk registry" description="The order prioritizes active high-severity and due-review records. Closed/cancelled detail records are immutable until explicitly reopened." />
      {blockingError ? <div className="platform-risk-register__blocking-error"><strong>Risk register could not be loaded.</strong><span>{readableError(risks.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => void risks.refetch()} disabled={risks.isFetching}>Retry</button></div> : null}
      {!blockingError && risks.isLoading ? <div className="platform-risk-register__loading">Loading risk evidence…</div> : null}
      {!blockingError && response && !response.risks.length ? <div className="platform-risk-register__empty"><strong>No risks match the current filters.</strong><span>This means no matching application risk records were found; it does not prove that no external or real-world risk exists.</span></div> : null}
      {response?.risks.length ? <div className="platform-risk-register__list">{response.risks.map((risk) => {
        const draftStatus = statusDrafts[risk.id] ?? risk.status;
        return <article className="platform-risk-register__card" key={risk.id}>
          <div className="platform-risk-register__card-header"><div><h4>{risk.title}</h4><p>{risk.description || 'No application description recorded.'}</p></div><div className="platform-risk-register__badges"><span data-tone={statusTone(risk.status)}>{pretty(risk.status)}</span><span data-tone={severityTone(risk.severity_score)}>Severity {risk.severity_score}</span><span>{pretty(risk.category)}</span></div></div>
          <div className="platform-risk-register__metrics-grid">
            <div><span>Likelihood / impact</span><strong>{pretty(risk.likelihood)} / {pretty(risk.impact)}</strong></div>
            <div><span>Tenant context</span><strong>{risk.tenant_name || (risk.tenant_present ? 'Tenant-linked · identity restricted' : 'Platform-wide')}</strong></div>
            <div><span>Owner</span><strong>{risk.owner_email || (risk.owner_present ? 'Assigned · identity restricted' : 'Not assigned')}</strong></div>
            <div><span>Review due</span><strong>{dateTime(risk.review_due_at)}</strong></div>
            <div><span>Updated</span><strong>{dateTime(risk.updated_at)}</strong></div>
            <div><span>Updated by</span><strong>{risk.updated_by_email || 'Identity unavailable / restricted'}</strong></div>
          </div>
          <div className="platform-risk-register__plans"><div><strong>Mitigation</strong><span>{risk.mitigation_plan || 'Not recorded'}</span></div><div><strong>Contingency</strong><span>{risk.contingency_plan || 'Not recorded'}</span></div></div>
          <div className="platform-risk-register__card-footer">
            <div className="platform-risk-register__source-links">{canReadTenants && risk.tenant_id ? <Link to={`/platform/tenants?tenant_id=${encodeURIComponent(risk.tenant_id)}`}>Tenant record</Link> : null}{canReadAudit ? <Link to="/platform/audit">Platform audit</Link> : null}</div>
            {canWrite ? <div className="platform-risk-register__actions">{!terminalStatus(risk.status) ? <button type="button" className="app-button app-button--secondary" onClick={() => startEdit(risk)}>Edit details</button> : <span className="platform-risk-register__immutable">{pretty(risk.status)} · details immutable until reopened</span>}<select aria-label={`Next status for ${risk.title}`} value={draftStatus} onChange={(event) => setStatusDrafts((current) => ({ ...current, [risk.id]: event.target.value }))}>{statuses.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select><button type="button" className="app-button app-button--secondary" disabled={transitionRisk.isPending || draftStatus === risk.status} onClick={() => transitionRisk.mutate({ id: risk.id, nextStatus: draftStatus })}>{transitionRisk.isPending ? 'Changing…' : terminalStatus(risk.status) && !terminalStatus(draftStatus) ? 'Reopen' : 'Apply status'}</button></div> : null}
          </div>
        </article>;
      })}</div> : null}
      {response ? <div className="platform-risk-register__pagination"><button type="button" className="app-button app-button--secondary" onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))} disabled={offset === 0 || risks.isFetching}>Previous</button><span>Page {pageNumber} · up to {PAGE_SIZE} risks · {pagination?.total ?? 0} filtered total</span><button type="button" className="app-button app-button--secondary" onClick={() => setOffset((value) => value + PAGE_SIZE)} disabled={!pagination?.has_more || risks.isFetching}>Next</button></div> : null}
    </section>

    <section className="io-workspace-panel platform-risk-register__section"><OperationalSectionHeader iconPath="/platform/risk-register" title="Supporting operations" description="Only destinations allowed by the current Platform permission snapshot are shown." /><div className="platform-risk-register__supporting-links">{canReadTenants ? <Link to="/platform/tenants">Tenants</Link> : null}{canReadVendors ? <Link to="/platform/vendors">Vendors</Link> : null}{canReadDependencies ? <Link to="/platform/service-dependencies">Service dependencies</Link> : null}{canReadIncidents ? <Link to="/platform/incidents">Incidents</Link> : null}{canReadReleases ? <Link to="/platform/releases">Releases</Link> : null}{canReadAudit ? <Link to="/platform/audit">Platform audit</Link> : null}</div></section>
  </div>;
}
