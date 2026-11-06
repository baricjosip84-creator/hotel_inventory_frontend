/** BATCH_089_GENERATED_UNRUN — Platform Incidents UI contracts, synthetic HTTP only.
 * Do not equate browser mock responses to external service recovery, real tenant public
 * context isolation, authoritative audit events or tested backend authorization. */
import {test,expect,type Page} from '@playwright/test';
import {openPlatformIncidents,incidentsRoot,incidentPermissions,incidentTenantA,incidentTenantB,
 ongoingIncident,tenantIncident,monitoringIncident,resolvedIncident,manyIncidentRecords} from '../../../support/platformIncidentsFixture';
const root=(p:Page)=>p.locator('.platform-incidents');
const section=(p:Page,name:string)=>root(p).locator('section.platform-incidents__section').filter({has:p.getByRole('heading',{name,exact:true})});
const registry=(p:Page)=>section(p,'Incident registry');
const filters=(p:Page)=>registry(p).locator('.platform-incidents__filters');
const cards=(p:Page)=>registry(p).locator('article.platform-incidents__card');
const card=(p:Page,name:string)=>cards(p).filter({has:p.getByRole('heading',{name,exact:true})});
const pager=(p:Page)=>registry(p).locator('.platform-incidents__pagination');
const create=(p:Page)=>p.locator('#platform-incidents-create');
const detail=(p:Page)=>section(p,'Incident detail & lifecycle');
const edit=(p:Page)=>detail(p).locator('.platform-incidents__edit-panel');
const lifecycle=(p:Page)=>detail(p).locator('.platform-incidents__lifecycle-box');
const omit=(...permissions:string[])=>incidentPermissions.filter(x=>!permissions.includes(x));
const openDetail=async(p:Page,name=ongoingIncident.title)=>{await card(p,name).getByRole('button',{name:'Open detail'}).click();
 await expect(detail(p).locator('.platform-incidents__detail')).toBeVisible();};

