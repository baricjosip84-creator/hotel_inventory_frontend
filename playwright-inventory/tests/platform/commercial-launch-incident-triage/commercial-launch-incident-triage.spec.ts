/** Batch 123 — Step 223 incident triage presentation; all network evidence synthetic and unrun. */
import {test,expect,type Page} from '@playwright/test';
import {openTriage,TRIAGE_PATH,TRIAGE_PERMISSIONS,TRIAGE_FIELDS,TRIAGE_SEVERITIES,TRIAGE_ACTIONS,TRIAGE_EVIDENCE_LINKS} from '../../../support/platformCommercialLaunchIncidentTriageFixture';
import {OBSERVATION_CHECKS} from '../../../support/platformCommercialLaunchPostLaunchObservationFixture';
const root=(p:Page)=>p.locator('.platform-incident-triage');
const rows=(p:Page)=>root(p).locator('.platform-incident-triage__row-card');
const context=(p:Page)=>root(p).locator('.platform-incident-triage__context-panel');
test.describe('Commercial Launch Incident Triage — Step 223 read-only source evidence',()=>{
 test('PITR-001 Route renders Commercial Launch Incident Triage heading',async({page})=>{
  await openTriage(page);await expect(page.getByRole("heading",{name:"Commercial Launch Incident Triage",exact:true})).toBeVisible();
 });
 test('PITR-002 Hero states Step 223 and triage preparation only',async({page})=>{
  await openTriage(page);await expect(root(page)).toContainText("Step 223 — Commercial Launch Incident Triage Queue");await expect(root(page)).toContainText("Triage preparation only");
 });
 test('PITR-003 Boundary makes external confirmation mandatory',async({page})=>{
  await openTriage(page);await expect(root(page).locator(".platform-incident-triage__boundary-notice")).toContainText("cannot confirm");
 });
 test('PITR-004 Ten incident triage supporting links are presented',async({page})=>{
  await openTriage(page);await expect(root(page).locator(".platform-incident-triage__supporting-pages .platform-incident-triage__link-row a")).toHaveCount(10);
 });
 test('PITR-005 Eight source-defined summary metrics displayed',async({page})=>{
  await openTriage(page);await expect(root(page).getByLabel("Incident triage summary").locator(".io-workspace-stat")).toHaveCount(8);
 });
 test('PITR-006 All eight incident triage templates render',async({page})=>{
  await openTriage(page);await expect(rows(page)).toHaveCount(8);
 });
 test('PITR-007 Blocked observation prevents triage readiness',async({page})=>{
  await openTriage(page,{kind:"blocked"});await expect(rows(page).first().locator(".platform-incident-triage__row-heading [data-tone]")).toHaveAttribute("data-tone","danger");
 });
 test('PITR-008 Observation evidence review remains a warning state',async({page})=>{
  await openTriage(page,{kind:"review"});await expect(rows(page).first().locator(".platform-incident-triage__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PITR-009 Go No-Go decisions must be confirmed externally',async({page})=>{
  await openTriage(page,{kind:"go"});await expect(rows(page).first()).toContainText("Waiting for external go no go confirmation");
 });
 test('PITR-010 Smoke test results must be confirmed externally',async({page})=>{
  await openTriage(page,{kind:"smoke"});await expect(rows(page).first()).toContainText("Waiting for external smoke test confirmation");
 });
 test('PITR-011 Launch-window decision must precede incident triage',async({page})=>{
  await openTriage(page,{kind:"window"});await expect(rows(page).first()).toContainText("Waiting for external launch window confirmation");
 });
 test('PITR-012 Even preparation-only observation requires external records',async({page})=>{
  await openTriage(page,{kind:"external"});await expect(rows(page).first()).toContainText("External post launch observation confirmation required before triage");
 });
 test('PITR-013 service_health triage domain retains its source owner',async({page})=>{
  await openTriage(page);await expect(rows(page).nth(0)).toContainText("Platform operations owner");await expect(rows(page).nth(0)).toContainText("Service health");
 });
 test('PITR-014 customer_feedback triage domain retains its source owner',async({page})=>{
  await openTriage(page);await expect(rows(page).nth(1)).toContainText("Customer success owner");await expect(rows(page).nth(1)).toContainText("Customer feedback");
 });
 test('PITR-015 support_intake triage domain retains its source owner',async({page})=>{
  await openTriage(page);await expect(rows(page).nth(2)).toContainText("Support owner");await expect(rows(page).nth(2)).toContainText("Support intake");
 });
 test('PITR-016 billing_confirmation triage domain retains its source owner',async({page})=>{
  await openTriage(page);await expect(rows(page).nth(3)).toContainText("Billing owner");await expect(rows(page).nth(3)).toContainText("Billing confirmation");
 });
 test('PITR-017 incident_review triage domain retains its source owner',async({page})=>{
  await openTriage(page);await expect(rows(page).nth(4)).toContainText("Platform reliability owner");await expect(rows(page).nth(4)).toContainText("Incident review");
 });
 test('PITR-018 rollback_readiness triage domain retains its source owner',async({page})=>{
  await openTriage(page);await expect(rows(page).nth(5)).toContainText("Release owner");await expect(rows(page).nth(5)).toContainText("Rollback readiness");
 });
 test('PITR-019 adoption_signal triage domain retains its source owner',async({page})=>{
  await openTriage(page);await expect(rows(page).nth(6)).toContainText("Product owner");await expect(rows(page).nth(6)).toContainText("Adoption signal");
 });
 test('PITR-020 handoff_closure triage domain retains its source owner',async({page})=>{
  await openTriage(page);await expect(rows(page).nth(7)).toContainText("Release owner");await expect(rows(page).nth(7)).toContainText("Handoff closure");
 });
 test('PITR-021 Source observation 1 link retains correct destination',async({page})=>{
  await openTriage(page);await expect(rows(page).nth(0).getByRole("link",{name:"Open system health"})).toHaveAttribute("href","/platform/system-health");
 });
 test('PITR-022 Source observation 2 link retains correct destination',async({page})=>{
  await openTriage(page);await expect(rows(page).nth(1).getByRole("link",{name:"Open tenant communications"})).toHaveAttribute("href","/platform/tenant-communications");
 });
 test('PITR-023 Source observation 3 link retains correct destination',async({page})=>{
  await openTriage(page);await expect(rows(page).nth(2).getByRole("link",{name:"Open support cockpit"})).toHaveAttribute("href","/platform/support-cockpit");
 });
 test('PITR-024 Source observation 4 link retains correct destination',async({page})=>{
  await openTriage(page);await expect(rows(page).nth(3).getByRole("link",{name:"Open billing activation"})).toHaveAttribute("href","/platform/billing-subscription-activation");
 });
 test('PITR-025 Source observation 5 link retains correct destination',async({page})=>{
  await openTriage(page);await expect(rows(page).nth(4).getByRole("link",{name:"Open incidents"})).toHaveAttribute("href","/platform/incidents");
 });
 test('PITR-026 Source observation 6 link retains correct destination',async({page})=>{
  await openTriage(page);await expect(rows(page).nth(5).getByRole("link",{name:"Open deployment validation"})).toHaveAttribute("href","/platform/deployment-validation");
 });
 test('PITR-027 Source observation 7 link retains correct destination',async({page})=>{
  await openTriage(page);await expect(rows(page).nth(6).getByRole("link",{name:"Open pilot readiness"})).toHaveAttribute("href","/platform/pilot-customer-readiness");
 });
 test('PITR-028 Source observation 8 link retains correct destination',async({page})=>{
  await openTriage(page);await expect(rows(page).nth(7).getByRole("link",{name:"Open post-launch observation"})).toHaveAttribute("href","/platform/commercial-launch-post-launch-observation");
 });
 test('PITR-029 Escalation trigger for incident-triage domain 1',async({page})=>{
  await openTriage(page);await expect(rows(page).nth(0).locator(".platform-incident-triage__evidence-box").first()).toContainText("Health degradation or missing observation evidence");
 });
 test('PITR-030 Escalation trigger for incident-triage domain 2',async({page})=>{
  await openTriage(page);await expect(rows(page).nth(1).locator(".platform-incident-triage__evidence-box").first()).toContainText("Missing customer contact or unresolved launch concern");
 });
 test('PITR-031 Escalation trigger for incident-triage domain 3',async({page})=>{
  await openTriage(page);await expect(rows(page).nth(2).locator(".platform-incident-triage__evidence-box").first()).toContainText("Open severe support ticket or sla breach risk");
 });
 test('PITR-032 Escalation trigger for incident-triage domain 4',async({page})=>{
  await openTriage(page);await expect(rows(page).nth(3).locator(".platform-incident-triage__evidence-box").first()).toContainText("Billing state unclear or paid activation not authorized");
 });
 test('PITR-033 Escalation trigger for incident-triage domain 5',async({page})=>{
  await openTriage(page);await expect(rows(page).nth(4).locator(".platform-incident-triage__evidence-box").first()).toContainText("Active high severity incident or missing customer impact review");
 });
 test('PITR-034 Escalation trigger for incident-triage domain 6',async({page})=>{
  await openTriage(page);await expect(rows(page).nth(5).locator(".platform-incident-triage__evidence-box").first()).toContainText("Rollback trigger met or rollback owner missing");
 });
 test('PITR-035 Escalation trigger for incident-triage domain 7',async({page})=>{
  await openTriage(page);await expect(rows(page).nth(6).locator(".platform-incident-triage__evidence-box").first()).toContainText("Customer unable to complete first core workflow");
 });
 test('PITR-036 Escalation trigger for incident-triage domain 8',async({page})=>{
  await openTriage(page);await expect(rows(page).nth(7).locator(".platform-incident-triage__evidence-box").first()).toContainText("Missing handoff owner or open blockers without follow up");
 });
 test('PITR-037 Nine required triage fields visible in every source template',async({page})=>{
  await openTriage(page);for(const row of await rows(page).all()){const fields=row.locator(".platform-incident-triage__field-groups");for(const field of TRIAGE_FIELDS){await expect(fields).toContainText(field.replaceAll("_"," "),{ignoreCase:true});}}
 });
 test('PITR-038 Six severity values shown as hints not recorded choices',async({page})=>{
  await openTriage(page);const chips=rows(page).first().locator(".platform-incident-triage__field-groups");for(const severity of TRIAGE_SEVERITIES){await expect(chips).toContainText(severity.replaceAll("_"," "),{ignoreCase:true});}await expect(chips.locator("select,input,button")).toHaveCount(0);
 });
 test('PITR-039 Default severity never claims real incident has been classified',async({page})=>{
  await openTriage(page);for(const row of await rows(page).all()){await expect(row.locator(".platform-incident-triage__source-summary")).toContainText("Template default only; not an observed severity.");}
 });
 test('PITR-040 Customer impact review flagged on every triage domain',async({page})=>{
  await openTriage(page);for(const row of await rows(page).all()){await expect(row.locator(".platform-incident-triage__source-summary")).toContainText("Customer impact review");await expect(row.locator(".platform-incident-triage__source-summary")).toContainText("Required");}
 });
 test('PITR-041 All eight domains show three source-defined triage actions',async({page})=>{
  await openTriage(page);for(let i=0;i<OBSERVATION_CHECKS.length;i++){const actions=rows(page).nth(i).locator(".platform-incident-triage__evidence-box ul li");await expect(actions).toHaveCount(3);for(const action of TRIAGE_ACTIONS[OBSERVATION_CHECKS[i].domain]){await expect(actions).toContainText(action);}}
 });
 test('PITR-042 Initial outage displays Retry and not false triage rows',async({page})=>{
  await openTriage(page,{status:503});await expect(root(page).getByRole("alert")).toContainText("Unable to load Commercial Launch Incident Triage.");await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PITR-043 Retry recovers eight rows after temporary API error',async({page})=>{
  let down=true;await openTriage(page,{respond:(m,p)=>m==="GET"&&p===TRIAGE_PATH&&down?{json:{message:"Service unavailable"},status:503}:undefined});await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();down=false;await root(page).getByRole("button",{name:"Retry",exact:true}).click();await expect(rows(page)).toHaveCount(8);
 });
 test('PITR-044 Refresh error retains last successful incident triage snapshot',async({page})=>{
  let down=false;await openTriage(page,{respond:(m,p)=>m==="GET"&&p===TRIAGE_PATH&&down?{json:{message:"Synthetic refresh failure"},status:503}:undefined});await expect(rows(page)).toHaveCount(8);down=true;await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(root(page).locator(".platform-incident-triage__feedback--warning")).toContainText("Showing the last successful");await expect(rows(page)).toHaveCount(8);
 });
 test('PITR-045 Empty triage response does not imply incident free launch',async({page})=>{
  await openTriage(page,{alter:s=>({...s,triage_rows:[]})});await expect(root(page).locator(".platform-incident-triage__empty-state")).toContainText("not evidence that the launch is incident-free");await expect(rows(page)).toHaveCount(0);
 });
 test('PITR-046 Source posture panel references four upstream decision pages',async({page})=>{
  await openTriage(page);for(const label of ["Post-launch observation","Launch command center","Smoke test","Go/No-Go register"]){await expect(context(page)).toContainText(label);}
 });
 test('PITR-047 Both observation and triage persistence are not observable',async({page})=>{
  await openTriage(page);await expect(context(page).locator(".platform-incident-triage__persistence-grid")).toContainText("External records not observable");await expect(context(page).locator(".platform-incident-triage__persistence-grid > div")).toHaveCount(2);
 });
 test('PITR-048 Four triage rules display before decision making',async({page})=>{
  await openTriage(page);await expect(root(page).locator(".platform-incident-triage__rules-grid .app-panel").first().locator("li")).toHaveCount(4);
 });
 test('PITR-049 Four limitations prohibit external mutation claims',async({page})=>{
  await openTriage(page);await expect(root(page).locator(".platform-incident-triage__rules-grid .app-panel").last().locator("li")).toHaveCount(4);
 });
 test('PITR-050 No incident approval save or rollback action button is offered',async({page})=>{
  await openTriage(page);await expect(root(page).getByRole("button",{name:/^(Save|Approve|Resolve incident|Trigger rollback|Send message|Activate billing)$/i})).toHaveCount(0);
 });
 test('PITR-051 Missing required security permission denies triage access',async({page})=>{
  await openTriage(page,{permissions:TRIAGE_PERMISSIONS.filter(p=>p!=="platform.security.read"),expectHeading:false});await expect(root(page)).toHaveCount(0);
 });
 test('PITR-052 Browser triage refresh never performs mutation requests',async({page})=>{
  const writes:string[]=[];await openTriage(page,{onCall:(m,p)=>{if(!["GET","OPTIONS"].includes(m))writes.push(`${m} ${p}`);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();expect(writes).toEqual([]);
 });
 test('PITR-053 Mobile view retains keyboard focus on Refresh action',async({page})=>{
  await page.setViewportSize({width:390,height:760});await openTriage(page);const b=root(page).getByRole("button",{name:"Refresh",exact:true});await b.focus();await expect(b).toBeFocused();
 });
 test('PITR-054 Refresh retains the eight source-defined incident triage rows',async({page})=>{
  await openTriage(page);await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(8);
 });
 test('PITR-055 Invalid generated timestamp is not rendered as valid',async({page})=>{
  await openTriage(page,{alter:s=>({...s,generated_at:"invalid"})});await expect(root(page).locator(".platform-incident-triage__hero-aside")).toContainText("Not available");
 });
 test('PITR-056 Triage source requirements remain unchanged after refresh',async({page})=>{
  await openTriage(page);const prior=await rows(page).locator(".platform-incident-triage__evidence-box ul li").allTextContents();await root(page).getByRole("button",{name:"Refresh",exact:true}).click();expect(await rows(page).locator(".platform-incident-triage__evidence-box ul li").allTextContents()).toEqual(prior);
 });
 test('PITR-057 Manual preconditions shown for every triage domain',async({page})=>{
  await openTriage(page);for(const row of await rows(page).all()){await expect(row.locator(".platform-incident-triage__precondition-box")).toContainText("Resolve");}
 });
 test('PITR-058 Triage severity chips remain read only after refresh',async({page})=>{
  await openTriage(page);await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page).locator(".platform-incident-triage__field-groups input, .platform-incident-triage__field-groups textarea, .platform-incident-triage__field-groups select")).toHaveCount(0);
 });
 test('PITR-059 Unauthorized GET cannot create a triage success assertion',async({page})=>{
  await openTriage(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PITR-060 Triage 500 response keeps retry visible',async({page})=>{
  await openTriage(page,{status:500});await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PITR-061 Recovery from transient triage API failure restores eight rows',async({page})=>{
  let fail=true;await openTriage(page,{respond:(m,p)=>m==="GET"&&p===TRIAGE_PATH&&fail?{json:{message:"Temporary outage"},status:503}:undefined});await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();fail=false;await root(page).getByRole("button",{name:"Retry",exact:true}).click();await expect(rows(page)).toHaveCount(8);
 });
 test('PITR-062 No triage stored records claimed after reload',async({page})=>{
  await openTriage(page);await page.reload();await expect(root(page).getByLabel("Incident triage summary")).toContainText("Triage records stored here");await expect(context(page).locator(".platform-incident-triage__persistence-grid")).toContainText("External records not observable");
 });
 test('PITR-063 Missing observation persistence metadata is not reported as stored',async({page})=>{
  await openTriage(page,{alter:s=>({...s,post_launch_observation_persistence:null})});await expect(context(page).locator(".platform-incident-triage__persistence-grid")).toContainText("Not reported");
 });
 test('PITR-064 Default severity is explicitly a template not observed classification',async({page})=>{
  await openTriage(page);for(const row of await rows(page).all()){await expect(row.locator(".platform-incident-triage__source-summary")).toContainText("Template default only");}
 });
 test('PITR-065 External artifacts have no in-application edit fields',async({page})=>{
  await openTriage(page);await expect(rows(page).locator(".platform-incident-triage__artifact-grid input, .platform-incident-triage__artifact-grid textarea, .platform-incident-triage__artifact-grid button")).toHaveCount(0);
 });
 test('PITR-066 Triage status after refresh preserves domain count',async({page})=>{
  await openTriage(page,{kind:"go"});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(8);await expect(rows(page).first()).toContainText("Waiting for external go no go confirmation");
 });
 test('PITR-067 Source observation codes remain stable across reload',async({page})=>{
  await openTriage(page);const codes=await rows(page).locator(".platform-incident-triage__source-summary strong").allTextContents();await page.reload();expect(await rows(page).locator(".platform-incident-triage__source-summary strong").allTextContents()).toEqual(codes);
 });
 test('PITR-068 Incident triage has no ticket mutation buttons',async({page})=>{
  await openTriage(page);await expect(root(page).getByRole("button",{name:/^(Close incident|Resolve ticket|Send message|Trigger rollback|Save triage)$/i})).toHaveCount(0);
 });
 test('PITR-069 Triage not reviewed severity is neutral rather than successful',async({page})=>{
  await openTriage(page);await expect(rows(page).first().locator(".platform-incident-triage__field-groups [data-tone=neutral]")).not.toHaveCount(0);
 });
 test('PITR-070 Browser reload does not create write calls',async({page})=>{
  const writes:string[]=[];await openTriage(page,{onCall:(m,p)=>{if(!["GET","OPTIONS"].includes(m))writes.push(`${m} ${p}`);}});await page.reload();expect(writes).toEqual([]);
 });
});
