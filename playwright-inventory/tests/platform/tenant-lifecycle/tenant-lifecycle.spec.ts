import { test, expect, type Page } from '@playwright/test';
import { openTenantLifecycle, lifecycleRows, lifecycleStatuses, makeLifecycleRow, TASK_TENANT_A, TASK_TENANT_B } from '../../../support/tenantLifecycleFixture';
/** Batch 64 — generated and UNRUN. Synthetic tenant configuration only; never evidence of commercial readiness. */
const filters=(page:Page)=>page.locator('.platform-tenant-lifecycle__filter-grid');
const board=(page:Page)=>page.locator('.platform-tenant-lifecycle__list');
const card=(page:Page,name:string)=>board(page).locator('article').filter({has:page.getByRole('heading',{name,exact:true})});
const endpoint='/platform/tenant-lifecycle/governance';

test.describe('Platform Tenant Lifecycle — Batch 64, GENERATED_UNRUN',()=>{
 test('PTLIFE-001 Hero distinguishes configuration posture from commercial readiness',async({page})=>{
  await openTenantLifecycle(page);await expect(page.getByText('Read-only · yes')).toBeVisible();
  await expect(page.getByText('Evidence · tenant record only')).toBeVisible();
  await expect(page.getByText('Commercial readiness is not proven.')).toBeVisible();
 });
 test('PTLIFE-002 Default governance request is bounded at 100 from offset zero',async({page})=>{
  const q:URLSearchParams[]=[];await openTenantLifecycle(page,{onCall:(m,p,query)=>{if(m==='GET'&&p===endpoint)q.push(new URLSearchParams(query));}});
  await expect.poll(()=>q.length).toBeGreaterThan(0);
  expect(q[0].get('limit')).toBe('100');expect(q[0].get('offset')).toBe('0');
  expect(q[0].has('status')).toBe(false);expect(q[0].has('tenant_id')).toBe(false);
 });
 test('PTLIFE-003 Tenant URL filter scopes GET by valid UUID',async({page})=>{
  const q:URLSearchParams[]=[];await openTenantLifecycle(page,{query:`tenant_id=${TASK_TENANT_A}`,onCall:(m,p,query)=>{if(m==='GET'&&p===endpoint)q.push(new URLSearchParams(query));}});
  await expect(card(page,'Fixture Hotel')).toBeVisible();await expect(card(page,'Fixture Warehouse')).toHaveCount(0);
  expect(q[0].get('tenant_id')).toBe(TASK_TENANT_A);
 });
 test('PTLIFE-004 Changing status updates URL and request, not just local row visibility',async({page})=>{
  const q:URLSearchParams[]=[];await openTenantLifecycle(page,{onCall:(m,p,query)=>{if(m==='GET'&&p===endpoint)q.push(new URLSearchParams(query));}});
  await filters(page).getByLabel('Lifecycle status').selectOption('offboarding');
  await expect(page).toHaveURL(/status=offboarding/);await expect(card(page,'Fixture Warehouse')).toBeVisible();
  await expect(card(page,'Fixture Hotel')).toHaveCount(0);await expect.poll(()=>q.some(x=>x.get('status')==='offboarding')).toBe(true);
 });
 test('PTLIFE-005 Lifecycle status selector lists six source-supported states',async({page})=>{
  await openTenantLifecycle(page);const options=filters(page).getByLabel('Lifecycle status').locator('option');
  await expect(options).toHaveCount(lifecycleStatuses.length+1);
  for(const status of lifecycleStatuses)await expect(filters(page).getByLabel('Lifecycle status').locator(`option[value="${status}"]`)).toHaveCount(1);
 });
 test('PTLIFE-006 Invalid tenant UUID fails closed before governance GET',async({page})=>{
  const calls:string[]=[];await openTenantLifecycle(page,{query:'tenant_id=not-a-uuid',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(page.getByText('Invalid lifecycle URL filter')).toBeVisible();expect(calls).toHaveLength(0);
 });
 test('PTLIFE-007 Unsupported lifecycle status fails closed before governance GET',async({page})=>{
  const calls:string[]=[];await openTenantLifecycle(page,{query:'status=unknown',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(page.getByText('Invalid lifecycle URL filter')).toBeVisible();expect(calls).toHaveLength(0);
 });
 test('PTLIFE-008 Repairing malformed UUID retains valid status selection',async({page})=>{
  await openTenantLifecycle(page,{query:'tenant_id=bad&status=offboarding'});
  await page.getByRole('button',{name:'Clear invalid filters'}).click();
  await expect(page).toHaveURL(/status=offboarding/);await expect(page).not.toHaveURL(/tenant_id=/);
  await expect(card(page,'Fixture Warehouse')).toBeVisible();
 });
 test('PTLIFE-009 Unknown but valid selected tenant UUID uses explicit fallback name',async({page})=>{
  const row=makeLifecycleRow(23);await openTenantLifecycle(page,{query:`tenant_id=${row.id}`,rows:[row]});
  await expect(page.getByText('Current view · Selected tenant')).toBeVisible();await expect(card(page,row.name)).toBeVisible();
 });
 test('PTLIFE-010 Tenant configuration cards show ready and blocked postures',async({page})=>{
  await openTenantLifecycle(page);await expect(card(page,'Fixture Hotel').locator('[data-tone="good"]')).toContainText('Ready');
  await expect(card(page,'Fixture Warehouse').locator('[data-tone="danger"]')).toContainText('Blocked');
  await expect(card(page,'Fixture Warehouse')).toContainText('Write lock');await expect(card(page,'Fixture Warehouse')).toContainText('Locked');
 });
 test('PTLIFE-011 Summary labels loaded page rather than unscoped tenant population',async({page})=>{
  await openTenantLifecycle(page);const summary=page.getByLabel('Loaded tenant lifecycle configuration summary');
  await expect(summary).toContainText('Loaded tenants');await expect(summary).toContainText('Configuration ready');
  await expect(summary).toContainText('Write locked');await expect(summary).toContainText('Current page only');
 });
 test('PTLIFE-012 Governance evidence flags deny commercial proof or consumed external evidence',async({page})=>{
  await openTenantLifecycle(page);const grid=page.locator('.platform-tenant-lifecycle__evidence-grid');
  await expect(grid).toContainText('External evidence consumed');await expect(grid).toContainText('Commercial readiness proven');
  await expect(grid.getByText('No',{exact:true})).toHaveCount(3);
 });
 test('PTLIFE-013 Read-only lifecycle page issues no mutations during filtering or refresh',async({page})=>{
  const writes:string[]=[];await openTenantLifecycle(page,{onCall:(m,p)=>{if(['POST','PUT','PATCH','DELETE'].includes(m)&&p.startsWith('/platform/tenant-lifecycle'))writes.push(p);}});
  await filters(page).getByLabel('Lifecycle status').selectOption('active');
  await page.getByRole('button',{name:'Refresh',exact:true}).click();await expect(page.getByRole('button',{name:'Refresh',exact:true})).toBeEnabled();
  expect(writes).toEqual([]);
 });
 test('PTLIFE-014 Offboarding row shows tenant-scoped evidence destination',async({page})=>{
  await openTenantLifecycle(page);const row=card(page,'Fixture Warehouse');
  await expect(row.getByRole('link',{name:'Offboarding'})).toHaveAttribute('href',`/platform/tenant-offboarding?tenant_id=${TASK_TENANT_B}`);
  await expect(row.getByRole('link',{name:'Health'})).toHaveAttribute('href',`/platform/tenant-health?tenant_id=${TASK_TENANT_B}`);
 });
 test('PTLIFE-015 Supporting export links require export permission snapshot',async({page})=>{
  await openTenantLifecycle(page,{permissions:['platform.dashboard.read','platform.tenants.read']});
  const grid=page.locator('.platform-tenant-lifecycle__supporting-grid');
  await expect(grid.locator('[data-state="restricted"]')).toHaveCount(1);
  await expect(grid.getByRole('link',{name:'Tenant exports'})).toHaveCount(0);
  await expect(page.getByRole('link',{name:'Tenant exports'})).toHaveCount(0);
 });

// Batch 65 continuation. Source: PlatformTenantLifecyclePage.tsx + tenantLifecycle.js.
// All operations use synthetic Platform HTTP responses; zero live mutations.
test.describe('Platform Tenant Lifecycle — Batch 65 continuation, GENERATED_UNRUN', () => {
 test('PTLIFE-016 Changing tenant dropdown preserves valid lifecycle status URL filter',async({page})=>{
  await openTenantLifecycle(page,{query:'status=active'});
  await filters(page).getByLabel('Tenant',{exact:true}).selectOption(TASK_TENANT_A);
  await expect(page).toHaveURL(new RegExp(`tenant_id=${TASK_TENANT_A}`));await expect(page).toHaveURL(/status=active/);
  await expect(card(page,'Fixture Hotel')).toBeVisible();
 });
 test('PTLIFE-017 Resetting lifecycle status removes only status query parameter',async({page})=>{
  await openTenantLifecycle(page,{query:`status=active&tenant_id=${TASK_TENANT_A}`});
  await filters(page).getByLabel('Lifecycle status').selectOption('');
  await expect(page).not.toHaveURL(/status=/);await expect(page).toHaveURL(new RegExp(`tenant_id=${TASK_TENANT_A}`));
 });
 test('PTLIFE-018 Multiple invalid URL filters are both removed on repair',async({page})=>{
  await openTenantLifecycle(page,{query:'tenant_id=bad&status=not-a-status'});
  await expect(page.getByText('Invalid lifecycle URL filter')).toBeVisible();
  await page.getByRole('button',{name:'Clear invalid filters'}).click();
  await expect(page).not.toHaveURL(/tenant_id=|status=/);await expect(card(page,'Fixture Hotel')).toBeVisible();
 });
 test('PTLIFE-019 Valid UUID not in current selector keeps Selected tenant label',async({page})=>{
  const extra=makeLifecycleRow(19);await openTenantLifecycle(page,{rows:[extra],query:`tenant_id=${extra.id}`});
  await expect(page.getByText('Current view · Selected tenant')).toBeVisible();await expect(card(page,extra.name)).toBeVisible();
 });
 test('PTLIFE-020 Read-only helper shows no edit or delete controls',async({page})=>{
  const writes:string[]=[];await openTenantLifecycle(page,{onCall:(m)=>{if(['POST','PUT','PATCH','DELETE'].includes(m))writes.push(m);}});
  await expect(page.getByText('Read-only · yes')).toBeVisible();
  await expect(page.getByRole('button',{name:/^(Edit|Delete|Save|Archive)$/i})).toHaveCount(0);expect(writes).toEqual([]);
 });
 test('PTLIFE-021 Governance metadata identifies tenant record only evidence',async({page})=>{
  await openTenantLifecycle(page);await expect(page.getByText('Evidence · tenant record only')).toBeVisible();
  await expect(page.getByText('Source · GET /platform/tenant-lifecycle/governance')).toBeVisible();
  await expect(page.locator('.platform-tenant-lifecycle__evidence-grid')).toContainText('Tenant record configuration only');
 });
 test('PTLIFE-022 Commercial readiness false remains false when configuration is ready',async({page})=>{
  await openTenantLifecycle(page);await expect(card(page,'Fixture Hotel').locator('[data-tone="good"]')).toContainText('Ready');
  await expect(card(page,'Fixture Hotel')).toContainText('Not provided by this board');
  await expect(page.getByText('Commercial readiness is not proven.',{exact:true})).toBeVisible();
 });
 test('PTLIFE-023 Evidence scope description never claims launch/customer acceptance',async({page})=>{
  await openTenantLifecycle(page);const note=page.locator('.platform-tenant-lifecycle__truth-note');
  await expect(note).toContainText('It does not prove provisioning completion');await expect(note).toContainText('customer acceptance');
  await expect(note).toContainText('launch approval');
 });
 test('PTLIFE-024 Supporting route tiles distinguish available and restricted destinations',async({page})=>{
  await openTenantLifecycle(page,{permissions:['platform.dashboard.read','platform.tenants.read']});
  const tiles=page.locator('.platform-tenant-lifecycle__supporting-grid');
  await expect(tiles.locator('[data-state="available"]')).toHaveCount(2);
  await expect(tiles.locator('[data-state="restricted"]')).toHaveCount(1);
  await expect(tiles).toContainText('TENANTS_EXPORT required');
 });
 test('PTLIFE-025 Support cockpit link requires all required Platform permissions',async({page})=>{
  const base=['platform.dashboard.read','platform.tenants.read','platform.sla.read','platform.incidents.read'];
  await openTenantLifecycle(page,{permissions:base});
  await expect(card(page,'Fixture Hotel').getByRole('link',{name:'Support cockpit'})).toHaveCount(0);
  await expect(page.getByRole('link',{name:'Support cockpit'})).toHaveCount(0);
 });
 test('PTLIFE-026 Per-tenant billing link requires platform billing read permission',async({page})=>{
  await openTenantLifecycle(page,{permissions:['platform.dashboard.read','platform.tenants.read']});
  await expect(card(page,'Fixture Hotel').getByRole('link',{name:'Billing'})).toHaveCount(0);
  await expect(page.getByRole('link',{name:'Billing'})).toHaveCount(0);
 });
 test('PTLIFE-027 Per-tenant offboarding link only appears for offboarding tenant',async({page})=>{
  await openTenantLifecycle(page);await expect(card(page,'Fixture Hotel').getByRole('link',{name:'Offboarding'})).toHaveCount(0);
  await expect(card(page,'Fixture Warehouse').getByRole('link',{name:'Offboarding'})).toHaveAttribute('href',`/platform/tenant-offboarding?tenant_id=${TASK_TENANT_B}`);
 });
 test('PTLIFE-028 Supporting Tenant links preserve selected tenant UUID',async({page})=>{
  await openTenantLifecycle(page,{query:`tenant_id=${TASK_TENANT_A}`});
  await expect(card(page,'Fixture Hotel').getByRole('link',{name:'Tenant',exact:true})).toHaveAttribute('href',`/platform/tenants?tenant_id=${TASK_TENANT_A}`);
  await expect(page.getByRole('link',{name:'Tenants',exact:true}).last()).toHaveAttribute('href',`/platform/tenants?tenant_id=${TASK_TENANT_A}`);
 });
 test('PTLIFE-029 Supporting Timeline links preserve selected tenant UUID',async({page})=>{
  await openTenantLifecycle(page,{query:`tenant_id=${TASK_TENANT_A}`});
  await expect(card(page,'Fixture Hotel').getByRole('link',{name:'Timeline'})).toHaveAttribute('href',`/platform/tenant-timeline?tenant_id=${TASK_TENANT_A}`);
  await expect(page.getByRole('link',{name:'Tenant timeline'})).toHaveAttribute('href',`/platform/tenant-timeline?tenant_id=${TASK_TENANT_A}`);
 });
 test('PTLIFE-030 Supporting Health links preserve selected tenant UUID',async({page})=>{
  await openTenantLifecycle(page,{query:`tenant_id=${TASK_TENANT_A}`});
  await expect(card(page,'Fixture Hotel').getByRole('link',{name:'Health'})).toHaveAttribute('href',`/platform/tenant-health?tenant_id=${TASK_TENANT_A}`);
  await expect(page.getByRole('link',{name:'Tenant health'})).toHaveAttribute('href',`/platform/tenant-health?tenant_id=${TASK_TENANT_A}`);
 });
 test('PTLIFE-031 Summary counts reflect returned page values',async({page})=>{
  await openTenantLifecycle(page);const stats=page.getByLabel('Loaded tenant lifecycle configuration summary');
  await expect(stats).toContainText('Loaded tenants');await expect(stats).toContainText('Configuration ready');
  await expect(stats).toContainText('Billing attention');await expect(stats).toContainText('Write locked');
  await expect(card(page,'Fixture Warehouse')).toContainText('Overdue');
 });
 test('PTLIFE-032 All-zero summary is never presented as global tenant census',async({page})=>{
  await openTenantLifecycle(page,{rows:[]});const summary=page.getByLabel('Loaded tenant lifecycle configuration summary');
  await expect(summary).toContainText('Current page only');
  await expect(page.getByText('No tenants match this loaded view.')).toBeVisible();
  await expect(page.getByText('This does not establish anything about external tenant lifecycle activity.',{exact:false})).toBeVisible();
 });
 test('PTLIFE-033 Missing plan code shows Not configured',async({page})=>{
  await openTenantLifecycle(page);await expect(card(page,'Fixture Warehouse').locator('.platform-tenant-lifecycle__metrics-grid')).toContainText('Not configured');
 });
 test('PTLIFE-034 Missing location and organization type use neutral placeholders',async({page})=>{
  await openTenantLifecycle(page);const missing=card(page,'Fixture Warehouse').locator('.platform-tenant-lifecycle__provenance');
  await expect(missing).toContainText('Location not recorded');await expect(missing).toContainText('Organization type not recorded');
 });
 test('PTLIFE-035 Invalid updated_at date shows Not recorded',async({page})=>{
  const broken=makeLifecycleRow(35,{updated_at:'not-an-ISO-date'});
  await openTenantLifecycle(page,{rows:[broken]});await expect(card(page,broken.name).locator('.platform-tenant-lifecycle__provenance')).toContainText('Updated Not recorded');
 });
 test('PTLIFE-036 Configuration blockers display danger severity',async({page})=>{
  await openTenantLifecycle(page);const blockers=card(page,'Fixture Warehouse').locator('.platform-tenant-lifecycle__signals [data-tone="danger"]');
  await expect(blockers).toHaveCount(1);await expect(blockers.first()).toContainText('Write locked');
 });
 test('PTLIFE-037 Configuration warnings display warning severity',async({page})=>{
  await openTenantLifecycle(page);const warnings=card(page,'Fixture Warehouse').locator('.platform-tenant-lifecycle__signals [data-tone="warn"]');
  await expect(warnings).toHaveCount(1);await expect(warnings.first()).toContainText('Billing overdue');
 });
 test('PTLIFE-038 Ready row with no blockers still warns about missing external evidence',async({page})=>{
  await openTenantLifecycle(page);const ready=card(page,'Fixture Hotel');
  await expect(ready.locator('.platform-tenant-lifecycle__clear-signal')).toContainText('Deeper lifecycle evidence has not been evaluated here.');
  await expect(ready).toContainText('Not provided by this board');
 });
 test('PTLIFE-039 Write locked row shows Locked without implying a successful mutation',async({page})=>{
  const writes:string[]=[];await openTenantLifecycle(page,{onCall:(m)=>{if(m!=='GET')writes.push(m);}});
  await expect(card(page,'Fixture Warehouse').locator('.platform-tenant-lifecycle__metrics-grid')).toContainText('Locked');
  expect(writes).toEqual([]);
 });
 test('PTLIFE-040 Disabled support policy displays Disabled in tenant policy',async({page})=>{
  await openTenantLifecycle(page);await expect(card(page,'Fixture Warehouse')).toContainText('Disabled in tenant policy');
  await expect(card(page,'Fixture Hotel')).toContainText('Enabled in tenant policy');
 });
 test('PTLIFE-041 Tenant lifecycle buckets are shown as returned by API',async({page})=>{
  const row=makeLifecycleRow(41,{lifecycle_bucket:'transition_review',status:'maintenance'});
  await openTenantLifecycle(page,{rows:[row]});await expect(card(page,row.name).locator('.platform-tenant-lifecycle__metrics-grid')).toContainText('Maintenance · Transition review');
 });
 test('PTLIFE-042 Backend governance status filter is request scoped',async({page})=>{
  const requests:URLSearchParams[]=[];await openTenantLifecycle(page,{query:'status=archived',onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)requests.push(new URLSearchParams(q));}});
  await expect.poll(()=>requests.length).toBeGreaterThan(0);expect(requests[0].get('status')).toBe('archived');
  expect(requests[0].get('limit')).toBe('100');expect(requests[0].get('offset')).toBe('0');
 });
 test('PTLIFE-043 Last-page pagination uses server has_more false',async({page})=>{
  const rows=Array.from({length:101},(_,i)=>makeLifecycleRow(i+1));await openTenantLifecycle(page,{rows});
  await page.getByRole('button',{name:'Next',exact:true}).click();await expect(card(page,rows[100].name)).toBeVisible();
  await expect(page.getByRole('button',{name:'Next',exact:true})).toBeDisabled();
 });
 test('PTLIFE-044 Next requests offset 100 and displays second page',async({page})=>{
  const rows=Array.from({length:101},(_,i)=>makeLifecycleRow(i+1));const offsets:string[]=[];
  await openTenantLifecycle(page,{rows,onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)offsets.push(q.get('offset')||'');}});
  await expect(card(page,rows[0].name)).toBeVisible();await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect(card(page,rows[100].name)).toBeVisible();await expect(card(page,rows[0].name)).toHaveCount(0);
  expect(offsets).toContain('100');await expect(page.locator('.platform-tenant-lifecycle__pagination')).toContainText('Page 2');
 });
 test('PTLIFE-045 Previous returns to offset 0 and first page',async({page})=>{
  const rows=Array.from({length:102},(_,i)=>makeLifecycleRow(i+1));const offsets:string[]=[];
  await openTenantLifecycle(page,{rows,onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)offsets.push(q.get('offset')||'');}});
  await page.getByRole('button',{name:'Next',exact:true}).click();await expect(card(page,rows[100].name)).toBeVisible();
  await page.getByRole('button',{name:'Previous',exact:true}).click();await expect(card(page,rows[0].name)).toBeVisible();
  await expect(page.locator('.platform-tenant-lifecycle__pagination')).toContainText('Page 1');expect(offsets.at(-1)).toBe('0');
 });
 test('PTLIFE-046 Changing tenant filter resets pagination to page one',async({page})=>{
  const rows=Array.from({length:102},(_,i)=>makeLifecycleRow(i+1));
  await openTenantLifecycle(page,{rows});await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect(page.locator('.platform-tenant-lifecycle__pagination')).toContainText('Page 2');
  await filters(page).getByLabel('Tenant',{exact:true}).selectOption(TASK_TENANT_A);
  await expect(page.locator('.platform-tenant-lifecycle__pagination')).toContainText('Page 1');
  await expect(page.getByRole('button',{name:'Previous',exact:true})).toBeDisabled();
 });
 test('PTLIFE-047 Changing status filter resets pagination to page one',async({page})=>{
  const rows=Array.from({length:102},(_,i)=>makeLifecycleRow(i+1));await openTenantLifecycle(page,{rows});
  await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page.locator('.platform-tenant-lifecycle__pagination')).toContainText('Page 2');
  await filters(page).getByLabel('Lifecycle status').selectOption('offboarding');
  await expect(page.locator('.platform-tenant-lifecycle__pagination')).toContainText('Page 1');
  await expect(page).toHaveURL(/status=offboarding/);
 });
 test('PTLIFE-048 Pagination Previous is disabled at offset zero',async({page})=>{
  await openTenantLifecycle(page);await expect(page.getByRole('button',{name:'Previous',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Next',exact:true})).toBeDisabled();
 });
 test('PTLIFE-049 Pagination buttons disabled while lifecycle data is fetching',async({page})=>{
  const rows=Array.from({length:101},(_,i)=>makeLifecycleRow(i+1));
  await openTenantLifecycle(page,{rows,delayMs:{'GET /platform/tenant-lifecycle/governance':1200}});
  await expect(page.getByRole('button',{name:'Next',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect(page.getByRole('button',{name:'Previous',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Next',exact:true})).toBeDisabled();
 });
 test('PTLIFE-050 Tenant selector initial load error is visibly named',async({page})=>{
  await openTenantLifecycle(page,{responses:{'GET /platform/tenants':{status:503,json:{error:'Tenant selector temporarily unavailable'}}}});
  await expect(page.getByText('Tenant selector is unavailable:',{exact:false})).toBeVisible();
  await expect(card(page,'Fixture Hotel')).toBeVisible();
 });
 test('PTLIFE-051 Tenant selector transient error can recover through Refresh',async({page})=>{
  let unavailable=true;await openTenantLifecycle(page,{respond:(m,p)=>m==='GET'&&p==='/platform/tenants'&&unavailable?{status:503,json:{error:'Selector offline'}}:undefined});
  await expect(page.getByText('Tenant selector is unavailable:',{exact:false})).toBeVisible();unavailable=false;
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(filters(page).getByLabel('Tenant',{exact:true}).locator('option')).toHaveCount(3);
  await expect(page.getByText('Tenant selector is unavailable:',{exact:false})).toHaveCount(0);
 });
 test('PTLIFE-052 Governance initial HTTP 503 shows Retry and no empty success',async({page})=>{
  await openTenantLifecycle(page,{responses:{'GET /platform/tenant-lifecycle/governance':{status:503,json:{error:'Lifecycle offline'}}}});
  await expect(page.getByText('Tenant lifecycle is unavailable')).toBeVisible();
  await expect(page.getByRole('button',{name:'Retry',exact:true})).toBeVisible();
  await expect(page.getByText('No tenants match this loaded view.')).toHaveCount(0);
 });
 test('PTLIFE-053 Governance initial HTTP 429 preserves unavailable state',async({page})=>{
  await openTenantLifecycle(page,{responses:{'GET /platform/tenant-lifecycle/governance':{status:429,json:{error:'rate_limited'}}}});
  await expect(page.getByText('Tenant lifecycle is unavailable')).toBeVisible();
  await expect(page.getByText('Unavailable',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Retry',exact:true})).toBeVisible();
 });
 test('PTLIFE-054 Governance Retry succeeds after transient 503',async({page})=>{
  let fail=true;await openTenantLifecycle(page,{respond:(m,p)=>m==='GET'&&p===endpoint&&fail?{status:503,json:{error:'Temporary outage'}}:undefined});
  await expect(page.getByText('Tenant lifecycle is unavailable')).toBeVisible();fail=false;
  await page.getByRole('button',{name:'Retry',exact:true}).click();
  await expect(card(page,'Fixture Hotel')).toBeVisible();await expect(page.getByText('Tenant lifecycle is unavailable')).toHaveCount(0);
 });
 test('PTLIFE-055 Governance refresh failure keeps last successful snapshot',async({page})=>{
  let fail=false;await openTenantLifecycle(page,{respond:(m,p)=>m==='GET'&&p===endpoint&&fail?{status:503,json:{error:'Refresh failed'}}:undefined});
  await expect(card(page,'Fixture Hotel')).toBeVisible();fail=true;
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page.getByText('Showing the last successful lifecycle snapshot.',{exact:false})).toBeVisible();
  await expect(card(page,'Fixture Hotel')).toBeVisible();
 });
 test('PTLIFE-056 Tenant selector refresh failure keeps last successful selector',async({page})=>{
  let fail=false;await openTenantLifecycle(page,{respond:(m,p)=>m==='GET'&&p==='/platform/tenants'&&fail?{status:503,json:{error:'Selector refresh offline'}}:undefined});
  await expect(filters(page).getByLabel('Tenant',{exact:true}).locator('option')).toHaveCount(3);fail=true;
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page.getByText('Showing the last successful tenant selector snapshot.',{exact:false})).toBeVisible();
  await expect(filters(page).getByLabel('Tenant',{exact:true}).locator('option')).toHaveCount(3);
 });
 test('PTLIFE-057 Refresh refetches both governance board and tenant selector',async({page})=>{
  const calls:string[]=[];await openTenantLifecycle(page,{onCall:(m,p)=>{if(m==='GET'&&(p===endpoint||p==='/platform/tenants'))calls.push(p);}});
  await expect(card(page,'Fixture Hotel')).toBeVisible();const priorGov=calls.filter(x=>x===endpoint).length;
  const priorTenants=calls.filter(x=>x==='/platform/tenants').length;
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>calls.filter(x=>x===endpoint).length).toBeGreaterThan(priorGov);
  await expect.poll(()=>calls.filter(x=>x==='/platform/tenants').length).toBeGreaterThan(priorTenants);
 });
 test('PTLIFE-058 Refresh while filters invalid does not issue governance GET',async({page})=>{
  const calls:string[]=[];await openTenantLifecycle(page,{query:'status=bad',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page.getByText('Invalid lifecycle URL filter')).toBeVisible();expect(calls).toHaveLength(0);
 });
 test('PTLIFE-059 Malformed tenant filter with valid status preserves status on repair',async({page})=>{
  await openTenantLifecycle(page,{query:'tenant_id=bad&status=active'});
  await page.getByRole('button',{name:'Clear invalid filters'}).click();
  await expect(page).toHaveURL(/status=active/);await expect(page).not.toHaveURL(/tenant_id=/);
  await expect(card(page,'Fixture Hotel')).toBeVisible();
 });
 test('PTLIFE-060 Malformed status filter with valid UUID preserves tenant on repair',async({page})=>{
  await openTenantLifecycle(page,{query:`tenant_id=${TASK_TENANT_A}&status=unsupported`});
  await page.getByRole('button',{name:'Clear invalid filters'}).click();
  await expect(page).toHaveURL(new RegExp(`tenant_id=${TASK_TENANT_A}`));await expect(page).not.toHaveURL(/status=/);
  await expect(card(page,'Fixture Hotel')).toBeVisible();
 });
 test('PTLIFE-061 Active-only status filter excludes offboarding tenants',async({page})=>{
  await openTenantLifecycle(page,{query:'status=active'});await expect(card(page,'Fixture Hotel')).toBeVisible();
  await expect(card(page,'Fixture Warehouse')).toHaveCount(0);
 });
 test('PTLIFE-062 Offboarding status filter excludes unrelated tenant rows',async({page})=>{
  await openTenantLifecycle(page,{query:'status=offboarding'});await expect(card(page,'Fixture Warehouse')).toBeVisible();
  await expect(card(page,'Fixture Hotel')).toHaveCount(0);
 });
 test('PTLIFE-063 No returned tenants shows truthful scoped empty state',async({page})=>{
  await openTenantLifecycle(page,{rows:[]});
  await expect(page.getByText('No tenants match this loaded view.')).toBeVisible();
  await expect(board(page).locator('article')).toHaveCount(0);
  await expect(page.locator('.platform-tenant-lifecycle__empty')).toContainText('Change the filters or refresh');
 });
 test('PTLIFE-064 Tenant selector filters are URL-backed across refresh',async({page})=>{
  await openTenantLifecycle(page);await filters(page).getByLabel('Tenant',{exact:true}).selectOption(TASK_TENANT_B);
  await filters(page).getByLabel('Lifecycle status').selectOption('offboarding');
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`tenant_id=${TASK_TENANT_B}`));
  await expect(page).toHaveURL(/status=offboarding/);await expect(card(page,'Fixture Warehouse')).toBeVisible();
 });
 test('PTLIFE-065 Support route maps only source-supported evidence destinations',async({page})=>{
  await openTenantLifecycle(page);const supporting=page.locator('.platform-tenant-lifecycle__supporting-grid');
  await expect(supporting.locator('a')).toHaveCount(3);
  for(const href of ['/platform/tenants','/platform/tenant-exports','/platform/tenant-health'])
   await expect(supporting.locator(`a[href="${href}"]`)).toHaveCount(1);
  await expect(supporting.locator('a[href*="provisioning"]')).toHaveCount(0);
 });
 test('PTLIFE-066 Export link absent when TENANTS_EXPORT is denied',async({page})=>{
  await openTenantLifecycle(page,{permissions:['platform.dashboard.read','platform.tenants.read']});
  await expect(page.getByRole('link',{name:'Tenant exports'})).toHaveCount(0);
  await expect(page.locator('.platform-tenant-lifecycle__supporting-grid').locator('[data-state="restricted"]')).toContainText('TENANTS_EXPORT required');
 });
 test('PTLIFE-067 TENANTS_READ denied route is not rendered as accessible',async({page})=>{
  await openTenantLifecycle(page,{permissions:['platform.dashboard.read'],expectHeading:false});
  await expect(page.getByRole('heading',{name:'Tenant lifecycle',exact:true})).toHaveCount(0);
 });
 test('PTLIFE-068 Governance view performs no HTTP writes during navigation',async({page})=>{
  const writes:string[]=[];await openTenantLifecycle(page,{onCall:(m,p)=>{if(['POST','PUT','PATCH','DELETE'].includes(m)&&p.startsWith('/platform/tenant-lifecycle'))writes.push(`${m} ${p}`);}});
  await filters(page).getByLabel('Lifecycle status').selectOption('offboarding');
  await page.getByRole('button',{name:'Refresh',exact:true}).click();expect(writes).toEqual([]);
 });
 test('PTLIFE-069 Tenant lifecycle governance is not proof of any external provisioning outcome',async({page})=>{
  await openTenantLifecycle(page);await expect(page.locator('.platform-tenant-lifecycle__truth-note')).toContainText('It does not prove provisioning completion');
  await expect(page.locator('.platform-tenant-lifecycle__evidence-grid')).toContainText('External evidence consumed');
  await expect(card(page,'Fixture Hotel')).toContainText('Not provided by this board');
 });
 test('PTLIFE-070 Tenant-record configuration signals remain distinct from true commercial acceptance',async({page})=>{
  await openTenantLifecycle(page);await expect(card(page,'Fixture Hotel').locator('[data-tone="good"]')).toContainText('Ready');
  await expect(page.getByText('Commercial readiness is not proven.',{exact:true})).toBeVisible();
  await expect(page.locator('.platform-tenant-lifecycle__truth-note')).toContainText('customer acceptance');
  await expect(page.locator('.platform-tenant-lifecycle__evidence-grid')).toContainText('Commercial readiness proven');
 });
});
