/** Batch 144, Step 244: synthetic browser contracts, NOT external archive sealing. */
import {test,expect,type Page} from '@playwright/test';
import {openRetentionRenewalArchiveSeal,RRA_PATH,RRA_PERMISSIONS,RRA_REQUIRED_FIELDS,RRA_RULES,RRA_CONTROLS,RRA_LINK_COUNTS} from '../../../support/platformCommercialLaunchRetentionRenewalArchiveSealFixture';
import {SSER_REQUIREMENTS} from '../../../support/platformCommercialLaunchSteadyStateExceptionReviewFixture';
const root=(p:Page)=>p.locator('.platform-retention-renewal-archive-seal');
const rows=(p:Page)=>root(p).locator('.platform-retention-renewal-archive-seal__row-card');
const context=(p:Page)=>root(p).locator('.platform-retention-renewal-archive-seal__context-panel');
test.describe('Commercial Launch Retention Renewal Archive Seal — Step 244 synthetic browser contracts',()=>{
 test('PRRAS-001 Archive seal heading follows router',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(page.getByRole("heading",{name:"Commercial Launch Retention Renewal Archive Seal",exact:true})).toBeVisible();
 });
 test('PRRAS-002 Step 244 external archive preparation marker visible',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(root(page)).toContainText("Step 244 — Commercial Launch Retention Renewal Archive Seal Board");await expect(root(page)).toContainText("Retention renewal archive-seal preparation only");
 });
 test('PRRAS-003 Final-seal confirmation requirement is explicit',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(root(page).locator(".platform-retention-renewal-archive-seal__boundary-notice")).toContainText("Independently confirm");
 });
 test('PRRAS-004 Sixteen unconditional supporting links appear',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(root(page).locator(".platform-retention-renewal-archive-seal__supporting-pages a")).toHaveCount(16);
 });
 test('PRRAS-005 Seven derived summary cards appear',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(root(page).getByLabel("Retention renewal archive seal summary").locator(".io-workspace-stat")).toHaveCount(7);
 });
 test('PRRAS-006 Nine archive seal domain rows appear',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page)).toHaveCount(Object.keys(RRA_REQUIRED_FIELDS).length);
 });
 test('PRRAS-007 Critical severity uses danger tone',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-archive-seal__row-badges [data-tone]").first()).toHaveAttribute("data-tone","danger");
 });
 test('PRRAS-008 Medium severity uses neutral tone',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-archive-seal__row-badges [data-tone]").first()).toHaveAttribute("data-tone","neutral");
 });
 test('PRRAS-009 Zero local archive seals does not establish external absence',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(root(page).getByLabel("Retention renewal archive seal summary")).toContainText("Archive-seal records stored here");await expect(context(page)).toContainText("External records not observable");
 });
 test('PRRAS-010 Seventeen source posture links appear',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(context(page).locator(".platform-retention-renewal-archive-seal__source-grid a")).toHaveCount(17);
 });
 test('PRRAS-011 Eighteen persistence boundaries appear',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(context(page).locator(".platform-retention-renewal-archive-seal__persistence-grid > div")).toHaveCount(18);
 });
 test('PRRAS-012 Rows have no edit inputs or forms',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).locator("form,input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
 test('PRRAS-013 Empty derived rows are not evidence of archival sealing',async({page})=>{
  await openRetentionRenewalArchiveSeal(page,{alter:s=>({...s,retention_renewal_archive_seal_rows:[],summary:{...s.summary,retention_renewal_archive_seal_rows_total:0}})});await expect(root(page).locator(".platform-retention-renewal-archive-seal__empty-state")).toContainText("not evidence");await expect(rows(page)).toHaveCount(0);
 });
 test('PRRAS-014 Missing platform tenants permission redirects to dashboard',async({page})=>{
  await openRetentionRenewalArchiveSeal(page,{permissions:RRA_PERMISSIONS.filter(p=>p!=="platform.tenants.read"),expectHeading:false});await expect(page).toHaveURL(/\/platform\/dashboard(?:\?.*)?$/);await expect(rows(page)).toHaveCount(0);
 });
 test('PRRAS-015 Optional announcement and release links are hidden',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(root(page).getByRole("link",{name:"Announcements"})).toHaveCount(0);await expect(root(page).getByRole("link",{name:"Releases"})).toHaveCount(0);
 });
 test('PRRAS-016 Source archive rules and limitations are unchanged',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(root(page).locator(".platform-retention-renewal-archive-seal__rules-grid ul").first().locator("li")).toHaveText([...RRA_RULES]);await expect(root(page).locator(".platform-retention-renewal-archive-seal__rules-grid ul").last().locator("li")).toHaveCount(4);
 });
 test('PRRAS-017 Forbidden server response cannot display archive evidence',async({page})=>{
  await openRetentionRenewalArchiveSeal(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PRRAS-018 Server error presents retry control',async({page})=>{
  await openRetentionRenewalArchiveSeal(page,{status:503});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();
 });
 test('PRRAS-019 Refresh uses GET and never mutates archive evidence',async({page})=>{
  const calls:string[]=[];await openRetentionRenewalArchiveSeal(page,{onCall:(m,p)=>{if(p===RRA_PATH)calls.push(m);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(9);expect(calls.length).toBeGreaterThanOrEqual(2);expect(calls.every(m=>m==="GET")).toBeTruthy();
 });
 test('PRRAS-020 missed_cadence owner and severity label inherited',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-archive-seal__row-heading")).toContainText(SSER_REQUIREMENTS[0].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(0).locator(".platform-retention-renewal-archive-seal__row-badges")).toContainText(SSER_REQUIREMENTS[0].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRAS-021 health_regression owner and severity label inherited',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-archive-seal__row-heading")).toContainText(SSER_REQUIREMENTS[1].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(1).locator(".platform-retention-renewal-archive-seal__row-badges")).toContainText(SSER_REQUIREMENTS[1].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRAS-022 customer_adoption_risk owner and severity label inherited',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-archive-seal__row-heading")).toContainText(SSER_REQUIREMENTS[2].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(2).locator(".platform-retention-renewal-archive-seal__row-badges")).toContainText(SSER_REQUIREMENTS[2].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRAS-023 support_sla_risk owner and severity label inherited',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-archive-seal__row-heading")).toContainText(SSER_REQUIREMENTS[3].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(3).locator(".platform-retention-renewal-archive-seal__row-badges")).toContainText(SSER_REQUIREMENTS[3].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRAS-024 billing_entitlement_exception owner and severity label inherited',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-archive-seal__row-heading")).toContainText(SSER_REQUIREMENTS[4].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(4).locator(".platform-retention-renewal-archive-seal__row-badges")).toContainText(SSER_REQUIREMENTS[4].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRAS-025 backup_restore_gap owner and severity label inherited',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-archive-seal__row-heading")).toContainText(SSER_REQUIREMENTS[5].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(5).locator(".platform-retention-renewal-archive-seal__row-badges")).toContainText(SSER_REQUIREMENTS[5].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRAS-026 deployment_smoke_test_gap owner and severity label inherited',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-archive-seal__row-heading")).toContainText(SSER_REQUIREMENTS[6].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(6).locator(".platform-retention-renewal-archive-seal__row-badges")).toContainText(SSER_REQUIREMENTS[6].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRAS-027 incident_prevention_gap owner and severity label inherited',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-archive-seal__row-heading")).toContainText(SSER_REQUIREMENTS[7].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(7).locator(".platform-retention-renewal-archive-seal__row-badges")).toContainText(SSER_REQUIREMENTS[7].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRAS-028 growth_governance_exception owner and severity label inherited',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-archive-seal__row-heading")).toContainText(SSER_REQUIREMENTS[8].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(8).locator(".platform-retention-renewal-archive-seal__row-badges")).toContainText(SSER_REQUIREMENTS[8].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRAS-029 missed_cadence domain-specific archive evidence required',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-archive-seal__field-groups .platform-retention-renewal-archive-seal__chips").nth(10).locator("span")).toHaveText(RRA_REQUIRED_FIELDS.missed_cadence.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRAS-030 health_regression domain-specific archive evidence required',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-archive-seal__field-groups .platform-retention-renewal-archive-seal__chips").nth(10).locator("span")).toHaveText(RRA_REQUIRED_FIELDS.health_regression.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRAS-031 customer_adoption_risk domain-specific archive evidence required',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-archive-seal__field-groups .platform-retention-renewal-archive-seal__chips").nth(10).locator("span")).toHaveText(RRA_REQUIRED_FIELDS.customer_adoption_risk.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRAS-032 support_sla_risk domain-specific archive evidence required',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-archive-seal__field-groups .platform-retention-renewal-archive-seal__chips").nth(10).locator("span")).toHaveText(RRA_REQUIRED_FIELDS.support_sla_risk.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRAS-033 billing_entitlement_exception domain-specific archive evidence required',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-archive-seal__field-groups .platform-retention-renewal-archive-seal__chips").nth(10).locator("span")).toHaveText(RRA_REQUIRED_FIELDS.billing_entitlement_exception.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRAS-034 backup_restore_gap domain-specific archive evidence required',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-archive-seal__field-groups .platform-retention-renewal-archive-seal__chips").nth(10).locator("span")).toHaveText(RRA_REQUIRED_FIELDS.backup_restore_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRAS-035 deployment_smoke_test_gap domain-specific archive evidence required',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-archive-seal__field-groups .platform-retention-renewal-archive-seal__chips").nth(10).locator("span")).toHaveText(RRA_REQUIRED_FIELDS.deployment_smoke_test_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRAS-036 incident_prevention_gap domain-specific archive evidence required',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-archive-seal__field-groups .platform-retention-renewal-archive-seal__chips").nth(10).locator("span")).toHaveText(RRA_REQUIRED_FIELDS.incident_prevention_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRAS-037 growth_governance_exception domain-specific archive evidence required',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-archive-seal__field-groups .platform-retention-renewal-archive-seal__chips").nth(10).locator("span")).toHaveText(RRA_REQUIRED_FIELDS.growth_governance_exception.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRAS-038 missed_cadence manual archive-seal controls exact',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-archive-seal__field-groups li")).toHaveText([...RRA_CONTROLS]);
 });
 test('PRRAS-039 health_regression manual archive-seal controls exact',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-archive-seal__field-groups li")).toHaveText([...RRA_CONTROLS]);
 });
 test('PRRAS-040 customer_adoption_risk manual archive-seal controls exact',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-archive-seal__field-groups li")).toHaveText([...RRA_CONTROLS]);
 });
 test('PRRAS-041 support_sla_risk manual archive-seal controls exact',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-archive-seal__field-groups li")).toHaveText([...RRA_CONTROLS]);
 });
 test('PRRAS-042 billing_entitlement_exception manual archive-seal controls exact',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-archive-seal__field-groups li")).toHaveText([...RRA_CONTROLS]);
 });
 test('PRRAS-043 backup_restore_gap manual archive-seal controls exact',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-archive-seal__field-groups li")).toHaveText([...RRA_CONTROLS]);
 });
 test('PRRAS-044 deployment_smoke_test_gap manual archive-seal controls exact',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-archive-seal__field-groups li")).toHaveText([...RRA_CONTROLS]);
 });
 test('PRRAS-045 incident_prevention_gap manual archive-seal controls exact',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-archive-seal__field-groups li")).toHaveText([...RRA_CONTROLS]);
 });
 test('PRRAS-046 growth_governance_exception manual archive-seal controls exact',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-archive-seal__field-groups li")).toHaveText([...RRA_CONTROLS]);
 });
 test('PRRAS-047 missed_cadence navigation respects link permissions',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-archive-seal__row-actions a")).toHaveCount(RRA_LINK_COUNTS.missed_cadence);
 });
 test('PRRAS-048 health_regression navigation respects link permissions',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-archive-seal__row-actions a")).toHaveCount(RRA_LINK_COUNTS.health_regression);
 });
 test('PRRAS-049 customer_adoption_risk navigation respects link permissions',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-archive-seal__row-actions a")).toHaveCount(RRA_LINK_COUNTS.customer_adoption_risk);
 });
 test('PRRAS-050 support_sla_risk navigation respects link permissions',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-archive-seal__row-actions a")).toHaveCount(RRA_LINK_COUNTS.support_sla_risk);
 });
 test('PRRAS-051 billing_entitlement_exception navigation respects link permissions',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-archive-seal__row-actions a")).toHaveCount(RRA_LINK_COUNTS.billing_entitlement_exception);
 });
 test('PRRAS-052 backup_restore_gap navigation respects link permissions',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-archive-seal__row-actions a")).toHaveCount(RRA_LINK_COUNTS.backup_restore_gap);
 });
 test('PRRAS-053 deployment_smoke_test_gap navigation respects link permissions',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-archive-seal__row-actions a")).toHaveCount(RRA_LINK_COUNTS.deployment_smoke_test_gap);
 });
 test('PRRAS-054 incident_prevention_gap navigation respects link permissions',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-archive-seal__row-actions a")).toHaveCount(RRA_LINK_COUNTS.incident_prevention_gap);
 });
 test('PRRAS-055 growth_governance_exception navigation respects link permissions',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-archive-seal__row-actions a")).toHaveCount(RRA_LINK_COUNTS.growth_governance_exception);
 });
 test('PRRAS-056 missed_cadence retains final-seal and archive source traceability',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-archive-seal__source-summary > div").first()).toContainText("Source Retention Renewal Final Seal row");await expect(rows(page).nth(0).locator(".platform-retention-renewal-archive-seal__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRAS-057 health_regression retains final-seal and archive source traceability',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-archive-seal__source-summary > div").first()).toContainText("Source Retention Renewal Final Seal row");await expect(rows(page).nth(1).locator(".platform-retention-renewal-archive-seal__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRAS-058 customer_adoption_risk retains final-seal and archive source traceability',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-archive-seal__source-summary > div").first()).toContainText("Source Retention Renewal Final Seal row");await expect(rows(page).nth(2).locator(".platform-retention-renewal-archive-seal__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRAS-059 support_sla_risk retains final-seal and archive source traceability',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-archive-seal__source-summary > div").first()).toContainText("Source Retention Renewal Final Seal row");await expect(rows(page).nth(3).locator(".platform-retention-renewal-archive-seal__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRAS-060 billing_entitlement_exception retains final-seal and archive source traceability',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-archive-seal__source-summary > div").first()).toContainText("Source Retention Renewal Final Seal row");await expect(rows(page).nth(4).locator(".platform-retention-renewal-archive-seal__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRAS-061 backup_restore_gap retains final-seal and archive source traceability',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-archive-seal__source-summary > div").first()).toContainText("Source Retention Renewal Final Seal row");await expect(rows(page).nth(5).locator(".platform-retention-renewal-archive-seal__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRAS-062 deployment_smoke_test_gap retains final-seal and archive source traceability',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-archive-seal__source-summary > div").first()).toContainText("Source Retention Renewal Final Seal row");await expect(rows(page).nth(6).locator(".platform-retention-renewal-archive-seal__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRAS-063 incident_prevention_gap retains final-seal and archive source traceability',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-archive-seal__source-summary > div").first()).toContainText("Source Retention Renewal Final Seal row");await expect(rows(page).nth(7).locator(".platform-retention-renewal-archive-seal__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRAS-064 growth_governance_exception retains final-seal and archive source traceability',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-archive-seal__source-summary > div").first()).toContainText("Source Retention Renewal Final Seal row");await expect(rows(page).nth(8).locator(".platform-retention-renewal-archive-seal__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRAS-065 Missing final seal persistence remains unreported',async({page})=>{
  await openRetentionRenewalArchiveSeal(page,{alter:s=>({...s,retention_renewal_final_seal_persistence:null})});await expect(context(page).locator(".platform-retention-renewal-archive-seal__persistence-grid")).toContainText("Not reported");
 });
 test('PRRAS-066 Absent source_cadence_statuses produces no invented source',async({page})=>{
  await openRetentionRenewalArchiveSeal(page,{alter:s=>({...s,retention_renewal_archive_seal_rows:s.retention_renewal_archive_seal_rows.map((r,i)=>i===0?{...r,source_cadence_statuses:[]}:r)})});await expect(rows(page).first().locator(".platform-retention-renewal-archive-seal__source-rows").nth(0)).toContainText("None reported");
 });
 test('PRRAS-067 Absent source_transition_rows produces no invented source',async({page})=>{
  await openRetentionRenewalArchiveSeal(page,{alter:s=>({...s,retention_renewal_archive_seal_rows:s.retention_renewal_archive_seal_rows.map((r,i)=>i===0?{...r,source_transition_rows:[]}:r)})});await expect(rows(page).first().locator(".platform-retention-renewal-archive-seal__source-rows").nth(1)).toContainText("None reported");
 });
 test('PRRAS-068 Absent source_observation_rows produces no invented source',async({page})=>{
  await openRetentionRenewalArchiveSeal(page,{alter:s=>({...s,retention_renewal_archive_seal_rows:s.retention_renewal_archive_seal_rows.map((r,i)=>i===0?{...r,source_observation_rows:[]}:r)})});await expect(rows(page).first().locator(".platform-retention-renewal-archive-seal__source-rows").nth(2)).toContainText("None reported");
 });
 test('PRRAS-069 Absent source_authorization_rows produces no invented source',async({page})=>{
  await openRetentionRenewalArchiveSeal(page,{alter:s=>({...s,retention_renewal_archive_seal_rows:s.retention_renewal_archive_seal_rows.map((r,i)=>i===0?{...r,source_authorization_rows:[]}:r)})});await expect(rows(page).first().locator(".platform-retention-renewal-archive-seal__source-rows").nth(3)).toContainText("None reported");
 });
 test('PRRAS-070 Archive seal release condition requires external evidence',async({page})=>{
  await openRetentionRenewalArchiveSeal(page);await expect(rows(page).first().locator(".platform-retention-renewal-archive-seal__source-summary")).toContainText("Release condition");await expect(rows(page).locator("form,input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
});
