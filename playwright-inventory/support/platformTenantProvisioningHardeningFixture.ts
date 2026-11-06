/** Batch 109: synthetic provisioning hardening responses. Phase 1 authored only.
 * A rendered evidence control cannot prove an actual preset was applied, a SQL row exists,
 * a billing provider is active, or an audit entry is externally witnessed. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';

export const HARDENING_PATH='/platform/tenant-provisioning-hardening';
export const HARDENING_PERMISSIONS=['platform.tenants.read','platform.provisioning_presets.read'];
export const hardTenantA='b1090000-0000-4000-8000-000000000001';
export const hardTenantB='b1090000-0000-4000-8000-000000000002';
export const hardTenantC='b1090000-0000-4000-8000-000000000003';
export type HardeningControl={code:string;label:string;evidence_key:string;launch_reason:string;evidence_value:number;status:string};
export type HardeningEvidence={organization_type:string|null;plan_code:string|null;billing_status:string|null;
 feature_flag_count:number;limit_count:number;admin_user_count:number;storage_location_count:number;
 provisioning_audit_count:number;onboarding_task_count:number;latest_provisioning_preset_key:string|null;
 latest_provisioning_audit_at:string|null;latest_onboarding_task_at:string|null;
 has_commercial_preset_shape:number;has_commercial_preset_evidence:number;has_plan_and_billing_status:number};
export type HardeningTenant={tenant_id:string;tenant_name:string;status:string;evidence:HardeningEvidence;
 controls:HardeningControl[];missing_control_codes:string[];next_best_step:string};
export type HardeningPreset={key:string;label:string;description:string;organization_type:string;
 feature_flags:Record<string,boolean>;limits:Record<string,number>;
 storage_locations:Array<{name:string;temperature_zone?:string|null}>};
export type HardeningPackage={phase:string;step:string;posture:string;generated_at:string;
 summary:Record<string,number>;provisioning_presets:HardeningPreset[];
 hardening_controls:HardeningControl[];tenants:HardeningTenant[];validation_note:string};
export const hardControlDefs=[
 {code:'commercial_preset_applied',label:'Commercial provisioning preset applied',evidence_key:'has_commercial_preset_evidence',launch_reason:'Explicit audited preset matching tenant shape is required'},
 {code:'plan_and_billing_seeded',label:'Plan and billing seed present',evidence_key:'has_plan_and_billing_status',launch_reason:'Supported commercial plan and billing posture required'},
 {code:'initial_admin_available',label:'Initial admin available',evidence_key:'admin_user_count',launch_reason:'At least one active admin needed'},
 {code:'starter_locations_available',label:'Starter storage locations available',evidence_key:'storage_location_count',launch_reason:'At least one active location needed'},
 {code:'provisioning_audit_trail_present',label:'Provisioning audit trail present',evidence_key:'provisioning_audit_count',launch_reason:'An explicit provisioning audit is required'},
 {code:'onboarding_handoff_started',label:'Onboarding handoff started',evidence_key:'onboarding_task_count',launch_reason:'A non-cancelled onboarding task is required'}
];
export const hardPresets:HardeningPreset[]=[
 {key:'retail_starter',label:'Retail Starter',description:'Starter retail organization preset',organization_type:'retail',
  feature_flags:{purchase_orders:true,stock_alerts:true},limits:{max_users:10},storage_locations:[{name:'Shop floor'},{name:'Backroom'}]},
 {key:'hotel_starter',label:'Hotel Starter',description:'Starter hospitality organization preset',organization_type:'hotel',
  feature_flags:{purchase_orders:true},limits:{max_users:20,max_locations:6},storage_locations:[{name:'Main store',temperature_zone:'ambient'}]}
];
export const hardEvidence:HardeningEvidence={organization_type:'retail',plan_code:'starter',billing_status:'trialing',
 feature_flag_count:2,limit_count:1,admin_user_count:2,storage_location_count:2,provisioning_audit_count:1,onboarding_task_count:1,
 latest_provisioning_preset_key:'retail_starter',latest_provisioning_audit_at:'2026-11-04T10:00:00.000Z',
 latest_onboarding_task_at:'2026-11-04T12:00:00.000Z',has_commercial_preset_shape:1,
 has_commercial_preset_evidence:1,has_plan_and_billing_status:1};
export function makeHardTenant(id:string,name:string,edits:Partial<HardeningEvidence>={}):HardeningTenant{
 const evidence={...hardEvidence,...edits};
 const controls:HardeningControl[]=hardControlDefs.map(control=>{
  const val=Number(evidence[control.evidence_key as keyof HardeningEvidence]||0);
  let status=val>0?'evidence_present':'missing_evidence';
  if(!val&&control.code==='commercial_preset_applied'&&evidence.has_commercial_preset_shape>0)status='needs_provisioning_audit_evidence';
  if(!val&&control.code==='provisioning_audit_trail_present'&&evidence.has_commercial_preset_shape>0)status='needs_audit_evidence_review';
  if(!val&&control.code==='onboarding_handoff_started'&&evidence.admin_user_count>0&&evidence.storage_location_count>0)status='ready_for_onboarding_task';
  return {...control,evidence_value:val,status};
 });
 const missing=controls.filter(c=>c.status!=='evidence_present');
 return {tenant_id:id,tenant_name:name,status:missing.length?'provisioning_hardening_incomplete':'provisioning_hardened_for_onboarding',
  evidence,controls,missing_control_codes:missing.map(c=>c.code),
  next_best_step:missing[0]?.label||'Provisioned tenant can move into the customer onboarding checklist.'};
}
export const hardRows:HardeningTenant[]=[
 makeHardTenant(hardTenantA,'Provisioned Alpha'),
 makeHardTenant(hardTenantB,'Provisioned Beta',{provisioning_audit_count:0,has_commercial_preset_evidence:0,latest_provisioning_audit_at:null}),
 makeHardTenant(hardTenantC,'Provisioned Gamma',{admin_user_count:0,storage_location_count:0,onboarding_task_count:0})
];
export function makeHardeningPackage(tenants:HardeningTenant[]=hardRows,presets:HardeningPreset[]=hardPresets):HardeningPackage{
 const summary:Record<string,number>={tenants_total:tenants.length,hardened_for_onboarding:0,missing_provisioning_evidence:0,
  missing_initial_admin:0,missing_starter_locations:0,missing_audit_trail:0,missing_onboarding_handoff:0,
  total_controls:tenants.length*hardControlDefs.length,controls_with_evidence:0};
 for(const t of tenants){const present=t.controls.filter(c=>c.status==='evidence_present').length;
  summary.controls_with_evidence+=present;
  if(present===t.controls.length)summary.hardened_for_onboarding++;
  if(present<t.controls.length)summary.missing_provisioning_evidence++;
  if(t.evidence.admin_user_count===0)summary.missing_initial_admin++;
  if(t.evidence.storage_location_count===0)summary.missing_starter_locations++;
  if(t.evidence.provisioning_audit_count===0)summary.missing_audit_trail++;
  if(t.evidence.onboarding_task_count===0)summary.missing_onboarding_handoff++;
 }
 const posture=!tenants.length?'no_tenants_to_harden':summary.missing_initial_admin?'tenant_provisioning_blocked_by_missing_admin':
  summary.missing_starter_locations?'tenant_provisioning_blocked_by_missing_locations':
  summary.missing_provisioning_evidence?'tenant_provisioning_hardening_incomplete':'tenant_provisioning_ready_for_customer_onboarding';
 return {phase:'Platform Commercial Launch Readiness',step:'Step 209 — Tenant Provisioning Hardening Board',posture,
  generated_at:'2026-11-05T12:00:00.000Z',summary,provisioning_presets:presets,hardening_controls:hardControlDefs.map(c=>({...c,evidence_value:0,status:'missing_evidence'})),tenants,
  validation_note:'Read-only provisioning hardening board. This does not provision tenants or certify commercial launch.'};
}
export type HardeningFixtureOptions={urlQuery?:string;permissions?:string[];rows?:HardeningTenant[];
 presets?:HardeningPreset[];tenantOptions?:Array<{id:string;name:string}>;
 tenantsStatus?:number;hardeningStatus?:number;expectHeading?:boolean;
 onCall?:(method:string,path:string,query:URLSearchParams)=>void;
 respond?:(method:string,path:string,query:URLSearchParams)=>{json:any;status?:number}|undefined;
 rawResponse?:(method:string,path:string,query:URLSearchParams)=>{body:string;status?:number;contentType?:string}|undefined;
 alter?:(payload:HardeningPackage)=>HardeningPackage};
export async function openHardening(page:Page,opts:HardeningFixtureOptions={}){
 targetBaseURL();const permissions=opts.permissions??HARDENING_PERMISSIONS;const rows=opts.rows??hardRows;
 const tenantOptions=opts.tenantOptions??rows.map(t=>({id:t.tenant_id,name:t.tenant_name}));
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const request=route.request(),url=new URL(request.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=request.method(),query=url.searchParams;
  opts.onCall?.(method,path,query);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic token cannot refresh'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@synthetic.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const raw=opts.rawResponse?.(method,path,query);if(raw)return route.fulfill({status:raw.status??200,contentType:raw.contentType??'text/plain',body:raw.body});
  const override=opts.respond?.(method,path,query);if(override)return fulfillJson(route,override.json,override.status??200);
  if(method==='GET'&&path==='/platform/tenants')return fulfillJson(route,opts.tenantsStatus&&opts.tenantsStatus>=400?{message:'Tenant options unavailable'}:tenantOptions,opts.tenantsStatus??200);
  if(method==='GET'&&path===HARDENING_PATH){
   if(!HARDENING_PERMISSIONS.every(p=>permissions.includes(p)))return fulfillJson(route,{message:'Forbidden'},403);
   if(opts.hardeningStatus&&opts.hardeningStatus>=400)return fulfillJson(route,{message:'Provisioning hardening evidence unavailable'},opts.hardeningStatus);
   const selected=query.get('tenant_id'),limit=Math.max(1,Math.min(300,Number(query.get('limit')||100)));
   const scoped=selected?rows.filter(t=>t.tenant_id===selected):rows.slice(0,limit);
   if(selected&&!scoped.length)return fulfillJson(route,{message:'Tenant not found'},404);
   const payload=makeHardeningPackage(scoped,opts.presets??hardPresets);
   return fulfillJson(route,opts.alter?opts.alter(payload):payload);
  }
  return fulfillJson(route,{message:'Synthetic route unavailable'},404);
 });
 await page.goto(HARDENING_PATH+(opts.urlQuery?'?'+opts.urlQuery:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Tenant provisioning hardening',exact:true})).toBeVisible();
}
