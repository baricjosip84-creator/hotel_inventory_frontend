/** Batch 134: Step 234 recurrence-audit source-backed, synthetic browser contracts. No operational retest or signoff. */
import {test,expect,type Page} from '@playwright/test';
import {openRecurrenceAudit,SSRA_PATH,SSRA_PERMISSIONS,SSRA_REQUIRED_FIELDS,SSRA_RULES,SSRA_CONTROLS,SSRA_LINK_COUNTS} from '../../../support/platformCommercialLaunchSteadyStateRecurrenceAuditFixture';
import {SSER_REQUIREMENTS} from '../../../support/platformCommercialLaunchSteadyStateExceptionReviewFixture';
const root=(p:Page)=>p.locator('.platform-steady-state-recurrence-audit');
const rows=(p:Page)=>root(p).locator('.platform-steady-state-recurrence-audit__row-card');
const context=(p:Page)=>root(p).locator('.platform-steady-state-recurrence-audit__context-panel');
test.describe('Commercial Launch Steady-State Recurrence Audit — Step 234 synthetic browser contracts',()=>{
 test('PSRA-001 Recurrence Audit heading renders',async({page})=>{
  await openRecurrenceAudit(page);await expect(page.getByRole("heading",{name:"Commercial Launch Steady-State Recurrence Audit",exact:true})).toBeVisible();
 });
 test('PSRA-002 Step 234 and external audit pill render',async({page})=>{
  await openRecurrenceAudit(page);await expect(root(page)).toContainText("Step 234 — Commercial Launch Steady-State Recurrence Audit Board");await expect(root(page)).toContainText("Recurrence audit preparation only");
 });
 test('PSRA-003 Source closure acceptance boundary is explicit',async({page})=>{
  await openRecurrenceAudit(page);await expect(root(page).locator(".platform-steady-state-recurrence-audit__boundary-notice")).toContainText("Independently confirm");
 });
 test('PSRA-004 Eight supporting pages render without optional grants',async({page})=>{
  await openRecurrenceAudit(page);await expect(root(page).locator(".platform-steady-state-recurrence-audit__supporting-pages a")).toHaveCount(8);
 });
 test('PSRA-005 Seven summary metrics render',async({page})=>{
  await openRecurrenceAudit(page);await expect(root(page).getByLabel("Steady-state recurrence audit summary").locator(".io-workspace-stat")).toHaveCount(7);
 });
 test('PSRA-006 All nine recurrence audit templates render',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page)).toHaveCount(SSER_REQUIREMENTS.length);
 });
 test('PSRA-007 Critical severity hint uses danger tone',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(1).locator(".platform-steady-state-recurrence-audit__row-badges [data-tone]").first()).toHaveAttribute("data-tone","danger");
 });
 test('PSRA-008 Medium severity hint uses neutral tone',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(2).locator(".platform-steady-state-recurrence-audit__row-badges [data-tone]").first()).toHaveAttribute("data-tone","neutral");
 });
 test('PSRA-009 Zero stored audits does not imply no external records',async({page})=>{
  await openRecurrenceAudit(page);await expect(root(page).getByLabel("Steady-state recurrence audit summary")).toContainText("Recurrence-audit records stored here");await expect(context(page)).toContainText("External records not observable");
 });
 test('PSRA-010 Seven upstream source posture links render',async({page})=>{
  await openRecurrenceAudit(page);await expect(context(page).locator(".platform-steady-state-recurrence-audit__source-grid a")).toHaveCount(7);
 });
 test('PSRA-011 Eight persistence boundaries render',async({page})=>{
  await openRecurrenceAudit(page);await expect(context(page).locator(".platform-steady-state-recurrence-audit__persistence-grid > div")).toHaveCount(8);
 });
 test('PSRA-012 No editable audit controls exist in recurrence rows',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).locator("form,input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
 test('PSRA-013 Zero audit rows cannot certify cleared recurrence risk',async({page})=>{
  await openRecurrenceAudit(page,{alter:s=>({...s,recurrence_audit_rows:[],summary:{...s.summary,recurrence_audit_rows_total:0}})});await expect(root(page).locator(".platform-steady-state-recurrence-audit__empty-state")).toContainText("not evidence");await expect(rows(page)).toHaveCount(0);
 });
 test('PSRA-014 Missing tenant permission redirects before reading audit',async({page})=>{
  await openRecurrenceAudit(page,{permissions:SSRA_PERMISSIONS.filter(p=>p!=="platform.tenants.read"),expectHeading:false});await expect(page).toHaveURL(/\/platform\/dashboard(?:\?.*)?$/);await expect(rows(page)).toHaveCount(0);
 });
 test('PSRA-015 Optional announcements and releases links remain gated',async({page})=>{
  await openRecurrenceAudit(page);await expect(root(page).getByRole("link",{name:"Announcements"})).toHaveCount(0);await expect(root(page).getByRole("link",{name:"Releases"})).toHaveCount(0);
 });
 test('PSRA-016 Exact audit rules and four limitations render',async({page})=>{
  await openRecurrenceAudit(page);await expect(root(page).locator(".platform-steady-state-recurrence-audit__rules-grid ul").first().locator("li")).toHaveText([...SSRA_RULES]);await expect(root(page).locator(".platform-steady-state-recurrence-audit__rules-grid ul").last().locator("li")).toHaveCount(4);
 });
 test('PSRA-017 Forbidden API response hides recurrence rows',async({page})=>{
  await openRecurrenceAudit(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PSRA-018 Service failure displays retry and no rows',async({page})=>{
  await openRecurrenceAudit(page,{status:503});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PSRA-019 Refresh uses GET only',async({page})=>{
  const calls:string[]=[];await openRecurrenceAudit(page,{onCall:(m,p)=>{if(p===SSRA_PATH)calls.push(m);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(SSER_REQUIREMENTS.length);expect(calls.length).toBeGreaterThanOrEqual(2);expect(calls.every(m=>m==="GET")).toBeTruthy();
 });
 test('PSRA-020 missed_cadence displays original owner and severity hint',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(0).locator(".platform-steady-state-recurrence-audit__row-heading")).toContainText(SSER_REQUIREMENTS[0].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(0).locator(".platform-steady-state-recurrence-audit__row-badges")).toContainText(SSER_REQUIREMENTS[0].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PSRA-021 health_regression displays original owner and severity hint',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(1).locator(".platform-steady-state-recurrence-audit__row-heading")).toContainText(SSER_REQUIREMENTS[1].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(1).locator(".platform-steady-state-recurrence-audit__row-badges")).toContainText(SSER_REQUIREMENTS[1].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PSRA-022 customer_adoption_risk displays original owner and severity hint',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(2).locator(".platform-steady-state-recurrence-audit__row-heading")).toContainText(SSER_REQUIREMENTS[2].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(2).locator(".platform-steady-state-recurrence-audit__row-badges")).toContainText(SSER_REQUIREMENTS[2].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PSRA-023 support_sla_risk displays original owner and severity hint',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(3).locator(".platform-steady-state-recurrence-audit__row-heading")).toContainText(SSER_REQUIREMENTS[3].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(3).locator(".platform-steady-state-recurrence-audit__row-badges")).toContainText(SSER_REQUIREMENTS[3].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PSRA-024 billing_entitlement_exception displays original owner and severity hint',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(4).locator(".platform-steady-state-recurrence-audit__row-heading")).toContainText(SSER_REQUIREMENTS[4].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(4).locator(".platform-steady-state-recurrence-audit__row-badges")).toContainText(SSER_REQUIREMENTS[4].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PSRA-025 backup_restore_gap displays original owner and severity hint',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(5).locator(".platform-steady-state-recurrence-audit__row-heading")).toContainText(SSER_REQUIREMENTS[5].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(5).locator(".platform-steady-state-recurrence-audit__row-badges")).toContainText(SSER_REQUIREMENTS[5].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PSRA-026 deployment_smoke_test_gap displays original owner and severity hint',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(6).locator(".platform-steady-state-recurrence-audit__row-heading")).toContainText(SSER_REQUIREMENTS[6].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(6).locator(".platform-steady-state-recurrence-audit__row-badges")).toContainText(SSER_REQUIREMENTS[6].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PSRA-027 incident_prevention_gap displays original owner and severity hint',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(7).locator(".platform-steady-state-recurrence-audit__row-heading")).toContainText(SSER_REQUIREMENTS[7].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(7).locator(".platform-steady-state-recurrence-audit__row-badges")).toContainText(SSER_REQUIREMENTS[7].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PSRA-028 growth_governance_exception displays original owner and severity hint',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(8).locator(".platform-steady-state-recurrence-audit__row-heading")).toContainText(SSER_REQUIREMENTS[8].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(8).locator(".platform-steady-state-recurrence-audit__row-badges")).toContainText(SSER_REQUIREMENTS[8].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PSRA-029 missed_cadence includes all four exact audit evidence fields',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(0).locator(".platform-steady-state-recurrence-audit__field-groups .platform-steady-state-recurrence-audit__chips").nth(1).locator("span")).toHaveText(SSRA_REQUIRED_FIELDS.missed_cadence.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSRA-030 health_regression includes all four exact audit evidence fields',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(1).locator(".platform-steady-state-recurrence-audit__field-groups .platform-steady-state-recurrence-audit__chips").nth(1).locator("span")).toHaveText(SSRA_REQUIRED_FIELDS.health_regression.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSRA-031 customer_adoption_risk includes all four exact audit evidence fields',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(2).locator(".platform-steady-state-recurrence-audit__field-groups .platform-steady-state-recurrence-audit__chips").nth(1).locator("span")).toHaveText(SSRA_REQUIRED_FIELDS.customer_adoption_risk.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSRA-032 support_sla_risk includes all four exact audit evidence fields',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(3).locator(".platform-steady-state-recurrence-audit__field-groups .platform-steady-state-recurrence-audit__chips").nth(1).locator("span")).toHaveText(SSRA_REQUIRED_FIELDS.support_sla_risk.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSRA-033 billing_entitlement_exception includes all four exact audit evidence fields',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(4).locator(".platform-steady-state-recurrence-audit__field-groups .platform-steady-state-recurrence-audit__chips").nth(1).locator("span")).toHaveText(SSRA_REQUIRED_FIELDS.billing_entitlement_exception.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSRA-034 backup_restore_gap includes all four exact audit evidence fields',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(5).locator(".platform-steady-state-recurrence-audit__field-groups .platform-steady-state-recurrence-audit__chips").nth(1).locator("span")).toHaveText(SSRA_REQUIRED_FIELDS.backup_restore_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSRA-035 deployment_smoke_test_gap includes all four exact audit evidence fields',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(6).locator(".platform-steady-state-recurrence-audit__field-groups .platform-steady-state-recurrence-audit__chips").nth(1).locator("span")).toHaveText(SSRA_REQUIRED_FIELDS.deployment_smoke_test_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSRA-036 incident_prevention_gap includes all four exact audit evidence fields',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(7).locator(".platform-steady-state-recurrence-audit__field-groups .platform-steady-state-recurrence-audit__chips").nth(1).locator("span")).toHaveText(SSRA_REQUIRED_FIELDS.incident_prevention_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSRA-037 growth_governance_exception includes all four exact audit evidence fields',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(8).locator(".platform-steady-state-recurrence-audit__field-groups .platform-steady-state-recurrence-audit__chips").nth(1).locator("span")).toHaveText(SSRA_REQUIRED_FIELDS.growth_governance_exception.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSRA-038 missed_cadence includes three recurrence controls',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(0).locator(".platform-steady-state-recurrence-audit__field-groups li")).toHaveText([...SSRA_CONTROLS]);
 });
 test('PSRA-039 health_regression includes three recurrence controls',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(1).locator(".platform-steady-state-recurrence-audit__field-groups li")).toHaveText([...SSRA_CONTROLS]);
 });
 test('PSRA-040 customer_adoption_risk includes three recurrence controls',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(2).locator(".platform-steady-state-recurrence-audit__field-groups li")).toHaveText([...SSRA_CONTROLS]);
 });
 test('PSRA-041 support_sla_risk includes three recurrence controls',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(3).locator(".platform-steady-state-recurrence-audit__field-groups li")).toHaveText([...SSRA_CONTROLS]);
 });
 test('PSRA-042 billing_entitlement_exception includes three recurrence controls',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(4).locator(".platform-steady-state-recurrence-audit__field-groups li")).toHaveText([...SSRA_CONTROLS]);
 });
 test('PSRA-043 backup_restore_gap includes three recurrence controls',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(5).locator(".platform-steady-state-recurrence-audit__field-groups li")).toHaveText([...SSRA_CONTROLS]);
 });
 test('PSRA-044 deployment_smoke_test_gap includes three recurrence controls',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(6).locator(".platform-steady-state-recurrence-audit__field-groups li")).toHaveText([...SSRA_CONTROLS]);
 });
 test('PSRA-045 incident_prevention_gap includes three recurrence controls',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(7).locator(".platform-steady-state-recurrence-audit__field-groups li")).toHaveText([...SSRA_CONTROLS]);
 });
 test('PSRA-046 growth_governance_exception includes three recurrence controls',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(8).locator(".platform-steady-state-recurrence-audit__field-groups li")).toHaveText([...SSRA_CONTROLS]);
 });
 test('PSRA-047 missed_cadence evidence links respect optional permission gates',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(0).locator(".platform-steady-state-recurrence-audit__row-actions a")).toHaveCount(SSRA_LINK_COUNTS.missed_cadence);
 });
 test('PSRA-048 health_regression evidence links respect optional permission gates',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(1).locator(".platform-steady-state-recurrence-audit__row-actions a")).toHaveCount(SSRA_LINK_COUNTS.health_regression);
 });
 test('PSRA-049 customer_adoption_risk evidence links respect optional permission gates',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(2).locator(".platform-steady-state-recurrence-audit__row-actions a")).toHaveCount(SSRA_LINK_COUNTS.customer_adoption_risk);
 });
 test('PSRA-050 support_sla_risk evidence links respect optional permission gates',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(3).locator(".platform-steady-state-recurrence-audit__row-actions a")).toHaveCount(SSRA_LINK_COUNTS.support_sla_risk);
 });
 test('PSRA-051 billing_entitlement_exception evidence links respect optional permission gates',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(4).locator(".platform-steady-state-recurrence-audit__row-actions a")).toHaveCount(SSRA_LINK_COUNTS.billing_entitlement_exception);
 });
 test('PSRA-052 backup_restore_gap evidence links respect optional permission gates',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(5).locator(".platform-steady-state-recurrence-audit__row-actions a")).toHaveCount(SSRA_LINK_COUNTS.backup_restore_gap);
 });
 test('PSRA-053 deployment_smoke_test_gap evidence links respect optional permission gates',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(6).locator(".platform-steady-state-recurrence-audit__row-actions a")).toHaveCount(SSRA_LINK_COUNTS.deployment_smoke_test_gap);
 });
 test('PSRA-054 incident_prevention_gap evidence links respect optional permission gates',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(7).locator(".platform-steady-state-recurrence-audit__row-actions a")).toHaveCount(SSRA_LINK_COUNTS.incident_prevention_gap);
 });
 test('PSRA-055 growth_governance_exception evidence links respect optional permission gates',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(8).locator(".platform-steady-state-recurrence-audit__row-actions a")).toHaveCount(SSRA_LINK_COUNTS.growth_governance_exception);
 });
 test('PSRA-056 missed_cadence manual audit stays gated by source closure',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(0).locator(".platform-steady-state-recurrence-audit__source-summary")).toContainText("Source exception closure row");await expect(rows(page).nth(0).locator(".platform-steady-state-recurrence-audit__row-badges")).toContainText("Waiting for exception closure completion");
 });
 test('PSRA-057 health_regression manual audit stays gated by source closure',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(1).locator(".platform-steady-state-recurrence-audit__source-summary")).toContainText("Source exception closure row");await expect(rows(page).nth(1).locator(".platform-steady-state-recurrence-audit__row-badges")).toContainText("Waiting for exception closure completion");
 });
 test('PSRA-058 customer_adoption_risk manual audit stays gated by source closure',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(2).locator(".platform-steady-state-recurrence-audit__source-summary")).toContainText("Source exception closure row");await expect(rows(page).nth(2).locator(".platform-steady-state-recurrence-audit__row-badges")).toContainText("Waiting for exception closure completion");
 });
 test('PSRA-059 support_sla_risk manual audit stays gated by source closure',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(3).locator(".platform-steady-state-recurrence-audit__source-summary")).toContainText("Source exception closure row");await expect(rows(page).nth(3).locator(".platform-steady-state-recurrence-audit__row-badges")).toContainText("Waiting for exception closure completion");
 });
 test('PSRA-060 billing_entitlement_exception manual audit stays gated by source closure',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(4).locator(".platform-steady-state-recurrence-audit__source-summary")).toContainText("Source exception closure row");await expect(rows(page).nth(4).locator(".platform-steady-state-recurrence-audit__row-badges")).toContainText("Waiting for exception closure completion");
 });
 test('PSRA-061 backup_restore_gap manual audit stays gated by source closure',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(5).locator(".platform-steady-state-recurrence-audit__source-summary")).toContainText("Source exception closure row");await expect(rows(page).nth(5).locator(".platform-steady-state-recurrence-audit__row-badges")).toContainText("Waiting for exception closure completion");
 });
 test('PSRA-062 deployment_smoke_test_gap manual audit stays gated by source closure',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(6).locator(".platform-steady-state-recurrence-audit__source-summary")).toContainText("Source exception closure row");await expect(rows(page).nth(6).locator(".platform-steady-state-recurrence-audit__row-badges")).toContainText("Waiting for exception closure completion");
 });
 test('PSRA-063 incident_prevention_gap manual audit stays gated by source closure',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(7).locator(".platform-steady-state-recurrence-audit__source-summary")).toContainText("Source exception closure row");await expect(rows(page).nth(7).locator(".platform-steady-state-recurrence-audit__row-badges")).toContainText("Waiting for exception closure completion");
 });
 test('PSRA-064 growth_governance_exception manual audit stays gated by source closure',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).nth(8).locator(".platform-steady-state-recurrence-audit__source-summary")).toContainText("Source exception closure row");await expect(rows(page).nth(8).locator(".platform-steady-state-recurrence-audit__row-badges")).toContainText("Waiting for exception closure completion");
 });
 test('PSRA-065 Unreported upstream closure persistence is not silently certified',async({page})=>{
  await openRecurrenceAudit(page,{alter:s=>({...s,exception_closure_persistence:null})});await expect(context(page).locator(".platform-steady-state-recurrence-audit__persistence-grid")).toContainText("Not reported");
 });
 test('PSRA-066 Original source exception closure references remain visible',async({page})=>{
  await openRecurrenceAudit(page);await expect(rows(page).locator(".platform-steady-state-recurrence-audit__source-summary")).toHaveCount(SSER_REQUIREMENTS.length);await expect(rows(page).first().locator(".platform-steady-state-recurrence-audit__source-summary")).toContainText("Source exception closure row");
 });
 test('PSRA-067 Empty audit rows do not certify risk clearance',async({page})=>{
  await openRecurrenceAudit(page,{alter:s=>({...s,recurrence_audit_rows:[],summary:{...s.summary,recurrence_audit_rows_total:0}})});await expect(root(page).locator(".platform-steady-state-recurrence-audit__empty-state")).toContainText("not evidence");await expect(rows(page)).toHaveCount(0);
 });
 test('PSRA-068 Forbidden response shows no recurrence audit rows',async({page})=>{
  await openRecurrenceAudit(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PSRA-069 Unavailable audit response exposes Retry without rows',async({page})=>{
  await openRecurrenceAudit(page,{status:503});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PSRA-070 Audit Refresh uses GET and retains nine templates',async({page})=>{
  const calls:string[]=[];await openRecurrenceAudit(page,{onCall:(m,p)=>{if(p===SSRA_PATH)calls.push(m);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(SSER_REQUIREMENTS.length);expect(calls.length).toBeGreaterThanOrEqual(2);expect(calls.every(m=>m==="GET")).toBeTruthy();
 });
});
