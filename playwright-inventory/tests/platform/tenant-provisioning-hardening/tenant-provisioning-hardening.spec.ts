/** Batch 109 — tenant provisioning hardening, Phase 1 authored-only scenarios.
 * Stubbed evidence is NOT a real preset audit, customer provisioning, SQL isolation,
 * supported billing plan, external certification, or independent permission proof. */
import {test,expect,type Page} from '@playwright/test';
import {openHardening,hardRows,hardPresets,makeHardTenant,makeHardeningPackage,
 hardTenantA,hardTenantB,hardTenantC,HARDENING_PATH,HARDENING_PERMISSIONS} from '../../../support/platformTenantProvisioningHardeningFixture';
const root=(p:Page)=>p.locator('.platform-provisioning-hardening');
const cards=(p:Page)=>root(p).locator('.platform-provisioning-hardening__tenant-card');
const metrics=(p:Page)=>root(p).getByLabel('Tenant provisioning hardening key metrics');
const mutations=(calls:{method:string;path:string}[])=>calls.filter(c=>!['GET','OPTIONS'].includes(c.method));

test.describe('Platform Tenant Provisioning Hardening — read-only source evidence',()=>{
 test('PTPH-001 Hero distinguishes evidence from actual tenant provisioning',async({page})=>{
  await openHardening(page);await expect(root(page)).toContainText('Verify that each provisioned tenant');
 });
 test('PTPH-002 Platform and read-only scope badges remain visible',async({page})=>{
  await openHardening(page);await expect(root(page)).toContainText('Platform-scoped');await expect(root(page)).toContainText('Read-only evidence');
 });
 test('PTPH-003 Pre-onboarding gate explicitly precedes customer onboarding',async({page})=>{
  await openHardening(page);await expect(root(page)).toContainText('Pre-onboarding gate');
 });
 test('PTPH-004 Scope starts with all tenants and an approved window',async({page})=>{
  await openHardening(page);await expect(page.getByLabel('Tenant filter')).toHaveValue('');await expect(page.getByLabel('Tenant limit')).toHaveValue('100');
 });
 test('PTPH-005 Default selected window is Latest 100 tenants',async({page})=>{
  await openHardening(page);await expect(root(page)).toContainText('Latest 100 tenants by creation date');
 });
 test('PTPH-006 Initial evidence request contains tenant window limit 100',async({page})=>{
  const requests:string[]=[];await openHardening(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===HARDENING_PATH)requests.push(q.toString());}});
  await expect.poll(()=>requests.length).toBeGreaterThan(0);expect(requests[0]).toContain('limit=100');
 });
 test('PTPH-007 Three independent synthetic tenant cards render',async({page})=>{
  await openHardening(page);await expect(cards(page)).toHaveCount(3);
 });
 test('PTPH-008 Overview distinguishes total tenants from hardened',async({page})=>{
  await openHardening(page);await expect(metrics(page)).toContainText('Tenants in scope');await expect(metrics(page)).toContainText('Hardened for onboarding');
 });
 test('PTPH-009 Control evidence coverage counts only present six-control rows',async({page})=>{
  await openHardening(page);await expect(metrics(page)).toContainText('13/18');
 });
 test('PTPH-010 Incomplete hardening metric is not equivalent to readiness',async({page})=>{
  await openHardening(page);await expect(metrics(page)).toContainText('Incomplete hardening');await expect(cards(page).nth(1)).toContainText('Provisioning hardening incomplete');
 });
 test('PTPH-011 Missing active admin metric remains visible',async({page})=>{
  await openHardening(page);await expect(metrics(page)).toContainText('Missing active admin');
 });
 test('PTPH-012 Missing starter locations metric remains visible',async({page})=>{
  await openHardening(page);await expect(metrics(page)).toContainText('Missing starter locations');
 });
 test('PTPH-013 Audit gap reports tenant count without claiming audit certification',async({page})=>{
  await openHardening(page);await expect(root(page).locator('.platform-provisioning-hardening__gap-summary').first()).toContainText('Audit trail gaps');await expect(root(page).locator('.platform-provisioning-hardening__gap-summary').first()).toContainText('1 tenant(s)');
 });
 test('PTPH-014 Handoff gap is distinct from other provisioning controls',async({page})=>{
  await openHardening(page);await expect(root(page).locator('.platform-provisioning-hardening__gap-summary').last()).toContainText('Onboarding handoff gaps');
 });
 test('PTPH-015 Program step identifies source evidence phase 209',async({page})=>{
  await openHardening(page);await expect(root(page).locator('.platform-provisioning-hardening__program-panel')).toContainText('Step 209');
 });
 test('PTPH-016 Program disclaimer disclaims actual provisioning',async({page})=>{
  await openHardening(page);await expect(root(page)).toContainText('It does not provision tenants or certify commercial launch');
 });
 test('PTPH-017 Two configured commercial presets appear as separate cards',async({page})=>{
  await openHardening(page);await expect(root(page).locator('.platform-provisioning-hardening__preset-card')).toHaveCount(2);
 });
 test('PTPH-018 Preset facts distinguish starter locations flags and limits',async({page})=>{
  await openHardening(page);const p=root(page).locator('.platform-provisioning-hardening__preset-card').first();await expect(p).toContainText('2 starter locations');await expect(p).toContainText('2 feature flags');await expect(p).toContainText('1 configured limits');
 });
 test('PTPH-019 Changing synthetic preset descriptions changes display only',async({page})=>{
  const presets=hardPresets.map(p=>({...p,description:'Review-only custom label '+p.key}));await openHardening(page,{presets});await expect(root(page)).toContainText('Review-only custom label retail_starter');
 });
 test('PTPH-020 Empty presets response shows descriptive empty state',async({page})=>{
  await openHardening(page,{presets:[]});await expect(root(page)).toContainText('No published provisioning presets are available');
 });
 test('PTPH-021 Each tenant has six backend-defined hardening controls',async({page})=>{
  await openHardening(page);await expect(cards(page).first().locator('.platform-provisioning-hardening__control-row')).toHaveCount(6);
 });
 test('PTPH-022 Each tenant displays twelve provisioning evidence fields',async({page})=>{
  await openHardening(page);await expect(cards(page).first().locator('.platform-provisioning-hardening__evidence-card')).toHaveCount(12);
 });
 test('PTPH-023 Hardened synthetic tenant has no missing control',async({page})=>{
  await openHardening(page);await expect(cards(page).first()).toContainText('Provisioning hardened for onboarding');await expect(cards(page).first().locator('.platform-provisioning-hardening__control-row').filter({hasText:'Missing evidence'})).toHaveCount(0);
 });
 test('PTPH-024 Missing audited preset is explicitly flagged',async({page})=>{
  await openHardening(page);await expect(cards(page).nth(1)).toContainText('Needs provisioning audit evidence');await expect(cards(page).nth(1)).toContainText('Needs audit evidence review');
 });
 test('PTPH-025 Missing active admin and starter location do not appear ready',async({page})=>{
  await openHardening(page);await expect(cards(page).last()).toContainText('Provisioning hardening incomplete');await expect(cards(page).last().locator('.platform-provisioning-hardening__control-row').filter({hasText:'Missing evidence'})).toHaveCount(3);
 });
 test('PTPH-026 Tenant identifiers are visibly shortened but full ID is discoverable',async({page})=>{
  await openHardening(page);await expect(cards(page).first().locator('[title]')).toHaveAttribute('title',hardTenantA);await expect(cards(page).first()).toContainText('Tenant ID b1090000…');
 });
 test('PTPH-027 Tenant directory navigation link points to platform directory',async({page})=>{
  await openHardening(page);await expect(cards(page).first().getByRole('link',{name:'Open tenants'})).toHaveAttribute('href','/platform/tenants');
 });
 test('PTPH-028 Onboarding tasks navigation preserves current tenant UUID',async({page})=>{
  await openHardening(page);await expect(cards(page).first().getByRole('link',{name:'Open onboarding tasks'})).toHaveAttribute('href',`/platform/tenant-tasks?tenant_id=${hardTenantA}&category=onboarding`);
 });
 test('PTPH-029 Provisioning link appears with preset-read permission',async({page})=>{
  await openHardening(page);await expect(cards(page).first().getByRole('link',{name:'Open provisioning'})).toHaveAttribute('href','/platform/provisioning');
 });
 test('PTPH-030 Audit navigation appears only with audit-read permission',async({page})=>{
  await openHardening(page,{permissions:[...HARDENING_PERMISSIONS,'platform.audit.read']});await expect(cards(page).first().getByRole('link',{name:'Open platform audit'})).toHaveAttribute('href','/platform/audit');
 });
 test('PTPH-031 Without audit-read permission audit navigation stays absent',async({page})=>{
  await openHardening(page);await expect(cards(page).first().getByRole('link',{name:'Open platform audit'})).toHaveCount(0);
 });
 test('PTPH-032 Tenant filter exposes directory options distinct from scoped results',async({page})=>{
  await openHardening(page);await expect(page.getByLabel('Tenant filter').locator('option')).toHaveCount(4);await expect(page.getByLabel('Tenant filter')).toContainText('Provisioned Beta');
 });
 test('PTPH-033 Approved tenant windows are bounded to 25 50 100 and 300',async({page})=>{
  await openHardening(page);await expect(page.getByLabel('Tenant limit').locator('option')).toHaveCount(4);
 });
 test('PTPH-034 Tenant selection scopes GET and persists selected UUID in URL',async({page})=>{
  const qs:string[]=[];await openHardening(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===HARDENING_PATH)qs.push(q.toString())}});await page.getByLabel('Tenant filter').selectOption(hardTenantB);await expect(page).toHaveURL(new RegExp(`tenant_id=${hardTenantB}`));await expect.poll(()=>qs.some(q=>q.includes(hardTenantB))).toBeTruthy();await expect(cards(page)).toHaveCount(1);
 });
 test('PTPH-035 Limit change sends corresponding GET and retains URL state',async({page})=>{
  const qs:string[]=[];await openHardening(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===HARDENING_PATH)qs.push(q.toString())}});await page.getByLabel('Tenant limit').selectOption('25');await expect(page).toHaveURL(/limit=25/);await expect.poll(()=>qs.some(q=>q.includes('limit=25'))).toBeTruthy();
 });
 test('PTPH-036 A selected tenant disables but preserves configured window limit',async({page})=>{
  await openHardening(page,{urlQuery:`tenant_id=${hardTenantA}&limit=25`});await expect(cards(page)).toHaveCount(1);await expect(page.getByLabel('Tenant limit')).toBeDisabled();await expect(page.getByLabel('Tenant limit')).toHaveValue('25');
 });
 test('PTPH-037 Unknown tenant URL provides fallback option and not-found error',async({page})=>{
  await openHardening(page,{urlQuery:'tenant_id=b1090000-0000-4000-8000-000000000099'});await expect(page.getByLabel('Tenant filter')).toContainText('Selected tenant');await expect(root(page).getByRole('alert')).toContainText('Unable to load provisioning hardening board');
 });
 test('PTPH-038 Tenant selector failure does not remove valid evidence cards',async({page})=>{
  await openHardening(page,{tenantsStatus:503});await expect(root(page).locator('.platform-provisioning-hardening__filter-warning')).toContainText('Tenant filter options could not be loaded');await expect(cards(page)).toHaveCount(3);
 });
 test('PTPH-039 Empty tenant response reports a neutral empty board',async({page})=>{
  await openHardening(page,{rows:[]});await expect(cards(page)).toHaveCount(0);await expect(root(page)).toContainText('No tenants found for this hardening board');
 });
 test('PTPH-040 Initial fetch failure offers retry that reloads the board',async({page})=>{
  let fail=true;await openHardening(page,{respond:(m,p)=>m==='GET'&&p===HARDENING_PATH&&fail?{status:503,json:{message:'Service unavailable'}}:undefined});await expect(root(page).getByRole('alert')).toContainText('Unable to load provisioning hardening board');fail=false;await root(page).getByRole('button',{name:'Retry'}).click();await expect(cards(page)).toHaveCount(3);
 });
 test.skip('PTPH-041 Real dual-permission denial and cross-tenant SQL evidence require backend acceptance',async()=>{
  // PHASE 2: browser fixture role checks cannot certify platform TENANTS_READ + PLATFORM_PROVISIONING_PRESETS_READ,
  // actual JWT enforcement, preset versions, audit integrity, or live SQL isolation.
 });

 // Batch 110: source-observable continuations. No backend/SQL/certification claims.
 test('PTPH-042 Invalid limit URL retains raw query while request normalizes to 100',async({page})=>{
  const queries:string[]=[];await openHardening(page,{urlQuery:'limit=bogus',onCall:(m,p,q)=>{if(m==='GET'&&p===HARDENING_PATH)queries.push(q.toString());}});
  await expect(page).toHaveURL(/limit=bogus/);await expect(page.getByLabel('Tenant limit')).toHaveValue('100');
  expect(queries.some(q=>new URLSearchParams(q).get('limit')==='100')).toBeTruthy();
 });
 test('PTPH-043 Clearing tenant scope retains an independently chosen 50-tenant window',async({page})=>{
  await openHardening(page,{urlQuery:`tenant_id=${hardTenantA}&limit=50`});
  await expect(page.getByLabel('Tenant limit')).toBeDisabled();
  await page.getByLabel('Tenant filter').selectOption('');
  await expect(page.getByLabel('Tenant limit')).toBeEnabled();await expect(page.getByLabel('Tenant limit')).toHaveValue('50');
  await expect(page).toHaveURL(/limit=50/);await expect(page).not.toHaveURL(/tenant_id=/);
 });
 test('PTPH-044 A published preset with zero starter locations is displayed as zero not certified launch',async({page})=>{
  await openHardening(page,{presets:hardPresets.map((p,i)=>i===0?{...p,storage_locations:[]}:p)});
  await expect(root(page).locator('.platform-provisioning-hardening__preset-card').first()).toContainText('0 starter locations');
  await expect(root(page)).toContainText('does not provision tenants or certify commercial launch');
 });
 test('PTPH-045 Unrecognized organization type remains descriptive text',async({page})=>{
  await openHardening(page,{presets:[{...hardPresets[0],organization_type:'unknown_research_category'}]});
  await expect(root(page).locator('.platform-provisioning-hardening__preset-card').first()).toContainText('Unknown research category');
  await expect(root(page)).toContainText('Similar tenant fields alone are not treated as proof');
 });
 test('PTPH-046 Unrecognized tenant control status does not render green success tone',async({page})=>{
  const unusual=makeHardTenant(hardTenantA,'Provisioned Alpha');unusual.status='unreviewed_custom_posture';
  unusual.controls[0]={...unusual.controls[0],status:'unrecognized_control'};
  await openHardening(page,{rows:[unusual]});
  await expect(cards(page).first().locator('.platform-provisioning-hardening__status-badge').first()).toHaveAttribute('data-tone','accent');
  await expect(cards(page).first().locator('.platform-provisioning-hardening__control-row').first().locator('.platform-provisioning-hardening__status-badge')).toHaveAttribute('data-tone','accent');
 });
 test('PTPH-047 Invalid refresh timestamp shows Not available',async({page})=>{
  await openHardening(page,{alter:p=>({...p,generated_at:'invalid-clock'})});
  await expect(root(page).locator('.platform-provisioning-hardening__refresh-block')).toContainText('Last refreshed: Not available');
 });
 test('PTPH-051 Failed refresh retains dated last successful snapshot and warns',async({page})=>{
  let fail=false;await openHardening(page,{respond:(m,p)=>m==='GET'&&p===HARDENING_PATH&&fail?{status:503,json:{message:'Synthetic refresh outage'}}:undefined});
  await expect(cards(page)).toHaveCount(3);fail=true;
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(root(page).locator('.platform-provisioning-hardening__feedback[role="status"]')).toContainText('Latest provisioning refresh failed');
  await expect(root(page).locator('.platform-provisioning-hardening__feedback[role="status"]')).toContainText('Showing the last successful provisioning snapshot');
  await expect(cards(page)).toHaveCount(3);
 });
 test('PTPH-052 HTTP 429 during refresh retains evidence without implying hardening',async({page})=>{
  let rateLimited=false;await openHardening(page,{respond:(m,p)=>m==='GET'&&p===HARDENING_PATH&&rateLimited?{status:429,json:{message:'Too many requests'}}:undefined});
  rateLimited=true;await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(root(page).locator('.platform-provisioning-hardening__feedback[role="status"]')).toContainText('Latest provisioning refresh failed');
  await expect(cards(page).nth(1)).toContainText('Provisioning hardening incomplete');
  await expect(root(page).getByRole('button',{name:'Refresh'})).toBeEnabled();
 });
 test('PTPH-053 Non-JSON unsuccessful response produces a visible request error and retry',async({page})=>{
  await openHardening(page,{expectHeading:true,rawResponse:(m,p)=>m==='GET'&&p===HARDENING_PATH?{status:502,body:'upstream text error'}:undefined});
  await expect(root(page).getByRole('alert')).toContainText('Unable to load provisioning hardening board');
  await expect(root(page).getByRole('button',{name:'Retry'})).toBeVisible();
 });
 test('PTPH-054 Missing tenant-read grant redirects before hardening page renders',async({page})=>{
  await openHardening(page,{permissions:['platform.provisioning_presets.read'],expectHeading:false});
  await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
 });
 test('PTPH-055 Missing provisioning-preset-read grant redirects before hardening page renders',async({page})=>{
  await openHardening(page,{permissions:['platform.tenants.read'],expectHeading:false});
  await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
 });
 test('PTPH-057 Audit action is absent from all tenant cards with only both page grants',async({page})=>{
  await openHardening(page,{permissions:HARDENING_PERMISSIONS});
  await expect(cards(page)).toHaveCount(3);
  await expect(root(page).getByRole('link',{name:'Open platform audit'})).toHaveCount(0);
 });
 test('PTPH-058 Audit action is enabled on each card with independent audit-read grant',async({page})=>{
  await openHardening(page,{permissions:[...HARDENING_PERMISSIONS,'platform.audit.read']});
  await expect(root(page).getByRole('link',{name:'Open platform audit'})).toHaveCount(3);
  await expect(cards(page).last().getByRole('link',{name:'Open platform audit'})).toHaveAttribute('href','/platform/audit');
 });
 test('PTPH-059 Unknown tenant deep link shows no other tenant evidence',async({page})=>{
  const unknown='b1090000-0000-4000-8000-000000000099';
  await openHardening(page,{urlQuery:`tenant_id=${unknown}`});
  await expect(root(page).getByRole('alert')).toContainText('Unable to load provisioning hardening board');
  await expect(cards(page)).toHaveCount(0);
  await expect(page.getByLabel('Tenant filter')).toHaveValue(unknown);
 });
 test('PTPH-061 Both scope selectors have native labels and are keyboard-focusable',async({page})=>{
  await openHardening(page);
  const tenant=page.getByLabel('Tenant filter'),limit=page.getByLabel('Tenant limit');
  await tenant.focus();await expect(tenant).toBeFocused();await page.keyboard.press('Tab');await expect(limit).toBeFocused();
 });
 test('PTPH-062 Phone-sized layout retains scope preset and evidence panels',async({page})=>{
  await page.setViewportSize({width:390,height:844});await openHardening(page);
  await expect(page.getByLabel('Tenant filter')).toBeVisible();
  await expect(root(page).locator('.platform-provisioning-hardening__preset-card').first()).toBeVisible();
  await expect(cards(page).first().locator('.platform-provisioning-hardening__evidence-card').first()).toBeVisible();
 });
 test('PTPH-063 Evidence-only screen expressly disclaims external customer acceptance',async({page})=>{
  await openHardening(page);await expect(root(page)).toContainText('Read-only evidence');
  await root(page).locator('.platform-provisioning-hardening__validation-note summary').click();
  await expect(root(page).locator('.platform-provisioning-hardening__validation-note')).toContainText('does not provision tenants or certify commercial launch');
 });
 test('PTPH-064 Filters and refresh issue no platform mutation requests',async({page})=>{
  const calls:{method:string;path:string}[]=[];
  await openHardening(page,{onCall:(method,path)=>calls.push({method,path})});
  await page.getByLabel('Tenant limit').selectOption('25');
  await page.getByLabel('Tenant filter').selectOption(hardTenantB);
  await page.getByLabel('Tenant filter').selectOption('');
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(cards(page)).toHaveCount(3);expect(mutations(calls)).toEqual([]);
 });
 test('PTPH-065 Tenant-card navigation is a link, not a provisioning mutation',async({page})=>{
  const calls:{method:string;path:string}[]=[];
  await openHardening(page,{onCall:(method,path)=>calls.push({method,path})});
  const l=cards(page).first().getByRole('link',{name:'Open onboarding tasks'});
  await expect(l).toHaveAttribute('href',`/platform/tenant-tasks?tenant_id=${hardTenantA}&category=onboarding`);
  await l.click();await expect(page).toHaveURL(new RegExp(`tenant-tasks\\?tenant_id=${hardTenantA}`));
  expect(mutations(calls)).toEqual([]);
 });
});
