/** BATCH_088_GENERATED_UNRUN: Platform Tenant Offboarding, source-traced synthetic browser tests.
 * Intercepted requests cannot prove customer notification, billing settlement, export receipt,
 * archived tenant state in real DB, legal compliance or external deletion. */
import {test,expect,type Page} from '@playwright/test';
import {openTenantOffboarding,offboardingRoot,offboardingPermissions,offboardingTenantA,offboardingTenantB,offboardingTenantC,
 offboardingOwnerId,offboardingChecklistKeys,completeOffboardingChecklist,plannedOffboarding,readyOffboarding,completedOffboarding,
 manyOffboardingRecords} from '../../../support/platformTenantOffboardingFixture';
const root=(p:Page)=>p.locator('.platform-tenant-offboarding');
const section=(p:Page,name:string)=>root(p).locator('section.platform-tenant-offboarding__section').filter({has:p.getByRole('heading',{name,exact:true})});
const filters=(p:Page)=>section(p,'Filter offboarding registry');
const editor=(p:Page)=>p.locator('#platform-tenant-offboarding-form');
const evidence=(p:Page)=>section(p,'Selected tenant blocker evidence');
const listing=(p:Page)=>section(p,'Offboarding workflow evidence');
const cards=(p:Page)=>listing(p).locator('article.platform-tenant-offboarding__card');
const card=(p:Page,name:string)=>cards(p).filter({has:p.getByRole('heading',{name,exact:true})});
const pager=(p:Page)=>listing(p).locator('.platform-tenant-offboarding__pagination');
const omit=(...names:string[])=>offboardingPermissions.filter(v=>!names.includes(v));
const ready=(p:Page)=>card(p,readyOffboarding.tenant_name);
const planned=(p:Page)=>card(p,plannedOffboarding.tenant_name);

