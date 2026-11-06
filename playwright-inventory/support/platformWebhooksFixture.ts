/** Batch 75: disposable, synthetic Platform Webhooks browser transport.
 * Does not send HTTP to user webhooks, validate real signing, delivery, ACL or DB persistence. */
import {expect, type Page, type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';

export const webhookTenantA='11111111-1111-4111-8111-111111111111';
export const webhookTenantB='22222222-2222-4222-8222-222222222222';
export const webhookIdA='30000000-0000-4000-8000-000000000001';
export const webhookIdB='30000000-0000-4000-8000-000000000002';
export const webhookPermissions=[
 'platform.dashboard.read','platform.webhooks.read','platform.webhooks.write','platform.tenants.read','platform.users.read',
 'platform.audit.read','platform.dependencies.read','platform.api_keys.read','platform.notifications.read','platform.jobs.read'
];
export const webhookEvents=['tenant.updated','incident.created','api_key.created'];
export const readyWebhook={id:webhookIdA,tenant_id:webhookTenantA,tenant_name:'Fixture Hotel',name:'Fixture Active Webhook',
 url:'https://webhook.fixture.example/v1/receive',description:'Product inventory updates',event_types:['tenant.updated'],secret_prefix:'webhook1',
 signing_secret_ready:true,delivery_posture:'observed_success',is_enabled:true,is_healthy:true,last_delivery_at:'2026-11-03T12:00:00Z',
 last_delivery_status:'succeeded',consecutive_failure_count:0,disabled_reason:null,
 created_at:'2026-10-01T09:00:00Z',updated_at:'2026-11-03T12:00:00Z',created_by_email:'operator@fixture.test',updated_by_email:'reviewer@fixture.test'};
export const legacyWebhook={...readyWebhook,id:webhookIdB,tenant_id:webhookTenantB,tenant_name:'Fixture Depot',name:'Fixture Legacy Webhook',
 url:'https://legacy.fixture.example/hook',description:null,event_types:['incident.created'],secret_prefix:'legacy02',
 signing_secret_ready:false,delivery_posture:'secret_rotation_required',is_enabled:false,is_healthy:null,
 last_delivery_at:null,last_delivery_status:null,consecutive_failure_count:3,disabled_reason:'Manual pause'};
export const successfulDelivery={id:'40000000-0000-4000-8000-000000000001',webhook_id:webhookIdA,webhook_name:'Fixture Active Webhook',
 tenant_id:webhookTenantA,tenant_name:'Fixture Hotel',event_type:'tenant.updated',delivery_status:'succeeded',response_status:204,
 error_message:null,attempt_count:1,next_retry_at:null,last_attempt_at:'2026-11-03T12:00:00Z',completed_at:'2026-11-03T12:00:01Z',
 created_at:'2026-11-03T12:00:00Z'};
export type FixtureWebhook=(typeof readyWebhook)&Record<string,any>;
export type FixtureDelivery=(typeof successfulDelivery)&Record<string,any>;
export function manyWebhooks(count:number):FixtureWebhook[]{return Array.from({length:count},(_,i)=>({...readyWebhook,
  id:`${String(i+1).padStart(8,'0')}-0000-4000-8000-${String(i+1).padStart(12,'0')}`,
  name:`Fixture Endpoint ${String(i+1).padStart(3,'0')}`}));}
export type WebhookFixtureOptions={query?:string;permissions?:string[];endpoints?:FixtureWebhook[];deliveries?:FixtureDelivery[];
 access?:{tenant?:boolean;platform_user_identity?:boolean};contract?:Record<string,any>;
 responses?:Record<string,{status?:number;json:any}>;
 respond?:(method:string,path:string,q:URLSearchParams,body:any)=>{status?:number;json:any}|undefined|Promise<{status?:number;json:any}|undefined>;
 onCall?:(method:string,path:string,q:URLSearchParams,body:any)=>void;expectHeading?:boolean};
export async function openWebhooks(page:Page,opts:WebhookFixtureOptions={}){
 targetBaseURL();const permissions=opts.permissions??webhookPermissions;
 let endpoints=(opts.endpoints??[readyWebhook,legacyWebhook]).map(x=>({...x}));
 let deliveryRows=(opts.deliveries??[successfulDelivery]).map(x=>({...x}));
 const tenants=[{id:webhookTenantA,name:'Fixture Hotel'},{id:webhookTenantB,name:'Fixture Depot'}];
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),m=req.method(),q=url.searchParams;
  let body:any={};try{body=req.postDataJSON()??{};}catch{body={};}
  opts.onCall?.(m,path,q,body);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic refresh unavailable'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'webhook-operator@fixture.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions});
  const override=(await opts.respond?.(m,path,q,body))??opts.responses?.[`${m} ${path}`];
  if(override)return fulfillJson(route,override.json,override.status??200);
  if(path==='/platform/tenants'&&m==='GET')return fulfillJson(route,tenants);
  if(path==='/platform/webhooks'&&m==='GET'){
   const offset=Number(q.get('offset')??0),limit=Number(q.get('limit')??50),search=(q.get('search')??'').toLowerCase();
   const filtered=endpoints.filter(x=>(!q.get('tenant_id')||x.tenant_id===q.get('tenant_id'))&&
     (q.get('include_disabled')!=='false'||x.is_enabled)&&
     (!search||`${x.name} ${x.description||''} ${x.url}`.toLowerCase().includes(search)));
   return fulfillJson(route,{webhooks:filtered.slice(offset,offset+limit),event_types:webhookEvents,
    evidence_access:{tenant:permissions.includes('platform.tenants.read'),platform_user_identity:permissions.includes('platform.users.read'),...opts.access},
    pagination:{limit,offset,has_more:offset+limit<filtered.length},
    delivery_contract:{https_only:true,private_network_destinations_blocked:true,signing_algorithm:'HMAC-SHA256',automatic_audit_outbox_delivery:true,
      legacy_hash_only_secret_requires_rotation:true,...opts.contract}});
  }
  if(path==='/platform/webhooks/deliveries'&&m==='GET'){
   const offset=Number(q.get('offset')??0),limit=Number(q.get('limit')??50);
   const filtered=deliveryRows.filter(x=>(!q.get('tenant_id')||x.tenant_id===q.get('tenant_id'))&&
      (!q.get('status')||x.delivery_status===q.get('status')));
   return fulfillJson(route,{deliveries:filtered.slice(offset,offset+limit),
     evidence_access:{tenant:permissions.includes('platform.tenants.read'),platform_user_identity:permissions.includes('platform.users.read'),...opts.access},
     pagination:{limit,offset,has_more:offset+limit<filtered.length}});
  }
  if(path==='/platform/webhooks'&&m==='POST'){
   const webhook:FixtureWebhook={...readyWebhook,...body,id:'30000000-0000-4000-8000-000000000099',tenant_name:tenants.find(x=>x.id===body.tenant_id)?.name||null,
     secret_prefix:'newpref',signing_secret_ready:true,delivery_posture:'not_observed',consecutive_failure_count:0};
   endpoints=[webhook,...endpoints];return fulfillJson(route,{webhook,secret:'fixture-once-only-secret',warning:'Only shown on create'},201);
  }
  const matched=path.match(/^\/platform\/webhooks\/([^/]+)(?:\/(rotate-secret|test))?$/);
  if(matched){const idx=endpoints.findIndex(x=>x.id===matched[1]);if(idx<0)return fulfillJson(route,{message:'Synthetic unknown endpoint'},404);
   if(m==='PATCH'&&!matched[2]){endpoints[idx]={...endpoints[idx],...body};return fulfillJson(route,{webhook:endpoints[idx]});}
   if(m==='POST'&&matched[2]==='rotate-secret'){
    endpoints[idx]={...endpoints[idx],secret_prefix:'rotatedx',signing_secret_ready:true,delivery_posture:'not_observed'};
    return fulfillJson(route,{webhook:endpoints[idx],secret:'fixture-rotated-once-secret',warning:'Only shown on rotate'});
   }
   if(m==='POST'&&matched[2]==='test'){
    const delivery={...successfulDelivery,id:'40000000-0000-4000-8000-000000000099',webhook_id:matched[1],webhook_name:endpoints[idx].name};
    deliveryRows=[delivery,...deliveryRows];return fulfillJson(route,{delivery,success:true});
   }
  }
  return fulfillJson(route,[]);
 });
 await page.goto(`/platform/webhooks${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Webhooks',exact:true})).toBeVisible();
}
