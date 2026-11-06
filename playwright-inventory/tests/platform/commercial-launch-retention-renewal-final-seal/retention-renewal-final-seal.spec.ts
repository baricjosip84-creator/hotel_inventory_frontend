/** Batch 143, Step 243: synthetic browser assertions, not external final-seal evidence. */
import {test,expect,type Page} from '@playwright/test';
import {openRetentionRenewalFinalSeal,RRF_PATH,RRF_PERMISSIONS,RRF_REQUIRED_FIELDS,RRF_RULES,RRF_CONTROLS,RRF_LINK_COUNTS} from '../../../support/platformCommercialLaunchRetentionRenewalFinalSealFixture';
import {SSER_REQUIREMENTS} from '../../../support/platformCommercialLaunchSteadyStateExceptionReviewFixture';
const root=(p:Page)=>p.locator('.platform-retention-renewal-final-seal');
const rows=(p:Page)=>root(p).locator('.platform-retention-renewal-final-seal__row-card');
const context=(p:Page)=>root(p).locator('.platform-retention-renewal-final-seal__context-panel');
test.describe('Commercial Launch Retention Renewal Final Seal — Step 243 synthetic browser contracts',()=>{
 test('PRRFS-001 Final seal heading matches source',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(page.getByRole("heading",{name:"Commercial Launch Retention Renewal Final Seal",exact:true})).toBeVisible();
 });
 test('PRRFS-002 Step 243 and final-seal preparation notice visible',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(root(page)).toContainText("Step 243 — Commercial Launch Retention Renewal Final Seal Board");await expect(root(page)).toContainText("Retention renewal final-seal preparation only");
 });
 test('PRRFS-003 External certification prerequisite is explicit',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(root(page).locator(".platform-retention-renewal-final-seal__boundary-notice")).toContainText("Independently confirm");
 });
 test('PRRFS-004 Fifteen unconditional supporting links',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(root(page).locator(".platform-retention-renewal-final-seal__supporting-pages a")).toHaveCount(15);
 });
 test('PRRFS-005 Seven derived summary cards visible',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(root(page).getByLabel("Retention renewal final seal summary").locator(".io-workspace-stat")).toHaveCount(7);
 });
 test('PRRFS-006 All nine final-seal rows render',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page)).toHaveCount(Object.keys(RRF_REQUIRED_FIELDS).length);
 });
 test('PRRFS-007 Critical severity warning tone matches source',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-final-seal__row-badges [data-tone]").first()).toHaveAttribute("data-tone","danger");
 });
 test('PRRFS-008 Medium severity hint is neutral',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-final-seal__row-badges [data-tone]").first()).toHaveAttribute("data-tone","neutral");
 });
 test('PRRFS-009 Zero local final seals does not prove external status',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(root(page).getByLabel("Retention renewal final seal summary")).toContainText("Final-seal records stored here");await expect(context(page)).toContainText("External records not observable");
 });
 test('PRRFS-010 Sixteen upstream evidence links are shown',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(context(page).locator(".platform-retention-renewal-final-seal__source-grid a")).toHaveCount(16);
 });
 test('PRRFS-011 Seventeen persistence boundaries are shown',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(context(page).locator(".platform-retention-renewal-final-seal__persistence-grid > div")).toHaveCount(17);
 });
 test('PRRFS-012 Final-seal rows are read-only',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).locator("form,input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
 test('PRRFS-013 Empty response is explicitly not proof of final sealing',async({page})=>{
  await openRetentionRenewalFinalSeal(page,{alter:s=>({...s,retention_renewal_final_seal_rows:[],summary:{...s.summary,retention_renewal_final_seal_rows_total:0}})});await expect(root(page).locator(".platform-retention-renewal-final-seal__empty-state")).toContainText("not evidence");await expect(rows(page)).toHaveCount(0);
 });
 test('PRRFS-014 Missing platform tenants permission redirects',async({page})=>{
  await openRetentionRenewalFinalSeal(page,{permissions:RRF_PERMISSIONS.filter(p=>p!=="platform.tenants.read"),expectHeading:false});await expect(page).toHaveURL(/\/platform\/dashboard(?:\?.*)?$/);await expect(rows(page)).toHaveCount(0);
 });
 test('PRRFS-015 Optional announcements and releases are absent',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(root(page).getByRole("link",{name:"Announcements"})).toHaveCount(0);await expect(root(page).getByRole("link",{name:"Releases"})).toHaveCount(0);
 });
 test('PRRFS-016 Source rules and limitations remain exact',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(root(page).locator(".platform-retention-renewal-final-seal__rules-grid ul").first().locator("li")).toHaveText([...RRF_RULES]);await expect(root(page).locator(".platform-retention-renewal-final-seal__rules-grid ul").last().locator("li")).toHaveCount(4);
 });
 test('PRRFS-017 Forbidden API response does not show evidence rows',async({page})=>{
  await openRetentionRenewalFinalSeal(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PRRFS-018 Service error offers a retry',async({page})=>{
  await openRetentionRenewalFinalSeal(page,{status:503});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();
 });
 test('PRRFS-019 Refresh is GET-only and read-only',async({page})=>{
  const calls:string[]=[];await openRetentionRenewalFinalSeal(page,{onCall:(m,p)=>{if(p===RRF_PATH)calls.push(m);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(9);expect(calls.length).toBeGreaterThanOrEqual(2);expect(calls.every(m=>m==="GET")).toBeTruthy();
 });
 test('PRRFS-020 missed_cadence owner and severity inherited',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-final-seal__row-heading")).toContainText(SSER_REQUIREMENTS[0].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(0).locator(".platform-retention-renewal-final-seal__row-badges")).toContainText(SSER_REQUIREMENTS[0].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRFS-021 health_regression owner and severity inherited',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-final-seal__row-heading")).toContainText(SSER_REQUIREMENTS[1].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(1).locator(".platform-retention-renewal-final-seal__row-badges")).toContainText(SSER_REQUIREMENTS[1].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRFS-022 customer_adoption_risk owner and severity inherited',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-final-seal__row-heading")).toContainText(SSER_REQUIREMENTS[2].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(2).locator(".platform-retention-renewal-final-seal__row-badges")).toContainText(SSER_REQUIREMENTS[2].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRFS-023 support_sla_risk owner and severity inherited',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-final-seal__row-heading")).toContainText(SSER_REQUIREMENTS[3].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(3).locator(".platform-retention-renewal-final-seal__row-badges")).toContainText(SSER_REQUIREMENTS[3].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRFS-024 billing_entitlement_exception owner and severity inherited',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-final-seal__row-heading")).toContainText(SSER_REQUIREMENTS[4].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(4).locator(".platform-retention-renewal-final-seal__row-badges")).toContainText(SSER_REQUIREMENTS[4].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRFS-025 backup_restore_gap owner and severity inherited',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-final-seal__row-heading")).toContainText(SSER_REQUIREMENTS[5].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(5).locator(".platform-retention-renewal-final-seal__row-badges")).toContainText(SSER_REQUIREMENTS[5].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRFS-026 deployment_smoke_test_gap owner and severity inherited',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-final-seal__row-heading")).toContainText(SSER_REQUIREMENTS[6].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(6).locator(".platform-retention-renewal-final-seal__row-badges")).toContainText(SSER_REQUIREMENTS[6].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRFS-027 incident_prevention_gap owner and severity inherited',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-final-seal__row-heading")).toContainText(SSER_REQUIREMENTS[7].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(7).locator(".platform-retention-renewal-final-seal__row-badges")).toContainText(SSER_REQUIREMENTS[7].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRFS-028 growth_governance_exception owner and severity inherited',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-final-seal__row-heading")).toContainText(SSER_REQUIREMENTS[8].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(8).locator(".platform-retention-renewal-final-seal__row-badges")).toContainText(SSER_REQUIREMENTS[8].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRFS-029 missed_cadence final seal required evidence fields',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-final-seal__field-groups .platform-retention-renewal-final-seal__chips").nth(9).locator("span")).toHaveText(RRF_REQUIRED_FIELDS.missed_cadence.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRFS-030 health_regression final seal required evidence fields',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-final-seal__field-groups .platform-retention-renewal-final-seal__chips").nth(9).locator("span")).toHaveText(RRF_REQUIRED_FIELDS.health_regression.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRFS-031 customer_adoption_risk final seal required evidence fields',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-final-seal__field-groups .platform-retention-renewal-final-seal__chips").nth(9).locator("span")).toHaveText(RRF_REQUIRED_FIELDS.customer_adoption_risk.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRFS-032 support_sla_risk final seal required evidence fields',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-final-seal__field-groups .platform-retention-renewal-final-seal__chips").nth(9).locator("span")).toHaveText(RRF_REQUIRED_FIELDS.support_sla_risk.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRFS-033 billing_entitlement_exception final seal required evidence fields',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-final-seal__field-groups .platform-retention-renewal-final-seal__chips").nth(9).locator("span")).toHaveText(RRF_REQUIRED_FIELDS.billing_entitlement_exception.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRFS-034 backup_restore_gap final seal required evidence fields',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-final-seal__field-groups .platform-retention-renewal-final-seal__chips").nth(9).locator("span")).toHaveText(RRF_REQUIRED_FIELDS.backup_restore_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRFS-035 deployment_smoke_test_gap final seal required evidence fields',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-final-seal__field-groups .platform-retention-renewal-final-seal__chips").nth(9).locator("span")).toHaveText(RRF_REQUIRED_FIELDS.deployment_smoke_test_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRFS-036 incident_prevention_gap final seal required evidence fields',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-final-seal__field-groups .platform-retention-renewal-final-seal__chips").nth(9).locator("span")).toHaveText(RRF_REQUIRED_FIELDS.incident_prevention_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRFS-037 growth_governance_exception final seal required evidence fields',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-final-seal__field-groups .platform-retention-renewal-final-seal__chips").nth(9).locator("span")).toHaveText(RRF_REQUIRED_FIELDS.growth_governance_exception.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRFS-038 missed_cadence final-seal manual controls exact',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-final-seal__field-groups li")).toHaveText([...RRF_CONTROLS]);
 });
 test('PRRFS-039 health_regression final-seal manual controls exact',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-final-seal__field-groups li")).toHaveText([...RRF_CONTROLS]);
 });
 test('PRRFS-040 customer_adoption_risk final-seal manual controls exact',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-final-seal__field-groups li")).toHaveText([...RRF_CONTROLS]);
 });
 test('PRRFS-041 support_sla_risk final-seal manual controls exact',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-final-seal__field-groups li")).toHaveText([...RRF_CONTROLS]);
 });
 test('PRRFS-042 billing_entitlement_exception final-seal manual controls exact',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-final-seal__field-groups li")).toHaveText([...RRF_CONTROLS]);
 });
 test('PRRFS-043 backup_restore_gap final-seal manual controls exact',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-final-seal__field-groups li")).toHaveText([...RRF_CONTROLS]);
 });
 test('PRRFS-044 deployment_smoke_test_gap final-seal manual controls exact',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-final-seal__field-groups li")).toHaveText([...RRF_CONTROLS]);
 });
 test('PRRFS-045 incident_prevention_gap final-seal manual controls exact',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-final-seal__field-groups li")).toHaveText([...RRF_CONTROLS]);
 });
 test('PRRFS-046 growth_governance_exception final-seal manual controls exact',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-final-seal__field-groups li")).toHaveText([...RRF_CONTROLS]);
 });
 test('PRRFS-047 missed_cadence evidence navigation count permission gated',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-final-seal__row-actions a")).toHaveCount(RRF_LINK_COUNTS.missed_cadence);
 });
 test('PRRFS-048 health_regression evidence navigation count permission gated',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-final-seal__row-actions a")).toHaveCount(RRF_LINK_COUNTS.health_regression);
 });
 test('PRRFS-049 customer_adoption_risk evidence navigation count permission gated',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-final-seal__row-actions a")).toHaveCount(RRF_LINK_COUNTS.customer_adoption_risk);
 });
 test('PRRFS-050 support_sla_risk evidence navigation count permission gated',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-final-seal__row-actions a")).toHaveCount(RRF_LINK_COUNTS.support_sla_risk);
 });
 test('PRRFS-051 billing_entitlement_exception evidence navigation count permission gated',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-final-seal__row-actions a")).toHaveCount(RRF_LINK_COUNTS.billing_entitlement_exception);
 });
 test('PRRFS-052 backup_restore_gap evidence navigation count permission gated',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-final-seal__row-actions a")).toHaveCount(RRF_LINK_COUNTS.backup_restore_gap);
 });
 test('PRRFS-053 deployment_smoke_test_gap evidence navigation count permission gated',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-final-seal__row-actions a")).toHaveCount(RRF_LINK_COUNTS.deployment_smoke_test_gap);
 });
 test('PRRFS-054 incident_prevention_gap evidence navigation count permission gated',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-final-seal__row-actions a")).toHaveCount(RRF_LINK_COUNTS.incident_prevention_gap);
 });
 test('PRRFS-055 growth_governance_exception evidence navigation count permission gated',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-final-seal__row-actions a")).toHaveCount(RRF_LINK_COUNTS.growth_governance_exception);
 });
 test('PRRFS-056 missed_cadence retains upstream certification traceability',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-final-seal__source-summary > div").first()).toContainText("Source Retention Renewal Certification row");await expect(rows(page).nth(0).locator(".platform-retention-renewal-final-seal__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRFS-057 health_regression retains upstream certification traceability',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-final-seal__source-summary > div").first()).toContainText("Source Retention Renewal Certification row");await expect(rows(page).nth(1).locator(".platform-retention-renewal-final-seal__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRFS-058 customer_adoption_risk retains upstream certification traceability',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-final-seal__source-summary > div").first()).toContainText("Source Retention Renewal Certification row");await expect(rows(page).nth(2).locator(".platform-retention-renewal-final-seal__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRFS-059 support_sla_risk retains upstream certification traceability',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-final-seal__source-summary > div").first()).toContainText("Source Retention Renewal Certification row");await expect(rows(page).nth(3).locator(".platform-retention-renewal-final-seal__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRFS-060 billing_entitlement_exception retains upstream certification traceability',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-final-seal__source-summary > div").first()).toContainText("Source Retention Renewal Certification row");await expect(rows(page).nth(4).locator(".platform-retention-renewal-final-seal__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRFS-061 backup_restore_gap retains upstream certification traceability',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-final-seal__source-summary > div").first()).toContainText("Source Retention Renewal Certification row");await expect(rows(page).nth(5).locator(".platform-retention-renewal-final-seal__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRFS-062 deployment_smoke_test_gap retains upstream certification traceability',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-final-seal__source-summary > div").first()).toContainText("Source Retention Renewal Certification row");await expect(rows(page).nth(6).locator(".platform-retention-renewal-final-seal__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRFS-063 incident_prevention_gap retains upstream certification traceability',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-final-seal__source-summary > div").first()).toContainText("Source Retention Renewal Certification row");await expect(rows(page).nth(7).locator(".platform-retention-renewal-final-seal__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRFS-064 growth_governance_exception retains upstream certification traceability',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-final-seal__source-summary > div").first()).toContainText("Source Retention Renewal Certification row");await expect(rows(page).nth(8).locator(".platform-retention-renewal-final-seal__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRFS-065 Missing certification persistence is explicitly unknown',async({page})=>{
  await openRetentionRenewalFinalSeal(page,{alter:s=>({...s,retention_renewal_certification_persistence:null})});await expect(context(page).locator(".platform-retention-renewal-final-seal__persistence-grid")).toContainText("Not reported");
 });
 test('PRRFS-066 Missing source_cadence_statuses source is not fabricated',async({page})=>{
  await openRetentionRenewalFinalSeal(page,{alter:s=>({...s,retention_renewal_final_seal_rows:s.retention_renewal_final_seal_rows.map((r,i)=>i===0?{...r,source_cadence_statuses:[]}:r)})});await expect(rows(page).first().locator(".platform-retention-renewal-final-seal__source-rows").nth(0)).toContainText("None reported");
 });
 test('PRRFS-067 Missing source_transition_rows source is not fabricated',async({page})=>{
  await openRetentionRenewalFinalSeal(page,{alter:s=>({...s,retention_renewal_final_seal_rows:s.retention_renewal_final_seal_rows.map((r,i)=>i===0?{...r,source_transition_rows:[]}:r)})});await expect(rows(page).first().locator(".platform-retention-renewal-final-seal__source-rows").nth(1)).toContainText("None reported");
 });
 test('PRRFS-068 Missing source_observation_rows source is not fabricated',async({page})=>{
  await openRetentionRenewalFinalSeal(page,{alter:s=>({...s,retention_renewal_final_seal_rows:s.retention_renewal_final_seal_rows.map((r,i)=>i===0?{...r,source_observation_rows:[]}:r)})});await expect(rows(page).first().locator(".platform-retention-renewal-final-seal__source-rows").nth(2)).toContainText("None reported");
 });
 test('PRRFS-069 Missing source_authorization_rows source is not fabricated',async({page})=>{
  await openRetentionRenewalFinalSeal(page,{alter:s=>({...s,retention_renewal_final_seal_rows:s.retention_renewal_final_seal_rows.map((r,i)=>i===0?{...r,source_authorization_rows:[]}:r)})});await expect(rows(page).first().locator(".platform-retention-renewal-final-seal__source-rows").nth(3)).toContainText("None reported");
 });
 test('PRRFS-070 Final-seal release remains manual and externally evidenced',async({page})=>{
  await openRetentionRenewalFinalSeal(page);await expect(rows(page).first().locator(".platform-retention-renewal-final-seal__source-summary")).toContainText("Release condition");await expect(rows(page).locator("form,input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
});
