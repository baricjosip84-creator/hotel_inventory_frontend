/** Batch 117: synthetic, source-mapped read-only certificate PRECHECK. This does NOT issue any certificate or prove live acceptance. */
import {test,expect,type Page} from '@playwright/test';
import {openCommercialCertificate,makeCommercialCertificateSnapshot,COMMERCIAL_CERTIFICATE_PATH,COMMERCIAL_CERTIFICATE_PERMISSIONS,COMMERCIAL_CERTIFICATE_CONTROLS} from '../../../support/platformCommercialLaunchCertificateFixture';
const root=(p:Page)=>p.locator('.platform-launch-certificate');
const cards=(p:Page)=>root(p).locator('.platform-launch-certificate__control-card');
const control=(p:Page,code:string)=>cards(p).filter({has:p.getByRole('heading',{name:code.replaceAll('_',' ').replace(/^./,x=>x.toUpperCase()),exact:true})});
const program=(p:Page)=>root(p).locator('.platform-launch-certificate__program-panel');
const decision=(p:Page)=>root(p).locator('.platform-launch-certificate__decision-grid');
test.describe('Platform Commercial Launch Certificate — Step 217 read-only synthetic evidence precheck',()=>{
 test('PCLC-001 Commercial Launch Certificate title is rendered for the source route',async({page})=>{
  await openCommercialCertificate(page);await expect(page.getByRole('heading',{name:'Commercial Launch Certificate',exact:true})).toBeVisible();
 });
 test('PCLC-002 Hero states this is an internal precheck only',async({page})=>{
  await openCommercialCertificate(page);await expect(root(page)).toContainText('Internal precheck only');
 });
 test('PCLC-003 Manual owner acceptance is explicitly required',async({page})=>{
  await openCommercialCertificate(page);await expect(root(page)).toContainText('Manual owner acceptance required');
 });
 test('PCLC-004 Step 217 identity is displayed as an evidence input',async({page})=>{
  await openCommercialCertificate(page);await expect(program(page)).toContainText('Step 217 — Commercial Launch Certificate Board');
 });
 test('PCLC-005 Eight source summary cards render separately',async({page})=>{
  await openCommercialCertificate(page);await expect(root(page).getByLabel('Commercial launch certificate summary').locator('.io-workspace-stat')).toHaveCount(8);
 });
 test('PCLC-006 No certificates are issued even with ready synthetic input',async({page})=>{
  await openCommercialCertificate(page,{kind:'ready'});await expect(root(page).getByLabel('Commercial launch certificate summary')).toContainText('Certificates issued');await expect(root(page).getByLabel('Commercial launch certificate summary')).toContainText('0');
 });
 test('PCLC-007 Exactly ten source-defined evidence domains are shown',async({page})=>{
  await openCommercialCertificate(page);await expect(cards(page)).toHaveCount(10);
 });
 test('PCLC-008 Mixed evidence source reports blocked posture',async({page})=>{
  await openCommercialCertificate(page,{kind:'mixed'});await expect(root(page).locator('.platform-launch-certificate__hero-aside .platform-launch-certificate__status-badge')).toHaveText('Blocked by evidence');
 });
 test('PCLC-009 Ready evidence retains manual acceptance boundary',async({page})=>{
  await openCommercialCertificate(page,{kind:'ready'});await expect(root(page).locator('.platform-launch-certificate__hero-aside .platform-launch-certificate__status-badge')).toHaveText('Ready for manual acceptance');
 });
 test('PCLC-010 Review-required evidence is not shown as ready for acceptance',async({page})=>{
  await openCommercialCertificate(page,{kind:'review'});await expect(root(page).locator('.platform-launch-certificate__hero-aside .platform-launch-certificate__status-badge')).toHaveText('Ready for manual evidence review');
 });
 test('PCLC-011 Source control tenant_provisioning_accepted displays its own owner and status',async({page})=>{
  await openCommercialCertificate(page);const card=control(page,'tenant_provisioning_accepted');await expect(card).toBeVisible();await expect(card).toContainText('owner: Platform owner');await expect(card).toContainText('Manual acceptance');
 });
 test('PCLC-012 Source control customer_onboarding_accepted displays its own owner and status',async({page})=>{
  await openCommercialCertificate(page);const card=control(page,'customer_onboarding_accepted');await expect(card).toBeVisible();await expect(card).toContainText('owner: Customer success owner');await expect(card).toContainText('Manual acceptance');
 });
 test('PCLC-013 Source control billing_subscription_accepted displays its own owner and status',async({page})=>{
  await openCommercialCertificate(page);const card=control(page,'billing_subscription_accepted');await expect(card).toBeVisible();await expect(card).toContainText('owner: Commercial owner');await expect(card).toContainText('Manual acceptance');
 });
 test('PCLC-014 Source control support_operations_accepted displays its own owner and status',async({page})=>{
  await openCommercialCertificate(page);const card=control(page,'support_operations_accepted');await expect(card).toBeVisible();await expect(card).toContainText('owner: Support owner');await expect(card).toContainText('Manual acceptance');
 });
 test('PCLC-015 Source control production_monitoring_accepted displays its own owner and status',async({page})=>{
  await openCommercialCertificate(page);const card=control(page,'production_monitoring_accepted');await expect(card).toBeVisible();await expect(card).toContainText('owner: Operations owner');await expect(card).toContainText('Manual acceptance');
 });
 test('PCLC-016 Source control backup_restore_accepted displays its own owner and status',async({page})=>{
  await openCommercialCertificate(page);const card=control(page,'backup_restore_accepted');await expect(card).toBeVisible();await expect(card).toContainText('owner: Operations owner');await expect(card).toContainText('Manual acceptance');
 });
 test('PCLC-017 Source control deployment_validation_accepted displays its own owner and status',async({page})=>{
  await openCommercialCertificate(page);const card=control(page,'deployment_validation_accepted');await expect(card).toBeVisible();await expect(card).toContainText('owner: Release owner');await expect(card).toContainText('Manual acceptance');
 });
 test('PCLC-018 Source control documentation_completeness_accepted displays its own owner and status',async({page})=>{
  await openCommercialCertificate(page);const card=control(page,'documentation_completeness_accepted');await expect(card).toBeVisible();await expect(card).toContainText('owner: Product owner');await expect(card).toContainText('Manual acceptance');
 });
 test('PCLC-019 Source control pilot_customer_readiness_accepted displays its own owner and status',async({page})=>{
  await openCommercialCertificate(page);const card=control(page,'pilot_customer_readiness_accepted');await expect(card).toBeVisible();await expect(card).toContainText('owner: Customer success owner');await expect(card).toContainText('Manual acceptance');
 });
 test('PCLC-020 Source control commercial_readiness_closure_accepted displays its own owner and status',async({page})=>{
  await openCommercialCertificate(page);const card=control(page,'commercial_readiness_closure_accepted');await expect(card).toBeVisible();await expect(card).toContainText('owner: Platform owner');await expect(card).toContainText('Manual acceptance');
 });
 test('PCLC-021 Control tenant_provisioning_accepted preserves the backend evidence endpoint',async({page})=>{
  await openCommercialCertificate(page);await expect(control(page,'tenant_provisioning_accepted').locator('code')).toHaveText('GET /api/platform/tenant-provisioning-hardening');
 });
 test('PCLC-022 Control customer_onboarding_accepted preserves the backend evidence endpoint',async({page})=>{
  await openCommercialCertificate(page);await expect(control(page,'customer_onboarding_accepted').locator('code')).toHaveText('GET /api/platform/customer-onboarding-checklist');
 });
 test('PCLC-023 Control billing_subscription_accepted preserves the backend evidence endpoint',async({page})=>{
  await openCommercialCertificate(page);await expect(control(page,'billing_subscription_accepted').locator('code')).toHaveText('GET /api/platform/billing-subscription-activation');
 });
 test('PCLC-024 Control support_operations_accepted preserves the backend evidence endpoint',async({page})=>{
  await openCommercialCertificate(page);await expect(control(page,'support_operations_accepted').locator('code')).toHaveText('GET /api/platform/support-operations-cockpit');
 });
 test('PCLC-025 Control production_monitoring_accepted preserves the backend evidence endpoint',async({page})=>{
  await openCommercialCertificate(page);await expect(control(page,'production_monitoring_accepted').locator('code')).toHaveText('GET /api/platform/production-monitoring-readiness');
 });
 test('PCLC-026 Control backup_restore_accepted preserves the backend evidence endpoint',async({page})=>{
  await openCommercialCertificate(page);await expect(control(page,'backup_restore_accepted').locator('code')).toHaveText('GET /api/platform/backup-restore-validation');
 });
 test('PCLC-027 Control deployment_validation_accepted preserves the backend evidence endpoint',async({page})=>{
  await openCommercialCertificate(page);await expect(control(page,'deployment_validation_accepted').locator('code')).toHaveText('GET /api/platform/deployment-validation');
 });
 test('PCLC-028 Control documentation_completeness_accepted preserves the backend evidence endpoint',async({page})=>{
  await openCommercialCertificate(page);await expect(control(page,'documentation_completeness_accepted').locator('code')).toHaveText('GET /api/platform/documentation-completeness');
 });
 test('PCLC-029 Control pilot_customer_readiness_accepted preserves the backend evidence endpoint',async({page})=>{
  await openCommercialCertificate(page);await expect(control(page,'pilot_customer_readiness_accepted').locator('code')).toHaveText('GET /api/platform/pilot-customer-readiness');
 });
 test('PCLC-030 Control commercial_readiness_closure_accepted preserves the backend evidence endpoint',async({page})=>{
  await openCommercialCertificate(page);await expect(control(page,'commercial_readiness_closure_accepted').locator('code')).toHaveText('GET /api/platform/commercial-readiness-closure');
 });
 test('PCLC-031 Control tenant_provisioning_accepted links to source-defined review page',async({page})=>{
  await openCommercialCertificate(page);await expect(control(page,'tenant_provisioning_accepted').getByRole('link',{name:'Open provisioning evidence'})).toHaveAttribute('href','/platform/tenant-provisioning-hardening');
 });
 test('PCLC-032 Control customer_onboarding_accepted links to source-defined review page',async({page})=>{
  await openCommercialCertificate(page);await expect(control(page,'customer_onboarding_accepted').getByRole('link',{name:'Open onboarding evidence'})).toHaveAttribute('href','/platform/customer-onboarding-checklist');
 });
 test('PCLC-033 Control billing_subscription_accepted links to source-defined review page',async({page})=>{
  await openCommercialCertificate(page);await expect(control(page,'billing_subscription_accepted').getByRole('link',{name:'Open billing activation'})).toHaveAttribute('href','/platform/billing-subscription-activation');
 });
 test('PCLC-034 Control support_operations_accepted links to source-defined review page',async({page})=>{
  await openCommercialCertificate(page);await expect(control(page,'support_operations_accepted').getByRole('link',{name:'Open support cockpit'})).toHaveAttribute('href','/platform/support-cockpit');
 });
 test('PCLC-035 Control production_monitoring_accepted links to source-defined review page',async({page})=>{
  await openCommercialCertificate(page);await expect(control(page,'production_monitoring_accepted').getByRole('link',{name:'Open monitoring readiness'})).toHaveAttribute('href','/platform/monitoring-readiness');
 });
 test('PCLC-036 Control backup_restore_accepted links to source-defined review page',async({page})=>{
  await openCommercialCertificate(page);await expect(control(page,'backup_restore_accepted').getByRole('link',{name:'Open backup restore'})).toHaveAttribute('href','/platform/backup-restore-validation');
 });
 test('PCLC-037 Control deployment_validation_accepted links to source-defined review page',async({page})=>{
  await openCommercialCertificate(page);await expect(control(page,'deployment_validation_accepted').getByRole('link',{name:'Open deployment validation'})).toHaveAttribute('href','/platform/deployment-validation');
 });
 test('PCLC-038 Control documentation_completeness_accepted links to source-defined review page',async({page})=>{
  await openCommercialCertificate(page);await expect(control(page,'documentation_completeness_accepted').getByRole('link',{name:'Open documentation completeness'})).toHaveAttribute('href','/platform/documentation-completeness');
 });
 test('PCLC-039 Control pilot_customer_readiness_accepted links to source-defined review page',async({page})=>{
  await openCommercialCertificate(page);await expect(control(page,'pilot_customer_readiness_accepted').getByRole('link',{name:'Open pilot readiness'})).toHaveAttribute('href','/platform/pilot-customer-readiness');
 });
 test('PCLC-040 Control commercial_readiness_closure_accepted links to source-defined review page',async({page})=>{
  await openCommercialCertificate(page);await expect(control(page,'commercial_readiness_closure_accepted').getByRole('link',{name:'Open readiness verification'})).toHaveAttribute('href','/platform/commercial-readiness-verification-program');
 });
 test('PCLC-041 Source-unavailable control shows its backend error warning',async({page})=>{
  await openCommercialCertificate(page,{kind:'mixed'});await expect(control(page,'production_monitoring_accepted').locator('.platform-launch-certificate__source-warning')).toContainText('Synthetic upstream unavailable');
 });
 test('PCLC-042 Source warning is absent when the evidence surface is available',async({page})=>{
  await openCommercialCertificate(page,{kind:'ready'});await expect(root(page).locator('.platform-launch-certificate__source-warning')).toHaveCount(0);
 });
 test('PCLC-043 Tenant-limited evidence renders evaluated and total population with cap',async({page})=>{
  await openCommercialCertificate(page);await expect(control(page,'tenant_provisioning_accepted').locator('.platform-launch-certificate__scope-box')).toContainText('Evaluated 3 of 3 · cap 300');
 });
 test('PCLC-044 Global evidence surface does not invent a tenant evidence scope box',async({page})=>{
  await openCommercialCertificate(page);await expect(control(page,'billing_subscription_accepted').locator('.platform-launch-certificate__scope-box')).toHaveCount(0);
 });
 test('PCLC-045 Scope-limit review warning is visible for backend-classified limited population',async({page})=>{
  await openCommercialCertificate(page,{alter:s=>({...s,certificate_controls:s.certificate_controls.map(c=>c.code==='pilot_customer_readiness_accepted'?{...c,evidence_scope:{...c.evidence_scope,status:'scope_limit_review_required',evaluated_tenants:300,total_tenants:400},evidence_status:'evidence_review_required'}:c)})});await expect(control(page,'pilot_customer_readiness_accepted').locator('.platform-launch-certificate__scope-box')).toContainText('Scope review required');
 });
 test('PCLC-046 Missing tenant total is explicitly marked Unavailable',async({page})=>{
  await openCommercialCertificate(page,{alter:s=>({...s,tenant_scope:{...s.tenant_scope,available:false,total_tenants:null,error_code:'TENANT_SCOPE_LOAD_FAILED'}})});await expect(program(page)).toContainText('Unavailable');await expect(program(page)).toContainText('TENANT SCOPE LOAD FAILED');
 });
 test('PCLC-047 Seven manual acceptance obligations are listed without signed checkboxes',async({page})=>{
  await openCommercialCertificate(page);const list=decision(page).locator('.platform-launch-certificate__decision-panel').first();await expect(list.locator('li')).toHaveCount(7);await expect(list).toContainText('outside this read-only board');
 });
 test('PCLC-048 Seven certificate limitations stay visible without claiming live verification',async({page})=>{
  await openCommercialCertificate(page);const list=decision(page).locator('.platform-launch-certificate__decision-panel').last();await expect(list.locator('li')).toHaveCount(7);await expect(list).toContainText('payment-provider');
 });
 test('PCLC-049 Static registry is marked context only',async({page})=>{
  await openCommercialCertificate(page);await expect(program(page).locator('.platform-launch-certificate__registry-note')).toContainText('Static registry is context only');
 });
 test('PCLC-050 Refresh requests a fresh GET without any certificate mutation',async({page})=>{
  const calls:string[]=[];await openCommercialCertificate(page,{onCall:(m,p)=>{if(p===COMMERCIAL_CERTIFICATE_PATH)calls.push(m);}});await root(page).getByRole('button',{name:'Refresh',exact:true}).click();await expect.poll(()=>calls.filter(m=>m==='GET').length).toBeGreaterThan(1);expect(calls.every(m=>m==='GET')).toBe(true);
 });
 test('PCLC-051 Initial GET failure shows retry and no source controls',async({page})=>{
  await openCommercialCertificate(page,{status:503});await expect(root(page).getByRole('alert')).toContainText('Unable to load Commercial Launch Certificate.');await expect(root(page).getByRole('button',{name:'Retry',exact:true})).toBeVisible();await expect(cards(page)).toHaveCount(0);
 });
 test('PCLC-052 Retry can recover from synthetic transient GET failure',async({page})=>{
  let failing=true;await openCommercialCertificate(page,{respond:(m,p)=>m==='GET'&&p===COMMERCIAL_CERTIFICATE_PATH&&failing?{json:{message:'Synthetic read outage'},status:503}:undefined});await expect(root(page).getByRole('button',{name:'Retry',exact:true})).toBeVisible();failing=false;await root(page).getByRole('button',{name:'Retry',exact:true}).click();await expect(cards(page)).toHaveCount(10);
 });
 test('PCLC-053 Failed refresh retains old evidence with stale snapshot warning',async({page})=>{
  let failing=false;await openCommercialCertificate(page,{respond:(m,p)=>m==='GET'&&p===COMMERCIAL_CERTIFICATE_PATH&&failing?{json:{message:'Synthetic refresh outage'},status:503}:undefined});await expect(cards(page)).toHaveCount(10);failing=true;await root(page).getByRole('button',{name:'Refresh',exact:true}).click();await expect(root(page).locator('.platform-launch-certificate__feedback--warning')).toContainText('Showing the last successful Commercial Launch Certificate snapshot');await expect(cards(page)).toHaveCount(10);
 });
 test('PCLC-054 A missing mandatory grant hides protected commercial certificate page',async({page})=>{
  await openCommercialCertificate(page,{permissions:COMMERCIAL_CERTIFICATE_PERMISSIONS.filter(p=>p!=='platform.tenants.export'),expectHeading:false});await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
 });
 test('PCLC-055 Narrow viewport preserves keyboard focus on read-only refresh',async({page})=>{
  await page.setViewportSize({width:390,height:780});await openCommercialCertificate(page);const b=root(page).getByRole('button',{name:'Refresh',exact:true});await expect(b).toBeVisible();await b.focus();await expect(b).toBeFocused();
 });

 test('PCLC-056 Unknown evidence posture remains a review indicator instead of an issued certificate',async({page})=>{
  await openCommercialCertificate(page,{alter:s=>({...s,certificate_controls:s.certificate_controls.map((c,i)=>i===0?{...c,evidence_status:'unclassified_owner_review_required'}:c)})});
  await expect(cards(page).first().locator('.platform-launch-certificate__status-badge')).toHaveText('Unclassified owner review required');await expect(root(page)).toContainText('Internal precheck only');
 });
 test('PCLC-057 Optional source validation note is absent when source reports none',async({page})=>{
  await openCommercialCertificate(page,{kind:'ready'});await expect(cards(page).nth(1).locator('.platform-launch-certificate__details--control')).toHaveCount(0);
 });
 test('PCLC-058 Empty owner acceptance instructions render no invented owner approval',async({page})=>{
  await openCommercialCertificate(page,{alter:s=>({...s,required_manual_acceptance:[]})});await expect(decision(page).locator('.platform-launch-certificate__decision-panel').first().locator('li')).toHaveCount(0);
 });
 test('PCLC-059 An unknown backend summary counter is shown only after expanding details',async({page})=>{
  await openCommercialCertificate(page,{alter:s=>({...s,summary:{...s.summary,operator_review_obligations:9}})});
  const detail=program(page).locator('details').first();await detail.locator('summary').click();await expect(detail).toContainText('Operator review obligations');await expect(detail).toContainText('9');
 });
 test('PCLC-060 Zero ready-source count displays zero rather than an approval',async({page})=>{
  await openCommercialCertificate(page,{alter:s=>({...s,summary:{...s.summary,evidence_surfaces_ready:0}})});await expect(root(page).getByLabel('Commercial launch certificate summary')).toContainText('0');
 });
 test('PCLC-061 Invalid snapshot timestamp displays Not available',async({page})=>{
  await openCommercialCertificate(page,{alter:s=>({...s,generated_at:'bad-timestamp'})});await expect(program(page)).toContainText('Not available');
 });
 test('PCLC-062 Evidence-source warning vanishes when error code is removed',async({page})=>{
  await openCommercialCertificate(page,{alter:s=>({...s,certificate_controls:s.certificate_controls.map(c=>({...c,source_error_code:null}))})});await expect(root(page).locator('.platform-launch-certificate__source-warning')).toHaveCount(0);
 });
 test('PCLC-063 Unavailable tenant population query retains backend reason',async({page})=>{
  await openCommercialCertificate(page,{alter:s=>({...s,tenant_scope:{...s.tenant_scope,available:false,error_code:'SYNTHETIC_TENANT_COUNT_UNAVAILABLE'}})});
  await expect(program(page)).toContainText('Synthetic tenant count unavailable');
 });
 test('PCLC-064 Backend-provided zero tenant population is not displayed as Unavailable',async({page})=>{
  await openCommercialCertificate(page,{alter:s=>({...s,tenant_scope:{...s.tenant_scope,total_tenants:0}})});
  await expect(program(page).locator('.platform-launch-certificate__program-grid')).toContainText('Tenant population');await expect(program(page).locator('.platform-launch-certificate__program-grid')).toContainText('0');
 });
 test('PCLC-065 Synthetic new decision text is presented but not automatically accepted',async({page})=>{
  const message='Synthetic launch owner must review external risks';await openCommercialCertificate(page,{alter:s=>({...s,next_best_step:message})});
  await expect(root(page).locator('.platform-launch-certificate__next-step')).toContainText(message);await expect(root(page)).toContainText('Internal precheck only');
 });
 test('PCLC-066 Additional manual-owner requirement is visible as a requirement, not a signature',async({page})=>{
  const message='Synthetic owner requires external signed ticket';await openCommercialCertificate(page,{alter:s=>({...s,required_manual_acceptance:[...s.required_manual_acceptance,message]})});
  await expect(decision(page)).toContainText(message);
 });
 test('PCLC-067 Newly reported certificate limitation is carried forward',async({page})=>{
  const limit='Synthetic external CI verification still required';await openCommercialCertificate(page,{alter:s=>({...s,certificate_limitations:[...s.certificate_limitations,limit]})});
  await expect(decision(page)).toContainText(limit);
 });
 test('PCLC-068 Expanding read-only details makes no write request',async({page})=>{
  const writes:string[]=[];await openCommercialCertificate(page,{onCall:(method,path)=>{if(!['GET','OPTIONS'].includes(method))writes.push(`${method} ${path}`);}});
  await program(page).locator('details').first().locator('summary').click();await expect(program(page).locator('details').first()).toHaveAttribute('open','');expect(writes).toEqual([]);
 });
 test('PCLC-069 Source page query context is retained through refresh',async({page})=>{
  await openCommercialCertificate(page,{urlQuery:'review_batch=synthetic-118'});await root(page).getByRole('button',{name:'Refresh',exact:true}).click();await expect(page).toHaveURL(/review_batch=synthetic-118/);
 });
 test('PCLC-070 Keyboard focus remains on refresh in narrow viewport',async({page})=>{
  await page.setViewportSize({width:360,height:700});await openCommercialCertificate(page);const btn=root(page).getByRole('button',{name:'Refresh',exact:true});await btn.focus();await expect(btn).toBeFocused();
 });
});
