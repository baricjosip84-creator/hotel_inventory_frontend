import { test, expect, type Page } from '@playwright/test';
import { openTenantHealth, healthRows, healthPermissions, makeHealthRow, TASK_TENANT_A, TASK_TENANT_B } from '../../../support/tenantHealthFixture';

/** Batch 63: generated browser scenarios, never executed. Synthetic health scores and HTTP responses do not establish actual operational health. */
const filters=(page:Page)=>page.locator('.platform-tenant-health__filter-grid');
const rows=(page:Page)=>page.locator('.platform-tenant-health__list');
const card=(page:Page,name:string)=>rows(page).locator('.platform-tenant-health__card').filter({has:page.getByRole('heading',{name,exact:true})});
const scan=(page:Page)=>page.getByRole('button',{name:'Reconcile health notifications'});

test.describe('Platform Tenant Health — Batch 63, GENERATED_UNRUN',()=>{
 test('PTH-001 Hero explains heuristic scoring, partial evidence and non-guarantees',async({page})=>{
  await openTenantHealth(page);await expect(page.getByText('Source · GET /platform/tenant-health')).toBeVisible();
  await expect(page.getByText(/This score is an operational heuristic/)).toBeVisible();
  await expect(page.getByText('Summary · loaded page only')).toBeVisible();
 });
 test('PTH-002 Default GET requests 100 rows starting at offset zero',async({page})=>{
  const queries:URLSearchParams[]=[];await openTenantHealth(page,{onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/tenant-health')queries.push(new URLSearchParams(q));}});
  await expect.poll(()=>queries.length).toBeGreaterThan(0);expect(queries[0].get('limit')).toBe('100');
  expect(queries[0].get('offset')).toBe('0');expect(queries[0].has('tenant_id')).toBe(false);
 });
 test('PTH-003 Cards distinguish available and locked tenant states',async({page})=>{
  await openTenantHealth(page);await expect(card(page,'Fixture Hotel')).toContainText('Writes available');
  await expect(card(page,'Fixture Warehouse')).toContainText('Writes locked');
  await expect(card(page,'Fixture Warehouse')).toContainText('Risk');
 });
 test('PTH-004 Summary labels loaded-page statistics, not global totals',async({page})=>{
  await openTenantHealth(page);const summary=page.getByLabel('Tenant health loaded-page summary');
  await expect(summary).toContainText('Loaded tenants');await expect(summary).toContainText('Healthy');
  await expect(summary).toContainText('Risk / critical');await expect(summary).toContainText('Current page only; not a global tenant total');
 });
 test('PTH-005 Tenant URL filter scopes GET and current-view label',async({page})=>{
  const ids:string[]=[];await openTenantHealth(page,{query:`tenant_id=${TASK_TENANT_A}`,onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/tenant-health')ids.push(q.get('tenant_id')||'');}});
  await expect(card(page,'Fixture Hotel')).toBeVisible();await expect(card(page,'Fixture Warehouse')).toHaveCount(0);
  await expect(page.getByText('Current view · Fixture Hotel')).toBeVisible();expect(ids).toContain(TASK_TENANT_A);
 });
 test('PTH-006 Tenant selector updates the URL and health request scope',async({page})=>{
  const ids:string[]=[];await openTenantHealth(page,{onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/tenant-health')ids.push(q.get('tenant_id')||'');}});
  await filters(page).getByLabel('Tenant').selectOption(TASK_TENANT_B);
  await expect(page).toHaveURL(new RegExp('tenant_id='+TASK_TENANT_B));
  await expect.poll(()=>ids).toContain(TASK_TENANT_B);await expect(card(page,'Fixture Warehouse')).toBeVisible();
 });
 test('PTH-007 Health band filters only the loaded page, no new API band parameter',async({page})=>{
  const queries:string[]=[];await openTenantHealth(page,{onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/tenant-health')queries.push(q.toString());}});
  await expect(card(page,'Fixture Hotel')).toBeVisible();const initial=queries.length;
  await filters(page).getByLabel('Health band').selectOption('risk');
  await expect(page).toHaveURL(/band=risk/);await expect(card(page,'Fixture Warehouse')).toBeVisible();
  await expect(card(page,'Fixture Hotel')).toHaveCount(0);expect(queries.length).toBe(initial);
 });
 test('PTH-008 Clearing band restores all rows from the loaded snapshot',async({page})=>{
  await openTenantHealth(page,{query:'band=healthy'});await expect(card(page,'Fixture Warehouse')).toHaveCount(0);
  await filters(page).getByLabel('Health band').selectOption('');
  await expect(card(page,'Fixture Hotel')).toBeVisible();await expect(card(page,'Fixture Warehouse')).toBeVisible();
 });
 test('PTH-009 Invalid tenant UUID fails closed before health GET',async({page})=>{
  const calls:string[]=[];await openTenantHealth(page,{query:'tenant_id=wrong',onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-health')calls.push(p);}});
  await expect(page.getByText('One or more URL filters are invalid.')).toBeVisible();expect(calls).toHaveLength(0);
 });
 test('PTH-010 Unknown health band blocks GET until repaired',async({page})=>{
  const calls:string[]=[];await openTenantHealth(page,{query:'band=unknown',onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-health')calls.push(p);}});
  await expect(page.getByRole('button',{name:'Clear invalid filters'})).toBeVisible();expect(calls).toHaveLength(0);
 });
 test('PTH-011 Invalid band repair keeps a valid selected tenant',async({page})=>{
  await openTenantHealth(page,{query:`tenant_id=${TASK_TENANT_A}&band=unknown`});
  await page.getByRole('button',{name:'Clear invalid filters'}).click();
  await expect(page).toHaveURL(new RegExp('tenant_id='+TASK_TENANT_A));await expect(page).not.toHaveURL(/band=/);
  await expect(card(page,'Fixture Hotel')).toBeVisible();
 });
 test('PTH-012 Missing protected evidence withholds the final tenant scores',async({page})=>{
  await openTenantHealth(page,{permissions:['platform.dashboard.read','platform.tenants.read']});
  await expect(page.getByText('Final score withheld')).toBeVisible();
  await expect(card(page,'Fixture Hotel')).toContainText('Partial evidence');
  await expect(card(page,'Fixture Warehouse')).toContainText('Partial evidence');
 });
 test('PTH-013 Permission-omitted counts show Hidden by permission, not zero',async({page})=>{
  await openTenantHealth(page,{permissions:['platform.dashboard.read','platform.tenants.read']});
  await expect(card(page,'Fixture Hotel').locator('.platform-tenant-health__metrics-grid').getByText('Hidden by permission',{exact:true})).toHaveCount(3);
  await expect(page.locator('[data-state="omitted"]')).toHaveCount(4);
 });
 test('PTH-014 No issues detected is described as heuristic, not externally verified health',async({page})=>{
  await openTenantHealth(page);await expect(card(page,'Fixture Hotel')).toContainText('No issues detected in the permitted evidence on this snapshot.');
  await expect(card(page,'Fixture Hotel')).toContainText('not proof of external health');
 });
 test('PTH-015 Usage values show current utilization without inventing a total',async({page})=>{
  await openTenantHealth(page);await expect(card(page,'Fixture Warehouse')).toContainText('Products · 95/100 · 95%');
 });
 test('PTH-016 Issues UI caps displayed issue records to ten per tenant',async({page})=>{
  const issues=Array.from({length:12},(_,i)=>({source:'incidents',code:`fixture_${i}`,severity:'warning' as const,points:2,message:`Fixture finding ${i}`}));
  await openTenantHealth(page,{rows:[makeHealthRow(1,{issues})]});
  await expect(card(page,'Fixture health tenant 001').locator('.platform-tenant-health__issues > div')).toHaveCount(10);
  await expect(card(page,'Fixture health tenant 001')).not.toContainText('Fixture finding 11');
 });
 test('PTH-017 Invalid notification threshold disables reconciliation submit',async({page})=>{
  await openTenantHealth(page);await page.getByLabel('Threshold').fill('101');
  await expect(scan(page)).toBeDisabled();await expect(page.getByText('Threshold must be a whole number from 0 to 100.')).toBeVisible();
 });
 test('PTH-018 Missing notification write permission hides reconciliation action',async({page})=>{
  await openTenantHealth(page,{permissions:healthPermissions.filter(x=>x!=='platform.notifications.write')});
  await expect(scan(page)).toHaveCount(0);
  await expect(page.getByText(/Notification reconciliation is unavailable unless/)).toBeVisible();
 });
 test('PTH-019 Valid tenant-scoped reconcile sends integer threshold and selected UUID',async({page})=>{
  const payloads:any[]=[];await openTenantHealth(page,{query:`tenant_id=${TASK_TENANT_A}`,onCall:(m,p,_q,b)=>{if(m==='POST'&&p==='/platform/tenant-health/scan')payloads.push(b);}});
  await page.getByLabel('Threshold').fill('65');await scan(page).click();
  await expect.poll(()=>payloads.length).toBe(1);
  expect(payloads[0]).toEqual({threshold:65,tenant_id:TASK_TENANT_A});
 });
 test('PTH-020 Synthetic reconciliation response reports counts without claiming real delivery',async({page})=>{
  await openTenantHealth(page);await scan(page).click();
  await expect(page.getByText(/Reconciliation complete: checked 2; at\/below threshold 1; created 1; refreshed 1/)).toBeVisible();
  await expect(page.getByText(/This is a write action and therefore has a stricter permission boundary/)).toBeVisible();
 });
 test('PTH-021 Threshold lower boundary zero accepted by reconciliation UI',async({page})=>{
  const sent:any[]=[];await openTenantHealth(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p.endsWith('/scan'))sent.push(b);}});
  await page.getByLabel('Threshold').fill('0');await expect(scan(page)).toBeEnabled();await scan(page).click();
  await expect.poll(()=>sent.length).toBe(1);expect(sent[0]).toEqual({threshold:0});
 });
 test('PTH-022 Threshold upper boundary 100 accepted by reconciliation UI',async({page})=>{
  const sent:any[]=[];await openTenantHealth(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p.endsWith('/scan'))sent.push(b);}});
  await page.getByLabel('Threshold').fill('100');await expect(scan(page)).toBeEnabled();await scan(page).click();
  await expect.poll(()=>sent.length).toBe(1);expect(sent[0]).toEqual({threshold:100});
 });
 test('PTH-023 Negative threshold disallowed with inline warning',async({page})=>{
  const sent:any[]=[];await openTenantHealth(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/scan'))sent.push(m);}});
  await page.getByLabel('Threshold').fill('-1');await expect(scan(page)).toBeDisabled();
  await expect(page.getByText('Threshold must be a whole number from 0 to 100.')).toBeVisible();expect(sent).toHaveLength(0);
 });
 test('PTH-024 Fractional threshold disallowed with inline warning',async({page})=>{
  await openTenantHealth(page);await page.getByLabel('Threshold').fill('65.5');
  await expect(scan(page)).toBeDisabled();await expect(page.getByText('Threshold must be a whole number from 0 to 100.')).toBeVisible();
 });
 test('PTH-025 Empty threshold coerced by frontend Number conversion and must be explicitly verified',async({page})=>{
  const sent:any[]=[];await openTenantHealth(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p.endsWith('/scan'))sent.push(b);}});
  await page.getByLabel('Threshold').fill('');await expect(scan(page)).toBeEnabled();await scan(page).click();
  await expect.poll(()=>sent.length).toBe(1);expect(sent[0]).toEqual({threshold:0});
  // Source discrepancy: Number('') === 0; empty input is NOT independently rejected.
 });
 test('PTH-026 Pending reconciliation disables duplicate submit and shows Reconciling state',async({page})=>{
  const sent:any[]=[];await openTenantHealth(page,{delayMs:{'POST /platform/tenant-health/scan':1100},onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/scan'))sent.push(p);}});
  await scan(page).click();await expect(page.getByRole('button',{name:'Reconciling…'})).toBeDisabled();
  expect(sent).toHaveLength(1);await expect(scan(page)).toBeEnabled();expect(sent).toHaveLength(1);
 });
 test('PTH-027 Reconciliation HTTP 503 displays error without false success',async({page})=>{
  await openTenantHealth(page,{responses:{'POST /platform/tenant-health/scan':{status:503,json:{message:'Synthetic scan outage'}}}});
  await scan(page).click();await expect(page.getByText('Notification reconciliation failed.')).toBeVisible();
  await expect(page.locator('.platform-tenant-health__success')).toHaveCount(0);
 });
 test('PTH-028 Reconcile error can be retried with the same user-entered threshold',async({page})=>{
  let fail=true;const sent:any[]=[];await openTenantHealth(page,{respond:(m,p,_q,b)=>{if(m==='POST'&&p.endsWith('/scan')){sent.push(b);return fail?{status:503,json:{message:'Fixture retry required'}}:undefined;}}});
  await page.getByLabel('Threshold').fill('57');await scan(page).click();
  await expect(page.getByText('Notification reconciliation failed.')).toBeVisible();fail=false;await scan(page).click();
  await expect(page.locator('.platform-tenant-health__success')).toBeVisible();expect(sent).toEqual([{threshold:57},{threshold:57}]);
 });
 test('PTH-029 Successful reconciliation invalidates health and notifications query caches',async({page})=>{
  const healthGets:string[]=[];await openTenantHealth(page,{onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-health')healthGets.push(p);}});
  await expect(card(page,'Fixture Hotel')).toBeVisible();const initial=healthGets.length;await scan(page).click();
  await expect(page.locator('.platform-tenant-health__success')).toBeVisible();await expect.poll(()=>healthGets.length).toBeGreaterThan(initial);
  // Notifications invalidation is source-reviewed; no notifications query is mounted on this page.
 });
 test('PTH-030 Global reconciliation POST omits tenant_id payload field',async({page})=>{
  const sent:any[]=[];await openTenantHealth(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p.endsWith('/scan'))sent.push(b);}});
  await scan(page).click();await expect.poll(()=>sent.length).toBe(1);expect(sent[0]).toEqual({threshold:70});
 });
 test('PTH-031 Initial health tenant-selector error blocks selector and exposes retry',async({page})=>{
  await openTenantHealth(page,{responses:{'GET /platform/tenants':{status:503,json:{message:'Fixture tenant selector down'}}}});
  await expect(page.getByText('Tenant selector could not be loaded.')).toBeVisible();
  await expect(filters(page).getByLabel('Tenant')).toBeDisabled();await expect(page.getByRole('button',{name:'Retry tenants'})).toBeVisible();
 });
 test('PTH-032 Retry tenant selector after transient failure restores options',async({page})=>{
  let fail=true;await openTenantHealth(page,{respond:(m,p)=>m==='GET'&&p==='/platform/tenants'&&fail?{status:503,json:{message:'Fixture selector fails until retry'}}:undefined});
  await expect(page.getByRole('button',{name:'Retry tenants'})).toBeVisible();fail=false;
  await page.getByRole('button',{name:'Retry tenants'}).click();await expect(filters(page).getByLabel('Tenant')).toBeEnabled();
  await expect(filters(page).getByLabel('Tenant').locator('option')).toContainText(['All tenants','Fixture Hotel','Fixture Warehouse']);
 });
 test('PTH-033 Initial health data API error shows Retry health not empty risk-free board',async({page})=>{
  await openTenantHealth(page,{responses:{'GET /platform/tenant-health':{status:503,json:{message:'Fixture health down'}}}});
  await expect(page.getByText('Tenant health could not be loaded.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Retry health'})).toBeVisible();
  await expect(page.getByText('No tenant rows on this loaded page match the current filters.')).toHaveCount(0);
 });
 test('PTH-034 Retry health recovers after transient HTTP error',async({page})=>{
  let fail=true;await openTenantHealth(page,{respond:(m,p)=>m==='GET'&&p==='/platform/tenant-health'&&fail?{status:503,json:{message:'Fixture health retry'}}:undefined});
  await expect(page.getByRole('button',{name:'Retry health'})).toBeVisible();fail=false;
  await page.getByRole('button',{name:'Retry health'}).click();await expect(card(page,'Fixture Hotel')).toBeVisible();
  await expect(page.getByText('Tenant health could not be loaded.')).toHaveCount(0);
 });
 test('PTH-035 Refresh health failure displays stale snapshot warning and retains cards',async({page})=>{
  let fail=false;await openTenantHealth(page,{respond:(m,p)=>m==='GET'&&p==='/platform/tenant-health'&&fail?{status:503,json:{message:'Fixture refresh failure'}}:undefined});
  await expect(card(page,'Fixture Hotel')).toBeVisible();fail=true;await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page.getByText('Health refresh failed. Showing the last successful health snapshot.')).toBeVisible();
  await expect(card(page,'Fixture Hotel')).toBeVisible();await expect(page.getByRole('button',{name:'Retry health'})).toHaveCount(0);
 });
 test('PTH-036 Tenant selector refresh failure retains last snapshot with warning',async({page})=>{
  let fail=false;await openTenantHealth(page,{respond:(m,p)=>m==='GET'&&p==='/platform/tenants'&&fail?{status:503,json:{message:'Fixture tenants refresh failure'}}:undefined});
  await expect(filters(page).getByLabel('Tenant').locator('option')).toContainText(['All tenants','Fixture Hotel','Fixture Warehouse']);
  fail=true;await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page.getByText('Tenant selector refresh failed. Showing the last successful tenant selector snapshot.')).toBeVisible();
  await expect(filters(page).getByLabel('Tenant').locator('option')).toContainText(['All tenants','Fixture Hotel','Fixture Warehouse']);
 });
 test('PTH-037 Refresh button disabled while one or both data fetches pending',async({page})=>{
  await openTenantHealth(page,{delayMs:{'GET /platform/tenants':900,'GET /platform/tenant-health':900}});
  const refresh=page.getByRole('button',{name:'Refresh',exact:true});await expect(refresh).toBeEnabled();await refresh.click();
  await expect(refresh).toBeDisabled();await expect(page.getByText('Refreshing…')).toBeVisible();await expect(refresh).toBeEnabled();
 });
 test('PTH-038 Next health page requests server offset 100 and shows next page',async({page})=>{
  const gets:URLSearchParams[]=[];await openTenantHealth(page,{rows:Array.from({length:102},(_,i)=>makeHealthRow(i+1)),onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/tenant-health')gets.push(new URLSearchParams(q));}});
  await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page.getByText('Page 2',{exact:true})).toBeVisible();
  await expect(card(page,'Fixture health tenant 101')).toBeVisible();await expect.poll(()=>gets.some(q=>q.get('offset')==='100')).toBe(true);
 });
 test('PTH-039 Previous health page returns to offset zero and page one',async({page})=>{
  const gets:number[]=[];await openTenantHealth(page,{rows:Array.from({length:102},(_,i)=>makeHealthRow(i+1)),onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/tenant-health')gets.push(Number(q.get('offset')));}});
  await page.getByRole('button',{name:'Next',exact:true}).click();await expect(card(page,'Fixture health tenant 101')).toBeVisible();
  await page.getByRole('button',{name:'Previous',exact:true}).click();await expect(card(page,'Fixture health tenant 001')).toBeVisible();
  await expect(page.getByText('Page 1',{exact:true})).toBeVisible();expect(gets.slice(-1)[0]).toBe(0);
 });
 test('PTH-040 Last health page disables Next based on pagination has_more',async({page})=>{
  await openTenantHealth(page,{rows:Array.from({length:101},(_,i)=>makeHealthRow(i+1))});
  await page.getByRole('button',{name:'Next',exact:true}).click();await expect(card(page,'Fixture health tenant 101')).toBeVisible();
  await expect(page.getByRole('button',{name:'Next',exact:true})).toBeDisabled();
 });
 test('PTH-041 Band filters only the loaded page after server pagination',async({page})=>{
  const rows=Array.from({length:101},(_,i)=>makeHealthRow(i+1));rows[100]=makeHealthRow(101,{band:'risk',score:35});
  const calls:string[]=[];await openTenantHealth(page,{rows,onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/tenant-health')calls.push(q.toString());}});
  await filters(page).getByLabel('Health band').selectOption('risk');
  await expect(page.getByText('No tenant rows on this loaded page match the current filters.')).toBeVisible();
  await page.getByRole('button',{name:'Next',exact:true}).click();await expect(card(page,'Fixture health tenant 101')).toBeVisible();
  expect(calls.every(query=>!new URLSearchParams(query).has('band'))).toBe(true);
 });
 test('PTH-042 Health band change resets pagination offset to page one',async({page})=>{
  const calls:number[]=[];await openTenantHealth(page,{rows:Array.from({length:101},(_,i)=>makeHealthRow(i+1)),onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/tenant-health')calls.push(Number(q.get('offset')));}});
  await page.getByRole('button',{name:'Next',exact:true}).click();await expect(card(page,'Fixture health tenant 101')).toBeVisible();
  await filters(page).getByLabel('Health band').selectOption('healthy');
  await expect(page.getByText('Page 1',{exact:true})).toBeVisible();await expect(card(page,'Fixture health tenant 001')).toBeVisible();
  await expect.poll(()=>calls.slice(-1)[0]).toBe(0);
 });
 test('PTH-043 Health tenant selection resets pagination offset to page one',async({page})=>{
  const calls:URLSearchParams[]=[];await openTenantHealth(page,{rows:Array.from({length:102},(_,i)=>makeHealthRow(i+1)),onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/tenant-health')calls.push(new URLSearchParams(q));}});
  await page.getByRole('button',{name:'Next',exact:true}).click();await expect(card(page,'Fixture health tenant 101')).toBeVisible();
  await filters(page).getByLabel('Tenant').selectOption(TASK_TENANT_A);
  await expect(page.getByText('Page 1',{exact:true})).toBeVisible();
  await expect.poll(()=>calls.some(q=>q.get('tenant_id')===TASK_TENANT_A&&q.get('offset')==='0')).toBe(true);
 });
 test('PTH-044 Valid UUID absent from selector displays Selected tenant fallback',async({page})=>{
  const row=makeHealthRow(77);await openTenantHealth(page,{query:`tenant_id=${row.tenant_id}`,rows:[row]});
  await expect(page.getByText('Current view · Selected tenant')).toBeVisible();await expect(card(page,row.tenant_name)).toBeVisible();
 });
 test('PTH-045 Multiple malformed tenant/band filters repaired together',async({page})=>{
  const calls:string[]=[];await openTenantHealth(page,{query:'tenant_id=bad-id&band=invalid',onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-health')calls.push(p);}});
  await expect(page.getByText('One or more URL filters are invalid.')).toBeVisible();expect(calls).toHaveLength(0);
  await page.getByRole('button',{name:'Clear invalid filters'}).click();await expect(page).not.toHaveURL(/tenant_id=/);
  await expect(page).not.toHaveURL(/band=/);await expect(card(page,'Fixture Hotel')).toBeVisible();
 });
 test('PTH-046 Repair malformed tenant preserves valid health band selection',async({page})=>{
  await openTenantHealth(page,{query:'tenant_id=bad-id&band=risk'});
  await page.getByRole('button',{name:'Clear invalid filters'}).click();await expect(page).toHaveURL(/band=risk/);
  await expect(page).not.toHaveURL(/tenant_id=/);await expect(card(page,'Fixture Warehouse')).toBeVisible();
  await expect(card(page,'Fixture Hotel')).toHaveCount(0);
 });
 test('PTH-047 Omitted protected evidence is counted in the evidence summary',async({page})=>{
  await openTenantHealth(page,{permissions:['platform.dashboard.read','platform.tenants.read']});
  await expect(page.locator('.platform-tenant-health__evidence-summary')).toContainText(['1/5','4']);
  await expect(page.locator('[data-state="omitted"]')).toHaveCount(4);
 });
 test('PTH-048 Partial evidence never presents missing counts as zero',async({page})=>{
  await openTenantHealth(page,{permissions:['platform.dashboard.read','platform.tenants.read']});
  const metrics=card(page,'Fixture Hotel').locator('.platform-tenant-health__metrics-grid');
  await expect(metrics).toContainText('Hidden by permission');await expect(metrics.getByText('Hidden by permission',{exact:true})).toHaveCount(3);
  await expect(card(page,'Fixture Hotel').locator('.platform-tenant-health__score strong')).toHaveText('—');
 });
 test('PTH-049 Hidden audit activity shows visible activity timestamp caveat',async({page})=>{
  await openTenantHealth(page,{permissions:healthPermissions.filter(p=>p!=='platform.audit.read')});
  await expect(card(page,'Fixture Hotel')).toContainText('Audit activity is hidden by permission');
  await expect(card(page,'Fixture Hotel')).toContainText('Not recorded');
 });
 test('PTH-050 Risk-first ordering is described as server/page scope not cross-page global order',async({page})=>{
  await openTenantHealth(page);await expect(page.getByText(/Risk-first ordering applies within the loaded page when complete scores exist/)).toBeVisible();
  await expect(page.getByText('Current page only; not a global tenant total')).toBeVisible();
 });
 test('PTH-051 Null health score displays em dash without numeric reassurance',async({page})=>{
  await openTenantHealth(page,{rows:[makeHealthRow(1,{score:null,band:'partial',score_complete:false})]});
  await expect(card(page,'Fixture health tenant 001').locator('.platform-tenant-health__score strong')).toHaveText('—');
  await expect(card(page,'Fixture health tenant 001')).toContainText('Partial evidence');
 });
 test('PTH-052 Empty tenant health board has truthful scoped no-match message',async({page})=>{
  await openTenantHealth(page,{rows:[]});await expect(rows(page).locator('article')).toHaveCount(0);
  await expect(page.getByText('No tenant rows on this loaded page match the current filters.')).toBeVisible();
  await expect(page.getByText('It does not prove that no operational or external risk exists.',{exact:false})).toBeVisible();
 });
 test('PTH-053 Missing plan shows No plan recorded, not invented plan',async({page})=>{
  await openTenantHealth(page,{rows:[makeHealthRow(1,{plan_code:''})]});
  await expect(card(page,'Fixture health tenant 001')).toContainText('No plan recorded');
 });
 test('PTH-054 Invalid last activity date displays Not recorded safely',async({page})=>{
  await openTenantHealth(page,{rows:[makeHealthRow(1,{last_activity_at:'not-a-date'})]});
  await expect(card(page,'Fixture health tenant 001').locator('.platform-tenant-health__metrics-grid')).toContainText('Not recorded');
 });
 test('PTH-055 Severity badges and heuristic deduction points match returned issues',async({page})=>{
  await openTenantHealth(page,{rows:[makeHealthRow(1,{issues:[{source:'support_sessions',code:'delayed',severity:'warning',points:7,message:'Fixture overdue support'}]})]});
  const issue=card(page,'Fixture health tenant 001').locator('.platform-tenant-health__issues > div');
  await expect(issue.locator('[data-severity="warning"]')).toHaveText('Warning');
  await expect(issue).toContainText('Fixture overdue support');await expect(issue).toContainText('Support sessions · -7 heuristic points');
 });
 test('PTH-056 No scored issues with partial evidence still warns of omitted risk',async({page})=>{
  await openTenantHealth(page,{permissions:['platform.dashboard.read','platform.tenants.read'],rows:[makeHealthRow(1)]});
  await expect(card(page,'Fixture health tenant 001')).toContainText('Protected omitted evidence can still contain risk');
  await expect(card(page,'Fixture health tenant 001').locator('.platform-tenant-health__score strong')).toHaveText('—');
 });
 test('PTH-057 Scan is hidden when one protected source permission is missing',async({page})=>{
  await openTenantHealth(page,{permissions:healthPermissions.filter(p=>p!=='platform.incidents.read')});
  await expect(scan(page)).toHaveCount(0);await expect(page.getByText(/Notification reconciliation is unavailable unless/)).toBeVisible();
 });
 test('PTH-058 Read-only operator can browse score snapshot without submitting scan',async({page})=>{
  const posts:string[]=[];await openTenantHealth(page,{permissions:healthPermissions.filter(p=>p!=='platform.notifications.write'),onCall:(m,p)=>{if(m==='POST')posts.push(p);}});
  await expect(card(page,'Fixture Hotel')).toBeVisible();await filters(page).getByLabel('Health band').selectOption('risk');
  await expect(card(page,'Fixture Warehouse')).toBeVisible();await expect(scan(page)).toHaveCount(0);expect(posts).toEqual([]);
 });
 test('PTH-059 TENANTS_READ absence blocks the health route',async({page})=>{
  const reads:string[]=[];await openTenantHealth(page,{permissions:['platform.dashboard.read'],expectHeading:false,onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-health')reads.push(p);}});
  await expect(page.getByRole('heading',{name:'Tenant health',exact:true})).toHaveCount(0);expect(reads).toEqual([]);
 });
 test('PTH-060 Threshold number input exposes source-defined min max and step',async({page})=>{
  await openTenantHealth(page);const field=page.getByLabel('Threshold');
  await expect(field).toHaveAttribute('type','number');await expect(field).toHaveAttribute('min','0');
  await expect(field).toHaveAttribute('max','100');await expect(field).toHaveAttribute('step','1');
 });
 test('PTH-061 Health-band select supports healthy watch risk critical partial',async({page})=>{
  await openTenantHealth(page);const band=filters(page).getByLabel('Health band');
  await expect(band.locator('option')).toContainText(['All bands','Healthy','Watch','Risk','Critical','Partial evidence']);
  for(const value of ['healthy','watch','risk','critical','partial']){
   await band.selectOption(value);await expect(page).toHaveURL(new RegExp('band='+value));
  }
 });
 test('PTH-062 Supporting links retain valid current tenant context',async({page})=>{
  await openTenantHealth(page,{query:`tenant_id=${TASK_TENANT_A}`});
  const section=page.locator('.platform-tenant-health__section').filter({has:page.getByRole('heading',{name:'Supporting tenant operations'})});
  await expect(section.getByRole('link',{name:'Tenant tasks'})).toHaveAttribute('href',`/platform/tenant-tasks?tenant_id=${TASK_TENANT_A}`);
  await expect(section.getByRole('link',{name:'Tenant timeline'})).toHaveAttribute('href',`/platform/tenant-timeline?tenant_id=${TASK_TENANT_A}`);
 });
 test('PTH-063 Per-tenant evidence links use the row tenant rather than current selection',async({page})=>{
  await openTenantHealth(page);const warehouse=card(page,'Fixture Warehouse');
  await expect(warehouse.getByRole('link',{name:'Tasks'})).toHaveAttribute('href',`/platform/tenant-tasks?tenant_id=${TASK_TENANT_B}`);
  await expect(warehouse.getByRole('link',{name:'Timeline'})).toHaveAttribute('href',`/platform/tenant-timeline?tenant_id=${TASK_TENANT_B}`);
 });
 test('PTH-064 Notification deep link is permission-gated and tenant-scoped',async({page})=>{
  await openTenantHealth(page);await expect(card(page,'Fixture Warehouse').getByRole('link',{name:'Notifications'})).toHaveAttribute('href',`/platform/notifications?tenant_id=${TASK_TENANT_B}`);
  await openTenantHealth(page,{permissions:healthPermissions.filter(p=>p!=='platform.notifications.read')});
  await expect(card(page,'Fixture Warehouse').getByRole('link',{name:'Notifications'})).toHaveCount(0);
 });
 test('PTH-065 Read-only snapshot causes no mutation network requests',async({page})=>{
  const writes:string[]=[];await openTenantHealth(page,{onCall:(m,p)=>{if(['POST','PATCH','PUT','DELETE'].includes(m)&&p.startsWith('/platform/tenant-health'))writes.push(`${m} ${p}`);}});
  await filters(page).getByLabel('Health band').selectOption('healthy');
  await page.getByRole('button',{name:'Refresh',exact:true}).click();await expect(page.getByRole('button',{name:'Refresh',exact:true})).toBeEnabled();
  expect(writes).toEqual([]);
 });
 test('PTH-066 HTTP 429 health error does not present false healthy success',async({page})=>{
  await openTenantHealth(page,{responses:{'GET /platform/tenant-health':{status:429,json:{message:'Fixture rate limit'}}}});
  await expect(page.getByText('Tenant health could not be loaded.')).toBeVisible();
  await expect(card(page,'Fixture Hotel')).toHaveCount(0);await expect(page.getByText('No tenant rows on this loaded page match the current filters.')).toHaveCount(0);
 });
 test('PTH-067 Health API stale partial evidence does not become a numeric score',async({page})=>{
  let fail=false;const row=makeHealthRow(1,{band:'partial',score:null,score_complete:false});
  await openTenantHealth(page,{rows:[row],permissions:healthPermissions.filter(p=>p!=='platform.audit.read'),
   respond:(m,p)=>m==='GET'&&p==='/platform/tenant-health'&&fail?{status:503,json:{message:'Fixture partial refresh failed'}}:undefined});
  await expect(card(page,row.tenant_name).locator('.platform-tenant-health__score strong')).toHaveText('—');
  fail=true;await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page.getByText('Health refresh failed. Showing the last successful health snapshot.')).toBeVisible();
  await expect(card(page,row.tenant_name).locator('.platform-tenant-health__score strong')).toHaveText('—');
  await expect(card(page,row.tenant_name)).toContainText('Partial evidence');
 });
 test('PTH-068 Notification scan API failure preserves visible error feedback',async({page})=>{
  await openTenantHealth(page,{responses:{'POST /platform/tenant-health/scan':{status:400,json:{message:'Fixture validation rejected'}}}});
  await scan(page).click();await expect(page.getByText('Notification reconciliation failed.')).toBeVisible();
  await expect(page.locator('.platform-tenant-health__blocking-error')).toContainText('Fixture validation rejected');
 });
 test('PTH-069 Missing any individual scan permission hides the write action',async({page})=>{
  for(const missing of ['platform.tenants.read','platform.incidents.read','platform.support_sessions.read','platform.notifications.read','platform.audit.read','platform.notifications.write']){
   // Base tenant read is a router guard, and is handled separately by PTH-059.
   if(missing==='platform.tenants.read')continue;
   await openTenantHealth(page,{permissions:healthPermissions.filter(p=>p!==missing)});
   await expect(scan(page)).toHaveCount(0);
  }
 });
 test('PTH-070 Heuristic and notification outcomes explicitly do not certify external service health',async({page})=>{
  await openTenantHealth(page);await expect(page.getByText(/This score is an operational heuristic, not an SLA/)).toBeVisible();
  await scan(page).click();await expect(page.getByText(/Reconciliation complete:/)).toBeVisible();
  await expect(page.getByText(/This is a write action and therefore has a stricter permission boundary/)).toBeVisible();
  await expect(page.getByText(/not proof of external health/)).toBeVisible();
 });
});
