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
import './PlatformComplianceDocumentsPage.css';

type Tenant = { id: string; name: string };
type PlatformUser = { id: string; email: string; is_active?: boolean };
type Pagination = { limit: number; offset: number; total: number; has_more: boolean };
type EvidenceAccess = { tenant_identity: boolean; platform_user_identity: boolean };
type EvidenceContract = {
  application_registry_only: boolean;
  external_url_is_reference_not_content_verification: boolean;
  reviewed_at_is_application_review_action_only: boolean;
  active_status_does_not_prove_external_document_validity_or_acceptance: boolean;
  expiration_posture_is_derived_from_recorded_dates: boolean;
};
type ComplianceDocument = {
  id: string; title: string; document_type: string; status: string;
  tenant_id?: string | null; tenant_name?: string | null; tenant_present?: boolean;
  owner_platform_user_id?: string | null; owner_email?: string | null; owner_present?: boolean;
  reviewed_by_platform_user_id?: string | null; reviewed_by_email?: string | null; reviewer_present?: boolean;
  created_by_platform_user_id?: string | null; created_by_email?: string | null; creator_present?: boolean;
  external_url?: string | null; notes?: string | null; effective_at?: string | null; expires_at?: string | null;
  reviewed_at?: string | null; created_at?: string | null; updated_at?: string | null;
};
type DocumentsResponse = {
  documents: ComplianceDocument[];
  summary: { total: number; draft: number; active: number; needs_review: number; archived: number; expired_or_overdue: number; expiring_soon: number; missing_external_reference: number; by_type: Record<string, number>; by_status: Record<string, number> };
  pagination: Pagination; evidence_access: EvidenceAccess; evidence_contract: EvidenceContract;
  document_types: string[]; statuses: string[]; review_statuses: string[];
};
type FormState = { tenant_id: string; title: string; document_type: string; owner_platform_user_id: string; external_url: string; notes: string; effective_at: string; expires_at: string };

const PAGE_SIZE = 50;
const DOCUMENT_TYPES = ['contract', 'dpa', 'security', 'privacy', 'subprocessor', 'sla', 'billing', 'policy', 'other'];
const STATUSES = ['draft', 'active', 'needs_review', 'expired', 'archived'];
const REVIEW_STATUSES = ['active', 'needs_review', 'expired'];
const emptyForm = (): FormState => ({ tenant_id:'', title:'', document_type:'other', owner_platform_user_id:'', external_url:'', notes:'', effective_at:'', expires_at:'' });

