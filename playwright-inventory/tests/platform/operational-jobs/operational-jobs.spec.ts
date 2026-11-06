/** Batch 80 source-based Platform Operational Jobs browser scenarios PJO-001..041.
 * All GENERATED_UNRUN. Intercepted application evidence cannot prove live scheduling, worker handlers,
 * PostgreSQL claims, tenant isolation, server ACL, external outcomes, or successful browser execution. */
import {test,expect,type Page} from '@playwright/test';
import {openJobs,jobPermissions,attentionJob,normalJob,archivedJob,jobHeartbeat,jobRun,
 manyJobs,jobId,jobRunbookId,jobOwnerId} from '../../../support/platformOperationalJobsFixture';
const root=(p:Page)=>p.locator('.platform-operational-jobs');
const section=(p:Page,name:string)=>root(p).locator('.platform-operational-jobs__section').filter({has:p.getByRole('heading',{name,exact:true})});
const filters=(p:Page)=>section(p,'Filters and worker controls');
const registry=(p:Page)=>section(p,'Operational job registry');
const cards=(p:Page)=>registry(p).locator('.platform-operational-jobs__card');
const card=(p:Page,name:string)=>cards(p).filter({has:p.getByRole('heading',{name,exact:true})});
const pager=(p:Page)=>registry(p).locator('.platform-operational-jobs__pagination');
const editor=(p:Page)=>p.locator('#platform-operational-jobs-form');
const without=(...denied:string[])=>jobPermissions.filter(x=>!denied.includes(x));
const endpoint='/platform/operational-jobs';

