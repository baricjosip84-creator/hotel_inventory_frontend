/** Batch 110 — deterministic GET-only synthetic UI contracts, not payment/provider/SQL evidence. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';

export const BILLING_ACTIVATION_PATH='/platform/billing-subscription-activation';
export const BILLING_ACTIVATION_PERMISSIONS=['platform.billing.read','platform.tenants.read'];
export const activationAlpha='b1100000-0000-4000-8000-000000000001';
export const activationBeta='b1100000-0000-4000-8000-000000000002';
export const activationGamma='b1100000-0000-4000-8000-000000000003';
export const activationControlDefs=[
 {code:'tenant_status_launchable',label:'Tenant lifecycle status launchable',evidence_key:'tenant_status_launchable'},
 {code:'subscription_readiness_not_blocked',label:'Subscription readiness not blocked',evidence_key:'subscription_readiness_state'},
 {code:'license_plan_enforcement_not_blocked',label:'License and plan enforcement not blocked',evidence_key:'license_enforcement_state'},
 {code:'plan_code_present',label:'Plan code present',evidence_key:'plan_code_present'},
 {code:'billing_status_launch_ready',label:'Billing status launch-ready',evidence_key:'billing_status_launch_ready'},
 {code:'billing_customer_reference_ready',label:'Billing customer reference ready',evidence_key:'billing_customer_reference_ready'},
 {code:'billing_event_history_present',label:'Billing event history present',evidence_key:'billing_event_history_present'},
 {code:'commercial_limits_present',label:'Commercial limits present',evidence_key:'commercial_limits_present'},
 {code:'commercial_feature_flags_present',label:'Commercial feature flags present',evidence_key:'commercial_feature_flags_present'},
 {code:'overdue_handling_reviewed',label:'Overdue handling policy documented',evidence_key:'overdue_handling_policy_documented'}
];
type EvidenceValue=string|number|boolean|string[]|null;
export type ActivationControl={code:string;label:string;evidence_key:string;launch_reason:string;evidence_value:number;status:string};
export type ActivationTenant={tenant_id:string;tenant_name:string;status:string;evidence:Record<string,EvidenceValue>;
 controls:ActivationControl[];missing_control_codes:string[];next_best_step:string};
export type ActivationWebhook={enabled_providers:string[];enabled_provider_count:number;ready:boolean;operational_attention_required:boolean;
 missing_secret_providers:string[];weak_secret_providers:string[];webhook_operational_health:{status:string;attention_required:boolean;signals:string[]};
 recent_webhook_activity?:{window_hours:number;accepted_count:number;duplicate_count:number;rejected_count:number}};
export type ActivationPackage={phase:string;step:string;posture:string;generated_at:string;summary:Record<string,number>;
 upstream_evidence:{subscription_readiness:{posture:string;summary:Record<string,number>};
 license_plan_enforcement:{posture:string;summary:Record<string,number>;plan_definitions:Array<Record<string,unknown>>};
 payment_provider_webhook_readiness:ActivationWebhook};
 billing_policy_reference:string;manual_commercial_owner_acceptance_required:boolean;activation_controls:ActivationControl[];
 tenants:ActivationTenant[];validation_note:string};
export const webhookReview:ActivationWebhook={enabled_providers:['stripe'],enabled_provider_count:1,ready:false,operational_attention_required:true,
 missing_secret_providers:['stripe'],weak_secret_providers:[],webhook_operational_health:{status:'attention_required',attention_required:true,signals:['missing webhook secret']},
 recent_webhook_activity:{window_hours:24,accepted_count:3,duplicate_count:1,rejected_count:2}};
export const webhookReady:ActivationWebhook={...webhookReview,ready:true,operational_attention_required:false,missing_secret_providers:[],weak_secret_providers:[],
 webhook_operational_health:{status:'healthy',attention_required:false,signals:[]}};
export function makeActivationTenant(id:string,name:string,kind:'ready'|'blocked'|'review'='ready'):ActivationTenant{
 const blocked=kind==='blocked',review=kind==='review';
 const evidence:Record<string,EvidenceValue>={tenant_status:blocked?'suspended':review?'trial':'active',tenant_status_launchable:blocked?0:1,
  plan_code:blocked?null:'starter',billing_status:blocked?'past_due':review?'comped':'active',
  subscription_readiness_state:blocked?'subscription_blocked':review?'subscription_review_required':'subscription_ready',
  license_enforcement_state:blocked?'license_enforcement_blocked':review?'license_enforcement_review_required':'license_plan_enforcement_ready',
  billing_customer_reference_present:blocked?0:1,billing_event_count:blocked?0:2,last_billing_event_at:'2026-11-04T10:00:00.000Z',
  trial_ends_at:review?'2026-11-30T10:00:00.000Z':null,current_period_ends_at:'2026-12-01T10:00:00.000Z',
  subscription_risk_flags:blocked?['past_due']:[],license_enforcement_gaps:blocked?['required_limits_missing','required_feature_flags_missing']:[],
  plan_code_present:blocked?0:1,billing_status_launch_ready:blocked?0:1,billing_customer_reference_ready:blocked?0:1,
  billing_event_history_present:blocked?0:1,commercial_limits_present:blocked?0:1,commercial_feature_flags_present:blocked?0:1,
  overdue_handling_policy_documented:1,billing_policy_reference:'docs/BILLING_SUBSCRIPTION_GUIDE.md',manual_commercial_owner_acceptance_required:true};
 const controls=activationControlDefs.map(d=>{
  let status='evidence_present';
  if(blocked){status=d.code==='overdue_handling_reviewed'?'requires_overdue_policy_review':'missing_evidence';
   if(d.code==='tenant_status_launchable')status='tenant_status_not_launchable';}
  if(review){if(d.code==='subscription_readiness_not_blocked')status='subscription_review_required';
   if(d.code==='license_plan_enforcement_not_blocked')status='license_plan_review_required';
   if(d.code==='billing_customer_reference_ready')status='not_required_for_comped_plan';}
  return {...d,launch_reason:'Source-defined commercial evidence required before paid activation',evidence_value:status==='missing_evidence'||status==='tenant_status_not_launchable'?0:1,status};
 });
 const missing=controls.filter(c=>!['evidence_present','not_required_for_comped_plan'].includes(c.status));
 return {tenant_id:id,tenant_name:name,status:blocked?'paid_launch_blocked':review?'paid_launch_review_required':'paid_launch_ready',evidence,controls,
  missing_control_codes:missing.map(c=>c.code),next_best_step:blocked?'Review the tenant lifecycle status before paid activation.':
  review?'Review subscription readiness before paid activation.':'Technical billing activation evidence is ready for manual commercial-owner acceptance.'};
}
export const activationRows=[makeActivationTenant(activationAlpha,'Activation Alpha'),makeActivationTenant(activationBeta,'Activation Beta','blocked'),makeActivationTenant(activationGamma,'Activation Gamma','review')];
export function makeActivationPackage(tenants:ActivationTenant[]=activationRows,webhook:ActivationWebhook=webhookReview):ActivationPackage{
 const count=(p:(t:ActivationTenant)=>boolean)=>tenants.filter(p).length;
 const summary:Record<string,number>={tenants_total:tenants.length,paid_launch_ready:count(t=>t.status==='paid_launch_ready'),
  paid_launch_blocked:count(t=>t.status==='paid_launch_blocked'),review_required:count(t=>t.status==='paid_launch_review_required'),
  tenant_status_not_launchable:count(t=>t.evidence.tenant_status_launchable===0),
  blocked_by_subscription:count(t=>t.evidence.subscription_readiness_state==='subscription_blocked'),
  subscription_reviews_required:count(t=>t.evidence.subscription_readiness_state==='subscription_review_required'),
  blocked_by_license_plan:count(t=>t.evidence.license_enforcement_state==='license_enforcement_blocked'),
  license_plan_reviews_required:count(t=>t.evidence.license_enforcement_state==='license_enforcement_review_required'),
  missing_plan_code:count(t=>t.evidence.plan_code_present===0),billing_not_launch_ready:count(t=>t.evidence.billing_status_launch_ready===0),
  missing_billing_customer_reference:count(t=>t.evidence.billing_customer_reference_ready===0),
  missing_billing_event_history:count(t=>t.evidence.billing_event_history_present===0),
  missing_commercial_limits:count(t=>t.evidence.commercial_limits_present===0),
  missing_commercial_feature_flags:count(t=>t.evidence.commercial_feature_flags_present===0),
  overdue_policy_reviews_required:count(t=>t.controls.some(c=>c.status==='requires_overdue_policy_review')),
  total_controls:tenants.length*activationControlDefs.length,
  controls_with_evidence:tenants.reduce((n,t)=>n+t.controls.filter(c=>['evidence_present','not_required_for_comped_plan'].includes(c.status)).length,0),
  provider_webhook_ready:webhook.ready&&!webhook.operational_attention_required?1:0,
  provider_webhook_review_required:!webhook.ready||webhook.operational_attention_required?1:0};
 const posture=!tenants.length?'no_tenants_to_review_for_paid_launch':summary.paid_launch_blocked?'billing_subscription_activation_blocked':
  summary.review_required||summary.provider_webhook_review_required?'billing_subscription_activation_review_required':'billing_subscription_activation_ready';
 return {phase:'Platform Commercial Launch Readiness',step:'Step 210 — Billing Subscription Activation Gate',posture,generated_at:'2026-11-05T12:00:00.000Z',summary,
  upstream_evidence:{subscription_readiness:{posture:'subscription_review_required',summary:{tenants_total:tenants.length}},
   license_plan_enforcement:{posture:'license_enforcement_review_required',summary:{tenants_total:tenants.length},plan_definitions:[{key:'starter'}]},
   payment_provider_webhook_readiness:webhook},billing_policy_reference:'docs/BILLING_SUBSCRIPTION_GUIDE.md',
  manual_commercial_owner_acceptance_required:true,activation_controls:activationControlDefs.map(d=>({...d,launch_reason:'Source-defined commercial evidence',evidence_value:0,status:'missing_evidence'})),
  tenants,validation_note:'Read-only billing subscription activation gate. Technical evidence is not payment settlement, provider delivery or commercial-owner approval.'};
}
export type BillingActivationOptions={urlQuery?:string;permissions?:string[];rows?:ActivationTenant[];webhook?:ActivationWebhook;
 billingTenantsStatus?:number;gateStatus?:number;expectHeading?:boolean;
 onCall?:(method:string,path:string,query:URLSearchParams)=>void;
 respond?:(method:string,path:string,query:URLSearchParams)=>{json:any;status?:number}|undefined;
 alter?:(payload:ActivationPackage)=>ActivationPackage};
export async function openBillingActivation(page:Page,opts:BillingActivationOptions={}){
 targetBaseURL();const permissions=opts.permissions??BILLING_ACTIVATION_PERMISSIONS,rows=opts.rows??activationRows;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),query=url.searchParams;
  opts.onCall?.(method,path,query);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic token cannot refresh'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@synthetic.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=opts.respond?.(method,path,query);if(override)return fulfillJson(route,override.json,override.status??200);
  if(method==='GET'&&path==='/platform/billing')return fulfillJson(route,opts.billingTenantsStatus&&opts.billingTenantsStatus>=400?
   {message:'Billing tenant selector unavailable'}:rows.map(t=>({id:t.tenant_id,name:t.tenant_name})),opts.billingTenantsStatus??200);
  if(method==='GET'&&path===BILLING_ACTIVATION_PATH){
   if(!BILLING_ACTIVATION_PERMISSIONS.every(p=>permissions.includes(p)))return fulfillJson(route,{message:'Forbidden'},403);
   if(opts.gateStatus&&opts.gateStatus>=400)return fulfillJson(route,{message:'Billing activation evidence unavailable'},opts.gateStatus);
   const selected=query.get('tenant_id'),scoped=selected?rows.filter(t=>t.tenant_id===selected):rows;
   if(selected&&!scoped.length)return fulfillJson(route,{message:'Tenant not found'},404);
   const data=makeActivationPackage(scoped,opts.webhook??webhookReview);return fulfillJson(route,opts.alter?opts.alter(data):data);
  }
  return fulfillJson(route,{message:'Synthetic route unavailable'},404);
 });
 await page.goto(BILLING_ACTIVATION_PATH+(opts.urlQuery?'?'+opts.urlQuery:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Billing subscription activation',exact:true})).toBeVisible();
}
