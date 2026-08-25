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
import './PlatformTenantOffboardingPage.css';

type Tenant = { id:string; name:string; status?:string; write_locked?:boolean };
type PlatformUser = { id:string; email:string; is_active?:boolean };
type Pagination = { limit:number; offset:number; total:number; has_more:boolean };
type EvidenceAccess = { tenant_identity:boolean; platform_user_identity:boolean; tenant_sessions:boolean; support_sessions:boolean; incidents:boolean; tenant_tasks:boolean; export_audit:boolean; data_retention:boolean; billing:boolean };
type Checks = { tenant_user_count:number|null; tenant_write_locked:boolean|null; tenant_status:string|null; billing_status:string|null; active_tenant_sessions:number|null; active_support_sessions:number|null; open_incidents:number|null; open_tasks:number|null; last_export_at?:string|null; legal_hold:boolean|null; legal_hold_reason?:string|null; retain_until?:string|null; purge_after_offboarding:boolean|null };
type OffboardingRow = { id:string; tenant_id:string; tenant_name:string; tenant_status?:string|null; write_locked?:boolean; billing_status?:string|null; status:string; reason?:string|null; scheduled_for?:string|null; owner_platform_user_id?:string|null; owner_platform_user_email?:string|null; owner_present?:boolean; creator_present?:boolean; completer_present?:boolean; checklist:Record<string,boolean>; checklist_complete?:boolean; notes?:string|null; completed_at?:string|null; updated_at?:string|null };
type ListResponse = { offboarding:OffboardingRow[]; statuses:string[]; checklist_keys:string[]; summary:{total:number;active:number;blocked:number;ready_to_archive:number;completed:number;cancelled:number;checklist_complete:number}; pagination:Pagination; evidence_access:EvidenceAccess; available_sources:string[]; omitted_sources:string[]; completion_evidence_complete:boolean; evidence_contract:Record<string,boolean> };
type DetailResponse = { offboarding:OffboardingRow|null; checks:Checks; evidence_access:EvidenceAccess; available_sources:string[]; omitted_sources:string[]; completion_evidence_complete:boolean; evidence_contract:Record<string,boolean> };
type FormState = { tenant_id:string; reason:string; scheduled_for:string; owner_platform_user_id:string; notes:string; checklist:Record<string,boolean> };

const PAGE_SIZE=50;
const STATUSES=['not_started','planned','in_progress','blocked','ready_to_archive','completed','cancelled'];
const EDITABLE_STATUSES=['planned','in_progress','blocked','ready_to_archive'];
const CHECKLIST_KEYS=['customer_notified','billing_closed','final_export_completed','active_users_reviewed','active_sessions_revoked','support_sessions_closed','open_incidents_resolved','open_tasks_closed','tenant_locked','data_retention_confirmed'];
const LABELS:Record<string,string>={customer_notified:'Customer notified',billing_closed:'Billing closed',final_export_completed:'Final export completed',active_users_reviewed:'Active users reviewed',active_sessions_revoked:'Active sessions revoked',support_sessions_closed:'Support sessions closed',open_incidents_resolved:'Open incidents resolved',open_tasks_closed:'Open tasks closed',tenant_locked:'Tenant locked',data_retention_confirmed:'Data retention confirmed'};
const emptyChecklist=()=>Object.fromEntries(CHECKLIST_KEYS.map((key)=>[key,false]));
const emptyForm=():FormState=>({tenant_id:'',reason:'',scheduled_for:'',owner_platform_user_id:'',notes:'',checklist:emptyChecklist()});
function readableError(error:unknown){return error instanceof ApiError||error instanceof Error?error.message:'Unknown error';}
function clean(value:string){const v=value.trim();return v||null;}
function pretty(value?:string|null){const v=String(value||'').replaceAll('_',' ').trim();return v?v.charAt(0).toUpperCase()+v.slice(1):'Not recorded';}
function dateTime(value?:string|null){if(!value)return 'Not recorded';const d=new Date(value);return Number.isNaN(d.getTime())?'Not recorded':d.toLocaleString();}
function toLocalDateTimeInput(value?:string|null){if(!value)return '';const d=new Date(value);if(Number.isNaN(d.getTime()))return '';const pad=(n:number)=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;}
function toIsoDateTimeOrNull(value:string){if(!value)return null;const d=new Date(value);return Number.isNaN(d.getTime())?null:d.toISOString();}
function terminal(status:string){return status==='completed'||status==='cancelled';}
function tone(status:string){if(status==='completed')return 'good';if(status==='blocked'||status==='cancelled')return 'danger';if(status==='ready_to_archive')return 'warn';return 'red';}

