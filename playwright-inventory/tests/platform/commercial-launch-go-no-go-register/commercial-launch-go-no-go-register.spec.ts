/** Batch 119 — Step 219 platform decision register. Mocked GET only. No approvals or live launch. */
import {test,expect,type Page} from '@playwright/test';
import {openRegister,REGISTER_PATH,REGISTER_PERMISSIONS,REQUIRED_DECISION_FIELDS,CONDITIONAL_GO_FIELDS,NO_GO_FIELDS,ALLOWED_DECISIONS} from '../../../support/platformCommercialLaunchGoNoGoRegisterFixture';
const root=(p:Page)=>p.locator('.platform-launch-go-no-go');
const rows=(p:Page)=>root(p).locator('.platform-launch-go-no-go__row-card');
const context=(p:Page)=>root(p).locator('.platform-launch-go-no-go__context-panel');
const rowByCode=(p:Page,code:string)=>rows(p).filter({has:p.getByRole('heading',{name:code.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase()),exact:true})});
test.describe('Platform Commercial Launch Go/No-Go Register — Step 219 source-grounded review-only UI',()=>{
 test('PGNG-001 Original platform route displays register title',async({page})=>{
  await openRegister(page);await expect(page.getByRole('heading',{name:'Commercial Launch Go/No-Go Register',exact:true})).toBeVisible();
 });
 test('PGNG-002 Boundary explicitly disclaims app-stored decision or launch',async({page})=>{
  await openRegister(page);await expect(root(page).locator('.platform-launch-go-no-go__boundary-notice')).toContainText('cannot approve launch');
 });
 test('PGNG-003 Hero requires external decision records',async({page})=>{
  await openRegister(page);await expect(root(page)).toContainText('External decision records required');
 });
 test('PGNG-004 Step 219 identity follows backend response',async({page})=>{
  await openRegister(page);await expect(context(page)).toContainText('Step 219 — Commercial Launch Go/No-Go Register');
 });
 test('PGNG-005 Six source-defined summary counters are displayed',async({page})=>{
  await openRegister(page);await expect(root(page).getByLabel('Commercial launch go/no-go summary').locator('.io-workspace-stat')).toHaveCount(6);
 });
 test('PGNG-006 Ten owner decisions mirror ten current acceptance packets',async({page})=>{
  await openRegister(page);await expect(rows(page)).toHaveCount(10);
 });
 test('PGNG-007 Decision template is not recorded for every row',async({page})=>{
  await openRegister(page,{kind:'ready'});await expect(root(page).locator('.platform-launch-go-no-go__decision-state .platform-launch-go-no-go__status-badge')).toHaveCount(10);await expect(root(page).locator('.platform-launch-go-no-go__decision-state .platform-launch-go-no-go__status-badge')).toHaveText(Array(10).fill('Not recorded'));
 });
 test('PGNG-008 Ready evidence means external decision is needed not performed',async({page})=>{
  await openRegister(page,{kind:'ready'});await expect(root(page).locator('.platform-launch-go-no-go__hero-aside .platform-launch-go-no-go__status-badge')).toContainText('ready for manual decisions');await expect(context(page)).toContainText('not stored or observable here');
 });
 test('PGNG-009 Review-required evidence does not default to go',async({page})=>{
  await openRegister(page,{kind:'review'});await expect(root(page).locator('.platform-launch-go-no-go__hero-aside .platform-launch-go-no-go__status-badge')).toContainText('evidence review required');await expect(rows(page).first().locator('.platform-launch-go-no-go__decision-state')).toContainText('Not recorded');
 });
 test('PGNG-010 Blocked source evidence keeps overall register blocked',async({page})=>{
  await openRegister(page,{kind:'mixed'});await expect(root(page).locator('.platform-launch-go-no-go__hero-aside .platform-launch-go-no-go__status-badge')).toContainText('blocked');
 });
 test('PGNG-011 tenant_provisioning_accepted keeps accountable decision owner',async({page})=>{
  await openRegister(page);await expect(rowByCode(page,'tenant_provisioning_accepted')).toContainText('owner: Platform owner');await expect(rowByCode(page,'tenant_provisioning_accepted')).toContainText('Current acceptance packet');
 });
 test('PGNG-012 customer_onboarding_accepted keeps accountable decision owner',async({page})=>{
  await openRegister(page);await expect(rowByCode(page,'customer_onboarding_accepted')).toContainText('owner: Customer success owner');await expect(rowByCode(page,'customer_onboarding_accepted')).toContainText('Current acceptance packet');
 });
 test('PGNG-013 billing_subscription_accepted keeps accountable decision owner',async({page})=>{
  await openRegister(page);await expect(rowByCode(page,'billing_subscription_accepted')).toContainText('owner: Commercial owner');await expect(rowByCode(page,'billing_subscription_accepted')).toContainText('Current acceptance packet');
 });
 test('PGNG-014 support_operations_accepted keeps accountable decision owner',async({page})=>{
  await openRegister(page);await expect(rowByCode(page,'support_operations_accepted')).toContainText('owner: Support owner');await expect(rowByCode(page,'support_operations_accepted')).toContainText('Current acceptance packet');
 });
 test('PGNG-015 production_monitoring_accepted keeps accountable decision owner',async({page})=>{
  await openRegister(page);await expect(rowByCode(page,'production_monitoring_accepted')).toContainText('owner: Operations owner');await expect(rowByCode(page,'production_monitoring_accepted')).toContainText('Current acceptance packet');
 });
 test('PGNG-016 backup_restore_accepted keeps accountable decision owner',async({page})=>{
  await openRegister(page);await expect(rowByCode(page,'backup_restore_accepted')).toContainText('owner: Operations owner');await expect(rowByCode(page,'backup_restore_accepted')).toContainText('Current acceptance packet');
 });
 test('PGNG-017 deployment_validation_accepted keeps accountable decision owner',async({page})=>{
  await openRegister(page);await expect(rowByCode(page,'deployment_validation_accepted')).toContainText('owner: Release owner');await expect(rowByCode(page,'deployment_validation_accepted')).toContainText('Current acceptance packet');
 });
 test('PGNG-018 documentation_completeness_accepted keeps accountable decision owner',async({page})=>{
  await openRegister(page);await expect(rowByCode(page,'documentation_completeness_accepted')).toContainText('owner: Product owner');await expect(rowByCode(page,'documentation_completeness_accepted')).toContainText('Current acceptance packet');
 });
 test('PGNG-019 pilot_customer_readiness_accepted keeps accountable decision owner',async({page})=>{
  await openRegister(page);await expect(rowByCode(page,'pilot_customer_readiness_accepted')).toContainText('owner: Customer success owner');await expect(rowByCode(page,'pilot_customer_readiness_accepted')).toContainText('Current acceptance packet');
 });
 test('PGNG-020 commercial_readiness_closure_accepted keeps accountable decision owner',async({page})=>{
  await openRegister(page);await expect(rowByCode(page,'commercial_readiness_closure_accepted')).toContainText('owner: Platform owner');await expect(rowByCode(page,'commercial_readiness_closure_accepted')).toContainText('Current acceptance packet');
 });
 test('PGNG-021 tenant_provisioning_accepted retains source review navigation',async({page})=>{
  await openRegister(page);await expect(rowByCode(page,'tenant_provisioning_accepted').getByRole('link',{name:'Open provisioning evidence'})).toHaveAttribute('href','/platform/tenant-provisioning-hardening');
 });
 test('PGNG-022 customer_onboarding_accepted retains source review navigation',async({page})=>{
  await openRegister(page);await expect(rowByCode(page,'customer_onboarding_accepted').getByRole('link',{name:'Open onboarding evidence'})).toHaveAttribute('href','/platform/customer-onboarding-checklist');
 });
 test('PGNG-023 billing_subscription_accepted retains source review navigation',async({page})=>{
  await openRegister(page);await expect(rowByCode(page,'billing_subscription_accepted').getByRole('link',{name:'Open billing activation'})).toHaveAttribute('href','/platform/billing-subscription-activation');
 });
 test('PGNG-024 support_operations_accepted retains source review navigation',async({page})=>{
  await openRegister(page);await expect(rowByCode(page,'support_operations_accepted').getByRole('link',{name:'Open support cockpit'})).toHaveAttribute('href','/platform/support-cockpit');
 });
 test('PGNG-025 production_monitoring_accepted retains source review navigation',async({page})=>{
  await openRegister(page);await expect(rowByCode(page,'production_monitoring_accepted').getByRole('link',{name:'Open monitoring readiness'})).toHaveAttribute('href','/platform/monitoring-readiness');
 });
 test('PGNG-026 backup_restore_accepted retains source review navigation',async({page})=>{
  await openRegister(page);await expect(rowByCode(page,'backup_restore_accepted').getByRole('link',{name:'Open backup restore'})).toHaveAttribute('href','/platform/backup-restore-validation');
 });
 test('PGNG-027 deployment_validation_accepted retains source review navigation',async({page})=>{
  await openRegister(page);await expect(rowByCode(page,'deployment_validation_accepted').getByRole('link',{name:'Open deployment validation'})).toHaveAttribute('href','/platform/deployment-validation');
 });
 test('PGNG-028 documentation_completeness_accepted retains source review navigation',async({page})=>{
  await openRegister(page);await expect(rowByCode(page,'documentation_completeness_accepted').getByRole('link',{name:'Open documentation completeness'})).toHaveAttribute('href','/platform/documentation-completeness');
 });
 test('PGNG-029 pilot_customer_readiness_accepted retains source review navigation',async({page})=>{
  await openRegister(page);await expect(rowByCode(page,'pilot_customer_readiness_accepted').getByRole('link',{name:'Open pilot readiness'})).toHaveAttribute('href','/platform/pilot-customer-readiness');
 });
 test('PGNG-030 commercial_readiness_closure_accepted retains source review navigation',async({page})=>{
  await openRegister(page);await expect(rowByCode(page,'commercial_readiness_closure_accepted').getByRole('link',{name:'Open readiness verification'})).toHaveAttribute('href','/platform/commercial-readiness-verification-program');
 });
 test('PGNG-031 Each template lists go no-go and conditional-go choices',async({page})=>{
  await openRegister(page);const group=rows(page).first().locator('.platform-launch-go-no-go__field-groups > div').nth(0);await expect(group.locator('span')).toContainText(['Go','No go','Conditional go']);expect(ALLOWED_DECISIONS).toHaveLength(3);
 });
 test('PGNG-032 Decision template displays eight externally required base fields',async({page})=>{
  await openRegister(page);await expect(rows(page).first().locator('.platform-launch-go-no-go__field-groups > div').nth(1).locator('span')).toHaveCount(REQUIRED_DECISION_FIELDS.length);
 });
 test('PGNG-033 Conditional go requires additional expiry and fallback controls',async({page})=>{
  await openRegister(page);const g=rows(page).first().locator('.platform-launch-go-no-go__field-groups > div').nth(2);await expect(g.locator('span')).toHaveCount(CONDITIONAL_GO_FIELDS.length);await expect(g).toContainText('Condition expiry at');await expect(g).toContainText('Fallback plan reference');
 });
 test('PGNG-034 No-go requires blocking reason remediation and next review',async({page})=>{
  await openRegister(page);const g=rows(page).first().locator('.platform-launch-go-no-go__field-groups > div').nth(3);await expect(g.locator('span')).toHaveCount(NO_GO_FIELDS.length);await expect(g).toContainText('Blocking reason');await expect(g).toContainText('Next review at');
 });
 test('PGNG-035 No sign approve or production execution buttons exist',async({page})=>{
  await openRegister(page);await expect(root(page).getByRole('button',{name:/^(Approve|Record decision|Execute launch|Deploy|Go live)$/})).toHaveCount(0);
 });
 test('PGNG-036 Decision artifact and acceptance artifact both remain external',async({page})=>{
  await openRegister(page);const g=rows(page).first().locator('.platform-launch-go-no-go__artifact-grid');await expect(g).toContainText('External acceptance artifact');await expect(g).toContainText('External go/no-go decision artifact');await expect(g).toContainText('External not persisted by application');
 });
 test('PGNG-037 Source availability is indicated per row',async({page})=>{
  await openRegister(page,{alter:s=>({...s,go_no_go_register:s.go_no_go_register.map((x,i)=>i===0?{...x,source_available:false}:x)})});await expect(rows(page).first().locator('.platform-launch-go-no-go__status-grid')).toContainText('Unavailable');
 });
 test('PGNG-038 Source error and validation note retain original context',async({page})=>{
  await openRegister(page,{alter:s=>({...s,go_no_go_register:s.go_no_go_register.map((x,i)=>i===0?{...x,source_error_code:'SYNTHETIC_SOURCE_NOT_READY',source_validation_note:'Synthetic operator check needed'}:x)})});await expect(rows(page).first().locator('.platform-launch-go-no-go__source-error')).toContainText('SYNTHETIC_SOURCE_NOT_READY');await expect(rows(page).first().locator('.platform-launch-go-no-go__source-note')).toContainText('Synthetic operator check needed');
 });
 test('PGNG-039 Missing source summary shows explicit message not invented evidence',async({page})=>{
  await openRegister(page,{alter:s=>({...s,go_no_go_register:s.go_no_go_register.map((x,i)=>i===0?{...x,source_summary:{}}:x)})});await expect(rows(page).first()).toContainText('No current source summary was returned');
 });
 test('PGNG-040 Absent scope does not fabricate evaluated tenant count',async({page})=>{
  await openRegister(page,{alter:s=>({...s,go_no_go_register:s.go_no_go_register.map((x,i)=>i===0?{...x,evidence_scope:null}:x)})});await expect(rows(page).first().locator('.platform-launch-go-no-go__status-grid')).toContainText('Not scope-limited');
 });
 test('PGNG-041 Tenant scope count and review cap show source values',async({page})=>{
  await openRegister(page);await expect(context(page)).toContainText('Tenant review cap');await expect(context(page)).toContainText('Tenant evidence population');
 });
 test('PGNG-042 Static registry gate is labelled context only',async({page})=>{
  await openRegister(page);await expect(context(page)).toContainText('Context only — current acceptance evidence controls decision readiness.');await expect(rows(page).first()).toContainText('Context only');
 });
 test('PGNG-043 Two independent external persistence boundaries are disclosed',async({page})=>{
  await openRegister(page);await expect(context(page)).toContainText('Final go/no-go decisions are not stored or observable here');await expect(context(page)).toContainText('Launch Acceptance signoffs are external too');
 });
 test('PGNG-044 Launch Certificate posture is a visible independent signal',async({page})=>{
  await openRegister(page);await expect(context(page)).toContainText('Launch Certificate posture');
 });
 test('PGNG-045 Omitting optional acceptance summary hides detail control',async({page})=>{
  await openRegister(page,{alter:s=>({...s,acceptance_summary:{}})});await expect(context(page).getByText('Launch Acceptance summary carried into this register')).toHaveCount(0);
 });
 test('PGNG-046 Empty decision-row array shows explicit empty state',async({page})=>{
  await openRegister(page,{alter:s=>({...s,go_no_go_register:[]})});await expect(root(page).locator('.platform-launch-go-no-go__empty-state')).toContainText('No go/no-go decision rows are available.');await expect(rows(page)).toHaveCount(0);
 });
 test('PGNG-047 Eight decision requirements remain explanatory text only',async({page})=>{
  await openRegister(page);await expect(root(page).locator('.platform-launch-go-no-go__two-column .platform-launch-go-no-go__list').first().locator('li')).toHaveCount(8);
 });
 test('PGNG-048 Inherited launch limitation remains visible for manual review',async({page})=>{
  const note='Synthetic manual rollback signoff pending';await openRegister(page,{alter:s=>({...s,launch_limitations:[...s.launch_limitations,note]})});await expect(root(page).locator('.platform-launch-go-no-go__two-column')).toContainText(note);
 });
 test('PGNG-049 Next best step remains advisory without mutation',async({page})=>{
  const note='Synthetic external owner decision is pending';await openRegister(page,{alter:s=>({...s,next_best_step:note})});await expect(root(page).locator('.platform-launch-go-no-go__next-step')).toContainText(note);
 });
 test('PGNG-050 Initial endpoint failure shows retry instead of rows',async({page})=>{
  await openRegister(page,{status:503});await expect(root(page).getByRole('alert')).toContainText('Unable to load Commercial Launch Go/No-Go Register.');await expect(root(page).getByRole('button',{name:'Retry',exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PGNG-051 Retry after transient GET failure restores ten rows',async({page})=>{
  let fail=true;await openRegister(page,{respond:(method,path)=>method==='GET'&&path===REGISTER_PATH&&fail?{json:{message:'Synthetic upstream outage'},status:503}:undefined});await expect(root(page).getByRole('button',{name:'Retry',exact:true})).toBeVisible();fail=false;await root(page).getByRole('button',{name:'Retry',exact:true}).click();await expect(rows(page)).toHaveCount(10);
 });
 test('PGNG-052 Refresh error retains last successful decision snapshot',async({page})=>{
  let fail=false;await openRegister(page,{respond:(method,path)=>method==='GET'&&path===REGISTER_PATH&&fail?{json:{message:'Synthetic refresh failed'},status:503}:undefined});await expect(rows(page)).toHaveCount(10);fail=true;await root(page).getByRole('button',{name:'Refresh',exact:true}).click();await expect(root(page).locator('.platform-launch-go-no-go__feedback--warning')).toContainText('Showing the last successful Commercial Launch Go/No-Go Register snapshot');await expect(rows(page)).toHaveCount(10);
 });
 test('PGNG-053 Refresh and read-only drilldowns do not send decision mutations',async({page})=>{
  const calls:string[]=[];await openRegister(page,{onCall:(method,path)=>{if(!['GET','OPTIONS'].includes(method))calls.push(`${method} ${path}`);}});await root(page).getByRole('button',{name:'Refresh',exact:true}).click();await context(page).getByText('Full register summary').click();await expect(context(page).locator('details').last()).toHaveAttribute('open','');expect(calls).toEqual([]);
 });
 test('PGNG-054 Missing mandatory platform permission cannot enter register',async({page})=>{
  await openRegister(page,{permissions:REGISTER_PERMISSIONS.filter(x=>x!=='platform.tenants.export'),expectHeading:false});await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
 });
 test('PGNG-055 Refresh button retains focus at mobile width',async({page})=>{
  await page.setViewportSize({width:390,height:780});await openRegister(page);const button=root(page).getByRole('button',{name:'Refresh',exact:true});await button.focus();await expect(button).toBeFocused();
 });
 test('PGNG-056 Invalid source refresh time is not shown as valid',async({page})=>{
  await openRegister(page,{alter:s=>({...s,generated_at:"invalid-synthetic-date"})});await expect(root(page).locator('.platform-launch-go-no-go__refresh-block')).toContainText("Last refreshed: Not available");
 });
 test('PGNG-057 Absent acceptance persistence hides external signoff detail',async({page})=>{
  await openRegister(page,{alter:s=>({...s,acceptance_persistence:null})});await expect(context(page).getByText('Launch Acceptance signoffs are external too')).toHaveCount(0);
 });
 test('PGNG-058 Source-provided decision note does not create an approval',async({page})=>{
  const note='Synthetic external signature still required';await openRegister(page,{alter:s=>({...s,decision_persistence:{...s.decision_persistence,interpretation:note}})});await expect(context(page).locator('.platform-launch-go-no-go__persistence-note').first()).toContainText(note);await expect(root(page).getByRole('button',{name:/approve launch/i})).toHaveCount(0);
 });
 test('PGNG-059 Decision requirements reflect current source length',async({page})=>{
  await openRegister(page,{alter:s=>({...s,decision_requirements:["Synthetic first requirement","Synthetic second requirement"]})});const area=root(page).locator(".platform-launch-go-no-go__two-column .platform-launch-go-no-go__list").first();await expect(area.locator("li")).toHaveCount(2);await expect(area).toContainText("Synthetic second requirement");
 });
 test('PGNG-060 Source-provided upstream acceptance counts remain reviewable',async({page})=>{
  await openRegister(page,{alter:s=>({...s,acceptance_summary:{synthetic_review_count:3,synthetic_acceptance_flag:false}})});const details=context(page).locator('details').filter({hasText:'Launch Acceptance summary carried into this register'});await details.locator('summary').click();await expect(details).toContainText('Synthetic review count');await expect(details).toContainText('3');await expect(details).toContainText('No');
 });
 test('PGNG-061 Empty externally allowed choices render no fabricated choices',async({page})=>{
  await openRegister(page,{alter:s=>({...s,go_no_go_register:s.go_no_go_register.map((r,i)=>i===0?{...r,allowed_decisions:[]}:r)})});await expect(rows(page).first().locator(".platform-launch-go-no-go__field-groups > div").first().locator("span")).toHaveCount(0);
 });
 test('PGNG-062 No acceptance statement does not invent signoff text',async({page})=>{
  await openRegister(page,{alter:s=>({...s,go_no_go_register:s.go_no_go_register.map((r,i)=>i===0?{...r,acceptance_statement:null}:r)})});await expect(rows(page).first().locator(".platform-launch-go-no-go__artifact-grid p")).toHaveCount(0);
 });
 test('PGNG-063 Boolean evidence summary is human readable',async({page})=>{
  await openRegister(page,{alter:s=>({...s,go_no_go_register:s.go_no_go_register.map((r,i)=>i===0?{...r,source_summary:{synthetic_verified:false,synthetic_flag:true}}:r)})});const box=rows(page).first().locator(".platform-launch-go-no-go__source-summary");await expect(box).toContainText("Synthetic verified");await expect(box).toContainText("No");await expect(box).toContainText("Yes");
 });
 test('PGNG-064 Structured evidence remains structured source display',async({page})=>{
  await openRegister(page,{alter:s=>({...s,go_no_go_register:s.go_no_go_register.map((r,i)=>i===0?{...r,source_summary:{synthetic_counts:{observed:2},synthetic_total:4}}:r)})});const box=rows(page).first().locator(".platform-launch-go-no-go__source-summary");await expect(box).toContainText("{\"observed\":2}");await expect(box).toContainText("4");
 });
 test('PGNG-065 Missing validation note produces no invented warning',async({page})=>{
  await openRegister(page,{alter:s=>({...s,go_no_go_register:s.go_no_go_register.map((r,i)=>i===0?{...r,source_validation_note:null}:r)})});await expect(rows(page).first().locator(".platform-launch-go-no-go__source-note")).toHaveCount(0);
 });
 test('PGNG-066 Evidence source error does not create approval action',async({page})=>{
  await openRegister(page,{alter:s=>({...s,go_no_go_register:s.go_no_go_register.map((r,i)=>i===0?{...r,source_error_code:"SYNTHETIC_SOURCE_UNAVAILABLE"}:r)})});await expect(rows(page).first().locator(".platform-launch-go-no-go__source-error")).toContainText("SYNTHETIC_SOURCE_UNAVAILABLE");await expect(rows(page).first().getByRole("button",{name:/approve|sign/i})).toHaveCount(0);
 });
 test('PGNG-067 Smoke-test shortcut absent without additional session grant',async({page})=>{
  await openRegister(page);await expect(root(page).locator(".platform-launch-go-no-go__supporting-pages").getByRole("link",{name:"Launch smoke test"})).toHaveCount(0);
 });
 test('PGNG-068 Smoke-test shortcut appears with additional session grant',async({page})=>{
  await openRegister(page,{permissions:[...REGISTER_PERMISSIONS,"platform.sessions.read"]});await expect(root(page).locator(".platform-launch-go-no-go__supporting-pages").getByRole("link",{name:"Launch smoke test"})).toHaveAttribute("href","/platform/commercial-launch-smoke-test-checklist");
 });
 test('PGNG-069 URL query is not propagated into forbidden endpoint query',async({page})=>{
  const getQueries:string[]=[];await openRegister(page,{urlQuery:"synthetic_navigation_only=1",onCall:(method,path,q)=>{if(method==="GET"&&path===REGISTER_PATH)getQueries.push(q.toString());}});expect(getQueries).toEqual([""]);
 });
 test('PGNG-070 Blocked register has visual danger status but no launch execution',async({page})=>{
  await openRegister(page,{kind:"mixed"});await expect(root(page).locator(".platform-launch-go-no-go__hero-aside .platform-launch-go-no-go__status-badge")).toHaveAttribute("data-tone","danger");await expect(root(page).getByRole("button",{name:/deploy|execute launch|launch now/i})).toHaveCount(0);
 });
});
