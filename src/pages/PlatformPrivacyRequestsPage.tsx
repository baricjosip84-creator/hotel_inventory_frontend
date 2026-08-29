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
import './PlatformPrivacyRequestsPage.css';

type Tenant = { id: string; name: string };
type PlatformUser = { id: string; email: string; is_active?: boolean };
type Pagination = { limit: number; offset: number; total: number; has_more: boolean };
type EvidenceAccess = { tenant_identity: boolean; platform_user_identity: boolean };
type EvidenceContract = {
  application_registry_only: boolean;
  requester_identity_fields_are_recorded_application_evidence: boolean;
  verification_action_does_not_prove_external_identity_verification: boolean;
  fulfilled_status_does_not_prove_external_right_satisfied: boolean;
  due_at_is_operator_recorded_deadline_not_legal_sla: boolean;
  audit_events_do_not_prove_external_delivery_receipt_or_legal_compliance: boolean;
};
type PrivacyRequest = {
  id: string; tenant_id?: string | null; tenant_name?: string | null; tenant_present?: boolean;
  request_type: string; status: string; priority: string;
  requester_name?: string | null; requester_email: string; subject_identifier?: string | null; summary: string;
  due_at?: string | null; assigned_platform_user_id?: string | null; assignee_email?: string | null; assignee_present?: boolean;
  created_by_platform_user_id?: string | null; created_by_email?: string | null; creator_present?: boolean;
  verified_at?: string | null; verified_by_platform_user_id?: string | null; verified_by_email?: string | null; verifier_present?: boolean;
  completed_at?: string | null; completed_by_platform_user_id?: string | null; completed_by_email?: string | null; completer_present?: boolean;
  resolution_notes?: string | null; rejection_reason?: string | null; is_overdue?: boolean;
  created_at?: string | null; updated_at?: string | null;
};
type RequestsResponse = {
  requests: PrivacyRequest[]; request_types: string[]; statuses: string[]; open_statuses: string[]; priorities: string[];
  summary: { total: number; open: number; overdue: number; waiting_tenant: number; high_priority_open: number; verification_attention: number };
  by_type: { request_type: string; count: number }[]; by_status: { status: string; count: number }[];
  pagination: Pagination; evidence_access: EvidenceAccess; evidence_contract: EvidenceContract;
};
type FormState = { tenant_id: string; request_type: string; priority: string; requester_name: string; requester_email: string; subject_identifier: string; summary: string; due_at: string; assigned_platform_user_id: string };

