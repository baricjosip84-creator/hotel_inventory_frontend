/** Batch 72 · Phase 1 synthetic browser declarations only · GENERATED_UNRUN.
 * No mock proves live platform authorization, API-key revocation, hashing, external
 * integration success, tenant isolation, database security or audit persistence.
 */
import { test, expect, type Page } from '@playwright/test';
import { openGovernance, govPermissions, govActive, govRevoked, govControls, govSummary, manyGovClients } from '../../../support/platformApiClientGovernanceFixture';
import { KEY_TENANT_A, KEY_ACTIVE } from '../../../support/platformApiKeysFixture';

const root=(p:Page)=>p.locator('.platform-api-client-governance');
const registry=(p:Page)=>root(p).locator('.platform-api-client-governance__section').filter({has:p.getByRole('heading',{name:'Governance registry',exact:true})});
const control=(p:Page)=>root(p).locator('.platform-api-client-governance__section').filter({has:p.getByRole('heading',{name:'Governance controls',exact:true})});
const boundary=(p:Page)=>root(p).locator('.platform-api-client-governance__section').filter({has:p.getByRole('heading',{name:'Evidence and truth boundary',exact:true})});
const support=(p:Page)=>root(p).locator('.platform-api-client-governance__section').filter({has:p.getByRole('heading',{name:'Supporting operations',exact:true})});
const client=(p:Page,name='Fixture ERP client')=>registry(p).locator('.platform-api-client-governance__card').filter({has:p.getByRole('heading',{name,exact:true})});
const without=(...denied:string[])=>govPermissions.filter(x=>!denied.includes(x));
const readRequests=(items:string[]) => (method:string,path:string)=> {if(method==='GET' && (path==='/platform/tenants'||path.endsWith('/api-client-governance/governance'))) items.push(path);};

