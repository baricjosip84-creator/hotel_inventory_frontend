/** Step 233: synthetic exception-closure UI response. This never proves any real closure or owner signoff. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
import {makeExceptionReviewSnapshot,SSER_PERMISSIONS,SSER_REQUIREMENTS} from './platformCommercialLaunchSteadyStateExceptionReviewFixture';
export const SSECL_PATH='/platform/commercial-launch-steady-state-exception-closure';
export const SSECL_PERMISSIONS=[...SSER_PERMISSIONS];
export const SSECL_REQUIRED_FIELDS={
  "missed_cadence": [
    "missed_cadence_root_cause",
    "recovered_cadence_date",
    "owner_recommitment",
    "future_cadence_prevention_control"
  ],
  "health_regression": [
    "regression_root_cause",
    "mitigation_or_rollback_evidence",
    "post_fix_health_sample",
    "operator_closure_signoff"
  ],
  "customer_adoption_risk": [
    "adoption_gap_resolution",
    "customer_success_follow_up",
    "training_or_enablement_completion",
    "customer_feedback_acceptance"
  ],
  "support_sla_risk": [
    "sla_breach_resolution",
    "ticket_queue_recovery",
    "escalation_path_confirmation",
    "support_lead_closure_signoff"
  ],
  "billing_entitlement_exception": [
    "entitlement_reconciliation_evidence",
    "subscription_state_confirmation",
    "overdue_account_decision",
    "billing_owner_closure_signoff"
  ],
  "backup_restore_gap": [
    "backup_gap_resolution",
    "restore_drill_retest_evidence",
    "tenant_export_validation",
    "recovery_owner_closure_signoff"
  ],
  "deployment_smoke_test_gap": [
    "failed_smoke_test_resolution",
    "environment_or_migration_fix_evidence",
    "post_fix_smoke_test_result",
    "release_manager_closure_signoff"
  ],
  "incident_prevention_gap": [
    "prevention_action_completion",
    "recurrence_risk_retest",
    "rollback_trigger_refresh",
    "customer_communication_closure_review"
  ],
  "growth_governance_exception": [
    "growth_exception_decision",
    "capacity_revalidation",
    "support_customer_success_revalidation",
    "rollback_readiness_refresh"
  ]
} as const;
export const SSECL_RULES=[
  "Every steady-state exception review row must have manual closure evidence before launch steady-state operations can be called closed.",
  "Critical and high severity rows require owner signoff plus post-fix evidence outside this read-only endpoint.",
  "This board is evidence-only and never closes operational tickets, incidents, billing exceptions, customer-success tasks, backup gaps, or release gates automatically."
] as const;
export const SSECL_LINK_COUNTS={
  "missed_cadence": 4,
  "health_regression": 4,
  "customer_adoption_risk": 2,
  "support_sla_risk": 3,
  "billing_entitlement_exception": 3,
  "backup_restore_gap": 4,
  "deployment_smoke_test_gap": 3,
  "incident_prevention_gap": 4,
  "growth_governance_exception": 4
} as const;
const controls=[
 'Confirm that the source exception review was manually completed in the operational system of record.',
 'Attach closure evidence and owner signoff outside this endpoint before treating the exception as closed.',
 'Re-enter launch governance if closure evidence is rejected, incomplete, stale, or contradicted by post-closure health signals.'
];
export const SSECL_CONTROLS=[...controls];
const limitations=[
 'Read-only steady-state exception closure board.',
 'Does not close, update, assign, notify, schedule, retry, rollback, or mutate any operational record automatically.',
 'Closure evidence must be recorded in support, incident, billing, customer-success, backup, release, or governance systems of record outside this endpoint.',
 'A waiting-for-manual-review Exception Review board is not proof that external exception-review acceptance exists; independent external confirmation remains required before closure can be treated as active.'
];
const boundary={stored_in_application:false,external_records_observable:false,interpretation:'This application prepares exception-closure requirements but stores and observes no external exception-closure records or signoffs. A zero persisted-closure count does not prove that no external closure record exists.'};
export function makeExceptionClosureSnapshot(){
 const rev=makeExceptionReviewSnapshot();
 const closureRows=rev.exception_rows.map(row=>({
  code:row.code+'_closure',source_exception_code:row.code,domain:row.domain,owner:row.owner,severity_hint:row.severity_hint,
  source_exception_review_status:row.exception_review_status,
  source_cadence_statuses:[...row.source_cadence_statuses],source_transition_rows:[...row.source_transition_rows],
  source_observation_rows:[...row.source_observation_rows],source_authorization_rows:[...row.source_authorization_rows],
  required_review_evidence:[...row.required_review_evidence],
  required_closure_evidence:[...(SSECL_REQUIRED_FIELDS[row.domain]??[])],closure_controls:[...SSECL_CONTROLS],
  closure_status:'waiting_for_exception_review_completion',accepted_external_closure_evidence:[],rejected_external_closure_evidence:[],
  release_condition:'manual_exception_closure_required_before_steady_state_launch_governance_can_be_closed'
 }));
 return {phase:'Platform Commercial Launch Readiness',step:'Step 233 — Commercial Launch Steady-State Exception Closure Board',
  posture:'commercial_launch_exception_closure_waiting_for_exception_review',generated_at:'2026-11-05T20:20:00.000Z',
  summary:{closure_rows_total:closureRows.length,waiting_for_exception_review_completion:closureRows.length,
   waiting_for_manual_exception_closure:0,critical_closure_rows:closureRows.filter(r=>r.severity_hint==='critical').length,
   high_closure_rows:closureRows.filter(r=>r.severity_hint==='high').length,
   medium_closure_rows:closureRows.filter(r=>r.severity_hint==='medium').length,exception_closure_records_persisted_in_application:0},
  closure_rows:closureRows,exception_review_posture:rev.posture,exception_review_persistence:rev.exception_review_persistence,
  operations_cadence_posture:rev.operations_cadence_posture,operations_cadence_persistence:rev.operations_cadence_persistence,
  steady_state_transition_posture:rev.steady_state_transition_posture,steady_state_transition_persistence:rev.steady_state_transition_persistence,
  additional_growth_observation_posture:rev.additional_growth_observation_posture,
  additional_growth_observation_persistence:rev.additional_growth_observation_persistence,
  additional_growth_authorization_posture:rev.additional_growth_authorization_posture,
  additional_growth_authorization_persistence:rev.additional_growth_authorization_persistence,
  expansion_health_observation_posture:rev.expansion_health_observation_posture,
  expansion_health_observation_persistence:rev.expansion_health_observation_persistence,
  rollout_expansion_authorization_posture:rev.rollout_expansion_authorization_posture,
  prevention_verification_posture:rev.prevention_verification_posture,incident_closure_posture:rev.incident_closure_posture,
  incident_triage_posture:rev.incident_triage_posture,post_launch_observation_posture:rev.post_launch_observation_posture,
  command_center_posture:rev.command_center_posture,smoke_test_posture:rev.smoke_test_posture,
  go_no_go_register_posture:rev.go_no_go_register_posture,exception_closure_persistence:{...boundary},
  closure_rules:[...SSECL_RULES],closure_limitations:[...limitations],
  next_best_step:'Resolve or independently confirm the external Steady-state Exception Review prerequisite before recording closure evidence.',
  validation_note:'This board is intentionally read-only. It preserves upstream exception-review, cadence, transition, observation and authorization traceability and persistence boundaries, stores no exception-closure outcomes, and does not infer external closure acceptance from prepared rows.'};
}
export type ClosureSnapshot=ReturnType<typeof makeExceptionClosureSnapshot>;
export type ClosureOptions={permissions?:string[];status?:number;expectHeading?:boolean;urlQuery?:string;
 alter?:(s:ClosureSnapshot)=>ClosureSnapshot;onCall?:(method:string,path:string,query:URLSearchParams)=>void;
 respond?:(method:string,path:string,query:URLSearchParams)=>{json:any;status?:number}|undefined};
export async function openExceptionClosure(page:Page,opts:ClosureOptions={}){
 targetBaseURL();const permissions=opts.permissions??SSECL_PERMISSIONS;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),q=url.searchParams;
  opts.onCall?.(method,path,q);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic session cannot refresh'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@synthetic.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=opts.respond?.(method,path,q);if(override)return fulfillJson(route,override.json,override.status??200);
  if(method==='GET'&&path===SSECL_PATH){
   if(SSECL_PERMISSIONS.some(p=>!permissions.includes(p)))return fulfillJson(route,{message:'Forbidden'},403);
   if(q.size)return fulfillJson(route,{message:'Unexpected query'},400);
   if(opts.status&&opts.status>=400)return fulfillJson(route,{message:'Synthetic exception-closure request failure'},opts.status);
   const snap=makeExceptionClosureSnapshot();return fulfillJson(route,opts.alter?opts.alter(snap):snap);
  }
  return fulfillJson(route,{message:'Synthetic route unavailable'},404);
 });
 await page.goto(SSECL_PATH+(opts.urlQuery?'?'+opts.urlQuery:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Commercial Launch Steady-State Exception Closure',exact:true})).toBeVisible();
}
