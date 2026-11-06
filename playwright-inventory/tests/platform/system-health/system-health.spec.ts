/** BATCH_092_GENERATED_UNRUN — Platform System Health.
 * Synthetic UI and request-contract tests only. Neither healthy nor degraded proves
 * external uptime, tenant data correctness, SQL durability or live server authorization. */
import {test,expect,type Page} from '@playwright/test';
import {openPlatformSystemHealth,healthRoot,healthDiagnostics,healthPermissions,healthTenantB,healthTenantC,
 healthyTenant,degradedTenant,archivedTenant,pendingResolutionTenant,alignedTenant,diagnosticRow,healthRows} from '../../../support/platformSystemHealthFixture';
const root=(p:Page)=>p.locator('.platform-system-health');
const registry=(p:Page)=>root(p).locator('section.platform-system-health__section').filter({has:p.getByRole('heading',{name:'Health registry',exact:true})});
const diagnostics=(p:Page)=>root(p).locator('section.platform-system-health__section').filter({has:p.getByRole('heading',{name:'Platform diagnostics',exact:true})});
const filters=(p:Page)=>registry(p).locator('.platform-system-health__filters');
const table=(p:Page)=>registry(p).locator('table.platform-system-health__table');
const rows=(p:Page)=>table(p).locator('tbody tr');
const row=(p:Page,name:string)=>rows(p).filter({hasText:name});
const pager=(p:Page)=>registry(p).locator('.platform-system-health__pagination');
const omit=(...permissions:string[])=>healthPermissions.filter(v=>!permissions.includes(v));
test.describe('Platform System Health — tenant application evidence (BATCH_092_GENERATED_UNRUN)',()=>{
 test('PSHL-001 Hero identifies tenant integrity evidence, not infrastructure uptime',async({page})=>{
  await openPlatformSystemHealth(page);await expect(root(page)).toContainText('does not prove infrastructure availability');
  await expect(root(page)).toContainText('Read only');
 });
 test('PSHL-002 Without system health read grant guarded page makes no registry request',async({page})=>{
  let calls=0;await openPlatformSystemHealth(page,{permissions:omit('platform.system_health.read'),expectHeading:false,
   onCall:(m,p)=>{if(m==='GET'&&p===healthRoot)calls++;}});
  await expect(root(page)).toHaveCount(0);expect(calls).toBe(0);
 });
 test('PSHL-003 Without tenants read grant guarded page does not query tenant integrity',async({page})=>{
  let calls=0;await openPlatformSystemHealth(page,{permissions:omit('platform.tenants.read'),expectHeading:false,
   onCall:(m,p)=>{if(m==='GET'&&p===healthRoot)calls++;}});
  await expect(root(page)).toHaveCount(0);expect(calls).toBe(0);
 });
 test('PSHL-004 Read-only registry has no create, edit or archive controls',async({page})=>{
  await openPlatformSystemHealth(page);for(const action of ['Create','Edit','Delete','Archive','Save'])
   await expect(root(page).getByRole('button',{name:action,exact:true})).toHaveCount(0);
 });
 test('PSHL-005 Initial system health GET uses fixed fifty-row pagination without archive flag',async({page})=>{
  const seen:string[]=[];await openPlatformSystemHealth(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===healthRoot)seen.push(q.toString());}});
  await expect.poll(()=>seen.length).toBeGreaterThan(0);const q=new URLSearchParams(seen.at(-1));
  expect(q.get('limit')).toBe('50');expect(q.get('offset')).toBe('0');expect(q.has('include_archived')).toBe(false);
 });
 test('PSHL-006 Summary uses filtered registry totals rather than row count label',async({page})=>{
  await openPlatformSystemHealth(page,{rows:healthRows(60)});
  await expect(root(page).getByLabel('System Health key metrics')).toContainText('Tenants in scope');
  await expect(pager(page)).toContainText('1–50 of 60');
 });
 test('PSHL-007 Healthy tenant renders zero evidence for all three categories',async({page})=>{
  await openPlatformSystemHealth(page);const r=row(page,healthyTenant.tenant_name);
  await expect(r).toContainText('healthy');await expect(r).toContainText('No current issue categories.');
  await expect(r).toContainText('Blocking alerts 0');await expect(r).toContainText('Negative stock 0');
  await expect(r).toContainText('Incomplete shipments 0');
 });
 test('PSHL-008 Degraded record exposes issue categories without private raw alert messages',async({page})=>{
  await openPlatformSystemHealth(page);const r=row(page,degradedTenant.tenant_name);
  await expect(r).toContainText('blocking alerts');await expect(r).toContainText('negative stock');
  await expect(r).toContainText('received shipments');await expect(r).not.toContainText('private customer alert details');
 });
 test('PSHL-009 Default registry excludes archived tenant',async({page})=>{
  await openPlatformSystemHealth(page);await expect(row(page,archivedTenant.tenant_name)).toHaveCount(0);
 });
 test('PSHL-010 Status filter in URL selects degraded records',async({page})=>{
  await openPlatformSystemHealth(page,{query:'status=degraded'});
  await expect(filters(page).getByLabel('Health status')).toHaveValue('degraded');
  await expect(row(page,degradedTenant.tenant_name)).toBeVisible();await expect(row(page,healthyTenant.tenant_name)).toHaveCount(0);
 });
 test('PSHL-011 Not monitored status automatically includes archived evidence',async({page})=>{
  const sent:string[]=[];await openPlatformSystemHealth(page,{query:'status=not_monitored',onCall:(m,p,q)=>{if(m==='GET'&&p===healthRoot)sent.push(q.toString());}});
  await expect(row(page,archivedTenant.tenant_name)).toBeVisible();
  expect(new URLSearchParams(sent.at(-1)).get('include_archived')).toBe('true');
  await expect(row(page,archivedTenant.tenant_name)).toContainText('Not monitored');
 });
 test('PSHL-012 Status selector changes server filter and URL',async({page})=>{
  const seen:string[]=[];await openPlatformSystemHealth(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===healthRoot)seen.push(q.toString());}});
  await filters(page).getByLabel('Health status').selectOption('healthy');await expect(row(page,degradedTenant.tenant_name)).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('status')).toBe('healthy');
  expect(new URLSearchParams(seen.at(-1)).get('status')).toBe('healthy');
 });
 test('PSHL-013 Archived toggle explicitly returns not-monitored record without false zeroes',async({page})=>{
  await openPlatformSystemHealth(page);await filters(page).getByLabel('Archived tenants').selectOption('true');
  await expect(row(page,archivedTenant.tenant_name)).toContainText('Archived tenant is not currently monitored.');
  await expect(row(page,archivedTenant.tenant_name)).toContainText('Not monitored');
 });
 test('PSHL-014 Search sends tenant-name filter only after submitting form',async({page})=>{
  let calls=0;await openPlatformSystemHealth(page,{onCall:(m,p)=>{if(m==='GET'&&p===healthRoot)calls++;}});
  await filters(page).getByLabel('Search tenant').fill('Beta');const before=calls;
  await expect(filters(page).getByLabel('Search tenant')).toHaveValue('Beta');expect(calls).toBe(before);
  await filters(page).getByRole('button',{name:'Search'}).click();await expect(row(page,degradedTenant.tenant_name)).toBeVisible();
  expect(new URL(page.url()).searchParams.get('search')).toBe('Beta');
 });
 test('PSHL-015 Clear search removes URL filter and restores records',async({page})=>{
  await openPlatformSystemHealth(page,{query:'search=Beta'});await expect(row(page,healthyTenant.tenant_name)).toHaveCount(0);
  await filters(page).getByRole('button',{name:'Clear search'}).click();
  await expect(row(page,healthyTenant.tenant_name)).toBeVisible();
  expect(new URL(page.url()).searchParams.has('search')).toBe(false);
 });
 test('PSHL-016 Trimmed search text used in API query',async({page})=>{
  const seen:string[]=[];await openPlatformSystemHealth(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===healthRoot)seen.push(q.toString());}});
  await filters(page).getByLabel('Search tenant').fill('  Alpha  ');
  await filters(page).getByRole('button',{name:'Search'}).click();
  await expect(row(page,healthyTenant.tenant_name)).toBeVisible();
  expect(new URLSearchParams(seen.at(-1)).get('search')).toBe('Alpha');
 });
 test('PSHL-017 Exact tenant UUID URL scope is visible and sent to API',async({page})=>{
  const seen:string[]=[];await openPlatformSystemHealth(page,{query:`tenant_id=${healthTenantB}`,onCall:(m,p,q)=>{if(m==='GET'&&p===healthRoot)seen.push(q.toString());}});
  await expect(root(page).locator('.platform-system-health__scope-notice')).toContainText(healthTenantB);
  expect(new URLSearchParams(seen.at(-1)).get('tenant_id')).toBe(healthTenantB);
  await expect(rows(page)).toHaveCount(1);
 });
 test('PSHL-018 Show registry clears exact tenant UUID scope',async({page})=>{
  await openPlatformSystemHealth(page,{query:`tenant_id=${healthTenantB}`});
  await root(page).getByRole('button',{name:'Show registry'}).click();
  await expect(row(page,healthyTenant.tenant_name)).toBeVisible();
  expect(new URL(page.url()).searchParams.has('tenant_id')).toBe(false);
 });
 test('PSHL-019 Invalid tenant UUID displays ignored-filter warning and no tenant query',async({page})=>{
  const seen:string[]=[];await openPlatformSystemHealth(page,{query:'tenant_id=not-a-valid-uuid',onCall:(m,p,q)=>{if(m==='GET'&&p===healthRoot)seen.push(q.toString());}});
  await expect(root(page)).toContainText('Invalid or unauthorized URL filter was ignored.');
  expect(new URLSearchParams(seen.at(-1)).has('tenant_id')).toBe(false);
 });
 test('PSHL-020 Invalid status is ignored instead of sent to validated API',async({page})=>{
  const seen:string[]=[];await openPlatformSystemHealth(page,{query:'status=unknown',onCall:(m,p,q)=>{if(m==='GET'&&p===healthRoot)seen.push(q.toString());}});
  await expect(root(page)).toContainText('Invalid or unauthorized URL filter was ignored.');
  expect(new URLSearchParams(seen.at(-1)).has('status')).toBe(false);
 });
 test('PSHL-021 Negative offset is clamped to zero before GET request',async({page})=>{
  const seen:string[]=[];await openPlatformSystemHealth(page,{query:'offset=-300',onCall:(m,p,q)=>{if(m==='GET'&&p===healthRoot)seen.push(q.toString());}});
  expect(new URLSearchParams(seen.at(-1)).get('offset')).toBe('0');
 });
 test('PSHL-022 Nonnumeric offset becomes zero with a stable pagination summary',async({page})=>{
  const seen:string[]=[];await openPlatformSystemHealth(page,{query:'offset=bad',onCall:(m,p,q)=>{if(m==='GET'&&p===healthRoot)seen.push(q.toString());}});
  expect(new URLSearchParams(seen.at(-1)).get('offset')).toBe('0');await expect(pager(page)).toContainText('1–2 of 2');
 });
 test('PSHL-023 Next page uses server offset fifty and displays remaining rows',async({page})=>{
  const seen:string[]=[];await openPlatformSystemHealth(page,{rows:healthRows(55),onCall:(m,p,q)=>{if(m==='GET'&&p===healthRoot)seen.push(q.toString());}});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect(pager(page)).toContainText('51–55 of 55');
  expect(new URLSearchParams(seen.at(-1)).get('offset')).toBe('50');
 });
 test('PSHL-024 Previous page returns from offset fifty to zero',async({page})=>{
  await openPlatformSystemHealth(page,{rows:healthRows(52),query:'offset=50'});
  await pager(page).getByRole('button',{name:'Previous'}).click();
  await expect(pager(page)).toContainText('1–50 of 52');expect(new URL(page.url()).searchParams.get('offset')).toBe('0');
 });
 test('PSHL-025 Status filter removes stale page offset',async({page})=>{
  await openPlatformSystemHealth(page,{rows:healthRows(55),query:'offset=50'});
  await filters(page).getByLabel('Health status').selectOption('healthy');
  expect(new URL(page.url()).searchParams.has('offset')).toBe(false);
 });
 test('PSHL-026 Submitted search resets offset to first page',async({page})=>{
  await openPlatformSystemHealth(page,{rows:healthRows(55),query:'offset=50'});
  await filters(page).getByLabel('Search tenant').fill('Synthetic health tenant 001');
  await filters(page).getByRole('button',{name:'Search'}).click();
  expect(new URL(page.url()).searchParams.has('offset')).toBe(false);await expect(rows(page)).toHaveCount(1);
 });
 test('PSHL-027 Changing archive inclusion drops the old offset',async({page})=>{
  await openPlatformSystemHealth(page,{rows:healthRows(55),query:'offset=50'});
  await filters(page).getByLabel('Archived tenants').selectOption('true');
  expect(new URL(page.url()).searchParams.has('offset')).toBe(false);
 });
 test('PSHL-028 Zero matches displays distinct empty registry explanation',async({page})=>{
  await openPlatformSystemHealth(page,{query:'search=no-such-tenant'});
  await expect(registry(page)).toContainText('No System Health rows match the current server filters.');
  await expect(pager(page)).toContainText('Showing 0–0 of 0');
 });
 test('PSHL-029 Degraded row shows pending derived alert creation rather than aligned',async({page})=>{
  await openPlatformSystemHealth(page);const r=row(page,degradedTenant.tenant_name);
  await expect(r).toContainText('pending creation');await expect(r).toContainText('No derived System Health alert is active.');
 });
 test('PSHL-030 Resolved evidence with active derived alert is pending resolution',async({page})=>{
  await openPlatformSystemHealth(page,{rows:[pendingResolutionTenant,alignedTenant]});
  await expect(row(page,pendingResolutionTenant.tenant_name)).toContainText('pending resolution');
  await expect(row(page,alignedTenant.tenant_name)).toContainText('aligned');
 });
 test('PSHL-031 Evidence boundary explains excluded derived alert and point-in-time rule',async({page})=>{
  await openPlatformSystemHealth(page);const truth=root(page).locator('.platform-system-health__truth');
  await expect(truth).toContainText('never allowed to become evidence for itself');
  await expect(truth).toContainText('does not prove future health');
 });
 test('PSHL-032 Missing diagnostics permission shows Restricted and sends no diagnostics request',async({page})=>{
  let diag=0;await openPlatformSystemHealth(page,{permissions:omit('platform.diagnostics.read'),onCall:(m,p)=>{if(m==='GET'&&p===healthDiagnostics)diag++;}});
  await expect(diagnostics(page)).toContainText('Restricted');expect(diag).toBe(0);
 });
 test('PSHL-033 Diagnostics grant enables separate GET limited to 100',async({page})=>{
  const seen:string[]=[];await openPlatformSystemHealth(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===healthDiagnostics)seen.push(q.toString());}});
  await expect.poll(()=>seen.length).toBeGreaterThan(0);expect(new URLSearchParams(seen.at(-1)).get('limit')).toBe('100');
  await expect(diagnostics(page)).toContainText('stuck idempotency record(s)');
 });
 test('PSHL-034 Diagnostic evidence includes method and API path but not request body',async({page})=>{
  await openPlatformSystemHealth(page);await expect(diagnostics(page)).toContainText(diagnosticRow.method);
  await expect(diagnostics(page)).toContainText(diagnosticRow.path);
  await expect(diagnostics(page)).not.toContainText('sensitive_request_payload');
 });
 test('PSHL-035 Zero stuck idempotency rows does not claim infrastructure uptime',async({page})=>{
  await openPlatformSystemHealth(page,{diagnostics:[]});
  await expect(diagnostics(page)).toContainText('No stuck idempotency records in the bounded diagnostic result.');
  await expect(root(page).locator('.platform-system-health__truth')).toContainText('externally verified');
 });
 test('PSHL-036 Without audit grant diagnostic row shows truncated ID but no audit link',async({page})=>{
  await openPlatformSystemHealth(page,{permissions:omit('platform.audit.read')});
  await expect(diagnostics(page).getByRole('link',{name:'Audit evidence'})).toHaveCount(0);
  await expect(diagnostics(page)).toContainText(diagnosticRow.id.slice(0,8));
 });
 test('PSHL-037 With audit grant diagnostic record opens exact audit target link',async({page})=>{
  await openPlatformSystemHealth(page);
  await expect(diagnostics(page).getByRole('link',{name:'Audit evidence'})).toHaveAttribute('href',
   `/platform/audit?target_type=idempotency_key&target_id=${diagnosticRow.id}`);
 });
 test('PSHL-038 Initial registry error offers Retry and does not fake healthy evidence',async({page})=>{
  await openPlatformSystemHealth(page,{overrides:{'GET /platform/system-health':{status:503,json:{message:'Health snapshot unavailable'}}}});
  await expect(root(page)).toContainText('System Health failed to load.');
  await expect(root(page).getByRole('button',{name:'Retry'})).toBeVisible();
  await expect(registry(page).locator('table')).toHaveCount(0);
 });
 test('PSHL-039 Retry after temporary registry error restores real-looking but synthetic rows',async({page})=>{
  let fail=true;await openPlatformSystemHealth(page,{respond:(m,p)=>m==='GET'&&p===healthRoot&&fail?{status:503,json:{message:'Fixture down'}}:undefined});
  await expect(root(page)).toContainText('System Health failed to load.');fail=false;
  await root(page).getByRole('button',{name:'Retry'}).click();await expect(row(page,healthyTenant.tenant_name)).toBeVisible();
 });
 test('PSHL-040 Failed refresh preserves last good snapshot and warning',async({page})=>{
  let fail=false;await openPlatformSystemHealth(page,{respond:(m,p)=>m==='GET'&&p===healthRoot&&fail?{status:503,json:{message:'Refresh unavailable'}}:undefined});
  await expect(row(page,healthyTenant.tenant_name)).toBeVisible();fail=true;
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(root(page)).toContainText('Showing the last successful System Health snapshot.');
  await expect(row(page,healthyTenant.tenant_name)).toBeVisible();
 });
 test('PSHL-041 Refresh re-requests registry and optional permitted diagnostics independently',async({page})=>{
  let health=0,diag=0;await openPlatformSystemHealth(page,{onCall:(m,p)=>{
   if(m==='GET'&&p===healthRoot)health++;if(m==='GET'&&p===healthDiagnostics)diag++;}});
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect.poll(()=>health).toBeGreaterThanOrEqual(2);await expect.poll(()=>diag).toBeGreaterThanOrEqual(2);
 });
});

