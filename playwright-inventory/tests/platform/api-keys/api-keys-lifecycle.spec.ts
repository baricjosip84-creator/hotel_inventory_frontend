/** Batch 71 · GENERATED_UNRUN · synthetic browser behavior only.
 * Real key invalidation, auth, IP enforcement, tenant ACL and audit durability
 * require separate disposable-backend integration testing in Phase 2. */
import {test,expect,type Page} from '@playwright/test';
import {openApiKeys,keyPermissions,keySeed,manyKeys,KEY_TENANT_A,KEY_ACTIVE,KEY_EXPIRED,KEY_SECRET} from '../../../support/platformApiKeysFixture';
const area=(p:Page)=>p.locator('.platform-api-keys');
const section=(p:Page,name:string)=>area(p).locator('.platform-api-keys__section').filter({has:p.getByRole('heading',{name,exact:true})});
const registry=(p:Page)=>section(p,'Credential registry');
const create=(p:Page)=>section(p,'Create public API key');
const card=(p:Page,name:string)=>registry(p).locator('.platform-api-keys__card').filter({has:p.getByRole('heading',{name,exact:true})});
const without=(...deny:string[])=>keyPermissions.filter(p=>!deny.includes(p));
async function fillCreate(p:Page){await create(p).getByLabel('Tenant').selectOption(KEY_TENANT_A);await create(p).getByLabel('Name').fill('Fixture new integration');}
async function edit(p:Page,name='Fixture ERP sync'){await card(p,name).getByRole('button',{name:'Edit settings'}).click();return card(p,name);}

