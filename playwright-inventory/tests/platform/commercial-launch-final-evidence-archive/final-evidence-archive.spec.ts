/** Batch 138, Step 238: synthetic browser contracts only; not proof of external archive retention. */
import {test,expect,type Page} from '@playwright/test';
import {openFinalEvidenceArchive,FEA_PATH,FEA_PERMISSIONS,FEA_REQUIRED_FIELDS,FEA_RULES,FEA_CONTROLS,FEA_LINK_COUNTS} from '../../../support/platformCommercialLaunchFinalEvidenceArchiveFixture';
import {SSER_REQUIREMENTS} from '../../../support/platformCommercialLaunchSteadyStateExceptionReviewFixture';
const root=(p:Page)=>p.locator('.platform-final-evidence-archive');
const rows=(p:Page)=>root(p).locator('.platform-final-evidence-archive__row-card');
const context=(p:Page)=>root(p).locator('.platform-final-evidence-archive__context-panel');
test.describe('Commercial Launch Final Evidence Archive — Step 238 synthetic browser contracts',()=>{
 test('PFEA-001 Final evidence archive heading renders',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(page.getByRole("heading",{name:"Commercial Launch Final Evidence Archive",exact:true})).toBeVisible();
 });
 test('PFEA-002 Step 238 and preparation-only boundary visible',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(root(page)).toContainText("Step 238 — Commercial Launch Final Evidence Archive Board");await expect(root(page)).toContainText("Final evidence archive preparation only");
 });
 test('PFEA-003 External durable closure certification prerequisite shown',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(root(page).locator(".platform-final-evidence-archive__boundary-notice")).toContainText("Independently confirm");
 });
 test('PFEA-004 Ten supporting source links without optional grants',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(root(page).locator(".platform-final-evidence-archive__supporting-pages a")).toHaveCount(10);
 });
 test('PFEA-005 Seven archive summary metrics render',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(root(page).getByLabel("Final evidence archive summary").locator(".io-workspace-stat")).toHaveCount(7);
 });
 test('PFEA-006 All nine final archive rows render',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page)).toHaveCount(SSER_REQUIREMENTS.length);
 });
 test('PFEA-007 Critical severity remains only a template hint',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(1).locator(".platform-final-evidence-archive__row-badges [data-tone]").first()).toHaveAttribute("data-tone","danger");
 });
 test('PFEA-008 Medium severity remains neutral metadata',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(2).locator(".platform-final-evidence-archive__row-badges [data-tone]").first()).toHaveAttribute("data-tone","neutral");
 });
 test('PFEA-009 Zero application archive records does not equal external acceptance',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(root(page).getByLabel("Final evidence archive summary")).toContainText("Archive records stored here");await expect(context(page)).toContainText("External records not observable");
 });
 test('PFEA-010 Eleven upstream source posture links remain available',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(context(page).locator(".platform-final-evidence-archive__source-grid a")).toHaveCount(11);
 });
 test('PFEA-011 Twelve persistence boundaries remain visible',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(context(page).locator(".platform-final-evidence-archive__persistence-grid > div")).toHaveCount(12);
 });
 test('PFEA-012 No input fields or editable archive forms exist',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).locator("form,input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
 test('PFEA-013 An empty row list never proves successful archive',async({page})=>{
  await openFinalEvidenceArchive(page,{alter:s=>({...s,final_evidence_archive_rows:[],summary:{...s.summary,final_evidence_archive_rows_total:0}})});await expect(root(page).locator(".platform-final-evidence-archive__empty-state")).toContainText("not evidence");await expect(rows(page)).toHaveCount(0);
 });
 test('PFEA-014 Missing platform tenants permission redirects to dashboard',async({page})=>{
  await openFinalEvidenceArchive(page,{permissions:FEA_PERMISSIONS.filter(p=>p!=="platform.tenants.read"),expectHeading:false});await expect(page).toHaveURL(/\/platform\/dashboard(?:\?.*)?$/);await expect(rows(page)).toHaveCount(0);
 });
 test('PFEA-015 Announcements and Releases are hidden without optional grants',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(root(page).getByRole("link",{name:"Announcements"})).toHaveCount(0);await expect(root(page).getByRole("link",{name:"Releases"})).toHaveCount(0);
 });
 test('PFEA-016 Three archive rules and four limitations are displayed',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(root(page).locator(".platform-final-evidence-archive__rules-grid ul").first().locator("li")).toHaveText([...FEA_RULES]);await expect(root(page).locator(".platform-final-evidence-archive__rules-grid ul").last().locator("li")).toHaveCount(4);
 });
 test('PFEA-017 A forbidden archive response shows no archive rows',async({page})=>{
  await openFinalEvidenceArchive(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PFEA-018 A 503 archive response offers Retry without archive rows',async({page})=>{
  await openFinalEvidenceArchive(page,{status:503});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PFEA-019 Archive refresh issues GET without mutations',async({page})=>{
  const calls:string[]=[];await openFinalEvidenceArchive(page,{onCall:(m,p)=>{if(p===FEA_PATH)calls.push(m);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(SSER_REQUIREMENTS.length);expect(calls.length).toBeGreaterThanOrEqual(2);expect(calls.every(m=>m==="GET")).toBeTruthy();
 });
 test('PFEA-020 missed_cadence owner and severity are archive template hints',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(0).locator(".platform-final-evidence-archive__row-heading")).toContainText(SSER_REQUIREMENTS[0].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(0).locator(".platform-final-evidence-archive__row-badges")).toContainText(SSER_REQUIREMENTS[0].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PFEA-021 health_regression owner and severity are archive template hints',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(1).locator(".platform-final-evidence-archive__row-heading")).toContainText(SSER_REQUIREMENTS[1].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(1).locator(".platform-final-evidence-archive__row-badges")).toContainText(SSER_REQUIREMENTS[1].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PFEA-022 customer_adoption_risk owner and severity are archive template hints',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(2).locator(".platform-final-evidence-archive__row-heading")).toContainText(SSER_REQUIREMENTS[2].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(2).locator(".platform-final-evidence-archive__row-badges")).toContainText(SSER_REQUIREMENTS[2].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PFEA-023 support_sla_risk owner and severity are archive template hints',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(3).locator(".platform-final-evidence-archive__row-heading")).toContainText(SSER_REQUIREMENTS[3].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(3).locator(".platform-final-evidence-archive__row-badges")).toContainText(SSER_REQUIREMENTS[3].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PFEA-024 billing_entitlement_exception owner and severity are archive template hints',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(4).locator(".platform-final-evidence-archive__row-heading")).toContainText(SSER_REQUIREMENTS[4].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(4).locator(".platform-final-evidence-archive__row-badges")).toContainText(SSER_REQUIREMENTS[4].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PFEA-025 backup_restore_gap owner and severity are archive template hints',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(5).locator(".platform-final-evidence-archive__row-heading")).toContainText(SSER_REQUIREMENTS[5].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(5).locator(".platform-final-evidence-archive__row-badges")).toContainText(SSER_REQUIREMENTS[5].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PFEA-026 deployment_smoke_test_gap owner and severity are archive template hints',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(6).locator(".platform-final-evidence-archive__row-heading")).toContainText(SSER_REQUIREMENTS[6].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(6).locator(".platform-final-evidence-archive__row-badges")).toContainText(SSER_REQUIREMENTS[6].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PFEA-027 incident_prevention_gap owner and severity are archive template hints',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(7).locator(".platform-final-evidence-archive__row-heading")).toContainText(SSER_REQUIREMENTS[7].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(7).locator(".platform-final-evidence-archive__row-badges")).toContainText(SSER_REQUIREMENTS[7].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PFEA-028 growth_governance_exception owner and severity are archive template hints',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(8).locator(".platform-final-evidence-archive__row-heading")).toContainText(SSER_REQUIREMENTS[8].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(8).locator(".platform-final-evidence-archive__row-badges")).toContainText(SSER_REQUIREMENTS[8].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PFEA-029 missed_cadence four exact external archive evidence labels',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(0).locator(".platform-final-evidence-archive__field-groups .platform-final-evidence-archive__chips").nth(4).locator("span")).toHaveText(FEA_REQUIRED_FIELDS.missed_cadence.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PFEA-030 health_regression four exact external archive evidence labels',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(1).locator(".platform-final-evidence-archive__field-groups .platform-final-evidence-archive__chips").nth(4).locator("span")).toHaveText(FEA_REQUIRED_FIELDS.health_regression.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PFEA-031 customer_adoption_risk four exact external archive evidence labels',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(2).locator(".platform-final-evidence-archive__field-groups .platform-final-evidence-archive__chips").nth(4).locator("span")).toHaveText(FEA_REQUIRED_FIELDS.customer_adoption_risk.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PFEA-032 support_sla_risk four exact external archive evidence labels',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(3).locator(".platform-final-evidence-archive__field-groups .platform-final-evidence-archive__chips").nth(4).locator("span")).toHaveText(FEA_REQUIRED_FIELDS.support_sla_risk.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PFEA-033 billing_entitlement_exception four exact external archive evidence labels',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(4).locator(".platform-final-evidence-archive__field-groups .platform-final-evidence-archive__chips").nth(4).locator("span")).toHaveText(FEA_REQUIRED_FIELDS.billing_entitlement_exception.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PFEA-034 backup_restore_gap four exact external archive evidence labels',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(5).locator(".platform-final-evidence-archive__field-groups .platform-final-evidence-archive__chips").nth(4).locator("span")).toHaveText(FEA_REQUIRED_FIELDS.backup_restore_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PFEA-035 deployment_smoke_test_gap four exact external archive evidence labels',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(6).locator(".platform-final-evidence-archive__field-groups .platform-final-evidence-archive__chips").nth(4).locator("span")).toHaveText(FEA_REQUIRED_FIELDS.deployment_smoke_test_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PFEA-036 incident_prevention_gap four exact external archive evidence labels',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(7).locator(".platform-final-evidence-archive__field-groups .platform-final-evidence-archive__chips").nth(4).locator("span")).toHaveText(FEA_REQUIRED_FIELDS.incident_prevention_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PFEA-037 growth_governance_exception four exact external archive evidence labels',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(8).locator(".platform-final-evidence-archive__field-groups .platform-final-evidence-archive__chips").nth(4).locator("span")).toHaveText(FEA_REQUIRED_FIELDS.growth_governance_exception.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PFEA-038 missed_cadence three manual archive controls',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(0).locator(".platform-final-evidence-archive__field-groups li")).toHaveText([...FEA_CONTROLS]);
 });
 test('PFEA-039 health_regression three manual archive controls',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(1).locator(".platform-final-evidence-archive__field-groups li")).toHaveText([...FEA_CONTROLS]);
 });
 test('PFEA-040 customer_adoption_risk three manual archive controls',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(2).locator(".platform-final-evidence-archive__field-groups li")).toHaveText([...FEA_CONTROLS]);
 });
 test('PFEA-041 support_sla_risk three manual archive controls',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(3).locator(".platform-final-evidence-archive__field-groups li")).toHaveText([...FEA_CONTROLS]);
 });
 test('PFEA-042 billing_entitlement_exception three manual archive controls',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(4).locator(".platform-final-evidence-archive__field-groups li")).toHaveText([...FEA_CONTROLS]);
 });
 test('PFEA-043 backup_restore_gap three manual archive controls',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(5).locator(".platform-final-evidence-archive__field-groups li")).toHaveText([...FEA_CONTROLS]);
 });
 test('PFEA-044 deployment_smoke_test_gap three manual archive controls',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(6).locator(".platform-final-evidence-archive__field-groups li")).toHaveText([...FEA_CONTROLS]);
 });
 test('PFEA-045 incident_prevention_gap three manual archive controls',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(7).locator(".platform-final-evidence-archive__field-groups li")).toHaveText([...FEA_CONTROLS]);
 });
 test('PFEA-046 growth_governance_exception three manual archive controls',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(8).locator(".platform-final-evidence-archive__field-groups li")).toHaveText([...FEA_CONTROLS]);
 });
 test('PFEA-047 missed_cadence correctly permission-filtered source links',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(0).locator(".platform-final-evidence-archive__row-actions a")).toHaveCount(FEA_LINK_COUNTS.missed_cadence);
 });
 test('PFEA-048 health_regression correctly permission-filtered source links',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(1).locator(".platform-final-evidence-archive__row-actions a")).toHaveCount(FEA_LINK_COUNTS.health_regression);
 });
 test('PFEA-049 customer_adoption_risk correctly permission-filtered source links',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(2).locator(".platform-final-evidence-archive__row-actions a")).toHaveCount(FEA_LINK_COUNTS.customer_adoption_risk);
 });
 test('PFEA-050 support_sla_risk correctly permission-filtered source links',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(3).locator(".platform-final-evidence-archive__row-actions a")).toHaveCount(FEA_LINK_COUNTS.support_sla_risk);
 });
 test('PFEA-051 billing_entitlement_exception correctly permission-filtered source links',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(4).locator(".platform-final-evidence-archive__row-actions a")).toHaveCount(FEA_LINK_COUNTS.billing_entitlement_exception);
 });
 test('PFEA-052 backup_restore_gap correctly permission-filtered source links',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(5).locator(".platform-final-evidence-archive__row-actions a")).toHaveCount(FEA_LINK_COUNTS.backup_restore_gap);
 });
 test('PFEA-053 deployment_smoke_test_gap correctly permission-filtered source links',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(6).locator(".platform-final-evidence-archive__row-actions a")).toHaveCount(FEA_LINK_COUNTS.deployment_smoke_test_gap);
 });
 test('PFEA-054 incident_prevention_gap correctly permission-filtered source links',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(7).locator(".platform-final-evidence-archive__row-actions a")).toHaveCount(FEA_LINK_COUNTS.incident_prevention_gap);
 });
 test('PFEA-055 growth_governance_exception correctly permission-filtered source links',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(8).locator(".platform-final-evidence-archive__row-actions a")).toHaveCount(FEA_LINK_COUNTS.growth_governance_exception);
 });
 test('PFEA-056 missed_cadence final archive still requires external durable certification',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(0).locator(".platform-final-evidence-archive__source-summary")).toContainText("Source Durable Closure Certification row");await expect(rows(page).nth(0).locator(".platform-final-evidence-archive__row-badges")).toContainText("Waiting for external durable closure certification confirmation");
 });
 test('PFEA-057 health_regression final archive still requires external durable certification',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(1).locator(".platform-final-evidence-archive__source-summary")).toContainText("Source Durable Closure Certification row");await expect(rows(page).nth(1).locator(".platform-final-evidence-archive__row-badges")).toContainText("Waiting for external durable closure certification confirmation");
 });
 test('PFEA-058 customer_adoption_risk final archive still requires external durable certification',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(2).locator(".platform-final-evidence-archive__source-summary")).toContainText("Source Durable Closure Certification row");await expect(rows(page).nth(2).locator(".platform-final-evidence-archive__row-badges")).toContainText("Waiting for external durable closure certification confirmation");
 });
 test('PFEA-059 support_sla_risk final archive still requires external durable certification',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(3).locator(".platform-final-evidence-archive__source-summary")).toContainText("Source Durable Closure Certification row");await expect(rows(page).nth(3).locator(".platform-final-evidence-archive__row-badges")).toContainText("Waiting for external durable closure certification confirmation");
 });
 test('PFEA-060 billing_entitlement_exception final archive still requires external durable certification',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(4).locator(".platform-final-evidence-archive__source-summary")).toContainText("Source Durable Closure Certification row");await expect(rows(page).nth(4).locator(".platform-final-evidence-archive__row-badges")).toContainText("Waiting for external durable closure certification confirmation");
 });
 test('PFEA-061 backup_restore_gap final archive still requires external durable certification',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(5).locator(".platform-final-evidence-archive__source-summary")).toContainText("Source Durable Closure Certification row");await expect(rows(page).nth(5).locator(".platform-final-evidence-archive__row-badges")).toContainText("Waiting for external durable closure certification confirmation");
 });
 test('PFEA-062 deployment_smoke_test_gap final archive still requires external durable certification',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(6).locator(".platform-final-evidence-archive__source-summary")).toContainText("Source Durable Closure Certification row");await expect(rows(page).nth(6).locator(".platform-final-evidence-archive__row-badges")).toContainText("Waiting for external durable closure certification confirmation");
 });
 test('PFEA-063 incident_prevention_gap final archive still requires external durable certification',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(7).locator(".platform-final-evidence-archive__source-summary")).toContainText("Source Durable Closure Certification row");await expect(rows(page).nth(7).locator(".platform-final-evidence-archive__row-badges")).toContainText("Waiting for external durable closure certification confirmation");
 });
 test('PFEA-064 growth_governance_exception final archive still requires external durable certification',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).nth(8).locator(".platform-final-evidence-archive__source-summary")).toContainText("Source Durable Closure Certification row");await expect(rows(page).nth(8).locator(".platform-final-evidence-archive__row-badges")).toContainText("Waiting for external durable closure certification confirmation");
 });
 test('PFEA-065 Null final-archive persistence renders unknown boundary',async({page})=>{
  await openFinalEvidenceArchive(page,{alter:s=>({...s,final_evidence_archive_persistence:null})});await expect(context(page).locator(".platform-final-evidence-archive__persistence-grid")).toContainText("Not reported");
 });
 test('PFEA-066 Every archive row retains durable certification provenance',async({page})=>{
  await openFinalEvidenceArchive(page);await expect(rows(page).locator(".platform-final-evidence-archive__source-summary")).toHaveCount(SSER_REQUIREMENTS.length);await expect(rows(page).first().locator(".platform-final-evidence-archive__field-groups")).toContainText("Required source durable-closure certification evidence");
 });
 test('PFEA-067 Empty final archive is not proof external files were archived',async({page})=>{
  await openFinalEvidenceArchive(page,{alter:s=>({...s,final_evidence_archive_rows:[],summary:{...s.summary,final_evidence_archive_rows_total:0}})});await expect(root(page).locator(".platform-final-evidence-archive__empty-state")).toContainText("not evidence");await expect(rows(page)).toHaveCount(0);
 });
 test('PFEA-068 Failed forbidden archive request exposes no fake archive rows',async({page})=>{
  await openFinalEvidenceArchive(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PFEA-069 Temporary archive failure preserves explicit Retry',async({page})=>{
  await openFinalEvidenceArchive(page,{status:503});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PFEA-070 Final archive manual refresh sends GET only',async({page})=>{
  const methods:string[]=[];await openFinalEvidenceArchive(page,{onCall:(m,p)=>{if(p===FEA_PATH)methods.push(m);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(SSER_REQUIREMENTS.length);expect(methods.length).toBeGreaterThanOrEqual(2);expect(methods.every(m=>m==="GET")).toBeTruthy();
 });
});
