/** Batch 84: source-traced synthetic Compliance Documents registry fixture (PHASE_1_GENERATED_UNRUN).
 * Mock transport does not establish real PostgreSQL durability, permissions, compliance validity, external URLs or customer acceptance. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';

export const complianceRoot='/platform/compliance-documents';
export const docId='b8400000-0000-4000-8000-000000000001';
export const secondaryId='b8400000-0000-4000-8000-000000000002';
export const archiveId='b8400000-0000-4000-8000-000000000003';
export const tenantId='b8500000-0000-4000-8000-000000000001';
export const ownerId='b8600000-0000-4000-8000-000000000001';
export const docPermissions=['platform.dashboard.read','platform.compliance.read','platform.compliance.write','platform.tenants.read',
 'platform.users.read','platform.privacy.read','platform.access_reviews.read','platform.audit.read'];
export const documentTypes=['contract','dpa','security','privacy','subprocessor','sla','billing','policy','other'];
export const documentStatuses=['draft','active','needs_review','expired','archived'];
export const reviewStatuses=['active','needs_review','expired'];
export const fixtureDoc={id:docId,title:'Fixture DPA Agreement',document_type:'dpa',status:'draft',tenant_id:tenantId,
 tenant_name:'Fixture Tenant Alpha',tenant_present:true,owner_platform_user_id:ownerId,owner_email:'fixture-owner@example.test',owner_present:true,
 reviewed_by_platform_user_id:null,reviewed_by_email:null,reviewer_present:false,created_by_platform_user_id:ownerId,
 created_by_email:'fixture-owner@example.test',creator_present:true,external_url:'https://example.test/documents/dpa',
 notes:'Internal DPA record',effective_at:'2026-10-01T00:00:00.000Z',expires_at:'2035-10-01T00:00:00.000Z',
 reviewed_at:null,created_at:'2026-10-03T09:00:00.000Z',updated_at:'2026-10-04T09:00:00.000Z'};
export const activeDoc={...fixtureDoc,id:secondaryId,title:'Fixture Security Policy',document_type:'security',status:'active',external_url:null,
 notes:'Security evidence record',tenant_id:null,tenant_name:null,tenant_present:false,owner_platform_user_id:null,owner_email:null,owner_present:false};
export const archivedDoc={...fixtureDoc,id:archiveId,title:'Fixture Archived Contract',document_type:'contract',status:'archived',notes:'Historical snapshot'};
export type FixtureDocument=typeof fixtureDoc&Record<string,any>;
export const manyDocuments=(n:number):FixtureDocument[]=>Array.from({length:n},(_,i)=>({...fixtureDoc,
 id:`${String(i+1).padStart(8,'0')}-0000-4000-8000-${String(i+1).padStart(12,'0')}`,
 title:`Fixture Document ${String(i+1).padStart(3,'0')}`}));
export type DocumentFixtureOptions={query?:string;permissions?:string[];records?:FixtureDocument[];expectHeading?:boolean;
 overrides?:Record<string,{status?:number;json:any}>;
 respond?:(method:string,path:string,q:URLSearchParams,body:any)=>{status?:number;json:any}|undefined|Promise<{status?:number;json:any}|undefined>;
 onCall?:(method:string,path:string,q:URLSearchParams,body:any)=>void;};

export async function openComplianceDocuments(page:Page,opts:DocumentFixtureOptions={}){
 targetBaseURL();const permissions=opts.permissions??docPermissions;
 const canTenants=permissions.includes('platform.tenants.read'),canUsers=permissions.includes('platform.users.read');
 let records:FixtureDocument[]=(opts.records??[fixtureDoc,activeDoc,archivedDoc]).map(r=>({...r}));
 const withAccess=(r:FixtureDocument):FixtureDocument=>({...r,
  tenant_present:Boolean(r.tenant_id||r.tenant_present),owner_present:Boolean(r.owner_platform_user_id||r.owner_present),
  reviewer_present:Boolean(r.reviewed_by_platform_user_id||r.reviewer_present),creator_present:Boolean(r.created_by_platform_user_id||r.creator_present),
  ...(!canTenants?{tenant_id:null,tenant_name:null}:{}),...(!canUsers?{owner_platform_user_id:null,owner_email:null,
    reviewed_by_platform_user_id:null,reviewed_by_email:null,created_by_platform_user_id:null,created_by_email:null}:{})});
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),q=url.searchParams,m=req.method();
  let body:any={};try{body=req.postDataJSON()??{};}catch{body={};}
  opts.onCall?.(m,path,q,body);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic session refresh forbidden'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'compliance-operator@example.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions});
  const override=(await opts.respond?.(m,path,q,body))??opts.overrides?.[`${m} ${path}`];
  if(override)return fulfillJson(route,override.json,override.status??200);
  if(m==='GET'&&path==='/platform/tenants')return fulfillJson(route,[{id:tenantId,name:'Fixture Tenant Alpha'}]);
  if(m==='GET'&&path==='/platform/users')return fulfillJson(route,[{id:ownerId,email:'fixture-owner@example.test',is_active:true},
    {id:'b8600000-0000-4000-8000-000000000002',email:'disabled@example.test',is_active:false}]);
  if(m==='GET'&&path===complianceRoot){
   const term=(q.get('search')||'').trim().toLowerCase(),status=q.get('status')||'',type=q.get('document_type')||'',
    tenant=q.get('tenant_id')||'',expiring=q.get('expiring')==='true',limit=Number(q.get('limit')||50),offset=Number(q.get('offset')||0);
   const now=Date.now(),within45=now+45*86400000;
   const matched=records.filter(r=>(!status||r.status===status)&&(!type||r.document_type===type)&&(!tenant||r.tenant_id===tenant)
    &&(!term||`${r.title} ${r.notes||''}`.toLowerCase().includes(term))&&(!expiring||(r.status!=='archived'&&Boolean(r.expires_at)&&new Date(r.expires_at).getTime()>=now&&new Date(r.expires_at).getTime()<=within45)));
   const byType:Record<string,number>={},byStatus:Record<string,number>={};for(const r of matched){byType[r.document_type]=(byType[r.document_type]||0)+1;byStatus[r.status]=(byStatus[r.status]||0)+1;}
   const summary={total:matched.length,draft:byStatus.draft||0,active:byStatus.active||0,needs_review:byStatus.needs_review||0,
    archived:byStatus.archived||0,expired_or_overdue:matched.filter(r=>r.status==='expired'||(r.status!=='archived'&&r.expires_at&&new Date(r.expires_at).getTime()<now)).length,
    expiring_soon:matched.filter(r=>r.status!=='archived'&&r.expires_at&&new Date(r.expires_at).getTime()>=now&&new Date(r.expires_at).getTime()<=within45).length,
    missing_external_reference:matched.filter(r=>!r.external_url).length,by_type:byType,by_status:byStatus};
   return fulfillJson(route,{documents:matched.slice(offset,offset+limit).map(withAccess),summary,pagination:{limit,offset,total:matched.length,
    has_more:offset+limit<matched.length},evidence_access:{tenant_identity:canTenants,platform_user_identity:canUsers},
    evidence_contract:{application_registry_only:true,external_url_is_reference_not_content_verification:true,
     reviewed_at_is_application_review_action_only:true,active_status_does_not_prove_external_document_validity_or_acceptance:true,
     expiration_posture_is_derived_from_recorded_dates:true},document_types:documentTypes,statuses:documentStatuses,review_statuses:reviewStatuses});
  }
  if(m==='POST'&&path===complianceRoot){const created={...fixtureDoc,...body,id:'b8400000-0000-4000-8000-000000000099',status:'draft',
   tenant_name:body.tenant_id?'Fixture Tenant Alpha':null,owner_email:body.owner_platform_user_id?'fixture-owner@example.test':null,
   reviewed_at:null,reviewed_by_email:null};records=[created,...records];return fulfillJson(route,withAccess(created),201);}
  const target=path.match(/^\/platform\/compliance-documents\/([^/]+)(?:\/(review|archive))?$/);
  if(target){const i=records.findIndex(r=>r.id===target[1]);if(i<0)return fulfillJson(route,{message:'Not found'},404);
   if(m==='GET')return fulfillJson(route,withAccess(records[i]));
   if(records[i].status==='archived')return fulfillJson(route,{message:'Archived records are immutable'},409);
   if(m==='PATCH'&&!target[2])records[i]={...records[i],...body};
   else if(m==='POST'&&target[2]==='review')records[i]={...records[i],status:body.status||'active',reviewed_at:new Date().toISOString(),
    reviewed_by_platform_user_id:ownerId,reviewed_by_email:'fixture-owner@example.test'};
   else if(m==='POST'&&target[2]==='archive')records[i]={...records[i],status:'archived'};
   else return fulfillJson(route,{message:'Unexpected fixture method'},405);
   return fulfillJson(route,withAccess(records[i]));
  }
  return fulfillJson(route,[]);
 });
 await page.goto(`/platform/compliance-documents${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Compliance documents',exact:true})).toBeVisible();
}
