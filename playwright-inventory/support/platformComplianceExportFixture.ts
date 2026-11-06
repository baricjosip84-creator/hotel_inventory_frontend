/** Batch 85 — synthetic Platform Compliance Export package fixture (GENERATED_UNRUN).
 * A mocked package is NOT a real legal export, certificate, service/database proof, recipient delivery or compliance acceptance. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';

export const exportRoot='/platform/compliance-export/package';
export const exportPermissions=['platform.dashboard.read','platform.compliance.read','platform.compliance.write','platform.privacy.read',
 'platform.tenants.read','platform.tenants.export','platform.audit.read','platform.data_retention.read','platform.access_reviews.read',
 'platform.users.read'];
export const exportTenant='b8500000-0000-4000-8000-000000000001';
export const exportDoc={id:'b8500000-0000-4000-8000-000000000011',title:'Fixture DPA evidence',tenant_id:exportTenant,
 tenant_name:'Fixture Tenant A',tenant_present:true,owner_email:'owner@fixture.test',owner_present:true,
 document_type:'dpa',status:'active',external_reference_present:true,expires_at:'2035-01-01T00:00:00Z',
 reviewed_at:'2026-10-10T00:00:00Z',days_until_expiration:3000,historical:false,current_package_evidence:true,
 risk_flags:[],package_ready:true};
export const draftExportDoc={...exportDoc,id:'b8500000-0000-4000-8000-000000000012',title:'Fixture draft security',
 document_type:'security',status:'draft',external_reference_present:false,owner_present:false,owner_email:null,
 reviewed_at:null,days_until_expiration:null,expires_at:null,risk_flags:['document_not_active','external_reference_missing',
 'owner_missing','review_evidence_missing'],package_ready:false};
export const historicalExportDoc={...exportDoc,id:'b8500000-0000-4000-8000-000000000013',title:'Fixture archived privacy',
 document_type:'privacy',status:'archived',historical:true,current_package_evidence:false,package_ready:false,risk_flags:[]};
export type PackageDoc=typeof exportDoc&Record<string,any>;
export const manyExportDocs=(n:number):PackageDoc[]=>Array.from({length:n},(_,i)=>({...exportDoc,
 id:`${String(i+1).padStart(8,'0')}-0000-4000-8000-${String(i+1).padStart(12,'0')}`,
 title:`Fixture Export Document ${String(i+1).padStart(3,'0')}`}));
export const exportSourceGrants:Record<string,string[]>={
 compliance_documents:['platform.compliance.read'],privacy_requests:['platform.privacy.read'],
 tenant_export_evidence:['platform.tenants.export','platform.tenants.read','platform.audit.read'],
 audit_retention:['platform.audit.read','platform.data_retention.read','platform.tenants.read'],
 permission_audit:['platform.access_reviews.read']};
export const allExportSources=Object.keys(exportSourceGrants);
export type ExportFixtureOptions={query?:string;permissions?:string[];documents?:PackageDoc[];expectHeading?:boolean;
 summary?:Record<string,any>;posture?:string;evidenceComplete?:boolean;documentEvidenceAccess?:{tenant_identity:boolean;platform_user_identity:boolean};
 onCall?:(method:string,path:string,q:URLSearchParams)=>void;
 respond?:(method:string,path:string,q:URLSearchParams)=>{status?:number;json:any}|undefined|Promise<{status?:number;json:any}|undefined>;
 overrides?:Record<string,{status?:number;json:any}>};
export async function openComplianceExport(page:Page,opts:ExportFixtureOptions={}){
 targetBaseURL();const permissions=opts.permissions??exportPermissions;
 const grants=Object.fromEntries(Object.entries(exportSourceGrants).map(([key,needed])=>[key,needed.every(p=>permissions.includes(p))])) as Record<string,boolean>;
 const available=allExportSources.filter(s=>grants[s]),omitted=allExportSources.filter(s=>!grants[s]);
 const docAccess=opts.documentEvidenceAccess??{tenant_identity:permissions.includes('platform.tenants.read'),
 platform_user_identity:permissions.includes('platform.users.read')};
 const documents=opts.documents??[exportDoc,draftExportDoc,historicalExportDoc];
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),q=url.searchParams,m=req.method();
  opts.onCall?.(m,path,q);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic refresh denied'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'fixture-compliance-export@fixture.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions});
  const response=(await opts.respond?.(m,path,q))??opts.overrides?.[`${m} ${path}`];
  if(response)return fulfillJson(route,response.json,response.status??200);
  if(m==='GET'&&path===exportRoot){
   const limit=Number(q.get('document_limit')||50),offset=Number(q.get('document_offset')||0);
   const current=documents.filter(x=>!x.historical),historic=documents.filter(x=>x.historical);
   const currentReview=current.filter(x=>!x.package_ready),missingTypes=['dpa','security','privacy','subprocessor'].filter(
    type=>!current.some(x=>x.document_type===type&&x.status==='active'));
   const evidenceComplete=opts.evidenceComplete??(omitted.length===0);
   const summary={total_documents:documents.length,current_documents:current.length,historical_documents:historic.length,
    active_documents:current.filter(x=>x.status==='active').length,documents_requiring_review:currentReview.length,
    documents_expiring_soon:0,documents_missing_external_reference:current.filter(x=>!x.external_reference_present).length,
    required_document_types:['dpa','security','privacy','subprocessor'],missing_required_document_types:missingTypes,
    total_privacy_requests:grants.privacy_requests?7:null,open_privacy_requests:grants.privacy_requests?2:null,
    open_blocking_privacy_requests:grants.privacy_requests?0:null,overdue_privacy_requests:grants.privacy_requests?1:null,
    total_tenants:grants.tenant_export_evidence?3:null,tenants_with_export_evidence:grants.tenant_export_evidence?2:null,
    tenants_missing_export_evidence:grants.tenant_export_evidence?1:null,
    tenants_with_retention_holds:grants.audit_retention?1:null,tenants_due_for_retention_review:grants.audit_retention?2:null,
    permission_audit_omitted:!grants.permission_audit,permission_evidence_complete:grants.permission_audit,
    permission_attention_required:grants.permission_audit?2:null,users_requiring_permission_review:grants.permission_audit?1:null,
    api_keys_requiring_permission_review:grants.permission_audit?1:null,evidence_complete:evidenceComplete,...opts.summary};
   const pageDocs=documents.slice(offset,offset+limit).map(x=>({...x,
    ...(!docAccess.tenant_identity?{tenant_id:null,tenant_name:null}:{}),
    ...(!docAccess.platform_user_identity?{owner_email:null}:{})}));
   return fulfillJson(route,{feature:'compliance_export_package',phase:18,step:584,generated_at:'2026-11-05T07:00:00Z',
    posture:opts.posture??(missingTypes.length?'compliance_export_blocked':evidenceComplete?'compliance_export_ready':'compliance_export_partial_evidence'),
    evidence_state:evidenceComplete?'complete_for_authorized_sources':'partial_evidence',evidence_complete:evidenceComplete,
    available_sources:available,omitted_sources:omitted,evidence_access:grants,
    required_permissions_by_source:exportSourceGrants,summary,
    document_pagination:{limit,offset,total:documents.length,has_more:offset+limit<documents.length},
    document_evidence_access:docAccess,documents:pageDocs,governance_controls:{read_only:true,application_evidence_only:true,
     does_not_generate_certified_external_compliance_package:true,
     external_reference_presence_does_not_verify_document_content_or_validity:true,
     tenant_export_audit_event_does_not_prove_recipient_delivery_or_external_acceptance:true}});
  }
  return fulfillJson(route,[]);
 });
 await page.goto(`/platform/compliance-export${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Compliance export',exact:true})).toBeVisible();
}
