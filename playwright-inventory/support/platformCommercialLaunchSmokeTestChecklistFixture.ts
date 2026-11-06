/** Batch 120 — Step 220 source-defined ten rows; synthetic GET only, no live smoke execution. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
import {REGISTER_PERMISSIONS,makeRegisterSnapshot} from './platformCommercialLaunchGoNoGoRegisterFixture';
export const SMOKE_PATH='/platform/commercial-launch-smoke-test-checklist';
export const SMOKE_PERMISSIONS=[...REGISTER_PERMISSIONS,'platform.sessions.read'];
export const REQUIRED_RESULT_FIELDS=["tester_name", "tested_at", "environment_name", "backend_release_reference", "frontend_release_reference", "go_no_go_decision_reference", "tenant_or_pilot_account_reference", "browser_or_device_reference", "result", "evidence_link", "failure_ticket_reference", "retest_required"] as const;
export const ALLOWED_RESULTS=["pass", "fail", "conditional_pass", "not_run"] as const;
export const SOURCE_SMOKE_CHECKS=[
  {
    "code": "operator_login_and_session_smoke_test",
    "domain": "authentication",
    "owner": "platform_operations_owner",
    "required_evidence": "Operator can sign in, refresh session remains valid, and sign out succeeds in the target launch environment.",
    "failure_policy": "block_launch_until_authentication_path_is_fixed",
    "href": "/platform/sessions",
    "label": "Open platform sessions"
  },
  {
    "code": "pilot_tenant_access_smoke_test",
    "domain": "tenant_access",
    "owner": "customer_success_owner",
    "required_evidence": "Pilot tenant opens dashboard, role permissions load, and tenant isolation is verified with the selected launch account.",
    "failure_policy": "block_launch_until_tenant_access_is_fixed",
    "href": "/platform/pilot-customer-readiness",
    "label": "Open pilot readiness"
  },
  {
    "code": "product_stock_and_report_smoke_test",
    "domain": "inventory_core",
    "owner": "product_owner",
    "required_evidence": "Product list, stock list, stock movement history, and at least one operational report load successfully.",
    "failure_policy": "block_launch_until_core_inventory_visibility_is_fixed",
    "href": "/platform/customer-onboarding-checklist",
    "label": "Open onboarding evidence"
  },
  {
    "code": "shipment_receiving_smoke_test",
    "domain": "receiving_workflow",
    "owner": "operations_owner",
    "required_evidence": "Shipment detail, receiving action visibility, discrepancy visibility, and finalization readiness are reviewed without runtime errors.",
    "failure_policy": "block_launch_until_receiving_workflow_is_fixed",
    "href": "/platform/customer-onboarding-checklist",
    "label": "Open onboarding evidence"
  },
  {
    "code": "platform_support_cockpit_smoke_test",
    "domain": "platform_operations",
    "owner": "support_owner",
    "required_evidence": "Platform dashboard, tenant support context, support sessions, tenant tasks, and launch readiness surfaces load for an authorized platform user.",
    "failure_policy": "block_launch_until_platform_operations_visibility_is_fixed",
    "href": "/platform/support-cockpit",
    "label": "Open support cockpit"
  },
  {
    "code": "billing_subscription_visibility_smoke_test",
    "domain": "billing_visibility",
    "owner": "billing_owner",
    "required_evidence": "Billing/subscription readiness, license/plan enforcement, and billing activation gate are visible before paid customer activation.",
    "failure_policy": "block_launch_until_billing_visibility_is_fixed",
    "href": "/platform/billing-subscription-activation",
    "label": "Open billing activation"
  },
  {
    "code": "monitoring_incident_smoke_test",
    "domain": "monitoring_incidents",
    "owner": "platform_reliability_owner",
    "required_evidence": "System health, incident, dependency, integration monitoring, and production monitoring readiness surfaces load in the target environment.",
    "failure_policy": "block_launch_until_monitoring_visibility_is_fixed",
    "href": "/platform/monitoring-readiness",
    "label": "Open monitoring readiness"
  },
  {
    "code": "backup_restore_evidence_smoke_test",
    "domain": "backup_recovery",
    "owner": "platform_reliability_owner",
    "required_evidence": "Backup/restore validation board, tenant export visibility, and the external restore-drill evidence location or limitation are reviewed before launch.",
    "failure_policy": "block_launch_until_recovery_evidence_is_reviewed",
    "href": "/platform/backup-restore-validation",
    "label": "Open backup restore"
  },
  {
    "code": "documentation_support_handover_smoke_test",
    "domain": "documentation_support",
    "owner": "support_owner",
    "required_evidence": "Launch documentation index, onboarding guide, support guide, billing guide, deployment guide, and pilot guide are reachable by the launch team.",
    "failure_policy": "block_launch_until_documentation_handover_is_fixed",
    "href": "/platform/documentation-completeness",
    "label": "Open documentation completeness"
  },
  {
    "code": "rollback_decision_path_smoke_test",
    "domain": "rollback_readiness",
    "owner": "release_owner",
    "required_evidence": "Rollback owner, rollback trigger, communication owner, and launch-window decision path are confirmed for the selected launch window.",
    "failure_policy": "block_launch_until_rollback_decision_path_is_confirmed",
    "href": "/platform/deployment-validation",
    "label": "Open deployment validation"
  }
] as const;
export type SmokeRow={code:string;domain:string;owner:string;required_evidence:string;failure_policy:string;
 source_register_posture:string;source_acceptance_packet_posture:string;manual_precondition:string;
 required_result_fields:string[];allowed_results:string[];default_result:string;result_artifact:string;
 result_artifact_storage:string;smoke_test_status:string};
export type SmokeSnapshot={phase:string;step:string;posture:string;generated_at:string;summary:Record<string,number>;
 smoke_tests:SmokeRow[];go_no_go_register_posture:string;go_no_go_register_summary:Record<string,number>;
 go_no_go_decision_persistence:{stored_in_application:boolean;external_records_observable:boolean;interpretation:string}|null;
 acceptance_packet_posture:string;certificate_posture:string;result_persistence:{stored_in_application:boolean;external_records_observable:boolean;interpretation:string};
 execution_rules:string[];launch_limitations:string[];next_best_step:string;validation_note:string};
const rules=[
 'Use this checklist only after the go/no-go register evidence is clear enough for final owner decisions.',
 'Because this application cannot observe external go/no-go records, the launch operator must confirm those records and references before executing any smoke-test row.',
 'Execute the smoke test in the exact backend and frontend environment intended for launch.',
 'Record tester name, timestamp, environment, tenant, browser/device, go/no-go decision reference, and evidence link outside this read-only endpoint.',
 'Any failed check must block launch until the failure is resolved and re-tested.',
 'Conditional-go items require explicit limitation, expiry, rollback owner, and customer/support communication owner.',
 'This endpoint does not run checks automatically and cannot observe or persist external smoke-test results.'
];
export function makeSmokeSnapshot(kind:'mixed'|'ready'|'review'='mixed'):SmokeSnapshot{
 const register=makeRegisterSnapshot(kind);
 const status=register.posture==='commercial_launch_go_no_go_register_evidence_review_required'?
  'evidence_review_required_before_go_no_go_decisions':register.posture==='commercial_launch_go_no_go_register_ready_for_manual_decisions'?
  'external_go_no_go_confirmation_required_before_smoke_test':'blocked_until_go_no_go_register_ready';
 const smoke_tests:SmokeRow[]=SOURCE_SMOKE_CHECKS.map(c=>({code:c.code,domain:c.domain,owner:c.owner,
  required_evidence:c.required_evidence,failure_policy:c.failure_policy,source_register_posture:register.posture,
  source_acceptance_packet_posture:register.acceptance_packet_posture,
  manual_precondition:'Confirm the externally recorded go/no-go decision set and its evidence reference before executing this smoke-test row.',
  required_result_fields:[...REQUIRED_RESULT_FIELDS],allowed_results:[...ALLOWED_RESULTS],default_result:'not_run',
  result_artifact:'External commercial launch smoke-test evidence record',result_artifact_storage:'external_not_persisted_by_application',
  smoke_test_status:status}));
 const summary={smoke_tests_total:10,smoke_tests_requiring_evidence_review:status==='evidence_review_required_before_go_no_go_decisions'?10:0,
  smoke_tests_awaiting_external_go_no_go_confirmation:status==='external_go_no_go_confirmation_required_before_smoke_test'?10:0,
  smoke_tests_waiting_for_decisions:status==='blocked_until_go_no_go_register_ready'?0:10,
  smoke_tests_blocked:status==='blocked_until_go_no_go_register_ready'?10:0,result_records_persisted_in_application:0};
 const posture=summary.smoke_tests_blocked?'commercial_launch_smoke_test_blocked':summary.smoke_tests_requiring_evidence_review?
 'commercial_launch_smoke_test_evidence_review_required':summary.smoke_tests_awaiting_external_go_no_go_confirmation?
 'commercial_launch_smoke_test_waiting_for_go_no_go_decisions':'commercial_launch_smoke_test_empty';
 const next_best_step=summary.smoke_tests_blocked?'Resolve blocked Launch Acceptance or Go/No-Go evidence before preparing live smoke-test execution.':
  summary.smoke_tests_requiring_evidence_review?'Resolve the remaining review-required evidence before final go/no-go decisions are requested.':
  summary.smoke_tests_awaiting_external_go_no_go_confirmation?'Confirm the externally recorded go/no-go decisions and evidence references, then execute this checklist manually in the exact target launch environment.':
  'No smoke-test rows are currently available; review the Launch Go/No-Go register and upstream acceptance evidence.';
 return {phase:'Platform Commercial Launch Readiness',step:'Step 220 — Commercial Launch Smoke Test Checklist',
  posture,generated_at:'2026-11-05T19:40:00.000Z',summary,smoke_tests,go_no_go_register_posture:register.posture,
  go_no_go_register_summary:register.summary,go_no_go_decision_persistence:register.decision_persistence,
  acceptance_packet_posture:register.acceptance_packet_posture,certificate_posture:register.certificate_posture,
  result_persistence:{stored_in_application:false,external_records_observable:false,
  interpretation:'This application prepares smoke-test rows but stores and observes no external smoke-test execution records. A zero persisted-result count does not prove that no external smoke test has been run.'},
  execution_rules:rules,launch_limitations:register.launch_limitations,next_best_step,
  validation_note:'Read-only commercial launch smoke-test preparation surface. It preserves the current Go/No-Go prerequisite posture and defines external result fields, but it cannot observe external go/no-go decisions or smoke-test results and does not run tests, activate tenants, activate billing, deploy code, or claim production launch success.'};
}
export type SmokeOptions={permissions?:string[];kind?:'mixed'|'ready'|'review';status?:number;expectHeading?:boolean;urlQuery?:string;
 alter?:(s:SmokeSnapshot)=>SmokeSnapshot;
 onCall?:(method:string,path:string,q:URLSearchParams)=>void;
 respond?:(method:string,path:string,q:URLSearchParams)=>{json:any;status?:number}|undefined};
export async function openSmokeChecklist(page:Page,opts:SmokeOptions={}){
 targetBaseURL();const permissions=opts.permissions??SMOKE_PERMISSIONS;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),q=url.searchParams;
  opts.onCall?.(method,path,q);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic token cannot refresh'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@synthetic.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=opts.respond?.(method,path,q);if(override)return fulfillJson(route,override.json,override.status??200);
  if(method==='GET'&&path===SMOKE_PATH){
   if(SMOKE_PERMISSIONS.some(p=>!permissions.includes(p)))return fulfillJson(route,{message:'Forbidden'},403);
   if(opts.status&&opts.status>=400)return fulfillJson(route,{message:'Synthetic smoke checklist read failure'},opts.status);
   const snapshot=makeSmokeSnapshot(opts.kind);return fulfillJson(route,opts.alter?opts.alter(snapshot):snapshot);
  }
  return fulfillJson(route,{message:'Synthetic route unavailable'},404);
 });
 await page.goto(SMOKE_PATH+(opts.urlQuery?'?'+opts.urlQuery:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Commercial Launch Smoke Test Checklist',exact:true})).toBeVisible();
}
