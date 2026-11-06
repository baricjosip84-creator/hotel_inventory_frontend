/** Batch 97 — isolated synthetic Platform Sessions registry fixture.
 * All session IDs, IP addresses, tokens, account names, revocations and responses are synthetic.
 * Intercepted requests cannot establish real token invalidation, password security, DB durability,
 * audit integrity, actual identity, physical device presence, location or human activity.
 * PHASE 1 ONLY — do not compile or execute. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';

export const sessionsPath='/platform/sessions';
export const sessionSelf='a9700000-0000-4000-8000-000000000001';
export const sessionOther='a9700000-0000-4000-8000-000000000002';
export const sessionRevoked='a9700000-0000-4000-8000-000000000003';
export const sessionExpired='a9700000-0000-4000-8000-000000000004';
export const sessionUserA='a9710000-0000-4000-8000-000000000001';
export const sessionUserB='a9710000-0000-4000-8000-000000000002';
export const sessionPermissions=['platform.dashboard.read','platform.sessions.read','platform.sessions.revoke',
 'platform.users.read','platform.security.read','platform.access_reviews.read','platform.audit.read'];
export type PlatformSessionRow={id:string;platform_user_id:string|null;platform_user_email:string|null;
 platform_user_name:string|null;platform_user_role:string|null;platform_user_identity_restricted:boolean;
 platform_user_linked:boolean;revoked:boolean;is_active:boolean;is_current:boolean;
 expires_at:string;created_at:string;last_used_at:string|null;ip_address:string|null;user_agent:string|null};
const common={created_at:'2026-10-01T09:00:00Z',last_used_at:'2026-11-04T12:00:00Z',
 expires_at:'2099-12-01T12:00:00Z',ip_address:'192.0.2.10',user_agent:'Fixture Browser / 1.0',
 platform_user_role:'support',platform_user_identity_restricted:false,platform_user_linked:true,
 revoked:false,is_active:true,is_current:false};
export const currentPlatformSession:PlatformSessionRow={...common,id:sessionSelf,
 platform_user_id:SYNTHETIC_PLATFORM_USER_ID,platform_user_email:'fixture-admin@example.test',
 platform_user_name:'Current Operator',platform_user_role:'superadmin',is_current:true};
export const activePlatformSession:PlatformSessionRow={...common,id:sessionOther,
 platform_user_id:sessionUserA,platform_user_email:'other@fixture.test',platform_user_name:'Other Operator'};
export const revokedPlatformSession:PlatformSessionRow={...common,id:sessionRevoked,
 platform_user_id:sessionUserA,platform_user_email:'revoked@fixture.test',platform_user_name:'Revoked Operator',
 revoked:true,is_active:false};
export const expiredPlatformSession:PlatformSessionRow={...common,id:sessionExpired,
 platform_user_id:sessionUserB,platform_user_email:'expired@fixture.test',platform_user_name:'Expired Operator',
 expires_at:'2020-01-01T00:00:00Z',is_active:false};
export const sessionRows=[currentPlatformSession,activePlatformSession,revokedPlatformSession,expiredPlatformSession];
export const manySessions=(count:number):PlatformSessionRow[]=>Array.from({length:count},(_,i)=>({
 ...activePlatformSession,id:`${String(i+1000).padStart(8,'0')}-0000-4000-8000-${String(i+1000).padStart(12,'0')}`,
 platform_user_email:`session-${i+1}@fixture.test`,platform_user_name:`Session Operator ${String(i+1).padStart(3,'0')}`,
 ip_address:`192.0.2.${(i%240)+1}`
}));
export type SessionFixtureOptions={query?:string;permissions?:string[];records?:PlatformSessionRow[];
 expectHeading?:boolean;untracked?:boolean;legacy?:boolean;
 onCall?:(method:string,path:string,params:URLSearchParams,body:unknown)=>void;
 respond?:(method:string,path:string,params:URLSearchParams,body:unknown)=>Promise<{status?:number;json:any}|undefined>|{status?:number;json:any}|undefined;};
export async function openPlatformSessions(page:Page,opts:SessionFixtureOptions={}){
 targetBaseURL();const permissions=opts.permissions??sessionPermissions;
 let records=(opts.records??sessionRows).map(r=>({...r}));
 await page.addInitScript(t=>{
  localStorage.setItem('inventory_platform_access_token',t);
  localStorage.setItem('inventory_locale','en-GB');
 },syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const request=route.request();if(request.isNavigationRequest())return route.continue();
  const url=new URL(request.url());const path=url.pathname.replace(/^\/api(?=\/)/,'');const method=request.method();
  let body:unknown=undefined;if(!['GET','HEAD'].includes(method))try{body=request.postDataJSON();}catch{body=request.postData();}
  const query=url.searchParams;
  opts.onCall?.(method,path,query,body);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic refresh unavailable'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,
   role:'superadmin',email:'fixture-admin@example.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',
   platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=await opts.respond?.(method,path,query,body);
  if(override)return fulfillJson(route,override.json,override.status??200);
  if(path==='/platform/users'&&method==='GET')return fulfillJson(route,[
   {id:SYNTHETIC_PLATFORM_USER_ID,name:'Current Operator',email:'fixture-admin@example.test',role:'superadmin',is_active:true},
   {id:sessionUserA,name:'Other Operator',email:'other@fixture.test',role:'support',is_active:true},
   {id:sessionUserB,name:'Expired Operator',email:'expired@fixture.test',role:'platform_viewer',is_active:true}]);
  if(path===sessionsPath&&method==='GET'){
   if(!permissions.includes('platform.sessions.read'))return fulfillJson(route,{message:'Read forbidden'},403);
   if(query.get('platform_user_id')&&!permissions.includes('platform.users.read'))return fulfillJson(route,{message:'User filter forbidden'},403);
   const status=query.get('status')||'';const userId=query.get('platform_user_id')||'';
   const term=(query.get('search')||'').trim().toLowerCase();
   const matching=records.filter(r=>(!status||status===(r.revoked?'revoked':r.is_active?'active':'expired'))
    &&(!userId||userId===r.platform_user_id)
    &&(!term||[r.id,r.ip_address,r.user_agent,...(permissions.includes('platform.users.read')?
      [r.platform_user_email,r.platform_user_name,r.platform_user_role]:[])].some(x=>String(x||'').toLowerCase().includes(term))));
   const limit=Math.max(1,Math.min(100,Number(query.get('limit')||50)));
   const offset=Math.max(0,Number(query.get('offset')||0));
   const canIdentity=permissions.includes('platform.users.read');
   const visible=matching.slice(offset,offset+limit).map(r=>canIdentity?{...r}:({...r,
    platform_user_id:null,platform_user_email:null,platform_user_name:null,platform_user_role:null,
    platform_user_identity_restricted:true}));
   const tracked=records.find(r=>r.id===sessionSelf);
   const data={feature:'platform_sessions',generated_at:'2026-11-05T12:00:00Z',
    summary:{total_sessions:matching.length,active_sessions:matching.filter(x=>x.is_active).length,
     revoked_sessions:matching.filter(x=>x.revoked).length,
     expired_sessions:matching.filter(x=>!x.revoked&&!x.is_active).length},
    pagination:{limit,offset,total:matching.length,has_more:offset+visible.length<matching.length},
    current_session:{tracked:!opts.untracked&&Boolean(tracked),session_id:opts.untracked?null:sessionSelf,
     record_active:opts.untracked?null:(tracked?.is_active??false),revoked:opts.untracked?null:(tracked?.revoked??false),
     expires_at:opts.untracked?null:tracked?.expires_at??null,last_used_at:opts.untracked?null:tracked?.last_used_at??null},
    evidence_access:{platform_sessions:true,platform_user_identity:canIdentity},
    available_sources:canIdentity?['platform_sessions','platform_users']:['platform_sessions'],
    omitted_sources:canIdentity?[]:['platform_users'],evidence_complete:canIdentity,
    required_permissions_by_source:{platform_sessions:['platform.sessions.read'],platform_users:['platform.users.read']},
    truth_contract:{active_means_unrevoked_unexpired_application_session_record:true,
     active_does_not_override_platform_account_or_permission_revalidation:true,
     ip_and_user_agent_are_application_request_metadata_not_device_identity_proof:true,
     last_used_at_is_application_refresh_or_session_activity_evidence_not_human_presence_proof:true},
    sessions:visible};
   return fulfillJson(route,opts.legacy?visible:data);
  }
  const revokeMatch=path.match(/^\/platform\/sessions\/([0-9a-f-]+)\/revoke$/);
  if(revokeMatch&&method==='POST'){
   if(!permissions.includes('platform.sessions.revoke'))return fulfillJson(route,{message:'Revoke forbidden'},403);
   const existing=records.find(r=>r.id===revokeMatch[1]);
   if(!existing)return fulfillJson(route,{message:'Session not found'},404);
   if(existing.is_current)return fulfillJson(route,{message:'Current browser must sign out'},409);
   if(!existing.is_active)return fulfillJson(route,{message:'Session already inactive'},409);
   existing.revoked=true;existing.is_active=false;
   return fulfillJson(route,{id:existing.id,revoked:true,is_active:false});
  }
  return fulfillJson(route,{message:'Isolated fixture — no matching endpoint'},404);
 });
 await page.goto(`${sessionsPath}${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Platform sessions',exact:true})).toBeVisible();
}
