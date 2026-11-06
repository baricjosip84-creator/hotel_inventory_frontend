/** Batch 75 · Platform Webhooks UI tests (PWH-001..041) · GENERATED_UNRUN.
 * Mock browser transport verifies visible behavior and request shapes only; no real webhook
 * requests, cryptographic signatures, worker/queue runs, tenant ACL or database effects. */
import {test,expect,type Page} from '@playwright/test';
import {openWebhooks,webhookPermissions,webhookTenantA,webhookIdA,readyWebhook,legacyWebhook,
 successfulDelivery,manyWebhooks} from '../../../support/platformWebhooksFixture';
const root=(p:Page)=>p.locator('.platform-webhooks');
const cards=(p:Page)=>p.locator('.platform-webhooks__card');
const card=(p:Page,name:string)=>cards(p).filter({hasText:name});
const create=(p:Page)=>p.locator('.platform-webhooks__section').filter({hasText:'New endpoints are tenant-bound'}).first();
const registry=(p:Page)=>p.locator('.platform-webhooks__section').filter({hasText:'Endpoint registry'}).first();
const deliveries=(p:Page)=>p.locator('.platform-webhooks__delivery-list');
const without=(permission:string)=>webhookPermissions.filter(x=>x!==permission);
const list='/platform/webhooks',deliveriesEndpoint='/platform/webhooks/deliveries';
const fillRequired=async(p:Page)=>{
 await create(p).getByLabel('Tenant').selectOption(webhookTenantA);
 await create(p).getByLabel('Name').fill('Fixture New Destination');
 await create(p).getByLabel('HTTPS destination').fill('https://receiving.fixture.example/webhook');
 await create(p).getByLabel('tenant.updated').check();
};

test.describe('Platform Webhooks — access, evidence, contract (GENERATED_UNRUN)',()=>{
 test('PWH-001 Webhooks route displays platform operations workspace',async({page})=>{
  await openWebhooks(page);await expect(page.getByRole('heading',{name:'Webhooks',exact:true})).toBeVisible();
 });
 test('PWH-002 Header states HTTPS destination policy',async({page})=>{
  await openWebhooks(page);await expect(root(page)).toContainText('HTTPS destinations only');
 });
 test('PWH-003 Header describes HMAC-SHA256 signing boundary',async({page})=>{
  await openWebhooks(page);await expect(root(page)).toContainText('HMAC-SHA256 signing');
 });
 test('PWH-004 Evidence boundary does not equate HTTP 2xx with downstream acceptance',async({page})=>{
  await openWebhooks(page);await expect(root(page)).toContainText('does not prove the remote system processed');
 });
 test('PWH-005 Delivery contract displays HTTPS, private-network and audit-outbox facts',async({page})=>{
  await openWebhooks(page);await expect(root(page)).toContainText('Private/local destinations blocked');
  await expect(root(page)).toContainText('Audit outbox');
 });
 test('PWH-006 Existing enabled and disabled endpoints are distinguished',async({page})=>{
  await openWebhooks(page);await expect(card(page,'Fixture Active Webhook')).toContainText('Enabled');
  await expect(card(page,'Fixture Legacy Webhook')).toContainText('Disabled');
 });
 test('PWH-007 Endpoint card shows safe URL, prefix and event type without full secret',async({page})=>{
  await openWebhooks(page);const current=card(page,'Fixture Active Webhook');
  await expect(current).toContainText('https://webhook.fixture.example/v1/receive');
  await expect(current).toContainText('webhook1…');await expect(current).toContainText('tenant.updated');
  await expect(current).not.toContainText('fixture-once-only-secret');
 });
 test('PWH-008 Last-delivery status and consecutive failure count are card metadata',async({page})=>{
  await openWebhooks(page);await expect(card(page,'Fixture Active Webhook')).toContainText('succeeded');
  await expect(card(page,'Fixture Legacy Webhook')).toContainText('3');
 });
 test('PWH-009 User identity permission independently redacts operator email',async({page})=>{
  await openWebhooks(page,{permissions:without('platform.users.read')});
  await expect(card(page,'Fixture Active Webhook')).toContainText('Redacted');
  await expect(card(page,'Fixture Active Webhook')).not.toContainText('reviewer@fixture.test');
 });
 test('PWH-010 Tenant identity permission hides tenant name in endpoint card',async({page})=>{
  await openWebhooks(page,{permissions:without('platform.tenants.read')});
  await expect(card(page,'Fixture Active Webhook')).not.toContainText('Fixture Hotel');
  await expect(card(page,'Fixture Active Webhook')).toContainText('Redacted');
 });
 test('PWH-011 Tenant identity denial removes tenant selectors from both evidence sections',async({page})=>{
  await openWebhooks(page,{permissions:without('platform.tenants.read')});
  await expect(root(page).getByText('Tenant filter restricted · TENANTS_READ required')).toHaveCount(2);
 });
 test('PWH-012 Read-only operator sees no create, edit, send-test or rotate actions',async({page})=>{
  await openWebhooks(page,{permissions:without('platform.webhooks.write')});
  await expect(create(page)).toHaveCount(0);
  for(const name of ['Create webhook','Edit settings','Send test','Rotate secret'])await expect(root(page).getByRole('button',{name})).toHaveCount(0);
 });
 test('PWH-013 Write access without tenant read exposes explicit creation restriction',async({page})=>{
  await openWebhooks(page,{permissions:without('platform.tenants.read')});
  await expect(root(page)).toContainText('TENANTS_READ is required to bind a new webhook to a tenant.');
  await expect(create(page).getByRole('button',{name:'Create webhook'})).toHaveCount(0);
 });
 test('PWH-014 Route read permission is independently required before page renders',async({page})=>{
  let calls=0;await openWebhooks(page,{permissions:without('platform.webhooks.read'),expectHeading:false,
   onCall:(m,p)=>{if(m==='GET'&&(p===list||p===deliveriesEndpoint))calls++;}});
  await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);expect(calls).toBe(0);
 });
});

