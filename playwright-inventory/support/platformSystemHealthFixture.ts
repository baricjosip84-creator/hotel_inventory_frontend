/** Batch 92: completely synthetic read-only System Health fixture, not a live infrastructure health probe.
 * All API responses are intercepted. Phase 2 is needed for database, tenant and external uptime assertions. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
export const healthRoot='/platform/system-health';
export const healthDiagnostics='/platform/diagnostics/stuck-idempotency';
export const healthTenantA='f9200000-0000-4000-8000-000000000001';
export const healthTenantB='f9200000-0000-4000-8000-000000000002';
export const healthTenantC='f9200000-0000-4000-8000-000000000003';
export const healthPermissions=['platform.dashboard.read','platform.system_health.read','platform.tenants.read',
 'platform.diagnostics.read','platform.incidents.read','platform.audit.read',
 'platform.sla.read','platform.support_sessions.read'];
export type HealthRow=Record<string,any>;
export const healthyTenant:HealthRow={tenant_id:healthTenantA,tenant_name:'Alpha Healthy Tenant',tenant_status:'active',
 status:'healthy',monitored:true,issue_count:0,affected_evidence_count:0,
 evidence:{blocking_alerts:0,negative_stock_rows:0,incomplete_finalized_shipments:0},issues:[],
 derived_alert_active:false,derived_alert_sync:'clear'};
export const degradedTenant:HealthRow={tenant_id:healthTenantB,tenant_name:'Beta Degraded Tenant',tenant_status:'active',
 status:'degraded',monitored:true,issue_count:3,affected_evidence_count:6,
 evidence:{blocking_alerts:2,negative_stock_rows:1,incomplete_finalized_shipments:3},
 issues:[{type:'BLOCKING_ALERTS',count:2,message:'2 unresolved tenant blocking alerts require investigation.'},
 {type:'NEGATIVE_STOCK',count:1,message:'1 stock row currently has negative quantity.'},
 {type:'FINALIZED_SHIPMENT_INCOMPLETE',count:3,message:'3 received shipments contain undocumented receiving shortages.'}],
 derived_alert_active:false,derived_alert_sync:'pending_creation'};
export const archivedTenant:HealthRow={tenant_id:healthTenantC,tenant_name:'Gamma Archived Tenant',tenant_status:'archived',
 status:'not_monitored',monitored:false,issue_count:null,affected_evidence_count:null,
 evidence:{blocking_alerts:null,negative_stock_rows:null,incomplete_finalized_shipments:null},issues:[],
 derived_alert_active:false,derived_alert_sync:'clear'};
export const pendingResolutionTenant:HealthRow={...healthyTenant,tenant_id:'f9200000-0000-4000-8000-000000000004',
 tenant_name:'Delta Resolved Evidence',derived_alert_active:true,derived_alert_sync:'pending_resolution'};
export const alignedTenant:HealthRow={...degradedTenant,tenant_id:'f9200000-0000-4000-8000-000000000005',
 tenant_name:'Epsilon Aligned Alert',derived_alert_active:true,derived_alert_sync:'aligned'};
export const diagnosticRow={id:'f9200000-0000-4000-8000-000000000021',method:'POST',path:'/api/inventory/adjust',
 created_at:'2026-05-01T10:00:00Z',expires_at:'2026-06-01T10:00:00Z',completed_at:null};
export const healthRows=(n:number):HealthRow[]=>Array.from({length:n},(_,i)=>({...healthyTenant,
 tenant_id:`${String(500+i).padStart(8,'0')}-0000-4000-8000-${String(500+i).padStart(12,'0')}`,
 tenant_name:`Synthetic health tenant ${String(i+1).padStart(3,'0')}`}));
export type HealthFixtureOptions={query?:string;permissions?:string[];rows?:HealthRow[];diagnostics?:Record<string,any>[];
 expectHeading?:boolean;onCall?:(method:string,path:string,query:URLSearchParams)=>void;
 overrides?:Record<string,{status?:number;json:any}>;
 respond?:(method:string,path:string,query:URLSearchParams)=>Promise<{status?:number;json:any}|undefined>|{status?:number;json:any}|undefined};
export async function openPlatformSystemHealth(page:Page,opts:HealthFixtureOptions={}){
 targetBaseURL();const perms=opts.permissions??healthPermissions;
 const rows=(opts.rows??[healthyTenant,degradedTenant,archivedTenant]).map(r=>({...r}));
 const diag=opts.diagnostics??[diagnosticRow];
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),q=url.searchParams,m=req.method();
  opts.onCall?.(m,path,q);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic refresh forbidden'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'health@fixture.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions:perms});
  const override=(await opts.respond?.(m,path,q))??opts.overrides?.[`${m} ${path}`];
  if(override)return fulfillJson(route,override.json,override.status??200);
  if(m==='GET'&&path===healthRoot){
   const tenant=q.get('tenant_id'),status=q.get('status'),term=(q.get('search')||'').trim().toLowerCase(),
    archived=q.get('include_archived')==='true',limit=Number(q.get('limit')||50),offset=Number(q.get('offset')||0);
   const selected=rows.filter(r=>(archived||Boolean(tenant)||status==='not_monitored'||r.tenant_status!=='archived')&&
    (!tenant||r.tenant_id===tenant)&&(!status||r.status===status)&&
    (!term||`${r.tenant_name} ${r.tenant_id}`.toLowerCase().includes(term)));
   const summary={total:selected.length,healthy:selected.filter(r=>r.status==='healthy').length,
    degraded:selected.filter(r=>r.status==='degraded').length,not_monitored:selected.filter(r=>r.status==='not_monitored').length,
    issue_categories:selected.reduce((n,r)=>n+(r.issue_count||0),0),
    affected_evidence:selected.reduce((n,r)=>n+(r.affected_evidence_count||0),0),
    derived_alerts_pending_resolution:selected.filter(r=>r.derived_alert_sync==='pending_resolution').length,
    derived_alerts_pending_creation:selected.filter(r=>r.derived_alert_sync==='pending_creation').length};
   return fulfillJson(route,{generated_at:'2026-11-05T09:00:00Z',tenants:selected.slice(offset,offset+limit),summary,
    pagination:{limit,offset,total:selected.length,has_more:offset+limit<selected.length},
    available_sources:['tenant_registry','tenant_blocking_alerts','negative_stock','shipment_integrity'],omitted_sources:[],
    evidence_access:{tenant_identity:true,tenant_application_integrity:true},evidence_complete:true,
    evidence_contract:{system_health_read_is_derived_tenant_application_integrity_evidence:true,
     derived_system_health_alert_is_excluded_from_its_own_blocking_source:true,raw_tenant_alert_messages_are_not_exposed:true,
     archived_tenants_are_not_currently_monitored_by_default:true,
     healthy_does_not_prove_external_infrastructure_or_customer_visible_uptime:true,
     generated_snapshot_does_not_prove_future_health:true}});
  }
  if(m==='GET'&&path===healthDiagnostics)return fulfillJson(route,diag);
  return fulfillJson(route,[]);
 });
 await page.goto(`${healthRoot}${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'System Health',exact:true})).toBeVisible();
}
