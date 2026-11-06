/** Batch 72 · Phase 1 · GENERATED_UNRUN, synthetic integration monitoring evidence only.
 * UI assertions/route intercepts do not verify real webhook delivery, API requests,
 * credential enforcement, external service health, notification delivery or isolation. */
import {test,expect,type Page} from '@playwright/test';
import {openMonitoring,monitorPermissions,monitorWebhook,monitorDependency,monitorClient,monitorRevoked,monitoringTruth,monitoringControls,manyMonitorWebhooks} from '../../../support/platformIntegrationMonitoringFixture';
import {KEY_TENANT_A} from '../../../support/platformApiKeysFixture';

const area=(p:Page)=>p.locator('.platform-integration-monitoring');
const section=(p:Page,name:string)=>area(p).locator('.platform-integration-monitoring__section').filter({has:p.getByRole('heading',{name,exact:true})});
const evidence=(p:Page)=>section(p,'Monitoring evidence');
const boundary=(p:Page)=>section(p,'Evidence and truth boundary');
const reconcile=(p:Page)=>section(p,'Notification reconciliation');
const supporting=(p:Page)=>section(p,'Monitoring controls and supporting operations');
const card=(p:Page,name:string)=>evidence(p).locator('.platform-integration-monitoring__card').filter({has:p.getByRole('heading',{name,exact:true})});
const without=(...denied:string[])=>monitorPermissions.filter(x=>!denied.includes(x));

