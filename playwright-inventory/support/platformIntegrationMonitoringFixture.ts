/** Batch 72: synthetic transport for the read-only Platform Integration Monitoring page.
 * No external delivery, webhook worker, credential, database, ACL or incident outcome is verified. */
import { expect, type Page, type Route } from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
import {KEY_TENANT_A,KEY_TENANT_B} from './platformApiKeysFixture';

export const monitorPermissions=[
 'platform.dashboard.read','platform.dependencies.read','platform.webhooks.read',
 'platform.api_keys.read','platform.notifications.read','platform.notifications.write',
 'platform.tenants.read','platform.users.read','platform.vendors.read'
];
export const monitorWebhook={type:'webhook',id:'10000000-0000-4000-8000-000000000001',tenant_id:KEY_TENANT_A,
 tenant_name:'Fixture Hotel',name:'Fixture delivery webhook',risk_flags:['integration_webhook_delivery_failure_threshold'],health_state:'integration_review_required',
 event_types:['product.updated'],is_enabled:true,last_delivery_at:'2026-10-28T00:00:00Z',last_delivery_status:'failed',consecutive_failure_count:4};
export const monitorDependency={type:'service_dependency',id:'20000000-0000-4000-8000-000000000002',tenant_id:null,tenant_name:null,
 name:'Fixture external dependency',risk_flags:['integration_dependency_stale_check'],health_state:'integration_review_required',category:'payments',status:'degraded',
 business_impact:'critical',vendor_name:'Fixture Vendor',owner_email:'private-owner@fixture.test',owner_present:true,
 last_checked_at:'2026-06-01T00:00:00Z',days_since_last_checked:155,escalation_url_present:true};
export const monitorClient={type:'api_client',id:'30000000-0000-4000-8000-000000000003',tenant_id:KEY_TENANT_A,tenant_name:'Fixture Hotel',
 name:'Fixture public API client',risk_flags:['api_client_unsupported_scopes'],health_state:'integration_review_required',credential_source:'platform_api_keys',
 credential_contract:'inv_live_public_api',key_prefix:'fixture10',scopes:['products:read','legacy:scope'],unsupported_scopes:['legacy:scope'],
 public_api_compatible:false,network_allowlist_supported:true,allowed_ip_count:1,last_used_at:null,days_since_last_used:null,
 created_at:'2026-08-01T00:00:00Z',days_since_created:95,expires_at:null,revoked_at:null,is_expired:false};
export const monitorRevoked={...monitorClient,id:'30000000-0000-4000-8000-000000000004',name:'Fixture revoked API client',tenant_id:KEY_TENANT_B,
 tenant_name:'Fixture Depot',credential_source:'tenant_api_clients',credential_contract:'legacy_hla_accepted',key_prefix:'legacy20',
 revoked_at:'2026-09-21T12:00:00Z',risk_flags:[],health_state:'integration_no_recorded_findings',is_revoked:true,
 network_allowlist_supported:false,allowed_ip_count:null,public_api_compatible:true,unsupported_scopes:[],scopes:['products:read']};
export type MonitoringRow=(typeof monitorWebhook|typeof monitorDependency|typeof monitorClient|typeof monitorRevoked)&Record<string,any>;
export const monitoringControls={read_only:true,mutation_owners:['platform_webhooks','platform_service_dependencies','platform_api_keys'],
 source_routes:['/platform/webhooks','/platform/service-dependencies','/platform/api-keys'],no_secret_export:true,no_secret_hash_export:true,
 secret_material_fields_blocked:['raw_secret','key_hash'],webhook_failure_threshold:3,stale_dependency_check_days:30,stale_api_client_days:90,
 never_used_grace_days:90,revoked_credentials_drive_posture:false,include_revoked_history:false,selected_sources:['service_dependencies','webhooks','api_clients'],
 required_controls:['tenant_binding','scope_validation','permission_redaction'],notification_coverage_scope:'loaded_page',
 public_api_contract:{accepted_prefixes:['inv_live_','hla_'],preferred_new_key_format:'inv_live_<prefix>_<secret>',supported_scopes:['products:read','stock:read'],
 platform_key_ip_allowlist_enforced:true,tenant_api_client_ip_allowlist_supported:false}};
export const monitoringTruth={application_evidence_only:true,credential_exists_means_connected:false,last_used_at_means_authenticated_request_seen:true,
 last_used_at_proves_request_outcome:false,persisted_public_api_success_failure_counts_available:false,
 absence_of_usage_proves_no_external_integration:false,interpretation:'Synthetic application monitoring does not certify external integration success.'};
export const monitorScanResult={scanned_at:'2026-11-04T10:00:00Z',posture:'integration_monitoring_review_required',integrations_checked:3,
 risks_found:2,notifications_touched:2,created:1,refreshed:1,auto_resolved:0,sla_escalated:0,routing_escalated:0};
export function manyMonitorWebhooks(count:number):MonitoringRow[]{return Array.from({length:count},(_,i)=>({...monitorWebhook,
 id:`${String(i+1).padStart(8,'0')}-0000-4000-8000-${String(i+1).padStart(12,'0')}`,name:`Fixture webhook ${String(i+1).padStart(3,'0')}`}));}
