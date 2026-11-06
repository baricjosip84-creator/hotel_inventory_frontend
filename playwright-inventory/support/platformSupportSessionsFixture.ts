/** Batch 105: synthetic and isolated Platform Support Sessions fixture.
 * This is NOT evidence of actual support-token acceptance, tenant consent, SQL
 * transactions, approval independence, audit persistence, or tenant isolation. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';

export const SUPPORT_PATH='/platform/support-sessions';
export const TENANT_ALPHA='b1050000-0000-4000-8000-000000000001';
export const TENANT_BETA='b1050000-0000-4000-8000-000000000002';
export const TENANT_DISABLED='b1050000-0000-4000-8000-000000000003';
export const TENANT_ARCHIVED='b1050000-0000-4000-8000-000000000004';
export const SESSION_OWN_ACTIVE='b1050000-0000-4000-8000-000000000011';
export const SESSION_OTHER_PENDING='b1050000-0000-4000-8000-000000000012';
export const SESSION_OWN_PENDING='b1050000-0000-4000-8000-000000000013';
export const SESSION_ENDED='b1050000-0000-4000-8000-000000000014';
export const SESSION_REJECTED='b1050000-0000-4000-8000-000000000015';
export const SESSION_EXPIRED='b1050000-0000-4000-8000-000000000016';
const OTHER_USER='b1050000-0000-4000-8000-000000000099';
export const SUPPORT_PERMISSIONS=[
 'platform.dashboard.read','platform.support_sessions.read','platform.support_sessions.start',
 'platform.support_sessions.end','platform.support_sessions.approve','platform.tenants.read',
 'platform.users.read','platform.audit.read'];
export type SupportPolicy={support_enabled:boolean;require_ticket_reference:boolean;require_customer_consent:boolean;
 emergency_admin_requires_approval:boolean;max_duration_minutes:number;allowed_access_levels:string[]};
export type Tenant={id:string;name:string;status:string;support_policy:Partial<SupportPolicy>};
export const tenantsFixture:Tenant[]=[
 {id:TENANT_ALPHA,name:'Alpha Fixture',status:'active',support_policy:{support_enabled:true,require_ticket_reference:true,
   require_customer_consent:false,emergency_admin_requires_approval:true,max_duration_minutes:120,
   allowed_access_levels:['read_only','inventory_support','emergency_admin']}},
 {id:TENANT_BETA,name:'Beta Fixture',status:'active',support_policy:{support_enabled:true,require_ticket_reference:false,
   require_customer_consent:true,emergency_admin_requires_approval:false,max_duration_minutes:45,
   allowed_access_levels:['read_only','procurement_support','emergency_admin']}},
 {id:TENANT_DISABLED,name:'Disabled Fixture',status:'active',support_policy:{support_enabled:false,require_ticket_reference:false}},
 {id:TENANT_ARCHIVED,name:'Archived Fixture',status:'archived',support_policy:{support_enabled:true,require_ticket_reference:false}}
];
export type SupportRecord={id:string;platform_user_id:string|null;platform_user_email:string|null;platform_user_name:string|null;
 platform_user_identity_restricted:boolean;requester_is_current_user:boolean;tenant_id:string|null;
 tenant_name:string|null;tenant_identity_restricted:boolean;tenant_linked:boolean;
 reason:string;access_level:'read_only'|'inventory_support'|'procurement_support'|'emergency_admin';ticket_reference:string|null;
 customer_consent_note:string|null;status:'active'|'pending_approval'|'ended'|'expired'|'rejected';
 started_at:string;expires_at:string;ended_at:string|null;ended_by_platform_user_email:string|null;
 approved_at:string|null;approved_by_platform_user_email:string|null;approval_note:string|null;
 rejected_at:string|null;rejected_by_platform_user_email:string|null;rejection_reason:string|null};
const base={platform_user_id:SYNTHETIC_PLATFORM_USER_ID,platform_user_email:'operator@fixture.test',platform_user_name:'Synthetic Operator',
 platform_user_identity_restricted:false,requester_is_current_user:true,tenant_id:TENANT_ALPHA,tenant_name:'Alpha Fixture',
 tenant_identity_restricted:false,tenant_linked:true,reason:'Synthetic support inspection request',access_level:'read_only' as const,
 ticket_reference:'TICKET-105',customer_consent_note:null,status:'active' as const,
 started_at:'2026-11-05T08:00:00Z',expires_at:'2099-11-05T10:00:00Z',ended_at:null,ended_by_platform_user_email:null,
 approved_at:null,approved_by_platform_user_email:null,approval_note:null,rejected_at:null,rejected_by_platform_user_email:null,rejection_reason:null};
export const supportRecords:SupportRecord[]=[
 {...base,id:SESSION_OWN_ACTIVE},
 {...base,id:SESSION_OTHER_PENDING,platform_user_id:OTHER_USER,platform_user_email:'approver@fixture.test',
  platform_user_name:'Other Operator',requester_is_current_user:false,reason:'Emergency service remediation',
  access_level:'emergency_admin',status:'pending_approval'},
 {...base,id:SESSION_OWN_PENDING,reason:'Own emergency maintenance',access_level:'emergency_admin',status:'pending_approval'},
 {...base,id:SESSION_ENDED,tenant_id:TENANT_BETA,tenant_name:'Beta Fixture',status:'ended',
  ended_at:'2026-11-04T10:00:00Z',ended_by_platform_user_email:'operator@fixture.test'},
 {...base,id:SESSION_REJECTED,status:'rejected',platform_user_id:OTHER_USER,platform_user_name:'Other Operator',
  platform_user_email:'approver@fixture.test',requester_is_current_user:false,
  rejected_at:'2026-11-04T08:00:00Z',rejected_by_platform_user_email:'owner@fixture.test',rejection_reason:'Insufficient customer evidence'},
 {...base,id:SESSION_EXPIRED,status:'expired',expires_at:'2020-01-01T00:00:00Z',
  platform_user_id:OTHER_USER,platform_user_email:'approver@fixture.test',platform_user_name:'Other Operator',requester_is_current_user:false}
];
export type SupportFixtureOptions={permissions?:string[];tenants?:Tenant[];records?:SupportRecord[];
 overrideResponse?:(method:string,path:string,body:any,query:URLSearchParams)=>{status?:number;json:any}|undefined|Promise<{status?:number;json:any}|undefined>;
 onCall?:(method:string,path:string,body:any,query:URLSearchParams)=>void;
 startAt?:string;expectHeading?:boolean};
export function supportRecordResponse(records:SupportRecord[],perms:string[]=SUPPORT_PERMISSIONS,query=new URLSearchParams()){
 const canTenants=perms.includes('platform.tenants.read'),canUsers=perms.includes('platform.users.read');
 const search=(query.get('search')||'').toLowerCase(),status=query.get('status')||'',tenant=query.get('tenant_id')||'';
 const filtered=records.filter(r=>(!status||r.status===status)&&(!tenant||r.tenant_id===tenant)&&
 (!search||[r.reason,r.ticket_reference,r.access_level,r.status,
  ...(canTenants?[r.tenant_name]:[]),...(canUsers?[r.platform_user_name,r.platform_user_email]:[])]
  .some(s=>String(s||'').toLowerCase().includes(search))));
 const rawOffset=Number(query.get('offset')||0),offset=Number.isFinite(rawOffset)?Math.max(0,rawOffset):0;
 const pageRows=filtered.slice(offset,offset+50).map(r=>({
  ...r,tenant_name:canTenants?r.tenant_name:null,tenant_identity_restricted:!canTenants,
  platform_user_email:canUsers?r.platform_user_email:null,platform_user_name:canUsers?r.platform_user_name:null,
  platform_user_id:canUsers?r.platform_user_id:null,platform_user_identity_restricted:!canUsers,
  approved_by_platform_user_email:canUsers?r.approved_by_platform_user_email:null,
  rejected_by_platform_user_email:canUsers?r.rejected_by_platform_user_email:null,
  ended_by_platform_user_email:canUsers?r.ended_by_platform_user_email:null}));
 return {feature:'platform_support_sessions',generated_at:'2026-11-05T12:00:00Z',
  summary:{total_sessions:filtered.length,active_sessions:filtered.filter(x=>x.status==='active').length,
   pending_approval_sessions:filtered.filter(x=>x.status==='pending_approval').length,
   expired_sessions:filtered.filter(x=>x.status==='expired').length,
   ended_sessions:filtered.filter(x=>x.status==='ended').length,
   rejected_sessions:filtered.filter(x=>x.status==='rejected').length,
   active_emergency_admin_sessions:filtered.filter(x=>x.status==='active'&&x.access_level==='emergency_admin').length},
  evidence_access:{tenant_identity:canTenants,platform_user_identity:canUsers},
  available_sources:['support_sessions',...(canTenants?['tenants']:[]),...(canUsers?['platform_users']:[])],
  omitted_sources:[...(!canTenants?['tenants']:[]),...(!canUsers?['platform_users']:[])],
  evidence_complete:canTenants&&canUsers,
  required_permissions_by_source:{support_sessions:['platform.support_sessions.read'],tenants:['platform.tenants.read'],platform_users:['platform.users.read']},
  truth_contract:{recorded_customer_consent_note_is_not_external_proof_of_customer_consent:true,
   active_record_is_not_proof_a_token_was_issued_or_used:true},
  pagination:{limit:50,offset,total:filtered.length,has_more:offset+50<filtered.length},sessions:pageRows};
}
export async function openPlatformSupportSessions(page:Page,opts:SupportFixtureOptions={}){
 targetBaseURL();const permissions=opts.permissions??SUPPORT_PERMISSIONS;
 let records=[...(opts.records??supportRecords)];const tenants=[...(opts.tenants??tenantsFixture)];
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method();
  let body:any;try{body=req.postDataJSON()}catch{body=undefined}
  opts.onCall?.(method,path,body,url.searchParams);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic refresh not available'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'operator@fixture.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const response=await opts.overrideResponse?.(method,path,body,url.searchParams);
  if(response)return fulfillJson(route,response.json,response.status??200);
  if(method==='GET'&&path==='/platform/tenants')return fulfillJson(route,tenants);
  if(method==='GET'&&path===SUPPORT_PATH)return fulfillJson(route,supportRecordResponse(records,permissions,url.searchParams));
  if(method==='POST'&&path===SUPPORT_PATH){const id='b1050000-0000-4000-8000-000000000077';
   const emergency=body.access_level==='emergency_admin';const row:SupportRecord={...base,id,
    tenant_id:body.tenant_id,tenant_name:tenants.find(t=>t.id===body.tenant_id)?.name||null,
    reason:body.reason,access_level:body.access_level,ticket_reference:body.ticket_reference,
    customer_consent_note:body.customer_consent_note,status:emergency?'pending_approval':'active'};
   records=[row,...records];return fulfillJson(route,row,201);
  }
  const match=path.match(/^\/platform\/support-sessions\/([^/]+)\/(approve|reject|end|access-token)$/);
  if(method==='POST'&&match){const id=match[1],action=match[2];
   if(action==='access-token')return fulfillJson(route,{accessToken:'synthetic-unsupported-token'});
   const old=records.find(r=>r.id===id);if(!old)return fulfillJson(route,{message:'Not found'},404);
   const row:SupportRecord={...old,status:action==='approve'?'active':action==='reject'?'rejected':'ended',
    approval_note:action==='approve'?(body?.approval_note??null):old.approval_note,
    approved_at:action==='approve'?'2026-11-05T13:00:00Z':old.approved_at,
    rejection_reason:action==='reject'?body?.rejection_reason:old.rejection_reason,
    rejected_at:action==='reject'?'2026-11-05T13:00:00Z':old.rejected_at,
    ended_at:action==='end'?'2026-11-05T13:00:00Z':old.ended_at};
   records=records.map(r=>r.id===id?row:r);return fulfillJson(route,row);
  }
  return fulfillJson(route,{message:'Missing synthetic route'},404);
 });
 await page.goto(opts.startAt??SUPPORT_PATH);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Support sessions',exact:true})).toBeVisible();
}