test.describe('Platform Integration Monitoring — registry posture and evidence (GENERATED_UNRUN)',()=>{
 test('PIM-001 Monitoring identifies read-only application evidence and 50-row page size',async({page})=>{
  await openMonitoring(page);await expect(area(page)).toContainText('Read-only monitoring board');await expect(area(page)).toContainText('Page size: 50');
 });
 test('PIM-002 Monitoring truth boundary rejects external outcome certification',async({page})=>{
  await openMonitoring(page);await expect(boundary(page)).toContainText('does not prove');await expect(boundary(page)).toContainText('does not certify external integration success');
 });
 test('PIM-003 Review-required posture has warning tone',async({page})=>{
  await openMonitoring(page);await expect(evidence(page).locator('.platform-integration-monitoring__posture-row strong')).toHaveAttribute('data-tone','warn');
 });
 test('PIM-004 Blocked posture maps to danger without implying failed delivery from UI alone',async({page})=>{
  await openMonitoring(page,{posture:'integration_monitoring_blocked'});
  await expect(evidence(page).locator('.platform-integration-monitoring__posture-row strong')).toHaveAttribute('data-tone','danger');
 });
 test('PIM-005 Partial evidence posture remains distinct from healthy',async({page})=>{
  await openMonitoring(page,{posture:'integration_monitoring_partial_evidence'});
  await expect(evidence(page).locator('.platform-integration-monitoring__posture-row')).toContainText('Partial evidence');
 });
 test('PIM-006 No recorded findings does not claim external integration success',async({page})=>{
  await openMonitoring(page,{rows:[],posture:'integration_monitoring_no_recorded_findings'});
  await expect(evidence(page)).toContainText('No recorded findings');await expect(boundary(page)).toContainText('does not certify');
 });
 test('PIM-007 Summary labels its counts as loaded-page application evidence',async({page})=>{
  await openMonitoring(page);await expect(page.getByLabel('Integration monitoring loaded-page metrics')).toContainText('Evidence rows');
  await expect(page.getByLabel('Integration monitoring loaded-page metrics')).toContainText('Loaded page only');
 });
 test('PIM-008 Webhook card shows recorded delivery failure evidence and failure count',async({page})=>{
  await openMonitoring(page);await expect(card(page,'Fixture delivery webhook')).toContainText('Last delivery status');
  await expect(card(page,'Fixture delivery webhook')).toContainText('failed');await expect(card(page,'Fixture delivery webhook')).toContainText('Consecutive failures');
 });
 test('PIM-009 Webhook source link targets platform webhook registry',async({page})=>{
  await openMonitoring(page);await expect(card(page,'Fixture delivery webhook').getByRole('link',{name:'Webhook source'})).toHaveAttribute('href','/platform/webhooks');
 });
 test('PIM-010 Dependency evidence displays critical impact and stale check date',async({page})=>{
  await openMonitoring(page);await expect(card(page,'Fixture external dependency')).toContainText('critical');
  await expect(card(page,'Fixture external dependency')).toContainText('Last checked');
 });
 test('PIM-011 Dependency source link opens service dependency route',async({page})=>{
  await openMonitoring(page);await expect(card(page,'Fixture external dependency').getByRole('link',{name:'Dependency source'})).toHaveAttribute('href','/platform/service-dependencies');
 });
 test('PIM-012 Platform API client reveals compatibility and unsupported scope chip',async({page})=>{
  await openMonitoring(page);await expect(card(page,'Fixture public API client')).toContainText('Scope migration required');
  await expect(card(page,'Fixture public API client').locator('.platform-integration-monitoring__scope-list [data-tone="danger"]')).toContainText('legacy:scope · unsupported');
 });
 test('PIM-013 Credential card shows prefix but not raw secret and distinguishes missing usage',async({page})=>{
  await openMonitoring(page);await expect(card(page,'Fixture public API client')).toContainText('fixture10…');
  await expect(card(page,'Fixture public API client')).not.toContainText('inv_live_fixture10_secret');
  await expect(card(page,'Fixture public API client')).toContainText('Not recorded');
 });
 test('PIM-014 Platform-issued credential has API key lifecycle link retaining prefix',async({page})=>{
  await openMonitoring(page);const link=card(page,'Fixture public API client').getByRole('link',{name:'API key lifecycle'});
  await expect(link).toHaveAttribute('href',/search=fixture10/);await expect(link).toHaveAttribute('href',/include_revoked=true/);
 });
 test('PIM-015 Tenant-created legacy credential displays migration metadata without Platform lifecycle action',async({page})=>{
  await openMonitoring(page,{query:'include_revoked=true'});await expect(card(page,'Fixture revoked API client')).toContainText('Legacy hla_');
  await expect(card(page,'Fixture revoked API client')).toContainText('Tenant-managed credential');
  await expect(card(page,'Fixture revoked API client').getByRole('link',{name:'API key lifecycle'})).toHaveCount(0);
 });
 test('PIM-016 Revoked API client is excluded from default monitoring evidence',async({page})=>{
  await openMonitoring(page);await expect(card(page,'Fixture revoked API client')).toHaveCount(0);
 });
 test('PIM-017 Including revoked history shows historical non-posture-driving note',async({page})=>{
  await openMonitoring(page,{query:'include_revoked=true'});
  await expect(card(page,'Fixture revoked API client')).toContainText('Revoked credential history');
  await expect(card(page,'Fixture revoked API client')).toContainText('does not drive the current monitoring posture');
 });
 test('PIM-018 Missing webhook read permission excludes its source and supporting link',async({page})=>{
  await openMonitoring(page,{permissions:without('platform.webhooks.read')});
  await expect(card(page,'Fixture delivery webhook')).toHaveCount(0);await expect(supporting(page).getByRole('link',{name:'Webhooks'})).toHaveCount(0);
  await expect(boundary(page)).toContainText('Partial source visibility');
 });
 test('PIM-019 Missing API key read permission hides API credential history control and source',async({page})=>{
  await openMonitoring(page,{permissions:without('platform.api_keys.read')});
  await expect(evidence(page)).toContainText('API client history omitted');await expect(card(page,'Fixture public API client')).toHaveCount(0);
 });
 test('PIM-020 Missing tenant permission redacts customer identity and removes tenant selector',async({page})=>{
  await openMonitoring(page,{permissions:without('platform.tenants.read')});
  await expect(evidence(page)).toContainText('Tenant filter restricted');
  await expect(card(page,'Fixture delivery webhook')).toContainText('Redacted');
  await expect(card(page,'Fixture delivery webhook')).not.toContainText('Fixture Hotel');
 });
});

