/** Batch 77 · PSD-001…041 · source-grounded Platform Service Dependencies tests.
 * GENERATED_UNRUN. Browser/intercept evidence only; no claims about real health, DB or RBAC. */
import {test,expect,type Page} from '@playwright/test';
import {openDependencies,dependencyPermissions,dependencyIdA,depVendorId,depOwnerId,
 criticalDependency,healthyDependency,archivedDependency,manyDependencies} from '../../../support/platformServiceDependenciesFixture';
const root=(p:Page)=>p.locator('.platform-service-dependencies');
const form=(p:Page)=>p.locator('#platform-service-dependencies-form');
const filter=(p:Page)=>root(p).locator('.platform-service-dependencies__section').filter({hasText:'Filters are URL-backed'}).first();
const evidence=(p:Page)=>root(p).locator('.platform-service-dependencies__section').filter({hasText:'Dependency evidence'}).first();
const cards=(p:Page)=>p.locator('.platform-service-dependencies__card');
const card=(p:Page,n:string)=>cards(p).filter({has:p.getByRole('heading',{name:n,exact:true})});
const pager=(p:Page)=>evidence(p).locator('.platform-service-dependencies__pagination');
const without=(...p:string[])=>dependencyPermissions.filter(x=>!p.includes(x));
const endpoint='/platform/service-dependencies';