test.describe('Platform Webhooks — create form and one-time secret (GENERATED_UNRUN)',()=>{
 test('PWH-015 Creation first requires tenant selection',async({page})=>{
  await openWebhooks(page);await expect(create(page)).toContainText('Select a tenant.');
  await expect(create(page).getByRole('button',{name:'Create webhook'})).toBeDisabled();
 });
 test('PWH-016 Selecting tenant reveals the required-name validation',async({page})=>{
  await openWebhooks(page);await create(page).getByLabel('Tenant').selectOption(webhookTenantA);
  await expect(create(page)).toContainText('Name is required.');
 });
 test('PWH-017 Named webhook still requires a valid HTTPS destination',async({page})=>{
  await openWebhooks(page);await create(page).getByLabel('Tenant').selectOption(webhookTenantA);
  await create(page).getByLabel('Name').fill('Name only');
  await expect(create(page)).toContainText('A valid HTTPS destination is required.');
 });
 test('PWH-018 HTTP destination cannot enable create action',async({page})=>{
  await openWebhooks(page);await create(page).getByLabel('Tenant').selectOption(webhookTenantA);
  await create(page).getByLabel('Name').fill('Fixture Plain HTTP');
  await create(page).getByLabel('HTTPS destination').fill('http://example.com/webhook');
  await create(page).getByLabel('tenant.updated').check();
  await expect(create(page).getByRole('button',{name:'Create webhook'})).toBeDisabled();
  await expect(create(page)).toContainText('A valid HTTPS destination is required.');
 });
 test('PWH-019 Valid HTTPS destination still needs at least one event type',async({page})=>{
  await openWebhooks(page);await create(page).getByLabel('Tenant').selectOption(webhookTenantA);
  await create(page).getByLabel('Name').fill('Fixture Missing Events');
  await create(page).getByLabel('HTTPS destination').fill('https://example.com/webhook');
  await expect(create(page)).toContainText('Select at least one event type.');
 });
 test('PWH-020 Valid create issues POST then shows success feedback',async({page})=>{
  const writes:string[]=[];await openWebhooks(page,{onCall:(m,p)=>{if(m==='POST'&&p===list)writes.push(m);}});
  await fillRequired(page);await create(page).getByRole('button',{name:'Create webhook'}).click();
  await expect(root(page)).toContainText('Webhook Fixture New Destination created.');
  expect(writes).toEqual(['POST']);
 });
 test('PWH-021 Successful creation reveals one-time secret in dedicated panel',async({page})=>{
  await openWebhooks(page);await fillRequired(page);await create(page).getByRole('button',{name:'Create webhook'}).click();
  await expect(root(page).locator('.platform-webhooks__secret-panel')).toContainText('fixture-once-only-secret');
 });
 test('PWH-022 Clearing one-time secret removes visible secret from registry UI',async({page})=>{
  await openWebhooks(page);await fillRequired(page);await create(page).getByRole('button',{name:'Create webhook'}).click();
  await root(page).getByRole('button',{name:'Clear one-time secret'}).click();
  await expect(root(page)).not.toContainText('fixture-once-only-secret');
 });
 test('PWH-023 Unchecking initial enable flag sends disabled to create endpoint',async({page})=>{
  const states:boolean[]=[];await openWebhooks(page,{onCall:(m,p,q,body)=>{if(m==='POST'&&p===list)states.push(body.is_enabled);}});
  await fillRequired(page);await create(page).getByLabel('Enable automatic delivery immediately').uncheck();
  await create(page).getByRole('button',{name:'Create webhook'}).click();expect(states).toEqual([false]);
 });
 test('PWH-024 Create mutation trims name and HTTPS destination before transport',async({page})=>{
  const bodies:any[]=[];await openWebhooks(page,{onCall:(m,p,q,body)=>{if(m==='POST'&&p===list)bodies.push(body);}});
  await fillRequired(page);await create(page).getByLabel('Name').fill('  Trim Me  ');
  await create(page).getByLabel('HTTPS destination').fill('  https://receiving.fixture.example/webhook  ');
  await create(page).getByRole('button',{name:'Create webhook'}).click();
  expect(bodies[0].name).toBe('Trim Me');expect(bodies[0].url).toBe('https://receiving.fixture.example/webhook');
 });
 test('PWH-025 Create request carries tenant and selected event types, not raw signing secret',async({page})=>{
  const bodies:any[]=[];await openWebhooks(page,{onCall:(m,p,q,body)=>{if(m==='POST'&&p===list)bodies.push(body);}});
  await fillRequired(page);await create(page).getByRole('button',{name:'Create webhook'}).click();
  expect(bodies[0].tenant_id).toBe(webhookTenantA);expect(bodies[0].event_types).toContain('tenant.updated');
  expect(Object.keys(bodies[0])).not.toContain('secret');
 });
 test('PWH-026 Multiple selected event checkboxes are included in create request',async({page})=>{
  const bodies:any[]=[];await openWebhooks(page,{onCall:(m,p,q,body)=>{if(m==='POST'&&p===list)bodies.push(body);}});
  await fillRequired(page);await create(page).getByLabel('incident.created').check();
  await create(page).getByRole('button',{name:'Create webhook'}).click();
  expect(bodies[0].event_types).toEqual(expect.arrayContaining(['tenant.updated','incident.created']));
 });
});

