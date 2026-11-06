/** Batch 67 synthetic Platform Runbooks transport (PHASE 1, GENERATED_UNRUN).
 * Everything below is fixture data, NOT evidence that a real runbook was performed,
 * that the service authorized a mutation or that linked records exist. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
export const RUNBOOK_A='11111111-1111-4111-8111-111111111111';
export const RUNBOOK_B='22222222-2222-4222-8222-222222222222';
export const EXECUTION_A='33333333-3333-4333-8333-333333333333';
export const TENANT_A='44444444-4444-4444-8444-444444444444';
export const STEP_A='55555555-5555-4555-8555-555555555555';
export const STEP_B='66666666-6666-4666-8666-666666666666';
export const INCIDENT_A='77777777-7777-4777-8777-777777777777';
export const TASK_A='88888888-8888-4888-8888-888888888888';
export const runbookPermissions=['platform.dashboard.read','platform.runbooks.read','platform.runbooks.write','platform.runbooks.execute','platform.tenants.read','platform.incidents.read','platform.users.read','platform.audit.read','platform.maintenance.read'];
export type RunbookFixtureRow={id:string;title:string;description:string|null;category:string;severity:string;owner_role:string|null;is_active:boolean;step_count:number;execution_count:number;active_execution_count:number};
export type RunbookFixtureStep={id:string;step_order:number;title:string;instructions:string|null;expected_result:string|null;is_required:boolean};
export const runbooksSeed:RunbookFixtureRow[]=[
 {id:RUNBOOK_A,title:'Restore fixture service',description:'Synthetic response procedure',category:'incident',severity:'critical',owner_role:'support_lead',is_active:true,step_count:2,execution_count:0,active_execution_count:0},
 {id:RUNBOOK_B,title:'Inspect fixture invoice',description:null,category:'billing',severity:'low',owner_role:null,is_active:false,step_count:1,execution_count:3,active_execution_count:0}
];
export const runbookSteps:RunbookFixtureStep[]=[
 {id:STEP_A,step_order:1,title:'Check synthetic signal',instructions:'Inspect fixture alert',expected_result:'Acknowledged',is_required:true},
 {id:STEP_B,step_order:2,title:'Record optional note',instructions:null,expected_result:null,is_required:false}
];
export const executionSeed={id:EXECUTION_A,runbook_id:RUNBOOK_A,runbook_title:'Restore fixture service',runbook_category:'incident',runbook_severity:'critical',tenant_id:TENANT_A,tenant_name:'Fixture Hotel',incident_id:INCIDENT_A,task_id:TASK_A,status:'in_progress',reason:'Synthetic operational drill',notes:'Fixture only',started_at:'2026-11-03T12:00:00Z',completed_at:null,started_by_platform_user_email:'operator@fixture.test',completed_by_platform_user_email:null,done_steps:0,total_steps:2,evidence_access:{tenant:true,incident:true,tenant_task:true,platform_user_identity:true},steps:runbookSteps.map(s=>({...s,status:'pending',notes:null,completed_at:null,completed_by_platform_user_email:null}))};
export type FixtureReply={status?:number;json:unknown};
export type RunbooksFixtureOpts={query?:string; permissions?:string[]; runbooks?:RunbookFixtureRow[]; executions?:Array<Record<string,any>>;
 summary?:Record<string,unknown>; tenantSelector?:Array<{id:string;name:string}>;
 responses?:Record<string,FixtureReply>; respond?:(method:string,path:string,query:URLSearchParams,body:any)=>FixtureReply|undefined;
 asyncRespond?:(method:string,path:string,query:URLSearchParams,body:any)=>Promise<FixtureReply|undefined>;
 onCall?:(method:string,path:string,query:URLSearchParams,body:any)=>void; expectHeading?:boolean;};
export function syntheticRunbooks(count:number):RunbookFixtureRow[]{return Array.from({length:count},(_,i)=>({...runbooksSeed[0],id:`${String(i+1).padStart(8,'0')}-1111-4111-8111-${String(i+1).padStart(12,'0')}`,title:`Fixture procedure ${String(i+1).padStart(3,'0')}`}));}
export function syntheticExecutions(count:number):Array<Record<string,any>>{return Array.from({length:count},(_,i)=>({...executionSeed,id:`${String(i+1).padStart(8,'0')}-3333-4333-8333-${String(i+1).padStart(12,'0')}`,reason:`Synthetic execution ${String(i+1).padStart(3,'0')}`}));}
export async function openPlatformRunbooks(page:Page,opts:RunbooksFixtureOpts={}){
 targetBaseURL();
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 const rows=[...(opts.runbooks??runbooksSeed)];const executionRows=[...(opts.executions??[executionSeed])];
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),query=url.searchParams;
  let body:any=null;try{body=req.postDataJSON();}catch{body=req.postData()||null;}
  opts.onCall?.(method,path,query,body);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'No synthetic cookie'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'runbook-fixture@example.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions:opts.permissions??runbookPermissions});
  const reply=(await opts.asyncRespond?.(method,path,query,body))??opts.respond?.(method,path,query,body)??opts.responses?.[`${method} ${path}`];
  if(reply)return fulfillJson(route,reply.json,reply.status??200);
  if(method==='GET'&&path==='/platform/tenants')return fulfillJson(route,opts.tenantSelector??[{id:TENANT_A,name:'Fixture Hotel'}]);
  if(method==='GET'&&path==='/platform/runbooks/summary')return fulfillJson(route,opts.summary??{active_executions:1,active_critical_runbooks:1,active_runbooks:1,by_category:[{category:'incident',count:1},{category:'billing',count:1}]});
  if(method==='GET'&&path==='/platform/runbooks'){
   const chosen=rows.filter(r=>(!query.get('category')||r.category===query.get('category'))&&(!query.get('severity')||r.severity===query.get('severity'))&&(!query.get('active')||String(r.is_active)===query.get('active'))&&(!query.get('search')||`${r.title} ${r.description??''} ${r.owner_role??''}`.toLowerCase().includes(query.get('search')!.toLowerCase())));
   const limit=Number(query.get('limit')??50),offset=Number(query.get('offset')??0);
   return fulfillJson(route,{runbooks:chosen.slice(offset,offset+limit),pagination:{limit,offset,has_more:offset+limit<chosen.length}});
  }
  if(method==='GET'&&path==='/platform/runbooks/executions'){
   const chosen=executionRows.filter(e=>(!query.get('status')||e.status===query.get('status'))&&(!query.get('tenant_id')||e.tenant_id===query.get('tenant_id')));
   const limit=Number(query.get('limit')??50),offset=Number(query.get('offset')??0);
   return fulfillJson(route,{executions:chosen.slice(offset,offset+limit),evidence_access:{tenant:true,incident:true,tenant_task:true,platform_user_identity:true},pagination:{limit,offset,has_more:offset+limit<chosen.length}});
  }
  if(method==='GET'&&path.startsWith('/platform/runbooks/executions/'))return fulfillJson(route,executionRows.find(e=>path.endsWith(`/${e.id}`))??executionSeed);
  if(method==='GET'&&path.startsWith('/platform/runbooks/')){
   const selected=rows.find(r=>path.endsWith(`/${r.id}`))??runbooksSeed[0];
   return fulfillJson(route,{...selected,steps:selected.id===RUNBOOK_B?[runbookSteps[0]]:runbookSteps});
  }
  if(method==='POST'&&path==='/platform/runbooks')return fulfillJson(route,{...rows[0],...body,id:RUNBOOK_A,step_count:body?.steps?.length??1,execution_count:0,active_execution_count:0,steps:runbookSteps},201);
  if(method==='PATCH'&&path.startsWith('/platform/runbooks/')&&!path.includes('/executions/'))return fulfillJson(route,{...rows[0],...body,steps:runbookSteps});
  if(method==='PUT'&&path.endsWith('/steps'))return fulfillJson(route,{...rows[0],steps:runbookSteps});
  if(method==='POST'&&path==='/platform/runbooks/executions')return fulfillJson(route,{...executionSeed,...body,id:EXECUTION_A,status:'in_progress'},201);
  if(method==='PATCH'&&path.includes('/executions/')&&path.includes('/steps/'))return fulfillJson(route,{...executionSeed,steps:executionSeed.steps.map(s=>s.id===path.split('/').at(-1)?{...s,...body}:s)});
  if(method==='POST'&&path.endsWith('/complete'))return fulfillJson(route,{...executionSeed,status:'completed',notes:body?.notes??null});
  if(method==='POST'&&path.endsWith('/cancel'))return fulfillJson(route,{...executionSeed,status:'cancelled',notes:body?.notes??null});
  return fulfillJson(route,[]);
 });
 await page.goto(`/platform/runbooks${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Runbooks',exact:true})).toBeVisible();
}
