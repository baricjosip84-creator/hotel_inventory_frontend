/** Batch 88 — fully synthetic Platform Tenant Offboarding HTTP fixture; generated, NEVER run.
 * Operator checklist assertions, intercepted status changes and archive flags do not prove
 * real tenant lifecycle, external notice, billing settlement, export receipt or data erasure. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
export const offboardingRoot='/platform/tenant-offboarding';
export const offboardingTenantA='c8800000-0000-4000-8000-000000000001';
export const offboardingTenantB='c8800000-0000-4000-8000-000000000002';
export const offboardingTenantC='c8800000-0000-4000-8000-000000000003';
export const offboardingTenantD='c8800000-0000-4000-8000-000000000004';
export const offboardingOwnerId='c8800000-0000-4000-8000-000000000005';
export const offboardingPermissions=['platform.dashboard.read','platform.tenants.read','platform.tenants.update','platform.tenants.lock',
 'platform.users.read','platform.sessions.read','platform.support_sessions.read','platform.incidents.read','platform.data_retention.read',
 'platform.tenants.export','platform.audit.read','platform.billing.read'];
export const offboardingChecklistKeys=['customer_notified','billing_closed','final_export_completed','active_users_reviewed','active_sessions_revoked',
 'support_sessions_closed','open_incidents_resolved','open_tasks_closed','tenant_locked','data_retention_confirmed'];
export const emptyOffboardingChecklist=()=>Object.fromEntries(offboardingChecklistKeys.map(key=>[key,false]));
export const completeOffboardingChecklist=()=>Object.fromEntries(offboardingChecklistKeys.map(key=>[key,true]));
export const plannedOffboarding={id:'c8800000-0000-4000-8000-000000000011',tenant_id:offboardingTenantA,tenant_name:'Fixture Offboarding Alpha',
 tenant_status:'active',write_locked:false,billing_status:'active',status:'planned',reason:'Synthetic scheduled closure',scheduled_for:'2030-01-05T12:00:00Z',
 owner_platform_user_id:offboardingOwnerId,owner_platform_user_email:'owner@fixture.test',owner_present:true,creator_present:true,completer_present:false,
 checklist:emptyOffboardingChecklist(),checklist_complete:false,notes:'Synthetic pending customer notice',completed_at:null,updated_at:'2026-11-01T12:00:00Z'};
export const readyOffboarding={...plannedOffboarding,id:'c8800000-0000-4000-8000-000000000012',tenant_id:offboardingTenantB,
 tenant_name:'Fixture Offboarding Beta',status:'ready_to_archive',reason:'Synthetic checklist recorded',checklist:completeOffboardingChecklist(),
 checklist_complete:true,notes:'Ready for application completion',scheduled_for:'2030-02-05T12:00:00Z'};
export const completedOffboarding={...plannedOffboarding,id:'c8800000-0000-4000-8000-000000000013',tenant_id:offboardingTenantC,
 tenant_name:'Fixture Offboarding Gamma',status:'completed',tenant_status:'archived',write_locked:true,checklist:completeOffboardingChecklist(),
 checklist_complete:true,completed_at:'2026-10-01T12:00:00Z',notes:'Recorded completion, not external receipt'};
export const blockedOffboarding={...plannedOffboarding,id:'c8800000-0000-4000-8000-000000000014',tenant_id:offboardingTenantD,
 tenant_name:'Fixture Offboarding Delta',status:'blocked',reason:'Synthetic active application blockers',notes:'Requires blocker review'};
export type OffboardingRecord=Record<string,any>;
export const manyOffboardingRecords=(n:number):OffboardingRecord[]=>Array.from({length:n},(_,i)=>({...plannedOffboarding,
 id:`${String(i+1).padStart(8,'0')}-0000-4000-8000-${String(i+101).padStart(12,'0')}`,
 tenant_id:`${String(i+1).padStart(8,'0')}-0000-4000-8000-${String(i+1).padStart(12,'0')}`,
 tenant_name:`Offboarding Fixture ${String(i+1).padStart(3,'0')}`,notes:`Synthetic workflow ${i+1}`}));
export type OffboardingFixtureOptions={query?:string;permissions?:string[];records?:OffboardingRecord[];expectHeading?:boolean;
 onCall?:(method:string,path:string,query:URLSearchParams,body:any)=>void;
 overrides?:Record<string,{status?:number;json:any}>;
 respond?:(method:string,path:string,query:URLSearchParams,body:any)=>Promise<{status?:number;json:any}|undefined>|{status?:number;json:any}|undefined};
export async function openTenantOffboarding(page:Page,opts:OffboardingFixtureOptions={}){
 targetBaseURL();const perms=opts.permissions??offboardingPermissions;const has=(v:string)=>perms.includes(v);
 let records:OffboardingRecord[]=(opts.records??[plannedOffboarding,readyOffboarding,completedOffboarding,blockedOffboarding])
  .map(r=>({...r,checklist:{...r.checklist}}));
 const tenants=()=>[plannedOffboarding,readyOffboarding,completedOffboarding,blockedOffboarding,...records].filter((r,i,a)=>a.findIndex(v=>v.tenant_id===r.tenant_id)===i).map(r=>({id:r.tenant_id,name:r.tenant_name,status:r.tenant_status,write_locked:r.write_locked}));
 const sourceAccess=()=>({tenant_identity:has('platform.tenants.read'),platform_user_identity:has('platform.users.read'),
  tenant_sessions:has('platform.sessions.read'),support_sessions:has('platform.support_sessions.read'),incidents:has('platform.incidents.read'),
  tenant_tasks:has('platform.tenants.read'),export_audit:has('platform.tenants.export')&&has('platform.audit.read'),
  data_retention:has('platform.data_retention.read'),billing:has('platform.billing.read')});
 const evidence=()=>{const access=sourceAccess(),sources=['tenant_sessions','support_sessions','incidents','tenant_tasks','export_audit','data_retention','billing'] as const;
  return {evidence_access:access,available_sources:sources.filter(k=>access[k]),omitted_sources:sources.filter(k=>!access[k]),
   completion_evidence_complete:access.tenant_sessions&&access.support_sessions&&access.incidents&&access.tenant_tasks&&access.data_retention,
   evidence_contract:{application_registry_only:true,checklist_items_are_operator_recorded_assertions:true,
    completion_status_does_not_prove_external_customer_notice_billing_settlement_export_delivery_or_data_deletion:true,
    export_audit_event_does_not_prove_external_delivery_receipt_or_acceptance:true,
    retention_configuration_does_not_prove_external_or_backup_deletion:true,
    archive_action_updates_application_tenant_state_and_write_lock_only:true}};};
 const toView=(r:OffboardingRecord):OffboardingRecord=>({...r,checklist_complete:offboardingChecklistKeys.every(k=>Boolean(r.checklist?.[k])),
  owner_present:Boolean(r.owner_platform_user_id),...(!has('platform.users.read')?{owner_platform_user_id:null,owner_platform_user_email:null}:{})});
 const checks=(tenantId:string)=>{const blocked=tenantId===offboardingTenantA||tenantId===offboardingTenantD,access=sourceAccess();
  return {tenant_user_count:has('platform.tenants.read')?4:null,tenant_write_locked:has('platform.tenants.read')?false:null,
   tenant_status:'active',billing_status:access.billing?'active':null,active_tenant_sessions:access.tenant_sessions?(blocked?2:0):null,
   active_support_sessions:access.support_sessions?0:null,open_incidents:access.incidents?0:null,open_tasks:access.tenant_tasks?(blocked?1:0):null,
   last_export_at:access.export_audit?'2026-10-30T12:00:00Z':null,legal_hold:access.data_retention?false:null,
   legal_hold_reason:null,retain_until:null,purge_after_offboarding:access.data_retention?false:null};};
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const request=route.request();if(request.isNavigationRequest())return route.continue();
  const url=new URL(request.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),q=url.searchParams,m=request.method();
  let body:any={};try{body=request.postDataJSON()??{};}catch{body={};}opts.onCall?.(m,path,q,body);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic refresh denied'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'operator@fixture.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions:perms});
  const override=(await opts.respond?.(m,path,q,body))??opts.overrides?.[`${m} ${path}`];
  if(override)return fulfillJson(route,override.json,override.status??200);
  if(m==='GET'&&path==='/platform/tenants')return fulfillJson(route,tenants());
  if(m==='GET'&&path==='/platform/users')return fulfillJson(route,[{id:offboardingOwnerId,email:'owner@fixture.test',is_active:true},
    {id:'c8800000-0000-4000-8000-000000000006',email:'inactive@fixture.test',is_active:false}]);
  if(m==='GET'&&path===offboardingRoot){
   const search=(q.get('search')||'').toLowerCase(),status=q.get('status'),tenant=q.get('tenant_id'),owner=q.get('owner_platform_user_id');
   const include=q.get('include_completed')!=='false',limit=Number(q.get('limit')||50),offset=Number(q.get('offset')||0);
   const filtered=records.filter(r=>(!tenant||r.tenant_id===tenant)&&(!owner||r.owner_platform_user_id===owner)&&(!status||r.status===status)&&
    (include||!['completed','cancelled'].includes(r.status))&&(!search||[r.tenant_name,r.reason,r.notes,...(has('platform.users.read')?[r.owner_platform_user_email]:[])].join(' ').toLowerCase().includes(search)));
   const count=(predicate:(r:OffboardingRecord)=>boolean)=>filtered.filter(predicate).length;
   return fulfillJson(route,{offboarding:filtered.slice(offset,offset+limit).map(toView),
    statuses:['not_started','planned','in_progress','blocked','ready_to_archive','completed','cancelled'],checklist_keys:offboardingChecklistKeys,
    summary:{total:filtered.length,active:count(r=>!['completed','cancelled'].includes(r.status)),blocked:count(r=>r.status==='blocked'),
     ready_to_archive:count(r=>r.status==='ready_to_archive'),completed:count(r=>r.status==='completed'),cancelled:count(r=>r.status==='cancelled'),
     checklist_complete:count(r=>offboardingChecklistKeys.every(k=>Boolean(r.checklist?.[k])))},
    pagination:{limit,offset,total:filtered.length,has_more:offset+limit<filtered.length},...evidence()});
  }
  const match=path.match(/^\/platform\/tenant-offboarding\/([^/]+)(?:\/(status|complete|cancel))?$/);
  if(m==='POST'&&path===offboardingRoot){
   const tenant=tenants().find(t=>t.id===body.tenant_id);if(!tenant)return fulfillJson(route,{message:'Tenant required'},400);
   if(records.some(r=>r.tenant_id===tenant.id))return fulfillJson(route,{message:'Already exists'},409);
   const created:OffboardingRecord={...plannedOffboarding,id:'c8800000-0000-4000-8000-000000000020',tenant_id:tenant.id,
    tenant_name:tenant.name,tenant_status:tenant.status,status:'planned',reason:body.reason??null,notes:body.notes??null,
    owner_platform_user_id:body.owner_platform_user_id??null,owner_platform_user_email:body.owner_platform_user_id?'owner@fixture.test':null,
    owner_present:Boolean(body.owner_platform_user_id),checklist:{...emptyOffboardingChecklist(),...(body.checklist||{})},scheduled_for:body.scheduled_for??null};
   records.push(created);return fulfillJson(route,toView(created),201);
  }
  if(match){const idx=records.findIndex(r=>r.tenant_id===match[1]);if(idx<0)return fulfillJson(route,{message:'Unknown tenant'},404);
   if(m==='GET'&&!match[2])return fulfillJson(route,{offboarding:toView(records[idx]),checks:checks(match[1]),...evidence()});
   if(m==='PATCH'&&!match[2]){
    if(['completed','cancelled'].includes(records[idx].status))return fulfillJson(route,{message:'Terminal history immutable'},409);
    if('status' in body)return fulfillJson(route,{message:'Dedicated status action required'},400);
    records[idx]={...records[idx],...body,checklist:{...records[idx].checklist,...(body.checklist||{})}};
    return fulfillJson(route,toView(records[idx]));
   }
   if(m==='POST'&&match[2]==='status'){
    records[idx]={...records[idx],status:body.status};return fulfillJson(route,toView(records[idx]));
   }
   if(m==='POST'&&match[2]==='complete'){
    records[idx]={...records[idx],status:'completed',completed_at:new Date().toISOString(),
     tenant_status:body.archive_tenant?'archived':records[idx].tenant_status,write_locked:body.archive_tenant?true:records[idx].write_locked};
    return fulfillJson(route,toView(records[idx]));
   }
   if(m==='POST'&&match[2]==='cancel'){
    records[idx]={...records[idx],status:'cancelled',notes:records[idx].notes,reason:body.reason||records[idx].reason};
    return fulfillJson(route,toView(records[idx]));
   }
  }
  return fulfillJson(route,[]);
 });
 await page.goto(`${offboardingRoot}${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Tenant offboarding',exact:true})).toBeVisible();
}
