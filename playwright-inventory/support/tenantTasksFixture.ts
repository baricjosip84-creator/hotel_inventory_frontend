/** Batch 61: isolated Platform Tenant Tasks transport for GENERATED_UNRUN browser specs.
 * It provides NO proof of real platform access control, external work completion,
 * PostgreSQL persistence, audit correctness or tenant data isolation. */
import { expect, type Page, type Route } from '@playwright/test';
import { targetBaseURL } from './environment';
import { fulfillJson } from './tenantSession';
import { syntheticJwt, SYNTHETIC_PLATFORM_USER_ID } from './platformSession';

export const TASK_TENANT_A='aaaaaaaa-aaaa-4aaa-8aaa-111111111111';
export const TASK_TENANT_B='bbbbbbbb-bbbb-4bbb-8bbb-222222222222';
export const TASK_ID_A='cccccccc-cccc-4ccc-8ccc-333333333333';
export const TASK_ID_B='dddddddd-dddd-4ddd-8ddd-444444444444';
export const TASK_ID_C='eeeeeeee-eeee-4eee-8eee-555555555555';
export const TASK_ID_D='ffffffff-ffff-4fff-8fff-666666666666';
export const TASK_USER_A='11111111-1111-4111-8111-111111111111';
export const TASK_USER_INACTIVE='22222222-2222-4222-8222-222222222222';
export const taskTenants=[{id:TASK_TENANT_A,name:'Fixture Hotel'},{id:TASK_TENANT_B,name:'Fixture Warehouse'}];
export const taskUsers=[{id:TASK_USER_A,email:'operator@example.test',is_active:true,role:'operator'},{id:TASK_USER_INACTIVE,email:'inactive@example.test',is_active:false,role:'operator'}];
export const taskPermissions=['platform.dashboard.read','platform.tenants.read','platform.tenants.update','platform.users.read','platform.billing.read','platform.runbooks.read','platform.sla.read','platform.incidents.read','platform.support_sessions.read'];
export const taskCategories=['general','onboarding','support','billing','security','migration','offboarding'];
export const taskPriorities=['low','normal','high','urgent'];
export const taskStatuses=['open','in_progress','blocked','completed','cancelled'];
export type TenantTask={id:string;tenant_id:string;tenant_name?:string;title:string;description:string|null;category:string;priority:string;status:string;due_at:string|null;assigned_platform_user_id:string|null;assigned_platform_user_email:string|null;created_by_platform_user_email:string|null;completed_by_platform_user_email:string|null;completed_at:string|null;created_at:string|null;updated_at:string|null;is_overdue:boolean;is_closed:boolean};
export const taskRows:TenantTask[]=[
 {id:TASK_ID_A,tenant_id:TASK_TENANT_A,tenant_name:'Fixture Hotel',title:'Fixture urgent onboarding',description:'Synthetic action required',category:'onboarding',priority:'urgent',status:'open',due_at:'2026-01-10T10:00:00Z',assigned_platform_user_id:TASK_USER_A,assigned_platform_user_email:'operator@example.test',created_by_platform_user_email:'creator@example.test',completed_by_platform_user_email:null,completed_at:null,created_at:'2026-01-01T09:00:00Z',updated_at:'2026-01-02T09:00:00Z',is_overdue:true,is_closed:false},
 {id:TASK_ID_B,tenant_id:TASK_TENANT_B,tenant_name:'Fixture Warehouse',title:'Fixture blocked billing',description:null,category:'billing',priority:'high',status:'blocked',due_at:null,assigned_platform_user_id:null,assigned_platform_user_email:null,created_by_platform_user_email:null,completed_by_platform_user_email:null,completed_at:null,created_at:'invalid-date',updated_at:'2026-01-03T12:00:00Z',is_overdue:false,is_closed:false},
 {id:TASK_ID_C,tenant_id:TASK_TENANT_A,tenant_name:'Fixture Hotel',title:'Fixture completed migration',description:'Previously finished',category:'migration',priority:'normal',status:'completed',due_at:'2026-01-01T11:00:00Z',assigned_platform_user_id:TASK_USER_INACTIVE,assigned_platform_user_email:'inactive@example.test',created_by_platform_user_email:'creator@example.test',completed_by_platform_user_email:'closer@example.test',completed_at:'2026-01-04T12:00:00Z',created_at:'2026-01-01T09:00:00Z',updated_at:'2026-01-04T12:00:00Z',is_overdue:false,is_closed:true},
 {id:TASK_ID_D,tenant_id:TASK_TENANT_B,tenant_name:'Fixture Warehouse',title:'Fixture cancelled support',description:null,category:'support',priority:'low',status:'cancelled',due_at:null,assigned_platform_user_id:null,assigned_platform_user_email:null,created_by_platform_user_email:null,completed_by_platform_user_email:null,completed_at:null,created_at:'2026-01-05T09:00:00Z',updated_at:'2026-01-06T09:00:00Z',is_overdue:false,is_closed:true}
];
export const taskSummary={open_count:4,blocked_count:1,overdue_count:2,urgent_count:1,by_category:[{category:'onboarding',count:1},{category:'billing',count:1}]};
export type TaskOverride={status:number;json:unknown};
export type TaskFixtureOptions={query?:string;permissions?:string[];rows?:TenantTask[];tenants?:typeof taskTenants;users?:typeof taskUsers;summary?:typeof taskSummary;responses?:Record<string,TaskOverride>;delayMs?:Record<string,number>;expectHeading?:boolean;
 respond?:(method:string,path:string,body:unknown,query:URLSearchParams)=>TaskOverride|undefined;
 onCall?:(method:string,path:string,body:unknown,query:URLSearchParams)=>void;
};
export function makeTask(i:number,patch:Partial<TenantTask>={}):TenantTask{return {...taskRows[0],id:`44444444-4444-4444-8444-${String(i).padStart(12,'0')}`,title:`Fixture task ${String(i).padStart(3,'0')}`,priority:'normal',category:'general',is_overdue:false,...patch};}
export async function openTenantTasks(page:Page,opts:TaskFixtureOptions={}){
 targetBaseURL();
 const records=(opts.rows??taskRows).map(row=>({...row}));let serial=0;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async (route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),q=url.searchParams;
  let body:unknown=null;if(method!=='GET')try{body=req.postDataJSON()}catch{body=req.postData()}
  opts.onCall?.(method,path,body,q);
  const key=`${method} ${path}`;
  if(opts.delayMs?.[key])await new Promise(r=>setTimeout(r,opts.delayMs?.[key]));
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'No synthetic cookie'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'tasks-fixture@example.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions:opts.permissions??taskPermissions});
  const dynamic=opts.respond?.(method,path,body,q);if(dynamic)return fulfillJson(route,dynamic.json,dynamic.status);
  const override=opts.responses?.[key];if(override)return fulfillJson(route,override.json,override.status);
  if(method==='GET'&&path==='/platform/tenants')return fulfillJson(route,opts.tenants??taskTenants);
  if(method==='GET'&&path==='/platform/users')return fulfillJson(route,opts.users??taskUsers);
  if(method==='GET'&&path==='/platform/tenant-tasks/summary')return fulfillJson(route,opts.summary??taskSummary);
  if(method==='GET'&&path==='/platform/tenant-tasks'){
   const filtered=records.filter(x=>(q.get('include_closed')==='true'||!x.is_closed)
    &&(!q.get('tenant_id')||x.tenant_id===q.get('tenant_id'))
    &&(!q.get('status')||x.status===q.get('status'))
    &&(!q.get('category')||x.category===q.get('category'))
    &&(!q.get('priority')||x.priority===q.get('priority'))
    &&(!q.get('assigned_platform_user_id')||x.assigned_platform_user_id===q.get('assigned_platform_user_id'))
    &&(q.get('overdue_only')!=='true'||x.is_overdue));
   const rank=(p:string)=>({urgent:0,high:1,normal:2,low:3} as Record<string,number>)[p]??4;
   filtered.sort((a,b)=>rank(a.priority)-rank(b.priority)||(a.due_at||'9999').localeCompare(b.due_at||'9999')||(b.created_at||'').localeCompare(a.created_at||'')||a.id.localeCompare(b.id));
   const offset=Number(q.get('offset')||0),limit=Number(q.get('limit')||100);
   return fulfillJson(route,{tasks:filtered.slice(offset,offset+limit),pagination:{limit,offset,has_more:offset+limit<filtered.length}});
  }
  if(method==='POST'&&path==='/platform/tenant-tasks'){
   const p=body as Partial<TenantTask>,tenant=(opts.tenants??taskTenants).find(t=>t.id===p.tenant_id),now='2026-11-04T12:00:00Z';
   const row:TenantTask={...makeTask(++serial),id:`55555555-5555-4555-8555-${String(serial).padStart(12,'0')}`,tenant_id:p.tenant_id||'',tenant_name:tenant?.name||p.tenant_id,title:p.title||'',description:p.description||null,category:p.category||'general',priority:p.priority||'normal',status:p.status||'open',due_at:p.due_at||null,assigned_platform_user_id:p.assigned_platform_user_id||null,assigned_platform_user_email:p.assigned_platform_user_id===TASK_USER_A?'operator@example.test':null,created_by_platform_user_email:'tasks-fixture@example.test',completed_by_platform_user_email:null,completed_at:null,created_at:now,updated_at:now,is_overdue:false,is_closed:p.status==='completed'||p.status==='cancelled'};
   records.unshift(row);return fulfillJson(route,row,201);
  }
  const edit=/^\/platform\/tenant-tasks\/([^/]+)$/.exec(path);
  if(edit&&method==='PATCH'){
   const task=records.find(x=>x.id===edit[1]);if(!task)return fulfillJson(route,{message:'Task missing'},404);
   const p=body as Partial<TenantTask>;const wasCompleted=task.status==='completed';Object.assign(task,p,{updated_at:'2026-11-04T12:05:00Z'});task.is_closed=task.status==='completed'||task.status==='cancelled';if(wasCompleted&&task.status!=='completed'){task.completed_at=null;task.completed_by_platform_user_email=null;}
   return fulfillJson(route,task);
  }
  const complete=/^\/platform\/tenant-tasks\/([^/]+)\/complete$/.exec(path);
  if(complete&&method==='POST'){
   const task=records.find(x=>x.id===complete[1]);if(!task)return fulfillJson(route,{message:'Task missing'},404);
   task.status='completed';task.is_closed=true;task.completed_at='2026-11-04T12:10:00Z';task.completed_by_platform_user_email='tasks-fixture@example.test';return fulfillJson(route,task);
  }
  if(edit&&method==='DELETE'){
   const at=records.findIndex(x=>x.id===edit[1]);if(at<0)return fulfillJson(route,{message:'Task missing'},404);
   records.splice(at,1);return fulfillJson(route,{deleted:true,id:edit[1]});
  }
  return fulfillJson(route,[]);
 });
 await page.goto(`/platform/tenant-tasks${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Tenant tasks',exact:true})).toBeVisible();
}
