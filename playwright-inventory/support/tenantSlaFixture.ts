/** Batch 65 — fully synthetic Platform Tenant SLA browser transport.
 * Not a verification of contractual SLA, real breach evidence, persisted policy,
 * authorization, scan delivery, PostgreSQL state or notification reconciliation. */
import {expect, type Page, type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt, SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
import {TASK_TENANT_A, TASK_TENANT_B} from './tenantTasksFixture';

export const slaDefaultPermissions=[
 'platform.dashboard.read','platform.sla.read','platform.sla.write',
 'platform.tenants.read','platform.incidents.read','platform.support_sessions.read',
 'platform.notifications.read','platform.notifications.write'
];
export const slaPolicies=[
 {id:'77777777-7777-4777-8777-777777777777',tenant_id:TASK_TENANT_A,tenant_name:'Fixture Hotel',response_target_minutes:30,incident_resolution_target_hours:12,task_overdue_grace_hours:3,review_frequency:'daily',escalation_notes:'Synthetic escalation',is_active:true,is_persisted:true,uses_template_defaults:false},
 {id:null,tenant_id:TASK_TENANT_B,tenant_name:'Fixture Warehouse',response_target_minutes:60,incident_resolution_target_hours:24,task_overdue_grace_hours:24,review_frequency:'weekly',escalation_notes:'',is_active:false,is_persisted:false,uses_template_defaults:true}
] as const;
export const slaCounts={open_incidents:2,breached_open_incidents:1,resolved_incident_breaches:0,open_tasks:1,overdue_tasks_after_grace:0,pending_support_approvals:0,active_support_sessions:1,support_response_breaches:0};
export const slaRows=[
 {...slaPolicies[0],policy_id:slaPolicies[0].id,known_breach_count:1,breach_count:1,status:'breached',counts:{...slaCounts}},
 {...slaPolicies[1],policy_id:null,known_breach_count:0,breach_count:0,status:'not_configured',counts:{...slaCounts,open_incidents:null,breached_open_incidents:null,open_tasks:null}}
];
export type SlaRow={tenant_id:string;tenant_name:string;policy_id:string|null;id?:string|null;response_target_minutes:number;incident_resolution_target_hours:number;task_overdue_grace_hours:number;review_frequency:string;escalation_notes?:string;is_active:boolean;is_persisted:boolean;uses_template_defaults:boolean;status:string;known_breach_count:number;breach_count:number;counts:Record<string,number|null>};
export type SlaEvidence={available:string[];omitted:string[];complete:boolean};
export function syntheticSlaRows(count:number):SlaRow[]{return Array.from({length:count},(_,i)=>({...slaRows[0],tenant_id:`88888888-8888-4888-8888-${String(i).padStart(12,'0')}`,tenant_name:`Synthetic Tenant ${String(i+1).padStart(3,'0')}`,status:i%2?'within_sla':'breached'}));}
export type SlaResponse={status:number;json:unknown};
export type SlaFixtureOptions={query?:string;permissions?:string[];rows?:SlaRow[];
 responses?:Record<string,SlaResponse>;respond?:(method:string,path:string,query:URLSearchParams,body:unknown)=>SlaResponse|undefined;
 asyncRespond?:(method:string,path:string,query:URLSearchParams,body:unknown)=>Promise<SlaResponse|undefined>;
 policies?:Array<Record<string,unknown>>;evidence?:SlaEvidence;
 onCall?:(method:string,path:string,query:URLSearchParams,body:unknown)=>void;expectHeading?:boolean};
export async function openTenantSla(page:Page,opts:SlaFixtureOptions={}){
 targetBaseURL();
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const request=route.request();if(request.isNavigationRequest())return route.continue();
  const url=new URL(request.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=request.method(),query=url.searchParams;
  const body=request.postDataJSON?.()??null;opts.onCall?.(method,path,query,body);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{error:'No synthetic refresh cookie'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'sla-fixture@example.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions:opts.permissions??slaDefaultPermissions});
  const response=(await opts.asyncRespond?.(method,path,query,body))??opts.respond?.(method,path,query,body)??opts.responses?.[`${method} ${path}`];
  if(response)return fulfillJson(route,response.json,response.status);
  if(path==='/platform/tenant-sla'&&method==='GET')return fulfillJson(route,{
   policies:opts.policies??slaPolicies,pagination:{limit:250,offset:0,has_more:false},
   policy_truth:{template_defaults_are_persisted_policy:false,unconfigured_tenants_are_active_sla:false}
  });
  if(path==='/platform/tenant-sla/overview'&&method==='GET'){
   const matching=(opts.rows??slaRows).filter(x=>!query.get('tenant_id')||x.tenant_id===query.get('tenant_id'));
   const limit=Number(query.get('limit')||100),offset=Number(query.get('offset')||0),tenants=matching.slice(offset,offset+limit);
   return fulfillJson(route,{generated_at:'2026-11-04T15:00:00Z',evidence:opts.evidence??{available:['incidents','tenant_tasks','support_sessions'],omitted:[],complete:true},summary_scope:'loaded_page',
    summary:{tenants:tenants.length,breached:tenants.filter(x=>x.status==='breached').length,within_sla:tenants.filter(x=>x.status==='within_sla').length,
     partial_evidence:tenants.filter(x=>x.status==='partial_evidence').length,inactive_policies:tenants.filter(x=>x.status==='inactive').length,
     not_configured:tenants.filter(x=>x.status==='not_configured').length},pagination:{limit,offset,has_more:offset+limit<matching.length},
    truthfulness:{template_defaults_are_persisted_policy:false,unconfigured_tenants_are_within_sla:false,within_sla_requires_complete_evidence:true,external_contractual_sla_proven:false},tenants});
  }
  if(path==='/platform/tenant-sla/scan'&&method==='POST')return fulfillJson(route,{scanned_at:'2026-11-04T15:01:00Z',tenants_checked:2,breached_tenants:1,created:1,refreshed:0,resolved_duplicates:0,resolved_recovered:0,notifications_touched:1});
  if(path.startsWith('/platform/tenant-sla/')&&method==='PUT')return fulfillJson(route,{...slaPolicies[0],tenant_id:path.split('/').at(-1),is_persisted:true,...(body as object)});
  return fulfillJson(route,[]);
 });
 await page.goto(`/platform/tenant-sla${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Tenant SLA',exact:true})).toBeVisible();
}
export {TASK_TENANT_A,TASK_TENANT_B};
