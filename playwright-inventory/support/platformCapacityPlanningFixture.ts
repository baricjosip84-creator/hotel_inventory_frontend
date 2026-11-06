/** Batch 79 — synthetic Platform Capacity Planning transport fixture, GENERATED_UNRUN.
 * Responses are invented application records, not live telemetry or a backend acceptance test.
 * No real identities, external resource assertions, PostgreSQL guarantees or audit proof. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';

export const capacityId='91000000-0000-4000-8000-000000000001';
export const capacityWatchId='91000000-0000-4000-8000-000000000002';
export const capacityNoLimitId='91000000-0000-4000-8000-000000000003';
export const capacityArchivedId='91000000-0000-4000-8000-000000000004';
export const capacityDependencyId='92000000-0000-4000-8000-000000000001';
export const capacityOwnerId='93000000-0000-4000-8000-000000000001';
export const capacityPermissions=['platform.dashboard.read','platform.capacity.read','platform.capacity.write',
 'platform.dependencies.read','platform.users.read','platform.risks.read','platform.jobs.read','platform.audit.read'];
export const capacityTypes=['database','storage','compute','queue','email','sms','api','integration','support','other'];
export const capacityEnvironments=['development','staging','production','shared'];
export const capacityStatuses=['tracking','watch','scaling_needed','scaling_in_progress','resolved','archived'];
export const criticalCapacity={id:capacityId,dependency_id:capacityDependencyId,dependency_name:'Fixture Primary Database',
 dependency_present:true,name:'Fixture Critical Database',resource_type:'database',environment:'production',
 status:'scaling_needed',unit:'GB',current_usage:95,capacity_limit:100,warning_threshold_percent:75,critical_threshold_percent:90,
 usage_percent:95,projected_exhaustion_at:'2026-11-14T12:00:00Z',owner_platform_user_id:capacityOwnerId,
 owner_email:'capacity-owner@fixture.test',owner_present:true,scaling_plan:'Fixture increase storage',
 notes:'Recorded capacity observation',is_archived:false,archived_at:null,updated_at:'2026-11-04T12:00:00Z',updated_by_email:'capacity-admin@fixture.test'};
export const warningCapacity={...criticalCapacity,id:capacityWatchId,name:'Fixture Queue Watch',resource_type:'queue',environment:'staging',
 status:'watch',unit:'messages',current_usage:80,capacity_limit:100,usage_percent:80,projected_exhaustion_at:null,
 dependency_id:null,dependency_name:null,dependency_present:false,owner_platform_user_id:null,owner_email:null,owner_present:false,
 scaling_plan:null,notes:null};
export const noLimitCapacity={...criticalCapacity,id:capacityNoLimitId,name:'Fixture Unknown Limit',resource_type:'api',
 status:'tracking',capacity_limit:0,current_usage:15,usage_percent:null,projected_exhaustion_at:null};
export const archivedCapacity={...criticalCapacity,id:capacityArchivedId,name:'Fixture Archived Capacity',status:'archived',
 is_archived:true,archived_at:'2026-11-01T10:00:00Z'};
export type FixtureCapacity=typeof criticalCapacity&Record<string,any>;
export function manyCapacity(n:number):FixtureCapacity[]{return Array.from({length:n},(_,i)=>({
 ...criticalCapacity,id:`${String(i+1).padStart(8,'0')}-0000-4000-8000-${String(i+1).padStart(12,'0')}`,
 name:`Fixture Capacity ${String(i+1).padStart(3,'0')}`
}));}
export type CapacityOptions={query?:string;permissions?:string[];rows?:FixtureCapacity[];
 responses?:Record<string,{status?:number;json:any}>;
 respond?:(method:string,path:string,q:URLSearchParams,body:any)=>{status?:number;json:any}|undefined|Promise<{status?:number;json:any}|undefined>;
 onCall?:(method:string,path:string,q:URLSearchParams,body:any)=>void;expectHeading?:boolean};
export async function openCapacity(page:Page,opts:CapacityOptions={}){
 targetBaseURL();const permissions=opts.permissions??capacityPermissions;
 let records=(opts.rows??[criticalCapacity,warningCapacity,noLimitCapacity]).map(r=>({...r}));
 const dependencies=[{id:capacityDependencyId,name:'Fixture Primary Database',status:'active',archived_at:null},
  {id:'92000000-0000-4000-8000-000000000002',name:'Fixture Archived Dependency',status:'archived',archived_at:'2026-11-01T00:00:00Z'}];
 const owners=[{id:capacityOwnerId,email:'capacity-owner@fixture.test',is_active:true},
  {id:'93000000-0000-4000-8000-000000000002',email:'inactive@fixture.test',is_active:false}];
 await page.addInitScript(token=>{
  localStorage.setItem('inventory_platform_access_token',token);
  localStorage.setItem('inventory_locale','en-GB');
 },syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const request=route.request();if(request.isNavigationRequest())return route.continue();
  const url=new URL(request.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),q=url.searchParams,method=request.method();
  let body:any={};try{body=request.postDataJSON()??{};}catch{body={};}
  opts.onCall?.(method,path,q,body);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic refresh unavailable'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'capacity@fixture.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions});
  const override=(await opts.respond?.(method,path,q,body))??opts.responses?.[`${method} ${path}`];
  if(override)return fulfillJson(route,override.json,override.status??200);
  if(path==='/platform/users'&&method==='GET')return fulfillJson(route,owners);
  if(path==='/platform/service-dependencies'&&method==='GET')return fulfillJson(route,{dependencies});
  if(path==='/platform/capacity-planning'&&method==='GET'){
   const limit=Number(q.get('limit')??50),offset=Number(q.get('offset')??0);
   const search=(q.get('search')??'').toLowerCase(),attention=q.get('attention_only')==='true',includeArchived=q.get('include_archived')==='true';
   const access={dependency_identity:permissions.includes('platform.dependencies.read'),platform_user_identity:permissions.includes('platform.users.read')};
   const matched=records.filter(r=>(includeArchived||!(r.is_archived||r.status==='archived'))
    &&(!q.get('status')||r.status===q.get('status'))&&(!q.get('resource_type')||r.resource_type===q.get('resource_type'))
    &&(!q.get('environment')||r.environment===q.get('environment'))
    &&(!attention||(!['archived','resolved'].includes(r.status)&&(Number(r.capacity_limit)===0||Number(r.current_usage)/Number(r.capacity_limit)*100>=Number(r.warning_threshold_percent))))
    &&(!search||`${r.name} ${r.notes||''} ${r.scaling_plan||''} ${r.resource_type} ${access.dependency_identity?r.dependency_name||'':''} ${access.platform_user_identity?r.owner_email||'':''}`.toLowerCase().includes(search)));
   const active=matched.filter(r=>!['archived','resolved'].includes(r.status));
   const critical=active.filter(r=>Number(r.capacity_limit)>0&&Number(r.current_usage)/Number(r.capacity_limit)*100>=Number(r.critical_threshold_percent));
   const warning=active.filter(r=>Number(r.capacity_limit)>0&&Number(r.current_usage)/Number(r.capacity_limit)*100>=Number(r.warning_threshold_percent)&&Number(r.current_usage)/Number(r.capacity_limit)*100<Number(r.critical_threshold_percent));
   const soon=active.filter(r=>r.projected_exhaustion_at&&Date.parse(r.projected_exhaustion_at)<=Date.now()+30*86400000);
   const sanitized=matched.slice(offset,offset+limit).map(r=>({
    ...r,...(!access.dependency_identity?{dependency_id:null,dependency_name:null}:{}),
    ...(!access.platform_user_identity?{owner_platform_user_id:null,owner_email:null,updated_by_email:null}:{}),
    dependency_present:Boolean(r.dependency_id),owner_present:Boolean(r.owner_platform_user_id)
   }));
   return fulfillJson(route,{resources:sanitized,
    summary:{total:matched.length,warning:warning.length,critical:critical.length,exhausting_soon:soon.length,
     unconfigured_limit:active.filter(r=>!Number(r.capacity_limit)).length,by_status:{},by_type:{}},
    pagination:{limit,offset,total:matched.length,has_more:offset+limit<matched.length},evidence_access:access,
    evidence_contract:{application_registry_only:true,current_usage_is_operator_recorded:true,
     capacity_limit_is_operator_recorded:true,projected_exhaustion_is_operator_recorded_estimate:true,
     no_external_infrastructure_telemetry_verified:true,status_is_application_workflow_state:true,
     resolved_status_does_not_prove_external_capacity_issue_resolved:true,dependency_linkage_is_application_context_only:true},
    resource_types:capacityTypes,environments:capacityEnvironments,statuses:capacityStatuses});
  }
  if(path==='/platform/capacity-planning'&&method==='POST'){
   const rec={...criticalCapacity,...body,id:'91000000-0000-4000-8000-000000000099',usage_percent:body.capacity_limit?100*Number(body.current_usage)/Number(body.capacity_limit):null,
    dependency_name:body.dependency_id?'Fixture Primary Database':null,owner_email:body.owner_platform_user_id?'capacity-owner@fixture.test':null,
    dependency_present:Boolean(body.dependency_id),owner_present:Boolean(body.owner_platform_user_id),is_archived:false,archived_at:null};
   records=[rec,...records];return fulfillJson(route,{resource:rec},201);
  }
  const match=path.match(/^\/platform\/capacity-planning\/([^/]+)(?:\/(usage|archive))?$/);
  if(match){const i=records.findIndex(x=>x.id===match[1]);if(i<0)return fulfillJson(route,{message:'Capacity resource not found'},404);
   if(method==='PATCH'&&!match[2]){records[i]={...records[i],...body};return fulfillJson(route,{resource:records[i]});}
   if(method==='POST'&&match[2]==='usage'){
    records[i]={...records[i],...body,usage_percent:body.capacity_limit?100*Number(body.current_usage)/Number(body.capacity_limit):null};
    return fulfillJson(route,{resource:records[i]});
   }
   if(method==='POST'&&match[2]==='archive'){
    records[i]={...records[i],status:'archived',is_archived:true,archived_at:'2026-11-05T12:00:00Z'};
    return fulfillJson(route,{resource:records[i]});
   }
   if(method==='GET')return fulfillJson(route,records[i]);
  }
  return fulfillJson(route,[]);
 });
 await page.goto(`/platform/capacity-planning${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Capacity planning',exact:true})).toBeVisible();
}