function readableError(error: unknown) { return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error'; }
function clean(value: string) { const v=value.trim(); return v || null; }
function pretty(value?: string | null) { const v=String(value || '').replaceAll('_',' ').trim(); return v ? v.charAt(0).toUpperCase()+v.slice(1) : 'Not recorded'; }
function dateOnly(value?: string | null) { if (!value) return 'Not recorded'; const d=new Date(value); return Number.isNaN(d.getTime()) ? 'Not recorded' : d.toLocaleDateString(); }
function dateTime(value?: string | null) { if (!value) return 'Not recorded'; const d=new Date(value); return Number.isNaN(d.getTime()) ? 'Not recorded' : d.toLocaleString(); }
function toDateInput(value?: string | null) { if (!value) return ''; const d=new Date(value); if (Number.isNaN(d.getTime())) return ''; const pad=(n:number)=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function toIsoDateOrNull(value: string) { if (!value) return null; const d=new Date(`${value}T00:00:00`); return Number.isNaN(d.getTime()) ? null : d.toISOString(); }
function statusTone(status: string) { if (status==='active') return 'good'; if (status==='needs_review') return 'warn'; if (status==='expired' || status==='archived') return 'danger'; return 'neutral'; }
function isOverdue(row: ComplianceDocument) { return Boolean(row.expires_at && row.status!=='archived' && new Date(row.expires_at).getTime() < Date.now()); }
function toForm(row: ComplianceDocument): FormState { return { tenant_id:row.tenant_id || '', title:row.title || '', document_type:row.document_type || 'other', owner_platform_user_id:row.owner_platform_user_id || '', external_url:row.external_url || '', notes:row.notes || '', effective_at:toDateInput(row.effective_at), expires_at:toDateInput(row.expires_at) }; }
function sameForm(a: FormState | null, b: FormState) { return Boolean(a && JSON.stringify(a)===JSON.stringify(b)); }

export default function PlatformComplianceDocumentsPage() {
  const queryClient=useQueryClient();
  const [searchParams,setSearchParams]=useSearchParams();
  const canWrite=hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_COMPLIANCE_WRITE);
  const canReadTenants=hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ);
  const canReadUsers=hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canReadPrivacy=hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_PRIVACY_READ);
  const canReadAccessReviews=hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ACCESS_REVIEWS_READ);
  const canReadAudit=hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);

  const requestedStatus=searchParams.get('status') || '';
  const requestedType=searchParams.get('document_type') || '';
  const requestedTenant=searchParams.get('tenant_id') || '';
  const requestedSearch=searchParams.get('search') || '';
  const requestedExpiring=searchParams.get('expiring') || '';
  const status=STATUSES.includes(requestedStatus) ? requestedStatus : '';
  const documentType=DOCUMENT_TYPES.includes(requestedType) ? requestedType : '';
  const tenantId=canReadTenants ? requestedTenant : '';
  const search=requestedSearch.length<=200 ? requestedSearch : '';
  const expiring=requestedExpiring==='true';
  const invalidFilters=Boolean((requestedStatus && !status) || (requestedType && !documentType) || (requestedSearch && !search) || (requestedExpiring && !['true','false'].includes(requestedExpiring)) || (requestedTenant && !canReadTenants));

  const [offset,setOffset]=useState(0);
  const [form,setForm]=useState<FormState>(()=>emptyForm());
  const [originalForm,setOriginalForm]=useState<FormState | null>(null);
  const [editingId,setEditingId]=useState('');
  const [reviewNotes,setReviewNotes]=useState<Record<string,string>>({});
  const [message,setMessage]=useState('');
  const [mutationError,setMutationError]=useState('');
  useEffect(()=>setOffset(0),[status,documentType,tenantId,search,expiring,invalidFilters]);

  const queryString=useMemo(()=>{ const params=new URLSearchParams({limit:String(PAGE_SIZE),offset:String(offset)}); if(status)params.set('status',status); if(documentType)params.set('document_type',documentType); if(tenantId)params.set('tenant_id',tenantId); if(search.trim())params.set('search',search.trim()); if(expiring)params.set('expiring','true'); return params.toString(); },[status,documentType,tenantId,search,expiring,offset]);
  const documents=useQuery({ queryKey:['platform','compliance-documents',status,documentType,tenantId,search,expiring,offset], queryFn:()=>platformApiRequest<DocumentsResponse>(`/platform/compliance-documents?${queryString}`), enabled:!invalidFilters, placeholderData:(previousData)=>previousData });
  const tenants=useQuery({ queryKey:['platform','compliance-document-tenants'], queryFn:()=>platformApiRequest<Tenant[]>('/platform/tenants'), enabled:canWrite && canReadTenants });
  const users=useQuery({ queryKey:['platform','compliance-document-users'], queryFn:()=>platformApiRequest<PlatformUser[]>('/platform/users'), enabled:canWrite && canReadUsers });

  const buildPayload=()=>{ const body:Record<string,unknown>={ title:form.title.trim(), document_type:form.document_type, external_url:clean(form.external_url), notes:clean(form.notes), effective_at:toIsoDateOrNull(form.effective_at), expires_at:toIsoDateOrNull(form.expires_at) }; if(canReadTenants)body.tenant_id=form.tenant_id || null; if(canReadUsers)body.owner_platform_user_id=form.owner_platform_user_id || null; return body; };
  const resetForm=()=>{setForm(emptyForm());setOriginalForm(null);setEditingId('');};
  const save=useMutation({ mutationFn:()=>platformApiRequest(editingId?`/platform/compliance-documents/${editingId}`:'/platform/compliance-documents',{method:editingId?'PATCH':'POST',body:JSON.stringify(buildPayload())}), onSuccess:()=>{setMessage(editingId?'Compliance document details saved.':'Compliance document created as Draft.');setMutationError('');resetForm();queryClient.invalidateQueries({queryKey:['platform','compliance-documents']});}, onError:(error)=>setMutationError(readableError(error)) });
  const review=useMutation({ mutationFn:({id,nextStatus}:{id:string;nextStatus:string})=>platformApiRequest(`/platform/compliance-documents/${id}/review`,{method:'POST',body:JSON.stringify({status:nextStatus,notes:clean(reviewNotes[id] || '')})}), onSuccess:(_,variables)=>{setMessage(`Review recorded as ${pretty(variables.nextStatus)}.`);setMutationError('');setReviewNotes((current)=>({...current,[variables.id]:''}));queryClient.invalidateQueries({queryKey:['platform','compliance-documents']});}, onError:(error)=>setMutationError(readableError(error)) });
  const archive=useMutation({ mutationFn:(id:string)=>platformApiRequest(`/platform/compliance-documents/${id}/archive`,{method:'POST',body:JSON.stringify({reason:'Archived from Compliance documents workspace'})}), onSuccess:()=>{setMessage('Compliance document archived.');setMutationError('');queryClient.invalidateQueries({queryKey:['platform','compliance-documents']});}, onError:(error)=>setMutationError(readableError(error)) });

  const response=documents.data; const summary=response?.summary; const pagination=response?.pagination; const rows=response?.documents || [];
  const types=response?.document_types || DOCUMENT_TYPES; const reviewStatuses=response?.review_statuses || REVIEW_STATUSES;
  const validDates=!form.effective_at || !form.expires_at || new Date(`${form.effective_at}T00:00:00`).getTime()<=new Date(`${form.expires_at}T00:00:00`).getTime();
  let validUrl=true; if(form.external_url.trim()){try{const u=new URL(form.external_url.trim());validUrl=['http:','https:'].includes(u.protocol);}catch{validUrl=false;}}
  const dirty=!editingId || !sameForm(originalForm,form);
  const canSave=canWrite && Boolean(form.title.trim()) && validDates && validUrl && dirty && !save.isPending;
  const refresh=()=>{setMessage('');setMutationError('');documents.refetch();if(canWrite&&canReadTenants)tenants.refetch();if(canWrite&&canReadUsers)users.refetch();};
  const setFilter=(key:string,value:string)=>{const next=new URLSearchParams(searchParams);if(value)next.set(key,value);else next.delete(key);setSearchParams(next,{replace:true});};
  const beginEdit=(row:ComplianceDocument)=>{const next=toForm(row);setForm(next);setOriginalForm(next);setEditingId(row.id);setMessage('');setMutationError('');scrollToFormSection('platform-compliance-documents-form');};
  const pageNumber=Math.floor(offset/PAGE_SIZE)+1;
  const initialError=!response && documents.isError;
  const staleError=Boolean(response && documents.isError);

  return <div className="platform-compliance-documents">
    <OperationalWorkspaceHero iconPath="/platform/compliance-documents" eyebrow="Platform governance" title="Compliance documents" description="Maintain the Platform registry for contracts, DPAs, security/privacy records, subprocessors, SLAs, policies and review/expiry evidence." meta={<><OperationalWorkspaceMetaPill>Registry-wide filtered summary</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>{response?.evidence_access.tenant_identity?'Tenant identity available':'Tenant identity restricted'}</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>{response?.evidence_access.platform_user_identity?'Platform-user identity available':'Platform-user identity restricted'}</OperationalWorkspaceMetaPill></>} aside={<div className="platform-compliance-documents__hero-aside"><OperationalWorkspaceStatus value="Application evidence" label="Not external document verification"/><button type="button" className="app-button app-button--secondary" onClick={refresh} disabled={documents.isFetching}>{documents.isFetching?'Refreshing…':'Refresh'}</button></div>} />

    {message?<div className="platform-compliance-documents__success">{message}<button type="button" className="app-button app-button--secondary" onClick={()=>setMessage('')}>Dismiss</button></div>:null}
    {mutationError?<div className="platform-compliance-documents__warning"><strong>Action failed.</strong><span>{mutationError}</span></div>:null}
    {staleError?<div className="platform-compliance-documents__warning"><strong>Showing the last successful snapshot.</strong><span>{readableError(documents.error)}</span><button type="button" className="app-button app-button--secondary" onClick={()=>documents.refetch()}>Retry</button></div>:null}
    <div className="platform-compliance-documents__truth-note"><strong>Evidence boundary</strong><span>An external URL is only a recorded reference. Review timestamps and Active status are Platform workflow evidence; they do not prove the external document exists, is current, was accepted by a customer, or is legally effective.</span></div>

    <OperationalWorkspaceStats ariaLabel="Compliance document registry summary">
      <OperationalWorkspaceStatCard label="Filtered documents" value={summary?.total ?? '—'} helper="Registry-wide filtered total" tone="red" iconPath="/platform/compliance-documents" />
      <OperationalWorkspaceStatCard label="Active" value={summary?.active ?? '—'} helper="Application workflow status" tone="good" iconPath="/platform/compliance-documents" />
      <OperationalWorkspaceStatCard label="Needs review" value={summary?.needs_review ?? '—'} helper="Explicit review state" tone="warn" iconPath="/platform/compliance-documents" />
      <OperationalWorkspaceStatCard label="Expired / overdue" value={summary?.expired_or_overdue ?? '—'} helper="Status or recorded expiry date" tone="danger" iconPath="/platform/compliance-documents" />
      <OperationalWorkspaceStatCard label="Expiring soon" value={summary?.expiring_soon ?? '—'} helper="Within 45 days" tone="warn" iconPath="/platform/compliance-documents" />
      <OperationalWorkspaceStatCard label="Missing reference" value={summary?.missing_external_reference ?? '—'} helper="No external URL recorded" tone="neutral" iconPath="/platform/compliance-documents" />
    </OperationalWorkspaceStats>

    <section className="io-workspace-panel platform-compliance-documents__section">
      <OperationalSectionHeader iconPath="/platform/compliance-documents" title="Filter registry" description="Filters are URL-backed. Tenant filtering is available only with TENANTS_READ." />
      <div className="platform-compliance-documents__filter-grid">
        <label className="platform-compliance-documents__search">Search<input value={search} onChange={(e)=>setFilter('search',e.target.value)} placeholder="Title or notes" /></label>
        <label>Status<select value={status} onChange={(e)=>setFilter('status',e.target.value)}><option value="">All statuses</option>{STATUSES.map((item)=><option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label>Document type<select value={documentType} onChange={(e)=>setFilter('document_type',e.target.value)}><option value="">All types</option>{types.map((item)=><option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        {canReadTenants?<label>Tenant<select value={tenantId} onChange={(e)=>setFilter('tenant_id',e.target.value)}><option value="">All tenants</option>{(tenants.data||[]).map((tenant)=><option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>:<div className="platform-compliance-documents__restricted"><strong>Tenant filter restricted</strong><span>TENANTS_READ is required.</span></div>}
        <label className="platform-compliance-documents__checkbox"><input type="checkbox" checked={expiring} onChange={(e)=>setFilter('expiring',e.target.checked?'true':'')} /> Expiring within 45 days</label>
      </div>
    </section>

    {canWrite?<section id="platform-compliance-documents-form" className="io-workspace-panel platform-compliance-documents__section">
      <OperationalSectionHeader iconPath="/platform/compliance-documents" title={editingId?'Edit document details':'Create compliance document'} description={editingId?'Lifecycle status is intentionally excluded from ordinary edits. Archived records are immutable.':'New records always enter Draft. Use the explicit review action to record a later review outcome.'} actions={editingId?<button type="button" className="app-button app-button--secondary" onClick={resetForm}>Cancel edit</button>:undefined}/>
      <div className="platform-compliance-documents__form-grid">
        <label>Title<input value={form.title} maxLength={255} onChange={(e)=>setForm({...form,title:e.target.value})} /></label>
        <label>Type<select value={form.document_type} onChange={(e)=>setForm({...form,document_type:e.target.value})}>{types.map((item)=><option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        {canReadTenants?<label>Tenant<select value={form.tenant_id} onChange={(e)=>setForm({...form,tenant_id:e.target.value})}><option value="">Platform-wide / none</option>{(tenants.data||[]).map((tenant)=><option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>:<div className="platform-compliance-documents__restricted"><strong>Tenant linkage preserved</strong><span>{editingId?'Existing restricted linkage is not changed by this edit.':'TENANTS_READ is required to assign a tenant.'}</span></div>}
        {canReadUsers?<label>Owner<select value={form.owner_platform_user_id} onChange={(e)=>setForm({...form,owner_platform_user_id:e.target.value})}><option value="">Unassigned</option>{(users.data||[]).filter((user)=>user.is_active!==false).map((user)=><option key={user.id} value={user.id}>{user.email}</option>)}</select></label>:<div className="platform-compliance-documents__restricted"><strong>Owner linkage preserved</strong><span>{editingId?'Existing restricted linkage is not changed by this edit.':'PLATFORM_USERS_READ is required to assign an owner.'}</span></div>}
        <label>Effective date<input type="date" value={form.effective_at} onChange={(e)=>setForm({...form,effective_at:e.target.value})} /></label>
        <label>Expiry date<input type="date" value={form.expires_at} onChange={(e)=>setForm({...form,expires_at:e.target.value})} /></label>
        <label className="platform-compliance-documents__span-all">External document URL<input value={form.external_url} maxLength={2048} onChange={(e)=>setForm({...form,external_url:e.target.value})} placeholder="https://…" /></label>
        <label className="platform-compliance-documents__span-all">Internal notes<textarea value={form.notes} maxLength={5000} onChange={(e)=>setForm({...form,notes:e.target.value})} /></label>
      </div>
      {!validDates?<div className="platform-compliance-documents__validation">Effective date must be before or equal to expiry date.</div>:null}
      {!validUrl?<div className="platform-compliance-documents__validation">External URL must use http:// or https://.</div>:null}
      <div className="platform-compliance-documents__actions"><button type="button" className="app-button app-button--primary" disabled={!canSave} onClick={()=>save.mutate()}>{save.isPending?'Saving…':editingId?'Save details':'Create draft'}</button></div>
    </section>:null}

    <section className="io-workspace-panel platform-compliance-documents__section">
      <OperationalSectionHeader iconPath="/platform/compliance-documents" title="Compliance document evidence" description="Each card is a Platform registry record. Review and archive are explicit lifecycle actions." />
      {invalidFilters?<div className="platform-compliance-documents__blocking-error"><strong>Invalid or unauthorized filter.</strong><span>Clear the URL filter or obtain the source permission required by that filter.</span></div>:initialError?<div className="platform-compliance-documents__blocking-error"><strong>Compliance documents could not be loaded.</strong><span>{readableError(documents.error)}</span><button type="button" className="app-button app-button--secondary" onClick={()=>documents.refetch()}>Retry</button></div>:documents.isPending?<div className="platform-compliance-documents__loading">Loading compliance documents…</div>:rows.length===0?<div className="platform-compliance-documents__empty"><strong>No matching application records.</strong><span>This does not prove that no external legal/compliance document exists outside the Platform registry.</span></div>:<div className="platform-compliance-documents__list">{rows.map((row)=>{
        const archived=row.status==='archived'; const overdue=isOverdue(row);
        return <article key={row.id} className="platform-compliance-documents__card">
          <div className="platform-compliance-documents__card-header"><div><h4>{row.title}</h4><p>{row.notes || 'No internal notes recorded.'}</p></div><div className="platform-compliance-documents__badges"><span data-tone={statusTone(row.status)}>{pretty(row.status)}</span><span>{pretty(row.document_type)}</span>{overdue?<span data-tone="danger">Expiry overdue</span>:null}</div></div>
          <div className="platform-compliance-documents__metrics-grid">
            <div><span>Tenant</span><strong>{row.tenant_name || (row.tenant_present?'Restricted tenant linkage':'Platform-wide / none')}</strong></div>
            <div><span>Owner</span><strong>{row.owner_email || (row.owner_present?'Restricted Platform-user linkage':'Unassigned')}</strong></div>
            <div><span>Effective</span><strong>{dateOnly(row.effective_at)}</strong></div>
            <div><span>Expires</span><strong>{dateOnly(row.expires_at)}</strong></div>
            <div><span>Last review</span><strong>{dateTime(row.reviewed_at)}</strong></div>
            <div><span>Reviewer</span><strong>{row.reviewed_by_email || (row.reviewer_present?'Restricted Platform-user identity':'Not recorded')}</strong></div>
          </div>
          <div className="platform-compliance-documents__card-footer"><div className="platform-compliance-documents__source-links">{row.external_url?<a href={row.external_url} target="_blank" rel="noreferrer noopener">Open recorded reference</a>:<span className="platform-compliance-documents__missing-reference">No external URL recorded</span>}{row.tenant_id&&canReadTenants?<Link to={`/platform/tenants?tenant_id=${encodeURIComponent(row.tenant_id)}`}>Tenant</Link>:null}{canReadAudit?<Link to="/platform/audit">Audit</Link>:null}</div>{canWrite&&!archived?<div className="platform-compliance-documents__actions"><button type="button" className="app-button app-button--secondary" onClick={()=>beginEdit(row)}>Edit details</button><button type="button" className="app-button app-button--secondary" disabled={archive.isPending} onClick={()=>{if(window.confirm('Archive this compliance document record? Archived records become immutable.'))archive.mutate(row.id);}}>Archive</button></div>:archived?<span className="platform-compliance-documents__immutable">Archived history is immutable.</span>:null}</div>
          {canWrite&&!archived?<div className="platform-compliance-documents__review"><label>Review audit note<input value={reviewNotes[row.id]||''} maxLength={5000} onChange={(e)=>setReviewNotes((current)=>({...current,[row.id]:e.target.value}))} placeholder="Optional note stored in Platform audit history" /></label><div className="platform-compliance-documents__actions">{reviewStatuses.map((nextStatus)=><button key={nextStatus} type="button" className={nextStatus==='active'?'app-button app-button--primary':'app-button app-button--secondary'} disabled={review.isPending} onClick={()=>{if(window.confirm(`Record a review outcome of ${pretty(nextStatus)}? This records Platform review evidence only.`))review.mutate({id:row.id,nextStatus});}}>{nextStatus==='active'?'Record reviewed · Active':`Record ${pretty(nextStatus)}`}</button>)}</div></div>:null}
        </article>;
      })}</div>}
      {response?<div className="platform-compliance-documents__pagination"><button type="button" className="app-button app-button--secondary" disabled={offset===0||documents.isFetching} onClick={()=>setOffset((value)=>Math.max(0,value-PAGE_SIZE))}>Previous</button><span>Page {pageNumber} · up to {PAGE_SIZE} documents · {pagination?.total ?? 0} filtered total</span><button type="button" className="app-button app-button--secondary" disabled={!pagination?.has_more||documents.isFetching} onClick={()=>setOffset((value)=>value+PAGE_SIZE)}>Next</button></div>:null}
    </section>

    <section className="io-workspace-panel platform-compliance-documents__section"><OperationalSectionHeader iconPath="/platform/compliance-documents" title="Supporting operations" description="Only destinations allowed by the current Platform permission snapshot are shown."/><div className="platform-compliance-documents__supporting-links"><Link to="/platform/compliance-export">Compliance export</Link><Link to="/platform/legal-compliance-reporting">Legal &amp; compliance reporting</Link>{canReadPrivacy?<Link to="/platform/privacy-requests">Privacy requests</Link>:null}{canReadAccessReviews?<Link to="/platform/access-reviews">Access reviews</Link>:null}{canReadTenants?<Link to="/platform/tenants">Tenants</Link>:null}{canReadUsers?<Link to="/platform/users">Platform users</Link>:null}{canReadAudit?<Link to="/platform/audit">Platform audit</Link>:null}</div></section>
  </div>;
}
