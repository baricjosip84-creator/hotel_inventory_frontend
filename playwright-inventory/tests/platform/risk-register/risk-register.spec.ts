/** Batch 78: PRISK-001..041. Source-grounded Risk Register UI and request-shape scenarios.
 * Phase 1 GENERATED_UNRUN. Intercepts do not verify external risk outcomes, permissions,
 * real audit persistence, production tenancy or database integrity. */
import {test,expect,type Page} from '@playwright/test';
import {openRisks,riskPermissions,riskIdA,riskTenantId,riskOwnerId,
 urgentRisk,monitoredRisk,closedRisk,manyRisks} from '../../../support/platformRiskRegisterFixture';
const root=(p:Page)=>p.locator('.platform-risk-register');
const form=(p:Page)=>p.locator('#platform-risk-register-form');
const section=(p:Page,name:string)=>root(p).locator('.platform-risk-register__section').filter({has:p.getByRole('heading',{name,exact:true})});
const filters=(p:Page)=>section(p,'Filters');
const registry=(p:Page)=>section(p,'Risk registry');
const cards=(p:Page)=>p.locator('.platform-risk-register__card');
const card=(p:Page,name:string)=>cards(p).filter({has:p.getByRole('heading',{name,exact:true})});
const pager=(p:Page)=>registry(p).locator('.platform-risk-register__pagination');
const without=(...removed:string[])=>riskPermissions.filter(x=>!removed.includes(x));
const endpoint='/platform/risk-register';

