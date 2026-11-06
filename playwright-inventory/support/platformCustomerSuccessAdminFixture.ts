/** Batch 101 — Source-traced Customer Success fixture. Pure synthetic API responses.
 * This is an internal triage surface, not live customer sentiment, payment, incident
 * resolution, contact proof, PostgreSQL isolation or a verified external outcome.
 * Phase 1: do not execute or compile. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
export const successPath='/platform/customer-success-admin';
export const successPermissions=['platform.dashboard.read','platform.tenants.read','platform.billing.read','platform.incidents.read','platform.support_sessions.read','platform.audit.read'];
export const successTenantA='c0100000-0000-4000-8000-000000000001';
export const successTenantB='c0100000-0000-4000-8000-000000000002';
export const successTenantC='c0100000-0000-4000-8000-000000000003';
export const successTenantD='c0100000-0000-4000-8000-000000000004';
export const successStates=['customer_success_ready','customer_success_watch','customer_success_at_risk','customer_success_partial_evidence'];
type RiskFlag={code:string;severity:string;points:number;message:string};
export type SuccessItem={tenant_id:string;tenant_name:string;tenant_status:string;billing_status:string|null;plan_code:string|null;
 primary_contacts:number;open_tasks:number;open_urgent_tasks:number;overdue_tasks:number;unresolved_follow_ups:number;
 last_customer_touch_at:string|null;days_since_last_touch:number|null;open_support_sessions:number|null;open_incidents:number|null;
 subscription_readiness_state:string|null;license_enforcement_state:string|null;success_risk_score:number;
 customer_success_state:string;risk_flags:RiskFlag[];recommended_admin_actions:string[]};
const base:SuccessItem={tenant_id:successTenantA,tenant_name:'Fixture Success Alpha',tenant_status:'active',billing_status:'active',plan_code:'starter',
 primary_contacts:2,open_tasks:0,open_urgent_tasks:0,overdue_tasks:0,unresolved_follow_ups:0,
 last_customer_touch_at:'2026-11-04T00:00:00Z',days_since_last_touch:1,open_support_sessions:0,open_incidents:0,
 subscription_readiness_state:'subscription_ready',license_enforcement_state:'license_enforcement_ready',success_risk_score:0,
 customer_success_state:'customer_success_ready',risk_flags:[],recommended_admin_actions:[]};
export const successItems:SuccessItem[]=[
 {...base},
 {...base,tenant_id:successTenantB,tenant_name:'Fixture Success Beta',primary_contacts:0,open_tasks:2,overdue_tasks:1,
  success_risk_score:40,customer_success_state:'customer_success_watch',risk_flags:[{code:'missing_primary_contact',severity:'warning',points:20,message:'No primary tenant contact'},{code:'overdue_tasks',severity:'warning',points:20,message:'Task overdue'}],
  recommended_admin_actions:['assign_primary_customer_contact','clear_customer_success_task_backlog']},
 {...base,tenant_id:successTenantC,tenant_name:'Fixture Success Gamma',billing_status:'past_due',plan_code:'enterprise',open_tasks:3,open_urgent_tasks:1,open_incidents:2,
  subscription_readiness_state:'subscription_blocked',license_enforcement_state:'license_enforcement_blocked',success_risk_score:100,customer_success_state:'customer_success_at_risk',
  risk_flags:[{code:'billing_blocked',severity:'critical',points:35,message:'Billing past due'},{code:'open_urgent_tasks',severity:'critical',points:20,message:'Urgent task'},{code:'support_escalation_open',severity:'warning',points:20,message:'Escalation'}],
  recommended_admin_actions:['clear_customer_success_task_backlog','review_subscription_billing_blockers','review_license_plan_enforcement_blockers','review_incident_escalation']},
 {...base,tenant_id:successTenantD,tenant_name:'Fixture Success Delta',unresolved_follow_ups:2,days_since_last_touch:75,open_support_sessions:1,
  success_risk_score:45,customer_success_state:'customer_success_watch',risk_flags:[{code:'unresolved_follow_ups',severity:'warning',points:15,message:'Follow ups unresolved'},{code:'no_recent_customer_touch',severity:'info',points:10,message:'Last touch old'},{code:'support_escalation_open',severity:'warning',points:20,message:'Open support'}],
  recommended_admin_actions:['schedule_customer_check_in','resolve_customer_follow_ups','coordinate_support_escalation']},
 {...base,tenant_id:'c0100000-0000-4000-8000-000000000005',tenant_name:'Fixture Success Archived',tenant_status:'archived',customer_success_state:'customer_success_watch',success_risk_score:25,
  risk_flags:[{code:'tenant_inactive',severity:'warning',points:25,message:'Archived tenant'}]},
 {...base,tenant_id:'c0100000-0000-4000-8000-000000000006',tenant_name:'Fixture Success Epsilon',plan_code:'standard'},
 {...base,tenant_id:'c0100000-0000-4000-8000-000000000007',tenant_name:'Fixture Success Zeta',plan_code:'starter'},
 {...base,tenant_id:'c0100000-0000-4000-8000-000000000008',tenant_name:'Fixture Success Eta',plan_code:'starter'}
];
export function manySuccessItems(count:number):SuccessItem[]{return Array.from({length:count},(_,i)=>({...base,
 tenant_id:`${String(i+3100).padStart(8,'0')}-0000-4000-8000-${String(i+3100).padStart(12,'0')}`,
 tenant_name:`Success Fixture ${String(i+1).padStart(3,'0')}`}));}
export type SuccessFixtureOptions={query?:string;permissions?:string[];items?:SuccessItem[];expectHeading?:boolean;
 alter?:(payload:any)=>any;
 onCall?:(method:string,path:string,query:URLSearchParams)=>void;
 respond?:(method:string,path:string,query:URLSearchParams)=>{json:any;status?:number}|undefined|Promise<{json:any;status?:number}|undefined>};
export async function openCustomerSuccess(page:Page,opts:SuccessFixtureOptions={}){
 targetBaseURL();const permissions=opts.permissions??successPermissions;const items=opts.items??successItems;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const u=new URL(req.url()),path=u.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),q=u.searchParams;
  opts.onCall?.(method,path,q);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'No refresh in fixture'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@sample.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=await opts.respond?.(method,path,q);if(override)return fulfillJson(route,override.json,override.status??200);
  if(path===successPath&&method==='GET'){
   if(!permissions.includes('platform.tenants.read'))return fulfillJson(route,{message:'Forbidden'},403);
   const scoped=q.get('tenant_id')||'',state=q.get('state')||'',term=(q.get('search')||'').trim().toLowerCase(),history=q.get('include_history')==='true';
   if(scoped&&!items.some(item=>item.tenant_id===scoped))return fulfillJson(route,{message:'Tenant not found'},404);
   const hasBilling=permissions.includes('platform.billing.read'),hasSupport=permissions.includes('platform.support_sessions.read'),hasIncident=permissions.includes('platform.incidents.read');
   const complete=hasBilling&&hasSupport&&hasIncident;
   const rows=items.filter(item=>(scoped?item.tenant_id===scoped:history||item.tenant_status!=='archived')&&(!term||item.tenant_name.toLowerCase().includes(term)))
    .map(item=>{
     const record={...item,billing_status:hasBilling?item.billing_status:null,plan_code:hasBilling?item.plan_code:null,
      subscription_readiness_state:hasBilling?item.subscription_readiness_state:null,license_enforcement_state:hasBilling?item.license_enforcement_state:null,
      open_support_sessions:hasSupport?item.open_support_sessions:null,open_incidents:hasIncident?item.open_incidents:null,
      customer_success_state:!complete&&item.customer_success_state==='customer_success_ready'?'customer_success_partial_evidence':item.customer_success_state,
      recommended_admin_actions:item.recommended_admin_actions.filter(a=>
       hasBilling||!a.startsWith('review_subscription')&&!a.startsWith('review_license')).filter(a=>
       hasIncident||a!=='review_incident_escalation').filter(a=>hasSupport||a!=='coordinate_support_escalation')};
     return record;
    }).filter(item=>!state||item.customer_success_state===state);
   const count=(name:string)=>rows.filter(item=>item.customer_success_state===name).length;
   const summary={tenants_reviewed:rows.length,ready_tenants:count('customer_success_ready'),watch_tenants:count('customer_success_watch'),
    at_risk_tenants:count('customer_success_at_risk'),partial_evidence_tenants:count('customer_success_partial_evidence'),
    tenants_missing_primary_contact:rows.filter(r=>r.primary_contacts===0).length,tenants_with_overdue_tasks:rows.filter(r=>r.overdue_tasks>0).length,
    tenants_with_unresolved_follow_ups:rows.filter(r=>r.unresolved_follow_ups>0).length,tenants_without_recent_touch:rows.filter(r=>r.days_since_last_touch===null||r.days_since_last_touch>30).length,
    tenants_with_open_support_sessions:hasSupport?rows.filter(r=>(r.open_support_sessions||0)>0).length:null,
    tenants_with_open_incidents:hasIncident?rows.filter(r=>(r.open_incidents||0)>0).length:null,
    tenants_with_support_escalations:hasIncident&&hasSupport?rows.filter(r=>r.risk_flags.some(f=>f.code==='support_escalation_open')).length:null};
   const posture=summary.at_risk_tenants?'customer_success_admin_at_risk':summary.watch_tenants?'customer_success_admin_watch':
    !complete||summary.partial_evidence_tenants?'customer_success_admin_partial_evidence':'customer_success_admin_ready';
   const limit=Math.max(1,Math.min(100,Number(q.get('limit')||50))),offset=Math.max(0,Number(q.get('offset')||0));
   const evidence_access={tenant_directory:true,tenant_contacts:true,tenant_tasks:true,tenant_communications:true,
    support_sessions:hasSupport,incidents:hasIncident,billing_subscription:hasBilling,license_plan_enforcement:hasBilling};
   const response={feature:'platform_customer_success_admin',generated_at:'2026-11-05T12:00:00Z',posture,health_states:successStates,summary,
    pagination:{limit,offset,total:rows.length,has_more:offset+limit<rows.length},evidence_access,
    available_sources:Object.keys(evidence_access).filter(k=>(evidence_access as Record<string,boolean>)[k]),
    omitted_sources:Object.keys(evidence_access).filter(k=>!(evidence_access as Record<string,boolean>)[k]),evidence_complete:complete,
    truth_contract:{customer_success_ready_requires_complete_authorized_evidence:true,risk_score_is_application_triage_heuristic_not_external_customer_health_measurement:true,
     recorded_customer_touch_is_application_evidence_not_proof_of_external_customer_contact:true,billing_application_state_does_not_prove_payment_settlement_or_contract_status:true},
    items:rows.slice(offset,offset+limit)};
   return fulfillJson(route,opts.alter?opts.alter(response):response);
  }
  return fulfillJson(route,{message:'Isolated Customer Success fixture: unhandled route'},404);
 });
 await page.goto(successPath+(opts.query?'?'+opts.query:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Customer success',exact:true})).toBeVisible();
}
