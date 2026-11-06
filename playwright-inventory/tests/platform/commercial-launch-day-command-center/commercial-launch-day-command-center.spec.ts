/** Batch 121 — Step 221 read-only launch-day preparation, not real owner approval. */
import {test,expect,type Page} from '@playwright/test';
import {openCommandCenter,COMMAND_PATH,COMMAND_PERMISSIONS,COMMAND_FIELDS,COMMAND_DECISIONS,COMMAND_CHECKPOINTS} from '../../../support/platformCommercialLaunchDayCommandCenterFixture';
const root=(p:Page)=>p.locator('.platform-launch-command-center');
const rows=(p:Page)=>root(p).locator('.platform-launch-command-center__row-card');
const context=(p:Page)=>root(p).locator('.platform-launch-command-center__context-panel');
test.describe('Commercial Launch Day Command Center — Step 221 read-only source-defined checkpoints',()=>{
 test('PCCD-001 Original route renders command center heading',async({page})=>{
  await openCommandCenter(page);await expect(page.getByRole("heading",{name:"Commercial Launch Day Command Center",exact:true})).toBeVisible();
 });
 test('PCCD-002 Launch-window boundary explicitly prevents conflating templates with decisions',async({page})=>{
  await openCommandCenter(page);await expect(root(page).locator(".platform-launch-command-center__boundary-notice")).toContainText("A checkpoint row is a record template, not proof");
 });
 test('PCCD-003 Hero calls out external decision records',async({page})=>{
  await openCommandCenter(page);await expect(root(page)).toContainText("External decision records required");
 });
 test('PCCD-004 Source Step 221 metadata stays visible',async({page})=>{
  await openCommandCenter(page);await expect(root(page)).toContainText("Step 221 — Commercial Launch Day Command Center");
 });
 test('PCCD-005 Six readiness summary metrics displayed',async({page})=>{
  await openCommandCenter(page);await expect(root(page).getByLabel("Commercial launch command-center summary").locator(".io-workspace-stat")).toHaveCount(6);
 });
 test('PCCD-006 All eight checkpoint templates displayed',async({page})=>{
  await openCommandCenter(page);await expect(rows(page)).toHaveCount(8);
 });
 test('PCCD-007 Go No-Go confirmation required when smoke checklist awaits decisions',async({page})=>{
  await openCommandCenter(page,{kind:"ready"});await expect(rows(page).first().locator(".platform-launch-command-center__row-heading .platform-launch-command-center__status-badge")).toContainText("External go no go confirmation required");
 });
 test('PCCD-008 Evidence review propagates from smoke checklist',async({page})=>{
  await openCommandCenter(page,{kind:"review"});await expect(rows(page).first().locator(".platform-launch-command-center__row-heading .platform-launch-command-center__status-badge")).toContainText("Evidence review required");
 });
 test('PCCD-009 Blocked upstream posture produces danger-coded checkpoints',async({page})=>{
  await openCommandCenter(page,{kind:"mixed"});await expect(rows(page).first().locator(".platform-launch-command-center__row-heading .platform-launch-command-center__status-badge")).toHaveAttribute("data-tone","danger");
 });
 test('PCCD-010 Manual smoke execution still needs external result confirmation',async({page})=>{
  await openCommandCenter(page,{kind:"manual"});await expect(rows(page).first()).toContainText("External smoke test confirmation required");await expect(context(page)).toContainText("Commercial launch smoke test ready for manual execution");
 });
 test('PCCD-011 All eight decision statuses default to not reviewed templates',async({page})=>{
  await openCommandCenter(page);await expect(rows(page).locator(".platform-launch-command-center__status-grid .platform-launch-command-center__status-badge")).toHaveText(Array(8).fill("Not reviewed"));
 });
 test('PCCD-012 launch_window_owner_confirmed shows owner and evidence required',async({page})=>{
  await openCommandCenter(page);const row=rows(page).nth(0);await expect(row).toContainText("owner: Release owner");await expect(row).toContainText("Launch-window owner, deputy owner, start time, end time, and decision channel are recorded for the target launch environment.");
 });
 test('PCCD-013 smoke_test_runner_confirmed shows owner and evidence required',async({page})=>{
  await openCommandCenter(page);const row=rows(page).nth(1);await expect(row).toContainText("owner: Platform operations owner");await expect(row).toContainText("Smoke-test runner, browser/device, selected tenant/account, and evidence capture location are confirmed before launch starts.");
 });
 test('PCCD-014 customer_success_launch_contact_confirmed shows owner and evidence required',async({page})=>{
  await openCommandCenter(page);const row=rows(page).nth(2);await expect(row).toContainText("owner: Customer success owner");await expect(row).toContainText("Customer success launch contact, customer contact path, communication window, and follow-up cadence are confirmed.");
 });
 test('PCCD-015 support_escalation_path_confirmed shows owner and evidence required',async({page})=>{
  await openCommandCenter(page);const row=rows(page).nth(3);await expect(row).toContainText("owner: Support owner");await expect(row).toContainText("Support escalation owner, SLA posture, triage channel, and first-response expectation are confirmed for launch day.");
 });
 test('PCCD-016 billing_activation_hold_confirmed shows owner and evidence required',async({page})=>{
  await openCommandCenter(page);const row=rows(page).nth(4);await expect(row).toContainText("owner: Billing owner");await expect(row).toContainText("Paid activation timing, manual hold rule, plan/entitlement owner, and invoice/subscription evidence location are confirmed.");
 });
 test('PCCD-017 incident_commander_confirmed shows owner and evidence required',async({page})=>{
  await openCommandCenter(page);const row=rows(page).nth(5);await expect(row).toContainText("owner: Platform reliability owner");await expect(row).toContainText("Incident commander, severity rule, incident channel, customer-impact communication owner, and escalation trigger are confirmed.");
 });
 test('PCCD-018 rollback_decision_owner_confirmed shows owner and evidence required',async({page})=>{
  await openCommandCenter(page);const row=rows(page).nth(6);await expect(row).toContainText("owner: Release owner");await expect(row).toContainText("Rollback decision owner, rollback trigger, rollback communication owner, and final stop/go rule are confirmed.");
 });
 test('PCCD-019 post_launch_observation_window_confirmed shows owner and evidence required',async({page})=>{
  await openCommandCenter(page);const row=rows(page).nth(7);await expect(row).toContainText("owner: Platform operations owner");await expect(row).toContainText("Post-launch observation window, monitoring owner, check cadence, and handoff rule are confirmed before launch window closes.");
 });
 test('PCCD-020 launch_window_owner_confirmed links to evidence destination',async({page})=>{
  await openCommandCenter(page);await expect(rows(page).nth(0).getByRole("link",{name:"Open Go/No-Go register"})).toHaveAttribute("href","/platform/commercial-launch-go-no-go-register");
 });
 test('PCCD-021 smoke_test_runner_confirmed links to evidence destination',async({page})=>{
  await openCommandCenter(page);await expect(rows(page).nth(1).getByRole("link",{name:"Open smoke-test checklist"})).toHaveAttribute("href","/platform/commercial-launch-smoke-test-checklist");
 });
 test('PCCD-022 customer_success_launch_contact_confirmed links to evidence destination',async({page})=>{
  await openCommandCenter(page);await expect(rows(page).nth(2).getByRole("link",{name:"Open pilot readiness"})).toHaveAttribute("href","/platform/pilot-customer-readiness");
 });
 test('PCCD-023 support_escalation_path_confirmed links to evidence destination',async({page})=>{
  await openCommandCenter(page);await expect(rows(page).nth(3).getByRole("link",{name:"Open support cockpit"})).toHaveAttribute("href","/platform/support-cockpit");
 });
 test('PCCD-024 billing_activation_hold_confirmed links to evidence destination',async({page})=>{
  await openCommandCenter(page);await expect(rows(page).nth(4).getByRole("link",{name:"Open billing activation"})).toHaveAttribute("href","/platform/billing-subscription-activation");
 });
 test('PCCD-025 incident_commander_confirmed links to evidence destination',async({page})=>{
  await openCommandCenter(page);await expect(rows(page).nth(5).getByRole("link",{name:"Open incidents"})).toHaveAttribute("href","/platform/incidents");
 });
 test('PCCD-026 rollback_decision_owner_confirmed links to evidence destination',async({page})=>{
  await openCommandCenter(page);await expect(rows(page).nth(6).getByRole("link",{name:"Open deployment validation"})).toHaveAttribute("href","/platform/deployment-validation");
 });
 test('PCCD-027 post_launch_observation_window_confirmed links to evidence destination',async({page})=>{
  await openCommandCenter(page);await expect(rows(page).nth(7).getByRole("link",{name:"Open monitoring readiness"})).toHaveAttribute("href","/platform/monitoring-readiness");
 });
 test('PCCD-028 launch_window_owner_confirmed retains source hold trigger',async({page})=>{
  await openCommandCenter(page);await expect(rows(page).nth(0).locator(".platform-launch-command-center__artifact-grid")).toContainText("Missing launch window owner or decision channel");
 });
 test('PCCD-029 smoke_test_runner_confirmed retains source hold trigger',async({page})=>{
  await openCommandCenter(page);await expect(rows(page).nth(1).locator(".platform-launch-command-center__artifact-grid")).toContainText("Missing smoke test runner or evidence location");
 });
 test('PCCD-030 customer_success_launch_contact_confirmed retains source hold trigger',async({page})=>{
  await openCommandCenter(page);await expect(rows(page).nth(2).locator(".platform-launch-command-center__artifact-grid")).toContainText("Missing customer success or customer contact path");
 });
 test('PCCD-031 support_escalation_path_confirmed retains source hold trigger',async({page})=>{
  await openCommandCenter(page);await expect(rows(page).nth(3).locator(".platform-launch-command-center__artifact-grid")).toContainText("Missing support escalation path");
 });
 test('PCCD-032 billing_activation_hold_confirmed retains source hold trigger',async({page})=>{
  await openCommandCenter(page);await expect(rows(page).nth(4).locator(".platform-launch-command-center__artifact-grid")).toContainText("Missing billing activation hold or entitlement owner");
 });
 test('PCCD-033 incident_commander_confirmed retains source hold trigger',async({page})=>{
  await openCommandCenter(page);await expect(rows(page).nth(5).locator(".platform-launch-command-center__artifact-grid")).toContainText("Missing incident commander or severity rule");
 });
 test('PCCD-034 rollback_decision_owner_confirmed retains source hold trigger',async({page})=>{
  await openCommandCenter(page);await expect(rows(page).nth(6).locator(".platform-launch-command-center__artifact-grid")).toContainText("Missing rollback owner or trigger");
 });
 test('PCCD-035 post_launch_observation_window_confirmed retains source hold trigger',async({page})=>{
  await openCommandCenter(page);await expect(rows(page).nth(7).locator(".platform-launch-command-center__artifact-grid")).toContainText("Missing post launch observation owner or cadence");
 });
 test('PCCD-036 Thirteen required external decision fields visible per checkpoint',async({page})=>{
  await openCommandCenter(page);await expect(rows(page).first().locator(".platform-launch-command-center__field-groups > div").nth(1).locator("span")).toHaveCount(COMMAND_FIELDS.length);await expect(rows(page).first()).toContainText("Rollback owner");
 });
 test('PCCD-037 Four allowed external statuses are templates, not actions',async({page})=>{
  await openCommandCenter(page);const area=rows(page).first().locator(".platform-launch-command-center__field-groups > div").first();await expect(area.locator("span")).toHaveCount(COMMAND_DECISIONS.length);await expect(area).toContainText("Conditional ready");await expect(area).toContainText("Hold");
 });
 test('PCCD-038 Smoke prerequisite counters are shown without claiming completion',async({page})=>{
  await openCommandCenter(page,{kind:"mixed"});await expect(rows(page).first().locator(".platform-launch-command-center__status-grid")).toContainText("Smoke-test rows");await expect(rows(page).first().locator(".platform-launch-command-center__status-grid")).toContainText("Blocked smoke-test rows");
 });
 test('PCCD-039 Manual prerequisite copy distinguishes readiness from completion',async({page})=>{
  await openCommandCenter(page,{kind:"ready"});await expect(rows(page).first().locator(".platform-launch-command-center__precondition-box")).toContainText("externally recorded go/no-go decisions");
 });
 test('PCCD-040 All three persistence boundaries remain externally recorded',async({page})=>{
  await openCommandCenter(page);await expect(context(page).locator(".platform-launch-command-center__persistence-grid")).toContainText("Go/No-Go decision persistence");await expect(context(page).locator(".platform-launch-command-center__persistence-grid")).toContainText("Smoke-test result persistence");await expect(context(page).locator(".platform-launch-command-center__persistence-grid")).toContainText("Command-center decision persistence");await expect(context(page).locator(".platform-launch-command-center__persistence-grid").getByText("External only",{exact:true})).toHaveCount(3);
 });
 test('PCCD-041 Smoke summary expands as read-only source values',async({page})=>{
  await openCommandCenter(page);const section=context(page).locator("details");await section.locator("summary").click();await expect(section).toHaveAttribute("open","");await expect(section).toContainText("Smoke tests total");
 });
 test('PCCD-042 Six launch-window rules are read-only guidance',async({page})=>{
  await openCommandCenter(page);await expect(root(page).locator(".platform-launch-command-center__two-column .platform-launch-command-center__list").first().locator("li")).toHaveCount(6);
 });
 test('PCCD-043 Five launch limitations forbid implicit production approval',async({page})=>{
  await openCommandCenter(page);const lim=root(page).locator(".platform-launch-command-center__two-column .platform-launch-command-center__list").last();await expect(lim.locator("li")).toHaveCount(5);await expect(lim).toContainText("No smoke tests are executed automatically");
 });
 test('PCCD-044 No launch or payment execution buttons are offered',async({page})=>{
  await openCommandCenter(page);await expect(root(page).getByRole("button",{name:/^(Launch|Deploy|Execute|Approve|Pay|Save decision)$/i})).toHaveCount(0);
 });
 test('PCCD-045 Missing checkpoints display explicit empty state',async({page})=>{
  await openCommandCenter(page,{alter:s=>({...s,checkpoints:[]})});await expect(root(page).locator(".platform-launch-command-center__empty-state")).toContainText("No command-center checkpoints are available.");await expect(rows(page)).toHaveCount(0);
 });
 test('PCCD-046 Failed initial GET exposes retry without phantom readiness',async({page})=>{
  await openCommandCenter(page,{status:503});await expect(root(page).getByRole("alert")).toContainText("Unable to load Commercial Launch Day Command Center.");await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PCCD-047 Retry after transient failure restores evidence rows',async({page})=>{
  let down=true;await openCommandCenter(page,{respond:(m,p)=>m==="GET"&&p===COMMAND_PATH&&down?{json:{message:"Synthetic outage"},status:503}:undefined});await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();down=false;await root(page).getByRole("button",{name:"Retry",exact:true}).click();await expect(rows(page)).toHaveCount(8);
 });
 test('PCCD-048 Refresh failure preserves last successful snapshot with warning',async({page})=>{
  let down=false;await openCommandCenter(page,{respond:(m,p)=>m==="GET"&&p===COMMAND_PATH&&down?{json:{message:"Synthetic refresh outage"},status:503}:undefined});await expect(rows(page)).toHaveCount(8);down=true;await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(root(page).locator(".platform-launch-command-center__feedback--warning")).toContainText("Showing the last successful Commercial Launch Day Command Center snapshot");await expect(rows(page)).toHaveCount(8);
 });
 test('PCCD-049 Missing sessions-read permission denies command center',async({page})=>{
  await openCommandCenter(page,{permissions:COMMAND_PERMISSIONS.filter(p=>p!=="platform.sessions.read"),expectHeading:false});await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
 });
 test('PCCD-050 Missing system-health permission denies command center',async({page})=>{
  await openCommandCenter(page,{permissions:COMMAND_PERMISSIONS.filter(p=>p!=="platform.system_health.read"),expectHeading:false});await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
 });
 test('PCCD-051 Refresh and source details never issue mutation requests',async({page})=>{
  const writes:string[]=[];await openCommandCenter(page,{onCall:(m,p)=>{if(!["GET","OPTIONS"].includes(m))writes.push(m+" "+p);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await context(page).locator("details summary").click();expect(writes).toEqual([]);
 });
 test('PCCD-052 Mobile refresh button remains keyboard focusable',async({page})=>{
  await page.setViewportSize({width:390,height:780});await openCommandCenter(page);const button=root(page).getByRole("button",{name:"Refresh",exact:true});await button.focus();await expect(button).toBeFocused();
 });
 test('PCCD-053 Ten supporting launch links point to their source destinations',async({page})=>{
  await openCommandCenter(page);const links=root(page).locator(".platform-launch-command-center__supporting-pages .platform-launch-command-center__link-row a");await expect(links).toHaveCount(10);await expect(links.first()).toHaveAttribute("href","/platform/commercial-launch-smoke-test-checklist");await expect(links.last()).toHaveAttribute("href","/platform/commercial-launch-post-launch-observation");
 });
 test('PCCD-054 Arbitrary navigation query cannot alter backend empty-query contract',async({page})=>{
  const q:string[]=[];await openCommandCenter(page,{urlQuery:"synthetic_page_only=1",onCall:(m,p,search)=>{if(m==="GET"&&p===COMMAND_PATH)q.push(search.toString());}});expect(q).toEqual([""]);
 });
 test('PCCD-055 Invalid refresh timestamp is not presented as valid evidence',async({page})=>{
  await openCommandCenter(page,{alter:s=>({...s,generated_at:"invalid-synthetic-datetime"})});await expect(root(page).locator(".platform-launch-command-center__refresh-block")).toContainText("Last refreshed: Not available");
 });
 test('PCCD-056 All eight owner checkpoint templates remain visible after refresh',async({page})=>{
  await openCommandCenter(page);await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(8);
 });
 test('PCCD-057 Every checkpoint template retains its explicit external decision boundary',async({page})=>{
  await openCommandCenter(page);for(const row of await rows(page).all()){await expect(row).toContainText("External");await expect(row).toContainText("Not reviewed");}
 });
 test('PCCD-058 Fifteen source field and status requirements are never editable inputs',async({page})=>{
  await openCommandCenter(page);await expect(root(page).locator(".platform-launch-command-center__field-groups input, .platform-launch-command-center__field-groups textarea, .platform-launch-command-center__field-groups select")).toHaveCount(0);
 });
 test('PCCD-059 No command center row can commit an operator decision',async({page})=>{
  await openCommandCenter(page);await expect(rows(page).getByRole("button")).toHaveCount(0);
 });
 test('PCCD-060 Refresh preserves the source-defined 13 decision field chips',async({page})=>{
  await openCommandCenter(page);const chips=rows(page).first().locator(".platform-launch-command-center__field-groups");await expect(chips).toContainText("Reviewed at");await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(chips).toContainText("Reviewed at");
 });
 test('PCCD-061 Source evidence label is visible independently from any external approval',async({page})=>{
  await openCommandCenter(page);await expect(rows(page).first().locator(".platform-launch-command-center__evidence-box")).toContainText("Required evidence");await expect(root(page).locator(".platform-launch-command-center__boundary-notice")).toContainText("not proof");
 });
 test('PCCD-062 Null source persistence is reported as unavailable not approved',async({page})=>{
  await openCommandCenter(page,{alter:s=>({...s,smoke_test_result_persistence:null,go_no_go_decision_persistence:null})});await expect(context(page).locator(".platform-launch-command-center__persistence-grid")).toContainText("Not reported");
 });
 test('PCCD-063 Missing timestamp cannot be read as an observation time',async({page})=>{
  await openCommandCenter(page,{alter:s=>({...s,generated_at:""})});await expect(root(page).locator(".platform-launch-command-center__hero-aside")).toContainText("Not available");
 });
 test('PCCD-064 All checkpoint template IDs remain stable after reload',async({page})=>{
  await openCommandCenter(page);const before=await rows(page).locator("h3").allTextContents();await page.reload();await expect(rows(page)).toHaveCount(8);expect(await rows(page).locator("h3").allTextContents()).toEqual(before);
 });
 test('PCCD-065 Eight checkpoint owners appear without a claim that records exist',async({page})=>{
  await openCommandCenter(page);await expect(rows(page).locator(".platform-launch-command-center__row-heading")).toHaveCount(8);await expect(root(page)).toContainText("decision records");
 });
 test('PCCD-066 Held upstream posture cannot render a ready checkpoint badge',async({page})=>{
  await openCommandCenter(page,{kind:"mixed"});await expect(rows(page).first().locator(".platform-launch-command-center__row-heading [data-tone=good]")).toHaveCount(0);
 });
 test('PCCD-067 Evidence review is not a post-launch signoff',async({page})=>{
  await openCommandCenter(page,{kind:"review"});await expect(root(page)).toContainText("evidence review");await expect(root(page).getByRole("button",{name:/Approve|Sign off|Launch now/i})).toHaveCount(0);
 });
 test('PCCD-068 Refresh action stays visible at narrow screen width',async({page})=>{
  await page.setViewportSize({width:375,height:790});await openCommandCenter(page);await expect(root(page).getByRole("button",{name:"Refresh",exact:true})).toBeVisible();
 });
 test('PCCD-069 Backend read permission keeps denied access out of Command Center',async({page})=>{
  await openCommandCenter(page,{permissions:COMMAND_PERMISSIONS.filter(p=>p!=="platform.security.read"),expectHeading:false});await expect(root(page)).toHaveCount(0);
 });
 test('PCCD-070 Ten upstream source links cannot themselves mutate launch state',async({page})=>{
  const writes:string[]=[];await openCommandCenter(page,{onCall:(m,p)=>{if(!["GET","OPTIONS"].includes(m))writes.push(m+" "+p);}});await expect(root(page).locator(".platform-launch-command-center__supporting-pages .platform-launch-command-center__link-row a")).toHaveCount(10);await root(page).getByRole("button",{name:"Refresh",exact:true}).click();expect(writes).toEqual([]);
 });
});
