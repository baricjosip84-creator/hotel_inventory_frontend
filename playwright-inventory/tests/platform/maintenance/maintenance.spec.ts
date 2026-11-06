/** BATCH_090_GENERATED_UNRUN — Platform Maintenance source-traced UI and request contracts.
 * Synthetic HTTP only. Not a proof of live write locks, notifications, external downtime,
 * database concurrency, tenant isolation or customer acceptance. */
import {test,expect,type Page} from '@playwright/test';
import {openPlatformMaintenance,maintenanceRoot,maintenancePermissions,maintenanceTenantA,
 scheduledWindow,activeWindow,completedWindow,cancelledWindow,manyMaintenanceWindows} from '../../../support/platformMaintenanceFixture';
const root=(p:Page)=>p.locator('.platform-maintenance');
const section=(p:Page,name:string)=>root(p).locator('section.platform-maintenance__section').filter({has:p.getByRole('heading',{name,exact:true})});
const filters=(p:Page)=>section(p,'Filters').locator('.platform-maintenance__filters');
const create=(p:Page)=>section(p,'Create maintenance window');
const registry=(p:Page)=>section(p,'Maintenance registry');
const cards=(p:Page)=>registry(p).locator('article.platform-maintenance__card');
const card=(p:Page,title:string)=>cards(p).filter({has:p.getByRole('heading',{name:title,exact:true})});
const pager=(p:Page)=>registry(p).locator('.platform-maintenance__pagination');
const edit=(p:Page,title=scheduledWindow.title)=>card(p,title).locator('.platform-maintenance__edit-panel');
const lifecycle=(p:Page,title=scheduledWindow.title)=>card(p,title).locator('.platform-maintenance__lifecycle-box');
const omit=(...permissions:string[])=>maintenancePermissions.filter(x=>!permissions.includes(x));

 test.describe('Platform Maintenance — scheduling, lifecycle and evidence (BATCH_090_GENERATED_UNRUN)',()=>{
 test('PMNT-001 Truth boundary says application window is not proof of external work',async({page})=>{
  await openPlatformMaintenance(page);await expect(section(page,'Evidence and truth boundary')).toContainText('does not prove infrastructure work occurred');
  await expect(section(page,'Evidence and truth boundary')).toContainText('customer received or accepted the notice');
 });
 test('PMNT-002 Missing maintenance read grant denies protected page and registry GET',async({page})=>{
  let hits=0;await openPlatformMaintenance(page,{permissions:omit('platform.maintenance.read'),expectHeading:false,
   onCall:(m,p)=>{if(m==='GET'&&p===maintenanceRoot)hits++;}});
  await expect(root(page)).toHaveCount(0);expect(hits).toBe(0);
 });
 test('PMNT-003 Read only operator sees registry without create or lifecycle controls',async({page})=>{
  await openPlatformMaintenance(page,{permissions:omit('platform.maintenance.write')});
  await expect(card(page,scheduledWindow.title)).toBeVisible();await expect(create(page)).toHaveCount(0);
  await expect(lifecycle(page)).toHaveCount(0);
 });
 test('PMNT-004 Tenant directory requires TENANTS_READ and suppresses tenant-target option',async({page})=>{
  let calls=0;await openPlatformMaintenance(page,{permissions:omit('platform.tenants.read'),
   onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenants')calls++;}});
  await expect(filters(page).getByLabel('Tenant')).toHaveCount(0);
  await expect(create(page).getByLabel('Scope').locator('option[value="tenant"]')).toHaveCount(0);
  expect(calls).toBe(0);
 });
 test('PMNT-005 Operator identity is shown as restricted without USERS_READ',async({page})=>{
  await openPlatformMaintenance(page,{permissions:omit('platform.users.read')});
  await expect(root(page)).toContainText('Some identity evidence is restricted.');
  await expect(card(page,scheduledWindow.title)).toContainText('Restricted');
  await expect(card(page,scheduledWindow.title)).not.toContainText('maintainer@fixture.test');
 });
 test('PMNT-006 Tenant name is redacted on tenant-specific card without TENANTS_READ',async({page})=>{
  await openPlatformMaintenance(page,{permissions:omit('platform.tenants.read')});
  await expect(card(page,activeWindow.title)).toContainText('Tenant-specific · Restricted identity');
  await expect(card(page,activeWindow.title)).not.toContainText('Maintenance Tenant Alpha');
 });
 test('PMNT-007 KPIs separately show active, scheduled, lock and terminal counts',async({page})=>{
  await openPlatformMaintenance(page,{query:'include_past=true'});
  const stats=root(page).getByLabel('Maintenance registry summary');
  for(const name of ['Matched windows','Active','Scheduled','Write locks','Completed','Cancelled'])await expect(stats).toContainText(name);
 });
 test('PMNT-008 First request sends fifty rows, zero offset and omits past windows',async({page})=>{
  const qs:string[]=[];await openPlatformMaintenance(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===maintenanceRoot)qs.push(q.toString());}});
  await expect.poll(()=>qs.length).toBeGreaterThan(0);const q=new URLSearchParams(qs.at(-1));
  expect(q.get('limit')).toBe('50');expect(q.get('offset')).toBe('0');expect(q.get('include_past')).toBe('false');
 });
 test('PMNT-009 URL status and scope restore filter controls',async({page})=>{
  await openPlatformMaintenance(page,{query:'status=active&scope=tenant'});
  await expect(filters(page).getByLabel('Status')).toHaveValue('active');await expect(filters(page).getByLabel('Scope')).toHaveValue('tenant');
  await expect(card(page,activeWindow.title)).toBeVisible();
 });
 test('PMNT-010 Search query matches maintenance title and updates URL',async({page})=>{
  await openPlatformMaintenance(page);await filters(page).getByLabel('Search').fill('planned API');
  await expect(cards(page)).toHaveCount(1);expect(new URL(page.url()).searchParams.get('search')).toBe('planned API');
 });
 test('PMNT-011 Selecting completed status automatically includes terminal history',async({page})=>{
  await openPlatformMaintenance(page);await filters(page).getByLabel('Status').selectOption('completed');
  await expect(filters(page).getByLabel('Include completed/cancelled history')).toBeChecked();
  await expect(card(page,completedWindow.title)).toBeVisible();
 });
 test('PMNT-012 Selecting cancelled status automatically reveals cancelled evidence',async({page})=>{
  await openPlatformMaintenance(page);await filters(page).getByLabel('Status').selectOption('cancelled');
  await expect(card(page,cancelledWindow.title)).toContainText('Cancellation evidence');
 });
 test('PMNT-013 Include-history checkbox toggles completed and cancelled cards',async({page})=>{
  await openPlatformMaintenance(page);await expect(card(page,completedWindow.title)).toHaveCount(0);
  await filters(page).getByLabel('Include completed/cancelled history').check();
  await expect(card(page,completedWindow.title)).toBeVisible();await expect(card(page,cancelledWindow.title)).toBeVisible();
 });
 test('PMNT-014 Scope filter only returns tenant-specific windows',async({page})=>{
  await openPlatformMaintenance(page);await filters(page).getByLabel('Scope').selectOption('tenant');
  await expect(cards(page)).toHaveCount(1);await expect(card(page,activeWindow.title)).toBeVisible();
 });
 test('PMNT-015 Tenant selection forwards authorized tenant ID to server',async({page})=>{
  const qs:string[]=[];await openPlatformMaintenance(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===maintenanceRoot)qs.push(q.toString());}});
  await filters(page).getByLabel('Tenant').selectOption(maintenanceTenantA);
  await expect(cards(page)).toHaveCount(1);expect(new URLSearchParams(qs.at(-1)).get('tenant_id')).toBe(maintenanceTenantA);
 });
 test('PMNT-016 Unauthorized URL tenant target is excluded from API request',async({page})=>{
  const qs:string[]=[];await openPlatformMaintenance(page,{query:`tenant_id=${maintenanceTenantA}`,permissions:omit('platform.tenants.read'),
   onCall:(m,p,q)=>{if(m==='GET'&&p===maintenanceRoot)qs.push(q.toString());}});
  await expect(root(page)).toContainText('Invalid or unauthorized URL filter');
  expect(new URLSearchParams(qs.at(-1)).get('tenant_id')).toBeNull();
 });
 test('PMNT-017 Invalid tenant UUID is refused before list GET',async({page})=>{
  const qs:string[]=[];await openPlatformMaintenance(page,{query:'tenant_id=not-a-uuid',onCall:(m,p,q)=>{if(m==='GET'&&p===maintenanceRoot)qs.push(q.toString());}});
  await expect(root(page)).toContainText('Invalid or unauthorized URL filter');
  expect(new URLSearchParams(qs.at(-1)).get('tenant_id')).toBeNull();
 });
 test('PMNT-018 Registry caps first page at fifty while KPI sees full count',async({page})=>{
  await openPlatformMaintenance(page,{records:manyMaintenanceWindows(59)});
  await expect(cards(page)).toHaveCount(50);await expect(pager(page)).toContainText('59');
 });
 test('PMNT-019 Next page sends offset fifty and yields remaining nine rows',async({page})=>{
  const qs:string[]=[];await openPlatformMaintenance(page,{records:manyMaintenanceWindows(59),onCall:(m,p,q)=>{if(m==='GET'&&p===maintenanceRoot)qs.push(q.toString());}});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect(cards(page)).toHaveCount(9);
  expect(new URLSearchParams(qs.at(-1)).get('offset')).toBe('50');
 });
 test('PMNT-020 Previous page restores the first fifty windows',async({page})=>{
  await openPlatformMaintenance(page,{records:manyMaintenanceWindows(59)});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect(cards(page)).toHaveCount(9);
  await pager(page).getByRole('button',{name:'Previous'}).click();await expect(cards(page)).toHaveCount(50);
 });
 test('PMNT-021 Changing a filter removes a prior paging offset',async({page})=>{
  await openPlatformMaintenance(page,{query:'offset=50',records:manyMaintenanceWindows(59)});
  await filters(page).getByLabel('Scope').selectOption('platform');
  expect(new URL(page.url()).searchParams.get('offset')).toBeNull();
 });
 test('PMNT-022 Empty set explains absence from app registry, not external infrastructure',async({page})=>{
  await openPlatformMaintenance(page);await filters(page).getByLabel('Search').fill('no-matching-synthetic-window');
  await expect(registry(page)).toContainText('No application maintenance evidence matched.');
 });
 test('PMNT-023 Active lock card labels application guard rather than external outage',async({page})=>{
  await openPlatformMaintenance(page);await expect(card(page,activeWindow.title)).toContainText('Write lock');
  await expect(card(page,activeWindow.title)).toContainText('Enforcing now');
 });
 test('PMNT-024 Scheduled write lock says future rather than active enforcement',async({page})=>{
  await openPlatformMaintenance(page,{records:[{...scheduledWindow,lock_writes:true}]});
  await expect(card(page,scheduledWindow.title)).toContainText('Will enforce when active');
 });
 test('PMNT-025 Completed window labels external proof absent and disables changes',async({page})=>{
  await openPlatformMaintenance(page,{query:'include_past=true'});
  await expect(card(page,completedWindow.title)).toContainText('does not prove external maintenance');
  await expect(lifecycle(page,completedWindow.title)).toHaveCount(0);
 });
 test('PMNT-026 Cancelled record shows internal reason and actor evidence',async({page})=>{
  await openPlatformMaintenance(page,{query:'include_past=true'});
  await expect(card(page,cancelledWindow.title)).toContainText('Synthetic maintenance cancellation');
  await expect(card(page,cancelledWindow.title)).toContainText('maintainer@fixture.test');
 });
 test('PMNT-027 Create button is disabled without title',async({page})=>{
  await openPlatformMaintenance(page);await expect(create(page).getByRole('button',{name:'Create window'})).toBeDisabled();
  await create(page).getByLabel('Title').fill('   ');
  await expect(create(page)).toContainText('Enter a maintenance title.');
 });
 test('PMNT-028 Create tenant scope requires an explicit tenant selection',async({page})=>{
  await openPlatformMaintenance(page);await create(page).getByLabel('Title').fill('Scoped maintenance');
  await create(page).getByLabel('Scope').selectOption('tenant');
  await expect(create(page)).toContainText('Select a tenant for tenant-specific maintenance.');
  await expect(create(page).getByRole('button',{name:'Create window'})).toBeDisabled();
 });
 test('PMNT-029 Archived tenant is excluded from tenant create selection',async({page})=>{
  await openPlatformMaintenance(page);await create(page).getByLabel('Scope').selectOption('tenant');
  await expect(create(page).getByLabel('Tenant').locator(`option[value="${maintenanceTenantA}"]`)).toHaveCount(1);
  await expect(create(page).getByLabel('Tenant').locator('option').filter({hasText:'Maintenance Tenant Beta'})).toHaveCount(0);
 });
 test('PMNT-030 Tenant-to-platform scope switching clears selected tenant',async({page})=>{
  await openPlatformMaintenance(page);await create(page).getByLabel('Scope').selectOption('tenant');
  await create(page).getByLabel('Tenant').selectOption(maintenanceTenantA);
  await create(page).getByLabel('Scope').selectOption('platform');await create(page).getByLabel('Scope').selectOption('tenant');
  await expect(create(page).getByLabel('Tenant')).toHaveValue('');
 });
 test('PMNT-031 End time must come after start time in create form',async({page})=>{
  await openPlatformMaintenance(page);await create(page).getByLabel('Title').fill('Window order');
  await create(page).getByLabel('Starts at').fill('2030-06-02T14:00');
  await create(page).getByLabel('Ends at').fill('2030-06-02T12:00');
  await expect(create(page)).toContainText('End time must be after start time.');
 });
 test('PMNT-032 Create validates that end time has not already elapsed',async({page})=>{
  await openPlatformMaintenance(page);await create(page).getByLabel('Title').fill('Expired plan');
  await create(page).getByLabel('Starts at').fill('2025-02-01T09:00');
  await create(page).getByLabel('Ends at').fill('2025-02-01T10:00');
  await expect(create(page)).toContainText('End time must still be in the future.');
 });
 test('PMNT-033 Platform create payload trims title and message, uses null tenant ID',async({page})=>{
  let sent:any;await openPlatformMaintenance(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===maintenanceRoot)sent=b;}});
  await create(page).getByLabel('Title').fill('  Synthetic safe maintenance  ');
  await create(page).getByLabel('Tenant-visible message').fill('  Planned notice  ');
  await create(page).getByRole('button',{name:'Create window'}).click();await expect.poll(()=>Boolean(sent)).toBe(true);
  expect(sent).toMatchObject({title:'Synthetic safe maintenance',message:'Planned notice',scope:'platform',tenant_id:null,lock_writes:false});
  expect(new Date(sent.ends_at).getTime()).toBeGreaterThan(new Date(sent.starts_at).getTime());
 });
 test('PMNT-034 Tenant create sends tenant id and explicit write-lock option',async({page})=>{
  let sent:any;await openPlatformMaintenance(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===maintenanceRoot)sent=b;}});
  await create(page).getByLabel('Title').fill('Tenant write guard fixture');
  await create(page).getByLabel('Scope').selectOption('tenant');await create(page).getByLabel('Tenant').selectOption(maintenanceTenantA);
  await create(page).getByLabel('Lock application writes while active').check();
  await create(page).getByRole('button',{name:'Create window'}).click();await expect.poll(()=>Boolean(sent)).toBe(true);
  expect(sent).toMatchObject({scope:'tenant',tenant_id:maintenanceTenantA,lock_writes:true});
 });
 test('PMNT-035 Successful create clears form and reports application record creation',async({page})=>{
  await openPlatformMaintenance(page);await create(page).getByLabel('Title').fill('New synthetic window');
  await create(page).getByRole('button',{name:'Create window'}).click();
  await expect(create(page).getByLabel('Title')).toHaveValue('');
  await expect(root(page)).toContainText('Maintenance window created: New synthetic window.');
 });
 test('PMNT-036 Create failure preserves title and reports error',async({page})=>{
  await openPlatformMaintenance(page,{overrides:{'POST /platform/maintenance':{status:503,json:{message:'Synthetic maintenance create failure'}}}});
  await create(page).getByLabel('Title').fill('Preserve draft');
  await create(page).getByRole('button',{name:'Create window'}).click();
  await expect(create(page)).toContainText('Synthetic maintenance create failure');
  await expect(create(page).getByLabel('Title')).toHaveValue('Preserve draft');
 });
 test('PMNT-037 Scheduled editor exposes rescheduling but excludes scope and tenant',async({page})=>{
  await openPlatformMaintenance(page);await lifecycle(page).getByRole('button',{name:'Edit details'}).click();
  await expect(edit(page).getByLabel('Starts at')).toBeEnabled();await expect(edit(page).getByLabel('Scope')).toHaveCount(0);
  await expect(edit(page).getByLabel('Tenant')).toHaveCount(0);
 });
 test('PMNT-038 Active editor keeps original start time immutable',async({page})=>{
  await openPlatformMaintenance(page);await lifecycle(page,activeWindow.title).getByRole('button',{name:'Edit details'}).click();
  await expect(edit(page,activeWindow.title).getByLabel('Starts at')).toBeDisabled();
  await expect(edit(page,activeWindow.title)).toContainText('Active-window start history is immutable.');
 });
 test('PMNT-039 Scheduled edit submits trimmed details without lifecycle status',async({page})=>{
  let sent:any;await openPlatformMaintenance(page,{onCall:(m,p,q,b)=>{if(m==='PATCH'&&p.endsWith(scheduledWindow.id))sent=b;}});
  await lifecycle(page).getByRole('button',{name:'Edit details'}).click();
  await edit(page).getByLabel('Title').fill('  Revised maintenance fixture  ');
  await edit(page).getByRole('button',{name:'Save details'}).click();await expect.poll(()=>Boolean(sent)).toBe(true);
  expect(sent.title).toBe('Revised maintenance fixture');expect(sent).toHaveProperty('starts_at');
  expect(sent).not.toHaveProperty('status');expect(sent).not.toHaveProperty('scope');expect(sent).not.toHaveProperty('tenant_id');
 });
 test('PMNT-040 Active edit PATCH never rewrites historic start time',async({page})=>{
  let sent:any;await openPlatformMaintenance(page,{onCall:(m,p,q,b)=>{if(m==='PATCH'&&p.endsWith(activeWindow.id))sent=b;}});
  await lifecycle(page,activeWindow.title).getByRole('button',{name:'Edit details'}).click();
  await edit(page,activeWindow.title).getByLabel('Title').fill('Updated active window');
  await edit(page,activeWindow.title).getByRole('button',{name:'Save details'}).click();await expect.poll(()=>Boolean(sent)).toBe(true);
  expect(sent).not.toHaveProperty('starts_at');expect(sent.title).toBe('Updated active window');
 });
 test('PMNT-041 Closing edit without save produces no write',async({page})=>{
  let writes=0;await openPlatformMaintenance(page,{onCall:(m,p)=>{if(m==='PATCH')writes++;}});
  await lifecycle(page).getByRole('button',{name:'Edit details'}).click();
  await edit(page).getByLabel('Title').fill('Unsaved maintenance change');
  await edit(page).getByRole('button',{name:'Close editor'}).click();
  await expect(edit(page)).toHaveCount(0);expect(writes).toBe(0);
 });
 });

