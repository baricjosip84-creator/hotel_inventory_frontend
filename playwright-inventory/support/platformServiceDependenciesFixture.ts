/** Batch 77 · synthetic Platform Service Dependencies UI/request fixture.
 * Does not verify external service health, actual check completion, real ACL,
 * backend transaction/audit permanence or vendor acknowledgment. GENERATED_UNRUN. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';

export const dependencyIdA='72000000-0000-4000-8000-000000000001';
export const dependencyIdB='72000000-0000-4000-8000-000000000002';
export const dependencyIdArchived='72000000-0000-4000-8000-000000000003';
export const depVendorId='73000000-0000-4000-8000-000000000001';
export const depOwnerId='74000000-0000-4000-8000-000000000001';
export const dependencyPermissions=[
 'platform.dashboard.read','platform.dependencies.read','platform.dependencies.write','platform.vendors.read',
 'platform.users.read','platform.audit.read','platform.capacity.read'
];
export const depCategories=['payment','email','sms','storage','hosting','monitoring','integration','security','support','other'];
export const depStatuses=['operational','degraded','partial_outage','major_outage','maintenance','unknown','archived'];
export const depMutableStatuses=depStatuses.filter(x=>x!=='archived');
export const depImpacts=['low','medium','high','critical'];
export const criticalDependency={
 id:dependencyIdA,name:'Fixture Card Processing',vendor_id:depVendorId,vendor_name:'Fixture Payment Vendor',category:'payment',
 status:'major_outage',business_impact:'critical',owner_platform_user_id:depOwnerId,owner_email:'dependency-owner@fixture.test',
 owner_present:true,status_page_url:'https://status.fixture.example',escalation_url:'https://escalate.fixture.example',
 check_notes:'Recorded fixture check note',last_checked_at:'2026-11-01T09:00:00Z',
 last_status_change_at:'2026-11-01T09:00:00Z',archived_at:null,is_archived:false,
 created_at:'2026-10-01T09:00:00Z',updated_at:'2026-11-04T09:00:00Z',updated_by_email:'reviewer@fixture.test'
};
export const healthyDependency={...criticalDependency,id:dependencyIdB,name:'Fixture Mail Processing',
 vendor_id:null,vendor_name:null,category:'email',status:'operational',business_impact:'low',owner_platform_user_id:null,
 owner_email:null,owner_present:false,status_page_url:null,escalation_url:null,check_notes:null,last_checked_at:null};
export const archivedDependency={...criticalDependency,id:dependencyIdArchived,name:'Fixture Retired Gateway',status:'archived',
 business_impact:'medium',vendor_id:null,vendor_name:null,archived_at:'2026-10-01T09:00:00Z',is_archived:true};
export type FixtureDependency=typeof criticalDependency&Record<string,any>;
export function manyDependencies(n:number):FixtureDependency[]{return Array.from({length:n},(_,i)=>({...criticalDependency,
 id:`${String(i+1).padStart(8,'0')}-0000-4000-8000-${String(i+1).padStart(12,'0')}`,
 name:`Fixture Dependency ${String(i+1).padStart(3,'0')}`}));}
export type DependencyFixtureOptions={query?:string;permissions?:string[];rows?:FixtureDependency[];
 access?:{vendor_identity:boolean;platform_user_identity:boolean};
 responses?:Record<string,{status?:number;json:any}>;
 respond?:(method:string,path:string,query:URLSearchParams,body:any)=>{status?:number;json:any}|undefined|Promise<{status?:number;json:any}|undefined>;
 onCall?:(method:string,path:string,query:URLSearchParams,body:any)=>void;expectHeading?:boolean};
export async function openDependencies(page:Page,opts:DependencyFixtureOptions={}){
 targetBaseURL();const permissions=opts.permissions??dependencyPermissions;
 let records=(opts.rows??[criticalDependency,healthyDependency,archivedDependency]).map(r=>({...r}));
 const vendors=[{id:depVendorId,name:'Fixture Payment Vendor',status:'active',archived_at:null},
  {id:'73000000-0000-4000-8000-000000000002',name:'Fixture Archived Vendor',status:'archived',archived_at:'2026-01-01T00:00:00Z'}];
 const users=[{id:depOwnerId,email:'dependency-owner@fixture.test',name:'Fixture Owner',is_active:true},
  {id:'74000000-0000-4000-8000-000000000002',email:'inactive-owner@fixture.test',is_active:false}];
 await page.addInitScript(token=>{
  localStorage.setItem('inventory_platform_access_token',token);
  localStorage.setItem('inventory_locale','en-GB');
 },syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),q=url.searchParams;
  let body:any={};try{body=req.postDataJSON()??{};}catch{body={};}
  opts.onCall?.(method,path,q,body);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic refresh unavailable'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'dependencies@fixture.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions});
  const override=(await opts.respond?.(method,path,q,body))??opts.responses?.[`${method} ${path}`];
  if(override)return fulfillJson(route,override.json,override.status??200);
  if(path==='/platform/users'&&method==='GET')return fulfillJson(route,users);
  if(path==='/platform/vendors'&&method==='GET')return fulfillJson(route,{vendors});
  if(path==='/platform/service-dependencies'&&method==='GET'){
   const limit=Number(q.get('limit')??50),offset=Number(q.get('offset')??0),search=(q.get('search')??'').toLowerCase();
   const includeArchived=q.get('include_archived')==='true',access=opts.access??{
    vendor_identity:permissions.includes('platform.vendors.read'),
    platform_user_identity:permissions.includes('platform.users.read')};
   const matched=records.filter(r=>(includeArchived||!r.is_archived)
    &&(!q.get('status')||r.status===q.get('status'))
    &&(!q.get('category')||r.category===q.get('category'))
    &&(!q.get('business_impact')||r.business_impact===q.get('business_impact'))
    &&(!q.get('vendor_id')||r.vendor_id===q.get('vendor_id'))
    &&(q.get('only_attention')!=='true'||['degraded','partial_outage','major_outage','unknown'].includes(r.status))
    &&(!search||`${r.name} ${r.category} ${r.status} ${r.check_notes||''} ${access.vendor_identity?r.vendor_name||'':''}`.toLowerCase().includes(search)));
   const summary={total:matched.length,archived:matched.filter(r=>r.is_archived).length,
    attention:matched.filter(r=>['degraded','partial_outage','major_outage','unknown'].includes(r.status)).length,
    major_outage:matched.filter(r=>r.status==='major_outage').length,
    critical_impact:matched.filter(r=>r.business_impact==='critical').length,
    by_status:{},by_category:{},by_impact:{}};
   const sanitized=matched.slice(offset,offset+limit).map(r=>({
    ...r,...(!access.vendor_identity?{vendor_id:null,vendor_name:null}:{}),
    ...(!access.platform_user_identity?{owner_platform_user_id:null,owner_email:null,updated_by_email:null}:{}),
    owner_present:Boolean(r.owner_platform_user_id)}));
   return fulfillJson(route,{dependencies:sanitized,summary,
    pagination:{limit,offset,total:matched.length,has_more:offset+limit<matched.length},
    evidence_access:access,evidence_contract:{application_registry_only:true,dependency_status_is_operator_recorded:true,
     last_checked_at_is_application_check_metadata:true,external_service_health_not_verified:true,
     vendor_relationship_not_proven:true,historical_check_timestamps_may_include_legacy_registry_edits:true},
    categories:depCategories,statuses:depStatuses,mutable_statuses:depMutableStatuses,impacts:depImpacts});
  }
  if(path==='/platform/service-dependencies'&&method==='POST'){
   const value={...criticalDependency,...body,id:'72000000-0000-4000-8000-000000000099',
    vendor_name:body.vendor_id?'Fixture Payment Vendor':null,owner_email:body.owner_platform_user_id?'dependency-owner@fixture.test':null,
    archived_at:null,is_archived:false,last_checked_at:null};
   records=[value,...records];return fulfillJson(route,{dependency:value},201);
  }
  const m=path.match(/^\/platform\/service-dependencies\/([^/]+)(?:\/(archive|check))?$/);
  if(m){const at=records.findIndex(r=>r.id===m[1]);if(at<0)return fulfillJson(route,{message:'Dependency fixture missing'},404);
   if(method==='PATCH'&&!m[2]){
    records[at]={...records[at],...body};return fulfillJson(route,{dependency:records[at]});
   }
   if(method==='POST'&&m[2]==='check'){
    records[at]={...records[at],last_checked_at:'2026-11-05T09:00:00Z'};
    return fulfillJson(route,{dependency:records[at]});
   }
   if(method==='POST'&&m[2]==='archive'){
    records[at]={...records[at],archived_at:'2026-11-05T09:00:00Z',status:'archived',is_archived:true};
    return fulfillJson(route,{dependency:records[at]});
   }
   if(method==='GET')return fulfillJson(route,records[at]);
  }
  return fulfillJson(route,[]);
 });
 await page.goto(`/platform/service-dependencies${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Service dependencies',exact:true})).toBeVisible();
}