test.describe('Platform Service Dependencies — evidence, identity and permissions (GENERATED_UNRUN)',()=>{
 test('PSD-001 Protected service-dependencies workspace exposes registry title',async({page})=>{
  await openDependencies(page);await expect(root(page)).toContainText('Platform operations');
  await expect(root(page)).toContainText('Filtered registry summary');
 });
 test('PSD-002 Evidence boundary does not certify external service health',async({page})=>{
  await openDependencies(page);await expect(root(page)).toContainText('They do not prove the external service is actually healthy');
  await expect(root(page)).toContainText('Historical check timestamps can include legacy registry edits');
 });
 test('PSD-003 Major outage posture is review required from operator-recorded summary',async({page})=>{
  await openDependencies(page);await expect(root(page)).toContainText('Review required');
  await expect(page.getByLabel('Service dependency registry summary')).toContainText('Major outage');
 });
 test('PSD-004 Attention summary distinguishes degraded/outage/unknown from operational',async({page})=>{
  await openDependencies(page);await expect(page.getByLabel('Service dependency registry summary')).toContainText('Attention recorded');
  await expect(root(page)).toContainText('Degraded, outage or unknown application statuses');
 });
 test('PSD-005 Critical impact is an internal classification, not independent health evidence',async({page})=>{
  await openDependencies(page);await expect(root(page)).toContainText('Internal business-impact classification');
  await expect(card(page,criticalDependency.name).locator('[data-tone="danger"]').filter({hasText:'critical impact'})).toHaveCount(1);
 });
 test('PSD-006 Major outage badge receives danger tone',async({page})=>{
  await openDependencies(page);await expect(card(page,criticalDependency.name).locator('[data-tone="danger"]').filter({hasText:'major outage'})).toHaveCount(1);
 });
 test('PSD-007 Operational/low dependency receives good status and impact tones',async({page})=>{
  await openDependencies(page);const current=card(page,healthyDependency.name);
  await expect(current.locator('[data-tone="good"]').filter({hasText:'operational'})).toHaveCount(1);
  await expect(current.locator('[data-tone="good"]').filter({hasText:'low impact'})).toHaveCount(1);
 });
 test('PSD-008 Card exposes recorded check, status-change and update timestamps separately',async({page})=>{
  await openDependencies(page);const current=card(page,criticalDependency.name);
  await expect(current).toContainText('Recorded check time');await expect(current).toContainText('Status changed');
  await expect(current).toContainText('Updated');
 });
 test('PSD-009 No check timestamp reports Not recorded without implying a live health check',async({page})=>{
  await openDependencies(page);const current=card(page,healthyDependency.name);
  await expect(current).toContainText('Recorded check time');await expect(current).toContainText('Not recorded');
 });
 test('PSD-010 Status page external anchor has noreferrer and new-tab protections',async({page})=>{
  await openDependencies(page);const a=card(page,criticalDependency.name).getByRole('link',{name:'Status page'});
  await expect(a).toHaveAttribute('href','https://status.fixture.example');
  await expect(a).toHaveAttribute('target','_blank');await expect(a).toHaveAttribute('rel','noreferrer');
 });
 test('PSD-011 Escalation destination is an external anchor, not an automatic escalation',async({page})=>{
  await openDependencies(page);const a=card(page,criticalDependency.name).getByRole('link',{name:'Escalation destination'});
  await expect(a).toHaveAttribute('href','https://escalate.fixture.example');
  await expect(a).toHaveAttribute('rel','noreferrer');
 });
 test('PSD-012 Missing external destinations never get placeholder links',async({page})=>{
  await openDependencies(page);const current=card(page,healthyDependency.name);
  await expect(current.getByRole('link',{name:'Status page'})).toHaveCount(0);
  await expect(current.getByRole('link',{name:'Escalation destination'})).toHaveCount(0);
 });
 test('PSD-013 Vendor identity link points to filtered vendor registry',async({page})=>{
  await openDependencies(page);await expect(card(page,criticalDependency.name).getByRole('link',{name:'Vendor registry'}))
   .toHaveAttribute('href',/\/platform\/vendors\?search=Fixture/);
 });
 test('PSD-014 Missing vendor-read permission redacts vendor identities and removes filter',async({page})=>{
  await openDependencies(page,{permissions:without('platform.vendors.read')});
  await expect(root(page)).toContainText('Vendor identity/filtering requires PLATFORM_VENDORS_READ');
  await expect(card(page,criticalDependency.name)).not.toContainText('Fixture Payment Vendor');
  await expect(filter(page).getByLabel('Vendor')).toHaveCount(0);
  await expect(form(page).getByLabel('Vendor')).toHaveCount(0);
 });
 test('PSD-015 Missing users-read permission redacts owner/update identities independently',async({page})=>{
  await openDependencies(page,{permissions:without('platform.users.read')});
  await expect(root(page)).toContainText('Owner and updater identities require PLATFORM_USERS_READ');
  await expect(card(page,criticalDependency.name)).not.toContainText('dependency-owner@fixture.test');
  await expect(card(page,criticalDependency.name)).toContainText('Assigned · identity redacted');
  await expect(form(page).getByLabel('Owner')).toHaveCount(0);
 });
 test('PSD-016 Read-only access retains cards but not form or mutable actions',async({page})=>{
  await openDependencies(page,{permissions:without('platform.dependencies.write')});
  await expect(card(page,criticalDependency.name)).toBeVisible();await expect(form(page)).toHaveCount(0);
  for(const action of ['Edit','Record check','Archive'])
   await expect(card(page,criticalDependency.name).getByRole('button',{name:action})).toHaveCount(0);
 });
 test('PSD-017 Missing dependencies.read prevents route and data fetch',async({page})=>{
  const gets:string[]=[];await openDependencies(page,{permissions:without('platform.dependencies.read'),expectHeading:false,
   onCall:(m,p)=>{if(m==='GET'&&p===endpoint)gets.push(p);}});
  await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
  expect(gets).toEqual([]);
 });
 test('PSD-018 Audit navigation is permission-scoped and retains dependency ID',async({page})=>{
  await openDependencies(page);await expect(card(page,criticalDependency.name).getByRole('link',{name:'Audit history'}))
   .toHaveAttribute('href',new RegExp(`target_id=${dependencyIdA}`));
 });
 test('PSD-019 Missing audit.read removes per-dependency audit link',async({page})=>{
  await openDependencies(page,{permissions:without('platform.audit.read')});
  await expect(card(page,criticalDependency.name).getByRole('link',{name:'Audit history'})).toHaveCount(0);
 });
 test('PSD-020 Archived dependency is excluded unless history is requested',async({page})=>{
  await openDependencies(page);await expect(card(page,archivedDependency.name)).toHaveCount(0);
  await filter(page).getByLabel('Include archived history').check();
  await expect(card(page,archivedDependency.name)).toBeVisible();
 });
 test('PSD-021 Archived dependency is neutral and immutable in read view',async({page})=>{
  await openDependencies(page,{query:'include_archived=true'});const current=card(page,archivedDependency.name);
  await expect(current).toContainText('Archived · immutable');
  await expect(current.locator('[data-tone="neutral"]')).toContainText('archived');
  for(const a of ['Edit','Record check','Archive'])await expect(current.getByRole('button',{name:a})).toHaveCount(0);
 });
});

