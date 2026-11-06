/** Batch 99 — isolated Platform Subscription Readiness browser evidence only.
 * All records are synthetic; payment, settlement, provider ownership, subscription
 * entitlements, PostgreSQL, and live permission enforcement remain Phase 2.
 * NO tests compiled or executed in Phase 1. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
export const readinessPath='/platform/subscription-readiness';
export const readinessPermissions=['platform.dashboard.read','platform.billing.read','platform.tenants.read','platform.audit.read'];
export const readinessTenantA='b9800000-0000-4000-8000-000000000001';
export const readinessTenantB='b9800000-0000-4000-8000-000000000002';
export const readinessTenantC='b9800000-0000-4000-8000-000000000003';
export const readinessTenantD='b9800000-0000-4000-8000-000000000004';
export type ReadinessItem={tenant_id:string;tenant_name:string;tenant_status:string;billing_status:string;
 plan_code:string|null;billing_customer_reference_present:boolean;trial_ends_at:string|null;
 current_period_ends_at:string|null;days_until_trial_end:number|null;days_until_period_end:number|null;
 billing_event_count:number;payment_provider_event_count:number;operator_recorded_event_count:number;
 last_billing_event_at:string|null;last_payment_provider_event_at:string|null;risk_flags:string[];
 readiness_state:'subscription_ready'|'subscription_review_required'|'subscription_blocked'};
const base:ReadinessItem={tenant_id:readinessTenantA,tenant_name:'Fixture Readiness Alpha',tenant_status:'active',billing_status:'active',
 plan_code:'GROWTH',billing_customer_reference_present:true,trial_ends_at:null,current_period_ends_at:'2099-12-31T00:00:00Z',
 days_until_trial_end:null,days_until_period_end:500,billing_event_count:2,payment_provider_event_count:1,operator_recorded_event_count:1,
 last_billing_event_at:'2026-11-05T09:00:00Z',last_payment_provider_event_at:'2026-11-05T08:00:00Z',
 risk_flags:[],readiness_state:'subscription_ready'};
export const readinessItems:ReadinessItem[]=[
 {...base},
 {...base,tenant_id:readinessTenantB,tenant_name:'Fixture Readiness Beta',tenant_status:'active',billing_status:'trialing',plan_code:'STARTER',
  trial_ends_at:'2099-12-30T00:00:00Z',days_until_trial_end:30,current_period_ends_at:null,days_until_period_end:null,
  risk_flags:['billing_event_history_missing'],billing_event_count:0,payment_provider_event_count:0,operator_recorded_event_count:0,
  readiness_state:'subscription_review_required'},
 {...base,tenant_id:readinessTenantC,tenant_name:'Fixture Readiness Gamma',tenant_status:'active',billing_status:'past_due',plan_code:'GROWTH',
  risk_flags:['billing_past_due','billing_customer_reference_missing'],billing_customer_reference_present:false,readiness_state:'subscription_blocked'},
 {...base,tenant_id:readinessTenantD,tenant_name:'Fixture Readiness Delta',tenant_status:'archived',billing_status:'comped',plan_code:'COMPED',
  current_period_ends_at:'2020-01-01T00:00:00Z',days_until_period_end:-2200,risk_flags:[],readiness_state:'subscription_ready'}
];
export function manyReadinessItems(count:number):ReadinessItem[]{return Array.from({length:count},(_,i)=>({
 ...base,tenant_id:`${String(i+1200).padStart(8,'0')}-0000-4000-8000-${String(i+1200).padStart(12,'0')}`,
 tenant_name:`Readiness Fixture ${String(i+1).padStart(3,'0')}`
}));}
export type ReadinessFixtureOptions={query?:string;permissions?:string[];items?:ReadinessItem[];expectHeading?:boolean;
 onCall?:(method:string,path:string,query:URLSearchParams)=>void;
 respond?:(method:string,path:string,query:URLSearchParams)=>{json:any;status?:number}|undefined|Promise<{json:any;status?:number}|undefined>};
export async function openSubscriptionReadiness(page:Page,opts:ReadinessFixtureOptions={}){
 targetBaseURL();const permissions=opts.permissions??readinessPermissions;const items=opts.items??readinessItems;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const u=new URL(req.url());const path=u.pathname.replace(/^\/api(?=\/)/,'');const method=req.method();const q=u.searchParams;
  opts.onCall?.(method,path,q);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'No refresh in isolated fixture'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@sample.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=await opts.respond?.(method,path,q);
  if(override)return fulfillJson(route,override.json,override.status??200);
  if(path===readinessPath&&method==='GET'){
   if(!permissions.includes('platform.billing.read')||!permissions.includes('platform.tenants.read'))return fulfillJson(route,{message:'Forbidden'},403);
   const search=(q.get('search')||'').toLowerCase().trim(),status=q.get('status')||'',tenant=q.get('tenant_id')||'';
   // Original backend assertTenantExists() responds 404 for a well-formed but unknown UUID.
   if(tenant&&!items.some(x=>x.tenant_id===tenant))return fulfillJson(route,{message:'Tenant not found'},404);
   const filtered=items.filter(x=>(!status||x.billing_status===status)&&(!tenant||x.tenant_id===tenant)
    &&(!search||[x.tenant_name,x.plan_code,x.billing_customer_reference_present?'cus_fixture_a':''].some(v=>String(v||'').toLowerCase().includes(search))));
   const limit=Math.max(1,Math.min(100,Number(q.get('limit')||50))),offset=Math.max(0,Number(q.get('offset')||0));
   const pageItems=filtered.slice(offset,offset+limit);
   const count=(state:string)=>filtered.filter(x=>x.readiness_state===state).length;
   const flags=(flag:string)=>filtered.filter(x=>x.risk_flags.includes(flag)).length;
   const summary={tenants_reviewed:filtered.length,ready_tenants:count('subscription_ready'),
    tenants_requiring_review:count('subscription_review_required'),blocked_tenants:count('subscription_blocked'),
    trials_ending_soon:flags('trial_ending_soon'),periods_ending_soon:flags('current_period_ending_soon'),
    past_due_tenants:filtered.filter(x=>x.billing_status==='past_due').length,
    missing_plan_codes:filtered.filter(x=>!x.plan_code).length,
    missing_customer_references:flags('billing_customer_reference_missing'),
    missing_billing_event_history:flags('billing_event_history_missing'),
    payment_provider_events:filtered.reduce((a,x)=>a+x.payment_provider_event_count,0),
    operator_recorded_events:filtered.reduce((a,x)=>a+x.operator_recorded_event_count,0)};
   const posture=summary.blocked_tenants?'subscription_commercial_blocked':summary.tenants_requiring_review?'subscription_commercial_review_required':'subscription_commercial_ready';
   return fulfillJson(route,{feature:'platform_subscription_readiness',generated_at:'2026-11-05T09:00:00Z',posture,summary,
    pagination:{limit,offset,total:filtered.length,has_more:offset+pageItems.length<filtered.length},
    evidence_access:{tenant_identity:true,billing_subscription:true},available_sources:['tenant_billing','platform_billing_events'],omitted_sources:[],
    evidence_complete:true,required_permissions_by_source:{tenant_billing:['platform.billing.read','platform.tenants.read']},
    truth_contract:{readiness_is_application_configuration_and_history_evidence_not_payment_certification:true,
     billing_event_history_presence_does_not_prove_payment_or_customer_receipt:true,
     payment_provider_event_presence_does_not_prove_bank_settlement:true,
     billing_customer_reference_is_application_linkage_not_provider_account_ownership_proof:true,
     comped_subscriptions_do_not_require_a_paid_period_end:true},items:pageItems});
  }
  return fulfillJson(route,{message:'Isolated readiness fixture: unhandled route'},404);
 });
 await page.goto(readinessPath+(opts.query?'?'+opts.query:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Subscription readiness',exact:true})).toBeVisible();
}