test.describe('Platform Incidents — list, public boundaries and workflow (BATCH_089_GENERATED_UNRUN)',()=>{
 test('PINC-001 Evidence note rejects inference of real external recovery',async({page})=>{
  await openPlatformIncidents(page);await expect(section(page,'Evidence boundary')).toContainText('Recorded incident state does not prove');
  await expect(section(page,'Evidence boundary')).toContainText('external service restoration');
 });
 test('PINC-002 Missing incident read grant denies page and list traffic',async({page})=>{
  let hits=0;await openPlatformIncidents(page,{permissions:omit('platform.incidents.read'),expectHeading:false,
   onCall:(m,p)=>{if(m==='GET'&&p===incidentsRoot)hits++;}});
  await expect(root(page)).toHaveCount(0);expect(hits).toBe(0);
 });
 test('PINC-003 Read-only permission retains registry but hides create and lifecycle writes',async({page})=>{
  await openPlatformIncidents(page,{permissions:omit('platform.incidents.write')});
  await expect(card(page,ongoingIncident.title)).toBeVisible();await expect(create(page)).toHaveCount(0);
  await openDetail(page);await expect(detail(page).getByRole('button',{name:'Edit details'})).toHaveCount(0);
  await expect(lifecycle(page)).toHaveCount(0);
 });
 test('PINC-004 Tenant directory and tenant creation option are absent without TENANTS_READ',async({page})=>{
  let directoryCalls=0;await openPlatformIncidents(page,{permissions:omit('platform.tenants.read'),
   onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenants')directoryCalls++;}});
  await expect(filters(page).getByLabel('Tenant')).toHaveCount(0);
  await expect(create(page).getByLabel('Scope').locator('option[value="tenant"]')).toHaveCount(0);
  expect(directoryCalls).toBe(0);
 });
 test('PINC-005 Tenant and operator directory permissions permit scoped labels',async({page})=>{
  await openPlatformIncidents(page);await expect(filters(page).getByLabel('Tenant').locator('option')).toContainText(['All tenants','Fixture Incidents Alpha','Fixture Incidents Beta']);
  await expect(card(page,tenantIncident.title)).toContainText('Tenant: Fixture Incidents Alpha');
 });
 test('PINC-006 Missing user identity permission announces partial evidence without fake absence',async({page})=>{
  await openPlatformIncidents(page,{permissions:omit('platform.users.read')});
  await expect(root(page)).toContainText('Protected identity evidence is partial.');await openDetail(page);
  await expect(detail(page).locator('.platform-incidents__detail')).toContainText('Restricted');
 });
 test('PINC-007 KPIs describe full matching incident registry',async({page})=>{
  await openPlatformIncidents(page);const stats=root(page).getByLabel('Incident registry summary');
  for(const label of ['Open','Critical open','Platform open','Tenant open','Resolved'])await expect(stats).toContainText(label);
 });
 test('PINC-008 Initial list asks for fifty rows, offset zero, open-only data',async({page})=>{
  const qs:string[]=[];await openPlatformIncidents(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===incidentsRoot)qs.push(q.toString());}});
  await expect.poll(()=>qs.length).toBeGreaterThan(0);const q=new URLSearchParams(qs.at(-1));
  expect(q.get('limit')).toBe('50');expect(q.get('offset')).toBe('0');expect(q.get('include_resolved')).toBe('false');
 });
 test('PINC-009 Existing status and severity URL filters initialize controls',async({page})=>{
  await openPlatformIncidents(page,{query:'status=identified&severity=critical'});
  await expect(filters(page).getByLabel('Status')).toHaveValue('identified');
  await expect(filters(page).getByLabel('Severity')).toHaveValue('critical');
  await expect(cards(page)).toHaveCount(1);await expect(card(page,tenantIncident.title)).toBeVisible();
 });
 test('PINC-010 Search updates URL and scopes title matches',async({page})=>{
  await openPlatformIncidents(page);await filters(page).getByLabel('Search').fill('regional connectivity');
  await expect(cards(page)).toHaveCount(1);await expect(card(page,ongoingIncident.title)).toBeVisible();
  expect(new URL(page.url()).searchParams.get('search')).toBe('regional connectivity');
 });
 test('PINC-011 Status filter sends status to API',async({page})=>{
  const qs:string[]=[];await openPlatformIncidents(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===incidentsRoot)qs.push(q.toString());}});
  await filters(page).getByLabel('Status').selectOption('monitoring');await expect(cards(page)).toHaveCount(1);
  expect(new URLSearchParams(qs.at(-1)).get('status')).toBe('monitoring');
 });
 test('PINC-012 Severity filter supports critical-only results',async({page})=>{
  await openPlatformIncidents(page);await filters(page).getByLabel('Severity').selectOption('critical');
  await expect(cards(page)).toHaveCount(1);await expect(card(page,tenantIncident.title)).toBeVisible();
 });
 test('PINC-013 Scope filter distinguishes tenant from platform incidents',async({page})=>{
  await openPlatformIncidents(page);await filters(page).getByLabel('Scope').selectOption('tenant');
  await expect(cards(page)).toHaveCount(1);await expect(card(page,tenantIncident.title)).toBeVisible();
 });
 test('PINC-014 Tenant selection also scopes the incident type to tenant',async({page})=>{
  const qs:string[]=[];await openPlatformIncidents(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===incidentsRoot)qs.push(q.toString());}});
  await filters(page).getByLabel('Tenant').selectOption(incidentTenantA);
  await expect(filters(page).getByLabel('Scope')).toHaveValue('tenant');await expect(cards(page)).toHaveCount(1);
  expect(new URLSearchParams(qs.at(-1)).get('tenant_id')).toBe(incidentTenantA);
 });
 test('PINC-015 Include-closed visibility exposes resolved history without turning it into open incidents',async({page})=>{
  await openPlatformIncidents(page);await expect(card(page,resolvedIncident.title)).toHaveCount(0);
  await filters(page).getByLabel('Visibility').selectOption('true');await expect(card(page,resolvedIncident.title)).toBeVisible();
  await expect(card(page,resolvedIncident.title)).toContainText('resolved');
 });
 test('PINC-016 Unauthorized tenant URL selector is not forwarded to API',async({page})=>{
  const qs:string[]=[];await openPlatformIncidents(page,{query:`tenant_id=${incidentTenantA}`,
   permissions:omit('platform.tenants.read'),onCall:(m,p,q)=>{if(m==='GET'&&p===incidentsRoot)qs.push(q.toString());}});
  await expect(root(page)).toContainText('Tenant filter restricted.');
  expect(new URLSearchParams(qs.at(-1)).get('tenant_id')).toBeNull();
 });
 test('PINC-017 First page remains capped at fifty while summary counts entire result',async({page})=>{
  await openPlatformIncidents(page,{records:manyIncidentRecords(58)});
  await expect(cards(page)).toHaveCount(50);await expect(pager(page)).toContainText('58');
 });
 test('PINC-018 Next page uses offset fifty and returns the remainder',async({page})=>{
  const qs:string[]=[];await openPlatformIncidents(page,{records:manyIncidentRecords(58),onCall:(m,p,q)=>{if(m==='GET'&&p===incidentsRoot)qs.push(q.toString());}});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect(cards(page)).toHaveCount(8);
  expect(new URLSearchParams(qs.at(-1)).get('offset')).toBe('50');
 });
 test('PINC-019 Previous restores offset zero and first page',async({page})=>{
  await openPlatformIncidents(page,{records:manyIncidentRecords(58)});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect(cards(page)).toHaveCount(8);
  await pager(page).getByRole('button',{name:'Previous'}).click();await expect(cards(page)).toHaveCount(50);
  expect(new URL(page.url()).searchParams.get('offset')).toBe('0');
 });
 test('PINC-020 Changing severity resets a prior pagination offset',async({page})=>{
  await openPlatformIncidents(page,{query:'offset=50',records:manyIncidentRecords(58)});
  await filters(page).getByLabel('Severity').selectOption('critical');
  await expect(page).not.toHaveURL(/offset=50/);await expect(cards(page)).toHaveCount(0);
 });
 test('PINC-021 Empty matching set offers correction rather than asserting zero real incidents',async({page})=>{
  await openPlatformIncidents(page);await filters(page).getByLabel('Search').fill('no-fixture-has-this-key');
  await expect(registry(page)).toContainText('No incidents match the current filters.');
 });
 test('PINC-022 Actor identity redaction is applied in opened detail',async({page})=>{
  await openPlatformIncidents(page,{permissions:omit('platform.users.read')});await openDetail(page);
  await expect(detail(page).locator('.platform-incidents__detail')).toContainText('Restricted');
  await expect(detail(page).locator('.platform-incidents__detail')).not.toContainText('actor@fixture.test');
 });
 test('PINC-023 Tenant-scoped identity displays restricted without TENANTS_READ',async({page})=>{
  await openPlatformIncidents(page,{permissions:omit('platform.tenants.read')});
  await expect(card(page,tenantIncident.title)).toContainText('identity restricted');
  await expect(card(page,tenantIncident.title)).not.toContainText('Fixture Incidents Alpha');
 });
 test('PINC-024 Open detail loads separately from summary list',async({page})=>{
  const paths:string[]=[];await openPlatformIncidents(page,{onCall:(m,p)=>{if(m==='GET')paths.push(p);}});
  await openDetail(page,tenantIncident.title);await expect.poll(()=>paths.includes(`${incidentsRoot}/${tenantIncident.id}`)).toBe(true);
 });
 test('PINC-025 Selected detail retains actor identity when permission granted',async({page})=>{
  await openPlatformIncidents(page);await openDetail(page);
  await expect(detail(page).locator('.platform-incidents__detail')).toContainText('actor@fixture.test');
 });
 test('PINC-026 Detail links honor audit and tenant permissions',async({page})=>{
  await openPlatformIncidents(page,{permissions:omit('platform.audit.read')});await openDetail(page,tenantIncident.title);
  await expect(detail(page).getByRole('link',{name:'Audit evidence'})).toHaveCount(0);
  await expect(detail(page).getByRole('link',{name:'Tenant timeline'})).toHaveAttribute('href',new RegExp(incidentTenantA));
 });
 test('PINC-027 Detail shows internal notes as operator content and public message separately',async({page})=>{
  await openPlatformIncidents(page);await openDetail(page,tenantIncident.title);
  await expect(detail(page).locator('.platform-incidents__internal-note').filter({hasText:'Tenant operator-only notes'})).toBeVisible();
  await expect(detail(page).locator('.platform-incidents__public-note')).toContainText('Payment service impacted');
 });
 test('PINC-028 Timeline explicitly labels an internal update',async({page})=>{
  await openPlatformIncidents(page);await openDetail(page);
  await expect(detail(page).locator('.platform-incidents__timeline')).toContainText('Private operator note');
  await expect(detail(page).locator('.platform-incidents__timeline')).toContainText('Internal');
 });
 test('PINC-029 Record with zero updates has an honest empty-timeline state',async({page})=>{
  await openPlatformIncidents(page);await openDetail(page,monitoringIncident.title);
  await expect(detail(page)).toContainText('No timeline updates.');
 });
 test('PINC-030 Resolved history hides ordinary edit and lifecycle actions',async({page})=>{
  await openPlatformIncidents(page,{query:'include_resolved=true'});await openDetail(page,resolvedIncident.title);
  await expect(detail(page)).toContainText('Terminal history');
  await expect(detail(page).getByRole('button',{name:'Edit details'})).toHaveCount(0);
  await expect(lifecycle(page)).toHaveCount(0);
 });
 test('PINC-031 Create requires non-blank title',async({page})=>{
  await openPlatformIncidents(page);await expect(create(page).getByRole('button',{name:'Create incident'})).toBeDisabled();
  await create(page).getByPlaceholder('Short operational title').fill('  ');
  await expect(create(page).getByRole('button',{name:'Create incident'})).toBeDisabled();
 });
 test('PINC-032 Tenant-scoped create requires selecting an actual tenant',async({page})=>{
  await openPlatformIncidents(page);await create(page).getByPlaceholder('Short operational title').fill('Fixture customer incident');
  await create(page).getByLabel('Scope').selectOption('tenant');
  await expect(create(page)).toContainText('Select a tenant before creating');
  await expect(create(page).getByRole('button',{name:'Create incident'})).toBeDisabled();
 });
 test('PINC-033 Platform create sends explicit default severity, impact and null tenant',async({page})=>{
  let body:any;await openPlatformIncidents(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===incidentsRoot)body=b;}});
  await create(page).getByPlaceholder('Short operational title').fill('  Fixture incident  ');
  await create(page).getByRole('button',{name:'Create incident'}).click();await expect.poll(()=>Boolean(body)).toBe(true);
  expect(body).toMatchObject({title:'Fixture incident',severity:'minor',impact:'degraded',scope:'platform',tenant_id:null});
  expect(body).not.toHaveProperty('status');
 });
 test('PINC-034 Initial timeline update defaults to internal-only',async({page})=>{
  let body:any;await openPlatformIncidents(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===incidentsRoot)body=b;}});
  await create(page).getByPlaceholder('Short operational title').fill('Synthetic timeline incident');
  await create(page).getByLabel('Initial timeline update').fill('Internal-only fixture');
  await create(page).getByRole('button',{name:'Create incident'}).click();await expect.poll(()=>Boolean(body)).toBe(true);
  expect(body.initial_update).toBe('Internal-only fixture');expect(body.initial_update_public).toBe(false);
 });
 test('PINC-035 Tenant create sends authorized tenant UUID and public update flag',async({page})=>{
  let body:any;await openPlatformIncidents(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===incidentsRoot)body=b;}});
  await create(page).getByPlaceholder('Short operational title').fill('Tenant-side synthetic incident');
  await create(page).getByLabel('Scope').selectOption('tenant');await create(page).getByLabel('Tenant').selectOption(incidentTenantB);
  await create(page).getByLabel('Initial timeline update').fill('Synthetic public timeline');
  await create(page).getByLabel('Make the initial timeline update visible to affected tenant users').check();
  await create(page).getByRole('button',{name:'Create incident'}).click();await expect.poll(()=>Boolean(body)).toBe(true);
  expect(body).toMatchObject({scope:'tenant',tenant_id:incidentTenantB,initial_update_public:true});
 });
 test('PINC-036 Create trims internal and public fields independently',async({page})=>{
  let body:any;await openPlatformIncidents(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===incidentsRoot)body=b;}});
  await create(page).getByPlaceholder('Short operational title').fill('Fixture trimming');
  await create(page).getByLabel('Internal summary').fill('  Restricted summary  ');
  await create(page).getByLabel('Public message').fill('  Public status  ');
  await create(page).getByLabel('Internal notes').fill('  Operator note  ');
  await create(page).getByRole('button',{name:'Create incident'}).click();await expect.poll(()=>Boolean(body)).toBe(true);
  expect(body.summary).toBe('Restricted summary');expect(body.public_message).toBe('Public status');expect(body.internal_notes).toBe('Operator note');
 });
 test('PINC-037 Edit PATCH only modifies non-lifecycle fields',async({page})=>{
  let body:any,endpoint='';await openPlatformIncidents(page,{onCall:(m,p,q,b)=>{if(m==='PATCH'){body=b;endpoint=p;}}});
  await openDetail(page);await detail(page).getByRole('button',{name:'Edit details'}).click();
  await edit(page).getByLabel('Internal notes').fill('  New operator note  ');
  await edit(page).getByRole('button',{name:'Save changes'}).click();await expect.poll(()=>Boolean(body)).toBe(true);
  expect(endpoint).toBe(`${incidentsRoot}/${ongoingIncident.id}`);expect(body.internal_notes).toBe('New operator note');
  for(const key of ['status','scope','tenant_id','started_at','resolved_at'])expect(body).not.toHaveProperty(key);
 });
 test('PINC-038 Cancel edit leaves server row untouched',async({page})=>{
  const writes:string[]=[];await openPlatformIncidents(page,{onCall:(m,p)=>{if(m==='PATCH')writes.push(p);}});
  await openDetail(page);await detail(page).getByRole('button',{name:'Edit details'}).click();
  await edit(page).getByLabel('Title').fill('Unsaved change');await edit(page).getByRole('button',{name:'Cancel edit'}).click();
  await expect(edit(page)).toHaveCount(0);expect(writes).toHaveLength(0);
 });
 test('PINC-039 Timeline POST uses explicit status and private visibility',async({page})=>{
  let body:any,endpoint='';await openPlatformIncidents(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p.endsWith('/updates')){body=b;endpoint=p;}}});
  await openDetail(page);await lifecycle(page).getByLabel('Update message').fill('  Recorded synthetic mitigation  ');
  await lifecycle(page).getByRole('button',{name:'Add update'}).click();await expect.poll(()=>Boolean(body)).toBe(true);
  expect(endpoint).toBe(`${incidentsRoot}/${ongoingIncident.id}/updates`);
  expect(body).toEqual({status:'monitoring',message:'Recorded synthetic mitigation',is_public:false});
 });
 test('PINC-040 Resolve requires confirmation before final timeline mutation',async({page})=>{
  const writes:string[]=[];await openPlatformIncidents(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/updates'))writes.push(p);}});
  await openDetail(page);await lifecycle(page).getByLabel('Status').selectOption('resolved');
  await lifecycle(page).getByLabel('Update message').fill('Synthetic resolved operator record');
  let prompt='';page.once('dialog',d=>{prompt=d.message();void d.dismiss();});
  await lifecycle(page).getByRole('button',{name:'Resolve incident'}).click();
  expect(prompt).toContain('Resolution makes incident history terminal');expect(writes).toHaveLength(0);
 });
 test('PINC-041 Cancel requires a nonblank internal reason and confirmation',async({page})=>{
  const writes:string[]=[];await openPlatformIncidents(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/cancel'))writes.push(p);}});
  await openDetail(page);await expect(lifecycle(page).getByRole('button',{name:'Cancel incident'})).toBeDisabled();
  await lifecycle(page).getByPlaceholder('Required reason').fill('Manual operator cancellation');
  let prompt='';page.once('dialog',d=>{prompt=d.message();void d.dismiss();});
  await lifecycle(page).getByRole('button',{name:'Cancel incident'}).click();
  expect(prompt).toContain('reason is recorded internally');expect(writes).toHaveLength(0);
 });
});

