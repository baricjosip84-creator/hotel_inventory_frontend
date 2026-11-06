/** Batch 87 — Platform Data Retention (source-grounded synthetic browser declarations, UNRUN).
 * Never infer deletion, actual legal holds, Postgres writes, backup access, or tenant isolation from intercepted HTTP. */
import {test,expect,type Page} from '@playwright/test';
import {openDataRetention,retentionRoot,retentionPermissions,retentionTenantA,retentionTenantB,
 standardRetention,heldRetention,dueRetention,manyRetentionRecords} from '../../../support/platformDataRetentionFixture';
const root=(p:Page)=>p.locator('.platform-data-retention');
const section=(p:Page,name:string)=>root(p).locator('section.platform-data-retention__section').filter({has:p.getByRole('heading',{name,exact:true})});
const registry=(p:Page)=>section(p,'Retention registry');
const list=(p:Page)=>registry(p).locator('.platform-data-retention__list');
const cards=(p:Page)=>registry(p).locator('.platform-data-retention__card');
const card=(p:Page,name:string)=>cards(p).filter({has:p.getByRole('heading',{name,exact:true})});
const pager=(p:Page)=>registry(p).locator('.platform-data-retention__pagination');
const edit=(p:Page)=>p.locator('#platform-data-retention-form');
const omit=(...names:string[])=>retentionPermissions.filter(x=>!names.includes(x));
const summary=(p:Page)=>root(p).getByLabel('Data retention registry summary');

