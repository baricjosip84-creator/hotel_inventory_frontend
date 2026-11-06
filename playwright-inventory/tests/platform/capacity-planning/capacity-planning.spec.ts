/** Batch 79 — PCAP-001..041. Phase 1 GENERATED_UNRUN; source-based synthetic UI transport only.
 * No live telemetry, real dependency state, permission enforcement, SQL consistency or audit proof. */
import {test,expect,type Page} from '@playwright/test';
import {openCapacity,capacityPermissions,criticalCapacity,warningCapacity,noLimitCapacity,
 archivedCapacity,manyCapacity,capacityId,capacityDependencyId} from '../../../support/platformCapacityPlanningFixture';
const root=(p:Page)=>p.locator('.platform-capacity-planning');
const sections=(p:Page,name:string)=>root(p).locator('.platform-capacity-planning__section').filter({has:p.getByRole('heading',{name,exact:true})});
const filters=(p:Page)=>sections(p,'Filters');
const registry=(p:Page)=>sections(p,'Capacity registry');
const cards=(p:Page)=>root(p).locator('.platform-capacity-planning__card');
const card=(p:Page,name:string)=>cards(p).filter({has:p.getByRole('heading',{name,exact:true})});
const pager=(p:Page)=>registry(p).locator('.platform-capacity-planning__pagination');
const without=(...denied:string[])=>capacityPermissions.filter(p=>!denied.includes(p));
const endpoint='/platform/capacity-planning';