test.describe('Platform Webhooks — URL filters, evidence and recovery (GENERATED_UNRUN)',()=>{
 test('PWH-027 Registry search is a server-query filter, not a cosmetic client-only search',async({page})=>{
  const terms:string[]=[];await openWebhooks(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===list)terms.push(q.get('search')||'');}});
  await registry(page).getByLabel('Search').fill('Legacy');await expect(card(page,'Fixture Legacy Webhook')).toBeVisible();
  await expect(card(page,'Fixture Active Webhook')).toHaveCount(0);await expect.poll(()=>terms.at(-1)).toBe('Legacy');
 });
 test('PWH-028 Disabling include-disabled filter removes disabled endpoints',async({page})=>{
  await openWebhooks(page);await registry(page).getByLabel('Include disabled').uncheck();
  await expect(card(page,'Fixture Active Webhook')).toBeVisible();await expect(card(page,'Fixture Legacy Webhook')).toHaveCount(0);
 });
 test('PWH-029 Tenant URL filter sends valid selected tenant to endpoint registry',async({page})=>{
  const selected:string[]=[];await openWebhooks(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===list)selected.push(q.get('tenant_id')||'');}});
  await registry(page).getByLabel('Tenant').selectOption(webhookTenantA);
  await expect.poll(()=>selected.at(-1)).toBe(webhookTenantA);
  await expect(card(page,'Fixture Legacy Webhook')).toHaveCount(0);
 });
 test('PWH-030 Invalid tenant UUID blocks endpoint and delivery queries until cleared',async({page})=>{
  const calls:string[]=[];await openWebhooks(page,{query:'tenant_id=invalid-id',onCall:(m,p)=>{if(m==='GET'&&(p===list||p===deliveriesEndpoint))calls.push(p);}});
  await expect(root(page)).toContainText('Invalid or unauthorized URL filter');expect(calls).toHaveLength(0);
 });
 test('PWH-031 Excessive URL search is rejected locally without registry query',async({page})=>{
  const calls:string[]=[];await openWebhooks(page,{query:`search=${'X'.repeat(201)}`,onCall:(m,p)=>{if(m==='GET'&&p===list)calls.push(p);}});
  await expect(root(page)).toContainText('Invalid or unauthorized URL filter');expect(calls).toHaveLength(0);
 });
 test('PWH-032 Invalid include_disabled URL flag is rejected before querying',async({page})=>{
  const calls:string[]=[];await openWebhooks(page,{query:'include_disabled=maybe',onCall:(m,p)=>{if(m==='GET'&&p===list)calls.push(p);}});
  await expect(root(page)).toContainText('Invalid or unauthorized URL filter');expect(calls).toHaveLength(0);
 });
 test('PWH-033 Unsupported delivery status blocks both registry and deliveries',async({page})=>{
  const calls:string[]=[];await openWebhooks(page,{query:'delivery_status=unknown',onCall:(m,p)=>{if(m==='GET'&&(p===list||p===deliveriesEndpoint))calls.push(p);}});
  await expect(root(page)).toContainText('Invalid or unauthorized URL filter');expect(calls).toHaveLength(0);
 });
 test('PWH-034 Clear invalid filters restores registry while retaining unrelated URL keys',async({page})=>{
  await openWebhooks(page,{query:'tenant_id=invalid-id&source=external'});
  await root(page).getByRole('button',{name:'Clear invalid filters'}).click();
  await expect(card(page,'Fixture Active Webhook')).toBeVisible();const q=new URL(page.url()).searchParams;
  expect(q.get('source')).toBe('external');expect(q.has('tenant_id')).toBe(false);
 });
 test('PWH-035 Delivery status selection sends server status filter and shows matching record',async({page})=>{
  const status:string[]=[];await openWebhooks(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===deliveriesEndpoint)status.push(q.get('status')||'');}});
  await root(page).getByLabel('Delivery status').selectOption('succeeded');
  await expect.poll(()=>status.at(-1)).toBe('succeeded');
  await expect(deliveries(page)).toContainText('tenant.updated');
 });
 test('PWH-036 Endpoint registry failure renders retry while delivery evidence may remain visible',async({page})=>{
  await openWebhooks(page,{responses:{[`GET ${list}`]:{status:503,json:{message:'Synthetic webhook registry unavailable'}}}});
  await expect(root(page)).toContainText('Webhook registry unavailable');
  await expect(root(page).getByRole('button',{name:'Retry',exact:true})).toBeVisible();
  await expect(deliveries(page)).toContainText('tenant.updated');
 });
 test('PWH-037 Delivery failure leaves endpoint registry usable with independent error feedback',async({page})=>{
  await openWebhooks(page,{responses:{[`GET ${deliveriesEndpoint}`]:{status:503,json:{message:'Synthetic deliveries unavailable'}}}});
  await expect(root(page)).toContainText('Delivery evidence unavailable.');
  await expect(card(page,'Fixture Active Webhook')).toBeVisible();
 });
 test('PWH-038 Retry registry recovers from a temporary synthetic service error',async({page})=>{
  let fail=true;await openWebhooks(page,{respond:(m,p)=>m==='GET'&&p===list&&fail?{status:503,json:{message:'Synthetic temporarily down'}}:undefined});
  await expect(root(page)).toContainText('Webhook registry unavailable');fail=false;
  await registry(page).getByRole('button',{name:'Retry',exact:true}).click();
  await expect(card(page,'Fixture Active Webhook')).toBeVisible();
 });
 test('PWH-039 Retry deliveries recovers after temporary failure',async({page})=>{
  let fail=true;await openWebhooks(page,{respond:(m,p)=>m==='GET'&&p===deliveriesEndpoint&&fail?{status:503,json:{message:'Synthetic temporarily down'}}:undefined});
  await expect(root(page)).toContainText('Delivery evidence unavailable.');fail=false;
  await root(page).getByRole('button',{name:'Retry deliveries'}).click();
  await expect(deliveries(page)).toContainText('tenant.updated');
 });
 test('PWH-040 Refresh requests fresh endpoint and delivery snapshots without writing',async({page})=>{
  const methods:string[]=[];await openWebhooks(page,{onCall:(m,p)=>{if(p===list||p===deliveriesEndpoint)methods.push(`${m} ${p}`);}});
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>methods.filter(x=>x===`GET ${list}`).length).toBeGreaterThanOrEqual(2);
  await expect.poll(()=>methods.filter(x=>x===`GET ${deliveriesEndpoint}`).length).toBeGreaterThanOrEqual(2);
  expect(methods.every(x=>x.startsWith('GET '))).toBe(true);
 });
 test('PWH-041 Edit settings opens a populated form for the selected endpoint',async({page})=>{
  await openWebhooks(page);const current=card(page,'Fixture Active Webhook');
  await current.getByRole('button',{name:'Edit settings'}).click();
  await expect(current.getByLabel('Name')).toHaveValue(readyWebhook.name);
  await expect(current.getByLabel('HTTPS destination')).toHaveValue(readyWebhook.url);
  await expect(current.getByLabel('tenant.updated')).toBeChecked();
 });
});

