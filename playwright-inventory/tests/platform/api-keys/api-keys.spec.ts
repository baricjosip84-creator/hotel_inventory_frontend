/** Batch 70 — GENERATED_UNRUN. Platform API keys browser-visible scenarios.
 * All tokens, users, tenants and credentials are SYNTHETIC; these mocks cannot
 * prove real authentication, revocation, hashed persistence or IP enforcement. */
import {test,expect,type Page} from '@playwright/test';
import {openApiKeys,keyPermissions,keySeed,manyKeys,keyScopes,KEY_TENANT_A,KEY_TENANT_B,KEY_ACTIVE,KEY_REVOKED,KEY_EXPIRED,KEY_SECRET} from '../../../support/platformApiKeysFixture';
const area=(p:Page)=>p.locator('.platform-api-keys');
const section=(p:Page,name:string)=>area(p).locator('.platform-api-keys__section').filter({has:p.getByRole('heading',{name,exact:true})});
const registry=(p:Page)=>section(p,'Credential registry');
const create=(p:Page)=>section(p,'Create public API key');
const card=(p:Page,name:string)=>registry(p).locator('.platform-api-keys__card').filter({has:p.getByRole('heading',{name,exact:true})});
const without=(...denied:string[])=>keyPermissions.filter(x=>!denied.includes(x));
async function fillCreate(p:Page,name='Fixture new client') {await create(p).getByLabel('Tenant').selectOption(KEY_TENANT_A);await create(p).getByLabel('Name').fill(name);}

test.describe('Platform API Keys — registry and truth boundaries (GENERATED_UNRUN)',()=>{
 test('PAKEY-001 The credential page presents its public API path and 50-key page size',async({page})=>{
  await openApiKeys(page);await expect(area(page)).toContainText('/api/public/v1');await expect(area(page)).toContainText('Page size: 50');
 });
 test('PAKEY-002 Credential listing exposes prefixes but never a raw one-time secret',async({page})=>{
  await openApiKeys(page);await expect(card(page,'Fixture ERP sync')).toContainText('fixture10');await expect(registry(page)).not.toContainText(KEY_SECRET);await expect(registry(page)).not.toContainText('inv_live_fixture10_');
 });
 test('PAKEY-003 Contract labels distinguish current and recognized legacy credential formats',async({page})=>{
  await openApiKeys(page);await expect(section(page,'Public API contract')).toContainText('inv_live_');await expect(section(page,'Public API contract')).toContainText('hla_');await expect(section(page,'Public API contract')).toContainText('Recognized');
 });
 test('PAKEY-004 Summary metrics describe loaded records, not a global registry total',async({page})=>{
  await openApiKeys(page);await expect(page.getByLabel('API key loaded-page metrics')).toContainText('Loaded keys');await expect(page.getByLabel('API key loaded-page metrics')).toContainText('not a global registry total');
 });
 test('PAKEY-005 Active expired revoked and scope-incompatible statuses are distinct',async({page})=>{
  await openApiKeys(page,{query:'include_revoked=true'});await expect(card(page,'Fixture ERP sync')).toContainText('Active');await expect(card(page,'Fixture expired credential')).toContainText('Expired');await expect(card(page,'Fixture retired credential')).toContainText('Revoked');await expect(card(page,'Fixture legacy client')).toContainText('Scope migration required');
 });
 test('PAKEY-006 Evidence labels distinguish tenant and operator identity access',async({page})=>{
  await openApiKeys(page);const e=area(page).locator('.platform-api-keys__evidence-grid');await expect(e).toContainText('Tenant evidence');await expect(e).toContainText('Operator identity');await expect(e).toContainText('IP allowlist');
 });
 test('PAKEY-007 Denied tenant-read hides tenant identity in registry cards',async({page})=>{
  await openApiKeys(page,{permissions:without('platform.tenants.read')});await expect(card(page,'Fixture ERP sync')).toContainText('Redacted');await expect(card(page,'Fixture ERP sync')).not.toContainText('Fixture Hotel');await expect(registry(page)).toContainText('TENANTS_READ required');
 });
 test('PAKEY-008 Audit evidence and tenant source links use the recorded key IDs',async({page})=>{
  await openApiKeys(page);const entry=card(page,'Fixture ERP sync');await expect(entry.getByRole('link',{name:'Audit evidence'})).toHaveAttribute('href',new RegExp(`target_id=${KEY_ACTIVE}`));await expect(entry.getByRole('link',{name:'Tenant source'})).toHaveAttribute('href',new RegExp(KEY_TENANT_A));
 });
 test('PAKEY-009 Operator identity is redacted when users-read is denied',async({page})=>{
  await openApiKeys(page,{permissions:without('platform.users.read')});await expect(card(page,'Fixture ERP sync')).not.toContainText('issuer@fixture.test');await expect(card(page,'Fixture ERP sync')).toContainText('Redacted');
 });
 test('PAKEY-010 Allowlist and last-use evidence distinguish actual values from unknown',async({page})=>{
  await openApiKeys(page);await expect(card(page,'Fixture ERP sync')).toContainText('203.0.113.10');await expect(card(page,'Fixture ERP sync')).toContainText('Never observed');await expect(card(page,'Fixture expired credential')).toContainText('Any IP');
 });
 test('PAKEY-011 Legacy unsupported scopes are marked rather than silently discarded',async({page})=>{
  await openApiKeys(page);await expect(card(page,'Fixture legacy client')).toContainText('old:incompatible');await expect(card(page,'Fixture legacy client')).toContainText('unsupported');
 });
 test('PAKEY-012 Empty search results do not claim external credentials cannot exist',async({page})=>{
  await openApiKeys(page,{rows:[]});await expect(registry(page)).toContainText('No API keys found.');await expect(registry(page)).toContainText('does not prove no external');
 });
});

