/** Batch 106: strictly synthetic, read-only Platform Commercial Launch Readiness fixture.
 * This board describes declared capability and evidence posture. Neither the mock
 * nor the original board certifies customer launch, payment, restore or deployment. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';

export const LAUNCH_PATH='/platform/commercial-launch-readiness';
export const LAUNCH_PERMISSIONS=['platform.dashboard.read'];
export type LaunchArea={code:string;domain:string;label:string;current_status:string;
 evidence_surfaces:string[];required_launch_controls:string[];next_best_step:string;launch_gate:string};
const area=(code:string,domain:string,label:string,current_status:string,launch_gate:string):LaunchArea=>({
 code,domain,label,current_status,launch_gate,
 evidence_surfaces:[`GET /api/platform/${code.replaceAll('_','-')}`,'Evidence is operator-supplied and independently reviewed'],
 required_launch_controls:['Review source evidence','Obtain explicit owner acceptance outside this dashboard'],
 next_best_step:`Review ${label.toLowerCase()} evidence before making a launch decision.`
});
export const launchAreas:LaunchArea[]=[
 area('tenant_provisioning_hardening','tenant_provisioning','Tenant provisioning','strong_foundation_present','ready_for_provisioning_hardening_review'),
 area('customer_onboarding_checklist','customer_onboarding','Customer onboarding','medium_foundation_present','ready_for_onboarding_evidence_review'),
 area('billing_subscription_activation','billing_subscriptions','Billing and subscriptions','medium_foundation_present','ready_for_billing_activation_gate_review'),
 area('deployment_validation_gate','deployment_validation','Deployment validation','medium_strong_foundation_present','ready_for_deployment_validation_review'),
 area('commercial_launch_certificate','commercial_launch_certificate','Commercial launch certificate','manual_certificate_review_required','blocked_certificate_review'),
 area('commercial_launch_post_launch_incident_closure','post_launch_controls','Post-launch incident closure','manual_evidence_required','ready_for_incident_closure_review'),
 area('commercial_launch_retention_renewal_archive_seal_board','post_launch_controls','Retention renewal archive seal board','manual_evidence_required','ready_for_retention_renewal_archive_seal_review')
];
export type LaunchPackage={phase:string;step:string;posture:string;generated_at:string;
 summary:Record<string,number>;areas:LaunchArea[];validation_note:string};
export function makeLaunchPackage(areas:LaunchArea[]=launchAreas,generatedAt='2026-11-05T11:00:00.000Z'):LaunchPackage{
 const summary:Record<string,number>={areas_total:areas.length,core_launch_areas_total:areas.filter(a=>a.domain!=='post_launch_controls').length,
  post_launch_controls_total:areas.filter(a=>a.domain==='post_launch_controls').length,
  strong_foundation_present:0,medium_strong_foundation_present:0,medium_foundation_present:0,
  partial_foundation_present:0,not_complete:0,manual_certificate_review_required:0,manual_evidence_required:0,
  blocked_launch_gates:0,ready_launch_gates:0};
 for(const a of areas){summary[a.current_status]=(summary[a.current_status]??0)+1;
  summary[a.launch_gate.startsWith('ready_')?'ready_launch_gates':'blocked_launch_gates']+=1;}
 return {phase:'Platform Commercial Launch Readiness',step:'Step 244 — Commercial Launch Retention Renewal Archive Seal Linkage',
  posture:summary.not_complete?'commercial_launch_not_ready':summary.blocked_launch_gates?'commercial_launch_blocked_by_open_gates':'commercial_launch_ready_for_manual_certificate_review',
  generated_at:generatedAt,summary,areas,
  validation_note:'Read-only launch-readiness board. It does not certify production launch, customer adoption, billing-provider state, restore success, or pilot outcomes.'};
}
export type LaunchOpts={permissions?:string[];data?:LaunchPackage;status?:number;onCall?:(method:string,path:string)=>void;
 overrideResponse?:(method:string,path:string)=>{status?:number;json:any}|undefined;
 expectHeading?:boolean};
export async function openCommercialLaunchReadiness(page:Page,options:LaunchOpts={}){
 targetBaseURL();const permissions=options.permissions??LAUNCH_PERMISSIONS;
 await page.addInitScript(t=>{localStorage.setItem('inventory_platform_access_token',t);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const method=route.request().method();const path=new URL(route.request().url()).pathname.replace(/^\/api(?=\/)/,'');
  options.onCall?.(method,path);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'No synthetic auth cookie'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@synthetic.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const response=options.overrideResponse?.(method,path);
  if(response)return fulfillJson(route,response.json,response.status??200);
  if(method==='GET'&&path===LAUNCH_PATH)return fulfillJson(route,options.status&&options.status>=400?{message:'Readiness evidence unavailable'}:options.data??makeLaunchPackage(),options.status??200);
  return fulfillJson(route,{message:'Synthetic fixture has no route'},404);
 });
 await page.goto(LAUNCH_PATH);
 if(options.expectHeading!==false)await expect(page.getByRole('heading',{name:'Commercial launch readiness',exact:true})).toBeVisible();
}
