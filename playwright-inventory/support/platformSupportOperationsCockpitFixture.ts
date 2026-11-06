/** Batch 111. Synthetic read-only Support Operations Cockpit snapshots. No database, SLA,
 * communications, tenant access or customer acceptance is certified by this fixture. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';

export const SUPPORT_COCKPIT_PATH='/platform/support-operations-cockpit';
export const SUPPORT_COCKPIT_PERMISSIONS=['platform.tenants.read','platform.sla.read','platform.incidents.read','platform.support_sessions.read'];
export const supportAlpha='b1110000-0000-4000-8000-000000000001';
export const supportBeta='b1110000-0000-4000-8000-000000000002';
export const supportGamma='b1110000-0000-4000-8000-000000000003';
export const supportControlDefs=[
 {code:'primary_contact_present',label:'Primary customer contact present',evidence_key:'primary_contacts'},
 {code:'escalation_contact_present',label:'Escalation contact present',evidence_key:'escalation_contacts'},
 {code:'active_sla_policy_present',label:'Active SLA policy present',evidence_key:'active_sla_policy_present'},
 {code:'no_overdue_support_tasks',label:'No overdue support tasks',evidence_key:'overdue_support_tasks_clear'},
 {code:'urgent_support_queue_clear',label:'Urgent support queue clear',evidence_key:'urgent_support_tasks_clear'},
 {code:'recent_customer_touch_present',label:'Recent customer touch present',evidence_key:'recent_customer_touch_present'},
 {code:'support_handover_note_present',label:'Support handover note present',evidence_key:'support_handover_notes'},
 {code:'customer_followups_clear',label:'No unresolved customer follow-ups',evidence_key:'customer_followups_clear'},
 {code:'no_open_tenant_incidents',label:'No open tenant incidents',evidence_key:'open_incidents_clear'},
 {code:'support_access_review_clear',label:'Support access review clear',evidence_key:'support_access_review_clear'}
];
type EvidenceValue=string|number|boolean|null;
export type SupportControl={code:string;label:string;evidence_key:string;launch_reason:string;evidence_value:number;status:string};
export type SupportTenant={tenant_id:string;tenant_name:string;status:string;evidence:Record<string,EvidenceValue>;
 controls:SupportControl[];missing_control_codes:string[];next_best_step:string};
export type SupportPackage={phase:string;step:string;posture:string;generated_at:string;summary:Record<string,number>;
 support_operation_controls:SupportControl[];tenants:SupportTenant[];validation_note:string};
function valueFor(e:Record<string,EvidenceValue>,key:string){
 if(key==='overdue_support_tasks_clear')return +(e.overdue_support_tasks===0);
 if(key==='urgent_support_tasks_clear')return +(e.urgent_support_tasks===0);
 if(key==='customer_followups_clear')return +(e.unresolved_follow_ups===0);
 if(key==='open_incidents_clear')return +(e.open_incidents===0);
 if(key==='support_access_review_clear')return +(e.active_support_sessions===0&&e.pending_support_approvals===0);
 return Number(e[key]||0);
}
function controlStatus(c:typeof supportControlDefs[number],e:Record<string,EvidenceValue>,value:number){
 if(value>0)return 'evidence_present';
 if(c.code==='support_access_review_clear')return Number(e.pending_support_approvals)>0?'pending_support_approval_requires_review':'active_support_access_requires_review';
 if(c.code==='customer_followups_clear')return 'customer_followup_requires_review';
 if(c.code==='no_open_tenant_incidents')return 'tenant_incident_blocking';
 if(c.code==='no_overdue_support_tasks')return 'overdue_support_tasks_blocking';
 if(c.code==='urgent_support_queue_clear')return 'urgent_support_tasks_blocking';
 if(c.code==='recent_customer_touch_present')return 'customer_touch_required';
 return 'missing_evidence';
}
export function makeSupportTenant(id:string,name:string,kind:'ready'|'blocked'|'review'='ready'):SupportTenant{
 const blocked=kind==='blocked',review=kind==='review';
 const evidence:Record<string,EvidenceValue>={tenant_id:id,tenant_name:name,tenant_status:'active',
  primary_contacts:blocked?0:1,escalation_contacts:1,active_sla_policy_present:1,
  response_target_minutes:30,incident_resolution_target_hours:8,review_frequency:'monthly',
  open_support_tasks:blocked?3:0,overdue_support_tasks:blocked?2:0,urgent_support_tasks:blocked?1:0,
  support_handover_notes:1,last_customer_touch_at:'2026-11-04T10:00:00.000Z',days_since_last_customer_touch:1,
  recent_customer_touch_present:true,unresolved_follow_ups:review?1:0,open_incidents:blocked?1:0,
  active_support_sessions:0,pending_support_approvals:review?1:0};
 const controls:SupportControl[]=supportControlDefs.map(c=>{const evidence_value=valueFor(evidence,c.evidence_key);
  return {...c,launch_reason:'Source-defined support launch readiness evidence',evidence_value,status:controlStatus(c,evidence,evidence_value)};});
 const missing=controls.filter(c=>c.status!=='evidence_present');
 const status=blocked?'support_operations_blocked':review?'support_operations_review_required':'support_operations_ready';
 return {tenant_id:id,tenant_name:name,status,evidence,controls,missing_control_codes:missing.map(c=>c.code),
  next_best_step:missing[0]?.label||'Support operations evidence is ready to feed production monitoring and pilot launch readiness.'};
}
export const supportRows=[makeSupportTenant(supportAlpha,'Support Alpha'),makeSupportTenant(supportBeta,'Support Beta','blocked'),makeSupportTenant(supportGamma,'Support Gamma','review')];
export function makeSupportPackage(rows:SupportTenant[]=supportRows):SupportPackage{
 const count=(cb:(t:SupportTenant)=>boolean)=>rows.filter(cb).length;
 const summary:Record<string,number>={tenants_total:rows.length,support_ready:count(t=>t.status==='support_operations_ready'),
  support_blocked:count(t=>t.status==='support_operations_blocked'),support_review_required:count(t=>t.status==='support_operations_review_required'),
  missing_primary_contact:count(t=>t.evidence.primary_contacts===0),missing_escalation_contact:count(t=>t.evidence.escalation_contacts===0),
  missing_active_sla_policy:count(t=>t.evidence.active_sla_policy_present===0),
  overdue_support_tasks:count(t=>Number(t.evidence.overdue_support_tasks)>0),urgent_support_tasks:count(t=>Number(t.evidence.urgent_support_tasks)>0),
  missing_recent_customer_touch:count(t=>!t.evidence.recent_customer_touch_present),missing_support_handover_note:count(t=>t.evidence.support_handover_notes===0),
  tenants_with_unresolved_customer_followups:count(t=>Number(t.evidence.unresolved_follow_ups)>0),
  tenants_with_open_incidents:count(t=>Number(t.evidence.open_incidents)>0),
  tenants_with_active_support_sessions:count(t=>Number(t.evidence.active_support_sessions)>0),
  tenants_with_pending_support_approvals:count(t=>Number(t.evidence.pending_support_approvals)>0),
  total_controls:rows.length*supportControlDefs.length,
  controls_with_evidence:rows.reduce((sum,t)=>sum+t.controls.filter(c=>c.status==='evidence_present').length,0)};
 const posture=!rows.length?'no_tenants_to_review_for_support_operations':summary.support_blocked?'support_operations_blocked':
  summary.support_review_required?'support_operations_review_required':'support_operations_ready';
 return {phase:'Platform Commercial Launch Readiness',step:'Step 211 — Support Operations Cockpit',posture,generated_at:'2026-11-05T12:00:00.000Z',summary,
  support_operation_controls:supportControlDefs.map(c=>({...c,launch_reason:'Source-defined support evidence',evidence_value:0,status:'missing_evidence'})),
  tenants:rows,validation_note:'Read-only support operations precheck. It joins existing contacts, active SLA policy, support tasks, handover notes, external customer communications, incidents, and active/pending support-access evidence without mutating support data or certifying launch.'};
}
export type SupportOptions={urlQuery?:string;permissions?:string[];rows?:SupportTenant[];
 tenantListStatus?:number;cockpitStatus?:number;expectHeading?:boolean;
 onCall?:(method:string,path:string,query:URLSearchParams)=>void;
 respond?:(method:string,path:string,query:URLSearchParams)=>{json:any;status?:number}|undefined;
 alter?:(data:SupportPackage)=>SupportPackage};
export async function openSupportCockpit(page:Page,opts:SupportOptions={}){
 targetBaseURL();const permissions=opts.permissions??SUPPORT_COCKPIT_PERMISSIONS,rows=opts.rows??supportRows;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),query=url.searchParams;
  opts.onCall?.(method,path,query);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic token cannot refresh'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@synthetic.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=opts.respond?.(method,path,query);if(override)return fulfillJson(route,override.json,override.status??200);
  if(method==='GET'&&path==='/platform/tenants')return fulfillJson(route,opts.tenantListStatus&&opts.tenantListStatus>=400?
   {message:'Tenant selector unavailable'}:rows.map(t=>({id:t.tenant_id,name:t.tenant_name})),opts.tenantListStatus??200);
  if(method==='GET'&&path===SUPPORT_COCKPIT_PATH){
   if(!SUPPORT_COCKPIT_PERMISSIONS.every(p=>permissions.includes(p)))return fulfillJson(route,{message:'Forbidden'},403);
   if(opts.cockpitStatus&&opts.cockpitStatus>=400)return fulfillJson(route,{message:'Support cockpit unavailable'},opts.cockpitStatus);
   const selected=query.get('tenant_id'),scoped=selected?rows.filter(t=>t.tenant_id===selected):rows;
   if(selected&&!scoped.length)return fulfillJson(route,{message:'Tenant not found'},404);
   const data=makeSupportPackage(scoped);return fulfillJson(route,opts.alter?opts.alter(data):data);
  }
  return fulfillJson(route,{message:'Synthetic route unavailable'},404);
 });
 await page.goto(SUPPORT_COCKPIT_PATH+(opts.urlQuery?'?'+opts.urlQuery:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Support Operations Cockpit',exact:true})).toBeVisible();
}
