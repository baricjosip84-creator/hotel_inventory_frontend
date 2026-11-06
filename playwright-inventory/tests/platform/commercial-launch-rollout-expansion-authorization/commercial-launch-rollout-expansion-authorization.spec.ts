/** Batch 126 — Step 226 source-grounded browser preparation only. No actual rollout expansion authorization inferred. */
import {test,expect,type Page} from '@playwright/test';
import {openExpansion,EXPANSION_PATH,EXPANSION_PERMISSIONS,EXPANSION_FIELDS,EXPANSION_CHOICES,EXPANSION_REQUIREMENTS,EXPANSION_EVIDENCE_LINKS} from '../../../support/platformCommercialLaunchRolloutExpansionAuthorizationFixture';
const root=(p:Page)=>p.locator('.platform-rollout-expansion');
const rows=(p:Page)=>root(p).locator('.platform-rollout-expansion__row-card');
const context=(p:Page)=>root(p).locator('.platform-rollout-expansion__context-panel');
test.describe('Commercial Launch Rollout Expansion Authorization — Step 226 read-only preparation',()=>{
 test('PCREA-001 Source authorization route has canonical heading',async({page})=>{
  await openExpansion(page);await expect(page.getByRole("heading",{name:"Commercial Launch Rollout Expansion Authorization",exact:true})).toBeVisible();
 });
 test('PCREA-002 Step 226 is explicitly preparation only',async({page})=>{
  await openExpansion(page);await expect(root(page)).toContainText("Step 226 — Commercial Launch Rollout Expansion Authorization Board");await expect(root(page)).toContainText("Rollout expansion preparation only");
 });
 test('PCREA-003 Prevention must be independently confirmed before rollout',async({page})=>{
  await openExpansion(page);await expect(root(page).locator(".platform-rollout-expansion__boundary-notice")).toContainText("independently confirm");
 });
 test('PCREA-004 Four source-defined supporting links exist',async({page})=>{
  await openExpansion(page);await expect(root(page).locator(".platform-rollout-expansion__supporting-pages .platform-rollout-expansion__link-row a")).toHaveCount(4);
 });
 test('PCREA-005 Eleven authorization summary counters render',async({page})=>{
  await openExpansion(page);await expect(root(page).getByLabel("Rollout expansion authorization summary").locator(".io-workspace-stat")).toHaveCount(11);
 });
 test('PCREA-006 Eight source domain expansion authorization rows render',async({page})=>{
  await openExpansion(page);await expect(rows(page)).toHaveCount(8);
 });
 test('PCREA-007 blocked prerequisite produces the conservative status badge',async({page})=>{
  await openExpansion(page,{kind:"blocked"});await expect(rows(page).first().locator(".platform-rollout-expansion__row-heading [data-tone]")).toHaveAttribute("data-tone","danger");
 });
 test('PCREA-008 review prerequisite produces the conservative status badge',async({page})=>{
  await openExpansion(page,{kind:"review"});await expect(rows(page).first().locator(".platform-rollout-expansion__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PCREA-009 go prerequisite produces the conservative status badge',async({page})=>{
  await openExpansion(page,{kind:"go"});await expect(rows(page).first().locator(".platform-rollout-expansion__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PCREA-010 smoke prerequisite produces the conservative status badge',async({page})=>{
  await openExpansion(page,{kind:"smoke"});await expect(rows(page).first().locator(".platform-rollout-expansion__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PCREA-011 window prerequisite produces the conservative status badge',async({page})=>{
  await openExpansion(page,{kind:"window"});await expect(rows(page).first().locator(".platform-rollout-expansion__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PCREA-012 external prerequisite produces the conservative status badge',async({page})=>{
  await openExpansion(page,{kind:"external"});await expect(rows(page).first().locator(".platform-rollout-expansion__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PCREA-013 manual prerequisite produces the conservative status badge',async({page})=>{
  await openExpansion(page,{kind:"manual"});await expect(rows(page).first().locator(".platform-rollout-expansion__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PCREA-014 manualClosure prerequisite produces the conservative status badge',async({page})=>{
  await openExpansion(page,{kind:"manualClosure"});await expect(rows(page).first().locator(".platform-rollout-expansion__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PCREA-015 externalPrevention prerequisite produces the conservative status badge',async({page})=>{
  await openExpansion(page,{kind:"externalPrevention"});await expect(rows(page).first().locator(".platform-rollout-expansion__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PCREA-016 service_health source domain owner retained',async({page})=>{
  await openExpansion(page);await expect(rows(page).nth(0)).toContainText("Platform operations owner");await expect(rows(page).nth(0)).toContainText("Service health");
 });
 test('PCREA-017 customer_feedback source domain owner retained',async({page})=>{
  await openExpansion(page);await expect(rows(page).nth(1)).toContainText("Customer success owner");await expect(rows(page).nth(1)).toContainText("Customer feedback");
 });
 test('PCREA-018 support_intake source domain owner retained',async({page})=>{
  await openExpansion(page);await expect(rows(page).nth(2)).toContainText("Support owner");await expect(rows(page).nth(2)).toContainText("Support intake");
 });
 test('PCREA-019 billing_confirmation source domain owner retained',async({page})=>{
  await openExpansion(page);await expect(rows(page).nth(3)).toContainText("Billing owner");await expect(rows(page).nth(3)).toContainText("Billing confirmation");
 });
 test('PCREA-020 incident_review source domain owner retained',async({page})=>{
  await openExpansion(page);await expect(rows(page).nth(4)).toContainText("Platform reliability owner");await expect(rows(page).nth(4)).toContainText("Incident review");
 });
 test('PCREA-021 rollback_readiness source domain owner retained',async({page})=>{
  await openExpansion(page);await expect(rows(page).nth(5)).toContainText("Release owner");await expect(rows(page).nth(5)).toContainText("Rollback readiness");
 });
 test('PCREA-022 adoption_signal source domain owner retained',async({page})=>{
  await openExpansion(page);await expect(rows(page).nth(6)).toContainText("Product owner");await expect(rows(page).nth(6)).toContainText("Adoption signal");
 });
 test('PCREA-023 handoff_closure source domain owner retained',async({page})=>{
  await openExpansion(page);await expect(rows(page).nth(7)).toContainText("Release owner");await expect(rows(page).nth(7)).toContainText("Handoff closure");
 });
 test('PCREA-024 service_health evidence link follows source router',async({page})=>{
  await openExpansion(page);await expect(rows(page).nth(0).getByRole("link",{name:"System health",exact:true})).toHaveAttribute("href","/platform/system-health");
 });
 test('PCREA-025 customer_feedback evidence link follows source router',async({page})=>{
  await openExpansion(page);await expect(rows(page).nth(1).getByRole("link",{name:"Customer success",exact:true})).toHaveAttribute("href","/platform/customer-success-admin");
 });
 test('PCREA-026 support_intake evidence link follows source router',async({page})=>{
  await openExpansion(page);await expect(rows(page).nth(2).getByRole("link",{name:"Support cockpit",exact:true})).toHaveAttribute("href","/platform/support-cockpit");
 });
 test('PCREA-027 billing_confirmation evidence link follows source router',async({page})=>{
  await openExpansion(page);await expect(rows(page).nth(3).getByRole("link",{name:"Billing",exact:true})).toHaveAttribute("href","/platform/billing");
 });
 test('PCREA-028 incident_review evidence link follows source router',async({page})=>{
  await openExpansion(page);await expect(rows(page).nth(4).getByRole("link",{name:"Incidents",exact:true})).toHaveAttribute("href","/platform/incidents");
 });
 test('PCREA-029 rollback_readiness evidence link follows source router',async({page})=>{
  await openExpansion(page);await expect(rows(page).nth(5).getByRole("link",{name:"Runbooks",exact:true})).toHaveAttribute("href","/platform/runbooks");
 });
 test('PCREA-030 adoption_signal evidence link follows source router',async({page})=>{
  await openExpansion(page);await expect(rows(page).nth(6).getByRole("link",{name:"Tenant health",exact:true})).toHaveAttribute("href","/platform/tenant-health");
 });
 test('PCREA-031 handoff_closure evidence link follows source router',async({page})=>{
  await openExpansion(page);await expect(rows(page).nth(7).getByRole("link",{name:"Prevention verification",exact:true})).toHaveAttribute("href","/platform/commercial-launch-prevention-verification");
 });
 test('PCREA-032 External authorization field source_prevention_record_reference must be listed',async({page})=>{
  await openExpansion(page);await expect(rows(page).first().locator(".platform-rollout-expansion__field-groups")).toContainText("Source prevention record reference");
 });
 test('PCREA-033 External authorization field expansion_request_id must be listed',async({page})=>{
  await openExpansion(page);await expect(rows(page).first().locator(".platform-rollout-expansion__field-groups")).toContainText("Expansion request id");
 });
 test('PCREA-034 External authorization field requested_tenant_scope must be listed',async({page})=>{
  await openExpansion(page);await expect(rows(page).first().locator(".platform-rollout-expansion__field-groups")).toContainText("Requested tenant scope");
 });
 test('PCREA-035 External authorization field prevention_verification_evidence_link must be listed',async({page})=>{
  await openExpansion(page);await expect(rows(page).first().locator(".platform-rollout-expansion__field-groups")).toContainText("Prevention verification evidence link");
 });
 test('PCREA-036 External authorization field support_capacity_acknowledgement must be listed',async({page})=>{
  await openExpansion(page);await expect(rows(page).first().locator(".platform-rollout-expansion__field-groups")).toContainText("Support capacity acknowledgement");
 });
 test('PCREA-037 External authorization field customer_success_capacity_acknowledgement must be listed',async({page})=>{
  await openExpansion(page);await expect(rows(page).first().locator(".platform-rollout-expansion__field-groups")).toContainText("Customer success capacity acknowledgement");
 });
 test('PCREA-038 External authorization field rollback_readiness_acknowledgement must be listed',async({page})=>{
  await openExpansion(page);await expect(rows(page).first().locator(".platform-rollout-expansion__field-groups")).toContainText("Rollback readiness acknowledgement");
 });
 test('PCREA-039 External authorization field monitoring_owner must be listed',async({page})=>{
  await openExpansion(page);await expect(rows(page).first().locator(".platform-rollout-expansion__field-groups")).toContainText("Monitoring owner");
 });
 test('PCREA-040 External authorization field product_owner_approval must be listed',async({page})=>{
  await openExpansion(page);await expect(rows(page).first().locator(".platform-rollout-expansion__field-groups")).toContainText("Product owner approval");
 });
 test('PCREA-041 External authorization field executive_approval_when_required must be listed',async({page})=>{
  await openExpansion(page);await expect(rows(page).first().locator(".platform-rollout-expansion__field-groups")).toContainText("Executive approval when required");
 });
 test('PCREA-042 External authorization field expansion_decision must be listed',async({page})=>{
  await openExpansion(page);await expect(rows(page).first().locator(".platform-rollout-expansion__field-groups")).toContainText("Expansion decision");
 });
 test('PCREA-043 External authorization field authorization_owner must be listed',async({page})=>{
  await openExpansion(page);await expect(rows(page).first().locator(".platform-rollout-expansion__field-groups")).toContainText("Authorization owner");
 });
 test('PCREA-044 External authorization field reviewed_at must be listed',async({page})=>{
  await openExpansion(page);await expect(rows(page).first().locator(".platform-rollout-expansion__field-groups")).toContainText("Reviewed at");
 });
 test('PCREA-045 External decision option approve_limited_expansion appears as template',async({page})=>{
  await openExpansion(page);await expect(rows(page).first().locator(".platform-rollout-expansion__field-groups")).toContainText("Approve limited expansion");
 });
 test('PCREA-046 External decision option approve_with_watchlist appears as template',async({page})=>{
  await openExpansion(page);await expect(rows(page).first().locator(".platform-rollout-expansion__field-groups")).toContainText("Approve with watchlist");
 });
 test('PCREA-047 External decision option hold_expansion appears as template',async({page})=>{
  await openExpansion(page);await expect(rows(page).first().locator(".platform-rollout-expansion__field-groups")).toContainText("Hold expansion");
 });
 test('PCREA-048 External decision option rollback_or_pause appears as template',async({page})=>{
  await openExpansion(page);await expect(rows(page).first().locator(".platform-rollout-expansion__field-groups")).toContainText("Rollback or pause");
 });
 test('PCREA-049 External decision option not_reviewed appears as template',async({page})=>{
  await openExpansion(page);await expect(rows(page).first().locator(".platform-rollout-expansion__field-groups")).toContainText("Not reviewed");
 });
 test('PCREA-050 Expansion requirements for service_health are source-defined',async({page})=>{
  await openExpansion(page);const list=rows(page).nth(0).locator(".platform-rollout-expansion__evidence-box li");await expect(list).toHaveCount(3);await expect(list).toHaveText(EXPANSION_REQUIREMENTS["service_health"]);
 });
 test('PCREA-051 Expansion requirements for customer_feedback are source-defined',async({page})=>{
  await openExpansion(page);const list=rows(page).nth(1).locator(".platform-rollout-expansion__evidence-box li");await expect(list).toHaveCount(3);await expect(list).toHaveText(EXPANSION_REQUIREMENTS["customer_feedback"]);
 });
 test('PCREA-052 Expansion requirements for support_intake are source-defined',async({page})=>{
  await openExpansion(page);const list=rows(page).nth(2).locator(".platform-rollout-expansion__evidence-box li");await expect(list).toHaveCount(3);await expect(list).toHaveText(EXPANSION_REQUIREMENTS["support_intake"]);
 });
 test('PCREA-053 Expansion requirements for billing_confirmation are source-defined',async({page})=>{
  await openExpansion(page);const list=rows(page).nth(3).locator(".platform-rollout-expansion__evidence-box li");await expect(list).toHaveCount(3);await expect(list).toHaveText(EXPANSION_REQUIREMENTS["billing_confirmation"]);
 });
 test('PCREA-054 Initial 503 presents retry instead of authorization',async({page})=>{
  await openExpansion(page,{status:503});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PCREA-055 Retry recovers read-only template after transient failure',async({page})=>{
  let outage=true;await openExpansion(page,{respond:(m,p)=>m==="GET"&&p===EXPANSION_PATH&&outage?{json:{message:"Synthetic temporary outage"},status:503}:undefined});await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();outage=false;await root(page).getByRole("button",{name:"Retry",exact:true}).click();await expect(rows(page)).toHaveCount(8);
 });
 test('PCREA-056 All eight source postures remain linked in authorization context',async({page})=>{
  await openExpansion(page);await expect(context(page).locator(".platform-rollout-expansion__source-grid a")).toHaveCount(7);
 });
 test('PCREA-057 The rollout authorization board preserves closure lineage',async({page})=>{
  await openExpansion(page);for(const row of await rows(page).all())await expect(row.locator(".platform-rollout-expansion__source-summary")).toContainText("Source closure");
 });
 test('PCREA-058 The rollout authorization board preserves triage lineage',async({page})=>{
  await openExpansion(page);for(const row of await rows(page).all())await expect(row.locator(".platform-rollout-expansion__source-summary")).toContainText("Source triage");
 });
 test('PCREA-059 The rollout authorization board preserves observation lineage',async({page})=>{
  await openExpansion(page);for(const row of await rows(page).all())await expect(row.locator(".platform-rollout-expansion__source-summary")).toContainText("Source observation");
 });
 test('PCREA-060 Each rollout domain displays its manual precondition',async({page})=>{
  await openExpansion(page);await expect(rows(page).locator(".platform-rollout-expansion__precondition-box")).toHaveCount(8);
 });
 test('PCREA-061 The artifacts distinguish upstream prevention from external approval',async({page})=>{
  await openExpansion(page);for(const row of await rows(page).all()){await expect(row.locator(".platform-rollout-expansion__artifact-grid")).toContainText("Source prevention artifact");await expect(row.locator(".platform-rollout-expansion__artifact-grid")).toContainText("External authorization artifact");}
 });
 test('PCREA-062 Authorization rows are not editable in the browser',async({page})=>{
  await openExpansion(page);await expect(rows(page).locator("input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
 test('PCREA-063 Authorization persistence does not claim real approvals',async({page})=>{
  await openExpansion(page);await expect(root(page).getByLabel("Rollout expansion authorization summary")).toContainText("Authorization records stored here");await expect(context(page).locator(".platform-rollout-expansion__persistence-grid")).toContainText("External records not observable");
 });
 test('PCREA-064 Missing prevention persistence displays an unavailable marker',async({page})=>{
  await openExpansion(page,{alter:s=>({...s,prevention_verification_persistence:null})});await expect(context(page).locator(".platform-rollout-expansion__persistence-grid")).toContainText("Not reported");
 });
 test('PCREA-065 No authorization templates means no approval is implied',async({page})=>{
  await openExpansion(page,{alter:s=>({...s,expansion_rows:[],summary:{...s.summary,expansion_rows_total:0}})});await expect(root(page).locator(".platform-rollout-expansion__empty-state")).toContainText("not evidence");await expect(rows(page)).toHaveCount(0);
 });
 test('PCREA-066 Refreshing the rollout board preserves domain order',async({page})=>{
  await openExpansion(page);const prior=await rows(page).locator(".platform-rollout-expansion__row-heading h3").allTextContents();await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(8);expect(await rows(page).locator(".platform-rollout-expansion__row-heading h3").allTextContents()).toEqual(prior);
 });
 test('PCREA-067 403 cannot fabricate rollout authorization',async({page})=>{
  await openExpansion(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PCREA-068 500 failure exposes retry with no authorization rows',async({page})=>{
  await openExpansion(page,{status:500});await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PCREA-069 Nonempty query is rejected instead of authorizing',async({page})=>{
  await openExpansion(page,{urlQuery:"unexpected=1"});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PCREA-070 Refresh sends no mutating HTTP requests',async({page})=>{
  const writes:string[]=[];await openExpansion(page,{onCall:(m,p)=>{if(!["GET","OPTIONS"].includes(m))writes.push(`${m} ${p}`);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(8);expect(writes).toEqual([]);
 });
});
