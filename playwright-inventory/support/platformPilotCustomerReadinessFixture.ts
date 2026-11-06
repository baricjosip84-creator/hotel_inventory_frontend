/** Batch 116. Isolated, synthetic GET-only pilot-readiness UI fixture. No pilot acceptance or persistence. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
export const PILOT_PATH='/platform/pilot-customer-readiness';
export const PILOT_TENANTS_READ='platform.tenants.read';
export const PILOT_INCIDENTS_READ='platform.incidents.read';
export const PILOT_ALL_GRANTS=[PILOT_TENANTS_READ,PILOT_INCIDENTS_READ,'platform.sla.read','platform.support_sessions.read','platform.dependencies.read','platform.system_health.read','platform.dashboard.read'];
export const TENANT_ONE='11111111-1111-4111-8111-111111111111';
export const TENANT_TWO='22222222-2222-4222-8222-222222222222';
export const TENANT_THREE='33333333-3333-4333-8333-333333333333';
export const PILOT_TENANT_OPTIONS=[{id:TENANT_ONE,name:'Synthetic Alpha'},{id:TENANT_TWO,name:'Synthetic Beta'},{id:TENANT_THREE,name:'Synthetic Gamma'}];
export const PILOT_CONTROL_DEFINITIONS=[
 {code:'tenant_lifecycle_launchable',label:'Tenant lifecycle status launchable',evidence_key:'tenant_status_launchable',launch_reason:'A suspended, maintenance, offboarding, archived, or otherwise non-launchable tenant must not be presented as ready for a customer pilot.'},
 {code:'pilot_tenant_selected',label:'Pilot tenant selection reference visible',evidence_key:'pilot_selection_evidence',launch_reason:'A pilot cannot begin until a specific tenant is explicitly tracked as the pilot candidate and the operator manually confirms that selection.'},
 {code:'pilot_owner_assigned',label:'Pilot owner assignment reference visible',evidence_key:'pilot_owner_evidence',launch_reason:'The checked-in pilot launch guide requires an accountable pilot owner before launch.'},
 {code:'pilot_success_criteria_defined',label:'Pilot success criteria reference visible',evidence_key:'success_criteria_evidence',launch_reason:'Pilot launch needs measurable success criteria before customer feedback can be interpreted.'},
 {code:'pilot_data_policy_confirmed',label:'Pilot test/live-data policy reference visible',evidence_key:'data_policy_evidence',launch_reason:'Operators must know whether the pilot uses test data, migrated customer data, or live operational data.'},
 {code:'pilot_feedback_log_available',label:'Pilot feedback-log reference visible',evidence_key:'feedback_log_evidence',launch_reason:'Pilot feedback needs a visible tracking reference before launch blockers and observed outcomes can be reviewed.'},
 {code:'pilot_launch_blockers_clear',label:'No open pilot launch blockers',evidence_key:'open_blocker_count_clear',launch_reason:'Blocked pilot/onboarding/support work and open tenant incidents must not be hidden by otherwise positive pilot evidence.'},
 {code:'pilot_first_use_onboarding_visible',label:'First-use onboarding evidence visible',evidence_key:'onboarding_evidence_count',launch_reason:'The pilot tenant should have first-use onboarding evidence from completed onboarding tasks, products, locations, stock, or shipments.'},
 {code:'pilot_support_handover_visible',label:'Support handover reference visible',evidence_key:'support_handover_evidence',launch_reason:'Support/customer-success needs a handover reference before pilot operations start.'},
 {code:'pilot_monitoring_or_incident_review_visible',label:'Monitoring or incident-review reference visible',evidence_key:'monitoring_review_evidence',launch_reason:'Pilot launch needs a visible tenant-specific monitoring or incident-review reference for early customer issues.'}
] as const;
const MANUAL_CODES=new Set(['pilot_tenant_selected','pilot_owner_assigned','pilot_success_criteria_defined','pilot_data_policy_confirmed','pilot_feedback_log_available','pilot_support_handover_visible','pilot_monitoring_or_incident_review_visible']);
export type PilotControl={code:string;label:string;evidence_key:string;launch_reason:string;evidence_value:number;status:string};
export type PilotRow={tenant_id:string;tenant_name:string;tenant_status:string|null;status:string;evidence:Record<string,string|number|boolean|null>;controls:PilotControl[];missing_control_codes:string[];next_best_step:string};
export type PilotSnapshot={phase:string;step:string;posture:string;generated_at:string;summary:Record<string,number>;pilot_controls:Array<{code:string;label:string;evidence_key:string;launch_reason:string}>;evidence_model:{dedicated_pilot_record_persisted:boolean;text_reference_requires_manual_confirmation:boolean;prelaunch_scope_only:boolean;expansion_decision_evaluated:boolean;explanation:string};tenants:PilotRow[];required_manual_acceptance:string[];next_best_step:string;validation_note:string};
function makeTenant(id:string,name:string,lifecycle:'trial'|'active'|'suspended',kind:'ready'|'incomplete'|'blocked'):PilotRow{
 const count=kind==='ready'?2:kind==='incomplete'?0:1;
 const blockers=kind==='blocked'?3:0;
 const evidence:Record<string,string|number|boolean|null>={
  tenant_status:lifecycle,tenant_status_launchable:lifecycle==='suspended'?0:1,
  pilot_selection_evidence:2,pilot_owner_evidence:kind==='incomplete'?0:1,
  success_criteria_evidence:count,data_policy_evidence:count,feedback_log_evidence:count,
  onboarding_evidence_count:kind==='incomplete'?0:4,support_handover_evidence:count,
  monitoring_review_evidence:count,open_blocker_count:blockers,open_blocker_count_clear:blockers===0?1:0,
  blocked_pilot_tasks:kind==='blocked'?1:0,blocked_onboarding_tasks:kind==='blocked'?1:0,
  blocked_support_tasks:0,open_incidents:kind==='blocked'?1:0,
  latest_pilot_activity_at:'2026-11-05T14:00:00.000Z'
 };
 const controls:PilotControl[]=PILOT_CONTROL_DEFINITIONS.map(({code,label,evidence_key,launch_reason})=>{
  const value=Number(evidence[evidence_key]||0);
  const status=code==='tenant_lifecycle_launchable'&&!value?'tenant_status_not_launchable':
   code==='pilot_launch_blockers_clear'&&blockers>0?'pilot_blocker_requires_review':
   value>0?(MANUAL_CODES.has(code)?'evidence_found_manual_confirmation_required':'evidence_present'):'missing_evidence';
  return {code,label,evidence_key,launch_reason,evidence_value:value,status};
 });
 const status=kind==='blocked'?'pilot_launch_blocked':kind==='incomplete'?'pilot_readiness_incomplete':'pilot_ready_for_manual_launch_review';
 return {tenant_id:id,tenant_name:name,tenant_status:lifecycle,status,evidence,controls,
  missing_control_codes:controls.filter(c=>!['evidence_present','evidence_found_manual_confirmation_required'].includes(c.status)).map(c=>c.code),
  next_best_step:kind==='blocked'?'Resolve or explicitly review the open pilot/onboarding/support blockers and tenant incidents.':kind==='incomplete'?'Pilot owner assignment reference visible':'Perform the required manual pilot launch review; task/note references are evidence pointers, not pilot acceptance.'};
}
export function makePilotSnapshot(kind:'mixed'|'empty'|'ready'='mixed'):PilotSnapshot{
 const tenants=kind==='empty'?[]:kind==='ready'?[makeTenant(TENANT_ONE,'Synthetic Alpha','trial','ready')]:[
  makeTenant(TENANT_ONE,'Synthetic Alpha','trial','ready'),makeTenant(TENANT_TWO,'Synthetic Beta','suspended','blocked'),makeTenant(TENANT_THREE,'Synthetic Gamma','active','incomplete')];
 const summary:Record<string,number>={tenants_total:tenants.length,pilot_ready_for_manual_launch_review:0,pilot_readiness_incomplete:0,pilot_launch_blocked:0,tenant_status_not_launchable:0,
  tenants_with_pilot_selection:0,tenants_with_pilot_owner:0,tenants_with_success_criteria:0,tenants_with_data_policy:0,tenants_with_feedback_log:0,
  tenants_with_support_handover:0,tenants_with_monitoring_review:0,tenants_with_open_blockers:0,total_controls:tenants.length*PILOT_CONTROL_DEFINITIONS.length,controls_with_evidence:0,controls_requiring_manual_confirmation:0};
 const counters=[['tenants_with_pilot_selection','pilot_selection_evidence'],['tenants_with_pilot_owner','pilot_owner_evidence'],['tenants_with_success_criteria','success_criteria_evidence'],['tenants_with_data_policy','data_policy_evidence'],['tenants_with_feedback_log','feedback_log_evidence'],['tenants_with_support_handover','support_handover_evidence'],['tenants_with_monitoring_review','monitoring_review_evidence']];
 for(const row of tenants){summary[row.status]++;
  if(!row.evidence.tenant_status_launchable)summary.tenant_status_not_launchable++;
  if(Number(row.evidence.open_blocker_count)>0)summary.tenants_with_open_blockers++;
  for(const [counter,key] of counters)if(Number(row.evidence[key])>0)summary[counter]++;
  summary.controls_with_evidence+=row.controls.filter(c=>['evidence_present','evidence_found_manual_confirmation_required'].includes(c.status)).length;
  summary.controls_requiring_manual_confirmation+=row.controls.filter(c=>c.status==='evidence_found_manual_confirmation_required').length;
 }
 const posture=summary.pilot_launch_blocked>0?'pilot_launch_blocked':!tenants.length?'no_tenants_available_for_pilot_review':summary.pilot_readiness_incomplete>0?'pilot_readiness_incomplete':'pilot_ready_for_manual_launch_review';
 return {phase:'Platform Commercial Launch Readiness',step:'Step 216 — Pilot Customer Readiness Board',posture,generated_at:'2026-11-05T16:00:00.000Z',summary,
  pilot_controls:PILOT_CONTROL_DEFINITIONS.map(c=>({...c})),evidence_model:{dedicated_pilot_record_persisted:false,text_reference_requires_manual_confirmation:true,prelaunch_scope_only:true,expansion_decision_evaluated:false,
   explanation:'Pilot selection, owner, criteria, data-policy, feedback, support, and monitoring references are inferred from the existing task/note model and require manual confirmation. This board does not persist a dedicated pilot acceptance or post-pilot expansion decision.'},
  tenants,required_manual_acceptance:[
   'Platform owner confirms the selected pilot tenant and launch scope.',
   'Customer-success owner confirms the accountable pilot owner, success criteria, and feedback cadence.',
   'Operations owner confirms test-data/live-data policy and rollback/monitoring path.',
   'Support owner confirms customer support handover and incident escalation path.',
   'Launch owner confirms open pilot blockers are resolved or explicitly accepted before pilot launch.',
   'After pilot observation, the expansion decision must be recorded separately before broader rollout.'
  ],next_best_step:'Use this board to close pre-launch pilot evidence, then perform manual pilot launch review. Record observed outcomes and any expansion decision after the pilot rather than treating this precheck as pilot success.',
  validation_note:'Technical operator precheck only. Structured counts are computed from current tenant data; text-matched task/note references remain heuristic evidence pointers that require manual confirmation. It does not select a pilot, certify customer acceptance, prove pilot success, or approve expansion.'};
}
export type PilotOptions={permissions?:string[];status?:number;expectHeading?:boolean;kind?:'mixed'|'empty'|'ready';urlQuery?:string;
 tenantOptions?:Array<{id:string;name:string}>;tenantsStatus?:number;alter?:(snapshot:PilotSnapshot)=>PilotSnapshot;
 respond?:(method:string,path:string,query:URLSearchParams)=>{json:any;status?:number}|undefined;
 onCall?:(method:string,path:string,query:URLSearchParams)=>void};
export async function openPilot(page:Page,opts:PilotOptions={}){
 targetBaseURL();const permissions=opts.permissions??PILOT_ALL_GRANTS;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const req=route.request(),u=new URL(req.url()),path=u.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),q=u.searchParams;
  opts.onCall?.(method,path,q);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic token cannot refresh'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@synthetic.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=opts.respond?.(method,path,q);if(override)return fulfillJson(route,override.json,override.status??200);
  if(method==='GET'&&path==='/platform/tenants')return fulfillJson(route,opts.tenantsStatus?{message:'Synthetic tenant list unavailable'}:(opts.tenantOptions??PILOT_TENANT_OPTIONS),opts.tenantsStatus??200);
  if(method==='GET'&&path===PILOT_PATH){
   if(!permissions.includes(PILOT_TENANTS_READ)||!permissions.includes(PILOT_INCIDENTS_READ))return fulfillJson(route,{message:'Forbidden'},403);
   if(opts.status&&opts.status>=400)return fulfillJson(route,{message:'Synthetic pilot snapshot unavailable'},opts.status);
   const snapshot=makePilotSnapshot(opts.kind);return fulfillJson(route,opts.alter?opts.alter(snapshot):snapshot);
  }
  return fulfillJson(route,{message:'Synthetic route unavailable'},404);
 });
 await page.goto(PILOT_PATH+(opts.urlQuery?'?'+opts.urlQuery:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Pilot Customer Readiness',exact:true})).toBeVisible();
}
