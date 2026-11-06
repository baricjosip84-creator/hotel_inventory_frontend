/** Batch 71 · GENERATED_UNRUN. Read-only application evidence, not external certification. */
import {test,expect,type Page} from '@playwright/test';
import {openGovernance,govPermissions,govActive,govRevoked,govControls,govTruth,manyGovClients} from '../../../support/platformApiClientGovernanceFixture';
import {KEY_TENANT_A,KEY_ACTIVE} from '../../../support/platformApiKeysFixture';
const area=(p:Page)=>p.locator('.platform-api-client-governance');
const section=(p:Page,name:string)=>area(p).locator('.platform-api-client-governance__section').filter({has:p.getByRole('heading',{name,exact:true})});
const registry=(p:Page)=>section(p,'Governance registry');
const card=(p:Page,name:string)=>registry(p).locator('.platform-api-client-governance__card').filter({has:p.getByRole('heading',{name,exact:true})});
const without=(...denied:string[])=>govPermissions.filter(p=>!denied.includes(p));

test.describe('Platform API Client Governance — read-only posture and evidence (GENERATED_UNRUN)',()=>{
 test('PACG-001 Governance board identifies itself as read-only and bounded to 50 rows',async({page})=>{
  await openGovernance(page);await expect(area(page)).toContainText('Read-only governance board');await expect(area(page)).toContainText('Page size: 50');
 });
 test('PACG-002 Posture labels distinguish review-required state from integration certification',async({page})=>{
  await openGovernance(page);await expect(area(page)).toContainText('Review required');await expect(section(page,'Evidence and truth boundary')).toContainText('cannot certify external integration success');
 });
 test('PACG-003 Ready posture maps to Governed',async({page})=>{
  await openGovernance(page,{posture:'api_client_governance_ready'});await expect(registry(page).locator('.platform-api-client-governance__posture-row')).toContainText('Governed');
 });
 test('PACG-004 Blocked posture maps to Blocked and warning tone',async({page})=>{
  await openGovernance(page,{posture:'api_client_governance_blocked'});await expect(registry(page).locator('.platform-api-client-governance__posture-row strong')).toHaveAttribute('data-tone','danger');
 });
 test('PACG-005 No-active-clients state is named without claiming no external integrations',async({page})=>{
  await openGovernance(page,{rows:[],posture:'api_client_governance_no_active_clients'});await expect(registry(page)).toContainText('No active clients');await expect(registry(page)).toContainText('does not prove that no external integration');
 });
 test('PACG-006 Global summary and current page metrics are separately described',async({page})=>{
  await openGovernance(page);await expect(page.getByLabel('API client governance registry metrics')).toContainText('Governed clients');await expect(registry(page)).toContainText('Registry totals cover all records');await expect(area(page)).toContainText('Loaded 1 client records on page 1');
 });
 test('PACG-007 Revoked records are hidden by default but summary can still reference historical count',async({page})=>{
  await openGovernance(page);await expect(card(page,'Fixture retired client')).toHaveCount(0);await expect(page.getByLabel('API client governance registry metrics')).toContainText('Revoked history');
 });
 test('PACG-008 Included revoked client has historical-only note',async({page})=>{
  await openGovernance(page,{query:'include_revoked=true'});await expect(card(page,'Fixture retired client')).toContainText('historical evidence');
 });
 test('PACG-009 Raw secrets and hashes are absent from registry response UI',async({page})=>{
  await openGovernance(page);await expect(registry(page)).not.toContainText('inv_live_fixture10_SYNTHETIC');await expect(area(page)).toContainText('No raw secret export');await expect(area(page)).toContainText('No key hash export');
 });
 test('PACG-010 Client cards show prefix only rather than credential secret',async({page})=>{
  await openGovernance(page);await expect(card(page,'Fixture ERP client')).toContainText('fixture10…');await expect(card(page,'Fixture ERP client')).not.toContainText('inv_live_');
 });
 test('PACG-011 Evidence card distinguishes unknown usage from proof of non-use',async({page})=>{
  await openGovernance(page);await expect(card(page,'Fixture ERP client')).toContainText('Never observed');await expect(section(page,'Evidence and truth boundary')).toContainText('application credential configuration and API usage');
 });
 test('PACG-012 Tenant identity is redacted independently of card availability',async({page})=>{
  await openGovernance(page,{permissions:without('platform.tenants.read')});await expect(card(page,'Fixture ERP client')).toContainText('Redacted');await expect(card(page,'Fixture ERP client')).not.toContainText('Fixture Hotel');
 });
 test('PACG-013 Creator identity is redacted when user-read permission is denied',async({page})=>{
  await openGovernance(page,{permissions:without('platform.users.read')});await expect(card(page,'Fixture ERP client')).toContainText('Redacted');await expect(card(page,'Fixture ERP client')).not.toContainText('issuer@fixture.test');
 });
 test('PACG-014 Missing audit permission removes Audit evidence from card',async({page})=>{
  await openGovernance(page,{permissions:without('platform.audit.read')});await expect(card(page,'Fixture ERP client').getByRole('link',{name:'Audit evidence'})).toHaveCount(0);
 });
 test('PACG-015 Lifecycle link retains prefix search and includes revoked records',async({page})=>{
  await openGovernance(page);const link=card(page,'Fixture ERP client').getByRole('link',{name:'API key lifecycle'});await expect(link).toHaveAttribute('href',/search=fixture10/);await expect(link).toHaveAttribute('href',/include_revoked=true/);
 });
 test('PACG-016 Audit target link refers to the selected credential ID',async({page})=>{
  await openGovernance(page);await expect(card(page,'Fixture ERP client').getByRole('link',{name:'Audit evidence'})).toHaveAttribute('href',new RegExp(KEY_ACTIVE));
 });
 test('PACG-017 Tenant source link is scoped to the client tenant UUID',async({page})=>{
  await openGovernance(page);await expect(card(page,'Fixture ERP client').getByRole('link',{name:'Tenant source'})).toHaveAttribute('href',new RegExp(KEY_TENANT_A));
 });
 test('PACG-018 Governance cards expose unsupported scopes and findings without hiding the row',async({page})=>{
  await openGovernance(page,{rows:[{...govActive,scopes:['old:unsupported'],public_api_compatible:false,risk_flags:['api_client_unsupported_scopes']} ]});await expect(card(page,'Fixture ERP client')).toContainText('Scope migration required');await expect(card(page,'Fixture ERP client')).toContainText('old:unsupported · unsupported');
 });
 test('PACG-019 Missing scope is flagged as No scopes',async({page})=>{
  await openGovernance(page,{rows:[{...govActive,scopes:[],risk_flags:['api_client_missing_scopes']} ]});await expect(card(page,'Fixture ERP client')).toContainText('No scopes');
 });
 test('PACG-020 No findings is explicitly labeled instead of pretending a clean integration',async({page})=>{
  await openGovernance(page,{rows:[{...govActive,risk_flags:[]} ]});await expect(card(page,'Fixture ERP client')).toContainText('No active findings');await expect(section(page,'Evidence and truth boundary')).toContainText('cannot certify');
 });
});