test.describe('Platform API Client Governance — access, refresh and URL filters (GENERATED_UNRUN)',()=>{
 test('PACG-031 Governance read permission guard prevents page rendering',async({page})=>{
  const calls:string[]=[];await openGovernance(page,{permissions:without('platform.api_keys.read'),expectHeading:false,onCall:readRequests(calls)});
  await expect(root(page)).toHaveCount(0);expect(calls).not.toContain('/platform/api-client-governance/governance');
 });
 test('PACG-032 Governance refresh requests a fresh snapshot and tenant directory',async({page})=>{
  const calls:string[]=[];await openGovernance(page,{onCall:readRequests(calls)});
  const beforeGov=calls.filter(x=>x.endsWith('/governance')).length,beforeTenants=calls.filter(x=>x==='/platform/tenants').length;
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>calls.filter(x=>x.endsWith('/governance')).length).toBeGreaterThan(beforeGov);
  await expect.poll(()=>calls.filter(x=>x==='/platform/tenants').length).toBeGreaterThan(beforeTenants);
 });
 test('PACG-033 Governance refresh error leaves last successful snapshot visible',async({page})=>{
  let broken=false;await openGovernance(page,{respond:(method,path)=>method==='GET'&&path.endsWith('/governance')&&broken?{status:503,json:{message:'Synthetic refresh outage'}}:undefined});
  await expect(client(page)).toBeVisible();broken=true;
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(root(page)).toContainText('Showing the last successful API client governance snapshot.');
  await expect(client(page)).toBeVisible();
 });
 test('PACG-034 Governance Retry recovers from an initial HTTP 503 once synthetic fault clears',async({page})=>{
  let broken=true;await openGovernance(page,{respond:(method,path)=>method==='GET'&&path.endsWith('/governance')&&broken?{status:503,json:{message:'Synthetic initial outage'}}:undefined});
  await expect(registry(page)).toContainText('API client governance unavailable');broken=false;
  await registry(page).getByRole('button',{name:'Retry'}).click();await expect(client(page)).toBeVisible();
 });
 test('PACG-035 Tenant directory 503 preserves governance evidence with warning',async({page})=>{
  await openGovernance(page,{responses:{'GET /platform/tenants':{status:503,json:{message:'Synthetic directory offline'}}}});
  await expect(root(page)).toContainText('Tenant directory unavailable.');await expect(client(page)).toBeVisible();
 });
 test('PACG-036 Tenant directory empty prevents selecting a tenant filter',async({page})=>{
  await openGovernance(page,{responses:{'GET /platform/tenants':{json:[]}}});
  await expect(registry(page).getByLabel('Tenant')).toHaveCount(1);
  await expect(registry(page).getByLabel('Tenant').locator('option')).toHaveCount(1);
 });
 test('PACG-037 URL search maxlength is limited to 200 characters',async({page})=>{
  await openGovernance(page);await expect(registry(page).getByLabel('Search')).toHaveAttribute('maxlength','200');
 });
 test('PACG-038 Valid include_revoked=false is omitted from transport query',async({page})=>{
  const values:string[]=[];await openGovernance(page,{query:'include_revoked=false',onCall:(m,p,q)=>{if(m==='GET'&&p.endsWith('/governance'))values.push(q.toString());}});
  expect(values[0]).not.toContain('include_revoked');await expect(client(page,'Fixture retired client')).toHaveCount(0);
 });
 test('PACG-039 Removing revoked-history filter returns to active records and page one',async({page})=>{
  await openGovernance(page,{query:'include_revoked=true',rows:[...manyGovClients(55),govRevoked]});
  await registry(page).getByRole('button',{name:'Next'}).click();await expect(registry(page)).toContainText('Page 2');
  await registry(page).getByLabel('Include revoked history').uncheck();
  await expect(registry(page)).toContainText('Page 1');await expect.poll(()=>new URL(page.url()).searchParams.has('include_revoked')).toBe(false);
 });
 test('PACG-040 Tenant selector change resets page offset to zero',async({page})=>{
  const records=[...manyGovClients(55).map(x=>({...x,tenant_id:KEY_TENANT_A})),govRevoked];
  await openGovernance(page,{rows:records});await registry(page).getByRole('button',{name:'Next'}).click();
  await registry(page).getByLabel('Tenant').selectOption(KEY_TENANT_A);
  await expect(registry(page)).toContainText('Page 1');await expect(registry(page).getByRole('button',{name:'Previous'})).toBeDisabled();
 });
 test('PACG-041 Search input changes preserve unrelated URL parameters',async({page})=>{
  await openGovernance(page,{query:'audit_marker=keep'});await registry(page).getByLabel('Search').fill('ERP');
  await expect.poll(()=>new URL(page.url()).searchParams.get('search')).toBe('ERP');
  expect(new URL(page.url()).searchParams.get('audit_marker')).toBe('keep');
 });
 test('PACG-042 Invalid tenant filter clear removes only governance filter keys',async({page})=>{
  await openGovernance(page,{query:'tenant_id=invalid&search=ERP&include_revoked=true&external=retain'});
  await registry(page).getByRole('button',{name:'Clear invalid filters'}).click();const params=new URL(page.url()).searchParams;
  for(const x of ['tenant_id','search','include_revoked'])expect(params.has(x)).toBe(false);expect(params.get('external')).toBe('retain');
 });
});

