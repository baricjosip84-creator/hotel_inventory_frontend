/** Batch 112: source-shaped production monitoring mock responses. No database/alert delivery/certification proof. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
export const MONITORING_PATH='/platform/production-monitoring-readiness';
export const MONITORING_PERMISSIONS=['platform.system_health.read','platform.tenants.read','platform.incidents.read','platform.dependencies.read'];
export const monitorAlpha='b1120000-0000-4000-8000-000000000001';
export const monitorBeta='b1120000-0000-4000-8000-000000000002';
export const monitorGamma='b1120000-0000-4000-8000-000000000003';
export const monitoringControlDefs=[
 {code:'tenant_lifecycle_launchable',label:'Tenant lifecycle status launchable',evidence_key:'tenant_status_launchable'},
 {code:'tenant_system_health_clear',label:'Tenant system health clear',evidence_key:'system_health_issues'},
 {code:'blocking_alerts_clear',label:'Blocking alerts clear',evidence_key:'blocking_alerts'},
 {code:'negative_stock_clear',label:'Negative stock clear',evidence_key:'negative_stock_rows'},
 {code:'open_incident_queue_clear',label:'Open incident queue clear',evidence_key:'open_incidents'},
 {code:'public_incident_updates_complete',label:'Customer-impacting incidents have public updates',evidence_key:'open_incidents_missing_public_updates'},
 {code:'critical_dependency_monitoring_clear',label:'Critical dependency monitoring clear',evidence_key:'critical_unhealthy_dependencies'},
 {code:'integration_monitoring_blockers_clear',label:'Integration monitoring blockers clear',evidence_key:'integration_blockers'},
 {code:'integration_monitoring_review_clear',label:'Integration monitoring review clear',evidence_key:'integration_review_required'}
];
type Control={code:string;label:string;evidence_key:string;launch_reason:string;evidence_value:number;status:string};
export type MonitorTenant={tenant_id:string;tenant_name:string;tenant_status:string;status:string;evidence:Record<string,number>;controls:Control[];missing_control_codes:string[];next_best_step:string};
export type MonitoringSnapshot={phase:string;step:string;posture:string;generated_at:string;summary:Record<string,number>;platform_evidence:Record<string,number|string>;monitoring_controls:Control[];tenants:MonitorTenant[];validation_note:string};
const platformDefaults={platform_open_incidents:0,platform_customer_impacting_open_incidents:0,platform_customer_impacting_incidents_with_public_updates:0,platform_incidents_missing_public_updates:0,unhealthy_dependencies:0,critical_unhealthy_dependencies:0,integration_failures:0,integration_blockers:0,integration_review_required:0,integrations_requiring_review:0};
export function makeMonitorTenant(id:string,name:string,kind:'ready'|'blocked'|'review'='ready'):MonitorTenant{
 const blocked=kind==='blocked',review=kind==='review';
 const evidence:Record<string,number>={tenant_status_launchable:1,system_health_issues:blocked?2:0,blocking_alerts:blocked?2:0,negative_stock_rows:0,incomplete_finalized_shipments:0,open_incidents:0,customer_impacting_open_incidents:0,customer_impacting_incidents_with_public_updates:0,open_incidents_missing_public_updates:0,unhealthy_dependencies:0,critical_unhealthy_dependencies:0,integration_failures:0,integration_blockers:0,integration_review_required:review?1:0,integrations_requiring_review:review?1:0};
 const controls=monitoringControlDefs.map(c=>{
  const v=evidence[c.evidence_key]||0;
  const evidence_value=c.code==='tenant_lifecycle_launchable'?Number(v>0):Number(v===0);
  const status=c.code==='public_incident_updates_complete'&&!evidence.customer_impacting_open_incidents?'not_required':
   evidence_value?'evidence_present':c.code==='integration_monitoring_review_clear'?'integration_monitoring_review_required':'monitoring_evidence_missing_or_blocked';
  return {...c,evidence_value,status,launch_reason:'Source-defined read-only monitoring control evidence'};
 });
 const missing=controls.filter(c=>!['evidence_present','not_required'].includes(c.status));
 const status=blocked?'production_monitoring_blocked':review?'production_monitoring_review_required':'production_monitoring_ready';
 return {tenant_id:id,tenant_name:name,tenant_status:'active',status,evidence,controls,missing_control_codes:missing.map(c=>c.code),next_best_step:blocked?'Resolve blocking operational alerts before launch.':review?'Review outstanding integration monitoring evidence.':'Current technical checks are clear for operator review.'};
}
export const monitoringRows=[makeMonitorTenant(monitorAlpha,'Monitor Alpha'),makeMonitorTenant(monitorBeta,'Monitor Beta','blocked')];
export function makeMonitoringSnapshot(rows:MonitorTenant[]=monitoringRows,platformOverride:Record<string,number>={}):MonitoringSnapshot{
 const platform={...platformDefaults,...platformOverride};
 const count=(fn:(t:MonitorTenant)=>boolean)=>rows.filter(fn).length;
 const summary:Record<string,number>={tenants_total:rows.length,monitoring_ready:count(t=>t.status==='production_monitoring_ready'),monitoring_blocked:count(t=>t.status==='production_monitoring_blocked'),monitoring_review_required:count(t=>t.status==='production_monitoring_review_required'),tenant_status_not_launchable:count(t=>!t.evidence.tenant_status_launchable),tenants_with_blocking_alerts:count(t=>t.evidence.blocking_alerts>0),tenants_with_negative_stock:count(t=>t.evidence.negative_stock_rows>0),tenants_with_incomplete_finalized_shipments:count(t=>t.evidence.incomplete_finalized_shipments>0),tenants_with_open_incidents:count(t=>t.evidence.open_incidents>0),tenants_missing_public_incident_updates:count(t=>t.evidence.open_incidents_missing_public_updates>0),...platform,total_controls:rows.length*monitoringControlDefs.length,controls_with_evidence:rows.reduce((sum,t)=>sum+t.controls.filter(c=>c.status==='evidence_present').length,0),controls_not_required:rows.reduce((sum,t)=>sum+t.controls.filter(c=>c.status==='not_required').length,0)};
 const posture=summary.platform_open_incidents||summary.critical_unhealthy_dependencies||summary.integration_blockers||summary.monitoring_blocked?'production_monitoring_blocked':!rows.length?'no_tenants_to_review_for_production_monitoring':summary.monitoring_review_required||summary.integration_review_required||summary.platform_incidents_missing_public_updates?'production_monitoring_review_required':'production_monitoring_ready';
 return {phase:'Platform Commercial Launch Readiness',step:'Step 212 — Production Monitoring Readiness Board',posture,generated_at:'2026-11-05T12:00:00.000Z',summary,platform_evidence:platform,monitoring_controls:monitoringControlDefs.map(c=>({...c,launch_reason:'Source-defined read-only monitoring evidence',evidence_value:0,status:'not_required'})),tenants:rows,validation_note:'Technical operator precheck only. It aggregates current system-health, incident, dependency, and canonical integration-monitoring evidence; it does not certify customer-visible uptime, publish status updates, mutate incidents, prove real-world alert delivery, or replace explicit production-monitoring sign-off.'};
}
export type MonitorOptions={urlQuery?:string;permissions?:string[];rows?:MonitorTenant[];tenantListStatus?:number;monitorStatus?:number;expectHeading?:boolean;onCall?:(method:string,path:string,query:URLSearchParams)=>void;respond?:(method:string,path:string,query:URLSearchParams)=>{json:any;status?:number}|undefined;alter?:(p:MonitoringSnapshot)=>MonitoringSnapshot;platformOverride?:Record<string,number>};
export async function openMonitoring(page:Page,opts:MonitorOptions={}){
 targetBaseURL();const permissions=opts.permissions??MONITORING_PERMISSIONS,rows=opts.rows??monitoringRows;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),query=url.searchParams;
  opts.onCall?.(method,path,query);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic token cannot refresh'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@synthetic.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=opts.respond?.(method,path,query);if(override)return fulfillJson(route,override.json,override.status??200);
  if(method==='GET'&&path==='/platform/tenants')return fulfillJson(route,opts.tenantListStatus&&opts.tenantListStatus>=400?{message:'Tenant list unavailable'}:rows.map(t=>({id:t.tenant_id,name:t.tenant_name})),opts.tenantListStatus??200);
  if(method==='GET'&&path===MONITORING_PATH){
   if(!MONITORING_PERMISSIONS.every(p=>permissions.includes(p)))return fulfillJson(route,{message:'Forbidden'},403);
   if(opts.monitorStatus&&opts.monitorStatus>=400)return fulfillJson(route,{message:'Monitoring unavailable'},opts.monitorStatus);
   const selected=query.get('tenant_id'),scoped=selected?rows.filter(t=>t.tenant_id===selected):rows;
   if(selected&&!scoped.length)return fulfillJson(route,{message:'Tenant not found'},404);
   const p=makeMonitoringSnapshot(scoped,opts.platformOverride);return fulfillJson(route,opts.alter?opts.alter(p):p);
  }
  return fulfillJson(route,{message:'Synthetic route unavailable'},404);
 });
 await page.goto(MONITORING_PATH+(opts.urlQuery?'?'+opts.urlQuery:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Production Monitoring Readiness',exact:true})).toBeVisible();
}
