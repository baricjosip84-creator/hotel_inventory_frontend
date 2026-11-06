/** Batch 68 — Phase 1 source-grounded Playwright scenarios, GENERATED_UNRUN.
 * All endpoints are intercepted with synthetic fixture responses. Browser assertions
 * cover displayed UI/requests only; NOT backend ACLs, DB transactions, external actions,
 * incident recovery, cross-tenant isolation or real operational completion.
 * Source: frontend/src/pages/PlatformRunbooksPage.tsx;
 * backend/src/routes/platform/runbooks.js; backend/src/services/platformRunbooksService.js.
 */
import { test, expect, type Page } from '@playwright/test';
import {
  openPlatformRunbooks, runbookPermissions, runbooksSeed, runbookSteps,
  executionSeed, RUNBOOK_A, EXECUTION_A, STEP_A, STEP_B,
  TENANT_A, INCIDENT_A, TASK_A, syntheticRunbooks, syntheticExecutions
} from '../../../support/platformRunbooksFixture';

const endpoint = `/platform/runbooks/executions/${EXECUTION_A}`;
const stepEndpoint = (step: string) => `${endpoint}/steps/${step}`;
const errors = (message: string) => ({ status: 503, json: { message, error: message } });
const section = (page: Page, title: string) => page.locator('.platform-runbooks__section').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
const execList = (page: Page) => section(page, 'Execution registry');
const execDetail = (page: Page) => section(page, 'Execution detail');
const bookList = (page: Page) => section(page, 'Runbook registry');
const bookDetail = (page: Page) => section(page, 'Runbook detail');
const createBook = (page: Page) => section(page, 'Create runbook');
const startForm = (page: Page) => section(page, 'Start runbook execution');
const stepRow = (page: Page, index = 0) => execDetail(page).locator('.platform-runbooks__execution-step').nth(index);
const closePanel = (page: Page) => execDetail(page).locator('.platform-runbooks__close-panel');
const without = (...names: string[]) => runbookPermissions.filter(p => !names.includes(p));
async function openExecution(page: Page) {
  await execList(page).getByRole('button', { name: 'Open execution' }).first().click();
  await expect(execDetail(page).getByRole('heading', { name: 'Execution detail' })).toBeVisible();
}
async function openBook(page: Page, title = 'Restore fixture service') {
  await bookList(page).locator('.platform-runbooks__runbook-card').filter({ hasText: title }).click();
  await expect(bookDetail(page).getByText(title, { exact: true }).first()).toBeVisible();
}
async function fillStart(page: Page) {
  const form = startForm(page);
  await form.getByLabel('Runbook').selectOption(RUNBOOK_A);
  await form.getByLabel('Reason / ticket context').fill('Synthetic maintenance exercise');
  return form;
}

