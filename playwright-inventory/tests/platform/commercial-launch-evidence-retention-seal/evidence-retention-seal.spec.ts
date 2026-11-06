/** Batch 139, Step 239: synthetic browser checks, not real externally sealed or accepted evidence. */
import {test,expect,type Page} from '@playwright/test';
import {openEvidenceRetentionSeal,ERS_PATH,ERS_PERMISSIONS,ERS_REQUIRED_FIELDS,ERS_RULES,ERS_CONTROLS,ERS_LINK_COUNTS} from '../../../support/platformCommercialLaunchEvidenceRetentionSealFixture';
import {SSER_REQUIREMENTS} from '../../../support/platformCommercialLaunchSteadyStateExceptionReviewFixture';
const root=(p:Page)=>p.locator('.platform-evidence-retention-seal');
const rows=(p:Page)=>root(p).locator('.platform-evidence-retention-seal__row-card');
const context=(p:Page)=>root(p).locator('.platform-evidence-retention-seal__context-panel');
test.describe('Commercial Launch Evidence Retention Seal — Step 239 synthetic browser contracts',()=>{
 test('PERS-001 Evidence retention seal heading renders',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(page.getByRole("heading",{name:"Commercial Launch Evidence Retention Seal",exact:true})).toBeVisible();
 });
 test('PERS-002 Step 239 and preparation only are explicit',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(root(page)).toContainText("Step 239 — Commercial Launch Evidence Retention Seal Board");await expect(root(page)).toContainText("Evidence retention seal preparation only");
 });
 test('PERS-003 External final archive confirmation is mandatory',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(root(page).locator(".platform-evidence-retention-seal__boundary-notice")).toContainText("Independently confirm");
 });
 test('PERS-004 Eleven unconditional supporting evidence links render',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(root(page).locator(".platform-evidence-retention-seal__supporting-pages a")).toHaveCount(11);
 });
 test('PERS-005 Seven summary metrics render',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(root(page).getByLabel("Evidence retention seal summary").locator(".io-workspace-stat")).toHaveCount(7);
 });
 test('PERS-006 All nine retention seal domains render',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page)).toHaveCount(SSER_REQUIREMENTS.length);
 });
 test('PERS-007 Critical severity is a template badge only',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(1).locator(".platform-evidence-retention-seal__row-badges [data-tone]").first()).toHaveAttribute("data-tone","danger");
 });
 test('PERS-008 Medium severity uses neutral template badge',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(2).locator(".platform-evidence-retention-seal__row-badges [data-tone]").first()).toHaveAttribute("data-tone","neutral");
 });
 test('PERS-009 Zero stored retention seals does not prove external closure',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(root(page).getByLabel("Evidence retention seal summary")).toContainText("Retention seal records stored here");await expect(context(page)).toContainText("External records not observable");
 });
 test('PERS-010 Twelve upstream source posture links remain available',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(context(page).locator(".platform-evidence-retention-seal__source-grid a")).toHaveCount(12);
 });
 test('PERS-011 Thirteen persistence boundaries remain visible',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(context(page).locator(".platform-evidence-retention-seal__persistence-grid > div")).toHaveCount(13);
 });
 test('PERS-012 No editable retention seal fields are present',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).locator("form,input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
 test('PERS-013 Empty seal list is never evidence of retention',async({page})=>{
  await openEvidenceRetentionSeal(page,{alter:s=>({...s,evidence_retention_seal_rows:[],summary:{...s.summary,evidence_retention_seal_rows_total:0}})});await expect(root(page).locator(".platform-evidence-retention-seal__empty-state")).toContainText("not evidence");await expect(rows(page)).toHaveCount(0);
 });
 test('PERS-014 Missing tenant permission redirects away from protected page',async({page})=>{
  await openEvidenceRetentionSeal(page,{permissions:ERS_PERMISSIONS.filter(p=>p!=="platform.tenants.read"),expectHeading:false});await expect(page).toHaveURL(/\/platform\/dashboard(?:\?.*)?$/);await expect(rows(page)).toHaveCount(0);
 });
 test('PERS-015 Optional Announcements and Releases links absent without grants',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(root(page).getByRole("link",{name:"Announcements"})).toHaveCount(0);await expect(root(page).getByRole("link",{name:"Releases"})).toHaveCount(0);
 });
 test('PERS-016 Rules and limitations show source-defined text',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(root(page).locator(".platform-evidence-retention-seal__rules-grid ul").first().locator("li")).toHaveText([...ERS_RULES]);await expect(root(page).locator(".platform-evidence-retention-seal__rules-grid ul").last().locator("li")).toHaveCount(4);
 });
 test('PERS-017 Forbidden retention seal response does not create rows',async({page})=>{
  await openEvidenceRetentionSeal(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PERS-018 Service failure offers Retry without fabricated seal',async({page})=>{
  await openEvidenceRetentionSeal(page,{status:503});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PERS-019 Refresh makes read-only GET calls',async({page})=>{
  const calls:string[]=[];await openEvidenceRetentionSeal(page,{onCall:(m,p)=>{if(p===ERS_PATH)calls.push(m);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(SSER_REQUIREMENTS.length);expect(calls.length).toBeGreaterThanOrEqual(2);expect(calls.every(m=>m==="GET")).toBeTruthy();
 });
 test('PERS-020 missed_cadence preserves owner and severity template labels',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(0).locator(".platform-evidence-retention-seal__row-heading")).toContainText(SSER_REQUIREMENTS[0].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(0).locator(".platform-evidence-retention-seal__row-badges")).toContainText(SSER_REQUIREMENTS[0].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PERS-021 health_regression preserves owner and severity template labels',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(1).locator(".platform-evidence-retention-seal__row-heading")).toContainText(SSER_REQUIREMENTS[1].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(1).locator(".platform-evidence-retention-seal__row-badges")).toContainText(SSER_REQUIREMENTS[1].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PERS-022 customer_adoption_risk preserves owner and severity template labels',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(2).locator(".platform-evidence-retention-seal__row-heading")).toContainText(SSER_REQUIREMENTS[2].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(2).locator(".platform-evidence-retention-seal__row-badges")).toContainText(SSER_REQUIREMENTS[2].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PERS-023 support_sla_risk preserves owner and severity template labels',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(3).locator(".platform-evidence-retention-seal__row-heading")).toContainText(SSER_REQUIREMENTS[3].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(3).locator(".platform-evidence-retention-seal__row-badges")).toContainText(SSER_REQUIREMENTS[3].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PERS-024 billing_entitlement_exception preserves owner and severity template labels',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(4).locator(".platform-evidence-retention-seal__row-heading")).toContainText(SSER_REQUIREMENTS[4].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(4).locator(".platform-evidence-retention-seal__row-badges")).toContainText(SSER_REQUIREMENTS[4].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PERS-025 backup_restore_gap preserves owner and severity template labels',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(5).locator(".platform-evidence-retention-seal__row-heading")).toContainText(SSER_REQUIREMENTS[5].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(5).locator(".platform-evidence-retention-seal__row-badges")).toContainText(SSER_REQUIREMENTS[5].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PERS-026 deployment_smoke_test_gap preserves owner and severity template labels',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(6).locator(".platform-evidence-retention-seal__row-heading")).toContainText(SSER_REQUIREMENTS[6].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(6).locator(".platform-evidence-retention-seal__row-badges")).toContainText(SSER_REQUIREMENTS[6].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PERS-027 incident_prevention_gap preserves owner and severity template labels',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(7).locator(".platform-evidence-retention-seal__row-heading")).toContainText(SSER_REQUIREMENTS[7].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(7).locator(".platform-evidence-retention-seal__row-badges")).toContainText(SSER_REQUIREMENTS[7].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PERS-028 growth_governance_exception preserves owner and severity template labels',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(8).locator(".platform-evidence-retention-seal__row-heading")).toContainText(SSER_REQUIREMENTS[8].owner.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase()));await expect(rows(page).nth(8).locator(".platform-evidence-retention-seal__row-badges")).toContainText(SSER_REQUIREMENTS[8].severity.replace(/^./,m=>m.toUpperCase())+" severity hint");
 });
 test('PERS-029 missed_cadence four exact retention seal evidence fields',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(0).locator(".platform-evidence-retention-seal__field-groups .platform-evidence-retention-seal__chips").nth(5).locator("span")).toHaveText(ERS_REQUIRED_FIELDS.missed_cadence.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PERS-030 health_regression four exact retention seal evidence fields',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(1).locator(".platform-evidence-retention-seal__field-groups .platform-evidence-retention-seal__chips").nth(5).locator("span")).toHaveText(ERS_REQUIRED_FIELDS.health_regression.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PERS-031 customer_adoption_risk four exact retention seal evidence fields',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(2).locator(".platform-evidence-retention-seal__field-groups .platform-evidence-retention-seal__chips").nth(5).locator("span")).toHaveText(ERS_REQUIRED_FIELDS.customer_adoption_risk.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PERS-032 support_sla_risk four exact retention seal evidence fields',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(3).locator(".platform-evidence-retention-seal__field-groups .platform-evidence-retention-seal__chips").nth(5).locator("span")).toHaveText(ERS_REQUIRED_FIELDS.support_sla_risk.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PERS-033 billing_entitlement_exception four exact retention seal evidence fields',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(4).locator(".platform-evidence-retention-seal__field-groups .platform-evidence-retention-seal__chips").nth(5).locator("span")).toHaveText(ERS_REQUIRED_FIELDS.billing_entitlement_exception.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PERS-034 backup_restore_gap four exact retention seal evidence fields',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(5).locator(".platform-evidence-retention-seal__field-groups .platform-evidence-retention-seal__chips").nth(5).locator("span")).toHaveText(ERS_REQUIRED_FIELDS.backup_restore_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PERS-035 deployment_smoke_test_gap four exact retention seal evidence fields',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(6).locator(".platform-evidence-retention-seal__field-groups .platform-evidence-retention-seal__chips").nth(5).locator("span")).toHaveText(ERS_REQUIRED_FIELDS.deployment_smoke_test_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PERS-036 incident_prevention_gap four exact retention seal evidence fields',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(7).locator(".platform-evidence-retention-seal__field-groups .platform-evidence-retention-seal__chips").nth(5).locator("span")).toHaveText(ERS_REQUIRED_FIELDS.incident_prevention_gap.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PERS-037 growth_governance_exception four exact retention seal evidence fields',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(8).locator(".platform-evidence-retention-seal__field-groups .platform-evidence-retention-seal__chips").nth(5).locator("span")).toHaveText(ERS_REQUIRED_FIELDS.growth_governance_exception.map(v=>v.replaceAll("_"," ").replace(/^./,m=>m.toUpperCase())));
 });
 test('PERS-038 missed_cadence retains three manual retention controls',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(0).locator(".platform-evidence-retention-seal__field-groups li")).toHaveText([...ERS_CONTROLS]);
 });
 test('PERS-039 health_regression retains three manual retention controls',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(1).locator(".platform-evidence-retention-seal__field-groups li")).toHaveText([...ERS_CONTROLS]);
 });
 test('PERS-040 customer_adoption_risk retains three manual retention controls',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(2).locator(".platform-evidence-retention-seal__field-groups li")).toHaveText([...ERS_CONTROLS]);
 });
 test('PERS-041 support_sla_risk retains three manual retention controls',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(3).locator(".platform-evidence-retention-seal__field-groups li")).toHaveText([...ERS_CONTROLS]);
 });
 test('PERS-042 billing_entitlement_exception retains three manual retention controls',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(4).locator(".platform-evidence-retention-seal__field-groups li")).toHaveText([...ERS_CONTROLS]);
 });
 test('PERS-043 backup_restore_gap retains three manual retention controls',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(5).locator(".platform-evidence-retention-seal__field-groups li")).toHaveText([...ERS_CONTROLS]);
 });
 test('PERS-044 deployment_smoke_test_gap retains three manual retention controls',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(6).locator(".platform-evidence-retention-seal__field-groups li")).toHaveText([...ERS_CONTROLS]);
 });
 test('PERS-045 incident_prevention_gap retains three manual retention controls',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(7).locator(".platform-evidence-retention-seal__field-groups li")).toHaveText([...ERS_CONTROLS]);
 });
 test('PERS-046 growth_governance_exception retains three manual retention controls',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(8).locator(".platform-evidence-retention-seal__field-groups li")).toHaveText([...ERS_CONTROLS]);
 });
 test('PERS-047 missed_cadence permission-filtered evidence links',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(0).locator(".platform-evidence-retention-seal__row-actions a")).toHaveCount(ERS_LINK_COUNTS.missed_cadence);
 });
 test('PERS-048 health_regression permission-filtered evidence links',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(1).locator(".platform-evidence-retention-seal__row-actions a")).toHaveCount(ERS_LINK_COUNTS.health_regression);
 });
 test('PERS-049 customer_adoption_risk permission-filtered evidence links',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(2).locator(".platform-evidence-retention-seal__row-actions a")).toHaveCount(ERS_LINK_COUNTS.customer_adoption_risk);
 });
 test('PERS-050 support_sla_risk permission-filtered evidence links',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(3).locator(".platform-evidence-retention-seal__row-actions a")).toHaveCount(ERS_LINK_COUNTS.support_sla_risk);
 });
 test('PERS-051 billing_entitlement_exception permission-filtered evidence links',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(4).locator(".platform-evidence-retention-seal__row-actions a")).toHaveCount(ERS_LINK_COUNTS.billing_entitlement_exception);
 });
 test('PERS-052 backup_restore_gap permission-filtered evidence links',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(5).locator(".platform-evidence-retention-seal__row-actions a")).toHaveCount(ERS_LINK_COUNTS.backup_restore_gap);
 });
 test('PERS-053 deployment_smoke_test_gap permission-filtered evidence links',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(6).locator(".platform-evidence-retention-seal__row-actions a")).toHaveCount(ERS_LINK_COUNTS.deployment_smoke_test_gap);
 });
 test('PERS-054 incident_prevention_gap permission-filtered evidence links',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(7).locator(".platform-evidence-retention-seal__row-actions a")).toHaveCount(ERS_LINK_COUNTS.incident_prevention_gap);
 });
 test('PERS-055 growth_governance_exception permission-filtered evidence links',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(8).locator(".platform-evidence-retention-seal__row-actions a")).toHaveCount(ERS_LINK_COUNTS.growth_governance_exception);
 });
 test('PERS-056 missed_cadence final-archive source status trace remains visible',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(0).locator(".platform-evidence-retention-seal__source-summary > div").first()).toContainText("Source Final Evidence Archive row");await expect(rows(page).nth(0).locator(".platform-evidence-retention-seal__source-summary > div").first()).toContainText("Waiting for external durable closure certification confirmation");
 });
 test('PERS-057 health_regression final-archive source status trace remains visible',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(1).locator(".platform-evidence-retention-seal__source-summary > div").first()).toContainText("Source Final Evidence Archive row");await expect(rows(page).nth(1).locator(".platform-evidence-retention-seal__source-summary > div").first()).toContainText("Waiting for external durable closure certification confirmation");
 });
 test('PERS-058 customer_adoption_risk final-archive source status trace remains visible',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(2).locator(".platform-evidence-retention-seal__source-summary > div").first()).toContainText("Source Final Evidence Archive row");await expect(rows(page).nth(2).locator(".platform-evidence-retention-seal__source-summary > div").first()).toContainText("Waiting for external durable closure certification confirmation");
 });
 test('PERS-059 support_sla_risk final-archive source status trace remains visible',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(3).locator(".platform-evidence-retention-seal__source-summary > div").first()).toContainText("Source Final Evidence Archive row");await expect(rows(page).nth(3).locator(".platform-evidence-retention-seal__source-summary > div").first()).toContainText("Waiting for external durable closure certification confirmation");
 });
 test('PERS-060 billing_entitlement_exception final-archive source status trace remains visible',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(4).locator(".platform-evidence-retention-seal__source-summary > div").first()).toContainText("Source Final Evidence Archive row");await expect(rows(page).nth(4).locator(".platform-evidence-retention-seal__source-summary > div").first()).toContainText("Waiting for external durable closure certification confirmation");
 });
 test('PERS-061 backup_restore_gap final-archive source status trace remains visible',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(5).locator(".platform-evidence-retention-seal__source-summary > div").first()).toContainText("Source Final Evidence Archive row");await expect(rows(page).nth(5).locator(".platform-evidence-retention-seal__source-summary > div").first()).toContainText("Waiting for external durable closure certification confirmation");
 });
 test('PERS-062 deployment_smoke_test_gap final-archive source status trace remains visible',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(6).locator(".platform-evidence-retention-seal__source-summary > div").first()).toContainText("Source Final Evidence Archive row");await expect(rows(page).nth(6).locator(".platform-evidence-retention-seal__source-summary > div").first()).toContainText("Waiting for external durable closure certification confirmation");
 });
 test('PERS-063 incident_prevention_gap final-archive source status trace remains visible',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(7).locator(".platform-evidence-retention-seal__source-summary > div").first()).toContainText("Source Final Evidence Archive row");await expect(rows(page).nth(7).locator(".platform-evidence-retention-seal__source-summary > div").first()).toContainText("Waiting for external durable closure certification confirmation");
 });
 test('PERS-064 growth_governance_exception final-archive source status trace remains visible',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).nth(8).locator(".platform-evidence-retention-seal__source-summary > div").first()).toContainText("Source Final Evidence Archive row");await expect(rows(page).nth(8).locator(".platform-evidence-retention-seal__source-summary > div").first()).toContainText("Waiting for external durable closure certification confirmation");
 });
 test('PERS-065 Retention seal rows preserve eight trace and release panels',async({page})=>{
  await openEvidenceRetentionSeal(page);await expect(rows(page).first().locator(".platform-evidence-retention-seal__source-summary > div")).toHaveCount(8);await expect(rows(page).first().locator(".platform-evidence-retention-seal__source-summary")).toContainText("Release condition");
 });
 test('PERS-066 Null upstream final archive persistence is explicitly unknown',async({page})=>{
  await openEvidenceRetentionSeal(page,{alter:s=>({...s,final_evidence_archive_persistence:null})});await expect(context(page).locator(".platform-evidence-retention-seal__persistence-grid")).toContainText("Not reported");
 });
 test('PERS-067 Cadence array absent reports no upstream cadence statuses',async({page})=>{
  await openEvidenceRetentionSeal(page,{alter:s=>({...s,evidence_retention_seal_rows:s.evidence_retention_seal_rows.map((r,i)=>i===0?{...r,source_cadence_statuses:[]}:r)})});await expect(rows(page).first().locator(".platform-evidence-retention-seal__source-rows").first()).toContainText("None reported");
 });
 test('PERS-068 Missing transition source references do not imply transition acceptance',async({page})=>{
  await openEvidenceRetentionSeal(page,{alter:s=>({...s,evidence_retention_seal_rows:s.evidence_retention_seal_rows.map((r,i)=>i===0?{...r,source_transition_rows:[]}:r)})});await expect(rows(page).first().locator(".platform-evidence-retention-seal__source-rows").nth(1)).toContainText("None reported");
 });
 test('PERS-069 Missing growth observation references show None reported',async({page})=>{
  await openEvidenceRetentionSeal(page,{alter:s=>({...s,evidence_retention_seal_rows:s.evidence_retention_seal_rows.map((r,i)=>i===0?{...r,source_observation_rows:[]}:r)})});await expect(rows(page).first().locator(".platform-evidence-retention-seal__source-rows").nth(2)).toContainText("None reported");
 });
 test('PERS-070 Missing growth authorization references show None reported',async({page})=>{
  await openEvidenceRetentionSeal(page,{alter:s=>({...s,evidence_retention_seal_rows:s.evidence_retention_seal_rows.map((r,i)=>i===0?{...r,source_authorization_rows:[]}:r)})});await expect(rows(page).first().locator(".platform-evidence-retention-seal__source-rows").nth(3)).toContainText("None reported");
 });
});
