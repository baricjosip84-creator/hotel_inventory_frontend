/** Batch 128 — Step 228 source-backed browser prep only. Mocked UI does not authorize growth. */
import {test,expect,type Page} from '@playwright/test';
import {openGrowth,GROWTH_PATH,GROWTH_PERMISSIONS,GROWTH_REQUIREMENTS,GROWTH_RULES,GROWTH_LIMITATIONS} from '../../../support/platformCommercialLaunchAdditionalGrowthAuthorizationFixture';
const root=(p:Page)=>p.locator('.platform-additional-growth-authorization');
const rows=(p:Page)=>root(p).locator('.platform-additional-growth-authorization__row-card');
const context=(p:Page)=>root(p).locator('.platform-additional-growth-authorization__context-panel');
test.describe('Commercial Launch Additional Growth Authorization — Step 228 read-only preparation',()=>{
 test('PCAGA-001 Canonical Additional Growth Authorization heading',async({page})=>{
  await openGrowth(page);await expect(page.getByRole("heading",{name:"Commercial Launch Additional Growth Authorization",exact:true})).toBeVisible();
 });
 test('PCAGA-002 Step 228 and preparation-only labels remain explicit',async({page})=>{
  await openGrowth(page);await expect(root(page)).toContainText("Step 228 — Commercial Launch Additional Growth Authorization Board");await expect(root(page)).toContainText("Authorization preparation only");
 });
 test('PCAGA-003 External authorization boundary disclaims automatic expansion',async({page})=>{
  await openGrowth(page);await expect(root(page).locator(".platform-additional-growth-authorization__boundary-notice")).toContainText("external system of record");
 });
 test('PCAGA-004 Five supporting page shortcuts are visible',async({page})=>{
  await openGrowth(page);await expect(root(page).locator(".platform-additional-growth-authorization__supporting-pages a")).toHaveCount(5);
 });
 test('PCAGA-005 Four summary counters represent templates rather than approval',async({page})=>{
  await openGrowth(page);await expect(root(page).getByLabel("Additional growth authorization summary").locator(".io-workspace-stat")).toHaveCount(4);
 });
 test('PCAGA-006 Eight source-defined authorization rows render',async({page})=>{
  await openGrowth(page);await expect(rows(page)).toHaveCount(8);
 });
 test('PCAGA-007 Blocked upstream observation uses danger badge',async({page})=>{
  await openGrowth(page,{kind:"blocked"});await expect(rows(page).first().locator(".platform-additional-growth-authorization__row-heading [data-tone]")).toHaveAttribute("data-tone","danger");
 });
 test('PCAGA-008 Waiting manual authorization uses warning badge',async({page})=>{
  await openGrowth(page,{kind:"waiting"});await expect(rows(page).first().locator(".platform-additional-growth-authorization__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PCAGA-009 Blocked rows are counted while authorization count remains zero',async({page})=>{
  await openGrowth(page);await expect(root(page).getByLabel("Additional growth authorization summary")).toContainText("Blocked rows");await expect(root(page).getByLabel("Additional growth authorization summary")).toContainText("Authorization records stored here");
 });
 test('PCAGA-010 Nine upstream source postures and links remain available',async({page})=>{
  await openGrowth(page);await expect(context(page).locator(".platform-additional-growth-authorization__source-grid a")).toHaveCount(9);
 });
 test('PCAGA-011 Unobservable authorization records are visibly labelled',async({page})=>{
  await openGrowth(page);await expect(context(page).locator(".platform-additional-growth-authorization__persistence-grid")).toContainText("External records not observable");
 });
 test('PCAGA-012 External field requirements remain uneditable',async({page})=>{
  await openGrowth(page);await expect(rows(page).locator("input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
 test('PCAGA-013 No authorization rows is not permission to expand',async({page})=>{
  await openGrowth(page,{alter:s=>({...s,authorization_rows:[],summary:{...s.summary,authorization_rows_total:0}})});await expect(root(page).locator(".platform-additional-growth-authorization__empty-state")).toContainText("not evidence");
 });
 test('PCAGA-014 Missing required tenant read permission redirects away from the board',async({page})=>{
  await openGrowth(page,{permissions:GROWTH_PERMISSIONS.filter(p=>p!=="platform.tenants.read"),expectHeading:false});await expect(page).toHaveURL(/\/platform\/dashboard(?:\?.*)?$/);await expect(rows(page)).toHaveCount(0);
 });
 test('PCAGA-015 Unrelated jobs-read permission does not gate the primary board',async({page})=>{
  await openGrowth(page);await expect(rows(page)).toHaveCount(8);await expect(root(page).getByRole("link",{name:"Operational jobs"})).toHaveCount(0);
 });
 test('PCAGA-016 tenant_scope source requirement preserves owner',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(0)).toContainText("Tenant scope");await expect(rows(page).nth(0)).toContainText("Product owner");
 });
 test('PCAGA-017 health_evidence source requirement preserves owner',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(1)).toContainText("Health evidence");await expect(rows(page).nth(1)).toContainText("Platform operations owner");
 });
 test('PCAGA-018 support_capacity source requirement preserves owner',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(2)).toContainText("Support capacity");await expect(rows(page).nth(2)).toContainText("Support lead");
 });
 test('PCAGA-019 customer_success source requirement preserves owner',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(3)).toContainText("Customer success");await expect(rows(page).nth(3)).toContainText("Customer success lead");
 });
 test('PCAGA-020 billing_entitlements source requirement preserves owner',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(4)).toContainText("Billing entitlements");await expect(rows(page).nth(4)).toContainText("Billing owner");
 });
 test('PCAGA-021 incident_risk source requirement preserves owner',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(5)).toContainText("Incident risk");await expect(rows(page).nth(5)).toContainText("Incident manager");
 });
 test('PCAGA-022 rollback_monitoring source requirement preserves owner',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(6)).toContainText("Rollback monitoring");await expect(rows(page).nth(6)).toContainText("Platform operations owner");
 });
 test('PCAGA-023 executive_approval source requirement preserves owner',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(7)).toContainText("Executive approval");await expect(rows(page).nth(7)).toContainText("Executive sponsor");
 });
 test('PCAGA-024 tenant_scope retains four authorization controls',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(0).locator(".platform-additional-growth-authorization__field-groups li")).toHaveText(GROWTH_REQUIREMENTS[0].controls);
 });
 test('PCAGA-025 health_evidence retains four authorization controls',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(1).locator(".platform-additional-growth-authorization__field-groups li")).toHaveText(GROWTH_REQUIREMENTS[1].controls);
 });
 test('PCAGA-026 support_capacity retains four authorization controls',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(2).locator(".platform-additional-growth-authorization__field-groups li")).toHaveText(GROWTH_REQUIREMENTS[2].controls);
 });
 test('PCAGA-027 customer_success retains four authorization controls',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(3).locator(".platform-additional-growth-authorization__field-groups li")).toHaveText(GROWTH_REQUIREMENTS[3].controls);
 });
 test('PCAGA-028 billing_entitlements retains four authorization controls',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(4).locator(".platform-additional-growth-authorization__field-groups li")).toHaveText(GROWTH_REQUIREMENTS[4].controls);
 });
 test('PCAGA-029 incident_risk retains four authorization controls',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(5).locator(".platform-additional-growth-authorization__field-groups li")).toHaveText(GROWTH_REQUIREMENTS[5].controls);
 });
 test('PCAGA-030 rollback_monitoring retains four authorization controls',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(6).locator(".platform-additional-growth-authorization__field-groups li")).toHaveText(GROWTH_REQUIREMENTS[6].controls);
 });
 test('PCAGA-031 executive_approval retains four authorization controls',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(7).locator(".platform-additional-growth-authorization__field-groups li")).toHaveText(GROWTH_REQUIREMENTS[7].controls);
 });
 test('PCAGA-032 tenant_scope retains required external fields',async({page})=>{
  await openGrowth(page);for(const field of GROWTH_REQUIREMENTS[0].fields)await expect(rows(page).nth(0).locator(".platform-additional-growth-authorization__field-groups")).toContainText(field.replaceAll("_"," ").replace(/^./,c=>c.toUpperCase()));
 });
 test('PCAGA-033 health_evidence retains required external fields',async({page})=>{
  await openGrowth(page);for(const field of GROWTH_REQUIREMENTS[1].fields)await expect(rows(page).nth(1).locator(".platform-additional-growth-authorization__field-groups")).toContainText(field.replaceAll("_"," ").replace(/^./,c=>c.toUpperCase()));
 });
 test('PCAGA-034 support_capacity retains required external fields',async({page})=>{
  await openGrowth(page);for(const field of GROWTH_REQUIREMENTS[2].fields)await expect(rows(page).nth(2).locator(".platform-additional-growth-authorization__field-groups")).toContainText(field.replaceAll("_"," ").replace(/^./,c=>c.toUpperCase()));
 });
 test('PCAGA-035 customer_success retains required external fields',async({page})=>{
  await openGrowth(page);for(const field of GROWTH_REQUIREMENTS[3].fields)await expect(rows(page).nth(3).locator(".platform-additional-growth-authorization__field-groups")).toContainText(field.replaceAll("_"," ").replace(/^./,c=>c.toUpperCase()));
 });
 test('PCAGA-036 billing_entitlements retains required external fields',async({page})=>{
  await openGrowth(page);for(const field of GROWTH_REQUIREMENTS[4].fields)await expect(rows(page).nth(4).locator(".platform-additional-growth-authorization__field-groups")).toContainText(field.replaceAll("_"," ").replace(/^./,c=>c.toUpperCase()));
 });
 test('PCAGA-037 incident_risk retains required external fields',async({page})=>{
  await openGrowth(page);for(const field of GROWTH_REQUIREMENTS[5].fields)await expect(rows(page).nth(5).locator(".platform-additional-growth-authorization__field-groups")).toContainText(field.replaceAll("_"," ").replace(/^./,c=>c.toUpperCase()));
 });
 test('PCAGA-038 rollback_monitoring retains required external fields',async({page})=>{
  await openGrowth(page);for(const field of GROWTH_REQUIREMENTS[6].fields)await expect(rows(page).nth(6).locator(".platform-additional-growth-authorization__field-groups")).toContainText(field.replaceAll("_"," ").replace(/^./,c=>c.toUpperCase()));
 });
 test('PCAGA-039 executive_approval retains required external fields',async({page})=>{
  await openGrowth(page);for(const field of GROWTH_REQUIREMENTS[7].fields)await expect(rows(page).nth(7).locator(".platform-additional-growth-authorization__field-groups")).toContainText(field.replaceAll("_"," ").replace(/^./,c=>c.toUpperCase()));
 });
 test('PCAGA-040 tenant_scope evidence link goes to real router path',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(0).getByRole("link",{name:"Tenant lifecycle",exact:true})).toHaveAttribute("href","/platform/tenant-lifecycle");
 });
 test('PCAGA-041 health_evidence evidence link goes to real router path',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(1).getByRole("link",{name:"Monitoring readiness",exact:true})).toHaveAttribute("href","/platform/production-monitoring-readiness");
 });
 test('PCAGA-042 support_capacity evidence link goes to real router path',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(2).getByRole("link",{name:"Tenant SLA",exact:true})).toHaveAttribute("href","/platform/tenant-sla");
 });
 test('PCAGA-043 customer_success evidence link goes to real router path',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(3).getByRole("link",{name:"Customer success",exact:true})).toHaveAttribute("href","/platform/customer-success-admin");
 });
 test('PCAGA-044 billing_entitlements evidence link goes to real router path',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(4).getByRole("link",{name:"Billing activation",exact:true})).toHaveAttribute("href","/platform/billing-subscription-activation");
 });
 test('PCAGA-045 incident_risk evidence link goes to real router path',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(5).getByRole("link",{name:"Incidents",exact:true})).toHaveAttribute("href","/platform/incidents");
 });
 test('PCAGA-046 rollback_monitoring evidence link goes to real router path',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(6).getByRole("link",{name:"Runbooks",exact:true})).toHaveAttribute("href","/platform/runbooks");
 });
 test('PCAGA-047 executive_approval evidence link goes to real router path',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(7).getByRole("link",{name:"Launch certificate",exact:true})).toHaveAttribute("href","/platform/commercial-launch-certificate");
 });
 test('PCAGA-048 All three backend authorization rules are represented',async({page})=>{
  await openGrowth(page);const list=root(page).locator(".platform-additional-growth-authorization__rules-grid ul").first().locator("li");await expect(list).toHaveText(GROWTH_RULES);
 });
 test('PCAGA-049 All four backend limitations are represented',async({page})=>{
  await openGrowth(page);const list=root(page).locator(".platform-additional-growth-authorization__rules-grid ul").last().locator("li");await expect(list).toHaveText(GROWTH_LIMITATIONS);
 });
 test('PCAGA-050 Source observation row lineage survives to all domains',async({page})=>{
  await openGrowth(page);for(const row of await rows(page).all())await expect(row.locator(".platform-additional-growth-authorization__source-rows .platform-additional-growth-authorization__chips span")).toHaveCount(8);
 });
 test('PCAGA-051 Refresh only requests reads and does not approve growth',async({page})=>{
  const writes:string[]=[];await openGrowth(page,{onCall:(m,p)=>{if(!["GET","OPTIONS"].includes(m))writes.push(`${m} ${p}`);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(8);expect(writes).toEqual([]);
 });
 test('PCAGA-052 403 authorization error leaves no approval rows',async({page})=>{
  await openGrowth(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PCAGA-053 500 server failure presents retry without rows',async({page})=>{
  await openGrowth(page,{status:500});await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PCAGA-054 Invalid query is rejected without authorizing growth',async({page})=>{
  await openGrowth(page,{urlQuery:"unexpected=1"});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PCAGA-055 Retry restores preparation rows after transient outage',async({page})=>{
  let outage=true;await openGrowth(page,{respond:(m,p)=>m==="GET"&&p===GROWTH_PATH&&outage?{json:{message:"Synthetic outage"},status:503}:undefined});await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();outage=false;await root(page).getByRole("button",{name:"Retry",exact:true}).click();await expect(rows(page)).toHaveCount(8);
 });
 test('PCAGA-056 customer_success retains source-defined external fields',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(3).locator(".platform-additional-growth-authorization__field-groups .platform-additional-growth-authorization__chips").first().locator("span")).toHaveCount(GROWTH_REQUIREMENTS[3].fields.length);
 });
 test('PCAGA-057 billing_entitlements retains source-defined external fields',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(4).locator(".platform-additional-growth-authorization__field-groups .platform-additional-growth-authorization__chips").first().locator("span")).toHaveCount(GROWTH_REQUIREMENTS[4].fields.length);
 });
 test('PCAGA-058 incident_risk retains source-defined external fields',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(5).locator(".platform-additional-growth-authorization__field-groups .platform-additional-growth-authorization__chips").first().locator("span")).toHaveCount(GROWTH_REQUIREMENTS[5].fields.length);
 });
 test('PCAGA-059 rollback_monitoring retains source-defined external fields',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(6).locator(".platform-additional-growth-authorization__field-groups .platform-additional-growth-authorization__chips").first().locator("span")).toHaveCount(GROWTH_REQUIREMENTS[6].fields.length);
 });
 test('PCAGA-060 executive_approval retains source-defined external fields',async({page})=>{
  await openGrowth(page);await expect(rows(page).nth(7).locator(".platform-additional-growth-authorization__field-groups .platform-additional-growth-authorization__chips").first().locator("span")).toHaveCount(GROWTH_REQUIREMENTS[7].fields.length);
 });
 test('PCAGA-061 Manual authorization rules remain visible',async({page})=>{
  await openGrowth(page);await expect(root(page).locator(".platform-additional-growth-authorization__rules-grid")).toContainText("manual");
 });
 test('PCAGA-062 External authorization decisions cannot be edited here',async({page})=>{
  await openGrowth(page);await expect(rows(page).locator("input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
 test('PCAGA-063 External authorization persistence is not observable',async({page})=>{
  await openGrowth(page);await expect(context(page).locator(".platform-additional-growth-authorization__persistence-grid")).toContainText("External records not observable");
 });
 test('PCAGA-064 Zero authorization records is a documented boundary',async({page})=>{
  await openGrowth(page);await expect(root(page).getByLabel("Additional growth authorization summary")).toContainText("Authorization records stored here");await expect(root(page).locator(".platform-additional-growth-authorization__boundary-notice")).toContainText("external");
 });
 test('PCAGA-065 Null upstream observation persistence remains unknown',async({page})=>{
  await openGrowth(page,{alter:s=>({...s,expansion_health_observation_persistence:null})});await expect(context(page).locator(".platform-additional-growth-authorization__persistence-grid")).toContainText("Not reported");
 });
 test('PCAGA-066 Empty authorization response never certifies expansion',async({page})=>{
  await openGrowth(page,{alter:s=>({...s,authorization_rows:[],summary:{...s.summary,authorization_rows_total:0}})});await expect(root(page).locator(".platform-additional-growth-authorization__empty-state")).toContainText("not evidence");await expect(rows(page)).toHaveCount(0);
 });
 test('PCAGA-067 Forbidden API response displays no authorization records',async({page})=>{
  await openGrowth(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PCAGA-068 Server outage displays retry without authorization',async({page})=>{
  await openGrowth(page,{status:500});await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PCAGA-069 Unexpected query parameters do not authorize growth',async({page})=>{
  await openGrowth(page,{urlQuery:"forbidden=1"});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PCAGA-070 Refresh retrieves authorization guidance without writes',async({page})=>{
  const writes:string[]=[];await openGrowth(page,{onCall:(m,p)=>{if(!["GET","OPTIONS"].includes(m))writes.push(`${m} ${p}`);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(8);expect(writes).toEqual([]);
 });
});
