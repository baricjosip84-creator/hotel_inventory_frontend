/** Batch 76 · PVD-001..041 · Platform Vendors browser assertions · GENERATED_UNRUN.
 * Synthetic platform responses confirm rendered UI and outgoing request contracts,
 * not contractual validity, external vendor existence, backend ACL, DB or audit durability. */
import {test,expect,type Page} from '@playwright/test';
import {openVendors,vendorPermissions,vendorIdA,activeVendor,watchVendor,archivedVendor,manyVendors} from '../../../support/platformVendorsFixture';
const root=(p:Page)=>p.locator('.platform-vendors');
const filterSection=(p:Page)=>p.locator('.platform-vendors__section').filter({hasText:'Filters are URL-backed'}).first();
const form=(p:Page)=>p.locator('#platform-vendors-form');
const evidence=(p:Page)=>p.locator('.platform-vendors__section').filter({hasText:'Vendor evidence'}).first();
const cards=(p:Page)=>p.locator('.platform-vendors__card');
const card=(p:Page,name:string)=>cards(p).filter({hasText:name});
const pager=(p:Page)=>evidence(p).locator('.platform-vendors__pagination');
const without=(permission:string)=>vendorPermissions.filter(p=>p!==permission);
const list='/platform/vendors';

test.describe('Platform Vendors — authorized registry and evidence (GENERATED_UNRUN)',()=>{
 test('PVD-001 Platform Vendors opens within protected operations workspace',async({page})=>{
  await openVendors(page);await expect(page.getByRole('heading',{name:'Vendors',exact:true})).toBeVisible();
  await expect(root(page)).toContainText('Platform operations');
 });
 test('PVD-002 Vendor truth boundary forbids inference of external contract and SLA validity',async({page})=>{
  await openVendors(page);await expect(root(page)).toContainText('They do not prove an external contract is valid');
  await expect(root(page)).toContainText('vendor acknowledged anything');
 });
 test('PVD-003 Registry summary displays matched total, not merely page count',async({page})=>{
  await openVendors(page);await expect(root(page)).toContainText('Across current filters, not only this page');
  await expect(evidence(page)).toContainText('2 matched');await expect(cards(page)).toHaveCount(2);
 });
 test('PVD-004 Critical-risk summary signals internal review requirement',async({page})=>{
  await openVendors(page);await expect(root(page)).toContainText('Review required');
  await expect(root(page)).toContainText('Internal operator classification');
 });
 test('PVD-005 Renewal summary includes overdue recorded renewal dates',async({page})=>{
  await openVendors(page);await expect(root(page)).toContainText('Renewal due ≤60 days');
  await expect(root(page)).toContainText('Includes overdue recorded renewal dates');
 });
 test('PVD-006 Risk and status are independently tone-classified in vendor card',async({page})=>{
  await openVendors(page);const current=card(page,activeVendor.name);
  await expect(current.locator('[data-tone="danger"]')).toContainText('critical risk');
  await expect(current.locator('[data-tone="good"]')).toContainText('active');
 });
 test('PVD-007 Valid external website uses noreferrer and new-tab anchor',async({page})=>{
  await openVendors(page);const link=card(page,activeVendor.name).getByRole('link',{name:'Vendor website'});
  await expect(link).toHaveAttribute('href','https://payments.fixture.example');
  await expect(link).toHaveAttribute('target','_blank');await expect(link).toHaveAttribute('rel','noreferrer');
 });
 test('PVD-008 Missing website does not invent external navigation',async({page})=>{
  await openVendors(page);await expect(card(page,watchVendor.name).getByRole('link',{name:'Vendor website'})).toHaveCount(0);
 });
 test('PVD-009 Contact email is a mailto link, not an API mutation',async({page})=>{
  await openVendors(page);await expect(card(page,watchVendor.name).getByRole('link',{name:'Email contact'})).toHaveAttribute('href','mailto:support@fixture.example');
 });
 test('PVD-010 Default evidence excludes archived records',async({page})=>{
  await openVendors(page);await expect(card(page,archivedVendor.name)).toHaveCount(0);
 });
 test('PVD-011 Opting into archived history reveals archived vendor evidence',async({page})=>{
  await openVendors(page);await filterSection(page).getByLabel('Include archived history').check();
  await expect(card(page,archivedVendor.name)).toBeVisible();
 });
 test('PVD-012 Archived vendor is explicitly immutable with no edit/archive action',async({page})=>{
  await openVendors(page,{query:'include_archived=true'});const current=card(page,archivedVendor.name);
  await expect(current).toContainText('Archived · immutable');
  await expect(current.getByRole('button',{name:'Edit'})).toHaveCount(0);
  await expect(current.getByRole('button',{name:'Archive'})).toHaveCount(0);
 });
 test('PVD-013 Read-only permission still permits registry but removes mutation form and actions',async({page})=>{
  await openVendors(page,{permissions:without('platform.vendors.write')});
  await expect(card(page,activeVendor.name)).toBeVisible();await expect(form(page)).toHaveCount(0);
  await expect(card(page,activeVendor.name).getByRole('button',{name:'Edit'})).toHaveCount(0);
 });
 test('PVD-014 Missing platform.vendors.read redirects before registry data query',async({page})=>{
  const calls:string[]=[];await openVendors(page,{permissions:without('platform.vendors.read'),expectHeading:false,
   onCall:(m,p)=>{if(m==='GET'&&p===list)calls.push(p);}});
  await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);expect(calls).toHaveLength(0);
 });
 test('PVD-015 Missing platform.users.read independently redacts owner identity and owner selector',async({page})=>{
  await openVendors(page,{permissions:without('platform.users.read')});
  await expect(root(page)).toContainText('Platform-user identity is redacted.');
  await expect(card(page,activeVendor.name)).not.toContainText('owner@fixture.test');
  await expect(form(page).getByLabel('Owner')).toHaveCount(0);
  await expect(form(page)).toContainText('Owner linkage restricted');
 });
 test('PVD-016 Authorized owner picker contains only active users',async({page})=>{
  await openVendors(page);const select=form(page).getByLabel('Owner');
  await expect(select.locator('option',{hasText:'owner@fixture.test'})).toHaveCount(1);
  await expect(select.locator('option',{hasText:'inactive@fixture.test'})).toHaveCount(0);
 });
 test('PVD-017 Dependency link is hidden when dependency read permission is absent',async({page})=>{
  await openVendors(page,{permissions:without('platform.dependencies.read')});
  await expect(card(page,activeVendor.name).getByRole('link',{name:'Service dependencies'})).toHaveCount(0);
  await expect(root(page).getByRole('link',{name:'Integration monitoring'})).toHaveCount(0);
 });
 test('PVD-018 Audit history link is hidden without audit.read',async({page})=>{
  await openVendors(page,{permissions:without('platform.audit.read')});
  await expect(card(page,activeVendor.name).getByRole('link',{name:'Audit history'})).toHaveCount(0);
 });
 test('PVD-019 Compliance supporting link requires compliance.read',async({page})=>{
  await openVendors(page,{permissions:without('platform.compliance.read')});
  await expect(root(page).getByRole('link',{name:'Legal compliance reporting'})).toHaveCount(0);
 });
 test('PVD-020 Audit and dependency hrefs include the selected vendor ID',async({page})=>{
  await openVendors(page);const current=card(page,activeVendor.name);
  await expect(current.getByRole('link',{name:'Service dependencies'})).toHaveAttribute('href',new RegExp(`vendor_id=${vendorIdA}`));
  await expect(current.getByRole('link',{name:'Audit history'})).toHaveAttribute('href',new RegExp(`target_id=${vendorIdA}`));
 });
});