test.describe('Platform Service Dependencies — URL filtering and paging (GENERATED_UNRUN)',()=>{
 test('PSD-022 Status filter updates backend query and results',async({page})=>{
  const status:string[]=[];await openDependencies(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)status.push(q.get('status')||'');}});
  await filter(page).getByLabel('Status').selectOption('operational');
  await expect(card(page,healthyDependency.name)).toBeVisible();await expect(card(page,criticalDependency.name)).toHaveCount(0);
  await expect.poll(()=>status.at(-1)).toBe('operational');
 });
 test('PSD-023 Category filter forwards known category to registry list',async({page})=>{
  await openDependencies(page);await filter(page).getByLabel('Category').selectOption('payment');
  await expect(card(page,criticalDependency.name)).toBeVisible();await expect(card(page,healthyDependency.name)).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('category')).toBe('payment');
 });
 test('PSD-024 Business impact filter forwards business_impact',async({page})=>{
  const impacts:string[]=[];await openDependencies(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)impacts.push(q.get('business_impact')||'');}});
  await filter(page).getByLabel('Business impact').selectOption('critical');
  await expect(card(page,criticalDependency.name)).toBeVisible();await expect(card(page,healthyDependency.name)).toHaveCount(0);
  await expect.poll(()=>impacts.at(-1)).toBe('critical');
 });
 test('PSD-025 Vendor filter forwards exact UUID for authorized operator',async({page})=>{
  const vendors:string[]=[];await openDependencies(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)vendors.push(q.get('vendor_id')||'');}});
  await filter(page).getByLabel('Vendor').selectOption(depVendorId);
  await expect.poll(()=>vendors.at(-1)).toBe(depVendorId);
  await expect(card(page,criticalDependency.name)).toBeVisible();
 });
 test('PSD-026 Only attention statuses excludes operational rows',async({page})=>{
  await openDependencies(page);await filter(page).getByLabel('Only attention statuses').check();
  await expect(card(page,criticalDependency.name)).toBeVisible();await expect(card(page,healthyDependency.name)).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('only_attention')).toBe('true');
 });
 test('PSD-027 Search filters by name or check note',async({page})=>{
  const search:string[]=[];await openDependencies(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)search.push(q.get('search')||'');}});
  await filter(page).getByLabel('Search').fill('Recorded fixture check note');
  await expect(card(page,criticalDependency.name)).toBeVisible();await expect(card(page,healthyDependency.name)).toHaveCount(0);
  await expect.poll(()=>search.at(-1)).toBe('Recorded fixture check note');
 });
 test('PSD-028 Filter criteria persist in shareable URL and reopen correctly',async({page})=>{
  await openDependencies(page,{query:'status=major_outage&business_impact=critical'});
  await expect(filter(page).getByLabel('Status')).toHaveValue('major_outage');
  await expect(filter(page).getByLabel('Business impact')).toHaveValue('critical');
  await expect(card(page,criticalDependency.name)).toBeVisible();
 });
 test('PSD-029 Unsupported status URL stops list transport',async({page})=>{
  const gets:string[]=[];await openDependencies(page,{query:'status=failed',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)gets.push(p);}});
  await expect(root(page)).toContainText('Invalid or forbidden URL filter');expect(gets).toEqual([]);
 });
 test('PSD-030 Unsupported category URL stops list transport',async({page})=>{
  const gets:string[]=[];await openDependencies(page,{query:'category=firewall',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)gets.push(p);}});
  await expect(root(page)).toContainText('Invalid or forbidden URL filter');expect(gets).toEqual([]);
 });
 test('PSD-031 Invalid impact enum in URL stops list transport',async({page})=>{
  const gets:string[]=[];await openDependencies(page,{query:'business_impact=severe',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)gets.push(p);}});
  await expect(root(page)).toContainText('Invalid or forbidden URL filter');expect(gets).toEqual([]);
 });
 test('PSD-032 Malformed vendor UUID blocks list before request',async({page})=>{
  const gets:string[]=[];await openDependencies(page,{query:'vendor_id=not-a-uuid',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)gets.push(p);}});
  await expect(root(page)).toContainText('Invalid or forbidden URL filter');expect(gets).toEqual([]);
 });
 test('PSD-033 Vendor filter is forbidden when vendor read permission absent',async({page})=>{
  const gets:string[]=[];await openDependencies(page,{permissions:without('platform.vendors.read'),query:`vendor_id=${depVendorId}`,
   onCall:(m,p)=>{if(m==='GET'&&p===endpoint)gets.push(p);}});
  await expect(root(page)).toContainText('Invalid or forbidden URL filter');expect(gets).toEqual([]);
 });
 test('PSD-034 Search longer than 200 characters blocks registry transport',async({page})=>{
  const gets:string[]=[];await openDependencies(page,{query:`search=${'X'.repeat(201)}`,
   onCall:(m,p)=>{if(m==='GET'&&p===endpoint)gets.push(p);}});
  await expect(root(page)).toContainText('Invalid or forbidden URL filter');expect(gets).toEqual([]);
 });
 test('PSD-035 Invalid only_attention URL boolean blocks registry',async({page})=>{
  const gets:string[]=[];await openDependencies(page,{query:'only_attention=sometimes',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)gets.push(p);}});
  await expect(root(page)).toContainText('Invalid or forbidden URL filter');expect(gets).toEqual([]);
 });
 test('PSD-036 Invalid include_archived URL boolean blocks registry',async({page})=>{
  const gets:string[]=[];await openDependencies(page,{query:'include_archived=perhaps',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)gets.push(p);}});
  await expect(root(page)).toContainText('Invalid or forbidden URL filter');expect(gets).toEqual([]);
 });
 test('PSD-037 Clear invalid filters resumes evidence GET',async({page})=>{
  const gets:string[]=[];await openDependencies(page,{query:'business_impact=huge',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)gets.push(p);}});
  await root(page).getByRole('button',{name:'Clear filters'}).first().click();
  await expect(card(page,criticalDependency.name)).toBeVisible();
  expect(new URL(page.url()).search).toBe('');expect(gets.length).toBeGreaterThan(0);
 });
 test('PSD-038 Registry uses bounded 50-row server pages',async({page})=>{
  const limits:string[]=[];await openDependencies(page,{rows:manyDependencies(51),onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)limits.push(q.get('limit')||'');}});
  await expect(cards(page)).toHaveCount(50);expect(limits).toContain('50');
 });
 test('PSD-039 Next fetches offset 50 and shows last record',async({page})=>{
  const offsets:string[]=[];await openDependencies(page,{rows:manyDependencies(51),onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)offsets.push(q.get('offset')||'');}});
  await pager(page).getByRole('button',{name:'Next'}).click();
  await expect(card(page,'Fixture Dependency 051')).toBeVisible();expect(offsets).toContain('50');
 });
 test('PSD-040 Previous restores first page and final page disables Next',async({page})=>{
  await openDependencies(page,{rows:manyDependencies(51)});
  await pager(page).getByRole('button',{name:'Next'}).click();
  await expect(card(page,'Fixture Dependency 051')).toBeVisible();
  await expect(pager(page).getByRole('button',{name:'Next'})).toBeDisabled();
  await pager(page).getByRole('button',{name:'Previous'}).click();
  await expect(card(page,'Fixture Dependency 001')).toBeVisible();
 });
 test('PSD-041 No match states evidence limit without claiming no external dependencies',async({page})=>{
  await openDependencies(page,{query:'search=UnmatchedSyntheticDependency'});
  await expect(evidence(page)).toContainText('No dependency records matched.');
  await expect(evidence(page)).toContainText('does not prove that no external dependency exists');
  await expect(cards(page)).toHaveCount(0);
 });
});