test.describe('Platform API Keys — URL filters, pagination and visibility (GENERATED_UNRUN)',()=>{
 test('PAKEY-013 URL search text filters registry records via server query',async({page})=>{
  const sent:URLSearchParams[]=[];await openApiKeys(page,{query:'search=ERP',onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/api-keys')sent.push(new URLSearchParams(q));}});await expect(card(page,'Fixture ERP sync')).toBeVisible();await expect(card(page,'Fixture legacy client')).toHaveCount(0);expect(sent[0].get('search')).toBe('ERP');
 });
 test('PAKEY-014 Valid tenant URL selects only that tenant and forwards its UUID',async({page})=>{
  const sent:URLSearchParams[]=[];await openApiKeys(page,{query:`tenant_id=${KEY_TENANT_B}`,onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/api-keys')sent.push(new URLSearchParams(q));}});await expect(card(page,'Fixture legacy client')).toBeVisible();await expect(card(page,'Fixture ERP sync')).toHaveCount(0);expect(sent[0].get('tenant_id')).toBe(KEY_TENANT_B);
 });
 test('PAKEY-015 Include-revoked toggle adds URL flag and reveals retired records',async({page})=>{
  await openApiKeys(page);await expect(card(page,'Fixture retired credential')).toHaveCount(0);await registry(page).getByLabel('Include revoked').check();await expect(card(page,'Fixture retired credential')).toBeVisible();await expect.poll(()=>new URL(page.url()).searchParams.get('include_revoked')).toBe('true');
 });
 test('PAKEY-016 Invalid tenant UUID blocks list requests and provides clear action',async({page})=>{
  const sent:string[]=[];await openApiKeys(page,{query:'tenant_id=not-uuid',onCall:(m,p)=>{if(m==='GET'&&p==='/platform/api-keys')sent.push(p);}});await expect(registry(page)).toContainText('Invalid or unauthorized URL filter');expect(sent).toHaveLength(0);await expect(registry(page).getByRole('button',{name:'Clear invalid filters'})).toBeVisible();
 });
 test('PAKEY-017 Tenant filter is invalid when tenant-read permission is unavailable',async({page})=>{
  const sent:string[]=[];await openApiKeys(page,{query:`tenant_id=${KEY_TENANT_A}`,permissions:without('platform.tenants.read'),onCall:(m,p)=>{if(m==='GET'&&p==='/platform/api-keys')sent.push(p);}});await expect(registry(page)).toContainText('Invalid or unauthorized URL filter');expect(sent).toHaveLength(0);
 });
 test('PAKEY-018 URL search over 200 characters is blocked before a registry request',async({page})=>{
  await openApiKeys(page,{query:'search='+('x'.repeat(201))});await expect(registry(page)).toContainText('Invalid or unauthorized URL filter');await expect(registry(page).locator('.platform-api-keys__list')).toHaveCount(0);
 });
 test('PAKEY-019 Invalid include_revoked URL value blocks the registry',async({page})=>{
  await openApiKeys(page,{query:'include_revoked=maybe'});await expect(registry(page)).toContainText('Clear the invalid filter before loading API-key data.');
 });
 test('PAKEY-020 Clear invalid filters removes only the three recognized API-key filter keys',async({page})=>{
  await openApiKeys(page,{query:'include_revoked=maybe&marker=keep'});await registry(page).getByRole('button',{name:'Clear invalid filters'}).click();await expect.poll(()=>new URL(page.url()).searchParams.get('include_revoked')).toBeNull();expect(new URL(page.url()).searchParams.get('marker')).toBe('keep');await expect(card(page,'Fixture ERP sync')).toBeVisible();
 });
 test('PAKEY-021 Next and Previous drive server offset in 50-record increments',async({page})=>{
  const offsets:string[]=[];await openApiKeys(page,{rows:manyKeys(54),onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/api-keys')offsets.push(q.get('offset')||'');}});await registry(page).getByRole('button',{name:'Next'}).click();await expect(registry(page)).toContainText('Page 2');await expect.poll(()=>offsets.at(-1)).toBe('50');await registry(page).getByRole('button',{name:'Previous'}).click();await expect.poll(()=>offsets.at(-1)).toBe('0');
 });
 test('PAKEY-022 Changing a filter resets pagination to the first page',async({page})=>{
  await openApiKeys(page,{rows:manyKeys(60)});await registry(page).getByRole('button',{name:'Next'}).click();await expect(registry(page)).toContainText('Page 2');await registry(page).getByLabel('Search').fill('Fixture API client 01');await expect(registry(page)).toContainText('Page 1');await expect(registry(page).getByRole('button',{name:'Previous'})).toBeDisabled();
 });
});

test.describe('Platform API Keys — create and one-time-secret boundaries (GENERATED_UNRUN)',()=>{
 test('PAKEY-023 Read-only operator sees registry but no creation or key mutation buttons',async({page})=>{
  await openApiKeys(page,{permissions:without('platform.api_keys.write')});await expect(card(page,'Fixture ERP sync')).toBeVisible();await expect(area(page).getByRole('heading',{name:'Create public API key'})).toHaveCount(0);await expect(card(page,'Fixture ERP sync').getByRole('button',{name:'Revoke key'})).toHaveCount(0);
 });
 test('PAKEY-024 Missing tenant-read keeps create section restricted, even with write permission',async({page})=>{
  await openApiKeys(page,{permissions:without('platform.tenants.read')});await expect(create(page)).toContainText('Creation restricted');await expect(create(page)).toContainText('TENANTS_READ');await expect(create(page).getByRole('button',{name:'Create public API key'})).toHaveCount(0);
 });
 test('PAKEY-025 Tenant selection is required before creating a Platform credential',async({page})=>{
  await openApiKeys(page);await expect(create(page)).toContainText('Select a tenant before creating an API key.');await expect(create(page).getByRole('button',{name:'Create public API key'})).toBeDisabled();
 });
 test('PAKEY-026 Whitespace-only name blocks creation without submitting a POST',async({page})=>{
  const writes:string[]=[];await openApiKeys(page,{onCall:(m,p)=>{if(m==='POST'&&p==='/platform/api-keys')writes.push(p);}});await create(page).getByLabel('Tenant').selectOption(KEY_TENANT_A);await create(page).getByLabel('Name').fill('   ');await expect(create(page)).toContainText('Enter an integration name before creating an API key.');await expect(create(page).getByRole('button',{name:'Create public API key'})).toBeDisabled();expect(writes).toHaveLength(0);
 });
 test('PAKEY-027 Deselecting all public API scopes disables creation',async({page})=>{
  await openApiKeys(page);await fillCreate(page);await create(page).getByLabel('products:read').uncheck();await expect(create(page)).toContainText('Select at least one public API scope.');await expect(create(page).getByRole('button',{name:'Create public API key'})).toBeDisabled();
 });
 test('PAKEY-028 Creation serializes tenant UUID, trimmed name and selected scopes',async({page})=>{
  const writes:any[]=[];await openApiKeys(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p==='/platform/api-keys')writes.push(b);}});await fillCreate(page,'   Fixture Connector  ');await create(page).getByRole('button',{name:'Create public API key'}).click();await expect(area(page)).toContainText('Public API key created.');expect(writes[0].tenant_id).toBe(KEY_TENANT_A);expect(writes[0].name).toBe('Fixture Connector');expect(writes[0].scopes).toEqual(['products:read']);
 });
 test('PAKEY-029 Allowed IP input is comma-split, trimmed and deduplicated in POST body',async({page})=>{
  const writes:any[]=[];await openApiKeys(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p==='/platform/api-keys')writes.push(b);}});await fillCreate(page);await create(page).getByLabel('Allowed IPs').fill(' 203.0.113.10, , 203.0.113.10, 2001:db8::10 ');await create(page).getByRole('button',{name:'Create public API key'}).click();await expect(area(page)).toContainText('Public API key created.');expect(writes[0].allowed_ips).toEqual(['203.0.113.10','2001:db8::10']);
 });
 test('PAKEY-030 Blank optional description and expiry are sent as null values',async({page})=>{
  const writes:any[]=[];await openApiKeys(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p==='/platform/api-keys')writes.push(b);}});await fillCreate(page);await create(page).getByLabel('Description').fill('    ');await create(page).getByRole('button',{name:'Create public API key'}).click();await expect(area(page)).toContainText('Public API key created.');expect(writes[0].description).toBeNull();expect(writes[0].expires_at).toBeNull();
 });
 test('PAKEY-031 A newly returned secret is displayed separately then explicitly cleared',async({page})=>{
  await openApiKeys(page);await fillCreate(page);await create(page).getByRole('button',{name:'Create public API key'}).click();await expect(section(page,'Copy one-time secret now')).toContainText(KEY_SECRET);await expect(registry(page)).not.toContainText(KEY_SECRET);await section(page,'Copy one-time secret now').getByRole('button',{name:'Clear one-time secret'}).click();await expect(area(page).locator('.platform-api-keys__secret-panel')).toHaveCount(0);
 });
 test('PAKEY-032 Editing an existing active key loads saved values and sends PATCH',async({page})=>{
  const writes:any[]=[];await openApiKeys(page,{onCall:(m,p,_q,b)=>{if(m==='PATCH')writes.push({p,b});}});await card(page,'Fixture ERP sync').getByRole('button',{name:'Edit settings'}).click();await expect(card(page,'Fixture ERP sync').getByLabel('Name')).toHaveValue('Fixture ERP sync');await card(page,'Fixture ERP sync').getByLabel('Name').fill('Updated fixture name');await card(page,'Fixture ERP sync').getByRole('button',{name:'Save key settings'}).click();await expect(area(page)).toContainText('API key settings updated.');expect(writes[0].p).toBe(`/platform/api-keys/${KEY_ACTIVE}`);expect(writes[0].b.name).toBe('Updated fixture name');
 });
 test('PAKEY-033 Cancel edit closes editor without writing an update',async({page})=>{
  const writes:string[]=[];await openApiKeys(page,{onCall:(m,p)=>{if(m==='PATCH')writes.push(p);}});await card(page,'Fixture ERP sync').getByRole('button',{name:'Edit settings'}).click();await card(page,'Fixture ERP sync').getByLabel('Name').fill('Discard');await card(page,'Fixture ERP sync').getByRole('button',{name:'Cancel edit'}).click();await expect(card(page,'Fixture ERP sync').getByRole('button',{name:'Save key settings'})).toHaveCount(0);expect(writes).toHaveLength(0);
 });
 test('PAKEY-034 Revoked keys offer neither edit, rotate, nor revoke controls',async({page})=>{
  await openApiKeys(page,{query:'include_revoked=true'});for(const action of ['Edit settings','Rotate secret','Revoke key'])await expect(card(page,'Fixture retired credential').getByRole('button',{name:action})).toHaveCount(0);await expect(card(page,'Fixture retired credential')).toContainText('Fixture retirement');
 });
 test('PAKEY-035 Expired key cannot rotate until expiration is edited and saved',async({page})=>{
  await openApiKeys(page);await expect(card(page,'Fixture expired credential').getByRole('button',{name:'Rotate secret'})).toBeDisabled();await expect(card(page,'Fixture expired credential')).toContainText('Expired keys cannot be rotated.');await expect(card(page,'Fixture expired credential').getByRole('button',{name:'Edit settings'})).toBeEnabled();
 });
 test('PAKEY-036 Accepted rotation shows a new one-time secret without claiming old-key invalidation tested',async({page})=>{
  const writes:string[]=[];await openApiKeys(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/rotate'))writes.push(p);}});page.once('dialog',d=>{void d.accept();});await card(page,'Fixture ERP sync').getByRole('button',{name:'Rotate secret'}).click();await expect(section(page,'Copy one-time secret now')).toContainText(KEY_SECRET);expect(writes).toEqual([`/platform/api-keys/${KEY_ACTIVE}/rotate`]);
 });
 test('PAKEY-037 Dismissing rotation confirmation prevents the transport mutation',async({page})=>{
  const writes:string[]=[];await openApiKeys(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/rotate'))writes.push(p);}});page.once('dialog',d=>{void d.dismiss();});await card(page,'Fixture ERP sync').getByRole('button',{name:'Rotate secret'}).click();expect(writes).toHaveLength(0);await expect(area(page).locator('.platform-api-keys__secret-panel')).toHaveCount(0);
 });
 test('PAKEY-038 Confirmed revoke sends trimmed optional reason and removes write actions',async({page})=>{
  const writes:any[]=[];await openApiKeys(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p.endsWith('/revoke'))writes.push({p,b});}});await card(page,'Fixture ERP sync').getByLabel('Revoke reason').fill('  Fixture retirement  ');page.once('dialog',d=>{void d.accept();});await card(page,'Fixture ERP sync').getByRole('button',{name:'Revoke key'}).click();await expect(area(page)).toContainText('API key revoked.');expect(writes[0]).toEqual({p:`/platform/api-keys/${KEY_ACTIVE}/revoke`,b:{reason:'Fixture retirement'}});
 });
 test('PAKEY-039 Create HTTP 403 displays an action error without exposing a secret',async({page})=>{
  await openApiKeys(page,{responses:{'POST /platform/api-keys':{status:403,json:{message:'Synthetic create forbidden'}}}});await fillCreate(page);await create(page).getByRole('button',{name:'Create public API key'}).click();await expect(area(page)).toContainText('Synthetic create forbidden');await expect(area(page).locator('.platform-api-keys__secret-panel')).toHaveCount(0);
 });
 test('PAKEY-040 Initial registry error provides Retry and never disguises failure as empty results',async({page})=>{
  await openApiKeys(page,{responses:{'GET /platform/api-keys':{status:503,json:{message:'Fixture API keys unavailable'}}}});await expect(registry(page)).toContainText('API key registry unavailable');await expect(registry(page).getByRole('button',{name:'Retry'})).toBeVisible();await expect(registry(page).locator('.platform-api-keys__empty')).toHaveCount(0);
 });
});
