/** Step 237: synthetic durable-closure certification board. No real approval, certificate, or owner signoff. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
import {makeResolutionVerificationSnapshot,SSRV_PERMISSIONS} from './platformCommercialLaunchSteadyStateResolutionVerificationFixture';
export const DCC_PATH='/platform/commercial-launch-durable-closure-certification';
export const DCC_PERMISSIONS=[...SSRV_PERMISSIONS];
export const DCC_REQUIRED_FIELDS={
  "missed_cadence": [
    "signed_operations_cadence_closure",
    "cadence_sustainment_owner_acceptance",
    "durable_cadence_exception_reopen_rule",
    "next_cadence_review_date_recorded"
  ],
  "health_regression": [
    "signed_health_regression_closure",
    "monitoring_owner_sustainment_acceptance",
    "durable_health_reopen_threshold",
    "customer_impact_clearance_recorded"
  ],
  "customer_adoption_risk": [
    "signed_customer_adoption_closure",
    "customer_success_sustainment_acceptance",
    "training_follow_up_closure",
    "customer_feedback_clearance_recorded"
  ],
  "support_sla_risk": [
    "signed_support_sla_closure",
    "support_lead_sustainment_acceptance",
    "backlog_clearance_evidence",
    "sla_exception_reopen_threshold"
  ],
  "billing_entitlement_exception": [
    "signed_billing_entitlement_closure",
    "billing_owner_sustainment_acceptance",
    "subscription_state_clearance",
    "overdue_account_exception_reopen_rule"
  ],
  "backup_restore_gap": [
    "signed_backup_restore_closure",
    "restore_owner_sustainment_acceptance",
    "latest_restore_drill_evidence",
    "recovery_exception_reopen_threshold"
  ],
  "deployment_smoke_test_gap": [
    "signed_deployment_smoke_test_closure",
    "release_owner_sustainment_acceptance",
    "environment_drift_clearance",
    "deployment_exception_reopen_threshold"
  ],
  "incident_prevention_gap": [
    "signed_incident_prevention_closure",
    "incident_owner_sustainment_acceptance",
    "prevention_action_sustainment_evidence",
    "incident_reopen_threshold"
  ],
  "growth_governance_exception": [
    "signed_growth_governance_closure",
    "executive_growth_sustainment_acceptance",
    "support_capacity_clearance",
    "growth_exception_reopen_threshold"
  ]
} as const;
export const DCC_RULES=[
  "Every prepared durable-closure row requires an independently recorded external Resolution Verification outcome before certification work can be treated as active.",
  "Critical and high durable-closure rows require explicit owner signoff, sustainment acceptance, reopen-threshold evidence, and escalation handling in the relevant system of record.",
  "This board is read-only and never certifies launch, accepts evidence, closes exceptions, mutates tenants, updates billing, or changes monitoring automatically."
] as const;
export const DCC_CONTROLS=[
  "Independently confirm the external Resolution Verification record before treating this durable-closure certification template as active.",
  "Record durable closure signoff, sustainment owner acceptance, reopen threshold, and next review date outside this endpoint.",
  "Escalate unresolved critical or high durable-closure rows before claiming commercial launch track closure."
] as const;
export const DCC_LINK_COUNTS={
  "missed_cadence": 6,
  "health_regression": 7,
  "customer_adoption_risk": 5,
  "support_sla_risk": 6,
  "billing_entitlement_exception": 6,
  "backup_restore_gap": 7,
  "deployment_smoke_test_gap": 6,
  "incident_prevention_gap": 7,
  "growth_governance_exception": 7
} as const;
const limitations=[
 'Read-only durable closure certification board.',
 'Does not certify, accept, reject, close, reopen, assign, notify, schedule, rollback, update billing, change tenants, or mutate monitoring automatically.',
 'Durable-closure evidence must be recorded in support, incident, billing, customer-success, backup, release, monitoring, or governance systems of record outside this endpoint.',
 'A prepared or waiting Resolution Verification board is not proof that an external resolution-verification decision exists; independent external confirmation remains required before durable closure certification can be treated as active.'
];
const persistence={stored_in_application:false,external_records_observable:false,interpretation:'This application prepares durable-closure certification requirements but stores and observes no external durable-closure certificates, owner signoffs, sustainment acceptances, reopen-threshold decisions, next-review records, or escalation outcomes. A zero persisted-certification count does not prove that no external durable-closure record exists.'};
export function makeDurableClosureCertificationSnapshot(){
 const src=makeResolutionVerificationSnapshot();
 const rows=src.resolution_verification_rows.map(row=>({
  code:row.code+'_durable_closure_certification',source_resolution_verification_code:row.code,
  source_recurrence_resolution_code:row.source_recurrence_resolution_code,source_recurrence_audit_code:row.source_recurrence_audit_code,
  source_closure_code:row.source_closure_code,source_exception_code:row.source_exception_code,
  domain:row.domain,owner:row.owner,severity_hint:row.severity_hint,
  source_resolution_verification_status:row.resolution_verification_status,
  source_recurrence_resolution_status:row.source_recurrence_resolution_status,
  source_recurrence_audit_status:row.source_recurrence_audit_status,
  source_closure_status:row.source_closure_status,
  source_exception_review_status:row.source_exception_review_status,
  source_cadence_statuses:row.source_cadence_statuses.map(x=>({...x})),
  source_transition_rows:[...row.source_transition_rows],source_observation_rows:[...row.source_observation_rows],
  source_authorization_rows:[...row.source_authorization_rows],
  required_recurrence_audit_evidence:[...row.required_recurrence_audit_evidence],
  required_recurrence_resolution_evidence:[...row.required_recurrence_resolution_evidence],
  required_resolution_verification_evidence:[...row.required_resolution_verification_evidence],
  required_durable_closure_certification_evidence:[...(DCC_REQUIRED_FIELDS[row.domain as keyof typeof DCC_REQUIRED_FIELDS]??[])],
  durable_closure_certification_controls:[...DCC_CONTROLS],
  durable_closure_certification_status:'waiting_for_external_resolution_verification_confirmation',
  accepted_external_closure_evidence:[],rejected_external_closure_evidence:[],
  release_condition:'manual_durable_closure_certification_required_before_commercial_launch_track_closure'
 }));
 return {phase:'Platform Commercial Launch Readiness',step:'Step 237 — Commercial Launch Durable Closure Certification Board',
  posture:'commercial_launch_durable_closure_waiting_for_external_resolution_verification_confirmation',generated_at:'2026-11-05T22:10:00.000Z',
  summary:{durable_closure_certification_rows_total:rows.length,waiting_for_external_resolution_verification_confirmation:rows.length,
   waiting_for_manual_durable_closure_certification:0,critical_certification_rows:rows.filter(r=>r.severity_hint==='critical').length,
   high_certification_rows:rows.filter(r=>r.severity_hint==='high').length,medium_certification_rows:rows.filter(r=>r.severity_hint==='medium').length,
   durable_closure_certification_records_persisted_in_application:0},
  durable_closure_certification_rows:rows,resolution_verification_posture:src.posture,
  resolution_verification_persistence:src.resolution_verification_persistence,
  recurrence_resolution_posture:src.recurrence_resolution_posture,recurrence_resolution_persistence:src.recurrence_resolution_persistence,
  recurrence_audit_posture:src.recurrence_audit_posture,recurrence_audit_persistence:src.recurrence_audit_persistence,
  exception_closure_posture:src.exception_closure_posture,exception_closure_persistence:src.exception_closure_persistence,
  exception_review_posture:src.exception_review_posture,exception_review_persistence:src.exception_review_persistence,
  operations_cadence_posture:src.operations_cadence_posture,operations_cadence_persistence:src.operations_cadence_persistence,
  steady_state_transition_posture:src.steady_state_transition_posture,steady_state_transition_persistence:src.steady_state_transition_persistence,
  additional_growth_observation_posture:src.additional_growth_observation_posture,additional_growth_observation_persistence:src.additional_growth_observation_persistence,
  additional_growth_authorization_posture:src.additional_growth_authorization_posture,additional_growth_authorization_persistence:src.additional_growth_authorization_persistence,
  expansion_health_observation_posture:src.expansion_health_observation_posture,expansion_health_observation_persistence:src.expansion_health_observation_persistence,
  durable_closure_certification_persistence:{...persistence},durable_closure_certification_rules:[...DCC_RULES],
  durable_closure_certification_limitations:[...limitations],
  next_best_step:'Independently confirm the external Steady-state Resolution Verification record and its retest, owner-acceptance, reopen-threshold, and escalation evidence before beginning durable closure certification.',
  validation_note:'This board is intentionally read-only. It preserves resolution-verification, recurrence-resolution, audit, exception-closure, review, cadence, transition, observation and authorization traceability and persistence boundaries, stores no durable-closure outcomes, and does not infer external certification acceptance from prepared rows.'};
}
export type ClosureSnapshot=ReturnType<typeof makeDurableClosureCertificationSnapshot>;
type Options={status?:number;expectHeading?:boolean;urlQuery?:string;permissions?:string[];
 alter?:(s:ClosureSnapshot)=>any;onCall?:(method:string,path:string,query:URLSearchParams)=>void;
 respond?:(method:string,path:string,query:URLSearchParams)=>{json:any;status?:number}|undefined};
export async function openDurableClosureCertification(page:Page,opts:Options={}){
 targetBaseURL();const permissions=opts.permissions??DCC_PERMISSIONS;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),q=url.searchParams;
  opts.onCall?.(method,path,q);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic session cannot refresh'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@synthetic.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=opts.respond?.(method,path,q);if(override)return fulfillJson(route,override.json,override.status??200);
  if(method==='GET'&&path===DCC_PATH){
   if(DCC_PERMISSIONS.some(p=>!permissions.includes(p)))return fulfillJson(route,{message:'Forbidden'},403);
   if(q.size)return fulfillJson(route,{message:'Unexpected query'},400);
   if(opts.status&&opts.status>=400)return fulfillJson(route,{message:'Synthetic durable closure certification failure'},opts.status);
   const snap=makeDurableClosureCertificationSnapshot();return fulfillJson(route,opts.alter?opts.alter(snap):snap);
  }
  return fulfillJson(route,{message:'Synthetic route unavailable'},404);
 });
 await page.goto(DCC_PATH+(opts.urlQuery?'?'+opts.urlQuery:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Commercial Launch Durable Closure Certification',exact:true})).toBeVisible();
}
