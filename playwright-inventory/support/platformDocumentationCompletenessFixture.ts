/** Batch 115: isolated synthetic browser fixture only. This does not read repositories or certify launch documentation. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
export const DOCUMENTATION_PATH='/platform/documentation-completeness';
export const DOCUMENTATION_READ='platform.runbooks.read';
export const DOCUMENTATION_ALL_GRANTS=[
 DOCUMENTATION_READ,'platform.tenants.read','platform.tenants.export','platform.sla.read',
 'platform.incidents.read','platform.support_sessions.read','platform.billing.read',
 'platform.system_health.read','platform.dashboard.read'
];
export const documentationDefinitions=[
 ['launch_documentation_index_present','Launch documentation index complete','commercial_launch_coordination','backend_repository','docs/COMMERCIAL_LAUNCH_DOCUMENTATION_INDEX.md',3,false],
 ['customer_onboarding_guide_present','Customer onboarding guide complete','customer_onboarding','backend_repository','docs/CUSTOMER_ONBOARDING_GUIDE.md',3,true],
 ['support_operations_guide_present','Support operations guide complete','support_operations','backend_repository','docs/SUPPORT_OPERATIONS_GUIDE.md',3,true],
 ['billing_subscription_guide_present','Billing and subscription guide complete','billing_subscriptions','backend_repository','docs/BILLING_SUBSCRIPTION_GUIDE.md',3,true],
 ['backup_recovery_guide_present','Backup and recovery guide complete','backup_restore_validation','backend_repository','docs/BACKUP_RECOVERY_GUIDE.md',3,true],
 ['deployment_validation_guide_present','Deployment validation guide complete','deployment_validation','backend_repository','docs/DEPLOYMENT_VALIDATION_GUIDE.md',4,true],
 ['pilot_launch_guide_present','Pilot launch guide complete','pilot_customer_readiness','backend_repository','docs/PILOT_LAUNCH_GUIDE.md',3,true],
 ['frontend_commercial_closure_doc_present','Frontend commercial closure reference complete','frontend_launch_evidence','frontend_repository','docs/PHASE15_COMMERCIAL_FRONTEND_CLOSURE.md',3,true]
] as const;
export type DocumentationDetail={source_scope:string;relative_path:string;repository_available:boolean;file_present:boolean|null;file_size_bytes:number|null;structure_complete:boolean|null;required_markers_total:number;required_markers_present:number|null;missing_structure_markers:string[];index_reference_required:boolean;index_reference_present:boolean|null};
export type DocumentationControl={code:string;label:string;area:string;evidence_key:string;source_scope:string;relative_path:string;launch_reason:string;evidence_value:boolean|null;evidence_detail:DocumentationDetail;status:string};
export type DocumentationSnapshot={phase:string;step:string;posture:string;generated_at:string;summary:Record<string,number>;
 repository_access:{backend_repository_available:boolean;frontend_repository_available:boolean;frontend_repository_source:string};
 documentation_index:{relative_path:string;required_references_total:number;required_references_present:number;missing_references:string[];references_complete:boolean};
 documentation_evidence:Record<string,boolean|null>;documentation_evidence_details:Record<string,DocumentationDetail>;
 documentation_controls:DocumentationControl[];required_manual_acceptance:string[];next_best_step:string;validation_note:string};
export function makeDocumentationSnapshot(kind:'review'|'blocked'|'ready'='review'):DocumentationSnapshot{
 const frontendAvailable=kind==='ready';
 const documentation_index={relative_path:'docs/COMMERCIAL_LAUNCH_DOCUMENTATION_INDEX.md',required_references_total:7,required_references_present:7,missing_references:[],references_complete:true};
 const documentation_controls:DocumentationControl[]=documentationDefinitions.map(([code,label,area,source_scope,relative_path,markerCount,indexRequired],i)=>{
  const unavailable=source_scope==='frontend_repository'&&!frontendAvailable;
  const missing=kind==='blocked'&&i===2;
  const detail:DocumentationDetail={source_scope,relative_path,repository_available:!unavailable,
   file_present:unavailable?null:!missing,file_size_bytes:unavailable||missing?null:2048+i*128,
   structure_complete:unavailable?null:!missing,required_markers_total:markerCount,
   required_markers_present:unavailable?null:missing?0:markerCount,
   missing_structure_markers:missing?['## Required support evidence','## Launch rule']:[],
   index_reference_required:indexRequired,index_reference_present:unavailable?null:true};
  const status=unavailable?'external_repository_review_required':missing?'documentation_missing':'documentation_present';
  return {code,label,area,evidence_key:code,source_scope,relative_path,
   launch_reason:`Checked-in launch reference for ${label.toLowerCase()}; manual acceptance remains separate.`,
   evidence_value:unavailable?null:!missing,evidence_detail:detail,status};
 });
 const summary:Record<string,number>={controls_total:documentation_controls.length,documentation_present:0,documentation_missing:0,documentation_structure_incomplete:0,documentation_index_reference_missing:0,documentation_source_unavailable:0,external_repository_review_required:0,launch_blockers:0,review_required:0};
 for(const c of documentation_controls){summary[c.status]=(summary[c.status]||0)+1;
  if(c.status==='external_repository_review_required')summary.review_required++;
  else if(c.status!=='documentation_present')summary.launch_blockers++;}
 const posture=summary.launch_blockers?'documentation_launch_blocked':summary.review_required?'documentation_review_required':'documentation_ready_for_manual_acceptance';
 const documentation_evidence:Record<string,boolean|null>={};const documentation_evidence_details:Record<string,DocumentationDetail>={};
 for(const c of documentation_controls){documentation_evidence[c.evidence_key]=c.evidence_value;documentation_evidence_details[c.evidence_key]=c.evidence_detail;}
 documentation_evidence.backend_repository_available=true;documentation_evidence.frontend_repository_available=frontendAvailable;
 documentation_evidence.documentation_index_references_complete=true;
 return {phase:'Platform Commercial Launch Readiness',step:'Step 215 — Documentation Completeness Board',posture,
  generated_at:'2026-11-05T16:00:00.000Z',summary,repository_access:{backend_repository_available:true,frontend_repository_available:frontendAvailable,frontend_repository_source:'paired_checkout_convention'},documentation_index,
  documentation_evidence,documentation_evidence_details,documentation_controls,
  required_manual_acceptance:[
   'Platform owner reviews the documentation index and confirms the listed documents still match the current product behavior.',
   'Customer onboarding owner confirms the onboarding guide matches the current first-use workflow and evidence rules.',
   'Support owner confirms the support guide matches current contacts, SLA, customer-touch, follow-up, incident, and support-access behavior.',
   'Billing owner confirms subscription activation, overdue-handling, payment-provider, and commercial acceptance guidance.',
   'Operations owner confirms backup/recovery guidance against real external backup-provider and restore-drill evidence.',
   'Release owner confirms deployment guidance against the retained automatic Deployment Readiness Gate artifact for the intended production commits.',
   'Pilot owner confirms pilot launch guide, success criteria, feedback log, blocker review, and expansion decision process.'
  ],
  next_best_step:posture==='documentation_launch_blocked'?'Close missing, structurally incomplete, or unindexed launch documentation before pilot customer readiness.':posture==='documentation_review_required'?'Review the frontend repository documentation externally, then complete owner acceptance for the full launch documentation package.':'Complete owner freshness/accuracy acceptance before relying on this package for pilot or paid launch.',
  validation_note:'Read-only static documentation precheck. It verifies repository availability, required file presence, expected Markdown structure, and documentation-index references only. It does not prove document freshness, customer acceptance, production execution, external CI evidence, restore-drill completion, or owner sign-off.'
 };
}
export type DocumentationOptions={permissions?:string[];expectHeading?:boolean;status?:number;
 alter?:(data:DocumentationSnapshot)=>DocumentationSnapshot;
 respond?:(method:string,path:string,query:URLSearchParams)=>{json:any;status?:number}|undefined;
 onCall?:(method:string,path:string,query:URLSearchParams)=>void;kind?:'review'|'blocked'|'ready';urlQuery?:string};
export async function openDocumentation(page:Page,opts:DocumentationOptions={}){
 targetBaseURL();const permissions=opts.permissions??DOCUMENTATION_ALL_GRANTS;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),query=url.searchParams;
  opts.onCall?.(method,path,query);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic token cannot refresh'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@synthetic.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=opts.respond?.(method,path,query);if(override)return fulfillJson(route,override.json,override.status??200);
  if(method==='GET'&&path===DOCUMENTATION_PATH){
   if(!permissions.includes(DOCUMENTATION_READ))return fulfillJson(route,{message:'Forbidden'},403);
   if(opts.status&&opts.status>=400)return fulfillJson(route,{message:'Synthetic documentation outage'},opts.status);
   const data=makeDocumentationSnapshot(opts.kind);return fulfillJson(route,opts.alter?opts.alter(data):data);
  }
  return fulfillJson(route,{message:'Synthetic route unavailable'},404);
 });
 await page.goto(DOCUMENTATION_PATH+(opts.urlQuery?'?'+opts.urlQuery:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Documentation Completeness',exact:true})).toBeVisible();
}
