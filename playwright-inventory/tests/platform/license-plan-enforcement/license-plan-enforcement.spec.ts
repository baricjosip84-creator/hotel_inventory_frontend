/** Batch 100 — Platform License & Plan Enforcement, 41 SOURCE_TRACED Phase 1 declarations.
 * Synthetic response rendering/requests only. A configured plan or runtime catalog entry
 * is not proof that customer licensing, payments, API/SSO guards, contracts or SQL work. */
import {test,expect,type Page} from '@playwright/test';
import {openLicenseEnforcement,licensePath,licensePermissions,licensePlans,licenseItems,manyLicenseItems,
 licenseTenantA,licenseTenantB,licenseTenantC,licenseTenantD} from '../../../support/platformLicensePlanEnforcementFixture';
const root=(p:Page)=>p.locator('.platform-license-plan');
const filters=(p:Page)=>root(p).locator('.platform-license-plan__filters');
const search=(p:Page)=>filters(p).getByLabel('Search tenant / plan / billing status');
const plan=(p:Page)=>filters(p).getByLabel('Plan code');
const billing=(p:Page)=>filters(p).getByLabel('Billing status');
const table=(p:Page)=>root(p).locator('.platform-license-plan__table');
const rows=(p:Page)=>table(p).locator('tbody tr');
const cards=(p:Page)=>root(p).locator('.platform-license-plan__plan-card');
const pager=(p:Page)=>root(p).locator('.platform-license-plan__pagination');
const without=(...keys:string[])=>licensePermissions.filter(p=>!keys.includes(p));
test.describe('Platform License and Plan Enforcement — BATCH_100_GENERATED_UNRUN',()=>{
 test('PLEN-001 License page loads as read-only application evidence',async({page})=>{
  await openLicenseEnforcement(page);await expect(root(page)).toContainText('Read only');await expect(table(page)).toBeVisible();
 });
 test('PLEN-002 Missing billing read permission blocks route before page fetch',async({page})=>{
  let gets=0;await openLicenseEnforcement(page,{permissions:without('platform.billing.read'),expectHeading:false,onCall:(m,p)=>{if(m==='GET'&&p===licensePath)gets++;}});
  await expect(root(page)).toHaveCount(0);expect(gets).toBe(0);
 });
 test('PLEN-003 Missing tenants read permission independently blocks route',async({page})=>{
  let gets=0;await openLicenseEnforcement(page,{permissions:without('platform.tenants.read'),expectHeading:false,onCall:(m,p)=>{if(m==='GET'&&p===licensePath)gets++;}});
  await expect(root(page)).toHaveCount(0);expect(gets).toBe(0);
 });
 test('PLEN-004 Initial evidence query uses bounded page size and zero offset',async({page})=>{
  const calls:string[]=[];await openLicenseEnforcement(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===licensePath)calls.push(q.toString());}});
  expect(calls.length).toBeGreaterThan(0);const q=new URLSearchParams(calls[0]);expect(q.get('limit')).toBe('50');expect(q.get('offset')).toBe('0');
 });
 test('PLEN-005 Archived tenants are excluded from the initial registry totals',async({page})=>{
  await openLicenseEnforcement(page);await expect(rows(page)).toHaveCount(7);await expect(table(page)).not.toContainText('Fixture License Archived');
  await expect(root(page).getByLabel('License and plan enforcement summary')).toContainText('7');
 });
 test('PLEN-006 Blocked tenant plan evidence determines aggregate application posture',async({page})=>{
  await openLicenseEnforcement(page);await expect(root(page)).toContainText('license plan enforcement blocked');
 });
 test('PLEN-007 Starter tenant with wired guards can be presented as ready',async({page})=>{
  await openLicenseEnforcement(page);const r=rows(page).filter({hasText:'Fixture License Alpha'});
  await expect(r).toContainText('license enforcement ready');await expect(r).toContainText('Configuration complete');
 });
 test('PLEN-008 Standard plan with unwired integration limit remains review required',async({page})=>{
  await openLicenseEnforcement(page);const r=rows(page).filter({hasText:'Fixture License Beta'});
  await expect(r).toContainText('license enforcement review required');await expect(r).toContainText('max integrations');
 });
 test('PLEN-009 Enterprise records show separate runtime limit and feature gaps',async({page})=>{
  await openLicenseEnforcement(page);const r=rows(page).filter({hasText:'Fixture License Gamma'});
  await expect(r).toContainText('max api clients');await expect(r).toContainText('sso');await expect(r).toContainText('api access');
 });
 test('PLEN-010 Past-due billing blocks plan enforcement regardless of configured metadata',async({page})=>{
  await openLicenseEnforcement(page);const r=rows(page).filter({hasText:'Fixture License Gamma'});
  await expect(r).toContainText('billing not enforceable');await expect(r).toContainText('license enforcement blocked');
 });
 test('PLEN-011 Unknown plan definition does not acquire fabricated runtime coverage',async({page})=>{
  await openLicenseEnforcement(page);const r=rows(page).filter({hasText:'Fixture License Delta'});
  await expect(r).toContainText('plan definition missing');await expect(r).toContainText('license enforcement blocked');
 });
 test('PLEN-012 No plan code is displayed as missing and blocked',async({page})=>{
  await openLicenseEnforcement(page);const r=rows(page).filter({hasText:'Fixture License Unconfigured'});
  await expect(r).toContainText('No plan code');await expect(r).toContainText('plan code missing');
 });
 test('PLEN-013 Invalid configured limits are not counted as enforcement readiness',async({page})=>{
  await openLicenseEnforcement(page);const r=rows(page).filter({hasText:'Fixture License Invalid'});
  await expect(r).toContainText('max users');await expect(r).toContainText('Configuration review');
 });
 test('PLEN-014 Missing required feature flag remains a separate review reason',async({page})=>{
  await openLicenseEnforcement(page);const r=rows(page).filter({hasText:'Fixture License Feature Gap'});
  await expect(r).toContainText('requisitions');await expect(r).toContainText('required feature flags missing');
 });
 test('PLEN-015 Catalog contains starter, standard and enterprise cards',async({page})=>{
  await openLicenseEnforcement(page);await expect(cards(page)).toHaveCount(3);
  await expect(cards(page).locator('.platform-license-plan__plan-head strong')).toHaveText(licensePlans.map(x=>x.plan_code));
 });
 test('PLEN-016 Catalog lists the exact starter required product and user limits',async({page})=>{
  await openLicenseEnforcement(page);const c=cards(page).nth(0);
  await expect(c).toContainText('max users');await expect(c).toContainText('max products');await expect(c).toContainText('max storage locations');
 });
 test('PLEN-017 Standard catalog separates runtime-enforced and unenforced limits',async({page})=>{
  await openLicenseEnforcement(page);const c=cards(page).nth(1);
  await expect(c).toContainText('Unenforced required limits');await expect(c).toContainText('max integrations');
  await expect(c).toContainText('Runtime incomplete');
 });
 test('PLEN-018 Enterprise catalog recommendation is labeled metadata not implementation',async({page})=>{
  await openLicenseEnforcement(page);const c=cards(page).nth(2);
  await expect(c).toContainText('contract limit enforcement');await expect(root(page)).toContainText('Catalog mode ≠ implementation');
 });
 test('PLEN-019 Starter shows no unenforced required controls',async({page})=>{
  await openLicenseEnforcement(page);const c=cards(page).nth(0);
  await expect(c).toContainText('None — all required limits have a runtime guard');
  await expect(c).toContainText('None — all required features have a runtime guard');
 });
 test('PLEN-020 Plan-card shortcut links directly to its catalog filter',async({page})=>{
  await openLicenseEnforcement(page);await expect(cards(page).nth(1).getByRole('link',{name:'Filter tenant evidence'}))
   .toHaveAttribute('href','/platform/license-plan-enforcement?plan_code=standard');
 });
 test('PLEN-021 Search by tenant name updates URL and narrows server result',async({page})=>{
  await openLicenseEnforcement(page);await search(page).fill('Alpha');await expect(page).toHaveURL(/search=Alpha/);
  await expect(rows(page)).toHaveCount(1);await expect(rows(page).first()).toContainText('Fixture License Alpha');
 });
 test('PLEN-022 Search by plan code uses server search rather than local hides',async({page})=>{
  await openLicenseEnforcement(page);await search(page).fill('standard');await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText('Fixture License Beta');
 });
 test('PLEN-023 Search accepts billing status source field',async({page})=>{
  await openLicenseEnforcement(page);await search(page).fill('past_due');await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText('Fixture License Gamma');
 });
 test('PLEN-024 Plan dropdown includes all source-defined catalog plans',async({page})=>{
  await openLicenseEnforcement(page);for(const p of licensePlans)await expect(plan(page).locator(`option[value="${p.plan_code}"]`)).toHaveCount(1);
 });
 test('PLEN-025 Plan-code filter updates URL and restricts table',async({page})=>{
  await openLicenseEnforcement(page);await plan(page).selectOption('enterprise');await expect(page).toHaveURL(/plan_code=enterprise/);
  await expect(rows(page)).toHaveCount(1);await expect(table(page)).toContainText('Fixture License Gamma');
 });
 test('PLEN-026 Billing filter shows all supported subscription statuses',async({page})=>{
  await openLicenseEnforcement(page);for(const s of ['not_configured','trialing','active','past_due','cancelled','comped'])
   await expect(billing(page).locator(`option[value="${s}"]`)).toHaveCount(1);
 });
 test('PLEN-027 Past-due status filter returns only matching license evidence',async({page})=>{
  await openLicenseEnforcement(page);await billing(page).selectOption('past_due');await expect(page).toHaveURL(/billing_status=past_due/);
  await expect(rows(page)).toHaveCount(1);await expect(rows(page).first()).toContainText('Fixture License Gamma');
 });
 test('PLEN-028 Plan, status and search filters intersect rather than union',async({page})=>{
  await openLicenseEnforcement(page,{query:'plan_code=starter&billing_status=active&search=Gamma'});
  await expect(table(page)).toContainText('No license/plan rows match');await expect(pager(page)).toContainText('Showing 0–0 of 0');
 });
 test('PLEN-029 Clear filters removes every active URL-backed scope',async({page})=>{
  await openLicenseEnforcement(page,{query:'search=Gamma&billing_status=past_due'});
  await filters(page).getByRole('button',{name:'Clear filters'}).click();await expect(search(page)).toHaveValue('');await expect(billing(page)).toHaveValue('');
  await expect(rows(page)).toHaveCount(7);
 });
 test('PLEN-030 Include archived tenants sends backend history filter',async({page})=>{
  const calls:string[]=[];await openLicenseEnforcement(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===licensePath)calls.push(q.toString());}});
  await filters(page).getByLabel('Include archived tenants').check();
  await expect(page).toHaveURL(/include_history=true/);await expect(rows(page)).toHaveCount(8);
  expect(calls.some(q=>new URLSearchParams(q).get('include_history')==='true')).toBe(true);
 });
 test('PLEN-031 Unchecking archived filter excludes historical tenants again',async({page})=>{
  await openLicenseEnforcement(page,{query:'include_history=true'});await expect(rows(page)).toHaveCount(8);
  await filters(page).getByLabel('Include archived tenants').uncheck();await expect(rows(page)).toHaveCount(7);
  await expect(table(page)).not.toContainText('Fixture License Archived');
 });
 test('PLEN-032 Tenant-specific deep link works even for known historical tenant',async({page})=>{
  const archived='b9900000-0000-4000-8000-000000000005';await openLicenseEnforcement(page,{query:`tenant_id=${archived}`});
  await expect(rows(page)).toHaveCount(1);await expect(table(page)).toContainText('Fixture License Archived');
 });
 test('PLEN-033 Unknown well-formed tenant ID returns a visible failure instead of fake license',async({page})=>{
  await openLicenseEnforcement(page,{query:'tenant_id=b9900000-0000-4000-8000-000000000099'});
  await expect(root(page)).toContainText('License and plan enforcement failed to load');
  await expect(table(page)).toHaveCount(0);
 });
 test('PLEN-034 Malformed tenant UUID suppresses backend evidence fetch',async({page})=>{
  let gets=0;await openLicenseEnforcement(page,{query:'tenant_id=not-a-uuid',onCall:(m,p)=>{if(m==='GET'&&p===licensePath)gets++;}});
  await expect(root(page)).toContainText('Invalid enforcement filters');expect(gets).toBe(0);
 });
 test('PLEN-035 Overlong search URL is invalid and blocks GET',async({page})=>{
  let gets=0;await openLicenseEnforcement(page,{query:`search=${'x'.repeat(201)}`,onCall:(m,p)=>{if(m==='GET'&&p===licensePath)gets++;}});
  await expect(root(page)).toContainText('Invalid enforcement filters');expect(gets).toBe(0);
 });
 test('PLEN-036 Overlong plan-code URL is invalid and blocks GET',async({page})=>{
  let gets=0;await openLicenseEnforcement(page,{query:`plan_code=${'p'.repeat(81)}`,onCall:(m,p)=>{if(m==='GET'&&p===licensePath)gets++;}});
  await expect(root(page)).toContainText('Invalid enforcement filters');expect(gets).toBe(0);
 });
 test('PLEN-037 Unsupported billing status URL is rejected before request',async({page})=>{
  let gets=0;await openLicenseEnforcement(page,{query:'billing_status=paid_offline',onCall:(m,p)=>{if(m==='GET'&&p===licensePath)gets++;}});
  await expect(root(page)).toContainText('Invalid enforcement filters');expect(gets).toBe(0);
 });
 test('PLEN-038 Large result set is capped to 50 table rows, summary remains global',async({page})=>{
  await openLicenseEnforcement(page,{items:manyLicenseItems(52)});await expect(rows(page)).toHaveCount(50);
  await expect(pager(page)).toContainText('Showing 1–50 of 52');await expect(root(page).getByLabel('License and plan enforcement summary')).toContainText('52');
 });
 test('PLEN-039 Next page advances exactly 50 rows without writes',async({page})=>{
  const queries:string[]=[];const writes:string[]=[];await openLicenseEnforcement(page,{items:manyLicenseItems(52),onCall:(m,p,q)=>{if(p===licensePath){if(m==='GET')queries.push(q.toString());else writes.push(m);}}});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect(rows(page)).toHaveCount(2);
  await expect(pager(page)).toContainText('Showing 51–52 of 52');expect(queries.some(q=>new URLSearchParams(q).get('offset')==='50')).toBe(true);
  expect(writes).toHaveLength(0);
 });
 test('PLEN-040 Previous returns to first page with correctly reset offset',async({page})=>{
  await openLicenseEnforcement(page,{items:manyLicenseItems(52),query:'offset=50'});await pager(page).getByRole('button',{name:'Previous'}).click();
  await expect(rows(page)).toHaveCount(50);await expect(pager(page)).toContainText('Showing 1–50 of 52');
 });
 test.skip('PLEN-041 Runtime guards, plan-limit SQL and external licensing need independent Phase 2 proof',async()=>{
  // The synthetic catalog contains the required controls and reports current guard coverage,
  // but cannot verify live enforcement, subscription grants, commercial contract or bank records.
 });
 test('PLEN-042 Invalid enforcement URL recovers through clear-filters control',async({page})=>{
  let gets=0;await openLicenseEnforcement(page,{query:'billing_status=not-a-status',onCall:(m,p)=>{if(m==='GET'&&p===licensePath)gets++;}});
  await expect(root(page)).toContainText('Invalid enforcement filters');expect(gets).toBe(0);
  await root(page).getByRole('button',{name:'Clear filters'}).first().click();await expect(rows(page)).toHaveCount(7);expect(gets).toBeGreaterThan(0);
 });
 test('PLEN-043 Tenant ID and billing status scopes combine without exposing others',async({page})=>{
  await openLicenseEnforcement(page,{query:`tenant_id=${licenseTenantC}&billing_status=past_due`});await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText('Fixture License Gamma');await expect(table(page)).not.toContainText('Fixture License Alpha');
 });
 test('PLEN-044 Plan code filter remains effective after search term change',async({page})=>{
  await openLicenseEnforcement(page,{query:'plan_code=standard'});await search(page).fill('Beta');
  await expect(page).toHaveURL(/plan_code=standard/);await expect(rows(page)).toHaveCount(1);await expect(rows(page).first()).toContainText('Fixture License Beta');
 });
 test('PLEN-045 Explicit include-history survives subsequent search updates',async({page})=>{
  await openLicenseEnforcement(page,{query:'include_history=true'});await search(page).fill('Archived');
  await expect(page).toHaveURL(/include_history=true/);await expect(rows(page)).toHaveCount(1);await expect(rows(page).first()).toContainText('Fixture License Archived');
 });
 test('PLEN-046 Search mutation drops old table pagination offset',async({page})=>{
  await openLicenseEnforcement(page,{items:manyLicenseItems(61),query:'offset=50'});await search(page).fill('Fixture 001');
  await expect(page).not.toHaveURL(/[?&]offset=/);await expect(rows(page)).toHaveCount(1);await expect(rows(page).first()).toContainText('License Fixture 001');
 });
 test('PLEN-047 Plan selection drops old table pagination offset',async({page})=>{
  await openLicenseEnforcement(page,{items:manyLicenseItems(61),query:'offset=50'});await plan(page).selectOption('starter');
  await expect(page).not.toHaveURL(/[?&]offset=/);await expect(rows(page)).toHaveCount(50);
 });
 test('PLEN-048 Archive-toggle update resets out-of-range pagination',async({page})=>{
  await openLicenseEnforcement(page,{items:manyLicenseItems(51),query:'offset=50'});
  await filters(page).getByLabel('Include archived tenants').check();await expect(page).not.toHaveURL(/[?&]offset=/);
  await expect(pager(page)).toContainText('Showing 1–50 of 51');
 });
 test('PLEN-049 Clearing plan selection removes plan_code URL key',async({page})=>{
  await openLicenseEnforcement(page,{query:'plan_code=enterprise'});await plan(page).selectOption('');
  await expect(page).not.toHaveURL(/[?&]plan_code=/);await expect(rows(page)).toHaveCount(7);
 });
 test('PLEN-050 Missing required limit shows specific configuration gap',async({page})=>{
  const item={...licenseItems[0],tenant_name:'Fixture Missing Users',configuration_complete:false,missing_limits:['max_users'],enforcement_gaps:['required_limits_missing'],enforcement_state:'license_enforcement_review_required' as const};
  await openLicenseEnforcement(page,{items:[item]});await expect(rows(page).first()).toContainText('max users');await expect(rows(page).first()).toContainText('Configuration review');
 });
 test('PLEN-051 Catalog missing required feature remains configuration review',async({page})=>{
  await openLicenseEnforcement(page);const r=rows(page).filter({hasText:'Fixture License Feature Gap'});
  await expect(r).toContainText('requisitions');await expect(r).toContainText('required feature flags missing');
 });
 test('PLEN-052 Unknown plan keeps missing-definition blocker separate from no-plan blocker',async({page})=>{
  await openLicenseEnforcement(page);const unknown=rows(page).filter({hasText:'Fixture License Delta'}),missing=rows(page).filter({hasText:'Fixture License Unconfigured'});
  await expect(unknown).toContainText('plan definition missing');await expect(missing).toContainText('plan code missing');
  await expect(unknown).not.toContainText('plan code missing');
 });
 test('PLEN-053 Malformed null chip arrays are normalized without inventing runtime controls',async({page})=>{
  const broken={...licenseItems[1],runtime_unenforced_limits:null,missing_limits:null,enforcement_gaps:null};
  await openLicenseEnforcement(page,{items:[broken as unknown as typeof licenseItems[number]]});
  await expect(rows(page)).toHaveCount(1);await expect(rows(page).first()).toContainText('Fixture License Beta');
  await expect(rows(page).first()).toContainText('No defined gaps');
 });
 test('PLEN-054 Unrecognized future enforcement gaps display as data not success',async({page})=>{
  const item={...licenseItems[1],enforcement_gaps:['future_license_guard_missing']};await openLicenseEnforcement(page,{items:[item]});
  await expect(rows(page).first()).toContainText('future license guard missing');await expect(rows(page).first()).toContainText('license enforcement review required');
 });
 test('PLEN-055 Summary counts remain registry-wide on page two',async({page})=>{
  await openLicenseEnforcement(page,{items:manyLicenseItems(52),query:'offset=50'});
  await expect(rows(page)).toHaveCount(2);await expect(root(page).getByLabel('License and plan enforcement summary')).toContainText('52');
 });
 test('PLEN-056 Tenant filtering with plan and status changes the table count',async({page})=>{
  await openLicenseEnforcement(page,{query:`tenant_id=${licenseTenantB}&plan_code=standard&billing_status=active`});await expect(rows(page)).toHaveCount(1);
  await billing(page).selectOption('past_due');await expect(rows(page)).toHaveCount(1);await expect(rows(page).first()).toContainText('No license/plan rows match');
 });
 test('PLEN-057 Empty filtered result disables both paging buttons',async({page})=>{
  await openLicenseEnforcement(page,{query:'search=nonexistent-license-plan'});
  await expect(rows(page).first()).toContainText('No license/plan rows match');
  await expect(pager(page).getByRole('button',{name:'Previous'})).toBeDisabled();await expect(pager(page).getByRole('button',{name:'Next'})).toBeDisabled();
 });
 test('PLEN-058 Next and previous buttons do not send writes',async({page})=>{
  const writes:string[]=[];await openLicenseEnforcement(page,{items:manyLicenseItems(51),onCall:(m,p)=>{if(p===licensePath&&m!=='GET')writes.push(m);}});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect(rows(page)).toHaveCount(1);
  await pager(page).getByRole('button',{name:'Previous'}).click();await expect(rows(page)).toHaveCount(50);expect(writes).toHaveLength(0);
 });
 test.skip('PLEN-059 Noninteger or nonnumeric URL offset requires canonicalization',async({page})=>{
  // BLOCKED: Number(searchParams.get('offset')) currently permits decimals and leaves the URL unchanged.
  const calls:string[]=[];await openLicenseEnforcement(page,{query:'offset=1.5',onCall:(method,path,q)=>{
   if(method==='GET'&&path===licensePath)calls.push(q.toString());
  }});
  await expect.poll(()=>calls.length).toBeGreaterThan(0);
  expect(Number.isInteger(Number(new URLSearchParams(calls.at(-1)).get('offset')))).toBe(true);
  await expect(page).toHaveURL(/\/platform\/license-plan-enforcement$/);
 });
 test.skip('PLEN-060 Offset beyond total never creates inverted count or misleading ready status',async({page})=>{
  // BLOCKED: current UI does not automatically reset out-of-range offset after the response.
  await openLicenseEnforcement(page,{query:'offset=500'});
  await expect(rows(page)).toHaveCount(7);
  await expect(page).toHaveURL(/\/platform\/license-plan-enforcement$/);
  await expect(pager(page)).not.toContainText('501–7');
 });
 test('PLEN-061 Refreshing successful snapshot preserves data if next response fails',async({page})=>{
  let fail=false;await openLicenseEnforcement(page,{respond:(m,p)=>m==='GET'&&p===licensePath&&fail?{status:503,json:{message:'Synthetic snapshot unavailable'}}:undefined});
  await expect(rows(page)).toHaveCount(7);fail=true;await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(rows(page)).toHaveCount(7);await expect(rows(page).first()).toContainText('Fixture License Alpha');
 });
 test('PLEN-062 Retry after initial failure issues a second GET and restores controls',async({page})=>{
  let fail=true,calls=0;await openLicenseEnforcement(page,{respond:(m,p)=>{if(m==='GET'&&p===licensePath){calls++;if(fail)return {status:503,json:{message:'Synthetic first load failed'}};}return undefined;}});
  await expect(root(page)).toContainText('License and plan enforcement failed to load');fail=false;
  await root(page).getByRole('button',{name:'Retry'}).click();await expect(rows(page)).toHaveCount(7);expect(calls).toBeGreaterThan(1);
 });
 test('PLEN-063 Recovery from invalid URL request does not leak prior tenant evidence',async({page})=>{
  await openLicenseEnforcement(page,{query:'tenant_id=bad-id'});await expect(root(page)).toContainText('Invalid enforcement filters');
  await root(page).getByRole('button',{name:'Clear filters'}).first().click();await expect(rows(page)).toHaveCount(7);
  await expect(root(page)).not.toContainText('Tenant scope: bad-id');
 });
 test('PLEN-064 Audit evidence link requires independent platform audit-read permission',async({page})=>{
  await openLicenseEnforcement(page,{permissions:without('platform.audit.read')});await expect(rows(page)).toHaveCount(7);
  await expect(table(page).getByRole('link',{name:'Billing audit'})).toHaveCount(0);
 });
 test('PLEN-065 Tenant record link retains exact row UUID',async({page})=>{
  await openLicenseEnforcement(page);await expect(rows(page).filter({hasText:'Fixture License Alpha'}).getByRole('link',{name:'Tenant record'}))
   .toHaveAttribute('href',`/platform/tenants?tenant_id=${licenseTenantA}`);
 });
 test('PLEN-066 Subscription readiness link retains exact row UUID',async({page})=>{
  await openLicenseEnforcement(page);await expect(rows(page).filter({hasText:'Fixture License Beta'}).getByRole('link',{name:'Subscription readiness'}))
   .toHaveAttribute('href',`/platform/subscription-readiness?tenant_id=${licenseTenantB}`);
 });
 test('PLEN-067 Billing record link retains exact row UUID',async({page})=>{
  await openLicenseEnforcement(page);await expect(rows(page).filter({hasText:'Fixture License Gamma'}).getByRole('link',{name:'Billing record'}))
   .toHaveAttribute('href',`/platform/billing?tenant_id=${licenseTenantC}`);
 });
 test('PLEN-068 Archived tenant scope does not secretly switch billing/plan filters',async({page})=>{
  const archive='b9900000-0000-4000-8000-000000000005';await openLicenseEnforcement(page,{query:`tenant_id=${archive}&billing_status=comped&plan_code=starter`});
  await expect(rows(page)).toHaveCount(1);await expect(rows(page).first()).toContainText('Fixture License Archived');
  await expect(page).toHaveURL(/billing_status=comped/);await expect(page).toHaveURL(/plan_code=starter/);
 });
 test('PLEN-069 Plan guard coverage boundary refuses payment or contract certification',async({page})=>{
  await openLicenseEnforcement(page);await expect(root(page)).toContainText('Configured ≠ enforced');
  await expect(root(page)).toContainText('Catalog mode ≠ implementation');await expect(root(page)).toContainText('does not prove a commercial contract, payment');
 });
 test.skip('PLEN-070 Backend enforces both platform billing and tenant-read grants',async()=>{ // Real two-principal backend authorization, not mock permissions.
 });
 test.skip('PLEN-071 Backend SQL summary reconciles with actual tenant configuration rows',async()=>{ // PostgreSQL required.
 });
 test.skip('PLEN-072 Runtime plan-limit and feature guards execute with controlled tenant configuration',async()=>{ // Real guarded endpoints required.
 });
 test.skip('PLEN-073 Concurrent license configuration updates never yield misleading SQL summary',async()=>{ // Real concurrent transactions required.
 });
 test.skip('PLEN-074 Cross-tenant UUID evidence cannot reveal another platform tenant',async()=>{ // Real platform principals and row isolation required.
 });
 test.skip('PLEN-075 External signed license and contract status need independent proof',async()=>{ // Contract/provider evidence required.
 });
 test.skip('PLEN-076 Bank settlement must never be inferred from billing-status field',async()=>{ // Independent bank settlement/proof required.
 });
 test.skip('PLEN-077 Backend canonicalizes conflicting snake/camel query aliases safely',async()=>{ // Real backend query validator required.
 });
 test.skip('PLEN-078 Backend rejects out-of-range limit/offset and unsupported status',async()=>{ // Real backend Joi validation required.
 });
 test.skip('PLEN-079 Archived history inclusion must reconcile with PostgreSQL count and page',async()=>{ // Real DB mixed tenant history required.
 });
 test.skip('PLEN-080 Null and unknown plan definitions classify as blocked without false enforcement proof',async()=>{ // Real service classification and PostgreSQL required.
 });
});