// Execution detail request lifecycle: a failed sub-query must not imply all lists failed.
test.describe('Platform Runbooks — execution detail recovery (Batch 68 GENERATED_UNRUN)', () => {
  test('PRB-066 Execution detail error shows retry without losing registry', async ({page}) => {
    await openPlatformRunbooks(page, { responses: { [`GET ${endpoint}`]: errors('Synthetic detail unavailable') } });
    await openExecution(page);
    await expect(execDetail(page).getByText('Execution detail unavailable')).toBeVisible();
    await expect(execDetail(page).getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(bookList(page).getByText('Restore fixture service')).toBeVisible();
  });
  test('PRB-067 Retry execution detail calls the selected execution endpoint again', async ({page}) => {
    let fail = true, calls = 0;
    await openPlatformRunbooks(page, { respond: (method, path) => {
      if (method === 'GET' && path === endpoint) { calls++; return fail ? errors('Synthetic detail down') : {json: executionSeed}; }
    }});
    await openExecution(page);
    await expect(execDetail(page).getByRole('button', { name: 'Retry' })).toBeVisible();
    const before = calls; fail = false;
    await execDetail(page).getByRole('button', { name: 'Retry' }).click();
    await expect(execDetail(page)).toContainText('Synthetic operational drill');
    expect(calls).toBeGreaterThan(before);
  });
  test('PRB-068 Execution detail with prior data retains stale snapshot warning', async ({page}) => {
    let fail = false;
    await openPlatformRunbooks(page, { respond: (m,p) => m==='GET'&&p===endpoint ? (fail?errors('Synthetic detail refresh failed'):{json:executionSeed}) : undefined });
    await openExecution(page); await expect(stepRow(page,0)).toContainText('Check synthetic signal');
    fail = true; await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(execDetail(page)).toContainText('Showing the last successful execution detail snapshot');
    await expect(stepRow(page,0)).toContainText('Check synthetic signal');
  });
  test('PRB-069 Execution detail cancel action is hidden for completed execution', async ({page}) => {
    await openPlatformRunbooks(page,{executions:[{...executionSeed,status:'completed',completed_at:'2026-11-03T14:00:00Z'}]});
    await openExecution(page); await expect(execDetail(page)).toContainText('Completed');
    await expect(execDetail(page).getByRole('button',{name:'Cancel execution'})).toHaveCount(0);
  });
  test('PRB-070 Execution detail step editor is hidden for cancelled execution', async ({page}) => {
    await openPlatformRunbooks(page,{executions:[{...executionSeed,status:'cancelled'}]});await openExecution(page);
    await expect(execDetail(page)).toContainText('Cancelled');
    await expect(execDetail(page).locator('.platform-runbooks__step-actions')).toHaveCount(0);
  });
});

// A mock PATCH only proves frontend request construction and response rendering.
test.describe('Platform Runbooks — step status and evidence (Batch 68 GENERATED_UNRUN)', () => {
  test('PRB-071 Execution step Done issues PATCH with status done and trimmed notes', async ({page}) => {
    const writes: any[]=[];
    await openPlatformRunbooks(page,{onCall:(m,p,_q,b)=>{if(m==='PATCH'&&p===stepEndpoint(STEP_A))writes.push(b);}});await openExecution(page);
    await stepRow(page).getByPlaceholder('Step note').fill('  Synthetic check passed  ');
    await stepRow(page).getByRole('button',{name:'Done'}).click();
    await expect.poll(()=>writes.length).toBe(1);
    expect(writes[0]).toEqual({status:'done',notes:'Synthetic check passed'});
  });
  test('PRB-072 Execution step Skip issues PATCH with status skipped', async ({page}) => {
    const writes:any[]=[];await openPlatformRunbooks(page,{onCall:(m,p,_q,b)=>{if(m==='PATCH'&&p===stepEndpoint(STEP_B))writes.push(b);}});
    await openExecution(page);await stepRow(page,1).getByRole('button',{name:'Skip'}).click();
    await expect.poll(()=>writes.length).toBe(1);expect(writes[0].status).toBe('skipped');
  });
  test('PRB-073 Execution step Reset issues PATCH with status pending', async ({page}) => {
    const writes:any[]=[];await openPlatformRunbooks(page,{onCall:(m,p,_q,b)=>{if(m==='PATCH'&&p===stepEndpoint(STEP_A))writes.push(b);}});
    await openExecution(page);await stepRow(page).getByRole('button',{name:'Reset'}).click();
    await expect.poll(()=>writes.length).toBe(1);expect(writes[0]).toEqual({status:'pending',notes:null});
  });
  test('PRB-074 Execution step Save note preserves current step status', async ({page}) => {
    const writes:any[]=[];const doneExecution={...executionSeed,steps:executionSeed.steps.map((s,i)=>i===0?{...s,status:'done',notes:'Original'}:s)};
    await openPlatformRunbooks(page,{executions:[doneExecution],onCall:(m,p,_q,b)=>{if(m==='PATCH'&&p===stepEndpoint(STEP_A))writes.push(b);}});
    await openExecution(page);await stepRow(page).getByPlaceholder('Step note').fill('  Evidence only  ');
    await stepRow(page).getByRole('button',{name:'Save note'}).click();
    await expect.poll(()=>writes.length).toBe(1);expect(writes[0]).toMatchObject({status:'done',notes:'Evidence only'});
  });
  test('PRB-075 Completed step displays timestamp from API evidence', async ({page}) => {
    const dated={...executionSeed,steps:executionSeed.steps.map((s,i)=>i===0?{...s,status:'done',completed_at:'2026-11-03T13:45:00Z'}:s)};
    await openPlatformRunbooks(page,{executions:[dated]});await openExecution(page);
    await expect(stepRow(page)).toContainText('completed');await expect(stepRow(page)).toContainText('Done');
    await expect(stepRow(page)).not.toContainText('Not recorded');
  });
  test('PRB-076 Optional step can be skipped in application checklist', async ({page}) => {
    const optional={...executionSeed,steps:executionSeed.steps.map((s,i)=>i===1?{...s,status:'skipped'}:s)};
    await openPlatformRunbooks(page,{executions:[optional]});await openExecution(page);
    await expect(stepRow(page,1)).toContainText('Optional');await expect(stepRow(page,1)).toContainText('Skipped');
  });
  test('PRB-077 Required step skip remains distinguishable from done state', async ({page}) => {
    const required={...executionSeed,steps:executionSeed.steps.map((s,i)=>i===0?{...s,status:'skipped'}:s)};
    await openPlatformRunbooks(page,{executions:[required]});await openExecution(page);
    await expect(stepRow(page,0)).toContainText('Required');await expect(stepRow(page,0)).toContainText('Skipped');
    await expect(stepRow(page,0)).not.toContainText('Done');
  });
  test('PRB-078 Mutation step failure displays visible error feedback', async ({page}) => {
    await openPlatformRunbooks(page,{responses:{[`PATCH ${stepEndpoint(STEP_A)}`]:{status:409,json:{message:'Synthetic step conflict'}}}});
    await openExecution(page);await stepRow(page).getByRole('button',{name:'Done'}).click();
    await expect(page.locator('.platform-runbooks__warning')).toContainText('Mutation failed:');
  });
  test('PRB-079 Step mutation pending state disables concurrent actions', async ({page}) => {
    let release:(value:{json:unknown})=>void=()=>undefined;
    await openPlatformRunbooks(page,{asyncRespond:async (m,p) => m==='PATCH'&&p===stepEndpoint(STEP_A) ? await new Promise<{json:unknown}>(resolve=>{release=resolve;}) : undefined});
    await openExecution(page);await stepRow(page).getByRole('button',{name:'Done'}).click();
    await expect(stepRow(page).getByRole('button',{name:'Skip'})).toBeDisabled();
    await expect(stepRow(page).getByRole('button',{name:'Reset'})).toBeDisabled();
    release({json:executionSeed});
  });
  test('PRB-080 Completed execution has no live step mutation controls', async ({page}) => {
    await openPlatformRunbooks(page,{executions:[{...executionSeed,status:'completed'}]});await openExecution(page);
    await expect(execDetail(page).locator('.platform-runbooks__execution-step')).toHaveCount(2);
    await expect(execDetail(page).locator('.platform-runbooks__step-actions')).toHaveCount(0);
  });
});

test.describe('Platform Runbooks — execution closure and confirmations (Batch 68 GENERATED_UNRUN)', () => {
  test('PRB-081 Complete execution opens explicit browser confirmation', async ({page}) => {
    await openPlatformRunbooks(page);await openExecution(page);
    let question='';page.once('dialog',async dialog=>{question=dialog.message();await dialog.dismiss();});
    await closePanel(page).getByRole('button',{name:'Complete execution'}).click();
    expect(question).toContain('Required steps must already be done.');
  });
  test('PRB-082 Dismissing completion confirmation sends no POST', async ({page}) => {
    const calls:string[]=[];await openPlatformRunbooks(page,{onCall:(m,p)=>{if(m==='POST'&&p===`${endpoint}/complete`)calls.push(p);}});
    await openExecution(page);page.once('dialog',d=>d.dismiss());
    await closePanel(page).getByRole('button',{name:'Complete execution'}).click();expect(calls).toHaveLength(0);
  });
  test('PRB-083 Accepting completion confirmation sends complete POST with notes', async ({page}) => {
    const writes:any[]=[];await openPlatformRunbooks(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p===`${endpoint}/complete`)writes.push(b);}});
    await openExecution(page);await closePanel(page).getByLabel('Execution close notes').fill('  Checklist marked complete  ');
    page.once('dialog',d=>d.accept());await closePanel(page).getByRole('button',{name:'Complete execution'}).click();
    await expect.poll(()=>writes.length).toBe(1);expect(writes[0]).toEqual({notes:'Checklist marked complete'});
  });
  test('PRB-084 Completion request failure displays mutation warning', async ({page}) => {
    await openPlatformRunbooks(page,{responses:{[`POST ${endpoint}/complete`]:{status:400,json:{message:'Required steps remain open'}}}});
    await openExecution(page);page.once('dialog',d=>d.accept());
    await closePanel(page).getByRole('button',{name:'Complete execution'}).click();
    await expect(page.locator('.platform-runbooks__warning')).toContainText('Mutation failed:');
    await expect(execDetail(page).locator('.platform-runbooks__step-actions')).toHaveCount(2);
  });
  test('PRB-085 Mocked completion response updates application feedback only', async ({page}) => {
    await openPlatformRunbooks(page);await openExecution(page);page.once('dialog',d=>d.accept());
    await closePanel(page).getByRole('button',{name:'Complete execution'}).click();
    await expect(page.locator('.platform-runbooks__success')).toContainText('Execution marked complete in the application.');
    await expect(page.locator('.platform-runbooks__truth-note')).toContainText('external outcome');
  });
  test('PRB-086 Cancel execution opens separate confirmation prompt', async ({page}) => {
    await openPlatformRunbooks(page);await openExecution(page);
    let prompt='';page.once('dialog',async d=>{prompt=d.message();await d.dismiss();});
    await closePanel(page).getByRole('button',{name:'Cancel execution'}).click();
    expect(prompt).toBe('Cancel this execution in the application?');
  });
  test('PRB-087 Dismissing cancellation confirmation sends no POST', async ({page}) => {
    const calls:any[]=[];await openPlatformRunbooks(page,{onCall:(m,p)=>{if(m==='POST'&&p===`${endpoint}/cancel`)calls.push(p);}});
    await openExecution(page);page.once('dialog',d=>d.dismiss());await closePanel(page).getByRole('button',{name:'Cancel execution'}).click();
    expect(calls).toHaveLength(0);
  });
  test('PRB-088 Accepting cancellation sends cancel POST and optional notes', async ({page}) => {
    const writes:any[]=[];await openPlatformRunbooks(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p===`${endpoint}/cancel`)writes.push(b);}});
    await openExecution(page);await closePanel(page).getByLabel('Execution close notes').fill('  Synthetic rollback  ');
    page.once('dialog',d=>d.accept());await closePanel(page).getByRole('button',{name:'Cancel execution'}).click();
    await expect.poll(()=>writes.length).toBe(1);expect(writes[0]).toEqual({notes:'Synthetic rollback'});
  });
  test('PRB-089 Cancelled execution displays cancellation state from fixture', async ({page}) => {
    await openPlatformRunbooks(page,{executions:[{...executionSeed,status:'cancelled',notes:'Cancelled fixture'}]});await openExecution(page);
    await expect(execDetail(page).locator('.platform-runbooks__posture').first()).toContainText('Cancelled');
    await expect(closePanel(page)).toHaveCount(0);
  });
  test('PRB-090 Completion with pending required step may be rejected by API', async ({page}) => {
    const calls:string[]=[];await openPlatformRunbooks(page,{
      onCall:(m,p)=>{if(m==='POST'&&p===`${endpoint}/complete`)calls.push(p);},
      responses:{[`POST ${endpoint}/complete`]:{status:400,json:{code:'PLATFORM_RUNBOOK_REQUIRED_STEPS_OPEN',message:'All required runbook steps must be done before completion'}}}
    });
    await openExecution(page);await expect(stepRow(page,0)).toContainText('Required');
    page.once('dialog',d=>d.accept());await closePanel(page).getByRole('button',{name:'Complete execution'}).click();
    await expect.poll(()=>calls.length).toBe(1);await expect(page.locator('.platform-runbooks__warning')).toContainText('Mutation failed:');
  });
});