test.describe('Platform Capacity Planning — evidence, identity and role scoping (GENERATED_UNRUN)',()=>{
 test('PCAP-001 Protected route renders Capacity planning workspace and page metadata',async({page})=>{
  await openCapacity(page);await expect(root(page)).toContainText('Registry-wide filtered summary');
  await expect(root(page)).toContainText('50 rows per page');
 });
 test('PCAP-002 Evidence boundary states operator values do not prove infrastructure telemetry',async({page})=>{
  await openCapacity(page);await expect(sections(page,'Evidence boundary')).toContainText('Application evidence only.');
  await expect(sections(page,'Evidence boundary')).toContainText('does not poll infrastructure');
  await expect(sections(page,'Evidence boundary')).toContainText('does not');
 });
 test('PCAP-003 Attention filter defaults enabled and query sends explicit true',async({page})=>{
  const queries:string[]=[];await openCapacity(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)queries.push(q.get('attention_only')||'');}});
  await expect(filters(page).getByLabel('Attention only')).toBeChecked();expect(queries).toContain('true');
 });
 test('PCAP-004 Filtered summary total describes full result not only visible rows',async({page})=>{
  await openCapacity(page,{rows:manyCapacity(51)});await expect(cards(page)).toHaveCount(50);
  await expect(root(page)).toContainText('Filtered resources');
  await expect(root(page)).toContainText('Registry-wide filtered total');
  await expect(pager(page)).toContainText('51 filtered total');
 });
 test('PCAP-005 Usage and recorded limit render separately with recorded unit',async({page})=>{
  await openCapacity(page);const c=card(page,criticalCapacity.name);
  await expect(c).toContainText('95 GB');await expect(c).toContainText('100 GB');
  await expect(c).toContainText('95.00%');
 });
 test('PCAP-006 Missing API usage_percent falls back to recorded usage and limit arithmetic',async({page})=>{
  await openCapacity(page,{query:'attention_only=false',rows:[{...criticalCapacity,usage_percent:null,current_usage:25,capacity_limit:200}]});
  await expect(card(page,criticalCapacity.name)).toContainText('12.50%');
 });
 test('PCAP-007 Zero configured capacity limit explicitly withholds usage percentage',async({page})=>{
  await openCapacity(page);const c=card(page,noLimitCapacity.name);
  await expect(c).toContainText('Not configured');await expect(c).toContainText('Unavailable · no limit');
 });
 test('PCAP-008 Warning and critical thresholds displayed as recorded percent pair',async({page})=>{
  await openCapacity(page);await expect(card(page,criticalCapacity.name)).toContainText('75% / 90%');
 });
 test('PCAP-009 Scaling plan remains distinct from usage observation',async({page})=>{
  await openCapacity(page);const c=card(page,criticalCapacity.name);
  await expect(c.locator('.platform-capacity-planning__plan')).toContainText('Fixture increase storage');
  await expect(c).toContainText('Derived usage');
 });
 test('PCAP-010 Missing operator notes show an explicit placeholder',async({page})=>{
  await openCapacity(page);await expect(card(page,warningCapacity.name)).toContainText('No application note recorded.');
 });
 test('PCAP-011 Missing scaling plan shows Not recorded',async({page})=>{
  await openCapacity(page);await expect(card(page,warningCapacity.name).locator('.platform-capacity-planning__plan')).toContainText('Not recorded');
 });
 test('PCAP-012 Near-term projected exhaustion is marked as recorded projection not real prediction',async({page})=>{
  await openCapacity(page);await expect(card(page,criticalCapacity.name).locator('.platform-capacity-planning__badges')).toContainText('Projected ≤30d');
  await expect(sections(page,'Evidence boundary')).toContainText('exhaustion dates are operator-recorded');
 });
 test('PCAP-013 Resolved records excluded from default attention-only view',async({page})=>{
  await openCapacity(page,{rows:[{...criticalCapacity,status:'resolved'}]});
  await expect(cards(page)).toHaveCount(0);await expect(registry(page)).toContainText('No capacity resources match');
 });
 test('PCAP-014 Archived records excluded from default query',async({page})=>{
  await openCapacity(page,{rows:[archivedCapacity]});await expect(cards(page)).toHaveCount(0);
 });
 test('PCAP-015 Archived record can be shown but has no mutation actions',async({page})=>{
  await openCapacity(page,{query:'include_archived=true&attention_only=false',rows:[archivedCapacity]});
  const c=card(page,archivedCapacity.name);await expect(c).toContainText('Archived · registry evidence immutable');
  for(const action of ['Edit details','Record usage','Archive'])await expect(c.getByRole('button',{name:action})).toHaveCount(0);
 });
 test('PCAP-016 Service dependency link navigates only when linkage is visible',async({page})=>{
  await openCapacity(page);await expect(card(page,criticalCapacity.name).getByRole('link',{name:'Service dependency'}))
   .toHaveAttribute('href','/platform/service-dependencies');
 });
 test('PCAP-017 Platform audit link is available only with audit read permission',async({page})=>{
  await openCapacity(page);await expect(card(page,criticalCapacity.name).getByRole('link',{name:'Platform audit'}))
   .toHaveAttribute('href','/platform/audit');
 });
 test('PCAP-018 Read-only platform role sees records but no mutations or resource form',async({page})=>{
  await openCapacity(page,{permissions:without('platform.capacity.write')});
  await expect(card(page,criticalCapacity.name)).toBeVisible();
  await expect(page.locator('#platform-capacity-planning-form')).toHaveCount(0);
  for(const name of ['Edit details','Record usage','Archive'])await expect(card(page,criticalCapacity.name).getByRole('button',{name})).toHaveCount(0);
 });
 test('PCAP-019 Missing capacity read permission blocks protected route and registry transport',async({page})=>{
  const calls:string[]=[];await openCapacity(page,{permissions:without('platform.capacity.read'),expectHeading:false,
   onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(root(page)).toHaveCount(0);await expect(page).toHaveURL(/\/platform\/?$/);expect(calls).toHaveLength(0);
 });
 test('PCAP-020 Dependency permission redacts identity and skips supporting directory API',async({page})=>{
  const calls:string[]=[];await openCapacity(page,{permissions:without('platform.dependencies.read'),
   onCall:(m,p)=>{if(p==='/platform/service-dependencies')calls.push(m);}});
  await expect(card(page,criticalCapacity.name)).toContainText('Linked · identity restricted');
  await expect(card(page,criticalCapacity.name)).not.toContainText('Fixture Primary Database');
  await expect(page.locator('#platform-capacity-planning-form').getByLabel('Service dependency')).toHaveCount(0);
  expect(calls).toHaveLength(0);
 });
 test('PCAP-021 User permission redacts owner and updater and omits users GET',async({page})=>{
  const calls:string[]=[];await openCapacity(page,{permissions:without('platform.users.read'),onCall:(m,p)=>{if(p==='/platform/users')calls.push(m);}});
  const c=card(page,criticalCapacity.name);
  await expect(c).toContainText('Assigned · identity restricted');
  await expect(c).toContainText('Identity unavailable / restricted');
  await expect(c).not.toContainText('capacity-owner@fixture.test');expect(calls).toHaveLength(0);
 });
 test('PCAP-022 Supporting links require each separate destination permission',async({page})=>{
  await openCapacity(page,{permissions:without('platform.dependencies.read','platform.risks.read','platform.jobs.read','platform.users.read','platform.audit.read')});
  const s=sections(page,'Supporting operations');
  for(const name of ['Service dependencies','Risk register','Operational jobs','Platform users','Platform audit'])
   await expect(s.getByRole('link',{name,exact:true})).toHaveCount(0);
  await expect(card(page,criticalCapacity.name)).toBeVisible();
 });
});

