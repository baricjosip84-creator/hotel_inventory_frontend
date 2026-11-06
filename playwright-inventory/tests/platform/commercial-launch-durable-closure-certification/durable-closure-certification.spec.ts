/** Batch 137, Step 237: synthetic browser contracts, NOT external certification evidence. */
import {test,expect,type Page} from '@playwright/test';
import {openDurableClosureCertification,DCC_PATH,DCC_PERMISSIONS,DCC_REQUIRED_FIELDS,DCC_RULES,DCC_CONTROLS,DCC_LINK_COUNTS} from '../../../support/platformCommercialLaunchDurableClosureCertificationFixture';
import {SSER_REQUIREMENTS} from '../../../support/platformCommercialLaunchSteadyStateExceptionReviewFixture';
const root=(p:Page)=>p.locator('.platform-durable-closure-certification');
const rows=(p:Page)=>root(p).locator('.platform-durable-closure-certification__row-card');
const context=(p:Page)=>root(p).locator('.platform-durable-closure-certification__context-panel');
test.describe('Commercial Launch Durable Closure Certification — Step 237 synthetic browser contracts',()=>{
 test('PDCC-001 Durable closure page heading renders',async({page})=>{
  await openDurableClosureCertification(page);await expect(page.getByRole("heading",{name:"Commercial Launch Durable Closure Certification",exact:true})).toBeVisible();
 });
 test('PDCC-002 Step 237 preparation is explicit',async({page})=>{
  await openDurableClosureCertification(page);await expect(root(page)).toContainText("Step 237 — Commercial Launch Durable Closure Certification Board");await expect(root(page)).toContainText("Durable closure certification preparation only");
 });
 test('PDCC-003 External resolution verification is mandatory',async({page})=>{
  await openDurableClosureCertification(page);await expect(root(page).locator(".platform-durable-closure-certification__boundary-notice")).toContainText("Independently confirm");
 });
 test('PDCC-004 Nine core supporting links remain visible',async({page})=>{
  await openDurableClosureCertification(page);await expect(root(page).locator(".platform-durable-closure-certification__supporting-pages a")).toHaveCount(9);
 });
 test('PDCC-005 Seven summary metrics render',async({page})=>{
  await openDurableClosureCertification(page);await expect(root(page).getByLabel("Durable closure certification summary").locator(".io-workspace-stat")).toHaveCount(7);
 });
 test('PDCC-006 Nine durable closure template rows render',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page)).toHaveCount(SSER_REQUIREMENTS.length);
 });
 test('PDCC-007 Critical severity remains a template hint',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(1).locator(".platform-durable-closure-certification__row-badges [data-tone]").first()).toHaveAttribute("data-tone","danger");
 });
 test('PDCC-008 Medium severity remains neutral',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(2).locator(".platform-durable-closure-certification__row-badges [data-tone]").first()).toHaveAttribute("data-tone","neutral");
 });
 test('PDCC-009 Zero stored certificates is not external acceptance',async({page})=>{
  await openDurableClosureCertification(page);await expect(root(page).getByLabel("Durable closure certification summary")).toContainText("Certification records stored here");await expect(context(page)).toContainText("External records not observable");
 });
 test('PDCC-010 Ten source posture links preserve provenance',async({page})=>{
  await openDurableClosureCertification(page);await expect(context(page).locator(".platform-durable-closure-certification__source-grid a")).toHaveCount(10);
 });
 test('PDCC-011 Eleven independent persistence boundaries appear',async({page})=>{
  await openDurableClosureCertification(page);await expect(context(page).locator(".platform-durable-closure-certification__persistence-grid > div")).toHaveCount(11);
 });
 test('PDCC-012 Certification board contains no editable fields',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).locator("form,input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
 test('PDCC-013 Zero rows cannot establish durable certification',async({page})=>{
  await openDurableClosureCertification(page,{alter:s=>({...s,durable_closure_certification_rows:[],summary:{...s.summary,durable_closure_certification_rows_total:0}})});await expect(root(page).locator(".platform-durable-closure-certification__empty-state")).toContainText("not evidence");await expect(rows(page)).toHaveCount(0);
 });
 test('PDCC-014 Missing required permission redirects',async({page})=>{
  await openDurableClosureCertification(page,{permissions:DCC_PERMISSIONS.filter(p=>p!=="platform.tenants.read"),expectHeading:false});await expect(page).toHaveURL(/\/platform\/dashboard(?:\?.*)?$/);await expect(rows(page)).toHaveCount(0);
 });
 test('PDCC-015 Optional announcements and releases links hidden',async({page})=>{
  await openDurableClosureCertification(page);await expect(root(page).getByRole("link",{name:"Announcements"})).toHaveCount(0);await expect(root(page).getByRole("link",{name:"Releases"})).toHaveCount(0);
 });
 test('PDCC-016 Three rules and four limitations remain visible',async({page})=>{
  await openDurableClosureCertification(page);await expect(root(page).locator(".platform-durable-closure-certification__rules-grid ul").first().locator("li")).toHaveText([...DCC_RULES]);await expect(root(page).locator(".platform-durable-closure-certification__rules-grid ul").last().locator("li")).toHaveCount(4);
 });
 test('PDCC-017 403 response hides certification data',async({page})=>{
  await openDurableClosureCertification(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PDCC-018 503 response exposes Retry without certification',async({page})=>{
  await openDurableClosureCertification(page,{status:503});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PDCC-019 Refresh remains GET-only and preserves templates',async({page})=>{
  const calls:string[]=[];await openDurableClosureCertification(page,{onCall:(m,p)=>{if(p===DCC_PATH)calls.push(m);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(SSER_REQUIREMENTS.length);expect(calls.length).toBeGreaterThanOrEqual(2);expect(calls.every(m=>m==="GET")).toBeTruthy();
 });
 test('PDCC-020 missed_cadence owner and severity are preparation metadata',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(0).locator(".platform-durable-closure-certification__row-heading")).toContainText(SSER_REQUIREMENTS[0].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(0).locator(".platform-durable-closure-certification__row-badges")).toContainText(SSER_REQUIREMENTS[0].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PDCC-021 health_regression owner and severity are preparation metadata',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(1).locator(".platform-durable-closure-certification__row-heading")).toContainText(SSER_REQUIREMENTS[1].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(1).locator(".platform-durable-closure-certification__row-badges")).toContainText(SSER_REQUIREMENTS[1].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PDCC-022 customer_adoption_risk owner and severity are preparation metadata',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(2).locator(".platform-durable-closure-certification__row-heading")).toContainText(SSER_REQUIREMENTS[2].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(2).locator(".platform-durable-closure-certification__row-badges")).toContainText(SSER_REQUIREMENTS[2].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PDCC-023 support_sla_risk owner and severity are preparation metadata',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(3).locator(".platform-durable-closure-certification__row-heading")).toContainText(SSER_REQUIREMENTS[3].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(3).locator(".platform-durable-closure-certification__row-badges")).toContainText(SSER_REQUIREMENTS[3].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PDCC-024 billing_entitlement_exception owner and severity are preparation metadata',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(4).locator(".platform-durable-closure-certification__row-heading")).toContainText(SSER_REQUIREMENTS[4].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(4).locator(".platform-durable-closure-certification__row-badges")).toContainText(SSER_REQUIREMENTS[4].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PDCC-025 backup_restore_gap owner and severity are preparation metadata',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(5).locator(".platform-durable-closure-certification__row-heading")).toContainText(SSER_REQUIREMENTS[5].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(5).locator(".platform-durable-closure-certification__row-badges")).toContainText(SSER_REQUIREMENTS[5].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PDCC-026 deployment_smoke_test_gap owner and severity are preparation metadata',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(6).locator(".platform-durable-closure-certification__row-heading")).toContainText(SSER_REQUIREMENTS[6].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(6).locator(".platform-durable-closure-certification__row-badges")).toContainText(SSER_REQUIREMENTS[6].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PDCC-027 incident_prevention_gap owner and severity are preparation metadata',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(7).locator(".platform-durable-closure-certification__row-heading")).toContainText(SSER_REQUIREMENTS[7].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(7).locator(".platform-durable-closure-certification__row-badges")).toContainText(SSER_REQUIREMENTS[7].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PDCC-028 growth_governance_exception owner and severity are preparation metadata',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(8).locator(".platform-durable-closure-certification__row-heading")).toContainText(SSER_REQUIREMENTS[8].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(8).locator(".platform-durable-closure-certification__row-badges")).toContainText(SSER_REQUIREMENTS[8].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PDCC-029 missed_cadence exact four external certificate fields',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(0).locator(".platform-durable-closure-certification__field-groups .platform-durable-closure-certification__chips").nth(3).locator("span")).toHaveText(DCC_REQUIRED_FIELDS.missed_cadence.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PDCC-030 health_regression exact four external certificate fields',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(1).locator(".platform-durable-closure-certification__field-groups .platform-durable-closure-certification__chips").nth(3).locator("span")).toHaveText(DCC_REQUIRED_FIELDS.health_regression.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PDCC-031 customer_adoption_risk exact four external certificate fields',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(2).locator(".platform-durable-closure-certification__field-groups .platform-durable-closure-certification__chips").nth(3).locator("span")).toHaveText(DCC_REQUIRED_FIELDS.customer_adoption_risk.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PDCC-032 support_sla_risk exact four external certificate fields',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(3).locator(".platform-durable-closure-certification__field-groups .platform-durable-closure-certification__chips").nth(3).locator("span")).toHaveText(DCC_REQUIRED_FIELDS.support_sla_risk.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PDCC-033 billing_entitlement_exception exact four external certificate fields',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(4).locator(".platform-durable-closure-certification__field-groups .platform-durable-closure-certification__chips").nth(3).locator("span")).toHaveText(DCC_REQUIRED_FIELDS.billing_entitlement_exception.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PDCC-034 backup_restore_gap exact four external certificate fields',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(5).locator(".platform-durable-closure-certification__field-groups .platform-durable-closure-certification__chips").nth(3).locator("span")).toHaveText(DCC_REQUIRED_FIELDS.backup_restore_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PDCC-035 deployment_smoke_test_gap exact four external certificate fields',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(6).locator(".platform-durable-closure-certification__field-groups .platform-durable-closure-certification__chips").nth(3).locator("span")).toHaveText(DCC_REQUIRED_FIELDS.deployment_smoke_test_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PDCC-036 incident_prevention_gap exact four external certificate fields',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(7).locator(".platform-durable-closure-certification__field-groups .platform-durable-closure-certification__chips").nth(3).locator("span")).toHaveText(DCC_REQUIRED_FIELDS.incident_prevention_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PDCC-037 growth_governance_exception exact four external certificate fields',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(8).locator(".platform-durable-closure-certification__field-groups .platform-durable-closure-certification__chips").nth(3).locator("span")).toHaveText(DCC_REQUIRED_FIELDS.growth_governance_exception.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PDCC-038 missed_cadence certification controls are manual',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(0).locator(".platform-durable-closure-certification__field-groups li")).toHaveText([...DCC_CONTROLS]);
 });
 test('PDCC-039 health_regression certification controls are manual',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(1).locator(".platform-durable-closure-certification__field-groups li")).toHaveText([...DCC_CONTROLS]);
 });
 test('PDCC-040 customer_adoption_risk certification controls are manual',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(2).locator(".platform-durable-closure-certification__field-groups li")).toHaveText([...DCC_CONTROLS]);
 });
 test('PDCC-041 support_sla_risk certification controls are manual',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(3).locator(".platform-durable-closure-certification__field-groups li")).toHaveText([...DCC_CONTROLS]);
 });
 test('PDCC-042 billing_entitlement_exception certification controls are manual',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(4).locator(".platform-durable-closure-certification__field-groups li")).toHaveText([...DCC_CONTROLS]);
 });
 test('PDCC-043 backup_restore_gap certification controls are manual',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(5).locator(".platform-durable-closure-certification__field-groups li")).toHaveText([...DCC_CONTROLS]);
 });
 test('PDCC-044 deployment_smoke_test_gap certification controls are manual',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(6).locator(".platform-durable-closure-certification__field-groups li")).toHaveText([...DCC_CONTROLS]);
 });
 test('PDCC-045 incident_prevention_gap certification controls are manual',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(7).locator(".platform-durable-closure-certification__field-groups li")).toHaveText([...DCC_CONTROLS]);
 });
 test('PDCC-046 growth_governance_exception certification controls are manual',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(8).locator(".platform-durable-closure-certification__field-groups li")).toHaveText([...DCC_CONTROLS]);
 });
 test('PDCC-047 missed_cadence permission-filtered evidence links',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(0).locator(".platform-durable-closure-certification__row-actions a")).toHaveCount(DCC_LINK_COUNTS.missed_cadence);
 });
 test('PDCC-048 health_regression permission-filtered evidence links',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(1).locator(".platform-durable-closure-certification__row-actions a")).toHaveCount(DCC_LINK_COUNTS.health_regression);
 });
 test('PDCC-049 customer_adoption_risk permission-filtered evidence links',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(2).locator(".platform-durable-closure-certification__row-actions a")).toHaveCount(DCC_LINK_COUNTS.customer_adoption_risk);
 });
 test('PDCC-050 support_sla_risk permission-filtered evidence links',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(3).locator(".platform-durable-closure-certification__row-actions a")).toHaveCount(DCC_LINK_COUNTS.support_sla_risk);
 });
 test('PDCC-051 billing_entitlement_exception permission-filtered evidence links',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(4).locator(".platform-durable-closure-certification__row-actions a")).toHaveCount(DCC_LINK_COUNTS.billing_entitlement_exception);
 });
 test('PDCC-052 backup_restore_gap permission-filtered evidence links',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(5).locator(".platform-durable-closure-certification__row-actions a")).toHaveCount(DCC_LINK_COUNTS.backup_restore_gap);
 });
 test('PDCC-053 deployment_smoke_test_gap permission-filtered evidence links',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(6).locator(".platform-durable-closure-certification__row-actions a")).toHaveCount(DCC_LINK_COUNTS.deployment_smoke_test_gap);
 });
 test('PDCC-054 incident_prevention_gap permission-filtered evidence links',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(7).locator(".platform-durable-closure-certification__row-actions a")).toHaveCount(DCC_LINK_COUNTS.incident_prevention_gap);
 });
 test('PDCC-055 growth_governance_exception permission-filtered evidence links',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(8).locator(".platform-durable-closure-certification__row-actions a")).toHaveCount(DCC_LINK_COUNTS.growth_governance_exception);
 });
 test('PDCC-056 missed_cadence source resolution verification prerequisite remains unproven',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(0).locator(".platform-durable-closure-certification__source-summary")).toContainText("Source Resolution Verification row");await expect(rows(page).nth(0).locator(".platform-durable-closure-certification__row-badges")).toContainText("Waiting for external resolution verification confirmation");
 });
 test('PDCC-057 health_regression source resolution verification prerequisite remains unproven',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(1).locator(".platform-durable-closure-certification__source-summary")).toContainText("Source Resolution Verification row");await expect(rows(page).nth(1).locator(".platform-durable-closure-certification__row-badges")).toContainText("Waiting for external resolution verification confirmation");
 });
 test('PDCC-058 customer_adoption_risk source resolution verification prerequisite remains unproven',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(2).locator(".platform-durable-closure-certification__source-summary")).toContainText("Source Resolution Verification row");await expect(rows(page).nth(2).locator(".platform-durable-closure-certification__row-badges")).toContainText("Waiting for external resolution verification confirmation");
 });
 test('PDCC-059 support_sla_risk source resolution verification prerequisite remains unproven',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(3).locator(".platform-durable-closure-certification__source-summary")).toContainText("Source Resolution Verification row");await expect(rows(page).nth(3).locator(".platform-durable-closure-certification__row-badges")).toContainText("Waiting for external resolution verification confirmation");
 });
 test('PDCC-060 billing_entitlement_exception source resolution verification prerequisite remains unproven',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(4).locator(".platform-durable-closure-certification__source-summary")).toContainText("Source Resolution Verification row");await expect(rows(page).nth(4).locator(".platform-durable-closure-certification__row-badges")).toContainText("Waiting for external resolution verification confirmation");
 });
 test('PDCC-061 backup_restore_gap source resolution verification prerequisite remains unproven',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(5).locator(".platform-durable-closure-certification__source-summary")).toContainText("Source Resolution Verification row");await expect(rows(page).nth(5).locator(".platform-durable-closure-certification__row-badges")).toContainText("Waiting for external resolution verification confirmation");
 });
 test('PDCC-062 deployment_smoke_test_gap source resolution verification prerequisite remains unproven',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(6).locator(".platform-durable-closure-certification__source-summary")).toContainText("Source Resolution Verification row");await expect(rows(page).nth(6).locator(".platform-durable-closure-certification__row-badges")).toContainText("Waiting for external resolution verification confirmation");
 });
 test('PDCC-063 incident_prevention_gap source resolution verification prerequisite remains unproven',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(7).locator(".platform-durable-closure-certification__source-summary")).toContainText("Source Resolution Verification row");await expect(rows(page).nth(7).locator(".platform-durable-closure-certification__row-badges")).toContainText("Waiting for external resolution verification confirmation");
 });
 test('PDCC-064 growth_governance_exception source resolution verification prerequisite remains unproven',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).nth(8).locator(".platform-durable-closure-certification__source-summary")).toContainText("Source Resolution Verification row");await expect(rows(page).nth(8).locator(".platform-durable-closure-certification__row-badges")).toContainText("Waiting for external resolution verification confirmation");
 });
 test('PDCC-065 Unknown certification persistence never implies approval',async({page})=>{
  await openDurableClosureCertification(page,{alter:s=>({...s,durable_closure_certification_persistence:null})});await expect(context(page).locator(".platform-durable-closure-certification__persistence-grid")).toContainText("Not reported");
 });
 test('PDCC-066 All nine certification templates retain resolution provenance',async({page})=>{
  await openDurableClosureCertification(page);await expect(rows(page).locator(".platform-durable-closure-certification__source-summary")).toHaveCount(SSER_REQUIREMENTS.length);await expect(rows(page).first().locator(".platform-durable-closure-certification__field-groups")).toContainText("Required source resolution-verification evidence");
 });
 test('PDCC-067 An empty certification board does not mean a signed certificate',async({page})=>{
  await openDurableClosureCertification(page,{alter:s=>({...s,durable_closure_certification_rows:[],summary:{...s.summary,durable_closure_certification_rows_total:0}})});await expect(root(page).locator(".platform-durable-closure-certification__empty-state")).toContainText("not evidence");await expect(rows(page)).toHaveCount(0);
 });
 test('PDCC-068 403 certification failure renders alert without templates',async({page})=>{
  await openDurableClosureCertification(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PDCC-069 503 certification failure offers retry without acceptance',async({page})=>{
  await openDurableClosureCertification(page,{status:503});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PDCC-070 Read-only certification refresh issues GET only',async({page})=>{
  const methods:string[]=[];await openDurableClosureCertification(page,{onCall:(m,p)=>{if(p===DCC_PATH)methods.push(m);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(SSER_REQUIREMENTS.length);expect(methods.length).toBeGreaterThanOrEqual(2);expect(methods.every(m=>m==="GET")).toBeTruthy();
 });
});
