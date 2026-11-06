import { test, expect, type Page } from '@playwright/test';
import { openTenantTimeline, makeTimelineEvent, TASK_TENANT_A, TASK_TENANT_B, TIMELINE_SOURCE_A } from '../../../support/tenantTimelineFixture';

/** Batch 62 / Phase 1: browser scenario declarations only; synthetic HTTP is NOT proof of backend source ACL, audit persistence or external outcomes. */
const filters=(page:Page)=>page.locator('.platform-tenant-timeline__filter-grid');
const stream=(page:Page)=>page.locator('.platform-tenant-timeline__list');
const card=(page:Page,title:string)=>page.locator('.platform-tenant-timeline__card').filter({has:page.getByRole('heading',{name:title,exact:true})});
const pager=(page:Page)=>page.locator('.platform-tenant-timeline__pagination');
const manyEvents=()=>Array.from({length:101},(_,i)=>makeTimelineEvent(i+1));

test.describe('Platform Tenant Timeline — Batch 62, GENERATED_UNRUN',()=>{
 test('PTLINE-001 Hero states read-only source scope and truth limitations',async({page})=>{
  await openTenantTimeline(page);
  await expect(page.getByText('Source · GET /platform/tenant-timeline')).toBeVisible();
  await expect(page.getByText('Base read · TENANTS_READ')).toBeVisible();
  await expect(page.getByText(/does not independently prove an external outcome occurred/)).toBeVisible();
 });
 test('PTLINE-002 Default GET sends 90-day window and 100 rows at offset zero',async({page})=>{
  const queries:URLSearchParams[]=[];await openTenantTimeline(page,{onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/tenant-timeline')queries.push(new URLSearchParams(q));}});
  await expect.poll(()=>queries.length).toBeGreaterThan(0);expect(queries[0].get('days')).toBe('90');
  expect(queries[0].get('limit')).toBe('100');expect(queries[0].get('offset')).toBe('0');
  expect(queries[0].has('tenant_id')).toBe(false);expect(queries[0].has('source')).toBe(false);
 });
 test('PTLINE-003 Timeline displays source-specific cards with status, severity, and details',async({page})=>{
  await openTenantTimeline(page);await expect(card(page,'Fixture task onboarded')).toContainText('Open');
  await expect(card(page,'Fixture incident reported')).toContainText('Major');
  await expect(card(page,'Fixture incident reported')).toContainText('Fixture incident detail');
 });
 test('PTLINE-004 Summary counts loaded and visible page events separately',async({page})=>{
  await openTenantTimeline(page);const summary=page.getByLabel('Tenant timeline snapshot summary');
  await expect(summary).toContainText('Loaded events');await expect(summary).toContainText('Visible after search');
  await expect(summary).toContainText('Current page only; not an all-history total');
 });
 test('PTLINE-005 Tenant URL scope filters event response and shows current view label',async({page})=>{
  await openTenantTimeline(page,{query:`tenant_id=${TASK_TENANT_A}`});
  await expect(card(page,'Fixture task onboarded')).toBeVisible();await expect(card(page,'Fixture incident reported')).toHaveCount(0);
  await expect(page.getByText('Current view · Fixture Hotel')).toBeVisible();
 });
 test('PTLINE-006 Changing tenant selector writes scoped URL and GET query',async({page})=>{
  const scopes:string[]=[];await openTenantTimeline(page,{onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/tenant-timeline')scopes.push(q.get('tenant_id')||'');}});
  await filters(page).getByLabel('Tenant').selectOption(TASK_TENANT_B);await expect(page).toHaveURL(new RegExp('tenant_id='+TASK_TENANT_B));
  await expect.poll(()=>scopes).toContain(TASK_TENANT_B);await expect(card(page,'Fixture incident reported')).toBeVisible();
 });
 test('PTLINE-007 Source selector sends tenant_task and hides other source events',async({page})=>{
  await openTenantTimeline(page);await filters(page).getByLabel('Source').selectOption('tenant_task');
  await expect(page).toHaveURL(/source=tenant_task/);await expect(card(page,'Fixture task onboarded')).toBeVisible();
  await expect(card(page,'Fixture incident reported')).toHaveCount(0);
 });
 test('PTLINE-008 Days selector stores valid 30-day window in URL and request',async({page})=>{
  const days:string[]=[];await openTenantTimeline(page,{onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/tenant-timeline')days.push(q.get('days')||'');}});
  await filters(page).getByLabel('Days').fill('30');await expect(page).toHaveURL(/days=30/);
  await expect.poll(()=>days).toContain('30');
 });
 test('PTLINE-009 Zero days in URL blocks timeline query until repaired',async({page})=>{
  const calls:string[]=[];await openTenantTimeline(page,{query:'days=0',onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-timeline')calls.push(p);}});
  await expect(page.getByText('One or more URL filters are invalid or not permitted.')).toBeVisible();expect(calls).toHaveLength(0);
 });
 test('PTLINE-010 Days greater than 3650 rejected with safe 90-day repair',async({page})=>{
  await openTenantTimeline(page,{query:'days=3651'});await page.getByRole('button',{name:'Clear invalid filters'}).click();
  await expect(page).toHaveURL(/days=90/);await expect(card(page,'Fixture task onboarded')).toBeVisible();
 });
 test('PTLINE-011 Fractional days are invalid and can be repaired',async({page})=>{
  await openTenantTimeline(page,{query:'days=7.5'});await expect(page.getByRole('button',{name:'Clear invalid filters'})).toBeVisible();
  await page.getByRole('button',{name:'Clear invalid filters'}).click();await expect(filters(page).getByLabel('Days')).toHaveValue('90');
 });
 test('PTLINE-012 Invalid tenant UUID fails closed before timeline GET',async({page})=>{
  const calls:string[]=[];await openTenantTimeline(page,{query:'tenant_id=bad',onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-timeline')calls.push(p);}});
  await expect(page.getByText('One or more URL filters are invalid or not permitted.')).toBeVisible();expect(calls).toHaveLength(0);
 });
 test('PTLINE-013 Unknown timeline source fails closed before GET',async({page})=>{
  const calls:string[]=[];await openTenantTimeline(page,{query:'source=imaginary',onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-timeline')calls.push(p);}});
  await expect(page.getByRole('button',{name:'Clear invalid filters'})).toBeVisible();expect(calls).toHaveLength(0);
 });
 test('PTLINE-014 Known but forbidden audit source blocks timeline GET',async({page})=>{
  const calls:string[]=[];await openTenantTimeline(page,{query:'source=audit',permissions:['platform.dashboard.read','platform.tenants.read'],onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-timeline')calls.push(p);}});
  await expect(page.getByText('The requested source requires a Platform permission you do not have.')).toBeVisible();expect(calls).toHaveLength(0);
 });
 test('PTLINE-015 Clear invalid source keeps valid tenant and days',async({page})=>{
  await openTenantTimeline(page,{query:`tenant_id=${TASK_TENANT_A}&days=14&source=unknown_source`});
  await page.getByRole('button',{name:'Clear invalid filters'}).click();
  await expect(page).toHaveURL(new RegExp('tenant_id='+TASK_TENANT_A));await expect(page).toHaveURL(/days=14/);
  await expect(page).not.toHaveURL(/source=/);
 });
 test('PTLINE-016 Source dropdown contains only explicitly permitted sources',async({page})=>{
  await openTenantTimeline(page,{permissions:['platform.dashboard.read','platform.tenants.read']});
  const options=await filters(page).getByLabel('Source').locator('option').evaluateAll(items=>items.map(item=>(item as HTMLOptionElement).value));
  expect(options).toEqual(['','tenant_task','tenant_communication','offboarding']);
  await expect(page.getByText('Source access is fail-closed.')).toBeVisible();
 });
 test('PTLINE-017 Operator email redacted when PLATFORM_USERS_READ absent',async({page})=>{
  await openTenantTimeline(page,{permissions:['platform.dashboard.read','platform.tenants.read','platform.incidents.read']});
  await expect(card(page,'Fixture task onboarded')).toContainText('Hidden by permission');
  await expect(page.getByText('operator@example.test')).toHaveCount(0);
 });
 test('PTLINE-018 Platform-users read permission makes actor email visible',async({page})=>{
  await openTenantTimeline(page);await expect(card(page,'Fixture task onboarded')).toContainText('operator@example.test');
  await expect(card(page,'Fixture follow up email')).toContainText('System / not recorded');
 });
 test('PTLINE-019 Local search narrows loaded page without additional timeline GET',async({page})=>{
  const calls:string[]=[];await openTenantTimeline(page,{onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-timeline')calls.push(p);}});
  await expect(card(page,'Fixture task onboarded')).toBeVisible();const before=calls.length;
  await filters(page).getByLabel('Search loaded page').fill('incident reported');
  await expect(card(page,'Fixture incident reported')).toBeVisible();await expect(card(page,'Fixture task onboarded')).toHaveCount(0);expect(calls.length).toBe(before);
 });
 test('PTLINE-020 Local search considers selected metadata values',async({page})=>{
  await openTenantTimeline(page);await filters(page).getByLabel('Search loaded page').fill('PX-2');
  await expect(card(page,'Fixture incident reported')).toBeVisible();await expect(card(page,'Fixture task onboarded')).toHaveCount(0);
 });
 test('PTLINE-021 No local search hits communicates loaded-page scope, not external inactivity',async({page})=>{
  await openTenantTimeline(page);await filters(page).getByLabel('Search loaded page').fill('nothing-can-match');
  await expect(page.getByText('No events on this loaded page.')).toBeVisible();
  await expect(page.getByText(/does not prove that no external activity occurred/)).toBeVisible();
 });
 test('PTLINE-022 Source event presents record ID and tenant deep link',async({page})=>{
  await openTenantTimeline(page);const item=card(page,'Fixture task onboarded');
  await expect(item).toContainText(TIMELINE_SOURCE_A);
  await expect(item.getByRole('link',{name:'Tenant',exact:true})).toHaveAttribute('href',new RegExp('tenant_id='+TASK_TENANT_A));
 });
 test('PTLINE-023 Event link targets source workspace with tenant context',async({page})=>{
  await openTenantTimeline(page);await expect(card(page,'Fixture task onboarded').getByRole('link',{name:'Open source workspace'})).toHaveAttribute('href',new RegExp('/platform/tenant-tasks\\?tenant_id='+TASK_TENANT_A));
  await expect(card(page,'Fixture incident reported').getByRole('link',{name:'Open source workspace'})).toHaveAttribute('href',new RegExp('/platform/incidents\\?tenant_id='+TASK_TENANT_B));
 });
 test('PTLINE-024 Timeline pagination requests offset 100 when has_more is true',async({page})=>{
  const offsets:string[]=[];await openTenantTimeline(page,{events:manyEvents(),onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/tenant-timeline')offsets.push(q.get('offset')||'');}});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect(pager(page)).toContainText('Page 2');
  await expect.poll(()=>offsets).toContain('100');await expect(card(page,'Fixture timeline event 101')).toBeVisible();
 });
 test('PTLINE-025 Previous timeline page restores offset zero',async({page})=>{
  await openTenantTimeline(page,{events:manyEvents()});await pager(page).getByRole('button',{name:'Next'}).click();
  await expect(pager(page)).toContainText('Page 2');await pager(page).getByRole('button',{name:'Previous'}).click();
  await expect(pager(page)).toContainText('Page 1');await expect(card(page,'Fixture timeline event 001')).toBeVisible();
 });
 /** Batch 63: source-derived timeline recovery, privacy and pagination cases; Phase 1 declarations only. */
 test('PTLINE-026 Initial timeline load failure exposes Retry timeline, not false empty history',async({page})=>{
  await openTenantTimeline(page,{responses:{'GET /platform/tenant-timeline':{status:503,json:{message:'Synthetic timeline unavailable'}}}});
  await expect(page.getByText('Timeline could not be loaded.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Retry timeline'})).toBeVisible();
  await expect(page.getByText('No events on this loaded page.')).toHaveCount(0);
 });
 test('PTLINE-027 Initial tenant selector load failure presents Retry tenants and disables selector',async({page})=>{
  await openTenantTimeline(page,{responses:{'GET /platform/tenants':{status:503,json:{message:'Synthetic tenant selector error'}}}});
  await expect(page.getByText('Tenant selector could not be loaded.')).toBeVisible();
  await expect(filters(page).getByLabel('Tenant')).toBeDisabled();
  await expect(page.getByRole('button',{name:'Retry tenants'})).toBeVisible();
 });
 test('PTLINE-028 Failed timeline refresh retains last successful event snapshot',async({page})=>{
  let fail=false;await openTenantTimeline(page,{respond:(m,p)=>m==='GET'&&p==='/platform/tenant-timeline'&&fail?{status:503,json:{message:'Synthetic timeline refresh failure'}}:undefined});
  await expect(card(page,'Fixture task onboarded')).toBeVisible();fail=true;
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page.getByText('Timeline refresh failed. Showing the last successful timeline snapshot.')).toBeVisible();
  await expect(card(page,'Fixture task onboarded')).toBeVisible();
 });
 test('PTLINE-029 Failed tenant selector refresh preserves last successful tenant list',async({page})=>{
  let fail=false;await openTenantTimeline(page,{respond:(m,p)=>m==='GET'&&p==='/platform/tenants'&&fail?{status:503,json:{message:'Synthetic selector refresh failure'}}:undefined});
  await expect(filters(page).getByLabel('Tenant')).toContainText('Fixture Hotel');fail=true;
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page.getByText('Tenant selector refresh failed. Showing the last successful tenant selector snapshot.')).toBeVisible();
  await expect(filters(page).getByLabel('Tenant')).toContainText('Fixture Hotel');
 });
 test('PTLINE-030 Refresh button disabled while request fetches',async({page})=>{
  await openTenantTimeline(page,{delayMs:{'GET /platform/tenant-timeline':900}});
  await expect(card(page,'Fixture task onboarded')).toBeVisible();
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page.getByRole('button',{name:'Refresh',exact:true})).toBeDisabled();
  await expect(page.getByText('Refreshing…')).toBeVisible();
 });
 test('PTLINE-031 Pagination controls disabled while next page fetches',async({page})=>{
  await openTenantTimeline(page,{events:manyEvents(),delayMs:{'GET /platform/tenant-timeline':900}});
  await expect(pager(page).getByRole('button',{name:'Next'})).toBeEnabled();
  await pager(page).getByRole('button',{name:'Next'}).click();
  await expect(pager(page).getByRole('button',{name:'Next'})).toBeDisabled();
  await expect(pager(page).getByRole('button',{name:'Previous'})).toBeDisabled();
 });
 test('PTLINE-032 Empty results show truthful empty-state scope',async({page})=>{
  await openTenantTimeline(page,{events:[]});
  await expect(page.getByText('No events on this loaded page.')).toBeVisible();
  await expect(page.getByText(/does not prove that no external activity occurred/)).toBeVisible();
  await expect(stream(page).locator('article')).toHaveCount(0);
 });
 test('PTLINE-033 Invalid happened_at renders Not recorded, never Invalid Date',async({page})=>{
  await openTenantTimeline(page);await expect(card(page,'Fixture follow up email')).toContainText('Not recorded');
  await expect(page.getByText('Invalid Date')).toHaveCount(0);
 });
 test('PTLINE-034 Evidence metadata is allowlisted and capped at six entries',async({page})=>{
  const evidence={ticket_reference:'T-10',access_level:'limited',starts_at:'start',ends_at:'end',due_at:'due',completed_at:'complete',retain_until:'seventh',ignored_secret:'NEVER-SHOW'};
  await openTenantTimeline(page,{events:[makeTimelineEvent(1,{metadata:evidence})]});
  const item=card(page,'Fixture timeline event 001');
  await expect(item.locator('.platform-tenant-timeline__evidence-grid').getByText('Evidence',{exact:true})).toHaveCount(6);
  await expect(item).not.toContainText('Retain until: seventh');
 });
 test('PTLINE-035 Unknown metadata keys are not rendered in evidence',async({page})=>{
  await openTenantTimeline(page,{events:[makeTimelineEvent(1,{metadata:{unknown_internal:'PRIVATE-METADATA',ticket_reference:'VISIBLE-REF'}})]});
  const item=card(page,'Fixture timeline event 001');await expect(item).toContainText('VISIBLE-REF');
  await expect(item).not.toContainText('PRIVATE-METADATA');
 });
 test('PTLINE-036 HTML-like details are safely rendered as text, not markup',async({page})=>{
  const value='<img src=x onerror=alert(1)>';
  await openTenantTimeline(page,{events:[makeTimelineEvent(1,{details:value})]});
  await expect(card(page,'Fixture timeline event 001')).toContainText(value);
  await expect(card(page,'Fixture timeline event 001').locator('img')).toHaveCount(0);
 });
 test('PTLINE-037 Missing actor identity reads System / not recorded with user-read permission',async({page})=>{
  await openTenantTimeline(page);await expect(card(page,'Fixture follow up email')).toContainText('System / not recorded');
 });
 test('PTLINE-038 Unknown source in response has no invented source-workspace destination',async({page})=>{
  const unknown=makeTimelineEvent(7,{source:'unknown_source',source_id:'unknown-7'});
  await openTenantTimeline(page,{responses:{'GET /platform/tenant-timeline':{status:200,json:{events:[unknown],pagination:{limit:100,offset:0,has_more:false},available_sources:[],omitted_sources:[],actor_identity_redacted:false,counts:{},days:90,limit:100,offset:0,tenant_id:null,source:null}}}});
  const item=card(page,'Fixture timeline event 007');await expect(item).toBeVisible();
  await expect(item.getByRole('link',{name:'Open source workspace'})).toHaveCount(0);
 });
 test('PTLINE-039 Upper valid 3650-day URL query is sent unchanged',async({page})=>{
  const days:string[]=[];await openTenantTimeline(page,{query:'days=3650',onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/tenant-timeline')days.push(q.get('days')||'');}});
  await expect(filters(page).getByLabel('Days')).toHaveValue('3650');await expect.poll(()=>days).toContain('3650');
 });
 test('PTLINE-040 Negative and nonnumeric days are blocked and repairable',async({page})=>{
  for(const invalid of ['-1','NaN']){
   const calls:string[]=[];await openTenantTimeline(page,{query:`days=${invalid}`,onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-timeline')calls.push(p);}});
   await expect(page.getByRole('button',{name:'Clear invalid filters'})).toBeVisible();expect(calls).toHaveLength(0);
   await page.getByRole('button',{name:'Clear invalid filters'}).click();await expect(filters(page).getByLabel('Days')).toHaveValue('90');
  }
 });
 test('PTLINE-041 Local search trims whitespace and ignores case without network refetch',async({page})=>{
  let requests=0;await openTenantTimeline(page,{onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-timeline')requests++;}});
  await expect(card(page,'Fixture incident reported')).toBeVisible();const before=requests;
  await filters(page).getByLabel('Search loaded page').fill('  INCIDENT REPORTED  ');
  await expect(card(page,'Fixture incident reported')).toBeVisible();await expect(card(page,'Fixture task onboarded')).toHaveCount(0);expect(requests).toBe(before);
 });
 test('PTLINE-042 Tenant scope change returns pagination to offset zero',async({page})=>{
  const offsets:string[]=[];await openTenantTimeline(page,{events:manyEvents(),onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/tenant-timeline')offsets.push(q.get('offset')||'');}});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect(pager(page)).toContainText('Page 2');
  await filters(page).getByLabel('Tenant').selectOption(TASK_TENANT_A);await expect(pager(page)).toContainText('Page 1');
  await expect.poll(()=>offsets[offsets.length-1]).toBe('0');
 });
 test('PTLINE-043 Changing source resets pagination to page one',async({page})=>{
  await openTenantTimeline(page,{events:manyEvents()});await pager(page).getByRole('button',{name:'Next'}).click();
  await expect(pager(page)).toContainText('Page 2');await filters(page).getByLabel('Source').selectOption('tenant_task');
  await expect(pager(page)).toContainText('Page 1');
 });
 test('PTLINE-044 Changing days resets pagination to page one',async({page})=>{
  await openTenantTimeline(page,{events:manyEvents()});await pager(page).getByRole('button',{name:'Next'}).click();
  await expect(pager(page)).toContainText('Page 2');await filters(page).getByLabel('Days').fill('7');
  await expect(pager(page)).toContainText('Page 1');await expect(page).toHaveURL(/days=7/);
 });
 test('PTLINE-045 Repair invalid tenant preserves valid source and days',async({page})=>{
  await openTenantTimeline(page,{query:'tenant_id=broken&days=31&source=tenant_task'});
  await page.getByRole('button',{name:'Clear invalid filters'}).click();
  await expect(page).toHaveURL(/days=31/);await expect(page).toHaveURL(/source=tenant_task/);
  await expect(page).not.toHaveURL(/tenant_id=/);
 });
 test('PTLINE-046 Multiple invalid URL filters stay blocked until repaired together',async({page})=>{
  const calls:string[]=[];await openTenantTimeline(page,{query:'tenant_id=bad&days=0&source=invalid',onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-timeline')calls.push(p);}});
  await expect(page.getByRole('button',{name:'Clear invalid filters'})).toBeVisible();expect(calls).toHaveLength(0);
  await page.getByRole('button',{name:'Clear invalid filters'}).click();
  await expect(page).not.toHaveURL(/tenant_id=/);await expect(page).not.toHaveURL(/source=/);await expect(page).toHaveURL(/days=90/);
  await expect(card(page,'Fixture task onboarded')).toBeVisible();
 });
 test('PTLINE-047 Unknown-but-valid tenant ID uses Selected tenant label',async({page})=>{
  const id='44444444-4444-4444-8444-444444444444';await openTenantTimeline(page,{query:`tenant_id=${id}`});
  await expect(page.getByText('Current view · Selected tenant')).toBeVisible();
 });
 test('PTLINE-048 Limited read role sees actor redaction and only tenant-owned sources',async({page})=>{
  await openTenantTimeline(page,{permissions:['platform.dashboard.read','platform.tenants.read']});
  await expect(card(page,'Fixture task onboarded')).toContainText('Hidden by permission');
  const values=await filters(page).getByLabel('Source').locator('option').evaluateAll(options=>options.map(o=>(o as HTMLOptionElement).value));
  expect(values).toEqual(['','tenant_task','tenant_communication','offboarding']);
  await expect(page.getByText('incident-operator@example.test')).toHaveCount(0);
 });
 test('PTLINE-049 Forbidden source cannot be forced by direct URL',async({page})=>{
  const requests:string[]=[];await openTenantTimeline(page,{query:'source=audit',permissions:['platform.dashboard.read','platform.tenants.read'],onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-timeline')requests.push(p);}});
  await expect(page.getByText('The requested source requires a Platform permission you do not have.')).toBeVisible();
  expect(requests).toHaveLength(0);
 });
 test('PTLINE-050 Missing optional event fields render safe fallbacks without fake badges',async({page})=>{
  await openTenantTimeline(page,{events:[makeTimelineEvent(1,{status:null,severity:null,details:null,actor_email:null,metadata:{}})]});
  const item=card(page,'Fixture timeline event 001');await expect(item).toContainText('System / not recorded');
  await expect(item.locator('.platform-tenant-timeline__badge')).toHaveCount(0);
  await expect(item.locator('p')).toHaveCount(0);
 });
 test('PTLINE-051 Full last page with has_more false still disables Next',async({page})=>{
  await openTenantTimeline(page,{events:Array.from({length:100},(_,i)=>makeTimelineEvent(i+1))});
  await expect(stream(page).locator('article')).toHaveCount(100);
  await expect(pager(page).getByRole('button',{name:'Next'})).toBeDisabled();
 });
 test('PTLINE-052 Page-two search never searches unloaded page-one events',async({page})=>{
  await openTenantTimeline(page,{events:manyEvents()});await pager(page).getByRole('button',{name:'Next'}).click();
  await expect(card(page,'Fixture timeline event 101')).toBeVisible();
  await filters(page).getByLabel('Search loaded page').fill('event 001');
  await expect(stream(page).locator('article')).toHaveCount(0);
  await expect(page.getByText('No events on this loaded page.')).toBeVisible();
 });
 test('PTLINE-053 Event tenant link uses row tenant ID, never a different filter tenant',async({page})=>{
  await openTenantTimeline(page,{events:[makeTimelineEvent(1,{tenant_id:TASK_TENANT_B,tenant_name:'Fixture Warehouse'})]});
  await expect(card(page,'Fixture timeline event 001').getByRole('link',{name:'Tenant',exact:true})).toHaveAttribute('href',new RegExp('tenant_id='+TASK_TENANT_B));
 });
 test('PTLINE-054 TENANTS_READ denial prevents the protected timeline page rendering',async({page})=>{
  await openTenantTimeline(page,{permissions:['platform.dashboard.read'],expectHeading:false});
  await expect(page.getByRole('heading',{name:'Tenant timeline',exact:true})).toHaveCount(0);
 });
 test('PTLINE-055 Read-only timeline triggers no mutation requests',async({page})=>{
  const writes:string[]=[];await openTenantTimeline(page,{onCall:(m,p)=>{if(['POST','PATCH','PUT','DELETE'].includes(m)&&p==='/platform/tenant-timeline')writes.push(m);}});
  await filters(page).getByLabel('Search loaded page').fill('fixture');
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page.getByRole('button',{name:'Refresh',exact:true})).toBeEnabled();expect(writes).toEqual([]);
  await expect(page.getByText('Read-only tenant history', {exact:false})).toBeVisible();
 });
 test('PTLINE-056 HTTP 503 initial load is an error, not falsely presented as empty success',async({page})=>{
  await openTenantTimeline(page,{responses:{'GET /platform/tenant-timeline':{status:503,json:{message:'Temporary test failure'}}}});
  await expect(page.getByText('Timeline could not be loaded.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Retry timeline'})).toBeVisible();
  await expect(page.getByText('No events on this loaded page.')).toHaveCount(0);
 });
 test('PTLINE-057 Available and omitted source summary remain separate',async({page})=>{
  await openTenantTimeline(page,{permissions:['platform.dashboard.read','platform.tenants.read']});
  const summary=page.getByLabel('Tenant timeline snapshot summary');
  await expect(summary).toContainText('Available sources');await expect(summary).toContainText('Omitted sources');
  await expect(page.getByText('Source access is fail-closed.')).toBeVisible();
 });
 test('PTLINE-058 Status/severity tokens render humanized labels',async({page})=>{
  await openTenantTimeline(page,{events:[makeTimelineEvent(1,{status:'follow_up_open',severity:'needs_attention'})]});
  const item=card(page,'Fixture timeline event 001');await expect(item).toContainText('Follow up open');
  await expect(item).toContainText('Needs attention');
 });
 test('PTLINE-059 Scoped supporting links carry tenant ID and hide restricted sources',async({page})=>{
  await openTenantTimeline(page,{query:`tenant_id=${TASK_TENANT_A}`,permissions:['platform.dashboard.read','platform.tenants.read']});
  const supporting=page.locator('.platform-tenant-timeline__section').last();
  await expect(supporting.getByRole('link',{name:'Tenant tasks'})).toHaveAttribute('href',new RegExp('tenant_id='+TASK_TENANT_A));
  await expect(supporting.getByRole('link',{name:'Communications'})).toHaveAttribute('href',new RegExp('tenant_id='+TASK_TENANT_A));
  await expect(supporting.getByRole('link',{name:'Platform audit'})).toHaveCount(0);
  await expect(supporting.getByRole('link',{name:'Billing'})).toHaveCount(0);
 });
 test('PTLINE-060 Confidential unlisted metadata is absent from event card',async({page})=>{
  await openTenantTimeline(page,{events:[makeTimelineEvent(1,{metadata:{secret_key:'NEVER_LEAK_THIS_KEY',internal_token:'SECRET_TOKEN',channel:'email'}})]});
  const item=card(page,'Fixture timeline event 001');await expect(item).toContainText('Channel: email');
  await expect(item).not.toContainText('NEVER_LEAK_THIS_KEY');await expect(item).not.toContainText('SECRET_TOKEN');
 });
 test('PTLINE-061 Search-only changes do not disturb loaded event provenance',async({page})=>{
  const hits:string[]=[];await openTenantTimeline(page,{onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/tenant-timeline')hits.push(q.toString());}});
  await expect(card(page,'Fixture task onboarded')).toContainText(TIMELINE_SOURCE_A);const before=hits.length;
  await filters(page).getByLabel('Search loaded page').fill('urgent never matches');
  await filters(page).getByLabel('Search loaded page').clear();
  await expect(card(page,'Fixture task onboarded')).toContainText(TIMELINE_SOURCE_A);expect(hits.length).toBe(before);
 });
 test('PTLINE-062 Every timeline page GET uses the frontend page size of 100',async({page})=>{
  const limits:string[]=[];await openTenantTimeline(page,{events:manyEvents(),onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/tenant-timeline')limits.push(q.get('limit')||'');}});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect(pager(page)).toContainText('Page 2');
  expect(limits.length).toBeGreaterThanOrEqual(2);expect(limits.every(limit=>limit==='100')).toBe(true);
 });
 test('PTLINE-063 Source workspace links use mapped routes for each permitted source',async({page})=>{
  const events=[makeTimelineEvent(1,{source:'support_session'}),makeTimelineEvent(2,{source:'billing_event'}),makeTimelineEvent(3,{source:'data_retention'})];
  await openTenantTimeline(page,{events});
  const cases:[string,string][]=[['Fixture timeline event 001','/platform/support-sessions'],['Fixture timeline event 002','/platform/billing'],['Fixture timeline event 003','/platform/data-retention']];
  for(const [name,path] of cases){await expect(card(page,name).getByRole('link',{name:'Open source workspace'})).toHaveAttribute('href',new RegExp(path.replaceAll('/','\\/')+'\\?tenant_id='));}
 });
 test('PTLINE-064 Hero explicitly states application evidence is not proof of external outcome',async({page})=>{
  await openTenantTimeline(page);await expect(page.getByText(/does not independently prove an external outcome occurred/)).toBeVisible();
 });
 test('PTLINE-065 Synthetic permission snapshots demonstrate route-level re-evaluation only; real revocation needs Phase 2',async({page})=>{
  await openTenantTimeline(page,{permissions:['platform.dashboard.read','platform.tenants.read'],query:'source=audit'});
  await expect(page.getByText('The requested source requires a Platform permission you do not have.')).toBeVisible();
  await page.reload();await expect(page.getByText('The requested source requires a Platform permission you do not have.')).toBeVisible();
  // Live privilege revocation and backend cache invalidation remain NOT_BROWSER_TESTABLE under mocked transport.
 });
});