test.describe('Platform Runbooks — mutation rejection and definition history (Batch 68 GENERATED_UNRUN)', () => {
  test('PRB-091 Execution start API rejection retains entered draft for retry', async ({page}) => {
    await openPlatformRunbooks(page,{responses:{'POST /platform/runbooks/executions':{status:409,json:{message:'Synthetic execution conflict'}}}});
    const form=await fillStart(page);await form.getByRole('button',{name:'Start execution'}).click();
    await expect(page.locator('.platform-runbooks__warning')).toContainText('Mutation failed:');
    await expect(form.getByLabel('Reason / ticket context')).toHaveValue('Synthetic maintenance exercise');
    await expect(form.getByLabel('Runbook')).toHaveValue(RUNBOOK_A);
  });
  test('PRB-092 Definition creation API rejection displays error and retains draft', async ({page}) => {
    await openPlatformRunbooks(page,{responses:{'POST /platform/runbooks':{status:400,json:{message:'Synthetic invalid title'}}}});
    const form=createBook(page);await form.getByLabel('Title',{exact:true}).fill('Fixture rejected procedure');
    await form.getByLabel('Step 1 title').fill('Check status');await form.getByRole('button',{name:'Create runbook'}).click();
    await expect(page.locator('.platform-runbooks__warning')).toContainText('Mutation failed:');
    await expect(form.getByLabel('Title',{exact:true})).toHaveValue('Fixture rejected procedure');
  });
  test('PRB-093 Definition PATCH API rejection preserves editing context', async ({page}) => {
    await openPlatformRunbooks(page,{responses:{[`PATCH /platform/runbooks/${RUNBOOK_A}`]:{status:409,json:{message:'Synthetic definition conflict'}}}});
    await openBook(page);const edit=bookDetail(page);await edit.getByLabel('Description').fill('Unsaved synthetic evidence');
    await edit.getByRole('button',{name:'Save definition'}).click();
    await expect(page.locator('.platform-runbooks__warning')).toContainText('Mutation failed:');
    await expect(edit.getByLabel('Description')).toHaveValue('Unsaved synthetic evidence');
  });
  test('PRB-094 Step replacement PUT API conflict displays visible error', async ({page}) => {
    await openPlatformRunbooks(page,{responses:{[`PUT /platform/runbooks/${RUNBOOK_A}/steps`]:{status:409,json:{message:'Synthetic history lock'}}}});
    await openBook(page);await bookDetail(page).getByRole('button',{name:'Save steps'}).click();
    await expect(page.locator('.platform-runbooks__warning')).toContainText('Mutation failed:');
  });
  test('PRB-095 Definition structural history lock only applies when execution_count positive', async ({page}) => {
    await openPlatformRunbooks(page,{runbooks:[{...runbooksSeed[0],execution_count:0},{...runbooksSeed[1],execution_count:3}]});
    await openBook(page);await expect(bookDetail(page).getByLabel('Title',{exact:true})).toBeEnabled();
    await openBook(page,'Inspect fixture invoice');
    await expect(bookDetail(page).getByLabel('Title',{exact:true})).toBeDisabled();
    await expect(bookDetail(page)).toContainText('Structural history lock is active');
  });
  test('PRB-096 Registry detail initial fetch failure shows dedicated retry', async ({page}) => {
    await openPlatformRunbooks(page,{responses:{[`GET /platform/runbooks/${RUNBOOK_A}`]:errors('Synthetic runbook detail offline')}});
    await bookList(page).locator('.platform-runbooks__runbook-card').first().click();
    await expect(bookDetail(page)).toContainText('Runbook detail unavailable');
    await expect(bookDetail(page).getByRole('button',{name:'Retry'})).toBeVisible();
  });
  test('PRB-097 Registry detail recovery refreshes selected details', async ({page}) => {
    let failing=true, attempts=0;
    await openPlatformRunbooks(page,{respond:(m,p)=>{
      if(m==='GET'&&p===`/platform/runbooks/${RUNBOOK_A}`){attempts++;return failing?errors('Transient fixture detail'):{json:{...runbooksSeed[0],steps:runbookSteps}};}
    }});
    await bookList(page).locator('.platform-runbooks__runbook-card').first().click();
    await expect(bookDetail(page).getByRole('button',{name:'Retry'})).toBeVisible();const before=attempts;failing=false;
    await bookDetail(page).getByRole('button',{name:'Retry'}).click();
    await expect(bookDetail(page)).toContainText('Synthetic response procedure');expect(attempts).toBeGreaterThan(before);
  });
  test('PRB-098 Registry detail refresh failure retains last successful snapshot', async ({page}) => {
    let failing=false;
    await openPlatformRunbooks(page,{respond:(m,p)=>m==='GET'&&p===`/platform/runbooks/${RUNBOOK_A}`?(failing?errors('Synthetic detail refresh offline'):{json:{...runbooksSeed[0],steps:runbookSteps}}):undefined});
    await openBook(page);failing=true;await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await expect(bookDetail(page)).toContainText('Showing the last successful runbook detail snapshot');
    await expect(bookDetail(page)).toContainText('Synthetic response procedure');
  });
});

