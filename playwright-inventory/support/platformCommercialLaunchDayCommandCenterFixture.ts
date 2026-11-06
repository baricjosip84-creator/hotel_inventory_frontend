/** Batch 121, Step 221 — synthetic GET fixture for read-only launch-window template UI. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
import {SMOKE_PERMISSIONS,makeSmokeSnapshot} from './platformCommercialLaunchSmokeTestChecklistFixture';
export const COMMAND_PATH='/platform/commercial-launch-day-command-center';
export const COMMAND_PERMISSIONS=[...SMOKE_PERMISSIONS];
export const COMMAND_FIELDS=["owner_name", "decision_channel", "target_environment", "backend_release_reference", "frontend_release_reference", "go_no_go_decision_reference", "smoke_test_result_reference", "evidence_link", "launch_window_reference", "decision_status", "limitation_or_hold_reason", "rollback_owner", "reviewed_at"] as const;
export const COMMAND_DECISIONS=["ready", "hold", "conditional_ready", "not_reviewed"] as const;
export const COMMAND_CHECKPOINTS=[
  {
    "code": "launch_window_owner_confirmed",
    "domain": "launch_window_control",
    "owner": "release_owner",
    "required_evidence": "Launch-window owner, deputy owner, start time, end time, and decision channel are recorded for the target launch environment.",
    "hold_trigger": "missing_launch_window_owner_or_decision_channel",
    "href": "/platform/commercial-launch-go-no-go-register",
    "label": "Open Go/No-Go register"
  },
  {
    "code": "smoke_test_runner_confirmed",
    "domain": "smoke_test_execution",
    "owner": "platform_operations_owner",
    "required_evidence": "Smoke-test runner, browser/device, selected tenant/account, and evidence capture location are confirmed before launch starts.",
    "hold_trigger": "missing_smoke_test_runner_or_evidence_location",
    "href": "/platform/commercial-launch-smoke-test-checklist",
    "label": "Open smoke-test checklist"
  },
  {
    "code": "customer_success_launch_contact_confirmed",
    "domain": "customer_communication",
    "owner": "customer_success_owner",
    "required_evidence": "Customer success launch contact, customer contact path, communication window, and follow-up cadence are confirmed.",
    "hold_trigger": "missing_customer_success_or_customer_contact_path",
    "href": "/platform/pilot-customer-readiness",
    "label": "Open pilot readiness"
  },
  {
    "code": "support_escalation_path_confirmed",
    "domain": "support_readiness",
    "owner": "support_owner",
    "required_evidence": "Support escalation owner, SLA posture, triage channel, and first-response expectation are confirmed for launch day.",
    "hold_trigger": "missing_support_escalation_path",
    "href": "/platform/support-cockpit",
    "label": "Open support cockpit"
  },
  {
    "code": "billing_activation_hold_confirmed",
    "domain": "billing_activation_control",
    "owner": "billing_owner",
    "required_evidence": "Paid activation timing, manual hold rule, plan/entitlement owner, and invoice/subscription evidence location are confirmed.",
    "hold_trigger": "missing_billing_activation_hold_or_entitlement_owner",
    "href": "/platform/billing-subscription-activation",
    "label": "Open billing activation"
  },
  {
    "code": "incident_commander_confirmed",
    "domain": "incident_response",
    "owner": "platform_reliability_owner",
    "required_evidence": "Incident commander, severity rule, incident channel, customer-impact communication owner, and escalation trigger are confirmed.",
    "hold_trigger": "missing_incident_commander_or_severity_rule",
    "href": "/platform/incidents",
    "label": "Open incidents"
  },
  {
    "code": "rollback_decision_owner_confirmed",
    "domain": "rollback_control",
    "owner": "release_owner",
    "required_evidence": "Rollback decision owner, rollback trigger, rollback communication owner, and final stop/go rule are confirmed.",
    "hold_trigger": "missing_rollback_owner_or_trigger",
    "href": "/platform/deployment-validation",
    "label": "Open deployment validation"
  },
  {
    "code": "post_launch_observation_window_confirmed",
    "domain": "post_launch_observation",
    "owner": "platform_operations_owner",
    "required_evidence": "Post-launch observation window, monitoring owner, check cadence, and handoff rule are confirmed before launch window closes.",
    "hold_trigger": "missing_post_launch_observation_owner_or_cadence",
    "href": "/platform/monitoring-readiness",
    "label": "Open monitoring readiness"
  }
] as const;
export type CommandRow={code:string;domain:string;owner:string;required_evidence:string;hold_trigger:string;
 source_smoke_test_posture:string;source_smoke_tests_total:number;
 source_smoke_tests_requiring_evidence_review:number;source_smoke_tests_awaiting_external_go_no_go_confirmation:number;
 source_smoke_tests_blocked:number;manual_precondition:string;required_decision_fields:string[];
 allowed_decision_statuses:string[];default_decision_status:string;decision_artifact:string;
 decision_artifact_storage:string;command_center_status:string};
export type CommandSnapshot={phase:string;step:string;posture:string;generated_at:string;
 summary:Record<string,number>;checkpoints:CommandRow[];smoke_test_posture:string;smoke_test_summary:Record<string,number>;
 smoke_test_result_persistence:{stored_in_application:boolean;external_records_observable:boolean;interpretation:string}|null;
 go_no_go_register_posture:string;go_no_go_decision_persistence:{stored_in_application:boolean;external_records_observable:boolean;interpretation:string}|null;
 acceptance_packet_posture:string;certificate_posture:string;
 decision_persistence:{stored_in_application:boolean;external_records_observable:boolean;interpretation:string};
 command_center_rules:string[];launch_day_limitations:string[];next_best_step:string;validation_note:string};
const rules=[
 'Use this command center only after the Launch Go/No-Go and Launch Smoke Test evidence is clear enough for the real launch-window team to proceed.',
 'Because this application cannot observe external go/no-go decisions or smoke-test results, the launch operator must confirm those external records before relying on any launch-window checkpoint.',
 'Do not start the launch window until every checkpoint has an assigned owner, evidence location, go/no-go decision reference, and smoke-test result reference outside this read-only endpoint.',
 'Any failed smoke test, missing owner, billing uncertainty, incident escalation gap, or rollback ambiguity must hold the launch.',
 'Conditional launch is allowed only with explicit limitation, expiry, customer/support owner, and rollback decision owner.',
 'This endpoint does not persist launch-day decisions and does not certify the launch as successful.'
];
const limits=[
 'Launch-day decisions must be recorded in an external evidence system or ticket because this endpoint is read-only.',
 'This application cannot observe whether external go/no-go decisions, smoke-test results, or command-center decisions have been recorded.',
 'No tenant is provisioned, upgraded, billed, notified, or marked live by this command center.',
 'No smoke tests are executed automatically by this command center.',
 'Commercial success, customer adoption, payment collection, and production reliability are not certified by this endpoint.'
];
export function makeCommandSnapshot(kind:'mixed'|'ready'|'review'|'manual'='mixed'):CommandSnapshot{
 const smoke=makeSmokeSnapshot(kind==='manual'?'ready':kind);
 const postureSource=kind==='manual'?'commercial_launch_smoke_test_ready_for_manual_execution':smoke.posture;
 const status=postureSource==='commercial_launch_smoke_test_evidence_review_required'?'evidence_review_required_before_launch_window':
  postureSource==='commercial_launch_smoke_test_waiting_for_go_no_go_decisions'?'external_go_no_go_confirmation_required_before_launch_window':
  postureSource==='commercial_launch_smoke_test_ready_for_manual_execution'?'external_smoke_test_confirmation_required_before_launch_window':
  postureSource==='commercial_launch_smoke_test_empty'?'blocked_until_smoke_test_rows_available':'blocked_until_smoke_test_checklist_ready';
 const precondition=status==='evidence_review_required_before_launch_window'?'Resolve review-required Launch Go/No-Go or Smoke Test evidence before preparing the launch window.':
 status==='external_go_no_go_confirmation_required_before_launch_window'?'Confirm the externally recorded go/no-go decisions and their evidence references before the launch window is opened.':
 status==='external_smoke_test_confirmation_required_before_launch_window'?'Confirm the externally recorded smoke-test results, release references, and failure/retest evidence before the launch window is opened.':
 status==='blocked_until_smoke_test_rows_available'?'Restore the expected smoke-test checklist rows before preparing launch-window checkpoints.':
 'Resolve the blocked Launch Smoke Test prerequisite before preparing launch-window checkpoints.';
 const checkpoints:CommandRow[]=COMMAND_CHECKPOINTS.map(c=>({code:c.code,domain:c.domain,owner:c.owner,required_evidence:c.required_evidence,hold_trigger:c.hold_trigger,
 source_smoke_test_posture:postureSource,source_smoke_tests_total:smoke.summary.smoke_tests_total||0,
 source_smoke_tests_requiring_evidence_review:smoke.summary.smoke_tests_requiring_evidence_review||0,
 source_smoke_tests_awaiting_external_go_no_go_confirmation:smoke.summary.smoke_tests_awaiting_external_go_no_go_confirmation||0,
 source_smoke_tests_blocked:smoke.summary.smoke_tests_blocked||0,manual_precondition:precondition,
 required_decision_fields:[...COMMAND_FIELDS],allowed_decision_statuses:[...COMMAND_DECISIONS],default_decision_status:'not_reviewed',
 decision_artifact:'External commercial launch-day command-center decision record',decision_artifact_storage:'external_not_persisted_by_application',command_center_status:status}));
 const summary={checkpoints_total:8,
 checkpoints_requiring_evidence_review:status==='evidence_review_required_before_launch_window'?8:0,
 checkpoints_awaiting_external_go_no_go_confirmation:status==='external_go_no_go_confirmation_required_before_launch_window'?8:0,
 checkpoints_awaiting_external_smoke_test_confirmation:status==='external_smoke_test_confirmation_required_before_launch_window'?8:0,
 checkpoints_blocked:status.startsWith('blocked_')?8:0,decision_records_persisted_in_application:0};
 const posture=summary.checkpoints_blocked?'commercial_launch_day_command_center_blocked':
 summary.checkpoints_requiring_evidence_review?'commercial_launch_day_command_center_evidence_review_required':
 summary.checkpoints_awaiting_external_go_no_go_confirmation?'commercial_launch_day_command_center_waiting_for_external_go_no_go_confirmation':
 summary.checkpoints_awaiting_external_smoke_test_confirmation?'commercial_launch_day_command_center_waiting_for_external_smoke_test_confirmation':'commercial_launch_day_command_center_preparation_only';
 const next_best_step=summary.checkpoints_blocked?'Resolve the blocked Launch Smoke Test prerequisite before preparing the real launch window.':
 summary.checkpoints_requiring_evidence_review?'Resolve the remaining review-required Go/No-Go or Smoke Test evidence before launch-window preparation continues.':
 summary.checkpoints_awaiting_external_go_no_go_confirmation?'Confirm the externally recorded go/no-go decisions and evidence references before opening the launch window.':
 summary.checkpoints_awaiting_external_smoke_test_confirmation?'Confirm the externally recorded smoke-test results and release references before opening the launch window.':
 'Use this preparation board during the real launch window, record checkpoint decisions externally, and keep the launch on hold whenever required evidence is unresolved.';
 return {phase:'Platform Commercial Launch Readiness',step:'Step 221 — Commercial Launch Day Command Center',posture,
 generated_at:'2026-11-05T20:10:00.000Z',summary,checkpoints,smoke_test_posture:postureSource,smoke_test_summary:smoke.summary,
 smoke_test_result_persistence:smoke.result_persistence,go_no_go_register_posture:smoke.go_no_go_register_posture,
 go_no_go_decision_persistence:smoke.go_no_go_decision_persistence,acceptance_packet_posture:smoke.acceptance_packet_posture,
 certificate_posture:smoke.certificate_posture,decision_persistence:{stored_in_application:false,external_records_observable:false,
 interpretation:'This application prepares launch-window checkpoint records but stores and observes no external command-center decisions. A zero persisted-decision count does not prove that no external launch-window decisions exist.'},
 command_center_rules:rules,launch_day_limitations:limits,next_best_step,
 validation_note:'Read-only launch-day preparation surface. It preserves the current Smoke Test prerequisite posture and defines external launch-window decision fields, but it cannot observe external go/no-go decisions, smoke-test results, or command-center decisions and does not execute launch actions, persist approvals, activate billing, or claim successful production launch.'};
}
export type CommandOptions={permissions?:string[];kind?:'mixed'|'ready'|'review'|'manual';status?:number;expectHeading?:boolean;urlQuery?:string;
 alter?:(s:CommandSnapshot)=>CommandSnapshot;onCall?:(method:string,path:string,q:URLSearchParams)=>void;
 respond?:(method:string,path:string,q:URLSearchParams)=>{json:any;status?:number}|undefined};
export async function openCommandCenter(page:Page,opts:CommandOptions={}){
 targetBaseURL();const permissions=opts.permissions??COMMAND_PERMISSIONS;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),q=url.searchParams;
  opts.onCall?.(method,path,q);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic token cannot refresh'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@synthetic.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=opts.respond?.(method,path,q);if(override)return fulfillJson(route,override.json,override.status??200);
  if(method==='GET'&&path===COMMAND_PATH){
   if(COMMAND_PERMISSIONS.some(p=>!permissions.includes(p)))return fulfillJson(route,{message:'Forbidden'},403);
   if(opts.status&&opts.status>=400)return fulfillJson(route,{message:'Synthetic launch command center read failure'},opts.status);
   const snapshot=makeCommandSnapshot(opts.kind);return fulfillJson(route,opts.alter?opts.alter(snapshot):snapshot);
  }
  return fulfillJson(route,{message:'Synthetic route unavailable'},404);
 });
 await page.goto(COMMAND_PATH+(opts.urlQuery?'?'+opts.urlQuery:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Commercial Launch Day Command Center',exact:true})).toBeVisible();
}