test.describe('Platform Tenant Offboarding — workflow registry and evidence (BATCH_088_GENERATED_UNRUN)',()=>{
 test('PTOFF-001 Route states application completion does not prove external outcomes',async({page})=>{
  await openTenantOffboarding(page);await expect(root(page).locator('.platform-tenant-offboarding__truth-note')).toContainText('does not prove customer notification');
  await expect(root(page)).toContainText('Not proof of external closure');
 });
 test('PTOFF-002 Initial list requests limit fifty offset zero and history inclusion',async({page})=>{
  const requests:string[]=[];await openTenantOffboarding(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===offboardingRoot)requests.push(q.toString());}});
  await expect.poll(()=>requests.length).toBeGreaterThan(0);const q=new URLSearchParams(requests.at(-1));
  expect(q.get('limit')).toBe('50');expect(q.get('offset')).toBe('0');expect(q.get('include_completed')).toBe('true');
 });
 test('PTOFF-003 Missing tenant read grant prevents route and list GET',async({page})=>{
  const hits:string[]=[];await openTenantOffboarding(page,{permissions:omit('platform.tenants.read'),expectHeading:false,
   onCall:(m,p)=>{if(m==='GET'&&p===offboardingRoot)hits.push(p);}});
  await expect(root(page)).toHaveCount(0);expect(hits).toHaveLength(0);
 });
 test('PTOFF-004 Without tenant update grant registry is visible but mutations are hidden',async({page})=>{
  await openTenantOffboarding(page,{permissions:omit('platform.tenants.update')});
  await expect(planned(page)).toBeVisible();await expect(editor(page)).toHaveCount(0);
  await expect(filters(page).getByRole('button',{name:'Start workflow'})).toHaveCount(0);
  await expect(planned(page).getByRole('button',{name:'Edit details'})).toHaveCount(0);
 });
 test('PTOFF-005 Owner filter is restricted without Platform-user read permission',async({page})=>{
  await openTenantOffboarding(page,{permissions:omit('platform.users.read')});
  await expect(filters(page)).toContainText('Owner filter restricted');await expect(filters(page).getByLabel('Owner')).toHaveCount(0);
 });
 test('PTOFF-006 Owner directory is shown when platform users are readable',async({page})=>{
  await openTenantOffboarding(page);await expect(filters(page).getByLabel('Owner')).toBeVisible();
  await expect(filters(page).getByLabel('Owner').locator('option')).toContainText(['All owners','owner@fixture.test','inactive@fixture.test']);
 });
 test('PTOFF-007 Registry-wide total differs from a fifty-row page',async({page})=>{
  await openTenantOffboarding(page,{records:manyOffboardingRecords(56)});
  await expect(cards(page)).toHaveCount(50);await expect(root(page).getByLabel('Tenant offboarding registry summary')).toContainText('56');
 });
 test('PTOFF-008 Stats distinguish blocked, ready, completed and checklist totals',async({page})=>{
  await openTenantOffboarding(page);const stats=root(page).getByLabel('Tenant offboarding registry summary');
  await expect(stats).toContainText('Blocked');await expect(stats).toContainText('Ready to archive');
  await expect(stats).toContainText('Checklist complete');await expect(stats).toContainText('Completed');
 });
 test('PTOFF-009 Tenant filter offers source-backed UUID options',async({page})=>{
  await openTenantOffboarding(page);const options=await filters(page).getByLabel('Tenant').locator('option').evaluateAll(nodes=>nodes.map(n=>(n as HTMLOptionElement).value));
  expect(options).toContain(offboardingTenantA);expect(options).toContain(offboardingTenantB);expect(options).toContain(offboardingTenantC);
 });
 test('PTOFF-010 Status filter offers all seven backend-listed workflow statuses',async({page})=>{
  await openTenantOffboarding(page);const values=await filters(page).getByLabel('Status').locator('option').evaluateAll(nodes=>nodes.map(n=>(n as HTMLOptionElement).value));
  expect(values).toEqual(['','not_started','planned','in_progress','blocked','ready_to_archive','completed','cancelled']);
 });
 test('PTOFF-011 Search persists in URL and filters tenant, reason or notes',async({page})=>{
  await openTenantOffboarding(page);await filters(page).getByLabel('Search').fill('Synthetic checklist recorded');
  await expect(cards(page)).toHaveCount(1);await expect(ready(page)).toBeVisible();
  expect(new URL(page.url()).searchParams.get('search')).toBe('Synthetic checklist recorded');
 });
 test('PTOFF-012 Status selection scopes query and results',async({page})=>{
  const queries:string[]=[];await openTenantOffboarding(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===offboardingRoot)queries.push(q.toString());}});
  await filters(page).getByLabel('Status').selectOption('blocked');await expect(cards(page)).toHaveCount(1);
  expect(new URLSearchParams(queries.at(-1)).get('status')).toBe('blocked');
 });
 test('PTOFF-013 Unchecking history excludes completed or cancelled workflows',async({page})=>{
  const queries:string[]=[];await openTenantOffboarding(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===offboardingRoot)queries.push(q.toString());}});
  await filters(page).getByLabel('Include completed/cancelled history').uncheck();
  await expect(cards(page)).toHaveCount(3);expect(new URLSearchParams(queries.at(-1)).get('include_completed')).toBe('false');
 });
 test('PTOFF-014 Owner selection emits the expected scoped identifier',async({page})=>{
  const queries:string[]=[];await openTenantOffboarding(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===offboardingRoot)queries.push(q.toString());}});
  await filters(page).getByLabel('Owner').selectOption(offboardingOwnerId);await expect(cards(page)).toHaveCount(4);
  expect(new URLSearchParams(queries.at(-1)).get('owner_platform_user_id')).toBe(offboardingOwnerId);
 });
 test('PTOFF-015 Existing URL status and search filters survive reload',async({page})=>{
  await openTenantOffboarding(page,{query:'status=planned&search=Alpha'});
  await expect(filters(page).getByLabel('Status')).toHaveValue('planned');await expect(filters(page).getByLabel('Search')).toHaveValue('Alpha');
  await expect(cards(page)).toHaveCount(1);
 });
 test('PTOFF-016 Tenant filter triggers separate selected-tenant blocker read',async({page})=>{
  const paths:string[]=[];await openTenantOffboarding(page,{onCall:(m,p)=>{if(m==='GET')paths.push(p);}});
  await filters(page).getByLabel('Tenant').selectOption(offboardingTenantB);
  await expect(evidence(page)).toBeVisible();await expect.poll(()=>paths.includes(`${offboardingRoot}/${offboardingTenantB}`)).toBe(true);
  await expect(cards(page)).toHaveCount(1);
 });
 test('PTOFF-017 Selected-ready tenant shows independently loaded blocker metrics',async({page})=>{
  await openTenantOffboarding(page,{query:`tenant_id=${offboardingTenantB}`});
  await expect(evidence(page)).toContainText('Tenant sessions');await expect(evidence(page)).toContainText('Legal hold');
  await expect(evidence(page)).toContainText('No hard application blockers are visible');
 });
 test('PTOFF-018 Selected-blocked tenant shows hard blocker count without passing readiness',async({page})=>{
  await openTenantOffboarding(page,{query:`tenant_id=${offboardingTenantA}`});
  await expect(evidence(page)).toContainText('hard application blockers remain');
  await expect(evidence(page)).not.toContainText('No hard application blockers are visible');
 });
 test('PTOFF-019 Without sessions evidence the metric displays Restricted not zero',async({page})=>{
  await openTenantOffboarding(page,{query:`tenant_id=${offboardingTenantA}`,permissions:omit('platform.sessions.read')});
  await expect(evidence(page)).toContainText('Completion evidence is partial.');
  await expect(evidence(page).locator('.platform-tenant-offboarding__metrics-grid')).toContainText('Restricted');
 });
 test('PTOFF-020 Missing support permission removes source link and blocks completion evidence',async({page})=>{
  await openTenantOffboarding(page,{query:`tenant_id=${offboardingTenantB}`,permissions:omit('platform.support_sessions.read')});
  await expect(evidence(page).getByRole('link',{name:'Support sessions'})).toHaveCount(0);
  await expect(evidence(page)).toContainText('Completion evidence is partial.');
 });
 test('PTOFF-021 Without retention read grant the legal-hold check is restricted',async({page})=>{
  await openTenantOffboarding(page,{query:`tenant_id=${offboardingTenantB}`,permissions:omit('platform.data_retention.read')});
  await expect(evidence(page).getByRole('link',{name:'Data retention'})).toHaveCount(0);
  await expect(evidence(page).locator('.platform-tenant-offboarding__metrics-grid')).toContainText('Restricted');
 });
 test('PTOFF-022 Tenant exports evidence link requires TENANTS_EXPORT',async({page})=>{
  await openTenantOffboarding(page,{query:`tenant_id=${offboardingTenantB}`,permissions:omit('platform.tenants.export')});
  await expect(evidence(page).getByRole('link',{name:'Tenant exports'})).toHaveCount(0);
  await expect(evidence(page).getByRole('link',{name:'Tenant tasks'})).toBeVisible();
 });
 test('PTOFF-023 Audit evidence link requires AUDIT_READ',async({page})=>{
  await openTenantOffboarding(page,{query:`tenant_id=${offboardingTenantB}`,permissions:omit('platform.audit.read')});
  await expect(evidence(page).getByRole('link',{name:'Audit'})).toHaveCount(0);
 });
 test('PTOFF-024 Without user-read permission owner identity is redacted but linkage shown',async({page})=>{
  await openTenantOffboarding(page,{permissions:omit('platform.users.read')});
  await expect(planned(page)).toContainText('Restricted Platform-user linkage');await expect(root(page)).not.toContainText('owner@fixture.test');
 });
 test('PTOFF-025 Tenant card links retain tenant UUID but never imply external completion',async({page})=>{
  await openTenantOffboarding(page);await expect(planned(page).getByRole('link',{name:'Tenant'})).toHaveAttribute('href',`/platform/tenants?tenant_id=${offboardingTenantA}`);
  await expect(root(page).locator('.platform-tenant-offboarding__truth-note')).toContainText('backup deletion');
 });
 test('PTOFF-026 First page is capped at fifty workflow records',async({page})=>{
  await openTenantOffboarding(page,{records:manyOffboardingRecords(53)});
  await expect(cards(page)).toHaveCount(50);await expect(pager(page)).toContainText('53 filtered total');
 });
 test('PTOFF-027 Next requests offset fifty and remaining records',async({page})=>{
  const queries:string[]=[];await openTenantOffboarding(page,{records:manyOffboardingRecords(53),onCall:(m,p,q)=>{if(m==='GET'&&p===offboardingRoot)queries.push(q.toString());}});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect(cards(page)).toHaveCount(3);
  expect(new URLSearchParams(queries.at(-1)).get('offset')).toBe('50');
 });
 test('PTOFF-028 Previous returns to first page after advancing',async({page})=>{
  await openTenantOffboarding(page,{records:manyOffboardingRecords(51)});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect(cards(page)).toHaveCount(1);
  await pager(page).getByRole('button',{name:'Previous'}).click();await expect(cards(page)).toHaveCount(50);
 });
 test('PTOFF-029 Changing search removes stale page offset',async({page})=>{
  await openTenantOffboarding(page,{records:manyOffboardingRecords(53)});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect(cards(page)).toHaveCount(3);
  await filters(page).getByLabel('Search').fill('Offboarding Fixture 001');await expect(cards(page)).toHaveCount(1);
  expect(new URL(page.url()).searchParams.has('offset')).toBe(false);
 });
 test('PTOFF-030 Empty registry says external offboarding may still exist',async({page})=>{
  await openTenantOffboarding(page,{records:[]});await expect(listing(page)).toContainText('No matching application workflows.');
  await expect(listing(page)).toContainText('does not prove that no external customer offboarding activity exists');
 });
 test('PTOFF-031 Start workflow is displayed only to tenant-update operators',async({page})=>{
  await openTenantOffboarding(page);await filters(page).getByRole('button',{name:'Start workflow'}).click();
  await expect(editor(page)).toBeVisible();await expect(editor(page)).toContainText('New workflows always start Planned.');
 });
 test('PTOFF-032 Create remains disabled until a tenant is selected',async({page})=>{
  await openTenantOffboarding(page);await expect(editor(page).getByRole('button',{name:'Create Planned workflow'})).toBeDisabled();
 });
 test('PTOFF-033 Archived tenant is unavailable for newly planned offboarding',async({page})=>{
  await openTenantOffboarding(page);await expect(editor(page).getByLabel('Tenant').locator(`option[value="${offboardingTenantC}"]`)).toBeDisabled();
 });
 test('PTOFF-034 Valid create submits a Planned workflow with tenant identity',async({page})=>{
  let body:any;let path='';await openTenantOffboarding(page,{records:[plannedOffboarding],onCall:(m,p,q,b)=>{if(m==='POST'&&p===offboardingRoot){path=p;body=b;}}});
  await editor(page).getByLabel('Tenant').selectOption(offboardingTenantB);
  await editor(page).getByLabel('Reason').fill('Synthetic closure request');
  await editor(page).getByRole('button',{name:'Create Planned workflow'}).click();
  await expect.poll(()=>Boolean(body)).toBe(true);expect(path).toBe(offboardingRoot);expect(body.tenant_id).toBe(offboardingTenantB);
  expect(body).not.toHaveProperty('status');await expect(root(page)).toContainText('Offboarding workflow created in Planned status.');
 });
 test('PTOFF-035 Create trims reason and notes before serializing payload',async({page})=>{
  let body:any;await openTenantOffboarding(page,{records:[plannedOffboarding],onCall:(m,p,q,b)=>{if(m==='POST'&&p===offboardingRoot)body=b;}});
  await editor(page).getByLabel('Tenant').selectOption(offboardingTenantB);
  await editor(page).getByLabel('Reason').fill('  Customer closure request  ');
  await editor(page).getByLabel('Notes').fill('  Fixture checklist record  ');
  await editor(page).getByRole('button',{name:'Create Planned workflow'}).click();
  await expect.poll(()=>Boolean(body)).toBe(true);expect(body.reason).toBe('Customer closure request');expect(body.notes).toBe('Fixture checklist record');
 });
 test('PTOFF-036 Authorized owner selector transmits owner UUID',async({page})=>{
  let body:any;await openTenantOffboarding(page,{records:[plannedOffboarding],onCall:(m,p,q,b)=>{if(m==='POST'&&p===offboardingRoot)body=b;}});
  await editor(page).getByLabel('Tenant').selectOption(offboardingTenantB);
  await editor(page).getByLabel('Owner').selectOption(offboardingOwnerId);await editor(page).getByRole('button',{name:'Create Planned workflow'}).click();
  await expect.poll(()=>Boolean(body)).toBe(true);expect(body.owner_platform_user_id).toBe(offboardingOwnerId);
 });
 test('PTOFF-037 Without user-read permission create omits owner linkage entirely',async({page})=>{
  let body:any;await openTenantOffboarding(page,{permissions:omit('platform.users.read'),records:[plannedOffboarding],onCall:(m,p,q,b)=>{if(m==='POST'&&p===offboardingRoot)body=b;}});
  await editor(page).getByLabel('Tenant').selectOption(offboardingTenantB);
  await expect(editor(page)).toContainText('Owner linkage preserved');await editor(page).getByRole('button',{name:'Create Planned workflow'}).click();
  await expect.poll(()=>Boolean(body)).toBe(true);expect(body).not.toHaveProperty('owner_platform_user_id');
 });
 test('PTOFF-038 Checklist is serialized as operator assertions in ordinary create',async({page})=>{
  let body:any;await openTenantOffboarding(page,{records:[plannedOffboarding],onCall:(m,p,q,b)=>{if(m==='POST'&&p===offboardingRoot)body=b;}});
  await editor(page).getByLabel('Tenant').selectOption(offboardingTenantB);
  await editor(page).getByLabel('Customer notified').check();await editor(page).getByLabel('Billing closed').check();
  await editor(page).getByRole('button',{name:'Create Planned workflow'}).click();await expect.poll(()=>Boolean(body)).toBe(true);
  expect(body.checklist.customer_notified).toBe(true);expect(body.checklist.billing_closed).toBe(true);
  expect(Object.keys(body.checklist).sort()).toEqual([...offboardingChecklistKeys].sort());
 });
 test('PTOFF-039 Editing existing workflow excludes immutable status and tenant identity',async({page})=>{
  let body:any;let method='';let path='';await openTenantOffboarding(page,{onCall:(m,p,q,b)=>{if(m==='PATCH'){method=m;path=p;body=b;}}});
  await planned(page).getByRole('button',{name:'Edit details'}).click();await editor(page).getByLabel('Notes').fill('Changed synthetic notes');
  await editor(page).getByRole('button',{name:'Save details'}).click();await expect.poll(()=>Boolean(body)).toBe(true);
  expect(method).toBe('PATCH');expect(path).toBe(`${offboardingRoot}/${offboardingTenantA}`);
  expect(body).not.toHaveProperty('status');expect(body).not.toHaveProperty('tenant_id');
 });
 test('PTOFF-040 Cancel edit restores create mode without mutation',async({page})=>{
  const writes:string[]=[];await openTenantOffboarding(page,{onCall:(m,p)=>{if(m==='PATCH')writes.push(p);}});
  await planned(page).getByRole('button',{name:'Edit details'}).click();await editor(page).getByLabel('Notes').fill('Unsaved synthetic note');
  await editor(page).getByRole('button',{name:'Cancel edit'}).click();await expect(editor(page).getByRole('button',{name:'Create Planned workflow'})).toBeVisible();
  expect(writes).toHaveLength(0);
 });
 test('PTOFF-041 Ready-to-archive action requires confirmation and recorded checklist',async({page})=>{
  const writes:string[]=[];const checked={...plannedOffboarding,checklist:completeOffboardingChecklist(),checklist_complete:true};
  await openTenantOffboarding(page,{records:[checked],onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/status'))writes.push(p);}});
  await expect(planned(page).getByRole('button',{name:'Record ready to archive'})).toBeEnabled();
  let prompt='';page.once('dialog',d=>{prompt=d.message();void d.dismiss();});
  await planned(page).getByRole('button',{name:'Record ready to archive'}).click();
  expect(prompt).toContain('reviewing the application blocker evidence');expect(writes).toHaveLength(0);
 });
});

