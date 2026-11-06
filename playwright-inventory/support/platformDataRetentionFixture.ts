/** Batch 87: isolated synthetic Platform Data Retention HTTP fixture.
 * Application policy records, operator holds and purge intent are not deletion or legal proof.
 * Nothing in this fixture verifies server permissions, Postgres commits, backup retention or purging. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
export const retentionRoot='/platform/data-retention';
export const retentionTenantA='c8700000-0000-4000-8000-000000000001';
export const retentionTenantB='c8700000-0000-4000-8000-000000000002';
export const retentionTenantC='c8700000-0000-4000-8000-000000000003';
export const retentionOperator='c8700000-0000-4000-8000-000000000004';
export const retentionPermissions=['platform.dashboard.read','platform.data_retention.read','platform.data_retention.write','platform.tenants.read','platform.tenants.export','platform.users.read','platform.compliance.read','platform.audit.read'];
export const retentionPolicyNames=['standard','extended','contractual','delete_after_offboarding','custom'];
export const standardRetention={tenant_id:retentionTenantA,tenant_name:'Fixture Retention Alpha',tenant_status:'active',write_locked:false,
 tenant_present:true,retention_policy:'standard',retain_until:null,legal_hold:false,legal_hold_reason:null,
 legal_hold_set_at:null,legal_hold_set_by_platform_user_id:null,legal_hold_set_by_email:null,legal_hold_set_by_present:false,
 purge_after_offboarding:false,notes:'Synthetic standard record',created_at:'2026-10-01T10:00:00Z',updated_at:'2026-10-01T10:00:00Z',retention_due:false,purge_blocked:false};
export const heldRetention={...standardRetention,tenant_id:retentionTenantB,tenant_name:'Fixture Retention Beta',tenant_status:'active',write_locked:true,
 retention_policy:'contractual',retain_until:'2020-01-01T00:00:00Z',legal_hold:true,legal_hold_reason:'Synthetic operator hold',
 legal_hold_set_at:'2026-10-07T10:00:00Z',legal_hold_set_by_platform_user_id:retentionOperator,legal_hold_set_by_email:'retention.operator@fixture.test',
 legal_hold_set_by_present:true,purge_after_offboarding:true,notes:'Synthetic held record',retention_due:true,purge_blocked:true};
export const dueRetention={...standardRetention,tenant_id:retentionTenantC,tenant_name:'Fixture Retention Gamma',tenant_status:'trial',
 retention_policy:'extended',retain_until:'2020-02-01T00:00:00Z',retention_due:true,notes:'Synthetic due record'};
export type RetentionRecord=typeof standardRetention&Record<string,any>;
export const manyRetentionRecords=(n:number):RetentionRecord[]=>Array.from({length:n},(_,i)=>({...standardRetention,
 tenant_id:`${String(i+1).padStart(8,'0')}-0000-4000-8000-${String(i+1).padStart(12,'0')}`,
 tenant_name:`Retention Fixture ${String(i+1).padStart(3,'0')}`,notes:`Synthetic policy ${i+1}`}));
export type RetentionFixtureOptions={query?:string;permissions?:string[];records?:RetentionRecord[];expectHeading?:boolean;
 onCall?:(method:string,path:string,query:URLSearchParams,body:any)=>void;
 overrides?:Record<string,{status?:number;json:any}>;
 respond?:(method:string,path:string,query:URLSearchParams,body:any)=>Promise<{status?:number;json:any}|undefined>|{status?:number;json:any}|undefined};
export async function openDataRetention(page:Page,opts:RetentionFixtureOptions={}){
 targetBaseURL();const permissions=opts.permissions??retentionPermissions;
 const canTenants=permissions.includes('platform.tenants.read'),canUsers=permissions.includes('platform.users.read');
 let records:RetentionRecord[]=(opts.records??[standardRetention,heldRetention,dueRetention]).map(r=>({...r}));
 const redact=(r:RetentionRecord):RetentionRecord=>({...r,
  tenant_present:Boolean(r.tenant_id||r.tenant_present),legal_hold_set_by_present:Boolean(r.legal_hold_set_by_platform_user_id||r.legal_hold_set_by_present),
  ...(!canTenants?{tenant_id:null,tenant_name:null,tenant_status:null,write_locked:null}:{}),
  ...(!canUsers?{legal_hold_set_by_platform_user_id:null,legal_hold_set_by_email:null}:{})});
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),q=url.searchParams,m=req.method();
  let body:any={};try{body=req.postDataJSON()??{};}catch{body={};}opts.onCall?.(m,path,q,body);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic refresh denied'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'retention.operator@fixture.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions});
  const override=(await opts.respond?.(m,path,q,body))??opts.overrides?.[`${m} ${path}`];
  if(override)return fulfillJson(route,override.json,override.status??200);
  if(m==='GET'&&path==='/platform/tenants')return fulfillJson(route,records.filter(r=>r.tenant_id).map(r=>({id:r.tenant_id,name:r.tenant_name,status:r.tenant_status,plan_code:'fixture'})));
  if(m==='GET'&&path===retentionRoot){
   const tenantId=q.get('tenant_id'),hold=q.get('legal_hold'),due=q.get('due_only')==='true',search=(q.get('search')||'').toLowerCase();
   const limit=Number(q.get('limit')||50),offset=Number(q.get('offset')||0);
   let filtered=records.filter(r=>(!tenantId||r.tenant_id===tenantId)&&(!hold||String(r.legal_hold)===hold)&&(!due||r.retention_due)&&
    (!search||[r.retention_policy,r.legal_hold_reason,r.notes,...(canTenants?[r.tenant_name]:[])].join(' ').toLowerCase().includes(search)));
   // With TENANTS_READ, default policy rows for every tenant are visible; without it, only configured rows may be listed.
   if(!canTenants)filtered=filtered.filter(r=>r.legal_hold||r.purge_after_offboarding||r.retention_policy!=='standard');
   const summary={total:filtered.length,legal_holds:filtered.filter(r=>r.legal_hold).length,
    due:filtered.filter(r=>r.retention_due).length,purge_after_offboarding:filtered.filter(r=>r.purge_after_offboarding).length,
    purge_blocked:filtered.filter(r=>r.legal_hold).length,write_locked:canTenants?filtered.filter(r=>r.write_locked).length:null};
   const omitted_sources=[...(canTenants?[]:['tenant_registry']),...(canUsers?[]:['platform_user_identity'])];
   return fulfillJson(route,{records:filtered.slice(offset,offset+limit).map(redact),summary,
    pagination:{limit,offset,total:filtered.length,has_more:offset+limit<filtered.length},
    available_sources:['data_retention',...(canTenants?['tenant_registry']:[]),...(canUsers?['platform_user_identity']:[])],omitted_sources,
    evidence_access:{tenant_identity:canTenants,platform_user_identity:canUsers},evidence_complete:omitted_sources.length===0,
    tenant_registry_complete:canTenants,generated_at:'2026-10-30T10:30:00Z',evidence_contract:{
     application_policy_records_only:true,retain_until_due_does_not_prove_deletion:true,purge_after_offboarding_is_intent_not_execution:true,
     legal_hold_is_operator_recorded_application_evidence:true,purge_execution_implemented_by_this_surface:false,
     no_application_rows_do_not_prove_external_or_backup_copies_absent:true,does_not_prove_backup_retention_or_restore_capability:true}});
  }
  const match=path.match(/^\/platform\/data-retention\/([^/]+)(?:\/(set-legal-hold|clear-legal-hold))?$/);
  if(match){const index=records.findIndex(r=>r.tenant_id===match[1]);if(index<0)return fulfillJson(route,{message:'Unknown tenant'},404);
   if(m==='GET')return fulfillJson(route,redact(records[index]));
   if(m==='PATCH'&&!match[2]){
    if('legal_hold' in body||'legal_hold_reason' in body)return fulfillJson(route,{message:'Dedicated legal hold action required'},409);
    const input=body.retain_until?`${String(body.retain_until).slice(0,10)}T00:00:00Z`:null;
    records[index]={...records[index],...body,retain_until:input,retention_due:Boolean(input&&new Date(input).getTime()<=Date.now())};
    return fulfillJson(route,redact(records[index]));
   }
   if(m==='POST'&&match[2]){
    if(!String(body.reason||'').trim())return fulfillJson(route,{message:'Reason required'},400);
    const holding=match[2]==='set-legal-hold';records[index]={...records[index],legal_hold:holding,purge_blocked:holding,
     legal_hold_reason:holding?body.reason:null,legal_hold_set_at:holding?new Date().toISOString():null,
     legal_hold_set_by_platform_user_id:holding?retentionOperator:null,legal_hold_set_by_email:holding?'retention.operator@fixture.test':null,
     legal_hold_set_by_present:holding};
    return fulfillJson(route,redact(records[index]));
   }
   return fulfillJson(route,{message:'Unsupported synthetic operation'},405);
  }
  return fulfillJson(route,[]);
 });
 await page.goto(`/platform/data-retention${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Data retention',exact:true})).toBeVisible();
}