test.describe('Platform Capacity Planning — protected URL filters and pagination (GENERATED_UNRUN)',()=>{
 test('PCAP-023 Status filter forwards status enumeration in list query',async({page})=>{
  const values:string[]=[];await openCapacity(page,{query:'attention_only=false',onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)values.push(q.get('status')||'');}});
  await filters(page).getByLabel('Status').selectOption('watch');
  await expect(card(page,warningCapacity.name)).toBeVisible();await expect(card(page,criticalCapacity.name)).toHaveCount(0);
  await expect.poll(()=>values.at(-1)).toBe('watch');
 });
 test('PCAP-024 Resource type filter forwards supported enum',async({page})=>{
  await openCapacity(page);await filters(page).getByLabel('Resource type').selectOption('queue');
  await expect(card(page,warningCapacity.name)).toBeVisible();await expect(cards(page)).toHaveCount(1);
  expect(new URL(page.url()).searchParams.get('resource_type')).toBe('queue');
 });
 test('PCAP-025 Environment filter forwards exact source enum',async({page})=>{
  await openCapacity(page);await filters(page).getByLabel('Environment').selectOption('staging');
  await expect(card(page,warningCapacity.name)).toBeVisible();await expect(cards(page)).toHaveCount(1);
  expect(new URL(page.url()).searchParams.get('environment')).toBe('staging');
 });
 test('PCAP-026 Text search checks resource context and includes URL state',async({page})=>{
  await openCapacity(page);await filters(page).getByLabel('Search').fill('Fixture Queue Watch');
  await expect(card(page,warningCapacity.name)).toBeVisible();await expect(cards(page)).toHaveCount(1);
  expect(new URL(page.url()).searchParams.get('search')).toBe('Fixture Queue Watch');
 });
 test('PCAP-027 Default attention filter retains unconfigured limit records',async({page})=>{
  await openCapacity(page);await expect(filters(page).getByLabel('Attention only')).toBeChecked();
  await expect(card(page,noLimitCapacity.name)).toBeVisible();
 });
 test('PCAP-028 Disabling attention filter reveals low-use and resolved records',async({page})=>{
  await openCapacity(page,{rows:[{...criticalCapacity,status:'resolved'}]});await expect(cards(page)).toHaveCount(0);
  await filters(page).getByLabel('Attention only').uncheck();
  await expect(card(page,criticalCapacity.name)).toBeVisible();
  expect(new URL(page.url()).searchParams.get('attention_only')).toBe('false');
 });
 test('PCAP-029 Include archived checkbox exposes archived rows only when attention disabled',async({page})=>{
  await openCapacity(page,{query:'attention_only=false',rows:[archivedCapacity]});
  await filters(page).getByLabel('Include archived').check();
  await expect(card(page,archivedCapacity.name)).toBeVisible();
  expect(new URL(page.url()).searchParams.get('include_archived')).toBe('true');
 });
 test('PCAP-030 URL filters reconstruct on deep-link without trusting unknown values',async({page})=>{
  await openCapacity(page,{query:'resource_type=queue&environment=staging&attention_only=false'});
  await expect(filters(page).getByLabel('Resource type')).toHaveValue('queue');
  await expect(filters(page).getByLabel('Environment')).toHaveValue('staging');
  await expect(filters(page).getByLabel('Attention only')).not.toBeChecked();
  await expect(card(page,warningCapacity.name)).toBeVisible();
 });
 test('PCAP-031 Unknown URL status blocks list request until cleared',async({page})=>{
  const calls:string[]=[];await openCapacity(page,{query:'status=not_supported',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(root(page)).toContainText('Invalid URL filter.');expect(calls).toHaveLength(0);
 });
 test('PCAP-032 Unknown resource type blocks list request',async({page})=>{
  const calls:string[]=[];await openCapacity(page,{query:'resource_type=unknown-engine',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(root(page)).toContainText('Invalid URL filter.');expect(calls).toHaveLength(0);
 });
 test('PCAP-033 Unknown environment blocks list request',async({page})=>{
  const calls:string[]=[];await openCapacity(page,{query:'environment=moon',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(root(page)).toContainText('Invalid URL filter.');expect(calls).toHaveLength(0);
 });
 test('PCAP-034 Nonboolean attention URL blocks registry transport',async({page})=>{
  const calls:string[]=[];await openCapacity(page,{query:'attention_only=maybe',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(root(page)).toContainText('Invalid URL filter.');expect(calls).toHaveLength(0);
 });
 test('PCAP-035 Nonboolean include_archived URL blocks registry transport',async({page})=>{
  const calls:string[]=[];await openCapacity(page,{query:'include_archived=all',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(root(page)).toContainText('Invalid URL filter.');expect(calls).toHaveLength(0);
 });
 test('PCAP-036 URL search longer than 200 characters blocks list transport',async({page})=>{
  const calls:string[]=[];await openCapacity(page,{query:`search=${'X'.repeat(201)}`,onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(root(page)).toContainText('Invalid URL filter.');expect(calls).toHaveLength(0);
 });
 test('PCAP-037 Clear invalid filters resets attention to false and retries list',async({page})=>{
  const values:string[]=[];await openCapacity(page,{query:'status=invalid',onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)values.push(q.get('attention_only')||'');}});
  await root(page).getByRole('button',{name:'Clear filters'}).first().click();
  await expect(card(page,criticalCapacity.name)).toBeVisible();
  expect(new URL(page.url()).searchParams.get('attention_only')).toBe('false');expect(values).toContain('false');
 });
 test('PCAP-038 Server-driven pagination requests fifty records per page',async({page})=>{
  const limits:string[]=[];await openCapacity(page,{rows:manyCapacity(51),onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)limits.push(q.get('limit')||'');}});
  await expect(cards(page)).toHaveCount(50);expect(limits).toContain('50');
 });
 test('PCAP-039 Next page fetch uses offset 50 and displays last resource',async({page})=>{
  const offsets:string[]=[];await openCapacity(page,{rows:manyCapacity(51),onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)offsets.push(q.get('offset')||'');}});
  await pager(page).getByRole('button',{name:'Next'}).click();
  await expect(card(page,'Fixture Capacity 051')).toBeVisible();expect(offsets).toContain('50');
 });
 test('PCAP-040 Last page disables Next; Previous restores first page',async({page})=>{
  await openCapacity(page,{rows:manyCapacity(51)});await pager(page).getByRole('button',{name:'Next'}).click();
  await expect(pager(page).getByRole('button',{name:'Next'})).toBeDisabled();
  await pager(page).getByRole('button',{name:'Previous'}).click();await expect(card(page,'Fixture Capacity 001')).toBeVisible();
 });
 test('PCAP-041 Empty matched registry does not assert healthy infrastructure',async({page})=>{
  await openCapacity(page,{query:'search=AbsentSyntheticRecord'});
  await expect(registry(page)).toContainText('No capacity resources match the current filters.');
  await expect(registry(page)).toContainText('does not prove that infrastructure has no capacity constraint');
  await expect(cards(page)).toHaveCount(0);
 });
});

/** Batch 80: PCAP-042..080. Synthetic intercepted UI only; no runtime execution or backend acceptance. */
const editor=(p:Page)=>p.locator('#platform-capacity-planning-form');
const save=(p:Page)=>editor(p).getByRole('button',{name:/^(Create resource|Save details)$/});
const change=(p:Page,name:string,value:string)=>editor(p).getByLabel(name,{exact:true}).fill(value);
const callsOf=(method:string,path:string)=>(m:string,p:string)=>m===method&&p===path;

test.describe('Capacity Planning — create and guarded payload (BATCH_080_GENERATED_UNRUN)',()=>{
 test('PCAP-042 Create form initial values and required name/unit',async({page})=>{
  await openCapacity(page);await expect(editor(page).getByLabel('Type')).toHaveValue('other');await expect(editor(page).getByLabel('Environment')).toHaveValue('production');
  await expect(editor(page).getByLabel('Unit')).toHaveValue('units');await expect(save(page)).toBeDisabled();await change(page,'Resource name','Fixture New Capacity');await expect(save(page)).toBeEnabled();
  await change(page,'Unit',' ');await expect(save(page)).toBeDisabled();await expect(editor(page)).toContainText('Enter a unit');
 });
 test('PCAP-043 Whitespace-only resource name blocks POST',async({page})=>{
  const writes:any[]=[];await openCapacity(page,{onCall:(m,p,q,b)=>{if(callsOf('POST',endpoint)(m,p))writes.push(b);}});
  await change(page,'Resource name','   ');await expect(save(page)).toBeDisabled();expect(writes).toHaveLength(0);
 });
 test('PCAP-044 Names and units are trimmed in creation payload',async({page})=>{
  const bodies:any[]=[];await openCapacity(page,{onCall:(m,p,q,b)=>{if(callsOf('POST',endpoint)(m,p))bodies.push(b);}});
  await change(page,'Resource name','  Fresh Storage  ');await change(page,'Unit','  GB  ');await save(page).click();
  await expect.poll(()=>bodies.length).toBe(1);expect(bodies[0]).toMatchObject({name:'Fresh Storage',unit:'GB'});
 });
 test('PCAP-045 Browser name/unit length attributes bound the editor',async({page})=>{
  await openCapacity(page);await expect(editor(page).getByLabel('Resource name')).toHaveAttribute('maxlength','200');
  await expect(editor(page).getByLabel('Unit')).toHaveAttribute('maxlength','80');await expect(editor(page).getByLabel('Notes')).toHaveAttribute('maxlength','4000');
 });
 test('PCAP-046 Negative usage/limit blocks creation',async({page})=>{
  await openCapacity(page);await change(page,'Resource name','Synthetic Negative');
  await change(page,'Initial current usage','-1');await expect(save(page)).toBeDisabled();
  await change(page,'Initial current usage','1');await change(page,'Capacity limit','-2');await expect(save(page)).toBeDisabled();
  await expect(editor(page)).toContainText('non-negative numbers');
 });
 test('PCAP-047 Warning threshold enforces integer 1..100 window',async({page})=>{
  await openCapacity(page);await change(page,'Resource name','Warning Bounds');
  for(const value of ['0','101','1.5']){await change(page,'Warning threshold %',value);await expect(save(page)).toBeDisabled();}
  await change(page,'Warning threshold %','74');await expect(save(page)).toBeEnabled();
 });
 test('PCAP-048 Critical threshold must exceed warning and stay <=100',async({page})=>{
  await openCapacity(page);await change(page,'Resource name','Critical Bounds');
  for(const value of ['75','0','101','90.5']){await change(page,'Critical threshold %',value);await expect(save(page)).toBeDisabled();}
  await change(page,'Critical threshold %','95');await expect(save(page)).toBeEnabled();
 });
 test('PCAP-049 Threshold strings are submitted as numbers',async({page})=>{
  const sent:any[]=[];await openCapacity(page,{onCall:(m,p,q,b)=>{if(callsOf('POST',endpoint)(m,p))sent.push(b);}});
  await change(page,'Resource name','Numeric Threshold');await change(page,'Warning threshold %','62');await change(page,'Critical threshold %','93');await save(page).click();
  await expect.poll(()=>sent.length).toBe(1);expect(sent[0].warning_threshold_percent).toBe(62);expect(sent[0].critical_threshold_percent).toBe(93);
 });
 test('PCAP-050 Create status dropdown never includes immutable archived',async({page})=>{
  await openCapacity(page);await expect(editor(page).getByLabel('Workflow status').locator('option[value="archived"]')).toHaveCount(0);
  await expect(editor(page).getByLabel('Workflow status').locator('option[value="scaling_in_progress"]')).toHaveCount(1);
 });
 test('PCAP-051 Selected resource type and environment reach POST',async({page})=>{
  const sent:any[]=[];await openCapacity(page,{onCall:(m,p,q,b)=>{if(callsOf('POST',endpoint)(m,p))sent.push(b);}});
  await change(page,'Resource name','Selected Type');await editor(page).getByLabel('Type').selectOption('queue');await editor(page).getByLabel('Environment').selectOption('staging');await save(page).click();
  await expect.poll(()=>sent.length).toBe(1);expect(sent[0]).toMatchObject({resource_type:'queue',environment:'staging'});
 });
 test('PCAP-052 Initial usage and limit are numeric POST fields',async({page})=>{
  const sent:any[]=[];await openCapacity(page,{onCall:(m,p,q,b)=>{if(callsOf('POST',endpoint)(m,p))sent.push(b);}});
  await change(page,'Resource name','Initial Values');await change(page,'Initial current usage','24.5');await change(page,'Capacity limit','100.25');await save(page).click();
  await expect.poll(()=>sent.length).toBe(1);expect(sent[0]).toMatchObject({current_usage:24.5,capacity_limit:100.25});
 });
 test('PCAP-053 Projected exhaustion local datetime becomes UTC ISO POST',async({page})=>{
  const sent:any[]=[];await openCapacity(page,{onCall:(m,p,q,b)=>{if(callsOf('POST',endpoint)(m,p))sent.push(b);}});
  await change(page,'Resource name','Projected Date');await change(page,'Projected exhaustion','2026-12-20T12:00');await save(page).click();
  await expect.poll(()=>sent.length).toBe(1);expect(sent[0].projected_exhaustion_at).toMatch(/^2026-12-20T\d\d:\d\d:00\.000Z$/);
 });
 test('PCAP-054 Permitted dependency and owner selectors bind POST references',async({page})=>{
  const sent:any[]=[];await openCapacity(page,{onCall:(m,p,q,b)=>{if(callsOf('POST',endpoint)(m,p))sent.push(b);}});
  await change(page,'Resource name','Linked Capacity');await editor(page).getByLabel('Service dependency').selectOption(capacityDependencyId);
  await editor(page).getByLabel('Owner').selectOption('93000000-0000-4000-8000-000000000001');await save(page).click();
  await expect.poll(()=>sent.length).toBe(1);expect(sent[0].dependency_id).toBe(capacityDependencyId);expect(sent[0].owner_platform_user_id).toBeTruthy();
 });
 test('PCAP-055 Missing dependency read hides field and omits POST property',async({page})=>{
  const sent:any[]=[];await openCapacity(page,{permissions:without('platform.dependencies.read'),onCall:(m,p,q,b)=>{if(callsOf('POST',endpoint)(m,p))sent.push(b);}});
  await expect(editor(page)).toContainText('Dependency linkage restricted');await change(page,'Resource name','Restricted Dependency');await save(page).click();
  await expect.poll(()=>sent.length).toBe(1);expect(sent[0]).not.toHaveProperty('dependency_id');
 });
 test('PCAP-056 Missing users read hides owner field and omits POST property',async({page})=>{
  const sent:any[]=[];await openCapacity(page,{permissions:without('platform.users.read'),onCall:(m,p,q,b)=>{if(callsOf('POST',endpoint)(m,p))sent.push(b);}});
  await expect(editor(page)).toContainText('Owner linkage restricted');await change(page,'Resource name','Restricted User');await save(page).click();
  await expect.poll(()=>sent.length).toBe(1);expect(sent[0]).not.toHaveProperty('owner_platform_user_id');
 });
 test('PCAP-057 Archived dependency/inactive owner not selectable',async({page})=>{
  await openCapacity(page);await expect(editor(page).getByLabel('Service dependency').locator('option',{hasText:'Fixture Archived Dependency'})).toHaveCount(0);
  await expect(editor(page).getByLabel('Owner').locator('option', {hasText:'inactive@fixture.test'})).toHaveCount(0);
 });
 test('PCAP-058 Successful create clears draft and raises message',async({page})=>{
  await openCapacity(page);await change(page,'Resource name','Synthetic Create Success');await save(page).click();
  await expect(root(page).locator('.platform-capacity-planning__success')).toContainText('Capacity resource created.');
  await expect(editor(page).getByLabel('Resource name')).toHaveValue('');await expect(card(page,'Synthetic Create Success')).toBeVisible();
 });
 test('PCAP-059 Create backend rejection preserves draft and shows error',async({page})=>{
  await openCapacity(page,{responses:{'POST /platform/capacity-planning':{status:409,json:{message:'Synthetic duplicate resource'}}}});
  await change(page,'Resource name','Duplicate Resource');await save(page).click();
  await expect(root(page).locator('.platform-capacity-planning__warning')).toContainText('Synthetic duplicate resource');
  await expect(editor(page).getByLabel('Resource name')).toHaveValue('Duplicate Resource');
 });
});

test.describe('Capacity Planning — edit, usage and archival separation (BATCH_080_GENERATED_UNRUN)',()=>{
 test('PCAP-060 Edit preloads configuration and existing recorded usage',async({page})=>{
  await openCapacity(page);await card(page,criticalCapacity.name).getByRole('button',{name:'Edit details'}).click();
  await expect(editor(page).getByLabel('Resource name')).toHaveValue(criticalCapacity.name);
  await expect(editor(page).getByLabel('Capacity limit')).toHaveValue('100');await expect(editor(page).getByLabel('Notes')).toHaveValue('Recorded capacity observation');
 });
 test('PCAP-061 Edit omits initial usage control and Cancel resets blank create',async({page})=>{
  await openCapacity(page);await card(page,criticalCapacity.name).getByRole('button',{name:'Edit details'}).click();
  await expect(editor(page)).toContainText('Usage handled separately');await expect(editor(page).getByLabel('Initial current usage')).toHaveCount(0);
  await editor(page).getByRole('button',{name:'Cancel edit'}).click();await expect(editor(page).getByLabel('Initial current usage')).toBeVisible();
  await expect(editor(page).getByLabel('Resource name')).toHaveValue('');
 });
 test('PCAP-062 PATCH details excludes current_usage while updating plan',async({page})=>{
  const sent:any[]=[];await openCapacity(page,{onCall:(m,p,q,b)=>{if(callsOf('PATCH',`${endpoint}/${capacityId}`)(m,p))sent.push(b);}});
  await card(page,criticalCapacity.name).getByRole('button',{name:'Edit details'}).click();await change(page,'Scaling plan','Synthetic incremental storage');
  await change(page,'Warning threshold %','70');await save(page).click();await expect.poll(()=>sent.length).toBe(1);
  expect(sent[0]).toMatchObject({scaling_plan:'Synthetic incremental storage',warning_threshold_percent:70});expect(sent[0]).not.toHaveProperty('current_usage');
 });
 test('PCAP-063 PATCH error retains editor values and shows failure',async({page})=>{
  await openCapacity(page,{responses:{[`PATCH ${endpoint}/${capacityId}`]:{status:409,json:{message:'Synthetic update rejected'}}}});
  await card(page,criticalCapacity.name).getByRole('button',{name:'Edit details'}).click();await change(page,'Scaling plan','Keep my plan');await save(page).click();
  await expect(root(page).locator('.platform-capacity-planning__warning')).toContainText('Synthetic update rejected');
  await expect(editor(page).getByLabel('Scaling plan')).toHaveValue('Keep my plan');
 });
 test('PCAP-064 Successful PATCH resets editor and shows details saved',async({page})=>{
  await openCapacity(page);await card(page,criticalCapacity.name).getByRole('button',{name:'Edit details'}).click();await change(page,'Notes','Corrected synthetic notes');await save(page).click();
  await expect(root(page).locator('.platform-capacity-planning__success')).toContainText('Capacity resource details saved.');
  await expect(editor(page).getByLabel('Resource name')).toHaveValue('');await expect(editor(page).getByRole('button',{name:'Create resource'})).toBeVisible();
 });
 test('PCAP-065 Recording usage opens separate editor with latest values',async({page})=>{
  await openCapacity(page);await card(page,criticalCapacity.name).getByRole('button',{name:'Record usage'}).click();
  const u=card(page,criticalCapacity.name).locator('.platform-capacity-planning__usage-editor');
  await expect(u.getByLabel('Current usage')).toHaveValue('95');await expect(u.getByLabel('Capacity limit')).toHaveValue('100');
  await expect(u.getByLabel('Status override')).toHaveValue('');
 });
 test('PCAP-066 Usage POST sends observation, limit and no implicit status override',async({page})=>{
  const sent:any[]=[];await openCapacity(page,{onCall:(m,p,q,b)=>{if(callsOf('POST',`${endpoint}/${capacityId}/usage`)(m,p))sent.push(b);}});
  await card(page,criticalCapacity.name).getByRole('button',{name:'Record usage'}).click();
  const u=card(page,criticalCapacity.name).locator('.platform-capacity-planning__usage-editor');
  await u.getByLabel('Current usage').fill('42');await u.getByLabel('Capacity limit').fill('125');await u.getByRole('button',{name:'Record usage'}).click();
  await expect.poll(()=>sent.length).toBe(1);expect(sent[0]).toMatchObject({current_usage:42,capacity_limit:125});expect(sent[0]).not.toHaveProperty('status');
 });
 test('PCAP-067 Override dropdown excludes archived and submits selected mutable status',async({page})=>{
  const sent:any[]=[];await openCapacity(page,{onCall:(m,p,q,b)=>{if(callsOf('POST',`${endpoint}/${capacityId}/usage`)(m,p))sent.push(b);}});
  await card(page,criticalCapacity.name).getByRole('button',{name:'Record usage'}).click();
  const u=card(page,criticalCapacity.name).locator('.platform-capacity-planning__usage-editor');
  await expect(u.locator('option[value="archived"]')).toHaveCount(0);await u.getByLabel('Status override').selectOption('resolved');
  await u.getByRole('button',{name:'Record usage'}).click();await expect.poll(()=>sent.length).toBe(1);expect(sent[0].status).toBe('resolved');
 });
 test('PCAP-068 Usage draft rejects negative observations with button disabled',async({page})=>{
  await openCapacity(page);await card(page,criticalCapacity.name).getByRole('button',{name:'Record usage'}).click();
  const u=card(page,criticalCapacity.name).locator('.platform-capacity-planning__usage-editor');
  await u.getByLabel('Current usage').fill('-1');await expect(u.getByRole('button',{name:'Record usage'})).toBeDisabled();
  await u.getByLabel('Current usage').fill('4');await u.getByLabel('Capacity limit').fill('-5');await expect(u).toContainText('non-negative numbers');
 });
 test('PCAP-069 Usage success closes editor and reports application evidence',async({page})=>{
  await openCapacity(page);await card(page,criticalCapacity.name).getByRole('button',{name:'Record usage'}).click();
  await card(page,criticalCapacity.name).locator('.platform-capacity-planning__usage-editor').getByRole('button',{name:'Record usage'}).click();
  await expect(root(page).locator('.platform-capacity-planning__success')).toContainText('Usage evidence recorded.');
  await expect(card(page,criticalCapacity.name).locator('.platform-capacity-planning__usage-editor')).toHaveCount(0);
 });
 test('PCAP-070 Usage backend failure retains editor and entered observation',async({page})=>{
  await openCapacity(page,{responses:{[`POST ${endpoint}/${capacityId}/usage`]:{status:409,json:{message:'Synthetic usage rejected'}}}});
  await card(page,criticalCapacity.name).getByRole('button',{name:'Record usage'}).click();
  const u=card(page,criticalCapacity.name).locator('.platform-capacity-planning__usage-editor');await u.getByLabel('Current usage').fill('37');
  await u.getByRole('button',{name:'Record usage'}).click();await expect(root(page).locator('.platform-capacity-planning__warning')).toContainText('Synthetic usage rejected');
  await expect(u.getByLabel('Current usage')).toHaveValue('37');
 });
 test('PCAP-071 Cancel usage editor performs no POST',async({page})=>{
  const sent:any[]=[];await openCapacity(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/usage'))sent.push(p);}});
  await card(page,criticalCapacity.name).getByRole('button',{name:'Record usage'}).click();
  await card(page,criticalCapacity.name).locator('.platform-capacity-planning__usage-editor').getByRole('button',{name:'Cancel'}).click();
  await expect(card(page,criticalCapacity.name).locator('.platform-capacity-planning__usage-editor')).toHaveCount(0);expect(sent).toHaveLength(0);
 });
 test('PCAP-072 Dismiss archive confirmation does not mutate row',async({page})=>{
  const sent:any[]=[];await openCapacity(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/archive'))sent.push(p);}});
  page.once('dialog',async d=>{expect(d.message()).toContain('Archive capacity resource');await d.dismiss();});
  await card(page,criticalCapacity.name).getByRole('button',{name:'Archive'}).click();await expect(card(page,criticalCapacity.name)).toBeVisible();expect(sent).toHaveLength(0);
 });
 test('PCAP-073 Confirm archive sends empty JSON payload to resource endpoint',async({page})=>{
  const sent:any[]=[];await openCapacity(page,{onCall:(m,p,q,b)=>{if(callsOf('POST',`${endpoint}/${capacityId}/archive`)(m,p))sent.push(b);}});
  page.once('dialog',d=>d.accept());await card(page,criticalCapacity.name).getByRole('button',{name:'Archive'}).click();
  await expect.poll(()=>sent.length).toBe(1);expect(sent[0]).toEqual({});
 });
 test('PCAP-074 Successful archive removes resource from active registry',async({page})=>{
  await openCapacity(page);page.once('dialog',d=>d.accept());await card(page,criticalCapacity.name).getByRole('button',{name:'Archive'}).click();
  await expect(root(page).locator('.platform-capacity-planning__success')).toContainText('Capacity resource archived.');
  await expect(card(page,criticalCapacity.name)).toHaveCount(0);
 });
 test('PCAP-075 Rejected archive leaves active card and shows error',async({page})=>{
  await openCapacity(page,{responses:{[`POST ${endpoint}/${capacityId}/archive`]:{status:409,json:{message:'Synthetic archive rejected'}}}});
  page.once('dialog',d=>d.accept());await card(page,criticalCapacity.name).getByRole('button',{name:'Archive'}).click();
  await expect(root(page).locator('.platform-capacity-planning__warning')).toContainText('Synthetic archive rejected');await expect(card(page,criticalCapacity.name)).toBeVisible();
 });
});

test.describe('Capacity Planning — refresh, pages and Phase 2 boundary (BATCH_080_GENERATED_UNRUN)',()=>{
 test('PCAP-076 Changing filter resets pagination offset to 0',async({page})=>{
  const offsets:string[]=[];await openCapacity(page,{rows:manyCapacity(51),onCall:(m,p,q)=>{if(callsOf('GET',endpoint)(m,p))offsets.push(q.get('offset')||'');}});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect(card(page,'Fixture Capacity 051')).toBeVisible();
  await filters(page).getByLabel('Resource type').selectOption('database');await expect.poll(()=>offsets.at(-1)).toBe('0');
 });
 test('PCAP-077 Refresh repeats filtered GET but not any write',async({page})=>{
  const calls:string[]=[];await openCapacity(page,{query:'resource_type=database',onCall:(m,p,q)=>{if(p===endpoint)calls.push(`${m} ${q.get('resource_type')}`);}});
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>calls.filter(x=>x==='GET database').length).toBeGreaterThanOrEqual(2);
  expect(calls.every(x=>x.startsWith('GET'))).toBe(true);
 });
 test('PCAP-078 First list transport failure exposes Retry then recovers',async({page})=>{
  let recover=false;await openCapacity(page,{expectHeading:true,respond:(m,p)=>{
   if(callsOf('GET',endpoint)(m,p)&&!recover)return {status:503,json:{message:'Synthetic capacity outage'}};
  }});
  await expect(registry(page)).toContainText('Capacity planning could not be loaded.');
  recover=true;await registry(page).getByRole('button',{name:'Retry'}).click();await expect(card(page,criticalCapacity.name)).toBeVisible();
 });
 test('PCAP-079 Background registry refresh failure retains last successful snapshot',async({page})=>{
  let blocked=false;await openCapacity(page,{respond:(m,p)=>blocked&&callsOf('GET',endpoint)(m,p)?{status:503,json:{message:'Synthetic refresh outage'}}:undefined});
  await expect(card(page,criticalCapacity.name)).toBeVisible();blocked=true;
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(root(page).locator('.platform-capacity-planning__warning')).toContainText('Showing the last successful snapshot.');
  await expect(card(page,criticalCapacity.name)).toBeVisible();
 });
 test('PCAP-080 Read role cannot access mutation UI; server enforcement remains Phase 2',async({page})=>{
  const writes:string[]=[];await openCapacity(page,{permissions:without('platform.capacity.write'),onCall:(m,p)=>{if(m!=='GET'&&p.startsWith(endpoint))writes.push(`${m} ${p}`);}});
  await expect(editor(page)).toHaveCount(0);await expect(card(page,criticalCapacity.name).getByRole('button',{name:'Archive'})).toHaveCount(0);
  expect(writes).toHaveLength(0); // Does NOT demonstrate real backend ACL or PostgreSQL audit durability.
 });
});
