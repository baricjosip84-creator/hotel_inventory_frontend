/** Batch 142, Step 242: synthetic browser contracts, not external certification evidence. */
import {test,expect,type Page} from '@playwright/test';
import {openRetentionRenewalCertification,RRCB_PATH,RRCB_PERMISSIONS,RRCB_REQUIRED_FIELDS,RRCB_RULES,RRCB_CONTROLS,RRCB_LINK_COUNTS} from '../../../support/platformCommercialLaunchRetentionRenewalCertificationFixture';
import {SSER_REQUIREMENTS} from '../../../support/platformCommercialLaunchSteadyStateExceptionReviewFixture';
const root=(p:Page)=>p.locator('.platform-retention-renewal-certification');
const rows=(p:Page)=>root(p).locator('.platform-retention-renewal-certification__row-card');
const context=(p:Page)=>root(p).locator('.platform-retention-renewal-certification__context-panel');
test.describe('Commercial Launch Retention Renewal Certification — Step 242 synthetic browser contracts',()=>{
 test('PRRC-001 Certification heading matches source',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(page.getByRole("heading",{name:"Commercial Launch Retention Renewal Certification",exact:true})).toBeVisible();
 });
 test('PRRC-002 Step 242 and preparation notice remain visible',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(root(page)).toContainText("Step 242 — Commercial Launch Retention Renewal Certification Board");await expect(root(page)).toContainText("Retention renewal certification preparation only");
 });
 test('PRRC-003 Prior external acceptance must be verified',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(root(page).locator(".platform-retention-renewal-certification__boundary-notice")).toContainText("Independently confirm");
 });
 test('PRRC-004 Fourteen unconditional supporting links',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(root(page).locator(".platform-retention-renewal-certification__supporting-pages a")).toHaveCount(14);
 });
 test('PRRC-005 Seven summary metrics are displayed',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(root(page).getByLabel("Retention renewal certification summary").locator(".io-workspace-stat")).toHaveCount(7);
 });
 test('PRRC-006 All nine certification rows render',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page)).toHaveCount(Object.keys(RRCB_REQUIRED_FIELDS).length);
 });
 test('PRRC-007 Critical badge is danger tone',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-certification__row-badges [data-tone]").first()).toHaveAttribute("data-tone","danger");
 });
 test('PRRC-008 Medium severity uses neutral tone',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-certification__row-badges [data-tone]").first()).toHaveAttribute("data-tone","neutral");
 });
 test('PRRC-009 Zero stored certification records is not external proof',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(root(page).getByLabel("Retention renewal certification summary")).toContainText("Certification records stored here");await expect(context(page)).toContainText("External records not observable");
 });
 test('PRRC-010 Fifteen upstream evidence links render',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(context(page).locator(".platform-retention-renewal-certification__source-grid a")).toHaveCount(15);
 });
 test('PRRC-011 Sixteen persistence boundaries render',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(context(page).locator(".platform-retention-renewal-certification__persistence-grid > div")).toHaveCount(16);
 });
 test('PRRC-012 Certification rows contain no edit controls',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).locator("form,input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
 test('PRRC-013 Empty response cannot be treated as accepted certification',async({page})=>{
  await openRetentionRenewalCertification(page,{alter:s=>({...s,retention_renewal_certification_rows:[],summary:{...s.summary,retention_renewal_certification_rows_total:0}})});await expect(root(page).locator(".platform-retention-renewal-certification__empty-state")).toContainText("not evidence");await expect(rows(page)).toHaveCount(0);
 });
 test('PRRC-014 Missing tenant permission redirects',async({page})=>{
  await openRetentionRenewalCertification(page,{permissions:RRCB_PERMISSIONS.filter(p=>p!=="platform.tenants.read"),expectHeading:false});await expect(page).toHaveURL(/\/platform\/dashboard(?:\?.*)?$/);await expect(rows(page)).toHaveCount(0);
 });
 test('PRRC-015 Optional announcements and releases are hidden',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(root(page).getByRole("link",{name:"Announcements"})).toHaveCount(0);await expect(root(page).getByRole("link",{name:"Releases"})).toHaveCount(0);
 });
 test('PRRC-016 Three source rules and four limitations remain exact',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(root(page).locator(".platform-retention-renewal-certification__rules-grid ul").first().locator("li")).toHaveText([...RRCB_RULES]);await expect(root(page).locator(".platform-retention-renewal-certification__rules-grid ul").last().locator("li")).toHaveCount(4);
 });
 test('PRRC-017 Forbidden API response hides certification rows',async({page})=>{
  await openRetentionRenewalCertification(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PRRC-018 Unavailable backend displays retry button',async({page})=>{
  await openRetentionRenewalCertification(page,{status:503});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();
 });
 test('PRRC-019 Refresh uses GET without mutation',async({page})=>{
  const calls:string[]=[];await openRetentionRenewalCertification(page,{onCall:(m,p)=>{if(p===RRCB_PATH)calls.push(m);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(9);expect(calls.length).toBeGreaterThanOrEqual(2);expect(calls.every(m=>m==="GET")).toBeTruthy();
 });
 test('PRRC-020 missed_cadence owner severity source values',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-certification__row-heading")).toContainText(SSER_REQUIREMENTS[0].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(0).locator(".platform-retention-renewal-certification__row-badges")).toContainText(SSER_REQUIREMENTS[0].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRC-021 health_regression owner severity source values',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-certification__row-heading")).toContainText(SSER_REQUIREMENTS[1].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(1).locator(".platform-retention-renewal-certification__row-badges")).toContainText(SSER_REQUIREMENTS[1].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRC-022 customer_adoption_risk owner severity source values',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-certification__row-heading")).toContainText(SSER_REQUIREMENTS[2].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(2).locator(".platform-retention-renewal-certification__row-badges")).toContainText(SSER_REQUIREMENTS[2].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRC-023 support_sla_risk owner severity source values',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-certification__row-heading")).toContainText(SSER_REQUIREMENTS[3].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(3).locator(".platform-retention-renewal-certification__row-badges")).toContainText(SSER_REQUIREMENTS[3].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRC-024 billing_entitlement_exception owner severity source values',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-certification__row-heading")).toContainText(SSER_REQUIREMENTS[4].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(4).locator(".platform-retention-renewal-certification__row-badges")).toContainText(SSER_REQUIREMENTS[4].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRC-025 backup_restore_gap owner severity source values',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-certification__row-heading")).toContainText(SSER_REQUIREMENTS[5].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(5).locator(".platform-retention-renewal-certification__row-badges")).toContainText(SSER_REQUIREMENTS[5].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRC-026 deployment_smoke_test_gap owner severity source values',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-certification__row-heading")).toContainText(SSER_REQUIREMENTS[6].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(6).locator(".platform-retention-renewal-certification__row-badges")).toContainText(SSER_REQUIREMENTS[6].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRC-027 incident_prevention_gap owner severity source values',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-certification__row-heading")).toContainText(SSER_REQUIREMENTS[7].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(7).locator(".platform-retention-renewal-certification__row-badges")).toContainText(SSER_REQUIREMENTS[7].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRC-028 growth_governance_exception owner severity source values',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-certification__row-heading")).toContainText(SSER_REQUIREMENTS[8].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(8).locator(".platform-retention-renewal-certification__row-badges")).toContainText(SSER_REQUIREMENTS[8].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PRRC-029 missed_cadence exact certification evidence fields',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-certification__field-groups .platform-retention-renewal-certification__chips").nth(8).locator("span")).toHaveText(RRCB_REQUIRED_FIELDS.missed_cadence.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRC-030 health_regression exact certification evidence fields',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-certification__field-groups .platform-retention-renewal-certification__chips").nth(8).locator("span")).toHaveText(RRCB_REQUIRED_FIELDS.health_regression.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRC-031 customer_adoption_risk exact certification evidence fields',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-certification__field-groups .platform-retention-renewal-certification__chips").nth(8).locator("span")).toHaveText(RRCB_REQUIRED_FIELDS.customer_adoption_risk.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRC-032 support_sla_risk exact certification evidence fields',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-certification__field-groups .platform-retention-renewal-certification__chips").nth(8).locator("span")).toHaveText(RRCB_REQUIRED_FIELDS.support_sla_risk.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRC-033 billing_entitlement_exception exact certification evidence fields',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-certification__field-groups .platform-retention-renewal-certification__chips").nth(8).locator("span")).toHaveText(RRCB_REQUIRED_FIELDS.billing_entitlement_exception.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRC-034 backup_restore_gap exact certification evidence fields',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-certification__field-groups .platform-retention-renewal-certification__chips").nth(8).locator("span")).toHaveText(RRCB_REQUIRED_FIELDS.backup_restore_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRC-035 deployment_smoke_test_gap exact certification evidence fields',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-certification__field-groups .platform-retention-renewal-certification__chips").nth(8).locator("span")).toHaveText(RRCB_REQUIRED_FIELDS.deployment_smoke_test_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRC-036 incident_prevention_gap exact certification evidence fields',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-certification__field-groups .platform-retention-renewal-certification__chips").nth(8).locator("span")).toHaveText(RRCB_REQUIRED_FIELDS.incident_prevention_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRC-037 growth_governance_exception exact certification evidence fields',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-certification__field-groups .platform-retention-renewal-certification__chips").nth(8).locator("span")).toHaveText(RRCB_REQUIRED_FIELDS.growth_governance_exception.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PRRC-038 missed_cadence certification controls visible',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-certification__field-groups li")).toHaveText([...RRCB_CONTROLS]);
 });
 test('PRRC-039 health_regression certification controls visible',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-certification__field-groups li")).toHaveText([...RRCB_CONTROLS]);
 });
 test('PRRC-040 customer_adoption_risk certification controls visible',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-certification__field-groups li")).toHaveText([...RRCB_CONTROLS]);
 });
 test('PRRC-041 support_sla_risk certification controls visible',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-certification__field-groups li")).toHaveText([...RRCB_CONTROLS]);
 });
 test('PRRC-042 billing_entitlement_exception certification controls visible',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-certification__field-groups li")).toHaveText([...RRCB_CONTROLS]);
 });
 test('PRRC-043 backup_restore_gap certification controls visible',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-certification__field-groups li")).toHaveText([...RRCB_CONTROLS]);
 });
 test('PRRC-044 deployment_smoke_test_gap certification controls visible',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-certification__field-groups li")).toHaveText([...RRCB_CONTROLS]);
 });
 test('PRRC-045 incident_prevention_gap certification controls visible',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-certification__field-groups li")).toHaveText([...RRCB_CONTROLS]);
 });
 test('PRRC-046 growth_governance_exception certification controls visible',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-certification__field-groups li")).toHaveText([...RRCB_CONTROLS]);
 });
 test('PRRC-047 missed_cadence permission-scoped evidence shortcuts',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-certification__row-actions a")).toHaveCount(RRCB_LINK_COUNTS.missed_cadence);
 });
 test('PRRC-048 health_regression permission-scoped evidence shortcuts',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-certification__row-actions a")).toHaveCount(RRCB_LINK_COUNTS.health_regression);
 });
 test('PRRC-049 customer_adoption_risk permission-scoped evidence shortcuts',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-certification__row-actions a")).toHaveCount(RRCB_LINK_COUNTS.customer_adoption_risk);
 });
 test('PRRC-050 support_sla_risk permission-scoped evidence shortcuts',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-certification__row-actions a")).toHaveCount(RRCB_LINK_COUNTS.support_sla_risk);
 });
 test('PRRC-051 billing_entitlement_exception permission-scoped evidence shortcuts',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-certification__row-actions a")).toHaveCount(RRCB_LINK_COUNTS.billing_entitlement_exception);
 });
 test('PRRC-052 backup_restore_gap permission-scoped evidence shortcuts',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-certification__row-actions a")).toHaveCount(RRCB_LINK_COUNTS.backup_restore_gap);
 });
 test('PRRC-053 deployment_smoke_test_gap permission-scoped evidence shortcuts',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-certification__row-actions a")).toHaveCount(RRCB_LINK_COUNTS.deployment_smoke_test_gap);
 });
 test('PRRC-054 incident_prevention_gap permission-scoped evidence shortcuts',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-certification__row-actions a")).toHaveCount(RRCB_LINK_COUNTS.incident_prevention_gap);
 });
 test('PRRC-055 growth_governance_exception permission-scoped evidence shortcuts',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-certification__row-actions a")).toHaveCount(RRCB_LINK_COUNTS.growth_governance_exception);
 });
 test('PRRC-056 missed_cadence retains external acceptance source ancestry',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(0).locator(".platform-retention-renewal-certification__source-summary > div").first()).toContainText("Source Retention Renewal Acceptance row");await expect(rows(page).nth(0).locator(".platform-retention-renewal-certification__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRC-057 health_regression retains external acceptance source ancestry',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(1).locator(".platform-retention-renewal-certification__source-summary > div").first()).toContainText("Source Retention Renewal Acceptance row");await expect(rows(page).nth(1).locator(".platform-retention-renewal-certification__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRC-058 customer_adoption_risk retains external acceptance source ancestry',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(2).locator(".platform-retention-renewal-certification__source-summary > div").first()).toContainText("Source Retention Renewal Acceptance row");await expect(rows(page).nth(2).locator(".platform-retention-renewal-certification__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRC-059 support_sla_risk retains external acceptance source ancestry',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(3).locator(".platform-retention-renewal-certification__source-summary > div").first()).toContainText("Source Retention Renewal Acceptance row");await expect(rows(page).nth(3).locator(".platform-retention-renewal-certification__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRC-060 billing_entitlement_exception retains external acceptance source ancestry',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(4).locator(".platform-retention-renewal-certification__source-summary > div").first()).toContainText("Source Retention Renewal Acceptance row");await expect(rows(page).nth(4).locator(".platform-retention-renewal-certification__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRC-061 backup_restore_gap retains external acceptance source ancestry',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(5).locator(".platform-retention-renewal-certification__source-summary > div").first()).toContainText("Source Retention Renewal Acceptance row");await expect(rows(page).nth(5).locator(".platform-retention-renewal-certification__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRC-062 deployment_smoke_test_gap retains external acceptance source ancestry',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(6).locator(".platform-retention-renewal-certification__source-summary > div").first()).toContainText("Source Retention Renewal Acceptance row");await expect(rows(page).nth(6).locator(".platform-retention-renewal-certification__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRC-063 incident_prevention_gap retains external acceptance source ancestry',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(7).locator(".platform-retention-renewal-certification__source-summary > div").first()).toContainText("Source Retention Renewal Acceptance row");await expect(rows(page).nth(7).locator(".platform-retention-renewal-certification__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRC-064 growth_governance_exception retains external acceptance source ancestry',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).nth(8).locator(".platform-retention-renewal-certification__source-summary > div").first()).toContainText("Source Retention Renewal Acceptance row");await expect(rows(page).nth(8).locator(".platform-retention-renewal-certification__source-summary > div").first()).toContainText("Waiting for external");
 });
 test('PRRC-065 Missing acceptance persistence is not inferred',async({page})=>{
  await openRetentionRenewalCertification(page,{alter:s=>({...s,retention_renewal_acceptance_persistence:null})});await expect(context(page).locator(".platform-retention-renewal-certification__persistence-grid")).toContainText("Not reported");
 });
 test('PRRC-066 Missing source_cadence_statuses source produces none reported',async({page})=>{
  await openRetentionRenewalCertification(page,{alter:s=>({...s,retention_renewal_certification_rows:s.retention_renewal_certification_rows.map((r,i)=>i===0?{...r,source_cadence_statuses:[]}:r)})});await expect(rows(page).first().locator(".platform-retention-renewal-certification__source-rows").nth(0)).toContainText("None reported");
 });
 test('PRRC-067 Missing source_transition_rows source produces none reported',async({page})=>{
  await openRetentionRenewalCertification(page,{alter:s=>({...s,retention_renewal_certification_rows:s.retention_renewal_certification_rows.map((r,i)=>i===0?{...r,source_transition_rows:[]}:r)})});await expect(rows(page).first().locator(".platform-retention-renewal-certification__source-rows").nth(1)).toContainText("None reported");
 });
 test('PRRC-068 Missing source_observation_rows source produces none reported',async({page})=>{
  await openRetentionRenewalCertification(page,{alter:s=>({...s,retention_renewal_certification_rows:s.retention_renewal_certification_rows.map((r,i)=>i===0?{...r,source_observation_rows:[]}:r)})});await expect(rows(page).first().locator(".platform-retention-renewal-certification__source-rows").nth(2)).toContainText("None reported");
 });
 test('PRRC-069 Missing source_authorization_rows source produces none reported',async({page})=>{
  await openRetentionRenewalCertification(page,{alter:s=>({...s,retention_renewal_certification_rows:s.retention_renewal_certification_rows.map((r,i)=>i===0?{...r,source_authorization_rows:[]}:r)})});await expect(rows(page).first().locator(".platform-retention-renewal-certification__source-rows").nth(3)).toContainText("None reported");
 });
 test('PRRC-070 Certification release condition remains external and read-only',async({page})=>{
  await openRetentionRenewalCertification(page);await expect(rows(page).first().locator(".platform-retention-renewal-certification__source-summary")).toContainText("Release condition");await expect(rows(page).locator("form,input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
});
