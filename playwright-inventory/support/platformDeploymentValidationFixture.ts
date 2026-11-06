/** Batch 114: synthetic Deployment Validation GET contract only. Not CI, deploy, Render, Vercel, or live health proof. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
export const DEPLOYMENT_PATH='/platform/deployment-validation';
export const DEPLOYMENT_READ='platform.system_health.read';
export const FULL_PLATFORM_GRANTS=[DEPLOYMENT_READ,'platform.tenants.read','platform.tenants.export','platform.incidents.read','platform.dependencies.read','platform.runbooks.read','platform.releases.read','platform.changes.read'];
export const deploymentDefinitions=[
 ['backend_render_blueprint_hardened','Backend Render blueprint hardened','render_blueprint_hardened','backend_source'],
 ['backend_production_readme_present','Backend production README present','backend_production_readme_present','backend_source'],
 ['backend_production_deployment_check_present','Backend deployment foundation guard present','backend_deployment_check_present','backend_source'],
 ['backend_health_readiness_check_present','Backend health/readiness guard present','backend_health_check_present','backend_source'],
 ['backend_migration_safety_check_present','Backend migration safety guard present','backend_migration_check_present','backend_source'],
 ['backend_rate_limit_guard_present','Backend production rate-limit guard present','backend_rate_limit_guard_present','backend_source'],
 ['backend_rate_limit_runtime_posture','Backend runtime rate-limit posture','backend_rate_limit_runtime_safe','backend_runtime'],
 ['backend_cors_policy_present','Backend explicit CORS policy present','backend_cors_policy_present','backend_source'],
 ['backend_cors_runtime_configured','Backend production CORS origins configured','backend_cors_runtime_configured','backend_runtime'],
 ['backend_deployment_identity_present','Backend deployment identity available','backend_deployment_identity_present','backend_runtime'],
 ['automatic_deployment_readiness_handoff_wired','Automatic deployment-readiness handoff wired','automatic_deployment_readiness_handoff_wired','backend_source'],
 ['frontend_deployment_readiness_gate_present','Frontend deployment-readiness gate source present','frontend_deployment_readiness_gate_present','frontend_repository'],
 ['frontend_vercel_install_hardening_present','Frontend Vercel install hardening present','frontend_vercel_install_hardening_present','frontend_repository'],
 ['runtime_gate_artifact_reviewed','Deployment Readiness Gate artifact reviewed','runtime_gate_artifact_reviewed','external_ci_evidence']
] as const;
export type DeployControl={code:string;label:string;evidence_key:string;evidence_scope:string;launch_reason:string;evidence_value:number;status:string};
export type DeploySnapshot={phase:string;step:string;posture:string;generated_at:string;summary:Record<string,number>;platform_evidence:Record<string,string|number|boolean|null>;deployment_validation_controls:DeployControl[];automatic_runtime_gate_coverage:string[];operator_follow_up:string[];next_best_step:string;validation_note:string};
export function makeDeploymentSnapshot(kind:'blocked'|'review'|'ready'='blocked'):DeploySnapshot{
 const evidence:Record<string,string|number|boolean|null>={
  runtime_environment:'production',production_runtime_detected:true,render_runtime_detected:true,
  backend_deployment_identity_present:kind!=='blocked',render_blueprint_hardened:true,
  backend_production_readme_present:true,backend_deployment_check_present:true,backend_health_check_present:true,
  backend_migration_check_present:true,backend_rate_limit_guard_present:true,backend_rate_limit_runtime_safe:true,
  backend_rate_limit_store:'gateway',backend_rate_limit_runtime_state:'safe',backend_rate_limit_memory_waiver_enabled:false,
  backend_cors_policy_present:true,backend_cors_runtime_configured:kind!=='blocked',
  backend_cors_configured_origin_count:1,backend_cors_valid_https_origin_count:1,backend_cors_invalid_origin_count:0,
  automatic_deployment_readiness_handoff_wired:true,frontend_source_repository_available:false,
  frontend_source_evidence_source:'external_frontend_repository_ci',frontend_deployment_readiness_gate_present:null,
  frontend_vercel_install_hardening_present:null,runtime_gate_evidence_persistence_available:false,
  runtime_gate_artifact_reviewed:kind==='ready',runtime_gate_evidence_source:'frontend GitHub Actions Deployment Readiness Gate HTML/JSON artifact'
 };
 const deployment_validation_controls:DeployControl[]=deploymentDefinitions.map(([code,label,evidence_key,evidence_scope])=>{
  let status='evidence_present';
  if(code==='backend_cors_runtime_configured'||code==='backend_deployment_identity_present'){
   if(!evidence[evidence_key])status=code==='backend_deployment_identity_present'?'runtime_deployment_identity_missing':'runtime_configuration_missing';
  }
  if(evidence_scope==='frontend_repository')status=kind==='ready'?'evidence_present':'frontend_ci_evidence_required';
  if(code==='runtime_gate_artifact_reviewed')status=kind==='ready'?'evidence_present':'runtime_gate_artifact_review_required';
  return {code,label,evidence_key,evidence_scope,status,evidence_value:status==='evidence_present'?1:0,launch_reason:`Source-defined ${label} deployment precheck; external proof is separate.`};
 });
 const count=(s:string)=>deployment_validation_controls.filter(c=>c.status===s).length;
 const summary:Record<string,number>={controls_total:deployment_validation_controls.length,controls_with_evidence:count('evidence_present'),
  deployment_blockers:count('runtime_deployment_identity_missing')+count('runtime_configuration_missing')+count('deployment_evidence_missing'),
  review_required:count('frontend_ci_evidence_required')+count('runtime_gate_artifact_review_required'),
  frontend_ci_evidence_required:count('frontend_ci_evidence_required'),runtime_gate_artifact_review_required:count('runtime_gate_artifact_review_required')};
 const posture=summary.deployment_blockers?'deployment_validation_blocked':summary.review_required?'deployment_precheck_ready_for_external_evidence':'deployment_validation_ready';
 return {phase:'Platform Commercial Launch Readiness',step:'Step 214 — Deployment Validation Gate',posture,generated_at:'2026-11-05T16:00:00.000Z',summary,
  platform_evidence:evidence,deployment_validation_controls,
  automatic_runtime_gate_coverage:[
   'Frontend production shell, security headers, and exact deployed commit identity.',
   'Backend liveness/readiness, database/schema readiness, and exact deployed commit identity.',
   'Production frontend-origin CORS preflight against the backend.',
   'Unauthenticated protected-route rejection plus tenant login/session/dashboard reads.',
   'Refresh-cookie, CSRF refresh, and logout lifecycle checks.',
   'Browser rendering of critical pages without backend 5xx, runtime errors, failed-fetch states, or horizontal overflow.',
   'Optional platform login, platform identity read, and this deployment-validation endpoint.'
  ],operator_follow_up:[
   'Review the Deployment Readiness Gate HTML/JSON artifact produced by the frontend GitHub Actions workflow.',
   'Confirm the artifact belongs to the intended frontend/backend production commits before accepting it.',
   'Use the manual Deployment Readiness Gate only as a fallback when the automatic post-release gate did not run.',
   'Keep scanner/device checks, write-workflow validation, rollback readiness, and accepted-risk decisions in their dedicated launch evidence because the automated deployment gate is intentionally read-only.'
  ],next_best_step:posture==='deployment_validation_blocked'?'Close missing backend deployment foundations or production runtime configuration before relying on the automatic runtime gate.':
   posture==='deployment_precheck_ready_for_external_evidence'?'Review and retain the automatic frontend Deployment Readiness Gate HTML/JSON artifact for the current production release.':'Deployment validation evidence is complete for this surface; continue to documentation and launch acceptance.',
  validation_note:'Read-only technical operator precheck. It does not deploy to Render or Vercel, run migrations, query GitHub Actions, persist frontend CI results, or certify live production health.'};
}
export type DeploymentOptions={permissions?:string[];expectHeading?:boolean;status?:number;
 alter?:(data:DeploySnapshot)=>DeploySnapshot;
 respond?:(method:string,path:string,query:URLSearchParams)=>{json:any;status?:number}|undefined;
 onCall?:(method:string,path:string,query:URLSearchParams)=>void;kind?:'blocked'|'review'|'ready';urlQuery?:string};
export async function openDeployment(page:Page,opts:DeploymentOptions={}){
 targetBaseURL();const permissions=opts.permissions??FULL_PLATFORM_GRANTS;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),query=url.searchParams;
  opts.onCall?.(method,path,query);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic token cannot refresh'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@synthetic.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=opts.respond?.(method,path,query);if(override)return fulfillJson(route,override.json,override.status??200);
  if(method==='GET'&&path===DEPLOYMENT_PATH){
   if(!permissions.includes(DEPLOYMENT_READ))return fulfillJson(route,{message:'Forbidden'},403);
   if(opts.status&&opts.status>=400)return fulfillJson(route,{message:'Synthetic deployment validation outage'},opts.status);
   const data=makeDeploymentSnapshot(opts.kind);return fulfillJson(route,opts.alter?opts.alter(data):data);
  }
  return fulfillJson(route,{message:'Synthetic route unavailable'},404);
 });
 await page.goto(DEPLOYMENT_PATH+(opts.urlQuery?'?'+opts.urlQuery:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Deployment Validation',exact:true})).toBeVisible();
}
