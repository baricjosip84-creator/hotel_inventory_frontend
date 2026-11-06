/** Batch 140, Step 240: source-grounded synthetic browser assertions, not external renewal approval. */
import {test,expect,type Page} from '@playwright/test';
import {openRetentionRenewalReview,RRR_PATH,RRR_PERMISSIONS,RRR_REQUIRED_FIELDS,RRR_RULES,RRR_CONTROLS,RRR_LINK_COUNTS} from '../../../support/platformCommercialLaunchRetentionRenewalReviewFixture';
import {SSER_REQUIREMENTS} from '../../../support/platformCommercialLaunchSteadyStateExceptionReviewFixture';
const root=(p:Page)=>p.locator('.platform-retention-renewal-review');
const rows=(p:Page)=>root(p).locator('.platform-retention-renewal-review__row-card');
const context=(p:Page)=>root(p).locator('.platform-retention-renewal-review__context-panel');
test.describe('Commercial Launch Retention Renewal Review — Step 240 synthetic browser contracts',()=>{
 test('PRRR-001 Retention renewal review heading renders',async({page})=>{
  await openRetentionRenewalReview(page);await expect(page.getByRole("heading",{name:"Commercial Launch Retention Renewal Review",exact:true})).toBeVisible();
 });
 test('PRRR-002 Step 240 and manual preparation boundary are explicit',async({page})=>{
  await openRetentionRenewalReview(page);await expect(root(page)).toContainText("Step 240 — Commercial Launch Retention Renewal Review Board");await expect(root(page)).toContainText("Retention renewal review preparation only");
 });
 test('PRRR-003 External retention-seal record is a prerequisite',async({page})=>{
  await openRetentionRenewalReview(page);await expect(root(page).locator(".platform-retention-renewal-review__boundary-notice")).toContainText("Independently confirm");
 });
 test('PRRR-004 Twelve unconditional supporting links render',async({page})=>{
  await openRetentionRenewalReview(page);await expect(root(page).locator(".platform-retention-renewal-review__supporting-pages a")).toHaveCount(12);
 });
 test('PRRR-005 Seven renewal summary metrics render',async({page})=>{
  await openRetentionRenewalReview(page);await expect(root(page).getByLabel("Retention renewal review summary").locator(".io-workspace-stat")).toHaveCount(7);
 });
 test('PRRR-006 All nine renewal domains render',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page)).toHaveCount(Object.keys(RRR_REQUIRED_FIELDS).length);
 });
 test('PRRR-007 Critical severity remains template-only',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-review__row-badges [data-tone]").first()).toHaveAttribute("data-tone","danger");
 });
 test('PRRR-008 Medium severity remains neutral template',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-review__row-badges [data-tone]").first()).toHaveAttribute("data-tone","neutral");
 });
 test('PRRR-009 Zero local renewal records is not external proof',async({page})=>{
  await openRetentionRenewalReview(page);await expect(root(page).getByLabel("Retention renewal review summary")).toContainText("Renewal review records stored here");await expect(context(page)).toContainText("External records not observable");
 });
 test('PRRR-010 Thirteen upstream source posture links render',async({page})=>{
  await openRetentionRenewalReview(page);await expect(context(page).locator(".platform-retention-renewal-review__source-grid a")).toHaveCount(13);
 });
 test('PRRR-011 Fourteen persistence boundaries render',async({page})=>{
  await openRetentionRenewalReview(page);await expect(context(page).locator(".platform-retention-renewal-review__persistence-grid > div")).toHaveCount(14);
 });
 test('PRRR-012 No editable renewal acceptance controls exist',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).locator("form,input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
 test('PRRR-013 Empty renewal rows do not certify renewal',async({page})=>{
  await openRetentionRenewalReview(page,{alter:s=>({...s,retention_renewal_review_rows:[],summary:{...s.summary,retention_renewal_review_rows_total:0}})});await expect(root(page).locator(".platform-retention-renewal-review__empty-state")).toContainText("not evidence");await expect(rows(page)).toHaveCount(0);
 });
 test('PRRR-014 Missing tenant permission redirects',async({page})=>{
  await openRetentionRenewalReview(page,{permissions:RRR_PERMISSIONS.filter(p=>p!=="platform.tenants.read"),expectHeading:false});await expect(page).toHaveURL(/\/platform\/dashboard(?:\?.*)?$/);await expect(rows(page)).toHaveCount(0);
 });
 test('PRRR-015 Unpermitted optional announcements and releases are absent',async({page})=>{
  await openRetentionRenewalReview(page);await expect(root(page).getByRole("link",{name:"Announcements"})).toHaveCount(0);await expect(root(page).getByRole("link",{name:"Releases"})).toHaveCount(0);
 });
 test('PRRR-016 Renewal rules and limitations match source',async({page})=>{
  await openRetentionRenewalReview(page);await expect(root(page).locator(".platform-retention-renewal-review__rules-grid ul").first().locator("li")).toHaveText([...RRR_RULES]);await expect(root(page).locator(".platform-retention-renewal-review__rules-grid ul").last().locator("li")).toHaveCount(4);
 });
 test('PRRR-017 Forbidden renewal endpoint exposes no rows',async({page})=>{
  await openRetentionRenewalReview(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PRRR-018 Renewal service error preserves Retry',async({page})=>{
  await openRetentionRenewalReview(page,{status:503});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PRRR-019 Renewal refresh performs GET only',async({page})=>{
  const calls:string[]=[];await openRetentionRenewalReview(page,{onCall:(m,p)=>{if(p===RRR_PATH)calls.push(m);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(Object.keys(RRR_REQUIRED_FIELDS).length);expect(calls.length).toBeGreaterThanOrEqual(2);expect(calls.every(m=>m==="GET")).toBeTruthy();
 });
 test('PRRR-020 missed_cadence owner and severity hint remain visible',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-review__row-heading")).toContainText(SSER_REQUIREMENTS[0].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(0).locator(".platform-retention-renewal-review__row-badges")).toContainText(SSER_REQUIREMENTS[0].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRR-021 health_regression owner and severity hint remain visible',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-review__row-heading")).toContainText(SSER_REQUIREMENTS[1].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(1).locator(".platform-retention-renewal-review__row-badges")).toContainText(SSER_REQUIREMENTS[1].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRR-022 customer_adoption_risk owner and severity hint remain visible',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-review__row-heading")).toContainText(SSER_REQUIREMENTS[2].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(2).locator(".platform-retention-renewal-review__row-badges")).toContainText(SSER_REQUIREMENTS[2].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRR-023 support_sla_risk owner and severity hint remain visible',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-review__row-heading")).toContainText(SSER_REQUIREMENTS[3].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(3).locator(".platform-retention-renewal-review__row-badges")).toContainText(SSER_REQUIREMENTS[3].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRR-024 billing_entitlement_exception owner and severity hint remain visible',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-review__row-heading")).toContainText(SSER_REQUIREMENTS[4].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(4).locator(".platform-retention-renewal-review__row-badges")).toContainText(SSER_REQUIREMENTS[4].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRR-025 backup_restore_gap owner and severity hint remain visible',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-review__row-heading")).toContainText(SSER_REQUIREMENTS[5].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(5).locator(".platform-retention-renewal-review__row-badges")).toContainText(SSER_REQUIREMENTS[5].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRR-026 deployment_smoke_test_gap owner and severity hint remain visible',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-review__row-heading")).toContainText(SSER_REQUIREMENTS[6].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(6).locator(".platform-retention-renewal-review__row-badges")).toContainText(SSER_REQUIREMENTS[6].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRR-027 incident_prevention_gap owner and severity hint remain visible',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-review__row-heading")).toContainText(SSER_REQUIREMENTS[7].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(7).locator(".platform-retention-renewal-review__row-badges")).toContainText(SSER_REQUIREMENTS[7].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRR-028 growth_governance_exception owner and severity hint remain visible',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-review__row-heading")).toContainText(SSER_REQUIREMENTS[8].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(8).locator(".platform-retention-renewal-review__row-badges")).toContainText(SSER_REQUIREMENTS[8].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRR-029 missed_cadence exact renewal evidence fields',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-review__field-groups .platform-retention-renewal-review__chips").nth(6).locator("span")).toHaveText(RRR_REQUIRED_FIELDS.missed_cadence.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRR-030 health_regression exact renewal evidence fields',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-review__field-groups .platform-retention-renewal-review__chips").nth(6).locator("span")).toHaveText(RRR_REQUIRED_FIELDS.health_regression.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRR-031 customer_adoption_risk exact renewal evidence fields',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-review__field-groups .platform-retention-renewal-review__chips").nth(6).locator("span")).toHaveText(RRR_REQUIRED_FIELDS.customer_adoption_risk.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRR-032 support_sla_risk exact renewal evidence fields',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-review__field-groups .platform-retention-renewal-review__chips").nth(6).locator("span")).toHaveText(RRR_REQUIRED_FIELDS.support_sla_risk.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRR-033 billing_entitlement_exception exact renewal evidence fields',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-review__field-groups .platform-retention-renewal-review__chips").nth(6).locator("span")).toHaveText(RRR_REQUIRED_FIELDS.billing_entitlement_exception.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRR-034 backup_restore_gap exact renewal evidence fields',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-review__field-groups .platform-retention-renewal-review__chips").nth(6).locator("span")).toHaveText(RRR_REQUIRED_FIELDS.backup_restore_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRR-035 deployment_smoke_test_gap exact renewal evidence fields',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-review__field-groups .platform-retention-renewal-review__chips").nth(6).locator("span")).toHaveText(RRR_REQUIRED_FIELDS.deployment_smoke_test_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRR-036 incident_prevention_gap exact renewal evidence fields',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-review__field-groups .platform-retention-renewal-review__chips").nth(6).locator("span")).toHaveText(RRR_REQUIRED_FIELDS.incident_prevention_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRR-037 growth_governance_exception exact renewal evidence fields',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-review__field-groups .platform-retention-renewal-review__chips").nth(6).locator("span")).toHaveText(RRR_REQUIRED_FIELDS.growth_governance_exception.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRR-038 missed_cadence exact manual renewal controls',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-review__field-groups li")).toHaveText([...RRR_CONTROLS]);
 });
 test('PRRR-039 health_regression exact manual renewal controls',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-review__field-groups li")).toHaveText([...RRR_CONTROLS]);
 });
 test('PRRR-040 customer_adoption_risk exact manual renewal controls',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-review__field-groups li")).toHaveText([...RRR_CONTROLS]);
 });
 test('PRRR-041 support_sla_risk exact manual renewal controls',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-review__field-groups li")).toHaveText([...RRR_CONTROLS]);
 });
 test('PRRR-042 billing_entitlement_exception exact manual renewal controls',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-review__field-groups li")).toHaveText([...RRR_CONTROLS]);
 });
 test('PRRR-043 backup_restore_gap exact manual renewal controls',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-review__field-groups li")).toHaveText([...RRR_CONTROLS]);
 });
 test('PRRR-044 deployment_smoke_test_gap exact manual renewal controls',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-review__field-groups li")).toHaveText([...RRR_CONTROLS]);
 });
 test('PRRR-045 incident_prevention_gap exact manual renewal controls',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-review__field-groups li")).toHaveText([...RRR_CONTROLS]);
 });
 test('PRRR-046 growth_governance_exception exact manual renewal controls',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-review__field-groups li")).toHaveText([...RRR_CONTROLS]);
 });
 test('PRRR-047 missed_cadence permission-filtered domain links',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-review__row-actions a")).toHaveCount(RRR_LINK_COUNTS.missed_cadence);
 });
 test('PRRR-048 health_regression permission-filtered domain links',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-review__row-actions a")).toHaveCount(RRR_LINK_COUNTS.health_regression);
 });
 test('PRRR-049 customer_adoption_risk permission-filtered domain links',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-review__row-actions a")).toHaveCount(RRR_LINK_COUNTS.customer_adoption_risk);
 });
 test('PRRR-050 support_sla_risk permission-filtered domain links',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-review__row-actions a")).toHaveCount(RRR_LINK_COUNTS.support_sla_risk);
 });
 test('PRRR-051 billing_entitlement_exception permission-filtered domain links',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-review__row-actions a")).toHaveCount(RRR_LINK_COUNTS.billing_entitlement_exception);
 });
 test('PRRR-052 backup_restore_gap permission-filtered domain links',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-review__row-actions a")).toHaveCount(RRR_LINK_COUNTS.backup_restore_gap);
 });
 test('PRRR-053 deployment_smoke_test_gap permission-filtered domain links',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-review__row-actions a")).toHaveCount(RRR_LINK_COUNTS.deployment_smoke_test_gap);
 });
 test('PRRR-054 incident_prevention_gap permission-filtered domain links',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-review__row-actions a")).toHaveCount(RRR_LINK_COUNTS.incident_prevention_gap);
 });
 test('PRRR-055 growth_governance_exception permission-filtered domain links',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-review__row-actions a")).toHaveCount(RRR_LINK_COUNTS.growth_governance_exception);
 });
 test('PRRR-056 missed_cadence retention seal ancestry remains a prepared source row',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-review__source-summary > div").first()).toContainText("Source Evidence Retention Seal row");await expect(rows(page).nth(0).locator(".platform-retention-renewal-review__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRR-057 health_regression retention seal ancestry remains a prepared source row',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-review__source-summary > div").first()).toContainText("Source Evidence Retention Seal row");await expect(rows(page).nth(1).locator(".platform-retention-renewal-review__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRR-058 customer_adoption_risk retention seal ancestry remains a prepared source row',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-review__source-summary > div").first()).toContainText("Source Evidence Retention Seal row");await expect(rows(page).nth(2).locator(".platform-retention-renewal-review__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRR-059 support_sla_risk retention seal ancestry remains a prepared source row',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-review__source-summary > div").first()).toContainText("Source Evidence Retention Seal row");await expect(rows(page).nth(3).locator(".platform-retention-renewal-review__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRR-060 billing_entitlement_exception retention seal ancestry remains a prepared source row',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-review__source-summary > div").first()).toContainText("Source Evidence Retention Seal row");await expect(rows(page).nth(4).locator(".platform-retention-renewal-review__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRR-061 backup_restore_gap retention seal ancestry remains a prepared source row',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-review__source-summary > div").first()).toContainText("Source Evidence Retention Seal row");await expect(rows(page).nth(5).locator(".platform-retention-renewal-review__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRR-062 deployment_smoke_test_gap retention seal ancestry remains a prepared source row',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-review__source-summary > div").first()).toContainText("Source Evidence Retention Seal row");await expect(rows(page).nth(6).locator(".platform-retention-renewal-review__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRR-063 incident_prevention_gap retention seal ancestry remains a prepared source row',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-review__source-summary > div").first()).toContainText("Source Evidence Retention Seal row");await expect(rows(page).nth(7).locator(".platform-retention-renewal-review__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRR-064 growth_governance_exception retention seal ancestry remains a prepared source row',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-review__source-summary > div").first()).toContainText("Source Evidence Retention Seal row");await expect(rows(page).nth(8).locator(".platform-retention-renewal-review__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRR-065 Zero source seal persistence is not evidence of accepted renewal',async({page})=>{
  await openRetentionRenewalReview(page,{alter:s=>({...s,evidence_retention_seal_persistence:null})});await expect(context(page).locator(".platform-retention-renewal-review__persistence-grid")).toContainText("Not reported");
 });
 test('PRRR-066 Missing cadence statuses display None reported',async({page})=>{
  await openRetentionRenewalReview(page,{alter:s=>({...s,retention_renewal_review_rows:s.retention_renewal_review_rows.map((r,i)=>i===0?{...r,source_cadence_statuses:[]}:r)})});await expect(rows(page).first().locator(".platform-retention-renewal-review__source-rows").first()).toContainText("None reported");
 });
 test('PRRR-067 Missing transition references remain unverified',async({page})=>{
  await openRetentionRenewalReview(page,{alter:s=>({...s,retention_renewal_review_rows:s.retention_renewal_review_rows.map((r,i)=>i===0?{...r,source_transition_rows:[]}:r)})});await expect(rows(page).first().locator(".platform-retention-renewal-review__source-rows").nth(1)).toContainText("None reported");
 });
 test('PRRR-068 Missing observation references remain unverified',async({page})=>{
  await openRetentionRenewalReview(page,{alter:s=>({...s,retention_renewal_review_rows:s.retention_renewal_review_rows.map((r,i)=>i===0?{...r,source_observation_rows:[]}:r)})});await expect(rows(page).first().locator(".platform-retention-renewal-review__source-rows").nth(2)).toContainText("None reported");
 });
 test('PRRR-069 Missing growth authorizations remain unverified',async({page})=>{
  await openRetentionRenewalReview(page,{alter:s=>({...s,retention_renewal_review_rows:s.retention_renewal_review_rows.map((r,i)=>i===0?{...r,source_authorization_rows:[]}:r)})});await expect(rows(page).first().locator(".platform-retention-renewal-review__source-rows").nth(3)).toContainText("None reported");
 });
 test('PRRR-070 Renewal review preserves read-only release conditions',async({page})=>{
  await openRetentionRenewalReview(page);await expect(rows(page).first().locator(".platform-retention-renewal-review__source-summary")).toContainText("Release condition");await expect(rows(page).locator("form,input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
});
