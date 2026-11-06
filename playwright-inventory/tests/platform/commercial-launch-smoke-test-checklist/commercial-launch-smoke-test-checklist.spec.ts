/** Batch 120 — read-only Step 220, mock data tests do not execute smoke or approve launch. */
import {test,expect,type Page} from '@playwright/test';
import {openSmokeChecklist,SMOKE_PATH,SMOKE_PERMISSIONS,REQUIRED_RESULT_FIELDS,ALLOWED_RESULTS,SOURCE_SMOKE_CHECKS} from '../../../support/platformCommercialLaunchSmokeTestChecklistFixture';
const root=(p:Page)=>p.locator('.platform-launch-smoke-test');
const rows=(p:Page)=>root(p).locator('.platform-launch-smoke-test__row-card');
const context=(p:Page)=>root(p).locator('.platform-launch-smoke-test__context-panel');
test.describe('Commercial Launch Smoke Test Checklist — Step 220 source-based preparation UI',()=>{
 test('PSMK-001 Original route shows the smoke test checklist heading',async({page})=>{
  await openSmokeChecklist(page);await expect(page.getByRole("heading",{name:"Commercial Launch Smoke Test Checklist",exact:true})).toBeVisible();
 });
 test('PSMK-002 Preparation boundary disclaims executed test results',async({page})=>{
  await openSmokeChecklist(page);await expect(root(page).locator(".platform-launch-smoke-test__boundary-notice")).toContainText("zero persisted-result count does not prove");
 });
 test('PSMK-003 Hero shows external result record requirement',async({page})=>{
  await openSmokeChecklist(page);await expect(root(page)).toContainText("External result records required");
 });
 test('PSMK-004 Step 220 metadata is shown from source contract',async({page})=>{
  await openSmokeChecklist(page);await expect(root(page)).toContainText("Step 220 — Commercial Launch Smoke Test Checklist");
 });
 test('PSMK-005 Six summary counters show distinct readiness categories',async({page})=>{
  await openSmokeChecklist(page);await expect(root(page).getByLabel("Commercial launch smoke-test summary").locator(".io-workspace-stat")).toHaveCount(6);
 });
 test('PSMK-006 Ten manual smoke test templates are displayed',async({page})=>{
  await openSmokeChecklist(page);await expect(rows(page)).toHaveCount(10);
 });
 test('PSMK-007 Ready register still requires externally confirmed decisions',async({page})=>{
  await openSmokeChecklist(page,{kind:"ready"});await expect(root(page).locator(".platform-launch-smoke-test__hero-aside .platform-launch-smoke-test__status-badge")).toContainText("waiting for go no go decisions");await expect(rows(page).first()).toContainText("External go no go confirmation required before smoke test");
 });
 test('PSMK-008 Review-required register cannot pass smoke prereqs',async({page})=>{
  await openSmokeChecklist(page,{kind:"review"});await expect(root(page).locator(".platform-launch-smoke-test__hero-aside .platform-launch-smoke-test__status-badge")).toContainText("evidence review required");
 });
 test('PSMK-009 Blocked register keeps all ten smoke templates blocked',async({page})=>{
  await openSmokeChecklist(page,{kind:"mixed"});await expect(rows(page).locator(".platform-launch-smoke-test__row-heading .platform-launch-smoke-test__status-badge")).toHaveText(Array(10).fill("Blocked until go no go register ready"));
 });
 test('PSMK-010 Default result is only not run template for every row',async({page})=>{
  await openSmokeChecklist(page);await expect(rows(page).locator(".platform-launch-smoke-test__status-grid .platform-launch-smoke-test__status-badge")).toHaveText(Array(10).fill("Not run"));
 });
 test('PSMK-011 operator_login_and_session_smoke_test shows accountable owner and required live evidence',async({page})=>{
  await openSmokeChecklist(page);const row=rows(page).nth(0);await expect(row).toContainText("owner: Platform operations owner");await expect(row).toContainText("Operator can sign in, refresh session remains valid, and sign out succeeds in the target launch environment.");
 });
 test('PSMK-012 pilot_tenant_access_smoke_test shows accountable owner and required live evidence',async({page})=>{
  await openSmokeChecklist(page);const row=rows(page).nth(1);await expect(row).toContainText("owner: Customer success owner");await expect(row).toContainText("Pilot tenant opens dashboard, role permissions load, and tenant isolation is verified with the selected launch account.");
 });
 test('PSMK-013 product_stock_and_report_smoke_test shows accountable owner and required live evidence',async({page})=>{
  await openSmokeChecklist(page);const row=rows(page).nth(2);await expect(row).toContainText("owner: Product owner");await expect(row).toContainText("Product list, stock list, stock movement history, and at least one operational report load successfully.");
 });
 test('PSMK-014 shipment_receiving_smoke_test shows accountable owner and required live evidence',async({page})=>{
  await openSmokeChecklist(page);const row=rows(page).nth(3);await expect(row).toContainText("owner: Operations owner");await expect(row).toContainText("Shipment detail, receiving action visibility, discrepancy visibility, and finalization readiness are reviewed without runtime errors.");
 });
 test('PSMK-015 platform_support_cockpit_smoke_test shows accountable owner and required live evidence',async({page})=>{
  await openSmokeChecklist(page);const row=rows(page).nth(4);await expect(row).toContainText("owner: Support owner");await expect(row).toContainText("Platform dashboard, tenant support context, support sessions, tenant tasks, and launch readiness surfaces load for an authorized platform user.");
 });
 test('PSMK-016 billing_subscription_visibility_smoke_test shows accountable owner and required live evidence',async({page})=>{
  await openSmokeChecklist(page);const row=rows(page).nth(5);await expect(row).toContainText("owner: Billing owner");await expect(row).toContainText("Billing/subscription readiness, license/plan enforcement, and billing activation gate are visible before paid customer activation.");
 });
 test('PSMK-017 monitoring_incident_smoke_test shows accountable owner and required live evidence',async({page})=>{
  await openSmokeChecklist(page);const row=rows(page).nth(6);await expect(row).toContainText("owner: Platform reliability owner");await expect(row).toContainText("System health, incident, dependency, integration monitoring, and production monitoring readiness surfaces load in the target environment.");
 });
 test('PSMK-018 backup_restore_evidence_smoke_test shows accountable owner and required live evidence',async({page})=>{
  await openSmokeChecklist(page);const row=rows(page).nth(7);await expect(row).toContainText("owner: Platform reliability owner");await expect(row).toContainText("Backup/restore validation board, tenant export visibility, and the external restore-drill evidence location or limitation are reviewed before launch.");
 });
 test('PSMK-019 documentation_support_handover_smoke_test shows accountable owner and required live evidence',async({page})=>{
  await openSmokeChecklist(page);const row=rows(page).nth(8);await expect(row).toContainText("owner: Support owner");await expect(row).toContainText("Launch documentation index, onboarding guide, support guide, billing guide, deployment guide, and pilot guide are reachable by the launch team.");
 });
 test('PSMK-020 rollback_decision_path_smoke_test shows accountable owner and required live evidence',async({page})=>{
  await openSmokeChecklist(page);const row=rows(page).nth(9);await expect(row).toContainText("owner: Release owner");await expect(row).toContainText("Rollback owner, rollback trigger, communication owner, and launch-window decision path are confirmed for the selected launch window.");
 });
 test('PSMK-021 operator_login_and_session_smoke_test retains evidence drilldown',async({page})=>{
  await openSmokeChecklist(page);await expect(rows(page).nth(0).getByRole("link",{name:"Open platform sessions" })).toHaveAttribute("href","/platform/sessions");
 });
 test('PSMK-022 pilot_tenant_access_smoke_test retains evidence drilldown',async({page})=>{
  await openSmokeChecklist(page);await expect(rows(page).nth(1).getByRole("link",{name:"Open pilot readiness" })).toHaveAttribute("href","/platform/pilot-customer-readiness");
 });
 test('PSMK-023 product_stock_and_report_smoke_test retains evidence drilldown',async({page})=>{
  await openSmokeChecklist(page);await expect(rows(page).nth(2).getByRole("link",{name:"Open onboarding evidence" })).toHaveAttribute("href","/platform/customer-onboarding-checklist");
 });
 test('PSMK-024 shipment_receiving_smoke_test retains evidence drilldown',async({page})=>{
  await openSmokeChecklist(page);await expect(rows(page).nth(3).getByRole("link",{name:"Open onboarding evidence" })).toHaveAttribute("href","/platform/customer-onboarding-checklist");
 });
 test('PSMK-025 platform_support_cockpit_smoke_test retains evidence drilldown',async({page})=>{
  await openSmokeChecklist(page);await expect(rows(page).nth(4).getByRole("link",{name:"Open support cockpit" })).toHaveAttribute("href","/platform/support-cockpit");
 });
 test('PSMK-026 billing_subscription_visibility_smoke_test retains evidence drilldown',async({page})=>{
  await openSmokeChecklist(page);await expect(rows(page).nth(5).getByRole("link",{name:"Open billing activation" })).toHaveAttribute("href","/platform/billing-subscription-activation");
 });
 test('PSMK-027 monitoring_incident_smoke_test retains evidence drilldown',async({page})=>{
  await openSmokeChecklist(page);await expect(rows(page).nth(6).getByRole("link",{name:"Open monitoring readiness" })).toHaveAttribute("href","/platform/monitoring-readiness");
 });
 test('PSMK-028 backup_restore_evidence_smoke_test retains evidence drilldown',async({page})=>{
  await openSmokeChecklist(page);await expect(rows(page).nth(7).getByRole("link",{name:"Open backup restore" })).toHaveAttribute("href","/platform/backup-restore-validation");
 });
 test('PSMK-029 documentation_support_handover_smoke_test retains evidence drilldown',async({page})=>{
  await openSmokeChecklist(page);await expect(rows(page).nth(8).getByRole("link",{name:"Open documentation completeness" })).toHaveAttribute("href","/platform/documentation-completeness");
 });
 test('PSMK-030 rollback_decision_path_smoke_test retains evidence drilldown',async({page})=>{
  await openSmokeChecklist(page);await expect(rows(page).nth(9).getByRole("link",{name:"Open deployment validation" })).toHaveAttribute("href","/platform/deployment-validation");
 });
 test('PSMK-031 operator_login_and_session_smoke_test displays source failure policy',async({page})=>{
  await openSmokeChecklist(page);await expect(rows(page).nth(0).locator(".platform-launch-smoke-test__artifact-grid")).toContainText("Block launch until authentication path is fixed");
 });
 test('PSMK-032 pilot_tenant_access_smoke_test displays source failure policy',async({page})=>{
  await openSmokeChecklist(page);await expect(rows(page).nth(1).locator(".platform-launch-smoke-test__artifact-grid")).toContainText("Block launch until tenant access is fixed");
 });
 test('PSMK-033 product_stock_and_report_smoke_test displays source failure policy',async({page})=>{
  await openSmokeChecklist(page);await expect(rows(page).nth(2).locator(".platform-launch-smoke-test__artifact-grid")).toContainText("Block launch until core inventory visibility is fixed");
 });
 test('PSMK-034 shipment_receiving_smoke_test displays source failure policy',async({page})=>{
  await openSmokeChecklist(page);await expect(rows(page).nth(3).locator(".platform-launch-smoke-test__artifact-grid")).toContainText("Block launch until receiving workflow is fixed");
 });
 test('PSMK-035 platform_support_cockpit_smoke_test displays source failure policy',async({page})=>{
  await openSmokeChecklist(page);await expect(rows(page).nth(4).locator(".platform-launch-smoke-test__artifact-grid")).toContainText("Block launch until platform operations visibility is fixed");
 });
 test('PSMK-036 billing_subscription_visibility_smoke_test displays source failure policy',async({page})=>{
  await openSmokeChecklist(page);await expect(rows(page).nth(5).locator(".platform-launch-smoke-test__artifact-grid")).toContainText("Block launch until billing visibility is fixed");
 });
 test('PSMK-037 monitoring_incident_smoke_test displays source failure policy',async({page})=>{
  await openSmokeChecklist(page);await expect(rows(page).nth(6).locator(".platform-launch-smoke-test__artifact-grid")).toContainText("Block launch until monitoring visibility is fixed");
 });
 test('PSMK-038 backup_restore_evidence_smoke_test displays source failure policy',async({page})=>{
  await openSmokeChecklist(page);await expect(rows(page).nth(7).locator(".platform-launch-smoke-test__artifact-grid")).toContainText("Block launch until recovery evidence is reviewed");
 });
 test('PSMK-039 documentation_support_handover_smoke_test displays source failure policy',async({page})=>{
  await openSmokeChecklist(page);await expect(rows(page).nth(8).locator(".platform-launch-smoke-test__artifact-grid")).toContainText("Block launch until documentation handover is fixed");
 });
 test('PSMK-040 rollback_decision_path_smoke_test displays source failure policy',async({page})=>{
  await openSmokeChecklist(page);await expect(rows(page).nth(9).locator(".platform-launch-smoke-test__artifact-grid")).toContainText("Block launch until rollback decision path is confirmed");
 });
 test('PSMK-041 Each template requires twelve external evidence fields',async({page})=>{
  await openSmokeChecklist(page);await expect(rows(page).first().locator(".platform-launch-smoke-test__field-groups > div").nth(1).locator("span")).toHaveCount(REQUIRED_RESULT_FIELDS.length);await expect(rows(page).first()).toContainText("Go no go decision reference");
 });
 test('PSMK-042 Allowed results list includes fail and conditional pass',async({page})=>{
  await openSmokeChecklist(page);const opts=rows(page).first().locator(".platform-launch-smoke-test__field-groups > div").first();await expect(opts.locator("span")).toHaveCount(ALLOWED_RESULTS.length);await expect(opts).toContainText("Conditional pass");await expect(opts).toContainText("Fail");
 });
 test('PSMK-043 Go No-Go register is displayed only as prerequisite context',async({page})=>{
  await openSmokeChecklist(page);await expect(context(page)).toContainText("Go/No-Go register posture");await expect(context(page)).toContainText("Acceptance packet posture");await expect(context(page)).toContainText("Certificate posture");
 });
 test('PSMK-044 External decision and smoke result persistence remain disclosed',async({page})=>{
  await openSmokeChecklist(page);await expect(context(page)).toContainText("Go/No-Go decision persistence");await expect(context(page)).toContainText("Smoke-test result persistence");await expect(context(page).locator(".platform-launch-smoke-test__persistence-grid")).toContainText("External only");
 });
 test('PSMK-045 Current register summary can be expanded without mutation',async({page})=>{
  await openSmokeChecklist(page);const details=context(page).locator("details");await details.locator("summary").click();await expect(details).toHaveAttribute("open","");await expect(details).toContainText("Register rows total");
 });
 test('PSMK-046 Seven execution rules are shown as guidance only',async({page})=>{
  await openSmokeChecklist(page);await expect(root(page).locator(".platform-launch-smoke-test__two-column .platform-launch-smoke-test__list").first().locator("li")).toHaveCount(7);
 });
 test('PSMK-047 No execution or launch approval controls appear',async({page})=>{
  await openSmokeChecklist(page);await expect(root(page).getByRole("button",{name:/^(Run|Execute|Approve|Deploy|Go live|Save result)$/i})).toHaveCount(0);
 });
 test('PSMK-048 Empty source rows produce a clear empty state',async({page})=>{
  await openSmokeChecklist(page,{alter:s=>({...s,smoke_tests:[]})});await expect(root(page).locator(".platform-launch-smoke-test__empty-state")).toContainText("No smoke-test rows are available.");await expect(rows(page)).toHaveCount(0);
 });
 test('PSMK-049 Failed initial GET exposes retry without fake success',async({page})=>{
  await openSmokeChecklist(page,{status:503});await expect(root(page).getByRole("alert")).toContainText("Unable to load Commercial Launch Smoke Test Checklist.");await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PSMK-050 Retry after transient GET restores synthetic rows',async({page})=>{
  let down=true;await openSmokeChecklist(page,{respond:(m,p)=>m==="GET"&&p===SMOKE_PATH&&down?{json:{message:"Synthetic temporary outage"},status:503}:undefined});await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();down=false;await root(page).getByRole("button",{name:"Retry",exact:true}).click();await expect(rows(page)).toHaveCount(10);
 });
 test('PSMK-051 Refresh failure shows stale snapshot rather than empty pass',async({page})=>{
  let down=false;await openSmokeChecklist(page,{respond:(m,p)=>m==="GET"&&p===SMOKE_PATH&&down?{json:{message:"Synthetic refresh outage"},status:503}:undefined});await expect(rows(page)).toHaveCount(10);down=true;await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(root(page).locator(".platform-launch-smoke-test__feedback--warning")).toContainText("Showing the last successful Commercial Launch Smoke Test Checklist snapshot");await expect(rows(page)).toHaveCount(10);
 });
 test('PSMK-052 Missing platform sessions read permission denies smoke page',async({page})=>{
  await openSmokeChecklist(page,{permissions:SMOKE_PERMISSIONS.filter(p=>p!=="platform.sessions.read"),expectHeading:false});await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
 });
 test('PSMK-053 Missing system health read permission denies smoke page',async({page})=>{
  await openSmokeChecklist(page,{permissions:SMOKE_PERMISSIONS.filter(p=>p!=="platform.system_health.read"),expectHeading:false});await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
 });
 test('PSMK-054 Refresh and details never send write requests',async({page})=>{
  const writes:string[]=[];await openSmokeChecklist(page,{onCall:(m,p)=>{if(!["GET","OPTIONS"].includes(m))writes.push(m+" "+p);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await context(page).locator("details summary").click();expect(writes).toEqual([]);
 });
 test('PSMK-055 Mobile refresh action is keyboard focusable',async({page})=>{
  await page.setViewportSize({width:390,height:780});await openSmokeChecklist(page);const button=root(page).getByRole("button",{name:"Refresh",exact:true});await button.focus();await expect(button).toBeFocused();
 });
 test('PSMK-056 Missing generated date renders not available',async({page})=>{
  await openSmokeChecklist(page,{alter:s=>({...s,generated_at:"not-a-date"})});await expect(root(page).locator(".platform-launch-smoke-test__refresh-block")).toContainText("Last refreshed: Not available");
 });
 test('PSMK-057 Missing decision persistence retains external-only notice',async({page})=>{
  await openSmokeChecklist(page,{alter:s=>({...s,go_no_go_decision_persistence:null})});await expect(context(page).locator(".platform-launch-smoke-test__persistence-grid")).toContainText("External only");
 });
 test('PSMK-058 Zero externally persisted results are not reported as successful',async({page})=>{
  await openSmokeChecklist(page,{alter:s=>({...s,summary:{...s.summary,result_records_persisted_in_application:0}})});await expect(root(page).getByLabel("Commercial launch smoke-test summary")).toContainText("0");await expect(root(page).locator(".platform-launch-smoke-test__boundary-notice")).toContainText("cannot observe external");
 });
 test('PSMK-059 Read-only execution notice persists for ready prerequisites',async({page})=>{
  await openSmokeChecklist(page,{kind:"ready"});await expect(root(page).locator(".platform-launch-smoke-test__boundary-notice")).toContainText("not proof");await expect(root(page).getByRole("button",{name:/run smoke|execute smoke|save result/i})).toHaveCount(0);
 });
 test('PSMK-060 Empty register summary does not invent summary details',async({page})=>{
  await openSmokeChecklist(page,{alter:s=>({...s,go_no_go_register_summary:{}})});await expect(context(page).locator("details")).toHaveCount(0);
 });
 test('PSMK-061 Allowed result choices reflect an empty source list',async({page})=>{
  await openSmokeChecklist(page,{alter:s=>({...s,smoke_tests:s.smoke_tests.map((x,i)=>i===0?{...x,allowed_results:[]}:x)})});await expect(rows(page).first().locator(".platform-launch-smoke-test__field-groups > div").first().locator("span")).toHaveCount(0);
 });
 test('PSMK-062 Required result fields reflect a shortened source list',async({page})=>{
  await openSmokeChecklist(page,{alter:s=>({...s,smoke_tests:s.smoke_tests.map((x,i)=>i===0?{...x,required_result_fields:["tester_name","tested_at"]}:x)})});await expect(rows(page).first().locator(".platform-launch-smoke-test__field-groups > div").nth(1).locator("span")).toHaveCount(2);
 });
 test('PSMK-063 Missing prerequisite template does not invent an approval',async({page})=>{
  await openSmokeChecklist(page,{alter:s=>({...s,smoke_tests:s.smoke_tests.map((x,i)=>i===0?{...x,manual_precondition:""}:x)})});await expect(rows(page).first().locator(".platform-launch-smoke-test__precondition-box").getByText(/externally recorded go\/no-go decision/i)).toHaveCount(0);
 });
 test('PSMK-064 A blocked source row displays danger status',async({page})=>{
  await openSmokeChecklist(page,{kind:"mixed"});await expect(rows(page).first().locator(".platform-launch-smoke-test__row-heading .platform-launch-smoke-test__status-badge")).toHaveAttribute("data-tone","danger");
 });
 test('PSMK-065 Unknown evidence code falls back to source default route',async({page})=>{
  await openSmokeChecklist(page,{alter:s=>({...s,smoke_tests:s.smoke_tests.map((x,i)=>i===0?{...x,code:"synthetic_unlisted_smoke",domain:"synthetic_unlisted_domain"}:x)})});await expect(rows(page).first().getByRole("link",{name:"Open Go/No-Go register"})).toHaveAttribute("href","/platform/commercial-launch-go-no-go-register");
 });
 test('PSMK-066 Source register summary retains additional numeric fields',async({page})=>{
  await openSmokeChecklist(page,{alter:s=>({...s,go_no_go_register_summary:{synthetic_extra_count:17}})});await context(page).locator("details summary").click();await expect(context(page).locator("details")).toContainText("Synthetic extra count");await expect(context(page).locator("details")).toContainText("17");
 });
 test('PSMK-067 Result persistence indicator echoes supplied value without run action',async({page})=>{
  await openSmokeChecklist(page,{alter:s=>({...s,result_persistence:{...s.result_persistence,stored_in_application:true}})});await expect(context(page).locator(".platform-launch-smoke-test__persistence-grid")).toContainText("Stored in application");await expect(root(page).getByRole("button",{name:/run smoke|record result/i})).toHaveCount(0);
 });
 test('PSMK-068 Execution rule list follows source list changes',async({page})=>{
  await openSmokeChecklist(page,{alter:s=>({...s,execution_rules:["Synthetic rule A","Synthetic rule B"]})});await expect(root(page).locator(".platform-launch-smoke-test__two-column .platform-launch-smoke-test__list").first().locator("li")).toHaveCount(2);await expect(root(page)).toContainText("Synthetic rule B");
 });
 test('PSMK-069 Missing tenant read grant denies checklist',async({page})=>{
  await openSmokeChecklist(page,{permissions:SMOKE_PERMISSIONS.filter(p=>p!=="platform.tenants.read"),expectHeading:false});await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
 });
 test('PSMK-070 Arbitrary browser query is not forwarded into restricted GET',async({page})=>{
  const qs:string[]=[];await openSmokeChecklist(page,{urlQuery:"synthetic_browser_only=1",onCall:(method,path,q)=>{if(method==="GET"&&path===SMOKE_PATH)qs.push(q.toString());}});expect(qs).toEqual([""]);
 });
});
