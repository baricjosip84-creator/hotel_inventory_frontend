/** BATCH 67: PHASE 1 GENERATED_UNRUN. Synthetic platform transport only.
 * Browser rendering and intercepted payloads are NOT evidence of real authorization,
 * PostgreSQL writes, third-party operations, or incident recovery. */
import {test,expect,type Page} from '@playwright/test';
import {openPlatformRunbooks,runbooksSeed,runbookSteps,runbookPermissions,
 RUNBOOK_A,RUNBOOK_B,EXECUTION_A,TENANT_A,INCIDENT_A,TASK_A,syntheticRunbooks,syntheticExecutions} from '../../../support/platformRunbooksFixture';
const registryFilters=(page:Page)=>page.locator('.platform-runbooks__filter-grid').first();
const executionFilters=(page:Page)=>page.locator('.platform-runbooks__filter-grid--executions');
const registry=(page:Page)=>page.locator('.platform-runbooks__section').filter({has:page.getByRole('heading',{name:'Runbook registry',exact:true})});
const detail=(page:Page)=>page.locator('.platform-runbooks__section').filter({has:page.getByRole('heading',{name:'Runbook detail',exact:true})});
const createPanel=(page:Page)=>page.locator('.platform-runbooks__section').filter({has:page.getByRole('heading',{name:'Create runbook',exact:true})});
const executionPanel=(page:Page)=>page.locator('.platform-runbooks__section').filter({has:page.getByRole('heading',{name:'Start runbook execution',exact:true})});
const executions=(page:Page)=>page.locator('.platform-runbooks__section').filter({has:page.getByRole('heading',{name:'Execution registry',exact:true})});
const runbookCard=(page:Page,name:string)=>registry(page).locator('.platform-runbooks__runbook-card').filter({hasText:name});
const byKey=(m:string,p:string)=>`${m} ${p}`;
const withoutWrite=runbookPermissions.filter(p=>p!=='platform.runbooks.write');
const withoutExecute=runbookPermissions.filter(p=>p!=='platform.runbooks.execute');
async function selectRunbook(page:Page,name='Restore fixture service'){
 await runbookCard(page,name).click();await expect(detail(page).getByText('Synthetic response procedure')).toBeVisible();
}
async function fillCreate(page:Page,title='Fixture new runbook'){
 const form=createPanel(page);await form.getByLabel('Title',{exact:true}).fill(title);await form.getByLabel('Step 1 title').fill('Check readiness');return form;
}

