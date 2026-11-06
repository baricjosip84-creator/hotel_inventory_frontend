/** Batch 123 — Step 223 synthetic browser presentation only, not proof of real triage. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
import {OBSERVATION_CHECKS,OBSERVATION_PERMISSIONS} from './platformCommercialLaunchPostLaunchObservationFixture';
export const TRIAGE_PATH='/platform/commercial-launch-incident-triage';
export const TRIAGE_PERMISSIONS=[...OBSERVATION_PERMISSIONS];
export const TRIAGE_FIELDS=["source_observation_record_reference", "severity", "customer_impact", "triage_owner", "customer_communication_owner", "rollback_decision", "follow_up_due_at", "closure_evidence_link", "reviewed_at"] as const;
export const TRIAGE_SEVERITIES=["sev1", "sev2", "sev3", "watch", "none", "not_reviewed"] as const;
export const TRIAGE_ACTIONS={
  "service_health": [
    "Review platform health, latency, dependency, and error-rate evidence.",
    "Classify customer impact and assign a reliability owner.",
    "Decide whether launch observation remains open, moves to watch, or requires rollback review."
  ],
  "customer_feedback": [
    "Review first customer feedback and unresolved launch concerns.",
    "Assign customer-success owner and next customer follow-up time.",
    "Escalate if the customer cannot complete the first agreed workflow."
  ],
  "support_intake": [
    "Review open support tickets, SLA exposure, and response ownership.",
    "Route severe support blockers to support leadership.",
    "Record whether launch scope must remain frozen until support blockers close."
  ],
  "billing_confirmation": [
    "Confirm subscription, invoice, entitlement, and activation decision evidence.",
    "Assign billing owner for unclear, held, or disputed billing state.",
    "Block paid activation if billing state is not externally confirmed."
  ],
  "incident_review": [
    "Review incident severity, customer impact, mitigation, and active ownership.",
    "Escalate high-severity incidents before any rollout expansion.",
    "Record closure prerequisites before launch handoff can proceed."
  ],
  "rollback_readiness": [
    "Reconfirm rollback trigger, rollback owner, communication owner, and safe rollback point.",
    "Escalate immediately if rollback trigger is met or owner is missing.",
    "Record continue, hold, or rollback recommendation externally."
  ],
  "adoption_signal": [
    "Review first login, first workflow, first report/checklist, and adoption blocker evidence.",
    "Route workflow blockers to product/support owners.",
    "Keep post-launch observation open if first core workflow is blocked."
  ],
  "handoff_closure": [
    "Review launch notes, open blockers, follow-up owner, and next review time.",
    "Confirm destination board or owner for every unresolved launch item.",
    "Block handoff closure when unresolved blockers have no owner."
  ]
} as const;
export const TRIAGE_RULES=[
  "Use this queue only after the Step 222 post-launch observation prerequisites and external observation records are independently confirmed for the launch window.",
  "Every blocked, watch, missing, severe, unclear, or not-reviewed external observation must have an external triage owner before launch handoff.",
  "High customer impact, billing uncertainty, severe incident posture, rollback trigger, or blocked first workflow must prevent rollout expansion.",
  "This endpoint is read-only and does not observe or persist external observation outcomes, triage decisions, incidents, tickets, billing decisions, tenant changes, communications, or launch success certification."
] as const;
export const TRIAGE_EVIDENCE_LINKS=[
 {href:'/platform/system-health',label:'Open system health'},
 {href:'/platform/tenant-communications',label:'Open tenant communications'},
 {href:'/platform/support-cockpit',label:'Open support cockpit'},
 {href:'/platform/billing-subscription-activation',label:'Open billing activation'},
 {href:'/platform/incidents',label:'Open incidents'},
 {href:'/platform/deployment-validation',label:'Open deployment validation'},
 {href:'/platform/pilot-customer-readiness',label:'Open pilot readiness'},
 {href:'/platform/commercial-launch-post-launch-observation',label:'Open post-launch observation'}
] as const;
const PERSIST={stored_in_application:false,external_records_observable:false,interpretation:'This application prepares external triage records, does not store or observe outcomes.'};
export type TriageKind='blocked'|'review'|'go'|'smoke'|'window'|'external';
const KIND_STATUS:Record<TriageKind,[string,string,string]>= {
 blocked:['commercial_launch_post_launch_observation_blocked','blocked_until_post_launch_observation_ready','commercial_launch_incident_triage_blocked'],
 review:['commercial_launch_post_launch_observation_waiting_for_command_center_evidence_review','waiting_for_post_launch_evidence_review','commercial_launch_incident_triage_waiting_for_post_launch_evidence_review'],
 go:['commercial_launch_post_launch_observation_waiting_for_external_go_no_go_confirmation','waiting_for_external_go_no_go_confirmation','commercial_launch_incident_triage_waiting_for_external_go_no_go_confirmation'],
 smoke:['commercial_launch_post_launch_observation_waiting_for_external_smoke_test_confirmation','waiting_for_external_smoke_test_confirmation','commercial_launch_incident_triage_waiting_for_external_smoke_test_confirmation'],
 window:['commercial_launch_post_launch_observation_waiting_for_external_launch_window_confirmation','waiting_for_external_launch_window_confirmation','commercial_launch_incident_triage_waiting_for_external_launch_window_confirmation'],
 external:['commercial_launch_post_launch_observation_preparation_only','external_post_launch_observation_confirmation_required_before_triage','commercial_launch_incident_triage_waiting_for_external_post_launch_observation_confirmation']};
const PRECONDITIONS:Record<TriageKind,string>={
 blocked:'Resolve the blocked Post-Launch Observation prerequisite before incident triage starts.',
 review:'Resolve Post-Launch Observation evidence review before incident triage starts.',
 go:'Confirm the externally recorded go/no-go decisions before incident triage starts.',
 smoke:'Confirm the externally recorded smoke-test results before incident triage starts.',
 window:'Confirm the external launch-window decisions and that the production launch window opened before incident triage starts.',
 external:'Confirm the externally recorded post-launch observation for this domain before recording incident-triage decisions.'};
export type TriageSnapshot={phase:string;step:string;posture:string;generated_at:string;summary:Record<string,number>;
 triage_rows:Array<{code:string;source_observation_code:string;domain:string;owner:string;source_observation_status:string;
 source_observation_artifact:string;source_observation_artifact_storage:string;escalation_trigger:string;customer_impact_review_required:boolean;
 severity_values:string[];default_severity:string;manual_precondition:string;required_triage_fields:string[];
 triage_artifact:string;triage_artifact_storage:string;triage_actions:string[];triage_status:string}>;
 post_launch_observation_posture:string;post_launch_observation_persistence:any;command_center_posture:string;smoke_test_posture:string;
 go_no_go_register_posture:string;triage_persistence:any;triage_rules:string[];triage_limitations:string[];next_best_step:string;validation_note:string};
export function makeTriageSnapshot(kind:TriageKind='blocked'):TriageSnapshot{
 const [observationPosture,rowStatus,posture]=KIND_STATUS[kind];
 const triage_rows=OBSERVATION_CHECKS.map(o=>({code:`${o.code}_triage`,source_observation_code:o.code,domain:o.domain,owner:o.owner,
 source_observation_status:rowStatus,source_observation_artifact:'External commercial post-launch observation record',
 source_observation_artifact_storage:'external_not_persisted_by_application',escalation_trigger:o.escalation_trigger,
 customer_impact_review_required:true,severity_values:[...TRIAGE_SEVERITIES],default_severity:'not_reviewed',
 manual_precondition:PRECONDITIONS[kind],required_triage_fields:[...TRIAGE_FIELDS],
 triage_artifact:'External commercial launch incident-triage record',triage_artifact_storage:'external_not_persisted_by_application',
 triage_actions:[...TRIAGE_ACTIONS[o.domain]],triage_status:rowStatus}));
 const summary={triage_rows_total:8,waiting_for_post_launch_evidence_review:kind==='review'?8:0,
 waiting_for_external_go_no_go_confirmation:kind==='go'?8:0,waiting_for_external_smoke_test_confirmation:kind==='smoke'?8:0,
 waiting_for_external_launch_window_confirmation:kind==='window'?8:0,
 waiting_for_external_post_launch_observation_confirmation:kind==='external'?8:0,
 blocked_until_post_launch_observation_ready:kind==='blocked'?8:0,triage_records_persisted_in_application:0};
 return {phase:'Platform Commercial Launch Readiness',step:'Step 223 — Commercial Launch Incident Triage Queue',posture,generated_at:'2026-11-05T20:10:00.000Z',summary,
 triage_rows,post_launch_observation_posture:observationPosture,post_launch_observation_persistence:{...PERSIST},
 command_center_posture:'commercial_launch_day_command_center_preparation_only',smoke_test_posture:'commercial_launch_smoke_test_manual_execution_required',
 go_no_go_register_posture:'commercial_launch_go_no_go_preparation_only',triage_persistence:{...PERSIST,interpretation:'This application prepares incident-triage records but stores and observes no external triage outcomes. A zero persisted-triage count does not prove that no external triage records exist.'},
 triage_rules:[...TRIAGE_RULES],triage_limitations:[
 'Triage outcomes must be recorded externally because this endpoint is read-only.',
 'This application cannot observe whether external post-launch observations or incident-triage decisions have been recorded.',
 'No incident, ticket, message, customer record, billing record, rollback action, or tenant state is changed by this queue.',
 'No launch success, customer acceptance, incident closure, or rollout expansion is certified by this endpoint.'],
 next_best_step:PRECONDITIONS[kind],validation_note:'Read-only commercial launch incident-triage preparation surface. This synthetic GET does not prove triage decisions, incident changes or production launch.'};
}
export type TriageOptions={permissions?:string[];kind?:TriageKind;status?:number;expectHeading?:boolean;urlQuery?:string;
 alter?:(s:TriageSnapshot)=>TriageSnapshot;onCall?:(method:string,path:string,q:URLSearchParams)=>void;
 respond?:(method:string,path:string,q:URLSearchParams)=>{json:any;status?:number}|undefined};
export async function openTriage(page:Page,opts:TriageOptions={}){
 targetBaseURL();const permissions=opts.permissions??TRIAGE_PERMISSIONS;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),q=url.searchParams;
  opts.onCall?.(method,path,q);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic session cannot refresh'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@synthetic.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=opts.respond?.(method,path,q);if(override)return fulfillJson(route,override.json,override.status??200);
  if(method==='GET'&&path===TRIAGE_PATH){
   if(TRIAGE_PERMISSIONS.some(p=>!permissions.includes(p)))return fulfillJson(route,{message:'Forbidden'},403);
   if(opts.status&&opts.status>=400)return fulfillJson(route,{message:'Synthetic incident triage failure'},opts.status);
   const snapshot=makeTriageSnapshot(opts.kind);return fulfillJson(route,opts.alter?opts.alter(snapshot):snapshot);
  }
  return fulfillJson(route,{message:'Synthetic route unavailable'},404);
 });
 await page.goto(TRIAGE_PATH+(opts.urlQuery?'?'+opts.urlQuery:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Commercial Launch Incident Triage',exact:true})).toBeVisible();
}
