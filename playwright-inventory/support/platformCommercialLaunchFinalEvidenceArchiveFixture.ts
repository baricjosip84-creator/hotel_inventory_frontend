/** Step 238 synthetic final evidence archive board. No real stored file, owner signoff, or certified archive. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
import {makeDurableClosureCertificationSnapshot,DCC_PERMISSIONS} from './platformCommercialLaunchDurableClosureCertificationFixture';
export const FEA_PATH='/platform/commercial-launch-final-evidence-archive';
export const FEA_PERMISSIONS=[...DCC_PERMISSIONS];
export const FEA_REQUIRED_FIELDS={
  "missed_cadence": [
    "operations_cadence_archive_packet",
    "cadence_closure_signoff_export",
    "next_review_calendar_evidence",
    "cadence_reopen_rule_archive"
  ],
  "health_regression": [
    "health_regression_archive_packet",
    "monitoring_dashboard_export",
    "customer_impact_clearance_archive",
    "health_reopen_threshold_archive"
  ],
  "customer_adoption_risk": [
    "customer_adoption_archive_packet",
    "training_follow_up_export",
    "customer_success_feedback_archive",
    "adoption_reopen_rule_archive"
  ],
  "support_sla_risk": [
    "support_sla_archive_packet",
    "sla_backlog_clearance_export",
    "support_owner_signoff_archive",
    "sla_reopen_threshold_archive"
  ],
  "billing_entitlement_exception": [
    "billing_entitlement_archive_packet",
    "subscription_state_export",
    "billing_owner_signoff_archive",
    "overdue_exception_reopen_rule_archive"
  ],
  "backup_restore_gap": [
    "backup_restore_archive_packet",
    "restore_drill_export",
    "recovery_owner_signoff_archive",
    "restore_reopen_threshold_archive"
  ],
  "deployment_smoke_test_gap": [
    "deployment_smoke_test_archive_packet",
    "environment_validation_export",
    "release_owner_signoff_archive",
    "deployment_reopen_threshold_archive"
  ],
  "incident_prevention_gap": [
    "incident_prevention_archive_packet",
    "prevention_action_export",
    "incident_owner_signoff_archive",
    "incident_reopen_threshold_archive"
  ],
  "growth_governance_exception": [
    "growth_governance_archive_packet",
    "growth_scope_approval_export",
    "executive_sustainment_signoff_archive",
    "growth_reopen_threshold_archive"
  ]
} as const;
export const FEA_RULES=[
  "Every prepared final-archive row requires an independently recorded external Durable Closure Certification outcome before archive work can be treated as active.",
  "Critical and high archive rows require explicit owner signoff export, sustainment evidence export, reopen-threshold archive evidence, and next-review evidence in the external system of record.",
  "This board is read-only and never stores evidence, archives files, certifies launch, accepts or rejects evidence, mutates tenants, updates billing, sends notifications, or changes monitoring automatically."
] as const;
export const FEA_CONTROLS=[
  "Independently confirm the external Durable Closure Certification record before treating this final-archive preparation row as active.",
  "Export the final evidence packet, owner signoff, sustainment acceptance, reopen threshold, and next-review evidence outside this endpoint.",
  "Retain archive evidence in the agreed commercial-launch governance repository before claiming launch evidence retention closure."
] as const;
export const FEA_LINK_COUNTS={
  "missed_cadence": 7,
  "health_regression": 8,
  "customer_adoption_risk": 6,
  "support_sla_risk": 7,
  "billing_entitlement_exception": 7,
  "backup_restore_gap": 8,
  "deployment_smoke_test_gap": 7,
  "incident_prevention_gap": 8,
  "growth_governance_exception": 8
} as const;
const limitations=[
 'Read-only final evidence archive preparation board.',
 'Does not store files, archive evidence, certify, accept, reject, close, reopen, assign, notify, schedule, rollback, update billing, change tenants, or mutate monitoring automatically.',
 'Final evidence archives must be retained in the external support, incident, billing, customer-success, backup, release, monitoring, governance, or document systems of record.',
 'A prepared or waiting Durable Closure Certification board is not proof that an external certification decision exists; independent external confirmation remains required before archive work can be treated as active.'
];
const persistence={stored_in_application:false,external_records_observable:false,interpretation:'This application prepares final evidence archive requirements but stores and observes no external archive packets, owner signoffs, sustainment acceptances, reopen-threshold archives, next-review records, or archive acceptance decisions. A zero persisted-archive count does not prove that no external archive record exists.'};
export function makeFinalEvidenceArchiveSnapshot(){
 const src=makeDurableClosureCertificationSnapshot();
 const rows=src.durable_closure_certification_rows.map(row=>({
  code:row.code+'_final_evidence_archive',source_durable_closure_certification_code:row.code,
  source_resolution_verification_code:row.source_resolution_verification_code,
  source_recurrence_resolution_code:row.source_recurrence_resolution_code,
  source_recurrence_audit_code:row.source_recurrence_audit_code,source_closure_code:row.source_closure_code,
  source_exception_code:row.source_exception_code,domain:row.domain,owner:row.owner,severity_hint:row.severity_hint,
  source_durable_closure_certification_status:row.durable_closure_certification_status,
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
  required_final_evidence_archive:[...(FEA_REQUIRED_FIELDS[row.domain as keyof typeof FEA_REQUIRED_FIELDS]??[])],
  final_evidence_archive_controls:[...FEA_CONTROLS],
  final_evidence_archive_status:'waiting_for_external_durable_closure_certification_confirmation',
  release_condition:'manual_final_evidence_archive_required_before_launch_evidence_retention_closure'
 }));
 return {phase:'Platform Commercial Launch Readiness',step:'Step 238 — Commercial Launch Final Evidence Archive Board',
  posture:'commercial_launch_final_archive_waiting_for_external_durable_closure_certification_confirmation',generated_at:'2026-11-05T22:10:00.000Z',
  summary:{final_evidence_archive_rows_total:rows.length,waiting_for_external_durable_closure_certification_confirmation:rows.length,
   waiting_for_manual_final_evidence_archive:0,critical_archive_rows:rows.filter(r=>r.severity_hint==='critical').length,
   high_archive_rows:rows.filter(r=>r.severity_hint==='high').length,medium_archive_rows:rows.filter(r=>r.severity_hint==='medium').length,
   final_evidence_archive_records_persisted_in_application:0},final_evidence_archive_rows:rows,
  durable_closure_certification_posture:src.posture,durable_closure_certification_persistence:src.durable_closure_certification_persistence,
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
  final_evidence_archive_persistence:{...persistence},final_evidence_archive_rules:[...FEA_RULES],final_evidence_archive_limitations:[...limitations],
  next_best_step:'Independently confirm the external Durable Closure Certification record, owner signoff, sustainment acceptance, reopen threshold, next-review record, and required escalation evidence before beginning final evidence archiving.',
  validation_note:'This board is intentionally read-only. It preserves durable-closure, resolution-verification, recurrence-resolution, audit, exception-closure, review, cadence, transition, observation and authorization traceability and persistence boundaries, stores no final archive outcomes, and does not infer external archive acceptance from prepared rows.'
 };
}
export type FinalArchiveSnapshot=ReturnType<typeof makeFinalEvidenceArchiveSnapshot>;
type Options={status?:number;expectHeading?:boolean;urlQuery?:string;permissions?:string[];
 alter?:(s:FinalArchiveSnapshot)=>any;onCall?:(method:string,path:string,query:URLSearchParams)=>void;
 respond?:(method:string,path:string,query:URLSearchParams)=>{json:any;status?:number}|undefined};
export async function openFinalEvidenceArchive(page:Page,opts:Options={}){
 targetBaseURL();const permissions=opts.permissions??FEA_PERMISSIONS;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),q=url.searchParams;
  opts.onCall?.(method,path,q);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic session cannot refresh'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@synthetic.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=opts.respond?.(method,path,q);if(override)return fulfillJson(route,override.json,override.status??200);
  if(method==='GET'&&path===FEA_PATH){
   if(FEA_PERMISSIONS.some(p=>!permissions.includes(p)))return fulfillJson(route,{message:'Forbidden'},403);
   if(q.size)return fulfillJson(route,{message:'Unexpected query'},400);
   if(opts.status&&opts.status>=400)return fulfillJson(route,{message:'Synthetic final evidence archive failure'},opts.status);
   const snap=makeFinalEvidenceArchiveSnapshot();return fulfillJson(route,opts.alter?opts.alter(snap):snap);
  }
  return fulfillJson(route,{message:'Synthetic route unavailable'},404);
 });
 await page.goto(FEA_PATH+(opts.urlQuery?'?'+opts.urlQuery:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Commercial Launch Final Evidence Archive',exact:true})).toBeVisible();
}
