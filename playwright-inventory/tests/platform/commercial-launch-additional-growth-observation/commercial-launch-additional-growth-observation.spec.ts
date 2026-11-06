/** Batch 129: Step 229 source-backed read-only browser test authoring. Synthetic evidence never proves real authorization or health. */
import {test,expect,type Page} from '@playwright/test';
import {openObservation,OBS_PATH,OBS_PERMISSIONS,OBS_REQUIREMENTS,OBS_RULES,OBS_LIMITATIONS} from '../../../support/platformCommercialLaunchAdditionalGrowthObservationFixture';
const root=(p:Page)=>p.locator('.platform-additional-growth-observation');
const rows=(p:Page)=>root(p).locator('.platform-additional-growth-observation__row-card');
const context=(p:Page)=>root(p).locator('.platform-additional-growth-observation__context-panel');
test.describe('Commercial Launch Additional Growth Observation — Step 229 read-only board',()=>{
 test('PCAGO-001 Canonical Additional Growth Observation heading',async({page})=>{
  await openObservation(page);await expect(page.getByRole("heading",{name:"Commercial Launch Additional Growth Observation",exact:true})).toBeVisible();
 });
 test('PCAGO-002 Step 229 and preparation-only labels stay explicit',async({page})=>{
  await openObservation(page);await expect(root(page)).toContainText("Step 229 — Commercial Launch Additional Growth Observation Board");await expect(root(page)).toContainText("Observation preparation only");
 });
 test('PCAGO-003 External observation boundary disclaims actual post-growth results',async({page})=>{
  await openObservation(page);await expect(root(page).locator(".platform-additional-growth-observation__boundary-notice")).toContainText("recorded externally");
 });
 test('PCAGO-004 Six supporting pages are visible',async({page})=>{
  await openObservation(page);await expect(root(page).locator(".platform-additional-growth-observation__supporting-pages a")).toHaveCount(6);
 });
 test('PCAGO-005 Four summary counters are read-only',async({page})=>{
  await openObservation(page);await expect(root(page).getByLabel("Additional growth observation summary").locator(".io-workspace-stat")).toHaveCount(4);
 });
 test('PCAGO-006 All eight source observation templates render',async({page})=>{
  await openObservation(page);await expect(rows(page)).toHaveCount(8);
 });
 test('PCAGO-007 Blocked prerequisite shows danger tone',async({page})=>{
  await openObservation(page,{kind:"blocked"});await expect(rows(page).first().locator(".platform-additional-growth-observation__row-heading [data-tone]")).toHaveAttribute("data-tone","danger");
 });
 test('PCAGO-008 Manual observation pending shows warning tone',async({page})=>{
  await openObservation(page,{kind:"waiting"});await expect(rows(page).first().locator(".platform-additional-growth-observation__row-heading [data-tone]")).toHaveAttribute("data-tone","warn");
 });
 test('PCAGO-009 Blocked summary never records external observations',async({page})=>{
  await openObservation(page);await expect(root(page).getByLabel("Additional growth observation summary")).toContainText("Blocked rows");await expect(root(page).getByLabel("Additional growth observation summary")).toContainText("Observation records stored here");
 });
 test('PCAGO-010 Ten upstream evidence links are retained',async({page})=>{
  await openObservation(page);await expect(context(page).locator(".platform-additional-growth-observation__source-grid a")).toHaveCount(10);
 });
 test('PCAGO-011 Three persistence boundaries explicitly disclose unavailable records',async({page})=>{
  await openObservation(page);await expect(context(page).locator(".platform-additional-growth-observation__persistence-grid > div")).toHaveCount(3);await expect(context(page).locator(".platform-additional-growth-observation__persistence-grid")).toContainText("External records not observable");
 });
 test('PCAGO-012 Observation evidence requirements cannot be edited',async({page})=>{
  await openObservation(page);await expect(rows(page).locator("input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
 test('PCAGO-013 Empty observation response never certifies cohort health',async({page})=>{
  await openObservation(page,{alter:s=>({...s,observation_rows:[],summary:{...s.summary,observation_rows_total:0}})});await expect(root(page).locator(".platform-additional-growth-observation__empty-state")).toContainText("not evidence");
 });
 test('PCAGO-014 Missing tenant read permission redirects away from board',async({page})=>{
  await openObservation(page,{permissions:OBS_PERMISSIONS.filter(p=>p!=="platform.tenants.read"),expectHeading:false});await expect(page).toHaveURL(/\/platform\/dashboard(?:\?.*)?$/);await expect(rows(page)).toHaveCount(0);
 });
 test('PCAGO-015 Operational jobs links are hidden without extra jobs permission',async({page})=>{
  await openObservation(page);await expect(root(page).getByRole("link",{name:"Operational jobs"})).toHaveCount(0);
 });
 test('PCAGO-016 tenant_scope observation retains original domain and owner',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(0).locator(".platform-additional-growth-observation__row-heading")).toContainText("tenant scope");await expect(rows(page).nth(0).locator(".platform-additional-growth-observation__row-heading")).toContainText("product owner");
 });
 test('PCAGO-017 runtime_health observation retains original domain and owner',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(1).locator(".platform-additional-growth-observation__row-heading")).toContainText("runtime health");await expect(rows(page).nth(1).locator(".platform-additional-growth-observation__row-heading")).toContainText("platform operations owner");
 });
 test('PCAGO-018 support_load observation retains original domain and owner',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(2).locator(".platform-additional-growth-observation__row-heading")).toContainText("support load");await expect(rows(page).nth(2).locator(".platform-additional-growth-observation__row-heading")).toContainText("support lead");
 });
 test('PCAGO-019 customer_success observation retains original domain and owner',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(3).locator(".platform-additional-growth-observation__row-heading")).toContainText("customer success");await expect(rows(page).nth(3).locator(".platform-additional-growth-observation__row-heading")).toContainText("customer success lead");
 });
 test('PCAGO-020 billing_entitlements observation retains original domain and owner',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(4).locator(".platform-additional-growth-observation__row-heading")).toContainText("billing entitlements");await expect(rows(page).nth(4).locator(".platform-additional-growth-observation__row-heading")).toContainText("billing owner");
 });
 test('PCAGO-021 incident_monitoring observation retains original domain and owner',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(5).locator(".platform-additional-growth-observation__row-heading")).toContainText("incident monitoring");await expect(rows(page).nth(5).locator(".platform-additional-growth-observation__row-heading")).toContainText("incident manager");
 });
 test('PCAGO-022 rollback_readiness observation retains original domain and owner',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(6).locator(".platform-additional-growth-observation__row-heading")).toContainText("rollback readiness");await expect(rows(page).nth(6).locator(".platform-additional-growth-observation__row-heading")).toContainText("platform operations owner");
 });
 test('PCAGO-023 next_growth_decision observation retains original domain and owner',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(7).locator(".platform-additional-growth-observation__row-heading")).toContainText("next growth decision");await expect(rows(page).nth(7).locator(".platform-additional-growth-observation__row-heading")).toContainText("executive sponsor");
 });
 test('PCAGO-024 tenant_scope renders four source observation controls',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(0).locator(".platform-additional-growth-observation__field-groups li")).toHaveText([...OBS_REQUIREMENTS[0].controls]);
 });
 test('PCAGO-025 runtime_health renders four source observation controls',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(1).locator(".platform-additional-growth-observation__field-groups li")).toHaveText([...OBS_REQUIREMENTS[1].controls]);
 });
 test('PCAGO-026 support_load renders four source observation controls',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(2).locator(".platform-additional-growth-observation__field-groups li")).toHaveText([...OBS_REQUIREMENTS[2].controls]);
 });
 test('PCAGO-027 customer_success renders four source observation controls',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(3).locator(".platform-additional-growth-observation__field-groups li")).toHaveText([...OBS_REQUIREMENTS[3].controls]);
 });
 test('PCAGO-028 billing_entitlements renders four source observation controls',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(4).locator(".platform-additional-growth-observation__field-groups li")).toHaveText([...OBS_REQUIREMENTS[4].controls]);
 });
 test('PCAGO-029 incident_monitoring renders four source observation controls',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(5).locator(".platform-additional-growth-observation__field-groups li")).toHaveText([...OBS_REQUIREMENTS[5].controls]);
 });
 test('PCAGO-030 rollback_readiness renders four source observation controls',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(6).locator(".platform-additional-growth-observation__field-groups li")).toHaveText([...OBS_REQUIREMENTS[6].controls]);
 });
 test('PCAGO-031 next_growth_decision renders four source observation controls',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(7).locator(".platform-additional-growth-observation__field-groups li")).toHaveText([...OBS_REQUIREMENTS[7].controls]);
 });
 test('PCAGO-032 tenant_scope renders four external evidence labels',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(0).locator(".platform-additional-growth-observation__field-groups .platform-additional-growth-observation__chips").first().locator("span")).toHaveCount(OBS_REQUIREMENTS[0].fields.length);
 });
 test('PCAGO-033 runtime_health renders four external evidence labels',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(1).locator(".platform-additional-growth-observation__field-groups .platform-additional-growth-observation__chips").first().locator("span")).toHaveCount(OBS_REQUIREMENTS[1].fields.length);
 });
 test('PCAGO-034 support_load renders four external evidence labels',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(2).locator(".platform-additional-growth-observation__field-groups .platform-additional-growth-observation__chips").first().locator("span")).toHaveCount(OBS_REQUIREMENTS[2].fields.length);
 });
 test('PCAGO-035 customer_success renders four external evidence labels',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(3).locator(".platform-additional-growth-observation__field-groups .platform-additional-growth-observation__chips").first().locator("span")).toHaveCount(OBS_REQUIREMENTS[3].fields.length);
 });
 test('PCAGO-036 billing_entitlements renders four external evidence labels',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(4).locator(".platform-additional-growth-observation__field-groups .platform-additional-growth-observation__chips").first().locator("span")).toHaveCount(OBS_REQUIREMENTS[4].fields.length);
 });
 test('PCAGO-037 incident_monitoring renders four external evidence labels',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(5).locator(".platform-additional-growth-observation__field-groups .platform-additional-growth-observation__chips").first().locator("span")).toHaveCount(OBS_REQUIREMENTS[5].fields.length);
 });
 test('PCAGO-038 rollback_readiness renders four external evidence labels',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(6).locator(".platform-additional-growth-observation__field-groups .platform-additional-growth-observation__chips").first().locator("span")).toHaveCount(OBS_REQUIREMENTS[6].fields.length);
 });
 test('PCAGO-039 next_growth_decision renders four external evidence labels',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(7).locator(".platform-additional-growth-observation__field-groups .platform-additional-growth-observation__chips").first().locator("span")).toHaveCount(OBS_REQUIREMENTS[7].fields.length);
 });
 test('PCAGO-040 tenant_scope evidence links enforce permission rules',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(0).locator(".platform-additional-growth-observation__row-actions a")).toHaveCount(2);
 });
 test('PCAGO-041 runtime_health evidence links enforce permission rules',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(1).locator(".platform-additional-growth-observation__row-actions a")).toHaveCount(2);
 });
 test('PCAGO-042 support_load evidence links enforce permission rules',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(2).locator(".platform-additional-growth-observation__row-actions a")).toHaveCount(1);
 });
 test('PCAGO-043 customer_success evidence links enforce permission rules',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(3).locator(".platform-additional-growth-observation__row-actions a")).toHaveCount(1);
 });
 test('PCAGO-044 billing_entitlements evidence links enforce permission rules',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(4).locator(".platform-additional-growth-observation__row-actions a")).toHaveCount(1);
 });
 test('PCAGO-045 incident_monitoring evidence links enforce permission rules',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(5).locator(".platform-additional-growth-observation__row-actions a")).toHaveCount(2);
 });
 test('PCAGO-046 rollback_readiness evidence links enforce permission rules',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(6).locator(".platform-additional-growth-observation__row-actions a")).toHaveCount(1);
 });
 test('PCAGO-047 next_growth_decision evidence links enforce permission rules',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(7).locator(".platform-additional-growth-observation__row-actions a")).toHaveCount(2);
 });
 test('PCAGO-048 Read-only board shows three source observation rules',async({page})=>{
  await openObservation(page);await expect(root(page).locator(".platform-additional-growth-observation__rules-grid ul").first().locator("li")).toHaveText([...OBS_RULES]);
 });
 test('PCAGO-049 Four limitations disclaim external decisions',async({page})=>{
  await openObservation(page);await expect(root(page).locator(".platform-additional-growth-observation__rules-grid ul").last().locator("li")).toHaveText([...OBS_LIMITATIONS]);
 });
 test('PCAGO-050 Each observation references eight authorization templates',async({page})=>{
  await openObservation(page);await expect(rows(page).first().locator(".platform-additional-growth-observation__source-rows .platform-additional-growth-observation__chips span")).toHaveCount(8);
 });
 test('PCAGO-051 Refresh performs no authorization or rollout writes',async({page})=>{
  const writes:string[]=[];await openObservation(page,{onCall:(m,p)=>{if(!["GET","OPTIONS"].includes(m))writes.push(`${m} ${p}`);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(8);expect(writes).toEqual([]);
 });
 test('PCAGO-052 403 observation response leaves no rows',async({page})=>{
  await openObservation(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PCAGO-053 Server outage displays retry without false observations',async({page})=>{
  await openObservation(page,{status:500});await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PCAGO-054 Unexpected query is rejected without observation rows',async({page})=>{
  await openObservation(page,{urlQuery:"unexpected=1"});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PCAGO-055 Retry restores synthetic preparation rows after transient 503',async({page})=>{
  let outage=true;await openObservation(page,{respond:(m,p)=>m==="GET"&&p===OBS_PATH&&outage?{json:{message:"Synthetic outage"},status:503}:undefined});await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();outage=false;await root(page).getByRole("button",{name:"Retry",exact:true}).click();await expect(rows(page)).toHaveCount(8);
 });
 test('PCAGO-056 customer_success retains exact four external evidence labels',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(3).locator(".platform-additional-growth-observation__field-groups .platform-additional-growth-observation__chips").first().locator("span")).toHaveCount(OBS_REQUIREMENTS[3].fields.length);
 });
 test('PCAGO-057 billing_entitlements retains exact four external evidence labels',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(4).locator(".platform-additional-growth-observation__field-groups .platform-additional-growth-observation__chips").first().locator("span")).toHaveCount(OBS_REQUIREMENTS[4].fields.length);
 });
 test('PCAGO-058 incident_monitoring retains exact four external evidence labels',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(5).locator(".platform-additional-growth-observation__field-groups .platform-additional-growth-observation__chips").first().locator("span")).toHaveCount(OBS_REQUIREMENTS[5].fields.length);
 });
 test('PCAGO-059 rollback_readiness retains exact four external evidence labels',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(6).locator(".platform-additional-growth-observation__field-groups .platform-additional-growth-observation__chips").first().locator("span")).toHaveCount(OBS_REQUIREMENTS[6].fields.length);
 });
 test('PCAGO-060 next_growth_decision retains exact four external evidence labels',async({page})=>{
  await openObservation(page);await expect(rows(page).nth(7).locator(".platform-additional-growth-observation__field-groups .platform-additional-growth-observation__chips").first().locator("span")).toHaveCount(OBS_REQUIREMENTS[7].fields.length);
 });
 test('PCAGO-061 Read-only manual observation rules remain visible',async({page})=>{
  await openObservation(page);await expect(root(page).locator(".platform-additional-growth-observation__rules-grid")).toContainText("manual");
 });
 test('PCAGO-062 No editing controls are present in observation cards',async({page})=>{
  await openObservation(page);await expect(rows(page).locator("input,textarea,select,[contenteditable=true]")).toHaveCount(0);
 });
 test('PCAGO-063 Unobservable upstream records remain labelled as such',async({page})=>{
  await openObservation(page);await expect(context(page).locator(".platform-additional-growth-observation__persistence-grid")).toContainText("External records not observable");
 });
 test('PCAGO-064 Zero recorded observations is a noncertifying count',async({page})=>{
  await openObservation(page);await expect(root(page).getByLabel("Additional growth observation summary")).toContainText("Observation records stored here");await expect(root(page).locator(".platform-additional-growth-observation__boundary-notice")).toContainText("externally");
 });
 test('PCAGO-065 Missing upstream authorization persistence renders Not reported',async({page})=>{
  await openObservation(page,{alter:s=>({...s,additional_growth_authorization_persistence:null})});await expect(context(page).locator(".platform-additional-growth-observation__persistence-grid")).toContainText("Not reported");
 });
 test('PCAGO-066 Empty observation rows display explicit non-evidence notice',async({page})=>{
  await openObservation(page,{alter:s=>({...s,observation_rows:[],summary:{...s.summary,observation_rows_total:0}})});await expect(root(page).locator(".platform-additional-growth-observation__empty-state")).toContainText("not evidence");await expect(rows(page)).toHaveCount(0);
 });
 test('PCAGO-067 Forbidden request never displays a manual observation result',async({page})=>{
  await openObservation(page,{status:403});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PCAGO-068 Server failure provides retry but no false observation result',async({page})=>{
  await openObservation(page,{status:500});await expect(root(page).getByRole("button",{name:"Retry",exact:true})).toBeVisible();await expect(rows(page)).toHaveCount(0);
 });
 test('PCAGO-069 Unexpected query parameter does not authorize observation',async({page})=>{
  await openObservation(page,{urlQuery:"unrecognized=1"});await expect(root(page).getByRole("alert")).toContainText("Unable to load");await expect(rows(page)).toHaveCount(0);
 });
 test('PCAGO-070 Refresh is a read-only GET and cannot change rollout scope',async({page})=>{
  const writes:string[]=[];await openObservation(page,{onCall:(method,path)=>{if(!["GET","OPTIONS"].includes(method))writes.push(`${method} ${path}`);}});await root(page).getByRole("button",{name:"Refresh",exact:true}).click();await expect(rows(page)).toHaveCount(8);expect(writes).toEqual([]);
 });
});
