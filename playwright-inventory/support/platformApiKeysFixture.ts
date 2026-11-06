/** Batch 70 — isolated Platform API Keys browser transport.
 * Synthetic keys and returned secrets only. Cannot prove real hashes, IP enforcement,
 * credential revocation, tenant isolation, permission checks, or external API access. */
import { expect, type Page, type Route } from '@playwright/test';
import { targetBaseURL } from './environment';
import { fulfillJson } from './tenantSession';
import { syntheticJwt, SYNTHETIC_PLATFORM_USER_ID } from './platformSession';

export const KEY_TENANT_A='11111111-1111-4111-8111-111111111111';
export const KEY_TENANT_B='22222222-2222-4222-8222-222222222222';
export const KEY_ACTIVE='33333333-3333-4333-8333-333333333333';
export const KEY_REVOKED='44444444-4444-4444-8444-444444444444';
export const KEY_EXPIRED='55555555-5555-4555-8555-555555555555';
export const KEY_LEGACY='66666666-6666-4666-8666-666666666666';
export const KEY_SECRET='inv_live_fixture10_SYNTHETIC_ONLY_DO_NOT_USE';
export const keyScopes=['products:read','stock:read','purchase_orders:read'];
export const keyPermissions=[
 'platform.dashboard.read','platform.api_keys.read','platform.api_keys.write',
 'platform.tenants.read','platform.users.read','platform.audit.read',
 'platform.webhooks.read','platform.dependencies.read'
];
export const keySeed=[
 {id:KEY_ACTIVE,tenant_id:KEY_TENANT_A,tenant_name:'Fixture Hotel',name:'Fixture ERP sync',description:'Synthetic integration',key_prefix:'fixture10',scopes:['products:read'],unsupported_scopes:[],public_api_compatible:true,allowed_ips:['203.0.113.10'],expires_at:null,last_used_at:null,last_used_ip:null,revoked_at:null,is_active:true,is_expired:false,created_at:'2026-11-03T09:00:00Z',created_by_email:'issuer@fixture.test'},
 {id:KEY_REVOKED,tenant_id:KEY_TENANT_B,tenant_name:'Fixture Depot',name:'Fixture retired credential',description:null,key_prefix:'fixture20',scopes:['stock:read'],unsupported_scopes:[],public_api_compatible:true,allowed_ips:[],expires_at:null,last_used_at:null,last_used_ip:null,revoked_at:'2026-11-02T09:00:00Z',is_active:false,is_expired:false,created_at:'2026-11-01T09:00:00Z',created_by_email:'issuer@fixture.test',revoked_by_email:'revoker@fixture.test',revoke_reason:'Fixture retirement'},
 {id:KEY_EXPIRED,tenant_id:KEY_TENANT_A,tenant_name:'Fixture Hotel',name:'Fixture expired credential',description:'Expired fixture',key_prefix:'fixture30',scopes:['products:read'],unsupported_scopes:[],public_api_compatible:true,allowed_ips:[],expires_at:'2020-01-01T09:00:00Z',last_used_at:null,last_used_ip:null,revoked_at:null,is_active:false,is_expired:true,created_at:'2019-12-31T09:00:00Z',created_by_email:'issuer@fixture.test'},
 {id:KEY_LEGACY,tenant_id:KEY_TENANT_B,tenant_name:'Fixture Depot',name:'Fixture legacy client',description:null,key_prefix:'hla_old00',scopes:['old:incompatible'],unsupported_scopes:['old:incompatible'],public_api_compatible:false,allowed_ips:[],expires_at:null,last_used_at:null,last_used_ip:null,revoked_at:null,is_active:true,is_expired:false,created_at:'2026-10-30T09:00:00Z',created_by_email:'issuer@fixture.test'}
];
export type KeyRow=typeof keySeed[number]&Record<string,any>;
export function manyKeys(count:number):KeyRow[]{return Array.from({length:count},(_,i)=>({...keySeed[0],id:`${String(i+1).padStart(8,'0')}-7777-4777-8777-${String(i+1).padStart(12,'0')}`,name:`Fixture API client ${String(i+1).padStart(3,'0')}`}));}
export type KeyAnswer={status?:number;json:any};
export type KeyOptions={query?:string;permissions?:string[];rows?:KeyRow[];contract?:Record<string,unknown>;
 access?:{tenant:boolean;platform_user_identity:boolean};responses?:Record<string,KeyAnswer>;
 respond?:(method:string,path:string,query:URLSearchParams,body:any)=>KeyAnswer|undefined;
 onCall?:(method:string,path:string,query:URLSearchParams,body:any)=>void;expectHeading?:boolean};
