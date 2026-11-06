/** Batch 95 — /platform/users synthetic page/API fixture.
 * Synthetic platform identities, JWT, and intercepted writes are not proof of
 * authorization, credential hashing, session revocation, role enforcement,
 * audit durability, actual user/tenant scope or external workforce approval.
 * STRICT PHASE 1: do not compile or execute tests. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
export const usersPath='/platform/users';
export const usersAdmin=SYNTHETIC_PLATFORM_USER_ID;
export const usersAlpha='a9500000-0000-4000-8000-000000000001';
export const usersBeta='a9500000-0000-4000-8000-000000000002';
export const usersGamma='a9500000-0000-4000-8000-000000000003';
export const usersPermissions=['platform.dashboard.read','platform.users.read','platform.users.write','platform.sessions.read',
 'platform.sessions.revoke','platform.support_sessions.read','platform.support_sessions.end','platform.security.read',
 'platform.access_reviews.read','platform.role_permissions.read','platform.audit.read'];
export type PlatformUserRecord={id:string;email:string;name:string;role:string;is_active:boolean;
 failed_login_count:number;locked_until:string|null;last_login_at:string|null;password_changed_at:string|null;
 mfa_enabled:boolean;mfa_confirmed_at:string|null;created_at:string|null;updated_at:string|null;
 active_session_count:number|null;open_support_session_count:number|null};
const common={failed_login_count:0,locked_until:null,last_login_at:'2026-10-20T11:00:00Z',
 password_changed_at:'2026-09-01T09:00:00Z',mfa_enabled:true,mfa_confirmed_at:'2026-09-01T09:00:00Z',
 created_at:'2026-08-01T09:00:00Z',updated_at:'2026-10-20T12:00:00Z',active_session_count:2,open_support_session_count:0};
export const currentUser:PlatformUserRecord={...common,id:usersAdmin,email:'current-admin@fixture.test',name:'Current Superadmin',role:'superadmin',is_active:true};
export const activeUser:PlatformUserRecord={...common,id:usersAlpha,email:'alex@fixture.test',name:'Alex Operator',role:'support',is_active:true,
 mfa_enabled:false,mfa_confirmed_at:null,active_session_count:3,open_support_session_count:2,failed_login_count:2};
export const inactiveUser:PlatformUserRecord={...common,id:usersBeta,email:'beth@fixture.test',name:'Beth Disabled',role:'platform_viewer',is_active:false,
 active_session_count:0,open_support_session_count:0,last_login_at:null,password_changed_at:null};
export const lockedUser:PlatformUserRecord={...common,id:usersGamma,email:'casey@fixture.test',name:'Casey Locked',role:'security',is_active:true,
 locked_until:'2099-04-01T00:00:00Z',failed_login_count:5};
export const manyPlatformUsers=(count:number):PlatformUserRecord[]=>Array.from({length:count},(_,i)=>({...activeUser,
 id:`${String(i+1000).padStart(8,'0')}-0000-4000-8000-${String(i+1000).padStart(12,'0')}`,
 name:`Paging Operator ${String(i+1).padStart(3,'0')}`,email:`operator-${String(i+1).padStart(3,'0')}@fixture.test`}));
export type UsersOptions={query?:string;permissions?:string[];records?:PlatformUserRecord[];expectHeading?:boolean;
 onCall?:(method:string,path:string,query:URLSearchParams,body:unknown)=>void;
 respond?:(method:string,path:string,query:URLSearchParams,body:unknown)=>Promise<{status?:number;json:any}|undefined>|{status?:number;json:any}|undefined;
 legacyResponse?:boolean;};
export async function openPlatformUsers(page:Page,opts:UsersOptions={}){
 targetBaseURL();const permissions=opts.permissions??usersPermissions;
 let records=(opts.records??[currentUser,activeUser,inactiveUser,lockedUser]).map(row=>({...row}));
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),q=url.searchParams,method=req.method();
  let body:any=undefined;if(!['GET','HEAD'].includes(method)){try{body=req.postDataJSON();}catch{body=req.postData();}}
  opts.onCall?.(method,path,q,body);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic session refresh denied'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:usersAdmin,email:currentUser.email,role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:usersAdmin,role:'superadmin',permissions});
  const override=await opts.respond?.(method,path,q,body);if(override)return fulfillJson(route,override.json,override.status??200);
  if(path===usersPath&&method==='GET'){
   if(opts.legacyResponse)return fulfillJson(route,records);
   const search=(q.get('search')||'').trim().toLowerCase(),role=q.get('role'),status=q.get('status'),mfa=q.get('mfa'),userId=q.get('platform_user_id');
   const visible=records.filter(user=>(!userId||user.id===userId)&&(!search||`${user.email} ${user.name}`.toLowerCase().includes(search))
    &&(!role||user.role===role)&&(!status||(status==='active'?user.is_active&&!isLocked(user):status==='disabled'?!user.is_active:isLocked(user)))
    &&(!mfa||(mfa==='enabled'?user.mfa_enabled:!user.mfa_enabled)));
   const limit=Number(q.get('limit')||50),offset=Number(q.get('offset')||0);
   const summary={total:visible.length,active:visible.filter(x=>x.is_active).length,disabled:visible.filter(x=>!x.is_active).length,
    locked:visible.filter(isLocked).length,active_without_mfa:visible.filter(x=>x.is_active&&!x.mfa_enabled).length,
    active_superadmins:records.filter(x=>x.is_active&&x.role==='superadmin').length};
   const projects=visible.slice(offset,offset+limit).map(x=>({...x,
    active_session_count:permissions.includes('platform.sessions.read')?x.active_session_count:null,
    open_support_session_count:permissions.includes('platform.support_sessions.read')?x.open_support_session_count:null}));
   return fulfillJson(route,{users:projects,summary,pagination:{limit,offset,total:visible.length,has_more:offset+limit<visible.length},
    roles:['superadmin','support','platform_viewer','support_l1','support_l2','security','billing','ops','tenant_success','readonly_audit'],
    evidence_contract:{application_identity_registry_only:true,active_session_count_is_application_session_state:true,
     support_session_count_is_application_access_state:true,mfa_flag_does_not_prove_device_control:true}});
  }
  if(path===usersPath&&method==='POST'){
   const row:PlatformUserRecord={...common,id:'a9500000-0000-4000-8000-000000000099',email:body.email,name:body.name,
    role:body.role,is_active:true,mfa_enabled:false,mfa_confirmed_at:null};records=[...records,row];return fulfillJson(route,row,201);
  }
  const match=path.match(/^\/platform\/users\/([a-z0-9-]+)(?:\/(activate|deactivate|reset-password|revoke-sessions))?$/);
  if(match){const id=match[1],action=match[2],row=records.find(x=>x.id===id);
   if(!row)return fulfillJson(route,{message:'Synthetic user not found'},404);
   if(method==='PATCH'&&!action){Object.assign(row,{name:body.name??row.name,role:body.role??row.role,updated_at:'2026-11-05T09:00:00Z'});return fulfillJson(route,row);}
   if(method==='POST'&&action==='activate'){row.is_active=true;return fulfillJson(route,row);}
   if(method==='POST'&&action==='deactivate'){row.is_active=false;row.active_session_count=0;row.open_support_session_count=0;return fulfillJson(route,row);}
   if(method==='POST'&&action==='reset-password'){row.password_changed_at='2026-11-05T10:00:00Z';row.active_session_count=0;row.open_support_session_count=0;return fulfillJson(route,{ok:true});}
   if(method==='POST'&&action==='revoke-sessions'){row.active_session_count=0;row.open_support_session_count=0;return fulfillJson(route,{ok:true});}
  }
  return fulfillJson(route,[]);
 });
 await page.goto(`${usersPath}${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Platform Users',exact:true})).toBeVisible();
}
function isLocked(user:PlatformUserRecord){return Boolean(user.locked_until&&Date.parse(user.locked_until)>Date.now());}
