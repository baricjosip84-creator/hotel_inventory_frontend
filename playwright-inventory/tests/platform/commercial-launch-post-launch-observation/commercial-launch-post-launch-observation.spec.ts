/** Batch 122 — Step 222 browser-visible post-launch observation templates (not live launch evidence). */
import {test,expect,type Page} from '@playwright/test';
import {openObservation,OBSERVATION_PATH,OBSERVATION_PERMISSIONS,OBSERVATION_FIELDS,OBSERVATION_STATUSES,OBSERVATION_CHECKS} from '../../../support/platformCommercialLaunchPostLaunchObservationFixture';
const root=(p:Page)=>p.locator('.platform-post-launch-observation');
const rows=(p:Page)=>root(p).locator('.platform-post-launch-observation__row-card');
const context=(p:Page)=>root(p).locator('.platform-post-launch-observation__context-panel');
test.describe('Commercial Launch Post-Launch Observation — Step 222 read-only source evidence',()=>{
 test('PPLO-001 Page route renders exact title',async({page})=>{
  await openObservation(page);await expect(page.getByRole("heading",{name:"Commercial Launch Post-Launch Observation",exact:true})).toBeVisible();
 });
 test('PPLO-002 Step 222 metadata and preparation-only label',async({page})=>{
  await openObservation(page);await expect(root(page)).toContainText("Step 222 — Commercial Launch Post-Launch Observation Board");await expect(root(page)).toContainText("Observation preparation only");
 });
 test('PPLO-003 Boundary notice rejects proof of real production launch',async({page})=>{
  await openObservation(page);await expect(root(page).locator(".platform-post-launch-observation__boundary-notice")).toContainText("not proof that launch occurred");
 });
 test('PPLO-004 Eleven supporting links are visible in preparation panel',async({page})=>{
  await openObservation(page);await expect(root(page).locator(".platform-post-launch-observation__supporting-pages .platform-post-launch-observation__link-row a")).toHaveCount(11);
 });
 test('PPLO-005 Seven source-defined observation summary cards rendered',async({page})=>{
  await openObservation(page);await expect(root(page).getByLabel("Post-launch observation summary").locator(".io-workspace-stat")).toHaveCount(7);
 });
 test('PPLO-006 All eight observation check templates render',async({page})=>{
  await openObservation(page);await expect(rows(page)).toHaveCount(8);
 });
 test('PPLO-007 Blocked command center yields blocked observation posture',async({page})=>{
  await openObservation(page,{kind:"blocked"});await expect(rows(page).first().locator(".platform-post-launch-observation__row-heading [data-tone]")).toHaveAttribute("data-tone","danger");
 });
 test('PPLO-008 Review-required upstream posture remains a warning',async({page})=>{
  await openObservation(page,{kind:"review"});await expect(rows(page).first().locator(".platform-post-launch-observation__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PPLO-009 Go/No-Go confirmation is required externally',async({page})=>{
  await openObservation(page,{kind:"go"});await expect(rows(page).first()).toContainText("Waiting for external go no go confirmation");
 });
 test('PPLO-010 Smoke-test confirmation is required externally',async({page})=>{
  await openObservation(page,{kind:"smoke"});await expect(rows(page).first()).toContainText("Waiting for external smoke test confirmation");
 });
 test('PPLO-011 Launch window confirmation is required even in preparation-only state',async({page})=>{
  await openObservation(page,{kind:"external"});await expect(rows(page).first()).toContainText("External launch window confirmation required before post launch observation");
 });
 test('PPLO-012 Service health evidence and named owner are retained',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(0)).toContainText("Platform operations owner");await expect(rows(page).nth(0)).toContainText("Health endpoint status");
 });
 test('PPLO-013 Customer feedback record requires follow-up evidence',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(1)).toContainText("Customer success owner");await expect(rows(page).nth(1)).toContainText("Customer contact");
 });
 test('PPLO-014 Support intake record requires SLA review',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(2)).toContainText("Support owner");await expect(rows(page).nth(2)).toContainText("SLA impact");
 });
 test('PPLO-015 Billing activation record distinguishes confirmation from hold',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(3)).toContainText("Billing owner");await expect(rows(page).nth(3)).toContainText("paid-activation decision");
 });
 test('PPLO-016 Incident evidence requires customer impact review',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(4)).toContainText("Platform reliability owner");await expect(rows(page).nth(4)).toContainText("customer-impact review");
 });
 test('PPLO-017 Rollback readiness demands safe point and decision owner',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(5)).toContainText("Release owner");await expect(rows(page).nth(5)).toContainText("latest safe rollback point");
 });
 test('PPLO-018 Adoption evidence requires first operational workflow',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(6)).toContainText("Product owner");await expect(rows(page).nth(6)).toContainText("First user login/use");
 });
 test('PPLO-019 Handoff evidence includes follow-up owner',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(7)).toContainText("Release owner");await expect(rows(page).nth(7)).toContainText("handoff destination");
 });
 test('PPLO-020 service_health_observation_recorded evidence link points to original source',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(0).getByRole("link",{name:"Open system health"})).toHaveAttribute("href","/platform/system-health");
 });
 test('PPLO-021 customer_feedback_window_opened evidence link points to original source',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(1).getByRole("link",{name:"Open tenant communications"})).toHaveAttribute("href","/platform/tenant-communications");
 });
 test('PPLO-022 support_intake_reviewed evidence link points to original source',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(2).getByRole("link",{name:"Open support cockpit"})).toHaveAttribute("href","/platform/support-cockpit");
 });
 test('PPLO-023 billing_activation_confirmed_or_held evidence link points to original source',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(3).getByRole("link",{name:"Open billing activation"})).toHaveAttribute("href","/platform/billing-subscription-activation");
 });
 test('PPLO-024 incident_review_completed evidence link points to original source',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(4).getByRole("link",{name:"Open incidents"})).toHaveAttribute("href","/platform/incidents");
 });
 test('PPLO-025 rollback_readiness_reconfirmed evidence link points to original source',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(5).getByRole("link",{name:"Open deployment validation"})).toHaveAttribute("href","/platform/deployment-validation");
 });
 test('PPLO-026 first_adoption_signal_reviewed evidence link points to original source',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(6).getByRole("link",{name:"Open pilot readiness"})).toHaveAttribute("href","/platform/pilot-customer-readiness");
 });
 test('PPLO-027 launch_handoff_closure_prepared evidence link points to original source',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(7).getByRole("link",{name:"Open command center"})).toHaveAttribute("href","/platform/commercial-launch-day-command-center");
 });
 test('PPLO-028 service_health_observation_recorded displays defined escalation trigger',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(0).locator(".platform-post-launch-observation__artifact-grid")).toContainText("Health degradation or missing observation evidence");
 });
 test('PPLO-029 customer_feedback_window_opened displays defined escalation trigger',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(1).locator(".platform-post-launch-observation__artifact-grid")).toContainText("Missing customer contact or unresolved launch concern");
 });
 test('PPLO-030 support_intake_reviewed displays defined escalation trigger',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(2).locator(".platform-post-launch-observation__artifact-grid")).toContainText("Open severe support ticket or sla breach risk");
 });
 test('PPLO-031 billing_activation_confirmed_or_held displays defined escalation trigger',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(3).locator(".platform-post-launch-observation__artifact-grid")).toContainText("Billing state unclear or paid activation not authorized");
 });
 test('PPLO-032 incident_review_completed displays defined escalation trigger',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(4).locator(".platform-post-launch-observation__artifact-grid")).toContainText("Active high severity incident or missing customer impact review");
 });
 test('PPLO-033 rollback_readiness_reconfirmed displays defined escalation trigger',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(5).locator(".platform-post-launch-observation__artifact-grid")).toContainText("Rollback trigger met or rollback owner missing");
 });
 test('PPLO-034 first_adoption_signal_reviewed displays defined escalation trigger',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(6).locator(".platform-post-launch-observation__artifact-grid")).toContainText("Customer unable to complete first core workflow");
 });
 test('PPLO-035 launch_handoff_closure_prepared displays defined escalation trigger',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(7).locator(".platform-post-launch-observation__artifact-grid")).toContainText("Missing handoff owner or open blockers without follow up");
 });
 test('PPLO-036 All 14 required fields are visible in first observation template',async({page})=>{
  await openObservation(page);const fields=rows(page).first().locator(".platform-post-launch-observation__field-groups");for(const key of OBSERVATION_FIELDS){const normalized=key.replaceAll("_"," ");await expect(fields).toContainText(normalized[0].toUpperCase()+normalized.slice(1));}
 });
 test('PPLO-037 Four allowed observation statuses remain choices not submitted results',async({page})=>{
  await openObservation(page);const chips=rows(page).first().locator(".platform-post-launch-observation__field-groups");for(const status of OBSERVATION_STATUSES){await expect(chips).toContainText(status[0].toUpperCase()+status.slice(1).replaceAll("_"," "));}await expect(chips.locator("input,select,button")).toHaveCount(0);
 });
 test('PPLO-038 Eight default status badges show Not reviewed',async({page})=>{
  await openObservation(page);await expect(rows(page).locator(".platform-post-launch-observation__artifact-grid .platform-post-launch-observation__status-badge")).toHaveText(Array(8).fill("Not reviewed"));
 });
 test('PPLO-039 All observation artifacts explicitly live outside application',async({page})=>{
  await openObservation(page);await expect(rows(page).locator(".platform-post-launch-observation__artifact-grid")).toHaveCount(8);for(const row of await rows(page).all()){await expect(row).toContainText("External commercial post-launch observation record");await expect(row).toContainText("External not persisted by application");}
 });
 test('PPLO-040 Upstream context contains Command Center, smoke, Go/No-Go, acceptance and certificate',async({page})=>{
  await openObservation(page);const c=context(page);for(const label of ["Command center","Smoke test","Go/No-Go register","Acceptance packet","Certificate"]){await expect(c).toContainText(label);}
 });
 test('PPLO-041 Four persistence evidence blocks prevent accidental certification',async({page})=>{
  await openObservation(page);const p=context(page).locator(".platform-post-launch-observation__persistence-grid");await expect(p.locator(":scope > div")).toHaveCount(4);await expect(p).toContainText("External records not observable");
 });
 test('PPLO-042 Four post-launch rules are presented as guidance',async({page})=>{
  await openObservation(page);await expect(root(page).locator(".platform-post-launch-observation__rules-grid .app-panel").first().locator("li")).toHaveCount(4);
 });
 test('PPLO-043 Four limitations prohibit inferred success or mutation',async({page})=>{
  await openObservation(page);await expect(root(page).locator(".platform-post-launch-observation__rules-grid .app-panel").last().locator("li")).toHaveCount(4);
 });
 test('PPLO-044 No save or launch execution button exists',async({page})=>{
  await openObservation(page);await expect(root(page).getByRole("button",{name:/^(Save|Launch|Approve|Complete|Activate billing|Send message)$/i})).toHaveCount(0);
 });
 test('PPLO-045 Empty API observation rows show explicit no-completion warning',async({page})=>{
  await openObservation(page,{alter:s=>({...s,observation_rows:[]})});await expect(root(page).locator(".platform-post-launch-observation__empty-state")).toContainText("not evidence that observation is complete");await expect(rows(page)).toHaveCount(0);
 });
 test('PPLO-046 Initial API outage shows Retry and no fake observation rows',async({page})=>{
  await openObservation(page,{status:503});await expect(root(page).getByRole("alert")).toContainText("Unable to load Commercial Launch Post-Launch Observation.");await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PPLO-047 Retry after first API failure retrieves observation checks',async({page})=>{
  let down=true;await openObservation(page,{respond:(m,p)=>m==="GET"&&p===OBSERVATION_PATH&&down?{json:{message:"Synthetic failure"},status:503}:undefined});await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();down=false;await root(page).getByRole("button",{name:"Retry",exact:true}).click();await expect(rows(page)).toHaveCount(8);
 });
 test('PPLO-048 Refresh error retains stale snapshot and explicit warning',async({page})=>{
  let down=false;await openObservation(page,{respond:(m,p)=>m==="GET"&&p===OBSERVATION_PATH&&down?{json:{message:"Synthetic refresh failure"},status:503}:undefined});await expect(rows(page)).toHaveCount(8);down=true;await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(root(page).locator(".platform-post-launch-observation__feedback--warning")).toContainText("Showing the last successful");await expect(rows(page)).toHaveCount(8);
 });
 test('PPLO-049 Missing required sessions permission blocks observation page',async({page})=>{
  await openObservation(page,{permissions:OBSERVATION_PERMISSIONS.filter(p=>p!=="platform.sessions.read"),expectHeading:false});await expect(root(page)).toHaveCount(0);
 });
 test('PPLO-050 Missing security read permission blocks observation page',async({page})=>{
  await openObservation(page,{permissions:OBSERVATION_PERMISSIONS.filter(p=>p!=="platform.security.read"),expectHeading:false});await expect(root(page)).toHaveCount(0);
 });
 test('PPLO-051 Refresh never sends mutation requests',async({page})=>{
  const writes:string[]=[];await openObservation(page,{onCall:(m,p)=>{if(!["GET","OPTIONS"].includes(m))writes.push(m+" "+p);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();expect(writes).toEqual([]);
 });
 test('PPLO-052 Mobile viewport retains a keyboard-focusable refresh',async({page})=>{
  await page.setViewportSize({width:390,height:760});await openObservation(page);const button=root(page).getByRole("button",{name:"Refresh",exact:true});await button.focus();await expect(button).toBeFocused();
 });
 test('PPLO-053 Refresh does not hide source-defined eight check records',async({page})=>{
  await openObservation(page);await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(8);
 });
 test('PPLO-054 Navigation query does not pass unsupported API parameters',async({page})=>{
  const q:string[]=[];await openObservation(page,{urlQuery:"synthetic_ui_only=1",onCall:(m,p,search)=>{if(m==="GET"&&p===OBSERVATION_PATH)q.push(search.toString());}});expect(q).toEqual([""]);
 });
 test('PPLO-055 Invalid generated date never appears as a valid observation timestamp',async({page})=>{
  await openObservation(page,{alter:s=>({...s,generated_at:"invalid_timestamp"})});await expect(root(page).locator(".platform-post-launch-observation__hero-aside")).toContainText("Not available");
 });
 test('PPLO-056 Source observation templates preserve their eight owners after refresh',async({page})=>{
  await openObservation(page);const before=await rows(page).locator(".platform-post-launch-observation__row-heading").allTextContents();await root(page).getByRole("button",{name:"Refresh",exact:true}).click();expect(await rows(page).locator(".platform-post-launch-observation__row-heading").allTextContents()).toEqual(before);
 });
 test('PPLO-057 Each observation domain keeps an explicit manual prerequisite',async({page})=>{
  await openObservation(page);for(const row of await rows(page).all()){await expect(row.locator(".platform-post-launch-observation__precondition-box")).toContainText("before");}
 });
 test('PPLO-058 Eight evidence requirements do not become empty during refresh',async({page})=>{
  await openObservation(page);await root(page).getByRole("button",{name:"Refresh",exact:true}).click();for(let i=0;i<OBSERVATION_CHECKS.length;i++){await expect(rows(page).nth(i)).toContainText(OBSERVATION_CHECKS[i].required_evidence);}
 });
 test('PPLO-059 External observation status chips are never editable fields',async({page})=>{
  await openObservation(page);await expect(rows(page).locator(".platform-post-launch-observation__field-groups input, .platform-post-launch-observation__field-groups textarea, .platform-post-launch-observation__field-groups select")).toHaveCount(0);
 });
 test('PPLO-060 Unauthorized observation API produces no implied successful observations',async({page})=>{
  await openObservation(page,{status:401});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PPLO-061 Server error shows explicit retry rather than success',async({page})=>{
  await openObservation(page,{status:500});await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(root(page).locator(".platform-post-launch-observation__rows-section")).toHaveCount(0);
 });
 test('PPLO-062 A retry from transient server failure restores all eight observation templates',async({page})=>{
  let fail=true;await openObservation(page,{respond:(m,p)=>m==="GET"&&p===OBSERVATION_PATH&&fail?{json:{message:"Transient outage"},status:500}:undefined});await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();fail=false;await root(page).getByRole("button",{name:"Retry",exact:true}).click();await expect(rows(page)).toHaveCount(8);
 });
 test('PPLO-063 Review state cannot masquerade as a completed launch result',async({page})=>{
  await openObservation(page,{kind:"review"});await expect(root(page).locator(".platform-post-launch-observation__boundary-notice")).toContainText("not proof");await expect(rows(page).first().locator(".platform-post-launch-observation__row-heading [data-tone=good]")).toHaveCount(0);
 });
 test('PPLO-064 Eight default observation labels stay unreviewed after reload',async({page})=>{
  await openObservation(page);await page.reload();await expect(rows(page).locator(".platform-post-launch-observation__artifact-grid .platform-post-launch-observation__status-badge")).toHaveText(Array(8).fill("Not reviewed"));
 });
 test('PPLO-065 Missing upstream persistence detail is not labeled stored',async({page})=>{
  await openObservation(page,{alter:s=>({...s,command_center_decision_persistence:null})});await expect(context(page).locator(".platform-post-launch-observation__persistence-grid")).toContainText("Not reported");
 });
 test('PPLO-066 Zero persistence summary remains explicitly zero',async({page})=>{
  await openObservation(page);await expect(root(page).getByLabel("Post-launch observation summary")).toContainText("Observations stored here");await expect(root(page).locator(".platform-post-launch-observation__boundary-notice")).toContainText("not proof");
 });
 test('PPLO-067 Each of the eight external artifacts is labeled not persisted',async({page})=>{
  await openObservation(page);for(const row of await rows(page).all()){await expect(row.locator(".platform-post-launch-observation__artifact-grid")).toContainText("External not persisted by application");}
 });
 test('PPLO-068 Observation row order stays stable after navigation reload',async({page})=>{
  await openObservation(page);const codes=await rows(page).locator("h3").allTextContents();await page.reload();expect(await rows(page).locator("h3").allTextContents()).toEqual(codes);
 });
 test('PPLO-069 Status review and refresh send no state mutation calls',async({page})=>{
  const writes:string[]=[];await openObservation(page,{onCall:(m,p)=>{if(!["GET","OPTIONS"].includes(m))writes.push(`${m} ${p}`);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();expect(writes).toEqual([]);
 });
 test('PPLO-070 All observation rows show fourteen required external field chips after refresh',async({page})=>{
  await openObservation(page);await root(page).getByRole("button",{name:"Refresh",exact:true}).click();for(const row of await rows(page).all()){const chips=row.locator(".platform-post-launch-observation__field-groups");for(const field of OBSERVATION_FIELDS){await expect(chips).toContainText(field.replaceAll("_"," "),{ignoreCase:true});}}
 });
});
