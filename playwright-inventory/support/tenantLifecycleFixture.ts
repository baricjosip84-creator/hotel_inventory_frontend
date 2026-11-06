/** Batch 64 — synthetic read-only tenant-lifecycle governance transport.
 * The fixture does NOT prove real commercial readiness, DB state, authorization,
 * customer sign-off, provisioning, offboarding or external lifecycle completion. */
import { expect, type Page, type Route } from '@playwright/test';
import { targetBaseURL } from './environment';
import { fulfillJson } from './tenantSession';
import { syntheticJwt, SYNTHETIC_PLATFORM_USER_ID } from './platformSession';
import { TASK_TENANT_A, TASK_TENANT_B, taskTenants } from './tenantTasksFixture';

export const lifecyclePermissions = [
 'platform.dashboard.read','platform.tenants.read','platform.tenants.export',
 'platform.provisioning_presets.read','platform.billing.read','platform.sla.read',
 'platform.incidents.read','platform.support_sessions.read'
];
export const lifecycleStatuses = ['trial','active','suspended','maintenance','offboarding','archived'];
export type LifecycleRow={id:string;name:string;location:string|null;organization_type:string|null;
 status:string;lifecycle_bucket:string;billing_status:string;plan_code:string;write_locked:boolean;
 configuration_posture:'ready'|'attention_required'|'blocked';
 configuration_scope:'tenant_record_only';commercial_readiness_proven:false;blockers:string[];warnings:string[];
 feature_flag_count:number;limit_count:number;support_enabled:boolean;created_at:string|null;updated_at:string|null;};
export const lifecycleRows:LifecycleRow[]=[
 {id:TASK_TENANT_A,name:'Fixture Hotel',location:'Rijeka',organization_type:'hotel',status:'active',lifecycle_bucket:'active',billing_status:'active',plan_code:'standard',write_locked:false,configuration_posture:'ready',configuration_scope:'tenant_record_only',commercial_readiness_proven:false,blockers:[],warnings:[],feature_flag_count:4,limit_count:2,support_enabled:true,created_at:'2026-09-01T10:00:00Z',updated_at:'2026-11-02T10:00:00Z'},
 {id:TASK_TENANT_B,name:'Fixture Warehouse',location:null,organization_type:null,status:'offboarding',lifecycle_bucket:'offboarding',billing_status:'overdue',plan_code:'',write_locked:true,configuration_posture:'blocked',configuration_scope:'tenant_record_only',commercial_readiness_proven:false,blockers:['write_locked'],warnings:['billing_overdue'],feature_flag_count:0,limit_count:1,support_enabled:false,created_at:'2026-09-02T10:00:00Z',updated_at:null}
];
export function makeLifecycleRow(i:number,patch:Partial<LifecycleRow>={}):LifecycleRow{
 return {...lifecycleRows[0],id:`66666666-6666-4666-8666-${String(i).padStart(12,'0')}`,
 name:`Fixture lifecycle tenant ${String(i).padStart(3,'0')}`,...patch};
}
export type LifecycleOverride={status:number;json:unknown};
export type LifecycleFixtureOptions={query?:string;permissions?:string[];rows?:LifecycleRow[];
 tenants?:typeof taskTenants;expectHeading?:boolean;responses?:Record<string,LifecycleOverride>;
 respond?:(method:string,path:string,query:URLSearchParams)=>LifecycleOverride|undefined;
 onCall?:(method:string,path:string,query:URLSearchParams)=>void;delayMs?:Record<string,number>;};
export async function openTenantLifecycle(page:Page,opts:LifecycleFixtureOptions={}){
 targetBaseURL();const permissions=opts.permissions??lifecyclePermissions;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),q=url.searchParams;
  opts.onCall?.(method,path,q);
  const key=`${method} ${path}`;
  if(opts.delayMs?.[key])await new Promise(resolve=>setTimeout(resolve,opts.delayMs?.[key]));
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'No synthetic refresh cookie'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'lifecycle-fixture@example.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions});
  const reply=opts.respond?.(method,path,q);if(reply)return fulfillJson(route,reply.json,reply.status);
  const override=opts.responses?.[key];if(override)return fulfillJson(route,override.json,override.status);
  if(path==='/platform/tenants'&&method==='GET')return fulfillJson(route,opts.tenants??taskTenants);
  if(path==='/platform/tenant-lifecycle/governance'&&method==='GET'){
   const matching=(opts.rows??lifecycleRows).filter(r=>(!q.get('tenant_id')||r.id===q.get('tenant_id'))&&(!q.get('status')||r.status===q.get('status')));
   const offset=Number(q.get('offset')||0),limit=Number(q.get('limit')||100),rows=matching.slice(offset,offset+limit);
   return fulfillJson(route,{feature:'tenant_lifecycle_governance',phase:1,step:1,generated_at:'2026-11-04T15:00:00Z',posture:'configuration_only',summary_scope:'loaded_page',
    summary:{loaded_tenants:rows.length,active_lifecycle_tenants:rows.filter(r=>r.status==='active').length,
     attention_lifecycle_tenants:rows.filter(r=>r.status==='maintenance'||r.status==='suspended').length,
     closed_lifecycle_tenants:rows.filter(r=>r.status==='archived').length,
     write_locked_tenants:rows.filter(r=>r.write_locked).length,billing_attention_tenants:rows.filter(r=>r.billing_status==='overdue').length,
     configuration_blocked_tenants:rows.filter(r=>r.configuration_posture==='blocked').length,
     configuration_attention_tenants:rows.filter(r=>r.configuration_posture==='attention_required').length,
     configuration_ready_tenants:rows.filter(r=>r.configuration_posture==='ready').length,
     offboarding_tenants:rows.filter(r=>r.status==='offboarding').length},
    pagination:{limit,offset,has_more:offset+limit<matching.length},
    governance_controls:{read_only:true,mutation_owner:'tenant_management',evidence_scope:'tenant_record_configuration_only',external_evidence_consumed:false,commercial_readiness_proven:false,supporting_routes_are_evidence:false,
     supporting_routes:[{route:'/api/platform/tenants',purpose:'Tenant record',permission:'TENANTS_READ'},
      {route:'/api/platform/tenant-exports',purpose:'Export package',permission:'TENANTS_EXPORT'},
      {route:'/api/platform/tenant-health',purpose:'Health snapshot',permission:'TENANTS_READ'}]},tenants:rows});
  }
  return fulfillJson(route,[]);
 });
 await page.goto(`/platform/tenant-lifecycle${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Tenant lifecycle',exact:true})).toBeVisible();
}
export {TASK_TENANT_A,TASK_TENANT_B};
