/** Batch 100 — Platform License & Plan Enforcement, isolated application-evidence fixture.
 * Plans and runtime guard catalogs are traced to platformPlanCatalog, tenantPlanLimitPolicy,
 * tenantFeatureFlagPolicy and platformLicensePlanEnforcementService. Synthetic JSON is NOT
 * verification of live guards, payment, licensing, contracts, SQL, or role enforcement.
 * PHASE 1: NO compilation or test execution. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
export const licensePath='/platform/license-plan-enforcement';
export const licensePermissions=['platform.dashboard.read','platform.billing.read','platform.tenants.read','platform.audit.read'];
export const licenseTenantA='b9900000-0000-4000-8000-000000000001';
export const licenseTenantB='b9900000-0000-4000-8000-000000000002';
export const licenseTenantC='b9900000-0000-4000-8000-000000000003';
export const licenseTenantD='b9900000-0000-4000-8000-000000000004';
export const runtimeLimitKeys=['max_users','max_products','max_storage_locations'];
export const runtimeFeatureKeys=['purchase_orders','requisitions','forecasting','reports','automation'];
type PlanDefinition={plan_code:string;commercial_tier:string;required_limits:string[];required_feature_flags:string[];
 recommended_enforcement_mode:string;runtime_enforced_limits:string[];runtime_unenforced_limits:string[];
 runtime_enforced_feature_flags:string[];runtime_unenforced_feature_flags:string[];runtime_enforcement_complete:boolean};
function plan(code:string,tier:string,mode:string,limits:string[],features:string[]):PlanDefinition{
 const activeLimits=limits.filter(k=>runtimeLimitKeys.includes(k)),inactiveLimits=limits.filter(k=>!runtimeLimitKeys.includes(k));
 const activeFeatures=features.filter(k=>runtimeFeatureKeys.includes(k)),inactiveFeatures=features.filter(k=>!runtimeFeatureKeys.includes(k));
 return {plan_code:code,commercial_tier:tier,recommended_enforcement_mode:mode,required_limits:limits,required_feature_flags:features,
 runtime_enforced_limits:activeLimits,runtime_unenforced_limits:inactiveLimits,runtime_enforced_feature_flags:activeFeatures,
 runtime_unenforced_feature_flags:inactiveFeatures,runtime_enforcement_complete:!inactiveLimits.length&&!inactiveFeatures.length};
}
export const licensePlans:PlanDefinition[]=[
 plan('starter','self_serve','standard_limit_enforcement',['max_users','max_products','max_storage_locations'],['requisitions','purchase_orders']),
 plan('standard','commercial','standard_limit_enforcement',['max_users','max_products','max_storage_locations','max_integrations'],['requisitions','purchase_orders','forecasting','reports']),
 plan('enterprise','enterprise','contract_limit_enforcement',['max_users','max_products','max_storage_locations','max_integrations','max_api_clients'],['requisitions','purchase_orders','forecasting','reports','sso','api_access','advanced_integrations'])
];
export type LicenseItem={tenant_id:string;tenant_name:string;tenant_status:string;billing_status:string;plan_code:string|null;
 commercial_tier:string|null;recommended_enforcement_mode:string|null;configuration_complete:boolean;runtime_enforcement_complete:boolean;
 missing_limits:string[];invalid_limits:string[];missing_feature_flags:string[];runtime_enforced_limits:string[];
 runtime_unenforced_limits:string[];runtime_enforced_feature_flags:string[];runtime_unenforced_feature_flags:string[];
 enforcement_gaps:string[];enforcement_state:'license_enforcement_ready'|'license_enforcement_review_required'|'license_enforcement_blocked'};
const starter=licensePlans[0],standard=licensePlans[1],enterprise=licensePlans[2];
const licenseBase:LicenseItem={tenant_id:licenseTenantA,tenant_name:'Fixture License Alpha',tenant_status:'active',billing_status:'active',plan_code:'starter',commercial_tier:'self_serve',
 recommended_enforcement_mode:'standard_limit_enforcement',configuration_complete:true,runtime_enforcement_complete:true,missing_limits:[],invalid_limits:[],missing_feature_flags:[],
 runtime_enforced_limits:starter.runtime_enforced_limits,runtime_unenforced_limits:[],runtime_enforced_feature_flags:starter.runtime_enforced_feature_flags,
 runtime_unenforced_feature_flags:[],enforcement_gaps:[],enforcement_state:'license_enforcement_ready'};
export const licenseItems:LicenseItem[]=[
 {...licenseBase},
 {...licenseBase,tenant_id:licenseTenantB,tenant_name:'Fixture License Beta',plan_code:'standard',commercial_tier:'commercial',runtime_enforcement_complete:false,
  runtime_enforced_limits:standard.runtime_enforced_limits,runtime_unenforced_limits:standard.runtime_unenforced_limits,
  runtime_enforced_feature_flags:standard.runtime_enforced_feature_flags,enforcement_gaps:['runtime_limit_enforcement_missing'],
  enforcement_state:'license_enforcement_review_required'},
 {...licenseBase,tenant_id:licenseTenantC,tenant_name:'Fixture License Gamma',plan_code:'enterprise',commercial_tier:'enterprise',billing_status:'past_due',
  recommended_enforcement_mode:'contract_limit_enforcement',runtime_enforcement_complete:false,
  runtime_enforced_limits:enterprise.runtime_enforced_limits,runtime_unenforced_limits:enterprise.runtime_unenforced_limits,
  runtime_enforced_feature_flags:enterprise.runtime_enforced_feature_flags,runtime_unenforced_feature_flags:enterprise.runtime_unenforced_feature_flags,
  enforcement_gaps:['billing_not_enforceable','runtime_limit_enforcement_missing','runtime_feature_enforcement_missing'],enforcement_state:'license_enforcement_blocked'},
 {...licenseBase,tenant_id:licenseTenantD,tenant_name:'Fixture License Delta',plan_code:'unlisted',commercial_tier:null,recommended_enforcement_mode:null,
  configuration_complete:false,runtime_enforcement_complete:false,runtime_enforced_limits:[],runtime_enforced_feature_flags:[],enforcement_gaps:['plan_definition_missing'],enforcement_state:'license_enforcement_blocked'},
 {...licenseBase,tenant_id:'b9900000-0000-4000-8000-000000000005',tenant_name:'Fixture License Archived',tenant_status:'archived',billing_status:'comped'},
 {...licenseBase,tenant_id:'b9900000-0000-4000-8000-000000000006',tenant_name:'Fixture License Invalid',configuration_complete:false,invalid_limits:['max_users'],enforcement_gaps:['required_limits_invalid'],enforcement_state:'license_enforcement_review_required'},
 {...licenseBase,tenant_id:'b9900000-0000-4000-8000-000000000007',tenant_name:'Fixture License Feature Gap',configuration_complete:false,missing_feature_flags:['requisitions'],enforcement_gaps:['required_feature_flags_missing'],enforcement_state:'license_enforcement_review_required'},
 {...licenseBase,tenant_id:'b9900000-0000-4000-8000-000000000008',tenant_name:'Fixture License Unconfigured',plan_code:null,commercial_tier:null,recommended_enforcement_mode:null,
  billing_status:'not_configured',configuration_complete:false,runtime_enforcement_complete:false,runtime_enforced_limits:[],runtime_enforced_feature_flags:[],
  enforcement_gaps:['plan_code_missing','billing_not_enforceable'],enforcement_state:'license_enforcement_blocked'}
];
export function manyLicenseItems(count:number):LicenseItem[]{return Array.from({length:count},(_,i)=>({
 ...licenseBase,tenant_id:`${String(2100+i).padStart(8,'0')}-0000-4000-8000-${String(2100+i).padStart(12,'0')}`,tenant_name:`License Fixture ${String(i+1).padStart(3,'0')}`}));}
export type LicenseFixtureOptions={query?:string;permissions?:string[];items?:LicenseItem[];expectHeading?:boolean;
 onCall?:(method:string,path:string,query:URLSearchParams)=>void;
 respond?:(method:string,path:string,query:URLSearchParams)=>{json:any;status?:number}|undefined|Promise<{json:any;status?:number}|undefined>};
export async function openLicenseEnforcement(page:Page,opts:LicenseFixtureOptions={}){
 targetBaseURL();const permissions=opts.permissions??licensePermissions;const items=opts.items??licenseItems;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const u=new URL(req.url()),path=u.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),q=u.searchParams;
  opts.onCall?.(method,path,q);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'No refresh in fixture'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@sample.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=await opts.respond?.(method,path,q);if(override)return fulfillJson(route,override.json,override.status??200);
  if(path===licensePath&&method==='GET'){
   if(!permissions.includes('platform.billing.read')||!permissions.includes('platform.tenants.read'))return fulfillJson(route,{message:'Forbidden'},403);
   const tenant=q.get('tenant_id')||'',plan=q.get('plan_code')?.toLowerCase().trim()||'',status=q.get('billing_status')||'',
    search=(q.get('search')||'').toLowerCase().trim(),history=q.get('include_history')==='true';
   if(tenant&&!items.some(item=>item.tenant_id===tenant))return fulfillJson(route,{message:'Tenant not found'},404);
   const filtered=items.filter(item=>(!tenant?history||item.tenant_status!=='archived':item.tenant_id===tenant)
    &&(!plan||item.plan_code?.toLowerCase()===plan)&&(!status||item.billing_status===status)
    &&(!search||[item.tenant_name,item.plan_code||'',item.billing_status].some(s=>s.toLowerCase().includes(search))));
   const limit=Math.max(1,Math.min(100,Number(q.get('limit')||50))),offset=Math.max(0,Number(q.get('offset')||0));
   const slice=filtered.slice(offset,offset+limit);
   const hasGap=(key:string)=>filtered.filter(item=>Array.isArray(item.enforcement_gaps)&&item.enforcement_gaps.includes(key)).length;
   const count=(state:LicenseItem['enforcement_state'])=>filtered.filter(item=>item.enforcement_state===state).length;
   const summary={tenants_reviewed:filtered.length,ready_tenants:count('license_enforcement_ready'),
    tenants_requiring_review:count('license_enforcement_review_required'),blocked_tenants:count('license_enforcement_blocked'),
    missing_plan_definitions:hasGap('plan_definition_missing'),missing_required_limits:hasGap('required_limits_missing'),
    invalid_required_limits:hasGap('required_limits_invalid'),missing_required_feature_flags:hasGap('required_feature_flags_missing'),
    runtime_incomplete_tenants:filtered.filter(item=>!item.runtime_enforcement_complete&&licensePlans.some(p=>p.plan_code===item.plan_code)).length,
    tenants_with_unenforced_limits:filtered.filter(item=>Array.isArray(item.runtime_unenforced_limits)&&item.runtime_unenforced_limits.length>0).length,
    tenants_with_unenforced_feature_flags:filtered.filter(item=>Array.isArray(item.runtime_unenforced_feature_flags)&&item.runtime_unenforced_feature_flags.length>0).length,
    billing_blocked_tenants:hasGap('billing_not_enforceable')};
   const posture=summary.blocked_tenants?'license_plan_enforcement_blocked':summary.tenants_requiring_review?'license_plan_enforcement_review_required':'license_plan_enforcement_ready';
   return fulfillJson(route,{feature:'platform_license_plan_enforcement',generated_at:'2026-11-05T11:00:00Z',posture,
    plan_definitions:licensePlans,runtime_guard_catalog:{enforced_limit_keys:runtimeLimitKeys,enforced_feature_keys:runtimeFeatureKeys},summary,
    pagination:{limit,offset,total:filtered.length,has_more:offset+slice.length<filtered.length},
    evidence_access:{tenant_identity:true,billing_plan_configuration:true,runtime_guard_catalog:true},
    available_sources:['tenant_plan_configuration','runtime_plan_limit_guard_catalog','runtime_feature_entitlement_guard_catalog'],omitted_sources:[],evidence_complete:true,
    required_permissions_by_source:{tenant_plan_configuration:['platform.billing.read','platform.tenants.read']},
    truth_contract:{configured_plan_metadata_does_not_by_itself_prove_runtime_enforcement:true,
     runtime_coverage_is_derived_from_current_tenant_guard_catalogs:true,recommended_enforcement_mode_is_catalog_metadata_not_proof_that_mode_is_implemented:true,
     license_enforcement_ready_requires_required_configuration_and_runtime_guard_coverage:true,billing_status_is_application_state_not_payment_or_bank_settlement_proof:true},items:slice});
  }
  return fulfillJson(route,{message:'Isolated license fixture: unhandled route'},404);
 });
 await page.goto(licensePath+(opts.query?'?'+opts.query:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'License & plan enforcement',exact:true})).toBeVisible();
}