test.describe('Platform API Keys — secret lifecycle and edit validation (GENERATED_UNRUN)',()=>{
 test('PAKEY-041 Copy secret button requests clipboard write without claiming persistence',async({page})=>{
  await openApiKeys(page);await fillCreate(page);await create(page).getByRole('button',{name:'Create public API key'}).click();await expect(section(page,'Copy one-time secret now')).toContainText(KEY_SECRET);
  await section(page,'Copy one-time secret now').getByRole('button',{name:'Copy secret'}).click();await expect(area(page)).toContainText('Copy requested.');
 });
 test('PAKEY-042 Rotation HTTP 409 keeps existing credential visible and reports failure',async({page})=>{
  await openApiKeys(page,{responses:{[`POST /platform/api-keys/${KEY_ACTIVE}/rotate`]:{status:409,json:{message:'Synthetic concurrent rotation'}}}});
  page.once('dialog',d=>{void d.accept();});await card(page,'Fixture ERP sync').getByRole('button',{name:'Rotate secret'}).click();await expect(area(page)).toContainText('Synthetic concurrent rotation');await expect(card(page,'Fixture ERP sync')).toBeVisible();await expect(area(page).locator('.platform-api-keys__secret-panel')).toHaveCount(0);
 });
 test('PAKEY-043 Cancel revoke dialog sends no write and leaves the key active',async({page})=>{
  const calls:string[]=[];await openApiKeys(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/revoke'))calls.push(p);}});
  page.once('dialog',d=>{void d.dismiss();});await card(page,'Fixture ERP sync').getByRole('button',{name:'Revoke key'}).click();expect(calls).toHaveLength(0);await expect(card(page,'Fixture ERP sync')).toContainText('Active');
 });
 test('PAKEY-044 Revoke HTTP 403 reports error without removing credential',async({page})=>{
  await openApiKeys(page,{responses:{[`POST /platform/api-keys/${KEY_ACTIVE}/revoke`]:{status:403,json:{message:'Synthetic revoke denied'}}}});
  page.once('dialog',d=>{void d.accept();});await card(page,'Fixture ERP sync').getByRole('button',{name:'Revoke key'}).click();await expect(area(page)).toContainText('Synthetic revoke denied');await expect(card(page,'Fixture ERP sync')).toBeVisible();
 });
 test('PAKEY-045 Blank edit name disables Save without PATCH request',async({page})=>{
  const calls:string[]=[];await openApiKeys(page,{onCall:(m,p)=>{if(m==='PATCH')calls.push(p);}});const item=await edit(page);await item.getByLabel('Name').fill('  ');await expect(item).toContainText('Name is required.');await expect(item.getByRole('button',{name:'Save key settings'})).toBeDisabled();expect(calls).toHaveLength(0);
 });
 test('PAKEY-046 Clearing all edit scopes prevents saving',async({page})=>{
  const item=await (async()=>{await openApiKeys(page);return edit(page)})();await item.getByLabel('products:read').uncheck();await expect(item).toContainText('At least one public API scope is required.');await expect(item.getByRole('button',{name:'Save key settings'})).toBeDisabled();
 });
 test('PAKEY-047 Legacy unsupported scope is not offered as an editable checked scope',async({page})=>{
  await openApiKeys(page);const item=await edit(page,'Fixture legacy client');await expect(item).toContainText('old:incompatible');await expect(item.locator('.platform-api-keys__edit-panel').getByLabel('old:incompatible')).toHaveCount(0);await expect(item.getByRole('button',{name:'Save key settings'})).toBeDisabled();
 });
 test('PAKEY-048 Editing normalizes and deduplicates address list in PATCH payload',async({page})=>{
  const bodies:any[]=[];await openApiKeys(page,{onCall:(m,p,_q,b)=>{if(m==='PATCH')bodies.push(b);}});const item=await edit(page);await item.getByLabel('Allowed IPs').fill('203.0.113.10, 203.0.113.10, 2001:db8::7, ');await item.getByRole('button',{name:'Save key settings'}).click();await expect(area(page)).toContainText('API key settings updated.');expect(bodies[0].allowed_ips).toEqual(['203.0.113.10','2001:db8::7']);
 });
 test('PAKEY-049 Blank optional edit description is serialized as null',async({page})=>{
  const bodies:any[]=[];await openApiKeys(page,{onCall:(m,p,_q,b)=>{if(m==='PATCH')bodies.push(b);}});const item=await edit(page);await item.getByLabel('Description').fill(' ');await item.getByRole('button',{name:'Save key settings'}).click();await expect(area(page)).toContainText('API key settings updated.');expect(bodies[0].description).toBeNull();
 });
 test('PAKEY-050 Edit expiration converts local date-time to ISO before PATCH',async({page})=>{
  const bodies:any[]=[];await openApiKeys(page,{onCall:(m,p,_q,b)=>{if(m==='PATCH')bodies.push(b);}});const item=await edit(page);await item.getByLabel('Expires at').fill('2030-05-10T09:30');await item.getByRole('button',{name:'Save key settings'}).click();await expect(area(page)).toContainText('API key settings updated.');expect(bodies[0].expires_at).toMatch(/^2030-05-10T\d{2}:\d{2}:00\.000Z$/);
 });
 test('PAKEY-051 Failed PATCH keeps edited field visible with explicit error',async({page})=>{
  await openApiKeys(page,{responses:{[`PATCH /platform/api-keys/${KEY_ACTIVE}`]:{status:409,json:{message:'Synthetic stale edit'}}}});const item=await edit(page);await item.getByLabel('Name').fill('Unsaved fixture edit');await item.getByRole('button',{name:'Save key settings'}).click();await expect(area(page)).toContainText('Synthetic stale edit');await expect(item.getByLabel('Name')).toHaveValue('Unsaved fixture edit');
 });
 test('PAKEY-052 Expired credential rotation becomes available after expiry edit readback',async({page})=>{
  await openApiKeys(page);const item=card(page,'Fixture expired credential');await expect(item.getByRole('button',{name:'Rotate secret'})).toBeDisabled();await edit(page,'Fixture expired credential');await item.getByLabel('Expires at').fill('2030-08-20T10:00');await item.getByRole('button',{name:'Save key settings'}).click();await expect(area(page)).toContainText('API key settings updated.');
  // Synthetic PATCH readback derives the expiry flag; real server validation remains Phase 2.
  await expect(item.getByRole('button',{name:'Edit settings'})).toBeVisible();await expect(item.getByRole('button',{name:'Rotate secret'})).toBeEnabled();
 });
 test('PAKEY-053 Legacy migration badge and unsupported scope warning are separate',async({page})=>{
  await openApiKeys(page);const item=card(page,'Fixture legacy client');await expect(item).toContainText('Scope migration required');await expect(item.locator('.platform-api-keys__scope-list')).toContainText('old:incompatible · unsupported');
 });
 test('PAKEY-054 Created credential appears in loaded page metrics after query invalidation',async({page})=>{
  await openApiKeys(page);await expect(page.getByLabel('API key loaded-page metrics')).toContainText('Loaded keys');await fillCreate(page);await create(page).getByRole('button',{name:'Create public API key'}).click();await expect(card(page,'Fixture new integration')).toBeVisible();await expect(page.getByLabel('API key loaded-page metrics')).toContainText('not a global registry total');
 });
 test('PAKEY-055 Empty registry has explicit bounded-state explanation and disabled Next',async({page})=>{
  await openApiKeys(page,{rows:[]});await expect(registry(page)).toContainText('No API keys found.');await expect(registry(page)).toContainText('does not prove no external integration');await expect(registry(page).getByRole('button',{name:'Next'})).toBeDisabled();
 });
 test('PAKEY-056 Failed refresh preserves last successful registry snapshot',async({page})=>{
  let failed=false;await openApiKeys(page,{respond:(m,p)=>m==='GET'&&p==='/platform/api-keys'&&failed?{status:503,json:{message:'Synthetic refresh outage'}}:undefined});await expect(card(page,'Fixture ERP sync')).toBeVisible();failed=true;await area(page).getByRole('button',{name:'Refresh'}).click();await expect(area(page)).toContainText('Showing the last successful API Keys snapshot.');await expect(card(page,'Fixture ERP sync')).toBeVisible();
 });
 test('PAKEY-057 Initial 503 registry error can recover through explicit Retry',async({page})=>{
  let failed=true;await openApiKeys(page,{respond:(m,p)=>m==='GET'&&p==='/platform/api-keys'&&failed?{status:503,json:{message:'Synthetic temporary outage'}}:undefined});await expect(registry(page)).toContainText('API key registry unavailable');failed=false;await registry(page).getByRole('button',{name:'Retry'}).click();await expect(card(page,'Fixture ERP sync')).toBeVisible();
 });
 test('PAKEY-058 Manual Refresh fetches registry and permitted tenant directory',async({page})=>{
  const calls:string[]=[];await openApiKeys(page,{onCall:(m,p)=>{if(m==='GET')calls.push(p);}});const before=calls.length;await area(page).getByRole('button',{name:'Refresh'}).click();await expect.poll(()=>calls.slice(before).filter(p=>p==='/platform/api-keys').length).toBeGreaterThan(0);await expect.poll(()=>calls.slice(before).filter(p=>p==='/platform/tenants').length).toBeGreaterThan(0);
 });
 test('PAKEY-059 Tenant picker outage warns without hiding credential registry',async({page})=>{
  await openApiKeys(page,{responses:{'GET /platform/tenants':{status:503,json:{message:'Synthetic tenant directory down'}}}});await expect(area(page)).toContainText('Tenant directory unavailable.');await expect(card(page,'Fixture ERP sync')).toBeVisible();
 });
 test('PAKEY-060 Empty tenant directory prevents selecting a creation tenant',async({page})=>{
  await openApiKeys(page,{responses:{'GET /platform/tenants':{json:[]}}});await expect(create(page).getByLabel('Tenant').locator('option')).toHaveCount(1);await expect(create(page).getByRole('button',{name:'Create public API key'})).toBeDisabled();
 });
});

test.describe('Platform API Keys — URL, permissions, evidence and adverse responses (GENERATED_UNRUN)',()=>{
 test('PAKEY-061 API rejection of malformed IP is shown; no client-side IP validator assumed',async({page})=>{
  await openApiKeys(page,{responses:{'POST /platform/api-keys':{status:400,json:{message:'Synthetic invalid IP address'}}}});await fillCreate(page);await create(page).getByLabel('Allowed IPs').fill('not-an-ip');await create(page).getByRole('button',{name:'Create public API key'}).click();await expect(area(page)).toContainText('Synthetic invalid IP address');
 });
 test('PAKEY-062 API_KEYS_READ missing prevents rendering the protected credential page',async({page})=>{
  await openApiKeys(page,{permissions:without('platform.api_keys.read'),expectHeading:false});await expect(page.getByRole('heading',{name:'API keys',exact:true})).toHaveCount(0);
 });
 test('PAKEY-063 Tenant filter change resets server pagination offset',async({page})=>{
  const offsets:number[]=[];await openApiKeys(page,{rows:manyKeys(60),onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/api-keys')offsets.push(Number(q.get('offset')));}});await registry(page).getByRole('button',{name:'Next'}).click();await expect(registry(page)).toContainText('Page 2');await registry(page).getByLabel('Tenant').selectOption(KEY_TENANT_A);await expect(registry(page)).toContainText('Page 1');await expect.poll(()=>offsets.at(-1)).toBe(0);
 });
 test('PAKEY-064 Search input applies browser maxlength of 200',async({page})=>{
  await openApiKeys(page);const search=registry(page).getByLabel('Search');await expect(search).toHaveAttribute('maxlength','200');await search.fill('x'.repeat(250));await expect(search).toHaveValue('x'.repeat(200));
 });
 test('PAKEY-065 Explicit valid include_revoked=false omits the query parameter to backend',async({page})=>{
  const sent:string[]=[];await openApiKeys(page,{query:'include_revoked=false',onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/api-keys')sent.push(q.toString());}});await expect(card(page,'Fixture ERP sync')).toBeVisible();expect(sent[0]).not.toContain('include_revoked=');
 });
 test('PAKEY-066 Out-of-range second page shows empty list but retains Previous',async({page})=>{
  await openApiKeys(page,{rows:manyKeys(51),respond:(m,p,q)=>m==='GET'&&p==='/platform/api-keys'&&q.get('offset')==='50'?{json:{api_keys:[],scopes:['products:read'],evidence_access:{tenant:true,platform_user_identity:true},pagination:{limit:50,offset:50,has_more:false}}}:undefined});await registry(page).getByRole('button',{name:'Next'}).click();await expect(registry(page)).toContainText('Page 2');await expect(registry(page)).toContainText('No API keys found.');await expect(registry(page).getByRole('button',{name:'Previous'})).toBeEnabled();
 });
 test('PAKEY-067 Audit and tenant evidence source links are independently permission gated',async({page})=>{
  await openApiKeys(page,{permissions:without('platform.audit.read','platform.tenants.read')});const item=card(page,'Fixture ERP sync');await expect(item.getByRole('link',{name:'Audit evidence'})).toHaveCount(0);await expect(item.getByRole('link',{name:'Tenant source'})).toHaveCount(0);
 });
 test('PAKEY-068 Supporting Tenants destination is absent without TENANTS_READ',async({page})=>{
  await openApiKeys(page,{permissions:without('platform.tenants.read')});await expect(section(page,'Supporting operations').getByRole('link',{name:'Tenants',exact:true})).toHaveCount(0);await expect(section(page,'Supporting operations').getByRole('link',{name:'API client governance'})).toBeVisible();
 });
 test('PAKEY-069 Supporting Webhooks link is hidden without webhooks read',async({page})=>{
  await openApiKeys(page,{permissions:without('platform.webhooks.read')});await expect(section(page,'Supporting operations').getByRole('link',{name:'Webhooks'})).toHaveCount(0);
 });
 test('PAKEY-070 Supporting integration-monitoring link respects dependencies read',async({page})=>{
  await openApiKeys(page,{permissions:without('platform.dependencies.read')});await expect(section(page,'Supporting operations').getByRole('link',{name:'Integration monitoring'})).toHaveCount(0);
 });
 test('PAKEY-071 Clearing rotated secret leaves prefix in registry without raw secret',async({page})=>{
  await openApiKeys(page);page.once('dialog',d=>{void d.accept();});await card(page,'Fixture ERP sync').getByRole('button',{name:'Rotate secret'}).click();await expect(section(page,'Copy one-time secret now')).toContainText(KEY_SECRET);await section(page,'Copy one-time secret now').getByRole('button',{name:'Clear one-time secret'}).click();await expect(registry(page)).toContainText('fixture10');await expect(area(page)).not.toContainText(KEY_SECRET);
 });
 test('PAKEY-072 Copy requested UI acknowledgement does not say secret manager saved',async({page})=>{
  await openApiKeys(page);await fillCreate(page);await create(page).getByRole('button',{name:'Create public API key'}).click();await section(page,'Copy one-time secret now').getByRole('button',{name:'Copy secret'}).click();await expect(area(page)).toContainText('Verify the credential is stored in the intended secret manager');
 });
 test('PAKEY-073 Rotation while new secret panel exists replaces current one-time response',async({page})=>{
  await openApiKeys(page);await fillCreate(page);await create(page).getByRole('button',{name:'Create public API key'}).click();await expect(area(page).locator('.platform-api-keys__secret-panel')).toHaveCount(1);page.once('dialog',d=>{void d.accept();});await card(page,'Fixture ERP sync').getByRole('button',{name:'Rotate secret'}).click();await expect(area(page).locator('.platform-api-keys__secret-panel')).toHaveCount(1);await expect(area(page).locator('.platform-api-keys__secret-panel')).toContainText('Copy the rotated credential once');
 });
 test('PAKEY-074 Backend contract can explicitly say IP allowlist is not enforced',async({page})=>{
  await openApiKeys(page,{contract:{allowed_ips_enforced_for_platform_keys:false}});await expect(section(page,'Public API contract').locator('.platform-api-keys__evidence-grid')).toContainText('Not enforced');
 });
 test('PAKEY-075 Legacy contract flag may explicitly report format not recognized',async({page})=>{
  await openApiKeys(page,{contract:{legacy_hla_format_recognized:false}});await expect(section(page,'Public API contract').locator('.platform-api-keys__evidence-grid')).toContainText('Not recognized');
 });
 test('PAKEY-076 Created-by evidence is redacted without operator identity permission',async({page})=>{
  await openApiKeys(page,{permissions:without('platform.users.read')});await expect(card(page,'Fixture ERP sync')).not.toContainText('issuer@fixture.test');await expect(card(page,'Fixture ERP sync')).toContainText('Redacted');
 });
 test('PAKEY-077 Revoked-by identity is hidden independently from visible revoked status',async({page})=>{
  await openApiKeys(page,{query:'include_revoked=true',permissions:without('platform.users.read')});const item=card(page,'Fixture retired credential');await expect(item).toContainText('Revoked');await expect(item).toContainText('Revoked by');await expect(item).not.toContainText('revoker@fixture.test');
 });
 test('PAKEY-078 Missing expiry and recorded expiry render separate evidence',async({page})=>{
  await openApiKeys(page);await expect(card(page,'Fixture ERP sync')).toContainText('No expiration');await expect(card(page,'Fixture expired credential')).not.toContainText('No expiration');
 });
 test('PAKEY-079 Revoke reason input enforces 1000-character browser limit',async({page})=>{
  await openApiKeys(page);const input=card(page,'Fixture ERP sync').getByLabel('Revoke reason');await expect(input).toHaveAttribute('maxlength','1000');await input.fill('x'.repeat(1020));await expect(input).toHaveValue('x'.repeat(1000));
 });
 test('PAKEY-080 HTTP 429 initial registry rejection reports error without fabricated retry success',async({page})=>{
  await openApiKeys(page,{responses:{'GET /platform/api-keys':{status:429,json:{message:'Synthetic rate limited'}}}});await expect(registry(page)).toContainText('API key registry unavailable');await expect(registry(page)).toContainText('Synthetic rate limited');await expect(registry(page).getByRole('button',{name:'Retry'})).toBeVisible();
 });
});
