/** Batch 81 — source-traced Platform Releases synthetic fixture, GENERATED_UNRUN.
 * Mocked application lifecycle states are NOT evidence of any external deployment, rollback, audit transaction, or tenant security. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';

export const releaseId='f1000000-0000-4000-8000-000000000001';
export const progressId='f1000000-0000-4000-8000-000000000002';
export const deployedId='f1000000-0000-4000-8000-000000000003';
export const rolledId='f1000000-0000-4000-8000-000000000004';
export const changeId='f2000000-0000-4000-8000-000000000001';
export const windowId='f3000000-0000-4000-8000-000000000001';
export const releaseOwnerId='f4000000-0000-4000-8000-000000000001';
export const releasePermissions=['platform.dashboard.read','platform.releases.read','platform.releases.write','platform.users.read',
 'platform.changes.read','platform.maintenance.read','platform.jobs.read','platform.audit.read'];
export const releaseTypes=['major','minor','patch','hotfix','maintenance'];
export const releaseStatuses=['planned','in_progress','deployed','rolled_back','cancelled'];
export const releaseEnvironments=['development','staging','production'];
export const releaseImpacts=['none','low','medium','high'];
export const plannedRelease={id:releaseId,version:'v81.1.0',title:'Fixture Scheduled Rollout',release_type:'minor',status:'planned',environment:'production',
 planned_at:'2035-01-01T12:00:00Z',deployed_at:null,rolled_back_at:null,owner_platform_user_id:releaseOwnerId,owner_email:'release-owner@fixture.test',owner_present:true,
 change_request_id:changeId,change_request_title:'Fixture Approved Change',change_request_status:'approved',change_request_present:true,
 maintenance_window_id:windowId,maintenance_window_title:'Fixture Scheduled Window',maintenance_window_status:'scheduled',maintenance_window_present:true,
 summary:'Recorded synthetic release plan',tenant_impact:'medium',requires_maintenance:true,rollback_plan:'Restore previous image',release_notes:'Synthetic release notes',
 created_at:'2026-11-04T10:00:00Z',updated_at:'2026-11-04T11:00:00Z',created_by_email:'release-admin@fixture.test',updated_by_email:'release-admin@fixture.test'};
export const inProgressRelease={...plannedRelease,id:progressId,version:'v81.0.9',title:'Fixture In Progress',status:'in_progress',release_type:'hotfix',
 planned_at:'2036-01-01T12:00:00Z',maintenance_window_id:null,maintenance_window_title:null,maintenance_window_present:false,requires_maintenance:false};
export const deployedRelease={...plannedRelease,id:deployedId,version:'v81.0.8',title:'Fixture Recorded Deployment',status:'deployed',
 deployed_at:'2026-11-03T12:00:00Z',planned_at:'2026-11-03T10:00:00Z'};
export const rolledRelease={...plannedRelease,id:rolledId,version:'v81.0.7',title:'Fixture Recorded Rollback',status:'rolled_back',
 deployed_at:'2026-11-02T12:00:00Z',rolled_back_at:'2026-11-02T14:00:00Z',planned_at:'2026-11-02T10:00:00Z'};
export type FixtureRelease=typeof plannedRelease&Record<string,any>;
export const manyReleases=(n:number):FixtureRelease[]=>Array.from({length:n},(_,i)=>({...plannedRelease,
 id:`${String(i+1).padStart(8,'0')}-0000-4000-8000-${String(i+1).padStart(12,'0')}`,
 version:`v81.${String(i+1).padStart(3,'0')}`,title:`Fixture Release ${String(i+1).padStart(3,'0')}`}));
export type ReleasesOptions={query?:string;permissions?:string[];rows?:FixtureRelease[];
 responses?:Record<string,{status?:number;json:any}>;
 respond?:(method:string,path:string,q:URLSearchParams,body:any)=>{status?:number;json:any}|undefined|Promise<{status?:number;json:any}|undefined>;
 onCall?:(method:string,path:string,q:URLSearchParams,body:any)=>void;expectHeading?:boolean};
export async function openReleases(page:Page,opts:ReleasesOptions={}){
 targetBaseURL();const permissions=opts.permissions??releasePermissions;
 let records=(opts.rows??[plannedRelease,inProgressRelease,deployedRelease,rolledRelease]).map(r=>({...r}));
 const access={platform_user_identity:permissions.includes('platform.users.read'),change_reference:permissions.includes('platform.changes.read'),maintenance_reference:permissions.includes('platform.maintenance.read')};
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const u=new URL(req.url()),path=u.pathname.replace(/^\/api(?=\/)/,''),q=u.searchParams,method=req.method();
  let body:any={};try{body=req.postDataJSON()??{};}catch{body={};}
  opts.onCall?.(method,path,q,body);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic refresh unavailable'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'releases@fixture.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions});
  const override=(await opts.respond?.(method,path,q,body))??opts.responses?.[`${method} ${path}`];
  if(override)return fulfillJson(route,override.json,override.status??200);
  if(method==='GET'&&path==='/platform/users')return fulfillJson(route,[{id:releaseOwnerId,email:'release-owner@fixture.test',is_active:true},
   {id:'f4000000-0000-4000-8000-000000000002',email:'inactive@fixture.test',is_active:false}]);
  if(method==='GET'&&path==='/platform/change-management')return fulfillJson(route,{change_requests:[{id:changeId,title:'Fixture Approved Change',status:'approved'},
   {id:'f2000000-0000-4000-8000-000000000002',title:'Fixture Rejected Change',status:'rejected'}]});
  if(method==='GET'&&path==='/platform/maintenance')return fulfillJson(route,{windows:[{id:windowId,title:'Fixture Scheduled Window',status:'scheduled'},
   {id:'f3000000-0000-4000-8000-000000000002',title:'Fixture Cancelled Window',status:'cancelled'}]});
  if(method==='GET'&&path==='/platform/releases'){
   const limit=Number(q.get('limit')||50),offset=Number(q.get('offset')||0),term=(q.get('search')||'').toLowerCase();
   const matched=records.filter(r=>(!q.get('status')||r.status===q.get('status'))&&(!q.get('environment')||r.environment===q.get('environment'))
    &&(!q.get('release_type')||r.release_type===q.get('release_type'))
    &&(q.get('upcoming_only')!=='true'||['planned','in_progress'].includes(r.status))
    &&(!term||`${r.version} ${r.title} ${r.summary||''} ${r.release_notes||''}`.toLowerCase().includes(term)));
   const by_status:Object=Object.fromEntries(releaseStatuses.map(s=>[s,matched.filter(r=>r.status===s).length]));
   const sanitized=matched.slice(offset,offset+limit).map(r=>({...r,
    ...(!access.platform_user_identity?{owner_platform_user_id:null,owner_email:null,created_by_email:null,updated_by_email:null}:{}),
    ...(!access.change_reference?{change_request_id:null,change_request_title:null,change_request_status:null}:{}),
    ...(!access.maintenance_reference?{maintenance_window_id:null,maintenance_window_title:null,maintenance_window_status:null}:{})}));
   return fulfillJson(route,{releases:sanitized,summary:{total:matched.length,upcoming:matched.filter(r=>['planned','in_progress'].includes(r.status)).length,
    rolled_back:matched.filter(r=>r.status==='rolled_back').length,by_status,by_type:{},by_environment:{}},
    pagination:{limit,offset,total:matched.length,has_more:offset+limit<matched.length},evidence_access:access,
    evidence_contract:{application_registry_only:true,status_is_application_workflow_state:true,
     deployed_status_does_not_prove_external_deployment:true,rolled_back_status_does_not_prove_external_rollback:true,
     timestamps_are_application_transition_evidence:true,linked_change_is_application_reference_only:true,linked_maintenance_is_application_reference_only:true},
    release_types:releaseTypes,statuses:releaseStatuses,environments:releaseEnvironments,impacts:releaseImpacts});
  }
  if(method==='POST'&&path==='/platform/releases'){
   const rec={...plannedRelease,...body,status:'planned',id:'f1000000-0000-4000-8000-000000000099',
    owner_present:Boolean(body.owner_platform_user_id),change_request_present:Boolean(body.change_request_id),
    maintenance_window_present:Boolean(body.maintenance_window_id)};
   records=[rec,...records];return fulfillJson(route,{release:rec},201);
  }
  const m=path.match(/^\/platform\/releases\/([^/]+)(?:\/(status))?$/);
  if(m){const ix=records.findIndex(r=>r.id===m[1]);if(ix<0)return fulfillJson(route,{message:'Synthetic release not found'},404);
   if(method==='PATCH'&&!m[2]){records[ix]={...records[ix],...body};return fulfillJson(route,{release:records[ix]});}
   if(method==='POST'&&m[2]==='status'){
    records[ix]={...records[ix],status:body.status,...(body.status==='deployed'?{deployed_at:'2026-11-05T12:00:00Z'}:{}),
     ...(body.status==='rolled_back'?{rolled_back_at:'2026-11-05T12:00:00Z'}:{})};
    return fulfillJson(route,{release:records[ix]});
   }
  }
  return fulfillJson(route,[]);
 });
 await page.goto(`/platform/releases${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Releases',exact:true})).toBeVisible();
}
