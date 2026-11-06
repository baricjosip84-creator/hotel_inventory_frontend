/** Batch 108. Synthetic, route-scoped onboarding evidence; not a real tenant acceptance or DB proof.
 * Phase 1 only. No tests compiled/executed. The service derives counts from PostgreSQL,
 * but this fixture deliberately asserts only the frontend's responses to mocked evidence. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';

export const ONBOARDING_PATH='/platform/customer-onboarding-checklist';
export const ONBOARDING_PERMISSION=['platform.tenants.read'];
export const tenantA='b1080000-0000-4000-8000-000000000001';
export const tenantB='b1080000-0000-4000-8000-000000000002';
export const tenantC='b1080000-0000-4000-8000-000000000003';
export type Evidence={tenant_created_at:string|null;admin_user_count:number;product_count:number;
 storage_location_count:number;stock_row_count:number;shipment_count:number;stock_or_shipment_count:number;
 onboarding_task_count:number;onboarding_task_completed_count:number;onboarding_task_blocked_count:number;
 onboarding_task_overdue_count:number;report_review_task_count:number;latest_onboarding_task_at:string|null};
export type ChecklistItem={code:string;label:string;evidence_key:keyof Evidence;launch_reason:string;evidence_value?:number;status?:string};
export type TenantRow={tenant_id:string;tenant_name:string;status:string;evidence:Evidence;checklist:ChecklistItem[];
 missing_checklist_codes:string[];next_best_step:string};
export type OnboardingPackage={phase:string;step:string;posture:string;generated_at:string;
 summary:Record<string,number>;checklist_items:ChecklistItem[];tenants:TenantRow[];validation_note:string};
export const itemDefs:ChecklistItem[]=[
 {code:'company_profile_reviewed',label:'Company profile available for review',evidence_key:'tenant_created_at',launch_reason:'Company profile evidence available'},
 {code:'first_admin_confirmed',label:'First admin confirmed',evidence_key:'admin_user_count',launch_reason:'At least one active admin needed'},
 {code:'starter_products_confirmed',label:'Starter products or import plan confirmed',evidence_key:'product_count',launch_reason:'Products or import plan needed'},
 {code:'storage_locations_confirmed',label:'Storage locations confirmed',evidence_key:'storage_location_count',launch_reason:'Stock requires locations'},
 {code:'opening_stock_or_first_receiving_confirmed',label:'Opening stock or first receiving confirmed',evidence_key:'stock_or_shipment_count',launch_reason:'First receiving or opening stock needed'},
 {code:'first_operational_report_reviewed',label:'First operational report reviewed',evidence_key:'report_review_task_count',launch_reason:'Completed reporting review task needed'}
];
const ready:Evidence={tenant_created_at:'2026-10-01T12:00:00Z',admin_user_count:2,product_count:4,storage_location_count:1,
 stock_row_count:2,shipment_count:1,stock_or_shipment_count:3,onboarding_task_count:1,onboarding_task_completed_count:1,
 onboarding_task_blocked_count:0,onboarding_task_overdue_count:0,report_review_task_count:1,latest_onboarding_task_at:'2026-10-20T10:00:00Z'};
export function makeTenant(id:string,name:string,edits:Partial<Evidence>={}):TenantRow{
 const evidence={...ready,...edits};const checklist=itemDefs.map(item=>{
  const value=item.evidence_key==='tenant_created_at'?(evidence.tenant_created_at?1:0):Number(evidence[item.evidence_key]||0);
  return {...item,evidence_value:value,status:value>0?'evidence_present':evidence.onboarding_task_blocked_count>0?'blocked_by_onboarding_task':evidence.onboarding_task_count>0?'needs_completion_evidence':'missing_evidence'};
 });
 const missing=checklist.filter(item=>item.status!=='evidence_present');const blocked=evidence.onboarding_task_blocked_count>0;
 return {tenant_id:id,tenant_name:name,evidence,checklist,missing_checklist_codes:missing.map(item=>item.code),
  status:blocked?'onboarding_blocked_by_tasks':missing.length?'onboarding_evidence_incomplete':'ready_for_first_use_review',
  next_best_step:blocked?'Resolve blocked onboarding tasks before first-use review.':missing[0]?.label||'Manual customer acceptance review can be scheduled.'};
}
export const sampleTenants:TenantRow[]=[
 makeTenant(tenantA,'Onboarding Alpha'),
 makeTenant(tenantB,'Onboarding Beta',{product_count:0,report_review_task_count:0,onboarding_task_count:2,onboarding_task_completed_count:0}),
 makeTenant(tenantC,'Onboarding Gamma',{storage_location_count:0,report_review_task_count:0,onboarding_task_count:2,onboarding_task_blocked_count:1,onboarding_task_overdue_count:1})
];
export function makePackage(tenants:TenantRow[]=sampleTenants):OnboardingPackage{
 const summary:Record<string,number>={tenants_total:tenants.length,ready_for_first_use:0,blocked_by_tasks:0,missing_evidence:0,
  with_overdue_onboarding_tasks:0,total_checklist_items:tenants.length*itemDefs.length,checklist_items_with_evidence:0};
 for(const t of tenants){const complete=t.checklist.filter(c=>c.status==='evidence_present').length;
  summary.checklist_items_with_evidence+=complete;
  if(complete===t.checklist.length&&t.evidence.onboarding_task_blocked_count===0)summary.ready_for_first_use++;
  if(complete<t.checklist.length)summary.missing_evidence++;
  if(t.evidence.onboarding_task_blocked_count>0)summary.blocked_by_tasks++;
  if(t.evidence.onboarding_task_overdue_count>0)summary.with_overdue_onboarding_tasks++;
 }
 const posture=!tenants.length?'no_tenants_to_onboard':summary.blocked_by_tasks?'onboarding_blocked_by_tasks':
 summary.missing_evidence?'onboarding_evidence_incomplete':'onboarding_ready_for_manual_customer_acceptance';
 return {phase:'Platform Commercial Launch Readiness',step:'Step 208 — Customer Onboarding Checklist',posture,
  generated_at:'2026-11-05T12:00:00.000Z',summary,checklist_items:itemDefs.map(item=>({...item})),tenants,
  validation_note:'Read-only onboarding checklist. Customer acceptance still requires manual confirmation.'};
}
export type ChecklistFixtureOptions={urlQuery?:string;permissions?:string[];tenantOptions?:{id:string;name:string}[];
 rows?:TenantRow[];expectHeading?:boolean;tenantsStatus?:number;checklistStatus?:number;
 onCall?:(method:string,path:string,query:URLSearchParams)=>void;
 respond?:(method:string,path:string,query:URLSearchParams)=>{json:any;status?:number}|undefined;
 alter?:(payload:OnboardingPackage)=>OnboardingPackage};
export async function openOnboarding(page:Page,opts:ChecklistFixtureOptions={}){
 targetBaseURL();const permissions=opts.permissions??ONBOARDING_PERMISSION;const rows=opts.rows??sampleTenants;
 const tenantOptions=opts.tenantOptions??rows.map(t=>({id:t.tenant_id,name:t.tenant_name}));
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const request=route.request(),url=new URL(request.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=request.method(),query=url.searchParams;
  opts.onCall?.(method,path,query);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic token does not refresh'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@synthetic.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=opts.respond?.(method,path,query);if(override)return fulfillJson(route,override.json,override.status??200);
  if(method==='GET'&&path==='/platform/tenants')return fulfillJson(route,opts.tenantsStatus&&opts.tenantsStatus>=400?{message:'Tenant selector unavailable'}:tenantOptions,opts.tenantsStatus??200);
  if(method==='GET'&&path===ONBOARDING_PATH){
   if(!permissions.includes('platform.tenants.read'))return fulfillJson(route,{message:'Forbidden'},403);
   if(opts.checklistStatus&&opts.checklistStatus>=400)return fulfillJson(route,{message:'Checklist evidence unavailable'},opts.checklistStatus);
   const selected=query.get('tenant_id'),max=Math.max(1,Math.min(300,Number(query.get('limit')||100)));
   const scoped=selected?rows.filter(t=>t.tenant_id===selected):rows.slice(0,max);
   if(selected&&!rows.some(t=>t.tenant_id===selected))return fulfillJson(route,{message:'Tenant not found'},404);
   const response=makePackage(scoped);return fulfillJson(route,opts.alter?opts.alter(response):response);
  }
  return fulfillJson(route,{message:'Synthetic fixture route unavailable'},404);
 });
 await page.goto(ONBOARDING_PATH+(opts.urlQuery?'?'+opts.urlQuery:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Customer onboarding checklist',exact:true})).toBeVisible();
}