test.describe('Platform Runbooks — list and summary request failure recovery (Batch 68 GENERATED_UNRUN)', () => {
  test('PRB-099 Registry list initial failure shows blocking unavailable panel', async ({page}) => {
    await openPlatformRunbooks(page,{responses:{'GET /platform/runbooks':errors('Synthetic registry load failed')}});
    await expect(page.getByText('Runbook data is unavailable')).toBeVisible();
    await expect(page.getByRole('button',{name:'Retry'})).toBeVisible();
  });
  test('PRB-100 Execution list initial failure shows blocking unavailable panel', async ({page}) => {
    await openPlatformRunbooks(page,{responses:{'GET /platform/runbooks/executions':errors('Synthetic execution list failed')}});
    await expect(page.getByText('Runbook data is unavailable')).toBeVisible();
    await expect(page.getByRole('button',{name:'Retry'})).toBeVisible();
  });
  test('PRB-101 Summary initial failure shows blocking unavailable panel', async ({page}) => {
    await openPlatformRunbooks(page,{responses:{'GET /platform/runbooks/summary':errors('Synthetic summary unavailable')}});
    await expect(page.getByText('Runbook data is unavailable')).toBeVisible();
    await expect(page.getByRole('button',{name:'Retry'})).toBeVisible();
  });
  test('PRB-102 Refresh button retries initial failures across three sources', async ({page}) => {
    let failing=true;const seen:string[]=[];
    await openPlatformRunbooks(page,{respond:(m,p)=>{
      if(m==='GET'&&['/platform/runbooks','/platform/runbooks/executions','/platform/runbooks/summary'].includes(p) && failing)return errors('Synthetic initial unavailability');
    },onCall:(m,p)=>{if(m==='GET')seen.push(p);}});
    await expect(page.getByText('Runbook data is unavailable')).toBeVisible();
    const before=seen.length;failing=false;await page.getByRole('button',{name:'Retry'}).click();
    await expect(bookList(page).getByText('Restore fixture service')).toBeVisible();
    await expect(execList(page)).toContainText('Synthetic operational drill');
    const after=seen.slice(before);for(const p of ['/platform/runbooks','/platform/runbooks/executions','/platform/runbooks/summary'])expect(after).toContain(p);
  });
  test('PRB-103 Refresh failed with cached list renders stale snapshot warning', async ({page}) => {
    let failing=false;
    await openPlatformRunbooks(page,{respond:(m,p)=>m==='GET'&&p==='/platform/runbooks'&&failing?errors('Synthetic list refresh error'):undefined});
    await expect(bookList(page)).toContainText('Restore fixture service');failing=true;
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await expect(page.locator('.platform-runbooks__warning')).toContainText('Showing the last successful Runbooks snapshot');
    await expect(bookList(page)).toContainText('Restore fixture service');
  });
  test('PRB-104 Tenant selector failure leaves platform-wide executions readable', async ({page}) => {
    await openPlatformRunbooks(page,{responses:{'GET /platform/tenants':errors('Synthetic tenant selector offline')}});
    await expect(page.locator('.platform-runbooks__warning')).toContainText('Tenant selector is unavailable');
    await expect(execList(page)).toContainText('Synthetic operational drill');
    await expect(page.getByText('All authorized evidence')).toBeVisible();
  });
  test('PRB-105 Platform registry refresh button is disabled during pending fetch', async ({page}) => {
    let hold=false,release:(r:{json:unknown})=>void=()=>undefined;
    await openPlatformRunbooks(page,{asyncRespond:async (m,p)=>m==='GET'&&p==='/platform/runbooks/summary'&&hold ? await new Promise<{json:unknown}>(resolve=>{release=resolve;}) : undefined});
    await expect(bookList(page)).toContainText('Restore fixture service');hold=true;
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await expect(page.getByRole('button',{name:'Refreshing…'})).toBeDisabled();
    release({json:{active_runbooks:1,active_critical_runbooks:1,active_executions:1,by_category:[]}});
  });
  test('PRB-106 Tenant selector failure message retains read-only evidence state', async ({page}) => {
    await openPlatformRunbooks(page,{permissions:without('platform.runbooks.write'),responses:{'GET /platform/tenants':errors('Synthetic tenant service offline')}});
    await expect(execList(page)).toContainText('Synthetic operational drill');
    await expect(createBook(page)).toHaveCount(0);await expect(page.locator('.platform-runbooks__warning')).toContainText('Tenant selector is unavailable');
    await expect(page.locator('.platform-runbooks__evidence-grid')).toContainText('Tenant evidence');
  });
});

