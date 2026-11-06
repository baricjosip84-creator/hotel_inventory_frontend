/** Batch 115 — source-traced read-only Platform Documentation Completeness UI. Synthetic responses, never launch certification. */
import {test,expect,type Page} from '@playwright/test';
import {openDocumentation,DOCUMENTATION_PATH,DOCUMENTATION_READ,DOCUMENTATION_ALL_GRANTS,makeDocumentationSnapshot} from '../../../support/platformDocumentationCompletenessFixture';
const root=(p:Page)=>p.locator('.platform-documentation-completeness');
const controls=(p:Page)=>root(p).locator('.platform-documentation-completeness__control-card');
const links=(p:Page)=>root(p).locator('.platform-documentation-completeness__link-row a');
const metrics=(p:Page)=>root(p).getByLabel('Documentation completeness key metrics');
const evidence=(p:Page)=>root(p).locator('.platform-documentation-completeness__evidence-panel');
const program=(p:Page)=>root(p).locator('.platform-documentation-completeness__program-panel');
test.describe('Platform Documentation Completeness — isolated source-grounded browser contract',()=>{
 test('PDOC-001 Documentation Completeness route renders named heading',async({page})=>{
  await openDocumentation(page);await expect(page.getByRole('heading',{name:'Documentation Completeness',exact:true})).toBeVisible();
 });
 test('PDOC-002 Hero calls itself a read-only operator precheck',async({page})=>{
  await openDocumentation(page);await expect(root(page)).toContainText('Read-only operator precheck');
 });
 test('PDOC-003 Page disclaims treating static Markdown evidence as certification',async({page})=>{
  await openDocumentation(page);await expect(root(page)).toContainText('without treating static repository evidence as launch certification');
 });
 test('PDOC-004 Step 215 is identified in the source-shaped program',async({page})=>{
  await openDocumentation(page);await expect(program(page)).toContainText('Step 215 — Documentation Completeness Board');
 });
 test('PDOC-005 Hero ratio displays structurally present controls over total',async({page})=>{
  const s=makeDocumentationSnapshot();await openDocumentation(page);
  await expect(root(page).locator('.platform-documentation-completeness__hero-aside')).toContainText(`${s.summary.documentation_present}/${s.summary.controls_total}`);
 });
 test('PDOC-006 Six KPI cards distinguish blockers structure and index issues',async({page})=>{
  await openDocumentation(page);await expect(metrics(page).locator('.io-workspace-stat')).toHaveCount(6);
  for(const label of ['Launch blockers','Structure incomplete','Index references missing'])await expect(metrics(page)).toContainText(label);
 });
 test('PDOC-007 Static evidence warning explains unavailable frontend is not missing documentation',async({page})=>{
  await openDocumentation(page);const notice=root(page).locator('.platform-documentation-completeness__static-notice');
  await expect(notice).toContainText('separate frontend repository');await expect(notice).toContainText('does not mean the frontend document is missing');
 });
 test('PDOC-008 Exactly eight backend-defined documentation controls render',async({page})=>{
  await openDocumentation(page);await expect(controls(page)).toHaveCount(8);
 });
 test('PDOC-009 Program exposes all eight source-defined identity and repository details',async({page})=>{
  await openDocumentation(page);
  await expect(program(page).locator('.platform-documentation-completeness__program-grid > div')).toHaveCount(8);
 });
 test('PDOC-010 Unavailable frontend repo is explicitly external review, while backend is available',async({page})=>{
  await openDocumentation(page);
  await expect(program(page)).toContainText('Backend repository');await expect(program(page)).toContainText('Available');
  await expect(program(page)).toContainText('External review required');
 });
 test('PDOC-011 Review-only snapshot is not shown as ready for owner acceptance',async({page})=>{
  await openDocumentation(page,{kind:'review'});
  await expect(root(page).locator('.platform-documentation-completeness__hero-aside')).toContainText('Documentation review required');
  await expect(root(page).locator('.platform-documentation-completeness__hero-aside')).not.toContainText('Ready for manual acceptance');
 });
 test('PDOC-012 Full role sees seven distinct supporting destinations',async({page})=>{
  await openDocumentation(page);await expect(links(page)).toHaveCount(7);
 });
 test('PDOC-013 Documentation runbook link has documentation category query',async({page})=>{
  await openDocumentation(page);await expect(root(page).getByRole('link',{name:'Documentation runbooks'})).toHaveAttribute('href','/platform/runbooks?category=documentation');
 });
 test('PDOC-014 Onboarding checklist link targets distinct tenant checklist page',async({page})=>{
  await openDocumentation(page);await expect(root(page).getByRole('link',{name:'Onboarding checklist'})).toHaveAttribute('href','/platform/customer-onboarding-checklist');
 });
 test('PDOC-015 Support cockpit link uses non-legacy route',async({page})=>{
  await openDocumentation(page);await expect(root(page).getByRole('link',{name:'Support cockpit'})).toHaveAttribute('href','/platform/support-operations-cockpit');
 });
 test('PDOC-016 Billing activation link points to subscription activation board',async({page})=>{
  await openDocumentation(page);await expect(root(page).getByRole('link',{name:'Billing activation'})).toHaveAttribute('href','/platform/billing-subscription-activation');
 });
 test('PDOC-017 Backup restore link uses validation route not legacy alias',async({page})=>{
  await openDocumentation(page);await expect(root(page).getByRole('link',{name:'Backup restore'})).toHaveAttribute('href','/platform/backup-restore-validation');
 });
 test('PDOC-018 Deployment validation link targets Step 214 board',async({page})=>{
  await openDocumentation(page);await expect(root(page).getByRole('link',{name:'Deployment validation'})).toHaveAttribute('href','/platform/deployment-validation');
 });
 test('PDOC-019 Launch readiness link has independent owner-readiness destination',async({page})=>{
  await openDocumentation(page);await expect(root(page).getByRole('link',{name:'Launch readiness'})).toHaveAttribute('href','/platform/commercial-launch-readiness');
 });
 test('PDOC-020 Missing runbook-read permission denies entire documentation board',async({page})=>{
  await openDocumentation(page,{permissions:DOCUMENTATION_ALL_GRANTS.filter(x=>x!==DOCUMENTATION_READ),expectHeading:false});
  await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
 });
 test('PDOC-021 Runbooks-only grant displays one supporting page and six hidden',async({page})=>{
  await openDocumentation(page,{permissions:[DOCUMENTATION_READ]});
  await expect(links(page)).toHaveCount(1);
  await expect(root(page).locator('.platform-documentation-completeness__permission-note')).toContainText('6 supporting pages are hidden');
 });
 test('PDOC-022 Missing tenant-read permission hides onboarding and support, not launch readiness',async({page})=>{
  await openDocumentation(page,{permissions:DOCUMENTATION_ALL_GRANTS.filter(x=>x!=='platform.tenants.read')});
  await expect(root(page).getByRole('link',{name:'Onboarding checklist'})).toHaveCount(0);
  await expect(root(page).getByRole('link',{name:'Support cockpit'})).toHaveCount(0);
  await expect(root(page).getByRole('link',{name:'Launch readiness'})).toBeVisible();
 });
 test('PDOC-023 Missing export grant hides backup restore but preserves runbooks',async({page})=>{
  await openDocumentation(page,{permissions:DOCUMENTATION_ALL_GRANTS.filter(x=>x!=='platform.tenants.export')});
  await expect(root(page).getByRole('link',{name:'Backup restore'})).toHaveCount(0);
  await expect(root(page).getByRole('link',{name:'Documentation runbooks'})).toBeVisible();
 });
 test('PDOC-024 Missing support-session grant hides only Support cockpit',async({page})=>{
  await openDocumentation(page,{permissions:DOCUMENTATION_ALL_GRANTS.filter(x=>x!=='platform.support_sessions.read')});
  await expect(root(page).getByRole('link',{name:'Support cockpit'})).toHaveCount(0);
  await expect(links(page)).toHaveCount(6);
 });
 test('PDOC-025 Missing billing-read grant hides Billing activation independently',async({page})=>{
  await openDocumentation(page,{permissions:DOCUMENTATION_ALL_GRANTS.filter(x=>x!=='platform.billing.read')});
  await expect(root(page).getByRole('link',{name:'Billing activation'})).toHaveCount(0);
  await expect(root(page).getByRole('link',{name:'Deployment validation'})).toBeVisible();
 });
 test('PDOC-026 Missing dashboard-read grant hides Launch readiness independently',async({page})=>{
  await openDocumentation(page,{permissions:DOCUMENTATION_ALL_GRANTS.filter(x=>x!=='platform.dashboard.read')});
  await expect(root(page).getByRole('link',{name:'Launch readiness'})).toHaveCount(0);
  await expect(root(page).getByRole('link',{name:'Billing activation'})).toBeVisible();
 });
 test('PDOC-027 Documentation backend GET contains no tenant ID or query fields',async({page})=>{
  const queries:string[]=[];await openDocumentation(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===DOCUMENTATION_PATH)queries.push(q.toString());}});
  expect(queries).toEqual(['']);
 });
 test('PDOC-028 Manual Refresh triggers another GET without mutation',async({page})=>{
  let reads=0;await openDocumentation(page,{onCall:(m,p)=>{if(m==='GET'&&p===DOCUMENTATION_PATH)reads++;}});
  const before=reads;await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>reads).toBeGreaterThan(before);
 });
 test('PDOC-029 Initial server failure reports error and withholds documentation cards',async({page})=>{
  await openDocumentation(page,{status:503});
  await expect(root(page).locator('.platform-documentation-completeness__feedback--error')).toContainText('Unable to load documentation completeness.');
  await expect(controls(page)).toHaveCount(0);
 });
 test('PDOC-030 Retry recovers from synthetic transient 503',async({page})=>{
  let failing=true;await openDocumentation(page,{respond:(m,p)=>m==='GET'&&p===DOCUMENTATION_PATH&&failing?{status:503,json:{message:'Synthetic offline'}}:undefined});
  await expect(root(page).getByRole('button',{name:'Retry',exact:true})).toBeVisible();
  failing=false;await root(page).getByRole('button',{name:'Retry',exact:true}).click();
  await expect(controls(page)).toHaveCount(8);
 });
 test('PDOC-031 Refresh failure preserves last good snapshot with visible stale warning',async({page})=>{
  let failing=false;await openDocumentation(page,{respond:(m,p)=>m==='GET'&&p===DOCUMENTATION_PATH&&failing?{status:503,json:{message:'Synthetic offline'}}:undefined});
  await expect(controls(page)).toHaveCount(8);failing=true;
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(root(page).locator('.platform-documentation-completeness__feedback--warning')).toContainText('last successful documentation-completeness snapshot');
  await expect(controls(page)).toHaveCount(8);
 });
 test('PDOC-032 Successful retry clears stale refresh warning',async({page})=>{
  let failing=false;await openDocumentation(page,{respond:(m,p)=>m==='GET'&&p===DOCUMENTATION_PATH&&failing?{status:503,json:{message:'Synthetic offline'}}:undefined});
  failing=true;await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(root(page).getByRole('button',{name:'Retry refresh'})).toBeVisible();
  failing=false;await root(page).getByRole('button',{name:'Retry refresh'}).click();
  await expect(root(page).locator('.platform-documentation-completeness__feedback--warning')).toHaveCount(0);
 });
 test('PDOC-033 Invalid generated date displays Not available rather than invalid date',async({page})=>{
  await openDocumentation(page,{alter:s=>({...s,generated_at:'invalid'})});
  await expect(program(page)).toContainText('Not available');
  await expect(root(page).locator('.platform-documentation-completeness__refresh-block')).toContainText('Not available');
 });
 test('PDOC-034 Documentation index displays seven required and present references',async({page})=>{
  await openDocumentation(page);const i=root(page).locator('.platform-documentation-completeness__index-panel');
  await expect(i).toContainText('7/7');await expect(i).toContainText('docs/COMMERCIAL_LAUNCH_DOCUMENTATION_INDEX.md');
 });
 test('PDOC-035 Missing index reference is shown as filename rather than silently omitted',async({page})=>{
  await openDocumentation(page,{alter:s=>({...s,documentation_index:{...s.documentation_index,missing_references:['SUPPORT_OPERATIONS_GUIDE.md'],required_references_present:6,references_complete:false}})});
  await expect(root(page).locator('.platform-documentation-completeness__index-panel')).toContainText('SUPPORT_OPERATIONS_GUIDE.md');
  await expect(root(page).locator('.platform-documentation-completeness__index-panel')).toContainText('No');
 });
 test('PDOC-036 Complete index shows None in missing-reference list',async({page})=>{
  await openDocumentation(page);
  await expect(root(page).locator('.platform-documentation-completeness__index-panel')).toContainText('Missing references');
  await expect(root(page).locator('.platform-documentation-completeness__index-panel')).toContainText('None');
 });
 test('PDOC-037 Documentation evidence distinguishes true false and unavailable states',async({page})=>{
  await openDocumentation(page,{kind:'blocked'});const panel=evidence(page);
  await expect(panel).toContainText('Present');
  await expect(panel).toContainText('Missing or incomplete');
  await expect(panel).toContainText('External review required');
 });
 test('PDOC-038 Frontend document null evidence is not presented as missing',async({page})=>{
  await openDocumentation(page);
  const item=evidence(page).locator('.platform-documentation-completeness__evidence-item').filter({hasText:'Frontend commercial closure doc present'});
  await expect(item.locator('strong')).toHaveText('External review required');
  await expect(item.locator('strong')).toHaveAttribute('data-tone','warn');
 });
 test('PDOC-039 Repository resolution convention is humanized in program detail',async({page})=>{
  await openDocumentation(page);await expect(program(page)).toContainText('Paired checkout convention');
 });
 test('PDOC-040 Detailed summary independently names nine source-defined counters',async({page})=>{
  await openDocumentation(page);await expect(root(page).locator('.platform-documentation-completeness__summary-item')).toHaveCount(9);
  await expect(root(page).locator('.platform-documentation-completeness__summary-panel')).toContainText('Sources unavailable');
 });
 test('PDOC-041 Unrecognized summary counter is rendered as humanized key',async({page})=>{
  await openDocumentation(page,{alter:s=>({...s,summary:{...s.summary,owner_signoff_pending:3}})});
  await expect(root(page).locator('.platform-documentation-completeness__summary-panel')).toContainText('Owner signoff pending');
 });
 test('PDOC-042 Each documentation control keeps source-relative path visible',async({page})=>{
  await openDocumentation(page);
  await expect(controls(page).filter({hasText:'Support operations guide complete'})).toContainText('docs/SUPPORT_OPERATIONS_GUIDE.md');
 });
 test('PDOC-043 Control code is visible separately from document title',async({page})=>{
  await openDocumentation(page);const c=controls(page).first();
  await expect(c.getByRole('heading',{name:'Launch documentation index complete'})).toBeVisible();
  await expect(c.locator('.platform-documentation-completeness__control-heading code')).toHaveText('launch_documentation_index_present');
 });
 test('PDOC-044 Documentation control identifies owning area and repository scope',async({page})=>{
  await openDocumentation(page);const c=controls(page).filter({hasText:'Frontend commercial closure reference complete'});
  await expect(c.locator('.platform-documentation-completeness__control-meta')).toContainText('Frontend launch evidence');
  await expect(c.locator('.platform-documentation-completeness__control-meta')).toContainText('Frontend repository');
 });
 test('PDOC-045 Small document size is rendered in bytes',async({page})=>{
  await openDocumentation(page,{alter:s=>({...s,documentation_controls:s.documentation_controls.map((c,i)=>i===0?{...c,evidence_detail:{...c.evidence_detail,file_size_bytes:512}}:c)})});
  await expect(controls(page).first().locator('.platform-documentation-completeness__control-meta')).toContainText('512 B');
 });
 test('PDOC-046 Medium document size is rendered in KB to one decimal place',async({page})=>{
  await openDocumentation(page);
  await expect(controls(page).first().locator('.platform-documentation-completeness__control-meta')).toContainText('2.0 KB');
 });
 test('PDOC-047 Large document size is rendered in MB to one decimal place',async({page})=>{
  await openDocumentation(page,{alter:s=>({...s,documentation_controls:s.documentation_controls.map((c,i)=>i===0?{...c,evidence_detail:{...c.evidence_detail,file_size_bytes:1572864}}:c)})});
  await expect(controls(page).first().locator('.platform-documentation-completeness__control-meta')).toContainText('1.5 MB');
 });
 test('PDOC-048 Absent external document size says Not available, never zero bytes',async({page})=>{
  await openDocumentation(page);const c=controls(page).last();
  await expect(c.locator('.platform-documentation-completeness__control-meta')).toContainText('Not available');
 });
 test('PDOC-049 Deployment guide control displays four required Markdown markers',async({page})=>{
  await openDocumentation(page);const c=controls(page).filter({hasText:'Deployment validation guide complete'});
  await expect(c.locator('.platform-documentation-completeness__control-meta')).toContainText('4/4');
 });
 test('PDOC-050 Missing Markdown structure markers are listed individually under affected control',async({page})=>{
  await openDocumentation(page,{kind:'blocked'});const c=controls(page).filter({hasText:'Support operations guide complete'});
  await expect(c.locator('.platform-documentation-completeness__missing-markers li')).toHaveCount(2);
  await expect(c.locator('.platform-documentation-completeness__missing-markers')).toContainText('## Launch rule');
 });
 test('PDOC-051 Documentation index self-control does not show Indexed field',async({page})=>{
  await openDocumentation(page);const c=controls(page).first();
  await expect(c.locator('.platform-documentation-completeness__control-meta')).not.toContainText('Indexed');
  await expect(controls(page).nth(1).locator('.platform-documentation-completeness__control-meta')).toContainText('Indexed');
 });
 test('PDOC-052 Unknown server-supplied documentation status remains human-readable',async({page})=>{
  await openDocumentation(page,{alter:s=>({...s,documentation_controls:s.documentation_controls.map((c,i)=>i===0?{...c,status:'owner_review_pending'}:c)})});
  await expect(controls(page).first().locator('.platform-documentation-completeness__status-badge')).toHaveText('Owner review pending');
 });
 test('PDOC-053 Manual acceptance panel enumerates seven real owner responsibilities',async({page})=>{
  await openDocumentation(page);
  await expect(root(page).locator('.platform-documentation-completeness__two-column ul li')).toHaveCount(7);
  await expect(root(page).locator('.platform-documentation-completeness__two-column')).toContainText('Operations owner');
 });
 test('PDOC-054 Next operator step displays posture-specific guidance without accepting ownership',async({page})=>{
  await openDocumentation(page,{kind:'review'});
  await expect(root(page).locator('.platform-documentation-completeness__next-step')).toContainText('Review the frontend repository documentation externally');
  await expect(root(page).locator('.platform-documentation-completeness__validation-note')).toContainText('Read exact validation boundary');
 });
 test('PDOC-055 Repeated refresh cannot issue write requests to the documentation endpoint',async({page})=>{
  const writes:string[]=[];await openDocumentation(page,{onCall:(m,p)=>{if(!['GET','OPTIONS'].includes(m))writes.push(`${m} ${p}`);}});
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(controls(page)).toHaveCount(8);expect(writes).toEqual([]);
 });

 test('PDOC-056 The server can provide an empty summary without fabricating detailed counters',async({page})=>{
  await openDocumentation(page,{alter:s=>({...s,summary:{}})});
  await expect(root(page).locator('.platform-documentation-completeness__summary-item')).toHaveCount(0);
  await expect(root(page).locator('.platform-documentation-completeness__hero-aside')).toContainText('0/0');
 });
 test('PDOC-057 Index reference counter renders an explicit partial ratio',async({page})=>{
  await openDocumentation(page,{alter:s=>({...s,documentation_index:{...s.documentation_index,required_references_total:7,required_references_present:5,references_complete:false,missing_references:['BILLING_SUBSCRIPTION_GUIDE.md','BACKUP_RECOVERY_GUIDE.md']}})});
  const index=root(page).locator('.platform-documentation-completeness__index-panel');await expect(index).toContainText('5/7');await expect(index).toContainText('BACKUP_RECOVERY_GUIDE.md');await expect(index).toContainText('No');
 });
 test('PDOC-058 Backend source being unavailable stays explicitly separate from frontend source',async({page})=>{
  await openDocumentation(page,{alter:s=>({...s,repository_access:{...s.repository_access,backend_repository_available:false}})});
  await expect(program(page)).toContainText('Backend repository');await expect(program(page)).toContainText('Unavailable');
 });
 test('PDOC-059 Empty documentation evidence map does not invent document evidence rows',async({page})=>{
  await openDocumentation(page,{alter:s=>({...s,documentation_evidence:{}})});
  await expect(evidence(page).locator('.platform-documentation-completeness__evidence-item')).toHaveCount(0);
 });
 test('PDOC-060 Missing optional structure-marker list is empty not a fabricated defect',async({page})=>{
  await openDocumentation(page);
  await expect(controls(page).first().locator('.platform-documentation-completeness__missing-markers')).toHaveCount(0);
 });
 test('PDOC-061 False structure presence remains distinguishable from external unknown',async({page})=>{
  await openDocumentation(page,{alter:s=>({...s,documentation_controls:s.documentation_controls.map((c,i)=>i===0?{...c,status:'documentation_structure_incomplete',evidence_detail:{...c.evidence_detail,structure_complete:false}}:c)})});
  await expect(controls(page).first().locator('.platform-documentation-completeness__control-meta')).toContainText('No');
  await expect(controls(page).last().locator('.platform-documentation-completeness__control-meta')).toContainText('Not inspectable here');
 });
 test('PDOC-062 Index document uses its own repository status and does not claim signed off',async({page})=>{
  await openDocumentation(page,{kind:'ready'});
  await expect(controls(page).first()).toContainText('Documentation present');
  await expect(root(page).locator('.platform-documentation-completeness__boundary-panel')).toContainText('owner-approved');
 });
 test('PDOC-063 Unknown server-supplied summary key is not hidden in detailed view',async({page})=>{
  await openDocumentation(page,{alter:s=>({...s,summary:{...s.summary,release_owner_review_queue:12}})});
  const summary=root(page).locator('.platform-documentation-completeness__summary-panel');await expect(summary).toContainText('Release owner review queue');await expect(summary).toContainText('12');
 });
 test('PDOC-064 Synthetic stale refresh does not lose the last successful index details',async({page})=>{
  let fail=false;await openDocumentation(page,{respond:(m,p)=>m==='GET'&&p===DOCUMENTATION_PATH&&fail?{json:{message:'Synthetic repository timeout'},status:503}:undefined});
  const index=root(page).locator('.platform-documentation-completeness__index-panel');await expect(index).toContainText('7/7');
  fail=true;await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(root(page).locator('.platform-documentation-completeness__feedback--warning')).toBeVisible();await expect(index).toContainText('7/7');
 });
 test('PDOC-065 Synthetic failed initial GET cannot show a false ready posture',async({page})=>{
  await openDocumentation(page,{status:503});await expect(controls(page)).toHaveCount(0);
  await expect(root(page).locator('.platform-documentation-completeness__hero-aside')).not.toContainText('Ready for manual acceptance');
 });
 test('PDOC-066 Read-only board preserves URL context parameters across refresh',async({page})=>{
  await openDocumentation(page,{urlQuery:'operator_context=synthetic&review=source'});
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();await expect(page).toHaveURL(/operator_context=synthetic/);await expect(page).toHaveURL(/review=source/);
 });
 test('PDOC-067 Narrow browser viewport retains the user-triggered refresh control',async({page})=>{
  await page.setViewportSize({width:390,height:780});await openDocumentation(page);
  await expect(root(page).getByRole('button',{name:'Refresh',exact:true})).toBeVisible();
 });
 test('PDOC-068 Keyboard can focus refresh without a repository mutation',async({page})=>{
  await openDocumentation(page);const button=root(page).getByRole('button',{name:'Refresh',exact:true});await button.focus();await expect(button).toBeFocused();
 });
 test('PDOC-069 Validation boundary remains inspectable without declaring owner approval',async({page})=>{
  await openDocumentation(page);const note=root(page).locator('.platform-documentation-completeness__validation-note');
  await note.locator('summary').click();await expect(note).toContainText('production');
 });
 test('PDOC-070 Source-supplied next step remains a recommendation rather than success notification',async({page})=>{
  const message='Synthetic pilot owner must verify document freshness before launch';
  await openDocumentation(page,{alter:s=>({...s,next_best_step:message})});
  await expect(root(page).locator('.platform-documentation-completeness__next-step')).toContainText(message);
  await expect(root(page).locator('.platform-documentation-completeness__next-step')).not.toContainText('Approved for launch');
 });
});
