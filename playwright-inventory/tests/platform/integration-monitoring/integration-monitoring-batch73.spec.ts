/** Batch 73 — Phase 1, GENERATED_UNRUN only. Source-grounded UI assertions with
 * isolated synthetic HTTP responses. Not proof of server ACL, durable writes,
 * webhook delivery, credential secrecy on the wire, or external integration health. */
import {test, expect, type Page} from '@playwright/test';
import {
 openMonitoring, monitorPermissions, monitorWebhook, monitorDependency, monitorClient,
 monitorRevoked, monitoringControls, monitorScanResult, manyMonitorWebhooks, type MonitoringRow
} from '../../../support/platformIntegrationMonitoringFixture';
import {KEY_TENANT_A} from '../../../support/platformApiKeysFixture';

const root=(p:Page)=>p.locator('.platform-integration-monitoring');
const section=(p:Page,name:string)=>root(p).locator('.platform-integration-monitoring__section').filter({has:p.getByRole('heading',{name,exact:true})});
const evidence=(p:Page)=>section(p,'Monitoring evidence');
const bounds=(p:Page)=>section(p,'Evidence and truth boundary');
const reconcile=(p:Page)=>section(p,'Notification reconciliation');
const operations=(p:Page)=>section(p,'Monitoring controls and supporting operations');
const card=(p:Page,name:string)=>evidence(p).locator('.platform-integration-monitoring__card').filter({has:p.getByRole('heading',{name,exact:true})});
const without=(...names:string[])=>monitorPermissions.filter(p=>!names.includes(p));
const filterQuery=(p:Page,key:string)=>new URL(p.url()).searchParams.get(key);
const monitorCalls=(arr:string[]) => (m:string,path:string,q:URLSearchParams)=>{if(m==='GET'&&path==='/platform/integration-monitoring/surface')arr.push(q.toString());};