export default function PlatformTenantOffboardingPage(){
  const qc=useQueryClient();
  const [params,setParams]=useSearchParams();
  const canWrite=hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_UPDATE);
  const canReadUsers=hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canReadSessions=hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ);
  const canReadSupport=hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ);
  const canReadIncidents=hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ);
  const canReadRetention=hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DATA_RETENTION_READ);
  const canReadBilling=hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ);
  const canExport=hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT);
  const canReadAudit=hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);
  const canLock=hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_LOCK);
  const canCompletionEvidence=canReadSessions&&canReadSupport&&canReadIncidents&&canReadRetention;

  const search=params.get('search')||'';
  const status=params.get('status')||'';
  const tenantId=params.get('tenant_id')||'';
  const ownerId=params.get('owner_platform_user_id')||'';
  const includeCompleted=params.get('include_completed')!=='false';
  const offset=Math.max(0,Number(params.get('offset')||0)||0);
  const [editingTenantId,setEditingTenantId]=useState<string|null>(null);
  const [inspectedTenantId,setInspectedTenantId]=useState<string>(tenantId);
  const [form,setForm]=useState<FormState>(emptyForm());
  const [archiveOnComplete,setArchiveOnComplete]=useState(canLock);
  const [cancelReasons,setCancelReasons]=useState<Record<string,string>>({});
  const [message,setMessage]=useState<string|null>(null);

  const tenants=useQuery({queryKey:['platform','tenants','offboarding-directory'],queryFn:()=>platformApiRequest<Tenant[]>('/platform/tenants')});
  const users=useQuery({queryKey:['platform','users','offboarding-directory'],queryFn:()=>platformApiRequest<PlatformUser[]>('/platform/users'),enabled:canReadUsers});
  const query=useMemo(()=>{const q=new URLSearchParams();if(search)q.set('search',search);if(status)q.set('status',status);if(tenantId)q.set('tenant_id',tenantId);if(ownerId)q.set('owner_platform_user_id',ownerId);q.set('include_completed',String(includeCompleted));q.set('limit',String(PAGE_SIZE));q.set('offset',String(offset));return q.toString();},[search,status,tenantId,ownerId,includeCompleted,offset]);
  const list=useQuery({queryKey:['platform','tenant-offboarding',query],queryFn:()=>platformApiRequest<ListResponse>(`/platform/tenant-offboarding?${query}`)});
  const detail=useQuery({queryKey:['platform','tenant-offboarding-detail',inspectedTenantId],queryFn:()=>platformApiRequest<DetailResponse>(`/platform/tenant-offboarding/${inspectedTenantId}`),enabled:Boolean(inspectedTenantId)});
  const rows=list.data?.offboarding||[];
  const summary=list.data?.summary;
  const pagination=list.data?.pagination;
  const initialError=Boolean(list.error&&!list.data);
  const staleWarning=Boolean(list.error&&list.data);
  const mutationBusy=false;

  useEffect(()=>{if(tenantId&&!inspectedTenantId)setInspectedTenantId(tenantId);},[tenantId,inspectedTenantId]);
  const setFilter=(key:string,value:string)=>{const next=new URLSearchParams(params);if(value)next.set(key,value);else next.delete(key);next.delete('offset');setParams(next,{replace:true});};
  const setOffset=(nextOffset:number)=>{const next=new URLSearchParams(params);next.set('offset',String(Math.max(0,nextOffset)));setParams(next,{replace:true});};
  const refresh=()=>{setMessage(null);list.refetch();tenants.refetch();if(canReadUsers)users.refetch();if(inspectedTenantId)detail.refetch();};
  const invalidate=async()=>{await Promise.all([qc.invalidateQueries({queryKey:['platform','tenant-offboarding']}),qc.invalidateQueries({queryKey:['platform','tenant-offboarding-detail']}),qc.invalidateQueries({queryKey:['platform','tenants']})]);};
  const resetForm=()=>{setEditingTenantId(null);setForm(emptyForm());};
  const beginCreate=()=>{setEditingTenantId(null);setForm({...emptyForm(),tenant_id:tenantId});scrollToFormSection('platform-tenant-offboarding-form');};
  const beginEdit=(row:OffboardingRow)=>{setEditingTenantId(row.tenant_id);setForm({tenant_id:row.tenant_id,reason:row.reason||'',scheduled_for:toLocalDateTimeInput(row.scheduled_for),owner_platform_user_id:row.owner_platform_user_id||'',notes:row.notes||'',checklist:{...emptyChecklist(),...(row.checklist||{})}});setInspectedTenantId(row.tenant_id);scrollToFormSection('platform-tenant-offboarding-form');};

  const save=useMutation({mutationFn:()=>platformApiRequest(editingTenantId?`/platform/tenant-offboarding/${editingTenantId}`:'/platform/tenant-offboarding',{method:editingTenantId?'PATCH':'POST',body:JSON.stringify({...(editingTenantId?{}:{tenant_id:form.tenant_id}),reason:clean(form.reason),scheduled_for:toIsoDateTimeOrNull(form.scheduled_for),...(canReadUsers?{owner_platform_user_id:form.owner_platform_user_id||null}:{}),notes:clean(form.notes),checklist:form.checklist})}),onSuccess:async()=>{setMessage(editingTenantId?'Offboarding details updated.':'Offboarding workflow created in Planned status.');await invalidate();resetForm();},onError:()=>setMessage(null)});
  const changeStatus=useMutation({mutationFn:({id,nextStatus}:{id:string;nextStatus:string})=>platformApiRequest(`/platform/tenant-offboarding/${id}/status`,{method:'POST',body:JSON.stringify({status:nextStatus})}),onSuccess:async()=>{setMessage('Offboarding workflow status recorded.');await invalidate();},onError:()=>setMessage(null)});
  const complete=useMutation({mutationFn:(id:string)=>platformApiRequest(`/platform/tenant-offboarding/${id}/complete`,{method:'POST',body:JSON.stringify({archive_tenant:archiveOnComplete})}),onSuccess:async()=>{setMessage(archiveOnComplete?'Offboarding completed; tenant archived and write-locked in the application.':'Offboarding workflow completed without changing tenant lifecycle state.');await invalidate();},onError:()=>setMessage(null)});
  const cancel=useMutation({mutationFn:(id:string)=>platformApiRequest(`/platform/tenant-offboarding/${id}/cancel`,{method:'POST',body:JSON.stringify({reason:clean(cancelReasons[id]||'')})}),onSuccess:async()=>{setMessage('Offboarding workflow cancelled. Tenant lifecycle status was not changed automatically.');await invalidate();},onError:()=>setMessage(null)});

  const mutationError=save.error||changeStatus.error||complete.error||cancel.error;
  const validForm=Boolean(form.tenant_id&&!Number.isNaN(form.scheduled_for?new Date(form.scheduled_for).getTime():0));
  const canSave=canWrite&&validForm&&!save.isPending;
  const selected=detail.data?.offboarding||null;
  const checks=detail.data?.checks||null;
  const blockerCount=checks?[checks.active_tenant_sessions,checks.active_support_sessions,checks.open_incidents,checks.open_tasks].filter((v)=>typeof v==='number'&&v>0).length+(checks.legal_hold?1:0):0;

  return <div className="io-operational-page io-workspace-page platform-tenant-offboarding">
    <OperationalWorkspaceHero iconPath="/platform/tenant-offboarding" eyebrow="Platform governance" title="Tenant offboarding" description="Coordinate Platform-recorded tenant shutdown, operational blocker checks, final application archive/write-lock actions and offboarding evidence without treating operator checklist assertions as proof of external outcomes." meta={<><OperationalWorkspaceMetaPill>Registry-wide filtered summary</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>{list.data?.completion_evidence_complete?'Completion blocker evidence available':'Completion blocker evidence partial'}</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>{canReadUsers?'Platform-user identity available':'Owner identity restricted'}</OperationalWorkspaceMetaPill></>} aside={<div className="platform-tenant-offboarding__hero-aside"><OperationalWorkspaceStatus value="Application evidence" label="Not proof of external closure"/><button type="button" className="app-button app-button--secondary" onClick={refresh} disabled={list.isFetching}>{list.isFetching?'Refreshing…':'Refresh'}</button></div>} />

    {staleWarning?<div className="platform-tenant-offboarding__warning"><strong>Showing the last successful snapshot.</strong><span>{readableError(list.error)}</span></div>:null}
    {message?<div className="platform-tenant-offboarding__success"><span>{message}</span><button type="button" className="app-button app-button--secondary" onClick={()=>setMessage(null)}>Dismiss</button></div>:null}
    <div className="platform-tenant-offboarding__truth-note"><strong>Evidence boundary</strong><span>Checklist items are operator-recorded assertions. A completed workflow or archived tenant record does not prove customer notification, billing settlement, external export delivery/receipt, backup deletion, legal compliance, or any other external outcome.</span></div>

    <OperationalWorkspaceStats ariaLabel="Tenant offboarding registry summary">
      <OperationalWorkspaceStatCard label="Filtered workflows" value={summary?.total??'—'} helper="Registry-wide filtered total" tone="red" iconPath="/platform/tenant-offboarding" />
      <OperationalWorkspaceStatCard label="Active" value={summary?.active??'—'} helper="Non-terminal application workflow" tone="warn" iconPath="/platform/tenant-offboarding" />
      <OperationalWorkspaceStatCard label="Blocked" value={summary?.blocked??'—'} helper="Recorded blocked status" tone="danger" iconPath="/platform/tenant-offboarding" />
      <OperationalWorkspaceStatCard label="Ready to archive" value={summary?.ready_to_archive??'—'} helper="Checklist + visible hard blockers cleared" tone="warn" iconPath="/platform/tenant-offboarding" />
      <OperationalWorkspaceStatCard label="Completed" value={summary?.completed??'—'} helper="Application workflow completion" tone="good" iconPath="/platform/tenant-offboarding" />
      <OperationalWorkspaceStatCard label="Checklist complete" value={summary?.checklist_complete??'—'} helper="Operator-recorded checklist only" tone="neutral" iconPath="/platform/tenant-offboarding" />
    </OperationalWorkspaceStats>

    <section className="io-workspace-panel platform-tenant-offboarding__section">
      <OperationalSectionHeader iconPath="/platform/tenant-offboarding" title="Filter offboarding registry" description="Filters persist in the URL. Owner filtering is available only when Platform-user identity permission is present." actions={canWrite?<button type="button" className="app-button app-button--primary" onClick={beginCreate}>Start workflow</button>:undefined}/>
      <div className="platform-tenant-offboarding__filter-grid">
        <label className="platform-tenant-offboarding__search">Search<input value={search} onChange={(e)=>setFilter('search',e.target.value)} placeholder="Tenant, reason or notes" /></label>
        <label>Status<select value={status} onChange={(e)=>setFilter('status',e.target.value)}><option value="">All statuses</option>{STATUSES.map((item)=><option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label>Tenant<select value={tenantId} onChange={(e)=>{setFilter('tenant_id',e.target.value);setInspectedTenantId(e.target.value);}}><option value="">All tenants</option>{(tenants.data||[]).map((tenant)=><option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
        {canReadUsers?<label>Owner<select value={ownerId} onChange={(e)=>setFilter('owner_platform_user_id',e.target.value)}><option value="">All owners</option>{(users.data||[]).map((user)=><option key={user.id} value={user.id}>{user.email}</option>)}</select></label>:<div className="platform-tenant-offboarding__restricted"><strong>Owner filter restricted</strong><span>PLATFORM_USERS_READ is required.</span></div>}
        <label className="platform-tenant-offboarding__checkbox"><input type="checkbox" checked={includeCompleted} onChange={(e)=>setFilter('include_completed',String(e.target.checked))}/> Include completed/cancelled history</label>
      </div>
    </section>

    {canWrite?<section id="platform-tenant-offboarding-form" className="io-workspace-panel platform-tenant-offboarding__section">
      <OperationalSectionHeader iconPath="/platform/tenant-offboarding" title={editingTenantId?'Edit offboarding details':'Start offboarding workflow'} description={editingTenantId?'Lifecycle status is intentionally excluded from ordinary edits. Terminal history is immutable.':'New workflows always start Planned. Later lifecycle changes use explicit actions.'} actions={editingTenantId?<button type="button" className="app-button app-button--secondary" onClick={resetForm}>Cancel edit</button>:undefined}/>
      <div className="platform-tenant-offboarding__form-grid">
        <label>Tenant<select value={form.tenant_id} disabled={Boolean(editingTenantId)} onChange={(e)=>setForm({...form,tenant_id:e.target.value})}><option value="">Select tenant</option>{(tenants.data||[]).map((tenant)=><option key={tenant.id} value={tenant.id} disabled={tenant.status==='archived'}>{tenant.name} · {pretty(tenant.status)}</option>)}</select></label>
        {canReadUsers?<label>Owner<select value={form.owner_platform_user_id} onChange={(e)=>setForm({...form,owner_platform_user_id:e.target.value})}><option value="">Unassigned</option>{(users.data||[]).filter((user)=>user.is_active!==false).map((user)=><option key={user.id} value={user.id}>{user.email}</option>)}</select></label>:<div className="platform-tenant-offboarding__restricted"><strong>Owner linkage preserved</strong><span>{editingTenantId?'Existing restricted linkage is not changed by this edit.':'PLATFORM_USERS_READ is required to assign an owner.'}</span></div>}
        <label>Scheduled for<input type="datetime-local" value={form.scheduled_for} onChange={(e)=>setForm({...form,scheduled_for:e.target.value})}/></label>
        <label className="platform-tenant-offboarding__span-all">Reason<textarea value={form.reason} maxLength={2000} onChange={(e)=>setForm({...form,reason:e.target.value})}/></label>
        <label className="platform-tenant-offboarding__span-all">Notes<textarea value={form.notes} maxLength={4000} onChange={(e)=>setForm({...form,notes:e.target.value})}/></label>
      </div>
      <div className="platform-tenant-offboarding__checklist">{CHECKLIST_KEYS.map((key)=><label key={key}><input type="checkbox" checked={Boolean(form.checklist[key])} onChange={(e)=>setForm({...form,checklist:{...form.checklist,[key]:e.target.checked}})}/><span>{LABELS[key]}</span></label>)}</div>
      <div className="platform-tenant-offboarding__validation">Checklist checks are operator assertions. Hard application blockers are re-read separately before Ready to archive and Complete actions.</div>
      <div className="platform-tenant-offboarding__actions"><button type="button" className="app-button app-button--primary" disabled={!canSave} onClick={()=>save.mutate()}>{save.isPending?'Saving…':editingTenantId?'Save details':'Create Planned workflow'}</button></div>
    </section>:null}

    {inspectedTenantId?<section className="io-workspace-panel platform-tenant-offboarding__section">
      <OperationalSectionHeader iconPath="/platform/tenant-offboarding" title="Selected tenant blocker evidence" description="Only source families you are permitted to read are queried. Missing permissions are shown as Restricted, never converted to zero." />
      {detail.isPending?<div className="platform-tenant-offboarding__loading">Loading selected tenant evidence…</div>:detail.error&&!detail.data?<div className="platform-tenant-offboarding__blocking-error"><strong>Selected tenant evidence could not be loaded.</strong><span>{readableError(detail.error)}</span><button type="button" className="app-button app-button--secondary" onClick={()=>detail.refetch()}>Retry</button></div>:checks?<><div className="platform-tenant-offboarding__metrics-grid">
        <div><span>Tenant sessions</span><strong>{checks.active_tenant_sessions===null?'Restricted':checks.active_tenant_sessions}</strong></div>
        <div><span>Support sessions</span><strong>{checks.active_support_sessions===null?'Restricted':checks.active_support_sessions}</strong></div>
        <div><span>Open incidents</span><strong>{checks.open_incidents===null?'Restricted':checks.open_incidents}</strong></div>
        <div><span>Open tenant tasks</span><strong>{checks.open_tasks===null?'Restricted':checks.open_tasks}</strong></div>
        <div><span>Legal hold</span><strong>{checks.legal_hold===null?'Restricted':checks.legal_hold?'Active':'None recorded'}</strong><small>{checks.legal_hold_reason||''}</small></div>
        <div><span>Tenant write lock</span><strong>{checks.tenant_write_locked===null?'Restricted':checks.tenant_write_locked?'Locked':'Not locked'}</strong></div>
        <div><span>Last export audit</span><strong>{detail.data?.evidence_access.export_audit?dateTime(checks.last_export_at):'Restricted'}</strong></div>
        <div><span>Billing status</span><strong>{checks.billing_status===null?'Restricted':pretty(checks.billing_status)}</strong></div>
      </div><div className="platform-tenant-offboarding__source-links">{canReadSessions?<Link to="/platform/sessions">Tenant sessions</Link>:null}{canReadSupport?<Link to="/platform/support-sessions">Support sessions</Link>:null}{canReadIncidents?<Link to={`/platform/incidents?tenant_id=${encodeURIComponent(inspectedTenantId)}`}>Incidents</Link>:null}<Link to={`/platform/tenant-tasks?tenant_id=${encodeURIComponent(inspectedTenantId)}`}>Tenant tasks</Link>{canExport?<Link to={`/platform/tenant-exports?tenant_id=${encodeURIComponent(inspectedTenantId)}`}>Tenant exports</Link>:null}{canReadRetention?<Link to={`/platform/data-retention?tenant_id=${encodeURIComponent(inspectedTenantId)}`}>Data retention</Link>:null}{canReadBilling?<Link to={`/platform/billing?tenant_id=${encodeURIComponent(inspectedTenantId)}`}>Billing</Link>:null}{canReadAudit?<Link to="/platform/audit">Audit</Link>:null}</div>{!detail.data?.completion_evidence_complete?<div className="platform-tenant-offboarding__warning"><strong>Completion evidence is partial.</strong><span>Ready-to-archive and completion actions fail closed until session, support, incident, task and data-retention evidence permissions are all available.</span></div>:blockerCount>0?<div className="platform-tenant-offboarding__warning"><strong>{blockerCount} hard application blocker{blockerCount===1?'':'s'} remain.</strong><span>Clear them before recording Ready to archive or completion.</span></div>:<div className="platform-tenant-offboarding__success"><span>No hard application blockers are visible in the permitted completion evidence.</span></div>}</>:null}
    </section>:null}

    <section className="io-workspace-panel platform-tenant-offboarding__section">
      <OperationalSectionHeader iconPath="/platform/tenant-offboarding" title="Offboarding workflow evidence" description="Each card is one Platform workflow record. Terminal application history is immutable; cancellation does not automatically restore or alter the tenant lifecycle status." />
      {initialError?<div className="platform-tenant-offboarding__blocking-error"><strong>Tenant offboarding could not be loaded.</strong><span>{readableError(list.error)}</span><button type="button" className="app-button app-button--secondary" onClick={()=>list.refetch()}>Retry</button></div>:list.isPending?<div className="platform-tenant-offboarding__loading">Loading offboarding workflows…</div>:rows.length===0?<div className="platform-tenant-offboarding__empty"><strong>No matching application workflows.</strong><span>This does not prove that no external customer offboarding activity exists outside this Platform registry.</span></div>:<div className="platform-tenant-offboarding__list">{rows.map((row)=>{
        const closed=terminal(row.status);const done=CHECKLIST_KEYS.filter((key)=>row.checklist?.[key]).length;const inspected=row.tenant_id===inspectedTenantId;
        return <article key={row.id} className="platform-tenant-offboarding__card" data-selected={inspected?'true':'false'}>
          <div className="platform-tenant-offboarding__card-header"><div><h4>{row.tenant_name}</h4><p>{row.reason||'No reason recorded.'}</p></div><div className="platform-tenant-offboarding__badges"><span data-tone={tone(row.status)}>{pretty(row.status)}</span><span>{done}/{CHECKLIST_KEYS.length} checklist</span><span>{row.write_locked?'Tenant locked':'Tenant not locked'}</span></div></div>
          <div className="platform-tenant-offboarding__metrics-grid"><div><span>Tenant lifecycle</span><strong>{pretty(row.tenant_status)}</strong></div><div><span>Owner</span><strong>{row.owner_platform_user_email||(row.owner_present?'Restricted Platform-user linkage':'Unassigned')}</strong></div><div><span>Scheduled</span><strong>{dateTime(row.scheduled_for)}</strong></div><div><span>Completed</span><strong>{dateTime(row.completed_at)}</strong></div><div><span>Checklist</span><strong>{row.checklist_complete?'Complete':'Incomplete'}</strong></div><div><span>Updated</span><strong>{dateTime(row.updated_at)}</strong></div></div>
          {row.notes?<div className="platform-tenant-offboarding__evidence-note"><strong>Notes</strong><span>{row.notes}</span></div>:null}
          <div className="platform-tenant-offboarding__card-footer"><div className="platform-tenant-offboarding__source-links"><button type="button" className="app-button app-button--secondary" onClick={()=>setInspectedTenantId(row.tenant_id)}>{inspected?'Evidence selected':'Inspect blockers'}</button><Link to={`/platform/tenants?tenant_id=${encodeURIComponent(row.tenant_id)}`}>Tenant</Link></div>{canWrite&&!closed?<button type="button" className="app-button app-button--secondary" onClick={()=>beginEdit(row)}>Edit details</button>:closed?<span className="platform-tenant-offboarding__immutable">Terminal history is immutable.</span>:null}</div>
          {canWrite&&!closed?<div className="platform-tenant-offboarding__workflow"><div className="platform-tenant-offboarding__actions">{EDITABLE_STATUSES.filter((item)=>item!==row.status).map((item)=><button key={item} type="button" className="app-button app-button--secondary" disabled={changeStatus.isPending||(item==='ready_to_archive'&&(!row.checklist_complete||!canCompletionEvidence))} onClick={()=>{if(item!=='ready_to_archive'||window.confirm('Record Ready to archive only after reviewing the application blocker evidence?'))changeStatus.mutate({id:row.tenant_id,nextStatus:item});}}>{item==='ready_to_archive'?'Record ready to archive':pretty(item)}</button>)}</div>
            {row.status==='ready_to_archive'?<div className="platform-tenant-offboarding__completion"><label className="platform-tenant-offboarding__checkbox"><input type="checkbox" checked={archiveOnComplete} disabled={!canLock} onChange={(e)=>setArchiveOnComplete(e.target.checked)}/> Archive + write-lock tenant on completion {canLock?'':'(TENANTS_LOCK required)'}</label><button type="button" className="app-button app-button--primary" disabled={complete.isPending||!canCompletionEvidence||(archiveOnComplete&&!canLock)} onClick={()=>{setInspectedTenantId(row.tenant_id);if(window.confirm('Complete this Platform offboarding workflow? External outcomes are not proven by this action.'))complete.mutate(row.tenant_id);}}>Complete offboarding</button></div>:null}
            <div className="platform-tenant-offboarding__cancel"><input value={cancelReasons[row.tenant_id]||''} maxLength={2000} placeholder="Optional cancellation reason" onChange={(e)=>setCancelReasons((current)=>({...current,[row.tenant_id]:e.target.value}))}/><button type="button" className="app-button app-button--secondary" disabled={cancel.isPending} onClick={()=>{if(window.confirm('Cancel this workflow record? Tenant lifecycle status will not be changed automatically.'))cancel.mutate(row.tenant_id);}}>Cancel workflow</button></div>
          </div>:null}
        </article>;
      })}</div>}
      {mutationError?<div className="platform-tenant-offboarding__blocking-error"><strong>Action failed.</strong><span>{readableError(mutationError)}</span></div>:null}
      {pagination?<div className="platform-tenant-offboarding__pagination"><button type="button" className="app-button app-button--secondary" disabled={offset===0||list.isFetching} onClick={()=>setOffset(Math.max(0,offset-PAGE_SIZE))}>Previous</button><span>Page {Math.floor(offset/PAGE_SIZE)+1} · up to {PAGE_SIZE} workflows · {pagination.total} filtered total</span><button type="button" className="app-button app-button--secondary" disabled={!pagination.has_more||list.isFetching} onClick={()=>setOffset(offset+PAGE_SIZE)}>Next</button></div>:null}
    </section>
  </div>;
}
