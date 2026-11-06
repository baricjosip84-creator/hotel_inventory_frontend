/** BATCH_091_GENERATED_UNRUN — Platform Announcements.
 * Source-traced synthetic UI and request tests ONLY; these do not prove receipt,
 * publication to live tenants, acknowledgement, DB integrity, or real RBAC. */
import {test,expect,type Page} from '@playwright/test';
import {openPlatformAnnouncements,announcementRoot,announcementPermissions,announcementTenantA,
 draftAnnouncement,publishedAnnouncement,tenantAnnouncement,expiredAnnouncement,cancelledAnnouncement,
 manyAnnouncements} from '../../../support/platformAnnouncementsFixture';
const root=(p:Page)=>p.locator('.platform-announcements');
const section=(p:Page,title:string)=>root(p).locator('section.platform-announcements__section').filter({has:p.getByRole('heading',{name:title,exact:true})});
const filters=(p:Page)=>section(p,'Registry filters').locator('.platform-announcements__filters');
const create=(p:Page)=>section(p,'Create draft');
const registry=(p:Page)=>section(p,'Announcement registry');
const cards=(p:Page)=>registry(p).locator('article.platform-announcements__card');
const card=(p:Page,title:string)=>cards(p).filter({has:p.getByRole('heading',{name:title,exact:true})});
const edit=(p:Page,title=draftAnnouncement.title)=>card(p,title).locator('.platform-announcements__edit-panel');
const pager=(p:Page)=>registry(p).locator('.platform-announcements__pagination');
const omit=(...names:string[])=>announcementPermissions.filter(permission=>!names.includes(permission));
test.describe('Platform Announcements — registry, publication and identity (BATCH_091_GENERATED_UNRUN)',()=>{
 test('PANN-001 Published record is application availability not guaranteed delivery',async({page})=>{
  await openPlatformAnnouncements(page);await expect(registry(page).locator('.platform-announcements__truth-note'))
   .toContainText('does not prove browser delivery, customer receipt');
 });
 test('PANN-002 Without announcement read grant platform route blocks registry request',async({page})=>{
  let requests=0;await openPlatformAnnouncements(page,{permissions:omit('platform.announcements.read'),expectHeading:false,
   onCall:(m,p)=>{if(m==='GET'&&p===announcementRoot)requests++;}});
  await expect(root(page)).toHaveCount(0);expect(requests).toBe(0);
 });
 test('PANN-003 Read-only principal sees messages but no create or lifecycle writes',async({page})=>{
  await openPlatformAnnouncements(page,{permissions:omit('platform.announcements.write')});
  await expect(card(page,draftAnnouncement.title)).toBeVisible();await expect(create(page)).toHaveCount(0);
  await expect(card(page,draftAnnouncement.title).getByRole('button',{name:'Publish'})).toHaveCount(0);
  await expect(card(page,draftAnnouncement.title).getByRole('button',{name:'Cancel announcement'})).toHaveCount(0);
 });
 test('PANN-004 Missing tenant read suppresses tenant filter and tenant audience option',async({page})=>{
  let tenantGET=0;await openPlatformAnnouncements(page,{permissions:omit('platform.tenants.read'),
   onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenants')tenantGET++;}});
  await expect(filters(page).getByLabel('Tenant')).toHaveCount(0);
  await expect(create(page).getByLabel('Audience').locator('option[value="tenant"]')).toBeDisabled();expect(tenantGET).toBe(0);
 });
 test('PANN-005 Restricted actor identities show Restricted rather than private email',async({page})=>{
  await openPlatformAnnouncements(page,{permissions:omit('platform.users.read')});
  await expect(card(page,publishedAnnouncement.title)).toContainText('Restricted');
  await expect(card(page,publishedAnnouncement.title)).not.toContainText('publisher@fixture.test');
 });
 test('PANN-006 Restricted tenant identity preserves one-tenant designation',async({page})=>{
  await openPlatformAnnouncements(page,{permissions:omit('platform.tenants.read')});
  await expect(card(page,tenantAnnouncement.title)).toContainText('Tenant-specific · Restricted identity');
  await expect(card(page,tenantAnnouncement.title)).not.toContainText('Announcements Alpha');
 });
 test('PANN-007 Partial identity evidence warning is not a zero-count claim',async({page})=>{
  await openPlatformAnnouncements(page,{permissions:omit('platform.tenants.read','platform.users.read')});
  await expect(root(page)).toContainText('Partial identity evidence.');
  await expect(root(page).getByLabel('Announcement registry summary')).toContainText('Current');
 });
 test('PANN-008 Summary displays four independent current audience counters',async({page})=>{
  await openPlatformAnnouncements(page);const stats=root(page).getByLabel('Announcement registry summary');
  for(const term of ['Current','Tenant visible','Platform visible','Critical current'])await expect(stats).toContainText(term);
 });
 test('PANN-009 Initial registry GET sends fifty rows, zero offset, no expired history',async({page})=>{
  const calls:string[]=[];await openPlatformAnnouncements(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===announcementRoot)calls.push(q.toString());}});
  await expect.poll(()=>calls.length).toBeGreaterThan(0);const q=new URLSearchParams(calls.at(-1));
  expect(q.get('limit')).toBe('50');expect(q.get('offset')).toBe('0');expect(q.get('include_expired')).toBe('false');
 });
 test('PANN-010 URL restores published-status and tenant audience filters',async({page})=>{
  await openPlatformAnnouncements(page,{query:'status=published&audience=tenant'});
  await expect(filters(page).getByLabel('Status')).toHaveValue('published');
  await expect(filters(page).getByLabel('Audience')).toHaveValue('tenant');
  await expect(card(page,tenantAnnouncement.title)).toBeVisible();
 });
 test('PANN-011 Status selector updates registry request and query string',async({page})=>{
  const qs:string[]=[];await openPlatformAnnouncements(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===announcementRoot)qs.push(q.toString());}});
  await filters(page).getByLabel('Status').selectOption('draft');await expect(cards(page)).toHaveCount(1);
  expect(new URL(page.url()).searchParams.get('status')).toBe('draft');
  expect(new URLSearchParams(qs.at(-1)).get('status')).toBe('draft');
 });
 test('PANN-012 Expired status enables historical records explicitly',async({page})=>{
  await openPlatformAnnouncements(page);await filters(page).getByLabel('Status').selectOption('expired');
  await expect(filters(page).getByLabel('History')).toHaveValue('true');
  await expect(card(page,expiredAnnouncement.title)).toBeVisible();
 });
 test('PANN-013 Cancelled status includes cancellation reason evidence',async({page})=>{
  await openPlatformAnnouncements(page);await filters(page).getByLabel('Status').selectOption('cancelled');
  await expect(card(page,cancelledAnnouncement.title)).toContainText('Synthetic cancellation note');
 });
 test('PANN-014 History selector reveals expired and cancelled cards',async({page})=>{
  await openPlatformAnnouncements(page);await expect(card(page,expiredAnnouncement.title)).toHaveCount(0);
  await filters(page).getByLabel('History').selectOption('true');
  await expect(card(page,expiredAnnouncement.title)).toBeVisible();await expect(card(page,cancelledAnnouncement.title)).toBeVisible();
 });
 test('PANN-015 Audience filter returns only tenant-target records',async({page})=>{
  await openPlatformAnnouncements(page);await filters(page).getByLabel('Audience').selectOption('tenant');
  await expect(cards(page)).toHaveCount(1);await expect(card(page,tenantAnnouncement.title)).toBeVisible();
 });
 test('PANN-016 Search term trims transport query and filters title',async({page})=>{
  const q:string[]=[];await openPlatformAnnouncements(page,{onCall:(m,p,s)=>{if(m==='GET'&&p===announcementRoot)q.push(s.toString());}});
  await filters(page).getByLabel('Search').fill('  tenant-critical  ');
  await expect(card(page,tenantAnnouncement.title)).toBeVisible();
  expect(new URLSearchParams(q.at(-1)).get('search')).toBe('tenant-critical');
 });
 test('PANN-017 Tenant filter sends authorized identifier to API',async({page})=>{
  const q:string[]=[];await openPlatformAnnouncements(page,{onCall:(m,p,s)=>{if(m==='GET'&&p===announcementRoot)q.push(s.toString());}});
  await filters(page).getByLabel('Tenant').selectOption(announcementTenantA);
  await expect(card(page,tenantAnnouncement.title)).toBeVisible();
  expect(new URLSearchParams(q.at(-1)).get('tenant_id')).toBe(announcementTenantA);
 });
 test('PANN-018 Unauthorized URL tenant ID is ignored before API filter',async({page})=>{
  const q:string[]=[];await openPlatformAnnouncements(page,{query:`tenant_id=${announcementTenantA}`,permissions:omit('platform.tenants.read'),
   onCall:(m,p,s)=>{if(m==='GET'&&p===announcementRoot)q.push(s.toString());}});
  await expect(root(page)).toContainText('Invalid or unauthorized URL filter');
  expect(new URLSearchParams(q.at(-1)).get('tenant_id')).toBeNull();
 });
 test('PANN-019 Invalid tenant UUID never reaches backend query',async({page})=>{
  const q:string[]=[];await openPlatformAnnouncements(page,{query:'tenant_id=invalid',
   onCall:(m,p,s)=>{if(m==='GET'&&p===announcementRoot)q.push(s.toString());}});
  await expect(root(page)).toContainText('Invalid or unauthorized URL filter');
  expect(new URLSearchParams(q.at(-1)).get('tenant_id')).toBeNull();
 });
 test('PANN-020 First page limits sixty notices to fifty cards',async({page})=>{
  await openPlatformAnnouncements(page,{records:manyAnnouncements(60)});
  await expect(cards(page)).toHaveCount(50);await expect(pager(page)).toContainText('60');
 });
 test('PANN-021 Next page sends offset fifty and shows ten records',async({page})=>{
  const q:string[]=[];await openPlatformAnnouncements(page,{records:manyAnnouncements(60),onCall:(m,p,s)=>{if(m==='GET'&&p===announcementRoot)q.push(s.toString());}});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect(cards(page)).toHaveCount(10);
  expect(new URLSearchParams(q.at(-1)).get('offset')).toBe('50');
 });
 test('PANN-022 Previous page restores first fifty records',async({page})=>{
  await openPlatformAnnouncements(page,{records:manyAnnouncements(60)});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect(cards(page)).toHaveCount(10);
  await pager(page).getByRole('button',{name:'Previous'}).click();await expect(cards(page)).toHaveCount(50);
 });
 test('PANN-023 Changing filter clears stale pagination offset',async({page})=>{
  await openPlatformAnnouncements(page,{query:'offset=50',records:manyAnnouncements(60)});
  await filters(page).getByLabel('Status').selectOption('draft');
  expect(new URL(page.url()).searchParams.has('offset')).toBe(false);await expect(cards(page)).toHaveCount(50);
 });
 test('PANN-024 Initial draft form refuses empty title and message',async({page})=>{
  await openPlatformAnnouncements(page);await expect(create(page).getByRole('button',{name:'Create draft'})).toBeDisabled();
  await expect(create(page)).toContainText('Complete title/message');
 });
 test('PANN-025 Tenant audience requires an explicit active tenant selection',async({page})=>{
  await openPlatformAnnouncements(page);await create(page).getByLabel('Title').fill('Tenant-only fixture');
  await create(page).getByLabel('Message').fill('Tenant-specific message');
  await create(page).getByLabel('Audience').selectOption('tenant');
  await expect(create(page).getByRole('button',{name:'Create draft'})).toBeDisabled();
  await create(page).getByLabel('Tenant').selectOption(announcementTenantA);
  await expect(create(page).getByRole('button',{name:'Create draft'})).toBeEnabled();
 });
 test('PANN-026 Archived tenant is not available for new targeted announcement',async({page})=>{
  await openPlatformAnnouncements(page);await create(page).getByLabel('Audience').selectOption('tenant');
  await expect(create(page).getByLabel('Tenant').locator('option')).toHaveCount(2);
 });
 test('PANN-027 End time before start time blocks draft creation',async({page})=>{
  await openPlatformAnnouncements(page);await create(page).getByLabel('Title').fill('Invalid fixture');
  await create(page).getByLabel('Message').fill('Test invalid range');
  await create(page).getByLabel('Starts at').fill('2030-04-04T12:00');
  await create(page).getByLabel('Ends at').fill('2030-04-04T11:00');
  await expect(create(page).getByRole('button',{name:'Create draft'})).toBeDisabled();
 });
 test('PANN-028 Draft create POST trims text and does not include published status',async({page})=>{
  let sent:any;await openPlatformAnnouncements(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p===announcementRoot)sent=b;}});
  await create(page).getByLabel('Title').fill('  Synthetic draft title  ');
  await create(page).getByLabel('Message').fill('  Synthetic message  ');
  await create(page).getByRole('button',{name:'Create draft'}).click();
  await expect.poll(()=>Boolean(sent)).toBe(true);expect(sent.title).toBe('Synthetic draft title');
  expect(sent.message).toBe('Synthetic message');expect(sent).not.toHaveProperty('status');
 });
 test('PANN-029 Tenant announcement POST includes tenant ID only for tenant audience',async({page})=>{
  let sent:any;await openPlatformAnnouncements(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p===announcementRoot)sent=b;}});
  await create(page).getByLabel('Title').fill('Targeted fixture');await create(page).getByLabel('Message').fill('Private tenant notice');
  await create(page).getByLabel('Audience').selectOption('tenant');await create(page).getByLabel('Tenant').selectOption(announcementTenantA);
  await create(page).getByRole('button',{name:'Create draft'}).click();await expect.poll(()=>sent?.tenant_id).toBe(announcementTenantA);
  expect(sent.audience).toBe('tenant');
 });
 test('PANN-030 Platform-only draft request has null tenant identifier',async({page})=>{
  let sent:any;await openPlatformAnnouncements(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p===announcementRoot)sent=b;}});
  await create(page).getByLabel('Title').fill('Platform notice');await create(page).getByLabel('Message').fill('Platform staff only');
  await create(page).getByLabel('Audience').selectOption('platform');
  await create(page).getByRole('button',{name:'Create draft'}).click();await expect.poll(()=>Boolean(sent)).toBe(true);
  expect(sent.tenant_id).toBeNull();expect(sent.audience).toBe('platform');
 });
 test('PANN-031 Create success explicitly leaves announcement as draft',async({page})=>{
  await openPlatformAnnouncements(page);await create(page).getByLabel('Title').fill('New draft created');
  await create(page).getByLabel('Message').fill('Synthetic only');await create(page).getByRole('button',{name:'Create draft'}).click();
  await expect(root(page)).toContainText('Draft announcement created: New draft created');
  await expect(card(page,'New draft created')).toContainText('draft');
 });
 test('PANN-032 Severity and dismissible choices reach create payload',async({page})=>{
  let sent:any;await openPlatformAnnouncements(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p===announcementRoot)sent=b;}});
  await create(page).getByLabel('Title').fill('Critical fixture');await create(page).getByLabel('Message').fill('Synthetic only');
  await create(page).getByLabel('Severity').selectOption('critical');
  await create(page).getByLabel('Audience may dismiss this notice in the current app session').uncheck();
  await create(page).getByRole('button',{name:'Create draft'}).click();await expect.poll(()=>Boolean(sent)).toBe(true);
  expect(sent.severity).toBe('critical');expect(sent.dismissible).toBe(false);
 });
 test('PANN-033 Draft card has Publish but published card does not',async({page})=>{
  await openPlatformAnnouncements(page);
  await expect(card(page,draftAnnouncement.title).getByRole('button',{name:'Publish',exact:true})).toBeVisible();
  await expect(card(page,publishedAnnouncement.title).getByRole('button',{name:'Publish',exact:true})).toHaveCount(0);
 });
 test('PANN-034 Publishing draft uses dedicated POST endpoint with no lifecycle body',async({page})=>{
  let payload:any;await openPlatformAnnouncements(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p.endsWith('/publish'))payload={p,b};}});
  await card(page,draftAnnouncement.title).getByRole('button',{name:'Publish',exact:true}).click();
  await expect.poll(()=>payload?.p).toBe(`${announcementRoot}/${draftAnnouncement.id}/publish`);
  expect(payload.b).toEqual({});
 });
 test('PANN-035 Published record preserves immutable starts-at editor control',async({page})=>{
  await openPlatformAnnouncements(page);await card(page,publishedAnnouncement.title).getByRole('button',{name:'Edit'}).click();
  await expect(edit(page,publishedAnnouncement.title).getByLabel('Starts at')).toBeDisabled();
  await expect(edit(page,publishedAnnouncement.title)).toContainText('Published start history is immutable.');
 });
 test('PANN-036 Draft edit allows start time and PATCH excludes audience mutation',async({page})=>{
  let sent:any;await openPlatformAnnouncements(page,{onCall:(m,p,_q,b)=>{if(m==='PATCH'&&p.endsWith(draftAnnouncement.id))sent=b;}});
  await card(page,draftAnnouncement.title).getByRole('button',{name:'Edit'}).click();
  await expect(edit(page).getByLabel('Starts at')).toBeEnabled();
  await edit(page).getByLabel('Title').fill('  Edited draft fixture ');
  await edit(page).getByRole('button',{name:'Save details'}).click();await expect.poll(()=>Boolean(sent)).toBe(true);
  expect(sent.title).toBe('Edited draft fixture');expect(sent).not.toHaveProperty('audience');expect(sent).toHaveProperty('starts_at');
 });
 test('PANN-037 Cancelling editor makes no PATCH request',async({page})=>{
  let patch=0;await openPlatformAnnouncements(page,{onCall:(m)=>{if(m==='PATCH')patch++;}});
  await card(page,draftAnnouncement.title).getByRole('button',{name:'Edit'}).click();
  await edit(page).getByLabel('Title').fill('Unsaved edit');
  await edit(page).getByRole('button',{name:'Cancel edit'}).click();
  await expect(edit(page)).toHaveCount(0);expect(patch).toBe(0);
 });
 test('PANN-038 Cancellation requires reason before confirmation is available',async({page})=>{
  await openPlatformAnnouncements(page);const box=card(page,draftAnnouncement.title).locator('.platform-announcements__cancel-box');
  await expect(box.getByRole('button',{name:'Cancel announcement'})).toBeDisabled();
  await box.getByLabel('Cancellation reason').fill('  ');await expect(box.getByRole('button',{name:'Cancel announcement'})).toBeDisabled();
  await box.getByLabel('Cancellation reason').fill('Manual cancellation');
  await expect(box.getByRole('button',{name:'Cancel announcement'})).toBeEnabled();
 });
 test('PANN-039 Dismissing cancellation confirmation sends no request',async({page})=>{
  let sent=0;await openPlatformAnnouncements(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/cancel'))sent++;}});
  const box=card(page,draftAnnouncement.title).locator('.platform-announcements__cancel-box');
  await box.getByLabel('Cancellation reason').fill('Manual cancellation');
  page.once('dialog',d=>d.dismiss());await box.getByRole('button',{name:'Cancel announcement'}).click();
  expect(sent).toBe(0);await expect(card(page,draftAnnouncement.title)).toBeVisible();
 });
 test('PANN-040 Confirmed cancellation trims reason and makes record terminal',async({page})=>{
  let sent:any;await openPlatformAnnouncements(page,{query:'include_expired=true',onCall:(m,p,_q,b)=>{if(m==='POST'&&p.endsWith('/cancel'))sent=b;}});
  const box=card(page,draftAnnouncement.title).locator('.platform-announcements__cancel-box');
  await box.getByLabel('Cancellation reason').fill('  Retire fixture  ');page.once('dialog',d=>d.accept());
  await box.getByRole('button',{name:'Cancel announcement'}).click();await expect.poll(()=>sent?.reason).toBe('  Retire fixture  '); // Frontend forwards raw typed reason; server-side trimming requires Phase 2 proof.
  await expect(card(page,draftAnnouncement.title)).toContainText('Cancelled');
  await expect(card(page,draftAnnouncement.title).getByRole('button',{name:'Edit'})).toHaveCount(0);
 });
 test('PANN-041 Published notice does not imply browser delivery or customer acknowledgement',async({page})=>{
  await openPlatformAnnouncements(page);await expect(card(page,publishedAnnouncement.title)).toContainText('Service message visible in app context');
  await expect(registry(page).locator('.platform-announcements__truth-note'))
   .toContainText('customer receipt, reading, acknowledgement');
 });
 test('PANN-042 Create draft mutation failure keeps entered values and shows backend reason',async({page})=>{
  await openPlatformAnnouncements(page,{overrides:{'POST /platform/announcements':{status:422,json:{message:'Fixture draft validation failed'}}}});
  await create(page).getByLabel('Title').fill('Keep this entered title');await create(page).getByLabel('Message').fill('Keep this entered message');
  await create(page).getByRole('button',{name:'Create draft'}).click();
  await expect(create(page)).toContainText('Create failed:');await expect(create(page)).toContainText('Fixture draft validation failed');
  await expect(create(page).getByLabel('Title')).toHaveValue('Keep this entered title');
  await expect(create(page).getByLabel('Message')).toHaveValue('Keep this entered message');
  await expect(root(page)).not.toContainText('Draft announcement created:');
 });
 test('PANN-043 Retry after failed draft creation succeeds without premature publication',async({page})=>{
  let fail=true;let creates=0;
  await openPlatformAnnouncements(page,{respond:(m,p)=>{if(m==='POST'&&p===announcementRoot){creates++;return fail?{status:503,json:{message:'Temporary draft rejection'}}:undefined;}}});
  await create(page).getByLabel('Title').fill('Retryable announcement');await create(page).getByLabel('Message').fill('Draft after retry');
  await create(page).getByRole('button',{name:'Create draft'}).click();await expect(create(page)).toContainText('Create failed:');
  fail=false;await create(page).getByRole('button',{name:'Create draft'}).click();
  await expect(root(page)).toContainText('Draft announcement created: Retryable announcement');
  await expect(card(page,'Retryable announcement')).toContainText('draft');expect(creates).toBe(2);
 });
 test('PANN-044 Successful creation resets fields and reports draft-only success',async({page})=>{
  await openPlatformAnnouncements(page);await create(page).getByLabel('Title').fill('Reset me');
  await create(page).getByLabel('Message').fill('Fixture text');await create(page).getByLabel('Severity').selectOption('critical');
  await create(page).getByRole('button',{name:'Create draft'}).click();
  await expect(create(page).getByLabel('Title')).toHaveValue('');await expect(create(page).getByLabel('Message')).toHaveValue('');
  await expect(create(page).getByLabel('Severity')).toHaveValue('info');await expect(root(page)).toContainText('Publish it explicitly when ready.');
 });
 test('PANN-045 Published edit payload omits immutable starts_at',async({page})=>{
  let sent:any;await openPlatformAnnouncements(page,{onCall:(m,p,_q,b)=>{if(m==='PATCH'&&p.endsWith(publishedAnnouncement.id))sent=b;}});
  await card(page,publishedAnnouncement.title).getByRole('button',{name:'Edit'}).click();
  await expect(edit(page,publishedAnnouncement.title).getByLabel('Starts at')).toBeDisabled();
  await edit(page,publishedAnnouncement.title).getByLabel('Message').fill('Revised published text');
  await edit(page,publishedAnnouncement.title).getByRole('button',{name:'Save details'}).click();
  await expect.poll(()=>Boolean(sent)).toBe(true);expect(sent).not.toHaveProperty('starts_at');
  expect(sent.message).toBe('Revised published text');
 });
 test('PANN-046 Expired record edit allows end time but does not publish',async({page})=>{
  let sent:any;await openPlatformAnnouncements(page,{query:'include_expired=true',onCall:(m,p,_q,b)=>{if(m==='PATCH'&&p.endsWith(expiredAnnouncement.id))sent=b;}});
  await card(page,expiredAnnouncement.title).getByRole('button',{name:'Edit'}).click();
  await edit(page,expiredAnnouncement.title).getByLabel('Ends at').fill('2031-10-20T12:00');
  await edit(page,expiredAnnouncement.title).getByRole('button',{name:'Save details'}).click();
  await expect.poll(()=>Boolean(sent)).toBe(true);expect(sent).toHaveProperty('ends_at');
  await expect(root(page)).toContainText('It remains Expired until explicitly published again.');
 });
 test('PANN-047 Expired record remains publishable after editing',async({page})=>{
  await openPlatformAnnouncements(page,{query:'include_expired=true'});
  await card(page,expiredAnnouncement.title).getByRole('button',{name:'Edit'}).click();
  await edit(page,expiredAnnouncement.title).getByLabel('Message').fill('Ready for explicit publish');
  await edit(page,expiredAnnouncement.title).getByRole('button',{name:'Save details'}).click();
  await expect(card(page,expiredAnnouncement.title).getByRole('button',{name:'Publish'})).toBeVisible();
  await expect(card(page,expiredAnnouncement.title)).toContainText('expired');
 });
 test('PANN-048 Cancelled history exposes no edit, publish or cancel actions',async({page})=>{
  await openPlatformAnnouncements(page,{query:'include_expired=true'});
  const record=card(page,cancelledAnnouncement.title);
  for(const name of ['Edit','Publish','Cancel announcement'])await expect(record.getByRole('button',{name})).toHaveCount(0);
  await expect(record).toContainText('Synthetic cancellation note');
 });
 test('PANN-049 Failed PATCH leaves form editable with explicit failure',async({page})=>{
  await openPlatformAnnouncements(page,{overrides:{[`PATCH ${announcementRoot}/${draftAnnouncement.id}`]:{status:409,json:{message:'Edit rejected'}}}});
  await card(page,draftAnnouncement.title).getByRole('button',{name:'Edit'}).click();
  await edit(page).getByLabel('Message').fill('Preserved edit');await edit(page).getByRole('button',{name:'Save details'}).click();
  await expect(edit(page)).toContainText('Edit failed: Edit rejected');
  await expect(edit(page).getByLabel('Message')).toHaveValue('Preserved edit');
  await expect(root(page)).not.toContainText('Announcement details updated.');
 });
 test('PANN-050 PATCH success closes editor and refreshes record body',async({page})=>{
  let gets=0;await openPlatformAnnouncements(page,{onCall:(m,p)=>{if(m==='GET'&&p===announcementRoot)gets++;}});
  await card(page,draftAnnouncement.title).getByRole('button',{name:'Edit'}).click();
  await edit(page).getByLabel('Message').fill('Changed via source-backed PATCH');
  await edit(page).getByRole('button',{name:'Save details'}).click();
  await expect(edit(page)).toHaveCount(0);await expect(card(page,draftAnnouncement.title)).toContainText('Changed via source-backed PATCH');
  expect(gets).toBeGreaterThanOrEqual(2);
 });
 test('PANN-051 Empty edited title/message disables Save details and prevents PATCH',async({page})=>{
  let writes=0;await openPlatformAnnouncements(page,{onCall:(m)=>{if(m==='PATCH')writes++;}});
  await card(page,draftAnnouncement.title).getByRole('button',{name:'Edit'}).click();
  await edit(page).getByLabel('Title').fill('   ');await expect(edit(page).getByRole('button',{name:'Save details'})).toBeDisabled();
  await edit(page).getByLabel('Title').fill('Valid');await edit(page).getByLabel('Message').fill(' ');
  await expect(edit(page).getByRole('button',{name:'Save details'})).toBeDisabled();expect(writes).toBe(0);
 });
 test('PANN-052 Edited end before start blocks save without PATCH',async({page})=>{
  let writes=0;await openPlatformAnnouncements(page,{onCall:(m)=>{if(m==='PATCH')writes++;}});
  await card(page,draftAnnouncement.title).getByRole('button',{name:'Edit'}).click();
  await edit(page).getByLabel('Starts at').fill('2031-06-02T13:00');
  await edit(page).getByLabel('Ends at').fill('2031-06-02T12:00');
  await expect(edit(page).getByRole('button',{name:'Save details'})).toBeDisabled();expect(writes).toBe(0);
 });
 test('PANN-053 Publish rejection keeps draft and shows error',async({page})=>{
  await openPlatformAnnouncements(page,{overrides:{[`POST ${announcementRoot}/${draftAnnouncement.id}/publish`]:{status:409,json:{message:'Publish conflict'}}}});
  await card(page,draftAnnouncement.title).getByRole('button',{name:'Publish'}).click();
  await expect(root(page)).toContainText('Publish failed: Publish conflict');
  await expect(card(page,draftAnnouncement.title)).toContainText('draft');
  await expect(card(page,draftAnnouncement.title).getByRole('button',{name:'Publish'})).toBeVisible();
 });
 test('PANN-054 Successful publish refreshes record and removes Publish action',async({page})=>{
  let publishes=0;await openPlatformAnnouncements(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/publish'))publishes++;}});
  await card(page,draftAnnouncement.title).getByRole('button',{name:'Publish'}).click();
  await expect(root(page)).toContainText('Announcement published.');
  await expect(card(page,draftAnnouncement.title)).toContainText('published');
  await expect(card(page,draftAnnouncement.title).getByRole('button',{name:'Publish'})).toHaveCount(0);expect(publishes).toBe(1);
 });
 test('PANN-055 Cancelled announcement cannot trigger publishing through UI',async({page})=>{
  let publishes=0;await openPlatformAnnouncements(page,{query:'include_expired=true',onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/publish'))publishes++;}});
  await expect(card(page,cancelledAnnouncement.title).getByRole('button',{name:'Publish'})).toHaveCount(0);expect(publishes).toBe(0);
 });
 test('PANN-056 Cancellation reason remains visible with permission-redacted actor',async({page})=>{
  await openPlatformAnnouncements(page,{query:'include_expired=true',permissions:omit('platform.users.read')});
  const record=card(page,cancelledAnnouncement.title);await expect(record).toContainText('Synthetic cancellation note');
  await expect(record.locator('.platform-announcements__cancelled')).toContainText('Restricted');
  await expect(record).not.toContainText('publisher@fixture.test');
 });
 test('PANN-057 Accepted cancellation posts trimmed reason to distinct cancel endpoint',async({page})=>{
  let payload:any;await openPlatformAnnouncements(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p.endsWith('/cancel'))payload={p,b};}});
  const box=card(page,draftAnnouncement.title).locator('.platform-announcements__cancel-box');
  await box.getByLabel('Cancellation reason').fill('  Retiring this draft  ');
  page.once('dialog',d=>d.accept());await box.getByRole('button',{name:'Cancel announcement'}).click();
  await expect.poll(()=>payload?.p).toBe(`${announcementRoot}/${draftAnnouncement.id}/cancel`);
  // Current frontend passes the typed reason, without trimming; do not assert backend normalization from synthetic interception.
  expect(payload.b.reason).toBe('  Retiring this draft  ');
 });
 test('PANN-058 Failed cancellation preserves live action and shows error',async({page})=>{
  await openPlatformAnnouncements(page,{overrides:{[`POST ${announcementRoot}/${draftAnnouncement.id}/cancel`]:{status:503,json:{message:'Cancellation rejected'}}}});
  const box=card(page,draftAnnouncement.title).locator('.platform-announcements__cancel-box');
  await box.getByLabel('Cancellation reason').fill('Test cancel');page.once('dialog',d=>d.accept());
  await box.getByRole('button',{name:'Cancel announcement'}).click();
  await expect(root(page)).toContainText('Cancellation failed: Cancellation rejected');
  await expect(card(page,draftAnnouncement.title)).toContainText('draft');
 });
 test('PANN-059 Initial registry failure renders explicit Retry and no false empty result',async({page})=>{
  await openPlatformAnnouncements(page,{overrides:{'GET /platform/announcements':{status:503,json:{message:'Registry down'}}}});
  await expect(registry(page)).toContainText('Announcement registry could not be loaded.');
  await expect(registry(page).getByRole('button',{name:'Retry'})).toBeVisible();
  await expect(registry(page)).not.toContainText('No application announcement evidence matched.');
 });
 test('PANN-060 Registry retry after outage restores matching record results',async({page})=>{
  let down=true;await openPlatformAnnouncements(page,{respond:(m,p)=>m==='GET'&&p===announcementRoot&&down?{status:503,json:{message:'Registry temporarily down'}}:undefined});
  await expect(registry(page)).toContainText('Announcement registry could not be loaded.');
  down=false;await registry(page).getByRole('button',{name:'Retry'}).click();
  await expect(card(page,draftAnnouncement.title)).toBeVisible();await expect(registry(page).getByRole('button',{name:'Retry'})).toHaveCount(0);
 });
 test('PANN-061 Refresh failure retains previous registry snapshot and warns',async({page})=>{
  let fail=false;await openPlatformAnnouncements(page,{respond:(m,p)=>m==='GET'&&p===announcementRoot&&fail?{status:503,json:{message:'Refresh refused'}}:undefined});
  await expect(card(page,draftAnnouncement.title)).toBeVisible();fail=true;
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(root(page)).toContainText('Showing the last successful announcement snapshot.');
  await expect(card(page,draftAnnouncement.title)).toBeVisible();
 });
 test('PANN-062 Tenant directory outage does not block platform-audience draft creation',async({page})=>{
  await openPlatformAnnouncements(page,{overrides:{'GET /platform/tenants':{status:503,json:{message:'Tenant lookup failed'}}}});
  await create(page).getByLabel('Title').fill('Platform-only despite directory outage');
  await create(page).getByLabel('Message').fill('No tenant target required');
  await create(page).getByLabel('Audience').selectOption('platform');
  await expect(create(page).getByRole('button',{name:'Create draft'})).toBeEnabled();
 });
 test('PANN-063 Tenant directory retry through Refresh restores permitted tenant choices',async({page})=>{
  let fail=true;await openPlatformAnnouncements(page,{respond:(m,p)=>m==='GET'&&p==='/platform/tenants'&&fail?{status:503,json:{message:'Directory outage'}}:undefined});
  await create(page).getByLabel('Audience').selectOption('tenant');
  await expect(create(page).getByLabel('Tenant').locator('option')).toHaveCount(1);
  fail=false;await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(create(page).getByLabel('Tenant').locator('option')).toHaveCount(2);
 });
 test('PANN-064 Refresh requests both registry and permitted tenant directory again',async({page})=>{
  const calls:string[]=[];await openPlatformAnnouncements(page,{onCall:(m,p)=>{if(m==='GET'&&[announcementRoot,'/platform/tenants'].includes(p))calls.push(p);}});
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect.poll(()=>calls.filter(v=>v===announcementRoot).length).toBeGreaterThanOrEqual(2);
  await expect.poll(()=>calls.filter(v=>v==='/platform/tenants').length).toBeGreaterThanOrEqual(2);
 });
 test('PANN-065 Bad negative or nonnumeric URL offset is clamped before API request',async({page})=>{
  const queries:string[]=[];await openPlatformAnnouncements(page,{query:'offset=-200',onCall:(m,p,q)=>{if(m==='GET'&&p===announcementRoot)queries.push(q.toString());}});
  await expect.poll(()=>queries.length).toBeGreaterThan(0);expect(new URLSearchParams(queries.at(-1)).get('offset')).toBe('0');
  await page.goto(`${announcementRoot}?offset=not-a-number`);
  await expect.poll(()=>queries.length).toBeGreaterThan(1);expect(new URLSearchParams(queries.at(-1)).get('offset')).toBe('0');
 });
 test('PANN-066 Changing status or audience clears stale pagination offset',async({page})=>{
  await openPlatformAnnouncements(page,{query:'offset=50',records:manyAnnouncements(70)});
  await filters(page).getByLabel('Status').selectOption('draft');
  await expect.poll(()=>new URL(page.url()).searchParams.get('offset')).toBeNull();
  await page.goto(`${announcementRoot}?offset=50`);
  await filters(page).getByLabel('Audience').selectOption('all');
  await expect.poll(()=>new URL(page.url()).searchParams.get('offset')).toBeNull();
 });
 test('PANN-067 Maintenance, incident, tenant and audit navigation links require individual read grants',async({page})=>{
  await openPlatformAnnouncements(page,{permissions:omit('platform.maintenance.read','platform.incidents.read','platform.tenants.read','platform.audit.read')});
  const links=registry(page).locator('.platform-announcements__supporting-links');
  for(const name of ['Maintenance','Incidents','Tenants','Audit'])await expect(links.getByRole('link',{name})).toHaveCount(0);
 });
 test('PANN-068 Without platform user read permission cancellation and publisher emails are hidden',async({page})=>{
  await openPlatformAnnouncements(page,{query:'include_expired=true',permissions:omit('platform.users.read')});
  await expect(card(page,publishedAnnouncement.title)).toContainText('Restricted');
  await expect(card(page,cancelledAnnouncement.title)).toContainText('Restricted');
  await expect(root(page)).not.toContainText('publisher@fixture.test');
 });
 test('PANN-069 Published and dismissible UI markers explicitly exclude acknowledgement claims',async({page})=>{
  await openPlatformAnnouncements(page);await expect(card(page,publishedAnnouncement.title)).toContainText('Yes · session display control');
  await expect(registry(page).locator('.platform-announcements__truth-note')).toContainText('does not prove browser delivery');
  await expect(registry(page).locator('.platform-announcements__truth-note')).toContainText('acknowledgement');
 });
 test.skip('PANN-070 Real backend denies read-only operator publish/update/cancel — Phase 2 live evidence required',async()=>{
  // Requires independently verified real principals, database, clock, tenant context or customer evidence; synthetic HTTP cannot prove this.
 });
 test.skip('PANN-071 Real tenant-target write rejected without TENANTS_READ — Phase 2 live evidence required',async()=>{
  // Requires independently verified real principals, database, clock, tenant context or customer evidence; synthetic HTTP cannot prove this.
 });
 test.skip('PANN-072 Real tenant context includes only current correct-audience notices — Phase 2 live evidence required',async()=>{
  // Requires independently verified real principals, database, clock, tenant context or customer evidence; synthetic HTTP cannot prove this.
 });
 test.skip('PANN-073 Real start/end time-window boundaries filter published messages — Phase 2 live evidence required',async()=>{
  // Requires independently verified real principals, database, clock, tenant context or customer evidence; synthetic HTTP cannot prove this.
 });
 test.skip('PANN-074 Actual client-session dismissal does not become acknowledgement — Phase 2 live evidence required',async()=>{
  // Requires independently verified real principals, database, clock, tenant context or customer evidence; synthetic HTTP cannot prove this.
 });
 test.skip('PANN-075 Concurrent publish/cancel commits only one terminal transition — Phase 2 live evidence required',async()=>{
  // Requires independently verified real principals, database, clock, tenant context or customer evidence; synthetic HTTP cannot prove this.
 });
 test.skip('PANN-076 Two real tenant principals cannot access each other private messages — Phase 2 live evidence required',async()=>{
  // Requires independently verified real principals, database, clock, tenant context or customer evidence; synthetic HTTP cannot prove this.
 });
 test.skip('PANN-077 PostgreSQL audit events retain actor and retry sequence — Phase 2 live evidence required',async()=>{
  // Requires independently verified real principals, database, clock, tenant context or customer evidence; synthetic HTTP cannot prove this.
 });
 test.skip('PANN-078 Archived tenant create rejection and historic data preservation — Phase 2 live evidence required',async()=>{
  // Requires independently verified real principals, database, clock, tenant context or customer evidence; synthetic HTTP cannot prove this.
 });
 test.skip('PANN-079 Independent delivery/receipt/acknowledgement evidence required — Phase 2 live evidence required',async()=>{
  // Requires independently verified real principals, database, clock, tenant context or customer evidence; synthetic HTTP cannot prove this.
 });
 test.skip('PANN-080 Real database pagination and clock-based expiry normalization — Phase 2 live evidence required',async()=>{
  // Requires independently verified real principals, database, clock, tenant context or customer evidence; synthetic HTTP cannot prove this.
 });
});