export type MonitorOpts={query?:string;permissions?:string[];rows?:MonitoringRow[];posture?:string;summary?:Record<string,any>;
 controls?:Record<string,any>;truth?:Record<string,any>;access?:Record<string,boolean>;
 responses?:Record<string,{status?:number;json:any}>;respond?:(method:string,path:string,q:URLSearchParams)=>{status?:number;json:any}|undefined;
 onCall?:(method:string,path:string,q:URLSearchParams)=>void;expectHeading?:boolean};
export async function openMonitoring(page:Page,opts:MonitorOpts={}){
 targetBaseURL();const permissions=opts.permissions??monitorPermissions,rows=opts.rows??[monitorDependency,monitorWebhook,monitorClient,monitorRevoked];
 await page.addInitScript(t=>{localStorage.setItem('inventory_platform_access_token',t);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),m=req.method(),q=url.searchParams;
  opts.onCall?.(m,path,q);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic refresh unavailable'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'monitor-operator@fixture.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions});
  const override=opts.respond?.(m,path,q)??opts.responses?.[`${m} ${path}`];
  if(override)return fulfillJson(route,override.json,override.status??200);
  if(path==='/platform/tenants'&&m==='GET')return fulfillJson(route,[{id:KEY_TENANT_A,name:'Fixture Hotel'},{id:KEY_TENANT_B,name:'Fixture Depot'}]);
  if(path==='/platform/notifications/integration-monitoring-scan'&&m==='POST')return fulfillJson(route,monitorScanResult);
  if(path==='/platform/integration-monitoring/surface'&&m==='GET'){
   const sources:{[key:string]:string}={webhook:'webhooks',service_dependency:'service_dependencies',api_client:'api_clients'};
   const access:Record<string,boolean>=opts.access??{webhooks:permissions.includes('platform.webhooks.read'),service_dependencies:permissions.includes('platform.dependencies.read'),
    api_clients:permissions.includes('platform.api_keys.read'),notifications:permissions.includes('platform.notifications.read'),
    tenant:permissions.includes('platform.tenants.read'),platform_user_identity:permissions.includes('platform.users.read'),
    vendor_identity:permissions.includes('platform.vendors.read')};
   const available=['service_dependencies','webhooks','api_clients'].filter(x=>access[x]);
   const omitted=['service_dependencies','webhooks','api_clients'].filter(x=>!access[x]);
   const offset=Number(q.get('offset')??0),limit=Number(q.get('limit')??50);
   const filtered=rows.filter(item=>available.includes(sources[item.type])&&(!q.get('source')||sources[item.type]===q.get('source'))&&
    (!q.get('tenant_id')||item.tenant_id===q.get('tenant_id'))&&
    (!q.get('search')||`${item.name} ${item.tenant_name??''} ${item.key_prefix??''}`.toLowerCase().includes(q.get('search')!.toLowerCase()))&&
    (q.get('include_revoked')==='true'||!item.is_revoked&&!item.revoked_at));
   const visible=filtered.slice(offset,offset+limit),webhooks=visible.filter(x=>x.type==='webhook'),dependencies=visible.filter(x=>x.type==='service_dependency'),
    clients=visible.filter(x=>x.type==='api_client');
   const summary={scope:'loaded_page',total_integrations:visible.length,webhooks:webhooks.length,service_dependencies:dependencies.length,
    api_clients:clients.length,platform_api_clients:clients.filter(x=>x.credential_source==='platform_api_keys').length,
    tenant_api_clients:clients.filter(x=>x.credential_source==='tenant_api_clients').length,
    revoked_api_client_history:clients.filter(x=>!!x.revoked_at).length,integrations_requiring_review:visible.filter(x=>x.risk_flags.length).length,
    unhealthy_dependencies:1,critical_unhealthy_dependencies:1,webhooks_with_delivery_failures:webhooks.filter(x=>x.consecutive_failure_count>=3).length,
    stale_dependency_checks:1,stale_api_clients:1,expired_api_clients:0,unsupported_scope_api_clients:1,
    tenants_with_monitored_integrations:2,active_integration_notifications:1,integration_risks_without_active_notifications:1,critical_open_sla_breaches:0};
   return fulfillJson(route,{feature:'integration_monitoring',phase:1,step:1,posture:opts.posture??'integration_monitoring_review_required',
    summary:opts.summary??summary,pagination:{limit,offset,has_more:offset+limit<filtered.length},
    evidence_access:access,available_sources:available,omitted_sources:omitted,
    monitoring_controls:opts.controls??{...monitoringControls,selected_sources:available,include_revoked_history:q.get('include_revoked')==='true'},
    truthfulness:opts.truth??monitoringTruth,notification_coverage:access.notifications?{active_risk_keys:2,active_integration_notifications:1,
     integration_risks_without_active_notifications:1,critical_open_sla_breaches:0}:null,
    webhooks,service_dependencies:dependencies,api_clients:clients});
  }
  return fulfillJson(route,[]);
 });
 await page.goto(`/platform/integration-monitoring${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Integration monitoring',exact:true})).toBeVisible();
}