test.describe('Platform API Client Governance — filters, paging and permission gates (GENERATED_UNRUN)',()=>{
 test('PACG-021 Tenant URL filter forwards a UUID and restricts visible rows',async({page})=>{
  const queries:URLSearchParams[]=[];await openGovernance(page,{query:`tenant_id=${KEY_TENANT_A}&include_revoked=true`,onCall:(m,p,q)=>{if(m==='GET'&&p.endsWith('/governance'))queries.push(new URLSearchParams(q));}});await expect(card(page,'Fixture ERP client')).toBeVisible();await expect(card(page,'Fixture retired client')).toHaveCount(0);expect(queries[0].get('tenant_id')).toBe(KEY_TENANT_A);
 });
 test('PACG-022 Search query is forwarded and filters the governance registry',async({page})=>{
  await openGovernance(page,{query:'search=ERP'});await expect(card(page,'Fixture ERP client')).toBeVisible();await expect(card(page,'Fixture retired client')).toHaveCount(0);
 });
 test('PACG-023 Revoked checkbox updates URL and reveals historical evidence',async({page})=>{
  await openGovernance(page);await registry(page).getByLabel('Include revoked history').check();await expect(card(page,'Fixture retired client')).toBeVisible();await expect.poll(()=>new URL(page.url()).searchParams.get('include_revoked')).toBe('true');
 });
 test('PACG-024 Invalid tenant UUID blocks transport and offers clear action',async({page})=>{
  const calls:string[]=[];await openGovernance(page,{query:'tenant_id=bad-value',onCall:(m,p)=>{if(m==='GET'&&p.endsWith('/governance'))calls.push(p);}});await expect(registry(page)).toContainText('Invalid or unauthorized URL filter');expect(calls).toHaveLength(0);await expect(registry(page).getByRole('button',{name:'Clear invalid filters'})).toBeVisible();
 });
 test('PACG-025 Tenant filter denied by permissions blocks governance query',async({page})=>{
  const calls:string[]=[];await openGovernance(page,{query:`tenant_id=${KEY_TENANT_A}`,permissions:without('platform.tenants.read'),onCall:(m,p)=>{if(m==='GET'&&p.endsWith('/governance'))calls.push(p);}});await expect(registry(page)).toContainText('Invalid or unauthorized URL filter');expect(calls).toHaveLength(0);
 });
 test('PACG-026 Invalid revoked query value is rejected until cleared',async({page})=>{
  await openGovernance(page,{query:'include_revoked=yes'});await expect(registry(page)).toContainText('Clear the invalid filter before loading governance evidence.');await registry(page).getByRole('button',{name:'Clear invalid filters'}).click();await expect(card(page,'Fixture ERP client')).toBeVisible();
 });
 test('PACG-027 Clear invalid filters preserves unrelated query parameters',async({page})=>{
  await openGovernance(page,{query:'search='+('x'.repeat(201))+'&audit_marker=keep'});await registry(page).getByRole('button',{name:'Clear invalid filters'}).click();await expect.poll(()=>new URL(page.url()).searchParams.get('search')).toBeNull();expect(new URL(page.url()).searchParams.get('audit_marker')).toBe('keep');
 });
 test('PACG-028 Next page requests offset 50 and Previous restores offset 0',async({page})=>{
  const offsets:number[]=[];await openGovernance(page,{rows:manyGovClients(55),onCall:(m,p,q)=>{if(m==='GET'&&p.endsWith('/governance'))offsets.push(Number(q.get('offset')));}});await registry(page).getByRole('button',{name:'Next'}).click();await expect(registry(page)).toContainText('Page 2');await expect.poll(()=>offsets.at(-1)).toBe(50);await registry(page).getByRole('button',{name:'Previous'}).click();await expect.poll(()=>offsets.at(-1)).toBe(0);
 });
 test('PACG-029 Changing a filter resets governance pagination to page one',async({page})=>{
  await openGovernance(page,{rows:manyGovClients(60)});await registry(page).getByRole('button',{name:'Next'}).click();await expect(registry(page)).toContainText('Page 2');await registry(page).getByLabel('Search').fill('client 001');await expect(registry(page)).toContainText('Page 1');await expect(registry(page).getByRole('button',{name:'Previous'})).toBeDisabled();
 });
 test('PACG-030 Registry HTTP 503 shows Retry without falsely presenting an empty-success state',async({page})=>{
  await openGovernance(page,{responses:{'GET /platform/api-client-governance/governance':{status:503,json:{message:'Synthetic governance outage'}}}});await expect(registry(page)).toContainText('API client governance unavailable');await expect(registry(page)).toContainText('Synthetic governance outage');await expect(registry(page).getByRole('button',{name:'Retry'})).toBeVisible();await expect(registry(page).locator('.platform-api-client-governance__empty')).toHaveCount(0);
 });
});
