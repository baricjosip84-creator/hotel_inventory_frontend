/** Batch 91 — source-traced, synthetic Platform Announcements HTTP fixture.
 * NO browser tests compiled/run. Mock publication is NOT evidence of real delivery,
 * acknowledgements, database durability, external communication or two-tenant access. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
export const announcementRoot='/platform/announcements';
export const announcementTenantA='f9100000-0000-4000-8000-000000000001';
export const announcementTenantB='f9100000-0000-4000-8000-000000000002';
export const announcementActor='f9100000-0000-4000-8000-000000000003';
export const announcementPermissions=['platform.dashboard.read','platform.announcements.read','platform.announcements.write',
 'platform.tenants.read','platform.users.read','platform.maintenance.read','platform.incidents.read','platform.audit.read'];
export const draftAnnouncement={id:'f9100000-0000-4000-8000-000000000011',title:'Fixture audience draft',
 message:'Fixture draft has not been published',audience:'all',tenant_id:null,tenant_name:null,tenant_status:null,
 tenant_present:false,severity:'info',status:'draft',starts_at:'2026-01-01T09:00:00Z',ends_at:null,dismissible:true,
 created_by_platform_user_id:announcementActor,created_by_email:'publisher@fixture.test',created_by_present:true,
 published_by_platform_user_id:null,published_by_email:null,published_by_present:false,
 cancelled_by_platform_user_id:null,cancelled_by_email:null,cancelled_by_present:false,
 published_at:null,cancelled_at:null,cancellation_reason:null,is_current:false};
export const publishedAnnouncement={...draftAnnouncement,id:'f9100000-0000-4000-8000-000000000012',
 title:'Fixture published service notice',message:'Service message visible in app context',status:'published',severity:'warning',
 audience:'platform',starts_at:'2026-01-01T09:00:00Z',ends_at:'2032-01-01T09:00:00Z',
 published_by_platform_user_id:announcementActor,published_by_email:'publisher@fixture.test',published_by_present:true,
 published_at:'2026-01-01T09:00:00Z',is_current:true};
export const tenantAnnouncement={...publishedAnnouncement,id:'f9100000-0000-4000-8000-000000000013',
 title:'Fixture tenant-critical notice',audience:'tenant',tenant_id:announcementTenantA,tenant_name:'Announcements Alpha',tenant_status:'active',tenant_present:true,
 severity:'critical',message:'Tenant-only application notice'};
export const expiredAnnouncement={...publishedAnnouncement,id:'f9100000-0000-4000-8000-000000000014',
 title:'Fixture expired application notice',status:'expired',ends_at:'2026-03-01T00:00:00Z',is_current:false};
export const cancelledAnnouncement={...publishedAnnouncement,id:'f9100000-0000-4000-8000-000000000015',
 title:'Fixture cancelled application notice',status:'cancelled',is_current:false,
 cancelled_by_platform_user_id:announcementActor,cancelled_by_email:'publisher@fixture.test',cancelled_by_present:true,
 cancelled_at:'2026-05-01T00:00:00Z',cancellation_reason:'Synthetic cancellation note'};
export type AnnouncementRecord=Record<string,any>;
export const manyAnnouncements=(n:number):AnnouncementRecord[]=>Array.from({length:n},(_,i)=>({...draftAnnouncement,
 id:`${String(i+1).padStart(8,'0')}-0000-4000-8000-${String(i+900).padStart(12,'0')}`,
 title:`Fixture notice ${String(i+1).padStart(3,'0')}`,message:`Synthetic announcement ${i+1}`}));
export type AnnouncementFixtureOptions={query?:string;permissions?:string[];records?:AnnouncementRecord[];expectHeading?:boolean;
 onCall?:(method:string,path:string,query:URLSearchParams,body:any)=>void;
 overrides?:Record<string,{status?:number;json:any}>;
 respond?:(method:string,path:string,query:URLSearchParams,body:any)=>Promise<{status?:number;json:any}|undefined>|{status?:number;json:any}|undefined};
export async function openPlatformAnnouncements(page:Page,opts:AnnouncementFixtureOptions={}){
 targetBaseURL();const perms=opts.permissions??announcementPermissions;const can=(permission:string)=>perms.includes(permission);
 let records:AnnouncementRecord[]=(opts.records??[draftAnnouncement,publishedAnnouncement,tenantAnnouncement,expiredAnnouncement,cancelledAnnouncement]).map(r=>({...r}));
 const identity=()=>({tenant_identity:can('platform.tenants.read'),platform_user_identity:can('platform.users.read')});
 const view=(r:AnnouncementRecord)=>({...r,tenant_id:can('platform.tenants.read')?r.tenant_id:null,
  tenant_name:can('platform.tenants.read')?r.tenant_name:null,tenant_status:can('platform.tenants.read')?r.tenant_status:null,
  created_by_platform_user_id:can('platform.users.read')?r.created_by_platform_user_id:null,
  created_by_email:can('platform.users.read')?r.created_by_email:null,
  published_by_platform_user_id:can('platform.users.read')?r.published_by_platform_user_id:null,
  published_by_email:can('platform.users.read')?r.published_by_email:null,
  cancelled_by_platform_user_id:can('platform.users.read')?r.cancelled_by_platform_user_id:null,
  cancelled_by_email:can('platform.users.read')?r.cancelled_by_email:null});
 const info=()=>{const a=identity();return {available_sources:['announcement_registry',...(a.tenant_identity?['tenant_registry']:[]),...(a.platform_user_identity?['platform_user_identity']:[])],
  omitted_sources:[...(a.tenant_identity?[]:['tenant_registry']),...(a.platform_user_identity?[]:['platform_user_identity'])],
  evidence_access:a,evidence_complete:a.tenant_identity&&a.platform_user_identity,
  evidence_contract:{application_announcement_records_only:true,effective_expiry_is_derived_from_the_application_time_window:true,
   published_state_means_available_to_the_matching_application_context_during_its_time_window:true,
   publication_does_not_prove_browser_delivery_or_customer_receipt:true,
   dismissible_is_a_client_display_control_not_acknowledgement_evidence:true,
   platform_and_tenant_contexts_expose_only_current_audience_appropriate_message_fields:true},generated_at:'2026-11-05T08:00:00Z'};};
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),q=url.searchParams,m=req.method();
  let body:any={};try{body=req.postDataJSON()??{};}catch{body={};}
  opts.onCall?.(m,path,q,body);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic refresh refused'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'publisher@fixture.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions:perms});
  const override=(await opts.respond?.(m,path,q,body))??opts.overrides?.[`${m} ${path}`];
  if(override)return fulfillJson(route,override.json,override.status??200);
  if(m==='GET'&&path==='/platform/tenants')return fulfillJson(route,[
   {id:announcementTenantA,name:'Announcements Alpha',status:'active'},
   {id:announcementTenantB,name:'Announcements Archived',status:'archived'}]);
  if(m==='GET'&&path===announcementRoot){
   const status=q.get('status'),audience=q.get('audience'),tenant=q.get('tenant_id'),include=q.get('include_expired')==='true',
    search=(q.get('search')||'').trim().toLowerCase(),limit=Number(q.get('limit')||50),offset=Number(q.get('offset')||0);
   const found=records.filter(r=>(include||!['expired','cancelled'].includes(r.status))&&(!status||r.status===status)&&
     (!audience||r.audience===audience)&&(!tenant||r.tenant_id===tenant)&&
     (!search||[r.title,r.message,r.cancellation_reason,...(can('platform.tenants.read')?[r.tenant_name]:[])].join(' ').toLowerCase().includes(search)));
   const count=(fn:(r:AnnouncementRecord)=>boolean)=>found.filter(fn).length;
   const current=(r:AnnouncementRecord)=>r.status==='published'&&r.is_current;
   const summary={total:found.length,draft:count(r=>r.status==='draft'),published:count(r=>r.status==='published'),
    expired:count(r=>r.status==='expired'),cancelled:count(r=>r.status==='cancelled'),current:count(current),
    current_tenant_visible:count(r=>current(r)&&['all','tenant'].includes(r.audience)),
    current_platform_visible:count(r=>current(r)&&['all','platform'].includes(r.audience)),
    critical_current:count(r=>current(r)&&r.severity==='critical'),tenant_specific:count(r=>r.audience==='tenant')};
   return fulfillJson(route,{announcements:found.slice(offset,offset+limit).map(view),summary,
    pagination:{limit,offset,total:found.length,has_more:offset+limit<found.length},...info()});
  }
  if(m==='POST'&&path===announcementRoot){const created={...draftAnnouncement,...body,
    id:'f9100000-0000-4000-8000-000000000099',status:'draft',is_current:false,
    tenant_name:body.tenant_id?'Announcements Alpha':null,tenant_present:Boolean(body.tenant_id)};
   records.unshift(created);return fulfillJson(route,view(created),201);}
  const match=path.match(/^\/platform\/announcements\/([^/]+)(?:\/(publish|cancel))?$/);
  if(match){const idx=records.findIndex(r=>r.id===match[1]);if(idx<0)return fulfillJson(route,{message:'Announcement not found'},404);
   const r=records[idx];
   if(m==='PATCH'&&!match[2]){if(r.status==='cancelled')return fulfillJson(route,{message:'Cancelled announcements are immutable'},409);
    records[idx]={...r,...body};return fulfillJson(route,view(records[idx]));}
   if(m==='POST'&&match[2]==='publish'){if(!['draft','expired'].includes(r.status))return fulfillJson(route,{message:'Already published or cancelled'},409);
    records[idx]={...r,status:'published',is_current:true,published_at:'2026-11-05T08:00:00Z',
     published_by_platform_user_id:announcementActor,published_by_email:'publisher@fixture.test',published_by_present:true};
    return fulfillJson(route,view(records[idx]));}
   if(m==='POST'&&match[2]==='cancel'){if(r.status==='cancelled')return fulfillJson(route,{message:'Already cancelled'},409);
    records[idx]={...r,status:'cancelled',is_current:false,cancellation_reason:body.reason,
     cancelled_at:'2026-11-05T08:00:00Z',cancelled_by_platform_user_id:announcementActor,
     cancelled_by_email:'publisher@fixture.test',cancelled_by_present:true};
    return fulfillJson(route,view(records[idx]));}
  }
  return fulfillJson(route,[]);
 });
 await page.goto(`${announcementRoot}${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Announcements',exact:true})).toBeVisible();
}
