/** Batch 145, Step 245: synthetic browser UI; NOT real archive seal or cycle reset. */
import {test,expect,type Page} from '@playwright/test';
import {openRetentionRenewalCycleReset,RRCR_PATH,RRCR_PERMISSIONS,RRCR_REQUIRED_FIELDS,RRCR_RULES,RRCR_CONTROLS,RRCR_LINK_COUNTS} from '../../../support/platformCommercialLaunchRetentionRenewalCycleResetFixture';
import {SSER_REQUIREMENTS} from '../../../support/platformCommercialLaunchSteadyStateExceptionReviewFixture';
const root=(p:Page)=>p.locator('.platform-retention-renewal-cycle-reset');
const rows=(p:Page)=>root(p).locator('.platform-retention-renewal-cycle-reset__row-card');
const context=(p:Page)=>root(p).locator('.platform-retention-renewal-cycle-reset__context-panel');
test.describe('Commercial Launch Retention Renewal Cycle Reset — Step 245 synthetic browser contracts',()=>{
 test('PRRCR-001 Cycle-reset heading matches router',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(page.getByRole("heading",{name:"Commercial Launch Retention Renewal Cycle Reset",exact:true})).toBeVisible();
 });
 test('PRRCR-002 Step 245 marker and read-only disclaimer visible',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(root(page)).toContainText("Step 245 — Commercial Launch Retention Renewal Cycle Reset Board");await expect(root(page)).toContainText("Retention renewal cycle-reset preparation only");
 });
 test('PRRCR-003 External archive seal boundary visible',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(root(page).locator(".platform-retention-renewal-cycle-reset__boundary-notice")).toContainText("Independently confirm");
 });
 test('PRRCR-004 Seventeen non-optional supporting links visible',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(root(page).locator(".platform-retention-renewal-cycle-reset__supporting-pages a")).toHaveCount(17);
 });
 test('PRRCR-005 Seven derived summary cards visible',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(root(page).getByLabel("Retention renewal cycle reset summary").locator(".io-workspace-stat")).toHaveCount(7);
 });
 test('PRRCR-006 Nine source-derived domain rows',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page)).toHaveCount(Object.keys(RRCR_REQUIRED_FIELDS).length);
 });
 test('PRRCR-007 Critical severity displays danger tone',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-cycle-reset__row-badges [data-tone]").first()).toHaveAttribute("data-tone","danger");
 });
 test('PRRCR-008 Medium severity displays neutral tone',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-cycle-reset__row-badges [data-tone]").first()).toHaveAttribute("data-tone","neutral");
 });
 test('PRRCR-009 Zero stored cycle resets does not establish external absence',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(root(page).getByLabel("Retention renewal cycle reset summary")).toContainText("Cycle-reset records stored here");await expect(context(page)).toContainText("External records not observable");
 });
 test('PRRCR-010 Eighteen upstream source posture links',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(context(page).locator(".platform-retention-renewal-cycle-reset__source-grid a")).toHaveCount(18);
 });
 test('PRRCR-011 Nineteen persistence boundary entries',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(context(page).locator(".platform-retention-renewal-cycle-reset__persistence-grid > div")).toHaveCount(19);
 });
 test('PRRCR-012 No cycle reset mutation controls',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).locator("form,input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
 test('PRRCR-013 Empty derived board does not mean cycle reset complete',async({page})=>{
  await openRetentionRenewalCycleReset(page,{alter:s=>({...s,retention_renewal_cycle_reset_rows:[],summary:{...s.summary,retention_renewal_cycle_reset_rows_total:0}})});await expect(root(page).locator(".platform-retention-renewal-cycle-reset__empty-state")).toContainText("not evidence");await expect(rows(page)).toHaveCount(0);
 });
 test('PRRCR-014 Missing tenant-read grant follows platform route guard',async({page})=>{
  await openRetentionRenewalCycleReset(page,{permissions:RRCR_PERMISSIONS.filter(p=>p!=="platform.tenants.read"),expectHeading:false});await expect(page).toHaveURL(/\/platform\/dashboard(?:\?.*)?$/);await expect(rows(page)).toHaveCount(0);
 });
 test('PRRCR-015 Optional announcement and release shortcuts hidden',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(root(page).getByRole("link",{name:"Announcements"})).toHaveCount(0);await expect(root(page).getByRole("link",{name:"Releases"})).toHaveCount(0);
 });
 test('PRRCR-016 Rules and limitations display as source declared',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(root(page).locator(".platform-retention-renewal-cycle-reset__rules-grid ul").first().locator("li")).toHaveText([...RRCR_RULES]);await expect(root(page).locator(".platform-retention-renewal-cycle-reset__rules-grid ul").last().locator("li")).toHaveCount(4);
 });
 test('PRRCR-017 Forbidden API response does not render cycle-reset rows',async({page})=>{
  await openRetentionRenewalCycleReset(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PRRCR-018 Service failure renders Retry action',async({page})=>{
  await openRetentionRenewalCycleReset(page,{status:503});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();
 });
 test('PRRCR-019 Refresh remains GET-only and non-mutating',async({page})=>{
  const calls:string[]=[];await openRetentionRenewalCycleReset(page,{onCall:(m,p)=>{if(p===RRCR_PATH)calls.push(m);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(9);expect(calls.length).toBeGreaterThanOrEqual(2);expect(calls.every(x=>x==="GET")).toBeTruthy();
 });
 test('PRRCR-020 missed_cadence source owner and severity labels',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-cycle-reset__row-heading")).toContainText(SSER_REQUIREMENTS[0].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(0).locator(".platform-retention-renewal-cycle-reset__row-badges")).toContainText(SSER_REQUIREMENTS[0].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRCR-021 health_regression source owner and severity labels',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-cycle-reset__row-heading")).toContainText(SSER_REQUIREMENTS[1].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(1).locator(".platform-retention-renewal-cycle-reset__row-badges")).toContainText(SSER_REQUIREMENTS[1].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRCR-022 customer_adoption_risk source owner and severity labels',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-cycle-reset__row-heading")).toContainText(SSER_REQUIREMENTS[2].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(2).locator(".platform-retention-renewal-cycle-reset__row-badges")).toContainText(SSER_REQUIREMENTS[2].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRCR-023 support_sla_risk source owner and severity labels',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-cycle-reset__row-heading")).toContainText(SSER_REQUIREMENTS[3].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(3).locator(".platform-retention-renewal-cycle-reset__row-badges")).toContainText(SSER_REQUIREMENTS[3].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRCR-024 billing_entitlement_exception source owner and severity labels',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-cycle-reset__row-heading")).toContainText(SSER_REQUIREMENTS[4].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(4).locator(".platform-retention-renewal-cycle-reset__row-badges")).toContainText(SSER_REQUIREMENTS[4].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRCR-025 backup_restore_gap source owner and severity labels',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-cycle-reset__row-heading")).toContainText(SSER_REQUIREMENTS[5].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(5).locator(".platform-retention-renewal-cycle-reset__row-badges")).toContainText(SSER_REQUIREMENTS[5].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRCR-026 deployment_smoke_test_gap source owner and severity labels',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-cycle-reset__row-heading")).toContainText(SSER_REQUIREMENTS[6].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(6).locator(".platform-retention-renewal-cycle-reset__row-badges")).toContainText(SSER_REQUIREMENTS[6].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRCR-027 incident_prevention_gap source owner and severity labels',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-cycle-reset__row-heading")).toContainText(SSER_REQUIREMENTS[7].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(7).locator(".platform-retention-renewal-cycle-reset__row-badges")).toContainText(SSER_REQUIREMENTS[7].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRCR-028 growth_governance_exception source owner and severity labels',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-cycle-reset__row-heading")).toContainText(SSER_REQUIREMENTS[8].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(8).locator(".platform-retention-renewal-cycle-reset__row-badges")).toContainText(SSER_REQUIREMENTS[8].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRCR-029 missed_cadence exact four next-cycle evidence fields',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-cycle-reset__field-groups .platform-retention-renewal-cycle-reset__chips").nth(11).locator("span")).toHaveText(RRCR_REQUIRED_FIELDS.missed_cadence.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRCR-030 health_regression exact four next-cycle evidence fields',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-cycle-reset__field-groups .platform-retention-renewal-cycle-reset__chips").nth(11).locator("span")).toHaveText(RRCR_REQUIRED_FIELDS.health_regression.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRCR-031 customer_adoption_risk exact four next-cycle evidence fields',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-cycle-reset__field-groups .platform-retention-renewal-cycle-reset__chips").nth(11).locator("span")).toHaveText(RRCR_REQUIRED_FIELDS.customer_adoption_risk.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRCR-032 support_sla_risk exact four next-cycle evidence fields',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-cycle-reset__field-groups .platform-retention-renewal-cycle-reset__chips").nth(11).locator("span")).toHaveText(RRCR_REQUIRED_FIELDS.support_sla_risk.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRCR-033 billing_entitlement_exception exact four next-cycle evidence fields',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-cycle-reset__field-groups .platform-retention-renewal-cycle-reset__chips").nth(11).locator("span")).toHaveText(RRCR_REQUIRED_FIELDS.billing_entitlement_exception.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRCR-034 backup_restore_gap exact four next-cycle evidence fields',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-cycle-reset__field-groups .platform-retention-renewal-cycle-reset__chips").nth(11).locator("span")).toHaveText(RRCR_REQUIRED_FIELDS.backup_restore_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRCR-035 deployment_smoke_test_gap exact four next-cycle evidence fields',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-cycle-reset__field-groups .platform-retention-renewal-cycle-reset__chips").nth(11).locator("span")).toHaveText(RRCR_REQUIRED_FIELDS.deployment_smoke_test_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRCR-036 incident_prevention_gap exact four next-cycle evidence fields',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-cycle-reset__field-groups .platform-retention-renewal-cycle-reset__chips").nth(11).locator("span")).toHaveText(RRCR_REQUIRED_FIELDS.incident_prevention_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRCR-037 growth_governance_exception exact four next-cycle evidence fields',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-cycle-reset__field-groups .platform-retention-renewal-cycle-reset__chips").nth(11).locator("span")).toHaveText(RRCR_REQUIRED_FIELDS.growth_governance_exception.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRCR-038 missed_cadence three manual next-cycle controls',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-cycle-reset__field-groups li")).toHaveText([...RRCR_CONTROLS]);
 });
 test('PRRCR-039 health_regression three manual next-cycle controls',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-cycle-reset__field-groups li")).toHaveText([...RRCR_CONTROLS]);
 });
 test('PRRCR-040 customer_adoption_risk three manual next-cycle controls',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-cycle-reset__field-groups li")).toHaveText([...RRCR_CONTROLS]);
 });
 test('PRRCR-041 support_sla_risk three manual next-cycle controls',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-cycle-reset__field-groups li")).toHaveText([...RRCR_CONTROLS]);
 });
 test('PRRCR-042 billing_entitlement_exception three manual next-cycle controls',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-cycle-reset__field-groups li")).toHaveText([...RRCR_CONTROLS]);
 });
 test('PRRCR-043 backup_restore_gap three manual next-cycle controls',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-cycle-reset__field-groups li")).toHaveText([...RRCR_CONTROLS]);
 });
 test('PRRCR-044 deployment_smoke_test_gap three manual next-cycle controls',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-cycle-reset__field-groups li")).toHaveText([...RRCR_CONTROLS]);
 });
 test('PRRCR-045 incident_prevention_gap three manual next-cycle controls',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-cycle-reset__field-groups li")).toHaveText([...RRCR_CONTROLS]);
 });
 test('PRRCR-046 growth_governance_exception three manual next-cycle controls',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-cycle-reset__field-groups li")).toHaveText([...RRCR_CONTROLS]);
 });
 test('PRRCR-047 missed_cadence source links obey permission boundaries',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-cycle-reset__row-actions a")).toHaveCount(RRCR_LINK_COUNTS.missed_cadence);
 });
 test('PRRCR-048 health_regression source links obey permission boundaries',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-cycle-reset__row-actions a")).toHaveCount(RRCR_LINK_COUNTS.health_regression);
 });
 test('PRRCR-049 customer_adoption_risk source links obey permission boundaries',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-cycle-reset__row-actions a")).toHaveCount(RRCR_LINK_COUNTS.customer_adoption_risk);
 });
 test('PRRCR-050 support_sla_risk source links obey permission boundaries',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-cycle-reset__row-actions a")).toHaveCount(RRCR_LINK_COUNTS.support_sla_risk);
 });
 test('PRRCR-051 billing_entitlement_exception source links obey permission boundaries',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-cycle-reset__row-actions a")).toHaveCount(RRCR_LINK_COUNTS.billing_entitlement_exception);
 });
 test('PRRCR-052 backup_restore_gap source links obey permission boundaries',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-cycle-reset__row-actions a")).toHaveCount(RRCR_LINK_COUNTS.backup_restore_gap);
 });
 test('PRRCR-053 deployment_smoke_test_gap source links obey permission boundaries',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-cycle-reset__row-actions a")).toHaveCount(RRCR_LINK_COUNTS.deployment_smoke_test_gap);
 });
 test('PRRCR-054 incident_prevention_gap source links obey permission boundaries',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-cycle-reset__row-actions a")).toHaveCount(RRCR_LINK_COUNTS.incident_prevention_gap);
 });
 test('PRRCR-055 growth_governance_exception source links obey permission boundaries',async({page})=>{
  await openRetentionRenewalCycleReset(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-cycle-reset__row-actions a")).toHaveCount(RRCR_LINK_COUNTS.growth_governance_exception);
 });
 test('PRRCR-056 missed_cadence retains upstream archive-seal row and pending status',async({page})=>{
  await openRetentionRenewalCycleReset(page);const chain=rows(page).nth(0).locator(".platform-retention-renewal-cycle-reset__source-summary > div").first();await expect(chain).toContainText("Source Retention Renewal Archive Seal row");await expect(chain).toContainText("Waiting for external");await expect(rows(page).nth(0).locator(".platform-retention-renewal-cycle-reset__template-note")).toContainText("preparation metadata only");
 });
 test('PRRCR-057 health_regression retains upstream archive-seal row and pending status',async({page})=>{
  await openRetentionRenewalCycleReset(page);const chain=rows(page).nth(1).locator(".platform-retention-renewal-cycle-reset__source-summary > div").first();await expect(chain).toContainText("Source Retention Renewal Archive Seal row");await expect(chain).toContainText("Waiting for external");await expect(rows(page).nth(1).locator(".platform-retention-renewal-cycle-reset__template-note")).toContainText("preparation metadata only");
 });
 test('PRRCR-058 customer_adoption_risk retains upstream archive-seal row and pending status',async({page})=>{
  await openRetentionRenewalCycleReset(page);const chain=rows(page).nth(2).locator(".platform-retention-renewal-cycle-reset__source-summary > div").first();await expect(chain).toContainText("Source Retention Renewal Archive Seal row");await expect(chain).toContainText("Waiting for external");await expect(rows(page).nth(2).locator(".platform-retention-renewal-cycle-reset__template-note")).toContainText("preparation metadata only");
 });
 test('PRRCR-059 support_sla_risk retains upstream archive-seal row and pending status',async({page})=>{
  await openRetentionRenewalCycleReset(page);const chain=rows(page).nth(3).locator(".platform-retention-renewal-cycle-reset__source-summary > div").first();await expect(chain).toContainText("Source Retention Renewal Archive Seal row");await expect(chain).toContainText("Waiting for external");await expect(rows(page).nth(3).locator(".platform-retention-renewal-cycle-reset__template-note")).toContainText("preparation metadata only");
 });
 test('PRRCR-060 billing_entitlement_exception retains upstream archive-seal row and pending status',async({page})=>{
  await openRetentionRenewalCycleReset(page);const chain=rows(page).nth(4).locator(".platform-retention-renewal-cycle-reset__source-summary > div").first();await expect(chain).toContainText("Source Retention Renewal Archive Seal row");await expect(chain).toContainText("Waiting for external");await expect(rows(page).nth(4).locator(".platform-retention-renewal-cycle-reset__template-note")).toContainText("preparation metadata only");
 });
 test('PRRCR-061 backup_restore_gap retains upstream archive-seal row and pending status',async({page})=>{
  await openRetentionRenewalCycleReset(page);const chain=rows(page).nth(5).locator(".platform-retention-renewal-cycle-reset__source-summary > div").first();await expect(chain).toContainText("Source Retention Renewal Archive Seal row");await expect(chain).toContainText("Waiting for external");await expect(rows(page).nth(5).locator(".platform-retention-renewal-cycle-reset__template-note")).toContainText("preparation metadata only");
 });
 test('PRRCR-062 deployment_smoke_test_gap retains upstream archive-seal row and pending status',async({page})=>{
  await openRetentionRenewalCycleReset(page);const chain=rows(page).nth(6).locator(".platform-retention-renewal-cycle-reset__source-summary > div").first();await expect(chain).toContainText("Source Retention Renewal Archive Seal row");await expect(chain).toContainText("Waiting for external");await expect(rows(page).nth(6).locator(".platform-retention-renewal-cycle-reset__template-note")).toContainText("preparation metadata only");
 });
 test('PRRCR-063 incident_prevention_gap retains upstream archive-seal row and pending status',async({page})=>{
  await openRetentionRenewalCycleReset(page);const chain=rows(page).nth(7).locator(".platform-retention-renewal-cycle-reset__source-summary > div").first();await expect(chain).toContainText("Source Retention Renewal Archive Seal row");await expect(chain).toContainText("Waiting for external");await expect(rows(page).nth(7).locator(".platform-retention-renewal-cycle-reset__template-note")).toContainText("preparation metadata only");
 });
 test('PRRCR-064 growth_governance_exception retains upstream archive-seal row and pending status',async({page})=>{
  await openRetentionRenewalCycleReset(page);const chain=rows(page).nth(8).locator(".platform-retention-renewal-cycle-reset__source-summary > div").first();await expect(chain).toContainText("Source Retention Renewal Archive Seal row");await expect(chain).toContainText("Waiting for external");await expect(rows(page).nth(8).locator(".platform-retention-renewal-cycle-reset__template-note")).toContainText("preparation metadata only");
 });
 test('PRRCR-065 Missing source_cadence_statuses displays explicit None reported instead of inferred evidence',async({page})=>{
  await openRetentionRenewalCycleReset(page,{alter:s=>({...s,retention_renewal_cycle_reset_rows:s.retention_renewal_cycle_reset_rows.map((r,i)=>i===0?{...r,source_cadence_statuses:[]}:r)})});await expect(rows(page).first().locator(".platform-retention-renewal-cycle-reset__source-rows").nth(0)).toContainText("None reported");
 });
 test('PRRCR-066 Missing source_transition_rows displays explicit None reported instead of inferred evidence',async({page})=>{
  await openRetentionRenewalCycleReset(page,{alter:s=>({...s,retention_renewal_cycle_reset_rows:s.retention_renewal_cycle_reset_rows.map((r,i)=>i===0?{...r,source_transition_rows:[]}:r)})});await expect(rows(page).first().locator(".platform-retention-renewal-cycle-reset__source-rows").nth(1)).toContainText("None reported");
 });
 test('PRRCR-067 Missing source_observation_rows displays explicit None reported instead of inferred evidence',async({page})=>{
  await openRetentionRenewalCycleReset(page,{alter:s=>({...s,retention_renewal_cycle_reset_rows:s.retention_renewal_cycle_reset_rows.map((r,i)=>i===0?{...r,source_observation_rows:[]}:r)})});await expect(rows(page).first().locator(".platform-retention-renewal-cycle-reset__source-rows").nth(2)).toContainText("None reported");
 });
 test('PRRCR-068 Missing source_authorization_rows displays explicit None reported instead of inferred evidence',async({page})=>{
  await openRetentionRenewalCycleReset(page,{alter:s=>({...s,retention_renewal_cycle_reset_rows:s.retention_renewal_cycle_reset_rows.map((r,i)=>i===0?{...r,source_authorization_rows:[]}:r)})});await expect(rows(page).first().locator(".platform-retention-renewal-cycle-reset__source-rows").nth(3)).toContainText("None reported");
 });
 test('PRRCR-069 Unreported upstream archive-seal persistence is disclosed rather than certified',async({page})=>{
  await openRetentionRenewalCycleReset(page,{alter:s=>({...s,retention_renewal_archive_seal_persistence:null})});await expect(context(page).locator(".platform-retention-renewal-cycle-reset__persistence-grid > div").first()).toContainText("Not reported");await expect(context(page).locator(".platform-retention-renewal-cycle-reset__persistence-grid > div").first()).toContainText("No persistence interpretation reported.");
 });
 test('PRRCR-070 Next operator instruction remains external and UI contains no reset mutation',async({page})=>{
  const calls:string[]=[];await openRetentionRenewalCycleReset(page,{onCall:(method,path)=>{if(path===RRCR_PATH)calls.push(method);}});await expect(root(page).locator(".platform-retention-renewal-cycle-reset__next-step")).toContainText("Independently confirm the external retention-renewal archive-seal record");await expect(root(page).locator("form,input,textarea,select,[contenteditable=true]")).toHaveCount(0);expect(calls.length).toBeGreaterThanOrEqual(1);expect(calls.every(m=>m==="GET")).toBeTruthy();
 });
});
