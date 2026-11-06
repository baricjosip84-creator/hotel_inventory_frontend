/** Batch 117 — static source-mapped, mocked GET-only commercial certificate evidence; NO certificate issuance or signoff. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
export const COMMERCIAL_CERTIFICATE_PATH='/platform/commercial-launch-certificate';
export const COMMERCIAL_CERTIFICATE_PERMISSIONS=[
 'platform.dashboard.read','platform.tenants.read','platform.billing.read','platform.sla.read','platform.incidents.read',
 'platform.support_sessions.read','platform.system_health.read','platform.dependencies.read','platform.tenants.export',
 'platform.runbooks.read','platform.security.read'
];
export const COMMERCIAL_CERTIFICATE_CONTROLS=[
  {
    "code": "tenant_provisioning_accepted",
    "domain": "tenant_provisioning",
    "required_evidence": "GET /api/platform/tenant-provisioning-hardening",
    "acceptance_owner": "platform_owner",
    "acceptance_rule": "Provisioning preset/audit evidence, supported plan posture, active admin, starter locations, entitlements, and onboarding handoff must be reviewed.",
    "link": "/platform/tenant-provisioning-hardening",
    "link_label": "Open provisioning evidence"
  },
  {
    "code": "customer_onboarding_accepted",
    "domain": "customer_onboarding",
    "required_evidence": "GET /api/platform/customer-onboarding-checklist",
    "acceptance_owner": "customer_success_owner",
    "acceptance_rule": "Company profile, active first admin, products/import plan, locations, stock/receiving, report-specific evidence, and onboarding-task posture must be reviewed.",
    "link": "/platform/customer-onboarding-checklist",
    "link_label": "Open onboarding evidence"
  },
  {
    "code": "billing_subscription_accepted",
    "domain": "billing_subscriptions",
    "required_evidence": "GET /api/platform/billing-subscription-activation",
    "acceptance_owner": "commercial_owner",
    "acceptance_rule": "Tenant lifecycle, plan, billing status, subscription readiness, license enforcement, overdue policy, and payment-provider webhook review signals must be accepted.",
    "link": "/platform/billing-subscription-activation",
    "link_label": "Open billing activation"
  },
  {
    "code": "support_operations_accepted",
    "domain": "support_operations",
    "required_evidence": "GET /api/platform/support-operations-cockpit",
    "acceptance_owner": "support_owner",
    "acceptance_rule": "Contacts, active SLA, handover, external customer touch, unresolved follow-ups, incidents, support tasks, and active/pending support access must be reviewed.",
    "link": "/platform/support-cockpit",
    "link_label": "Open support cockpit"
  },
  {
    "code": "production_monitoring_accepted",
    "domain": "production_monitoring",
    "required_evidence": "GET /api/platform/production-monitoring-readiness",
    "acceptance_owner": "operations_owner",
    "acceptance_rule": "Launchable tenant lifecycle, system health, customer-impacting incident communication coverage, dependencies, and canonical integration-monitoring posture must be reviewed.",
    "link": "/platform/monitoring-readiness",
    "link_label": "Open monitoring readiness"
  },
  {
    "code": "backup_restore_accepted",
    "domain": "backup_restore_validation",
    "required_evidence": "GET /api/platform/backup-restore-validation",
    "acceptance_owner": "operations_owner",
    "acceptance_rule": "Runtime backup-policy configuration, runbooks, tenant export evidence, core data scope, and real external restore-drill/provider evidence requirements must be reviewed.",
    "link": "/platform/backup-restore-validation",
    "link_label": "Open backup restore"
  },
  {
    "code": "deployment_validation_accepted",
    "domain": "deployment_validation",
    "required_evidence": "GET /api/platform/deployment-validation",
    "acceptance_owner": "release_owner",
    "acceptance_rule": "Backend source/runtime configuration, deployment identity, frontend repository evidence, and the retained automatic Deployment Readiness Gate artifact must be reviewed.",
    "link": "/platform/deployment-validation",
    "link_label": "Open deployment validation"
  },
  {
    "code": "documentation_completeness_accepted",
    "domain": "documentation_completeness",
    "required_evidence": "GET /api/platform/documentation-completeness",
    "acceptance_owner": "product_owner",
    "acceptance_rule": "Launch documentation presence, required structure, documentation-index references, cross-repository evidence, freshness, and owner accuracy acceptance must be reviewed.",
    "link": "/platform/documentation-completeness",
    "link_label": "Open documentation completeness"
  },
  {
    "code": "pilot_customer_readiness_accepted",
    "domain": "pilot_customer_readiness",
    "required_evidence": "GET /api/platform/pilot-customer-readiness",
    "acceptance_owner": "customer_success_owner",
    "acceptance_rule": "Launchable pilot tenant, accountable owner, success criteria, data policy, feedback tracking, support handover, monitoring review, and blockers must be accepted before pilot launch.",
    "link": "/platform/pilot-customer-readiness",
    "link_label": "Open pilot readiness"
  },
  {
    "code": "commercial_readiness_closure_accepted",
    "domain": "commercial_launch_certificate",
    "required_evidence": "GET /api/platform/commercial-readiness-closure",
    "acceptance_owner": "platform_owner",
    "acceptance_rule": "Phase 18 commercial-readiness closure controls and their executable/manual guardrails must be reviewed before final launch acceptance.",
    "link": "/platform/commercial-readiness-verification-program",
    "link_label": "Open readiness verification"
  }
] as const;
export type CertificateControl={code:string;domain:string;required_evidence:string;acceptance_owner:string;acceptance_rule:string;source_key:string;
 source_available:boolean;source_posture:string;source_summary:Record<string,number>;source_validation_note:string|null;source_error_code:string|null;
 evidence_scope:{mode:string;status:string;review_limit:number|null;evaluated_tenants:number;total_tenants:number|null};launch_area_code:string|null;
 launch_area_status:string;launch_gate:string;evidence_status:string;manual_acceptance_status:string};
export type CommercialCertificateSnapshot={phase:string;step:string;posture:string;generated_at:string;summary:Record<string,number>;
 certificate_controls:CertificateControl[];tenant_scope:{available:boolean;total_tenants:number|null;review_limit:number;error_code?:string};
 launch_readiness_posture:string;launch_readiness_registry_note:string;commercial_readiness_closure_posture:string;
 required_manual_acceptance:string[];certificate_limitations:string[];next_best_step:string;validation_note:string};
export function makeCommercialCertificateSnapshot(kind:'mixed'|'ready'|'review'='mixed'):CommercialCertificateSnapshot{
 const certificate_controls:CertificateControl[]=COMMERCIAL_CERTIFICATE_CONTROLS.map((c,i)=>{
  const blocked=kind==='mixed' && i===2;
  const review=kind==='review' || (kind==='mixed'&&i===7);
  const unavailable=kind==='mixed'&&i===4;
  const limited=['tenant_provisioning_accepted','customer_onboarding_accepted','pilot_customer_readiness_accepted'].includes(c.code);
  const source_posture=unavailable?'evidence_source_unavailable':blocked?'billing_subscription_activation_blocked':review?'documentation_review_required':
    c.code==='tenant_provisioning_accepted'?'tenant_provisioning_ready_for_customer_onboarding':
    c.code==='customer_onboarding_accepted'?'onboarding_ready_for_manual_customer_acceptance':
    c.code==='billing_subscription_accepted'?'billing_subscription_activation_ready':
    c.code==='support_operations_accepted'?'support_operations_ready':
    c.code==='production_monitoring_accepted'?'production_monitoring_ready':
    c.code==='backup_restore_accepted'?'backup_restore_technical_precheck_clear':
    c.code==='deployment_validation_accepted'?'deployment_validation_ready':
    c.code==='documentation_completeness_accepted'?'documentation_ready_for_manual_acceptance':
    c.code==='pilot_customer_readiness_accepted'?'pilot_ready_for_manual_launch_review':'commercial_readiness_closure_ready';
  const status=unavailable?'evidence_source_unavailable':blocked?'evidence_surface_blocked':review?'evidence_review_required':'evidence_surface_ready';
  return {code:c.code,domain:c.domain,required_evidence:c.required_evidence,acceptance_owner:c.acceptance_owner,acceptance_rule:c.acceptance_rule,
   source_key:c.code.replace(/_accepted$/,''),source_available:!unavailable,source_posture,source_summary:{tenants_total:3},
   source_validation_note:i===0?'Synthetic source validation note: manual review remains required.':null,
   source_error_code:unavailable?'SYNTHETIC_UPSTREAM_UNAVAILABLE':null,
   evidence_scope:{mode:limited?'tenant_population':'global_or_uncapped',status:limited?'full_population':'not_limited_by_certificate',review_limit:limited?300:null,
    evaluated_tenants:3,total_tenants:3},launch_area_code:c.domain,launch_area_status:'source_review',launch_gate:'ready_for_manual_review',
   evidence_status:status,manual_acceptance_status:'manual_acceptance_required'};
 });
 const summary:Record<string,number>={controls_total:certificate_controls.length,
  evidence_surfaces_ready:certificate_controls.filter(c=>c.evidence_status==='evidence_surface_ready').length,
  evidence_reviews_required:certificate_controls.filter(c=>c.evidence_status==='evidence_review_required').length,
  evidence_surfaces_blocked:certificate_controls.filter(c=>c.evidence_status==='evidence_surface_blocked').length,
  evidence_sources_unavailable:certificate_controls.filter(c=>c.evidence_status==='evidence_source_unavailable').length,
  scope_reviews_required:0,manual_acceptances_required:certificate_controls.length,certificate_issued:0};
 const posture=summary.evidence_surfaces_blocked||summary.evidence_sources_unavailable?'commercial_launch_certificate_blocked_by_evidence':
  summary.evidence_reviews_required?'commercial_launch_certificate_ready_for_manual_evidence_review':'commercial_launch_certificate_ready_for_manual_acceptance';
 return {phase:'Platform Commercial Launch Readiness',step:'Step 217 — Commercial Launch Certificate Board',posture,
  generated_at:'2026-11-05T17:00:00.000Z',summary,certificate_controls,
  tenant_scope:{available:true,total_tenants:3,review_limit:300},launch_readiness_posture:'ready_for_review',
  launch_readiness_registry_note:'The Launch Readiness board is a static registry/navigation surface. Certificate evidence status is derived from the current upstream readiness-board postures listed on each control, not from ready_for_* registry gate names.',
  commercial_readiness_closure_posture:'commercial_readiness_closure_ready',
  required_manual_acceptance:[
   'Platform owner confirms current evidence sources and scope warnings.',
   'Customer-success owner confirms onboarding and pilot evidence.',
   'Commercial owner confirms billing and provider review signals.',
   'Operations owner confirms monitoring, backup, incident and deployment evidence.',
   'Product owner confirms documentation freshness and accuracy.',
   'Release owner confirms intended production CI artifact and commit identity.',
   'All owner acceptances are recorded outside this read-only board.'
  ],
  certificate_limitations:[
   'Does not persist owner signatures, accepted risks, or a final go/no-go decision.',
   'Does not prove payment-provider production settlement.',
   'Does not prove successful external restore execution.',
   'Does not itself inspect or retain external CI artifacts.',
   'Does not prove customer adoption or business outcomes.',
   'Does not activate tenants, mutate billing, deploy code or issue external certificates.',
   'Tenant evidence capped at 300; larger populations require scope review.'
  ],
  next_best_step:summary.evidence_surfaces_blocked||summary.evidence_sources_unavailable?'Open blocked or unavailable upstream evidence before owner acceptance.':
   summary.evidence_reviews_required?'Complete remaining evidence review and record acceptance separately.':
   'Record manual owner acceptance outside this board before launch packet review.',
  validation_note:'Read-only internal certificate precheck. Source postures drive evidence and the static registry is context only. No signed commercial certificate is issued.'};
}
export type CommercialCertificateOptions={permissions?:string[];kind?:'mixed'|'ready'|'review';expectHeading?:boolean;status?:number;urlQuery?:string;
 alter?:(snapshot:CommercialCertificateSnapshot)=>CommercialCertificateSnapshot;
 onCall?:(method:string,path:string,query:URLSearchParams)=>void;
 respond?:(method:string,path:string,query:URLSearchParams)=>{json:any;status?:number}|undefined};
export async function openCommercialCertificate(page:Page,opts:CommercialCertificateOptions={}){
 targetBaseURL();const permissions=opts.permissions??COMMERCIAL_CERTIFICATE_PERMISSIONS;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),q=url.searchParams;
  opts.onCall?.(method,path,q);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic token cannot refresh'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@synthetic.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const response=opts.respond?.(method,path,q);if(response)return fulfillJson(route,response.json,response.status??200);
  if(method==='GET'&&path===COMMERCIAL_CERTIFICATE_PATH){
   if(COMMERCIAL_CERTIFICATE_PERMISSIONS.some(p=>!permissions.includes(p)))return fulfillJson(route,{message:'Forbidden'},403);
   if(opts.status&&opts.status>=400)return fulfillJson(route,{message:'Synthetic certificate read failure'},opts.status);
   const snapshot=makeCommercialCertificateSnapshot(opts.kind);return fulfillJson(route,opts.alter?opts.alter(snapshot):snapshot);
  }
  return fulfillJson(route,{message:'Synthetic route unavailable'},404);
 });
 await page.goto(COMMERCIAL_CERTIFICATE_PATH+(opts.urlQuery?'?'+opts.urlQuery:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Commercial Launch Certificate',exact:true})).toBeVisible();
}
