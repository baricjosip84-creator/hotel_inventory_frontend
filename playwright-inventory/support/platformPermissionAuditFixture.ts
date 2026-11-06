/** Batch 83 — source-traced synthetic Platform Permission Audit read-only fixture.
 * Intercepted GET and artificial JWT cannot verify PostgreSQL, authorization, external account security or tenant isolation. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';

export const permissionAuditEndpoint='/platform/permission-audit/hardening';
export const auditPermissions=['platform.dashboard.read','platform.access_reviews.read','platform.users.read','platform.sessions.read',
 'platform.support_sessions.read','platform.role_permissions.read','platform.api_keys.read','platform.tenants.read',
 'platform.security.read','platform.audit.read'];
export const userA={id:'b8300000-0000-4000-8000-000000000001',email:'security-owner@fixture.test',name:'Fixture Security',
 role:'security',is_active:true,mfa_enabled:false,active_sessions:7,open_support_sessions:1,permission_count:35,
 write_permission_count:8,risk_flags:['privileged_role','write_permissions','mfa_missing','session_sprawl','active_support_access'],review_required:true};
export const userB={...userA,id:'b8300000-0000-4000-8000-000000000002',email:'auditor@fixture.test',name:'Fixture Auditor',
 role:'auditor',mfa_enabled:true,active_sessions:0,open_support_sessions:0,permission_count:12,
 write_permission_count:0,risk_flags:[],review_required:false};
export const apiKeyA={id:'b8400000-0000-4000-8000-000000000001',name:'Fixture high privilege API key',tenant_name:'Fixture Tenant Alpha',
 tenant_identity_available:true,scope_count:3,allowed_ip_count:0,expires_at:null,last_used_at:null,
 risk_flags:['no_expiration','no_ip_allowlist','never_used'],review_required:true};
export const apiKeyB={...apiKeyA,id:'b8400000-0000-4000-8000-000000000002',name:'Fixture scoped API key',tenant_name:'Fixture Tenant Beta',
 scope_count:1,allowed_ip_count:2,expires_at:'2035-01-12T09:00:00.000Z',last_used_at:'2026-11-02T10:00:00.000Z',risk_flags:[],review_required:false};
export type PermissionAuditUser=typeof userA&Record<string,any>;
export type PermissionAuditKey=typeof apiKeyA&Record<string,any>;
export const manyAuditUsers=(n:number):PermissionAuditUser[]=>Array.from({length:n},(_,i)=>({...userA,
 id:`${String(i+1).padStart(8,'0')}-0000-4000-8000-${String(i+1).padStart(12,'0')}`,email:`fixture-user-${String(i+1).padStart(3,'0')}@fixture.test`}));
export const manyAuditKeys=(n:number):PermissionAuditKey[]=>Array.from({length:n},(_,i)=>({...apiKeyA,
 id:`${String(i+1).padStart(8,'0')}-0000-4000-8001-${String(i+1).padStart(12,'0')}`,name:`Fixture key ${String(i+1).padStart(3,'0')}`}));
export const sourceGrants:Record<string,string>={platform_users:'platform.users.read',platform_sessions:'platform.sessions.read',
 support_sessions:'platform.support_sessions.read',role_permissions:'platform.role_permissions.read',
 api_keys:'platform.api_keys.read',tenant_identity:'platform.tenants.read'};
export const sourceFamilies=['access_reviews',...Object.keys(sourceGrants)];
export type AuditOptions={query?:string;permissions?:string[];users?:PermissionAuditUser[];keys?:PermissionAuditKey[];
 response?:{status?:number;json:any};respond?:(method:string,path:string,params:URLSearchParams)=>{status?:number;json:any}|undefined|Promise<{status?:number;json:any}|undefined>;
 onCall?:(method:string,path:string,params:URLSearchParams)=>void;expectHeading?:boolean;
 summaryOverride?:Record<string,number|null>;posture?:string;};
export async function openPermissionAudit(page:Page,opts:AuditOptions={}){
 targetBaseURL();const permissions=opts.permissions??auditPermissions;
 const access={access_reviews:true,...Object.fromEntries(Object.entries(sourceGrants).map(([s,permission])=>[s,permissions.includes(permission)]))} as Record<string,boolean>;
 const users=opts.users??[userA,userB],keys=opts.keys??[apiKeyA,apiKeyB];
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const request=route.request();if(request.isNavigationRequest())return route.continue();
  const u=new URL(request.url()),path=u.pathname.replace(/^\/api(?=\/)/,''),q=u.searchParams,method=request.method();
  opts.onCall?.(method,path,q);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic refresh denied'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'audit-operator@fixture.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions});
  const override=(await opts.respond?.(method,path,q))??(path===permissionAuditEndpoint?opts.response:undefined);
  if(override)return fulfillJson(route,override.json,override.status??200);
  if(method==='GET'&&path===permissionAuditEndpoint){
   const search=(q.get('search')||'').trim().toLowerCase();
   const userLimit=Number(q.get('user_limit')||50),userOffset=Number(q.get('user_offset')||0),
    keyLimit=Number(q.get('api_key_limit')||50),keyOffset=Number(q.get('api_key_offset')||0);
   const available=sourceFamilies.filter(s=>access[s]),omitted=sourceFamilies.filter(s=>!access[s]);
   const visibleUsers=access.platform_users?users.filter(x=>!search||`${x.email} ${x.name||''} ${x.role}`.toLowerCase().includes(search)):[];
   const visibleKeys=access.api_keys?keys.filter(x=>!search||`${x.name} ${access.tenant_identity?x.tenant_name||'':''}`.toLowerCase().includes(search)):[];
   const redactedUsers=visibleUsers.slice(userOffset,userOffset+userLimit).map(user=>({...user,
    ...(!access.platform_sessions?{active_sessions:null}:{}),...(!access.support_sessions?{open_support_sessions:null}:{}),
    ...(!access.role_permissions?{permission_count:null,write_permission_count:null,risk_flags:user.risk_flags.filter((x:string)=>x!=='write_permissions')}: {})}));
   const redactedKeys=visibleKeys.slice(keyOffset,keyOffset+keyLimit).map(key=>({...key,
    ...(!access.tenant_identity?{tenant_name:null,tenant_identity_available:false}:{})}));
   const sum={total_platform_users:access.platform_users?visibleUsers.length:null,
    privileged_platform_users:access.platform_users?visibleUsers.filter(x=>['superadmin','security','ops','support','support_l2'].includes(x.role)).length:null,
    users_without_mfa:access.platform_users?visibleUsers.filter(x=>x.is_active&&!x.mfa_enabled).length:null,
    users_requiring_review:access.platform_users?visibleUsers.filter(x=>x.review_required).length:null,
    active_platform_sessions:access.platform_users&&access.platform_sessions?visibleUsers.reduce((n,x)=>n+(x.active_sessions||0),0):null,
    active_support_access_users:access.platform_users&&access.support_sessions?visibleUsers.filter(x=>(x.open_support_sessions||0)>0).length:null,
    active_api_keys:access.api_keys?visibleKeys.length:null,
    api_keys_requiring_review:access.api_keys?visibleKeys.filter(x=>x.review_required).length:null,
    api_keys_without_expiration:access.api_keys?visibleKeys.filter(x=>!x.expires_at).length:null,
    api_keys_without_ip_allowlist:access.api_keys?visibleKeys.filter(x=>x.allowed_ip_count===0).length:null,
    open_access_reviews:2,overdue_access_reviews:1,pending_access_review_items:3,...opts.summaryOverride};
   const result={feature:'permission_audit_hardening',phase:18,step:582,posture:opts.posture??(omitted.length?'permission_audit_partial_evidence':'permission_audit_attention_required'),
    evidence_complete:omitted.length===0,available_sources:available,omitted_sources:omitted,evidence_access:access,summary:sum,
    pagination:{platform_users:{limit:userLimit,offset:userOffset,total:visibleUsers.length,has_more:userOffset+userLimit<visibleUsers.length},
     api_keys:{limit:keyLimit,offset:keyOffset,total:visibleKeys.length,has_more:keyOffset+keyLimit<visibleKeys.length}},
    filters:{search},governance_controls:{read_only:true,mutation_owner:'platform_users_platform_sessions_api_keys_access_reviews',
     source_routes:['/api/platform/users','/api/platform/sessions','/api/platform/api-keys','/api/platform/access-reviews'],
     recommended_review_scopes:['platform_users','api_keys','tenant_support','mixed']},
    evidence_contract:{application_evidence_only:true,omitted_sources_are_not_counted_as_zero:true,partial_evidence_never_reports_governed:true,
     permission_audit_does_not_prove_access_was_removed_or_external_controls_are_effective:true},
    platform_users:redactedUsers,api_keys:redactedKeys};
   return fulfillJson(route,result);
  }
  return fulfillJson(route,[]);
 });
 await page.goto(`/platform/permission-audit${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Permission audit',exact:true})).toBeVisible();
}
