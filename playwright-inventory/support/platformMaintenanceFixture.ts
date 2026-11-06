/** Batch 90 — synthetic Platform Maintenance browser fixture (GENERATED_UNRUN).
 * This is HTTP interception, not proof of real write-lock enforcement, PostgreSQL
 * transactions, customer notification, external maintenance or service health. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
export const maintenanceRoot='/platform/maintenance';
export const maintenanceTenantA='e9000000-0000-4000-8000-000000000001';
export const maintenanceTenantB='e9000000-0000-4000-8000-000000000002';
export const maintenanceActor='e9000000-0000-4000-8000-000000000003';
export const maintenancePermissions=['platform.dashboard.read','platform.maintenance.read','platform.maintenance.write',
 'platform.tenants.read','platform.users.read','platform.audit.read','platform.incidents.read','platform.releases.read',
 'platform.announcements.read','platform.jobs.read'];
export const scheduledWindow={id:'e9000000-0000-4000-8000-000000000011',title:'Fixture planned API maintenance',
 message:'Tenant-facing planned downtime',scope:'platform',tenant_id:null,tenant_name:null,tenant_status:null,tenant_present:false,
 starts_at:'2030-03-01T12:00:00Z',ends_at:'2030-03-01T14:00:00Z',status:'scheduled',lock_writes:false,
 created_by_platform_user_id:maintenanceActor,created_by_email:'maintainer@fixture.test',created_by_present:true,
 cancelled_by_platform_user_id:null,cancelled_by_email:null,cancelled_by_present:false,cancelled_at:null,
 cancellation_reason:null,completed_at:null,is_current:false,is_terminal:false};
export const activeWindow={...scheduledWindow,id:'e9000000-0000-4000-8000-000000000012',title:'Fixture active write lock',
 scope:'tenant',tenant_id:maintenanceTenantA,tenant_name:'Maintenance Tenant Alpha',tenant_status:'active',tenant_present:true,
 starts_at:'2025-11-01T09:00:00Z',ends_at:'2030-04-01T12:00:00Z',status:'active',lock_writes:true,is_current:true};
export const completedWindow={...scheduledWindow,id:'e9000000-0000-4000-8000-000000000013',title:'Fixture completed maintenance',
 starts_at:'2025-03-01T09:00:00Z',ends_at:'2025-03-01T11:00:00Z',status:'completed',is_terminal:true,
 completed_at:'2025-03-01T11:00:00Z'};
export const cancelledWindow={...scheduledWindow,id:'e9000000-0000-4000-8000-000000000014',title:'Fixture cancelled maintenance',
 status:'cancelled',is_terminal:true,cancellation_reason:'Synthetic maintenance cancellation',
 cancelled_at:'2026-11-01T14:00:00Z',cancelled_by_platform_user_id:maintenanceActor,
 cancelled_by_email:'maintainer@fixture.test',cancelled_by_present:true};
export type MaintenanceRecord=Record<string,any>;
export const manyMaintenanceWindows=(n:number):MaintenanceRecord[]=>Array.from({length:n},(_,i)=>({...scheduledWindow,
 id:`${String(i+1).padStart(8,'0')}-0000-4000-8000-${String(i+1000).padStart(12,'0')}`,
 title:`Fixture maintenance ${String(i+1).padStart(3,'0')}`}));
export type MaintenanceFixtureOptions={query?:string;permissions?:string[];records?:MaintenanceRecord[];expectHeading?:boolean;
 onCall?:(method:string,path:string,query:URLSearchParams,body:any)=>void;
 overrides?:Record<string,{status?:number;json:any}>;
 respond?:(method:string,path:string,query:URLSearchParams,body:any)=>Promise<{status?:number;json:any}|undefined>|{status?:number;json:any}|undefined};
export async function openPlatformMaintenance(page:Page,opts:MaintenanceFixtureOptions={}){
 targetBaseURL();const perms=opts.permissions??maintenancePermissions;const can=(p:string)=>perms.includes(p);
 let records:MaintenanceRecord[]=(opts.records??[scheduledWindow,activeWindow,completedWindow,cancelledWindow]).map(x=>({...x}));
 const access=()=>({tenant_identity:can('platform.tenants.read'),platform_user_identity:can('platform.users.read')});
 const toView=(r:MaintenanceRecord)=>({...r,tenant_name:can('platform.tenants.read')?r.tenant_name:null,
   created_by_email:can('platform.users.read')?r.created_by_email:null,
   cancelled_by_email:can('platform.users.read')?r.cancelled_by_email:null});
 const info=()=>{const a=access();return {available_sources:['maintenance_registry',...(a.tenant_identity?['tenant_registry']:[]),...(a.platform_user_identity?['platform_user_identity']:[])],
  omitted_sources:[...(a.tenant_identity?[]:['tenant_registry']),...(a.platform_user_identity?[]:['platform_user_identity'])],
  evidence_access:a,evidence_complete:a.tenant_identity&&a.platform_user_identity,
  evidence_contract:{application_maintenance_records_only:true,
   effective_phase_is_derived_from_application_time_and_terminal_state:true,
   lock_writes_is_an_application_request_guard_not_proof_of_external_downtime:true,
   tenant_message_is_tenant_visible_during_current_or_upcoming_non_terminal_windows:true,
   maintenance_completion_does_not_prove_external_work_or_customer_acceptance:true,
   maintenance_records_do_not_prove_customer_notification_delivery:true,
   maintenance_records_do_not_replace_external_service_health_or_change_execution_evidence:true},
  generated_at:'2026-11-05T08:00:00Z'};};
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const u=new URL(req.url()),path=u.pathname.replace(/^\/api(?=\/)/,''),q=u.searchParams,m=req.method();
  let body:any={};try{body=req.postDataJSON()??{};}catch{body={};}
  opts.onCall?.(m,path,q,body);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic refresh refused'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'maintainer@fixture.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions:perms});
  const override=(await opts.respond?.(m,path,q,body))??opts.overrides?.[`${m} ${path}`];
  if(override)return fulfillJson(route,override.json,override.status??200);
  if(m==='GET'&&path==='/platform/tenants')return fulfillJson(route,[
   {id:maintenanceTenantA,name:'Maintenance Tenant Alpha',status:'active'},
   {id:maintenanceTenantB,name:'Maintenance Tenant Beta',status:'archived'}]);
  if(m==='GET'&&path===maintenanceRoot){
   const status=q.get('status'),scope=q.get('scope'),tenant=q.get('tenant_id'),include=q.get('include_past')==='true',
    search=(q.get('search')||'').toLowerCase(),limit=Number(q.get('limit')||50),offset=Number(q.get('offset')||0);
   const selected=records.filter(r=>(include||!['completed','cancelled'].includes(r.status))&&(!status||r.status===status)&&
    (!scope||r.scope===scope)&&(!tenant||r.tenant_id===tenant)&&
    (!search||[r.title,r.message,r.cancellation_reason,...(can('platform.tenants.read')?[r.tenant_name]:[])].join(' ').toLowerCase().includes(search)));
   const count=(f:(r:MaintenanceRecord)=>boolean)=>selected.filter(f).length;
   return fulfillJson(route,{windows:selected.slice(offset,offset+limit).map(toView),summary:{total:selected.length,
    scheduled:count(r=>r.status==='scheduled'),active:count(r=>r.status==='active'),
    completed:count(r=>r.status==='completed'),cancelled:count(r=>r.status==='cancelled'),
    platform_scoped:count(r=>r.scope==='platform'),tenant_scoped:count(r=>r.scope==='tenant'),
    active_write_locks:count(r=>r.status==='active'&&r.lock_writes)},
    pagination:{limit,offset,total:selected.length,has_more:offset+limit<selected.length},...info()});
  }
  if(m==='POST'&&path===maintenanceRoot){const created={...scheduledWindow,...body,
    id:'e9000000-0000-4000-8000-000000000099',title:body.title,
    tenant_name:body.tenant_id?'Maintenance Tenant Alpha':null,tenant_present:Boolean(body.tenant_id)};
   records.unshift(created);return fulfillJson(route,toView(created),201);}
  const match=path.match(/^\/platform\/maintenance\/([^/]+)(?:\/(cancel|complete))?$/);
  if(match){const idx=records.findIndex(x=>x.id===match[1]);if(idx<0)return fulfillJson(route,{message:'Maintenance unavailable'},404);
   const r=records[idx];if(m==='GET'&&!match[2])return fulfillJson(route,toView(r));
   if(m==='PATCH'&&!match[2]){if(r.is_terminal)return fulfillJson(route,{message:'Window is terminal'},409);
    records[idx]={...r,...body};return fulfillJson(route,toView(records[idx]));}
   if(m==='POST'&&match[2]==='cancel'){if(r.is_terminal)return fulfillJson(route,{message:'Window is terminal'},409);
    records[idx]={...r,status:'cancelled',is_terminal:true,is_current:false,cancellation_reason:body.reason,
     cancelled_at:'2026-11-05T08:00:00Z',cancelled_by_email:'maintainer@fixture.test',cancelled_by_present:true};
    return fulfillJson(route,toView(records[idx]));}
   if(m==='POST'&&match[2]==='complete'){if(r.status!=='active')return fulfillJson(route,{message:'Not active'},409);
    records[idx]={...r,status:'completed',is_terminal:true,is_current:false,completed_at:'2026-11-05T08:00:00Z'};
    return fulfillJson(route,toView(records[idx]));}
  }
  return fulfillJson(route,[]);
 });
 await page.goto(`${maintenanceRoot}${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Maintenance',exact:true})).toBeVisible();
}