test.describe('Platform API Client Governance — client evidence and permissions (GENERATED_UNRUN)',()=>{
 test('PACG-043 Unsupported external-scope evidence is distinctly marked in chips',async({page})=>{
  await openGovernance(page,{rows:[{...govActive,scopes:['future:scope'],public_api_compatible:false}]});
  await expect(client(page).locator('.platform-api-client-governance__scope-list [data-tone="danger"]')).toContainText('future:scope · unsupported');
 });
 test('PACG-044 Critical risk flag uses warning severity in client card',async({page})=>{
  await openGovernance(page,{rows:[{...govActive,risk_flags:['api_client_critical_without_network_control']}]});
  await expect(client(page).locator('.platform-api-client-governance__findings [data-tone="danger"]')).toContainText('critical without network control');
 });
 test('PACG-045 Stale-use flag distinguishes app-observed usage from external certification',async({page})=>{
  await openGovernance(page,{rows:[{...govActive,risk_flags:['api_client_stale_usage'],last_used_at:'2026-04-01T00:00:00Z'}]});
  await expect(client(page)).toContainText('stale usage');await expect(boundary(page)).toContainText('external integration');
 });
 test('PACG-046 Expired key shows explicit expiration without fabricating usage events',async({page})=>{
  await openGovernance(page,{rows:[{...govActive,is_expired:true,expires_at:'2026-01-01T00:00:00Z',risk_flags:['api_client_expired']}]});
  await expect(client(page)).toContainText('expired');await expect(client(page)).toContainText('Never observed');
 });
 test('PACG-047 Network allowlist count pluralization follows evidence count',async({page})=>{
  await openGovernance(page,{rows:[{...govActive,allowed_ip_count:2}]});await expect(client(page)).toContainText('2 exact IPs');
 });
 test('PACG-048 No network allowlist displays Not configured',async({page})=>{
  await openGovernance(page,{rows:[{...govActive,allowed_ip_count:0,allowed_ips:[]}]});await expect(client(page)).toContainText('Not configured');
 });
 test('PACG-049 Client with no expiration displays No expiration',async({page})=>{
  await openGovernance(page);await expect(client(page)).toContainText('No expiration');
 });
 test('PACG-050 Created by absence renders Not recorded when identity is permitted',async({page})=>{
  await openGovernance(page,{rows:[{...govActive,created_by_email:null}]});
  await expect(client(page).locator('.platform-api-client-governance__metrics-grid').locator('div').filter({hasText:'Created by'})).toContainText('Not recorded');
 });
 test('PACG-051 Permission-gated tenant source and supporting tenant links are hidden',async({page})=>{
  await openGovernance(page,{permissions:without('platform.tenants.read')});
  await expect(client(page).getByRole('link',{name:'Tenant source'})).toHaveCount(0);
  await expect(support(page).getByRole('link',{name:'Tenants'})).toHaveCount(0);
 });
 test('PACG-052 Permission-gated integration monitoring link is hidden',async({page})=>{
  await openGovernance(page,{permissions:without('platform.dependencies.read')});
  await expect(support(page).getByRole('link',{name:'Integration monitoring'})).toHaveCount(0);
 });
 test('PACG-053 Permission-gated permission audit link is hidden',async({page})=>{
  await openGovernance(page,{permissions:without('platform.access_reviews.read')});
  await expect(support(page).getByRole('link',{name:'Permission audit'})).toHaveCount(0);
 });
 test('PACG-054 Read-only registry offers no mutation form or buttons',async({page})=>{
  await openGovernance(page);await expect(registry(page).locator('form')).toHaveCount(0);
  for(const name of ['Create','Save','Rotate','Revoke','Delete'])await expect(root(page).getByRole('button',{name,exact:true})).toHaveCount(0);
 });
 test('PACG-055 Custom governance_controls summary scope is rendered as filtered registry context',async({page})=>{
  await openGovernance(page,{controls:{...govControls,summary_scope:'filtered_registry'}});
  await expect(control(page)).toContainText('filtered registry');
 });
 test('PACG-056 No key hash export contract false is visible as False',async({page})=>{
  await openGovernance(page,{controls:{...govControls,no_key_hash_export:false}});
  await expect(control(page)).toContainText('No key hash export');await expect(control(page)).toContainText('False');
 });
 test('PACG-057 Unknown posture is shown as a readable label without claiming ready',async({page})=>{
  await openGovernance(page,{posture:'api_client_governance_review_custom'});
  await expect(registry(page).locator('.platform-api-client-governance__posture-row strong')).toContainText('governance review custom');
 });
 test('PACG-058 Empty registry does not certify lack of external credentials',async({page})=>{
  await openGovernance(page,{rows:[]});await expect(registry(page)).toContainText('No API client records matched.');
  await expect(registry(page)).toContainText('does not prove that no external integration');
 });
 test('PACG-059 Pagination Next disabled without has_more',async({page})=>{
  await openGovernance(page,{rows:manyGovClients(50)});await expect(registry(page).getByRole('button',{name:'Next'})).toBeDisabled();
 });
 test('PACG-060 Pagination Previous available on final page',async({page})=>{
  await openGovernance(page,{rows:manyGovClients(51)});await registry(page).getByRole('button',{name:'Next'}).click();
  await expect(registry(page).getByRole('button',{name:'Previous'})).toBeEnabled();await expect(registry(page).getByRole('button',{name:'Next'})).toBeDisabled();
 });
 test('PACG-061 Initial 429 rate limit shown as governance error rather than successful empty set',async({page})=>{
  await openGovernance(page,{responses:{'GET /platform/api-client-governance/governance':{status:429,json:{message:'Synthetic rate limit'}}}});
  await expect(registry(page)).toContainText('API client governance unavailable');await expect(registry(page)).not.toContainText('No API client records matched.');
 });
 test('PACG-062 Filtered summary remains separate from page record count',async({page})=>{
  await openGovernance(page,{rows:[govActive],summary:{...govSummary,total_clients:900,governance_relevant_clients:900}});
  await expect(root(page)).toContainText('Loaded 1 client records on page 1');
  await expect(registry(page).locator('.platform-api-client-governance__posture-row')).toContainText('900 non-revoked');
 });
 test('PACG-063 Revoked clients never drive active posture when contract says so',async({page})=>{
  await openGovernance(page,{rows:[govRevoked],query:'include_revoked=true',posture:'api_client_governance_no_active_clients'});
  await expect(client(page,'Fixture retired client')).toContainText('historical evidence');await expect(registry(page)).toContainText('No active clients');
  await expect(boundary(page)).toContainText('Historical only');
 });
 test('PACG-064 Secret material field-block policy is not a browser assertion of DB encryption',async({page})=>{
  await openGovernance(page);await expect(control(page)).toContainText('No raw secret export');
  await expect(control(page)).toContainText('No key hash export');await expect(root(page)).not.toContainText('fixture_signature_not_real');
 });
 test('PACG-065 Copying API key lifecycle link retains search and revoked inclusion',async({page})=>{
  await openGovernance(page);const url=await client(page).getByRole('link',{name:'API key lifecycle'}).getAttribute('href');
  expect(url).not.toBeNull();const params=new URL(url!,'http://fixture.local').searchParams;
  expect(params.get('search')).toBe('fixture10');expect(params.get('include_revoked')).toBe('true');
 });
 test('PACG-066 Platform Audit link destination respects permission snapshot',async({page})=>{
  await openGovernance(page,{permissions:without('platform.audit.read')});await expect(support(page).getByRole('link',{name:'Platform audit'})).toHaveCount(0);
  await expect(client(page).getByRole('link',{name:'Audit evidence'})).toHaveCount(0);
 });
 test('PACG-067 Tenant source link URL preserves selected tenant UUID',async({page})=>{
  await openGovernance(page);const href=await client(page).getByRole('link',{name:'Tenant source'}).getAttribute('href');
  expect(new URL(href!,'http://fixture.local').searchParams.get('tenant_id')).toBe(KEY_TENANT_A);
 });
 test('PACG-068 Tenant identifier visibly redacted even when API response includes name',async({page})=>{
  await openGovernance(page,{rows:[{...govActive,tenant_name:'PRIVATE-TENANT-VALUE'}],access:{tenant:false,platform_user_identity:true}});
  await expect(client(page)).toContainText('Redacted');await expect(client(page)).not.toContainText('PRIVATE-TENANT-VALUE');
 });
 test('PACG-069 Creator email visibly redacted even when API response includes email',async({page})=>{
  await openGovernance(page,{rows:[{...govActive,created_by_email:'PRIVATE-OWNER@example.test'}],access:{tenant:true,platform_user_identity:false}});
  await expect(client(page)).toContainText('Redacted');await expect(client(page)).not.toContainText('PRIVATE-OWNER@example.test');
 });
 test('PACG-070 Permission-scoped evidence cannot prove cross-tenant isolation on a real server',async({page})=>{
  await openGovernance(page,{query:`tenant_id=${KEY_TENANT_A}`,rows:[govActive,govRevoked]});
  await expect(client(page)).toBeVisible();await expect(client(page,'Fixture retired client')).toHaveCount(0);
  await expect(boundary(page)).toContainText('cannot certify');
 });
});