test.describe('Platform Vendors — URL filters, pagination and empty states (GENERATED_UNRUN)',()=>{
 test('PVD-021 Category selector narrows server query and visible rows',async({page})=>{
  const values:string[]=[];await openVendors(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===list)values.push(q.get('category')||'');}});
  await filterSection(page).getByLabel('Category').selectOption('payment');
  await expect(card(page,activeVendor.name)).toBeVisible();await expect(card(page,watchVendor.name)).toHaveCount(0);
  await expect.poll(()=>values.at(-1)).toBe('payment');
 });
 test('PVD-022 Status filter is passed to backend list and limits matching vendors',async({page})=>{
  const values:string[]=[];await openVendors(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===list)values.push(q.get('status')||'');}});
  await filterSection(page).getByLabel('Status').selectOption('watch');
  await expect(card(page,watchVendor.name)).toBeVisible();await expect(card(page,activeVendor.name)).toHaveCount(0);
  await expect.poll(()=>values.at(-1)).toBe('watch');
 });
 test('PVD-023 Risk selection forwards risk_level and changes evidence',async({page})=>{
  await openVendors(page);await filterSection(page).getByLabel('Risk').selectOption('critical');
  await expect(card(page,activeVendor.name)).toBeVisible();await expect(card(page,watchVendor.name)).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('risk_level')).toBe('critical');
 });
 test('PVD-024 Search matches contact or account metadata through server filter',async({page})=>{
  const calls:string[]=[];await openVendors(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===list)calls.push(q.get('search')||'');}});
  await filterSection(page).getByLabel('Search').fill('ACC-MAIL-002');
  await expect(card(page,watchVendor.name)).toBeVisible();await expect(card(page,activeVendor.name)).toHaveCount(0);
  await expect.poll(()=>calls.at(-1)).toBe('ACC-MAIL-002');
 });
 test('PVD-025 Renewal due checkbox forwards true and shows due-only vendors',async({page})=>{
  await openVendors(page);await filterSection(page).getByLabel('Renewal due / overdue').check();
  await expect(card(page,watchVendor.name)).toBeVisible();await expect(card(page,activeVendor.name)).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('renewal_due')).toBe('true');
 });
 test('PVD-026 Include archived checkbox forwards true without changing default status filter',async({page})=>{
  await openVendors(page);await filterSection(page).getByLabel('Include archived history').check();
  await expect(card(page,archivedVendor.name)).toBeVisible();
  expect(new URL(page.url()).searchParams.get('include_archived')).toBe('true');
 });
 test('PVD-027 URL-backed filters survive page navigation to same URL',async({page})=>{
  await openVendors(page,{query:'category=payment&risk_level=critical'});
  await expect(filterSection(page).getByLabel('Category')).toHaveValue('payment');
  await expect(filterSection(page).getByLabel('Risk')).toHaveValue('critical');
  await expect(card(page,activeVendor.name)).toBeVisible();
 });
 test('PVD-028 Invalid URL category blocks registry transport',async({page})=>{
  const gets:string[]=[];await openVendors(page,{query:'category=fictional',onCall:(m,p)=>{if(m==='GET'&&p===list)gets.push(p);}});
  await expect(root(page)).toContainText('Invalid URL filter');expect(gets).toHaveLength(0);
 });
 test('PVD-029 Unsupported URL status is rejected without GET',async({page})=>{
  const gets:string[]=[];await openVendors(page,{query:'status=deleted',onCall:(m,p)=>{if(m==='GET'&&p===list)gets.push(p);}});
  await expect(root(page)).toContainText('Invalid URL filter');expect(gets).toHaveLength(0);
 });
 test('PVD-030 Unsupported URL risk level is rejected without GET',async({page})=>{
  const gets:string[]=[];await openVendors(page,{query:'risk_level=extreme',onCall:(m,p)=>{if(m==='GET'&&p===list)gets.push(p);}});
  await expect(root(page)).toContainText('Invalid URL filter');expect(gets).toHaveLength(0);
 });
 test('PVD-031 Search longer than 200 URL characters blocks registry request',async({page})=>{
  const gets:string[]=[];await openVendors(page,{query:`search=${'Z'.repeat(201)}`,onCall:(m,p)=>{if(m==='GET'&&p===list)gets.push(p);}});
  await expect(root(page)).toContainText('Invalid URL filter');expect(gets).toHaveLength(0);
 });
 test('PVD-032 Invalid renewal_due URL boolean blocks list transport',async({page})=>{
  const gets:string[]=[];await openVendors(page,{query:'renewal_due=perhaps',onCall:(m,p)=>{if(m==='GET'&&p===list)gets.push(p);}});
  await expect(root(page)).toContainText('Invalid URL filter');expect(gets).toHaveLength(0);
 });
 test('PVD-033 Invalid include_archived URL boolean blocks list transport',async({page})=>{
  const gets:string[]=[];await openVendors(page,{query:'include_archived=maybe',onCall:(m,p)=>{if(m==='GET'&&p===list)gets.push(p);}});
  await expect(root(page)).toContainText('Invalid URL filter');expect(gets).toHaveLength(0);
 });
 test('PVD-034 Clear invalid filters restores registry and removes broken keys',async({page})=>{
  await openVendors(page,{query:'risk_level=fictional&search=Fixture'});
  await root(page).getByRole('button',{name:'Clear filters'}).first().click();
  await expect(card(page,activeVendor.name)).toBeVisible();expect(new URL(page.url()).searchParams.toString()).toBe('');
 });
 test('PVD-035 Clear filters resets valid URL-backed criteria',async({page})=>{
  await openVendors(page,{query:'category=payment&search=Processor'});
  await filterSection(page).getByRole('button',{name:'Clear filters'}).click();
  await expect(card(page,watchVendor.name)).toBeVisible();
  await expect(filterSection(page).getByLabel('Category')).toHaveValue('');
 });
 test('PVD-036 Exactly 200 characters of URL search are allowed and transmitted',async({page})=>{
  const term='X'.repeat(200),values:string[]=[];
  await openVendors(page,{query:`search=${term}`,onCall:(m,p,q)=>{if(m==='GET'&&p===list)values.push(q.get('search')||'');}});
  await expect(root(page)).not.toContainText('Invalid URL filter');expect(values).toContain(term);
 });
 test('PVD-037 Registry requests 50 rows per page, not an uncapped dataset',async({page})=>{
  const requested:string[]=[];await openVendors(page,{rows:manyVendors(51),onCall:(m,p,q)=>{if(m==='GET'&&p===list)requested.push(q.get('limit')||'');}});
  await expect(cards(page)).toHaveCount(50);expect(requested).toContain('50');
 });
 test('PVD-038 Next page fetches server offset 50 and renders row 51',async({page})=>{
  const requested:string[]=[];await openVendors(page,{rows:manyVendors(51),onCall:(m,p,q)=>{if(m==='GET'&&p===list)requested.push(q.get('offset')||'');}});
  await pager(page).getByRole('button',{name:'Next'}).click();
  await expect(card(page,'Fixture Vendor 051')).toBeVisible();expect(requested).toContain('50');
 });
 test('PVD-039 Previous restores first page without altering filter',async({page})=>{
  await openVendors(page,{rows:manyVendors(51),query:'category=payment'});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect(card(page,'Fixture Vendor 051')).toBeVisible();
  await pager(page).getByRole('button',{name:'Previous'}).click();await expect(card(page,'Fixture Vendor 001')).toBeVisible();
  expect(new URL(page.url()).searchParams.get('category')).toBe('payment');
 });
 test('PVD-040 Final page disables Next when has_more is false',async({page})=>{
  await openVendors(page,{rows:manyVendors(51)});
  await pager(page).getByRole('button',{name:'Next'}).click();
  await expect(card(page,'Fixture Vendor 051')).toBeVisible();
  await expect(pager(page).getByRole('button',{name:'Next'})).toBeDisabled();
 });
 test('PVD-041 No matching vendors renders evidence-limited empty state',async({page})=>{
  await openVendors(page,{query:'search=AbsolutelyNoMatch'});
  await expect(evidence(page)).toContainText('No vendor records matched.');
  await expect(evidence(page)).toContainText('does not prove that no external vendor relationship exists');
  await expect(cards(page)).toHaveCount(0);
 });
});