/** Batch 76 · PWH-042..080 · append-only; all declarations GENERATED_UNRUN.
 * UI-contract assertions with synthetic transport. Confirmations are native dialogs;
 * do not treat intercepted responses as evidence of remote delivery or secret protection. */
const editCard=(p:Page,name:string)=>card(p,name).locator('.platform-webhooks__edit-panel');
const endpointPager=(p:Page)=>registry(p).locator('.platform-webhooks__pagination');
const deliveryPager=(p:Page)=>p.locator('.platform-webhooks__section').filter({hasText:'Safe operational metadata only; stored webhook payloads'}).locator('.platform-webhooks__pagination');
const sampleDeliveries=(count:number)=>Array.from({length:count},(_,i)=>({...successfulDelivery,
 id:`${String(i+1).padStart(8,'0')}-0000-4000-8000-${String(i+1).padStart(12,'0')}`,
 webhook_name:`Fixture Delivery ${String(i+1).padStart(3,'0')}`}));

test.describe('Platform Webhooks — settings, toggle, delivery and rotation (GENERATED_UNRUN)',()=>{
 test('PWH-042 Cancel edit discards unsaved changes',async({page})=>{
  const edits:any[]=[];await openWebhooks(page,{onCall:(m,p,q,b)=>{if(m==='PATCH')edits.push(b);}});
  const selected=card(page,readyWebhook.name);await selected.getByRole('button',{name:'Edit settings'}).click();
  await editCard(page,readyWebhook.name).getByLabel('Name').fill('Unsaved name');
  await editCard(page,readyWebhook.name).getByRole('button',{name:'Cancel edit'}).click();
  await expect(editCard(page,readyWebhook.name)).toHaveCount(0);
  await selected.getByRole('button',{name:'Edit settings'}).click();
  await expect(editCard(page,readyWebhook.name).getByLabel('Name')).toHaveValue(readyWebhook.name);
  expect(edits).toHaveLength(0);
 });
 test('PWH-043 Edit whitespace-only name is disabled',async({page})=>{
  await openWebhooks(page);await card(page,readyWebhook.name).getByRole('button',{name:'Edit settings'}).click();
  const panel=editCard(page,readyWebhook.name);await panel.getByLabel('Name').fill('  ');
  await expect(panel).toContainText('Name is required.');await expect(panel.getByRole('button',{name:'Save settings'})).toBeDisabled();
 });
 test('PWH-044 Edit HTTP destination fails HTTPS validation',async({page})=>{
  await openWebhooks(page);await card(page,readyWebhook.name).getByRole('button',{name:'Edit settings'}).click();
  const panel=editCard(page,readyWebhook.name);await panel.getByLabel('HTTPS destination').fill('http://example.org/hook');
  await expect(panel).toContainText('A valid HTTPS destination is required.');
  await expect(panel.getByRole('button',{name:'Save settings'})).toBeDisabled();
 });
 test('PWH-045 Edit requires at least one selected event type',async({page})=>{
  await openWebhooks(page);await card(page,readyWebhook.name).getByRole('button',{name:'Edit settings'}).click();
  const panel=editCard(page,readyWebhook.name);await panel.getByLabel('tenant.updated').uncheck();
  await expect(panel).toContainText('Select at least one event type.');
  await expect(panel.getByRole('button',{name:'Save settings'})).toBeDisabled();
 });
 test('PWH-046 Saving valid edit sends PATCH and updates summary',async({page})=>{
  const patches:any[]=[];await openWebhooks(page,{onCall:(m,p,q,b)=>{if(m==='PATCH'&&p===`${list}/${webhookIdA}`)patches.push(b);}});
  await card(page,readyWebhook.name).getByRole('button',{name:'Edit settings'}).click();
  await editCard(page,readyWebhook.name).getByLabel('Name').fill('  Updated Fixture  ');
  await editCard(page,readyWebhook.name).getByRole('button',{name:'Save settings'}).click();
  await expect(card(page,'Updated Fixture')).toBeVisible();
  await expect(root(page)).toContainText('Webhook Updated Fixture updated.');
  expect(patches[0]?.name).toBe('Updated Fixture');
 });
 test('PWH-047 Rejected PATCH retains edit panel and shows error',async({page})=>{
  await openWebhooks(page,{responses:{[`PATCH ${list}/${webhookIdA}`]:{status:409,json:{message:'Synthetic conflict from another update'}}}});
  await card(page,readyWebhook.name).getByRole('button',{name:'Edit settings'}).click();
  await editCard(page,readyWebhook.name).getByRole('button',{name:'Save settings'}).click();
  await expect(root(page)).toContainText('Webhook action failed.');
  await expect(editCard(page,readyWebhook.name).getByRole('button',{name:'Save settings'})).toBeVisible();
 });
 test('PWH-048 Starting edit on another record clears stale mutation error',async({page})=>{
  await openWebhooks(page,{responses:{[`PATCH ${list}/${webhookIdA}`]:{status:409,json:{message:'Synthetic edit rejected'}}}});
  await card(page,readyWebhook.name).getByRole('button',{name:'Edit settings'}).click();
  await editCard(page,readyWebhook.name).getByRole('button',{name:'Save settings'}).click();
  await expect(root(page)).toContainText('Webhook action failed.');
  await card(page,legacyWebhook.name).getByRole('button',{name:'Edit settings'}).click();
  await expect(root(page)).not.toContainText('Webhook action failed.');
  await expect(editCard(page,legacyWebhook.name)).toBeVisible();
 });
 test('PWH-049 Disabling an active endpoint asks for confirmation',async({page})=>{
  const patches:string[]=[];await openWebhooks(page,{onCall:(m,p)=>{if(m==='PATCH')patches.push(p);}});
  let promptType='',promptText='';page.once('dialog',async d=>{promptType=d.type();promptText=d.message();await d.dismiss();});
  await card(page,readyWebhook.name).getByRole('button',{name:'Disable'}).click();
  expect(promptType).toBe('confirm');expect(promptText).toContain('Disable this webhook?');expect(patches).toHaveLength(0);
 });
 test('PWH-050 Cancelled disable confirmation does not call PATCH',async({page})=>{
  const requests:string[]=[];await openWebhooks(page,{onCall:(m,p)=>{if(m==='PATCH')requests.push(p);}});
  page.once('dialog',d=>d.dismiss());await card(page,readyWebhook.name).getByRole('button',{name:'Disable'}).click();
  await expect(card(page,readyWebhook.name).getByRole('button',{name:'Disable'})).toBeVisible();
  expect(requests).toHaveLength(0);
 });
 test('PWH-051 Confirmed disable updates enabled badge and action',async({page})=>{
  const values:any[]=[];await openWebhooks(page,{onCall:(m,p,q,b)=>{if(m==='PATCH')values.push(b);}});
  page.once('dialog',d=>d.accept());await card(page,readyWebhook.name).getByRole('button',{name:'Disable'}).click();
  await expect(card(page,readyWebhook.name)).toContainText('Disabled');
  await expect(card(page,readyWebhook.name).getByRole('button',{name:'Enable'})).toBeVisible();
  expect(values[0]?.is_enabled).toBe(false);
 });
 test('PWH-052 Confirmed enable restores enabled badge',async({page})=>{
  const patches:any[]=[];await openWebhooks(page,{onCall:(m,p,q,b)=>{if(m==='PATCH')patches.push(b);}});
  page.once('dialog',d=>d.accept());await card(page,legacyWebhook.name).getByRole('button',{name:'Enable'}).click();
  await expect(card(page,legacyWebhook.name)).toContainText('Enabled');
  await expect(card(page,legacyWebhook.name).getByRole('button',{name:'Disable'})).toBeVisible();
  expect(patches[0]?.is_enabled).toBe(true);
 });
 test('PWH-053 Disabled webhook cannot dispatch test delivery',async({page})=>{
  const calls:string[]=[];await openWebhooks(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/test'))calls.push(p);}});
  await expect(card(page,legacyWebhook.name).getByRole('button',{name:'Send test'})).toBeDisabled();
  expect(calls).toHaveLength(0);
 });
 test('PWH-054 Legacy webhook without signing key cannot send test',async({page})=>{
  await openWebhooks(page,{endpoints:[{...legacyWebhook,is_enabled:true}]});
  await expect(card(page,legacyWebhook.name).getByRole('button',{name:'Send test'})).toBeDisabled();
  await expect(card(page,legacyWebhook.name)).toContainText('No · rotate');
 });
 test('PWH-055 Successful Send test reports application HTTP 2xx result',async({page})=>{
  const sent:string[]=[];await openWebhooks(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/test'))sent.push(p);}});
  await card(page,readyWebhook.name).getByRole('button',{name:'Send test'}).click();
  await expect(root(page)).toContainText('Test delivery received an HTTP 2xx response.');
  expect(sent).toEqual([`${list}/${webhookIdA}/test`]);
 });
 test('PWH-056 Non-2xx test result warns without claiming remote success',async({page})=>{
  await openWebhooks(page,{responses:{[`POST ${list}/${webhookIdA}/test`]:{status:200,json:{delivery:{...successfulDelivery,delivery_status:'failed',response_status:502},success:false}}}});
  await card(page,readyWebhook.name).getByRole('button',{name:'Send test'}).click();
  await expect(root(page)).toContainText('Test delivery did not receive an HTTP 2xx response.');
  await expect(root(page)).toContainText('does not prove the remote system processed');
 });
 test('PWH-057 Test delivery API rejection shows mutation warning',async({page})=>{
  await openWebhooks(page,{responses:{[`POST ${list}/${webhookIdA}/test`]:{status:503,json:{message:'Synthetic test destination unavailable'}}}});
  await card(page,readyWebhook.name).getByRole('button',{name:'Send test'}).click();
  await expect(root(page)).toContainText('Webhook action failed.');
  await expect(root(page)).not.toContainText('Test delivery received an HTTP 2xx response.');
 });
 test('PWH-058 Rotate signing secret requires confirmation dialog',async({page})=>{
  await openWebhooks(page);let prompt='';page.once('dialog',async d=>{prompt=d.message();await d.dismiss();});
  await card(page,readyWebhook.name).getByRole('button',{name:'Rotate secret'}).click();
  expect(prompt).toContain('previous secret stops verifying');
  await expect(root(page).locator('.platform-webhooks__secret-panel')).toHaveCount(0);
 });
 test('PWH-059 Cancelling rotation leaves secret untouched',async({page})=>{
  const sent:string[]=[];await openWebhooks(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/rotate-secret'))sent.push(p);}});
  page.once('dialog',d=>d.dismiss());await card(page,legacyWebhook.name).getByRole('button',{name:'Rotate secret'}).click();
  await expect(card(page,legacyWebhook.name)).toContainText('No · rotate');expect(sent).toHaveLength(0);
 });
 test('PWH-060 Confirmed rotation shows one-time signing secret and clears legacy warning',async({page})=>{
  await openWebhooks(page);page.once('dialog',d=>d.accept());
  await card(page,legacyWebhook.name).getByRole('button',{name:'Rotate secret'}).click();
  await expect(root(page).locator('.platform-webhooks__secret-panel')).toContainText('fixture-rotated-once-secret');
  await expect(card(page,legacyWebhook.name)).toContainText('Signing ready');
  await expect(card(page,legacyWebhook.name)).toContainText('rotatedx…');
 });
 test('PWH-061 Rotation API rejection does not show secret panel',async({page})=>{
  await openWebhooks(page,{responses:{[`POST ${list}/${webhookIdA}/rotate-secret`]:{status:403,json:{message:'Synthetic rotate denied'}}}});
  page.once('dialog',d=>d.accept());await card(page,readyWebhook.name).getByRole('button',{name:'Rotate secret'}).click();
  await expect(root(page)).toContainText('Webhook action failed.');
  await expect(root(page).locator('.platform-webhooks__secret-panel')).toHaveCount(0);
 });
 test('PWH-062 Mutation pending disables unrelated record action controls',async({page})=>{
  let release!:(value:{json:any})=>void;
  const pending=new Promise<{json:any}>(resolve=>{release=resolve;});
  await openWebhooks(page,{respond:(m,p)=>m==='PATCH'&&p===`${list}/${webhookIdA}`?pending:undefined});
  await card(page,readyWebhook.name).getByRole('button',{name:'Edit settings'}).click();
  await editCard(page,readyWebhook.name).getByRole('button',{name:'Save settings'}).click();
  await expect(card(page,legacyWebhook.name).getByRole('button',{name:'Rotate secret'})).toBeDisabled();
  await expect(card(page,legacyWebhook.name).getByRole('button',{name:'Enable'})).toBeDisabled();
  release({json:{webhook:readyWebhook}});
  await expect(card(page,legacyWebhook.name).getByRole('button',{name:'Enable'})).toBeEnabled();
 });
});

test.describe('Platform Webhooks — independent pagination, filters and safe evidence (GENERATED_UNRUN)',()=>{
 test('PWH-063 Endpoint registry fetches exactly 50 records per server page',async({page})=>{
  const limits:string[]=[];await openWebhooks(page,{endpoints:manyWebhooks(51),onCall:(m,p,q)=>{if(m==='GET'&&p===list)limits.push(q.get('limit')||'');}});
  await expect(cards(page)).toHaveCount(50);expect(limits).toContain('50');
 });
 test('PWH-064 Endpoint Next requests offset 50 and shows second-page records',async({page})=>{
  const offsets:string[]=[];await openWebhooks(page,{endpoints:manyWebhooks(51),onCall:(m,p,q)=>{if(m==='GET'&&p===list)offsets.push(q.get('offset')||'');}});
  await endpointPager(page).getByRole('button',{name:'Next'}).click();
  await expect(card(page,'Fixture Endpoint 051')).toBeVisible();
  expect(offsets).toContain('50');
 });
 test('PWH-065 Endpoint Previous restores offset zero',async({page})=>{
  await openWebhooks(page,{endpoints:manyWebhooks(51)});
  await endpointPager(page).getByRole('button',{name:'Next'}).click();
  await expect(card(page,'Fixture Endpoint 051')).toBeVisible();
  await endpointPager(page).getByRole('button',{name:'Previous'}).click();
  await expect(card(page,'Fixture Endpoint 001')).toBeVisible();
  await expect(endpointPager(page)).toContainText('Page 1');
 });
 test('PWH-066 Endpoint Next is disabled on last page',async({page})=>{
  await openWebhooks(page,{endpoints:manyWebhooks(51)});
  await endpointPager(page).getByRole('button',{name:'Next'}).click();
  await expect(card(page,'Fixture Endpoint 051')).toBeVisible();
  await expect(endpointPager(page).getByRole('button',{name:'Next'})).toBeDisabled();
 });
 test('PWH-067 Delivery registry fetches exactly 50 records per server page',async({page})=>{
  const limits:string[]=[];await openWebhooks(page,{deliveries:sampleDeliveries(51),onCall:(m,p,q)=>{if(m==='GET'&&p===deliveriesEndpoint)limits.push(q.get('limit')||'');}});
  await expect(deliveries(page).locator('.platform-webhooks__delivery')).toHaveCount(50);
  expect(limits).toContain('50');
 });
 test('PWH-068 Delivery Next requests offset 50',async({page})=>{
  const offsets:string[]=[];await openWebhooks(page,{deliveries:sampleDeliveries(51),onCall:(m,p,q)=>{if(m==='GET'&&p===deliveriesEndpoint)offsets.push(q.get('offset')||'');}});
  await deliveryPager(page).getByRole('button',{name:'Next'}).click();
  await expect(deliveries(page)).toContainText('Fixture Delivery 051');expect(offsets).toContain('50');
 });
 test('PWH-069 Delivery Previous returns to offset zero',async({page})=>{
  await openWebhooks(page,{deliveries:sampleDeliveries(51)});
  await deliveryPager(page).getByRole('button',{name:'Next'}).click();
  await expect(deliveries(page)).toContainText('Fixture Delivery 051');
  await deliveryPager(page).getByRole('button',{name:'Previous'}).click();
  await expect(deliveries(page)).toContainText('Fixture Delivery 001');
  await expect(deliveryPager(page)).toContainText('Page 1');
 });
 test('PWH-070 Delivery Next is disabled at server end',async({page})=>{
  await openWebhooks(page,{deliveries:sampleDeliveries(51)});
  await deliveryPager(page).getByRole('button',{name:'Next'}).click();
  await expect(deliveries(page)).toContainText('Fixture Delivery 051');
  await expect(deliveryPager(page).getByRole('button',{name:'Next'})).toBeDisabled();
 });
 test('PWH-071 Delivery tenant filter resets delivery page offset',async({page})=>{
  const offsets:string[]=[];await openWebhooks(page,{deliveries:sampleDeliveries(51),onCall:(m,p,q)=>{if(m==='GET'&&p===deliveriesEndpoint)offsets.push(q.get('offset')||'');}});
  await deliveryPager(page).getByRole('button',{name:'Next'}).click();await expect(deliveryPager(page)).toContainText('Page 2');
  await root(page).locator('.platform-webhooks__section').filter({hasText:'Safe operational metadata only; stored webhook payloads'}).getByLabel('Tenant').selectOption(webhookTenantA);
  await expect(deliveryPager(page)).toContainText('Page 1');await expect.poll(()=>offsets.at(-1)).toBe('0');
 });
 test('PWH-072 Endpoint tenant filter resets endpoint page offset',async({page})=>{
  const offsets:string[]=[];await openWebhooks(page,{endpoints:manyWebhooks(51),onCall:(m,p,q)=>{if(m==='GET'&&p===list)offsets.push(q.get('offset')||'');}});
  await endpointPager(page).getByRole('button',{name:'Next'}).click();await expect(endpointPager(page)).toContainText('Page 2');
  await registry(page).getByLabel('Tenant').selectOption(webhookTenantA);
  await expect(endpointPager(page)).toContainText('Page 1');await expect.poll(()=>offsets.at(-1)).toBe('0');
 });
 test('PWH-073 URL search exactly 200 characters is accepted',async({page})=>{
  const searches:string[]=[];const term='A'.repeat(200);await openWebhooks(page,{query:`search=${term}`,onCall:(m,p,q)=>{if(m==='GET'&&p===list)searches.push(q.get('search')||'');}});
  await expect(root(page)).not.toContainText('Invalid or unauthorized URL filter');expect(searches).toContain(term);
 });
 test('PWH-074 Tenant UUID URL filter without TENANTS_READ fails closed',async({page})=>{
  let evidenceReads=0;await openWebhooks(page,{permissions:without('platform.tenants.read'),query:`tenant_id=${webhookTenantA}`,
   onCall:(m,p)=>{if(m==='GET'&&(p===list||p===deliveriesEndpoint))evidenceReads++;}});
  await expect(root(page)).toContainText('Invalid or unauthorized URL filter');expect(evidenceReads).toBe(0);
 });
 test('PWH-075 Blocked delivery status renders danger tone',async({page})=>{
  await openWebhooks(page,{deliveries:[{...successfulDelivery,delivery_status:'blocked'}]});
  await expect(deliveries(page).locator('[data-tone="danger"]')).toContainText('blocked');
 });
 test('PWH-076 Missing HTTP response status shows Not recorded',async({page})=>{
  await openWebhooks(page,{deliveries:[{...successfulDelivery,response_status:null}]});
  await expect(deliveries(page)).toContainText('HTTP response');
  await expect(deliveries(page)).toContainText('Not recorded');
 });
 test('PWH-077 Missing retry timestamp shows Not scheduled',async({page})=>{
  await openWebhooks(page,{deliveries:[{...successfulDelivery,next_retry_at:null}]});
  await expect(deliveries(page)).toContainText('Next retry');
  await expect(deliveries(page)).toContainText('Not scheduled');
 });
 test('PWH-078 Action links are gated by audit and dependency permissions',async({page})=>{
  await openWebhooks(page,{permissions:without('platform.audit.read').filter(p=>p!=='platform.dependencies.read')});
  const current=card(page,readyWebhook.name);
  await expect(current.getByRole('link',{name:'Audit evidence'})).toHaveCount(0);
  await expect(current.getByRole('link',{name:'Integration monitoring'})).toHaveCount(0);
  await expect(current.getByRole('link',{name:'Tenant source'})).toBeVisible();
 });
 test('PWH-079 Source link targets carry selected webhook and tenant identifiers',async({page})=>{
  await openWebhooks(page);const current=card(page,readyWebhook.name);
  await expect(current.getByRole('link',{name:'Audit evidence'})).toHaveAttribute('href',new RegExp(`target_id=${webhookIdA}`));
  await expect(current.getByRole('link',{name:'Tenant source'})).toHaveAttribute('href',new RegExp(`tenant_id=${webhookTenantA}`));
 });
 test('PWH-080 Webhook and delivery cards omit stored payload and response body',async({page})=>{
  const forbiddenPayload='HIDDEN_PAYLOAD_FIXTURE_ONLY',forbiddenBody='HIDDEN_REMOTE_BODY_FIXTURE_ONLY';
  await openWebhooks(page,{endpoints:[{...readyWebhook,payload:forbiddenPayload,secret:forbiddenPayload}],
   deliveries:[{...successfulDelivery,payload:forbiddenPayload,response_body:forbiddenBody}]});
  await expect(card(page,readyWebhook.name)).not.toContainText(forbiddenPayload);
  await expect(deliveries(page)).not.toContainText(forbiddenPayload);
  await expect(deliveries(page)).not.toContainText(forbiddenBody);
 });
});