/** Batch 90 continuation — source-traced browser contracts; real authorization and
 * tenant public-feed guarantees stay unverified in Phase 1. */
test.describe('Platform Incidents — lifecycle acceptance, resilience and protected evidence (BATCH_090_GENERATED_UNRUN)',()=>{
 test('PINC-042 Resolve acceptance records a terminal timeline update with explicit visibility',async({page})=>{
  let body:any;await openPlatformIncidents(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p.endsWith('/updates'))body=b;}});
  await openDetail(page);await lifecycle(page).getByLabel('Status').selectOption('resolved');
  await lifecycle(page).getByLabel('Update message').fill('  Verified operator resolution note  ');
  await lifecycle(page).getByLabel('Make this update visible to affected tenant users').check();
  page.once('dialog',d=>void d.accept());await lifecycle(page).getByRole('button',{name:'Resolve incident'}).click();
  await expect.poll(()=>Boolean(body)).toBe(true);expect(body).toEqual({status:'resolved',message:'Verified operator resolution note',is_public:true});
  await expect(root(page)).toContainText('Incident resolved with a timeline update.');
 });
 test('PINC-043 Cancel acceptance posts trimmed reason only to dedicated endpoint',async({page})=>{
  const requests:any[]=[];await openPlatformIncidents(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p.endsWith('/cancel'))requests.push({p,b});}});
  await openDetail(page);await lifecycle(page).getByPlaceholder('Required reason').fill('  Duplicate event confirmed  ');
  page.once('dialog',d=>void d.accept());await lifecycle(page).getByRole('button',{name:'Cancel incident'}).click();
  await expect.poll(()=>requests.length).toBe(1);expect(requests[0]).toEqual({p:`${incidentsRoot}/${ongoingIncident.id}/cancel`,b:{reason:'Duplicate event confirmed'}});
 });
 test('PINC-044 Explicit public timeline checkbox changes outbound visibility',async({page})=>{
  let body:any;await openPlatformIncidents(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p.endsWith('/updates'))body=b;}});
  await openDetail(page);await lifecycle(page).getByLabel('Update message').fill('Tenant-visible update');
  await lifecycle(page).getByLabel('Make this update visible to affected tenant users').check();
  await lifecycle(page).getByRole('button',{name:'Add update'}).click();
  await expect.poll(()=>Boolean(body)).toBe(true);expect(body.is_public).toBe(true);
 });
 test('PINC-045 Blank timeline update blocks POST including whitespace-only text',async({page})=>{
  let writes=0;await openPlatformIncidents(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/updates'))writes++;}});
  await openDetail(page);await expect(lifecycle(page).getByRole('button',{name:'Add update'})).toBeDisabled();
  await lifecycle(page).getByLabel('Update message').fill('   ');
  await expect(lifecycle(page).getByRole('button',{name:'Add update'})).toBeDisabled();expect(writes).toBe(0);
 });
 test('PINC-046 Whitespace-only cancellation reason never enables terminal POST',async({page})=>{
  let writes=0;await openPlatformIncidents(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/cancel'))writes++;}});
  await openDetail(page);await lifecycle(page).getByPlaceholder('Required reason').fill(' \t ');
  await expect(lifecycle(page).getByRole('button',{name:'Cancel incident'})).toBeDisabled();expect(writes).toBe(0);
 });
 test('PINC-047 Successful create resets form and selects newly created detail',async({page})=>{
  await openPlatformIncidents(page);await create(page).getByPlaceholder('Short operational title').fill('New lifecycle fixture');
  await create(page).getByRole('button',{name:'Create incident'}).click();
  await expect(create(page).getByPlaceholder('Short operational title')).toHaveValue('');
  await expect(detail(page).locator('.platform-incidents__detail')).toContainText('New lifecycle fixture');
 });
 test('PINC-048 Failed create keeps typed form and shows application error',async({page})=>{
  await openPlatformIncidents(page,{overrides:{'POST /platform/incidents':{status:503,json:{message:'Synthetic create outage'}}}});
  await create(page).getByPlaceholder('Short operational title').fill('Keep incident draft');
  await create(page).getByRole('button',{name:'Create incident'}).click();
  await expect(root(page).locator('.platform-incidents__blocking-error')).toContainText('Synthetic create outage');
  await expect(create(page).getByPlaceholder('Short operational title')).toHaveValue('Keep incident draft');
 });
 test('PINC-049 Browser datetime invalidity disables create without fabricated server message',async({page})=>{
  let writes=0;await openPlatformIncidents(page,{onCall:(m,p)=>{if(m==='POST'&&p===incidentsRoot)writes++;}});
  await create(page).getByPlaceholder('Short operational title').fill('Time check');
  await create(page).getByLabel('Started at').fill('');
  await expect(create(page).getByRole('button',{name:'Create incident'})).toBeDisabled();expect(writes).toBe(0);
 });
 test('PINC-050 Scope switching removes stale tenant selection',async({page})=>{
  await openPlatformIncidents(page);await create(page).getByLabel('Scope').selectOption('tenant');
  await create(page).getByLabel('Tenant').selectOption(incidentTenantA);await create(page).getByLabel('Scope').selectOption('platform');
  await create(page).getByLabel('Scope').selectOption('tenant');await expect(create(page).getByLabel('Tenant')).toHaveValue('');
 });
 test('PINC-051 Edit save requires a change and valid nonblank title',async({page})=>{
  await openPlatformIncidents(page);await openDetail(page);await detail(page).getByRole('button',{name:'Edit details'}).click();
  await expect(edit(page).getByRole('button',{name:'Save changes'})).toBeDisabled();
  await edit(page).getByLabel('Title').fill('   ');await expect(edit(page).getByRole('button',{name:'Save changes'})).toBeDisabled();
  await edit(page).getByLabel('Title').fill('Renamed incident fixture');await expect(edit(page).getByRole('button',{name:'Save changes'})).toBeEnabled();
 });
 test('PINC-052 Edit success closes panel and refreshes the incident registry',async({page})=>{
  let lists=0;await openPlatformIncidents(page,{onCall:(m,p)=>{if(m==='GET'&&p===incidentsRoot)lists++;}});
  await openDetail(page);await detail(page).getByRole('button',{name:'Edit details'}).click();
  await edit(page).getByLabel('Title').fill('Edited incident fixture');await edit(page).getByRole('button',{name:'Save changes'}).click();
  await expect(edit(page)).toHaveCount(0);await expect(root(page)).toContainText('Incident details updated.');
  await expect.poll(()=>lists).toBeGreaterThan(1);
 });
 test('PINC-053 Failed edit retains editing inputs and last valid registry row',async({page})=>{
  await openPlatformIncidents(page,{overrides:{[`PATCH ${incidentsRoot}/${ongoingIncident.id}`]:{status:409,json:{message:'Synthetic edit conflict'}}}});
  await openDetail(page);await detail(page).getByRole('button',{name:'Edit details'}).click();
  await edit(page).getByLabel('Title').fill('Unsaved title during conflict');await edit(page).getByRole('button',{name:'Save changes'}).click();
  await expect(root(page).locator('.platform-incidents__blocking-error')).toContainText('Synthetic edit conflict');
  await expect(edit(page).getByLabel('Title')).toHaveValue('Unsaved title during conflict');await expect(card(page,ongoingIncident.title)).toBeVisible();
 });
 test('PINC-054 Failed update preserves selected timeline and reports server error',async({page})=>{
  await openPlatformIncidents(page,{overrides:{[`POST ${incidentsRoot}/${ongoingIncident.id}/updates`]:{status:503,json:{message:'Synthetic timeline failure'}}}});
  await openDetail(page);await lifecycle(page).getByLabel('Update message').fill('Unsent synthetic note');
  await lifecycle(page).getByRole('button',{name:'Add update'}).click();
  await expect(root(page).locator('.platform-incidents__blocking-error')).toContainText('Synthetic timeline failure');
  await expect(detail(page).locator('.platform-incidents__timeline')).toContainText('Private operator note');
 });
 test('PINC-055 Cancel failure never reports successful terminal transition',async({page})=>{
  await openPlatformIncidents(page,{overrides:{[`POST ${incidentsRoot}/${ongoingIncident.id}/cancel`]:{status:503,json:{message:'Synthetic cancel failure'}}}});
  await openDetail(page);await lifecycle(page).getByPlaceholder('Required reason').fill('Synthetic revoke');
  page.once('dialog',d=>void d.accept());await lifecycle(page).getByRole('button',{name:'Cancel incident'}).click();
  await expect(root(page).locator('.platform-incidents__blocking-error')).toContainText('Synthetic cancel failure');
  await expect(detail(page).locator('.platform-incidents__detail')).toContainText('Active incident');
 });
 test('PINC-056 Resolve failure retains active incident rather than inventing recovery',async({page})=>{
  await openPlatformIncidents(page,{overrides:{[`POST ${incidentsRoot}/${ongoingIncident.id}/updates`]:{status:409,json:{message:'Synthetic resolve conflict'}}}});
  await openDetail(page);await lifecycle(page).getByLabel('Status').selectOption('resolved');
  await lifecycle(page).getByLabel('Update message').fill('Attempt to resolve');
  page.once('dialog',d=>void d.accept());await lifecycle(page).getByRole('button',{name:'Resolve incident'}).click();
  await expect(root(page).locator('.platform-incidents__blocking-error')).toContainText('Synthetic resolve conflict');
  await expect(detail(page).locator('.platform-incidents__detail')).toContainText('Active incident');
 });
 test('PINC-057 Detail GET failure exposes independent retry control',async({page})=>{
  await openPlatformIncidents(page,{overrides:{[`GET ${incidentsRoot}/${ongoingIncident.id}`]:{status:503,json:{message:'Synthetic detail outage'}}}});
  await card(page,ongoingIncident.title).getByRole('button',{name:'Open detail'}).click();
  await expect(detail(page)).toContainText('Incident detail unavailable');
  await expect(detail(page).getByRole('button',{name:'Retry'})).toBeVisible();
 });
 test('PINC-058 Detail retry recovers timeline after initial automatic retry is exhausted',async({page})=>{
  let failures=0;await openPlatformIncidents(page,{respond:(m,p)=>{if(m==='GET'&&p===`${incidentsRoot}/${ongoingIncident.id}`&&failures++<2)return {status:503,json:{message:'Temporary detail outage'}};}});
  await card(page,ongoingIncident.title).getByRole('button',{name:'Open detail'}).click();
  await expect(detail(page).getByRole('button',{name:'Retry'})).toBeVisible();
  await detail(page).getByRole('button',{name:'Retry'}).click();
  await expect(detail(page).locator('.platform-incidents__timeline')).toContainText('Private operator note');
 });
 test('PINC-059 Initial list error shows unavailable state and retry',async({page})=>{
  await openPlatformIncidents(page,{overrides:{[`GET ${incidentsRoot}`]:{status:503,json:{message:'Synthetic registry outage'}}}});
  await expect(registry(page)).toContainText('Incident registry unavailable');
  await expect(registry(page).getByRole('button',{name:'Retry'})).toBeVisible();
 });
 test('PINC-060 Registry retry restores list after automatic retry is exhausted',async({page})=>{
  let failures=0;await openPlatformIncidents(page,{respond:(m,p)=>{if(m==='GET'&&p===incidentsRoot&&failures++<2)return {status:503,json:{message:'Temporary list outage'}};}});
  await expect(registry(page).getByRole('button',{name:'Retry'})).toBeVisible();await registry(page).getByRole('button',{name:'Retry'}).click();
  await expect(card(page,ongoingIncident.title)).toBeVisible();
 });
 test('PINC-061 Failed refresh labels existing rows as last successful snapshot',async({page})=>{
  let requests=0;await openPlatformIncidents(page,{respond:(m,p)=>{if(m==='GET'&&p===incidentsRoot&&++requests>1)return {status:503,json:{message:'Synthetic refresh outage'}};}});
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(root(page)).toContainText('Showing the last successful snapshot.');
  await expect(card(page,ongoingIncident.title)).toBeVisible();
 });
 test('PINC-062 Tenant directory error does not hide unrelated platform incident records',async({page})=>{
  await openPlatformIncidents(page,{overrides:{'GET /platform/tenants':{status:503,json:{message:'Tenant directory down'}}}});
  await expect(root(page)).toContainText('Tenant directory unavailable.');await expect(card(page,ongoingIncident.title)).toBeVisible();
 });
 test('PINC-063 Refresh independently requests registry, directory and selected detail',async({page})=>{
  const paths:string[]=[];await openPlatformIncidents(page,{onCall:(m,p)=>{if(m==='GET')paths.push(p);}});
  await openDetail(page);paths.length=0;await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect.poll(()=>paths.includes(incidentsRoot)&&paths.includes('/platform/tenants')&&paths.includes(`${incidentsRoot}/${ongoingIncident.id}`)).toBe(true);
 });
 test('PINC-064 Negative or nonnumeric URL offset is clamped in API query',async({page})=>{
  const offsets:string[]=[];await openPlatformIncidents(page,{query:'offset=-40',onCall:(m,p,q)=>{if(m==='GET'&&p===incidentsRoot)offsets.push(q.get('offset')||'');}});
  await expect.poll(()=>offsets.at(-1)).toBe('0');
 });
 test('PINC-065 Editing a filter discards prior offset while preserving other query filters',async({page})=>{
  await openPlatformIncidents(page,{query:'offset=50&scope=platform',records:manyIncidentRecords(55)});
  await filters(page).getByLabel('Severity').selectOption('major');
  expect(new URL(page.url()).searchParams.get('offset')).toBeNull();expect(new URL(page.url()).searchParams.get('scope')).toBe('platform');
 });
 test('PINC-066 Without TENANTS_READ tenant name search is not exposed',async({page})=>{
  await openPlatformIncidents(page,{permissions:omit('platform.tenants.read')});
  await expect(filters(page).getByLabel('Search')).toHaveAttribute('placeholder',/public message/);
  await openDetail(page,tenantIncident.title);
  await expect(detail(page).getByRole('link',{name:'Tenant timeline'})).toHaveCount(0);
 });
 test('PINC-067 Audit grant gates registry and selected-detail audit links',async({page})=>{
  await openPlatformIncidents(page,{permissions:omit('platform.audit.read')});
  await expect(registry(page).getByRole('link',{name:/Audit/})).toHaveCount(0);
  await openDetail(page);await expect(detail(page).getByRole('link',{name:'Audit evidence'})).toHaveCount(0);
 });
 test('PINC-068 Supporting route links respect maintenance, announcements and jobs grants',async({page})=>{
  await openPlatformIncidents(page,{permissions:omit('platform.maintenance.read','platform.announcements.read','platform.jobs.read')});
  const boundary=section(page,'Evidence boundary');
  for(const label of ['Maintenance','Announcements','Operational jobs'])await expect(boundary.getByRole('link',{name:label})).toHaveCount(0);
 });
 test('PINC-069 Support context requires all three tenant/support source permissions',async({page})=>{
  await openPlatformIncidents(page,{permissions:omit('platform.support_sessions.read')});
  await openDetail(page,tenantIncident.title);await expect(detail(page).getByRole('link',{name:'Support context'})).toHaveCount(0);
  await expect(section(page,'Evidence boundary').getByRole('link',{name:'Support cockpit'})).toHaveCount(0);
 });
 test.skip('PINC-070 Real backend authorization denies direct mutation without INCIDENTS_WRITE — Phase 2 real evidence required',async()=>{
  // NOT_BROWSER_TESTABLE_WITH_SYNTHETIC_HTTP: provision disposable DB, real principals and evidence before enabling.
 });
 test.skip('PINC-071 Server rejects tenant target references without TENANTS_READ — Phase 2 real evidence required',async()=>{
  // NOT_BROWSER_TESTABLE_WITH_SYNTHETIC_HTTP: provision disposable DB, real principals and evidence before enabling.
 });
 test.skip('PINC-072 Server validates severity and lifecycle enums against malformed direct payloads — Phase 2 real evidence required',async()=>{
  // NOT_BROWSER_TESTABLE_WITH_SYNTHETIC_HTTP: provision disposable DB, real principals and evidence before enabling.
 });
 test.skip('PINC-073 Real tenant public feed excludes internal summaries and notes — Phase 2 real evidence required',async()=>{
  // NOT_BROWSER_TESTABLE_WITH_SYNTHETIC_HTTP: provision disposable DB, real principals and evidence before enabling.
 });
 test.skip('PINC-074 Real tenant public feed excludes private timeline updates — Phase 2 real evidence required',async()=>{
  // NOT_BROWSER_TESTABLE_WITH_SYNTHETIC_HTTP: provision disposable DB, real principals and evidence before enabling.
 });
 test.skip('PINC-075 Real incident notifications and durable identity redaction — Phase 2 real evidence required',async()=>{
  // NOT_BROWSER_TESTABLE_WITH_SYNTHETIC_HTTP: provision disposable DB, real principals and evidence before enabling.
 });
 test.skip('PINC-076 PostgreSQL transactions and audit durability across lifecycle mutations — Phase 2 real evidence required',async()=>{
  // NOT_BROWSER_TESTABLE_WITH_SYNTHETIC_HTTP: provision disposable DB, real principals and evidence before enabling.
 });
 test.skip('PINC-077 Competing lifecycle writes preserve terminal historical immutability — Phase 2 real evidence required',async()=>{
  // NOT_BROWSER_TESTABLE_WITH_SYNTHETIC_HTTP: provision disposable DB, real principals and evidence before enabling.
 });
 test.skip('PINC-078 Two real tenants and real operator principals enforce isolation — Phase 2 real evidence required',async()=>{
  // NOT_BROWSER_TESTABLE_WITH_SYNTHETIC_HTTP: provision disposable DB, real principals and evidence before enabling.
 });
 test.skip('PINC-079 Independent external restoration and customer acceptance corroboration — Phase 2 real evidence required',async()=>{
  // NOT_BROWSER_TESTABLE_WITH_SYNTHETIC_HTTP: provision disposable DB, real principals and evidence before enabling.
 });
 test.skip('PINC-080 Real PostgreSQL pagination totals and server filter consistency — Phase 2 real evidence required',async()=>{
  // NOT_BROWSER_TESTABLE_WITH_SYNTHETIC_HTTP: provision disposable DB, real principals and evidence before enabling.
 });
});