test.describe('Platform Runbooks — filter changes and independent paging (Batch 68 GENERATED_UNRUN)', () => {
  test('PRB-107 Registry pagination filter change resets runbook offset', async ({page}) => {
    const seen:URLSearchParams[]=[];
    await openPlatformRunbooks(page,{runbooks:syntheticRunbooks(52),onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/runbooks')seen.push(new URLSearchParams(q));}});
    await expect(bookList(page).locator('.platform-runbooks__runbook-card')).toHaveCount(50);
    await bookList(page).getByRole('button',{name:'Next'}).click();await expect(bookList(page)).toContainText('Page 2');
    await page.locator('.platform-runbooks__filter-grid').first().getByLabel('Severity').selectOption('critical');
    await expect(bookList(page)).toContainText('Page 1');
    expect(seen.some(q=>q.get('offset')==='50')).toBe(true);
    await expect.poll(()=>seen.some(q=>q.get('severity')==='critical'&&q.get('offset')==='0')).toBe(true);
  });
  test('PRB-108 Execution status change resets execution offset', async ({page}) => {
    const seen:URLSearchParams[]=[];
    await openPlatformRunbooks(page,{executions:syntheticExecutions(51),onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/runbooks/executions')seen.push(new URLSearchParams(q));}});
    await execList(page).getByRole('button',{name:'Next'}).click();await expect(execList(page)).toContainText('Page 2');
    await page.locator('.platform-runbooks__filter-grid--executions').getByLabel('Execution status').selectOption('in_progress');
    await expect(execList(page)).toContainText('Page 1');
    await expect.poll(()=>seen.some(q=>q.get('offset')==='0'&&q.get('status')==='in_progress')).toBe(true);
  });
  test('PRB-109 Tenant scope change resets execution offset independently', async ({page}) => {
    const seen:URLSearchParams[]=[];
    await openPlatformRunbooks(page,{executions:syntheticExecutions(51),onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/runbooks/executions')seen.push(new URLSearchParams(q));}});
    await execList(page).getByRole('button',{name:'Next'}).click();await expect(execList(page)).toContainText('Page 2');
    await page.locator('.platform-runbooks__filter-grid--executions').getByLabel('Execution tenant').selectOption(TENANT_A);
    await expect(execList(page)).toContainText('Page 1');
    await expect.poll(()=>seen.some(q=>q.get('offset')==='0'&&q.get('tenant_id')===TENANT_A)).toBe(true);
    await expect(bookList(page)).toContainText('Page 1');
  });
  test('PRB-110 Execution status and runbook filter preserve other URL state', async ({page}) => {
    await openPlatformRunbooks(page,{query:'category=incident&keep=fixture'});
    await page.locator('.platform-runbooks__filter-grid--executions').getByLabel('Execution status').selectOption('completed');
    await expect(page).toHaveURL(/execution_status=completed/);await expect(page).toHaveURL(/category=incident/);
    await expect(page).toHaveURL(/keep=fixture/);
    await page.locator('.platform-runbooks__filter-grid').first().getByLabel('Active state').selectOption('true');
    await expect(page).toHaveURL(/active=true/);await expect(page).toHaveURL(/execution_status=completed/);
  });
});

test.describe('Platform Runbooks — scoped evidence, truth boundary and denied requests (Batch 68 GENERATED_UNRUN)', () => {
  test('PRB-111 Execution registry tenant timeline link only appears with tenant read', async ({page}) => {
    await openPlatformRunbooks(page);await expect(execList(page).getByRole('link',{name:'Tenant timeline'})).toHaveAttribute('href',`/platform/tenant-timeline?tenant_id=${TENANT_A}`);
    await openPlatformRunbooks(page,{permissions:without('platform.tenants.read')});
    await expect(execList(page).getByRole('link',{name:'Tenant timeline'})).toHaveCount(0);
  });
  test('PRB-112 Execution registry audit evidence link requires audit read permission', async ({page}) => {
    await openPlatformRunbooks(page);await expect(execList(page).getByRole('link',{name:'Audit evidence'})).toHaveAttribute('href','/platform/audit');
    await openPlatformRunbooks(page,{permissions:without('platform.audit.read')});
    await expect(execList(page).getByRole('link',{name:'Audit evidence'})).toHaveCount(0);
  });
  test('PRB-113 Execution detail tenant incident and task are redacted independently', async ({page}) => {
    await openPlatformRunbooks(page,{permissions:without('platform.tenants.read')});await openExecution(page);
    await expect(execDetail(page).locator('.platform-runbooks__detail-metrics')).toContainText('Restricted');
    await expect(execDetail(page).locator('.platform-runbooks__detail-metrics')).toContainText(INCIDENT_A);
    await expect(execDetail(page)).not.toContainText(TENANT_A);
    await openPlatformRunbooks(page,{permissions:without('platform.incidents.read')});await openExecution(page);
    await expect(execDetail(page).locator('.platform-runbooks__detail-metrics')).toContainText('Fixture Hotel');
    await expect(execDetail(page)).not.toContainText(INCIDENT_A);
  });
  test('PRB-114 Completed execution does not establish external incident recovery', async ({page}) => {
    await openPlatformRunbooks(page,{executions:[{...executionSeed,status:'completed',completed_at:'2026-11-03T14:00:00Z'}]});
    await openExecution(page);await expect(execDetail(page)).toContainText('Completed');
    await expect(page.locator('.platform-runbooks__truth-note')).toContainText('Any external result still requires its own authoritative evidence.');
  });
  test('PRB-115 Linked tenant incident task UUIDs rejected across tenants by real backend needs integration test', async ({page}) => {
    const writes:any[]=[];
    await openPlatformRunbooks(page,{
      onCall:(m,p,_q,b)=>{if(m==='POST'&&p==='/platform/runbooks/executions')writes.push(b);},
      responses:{'POST /platform/runbooks/executions':{status:409,json:{code:'PLATFORM_RUNBOOK_REFERENCE_TENANT_MISMATCH',message:'Tenant, incident, and task references must belong to the same tenant'}}}
    });
    const form=await fillStart(page);await form.getByLabel('Tenant').selectOption(TENANT_A);
    await form.getByLabel('Incident ID').fill(INCIDENT_A);await form.getByLabel('Tenant task ID').fill(TASK_A);
    await form.getByRole('button',{name:'Start execution'}).click();
    await expect.poll(()=>writes.length).toBe(1);
    await expect(page.locator('.platform-runbooks__warning')).toContainText('Mutation failed:');
    // This is a synthetic rejected response. Real cross-tenant authorization needs Phase 2 backend acceptance.
  });
  test('PRB-116 Cross-tenant linked reference API denial remains visible and start draft stays editable', async ({page}) => {
    await openPlatformRunbooks(page,{responses:{'POST /platform/runbooks/executions':{status:403,json:{message:'Reference belongs to another tenant'}}}});
    const form=await fillStart(page);await form.getByLabel('Tenant').selectOption(TENANT_A);
    await form.getByLabel('Incident ID').fill(INCIDENT_A);await form.getByRole('button',{name:'Start execution'}).click();
    await expect(page.locator('.platform-runbooks__warning')).toContainText('Mutation failed:');
    await expect(form.getByLabel('Incident ID')).toHaveValue(INCIDENT_A);
    await expect(form.getByRole('button',{name:'Start execution'})).toBeEnabled();
  });
  test('PRB-117 Read-only role UI keeps definition and execution mutation controls hidden', async ({page}) => {
    await openPlatformRunbooks(page,{permissions:['platform.dashboard.read','platform.runbooks.read']});
    await expect(createBook(page)).toHaveCount(0);await expect(startForm(page)).toHaveCount(0);
    await openBook(page);await expect(bookDetail(page).getByRole('button',{name:'Save definition'})).toHaveCount(0);
    await openExecution(page);await expect(closePanel(page)).toHaveCount(0);
    await expect(stepRow(page).locator('.platform-runbooks__step-actions')).toHaveCount(0);
  });
  test('PRB-118 Operator identity redaction remains visible when synthetic users permission is omitted', async ({page}) => {
    await openPlatformRunbooks(page,{permissions:without('platform.users.read')});await openExecution(page);
    await expect(execDetail(page).locator('.platform-runbooks__detail-metrics')).toContainText('Redacted');
    await expect(page.locator('.platform-runbooks')).not.toContainText('operator@fixture.test');
  });
  test('PRB-119 Completion UI wording describes application evidence not external completion proof', async ({page}) => {
    await openPlatformRunbooks(page);await openExecution(page);page.once('dialog',d=>d.accept());
    await closePanel(page).getByRole('button',{name:'Complete execution'}).click();
    await expect(page.locator('.platform-runbooks__success')).toContainText('Execution marked complete in the application.');
    await expect(page.locator('.platform-runbooks__truth-note')).toContainText('application');
    await expect(page.locator('.platform-runbooks__truth-note')).toContainText('external result');
  });
  test('PRB-120 Step mutation unauthorized response retains visible error without claiming backend ACL verification', async ({page}) => {
    const writes:any[]=[];
    await openPlatformRunbooks(page,{
      onCall:(m,p,_q,b)=>{if(m==='PATCH'&&p===stepEndpoint(STEP_A))writes.push(b);},
      responses:{[`PATCH ${stepEndpoint(STEP_A)}`]:{status:403,json:{message:'Synthetic permission denied'}}}
    });
    await openExecution(page);await stepRow(page).getByRole('button',{name:'Done'}).click();
    await expect.poll(()=>writes.length).toBe(1);
    await expect(page.locator('.platform-runbooks__warning')).toContainText('Mutation failed:');
    await expect(stepRow(page).getByRole('button',{name:'Done'})).toBeEnabled();
  });
});
