/** Batch 107: isolated synthetic GET response for Commercial Readiness Verification Program.
 * A mocked program demonstrates UI presentation only; it cannot certify launch,
 * real backend authorization, deployment, security, backups, billing or SQL state. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
export const VERIFY_PATH='/platform/commercial-readiness-verification-program';
export const VERIFY_PERMISSION=['platform.dashboard.read'];
export type VerificationControl={order:number;code:string;domain:string;label:string;evidence_surface:string;required_action:string;automation_level:string;status:string};
export type GateControl={order:number;code:string;label:string;evidence_surface:string;required_evidence:string;failure_mode:string;status:string;automation_level:string};
export type VerificationGate={step:string;posture:string;summary:Record<string,number>;controls:GateControl[];execution_order:string[];closure_rule:string};
export type ProgramResponse={phase:string;step:string;posture:string;generated_at:string;summary:{controls_total:number;verification_surfaces_present:number;runtime_or_manual_runs_required:number;ready_for_execution:number;by_domain:Record<string,{controls_total:number;verification_surfaces_present:number;runtime_or_manual_runs_required:number}>};controls:VerificationControl[];execution_sequence:string[];validation_note:string;[key:string]:any};
export const programControls:VerificationControl[]=[
 {order:1,code:'deployment_review',domain:'deployment',label:'Deployment review',evidence_surface:'Deployment evidence register',required_action:'Collect deployment smoke evidence',automation_level:'manual_operator_review',status:'operator_evidence_required'},
 {order:2,code:'restore_drill',domain:'backup_recovery',label:'Backup and restore drill',evidence_surface:'Restore exercise checklist',required_action:'Attach witnessed restore result',automation_level:'manual_operator_review',status:'not_certified'},
 {order:3,code:'owner_attestation',domain:'customer_success',label:'Customer Success owner attestation',evidence_surface:'Owner handoff and approval register',required_action:'Obtain owner acceptance externally',automation_level:'manual_operator_review',status:'review_ready'}
];
export const gateControls:GateControl[]=[
 {order:1,code:'deployment_log',label:'Deployment log checked',evidence_surface:'GET /api/platform/deployment-evidence',required_evidence:'Attach signed deployment run log',failure_mode:'Undocumented deployment change',status:'operator_evidence_required',automation_level:'manual_operator_review'},
 {order:2,code:'rollback_plan',label:'Rollback plan reviewed',evidence_surface:'Rollback runbook register',required_evidence:'Attach rollback drill evidence',failure_mode:'Inability to roll back a faulty deployment',status:'not_certified',automation_level:'manual_operator_review'}
];
export function makeGate(overrides:Partial<VerificationGate>={}):VerificationGate{
 return {step:'Step 461 — Deployment verification',posture:'ready_for_operator_execution',summary:{controls_total:2,operator_evidence_required:2,deployment_ready_for_live_execution:1,deployment_certified:0},controls:gateControls.map(c=>({...c})),execution_order:['Collect deployment evidence','Review rollback evidence'],closure_rule:'Do not claim certification until external evidence and owner sign-off exist.',...overrides};
}
export function makeVerificationProgram(overrides:Partial<ProgramResponse>={}):ProgramResponse{
 const first=makeGate();const second=makeGate({step:'Step 461 — Backup recovery verification',posture:'blocked_missing_evidence',summary:{controls_total:2,operator_evidence_required:2,backup_restore_ready_for_live_execution:0,backup_restore_certified:0},closure_rule:'Restore drills must be independently witnessed before approval.'});
 const third=makeGate({step:'Step 461 — Customer success terminal closure',posture:'operator_evidence_required',summary:{controls_total:2,operator_evidence_required:2,customer_success_terminal_closure_ready_for_live_execution:1,customer_success_terminal_closure_certified:0},closure_rule:'An accountable owner must accept the terminal closure externally.'});
 return {phase:'Commercial Readiness Verification Program',step:'Step 461 — Enterprise Customer Success Terminal Closure Verification Gate',posture:'operator_evidence_required',generated_at:'2026-11-05T12:00:00.000Z',
 summary:{controls_total:3,verification_surfaces_present:3,runtime_or_manual_runs_required:2,ready_for_execution:1,by_domain:{deployment:{controls_total:1,verification_surfaces_present:1,runtime_or_manual_runs_required:1},backup_recovery:{controls_total:1,verification_surfaces_present:1,runtime_or_manual_runs_required:1},customer_success:{controls_total:1,verification_surfaces_present:1,runtime_or_manual_runs_required:0}}},
 controls:programControls.map(c=>({...c})),execution_sequence:['Static source validation','Deployment validation','Backup/restore verification'],validation_note:'Read-only operator checklist. Runtime/manual evidence and independent sign-off are required; this is not a production certification.',
 deployment_verification_gate:first,backup_restore_verification_gate:second,enterprise_customer_success_terminal_closure_verification_gate:third,...overrides};
}
export type VerifyOptions={permissions?:string[];data?:ProgramResponse;status?:number;expectHeading?:boolean;onCall?:(method:string,path:string)=>void;overrideResponse?:(method:string,path:string)=>{status?:number;json:any}|undefined};
export async function openVerificationProgram(page:Page,opts:VerifyOptions={}){
 targetBaseURL();const permissions=opts.permissions??VERIFY_PERMISSION;
 await page.addInitScript(t=>{localStorage.setItem('inventory_platform_access_token',t);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const method=route.request().method();const path=new URL(route.request().url()).pathname.replace(/^\/api(?=\/)/,'');
  opts.onCall?.(method,path);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic session has no refresh'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@synthetic.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const response=opts.overrideResponse?.(method,path);
  if(response)return fulfillJson(route,response.json,response.status??200);
  if(method==='GET'&&path===VERIFY_PATH)return fulfillJson(route,opts.status&&opts.status>=400?{message:'Program verification unavailable'}:opts.data??makeVerificationProgram(),opts.status??200);
  return fulfillJson(route,{message:'Synthetic fixture has no route'},404);
 });
 await page.goto(VERIFY_PATH);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Commercial readiness verification program',exact:true})).toBeVisible();
}
