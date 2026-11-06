/** Batch 114 — Platform Deployment Validation. Read-only mocked UI contract; no releases or CI actually run. */
import {test,expect,type Page} from '@playwright/test';
import {openDeployment,DEPLOYMENT_PATH,DEPLOYMENT_READ,FULL_PLATFORM_GRANTS,makeDeploymentSnapshot} from '../../../support/platformDeploymentValidationFixture';
const root=(p:Page)=>p.locator('.platform-deployment-validation');
const cards=(p:Page)=>root(p).locator('.platform-deployment-validation__control-card');
const metrics=(p:Page)=>root(p).getByLabel('Deployment validation key metrics');
const links=(p:Page)=>root(p).locator('.platform-deployment-validation__link-row a');
test.describe('Platform Deployment Validation — source-traced synthetic browser contract',()=>{
 test('PDVG-001 Hero names Deployment Validation',async({page})=>{
  await openDeployment(page);await expect(page.getByRole('heading',{name:'Deployment Validation',exact:true})).toBeVisible();
 });
 test('PDVG-002 Hero identifies read-only technical deployment precheck',async({page})=>{
  await openDeployment(page);await expect(root(page)).toContainText('Read-only technical deployment precheck');
 });
 test('PDVG-003 Program identifies Step 214 from the backend',async({page})=>{
  await openDeployment(page);await expect(root(page).locator('.platform-deployment-validation__program-grid')).toContainText('Step 214 — Deployment Validation Gate');
 });
 test('PDVG-004 Meta identifies operator precheck only',async({page})=>{
  await openDeployment(page);await expect(root(page)).toContainText('Operator precheck only');
 });
 test('PDVG-005 Meta says live gate evidence stays external',async({page})=>{
  await openDeployment(page);await expect(root(page)).toContainText('Live gate evidence stays external');
 });
 test('PDVG-006 Six deployment KPI metric cards render',async({page})=>{
  await openDeployment(page);await expect(metrics(page).locator('.io-workspace-stat')).toHaveCount(6);
 });
 test('PDVG-007 Current hero ratio matches source-shaped evidence counters',async({page})=>{
  const snap=makeDeploymentSnapshot();await openDeployment(page);
  await expect(root(page).locator('.platform-deployment-validation__hero-aside')).toContainText(`${snap.summary.controls_with_evidence}/${snap.summary.controls_total}`);
 });
 test('PDVG-008 Blocked runtime snapshot displays blocked posture',async({page})=>{
  await openDeployment(page);await expect(root(page).locator('.platform-deployment-validation__hero-aside')).toContainText('Deployment validation blocked');
 });
 test('PDVG-009 Blockers and review metrics remain separate',async({page})=>{
  await openDeployment(page);await expect(metrics(page)).toContainText('Deployment blockers');
  await expect(metrics(page)).toContainText('Review required');
 });
 test('PDVG-010 Frontend CI and artifact review metrics remain separate',async({page})=>{
  await openDeployment(page);await expect(metrics(page)).toContainText('Frontend CI evidence');
  await expect(metrics(page)).toContainText('Artifact review');
 });
 test('PDVG-011 Boundary notice explicitly treats live evidence as external',async({page})=>{
  await openDeployment(page);await expect(root(page).locator('.platform-deployment-validation__external-notice')).toContainText('Live evidence is external.');
 });
 test('PDVG-012 Amber external-evidence state does not imply a failed deployment',async({page})=>{
  await openDeployment(page);await expect(root(page).locator('.platform-deployment-validation__external-notice')).toContainText('does not prove the deployment failed');
 });
 test('PDVG-013 Fully authorized role can see all six supporting links',async({page})=>{
  await openDeployment(page);await expect(links(page)).toHaveCount(6);
 });
 test('PDVG-014 Monitoring link points to the distinct monitoring readiness route',async({page})=>{
  await openDeployment(page);await expect(root(page).getByRole('link',{name:'Monitoring readiness'})).toHaveAttribute('href','/platform/production-monitoring-readiness');
 });
 test('PDVG-015 Backup restore link points to the validation page, not redirect alias',async({page})=>{
  await openDeployment(page);await expect(root(page).getByRole('link',{name:'Backup restore'})).toHaveAttribute('href','/platform/backup-restore-validation');
 });
 test('PDVG-016 Deployment runbook link uses deployment category',async({page})=>{
  await openDeployment(page);await expect(root(page).getByRole('link',{name:'Deployment runbooks'})).toHaveAttribute('href','/platform/runbooks?category=deployment');
 });
 test('PDVG-017 Release and change-management links have independent destinations',async({page})=>{
  await openDeployment(page);await expect(root(page).getByRole('link',{name:'Releases'})).toHaveAttribute('href','/platform/releases');
  await expect(root(page).getByRole('link',{name:'Change management'})).toHaveAttribute('href','/platform/change-management');
 });
 test('PDVG-018 System health link respects tenant-directory dependency',async({page})=>{
  await openDeployment(page,{permissions:FULL_PLATFORM_GRANTS.filter(p=>p!=='platform.tenants.read')});
  await expect(root(page).getByRole('link',{name:'System health'})).toHaveCount(0);
  await expect(root(page).getByRole('link',{name:'Backup restore'})).toHaveCount(0);
 });
 test('PDVG-019 Role missing runbook grant hides backup and deployment-runbook links',async({page})=>{
  await openDeployment(page,{permissions:FULL_PLATFORM_GRANTS.filter(p=>p!=='platform.runbooks.read')});
  await expect(root(page).getByRole('link',{name:'Deployment runbooks'})).toHaveCount(0);
  await expect(root(page).getByRole('link',{name:'Backup restore'})).toHaveCount(0);
  await expect(root(page).locator('.platform-deployment-validation__permission-note')).toContainText('2 supporting pages are hidden');
 });
 test('PDVG-020 Role with only system-health read hides all six supporting destinations',async({page})=>{
  await openDeployment(page,{permissions:[DEPLOYMENT_READ]});
  await expect(links(page)).toHaveCount(0);
  await expect(root(page).locator('.platform-deployment-validation__permission-note')).toContainText('6 supporting pages are hidden');
 });
 test('PDVG-021 Router prevents page display without required system-health permission',async({page})=>{
  await openDeployment(page,{permissions:FULL_PLATFORM_GRANTS.filter(p=>p!==DEPLOYMENT_READ),expectHeading:false});
  await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
 });
 test('PDVG-022 Initial deployment GET has no tenant query or credentials in URL',async({page})=>{
  const queries:string[]=[];await openDeployment(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===DEPLOYMENT_PATH)queries.push(q.toString());}});
  expect(queries).toEqual(['']);
 });
 test('PDVG-023 Refresh issues a second read-only deployment GET',async({page})=>{
  let calls=0;await openDeployment(page,{onCall:(m,p)=>{if(m==='GET'&&p===DEPLOYMENT_PATH)calls++;}});
  const before=calls;await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>calls).toBeGreaterThan(before);
 });
 test('PDVG-024 Initial GET failure shows explicit error and no control cards',async({page})=>{
  await openDeployment(page,{status:503});
  await expect(root(page).locator('.platform-deployment-validation__feedback--error')).toContainText('Unable to load deployment validation.');
  await expect(cards(page)).toHaveCount(0);
 });
 test('PDVG-025 Initial failure offers Retry that recovers when backend mock resumes',async({page})=>{
  let fail=true;await openDeployment(page,{respond:(m,p)=>m==='GET'&&p===DEPLOYMENT_PATH&&fail?{status:503,json:{message:'Synthetic outage'}}:undefined});
  await expect(root(page).getByRole('button',{name:'Retry',exact:true})).toBeVisible();
  fail=false;await root(page).getByRole('button',{name:'Retry',exact:true}).click();
  await expect(cards(page)).toHaveCount(14);
 });
 test('PDVG-026 Failed refresh shows stale snapshot warning without wiping control cards',async({page})=>{
  let fail=false;await openDeployment(page,{respond:(m,p)=>m==='GET'&&p===DEPLOYMENT_PATH&&fail?{status:503,json:{message:'Intermittent synthetic outage'}}:undefined});
  await expect(cards(page)).toHaveCount(14);fail=true;
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(root(page).locator('.platform-deployment-validation__feedback--warning')).toContainText('last successful deployment-validation snapshot');
  await expect(cards(page)).toHaveCount(14);
 });
 test('PDVG-027 Successful retry clears the stale-warning state',async({page})=>{
  let fail=false;await openDeployment(page,{respond:(m,p)=>m==='GET'&&p===DEPLOYMENT_PATH&&fail?{status:503,json:{message:'Transient synthetic outage'}}:undefined});
  fail=true;await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(root(page).getByRole('button',{name:'Retry refresh'})).toBeVisible();
  fail=false;await root(page).getByRole('button',{name:'Retry refresh'}).click();
  await expect(root(page).locator('.platform-deployment-validation__feedback--warning')).toHaveCount(0);
  await expect(cards(page)).toHaveCount(14);
 });
 test('PDVG-028 Validation program exposes four separately labeled context values',async({page})=>{
  await openDeployment(page);const panel=root(page).locator('.platform-deployment-validation__program-grid');
  for(const text of ['Phase','Step','Generated','Current posture'])await expect(panel).toContainText(text);
 });
 test('PDVG-029 Validation boundary is expandable and disclaims migrations',async({page})=>{
  await openDeployment(page);const details=root(page).locator('.platform-deployment-validation__validation-note');
  await details.locator('summary').click();await expect(details).toHaveAttribute('open','');
  await expect(details).toContainText('run migrations');
 });
 test('PDVG-030 Invalid generated date falls back to Not available',async({page})=>{
  await openDeployment(page,{alter:s=>({...s,generated_at:'invalid'})});
  await expect(root(page).locator('.platform-deployment-validation__refresh-block')).toContainText('Not available');
  await expect(root(page).locator('.platform-deployment-validation__program-grid')).toContainText('Not available');
 });
 test('PDVG-031 Platform boolean evidence is formatted as Yes and No',async({page})=>{
  await openDeployment(page);const panel=root(page).locator('.platform-deployment-validation__evidence-panel');
  await expect(panel).toContainText('Yes');await expect(panel).toContainText('No');
 });
 test('PDVG-032 Null platform evidence has explicit Not available on this surface',async({page})=>{
  await openDeployment(page);
  await expect(root(page).locator('.platform-deployment-validation__evidence-panel')).toContainText('Not available on this surface');
 });
 test('PDVG-033 Empty evidence object produces no fabricated evidence cards',async({page})=>{
  await openDeployment(page,{alter:s=>({...s,platform_evidence:{}})});
  await expect(root(page).locator('.platform-deployment-validation__evidence-item')).toHaveCount(0);
 });
 test('PDVG-034 Unknown summary counter key is humanized rather than silently dropped',async({page})=>{
  await openDeployment(page,{alter:s=>({...s,summary:{...s.summary,extra_operator_review_counter:5}})});
  await expect(root(page).locator('.platform-deployment-validation__summary-panel')).toContainText('Extra operator review counter');
 });
 test('PDVG-035 Source-shaped deployment control catalogue contains fourteen entries',async({page})=>{
  await openDeployment(page);await expect(cards(page)).toHaveCount(14);
 });
 test('PDVG-036 Backend source controls are distinguishable from runtime controls',async({page})=>{
  await openDeployment(page);const c=root(page).locator('.platform-deployment-validation__controls-panel');
  await expect(c).toContainText('Backend Render blueprint hardened');
  await expect(c).toContainText('Backend runtime rate-limit posture');
 });
 test('PDVG-037 Rate-limit runtime control shows backend_runtime evidence scope',async({page})=>{
  await openDeployment(page);const c=cards(page).filter({hasText:'Backend runtime rate-limit posture'});
  await expect(c.locator('.platform-deployment-validation__control-meta')).toContainText('Backend runtime');
 });
 test('PDVG-038 Frontend-owned gate control visibly says frontend CI evidence required',async({page})=>{
  await openDeployment(page);const c=cards(page).filter({hasText:'Frontend deployment-readiness gate source present'});
  await expect(c).toContainText('Frontend CI evidence required');
 });
 test('PDVG-039 External artifact control says review is required, not proven',async({page})=>{
  await openDeployment(page);const c=cards(page).filter({hasText:'Deployment Readiness Gate artifact reviewed'});
  await expect(c).toContainText('Runtime gate artifact review required');
 });
 test('PDVG-040 Each rendered control shows evidence scope, key and value',async({page})=>{
  await openDeployment(page);const c=cards(page).first().locator('.platform-deployment-validation__control-meta');
  for(const label of ['Evidence scope','Evidence key','Evidence value'])await expect(c).toContainText(label);
 });
 test('PDVG-041 Control identifier is preserved separately from human-facing label',async({page})=>{
  await openDeployment(page);const c=cards(page).first();
  await expect(c.getByRole('heading',{name:'Backend Render blueprint hardened'})).toBeVisible();
  await expect(c).toContainText('backend_render_blueprint_hardened');
 });
 test('PDVG-042 An unexpected control status remains visible as humanized text',async({page})=>{
  await openDeployment(page,{alter:s=>({...s,deployment_validation_controls:s.deployment_validation_controls.map((c,i)=>i===0?{...c,status:'operator_manual_check_pending'}:c)})});
  await expect(cards(page).first()).toContainText('Operator manual check pending');
 });
 test('PDVG-043 External review-only posture does not claim deployment failure',async({page})=>{
  await openDeployment(page,{kind:'review'});
  await expect(root(page).locator('.platform-deployment-validation__hero-aside')).toContainText('Precheck ready for external evidence');
 });
 test('PDVG-044 Source-shaped fully evidenced posture displays ready but remains precheck',async({page})=>{
  await openDeployment(page,{kind:'ready'});
  await expect(root(page).locator('.platform-deployment-validation__hero-aside')).toContainText('Deployment validation ready');
  await expect(root(page).locator('.platform-deployment-validation__external-notice')).toContainText('Live evidence is external.');
 });
 test('PDVG-045 Runtime gate coverage lists seven distinct verification areas',async({page})=>{
  await openDeployment(page);const lists=root(page).locator('.platform-deployment-validation__two-column ul');
  await expect(lists.first().locator('li')).toHaveCount(7);
 });
 test('PDVG-046 Runtime gate coverage explicitly mentions refresh cookie and CSRF',async({page})=>{
  await openDeployment(page);const list=root(page).locator('.platform-deployment-validation__two-column ul').first();
  await expect(list).toContainText('Refresh-cookie, CSRF refresh');
 });
 test('PDVG-047 Operator follow-up enumerates four external-acceptance steps',async({page})=>{
  await openDeployment(page);await expect(root(page).locator('.platform-deployment-validation__two-column ul').nth(1).locator('li')).toHaveCount(4);
 });
 test('PDVG-048 Manual gate workflow is only fallback, not unconditional',async({page})=>{
  await openDeployment(page);await expect(root(page).locator('.platform-deployment-validation__two-column ul').nth(1)).toContainText('only as a fallback');
 });
 test('PDVG-049 Next-best-step displays source-returned operator guidance verbatim',async({page})=>{
  const step='Confirm this synthetic deployment evidence with the release owner.';
  await openDeployment(page,{alter:s=>({...s,next_best_step:step})});
  await expect(root(page).locator('.platform-deployment-validation__next-step')).toContainText(step);
 });
 test('PDVG-050 Filtering and refreshing the deployment board never issue writes',async({page})=>{
  const writes:string[]=[];await openDeployment(page,{onCall:(m,p)=>{if(!['GET','OPTIONS'].includes(m))writes.push(m+' '+p);}});
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(cards(page)).toHaveCount(14);expect(writes).toEqual([]);
 });

 test('PDVG-051 Empty server summary has zero metric values and no fabricated detailed rows',async({page})=>{
  await openDeployment(page,{alter:s=>({...s,summary:{}})});
  await expect(root(page).locator('.platform-deployment-validation__summary-item')).toHaveCount(0);
  await expect(root(page).locator('.platform-deployment-validation__hero-aside')).toContainText('0/0');
 });
 test('PDVG-052 Backend runtime evidence labels preserve numeric configured-origin counts',async({page})=>{
  await openDeployment(page,{alter:s=>({...s,platform_evidence:{...s.platform_evidence,backend_cors_configured_origin_count:12}})});
  const item=root(page).locator('.platform-deployment-validation__evidence-item').filter({hasText:'Backend cors configured origin count'});
  await expect(item.locator('strong')).toHaveText('12');
 });
 test('PDVG-053 Empty string evidence is explicitly unavailable rather than a false zero',async({page})=>{
  await openDeployment(page,{alter:s=>({...s,platform_evidence:{...s.platform_evidence,backend_rate_limit_store:''}})});
  const item=root(page).locator('.platform-deployment-validation__evidence-item').filter({hasText:'Backend rate limit store'});
  await expect(item.locator('strong')).toHaveText('Not available on this surface');
 });
 test('PDVG-054 Zero-control server snapshot has no invented cards',async({page})=>{
  await openDeployment(page,{alter:s=>({...s,deployment_validation_controls:[],summary:{...s.summary,controls_total:0,controls_with_evidence:0}})});
  await expect(cards(page)).toHaveCount(0);await expect(root(page).locator('.platform-deployment-validation__hero-aside')).toContainText('0/0');
 });
 test('PDVG-055 Absent control status is visibly labelled Not available',async({page})=>{
  await openDeployment(page,{alter:s=>({...s,deployment_validation_controls:s.deployment_validation_controls.map((c,i)=>i===0?{...c,status:''}:c)})});
  await expect(cards(page).first().locator('.platform-deployment-validation__status-badge')).toHaveText('Not available');
 });
 test('PDVG-056 Detailed summary retains source-specific extra count without altering six KPIs',async({page})=>{
  await openDeployment(page,{alter:s=>({...s,summary:{...s.summary,independent_runtime_review:13}})});
  await expect(metrics(page).locator('.io-workspace-stat')).toHaveCount(6);
  await expect(root(page).locator('.platform-deployment-validation__summary-panel')).toContainText('Independent runtime review');
  await expect(root(page).locator('.platform-deployment-validation__summary-panel')).toContainText('13');
 });
 test('PDVG-057 Runtime-gate artifact is reported as external evidence even when snapshot is ready',async({page})=>{
  await openDeployment(page,{kind:'ready'});
  await expect(root(page).locator('.platform-deployment-validation__external-notice')).toContainText('does not query or persist');
  await expect(root(page).locator('.platform-deployment-validation__external-notice')).toContainText('HTML/JSON artifact');
 });
 test('PDVG-058 Permission without releases grant hides only Releases among otherwise allowed links',async({page})=>{
  await openDeployment(page,{permissions:FULL_PLATFORM_GRANTS.filter(p=>p!=='platform.releases.read')});
  await expect(links(page)).toHaveCount(5);
  await expect(root(page).getByRole('link',{name:'Releases',exact:true})).toHaveCount(0);
  await expect(root(page).getByRole('link',{name:'Change management'})).toBeVisible();
  await expect(root(page).locator('.platform-deployment-validation__permission-note')).toContainText('1 supporting page is hidden');
 });
 test('PDVG-059 Missing incident grant hides monitoring but not backend system-health link',async({page})=>{
  await openDeployment(page,{permissions:FULL_PLATFORM_GRANTS.filter(p=>p!=='platform.incidents.read')});
  await expect(root(page).getByRole('link',{name:'Monitoring readiness'})).toHaveCount(0);
  await expect(root(page).getByRole('link',{name:'System health'})).toBeVisible();
 });
 test('PDVG-060 Full permissions do not show spurious hidden-pages warning',async({page})=>{
  await openDeployment(page);await expect(links(page)).toHaveCount(6);
  await expect(root(page).locator('.platform-deployment-validation__permission-note')).toHaveCount(0);
 });
 test('PDVG-061 Extra URL query marker stays intact across read-only refresh',async({page})=>{
  await openDeployment(page,{urlQuery:'operator_context=synthetic&view=compact'});
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page).toHaveURL(/operator_context=synthetic/);
  await expect(page).toHaveURL(/view=compact/);
 });
 test('PDVG-062 Read-only retry failure never attempts a mutation request',async({page})=>{
  const writes:string[]=[];
  await openDeployment(page,{status:503,onCall:(m,p)=>{if(!['GET','OPTIONS'].includes(m))writes.push(`${m} ${p}`);}});
  await root(page).getByRole('button',{name:'Retry',exact:true}).click();
  await expect(root(page).locator('.platform-deployment-validation__feedback--error')).toBeVisible();
  expect(writes).toEqual([]);
 });
 test('PDVG-063 Narrow viewport preserves refresh and expandable validation boundary',async({page})=>{
  await page.setViewportSize({width:390,height:780});await openDeployment(page);
  await expect(root(page).getByRole('button',{name:'Refresh',exact:true})).toBeVisible();
  await expect(root(page).locator('.platform-deployment-validation__validation-note summary')).toBeVisible();
 });
 test('PDVG-064 Refresh button is reachable through normal keyboard focus',async({page})=>{
  await openDeployment(page);const refresh=root(page).getByRole('button',{name:'Refresh',exact:true});
  await refresh.focus();await expect(refresh).toBeFocused();
 });
 test('PDVG-065 Empty arrays do not fabricate automatic gate or operator follow-up checks',async({page})=>{
  await openDeployment(page,{alter:s=>({...s,automatic_runtime_gate_coverage:[],operator_follow_up:[]})});
  await expect(root(page).locator('.platform-deployment-validation__two-column ul li')).toHaveCount(0);
 });
 test('PDVG-066 Operator-supplied unknown posture label is humanized without pretending readiness',async({page})=>{
  await openDeployment(page,{alter:s=>({...s,posture:'awaiting_external_release_owner_approval'})});
  await expect(root(page).locator('.platform-deployment-validation__hero-aside')).toContainText('Awaiting external release owner approval');
  await expect(root(page).locator('.platform-deployment-validation__hero-aside')).not.toContainText('Deployment validation ready');
 });
 test('PDVG-067 Long control launch reason remains displayed in its source-associated card',async({page})=>{
  const reason='Synthetic operator review required: '+ 'evidence '.repeat(25);
  await openDeployment(page,{alter:s=>({...s,deployment_validation_controls:s.deployment_validation_controls.map((c,i)=>i===0?{...c,launch_reason:reason}:c)})});
  await expect(cards(page).first().locator('p')).toHaveText(reason);
 });
 test('PDVG-068 Detail status and next best step remain independent of the six summary metrics',async({page})=>{
  const next='Retain the external synthetic CI artifact before owner approval';
  await openDeployment(page,{alter:s=>({...s,next_best_step:next,posture:'deployment_precheck_ready_for_external_evidence'})});
  await expect(root(page).locator('.platform-deployment-validation__next-step')).toContainText(next);
  await expect(root(page).locator('.platform-deployment-validation__hero-aside')).toContainText('Precheck ready for external evidence');
  await expect(metrics(page).locator('.io-workspace-stat')).toHaveCount(6);
 });
});
