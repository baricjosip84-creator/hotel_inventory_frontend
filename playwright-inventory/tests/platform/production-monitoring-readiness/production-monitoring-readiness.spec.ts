/** Batch 112 — Production Monitoring Readiness: read-only browser UI contracts.
 * A fixture is NOT proof of SQL, real monitoring, customer communications or production sign-off.
 */
import {test,expect,type Page} from '@playwright/test';
import {openMonitoring,MONITORING_PATH,MONITORING_PERMISSIONS,monitorAlpha,monitorBeta,monitorGamma,
 makeMonitoringSnapshot,makeMonitorTenant,monitoringRows} from '../../../support/platformProductionMonitoringReadinessFixture';
const root=(page:Page)=>page.locator('.platform-monitoring-readiness');
const cards=(page:Page)=>root(page).locator('.platform-monitoring-readiness__tenant-card');
const stats=(page:Page)=>root(page).getByLabel('Production monitoring readiness key metrics');
const first=(page:Page)=>cards(page).first();

test.describe('Platform Production Monitoring Readiness — source-traced technical precheck',()=>{
 test('PPMR-001 Hero names Production Monitoring Readiness',async({page})=>{
  await openMonitoring(page);await expect(root(page)).toContainText('Read-only technical precheck');
 });
 test('PPMR-002 Operator precheck is explicitly not certification',async({page})=>{
  await openMonitoring(page);await expect(root(page)).toContainText('Operator precheck only');
  await expect(root(page).locator('.platform-monitoring-readiness__operator-notice')).toContainText('does not prove real-world uptime');
 });
 test('PPMR-003 Hero identifies no monitoring or incident mutations',async({page})=>{
  await openMonitoring(page);await expect(root(page)).toContainText('No incident or monitoring mutations');
 });
 test('PPMR-004 Source-defined Step 212 appears in programme context',async({page})=>{
  await openMonitoring(page);await expect(root(page).locator('.platform-monitoring-readiness__program-panel')).toContainText('Step 212 — Production Monitoring Readiness Board');
 });
 test('PPMR-005 Unscoped entry leaves tenant_id out of GET',async({page})=>{
  const q:string[]=[];await openMonitoring(page,{onCall:(m,p,s)=>{if(m==='GET'&&p===MONITORING_PATH)q.push(s.toString());}});
  await expect(page.getByLabel('Tenant filter')).toHaveValue('');expect(q[0]).toBe('');
 });
 test('PPMR-006 Directory supplies two tenant choices plus all-tenants option',async({page})=>{
  await openMonitoring(page);await expect(page.getByLabel('Tenant filter').locator('option')).toHaveCount(3);
  await expect(page.getByLabel('Tenant filter')).toContainText('Monitor Beta');
 });
 test('PPMR-007 Scoped counts reflect two independent synthetic tenant rows',async({page})=>{
  await openMonitoring(page);await expect(cards(page)).toHaveCount(2);
  await expect(stats(page)).toContainText('Tenants reviewed');
 });
 test('PPMR-008 Six headline KPI cards are separately rendered',async({page})=>{
  await openMonitoring(page);await expect(stats(page).locator('.io-workspace-stat')).toHaveCount(6);
 });
 test('PPMR-009 Status badges distinguish blocked and ready tenant results',async({page})=>{
  await openMonitoring(page);await expect(first(page)).toContainText('Production monitoring ready');
  await expect(cards(page).nth(1)).toContainText('Production monitoring blocked');
 });
 test('PPMR-010 Blocked posture appears in programme headline without claiming launch certification',async({page})=>{
  await openMonitoring(page);await expect(root(page).locator('.platform-monitoring-readiness__hero-aside')).toContainText('Production monitoring blocked');
 });
 test('PPMR-011 Critical unhealthy and public update KPIs are independent',async({page})=>{
  await openMonitoring(page);await expect(stats(page)).toContainText('Missing public updates');
  await expect(stats(page)).toContainText('Critical unhealthy');
 });
 test('PPMR-012 Detailed summary has seventeen named metrics',async({page})=>{
  await openMonitoring(page);await expect(root(page).locator('.platform-monitoring-readiness__summary-item')).toHaveCount(17);
 });
 test('PPMR-013 Detailed summary includes negative stock and incomplete shipments',async({page})=>{
  await openMonitoring(page);const summary=root(page).locator('.platform-monitoring-readiness__summary-panel');
  await expect(summary).toContainText('Tenants with negative stock');await expect(summary).toContainText('Incomplete finalized shipments');
 });
 test('PPMR-014 Platform evidence is separate from tenant row evidence',async({page})=>{
  await openMonitoring(page);await expect(root(page).locator('.platform-monitoring-readiness__evidence-section')).toContainText('Platform evidence');
  await expect(root(page).locator('.platform-monitoring-readiness__platform-item')).toHaveCount(10);
 });
 test('PPMR-015 Platform incident evidence includes public-update gap',async({page})=>{
  await openMonitoring(page,{platformOverride:{platform_incidents_missing_public_updates:2}});
  await expect(root(page).locator('.platform-monitoring-readiness__evidence-section')).toContainText('Platform incidents missing public updates');
 });
 test('PPMR-016 Platform integration failures remain visible as evidence not delivery proof',async({page})=>{
  await openMonitoring(page,{platformOverride:{integration_failures:3}});
  await expect(root(page).locator('.platform-monitoring-readiness__evidence-section')).toContainText('Integration failures');
  await expect(root(page).locator('.platform-monitoring-readiness__platform-item').filter({hasText:'Integration failures'})).toContainText('3');
 });
 test('PPMR-017 Monitoring control catalogue has nine distinct source definitions',async({page})=>{
  await openMonitoring(page);await expect(root(page).locator('.platform-monitoring-readiness__control-card')).toHaveCount(9);
 });
 test('PPMR-018 Control definitions expose evidence keys',async({page})=>{
  await openMonitoring(page);await expect(root(page).locator('.platform-monitoring-readiness__control-card').first()).toContainText('tenant_status_launchable');
 });
 test('PPMR-019 Public incident update control explains customer-impact boundary',async({page})=>{
  await openMonitoring(page);await expect(root(page).locator('.platform-monitoring-readiness__control-card')).toContainText('Customer-impacting incidents have public updates');
 });
 test('PPMR-020 Controls distinguish integration blockers from review-required evidence',async({page})=>{
  await openMonitoring(page);const grid=root(page).locator('.platform-monitoring-readiness__control-grid');
  await expect(grid).toContainText('Integration monitoring blockers clear');
  await expect(grid).toContainText('Integration monitoring review clear');
 });
 test('PPMR-021 Validation note expands and retains certification boundary',async({page})=>{
  await openMonitoring(page);const details=root(page).locator('.platform-monitoring-readiness__validation-note');
  await details.locator('summary').click();await expect(details).toHaveAttribute('open','');
  await expect(details).toContainText('explicit production-monitoring sign-off');
 });
 test('PPMR-022 Tenant card distinguishes lifecycle and monitoring posture',async({page})=>{
  await openMonitoring(page);await expect(first(page)).toContainText('Active lifecycle');
  await expect(first(page)).toContainText('Production monitoring ready');
 });
 test('PPMR-023 Tenant card exposes unredacted synthetic tenant UUID',async({page})=>{
  await openMonitoring(page);await expect(first(page)).toContainText(monitorAlpha);
 });
 test('PPMR-024 System health drill-down is a global route',async({page})=>{
  await openMonitoring(page);await expect(first(page).getByRole('link',{name:'System health'})).toHaveAttribute('href','/platform/system-health');
 });
 test('PPMR-025 Incidents drill-down includes tenant scope and excludes resolved',async({page})=>{
  await openMonitoring(page);const href=await cards(page).nth(1).getByRole('link',{name:'Incidents'}).getAttribute('href');
  const url=new URL(href!,'http://example.invalid');expect(url.searchParams.get('scope')).toBe('tenant');
  expect(url.searchParams.get('tenant_id')).toBe(monitorBeta);expect(url.searchParams.get('include_resolved')).toBe('false');
 });
 test('PPMR-026 Dependencies drill-down requests only_attention mode',async({page})=>{
  await openMonitoring(page);await expect(first(page).getByRole('link',{name:'Dependencies'})).toHaveAttribute('href','/platform/service-dependencies?only_attention=true');
 });
 test('PPMR-027 Integrations drill-down points to canonical integration monitoring',async({page})=>{
  await openMonitoring(page);await expect(first(page).getByRole('link',{name:'Integrations'})).toHaveAttribute('href','/platform/integration-monitoring');
 });
 test('PPMR-028 Tenant health shows issues, blocking alerts, negative stock and finalization separately',async({page})=>{
  await openMonitoring(page);const grid=cards(page).nth(1).locator('.platform-monitoring-readiness__evidence-grid');
  for(const label of ['Issues: 2','Blocking alerts: 2','Negative stock: 0','Incomplete finalized shipments: 0'])await expect(grid).toContainText(label);
 });
 test('PPMR-029 Launchable is shown separately from blocked health posture',async({page})=>{
  await openMonitoring(page);await expect(cards(page).nth(1).locator('.platform-monitoring-readiness__evidence-grid')).toContainText('Launchable: Yes');
  await expect(cards(page).nth(1)).toContainText('Production monitoring blocked');
 });
 test('PPMR-030 Incident evidence shows total and customer-impacting separately',async({page})=>{
  await openMonitoring(page);const grid=first(page).locator('.platform-monitoring-readiness__evidence-grid');
  await expect(grid).toContainText('Open: 0');await expect(grid).toContainText('Customer-impacting: 0');
 });
 test('PPMR-031 Incident public update counts and missing updates remain distinct',async({page})=>{
  await openMonitoring(page);const grid=first(page).locator('.platform-monitoring-readiness__evidence-grid');
  await expect(grid).toContainText('With public updates: 0');await expect(grid).toContainText('Missing public updates: 0');
 });
 test('PPMR-032 Tenant dependency evidence displays unhealthy versus critical',async({page})=>{
  await openMonitoring(page);const grid=first(page).locator('.platform-monitoring-readiness__evidence-grid');
  await expect(grid).toContainText('Unhealthy dependencies: 0');await expect(grid).toContainText('Critical unhealthy: 0');
 });
 test('PPMR-033 Tenant integrations expose blockers and review separately',async({page})=>{
  await openMonitoring(page);const grid=first(page).locator('.platform-monitoring-readiness__evidence-grid');
  await expect(grid).toContainText('Integration blockers: 0');await expect(grid).toContainText('Integration review required: 0');
 });
 test('PPMR-034 Tenant cards render nine control results each',async({page})=>{
  await openMonitoring(page);await expect(first(page).locator('.platform-monitoring-readiness__tenant-control')).toHaveCount(9);
  await expect(cards(page).nth(1).locator('.platform-monitoring-readiness__tenant-control')).toHaveCount(9);
 });
 test('PPMR-035 Public incident update control can display neutral Not required',async({page})=>{
  await openMonitoring(page);const c=first(page).locator('.platform-monitoring-readiness__tenant-control').filter({hasText:'Customer-impacting incidents have public updates'});
  await expect(c).toContainText('Not required');
 });
 test('PPMR-036 Blocked tenant displays exact control attention keys',async({page})=>{
  await openMonitoring(page);const step=cards(page).nth(1).locator('.platform-monitoring-readiness__next-step');
  await expect(step).toContainText('Controls requiring attention:');await expect(step).toContainText('blocking_alerts_clear');
 });
 test('PPMR-037 Ready tenant says no controls currently require attention',async({page})=>{
  await openMonitoring(page);await expect(first(page).locator('.platform-monitoring-readiness__next-step')).toContainText('No monitoring controls currently require attention');
 });
 test('PPMR-038 Choosing a tenant updates URL and scopes API call',async({page})=>{
  const scoped:string[]=[];await openMonitoring(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===MONITORING_PATH)scoped.push(q.toString());}});
  await page.getByLabel('Tenant filter').selectOption(monitorBeta);
  await expect(page).toHaveURL(new RegExp('tenant_id='+monitorBeta));await expect(cards(page)).toHaveCount(1);
  await expect(first(page)).toContainText('Monitor Beta');expect(scoped.at(-1)).toBe('tenant_id='+monitorBeta);
 });
 test('PPMR-039 Clearing filter restores all-tenants scope without tenant_id',async({page})=>{
  await openMonitoring(page,{urlQuery:'tenant_id='+monitorAlpha});await expect(cards(page)).toHaveCount(1);
  await page.getByLabel('Tenant filter').selectOption('');await expect(cards(page)).toHaveCount(2);await expect(page).not.toHaveURL(/tenant_id=/);
 });
 test('PPMR-040 Reloadable tenant deep link keeps selected UUID',async({page})=>{
  await openMonitoring(page,{urlQuery:'tenant_id='+monitorBeta});await expect(page.getByLabel('Tenant filter')).toHaveValue(monitorBeta);
  await expect(cards(page)).toHaveCount(1);await expect(first(page)).toContainText('Monitor Beta');
 });
 test('PPMR-041 Unknown UUID remains visible and shows a load error',async({page})=>{
  const unknown='b1120000-0000-4000-8000-000000000099';await openMonitoring(page,{urlQuery:'tenant_id='+unknown});
  await expect(page.getByLabel('Tenant filter')).toHaveValue(unknown);
  await expect(root(page).getByRole('alert')).toContainText('Unable to load production monitoring readiness');
 });
 test('PPMR-042 Directory failure warns but keeps monitoring snapshot',async({page})=>{
  await openMonitoring(page,{tenantListStatus:503});await expect(root(page).locator('.platform-monitoring-readiness__filter-warning')).toContainText('current URL scope is preserved');
  await expect(cards(page)).toHaveCount(2);
 });
 test('PPMR-043 Failed first data request offers Retry instead of fake ready state',async({page})=>{
  let fail=true;await openMonitoring(page,{respond:(m,p)=>m==='GET'&&p===MONITORING_PATH&&fail?{status:503,json:{message:'Unavailable'}}:undefined});
  await expect(root(page).getByRole('alert')).toContainText('No successful monitoring snapshot');
  fail=false;await root(page).getByRole('button',{name:'Retry',exact:true}).click();await expect(cards(page)).toHaveCount(2);
 });
 test('PPMR-044 Refresh failure preserves old snapshot with status warning',async({page})=>{
  let fail=false;await openMonitoring(page,{respond:(m,p)=>m==='GET'&&p===MONITORING_PATH&&fail?{status:503,json:{message:'Temporary outage'}}:undefined});
  await expect(cards(page)).toHaveCount(2);fail=true;await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(root(page).getByRole('status')).toContainText('showing the last successful monitoring snapshot');
  await expect(cards(page)).toHaveCount(2);
 });
 test('PPMR-045 Empty result renders explicit neutral no-tenants state',async({page})=>{
  await openMonitoring(page,{rows:[]});await expect(cards(page)).toHaveCount(0);
  await expect(root(page)).toContainText('No tenants match the current monitoring-readiness filter');
  await expect(root(page).locator('.platform-monitoring-readiness__hero-aside')).toContainText('No tenants to review');
 });
 test('PPMR-046 Scope changes and manual refresh make no write requests',async({page})=>{
  const writes:string[]=[];await openMonitoring(page,{onCall:(m,p)=>{if(!['GET','OPTIONS'].includes(m))writes.push(m+' '+p);}});
  await page.getByLabel('Tenant filter').selectOption(monitorAlpha);
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();await expect(cards(page)).toHaveCount(1);expect(writes).toEqual([]);
 });
 test('PPMR-047 Router denies caller without system-health read',async({page})=>{
  await openMonitoring(page,{permissions:MONITORING_PERMISSIONS.filter(p=>p!=='platform.system_health.read'),expectHeading:false});
  await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
 });
 test('PPMR-048 Router denies caller without tenants read',async({page})=>{
  await openMonitoring(page,{permissions:MONITORING_PERMISSIONS.filter(p=>p!=='platform.tenants.read'),expectHeading:false});
  await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
 });
 test('PPMR-049 Router denies caller without incidents read',async({page})=>{
  await openMonitoring(page,{permissions:MONITORING_PERMISSIONS.filter(p=>p!=='platform.incidents.read'),expectHeading:false});
  await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
 });
 test('PPMR-050 Router denies caller without dependency monitoring read',async({page})=>{
  await openMonitoring(page,{permissions:MONITORING_PERMISSIONS.filter(p=>p!=='platform.dependencies.read'),expectHeading:false});
  await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
 });

 test('PPMR-051 Valid snapshot exposes nonempty refreshed and generated timestamps',async({page})=>{
  await openMonitoring(page);
  await expect(root(page).locator('.platform-monitoring-readiness__refresh-block')).not.toContainText('Not available');
  await expect(root(page).locator('.platform-monitoring-readiness__program-grid')).not.toContainText('Not available');
 });
 test('PPMR-052 Invalid generated timestamp uses explicit Not available fallback',async({page})=>{
  await openMonitoring(page,{alter:s=>({...s,generated_at:'not-a-date'})});
  await expect(root(page).locator('.platform-monitoring-readiness__refresh-block')).toContainText('Not available');
  await expect(root(page).locator('.platform-monitoring-readiness__program-grid')).toContainText('Not available');
 });
 test('PPMR-053 Missing tenant directory retains a directly linked known scope',async({page})=>{
  await openMonitoring(page,{urlQuery:'tenant_id='+monitorBeta,tenantListStatus:503});
  await expect(page.getByLabel('Tenant filter')).toHaveValue(monitorBeta);
  await expect(root(page).locator('.platform-monitoring-readiness__scope-copy')).toContainText('Selected tenant ('+monitorBeta.slice(0,8));
  await expect(cards(page)).toHaveCount(1);
  await expect(root(page).locator('.platform-monitoring-readiness__filter-warning')).toContainText('current URL scope is preserved');
 });
 test('PPMR-054 Known selected tenant displays directory name as scope',async({page})=>{
  await openMonitoring(page,{urlQuery:'tenant_id='+monitorAlpha});
  await expect(root(page).locator('.platform-monitoring-readiness__scope-copy')).toContainText('Monitor Alpha');
  await expect(page.getByLabel('Tenant filter')).toHaveValue(monitorAlpha);
 });
 test('PPMR-055 Switching scoped tenant preserves unrelated query parameters',async({page})=>{
  const requests:string[]=[];
  await openMonitoring(page,{urlQuery:'view=detailed&source=operator',onCall:(method,path,query)=>{
   if(method==='GET'&&path===MONITORING_PATH)requests.push(query.toString());
  }});
  await page.getByLabel('Tenant filter').selectOption(monitorBeta);
  await expect(page).toHaveURL(/view=detailed/);await expect(page).toHaveURL(/source=operator/);
  await expect(page).toHaveURL(new RegExp('tenant_id='+monitorBeta));
  expect(requests.at(-1)).toBe('tenant_id='+monitorBeta);
 });
 test('PPMR-056 Native validation note can open then close without navigation',async({page})=>{
  await openMonitoring(page);const details=root(page).locator('.platform-monitoring-readiness__validation-note');
  await details.locator('summary').click();await expect(details).toHaveAttribute('open','');
  await details.locator('summary').click();await expect(details).not.toHaveAttribute('open','');
  await expect(page).toHaveURL(new RegExp(MONITORING_PATH+'$'));
 });
 test('PPMR-057 Review-only integration result displays review posture rather than blocked',async({page})=>{
  await openMonitoring(page,{rows:[makeMonitorTenant(monitorGamma,'Monitor Review','review')]});
  await expect(cards(page)).toHaveCount(1);
  await expect(first(page).locator('.platform-monitoring-readiness__status-badge')).toContainText('Monitoring review required');
  await expect(root(page).locator('.platform-monitoring-readiness__hero-aside')).toContainText('Monitoring review required');
  await expect(first(page)).toContainText('Integration monitoring review required');
 });
 test('PPMR-058 Source-defined programme phase is exposed in context panel',async({page})=>{
  await openMonitoring(page);
  await expect(root(page).locator('.platform-monitoring-readiness__program-panel')).toContainText('Platform Commercial Launch Readiness');
  await expect(root(page).locator('.platform-monitoring-readiness__program-panel')).toContainText('Generated');
 });
 test('PPMR-059 Failed refresh retry removes warning after next success',async({page})=>{
  let fail=false,revision=0;
  await openMonitoring(page,{respond:(method,path)=>{
   if(method==='GET'&&path===MONITORING_PATH){
    if(fail)return {json:{message:'Synthetic monitoring outage'},status:503};
    return {json:{...makeMonitoringSnapshot(),generated_at:revision?'2026-11-05T16:00:00.000Z':'2026-11-05T12:00:00.000Z'}};
   }
   return undefined;
  }});
  const before=await root(page).locator('.platform-monitoring-readiness__refresh-block').innerText();
  fail=true;await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(root(page).getByRole('status')).toContainText('last successful monitoring snapshot');
  fail=false;revision=1;await root(page).getByRole('button',{name:'Retry refresh'}).click();
  await expect(root(page).getByRole('status')).toHaveCount(0);
  await expect(cards(page)).toHaveCount(2);
  expect(await root(page).locator('.platform-monitoring-readiness__refresh-block').innerText()).not.toBe(before);
 });
 test('PPMR-060 Refresh refetches both tenant directory and scoped monitoring GET',async({page})=>{
  let directory=0,board=0;
  await openMonitoring(page,{onCall:(method,path)=>{
   if(method==='GET'&&path==='/platform/tenants')directory++;
   if(method==='GET'&&path===MONITORING_PATH)board++;
  }});
  const beforeDirectory=directory,beforeBoard=board;
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>directory).toBeGreaterThan(beforeDirectory);
  await expect.poll(()=>board).toBeGreaterThan(beforeBoard);
 });
 test('PPMR-061 Operator guidance renders exact next step supplied with the tenant',async({page})=>{
  await openMonitoring(page,{rows:[{...makeMonitorTenant(monitorAlpha,'Monitor Alpha'),next_best_step:'Review staged monitoring alerts with the operator.'}]});
  await expect(first(page).locator('.platform-monitoring-readiness__next-step')).toContainText('Review staged monitoring alerts with the operator.');
 });
 test('PPMR-062 Unknown posture is humanized instead of silently shown as ready',async({page})=>{
  await openMonitoring(page,{alter:s=>({...s,posture:'awaiting_operator_validation'})});
  await expect(root(page).locator('.platform-monitoring-readiness__hero-aside')).toContainText('Awaiting operator validation');
  await expect(root(page).locator('.platform-monitoring-readiness__hero-aside')).not.toContainText('Production monitoring ready');
 });
 test('PPMR-063 No platform-evidence entries means no fabricated evidence cards',async({page})=>{
  await openMonitoring(page,{alter:s=>({...s,platform_evidence:{}})});
  await expect(root(page).locator('.platform-monitoring-readiness__platform-item')).toHaveCount(0);
  await expect(root(page).locator('.platform-monitoring-readiness__evidence-section')).toContainText('Platform evidence');
 });
 test('PPMR-064 Tenant filter is keyboard reachable and advances into tenant drill-down',async({page})=>{
  await openMonitoring(page);await page.getByLabel('Tenant filter').focus();
  await expect(page.getByLabel('Tenant filter')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(first(page).getByRole('link',{name:'System health'})).toBeFocused();
 });
 test('PPMR-065 Phone viewport retains filter and tenant incident link',async({page})=>{
  await page.setViewportSize({width:390,height:844});await openMonitoring(page);
  await expect(page.getByLabel('Tenant filter')).toBeVisible();
  await expect(first(page).getByRole('link',{name:'Incidents'})).toBeVisible();
  await expect(first(page).locator('.platform-monitoring-readiness__next-step')).toBeVisible();
 });
 test('PPMR-066 Long operator guidance and tenant title remain in source-defined cards',async({page})=>{
  const longName='Monitor '+ 'M'.repeat(90),longStep='Review alerts: '+ 'R'.repeat(160);
  await openMonitoring(page,{rows:[{...makeMonitorTenant(monitorAlpha,longName),next_best_step:longStep}]});
  await expect(first(page).getByRole('heading',{name:longName})).toBeVisible();
  await expect(first(page).locator('.platform-monitoring-readiness__next-step')).toContainText(longStep);
 });
 test('PPMR-067 Changing tenant scope is replace-navigation retaining hash-independent query',async({page})=>{
  await openMonitoring(page,{urlQuery:'tenant_id='+monitorAlpha+'&ticket=synthetic'});
  await page.getByLabel('Tenant filter').selectOption(monitorBeta);
  await expect(page).toHaveURL(/ticket=synthetic/);
  await expect(page.getByLabel('Tenant filter')).toHaveValue(monitorBeta);
  await expect(cards(page)).toHaveCount(1);
 });
 test('PPMR-068 Independent count of platform evidence remains present during per-tenant filtering',async({page})=>{
  await openMonitoring(page,{urlQuery:'tenant_id='+monitorBeta});
  await expect(cards(page)).toHaveCount(1);
  await expect(root(page).locator('.platform-monitoring-readiness__platform-item')).toHaveCount(10);
  await expect(root(page).locator('.platform-monitoring-readiness__summary-item')).toHaveCount(17);
 });
});
