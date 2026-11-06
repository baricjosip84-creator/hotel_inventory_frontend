/** Batch 122 Step 222 — synthetic read-only presentation fixture from immutable original BE/FE source. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
import {COMMAND_PERMISSIONS} from './platformCommercialLaunchDayCommandCenterFixture';
export const OBSERVATION_PATH='/platform/commercial-launch-post-launch-observation';
export const OBSERVATION_PERMISSIONS=[...COMMAND_PERMISSIONS];
export const OBSERVATION_FIELDS=["owner_name", "observation_window", "target_environment", "backend_release_reference", "frontend_release_reference", "go_no_go_decision_reference", "smoke_test_result_reference", "command_center_decision_reference", "evidence_link", "status", "blocker_or_escalation_reason", "customer_impact", "follow_up_owner", "reviewed_at"] as const;
export const OBSERVATION_STATUSES=["healthy", "watch", "blocked", "not_reviewed"] as const;
export const OBSERVATION_CHECKS=[
  {
    "code": "service_health_observation_recorded",
    "domain": "service_health",
    "owner": "platform_operations_owner",
    "required_evidence": "Health endpoint status, dependency status, error-rate review, latency review, and observation timestamp are recorded after launch window start.",
    "escalation_trigger": "health_degradation_or_missing_observation_evidence",
    "href": "/platform/system-health",
    "label": "Open system health"
  },
  {
    "code": "customer_feedback_window_opened",
    "domain": "customer_feedback",
    "owner": "customer_success_owner",
    "required_evidence": "Customer contact, feedback channel, first-use confirmation, open concerns, and next follow-up time are recorded.",
    "escalation_trigger": "missing_customer_contact_or_unresolved_launch_concern",
    "href": "/platform/tenant-communications",
    "label": "Open tenant communications"
  },
  {
    "code": "support_intake_reviewed",
    "domain": "support_intake",
    "owner": "support_owner",
    "required_evidence": "Launch-day support queue, open customer tickets, SLA impact, response owner, and unresolved support blocker are reviewed.",
    "escalation_trigger": "open_severe_support_ticket_or_sla_breach_risk",
    "href": "/platform/support-cockpit",
    "label": "Open support cockpit"
  },
  {
    "code": "billing_activation_confirmed_or_held",
    "domain": "billing_confirmation",
    "owner": "billing_owner",
    "required_evidence": "Plan, subscription/invoice state, entitlement state, paid-activation decision, and any billing hold reason are recorded.",
    "escalation_trigger": "billing_state_unclear_or_paid_activation_not_authorized",
    "href": "/platform/billing-subscription-activation",
    "label": "Open billing activation"
  },
  {
    "code": "incident_review_completed",
    "domain": "incident_review",
    "owner": "platform_reliability_owner",
    "required_evidence": "Incident channel, severity review, customer-impact review, mitigation status, and unresolved incident owner are recorded.",
    "escalation_trigger": "active_high_severity_incident_or_missing_customer_impact_review",
    "href": "/platform/incidents",
    "label": "Open incidents"
  },
  {
    "code": "rollback_readiness_reconfirmed",
    "domain": "rollback_readiness",
    "owner": "release_owner",
    "required_evidence": "Rollback trigger, rollback owner, communication owner, latest safe rollback point, and continue/hold decision are reconfirmed.",
    "escalation_trigger": "rollback_trigger_met_or_rollback_owner_missing",
    "href": "/platform/deployment-validation",
    "label": "Open deployment validation"
  },
  {
    "code": "first_adoption_signal_reviewed",
    "domain": "adoption_signal",
    "owner": "product_owner",
    "required_evidence": "First user login/use, first operational workflow, first report/checklist outcome, and adoption blocker are reviewed.",
    "escalation_trigger": "customer_unable_to_complete_first_core_workflow",
    "href": "/platform/pilot-customer-readiness",
    "label": "Open pilot readiness"
  },
  {
    "code": "launch_handoff_closure_prepared",
    "domain": "handoff_closure",
    "owner": "release_owner",
    "required_evidence": "Launch-day notes, open blockers, follow-up owner, next review time, and handoff destination are recorded before the launch window closes.",
    "escalation_trigger": "missing_handoff_owner_or_open_blockers_without_follow_up",
    "href": "/platform/commercial-launch-day-command-center",
    "label": "Open command center"
  }
] as const;
export type ObservationSnapshot={phase:string;step:string;posture:string;generated_at:string;summary:Record<string,number>;
 observation_rows:Array<{code:string;domain:string;owner:string;required_evidence:string;escalation_trigger:string;
 source_command_center_posture:string;source_checkpoints_total:number;source_checkpoints_blocked:number;
 source_checkpoints_requiring_evidence_review:number;source_checkpoints_awaiting_external_go_no_go_confirmation:number;
 source_checkpoints_awaiting_external_smoke_test_confirmation:number;manual_precondition:string;
 required_observation_fields:string[];allowed_observation_statuses:string[];default_observation_status:string;
 observation_artifact:string;observation_artifact_storage:string;observation_status:string}>;
 command_center_posture:string;command_center_decision_persistence:any;smoke_test_posture:string;smoke_test_result_persistence:any;
 go_no_go_register_posture:string;go_no_go_decision_persistence:any;acceptance_packet_posture:string;certificate_posture:string;
 observation_persistence:{stored_in_application:boolean;external_records_observable:boolean;interpretation:string};
 post_launch_rules:string[];observation_limitations:string[];next_best_step:string;validation_note:string};
const PERSIST={stored_in_application:false,external_records_observable:false,interpretation:'This application prepares external evidence only; no external records are observable.'};
export type ObservationKind='blocked'|'review'|'go'|'smoke'|'external';
const KIND_STATUS:Record<ObservationKind,[string,string,string]>= {
 blocked:['commercial_launch_day_command_center_blocked','blocked_until_command_center_ready','commercial_launch_post_launch_observation_blocked'],
 review:['commercial_launch_day_command_center_evidence_review_required','waiting_for_command_center_evidence_review','commercial_launch_post_launch_observation_waiting_for_command_center_evidence_review'],
 go:['commercial_launch_day_command_center_waiting_for_external_go_no_go_confirmation','waiting_for_external_go_no_go_confirmation','commercial_launch_post_launch_observation_waiting_for_external_go_no_go_confirmation'],
 smoke:['commercial_launch_day_command_center_waiting_for_external_smoke_test_confirmation','waiting_for_external_smoke_test_confirmation','commercial_launch_post_launch_observation_waiting_for_external_smoke_test_confirmation'],
 external:['commercial_launch_day_command_center_preparation_only','external_launch_window_confirmation_required_before_post_launch_observation','commercial_launch_post_launch_observation_waiting_for_external_launch_window_confirmation']};
const PRECONDITIONS:Record<ObservationKind,string>={
 blocked:'Resolve the blocked Launch Command Center prerequisite before post-launch observation starts.',
 review:'Resolve the Command Center evidence review before post-launch observation starts.',
 go:'Confirm the externally recorded go/no-go decisions before post-launch observation starts.',
 smoke:'Confirm the externally recorded smoke-test results before post-launch observation starts.',
 external:'Confirm the external launch-window checkpoint decisions and that the real production launch window opened before recording post-launch observations.'};
export function makeObservationSnapshot(kind:ObservationKind='blocked'):ObservationSnapshot{
 const [source,flag,posture]=KIND_STATUS[kind];
 const observation_rows=OBSERVATION_CHECKS.map(c=>({code:c.code,domain:c.domain,owner:c.owner,required_evidence:c.required_evidence,escalation_trigger:c.escalation_trigger,
 source_command_center_posture:source,source_checkpoints_total:8,source_checkpoints_blocked:kind==='blocked'?8:0,
 source_checkpoints_requiring_evidence_review:kind==='review'?8:0,
 source_checkpoints_awaiting_external_go_no_go_confirmation:kind==='go'?8:0,
 source_checkpoints_awaiting_external_smoke_test_confirmation:kind==='smoke'?8:0,
 manual_precondition:PRECONDITIONS[kind],required_observation_fields:[...OBSERVATION_FIELDS],allowed_observation_statuses:[...OBSERVATION_STATUSES],
 default_observation_status:'not_reviewed',observation_artifact:'External commercial post-launch observation record',
 observation_artifact_storage:'external_not_persisted_by_application',observation_status:flag}));
 const summary={observation_checks_total:8,waiting_for_command_center_evidence_review:kind==='review'?8:0,
 waiting_for_external_go_no_go_confirmation:kind==='go'?8:0,waiting_for_external_smoke_test_confirmation:kind==='smoke'?8:0,
 waiting_for_external_launch_window_confirmation:kind==='external'?8:0,blocked_until_command_center_ready:kind==='blocked'?8:0,
 observation_records_persisted_in_application:0};
 return {phase:'Platform Commercial Launch Readiness',step:'Step 222 — Commercial Launch Post-Launch Observation Board',posture,
 generated_at:'2026-11-05T20:00:00.000Z',summary,observation_rows,command_center_posture:source,
 command_center_decision_persistence:{...PERSIST},smoke_test_posture:'commercial_launch_smoke_test_manual_execution_required',
 smoke_test_result_persistence:{...PERSIST},go_no_go_register_posture:'commercial_launch_go_no_go_preparation_only',
 go_no_go_decision_persistence:{...PERSIST},acceptance_packet_posture:'commercial_launch_acceptance_preparation_only',
 certificate_posture:'commercial_launch_certificate_precheck_only',observation_persistence:{...PERSIST,interpretation:'This application prepares post-launch observation records but stores and observes no external observation outcomes. A zero persisted-observation count does not prove that no external observation records exist.'},
 post_launch_rules:[
 'Use this board only after the real launch window prerequisites are externally confirmed; this application cannot observe those external confirmations.',
 'Do not close launch observation until service health, support intake, customer feedback, billing state, incident posture, rollback readiness, adoption signal, and handoff evidence are recorded externally.',
 'Any severe incident, unclear billing state, failed customer workflow, missing rollback owner, or unresolved support blocker must keep launch observation open.',
 'This endpoint is read-only and does not persist observation outcomes, observe external launch-window decisions, or certify that launch succeeded.'],
 observation_limitations:[
 'Observation outcomes must be recorded externally because this endpoint is read-only.',
 'This application cannot observe whether external go/no-go decisions, smoke-test results, launch-window decisions, or post-launch observations have been recorded.',
 'No incidents, tickets, billing records, customer messages, or tenant states are changed by this board.',
 'No production launch success, paid conversion, customer adoption, or reliability result is certified by this endpoint.'],
 next_best_step:PRECONDITIONS[kind],validation_note:'Read-only post-launch observation preparation surface. No live launch evidence exists in this synthetic GET.'};
}
export type ObservationOptions={permissions?:string[];kind?:ObservationKind;status?:number;expectHeading?:boolean;urlQuery?:string;
 alter?:(s:ObservationSnapshot)=>ObservationSnapshot;onCall?:(method:string,path:string,q:URLSearchParams)=>void;
 respond?:(method:string,path:string,q:URLSearchParams)=>{json:any;status?:number}|undefined};
export async function openObservation(page:Page,opts:ObservationOptions={}){
 targetBaseURL();const permissions=opts.permissions??OBSERVATION_PERMISSIONS;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),q=url.searchParams;
  opts.onCall?.(method,path,q);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic session cannot refresh'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@synthetic.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=opts.respond?.(method,path,q);if(override)return fulfillJson(route,override.json,override.status??200);
  if(method==='GET'&&path===OBSERVATION_PATH){
   if(OBSERVATION_PERMISSIONS.some(p=>!permissions.includes(p)))return fulfillJson(route,{message:'Forbidden'},403);
   if(opts.status&&opts.status>=400)return fulfillJson(route,{message:'Synthetic post-launch observation failure'},opts.status);
   const snapshot=makeObservationSnapshot(opts.kind);return fulfillJson(route,opts.alter?opts.alter(snapshot):snapshot);
  }
  return fulfillJson(route,{message:'Synthetic route unavailable'},404);
 });
 await page.goto(OBSERVATION_PATH+(opts.urlQuery?'?'+opts.urlQuery:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Commercial Launch Post-Launch Observation',exact:true})).toBeVisible();
}
