/** Batch 71 — read-only, synthetic API client governance transport fixture.
 * Neither calculated risk postures nor mocked request responses prove actual API use,
 * credential enforcement, database isolation or external customer integrations. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';
import {KEY_TENANT_A,KEY_TENANT_B,KEY_ACTIVE,KEY_REVOKED,keyPermissions} from './platformApiKeysFixture';

export const govPermissions=[...keyPermissions,'platform.access_reviews.read'];
export const govActive={
 id:KEY_ACTIVE,tenant_id:KEY_TENANT_A,tenant_name:'Fixture Hotel',name:'Fixture ERP client',description:'Synthetic finance sync',key_prefix:'fixture10',
 scopes:['products:read'],allowed_ips:['203.0.113.10'],allowed_ip_count:1,expires_at:null,last_used_at:null,last_used_ip:null,
 created_at:'2026-08-01T09:00:00Z',updated_at:null,created_by_email:'issuer@fixture.test',revoked_at:null,is_active:true,is_expired:false,
 days_since_created:95,days_since_last_used:null,days_until_expiration:null,risk_flags:['api_client_missing_expiration'],public_api_compatible:true,governance_state:'api_client_review_required'
};
export const govRevoked={
 ...govActive,id:KEY_REVOKED,tenant_id:KEY_TENANT_B,tenant_name:'Fixture Depot',name:'Fixture retired client',description:null,
 key_prefix:'fixture20',scopes:['stock:read'],allowed_ips:[],allowed_ip_count:0,revoked_at:'2026-10-20T09:00:00Z',is_active:false,
 risk_flags:[],governance_state:'api_client_revoked',created_by_email:'other@fixture.test'
};
export type GovRow=typeof govActive&Record<string,any>;
export function manyGovClients(count:number):GovRow[]{return Array.from({length:count},(_,i)=>({...govActive,id:`${String(i+1).padStart(8,'0')}-8888-4888-8888-${String(i+1).padStart(12,'0')}`,name:`Fixture governance client ${String(i+1).padStart(3,'0')}`}));}
export const govSummary={total_clients:2,governance_relevant_clients:1,active_clients:1,revoked_clients:1,clients_requiring_review:1,clients_without_expiration:1,
 clients_without_network_allowlist:0,stale_clients:0,write_scoped_clients:0,critical_clients_without_network_control:0,expiring_soon_clients:0,
 expired_clients:0,clients_without_scopes:0,clients_with_unsupported_scopes:0,tenants_with_clients:2};
export const govControls={read_only:true,mutation_owner:'platform_api_keys',source_routes:['/platform/api-keys'],no_raw_secret_export:true,no_key_hash_export:true,
 secret_material_fields_blocked:['key_hash','raw_secret'],required_controls:['tenant_binding','scope_contract','ip_allowlist'],supported_scopes:['products:read','stock:read'],
 write_scopes:['products:write'],stale_days:90,expiring_soon_days:30,revoked_clients_drive_posture:false,never_used_grace_days:90,
 summary_scope:'filtered_registry',page_scope:'bounded_page'};
export const govTruth={posture_is_external_integration_certification:false,last_used_is_application_observed_api_usage_only:true,no_clients_means_external_integrations_absent:false,
 interpretation:'Synthetic governance only: this board cannot certify external integration success.'};
export type GovOptions={query?:string;permissions?:string[];rows?:GovRow[];summary?:Record<string,any>;posture?:string;controls?:Record<string,any>;
 access?:{tenant:boolean;platform_user_identity:boolean};truth?:Record<string,any>;status?:number;
 responses?:Record<string,{status?:number;json:any}>;
 respond?:(method:string,path:string,query:URLSearchParams)=>{status?:number;json:any}|undefined;
 onCall?:(method:string,path:string,query:URLSearchParams)=>void;expectHeading?:boolean};
export async function openGovernance(page:Page,opts:GovOptions={}){
 targetBaseURL();const permissions=opts.permissions??govPermissions,rows:GovRow[]=(opts.rows??[govActive,govRevoked]).map(x=>({...x}));
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),q=url.searchParams;
  opts.onCall?.(method,path,q);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic refresh unavailable'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'governance-fixture@example.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions});
  const override=opts.respond?.(method,path,q)??opts.responses?.[`${method} ${path}`];
  if(override)return fulfillJson(route,override.json,override.status??200);
  if(method==='GET'&&path==='/platform/tenants')return fulfillJson(route,[{id:KEY_TENANT_A,name:'Fixture Hotel'},{id:KEY_TENANT_B,name:'Fixture Depot'}]);
  if(method==='GET'&&path==='/platform/api-client-governance/governance'){
   const limit=Number(q.get('limit')??50),offset=Number(q.get('offset')??0);
   const filtered=rows.filter(x=>(q.get('include_revoked')==='true'||!x.revoked_at)&&(!q.get('tenant_id')||x.tenant_id===q.get('tenant_id'))&&
      (!q.get('search')||`${x.name} ${x.description??''} ${x.key_prefix} ${x.tenant_name}`.toLowerCase().includes(q.get('search')!.toLowerCase())));
   return fulfillJson(route,{feature:'api_client_governance',phase:1,step:1,posture:opts.posture??'api_client_governance_review_required',
    summary:opts.summary??{...govSummary,governance_relevant_clients:filtered.filter(x=>!x.revoked_at).length,revoked_clients:filtered.filter(x=>x.revoked_at).length},
    evidence_access:opts.access??{tenant:permissions.includes('platform.tenants.read'),platform_user_identity:permissions.includes('platform.users.read')},
    pagination:{limit,offset,has_more:offset+limit<filtered.length},governance_controls:opts.controls??govControls,truthfulness:opts.truth??govTruth,
    api_clients:filtered.slice(offset,offset+limit)});
  }
  return fulfillJson(route,[]);
 });
 await page.goto(`/platform/api-client-governance${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'API client governance',exact:true})).toBeVisible();
}
