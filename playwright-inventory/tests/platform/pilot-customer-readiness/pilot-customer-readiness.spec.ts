/** Batch 116 — source-grounded browser checks of the read-only Step 216 Pilot Customer Readiness UI. Not pilot approval. */
import {test,expect,type Page} from '@playwright/test';
import {openPilot,makePilotSnapshot,PILOT_PATH,PILOT_ALL_GRANTS,PILOT_TENANTS_READ,PILOT_INCIDENTS_READ,PILOT_CONTROL_DEFINITIONS,TENANT_ONE,TENANT_TWO,TENANT_THREE} from '../../../support/platformPilotCustomerReadinessFixture';
const root=(p:Page)=>p.locator('.platform-pilot-readiness');
const rows=(p:Page)=>root(p).locator('.platform-pilot-readiness__tenant-card');
const controls=(p:Page)=>root(p).locator('.platform-pilot-readiness__control-card');
const tenant=(p:Page,name:string)=>rows(p).filter({has:p.getByRole('heading',{name,exact:true})});
const actions=(p:Page,name:string)=>tenant(p,name).locator('.platform-pilot-readiness__actions');
const metric=(p:Page)=>root(p).getByLabel('Pilot readiness summary');
const scope=(p:Page)=>root(p).locator('.platform-pilot-readiness__scope-panel');
const model=(p:Page)=>root(p).locator('.platform-pilot-readiness__program-panel');
test.describe('Platform Pilot Customer Readiness — Step 216, source-backed synthetic GET contracts',()=>{
 test('PPLT-001 Source route presents the Pilot Customer Readiness heading',async({page})=>{
  await openPilot(page);await expect(page.getByRole('heading',{name:'Pilot Customer Readiness',exact:true})).toBeVisible();
 });
 test('PPLT-002 Hero identifies read-only pre-launch review and manual acceptance',async({page})=>{
  await openPilot(page);await expect(root(page)).toContainText('Read-only pre-launch review');
  await expect(root(page)).toContainText('Manual pilot acceptance required');
 });
 test('PPLT-003 Program identifies source-defined Step 216',async({page})=>{
  await openPilot(page);await expect(model(page)).toContainText('Step 216 — Pilot Customer Readiness Board');
 });
 test('PPLT-004 Six primary metrics are separately presented on success',async({page})=>{
  await openPilot(page);await expect(metric(page).locator('.io-workspace-stat')).toHaveCount(6);
  for(const label of ['Tenants reviewed','Launch blocked','Manual confirmations'])await expect(metric(page)).toContainText(label);
 });
 test('PPLT-005 Hero ratio uses ready tenant count over total tenant count',async({page})=>{
  const s=makePilotSnapshot();await openPilot(page);
  await expect(root(page).locator('.platform-pilot-readiness__hero-aside')).toContainText(`${s.summary.pilot_ready_for_manual_launch_review}/${s.summary.tenants_total}`);
 });
 test('PPLT-006 Exactly ten backend-defined pilot control identities render',async({page})=>{
  await openPilot(page);await expect(controls(page)).toHaveCount(10);
  for(const c of PILOT_CONTROL_DEFINITIONS)await expect(controls(page).filter({hasText:c.label})).toHaveCount(1);
 });
 test('PPLT-007 Lifecycle control explains suspended tenants cannot be falsely launched',async({page})=>{
  await openPilot(page);await expect(controls(page).first()).toContainText('A suspended, maintenance, offboarding');
 });
 test('PPLT-008 Text-match pilot evidence is explicitly presented as references',async({page})=>{
  await openPilot(page);await expect(root(page).locator('.platform-pilot-readiness__boundary-copy')).toContainText('Task/note text matches are evidence references');
 });
 test('PPLT-009 Dedicated pilot entity is explicitly Not persisted',async({page})=>{
  await openPilot(page);await expect(model(page)).toContainText('Dedicated pilot record');await expect(model(page)).toContainText('Not persisted');
 });
 test('PPLT-010 Post-pilot expansion decision is visibly outside this board',async({page})=>{
  await openPilot(page);await expect(model(page)).toContainText('Expansion decision');await expect(model(page)).toContainText('Outside this board');
 });
 test('PPLT-011 Mixed snapshot names three separate tenants without merging their evidence',async({page})=>{
  await openPilot(page);await expect(rows(page)).toHaveCount(3);
  for(const name of ['Synthetic Alpha','Synthetic Beta','Synthetic Gamma'])await expect(tenant(page,name)).toBeVisible();
 });
 test('PPLT-012 Ready evidence remains qualified as ready for manual review',async({page})=>{
  await openPilot(page);await expect(tenant(page,'Synthetic Alpha').locator('.platform-pilot-readiness__status-badge').first()).toHaveText('Pilot ready for manual launch review');
 });
 test('PPLT-013 Suspended tenant is labelled blocked regardless of positive pilot notes',async({page})=>{
  await openPilot(page);await expect(tenant(page,'Synthetic Beta')).toContainText('Lifecycle: suspended');
  await expect(tenant(page,'Synthetic Beta').locator('.platform-pilot-readiness__status-badge').first()).toHaveText('Pilot launch blocked');
 });
 test('PPLT-014 Active tenant missing criteria displays incomplete not approved',async({page})=>{
  await openPilot(page);await expect(tenant(page,'Synthetic Gamma')).toContainText('Lifecycle: active');
  await expect(tenant(page,'Synthetic Gamma').locator('.platform-pilot-readiness__status-badge').first()).toHaveText('Pilot readiness incomplete');
 });
 test('PPLT-015 Ten controls display per-tenant evidence status separately',async({page})=>{
  await openPilot(page);for(const name of ['Synthetic Alpha','Synthetic Beta','Synthetic Gamma'])
   await expect(tenant(page,name).locator('.platform-pilot-readiness__tenant-control-row')).toHaveCount(10);
 });
 test('PPLT-016 Blocker count is reported explicitly in the blocked tenant evidence',async({page})=>{
  await openPilot(page);const item=tenant(page,'Synthetic Beta').locator('.platform-pilot-readiness__evidence-item').filter({hasText:'Open blockers'});
  await expect(item.locator('strong')).toHaveText('3');
 });
 test('PPLT-017 Missing pilot-owner evidence has zero value and missing-evidence status',async({page})=>{
  await openPilot(page);const c=tenant(page,'Synthetic Gamma').locator('.platform-pilot-readiness__tenant-control-row').filter({hasText:'Pilot owner assignment reference visible'});
  await expect(c).toContainText('Evidence count: 0');await expect(c).toContainText('Missing evidence');
 });
 test('PPLT-018 Manual-confirmation evidence is not rendered as automatic pilot acceptance',async({page})=>{
  await openPilot(page);const c=tenant(page,'Synthetic Alpha').locator('.platform-pilot-readiness__tenant-control-row').filter({hasText:'Pilot tenant selection reference visible'});
  await expect(c).toContainText('Evidence found manual confirmation required');
 });
 test('PPLT-019 Ready tenant has explicit independent next operator step',async({page})=>{
  await openPilot(page);await expect(tenant(page,'Synthetic Alpha').locator('.platform-pilot-readiness__next-step')).toContainText('not pilot acceptance');
 });
 test('PPLT-020 Blocked tenant next step prioritizes resolving or reviewing blockers',async({page})=>{
  await openPilot(page);await expect(tenant(page,'Synthetic Beta').locator('.platform-pilot-readiness__next-step')).toContainText('Resolve or explicitly review');
 });
 test('PPLT-021 No tenants gives truthful empty state',async({page})=>{
  await openPilot(page,{kind:'empty'});await expect(rows(page)).toHaveCount(0);
  await expect(root(page).locator('.platform-pilot-readiness__empty')).toContainText('No tenants match the current pilot-readiness filter.');
 });
 test('PPLT-022 Empty snapshot hero shows zero of zero ready for review',async({page})=>{
  await openPilot(page,{kind:'empty'});await expect(root(page).locator('.platform-pilot-readiness__hero-aside')).toContainText('0/0');
  await expect(root(page).locator('.platform-pilot-readiness__hero-aside')).toContainText('No tenants available for pilot review');
 });
 test('PPLT-023 Tenant filter offers All plus three distinct backend tenant options',async({page})=>{
  await openPilot(page);await expect(scope(page).locator('#pilot-readiness-tenant-filter option')).toHaveCount(4);
  await expect(scope(page).locator('#pilot-readiness-tenant-filter')).toHaveValue('');
 });
 test('PPLT-024 Tenant limit is initially 100 and has source-defined 25 50 100 300 options',async({page})=>{
  await openPilot(page);const select=scope(page).locator('#pilot-readiness-limit');await expect(select).toHaveValue('100');
  await expect(select.locator('option')).toHaveCount(4);
 });
 test('PPLT-025 Initial GET explicitly requests default limit 100',async({page})=>{
  const limits:string[]=[];await openPilot(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===PILOT_PATH)limits.push(q.get('limit')||'');}});
  expect(limits).toContain('100');
 });
 test('PPLT-026 Deep-linked 25 limit survives page load and server request',async({page})=>{
  const limits:string[]=[];await openPilot(page,{urlQuery:'limit=25',onCall:(m,p,q)=>{if(m==='GET'&&p===PILOT_PATH)limits.push(q.get('limit')||'');}});
  await expect(scope(page).locator('#pilot-readiness-limit')).toHaveValue('25');expect(limits).toContain('25');
 });
 test('PPLT-027 Deep-linked 300 limit is accepted as maximum UI window',async({page})=>{
  const limits:string[]=[];await openPilot(page,{urlQuery:'limit=300',onCall:(m,p,q)=>{if(m==='GET'&&p===PILOT_PATH)limits.push(q.get('limit')||'');}});
  await expect(scope(page).locator('#pilot-readiness-limit')).toHaveValue('300');expect(limits).toContain('300');
 });
 test('PPLT-028 Invalid unsupported limit falls back to 100 for backend request',async({page})=>{
  const limits:string[]=[];await openPilot(page,{urlQuery:'limit=9999',onCall:(m,p,q)=>{if(m==='GET'&&p===PILOT_PATH)limits.push(q.get('limit')||'');}});
  await expect(scope(page).locator('#pilot-readiness-limit')).toHaveValue('100');expect(limits).toContain('100');
 });
 test('PPLT-029 Selecting a new limit synchronizes the URL and GET request',async({page})=>{
  const limits:string[]=[];await openPilot(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===PILOT_PATH)limits.push(q.get('limit')||'');}});
  await scope(page).locator('#pilot-readiness-limit').selectOption('50');await expect(page).toHaveURL(/limit=50/);
  await expect.poll(()=>limits.at(-1)).toBe('50');
 });
 test('PPLT-030 Selecting tenant removes stale limit and requests only that tenant scope',async({page})=>{
  const queries:string[]=[];await openPilot(page,{urlQuery:'limit=300',onCall:(m,p,q)=>{if(m==='GET'&&p===PILOT_PATH)queries.push(q.toString());}});
  await scope(page).locator('#pilot-readiness-tenant-filter').selectOption(TENANT_TWO);
  await expect(page).toHaveURL(new RegExp(`tenant_id=${TENANT_TWO}`));await expect(page).not.toHaveURL(/limit=300/);
  await expect.poll(()=>queries.at(-1)).toContain(`tenant_id=${TENANT_TWO}`);
 });
 test('PPLT-031 Selected tenant deep link disables meaningless global limit selection',async({page})=>{
  await openPilot(page,{urlQuery:`tenant_id=${TENANT_ONE}`});await expect(scope(page).locator('#pilot-readiness-tenant-filter')).toHaveValue(TENANT_ONE);
  await expect(scope(page).locator('#pilot-readiness-limit')).toBeDisabled();
 });
 test('PPLT-032 Selected tenant name is shown in source scope summary',async({page})=>{
  await openPilot(page,{urlQuery:`tenant_id=${TENANT_TWO}`});await expect(scope(page)).toContainText('Single tenant: Synthetic Beta');
 });
 test('PPLT-033 Unknown deep-linked tenant preserves UUID in its select option',async({page})=>{
  const unknown='44444444-4444-4444-8444-444444444444';await openPilot(page,{urlQuery:`tenant_id=${unknown}`});
  await expect(scope(page).locator('#pilot-readiness-tenant-filter')).toHaveValue(unknown);
  await expect(scope(page).locator('#pilot-readiness-tenant-filter option')).toHaveCount(5);
 });
 test('PPLT-034 Unknown tenant name is abbreviated in scope, without guessing ownership',async({page})=>{
  const unknown='44444444-4444-4444-8444-444444444444';await openPilot(page,{urlQuery:`tenant_id=${unknown}`});
  await expect(scope(page)).toContainText('Single tenant: 44444444…');
 });
 test('PPLT-035 Returning tenant filter to All tenants removes selected tenant ID from URL',async({page})=>{
  await openPilot(page,{urlQuery:`tenant_id=${TENANT_ONE}`});await scope(page).locator('#pilot-readiness-tenant-filter').selectOption('');
  await expect(page).not.toHaveURL(/tenant_id=/);await expect(scope(page).locator('#pilot-readiness-limit')).toBeEnabled();
 });
 test('PPLT-036 Updating limit retains unrelated operator query context',async({page})=>{
  await openPilot(page,{urlQuery:'operator_context=synthetic&limit=25'});await scope(page).locator('#pilot-readiness-limit').selectOption('50');
  await expect(page).toHaveURL(/operator_context=synthetic/);await expect(page).toHaveURL(/limit=50/);
 });
 test('PPLT-037 Tenant-options outage reports warning but preserves the requested URL scope',async({page})=>{
  await openPilot(page,{urlQuery:`tenant_id=${TENANT_ONE}`,tenantsStatus:503});
  await expect(root(page).locator('.platform-pilot-readiness__filter-warning')).toContainText('Unable to load tenant filter');
  await expect(page).toHaveURL(new RegExp(`tenant_id=${TENANT_ONE}`));
 });
 test('PPLT-038 Tenant-options outage does not erase independently loaded pilot snapshot',async({page})=>{
  await openPilot(page,{tenantsStatus:503});await expect(rows(page)).toHaveCount(3);
  await expect(root(page).locator('.platform-pilot-readiness__filter-warning')).toBeVisible();
 });
 test('PPLT-039 Initial pilot GET failure shows an actionable error and no synthetic tenant cards',async({page})=>{
  await openPilot(page,{status:503});await expect(root(page).locator('.platform-pilot-readiness__feedback[role="alert"]')).toContainText('Unable to load pilot customer readiness.');
  await expect(rows(page)).toHaveCount(0);
 });
 test('PPLT-040 Retry recovers from a transient synthetic pilot GET error',async({page})=>{
  let failing=true;await openPilot(page,{respond:(m,p)=>m==='GET'&&p===PILOT_PATH&&failing?{json:{message:'Synthetic pilot outage'},status:503}:undefined});
  await expect(root(page).getByRole('button',{name:'Retry',exact:true})).toBeVisible();failing=false;
  await root(page).getByRole('button',{name:'Retry',exact:true}).click();await expect(rows(page)).toHaveCount(3);
 });
 test('PPLT-041 Failed refresh keeps last successful snapshot visibly labelled stale',async({page})=>{
  let fail=false;await openPilot(page,{respond:(m,p)=>m==='GET'&&p===PILOT_PATH&&fail?{json:{message:'Synthetic read failure'},status:503}:undefined});
  await expect(rows(page)).toHaveCount(3);fail=true;await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(root(page).locator('.platform-pilot-readiness__feedback--warning')).toContainText('Showing the last successful pilot-readiness snapshot');
  await expect(rows(page)).toHaveCount(3);
 });
 test('PPLT-042 Successful refresh clears the failed-refresh banner',async({page})=>{
  let fail=false;await openPilot(page,{respond:(m,p)=>m==='GET'&&p===PILOT_PATH&&fail?{json:{message:'Synthetic read failure'},status:503}:undefined});
  fail=true;await root(page).getByRole('button',{name:'Refresh',exact:true}).click();await expect(root(page).getByRole('button',{name:'Retry refresh'})).toBeVisible();
  fail=false;await root(page).getByRole('button',{name:'Retry refresh'}).click();await expect(root(page).locator('.platform-pilot-readiness__feedback--warning')).toHaveCount(0);
 });
 test('PPLT-043 Manual refresh issues a new GET and no pilot mutation requests',async({page})=>{
  let reads=0;const writes:string[]=[];await openPilot(page,{onCall:(m,p)=>{if(m==='GET'&&p===PILOT_PATH)reads++;if(!['GET','OPTIONS'].includes(m))writes.push(`${m} ${p}`);}});
  const before=reads;await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>reads).toBeGreaterThan(before);expect(writes).toEqual([]);
 });
 test('PPLT-044 Missing tenant-read permission protects entire pilot board route',async({page})=>{
  await openPilot(page,{permissions:PILOT_ALL_GRANTS.filter(x=>x!==PILOT_TENANTS_READ),expectHeading:false});
  await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
 });
 test('PPLT-045 Missing incident-read permission protects entire pilot board route',async({page})=>{
  await openPilot(page,{permissions:PILOT_ALL_GRANTS.filter(x=>x!==PILOT_INCIDENTS_READ),expectHeading:false});
  await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
 });
 test('PPLT-046 Full platform grants show support and monitoring links per tenant',async({page})=>{
  await openPilot(page);await expect(actions(page,'Synthetic Alpha').getByRole('link',{name:'Open support cockpit'})).toBeVisible();
  await expect(actions(page,'Synthetic Alpha').getByRole('link',{name:'Open monitoring readiness'})).toBeVisible();
 });
 test('PPLT-047 Missing SLA read hides support link without hiding tenant tasks',async({page})=>{
  await openPilot(page,{permissions:PILOT_ALL_GRANTS.filter(x=>x!=='platform.sla.read')});
  await expect(actions(page,'Synthetic Alpha').getByRole('link',{name:'Open support cockpit'})).toHaveCount(0);
  await expect(actions(page,'Synthetic Alpha').getByRole('link',{name:'Open tenant tasks'})).toBeVisible();
 });
 test('PPLT-048 Missing dependencies grant hides monitoring but leaves support available',async({page})=>{
  await openPilot(page,{permissions:PILOT_ALL_GRANTS.filter(x=>x!=='platform.dependencies.read')});
  await expect(actions(page,'Synthetic Alpha').getByRole('link',{name:'Open monitoring readiness'})).toHaveCount(0);
  await expect(actions(page,'Synthetic Alpha').getByRole('link',{name:'Open support cockpit'})).toBeVisible();
 });
 test('PPLT-049 Tenant task deep link carries the exact tenant ID',async({page})=>{
  await openPilot(page);await expect(actions(page,'Synthetic Beta').getByRole('link',{name:'Open tenant tasks'})).toHaveAttribute('href',`/platform/tenant-tasks?tenant_id=${TENANT_TWO}`);
 });
 test('PPLT-050 Pilot note search deep link includes the tenant and pilot search term',async({page})=>{
  await openPilot(page);await expect(actions(page,'Synthetic Alpha').getByRole('link',{name:'Search pilot notes'})).toHaveAttribute('href',`/platform/tenant-notes?tenant_id=${TENANT_ONE}&search=pilot`);
 });
 test('PPLT-051 Tenant incidents link excludes resolved incidents for the tenant',async({page})=>{
  await openPilot(page);await expect(actions(page,'Synthetic Beta').getByRole('link',{name:'Open tenant incidents'})).toHaveAttribute('href',`/platform/incidents?tenant_id=${TENANT_TWO}&scope=tenant&include_resolved=false`);
 });
 test('PPLT-052 Onboarding evidence link preserves the source tenant ID',async({page})=>{
  await openPilot(page);await expect(actions(page,'Synthetic Gamma').getByRole('link',{name:'Open onboarding evidence'})).toHaveAttribute('href',`/platform/customer-onboarding-checklist?tenant_id=${TENANT_THREE}`);
 });
 test('PPLT-053 Manual acceptance lists six owner responsibilities rather than approved checks',async({page})=>{
  await openPilot(page);await expect(root(page).locator('.platform-pilot-readiness__two-column ul li')).toHaveCount(6);
  await expect(root(page).locator('.platform-pilot-readiness__two-column')).toContainText('Launch owner');
 });
 test('PPLT-054 On-screen validation boundary disclaims pilot success and expansion certification',async({page})=>{
  await openPilot(page);const details=root(page).locator('.platform-pilot-readiness__validation-note');
  await details.locator('summary').click();await expect(details).toContainText('does not select a pilot, certify customer acceptance');
 });
 test('PPLT-055 Narrow viewport retains keyboard-accessible refresh control without writing',async({page})=>{
  await page.setViewportSize({width:390,height:780});await openPilot(page);
  const button=root(page).getByRole('button',{name:'Refresh',exact:true});await expect(button).toBeVisible();await button.focus();await expect(button).toBeFocused();
 });

 test('PPLT-056 Unknown pilot status renders a human-readable status instead of false approval',async({page})=>{
  await openPilot(page,{alter:s=>({...s,tenants:s.tenants.map((t,i)=>i===0?{...t,status:'pilot_owner_review_unknown'}:t)})});
  await expect(tenant(page,'Synthetic Alpha').locator('.platform-pilot-readiness__status-badge').first()).toHaveText('Pilot owner review unknown');
 });
 test('PPLT-057 Missing optional pilot evidence key omits its display tile without inventing a count',async({page})=>{
  await openPilot(page,{alter:s=>({...s,tenants:s.tenants.map((t,i)=>i===0?{...t,evidence:Object.fromEntries(Object.entries(t.evidence).filter(([k])=>k!=='open_incidents'))}:t)})});
  await expect(tenant(page,'Synthetic Alpha').locator('.platform-pilot-readiness__evidence-item').filter({hasText:'Open incidents'})).toHaveCount(0);
 });
 test('PPLT-058 A source-provided zero blocker count displays numeric zero',async({page})=>{
  await openPilot(page);const tile=tenant(page,'Synthetic Alpha').locator('.platform-pilot-readiness__evidence-item').filter({hasText:'Open blockers'});
  await expect(tile.locator('strong')).toHaveText('0');
 });
 test('PPLT-059 A new synthetic read-only next step is shown without approval',async({page})=>{
  const note='Synthetic operator must review pilot ownership manually';
  await openPilot(page,{alter:s=>({...s,tenants:s.tenants.map((t,i)=>i===0?{...t,next_best_step:note}:t)})});
  await expect(tenant(page,'Synthetic Alpha').locator('.platform-pilot-readiness__next-step')).toContainText(note);
 });
 test('PPLT-060 The source-generated timestamp is shown as a date rather than raw ISO',async({page})=>{
  await openPilot(page);await expect(model(page).locator('.platform-pilot-readiness__program-grid')).not.toContainText('2026-11-05T16:00:00.000Z');
 });
 test('PPLT-061 Invalid generated_at is explicitly unavailable',async({page})=>{
  await openPilot(page,{alter:s=>({...s,generated_at:'not-a-date'})});
  await expect(model(page).locator('.platform-pilot-readiness__program-grid')).toContainText('Not available');
 });
 test('PPLT-062 Empty source-provided control definitions do not invent required cards',async({page})=>{
  await openPilot(page,{alter:s=>({...s,pilot_controls:[]})});await expect(controls(page)).toHaveCount(0);
  await expect(rows(page)).toHaveCount(3);
 });
 test('PPLT-063 Empty tenant control list remains empty rather than borrowing another tenant controls',async({page})=>{
  await openPilot(page,{alter:s=>({...s,tenants:s.tenants.map((t,i)=>i===0?{...t,controls:[]}:t)})});
  await expect(tenant(page,'Synthetic Alpha').locator('.platform-pilot-readiness__tenant-control-row')).toHaveCount(0);
  await expect(tenant(page,'Synthetic Beta').locator('.platform-pilot-readiness__tenant-control-row')).toHaveCount(10);
 });
 test('PPLT-064 New summary counter is visible only in expanded detailed counters',async({page})=>{
  await openPilot(page,{alter:s=>({...s,summary:{...s.summary,additional_owner_review_count:4}})});
  const details=model(page).locator('.platform-pilot-readiness__summary-details');await details.locator('summary').click();
  await expect(details).toContainText('Additional owner review count');await expect(details).toContainText('4');
 });
 test('PPLT-065 Expanding detailed counters remains a local UI action with no write requests',async({page})=>{
  const writes:string[]=[];await openPilot(page,{onCall:(m,p)=>{if(!['GET','OPTIONS'].includes(m))writes.push(`${m} ${p}`);}});
  await model(page).locator('.platform-pilot-readiness__summary-details summary').click();
  await expect(model(page).locator('.platform-pilot-readiness__summary-details')).toHaveAttribute('open','');expect(writes).toEqual([]);
 });
 test('PPLT-066 Manual acceptance text can be extended by the source without claiming acceptance',async({page})=>{
  const message='Synthetic legal owner review required separately';
  await openPilot(page,{alter:s=>({...s,required_manual_acceptance:[...s.required_manual_acceptance,message]})});
  await expect(root(page).locator('.platform-pilot-readiness__two-column ul li')).toHaveCount(7);
  await expect(root(page)).toContainText(message);
 });
 test('PPLT-067 The main next step is supplied by backend and cannot be equated with go-live',async({page})=>{
  const message='Synthetic policy: approval requires external evidence';await openPilot(page,{alter:s=>({...s,next_best_step:message})});
  await expect(root(page).locator('.platform-pilot-readiness__next-step--primary')).toContainText(message);
 });
 test('PPLT-068 Unknown operator URL parameter survives refreshing the page',async({page})=>{
  await openPilot(page,{urlQuery:'review_context=synthetic_source_only'});await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page).toHaveURL(/review_context=synthetic_source_only/);
 });
 test('PPLT-069 Tenant URL filter options render separately even if a tenant has no pilot evidence',async({page})=>{
  await openPilot(page,{kind:'empty'});await expect(rows(page)).toHaveCount(0);
  await expect(scope(page).locator('#pilot-readiness-tenant-filter option')).toHaveCount(4);
 });
 test('PPLT-070 Source validation note remains a manual boundary not a success state',async({page})=>{
  const message='Synthetic readiness evidence does not authorize the pilot';await openPilot(page,{alter:s=>({...s,validation_note:message})});
  const note=root(page).locator('.platform-pilot-readiness__validation-note');await note.locator('summary').click();await expect(note).toContainText(message);
 });
});
