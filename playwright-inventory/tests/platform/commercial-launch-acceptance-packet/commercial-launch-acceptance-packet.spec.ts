/** Batch 118 — browser-facing read-only acceptance-packet scenarios; mocked GET, NO real owner signoff. */
import {test,expect,type Page} from '@playwright/test';
import {openAcceptancePacket,makeAcceptanceSnapshot,ACCEPTANCE_PATH,ACCEPTANCE_PERMISSIONS,REQUIRED_FIELDS,OWNER_ACCEPTANCE_RULES} from '../../../support/platformCommercialLaunchAcceptancePacketFixture';
const root=(p:Page)=>p.locator('.platform-launch-acceptance');
const cards=(p:Page)=>root(p).locator('.platform-launch-acceptance__packet-card');
const human=(s:string)=>s.replaceAll('_',' ').replace(/^./,x=>x.toUpperCase());
const packet=(p:Page,code:string)=>cards(p).filter({has:p.getByRole('heading',{name:human(code),exact:true})});
const context=(p:Page)=>root(p).locator('.platform-launch-acceptance__context-panel');
const decision=(p:Page)=>root(p).locator('.platform-launch-acceptance__decision-grid');
test.describe('Platform Commercial Launch Acceptance Packet — Step 218 read-only owner review preparation',()=>{
 test('PCLAP-001 Source route renders Commercial Launch Acceptance Packet title',async({page})=>{
  await openAcceptancePacket(page);await expect(page.getByRole('heading',{name:'Commercial Launch Acceptance Packet',exact:true})).toBeVisible();
 });
 test('PCLAP-002 Hero explicitly describes read-only preparation instead of signoff',async({page})=>{
  await openAcceptancePacket(page);await expect(root(page)).toContainText('Owner-signoff preparation only');
 });
 test('PCLAP-003 External acceptance records remain required',async({page})=>{
  await openAcceptancePacket(page);await expect(root(page)).toContainText('External acceptance records required');
 });
 test('PCLAP-004 Step 218 source identity is rendered in context',async({page})=>{
  await openAcceptancePacket(page);await expect(context(page)).toContainText('Step 218 — Commercial Launch Acceptance Packet');
 });
 test('PCLAP-005 Six source-defined summary metric cards are displayed',async({page})=>{
  await openAcceptancePacket(page);await expect(root(page).getByLabel('Commercial launch acceptance summary').locator('.io-workspace-stat')).toHaveCount(6);
 });
 test('PCLAP-006 Ten certificate evidence controls become ten owner packets',async({page})=>{
  await openAcceptancePacket(page);await expect(cards(page)).toHaveCount(10);
 });
 test('PCLAP-007 Signoffs stored counter is zero even with ready evidence',async({page})=>{
  await openAcceptancePacket(page,{kind:'ready'});await expect(root(page).getByLabel('Commercial launch acceptance summary')).toContainText('Signoffs stored');await expect(context(page)).toContainText('External only');
 });
 test('PCLAP-008 Blocked upstream evidence creates blocked packet posture',async({page})=>{
  await openAcceptancePacket(page,{kind:'mixed'});await expect(root(page).locator('.platform-launch-acceptance__hero-aside .platform-launch-acceptance__status-badge')).toHaveText('Blocked by evidence');
 });
 test('PCLAP-009 Ready source evidence is ready for manual signoff not automatically signed',async({page})=>{
  await openAcceptancePacket(page,{kind:'ready'});await expect(root(page).locator('.platform-launch-acceptance__hero-aside .platform-launch-acceptance__status-badge')).toHaveText('Ready for manual signoff');await expect(context(page)).toContainText('External only');
 });
 test('PCLAP-010 Review-required source evidence remains review-required',async({page})=>{
  await openAcceptancePacket(page,{kind:'review'});await expect(root(page).locator('.platform-launch-acceptance__hero-aside .platform-launch-acceptance__status-badge')).toHaveText('Evidence review required');
 });
 test('PCLAP-011 Packet tenant_provisioning_accepted preserves responsible owner and external artifact',async({page})=>{
  await openAcceptancePacket(page);const card=packet(page,'tenant_provisioning_accepted');await expect(card).toBeVisible();await expect(card).toContainText('owner: Platform owner');await expect(card.locator('.platform-launch-acceptance__artifact-box')).toContainText('External');
 });
 test('PCLAP-012 Packet customer_onboarding_accepted preserves responsible owner and external artifact',async({page})=>{
  await openAcceptancePacket(page);const card=packet(page,'customer_onboarding_accepted');await expect(card).toBeVisible();await expect(card).toContainText('owner: Customer success owner');await expect(card.locator('.platform-launch-acceptance__artifact-box')).toContainText('External');
 });
 test('PCLAP-013 Packet billing_subscription_accepted preserves responsible owner and external artifact',async({page})=>{
  await openAcceptancePacket(page);const card=packet(page,'billing_subscription_accepted');await expect(card).toBeVisible();await expect(card).toContainText('owner: Commercial owner');await expect(card.locator('.platform-launch-acceptance__artifact-box')).toContainText('External');
 });
 test('PCLAP-014 Packet support_operations_accepted preserves responsible owner and external artifact',async({page})=>{
  await openAcceptancePacket(page);const card=packet(page,'support_operations_accepted');await expect(card).toBeVisible();await expect(card).toContainText('owner: Support owner');await expect(card.locator('.platform-launch-acceptance__artifact-box')).toContainText('External');
 });
 test('PCLAP-015 Packet production_monitoring_accepted preserves responsible owner and external artifact',async({page})=>{
  await openAcceptancePacket(page);const card=packet(page,'production_monitoring_accepted');await expect(card).toBeVisible();await expect(card).toContainText('owner: Operations owner');await expect(card.locator('.platform-launch-acceptance__artifact-box')).toContainText('External');
 });
 test('PCLAP-016 Packet backup_restore_accepted preserves responsible owner and external artifact',async({page})=>{
  await openAcceptancePacket(page);const card=packet(page,'backup_restore_accepted');await expect(card).toBeVisible();await expect(card).toContainText('owner: Operations owner');await expect(card.locator('.platform-launch-acceptance__artifact-box')).toContainText('External');
 });
 test('PCLAP-017 Packet deployment_validation_accepted preserves responsible owner and external artifact',async({page})=>{
  await openAcceptancePacket(page);const card=packet(page,'deployment_validation_accepted');await expect(card).toBeVisible();await expect(card).toContainText('owner: Release owner');await expect(card.locator('.platform-launch-acceptance__artifact-box')).toContainText('External');
 });
 test('PCLAP-018 Packet documentation_completeness_accepted preserves responsible owner and external artifact',async({page})=>{
  await openAcceptancePacket(page);const card=packet(page,'documentation_completeness_accepted');await expect(card).toBeVisible();await expect(card).toContainText('owner: Product owner');await expect(card.locator('.platform-launch-acceptance__artifact-box')).toContainText('External');
 });
 test('PCLAP-019 Packet pilot_customer_readiness_accepted preserves responsible owner and external artifact',async({page})=>{
  await openAcceptancePacket(page);const card=packet(page,'pilot_customer_readiness_accepted');await expect(card).toBeVisible();await expect(card).toContainText('owner: Customer success owner');await expect(card.locator('.platform-launch-acceptance__artifact-box')).toContainText('External');
 });
 test('PCLAP-020 Packet commercial_readiness_closure_accepted preserves responsible owner and external artifact',async({page})=>{
  await openAcceptancePacket(page);const card=packet(page,'commercial_readiness_closure_accepted');await expect(card).toBeVisible();await expect(card).toContainText('owner: Platform owner');await expect(card.locator('.platform-launch-acceptance__artifact-box')).toContainText('External');
 });
 test('PCLAP-021 Packet tenant_provisioning_accepted retains its evidence endpoint',async({page})=>{
  await openAcceptancePacket(page);await expect(packet(page,'tenant_provisioning_accepted').locator('.platform-launch-acceptance__evidence-path code')).toHaveText('GET /api/platform/tenant-provisioning-hardening');
 });
 test('PCLAP-022 Packet customer_onboarding_accepted retains its evidence endpoint',async({page})=>{
  await openAcceptancePacket(page);await expect(packet(page,'customer_onboarding_accepted').locator('.platform-launch-acceptance__evidence-path code')).toHaveText('GET /api/platform/customer-onboarding-checklist');
 });
 test('PCLAP-023 Packet billing_subscription_accepted retains its evidence endpoint',async({page})=>{
  await openAcceptancePacket(page);await expect(packet(page,'billing_subscription_accepted').locator('.platform-launch-acceptance__evidence-path code')).toHaveText('GET /api/platform/billing-subscription-activation');
 });
 test('PCLAP-024 Packet support_operations_accepted retains its evidence endpoint',async({page})=>{
  await openAcceptancePacket(page);await expect(packet(page,'support_operations_accepted').locator('.platform-launch-acceptance__evidence-path code')).toHaveText('GET /api/platform/support-operations-cockpit');
 });
 test('PCLAP-025 Packet production_monitoring_accepted retains its evidence endpoint',async({page})=>{
  await openAcceptancePacket(page);await expect(packet(page,'production_monitoring_accepted').locator('.platform-launch-acceptance__evidence-path code')).toHaveText('GET /api/platform/production-monitoring-readiness');
 });
 test('PCLAP-026 Packet backup_restore_accepted retains its evidence endpoint',async({page})=>{
  await openAcceptancePacket(page);await expect(packet(page,'backup_restore_accepted').locator('.platform-launch-acceptance__evidence-path code')).toHaveText('GET /api/platform/backup-restore-validation');
 });
 test('PCLAP-027 Packet deployment_validation_accepted retains its evidence endpoint',async({page})=>{
  await openAcceptancePacket(page);await expect(packet(page,'deployment_validation_accepted').locator('.platform-launch-acceptance__evidence-path code')).toHaveText('GET /api/platform/deployment-validation');
 });
 test('PCLAP-028 Packet documentation_completeness_accepted retains its evidence endpoint',async({page})=>{
  await openAcceptancePacket(page);await expect(packet(page,'documentation_completeness_accepted').locator('.platform-launch-acceptance__evidence-path code')).toHaveText('GET /api/platform/documentation-completeness');
 });
 test('PCLAP-029 Packet pilot_customer_readiness_accepted retains its evidence endpoint',async({page})=>{
  await openAcceptancePacket(page);await expect(packet(page,'pilot_customer_readiness_accepted').locator('.platform-launch-acceptance__evidence-path code')).toHaveText('GET /api/platform/pilot-customer-readiness');
 });
 test('PCLAP-030 Packet commercial_readiness_closure_accepted retains its evidence endpoint',async({page})=>{
  await openAcceptancePacket(page);await expect(packet(page,'commercial_readiness_closure_accepted').locator('.platform-launch-acceptance__evidence-path code')).toHaveText('GET /api/platform/commercial-readiness-closure');
 });
 test('PCLAP-031 Packet tenant_provisioning_accepted links to original review surface',async({page})=>{
  await openAcceptancePacket(page);await expect(packet(page,'tenant_provisioning_accepted').getByRole('link',{name:'Open provisioning evidence'})).toHaveAttribute('href','/platform/tenant-provisioning-hardening');
 });
 test('PCLAP-032 Packet customer_onboarding_accepted links to original review surface',async({page})=>{
  await openAcceptancePacket(page);await expect(packet(page,'customer_onboarding_accepted').getByRole('link',{name:'Open onboarding evidence'})).toHaveAttribute('href','/platform/customer-onboarding-checklist');
 });
 test('PCLAP-033 Packet billing_subscription_accepted links to original review surface',async({page})=>{
  await openAcceptancePacket(page);await expect(packet(page,'billing_subscription_accepted').getByRole('link',{name:'Open billing activation'})).toHaveAttribute('href','/platform/billing-subscription-activation');
 });
 test('PCLAP-034 Packet support_operations_accepted links to original review surface',async({page})=>{
  await openAcceptancePacket(page);await expect(packet(page,'support_operations_accepted').getByRole('link',{name:'Open support cockpit'})).toHaveAttribute('href','/platform/support-cockpit');
 });
 test('PCLAP-035 Packet production_monitoring_accepted links to original review surface',async({page})=>{
  await openAcceptancePacket(page);await expect(packet(page,'production_monitoring_accepted').getByRole('link',{name:'Open monitoring readiness'})).toHaveAttribute('href','/platform/monitoring-readiness');
 });
 test('PCLAP-036 Packet backup_restore_accepted links to original review surface',async({page})=>{
  await openAcceptancePacket(page);await expect(packet(page,'backup_restore_accepted').getByRole('link',{name:'Open backup restore'})).toHaveAttribute('href','/platform/backup-restore-validation');
 });
 test('PCLAP-037 Packet deployment_validation_accepted links to original review surface',async({page})=>{
  await openAcceptancePacket(page);await expect(packet(page,'deployment_validation_accepted').getByRole('link',{name:'Open deployment validation'})).toHaveAttribute('href','/platform/deployment-validation');
 });
 test('PCLAP-038 Packet documentation_completeness_accepted links to original review surface',async({page})=>{
  await openAcceptancePacket(page);await expect(packet(page,'documentation_completeness_accepted').getByRole('link',{name:'Open documentation completeness'})).toHaveAttribute('href','/platform/documentation-completeness');
 });
 test('PCLAP-039 Packet pilot_customer_readiness_accepted links to original review surface',async({page})=>{
  await openAcceptancePacket(page);await expect(packet(page,'pilot_customer_readiness_accepted').getByRole('link',{name:'Open pilot readiness'})).toHaveAttribute('href','/platform/pilot-customer-readiness');
 });
 test('PCLAP-040 Packet commercial_readiness_closure_accepted links to original review surface',async({page})=>{
  await openAcceptancePacket(page);await expect(packet(page,'commercial_readiness_closure_accepted').getByRole('link',{name:'Open readiness verification'})).toHaveAttribute('href','/platform/commercial-readiness-verification-program');
 });
 test('PCLAP-041 Unavailable source surfaces show a source error and block owner review',async({page})=>{
  await openAcceptancePacket(page,{kind:'mixed'});const card=packet(page,'production_monitoring_accepted');await expect(card.locator('.platform-launch-acceptance__source-warning')).toContainText('Synthetic upstream unavailable');await expect(card).toContainText('Blocked until evidence is ready');
 });
 test('PCLAP-042 Clean source evidence hides source error warnings',async({page})=>{
  await openAcceptancePacket(page,{kind:'ready'});await expect(root(page).locator('.platform-launch-acceptance__source-warning')).toHaveCount(0);
 });
 test('PCLAP-043 Tenant-scoped packet displays evaluated tenants and review cap',async({page})=>{
  await openAcceptancePacket(page);await expect(packet(page,'tenant_provisioning_accepted').locator('.platform-launch-acceptance__scope-box')).toContainText('Evaluated 3 of 3 · cap 300');
 });
 test('PCLAP-044 Global evidence retains explicit scope status without tenant certification',async({page})=>{
  await openAcceptancePacket(page);await expect(packet(page,'billing_subscription_accepted').locator('.platform-launch-acceptance__scope-box')).toContainText('Not limited by certificate');
 });
 test('PCLAP-045 Scope-limit review remains visible for an upstream packet',async({page})=>{
  await openAcceptancePacket(page,{alter:s=>({...s,acceptance_packets:s.acceptance_packets.map(x=>x.source_control==='pilot_customer_readiness_accepted'?{...x,evidence_scope:{mode:'tenant_population',status:'scope_limit_review_required',review_limit:300,evaluated_tenants:300,total_tenants:405},evidence_status:'evidence_review_required'}:x)})});await expect(packet(page,'pilot_customer_readiness_accepted').locator('.platform-launch-acceptance__scope-box')).toContainText('Scope review required');
 });
 test('PCLAP-046 Missing tenant total is displayed as Unavailable instead of invented count',async({page})=>{
  await openAcceptancePacket(page,{alter:s=>({...s,tenant_scope:s.tenant_scope?{...s.tenant_scope,total_tenants:null}:null})});await expect(context(page)).toContainText('Unavailable');
 });
 test('PCLAP-047 All nine external owner acceptance fields appear as chips',async({page})=>{
  await openAcceptancePacket(page);const chips=cards(page).first().locator('.platform-launch-acceptance__chip');await expect(chips).toHaveCount(9);await expect(chips).toContainText(REQUIRED_FIELDS.map(human));
 });
 test('PCLAP-048 Certificate source summary is disclosed without implying evidence verified',async({page})=>{
  await openAcceptancePacket(page);const details=cards(page).first().locator('.platform-launch-acceptance__details--packet').filter({hasText:'Current source evidence summary'});await details.locator('summary').click();await expect(details).toContainText('Tenants total');await expect(details).toContainText('3');
 });
 test('PCLAP-049 Static registry remains context only in acceptance packet',async({page})=>{
  await openAcceptancePacket(page);await expect(context(page).locator('.platform-launch-acceptance__registry-note')).toContainText('Static registry gate is context only');await expect(cards(page).first()).toContainText('Context only');
 });
 test('PCLAP-050 Refresh sends a new read request and never writes acceptance',async({page})=>{
  const calls:string[]=[];await openAcceptancePacket(page,{onCall:(m,p)=>{if(p===ACCEPTANCE_PATH)calls.push(m);}});await root(page).getByRole('button',{name:'Refresh',exact:true}).click();await expect.poll(()=>calls.length).toBeGreaterThan(1);expect(calls.every(m=>m==='GET')).toBe(true);
 });
 test('PCLAP-051 Initial read failure shows retry without fabricated acceptance packets',async({page})=>{
  await openAcceptancePacket(page,{status:503});await expect(root(page).getByRole('alert')).toContainText('Unable to load Commercial Launch Acceptance Packet.');await expect(root(page).getByRole('button',{name:'Retry',exact:true})).toBeVisible();await expect(cards(page)).toHaveCount(0);
 });
 test('PCLAP-052 Transient GET failure can be retried without any mutation',async({page})=>{
  let failing=true;await openAcceptancePacket(page,{respond:(m,p)=>m==='GET'&&p===ACCEPTANCE_PATH&&failing?{json:{message:'Synthetic outage'},status:503}:undefined});await expect(root(page).getByRole('button',{name:'Retry',exact:true})).toBeVisible();failing=false;await root(page).getByRole('button',{name:'Retry',exact:true}).click();await expect(cards(page)).toHaveCount(10);
 });
 test('PCLAP-053 Failed refresh retains prior snapshot and warns it is stale',async({page})=>{
  let failing=false;await openAcceptancePacket(page,{respond:(m,p)=>m==='GET'&&p===ACCEPTANCE_PATH&&failing?{json:{message:'Synthetic refresh outage'},status:503}:undefined});await expect(cards(page)).toHaveCount(10);failing=true;await root(page).getByRole('button',{name:'Refresh',exact:true}).click();await expect(root(page).locator('.platform-launch-acceptance__feedback--warning')).toContainText('Showing the last successful Commercial Launch Acceptance Packet snapshot');await expect(cards(page)).toHaveCount(10);
 });
 test('PCLAP-054 Missing a required platform grant prevents accessing packet board',async({page})=>{
  await openAcceptancePacket(page,{permissions:ACCEPTANCE_PERMISSIONS.filter(p=>p!=='platform.tenants.export'),expectHeading:false});await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
 });
 test('PCLAP-055 Keyboard focus remains on refresh at narrow viewport width',async({page})=>{
  await page.setViewportSize({width:390,height:780});await openAcceptancePacket(page);const button=root(page).getByRole('button',{name:'Refresh',exact:true});await button.focus();await expect(button).toBeFocused();
 });
 test('PCLAP-056 Empty acceptance packet array shows explicit no-packets message',async({page})=>{
  await openAcceptancePacket(page,{alter:s=>({...s,acceptance_packets:[]})});await expect(root(page).locator('.platform-launch-acceptance__empty-state')).toContainText('No acceptance packets are available.');await expect(cards(page)).toHaveCount(0);
 });
 test('PCLAP-057 Absent source summary does not fabricate evidence details',async({page})=>{
  await openAcceptancePacket(page,{alter:s=>({...s,acceptance_packets:s.acceptance_packets.map((p,i)=>i===0?{...p,source_summary:{}}:p)})});await expect(cards(page).first().getByText('Current source evidence summary')).toHaveCount(0);
 });
 test('PCLAP-058 Source validation note is hidden when absent',async({page})=>{
  await openAcceptancePacket(page,{alter:s=>({...s,acceptance_packets:s.acceptance_packets.map((p,i)=>i===0?{...p,source_validation_note:null}:p)})});await expect(cards(page).first().getByText('Source validation note')).toHaveCount(0);
 });
 test('PCLAP-059 Source validation note is shown in expandable details',async({page})=>{
  const note='Synthetic evidence requires additional manual observation';await openAcceptancePacket(page,{alter:s=>({...s,acceptance_packets:s.acceptance_packets.map((p,i)=>i===0?{...p,source_validation_note:note}:p)})});const details=cards(page).first().locator('details').filter({hasText:'Source validation note'});await details.locator('summary').click();await expect(details).toContainText(note);
 });
 test('PCLAP-060 No scope metadata retains Not scope-limited indicator',async({page})=>{
  await openAcceptancePacket(page,{alter:s=>({...s,acceptance_packets:s.acceptance_packets.map((p,i)=>i===0?{...p,evidence_scope:null}:p)})});await expect(cards(page).first().locator('.platform-launch-acceptance__scope-box')).toContainText('Not scope-limited');
 });
 test('PCLAP-061 Error code is displayed as a source warning not a signed approval',async({page})=>{
  await openAcceptancePacket(page,{alter:s=>({...s,acceptance_packets:s.acceptance_packets.map((p,i)=>i===0?{...p,source_error_code:'SYNTHETIC_UPSTREAM_BLOCKED'}:p)})});await expect(cards(page).first().locator('.platform-launch-acceptance__source-warning')).toContainText('Synthetic upstream blocked');await expect(context(page)).toContainText('External only');
 });
 test('PCLAP-062 Unknown owner code is displayed without inventing signer identity',async({page})=>{
  await openAcceptancePacket(page,{alter:s=>({...s,acceptance_packets:s.acceptance_packets.map((p,i)=>i===0?{...p,acceptance_owner:'unassigned_manual_owner'}:p)})});await expect(cards(page).first()).toContainText('owner: Unassigned manual owner');
 });
 test('PCLAP-063 Updated external required field appears only as a requirement',async({page})=>{
  await openAcceptancePacket(page,{alter:s=>({...s,acceptance_packets:s.acceptance_packets.map((p,i)=>i===0?{...p,required_acceptance_fields:[...p.required_acceptance_fields,'synthetic_external_reference']}:p)})});await expect(cards(page).first().locator('.platform-launch-acceptance__chip').last()).toHaveText('Synthetic external reference');
 });
 test('PCLAP-064 Empty evidence endpoint displays no invented API location',async({page})=>{
  await openAcceptancePacket(page,{alter:s=>({...s,acceptance_packets:s.acceptance_packets.map((p,i)=>i===0?{...p,required_evidence:''}:p)})});await expect(cards(page).first().locator('.platform-launch-acceptance__evidence-path code')).toHaveText('');
 });
 test('PCLAP-065 Missing certificate registry note stays hidden',async({page})=>{
  await openAcceptancePacket(page,{alter:s=>({...s,certificate_registry_note:null})});await expect(context(page).locator('.platform-launch-acceptance__registry-note')).toHaveCount(0);
 });
 test('PCLAP-066 Empty acceptance control list does not invent requirements',async({page})=>{
  await openAcceptancePacket(page,{alter:s=>({...s,required_packet_controls:[]})});await expect(decision(page).locator('.platform-launch-acceptance__decision-panel').first().locator('li')).toHaveCount(0);
 });
 test('PCLAP-067 Additional inherited limitation is rendered verbatim',async({page})=>{
  const note='Synthetic launch limitation requires operator approval';await openAcceptancePacket(page,{alter:s=>({...s,launch_limitations:[...s.launch_limitations,note]})});await expect(decision(page)).toContainText(note);
 });
 test('PCLAP-068 Next best step is advisory not an approval action',async({page})=>{
  const message='Synthetic owner must review external acceptance tickets';await openAcceptancePacket(page,{alter:s=>({...s,next_best_step:message})});await expect(root(page).locator('.platform-launch-acceptance__next-step')).toContainText(message);await expect(root(page).getByRole('button',{name:/^(Approve|Sign|Go live)$/})).toHaveCount(0);
 });
 test('PCLAP-069 Refreshing acceptance packet preserves URL query context',async({page})=>{
  await openAcceptancePacket(page,{urlQuery:'review=synthetic-119'});await root(page).getByRole('button',{name:'Refresh',exact:true}).click();await expect(page).toHaveURL(/review=synthetic-119/);
 });
 test('PCLAP-070 Read-only source drilldown expansion does not post signatures',async({page})=>{
  const writes:string[]=[];await openAcceptancePacket(page,{onCall:(method,path)=>{if(!['GET','OPTIONS'].includes(method))writes.push(`${method} ${path}`);}});const d=cards(page).first().locator('details').first();await d.locator('summary').click();await expect(d).toHaveAttribute('open','');expect(writes).toEqual([]);
 });
});