/* Batch 78: source-reviewed mutation and recovery coverage. GENERATED_UNRUN. */
test.describe('Platform Service Dependencies — create and guarded edits (GENERATED_UNRUN)',()=>{
 test('PSD-042 Create form starts with defaults and no name',async({page})=>{
  await openDependencies(page);await expect(form(page).getByLabel('Name')).toHaveValue('');
  await expect(form(page).getByLabel('Category')).toHaveValue('other');
  await expect(root(page).getByRole('button',{name:'Create dependency'})).toBeDisabled();
 });
 test('PSD-043 Blank name prevents submission',async({page})=>{
  const posts:any[]=[];await openDependencies(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p===endpoint)posts.push(b);}});
  await form(page).getByLabel('Name').fill('   ');await expect(root(page)).toContainText('Enter a dependency name.');
  await expect(root(page).getByRole('button',{name:'Create dependency'})).toBeDisabled();expect(posts).toHaveLength(0);
 });
 test('PSD-044 Name entry enables create with valid URL defaults',async({page})=>{
  await openDependencies(page);await form(page).getByLabel('Name').fill('New Synthetic Dependency');
  await expect(root(page).getByRole('button',{name:'Create dependency'})).toBeEnabled();
 });
 test('PSD-045 Name input limits entered characters to 200',async({page})=>{
  await openDependencies(page);await expect(form(page).getByLabel('Name')).toHaveAttribute('maxlength','200');
 });
 test('PSD-046 Status and escalation URLs reject non-HTTP protocols',async({page})=>{
  await openDependencies(page);await form(page).getByLabel('Name').fill('URL Guard');
  await form(page).getByLabel('Status page URL').fill('javascript:alert(1)');
  await expect(root(page)).toContainText('Status page must be a valid HTTP or HTTPS URL.');
  await expect(root(page).getByRole('button',{name:'Create dependency'})).toBeDisabled();
  await form(page).getByLabel('Status page URL').fill('https://status.example');
  await form(page).getByLabel('Escalation URL').fill('file:///private');
  await expect(root(page)).toContainText('Escalation destination must be a valid HTTP or HTTPS URL.');
 });
 test('PSD-047 Valid HTTPS links restore submit availability',async({page})=>{
  await openDependencies(page);await form(page).getByLabel('Name').fill('HTTPS Dependency');
  await form(page).getByLabel('Status page URL').fill('https://status.example');
  await form(page).getByLabel('Escalation URL').fill('https://support.example');
  await expect(root(page).getByRole('button',{name:'Create dependency'})).toBeEnabled();
 });
 test('PSD-048 Current check note has 5000-character bound and explicit metadata warning',async({page})=>{
  await openDependencies(page);await expect(form(page).getByLabel('Current check notes')).toHaveAttribute('maxlength','5000');
  await expect(form(page)).toContainText('Saving notes edits the current registry note only');
 });
 test('PSD-049 New dependency POST trims name and normalizes empty links',async({page})=>{
  const posts:any[]=[];await openDependencies(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p===endpoint)posts.push(b);}});
  await form(page).getByLabel('Name').fill('  Synthetic Card Gateway  ');
  await form(page).getByLabel('Status page URL').fill('');
  await root(page).getByRole('button',{name:'Create dependency'}).click();
  await expect.poll(()=>posts.length).toBe(1);expect(posts[0].name).toBe('Synthetic Card Gateway');
  expect(posts[0].status_page_url).toBeNull();expect(posts[0].escalation_url).toBeNull();
 });
 test('PSD-050 Created record reports it is not yet checked',async({page})=>{
  await openDependencies(page);await form(page).getByLabel('Name').fill('Unverified New Service');
  await root(page).getByRole('button',{name:'Create dependency'}).click();
  await expect(root(page)).toContainText('It is not considered checked until Record check is used.');
 });
 test('PSD-051 Create 400 failure preserves draft and exposes rejection',async({page})=>{
  await openDependencies(page,{responses:{'POST /platform/service-dependencies':{status:400,json:{message:'Synthetic create validation rejected'}}}});
  await form(page).getByLabel('Name').fill('Rejected Dependency');await root(page).getByRole('button',{name:'Create dependency'}).click();
  await expect(root(page)).toContainText('Dependency action failed.');await expect(root(page)).toContainText('Synthetic create validation rejected');
  await expect(form(page).getByLabel('Name')).toHaveValue('Rejected Dependency');
 });
 test('PSD-052 Create request includes status, impact and category',async({page})=>{
  const bodies:any[]=[];await openDependencies(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p===endpoint)bodies.push(b);}});
  await form(page).getByLabel('Name').fill('Impact Link');await form(page).getByLabel('Category').selectOption('payment');
  await form(page).getByLabel('Status',{exact:true}).selectOption('degraded');await form(page).getByLabel('Business impact').selectOption('critical');
  await root(page).getByRole('button',{name:'Create dependency'}).click();
  await expect.poll(()=>bodies.length).toBe(1);expect(bodies[0]).toMatchObject({category:'payment',status:'degraded',business_impact:'critical'});
 });
 test('PSD-053 Create with vendor read privilege includes chosen vendor ID',async({page})=>{
  const bodies:any[]=[];await openDependencies(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p===endpoint)bodies.push(b);}});
  await form(page).getByLabel('Name').fill('Vendor-linked');await form(page).getByLabel('Vendor').selectOption(depVendorId);
  await root(page).getByRole('button',{name:'Create dependency'}).click();
  await expect.poll(()=>bodies.length).toBe(1);expect(bodies[0].vendor_id).toBe(depVendorId);
 });
 test('PSD-054 Create without vendor read does not submit restricted vendor field',async({page})=>{
  const bodies:any[]=[];await openDependencies(page,{permissions:without('platform.vendors.read'),onCall:(m,p,_q,b)=>{if(m==='POST'&&p===endpoint)bodies.push(b);}});
  await form(page).getByLabel('Name').fill('No Vendor Visibility');await root(page).getByRole('button',{name:'Create dependency'}).click();
  await expect.poll(()=>bodies.length).toBe(1);expect(bodies[0]).not.toHaveProperty('vendor_id');
 });
 test('PSD-055 Create without users read does not submit restricted owner field',async({page})=>{
  const bodies:any[]=[];await openDependencies(page,{permissions:without('platform.users.read'),onCall:(m,p,_q,b)=>{if(m==='POST'&&p===endpoint)bodies.push(b);}});
  await form(page).getByLabel('Name').fill('No Owner Visibility');await root(page).getByRole('button',{name:'Create dependency'}).click();
  await expect.poll(()=>bodies.length).toBe(1);expect(bodies[0]).not.toHaveProperty('owner_platform_user_id');
 });
 test('PSD-056 Create with users read chooses active owner only',async({page})=>{
  await openDependencies(page);const owner=form(page).getByLabel('Owner');
  await expect(owner.locator(`option[value="${depOwnerId}"]`)).toHaveCount(1);
  await expect(owner.locator('option[value="74000000-0000-4000-8000-000000000002"]')).toHaveCount(0);
 });
 test('PSD-057 Archived vendor is excluded from new reference options',async({page})=>{
  await openDependencies(page);await expect(form(page).getByLabel('Vendor').locator('option')).not.toContainText('Fixture Archived Vendor');
 });
 test('PSD-058 Edit fills original dependency values and changes primary action',async({page})=>{
  await openDependencies(page);await card(page,criticalDependency.name).getByRole('button',{name:'Edit'}).click();
  await expect(form(page).getByLabel('Name')).toHaveValue(criticalDependency.name);
  await expect(form(page).getByLabel('Business impact')).toHaveValue('critical');
  await expect(root(page).getByRole('button',{name:'Save changes'})).toBeVisible();
 });
 test('PSD-059 Cancel edit discards unsaved changes',async({page})=>{
  await openDependencies(page);await card(page,criticalDependency.name).getByRole('button',{name:'Edit'}).click();
  await form(page).getByLabel('Name').fill('Unsaved label');await root(page).getByRole('button',{name:'Cancel edit'}).click();
  await expect(form(page).getByLabel('Name')).toHaveValue('');await expect(root(page)).toContainText('Dependency edit cancelled.');
 });
 test('PSD-060 Edit issues PATCH with existing identity',async({page})=>{
  const calls:{path:string;body:any}[]=[];await openDependencies(page,{onCall:(m,p,_q,b)=>{if(m==='PATCH')calls.push({path:p,body:b});}});
  await card(page,criticalDependency.name).getByRole('button',{name:'Edit'}).click();
  await form(page).getByLabel('Name').fill('Renamed Service');await root(page).getByRole('button',{name:'Save changes'}).click();
  await expect.poll(()=>calls.length).toBe(1);expect(calls[0].path).toBe(`${endpoint}/${dependencyIdA}`);
  expect(calls[0].body.name).toBe('Renamed Service');
 });
 test('PSD-061 Edit success shows ordinary-edit check timestamp disclaimer',async({page})=>{
  await openDependencies(page);await card(page,criticalDependency.name).getByRole('button',{name:'Edit'}).click();
  await root(page).getByRole('button',{name:'Save changes'}).click();
  await expect(root(page)).toContainText('Ordinary edits do not advance the check timestamp.');
 });
 test('PSD-062 Failed edit reports error and keeps edit form',async({page})=>{
  await openDependencies(page,{responses:{[`PATCH ${endpoint}/${dependencyIdA}`]:{status:403,json:{message:'Edit forbidden by backend'}}}});
  await card(page,criticalDependency.name).getByRole('button',{name:'Edit'}).click();
  await root(page).getByRole('button',{name:'Save changes'}).click();
  await expect(root(page)).toContainText('Edit forbidden by backend');await expect(form(page).getByLabel('Name')).toHaveValue(criticalDependency.name);
 });
 test('PSD-063 Explicit record check posts current status and note',async({page})=>{
  const calls:any[]=[];await openDependencies(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p.endsWith('/check'))calls.push({path:p,body:b});}});
  await card(page,criticalDependency.name).getByRole('button',{name:'Record check'}).click();
  await expect.poll(()=>calls.length).toBe(1);expect(calls[0].path).toBe(`${endpoint}/${dependencyIdA}/check`);
  expect(calls[0].body).toMatchObject({status:'major_outage',check_notes:'Recorded fixture check note'});
 });
 test('PSD-064 Explicit check does not send external request in fixture',async({page})=>{
  const paths:string[]=[];await openDependencies(page,{onCall:(m,p)=>{if(m==='POST')paths.push(p);}});
  await card(page,criticalDependency.name).getByRole('button',{name:'Record check'}).click();
  await expect.poll(()=>paths.length).toBe(1);expect(paths).toEqual([`${endpoint}/${dependencyIdA}/check`]);
 });
 test('PSD-065 Record check success renders application-only evidence',async({page})=>{
  await openDependencies(page);await card(page,criticalDependency.name).getByRole('button',{name:'Record check'}).click();
  await expect(root(page)).toContainText(`Application check recorded: ${criticalDependency.name}`);
  await expect(root(page)).toContainText('They do not prove the external service is actually healthy');
 });
 test('PSD-066 Failed check displays explicit failure without fabricated success',async({page})=>{
  await openDependencies(page,{responses:{[`POST ${endpoint}/${dependencyIdA}/check`]:{status:503,json:{message:'Check metadata rejected'}}}});
  await card(page,criticalDependency.name).getByRole('button',{name:'Record check'}).click();
  await expect(root(page)).toContainText('Check metadata rejected');
  await expect(root(page).locator('.platform-service-dependencies__success')).toHaveCount(0);
 });
 test('PSD-067 Editing check notes leaves explicit check timestamp unchanged in fixture',async({page})=>{
  await openDependencies(page);await card(page,criticalDependency.name).getByRole('button',{name:'Edit'}).click();
  await form(page).getByLabel('Current check notes').fill('Updated note without check');
  await root(page).getByRole('button',{name:'Save changes'}).click();
  await expect(card(page,criticalDependency.name)).toContainText('Updated note without check');
  await expect(root(page)).toContainText('Ordinary edits do not advance the check timestamp.');
 });
 test('PSD-068 Archive confirmation cancellation emits no POST',async({page})=>{
  const calls:string[]=[];await openDependencies(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/archive'))calls.push(p);}});
  page.once('dialog',d=>d.dismiss());await card(page,criticalDependency.name).getByRole('button',{name:'Archive'}).click();
  expect(calls).toHaveLength(0);await expect(card(page,criticalDependency.name)).toBeVisible();
 });
 test('PSD-069 Confirm archive hides active entry and preserves immutable archived history',async({page})=>{
  await openDependencies(page);page.once('dialog',d=>d.accept());await card(page,criticalDependency.name).getByRole('button',{name:'Archive'}).click();
  await expect(card(page,criticalDependency.name)).toHaveCount(0);
  await filter(page).getByLabel('Include archived history').check();
  await expect(card(page,criticalDependency.name)).toContainText('Archived · immutable');
 });
 test('PSD-070 Archive error preserves active editable entry',async({page})=>{
  await openDependencies(page,{responses:{[`POST ${endpoint}/${dependencyIdA}/archive`]:{status:503,json:{message:'Archive transaction declined'}}}});
  page.once('dialog',d=>d.accept());await card(page,criticalDependency.name).getByRole('button',{name:'Archive'}).click();
  await expect(root(page)).toContainText('Archive transaction declined');
  await expect(card(page,criticalDependency.name).getByRole('button',{name:'Edit'})).toBeVisible();
 });
 test('PSD-071 Archiving selected edit record closes editor after confirmation',async({page})=>{
  await openDependencies(page);await card(page,criticalDependency.name).getByRole('button',{name:'Edit'}).click();
  page.once('dialog',d=>d.accept());await card(page,criticalDependency.name).getByRole('button',{name:'Archive'}).click();
  await expect(root(page).getByRole('button',{name:'Create dependency'})).toBeVisible();
 });
 test('PSD-072 Changing filters resets server offset to zero',async({page})=>{
  const offsets:string[]=[];await openDependencies(page,{rows:manyDependencies(51),onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)offsets.push(q.get('offset')||'');}});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect.poll(()=>offsets.at(-1)).toBe('50');
  await filter(page).getByLabel('Status').selectOption('major_outage');await expect.poll(()=>offsets.at(-1)).toBe('0');
 });
 test('PSD-073 Refresh uses current active query without mutation',async({page})=>{
  const calls:string[]=[];await openDependencies(page,{query:'category=payment',onCall:(m,p,q)=>{if(p===endpoint)calls.push(`${m}:${q.get('category')}`);}});
  await expect(card(page,criticalDependency.name)).toBeVisible();
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect.poll(()=>calls.filter(c=>c==='GET:payment').length).toBeGreaterThanOrEqual(2);
  expect(calls.every(c=>c==='GET:payment')).toBeTruthy();
 });
 test('PSD-074 Background refresh failure retains last snapshot with warning',async({page})=>{
  let fail=false;await openDependencies(page,{respond:(m,p)=>m==='GET'&&p===endpoint&&fail?{status:503,json:{message:'Synthetic refresh outage'}}:undefined});
  await expect(card(page,criticalDependency.name)).toBeVisible();fail=true;
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(root(page)).toContainText('Showing the last successful snapshot.');
  await expect(card(page,criticalDependency.name)).toBeVisible();
 });
 test('PSD-075 Initial load failure exposes Retry and can recover',async({page})=>{
  let fail=true;await openDependencies(page,{respond:(m,p)=>m==='GET'&&p===endpoint&&fail?{status:503,json:{message:'Initial registry unavailable'}}:undefined});
  await expect(root(page)).toContainText('Dependency registry could not be loaded.');
  fail=false;await root(page).getByRole('button',{name:'Retry'}).last().click();
  await expect(card(page,criticalDependency.name)).toBeVisible();
 });
 test('PSD-076 Supporting links depend on independent platform rights',async({page})=>{
  await openDependencies(page,{permissions:without('platform.capacity.read','platform.audit.read','platform.vendors.read')});
  await expect(root(page).getByRole('link',{name:'Audit history'})).toHaveCount(0);
  await expect(root(page).getByRole('link',{name:'Vendor registry'})).toHaveCount(0);
 });
 test('PSD-077 Vendor reference absent when vendor identity is restricted',async({page})=>{
  await openDependencies(page,{permissions:without('platform.vendors.read')});
  await expect(card(page,criticalDependency.name).getByRole('link',{name:'Vendor registry'})).toHaveCount(0);
  await expect(root(page)).toContainText('Vendor identity redacted');
 });
 test('PSD-078 Backend 403 on owner/reference edit is surfaced without success',async({page})=>{
  await openDependencies(page,{responses:{[`PATCH ${endpoint}/${dependencyIdA}`]:{status:403,json:{message:'Owner reference forbidden'}}}});
  await card(page,criticalDependency.name).getByRole('button',{name:'Edit'}).click();
  await root(page).getByRole('button',{name:'Save changes'}).click();
  await expect(root(page)).toContainText('Owner reference forbidden');
  await expect(root(page).locator('.platform-service-dependencies__success')).toHaveCount(0);
 });
 test('PSD-079 Redacted owner still conveys assigned metadata',async({page})=>{
  await openDependencies(page,{permissions:without('platform.users.read')});
  await expect(card(page,criticalDependency.name)).toContainText('Assigned · identity redacted');
  await expect(card(page,criticalDependency.name)).not.toContainText('dependency-owner@fixture.test');
 });
 test('PSD-080 Archive request remains explicit and scoped to selected record',async({page})=>{
  const requests:string[]=[];await openDependencies(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/archive'))requests.push(p);}});
  page.once('dialog',d=>d.accept());await card(page,healthyDependency.name).getByRole('button',{name:'Archive'}).click();
  await expect.poll(()=>requests.length).toBe(1);expect(requests).toEqual([`${endpoint}/${dependencyIdB}/archive`]);
  // UI interception does not establish check/archive concurrency safety, SQL transactions, or audit durability.
 });
});