test.describe('Platform Integration Monitoring — source filters, requests and refresh (GENERATED_UNRUN)',()=>{
 test('PIM-031 Source selector for service dependencies forwards source and limits displayed cards',async({page})=>{
  const calls:string[]=[];await openMonitoring(page,{onCall:monitorCalls(calls)});
  await evidence(page).getByLabel('Source').selectOption('service_dependencies');
  await expect.poll(()=>calls.at(-1)).toContain('source=service_dependencies');
  await expect(card(page,'Fixture external dependency')).toBeVisible();
  await expect(card(page,'Fixture delivery webhook')).toHaveCount(0);
 });
 test('PIM-032 Source selector for API clients forwards source and limits displayed cards',async({page})=>{
  const calls:string[]=[];await openMonitoring(page,{onCall:monitorCalls(calls)});
  await evidence(page).getByLabel('Source').selectOption('api_clients');
  await expect.poll(()=>calls.at(-1)).toContain('source=api_clients');
  await expect(card(page,'Fixture public API client')).toBeVisible();
  await expect(card(page,'Fixture external dependency')).toHaveCount(0);
 });
 test('PIM-033 Source query unavailable without corresponding permission and invalid URL blocks request',async({page})=>{
  const calls:string[]=[];await openMonitoring(page,{query:'source=webhooks',permissions:without('platform.webhooks.read'),onCall:monitorCalls(calls)});
  await expect(evidence(page)).toContainText('Invalid or unauthorized URL filter');
  await expect(evidence(page).getByLabel('Source').locator('option[value="webhooks"]')).toHaveCount(0);
  expect(calls).toHaveLength(0);
 });
 test('PIM-034 Search input preserves unrelated URL parameters while filtering by name',async({page})=>{
  const calls:string[]=[];await openMonitoring(page,{query:'audit_ref=preserved',onCall:monitorCalls(calls)});
  await evidence(page).getByLabel('Search').fill('Fixture delivery');
  await expect.poll(()=>calls.at(-1)).toContain('search=Fixture+delivery');
  expect(filterQuery(page,'audit_ref')).toBe('preserved');
  await expect(card(page,'Fixture delivery webhook')).toBeVisible();
  await expect(card(page,'Fixture external dependency')).toHaveCount(0);
 });
 test('PIM-035 Search field maxlength 200 protects outbound query',async({page})=>{
  await openMonitoring(page);await expect(evidence(page).getByLabel('Search')).toHaveAttribute('maxlength','200');
  await evidence(page).getByLabel('Search').fill('x'.repeat(201));
  await expect.poll(()=>filterQuery(page,'search')?.length??0).toBe(200);
 });
 test('PIM-036 Overlong URL search blocks monitoring request until cleared',async({page})=>{
  const calls:string[]=[];await openMonitoring(page,{query:`search=${'x'.repeat(201)}`,onCall:monitorCalls(calls)});
  await expect(evidence(page)).toContainText('Invalid or unauthorized URL filter');expect(calls).toHaveLength(0);
  await evidence(page).getByRole('button',{name:'Clear invalid filters'}).click();
  await expect.poll(()=>calls.length).toBeGreaterThan(0);
 });
 test('PIM-037 include_revoked=false is valid and omitted from surface query',async({page})=>{
  const calls:string[]=[];await openMonitoring(page,{query:'include_revoked=false',onCall:monitorCalls(calls)});
  await expect(card(page,'Fixture public API client')).toBeVisible();
  expect(calls.every(q=>!q.includes('include_revoked='))).toBe(true);
  await expect(evidence(page).getByLabel('Include revoked API credential history')).not.toBeChecked();
 });
 test('PIM-038 Invalid include_revoked value blocks monitoring until cleared',async({page})=>{
  const calls:string[]=[];await openMonitoring(page,{query:'include_revoked=maybe',onCall:monitorCalls(calls)});
  await expect(evidence(page)).toContainText('Invalid or unauthorized URL filter');expect(calls).toHaveLength(0);
  await evidence(page).getByRole('button',{name:'Clear invalid filters'}).click();
  await expect.poll(()=>calls.length).toBeGreaterThan(0);
 });
 test('PIM-039 Disabling revoked history hides retired client and resets pagination',async({page})=>{
  await openMonitoring(page,{query:'include_revoked=true',rows:[...manyMonitorWebhooks(54),monitorRevoked]});
  await evidence(page).getByRole('button',{name:'Next'}).click();await expect(evidence(page)).toContainText('Page 2');
  await evidence(page).getByLabel('Include revoked API credential history').uncheck();
  await expect(evidence(page)).toContainText('Page 1');expect(filterQuery(page,'include_revoked')).toBe(null);
  await expect(card(page,'Fixture revoked API client')).toHaveCount(0);
 });
 test('PIM-040 Tenant selector change resets pagination from page two to one',async({page})=>{
  await openMonitoring(page,{rows:manyMonitorWebhooks(55)});
  await evidence(page).getByRole('button',{name:'Next'}).click();await expect(evidence(page)).toContainText('Page 2');
  await evidence(page).getByLabel('Tenant').selectOption(KEY_TENANT_A);
  await expect(evidence(page)).toContainText('Page 1');expect(filterQuery(page,'tenant_id')).toBe(KEY_TENANT_A);
 });
 test('PIM-041 Changing source resets pagination from page two to one',async({page})=>{
  await openMonitoring(page,{rows:manyMonitorWebhooks(55)});
  await evidence(page).getByRole('button',{name:'Next'}).click();await expect(evidence(page)).toContainText('Page 2');
  await evidence(page).getByLabel('Source').selectOption('service_dependencies');
  await expect(evidence(page)).toContainText('Page 1');expect(filterQuery(page,'source')).toBe('service_dependencies');
 });
 test('PIM-042 Changing search resets pagination from page two to one',async({page})=>{
  await openMonitoring(page,{rows:manyMonitorWebhooks(55)});
  await evidence(page).getByRole('button',{name:'Next'}).click();await expect(evidence(page)).toContainText('Page 2');
  await evidence(page).getByLabel('Search').fill('Fixture webhook 001');
  await expect(evidence(page)).toContainText('Page 1');expect(filterQuery(page,'search')).toBe('Fixture webhook 001');
 });
 test('PIM-043 Missing tenant permission blocks unauthorized tenant URL filters',async({page})=>{
  const calls:string[]=[];await openMonitoring(page,{query:`tenant_id=${KEY_TENANT_A}`,permissions:without('platform.tenants.read'),onCall:monitorCalls(calls)});
  await expect(evidence(page)).toContainText('Invalid or unauthorized URL filter');expect(calls).toHaveLength(0);
  await expect(evidence(page)).toContainText('Tenant filter restricted');
 });
 test('PIM-044 Missing source permission blocks unauthorized source URL filter',async({page})=>{
  const calls:string[]=[];await openMonitoring(page,{query:'source=api_clients',permissions:without('platform.api_keys.read'),onCall:monitorCalls(calls)});
  await expect(evidence(page)).toContainText('Invalid or unauthorized URL filter');expect(calls).toHaveLength(0);
 });
 test('PIM-045 Invalid source and tenant parameters never reach monitoring query',async({page})=>{
  const calls:string[]=[];await openMonitoring(page,{query:'source=unknown&tenant_id=not-a-uuid&trace=kept',onCall:monitorCalls(calls)});
  await expect(evidence(page)).toContainText('Invalid or unauthorized URL filter');expect(calls).toHaveLength(0);
  await evidence(page).getByRole('button',{name:'Clear invalid filters'}).click();
  await expect.poll(()=>calls.length).toBeGreaterThan(0);expect(calls.every(q=>!q.includes('unknown')&&!q.includes('not-a-uuid'))).toBe(true);
  expect(filterQuery(page,'trace')).toBe('kept');
 });
 test('PIM-046 Initial 429 rate limit surfaces retryable error instead of empty success',async({page})=>{
  await openMonitoring(page,{responses:{'GET /platform/integration-monitoring/surface':{status:429,json:{message:'Synthetic monitoring rate limited'}}}});
  await expect(evidence(page)).toContainText('Integration monitoring unavailable');
  await expect(evidence(page).getByRole('button',{name:'Retry'})).toBeVisible();
  await expect(evidence(page)).not.toContainText('No application evidence matched.');
 });
 test('PIM-047 Initial transport error Retry recovers when fixture fault clears',async({page})=>{
  let failing=true;
  await openMonitoring(page,{respond:(m,path)=>m==='GET'&&path.endsWith('/surface')&&failing?{status:503,json:{message:'Synthetic transport unavailable'}}:undefined});
  await expect(evidence(page)).toContainText('Integration monitoring unavailable');failing=false;
  await evidence(page).getByRole('button',{name:'Retry'}).click();
  await expect(card(page,'Fixture delivery webhook')).toBeVisible();
 });
 test('PIM-048 Manual Refresh refetches monitoring surface and tenant directory',async({page})=>{
  let surfaceCalls=0,tenantCalls=0;await openMonitoring(page,{onCall:(m,p)=>{if(m==='GET'&&p.endsWith('/surface'))surfaceCalls++;if(m==='GET'&&p==='/platform/tenants')tenantCalls++;}});
  await expect(card(page,'Fixture delivery webhook')).toBeVisible();const before=surfaceCalls,tenantsBefore=tenantCalls;
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>surfaceCalls).toBeGreaterThan(before);
  await expect.poll(()=>tenantCalls).toBeGreaterThan(tenantsBefore);
 });
 test('PIM-049 Failed Refresh retains last successful evidence snapshot and reports staleness',async({page})=>{
  let failing=false;await openMonitoring(page,{respond:(m,p)=>m==='GET'&&p.endsWith('/surface')&&failing?{status:503,json:{message:'Synthetic stale snapshot'}}:undefined});
  await expect(card(page,'Fixture delivery webhook')).toBeVisible();failing=true;
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(root(page)).toContainText('Showing the last successful integration monitoring snapshot.');
  await expect(card(page,'Fixture delivery webhook')).toBeVisible();
 });
 test('PIM-050 Tenant directory 503 does not destroy separately permitted evidence',async({page})=>{
  await openMonitoring(page,{responses:{'GET /platform/tenants':{status:503,json:{message:'Synthetic directory unavailable'}}}});
  await expect(root(page)).toContainText('Tenant directory unavailable.');
  await expect(card(page,'Fixture delivery webhook')).toBeVisible();
 });
 test('PIM-051 No matching evidence reports application-source empty state not external inactivity',async({page})=>{
  await openMonitoring(page,{rows:[]});await expect(evidence(page)).toContainText('No application evidence matched.');
  await expect(evidence(page)).toContainText('does not prove that no external integration');
 });
 test('PIM-052 Unrecognized posture remains readable rather than blank or crashing',async({page})=>{
  await openMonitoring(page,{posture:'integration_monitoring_unexpected_condition'});
  await expect(evidence(page).locator('.platform-integration-monitoring__posture-row strong')).toHaveText('unexpected condition');
 });
 test('PIM-053 Notification-gap posture uses warning presentation',async({page})=>{
  await openMonitoring(page,{posture:'integration_monitoring_notification_gap'});
  await expect(evidence(page).locator('.platform-integration-monitoring__posture-row strong')).toHaveAttribute('data-tone','warn');
  await expect(evidence(page).locator('.platform-integration-monitoring__posture-row strong')).toHaveText('Notification gap');
 });
 test('PIM-054 Escalation-breached posture uses danger presentation',async({page})=>{
  await openMonitoring(page,{posture:'integration_monitoring_escalation_breached'});
  await expect(evidence(page).locator('.platform-integration-monitoring__posture-row strong')).toHaveAttribute('data-tone','danger');
  await expect(evidence(page).locator('.platform-integration-monitoring__posture-row strong')).toHaveText('Escalation breached');
 });
 test('PIM-055 Notification coverage source visibly restricted when evidence access denied',async({page})=>{
  await openMonitoring(page,{permissions:without('platform.notifications.read')});
  await expect(bounds(page).locator('[data-state="restricted"]').filter({hasText:'Notification coverage'})).toContainText('Omitted');
  await expect(operations(page).getByRole('link',{name:'Notifications'})).toHaveCount(0);
 });
 test('PIM-056 Missing platform-user read redacts dependency owner email',async({page})=>{
  await openMonitoring(page,{permissions:without('platform.users.read')});
  await expect(card(page,'Fixture external dependency')).toContainText('Recorded · identity redacted');
  await expect(card(page,'Fixture external dependency')).not.toContainText('private-owner@fixture.test');
 });
 test('PIM-057 Missing vendor read permission redacts vendor identity',async({page})=>{
  await openMonitoring(page,{permissions:without('platform.vendors.read')});
  await expect(card(page,'Fixture external dependency')).toContainText('Redacted');
  await expect(card(page,'Fixture external dependency')).not.toContainText('Fixture Vendor');
 });
 test('PIM-058 Platform-wide dependencies are excluded by tenant filter',async({page})=>{
  await openMonitoring(page,{query:`tenant_id=${KEY_TENANT_A}`});
  await expect(card(page,'Fixture external dependency')).toHaveCount(0);
  await expect(card(page,'Fixture delivery webhook')).toBeVisible();
 });
 test('PIM-059 Disabled webhook and zero delivery failures show recorded values',async({page})=>{
  await openMonitoring(page,{rows:[{...monitorWebhook,is_enabled:false,consecutive_failure_count:0,last_delivery_status:'sent',risk_flags:[]}]});
  const values=card(page,'Fixture delivery webhook').locator('.platform-integration-monitoring__metrics-grid');
  await expect(values).toContainText('Enabled');await expect(values).toContainText('No');
  await expect(values).toContainText('Consecutive failures');await expect(values).toContainText('0');
 });
 test('PIM-060 Webhook without last-delivery metadata renders Not recorded',async({page})=>{
  await openMonitoring(page,{rows:[{...monitorWebhook,last_delivery_at:null,last_delivery_status:null} as unknown as MonitoringRow]});
  await expect(card(page,'Fixture delivery webhook').locator('.platform-integration-monitoring__metrics-grid')).toContainText('Not recorded');
 });
});

