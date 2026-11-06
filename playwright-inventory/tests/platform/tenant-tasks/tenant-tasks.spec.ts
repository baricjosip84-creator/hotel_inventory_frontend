import { test, expect, type Page } from '@playwright/test';
import { openTenantTasks, taskRows, taskTenants, taskUsers, taskPermissions, taskCategories, taskStatuses, taskPriorities, makeTask,
 TASK_TENANT_A, TASK_TENANT_B, TASK_ID_A, TASK_ID_B, TASK_ID_C, TASK_USER_A, TASK_USER_INACTIVE, type TenantTask } from '../../../support/tenantTasksFixture';

/** Batch 61 / Phase 1: scenario definitions only, GENERATED_UNRUN.
 * Synthetic HTTP, permissions and task state cannot establish server ACL,
 * tenant isolation, audit persistence, real-world completion or DB concurrency. */
const filters=(page:Page)=>page.locator('.platform-tenant-tasks__form-grid--filters');
const editor=(page:Page)=>page.locator('#platform-tenant-tasks-form');
const card=(page:Page,title:string)=>page.locator('.platform-tenant-tasks__card').filter({has:page.getByRole('heading',{name:title,exact:true})});
const error={message:'Synthetic task service unavailable'};
const makeMany=()=>Array.from({length:101},(_,i)=>makeTask(i+1,{tenant_id:TASK_TENANT_A,tenant_name:'Fixture Hotel'}));

