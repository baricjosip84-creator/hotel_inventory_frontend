/** Batch 119 — synthetic GET-only Step 219, mirrors ORIGINAL backend mapping; no decision persistence. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
import {ACCEPTANCE_PERMISSIONS,makeAcceptanceSnapshot,type AcceptanceSnapshot} from './platformCommercialLaunchAcceptancePacketFixture';
export const REGISTER_PATH='/platform/commercial-launch-go-no-go-register';
export const REGISTER_PERMISSIONS=ACCEPTANCE_PERMISSIONS;
export const REQUIRED_DECISION_FIELDS=['decision_owner_name','decision_owner_role','decision_recorded_at','decision','evidence_ticket_or_signature_reference','known_limitations','rollback_owner','launch_window_reference'] as const;
export const CONDITIONAL_GO_FIELDS=['condition_description','condition_expiry_at','condition_review_owner','fallback_plan_reference'] as const;
export const NO_GO_FIELDS=['blocking_reason','remediation_ticket_reference','re_review_owner','next_review_at'] as const;
export const ALLOWED_DECISIONS=['go','no_go','conditional_go'] as const;
export type RegisterRow={code:string;source_packet:string;source_control:string;source_key:string|null;domain:string;
 decision_owner:string;required_evidence:string;evidence_status:string|null;source_available:boolean;source_posture:string;
 source_summary:Record<string,unknown>;source_validation_note:string|null;source_error_code:string|null;
 evidence_scope:{mode:string;status:string;review_limit:number|null;evaluated_tenants:number;total_tenants:number|null}|null;
 launch_area_status:string;launch_gate:string;launch_gate_context_only:boolean;acceptance_artifact:string;
 acceptance_artifact_storage:string;acceptance_statement:string|null;packet_status:string;default_decision:string;
 allowed_decisions:string[];decision_artifact:string;decision_artifact_storage:string;
 required_decision_fields:string[];conditional_go_extra_fields:string[];no_go_extra_fields:string[];register_status:string};
export type RegisterSnapshot={phase:string;step:string;posture:string;generated_at:string;summary:Record<string,number>;
 go_no_go_register:RegisterRow[];acceptance_packet_posture:string;acceptance_summary:Record<string,unknown>;
 acceptance_persistence:AcceptanceSnapshot['acceptance_persistence']|null;certificate_posture:string;
 launch_readiness_posture:string;tenant_scope:AcceptanceSnapshot['tenant_scope'];
 decision_persistence:{stored_in_application:boolean;external_records_observable:boolean;interpretation:string};
 decision_requirements:string[];launch_limitations:string[];next_best_step:string;validation_note:string};
const requirements=[
 'Every acceptance packet must be reviewed by its assigned owner.',
 'Review-required acceptance evidence must be resolved before that owner row is ready for a go/no-go decision.',
 'Each owner must record a go, no-go, or conditional-go decision outside this read-only endpoint.',
 'Conditional-go decisions require a limitation, expiry date, condition review owner, rollback owner, and fallback-plan reference.',
 'No-go decisions must block commercial launch until the source control is remediated and re-reviewed.',
 'The application does not persist or observe external go/no-go decisions, so a zero persisted-decision count does not prove no external decision exists.',
 'Final release owner must confirm live smoke-test completion before production launch.',
 'This endpoint does not persist approvals or execute launch actions.'
];
export function makeRegisterSnapshot(kind:'mixed'|'ready'|'review'='mixed'):RegisterSnapshot{
 const packet=makeAcceptanceSnapshot(kind);
 const go_no_go_register:RegisterRow[]=packet.acceptance_packets.map(x=>({
  code:`${x.source_control}_go_no_go_register`,source_packet:x.code,source_control:x.source_control,source_key:x.source_key,
  domain:x.domain,decision_owner:x.acceptance_owner,required_evidence:x.required_evidence,evidence_status:x.evidence_status,
  source_available:x.source_available,source_posture:x.source_posture,source_summary:x.source_summary,
  source_validation_note:x.source_validation_note,source_error_code:x.source_error_code,evidence_scope:x.evidence_scope,
  launch_area_status:x.launch_area_status,launch_gate:x.launch_gate,launch_gate_context_only:x.launch_gate_context_only,
  acceptance_artifact:x.acceptance_artifact,acceptance_artifact_storage:x.acceptance_artifact_storage,
  acceptance_statement:x.required_statement,packet_status:x.packet_status,default_decision:'not_recorded',
  allowed_decisions:[...ALLOWED_DECISIONS],decision_artifact:'External commercial launch go/no-go decision record',
  decision_artifact_storage:'external_not_persisted_by_application',required_decision_fields:[...REQUIRED_DECISION_FIELDS],
  conditional_go_extra_fields:[...CONDITIONAL_GO_FIELDS],no_go_extra_fields:[...NO_GO_FIELDS],
  register_status:x.packet_status==='ready_for_manual_owner_acceptance'?'ready_for_manual_go_no_go_decision':
    x.packet_status==='evidence_review_required_before_manual_owner_acceptance'?'evidence_review_required_before_manual_go_no_go_decision':
    'blocked_until_acceptance_packet_ready'
 }));
 const summary={register_rows_total:go_no_go_register.length,
  rows_ready_for_decision:go_no_go_register.filter(x=>x.register_status==='ready_for_manual_go_no_go_decision').length,
  rows_requiring_evidence_review:go_no_go_register.filter(x=>x.register_status==='evidence_review_required_before_manual_go_no_go_decision').length,
  rows_blocked:go_no_go_register.filter(x=>x.register_status==='blocked_until_acceptance_packet_ready').length,
  decisions_required:go_no_go_register.length,decision_records_persisted_in_application:0};
 const posture=summary.rows_blocked?'commercial_launch_go_no_go_register_blocked':summary.rows_requiring_evidence_review?
  'commercial_launch_go_no_go_register_evidence_review_required':summary.decisions_required?
  'commercial_launch_go_no_go_register_ready_for_manual_decisions':'commercial_launch_go_no_go_register_empty';
 const next_best_step=summary.rows_blocked?'Resolve blocked or unavailable acceptance packets before requesting final go/no-go decisions.':
  summary.rows_requiring_evidence_review?'Complete the remaining review-required acceptance evidence before requesting final go/no-go decisions.':
  summary.decisions_required?'Record final go/no-go decisions outside this read-only board, then run the live deployment smoke test before any production launch.':
  'No go/no-go rows are currently available; review the Launch Acceptance packet and Launch Certificate inputs.';
 return {phase:'Platform Commercial Launch Readiness',step:'Step 219 — Commercial Launch Go/No-Go Register',posture,
  generated_at:'2026-11-05T19:00:00.000Z',summary,go_no_go_register,
  acceptance_packet_posture:packet.posture,acceptance_summary:packet.summary,acceptance_persistence:packet.acceptance_persistence,
  certificate_posture:packet.certificate_posture,launch_readiness_posture:packet.launch_readiness_posture,tenant_scope:packet.tenant_scope,
  decision_persistence:{stored_in_application:false,external_records_observable:false,
   interpretation:'This application prepares decision rows but stores no final go/no-go decision records. A zero persisted-decision count does not prove that no external decision or ticket exists.'},
  decision_requirements:requirements,launch_limitations:packet.launch_limitations,next_best_step,
  validation_note:'Read-only go/no-go decision-preparation surface. It preserves current Launch Acceptance evidence posture and scope, but it cannot observe or persist external decisions and does not activate billing, tenants, deployment, or production launch.'};
}
export type RegisterOptions={permissions?:string[];kind?:'mixed'|'ready'|'review';status?:number;expectHeading?:boolean;urlQuery?:string;
 alter?:(s:RegisterSnapshot)=>RegisterSnapshot;
 onCall?:(method:string,path:string,query:URLSearchParams)=>void;
 respond?:(method:string,path:string,query:URLSearchParams)=>{json:any;status?:number}|undefined};
export async function openRegister(page:Page,opts:RegisterOptions={}){
 targetBaseURL();const permissions=opts.permissions??REGISTER_PERMISSIONS;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),q=url.searchParams;
  opts.onCall?.(method,path,q);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic token cannot refresh'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@synthetic.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=opts.respond?.(method,path,q);if(override)return fulfillJson(route,override.json,override.status??200);
  if(method==='GET'&&path===REGISTER_PATH){
   if(REGISTER_PERMISSIONS.some(p=>!permissions.includes(p)))return fulfillJson(route,{message:'Forbidden'},403);
   if(opts.status&&opts.status>=400)return fulfillJson(route,{message:'Synthetic register read failure'},opts.status);
   const snapshot=makeRegisterSnapshot(opts.kind);return fulfillJson(route,opts.alter?opts.alter(snapshot):snapshot);
  }
  return fulfillJson(route,{message:'Synthetic route unavailable'},404);
 });
 await page.goto(REGISTER_PATH+(opts.urlQuery?'?'+opts.urlQuery:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Commercial Launch Go/No-Go Register',exact:true})).toBeVisible();
}
