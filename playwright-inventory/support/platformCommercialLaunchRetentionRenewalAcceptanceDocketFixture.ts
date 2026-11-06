/** Batch 141, Step 241 — source-derived synthetic GET. Not evidence of an actual accepted renewal. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
import {makeRetentionRenewalReviewSnapshot,RRR_PERMISSIONS} from './platformCommercialLaunchRetentionRenewalReviewFixture';
export const RRAD_PATH='/platform/commercial-launch-retention-renewal-acceptance-docket';
export const RRAD_PERMISSIONS=[...RRR_PERMISSIONS];
export const RRAD_REQUIRED_FIELDS={
  "missed_cadence": [
    "renewal_review_packet_locator",
    "cadence_owner_acceptance",
    "next_cadence_review_date",
    "operations_lead_acknowledgement"
  ],
  "health_regression": [
    "renewal_review_packet_locator",
    "monitoring_owner_acceptance",
    "next_health_review_date",
    "operations_lead_acknowledgement"
  ],
  "customer_adoption_risk": [
    "renewal_review_packet_locator",
    "customer_success_owner_acceptance",
    "next_adoption_review_date",
    "commercial_owner_acknowledgement"
  ],
  "support_sla_risk": [
    "renewal_review_packet_locator",
    "support_owner_acceptance",
    "next_sla_review_date",
    "support_lead_acknowledgement"
  ],
  "billing_entitlement_exception": [
    "renewal_review_packet_locator",
    "billing_owner_acceptance",
    "next_billing_review_date",
    "finance_or_revenue_acknowledgement"
  ],
  "backup_restore_gap": [
    "renewal_review_packet_locator",
    "recovery_owner_acceptance",
    "next_restore_review_date",
    "operations_lead_acknowledgement"
  ],
  "deployment_smoke_test_gap": [
    "renewal_review_packet_locator",
    "release_owner_acceptance",
    "next_deployment_review_date",
    "release_lead_acknowledgement"
  ],
  "incident_prevention_gap": [
    "renewal_review_packet_locator",
    "incident_owner_acceptance",
    "next_prevention_review_date",
    "operations_lead_acknowledgement"
  ],
  "growth_governance_exception": [
    "renewal_review_packet_locator",
    "executive_growth_acceptance",
    "next_growth_governance_review_date",
    "commercial_owner_acknowledgement"
  ]
} as const;
export const RRAD_RULES=[
  "Every prepared acceptance-docket row requires independent confirmation of the external retention-renewal review record before acceptance work can be treated as active.",
  "Critical and high acceptance rows require a renewal-review packet locator, accountable-owner acceptance, next review date, and leadership acknowledgement in the external governance repository.",
  "This docket is read-only and never accepts renewals, stores evidence, certifies launch, mutates tenants, updates billing, sends notifications, schedules reminders, or changes monitoring automatically."
] as const;
export const RRAD_CONTROLS=[
  "Independently confirm the external retention-renewal review record before treating this acceptance-docket row as active.",
  "Record accountable-owner acceptance, leadership acknowledgement, renewal-review packet locator, and the next review date outside this endpoint.",
  "Keep the docket row open until the external acceptance evidence is attached to the commercial-launch governance repository."
] as const;
export const RRAD_LINK_COUNTS={
  "missed_cadence": 10,
  "health_regression": 11,
  "customer_adoption_risk": 9,
  "support_sla_risk": 10,
  "billing_entitlement_exception": 10,
  "backup_restore_gap": 11,
  "deployment_smoke_test_gap": 10,
  "incident_prevention_gap": 11,
  "growth_governance_exception": 11
} as const;
const limitations=[
  "Read-only commercial-launch retention-renewal acceptance preparation docket.",
  "Does not accept renewal rows, renew seals, store files, certify launch, accept, reject, close, reopen, assign, notify, schedule, rollback, update billing, change tenants, or mutate monitoring automatically.",
  "Acceptance evidence must be retained in the external governance or operational systems of record and independently reviewed by the accountable owner.",
  "A prepared or waiting retention-renewal review board is not proof that an external renewal-review record exists; independent external confirmation remains required before acceptance work can be treated as active."
] as const;
const persistence={stored_in_application:false,external_records_observable:false,interpretation:'This application prepares retention-renewal acceptance requirements but stores and observes no external renewal-review packet locators, accountable-owner acceptances, leadership acknowledgements, next review dates, or acceptance decisions. A zero persisted-acceptance count does not prove that no external acceptance record exists.'};
export function makeRetentionRenewalAcceptanceDocketSnapshot(){
 const src=makeRetentionRenewalReviewSnapshot();
 const rows=src.retention_renewal_review_rows.map(row=>({
  code:row.code+'_acceptance_docket',source_retention_renewal_review_code:row.code,
  source_evidence_retention_seal_code:row.source_evidence_retention_seal_code,
  source_final_evidence_archive_code:row.source_final_evidence_archive_code,
  source_durable_closure_certification_code:row.source_durable_closure_certification_code,
  source_resolution_verification_code:row.source_resolution_verification_code,
  source_recurrence_resolution_code:row.source_recurrence_resolution_code,
  source_recurrence_audit_code:row.source_recurrence_audit_code,
  source_closure_code:row.source_closure_code,source_exception_code:row.source_exception_code,
  domain:row.domain,owner:row.owner,severity_hint:row.severity_hint,
  source_retention_renewal_review_status:row.retention_renewal_review_status,
  source_evidence_retention_seal_status:row.source_evidence_retention_seal_status,
  source_final_evidence_archive_status:row.source_final_evidence_archive_status,
  source_durable_closure_certification_status:row.source_durable_closure_certification_status,
  source_resolution_verification_status:row.source_resolution_verification_status,
  source_recurrence_resolution_status:row.source_recurrence_resolution_status,
  source_recurrence_audit_status:row.source_recurrence_audit_status,
  source_closure_status:row.source_closure_status,source_exception_review_status:row.source_exception_review_status,
  source_cadence_statuses:row.source_cadence_statuses.map(x=>({...x})),
  source_transition_rows:[...row.source_transition_rows],source_observation_rows:[...row.source_observation_rows],
  source_authorization_rows:[...row.source_authorization_rows],
  required_recurrence_audit_evidence:[...row.required_recurrence_audit_evidence],
  required_recurrence_resolution_evidence:[...row.required_recurrence_resolution_evidence],
  required_resolution_verification_evidence:[...row.required_resolution_verification_evidence],
  required_durable_closure_certification_evidence:[...row.required_durable_closure_certification_evidence],
  required_final_evidence_archive:[...row.required_final_evidence_archive],
  required_evidence_retention_seal:[...row.required_evidence_retention_seal],
  required_retention_renewal_review:[...row.required_retention_renewal_review],
  required_retention_renewal_acceptance:[...(RRAD_REQUIRED_FIELDS[row.domain as keyof typeof RRAD_REQUIRED_FIELDS]??[])],
  retention_renewal_acceptance_controls:[...RRAD_CONTROLS],
  retention_renewal_acceptance_status:'waiting_for_external_retention_renewal_review_confirmation',
  release_condition:'manual_external_retention_renewal_acceptance_required_before_retention_renewal_governance_closure'
 }));
 return {
  phase:'Platform Commercial Launch Readiness',step:'Step 241 — Commercial Launch Retention Renewal Acceptance Docket',
  posture:'commercial_launch_retention_renewal_acceptance_waiting_for_external_renewal_review_confirmation',
  generated_at:'2026-11-05T22:55:00.000Z',
  summary:{retention_renewal_acceptance_rows_total:rows.length,waiting_for_external_retention_renewal_review_confirmation:rows.length,
   waiting_for_manual_retention_renewal_acceptance:0,critical_acceptance_rows:rows.filter(r=>r.severity_hint==='critical').length,
   high_acceptance_rows:rows.filter(r=>r.severity_hint==='high').length,medium_acceptance_rows:rows.filter(r=>r.severity_hint==='medium').length,
   retention_renewal_acceptance_records_persisted_in_application:0},
  retention_renewal_acceptance_docket_rows:rows,
  retention_renewal_review_posture:src.posture,retention_renewal_review_persistence:src.retention_renewal_review_persistence,
  evidence_retention_seal_posture:src.evidence_retention_seal_posture,evidence_retention_seal_persistence:src.evidence_retention_seal_persistence,
  final_evidence_archive_posture:src.final_evidence_archive_posture,final_evidence_archive_persistence:src.final_evidence_archive_persistence,
  durable_closure_certification_posture:src.durable_closure_certification_posture,durable_closure_certification_persistence:src.durable_closure_certification_persistence,
  resolution_verification_posture:src.resolution_verification_posture,resolution_verification_persistence:src.resolution_verification_persistence,
  recurrence_resolution_posture:src.recurrence_resolution_posture,recurrence_resolution_persistence:src.recurrence_resolution_persistence,
  recurrence_audit_posture:src.recurrence_audit_posture,recurrence_audit_persistence:src.recurrence_audit_persistence,
  exception_closure_posture:src.exception_closure_posture,exception_closure_persistence:src.exception_closure_persistence,
  exception_review_posture:src.exception_review_posture,exception_review_persistence:src.exception_review_persistence,
  operations_cadence_posture:src.operations_cadence_posture,operations_cadence_persistence:src.operations_cadence_persistence,
  steady_state_transition_posture:src.steady_state_transition_posture,steady_state_transition_persistence:src.steady_state_transition_persistence,
  additional_growth_observation_posture:src.additional_growth_observation_posture,additional_growth_observation_persistence:src.additional_growth_observation_persistence,
  additional_growth_authorization_posture:src.additional_growth_authorization_posture,additional_growth_authorization_persistence:src.additional_growth_authorization_persistence,
  expansion_health_observation_posture:src.expansion_health_observation_posture,expansion_health_observation_persistence:src.expansion_health_observation_persistence,
  retention_renewal_acceptance_persistence:{...persistence},retention_renewal_acceptance_rules:[...RRAD_RULES],retention_renewal_acceptance_limitations:[...limitations],
  next_best_step:'Independently confirm the external Retention Renewal Review record before treating acceptance work as active.',
  validation_note:'This docket is intentionally read-only and does not infer external acceptance from prepared rows.'
 };
}
export type RetentionRenewalAcceptanceDocketSnapshot=ReturnType<typeof makeRetentionRenewalAcceptanceDocketSnapshot>;
type Options={status?:number;expectHeading?:boolean;urlQuery?:string;permissions?:string[];
 alter?:(s:RetentionRenewalAcceptanceDocketSnapshot)=>any;onCall?:(method:string,path:string,query:URLSearchParams)=>void;
 respond?:(method:string,path:string,query:URLSearchParams)=>{json:any;status?:number}|undefined};
export async function openRetentionRenewalAcceptanceDocket(page:Page,opts:Options={}){
 targetBaseURL();const permissions=opts.permissions??RRAD_PERMISSIONS;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),q=url.searchParams;
  opts.onCall?.(method,path,q);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic session cannot refresh'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@synthetic.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=opts.respond?.(method,path,q);if(override)return fulfillJson(route,override.json,override.status??200);
  if(method==='GET'&&path===RRAD_PATH){
   if(RRAD_PERMISSIONS.some(p=>!permissions.includes(p)))return fulfillJson(route,{message:'Forbidden'},403);
   if(q.size)return fulfillJson(route,{message:'Unexpected query'},400);
   if(opts.status&&opts.status>=400)return fulfillJson(route,{message:'Synthetic retention renewal acceptance failure'},opts.status);
   const snap=makeRetentionRenewalAcceptanceDocketSnapshot();return fulfillJson(route,opts.alter?opts.alter(snap):snap);
  }
  return fulfillJson(route,{message:'Synthetic route unavailable'},404);
 });
 await page.goto(RRAD_PATH+(opts.urlQuery?'?'+opts.urlQuery:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Commercial Launch Retention Renewal Acceptance Docket',exact:true})).toBeVisible();
}
