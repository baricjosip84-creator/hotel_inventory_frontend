/** Batch 141, Step 241: synthetic browser assertions; not external accepted-renewal proof. */
import {test,expect,type Page} from '@playwright/test';
import {openRetentionRenewalAcceptanceDocket,RRAD_PATH,RRAD_PERMISSIONS,RRAD_REQUIRED_FIELDS,RRAD_RULES,RRAD_CONTROLS,RRAD_LINK_COUNTS} from '../../../support/platformCommercialLaunchRetentionRenewalAcceptanceDocketFixture';
import {SSER_REQUIREMENTS} from '../../../support/platformCommercialLaunchSteadyStateExceptionReviewFixture';
const root=(p:Page)=>p.locator('.platform-retention-renewal-acceptance');
const rows=(p:Page)=>root(p).locator('.platform-retention-renewal-acceptance__row-card');
const context=(p:Page)=>root(p).locator('.platform-retention-renewal-acceptance__context-panel');
test.describe('Commercial Launch Retention Renewal Acceptance Docket — Step 241 synthetic browser contracts',()=>{
 test('PRRAD-001 Acceptance docket heading is present',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(page.getByRole("heading",{name:"Commercial Launch Retention Renewal Acceptance Docket",exact:true})).toBeVisible();
 });
 test('PRRAD-002 Step 241 and preparation only wording',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(root(page)).toContainText("Step 241 — Commercial Launch Retention Renewal Acceptance Docket");await expect(root(page)).toContainText("Retention renewal acceptance preparation only");
 });
 test('PRRAD-003 External renewal review confirmation prerequisite',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(root(page).locator(".platform-retention-renewal-acceptance__boundary-notice")).toContainText("Independently confirm");
 });
 test('PRRAD-004 Thirteen unconditional navigation links',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(root(page).locator(".platform-retention-renewal-acceptance__supporting-pages a")).toHaveCount(13);
 });
 test('PRRAD-005 Seven source-defined summary cards',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(root(page).getByLabel("Retention renewal acceptance docket summary").locator(".io-workspace-stat")).toHaveCount(7);
 });
 test('PRRAD-006 All nine acceptance templates appear',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page)).toHaveCount(Object.keys(RRAD_REQUIRED_FIELDS).length);
 });
 test('PRRAD-007 Critical rows display critical badge',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-acceptance__row-badges [data-tone]").first()).toHaveAttribute("data-tone","danger");
 });
 test('PRRAD-008 Medium severity is neutral',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-acceptance__row-badges [data-tone]").first()).toHaveAttribute("data-tone","neutral");
 });
 test('PRRAD-009 Zero local acceptances does not prove none exist',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(root(page).getByLabel("Retention renewal acceptance docket summary")).toContainText("Acceptance records stored here");await expect(context(page)).toContainText("External records not observable");
 });
 test('PRRAD-010 Fourteen upstream posture links',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(context(page).locator(".platform-retention-renewal-acceptance__source-grid a")).toHaveCount(14);
 });
 test('PRRAD-011 Fifteen persistence statements',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(context(page).locator(".platform-retention-renewal-acceptance__persistence-grid > div")).toHaveCount(15);
 });
 test('PRRAD-012 No editable controls inside acceptance cards',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).locator("form,input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
 test('PRRAD-013 Empty results show no external acceptance inference',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page,{alter:s=>({...s,retention_renewal_acceptance_docket_rows:[],summary:{...s.summary,retention_renewal_acceptance_rows_total:0}})});await expect(root(page).locator(".platform-retention-renewal-acceptance__empty-state")).toContainText("not evidence");await expect(rows(page)).toHaveCount(0);
 });
 test('PRRAD-014 Missing tenant permission redirects',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page,{permissions:RRAD_PERMISSIONS.filter(p=>p!=="platform.tenants.read"),expectHeading:false});await expect(page).toHaveURL(/\/platform\/dashboard(?:\?.*)?$/);await expect(rows(page)).toHaveCount(0);
 });
 test('PRRAD-015 Optional releases and announcements hidden',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(root(page).getByRole("link",{name:"Announcements"})).toHaveCount(0);await expect(root(page).getByRole("link",{name:"Releases"})).toHaveCount(0);
 });
 test('PRRAD-016 Rules and limitations display source exact text',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(root(page).locator(".platform-retention-renewal-acceptance__rules-grid ul").first().locator("li")).toHaveText([...RRAD_RULES]);await expect(root(page).locator(".platform-retention-renewal-acceptance__rules-grid ul").last().locator("li")).toHaveCount(4);
 });
 test('PRRAD-017 Forbidden API response hides docket rows',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PRRAD-018 Service failure provides retry control',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page,{status:503});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();
 });
 test('PRRAD-019 Refresh remains read-only GET',async({page})=>{
  const calls:string[]=[];await openRetentionRenewalAcceptanceDocket(page,{onCall:(m,p)=>{if(p===RRAD_PATH)calls.push(m);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(9);expect(calls.length).toBeGreaterThanOrEqual(2);expect(calls.every(m=>m==="GET")).toBeTruthy();
 });
 test('PRRAD-020 missed_cadence owner and severity remain visible',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-acceptance__row-heading")).toContainText(SSER_REQUIREMENTS[0].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(0).locator(".platform-retention-renewal-acceptance__row-badges")).toContainText(SSER_REQUIREMENTS[0].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRAD-021 health_regression owner and severity remain visible',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-acceptance__row-heading")).toContainText(SSER_REQUIREMENTS[1].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(1).locator(".platform-retention-renewal-acceptance__row-badges")).toContainText(SSER_REQUIREMENTS[1].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRAD-022 customer_adoption_risk owner and severity remain visible',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-acceptance__row-heading")).toContainText(SSER_REQUIREMENTS[2].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(2).locator(".platform-retention-renewal-acceptance__row-badges")).toContainText(SSER_REQUIREMENTS[2].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRAD-023 support_sla_risk owner and severity remain visible',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-acceptance__row-heading")).toContainText(SSER_REQUIREMENTS[3].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(3).locator(".platform-retention-renewal-acceptance__row-badges")).toContainText(SSER_REQUIREMENTS[3].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRAD-024 billing_entitlement_exception owner and severity remain visible',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-acceptance__row-heading")).toContainText(SSER_REQUIREMENTS[4].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(4).locator(".platform-retention-renewal-acceptance__row-badges")).toContainText(SSER_REQUIREMENTS[4].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRAD-025 backup_restore_gap owner and severity remain visible',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-acceptance__row-heading")).toContainText(SSER_REQUIREMENTS[5].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(5).locator(".platform-retention-renewal-acceptance__row-badges")).toContainText(SSER_REQUIREMENTS[5].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRAD-026 deployment_smoke_test_gap owner and severity remain visible',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-acceptance__row-heading")).toContainText(SSER_REQUIREMENTS[6].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(6).locator(".platform-retention-renewal-acceptance__row-badges")).toContainText(SSER_REQUIREMENTS[6].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRAD-027 incident_prevention_gap owner and severity remain visible',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-acceptance__row-heading")).toContainText(SSER_REQUIREMENTS[7].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(7).locator(".platform-retention-renewal-acceptance__row-badges")).toContainText(SSER_REQUIREMENTS[7].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRAD-028 growth_governance_exception owner and severity remain visible',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-acceptance__row-heading")).toContainText(SSER_REQUIREMENTS[8].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(8).locator(".platform-retention-renewal-acceptance__row-badges")).toContainText(SSER_REQUIREMENTS[8].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRAD-029 missed_cadence exact acceptance evidence fields',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-acceptance__field-groups .platform-retention-renewal-acceptance__chips").nth(7).locator("span")).toHaveText(RRAD_REQUIRED_FIELDS.missed_cadence.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRAD-030 health_regression exact acceptance evidence fields',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-acceptance__field-groups .platform-retention-renewal-acceptance__chips").nth(7).locator("span")).toHaveText(RRAD_REQUIRED_FIELDS.health_regression.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRAD-031 customer_adoption_risk exact acceptance evidence fields',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-acceptance__field-groups .platform-retention-renewal-acceptance__chips").nth(7).locator("span")).toHaveText(RRAD_REQUIRED_FIELDS.customer_adoption_risk.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRAD-032 support_sla_risk exact acceptance evidence fields',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-acceptance__field-groups .platform-retention-renewal-acceptance__chips").nth(7).locator("span")).toHaveText(RRAD_REQUIRED_FIELDS.support_sla_risk.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRAD-033 billing_entitlement_exception exact acceptance evidence fields',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-acceptance__field-groups .platform-retention-renewal-acceptance__chips").nth(7).locator("span")).toHaveText(RRAD_REQUIRED_FIELDS.billing_entitlement_exception.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRAD-034 backup_restore_gap exact acceptance evidence fields',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-acceptance__field-groups .platform-retention-renewal-acceptance__chips").nth(7).locator("span")).toHaveText(RRAD_REQUIRED_FIELDS.backup_restore_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRAD-035 deployment_smoke_test_gap exact acceptance evidence fields',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-acceptance__field-groups .platform-retention-renewal-acceptance__chips").nth(7).locator("span")).toHaveText(RRAD_REQUIRED_FIELDS.deployment_smoke_test_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRAD-036 incident_prevention_gap exact acceptance evidence fields',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-acceptance__field-groups .platform-retention-renewal-acceptance__chips").nth(7).locator("span")).toHaveText(RRAD_REQUIRED_FIELDS.incident_prevention_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRAD-037 growth_governance_exception exact acceptance evidence fields',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-acceptance__field-groups .platform-retention-renewal-acceptance__chips").nth(7).locator("span")).toHaveText(RRAD_REQUIRED_FIELDS.growth_governance_exception.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRAD-038 missed_cadence manual acceptance controls remain explicit',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-acceptance__field-groups li")).toHaveText([...RRAD_CONTROLS]);
 });
 test('PRRAD-039 health_regression manual acceptance controls remain explicit',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-acceptance__field-groups li")).toHaveText([...RRAD_CONTROLS]);
 });
 test('PRRAD-040 customer_adoption_risk manual acceptance controls remain explicit',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-acceptance__field-groups li")).toHaveText([...RRAD_CONTROLS]);
 });
 test('PRRAD-041 support_sla_risk manual acceptance controls remain explicit',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-acceptance__field-groups li")).toHaveText([...RRAD_CONTROLS]);
 });
 test('PRRAD-042 billing_entitlement_exception manual acceptance controls remain explicit',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-acceptance__field-groups li")).toHaveText([...RRAD_CONTROLS]);
 });
 test('PRRAD-043 backup_restore_gap manual acceptance controls remain explicit',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-acceptance__field-groups li")).toHaveText([...RRAD_CONTROLS]);
 });
 test('PRRAD-044 deployment_smoke_test_gap manual acceptance controls remain explicit',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-acceptance__field-groups li")).toHaveText([...RRAD_CONTROLS]);
 });
 test('PRRAD-045 incident_prevention_gap manual acceptance controls remain explicit',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-acceptance__field-groups li")).toHaveText([...RRAD_CONTROLS]);
 });
 test('PRRAD-046 growth_governance_exception manual acceptance controls remain explicit',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-acceptance__field-groups li")).toHaveText([...RRAD_CONTROLS]);
 });
 test('PRRAD-047 missed_cadence permission-scoped navigation links',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-acceptance__row-actions a")).toHaveCount(RRAD_LINK_COUNTS.missed_cadence);
 });
 test('PRRAD-048 health_regression permission-scoped navigation links',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-acceptance__row-actions a")).toHaveCount(RRAD_LINK_COUNTS.health_regression);
 });
 test('PRRAD-049 customer_adoption_risk permission-scoped navigation links',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-acceptance__row-actions a")).toHaveCount(RRAD_LINK_COUNTS.customer_adoption_risk);
 });
 test('PRRAD-050 support_sla_risk permission-scoped navigation links',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-acceptance__row-actions a")).toHaveCount(RRAD_LINK_COUNTS.support_sla_risk);
 });
 test('PRRAD-051 billing_entitlement_exception permission-scoped navigation links',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-acceptance__row-actions a")).toHaveCount(RRAD_LINK_COUNTS.billing_entitlement_exception);
 });
 test('PRRAD-052 backup_restore_gap permission-scoped navigation links',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-acceptance__row-actions a")).toHaveCount(RRAD_LINK_COUNTS.backup_restore_gap);
 });
 test('PRRAD-053 deployment_smoke_test_gap permission-scoped navigation links',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-acceptance__row-actions a")).toHaveCount(RRAD_LINK_COUNTS.deployment_smoke_test_gap);
 });
 test('PRRAD-054 incident_prevention_gap permission-scoped navigation links',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-acceptance__row-actions a")).toHaveCount(RRAD_LINK_COUNTS.incident_prevention_gap);
 });
 test('PRRAD-055 growth_governance_exception permission-scoped navigation links',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-acceptance__row-actions a")).toHaveCount(RRAD_LINK_COUNTS.growth_governance_exception);
 });
 test('PRRAD-056 missed_cadence renewal review ancestry remains visible',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-acceptance__source-summary > div").first()).toContainText("Source Retention Renewal Review row");await expect(rows(page).nth(0).locator(".platform-retention-renewal-acceptance__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRAD-057 health_regression renewal review ancestry remains visible',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-acceptance__source-summary > div").first()).toContainText("Source Retention Renewal Review row");await expect(rows(page).nth(1).locator(".platform-retention-renewal-acceptance__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRAD-058 customer_adoption_risk renewal review ancestry remains visible',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-acceptance__source-summary > div").first()).toContainText("Source Retention Renewal Review row");await expect(rows(page).nth(2).locator(".platform-retention-renewal-acceptance__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRAD-059 support_sla_risk renewal review ancestry remains visible',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-acceptance__source-summary > div").first()).toContainText("Source Retention Renewal Review row");await expect(rows(page).nth(3).locator(".platform-retention-renewal-acceptance__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRAD-060 billing_entitlement_exception renewal review ancestry remains visible',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-acceptance__source-summary > div").first()).toContainText("Source Retention Renewal Review row");await expect(rows(page).nth(4).locator(".platform-retention-renewal-acceptance__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRAD-061 backup_restore_gap renewal review ancestry remains visible',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-acceptance__source-summary > div").first()).toContainText("Source Retention Renewal Review row");await expect(rows(page).nth(5).locator(".platform-retention-renewal-acceptance__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRAD-062 deployment_smoke_test_gap renewal review ancestry remains visible',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-acceptance__source-summary > div").first()).toContainText("Source Retention Renewal Review row");await expect(rows(page).nth(6).locator(".platform-retention-renewal-acceptance__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRAD-063 incident_prevention_gap renewal review ancestry remains visible',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-acceptance__source-summary > div").first()).toContainText("Source Retention Renewal Review row");await expect(rows(page).nth(7).locator(".platform-retention-renewal-acceptance__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRAD-064 growth_governance_exception renewal review ancestry remains visible',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-acceptance__source-summary > div").first()).toContainText("Source Retention Renewal Review row");await expect(rows(page).nth(8).locator(".platform-retention-renewal-acceptance__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRAD-065 Absent source review persistence is reported unknown',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page,{alter:s=>({...s,retention_renewal_review_persistence:null})});await expect(context(page).locator(".platform-retention-renewal-acceptance__persistence-grid")).toContainText("Not reported");
 });
 test('PRRAD-066 Absent source_cadence_statuses does not produce an inferred acceptance',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page,{alter:s=>({...s,retention_renewal_acceptance_docket_rows:s.retention_renewal_acceptance_docket_rows.map((r,i)=>i===0?{...r,source_cadence_statuses:[]}:r)})});await expect(rows(page).first().locator(".platform-retention-renewal-acceptance__source-rows").nth(0)).toContainText("None reported");
 });
 test('PRRAD-067 Absent source_transition_rows does not produce an inferred acceptance',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page,{alter:s=>({...s,retention_renewal_acceptance_docket_rows:s.retention_renewal_acceptance_docket_rows.map((r,i)=>i===0?{...r,source_transition_rows:[]}:r)})});await expect(rows(page).first().locator(".platform-retention-renewal-acceptance__source-rows").nth(1)).toContainText("None reported");
 });
 test('PRRAD-068 Absent source_observation_rows does not produce an inferred acceptance',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page,{alter:s=>({...s,retention_renewal_acceptance_docket_rows:s.retention_renewal_acceptance_docket_rows.map((r,i)=>i===0?{...r,source_observation_rows:[]}:r)})});await expect(rows(page).first().locator(".platform-retention-renewal-acceptance__source-rows").nth(2)).toContainText("None reported");
 });
 test('PRRAD-069 Absent source_authorization_rows does not produce an inferred acceptance',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page,{alter:s=>({...s,retention_renewal_acceptance_docket_rows:s.retention_renewal_acceptance_docket_rows.map((r,i)=>i===0?{...r,source_authorization_rows:[]}:r)})});await expect(rows(page).first().locator(".platform-retention-renewal-acceptance__source-rows").nth(3)).toContainText("None reported");
 });
 test('PRRAD-070 External acceptance release condition remains visible',async({page})=>{
  await openRetentionRenewalAcceptanceDocket(page);await expect(rows(page).first().locator(".platform-retention-renewal-acceptance__source-summary")).toContainText("Release condition");await expect(rows(page).locator("form,input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
});