test.describe('Platform Data Retention — registry, policy, legal holds (BATCH_087_GENERATED_UNRUN)',()=>{
 test('PDRET-001 Registry route explains policy configuration is not deletion evidence',async({page})=>{
  await openDataRetention(page);await expect(root(page)).toContainText('Policy records, not purge proof');
  await expect(root(page).locator('.platform-data-retention__truth-note')).toContainText('no purge executor');
 });
 test('PDRET-002 First GET requests fifty rows at offset zero',async({page})=>{
  const queries:string[]=[];await openDataRetention(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===retentionRoot)queries.push(q.toString());}});
  expect(new URLSearchParams(queries.at(-1)).get('limit')).toBe('50');expect(new URLSearchParams(queries.at(-1)).get('offset')).toBe('0');
 });
 test('PDRET-003 Missing data-retention read permission prevents rendering and GET',async({page})=>{
  const hits:string[]=[];await openDataRetention(page,{permissions:omit('platform.data_retention.read'),expectHeading:false,
   onCall:(m,p)=>{if(m==='GET'&&p===retentionRoot)hits.push(p);}});
  await expect(root(page)).toHaveCount(0);expect(hits).toHaveLength(0);
 });
 test('PDRET-004 Read-only operator sees registry without Edit or hold actions',async({page})=>{
  await openDataRetention(page,{permissions:omit('platform.data_retention.write')});
  await expect(card(page,standardRetention.tenant_name).getByRole('button',{name:'Edit'})).toHaveCount(0);
  await expect(card(page,heldRetention.tenant_name)).toContainText('Read only');
 });
 test('PDRET-005 Retention-write grant without tenant-read is insufficient for mutations',async({page})=>{
  await openDataRetention(page,{permissions:omit('platform.tenants.read')});
  await expect(cards(page).first().getByRole('button',{name:'Edit'})).toHaveCount(0);
  await expect(registry(page)).toContainText('Tenant filter restricted');
 });
 test('PDRET-006 Evidence-complete response distinguishes registry-wide tenant count',async({page})=>{
  await openDataRetention(page);await expect(summary(page)).toContainText('Tenants in scope');
  await expect(summary(page)).toContainText('Legal holds');await expect(summary(page)).toContainText('Write locked tenants');
 });
 test('PDRET-007 Restricted tenant source gives partial evidence and configured-only records',async({page})=>{
  await openDataRetention(page,{permissions:omit('platform.tenants.read')});
  await expect(root(page)).toContainText('Evidence is partial.');await expect(root(page)).toContainText('tenant_registry');
  await expect(summary(page)).toContainText('Configured records');await expect(cards(page)).toHaveCount(2);
 });
 test('PDRET-008 Without tenant identity record cards do not leak names or UUID URLs',async({page})=>{
  await openDataRetention(page,{permissions:omit('platform.tenants.read')});await expect(cards(page).first()).toContainText('Restricted tenant');
  await expect(root(page)).not.toContainText('Fixture Retention Alpha');
  await expect(cards(page).first().getByRole('link',{name:'Lifecycle'})).toHaveCount(0);
 });
 test('PDRET-009 Without user-read permission legal hold setter email is redacted',async({page})=>{
  await openDataRetention(page,{permissions:omit('platform.users.read')});
  await expect(card(page,heldRetention.tenant_name)).toContainText('Setter identity restricted');
  await expect(root(page)).not.toContainText('retention.operator@fixture.test');
 });
 test('PDRET-010 Restricted write-locked summary is not silently replaced with numeric zero',async({page})=>{
  await openDataRetention(page,{permissions:omit('platform.tenants.read')});
  await expect(summary(page)).toContainText('Restricted');await expect(summary(page)).toContainText('Requires tenant identity evidence');
 });
 test('PDRET-011 Active legal hold has distinct badge and server-recorded reason',async({page})=>{
  await openDataRetention(page);await expect(card(page,heldRetention.tenant_name)).toContainText('Legal hold');
  await expect(card(page,heldRetention.tenant_name)).toContainText('Synthetic operator hold');
 });
 test('PDRET-012 Due date is shown as Due but never as purge completed',async({page})=>{
  await openDataRetention(page);await expect(card(page,dueRetention.tenant_name).locator('[data-tone="warn"]')).toContainText('Due');
  await expect(root(page).locator('.platform-data-retention__truth-note')).toContainText('does not prove a purge occurred');
 });
 test('PDRET-013 Purge-after-offboarding is identified only as configured intent',async({page})=>{
  await openDataRetention(page);await expect(card(page,heldRetention.tenant_name)).toContainText('Configured');
  await expect(root(page).locator('.platform-data-retention__truth-note')).toContainText('operator-configured intent only');
 });
 test('PDRET-014 Tenant selector emits a UUID-scoped server GET',async({page})=>{
  const queries:string[]=[];await openDataRetention(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===retentionRoot)queries.push(q.toString());}});
  await registry(page).getByLabel('Tenant').selectOption(retentionTenantB);await expect(cards(page)).toHaveCount(1);
  expect(new URLSearchParams(queries.at(-1)).get('tenant_id')).toBe(retentionTenantB);
 });
 test('PDRET-015 Tenant filter in URL is omitted from API query without TENANTS_READ',async({page})=>{
  const queries:string[]=[];await openDataRetention(page,{permissions:omit('platform.tenants.read'),query:`tenant_id=${retentionTenantA}`,
   onCall:(m,p,q)=>{if(m==='GET'&&p===retentionRoot)queries.push(q.toString());}});
  await expect(root(page)).toContainText('Tenant filter omitted.');expect(new URLSearchParams(queries.at(-1)).has('tenant_id')).toBe(false);
 });
 test('PDRET-016 Search is trimmed in server query and scopes registry records',async({page})=>{
  const queries:string[]=[];await openDataRetention(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===retentionRoot)queries.push(q.toString());}});
  await registry(page).getByLabel('Search').fill('  Synthetic held record  ');
  await expect(cards(page)).toHaveCount(1);expect(new URLSearchParams(queries.at(-1)).get('search')).toBe('Synthetic held record');
 });
 test('PDRET-017 Hold Active filter scopes legally-held application rows',async({page})=>{
  await openDataRetention(page);await registry(page).getByLabel('Legal hold').selectOption('true');
  await expect(cards(page)).toHaveCount(1);await expect(card(page,heldRetention.tenant_name)).toBeVisible();
  expect(new URL(page.url()).searchParams.get('legal_hold')).toBe('true');
 });
 test('PDRET-018 Hold Not active filter excludes currently held row',async({page})=>{
  await openDataRetention(page);await registry(page).getByLabel('Legal hold').selectOption('false');
  await expect(cards(page)).toHaveCount(2);await expect(registry(page)).not.toContainText('Synthetic operator hold');
 });
 test('PDRET-019 Due-only filter sends true and returns due records',async({page})=>{
  await openDataRetention(page);await registry(page).getByLabel('Due').selectOption('true');
  await expect(cards(page)).toHaveCount(2);expect(new URL(page.url()).searchParams.get('due_only')).toBe('true');
 });
 test('PDRET-020 Returning Due to Any removes due_only URL query',async({page})=>{
  await openDataRetention(page,{query:'due_only=true'});await registry(page).getByLabel('Due').selectOption('false');
  await expect(cards(page)).toHaveCount(3);expect(new URL(page.url()).searchParams.has('due_only')).toBe(false);
 });
 test('PDRET-021 Summary counts are registry-wide and not merely current page size',async({page})=>{
  await openDataRetention(page,{records:manyRetentionRecords(54)});await expect(cards(page)).toHaveCount(50);
  await expect(summary(page)).toContainText('54');await expect(pager(page)).toContainText('1–50 of 54');
 });
 test('PDRET-022 Next retrieves offset fifty and remaining four records',async({page})=>{
  const queries:string[]=[];await openDataRetention(page,{records:manyRetentionRecords(54),onCall:(m,p,q)=>{if(m==='GET'&&p===retentionRoot)queries.push(q.toString());}});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect(cards(page)).toHaveCount(4);
  expect(new URLSearchParams(queries.at(-1)).get('offset')).toBe('50');
 });
 test('PDRET-023 Previous navigation returns to the first fifty records',async({page})=>{
  await openDataRetention(page,{records:manyRetentionRecords(52)});await pager(page).getByRole('button',{name:'Next'}).click();
  await expect(cards(page)).toHaveCount(2);await pager(page).getByRole('button',{name:'Previous'}).click();
  await expect(cards(page)).toHaveCount(50);await expect(pager(page)).toContainText('1–50 of 52');
 });
 test('PDRET-024 Changing search resets offset and returns to filtered first page',async({page})=>{
  await openDataRetention(page,{records:manyRetentionRecords(55)});await pager(page).getByRole('button',{name:'Next'}).click();
  await expect(cards(page)).toHaveCount(5);await registry(page).getByLabel('Search').fill('Retention Fixture 001');
  await expect(cards(page)).toHaveCount(1);expect(new URL(page.url()).searchParams.has('offset')).toBe(false);
 });
 test('PDRET-025 Empty read-scope registry carries absence-of-backups caveat',async({page})=>{
  await openDataRetention(page,{records:[]});await expect(registry(page)).toContainText('No retention records match these filters.');
  await expect(root(page).locator('.platform-data-retention__truth-note')).toContainText('backups, exports, replicas');
 });
 test('PDRET-026 Without tenant identity empty list says configured rows only',async({page})=>{
  await openDataRetention(page,{records:[],permissions:omit('platform.tenants.read')});
  await expect(registry(page)).toContainText('Only configured retention rows can be listed without TENANTS_READ');
 });
 test('PDRET-027 Authorized tenant links contain scoped tenant identifier',async({page})=>{
  await openDataRetention(page);const c=card(page,standardRetention.tenant_name);
  await expect(c.getByRole('link',{name:'Lifecycle'})).toHaveAttribute('href',`/platform/tenant-lifecycle?tenant_id=${retentionTenantA}`);
  await expect(c.getByRole('link',{name:'Offboarding'})).toHaveAttribute('href',`/platform/tenant-offboarding?tenant_id=${retentionTenantA}`);
 });
 test('PDRET-028 Tenant-export source link independently requires TENANTS_EXPORT',async({page})=>{
  await openDataRetention(page,{permissions:omit('platform.tenants.export')});
  await expect(card(page,standardRetention.tenant_name).getByRole('link',{name:'Export evidence'})).toHaveCount(0);
  await expect(card(page,standardRetention.tenant_name).getByRole('link',{name:'Lifecycle'})).toBeVisible();
 });
 test('PDRET-029 Supporting operations remain permission-scoped',async({page})=>{
  await openDataRetention(page,{permissions:omit('platform.audit.read','platform.compliance.read','platform.tenants.export')});
  const links=root(page).locator('.platform-data-retention__supporting-links');
  await expect(links.getByRole('link',{name:'Audit'})).toHaveCount(0);
  await expect(links.getByRole('link',{name:'Compliance documents'})).toHaveCount(0);
  await expect(links.getByRole('link',{name:'Tenant offboarding'})).toBeVisible();
 });
 test('PDRET-030 Edit opens existing policy and intentionally separates hold lifecycle',async({page})=>{
  await openDataRetention(page);await card(page,heldRetention.tenant_name).getByRole('button',{name:'Edit'}).click();
  await expect(edit(page).getByLabel('Policy')).toHaveValue('contractual');
  await expect(edit(page)).toContainText('use Clear hold on the registry card');
 });
 test('PDRET-031 Unmodified policy cannot be saved',async({page})=>{
  await openDataRetention(page);await card(page,standardRetention.tenant_name).getByRole('button',{name:'Edit'}).click();
  await expect(edit(page).getByRole('button',{name:'Save changes'})).toBeDisabled();
 });
 test('PDRET-032 Policy change PATCH excludes legal hold fields',async({page})=>{
  let body:any;let path='';await openDataRetention(page,{onCall:(m,p,q,b)=>{if(m==='PATCH'){path=p;body=b;}}});
  await card(page,standardRetention.tenant_name).getByRole('button',{name:'Edit'}).click();
  await edit(page).getByLabel('Policy').selectOption('custom');await edit(page).getByRole('button',{name:'Save changes'}).click();
  await expect.poll(()=>Boolean(body)).toBe(true);expect(path).toBe(`${retentionRoot}/${retentionTenantA}`);
  expect(body.retention_policy).toBe('custom');expect(body).not.toHaveProperty('legal_hold');expect(body).not.toHaveProperty('legal_hold_reason');
 });
 test('PDRET-033 Notes trimming and null retain-until are serialized on PATCH',async({page})=>{
  let body:any;await openDataRetention(page,{onCall:(m,p,q,b)=>{if(m==='PATCH')body=b;}});
  await card(page,standardRetention.tenant_name).getByRole('button',{name:'Edit'}).click();
  await edit(page).getByLabel('Notes').fill('  Edited synthetic note  ');
  await edit(page).getByRole('button',{name:'Save changes'}).click();await expect.poll(()=>Boolean(body)).toBe(true);
  expect(body.notes).toBe('Edited synthetic note');expect(body.retain_until).toBeNull();
 });
 test('PDRET-034 Cancelling edit discards draft without issuing PATCH',async({page})=>{
  const writes:string[]=[];await openDataRetention(page,{onCall:(m,p)=>{if(m==='PATCH')writes.push(p);}});
  await card(page,standardRetention.tenant_name).getByRole('button',{name:'Edit'}).click();
  await edit(page).getByLabel('Notes').fill('Unsaved fixture draft');await edit(page).getByRole('button',{name:'Cancel'}).click();
  await expect(edit(page)).toHaveCount(0);expect(writes).toHaveLength(0);
 });
 test('PDRET-035 Offboarding purge intent checkbox updates ordinary policy payload',async({page})=>{
  let body:any;await openDataRetention(page,{onCall:(m,p,q,b)=>{if(m==='PATCH')body=b;}});
  await card(page,standardRetention.tenant_name).getByRole('button',{name:'Edit'}).click();
  await edit(page).getByLabel('Purge after offboarding intent').check();await edit(page).getByRole('button',{name:'Save changes'}).click();
  await expect.poll(()=>Boolean(body)).toBe(true);expect(body.purge_after_offboarding).toBe(true);
  await expect(root(page).locator('.platform-data-retention__truth-note')).toContainText('no purge executor');
 });
 test('PDRET-036 Set legal hold confirmation dismissal causes no write',async({page})=>{
  const writes:string[]=[];await openDataRetention(page,{onCall:(m,p)=>{if(m==='POST'&&p.includes('legal-hold'))writes.push(p);}});
  page.once('dialog',d=>d.dismiss());await card(page,standardRetention.tenant_name).getByRole('button',{name:'Set hold'}).click();
  expect(writes).toHaveLength(0);
 });
 test('PDRET-037 Confirmed set legal hold requires a nonempty prompted reason',async({page})=>{
  const writes:string[]=[];await openDataRetention(page,{onCall:(m,p)=>{if(m==='POST'&&p.includes('legal-hold'))writes.push(p);}});
  let promptCount=0;page.on('dialog',d=>{promptCount++;void d.accept(promptCount===1?undefined:'   ');});
  await card(page,standardRetention.tenant_name).getByRole('button',{name:'Set hold'}).click();expect(writes).toHaveLength(0);
 });
 test('PDRET-038 Confirmed Set hold posts reason through dedicated lifecycle route',async({page})=>{
  let body:any;let path='';await openDataRetention(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p.endsWith('/set-legal-hold')){path=p;body=b;}}});
  let promptCount=0;page.on('dialog',d=>{promptCount++;void d.accept(promptCount===1?undefined:'Fixture legal review');});
  await card(page,standardRetention.tenant_name).getByRole('button',{name:'Set hold'}).click();
  await expect.poll(()=>Boolean(body)).toBe(true);expect(path).toBe(`${retentionRoot}/${retentionTenantA}/set-legal-hold`);
  expect(body).toEqual({reason:'Fixture legal review'});await expect(root(page)).toContainText('Legal hold set with an audited reason.');
 });
 test('PDRET-039 Confirmed Clear hold posts separate reason-bearing route',async({page})=>{
  let body:any;let path='';await openDataRetention(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p.endsWith('/clear-legal-hold')){path=p;body=b;}}});
  let promptCount=0;page.on('dialog',d=>{promptCount++;void d.accept(promptCount===1?undefined:'Fixture release review');});
  await card(page,heldRetention.tenant_name).getByRole('button',{name:'Clear hold'}).click();
  await expect.poll(()=>Boolean(body)).toBe(true);expect(path).toBe(`${retentionRoot}/${retentionTenantB}/clear-legal-hold`);
  expect(body).toEqual({reason:'Fixture release review'});await expect(root(page)).toContainText('Legal hold cleared with an audited reason.');
 });
 test('PDRET-040 Initial registry API failure shows retry and never substitutes zero evidence',async({page})=>{
  await openDataRetention(page,{overrides:{[`GET ${retentionRoot}`]:{status:503,json:{message:'Synthetic retention outage'}}}});
  await expect(registry(page)).toContainText('Data retention evidence could not be loaded.');
  await expect(registry(page).getByRole('button',{name:'Retry'})).toBeVisible();await expect(cards(page)).toHaveCount(0);
 });
 test('PDRET-041 Successful registry snapshot survives failed manual refetch with warning',async({page})=>{
  let calls=0;await openDataRetention(page,{respond:(m,p)=>{if(m==='GET'&&p===retentionRoot&&++calls>1)return {status:503,json:{message:'Synthetic refetch outage'}};return undefined;}});
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(root(page)).toContainText('Showing the last successful snapshot.');
  await expect(card(page,standardRetention.tenant_name)).toBeVisible();
 });
});

