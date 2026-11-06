/** Batch 104 — synthetic Platform My Security fixture; uncompiled and unexecuted.
 * No real passwords or TOTP secrets, admin actions, identity, session revocation, database
 * changes, rate limiting, audit, hardware backing or physical device assurance are verified. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';

export const securityPath='/platform/security';
export const SECURITY_USER_LOCKED='b1040000-0000-4000-8000-000000000001';
export const SECURITY_USER_ACTIVE='b1040000-0000-4000-8000-000000000002';
export const SECURITY_SESSION_ID='b1040000-0000-4000-8000-000000000003';
export const securityPermissions=['platform.dashboard.read','platform.security.read','platform.security.write',
 'platform.users.read','platform.sessions.read','platform.sessions.revoke','platform.audit.read',
 'platform.access_reviews.read','platform.role_permissions.read'];
export type SelfSecurity={email:string;name:string;role:string;failed_login_count:number;locked_until:string|null;
 last_login_at:string|null;password_changed_at:string|null;mfa_enabled:boolean;mfa_confirmed_at:string|null;
 active_sessions:number;truth_contract:{mfa_enabled_means_application_totp_is_enforced_at_platform_login:boolean;
 mfa_state_does_not_prove_device_identity_or_hardware_backing:boolean;
 active_sessions_are_application_session_records_not_proof_of_human_presence:boolean}};
export const securitySelf:SelfSecurity={email:'operator@fixture.test',name:'Synthetic Operator',role:'superadmin',
 failed_login_count:1,locked_until:null,last_login_at:'2026-11-03T10:00:00Z',
 password_changed_at:'2026-10-01T10:00:00Z',mfa_enabled:false,mfa_confirmed_at:null,active_sessions:2,
 truth_contract:{mfa_enabled_means_application_totp_is_enforced_at_platform_login:true,
 mfa_state_does_not_prove_device_identity_or_hardware_backing:true,
 active_sessions_are_application_session_records_not_proof_of_human_presence:true}};
export const securityAdminUser={id:SECURITY_USER_LOCKED,email:'locked@fixture.test',name:'Locked Operator',role:'support',
 is_active:true,failed_login_count:5,locked_until:'2099-12-01T00:00:00Z',last_login_at:null,
 password_changed_at:null,mfa_enabled:true,active_sessions:2,risk_flags:['locked','repeated_failed_login','stale_password_review']};
export const securityAdminUser2={...securityAdminUser,id:SECURITY_USER_ACTIVE,email:'review@fixture.test',
 name:'Review Operator',locked_until:null,failed_login_count:0,mfa_enabled:false,active_sessions:0,
 risk_flags:['mfa_off','never_logged_in']};
export const securityAdminSession={id:SECURITY_SESSION_ID,platform_user_id:SECURITY_USER_LOCKED,
 email:'locked@fixture.test',name:'Locked Operator',role:'support',platform_user_identity_restricted:false,
 ip_address:'192.0.2.9',user_agent:'Fixture Browser',created_at:'2026-11-01T10:00:00Z',
 last_used_at:'2026-11-02T10:00:00Z',expires_at:'2099-12-01T10:00:00Z'};
export type SecurityAdminUser=Omit<typeof securityAdminUser,'active_sessions'|'locked_until'>&{active_sessions:number|null;locked_until:string|null};
export type SecurityAdminSession=Omit<typeof securityAdminSession,'platform_user_id'|'email'|'name'|'role'>&{platform_user_id:string|null;email:string|null;name:string|null;role:string|null};
export type SecurityAdmin={generated_at:string;summary:{total_users:number|null;active_users:number|null;
 locked_users:number|null;users_without_mfa:number|null;users_with_failed_logins:number|null;active_sessions:number|null};
 users:SecurityAdminUser[];active_sessions:SecurityAdminSession[];evidence_access:{platform_users:boolean;platform_sessions:boolean};
 available_sources:string[];omitted_sources:string[];evidence_complete:boolean;limits:{users:number;active_sessions:number};
 truncated:{users:boolean|null;active_sessions:boolean|null};risk_policy:{password_review_age_days:number;
 password_age_is_review_signal_not_enforced_expiry:boolean;mfa_flag_is_application_totp_state_not_external_identity_assurance:boolean;
 session_records_do_not_prove_device_or_human_identity:boolean}};
export function securityAdminFixture(perms:string[]=securityPermissions):SecurityAdmin{
 const users=perms.includes('platform.users.read'),sessions=perms.includes('platform.sessions.read');
 return {generated_at:'2026-11-05T10:00:00Z',summary:{total_users:users?2:null,active_users:users?2:null,
 locked_users:users?1:null,users_without_mfa:users?1:null,users_with_failed_logins:users?1:null,active_sessions:sessions?1:null},
 users:users?[{...securityAdminUser,active_sessions:sessions?2:null},{...securityAdminUser2,active_sessions:sessions?0:null}]:[],
 active_sessions:sessions?[{...securityAdminSession,platform_user_id:users?SECURITY_USER_LOCKED:null,
 email:users?'locked@fixture.test':null,name:users?'Locked Operator':null,role:users?'support':null,
 platform_user_identity_restricted:!users}]:[],
 evidence_access:{platform_users:users,platform_sessions:sessions},
 available_sources:[...(users?['platform_users']:[]),...(sessions?['platform_sessions']:[])],
 omitted_sources:[...(!users?['platform_users']:[]),...(!sessions?['platform_sessions']:[])],
 evidence_complete:users&&sessions,limits:{users:50,active_sessions:50},truncated:{users:false,active_sessions:false},
 risk_policy:{password_review_age_days:180,password_age_is_review_signal_not_enforced_expiry:true,
 mfa_flag_is_application_totp_state_not_external_identity_assurance:true,
 session_records_do_not_prove_device_or_human_identity:true}};
}
export type SecurityFixtureOptions={permissions?:string[];self?:Partial<SelfSecurity>;admin?:Partial<SecurityAdmin>;
 expectHeading?:boolean;onCall?:(method:string,path:string,body:any)=>void;
 respond?:(method:string,path:string,body:any)=>{status?:number;json:any}|undefined|Promise<{status?:number;json:any}|undefined>};
export async function openPlatformSecurity(page:Page,opts:SecurityFixtureOptions={}){
 targetBaseURL();const permissions=opts.permissions??securityPermissions;
 let self={...securitySelf,...opts.self};let admin={...securityAdminFixture(permissions),...opts.admin};
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method();
  let body:any;try{body=req.postDataJSON()}catch{body=undefined}
  opts.onCall?.(method,path,body);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic session renewal unsupported'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:self.email,role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=await opts.respond?.(method,path,body);if(override)return fulfillJson(route,override.json,override.status??200);
  if(method==='GET'&&path===securityPath+'/me')return fulfillJson(route,self);
  if(method==='GET'&&path===securityPath+'/admin')return fulfillJson(route,
   permissions.includes('platform.security.read')?admin:{message:'Forbidden'},permissions.includes('platform.security.read')?200:403);
  if(method==='POST'&&path===securityPath+'/me/change-password')return fulfillJson(route,{other_sessions_revoked:1});
  if(method==='POST'&&path===securityPath+'/me/mfa/setup')return fulfillJson(route,{secret:'JBSWY3DPEHPK3PXP',
   otpauth_url:'otpauth://totp/fixture%3Aoperator%40fixture.test?secret=JBSWY3DPEHPK3PXP&issuer=Fixture',
   algorithm:'SHA1',digits:6,period_seconds:30});
  if(method==='POST'&&path===securityPath+'/me/mfa/confirm'){
   self={...self,mfa_enabled:true,mfa_confirmed_at:'2026-11-05T10:00:00Z'};
   return fulfillJson(route,{mfa_enabled:true,other_sessions_revoked:1});
  }
  if(method==='POST'&&path===securityPath+'/me/mfa/disable'){
   self={...self,mfa_enabled:false,mfa_confirmed_at:null};
   return fulfillJson(route,{mfa_enabled:false,other_sessions_revoked:1});
  }
  const unlock=path.match(/^\/platform\/security\/admin\/users\/([^/]+)\/(unlock|clear-mfa)$/);
  if(method==='POST'&&unlock){
   if(!permissions.includes('platform.security.write')||!permissions.includes('platform.users.read')||
    (unlock[2]==='clear-mfa'&&!permissions.includes('platform.sessions.revoke')))return fulfillJson(route,{message:'Forbidden'},403);
   if(unlock[2]==='unlock'){
    admin={...admin,users:admin.users.map(u=>u.id===unlock[1]?{...u,locked_until:null,risk_flags:u.risk_flags.filter(x=>x!=='locked')}:u)};
    return fulfillJson(route,{id:unlock[1],unlocked:true});
   }
   admin={...admin,users:admin.users.map(u=>u.id===unlock[1]?{...u,mfa_enabled:false}:u)};
   return fulfillJson(route,{sessions_revoked:2});
  }
  return fulfillJson(route,{message:'No fixture route'},404);
 });
 await page.goto('/platform/security');
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'My Security',exact:true})).toBeVisible();
}