/** Batch 77 · continuation PVD-042…080. All tests remain GENERATED_UNRUN.
 * Assertions inspect page state and intercepted requests, not remote vendor truth or DB enforcement. */
test.describe('Platform Vendors — create validation and owned payload (GENERATED_UNRUN)',()=>{
 test('PVD-042 Create form requires a non-blank vendor name',async({page})=>{
  let posts=0;await openVendors(page,{onCall:(m,p)=>{if(m==='POST'&&p===list)posts++;}});
  await expect(form(page).getByRole('button',{name:'Create vendor'})).toBeDisabled();
  await expect(form(page)).toContainText('Enter a vendor name.');
  await form(page).getByLabel('Name').fill('   ');
  await expect(form(page).getByRole('button',{name:'Create vendor'})).toBeDisabled();expect(posts).toBe(0);
 });
 test('PVD-043 Invalid website URL blocks creating a vendor',async({page})=>{
  await openVendors(page);await form(page).getByLabel('Name').fill('URL test vendor');
  await form(page).getByLabel('Website URL').fill('not-a-url');
  await expect(form(page)).toContainText('Website must be a valid HTTP or HTTPS URL.');
  await expect(form(page).getByRole('button',{name:'Create vendor'})).toBeDisabled();
 });
 test('PVD-044 Renewal date before contract start blocks save',async({page})=>{
  await openVendors(page);await form(page).getByLabel('Name').fill('Contract dates');
  await form(page).getByLabel('Contract start').fill('2026-12-20');
  await form(page).getByLabel('Renewal date').fill('2026-12-19');
  await expect(form(page)).toContainText('Renewal date must be on or after the contract start date.');
  await expect(form(page).getByRole('button',{name:'Create vendor'})).toBeDisabled();
 });
 test('PVD-045 Equal contract start and renewal dates remain valid',async({page})=>{
  await openVendors(page);await form(page).getByLabel('Name').fill('Same-day renewal');
  await form(page).getByLabel('Contract start').fill('2026-12-20');
  await form(page).getByLabel('Renewal date').fill('2026-12-20');
  await expect(form(page).getByRole('button',{name:'Create vendor'})).toBeEnabled();
 });
 test('PVD-046 HTTP external website is an allowed vendor reference',async({page})=>{
  let posted:any=null;await openVendors(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p===list)posted=b;}});
  await form(page).getByLabel('Name').fill('HTTP registry link');
  await form(page).getByLabel('Website URL').fill('http://vendor.fixture.example/status');
  await form(page).getByRole('button',{name:'Create vendor'}).click();
  await expect.poll(()=>posted?.website_url).toBe('http://vendor.fixture.example/status');
 });
 test('PVD-047 Unsafe script-scheme website is rejected as invalid',async({page})=>{
  await openVendors(page);await form(page).getByLabel('Name').fill('Unsafe website');
  await form(page).getByLabel('Website URL').fill('javascript:alert(1)');
  await expect(form(page).getByRole('button',{name:'Create vendor'})).toBeDisabled();
 });
 test('PVD-048 Create request trims vendor name',async({page})=>{
  let posted:any=null;await openVendors(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p===list)posted=b;}});
  await form(page).getByLabel('Name').fill('  Trimmed Vendor   ');
  await form(page).getByRole('button',{name:'Create vendor'}).click();
  await expect.poll(()=>posted?.name).toBe('Trimmed Vendor');
 });
 test('PVD-049 Create request serializes empty optional text as null',async({page})=>{
  let posted:any=null;await openVendors(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p===list)posted=b;}});
  await form(page).getByLabel('Name').fill('Null optional values');
  await form(page).getByLabel('Internal notes').fill('  ');
  await form(page).getByRole('button',{name:'Create vendor'}).click();
  await expect.poll(()=>posted).not.toBeNull();
  expect(posted.internal_notes).toBeNull();expect(posted.website_url).toBeNull();
  expect(posted.primary_contact_phone).toBeNull();
 });
 test('PVD-050 Create payload includes owner ID only with PLATFORM_USERS_READ',async({page})=>{
  let posted:any=null;await openVendors(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p===list)posted=b;}});
  await form(page).getByLabel('Name').fill('Assigned vendor');
  await form(page).getByLabel('Owner').selectOption(vendorOwnerId);
  await form(page).getByRole('button',{name:'Create vendor'}).click();
  await expect.poll(()=>posted?.owner_platform_user_id).toBe(vendorOwnerId);
 });
 test('PVD-051 Without PLATFORM_USERS_READ, create excludes owner linkage property',async({page})=>{
  let posted:any=null;await openVendors(page,{permissions:without('platform.users.read'),onCall:(m,p,_q,b)=>{if(m==='POST'&&p===list)posted=b;}});
  await form(page).getByLabel('Name').fill('Redacted owner vendor');
  await form(page).getByRole('button',{name:'Create vendor'}).click();
  await expect.poll(()=>posted).not.toBeNull();
  expect(Object.prototype.hasOwnProperty.call(posted,'owner_platform_user_id')).toBe(false);
 });
 test('PVD-052 Successful create displays feedback and clears form',async({page})=>{
  await openVendors(page);await form(page).getByLabel('Name').fill('Created Fixture Vendor');
  await form(page).getByRole('button',{name:'Create vendor'}).click();
  await expect(root(page).locator('.platform-vendors__success')).toContainText('Vendor created.');
  await expect(form(page).getByLabel('Name')).toHaveValue('');
  await expect(card(page,'Created Fixture Vendor')).toBeVisible();
 });
 test('PVD-053 Dismissing success feedback clears the notice',async({page})=>{
  await openVendors(page);await form(page).getByLabel('Name').fill('Dismissable result');
  await form(page).getByRole('button',{name:'Create vendor'}).click();
  const notice=root(page).locator('.platform-vendors__success');await expect(notice).toBeVisible();
  await notice.getByRole('button',{name:'Dismiss'}).click();await expect(notice).toHaveCount(0);
 });
 test('PVD-054 Rejected create preserves form and shows action failure',async({page})=>{
  await openVendors(page,{responses:{'POST /platform/vendors':{status:409,json:{message:'Fixture duplicate vendor reference'}}}});
  await form(page).getByLabel('Name').fill('Unstored draft');
  await form(page).getByRole('button',{name:'Create vendor'}).click();
  await expect(root(page).locator('.platform-vendors__warning')).toContainText('Fixture duplicate vendor reference');
  await expect(form(page).getByLabel('Name')).toHaveValue('Unstored draft');
 });
 test('PVD-055 Dismiss error clears only the mutation notice',async({page})=>{
  await openVendors(page,{responses:{'POST /platform/vendors':{status:503,json:{message:'Fixture service unavailable'}}}});
  await form(page).getByLabel('Name').fill('Keep draft');await form(page).getByRole('button',{name:'Create vendor'}).click();
  const warning=root(page).locator('.platform-vendors__warning').filter({hasText:'Vendor action failed.'});
  await expect(warning).toBeVisible();await warning.getByRole('button',{name:'Dismiss'}).click();
  await expect(warning).toHaveCount(0);await expect(form(page).getByLabel('Name')).toHaveValue('Keep draft');
 });
 test('PVD-056 Name input enforces the 300-character HTML limit',async({page})=>{
  await openVendors(page);await expect(form(page).getByLabel('Name')).toHaveAttribute('maxlength','300');
 });
 test('PVD-057 Internal and dependency notes enforce 5000-character limits',async({page})=>{
  await openVendors(page);for(const label of ['Internal notes','Dependency notes'])
   await expect(form(page).getByLabel(label)).toHaveAttribute('maxlength','5000');
 });
 test('PVD-058 FTP website scheme fails client validation',async({page})=>{
  await openVendors(page);await form(page).getByLabel('Name').fill('FTP rejection');
  await form(page).getByLabel('Website URL').fill('ftp://vendor.fixture.test');
  await expect(form(page)).toContainText('Website must be a valid HTTP or HTTPS URL.');
  await expect(form(page).getByRole('button',{name:'Create vendor'})).toBeDisabled();
 });
 test('PVD-059 Category, risk and status selections are sent to create API',async({page})=>{
  let posted:any=null;await openVendors(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p===list)posted=b;}});
  await form(page).getByLabel('Name').fill('Classification');
  await form(page).getByLabel('Category').selectOption('security');
  await form(page).getByLabel('Status').selectOption('watch');
  await form(page).getByLabel('Risk').selectOption('critical');
  await form(page).getByRole('button',{name:'Create vendor'}).click();
  await expect.poll(()=>posted).not.toBeNull();
  expect(posted).toMatchObject({category:'security',status:'watch',risk_level:'critical'});
 });
 test('PVD-060 Default vendor creation uses other/active/medium classifications',async({page})=>{
  let posted:any=null;await openVendors(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p===list)posted=b;}});
  await form(page).getByLabel('Name').fill('Default classification');
  await form(page).getByRole('button',{name:'Create vendor'}).click();
  await expect.poll(()=>posted).not.toBeNull();
  expect(posted).toMatchObject({category:'other',status:'active',risk_level:'medium'});
 });
});

