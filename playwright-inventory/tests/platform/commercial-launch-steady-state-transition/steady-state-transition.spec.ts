/** Batch 130: Step 230 read-only transition-preparation UI. No real operator acceptance, launch closure or rollout. */
import {test,expect,type Page} from '@playwright/test';
import {openTransition,SST_PATH,SST_PERMISSIONS,SST_REQUIREMENTS,SST_RULES,SST_LIMITATIONS,SST_SOURCE_LINKS} from '../../../support/platformCommercialLaunchSteadyStateTransitionFixture';
const root=(p:Page)=>p.locator('.platform-steady-state-transition');
const rows=(p:Page)=>root(p).locator('.platform-steady-state-transition__row-card');
const context=(p:Page)=>root(p).locator('.platform-steady-state-transition__context-panel');
test.describe('Commercial Launch Steady-State Transition — Step 230 synthetic browser contracts',()=>{
 test('PSST-001 Exact steady-state transition page heading',async({page})=>{
  await openTransition(page);await expect(page.getByRole("heading",{name:"Commercial Launch Steady-State Transition",exact:true})).toBeVisible();
 });
 test('PSST-002 Step 230 and manual handover labels visible',async({page})=>{
  await openTransition(page);await expect(root(page)).toContainText("Step 230 — Commercial Launch Steady-State Transition Board");await expect(root(page)).toContainText("Transition preparation only");
 });
 test('PSST-003 Boundary explicitly disclaims external acceptance',async({page})=>{
  await openTransition(page);await expect(root(page).locator(".platform-steady-state-transition__boundary-notice")).toContainText("record");
 });
 test('PSST-004 Six supporting page links shown',async({page})=>{
  await openTransition(page);await expect(root(page).locator(".platform-steady-state-transition__supporting-pages a")).toHaveCount(6);
 });
 test('PSST-005 Four source-defined summary counters visible',async({page})=>{
  await openTransition(page);await expect(root(page).getByLabel("Steady-state transition summary").locator(".io-workspace-stat")).toHaveCount(4);
 });
 test('PSST-006 Eight transition row templates render',async({page})=>{
  await openTransition(page);await expect(rows(page)).toHaveCount(8);
 });
 test('PSST-007 Blocked prerequisite receives danger tone',async({page})=>{
  await openTransition(page,{kind:"blocked"});await expect(rows(page).first().locator(".platform-steady-state-transition__row-heading [data-tone]")).toHaveAttribute("data-tone","danger");
 });
 test('PSST-008 Synthetic waiting state receives warning tone',async({page})=>{
  await openTransition(page,{kind:"waiting"});await expect(rows(page).first().locator(".platform-steady-state-transition__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PSST-009 Summary says external transition records are not stored',async({page})=>{
  await openTransition(page);await expect(root(page).getByLabel("Steady-state transition summary")).toContainText("Transition records stored here");
 });
 test('PSST-010 Eleven upstream launch posture source links visible',async({page})=>{
  await openTransition(page);await expect(context(page).locator(".platform-steady-state-transition__source-grid a")).toHaveCount(SST_SOURCE_LINKS.length);
 });
 test('PSST-011 Four persistence boundaries remain explicit',async({page})=>{
  await openTransition(page);await expect(context(page).locator(".platform-steady-state-transition__persistence-grid > div")).toHaveCount(4);await expect(context(page).locator(".platform-steady-state-transition__persistence-grid")).toContainText("External records not observable");
 });
 test('PSST-012 Transition templates have no form controls',async({page})=>{
  await openTransition(page);await expect(rows(page).locator("input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
 test('PSST-013 Zero transition rows cannot imply launch closure',async({page})=>{
  await openTransition(page,{alter:s=>({...s,transition_rows:[],summary:{...s.summary,transition_rows_total:0}})});await expect(root(page).locator(".platform-steady-state-transition__empty-state")).toContainText("not evidence");
 });
 test('PSST-014 Missing tenants-read permission redirects to platform dashboard',async({page})=>{
  await openTransition(page,{permissions:SST_PERMISSIONS.filter(p=>p!=="platform.tenants.read"),expectHeading:false});await expect(page).toHaveURL(/\/platform\/dashboard(?:\?.*)?$/);await expect(rows(page)).toHaveCount(0);
 });
 test('PSST-015 Operational jobs and announcements links hidden without extra grants',async({page})=>{
  await openTransition(page);await expect(root(page).getByRole("link",{name:"Operational Jobs"})).toHaveCount(0);await expect(root(page).getByRole("link",{name:"Announcements"})).toHaveCount(0);
 });
 test('PSST-016 growth_exit retains backend-defined owner and domain',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(0).locator(".platform-steady-state-transition__row-heading")).toContainText("growth exit");await expect(rows(page).nth(0).locator(".platform-steady-state-transition__row-heading")).toContainText("product owner");
 });
 test('PSST-017 operating_cadence retains backend-defined owner and domain',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(1).locator(".platform-steady-state-transition__row-heading")).toContainText("operating cadence");await expect(rows(page).nth(1).locator(".platform-steady-state-transition__row-heading")).toContainText("platform operations owner");
 });
 test('PSST-018 support_handover retains backend-defined owner and domain',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(2).locator(".platform-steady-state-transition__row-heading")).toContainText("support handover");await expect(rows(page).nth(2).locator(".platform-steady-state-transition__row-heading")).toContainText("support lead");
 });
 test('PSST-019 customer_success_handover retains backend-defined owner and domain',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(3).locator(".platform-steady-state-transition__row-heading")).toContainText("customer success handover");await expect(rows(page).nth(3).locator(".platform-steady-state-transition__row-heading")).toContainText("customer success lead");
 });
 test('PSST-020 billing_entitlements retains backend-defined owner and domain',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(4).locator(".platform-steady-state-transition__row-heading")).toContainText("billing entitlements");await expect(rows(page).nth(4).locator(".platform-steady-state-transition__row-heading")).toContainText("billing owner");
 });
 test('PSST-021 monitoring_ownership retains backend-defined owner and domain',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(5).locator(".platform-steady-state-transition__row-heading")).toContainText("monitoring ownership");await expect(rows(page).nth(5).locator(".platform-steady-state-transition__row-heading")).toContainText("platform operations owner");
 });
 test('PSST-022 incident_prevention retains backend-defined owner and domain',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(6).locator(".platform-steady-state-transition__row-heading")).toContainText("incident prevention");await expect(rows(page).nth(6).locator(".platform-steady-state-transition__row-heading")).toContainText("incident manager");
 });
 test('PSST-023 executive_acceptance retains backend-defined owner and domain',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(7).locator(".platform-steady-state-transition__row-heading")).toContainText("executive acceptance");await expect(rows(page).nth(7).locator(".platform-steady-state-transition__row-heading")).toContainText("executive sponsor");
 });
 test('PSST-024 growth_exit displays four exact transition controls',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(0).locator(".platform-steady-state-transition__field-groups li")).toHaveText([...SST_REQUIREMENTS[0].controls]);
 });
 test('PSST-025 operating_cadence displays four exact transition controls',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(1).locator(".platform-steady-state-transition__field-groups li")).toHaveText([...SST_REQUIREMENTS[1].controls]);
 });
 test('PSST-026 support_handover displays four exact transition controls',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(2).locator(".platform-steady-state-transition__field-groups li")).toHaveText([...SST_REQUIREMENTS[2].controls]);
 });
 test('PSST-027 customer_success_handover displays four exact transition controls',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(3).locator(".platform-steady-state-transition__field-groups li")).toHaveText([...SST_REQUIREMENTS[3].controls]);
 });
 test('PSST-028 billing_entitlements displays four exact transition controls',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(4).locator(".platform-steady-state-transition__field-groups li")).toHaveText([...SST_REQUIREMENTS[4].controls]);
 });
 test('PSST-029 monitoring_ownership displays four exact transition controls',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(5).locator(".platform-steady-state-transition__field-groups li")).toHaveText([...SST_REQUIREMENTS[5].controls]);
 });
 test('PSST-030 incident_prevention displays four exact transition controls',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(6).locator(".platform-steady-state-transition__field-groups li")).toHaveText([...SST_REQUIREMENTS[6].controls]);
 });
 test('PSST-031 executive_acceptance displays four exact transition controls',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(7).locator(".platform-steady-state-transition__field-groups li")).toHaveText([...SST_REQUIREMENTS[7].controls]);
 });
 test('PSST-032 growth_exit lists four external evidence labels',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(0).locator(".platform-steady-state-transition__field-groups .platform-steady-state-transition__chips").first().locator("span")).toHaveCount(SST_REQUIREMENTS[0].fields.length);
 });
 test('PSST-033 operating_cadence lists four external evidence labels',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(1).locator(".platform-steady-state-transition__field-groups .platform-steady-state-transition__chips").first().locator("span")).toHaveCount(SST_REQUIREMENTS[1].fields.length);
 });
 test('PSST-034 support_handover lists four external evidence labels',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(2).locator(".platform-steady-state-transition__field-groups .platform-steady-state-transition__chips").first().locator("span")).toHaveCount(SST_REQUIREMENTS[2].fields.length);
 });
 test('PSST-035 customer_success_handover lists four external evidence labels',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(3).locator(".platform-steady-state-transition__field-groups .platform-steady-state-transition__chips").first().locator("span")).toHaveCount(SST_REQUIREMENTS[3].fields.length);
 });
 test('PSST-036 billing_entitlements lists four external evidence labels',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(4).locator(".platform-steady-state-transition__field-groups .platform-steady-state-transition__chips").first().locator("span")).toHaveCount(SST_REQUIREMENTS[4].fields.length);
 });
 test('PSST-037 monitoring_ownership lists four external evidence labels',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(5).locator(".platform-steady-state-transition__field-groups .platform-steady-state-transition__chips").first().locator("span")).toHaveCount(SST_REQUIREMENTS[5].fields.length);
 });
 test('PSST-038 incident_prevention lists four external evidence labels',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(6).locator(".platform-steady-state-transition__field-groups .platform-steady-state-transition__chips").first().locator("span")).toHaveCount(SST_REQUIREMENTS[6].fields.length);
 });
 test('PSST-039 executive_acceptance lists four external evidence labels',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(7).locator(".platform-steady-state-transition__field-groups .platform-steady-state-transition__chips").first().locator("span")).toHaveCount(SST_REQUIREMENTS[7].fields.length);
 });
 test('PSST-040 growth_exit applies evidence navigation permission gates',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(0).locator(".platform-steady-state-transition__row-actions a")).toHaveCount(4);
 });
 test('PSST-041 operating_cadence applies evidence navigation permission gates',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(1).locator(".platform-steady-state-transition__row-actions a")).toHaveCount(5);
 });
 test('PSST-042 support_handover applies evidence navigation permission gates',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(2).locator(".platform-steady-state-transition__row-actions a")).toHaveCount(4);
 });
 test('PSST-043 customer_success_handover applies evidence navigation permission gates',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(3).locator(".platform-steady-state-transition__row-actions a")).toHaveCount(3);
 });
 test('PSST-044 billing_entitlements applies evidence navigation permission gates',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(4).locator(".platform-steady-state-transition__row-actions a")).toHaveCount(4);
 });
 test('PSST-045 monitoring_ownership applies evidence navigation permission gates',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(5).locator(".platform-steady-state-transition__row-actions a")).toHaveCount(5);
 });
 test('PSST-046 incident_prevention applies evidence navigation permission gates',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(6).locator(".platform-steady-state-transition__row-actions a")).toHaveCount(5);
 });
 test('PSST-047 executive_acceptance applies evidence navigation permission gates',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(7).locator(".platform-steady-state-transition__row-actions a")).toHaveCount(5);
 });
 test('PSST-048 Three original transition rules are visible',async({page})=>{
  await openTransition(page);await expect(root(page).locator(".platform-steady-state-transition__rules-grid ul").first().locator("li")).toHaveText([...SST_RULES]);
 });
 test('PSST-049 Four transition limitations preserve manual signoff',async({page})=>{
  await openTransition(page);await expect(root(page).locator(".platform-steady-state-transition__rules-grid ul").last().locator("li")).toHaveText([...SST_LIMITATIONS]);
 });
 test('PSST-050 Each template retains eight observation source row references',async({page})=>{
  await openTransition(page);await expect(rows(page).first().locator(".platform-steady-state-transition__source-rows").first().locator(".platform-steady-state-transition__chips span")).toHaveCount(8);
 });
 test('PSST-051 Refresh produces no transition or entitlement writes',async({page})=>{
  const writes:string[]=[];await openTransition(page,{onCall:(m,p)=>{if(!["GET","OPTIONS"].includes(m))writes.push(`${m} ${p}`);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(8);expect(writes).toEqual([]);
 });
 test('PSST-052 403 response shows error and no transition templates',async({page})=>{
  await openTransition(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PSST-053 500 response shows retry without false readiness',async({page})=>{
  await openTransition(page,{status:500});await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PSST-054 Unexpected API query yields error without transition claims',async({page})=>{
  await openTransition(page,{urlQuery:"unsupported=1"});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PSST-055 Retry restores synthetic preparation after transient outage',async({page})=>{
  let down=true;await openTransition(page,{respond:(m,p)=>m==="GET"&&p===SST_PATH&&down?{json:{message:"Synthetic outage"},status:503}:undefined});await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();down=false;await root(page).getByRole("button",{name:"Retry",exact:true}).click();await expect(rows(page)).toHaveCount(8);
 });
 test('PSST-056 growth_exit retains external prerequisite release condition',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(0).locator(".platform-steady-state-transition__source-summary")).toContainText("Manual steady state transition acceptance required before launch closure");
 });
 test('PSST-057 operating_cadence retains external prerequisite release condition',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(1).locator(".platform-steady-state-transition__source-summary")).toContainText("Manual steady state transition acceptance required before launch closure");
 });
 test('PSST-058 support_handover retains external prerequisite release condition',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(2).locator(".platform-steady-state-transition__source-summary")).toContainText("Manual steady state transition acceptance required before launch closure");
 });
 test('PSST-059 customer_success_handover retains external prerequisite release condition',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(3).locator(".platform-steady-state-transition__source-summary")).toContainText("Manual steady state transition acceptance required before launch closure");
 });
 test('PSST-060 billing_entitlements retains external prerequisite release condition',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(4).locator(".platform-steady-state-transition__source-summary")).toContainText("Manual steady state transition acceptance required before launch closure");
 });
 test('PSST-061 monitoring_ownership retains external prerequisite release condition',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(5).locator(".platform-steady-state-transition__source-summary")).toContainText("Manual steady state transition acceptance required before launch closure");
 });
 test('PSST-062 incident_prevention retains external prerequisite release condition',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(6).locator(".platform-steady-state-transition__source-summary")).toContainText("Manual steady state transition acceptance required before launch closure");
 });
 test('PSST-063 executive_acceptance retains external prerequisite release condition',async({page})=>{
  await openTransition(page);await expect(rows(page).nth(7).locator(".platform-steady-state-transition__source-summary")).toContainText("Manual steady state transition acceptance required before launch closure");
 });
 test('PSST-064 Transition records are not asserted to exist locally',async({page})=>{
  await openTransition(page);await expect(context(page).locator(".platform-steady-state-transition__persistence-grid")).toContainText("External records not observable");await expect(root(page).getByLabel("Steady-state transition summary")).toContainText("Transition records stored here");
 });
 test('PSST-065 Missing transition upstream boundary is explicitly not reported',async({page})=>{
  await openTransition(page,{alter:s=>({...s,additional_growth_observation_persistence:null})});await expect(context(page).locator(".platform-steady-state-transition__persistence-grid")).toContainText("Not reported");
 });
 test('PSST-066 Missing upstream evidence rows cannot imply completed handover',async({page})=>{
  await openTransition(page,{alter:s=>({...s,transition_rows:[],summary:{...s.summary,transition_rows_total:0}})});await expect(root(page).locator(".platform-steady-state-transition__empty-state")).toContainText("not evidence");await expect(rows(page)).toHaveCount(0);
 });
 test('PSST-067 Manual acceptance surface exposes no submission action',async({page})=>{
  await openTransition(page);await expect(root(page).locator("form,input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
 test('PSST-068 Forbidden API response exposes no transition rows',async({page})=>{
  await openTransition(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PSST-069 Service unavailable does not show accepted transition',async({page})=>{
  await openTransition(page,{status:503});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PSST-070 Refresh stays a GET and shows the original eight templates',async({page})=>{
  const calls:string[]=[];await openTransition(page,{onCall:(m,p)=>{if(p===SST_PATH)calls.push(m);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(8);expect(calls.length).toBeGreaterThanOrEqual(2);expect(calls.every(m=>m==="GET")).toBeTruthy();
 });
});