test.describe('Platform Risk Register — evidence and permission boundaries (GENERATED_UNRUN)',()=>{
 test('PRISK-001 Protected workspace exposes Risk register heading',async({page})=>{
  await openRisks(page);await expect(root(page)).toContainText('Registry-wide filtered summary');
  await expect(root(page)).toContainText('50 rows per page');
 });
 test('PRISK-002 Evidence states recorded inputs do not prove external risk outcomes',async({page})=>{
  await openRisks(page);await expect(root(page)).toContainText('Application-maintained evidence only.');
  await expect(root(page)).toContainText('does not prove external/customer/legal acceptance');
  await expect(root(page)).toContainText('does not prove the underlying real-world risk was eliminated');
 });
 test('PRISK-003 Summary uses filtered global count rather than current page size',async({page})=>{
  await openRisks(page,{rows:manyRisks(51)});await expect(cards(page)).toHaveCount(50);
  await expect(page.getByLabel('Risk register summary')).toContainText('51');
  await expect(page.getByLabel('Risk register summary')).toContainText('Across the full filtered registry');
 });
 test('PRISK-004 Active summary excludes closed and cancelled workflow states',async({page})=>{
  await openRisks(page);await expect(page.getByLabel('Risk register summary')).toContainText('Active / tracked');
  await expect(page.getByLabel('Risk register summary')).toContainText('Everything except closed or cancelled');
 });
 test('PRISK-005 Severity 16 is a danger-tone derived classification',async({page})=>{
  await openRisks(page);await expect(card(page,urgentRisk.title).locator('[data-tone="danger"]')).toContainText('Severity 16');
 });
 test('PRISK-006 Severity 1 is styled as low attention',async({page})=>{
  await openRisks(page);await expect(card(page,monitoredRisk.title).locator('[data-tone="good"]')).toContainText('Severity 1');
 });
 test('PRISK-007 Card separates likelihood/impact from severity score',async({page})=>{
  await openRisks(page);const current=card(page,urgentRisk.title);
  await expect(current).toContainText('Likelihood / impact');await expect(current).toContainText('critical / critical');
  await expect(current).toContainText('Severity 16');
 });
 test('PRISK-008 Mitigation and contingency are independently presented',async({page})=>{
  await openRisks(page);const current=card(page,urgentRisk.title);
  await expect(current).toContainText('Fixture mitigation procedure');
  await expect(current).toContainText('Fixture contingency procedure');
 });
 test('PRISK-009 Missing plans show explicit Not recorded placeholders',async({page})=>{
  await openRisks(page);const current=card(page,monitoredRisk.title);
  await expect(current.locator('.platform-risk-register__plans')).toContainText('Not recorded');
 });
 test('PRISK-010 Missing description uses application-only placeholder',async({page})=>{
  await openRisks(page,{rows:[{...monitoredRisk,description:null}]});
  await expect(card(page,monitoredRisk.title)).toContainText('No application description recorded.');
 });
 test('PRISK-011 Platform-wide unlinked risk distinguishes no tenant association',async({page})=>{
  await openRisks(page);await expect(card(page,monitoredRisk.title)).toContainText('Platform-wide');
 });
 test('PRISK-012 Missing owner shows Not assigned',async({page})=>{
  await openRisks(page);await expect(card(page,monitoredRisk.title)).toContainText('Not assigned');
 });
 test('PRISK-013 Tenant link takes user to selected tenant context',async({page})=>{
  await openRisks(page);await expect(card(page,urgentRisk.title).getByRole('link',{name:'Tenant record'}))
   .toHaveAttribute('href',`/platform/tenants?tenant_id=${riskTenantId}`);
 });
 test('PRISK-014 Audit link is navigation not proof of stored audit history',async({page})=>{
  await openRisks(page);await expect(card(page,urgentRisk.title).getByRole('link',{name:'Platform audit'}))
   .toHaveAttribute('href','/platform/audit');
 });
 test('PRISK-015 Read-only role sees risks but no write form or transitions',async({page})=>{
  await openRisks(page,{permissions:without('platform.risks.write')});
  await expect(card(page,urgentRisk.title)).toBeVisible();await expect(form(page)).toHaveCount(0);
  await expect(card(page,urgentRisk.title).getByRole('button',{name:'Edit details'})).toHaveCount(0);
  await expect(card(page,urgentRisk.title).getByRole('button',{name:'Apply status'})).toHaveCount(0);
 });
 test('PRISK-016 Missing risks.read blocks route and risk list transport',async({page})=>{
  const calls:string[]=[];await openRisks(page,{permissions:without('platform.risks.read'),expectHeading:false,
   onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
  expect(calls).toHaveLength(0);
 });
 test('PRISK-017 Missing TENANTS_READ hides tenant identity but preserves linked indication',async({page})=>{
  await openRisks(page,{permissions:without('platform.tenants.read')});
  await expect(root(page)).toContainText('Tenant identity is hidden without TENANTS_READ');
  await expect(card(page,urgentRisk.title)).toContainText('Tenant-linked · identity restricted');
  await expect(card(page,urgentRisk.title)).not.toContainText('Fixture Tenant Alpha');
  await expect(card(page,urgentRisk.title).getByRole('link',{name:'Tenant record'})).toHaveCount(0);
 });
 test('PRISK-018 Missing PLATFORM_USERS_READ masks owner and updater identity',async({page})=>{
  await openRisks(page,{permissions:without('platform.users.read')});
  const current=card(page,urgentRisk.title);await expect(current).toContainText('Assigned · identity restricted');
  await expect(current).not.toContainText('risk-owner@fixture.test');
  await expect(current).toContainText('Identity unavailable / restricted');
 });
 test('PRISK-019 Restricted tenant permission removes filter control and dependent API',async({page})=>{
  const calls:string[]=[];await openRisks(page,{permissions:without('platform.tenants.read'),onCall:(m,p)=>{if(p==='/platform/tenants')calls.push(m);}});
  await expect(filters(page)).toContainText('Tenant filter restricted');
  await expect(filters(page).getByLabel('Tenant')).toHaveCount(0);expect(calls).toHaveLength(0);
 });
 test('PRISK-020 Restricted users permission removes owner filter and identity GET',async({page})=>{
  const calls:string[]=[];await openRisks(page,{permissions:without('platform.users.read'),onCall:(m,p)=>{if(p==='/platform/users')calls.push(m);}});
  await expect(filters(page)).toContainText('Owner filter restricted');
  await expect(filters(page).getByLabel('Owner')).toHaveCount(0);expect(calls).toHaveLength(0);
 });
 test('PRISK-021 Restricted tenant and owner controls do not leak into create editor',async({page})=>{
  await openRisks(page,{permissions:without('platform.tenants.read','platform.users.read')});
  await expect(form(page).getByLabel('Tenant')).toHaveCount(0);await expect(form(page).getByLabel('Owner')).toHaveCount(0);
  await expect(form(page)).toContainText('Existing linkage is preserved');
 });
 test('PRISK-022 Source-specific supporting links require their own permissions',async({page})=>{
  await openRisks(page,{permissions:without('platform.vendors.read','platform.dependencies.read','platform.incidents.read','platform.releases.read','platform.audit.read')});
  const s=section(page,'Supporting operations');
  for(const name of ['Vendors','Service dependencies','Incidents','Releases','Platform audit'])
   await expect(s.getByRole('link',{name,exact:true})).toHaveCount(0);
  await expect(s.getByRole('link',{name:'Tenants'})).toBeVisible();
 });
});

test.describe('Platform Risk Register — protected URL filters and paging (GENERATED_UNRUN)',()=>{
 test('PRISK-023 Status filter forwards enum and narrows list',async({page})=>{
  const values:string[]=[];await openRisks(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)values.push(q.get('status')||'');}});
  await filters(page).getByLabel('Status').selectOption('monitoring');
  await expect(card(page,monitoredRisk.title)).toBeVisible();await expect(card(page,urgentRisk.title)).toHaveCount(0);
  await expect.poll(()=>values.at(-1)).toBe('monitoring');
 });
 test('PRISK-024 Category filter selects billing risk only',async({page})=>{
  await openRisks(page);await filters(page).getByLabel('Category').selectOption('billing');
  await expect(card(page,urgentRisk.title)).toBeVisible();await expect(card(page,monitoredRisk.title)).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('category')).toBe('billing');
 });
 test('PRISK-025 Tenant filter forwards an exact UUID when permission allows',async({page})=>{
  const values:string[]=[];await openRisks(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)values.push(q.get('tenant_id')||'');}});
  await filters(page).getByLabel('Tenant').selectOption(riskTenantId);
  await expect.poll(()=>values.at(-1)).toBe(riskTenantId);
 });
 test('PRISK-026 Owner filter forwards exact platform user UUID',async({page})=>{
  const values:string[]=[];await openRisks(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)values.push(q.get('owner_platform_user_id')||'');}});
  await filters(page).getByLabel('Owner').selectOption(riskOwnerId);
  await expect.poll(()=>values.at(-1)).toBe(riskOwnerId);
 });
 test('PRISK-027 Text search filters risk title or plans',async({page})=>{
  const values:string[]=[];await openRisks(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)values.push(q.get('search')||'');}});
  await filters(page).getByLabel('Search').fill('Fixture mitigation procedure');
  await expect(card(page,urgentRisk.title)).toBeVisible();await expect(card(page,monitoredRisk.title)).toHaveCount(0);
  await expect.poll(()=>values.at(-1)).toBe('Fixture mitigation procedure');
 });
 test('PRISK-028 Review due checkbox sends boolean true and excludes undated risk',async({page})=>{
  await openRisks(page);await filters(page).getByLabel('Review due only').check();
  await expect(card(page,urgentRisk.title)).toBeVisible();await expect(card(page,monitoredRisk.title)).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('due_only')).toBe('true');
 });
 test('PRISK-029 URL-backed filters reconstruct allowed state on reopening',async({page})=>{
  await openRisks(page,{query:'status=open&category=billing'});
  await expect(filters(page).getByLabel('Status')).toHaveValue('open');
  await expect(filters(page).getByLabel('Category')).toHaveValue('billing');
  await expect(card(page,urgentRisk.title)).toBeVisible();
 });
 test('PRISK-030 Unsupported status URL prevents risk fetch',async({page})=>{
  const calls:string[]=[];await openRisks(page,{query:'status=resolved',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(root(page)).toContainText('Invalid or forbidden URL filter.');expect(calls).toHaveLength(0);
 });
 test('PRISK-031 Unsupported category URL prevents risk fetch',async({page})=>{
  const calls:string[]=[];await openRisks(page,{query:'category=fraudulent',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(root(page)).toContainText('Invalid or forbidden URL filter.');expect(calls).toHaveLength(0);
 });
 test('PRISK-032 Malformed tenant UUID URL blocks registry transport',async({page})=>{
  const calls:string[]=[];await openRisks(page,{query:'tenant_id=foo',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(root(page)).toContainText('Invalid or forbidden URL filter.');expect(calls).toHaveLength(0);
 });
 test('PRISK-033 Tenant URL filter forbidden without TENANTS_READ',async({page})=>{
  const calls:string[]=[];await openRisks(page,{permissions:without('platform.tenants.read'),query:`tenant_id=${riskTenantId}`,
   onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(root(page)).toContainText('Invalid or forbidden URL filter.');expect(calls).toHaveLength(0);
 });
 test('PRISK-034 Owner URL filter forbidden without PLATFORM_USERS_READ',async({page})=>{
  const calls:string[]=[];await openRisks(page,{permissions:without('platform.users.read'),query:`owner_platform_user_id=${riskOwnerId}`,
   onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(root(page)).toContainText('Invalid or forbidden URL filter.');expect(calls).toHaveLength(0);
 });
 test('PRISK-035 Unsupported due_only boolean blocks risk list',async({page})=>{
  const calls:string[]=[];await openRisks(page,{query:'due_only=occasionally',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(root(page)).toContainText('Invalid or forbidden URL filter.');expect(calls).toHaveLength(0);
 });
 test('PRISK-036 Search exceeding 200 blocks risk list',async({page})=>{
  const calls:string[]=[];await openRisks(page,{query:`search=${'Q'.repeat(201)}`,
   onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(root(page)).toContainText('Invalid or forbidden URL filter.');expect(calls).toHaveLength(0);
 });
 test('PRISK-037 Reset invalid filters resumes risk registry GET',async({page})=>{
  const calls:string[]=[];await openRisks(page,{query:'status=forbidden',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await root(page).getByRole('button',{name:'Clear filters'}).click();
  await expect(card(page,urgentRisk.title)).toBeVisible();expect(calls.length).toBeGreaterThan(0);
 });
 test('PRISK-038 Page size is 50 and backend query enforces it',async({page})=>{
  const limits:string[]=[];await openRisks(page,{rows:manyRisks(51),onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)limits.push(q.get('limit')||'');}});
  await expect(cards(page)).toHaveCount(50);expect(limits).toContain('50');
 });
 test('PRISK-039 Next requests offset 50 and shows last record',async({page})=>{
  const offsets:string[]=[];await openRisks(page,{rows:manyRisks(51),onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)offsets.push(q.get('offset')||'');}});
  await pager(page).getByRole('button',{name:'Next'}).click();
  await expect(card(page,'Fixture Risk 051')).toBeVisible();expect(offsets).toContain('50');
 });
 test('PRISK-040 Last page disables Next and Previous returns to first record',async({page})=>{
  await openRisks(page,{rows:manyRisks(51)});await pager(page).getByRole('button',{name:'Next'}).click();
  await expect(pager(page).getByRole('button',{name:'Next'})).toBeDisabled();
  await pager(page).getByRole('button',{name:'Previous'}).click();
  await expect(card(page,'Fixture Risk 001')).toBeVisible();
 });
 test('PRISK-041 Empty match states an application-evidence limit rather than proof of no risk',async({page})=>{
  await openRisks(page,{query:'search=NoSyntheticMatches'});
  await expect(registry(page)).toContainText('No risks match the current filters.');
  await expect(registry(page)).toContainText('does not prove that no external or real-world risk exists');
  await expect(cards(page)).toHaveCount(0);
 });
});

// Batch 79: source-grounded mutation, permissions and recovery; GENERATED_UNRUN.
// Assertions cover mocked UI/request contracts, NOT database/ACL/audit or risk elimination.
test.describe('Platform Risk Register — create and edit contracts (GENERATED_UNRUN)',()=>{
 test('PRISK-042 Create form starts with source defaults and disabled Save',async({page})=>{
  await openRisks(page);await expect(form(page).getByLabel('Category')).toHaveValue('operational');
  await expect(form(page).getByLabel('Initial status')).toHaveValue('open');
  await expect(form(page).getByLabel('Likelihood')).toHaveValue('medium');
  await expect(form(page).getByLabel('Impact')).toHaveValue('medium');
  await expect(form(page).getByRole('button',{name:'Create risk'})).toBeDisabled();
 });
 test('PRISK-043 Blank title cannot produce create request',async({page})=>{
  const calls:string[]=[];await openRisks(page,{onCall:(m,p)=>{if(m==='POST'&&p===endpoint)calls.push(p);}});
  await form(page).getByLabel('Risk title').fill('   ');
  await expect(form(page).getByRole('button',{name:'Create risk'})).toBeDisabled();
  await expect(form(page)).toContainText('Enter a risk title before saving.');expect(calls).toHaveLength(0);
 });
 test('PRISK-044 Title is trimmed before create payload',async({page})=>{
  const bodies:any[]=[];await openRisks(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p===endpoint)bodies.push(b);}});
  await form(page).getByLabel('Risk title').fill('  Recorded capacity risk  ');
  await form(page).getByRole('button',{name:'Create risk'}).click();
  await expect.poll(()=>bodies.length).toBe(1);expect(bodies[0].title).toBe('Recorded capacity risk');
 });
 test('PRISK-045 Title input has maximum length 240',async({page})=>{
  await openRisks(page);const title=form(page).getByLabel('Risk title');
  await expect(title).toHaveAttribute('maxlength','240');await title.fill('Q'.repeat(260));
  await expect(title).toHaveValue('Q'.repeat(240));
 });
 test('PRISK-046 Description and plans each enforce 5000 maximum',async({page})=>{
  await openRisks(page);
  for(const label of ['Description','Mitigation plan','Contingency plan']){
   const field=form(page).getByLabel(label);await expect(field).toHaveAttribute('maxlength','5000');
   await field.fill('a'.repeat(5010));await expect(field).toHaveValue('a'.repeat(5000));
  }
 });
 test('PRISK-047 Initial workflow status is sent on create',async({page})=>{
  let body:any;await openRisks(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p===endpoint)body=b;}});
  await form(page).getByLabel('Risk title').fill('Fixture Accepted Input');
  await form(page).getByLabel('Initial status').selectOption('accepted');
  await form(page).getByRole('button',{name:'Create risk'}).click();
  await expect.poll(()=>body?.status).toBe('accepted');
 });
 test('PRISK-048 New risk uses selected category likelihood and impact',async({page})=>{
  let body:any;await openRisks(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p===endpoint)body=b;}});
  await form(page).getByLabel('Risk title').fill('Fixture Level Input');
  await form(page).getByLabel('Category').selectOption('security');
  await form(page).getByLabel('Likelihood').selectOption('high');
  await form(page).getByLabel('Impact').selectOption('critical');
  await form(page).getByRole('button',{name:'Create risk'}).click();
  await expect.poll(()=>body?.title).toBe('Fixture Level Input');
  expect(body).toMatchObject({category:'security',likelihood:'high',impact:'critical'});
  expect(body).not.toHaveProperty('severity_score');
 });
 test('PRISK-049 Review-due local datetime becomes ISO in request',async({page})=>{
  let body:any;await openRisks(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p===endpoint)body=b;}});
  await form(page).getByLabel('Risk title').fill('Fixture Review Due');
  const local='2026-11-17T14:30';await form(page).getByLabel('Review due').fill(local);
  await form(page).getByRole('button',{name:'Create risk'}).click();
  await expect.poll(()=>body?.review_due_at).toMatch(/^2026-11-17T/);
  expect(new Date(body.review_due_at).toISOString()).toBe(body.review_due_at);
 });
 test('PRISK-050 Native datetime-local input sanitizes malformed date before request',async({page})=>{
  await openRisks(page);const date=form(page).getByLabel('Review due');
  await date.evaluate((el:HTMLInputElement)=>{el.value='not-a-real-date';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await expect(date).toHaveValue('');
  // Browser-native datetime-local refuses malformed strings; this does not exercise a forged React state.
  await expect(form(page).getByRole('button',{name:'Create risk'})).toBeDisabled();
 });
 test('PRISK-051 Create with tenant and owner sends authorized identifiers',async({page})=>{
  let body:any;await openRisks(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p===endpoint)body=b;}});
  await form(page).getByLabel('Risk title').fill('Linked fixture');
  await form(page).getByLabel('Tenant').selectOption(riskTenantId);await form(page).getByLabel('Owner').selectOption(riskOwnerId);
  await form(page).getByRole('button',{name:'Create risk'}).click();
  await expect.poll(()=>body?.tenant_id).toBe(riskTenantId);expect(body.owner_platform_user_id).toBe(riskOwnerId);
 });
 test('PRISK-052 Without tenant read permission create omits tenant_id entirely',async({page})=>{
  let body:any;await openRisks(page,{permissions:without('platform.tenants.read'),onCall:(m,p,_q,b)=>{if(m==='POST'&&p===endpoint)body=b;}});
  await expect(form(page).getByLabel('Tenant')).toHaveCount(0);
  await form(page).getByLabel('Risk title').fill('Restricted tenant create');await form(page).getByRole('button',{name:'Create risk'}).click();
  await expect.poll(()=>body?.title).toBe('Restricted tenant create');expect(body).not.toHaveProperty('tenant_id');
 });
 test('PRISK-053 Without platform users read create omits owner linkage entirely',async({page})=>{
  let body:any;await openRisks(page,{permissions:without('platform.users.read'),onCall:(m,p,_q,b)=>{if(m==='POST'&&p===endpoint)body=b;}});
  await expect(form(page).getByLabel('Owner')).toHaveCount(0);
  await form(page).getByLabel('Risk title').fill('Restricted owner create');await form(page).getByRole('button',{name:'Create risk'}).click();
  await expect.poll(()=>body?.title).toBe('Restricted owner create');expect(body).not.toHaveProperty('owner_platform_user_id');
 });
 test('PRISK-054 Inactive platform owner excluded from create selector',async({page})=>{
  await openRisks(page);await expect(form(page).getByLabel('Owner').locator('option')).toHaveCount(2);
  await expect(form(page).getByLabel('Owner').locator('option')).not.toContainText(['inactive-risk-owner@fixture.test']);
 });
 test('PRISK-055 Successful create shows result and resets form',async({page})=>{
  await openRisks(page);await form(page).getByLabel('Risk title').fill('Created fixture');
  await form(page).getByRole('button',{name:'Create risk'}).click();
  await expect(root(page)).toContainText('Risk created.');
  await expect(form(page).getByLabel('Risk title')).toHaveValue('');
  await expect(form(page).getByRole('button',{name:'Create risk'})).toBeDisabled();
 });
 test('PRISK-056 Create rejection retains draft and shows error',async({page})=>{
  await openRisks(page,{responses:{[`POST ${endpoint}`]:{status:409,json:{message:'Synthetic duplicate risk'}}}});
  await form(page).getByLabel('Risk title').fill('Unsent draft');await form(page).getByRole('button',{name:'Create risk'}).click();
  await expect(root(page)).toContainText('Action failed.');await expect(form(page).getByLabel('Risk title')).toHaveValue('Unsent draft');
 });
 test('PRISK-057 Edit details loads existing risk into form',async({page})=>{
  await openRisks(page);await card(page,urgentRisk.title).getByRole('button',{name:'Edit details'}).click();
  await expect(form(page).getByLabel('Risk title')).toHaveValue(urgentRisk.title);
  await expect(form(page).getByLabel('Category')).toHaveValue('billing');
  await expect(form(page).getByRole('button',{name:'Save details'})).toBeEnabled();
 });
 test('PRISK-058 Edit hides initial status selection and delegates to transition',async({page})=>{
  await openRisks(page);await card(page,urgentRisk.title).getByRole('button',{name:'Edit details'}).click();
  await expect(form(page).getByLabel('Initial status')).toHaveCount(0);
  await expect(form(page)).toContainText('Status handled separately');
 });
 test('PRISK-059 Edit updates description mitigation contingency and review',async({page})=>{
  let body:any;await openRisks(page,{onCall:(m,p,_q,b)=>{if(m==='PATCH'&&p===`${endpoint}/${riskIdA}`)body=b;}});
  await card(page,urgentRisk.title).getByRole('button',{name:'Edit details'}).click();
  await form(page).getByLabel('Description').fill('  Revised description  ');
  await form(page).getByLabel('Mitigation plan').fill('  Revised mitigation  ');
  await form(page).getByLabel('Contingency plan').fill('  Revised contingency  ');
  await form(page).getByLabel('Review due').fill('2026-11-21T10:45');
  await form(page).getByRole('button',{name:'Save details'}).click();
  await expect.poll(()=>body?.description).toBe('Revised description');
  expect(body).toMatchObject({mitigation_plan:'Revised mitigation',contingency_plan:'Revised contingency'});
  expect(body.review_due_at).toMatch(/^2026-11-21T/);
 });
 test('PRISK-060 Edit uses PATCH without workflow status field',async({page})=>{
  const mutations:any[]=[];await openRisks(page,{onCall:(m,p,_q,b)=>{if(m==='PATCH'&&p===`${endpoint}/${riskIdA}`)mutations.push(b);}});
  await card(page,urgentRisk.title).getByRole('button',{name:'Edit details'}).click();
  await form(page).getByLabel('Risk title').fill('Changed title');await form(page).getByRole('button',{name:'Save details'}).click();
  await expect.poll(()=>mutations.length).toBe(1);expect(mutations[0].title).toBe('Changed title');
  expect(mutations[0]).not.toHaveProperty('status');
 });
 test('PRISK-061 Cancel edit restores default create editor without save',async({page})=>{
  const writes:string[]=[];await openRisks(page,{onCall:(m,p)=>{if(m==='PATCH'&&p.startsWith(endpoint))writes.push(p);}});
  await card(page,urgentRisk.title).getByRole('button',{name:'Edit details'}).click();
  await form(page).getByLabel('Risk title').fill('Do not persist');
  await form(page).getByRole('button',{name:'Cancel edit'}).click();
  await expect(form(page).getByLabel('Risk title')).toHaveValue('');
  await expect(form(page).getByRole('button',{name:'Create risk'})).toBeVisible();expect(writes).toHaveLength(0);
 });
 test('PRISK-062 Failed PATCH keeps form open and error visible',async({page})=>{
  await openRisks(page,{responses:{[`PATCH ${endpoint}/${riskIdA}`]:{status:409,json:{message:'Version conflict'}}}});
  await card(page,urgentRisk.title).getByRole('button',{name:'Edit details'}).click();
  await form(page).getByLabel('Risk title').fill('Unsaved after conflict');await form(page).getByRole('button',{name:'Save details'}).click();
  await expect(root(page)).toContainText('Action failed.');
  await expect(form(page).getByLabel('Risk title')).toHaveValue('Unsaved after conflict');
 });
 test('PRISK-063 Successful PATCH returns to clean create state',async({page})=>{
  await openRisks(page);await card(page,urgentRisk.title).getByRole('button',{name:'Edit details'}).click();
  await form(page).getByRole('button',{name:'Save details'}).click();
  await expect(root(page)).toContainText('Risk details saved.');
  await expect(form(page).getByRole('button',{name:'Create risk'})).toBeDisabled();
 });
});

