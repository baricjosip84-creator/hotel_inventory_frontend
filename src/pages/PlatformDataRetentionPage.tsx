import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '../lib/platformPermissions';
import { scrollToFormSection } from '../lib/scrollToForm';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './PlatformDataRetentionPage.css';

type TenantRow = { id: string; name: string; status?: string; plan_code?: string };
type RetentionRow = {
  tenant_id: string | null;
  tenant_name: string | null;
  tenant_status: string | null;
  write_locked: boolean | null;
  tenant_present: boolean;
  retention_policy: string;
  retain_until: string | null;
  legal_hold: boolean;
  legal_hold_reason: string | null;
  legal_hold_set_at: string | null;
  legal_hold_set_by_platform_user_id: string | null;
  legal_hold_set_by_email: string | null;
  legal_hold_set_by_present: boolean;
  purge_after_offboarding: boolean;
  notes: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  retention_due: boolean;
  purge_blocked: boolean;
};
type RetentionSummary = { total: number; legal_holds: number; due: number; purge_after_offboarding: number; purge_blocked: number; write_locked: number | null };
type RetentionResponse = {
  records: RetentionRow[];
  summary: RetentionSummary;
  pagination: { limit: number; offset: number; total: number; has_more: boolean };
  available_sources: string[];
  omitted_sources: string[];
  evidence_access: { tenant_identity: boolean; platform_user_identity: boolean };
  evidence_complete: boolean;
  tenant_registry_complete: boolean;
  evidence_contract: {
    application_policy_records_only: boolean;
    retain_until_due_does_not_prove_deletion: boolean;
    purge_after_offboarding_is_intent_not_execution: boolean;
    legal_hold_is_operator_recorded_application_evidence: boolean;
    purge_execution_implemented_by_this_surface: boolean;
    no_application_rows_do_not_prove_external_or_backup_copies_absent: boolean;
    does_not_prove_backup_retention_or_restore_capability: boolean;
  };
  generated_at: string;
};
type RetentionForm = { retention_policy: string; retain_until: string; purge_after_offboarding: boolean; notes: string };

