/** Batch 125 — Step 225 source-grounded browser presentation only. No prevention or rollout acceptance inferred. */
import {test,expect,type Page} from '@playwright/test';
import {openPrevention,PREVENTION_PATH,PREVENTION_PERMISSIONS,PREVENTION_FIELDS,PREVENTION_CHOICES,PREVENTION_REQUIREMENTS,PREVENTION_EVIDENCE_LINKS} from '../../../support/platformCommercialLaunchPreventionVerificationFixture';
const root=(p:Page)=>p.locator('.platform-prevention-verification');
const rows=(p:Page)=>root(p).locator('.platform-prevention-verification__row-card');
const context=(p:Page)=>root(p).locator('.platform-prevention-verification__context-panel');
test.describe('Commercial Launch Prevention Verification — Step 225 read-only evidence',()=>{
 test('PCPV-001 Prevention Verification route renders canonical heading',async({page})=>{
  await openPrevention(page);await expect(page.getByRole("heading",{name:"Commercial Launch Prevention Verification",exact:true})).toBeVisible();
 });
 test('PCPV-002 Step 225 hero makes preparation-only scope visible',async({page})=>{
  await openPrevention(page);await expect(root(page)).toContainText("Step 225 — Commercial Launch Prevention Verification Board");await expect(root(page)).toContainText("Prevention preparation only");
 });
 test('PCPV-003 External Incident Closure boundary is not represented as persisted approval',async({page})=>{
  await openPrevention(page);await expect(root(page).locator(".platform-prevention-verification__boundary-notice")).toContainText("independently confirm");
 });
 test('PCPV-004 Four source-defined supporting platform links are visible',async({page})=>{
  await openPrevention(page);await expect(root(page).locator(".platform-prevention-verification__supporting-pages .platform-prevention-verification__link-row a")).toHaveCount(4);
 });
 test('PCPV-005 Ten source-defined prevention summary counters render',async({page})=>{
  await openPrevention(page);await expect(root(page).getByLabel("Prevention verification summary").locator(".io-workspace-stat")).toHaveCount(10);
 });
 test('PCPV-006 Eight domain prevention templates render',async({page})=>{
  await openPrevention(page);await expect(rows(page)).toHaveCount(8);
 });
 test('PCPV-007 blocked closure posture maps to source-defined prevention badge',async({page})=>{
  await openPrevention(page,{kind:"blocked"});await expect(rows(page).first().locator(".platform-prevention-verification__row-heading [data-tone]")).toHaveAttribute("data-tone","danger");
 });
 test('PCPV-008 review closure posture maps to source-defined prevention badge',async({page})=>{
  await openPrevention(page,{kind:"review"});await expect(rows(page).first().locator(".platform-prevention-verification__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PCPV-009 go closure posture maps to source-defined prevention badge',async({page})=>{
  await openPrevention(page,{kind:"go"});await expect(rows(page).first().locator(".platform-prevention-verification__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PCPV-010 smoke closure posture maps to source-defined prevention badge',async({page})=>{
  await openPrevention(page,{kind:"smoke"});await expect(rows(page).first().locator(".platform-prevention-verification__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PCPV-011 window closure posture maps to source-defined prevention badge',async({page})=>{
  await openPrevention(page,{kind:"window"});await expect(rows(page).first().locator(".platform-prevention-verification__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PCPV-012 external closure posture maps to source-defined prevention badge',async({page})=>{
  await openPrevention(page,{kind:"external"});await expect(rows(page).first().locator(".platform-prevention-verification__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PCPV-013 manual closure posture maps to source-defined prevention badge',async({page})=>{
  await openPrevention(page,{kind:"manual"});await expect(rows(page).first().locator(".platform-prevention-verification__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PCPV-014 manualClosure closure posture maps to source-defined prevention badge',async({page})=>{
  await openPrevention(page,{kind:"manualClosure"});await expect(rows(page).first().locator(".platform-prevention-verification__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PCPV-015 Owner and domain for service_health are retained',async({page})=>{
  await openPrevention(page);await expect(rows(page).nth(0)).toContainText("Platform operations owner");await expect(rows(page).nth(0)).toContainText("Service health");
 });
 test('PCPV-016 Owner and domain for customer_feedback are retained',async({page})=>{
  await openPrevention(page);await expect(rows(page).nth(1)).toContainText("Customer success owner");await expect(rows(page).nth(1)).toContainText("Customer feedback");
 });
 test('PCPV-017 Owner and domain for support_intake are retained',async({page})=>{
  await openPrevention(page);await expect(rows(page).nth(2)).toContainText("Support owner");await expect(rows(page).nth(2)).toContainText("Support intake");
 });
 test('PCPV-018 Owner and domain for billing_confirmation are retained',async({page})=>{
  await openPrevention(page);await expect(rows(page).nth(3)).toContainText("Billing owner");await expect(rows(page).nth(3)).toContainText("Billing confirmation");
 });
 test('PCPV-019 Owner and domain for incident_review are retained',async({page})=>{
  await openPrevention(page);await expect(rows(page).nth(4)).toContainText("Platform reliability owner");await expect(rows(page).nth(4)).toContainText("Incident review");
 });
 test('PCPV-020 Owner and domain for rollback_readiness are retained',async({page})=>{
  await openPrevention(page);await expect(rows(page).nth(5)).toContainText("Release owner");await expect(rows(page).nth(5)).toContainText("Rollback readiness");
 });
 test('PCPV-021 Owner and domain for adoption_signal are retained',async({page})=>{
  await openPrevention(page);await expect(rows(page).nth(6)).toContainText("Product owner");await expect(rows(page).nth(6)).toContainText("Adoption signal");
 });
 test('PCPV-022 Owner and domain for handoff_closure are retained',async({page})=>{
  await openPrevention(page);await expect(rows(page).nth(7)).toContainText("Release owner");await expect(rows(page).nth(7)).toContainText("Handoff closure");
 });
 test('PCPV-023 service_health evidence destination follows source router',async({page})=>{
  await openPrevention(page);await expect(rows(page).nth(0).getByRole("link",{name:"System health",exact:true})).toHaveAttribute("href","/platform/system-health");
 });
 test('PCPV-024 customer_feedback evidence destination follows source router',async({page})=>{
  await openPrevention(page);await expect(rows(page).nth(1).getByRole("link",{name:"Customer success",exact:true})).toHaveAttribute("href","/platform/customer-success-admin");
 });
 test('PCPV-025 support_intake evidence destination follows source router',async({page})=>{
  await openPrevention(page);await expect(rows(page).nth(2).getByRole("link",{name:"Support cockpit",exact:true})).toHaveAttribute("href","/platform/support-cockpit");
 });
 test('PCPV-026 billing_confirmation evidence destination follows source router',async({page})=>{
  await openPrevention(page);await expect(rows(page).nth(3).getByRole("link",{name:"Billing",exact:true})).toHaveAttribute("href","/platform/billing");
 });
 test('PCPV-027 incident_review evidence destination follows source router',async({page})=>{
  await openPrevention(page);await expect(rows(page).nth(4).getByRole("link",{name:"Incidents",exact:true})).toHaveAttribute("href","/platform/incidents");
 });
 test('PCPV-028 rollback_readiness evidence destination follows source router',async({page})=>{
  await openPrevention(page);await expect(rows(page).nth(5).getByRole("link",{name:"Runbooks",exact:true})).toHaveAttribute("href","/platform/runbooks");
 });
 test('PCPV-029 adoption_signal evidence destination follows source router',async({page})=>{
  await openPrevention(page);await expect(rows(page).nth(6).getByRole("link",{name:"Tenant health",exact:true})).toHaveAttribute("href","/platform/tenant-health");
 });
 test('PCPV-030 handoff_closure evidence destination follows source router',async({page})=>{
  await openPrevention(page);await expect(rows(page).nth(7).getByRole("link",{name:"Incident closure",exact:true})).toHaveAttribute("href","/platform/commercial-launch-incident-closure");
 });
 test('PCPV-031 External prevention field source_closure_record_reference is listed',async({page})=>{
  await openPrevention(page);await expect(rows(page).first().locator(".platform-prevention-verification__field-groups")).toContainText("Source closure record reference");
 });
 test('PCPV-032 External prevention field prevention_action_reference is listed',async({page})=>{
  await openPrevention(page);await expect(rows(page).first().locator(".platform-prevention-verification__field-groups")).toContainText("Prevention action reference");
 });
 test('PCPV-033 External prevention field implementation_evidence_link is listed',async({page})=>{
  await openPrevention(page);await expect(rows(page).first().locator(".platform-prevention-verification__field-groups")).toContainText("Implementation evidence link");
 });
 test('PCPV-034 External prevention field effectiveness_review_result is listed',async({page})=>{
  await openPrevention(page);await expect(rows(page).first().locator(".platform-prevention-verification__field-groups")).toContainText("Effectiveness review result");
 });
 test('PCPV-035 External prevention field monitoring_reentry_window is listed',async({page})=>{
  await openPrevention(page);await expect(rows(page).first().locator(".platform-prevention-verification__field-groups")).toContainText("Monitoring reentry window");
 });
 test('PCPV-036 External prevention field recurrence_watch_owner is listed',async({page})=>{
  await openPrevention(page);await expect(rows(page).first().locator(".platform-prevention-verification__field-groups")).toContainText("Recurrence watch owner");
 });
 test('PCPV-037 External prevention field customer_success_acknowledgement is listed',async({page})=>{
  await openPrevention(page);await expect(rows(page).first().locator(".platform-prevention-verification__field-groups")).toContainText("Customer success acknowledgement");
 });
 test('PCPV-038 External prevention field rollout_expansion_decision is listed',async({page})=>{
  await openPrevention(page);await expect(rows(page).first().locator(".platform-prevention-verification__field-groups")).toContainText("Rollout expansion decision");
 });
 test('PCPV-039 External prevention field verification_owner is listed',async({page})=>{
  await openPrevention(page);await expect(rows(page).first().locator(".platform-prevention-verification__field-groups")).toContainText("Verification owner");
 });
 test('PCPV-040 External prevention field reviewed_at is listed',async({page})=>{
  await openPrevention(page);await expect(rows(page).first().locator(".platform-prevention-verification__field-groups")).toContainText("Reviewed at");
 });
 test('PCPV-041 Rollout-expansion decision template includes continue',async({page})=>{
  await openPrevention(page);await expect(rows(page).first().locator(".platform-prevention-verification__field-groups")).toContainText("Continue");
 });
 test('PCPV-042 Rollout-expansion decision template includes continue_with_watchlist',async({page})=>{
  await openPrevention(page);await expect(rows(page).first().locator(".platform-prevention-verification__field-groups")).toContainText("Continue with watchlist");
 });
 test('PCPV-043 Rollout-expansion decision template includes hold',async({page})=>{
  await openPrevention(page);await expect(rows(page).first().locator(".platform-prevention-verification__field-groups")).toContainText("Hold");
 });
 test('PCPV-044 Rollout-expansion decision template includes rollback',async({page})=>{
  await openPrevention(page);await expect(rows(page).first().locator(".platform-prevention-verification__field-groups")).toContainText("Rollback");
 });
 test('PCPV-045 Rollout-expansion decision template includes not_reviewed',async({page})=>{
  await openPrevention(page);await expect(rows(page).first().locator(".platform-prevention-verification__field-groups")).toContainText("Not reviewed");
 });
 test('PCPV-046 Three source prevention rules for service_health are preserved',async({page})=>{
  await openPrevention(page);const list=rows(page).nth(0).locator(".platform-prevention-verification__evidence-box li");await expect(list).toHaveCount(3);await expect(list).toHaveText(PREVENTION_REQUIREMENTS["service_health"]);
 });
 test('PCPV-047 Three source prevention rules for customer_feedback are preserved',async({page})=>{
  await openPrevention(page);const list=rows(page).nth(1).locator(".platform-prevention-verification__evidence-box li");await expect(list).toHaveCount(3);await expect(list).toHaveText(PREVENTION_REQUIREMENTS["customer_feedback"]);
 });
 test('PCPV-048 Three source prevention rules for support_intake are preserved',async({page})=>{
  await openPrevention(page);const list=rows(page).nth(2).locator(".platform-prevention-verification__evidence-box li");await expect(list).toHaveCount(3);await expect(list).toHaveText(PREVENTION_REQUIREMENTS["support_intake"]);
 });
 test('PCPV-049 Three source prevention rules for billing_confirmation are preserved',async({page})=>{
  await openPrevention(page);const list=rows(page).nth(3).locator(".platform-prevention-verification__evidence-box li");await expect(list).toHaveCount(3);await expect(list).toHaveText(PREVENTION_REQUIREMENTS["billing_confirmation"]);
 });
 test('PCPV-050 Three source prevention rules for incident_review are preserved',async({page})=>{
  await openPrevention(page);const list=rows(page).nth(4).locator(".platform-prevention-verification__evidence-box li");await expect(list).toHaveCount(3);await expect(list).toHaveText(PREVENTION_REQUIREMENTS["incident_review"]);
 });
 test('PCPV-051 Three source prevention rules for rollback_readiness are preserved',async({page})=>{
  await openPrevention(page);const list=rows(page).nth(5).locator(".platform-prevention-verification__evidence-box li");await expect(list).toHaveCount(3);await expect(list).toHaveText(PREVENTION_REQUIREMENTS["rollback_readiness"]);
 });
 test('PCPV-052 Three source prevention rules for adoption_signal are preserved',async({page})=>{
  await openPrevention(page);const list=rows(page).nth(6).locator(".platform-prevention-verification__evidence-box li");await expect(list).toHaveCount(3);await expect(list).toHaveText(PREVENTION_REQUIREMENTS["adoption_signal"]);
 });
 test('PCPV-053 Three source prevention rules for handoff_closure are preserved',async({page})=>{
  await openPrevention(page);const list=rows(page).nth(7).locator(".platform-prevention-verification__evidence-box li");await expect(list).toHaveCount(3);await expect(list).toHaveText(PREVENTION_REQUIREMENTS["handoff_closure"]);
 });
 test('PCPV-054 Initial prevention GET failure shows retry without fabricated outcome',async({page})=>{
  await openPrevention(page,{status:503});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PCPV-055 Retry restores prepared prevention templates after transient 503',async({page})=>{
  let outage=true;await openPrevention(page,{respond:(m,p)=>m==="GET"&&p===PREVENTION_PATH&&outage?{json:{message:"Synthetic temporary outage"},status:503}:undefined});await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();outage=false;await root(page).getByRole("button",{name:"Retry",exact:true}).click();await expect(rows(page)).toHaveCount(8);
 });
 test('PCPV-056 Seven upstream boards are linked from prevention context',async({page})=>{
  await openPrevention(page);await expect(context(page).locator(".platform-prevention-verification__source-grid a")).toHaveCount(7);
 });
 test('PCPV-057 Upstream incident closure lineage is visible in every row',async({page})=>{
  await openPrevention(page);for(const row of await rows(page).all()){await expect(row.locator(".platform-prevention-verification__source-summary")).toContainText("Source closure");}
 });
 test('PCPV-058 Upstream incident triage lineage is visible in every row',async({page})=>{
  await openPrevention(page);for(const row of await rows(page).all()){await expect(row.locator(".platform-prevention-verification__source-summary")).toContainText("Source triage");}
 });
 test('PCPV-059 Upstream post-launch observation lineage is visible in every row',async({page})=>{
  await openPrevention(page);for(const row of await rows(page).all()){await expect(row.locator(".platform-prevention-verification__source-summary")).toContainText("Source observation");}
 });
 test('PCPV-060 Each domain preserves the manual external precondition',async({page})=>{
  await openPrevention(page);await expect(rows(page).locator(".platform-prevention-verification__precondition-box")).toHaveCount(8);
 });
 test('PCPV-061 Each row displays source and external prevention artifact sections',async({page})=>{
  await openPrevention(page);for(const row of await rows(page).all()){await expect(row.locator(".platform-prevention-verification__artifact-grid")).toContainText("Source closure artifact");await expect(row.locator(".platform-prevention-verification__artifact-grid")).toContainText("External prevention artifact");}
 });
 test('PCPV-062 No source prevention result can be edited on the board',async({page})=>{
  await openPrevention(page);await expect(rows(page).locator("input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
 test('PCPV-063 Prevention outcome count remains explicitly external',async({page})=>{
  await openPrevention(page);await expect(root(page).getByLabel("Prevention verification summary")).toContainText("Prevention records stored here");await expect(context(page).locator(".platform-prevention-verification__persistence-grid")).toContainText("External records not observable");
 });
 test('PCPV-064 Missing incident closure persistence is shown as not reported',async({page})=>{
  await openPrevention(page,{alter:s=>({...s,incident_closure_persistence:null})});await expect(context(page).locator(".platform-prevention-verification__persistence-grid")).toContainText("Not reported");
 });
 test('PCPV-065 Empty prevention rows cannot be presented as completed prevention',async({page})=>{
  await openPrevention(page,{alter:s=>({...s,prevention_rows:[],summary:{...s.summary,prevention_rows_total:0}})});await expect(root(page).locator(".platform-prevention-verification__empty-state")).toContainText("not evidence");await expect(rows(page)).toHaveCount(0);
 });
 test('PCPV-066 Refreshing preserves eight prevention domain templates',async({page})=>{
  await openPrevention(page);const before=await rows(page).locator(".platform-prevention-verification__row-heading h3").allTextContents();await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(8);expect(await rows(page).locator(".platform-prevention-verification__row-heading h3").allTextContents()).toEqual(before);
 });
 test('PCPV-067 403 prevents fabricated prevention rows',async({page})=>{
  await openPrevention(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PCPV-068 500 offers retry and no fabricated prevention rows',async({page})=>{
  await openPrevention(page,{status:500});await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PCPV-069 Unknown query error does not present prevention outcomes',async({page})=>{
  await openPrevention(page,{urlQuery:"unexpected=1",respond:(m,p,q)=>m==="GET"&&p===PREVENTION_PATH&&q.has("unexpected")?{json:{message:"Unexpected query"},status:400}:undefined});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PCPV-070 Refresh triggers no mutation request',async({page})=>{
  const writes:string[]=[];await openPrevention(page,{onCall:(m,p)=>{if(!["GET","OPTIONS"].includes(m))writes.push(`${m} ${p}`);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(8);expect(writes).toEqual([]);
 });
});