test.describe('Operational Jobs — source-scoped evidence and permissions (BATCH_080_GENERATED_UNRUN)',()=>{
 test('PJO-001 Protected Platform route renders Operational jobs registry',async({page})=>{
  await openJobs(page);await expect(root(page)).toContainText('Registry evidence');await expect(root(page)).toContainText('50 per page');
 });
 test('PJO-002 Evidence boundary rejects external handler outcome inference',async({page})=>{
  await openJobs(page);await expect(section(page,'Evidence boundary')).toContainText('does not certify backup integrity');
  await expect(section(page,'Evidence boundary')).toContainText('external outcome');
 });
 test('PJO-003 Registry metric total and filter explain page-independent scope',async({page})=>{
  await openJobs(page,{rows:manyJobs(51)});await expect(cards(page)).toHaveCount(50);
  await expect(section(page,'Filters and worker controls')).toContainText('whole filtered result');
  await expect(root(page)).toContainText('51 filtered jobs');
 });
 test('PJO-004 Read-only Platform role shows records but no editing and worker controls',async({page})=>{
  await openJobs(page,{permissions:without('platform.jobs.write')});await expect(card(page,attentionJob.name)).toBeVisible();
  await expect(editor(page)).toHaveCount(0);
  for(const label of ['Edit','Record run','Claim','Archive'])await expect(card(page,attentionJob.name).getByRole('button',{name:label,exact:true})).toHaveCount(0);
  await expect(filters(page).getByRole('button',{name:'Run worker once'})).toHaveCount(0);
 });
 test('PJO-005 Missing jobs read permission prevents registry GET',async({page})=>{
  const calls:string[]=[];await openJobs(page,{permissions:without('platform.jobs.read'),expectHeading:false,
   onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(root(page)).toHaveCount(0);await expect(page).toHaveURL(/\/platform\/?$/);expect(calls).toHaveLength(0);
 });
 test('PJO-006 Supporting links obey each destination permission',async({page})=>{
  await openJobs(page,{permissions:without('platform.runbooks.read','platform.notifications.read','platform.dependencies.read','platform.users.read','platform.audit.read')});
  const s=section(page,'Supporting operations');
  for(const label of ['Runbooks','Notifications','Service dependencies','Integration monitoring','Platform users','Platform audit'])
   await expect(s.getByRole('link',{name:label,exact:true})).toHaveCount(0);
  await expect(card(page,attentionJob.name)).toBeVisible();
 });
 test('PJO-007 Without user read, linked user email redacted but presence visible',async({page})=>{
  await openJobs(page,{permissions:without('platform.users.read')});
  await expect(card(page,attentionJob.name)).toContainText('Restricted Platform user');
  await expect(card(page,attentionJob.name)).not.toContainText('job-owner@fixture.test');
 });
 test('PJO-008 Without runbook read, linked runbook identity redacted',async({page})=>{
  await openJobs(page,{permissions:without('platform.runbooks.read')});
  await expect(card(page,attentionJob.name)).toContainText('Restricted runbook');
  await expect(card(page,attentionJob.name)).not.toContainText('Fixture Runbook');
  await expect(card(page,attentionJob.name).getByRole('link',{name:'Runbook evidence'})).toHaveCount(0);
 });
 test('PJO-009 Missing users read prevents supporting platform users fetch',async({page})=>{
  const calls:string[]=[];await openJobs(page,{permissions:without('platform.users.read'),onCall:(m,p)=>{if(p==='/platform/users')calls.push(m);}});
  await expect(editor(page)).toContainText('Owner identity restricted');expect(calls).toHaveLength(0);
 });
 test('PJO-010 Missing runbooks read skips runbooks directory request',async({page})=>{
  const calls:string[]=[];await openJobs(page,{permissions:without('platform.runbooks.read'),onCall:(m,p)=>{if(p==='/platform/runbooks')calls.push(m);}});
  await expect(editor(page)).toContainText('Runbook identity restricted');expect(calls).toHaveLength(0);
 });
 test('PJO-011 No worker heartbeats shows attention, not proven scheduler health',async({page})=>{
  await openJobs(page,{heartbeats:[]});await expect(root(page)).toContainText('Worker/scheduler evidence needs review');
  await expect(section(page,'Scheduler and worker state')).toContainText('No worker heartbeat has been recorded.');
 });
 test('PJO-012 Unhealthy heartbeat exposes stale and claim mismatch evidence',async({page})=>{
  await openJobs(page,{heartbeats:[jobHeartbeat]});const s=section(page,'Scheduler and worker state');
  await expect(s).toContainText('fixture-worker-01');await expect(root(page)).toContainText('Worker/scheduler evidence needs review');
 });
 test('PJO-013 Healthy recorded heartbeat changes hero label, not external status',async({page})=>{
  await openJobs(page,{heartbeats:[{...jobHeartbeat,is_stale:false,is_unhealthy_status:false,is_flapping:false,
   is_run_claim_mismatch:false,is_missing_source:false,status:'online'}]});
  await expect(root(page)).toContainText('Recorded healthy');
  await expect(section(page,'Scheduler and worker state')).toContainText('does not independently prove');
 });
 test('PJO-014 Due jobs evidence is separate from registry filtered result',async({page})=>{
  await openJobs(page,{due:[attentionJob],query:'search=NoMatchingJob'});
  await expect(cards(page)).toHaveCount(0);await expect(section(page,'Scheduler and worker state')).toContainText(attentionJob.name);
  await expect(section(page,'Scheduler and worker state')).toContainText('Due jobs');
 });
 test('PJO-015 Execution metrics reflect recorded status count, not live execution',async({page})=>{
  await openJobs(page);const s=section(page,'Worker execution evidence');
  await expect(s).toContainText('Total recorded runs');await expect(s).toContainText('Successful');await expect(s).toContainText('Failed');
  await expect(s).toContainText('last 14 days');
 });
 test('PJO-016 Failure leaderboard uses application run error evidence',async({page})=>{
  await openJobs(page);const s=section(page,'Worker execution evidence');await expect(s).toContainText(attentionJob.name);
  await expect(s).toContainText('3/3 failures');await expect(s).toContainText('Synthetic handler failure');
 });
 test('PJO-017 Slowest jobs list uses supplied run timing metadata',async({page})=>{
  await openJobs(page);const s=section(page,'Worker execution evidence');
  await expect(s).toContainText('Average 350 ms');await expect(s).toContainText('Max 900 ms');
 });
 test('PJO-018 Default worker definitions not proof of actual scheduled job',async({page})=>{
  await openJobs(page,{defaults:[{name:'Fixture only default',job_key:'fixture.default.only',category:'health_scan',
   worker_handler:'fixture.worker',recurrence_type:'minutes',schedule_label:'Every 10m'}],rows:[]});
  await expect(section(page,'Default worker coverage')).toContainText('Fixture only default');
  await expect(section(page,'Default worker coverage')).toContainText('does not prove');await expect(cards(page)).toHaveCount(0);
 });
 test('PJO-019 Empty defaults show no fabricated worker definitions',async({page})=>{
  await openJobs(page,{defaults:[]});await expect(section(page,'Default worker coverage').locator('article')).toHaveCount(0);
  await expect(section(page,'Default worker coverage')).toContainText('seed/reference definitions');
 });
 test('PJO-020 No matching registry is distinguished from successful external job outcome',async({page})=>{
  await openJobs(page,{query:'search=AbsentJob'});await expect(registry(page)).toContainText('No operational jobs match these filters.');
  await expect(section(page,'Evidence boundary')).toContainText('does not certify');
 });
});

test.describe('Operational Jobs — filters, pagination and hard boundaries (BATCH_080_GENERATED_UNRUN)',()=>{
 test('PJO-021 Default attention-only GET is explicit true',async({page})=>{
  const v:string[]=[];await openJobs(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)v.push(q.get('attention_only')||'');}});
  await expect(filters(page).getByLabel('Attention only')).toBeChecked();expect(v).toContain('true');
 });
 test('PJO-022 Disabling attention displays routine job and passes false',async({page})=>{
  const v:string[]=[];await openJobs(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)v.push(q.get('attention_only')||'');}});
  await filters(page).getByLabel('Attention only').uncheck();await expect(card(page,normalJob.name)).toBeVisible();
  await expect.poll(()=>v.at(-1)).toBe('false');
 });
 test('PJO-023 Category filter forwards backend category enum',async({page})=>{
  const v:string[]=[];await openJobs(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)v.push(q.get('category')||'');}});
  await filters(page).getByLabel('Category').selectOption('backup');await expect(card(page,attentionJob.name)).toBeVisible();
  await expect.poll(()=>v.at(-1)).toBe('backup');
 });
 test('PJO-024 Status filter selects degraded jobs only',async({page})=>{
  await openJobs(page,{query:'attention_only=false'});await filters(page).getByLabel('Status').selectOption('degraded');
  await expect(card(page,attentionJob.name)).toBeVisible();await expect(card(page,normalJob.name)).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('status')).toBe('degraded');
 });
 test('PJO-025 Search filters job key and persists URL',async({page})=>{
  await openJobs(page,{query:'attention_only=false'});await filters(page).getByLabel('Search').fill('fixture.routine.job');
  await expect(card(page,normalJob.name)).toBeVisible();await expect(card(page,attentionJob.name)).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('search')).toBe('fixture.routine.job');
 });
 test('PJO-026 Archived rows require include-archived and attention false',async({page})=>{
  await openJobs(page,{query:'attention_only=false',rows:[archivedJob]});await expect(cards(page)).toHaveCount(0);
  await filters(page).getByLabel('Include archived').check();await expect(card(page,archivedJob.name)).toBeVisible();
  await expect(card(page,archivedJob.name)).toContainText('Archived — immutable');
 });
 test('PJO-027 Invalid category URL prevents list transport and offers clear',async({page})=>{
  const calls:string[]=[];await openJobs(page,{query:'category=invalid',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(root(page)).toContainText('One or more URL filters are invalid.');expect(calls).toHaveLength(0);
 });
 test('PJO-028 Invalid status URL prevents list transport',async({page})=>{
  const calls:string[]=[];await openJobs(page,{query:'status=impossible',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(root(page)).toContainText('Clear invalid filters');expect(calls).toHaveLength(0);
 });
 test('PJO-029 Invalid attention boolean URL blocks list GET',async({page})=>{
  const calls:string[]=[];await openJobs(page,{query:'attention_only=maybe',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(root(page)).toContainText('invalid.');expect(calls).toHaveLength(0);
 });
 test('PJO-030 Invalid archived boolean URL blocks list GET',async({page})=>{
  const calls:string[]=[];await openJobs(page,{query:'include_archived=all',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(root(page)).toContainText('Clear invalid filters');expect(calls).toHaveLength(0);
 });
 test('PJO-031 URL search over 200 characters blocks list GET',async({page})=>{
  const calls:string[]=[];await openJobs(page,{query:`search=${'X'.repeat(201)}`,onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(root(page)).toContainText('One or more URL filters are invalid.');expect(calls).toHaveLength(0);
 });
 test('PJO-032 Clearing invalid filters restores default attention and request',async({page})=>{
  const calls:string[]=[];await openJobs(page,{query:'category=invalid',onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)calls.push(q.get('attention_only')||'');}});
  await root(page).getByRole('button',{name:'Clear invalid filters'}).click();await expect(card(page,attentionJob.name)).toBeVisible();
  expect(calls).toContain('true');await expect(filters(page).getByLabel('Attention only')).toBeChecked();
 });
 test('PJO-033 Registry fetch size is 50 and summary remains full',async({page})=>{
  const limits:string[]=[];await openJobs(page,{rows:manyJobs(51),onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)limits.push(q.get('limit')||'');}});
  await expect(cards(page)).toHaveCount(50);expect(limits).toContain('50');await expect(pager(page)).toContainText('1-50 of 51');
 });
 test('PJO-034 Next registry page requests offset 50',async({page})=>{
  const offsets:string[]=[];await openJobs(page,{rows:manyJobs(51),onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)offsets.push(q.get('offset')||'');}});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect(card(page,'Fixture Job 051')).toBeVisible();expect(offsets).toContain('50');
 });
 test('PJO-035 Final page disables Next and Previous returns first',async({page})=>{
  await openJobs(page,{rows:manyJobs(51)});await pager(page).getByRole('button',{name:'Next'}).click();
  await expect(pager(page).getByRole('button',{name:'Next'})).toBeDisabled();await pager(page).getByRole('button',{name:'Previous'}).click();
  await expect(card(page,'Fixture Job 001')).toBeVisible();
 });
 test('PJO-036 Filter change resets list offset to zero',async({page})=>{
  const offsets:string[]=[];await openJobs(page,{rows:manyJobs(51),onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)offsets.push(q.get('offset')||'');}});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect(card(page,'Fixture Job 051')).toBeVisible();
  await filters(page).getByLabel('Category').selectOption('backup');await expect.poll(()=>offsets.at(-1)).toBe('0');
 });
 test('PJO-037 Initial failed registry GET shows Retry and recovers',async({page})=>{
  let recover=false;await openJobs(page,{respond:(m,p)=>{
   if(m==='GET'&&p===endpoint&&!recover)return {status:503,json:{message:'Synthetic operational jobs outage'}};
  }});
  await expect(root(page)).toContainText('Operational job registry could not be loaded.');
  recover=true;await root(page).getByRole('button',{name:'Retry'}).click();await expect(card(page,attentionJob.name)).toBeVisible();
 });
 test('PJO-038 Auxiliary worker evidence failure leaves registry usable',async({page})=>{
  await openJobs(page,{responses:{'GET /platform/operational-jobs/scheduler/heartbeats':{status:503,json:{message:'Synthetic heartbeat outage'}}}});
  await expect(root(page)).toContainText('Supporting scheduler/worker evidence could not be fully refreshed.');
  await expect(card(page,attentionJob.name)).toBeVisible();
 });
 test('PJO-039 Empty create form requires name and job key',async({page})=>{
  await openJobs(page);await expect(editor(page).getByRole('button',{name:'Create job'})).toBeDisabled();
  await expect(editor(page).getByLabel('Worker payload JSON')).toHaveValue('{}');
  await expect(editor(page).getByLabel('Dry run')).toBeChecked();
 });
 test('PJO-040 Invalid job-key character or too short prevents submit',async({page})=>{
  await openJobs(page);await editor(page).getByLabel('Name').fill('Synthetic Job');
  for(const bad of ['ab','no spaces allowed','not/valid']){
   await editor(page).getByLabel('Job key').fill(bad);await expect(editor(page).getByRole('button',{name:'Create job'})).toBeDisabled();
  }
  await editor(page).getByLabel('Job key').fill('fixture.valid.job');await expect(editor(page).getByRole('button',{name:'Create job'})).toBeEnabled();
 });
 test('PJO-041 Worker JSON rejects arrays, malformed input and accepts object',async({page})=>{
  await openJobs(page);await editor(page).getByLabel('Name').fill('Synthetic Job');await editor(page).getByLabel('Job key').fill('fixture.payload.job');
  const payload=editor(page).getByLabel('Worker payload JSON');
  for(const bad of ['[1,2]','{broken','"string"']){
   await payload.fill(bad);await expect(editor(page).getByRole('button',{name:'Create job'})).toBeDisabled();
  }
  await payload.fill('{"dryRun":true}');await expect(editor(page).getByRole('button',{name:'Create job'})).toBeEnabled();
 });
});