// Batch 88: policy-mutation failures, evidence boundaries, and backend-only obligations.
test.describe('Platform Data Retention — additional source-grounded cases (BATCH_088_GENERATED_UNRUN)',()=>{
 test('PDRET-042 Failed policy PATCH shows error without false success',async({page})=>{
  await openDataRetention(page,{overrides:{[`PATCH ${retentionRoot}/${retentionTenantA}`]:{status:409,json:{message:'Synthetic policy conflict'}}}});
  await card(page,standardRetention.tenant_name).getByRole('button',{name:'Edit'}).click();
  await edit(page).getByLabel('Policy').selectOption('extended');await edit(page).getByRole('button',{name:'Save changes'}).click();
  await expect(root(page)).toContainText('Retention change failed.');await expect(root(page)).toContainText('Synthetic policy conflict');
  await expect(root(page).locator('.platform-data-retention__success')).toHaveCount(0);
 });
 test('PDRET-043 Successful edit dismisses form and shows explicit confirmation',async({page})=>{
  await openDataRetention(page);await card(page,standardRetention.tenant_name).getByRole('button',{name:'Edit'}).click();
  await edit(page).getByLabel('Notes').fill('Synthetic confirmation note');await edit(page).getByRole('button',{name:'Save changes'}).click();
  await expect(edit(page)).toHaveCount(0);await expect(root(page)).toContainText('Retention policy updated for Fixture Retention Alpha.');
 });
 test('PDRET-044 Successful edit invalidates and refreshes recorded policy fields',async({page})=>{
  const calls:string[]=[];await openDataRetention(page,{onCall:(m,p)=>{if(m==='GET'&&p===retentionRoot)calls.push(p);}});
  await card(page,standardRetention.tenant_name).getByRole('button',{name:'Edit'}).click();
  await edit(page).getByLabel('Policy').selectOption('custom');await edit(page).getByRole('button',{name:'Save changes'}).click();
  await expect(card(page,standardRetention.tenant_name).locator('.platform-data-retention__badges')).toContainText('custom');
  expect(calls.length).toBeGreaterThan(1);
 });
 test('PDRET-045 Policy selector exposes five backend-supported policy values',async({page})=>{
  await openDataRetention(page);await card(page,standardRetention.tenant_name).getByRole('button',{name:'Edit'}).click();
  const values=await edit(page).getByLabel('Policy').locator('option').evaluateAll((nodes)=>nodes.map(n=>(n as HTMLOptionElement).value));
  expect(values).toEqual(['standard','extended','contractual','delete_after_offboarding','custom']);
 });
 test('PDRET-046 Changing retention date sends normalized YYYY-MM-DD field',async({page})=>{
  let body:any;await openDataRetention(page,{onCall:(m,p,q,b)=>{if(m==='PATCH')body=b;}});
  await card(page,standardRetention.tenant_name).getByRole('button',{name:'Edit'}).click();
  await edit(page).getByLabel('Retain until').fill('2031-06-15');await edit(page).getByRole('button',{name:'Save changes'}).click();
  await expect.poll(()=>body?.retain_until).toBe('2031-06-15');
 });
 test('PDRET-047 Clearing retention date sends null instead of stale value',async({page})=>{
  let body:any;await openDataRetention(page,{onCall:(m,p,q,b)=>{if(m==='PATCH')body=b;}});
  await card(page,heldRetention.tenant_name).getByRole('button',{name:'Edit'}).click();
  await edit(page).getByLabel('Retain until').fill('');await edit(page).getByRole('button',{name:'Save changes'}).click();
  await expect.poll(()=>Boolean(body)).toBe(true);expect(body.retain_until).toBeNull();
 });
 test('PDRET-048 Whitespace-only notes normalize to null',async({page})=>{
  let body:any;await openDataRetention(page,{onCall:(m,p,q,b)=>{if(m==='PATCH')body=b;}});
  await card(page,standardRetention.tenant_name).getByRole('button',{name:'Edit'}).click();
  await edit(page).getByLabel('Notes').fill('   ');await edit(page).getByRole('button',{name:'Save changes'}).click();
  await expect.poll(()=>Boolean(body)).toBe(true);expect(body.notes).toBeNull();
 });
 test('PDRET-049 Notes persist after successful synthetic policy update',async({page})=>{
  await openDataRetention(page);await card(page,standardRetention.tenant_name).getByRole('button',{name:'Edit'}).click();
  await edit(page).getByLabel('Notes').fill('  New synthetic retention note  ');await edit(page).getByRole('button',{name:'Save changes'}).click();
  await expect(card(page,standardRetention.tenant_name)).toContainText('New synthetic retention note');
 });
 test('PDRET-050 Set hold confirmation text distinguishes recorded evidence from legal obligation',async({page})=>{
  await openDataRetention(page);let message='';page.once('dialog',async d=>{message=d.message();await d.dismiss();});
  await card(page,standardRetention.tenant_name).getByRole('button',{name:'Set hold'}).click();
  expect(message).toContain('does not prove an external legal obligation exists');
 });
 test('PDRET-051 Empty set-hold reason cancels without POST',async({page})=>{
  const writes:string[]=[];await openDataRetention(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('set-legal-hold'))writes.push(p);}});
  let n=0;page.on('dialog',async d=>{n++;await d.accept(n===1?undefined:'   ');});
  await card(page,standardRetention.tenant_name).getByRole('button',{name:'Set hold'}).click();
  expect(writes).toHaveLength(0);await expect(card(page,standardRetention.tenant_name)).toContainText('No hold');
 });
 test('PDRET-052 Set hold failure shows mutation warning and preserves original registry row',async({page})=>{
  await openDataRetention(page,{overrides:{[`POST ${retentionRoot}/${retentionTenantA}/set-legal-hold`]:{status:503,json:{message:'Synthetic hold outage'}}}});
  let n=0;page.on('dialog',d=>{n++;void d.accept(n===1?undefined:'Synthetic hold reason');});
  await card(page,standardRetention.tenant_name).getByRole('button',{name:'Set hold'}).click();
  await expect(root(page)).toContainText('Retention change failed.');await expect(root(page)).toContainText('Synthetic hold outage');
  await expect(card(page,standardRetention.tenant_name)).toContainText('No hold');
 });
 test('PDRET-053 Clear hold confirmation dismissal leaves active legal hold unchanged',async({page})=>{
  const writes:string[]=[];await openDataRetention(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('clear-legal-hold'))writes.push(p);}});
  page.once('dialog',d=>void d.dismiss());await card(page,heldRetention.tenant_name).getByRole('button',{name:'Clear hold'}).click();
  expect(writes).toHaveLength(0);await expect(card(page,heldRetention.tenant_name)).toContainText('Legal hold');
 });
 test('PDRET-054 Empty clear-hold reason cancels without POST',async({page})=>{
  const writes:string[]=[];await openDataRetention(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('clear-legal-hold'))writes.push(p);}});
  let n=0;page.on('dialog',d=>{n++;void d.accept(n===1?undefined:' ');});
  await card(page,heldRetention.tenant_name).getByRole('button',{name:'Clear hold'}).click();
  expect(writes).toHaveLength(0);
 });
 test('PDRET-055 Clear hold failure displays actionable error and retained hold state',async({page})=>{
  await openDataRetention(page,{overrides:{[`POST ${retentionRoot}/${retentionTenantB}/clear-legal-hold`]:{status:409,json:{message:'Synthetic legal dispute'}}}});
  let n=0;page.on('dialog',d=>{n++;void d.accept(n===1?undefined:'Synthetic release request');});
  await card(page,heldRetention.tenant_name).getByRole('button',{name:'Clear hold'}).click();
  await expect(root(page)).toContainText('Synthetic legal dispute');await expect(card(page,heldRetention.tenant_name)).toContainText('Legal hold');
 });
 test('PDRET-056 Mutation loading disables conflicting Edit/Set/Clear actions',async({page})=>{
  let release!:(response:{status:number;json:any})=>void;
  const pending=new Promise<{status:number;json:any}>(resolve=>{release=resolve;});
  await openDataRetention(page,{respond:(m,p)=>m==='PATCH'&&p===`${retentionRoot}/${retentionTenantA}`?pending:undefined});
  await card(page,standardRetention.tenant_name).getByRole('button',{name:'Edit'}).click();
  await edit(page).getByLabel('Notes').fill('Pending policy write');await edit(page).getByRole('button',{name:'Save changes'}).click();
  await expect(card(page,standardRetention.tenant_name).getByRole('button',{name:'Set hold'})).toBeDisabled();
  await expect(card(page,heldRetention.tenant_name).getByRole('button',{name:'Clear hold'})).toBeDisabled();
  release({status:503,json:{message:'Synthetic pending write released'}});
  await expect(root(page)).toContainText('Retention change failed.');
 });
 test('PDRET-057 Refresh disables itself while a list request is pending',async({page})=>{
  let release!:(response:{status:number;json:any})=>void;const pending=new Promise<{status:number;json:any}>(resolve=>{release=resolve;});
  await openDataRetention(page,{respond:(m,p)=>m==='GET'&&p===retentionRoot?pending:undefined});
  await expect(root(page).getByRole('button',{name:/Refreshing/})).toBeDisabled();
  release({status:503,json:{message:'Synthetic delayed response'}});
  await expect(registry(page)).toContainText('Data retention evidence could not be loaded.');
 });
 test('PDRET-058 Failed tenant directory remains separate from retention API evidence',async({page})=>{
  await openDataRetention(page,{overrides:{'GET /platform/tenants':{status:503,json:{message:'Synthetic directory unavailable'}}}});
  await expect(card(page,standardRetention.tenant_name)).toBeVisible();await expect(summary(page)).toContainText('Tenants in scope');
  await expect(registry(page).getByLabel('Tenant').locator('option')).toHaveCount(1);
 });
 test('PDRET-059 Stale error retry restores fresh registry evidence',async({page})=>{
  let attempts=0;await openDataRetention(page,{respond:(m,p)=>m==='GET'&&p===retentionRoot&&++attempts===2?{status:503,json:{message:'Synthetic intermittent outage'}}:undefined});
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(root(page)).toContainText('Showing the last successful snapshot.');
  await root(page).getByRole('button',{name:'Retry'}).click();await expect(card(page,standardRetention.tenant_name)).toBeVisible();
  await expect(root(page).locator('.platform-data-retention__warning').filter({hasText:'Showing the last successful snapshot.'})).toHaveCount(0);
 });
 test('PDRET-060 Source identity redaction preserves hold-set-by presence flag',async({page})=>{
  await openDataRetention(page,{permissions:omit('platform.users.read')});
  await expect(card(page,heldRetention.tenant_name)).toContainText('Setter identity restricted');
  await expect(card(page,heldRetention.tenant_name)).not.toContainText('retention.operator@fixture.test');
 });
 test('PDRET-061 Hold reason remains visible while holder identity is restricted',async({page})=>{
  await openDataRetention(page,{permissions:omit('platform.users.read')});
  await expect(card(page,heldRetention.tenant_name).locator('.platform-data-retention__evidence-note')).toContainText('Synthetic operator hold');
 });
 test('PDRET-062 Tenant-linked write-lock state is shown without implying policy lock',async({page})=>{
  await openDataRetention(page);await expect(card(page,heldRetention.tenant_name)).toContainText('write locked');
  await expect(card(page,heldRetention.tenant_name).getByRole('button',{name:'Edit'})).toBeEnabled();
 });
 test('PDRET-063 Contractual policy renders human-readable label',async({page})=>{
  await openDataRetention(page);await expect(card(page,heldRetention.tenant_name).locator('.platform-data-retention__badges')).toContainText('contractual');
 });
 test('PDRET-064 Search matches permitted policy notes without tenant directory',async({page})=>{
  await openDataRetention(page,{permissions:omit('platform.tenants.read')});
  await registry(page).getByLabel('Search').fill('Synthetic held record');await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first()).toContainText('Restricted tenant');
 });
 test('PDRET-065 Legal hold and due-only filters can be combined',async({page})=>{
  const queries:string[]=[];await openDataRetention(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===retentionRoot)queries.push(q.toString());}});
  await registry(page).getByLabel('Legal hold').selectOption('true');await registry(page).getByLabel('Due').selectOption('true');
  await expect(cards(page)).toHaveCount(1);const q=new URLSearchParams(queries.at(-1));
  expect(q.get('legal_hold')).toBe('true');expect(q.get('due_only')).toBe('true');
 });
 test('PDRET-066 Changing filters drops stale pagination offset',async({page})=>{
  await openDataRetention(page,{records:manyRetentionRecords(57)});await pager(page).getByRole('button',{name:'Next'}).click();
  await expect(cards(page)).toHaveCount(7);await registry(page).getByLabel('Legal hold').selectOption('false');
  await expect(cards(page)).toHaveCount(50);expect(new URL(page.url()).searchParams.has('offset')).toBe(false);
 });
 test('PDRET-067 Tenant filter selects only UUID-backed directory options in UI',async({page})=>{
  await openDataRetention(page);const options=await registry(page).getByLabel('Tenant').locator('option').evaluateAll(nodes=>nodes.map(n=>(n as HTMLOptionElement).value));
  expect(options).toEqual(['',retentionTenantA,retentionTenantB,retentionTenantC]);
 });
 test('PDRET-068 Non-numeric offset URL is clamped to zero for outgoing query',async({page})=>{
  const queries:string[]=[];await openDataRetention(page,{query:'offset=not-a-number',onCall:(m,p,q)=>{if(m==='GET'&&p===retentionRoot)queries.push(q.toString());}});
  expect(new URLSearchParams(queries.at(-1)).get('offset')).toBe('0');
 });
 test('PDRET-069 Negative offset URL is clamped to zero',async({page})=>{
  const queries:string[]=[];await openDataRetention(page,{query:'offset=-50',onCall:(m,p,q)=>{if(m==='GET'&&p===retentionRoot)queries.push(q.toString());}});
  expect(new URLSearchParams(queries.at(-1)).get('offset')).toBe('0');
 });
 test.skip('PDRET-070 Server rejects invalid tenant UUID and conflicting query aliases',async()=>{
  // Phase 2: test backend Joi validation with a disposable authenticated principal; browser mocks cannot validate it.
 });
 test.skip('PDRET-071 Backend denies tenant target without TENANTS_READ independently of frontend',async()=>{
  // Phase 2: authenticate a restricted principal and make a real request, without frontend interception.
 });
 test.skip('PDRET-072 Backend forbids direct legal_hold mutation in regular PATCH',async()=>{
  // Phase 2: real API guard and audit observation; synthetic success cannot prove backend rejection.
 });
 test.skip('PDRET-073 Backend handles held policy concurrency and reason audit atomically',async()=>{
  // Phase 2: disposable PostgreSQL, concurrent principals and audit event transaction review.
 });
 test.skip('PDRET-074 Two-tenant data separation and redacted identity measured with real principals',async()=>{
  // Phase 2: distinct tenant principals and authoritative backend data required.
 });
 test('PDRET-075 Purge after offboarding remains intent without a purge executor',async({page})=>{
  await openDataRetention(page);await expect(root(page).locator('.platform-data-retention__truth-note')).toContainText('no purge executor');
  await expect(card(page,heldRetention.tenant_name)).toContainText('Configured');
 });
 test('PDRET-076 Past retain-until does not prove operational deletion',async({page})=>{
  await openDataRetention(page);await expect(card(page,dueRetention.tenant_name)).toContainText('Due');
  await expect(root(page).locator('.platform-data-retention__truth-note')).toContainText('does not prove a purge occurred');
 });
 test('PDRET-077 Absent application policy rows do not prove absence of backup or exports',async({page})=>{
  await openDataRetention(page,{records:[]});await expect(root(page).locator('.platform-data-retention__truth-note')).toContainText('backups, exports, replicas');
 });
 test('PDRET-078 External legal-hold obligation and release require separate independent evidence',async({page})=>{
  await openDataRetention(page);await expect(root(page)).toContainText('Legal-hold changes are audited');
  let confirmation='';page.once('dialog',async d=>{confirmation=d.message();await d.dismiss();});
  await card(page,heldRetention.tenant_name).getByRole('button',{name:'Clear hold'}).click();
  expect(confirmation).toContain('does not prove any external legal obligation ended');
 });
 test.skip('PDRET-079 Backend query pagination and totals verified against disposable PostgreSQL',async()=>{
  // Phase 2: backed database records, server aggregation and proper pagination needed.
 });
 test.skip('PDRET-080 Real offline backup/restore lifecycle verification is outside this surface',async()=>{
  // Phase 2: operational backup and restore procedures outside browser/application mock test.
 });
});
