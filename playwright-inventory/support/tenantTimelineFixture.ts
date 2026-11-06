import { expect, type Page, type Route } from '@playwright/test';
import { targetBaseURL } from './environment';
import { fulfillJson } from './tenantSession';
import { syntheticJwt, SYNTHETIC_PLATFORM_USER_ID } from './platformSession';
import { TASK_TENANT_A, TASK_TENANT_B, taskTenants } from './tenantTasksFixture';

/** Platform tenant timeline is read-only; these are fake event records and HTTP replies, not true event delivery/audit. */
export const timelinePermissions = [
 'platform.dashboard.read', 'platform.tenants.read','platform.users.read', 'platform.audit.read',
 'platform.support_sessions.read','platform.incidents.read','platform.maintenance.read',
 'platform.billing.read','platform.data_retention.read'
];
export const timelineSourcePermissions: Record<string,string> = {
 audit:'platform.audit.read',support_session:'platform.support_sessions.read',incident:'platform.incidents.read',
 maintenance:'platform.maintenance.read',tenant_task:'platform.tenants.read',tenant_communication:'platform.tenants.read',
 billing_event:'platform.billing.read',data_retention:'platform.data_retention.read',offboarding:'platform.tenants.read'
};
export const timelineSources=Object.keys(timelineSourcePermissions);
export const TIMELINE_SOURCE_A='timeline-task-a';
export const TIMELINE_SOURCE_B='timeline-incident-b';
export type TimelineItem={id:string;source:string;source_id:string;tenant_id:string;tenant_name:string;title:string;details:string|null;status:string|null;severity:string|null;actor_email:string|null;happened_at:string;metadata:Record<string,unknown>};
export const timelineEvents:TimelineItem[]=[
 {id:`tenant_task:${TIMELINE_SOURCE_A}`,source:'tenant_task',source_id:TIMELINE_SOURCE_A,tenant_id:TASK_TENANT_A,tenant_name:'Fixture Hotel',title:'fixture task onboarded',details:'Fixture operational next step',status:'open',severity:'high',actor_email:'operator@example.test',happened_at:'2026-09-01T12:00:00Z',metadata:{due_at:'2026-11-05T12:00:00Z',ticket_reference:'PW-TIMELINE-01',ignored_secret:'never-display'}},
 {id:`incident:${TIMELINE_SOURCE_B}`,source:'incident',source_id:TIMELINE_SOURCE_B,tenant_id:TASK_TENANT_B,tenant_name:'Fixture Warehouse',title:'fixture incident reported',details:'Fixture incident detail',status:'investigating',severity:'major',actor_email:'incident-operator@example.test',happened_at:'2026-09-02T12:00:00Z',metadata:{impact:'read-only test impact',external_reference:'PX-2'}},
 {id:'tenant_communication:timeline-email-3',source:'tenant_communication',source_id:'timeline-email-3',tenant_id:TASK_TENANT_A,tenant_name:'Fixture Hotel',title:'fixture follow up email',details:'Synthetic communication log only',status:'follow_up_open',severity:'email',actor_email:null,happened_at:'not-date',metadata:{channel:'email',direction:'outbound',contact_name:'Fixture Contact'}}
];
export function makeTimelineEvent(i:number,patch:Partial<TimelineItem>={}):TimelineItem{
 return {...timelineEvents[0],id:`tenant_task:timeline-${String(i).padStart(4,'0')}`,source_id:`timeline-${String(i).padStart(4,'0')}`,title:`fixture timeline event ${String(i).padStart(3,'0')}`,...patch};
}
export type TimelineOverride={status:number;json:unknown};
export type TimelineFixtureOptions={query?:string;permissions?:string[];events?:TimelineItem[];tenants?:typeof taskTenants;
 responses?:Record<string,TimelineOverride>;delayMs?:Record<string,number>;expectHeading?:boolean;
 respond?:(method:string,path:string,query:URLSearchParams)=>TimelineOverride|undefined;
 onCall?:(method:string,path:string,query:URLSearchParams)=>void;
};
export async function openTenantTimeline(page:Page,opts:TimelineFixtureOptions={}){
 targetBaseURL();const perms=opts.permissions??timelinePermissions;
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const request=route.request();if(request.isNavigationRequest())return route.continue();
  const url=new URL(request.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=request.method(),query=url.searchParams;
  opts.onCall?.(method,path,query);
  const key=`${method} ${path}`;
  if(opts.delayMs?.[key])await new Promise(resolve=>setTimeout(resolve,opts.delayMs?.[key]));
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'No synthetic cookie'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'timeline-fixture@example.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions:perms});
  const dynamic=opts.respond?.(method,path,query);if(dynamic)return fulfillJson(route,dynamic.json,dynamic.status);
  const override=opts.responses?.[key];if(override)return fulfillJson(route,override.json,override.status);
  if(method==='GET'&&path==='/platform/tenants')return fulfillJson(route,opts.tenants??taskTenants);
  if(method==='GET'&&path==='/platform/tenant-timeline'){
   const available=timelineSources.filter(source=>perms.includes(timelineSourcePermissions[source]));
   const omitted=timelineSources.filter(source=>!available.includes(source));
   const redact=!perms.includes('platform.users.read');
   const filtered=(opts.events??timelineEvents).filter(event=>available.includes(event.source)
    &&(!query.get('tenant_id')||event.tenant_id===query.get('tenant_id'))
    &&(!query.get('source')||event.source===query.get('source')));
   const offset=Number(query.get('offset')||0),limit=Number(query.get('limit')||100);
   const events=filtered.slice(offset,offset+limit).map(e=>({...e,actor_email:redact?null:e.actor_email}));
   return fulfillJson(route,{tenant_id:query.get('tenant_id')||null,source:query.get('source')||null,
    days:Number(query.get('days')||90),limit,offset,available_sources:available,omitted_sources:omitted,
    actor_identity_redacted:redact,counts:{},pagination:{limit,offset,has_more:offset+limit<filtered.length},events});
  }
  return fulfillJson(route,[]);
 });
 await page.goto(`/platform/tenant-timeline${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Tenant timeline',exact:true})).toBeVisible();
}
export { TASK_TENANT_A,TASK_TENANT_B };