test.describe('Operational Jobs — creation, editing, run and worker actions (BATCH_081_GENERATED_UNRUN)',()=>{
 const valid=async(p:Page,key='fixture.new.job')=>{await editor(p).getByLabel('Name').fill('  Fixture New Job  ');await editor(p).getByLabel('Job key').fill(key);};
 const writes=(calls:{method:string;path:string;body:any}[],path:string)=>calls.filter(c=>c.method==='POST'&&c.path===path);
 test('PJO-042 Create job trims name and normalizes job key to lowercase',async({page})=>{
  const calls:any[]=[];await openJobs(page,{onCall:(method,path,q,body)=>calls.push({method,path,body})});await valid(page,'FIXTURE.NEW.JOB');
  await editor(page).getByRole('button',{name:'Create job'}).click();await expect(root(page)).toContainText('Operational job created.');
  expect(writes(calls,endpoint).at(-1)?.body).toMatchObject({name:'Fixture New Job',job_key:'fixture.new.job'});
 });
 test('PJO-043 Create POST includes default handler, status and parsed worker payload',async({page})=>{
  const sent:any[]=[];await openJobs(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===endpoint)sent.push(b);}});await valid(page);
  await editor(page).getByLabel('Worker payload JSON').fill('{"dryRun":true,"batch":81}');await editor(page).getByRole('button',{name:'Create job'}).click();
  await expect.poll(()=>sent.length).toBe(1);expect(sent[0]).toMatchObject({category:'operational',status:'enabled',worker_handler:null,worker_payload:{dryRun:true,batch:81}});
 });
 test('PJO-044 Successful create resets editor and removes attention-only filter',async({page})=>{
  await openJobs(page);await valid(page);await editor(page).getByRole('button',{name:'Create job'}).click();
  await expect(editor(page).getByLabel('Name')).toHaveValue('');await expect(editor(page).getByLabel('Job key')).toHaveValue('');
  await expect.poll(()=>new URL(page.url()).searchParams.get('attention_only')).toBe('false');
 });
 test('PJO-045 Create API failure preserves form and displays action rejection',async({page})=>{
  await openJobs(page,{responses:{'POST /platform/operational-jobs':{status:409,json:{message:'Synthetic duplicate job key'}}}});await valid(page);
  await editor(page).getByRole('button',{name:'Create job'}).click();await expect(root(page)).toContainText('Action failed:');
  await expect(editor(page).getByLabel('Job key')).toHaveValue('fixture.new.job');
 });
 test('PJO-046 Failure threshold rejects zero, fractions and values above 100',async({page})=>{
  await openJobs(page);await valid(page);const field=editor(page).getByLabel('Failure threshold');
  for(const bad of ['0','1.5','101']){await field.fill(bad);await expect(editor(page).getByRole('button',{name:'Create job'})).toBeDisabled();}
  await field.fill('100');await expect(editor(page).getByRole('button',{name:'Create job'})).toBeEnabled();
 });
 test('PJO-047 Manual recurrence disables interval and serializes null',async({page})=>{
  const sent:any[]=[];await openJobs(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===endpoint)sent.push(b);}});await valid(page);
  await expect(editor(page).getByLabel('Recurrence interval')).toBeDisabled();await editor(page).getByRole('button',{name:'Create job'}).click();
  expect(sent.at(-1)).toMatchObject({recurrence_type:'manual',recurrence_interval:null});
 });
 test('PJO-048 Minute recurrence requires integer interval between 1 and 100000',async({page})=>{
  await openJobs(page);await valid(page);await editor(page).getByLabel('Recurrence').selectOption('minutes');const interval=editor(page).getByLabel('Recurrence interval');
  for(const bad of ['0','100001','1.25']){await interval.fill(bad);await expect(editor(page).getByRole('button',{name:'Create job'})).toBeDisabled();}
  await interval.fill('1');await expect(editor(page).getByRole('button',{name:'Create job'})).toBeEnabled();
 });
 test('PJO-049 Recurrence anchor and planned next run become ISO timestamps',async({page})=>{
  const sent:any[]=[];await openJobs(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===endpoint)sent.push(b);}});await valid(page);
  await editor(page).getByLabel('Recurrence anchor').fill('2026-12-04T08:30');await editor(page).getByLabel('Next run').fill('2026-12-05T09:40');
  await editor(page).getByRole('button',{name:'Create job'}).click();expect(sent.at(-1).recurrence_anchor_at).toMatch(/^2026-12-\d\dT\d\d:\d\d:00\.000Z$/);
  expect(sent.at(-1).next_run_at).toMatch(/^2026-12-\d\dT\d\d:\d\d:00\.000Z$/);
 });
 test('PJO-050 Enabling worker without a registered handler blocks create',async({page})=>{
  await openJobs(page);await valid(page);await editor(page).getByLabel('Worker enabled').check();
  await expect(editor(page).getByRole('button',{name:'Create job'})).toBeDisabled();
  await editor(page).getByLabel('Worker handler').selectOption('fixture.worker');await expect(editor(page).getByRole('button',{name:'Create job'})).toBeEnabled();
 });
 test('PJO-051 Registered handler, execution flag and dry-run selection are transported',async({page})=>{
  const sent:any[]=[];await openJobs(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===endpoint)sent.push(b);}});await valid(page);
  await editor(page).getByLabel('Worker handler').selectOption('fixture.worker');await editor(page).getByLabel('Worker enabled').check();
  await editor(page).getByLabel('Dry run').uncheck();await editor(page).getByRole('button',{name:'Create job'}).click();
  expect(sent.at(-1)).toMatchObject({worker_handler:'fixture.worker',worker_enabled:true,worker_dry_run:false});
 });
 test('PJO-052 Worker notification flags are independent POST fields',async({page})=>{
  const sent:any[]=[];await openJobs(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===endpoint)sent.push(b);}});await valid(page);
  await editor(page).getByLabel('Alert on failure').uncheck();await editor(page).getByLabel('Alert on dead letter').check();
  await editor(page).getByRole('button',{name:'Create job'}).click();expect(sent.at(-1)).toMatchObject({alert_on_failure:false,alert_on_dead_letter:true});
 });
 test('PJO-053 Owner and runbook selectors exclude inactive linked records',async({page})=>{
  await openJobs(page);await expect(editor(page).getByLabel('Owner').locator('option')).toHaveCount(2);
  await expect(editor(page).getByLabel('Runbook').locator('option')).toHaveCount(2);
  await expect(editor(page).getByLabel('Owner').locator('option',{hasText:'inactive@fixture.test'})).toHaveCount(0);
 });
 test('PJO-054 Missing users read does not transmit restricted owner linkage',async({page})=>{
  const sent:any[]=[];await openJobs(page,{permissions:without('platform.users.read'),onCall:(m,p,q,b)=>{if(m==='POST'&&p===endpoint)sent.push(b);}});await valid(page);
  await expect(editor(page).getByLabel('Owner')).toHaveCount(0);await editor(page).getByRole('button',{name:'Create job'}).click();
  expect(sent.at(-1)).not.toHaveProperty('owner_platform_user_id');
 });
 test('PJO-055 Missing runbooks read does not transmit restricted runbook linkage',async({page})=>{
  const sent:any[]=[];await openJobs(page,{permissions:without('platform.runbooks.read'),onCall:(m,p,q,b)=>{if(m==='POST'&&p===endpoint)sent.push(b);}});await valid(page);
  await expect(editor(page).getByLabel('Runbook')).toHaveCount(0);await editor(page).getByRole('button',{name:'Create job'}).click();
  expect(sent.at(-1)).not.toHaveProperty('runbook_id');
 });
 test('PJO-056 Editing record preloads existing worker payload',async({page})=>{
  await openJobs(page,{rows:[{...attentionJob,worker_payload:{retain:'existing',dryRun:true}}]});
  await card(page,attentionJob.name).getByRole('button',{name:'Edit'}).click();
  await expect(editor(page).getByLabel('Worker payload JSON')).toHaveValue(/"retain": "existing"/);
  await expect(editor(page).getByLabel('Name')).toHaveValue(attentionJob.name);
 });
 test('PJO-057 PATCH sends changes; cancel edit resets to blank creation',async({page})=>{
  const patches:any[]=[];await openJobs(page,{onCall:(m,p,q,b)=>{if(m==='PATCH'&&p===`${endpoint}/${jobId}`)patches.push(b);}});
  await card(page,attentionJob.name).getByRole('button',{name:'Edit'}).click();await editor(page).getByLabel('Notes').fill('Updated app evidence');
  await editor(page).getByRole('button',{name:'Save changes'}).click();expect(patches.at(-1).notes).toBe('Updated app evidence');
  await expect(editor(page).getByRole('button',{name:'Create job'})).toBeVisible();
  await card(page,attentionJob.name).getByRole('button',{name:'Edit'}).click();await editor(page).getByRole('button',{name:'Cancel edit'}).click();
  await expect(editor(page).getByLabel('Name')).toHaveValue('');
 });
 test('PJO-058 Failed PATCH retains draft and exposes server rejection',async({page})=>{
  await openJobs(page,{responses:{[`PATCH ${endpoint}/${jobId}`]:{status:409,json:{message:'Synthetic edit conflict'}}}});
  await card(page,attentionJob.name).getByRole('button',{name:'Edit'}).click();await editor(page).getByLabel('Notes').fill('Retain this edit');
  await editor(page).getByRole('button',{name:'Save changes'}).click();await expect(root(page)).toContainText('Action failed:');
  await expect(editor(page).getByLabel('Notes')).toHaveValue('Retain this edit');
 });
 test('PJO-059 Run evidence editor explicitly warns external work is unverified',async({page})=>{
  await openJobs(page);await card(page,attentionJob.name).getByRole('button',{name:'Record run'}).click();
  await expect(section(page,'Record application run evidence')).toContainText('does not certify an external outcome');
  await expect(section(page,'Record application run evidence').getByLabel('Run status')).toBeVisible();
 });
 test('PJO-060 Manual evidence status options exclude running',async({page})=>{
  await openJobs(page);await card(page,attentionJob.name).getByRole('button',{name:'Record run'}).click();
  const options=await section(page,'Record application run evidence').getByLabel('Run status').locator('option').evaluateAll(ns=>ns.map(n=>(n as HTMLOptionElement).value));
  expect(options).toEqual(['success','failed','skipped']);
 });
 test('PJO-061 Negative run duration disables Save run evidence',async({page})=>{
  await openJobs(page);await card(page,attentionJob.name).getByRole('button',{name:'Record run'}).click();
  await section(page,'Record application run evidence').getByLabel('Duration ms').fill('-1');
  await expect(section(page,'Record application run evidence').getByRole('button',{name:'Save run evidence'})).toBeDisabled();
 });
 test('PJO-062 Run evidence POST converts duration to number and trims note',async({page})=>{
  const sent:any[]=[];await openJobs(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===`${endpoint}/${jobId}/runs`)sent.push(b);}});
  await card(page,attentionJob.name).getByRole('button',{name:'Record run'}).click();const s=section(page,'Record application run evidence');
  await s.getByLabel('Run status').selectOption('failed');await s.getByLabel('Duration ms').fill('350');await s.getByLabel('Error / note').fill('  Fixture note  ');
  await s.getByRole('button',{name:'Save run evidence'}).click();expect(sent.at(-1)).toMatchObject({last_status:'failed',last_duration_ms:350,last_error:'Fixture note'});
 });
 test('PJO-063 Recording evidence closes panel and refreshes registry',async({page})=>{
  await openJobs(page);await card(page,attentionJob.name).getByRole('button',{name:'Record run'}).click();
  await section(page,'Record application run evidence').getByRole('button',{name:'Save run evidence'}).click();
  await expect(section(page,'Record application run evidence')).toHaveCount(0);await expect(root(page)).toContainText('Application run evidence recorded.');
 });
 test('PJO-064 History request starts with 25-run page',async({page})=>{
  const limits:string[]=[];await openJobs(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===`${endpoint}/${jobId}/runs`)limits.push(q.get('limit')||'');}});
  await card(page,attentionJob.name).getByRole('button',{name:'Execution history'}).click();await expect(section(page,'Execution history')).toBeVisible();
  expect(limits).toContain('25');await expect(section(page,'Execution history')).toContainText('Synthetic handler failure');
 });
 test('PJO-065 History pages advance by 25 and Close history removes panel',async({page})=>{
  const runs=Array.from({length:26},(_,i)=>({...jobRun,id:`${String(i+1).padStart(8,'0')}-0000-4000-8000-000000000001`}));const offsets:string[]=[];
  await openJobs(page,{runs,onCall:(m,p,q)=>{if(m==='GET'&&p===`${endpoint}/${jobId}/runs`)offsets.push(q.get('offset')||'');}});
  await card(page,attentionJob.name).getByRole('button',{name:'Execution history'}).click();await section(page,'Execution history').getByRole('button',{name:'Next'}).click();
  expect(offsets).toContain('25');await expect(section(page,'Execution history').getByRole('button',{name:'Next'})).toBeDisabled();
  await section(page,'Execution history').getByRole('button',{name:'Close history'}).click();await expect(section(page,'Execution history')).toHaveCount(0);
 });
 test('PJO-066 Restricted run-trigger actor is redacted when user read absent',async({page})=>{
  await openJobs(page,{permissions:without('platform.users.read')});await card(page,attentionJob.name).getByRole('button',{name:'Execution history'}).click();
  await expect(section(page,'Execution history')).toContainText('Restricted Platform user');
  await expect(section(page,'Execution history')).not.toContainText('job-owner@fixture.test');
 });
 test('PJO-067 Dismissing claim confirmation sends no claim mutation',async({page})=>{
  const sent:string[]=[];await openJobs(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/claim'))sent.push(p);}});
  page.once('dialog',d=>d.dismiss());await card(page,attentionJob.name).getByRole('button',{name:'Claim',exact:true}).click();expect(sent).toHaveLength(0);
 });
 test('PJO-068 Confirmed claim sends 900-second manual lease identity',async({page})=>{
  const sent:any[]=[];await openJobs(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===`${endpoint}/${jobId}/claim`)sent.push(b);}});
  page.once('dialog',d=>d.accept());await card(page,attentionJob.name).getByRole('button',{name:'Claim',exact:true}).click();
  expect(sent.at(-1)).toMatchObject({lease_seconds:900,worker_id:'platform-ui-manual-claim',worker_metadata:{action:'manual_claim'}});
 });
 test('PJO-069 Successful claim exposes complete and release actions',async({page})=>{
  await openJobs(page);page.once('dialog',d=>d.accept());await card(page,attentionJob.name).getByRole('button',{name:'Claim',exact:true}).click();
  await expect(card(page,attentionJob.name).getByRole('button',{name:'Complete success'})).toBeVisible();
  await expect(card(page,attentionJob.name).getByRole('button',{name:'Release claim'})).toBeVisible();
 });
 test('PJO-070 Complete success POST includes run ID and worker metadata',async({page})=>{
  const sent:any[]=[];await openJobs(page,{rows:[{...attentionJob,current_run_id:jobRun.id}],onCall:(m,p,q,b)=>{if(m==='POST'&&p===`${endpoint}/${jobId}/complete-claim`)sent.push(b);}});
  await card(page,attentionJob.name).getByRole('button',{name:'Complete success'}).click();
  expect(sent.at(-1)).toMatchObject({run_id:jobRun.id,status:'success',worker_metadata:{action:'manual_complete_success'}});
 });
 test('PJO-071 Complete failed POST records failed status, not successful outcome',async({page})=>{
  const sent:any[]=[];await openJobs(page,{rows:[{...attentionJob,current_run_id:jobRun.id}],onCall:(m,p,q,b)=>{if(m==='POST'&&p===`${endpoint}/${jobId}/complete-claim`)sent.push(b);}});
  await card(page,attentionJob.name).getByRole('button',{name:'Complete failed'}).click();expect(sent.at(-1).status).toBe('failed');
  await expect(root(page)).toContainText('Claim completed as failed.');
 });
 test('PJO-072 Release active claim calls designated endpoint with empty body',async({page})=>{
  const sent:any[]=[];await openJobs(page,{rows:[{...attentionJob,current_run_id:jobRun.id}],onCall:(m,p,q,b)=>{if(m==='POST'&&p===`${endpoint}/${jobId}/release-claim`)sent.push(b);}});
  await card(page,attentionJob.name).getByRole('button',{name:'Release claim'}).click();expect(sent).toEqual([{}]);
  await expect(card(page,attentionJob.name).getByRole('button',{name:'Claim',exact:true})).toBeVisible();
 });
 test('PJO-073 Retry action is hidden for never-failed unclaimed work',async({page})=>{
  await openJobs(page,{query:'attention_only=false'});await expect(card(page,normalJob.name).getByRole('button',{name:'Retry now'})).toHaveCount(0);
  await expect(card(page,attentionJob.name).getByRole('button',{name:'Retry now'})).toBeVisible();
 });
 test('PJO-074 Dismissing retry confirmation sends no schedule-retry request',async({page})=>{
  const sent:string[]=[];await openJobs(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/schedule-retry'))sent.push(p);}});
  page.once('dialog',d=>d.dismiss());await card(page,attentionJob.name).getByRole('button',{name:'Retry now'}).click();expect(sent).toHaveLength(0);
 });
 test('PJO-075 Archive is disabled while a manual run is claimed',async({page})=>{
  await openJobs(page,{rows:[{...attentionJob,current_run_id:jobRun.id}]});
  await expect(card(page,attentionJob.name).getByRole('button',{name:'Archive'})).toBeDisabled();
 });
 test('PJO-076 Archive confirmation controls immutability and endpoint use',async({page})=>{
  const sent:string[]=[];await openJobs(page,{query:'attention_only=false&include_archived=true',onCall:(m,p)=>{if(m==='POST'&&p===`${endpoint}/${jobId}/archive`)sent.push(p);}});
  page.once('dialog',d=>d.dismiss());await card(page,attentionJob.name).getByRole('button',{name:'Archive'}).click();expect(sent).toHaveLength(0);
  page.once('dialog',d=>d.accept());await card(page,attentionJob.name).getByRole('button',{name:'Archive'}).click();
  await expect(card(page,attentionJob.name)).toContainText('Archived — immutable');expect(sent).toHaveLength(1);
 });
 test('PJO-077 Release expired claims requires confirmation and empty-body POST',async({page})=>{
  const sent:any[]=[];await openJobs(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===`${endpoint}/release-expired-claims`)sent.push(b);}});
  page.once('dialog',d=>d.dismiss());await filters(page).getByRole('button',{name:'Release expired claims'}).click();expect(sent).toHaveLength(0);
  page.once('dialog',d=>d.accept());await filters(page).getByRole('button',{name:'Release expired claims'}).click();
  expect(sent).toEqual([{}]);await expect(root(page)).toContainText('Expired claims released.');
 });
 test('PJO-078 Stale recovery and run-once each require confirmation and scoped payloads',async({page})=>{
  const sent:any[]=[];await openJobs(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&/recover-stale-claims|worker\/run-once/.test(p))sent.push({p,b});}});
  page.once('dialog',d=>d.dismiss());await filters(page).getByRole('button',{name:'Run worker once'}).click();expect(sent).toHaveLength(0);
  page.once('dialog',d=>d.accept());await filters(page).getByRole('button',{name:'Recover stale claims'}).click();
  expect(sent.at(-1)).toMatchObject({p:`${endpoint}/recover-stale-claims`,b:{older_than_seconds:0}});
  page.once('dialog',d=>d.accept());await filters(page).getByRole('button',{name:'Run worker once'}).click();
  expect(sent.at(-1)).toMatchObject({p:`${endpoint}/worker/run-once`,b:{limit:10,lease_seconds:900}});
 });
 test('PJO-079 Heartbeat operator check uses 300 seconds and does not assert external health',async({page})=>{
  const sent:any[]=[];await openJobs(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===`${endpoint}/scheduler/heartbeat-check`)sent.push(b);}});
  await section(page,'Scheduler and worker state').getByRole('button',{name:'Run heartbeat check'}).click();
  expect(sent.at(-1)).toEqual({stale_after_seconds:300});await expect(root(page)).toContainText('Heartbeat check completed.');
 });
 test('PJO-080 Application evidence banner expressly excludes live worker and SQL proof',async({page})=>{
  await openJobs(page);await expect(section(page,'Evidence boundary')).toContainText('external outcome');
  await expect(root(page)).toContainText('Recorded success is application evidence only');
  await expect(card(page,attentionJob.name)).toBeVisible();
  // Live claim locking, backend ACL, handler effects, database audit are deliberately separate Phase-2 obligations.
 });
});
