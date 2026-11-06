/** Batch 94 — Audit Retention /platform/audit-retention, 41 synthetic declarations.
 * STRICT PHASE 1: no real deletion, legal compliance, PostgreSQL, backups,
 * export delivery or tenant-scope assertions may be claimed as verified. */
import {test,expect,type Page} from '@playwright/test';
import {openAuditRetention,retentionEndpoint,retentionPermissions,
 heldTenant,archivedTenant,emptyAuditTenant,retentionTenantA,retentionTenantB,
 manyRetentionTenants} from '../../../support/platformAuditRetentionFixture';
const root=(p:Page)=>p.locator('.platform-audit-retention');
const card=(p:Page,name:string)=>root(p).locator('article.platform-audit-retention__card').filter({hasText:name});
const filter=(p:Page)=>root(p).locator('.platform-audit-retention__filters');
const pager=(p:Page)=>root(p).locator('.platform-audit-retention__pager');
const without=(...rights:string[])=>retentionPermissions.filter(p=>!rights.includes(p));
const requests=(calls:string[]) => (m:string,p:string,q:URLSearchParams)=>{if(m==='GET'&&p===retentionEndpoint)calls.push(q.toString());};
test.describe('Platform Audit Retention — application evidence only (BATCH_094_GENERATED_UNRUN)',()=>{
 test('PARET-001 Page identifies read-only governance and evidence boundary',async({page})=>{
  await openAuditRetention(page);await expect(root(page)).toContainText('Read-only governance');
  await expect(root(page)).toContainText('does not delete audit logs');await expect(root(page)).toContainText('Read only');
 });
 test('PARET-002 Missing AUDIT_READ blocks route and policy GET',async({page})=>{
  let n=0;await openAuditRetention(page,{permissions:without('platform.audit.read'),expectHeading:false,
   onCall:(m,p)=>{if(m==='GET'&&p===retentionEndpoint)n++;}});
  await expect(root(page)).toHaveCount(0);expect(n).toBe(0);
 });
 test('PARET-003 Missing TENANTS_READ blocks route and policy GET',async({page})=>{
  let n=0;await openAuditRetention(page,{permissions:without('platform.tenants.read'),expectHeading:false,
   onCall:(m,p)=>{if(m==='GET'&&p===retentionEndpoint)n++;}});
  await expect(root(page)).toHaveCount(0);expect(n).toBe(0);
 });
 test('PARET-004 Initial policy read uses 50 limit and zero offset',async({page})=>{
  const calls:string[]=[];await openAuditRetention(page,{onCall:requests(calls)});
  await expect.poll(()=>calls.length).toBeGreaterThan(0);const q=new URLSearchParams(calls.at(-1));
  expect(q.get('limit')).toBe('50');expect(q.get('offset')).toBe('0');
 });
 test('PARET-005 No retention delete or write action is exposed',async({page})=>{
  await openAuditRetention(page);for(const label of ['Delete','Purge','Save','Run purge','Create'])
   await expect(root(page).getByRole('button',{name:label,exact:true})).toHaveCount(0);
 });
 test('PARET-006 Registry displays synthetic tenant labels and statuses',async({page})=>{
  await openAuditRetention(page);await expect(card(page,'Alpha Sample Tenant')).toContainText('active');
  await expect(card(page,'Beta Archive Tenant')).toContainText('archived');
 });
 test('PARET-007 Active legal hold is visibly distinguished',async({page})=>{
  await openAuditRetention(page);await expect(card(page,'Alpha Sample Tenant')).toContainText('Legal hold');
  await expect(card(page,'Alpha Sample Tenant')).toContainText('Synthetic litigation hold');
 });
 test('PARET-008 Non-held record is explicitly No hold',async({page})=>{
  await openAuditRetention(page);await expect(card(page,'Beta Archive Tenant')).toContainText('No hold');
 });
 test('PARET-009 Due tenant has Review due and threshold explanation',async({page})=>{
  await openAuditRetention(page);await expect(card(page,'Alpha Sample Tenant')).toContainText('Review due');
  await expect(card(page,'Alpha Sample Tenant')).toContainText('Audit age threshold reached');
 });
 test('PARET-010 Non-due tenant has Threshold clear',async({page})=>{
  await openAuditRetention(page);await expect(card(page,'Beta Archive Tenant')).toContainText('Threshold clear');
 });
 test('PARET-011 Legal hold controls purge-blocker presentation',async({page})=>{
  await openAuditRetention(page);await expect(card(page,'Alpha Sample Tenant')).toContainText('Legal hold active');
  await expect(card(page,'Beta Archive Tenant')).toContainText('No application hold');
 });
 test('PARET-012 Write locked archived tenant is not itself marked purged',async({page})=>{
  await openAuditRetention(page);await expect(card(page,'Beta Archive Tenant')).toContainText('tenant writes locked');
  await expect(card(page,'Beta Archive Tenant')).toContainText('No application hold');
 });
 test('PARET-013 Standard policy shows 365-day review threshold',async({page})=>{
  await openAuditRetention(page);await expect(card(page,'Alpha Sample Tenant')).toContainText('365 days');
  await expect(card(page,'Alpha Sample Tenant')).toContainText('standard application policy');
 });
 test('PARET-014 Extended policy shows 2555-day application threshold',async({page})=>{
  await openAuditRetention(page);await expect(card(page,'Beta Archive Tenant')).toContainText('2555 days');
  await expect(card(page,'Beta Archive Tenant')).toContainText('extended application policy');
 });
 test('PARET-015 Archive event count distinguished from summary-only count',async({page})=>{
  await openAuditRetention(page);await expect(card(page,'Alpha Sample Tenant')).toContainText('2 summary-only package(s)');
  await expect(card(page,'Beta Archive Tenant')).toContainText('0 summary-only package(s)');
 });
 test('PARET-016 Due review with missing full archive produces risk label',async({page})=>{
  await openAuditRetention(page);await expect(card(page,'Alpha Sample Tenant')).toContainText('Full archive evidence missing for due review');
 });
 test('PARET-017 Empty audit event history is not evidence of backup absence',async({page})=>{
  await openAuditRetention(page);await expect(card(page,'Gamma Empty Tenant')).toContainText('No tenant-linked audit events');
  await expect(root(page)).toContainText('Absence of application audit rows');
 });
 test('PARET-018 Legal hold count is a recorded application metric only',async({page})=>{
  await openAuditRetention(page);await expect(root(page).getByLabel('Audit retention summary')).toContainText('Legal holds');
  await expect(root(page)).toContainText('Application-recorded active holds');
 });
 test('PARET-019 Summary distinguishes full archive evidence from due archive gaps',async({page})=>{
  await openAuditRetention(page);await expect(root(page).getByLabel('Audit retention summary')).toContainText('Full archive evidence');
  await expect(root(page).getByLabel('Audit retention summary')).toContainText('Due archive gaps');
 });
 test('PARET-020 Missing Data Retention read redacts review and legal-hold metrics',async({page})=>{
  await openAuditRetention(page,{permissions:without('platform.data_retention.read')});
  await expect(root(page)).toContainText('Evidence is permission-scoped.');
  await expect(card(page,'Alpha Sample Tenant')).toContainText('Hold restricted');
  await expect(card(page,'Alpha Sample Tenant')).toContainText('Due state restricted');
 });
 test('PARET-021 Missing Data Retention read redacts threshold and retain-until fields',async({page})=>{
  await openAuditRetention(page,{permissions:without('platform.data_retention.read')});
  await expect(card(page,'Alpha Sample Tenant')).toContainText('Retention policy restricted');
  await expect(card(page,'Alpha Sample Tenant')).not.toContainText('Synthetic litigation hold');
 });
 test('PARET-022 Missing tenant export permission redacts full archive counts',async({page})=>{
  await openAuditRetention(page,{permissions:without('platform.tenants.export')});
  await expect(card(page,'Alpha Sample Tenant')).toContainText('Summary evidence restricted');
  await expect(root(page)).toContainText('tenant export audit');
 });
 test('PARET-023 Without exports permission, no Tenant Exports supporting link',async({page})=>{
  await openAuditRetention(page,{permissions:without('platform.tenants.export')});
  await expect(root(page).getByRole('link',{name:'Tenant exports'})).toHaveCount(0);
 });
 test('PARET-024 Data retention supporting link has independent permission',async({page})=>{
  await openAuditRetention(page,{permissions:without('platform.data_retention.read')});
  await expect(root(page).getByRole('link',{name:'Data retention'})).toHaveCount(0);
 });
 test('PARET-025 Compliance export link requires compliance read permission',async({page})=>{
  await openAuditRetention(page,{permissions:without('platform.compliance.read')});
  await expect(root(page).getByRole('link',{name:'Compliance export'})).toHaveCount(0);
 });
 test('PARET-026 Tenant audit link passes exact tenant_id deep link',async({page})=>{
  await openAuditRetention(page);await expect(card(page,'Alpha Sample Tenant').getByRole('link',{name:'Tenant audit'}))
   .toHaveAttribute('href',`/platform/audit?tenant_id=${retentionTenantA}`);
 });
 test('PARET-027 Data retention link carries exact tenant ID when allowed',async({page})=>{
  await openAuditRetention(page);await expect(card(page,'Beta Archive Tenant').getByRole('link',{name:'Data retention'}))
   .toHaveAttribute('href',`/platform/data-retention?tenant_id=${retentionTenantB}`);
 });
 test('PARET-028 Tenant dropdown changes policy query and resets page offset',async({page})=>{
  const calls:string[]=[];await openAuditRetention(page,{query:'offset=50',records:manyRetentionTenants(55),onCall:requests(calls)});
  await filter(page).getByLabel('Tenant').selectOption({index:1});
  await expect.poll(()=>calls.length).toBeGreaterThan(1);const q=new URLSearchParams(calls.at(-1));
  expect(q.has('tenant_id')).toBe(true);expect(q.get('offset')).toBe('0');
 });
 test('PARET-029 Search is live URL-scoped and trims request value',async({page})=>{
  const calls:string[]=[];await openAuditRetention(page,{onCall:requests(calls)});
  await filter(page).getByLabel('Search').fill('  beta  ');
  await expect.poll(()=>new URLSearchParams(calls.at(-1)).get('search')).toBe('beta');
  await expect(card(page,'Beta Archive Tenant')).toBeVisible();
  await expect(card(page,'Alpha Sample Tenant')).toHaveCount(0);
 });
 test('PARET-030 Search supports tenant status in synthetic backend filter',async({page})=>{
  await openAuditRetention(page,{query:'search=archived'});
  await expect(card(page,'Beta Archive Tenant')).toBeVisible();
  await expect(card(page,'Alpha Sample Tenant')).toHaveCount(0);
 });
 test('PARET-031 Empty search result displays empty explanation, not a fake error',async({page})=>{
  await openAuditRetention(page,{query:'search=not-found'});
  await expect(root(page)).toContainText('No tenants match these filters.');
  await expect(root(page).locator('.platform-audit-retention__blocking-error')).toHaveCount(0);
 });
 test('PARET-032 Clear filters removes tenant and search constraints',async({page})=>{
  await openAuditRetention(page,{query:`search=Alpha&tenant_id=${retentionTenantA}`});
  await filter(page).getByRole('button',{name:'Clear filters'}).click();
  expect(new URL(page.url()).search).toBe('');await expect(card(page,'Beta Archive Tenant')).toBeVisible();
 });
 test('PARET-033 Next page keeps server-size 50 and offset 50',async({page})=>{
  const calls:string[]=[];await openAuditRetention(page,{records:manyRetentionTenants(55),onCall:requests(calls)});
  await pager(page).getByRole('button',{name:'Next'}).click();
  await expect(pager(page)).toContainText('51–55 of 55');
  const q=new URLSearchParams(calls.at(-1));expect(q.get('offset')).toBe('50');expect(q.get('limit')).toBe('50');
 });
 test('PARET-034 Previous returns to offset zero and first page',async({page})=>{
  await openAuditRetention(page,{query:'offset=50',records:manyRetentionTenants(55)});
  await pager(page).getByRole('button',{name:'Previous'}).click();
  await expect(pager(page)).toContainText('1–50 of 55');
 });
 test('PARET-035 Previous is disabled on first page',async({page})=>{
  await openAuditRetention(page);await expect(pager(page).getByRole('button',{name:'Previous'})).toBeDisabled();
 });
 test('PARET-036 Next disabled at final page',async({page})=>{
  await openAuditRetention(page,{query:'offset=50',records:manyRetentionTenants(55)});
  await expect(pager(page).getByRole('button',{name:'Next'})).toBeDisabled();
 });
 test('PARET-037 Initial policy failure shows Retry and no fabricated registry',async({page})=>{
  await openAuditRetention(page,{overrides:{'GET /platform/audit-retention/policy':{status:503,json:{message:'Retention evidence unavailable'}}}});
  await expect(root(page)).toContainText('Audit retention evidence could not be loaded.');
  await expect(root(page).getByRole('button',{name:'Retry'})).toBeVisible();
  await expect(root(page).locator('article.platform-audit-retention__card')).toHaveCount(0);
 });
 test('PARET-038 Retry after temporary policy failure reloads registry',async({page})=>{
  let broken=true;await openAuditRetention(page,{respond:(m,p)=>m==='GET'&&p===retentionEndpoint&&broken?{status:503,json:{message:'Temporary failure'}}:undefined});
  await expect(root(page).getByRole('button',{name:'Retry'})).toBeVisible();broken=false;
  await root(page).getByRole('button',{name:'Retry'}).click();
  await expect(card(page,'Alpha Sample Tenant')).toBeVisible();
 });
 test('PARET-039 Refresh failure keeps last policy snapshot with warning',async({page})=>{
  let broken=false;await openAuditRetention(page,{respond:(m,p)=>m==='GET'&&p===retentionEndpoint&&broken?{status:503,json:{message:'Refresh unavailable'}}:undefined});
  await expect(card(page,'Alpha Sample Tenant')).toBeVisible();broken=true;
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(root(page)).toContainText('Showing the last successful snapshot.');
  await expect(card(page,'Alpha Sample Tenant')).toBeVisible();
 });
 test('PARET-040 Refresh disables itself while policy fetch is in flight',async({page})=>{
  let block=false;let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  await openAuditRetention(page,{respond:async(m,p)=>{if(m==='GET'&&p===retentionEndpoint&&block)await gate;return undefined;}});
  await expect(card(page,'Alpha Sample Tenant')).toBeVisible();block=true;
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(root(page).getByRole('button',{name:'Refreshing…'})).toBeDisabled();release();
  await expect(root(page).getByRole('button',{name:'Refresh'})).toBeEnabled();
 });
 test('PARET-041 Evidence boundary labels threshold, delivery, deletion and backup limits',async({page})=>{
  await openAuditRetention(page);
  const section=root(page).locator('.platform-audit-retention__truth');
  await expect(section).toContainText('not legal advice');
  await expect(section).toContainText('does not prove data was deleted');
  await expect(section).toContainText('does not prove secure external delivery');
  await expect(section).toContainText('backups');
 });
 // Batch 95 — continue the reserved, source-reviewed audit-retention scenarios.
 test('PARET-042 Refresh recovers policy GET while preserving tenant URL scope',async({page})=>{
  let failed=false;const calls:string[]=[];
  await openAuditRetention(page,{query:`tenant_id=${retentionTenantA}`,
   onCall:requests(calls),respond:(m,p)=>m==='GET'&&p===retentionEndpoint&&failed?{status:503,json:{message:'Audit snapshot temporarily unavailable'}}:undefined});
  await expect(card(page,'Alpha Sample Tenant')).toBeVisible();failed=true;
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(root(page)).toContainText('Showing the last successful snapshot.');
  failed=false;await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(root(page).locator('.platform-audit-retention__warning')).not.toContainText('Showing the last successful snapshot.');
  await expect(card(page,'Alpha Sample Tenant')).toBeVisible();expect(new URL(page.url()).searchParams.get('tenant_id')).toBe(retentionTenantA);
  expect(new URLSearchParams(calls.at(-1)).get('tenant_id')).toBe(retentionTenantA);
 });
 test('PARET-043 Search resets offset while preserving selected tenant',async({page})=>{
  const calls:string[]=[];await openAuditRetention(page,{query:`tenant_id=${retentionTenantA}&offset=50`,onCall:requests(calls)});
  await filter(page).getByLabel('Search').fill('Alpha');
  await expect.poll(()=>new URLSearchParams(calls.at(-1)).get('search')).toBe('Alpha');
  const q=new URLSearchParams(calls.at(-1));expect(q.get('offset')).toBe('0');expect(q.get('tenant_id')).toBe(retentionTenantA);
 });
 test('PARET-044 A selected tenant remains selected when search narrows it',async({page})=>{
  await openAuditRetention(page,{query:`tenant_id=${retentionTenantB}`});
  await filter(page).getByLabel('Search').fill('Beta');
  await expect(card(page,'Beta Archive Tenant')).toBeVisible();
  await expect(filter(page).getByLabel('Tenant')).toHaveValue(retentionTenantB);
 });
 test('PARET-045 Clear filters drops stale offset and restores first page',async({page})=>{
  await openAuditRetention(page,{query:'search=none&offset=150',records:manyRetentionTenants(55)});
  await expect(root(page)).toContainText('No tenants match these filters.');
  await filter(page).getByRole('button',{name:'Clear filters'}).click();
  await expect(pager(page)).toContainText('1–50 of 55');expect(new URL(page.url()).searchParams.has('offset')).toBe(false);
 });
 test('PARET-046 Non-page-aligned URL offset is passed to server without client rounding',async({page})=>{
  const calls:string[]=[];await openAuditRetention(page,{query:'offset=17',records:manyRetentionTenants(72),onCall:requests(calls)});
  await expect(pager(page)).toContainText('18–67 of 72');expect(new URLSearchParams(calls.at(-1)).get('offset')).toBe('17');
 });
 test('PARET-047 A failing tenant directory GET does not zero existing policy metrics',async({page})=>{
  await openAuditRetention(page,{respond:(m,p)=>m==='GET'&&p==='/platform/tenants'?{status:503,json:{message:'Directory unavailable'}}:undefined});
  await expect(card(page,'Alpha Sample Tenant')).toContainText('17');
  await expect(root(page).getByLabel('Audit retention summary')).toContainText('With audit evidence');
  await expect(root(page).locator('.platform-audit-retention__blocking-error')).toHaveCount(0);
 });
 test('PARET-048 Refresh requests both tenant directory and policy independently',async({page})=>{
  const calls:string[]=[];await openAuditRetention(page,{onCall:(m,p)=>{if(m==='GET'&&[retentionEndpoint,'/platform/tenants'].includes(p))calls.push(p);}});
  const d=calls.filter(p=>p==='/platform/tenants').length,r=calls.filter(p=>p===retentionEndpoint).length;
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect.poll(()=>calls.filter(p=>p==='/platform/tenants').length).toBeGreaterThan(d);
  await expect.poll(()=>calls.filter(p=>p===retentionEndpoint).length).toBeGreaterThan(r);
 });
 test('PARET-049 Without data-retention read, audit count persists but hold and review are restricted',async({page})=>{
  await openAuditRetention(page,{permissions:without('platform.data_retention.read')});
  await expect(card(page,'Alpha Sample Tenant')).toContainText('Hold restricted');
  await expect(card(page,'Alpha Sample Tenant')).toContainText('Due state restricted');
  await expect(card(page,'Alpha Sample Tenant').locator('.platform-audit-retention__metrics-grid')).toContainText('17');
 });
 test('PARET-050 Without export grant archives say Restricted, not zero',async({page})=>{
  await openAuditRetention(page,{permissions:without('platform.tenants.export')});
  const metrics=card(page,'Alpha Sample Tenant').locator('.platform-audit-retention__metrics-grid');
  await expect(metrics).toContainText('Full tenant archives');await expect(metrics).toContainText('Restricted');
  await expect(metrics).toContainText('Summary evidence restricted');
 });
 test('PARET-051 All evidence source permissions yield complete configured evidence pill',async({page})=>{
  await openAuditRetention(page);
  await expect(root(page)).toContainText('Complete configured evidence');
  await expect(root(page).locator('[data-state="restricted"]')).toHaveCount(0);
 });
 test('PARET-052 Absent archive permission announces partial rather than archive absence',async({page})=>{
  await openAuditRetention(page,{permissions:without('platform.tenants.export')});
  await expect(root(page)).toContainText('Permission-scoped evidence');
  await expect(root(page)).toContainText('tenant export audit');
  await expect(root(page)).not.toContainText('0 full archives present across all tenants');
 });
 test('PARET-053 Legal hold takes posture priority over due-for-review',async({page})=>{
  await openAuditRetention(page);await expect(root(page)).toContainText('Hold present');
  await expect(card(page,'Alpha Sample Tenant')).toContainText('Review due');
 });
 test('PARET-054 No audit-event tenant does not fabricate a full-archive gap',async({page})=>{
  await openAuditRetention(page);await expect(card(page,'Gamma Empty Tenant')).toContainText('No tenant-linked audit events');
  await expect(card(page,'Gamma Empty Tenant')).not.toContainText('Full archive evidence missing for due review');
 });
 test('PARET-055 Extended day threshold remains documented as an application-only value',async({page})=>{
  await openAuditRetention(page);
  await expect(card(page,'Beta Archive Tenant')).toContainText('2555 days');
  await expect(root(page).locator('.platform-audit-retention__truth')).toContainText('not legal advice');
 });
 test('PARET-056 An archive-generation counter is not external receipt evidence',async({page})=>{
  await openAuditRetention(page);
  await expect(card(page,'Beta Archive Tenant')).toContainText('Full tenant archives');
  await expect(root(page).locator('.platform-audit-retention__truth')).toContainText('does not prove secure external delivery');
 });
 test('PARET-057 Full archives and summary-only exports have distinct counts',async({page})=>{
  await openAuditRetention(page);
  await expect(card(page,'Alpha Sample Tenant')).toContainText('2 summary-only package(s)');
  await expect(card(page,'Beta Archive Tenant')).toContainText('0 summary-only package(s)');
  await expect(root(page)).toContainText('summary-only export is not full row-data archive evidence');
 });
 test('PARET-058 Unknown risk codes use a readable string fallback',async({page})=>{
  await openAuditRetention(page,{records:[{...heldTenant,risk_flags:['unrecognized_policy_flag']} ]});
  await expect(card(page,'Alpha Sample Tenant')).toContainText('unrecognized policy flag');
 });
 test('PARET-059 Missing and invalid timestamps display Not recorded',async({page})=>{
  await openAuditRetention(page,{records:[{...heldTenant,first_audit_event_at:null,last_audit_event_at:'not-a-date'}]});
  await expect(card(page,'Alpha Sample Tenant').locator('.platform-audit-retention__metrics-grid')).toContainText('Not recorded → Not recorded');
 });
 test('PARET-060 No retention permission displays Restricted threshold not zero days',async({page})=>{
  await openAuditRetention(page,{permissions:without('platform.data_retention.read')});
  const metrics=card(page,'Alpha Sample Tenant').locator('.platform-audit-retention__metrics-grid');
  await expect(metrics).toContainText('Review threshold');await expect(metrics).toContainText('Restricted');
  await expect(metrics).not.toContainText('0 days');
 });
 test('PARET-061 Missing audit age displays Not available',async({page})=>{
  await openAuditRetention(page,{records:[emptyAuditTenant]});
  await expect(card(page,'Gamma Empty Tenant')).toContainText('Not available');
 });
 test('PARET-062 Source-returned empty flags render no visible retention flags',async({page})=>{
  await openAuditRetention(page,{records:[archivedTenant]});
  await expect(card(page,'Beta Archive Tenant')).toContainText('No visible retention flags');
 });
 test('PARET-063 Tenant write lock is not a substitute for legal hold',async({page})=>{
  await openAuditRetention(page,{records:[{...heldTenant,write_locked:true}]});
  await expect(card(page,'Alpha Sample Tenant')).toContainText('tenant writes locked');
  await expect(card(page,'Alpha Sample Tenant')).toContainText('Legal hold active');
  await expect(root(page).locator('.platform-audit-retention__truth')).toContainText('does not prove data was deleted');
 });
 // Deferred acceptance cannot be demonstrated by synthetic interception; keep explicit test.skip declarations.
 test.skip('PARET-064 Invalid tenant UUID must be rejected by actual Joi backend validation',async()=>{});
 test.skip('PARET-065 Backend enforces independent AUDIT_READ and TENANTS_READ checks',async()=>{});
 test.skip('PARET-066 Real backend limit and offset bounds reject out-of-range policy queries',async()=>{});
 test.skip('PARET-067 Actual principal scope prevents cross-tenant audit policy access',async()=>{});
 test.skip('PARET-068 SQL permissions actually redact retention and export evidence',async()=>{});
 test.skip('PARET-069 PostgreSQL timestamps and calendar boundaries classify audit age correctly',async()=>{});
 test.skip('PARET-070 Real legal hold and purge blocker remain correct under concurrency',async()=>{});
 test.skip('PARET-071 Stored audit events distinguish full archives from preview-only packages',async()=>{});
 test.skip('PARET-072 Real summary and page totals reconcile across principal-scoped filters',async()=>{});
 test.skip('PARET-073 Read-only audit policy endpoint never invokes an actual purge',async()=>{});
 test.skip('PARET-074 Retention is independently verified in backups replicas and external copies',async()=>{});
 test.skip('PARET-075 Actual archive delivery receipt and acceptance evidence is verified',async()=>{});
 test.skip('PARET-076 Historical audit provenance and legal retention obligations receive independent review',async()=>{});
 test.skip('PARET-077 Actual user identity and tenant status access are redacted by server permissions',async()=>{});
 test.skip('PARET-078 Malformed real policy payload never causes raw UI crash or false governed state',async()=>{});
 test.skip('PARET-079 Concurrent policy updates preserve deterministic bounded reads in real database',async()=>{});
 test.skip('PARET-080 Application review thresholds are not represented as legal certification in live acceptance',async()=>{});

 // Batch 154: hostile-shaped fixture strings are DOM text, not archive or legal-hold verification.
 test('PARET-081 Tenant name with HTML-shaped input is rendered as inert text',async({page})=>{
  const payload='<img src=x onerror=alert(1)> Tenant';
  await openAuditRetention(page,{records:[{...heldTenant,tenant_name:payload}]});
  await expect(card(page,payload)).toBeVisible();
  await expect(card(page,payload).locator('img,iframe,script')).toHaveCount(0);
 });
 test('PARET-082 Legal hold reason cannot inject markup into the audit-evidence card',async({page})=>{
  const payload='<svg onload=alert(1)> evidence';
  await openAuditRetention(page,{records:[{...heldTenant,legal_hold_reason:payload}]});
  await expect(card(page,'Alpha Sample Tenant').locator('.platform-audit-retention__note')).toContainText(payload);
  await expect(card(page,'Alpha Sample Tenant').locator('svg,iframe,script')).toHaveCount(0);
  await expect(root(page).locator('.platform-audit-retention__truth')).toContainText('not legal advice');
 });

});
