/** Step 232: synthetic read-only UI fixture; NEVER an actual exception or owner acceptance. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
import {makeCadenceSnapshot,SSOC_PERMISSIONS} from './platformCommercialLaunchSteadyStateOperationsCadenceFixture';
export const SSER_PATH='/platform/commercial-launch-steady-state-exception-review';
export const SSER_PERMISSIONS=[...SSOC_PERMISSIONS];
export const SSER_REQUIREMENTS=[
  {
    "code": "missed_operations_cadence_exception_review",
    "domain": "missed_cadence",
    "owner": "platform_operations_owner",
    "severity": "high",
    "sources": [
      "steady_state_executive_cadence",
      "steady_state_platform_health_cadence"
    ],
    "fields": [
      "missed_cadence_reason",
      "new_review_date",
      "owner_acknowledgement",
      "risk_acceptance_or_remediation"
    ],
    "controls": [
      "Any missed executive or platform-health cadence review must be visible before steady-state closure continues.",
      "A missed cadence needs owner acknowledgement and either remediation or explicit risk acceptance.",
      "This queue only lists required controls; it does not schedule or close reviews automatically."
    ]
  },
  {
    "code": "platform_health_regression_exception_review",
    "domain": "health_regression",
    "owner": "platform_operations_owner",
    "severity": "critical",
    "sources": [
      "steady_state_platform_health_cadence",
      "steady_state_deployment_smoke_test_cadence"
    ],
    "fields": [
      "health_regression_summary",
      "dependency_impact_review",
      "rollback_or_mitigation_decision",
      "operator_signoff"
    ],
    "controls": [
      "Health, dependency, alert, capacity, or deployment-smoke regressions must re-enter manual launch governance.",
      "Rollback or mitigation evidence is required outside this read-only endpoint.",
      "Unreviewed platform-health regressions block steady-state operating confidence."
    ]
  },
  {
    "code": "customer_adoption_risk_exception_review",
    "domain": "customer_adoption_risk",
    "owner": "customer_success_lead",
    "severity": "medium",
    "sources": [
      "steady_state_customer_success_cadence"
    ],
    "fields": [
      "adoption_gap_summary",
      "training_or_enablement_plan",
      "customer_feedback_review",
      "follow_up_owner"
    ],
    "controls": [
      "Customer adoption, training, and feedback risks must remain reviewed after launch.",
      "At-risk tenants must have a manual follow-up owner in the system of record.",
      "Customer-success exceptions block uncontrolled growth if not reviewed."
    ]
  },
  {
    "code": "support_sla_exception_review",
    "domain": "support_sla_risk",
    "owner": "support_lead",
    "severity": "high",
    "sources": [
      "steady_state_support_operations_cadence"
    ],
    "fields": [
      "sla_breach_summary",
      "ticket_queue_impact",
      "escalation_path_validation",
      "customer_communication_decision"
    ],
    "controls": [
      "SLA breaches, support queue risk, and escalation-path gaps require explicit review.",
      "Customer communication decisions must be recorded externally.",
      "Support exceptions block steady-state launch maturity until manually reviewed."
    ]
  },
  {
    "code": "billing_entitlement_exception_review",
    "domain": "billing_entitlement_exception",
    "owner": "billing_owner",
    "severity": "high",
    "sources": [
      "steady_state_billing_entitlement_cadence"
    ],
    "fields": [
      "subscription_exception_summary",
      "entitlement_reconciliation_result",
      "overdue_account_decision",
      "billing_owner_signoff"
    ],
    "controls": [
      "Subscription, entitlement, overdue, or billing exceptions require billing-owner review.",
      "Commercial access must not be assumed correct without external billing evidence.",
      "Billing exceptions block commercial steady-state confidence until reviewed."
    ]
  },
  {
    "code": "backup_restore_exception_review",
    "domain": "backup_restore_gap",
    "owner": "platform_operations_owner",
    "severity": "critical",
    "sources": [
      "steady_state_backup_restore_cadence"
    ],
    "fields": [
      "backup_gap_summary",
      "restore_drill_gap_review",
      "recovery_owner_decision",
      "next_drill_commitment"
    ],
    "controls": [
      "Backup, restore drill, tenant export, or recovery-owner gaps require explicit review.",
      "Recovery readiness cannot be certified by this endpoint alone.",
      "Backup/restore exceptions block production confidence until closed externally."
    ]
  },
  {
    "code": "deployment_smoke_test_exception_review",
    "domain": "deployment_smoke_test_gap",
    "owner": "release_manager",
    "severity": "high",
    "sources": [
      "steady_state_deployment_smoke_test_cadence"
    ],
    "fields": [
      "failed_smoke_test_summary",
      "environment_or_migration_review",
      "release_decision",
      "post_fix_validation"
    ],
    "controls": [
      "Failed or skipped deployment smoke tests must be visible before steady-state release confidence is claimed.",
      "Release decisions and post-fix validation must be recorded externally.",
      "Deployment smoke-test exceptions block future release maturity."
    ]
  },
  {
    "code": "incident_prevention_exception_review",
    "domain": "incident_prevention_gap",
    "owner": "incident_manager",
    "severity": "high",
    "sources": [
      "steady_state_incident_prevention_cadence"
    ],
    "fields": [
      "recurrence_risk_review",
      "prevention_action_gap",
      "rollback_trigger_review",
      "customer_communication_review"
    ],
    "controls": [
      "Incident prevention gaps and recurrence risks must re-enter manual exception review.",
      "Rollback trigger and customer communication posture must be revalidated after incidents.",
      "Unreviewed incident-prevention exceptions block steady-state confidence."
    ]
  },
  {
    "code": "growth_governance_exception_review",
    "domain": "growth_governance_exception",
    "owner": "product_owner",
    "severity": "medium",
    "sources": [
      "steady_state_growth_governance_cadence"
    ],
    "fields": [
      "growth_request_review",
      "capacity_exception_review",
      "support_cs_capacity_review",
      "rollback_readiness_refresh"
    ],
    "controls": [
      "Future growth waves need capacity, support, customer-success, and rollback evidence refresh.",
      "Growth exceptions block additional rollout until reviewed.",
      "This board does not authorize growth; it only exposes exception review requirements."
    ]
  }
] as const;
export const SSER_RULES=[
  "Any blocked or waiting steady-state operations cadence posture keeps exception review in manual-review mode.",
  "Exception rows are read-only requirements and must be closed in operational systems of record outside this endpoint.",
  "This endpoint must not create tickets, incidents, alerts, reminders, schedules, billing changes, tenant changes, or release changes automatically."
] as const;
export const SSER_LINK_COUNTS={
  "missed_cadence": 3,
  "health_regression": 4,
  "customer_adoption_risk": 2,
  "support_sla_risk": 3,
  "billing_entitlement_exception": 3,
  "backup_restore_gap": 4,
  "deployment_smoke_test_gap": 3,
  "incident_prevention_gap": 4,
  "growth_governance_exception": 4
} as const;
const exceptionsLimitations=[
  'Read-only steady-state exception review queue.',
  'Does not create, update, assign, close, notify, accept, or reject exceptions automatically.',
  'Manual exception evidence must be recorded in support, incident, billing, release, backup, or customer-success systems of record outside this endpoint.',
  'A waiting-for-manual-review Operations Cadence board is not proof that external cadence acceptance exists; independent external confirmation remains required before exception review can be treated as active.'
];
const localBoundary={stored_in_application:false,external_records_observable:false,interpretation:'This application prepares exception-review requirements but stores and observes no external exception-review decisions or closure records. A zero persisted-review count does not prove that no external exception-review records exist.'};
export function makeExceptionReviewSnapshot(){
 const c=makeCadenceSnapshot('blocked');
 const byCode=new Map(c.cadence_rows.map(row=>[row.code,row]));
 const uniq=(values:string[])=>[...new Set(values.filter(Boolean))];
 const rows=SSER_REQUIREMENTS.map(q=>{
  const sources=q.sources.map(code=>byCode.get(code)).filter((r):r is NonNullable<typeof r>=>Boolean(r));
  return {code:q.code,domain:q.domain,owner:q.owner,severity_hint:q.severity,source_cadence_codes:[...q.sources],
    source_cadence_statuses:sources.map(row=>({code:row.code,status:row.cadence_status,cadence:row.cadence})),
    source_transition_rows:uniq(sources.flatMap(row=>row.source_transition_rows)),
    source_observation_rows:uniq(sources.flatMap(row=>row.source_observation_rows)),
    source_authorization_rows:uniq(sources.flatMap(row=>row.source_authorization_rows)),
    source_operations_cadence_posture:c.posture,required_review_evidence:[...q.fields],exception_controls:[...q.controls],
    exception_review_status:'waiting_for_operations_cadence_acceptance',accepted_external_evidence:[],rejected_external_evidence:[],
    release_condition:'manual_exception_review_required_before_commercial_launch_steady_state_can_be_closed'};
 });
 const summary={exception_rows_total:rows.length,waiting_for_operations_cadence_acceptance:rows.length,
  waiting_for_manual_exception_review:0,critical_exception_reviews:rows.filter(row=>row.severity_hint==='critical').length,
  high_exception_reviews:rows.filter(row=>row.severity_hint==='high').length,
  medium_exception_reviews:rows.filter(row=>row.severity_hint==='medium').length,exception_review_records_persisted_in_application:0};
 return {phase:'Platform Commercial Launch Readiness',step:'Step 232 — Commercial Launch Steady-State Exception Review Queue',
  posture:'commercial_launch_exception_review_waiting_for_operations_cadence',generated_at:'2026-11-05T19:50:00.000Z',summary,
  exception_rows:rows,operations_cadence_posture:c.posture,operations_cadence_persistence:c.steady_state_operations_cadence_persistence,
  steady_state_transition_posture:c.steady_state_transition_posture,steady_state_transition_persistence:c.steady_state_transition_persistence,
  additional_growth_observation_posture:c.additional_growth_observation_posture,
  additional_growth_observation_persistence:c.additional_growth_observation_persistence,
  additional_growth_authorization_posture:c.additional_growth_authorization_posture,
  additional_growth_authorization_persistence:c.additional_growth_authorization_persistence,
  expansion_health_observation_posture:c.expansion_health_observation_posture,
  expansion_health_observation_persistence:c.expansion_health_observation_persistence,
  rollout_expansion_authorization_posture:c.rollout_expansion_authorization_posture,
  prevention_verification_posture:c.prevention_verification_posture,incident_closure_posture:c.incident_closure_posture,
  incident_triage_posture:c.incident_triage_posture,post_launch_observation_posture:c.post_launch_observation_posture,
  command_center_posture:c.command_center_posture,smoke_test_posture:c.smoke_test_posture,
  go_no_go_register_posture:c.go_no_go_register_posture,exception_review_persistence:{...localBoundary},
  exception_review_rules:[...SSER_RULES],exception_review_limitations:[...exceptionsLimitations],
  next_best_step:'Resolve or independently confirm the external Steady-state Operations Cadence prerequisite before recording exception-review decisions.',
  validation_note:'This queue is intentionally read-only. It preserves upstream cadence, transition, observation and authorization traceability and persistence boundaries, stores no exception-review outcomes, and does not infer external review acceptance from prepared rows.'};
}
export type ExceptionSnapshot=ReturnType<typeof makeExceptionReviewSnapshot>;
export type ExceptionOptions={permissions?:string[];status?:number;expectHeading?:boolean;urlQuery?:string;
 alter?:(s:ExceptionSnapshot)=>ExceptionSnapshot;onCall?:(method:string,path:string,query:URLSearchParams)=>void;
 respond?:(method:string,path:string,query:URLSearchParams)=>{json:any;status?:number}|undefined};
export async function openExceptionReview(page:Page,opts:ExceptionOptions={}){
 targetBaseURL();const permissions=opts.permissions??SSER_PERMISSIONS;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),q=url.searchParams;
  opts.onCall?.(method,path,q);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic session cannot refresh'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@synthetic.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=opts.respond?.(method,path,q);if(override)return fulfillJson(route,override.json,override.status??200);
  if(method==='GET'&&path===SSER_PATH){
   if(SSER_PERMISSIONS.some(p=>!permissions.includes(p)))return fulfillJson(route,{message:'Forbidden'},403);
   if(q.size)return fulfillJson(route,{message:'Unexpected query'},400);
   if(opts.status&&opts.status>=400)return fulfillJson(route,{message:'Synthetic exception-review request failure'},opts.status);
   const snapshot=makeExceptionReviewSnapshot();return fulfillJson(route,opts.alter?opts.alter(snapshot):snapshot);
  }
  return fulfillJson(route,{message:'Synthetic route unavailable'},404);
 });
 await page.goto(SSER_PATH+(opts.urlQuery?'?'+opts.urlQuery:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Commercial Launch Steady-State Exception Review',exact:true})).toBeVisible();
}
