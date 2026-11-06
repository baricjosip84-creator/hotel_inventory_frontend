/** Batch 113: synthetic read-only recovery evidence; no backup, restore, provider, or SQL executed. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';

export const BACKUP_RESTORE_PATH='/platform/backup-restore-validation';
export const BACKUP_RESTORE_PERMISSIONS=['platform.tenants.read','platform.tenants.export','platform.runbooks.read'];
export const backupAlpha='b1130000-0000-4000-8000-000000000001';
export const backupBeta='b1130000-0000-4000-8000-000000000002';
export const backupGamma='b1130000-0000-4000-8000-000000000003';
export const platformBackupControls=[
 {code:'tenant_export_surface_ready',label:'Tenant export implementation coverage present',evidence_key:'exportable_table_count'},
 {code:'backup_restore_runbook_present',label:'Backup/restore runbook present',evidence_key:'backup_restore_runbook_present'},
 {code:'rollback_recovery_runbook_present',label:'Rollback/recovery runbook present',evidence_key:'rollback_recovery_runbook_present'},
 {code:'tenant_export_implementation_present',label:'Tenant export implementation present',evidence_key:'tenant_export_implementation_present'},
 {code:'backup_policy_configuration_present',label:'Backup policy configuration present',evidence_key:'backup_policy_configuration_present'},
 {code:'restore_drill_evidence_recorded',label:'Restore drill evidence operator-verified',evidence_key:'restore_drill_evidence_recorded'}
];
export const tenantBackupControls=[
 {code:'tenant_core_data_scope_identified',label:'Tenant core data scope identified',evidence_key:'core_data_scope_identified'},
 {code:'tenant_export_archive_exercised',label:'Tenant export archive path exercised',evidence_key:'tenant_export_archive_exercised'}
];
type Evidence=string|number|boolean|null|string[]|Record<string,number>;
type Definition={code:string;label:string;evidence_key:string};
export type RecoveryControl=Definition&{launch_reason:string;evidence_value:number|null;status:string};
export type RecoveryTenant={tenant_id:string;tenant_name:string;tenant_status:string;status:string;evidence:Record<string,Evidence>;controls:RecoveryControl[];missing_control_codes:string[];next_best_step:string};
export type RecoverySnapshot={phase:string;step:string;posture:string;generated_at:string;summary:Record<string,number>;platform_evidence:Record<string,Evidence>;platform_controls:RecoveryControl[];backup_restore_controls:(Definition&{launch_reason:string})[];tenants:RecoveryTenant[];validation_note:string};
const basePlatformEvidence:Record<string,Evidence>={
 exportable_table_count:14,backup_restore_runbook_present:true,rollback_recovery_runbook_present:true,
 tenant_export_implementation_present:true,backup_policy_configuration_present:false,
 backup_policy_fields_configured:3,backup_policy_fields_total:4,
 backup_policy_missing_fields:['BACKUP_STORAGE_TARGET'],restore_drill_evidence_persistence_available:false,
 restore_drill_evidence_recorded:null
};
function platformControlsFor(evidence:Record<string,Evidence>):RecoveryControl[]{
 return platformBackupControls.map(d=>{
  const value=d.code==='tenant_export_surface_ready'?Number(evidence.exportable_table_count??0):Number(Boolean(evidence[d.evidence_key]));
  const status=d.code==='restore_drill_evidence_recorded'?'manual_restore_drill_verification_required':
   d.code==='backup_policy_configuration_present'&&!value?'backup_policy_configuration_missing':
   value?'evidence_present':'backup_restore_evidence_missing';
  return {...d,evidence_value:value,status,launch_reason:'Source-defined platform recovery evidence requirement'};
 });
}
export function makeRecoveryTenant(id:string,name:string,kind:'ready'|'blocked'|'review'='ready'):RecoveryTenant{
 const blocked=kind==='blocked',review=kind==='review';
 const evidence:Record<string,Evidence>={core_data_scope_identified:!blocked,core_tables_detected:blocked?0:7,
  core_data_rows:blocked?0:6,core_table_counts:blocked?{}:{products:2,stock:4},
  tenant_export_archive_exercised:!(blocked||review),last_tenant_export_archive_at:blocked||review?null:'2026-11-04T10:00:00.000Z'};
 const controls=tenantBackupControls.map(d=>{
  const value=Number(Boolean(evidence[d.evidence_key]));
  return {...d,evidence_value:value,status:value?'evidence_present':
   d.code==='tenant_export_archive_exercised'?'tenant_export_sample_review_required':'backup_restore_evidence_missing',
   launch_reason:'Source-defined tenant-scoped recovery evidence requirement'};
 });
 const missing=controls.filter(c=>c.status!=='evidence_present').map(c=>c.code);
 const status=blocked?'tenant_backup_scope_blocked':review?'tenant_backup_scope_review_required':'tenant_backup_scope_ready';
 const next_best_step=blocked?'Review the tenant data scope before recovery evidence is accepted.':
  review?'Run and review an audited tenant export archive as a recovery evidence sample; confirm any truncation separately because tenant export is not a database restore.':
  'Tenant data scope and audited export-path evidence are present for the platform recovery review.';
 return {tenant_id:id,tenant_name:name,tenant_status:'active',status,evidence,controls,missing_control_codes:missing,next_best_step};
}
export const recoveryRows=[makeRecoveryTenant(backupAlpha,'Backup Alpha'),makeRecoveryTenant(backupBeta,'Backup Beta','blocked'),makeRecoveryTenant(backupGamma,'Backup Gamma','review')];
export function makeRecoverySnapshot(rows:RecoveryTenant[]=recoveryRows,extraPlatform:Record<string,Evidence>={}):RecoverySnapshot{
 const platform_evidence={...basePlatformEvidence,...extraPlatform};
 const platform_controls=platformControlsFor(platform_evidence);
 const count=(test:(r:RecoveryTenant)=>boolean)=>rows.filter(test).length;
 const summary:Record<string,number>={
  tenants_total:rows.length,tenant_scope_ready:count(r=>r.status==='tenant_backup_scope_ready'),
  tenant_scope_blocked:count(r=>r.status==='tenant_backup_scope_blocked'),
  tenant_scope_review_required:count(r=>r.status==='tenant_backup_scope_review_required'),
  tenants_with_core_data:count(r=>Number(r.evidence.core_data_rows)>0),
  tenants_without_core_data:count(r=>Number(r.evidence.core_data_rows)===0),
  tenants_with_export_archive_evidence:count(r=>r.evidence.tenant_export_archive_exercised===true),
  tenants_without_export_archive_evidence:count(r=>r.evidence.tenant_export_archive_exercised!==true),
  exportable_table_count:Number(platform_evidence.exportable_table_count),
  backup_policy_fields_configured:Number(platform_evidence.backup_policy_fields_configured),
  backup_policy_fields_total:Number(platform_evidence.backup_policy_fields_total),
  platform_controls_total:platform_controls.length,
  platform_controls_with_evidence:platform_controls.filter(c=>c.status==='evidence_present').length,
  platform_controls_blocking:platform_controls.filter(c=>['backup_restore_evidence_missing','backup_policy_configuration_missing'].includes(c.status)).length,
  platform_controls_review_required:platform_controls.filter(c=>['manual_restore_drill_verification_required','manual_restore_drill_required'].includes(c.status)).length,
  total_controls:platform_controls.length+2*rows.length,
  controls_with_evidence:platform_controls.filter(c=>c.status==='evidence_present').length+rows.reduce((sum,r)=>sum+r.controls.filter(c=>c.status==='evidence_present').length,0)
 };
 const posture=summary.platform_controls_blocking||summary.tenant_scope_blocked?'backup_restore_validation_blocked':
  summary.platform_controls_review_required||summary.tenant_scope_review_required?'backup_restore_review_required':
  !rows.length?'no_tenants_to_review_for_backup_restore':'backup_restore_technical_precheck_clear';
 return {phase:'Platform Commercial Launch Readiness',step:'Step 213 — Backup Restore Validation Board',
  posture,generated_at:'2026-11-05T12:00:00.000Z',summary,platform_evidence,platform_controls,
  backup_restore_controls:[...platformBackupControls,...tenantBackupControls].map(c=>({...c,launch_reason:'Source-defined technical recovery evidence requirement'})),
  tenants:rows,validation_note:'Read-only technical precheck. The application does not execute production backups, restore databases, persist restore-drill completion, verify an external backup provider, schedule backup jobs, mutate tenant data, or certify disaster recovery. A real isolated restore drill and operator-owned provider evidence remain required.'};
}
export type RecoveryOptions={urlQuery?:string;permissions?:string[];rows?:RecoveryTenant[];tenantListStatus?:number;recoveryStatus?:number;expectHeading?:boolean;onCall?:(method:string,path:string,query:URLSearchParams)=>void;respond?:(method:string,path:string,query:URLSearchParams)=>{json:any;status?:number}|undefined;alter?:(p:RecoverySnapshot)=>RecoverySnapshot;platformOverride?:Record<string,Evidence>};
export async function openRecovery(page:Page,options:RecoveryOptions={}){
 targetBaseURL();const permissions=options.permissions??BACKUP_RESTORE_PERMISSIONS;
 const rows=options.rows??recoveryRows;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),query=url.searchParams;
  options.onCall?.(method,path,query);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic token cannot refresh'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'fixture@synthetic.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=options.respond?.(method,path,query);if(override)return fulfillJson(route,override.json,override.status??200);
  if(method==='GET'&&path==='/platform/tenants')return fulfillJson(route,
   options.tenantListStatus&&options.tenantListStatus>=400?{message:'Tenant directory unavailable'}:rows.map(t=>({id:t.tenant_id,name:t.tenant_name})),options.tenantListStatus??200);
  if(method==='GET'&&path===BACKUP_RESTORE_PATH){
   if(!BACKUP_RESTORE_PERMISSIONS.every(p=>permissions.includes(p)))return fulfillJson(route,{message:'Forbidden'},403);
   if(options.recoveryStatus&&options.recoveryStatus>=400)return fulfillJson(route,{message:'Recovery evidence unavailable'},options.recoveryStatus);
   const selected=query.get('tenant_id'),scoped=selected?rows.filter(t=>t.tenant_id===selected):rows;
   if(selected&&!scoped.length)return fulfillJson(route,{message:'Tenant was not found'},404);
   const p=makeRecoverySnapshot(scoped,options.platformOverride);
   return fulfillJson(route,options.alter?options.alter(p):p);
  }
  return fulfillJson(route,{message:'Synthetic route unavailable'},404);
 });
 await page.goto(BACKUP_RESTORE_PATH+(options.urlQuery?'?'+options.urlQuery:''));
 if(options.expectHeading!==false)await expect(page.getByRole('heading',{name:'Backup Restore Validation',exact:true})).toBeVisible();
}
