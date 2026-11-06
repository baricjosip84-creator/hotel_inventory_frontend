/** Batch 118: source-mapped simulated GET, never real owner signoff/certification. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
import {COMMERCIAL_CERTIFICATE_PERMISSIONS,makeCommercialCertificateSnapshot} from './platformCommercialLaunchCertificateFixture';
export const ACCEPTANCE_PATH='/platform/commercial-launch-acceptance-packet';
export const ACCEPTANCE_PERMISSIONS=COMMERCIAL_CERTIFICATE_PERMISSIONS;
export const OWNER_ACCEPTANCE_RULES={
  "platform_owner": {
    "acceptance_artifact": "External platform owner launch acceptance record",
    "required_statement": "I reviewed the launch certificate evidence surfaces, current evidence posture, scope limitations, and remaining manual launch risk."
  },
  "customer_success_owner": {
    "acceptance_artifact": "External customer-success launch acceptance record",
    "required_statement": "I reviewed onboarding, support handoff, pilot tenant readiness, customer-facing blockers, and any tenant-scope limitations."
  },
  "commercial_owner": {
    "acceptance_artifact": "External commercial owner billing acceptance record",
    "required_statement": "I reviewed billing/subscription activation evidence, plan enforcement posture, payment-provider review signals, and paid-launch blockers."
  },
  "support_owner": {
    "acceptance_artifact": "External support owner launch acceptance record",
    "required_statement": "I reviewed support contacts, SLA posture, handover evidence, unresolved follow-ups, incidents, support tasks, and active or pending support access."
  },
  "operations_owner": {
    "acceptance_artifact": "External operations owner production acceptance record",
    "required_statement": "I reviewed monitoring, incidents, backup/restore, dependency posture, deployment validation, and rollback/recovery limitations."
  },
  "product_owner": {
    "acceptance_artifact": "External product owner documentation acceptance record",
    "required_statement": "I reviewed launch documentation completeness, cross-repository evidence, freshness limitations, and product/operator guidance readiness."
  },
  "release_owner": {
    "acceptance_artifact": "External release owner final launch acceptance record",
    "required_statement": "I reviewed deployment validation, the retained Deployment Readiness Gate artifact requirement, production commit identity, and release limitations."
  }
} as const;
export const REQUIRED_FIELDS=['owner_name','owner_role','accepted_at','evidence_reviewed','current_source_posture_reviewed','evidence_scope_reviewed','known_limitations_reviewed','go_no_go_decision','manual_signature_or_ticket_reference'] as const;
export type PacketItem={code:string;source_control:string;source_key:string|null;domain:string;acceptance_owner:string;acceptance_rule:string|null;
 required_evidence:string;evidence_status:string;source_available:boolean;source_posture:string;source_summary:Record<string,unknown>;
 source_validation_note:string|null;source_error_code:string|null;evidence_scope:{mode:string;status:string;review_limit:number|null;
 evaluated_tenants:number;total_tenants:number|null}|null;launch_area_status:string;launch_gate:string;launch_gate_context_only:boolean;
 acceptance_artifact:string;acceptance_artifact_storage:string;required_statement:string;required_acceptance_fields:string[];packet_status:string;};
export type AcceptanceSnapshot={phase:string;step:string;posture:string;generated_at:string;summary:Record<string,number>;
 acceptance_packets:PacketItem[];certificate_posture:string;certificate_summary:Record<string,unknown>;certificate_validation_note:string|null;
 certificate_registry_note:string|null;tenant_scope:{available:boolean;total_tenants:number|null;review_limit:number;error_code?:string}|null;
 launch_readiness_posture:string;acceptance_persistence:{stored_in_application:boolean;external_records_observable:boolean;interpretation:string};
 required_packet_controls:string[];launch_limitations:string[];next_best_step:string;validation_note:string;};
export function makeAcceptanceSnapshot(kind:'mixed'|'ready'|'review'='mixed'):AcceptanceSnapshot{
 const certificate=makeCommercialCertificateSnapshot(kind);
 const acceptance_packets:PacketItem[]=certificate.certificate_controls.map(c=>{
  const rule=OWNER_ACCEPTANCE_RULES[c.acceptance_owner as keyof typeof OWNER_ACCEPTANCE_RULES];
  const packet_status=c.evidence_status==='evidence_surface_ready'?'ready_for_manual_owner_acceptance':
   c.evidence_status==='evidence_review_required'?'evidence_review_required_before_manual_owner_acceptance':'blocked_until_evidence_surface_ready';
  return {code:c.code+'_acceptance_packet',source_control:c.code,source_key:c.source_key||null,domain:c.domain,
   acceptance_owner:c.acceptance_owner,acceptance_rule:c.acceptance_rule||null,required_evidence:c.required_evidence,
   evidence_status:c.evidence_status,source_available:c.source_available!==false,source_posture:c.source_posture||'evidence_source_posture_missing',
   source_summary:c.source_summary||{},source_validation_note:c.source_validation_note||null,source_error_code:c.source_error_code||null,
   evidence_scope:c.evidence_scope||null,launch_area_status:c.launch_area_status||'missing_launch_area',launch_gate:c.launch_gate||'missing_launch_gate',
   launch_gate_context_only:true,acceptance_artifact:rule.acceptance_artifact,acceptance_artifact_storage:'external_not_persisted_by_application',
   required_statement:rule.required_statement,required_acceptance_fields:[...REQUIRED_FIELDS],packet_status};
 });
 const summary:Record<string,number>={packets_total:acceptance_packets.length,
  packets_ready_for_acceptance:acceptance_packets.filter(x=>x.packet_status==='ready_for_manual_owner_acceptance').length,
  packets_requiring_evidence_review:acceptance_packets.filter(x=>x.packet_status==='evidence_review_required_before_manual_owner_acceptance').length,
  packets_blocked:acceptance_packets.filter(x=>x.packet_status==='blocked_until_evidence_surface_ready').length,
  manual_owner_signoffs_required:acceptance_packets.length,owner_signoffs_persisted_in_application:0};
 const posture=summary.packets_blocked?'commercial_launch_acceptance_packet_blocked':summary.packets_requiring_evidence_review?
  'commercial_launch_acceptance_packet_evidence_review_required':'commercial_launch_acceptance_packet_ready_for_manual_signoff';
 return {phase:'Platform Commercial Launch Readiness',step:'Step 218 — Commercial Launch Acceptance Packet',posture,
  generated_at:'2026-11-05T18:00:00.000Z',summary,acceptance_packets,certificate_posture:certificate.posture,
  certificate_summary:certificate.summary,certificate_validation_note:certificate.validation_note,
  certificate_registry_note:certificate.launch_readiness_registry_note,tenant_scope:certificate.tenant_scope,
  launch_readiness_posture:certificate.launch_readiness_posture,
  acceptance_persistence:{stored_in_application:false,external_records_observable:false,
   interpretation:'A zero persisted-signoff count means this application stores no launch acceptance signatures. It does not prove that no external approvals or tickets exist.'},
  required_packet_controls:[
   'Every launch certificate control must have an owner-facing acceptance packet.',
   'Each owner must review the current upstream evidence posture and any evidence-scope limitation before signoff.',
   'Review-required evidence must be completed before the packet is treated as ready for owner acceptance.',
   'Known launch limitations must be accepted explicitly before go-live.',
   'The static Launch Readiness registry gate is context only and must not substitute for current certificate evidence.',
   'A manual signature or external ticket reference is required outside this read-only board.',
   'No automatic tenant activation, billing activation, production launch, or signature persistence is performed by this endpoint.'
  ],launch_limitations:certificate.certificate_limitations,
  next_best_step:summary.packets_blocked?'Resolve the blocked or unavailable certificate evidence surfaces before requesting owner signoff.':
   summary.packets_requiring_evidence_review?'Complete the remaining review-required certificate evidence, then record external owner signoffs.':
   'Record external manual owner signoffs, then continue to the final launch go/no-go register.',
  validation_note:'Read-only owner-signoff preparation surface. It preserves current Launch Certificate evidence posture and scope, but it cannot observe or persist external approvals and does not issue launch acceptance.'};
}
export type AcceptanceOptions={permissions?:string[];kind?:'mixed'|'ready'|'review';expectHeading?:boolean;status?:number;urlQuery?:string;
 alter?:(snapshot:AcceptanceSnapshot)=>AcceptanceSnapshot;
 onCall?:(method:string,path:string,query:URLSearchParams)=>void;
 respond?:(method:string,path:string,query:URLSearchParams)=>{json:any;status?:number}|undefined};
export async function openAcceptancePacket(page:Page,opts:AcceptanceOptions={}){
 targetBaseURL();const permissions=opts.permissions??ACCEPTANCE_PERMISSIONS;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),q=url.searchParams;
  opts.onCall?.(method,path,q);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic token cannot refresh'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@synthetic.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const response=opts.respond?.(method,path,q);if(response)return fulfillJson(route,response.json,response.status??200);
  if(method==='GET'&&path===ACCEPTANCE_PATH){
   if(ACCEPTANCE_PERMISSIONS.some(p=>!permissions.includes(p)))return fulfillJson(route,{message:'Forbidden'},403);
   if(opts.status&&opts.status>=400)return fulfillJson(route,{message:'Synthetic acceptance packet read failure'},opts.status);
   const snapshot=makeAcceptanceSnapshot(opts.kind);return fulfillJson(route,opts.alter?opts.alter(snapshot):snapshot);
  }
  return fulfillJson(route,{message:'Synthetic route unavailable'},404);
 });
 await page.goto(ACCEPTANCE_PATH+(opts.urlQuery?'?'+opts.urlQuery:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Commercial Launch Acceptance Packet',exact:true})).toBeVisible();
}