test.describe('Platform Integration Monitoring — evidence, identity, supporting links (GENERATED_UNRUN)',()=>{
 test('PIM-061 Webhook failure threshold finding uses danger tone',async({page})=>{
  await openMonitoring(page,{rows:[monitorWebhook]});
  await expect(card(page,'Fixture delivery webhook').locator('.platform-integration-monitoring__findings [data-tone="danger"]')).toContainText('webhook delivery failure threshold');
 });
 test('PIM-062 Dependency without recorded owner displays Missing instead of fabricated assignment',async({page})=>{
  await openMonitoring(page,{rows:[{...monitorDependency,owner_present:false,owner_email:null} as unknown as MonitoringRow]});
  await expect(card(page,'Fixture external dependency').locator('.platform-integration-monitoring__metrics-grid')).toContainText('Missing');
  await expect(card(page,'Fixture external dependency')).not.toContainText('private-owner@fixture.test');
 });
 test('PIM-063 Dependency without vendor displays Not linked when vendor access is granted',async({page})=>{
  await openMonitoring(page,{rows:[{...monitorDependency,vendor_name:null} as unknown as MonitoringRow]});
  await expect(card(page,'Fixture external dependency').locator('.platform-integration-monitoring__metrics-grid')).toContainText('Not linked');
 });
 test('PIM-064 Dependency escalation metadata does not assert vendor acknowledgement',async({page})=>{
  await openMonitoring(page,{rows:[{...monitorDependency,escalation_url_present:true,status:'degraded'}]});
  await expect(card(page,'Fixture external dependency')).toContainText('degraded');
  await expect(bounds(page)).toContainText('does not certify external integration success');
  await expect(card(page,'Fixture external dependency')).not.toContainText('Vendor accepted');
 });
 test('PIM-065 Tenant registry client labels unsupported IP allowlist accurately',async({page})=>{
  const client={...monitorRevoked,name:'Fixture active tenant client',revoked_at:null,is_revoked:false};
  await openMonitoring(page,{rows:[client as unknown as MonitoringRow]});
  await expect(card(page,'Fixture active tenant client')).toContainText('Not supported by tenant client model');
 });
 test('PIM-066 Legacy tenant credential has migration contract and no platform lifecycle link',async({page})=>{
  const client={...monitorRevoked,name:'Fixture active legacy key',revoked_at:null,is_revoked:false};
  await openMonitoring(page,{rows:[client as unknown as MonitoringRow]});
  await expect(card(page,'Fixture active legacy key')).toContainText('Legacy hla_ · accepted for migration');
  await expect(card(page,'Fixture active legacy key')).toContainText('Tenant-managed credential');
  await expect(card(page,'Fixture active legacy key').getByRole('link',{name:'API key lifecycle'})).toHaveCount(0);
 });
 test('PIM-067 API client with missing expiry and last-use shows honest absent values',async({page})=>{
  await openMonitoring(page,{rows:[{...monitorClient,last_used_at:null,expires_at:null}]});
  const metrics=card(page,'Fixture public API client').locator('.platform-integration-monitoring__metrics-grid');
  await expect(metrics).toContainText('Not recorded');await expect(metrics).toContainText('No expiration recorded');
 });
 test('PIM-068 Empty client scopes render explicit danger-tagged No scopes',async({page})=>{
  await openMonitoring(page,{rows:[{...monitorClient,scopes:[],unsupported_scopes:[]}]});
  await expect(card(page,'Fixture public API client').locator('.platform-integration-monitoring__scope-list [data-tone="danger"]')).toHaveText('No scopes');
 });
 test('PIM-069 An evidence record without findings does not fabricate risk flags',async({page})=>{
  await openMonitoring(page,{rows:[{...monitorWebhook,risk_flags:[],health_state:'integration_no_recorded_findings'}]});
  await expect(card(page,'Fixture delivery webhook').locator('.platform-integration-monitoring__findings [data-tone="good"]')).toContainText('No recorded findings in this evidence');
 });
 test('PIM-070 Per-card tenant link requires tenant permission and scopes UUID in destination',async({page})=>{
  await openMonitoring(page);await expect(card(page,'Fixture delivery webhook').getByRole('link',{name:'Tenant source'}))
   .toHaveAttribute('href',`/platform/tenants?tenant_id=${KEY_TENANT_A}`);
  await openMonitoring(page,{permissions:without('platform.tenants.read')});
  await expect(card(page,'Fixture delivery webhook').getByRole('link',{name:'Tenant source'})).toHaveCount(0);
 });
 test('PIM-071 Dependency read permission is a route guard not just a hidden supporting link',async({page})=>{
  await openMonitoring(page,{permissions:without('platform.dependencies.read'),expectHeading:false});
  await expect(root(page)).toHaveCount(0);await expect(page).not.toHaveURL(/\/platform\/integration-monitoring(?:\?|$)/);
 });
 test('PIM-072 Webhooks supporting destination disappears without webhook read',async({page})=>{
  await openMonitoring(page,{permissions:without('platform.webhooks.read')});
  await expect(operations(page).getByRole('link',{name:'Webhooks'})).toHaveCount(0);
  await expect(card(page,'Fixture delivery webhook')).toHaveCount(0);
 });
 test('PIM-073 API key and governance supporting destinations disappear without API key read',async({page})=>{
  await openMonitoring(page,{permissions:without('platform.api_keys.read')});
  await expect(operations(page).getByRole('link',{name:'API keys'})).toHaveCount(0);
  await expect(operations(page).getByRole('link',{name:'API client governance'})).toHaveCount(0);
 });
 test('PIM-074 Notifications supporting destination disappears without notification read',async({page})=>{
  await openMonitoring(page,{permissions:without('platform.notifications.read')});
  await expect(operations(page).getByRole('link',{name:'Notifications'})).toHaveCount(0);
  await expect(reconcile(page).getByRole('button',{name:'Run notification reconciliation'})).toBeDisabled();
 });
 test('PIM-075 Tenant and vendor supporting destinations each respect independent permissions',async({page})=>{
  await openMonitoring(page,{permissions:without('platform.tenants.read','platform.vendors.read')});
  await expect(operations(page).getByRole('link',{name:'Tenants'})).toHaveCount(0);
  await expect(operations(page).getByRole('link',{name:'Vendors'})).toHaveCount(0);
  await expect(operations(page).getByRole('link',{name:'Webhooks'})).toBeVisible();
 });
});