// Batch 89: continuation of the source-traced offboarding page. The eleven marked
// Phase 2 obligations below are intentionally NOT claimed as synthetic browser proof.
test.describe('Platform Tenant Offboarding — lifecycle and failure paths (BATCH_089_GENERATED_UNRUN)',()=>{
 const statusPath=(id:string)=>`${offboardingRoot}/${id}/status`;
 const closePath=(id:string,action:string)=>`${offboardingRoot}/${id}/${action}`;
 test('PTOFF-042 Status transitions use dedicated POST and do not mutate checklist fields',async({page})=>{
  const writes:any[]=[];await openTenantOffboarding(page,{onCall:(m,p,q,b)=>{if(m==='POST')writes.push({m,p,b});}});
  await planned(page).getByRole('button',{name:'In progress'}).click();await expect.poll(()=>writes.length).toBe(1);
  expect(writes[0]).toMatchObject({m:'POST',p:statusPath(offboardingTenantA),b:{status:'in_progress'}});
  expect(Object.keys(writes[0].b)).toEqual(['status']);
 });
 test('PTOFF-043 Non-ready status changes proceed without a confirmation dialog',async({page})=>{
  let calls=0,dialogs=0;await openTenantOffboarding(page,{onCall:(m,p)=>{if(m==='POST'&&p===statusPath(offboardingTenantA))calls++;}});
  page.on('dialog',d=>{dialogs++;void d.dismiss();});await planned(page).getByRole('button',{name:'Blocked'}).click();
  await expect.poll(()=>calls).toBe(1);expect(dialogs).toBe(0);
 });
 test('PTOFF-044 Ready-to-archive confirmation cancellation issues no write',async({page})=>{
  let writes=0;await openTenantOffboarding(page,{records:[{...plannedOffboarding,checklist:completeOffboardingChecklist()}],
   onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/status'))writes++;}});
  page.once('dialog',d=>void d.dismiss());await planned(page).getByRole('button',{name:'Record ready to archive'}).click();expect(writes).toBe(0);
 });
 test('PTOFF-045 Ready-to-archive confirmed transition sends exact status payload',async({page})=>{
  let body:any,route='';await openTenantOffboarding(page,{records:[{...plannedOffboarding,checklist:completeOffboardingChecklist()}],
   onCall:(m,p,q,b)=>{if(m==='POST'&&p.endsWith('/status')){route=p;body=b;}}});
  page.once('dialog',d=>void d.accept());await planned(page).getByRole('button',{name:'Record ready to archive'}).click();
  await expect.poll(()=>Boolean(body)).toBe(true);expect(route).toBe(statusPath(offboardingTenantA));expect(body).toEqual({status:'ready_to_archive'});
 });
 test('PTOFF-046 Incomplete checklist prevents ready-to-archive action',async({page})=>{
  await openTenantOffboarding(page);await expect(planned(page).getByRole('button',{name:'Record ready to archive'})).toBeDisabled();
 });
 test('PTOFF-047 Missing completion-evidence permission prevents readiness transition',async({page})=>{
  await openTenantOffboarding(page,{permissions:omit('platform.sessions.read'),records:[{...plannedOffboarding,checklist:completeOffboardingChecklist()}]});
  await expect(planned(page).getByRole('button',{name:'Record ready to archive'})).toBeDisabled();
 });
 test.skip('PTOFF-048 Backend blocks ready state with active sessions even if checklist complete',async()=>{
  // Phase 2: direct authenticated HTTP and PostgreSQL; a routed UI mock cannot certify this check.
 });
 test.skip('PTOFF-049 Backend blocks ready state with unresolved tenant tasks',async()=>{
  // Phase 2: create actual task blocker and independently confirm server denial.
 });
 test.skip('PTOFF-050 Backend blocks ready state with open incidents or support sessions',async()=>{
  // Phase 2: authenticated independent blocker references in disposable database.
 });
 test.skip('PTOFF-051 Backend blocks ready state when a legal hold exists',async()=>{
  // Phase 2: real legal-hold transaction; never claim deletion policy or legality from a mock.
 });
 test('PTOFF-052 Completion requires confirmation and does not infer external customer closure',async({page})=>{
  let count=0;await openTenantOffboarding(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/complete'))count++;}});
  page.once('dialog',d=>{expect(d.message()).toContain('External outcomes are not proven');void d.accept();});
  await ready(page).getByRole('button',{name:'Complete offboarding'}).click();await expect.poll(()=>count).toBe(1);
  await expect(root(page)).toContainText('Not proof of external closure');
 });
 test('PTOFF-053 Completion with archive flag writes true only with TENANTS_LOCK',async({page})=>{
  let body:any;await openTenantOffboarding(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===closePath(offboardingTenantB,'complete'))body=b;}});
  await ready(page).getByLabel('Archive + write-lock tenant on completion').check();page.once('dialog',d=>void d.accept());
  await ready(page).getByRole('button',{name:'Complete offboarding'}).click();await expect.poll(()=>Boolean(body)).toBe(true);
  expect(body).toEqual({archive_tenant:true});
 });
 test('PTOFF-054 Completion without archive flag preserves tenant lifecycle state',async({page})=>{
  let body:any;await openTenantOffboarding(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===closePath(offboardingTenantB,'complete'))body=b;}});
  await ready(page).getByLabel('Archive + write-lock tenant on completion').uncheck();
  page.once('dialog',d=>void d.accept());await ready(page).getByRole('button',{name:'Complete offboarding'}).click();
  await expect.poll(()=>Boolean(body)).toBe(true);expect(body).toEqual({archive_tenant:false});
  await expect(ready(page)).toContainText('Tenant not locked');
 });
 test('PTOFF-055 Complete action disabled if a required evidence family is restricted',async({page})=>{
  await openTenantOffboarding(page,{permissions:omit('platform.data_retention.read')});
  await expect(ready(page).getByRole('button',{name:'Complete offboarding'})).toBeDisabled();
 });
 test('PTOFF-056 Archive checkbox disabled without TENANTS_LOCK and defaults false',async({page})=>{
  await openTenantOffboarding(page,{permissions:omit('platform.tenants.lock')});
  const box=ready(page).getByLabel(/Archive \+ write-lock tenant on completion/);
  await expect(box).not.toBeChecked();await expect(box).toBeDisabled();
  await expect(ready(page)).toContainText('TENANTS_LOCK required');
 });
 test('PTOFF-057 Completion failure preserves workflow and reports error',async({page})=>{
  await openTenantOffboarding(page,{overrides:{[`POST ${closePath(offboardingTenantB,'complete')}`]:{status:409,json:{message:'Synthetic blocker remains'}}}});
  page.once('dialog',d=>void d.accept());await ready(page).getByRole('button',{name:'Complete offboarding'}).click();
  await expect(root(page)).toContainText('Action failed.');await expect(ready(page)).toContainText('Ready to archive');
  await expect(ready(page).getByRole('button',{name:'Complete offboarding'})).toBeVisible();
 });
 test('PTOFF-058 Cancelled completion confirmation performs no POST',async({page})=>{
  const requests:string[]=[];await openTenantOffboarding(page,{onCall:(m,p)=>{if(m==='POST')requests.push(p);}});
  page.once('dialog',d=>void d.dismiss());await ready(page).getByRole('button',{name:'Complete offboarding'}).click();
  expect(requests).toHaveLength(0);await expect(ready(page)).toContainText('Ready to archive');
 });
 test('PTOFF-059 Cancellation prompts for confirmation and rejects dismissal',async({page})=>{
  const writes:string[]=[];await openTenantOffboarding(page,{onCall:(m,p)=>{if(m==='POST')writes.push(p);}});
  let prompt='';page.once('dialog',d=>{prompt=d.message();void d.dismiss();});
  await planned(page).getByRole('button',{name:'Cancel workflow'}).click();
  expect(prompt).toContain('Tenant lifecycle status will not be changed');expect(writes).toHaveLength(0);
 });
 test('PTOFF-060 Cancellation POST sends trimmed optional reason',async({page})=>{
  let body:any,endpoint='';await openTenantOffboarding(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p.endsWith('/cancel')){body=b;endpoint=p;}}});
  await planned(page).getByPlaceholder('Optional cancellation reason').fill('  operator request  ');
  page.once('dialog',d=>void d.accept());await planned(page).getByRole('button',{name:'Cancel workflow'}).click();
  await expect.poll(()=>Boolean(body)).toBe(true);expect(endpoint).toBe(closePath(offboardingTenantA,'cancel'));expect(body).toEqual({reason:'operator request'});
 });
 test('PTOFF-061 Cancelling workflow does not restore or mutate tenant lifecycle',async({page})=>{
  await openTenantOffboarding(page);page.once('dialog',d=>void d.accept());
  await planned(page).getByRole('button',{name:'Cancel workflow'}).click();
  await expect(planned(page)).toContainText('Cancelled');await expect(planned(page)).toContainText('active');
  await expect(root(page)).toContainText('Tenant lifecycle status was not changed automatically.');
 });
 test('PTOFF-062 Terminal completed row exposes immutable history without edit/status actions',async({page})=>{
  await openTenantOffboarding(page);const c=card(page,completedOffboarding.tenant_name);
  await expect(c).toContainText('Terminal history is immutable.');
  await expect(c.getByRole('button',{name:'Edit details'})).toHaveCount(0);
  await expect(c.getByRole('button',{name:'Cancel workflow'})).toHaveCount(0);
  await expect(c).toContainText('Tenant locked');
 });
 test('PTOFF-063 Terminal cancelled row exposes immutable history without edit/status actions',async({page})=>{
  await openTenantOffboarding(page,{records:[{...plannedOffboarding,status:'cancelled'}]});
  await expect(planned(page)).toContainText('Terminal history is immutable.');
  await expect(planned(page).getByRole('button',{name:'Edit details'})).toHaveCount(0);
  await expect(planned(page).getByRole('button',{name:'Cancel workflow'})).toHaveCount(0);
 });
 test('PTOFF-064 Create conflict displays server error without false success',async({page})=>{
  await openTenantOffboarding(page,{records:[plannedOffboarding],overrides:{[`POST ${offboardingRoot}`]:{status:409,json:{message:'Synthetic workflow already exists'}}}});
  await editor(page).getByLabel('Tenant').selectOption(offboardingTenantB);
  await editor(page).getByRole('button',{name:'Create Planned workflow'}).click();
  await expect(root(page)).toContainText('Action failed.');await expect(root(page)).not.toContainText('Offboarding workflow created in Planned status.');
 });
 test('PTOFF-065 Edit failure retains recorded row and open editor',async({page})=>{
  await openTenantOffboarding(page,{overrides:{[`PATCH ${offboardingRoot}/${offboardingTenantA}`]:{status:422,json:{message:'Synthetic invalid edit'}}}});
  await planned(page).getByRole('button',{name:'Edit details'}).click();await editor(page).getByLabel('Notes').fill('Not recorded yet');
  await editor(page).getByRole('button',{name:'Save details'}).click();
  await expect(root(page)).toContainText('Action failed.');await expect(editor(page).getByLabel('Notes')).toHaveValue('Not recorded yet');
  await expect(planned(page)).toContainText('Synthetic pending customer notice');
 });
 test('PTOFF-066 Status failure displays error and does not fabricate new state',async({page})=>{
  await openTenantOffboarding(page,{overrides:{[`POST ${statusPath(offboardingTenantA)}`]:{status:409,json:{message:'Backend denied status'}}}});
  await planned(page).getByRole('button',{name:'Blocked'}).click();
  await expect(root(page)).toContainText('Action failed.');await expect(planned(page)).toContainText('Planned');
 });
 test('PTOFF-067 List initial load failure shows retry without fabricated statistics',async({page})=>{
  await openTenantOffboarding(page,{overrides:{[`GET ${offboardingRoot}`]:{status:503,json:{message:'Registry temporarily unavailable'}}}});
  await expect(listing(page)).toContainText('Tenant offboarding could not be loaded.');
  await expect(listing(page).getByRole('button',{name:'Retry'})).toBeVisible();
  await expect(cards(page)).toHaveCount(0);
 });
 test('PTOFF-068 List refresh failure preserves the most recent valid snapshot',async({page})=>{
  let count=0;await openTenantOffboarding(page,{respond:(m,p)=>{if(m==='GET'&&p===offboardingRoot&&++count>1)return {status:503,json:{message:'Stale synthetic registry'}};}});
  await expect(planned(page)).toBeVisible();await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(root(page)).toContainText('Showing the last successful snapshot.');await expect(planned(page)).toBeVisible();
 });
 test('PTOFF-069 List retry after failure restores registry records',async({page})=>{
  let attempts=0;await openTenantOffboarding(page,{respond:(m,p)=>{if(m==='GET'&&p===offboardingRoot&&++attempts===1)return {status:503,json:{message:'Transient registry failure'}};}});
  await listing(page).getByRole('button',{name:'Retry'}).click();await expect(planned(page)).toBeVisible();
  expect(attempts).toBeGreaterThanOrEqual(2);
 });
 test('PTOFF-070 Detail load failure shows selected evidence retry independently',async({page})=>{
  await openTenantOffboarding(page,{query:`tenant_id=${offboardingTenantB}`,overrides:{[`GET ${offboardingRoot}/${offboardingTenantB}`]:{status:503,json:{message:'Evidence unavailable'}}}});
  await expect(evidence(page)).toContainText('Selected tenant evidence could not be loaded.');
  await expect(evidence(page).getByRole('button',{name:'Retry'})).toBeVisible();
  await expect(ready(page)).toBeVisible();
 });
 test('PTOFF-071 Detail retry after failed blocker fetch restores evidence view',async({page})=>{
  let attempts=0;await openTenantOffboarding(page,{query:`tenant_id=${offboardingTenantB}`,respond:(m,p)=>{if(m==='GET'&&p===`${offboardingRoot}/${offboardingTenantB}`&&++attempts===1)return {status:503,json:{message:'Retry evidence'}};}});
  await evidence(page).getByRole('button',{name:'Retry'}).click();await expect(evidence(page)).toContainText('No hard application blockers are visible');
  expect(attempts).toBeGreaterThanOrEqual(2);
 });
 test('PTOFF-072 Invalid URL offset is clamped before API request',async({page})=>{
  const offsets:string[]=[];await openTenantOffboarding(page,{query:'offset=-150',onCall:(m,p,q)=>{if(m==='GET'&&p===offboardingRoot)offsets.push(q.get('offset')||'');}});
  await expect.poll(()=>offsets.length).toBeGreaterThan(0);expect(offsets[0]).toBe('0');
 });
 test('PTOFF-073 Filter changes discard offset and maintain owner visibility policy',async({page})=>{
  const queries:string[]=[];await openTenantOffboarding(page,{query:'offset=50',permissions:omit('platform.users.read'),records:manyOffboardingRecords(60),
   onCall:(m,p,q)=>{if(m==='GET'&&p===offboardingRoot)queries.push(q.toString());}});
  await filters(page).getByLabel('Status').selectOption('planned');
  await expect(page).not.toHaveURL(/offset=50/);await expect(filters(page).getByLabel('Owner')).toHaveCount(0);
  expect(new URLSearchParams(queries.at(-1)).get('owner_platform_user_id')).toBeNull();
 });
 test.skip('PTOFF-074 Permission-limited owner references cannot be changed by direct API client',async()=>{
  // Phase 2 authenticated backend permission checks; browser visibility is insufficient.
 });
 test.skip('PTOFF-075 Backend rejects ordinary payload status changes and owner assignment with missing grant',async()=>{
  // Phase 2 direct PATCH/POST server validation with independent users.
 });
 test.skip('PTOFF-076 Real backend tenant isolation and redacted owner identity across principals',async()=>{
  // Phase 2 two-tenant principals and real database required.
 });
 test.skip('PTOFF-077 Backend transaction atomicity of archive plus write lock on completion',async()=>{
  // Phase 2 rollback injection/concurrent transactions in disposable PostgreSQL.
 });
 test.skip('PTOFF-078 Backend validates zero hard blockers and all ten checklist flags',async()=>{
  // Phase 2 real sessions, support, incidents, tasks, hold rows and checklist validators.
 });
 test.skip('PTOFF-079 Real audit durability and cancellation/terminal immutability under concurrency',async()=>{
  // Phase 2 independent audit log and concurrent HTTP/SQL checks.
 });
 test.skip('PTOFF-080 External notice, export receipt, billing settlement and deletion require independent acceptance evidence',async()=>{
  // Phase 2 external receipts / retention and backup evidence; never inferred from UI.
 });

 // Batch 154: app registry fields cannot render executable content; no backend access assertion.
 test('PTOFF-081 A stored offboarding reason containing markup remains inert text',async({page})=>{
  const payload='<img src=x onerror=alert(1)> Pending notice';
  await openTenantOffboarding(page,{records:[{...plannedOffboarding,reason:payload}]});
  await expect(planned(page)).toContainText(payload);
  await expect(planned(page).locator('img,iframe,script')).toHaveCount(0);
 });
 test('PTOFF-082 Stored workflow notes containing markup remain inert text',async({page})=>{
  const payload='<svg onload=alert(1)> Private audit note';
  await openTenantOffboarding(page,{records:[{...plannedOffboarding,notes:payload}]});
  await expect(planned(page).locator('.platform-tenant-offboarding__evidence-note')).toContainText(payload);
  await expect(planned(page).locator('svg,iframe,script')).toHaveCount(0);
  await expect(root(page)).toContainText('Not proof of external closure');
 });

});
