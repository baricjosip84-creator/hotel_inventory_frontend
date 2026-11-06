/** Batch 80: source-traced synthetic Platform Operational Jobs UI fixture. No real worker runs,
 * claims, scheduler heartbeats, external effects, server authorization, DB audit, or browser verification. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';

export const jobId='a0000000-0000-4000-8000-000000000001';
export const secondJobId='a0000000-0000-4000-8000-000000000002';
export const archivedJobId='a0000000-0000-4000-8000-000000000003';
export const jobRunbookId='b0000000-0000-4000-8000-000000000001';
export const jobOwnerId='c0000000-0000-4000-8000-000000000001';
export const jobPermissions=['platform.dashboard.read','platform.jobs.read','platform.jobs.write','platform.users.read',
 'platform.runbooks.read','platform.notifications.read','platform.dependencies.read','platform.audit.read'];
export const jobCategories=['backup','billing','notification','webhook','retention','health_scan','sla_scan','maintenance','reporting','operational','other'];
export const jobStatuses=['enabled','paused','degraded','disabled','archived'];
export const attentionJob={id:jobId,name:'Fixture Overdue Worker',job_key:'fixture.worker.overdue',category:'backup',status:'degraded',
 schedule_label:'Every 10 min',owner_platform_user_id:jobOwnerId,owner_email:'job-owner@fixture.test',owner_present:true,
 runbook_id:jobRunbookId,runbook_title:'Fixture Runbook',runbook_present:true,
 last_run_at:'2026-11-04T10:00:00Z',last_status:'failed',last_duration_ms:350,last_error:'Synthetic handler failure',
 next_run_at:'2026-11-04T11:00:00Z',consecutive_failures:3,failure_threshold:3,overdue:true,failing_attention:true,
 notes:'Recorded application job warning',updated_at:'2026-11-04T11:00:00Z',current_run_id:null,current_run_started_at:null,
 claimed_by_platform_user_id:null,claimed_by_email:null,claim_expires_at:null,actively_claimed:false,
 dead_lettered_at:null,next_retry_at:null,last_retry_scheduled_at:null,dead_lettered:false,retry_due:false,
 worker_handler:'fixture.worker',worker_payload:{dryRun:true},worker_enabled:true,worker_dry_run:true,
 last_worker_id:null,last_worker_result:null,alert_on_failure:true,alert_on_dead_letter:true,last_alerted_at:null,
 recurrence_type:'minutes',recurrence_interval:10,recurrence_anchor_at:null,last_success_at:null,last_failure_at:'2026-11-04T10:00:00Z'};
export const normalJob={...attentionJob,id:secondJobId,name:'Fixture Routine Job',job_key:'fixture.routine.job',category:'reporting',status:'enabled',
 last_status:'success',last_error:null,consecutive_failures:0,overdue:false,failing_attention:false,notes:null,
 owner_platform_user_id:null,owner_email:null,owner_present:false,runbook_id:null,runbook_title:null,runbook_present:false,
 next_run_at:'2035-01-01T00:00:00Z'};
export const archivedJob={...attentionJob,id:archivedJobId,name:'Fixture Archived Job',job_key:'fixture.archived.job',status:'archived',
 overdue:false,failing_attention:false,dead_lettered:false};
export const jobHeartbeat={id:'d0000000-0000-4000-8000-000000000001',worker_id:'fixture-worker-01',worker_type:'jobs',
 status:'unhealthy',last_seen_at:'2026-11-04T12:00:00Z',created_at:'2026-11-04T11:00:00Z',
 updated_at:'2026-11-04T12:00:00Z',is_stale:true,is_unhealthy_status:true,is_flapping:true,
 is_run_claim_mismatch:true,is_missing_source:false,is_identity_changed_recent:false,
 status_changed_count:2,status_change_window_count:2,unhealthy_status_change_window_count:1,
 last_status_changed_at:'2026-11-04T12:00:00Z',metadata:{source:'synthetic'}};
export const jobRun={id:'e0000000-0000-4000-8000-000000000001',job_id:jobId,started_at:'2026-11-04T10:00:00Z',
 finished_at:'2026-11-04T10:00:01Z',status:'failed',duration_ms:350,error_message:'Synthetic handler failure',
 triggered_by_email:'job-owner@fixture.test',triggering_actor_present:true,worker_id:'fixture-worker-01',
 worker_metadata:{source:'synthetic'},created_at:'2026-11-04T10:00:00Z'};
export type FixtureJob=typeof attentionJob&Record<string,any>;
export const manyJobs=(n:number):FixtureJob[]=>Array.from({length:n},(_,i)=>({ ...attentionJob,
 id:`${String(i+1).padStart(8,'0')}-0000-4000-8000-${String(i+1).padStart(12,'0')}`,
 name:`Fixture Job ${String(i+1).padStart(3,'0')}`,job_key:`fixture.job.${String(i+1).padStart(3,'0')}`}));
export type JobsOptions={query?:string;permissions?:string[];rows?:FixtureJob[];heartbeats?:Record<string,any>[];
 due?:FixtureJob[];metrics?:Record<string,any>;defaults?:Record<string,any>[];runs?:Record<string,any>[];
 responses?:Record<string,{status?:number;json:any}>;
 respond?:(method:string,path:string,q:URLSearchParams,body:any)=>{status?:number;json:any}|undefined|Promise<{status?:number;json:any}|undefined>;
 onCall?:(method:string,path:string,q:URLSearchParams,body:any)=>void;expectHeading?:boolean};
export async function openJobs(page:Page,opts:JobsOptions={}){
 targetBaseURL();const permissions=opts.permissions??jobPermissions;
 let records=(opts.rows??[attentionJob,normalJob]).map(x=>({...x}));
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const u=new URL(req.url()),path=u.pathname.replace(/^\/api(?=\/)/,''),q=u.searchParams,method=req.method();
  let body:any={};try{body=req.postDataJSON()??{};}catch{body={};}
  opts.onCall?.(method,path,q,body);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic refresh unavailable'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'jobs@fixture.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions});
  const override=(await opts.respond?.(method,path,q,body))??opts.responses?.[`${method} ${path}`];
  if(override)return fulfillJson(route,override.json,override.status??200);
  if(method==='GET'&&path==='/platform/users')return fulfillJson(route,[{id:jobOwnerId,email:'job-owner@fixture.test',is_active:true},
   {id:'c0000000-0000-4000-8000-000000000002',email:'inactive@fixture.test',is_active:false}]);
  if(method==='GET'&&path==='/platform/runbooks')return fulfillJson(route,{runbooks:[{id:jobRunbookId,title:'Fixture Runbook',is_active:true},
   {id:'b0000000-0000-4000-8000-000000000002',title:'Inactive Fixture Runbook',is_active:false}]});
  if(method==='GET'&&path==='/platform/operational-jobs/scheduler/due')return fulfillJson(route,opts.due??[attentionJob]);
  if(method==='GET'&&path==='/platform/operational-jobs/scheduler/heartbeats')return fulfillJson(route,opts.heartbeats??[jobHeartbeat]);
  if(method==='GET'&&path==='/platform/operational-jobs/execution-metrics')return fulfillJson(route,opts.metrics??{
   days:14,by_status:[{status:'success',count:2},{status:'failed',count:1}],slowest_jobs:[{job_id:jobId,runs:3,avg_duration_ms:350,max_duration_ms:900}],
   failing_jobs:[{id:jobId,name:attentionJob.name,job_key:attentionJob.job_key,consecutive_failures:3,failure_threshold:3,
    last_error:'Synthetic handler failure',last_failure_at:'2026-11-04T10:00:00Z'}],stale_claims:1});
  if(method==='GET'&&path==='/platform/operational-jobs/worker/handlers')return fulfillJson(route,{handlers:[{key:'fixture.worker',label:'Fixture registered handler'}]});
  if(method==='GET'&&path==='/platform/operational-jobs/defaults')return fulfillJson(route,{jobs:opts.defaults??[{
    name:'Fixture default definition',job_key:'fixture.default.handler',category:'health_scan',worker_handler:'fixture.worker',
    recurrence_type:'minutes',recurrence_interval:10,schedule_label:'Every 10m'}]});
  if(method==='GET'&&path==='/platform/operational-jobs'){
   const limit=Number(q.get('limit')??50),offset=Number(q.get('offset')??0);
   const term=(q.get('search')??'').toLowerCase(),attention=q.get('attention_only')==='true';
   const archived=q.get('include_archived')==='true';
   const matched=records.filter(r=>(archived||r.status!=='archived')
    &&(!q.get('status')||r.status===q.get('status'))&&(!q.get('category')||r.category===q.get('category'))
    &&(!attention||r.overdue||r.failing_attention||r.last_status==='failed'||r.dead_lettered||r.retry_due)
    &&(!term||`${r.name} ${r.job_key} ${r.notes||''} ${r.worker_handler||''} ${permissions.includes('platform.users.read')?r.owner_email||'':''} ${permissions.includes('platform.runbooks.read')?r.runbook_title||'':''}`.toLowerCase().includes(term)));
   const userIdentity=permissions.includes('platform.users.read'),runbookIdentity=permissions.includes('platform.runbooks.read');
   const clean=matched.slice(offset,offset+limit).map(r=>({...r,owner_present:Boolean(r.owner_platform_user_id),runbook_present:Boolean(r.runbook_id),
    ...(!userIdentity?{owner_platform_user_id:null,owner_email:null,claimed_by_email:null}:{}),
    ...(!runbookIdentity?{runbook_id:null,runbook_title:null}:{})}));
   return fulfillJson(route,{jobs:clean,summary:{total:matched.length,overdue:matched.filter(r=>r.overdue).length,
    failing:matched.filter(r=>r.failing_attention).length,last_failed:matched.filter(r=>r.last_status==='failed').length,
    claimed:matched.filter(r=>r.current_run_id).length,expired_claims:0,dead_lettered:matched.filter(r=>r.dead_lettered).length,
    retry_due:matched.filter(r=>r.retry_due).length,by_status:{},by_category:{}},
    pagination:{limit,offset,total:matched.length,has_more:offset+limit<matched.length},
    evidence_access:{platform_user_identity:userIdentity,runbook_identity:runbookIdentity},
    evidence_contract:{application_registry_only:true,run_records_are_application_execution_evidence:true,
     successful_run_does_not_prove_external_business_outcome:true,scheduler_heartbeat_does_not_prove_external_dependency_health:true,
     worker_handler_success_reflects_application_handler_result_only:true},
    categories:jobCategories,statuses:jobStatuses,mutable_statuses:jobStatuses.filter(s=>s!=='archived'),run_statuses:['success','failed','skipped','running']});
  }
  if(method==='POST'&&path==='/platform/operational-jobs'){
   const newJob={...normalJob,...body,id:'a0000000-0000-4000-8000-000000000099',owner_email:body.owner_platform_user_id?'job-owner@fixture.test':null,
    runbook_title:body.runbook_id?'Fixture Runbook':null,owner_present:Boolean(body.owner_platform_user_id),runbook_present:Boolean(body.runbook_id)};
   records=[newJob,...records];return fulfillJson(route,{job:newJob},201);
  }
  const match=path.match(/^\/platform\/operational-jobs\/([^/]+)(?:\/(runs|archive|claim|complete-claim|release-claim|schedule-retry))?$/);
  if(match){const ix=records.findIndex(r=>r.id===match[1]);if(ix<0)return fulfillJson(route,{message:'Job not found'},404);
   if(method==='GET'&&match[2]==='runs'){
    const runs=opts.runs??[jobRun],limit=Number(q.get('limit')||25),offset=Number(q.get('offset')||0);
    return fulfillJson(route,{runs:runs.slice(offset,offset+limit).map(r=>permissions.includes('platform.users.read')?r:{...r,triggered_by_email:null,triggering_actor_present:Boolean(r.triggered_by_email)||Boolean(r.triggering_actor_present)}),pagination:{limit,offset,total:runs.length,has_more:offset+limit<runs.length},
     evidence_access:{platform_user_identity:permissions.includes('platform.users.read'),runbook_identity:permissions.includes('platform.runbooks.read')}});
   }
   if(method==='PATCH'&&!match[2]){records[ix]={...records[ix],...body};return fulfillJson(route,{job:records[ix]});}
   if(method==='POST'&&match[2]==='archive'){records[ix]={...records[ix],status:'archived'};return fulfillJson(route,{job:records[ix]});}
   if(method==='POST'&&match[2]==='runs'){records[ix]={...records[ix],last_status:body.last_status,last_error:body.last_error};return fulfillJson(route,{run:jobRun});}
   if(method==='POST'&&match[2]==='claim'){records[ix]={...records[ix],current_run_id:jobRun.id,claimed_by_email:'jobs@fixture.test'};return fulfillJson(route,{job:records[ix],run:{id:jobRun.id}});}
   if(method==='POST'&&match[2]==='complete-claim'){records[ix]={...records[ix],current_run_id:null,last_status:body.status};return fulfillJson(route,{job:records[ix]});}
   if(method==='POST'&&match[2]==='release-claim'){records[ix]={...records[ix],current_run_id:null};return fulfillJson(route,{job:records[ix]});}
   if(method==='POST'&&match[2]==='schedule-retry'){records[ix]={...records[ix],next_retry_at:'2026-11-05T10:00:00Z',retry_due:true};return fulfillJson(route,{job:records[ix]});}
  }
  if(method==='POST'&&path==='/platform/operational-jobs/scheduler/heartbeat-check')return fulfillJson(route,{
   status:'attention',checked:1,stale:1,unhealthy_status:1,flapping:1,identity_changed:0,run_claim_mismatch:1,
   missing_source:0,stale_after_seconds:300,notification_action:'created',notification_id:null});
  if(method==='POST'&&path.startsWith('/platform/operational-jobs/'))return fulfillJson(route,{ok:true});
  return fulfillJson(route,[]);
 });
 await page.goto(`/platform/operational-jobs${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Operational jobs',exact:true})).toBeVisible();
}
