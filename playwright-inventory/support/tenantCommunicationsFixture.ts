/** Batch 59 — isolated, synthetic Platform Tenant Communications browser transport.
 * Intercepted payloads are test data, NOT real delivery, receipt, audit, permission,
 * persistence, concurrency, or security evidence. Phase 1: GENERATED_UNRUN. */
import { expect, type Page, type Route } from '@playwright/test';
import { targetBaseURL } from './environment';
import { fulfillJson } from './tenantSession';
import { syntheticJwt, SYNTHETIC_PLATFORM_USER_ID } from './platformSession';

export const COM_TENANT_A='aaaaaaaa-aaaa-4aaa-8aaa-111111111111';
export const COM_TENANT_B='bbbbbbbb-bbbb-4bbb-8bbb-222222222222';
export const COM_ID_A='cccccccc-cccc-4ccc-8ccc-333333333333';
export const COM_ID_B='dddddddd-dddd-4ddd-8ddd-444444444444';
export const COM_ID_C='eeeeeeee-eeee-4eee-8eee-555555555555';
export const commTenants=[{id:COM_TENANT_A,name:'Fixture Hotel'},{id:COM_TENANT_B,name:'Fixture Warehouse'}];
export const commChannels=['email','phone','meeting','chat','ticket','onsite','other'];
export const commDirections=['inbound','outbound','internal'];
export const commPermissions=['platform.dashboard.read','platform.tenants.read','platform.tenants.update','platform.billing.read','platform.sla.read','platform.incidents.read','platform.support_sessions.read'];
export type Communication={id:string;tenant_id:string;tenant_name:string;channel:string;direction:string;subject:string;summary:string;external_reference:string|null;contact_name:string|null;contact_email:string|null;occurred_at:string;follow_up_required:boolean;follow_up_due_at:string|null;resolved_at:string|null;archived_at:string|null;created_at:string;updated_at:string;created_by_email:string|null;updated_by_email:string|null;resolved_by_email:string|null};
export const commRows:Communication[]=[
 {id:COM_ID_A,tenant_id:COM_TENANT_A,tenant_name:'Fixture Hotel',channel:'email',direction:'outbound',subject:'Fixture onboarding email',summary:'Synthetic customer email recorded only',external_reference:'TICKET-C59',contact_name:'Fixture Contact',contact_email:'contact@example.test',occurred_at:'2026-10-01T09:00:00Z',follow_up_required:true,follow_up_due_at:'2026-11-10T09:00:00Z',resolved_at:null,archived_at:null,created_at:'2026-10-01T10:00:00Z',updated_at:'2026-10-01T11:00:00Z',created_by_email:'creator@example.test',updated_by_email:'editor@example.test',resolved_by_email:null},
 {id:COM_ID_B,tenant_id:COM_TENANT_B,tenant_name:'Fixture Warehouse',channel:'phone',direction:'inbound',subject:'Fixture resolved call',summary:'Synthetic resolved followup record',external_reference:null,contact_name:null,contact_email:null,occurred_at:'2026-10-02T09:00:00Z',follow_up_required:true,follow_up_due_at:'2026-10-03T09:00:00Z',resolved_at:'2026-10-03T10:00:00Z',archived_at:null,created_at:'invalid-date',updated_at:'2026-10-03T10:00:00Z',created_by_email:null,updated_by_email:null,resolved_by_email:'resolver@example.test'},
 {id:COM_ID_C,tenant_id:COM_TENANT_B,tenant_name:'Fixture Warehouse',channel:'chat',direction:'internal',subject:'Fixture archived chat',summary:'Synthetic archived internal log',external_reference:null,contact_name:null,contact_email:null,occurred_at:'2026-10-04T09:00:00Z',follow_up_required:false,follow_up_due_at:null,resolved_at:null,archived_at:'2026-10-05T09:00:00Z',created_at:'2026-10-04T09:00:00Z',updated_at:'2026-10-05T09:00:00Z',created_by_email:null,updated_by_email:null,resolved_by_email:null}
];
export type CommResponse={status:number;json:unknown};
export type CommFixtureOptions={query?:string;permissions?:string[];rows?:Communication[];tenants?:typeof commTenants;responses?:Record<string,CommResponse>;delayMs?:Record<string,number>;expectHeading?:boolean;
  respond?:(method:string,path:string,body:unknown,query:URLSearchParams)=>CommResponse|undefined;
  onCall?:(method:string,path:string,body:unknown,query:URLSearchParams)=>void};