const PAGE_SIZE = 50;
const REQUEST_TYPES = ['access', 'export', 'deletion', 'correction', 'consent', 'restriction', 'objection', 'other'];
const STATUSES = ['intake', 'verifying', 'in_progress', 'waiting_tenant', 'fulfilled', 'rejected', 'cancelled'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const emptyForm = (): FormState => ({ tenant_id:'', request_type:'access', priority:'normal', requester_name:'', requester_email:'', subject_identifier:'', summary:'', due_at:'', assigned_platform_user_id:'' });

function readableError(error: unknown) { return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error'; }
function clean(value: string) { const v=value.trim(); return v || null; }
function pretty(value?: string | null) { const v=String(value || '').replaceAll('_',' ').trim(); return v ? v.charAt(0).toUpperCase()+v.slice(1) : 'Not recorded'; }
function dateTime(value?: string | null) { if (!value) return 'Not recorded'; const d=new Date(value); return Number.isNaN(d.getTime()) ? 'Not recorded' : d.toLocaleString(); }
function toLocalDateTimeInput(value?: string | null) { if (!value) return ''; const d=new Date(value); if (Number.isNaN(d.getTime())) return ''; const pad=(n:number)=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function toIsoDateTimeOrNull(value: string) { if (!value) return null; const d=new Date(value); return Number.isNaN(d.getTime()) ? null : d.toISOString(); }
function isClosed(status: string) { return ['fulfilled','rejected','cancelled'].includes(status); }
function statusTone(row: PrivacyRequest) { if (row.is_overdue) return 'danger'; if (row.status==='fulfilled') return 'good'; if (row.status==='rejected'||row.status==='cancelled') return 'neutral'; if (row.priority==='urgent'||row.priority==='high'||row.status==='waiting_tenant') return 'warn'; return 'red'; }
function toForm(row: PrivacyRequest): FormState { return { tenant_id:row.tenant_id || '', request_type:row.request_type || 'other', priority:row.priority || 'normal', requester_name:row.requester_name || '', requester_email:row.requester_email || '', subject_identifier:row.subject_identifier || '', summary:row.summary || '', due_at:toLocalDateTimeInput(row.due_at), assigned_platform_user_id:row.assigned_platform_user_id || '' }; }
function sameForm(a: FormState | null, b: FormState) { return Boolean(a && JSON.stringify(a)===JSON.stringify(b)); }
function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()); }

export default function PlatformPrivacyRequestsPage() {
  const queryClient=useQueryClient();
  const [searchParams,setSearchParams]=useSearchParams();
  const canWrite=hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_PRIVACY_WRITE);
  const canReadTenants=hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ);
  const canReadUsers=hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canReadAudit=hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);
  const canReadCompliance=hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_COMPLIANCE_READ);
  const canReadAccessReviews=hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ACCESS_REVIEWS_READ);

  const requestedStatus=searchParams.get('status') || '';
  const requestedType=searchParams.get('request_type') || '';
  const requestedTenant=searchParams.get('tenant_id') || '';
  const requestedAssignee=searchParams.get('assigned_platform_user_id') || '';
  const requestedSearch=searchParams.get('search') || '';
  const requestedOverdue=searchParams.get('overdue') || '';
  const status=STATUSES.includes(requestedStatus)?requestedStatus:'';
  const requestType=REQUEST_TYPES.includes(requestedType)?requestedType:'';
  const tenantId=canReadTenants?requestedTenant:'';
  const assigneeId=canReadUsers?requestedAssignee:'';
  const search=requestedSearch.length<=200?requestedSearch:'';
  const overdue=requestedOverdue==='true';
  const invalidFilters=Boolean((requestedStatus&&!status)||(requestedType&&!requestType)||(requestedSearch&&!search)||(requestedOverdue&&!['true','false'].includes(requestedOverdue))||(requestedTenant&&!canReadTenants)||(requestedAssignee&&!canReadUsers));

  const [offset,setOffset]=useState(0);
  const [form,setForm]=useState<FormState>(()=>emptyForm());
  const [originalForm,setOriginalForm]=useState<FormState | null>(null);
  const [editingId,setEditingId]=useState('');
  const [actionNotes,setActionNotes]=useState<Record<string,string>>({});
  const [rejectReasons,setRejectReasons]=useState<Record<string,string>>({});
  const [message,setMessage]=useState('');
  const [mutationError,setMutationError]=useState('');
  useEffect(()=>setOffset(0),[status,requestType,tenantId,assigneeId,search,overdue,invalidFilters]);

  const queryString=useMemo(()=>{ const params=new URLSearchParams({limit:String(PAGE_SIZE),offset:String(offset)}); if(status)params.set('status',status); if(requestType)params.set('request_type',requestType); if(tenantId)params.set('tenant_id',tenantId); if(assigneeId)params.set('assigned_platform_user_id',assigneeId); if(search.trim())params.set('search',search.trim()); if(overdue)params.set('overdue','true'); return params.toString(); },[status,requestType,tenantId,assigneeId,search,overdue,offset]);
  const requests=useQuery({ queryKey:['platform','privacy-requests',status,requestType,tenantId,assigneeId,search,overdue,offset], queryFn:()=>platformApiRequest<RequestsResponse>(`/platform/privacy-requests?${queryString}`), enabled:!invalidFilters, placeholderData:(previousData)=>previousData });
  const tenants=useQuery({ queryKey:['platform','privacy-request-tenants'], queryFn:()=>platformApiRequest<Tenant[]>('/platform/tenants'), enabled:canReadTenants });
  const users=useQuery({ queryKey:['platform','privacy-request-users'], queryFn:()=>platformApiRequest<PlatformUser[]>('/platform/users'), enabled:canReadUsers });

  const response=requests.data; const rows=response?.requests || []; const summary=response?.summary; const pagination=response?.pagination;
  const requestTypes=response?.request_types || REQUEST_TYPES; const statuses=response?.statuses || STATUSES; const priorities=response?.priorities || PRIORITIES;
  const initialError=requests.isError&&!response; const staleError=requests.isError&&Boolean(response);
  const pageNumber=Math.floor(offset/PAGE_SIZE)+1;
  const setFilter=(key:string,value:string)=>{ const next=new URLSearchParams(searchParams); if(value)next.set(key,value);else next.delete(key); setSearchParams(next,{replace:true}); };
  const refresh=()=>requests.refetch();
  const resetForm=()=>{setForm(emptyForm());setOriginalForm(null);setEditingId('');};
  const buildPayload=()=>{ const body:Record<string,unknown>={request_type:form.request_type,priority:form.priority,requester_name:clean(form.requester_name),requester_email:form.requester_email.trim(),subject_identifier:clean(form.subject_identifier),summary:form.summary.trim(),due_at:toIsoDateTimeOrNull(form.due_at)}; if(canReadTenants)body.tenant_id=form.tenant_id||null; if(canReadUsers)body.assigned_platform_user_id=form.assigned_platform_user_id||null; return body; };
  const invalidate=()=>queryClient.invalidateQueries({queryKey:['platform','privacy-requests']});

  const save=useMutation({ mutationFn:()=>platformApiRequest(editingId?`/platform/privacy-requests/${editingId}`:'/platform/privacy-requests',{method:editingId?'PATCH':'POST',body:JSON.stringify(buildPayload())}), onSuccess:()=>{setMessage(editingId?'Privacy request details saved.':'Privacy request created in Intake.');setMutationError('');resetForm();invalidate();}, onError:(error)=>setMutationError(readableError(error)) });
  const workflow=useMutation({ mutationFn:({id,nextStatus}:{id:string;nextStatus:string})=>platformApiRequest(`/platform/privacy-requests/${id}/status`,{method:'POST',body:JSON.stringify({status:nextStatus,note:clean(actionNotes[id]||'')})}), onSuccess:(_,variables)=>{setMessage(`Workflow status recorded as ${pretty(variables.nextStatus)}.`);setMutationError('');invalidate();}, onError:(error)=>setMutationError(readableError(error)) });
  const verify=useMutation({ mutationFn:(id:string)=>platformApiRequest(`/platform/privacy-requests/${id}/verify`,{method:'POST',body:JSON.stringify({notes:clean(actionNotes[id]||'')})}), onSuccess:(_,id)=>{setMessage('Verification action recorded.');setMutationError('');setActionNotes((current)=>({...current,[id]:''}));invalidate();}, onError:(error)=>setMutationError(readableError(error)) });
  const close=useMutation({ mutationFn:({id,nextStatus}:{id:string;nextStatus:string})=>platformApiRequest(`/platform/privacy-requests/${id}/close`,{method:'POST',body:JSON.stringify({status:nextStatus,resolution_notes:clean(actionNotes[id]||''),rejection_reason:nextStatus==='rejected'?clean(rejectReasons[id]||''):null})}), onSuccess:(_,variables)=>{setMessage(`Privacy request recorded as ${pretty(variables.nextStatus)}.`);setMutationError('');setActionNotes((current)=>({...current,[variables.id]:''}));setRejectReasons((current)=>({...current,[variables.id]:''}));invalidate();}, onError:(error)=>setMutationError(readableError(error)) });

  const beginEdit=(row:PrivacyRequest)=>{const next=toForm(row);setEditingId(row.id);setForm(next);setOriginalForm(next);setMessage('');setMutationError('');scrollToFormSection('platform-privacy-requests-form');};
  const validForm=Boolean(form.requester_email.trim()&&form.summary.trim()&&validEmail(form.requester_email)&&(!form.due_at||toIsoDateTimeOrNull(form.due_at)));
  const canSave=canWrite&&validForm&&!save.isPending&&(!editingId||!sameForm(originalForm,form));

  return <div className="io-operational-page io-workspace-page platform-privacy-requests io-operational-workspace">
    <OperationalWorkspaceHero iconPath="/platform/privacy-requests" eyebrow="Platform governance" title="Privacy requests" description="Track Platform-recorded privacy/data-subject requests, workflow deadlines, verification actions and closure evidence without bypassing tenant or Platform-user identity permissions." meta={<><OperationalWorkspaceMetaPill>Registry-wide filtered summary</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>{response?.evidence_access.tenant_identity?'Tenant identity available':'Tenant identity restricted'}</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>{response?.evidence_access.platform_user_identity?'Platform-user identity available':'Platform-user identity restricted'}</OperationalWorkspaceMetaPill></>} aside={<div className="platform-privacy-requests__hero-aside"><OperationalWorkspaceStatus value="Application evidence" label="Not external legal verification"/><button type="button" className="app-button app-button--secondary" onClick={refresh} disabled={requests.isFetching}>{requests.isFetching?'Refreshing…':'Refresh'}</button></div>} />

    {message?<div className="platform-privacy-requests__success">{message}<button type="button" className="app-button app-button--secondary" onClick={()=>setMessage('')}>Dismiss</button></div>:null}
    {mutationError?<div className="platform-privacy-requests__warning"><strong>Action failed.</strong><span>{mutationError}</span></div>:null}
    {staleError?<div className="platform-privacy-requests__warning"><strong>Showing the last successful snapshot.</strong><span>{readableError(requests.error)}</span><button type="button" className="app-button app-button--secondary" onClick={()=>requests.refetch()}>Retry</button></div>:null}
    <div className="platform-privacy-requests__truth-note"><strong>Evidence boundary</strong><span>Requester fields, workflow status, recorded verification and closure actions are Platform application evidence. They do not prove external identity verification, satisfaction of a legal right, delivery/receipt, legal advice, or compliance with a real-world statutory deadline.</span></div>

    <OperationalWorkspaceStats ariaLabel="Privacy request registry summary">
      <OperationalWorkspaceStatCard label="Filtered requests" value={summary?.total ?? '—'} helper="Registry-wide filtered total" tone="red" iconPath="/platform/privacy-requests" />
      <OperationalWorkspaceStatCard label="Open" value={summary?.open ?? '—'} helper="Non-terminal application workflow" tone="warn" iconPath="/platform/privacy-requests" />
      <OperationalWorkspaceStatCard label="Overdue" value={summary?.overdue ?? '—'} helper="Recorded due date exceeded" tone="danger" iconPath="/platform/privacy-requests" />
      <OperationalWorkspaceStatCard label="Waiting tenant" value={summary?.waiting_tenant ?? '—'} helper="Recorded workflow state" tone="warn" iconPath="/platform/privacy-requests" />
      <OperationalWorkspaceStatCard label="High priority open" value={summary?.high_priority_open ?? '—'} helper="High / urgent and non-terminal" tone="danger" iconPath="/platform/privacy-requests" />
      <OperationalWorkspaceStatCard label="Verification attention" value={summary?.verification_attention ?? '—'} helper="No verification action recorded" tone="neutral" iconPath="/platform/privacy-requests" />
    </OperationalWorkspaceStats>

    <section className="io-workspace-panel platform-privacy-requests__section">
      <OperationalSectionHeader iconPath="/platform/privacy-requests" title="Filter registry" description="Filters are URL-backed. Tenant and assignee filters appear only when the corresponding source identity permission is available." />
      <div className="platform-privacy-requests__filter-grid">
        <label className="platform-privacy-requests__search">Search<input value={search} maxLength={200} onChange={(e)=>setFilter('search',e.target.value)} placeholder="Requester, subject or summary" /></label>
        <label>Status<select value={status} onChange={(e)=>setFilter('status',e.target.value)}><option value="">All statuses</option>{statuses.map((item)=><option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label>Request type<select value={requestType} onChange={(e)=>setFilter('request_type',e.target.value)}><option value="">All types</option>{requestTypes.map((item)=><option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        {canReadTenants?<label>Tenant<select value={tenantId} onChange={(e)=>setFilter('tenant_id',e.target.value)}><option value="">All tenants</option>{(tenants.data||[]).map((tenant)=><option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>:<div className="platform-privacy-requests__restricted"><strong>Tenant filter restricted</strong><span>TENANTS_READ is required.</span></div>}
        {canReadUsers?<label>Assignee<select value={assigneeId} onChange={(e)=>setFilter('assigned_platform_user_id',e.target.value)}><option value="">All assignees</option>{(users.data||[]).map((user)=><option key={user.id} value={user.id}>{user.email}</option>)}</select></label>:<div className="platform-privacy-requests__restricted"><strong>Assignee filter restricted</strong><span>PLATFORM_USERS_READ is required.</span></div>}
        <label className="platform-privacy-requests__checkbox"><input type="checkbox" checked={overdue} onChange={(e)=>setFilter('overdue',e.target.checked?'true':'')} /> Recorded due date overdue</label>
      </div>
    </section>

    {canWrite?<section id="platform-privacy-requests-form" className="io-workspace-panel platform-privacy-requests__section">
      <OperationalSectionHeader iconPath="/platform/privacy-requests" title={editingId?'Edit request details':'Create privacy request'} description={editingId?'Workflow status, verification and closure evidence are intentionally excluded from ordinary edits. Closed records are immutable.':'New records always enter Intake. Use the explicit workflow actions below to record later state changes.'} actions={editingId?<button type="button" className="app-button app-button--secondary" onClick={resetForm}>Cancel edit</button>:undefined}/>
      <div className="platform-privacy-requests__form-grid">
        <label>Request type<select value={form.request_type} onChange={(e)=>setForm({...form,request_type:e.target.value})}>{requestTypes.map((item)=><option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label>Priority<select value={form.priority} onChange={(e)=>setForm({...form,priority:e.target.value})}>{priorities.map((item)=><option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        {canReadTenants?<label>Tenant<select value={form.tenant_id} onChange={(e)=>setForm({...form,tenant_id:e.target.value})}><option value="">Platform-wide / none</option>{(tenants.data||[]).map((tenant)=><option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>:<div className="platform-privacy-requests__restricted"><strong>Tenant linkage preserved</strong><span>{editingId?'Existing restricted linkage is not changed by this edit.':'TENANTS_READ is required to link a tenant.'}</span></div>}
        {canReadUsers?<label>Assignee<select value={form.assigned_platform_user_id} onChange={(e)=>setForm({...form,assigned_platform_user_id:e.target.value})}><option value="">Unassigned</option>{(users.data||[]).filter((user)=>user.is_active!==false).map((user)=><option key={user.id} value={user.id}>{user.email}</option>)}</select></label>:<div className="platform-privacy-requests__restricted"><strong>Assignee linkage preserved</strong><span>{editingId?'Existing restricted linkage is not changed by this edit.':'PLATFORM_USERS_READ is required to assign a Platform user.'}</span></div>}
        <label>Requester name<input value={form.requester_name} maxLength={200} onChange={(e)=>setForm({...form,requester_name:e.target.value})} /></label>
        <label>Requester email<input type="email" value={form.requester_email} onChange={(e)=>setForm({...form,requester_email:e.target.value})} /></label>
        <label>Subject identifier<input value={form.subject_identifier} maxLength={255} onChange={(e)=>setForm({...form,subject_identifier:e.target.value})} /></label>
        <label>Recorded due at<input type="datetime-local" value={form.due_at} onChange={(e)=>setForm({...form,due_at:e.target.value})} /></label>
        <label className="platform-privacy-requests__span-all">Request summary<textarea value={form.summary} maxLength={4000} onChange={(e)=>setForm({...form,summary:e.target.value})} /></label>
      </div>
      {!validForm&&Boolean(form.requester_email||form.summary)?<div className="platform-privacy-requests__validation">Requester email and summary are required. Email and recorded due date must be valid.</div>:null}
      <div className="platform-privacy-requests__actions"><button type="button" className="app-button app-button--primary" disabled={!canSave} onClick={()=>save.mutate()}>{save.isPending?'Saving…':editingId?'Save details':'Create Intake request'}</button></div>
    </section>:null}

    <section className="io-workspace-panel platform-privacy-requests__section">
      <OperationalSectionHeader iconPath="/platform/privacy-requests" title="Privacy request evidence" description="Each card is one Platform registry record. Status, verification and closure are explicit auditable actions rather than ordinary field edits." />
      {invalidFilters?<div className="platform-privacy-requests__blocking-error"><strong>Invalid or unauthorized filter.</strong><span>Clear the URL filter or obtain the source permission required by that filter.</span></div>:initialError?<div className="platform-privacy-requests__blocking-error"><strong>Privacy requests could not be loaded.</strong><span>{readableError(requests.error)}</span><button type="button" className="app-button app-button--secondary" onClick={()=>requests.refetch()}>Retry</button></div>:requests.isPending?<div className="platform-privacy-requests__loading">Loading privacy requests…</div>:rows.length===0?<div className="platform-privacy-requests__empty"><strong>No matching application records.</strong><span>This does not prove that no external privacy/data-subject request exists outside this Platform registry.</span></div>:<div className="platform-privacy-requests__list">{rows.map((row)=>{
        const closed=isClosed(row.status); const note=actionNotes[row.id]||''; const rejectReason=rejectReasons[row.id]||'';
        return <article key={row.id} className="platform-privacy-requests__card">
          <div className="platform-privacy-requests__card-header"><div><h4>{row.requester_email}</h4><p>{row.summary}</p></div><div className="platform-privacy-requests__badges"><span data-tone={statusTone(row)}>{row.is_overdue?'Recorded deadline overdue':pretty(row.status)}</span><span>{pretty(row.request_type)}</span><span>{pretty(row.priority)}</span></div></div>
          <div className="platform-privacy-requests__metrics-grid">
            <div><span>Requester</span><strong>{row.requester_name || 'Name not recorded'}</strong><small>{row.subject_identifier || 'Subject identifier not recorded'}</small></div>
            <div><span>Tenant</span><strong>{row.tenant_name || (row.tenant_present?'Restricted tenant linkage':'Platform-wide / none')}</strong></div>
            <div><span>Assignee</span><strong>{row.assignee_email || (row.assignee_present?'Restricted Platform-user linkage':'Unassigned')}</strong></div>
            <div><span>Recorded due</span><strong>{dateTime(row.due_at)}</strong></div>
            <div><span>Verification</span><strong>{row.verified_at?dateTime(row.verified_at):'Not recorded'}</strong><small>{row.verified_by_email || (row.verifier_present?'Restricted verifier identity':'')}</small></div>
            <div><span>Closure</span><strong>{row.completed_at?dateTime(row.completed_at):'Open'}</strong><small>{row.completed_by_email || (row.completer_present?'Restricted closer identity':'')}</small></div>
          </div>
          {row.resolution_notes?<div className="platform-privacy-requests__evidence-note"><strong>Closure note</strong><span>{row.resolution_notes}</span></div>:null}
          {row.rejection_reason?<div className="platform-privacy-requests__evidence-note"><strong>Rejection reason</strong><span>{row.rejection_reason}</span></div>:null}
          <div className="platform-privacy-requests__card-footer"><div className="platform-privacy-requests__source-links">{row.tenant_id&&canReadTenants?<Link to={`/platform/tenants?tenant_id=${encodeURIComponent(row.tenant_id)}`}>Tenant</Link>:null}{canReadAudit?<Link to="/platform/audit">Audit evidence</Link>:null}</div>{canWrite&&!closed?<button type="button" className="app-button app-button--secondary" onClick={()=>beginEdit(row)}>Edit details</button>:closed?<span className="platform-privacy-requests__immutable">Closed history is immutable.</span>:null}</div>
          {canWrite&&!closed?<div className="platform-privacy-requests__workflow"><label>Action / closure note<input value={note} maxLength={4000} onChange={(e)=>setActionNotes((current)=>({...current,[row.id]:e.target.value}))} placeholder="Optional for workflow/verification; required in UI to fulfill" /></label><label>Rejection reason<input value={rejectReason} maxLength={2000} onChange={(e)=>setRejectReasons((current)=>({...current,[row.id]:e.target.value}))} placeholder="Required only when rejecting" /></label><div className="platform-privacy-requests__actions">
            {!row.verified_at&&row.status!=='verifying'?<button type="button" className="app-button app-button--secondary" disabled={workflow.isPending} onClick={()=>workflow.mutate({id:row.id,nextStatus:'verifying'})}>Start verification</button>:null}
            {!row.verified_at?<button type="button" className="app-button app-button--secondary" disabled={verify.isPending} onClick={()=>{if(window.confirm('Record the Platform verification action? This is application evidence only.'))verify.mutate(row.id);}}>Record verification</button>:null}
            {row.status!=='waiting_tenant'?<button type="button" className="app-button app-button--secondary" disabled={workflow.isPending} onClick={()=>workflow.mutate({id:row.id,nextStatus:'waiting_tenant'})}>Wait for tenant</button>:null}
            {row.status!=='in_progress'?<button type="button" className="app-button app-button--secondary" disabled={workflow.isPending} onClick={()=>workflow.mutate({id:row.id,nextStatus:'in_progress'})}>Resume in progress</button>:null}
            <button type="button" className="app-button app-button--primary" disabled={close.isPending||!note.trim()} onClick={()=>{if(window.confirm('Record this request as fulfilled? This records Platform closure evidence only.'))close.mutate({id:row.id,nextStatus:'fulfilled'});}}>Record fulfilled</button>
            <button type="button" className="app-button app-button--secondary" disabled={close.isPending||!rejectReason.trim()} onClick={()=>{if(window.confirm('Record this request as rejected?'))close.mutate({id:row.id,nextStatus:'rejected'});}}>Reject</button>
            <button type="button" className="app-button app-button--secondary" disabled={close.isPending} onClick={()=>{if(window.confirm('Cancel and close this privacy request record?'))close.mutate({id:row.id,nextStatus:'cancelled'});}}>Cancel request</button>
          </div></div>:null}
        </article>;
      })}</div>}
      {response?<div className="platform-privacy-requests__pagination"><button type="button" className="app-button app-button--secondary" disabled={offset===0||requests.isFetching} onClick={()=>setOffset((value)=>Math.max(0,value-PAGE_SIZE))}>Previous</button><span>Page {pageNumber} · up to {PAGE_SIZE} requests · {pagination?.total ?? 0} filtered total</span><button type="button" className="app-button app-button--secondary" disabled={!pagination?.has_more||requests.isFetching} onClick={()=>setOffset((value)=>value+PAGE_SIZE)}>Next</button></div>:null}
    </section>

    <section className="io-workspace-panel platform-privacy-requests__section"><OperationalSectionHeader iconPath="/platform/privacy-requests" title="Supporting operations" description="Only destinations allowed by the current Platform permission snapshot are shown."/><div className="platform-privacy-requests__supporting-links">{canReadCompliance?<><Link to="/platform/compliance-documents">Compliance documents</Link><Link to="/platform/compliance-export">Compliance export</Link><Link to="/platform/legal-compliance-reporting">Legal &amp; compliance reporting</Link></>:null}{canReadAccessReviews?<Link to="/platform/access-reviews">Access reviews</Link>:null}{canReadTenants?<Link to="/platform/tenants">Tenants</Link>:null}{canReadUsers?<Link to="/platform/users">Platform users</Link>:null}{canReadAudit?<Link to="/platform/audit">Platform audit</Link>:null}</div></section>
  </div>;
}
