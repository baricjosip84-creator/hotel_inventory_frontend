import { expect, type Page, type Route } from '@playwright/test';
import { targetBaseURL } from './environment';
import { fulfillJson } from './tenantSession';
import { syntheticJwt, SYNTHETIC_PLATFORM_USER_ID } from './platformSession';
import { TASK_TENANT_A, TASK_TENANT_B, taskTenants } from './tenantTasksFixture';

/** Batch 63: isolated tenant-health transport. Neither synthetic score nor scan proves real tenant safety, durability, or notification delivery. */
export const healthPermissions=[
 'platform.dashboard.read','platform.tenants.read','platform.incidents.read',
 'platform.support_sessions.read','platform.notifications.read','platform.audit.read',
 'platform.notifications.write','platform.billing.read'
];
const evidencePermissions:Record<string,string>={
 tenant_core:'platform.tenants.read', incidents:'platform.incidents.read',
 support_sessions:'platform.support_sessions.read',notifications:'platform.notifications.read',
 audit_activity:'platform.audit.read'
};
export type HealthRow={tenant_id:string;tenant_name:string;status:string;billing_status:string;plan_code:string;write_locked:boolean;score:number|null;band:'healthy'|'watch'|'risk'|'critical'|'partial';score_complete:boolean;last_activity_at:string|null;activity_evidence_complete:boolean;counts:Record<string,number|null>;usage:Array<{key:string;label:string;used:number;limit:number;percent_used:number}>;issues:Array<{source:string;code:string;severity:'info'|'warning'|'critical';points:number;message:string}>};
export const healthRows:HealthRow[]=[
 {tenant_id:TASK_TENANT_A,tenant_name:'Fixture Hotel',status:'active',billing_status:'active',plan_code:'standard',write_locked:false,score:92,band:'healthy',score_complete:true,last_activity_at:'2026-11-01T12:00:00Z',activity_evidence_complete:true,counts:{users:5,products:30,storage_locations:2,open_incidents:0,open_notifications:0,active_support_sessions:0,overdue_tasks:0},usage:[{key:'products',label:'Products',used:30,limit:100,percent_used:30}],issues:[]},
 {tenant_id:TASK_TENANT_B,tenant_name:'Fixture Warehouse',status:'suspended',billing_status:'overdue',plan_code:'starter',write_locked:true,score:42,band:'risk',score_complete:true,last_activity_at:'2026-10-20T12:00:00Z',activity_evidence_complete:true,counts:{users:2,products:9,storage_locations:1,open_incidents:2,open_notifications:1,active_support_sessions:1,overdue_tasks:3},usage:[{key:'products',label:'Products',used:95,limit:100,percent_used:95}],issues:[{source:'incidents',code:'open_major',severity:'critical',points:20,message:'Fixture major incident requires attention'}]}
];
export function makeHealthRow(i:number,patch:Partial<HealthRow>={}):HealthRow{
 return {...healthRows[0],tenant_id:`55555555-5555-4555-8555-${String(i).padStart(12,'0')}`,tenant_name:`Fixture health tenant ${String(i).padStart(3,'0')}`,usage:[],issues:[],...patch};
}
export type HealthOverride={status:number;json:unknown};
export type HealthFixtureOptions={query?:string;permissions?:string[];rows?:HealthRow[];tenants?:typeof taskTenants;
 responses?:Record<string,HealthOverride>;delayMs?:Record<string,number>;expectHeading?:boolean;
 respond?:(method:string,path:string,query:URLSearchParams,body:unknown)=>HealthOverride|undefined;
 onCall?:(method:string,path:string,query:URLSearchParams,body:unknown)=>void;};
export async function openTenantHealth(page:Page,opts:HealthFixtureOptions={}){
 targetBaseURL();const permissions=opts.permissions??healthPermissions;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const request=route.request();if(request.isNavigationRequest())return route.continue();
  const url=new URL(request.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=request.method(),query=url.searchParams;
  let body:unknown=null;if(method!=='GET')try{body=request.postDataJSON()}catch{body=request.postData()}
  opts.onCall?.(method,path,query,body);
  const key=`${method} ${path}`;
  if(opts.delayMs?.[key])await new Promise(resolve=>setTimeout(resolve,opts.delayMs?.[key]));
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'No synthetic cookie'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'health-fixture@example.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions});
  const dynamic=opts.respond?.(method,path,query,body);if(dynamic)return fulfillJson(route,dynamic.json,dynamic.status);
  const override=opts.responses?.[key];if(override)return fulfillJson(route,override.json,override.status);
  if(method==='GET'&&path==='/platform/tenants')return fulfillJson(route,opts.tenants??taskTenants);
  if(method==='GET'&&path==='/platform/tenant-health'){
   const available=Object.keys(evidencePermissions).filter(k=>permissions.includes(evidencePermissions[k]));
   const omitted=Object.keys(evidencePermissions).filter(k=>!available.includes(k));
   const complete=omitted.length===0;
   const scope=(opts.rows??healthRows).filter(t=>!query.get('tenant_id')||query.get('tenant_id')===t.tenant_id);
   const offset=Number(query.get('offset')||0),limit=Number(query.get('limit')||100);
   const rows=scope.slice(offset,offset+limit).map(r=>{
    if(complete)return r;
    return {...r,score:null,band:'partial',score_complete:false,last_activity_at:available.includes('audit_activity')?r.last_activity_at:null,
     activity_evidence_complete:available.includes('audit_activity'),counts:{...r.counts,open_incidents:available.includes('incidents')?r.counts.open_incidents:null,open_notifications:available.includes('notifications')?r.counts.open_notifications:null,active_support_sessions:available.includes('support_sessions')?r.counts.active_support_sessions:null}};
   });
   const summary={total:rows.length,healthy:0,watch:0,risk:0,critical:0,partial:0};
   for(const row of rows){summary[row.band]++;}
   return fulfillJson(route,{generated_at:'2026-11-04T14:00:00Z',evidence:{available,omitted,complete},summary_scope:'loaded_page',summary,pagination:{limit,offset,has_more:offset+limit<scope.length},tenants:rows});
  }
  if(method==='POST'&&path==='/platform/tenant-health/scan')return fulfillJson(route,{scanned_at:'2026-11-04T14:00:00Z',threshold:(body as {threshold?:number})?.threshold??70,
   tenants_checked:2,unhealthy_tenants:1,notifications_touched:2,created:1,refreshed:1,resolved_recovered:0,resolved_duplicates:0});
  return fulfillJson(route,[]);
 });
 await page.goto(`/platform/tenant-health${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Tenant health',exact:true})).toBeVisible();
}
export {TASK_TENANT_A,TASK_TENANT_B};
