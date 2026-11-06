/** Batch 76 · isolated synthetic Platform Vendors fixture, Phase 1 GENERATED_UNRUN.
 * Browser-level UI and request shape only: does not attest actual external vendor,
 * contractual/SLA validity, DB transactions, RBAC or audit permanence. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';

export const vendorIdA='70000000-0000-4000-8000-000000000001';
export const vendorIdB='70000000-0000-4000-8000-000000000002';
export const vendorIdArchived='70000000-0000-4000-8000-000000000003';
export const vendorOwnerId='71000000-0000-4000-8000-000000000001';
export const vendorPermissions=[
 'platform.dashboard.read','platform.vendors.read','platform.vendors.write','platform.users.read',
 'platform.dependencies.read','platform.compliance.read','platform.audit.read'
];
const dateOffset=(days:number)=>new Date(Date.now()+days*86400000).toISOString().slice(0,10);
export const vendorCategories=['payment','infrastructure','messaging','integrations','support','security','legal','other'];
export const vendorStatuses=['active','watch','renewal_due','inactive','archived'];
export const vendorMutableStatuses=vendorStatuses.filter(x=>x!=='archived');
export const vendorRisks=['low','medium','high','critical'];
export const activeVendor={
 id:vendorIdA,name:'Fixture Payment Processor',category:'payment',status:'active',risk_level:'critical',
 primary_contact_name:'Ada Fixture',primary_contact_email:'ada@vendor.fixture.test',primary_contact_phone:'+385 0000000',
 website_url:'https://payments.fixture.example',account_reference:'ACC-PAY-001',sla_reference:'SLA-PAY-01',
 contract_start_date:'2020-01-01',contract_renewal_date:dateOffset(365),owner_platform_user_id:vendorOwnerId,
 owner_email:'owner@fixture.test',dependency_notes:'Synthetic payment dependency',internal_notes:'Fixture only',
 archived_at:null,is_archived:false,created_at:'2026-10-01T09:00:00Z',updated_at:'2026-11-03T09:00:00Z',updated_by_email:'reviewer@fixture.test'
};
export const watchVendor={...activeVendor,id:vendorIdB,name:'Fixture Mail Gateway',category:'messaging',status:'watch',risk_level:'high',
 primary_contact_name:null,primary_contact_email:'support@fixture.example',primary_contact_phone:null,
 website_url:null,account_reference:'ACC-MAIL-002',sla_reference:null,
 contract_start_date:'2020-01-01',contract_renewal_date:dateOffset(10),owner_platform_user_id:null,owner_email:null,
 dependency_notes:null,internal_notes:null};
export const archivedVendor={...activeVendor,id:vendorIdArchived,name:'Fixture Retired Service',category:'infrastructure',status:'archived',risk_level:'low',
 website_url:null,contract_renewal_date:null,archived_at:'2026-10-01T08:00:00Z',is_archived:true};
export type FixtureVendor=typeof activeVendor&Record<string,any>;
export function manyVendors(count:number):FixtureVendor[]{return Array.from({length:count},(_,i)=>({...activeVendor,
 id:`${String(i+1).padStart(8,'0')}-0000-4000-8000-${String(i+1).padStart(12,'0')}`,
 name:`Fixture Vendor ${String(i+1).padStart(3,'0')}`}));}
export type VendorFixtureOptions={query?:string;permissions?:string[];rows?:FixtureVendor[];
 access?:{platform_user_identity:boolean};responses?:Record<string,{status?:number;json:any}>;
 respond?:(method:string,path:string,q:URLSearchParams,body:any)=>{status?:number;json:any}|undefined|Promise<{status?:number;json:any}|undefined>;
 onCall?:(method:string,path:string,q:URLSearchParams,body:any)=>void;expectHeading?:boolean};
export async function openVendors(page:Page,opts:VendorFixtureOptions={}){
 targetBaseURL();const permissions=opts.permissions??vendorPermissions;
 let records=(opts.rows??[activeVendor,watchVendor,archivedVendor]).map(r=>({...r}));
 const users=[{id:vendorOwnerId,email:'owner@fixture.test',name:'Fixture Owner',is_active:true},
 {id:'71000000-0000-4000-8000-000000000002',email:'inactive@fixture.test',is_active:false}];
 await page.addInitScript(token=>{
  localStorage.setItem('inventory_platform_access_token',token);
  localStorage.setItem('inventory_locale','en-GB');
 },syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),q=url.searchParams;
  let body:any={};try{body=req.postDataJSON()??{};}catch{body={};}
  opts.onCall?.(method,path,q,body);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Fixture refresh disabled'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'vendors-fixture@fixture.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions});
  const override=(await opts.respond?.(method,path,q,body))??opts.responses?.[`${method} ${path}`];
  if(override)return fulfillJson(route,override.json,override.status??200);
  if(path==='/platform/users'&&method==='GET')return fulfillJson(route,users);
  if(path==='/platform/vendors'&&method==='GET'){
   const limit=Number(q.get('limit')??50),offset=Number(q.get('offset')??0),search=(q.get('search')??'').toLowerCase();
   const hasArchived=q.get('include_archived')==='true';
   const matched=records.filter(r=>(hasArchived||!r.is_archived)
    &&(!q.get('category')||r.category===q.get('category'))
    &&(!q.get('status')||r.status===q.get('status'))
    &&(!q.get('risk_level')||r.risk_level===q.get('risk_level'))
    &&(q.get('renewal_due')!=='true'||Boolean(r.contract_renewal_date&&r.contract_renewal_date<=dateOffset(60)))
    &&(!search||`${r.name} ${r.primary_contact_name||''} ${r.primary_contact_email||''} ${r.account_reference||''} ${r.sla_reference||''} ${r.dependency_notes||''} ${r.internal_notes||''}`.toLowerCase().includes(search)));
   const summary={total:matched.length,archived:matched.filter(r=>r.is_archived).length,
    renewal_due:matched.filter(r=>Boolean(r.contract_renewal_date&&r.contract_renewal_date<=dateOffset(60))).length,
    critical_risk:matched.filter(r=>r.risk_level==='critical').length,high_risk:matched.filter(r=>r.risk_level==='high').length,
    by_category:{},by_status:{},by_risk:{}};
   const identity=opts.access?.platform_user_identity??permissions.includes('platform.users.read');
   const sanitized=matched.slice(offset,offset+limit).map(r=>identity?r:{...r,owner_platform_user_id:null,owner_email:null,updated_by_email:null});
   return fulfillJson(route,{vendors:sanitized,summary,pagination:{limit,offset,total:matched.length,has_more:offset+limit<matched.length},
    evidence_access:{platform_user_identity:identity},evidence_contract:{application_registry_only:true,
     vendor_relationship_not_verified_externally:true,contract_and_sla_references_are_metadata:true,
     risk_and_status_are_internal_operator_classifications:true},categories:vendorCategories,statuses:vendorStatuses,
    mutable_statuses:vendorMutableStatuses,risk_levels:vendorRisks});
  }
  if(path==='/platform/vendors'&&method==='POST'){
   const vendor={...activeVendor,...body,id:'70000000-0000-4000-8000-000000000099',is_archived:false,archived_at:null,
    owner_email:body.owner_platform_user_id?'owner@fixture.test':null};
   records=[vendor,...records];return fulfillJson(route,{vendor},201);
  }
  const matched=path.match(/^\/platform\/vendors\/([^/]+)(?:\/(archive))?$/);
  if(matched){const index=records.findIndex(v=>v.id===matched[1]);if(index<0)return fulfillJson(route,{message:'Fixture vendor not found'},404);
   if(method==='PATCH'&&!matched[2]){
    records[index]={...records[index],...body,owner_email:body.owner_platform_user_id?'owner@fixture.test':null};
    return fulfillJson(route,{vendor:records[index]});
   }
   if(method==='POST'&&matched[2]==='archive'){
    records[index]={...records[index],status:'archived',archived_at:'2026-11-05T09:00:00Z',is_archived:true};
    return fulfillJson(route,{vendor:records[index]});
   }
   if(method==='GET')return fulfillJson(route,records[index]);
  }
  return fulfillJson(route,[]);
 });
 await page.goto(`/platform/vendors${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Vendors',exact:true})).toBeVisible();
}