export async function openApiKeys(page:Page,opts:KeyOptions={}){
 targetBaseURL();const permissions=opts.permissions??keyPermissions;const rows:KeyRow[]=(opts.rows??keySeed).map(r=>({...r}));
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const u=new URL(req.url()),path=u.pathname.replace(/^\/api(?=\/)/,''),method=req.method();
  let body:any=null;try{body=req.postDataJSON();}catch{body=req.postData()??null;}
  opts.onCall?.(method,path,u.searchParams,body);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Fixture refresh denied'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'api-key-fixture@example.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions});
  const replacement=opts.respond?.(method,path,u.searchParams,body)??opts.responses?.[`${method} ${path}`];
  if(replacement)return fulfillJson(route,replacement.json,replacement.status??200);
  if(method==='GET'&&path==='/platform/tenants')return fulfillJson(route,[{id:KEY_TENANT_A,name:'Fixture Hotel'},{id:KEY_TENANT_B,name:'Fixture Depot'}]);
  if(method==='GET'&&path==='/platform/api-keys'){
   const query=u.searchParams,limit=Number(query.get('limit')??50),offset=Number(query.get('offset')??0);
   const found=rows.filter(k=>(query.get('include_revoked')==='true'||!k.revoked_at)&&(!query.get('tenant_id')||query.get('tenant_id')===k.tenant_id)&&(!query.get('search')||`${k.name} ${k.description??''} ${k.key_prefix}`.toLowerCase().includes(query.get('search')!.toLowerCase())));
   return fulfillJson(route,{api_keys:found.slice(offset,offset+limit),scopes:keyScopes,evidence_access:opts.access??{tenant:permissions.includes('platform.tenants.read'),platform_user_identity:permissions.includes('platform.users.read')},pagination:{limit,offset,has_more:offset+limit<found.length},public_api_contract:opts.contract??{base_path:'/api/public/v1',new_key_format:'inv_live_<prefix>_<secret>',legacy_hla_format_recognized:true,allowed_ips_enforced_for_platform_keys:true}});
  }
  if(method==='POST'&&path==='/platform/api-keys'){
   const row={...keySeed[0],...body,id:'77777777-7777-4777-8777-777777777777',tenant_name:body.tenant_id===KEY_TENANT_B?'Fixture Depot':'Fixture Hotel',key_prefix:'newkey00',created_at:'2026-11-04T09:00:00Z'};
   rows.unshift(row);return fulfillJson(route,{api_key:row,secret:KEY_SECRET,warning:'Show this credential once',public_api_base_path:'/api/public/v1'},201);
  }
  if(method==='PATCH'&&/^\/platform\/api-keys\/[^/]+$/.test(path)){
   const row=rows.find(k=>k.id===path.split('/').at(-1));if(!row)return fulfillJson(route,{message:'Synthetic key missing'},404);Object.assign(row,body);row.is_expired=Boolean(row.expires_at&&new Date(row.expires_at).getTime()<Date.now());row.is_active=!row.revoked_at&&!row.is_expired;return fulfillJson(route,{api_key:row});
  }
  if(method==='POST'&&/^\/platform\/api-keys\/[^/]+\/(revoke|rotate)$/.test(path)){
   const action=path.split('/').at(-1),id=path.split('/').at(-2),row=rows.find(k=>k.id===id);if(!row)return fulfillJson(route,{message:'Synthetic key missing'},404);
   if(action==='rotate')return fulfillJson(route,{api_key:row,secret:KEY_SECRET,warning:'Copy the rotated credential once',public_api_base_path:'/api/public/v1'});
   Object.assign(row,{revoked_at:'2026-11-04T09:30:00Z',is_active:false,revoke_reason:body?.reason??null});return fulfillJson(route,{api_key:row});
  }
  return fulfillJson(route,[]);
 });
 await page.goto(`/platform/api-keys${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'API keys',exact:true})).toBeVisible();
}