/** Batch 147: URL-boundary safeguards that do NOT resolve PLEN-059/060 canonicalization gaps. */
test.describe('License enforcement — source-supported request safety B147',()=>{
 test('PLEN-081 Negative deep-link offset is bounded to zero in the GET even before URL canonicalization is fixed',async({page})=>{
  const calls:string[]=[];await openLicenseEnforcement(page,{query:'offset=-51',onCall:(method,path,q)=>{
   if(method==='GET'&&path===licensePath)calls.push(q.toString());
  }});
  await expect.poll(()=>calls.length).toBeGreaterThan(0);
  expect(new URLSearchParams(calls[0]).get('offset')).toBe('0');
 });
 test('PLEN-082 Nonnumeric deep-link offset never reaches the data endpoint as NaN',async({page})=>{
  const calls:string[]=[];await openLicenseEnforcement(page,{query:'offset=not-a-number',onCall:(method,path,q)=>{
   if(method==='GET'&&path===licensePath)calls.push(q.toString());
  }});
  await expect.poll(()=>calls.length).toBeGreaterThan(0);
  expect(new URLSearchParams(calls[0]).get('offset')).toBe('0');
  // URL cleanup remains unimplemented: PLEN-059 is intentionally still skipped.
 });
 test('PLEN-083 Uppercase include_history is not misinterpreted as an authorized true flag',async({page})=>{
  const calls:string[]=[];await openLicenseEnforcement(page,{query:'include_history=TRUE',onCall:(method,path,q)=>{
   if(method==='GET'&&path===licensePath)calls.push(q.toString());
  }});
  await expect.poll(()=>calls.length).toBeGreaterThan(0);
  expect(new URLSearchParams(calls[0]).has('include_history')).toBe(false);
  await expect(table(page)).not.toContainText('Fixture License Archived');
 });
 test('PLEN-084 Explicit false include_history omits archive scope in the GET',async({page})=>{
  const calls:string[]=[];await openLicenseEnforcement(page,{query:'include_history=false',onCall:(method,path,q)=>{
   if(method==='GET'&&path===licensePath)calls.push(q.toString());
  }});
  await expect.poll(()=>calls.length).toBeGreaterThan(0);
  expect(new URLSearchParams(calls[0]).has('include_history')).toBe(false);
 });
 test('PLEN-085 Invalid query blocks manual Refresh instead of issuing an unscoped GET',async({page})=>{
  let gets=0;await openLicenseEnforcement(page,{query:'billing_status=invalid',onCall:(method,path)=>{
   if(method==='GET'&&path===licensePath)gets++;
  }});
  await expect(root(page).getByRole('button',{name:'Refresh'})).toBeDisabled();
  await expect(root(page)).toContainText('Invalid enforcement filters.');
  expect(gets).toBe(0);
 });
 test('PLEN-086 Combining URL-backed plan and billing filters never emits write methods',async({page})=>{
  const writes:string[]=[];await openLicenseEnforcement(page,{onCall:(method,path)=>{
   if(path===licensePath&&!['GET','HEAD'].includes(method))writes.push(method);
  }});
  await plan(page).selectOption('starter');
  await billing(page).selectOption('active');
  await expect(page).toHaveURL(/billing_status=active/);
  await expect(table(page)).toBeVisible();
  expect(writes).toEqual([]);
 });
});