export async function openTenantCommunications(page:Page,opts:CommFixtureOptions={}){
 targetBaseURL();
 const records=(opts.rows??commRows).map(x=>({...x}));let seq=0;
 await page.addInitScript(t=>{localStorage.setItem('inventory_platform_access_token',t);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const request=route.request();if(request.isNavigationRequest())return route.continue();
  const url=new URL(request.url()),path=url.pathname.replace(/^\/api(?=\/)/,'');const method=request.method();
  let body:unknown=null;if(method!=='GET')try{body=request.postDataJSON()}catch{body=request.postData()}
  opts.onCall?.(method,path,body,url.searchParams);
  const key=`${method} ${path}`;
  if(opts.delayMs?.[key])await new Promise(resolve=>setTimeout(resolve,opts.delayMs?.[key]));
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic auth has no cookie'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'communications-fixture@example.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions:opts.permissions??commPermissions});
  const dynamic=opts.respond?.(method,path,body,url.searchParams);if(dynamic)return fulfillJson(route,dynamic.json,dynamic.status);
  const override=opts.responses?.[key];if(override)return fulfillJson(route,override.json,override.status);
  if(method==='GET'&&path==='/platform/tenants')return fulfillJson(route,opts.tenants??commTenants);
  if(method==='GET'&&path==='/platform/tenant-communications'){
    const q=url.searchParams;
    const filtered=records.filter(x=>(!q.get('tenant_id')||x.tenant_id===q.get('tenant_id'))
      &&(!q.get('channel')||x.channel===q.get('channel'))&&(!q.get('direction')||x.direction===q.get('direction'))
      &&(!q.has('follow_up')||x.follow_up_required===(q.get('follow_up')==='true'))
      &&(q.get('include_archived')==='true'||!x.archived_at)
      &&(!q.get('search')||[x.subject,x.summary,x.tenant_name,x.contact_name||'',x.contact_email||'',x.external_reference||''].some(s=>s.toLowerCase().includes((q.get('search')||'').trim().toLowerCase()))));
    const isOpen=(x:Communication)=>x.follow_up_required&&!x.resolved_at&&!x.archived_at;
    filtered.sort((a,b)=>Number(isOpen(b))-Number(isOpen(a))||(a.follow_up_due_at||'9999').localeCompare(b.follow_up_due_at||'9999')||b.occurred_at.localeCompare(a.occurred_at)||a.id.localeCompare(b.id));
    const off=Number(q.get('offset')||0),lim=Number(q.get('limit')||100);
    return fulfillJson(route,{communications:filtered.slice(off,off+lim),summary:{total:filtered.length,open_followups:filtered.filter(isOpen).length,archived:filtered.filter(x=>Boolean(x.archived_at)).length,by_channel:{}},channels:commChannels,directions:commDirections,pagination:{limit:lim,offset:off,has_more:off+lim<filtered.length}});
  }
  const create=/^\/platform\/tenant-communications\/tenants\/([^/]+)$/.exec(path);
  if(method==='POST'&&create){const p=body as Partial<Communication>;const tenant=(opts.tenants??commTenants).find(t=>t.id===create[1]);
    const now='2026-11-04T10:00:00Z';const row:Communication={id:`ffffffff-ffff-4fff-8fff-${String(++seq).padStart(12,'0')}`,tenant_id:create[1],tenant_name:tenant?.name||create[1],channel:p.channel||'email',direction:p.direction||'outbound',subject:p.subject||'',summary:p.summary||'',external_reference:p.external_reference||null,contact_name:p.contact_name||null,contact_email:p.contact_email||null,occurred_at:p.occurred_at||now,follow_up_required:Boolean(p.follow_up_required),follow_up_due_at:p.follow_up_due_at||null,resolved_at:null,archived_at:null,created_at:now,updated_at:now,created_by_email:'communications-fixture@example.test',updated_by_email:'communications-fixture@example.test',resolved_by_email:null};
    records.unshift(row);return fulfillJson(route,row,201);
  }
  const update=/^\/platform\/tenant-communications\/([^/]+)$/.exec(path);
  if(method==='PATCH'&&update){const r=records.find(x=>x.id===update[1]);if(!r)return fulfillJson(route,{message:'Not found'},404);Object.assign(r,body||{},{updated_at:'2026-11-04T11:00:00Z'});return fulfillJson(route,r);}
  const lifecycle=/^\/platform\/tenant-communications\/([^/]+)\/(resolve-follow-up|archive|restore)$/.exec(path);
  if(method==='POST'&&lifecycle){const r=records.find(x=>x.id===lifecycle[1]);if(!r)return fulfillJson(route,{message:'Not found'},404);
    if(lifecycle[2]==='resolve-follow-up'){r.resolved_at='2026-11-04T11:00:00Z';r.resolved_by_email='communications-fixture@example.test';}
    if(lifecycle[2]==='archive'){r.archived_at='2026-11-04T11:00:00Z';}
    if(lifecycle[2]==='restore'){r.archived_at=null;}
    r.updated_at='2026-11-04T11:00:00Z';return fulfillJson(route,r);
  }
  return fulfillJson(route,[]);
 });
 await page.goto(`/platform/tenant-communications${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Tenant communications',exact:true})).toBeVisible();
}
