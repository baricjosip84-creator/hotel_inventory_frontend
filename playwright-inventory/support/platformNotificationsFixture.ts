/** Batch 103 — source-traced synthetic Platform Notifications fixture. Phase 1: never executed.
 * Protected notifications are permission-scoped server evidence. Mock records cannot establish
 * successful delivery, tenant isolation, SQL transactional bulk updates, source reconciliation,
 * hidden-source filtering, operational remediation, or safe cleanup in a real environment. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';

export const noticePath='/platform/notifications';
export const NOTICE_ID='10000000-0000-4000-8000-000000000001';
export const NOTICE_ID_2='10000000-0000-4000-8000-000000000002';
export const TENANT_ID='20000000-0000-4000-8000-000000000003';
export const noticePermissions=[
 'platform.dashboard.read','platform.notifications.read','platform.notifications.write','platform.tenants.read',
 'platform.users.read','platform.audit.read','platform.billing.read','platform.support_sessions.read',
 'platform.dependencies.read','platform.webhooks.read','platform.api_keys.read','platform.vendors.read','platform.jobs.read'
];
export type Notice={id:string;severity:string;title:string;message:string;tenant_id:string|null;tenant_name:string|null;
 source:string;status:'open'|'acknowledged'|'resolved'|'dismissed';created_at:string;acknowledged_by_present?:boolean;
 acknowledged_by_email?:string|null;resolved_by_present?:boolean;resolved_by_email?:string|null;metadata?:Record<string,unknown>|null};
export const sampleNotice:Notice={id:NOTICE_ID,severity:'warning',title:'Synthetic attention',message:'Controlled synthetic notification',
 tenant_id:TENANT_ID,tenant_name:'Fixture tenant',source:'manual',status:'open',created_at:'2026-11-01T10:00:00.000Z',
 acknowledged_by_present:false,metadata:null};
export const integrationNotice:Notice={...sampleNotice,id:NOTICE_ID_2,title:'Integration transport risk',source:'integration_monitoring.scan',
 status:'acknowledged',metadata:{routing_state:'pending',risk_key:'transport_timeout',routing_owner_email:'old@example.test'}};
export type NoticeSummary={by_status:Array<{status:string;count:number}>;active_by_severity:Array<{severity:string;count:number}>;
 oldest_open_at:string|null;available_sources:string[];omitted_sources:string[];evidence_access:Record<string,boolean>;evidence_complete:boolean};
export function noticeSummary(override:Partial<NoticeSummary>={}):NoticeSummary{
 return {by_status:[{status:'open',count:1},{status:'acknowledged',count:1},{status:'resolved',count:0},{status:'dismissed',count:0}],
 active_by_severity:[{severity:'warning',count:2}],oldest_open_at:'2026-11-01T10:00:00.000Z',
 available_sources:['manual','integration_monitoring.scan'],omitted_sources:[],
 evidence_access:{manual:true,integration_monitoring:true,operational_billing:true},evidence_complete:true,...override};
}
export type NoticeOptions={permissions?:string[];rows?:Notice[];summary?:NoticeSummary;query?:string;total?:number;
 expectHeading?:boolean;onCall?:(method:string,path:string,url:URL,body:any)=>void;
 respond?:(method:string,path:string,url:URL,body:any)=>{json:any;status?:number}|undefined|Promise<{json:any;status?:number}|undefined>};
export async function openPlatformNotifications(page:Page,opts:NoticeOptions={}){
 targetBaseURL();let current=(opts.rows??[sampleNotice,integrationNotice]).map(x=>({...x}));
 const perms=opts.permissions??noticePermissions;const sum=opts.summary??noticeSummary();
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method();
  let body:any=undefined;if(req.postData()){try{body=req.postDataJSON()}catch{body=req.postData()}}
  opts.onCall?.(method,path,url,body);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic token refresh disallowed'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'notifications@sample.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions:perms});
  const override=await opts.respond?.(method,path,url,body);if(override)return fulfillJson(route,override.json,override.status??200);
  if(!perms.includes('platform.notifications.read'))return fulfillJson(route,{message:'Forbidden'},403);
  if(method==='GET'&&path===noticePath+'/summary')return fulfillJson(route,sum);
  if(method==='GET'&&path===noticePath){
   const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||50);
   let filtered=current.slice();
   for(const key of ['status','severity','source'] as const){const v=url.searchParams.get(key);if(v)filtered=filtered.filter(r=>String(r[key])===v)}
   const search=url.searchParams.get('search')?.trim().toLowerCase();if(search)filtered=filtered.filter(r=>[r.title,r.message,r.source].join(' ').toLowerCase().includes(search));
   const tenant=url.searchParams.get('tenant_id');if(tenant)filtered=filtered.filter(r=>r.tenant_id===tenant);
   const total=opts.total??filtered.length;
   return fulfillJson(route,{generated_at:'2026-11-05T12:00:00Z',notifications:filtered.slice(offset,offset+limit),
    pagination:{limit,offset,total,has_more:offset+limit<total},available_sources:sum.available_sources,
    omitted_sources:sum.omitted_sources,evidence_access:sum.evidence_access,evidence_complete:sum.evidence_complete,
    identity_access:{tenant_identity:perms.includes('platform.tenants.read'),platform_user_identity:perms.includes('platform.users.read')}});
  }
  if(method==='POST'&&!perms.includes('platform.notifications.write'))return fulfillJson(route,{message:'Forbidden'},403);
  if(method==='POST'&&path===noticePath){
   const created={...sampleNotice,id:'10000000-0000-4000-8000-000000000099',tenant_id:null,tenant_name:null,
    source:'manual',severity:body.severity,title:body.title,message:body.message,status:'open' as const};
   current=[created,...current];return fulfillJson(route,created,201);
  }
  if(method==='POST'&&path===noticePath+'/bulk'){
   current=current.map(r=>body.notification_ids.includes(r.id)?{...r,status:(body.action==='acknowledge'?'acknowledged':body.action==='reopen'?'open':body.action) as Notice['status']}:r);
   return fulfillJson(route,{updated_count:body.notification_ids.length});
  }
  if(method==='POST'&&path===noticePath+'/bulk-assign-integration-routing')return fulfillJson(route,{updated_count:body.notification_ids.length});
  if(method==='POST'&&path===noticePath+'/system-scan')return fulfillJson(route,{scanned_at:'2026-11-05T12:00:00Z',notifications_touched:2,created:1,refreshed:1,tenants_checked:1});
  if(method==='POST'&&path===noticePath+'/integration-monitoring-scan')return fulfillJson(route,{scanned_at:'2026-11-05T12:00:00Z',notifications_touched:2,created:1,refreshed:1,auto_resolved:0});
  if(method==='POST'&&path===noticePath+'/cleanup-closed')return fulfillJson(route,{deleted_count:0,older_than_days:body.older_than_days});
  const item=path.match(/^\/platform\/notifications\/([^/]+)\/(acknowledge|resolve|dismiss|reopen|assign-integration-routing)$/);
  if(method==='POST'&&item){
   if(item[2]==='assign-integration-routing')return fulfillJson(route,{notification_id:item[1],routing_state:'assigned'});
   const next=item[2]==='acknowledge'?'acknowledged':item[2]==='reopen'?'open':item[2];
   current=current.map(r=>r.id===item[1]?{...r,status:next as Notice['status']}:r);
   return fulfillJson(route,{id:item[1],status:next});
  }
  return fulfillJson(route,{message:'No synthetic notification fixture route'},404);
 });
 await page.goto('/platform/notifications'+(opts.query?'?'+opts.query:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Notifications',exact:true})).toBeVisible();
}