/** Batch 162 — source-supported read-only Platform License page boundaries.
 * Fixture checks are UI/query contracts, NOT plan enforcement or bank/payment verification. */
test.describe('License and plan enforcement — source-supported browser contracts B162',()=>{
 test('PLEN-087 Removing audit-read grant hides supporting Billing audit navigation',async({page})=>{
  await openLicenseEnforcement(page,{permissions:without('platform.audit.read')});
  await expect(root(page).locator('.platform-license-plan__links--row').getByRole('link',{name:'Billing audit'})).toHaveCount(0);
  await expect(rows(page).first().getByRole('link',{name:'Billing audit'})).toHaveCount(0);
 });
 test('PLEN-088 Supporting operations exposes exact related commercial evidence routes',async({page})=>{
  await openLicenseEnforcement(page);
  const nav=root(page).locator('.platform-license-plan__links--row');
  for(const [name,url] of [['Billing','/platform/billing'],['Subscription readiness','/platform/subscription-readiness'],['Billing activation','/platform/billing-subscription-activation'],['Tenants','/platform/tenants'],['Tenant health','/platform/tenant-health']] as const){
   await expect(nav.getByRole('link',{name,exact:true})).toHaveAttribute('href',url);
  }
 });
 test('PLEN-089 Whitespace-only search is not forwarded as a server filter',async({page})=>{
  const requests:string[]=[];
  await openLicenseEnforcement(page,{query:'search=%20%20%20',onCall:(m,p,q)=>{if(m==='GET'&&p===licensePath)requests.push(q.toString());}});
  await expect.poll(()=>requests.length).toBeGreaterThan(0);
  expect(new URLSearchParams(requests[0]).has('search')).toBe(false);
  await expect(rows(page)).toHaveCount(7);
 });
 test('PLEN-090 Changing plan filter preserves archive scope and resets old pagination',async({page})=>{
  const requests:string[]=[];
  await openLicenseEnforcement(page,{query:'include_history=true&offset=50',onCall:(m,p,q)=>{if(m==='GET'&&p===licensePath)requests.push(q.toString());}});
  await plan(page).selectOption('starter');
  await expect(page).toHaveURL(/plan_code=starter/);
  await expect.poll(()=>requests.some(x=>{const q=new URLSearchParams(x);return q.get('plan_code')==='starter'&&q.get('include_history')==='true'&&q.get('offset')==='0';})).toBeTruthy();
  await expect(rows(page)).toHaveCount(4);
 });
 test('PLEN-091 Tenant state badges retain source-defined good warn and danger tones',async({page})=>{
  await openLicenseEnforcement(page);
  await expect(rows(page).filter({hasText:'Fixture License Alpha'}).locator('td').nth(4).locator('.platform-license-plan__badge')).toHaveAttribute('data-tone','good');
  await expect(rows(page).filter({hasText:'Fixture License Beta'}).locator('td').nth(4).locator('.platform-license-plan__badge')).toHaveAttribute('data-tone','warn');
  await expect(rows(page).filter({hasText:'Fixture License Gamma'}).locator('td').nth(4).locator('.platform-license-plan__badge')).toHaveAttribute('data-tone','danger');
 });
 test('PLEN-092 Search input caps typing at 200 and empty filter has disabled clear action',async({page})=>{
  await openLicenseEnforcement(page);
  await expect(search(page)).toHaveAttribute('maxlength','200');
  const clear=filters(page).getByRole('button',{name:'Clear filters'});
  await expect(clear).toBeDisabled();
  await search(page).fill('Alpha');await expect(clear).toBeEnabled();
 });
});
