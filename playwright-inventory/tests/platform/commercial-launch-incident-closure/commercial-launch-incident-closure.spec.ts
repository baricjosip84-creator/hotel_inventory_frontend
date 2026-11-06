/** Batch 124 — Step 224 source-grounded synthetic presentation, NOT proof of real incident closure. */
import {test,expect,type Page} from '@playwright/test';
import {openClosure,CLOSURE_PATH,CLOSURE_PERMISSIONS,CLOSURE_FIELDS,CLOSURE_CHOICES,CLOSURE_REQUIREMENTS,CLOSURE_EVIDENCE_LINKS} from '../../../support/platformCommercialLaunchIncidentClosureFixture';
import {OBSERVATION_CHECKS} from '../../../support/platformCommercialLaunchPostLaunchObservationFixture';
const root=(p:Page)=>p.locator('.platform-incident-closure');
const rows=(p:Page)=>root(p).locator('.platform-incident-closure__row-card');
const context=(p:Page)=>root(p).locator('.platform-incident-closure__context-panel');
test.describe('Commercial Launch Incident Closure — Step 224 read-only source evidence',()=>{
 test('PICL-001 Closure route renders canonical heading',async({page})=>{
  await openClosure(page);await expect(page.getByRole("heading",{name:"Commercial Launch Incident Closure",exact:true})).toBeVisible();
 });
 test('PICL-002 Hero explicitly identifies Step 224 and closure preparation only',async({page})=>{
  await openClosure(page);await expect(root(page)).toContainText("Step 224 — Commercial Launch Incident Closure Board");await expect(root(page)).toContainText("Closure preparation only");
 });
 test('PICL-003 External confirmation boundary denies implicit incident closure',async({page})=>{
  await openClosure(page);await expect(root(page).locator(".platform-incident-closure__boundary-notice")).toContainText("cannot confirm");
 });
 test('PICL-004 All eleven supporting page shortcuts are available',async({page})=>{
  await openClosure(page);await expect(root(page).locator(".platform-incident-closure__supporting-pages .platform-incident-closure__link-row a")).toHaveCount(11);
 });
 test('PICL-005 Nine source-defined incident closure summary stats render',async({page})=>{
  await openClosure(page);await expect(root(page).getByLabel("Incident closure summary").locator(".io-workspace-stat")).toHaveCount(9);
 });
 test('PICL-006 Eight closure evidence templates render',async({page})=>{
  await openClosure(page);await expect(rows(page)).toHaveCount(8);
 });
 test('PICL-007 blocked triage posture maps to correct closure badge',async({page})=>{
  await openClosure(page,{kind:"blocked"});await expect(rows(page).first().locator(".platform-incident-closure__row-heading [data-tone]")).toHaveAttribute("data-tone","danger");
 });
 test('PICL-008 review triage posture maps to correct closure badge',async({page})=>{
  await openClosure(page,{kind:"review"});await expect(rows(page).first().locator(".platform-incident-closure__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PICL-009 go triage posture maps to correct closure badge',async({page})=>{
  await openClosure(page,{kind:"go"});await expect(rows(page).first().locator(".platform-incident-closure__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PICL-010 smoke triage posture maps to correct closure badge',async({page})=>{
  await openClosure(page,{kind:"smoke"});await expect(rows(page).first().locator(".platform-incident-closure__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PICL-011 window triage posture maps to correct closure badge',async({page})=>{
  await openClosure(page,{kind:"window"});await expect(rows(page).first().locator(".platform-incident-closure__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PICL-012 external triage posture maps to correct closure badge',async({page})=>{
  await openClosure(page,{kind:"external"});await expect(rows(page).first().locator(".platform-incident-closure__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PICL-013 manual triage posture maps to correct closure badge',async({page})=>{
  await openClosure(page,{kind:"manual"});await expect(rows(page).first().locator(".platform-incident-closure__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PICL-014 Source owner for service_health closure domain remains visible',async({page})=>{
  await openClosure(page);await expect(rows(page).nth(0)).toContainText("Platform operations owner");await expect(rows(page).nth(0)).toContainText("Service health");
 });
 test('PICL-015 Source owner for customer_feedback closure domain remains visible',async({page})=>{
  await openClosure(page);await expect(rows(page).nth(1)).toContainText("Customer success owner");await expect(rows(page).nth(1)).toContainText("Customer feedback");
 });
 test('PICL-016 Source owner for support_intake closure domain remains visible',async({page})=>{
  await openClosure(page);await expect(rows(page).nth(2)).toContainText("Support owner");await expect(rows(page).nth(2)).toContainText("Support intake");
 });
 test('PICL-017 Source owner for billing_confirmation closure domain remains visible',async({page})=>{
  await openClosure(page);await expect(rows(page).nth(3)).toContainText("Billing owner");await expect(rows(page).nth(3)).toContainText("Billing confirmation");
 });
 test('PICL-018 Source owner for incident_review closure domain remains visible',async({page})=>{
  await openClosure(page);await expect(rows(page).nth(4)).toContainText("Platform reliability owner");await expect(rows(page).nth(4)).toContainText("Incident review");
 });
 test('PICL-019 Source owner for rollback_readiness closure domain remains visible',async({page})=>{
  await openClosure(page);await expect(rows(page).nth(5)).toContainText("Release owner");await expect(rows(page).nth(5)).toContainText("Rollback readiness");
 });
 test('PICL-020 Source owner for adoption_signal closure domain remains visible',async({page})=>{
  await openClosure(page);await expect(rows(page).nth(6)).toContainText("Product owner");await expect(rows(page).nth(6)).toContainText("Adoption signal");
 });
 test('PICL-021 Source owner for handoff_closure closure domain remains visible',async({page})=>{
  await openClosure(page);await expect(rows(page).nth(7)).toContainText("Release owner");await expect(rows(page).nth(7)).toContainText("Handoff closure");
 });
 test('PICL-022 Evidence destination for closure domain 1 matches router',async({page})=>{
  await openClosure(page);await expect(rows(page).nth(0).getByRole("link",{name:"Open system health"})).toHaveAttribute("href","/platform/system-health");
 });
 test('PICL-023 Evidence destination for closure domain 2 matches router',async({page})=>{
  await openClosure(page);await expect(rows(page).nth(1).getByRole("link",{name:"Open tenant communications"})).toHaveAttribute("href","/platform/tenant-communications");
 });
 test('PICL-024 Evidence destination for closure domain 3 matches router',async({page})=>{
  await openClosure(page);await expect(rows(page).nth(2).getByRole("link",{name:"Open support cockpit"})).toHaveAttribute("href","/platform/support-cockpit");
 });
 test('PICL-025 Evidence destination for closure domain 4 matches router',async({page})=>{
  await openClosure(page);await expect(rows(page).nth(3).getByRole("link",{name:"Open billing activation"})).toHaveAttribute("href","/platform/billing-subscription-activation");
 });
 test('PICL-026 Evidence destination for closure domain 5 matches router',async({page})=>{
  await openClosure(page);await expect(rows(page).nth(4).getByRole("link",{name:"Open incidents"})).toHaveAttribute("href","/platform/incidents");
 });
 test('PICL-027 Evidence destination for closure domain 6 matches router',async({page})=>{
  await openClosure(page);await expect(rows(page).nth(5).getByRole("link",{name:"Open deployment validation"})).toHaveAttribute("href","/platform/deployment-validation");
 });
 test('PICL-028 Evidence destination for closure domain 7 matches router',async({page})=>{
  await openClosure(page);await expect(rows(page).nth(6).getByRole("link",{name:"Open pilot readiness"})).toHaveAttribute("href","/platform/pilot-customer-readiness");
 });
 test('PICL-029 Evidence destination for closure domain 8 matches router',async({page})=>{
  await openClosure(page);await expect(rows(page).nth(7).getByRole("link",{name:"Open post-launch observation"})).toHaveAttribute("href","/platform/commercial-launch-post-launch-observation");
 });
 test('PICL-030 Required external closure field source_triage_record_reference is visible',async({page})=>{
  await openClosure(page);await expect(rows(page).first().locator(".platform-incident-closure__field-groups")).toContainText("Source triage record reference");
 });
 test('PICL-031 Required external closure field final_severity is visible',async({page})=>{
  await openClosure(page);await expect(rows(page).first().locator(".platform-incident-closure__field-groups")).toContainText("Final severity");
 });
 test('PICL-032 Required external closure field customer_impact_resolution is visible',async({page})=>{
  await openClosure(page);await expect(rows(page).first().locator(".platform-incident-closure__field-groups")).toContainText("Customer impact resolution");
 });
 test('PICL-033 Required external closure field rollback_outcome is visible',async({page})=>{
  await openClosure(page);await expect(rows(page).first().locator(".platform-incident-closure__field-groups")).toContainText("Rollback outcome");
 });
 test('PICL-034 Required external closure field customer_communication_completed_at is visible',async({page})=>{
  await openClosure(page);await expect(rows(page).first().locator(".platform-incident-closure__field-groups")).toContainText("Customer communication completed at");
 });
 test('PICL-035 Required external closure field prevention_action is visible',async({page})=>{
  await openClosure(page);await expect(rows(page).first().locator(".platform-incident-closure__field-groups")).toContainText("Prevention action");
 });
 test('PICL-036 Required external closure field handoff_decision is visible',async({page})=>{
  await openClosure(page);await expect(rows(page).first().locator(".platform-incident-closure__field-groups")).toContainText("Handoff decision");
 });
 test('PICL-037 Required external closure field closure_evidence_link is visible',async({page})=>{
  await openClosure(page);await expect(rows(page).first().locator(".platform-incident-closure__field-groups")).toContainText("Closure evidence link");
 });
 test('PICL-038 Required external closure field closure_owner is visible',async({page})=>{
  await openClosure(page);await expect(rows(page).first().locator(".platform-incident-closure__field-groups")).toContainText("Closure owner");
 });
 test('PICL-039 Required external closure field reviewed_at is visible',async({page})=>{
  await openClosure(page);await expect(rows(page).first().locator(".platform-incident-closure__field-groups")).toContainText("Reviewed at");
 });
 test('PICL-040 Handoff decision template includes accepted',async({page})=>{
  await openClosure(page);await expect(rows(page).first().locator(".platform-incident-closure__field-groups")).toContainText("Accepted");
 });
 test('PICL-041 Handoff decision template includes accepted_with_watchlist',async({page})=>{
  await openClosure(page);await expect(rows(page).first().locator(".platform-incident-closure__field-groups")).toContainText("Accepted with watchlist");
 });
 test('PICL-042 Handoff decision template includes blocked',async({page})=>{
  await openClosure(page);await expect(rows(page).first().locator(".platform-incident-closure__field-groups")).toContainText("Blocked");
 });
 test('PICL-043 Handoff decision template includes rolled_back',async({page})=>{
  await openClosure(page);await expect(rows(page).first().locator(".platform-incident-closure__field-groups")).toContainText("Rolled back");
 });
 test('PICL-044 Handoff decision template includes not_reviewed',async({page})=>{
  await openClosure(page);await expect(rows(page).first().locator(".platform-incident-closure__field-groups")).toContainText("Not reviewed");
 });
 test('PICL-045 Three closure requirements preserved for service_health',async({page})=>{
  await openClosure(page);const list=rows(page).nth(0).locator(".platform-incident-closure__evidence-box li");await expect(list).toHaveCount(3);await expect(list).toHaveText(CLOSURE_REQUIREMENTS["service_health"]);
 });
 test('PICL-046 Three closure requirements preserved for customer_feedback',async({page})=>{
  await openClosure(page);const list=rows(page).nth(1).locator(".platform-incident-closure__evidence-box li");await expect(list).toHaveCount(3);await expect(list).toHaveText(CLOSURE_REQUIREMENTS["customer_feedback"]);
 });
 test('PICL-047 Three closure requirements preserved for support_intake',async({page})=>{
  await openClosure(page);const list=rows(page).nth(2).locator(".platform-incident-closure__evidence-box li");await expect(list).toHaveCount(3);await expect(list).toHaveText(CLOSURE_REQUIREMENTS["support_intake"]);
 });
 test('PICL-048 Three closure requirements preserved for billing_confirmation',async({page})=>{
  await openClosure(page);const list=rows(page).nth(3).locator(".platform-incident-closure__evidence-box li");await expect(list).toHaveCount(3);await expect(list).toHaveText(CLOSURE_REQUIREMENTS["billing_confirmation"]);
 });
 test('PICL-049 Three closure requirements preserved for incident_review',async({page})=>{
  await openClosure(page);const list=rows(page).nth(4).locator(".platform-incident-closure__evidence-box li");await expect(list).toHaveCount(3);await expect(list).toHaveText(CLOSURE_REQUIREMENTS["incident_review"]);
 });
 test('PICL-050 Three closure requirements preserved for rollback_readiness',async({page})=>{
  await openClosure(page);const list=rows(page).nth(5).locator(".platform-incident-closure__evidence-box li");await expect(list).toHaveCount(3);await expect(list).toHaveText(CLOSURE_REQUIREMENTS["rollback_readiness"]);
 });
 test('PICL-051 Three closure requirements preserved for adoption_signal',async({page})=>{
  await openClosure(page);const list=rows(page).nth(6).locator(".platform-incident-closure__evidence-box li");await expect(list).toHaveCount(3);await expect(list).toHaveText(CLOSURE_REQUIREMENTS["adoption_signal"]);
 });
 test('PICL-052 Three closure requirements preserved for handoff_closure',async({page})=>{
  await openClosure(page);const list=rows(page).nth(7).locator(".platform-incident-closure__evidence-box li");await expect(list).toHaveCount(3);await expect(list).toHaveText(CLOSURE_REQUIREMENTS["handoff_closure"]);
 });
 test('PICL-053 Initial API outage renders a retry without falsely claiming closure',async({page})=>{
  await openClosure(page,{status:503});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PICL-054 Retry recovers eight prepared closure rows after transient failure',async({page})=>{
  let down=true;await openClosure(page,{respond:(m,p)=>m==="GET"&&p===CLOSURE_PATH&&down?{json:{message:"Synthetic temporary outage"},status:503}:undefined});await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();down=false;await root(page).getByRole("button",{name:"Retry",exact:true}).click();await expect(rows(page)).toHaveCount(8);
 });
 test('PICL-055 Refresh request performs no incident closure writes',async({page})=>{
  const writes:string[]=[];await openClosure(page,{onCall:(m,p)=>{if(!["GET","OPTIONS"].includes(m))writes.push(`${m} ${p}`);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();expect(writes).toEqual([]);
 });
 test('PICL-056 Eight source observation lineage entries remain visible',async({page})=>{
  await openClosure(page);await expect(rows(page).locator(".platform-incident-closure__source-summary div:nth-child(1) strong")).toHaveCount(8);
 });
 test('PICL-057 Eight source triage lineage entries remain visible',async({page})=>{
  await openClosure(page);await expect(rows(page).locator(".platform-incident-closure__source-summary div:nth-child(2) strong")).toHaveCount(8);
 });
 test('PICL-058 Source closure prerequisites remain visible in every template',async({page})=>{
  await openClosure(page);for(const row of await rows(page).all()){await expect(row.locator(".platform-incident-closure__source-summary")).toContainText("Source prerequisite");}
 });
 test('PICL-059 No in-application incident closure edit controls exist',async({page})=>{
  await openClosure(page);await expect(rows(page).locator("input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
 test('PICL-060 Each row retains ten required external closure field labels',async({page})=>{
  await openClosure(page);for(const row of await rows(page).all()){await expect(row.locator(".platform-incident-closure__field-groups")).toContainText("Required external closure fields");for(const field of CLOSURE_FIELDS){await expect(row.locator(".platform-incident-closure__field-groups")).toContainText(field.replaceAll("_"," ").replace(/^./,c=>c.toUpperCase()));}}
 });
 test('PICL-061 All templates include a manual external confirmation prerequisite',async({page})=>{
  await openClosure(page);for(const row of await rows(page).all()){await expect(row.locator(".platform-incident-closure__precondition-box")).toContainText("Resolve");}
 });
 test('PICL-062 The closure board displays no stored incident closure outcomes',async({page})=>{
  await openClosure(page);await expect(root(page).getByLabel("Incident closure summary")).toContainText("Closure records stored here");await expect(context(page).locator(".platform-incident-closure__persistence-grid")).toContainText("External records not observable");
 });
 test('PICL-063 Missing triage persistence evidence is not inferred',async({page})=>{
  await openClosure(page,{alter:s=>({...s,incident_triage_persistence:null})});await expect(context(page).locator(".platform-incident-closure__persistence-grid")).toContainText("Not reported");
 });
 test('PICL-064 Empty closure templates do not imply no real incidents',async({page})=>{
  await openClosure(page,{alter:s=>({...s,closure_rows:[],summary:{...s.summary,closure_rows_total:0}})});await expect(root(page).locator(".platform-incident-closure__empty-state")).toContainText("not evidence");await expect(rows(page)).toHaveCount(0);
 });
 test('PICL-065 Default handoff choices are presentation only',async({page})=>{
  await openClosure(page);for(const row of await rows(page).all()){await expect(row.locator(".platform-incident-closure__source-summary")).toContainText("Template default only");}
 });
 test('PICL-066 All eight closure row identifiers survive page refresh',async({page})=>{
  await openClosure(page);const before=await rows(page).locator(".platform-incident-closure__row-heading h3").allTextContents();await root(page).getByRole("button",{name:"Refresh",exact:true}).click();expect(await rows(page).locator(".platform-incident-closure__row-heading h3").allTextContents()).toEqual(before);
 });
 test('PICL-067 403 endpoint refusal shows error without forged closure evidence',async({page})=>{
  await openClosure(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PICL-068 500 endpoint error keeps retry available',async({page})=>{
  await openClosure(page,{status:500});await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PICL-069 Unsupported query failure does not claim external approval',async({page})=>{
  await openClosure(page,{urlQuery:"unexpected=1",respond:(m,p,q)=>m==="GET"&&p===CLOSURE_PATH&&q.has("unexpected")?{json:{message:"Unexpected query"},status:400}:undefined});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PICL-070 Reload does not perform incident closure mutations',async({page})=>{
  const writes:string[]=[];await openClosure(page,{onCall:(m,p)=>{if(!["GET","OPTIONS"].includes(m))writes.push(`${m} ${p}`);}});await page.reload();expect(writes).toEqual([]);
 });
});
