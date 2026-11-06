/** Batch 102 — enterprise identity governance synthetic response fixture (Phase 1, never executed).
 * Metadata and runtime signals below mirror backend/src/config/enterpriseIdentityGovernance.js.
 * This cannot establish federation, provider connectivity, authentication success, credential secrecy,
 * external audit retention, real platform permission authorization or SQL tenant isolation. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';

export const identityPath='/platform/enterprise-identity/governance';
export const identityPermissions=[
 'platform.dashboard.read','platform.security.read','platform.audit.read','platform.access_reviews.read',
 'platform.compliance.read','platform.users.read','platform.sessions.read'
];
export const identityRuntime={platform_password_login:true,platform_totp_mfa:true,oidc_login_execution:false,
 saml_assertion_processing:false,sso_requirement_enforced:false,password_fallback_policy_enforced:false,
 jit_provisioning_execution:false,tenant_domain_discovery_execution:false,verified_domain_match_enforced:false,
 domain_admin_approval_enforced:false};
export type IdentitySnapshot={generated_at:string;posture:string;enabled_providers:string[];provider_count:number;
 runtime_sso_provider_count:number;sso_runtime_operational:boolean;password_login_fallback_allowed:boolean;
 tenant_domain_discovery_enabled:boolean;jit_provisioning_allowed:boolean;configuration_attention:string[];runtime_attention:string[];
 attention:string[];runtime_capabilities:Record<string,boolean>;evidence_complete:boolean;evidence_access:Record<string,boolean>;
 truth_contract:Record<string,boolean>;config:{configuration_source:string;enforcement:Record<string,boolean|number|string>;
 providers:Record<string,Record<string,boolean|string|string[]>>;audit:Record<string,boolean|number|string>}};
export const identityDefault:IdentitySnapshot={
 generated_at:'2026-11-05T12:00:00Z',posture:'identity_governance_review_required',enabled_providers:[],provider_count:0,
 runtime_sso_provider_count:0,sso_runtime_operational:false,password_login_fallback_allowed:true,
 tenant_domain_discovery_enabled:false,jit_provisioning_allowed:false,configuration_attention:[],
 runtime_attention:['platform_sso_runtime_not_operational'],attention:['platform_sso_runtime_not_operational'],
 runtime_capabilities:{...identityRuntime},evidence_complete:true,
 evidence_access:{environment_governance_metadata:true,platform_auth_runtime_contract:true},
 truth_contract:{environment_configuration_is_not_runtime_enforcement:true,
 configured_provider_is_not_verified_provider_connectivity:true,
 configured_sso_required_flag_is_not_enforced_by_platform_auth:true,
 login_audit_requirement_flag_is_not_proof_of_sso_login_audit:true,
 platform_auth_currently_uses_password_and_optional_totp:true},
 config:{configuration_source:'environment_metadata',enforcement:{
  sso_required_for_platform_users:false,password_login_fallback_allowed:true,jit_provisioning_allowed:false,
  tenant_domain_discovery_enabled:false,require_verified_domain_match:true,
  require_admin_approval_for_new_domains:true,max_domains_per_tenant:25},
  providers:{oidc:{enabled:false,issuer:'',client_id_status:'not_configured',client_secret_status:'not_configured',allowed_domains:[]},
  saml:{enabled:false,entity_id:'',sso_url:'',certificate_status:'not_configured',allowed_domains:[]}},
  audit:{login_events_required:true,configuration_change_audit_required:true,retention_days:365}}
};
export function identityVariant(update:(value:IdentitySnapshot)=>void):IdentitySnapshot{
 const value=JSON.parse(JSON.stringify(identityDefault)) as IdentitySnapshot;update(value);return value;
}
export const identityOidc=identityVariant(v=>{
 v.posture='identity_governance_attention_required';v.enabled_providers=['oidc'];v.provider_count=1;
 v.config.providers.oidc={enabled:true,issuer:'https://idp.fixture.test',client_id_status:'configured',
  client_secret_status:'configured',allowed_domains:['one.example','two.example']};
 v.runtime_attention=['oidc_configured_but_login_execution_not_implemented','platform_sso_runtime_not_operational'];
 v.attention=[...v.runtime_attention];
});
export const identitySaml=identityVariant(v=>{
 v.posture='identity_governance_attention_required';v.enabled_providers=['saml'];v.provider_count=1;
 v.config.providers.saml={enabled:true,entity_id:'fixture-entity',sso_url:'https://saml.fixture.test/login',
  certificate_status:'configured',allowed_domains:['tenant.example']};
 v.runtime_attention=['saml_configured_but_assertion_processing_not_implemented','platform_sso_runtime_not_operational'];
 v.attention=[...v.runtime_attention];
});
export type IdentityFixtureOptions={permissions?:string[];payload?:IdentitySnapshot;expectHeading?:boolean;query?:string;
 onCall?:(method:string,path:string)=>void;
 respond?:(method:string,path:string)=>{json:any;status?:number}|undefined|Promise<{json:any;status?:number}|undefined>};
export async function openEnterpriseIdentity(page:Page,opts:IdentityFixtureOptions={}){
 targetBaseURL();const permissions=opts.permissions??identityPermissions;
 await page.addInitScript(token=>{
  localStorage.setItem('inventory_platform_access_token',token);
  localStorage.setItem('inventory_locale','en-GB');
 },syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const u=new URL(req.url()),path=u.pathname.replace(/^\/api(?=\/)/,''),method=req.method();opts.onCall?.(method,path);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Fixture refresh disallowed'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',email:'enterprise-fixture@sample.test',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{scope:'platform',role:'superadmin',platform_user_id:SYNTHETIC_PLATFORM_USER_ID,permissions});
  const override=await opts.respond?.(method,path);if(override)return fulfillJson(route,override.json,override.status??200);
  if(path===identityPath&&method==='GET')return permissions.includes('platform.security.read')?
   fulfillJson(route,opts.payload??identityDefault):fulfillJson(route,{message:'Forbidden'},403);
  return fulfillJson(route,{message:'Isolated identity fixture: no route match'},404);
 });
 await page.goto('/platform/enterprise-identity'+(opts.query?'?'+opts.query:''));
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Enterprise identity',exact:true})).toBeVisible();
}
