/** Batch 133: Step 233 read-only exception closure browser contracts. No real closure or owner signoff. */
import {test,expect,type Page} from '@playwright/test';
import {openExceptionClosure,SSECL_PATH,SSECL_PERMISSIONS,SSECL_REQUIRED_FIELDS,SSECL_RULES,SSECL_CONTROLS,SSECL_LINK_COUNTS} from '../../../support/platformCommercialLaunchSteadyStateExceptionClosureFixture';
import {SSER_REQUIREMENTS} from '../../../support/platformCommercialLaunchSteadyStateExceptionReviewFixture';
const root=(p:Page)=>p.locator('.platform-steady-state-exception-closure');
const rows=(p:Page)=>root(p).locator('.platform-steady-state-exception-closure__row-card');
const context=(p:Page)=>root(p).locator('.platform-steady-state-exception-closure__context-panel');
test.describe('Commercial Launch Steady-State Exception Closure — Step 233 synthetic browser contracts',()=>{
 test('PSECL-001 Exception Closure heading renders',async({page})=>{
  await openExceptionClosure(page);await expect(page.getByRole("heading",{name:"Commercial Launch Steady-State Exception Closure",exact:true})).toBeVisible();
 });
 test('PSECL-002 Step 233 preparation and external record badges remain visible',async({page})=>{
  await openExceptionClosure(page);await expect(root(page)).toContainText("Step 233 — Commercial Launch Steady-State Exception Closure Board");await expect(root(page)).toContainText("Exception closure preparation only");
 });
 test('PSECL-003 Manual closure boundary is explicit',async({page})=>{
  await openExceptionClosure(page);await expect(root(page).locator(".platform-steady-state-exception-closure__boundary-notice")).toContainText("Independently confirm");
 });
 test('PSECL-004 Seven supporting pages render',async({page})=>{
  await openExceptionClosure(page);await expect(root(page).locator(".platform-steady-state-exception-closure__supporting-pages a")).toHaveCount(7);
 });
 test('PSECL-005 Seven source-defined summary metrics render',async({page})=>{
  await openExceptionClosure(page);await expect(root(page).getByLabel("Steady-state exception closure summary").locator(".io-workspace-stat")).toHaveCount(7);
 });
 test('PSECL-006 All nine closure templates render',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page)).toHaveCount(SSER_REQUIREMENTS.length);
 });
 test('PSECL-007 Critical closure severity uses danger tone',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(1).locator(".platform-steady-state-exception-closure__row-badges [data-tone]").first()).toHaveAttribute("data-tone","danger");
 });
 test('PSECL-008 Medium closure severity uses neutral tone',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(2).locator(".platform-steady-state-exception-closure__row-badges [data-tone]").first()).toHaveAttribute("data-tone","neutral");
 });
 test('PSECL-009 Synthetic closure persistence does not imply external acceptance',async({page})=>{
  await openExceptionClosure(page);await expect(root(page).getByLabel("Steady-state exception closure summary")).toContainText("Exception-closure records stored here");await expect(context(page)).toContainText("External records not observable");
 });
 test('PSECL-010 Six upstream source posture links render',async({page})=>{
  await openExceptionClosure(page);await expect(context(page).locator(".platform-steady-state-exception-closure__source-grid a")).toHaveCount(6);
 });
 test('PSECL-011 Seven source persistence boundaries render',async({page})=>{
  await openExceptionClosure(page);await expect(context(page).locator(".platform-steady-state-exception-closure__persistence-grid > div")).toHaveCount(7);
 });
 test('PSECL-012 Closure rows expose no editable forms',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).locator("form,input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
 test('PSECL-013 Empty closure board does not imply exceptions are resolved',async({page})=>{
  await openExceptionClosure(page,{alter:s=>({...s,closure_rows:[],summary:{...s.summary,closure_rows_total:0}})});await expect(root(page).locator(".platform-steady-state-exception-closure__empty-state")).toContainText("not evidence");await expect(rows(page)).toHaveCount(0);
 });
 test('PSECL-014 Missing required tenant read permission redirects',async({page})=>{
  await openExceptionClosure(page,{permissions:SSECL_PERMISSIONS.filter(p=>p!=="platform.tenants.read"),expectHeading:false});await expect(page).toHaveURL(/\/platform\/dashboard(?:\?.*)?$/);await expect(rows(page)).toHaveCount(0);
 });
 test('PSECL-015 Optional jobs announcements releases links remain hidden',async({page})=>{
  await openExceptionClosure(page);await expect(root(page).getByRole("link",{name:"Operational Jobs"})).toHaveCount(0);await expect(root(page).getByRole("link",{name:"Announcements"})).toHaveCount(0);await expect(root(page).getByRole("link",{name:"Releases"})).toHaveCount(0);
 });
 test('PSECL-016 Exact three closure rules and four limitations render',async({page})=>{
  await openExceptionClosure(page);await expect(root(page).locator(".platform-steady-state-exception-closure__rules-grid ul").first().locator("li")).toHaveText([...SSECL_RULES]);await expect(root(page).locator(".platform-steady-state-exception-closure__rules-grid ul").last().locator("li")).toHaveCount(4);
 });
 test('PSECL-017 Forbidden API response does not expose closure rows',async({page})=>{
  await openExceptionClosure(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PSECL-018 Service-unavailable error surfaces retry',async({page})=>{
  await openExceptionClosure(page,{status:503});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PSECL-019 Closure refresh uses GET only',async({page})=>{
  const calls:string[]=[];await openExceptionClosure(page,{onCall:(m,p)=>{if(p===SSECL_PATH)calls.push(m);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(SSER_REQUIREMENTS.length);expect(calls.length).toBeGreaterThanOrEqual(2);expect(calls.every(m=>m==="GET")).toBeTruthy();
 });
 test('PSECL-020 missed_cadence exact owner and template severity',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(0).locator(".platform-steady-state-exception-closure__row-heading")).toContainText(SSER_REQUIREMENTS[0].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(0).locator(".platform-steady-state-exception-closure__row-badges")).toContainText(SSER_REQUIREMENTS[0].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PSECL-021 health_regression exact owner and template severity',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(1).locator(".platform-steady-state-exception-closure__row-heading")).toContainText(SSER_REQUIREMENTS[1].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(1).locator(".platform-steady-state-exception-closure__row-badges")).toContainText(SSER_REQUIREMENTS[1].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PSECL-022 customer_adoption_risk exact owner and template severity',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(2).locator(".platform-steady-state-exception-closure__row-heading")).toContainText(SSER_REQUIREMENTS[2].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(2).locator(".platform-steady-state-exception-closure__row-badges")).toContainText(SSER_REQUIREMENTS[2].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PSECL-023 support_sla_risk exact owner and template severity',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(3).locator(".platform-steady-state-exception-closure__row-heading")).toContainText(SSER_REQUIREMENTS[3].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(3).locator(".platform-steady-state-exception-closure__row-badges")).toContainText(SSER_REQUIREMENTS[3].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PSECL-024 billing_entitlement_exception exact owner and template severity',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(4).locator(".platform-steady-state-exception-closure__row-heading")).toContainText(SSER_REQUIREMENTS[4].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(4).locator(".platform-steady-state-exception-closure__row-badges")).toContainText(SSER_REQUIREMENTS[4].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PSECL-025 backup_restore_gap exact owner and template severity',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(5).locator(".platform-steady-state-exception-closure__row-heading")).toContainText(SSER_REQUIREMENTS[5].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(5).locator(".platform-steady-state-exception-closure__row-badges")).toContainText(SSER_REQUIREMENTS[5].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PSECL-026 deployment_smoke_test_gap exact owner and template severity',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(6).locator(".platform-steady-state-exception-closure__row-heading")).toContainText(SSER_REQUIREMENTS[6].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(6).locator(".platform-steady-state-exception-closure__row-badges")).toContainText(SSER_REQUIREMENTS[6].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PSECL-027 incident_prevention_gap exact owner and template severity',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(7).locator(".platform-steady-state-exception-closure__row-heading")).toContainText(SSER_REQUIREMENTS[7].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(7).locator(".platform-steady-state-exception-closure__row-badges")).toContainText(SSER_REQUIREMENTS[7].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PSECL-028 growth_governance_exception exact owner and template severity',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(8).locator(".platform-steady-state-exception-closure__row-heading")).toContainText(SSER_REQUIREMENTS[8].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(8).locator(".platform-steady-state-exception-closure__row-badges")).toContainText(SSER_REQUIREMENTS[8].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PSECL-029 missed_cadence retains four exact external closure fields',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(0).locator(".platform-steady-state-exception-closure__field-groups .platform-steady-state-exception-closure__chips").nth(1).locator("span")).toHaveText(SSECL_REQUIRED_FIELDS.missed_cadence.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSECL-030 health_regression retains four exact external closure fields',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(1).locator(".platform-steady-state-exception-closure__field-groups .platform-steady-state-exception-closure__chips").nth(1).locator("span")).toHaveText(SSECL_REQUIRED_FIELDS.health_regression.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSECL-031 customer_adoption_risk retains four exact external closure fields',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(2).locator(".platform-steady-state-exception-closure__field-groups .platform-steady-state-exception-closure__chips").nth(1).locator("span")).toHaveText(SSECL_REQUIRED_FIELDS.customer_adoption_risk.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSECL-032 support_sla_risk retains four exact external closure fields',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(3).locator(".platform-steady-state-exception-closure__field-groups .platform-steady-state-exception-closure__chips").nth(1).locator("span")).toHaveText(SSECL_REQUIRED_FIELDS.support_sla_risk.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSECL-033 billing_entitlement_exception retains four exact external closure fields',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(4).locator(".platform-steady-state-exception-closure__field-groups .platform-steady-state-exception-closure__chips").nth(1).locator("span")).toHaveText(SSECL_REQUIRED_FIELDS.billing_entitlement_exception.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSECL-034 backup_restore_gap retains four exact external closure fields',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(5).locator(".platform-steady-state-exception-closure__field-groups .platform-steady-state-exception-closure__chips").nth(1).locator("span")).toHaveText(SSECL_REQUIRED_FIELDS.backup_restore_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSECL-035 deployment_smoke_test_gap retains four exact external closure fields',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(6).locator(".platform-steady-state-exception-closure__field-groups .platform-steady-state-exception-closure__chips").nth(1).locator("span")).toHaveText(SSECL_REQUIRED_FIELDS.deployment_smoke_test_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSECL-036 incident_prevention_gap retains four exact external closure fields',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(7).locator(".platform-steady-state-exception-closure__field-groups .platform-steady-state-exception-closure__chips").nth(1).locator("span")).toHaveText(SSECL_REQUIRED_FIELDS.incident_prevention_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSECL-037 growth_governance_exception retains four exact external closure fields',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(8).locator(".platform-steady-state-exception-closure__field-groups .platform-steady-state-exception-closure__chips").nth(1).locator("span")).toHaveText(SSECL_REQUIRED_FIELDS.growth_governance_exception.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PSECL-038 missed_cadence retains three closure controls',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(0).locator(".platform-steady-state-exception-closure__field-groups li")).toHaveText([...SSECL_CONTROLS]);
 });
 test('PSECL-039 health_regression retains three closure controls',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(1).locator(".platform-steady-state-exception-closure__field-groups li")).toHaveText([...SSECL_CONTROLS]);
 });
 test('PSECL-040 customer_adoption_risk retains three closure controls',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(2).locator(".platform-steady-state-exception-closure__field-groups li")).toHaveText([...SSECL_CONTROLS]);
 });
 test('PSECL-041 support_sla_risk retains three closure controls',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(3).locator(".platform-steady-state-exception-closure__field-groups li")).toHaveText([...SSECL_CONTROLS]);
 });
 test('PSECL-042 billing_entitlement_exception retains three closure controls',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(4).locator(".platform-steady-state-exception-closure__field-groups li")).toHaveText([...SSECL_CONTROLS]);
 });
 test('PSECL-043 backup_restore_gap retains three closure controls',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(5).locator(".platform-steady-state-exception-closure__field-groups li")).toHaveText([...SSECL_CONTROLS]);
 });
 test('PSECL-044 deployment_smoke_test_gap retains three closure controls',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(6).locator(".platform-steady-state-exception-closure__field-groups li")).toHaveText([...SSECL_CONTROLS]);
 });
 test('PSECL-045 incident_prevention_gap retains three closure controls',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(7).locator(".platform-steady-state-exception-closure__field-groups li")).toHaveText([...SSECL_CONTROLS]);
 });
 test('PSECL-046 growth_governance_exception retains three closure controls',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(8).locator(".platform-steady-state-exception-closure__field-groups li")).toHaveText([...SSECL_CONTROLS]);
 });
 test('PSECL-047 missed_cadence source evidence link count respects optional grants',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(0).locator(".platform-steady-state-exception-closure__row-actions a")).toHaveCount(SSECL_LINK_COUNTS.missed_cadence);
 });
 test('PSECL-048 health_regression source evidence link count respects optional grants',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(1).locator(".platform-steady-state-exception-closure__row-actions a")).toHaveCount(SSECL_LINK_COUNTS.health_regression);
 });
 test('PSECL-049 customer_adoption_risk source evidence link count respects optional grants',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(2).locator(".platform-steady-state-exception-closure__row-actions a")).toHaveCount(SSECL_LINK_COUNTS.customer_adoption_risk);
 });
 test('PSECL-050 support_sla_risk source evidence link count respects optional grants',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(3).locator(".platform-steady-state-exception-closure__row-actions a")).toHaveCount(SSECL_LINK_COUNTS.support_sla_risk);
 });
 test('PSECL-051 billing_entitlement_exception source evidence link count respects optional grants',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(4).locator(".platform-steady-state-exception-closure__row-actions a")).toHaveCount(SSECL_LINK_COUNTS.billing_entitlement_exception);
 });
 test('PSECL-052 backup_restore_gap source evidence link count respects optional grants',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(5).locator(".platform-steady-state-exception-closure__row-actions a")).toHaveCount(SSECL_LINK_COUNTS.backup_restore_gap);
 });
 test('PSECL-053 deployment_smoke_test_gap source evidence link count respects optional grants',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(6).locator(".platform-steady-state-exception-closure__row-actions a")).toHaveCount(SSECL_LINK_COUNTS.deployment_smoke_test_gap);
 });
 test('PSECL-054 incident_prevention_gap source evidence link count respects optional grants',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(7).locator(".platform-steady-state-exception-closure__row-actions a")).toHaveCount(SSECL_LINK_COUNTS.incident_prevention_gap);
 });
 test('PSECL-055 growth_governance_exception source evidence link count respects optional grants',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(8).locator(".platform-steady-state-exception-closure__row-actions a")).toHaveCount(SSECL_LINK_COUNTS.growth_governance_exception);
 });
 test('PSECL-056 missed_cadence closure remains manually gated',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(0).locator(".platform-steady-state-exception-closure__source-summary")).toContainText("Manual exception closure required before steady state launch governance can be closed");
 });
 test('PSECL-057 health_regression closure remains manually gated',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(1).locator(".platform-steady-state-exception-closure__source-summary")).toContainText("Manual exception closure required before steady state launch governance can be closed");
 });
 test('PSECL-058 customer_adoption_risk closure remains manually gated',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(2).locator(".platform-steady-state-exception-closure__source-summary")).toContainText("Manual exception closure required before steady state launch governance can be closed");
 });
 test('PSECL-059 support_sla_risk closure remains manually gated',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(3).locator(".platform-steady-state-exception-closure__source-summary")).toContainText("Manual exception closure required before steady state launch governance can be closed");
 });
 test('PSECL-060 billing_entitlement_exception closure remains manually gated',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(4).locator(".platform-steady-state-exception-closure__source-summary")).toContainText("Manual exception closure required before steady state launch governance can be closed");
 });
 test('PSECL-061 backup_restore_gap closure remains manually gated',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(5).locator(".platform-steady-state-exception-closure__source-summary")).toContainText("Manual exception closure required before steady state launch governance can be closed");
 });
 test('PSECL-062 deployment_smoke_test_gap closure remains manually gated',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(6).locator(".platform-steady-state-exception-closure__source-summary")).toContainText("Manual exception closure required before steady state launch governance can be closed");
 });
 test('PSECL-063 incident_prevention_gap closure remains manually gated',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(7).locator(".platform-steady-state-exception-closure__source-summary")).toContainText("Manual exception closure required before steady state launch governance can be closed");
 });
 test('PSECL-064 growth_governance_exception closure remains manually gated',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).nth(8).locator(".platform-steady-state-exception-closure__source-summary")).toContainText("Manual exception closure required before steady state launch governance can be closed");
 });
 test('PSECL-065 Missing exception-review persistence is reported not inferred',async({page})=>{
  await openExceptionClosure(page,{alter:s=>({...s,exception_review_persistence:null})});await expect(context(page).locator(".platform-steady-state-exception-closure__persistence-grid")).toContainText("Not reported");
 });
 test('PSECL-066 All closure rows expose their source review status',async({page})=>{
  await openExceptionClosure(page);await expect(rows(page).locator(".platform-steady-state-exception-closure__source-summary")).toHaveCount(SSER_REQUIREMENTS.length);await expect(rows(page).first().locator(".platform-steady-state-exception-closure__source-summary")).toContainText("Source exception review row");
 });
 test('PSECL-067 Missing closure entries must show non-certification warning',async({page})=>{
  await openExceptionClosure(page,{alter:s=>({...s,closure_rows:[],summary:{...s.summary,closure_rows_total:0}})});await expect(root(page).locator(".platform-steady-state-exception-closure__empty-state")).toContainText("not evidence");await expect(rows(page)).toHaveCount(0);
 });
 test('PSECL-068 Access-denied response has zero closure cards',async({page})=>{
  await openExceptionClosure(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PSECL-069 Service failure displays retry without closure cards',async({page})=>{
  await openExceptionClosure(page,{status:503});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PSECL-070 Closure refresh is GET-only and preserves all templates',async({page})=>{
  const calls:string[]=[];await openExceptionClosure(page,{onCall:(m,p)=>{if(p===SSECL_PATH)calls.push(m);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(SSER_REQUIREMENTS.length);expect(calls.length).toBeGreaterThanOrEqual(2);expect(calls.every(m=>m==="GET")).toBeTruthy();
 });
});
