/** Batch 89 — synthetic Platform Incidents browser fixture (GENERATED_UNRUN).
 * HTTP interceptions exercise page plumbing only: they are NOT evidence of external
 * recovery, verified tenant public-feed isolation, real SQL transactions or audit durability. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
export const incidentsRoot='/platform/incidents';
export const incidentTenantA='d8900000-0000-4000-8000-000000000001';
export const incidentTenantB='d8900000-0000-4000-8000-000000000002';
export const incidentActor='d8900000-0000-4000-8000-000000000003';
export const incidentPermissions=['platform.dashboard.read','platform.incidents.read','platform.incidents.write',
 'platform.tenants.read','platform.users.read','platform.audit.read','platform.maintenance.read',
 'platform.announcements.read','platform.jobs.read','platform.sla.read','platform.support_sessions.read'];
export const ongoingIncident={id:'d8900000-0000-4000-8000-000000000011',title:'Fixture regional connectivity',
 summary:'Internal fixture diagnostic summary',status:'investigating',severity:'major',impact:'degraded',scope:'platform',
 tenant_id:null,tenant_name:null,tenant_present:false,started_at:'2026-10-30T08:00:00Z',resolved_at:null,
 public_message:'Connectivity may be degraded',internal_notes:'Fixture internal evidence',
 created_by_platform_user_id:incidentActor,created_by_email:'actor@fixture.test',created_by_present:true,
 resolved_by_platform_user_id:null,resolved_by_email:null,resolved_by_present:false,update_count:1,
 last_update_at:'2026-10-30T08:10:00Z',is_open:true,
 updates:[{id:'d8900000-0000-4000-8000-000000000051',status:'investigating',message:'Private operator note',
  is_public:false,created_at:'2026-10-30T08:10:00Z',created_by_platform_user_id:incidentActor,
  created_by_email:'actor@fixture.test',created_by_present:true}]};
export const tenantIncident={...ongoingIncident,id:'d8900000-0000-4000-8000-000000000012',title:'Fixture tenant payment outage',
 status:'identified',severity:'critical',impact:'partial_outage',scope:'tenant',tenant_id:incidentTenantA,
 tenant_name:'Fixture Incidents Alpha',tenant_present:true,public_message:'Payment service impacted',
 summary:'Tenant operator-only summary',internal_notes:'Tenant operator-only notes',started_at:'2026-10-30T07:00:00Z'};
export const monitoringIncident={...ongoingIncident,id:'d8900000-0000-4000-8000-000000000013',title:'Fixture monitoring recovery',
 status:'monitoring',severity:'minor',impact:'none',started_at:'2026-10-30T06:00:00Z',updates:[],update_count:0,last_update_at:null};
export const resolvedIncident={...ongoingIncident,id:'d8900000-0000-4000-8000-000000000014',title:'Fixture resolved history',
 status:'resolved',severity:'minor',impact:'none',started_at:'2026-10-20T08:00:00Z',resolved_at:'2026-10-21T08:00:00Z',
 resolved_by_platform_user_id:incidentActor,resolved_by_email:'actor@fixture.test',resolved_by_present:true,is_open:false};
export type IncidentFixtureRecord=Record<string,any>;
export const manyIncidentRecords=(n:number):IncidentFixtureRecord[]=>Array.from({length:n},(_,i)=>({...ongoingIncident,
 id:`${String(i+1).padStart(8,'0')}-0000-4000-8000-${String(i+500).padStart(12,'0')}`,
 title:`Synthetic incident ${String(i+1).padStart(3,'0')}`,summary:`Incident fixture ${i+1}`,updates:[]}));
export type IncidentsFixtureOptions={query?:string;permissions?:string[];records?:IncidentFixtureRecord[];
 expectHeading?:boolean;onCall?:(method:string,path:string,query:URLSearchParams,body:any)=>void;
 overrides?:Record<string,{status?:number;json:any}>;
 respond?:(method:string,path:string,query:URLSearchParams,body:any)=>Promise<{status?:number;json:any}|undefined>|{status?:number;json:any}|undefined};
export async function openPlatformIncidents(page:Page,opts:IncidentsFixtureOptions={}){
 targetBaseURL();const perms=opts.permissions??incidentPermissions;const can=(p:string)=>perms.includes(p);
 let records:IncidentFixtureRecord[]=(opts.records??[ongoingIncident,tenantIncident,monitoringIncident,resolvedIncident]).map(r=>({...r,updates:[...(r.updates||[])]}));
 const identity=()=>({tenant_identity:can('platform.tenants.read'),platform_user_identity:can('platform.users.read')});
 const toView=(r:IncidentFixtureRecord)=>({...r,tenant_name:can('platform.tenants.read')?r.tenant_name:null,
   created_by_email:can('platform.users.read')?r.created_by_email:null,
   resolved_by_email:can('platform.users.read')?r.resolved_by_email:null,
   updates:(r.updates||[]).map((u:any)=>({...u,created_by_email:can('platform.users.read')?u.created_by_email:null})),
   evidence_access:identity()});
 const accessInfo=()=>{const a=identity();return {available_sources:['incident_registry','incident_updates',...(a.tenant_identity?['tenant_registry']:[]),...(a.platform_user_identity?['platform_user_identity']:[])],
  omitted_sources:[...(a.tenant_identity?[]:['tenant_registry']),...(a.platform_user_identity?[]:['platform_user_identity'])],
  evidence_access:a,evidence_complete:a.tenant_identity&&a.platform_user_identity,
  evidence_contract:{application_incident_records_only:true,lifecycle_state_is_operator_recorded_application_evidence:true,
   resolved_status_does_not_prove_external_service_recovery_or_customer_acceptance:true,
   public_title_and_public_message_are_tenant_visible_while_open:true,
   internal_summary_and_internal_notes_are_never_returned_by_tenant_incident_context:true,
   incident_update_is_tenant_visible_only_when_explicitly_marked_public:true,
   incident_state_does_not_replace_external_monitoring_or_root_cause_evidence:true},generated_at:'2026-11-05T08:00:00Z'};};
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),q=url.searchParams,m=req.method();
  let body:any={};try{body=req.postDataJSON()??{};}catch{body={};}opts.onCall?.(m,path,q,body);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic refresh refused'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'incidents@fixture.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions:perms});
  const override=(await opts.respond?.(m,path,q,body))??opts.overrides?.[`${m} ${path}`];
  if(override)return fulfillJson(route,override.json,override.status??200);
  if(m==='GET'&&path==='/platform/tenants')return fulfillJson(route,[
   {id:incidentTenantA,name:'Fixture Incidents Alpha',status:'active'},
   {id:incidentTenantB,name:'Fixture Incidents Beta',status:'active'}]);
  if(m==='GET'&&path===incidentsRoot){
   const status=q.get('status'),severity=q.get('severity'),scope=q.get('scope'),tenant=q.get('tenant_id'),
    include=q.get('include_resolved')==='true',search=(q.get('search')||'').toLowerCase(),limit=Number(q.get('limit')||50),offset=Number(q.get('offset')||0);
   const filtered=records.filter(r=>(include||!['resolved','cancelled'].includes(r.status))&&(!status||r.status===status)&&
    (!severity||r.severity===severity)&&(!scope||r.scope===scope)&&(!tenant||r.tenant_id===tenant)&&
    (!search||[r.title,r.summary,r.public_message,r.internal_notes,...(can('platform.tenants.read')?[r.tenant_name]:[])].join(' ').toLowerCase().includes(search)));
   const count=(fn:(r:IncidentFixtureRecord)=>boolean)=>filtered.filter(fn).length;
   const open=(r:IncidentFixtureRecord)=>!['resolved','cancelled'].includes(r.status);
   return fulfillJson(route,{records:filtered.slice(offset,offset+limit).map(toView),summary:{total:filtered.length,
    open:count(open),critical_open:count(r=>open(r)&&r.severity==='critical'),
    platform_open:count(r=>open(r)&&r.scope==='platform'),tenant_open:count(r=>open(r)&&r.scope==='tenant'),
    resolved:count(r=>r.status==='resolved'),cancelled:count(r=>r.status==='cancelled')},
    pagination:{limit,offset,total:filtered.length,has_more:offset+limit<filtered.length},...accessInfo()});
  }
  if(m==='POST'&&path===incidentsRoot){
   const created={...ongoingIncident,...body,id:'d8900000-0000-4000-8000-000000000099',status:'investigating',
    title:body.title,tenant_name:body.tenant_id?'Fixture Incidents Alpha':null,tenant_present:Boolean(body.tenant_id),
    update_count:body.initial_update?1:0,updates:body.initial_update?[{id:'d8900000-0000-4000-8000-000000000098',
     status:'investigating',message:body.initial_update,is_public:body.initial_update_public,created_at:'2026-11-05T08:00:00Z'}]:[]};
   records.unshift(created);return fulfillJson(route,toView(created),201);
  }
  const match=path.match(/^\/platform\/incidents\/([^/]+)(?:\/(updates|cancel))?$/);
  if(match){const idx=records.findIndex(r=>r.id===match[1]);if(idx<0)return fulfillJson(route,{message:'Incident unavailable'},404);
   if(m==='GET'&&!match[2])return fulfillJson(route,toView(records[idx]));
   if(m==='PATCH'&&!match[2]){
    if(['resolved','cancelled'].includes(records[idx].status))return fulfillJson(route,{message:'Terminal incident is immutable'},409);
    records[idx]={...records[idx],...body};return fulfillJson(route,toView(records[idx]));
   }
   if(m==='POST'&&match[2]==='updates'){
    if(['resolved','cancelled'].includes(records[idx].status))return fulfillJson(route,{message:'Terminal incident'},409);
    const update={id:'d8900000-0000-4000-8000-000000000097',status:body.status,message:body.message,is_public:body.is_public,
      created_at:'2026-11-05T08:00:00Z',created_by_email:'actor@fixture.test',created_by_present:true};
    records[idx]={...records[idx],status:body.status,updates:[...(records[idx].updates||[]),update],update_count:(records[idx].update_count||0)+1,
      last_update_at:update.created_at,...(body.status==='resolved'?{resolved_at:update.created_at,resolved_by_email:'actor@fixture.test',resolved_by_present:true,is_open:false}:{})};
    return fulfillJson(route,toView(records[idx]));
   }
   if(m==='POST'&&match[2]==='cancel'){
    records[idx]={...records[idx],status:'cancelled',is_open:false,
     updates:[...(records[idx].updates||[]),{id:'d8900000-0000-4000-8000-000000000096',status:'cancelled',message:body.reason,is_public:false,created_at:'2026-11-05T08:00:00Z'}]};
    return fulfillJson(route,toView(records[idx]));
   }
  }
  return fulfillJson(route,[]);
 });
 await page.goto(`${incidentsRoot}${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Incidents',exact:true})).toBeVisible();
}