// Batch 91 continuation: observed UI/request contracts only. No tests were run.
test.describe('Platform Maintenance — completion, failures and evidence boundary (BATCH_091_GENERATED_UNRUN)',()=>{
 test('PMNT-042 Accepted scheduled edit closes editor, refreshes registry and confirms record-only update',async({page})=>{
  await openPlatformMaintenance(page);await lifecycle(page).getByRole('button',{name:'Edit details'}).click();
  await edit(page).getByLabel('Title').fill('Updated window');await edit(page).getByRole('button',{name:'Save details'}).click();
  await expect(edit(page)).toHaveCount(0);await expect(root(page)).toContainText('Maintenance window details updated.');
  await expect(card(page,'Updated window')).toBeVisible();
 });
 test('PMNT-043 Failed edit retains unsaved draft and existing row with error message',async({page})=>{
  await openPlatformMaintenance(page,{overrides:{[`PATCH ${maintenanceRoot}/${scheduledWindow.id}`]:{status:409,json:{message:'Synthetic edit conflict'}}}});
  await lifecycle(page).getByRole('button',{name:'Edit details'}).click();await edit(page).getByLabel('Title').fill('Pending unsaved edit');
  await edit(page).getByRole('button',{name:'Save details'}).click();
  await expect(edit(page)).toContainText('Edit failed:');await expect(edit(page).getByLabel('Title')).toHaveValue('Pending unsaved edit');
  await expect(card(page,scheduledWindow.title)).toBeVisible();
 });
 test('PMNT-044 Active completion requires an explicit confirmation before POST',async({page})=>{
  let writes=0;await openPlatformMaintenance(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/complete'))writes++;}});
  page.once('dialog',async d=>{expect(d.type()).toBe('confirm');expect(d.message()).toContain(activeWindow.title);await d.dismiss();});
  await lifecycle(page,activeWindow.title).getByRole('button',{name:'Complete now'}).click();expect(writes).toBe(0);
 });
 test('PMNT-045 Accepted completion sends optional trimmed note on dedicated complete endpoint',async({page})=>{
  let body:any;await openPlatformMaintenance(page,{query:'status=active',onCall:(m,p,_q,b)=>{if(m==='POST'&&p.endsWith('/complete'))body=b;}});
  await lifecycle(page,activeWindow.title).getByLabel('Completion note').fill('  Completed synthetic change  ');
  page.once('dialog',d=>d.accept());await lifecycle(page,activeWindow.title).getByRole('button',{name:'Complete now'}).click();
  await expect.poll(()=>body?.note).toBe('Completed synthetic change');
  await expect(root(page)).toContainText('Active maintenance marked completed.');
 });
 test('PMNT-046 Dismissed completion confirmation does not mutate maintenance records',async({page})=>{
  let completes=0;await openPlatformMaintenance(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/complete'))completes++;}});
  page.once('dialog',d=>d.dismiss());await lifecycle(page,activeWindow.title).getByRole('button',{name:'Complete now'}).click();
  await expect(lifecycle(page,activeWindow.title).getByRole('button',{name:'Complete now'})).toBeVisible();expect(completes).toBe(0);
 });
 test('PMNT-047 Completed record removes edit, cancel and complete lifecycle actions',async({page})=>{
  await openPlatformMaintenance(page,{query:'include_past=true'});
  await expect(lifecycle(page,completedWindow.title)).toHaveCount(0);
  await expect(card(page,completedWindow.title)).toContainText('Completion evidence');
 });
 test('PMNT-048 Scheduled window never exposes active-only Complete now action',async({page})=>{
  await openPlatformMaintenance(page);await expect(lifecycle(page).getByRole('button',{name:'Complete now'})).toHaveCount(0);
 });
 test('PMNT-049 Cancel action requires nonblank reason and window confirmation',async({page})=>{
  await openPlatformMaintenance(page);const box=lifecycle(page).locator('.platform-maintenance__cancel-box');
  await expect(box.getByRole('button',{name:'Cancel window'})).toBeDisabled();await box.getByLabel('Cancellation reason').fill('  ');
  await expect(box.getByRole('button',{name:'Cancel window'})).toBeDisabled();await box.getByLabel('Cancellation reason').fill('Operator request');
  page.once('dialog',async d=>{expect(d.message()).toContain(scheduledWindow.title);await d.dismiss();});
  await box.getByRole('button',{name:'Cancel window'}).click();await expect(card(page,scheduledWindow.title)).toBeVisible();
 });
 test('PMNT-050 Accepted cancellation POST trims reason and hides subsequent lifecycle controls',async({page})=>{
  let received:any;await openPlatformMaintenance(page,{query:'include_past=true',onCall:(m,p,_q,b)=>{if(m==='POST'&&p.endsWith('/cancel'))received=b;}});
  await lifecycle(page).getByLabel('Cancellation reason').fill('  Synthetic safe cancellation  ');
  page.once('dialog',d=>d.accept());await lifecycle(page).getByRole('button',{name:'Cancel window'}).click();
  await expect.poll(()=>received?.reason).toBe('Synthetic safe cancellation');
  await expect(lifecycle(page)).toHaveCount(0);await expect(card(page,scheduledWindow.title)).toContainText('Cancellation evidence');
 });
 test('PMNT-051 Rejected cancellation confirmation makes no write request',async({page})=>{
  let writes=0;await openPlatformMaintenance(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/cancel'))writes++;}});
  await lifecycle(page).getByLabel('Cancellation reason').fill('Synthetic reason');
  page.once('dialog',d=>d.dismiss());await lifecycle(page).getByRole('button',{name:'Cancel window'}).click();
  expect(writes).toBe(0);await expect(lifecycle(page).getByLabel('Cancellation reason')).toHaveValue('Synthetic reason');
 });
 test('PMNT-052 Failed cancellation does not produce a false completed or cancelled notice',async({page})=>{
  await openPlatformMaintenance(page,{overrides:{[`POST ${maintenanceRoot}/${scheduledWindow.id}/cancel`]:{status:503,json:{message:'Fixture cancellation unavailable'}}}});
  await lifecycle(page).getByLabel('Cancellation reason').fill('Synthetic reason');
  page.once('dialog',d=>d.accept());await lifecycle(page).getByRole('button',{name:'Cancel window'}).click();
  await expect(lifecycle(page)).toContainText('Cancellation failed:');await expect(card(page,scheduledWindow.title)).toBeVisible();
 });
 test('PMNT-053 Failed completion leaves current maintenance window active',async({page})=>{
  await openPlatformMaintenance(page,{overrides:{[`POST ${maintenanceRoot}/${activeWindow.id}/complete`]:{status:409,json:{message:'Fixture state conflict'}}}});
  page.once('dialog',d=>d.accept());await lifecycle(page,activeWindow.title).getByRole('button',{name:'Complete now'}).click();
  await expect(lifecycle(page,activeWindow.title)).toContainText('Completion failed:');
  await expect(card(page,activeWindow.title)).toContainText('Enforcing now');
 });
 test('PMNT-054 Initial registry transport error offers independent retry',async({page})=>{
  await openPlatformMaintenance(page,{overrides:{[`GET ${maintenanceRoot}`]:{status:503,json:{message:'Fixture registry offline'}}}});
  await expect(registry(page)).toContainText('Maintenance registry could not be loaded.');
  await expect(registry(page).getByRole('button',{name:'Retry'})).toBeVisible();
 });
 test('PMNT-055 Registry retry restores list after one transient error',async({page})=>{
  let unavailable=true;await openPlatformMaintenance(page,{respond:(m,p)=>{if(m==='GET'&&p===maintenanceRoot&&unavailable)return {status:503,json:{message:'Transient registry outage'}};}});
  await expect(registry(page)).toContainText('Maintenance registry could not be loaded.');
  unavailable=false;await registry(page).getByRole('button',{name:'Retry'}).click();await expect(card(page,scheduledWindow.title)).toBeVisible();
 });
 test('PMNT-056 Refresh failure displays stale snapshot while preserving last valid windows',async({page})=>{
  let fail=false;await openPlatformMaintenance(page,{respond:(m,p)=>{if(m==='GET'&&p===maintenanceRoot&&fail)return {status:503,json:{message:'Registry stale'}};}});
  await expect(card(page,scheduledWindow.title)).toBeVisible();fail=true;
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(root(page)).toContainText('Showing the last successful maintenance snapshot.');
  await expect(card(page,scheduledWindow.title)).toBeVisible();
 });
 test('PMNT-057 Tenant directory failure does not block platform-wide records',async({page})=>{
  await openPlatformMaintenance(page,{overrides:{'GET /platform/tenants':{status:503,json:{message:'Tenant directory unavailable'}}}});
  await expect(card(page,scheduledWindow.title)).toBeVisible();await expect(root(page)).toContainText('Tenant directory');
 });
 test('PMNT-058 Retry tenant directory restores allowed tenant choices after outage',async({page})=>{
  let unavailable=true;await openPlatformMaintenance(page,{respond:(m,p)=>{if(m==='GET'&&p==='/platform/tenants'&&unavailable)return {status:503,json:{message:'Transient directory error'}};}});
  await expect(root(page)).toContainText('Tenant directory unavailable.');
  unavailable=false;await root(page).getByRole('button',{name:'Retry tenant directory'}).click();
  await expect(filters(page).getByLabel('Tenant').locator(`option[value="${maintenanceTenantA}"]`)).toHaveCount(1);
 });
 test('PMNT-059 Refresh independently re-fetches registry and tenant directory',async({page})=>{
  const hit={registry:0,tenants:0};await openPlatformMaintenance(page,{onCall:(m,p)=>{if(m==='GET'&&p===maintenanceRoot)hit.registry++;if(m==='GET'&&p==='/platform/tenants')hit.tenants++;}});
  const initial={...hit};await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>hit.registry).toBeGreaterThan(initial.registry);await expect.poll(()=>hit.tenants).toBeGreaterThan(initial.tenants);
 });
 test('PMNT-060 Negative and nonnumeric URL offsets are clamped before list GET',async({page})=>{
  const seen:string[]=[];await openPlatformMaintenance(page,{query:'offset=-5',onCall:(m,p,q)=>{if(m==='GET'&&p===maintenanceRoot)seen.push(q.get('offset')||'');}});
  await expect.poll(()=>seen.length).toBeGreaterThan(0);expect(seen.at(-1)).toBe('0');
  await page.goto(`${maintenanceRoot}?offset=not-a-number`);await expect.poll(()=>seen.length).toBeGreaterThan(1);expect(seen.at(-1)).toBe('0');
 });
 test('PMNT-061 Status or scope filter resets offset without losing selected search',async({page})=>{
  await openPlatformMaintenance(page,{query:'offset=50&search=Fixture',records:manyMaintenanceWindows(60)});
  await filters(page).getByLabel('Scope').selectOption('platform');
  const q=new URL(page.url()).searchParams;expect(q.get('offset')).toBeNull();expect(q.get('search')).toBe('Fixture');
 });
 test('PMNT-062 Audit and incident supporting links require their read grants',async({page})=>{
  await openPlatformMaintenance(page,{permissions:omit('platform.audit.read','platform.incidents.read')});
  await expect(registry(page).getByRole('link',{name:'Audit',exact:true})).toHaveCount(0);
  await expect(registry(page).getByRole('link',{name:'Incidents'})).toHaveCount(0);
 });
 test('PMNT-063 Release announcement and operational jobs links are permission-gated',async({page})=>{
  await openPlatformMaintenance(page,{permissions:omit('platform.releases.read','platform.announcements.read','platform.jobs.read')});
  for(const label of ['Releases','Announcements','Operational jobs'])await expect(registry(page).getByRole('link',{name:label})).toHaveCount(0);
 });
 test('PMNT-064 Tenant-specific record audit link requires audit permission',async({page})=>{
  await openPlatformMaintenance(page,{permissions:omit('platform.audit.read')});
  await expect(card(page,activeWindow.title).getByRole('link',{name:'Audit evidence'})).toHaveCount(0);
 });
 test('PMNT-065 Tenant record link requires valid tenant identity and read permission',async({page})=>{
  await openPlatformMaintenance(page,{permissions:omit('platform.tenants.read')});
  await expect(card(page,activeWindow.title).getByRole('link',{name:'Tenant record'})).toHaveCount(0);
 });
 test('PMNT-066 Without platform users grant cancelled actor email is redacted',async({page})=>{
  await openPlatformMaintenance(page,{query:'include_past=true',permissions:omit('platform.users.read')});
  await expect(card(page,cancelledWindow.title)).toContainText('Restricted');
  await expect(card(page,cancelledWindow.title)).not.toContainText('maintainer@fixture.test');
 });
 test('PMNT-067 Restricted tenant identity remains marked present rather than absent',async({page})=>{
  await openPlatformMaintenance(page,{permissions:omit('platform.tenants.read')});
  await expect(card(page,activeWindow.title)).toContainText('Tenant-specific · Restricted identity');
  await expect(card(page,activeWindow.title)).toContainText('Restricted');
 });
 test('PMNT-068 Application record truth note disclaims proof of customer notification delivery',async({page})=>{
  await openPlatformMaintenance(page);await expect(section(page,'Evidence and truth boundary')).toContainText('customer received or accepted');
 });
 test('PMNT-069 No-write-lock label is not an assertion that tenant mutations were blocked',async({page})=>{
  await openPlatformMaintenance(page);await expect(card(page,scheduledWindow.title)).toContainText('No write lock');
  await expect(card(page,scheduledWindow.title)).toContainText('Not requested');
 });
 test.skip('PMNT-070 Real backend denies write mutations to read-only platform principals — Phase 2 real evidence required',async()=>{
  // Not reproducible with synthetic HTTP; require real principals, database and external proof.
 });
 test.skip('PMNT-071 Real backend refuses tenant-target writes lacking TENANTS_READ — Phase 2 real evidence required',async()=>{
  // Not reproducible with synthetic HTTP; require real principals, database and external proof.
 });
 test.skip('PMNT-072 Active maintenance write lock actually blocks tenant mutations — Phase 2 real evidence required',async()=>{
  // Not reproducible with synthetic HTTP; require real principals, database and external proof.
 });
 test.skip('PMNT-073 Write-lock expiration and cancellation release guards under real requests — Phase 2 real evidence required',async()=>{
  // Not reproducible with synthetic HTTP; require real principals, database and external proof.
 });
 test.skip('PMNT-074 Overlapping platform and tenant windows enforce correct tenant scopes — Phase 2 real evidence required',async()=>{
  // Not reproducible with synthetic HTTP; require real principals, database and external proof.
 });
 test.skip('PMNT-075 Competing complete/cancel races preserve one terminal record in PostgreSQL — Phase 2 real evidence required',async()=>{
  // Not reproducible with synthetic HTTP; require real principals, database and external proof.
 });
 test.skip('PMNT-076 Real transaction audit preserves actor and cancellation/completion reason — Phase 2 real evidence required',async()=>{
  // Not reproducible with synthetic HTTP; require real principals, database and external proof.
 });
 test.skip('PMNT-077 Database enforces immutable start history and terminal records — Phase 2 real evidence required',async()=>{
  // Not reproducible with synthetic HTTP; require real principals, database and external proof.
 });
 test.skip('PMNT-078 Two real tenant accounts are isolated with redacted maintenance identities — Phase 2 real evidence required',async()=>{
  // Not reproducible with synthetic HTTP; require real principals, database and external proof.
 });
 test.skip('PMNT-079 Delivery, external infrastructure downtime and customer acknowledgement independently verified — Phase 2 real evidence required',async()=>{
  // Not reproducible with synthetic HTTP; require real principals, database and external proof.
 });
 test.skip('PMNT-080 Live PostgreSQL pagination and clock-derived phases verified — Phase 2 real evidence required',async()=>{
  // Not reproducible with synthetic HTTP; require real principals, database and external proof.
 });
});
