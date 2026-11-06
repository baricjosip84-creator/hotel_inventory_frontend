/** Batch 58 — Synthetic Platform Tenant Notes transport, Phase 1 generation only.
 * Does not authenticate users or prove persistence, access control, audit durability,
 * transaction atomicity or that visibility tags constitute an ACL. */
import { expect, type Page, type Route } from '@playwright/test';
import { targetBaseURL } from './environment';
import { fulfillJson } from './tenantSession';
import { syntheticJwt, SYNTHETIC_PLATFORM_USER_ID } from './platformSession';

export const NOTE_TENANT_A='aaaaaaaa-aaaa-4aaa-8aaa-111111111111';
export const NOTE_TENANT_B='bbbbbbbb-bbbb-4bbb-8bbb-222222222222';
export const NOTE_RECORD_A='cccccccc-cccc-4ccc-8ccc-333333333333';
export const NOTE_RECORD_B='dddddddd-dddd-4ddd-8ddd-444444444444';
export const noteTenants=[{id:NOTE_TENANT_A,name:'Fixture Hotel'},{id:NOTE_TENANT_B,name:'Fixture Warehouse'}];
export const noteCategories=['general','support','billing','security','onboarding','risk','operations','handover'];
export const noteVisibilities=['internal','support','leadership'];
export type TenantNote={id:string;tenant_id:string;tenant_name:string;category:string;visibility:string;title:string;body:string;pinned:boolean;archived_at?:string|null;created_at:string;updated_at:string;created_by_email?:string|null;updated_by_email?:string|null};
export const noteRows:TenantNote[]=[
  {id:NOTE_RECORD_A,tenant_id:NOTE_TENANT_A,tenant_name:'Fixture Hotel',category:'support',visibility:'internal',title:'Fixture handover',body:'Synthetic handover context',pinned:true,archived_at:null,created_at:'2026-10-01T12:00:00Z',updated_at:'2026-10-02T12:00:00Z',created_by_email:'creator@example.test',updated_by_email:'editor@example.test'},
  {id:NOTE_RECORD_B,tenant_id:NOTE_TENANT_B,tenant_name:'Fixture Warehouse',category:'risk',visibility:'leadership',title:'Fixture archived risk',body:'Synthetic archived history',pinned:false,archived_at:'2026-10-03T12:00:00Z',created_at:'invalid-date',updated_at:'2026-10-03T12:00:00Z',created_by_email:null,updated_by_email:null}
];
export const notePermissions=['platform.dashboard.read','platform.tenants.read','platform.tenants.update','platform.billing.read','platform.sla.read','platform.incidents.read','platform.support_sessions.read'];
type Response={status:number;json:unknown};
export type NoteFixtureOptions={query?:string;permissions?:string[];notes?:TenantNote[];tenants?:typeof noteTenants;
  responses?:Record<string,Response>;delayMs?:Record<string,number>;expectHeading?:boolean;
  respond?:(method:string,path:string,body:unknown,query:URLSearchParams)=>Response|undefined;
  onCall?:(method:string,path:string,body:unknown,query:URLSearchParams)=>void};
export async function openTenantNotes(page:Page, opts:NoteFixtureOptions={}){
  targetBaseURL();
  const records:TenantNote[]=(opts.notes??noteRows).map(row=>({...row}));
  let counter=0;
  await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
  await page.route('**/platform/**',async(route:Route)=>{
    const req=route.request();if(req.isNavigationRequest())return route.continue();
    const url=new URL(req.url());const path=url.pathname.replace(/^\/api(?=\/)/,'');const method=req.method();
    let body:unknown=null;if(method!=='GET')try{body=req.postDataJSON()}catch{body=req.postData()}
    opts.onCall?.(method,path,body,url.searchParams);
    const key=`${method} ${path}`;
    if(opts.delayMs?.[key])await new Promise(resolve=>setTimeout(resolve,opts.delayMs?.[key]));
    if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'No fixture cookie'},401);
    if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'notes-fixture@example.test',role:'superadmin',is_active:true});
    if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions:opts.permissions??notePermissions});
    const dynamic=opts.respond?.(method,path,body,url.searchParams);
    if(dynamic)return fulfillJson(route,dynamic.json,dynamic.status);
    const override=opts.responses?.[key];if(override)return fulfillJson(route,override.json,override.status);
    if(path==='/platform/tenants'&&method==='GET')return fulfillJson(route,opts.tenants??noteTenants);
    if(path==='/platform/tenant-notes'&&method==='GET'){
      const filtered=records.filter(n=>(!url.searchParams.get('tenant_id')||n.tenant_id===url.searchParams.get('tenant_id'))
        &&(!url.searchParams.get('category')||n.category===url.searchParams.get('category'))
        &&(url.searchParams.get('include_archived')==='true'||!n.archived_at)
        &&(!url.searchParams.get('search')||[n.title,n.body,n.tenant_name].some(v=>v.toLowerCase().includes((url.searchParams.get('search')||'').trim().toLowerCase()))));
      filtered.sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.updated_at.localeCompare(a.updated_at));
      const offset=Number(url.searchParams.get('offset')||0);const limit=Number(url.searchParams.get('limit')||100);
      return fulfillJson(route,{notes:filtered.slice(offset,offset+limit),categories:noteCategories,visibilities:noteVisibilities});
    }
    const create=/^\/platform\/tenant-notes\/tenants\/([^/]+)$/.exec(path);
    if(method==='POST'&&create){
      const payload=body as Partial<TenantNote>;
      const tenant=(opts.tenants??noteTenants).find(x=>x.id===create[1]);
      const row:TenantNote={id:`eeeeeeee-eeee-4eee-8eee-${String(++counter).padStart(12,'0')}`,tenant_id:create[1],tenant_name:tenant?.name||create[1],category:payload.category||'general',visibility:payload.visibility||'internal',title:payload.title||'',body:payload.body||'',pinned:Boolean(payload.pinned),archived_at:null,created_at:'2026-11-04T10:00:00Z',updated_at:'2026-11-04T10:00:00Z',created_by_email:'notes-fixture@example.test',updated_by_email:'notes-fixture@example.test'};
      records.unshift(row);return fulfillJson(route,row,201);
    }
    const target=/^\/platform\/tenant-notes\/([^/]+)$/.exec(path);
    if(method==='PATCH'&&target){
      const row=records.find(n=>n.id===target[1]);if(!row)return fulfillJson(route,{message:'Note not found'},404);
      Object.assign(row,body||{}, {updated_at:'2026-11-04T10:05:00Z'});return fulfillJson(route,row);
    }
    const lifecycle=/^\/platform\/tenant-notes\/([^/]+)\/(archive|restore)$/.exec(path);
    if(method==='POST'&&lifecycle){
      const row=records.find(n=>n.id===lifecycle[1]);if(!row)return fulfillJson(route,{message:'Note not found'},404);
      row.archived_at=lifecycle[2]==='archive'?'2026-11-04T10:10:00Z':null;
      row.updated_at='2026-11-04T10:10:00Z';return fulfillJson(route,row);
    }
    return fulfillJson(route,[]);
  });
  await page.goto(`/platform/tenant-notes${opts.query?'?'+opts.query:''}`);
  if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Tenant notes',exact:true})).toBeVisible();
}