/** Batch 163: additional source-anchored permission and incident UI contracts.
 * Static authoring only; intercepted HTTP does not prove real authorization or persistence. */
test.describe('Platform Incidents — permission and form boundary regressions (B163 GENERATED_UNRUN)',()=>{
 test('PINC-081 Read-only hero advertises read access and retains non-mutating refresh',async({page})=>{
  await openPlatformIncidents(page,{permissions:omit('platform.incidents.write')});
  await expect(root(page)).toContainText('Read only');
  await expect(root(page).getByRole('button',{name:'Refresh',exact:true})).toBeVisible();
  await expect(create(page)).toHaveCount(0);
 });
 test('PINC-082 Write grant displays create and active incident lifecycle controls',async({page})=>{
  await openPlatformIncidents(page);await expect(root(page)).toContainText('Write enabled');
  await expect(create(page).getByRole('button',{name:'Create incident'})).toBeVisible();
  await openDetail(page);await expect(lifecycle(page).getByRole('button',{name:'Add update'})).toBeVisible();
 });
 test('PINC-083 Read-only incident detail still shows timeline evidence but no write actions',async({page})=>{
  await openPlatformIncidents(page,{permissions:omit('platform.incidents.write')});await openDetail(page);
  await expect(detail(page).locator('.platform-incidents__timeline')).toContainText('Private operator note');
  await expect(detail(page).getByRole('button',{name:'Edit details'})).toHaveCount(0);
  await expect(lifecycle(page)).toHaveCount(0);
 });
 test('PINC-084 Registry audit link uses incident id and tenant timeline keeps tenant scope',async({page})=>{
  await openPlatformIncidents(page);
  await expect(card(page,tenantIncident.title).getByRole('link',{name:'Audit'})).toHaveAttribute('href',`/platform/audit?target_id=${tenantIncident.id}`);
  await expect(card(page,tenantIncident.title).getByRole('link',{name:'Tenant timeline'})).toHaveAttribute('href',`/platform/tenant-timeline?tenant_id=${incidentTenantA}&source=incident`);
 });
 test('PINC-085 Audit denial does not conceal tenant timeline from an independently authorized reader',async({page})=>{
  await openPlatformIncidents(page,{permissions:omit('platform.audit.read')});
  await expect(card(page,tenantIncident.title).getByRole('link',{name:'Audit'})).toHaveCount(0);
  await expect(card(page,tenantIncident.title).getByRole('link',{name:'Tenant timeline'})).toBeVisible();
 });
 test('PINC-086 Missing SLA permission independently hides support context and cockpit links',async({page})=>{
  await openPlatformIncidents(page,{permissions:omit('platform.sla.read')});await openDetail(page,tenantIncident.title);
  await expect(detail(page).getByRole('link',{name:'Support context'})).toHaveCount(0);
  await expect(section(page,'Evidence boundary').getByRole('link',{name:'Support cockpit'})).toHaveCount(0);
 });
 test('PINC-087 Missing tenant-directory permission hides support links despite support and SLA grants',async({page})=>{
  await openPlatformIncidents(page,{permissions:omit('platform.tenants.read')});await openDetail(page,tenantIncident.title);
  await expect(detail(page).getByRole('link',{name:'Support context'})).toHaveCount(0);
  await expect(section(page,'Evidence boundary').getByRole('link',{name:'Support cockpit'})).toHaveCount(0);
 });
 test('PINC-088 Fully authorized tenant detail provides explicitly tenant-scoped support link',async({page})=>{
  await openPlatformIncidents(page);await openDetail(page,tenantIncident.title);
  await expect(detail(page).getByRole('link',{name:'Support context'})).toHaveAttribute('href',`/platform/support-operations-cockpit?tenant_id=${incidentTenantA}`);
  await expect(section(page,'Evidence boundary').getByRole('link',{name:'Support cockpit'})).toHaveAttribute('href','/platform/support-operations-cockpit');
 });
 test('PINC-089 Create title and prose inputs enforce frontend maxLength constraints',async({page})=>{
  await openPlatformIncidents(page);
  await expect(create(page).getByPlaceholder('Short operational title')).toHaveAttribute('maxLength','250');
  for(const label of ['Internal summary','Public message','Internal notes','Initial timeline update'])
   await expect(create(page).getByLabel(label)).toHaveAttribute('maxLength','4000');
 });
 test('PINC-090 Edit and timeline forms expose bounded text length without changing lifecycle identity',async({page})=>{
  await openPlatformIncidents(page);await openDetail(page);
  await expect(lifecycle(page).getByLabel('Update message')).toHaveAttribute('maxLength','4000');
  await expect(lifecycle(page).getByPlaceholder('Required reason')).toHaveAttribute('maxLength','2000');
  await detail(page).getByRole('button',{name:'Edit details'}).click();
  await expect(edit(page).getByLabel('Title')).toHaveAttribute('maxLength','250');
  await expect(edit(page).getByLabel('Internal notes')).toHaveAttribute('maxLength','4000');
  await expect(edit(page).getByLabel('Scope')).toHaveCount(0);
 });
 test('PINC-091 Search normalizes surrounding whitespace before sending the API query',async({page})=>{
  const q:string[]=[];await openPlatformIncidents(page,{onCall:(m,p,s)=>{if(m==='GET'&&p===incidentsRoot)q.push(s.toString());}});
  await filters(page).getByLabel('Search').fill('  connectivity  ');
  await expect.poll(()=>q.some(x=>new URLSearchParams(x).get('search')==='connectivity')).toBe(true);
 });
 test('PINC-092 Whitespace-only search is not forwarded to registry search parameter',async({page})=>{
  const q:string[]=[];await openPlatformIncidents(page,{onCall:(m,p,s)=>{if(m==='GET'&&p===incidentsRoot)q.push(s.toString());}});
  await filters(page).getByLabel('Search').fill(' \t ');
  await expect.poll(()=>new URL(page.url()).searchParams.get('search')).toBe(' \t ');
  expect(new URLSearchParams(q.at(-1)).has('search')).toBe(false);
 });
 test('PINC-093 Scope change preserves independent status query and clears prior offset',async({page})=>{
  await openPlatformIncidents(page,{query:'status=identified&offset=50'});
  await filters(page).getByLabel('Scope').selectOption('tenant');
  const p=new URL(page.url()).searchParams;
  expect(p.get('status')).toBe('identified');expect(p.get('scope')).toBe('tenant');expect(p.has('offset')).toBe(false);
 });
 test('PINC-094 Explicit critical severity and major outage impact survive create mutation payload',async({page})=>{
  let body:any;await openPlatformIncidents(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===incidentsRoot)body=b;}});
  await create(page).getByPlaceholder('Short operational title').fill('Controlled incident criticality');
  await create(page).getByLabel('Severity').selectOption('critical');
  await create(page).getByLabel('Impact').selectOption('major_outage');
  await create(page).getByRole('button',{name:'Create incident'}).click();
  await expect.poll(()=>Boolean(body)).toBe(true);expect(body).toMatchObject({severity:'critical',impact:'major_outage'});
 });
 test('PINC-095 Rejected creation retains its draft and does not display success banner',async({page})=>{
  await openPlatformIncidents(page,{overrides:{'POST /platform/incidents':{status:422,json:{message:'Synthetic validation reject'}}}});
  await create(page).getByPlaceholder('Short operational title').fill('Preserved after reject');
  await create(page).getByRole('button',{name:'Create incident'}).click();
  await expect(root(page).locator('.platform-incidents__blocking-error')).toContainText('Synthetic validation reject');
  await expect(create(page).getByPlaceholder('Short operational title')).toHaveValue('Preserved after reject');
  await expect(root(page).locator('.platform-incidents__success')).toHaveCount(0);
 });
 test('PINC-096 User-identity permission revocation redacts timeline actor without removing entry',async({page})=>{
  await openPlatformIncidents(page,{permissions:omit('platform.users.read')});await openDetail(page);
  await expect(detail(page).locator('.platform-incidents__timeline-item')).toHaveCount(1);
  await expect(detail(page).locator('.platform-incidents__timeline')).toContainText('Actor: Restricted');
  await expect(detail(page).locator('.platform-incidents__timeline')).not.toContainText('actor@fixture.test');
 });
 test('PINC-097 Unauthorized prefilled tenant URL announces restricted filter and omits API tenant id',async({page})=>{
  const q:string[]=[];await openPlatformIncidents(page,{query:`tenant_id=${incidentTenantA}`,permissions:omit('platform.tenants.read'),
    onCall:(m,p,s)=>{if(m==='GET'&&p===incidentsRoot)q.push(s.toString());}});
  await expect(root(page).locator('.platform-incidents__warning')).toContainText('Tenant filter restricted.');
  expect(q.length).toBeGreaterThan(0);expect(new URLSearchParams(q.at(-1)).has('tenant_id')).toBe(false);
 });
 test('PINC-098 Identified timeline update has explicit nonterminal status and private visibility',async({page})=>{
  let payload:any;await openPlatformIncidents(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p.endsWith('/updates'))payload=b;}});
  await openDetail(page);await lifecycle(page).getByLabel('Status').selectOption('identified');
  await lifecycle(page).getByLabel('Update message').fill('  Investigation cause isolated  ');
  await lifecycle(page).getByRole('button',{name:'Add update'}).click();
  await expect.poll(()=>Boolean(payload)).toBe(true);
  expect(payload).toEqual({status:'identified',message:'Investigation cause isolated',is_public:false});
 });
 test('PINC-099 Recorded success is dismissible without deleting incident state',async({page})=>{
  await openPlatformIncidents(page);await create(page).getByPlaceholder('Short operational title').fill('Dismissible record');
  await create(page).getByRole('button',{name:'Create incident'}).click();
  await expect(root(page).locator('.platform-incidents__success')).toContainText('Incident created in Investigating state.');
  await root(page).getByRole('button',{name:'Dismiss'}).click();
  await expect(root(page).locator('.platform-incidents__success')).toHaveCount(0);
  await expect(detail(page).locator('.platform-incidents__detail')).toContainText('Dismissible record');
 });
});