const policies = ['standard', 'extended', 'contractual', 'delete_after_offboarding', 'custom'];
const PAGE_SIZE = 50;
function readableError(error: unknown) { return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error'; }
function formatDate(value?: string | null) { if (!value) return 'Not set'; const d = new Date(value); return Number.isNaN(d.getTime()) ? 'Not set' : d.toLocaleDateString(); }
function formatDateTime(value?: string | null) { if (!value) return 'Not recorded'; const d = new Date(value); return Number.isNaN(d.getTime()) ? 'Not recorded' : d.toLocaleString(); }
function pretty(value?: string | null) { return value ? value.replaceAll('_', ' ') : 'Not recorded'; }
function formFromRow(row: RetentionRow): RetentionForm { return { retention_policy: row.retention_policy || 'standard', retain_until: row.retain_until ? row.retain_until.slice(0,10) : '', purge_after_offboarding:Boolean(row.purge_after_offboarding), notes:row.notes || '' }; }
function normalizeForm(form: RetentionForm) { return { ...form, purge_after_offboarding:Boolean(form.purge_after_offboarding), notes:form.notes.trim() }; }
function validDateInput(value: string) { return !value || !Number.isNaN(new Date(`${value}T00:00:00`).getTime()); }
function metric(value: number | null | undefined) { return value === null || value === undefined ? 'Restricted' : value; }

export default function PlatformDataRetentionPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const canReadTenants = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ);
  const canReadPlatformUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canWrite = canReadTenants && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DATA_RETENTION_WRITE);
  const canReadTenantExports = canReadTenants && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT);
  const canReadCompliance = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_COMPLIANCE_READ);
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);

  const requestedTenantId = searchParams.get('tenant_id') || '';
  const tenantId = canReadTenants ? requestedTenantId : '';
  const legalHold = searchParams.get('legal_hold') || '';
  const dueOnly = searchParams.get('due_only') === 'true';
  const search = searchParams.get('search') || '';
  const offset = Math.max(0, Number(searchParams.get('offset') || 0) || 0);
  const [editing, setEditing] = useState<RetentionRow | null>(null);
  const [form, setForm] = useState<RetentionForm>({ retention_policy:'standard', retain_until:'', purge_after_offboarding:false, notes:'' });
  const [message, setMessage] = useState('');

  const tenantsQuery = useQuery({
    queryKey:['platform','tenants','data-retention-directory'],
    queryFn:()=>platformApiRequest<TenantRow[]>('/platform/tenants'),
    enabled:canReadTenants,
    refetchOnWindowFocus:false,
    staleTime:30_000
  });

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (tenantId) p.set('tenant_id',tenantId);
    if (legalHold) p.set('legal_hold',legalHold);
    if (dueOnly) p.set('due_only','true');
    if (search.trim()) p.set('search',search.trim());
    p.set('limit',String(PAGE_SIZE)); p.set('offset',String(offset));
    return p.toString();
  },[tenantId,legalHold,dueOnly,search,offset]);

  const retentionQuery = useQuery({
    queryKey:['platform','data-retention',params],
    queryFn:()=>platformApiRequest<RetentionResponse>(`/platform/data-retention?${params}`),
    refetchOnWindowFocus:false,
    staleTime:15_000,
    placeholderData:(previous)=>previous
  });
  const data = retentionQuery.data;
  const updateParams = (patch: Record<string,string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key,value] of Object.entries(patch)) { if (value) next.set(key,value); else next.delete(key); }
    if (!Object.prototype.hasOwnProperty.call(patch,'offset')) next.delete('offset');
    setSearchParams(next,{replace:true});
    setMessage('');
  };

  const refresh = async () => {
    if (canReadTenants) await tenantsQuery.refetch();
    await retentionQuery.refetch();
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editing?.tenant_id) throw new Error('Tenant identity is required to edit retention policy.');
      const current = normalizeForm(form);
      return platformApiRequest<RetentionRow>(`/platform/data-retention/${encodeURIComponent(editing.tenant_id)}`,{method:'PATCH',body:JSON.stringify({retention_policy:current.retention_policy,retain_until:current.retain_until || null,purge_after_offboarding:current.purge_after_offboarding,notes:current.notes || null})});
    },
    onSuccess:async()=>{ const name=editing?.tenant_name || 'tenant'; setEditing(null); setMessage(`Retention policy updated for ${name}.`); await queryClient.invalidateQueries({queryKey:['platform','data-retention']}); }
  });

  const setHoldMutation = useMutation({
    mutationFn:({tenantId:targetTenantId,reason}:{tenantId:string;reason:string})=>platformApiRequest<RetentionRow>(`/platform/data-retention/${encodeURIComponent(targetTenantId)}/set-legal-hold`,{method:'POST',body:JSON.stringify({reason})}),
    onSuccess:async()=>{ setMessage('Legal hold set with an audited reason.'); setEditing(null); await queryClient.invalidateQueries({queryKey:['platform','data-retention']}); }
  });

  const clearHoldMutation = useMutation({
    mutationFn:({tenantId:targetTenantId,reason}:{tenantId:string;reason:string})=>platformApiRequest<RetentionRow>(`/platform/data-retention/${encodeURIComponent(targetTenantId)}/clear-legal-hold`,{method:'POST',body:JSON.stringify({reason})}),
    onSuccess:async()=>{ setMessage('Legal hold cleared with an audited reason.'); setEditing(null); await queryClient.invalidateQueries({queryKey:['platform','data-retention']}); }
  });

  const startEdit = (row:RetentionRow) => { if (!row.tenant_id) return; setEditing(row); setForm(formFromRow(row)); setMessage(''); saveMutation.reset(); setHoldMutation.reset(); clearHoldMutation.reset(); scrollToFormSection('platform-data-retention-form'); };
  const setLegalHold = (row:RetentionRow) => {
    if (!row.tenant_id) return;
    if (!window.confirm(`Set a legal hold for ${row.tenant_name || 'this tenant'}? This records an application-level hold; it does not prove an external legal obligation exists.`)) return;
    const reason=(window.prompt('Reason for setting the legal hold?') || '').trim();
    if (!reason) { setMessage(''); return; }
    setHoldMutation.mutate({tenantId:row.tenant_id,reason});
  };

  const clearLegalHold = (row:RetentionRow) => {
    if (!row.tenant_id) return;
    if (!window.confirm(`Clear legal hold for ${row.tenant_name || 'this tenant'}? This records an application-level hold release; it does not prove any external legal obligation ended.`)) return;
    const reason=(window.prompt('Reason for clearing the legal hold?') || '').trim();
    if (!reason) { setMessage(''); return; }
    clearHoldMutation.mutate({tenantId:row.tenant_id,reason});
  };

  const currentForm = normalizeForm(form);
  const originalForm = editing ? normalizeForm(formFromRow(editing)) : null;
  const formChanged = Boolean(originalForm && JSON.stringify(currentForm)!==JSON.stringify(originalForm));
  const retainUntilInvalid = !validDateInput(currentForm.retain_until);
  const lifecyclePending = setHoldMutation.isPending || clearHoldMutation.isPending;
  const saveDisabled = !editing || !formChanged || retainUntilInvalid || saveMutation.isPending || lifecyclePending;
  const mutationError = saveMutation.error || setHoldMutation.error || clearHoldMutation.error;
  const pageStart = data?.pagination.total ? data.pagination.offset + 1 : 0;
  const pageEnd = data ? Math.min(data.pagination.offset + data.records.length,data.pagination.total) : 0;

  return <div className="platform-data-retention">
    <OperationalWorkspaceHero
      iconPath="/platform/data-retention"
      eyebrow="Platform · Data governance"
      title="Data retention"
      description="Manage application-level tenant retention policy, legal holds, and purge-after-offboarding intent without presenting configuration as proof that data was deleted."
      meta={<><OperationalWorkspaceMetaPill>Policy records, not purge proof</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>Legal-hold changes are audited</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>{canReadTenants?'Tenant registry available':'Tenant identity restricted'}</OperationalWorkspaceMetaPill></>}
      aside={<div className="platform-data-retention__hero-aside"><OperationalWorkspaceStatus value={data ? (data.evidence_complete?'Complete':'Partial evidence') : 'Loading'} label={data?.generated_at?`snapshot ${formatDateTime(data.generated_at)}`:'snapshot pending'} /><button type="button" className="app-button app-button--secondary" disabled={retentionQuery.isFetching || tenantsQuery.isFetching} onClick={()=>void refresh()}>{retentionQuery.isFetching || tenantsQuery.isFetching?'Refreshing…':'Refresh'}</button></div>}
    />

    {message ? <div className="platform-data-retention__success"><span>{message}</span><button type="button" className="app-button app-button--secondary" onClick={()=>setMessage('')}>Dismiss</button></div> : null}
    {mutationError ? <div className="platform-data-retention__warning"><strong>Retention change failed.</strong><span>{readableError(mutationError)}</span></div> : null}
    {retentionQuery.isError && data ? <div className="platform-data-retention__warning"><strong>Showing the last successful snapshot.</strong><span>{readableError(retentionQuery.error)}</span><button type="button" className="app-button app-button--secondary" onClick={()=>void retentionQuery.refetch()}>Retry</button></div> : null}
    {requestedTenantId && !canReadTenants ? <div className="platform-data-retention__warning"><strong>Tenant filter omitted.</strong><span>TENANTS_READ is required to select or identify a tenant. The retention registry remains visible only at the permitted evidence level.</span></div> : null}
    {data && !data.evidence_complete ? <div className="platform-data-retention__warning"><strong>Evidence is partial.</strong><span>Restricted source families: {data.omitted_sources.join(', ')}. Restricted values are not converted to zero or “healthy”.</span></div> : null}

    <OperationalWorkspaceStats ariaLabel="Data retention registry summary">
      <OperationalWorkspaceStatCard iconPath="/platform/data-retention" label={data?.tenant_registry_complete?'Tenants in scope':'Configured records'} value={data ? metric(data.summary.total) : '—'} helper={data ? (data.tenant_registry_complete?'Registry-wide filtered total':'Tenant registry is restricted') : 'Loading registry summary'} />
      <OperationalWorkspaceStatCard iconPath="/platform/data-retention" label="Legal holds" value={data ? metric(data.summary.legal_holds) : '—'} tone={(data?.summary.legal_holds || 0)>0?'danger':'default'} helper="Application-recorded active holds" />
      <OperationalWorkspaceStatCard iconPath="/platform/data-retention" label="Retention due" value={data ? metric(data.summary.due) : '—'} tone={(data?.summary.due || 0)>0?'warn':'default'} helper="Due date reached; deletion not proven" />
      <OperationalWorkspaceStatCard iconPath="/platform/data-retention" label="Offboarding purge intent" value={data ? metric(data.summary.purge_after_offboarding) : '—'} helper="Configuration only" />
      <OperationalWorkspaceStatCard iconPath="/platform/data-retention" label="Purge blocked" value={data ? metric(data.summary.purge_blocked) : '—'} tone={(data?.summary.purge_blocked || 0)>0?'danger':'default'} helper="Blocked by active legal hold" />
      <OperationalWorkspaceStatCard iconPath="/platform/data-retention" label="Write locked tenants" value={data ? metric(data.summary.write_locked) : '—'} helper={data ? (data.summary.write_locked===null?'Requires tenant identity evidence':'Current tenant state') : 'Loading tenant state'} />
    </OperationalWorkspaceStats>

    <section className="platform-data-retention__section">
      <OperationalSectionHeader iconPath="/platform/data-retention" title="Retention registry" description="Search and filter the server-side registry. Tenant targeting is available only with TENANTS_READ." />
      <div className="app-panel app-panel--padded platform-data-retention__filters">
        {canReadTenants ? <label>Tenant<select value={tenantId} onChange={e=>updateParams({tenant_id:e.target.value})}><option value="">All tenants</option>{(tenantsQuery.data || []).map(t=><option key={t.id} value={t.id}>{t.name} · {pretty(t.status)} · {t.plan_code || 'no plan'}</option>)}</select></label> : <div className="platform-data-retention__restricted"><strong>Tenant filter restricted</strong><span>TENANTS_READ is required.</span></div>}
        <label className="platform-data-retention__search">Search<input value={search} onChange={e=>updateParams({search:e.target.value})} placeholder={canReadTenants?'Tenant, policy, hold reason or notes':'Policy, hold reason or notes'} /></label>
        <label>Legal hold<select value={legalHold} onChange={e=>updateParams({legal_hold:e.target.value})}><option value="">Any</option><option value="true">Active</option><option value="false">Not active</option></select></label>
        <label>Due<select value={dueOnly?'true':'false'} onChange={e=>updateParams({due_only:e.target.value==='true'?'true':null})}><option value="false">Any</option><option value="true">Due only</option></select></label>
      </div>

      {retentionQuery.isError && !data ? <div className="platform-data-retention__blocking-error"><strong>Data retention evidence could not be loaded.</strong><span>{readableError(retentionQuery.error)}</span><button type="button" className="app-button app-button--secondary" onClick={()=>void retentionQuery.refetch()}>Retry</button></div> : null}
      {retentionQuery.isLoading && !data ? <div className="platform-data-retention__loading">Loading retention evidence…</div> : null}
      {data ? <div className="platform-data-retention__list">
        {data.records.map((row,index)=><article className="platform-data-retention__card" key={row.tenant_id || `${row.updated_at || 'record'}-${index}`}>
          <div className="platform-data-retention__card-header"><div><h4>{row.tenant_name || 'Restricted tenant'}</h4><p>{row.tenant_status ? `${pretty(row.tenant_status)}${row.write_locked?' · write locked':''}` : 'Tenant identity/status not available with current permissions.'}</p></div><div className="platform-data-retention__badges"><span>{pretty(row.retention_policy)}</span>{row.retention_due?<span data-tone="warn">Due</span>:null}{row.legal_hold?<span data-tone="danger">Legal hold</span>:<span data-tone="good">No hold</span>}</div></div>
          <div className="platform-data-retention__metrics-grid"><div><span>Retain until</span><strong>{formatDate(row.retain_until)}</strong></div><div><span>Offboarding purge intent</span><strong>{row.purge_after_offboarding?'Configured':'Not configured'}</strong></div><div><span>Legal hold set</span><strong>{formatDateTime(row.legal_hold_set_at)}</strong>{row.legal_hold_set_by_present?<small>{canReadPlatformUsers?(row.legal_hold_set_by_email || 'Platform user recorded'):'Setter identity restricted'}</small>:null}</div></div>
          {row.legal_hold_reason ? <div className="platform-data-retention__evidence-note"><strong>Legal hold reason</strong><span>{row.legal_hold_reason}</span></div> : null}
          {row.notes ? <div className="platform-data-retention__evidence-note"><strong>Operator notes</strong><span>{row.notes}</span></div> : null}
          <div className="platform-data-retention__card-footer"><div className="platform-data-retention__source-links">{row.tenant_id && canReadTenants?<><Link to={`/platform/tenant-lifecycle?tenant_id=${encodeURIComponent(row.tenant_id)}`}>Lifecycle</Link><Link to={`/platform/tenant-offboarding?tenant_id=${encodeURIComponent(row.tenant_id)}`}>Offboarding</Link>{canReadTenantExports?<Link to={`/platform/tenant-exports?tenant_id=${encodeURIComponent(row.tenant_id)}`}>Export evidence</Link>:null}</>:<span className="platform-data-retention__restricted-inline">Tenant links restricted</span>}</div><div className="platform-data-retention__actions">{canWrite && row.tenant_id?<><button type="button" className="app-button app-button--secondary" disabled={saveMutation.isPending || lifecyclePending} onClick={()=>startEdit(row)}>Edit</button>{row.legal_hold?<button type="button" className="app-button app-button--danger" disabled={saveMutation.isPending || lifecyclePending} onClick={()=>clearLegalHold(row)}>Clear hold</button>:<button type="button" className="app-button app-button--secondary" disabled={saveMutation.isPending || lifecyclePending} onClick={()=>setLegalHold(row)}>Set hold</button>}</>:<span className="platform-data-retention__restricted-inline">Read only</span>}</div></div>
        </article>)}
        {!data.records.length?<div className="platform-data-retention__empty"><strong>No retention records match these filters.</strong><span>{data.tenant_registry_complete?'The filtered tenant registry is empty.':'Only configured retention rows can be listed without TENANTS_READ; no matching configured rows were found.'}</span></div>:null}
        <div className="platform-data-retention__pagination"><span>{pageStart}–{pageEnd} of {data.pagination.total}</span><button type="button" className="app-button app-button--secondary" disabled={offset===0 || retentionQuery.isFetching} onClick={()=>updateParams({offset:String(Math.max(0,offset-PAGE_SIZE))})}>Previous</button><button type="button" className="app-button app-button--secondary" disabled={!data.pagination.has_more || retentionQuery.isFetching} onClick={()=>updateParams({offset:String(offset+PAGE_SIZE)})}>Next</button></div>
      </div>:null}
    </section>

    {editing ? <section id="platform-data-retention-form" className="platform-data-retention__section"><OperationalSectionHeader iconPath="/platform/data-retention" title={`Edit retention · ${editing.tenant_name || 'tenant'}`} description="Ordinary Edit changes policy details only. Set hold and Clear hold are dedicated lifecycle actions with their own audited reason." /><div className="app-panel app-panel--padded platform-data-retention__form-grid"><label>Policy<select value={form.retention_policy} onChange={e=>setForm(f=>({...f,retention_policy:e.target.value}))}>{policies.map(p=><option key={p} value={p}>{pretty(p)}</option>)}</select></label><label>Retain until<input type="date" value={form.retain_until} onChange={e=>setForm(f=>({...f,retain_until:e.target.value}))} /></label><label className="platform-data-retention__checkbox"><input type="checkbox" checked={form.purge_after_offboarding} onChange={e=>setForm(f=>({...f,purge_after_offboarding:e.target.checked}))} /> Purge after offboarding intent</label><div className="platform-data-retention__restricted"><strong>Legal hold lifecycle</strong><span>{editing.legal_hold?'Active — use Clear hold on the registry card to release it.':'Not active — use Set hold on the registry card to activate it.'}</span></div><label className="platform-data-retention__span-all">Notes<textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></label>{retainUntilInvalid?<div className="platform-data-retention__validation">Retain until must be a valid date.</div>:null}<div className="platform-data-retention__actions platform-data-retention__span-all"><button type="button" className="app-button app-button--primary" disabled={saveDisabled} onClick={()=>saveMutation.mutate()}>{saveMutation.isPending?'Saving…':'Save changes'}</button><button type="button" className="app-button app-button--secondary" disabled={saveMutation.isPending || lifecyclePending} onClick={()=>setEditing(null)}>Cancel</button></div></div></section> : null}

    <section className="platform-data-retention__section">
      <OperationalSectionHeader iconPath="/platform/data-retention" title="Evidence boundary" description="What this page records—and what it does not prove." />
      <div className="platform-data-retention__truth-note"><strong>Retention policy is application configuration, not deletion evidence.</strong><span>A due retain-until date does not prove a purge occurred. “Purge after offboarding” is an operator-configured intent only; this surface has no purge executor. Absence of application rows does not prove backups, exports, replicas, or other external copies are absent or deleted.</span></div>
      <div className="platform-data-retention__supporting-links">{canReadTenants?<Link to="/platform/tenant-offboarding">Tenant offboarding</Link>:null}{canReadTenantExports?<Link to="/platform/tenant-exports">Tenant exports</Link>:null}{canReadCompliance?<Link to="/platform/compliance-documents">Compliance documents</Link>:null}{canReadCompliance?<Link to="/platform/legal-compliance-reporting">Legal &amp; compliance reporting</Link>:null}{canReadAudit?<Link to="/platform/audit">Audit</Link>:null}</div>
    </section>
  </div>;
}