test.describe('Platform Vendors — edit/archive/retry and linked operations (GENERATED_UNRUN)',()=>{
 test('PVD-061 Edit loads source record values into the shared form',async({page})=>{
  await openVendors(page);await card(page,activeVendor.name).getByRole('button',{name:'Edit'}).click();
  await expect(form(page)).toContainText('Edit vendor registry entry');
  await expect(form(page).getByLabel('Name')).toHaveValue(activeVendor.name);
  await expect(form(page).getByLabel('Account/reference')).toHaveValue(activeVendor.account_reference);
  await expect(form(page).getByLabel('Owner')).toHaveValue(vendorOwnerId);
 });
 test('PVD-062 Cancel edit restores blank create form and reports cancellation',async({page})=>{
  await openVendors(page);await card(page,activeVendor.name).getByRole('button',{name:'Edit'}).click();
  await form(page).getByRole('button',{name:'Cancel edit'}).click();
  await expect(form(page).getByLabel('Name')).toHaveValue('');
  await expect(form(page)).toContainText('Add vendor registry entry');
  await expect(root(page).locator('.platform-vendors__success')).toContainText('Vendor edit cancelled.');
 });
 test('PVD-063 Saving edit PATCHes existing vendor without changing its ID',async({page})=>{
  const patches:{path:string;body:any}[]=[];
  await openVendors(page,{onCall:(m,p,_q,b)=>{if(m==='PATCH')patches.push({path:p,body:b});}});
  await card(page,activeVendor.name).getByRole('button',{name:'Edit'}).click();
  await form(page).getByLabel('Name').fill('Updated fixture processor');
  await form(page).getByRole('button',{name:'Save changes'}).click();
  await expect.poll(()=>patches.length).toBe(1);
  expect(patches[0].path).toBe(`/platform/vendors/${vendorIdA}`);
  expect(patches[0].body.name).toBe('Updated fixture processor');
  await expect(root(page).locator('.platform-vendors__success')).toContainText('Vendor changes saved.');
 });
 test('PVD-064 Rejected PATCH retains entered draft for correction',async({page})=>{
  await openVendors(page,{responses:{[`PATCH /platform/vendors/${vendorIdA}`]:{status:409,json:{message:'Fixture concurrent edit conflict'}}}});
  await card(page,activeVendor.name).getByRole('button',{name:'Edit'}).click();
  await form(page).getByLabel('Name').fill('Local uncommitted revision');
  await form(page).getByRole('button',{name:'Save changes'}).click();
  await expect(root(page).locator('.platform-vendors__warning')).toContainText('Fixture concurrent edit conflict');
  await expect(form(page).getByLabel('Name')).toHaveValue('Local uncommitted revision');
  await expect(form(page).getByRole('button',{name:'Save changes'})).toBeEnabled();
 });
 test('PVD-065 Restricted owner visibility does not send forbidden owner field on edit',async({page})=>{
  let payload:any=null;await openVendors(page,{permissions:without('platform.users.read'),onCall:(m,p,_q,b)=>{
   if(m==='PATCH'&&p===`/platform/vendors/${vendorIdA}`)payload=b;
  }});
  await card(page,activeVendor.name).getByRole('button',{name:'Edit'}).click();
  await form(page).getByLabel('Internal notes').fill('Change without viewing owner');
  await form(page).getByRole('button',{name:'Save changes'}).click();
  await expect.poll(()=>payload).not.toBeNull();
  expect(Object.prototype.hasOwnProperty.call(payload,'owner_platform_user_id')).toBe(false);
 });
 test('PVD-066 Archived status is excluded from mutable form statuses',async({page})=>{
  await openVendors(page);await expect(form(page).getByLabel('Status').locator('option[value="archived"]')).toHaveCount(0);
  await expect(filterSection(page).getByLabel('Status').locator('option[value="archived"]')).toHaveCount(1);
 });
 test('PVD-067 Archive action requires browser confirmation',async({page})=>{
  let posts=0;await openVendors(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/archive'))posts++;}});
  page.once('dialog',async dialog=>{expect(dialog.type()).toBe('confirm');
   expect(dialog.message()).toContain(activeVendor.name);await dialog.dismiss();});
  await card(page,activeVendor.name).getByRole('button',{name:'Archive'}).click();
  expect(posts).toBe(0);await expect(card(page,activeVendor.name)).toBeVisible();
 });
 test('PVD-068 Cancelling archive confirmation prevents POST',async({page})=>{
  const mutations:string[]=[];await openVendors(page,{onCall:(m,p)=>{if(m==='POST')mutations.push(p);}});
  page.once('dialog',dialog=>dialog.dismiss());
  await card(page,watchVendor.name).getByRole('button',{name:'Archive'}).click();
  expect(mutations).toEqual([]);await expect(card(page,watchVendor.name)).toBeVisible();
 });
 test('PVD-069 Confirmed archive removes record from default view and makes history immutable',async({page})=>{
  await openVendors(page);page.once('dialog',dialog=>dialog.accept());
  await card(page,activeVendor.name).getByRole('button',{name:'Archive'}).click();
  await expect(card(page,activeVendor.name)).toHaveCount(0);
  await filterSection(page).getByLabel('Include archived history').check();
  await expect(card(page,activeVendor.name)).toContainText('Archived · immutable');
 });
 test('PVD-070 Archive API rejection displays explicit failure',async({page})=>{
  await openVendors(page,{responses:{[`POST /platform/vendors/${vendorIdA}/archive`]:{status:503,json:{message:'Archive fixture unavailable'}}}});
  page.once('dialog',dialog=>dialog.accept());
  await card(page,activeVendor.name).getByRole('button',{name:'Archive'}).click();
  await expect(root(page).locator('.platform-vendors__warning')).toContainText('Archive fixture unavailable');
  await expect(card(page,activeVendor.name)).toBeVisible();
 });
 test('PVD-071 Archiving currently edited vendor resets form editing state',async({page})=>{
  await openVendors(page);await card(page,activeVendor.name).getByRole('button',{name:'Edit'}).click();
  page.once('dialog',dialog=>dialog.accept());
  await card(page,activeVendor.name).getByRole('button',{name:'Archive'}).click();
  await expect(root(page).locator('.platform-vendors__success')).toContainText('Vendor archived:');
  await expect(form(page).getByLabel('Name')).toHaveValue('');
  await expect(form(page).getByRole('button',{name:'Create vendor'})).toBeDisabled();
 });
 test('PVD-072 Changing a registry filter resets pagination to offset zero',async({page})=>{
  const offsets:string[]=[];await openVendors(page,{rows:manyVendors(51),onCall:(m,p,q)=>{
   if(m==='GET'&&p===list)offsets.push(q.get('offset')||'');
  }});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect(card(page,'Fixture Vendor 051')).toBeVisible();
  await filterSection(page).getByLabel('Risk').selectOption('critical');
  await expect.poll(()=>offsets.at(-1)).toBe('0');await expect(card(page,'Fixture Vendor 001')).toBeVisible();
 });
 test('PVD-073 Archived evidence displays neutral status tone',async({page})=>{
  await openVendors(page,{query:'include_archived=true'});
  await expect(card(page,archivedVendor.name).locator('[data-tone="neutral"]')).toContainText('archived');
 });
 test('PVD-074 Supported enum options come from the list contract',async({page})=>{
  await openVendors(page);const category=form(page).getByLabel('Category');
  for(const value of ['payment','infrastructure','messaging','integrations','support','security','legal','other'])
   await expect(category.locator(`option[value="${value}"]`)).toHaveCount(1);
  for(const value of ['low','medium','high','critical'])
   await expect(form(page).getByLabel('Risk').locator(`option[value="${value}"]`)).toHaveCount(1);
 });
 test('PVD-075 Unsupported URL filters prevent list access until cleared',async({page})=>{
  const calls:string[]=[];await openVendors(page,{query:'status=disabled&risk_level=untrusted',onCall:(m,p)=>{if(m==='GET'&&p===list)calls.push(p);}});
  await expect(root(page)).toContainText('Invalid URL filter');expect(calls).toHaveLength(0);
  await root(page).getByRole('button',{name:'Clear filters'}).first().click();
  await expect(card(page,activeVendor.name)).toBeVisible();await expect.poll(()=>calls.length).toBeGreaterThan(0);
 });
 test('PVD-076 Summary totals match server filtered scope, not loaded slice',async({page})=>{
  await openVendors(page,{rows:manyVendors(51)});
  await expect(cards(page)).toHaveCount(50);
  await expect(evidence(page)).toContainText('51 matched');
  await expect(root(page).getByLabel('Vendor registry summary')).toContainText('Matched vendors');
 });
 test('PVD-077 Failed refresh retains and labels the last successful snapshot',async({page})=>{
  let reject=false;await openVendors(page,{respond:(m,p)=>m==='GET'&&p===list&&reject?{status:503,json:{message:'Refresh fixture failed'}}:undefined});
  await expect(card(page,activeVendor.name)).toBeVisible();reject=true;
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(root(page).locator('.platform-vendors__warning')).toContainText('Showing the last successful snapshot.');
  await expect(card(page,activeVendor.name)).toBeVisible();
 });
 test('PVD-078 Retry recovers from an initial 503 response',async({page})=>{
  let failing=true;await openVendors(page,{respond:(m,p)=>m==='GET'&&p===list&&failing?{status:503,json:{message:'Registry unavailable'}}:undefined});
  await expect(root(page)).toContainText('Vendor registry could not be loaded.');
  failing=false;await evidence(page).getByRole('button',{name:'Retry'}).click();
  await expect(card(page,activeVendor.name)).toBeVisible();
 });
 test('PVD-079 Refresh fetches registry again without write mutation',async({page})=>{
  const calls:string[]=[];await openVendors(page,{onCall:(m,p)=>{if(p===list)calls.push(m);}});
  const initial=calls.filter(m=>m==='GET').length;
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>calls.filter(m=>m==='GET').length).toBeGreaterThan(initial);
  expect(calls).not.toContain('POST');expect(calls).not.toContain('PATCH');
 });
 test('PVD-080 Supporting operation links each obey their independent read permissions',async({page})=>{
  await openVendors(page,{permissions:['platform.dashboard.read','platform.vendors.read']});
  const links=root(page).locator('.platform-vendors__supporting-links');
  for(const name of ['Service dependencies','Integration monitoring','Legal compliance reporting','Platform users','Platform audit'])
   await expect(links.getByRole('link',{name})).toHaveCount(0);
 });
});