test.describe('Platform Tenant Tasks — Batch 61, GENERATED_UNRUN',()=>{
 test('PTTASK-001 Page identifies scoped task evidence and honest completion limit',async({page})=>{
  await openTenantTasks(page);await expect(page.getByText('Source · GET /platform/tenant-tasks')).toBeVisible();
  await expect(page.getByText('Read · TENANTS_READ')).toBeVisible();
  await expect(page.getByText('Write · TENANTS_UPDATE')).toBeVisible();
  await expect(page.getByText(/does not independently prove an external\/customer outcome/i).first()).toBeVisible();
 });
 test('PTTASK-002 Default listing requests 100 rows at offset zero and excludes closed',async({page})=>{
  const calls:URLSearchParams[]=[];await openTenantTasks(page,{onCall:(m,p,_b,q)=>{if(m==='GET'&&p==='/platform/tenant-tasks')calls.push(new URLSearchParams(q));}});
  await expect.poll(()=>calls.length).toBeGreaterThan(0);expect(calls[0].get('limit')).toBe('100');expect(calls[0].get('offset')).toBe('0');expect(calls[0].get('include_closed')).toBe('false');
 });
 test('PTTASK-003 First page displays open and blocked rows but hides closed tasks',async({page})=>{
  await openTenantTasks(page);await expect(card(page,'Fixture urgent onboarding')).toBeVisible();await expect(card(page,'Fixture blocked billing')).toBeVisible();await expect(card(page,'Fixture completed migration')).toHaveCount(0);
 });
 test('PTTASK-004 Global summary remains distinct from current-page count',async({page})=>{
  await openTenantTasks(page);await expect(page.getByLabel('Tenant task operational summary')).toContainText('Loaded tasks');
  await expect(page.getByLabel('Tenant task operational summary')).toContainText('Global application total; not filter-scoped');
 });
 test('PTTASK-005 Urgent queue row precedes high priority row',async({page})=>{
  await openTenantTasks(page);const titles=await page.locator('.platform-tenant-tasks__card h4').allTextContents();expect(titles.slice(0,2)).toEqual(['Fixture urgent onboarding','Fixture blocked billing']);
 });
 test('PTTASK-006 Include closed checkbox exposes completed and cancelled tasks',async({page})=>{
  await openTenantTasks(page);await filters(page).getByLabel('Include completed/cancelled').check();
  await expect(page).toHaveURL(/include_closed=true/);await expect(card(page,'Fixture completed migration')).toBeVisible();await expect(card(page,'Fixture cancelled support')).toBeVisible();
 });
 test('PTTASK-007 Unchecking include closed hides completed and cancelled again',async({page})=>{
  await openTenantTasks(page,{query:'include_closed=true'});await filters(page).getByLabel('Include completed/cancelled').uncheck();
  await expect(page).not.toHaveURL(/include_closed=/);await expect(card(page,'Fixture completed migration')).toHaveCount(0);
 });
 test('PTTASK-008 Tenant deep link limits visible rows and populates selected scope',async({page})=>{
  await openTenantTasks(page,{query:`tenant_id=${TASK_TENANT_A}`});await expect(card(page,'Fixture urgent onboarding')).toBeVisible();
  await expect(card(page,'Fixture blocked billing')).toHaveCount(0);await expect(page.getByText('Current view · Fixture Hotel')).toBeVisible();
 });
 test('PTTASK-009 Tenant filter change writes URL and updates API query',async({page})=>{
  const calls:string[]=[];await openTenantTasks(page,{onCall:(m,p,_b,q)=>{if(m==='GET'&&p==='/platform/tenant-tasks')calls.push(q.get('tenant_id')||'');}});
  await filters(page).getByLabel('Tenant').selectOption(TASK_TENANT_B);await expect(page).toHaveURL(new RegExp('tenant_id='+TASK_TENANT_B));
  await expect.poll(()=>calls).toContain(TASK_TENANT_B);await expect(card(page,'Fixture blocked billing')).toBeVisible();
 });
 test('PTTASK-010 Status filter limits queue to blocked rows',async({page})=>{
  await openTenantTasks(page);await filters(page).getByLabel('Status').selectOption('blocked');
  await expect(page).toHaveURL(/status=blocked/);await expect(card(page,'Fixture blocked billing')).toBeVisible();await expect(card(page,'Fixture urgent onboarding')).toHaveCount(0);
 });
 test('PTTASK-011 Category filter scopes queue to onboarding',async({page})=>{
  await openTenantTasks(page);await filters(page).getByLabel('Category').selectOption('onboarding');
  await expect(page).toHaveURL(/category=onboarding/);await expect(card(page,'Fixture urgent onboarding')).toBeVisible();await expect(card(page,'Fixture blocked billing')).toHaveCount(0);
 });
 test('PTTASK-012 Priority filter scopes queue to high priority',async({page})=>{
  await openTenantTasks(page);await filters(page).getByLabel('Priority').selectOption('high');
  await expect(page).toHaveURL(/priority=high/);await expect(card(page,'Fixture blocked billing')).toBeVisible();await expect(card(page,'Fixture urgent onboarding')).toHaveCount(0);
 });
 test('PTTASK-013 Assignee filter serializes UUID without leaking inactive accounts in picker',async({page})=>{
  await openTenantTasks(page);await filters(page).getByLabel('Assigned operator').selectOption(TASK_USER_A);
  await expect(page).toHaveURL(new RegExp('assigned_platform_user_id='+TASK_USER_A));await expect(card(page,'Fixture urgent onboarding')).toBeVisible();await expect(card(page,'Fixture blocked billing')).toHaveCount(0);
 });
 test('PTTASK-014 Overdue only sends boolean and removes not-overdue task',async({page})=>{
  await openTenantTasks(page);await filters(page).getByLabel('Overdue only').check();
  await expect(page).toHaveURL(/overdue_only=true/);await expect(card(page,'Fixture urgent onboarding')).toBeVisible();await expect(card(page,'Fixture blocked billing')).toHaveCount(0);
 });
 test('PTTASK-015 Invalid tenant UUID blocks task-list network query',async({page})=>{
  const calls:string[]=[];await openTenantTasks(page,{query:'tenant_id=bad-id',onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-tasks')calls.push(p);}});
  await expect(page.getByText('One or more URL filters are invalid.')).toBeVisible();expect(calls).toHaveLength(0);
 });
 test('PTTASK-016 Unsupported status URL is rejected and repairable',async({page})=>{
  await openTenantTasks(page,{query:'status=paused'});await expect(page.getByRole('button',{name:'Clear invalid filters'})).toBeVisible();
  await page.getByRole('button',{name:'Clear invalid filters'}).click();await expect(page).not.toHaveURL(/status=/);await expect(card(page,'Fixture urgent onboarding')).toBeVisible();
 });
 test('PTTASK-017 Unknown category URL cannot silently reach registry',async({page})=>{
  await openTenantTasks(page,{query:'category=other-category'});await expect(page.getByText('The task registry is not loaded until the invalid filter is cleared.')).toBeVisible();
 });
 test('PTTASK-018 Unsupported priority URL blocks API list query',async({page})=>{
  const calls:string[]=[];await openTenantTasks(page,{query:'priority=critical',onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-tasks')calls.push(p);}});
  await expect(page.getByRole('button',{name:'Clear invalid filters'})).toBeVisible();expect(calls).toHaveLength(0);
 });
 test('PTTASK-019 Malformed assignee identifier is rejected',async({page})=>{
  await openTenantTasks(page,{query:'assigned_platform_user_id=not-a-guid'});await expect(page.getByRole('button',{name:'Clear invalid filters'})).toBeVisible();
 });
 test('PTTASK-020 Nonboolean include_closed parameter requires repair',async({page})=>{
  await openTenantTasks(page,{query:'include_closed=all'});await expect(page.getByRole('button',{name:'Clear invalid filters'})).toBeVisible();
  await page.getByRole('button',{name:'Clear invalid filters'}).click();await expect(page).not.toHaveURL(/include_closed=/);
 });
 test('PTTASK-021 Nonboolean overdue_only parameter is rejected',async({page})=>{
  await openTenantTasks(page,{query:'overdue_only=maybe'});await expect(page.getByRole('button',{name:'Clear invalid filters'})).toBeVisible();
 });
 test('PTTASK-022 Clearing invalid URL filter retains valid tenant and priority',async({page})=>{
  await openTenantTasks(page,{query:`tenant_id=${TASK_TENANT_A}&priority=urgent&status=unknown`});
  await page.getByRole('button',{name:'Clear invalid filters'}).click();await expect(page).toHaveURL(new RegExp('tenant_id='+TASK_TENANT_A));
  await expect(page).toHaveURL(/priority=urgent/);await expect(page).not.toHaveURL(/status=/);
 });
 test('PTTASK-023 Filter dropdowns enumerate exact frontend known values',async({page})=>{
  await openTenantTasks(page);for(const [label,values] of [['Status',taskStatuses],['Category',taskCategories],['Priority',taskPriorities]] as const){
   const list=await filters(page).getByLabel(label).locator('option').evaluateAll(options=>options.map(o=>(o as HTMLOptionElement).value));expect(list).toEqual(['',...values]);
  }
 });
 test('PTTASK-024 Read-only Platform role hides mutation form and task action buttons',async({page})=>{
  await openTenantTasks(page,{permissions:['platform.dashboard.read','platform.tenants.read']});
  await expect(editor(page)).toHaveCount(0);await expect(card(page,'Fixture urgent onboarding').getByRole('button',{name:'Edit'})).toHaveCount(0);
  await expect(card(page,'Fixture urgent onboarding').getByRole('button',{name:'Complete'})).toHaveCount(0);
  await expect(card(page,'Fixture urgent onboarding').getByRole('button',{name:'Delete permanently'})).toHaveCount(0);
 });
 test('PTTASK-025 Lack of Platform users read hides identities and operator picker',async({page})=>{
  await openTenantTasks(page,{permissions:['platform.dashboard.read','platform.tenants.read','platform.tenants.update']});
  await expect(page.getByText('Platform operator identity fields are redacted by the API unless PLATFORM_USERS_READ is present.').first()).toBeVisible();
  await expect(filters(page).getByLabel('Assigned operator')).toHaveCount(0);await expect(editor(page).getByLabel('Assigned operator')).toHaveCount(0);
 });
 test('PTTASK-026 Assignee URL can be cleared without exposing identities for non-reader',async({page})=>{
  await openTenantTasks(page,{permissions:['platform.dashboard.read','platform.tenants.read'],query:`assigned_platform_user_id=${TASK_USER_A}`});
  await expect(page.getByText(/An assigned-operator filter is active/)).toBeVisible();
  await filters(page).getByRole('button',{name:'Clear'}).click();await expect(page).not.toHaveURL(/assigned_platform_user_id=/);
 });
 test('PTTASK-027 Active platform users appear but inactive accounts do not appear in picker',async({page})=>{
  await openTenantTasks(page);const options=await filters(page).getByLabel('Assigned operator').locator('option').allTextContents();
  expect(options).toContain('operator@example.test');expect(options).not.toContain('inactive@example.test');
 });
 test('PTTASK-028 Operator-read permission renders task provenance and completed-by details',async({page})=>{
  await openTenantTasks(page,{query:'include_closed=true'});
  await expect(card(page,'Fixture urgent onboarding')).toContainText('Created by · creator@example.test');
  await expect(card(page,'Fixture completed migration')).toContainText('Completed by · closer@example.test');
 });
 test('PTTASK-029 Missing due and created timestamps render Not recorded',async({page})=>{
  await openTenantTasks(page);await expect(card(page,'Fixture blocked billing')).toContainText('Not recorded');
 });
 test('PTTASK-030 Closed tasks hide Complete even with write permission',async({page})=>{
  await openTenantTasks(page,{query:'include_closed=true'});await expect(card(page,'Fixture completed migration').getByRole('button',{name:'Complete'})).toHaveCount(0);
  await expect(card(page,'Fixture cancelled support').getByRole('button',{name:'Complete'})).toHaveCount(0);
 });
 test('PTTASK-031 Editor requires tenant and nonblank title before Create',async({page})=>{
  await openTenantTasks(page);const create=editor(page).getByRole('button',{name:'Create task'});await expect(create).toBeDisabled();
  await editor(page).getByLabel('Tenant').selectOption(TASK_TENANT_A);await editor(page).getByLabel('Title').fill('   ');await expect(create).toBeDisabled();
  await editor(page).getByLabel('Title').fill('Fixture action');await expect(create).toBeEnabled();
 });
 test('PTTASK-032 Title and description inputs expose source-defined length caps',async({page})=>{
  await openTenantTasks(page);await expect(editor(page).getByLabel('Title')).toHaveAttribute('maxlength','200');
  await expect(editor(page).getByLabel('Description / next step')).toHaveAttribute('maxlength','4000');
 });
 test('PTTASK-033 New editor defaults to general category normal priority and open status',async({page})=>{
  await openTenantTasks(page);await expect(editor(page).getByLabel('Category')).toHaveValue('general');
  await expect(editor(page).getByLabel('Priority')).toHaveValue('normal');await expect(editor(page).getByLabel('Status')).toHaveValue('open');
 });
 test('PTTASK-034 Tenant-scoped deep link preselects create tenant',async({page})=>{
  await openTenantTasks(page,{query:`tenant_id=${TASK_TENANT_B}`});await expect(editor(page).getByLabel('Tenant')).toHaveValue(TASK_TENANT_B);
 });
 test('PTTASK-035 Create trims title and converts blank description and due to null',async({page})=>{
  const posts:any[]=[];await openTenantTasks(page,{onCall:(m,p,b)=>{if(m==='POST'&&p==='/platform/tenant-tasks')posts.push(b);}});
  await editor(page).getByLabel('Tenant').selectOption(TASK_TENANT_A);await editor(page).getByLabel('Title').fill('  Fixture new action  ');
  await editor(page).getByRole('button',{name:'Create task'}).click();await expect.poll(()=>posts.length).toBe(1);
  expect(posts[0]).toMatchObject({tenant_id:TASK_TENANT_A,title:'Fixture new action',description:null,due_at:null,category:'general',priority:'normal',status:'open'});
 });
 test('PTTASK-036 Create assigns selected active operator in request',async({page})=>{
  const posts:any[]=[];await openTenantTasks(page,{onCall:(m,p,b)=>{if(m==='POST'&&p==='/platform/tenant-tasks')posts.push(b);}});
  await editor(page).getByLabel('Tenant').selectOption(TASK_TENANT_A);await editor(page).getByLabel('Title').fill('Fixture assigned action');
  await editor(page).getByLabel('Assigned operator').selectOption(TASK_USER_A);await editor(page).getByRole('button',{name:'Create task'}).click();
  await expect.poll(()=>posts.length).toBe(1);expect(posts[0].assigned_platform_user_id).toBe(TASK_USER_A);
 });
 test('PTTASK-037 Create omits assigned operator field when user directory permission absent',async({page})=>{
  const posts:any[]=[];await openTenantTasks(page,{permissions:['platform.dashboard.read','platform.tenants.read','platform.tenants.update'],onCall:(m,p,b)=>{if(m==='POST'&&p==='/platform/tenant-tasks')posts.push(b);}});
  await editor(page).getByLabel('Tenant').selectOption(TASK_TENANT_A);await editor(page).getByLabel('Title').fill('Fixture unassigned');
  await editor(page).getByRole('button',{name:'Create task'}).click();await expect.poll(()=>posts.length).toBe(1);
  expect(Object.prototype.hasOwnProperty.call(posts[0],'assigned_platform_user_id')).toBe(false);
 });
 test('PTTASK-038 Creating task shows success and synthetic list readback',async({page})=>{
  await openTenantTasks(page);await editor(page).getByLabel('Tenant').selectOption(TASK_TENANT_A);await editor(page).getByLabel('Title').fill('Fixture created readback');
  await editor(page).getByRole('button',{name:'Create task'}).click();await expect(page.getByText('Tenant task created.')).toBeVisible();
  await expect(card(page,'Fixture created readback')).toBeVisible();await expect(editor(page).getByLabel('Title')).toHaveValue('');
 });
 test('PTTASK-039 Create server 422 shows action failure without false success',async({page})=>{
  await openTenantTasks(page,{responses:{'POST /platform/tenant-tasks':{status:422,json:{message:'Synthetic validation rejected'}}}});
  await editor(page).getByLabel('Tenant').selectOption(TASK_TENANT_A);await editor(page).getByLabel('Title').fill('Fixture invalid create');
  await editor(page).getByRole('button',{name:'Create task'}).click();await expect(page.getByText(/Action failed:/)).toBeVisible();
  await expect(page.getByText('Tenant task created.')).toHaveCount(0);
 });
 test('PTTASK-040 Edit fixes tenant ownership and uses PATCH without tenant_id',async({page})=>{
  const patches:any[]=[];await openTenantTasks(page,{onCall:(m,p,b)=>{if(m==='PATCH'&&p===`/platform/tenant-tasks/${TASK_ID_A}`)patches.push(b);}});
  await card(page,'Fixture urgent onboarding').getByRole('button',{name:'Edit'}).click();
  await expect(editor(page).getByText('Tenant fixed:')).toBeVisible();await expect(editor(page).getByLabel('Tenant')).toHaveCount(0);
  await editor(page).getByLabel('Title').fill('Updated fixture action');await editor(page).getByRole('button',{name:'Save task'}).click();
  await expect.poll(()=>patches.length).toBe(1);expect(patches[0].title).toBe('Updated fixture action');expect(Object.prototype.hasOwnProperty.call(patches[0],'tenant_id')).toBe(false);
 });
 test('PTTASK-041 Editing maps existing task values and cancel resets editor',async({page})=>{
  await openTenantTasks(page);await card(page,'Fixture blocked billing').getByRole('button',{name:'Edit'}).click();
  await expect(editor(page).getByLabel('Title')).toHaveValue('Fixture blocked billing');await expect(editor(page).getByLabel('Status')).toHaveValue('blocked');
  await editor(page).getByRole('button',{name:'Cancel edit'}).click();await expect(editor(page).getByRole('button',{name:'Create task'})).toBeVisible();
 });
 test('PTTASK-042 Task edit synthetic readback updates existing row',async({page})=>{
  await openTenantTasks(page);await card(page,'Fixture urgent onboarding').getByRole('button',{name:'Edit'}).click();
  await editor(page).getByLabel('Title').fill('Fixture amended onboarding');await editor(page).getByRole('button',{name:'Save task'}).click();
  await expect(page.getByText('Tenant task updated.')).toBeVisible();await expect(card(page,'Fixture amended onboarding')).toBeVisible();
 });
 test('PTTASK-043 Switching tenant filter during edit cancels stale cross-tenant editor',async({page})=>{
  await openTenantTasks(page);await card(page,'Fixture urgent onboarding').getByRole('button',{name:'Edit'}).click();
  await filters(page).getByLabel('Tenant').selectOption(TASK_TENANT_B);await expect(editor(page).getByRole('button',{name:'Create task'})).toBeVisible();
  await expect(editor(page).getByLabel('Tenant')).toHaveValue(TASK_TENANT_B);
 });
 test('PTTASK-044 Complete confirmation dismissal does not send mutation',async({page})=>{
  const calls:string[]=[];page.once('dialog',d=>d.dismiss());await openTenantTasks(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/complete'))calls.push(p);}});
  await card(page,'Fixture urgent onboarding').getByRole('button',{name:'Complete'}).click();expect(calls).toHaveLength(0);await expect(card(page,'Fixture urgent onboarding')).toBeVisible();
 });
 test('PTTASK-045 Confirm completion posts endpoint and hides now closed row',async({page})=>{
  const calls:string[]=[];page.once('dialog',d=>d.accept());await openTenantTasks(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/complete'))calls.push(p);}});
  await card(page,'Fixture urgent onboarding').getByRole('button',{name:'Complete'}).click();await expect.poll(()=>calls).toContain(`/platform/tenant-tasks/${TASK_ID_A}/complete`);
  await expect(page.getByText('Tenant task marked completed.')).toBeVisible();await expect(card(page,'Fixture urgent onboarding')).toHaveCount(0);
 });
 test('PTTASK-046 Permanently delete confirmation dismissal preserves task row',async({page})=>{
  const calls:string[]=[];page.once('dialog',d=>d.dismiss());await openTenantTasks(page,{onCall:(m,p)=>{if(m==='DELETE'&&p.includes('/tenant-tasks/'))calls.push(p);}});
  await card(page,'Fixture urgent onboarding').getByRole('button',{name:'Delete permanently'}).click();expect(calls).toHaveLength(0);
  await expect(card(page,'Fixture urgent onboarding')).toBeVisible();
 });
 test('PTTASK-047 Confirm delete sends DELETE then removes synthetic task from list',async({page})=>{
  const calls:string[]=[];page.once('dialog',d=>d.accept());await openTenantTasks(page,{onCall:(m,p)=>{if(m==='DELETE'&&p.includes('/tenant-tasks/'))calls.push(p);}});
  await card(page,'Fixture urgent onboarding').getByRole('button',{name:'Delete permanently'}).click();await expect.poll(()=>calls).toContain(`/platform/tenant-tasks/${TASK_ID_A}`);
  await expect(page.getByText('Tenant task permanently deleted.')).toBeVisible();await expect(card(page,'Fixture urgent onboarding')).toHaveCount(0);
 });
 test('PTTASK-048 API has_more exposes next pagination, fetching offset 100',async({page})=>{
  const offsets:string[]=[];await openTenantTasks(page,{rows:makeMany(),onCall:(m,p,_b,q)=>{if(m==='GET'&&p==='/platform/tenant-tasks')offsets.push(q.get('offset')||'');}});
  await page.locator('.platform-tenant-tasks__pagination').getByRole('button',{name:'Next'}).click();
  await expect.poll(()=>offsets).toContain('100');await expect(page.locator('.platform-tenant-tasks__pagination')).toContainText('Page 2');
  await expect(card(page,'Fixture task 101')).toBeVisible();
 });
 test('PTTASK-049 Previous page restores offset zero and first page record',async({page})=>{
  await openTenantTasks(page,{rows:makeMany()});const pager=page.locator('.platform-tenant-tasks__pagination');
  await pager.getByRole('button',{name:'Next'}).click();await expect(pager).toContainText('Page 2');
  await pager.getByRole('button',{name:'Previous'}).click();await expect(pager).toContainText('Page 1');await expect(card(page,'Fixture task 001')).toBeVisible();
 });
 test('PTTASK-050 Initial task registry failure shows retry without misleading empty-state',async({page})=>{
  let fail=true;await openTenantTasks(page,{respond:(m,p)=>m==='GET'&&p==='/platform/tenant-tasks'&&fail?{status:503,json:error}:undefined});
  await expect(page.getByText('Tenant tasks could not be loaded.')).toBeVisible();
  await expect(page.getByText('No stored tenant tasks match this view.')).toHaveCount(0);
  fail=false;await page.getByRole('button',{name:'Retry',exact:true}).click();await expect(card(page,'Fixture urgent onboarding')).toBeVisible();
 });
});

/** Batch 62: remaining source-discovered Tenant Tasks scenarios, still GENERATED_UNRUN. */
test.describe('Platform Tenant Tasks — Batch 62 completion, GENERATED_UNRUN', () => {
 test('PTTASK-051 Initial tenant-selector failure and Retry tenants recovery',async({page})=>{
  let fail=true;await openTenantTasks(page,{respond:(m,p)=>m==='GET'&&p==='/platform/tenants'&&fail?{status:503,json:error}:undefined});
  await expect(page.getByText('Tenant selector could not be loaded.')).toBeVisible();await expect(filters(page).getByLabel('Tenant')).toBeDisabled();
  fail=false;await page.getByRole('button',{name:'Retry tenants'}).click();await expect(filters(page).getByLabel('Tenant')).toBeEnabled();
  await expect(filters(page).getByLabel('Tenant').locator('option')).toHaveCount(3);
 });
 test('PTTASK-052 Initial global-summary failure and Retry summary recovery',async({page})=>{
  let fail=true;await openTenantTasks(page,{respond:(m,p)=>m==='GET'&&p==='/platform/tenant-tasks/summary'&&fail?{status:503,json:error}:undefined});
  await expect(page.getByText(/Global task summary could not be loaded:/)).toBeVisible();
  fail=false;await page.getByRole('button',{name:'Retry summary'}).click();
  await expect(page.getByLabel('Tenant task operational summary')).toContainText('Global application total; not filter-scoped');
  await expect(page.getByText(/Global task summary could not be loaded:/)).toHaveCount(0);
 });
 test('PTTASK-053 Initial operator-directory failure leaves tasks available but assignment disabled',async({page})=>{
  await openTenantTasks(page,{respond:(m,p)=>m==='GET'&&p==='/platform/users'?{status:503,json:error}:undefined});
  await expect(page.getByText(/Platform-user assignment selector could not be loaded:/)).toBeVisible();
  await expect(card(page,'Fixture urgent onboarding')).toBeVisible();
  await expect(filters(page).getByLabel('Assigned operator')).toBeDisabled();
  await expect(editor(page).getByLabel('Assigned operator')).toBeDisabled();
 });
 test('PTTASK-054 Background task refresh failure preserves stale queue and warning',async({page})=>{
  let fail=false;await openTenantTasks(page,{respond:(m,p)=>m==='GET'&&p==='/platform/tenant-tasks'&&fail?{status:503,json:error}:undefined});
  await expect(card(page,'Fixture urgent onboarding')).toBeVisible();fail=true;
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page.getByText('Task refresh failed. Showing the last successful task snapshot.')).toBeVisible();
  await expect(card(page,'Fixture urgent onboarding')).toBeVisible();
 });
 test('PTTASK-055 Background tenant-selector refresh failure preserves selector snapshot',async({page})=>{
  let fail=false;await openTenantTasks(page,{respond:(m,p)=>m==='GET'&&p==='/platform/tenants'&&fail?{status:503,json:error}:undefined});
  await expect(filters(page).getByLabel('Tenant').locator('option')).toHaveCount(3);fail=true;
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page.getByText('Tenant selector refresh failed. Showing the last successful tenant selector snapshot.')).toBeVisible();
  await expect(filters(page).getByLabel('Tenant').locator('option')).toHaveCount(3);
 });
 test('PTTASK-056 Background global-summary refresh failure preserves prior global KPIs',async({page})=>{
  let fail=false;await openTenantTasks(page,{respond:(m,p)=>m==='GET'&&p==='/platform/tenant-tasks/summary'&&fail?{status:503,json:error}:undefined});
  await expect(page.getByLabel('Tenant task operational summary')).toContainText('Open');fail=true;
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page.getByText('Task summary refresh failed. Showing the last successful global summary.')).toBeVisible();
  await expect(page.getByLabel('Tenant task operational summary')).toContainText('Global application total; not filter-scoped');
 });
 test('PTTASK-057 Background platform-user selector refresh failure preserves prior assignments',async({page})=>{
  let fail=false;await openTenantTasks(page,{respond:(m,p)=>m==='GET'&&p==='/platform/users'&&fail?{status:503,json:error}:undefined});
  await expect(filters(page).getByLabel('Assigned operator').locator('option')).toHaveCount(2);fail=true;
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page.getByText('Platform-user selector refresh failed. Showing the last successful assignment list.')).toBeVisible();
  await expect(filters(page).getByLabel('Assigned operator').locator('option')).toHaveCount(2);
 });
 test('PTTASK-058 Refresh button disabled while synthetic requests remain pending',async({page})=>{
  await openTenantTasks(page,{delayMs:{'GET /platform/tenant-tasks/summary':950}});
  const refresh=page.getByRole('button',{name:'Refresh',exact:true});await refresh.click();
  await expect(refresh).toBeDisabled();await expect(page.getByText('Refreshing…')).toBeVisible();
  await expect(refresh).toBeEnabled();
 });
 test('PTTASK-059 Previous and Next buttons disabled while queue is fetching',async({page})=>{
  await openTenantTasks(page,{rows:makeMany(),delayMs:{'GET /platform/tenant-tasks':950}});
  const pager=page.locator('.platform-tenant-tasks__pagination');await pager.getByRole('button',{name:'Next'}).click();
  await expect(pager.getByRole('button',{name:'Next'})).toBeDisabled();await expect(pager.getByRole('button',{name:'Previous'})).toBeDisabled();
  await expect(pager).toContainText('Page 2');
 });
 test('PTTASK-060 Next button disabled whenever pagination.has_more is false even with 100 rows',async({page})=>{
  await openTenantTasks(page,{rows:makeMany().slice(0,100)});
  await expect(page.locator('.platform-tenant-tasks__card')).toHaveCount(100);
  await expect(page.locator('.platform-tenant-tasks__pagination').getByRole('button',{name:'Next'})).toBeDisabled();
 });
 test('PTTASK-061 Changing filters resets current pagination offset to zero',async({page})=>{
  const offsets:string[]=[];await openTenantTasks(page,{rows:makeMany(),onCall:(m,p,_b,q)=>{if(m==='GET'&&p==='/platform/tenant-tasks')offsets.push(q.get('offset')||'');}});
  const pager=page.locator('.platform-tenant-tasks__pagination');await pager.getByRole('button',{name:'Next'}).click();
  await expect(pager).toContainText('Page 2');await filters(page).getByLabel('Priority').selectOption('urgent');
  await expect(pager).toContainText('Page 1');await expect.poll(()=>offsets.at(-1)).toBe('0');
 });
 test('PTTASK-062 Empty server task list displays explicit no stored tasks notice',async({page})=>{
  await openTenantTasks(page,{rows:[]});await expect(page.getByText('No stored tenant tasks match this view.')).toBeVisible();
  await expect(page.getByText(/It does not prove no external/)).toBeVisible();
 });
 test('PTTASK-063 Invalid backend timestamps have Not recorded fallback',async({page})=>{
  const rows=[makeTask(400,{title:'Fixture bad timestamps',created_at:'not-a-date',updated_at:null,due_at:'garbage',completed_at:null})];
  await openTenantTasks(page,{rows});await expect(card(page,'Fixture bad timestamps').getByText('Not recorded')).toHaveCount(4);
 });
 test('PTTASK-064 Missing task description renders no next-step note',async({page})=>{
  await openTenantTasks(page);await expect(card(page,'Fixture blocked billing')).toContainText('No description or next-step text is stored for this task.');
 });
 test('PTTASK-065 Unknown category priority and status values render nonblocking safe labels',async({page})=>{
  await openTenantTasks(page,{rows:[makeTask(401,{title:'Fixture unknown enums',category:'new_kind',priority:'unspecified',status:'waiting_on_customer'})]});
  await expect(card(page,'Fixture unknown enums')).toContainText('New kind');
  await expect(card(page,'Fixture unknown enums')).toContainText('Unspecified');
  await expect(card(page,'Fixture unknown enums')).toContainText('Waiting on customer');
 });
 test('PTTASK-066 Edit allows reopening completed task via status and clears completion evidence in synthetic readback',async({page})=>{
  const patches:any[]=[];await openTenantTasks(page,{query:'include_closed=true',onCall:(m,p,b)=>{if(m==='PATCH'&&p===`/platform/tenant-tasks/${TASK_ID_C}`)patches.push(b);}});
  await card(page,'Fixture completed migration').getByRole('button',{name:'Edit'}).click();
  await editor(page).getByLabel('Status').selectOption('open');await editor(page).getByRole('button',{name:'Save task'}).click();
  await expect.poll(()=>patches.length).toBe(1);expect(patches[0].status).toBe('open');
  await expect(page.getByText('Tenant task updated.')).toBeVisible();
  await expect(card(page,'Fixture completed migration').locator('.platform-tenant-tasks__evidence-grid')).toContainText('Not recorded');
 });
 test('PTTASK-067 Inactive assigned operator displays unavailable-current-assignee option during edit',async({page})=>{
  await openTenantTasks(page,{query:'include_closed=true'});
  await card(page,'Fixture completed migration').getByRole('button',{name:'Edit'}).click();
  await expect(editor(page).getByLabel('Assigned operator')).toHaveValue(TASK_USER_INACTIVE);
  await expect(editor(page).getByLabel('Assigned operator')).toContainText('Current assignee · unavailable/inactive');
 });
 test('PTTASK-068 Editor without platform users read does not overwrite existing assignment on PATCH',async({page})=>{
  const patches:any[]=[];await openTenantTasks(page,{permissions:['platform.dashboard.read','platform.tenants.read','platform.tenants.update'],onCall:(m,p,b)=>{if(m==='PATCH'&&p===`/platform/tenant-tasks/${TASK_ID_A}`)patches.push(b);}});
  await card(page,'Fixture urgent onboarding').getByRole('button',{name:'Edit'}).click();
  await editor(page).getByLabel('Title').fill('Fixture scoped edit');await editor(page).getByRole('button',{name:'Save task'}).click();
  await expect.poll(()=>patches.length).toBe(1);expect(Object.prototype.hasOwnProperty.call(patches[0],'assigned_platform_user_id')).toBe(false);
 });
 test('PTTASK-069 Pending create request disables duplicate save',async({page})=>{
  await openTenantTasks(page,{delayMs:{'POST /platform/tenant-tasks':900}});
  await editor(page).getByLabel('Tenant').selectOption(TASK_TENANT_A);await editor(page).getByLabel('Title').fill('Fixture one-shot');
  await editor(page).getByRole('button',{name:'Create task'}).click();
  await expect(editor(page).getByRole('button',{name:'Saving…'})).toBeDisabled();
  await expect(page.getByText('Tenant task created.')).toBeVisible();
 });
 test('PTTASK-070 Pending PATCH disables Save and Cancel edit',async({page})=>{
  await openTenantTasks(page,{delayMs:{[`PATCH /platform/tenant-tasks/${TASK_ID_A}`]:900}});
  await card(page,'Fixture urgent onboarding').getByRole('button',{name:'Edit'}).click();
  await editor(page).getByLabel('Title').fill('Fixture delayed edit');await editor(page).getByRole('button',{name:'Save task'}).click();
  await expect(editor(page).getByRole('button',{name:'Saving…'})).toBeDisabled();await expect(editor(page).getByRole('button',{name:'Cancel edit'})).toBeDisabled();
  await expect(page.getByText('Tenant task updated.')).toBeVisible();
 });
 test('PTTASK-071 Completion HTTP 409 shows failure and does not show success',async({page})=>{
  page.once('dialog',d=>d.accept());await openTenantTasks(page,{responses:{[`POST /platform/tenant-tasks/${TASK_ID_A}/complete`]:{status:409,json:{message:'Synthetic conflicting state'}}}});
  await card(page,'Fixture urgent onboarding').getByRole('button',{name:'Complete'}).click();
  await expect(page.getByText(/Action failed:/)).toBeVisible();await expect(page.getByText('Tenant task marked completed.')).toHaveCount(0);
  await expect(card(page,'Fixture urgent onboarding')).toBeVisible();
 });
 test('PTTASK-072 Permanent deletion HTTP 409 preserves task and shows failure',async({page})=>{
  page.once('dialog',d=>d.accept());await openTenantTasks(page,{responses:{[`DELETE /platform/tenant-tasks/${TASK_ID_A}`]:{status:409,json:{message:'Synthetic delete conflict'}}}});
  await card(page,'Fixture urgent onboarding').getByRole('button',{name:'Delete permanently'}).click();
  await expect(page.getByText(/Action failed:/)).toBeVisible();await expect(page.getByText('Tenant task permanently deleted.')).toHaveCount(0);
  await expect(card(page,'Fixture urgent onboarding')).toBeVisible();
 });
 test('PTTASK-073 PATCH validation HTTP 422 displays error while retaining editor state',async({page})=>{
  await openTenantTasks(page,{responses:{[`PATCH /platform/tenant-tasks/${TASK_ID_A}`]:{status:422,json:{message:'Synthetic invalid update'}}}});
  await card(page,'Fixture urgent onboarding').getByRole('button',{name:'Edit'}).click();
  await editor(page).getByLabel('Title').fill('Fixture rejected change');await editor(page).getByRole('button',{name:'Save task'}).click();
  await expect(page.getByText(/Action failed:/)).toBeVisible();await expect(editor(page).getByLabel('Title')).toHaveValue('Fixture rejected change');
 });
 test('PTTASK-074 Tenant-scoped supporting links retain validated tenant UUID',async({page})=>{
  await openTenantTasks(page,{query:`tenant_id=${TASK_TENANT_A}`});
  for(const name of ['Tenants','Tenant contacts','Tenant notes','Communications','Tenant timeline','Customer Success']){
   const link=page.getByRole('link',{name,exact:true}).last();await expect(link).toHaveAttribute('href',new RegExp('tenant_id='+TASK_TENANT_A));
  }
 });
 test('PTTASK-075 Supporting billing support runbooks and platform users links honor individual permissions',async({page})=>{
  await openTenantTasks(page,{query:`tenant_id=${TASK_TENANT_A}`,permissions:['platform.dashboard.read','platform.tenants.read']});
  for(const name of ['Billing','Support Operations','Runbooks','Platform users'])await expect(page.getByRole('link',{name,exact:true})).toHaveCount(0);
  await expect(page.getByRole('link',{name:'Tenant timeline',exact:true})).toBeVisible();
 });
});