test.describe('Platform Runbooks — Batch 67 registry and evidence (GENERATED_UNRUN)',()=>{
 test('PRB-001 Runbook screen renders read/write/execute permission boundaries',async({page})=>{
  await openPlatformRunbooks(page);await expect(page.locator('.platform-runbooks')).toContainText('PLATFORM_RUNBOOKS_READ');
  await expect(page.locator('.platform-runbooks')).toContainText('PLATFORM_RUNBOOKS_WRITE');
  await expect(page.locator('.platform-runbooks')).toContainText('PLATFORM_RUNBOOKS_EXECUTE');
 });
 test('PRB-002 Completion warning does not represent an external operational outcome',async({page})=>{
  await openPlatformRunbooks(page);await expect(page.locator('.platform-runbooks__truth-note')).toContainText('Application execution ≠ external outcome.');
  await expect(page.locator('.platform-runbooks__truth-note')).toContainText('authoritative evidence');
 });
 test('PRB-003 Loads global runbook summary values',async({page})=>{
  await openPlatformRunbooks(page);const stats=page.getByLabel('Runbook registry summary');
  await expect(stats).toContainText('Active runbooks');await expect(stats).toContainText('Critical runbooks');await expect(stats).toContainText('Active executions');
 });
 test('PRB-004 Summary is fetched independent of registry and execution lists',async({page})=>{
  const seen:string[]=[];await openPlatformRunbooks(page,{onCall:(m,p)=>{if(m==='GET')seen.push(p);}});
  await expect.poll(()=>seen.filter(s=>s==='/platform/runbooks/summary').length).toBeGreaterThan(0);
  await expect.poll(()=>seen.filter(s=>s==='/platform/runbooks').length).toBeGreaterThan(0);
  await expect.poll(()=>seen.filter(s=>s==='/platform/runbooks/executions').length).toBeGreaterThan(0);
 });
 test('PRB-005 Runbook and execution list requests both start at 50 rows offset zero',async({page})=>{
  const seen:{p:string;q:URLSearchParams}[]=[];await openPlatformRunbooks(page,{onCall:(m,p,q)=>{if(m==='GET')seen.push({p,q:new URLSearchParams(q)});}});
  for(const endpoint of ['/platform/runbooks','/platform/runbooks/executions']){
   await expect.poll(()=>seen.filter(x=>x.p===endpoint).length).toBeGreaterThan(0);
   const query=seen.find(x=>x.p===endpoint)!.q;expect(query.get('limit')).toBe('50');expect(query.get('offset')).toBe('0');
  }
 });
 test('PRB-006 Evidence boundary renders all four source scopes',async({page})=>{
  await openPlatformRunbooks(page);const evidence=page.locator('.platform-runbooks__evidence-grid');
  for(const name of ['Tenant evidence','Incident evidence','Tenant-task evidence','Operator identity'])await expect(evidence).toContainText(name);
 });
 test('PRB-007 With no tenant permission the evidence cells are restricted',async({page})=>{
  await openPlatformRunbooks(page,{permissions:runbookPermissions.filter(p=>p!=='platform.tenants.read')});
  const grid=page.locator('.platform-runbooks__evidence-grid');await expect(grid.locator('[data-state="restricted"]')).toHaveCount(2);
  await expect(page.getByText('Tenant execution filtering requires TENANTS_READ.')).toBeVisible();
 });
 test('PRB-008 Operator identities redact when users read permission missing',async({page})=>{
  await openPlatformRunbooks(page,{permissions:runbookPermissions.filter(p=>p!=='platform.users.read')});
  await expect(page.locator('.platform-runbooks__evidence-grid')).toContainText('Redacted');
  await expect(executions(page)).toContainText('Redacted');await expect(executions(page)).not.toContainText('operator@fixture.test');
 });
 test('PRB-009 Supporting links honor their independent read permissions',async({page})=>{
  await openPlatformRunbooks(page,{permissions:['platform.dashboard.read','platform.runbooks.read']});
  const links=page.locator('.platform-runbooks__supporting-grid');
  await expect(links).toContainText('Incidents restricted');await expect(links).toContainText('Maintenance restricted');
  await expect(links).toContainText('Tenant tasks restricted');await expect(links).toContainText('Audit restricted');
 });
 test('PRB-010 No write permission hides create and maintenance tools',async({page})=>{
  await openPlatformRunbooks(page,{permissions:withoutWrite});await expect(createPanel(page)).toHaveCount(0);
  await selectRunbook(page);await expect(detail(page).getByRole('button',{name:'Save definition'})).toHaveCount(0);
 });
 test('PRB-011 No execute permission hides starting and step mutation tools',async({page})=>{
  await openPlatformRunbooks(page,{permissions:withoutExecute});await expect(executionPanel(page)).toHaveCount(0);
  await executions(page).getByRole('button',{name:'Open execution'}).click();
  await expect(page.getByRole('button',{name:'Complete execution'})).toHaveCount(0);
 });
 test('PRB-012 Tenant picker GET requires both execution and tenant-read permissions',async({page})=>{
  const seen:string[]=[];await openPlatformRunbooks(page,{permissions:withoutExecute,onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenants')seen.push(p);}});
  await expect(executions(page).locator('.platform-runbooks__execution-card')).toHaveCount(1);expect(seen).toHaveLength(0);
 });
 test('PRB-013 Selector fetches tenant directory when both permissions exist',async({page})=>{
  const seen:string[]=[];await openPlatformRunbooks(page,{onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenants')seen.push(p);}});
  await expect(executionPanel(page).getByLabel('Tenant')).toContainText('Fixture Hotel');expect(seen.length).toBeGreaterThan(0);
 });
 test('PRB-014 Read-only mode still displays the registry and execution evidence',async({page})=>{
  await openPlatformRunbooks(page,{permissions:['platform.dashboard.read','platform.runbooks.read']});
  await expect(runbookCard(page,'Restore fixture service')).toBeVisible();await expect(executions(page).getByText('Synthetic operational drill')).toBeVisible();
 });
 test('PRB-015 No records show precise empty states, not external guarantees',async({page})=>{
  await openPlatformRunbooks(page,{runbooks:[],executions:[]});
  await expect(registry(page)).toContainText('No runbooks match this view.');
  await expect(executions(page)).toContainText('No execution records match this view.');
 });
});

test.describe('Platform Runbooks — Batch 67 URL filters and server paging (GENERATED_UNRUN)',()=>{
 test('PRB-016 Valid category URL adds category to runbook GET',async({page})=>{
  const seen:URLSearchParams[]=[];await openPlatformRunbooks(page,{query:'category=incident',onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/runbooks')seen.push(new URLSearchParams(q));}});
  await expect(runbookCard(page,'Restore fixture service')).toBeVisible();await expect(runbookCard(page,'Inspect fixture invoice')).toHaveCount(0);
  expect(seen[0].get('category')).toBe('incident');
 });
 test('PRB-017 Unsupported category URL blocks list requests',async({page})=>{
  const seen:string[]=[];await openPlatformRunbooks(page,{query:'category=unrecognized',onCall:(m,p)=>{if(m==='GET'&&p==='/platform/runbooks')seen.push(p);}});
  await expect(page.getByText('Invalid Runbooks URL filter')).toBeVisible();expect(seen).toHaveLength(0);
 });
 test('PRB-018 Invalid severity shows filter error without query traffic',async({page})=>{
  const seen:string[]=[];await openPlatformRunbooks(page,{query:'severity=catastrophic',onCall:(m,p)=>{if(m==='GET'&&p==='/platform/runbooks/executions')seen.push(p);}});
  await expect(page.getByRole('button',{name:'Clear invalid filters'})).toBeVisible();expect(seen).toHaveLength(0);
 });
 test('PRB-019 Active=true URL excludes inactive runbook rows',async({page})=>{
  await openPlatformRunbooks(page,{query:'active=true'});await expect(runbookCard(page,'Restore fixture service')).toBeVisible();
  await expect(runbookCard(page,'Inspect fixture invoice')).toHaveCount(0);
 });
 test('PRB-020 Active=false URL retains only inactive fixture runbooks',async({page})=>{
  await openPlatformRunbooks(page,{query:'active=false'});await expect(runbookCard(page,'Inspect fixture invoice')).toBeVisible();
  await expect(runbookCard(page,'Restore fixture service')).toHaveCount(0);
 });
 test('PRB-021 Active filter rejects unsupported booleans',async({page})=>{
  await openPlatformRunbooks(page,{query:'active=1'});await expect(page.getByText('Invalid Runbooks URL filter')).toBeVisible();
 });
 test('PRB-022 Search is URL-backed and passed to registry only',async({page})=>{
  const seen:{p:string;q:URLSearchParams}[]=[];await openPlatformRunbooks(page,{query:'search=invoice',onCall:(m,p,q)=>{if(m==='GET')seen.push({p,q:new URLSearchParams(q)});}});
  await expect(runbookCard(page,'Inspect fixture invoice')).toBeVisible();await expect(runbookCard(page,'Restore fixture service')).toHaveCount(0);
  expect(seen.find(x=>x.p==='/platform/runbooks')?.q.get('search')).toBe('invoice');
  expect(seen.find(x=>x.p==='/platform/runbooks/executions')?.q.has('search')).toBe(false);
 });
 test('PRB-023 Search over 200 URL characters is blocked rather than silently trimmed',async({page})=>{
  await openPlatformRunbooks(page,{query:'search='+encodeURIComponent('a'.repeat(201))});
  await expect(page.getByText('Invalid Runbooks URL filter')).toBeVisible();
 });
 test('PRB-024 Execution status URL maps to status API query',async({page})=>{
  const seen:URLSearchParams[]=[];await openPlatformRunbooks(page,{query:'execution_status=in_progress',onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/runbooks/executions')seen.push(new URLSearchParams(q));}});
  await expect(executions(page).getByText('Synthetic operational drill')).toBeVisible();expect(seen[0].get('status')).toBe('in_progress');
 });
 test('PRB-025 Invalid execution status blocks execution list GET',async({page})=>{
  const seen:string[]=[];await openPlatformRunbooks(page,{query:'execution_status=unknown',onCall:(m,p)=>{if(m==='GET'&&p==='/platform/runbooks/executions')seen.push(p);}});
  await expect(page.getByText('Invalid Runbooks URL filter')).toBeVisible();expect(seen).toHaveLength(0);
 });
 test('PRB-026 Valid tenant UUID passes through execution list filter',async({page})=>{
  const seen:URLSearchParams[]=[];await openPlatformRunbooks(page,{query:`tenant_id=${TENANT_A}`,onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/runbooks/executions')seen.push(new URLSearchParams(q));}});
  await expect(executions(page).getByText('Synthetic operational drill')).toBeVisible();expect(seen[0].get('tenant_id')).toBe(TENANT_A);
 });
 test('PRB-027 Invalid tenant identifier blocks both filtered lists',async({page})=>{
  await openPlatformRunbooks(page,{query:'tenant_id=invalid'});await expect(page.getByText('Invalid Runbooks URL filter')).toBeVisible();
 });
 test('PRB-028 Tenant UUID URL is invalid without TENANTS_READ',async({page})=>{
  await openPlatformRunbooks(page,{query:`tenant_id=${TENANT_A}`,permissions:runbookPermissions.filter(p=>p!=='platform.tenants.read')});
  await expect(page.getByText('Invalid Runbooks URL filter')).toBeVisible();
 });
 test('PRB-029 Clearing invalid filter preserves unrelated URL parameters',async({page})=>{
  await openPlatformRunbooks(page,{query:'category=bad&keep=fixture'});await page.getByRole('button',{name:'Clear invalid filters'}).click();
  await expect(page).toHaveURL(/keep=fixture/);await expect(page).not.toHaveURL(/category=bad/);
  await expect(runbookCard(page,'Restore fixture service')).toBeVisible();
 });
 test('PRB-030 Registry category selector writes URL and filters rows',async({page})=>{
  await openPlatformRunbooks(page);await registryFilters(page).getByLabel('Category').selectOption('billing');
  await expect(page).toHaveURL(/category=billing/);await expect(runbookCard(page,'Inspect fixture invoice')).toBeVisible();
 });
 test('PRB-031 Registry severity selector updates runbook request',async({page})=>{
  const seen:URLSearchParams[]=[];await openPlatformRunbooks(page,{onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/runbooks')seen.push(new URLSearchParams(q));}});
  await registryFilters(page).getByLabel('Severity').selectOption('critical');await expect(runbookCard(page,'Restore fixture service')).toBeVisible();
  expect(seen.some(q=>q.get('severity')==='critical')).toBe(true);
 });
 test('PRB-032 Runbook pagination uses offset 50 for second page',async({page})=>{
  const seen:URLSearchParams[]=[];await openPlatformRunbooks(page,{runbooks:syntheticRunbooks(52),onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/runbooks')seen.push(new URLSearchParams(q));}});
  await expect(registry(page).locator('.platform-runbooks__runbook-card')).toHaveCount(50);
  await registry(page).getByRole('button',{name:'Next'}).click();await expect(registry(page).locator('.platform-runbooks__runbook-card')).toHaveCount(2);
  expect(seen.some(q=>q.get('offset')==='50')).toBe(true);
 });
 test('PRB-033 Registry previous is disabled on first page',async({page})=>{
  await openPlatformRunbooks(page);await expect(registry(page).getByRole('button',{name:'Previous'})).toBeDisabled();
 });
 test('PRB-034 Registry next is disabled when no further page exists',async({page})=>{
  await openPlatformRunbooks(page);await expect(registry(page).getByRole('button',{name:'Next'})).toBeDisabled();
 });
 test('PRB-035 Execution pagination independently requests offset 50',async({page})=>{
  const seen:URLSearchParams[]=[];await openPlatformRunbooks(page,{executions:syntheticExecutions(51),onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/runbooks/executions')seen.push(new URLSearchParams(q));}});
  await expect(executions(page).locator('.platform-runbooks__execution-card')).toHaveCount(50);
  await executions(page).getByRole('button',{name:'Next'}).click();
  await expect(executions(page).locator('.platform-runbooks__execution-card')).toHaveCount(1);
  expect(seen.some(q=>q.get('offset')==='50')).toBe(true);
 });
});

test.describe('Platform Runbooks — Batch 67 registry detail and definition editing (GENERATED_UNRUN)',()=>{
 test('PRB-036 Runbook cards expose operational metadata only',async({page})=>{
  await openPlatformRunbooks(page);const row=runbookCard(page,'Restore fixture service');
  await expect(row).toContainText('2 steps');await expect(row).toContainText('0 executions');await expect(row).toContainText('Active');
 });
 test('PRB-037 Choosing a card requests its detail endpoint',async({page})=>{
  const seen:string[]=[];await openPlatformRunbooks(page,{onCall:(m,p)=>{if(m==='GET')seen.push(p);}});await selectRunbook(page);
  expect(seen).toContain(`/platform/runbooks/${RUNBOOK_A}`);
 });
 test('PRB-038 Detail displays ordered required and optional steps',async({page})=>{
  await openPlatformRunbooks(page);await selectRunbook(page);const steps=detail(page).locator('.platform-runbooks__ordered-list');
  await expect(steps.locator('li')).toHaveCount(2);await expect(steps).toContainText('Required');await expect(steps).toContainText('Optional');
 });
 test('PRB-039 Detail uses fallback for absent optional fields',async({page})=>{
  await openPlatformRunbooks(page);await runbookCard(page,'Inspect fixture invoice').click();
  await expect(detail(page)).toContainText('No description recorded.');await expect(detail(page)).toContainText('Not assigned');
 });
 test('PRB-040 Executed history locks structural edit fields',async({page})=>{
  await openPlatformRunbooks(page);await runbookCard(page,'Inspect fixture invoice').click();
  await expect(detail(page)).toContainText('Structural history lock is active');
  await expect(detail(page).getByLabel('Title',{exact:true})).toBeDisabled();
  await expect(detail(page).getByRole('button',{name:'Save steps'})).toBeDisabled();
 });
 test('PRB-041 Locked runbook keeps description and owner-role editable',async({page})=>{
  await openPlatformRunbooks(page);await runbookCard(page,'Inspect fixture invoice').click();
  await expect(detail(page).getByLabel('Description')).toBeEnabled();
  await expect(detail(page).getByLabel('Owner role')).toBeEnabled();
 });
 test('PRB-042 New definition cannot submit with empty title',async({page})=>{
  await openPlatformRunbooks(page);await expect(createPanel(page).getByRole('button',{name:'Create runbook'})).toBeDisabled();
 });
 test('PRB-043 Title alone is insufficient when first step has blank title',async({page})=>{
  await openPlatformRunbooks(page);await createPanel(page).getByLabel('Title',{exact:true}).fill('Valid heading');
  await expect(createPanel(page).getByRole('button',{name:'Create runbook'})).toBeDisabled();
 });
 test('PRB-044 Completed minimal draft enables create action',async({page})=>{
  await openPlatformRunbooks(page);await fillCreate(page);await expect(createPanel(page).getByRole('button',{name:'Create runbook'})).toBeEnabled();
 });
 test('PRB-045 Create POST trims free text and supplies ordered step fields',async({page})=>{
  const writes:any[]=[];await openPlatformRunbooks(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p==='/platform/runbooks')writes.push(b);}});
  const form=await fillCreate(page,'  New synthetic procedure  ');await form.getByLabel('Description').fill('  Fixture description  ');
  await form.getByLabel('Owner role').fill('  duty  ');await form.getByRole('button',{name:'Create runbook'}).click();
  await expect(page.getByText('Runbook created. The application record does not prove any external operational outcome.')).toBeVisible();
  expect(writes[0]).toMatchObject({title:'New synthetic procedure',description:'Fixture description',owner_role:'duty',steps:[{title:'Check readiness',is_required:true}]});
 });
 test('PRB-046 Create POST sends null for blank optional description and owner',async({page})=>{
  const writes:any[]=[];await openPlatformRunbooks(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p==='/platform/runbooks')writes.push(b);}});
  await fillCreate(page);await createPanel(page).getByRole('button',{name:'Create runbook'}).click();
  await expect.poll(()=>writes.length).toBe(1);expect(writes[0].description).toBeNull();expect(writes[0].owner_role).toBeNull();
 });
 test('PRB-047 Category selector contributes source-defined enum to create payload',async({page})=>{
  const writes:any[]=[];await openPlatformRunbooks(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p==='/platform/runbooks')writes.push(b);}});
  const form=await fillCreate(page);await form.getByLabel('Category').selectOption('security');
  await form.getByRole('button',{name:'Create runbook'}).click();await expect.poll(()=>writes.length).toBe(1);expect(writes[0].category).toBe('security');
 });
 test('PRB-048 Severity selector sends critical in request body',async({page})=>{
  const writes:any[]=[];await openPlatformRunbooks(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p==='/platform/runbooks')writes.push(b);}});
  const form=await fillCreate(page);await form.getByLabel('Severity').selectOption('critical');
  await form.getByRole('button',{name:'Create runbook'}).click();await expect.poll(()=>writes.length).toBe(1);expect(writes[0].severity).toBe('critical');
 });
 test('PRB-049 Inactive definition checkbox controls create request state',async({page})=>{
  const writes:any[]=[];await openPlatformRunbooks(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p==='/platform/runbooks')writes.push(b);}});
  const form=await fillCreate(page);await form.getByLabel('Active definition').uncheck();
  await form.getByRole('button',{name:'Create runbook'}).click();await expect.poll(()=>writes.length).toBe(1);expect(writes[0].is_active).toBe(false);
 });
 test('PRB-050 Adding an empty step disables create until it is titled',async({page})=>{
  await openPlatformRunbooks(page);const form=await fillCreate(page);await form.getByRole('button',{name:'Add step'}).click();
  await expect(form.getByRole('button',{name:'Create runbook'})).toBeDisabled();
  await form.getByLabel('Step 2 title').fill('Review record');await expect(form.getByRole('button',{name:'Create runbook'})).toBeEnabled();
 });
 test('PRB-051 Removing a step requires confirmation and cancellation retains it',async({page})=>{
  await openPlatformRunbooks(page);const form=await fillCreate(page);await form.getByRole('button',{name:'Add step'}).click();
  page.once('dialog',dialog=>dialog.dismiss());await form.getByRole('button',{name:'Remove step'}).last().click();
  await expect(form.getByLabel('Step 2 title')).toBeVisible();
 });
 test('PRB-052 Confirmation accepts removal of surplus draft step',async({page})=>{
  await openPlatformRunbooks(page);const form=await fillCreate(page);await form.getByRole('button',{name:'Add step'}).click();
  page.once('dialog',dialog=>dialog.accept());await form.getByRole('button',{name:'Remove step'}).last().click();
  await expect(form.getByLabel('Step 2 title')).toHaveCount(0);
 });
 test('PRB-053 Definition editor saves trimmed description without replacing steps',async({page})=>{
  const writes:any[]=[];await openPlatformRunbooks(page,{onCall:(m,p,_q,b)=>{if(m==='PATCH'&&p===`/platform/runbooks/${RUNBOOK_A}`)writes.push(b);}});
  await selectRunbook(page);await detail(page).getByLabel('Description').fill('  Revised explanation  ');
  await detail(page).getByRole('button',{name:'Save definition'}).click();await expect.poll(()=>writes.length).toBe(1);
  expect(writes[0].description).toBe('Revised explanation');expect(writes[0]).not.toHaveProperty('steps');
 });
 test('PRB-054 Structural lock PATCH omits title, severity and category',async({page})=>{
  const writes:any[]=[];await openPlatformRunbooks(page,{onCall:(m,p,_q,b)=>{if(m==='PATCH'&&p===`/platform/runbooks/${RUNBOOK_B}`)writes.push(b);}});
  await runbookCard(page,'Inspect fixture invoice').click();await detail(page).getByLabel('Description').fill('Historical memo');
  await detail(page).getByRole('button',{name:'Save definition'}).click();await expect.poll(()=>writes.length).toBe(1);
  for(const key of ['title','severity','category','steps'])expect(writes[0]).not.toHaveProperty(key);
 });
 test('PRB-055 Unlocked steps editor uses dedicated PUT endpoint',async({page})=>{
  const writes:any[]=[];await openPlatformRunbooks(page,{onCall:(m,p,_q,b)=>{if(m==='PUT'&&p===`/platform/runbooks/${RUNBOOK_A}/steps`)writes.push(b);}});
  await selectRunbook(page);await detail(page).getByRole('button',{name:'Save steps'}).click();await expect.poll(()=>writes.length).toBe(1);
  expect(writes[0].steps).toHaveLength(2);expect(writes[0].steps[0].title).toBe(runbookSteps[0].title);
 });
});

test.describe('Platform Runbooks — Batch 67 execution registry and start (GENERATED_UNRUN)',()=>{
 test('PRB-056 Only active definitions appear in the execution start picker',async({page})=>{
  await openPlatformRunbooks(page);const picker=executionPanel(page).getByLabel('Runbook');
  await expect(picker.locator('option')).toContainText(['Select active runbook','Restore fixture service']);
  await expect(picker).not.toContainText('Inspect fixture invoice');
 });
 test('PRB-057 Start is disabled until runbook and nonblank reason are selected',async({page})=>{
  await openPlatformRunbooks(page);const form=executionPanel(page);const start=form.getByRole('button',{name:'Start execution'});
  await expect(start).toBeDisabled();await form.getByLabel('Runbook').selectOption(RUNBOOK_A);await expect(start).toBeDisabled();
  await form.getByLabel('Reason / ticket context').fill('Fixture check');await expect(start).toBeEnabled();
 });
 test('PRB-058 Start payload includes selected runbook, tenant and trimmed reason',async({page})=>{
  const posts:any[]=[];await openPlatformRunbooks(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p==='/platform/runbooks/executions')posts.push(b);}});
  const form=executionPanel(page);await form.getByLabel('Runbook').selectOption(RUNBOOK_A);
  await form.getByLabel('Tenant').selectOption(TENANT_A);await form.getByLabel('Reason / ticket context').fill('  Simulated drill  ');
  await form.getByRole('button',{name:'Start execution'}).click();await expect.poll(()=>posts.length).toBe(1);
  expect(posts[0]).toMatchObject({runbook_id:RUNBOOK_A,tenant_id:TENANT_A,reason:'Simulated drill'});
 });
 test('PRB-059 Without linked-source read rights start payload nulls restricted IDs',async({page})=>{
  const posts:any[]=[];await openPlatformRunbooks(page,{permissions:runbookPermissions.filter(p=>!['platform.tenants.read','platform.incidents.read'].includes(p)),onCall:(m,p,_q,b)=>{if(m==='POST'&&p==='/platform/runbooks/executions')posts.push(b);}});
  const form=executionPanel(page);await form.getByLabel('Runbook').selectOption(RUNBOOK_A);
  await form.getByLabel('Reason / ticket context').fill('No linked source');
  await form.getByRole('button',{name:'Start execution'}).click();await expect.poll(()=>posts.length).toBe(1);
  expect(posts[0]).toMatchObject({tenant_id:null,incident_id:null,task_id:null});
 });
 test('PRB-060 Malformed incident identifier blocks start and shows validation',async({page})=>{
  await openPlatformRunbooks(page);const form=executionPanel(page);await form.getByLabel('Runbook').selectOption(RUNBOOK_A);
  await form.getByLabel('Reason / ticket context').fill('Fixture check');await form.getByLabel('Incident ID').fill('not-a-uuid');
  await expect(form.getByRole('button',{name:'Start execution'})).toBeDisabled();await expect(form).toContainText('Incident/task references must be valid UUIDs.');
 });
 test('PRB-061 Malformed tenant task identifier blocks start',async({page})=>{
  await openPlatformRunbooks(page);const form=executionPanel(page);await form.getByLabel('Runbook').selectOption(RUNBOOK_A);
  await form.getByLabel('Reason / ticket context').fill('Fixture check');await form.getByLabel('Tenant task ID').fill('bad');
  await expect(form.getByRole('button',{name:'Start execution'})).toBeDisabled();
 });
 test('PRB-062 Valid linked incident and task UUIDs are included in POST',async({page})=>{
  const posts:any[]=[];await openPlatformRunbooks(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p==='/platform/runbooks/executions')posts.push(b);}});
  const form=executionPanel(page);await form.getByLabel('Runbook').selectOption(RUNBOOK_A);
  await form.getByLabel('Reason / ticket context').fill('Fixture check');await form.getByLabel('Incident ID').fill(INCIDENT_A);
  await form.getByLabel('Tenant task ID').fill(TASK_A);await form.getByRole('button',{name:'Start execution'}).click();
  await expect.poll(()=>posts.length).toBe(1);expect(posts[0]).toMatchObject({incident_id:INCIDENT_A,task_id:TASK_A});
 });
 test('PRB-063 Execution registry marks in-progress records as application states',async({page})=>{
  await openPlatformRunbooks(page);await expect(executions(page).locator('.platform-runbooks__execution-card')).toHaveCount(1);
  await expect(executions(page).locator('.platform-runbooks__execution-card')).toContainText('In progress');
  await expect(executions(page)).toContainText('Synthetic operational drill');
 });
 test('PRB-064 Execution detail fetch displays step status and linked evidence',async({page})=>{
  const seen:string[]=[];await openPlatformRunbooks(page,{onCall:(m,p)=>{if(m==='GET')seen.push(p);}});
  await executions(page).getByRole('button',{name:'Open execution'}).click();
  await expect(page.getByRole('heading',{name:'Execution detail'})).toBeVisible();
  await expect(page.locator('.platform-runbooks__execution-step')).toHaveCount(2);
  expect(seen).toContain(`/platform/runbooks/executions/${EXECUTION_A}`);
 });
 test('PRB-065 Execution identity evidence redacts without users-read permission',async({page})=>{
  await openPlatformRunbooks(page,{permissions:runbookPermissions.filter(p=>p!=='platform.users.read')});
  await executions(page).getByRole('button',{name:'Open execution'}).click();
  await expect(page.locator('.platform-runbooks__detail-metrics').last()).toContainText('Redacted');
  await expect(page.locator('.platform-runbooks')).not.toContainText('operator@fixture.test');
 });
});
