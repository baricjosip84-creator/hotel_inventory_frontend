/** Batch 93: synthetic Platform Audit UI and HTTP contract fixture.
 * Application-recorded events are NOT proof of external delivery, infrastructure or legal outcomes.
 * Source visibility and identity visibility are independent permissions; real authorization
 * and CSV byte-level accuracy must be verified in Phase 2. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
export const auditRoot='/platform/audit';
export const auditTenantA='f9300000-0000-4000-8000-000000000001';
export const auditTenantB='f9300000-0000-4000-8000-000000000002';
export const auditActor='f9300000-0000-4000-8000-000000000003';
export const auditTarget='f9300000-0000-4000-8000-000000000004';
export const auditPermissions=['platform.dashboard.read','platform.audit.read','platform.tenants.read',
 'platform.users.read','platform.incidents.read','platform.webhooks.read','platform.tenants.export',
 'platform.security.read','platform.support_sessions.read'];
export type AuditEvent=Record<string,any>;
export const tenantAuditEvent:AuditEvent={id:'f9300000-0000-4000-8000-000000000011',
 platform_user_id:auditActor,platform_user_email:'operator@fixture.test',platform_user_name:'Synthetic Operator',
 action:'tenant.update',source:'tenants',target_type:'tenant',target_id:auditTarget,tenant_id:auditTenantA,
 tenant_name:'Alpha Sample Tenant',metadata:{change:'label updated'},ip_address:'192.0.2.7',
 user_agent:'Fixture UA',created_at:'2026-01-10T10:00:00Z'};
export const incidentAuditEvent:AuditEvent={...tenantAuditEvent,id:'f9300000-0000-4000-8000-000000000012',
 action:'platform_incident.update',source:'incidents',target_type:'platform_incident',
 target_id:'f9300000-0000-4000-8000-000000000013',tenant_id:auditTenantB,tenant_name:'Beta Sample Tenant',
 metadata:{severity:'high'},created_at:'2026-01-11T10:00:00Z'};
export const nativeAuditEvent:AuditEvent={...tenantAuditEvent,id:'f9300000-0000-4000-8000-000000000014',
 platform_user_id:null,platform_user_email:null,platform_user_name:null,
 action:'platform_audit.export',source:'audit',target_type:null,target_id:null,
 tenant_id:null,tenant_name:null,metadata:null,ip_address:null,user_agent:null,created_at:'2026-01-12T10:00:00Z'};
export const manyAuditEvents=(n:number):AuditEvent[]=>Array.from({length:n},(_,i)=>({...tenantAuditEvent,
 id:`${String(i+100).padStart(8,'0')}-0000-4000-8000-${String(i+100).padStart(12,'0')}`,
 action:`tenant.test_event_${String(i+1).padStart(3,'0')}`}));
export type AuditFixtureOptions={query?:string;permissions?:string[];records?:AuditEvent[];expectHeading?:boolean;
 onCall?:(method:string,path:string,query:URLSearchParams)=>void;
 overrides?:Record<string,{status?:number;json:any}>;
 respond?:(method:string,path:string,query:URLSearchParams)=>Promise<{status?:number;json:any}|undefined>|{status?:number;json:any}|undefined;
};
export async function openPlatformAudit(page:Page,opts:AuditFixtureOptions={}){
 targetBaseURL();const perms=opts.permissions??auditPermissions;
 const can=(name:string)=>perms.includes(name);
 const raw=opts.records??[tenantAuditEvent,incidentAuditEvent,nativeAuditEvent];
 const available=['audit',...(can('platform.tenants.read')?['tenants']:[]),...(can('platform.incidents.read')?['incidents']:[])];
 const omitted=[...(can('platform.tenants.read')?[]:['tenants']),...(can('platform.incidents.read')?[]:['incidents'])];
 const identity={platform_user_identity:can('platform.users.read'),tenant_identity:can('platform.tenants.read')};
 const view=(e:AuditEvent):AuditEvent=>({...e,
  platform_user_id:identity.platform_user_identity?e.platform_user_id:null,
  platform_user_email:identity.platform_user_identity?e.platform_user_email:null,
  platform_user_name:identity.platform_user_identity?e.platform_user_name:null,
  tenant_id:identity.tenant_identity?e.tenant_id:null,
  tenant_name:identity.tenant_identity?e.tenant_name:null});
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),q=url.searchParams,m=req.method();
  opts.onCall?.(m,path,q);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic refresh rejected'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'audit@fixture.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions:perms});
  const override=(await opts.respond?.(m,path,q))??opts.overrides?.[`${m} ${path}`];
  if(override)return fulfillJson(route,override.json,override.status??200);
  if(m==='GET'&&path===auditRoot){
   const val=(name:string)=>q.get(name)||'';
   const found=raw.filter(r=>available.includes(r.source)&&
    (!val('source')||r.source===val('source'))&&
    (!val('action')||r.action===val('action'))&&
    (!val('target_type')||r.target_type===val('target_type'))&&
    (!val('target_id')||r.target_id===val('target_id'))&&
    (!val('tenant_id')||r.tenant_id===val('tenant_id'))&&
    (!val('platform_user_id')||r.platform_user_id===val('platform_user_id'))&&
    (!val('from')||r.created_at>=val('from'))&&(!val('to')||r.created_at<=val('to'))&&
    (!val('search')||[r.action,r.source,r.target_type,r.target_id,JSON.stringify(r.metadata),
     ...(identity.platform_user_identity?[r.platform_user_email]:[]),
     ...(identity.tenant_identity?[r.tenant_name]:[])].join(' ').toLowerCase().includes(val('search').toLowerCase())));
   const limit=Number(val('limit')||50),offset=Number(val('offset')||0);
   const counts=(key:string)=>Object.entries(found.reduce((acc:Record<string,number>,r:AuditEvent)=>{
    const k=String(r[key]||'unavailable');acc[k]=(acc[k]||0)+1;return acc;},{})).map(([k,count])=>({[key]:k,count}));
   const summary={total:{total_events:found.length,first_event_at:found.at(0)?.created_at||null,last_event_at:found.at(-1)?.created_at||null},
    top_actions:counts('action'),
    top_actors:identity.platform_user_identity?found.map(r=>({platform_user_id:r.platform_user_id,actor:r.platform_user_email||'System',count:1})):null,
    top_tenants:identity.tenant_identity?found.map(r=>({tenant_id:r.tenant_id,tenant_name:r.tenant_name||'No tenant',count:1})):null,
    sources:counts('source'),available_sources:available,omitted_sources:omitted,evidence_access:identity,
    evidence_complete:omitted.length===0,required_permissions_by_source:{audit:['platform.audit.read'],tenants:['platform.tenants.read'],incidents:['platform.incidents.read']},
    generated_at:'2026-11-05T10:00:00Z'};
   return fulfillJson(route,{events:found.slice(offset,offset+limit).map(view),summary,
    pagination:{limit,offset,total:found.length,has_more:offset+limit<found.length},
    available_sources:available,omitted_sources:omitted,evidence_access:identity,evidence_complete:omitted.length===0,
    required_permissions_by_source:summary.required_permissions_by_source,
    evidence_contract:{audit_events_are_application_control_plane_evidence:true,
     event_presence_does_not_prove_external_business_or_infrastructure_outcome:true,
     restricted_source_events_are_not_queried_or_counted_as_zero:true,
     actor_and_tenant_identity_require_independent_read_permissions:true,
     csv_export_obeys_the_same_source_and_identity_permissions:true},
    generated_at:'2026-11-05T10:00:00Z'});
  }
  if(m==='GET'&&path===auditRoot+'/export.csv')return route.fulfill({status:200,contentType:'text/csv',body:'id,action,source\nfixture,tenant.update,tenants\n'});
  return fulfillJson(route,[]);
 });
 await page.goto(`${auditRoot}${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Platform Audit',exact:true})).toBeVisible();
}
