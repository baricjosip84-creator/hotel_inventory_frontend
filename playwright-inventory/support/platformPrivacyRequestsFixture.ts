/** Batch 86 — synthetic Platform Privacy Requests registry fixture (GENERATED_UNRUN).
 * Intercepted UI transitions DO NOT prove verified identity, actual legal-right fulfillment,
 * persisted PostgreSQL state, backend RBAC, tenant isolation, or external recipient delivery. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';

export const privacyRoot='/platform/privacy-requests';
export const privacyTenant='b8600000-0000-4000-8000-000000000001';
export const privacyOperator='b8600000-0000-4000-8000-000000000002';
export const privacyInactive='b8600000-0000-4000-8000-000000000003';
export const privacyId='b8600000-0000-4000-8000-000000000011';
export const waitingId='b8600000-0000-4000-8000-000000000012';
export const closedId='b8600000-0000-4000-8000-000000000013';
export const privacyTypes=['access','export','deletion','correction','consent','restriction','objection','other'];
export const privacyStatuses=['intake','verifying','in_progress','waiting_tenant','fulfilled','rejected','cancelled'];
export const privacyPriorities=['low','normal','high','urgent'];
export const privacyPermissions=['platform.dashboard.read','platform.privacy.read','platform.privacy.write','platform.tenants.read',
 'platform.users.read','platform.audit.read','platform.compliance.read','platform.access_reviews.read'];
export const intakeRequest={id:privacyId,tenant_id:privacyTenant,tenant_name:'Fixture Tenant Alpha',tenant_present:true,
 request_type:'access',status:'intake',priority:'high',requester_name:'Synthetic Requester',requester_email:'requester@fixture.test',
 subject_identifier:'fixture-subject-1',summary:'Access evidence request (synthetic)',due_at:'2035-01-01T10:00:00Z',
 assigned_platform_user_id:privacyOperator,assignee_email:'operator@fixture.test',assignee_present:true,
 created_by_platform_user_id:privacyOperator,created_by_email:'operator@fixture.test',creator_present:true,
 verified_at:null,verified_by_platform_user_id:null,verified_by_email:null,verifier_present:false,
 completed_at:null,completed_by_platform_user_id:null,completed_by_email:null,completer_present:false,
 resolution_notes:null,rejection_reason:null,is_overdue:false,created_at:'2026-10-10T10:00:00Z',updated_at:'2026-10-10T10:00:00Z'};
export const waitingRequest={...intakeRequest,id:waitingId,request_type:'export',status:'waiting_tenant',priority:'urgent',
 requester_email:'waiting@fixture.test',summary:'Tenant information pending',due_at:'2020-01-01T00:00:00Z',is_overdue:true,
 verified_at:'2026-10-11T10:00:00Z',verified_by_platform_user_id:privacyOperator,verified_by_email:'operator@fixture.test',verifier_present:true};
export const closedRequest={...intakeRequest,id:closedId,request_type:'correction',status:'fulfilled',priority:'normal',
 requester_email:'closed@fixture.test',summary:'Recorded closed application request',due_at:null,is_overdue:false,
 verified_at:'2026-10-12T10:00:00Z',verified_by_platform_user_id:privacyOperator,verified_by_email:'operator@fixture.test',verifier_present:true,
 completed_at:'2026-10-13T10:00:00Z',completed_by_platform_user_id:privacyOperator,completed_by_email:'operator@fixture.test',
 completer_present:true,resolution_notes:'Synthetic closure note'};
export type PrivacyRecord=typeof intakeRequest&Record<string,any>;
export const manyPrivacyRequests=(n:number):PrivacyRecord[]=>Array.from({length:n},(_,i)=>({...intakeRequest,
 id:`${String(i+1).padStart(8,'0')}-0000-4000-8000-${String(i+1).padStart(12,'0')}`,
 requester_email:`request-${String(i+1).padStart(3,'0')}@fixture.test`,summary:`Synthetic request ${i+1}`}));
export type PrivacyFixtureOptions={query?:string;permissions?:string[];records?:PrivacyRecord[];expectHeading?:boolean;
 overrides?:Record<string,{status?:number;json:any}>;
 onCall?:(method:string,path:string,q:URLSearchParams,body:any)=>void;
 respond?:(method:string,path:string,q:URLSearchParams,body:any)=>{status?:number;json:any}|undefined|Promise<{status?:number;json:any}|undefined>};

export async function openPrivacyRequests(page:Page,opts:PrivacyFixtureOptions={}){
 targetBaseURL();const permissions=opts.permissions??privacyPermissions;
 const canTenants=permissions.includes('platform.tenants.read'),canUsers=permissions.includes('platform.users.read');
 let records:PrivacyRecord[]=(opts.records??[intakeRequest,waitingRequest,closedRequest]).map(x=>({...x}));
 const withAccess=(r:PrivacyRecord):PrivacyRecord=>({...r,
  tenant_present:Boolean(r.tenant_id||r.tenant_present),assignee_present:Boolean(r.assigned_platform_user_id||r.assignee_present),
  creator_present:Boolean(r.created_by_platform_user_id||r.creator_present),verifier_present:Boolean(r.verified_by_platform_user_id||r.verifier_present),
  completer_present:Boolean(r.completed_by_platform_user_id||r.completer_present),
  ...(!canTenants?{tenant_id:null,tenant_name:null}:{}),
  ...(!canUsers?{assigned_platform_user_id:null,assignee_email:null,created_by_platform_user_id:null,
   created_by_email:null,verified_by_platform_user_id:null,verified_by_email:null,completed_by_platform_user_id:null,completed_by_email:null}:{})});
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),q=url.searchParams,m=req.method();
  let body:any={};try{body=req.postDataJSON()??{};}catch{body={};}
  opts.onCall?.(m,path,q,body);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic refresh denied'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'privacy-operator@fixture.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions});
  const override=(await opts.respond?.(m,path,q,body))??opts.overrides?.[`${m} ${path}`];
  if(override)return fulfillJson(route,override.json,override.status??200);
  if(m==='GET'&&path==='/platform/tenants')return fulfillJson(route,[{id:privacyTenant,name:'Fixture Tenant Alpha'}]);
  if(m==='GET'&&path==='/platform/users')return fulfillJson(route,[
   {id:privacyOperator,email:'operator@fixture.test',is_active:true},{id:privacyInactive,email:'inactive@fixture.test',is_active:false}]);
  if(m==='GET'&&path===privacyRoot){
   const status=q.get('status')||'',type=q.get('request_type')||'',tenant=q.get('tenant_id')||'',assignee=q.get('assigned_platform_user_id')||'',
    search=(q.get('search')||'').toLowerCase(),overdue=q.get('overdue')==='true',limit=Number(q.get('limit')||50),offset=Number(q.get('offset')||0);
   const filtered=records.filter(r=>(!status||r.status===status)&&(!type||r.request_type===type)&&(!tenant||r.tenant_id===tenant)&&
    (!assignee||r.assigned_platform_user_id===assignee)&&(!overdue||r.is_overdue)&&(!search||
     `${r.requester_email} ${r.requester_name||''} ${r.subject_identifier||''} ${r.summary}`.toLowerCase().includes(search)));
   const open=filtered.filter(r=>!['fulfilled','rejected','cancelled'].includes(r.status));
   const summary={total:filtered.length,open:open.length,overdue:open.filter(r=>r.is_overdue).length,
    waiting_tenant:open.filter(r=>r.status==='waiting_tenant').length,high_priority_open:open.filter(r=>['high','urgent'].includes(r.priority)).length,
    verification_attention:open.filter(r=>!r.verified_at).length};
   const count=(key:'request_type'|'status')=>Array.from(new Set(filtered.map(r=>r[key]))).map(value=>({[key]:value,count:filtered.filter(r=>r[key]===value).length}));
   return fulfillJson(route,{requests:filtered.slice(offset,offset+limit).map(withAccess),request_types:privacyTypes,statuses:privacyStatuses,
    open_statuses:['intake','verifying','in_progress','waiting_tenant'],priorities:privacyPriorities,summary,
    by_type:count('request_type'),by_status:count('status'),pagination:{limit,offset,total:filtered.length,has_more:offset+limit<filtered.length},
    evidence_access:{tenant_identity:canTenants,platform_user_identity:canUsers},evidence_contract:{application_registry_only:true,
     requester_identity_fields_are_recorded_application_evidence:true,verification_action_does_not_prove_external_identity_verification:true,
     fulfilled_status_does_not_prove_external_right_satisfied:true,due_at_is_operator_recorded_deadline_not_legal_sla:true,
     audit_events_do_not_prove_external_delivery_receipt_or_legal_compliance:true}});
  }
  if(m==='POST'&&path===privacyRoot){const created={...intakeRequest,...body,id:'b8600000-0000-4000-8000-000000000099',status:'intake',
   tenant_name:body.tenant_id?'Fixture Tenant Alpha':null,assignee_email:body.assigned_platform_user_id?'operator@fixture.test':null,
   verified_at:null,completed_at:null,requester_name:body.requester_name||null};records=[created,...records];return fulfillJson(route,withAccess(created),201);}
  const hit=path.match(/^\/platform\/privacy-requests\/([^/]+)(?:\/(status|verify|close))?$/);
  if(hit){const i=records.findIndex(r=>r.id===hit[1]);if(i<0)return fulfillJson(route,{message:'Synthetic record not found'},404);
   if(m==='GET')return fulfillJson(route,withAccess(records[i]));
   if(['fulfilled','rejected','cancelled'].includes(records[i].status))return fulfillJson(route,{message:'Closed request is immutable'},409);
   if(m==='PATCH'&&!hit[2])records[i]={...records[i],...body};
   else if(m==='POST'&&hit[2]==='status')records[i]={...records[i],status:body.status};
   else if(m==='POST'&&hit[2]==='verify')records[i]={...records[i],verified_at:new Date().toISOString(),verified_by_platform_user_id:privacyOperator,verified_by_email:'operator@fixture.test'};
   else if(m==='POST'&&hit[2]==='close')records[i]={...records[i],status:body.status,completed_at:new Date().toISOString(),
    completed_by_platform_user_id:privacyOperator,completed_by_email:'operator@fixture.test',resolution_notes:body.resolution_notes||null,
    rejection_reason:body.rejection_reason||null,is_overdue:false};
   else return fulfillJson(route,{message:'Unexpected fixture operation'},405);
   return fulfillJson(route,withAccess(records[i]));
  }
  return fulfillJson(route,[]);
 });
 await page.goto(`/platform/privacy-requests${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Privacy requests',exact:true})).toBeVisible();
}
