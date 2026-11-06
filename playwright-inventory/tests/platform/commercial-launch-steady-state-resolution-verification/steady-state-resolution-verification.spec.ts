/** Batch 136, Step 236: static-source-based synthetic browser contracts; never proof of live verification. */
import {test,expect,type Page} from '@playwright/test';
import {openResolutionVerification,SSRV_PATH,SSRV_PERMISSIONS,SSRV_REQUIRED_FIELDS,SSRV_RULES,SSRV_CONTROLS,SSRV_LINK_COUNTS} from '../../../support/platformCommercialLaunchSteadyStateResolutionVerificationFixture';
import {SSER_REQUIREMENTS} from '../../../support/platformCommercialLaunchSteadyStateExceptionReviewFixture';
const root=(p:Page)=>p.locator('.platform-steady-state-resolution-verification');
const rows=(p:Page)=>root(p).locator('.platform-steady-state-resolution-verification__row-card');
const context=(p:Page)=>root(p).locator('.platform-steady-state-resolution-verification__context-panel');
test.describe('Commercial Launch Steady-State Resolution Verification — Step 236 synthetic browser contracts',()=>{
 test('PSRV-001 Resolution Verification page heading renders',async({page})=>{
  await openResolutionVerification(page);await expect(page.getByRole("heading",{name:"Commercial Launch Steady-State Resolution Verification",exact:true})).toBeVisible();
 });
 test('PSRV-002 Step 236 manual preparation is explicit',async({page})=>{
  await openResolutionVerification(page);await expect(root(page)).toContainText("Step 236 — Commercial Launch Steady-State Resolution Verification Board");await expect(root(page)).toContainText("Resolution verification preparation only");
 });
 test('PSRV-003 External recurrence resolution confirmation is required',async({page})=>{
  await openResolutionVerification(page);await expect(root(page).locator(".platform-steady-state-resolution-verification__boundary-notice")).toContainText("Independently confirm");
 });
 test('PSRV-004 Nine base permission supporting page links',async({page})=>{
  await openResolutionVerification(page);await expect(root(page).locator(".platform-steady-state-resolution-verification__supporting-pages a")).toHaveCount(9);
 });
 test('PSRV-005 Seven summary metrics visible',async({page})=>{
  await openResolutionVerification(page);await expect(root(page).getByLabel("Steady-state resolution verification summary").locator(".io-workspace-stat")).toHaveCount(7);
 });
 test('PSRV-006 Nine resolution verification templates visible',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page)).toHaveCount(SSER_REQUIREMENTS.length);
 });
 test('PSRV-007 Critical severity remains a template hint',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(1).locator(".platform-steady-state-resolution-verification__row-badges [data-tone]").first()).toHaveAttribute("data-tone","danger");
 });
 test('PSRV-008 Medium severity remains neutral',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(2).locator(".platform-steady-state-resolution-verification__row-badges [data-tone]").first()).toHaveAttribute("data-tone","neutral");
 });
 test('PSRV-009 Zero stored verification is not external evidence',async({page})=>{
  await openResolutionVerification(page);await expect(root(page).getByLabel("Steady-state resolution verification summary")).toContainText("Verification records stored here");await expect(context(page)).toContainText("External records not observable");
 });
 test('PSRV-010 Nine upstream posture links preserve evidence chain',async({page})=>{
  await openResolutionVerification(page);await expect(context(page).locator(".platform-steady-state-resolution-verification__source-grid a")).toHaveCount(9);
 });
 test('PSRV-011 Ten persistence boundaries are visible',async({page})=>{
  await openResolutionVerification(page);await expect(context(page).locator(".platform-steady-state-resolution-verification__persistence-grid > div")).toHaveCount(10);
 });
 test('PSRV-012 Verification cards have no editable resolution form',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).locator("form,input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
 test('PSRV-013 No cards do not establish external clearance',async({page})=>{
  await openResolutionVerification(page,{alter:s=>({...s,resolution_verification_rows:[],summary:{...s.summary,resolution_verification_rows_total:0}})});await expect(root(page).locator(".platform-steady-state-resolution-verification__empty-state")).toContainText("not evidence");await expect(rows(page)).toHaveCount(0);
 });
 test('PSRV-014 Missing platform grant redirects before evidence read',async({page})=>{
  await openResolutionVerification(page,{permissions:SSRV_PERMISSIONS.filter(p=>p!=="platform.tenants.read"),expectHeading:false});await expect(page).toHaveURL(/\/platform\/dashboard(?:\?.*)?$/);await expect(rows(page)).toHaveCount(0);
 });
 test('PSRV-015 Optional Announcements and Releases links are hidden',async({page})=>{
  await openResolutionVerification(page);await expect(root(page).getByRole("link",{name:"Announcements"})).toHaveCount(0);await expect(root(page).getByRole("link",{name:"Releases"})).toHaveCount(0);
 });
 test('PSRV-016 Three source rules and four limitations',async({page})=>{
  await openResolutionVerification(page);await expect(root(page).locator(".platform-steady-state-resolution-verification__rules-grid ul").first().locator("li")).toHaveText([...SSRV_RULES]);await expect(root(page).locator(".platform-steady-state-resolution-verification__rules-grid ul").last().locator("li")).toHaveCount(4);
 });
 test('PSRV-017 Forbidden API GET shows no verification cards',async({page})=>{
  await openResolutionVerification(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PSRV-018 Server error provides retry without claiming verification',async({page})=>{
  await openResolutionVerification(page,{status:503});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PSRV-019 Refresh uses GET only and keeps nine templates',async({page})=>{
  const calls:string[]=[];await openResolutionVerification(page,{onCall:(m,p)=>{if(p===SSRV_PATH)calls.push(m);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(SSER_REQUIREMENTS.length);expect(calls.length).toBeGreaterThanOrEqual(2);expect(calls.every(m=>m==="GET")).toBeTruthy();
 });
 test('PSRV-020 missed_cadence owner and severity are source hints',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(0).locator(".platform-steady-state-resolution-verification__row-heading")).toContainText(SSER_REQUIREMENTS[0].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(0).locator(".platform-steady-state-resolution-verification__row-badges")).toContainText(SSER_REQUIREMENTS[0].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PSRV-021 health_regression owner and severity are source hints',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(1).locator(".platform-steady-state-resolution-verification__row-heading")).toContainText(SSER_REQUIREMENTS[1].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(1).locator(".platform-steady-state-resolution-verification__row-badges")).toContainText(SSER_REQUIREMENTS[1].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PSRV-022 customer_adoption_risk owner and severity are source hints',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(2).locator(".platform-steady-state-resolution-verification__row-heading")).toContainText(SSER_REQUIREMENTS[2].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(2).locator(".platform-steady-state-resolution-verification__row-badges")).toContainText(SSER_REQUIREMENTS[2].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PSRV-023 support_sla_risk owner and severity are source hints',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(3).locator(".platform-steady-state-resolution-verification__row-heading")).toContainText(SSER_REQUIREMENTS[3].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(3).locator(".platform-steady-state-resolution-verification__row-badges")).toContainText(SSER_REQUIREMENTS[3].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PSRV-024 billing_entitlement_exception owner and severity are source hints',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(4).locator(".platform-steady-state-resolution-verification__row-heading")).toContainText(SSER_REQUIREMENTS[4].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(4).locator(".platform-steady-state-resolution-verification__row-badges")).toContainText(SSER_REQUIREMENTS[4].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PSRV-025 backup_restore_gap owner and severity are source hints',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(5).locator(".platform-steady-state-resolution-verification__row-heading")).toContainText(SSER_REQUIREMENTS[5].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(5).locator(".platform-steady-state-resolution-verification__row-badges")).toContainText(SSER_REQUIREMENTS[5].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PSRV-026 deployment_smoke_test_gap owner and severity are source hints',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(6).locator(".platform-steady-state-resolution-verification__row-heading")).toContainText(SSER_REQUIREMENTS[6].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(6).locator(".platform-steady-state-resolution-verification__row-badges")).toContainText(SSER_REQUIREMENTS[6].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PSRV-027 incident_prevention_gap owner and severity are source hints',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(7).locator(".platform-steady-state-resolution-verification__row-heading")).toContainText(SSER_REQUIREMENTS[7].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(7).locator(".platform-steady-state-resolution-verification__row-badges")).toContainText(SSER_REQUIREMENTS[7].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PSRV-028 growth_governance_exception owner and severity are source hints',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(8).locator(".platform-steady-state-resolution-verification__row-heading")).toContainText(SSER_REQUIREMENTS[8].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(8).locator(".platform-steady-state-resolution-verification__row-badges")).toContainText(SSER_REQUIREMENTS[8].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PSRV-029 missed_cadence exact four external verification evidence labels',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(0).locator(".platform-steady-state-resolution-verification__field-groups .platform-steady-state-resolution-verification__chips").nth(2).locator("span")).toHaveText(SSRV_REQUIRED_FIELDS.missed_cadence.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSRV-030 health_regression exact four external verification evidence labels',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(1).locator(".platform-steady-state-resolution-verification__field-groups .platform-steady-state-resolution-verification__chips").nth(2).locator("span")).toHaveText(SSRV_REQUIRED_FIELDS.health_regression.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSRV-031 customer_adoption_risk exact four external verification evidence labels',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(2).locator(".platform-steady-state-resolution-verification__field-groups .platform-steady-state-resolution-verification__chips").nth(2).locator("span")).toHaveText(SSRV_REQUIRED_FIELDS.customer_adoption_risk.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSRV-032 support_sla_risk exact four external verification evidence labels',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(3).locator(".platform-steady-state-resolution-verification__field-groups .platform-steady-state-resolution-verification__chips").nth(2).locator("span")).toHaveText(SSRV_REQUIRED_FIELDS.support_sla_risk.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSRV-033 billing_entitlement_exception exact four external verification evidence labels',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(4).locator(".platform-steady-state-resolution-verification__field-groups .platform-steady-state-resolution-verification__chips").nth(2).locator("span")).toHaveText(SSRV_REQUIRED_FIELDS.billing_entitlement_exception.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSRV-034 backup_restore_gap exact four external verification evidence labels',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(5).locator(".platform-steady-state-resolution-verification__field-groups .platform-steady-state-resolution-verification__chips").nth(2).locator("span")).toHaveText(SSRV_REQUIRED_FIELDS.backup_restore_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSRV-035 deployment_smoke_test_gap exact four external verification evidence labels',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(6).locator(".platform-steady-state-resolution-verification__field-groups .platform-steady-state-resolution-verification__chips").nth(2).locator("span")).toHaveText(SSRV_REQUIRED_FIELDS.deployment_smoke_test_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSRV-036 incident_prevention_gap exact four external verification evidence labels',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(7).locator(".platform-steady-state-resolution-verification__field-groups .platform-steady-state-resolution-verification__chips").nth(2).locator("span")).toHaveText(SSRV_REQUIRED_FIELDS.incident_prevention_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSRV-037 growth_governance_exception exact four external verification evidence labels',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(8).locator(".platform-steady-state-resolution-verification__field-groups .platform-steady-state-resolution-verification__chips").nth(2).locator("span")).toHaveText(SSRV_REQUIRED_FIELDS.growth_governance_exception.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSRV-038 missed_cadence manual verification controls rendered',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(0).locator(".platform-steady-state-resolution-verification__field-groups li")).toHaveText([...SSRV_CONTROLS]);
 });
 test('PSRV-039 health_regression manual verification controls rendered',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(1).locator(".platform-steady-state-resolution-verification__field-groups li")).toHaveText([...SSRV_CONTROLS]);
 });
 test('PSRV-040 customer_adoption_risk manual verification controls rendered',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(2).locator(".platform-steady-state-resolution-verification__field-groups li")).toHaveText([...SSRV_CONTROLS]);
 });
 test('PSRV-041 support_sla_risk manual verification controls rendered',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(3).locator(".platform-steady-state-resolution-verification__field-groups li")).toHaveText([...SSRV_CONTROLS]);
 });
 test('PSRV-042 billing_entitlement_exception manual verification controls rendered',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(4).locator(".platform-steady-state-resolution-verification__field-groups li")).toHaveText([...SSRV_CONTROLS]);
 });
 test('PSRV-043 backup_restore_gap manual verification controls rendered',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(5).locator(".platform-steady-state-resolution-verification__field-groups li")).toHaveText([...SSRV_CONTROLS]);
 });
 test('PSRV-044 deployment_smoke_test_gap manual verification controls rendered',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(6).locator(".platform-steady-state-resolution-verification__field-groups li")).toHaveText([...SSRV_CONTROLS]);
 });
 test('PSRV-045 incident_prevention_gap manual verification controls rendered',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(7).locator(".platform-steady-state-resolution-verification__field-groups li")).toHaveText([...SSRV_CONTROLS]);
 });
 test('PSRV-046 growth_governance_exception manual verification controls rendered',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(8).locator(".platform-steady-state-resolution-verification__field-groups li")).toHaveText([...SSRV_CONTROLS]);
 });
 test('PSRV-047 missed_cadence permission-filtered evidence navigation',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(0).locator(".platform-steady-state-resolution-verification__row-actions a")).toHaveCount(SSRV_LINK_COUNTS.missed_cadence);
 });
 test('PSRV-048 health_regression permission-filtered evidence navigation',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(1).locator(".platform-steady-state-resolution-verification__row-actions a")).toHaveCount(SSRV_LINK_COUNTS.health_regression);
 });
 test('PSRV-049 customer_adoption_risk permission-filtered evidence navigation',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(2).locator(".platform-steady-state-resolution-verification__row-actions a")).toHaveCount(SSRV_LINK_COUNTS.customer_adoption_risk);
 });
 test('PSRV-050 support_sla_risk permission-filtered evidence navigation',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(3).locator(".platform-steady-state-resolution-verification__row-actions a")).toHaveCount(SSRV_LINK_COUNTS.support_sla_risk);
 });
 test('PSRV-051 billing_entitlement_exception permission-filtered evidence navigation',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(4).locator(".platform-steady-state-resolution-verification__row-actions a")).toHaveCount(SSRV_LINK_COUNTS.billing_entitlement_exception);
 });
 test('PSRV-052 backup_restore_gap permission-filtered evidence navigation',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(5).locator(".platform-steady-state-resolution-verification__row-actions a")).toHaveCount(SSRV_LINK_COUNTS.backup_restore_gap);
 });
 test('PSRV-053 deployment_smoke_test_gap permission-filtered evidence navigation',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(6).locator(".platform-steady-state-resolution-verification__row-actions a")).toHaveCount(SSRV_LINK_COUNTS.deployment_smoke_test_gap);
 });
 test('PSRV-054 incident_prevention_gap permission-filtered evidence navigation',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(7).locator(".platform-steady-state-resolution-verification__row-actions a")).toHaveCount(SSRV_LINK_COUNTS.incident_prevention_gap);
 });
 test('PSRV-055 growth_governance_exception permission-filtered evidence navigation',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(8).locator(".platform-steady-state-resolution-verification__row-actions a")).toHaveCount(SSRV_LINK_COUNTS.growth_governance_exception);
 });
 test('PSRV-056 missed_cadence upstream resolution independently required',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(0).locator(".platform-steady-state-resolution-verification__source-summary")).toContainText("Source recurrence resolution row");await expect(rows(page).nth(0).locator(".platform-steady-state-resolution-verification__row-badges")).toContainText("Waiting for external recurrence resolution confirmation");
 });
 test('PSRV-057 health_regression upstream resolution independently required',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(1).locator(".platform-steady-state-resolution-verification__source-summary")).toContainText("Source recurrence resolution row");await expect(rows(page).nth(1).locator(".platform-steady-state-resolution-verification__row-badges")).toContainText("Waiting for external recurrence resolution confirmation");
 });
 test('PSRV-058 customer_adoption_risk upstream resolution independently required',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(2).locator(".platform-steady-state-resolution-verification__source-summary")).toContainText("Source recurrence resolution row");await expect(rows(page).nth(2).locator(".platform-steady-state-resolution-verification__row-badges")).toContainText("Waiting for external recurrence resolution confirmation");
 });
 test('PSRV-059 support_sla_risk upstream resolution independently required',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(3).locator(".platform-steady-state-resolution-verification__source-summary")).toContainText("Source recurrence resolution row");await expect(rows(page).nth(3).locator(".platform-steady-state-resolution-verification__row-badges")).toContainText("Waiting for external recurrence resolution confirmation");
 });
 test('PSRV-060 billing_entitlement_exception upstream resolution independently required',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(4).locator(".platform-steady-state-resolution-verification__source-summary")).toContainText("Source recurrence resolution row");await expect(rows(page).nth(4).locator(".platform-steady-state-resolution-verification__row-badges")).toContainText("Waiting for external recurrence resolution confirmation");
 });
 test('PSRV-061 backup_restore_gap upstream resolution independently required',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(5).locator(".platform-steady-state-resolution-verification__source-summary")).toContainText("Source recurrence resolution row");await expect(rows(page).nth(5).locator(".platform-steady-state-resolution-verification__row-badges")).toContainText("Waiting for external recurrence resolution confirmation");
 });
 test('PSRV-062 deployment_smoke_test_gap upstream resolution independently required',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(6).locator(".platform-steady-state-resolution-verification__source-summary")).toContainText("Source recurrence resolution row");await expect(rows(page).nth(6).locator(".platform-steady-state-resolution-verification__row-badges")).toContainText("Waiting for external recurrence resolution confirmation");
 });
 test('PSRV-063 incident_prevention_gap upstream resolution independently required',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(7).locator(".platform-steady-state-resolution-verification__source-summary")).toContainText("Source recurrence resolution row");await expect(rows(page).nth(7).locator(".platform-steady-state-resolution-verification__row-badges")).toContainText("Waiting for external recurrence resolution confirmation");
 });
 test('PSRV-064 growth_governance_exception upstream resolution independently required',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).nth(8).locator(".platform-steady-state-resolution-verification__source-summary")).toContainText("Source recurrence resolution row");await expect(rows(page).nth(8).locator(".platform-steady-state-resolution-verification__row-badges")).toContainText("Waiting for external recurrence resolution confirmation");
 });
 test('PSRV-065 Unknown resolution persistence never proves acceptance',async({page})=>{
  await openResolutionVerification(page,{alter:s=>({...s,recurrence_resolution_persistence:null})});await expect(context(page).locator(".platform-steady-state-resolution-verification__persistence-grid")).toContainText("Not reported");
 });
 test('PSRV-066 All nine rows show upstream provenance',async({page})=>{
  await openResolutionVerification(page);await expect(rows(page).locator(".platform-steady-state-resolution-verification__source-summary")).toHaveCount(SSER_REQUIREMENTS.length);await expect(rows(page).first().locator(".platform-steady-state-resolution-verification__field-groups")).toContainText("Required source recurrence-resolution evidence");
 });
 test('PSRV-067 Empty board does not establish closure',async({page})=>{
  await openResolutionVerification(page,{alter:s=>({...s,resolution_verification_rows:[],summary:{...s.summary,resolution_verification_rows_total:0}})});await expect(root(page).locator(".platform-steady-state-resolution-verification__empty-state")).toContainText("not evidence");await expect(rows(page)).toHaveCount(0);
 });
 test('PSRV-068 403 verification response never renders cards',async({page})=>{
  await openResolutionVerification(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PSRV-069 503 verification response offers retry',async({page})=>{
  await openResolutionVerification(page,{status:503});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PSRV-070 Read-only verification refresh only uses GET',async({page})=>{
  const methods:string[]=[];await openResolutionVerification(page,{onCall:(m,p)=>{if(p===SSRV_PATH)methods.push(m);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(SSER_REQUIREMENTS.length);expect(methods.length).toBeGreaterThanOrEqual(2);expect(methods.every(m=>m==="GET")).toBeTruthy();
 });
});
