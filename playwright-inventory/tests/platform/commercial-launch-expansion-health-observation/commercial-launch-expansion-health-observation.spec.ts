/** Batch 127 — Step 227 source-grounded browser preparation only. No live expanded-cohort observation inferred. */
import {test,expect,type Page} from '@playwright/test';
import {openHealth,HEALTH_PATH,HEALTH_PERMISSIONS,HEALTH_FIELDS,HEALTH_CHOICES,HEALTH_REQUIREMENTS,HEALTH_EVIDENCE_LINKS} from '../../../support/platformCommercialLaunchExpansionHealthObservationFixture';
const root=(p:Page)=>p.locator('.platform-expansion-health');
const rows=(p:Page)=>root(p).locator('.platform-expansion-health__row-card');
const context=(p:Page)=>root(p).locator('.platform-expansion-health__context-panel');
test.describe('Commercial Launch Expansion Health Observation — Step 227 read-only preparation',()=>{
 test('PCEHO-001 Canonical health-observation page heading',async({page})=>{
  await openHealth(page);await expect(page.getByRole("heading",{name:"Commercial Launch Expansion Health Observation",exact:true})).toBeVisible();
 });
 test('PCEHO-002 Step 227 and preparation-only labels are explicit',async({page})=>{
  await openHealth(page);await expect(root(page)).toContainText("Step 227 — Commercial Launch Expansion Health Observation Board");await expect(root(page)).toContainText("Expansion-health preparation only");
 });
 test('PCEHO-003 Real rollout authorization is required externally',async({page})=>{
  await openHealth(page);await expect(root(page).locator(".platform-expansion-health__boundary-notice")).toContainText("independently confirm");
 });
 test('PCEHO-004 Four supporting route links are visible',async({page})=>{
  await openHealth(page);await expect(root(page).locator(".platform-expansion-health__supporting-pages .platform-expansion-health__link-row a")).toHaveCount(4);
 });
 test('PCEHO-005 Twelve summary counters are present',async({page})=>{
  await openHealth(page);await expect(root(page).getByLabel("Expansion health observation summary").locator(".io-workspace-stat")).toHaveCount(12);
 });
 test('PCEHO-006 Eight read-only health templates render',async({page})=>{
  await openHealth(page);await expect(rows(page)).toHaveCount(8);
 });
 test('PCEHO-007 blocked prerequisite produces conservative badge',async({page})=>{
  await openHealth(page,{kind:"blocked"});await expect(rows(page).first().locator(".platform-expansion-health__row-heading [data-tone]")).toHaveAttribute("data-tone","danger");
 });
 test('PCEHO-008 review prerequisite produces conservative badge',async({page})=>{
  await openHealth(page,{kind:"review"});await expect(rows(page).first().locator(".platform-expansion-health__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PCEHO-009 go prerequisite produces conservative badge',async({page})=>{
  await openHealth(page,{kind:"go"});await expect(rows(page).first().locator(".platform-expansion-health__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PCEHO-010 smoke prerequisite produces conservative badge',async({page})=>{
  await openHealth(page,{kind:"smoke"});await expect(rows(page).first().locator(".platform-expansion-health__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PCEHO-011 window prerequisite produces conservative badge',async({page})=>{
  await openHealth(page,{kind:"window"});await expect(rows(page).first().locator(".platform-expansion-health__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PCEHO-012 external prerequisite produces conservative badge',async({page})=>{
  await openHealth(page,{kind:"external"});await expect(rows(page).first().locator(".platform-expansion-health__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PCEHO-013 manual prerequisite produces conservative badge',async({page})=>{
  await openHealth(page,{kind:"manual"});await expect(rows(page).first().locator(".platform-expansion-health__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PCEHO-014 manualClosure prerequisite produces conservative badge',async({page})=>{
  await openHealth(page,{kind:"manualClosure"});await expect(rows(page).first().locator(".platform-expansion-health__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PCEHO-015 externalPrevention prerequisite produces conservative badge',async({page})=>{
  await openHealth(page,{kind:"externalPrevention"});await expect(rows(page).first().locator(".platform-expansion-health__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PCEHO-016 externalAuthorization prerequisite produces conservative badge',async({page})=>{
  await openHealth(page,{kind:"externalAuthorization"});await expect(rows(page).first().locator(".platform-expansion-health__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PCEHO-017 service_health retains its upstream owner',async({page})=>{
  await openHealth(page);await expect(rows(page).nth(0)).toContainText("Platform operations owner");await expect(rows(page).nth(0)).toContainText("Service health");
 });
 test('PCEHO-018 customer_feedback retains its upstream owner',async({page})=>{
  await openHealth(page);await expect(rows(page).nth(1)).toContainText("Customer success owner");await expect(rows(page).nth(1)).toContainText("Customer feedback");
 });
 test('PCEHO-019 support_intake retains its upstream owner',async({page})=>{
  await openHealth(page);await expect(rows(page).nth(2)).toContainText("Support owner");await expect(rows(page).nth(2)).toContainText("Support intake");
 });
 test('PCEHO-020 billing_confirmation retains its upstream owner',async({page})=>{
  await openHealth(page);await expect(rows(page).nth(3)).toContainText("Billing owner");await expect(rows(page).nth(3)).toContainText("Billing confirmation");
 });
 test('PCEHO-021 incident_review retains its upstream owner',async({page})=>{
  await openHealth(page);await expect(rows(page).nth(4)).toContainText("Platform reliability owner");await expect(rows(page).nth(4)).toContainText("Incident review");
 });
 test('PCEHO-022 rollback_readiness retains its upstream owner',async({page})=>{
  await openHealth(page);await expect(rows(page).nth(5)).toContainText("Release owner");await expect(rows(page).nth(5)).toContainText("Rollback readiness");
 });
 test('PCEHO-023 adoption_signal retains its upstream owner',async({page})=>{
  await openHealth(page);await expect(rows(page).nth(6)).toContainText("Product owner");await expect(rows(page).nth(6)).toContainText("Adoption signal");
 });
 test('PCEHO-024 handoff_closure retains its upstream owner',async({page})=>{
  await openHealth(page);await expect(rows(page).nth(7)).toContainText("Release owner");await expect(rows(page).nth(7)).toContainText("Handoff closure");
 });
 test('PCEHO-025 service_health source evidence link is routed correctly',async({page})=>{
  await openHealth(page);await expect(rows(page).nth(0).getByRole("link",{name:"System health",exact:true})).toHaveAttribute("href","/platform/system-health");
 });
 test('PCEHO-026 customer_feedback source evidence link is routed correctly',async({page})=>{
  await openHealth(page);await expect(rows(page).nth(1).getByRole("link",{name:"Customer success",exact:true})).toHaveAttribute("href","/platform/customer-success-admin");
 });
 test('PCEHO-027 support_intake source evidence link is routed correctly',async({page})=>{
  await openHealth(page);await expect(rows(page).nth(2).getByRole("link",{name:"Support cockpit",exact:true})).toHaveAttribute("href","/platform/support-cockpit");
 });
 test('PCEHO-028 billing_confirmation source evidence link is routed correctly',async({page})=>{
  await openHealth(page);await expect(rows(page).nth(3).getByRole("link",{name:"Billing",exact:true})).toHaveAttribute("href","/platform/billing");
 });
 test('PCEHO-029 incident_review source evidence link is routed correctly',async({page})=>{
  await openHealth(page);await expect(rows(page).nth(4).getByRole("link",{name:"Incidents",exact:true})).toHaveAttribute("href","/platform/incidents");
 });
 test('PCEHO-030 rollback_readiness source evidence link is routed correctly',async({page})=>{
  await openHealth(page);await expect(rows(page).nth(5).getByRole("link",{name:"Runbooks",exact:true})).toHaveAttribute("href","/platform/runbooks");
 });
 test('PCEHO-031 adoption_signal source evidence link is routed correctly',async({page})=>{
  await openHealth(page);await expect(rows(page).nth(6).getByRole("link",{name:"Tenant health",exact:true})).toHaveAttribute("href","/platform/tenant-health");
 });
 test('PCEHO-032 handoff_closure source evidence link is routed correctly',async({page})=>{
  await openHealth(page);await expect(rows(page).nth(7).getByRole("link",{name:"Additional growth authorization",exact:true})).toHaveAttribute("href","/platform/commercial-launch-additional-growth-authorization");
 });
 test('PCEHO-033 Required external observation field source_rollout_expansion_authorization_record_reference is listed',async({page})=>{
  await openHealth(page);await expect(rows(page).first().locator(".platform-expansion-health__field-groups")).toContainText("Source rollout expansion authorization record reference");
 });
 test('PCEHO-034 Required external observation field expanded_cohort_id is listed',async({page})=>{
  await openHealth(page);await expect(rows(page).first().locator(".platform-expansion-health__field-groups")).toContainText("Expanded cohort id");
 });
 test('PCEHO-035 Required external observation field authorized_scope_evidence_link is listed',async({page})=>{
  await openHealth(page);await expect(rows(page).first().locator(".platform-expansion-health__field-groups")).toContainText("Authorized scope evidence link");
 });
 test('PCEHO-036 Required external observation field tenant_sample_health_evidence_link is listed',async({page})=>{
  await openHealth(page);await expect(rows(page).first().locator(".platform-expansion-health__field-groups")).toContainText("Tenant sample health evidence link");
 });
 test('PCEHO-037 Required external observation field support_volume_review_link is listed',async({page})=>{
  await openHealth(page);await expect(rows(page).first().locator(".platform-expansion-health__field-groups")).toContainText("Support volume review link");
 });
 test('PCEHO-038 Required external observation field customer_success_feedback_link is listed',async({page})=>{
  await openHealth(page);await expect(rows(page).first().locator(".platform-expansion-health__field-groups")).toContainText("Customer success feedback link");
 });
 test('PCEHO-039 Required external observation field billing_entitlement_review_link_when_applicable is listed',async({page})=>{
  await openHealth(page);await expect(rows(page).first().locator(".platform-expansion-health__field-groups")).toContainText("Billing entitlement review link when applicable");
 });
 test('PCEHO-040 Required external observation field incident_review_link is listed',async({page})=>{
  await openHealth(page);await expect(rows(page).first().locator(".platform-expansion-health__field-groups")).toContainText("Incident review link");
 });
 test('PCEHO-041 Required external observation field rollback_readiness_reconfirmation is listed',async({page})=>{
  await openHealth(page);await expect(rows(page).first().locator(".platform-expansion-health__field-groups")).toContainText("Rollback readiness reconfirmation");
 });
 test('PCEHO-042 Required external observation field adoption_signal_review_link is listed',async({page})=>{
  await openHealth(page);await expect(rows(page).first().locator(".platform-expansion-health__field-groups")).toContainText("Adoption signal review link");
 });
 test('PCEHO-043 Required external observation field next_expansion_recommendation is listed',async({page})=>{
  await openHealth(page);await expect(rows(page).first().locator(".platform-expansion-health__field-groups")).toContainText("Next expansion recommendation");
 });
 test('PCEHO-044 Required external observation field observation_owner is listed',async({page})=>{
  await openHealth(page);await expect(rows(page).first().locator(".platform-expansion-health__field-groups")).toContainText("Observation owner");
 });
 test('PCEHO-045 Required external observation field reviewed_at is listed',async({page})=>{
  await openHealth(page);await expect(rows(page).first().locator(".platform-expansion-health__field-groups")).toContainText("Reviewed at");
 });
 test('PCEHO-046 Next-growth recommendation continue_limited_growth is listed',async({page})=>{
  await openHealth(page);await expect(rows(page).first().locator(".platform-expansion-health__field-groups")).toContainText("Continue limited growth");
 });
 test('PCEHO-047 Next-growth recommendation continue_with_watchlist is listed',async({page})=>{
  await openHealth(page);await expect(rows(page).first().locator(".platform-expansion-health__field-groups")).toContainText("Continue with watchlist");
 });
 test('PCEHO-048 Next-growth recommendation hold_growth is listed',async({page})=>{
  await openHealth(page);await expect(rows(page).first().locator(".platform-expansion-health__field-groups")).toContainText("Hold growth");
 });
 test('PCEHO-049 Next-growth recommendation pause_or_rollback is listed',async({page})=>{
  await openHealth(page);await expect(rows(page).first().locator(".platform-expansion-health__field-groups")).toContainText("Pause or rollback");
 });
 test('PCEHO-050 Next-growth recommendation not_reviewed is listed',async({page})=>{
  await openHealth(page);await expect(rows(page).first().locator(".platform-expansion-health__field-groups")).toContainText("Not reviewed");
 });
 test('PCEHO-051 service_health has three source-defined checks',async({page})=>{
  await openHealth(page);const list=rows(page).nth(0).locator(".platform-expansion-health__evidence-box li");await expect(list).toHaveCount(3);await expect(list).toHaveText(HEALTH_REQUIREMENTS["service_health"]);
 });
 test('PCEHO-052 customer_feedback has three source-defined checks',async({page})=>{
  await openHealth(page);const list=rows(page).nth(1).locator(".platform-expansion-health__evidence-box li");await expect(list).toHaveCount(3);await expect(list).toHaveText(HEALTH_REQUIREMENTS["customer_feedback"]);
 });
 test('PCEHO-053 support_intake has three source-defined checks',async({page})=>{
  await openHealth(page);const list=rows(page).nth(2).locator(".platform-expansion-health__evidence-box li");await expect(list).toHaveCount(3);await expect(list).toHaveText(HEALTH_REQUIREMENTS["support_intake"]);
 });
 test('PCEHO-054 503 fails without inventing observation results',async({page})=>{
  await openHealth(page,{status:503});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PCEHO-055 Retry restores read-only templates after outage',async({page})=>{
  let outage=true;await openHealth(page,{respond:(m,p)=>m==="GET"&&p===HEALTH_PATH&&outage?{json:{message:"Synthetic temporary outage"},status:503}:undefined});await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();outage=false;await root(page).getByRole("button",{name:"Retry",exact:true}).click();await expect(rows(page)).toHaveCount(8);
 });
 test('PCEHO-056 billing_confirmation retains three source observation checks',async({page})=>{
  await openHealth(page);await expect(rows(page).nth(3).locator(".platform-expansion-health__evidence-box li")).toHaveText(HEALTH_REQUIREMENTS["billing_confirmation"]);
 });
 test('PCEHO-057 incident_review retains three source observation checks',async({page})=>{
  await openHealth(page);await expect(rows(page).nth(4).locator(".platform-expansion-health__evidence-box li")).toHaveText(HEALTH_REQUIREMENTS["incident_review"]);
 });
 test('PCEHO-058 rollback_readiness retains three source observation checks',async({page})=>{
  await openHealth(page);await expect(rows(page).nth(5).locator(".platform-expansion-health__evidence-box li")).toHaveText(HEALTH_REQUIREMENTS["rollback_readiness"]);
 });
 test('PCEHO-059 adoption_signal retains three source observation checks',async({page})=>{
  await openHealth(page);await expect(rows(page).nth(6).locator(".platform-expansion-health__evidence-box li")).toHaveText(HEALTH_REQUIREMENTS["adoption_signal"]);
 });
 test('PCEHO-060 handoff_closure retains three source observation checks',async({page})=>{
  await openHealth(page);await expect(rows(page).nth(7).locator(".platform-expansion-health__evidence-box li")).toHaveText(HEALTH_REQUIREMENTS["handoff_closure"]);
 });
 test('PCEHO-061 The observation rules remain visibly manual',async({page})=>{
  await openHealth(page);await expect(root(page).locator(".platform-expansion-health__rules-grid")).toContainText("read-only");
 });
 test('PCEHO-062 External observation decisions are not editable',async({page})=>{
  await openHealth(page);await expect(rows(page).locator("input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
 test('PCEHO-063 External expansion observation records remain unobservable',async({page})=>{
  await openHealth(page);await expect(context(page).locator(".platform-expansion-health__persistence-grid")).toContainText("External records not observable");
 });
 test('PCEHO-064 Zero persisted-observation count is explained',async({page})=>{
  await openHealth(page);await expect(root(page).getByLabel("Expansion health observation summary")).toContainText("Observation records stored here");await expect(root(page).locator(".platform-expansion-health__boundary-notice")).toContainText("external");
 });
 test('PCEHO-065 Missing rollout authorization persistence does not imply approval',async({page})=>{
  await openHealth(page,{alter:s=>({...s,rollout_expansion_authorization_persistence:null})});await expect(context(page).locator(".platform-expansion-health__persistence-grid")).toContainText("Not reported");
 });
 test('PCEHO-066 Empty observation response does not certify cohort health',async({page})=>{
  await openHealth(page,{alter:s=>({...s,observation_rows:[],summary:{...s.summary,observation_rows_total:0}})});await expect(root(page).locator(".platform-expansion-health__empty-state")).toContainText("not evidence");await expect(rows(page)).toHaveCount(0);
 });
 test('PCEHO-067 Permission failure cannot display expanded-cohort observations',async({page})=>{
  await openHealth(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PCEHO-068 Server failure cannot display health results',async({page})=>{
  await openHealth(page,{status:500});await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PCEHO-069 Unexpected query parameters fail without health results',async({page})=>{
  await openHealth(page,{urlQuery:"unsupported=1"});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PCEHO-070 Refresh reads observation without issuing writes',async({page})=>{
  const writes:string[]=[];await openHealth(page,{onCall:(m,p)=>{if(!["GET","OPTIONS"].includes(m))writes.push(`${m} ${p}`);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(8);expect(writes).toEqual([]);
 });
});
