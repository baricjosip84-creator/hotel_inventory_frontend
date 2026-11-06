/** Batch 132: Step 232 read-only exception review browser contracts. No real incident/exception acceptance. */
import {test,expect,type Page} from '@playwright/test';
import {openExceptionReview,SSER_PATH,SSER_PERMISSIONS,SSER_REQUIREMENTS,SSER_RULES,SSER_LINK_COUNTS} from '../../../support/platformCommercialLaunchSteadyStateExceptionReviewFixture';
const root=(p:Page)=>p.locator('.platform-steady-state-exception-review');
const rows=(p:Page)=>root(p).locator('.platform-steady-state-exception-review__row-card');
const context=(p:Page)=>root(p).locator('.platform-steady-state-exception-review__context-panel');
test.describe('Commercial Launch Steady-State Exception Review — Step 232 synthetic browser contracts',()=>{
 test('PSSER-001 Exception Review heading renders',async({page})=>{
  await openExceptionReview(page);await expect(page.getByRole("heading",{name:"Commercial Launch Steady-State Exception Review",exact:true})).toBeVisible();
 });
 test('PSSER-002 Step 232 and preparation only badges remain visible',async({page})=>{
  await openExceptionReview(page);await expect(root(page)).toContainText("Step 232 — Commercial Launch Steady-State Exception Review Queue");await expect(root(page)).toContainText("Exception review preparation only");
 });
 test('PSSER-003 Manual exception-review boundary is explicit',async({page})=>{
  await openExceptionReview(page);await expect(root(page).locator(".platform-steady-state-exception-review__boundary-notice")).toContainText("Independently confirm");
 });
 test('PSSER-004 Seven supporting page links render',async({page})=>{
  await openExceptionReview(page);await expect(root(page).locator(".platform-steady-state-exception-review__supporting-pages a")).toHaveCount(7);
 });
 test('PSSER-005 Seven backend-defined summary counters render',async({page})=>{
  await openExceptionReview(page);await expect(root(page).getByLabel("Steady-state exception review summary").locator(".io-workspace-stat")).toHaveCount(7);
 });
 test('PSSER-006 All nine exception review templates render',async({page})=>{
  await openExceptionReview(page);await expect(rows(page)).toHaveCount(SSER_REQUIREMENTS.length);
 });
 test('PSSER-007 Critical severity template has danger tone',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(1).locator(".platform-steady-state-exception-review__row-badges [data-tone]").first()).toHaveAttribute("data-tone","danger");
 });
 test('PSSER-008 Medium severity template has neutral tone',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(2).locator(".platform-steady-state-exception-review__row-badges [data-tone]").first()).toHaveAttribute("data-tone","neutral");
 });
 test('PSSER-009 Exception review records remain unpersisted in fixture',async({page})=>{
  await openExceptionReview(page);await expect(root(page).getByLabel("Steady-state exception review summary")).toContainText("Exception-review records stored here");await expect(context(page)).toContainText("External records not observable");
 });
 test('PSSER-010 Thirteen upstream source links remain visible',async({page})=>{
  await openExceptionReview(page);await expect(context(page).locator(".platform-steady-state-exception-review__source-grid a")).toHaveCount(13);
 });
 test('PSSER-011 Six persistence boundaries render',async({page})=>{
  await openExceptionReview(page);await expect(context(page).locator(".platform-steady-state-exception-review__persistence-grid > div")).toHaveCount(6);
 });
 test('PSSER-012 Exception cards expose no editable controls',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).locator("input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
 test('PSSER-013 Empty response does not imply exception-free operations',async({page})=>{
  await openExceptionReview(page,{alter:s=>({...s,exception_rows:[],summary:{...s.summary,exception_rows_total:0}})});await expect(root(page).locator(".platform-steady-state-exception-review__empty-state")).toContainText("not evidence");await expect(rows(page)).toHaveCount(0);
 });
 test('PSSER-014 Missing required tenant permission redirects to platform dashboard',async({page})=>{
  await openExceptionReview(page,{permissions:SSER_PERMISSIONS.filter(p=>p!=="platform.tenants.read"),expectHeading:false});await expect(page).toHaveURL(/\/platform\/dashboard(?:\?.*)?$/);await expect(rows(page)).toHaveCount(0);
 });
 test('PSSER-015 Optional jobs announcements and releases links remain hidden',async({page})=>{
  await openExceptionReview(page);await expect(root(page).getByRole("link",{name:"Operational Jobs"})).toHaveCount(0);await expect(root(page).getByRole("link",{name:"Announcements"})).toHaveCount(0);await expect(root(page).getByRole("link",{name:"Releases"})).toHaveCount(0);
 });
 test('PSSER-016 Exact three exception rules and four limitations render',async({page})=>{
  await openExceptionReview(page);await expect(root(page).locator(".platform-steady-state-exception-review__rules-grid ul").first().locator("li")).toHaveText([...SSER_RULES]);await expect(root(page).locator(".platform-steady-state-exception-review__rules-grid ul").last().locator("li")).toHaveCount(4);
 });
 test('PSSER-017 Forbidden backend response does not show exception rows',async({page})=>{
  await openExceptionReview(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PSSER-018 Unavailable backend surfaces retry button',async({page})=>{
  await openExceptionReview(page,{status:503});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PSSER-019 Refreshing exception board remains GET-only',async({page})=>{
  const calls:string[]=[];await openExceptionReview(page,{onCall:(m,p)=>{if(p===SSER_PATH)calls.push(m);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(SSER_REQUIREMENTS.length);expect(calls.length).toBeGreaterThanOrEqual(2);expect(calls.every(m=>m==="GET")).toBeTruthy();
 });
 test('PSSER-020 missed_cadence exact owner and severity template',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(0).locator(".platform-steady-state-exception-review__row-heading")).toContainText("Platform operations owner");await expect(rows(page).nth(0).locator(".platform-steady-state-exception-review__row-badges")).toContainText("High severity hint");
 });
 test('PSSER-021 health_regression exact owner and severity template',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(1).locator(".platform-steady-state-exception-review__row-heading")).toContainText("Platform operations owner");await expect(rows(page).nth(1).locator(".platform-steady-state-exception-review__row-badges")).toContainText("Critical severity hint");
 });
 test('PSSER-022 customer_adoption_risk exact owner and severity template',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(2).locator(".platform-steady-state-exception-review__row-heading")).toContainText("Customer success lead");await expect(rows(page).nth(2).locator(".platform-steady-state-exception-review__row-badges")).toContainText("Medium severity hint");
 });
 test('PSSER-023 support_sla_risk exact owner and severity template',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(3).locator(".platform-steady-state-exception-review__row-heading")).toContainText("Support lead");await expect(rows(page).nth(3).locator(".platform-steady-state-exception-review__row-badges")).toContainText("High severity hint");
 });
 test('PSSER-024 billing_entitlement_exception exact owner and severity template',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(4).locator(".platform-steady-state-exception-review__row-heading")).toContainText("Billing owner");await expect(rows(page).nth(4).locator(".platform-steady-state-exception-review__row-badges")).toContainText("High severity hint");
 });
 test('PSSER-025 backup_restore_gap exact owner and severity template',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(5).locator(".platform-steady-state-exception-review__row-heading")).toContainText("Platform operations owner");await expect(rows(page).nth(5).locator(".platform-steady-state-exception-review__row-badges")).toContainText("Critical severity hint");
 });
 test('PSSER-026 deployment_smoke_test_gap exact owner and severity template',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(6).locator(".platform-steady-state-exception-review__row-heading")).toContainText("Release manager");await expect(rows(page).nth(6).locator(".platform-steady-state-exception-review__row-badges")).toContainText("High severity hint");
 });
 test('PSSER-027 incident_prevention_gap exact owner and severity template',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(7).locator(".platform-steady-state-exception-review__row-heading")).toContainText("Incident manager");await expect(rows(page).nth(7).locator(".platform-steady-state-exception-review__row-badges")).toContainText("High severity hint");
 });
 test('PSSER-028 growth_governance_exception exact owner and severity template',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(8).locator(".platform-steady-state-exception-review__row-heading")).toContainText("Product owner");await expect(rows(page).nth(8).locator(".platform-steady-state-exception-review__row-badges")).toContainText("Medium severity hint");
 });
 test('PSSER-029 missed_cadence preserves three exception controls',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(0).locator(".platform-steady-state-exception-review__field-groups li")).toHaveText([...SSER_REQUIREMENTS[0].controls]);
 });
 test('PSSER-030 health_regression preserves three exception controls',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(1).locator(".platform-steady-state-exception-review__field-groups li")).toHaveText([...SSER_REQUIREMENTS[1].controls]);
 });
 test('PSSER-031 customer_adoption_risk preserves three exception controls',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(2).locator(".platform-steady-state-exception-review__field-groups li")).toHaveText([...SSER_REQUIREMENTS[2].controls]);
 });
 test('PSSER-032 support_sla_risk preserves three exception controls',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(3).locator(".platform-steady-state-exception-review__field-groups li")).toHaveText([...SSER_REQUIREMENTS[3].controls]);
 });
 test('PSSER-033 billing_entitlement_exception preserves three exception controls',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(4).locator(".platform-steady-state-exception-review__field-groups li")).toHaveText([...SSER_REQUIREMENTS[4].controls]);
 });
 test('PSSER-034 backup_restore_gap preserves three exception controls',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(5).locator(".platform-steady-state-exception-review__field-groups li")).toHaveText([...SSER_REQUIREMENTS[5].controls]);
 });
 test('PSSER-035 deployment_smoke_test_gap preserves three exception controls',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(6).locator(".platform-steady-state-exception-review__field-groups li")).toHaveText([...SSER_REQUIREMENTS[6].controls]);
 });
 test('PSSER-036 incident_prevention_gap preserves three exception controls',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(7).locator(".platform-steady-state-exception-review__field-groups li")).toHaveText([...SSER_REQUIREMENTS[7].controls]);
 });
 test('PSSER-037 growth_governance_exception preserves three exception controls',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(8).locator(".platform-steady-state-exception-review__field-groups li")).toHaveText([...SSER_REQUIREMENTS[8].controls]);
 });
 test('PSSER-038 missed_cadence preserves four review evidence requirements',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(0).locator(".platform-steady-state-exception-review__field-groups .platform-steady-state-exception-review__chips").first().locator("span")).toHaveText(SSER_REQUIREMENTS[0].fields.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSSER-039 health_regression preserves four review evidence requirements',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(1).locator(".platform-steady-state-exception-review__field-groups .platform-steady-state-exception-review__chips").first().locator("span")).toHaveText(SSER_REQUIREMENTS[1].fields.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSSER-040 customer_adoption_risk preserves four review evidence requirements',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(2).locator(".platform-steady-state-exception-review__field-groups .platform-steady-state-exception-review__chips").first().locator("span")).toHaveText(SSER_REQUIREMENTS[2].fields.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSSER-041 support_sla_risk preserves four review evidence requirements',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(3).locator(".platform-steady-state-exception-review__field-groups .platform-steady-state-exception-review__chips").first().locator("span")).toHaveText(SSER_REQUIREMENTS[3].fields.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSSER-042 billing_entitlement_exception preserves four review evidence requirements',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(4).locator(".platform-steady-state-exception-review__field-groups .platform-steady-state-exception-review__chips").first().locator("span")).toHaveText(SSER_REQUIREMENTS[4].fields.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSSER-043 backup_restore_gap preserves four review evidence requirements',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(5).locator(".platform-steady-state-exception-review__field-groups .platform-steady-state-exception-review__chips").first().locator("span")).toHaveText(SSER_REQUIREMENTS[5].fields.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSSER-044 deployment_smoke_test_gap preserves four review evidence requirements',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(6).locator(".platform-steady-state-exception-review__field-groups .platform-steady-state-exception-review__chips").first().locator("span")).toHaveText(SSER_REQUIREMENTS[6].fields.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSSER-045 incident_prevention_gap preserves four review evidence requirements',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(7).locator(".platform-steady-state-exception-review__field-groups .platform-steady-state-exception-review__chips").first().locator("span")).toHaveText(SSER_REQUIREMENTS[7].fields.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSSER-046 growth_governance_exception preserves four review evidence requirements',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(8).locator(".platform-steady-state-exception-review__field-groups .platform-steady-state-exception-review__chips").first().locator("span")).toHaveText(SSER_REQUIREMENTS[8].fields.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSSER-047 missed_cadence applies source evidence link visibility',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(0).locator(".platform-steady-state-exception-review__row-actions a")).toHaveCount(SSER_LINK_COUNTS.missed_cadence);
 });
 test('PSSER-048 health_regression applies source evidence link visibility',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(1).locator(".platform-steady-state-exception-review__row-actions a")).toHaveCount(SSER_LINK_COUNTS.health_regression);
 });
 test('PSSER-049 customer_adoption_risk applies source evidence link visibility',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(2).locator(".platform-steady-state-exception-review__row-actions a")).toHaveCount(SSER_LINK_COUNTS.customer_adoption_risk);
 });
 test('PSSER-050 support_sla_risk applies source evidence link visibility',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(3).locator(".platform-steady-state-exception-review__row-actions a")).toHaveCount(SSER_LINK_COUNTS.support_sla_risk);
 });
 test('PSSER-051 billing_entitlement_exception applies source evidence link visibility',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(4).locator(".platform-steady-state-exception-review__row-actions a")).toHaveCount(SSER_LINK_COUNTS.billing_entitlement_exception);
 });
 test('PSSER-052 backup_restore_gap applies source evidence link visibility',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(5).locator(".platform-steady-state-exception-review__row-actions a")).toHaveCount(SSER_LINK_COUNTS.backup_restore_gap);
 });
 test('PSSER-053 deployment_smoke_test_gap applies source evidence link visibility',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(6).locator(".platform-steady-state-exception-review__row-actions a")).toHaveCount(SSER_LINK_COUNTS.deployment_smoke_test_gap);
 });
 test('PSSER-054 incident_prevention_gap applies source evidence link visibility',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(7).locator(".platform-steady-state-exception-review__row-actions a")).toHaveCount(SSER_LINK_COUNTS.incident_prevention_gap);
 });
 test('PSSER-055 growth_governance_exception applies source evidence link visibility',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(8).locator(".platform-steady-state-exception-review__row-actions a")).toHaveCount(SSER_LINK_COUNTS.growth_governance_exception);
 });
 test('PSSER-056 missed_cadence requires independent exception review acceptance',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(0).locator(".platform-steady-state-exception-review__source-summary")).toContainText("Manual exception review required before commercial launch steady state can be closed");
 });
 test('PSSER-057 health_regression requires independent exception review acceptance',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(1).locator(".platform-steady-state-exception-review__source-summary")).toContainText("Manual exception review required before commercial launch steady state can be closed");
 });
 test('PSSER-058 customer_adoption_risk requires independent exception review acceptance',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(2).locator(".platform-steady-state-exception-review__source-summary")).toContainText("Manual exception review required before commercial launch steady state can be closed");
 });
 test('PSSER-059 support_sla_risk requires independent exception review acceptance',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(3).locator(".platform-steady-state-exception-review__source-summary")).toContainText("Manual exception review required before commercial launch steady state can be closed");
 });
 test('PSSER-060 billing_entitlement_exception requires independent exception review acceptance',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(4).locator(".platform-steady-state-exception-review__source-summary")).toContainText("Manual exception review required before commercial launch steady state can be closed");
 });
 test('PSSER-061 backup_restore_gap requires independent exception review acceptance',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(5).locator(".platform-steady-state-exception-review__source-summary")).toContainText("Manual exception review required before commercial launch steady state can be closed");
 });
 test('PSSER-062 deployment_smoke_test_gap requires independent exception review acceptance',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(6).locator(".platform-steady-state-exception-review__source-summary")).toContainText("Manual exception review required before commercial launch steady state can be closed");
 });
 test('PSSER-063 incident_prevention_gap requires independent exception review acceptance',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(7).locator(".platform-steady-state-exception-review__source-summary")).toContainText("Manual exception review required before commercial launch steady state can be closed");
 });
 test('PSSER-064 growth_governance_exception requires independent exception review acceptance',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).nth(8).locator(".platform-steady-state-exception-review__source-summary")).toContainText("Manual exception review required before commercial launch steady state can be closed");
 });
 test('PSSER-065 Missing cadence persistence surfaces not reported',async({page})=>{
  await openExceptionReview(page,{alter:s=>({...s,operations_cadence_persistence:null as unknown as typeof s.operations_cadence_persistence})});await expect(context(page).locator(".platform-steady-state-exception-review__persistence-grid")).toContainText("Not reported");
 });
 test('PSSER-066 Every exception row retains the manual-review boundary',async({page})=>{
  await openExceptionReview(page);await expect(rows(page).locator(".platform-steady-state-exception-review__source-summary")).toHaveCount(SSER_REQUIREMENTS.length);await expect(root(page).locator(".platform-steady-state-exception-review__boundary-notice")).toContainText("Independently confirm");
 });
 test('PSSER-067 Forbidden response exposes no exception templates',async({page})=>{
  await openExceptionReview(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PSSER-068 Service failure exposes retry without exception templates',async({page})=>{
  await openExceptionReview(page,{status:503});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PSSER-069 No editable acceptance controls are present',async({page})=>{
  await openExceptionReview(page);await expect(root(page).locator("form,input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
 test('PSSER-070 Exception Review refresh uses GET and preserves original nine templates',async({page})=>{
  const calls:string[]=[];await openExceptionReview(page,{onCall:(m,p)=>{if(p===SSER_PATH)calls.push(m);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(SSER_REQUIREMENTS.length);expect(calls.length).toBeGreaterThanOrEqual(2);expect(calls.every(m=>m==="GET")).toBeTruthy();
 });
});
