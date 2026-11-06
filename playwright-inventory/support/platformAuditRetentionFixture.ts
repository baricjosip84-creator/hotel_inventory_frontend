/** Batch 94: isolated synthetic audit-retention policy fixture, STRICT PHASE 1 UNRUN.
 * A configured threshold/hold/archival event is not proof of legal obligation,
 * audit deletion, backup absence, external archive delivery or actual compliance. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
export const retentionEndpoint='/platform/audit-retention/policy';
export const retentionTenantA='f9400000-0000-4000-8000-000000000001';
export const retentionTenantB='f9400000-0000-4000-8000-000000000002';
export const retentionTenantC='f9400000-0000-4000-8000-000000000003';
export const retentionPermissions=['platform.dashboard.read','platform.audit.read','platform.tenants.read',
 'platform.data_retention.read','platform.tenants.export','platform.compliance.read'];
export type RetentionRecord={tenant_id:string;tenant_name:string;tenant_status:string;write_locked:boolean;
 retention_policy:string|null;retention_days:number|null;retain_until:string|null;legal_hold:boolean|null;
 legal_hold_reason:string|null;audit_event_count:number;tenant_export_archive_events:number|null;
 tenant_export_summary_events:number|null;first_audit_event_at:string|null;last_audit_event_at:string|null;
 audit_age_days:number|null;due_for_retention_review:boolean|null;purge_blocked:boolean|null;
 archive_evidence_missing_for_due_review:boolean|null;risk_flags:string[]};
export const heldTenant:RetentionRecord={tenant_id:retentionTenantA,tenant_name:'Alpha Sample Tenant',tenant_status:'active',write_locked:false,
 retention_policy:'standard',retention_days:365,retain_until:'2026-01-01T00:00:00Z',legal_hold:true,
 legal_hold_reason:'Synthetic litigation hold',audit_event_count:17,tenant_export_archive_events:0,tenant_export_summary_events:2,
 first_audit_event_at:'2024-03-01T00:00:00Z',last_audit_event_at:'2026-01-02T00:00:00Z',audit_age_days:600,
 due_for_retention_review:true,purge_blocked:true,archive_evidence_missing_for_due_review:true,
 risk_flags:['audit_retention_age_due','tenant_retention_due','legal_hold_active','purge_blocked','tenant_archive_evidence_missing_for_due_review']};
export const archivedTenant:RetentionRecord={...heldTenant,tenant_id:retentionTenantB,tenant_name:'Beta Archive Tenant',tenant_status:'archived',write_locked:true,
 retention_policy:'extended',retention_days:2555,retain_until:'2030-01-01T00:00:00Z',legal_hold:false,legal_hold_reason:null,
 audit_event_count:3,tenant_export_archive_events:1,tenant_export_summary_events:0,audit_age_days:120,
 due_for_retention_review:false,purge_blocked:false,archive_evidence_missing_for_due_review:false,risk_flags:[]};
export const emptyAuditTenant:RetentionRecord={...archivedTenant,tenant_id:retentionTenantC,tenant_name:'Gamma Empty Tenant',tenant_status:'active',write_locked:false,
 retention_policy:'standard',retention_days:365,first_audit_event_at:null,last_audit_event_at:null,audit_event_count:0,audit_age_days:null,
 tenant_export_archive_events:0,tenant_export_summary_events:1,risk_flags:['no_audit_events']};
export const manyRetentionTenants=(n:number):RetentionRecord[]=>Array.from({length:n},(_,i)=>({...archivedTenant,
 tenant_id:`${String(i+100).padStart(8,'0')}-0000-4000-8000-${String(i+100).padStart(12,'0')}`,
 tenant_name:`Synthetic Retention ${String(i+1).padStart(3,'0')}`}));
export type RetentionFixtureOptions={permissions?:string[];query?:string;records?:RetentionRecord[];expectHeading?:boolean;
 onCall?:(method:string,path:string,q:URLSearchParams)=>void;
 respond?:(method:string,path:string,q:URLSearchParams)=>Promise<{json:any;status?:number}|undefined>|{json:any;status?:number}|undefined;
 overrides?:Record<string,{json:any;status?:number}>;};
export async function openAuditRetention(page:Page,opts:RetentionFixtureOptions={}){
 targetBaseURL();const perms=opts.permissions??retentionPermissions;
 const can=(p:string)=>perms.includes(p);
 const canRetention=can('platform.data_retention.read');const canArchive=can('platform.tenants.export')&&can('platform.tenants.read')&&can('platform.audit.read');
 const records=opts.records??[heldTenant,archivedTenant,emptyAuditTenant];
 await page.addInitScript(t=>{localStorage.setItem('inventory_platform_access_token',t);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),q=url.searchParams,m=req.method();opts.onCall?.(m,path,q);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic refresh rejected'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'retention@fixture.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions:perms});
  const override=(await opts.respond?.(m,path,q))??opts.overrides?.[`${m} ${path}`];
  if(override)return fulfillJson(route,override.json,override.status??200);
  if(path==='/platform/tenants'&&m==='GET')return fulfillJson(route,records.map(t=>({id:t.tenant_id,name:t.tenant_name,status:t.tenant_status})));
  if(path===retentionEndpoint&&m==='GET'){
   const s=(q.get('search')||'').trim().toLowerCase(),target=q.get('tenant_id');
   const found=records.filter(r=>(!target||target===r.tenant_id)&&(!s||`${r.tenant_name} ${r.tenant_status}`.toLowerCase().includes(s)));
   const limit=Number(q.get('limit')||50),offset=Number(q.get('offset')||0);
   const projection=(r:RetentionRecord):RetentionRecord=>({...r,
    retention_policy:canRetention?r.retention_policy:null,retention_days:canRetention?r.retention_days:null,
    retain_until:canRetention?r.retain_until:null,legal_hold:canRetention?r.legal_hold:null,
    legal_hold_reason:canRetention?r.legal_hold_reason:null,due_for_retention_review:canRetention?r.due_for_retention_review:null,
    purge_blocked:canRetention?r.purge_blocked:null,
    tenant_export_archive_events:canArchive?r.tenant_export_archive_events:null,
    tenant_export_summary_events:canArchive?r.tenant_export_summary_events:null,
    archive_evidence_missing_for_due_review:canRetention&&canArchive?r.archive_evidence_missing_for_due_review:null,
    risk_flags:r.risk_flags.filter(flag=>canRetention||!['audit_retention_age_due','tenant_retention_due','legal_hold_active','purge_blocked'].includes(flag))
     .filter(flag=>canRetention&&canArchive||flag!=='tenant_archive_evidence_missing_for_due_review')});
   const visible=found.map(projection);const num=(predicate:(r:RetentionRecord)=>boolean)=>visible.filter(predicate).length;
   const summary={total_tenants:visible.length,tenants_with_audit_events:num(r=>r.audit_event_count>0),
    tenants_due_for_retention_review:canRetention?num(r=>r.due_for_retention_review===true):null,
    tenants_with_legal_hold:canRetention?num(r=>r.legal_hold===true):null,
    tenants_with_purge_blocked:canRetention?num(r=>r.purge_blocked===true):null,
    tenants_with_tenant_archive_evidence:canArchive?num(r=>Number(r.tenant_export_archive_events)>0):null,
    tenants_missing_export_evidence:canRetention&&canArchive?num(r=>r.archive_evidence_missing_for_due_review===true):null,
    tenants_with_extended_retention:canRetention?num(r=>Number(r.retention_days)>365):null};
   const available=['audit','tenant_registry',...(canRetention?['data_retention']:[]),...(canArchive?['tenant_export_audit']:[])];
   const omitted=[...(canRetention?[]:['data_retention']),...(canArchive?[]:['tenant_export_audit'])];
   const evidenceComplete=omitted.length===0;
   const posture=(summary.tenants_with_legal_hold||0)>0?'audit_retention_hold_required':(summary.tenants_due_for_retention_review||0)>0?'audit_retention_review_required':!evidenceComplete?'audit_retention_evidence_restricted':'audit_retention_governed';
   return fulfillJson(route,{feature:'audit_retention_policy',phase:18,step:583,generated_at:'2026-11-05T10:00:00Z',posture,summary,
    available_sources:available,omitted_sources:omitted,evidence_access:{tenant_identity:true,data_retention:canRetention,tenant_export_audit:canArchive},
    evidence_complete:evidenceComplete,
    required_permissions_by_source:{audit:['platform.audit.read'],tenant_registry:['platform.tenants.read'],data_retention:['platform.data_retention.read'],tenant_export_audit:['platform.audit.read','platform.tenants.read','platform.tenants.export']},
    governance_controls:{read_only:true,deletion_owner:'manual_compliance_runbook_until_purge_workflow_is_implemented',mutation_owner:'platform_data_retention_and_platform_tenant_exports',source_routes:['/api/platform/audit','/api/platform/data-retention','/api/platform/tenant-exports'],default_audit_retention_days:365,extended_audit_retention_days:2555},
    evidence_contract:{no_audit_log_deletion_is_performed:true,retention_thresholds_are_application_review_thresholds_not_legal_requirements:true,
     retention_policy_is_application_configuration_not_deletion_proof:true,retain_until_due_does_not_prove_deletion:true,
     tenant_export_preview_is_not_row_data_archive_evidence:true,tenant_archive_generation_does_not_prove_external_delivery_receipt_or_acceptance:true,
     tenant_write_lock_is_not_treated_as_a_retention_purge_blocker:true,absence_of_application_audit_rows_does_not_prove_external_or_backup_copies_are_absent:true},
    pagination:{limit,offset,total:visible.length,has_more:offset+limit<visible.length},tenants:visible.slice(offset,offset+limit)});
  }
  return fulfillJson(route,[]);
 });
 await page.goto(`/platform/audit-retention${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Audit retention',exact:true})).toBeVisible();
}