test.describe('Platform Integration Monitoring — URL filters, page controls, notifications (GENERATED_UNRUN)',()=>{
 test('PIM-021 Tenant filter uses validated UUID and forwards it to monitoring endpoint',async({page})=>{
  const queries:string[]=[];await openMonitoring(page,{query:`tenant_id=${KEY_TENANT_A}`,onCall:(m,p,q)=>{if(m==='GET'&&p.endsWith('/surface'))queries.push(q.get('tenant_id')||'');}});
  expect(queries).toContain(KEY_TENANT_A);await expect(card(page,'Fixture external dependency')).toHaveCount(0);
 });
 test('PIM-022 Source selector restricts monitoring query and visible cards',async({page})=>{
  const sources:string[]=[];await openMonitoring(page,{onCall:(m,p,q)=>{if(m==='GET'&&p.endsWith('/surface'))sources.push(q.get('source')||'');}});
  await evidence(page).getByLabel('Source').selectOption('webhooks');
  await expect.poll(()=>sources.at(-1)).toBe('webhooks');
  await expect(card(page,'Fixture delivery webhook')).toBeVisible();await expect(card(page,'Fixture public API client')).toHaveCount(0);
 });
 test('PIM-023 Invalid or unauthorized source URL prevents monitoring transport',async({page})=>{
  const calls:string[]=[];await openMonitoring(page,{query:'source=unknown',onCall:(m,p)=>{if(m==='GET'&&p.endsWith('/surface'))calls.push(p);}});
  await expect(evidence(page)).toContainText('Invalid or unauthorized URL filter');expect(calls).toHaveLength(0);
 });
 test('PIM-024 Revoked history checkbox changes URL and reveals historical client',async({page})=>{
  await openMonitoring(page);await evidence(page).getByLabel('Include revoked API credential history').check();
  await expect(card(page,'Fixture revoked API client')).toBeVisible();
  await expect.poll(()=>new URL(page.url()).searchParams.get('include_revoked')).toBe('true');
 });
 test('PIM-025 Invalid tenant UUID can be cleared without losing unrelated query values',async({page})=>{
  await openMonitoring(page,{query:'tenant_id=invalid&audit_ref=kept'});await evidence(page).getByRole('button',{name:'Clear invalid filters'}).click();
  const q=new URL(page.url()).searchParams;expect(q.has('tenant_id')).toBe(false);expect(q.get('audit_ref')).toBe('kept');
  await expect(card(page,'Fixture delivery webhook')).toBeVisible();
 });
 test('PIM-026 Pagination fetches offset 50 and Previous restores offset zero',async({page})=>{
  const offsets:number[]=[];await openMonitoring(page,{rows:manyMonitorWebhooks(56),onCall:(m,p,q)=>{if(m==='GET'&&p.endsWith('/surface'))offsets.push(Number(q.get('offset')));}});
  await evidence(page).getByRole('button',{name:'Next'}).click();await expect(evidence(page)).toContainText('Page 2');
  await expect.poll(()=>offsets.at(-1)).toBe(50);await evidence(page).getByRole('button',{name:'Previous'}).click();
  await expect.poll(()=>offsets.at(-1)).toBe(0);
 });
 test('PIM-027 Initial monitoring 503 shows Retry instead of successful empty state',async({page})=>{
  await openMonitoring(page,{responses:{'GET /platform/integration-monitoring/surface':{status:503,json:{message:'Synthetic monitoring unavailable'}}}});
  await expect(evidence(page)).toContainText('Integration monitoring unavailable');
  await expect(evidence(page).getByRole('button',{name:'Retry'})).toBeVisible();
  await expect(evidence(page)).not.toContainText('No application evidence matched.');
 });
 test('PIM-028 Notification reconciliation requires the full permission combination',async({page})=>{
  const writes:string[]=[];await openMonitoring(page,{permissions:without('platform.vendors.read'),onCall:(m,p)=>{if(m==='POST')writes.push(p);}});
  await expect(reconcile(page).getByRole('button',{name:'Run notification reconciliation'})).toBeDisabled();
  await expect(reconcile(page)).toContainText('Manual reconciliation is disabled');expect(writes).toHaveLength(0);
 });
 test('PIM-029 Notification reconciliation success renders synthetic touch counts',async({page})=>{
  const writes:string[]=[];await openMonitoring(page,{onCall:(m,p)=>{if(m==='POST')writes.push(p);}});
  await reconcile(page).getByRole('button',{name:'Run notification reconciliation'}).click();
  await expect(reconcile(page)).toContainText('Reconciliation complete.');
  await expect(reconcile(page)).toContainText('2 recorded risks; 2 notifications touched (1 created, 1 refreshed, 0 auto-resolved)');
  expect(writes).toContain('/platform/notifications/integration-monitoring-scan');
 });
 test('PIM-030 Notification reconciliation failure is visible without claiming delivery or persistence',async({page})=>{
  await openMonitoring(page,{responses:{'POST /platform/notifications/integration-monitoring-scan':{status:503,json:{message:'Synthetic scan failed'}}}});
  await reconcile(page).getByRole('button',{name:'Run notification reconciliation'}).click();
  await expect(reconcile(page)).toContainText('Reconciliation failed.');await expect(reconcile(page)).toContainText('Synthetic scan failed');
 });
});
