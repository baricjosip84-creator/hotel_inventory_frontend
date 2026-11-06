/** Batch 55: synthetic browser-facing transport only. This does not exercise
 * database repeatable-read, tenant isolation, archive redaction, server ACL,
 * audit durability, or external delivery. Never use production accounts. */
import { expect, type Page, type Route } from '@playwright/test';
import { targetBaseURL } from './environment';
import { fulfillJson } from './tenantSession';
import { syntheticJwt, SYNTHETIC_PLATFORM_USER_ID } from './platformSession';

export const EXPORT_TENANT_A = 'aaaaaaaa-aaaa-4aaa-8aaa-111111111111';
export const EXPORT_TENANT_B = 'bbbbbbbb-bbbb-4bbb-8bbb-222222222222';
export const exportPermissionSnapshot = [
  'platform.tenants.read', 'platform.tenants.export',
  'platform.audit.read', 'platform.compliance.read', 'platform.data_retention.read'
];
export const exportTenants = [
  {id: EXPORT_TENANT_A, name:'Alpha Test Hotel', status:'active', billing_status:'active',plan_code:'starter'},
  {id: EXPORT_TENANT_B, name:'Beta Test Warehouse', status:'locked', billing_status:'trial',plan_code:'pro'}
];
export const exportPreview = {
  tenant:exportTenants[0], generated_at:'2026-11-03T08:15:00Z',
  tables:[{table:'products',row_count:12},{table:'stock_movements',row_count:7}],
  counted_rows:19,total_rows:19,evidence_complete:true,failed_tables:[],
  export_scope:{tenant_owned_tables_only:true,platform_control_plane_tables_excluded:true,
    secret_and_credential_material_excluded:true,special_child_tables:['product_categories']},
  notes:['Synthetic source counts; not a verified database snapshot']
};
export const partialExportPreview={...exportPreview, evidence_complete:false,
  failed_tables:['stock_movements'],total_rows:null,counted_rows:12,
  tables:[{table:'products',row_count:12},{table:'stock_movements',row_count:null,error_code:'read_failed',error:'Temporary count failure'}]};
export const fullExportArchive = {
  ...exportPreview,export_version:1,mode:'full' as const,max_rows_per_table:5000,complete:true,
  truncated_tables:[],redacted_sensitive_columns_count:1,
  archive_contract:{repeatable_read_snapshot:true,source_read_complete:true,row_data_complete:true,
    row_data_complete_requires_no_truncation:true,audit_event_records_application_generation_only:true,
    does_not_prove_external_delivery_or_receipt:true,does_not_prove_database_restore_capability:true},
  data:{products:{columns:['id','name'],redacted_columns:['secret'],rows:[{id:'fixture',name:'Synthetic product'}],source_row_count:1,exported_rows:1,truncated:false}}
};
export type TenantExportsOptions={
  query?:string; expectHeading?:boolean; permissions?:string[]; tenants?:typeof exportTenants;
  preview?:typeof exportPreview | typeof partialExportPreview;
  archive?:typeof fullExportArchive;
  responses?:Record<string,{status:number;json:unknown}>;
  onCall?:(method:string,path:string,body:any,query:URLSearchParams)=>void;
};
export async function openTenantExports(page:Page,opts:TenantExportsOptions={}){
  targetBaseURL();
  await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
  await page.route('**/platform/**',async (route:Route)=>{
    const request=route.request(); if(request.isNavigationRequest()) return route.continue();
    const url=new URL(request.url()); const path=url.pathname.replace(/^\/api(?=\/)/,'');const method=request.method();
    let body:any=null;if(method!=='GET')try{body=request.postDataJSON()}catch{body=request.postData()}
    opts.onCall?.(method,path,body,url.searchParams);
    if(path==='/platform/auth/refresh')return fulfillJson(route,{error:{message:'Fixture refresh unavailable'}},401);
    if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'exports-fixture@example.test',role:'superadmin',is_active:true});
    if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions:opts.permissions??exportPermissionSnapshot});
    const override=opts.responses?.[`${method} ${path}`];if(override)return fulfillJson(route,override.json,override.status);
    if(path==='/platform/tenants'&&method==='GET')return fulfillJson(route,opts.tenants??exportTenants);
    const previewMatch=path.match(/^\/platform\/tenant-exports\/([^/]+)\/preview$/);
    if(method==='GET'&&previewMatch){const tenant=(opts.tenants??exportTenants).find(t=>t.id===previewMatch[1])??exportTenants[0];return fulfillJson(route,{...(opts.preview??exportPreview),tenant});}
    const archiveMatch=path.match(/^\/platform\/tenant-exports\/([^/]+)\/archive$/);
    if(method==='POST'&&archiveMatch){const tenant=(opts.tenants??exportTenants).find(t=>t.id===archiveMatch[1])??exportTenants[0];
      return fulfillJson(route,{...(opts.archive??fullExportArchive),tenant,mode:body?.mode??'full',max_rows_per_table:body?.max_rows_per_table??5000});}
    return fulfillJson(route,[]);
  });
  const qs=opts.query? (opts.query.startsWith('?')?opts.query:'?'+opts.query):'';
  await page.goto('/platform/tenant-exports'+qs);
  if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Tenant exports'})).toBeVisible();
}
