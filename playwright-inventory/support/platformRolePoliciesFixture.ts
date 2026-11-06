/** Batch 96 — isolated synthetic /platform/permissions policy fixture.
 * Synthetic role policies do NOT prove real-time authorization, DB revisions, audit
 * persistence or support-session revocation. STRICT PHASE 1 — DO NOT RUN. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
export const rolePolicyPath='/platform/permissions';
export const rolePolicyRights=['platform.dashboard.read','platform.role_permissions.read','platform.role_permissions.write',
 'platform.users.read','platform.access_reviews.read','platform.audit.read'];
export const rolePolicyCatalog=[
 {permission:'platform.dashboard.read',group:'dashboard',label:'Dashboard Read'},
 {permission:'platform.users.read',group:'users',label:'Users Read'},
 {permission:'platform.users.write',group:'users',label:'Users Write'},
 {permission:'platform.audit.read',group:'audit',label:'Audit Read'},
 {permission:'platform.access_reviews.read',group:'access_reviews',label:'Access Reviews Read'},
 {permission:'platform.role_permissions.read',group:'role_permissions',label:'Role Permissions Read'},
 {permission:'platform.role_permissions.write',group:'role_permissions',label:'Role Permissions Write'}
];
export type RolePolicy={role:string;role_kind:'built_in';editable:boolean;default_permissions:string[];
 effective_permissions:string[];locked_permissions:string[];forbidden_permissions:string[];
 override_count:number;is_default:boolean;revision:string;user_count:number};
const REVA='a'.repeat(64),REVB='b'.repeat(64);
const fixed=(role:string,defaults:string[],editable=true):RolePolicy=>({role,role_kind:'built_in',editable,
 default_permissions:defaults,effective_permissions:[...defaults],locked_permissions:editable?['platform.dashboard.read']:rolePolicyCatalog.map(x=>x.permission),
 forbidden_permissions:editable?['platform.role_permissions.read','platform.role_permissions.write']:[],
 override_count:0,is_default:true,revision:REVA,user_count:2});
export const rolePolicySupport=fixed('support',['platform.dashboard.read','platform.users.read']);
export const rolePolicyViewer=fixed('platform_viewer',['platform.dashboard.read']);
export const rolePolicySuperadmin=fixed('superadmin',rolePolicyCatalog.map(x=>x.permission),false);
export const overriddenSupport:RolePolicy={...rolePolicySupport,effective_permissions:[...rolePolicySupport.effective_permissions,'platform.audit.read'],override_count:1,is_default:false};
export type RolePoliciesOptions={permissions?:string[];roles?:RolePolicy[];expectHeading?:boolean;
 onCall?:(method:string,path:string,body:unknown)=>void;
 respond?:(method:string,path:string,body:unknown)=>Promise<{json:any;status?:number}|undefined>|{json:any;status?:number}|undefined;};
export async function openRolePolicies(page:Page,options:RolePoliciesOptions={}){
 targetBaseURL();const permissions=options.permissions??rolePolicyRights;
 let roles=(options.roles??[rolePolicySuperadmin,rolePolicySupport,rolePolicyViewer]).map(r=>({...r,
  default_permissions:[...r.default_permissions],effective_permissions:[...r.effective_permissions]}));
 await page.addInitScript(t=>{localStorage.setItem('inventory_platform_access_token',t);
  localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const request=route.request();if(request.isNavigationRequest())return route.continue();
  const path=new URL(request.url()).pathname.replace(/^\/api(?=\/)/,'');const method=request.method();
  let body:any=undefined;if(!['GET','HEAD'].includes(method))try{body=request.postDataJSON();}catch{body=request.postData();}
  options.onCall?.(method,path,body);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic auth refresh unavailable'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'policy@fixture.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions});
  const override=await options.respond?.(method,path,body);
  if(override)return fulfillJson(route,override.json,override.status??200);
  if(path===rolePolicyPath&&method==='GET')return fulfillJson(route,{
   scope:'platform',editable_roles:roles.filter(r=>r.editable).map(r=>r.role),permission_catalog:rolePolicyCatalog,
   roles,governance:{role_model:'fixed_roles_with_platform_overrides',superadmin_immutable:true,
    superadmin_only_management:true,stale_write_protection:true,active_requests_reauthorize_against_current_policy:true,
    support_sessions_closed_when_start_permission_removed:true},
   generated_at:'2026-11-05T11:00:00Z',evidence_contract:{application_authorization_policy_only:true,
    effective_permissions_apply_on_each_platform_request:true,
    permission_assignment_does_not_prove_external_system_access:true}});
  const match=path.match(/^\/platform\/permissions\/([a-z0-9_]+)$/);
  if(match){const role=roles.find(r=>r.role===match[1]);
   if(!role||!role.editable)return fulfillJson(route,{message:'Policy role cannot be edited'},403);
   if(body?.expected_revision!==role.revision)return fulfillJson(route,{code:'PLATFORM_ROLE_POLICY_STALE',message:'Policy revision stale'},409);
   if(method==='PUT'){
    const updated=Array.isArray(body.permissions)?[...new Set<string>(body.permissions as string[])].sort():role.default_permissions;
    role.effective_permissions=updated;role.override_count=updated.filter(x=>!role.default_permissions.includes(x)).length+
     role.default_permissions.filter(x=>!updated.includes(x)).length;
    role.is_default=role.override_count===0;role.revision=REVB;
    return fulfillJson(route,role);
   }
   if(method==='DELETE'){role.effective_permissions=[...role.default_permissions];role.override_count=0;role.is_default=true;role.revision=REVB;return fulfillJson(route,role);}
  }
  return fulfillJson(route,{message:'Unmocked synthetic endpoint'},404);
 });
 await page.goto(rolePolicyPath);
 if(options.expectHeading!==false)await expect(page.getByRole('heading',{name:'Platform Permissions',exact:true})).toBeVisible();
}