test.describe('Platform Integration Monitoring — manual scan, retries, pagination and secrets (GENERATED_UNRUN)',()=>{
 test('PIM-076 Missing notification read disables reconciliation without POST',async({page})=>{
  let posts=0;await openMonitoring(page,{permissions:without('platform.notifications.read'),onCall:m=>{if(m==='POST')posts++;}});
  await expect(reconcile(page).getByRole('button',{name:'Run notification reconciliation'})).toBeDisabled();expect(posts).toBe(0);
 });
 test('PIM-077 Missing notification write disables reconciliation without POST',async({page})=>{
  let posts=0;await openMonitoring(page,{permissions:without('platform.notifications.write'),onCall:m=>{if(m==='POST')posts++;}});
  await expect(reconcile(page).getByRole('button',{name:'Run notification reconciliation'})).toBeDisabled();expect(posts).toBe(0);
 });
 test('PIM-078 Missing platform user read disables reconciliation without POST',async({page})=>{
  let posts=0;await openMonitoring(page,{permissions:without('platform.users.read'),onCall:m=>{if(m==='POST')posts++;}});
  await expect(reconcile(page).getByRole('button',{name:'Run notification reconciliation'})).toBeDisabled();expect(posts).toBe(0);
 });
 test('PIM-079 Missing webhook read disables reconciliation without POST',async({page})=>{
  let posts=0;await openMonitoring(page,{permissions:without('platform.webhooks.read'),onCall:m=>{if(m==='POST')posts++;}});
  await expect(reconcile(page).getByRole('button',{name:'Run notification reconciliation'})).toBeDisabled();expect(posts).toBe(0);
 });
 test('PIM-080 Missing dependency read redirects at route guard before reconciliation renders',async({page})=>{
  let posts=0;await openMonitoring(page,{permissions:without('platform.dependencies.read'),expectHeading:false,onCall:m=>{if(m==='POST')posts++;}});
  await expect(root(page)).toHaveCount(0);expect(posts).toBe(0);
 });
 test('PIM-081 Missing API key read disables reconciliation without POST',async({page})=>{
  let posts=0;await openMonitoring(page,{permissions:without('platform.api_keys.read'),onCall:m=>{if(m==='POST')posts++;}});
  await expect(reconcile(page).getByRole('button',{name:'Run notification reconciliation'})).toBeDisabled();expect(posts).toBe(0);
 });
 test('PIM-082 Missing tenant read disables reconciliation without POST',async({page})=>{
  let posts=0;await openMonitoring(page,{permissions:without('platform.tenants.read'),onCall:m=>{if(m==='POST')posts++;}});
  await expect(reconcile(page).getByRole('button',{name:'Run notification reconciliation'})).toBeDisabled();expect(posts).toBe(0);
 });
 test('PIM-083 Pending notification scan is single-submit and has Reconciling label',async({page})=>{
  let release!:()=>void;const deferred=new Promise<void>(resolve=>{release=resolve;});let posts=0;
  await openMonitoring(page);
  await page.route('**/platform/notifications/integration-monitoring-scan',async route=>{
   if(route.request().method()!=='POST')return route.continue();
   posts++;await deferred;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(monitorScanResult)});
  });
  await reconcile(page).getByRole('button',{name:'Run notification reconciliation'}).click();
  await expect(reconcile(page).getByRole('button',{name:'Reconciling…'})).toBeDisabled();
  expect(posts).toBe(1);release();await expect(reconcile(page)).toContainText('Reconciliation complete.');
 });
 test('PIM-084 Zero notification scan result stays zero without external delivery claim',async({page})=>{
  await openMonitoring(page,{responses:{'POST /platform/notifications/integration-monitoring-scan':{json:{...monitorScanResult,risks_found:0,notifications_touched:0,created:0,refreshed:0,auto_resolved:0}}}});
  await reconcile(page).getByRole('button',{name:'Run notification reconciliation'}).click();
  await expect(reconcile(page)).toContainText('0 recorded risks; 0 notifications touched');
  await expect(bounds(page)).toContainText('does not certify external integration success');
 });
 test('PIM-085 Notification scan failure preserves read-only monitoring evidence',async({page})=>{
  await openMonitoring(page,{responses:{'POST /platform/notifications/integration-monitoring-scan':{status:503,json:{message:'Synthetic notification scan unavailable'}}}});
  await expect(card(page,'Fixture delivery webhook')).toBeVisible();
  await reconcile(page).getByRole('button',{name:'Run notification reconciliation'}).click();
  await expect(reconcile(page)).toContainText('Reconciliation failed.');
  await expect(card(page,'Fixture delivery webhook')).toBeVisible();
 });
 test('PIM-086 Successful scan re-fetches visible monitoring snapshot after query invalidation',async({page})=>{
  let reads=0;await openMonitoring(page,{onCall:(m,p)=>{if(m==='GET'&&p.endsWith('/surface'))reads++;}});
  await expect(card(page,'Fixture delivery webhook')).toBeVisible();const before=reads;
  await reconcile(page).getByRole('button',{name:'Run notification reconciliation'}).click();
  await expect(reconcile(page)).toContainText('Reconciliation complete.');
  await expect.poll(()=>reads).toBeGreaterThan(before);
  // The mounted monitoring query is observable; notifications invalidation requires separate mounted-view testing.
 });
 test('PIM-087 Pagination Next disabled when server reports no following page',async({page})=>{
  await openMonitoring(page);await expect(evidence(page).getByRole('button',{name:'Next'})).toBeDisabled();
  await expect(evidence(page).getByRole('button',{name:'Previous'})).toBeDisabled();
 });
 test('PIM-088 Previous enabled on page two and returns to bounded offset zero',async({page})=>{
  const offsets:number[]=[];await openMonitoring(page,{rows:manyMonitorWebhooks(53),onCall:(m,p,q)=>{if(m==='GET'&&p.endsWith('/surface'))offsets.push(Number(q.get('offset')||0));}});
  await evidence(page).getByRole('button',{name:'Next'}).click();await expect(evidence(page)).toContainText('Page 2');
  await expect(evidence(page).getByRole('button',{name:'Previous'})).toBeEnabled();
  await evidence(page).getByRole('button',{name:'Previous'}).click();await expect(evidence(page)).toContainText('Page 1');
  await expect.poll(()=>offsets.at(-1)).toBe(0);await expect(evidence(page).getByRole('button',{name:'Previous'})).toBeDisabled();
 });
 test('PIM-089 Revoked client history is labeled non-posture-driving even with risk flags',async({page})=>{
  await openMonitoring(page,{query:'include_revoked=true',rows:[{...monitorRevoked,risk_flags:['api_client_unsupported_scopes']}],posture:'integration_monitoring_no_recorded_findings',controls:{...monitoringControls,revoked_credentials_drive_posture:false}});
  await expect(card(page,'Fixture revoked API client')).toContainText('does not drive the current monitoring posture');
  await expect(evidence(page).locator('.platform-integration-monitoring__posture-row strong')).toHaveText('No recorded findings');
  await expect(operations(page)).toContainText('No · historical only');
 });
 test('PIM-090 Synthetic raw secret and secret hash fields never render on monitoring card',async({page})=>{
  await openMonitoring(page,{rows:[{...monitorClient,raw_secret:'inv_live_NEVER_RENDER_ME',key_hash:'HASH_NEVER_RENDER_ME'}]});
  await expect(card(page,'Fixture public API client')).toBeVisible();
  await expect(root(page)).not.toContainText('inv_live_NEVER_RENDER_ME');
  await expect(root(page)).not.toContainText('HASH_NEVER_RENDER_ME');
  await expect(card(page,'Fixture public API client')).toContainText('fixture10…');
 });
});