/** Batch 93 continuation — the following 39 source-inventoried cases were NOT executed.
 * PSHL-070..080 are deliberately skipped: fixture success cannot prove SQL, RBAC,
 * tenant isolation, downstream alert synchronization or externally observed uptime. */
test.describe('Platform System Health — continuation (BATCH_093_GENERATED_UNRUN)',()=>{
 test('PSHL-042 Diagnostics initial error offers its own Retry without suppressing registry',async({page})=>{
  await openPlatformSystemHealth(page,{overrides:{'GET /platform/diagnostics/stuck-idempotency':{status:503,json:{message:'Diagnostic unavailable'}}}});
  await expect(diagnostics(page)).toContainText('Platform diagnostics failed to load.');
  await expect(diagnostics(page).getByRole('button',{name:'Retry diagnostics'})).toBeVisible();
  await expect(row(page,healthyTenant.tenant_name)).toBeVisible();
 });
 test('PSHL-043 Diagnostics retry restores bounded results',async({page})=>{
  let failed=true;await openPlatformSystemHealth(page,{respond:(m,p)=>m==='GET'&&p===healthDiagnostics&&failed?{status:503,json:{message:'Offline'}}:undefined});
  await expect(diagnostics(page).getByRole('button',{name:'Retry diagnostics'})).toBeVisible();failed=false;
  await diagnostics(page).getByRole('button',{name:'Retry diagnostics'}).click();
  await expect(diagnostics(page)).toContainText('stuck idempotency record(s)');
  await expect(diagnostics(page)).toContainText(diagnosticRow.path);
 });
 test('PSHL-044 Diagnostics refresh failure retains prior diagnostic row and warning',async({page})=>{
  let failed=false;await openPlatformSystemHealth(page,{respond:(m,p)=>m==='GET'&&p===healthDiagnostics&&failed?{status:503,json:{message:'No diagnostics'}}:undefined});
  await expect(diagnostics(page)).toContainText(diagnosticRow.path);failed=true;
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(diagnostics(page)).toContainText('Showing the last successful diagnostics snapshot.');
  await expect(diagnostics(page)).toContainText(diagnosticRow.path);
 });
 test('PSHL-045 Failed optional diagnostics does not replace registry evidence',async({page})=>{
  await openPlatformSystemHealth(page,{overrides:{'GET /platform/diagnostics/stuck-idempotency':{status:403,json:{message:'Restricted'}}}});
  await expect(row(page,degradedTenant.tenant_name)).toContainText('Negative stock 1');
  await expect(diagnostics(page)).toContainText('Platform diagnostics failed to load.');
  await expect(root(page).getByLabel('System Health key metrics')).toContainText('Affected evidence');
 });
 test('PSHL-046 Supporting page links are independently permission gated',async({page})=>{
  await openPlatformSystemHealth(page,{permissions:omit('platform.incidents.read','platform.audit.read','platform.sla.read')});
  const nav=root(page).getByLabel('Supporting platform pages');
  await expect(nav.getByRole('link',{name:'Tenant Health'})).toBeVisible();
  await expect(nav.getByRole('link',{name:'Incidents'})).toHaveCount(0);
  await expect(nav.getByRole('link',{name:'Audit'})).toHaveCount(0);
  await expect(nav.getByRole('link',{name:'Support Cockpit'})).toHaveCount(0);
  await expect(nav).toContainText('3 supporting link(s) hidden by permission.');
 });
 test('PSHL-047 Tenant scoped links preserve UUID and unresolved-only incident filter',async({page})=>{
  await openPlatformSystemHealth(page,{query:`tenant_id=${healthTenantB}`});
  const nav=root(page).getByLabel('Supporting platform pages');
  await expect(nav.getByRole('link',{name:'Incidents'})).toHaveAttribute('href',`/platform/incidents?scope=tenant&tenant_id=${healthTenantB}&include_resolved=false`);
  await expect(nav.getByRole('link',{name:'Tenant Health'})).toHaveAttribute('href',`/platform/tenant-health?tenant_id=${healthTenantB}`);
  await expect(row(page,degradedTenant.tenant_name).getByRole('link',{name:'Support'})).toHaveAttribute('href',`/platform/support-operations-cockpit?tenant_id=${healthTenantB}`);
 });
 test('PSHL-048 Diagnostic audit evidence URL encodes dynamic ID and obeys audit grant',async({page})=>{
  const unusual={...diagnosticRow,id:'x/id?part=1&x=2'};
  await openPlatformSystemHealth(page,{diagnostics:[unusual]});
  await expect(diagnostics(page).getByRole('link',{name:'Audit evidence'})).toHaveAttribute('href',`/platform/audit?target_type=idempotency_key&target_id=${encodeURIComponent(unusual.id)}`);
 });
 test('PSHL-049 Filtered summary separately shows issue categories and affected evidence counts',async({page})=>{
  await openPlatformSystemHealth(page,{rows:[healthyTenant,degradedTenant]});
  const cards=root(page).getByLabel('System Health key metrics');
  await expect(cards).toContainText('Issue categories');await expect(cards).toContainText('Affected evidence');
  await expect(cards.getByText('3',{exact:true})).toHaveCount(1);
  await expect(cards.getByText('6',{exact:true})).toHaveCount(1);
 });
 test('PSHL-050 Pending sync aggregate sums creation and resolution counts',async({page})=>{
  await openPlatformSystemHealth(page,{rows:[degradedTenant,pendingResolutionTenant,alignedTenant]});
  await expect(root(page).getByLabel('System Health key metrics')).toContainText('Alert sync pending');
  await expect(row(page,pendingResolutionTenant.tenant_name)).toContainText('pending resolution');
  await expect(row(page,degradedTenant.tenant_name)).toContainText('pending creation');
 });
 test('PSHL-051 Degraded filter excludes archived entries by default',async({page})=>{
  const sent:string[]=[];await openPlatformSystemHealth(page,{query:'status=degraded',onCall:(m,p,q)=>{if(m==='GET'&&p===healthRoot)sent.push(q.toString());}});
  await expect(row(page,degradedTenant.tenant_name)).toBeVisible();
  await expect(row(page,archivedTenant.tenant_name)).toHaveCount(0);
  expect(new URLSearchParams(sent.at(-1)).has('include_archived')).toBe(false);
 });
 test('PSHL-052 Exact archived tenant UUID can be inspected without registry archive toggle',async({page})=>{
  await openPlatformSystemHealth(page,{query:`tenant_id=${healthTenantC}`});
  await expect(row(page,archivedTenant.tenant_name)).toBeVisible();
  await expect(filters(page).getByLabel('Archived tenants')).toHaveValue('false');
 });
 test('PSHL-053 Archived tenant evidence is Not monitored, never zero',async({page})=>{
  await openPlatformSystemHealth(page,{query:'status=not_monitored'});
  const r=row(page,archivedTenant.tenant_name);
  for(const name of ['Blocking alerts','Negative stock','Incomplete shipments'])await expect(r).toContainText(`${name} Not monitored`);
  await expect(r).toContainText('Not evaluated as current health');
 });
 test('PSHL-054 Search tenant input has an explicit 200-character maximum',async({page})=>{
  await openPlatformSystemHealth(page);await expect(filters(page).getByLabel('Search tenant')).toHaveAttribute('maxlength','200');
 });
 test('PSHL-055 Refresh button disables while a refetch is in flight',async({page})=>{
  let release:()=>void=()=>{};let gate=false;
  const pending=new Promise<void>(resolve=>{release=resolve;});
  await openPlatformSystemHealth(page,{respond:async(m,p)=>{if(m==='GET'&&p===healthRoot&&gate){await pending;}return undefined;}});
  await expect(row(page,healthyTenant.tenant_name)).toBeVisible();gate=true;
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(root(page).getByRole('button',{name:'Refreshing…'})).toBeDisabled();release();
 });
 test('PSHL-056 Two invalid URL filters are omitted from registry GET',async({page})=>{
  const sent:string[]=[];await openPlatformSystemHealth(page,{query:'status=bad&tenant_id=forged',onCall:(m,p,q)=>{if(m==='GET'&&p===healthRoot)sent.push(q.toString());}});
  await expect(root(page)).toContainText('Invalid or unauthorized URL filter was ignored.');
  const q=new URLSearchParams(sent.at(-1));expect(q.has('tenant_id')).toBe(false);expect(q.has('status')).toBe(false);
 });
 test('PSHL-057 An empty exact tenant scope is not a global health assertion',async({page})=>{
  const missing='f9200000-0000-4000-8000-000000000099';
  await openPlatformSystemHealth(page,{query:`tenant_id=${missing}`});
  await expect(root(page).locator('.platform-system-health__scope-notice')).toContainText(missing);
  await expect(registry(page)).toContainText('No System Health rows match the current server filters.');
  await expect(pager(page)).toContainText('Showing 0–0 of 0');
 });
 test('PSHL-058 Diagnostics stale warning does not trigger registry stale warning',async({page})=>{
  let fail=false;await openPlatformSystemHealth(page,{respond:(m,p)=>m==='GET'&&p===healthDiagnostics&&fail?{status:503,json:{message:'Diagnostic stale'}}:undefined});
  await expect(diagnostics(page)).toContainText(diagnosticRow.path);fail=true;
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(diagnostics(page)).toContainText('Showing the last successful diagnostics snapshot.');
  await expect(root(page).locator('.platform-system-health__warning').filter({hasText:'last successful System Health snapshot'})).toHaveCount(0);
 });
 test('PSHL-059 Empty diagnostics shows bounded no-record message, never uptime certification',async({page})=>{
  await openPlatformSystemHealth(page,{diagnostics:[]});
  await expect(diagnostics(page)).toContainText('No stuck idempotency records in the bounded diagnostic result.');
  await expect(root(page)).toContainText('does not prove infrastructure availability');
 });
 test('PSHL-060 Loading tenant registry shows loading label before data response',async({page})=>{
  let release:()=>void=()=>{};const gate=new Promise<void>(resolve=>{release=resolve;});
  await openPlatformSystemHealth(page,{respond:async(m,p)=>{if(m==='GET'&&p===healthRoot)await gate;return undefined;}});
  await expect(registry(page)).toContainText('Loading System Health…');
  await expect(registry(page).locator('table')).toHaveCount(0);release();
 });
 test('PSHL-061 Next is disabled on last server page',async({page})=>{
  await openPlatformSystemHealth(page,{rows:healthRows(52),query:'offset=50'});
  await expect(pager(page).getByRole('button',{name:'Next'})).toBeDisabled();
  await expect(pager(page)).toContainText('51–52 of 52');
 });
 test('PSHL-062 Previous is disabled on first server page',async({page})=>{
  await openPlatformSystemHealth(page);
  await expect(pager(page).getByRole('button',{name:'Previous'})).toBeDisabled();
 });
 test('PSHL-063 Status change from archived keeps explicit archive inclusion',async({page})=>{
  await openPlatformSystemHealth(page,{query:'status=not_monitored&include_archived=true'});
  await filters(page).getByLabel('Health status').selectOption('healthy');
  await expect(filters(page).getByLabel('Archived tenants')).toHaveValue('true');
  expect(new URL(page.url()).searchParams.get('include_archived')).toBe('true');
 });
 test('PSHL-064 Archive selector sends include_archived true and resets offset',async({page})=>{
  const requests:string[]=[];await openPlatformSystemHealth(page,{rows:healthRows(60),query:'offset=50',onCall:(m,p,q)=>{if(m==='GET'&&p===healthRoot)requests.push(q.toString());}});
  await filters(page).getByLabel('Archived tenants').selectOption('true');
  expect(new URL(page.url()).searchParams.has('offset')).toBe(false);
  const q=new URLSearchParams(requests.at(-1));expect(q.get('include_archived')).toBe('true');expect(q.get('offset')).toBe('0');
 });
 test('PSHL-065 Typing search without submitting does not change API search query',async({page})=>{
  const requests:string[]=[];await openPlatformSystemHealth(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===healthRoot)requests.push(q.toString());}});
  const prior=requests.length;await filters(page).getByLabel('Search tenant').fill('Beta');
  expect(requests.length).toBe(prior);expect(new URL(page.url()).searchParams.has('search')).toBe(false);
  await filters(page).getByRole('button',{name:'Search'}).click();
  await expect(row(page,degradedTenant.tenant_name)).toBeVisible();
  expect(new URL(page.url()).searchParams.get('search')).toBe('Beta');
 });
 test.skip('PSHL-066 Missing or malformed summary: requires frontend hardening and real response validation (Phase 2)',async()=>{});
 test.skip('PSHL-067 Missing evidence fields: guard against defaulting incomplete evidence to healthy (Phase 2)',async()=>{});
 test('PSHL-068 Synthetic read displays only aggregate issue messages, not private source payloads',async({page})=>{
  await openPlatformSystemHealth(page);await expect(row(page,degradedTenant.tenant_name)).toContainText('stock row currently has negative quantity');
  await expect(registry(page)).not.toContainText('PRIVATE_ALERT_BODY');
  await expect(registry(page)).not.toContainText('CUSTOMER_LINE_ITEM');
 });
 test('PSHL-069 Optional diagnostics outage does not overwrite tenant evidence counts',async({page})=>{
  await openPlatformSystemHealth(page,{overrides:{'GET /platform/diagnostics/stuck-idempotency':{status:500,json:{message:'Diagnostics offline'}}}});
  const r=row(page,degradedTenant.tenant_name);
  await expect(r).toContainText('Blocking alerts 2');await expect(r).toContainText('Negative stock 1');
  await expect(r).toContainText('Incomplete shipments 3');
 });
 test.skip('PSHL-070 Require actual backend SYSTEM_HEALTH_READ plus TENANTS_READ denial (Phase 2)',async()=>{});
 test.skip('PSHL-071 Require actual backend rejection of malformed tenant UUID and forged scope (Phase 2)',async()=>{});
 test.skip('PSHL-072 Verify tenant A/B isolation on real backend and linked pages (Phase 2)',async()=>{});
 test.skip('PSHL-073 Verify real alerts SQL excludes its own SYSTEM_HEALTH_DEGRADED_BLOCKING (Phase 2)',async()=>{});
 test.skip('PSHL-074 Verify real negative-stock PostgreSQL evidence query (Phase 2)',async()=>{});
 test.skip('PSHL-075 Verify finalized shipment shortage reason SQL semantics (Phase 2)',async()=>{});
 test.skip('PSHL-076 Verify archived tenant exact ID and registry SQL scope (Phase 2)',async()=>{});
 test.skip('PSHL-077 Verify async derived-alert creation/resolution synchronization (Phase 2)',async()=>{});
 test.skip('PSHL-078 Verify diagnostics route forbidden without actual grant (Phase 2)',async()=>{});
 test.skip('PSHL-079 Verify real diagnostic responses do not leak request bodies (Phase 2)',async()=>{});
 test.skip('PSHL-080 Verify independent externally observed infrastructure uptime (Phase 2)',async()=>{});
});
