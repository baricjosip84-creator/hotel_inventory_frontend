/** Batch 98 — source-traced synthetic billing registry/workbench fixture.
 * No live provider, bank, invoice, tenant, settlement, payment receipt, signed webhook,
 * PostgreSQL transaction or authorization is verified by these interceptions.
 * Phase 1 ONLY: authored, not compiled or executed. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';

export const billingPath='/platform/billing';
export const billingTenantA='b9800000-0000-4000-8000-000000000001';
export const billingTenantB='b9800000-0000-4000-8000-000000000002';
export const billingTenantC='b9800000-0000-4000-8000-000000000003';
export const billingTenantD='b9800000-0000-4000-8000-000000000004';
export const billingPermissions=['platform.dashboard.read','platform.billing.read','platform.billing.write',
 'platform.tenants.read','platform.tenants.export','platform.users.read','platform.audit.read'];
export type BillingTenantFixture={id:string;name:string;location:string;status:string;billing_status:string;
 plan_code:string;billing_customer_reference:string|null;trial_ends_at:string|null;current_period_ends_at:string|null;
 billing_notes:string|null;billing_event_count:number;last_billing_event_at:string|null};
const base={location:'Rijeka',status:'active',billing_status:'active',plan_code:'GROWTH',
 billing_customer_reference:'cus_fixture_a',trial_ends_at:null,current_period_ends_at:'2099-10-31T00:00:00Z',
 billing_notes:'Synthetic internal plan',billing_event_count:1,last_billing_event_at:'2026-11-04T11:00:00Z'};
export const billingTenants:BillingTenantFixture[]=[
 {...base,id:billingTenantA,name:'Fixture Billing Alpha'},
 {...base,id:billingTenantB,name:'Fixture Billing Beta',location:'Zagreb',billing_status:'trialing',plan_code:'STARTER',billing_customer_reference:'cus_fixture_b'},
 {...base,id:billingTenantC,name:'Fixture Billing Gamma',location:'Split',billing_status:'past_due',plan_code:'GROWTH',billing_customer_reference:null},
 {...base,id:billingTenantD,name:'Fixture Billing Delta',location:'Osijek',billing_status:'cancelled',plan_code:'',billing_customer_reference:null}
];
export const manyBillingTenants=(count:number):BillingTenantFixture[]=>Array.from({length:count},(_,i)=>({
 ...base,id:`${String(i+1300).padStart(8,'0')}-0000-4000-8000-${String(i+1300).padStart(12,'0')}`,
 name:`Billing Tenant ${String(i+1).padStart(3,'0')}`,billing_customer_reference:`cus_fixture_${i+1}`}));
export const billingEvent={id:'b9810000-0000-4000-8000-000000000001',event_type:'note',amount_cents:2500,currency:'EUR',
 external_reference:'EVT-FIXTURE-1',note:'Synthetic event record',created_at:'2026-11-04T11:00:00Z',
 created_by_email:'operator@fixture.test',created_by_name:'Fixture Operator',created_by_identity_restricted:false};
export const billingPlans=[{plan_code:'STARTER',commercial_tier:'starter',limits:{users:5},feature_flags:{analytics:false},
 required_limits:['users'],required_feature_flags:['analytics'],recommended_enforcement_mode:'hard'},
 {plan_code:'GROWTH',commercial_tier:'growth',limits:{users:50},feature_flags:{analytics:true},
 required_limits:['users'],required_feature_flags:['analytics'],recommended_enforcement_mode:'soft'}];
export type BillingFixtureOptions={query?:string;permissions?:string[];records?:BillingTenantFixture[];
 expectHeading?:boolean;legacy?:boolean;noDetailsTenant?:boolean;
 onCall?:(method:string,path:string,params:URLSearchParams,body:any)=>void;
 respond?:(method:string,path:string,params:URLSearchParams,body:any)=>Promise<{status?:number;json:any}|undefined>|{status?:number;json:any}|undefined};
export async function openPlatformBilling(page:Page,opts:BillingFixtureOptions={}){
 targetBaseURL();const permissions=opts.permissions??billingPermissions;
 let records=(opts.records??billingTenants).map(r=>({...r}));
 let events=[{...billingEvent}];
 await page.addInitScript(t=>{localStorage.setItem('inventory_platform_access_token',t);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const url=new URL(req.url());const path=url.pathname.replace(/^\/api(?=\/)/,'');const method=req.method();const query=url.searchParams;
  let body:any=undefined;if(!['GET','HEAD'].includes(method))try{body=req.postDataJSON();}catch{body=req.postData();}
  opts.onCall?.(method,path,query,body);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'No fixture refresh'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'operator@fixture.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=await opts.respond?.(method,path,query,body);
  if(override)return fulfillJson(route,override.json,override.status??200);
  if(path===billingPath+'/plan-catalog'&&method==='GET')return fulfillJson(route,{plans:billingPlans});
  if(path===billingPath+'/provider-webhook-readiness'&&method==='GET')return fulfillJson(route,{ready:true,operational_attention_required:false,
   enabled_provider_count:1,enabled_providers:['stripe'],missing_secret_providers:[],weak_secret_providers:[],
   recent_webhook_activity:{accepted_count:3,duplicate_count:1,rejected_count:0,last_accepted_at:'2026-11-04T11:00:00Z',last_rejected_at:null},
   webhook_operational_health:{status:'healthy',signals:[],rejection_rate:0,duplicate_rate:0.25}});
  if(path===billingPath&&method==='GET'){
   if(!permissions.includes('platform.billing.read')||!permissions.includes('platform.tenants.read'))return fulfillJson(route,{message:'Read forbidden'},403);
   const status=query.get('status')||'',search=(query.get('search')||'').trim().toLowerCase(),tenantId=query.get('tenant_id')||'';
   const matching=records.filter(t=>(!tenantId||t.id===tenantId)&&(!status||t.billing_status===status)
    &&(!search||[t.name,t.location,t.plan_code,t.billing_customer_reference].some(x=>String(x||'').toLowerCase().includes(search))));
   const limit=Math.max(1,Math.min(100,Number(query.get('limit')||50)));const offset=Math.max(0,Number(query.get('offset')||0));
   const visible=matching.slice(offset,offset+limit);const canActor=permissions.includes('platform.users.read');
   const count=(key:string)=>matching.filter(x=>x.billing_status===key).length;
   const result={feature:'platform_billing',generated_at:'2026-11-05T12:00:00Z',
    summary:{total_tenants:matching.length,active_tenants:count('active'),trialing_tenants:count('trialing'),
     past_due_tenants:count('past_due'),cancelled_tenants:count('cancelled'),comped_tenants:count('comped'),
     not_configured_tenants:count('not_configured'),billing_events:matching.length},
    pagination:{limit,offset,total:matching.length,has_more:offset+visible.length<matching.length},
    evidence_access:{billing:true,tenant_identity:true,platform_user_identity:canActor},
    evidence_complete:canActor,available_sources:canActor?['billing','tenant_identity','platform_users']:['billing','tenant_identity'],
    omitted_sources:canActor?[]:['platform_users'],required_permissions_by_source:{billing:['platform.billing.read'],platform_users:['platform.users.read']},
    truth_contract:{billing_status_is_application_state_not_payment_proof:true,provider_event_is_not_bank_settlement_proof:true},tenants:visible};
   return fulfillJson(route,opts.legacy?visible:result);
  }
  const details=path.match(/^\/platform\/billing\/([0-9a-f-]+)$/);
  if(details&&method==='GET'){
   const tenant=opts.noDetailsTenant?null:records.find(x=>x.id===details[1]);
   if(!tenant&& !opts.noDetailsTenant)return fulfillJson(route,{message:'Unknown billing tenant'},404);
   const canActor=permissions.includes('platform.users.read');
   return fulfillJson(route,{tenant,events:events.map(e=>canActor?e:({...e,created_by_email:null,created_by_name:null,created_by_identity_restricted:true})),
    evidence_access:{tenant_identity:true,platform_user_identity:canActor},evidence_complete:canActor});
  }
  if(path===billingPath+'/reconcile'&&method==='POST')return fulfillJson(route,{dry_run:body?.dry_run===true,
   inspected_count:records.length,issue_count:1,applied_count:body?.dry_run?0:1,
   actions:[{tenant_id:records[0]?.id,tenant_name:records[0]?.name,action:'review_status',reason:'Synthetic reconciliation signal',applied:!body?.dry_run}]});
  if(details&&method==='PATCH'){
   const t=records.find(x=>x.id===details[1]);if(!t)return fulfillJson(route,{message:'Tenant missing'},404);
   Object.assign(t,body);return fulfillJson(route,{tenant:t});
  }
  const action=path.match(/^\/platform\/billing\/([0-9a-f-]+)\/(status|renew|events|provider-events)$/);
  if(action&&method==='POST'){
   const t=records.find(x=>x.id===action[1]);if(!t)return fulfillJson(route,{message:'Tenant missing'},404);
   if(action[2]==='status'){t.billing_status=body?.billing_status;return fulfillJson(route,{tenant:t});}
   if(action[2]==='renew'){t.current_period_ends_at=body?.current_period_ends_at;return fulfillJson(route,{tenant:t});}
   if(action[2]==='events'){const event={...billingEvent,id:`b9810000-0000-4000-8000-${String(events.length+1).padStart(12,'0')}`,...body};events=[event,...events];return fulfillJson(route,event,201);}
   return fulfillJson(route,{duplicate:false,mapped_event_type:body?.provider_event_type||'invoice.payment_succeeded',event:billingEvent},201);
  }
  if(path===billingPath+'/provider-events'&&method==='POST')return fulfillJson(route,{duplicate:false,mapped_event_type:body?.provider_event_type||'invoice.payment_succeeded',event:billingEvent},201);
  return fulfillJson(route,{message:'Isolated fixture — unhandled route'},404);
 });
 await page.goto(`${billingPath}${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Billing',exact:true})).toBeVisible();
}