test.describe('Platform Risk Register — workflow transitions and recovery (GENERATED_UNRUN)',()=>{
 test('PRISK-064 Unchanged draft status disables Apply status',async({page})=>{
  await openRisks(page);await expect(card(page,urgentRisk.title).getByRole('button',{name:'Apply status'})).toBeDisabled();
 });
 test('PRISK-065 Status control contains precisely supported workflow enumerations',async({page})=>{
  await openRisks(page);const values=await card(page,urgentRisk.title).getByLabel(`Next status for ${urgentRisk.title}`).locator('option').evaluateAll((options)=>options.map(o=>(o as HTMLOptionElement).value));
  expect(values).toEqual(['open','monitoring','mitigating','accepted','closed','cancelled']);
 });
 test('PRISK-066 Explicit status change POST contains status only',async({page})=>{
  let body:any;await openRisks(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p===`${endpoint}/${riskIdA}/status`)body=b;}});
  await card(page,urgentRisk.title).getByLabel(`Next status for ${urgentRisk.title}`).selectOption('mitigating');
  await card(page,urgentRisk.title).getByRole('button',{name:'Apply status'}).click();
  await expect.poll(()=>body?.status).toBe('mitigating');expect(Object.keys(body)).toEqual(['status']);
 });
 test('PRISK-067 Success updates card state and success message',async({page})=>{
  await openRisks(page);await card(page,urgentRisk.title).getByLabel(`Next status for ${urgentRisk.title}`).selectOption('monitoring');
  await card(page,urgentRisk.title).getByRole('button',{name:'Apply status'}).click();
  await expect(root(page)).toContainText('Risk status changed to monitoring.');
  await expect(card(page,urgentRisk.title).locator('.platform-risk-register__badges')).toContainText('monitoring');
 });
 test('PRISK-068 Status mutation failure keeps previous card status',async({page})=>{
  await openRisks(page,{responses:{[`POST ${endpoint}/${riskIdA}/status`]:{status:409,json:{message:'Synthetic transition blocked'}}}});
  await card(page,urgentRisk.title).getByLabel(`Next status for ${urgentRisk.title}`).selectOption('closed');
  await card(page,urgentRisk.title).getByRole('button',{name:'Apply status'}).click();
  await expect(root(page)).toContainText('Action failed.');
  await expect(card(page,urgentRisk.title).locator('.platform-risk-register__badges')).toContainText('open');
 });
 test('PRISK-069 Closed card blocks details edit while showing reopen status control',async({page})=>{
  await openRisks(page);await expect(card(page,closedRisk.title)).toContainText('details immutable until reopened');
  await expect(card(page,closedRisk.title).getByRole('button',{name:'Edit details'})).toHaveCount(0);
 });
 test('PRISK-070 Cancelled card blocks details editing',async({page})=>{
  await openRisks(page,{rows:[{...closedRisk,status:'cancelled'}]});
  await expect(card(page,closedRisk.title)).toContainText('cancelled · details immutable until reopened');
  await expect(card(page,closedRisk.title).getByRole('button',{name:'Edit details'})).toHaveCount(0);
 });
 test('PRISK-071 Reopen status transition restores edit action',async({page})=>{
  await openRisks(page);await card(page,closedRisk.title).getByLabel(`Next status for ${closedRisk.title}`).selectOption('open');
  await card(page,closedRisk.title).getByRole('button',{name:'Reopen'}).click();
  await expect(card(page,closedRisk.title).getByRole('button',{name:'Edit details'})).toBeVisible();
 });
 test('PRISK-072 Closing a risk being edited exits edit mode',async({page})=>{
  await openRisks(page);await card(page,urgentRisk.title).getByRole('button',{name:'Edit details'}).click();
  await card(page,urgentRisk.title).getByLabel(`Next status for ${urgentRisk.title}`).selectOption('closed');
  await card(page,urgentRisk.title).getByRole('button',{name:'Apply status'}).click();
  await expect(form(page).getByRole('button',{name:'Create risk'})).toBeVisible();
  await expect(form(page).getByLabel('Risk title')).toHaveValue('');
 });
 test('PRISK-073 Accepted workflow badge does not claim external acceptance',async({page})=>{
  await openRisks(page,{rows:[{...urgentRisk,status:'accepted'}]});
  await expect(card(page,urgentRisk.title).locator('.platform-risk-register__badges')).toContainText('accepted');
  await expect(root(page)).toContainText('does not prove external/customer/legal acceptance');
 });
 test('PRISK-074 Closed workflow badge does not claim real-world risk elimination',async({page})=>{
  await openRisks(page);await expect(card(page,closedRisk.title)).toContainText('closed');
  await expect(root(page)).toContainText('does not prove the underlying real-world risk was eliminated');
 });
 test('PRISK-075 Changing URL filter resets pagination to first page',async({page})=>{
  const offsets:string[]=[];await openRisks(page,{rows:manyRisks(51),onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)offsets.push(q.get('offset')||'');}});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect(card(page,'Fixture Risk 051')).toBeVisible();
  await filters(page).getByLabel('Status').selectOption('monitoring');
  await expect.poll(()=>offsets.at(-1)).toBe('0');
 });
 test('PRISK-076 Explicit refresh reissues filtered GET without writes',async({page})=>{
  const calls:string[]=[];await openRisks(page,{query:'status=open',onCall:(m,p,q)=>{if(p===endpoint)calls.push(`${m}:${q.get('status')}`);}});
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>calls.filter(x=>x==='GET:open').length).toBeGreaterThan(1);
  expect(calls.every(x=>x==='GET:open')).toBe(true);
 });
 test('PRISK-077 Refresh error retains previous cached snapshot with warning',async({page})=>{
  let fail=false;await openRisks(page,{respond:(m,p)=>m==='GET'&&p===endpoint&&fail?{status:503,json:{message:'Synthetic refresh outage'}}:undefined});
  await expect(card(page,urgentRisk.title)).toBeVisible();fail=true;
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(root(page)).toContainText('Showing the last successful snapshot.');
  await expect(card(page,urgentRisk.title)).toBeVisible();
 });
 test('PRISK-078 Initial list failure offers retry and recovers',async({page})=>{
  let fail=true;await openRisks(page,{respond:(m,p)=>m==='GET'&&p===endpoint&&fail?{status:503,json:{message:'Synthetic list outage'}}:undefined});
  await expect(registry(page)).toContainText('Risk register could not be loaded.');
  fail=false;await registry(page).getByRole('button',{name:'Retry'}).click();
  await expect(card(page,urgentRisk.title)).toBeVisible();
 });
 test('PRISK-079 Both identity permissions absent excludes linkage fields from PATCH',async({page})=>{
  let body:any;await openRisks(page,{permissions:without('platform.tenants.read','platform.users.read'),
   onCall:(m,p,_q,b)=>{if(m==='PATCH'&&p===`${endpoint}/${riskIdA}`)body=b;}});
  await card(page,urgentRisk.title).getByRole('button',{name:'Edit details'}).click();
  await form(page).getByLabel('Risk title').fill('Restricted safe edit');await form(page).getByRole('button',{name:'Save details'}).click();
  await expect.poll(()=>body?.title).toBe('Restricted safe edit');
  expect(body).not.toHaveProperty('tenant_id');expect(body).not.toHaveProperty('owner_platform_user_id');
 });
 test('PRISK-080 Browser response interception is not backend authorization or audit evidence',async({page})=>{
  const writes:string[]=[];await openRisks(page,{permissions:without('platform.risks.write'),
   onCall:(m,p)=>{if(m!=='GET'&&p.startsWith(endpoint))writes.push(`${m} ${p}`);}});
  await expect(card(page,urgentRisk.title).getByRole('button',{name:'Apply status'})).toHaveCount(0);
  await expect(card(page,urgentRisk.title).getByRole('button',{name:'Edit details'})).toHaveCount(0);
  expect(writes).toEqual([]); // Real 403/transaction/audit durability needs Phase 2.
 });
});
