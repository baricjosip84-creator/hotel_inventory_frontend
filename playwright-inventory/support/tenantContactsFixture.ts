/** Synthetic page transport for Platform Tenant Contacts. No real people, real tenant data,
 * server authorization, persistence, escalation delivery, or browser execution in Phase 1. */
import { expect, type Page, type Route } from '@playwright/test';
import { targetBaseURL } from './environment';
import { fulfillJson } from './tenantSession';
import { syntheticJwt, SYNTHETIC_PLATFORM_USER_ID } from './platformSession';

export const CONTACT_TENANT_A='aaaaaaaa-aaaa-4aaa-8aaa-111111111111';
export const CONTACT_TENANT_B='bbbbbbbb-bbbb-4bbb-8bbb-222222222222';
export const CONTACT_RECORD_A='cccccccc-cccc-4ccc-8ccc-333333333333';
export type ContactRecord={id:string;tenant_id:string;tenant_name?:string;contact_type:string;name:string;
  email?:string|null;phone?:string|null;title?:string|null;is_primary:boolean;escalation_order:number;
  notes?:string|null;created_at?:string|null;updated_at?:string|null;created_by_name?:string|null;created_by_email?:string|null};
export const contactTenants=[{id:CONTACT_TENANT_A,name:'Fixture Hotel',location:'Rijeka'},{id:CONTACT_TENANT_B,name:'Fixture Warehouse',location:'Zagreb'}];
export const contactRecords:ContactRecord[]=[
  {id:CONTACT_RECORD_A,tenant_id:CONTACT_TENANT_A,tenant_name:'Fixture Hotel',contact_type:'operations',name:'Fixture Contact',email:'fixture@example.test',phone:'+385111222',title:'Duty manager',is_primary:true,escalation_order:1,notes:'Fixture only',created_at:'2026-10-01T12:00:00Z',updated_at:'2026-10-02T12:00:00Z',created_by_name:'Fixture Operator'},
  {id:'dddddddd-dddd-4ddd-8ddd-444444444444',tenant_id:CONTACT_TENANT_B,tenant_name:'Fixture Warehouse',contact_type:'emergency',name:'No Channel Contact',email:null,phone:null,title:null,is_primary:false,escalation_order:2,notes:null,created_at:null,updated_at:null,created_by_name:null}
];
export const contactPermissionSnapshot=['platform.dashboard.read','platform.tenants.read','platform.tenants.update','platform.billing.read','platform.sla.read','platform.incidents.read','platform.support_sessions.read'];
export type ContactsResponse={status:number;json:unknown};
export type ContactsFixtureOptions={query?:string;expectHeading?:boolean;permissions?:string[];tenants?:typeof contactTenants;contacts?:ContactRecord[];
  responses?:Record<string,ContactsResponse>;delayMs?:Record<string,number>;
  respond?:(method:string,path:string,body:unknown,query:URLSearchParams)=>ContactsResponse|undefined;
  onCall?:(method:string,path:string,body:unknown,query:URLSearchParams)=>void};
export async function openTenantContacts(page:Page,opts:ContactsFixtureOptions={}){
  targetBaseURL();
  const storedContacts:ContactRecord[]=(opts.contacts??contactRecords).map(row=>({...row}));
  await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
  await page.route('**/platform/**',async (route:Route)=>{
    const req=route.request();if(req.isNavigationRequest())return route.continue();
    const url=new URL(req.url());const path=url.pathname.replace(/^\/api(?=\/)/,'');const method=req.method();
    let body:unknown=null;if(method!=='GET')try{body=req.postDataJSON()}catch{body=req.postData()}
    opts.onCall?.(method,path,body,url.searchParams);
    const key=`${method} ${path}`;
    if(opts.delayMs?.[key])await new Promise(resolve=>setTimeout(resolve,opts.delayMs?.[key]));
    if(path==='/platform/auth/refresh')return fulfillJson(route,{error:{message:'No synthetic session cookie'}},401);
    if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'contacts-fixture@example.test',role:'superadmin',is_active:true});
    if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions:opts.permissions??contactPermissionSnapshot});
    const dynamic=opts.respond?.(method,path,body,url.searchParams);
    if(dynamic)return fulfillJson(route,dynamic.json,dynamic.status);
    const override=opts.responses?.[key];if(override)return fulfillJson(route,override.json,override.status);
    if(method==='GET'&&path==='/platform/tenants')return fulfillJson(route,opts.tenants??contactTenants);
    if(method==='GET'&&path==='/platform/tenant-contacts'){
      const filtered=storedContacts.filter(row=>(!url.searchParams.get('tenant_id')||row.tenant_id===url.searchParams.get('tenant_id'))&&
        (!url.searchParams.get('contact_type')||row.contact_type===url.searchParams.get('contact_type')));
      const offset=Number(url.searchParams.get('offset')||0);const limit=Number(url.searchParams.get('limit')||100);
      return fulfillJson(route,filtered.slice(offset,offset+limit));
    }
    const create=/^\/platform\/tenant-contacts\/tenants\/([^/]+)$/.exec(path);
    if(method==='POST'&&create){
      const payload=(body??{}) as Partial<ContactRecord>;
      const id='eeeeeeee-eeee-4eee-8eee-555555555555';
      const tenant=(opts.tenants??contactTenants).find(row=>row.id===create[1]);
      const record:ContactRecord={id,tenant_id:create[1],tenant_name:tenant?.name??create[1],contact_type:payload.contact_type??'operations',name:payload.name??'',email:payload.email??null,phone:payload.phone??null,title:payload.title??null,is_primary:payload.is_primary??false,escalation_order:payload.escalation_order??1,notes:payload.notes??null,created_at:'2026-11-01T12:00:00Z',updated_at:'2026-11-01T12:00:00Z',created_by_name:'Fixture Operator'};
      storedContacts.push(record);return fulfillJson(route,record,201);
    }
    const contactId=/^\/platform\/tenant-contacts\/([^/]+)$/.exec(path);
    if(contactId&&method==='PATCH'){
      const index=storedContacts.findIndex(row=>row.id===contactId[1]);
      if(index<0)return fulfillJson(route,{error:{message:'Contact not found'}},404);
      const payload=(body??{}) as Partial<ContactRecord>;
      storedContacts[index]={...storedContacts[index],...payload,updated_at:'2026-11-01T12:00:00Z'};
      return fulfillJson(route,storedContacts[index]);
    }
    if(contactId&&method==='DELETE'){
      const index=storedContacts.findIndex(row=>row.id===contactId[1]);
      if(index<0)return fulfillJson(route,{error:{message:'Contact not found'}},404);
      storedContacts.splice(index,1);return fulfillJson(route,{success:true});
    }
    return fulfillJson(route,[]);
  });
  await page.goto('/platform/tenant-contacts'+(opts.query?(opts.query.startsWith('?')?opts.query:'?'+opts.query):''));
  if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Tenant contacts',exact:true})).toBeVisible();
}
