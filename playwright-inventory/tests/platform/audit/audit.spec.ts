/** Batch 93 — Platform Audit /platform/audit; 41 synthetic generated, UNRUN declarations.
 * This page is not the Tenant Audit or Platform Permission Audit page. A recorded
 * control-plane event does not prove external outcome, notification, export compliance,
 * immutable database retention, tenant isolation, or live source authorization. */
import {test,expect,type Page} from '@playwright/test';
import {openPlatformAudit,auditRoot,auditPermissions,auditTenantA,auditActor,auditTarget,
 tenantAuditEvent,incidentAuditEvent,nativeAuditEvent,manyAuditEvents} from '../../../support/platformAuditFixture';
const root=(p:Page)=>p.locator('.platform-audit');
const form=(p:Page)=>root(p).locator('form.platform-audit__filters');
const evidence=(p:Page)=>root(p).locator('section.platform-audit__section').filter({has:p.getByRole('heading',{name:'Audit evidence',exact:true})});
const table=(p:Page)=>evidence(p).locator('table');
const rows=(p:Page)=>table(p).locator('tbody tr');
const row=(p:Page,action:string)=>rows(p).filter({hasText:action});
const pagination=(p:Page)=>evidence(p).locator('.platform-audit__pagination');
const omit=(...names:string[])=>auditPermissions.filter(p=>!names.includes(p));
test.describe('Platform Audit — immutable application control-plane evidence (BATCH_093_GENERATED_UNRUN)',()=>{
 test('PAUD-001 Page labels recorded control-plane evidence rather than external outcome',async({page})=>{
  await openPlatformAudit(page);await expect(root(page)).toContainText('Immutable control-plane application evidence');
  await expect(root(page)).toContainText('Read only');
 });
 test('PAUD-002 Without AUDIT_READ guarded route does not request audit events',async({page})=>{
  let calls=0;await openPlatformAudit(page,{permissions:omit('platform.audit.read'),expectHeading:false,
   onCall:(m,p)=>{if(m==='GET'&&p===auditRoot)calls++;}});
  await expect(root(page)).toHaveCount(0);expect(calls).toBe(0);
 });
 test('PAUD-003 Initial audit GET is bounded to fifty and zero offset',async({page})=>{
  const seen:string[]=[];await openPlatformAudit(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===auditRoot)seen.push(q.toString());}});
  await expect.poll(()=>seen.length).toBeGreaterThan(0);const q=new URLSearchParams(seen.at(-1));
  expect(q.get('limit')).toBe('50');expect(q.get('offset')).toBe('0');
 });
 test('PAUD-004 Read-only evidence page has no mutation actions',async({page})=>{
  await openPlatformAudit(page);for(const action of ['Create','Delete','Save','Archive'])
   await expect(root(page).getByRole('button',{name:action,exact:true})).toHaveCount(0);
 });
 test('PAUD-005 Sample recorded event exposes source and exact action',async({page})=>{
  await openPlatformAudit(page);const r=row(page,tenantAuditEvent.action);
  await expect(r).toContainText('tenants');await expect(r).toContainText(tenantAuditEvent.action);
 });
 test('PAUD-006 Event metadata renders recorded key/value without outcome inference',async({page})=>{
  await openPlatformAudit(page);const r=row(page,tenantAuditEvent.action);
  await expect(r.locator('.platform-audit__metadata')).toContainText('label updated');
  await expect(root(page)).toContainText('does not prove');
 });
 test('PAUD-007 Missing metadata is labeled Not recorded',async({page})=>{
  await openPlatformAudit(page);await expect(row(page,nativeAuditEvent.action)).toContainText('No metadata recorded');
 });
 test('PAUD-008 Actor name and email display with platform.users.read grant',async({page})=>{
  await openPlatformAudit(page);const r=row(page,tenantAuditEvent.action);
  await expect(r).toContainText('Synthetic Operator');await expect(r).toContainText('operator@fixture.test');
 });
 test('PAUD-009 Actor identity shows Restricted without independent users grant',async({page})=>{
  await openPlatformAudit(page,{permissions:omit('platform.users.read')});
  await expect(row(page,tenantAuditEvent.action)).toContainText('Restricted');
  await expect(row(page,tenantAuditEvent.action)).not.toContainText('operator@fixture.test');
  await expect(root(page).getByLabel('Platform Audit evidence summary')).toContainText('Restricted');
 });
 test('PAUD-010 Tenant identity displays tenant name when independently authorized',async({page})=>{
  await openPlatformAudit(page);await expect(row(page,tenantAuditEvent.action)).toContainText('Alpha Sample Tenant');
 });
 test('PAUD-011 Tenant identity shows Restricted without tenants read grant',async({page})=>{
  await openPlatformAudit(page,{permissions:omit('platform.tenants.read')});
  await expect(row(page,incidentAuditEvent.action)).toContainText('Restricted');
  await expect(row(page,incidentAuditEvent.action)).not.toContainText('Beta Sample Tenant');
 });
 test('PAUD-012 Actor and tenant aggregate sections stay Restricted independently',async({page})=>{
  await openPlatformAudit(page,{permissions:omit('platform.users.read','platform.tenants.read')});
  await expect(root(page)).toContainText('PLATFORM_USERS_READ required');
  await expect(root(page)).toContainText('TENANTS_READ required');
 });
 test('PAUD-013 Restricted source family is omitted, not reported as zero events',async({page})=>{
  await openPlatformAudit(page,{permissions:omit('platform.incidents.read')});
  await expect(root(page)).toContainText('Partial evidence:');
  await expect(root(page)).toContainText('incidents');
  await expect(row(page,incidentAuditEvent.action)).toHaveCount(0);
 });
 test('PAUD-014 Source selector includes authorized Incidents option',async({page})=>{
  await openPlatformAudit(page);await expect(form(page).getByLabel('Source')).toContainText('Incidents');
 });
 test('PAUD-015 Source selector excludes Incidents without its read grant',async({page})=>{
  await openPlatformAudit(page,{permissions:omit('platform.incidents.read')});
  await expect(form(page).getByLabel('Source')).not.toContainText('Incidents');
 });
 test('PAUD-016 Tenant exports source requires both tenants and export grant',async({page})=>{
  await openPlatformAudit(page,{permissions:omit('platform.tenants.export')});
  await expect(form(page).getByLabel('Source')).not.toContainText('Tenant exports');
 });
 test('PAUD-017 Separate tenant filter is hidden without TENANTS_READ',async({page})=>{
  await openPlatformAudit(page,{permissions:omit('platform.tenants.read')});
  await expect(form(page)).toContainText('Tenant filter restricted');
  await expect(form(page).getByLabel('Tenant ID')).toHaveCount(0);
 });
 test('PAUD-018 Separate actor filter is hidden without PLATFORM_USERS_READ',async({page})=>{
  await openPlatformAudit(page,{permissions:omit('platform.users.read')});
  await expect(form(page)).toContainText('Actor filter restricted');
  await expect(form(page).getByLabel('Platform user ID')).toHaveCount(0);
 });
 test('PAUD-019 Source filter submits exact authorized source and resets offset',async({page})=>{
  const req:string[]=[];await openPlatformAudit(page,{query:'offset=50',records:manyAuditEvents(55),onCall:(m,p,q)=>{if(m==='GET'&&p===auditRoot)req.push(q.toString());}});
  await form(page).getByLabel('Source').selectOption('tenants');await form(page).getByRole('button',{name:'Apply filters'}).click();
  const q=new URLSearchParams(req.at(-1));expect(q.get('source')).toBe('tenants');expect(q.get('offset')).toBe('0');
 });
 test('PAUD-020 Action filter returns matching action only',async({page})=>{
  await openPlatformAudit(page);await form(page).getByLabel('Action').fill('platform_incident.update');
  await form(page).getByRole('button',{name:'Apply filters'}).click();
  await expect(row(page,incidentAuditEvent.action)).toBeVisible();await expect(row(page,tenantAuditEvent.action)).toHaveCount(0);
 });
 test('PAUD-021 Exact target type and UUID filter are emitted unchanged',async({page})=>{
  const req:string[]=[];await openPlatformAudit(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===auditRoot)req.push(q.toString());}});
  await form(page).getByLabel('Target type').fill('tenant');await form(page).getByLabel('Target ID').fill(auditTarget);
  await form(page).getByRole('button',{name:'Apply filters'}).click();
  const q=new URLSearchParams(req.at(-1));expect(q.get('target_type')).toBe('tenant');expect(q.get('target_id')).toBe(auditTarget);
 });
 test('PAUD-022 Invalid target UUID disables applying filters with validation message',async({page})=>{
  await openPlatformAudit(page);await form(page).getByLabel('Target ID').fill('not-a-uuid');
  await expect(form(page).getByRole('button',{name:'Apply filters'})).toBeDisabled();
  await expect(form(page)).toContainText('Use valid UUIDs');
 });
 test('PAUD-023 Invalid tenant UUID disables filter submission',async({page})=>{
  await openPlatformAudit(page);await form(page).getByLabel('Tenant ID').fill('fake-tenant');
  await expect(form(page).getByRole('button',{name:'Apply filters'})).toBeDisabled();
 });
 test('PAUD-024 Invalid actor UUID disables filter submission',async({page})=>{
  await openPlatformAudit(page);await form(page).getByLabel('Platform user ID').fill('fake-actor');
  await expect(form(page).getByRole('button',{name:'Apply filters'})).toBeDisabled();
 });
 test('PAUD-025 Date interval with start after end is rejected client-side',async({page})=>{
  await openPlatformAudit(page);await form(page).getByLabel('From').fill('2026-01-12T10:00');
  await form(page).getByLabel('To').fill('2026-01-10T10:00');
  await expect(form(page).getByRole('button',{name:'Apply filters'})).toBeDisabled();
 });
 test('PAUD-026 Applying valid date range emits ISO timestamps',async({page})=>{
  const req:string[]=[];await openPlatformAudit(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===auditRoot)req.push(q.toString());}});
  await form(page).getByLabel('From').fill('2026-01-01T08:00');await form(page).getByLabel('To').fill('2026-02-01T08:00');
  await form(page).getByRole('button',{name:'Apply filters'}).click();
  const q=new URLSearchParams(req.at(-1));expect(q.get('from')).toContain('2026-01-01T');expect(q.get('to')).toContain('2026-02-01T');
 });
 test('PAUD-027 Search field is draft-only until Apply filters is submitted',async({page})=>{
  const req:string[]=[];await openPlatformAudit(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===auditRoot)req.push(q.toString());}});
  const before=req.length;await form(page).getByLabel('Search').fill('tenant.update');
  expect(req.length).toBe(before);await form(page).getByRole('button',{name:'Apply filters'}).click();
  expect(new URL(page.url()).searchParams.get('search')).toBe('tenant.update');
 });
 test('PAUD-028 Search supports recorded action text in synthetic events',async({page})=>{
  await openPlatformAudit(page,{query:'search=platform_incident'});
  await expect(row(page,incidentAuditEvent.action)).toBeVisible();await expect(row(page,tenantAuditEvent.action)).toHaveCount(0);
 });
 test('PAUD-029 Legacy entity_type and entity_id deep links are accepted',async({page})=>{
  const req:string[]=[];await openPlatformAudit(page,{query:`entity_type=tenant&entity_id=${auditTarget}`,onCall:(m,p,q)=>{if(m==='GET'&&p===auditRoot)req.push(q.toString());}});
  const q=new URLSearchParams(req.at(-1));expect(q.get('target_type')).toBe('tenant');expect(q.get('target_id')).toBe(auditTarget);
 });
 test('PAUD-030 Applying filters removes legacy entity aliases',async({page})=>{
  await openPlatformAudit(page,{query:`entity_type=tenant&entity_id=${auditTarget}`});
  await form(page).getByRole('button',{name:'Apply filters'}).click();
  expect(new URL(page.url()).searchParams.has('entity_type')).toBe(false);
  expect(new URL(page.url()).searchParams.has('entity_id')).toBe(false);
 });
 test('PAUD-031 Legacy category is visible until explicitly cleared',async({page})=>{
  await openPlatformAudit(page,{query:'category=tenant'});
  await expect(root(page)).toContainText('Legacy category filter active:');
  await root(page).getByRole('button',{name:'Clear category'}).click();
  expect(new URL(page.url()).searchParams.has('category')).toBe(false);
 });
 test('PAUD-032 Clear filters resets all filter parameters',async({page})=>{
  await openPlatformAudit(page,{query:'source=tenants&action=tenant.update&offset=50'});
  await root(page).getByRole('button',{name:'Clear filters'}).click();
  expect(new URL(page.url()).search).toBe('');
 });
 test('PAUD-033 Fifty-row pagination advances offset to 50',async({page})=>{
  const req:string[]=[];await openPlatformAudit(page,{records:manyAuditEvents(54),onCall:(m,p,q)=>{if(m==='GET'&&p===auditRoot)req.push(q.toString());}});
  await pagination(page).getByRole('button',{name:'Next'}).click();
  await expect(pagination(page)).toContainText('51–54 of 54');
  expect(new URLSearchParams(req.at(-1)).get('offset')).toBe('50');
 });
 test('PAUD-034 Previous pagination returns to first page',async({page})=>{
  await openPlatformAudit(page,{records:manyAuditEvents(54),query:'offset=50'});
  await pagination(page).getByRole('button',{name:'Previous'}).click();
  await expect(pagination(page)).toContainText('1–50 of 54');
 });
 test('PAUD-035 Empty authorized result does not imply restricted events absent',async({page})=>{
  await openPlatformAudit(page,{query:'search=not-a-real-action',permissions:omit('platform.incidents.read')});
  await expect(evidence(page)).toContainText('No authorized audit events match these filters.');
  await expect(evidence(page)).toContainText('not evidence that restricted source families contain zero events');
 });
 test('PAUD-036 Exact evidence query link preserves action and target ID',async({page})=>{
  await openPlatformAudit(page);await expect(row(page,tenantAuditEvent.action).getByRole('link',{name:'Exact evidence query'}))
   .toHaveAttribute('href',`/platform/audit?action=${encodeURIComponent(tenantAuditEvent.action)}&target_type=tenant&target_id=${auditTarget}`);
 });
 test('PAUD-037 Initial list failure shows distinct Retry without fabricated evidence',async({page})=>{
  await openPlatformAudit(page,{overrides:{'GET /platform/audit':{status:503,json:{message:'Audit read unavailable'}}}});
  await expect(root(page)).toContainText('Platform Audit failed to load.');
  await expect(root(page).getByRole('button',{name:'Retry'})).toBeVisible();
  await expect(table(page)).toHaveCount(0);
 });
 test('PAUD-038 Retry after read outage restores synthetic evidence',async({page})=>{
  let failed=true;await openPlatformAudit(page,{respond:(m,p)=>m==='GET'&&p===auditRoot&&failed?{status:503,json:{message:'Temporary read outage'}}:undefined});
  await expect(root(page).getByRole('button',{name:'Retry'})).toBeVisible();failed=false;
  await root(page).getByRole('button',{name:'Retry'}).click();
  await expect(row(page,tenantAuditEvent.action)).toBeVisible();
 });
 test('PAUD-039 Refresh error preserves last successful audit snapshot',async({page})=>{
  let failed=false;await openPlatformAudit(page,{respond:(m,p)=>m==='GET'&&p===auditRoot&&failed?{status:503,json:{message:'Refresh failed'}}:undefined});
  await expect(row(page,tenantAuditEvent.action)).toBeVisible();failed=true;
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(root(page)).toContainText('Showing the last successful snapshot.');
  await expect(row(page,tenantAuditEvent.action)).toBeVisible();
 });
 test('PAUD-040 Dismissing CSV export confirm sends no export request',async({page})=>{
  let exports=0;await openPlatformAudit(page,{onCall:(m,p)=>{if(m==='GET'&&p===auditRoot+'/export.csv')exports++;}});
  page.once('dialog',async dialog=>dialog.dismiss());
  await form(page).getByRole('button',{name:'Export CSV'}).click();expect(exports).toBe(0);
 });
 test('PAUD-041 Over-limit visible evidence warns that CSV is capped to 10000',async({page})=>{
  const sample=await (async()=>{const r=[tenantAuditEvent];return {events:r,summary:{total:{total_events:10001,first_event_at:null,last_event_at:null},
   top_actions:[],top_actors:[],top_tenants:[],sources:[],available_sources:['audit'],omitted_sources:[],evidence_access:{platform_user_identity:true,tenant_identity:true},evidence_complete:true,required_permissions_by_source:{},generated_at:'2026-11-05T10:00:00Z'},
   pagination:{limit:50,offset:0,total:10001,has_more:true},available_sources:['audit'],omitted_sources:[],evidence_access:{platform_user_identity:true,tenant_identity:true},evidence_complete:true,
   required_permissions_by_source:{},evidence_contract:{},generated_at:'2026-11-05T10:00:00Z'};})();
  await openPlatformAudit(page,{overrides:{'GET /platform/audit':{json:sample}}});
  await expect(root(page)).toContainText('CSV export is capped and will be partial.');
  let message='';page.once('dialog',async dialog=>{message=dialog.message();await dialog.dismiss();});
  await form(page).getByRole('button',{name:'Export CSV'}).click();
  expect(message).toContain('10,000');
 });
});

/** Batch 94 — PAUD-042..080. Unexecuted source-traced continuation.
 * Real source authorization, bytes, SQL and independent external outcomes
 * are Phase 2 duties; explicit skips are not claimed as browser passes. */
test.describe('Platform Audit continuation (BATCH_094_GENERATED_UNRUN)',()=>{
 test('PAUD-042 Accepted export preserves exact filters, limit 10000 and omits offset',async({page})=>{
  const seen:string[]=[];await openPlatformAudit(page,{query:'action=tenant.update&offset=50',records:manyAuditEvents(65),onCall:(m,p,q)=>{if(m==='GET'&&p===auditRoot+'/export.csv')seen.push(q.toString());}});
  page.once('dialog',d=>d.accept());await form(page).getByRole('button',{name:'Export CSV'}).click();
  await expect.poll(()=>seen.length).toBe(1);const q=new URLSearchParams(seen[0]);
  expect(q.get('limit')).toBe('10000');expect(q.has('offset')).toBe(false);expect(q.get('action')).toBe('tenant.update');
 });
 test('PAUD-043 Export rejection displays error and not success',async({page})=>{
  await openPlatformAudit(page,{overrides:{'GET /platform/audit/export.csv':{status:503,json:{message:'Audit CSV unavailable'}}}});
  page.once('dialog',d=>d.accept());await form(page).getByRole('button',{name:'Export CSV'}).click();
  await expect(root(page).locator('.platform-audit__error-text')).toBeVisible();
  await expect(root(page).locator('.platform-audit__success')).toHaveCount(0);
 });
 test('PAUD-044 Synthetic CSV acceptance displays preparation statement only',async({page})=>{
  await openPlatformAudit(page);page.once('dialog',d=>d.accept());
  await form(page).getByRole('button',{name:'Export CSV'}).click();
  await expect(root(page).locator('.platform-audit__success')).toContainText('Audit CSV prepared.');
  await expect(root(page).locator('.platform-audit__success')).toContainText('recorded in Platform Audit');
 });
 test('PAUD-045 Exporting temporarily disables export action',async({page})=>{
  let release!:()=>void;const gate=new Promise<void>(r=>{release=r});
  await openPlatformAudit(page,{respond:async(m,p)=>{if(m==='GET'&&p===auditRoot+'/export.csv'){
   await gate;return {json:{message:'finished'},status:200};}return undefined;}});
  page.once('dialog',d=>d.accept());await form(page).getByRole('button',{name:'Export CSV'}).click();
  await expect(form(page).getByRole('button',{name:'Exporting…'})).toBeDisabled();
  release();await expect(form(page).getByRole('button',{name:'Export CSV'})).toBeEnabled();
 });
 test('PAUD-046 Partial export description never claims full 10001 rows',async({page})=>{
  const total=10001;const sample={events:[tenantAuditEvent],summary:{total:{total_events:total,first_event_at:null,last_event_at:null},
   top_actions:[],top_actors:[],top_tenants:[],sources:[],available_sources:['audit'],omitted_sources:[],evidence_access:{platform_user_identity:true,tenant_identity:true},evidence_complete:true,required_permissions_by_source:{},generated_at:'2026-11-05T10:00:00Z'},
   pagination:{limit:50,offset:0,total,has_more:true},available_sources:['audit'],omitted_sources:[],evidence_access:{platform_user_identity:true,tenant_identity:true},evidence_complete:true,required_permissions_by_source:{},evidence_contract:{},generated_at:'2026-11-05T10:00:00Z'};
  await openPlatformAudit(page,{overrides:{'GET /platform/audit':{json:sample}}});page.once('dialog',d=>d.accept());
  await form(page).getByRole('button',{name:'Export CSV'}).click();
  await expect(root(page).locator('.platform-audit__success')).toContainText('newest 10,000');
  await expect(root(page).locator('.platform-audit__success')).toContainText('partial');
 });
 test('PAUD-047 Refresh disabled while read in flight',async({page})=>{
  let block=false;let release!:()=>void;const gate=new Promise<void>(r=>{release=r});
  await openPlatformAudit(page,{respond:async(m,p)=>{if(m==='GET'&&p===auditRoot&&block){await gate;}return undefined;}});
  await expect(row(page,tenantAuditEvent.action)).toBeVisible();block=true;
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(root(page).getByRole('button',{name:'Refreshing…'})).toBeDisabled();release();
  await expect(root(page).getByRole('button',{name:'Refresh'})).toBeEnabled();
 });
 test('PAUD-048 Security Center link follows security read privilege',async({page})=>{
  await openPlatformAudit(page,{permissions:omit('platform.security.read')});
  await expect(root(page).getByRole('link',{name:'Security Center'})).toHaveCount(0);
 });
 test('PAUD-049 Support Sessions link follows support session privilege',async({page})=>{
  await openPlatformAudit(page,{permissions:omit('platform.support_sessions.read')});
  await expect(root(page).getByRole('link',{name:'Support Sessions'})).toHaveCount(0);
 });
 test('PAUD-050 Tenant Exports link requires both directory and export grants',async({page})=>{
  await openPlatformAudit(page,{permissions:omit('platform.tenants.export')});
  await expect(root(page).getByRole('link',{name:'Tenant Exports'})).toHaveCount(0);
 });
 test('PAUD-051 Platform Users link requires users-read privilege',async({page})=>{
  await openPlatformAudit(page,{permissions:omit('platform.users.read')});
  await expect(root(page).getByRole('link',{name:'Platform Users'})).toHaveCount(0);
 });
 test('PAUD-052 Audit retention link requires tenant directory grant',async({page})=>{
  await openPlatformAudit(page,{permissions:omit('platform.tenants.read')});
  await expect(root(page).getByRole('link',{name:'Audit retention'})).toHaveCount(0);
 });
 test('PAUD-053 Incident link is gated independently of Security Center link',async({page})=>{
  await openPlatformAudit(page,{permissions:omit('platform.incidents.read')});
  await expect(root(page).getByRole('link',{name:'Incidents'})).toHaveCount(0);
  await expect(root(page).getByRole('link',{name:'Security Center'})).toHaveAttribute('href','/platform/security-center');
 });
 test('PAUD-054 Native audit source remains available with AUDIT_READ alone',async({page})=>{
  await openPlatformAudit(page,{permissions:['platform.audit.read']});
  await expect(form(page).getByLabel('Source')).toContainText('Audit native');
  await expect(form(page).getByLabel('Source')).not.toContainText('Incidents');
 });
 test('PAUD-055 Tenants source requires independent tenant-read grant',async({page})=>{
  await openPlatformAudit(page,{permissions:omit('platform.tenants.read')});
  await expect(form(page).getByLabel('Source')).not.toContainText('Tenants');
 });
 test('PAUD-056 Platform users source selector requires user-read grant',async({page})=>{
  await openPlatformAudit(page,{permissions:omit('platform.users.read')});
  await expect(form(page).getByLabel('Source')).not.toContainText('Platform users');
 });
 test('PAUD-057 Forged source deep-link is not re-offered as authorized selection',async({page})=>{
  await openPlatformAudit(page,{query:'source=incidents',permissions:omit('platform.incidents.read')});
  await expect(form(page).getByLabel('Source').locator('option[value="incidents"]')).toHaveCount(0);
  await expect(row(page,incidentAuditEvent.action)).toHaveCount(0);
 });
 test('PAUD-058 Invalid UUID deep link is submitted in initial GET but blocks form reapply',async({page})=>{
  const seen:string[]=[];await openPlatformAudit(page,{query:'target_id=invalid-id',onCall:(m,p,q)=>{if(m==='GET'&&p===auditRoot)seen.push(q.toString());}});
  await expect.poll(()=>seen.length).toBeGreaterThan(0);
  expect(new URLSearchParams(seen[0]).get('target_id')).toBe('invalid-id');
  await expect(form(page).getByRole('button',{name:'Apply filters'})).toBeDisabled();
 });
 test.skip('PAUD-059 Real backend must fail closed on actor filter without user-read grant',async()=>{});
 test.skip('PAUD-060 Real backend must fail closed on tenant filter without tenant-read grant',async()=>{});
 test('PAUD-061 Legacy category and exact source remain separate GET parameters',async({page})=>{
  const seen:string[]=[];await openPlatformAudit(page,{query:'category=tenant&source=audit',onCall:(m,p,q)=>{if(m==='GET'&&p===auditRoot)seen.push(q.toString());}});
  await expect.poll(()=>seen.length).toBeGreaterThan(0);const q=new URLSearchParams(seen.at(-1));
  expect(q.get('category')).toBe('tenant');expect(q.get('source')).toBe('audit');
 });
 test('PAUD-062 Reversed date inputs disable both Apply and Export actions',async({page})=>{
  await openPlatformAudit(page);await form(page).getByLabel('From').fill('2026-03-02T12:00');await form(page).getByLabel('To').fill('2026-03-01T12:00');
  await expect(form(page).getByRole('button',{name:'Apply filters'})).toBeDisabled();
  await expect(form(page).getByRole('button',{name:'Export CSV'})).toBeDisabled();
 });
 test('PAUD-063 ISO deep link date is displayed in browser local datetime inputs',async({page})=>{
  await openPlatformAudit(page,{query:'from=2026-03-01T10%3A00%3A00.000Z&to=2026-03-02T10%3A00%3A00.000Z'});
  const local=await page.evaluate(()=>{const d=new Date('2026-03-01T10:00:00.000Z');return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);});
  await expect(form(page).getByLabel('From')).toHaveValue(local);
 });
 test('PAUD-064 Search whitespace trimmed on form apply, not before',async({page})=>{
  await openPlatformAudit(page);await form(page).getByLabel('Search').fill('  tenant.update  ');
  await form(page).getByRole('button',{name:'Apply filters'}).click();
  expect(new URL(page.url()).searchParams.get('search')).toBe('tenant.update');
 });
 test('PAUD-065 Paging retains active action filter and search query',async({page})=>{
  const records=manyAuditEvents(105);await openPlatformAudit(page,{query:'search=test_event',records});
  await pagination(page).getByRole('button',{name:'Next'}).click();
  expect(new URL(page.url()).searchParams.get('search')).toBe('test_event');
  expect(new URL(page.url()).searchParams.get('offset')).toBe('50');
  await pagination(page).getByRole('button',{name:'Previous'}).click();
  expect(new URL(page.url()).searchParams.get('search')).toBe('test_event');
 });
 test('PAUD-066 Aggregate source counts are explicitly permission scoped',async({page})=>{
  await openPlatformAudit(page,{permissions:omit('platform.incidents.read')});
  await expect(root(page)).toContainText('Partial evidence:');
  await expect(root(page)).toContainText('restricted source families');
  await expect(row(page,incidentAuditEvent.action)).toHaveCount(0);
 });
 test('PAUD-067 Null aggregate actor/tenant evidence is Restricted',async({page})=>{
  await openPlatformAudit(page,{permissions:omit('platform.users.read','platform.tenants.read')});
  await expect(root(page)).toContainText('PLATFORM_USERS_READ required');
  await expect(root(page)).toContainText('TENANTS_READ required');
 });
 test.skip('PAUD-068 Malformed summary response defensive contract requires frontend hardening',async()=>{});
 test('PAUD-069 Export failure leaves filters and previous audit rows unchanged',async({page})=>{
  await openPlatformAudit(page,{query:'action=tenant.update',overrides:{'GET /platform/audit/export.csv':{status:503,json:{message:'Export unavailable'}}}});
  await expect(row(page,tenantAuditEvent.action)).toBeVisible();page.once('dialog',d=>d.accept());
  await form(page).getByRole('button',{name:'Export CSV'}).click();
  await expect(root(page).locator('.platform-audit__error-text')).toBeVisible();
  expect(new URL(page.url()).searchParams.get('action')).toBe('tenant.update');
  await expect(row(page,tenantAuditEvent.action)).toBeVisible();
 });
 test.skip('PAUD-070 Real authenticated AUDIT_READ denial verified at API layer',async()=>{});
 test.skip('PAUD-071 Forged source direct API authorization enforced by live backend',async()=>{});
 test.skip('PAUD-072 Actual row and CSV actor/tenant identity redaction verified',async()=>{});
 test.skip('PAUD-073 Two-tenant principals cannot access other tenants actual audit rows',async()=>{});
 test.skip('PAUD-074 CSV bytes verify tenant and identity scope in PostgreSQL fixtures',async()=>{});
 test.skip('PAUD-075 Real CSV 10000 cap and deterministic ordering verified',async()=>{});
 test.skip('PAUD-076 Audit database writes distinguished from real external outcomes',async()=>{});
 test.skip('PAUD-077 Audit retention and immutability inspected against actual data lifecycle',async()=>{});
 test.skip('PAUD-078 Real filter validation resists injection and replay',async()=>{});
 test.skip('PAUD-079 Concurrent audit export and recording bounded by real storage behavior',async()=>{});
 test.skip('PAUD-080 External delivery, infrastructure and legal outcomes independently evidenced',async()=>{});

 // Batch 149 — URL bounds, source-scoped metadata and legacy-filter continuity.
 test('PAUD-081 Audit metadata containing HTML syntax is displayed as inert JSON text',async({page})=>{
  const hostile='<img src=x onerror=alert(1)>';
  await openPlatformAudit(page,{records:[{...tenantAuditEvent,metadata:{operator_note:hostile}}]});
  await expect(row(page,tenantAuditEvent.action).locator('.platform-audit__metadata')).toContainText(hostile);
  await expect(row(page,tenantAuditEvent.action).locator('img,script,iframe')).toHaveCount(0);
 });
 test('PAUD-082 Actor identity HTML syntax is rendered as text only',async({page})=>{
  const hostile='<svg onload=alert(1)>';
  await openPlatformAudit(page,{records:[{...tenantAuditEvent,platform_user_name:hostile}]});
  await expect(row(page,tenantAuditEvent.action)).toContainText(hostile);
  await expect(row(page,tenantAuditEvent.action).locator('svg,script,iframe')).toHaveCount(0);
 });
 test('PAUD-083 Clearing only legacy category retains exact action and target filters',async({page})=>{
  await openPlatformAudit(page,{query:`category=legacy&action=tenant.update&target_id=${auditTarget}`});
  await expect(root(page)).toContainText('Legacy category filter active');
  await root(page).getByRole('button',{name:'Clear category'}).click();
  const q=new URL(page.url()).searchParams;
  expect(q.has('category')).toBe(false);expect(q.get('action')).toBe('tenant.update');expect(q.get('target_id')).toBe(auditTarget);
 });
 test('PAUD-084 Applying authorized filters preserves harmless unrelated deep-link parameters',async({page})=>{
  await openPlatformAudit(page,{query:'trace=keep-me'});
  await form(page).getByLabel('Action').fill('tenant.update');
  await form(page).getByRole('button',{name:'Apply filters'}).click();
  const q=new URL(page.url()).searchParams;expect(q.get('trace')).toBe('keep-me');expect(q.get('action')).toBe('tenant.update');
 });
 test('PAUD-085 Negative URL offset is clamped before the intercepted audit GET',async({page})=>{
  const calls:string[]=[];await openPlatformAudit(page,{query:'offset=-50',onCall:(m,p,q)=>{if(m==='GET'&&p===auditRoot)calls.push(q.toString());}});
  await expect(row(page,tenantAuditEvent.action)).toBeVisible();
  const q=new URLSearchParams(calls.at(-1));expect(q.get('offset')).toBe('0');expect(q.get('limit')).toBe('50');
 });
 test('PAUD-086 Non-numeric URL offset falls back to the first bounded audit page',async({page})=>{
  const calls:string[]=[];await openPlatformAudit(page,{query:'offset=not-a-number',onCall:(m,p,q)=>{if(m==='GET'&&p===auditRoot)calls.push(q.toString());}});
  await expect(row(page,tenantAuditEvent.action)).toBeVisible();
  expect(new URLSearchParams(calls.at(-1)).get('offset')).toBe('0');
 });
 test('PAUD-087 Empty authorized evidence disables both pagination directions',async({page})=>{
  await openPlatformAudit(page,{records:[]});
  await expect(evidence(page)).toContainText('No authorized audit events match these filters.');
  await expect(pagination(page).getByRole('button',{name:'Previous'})).toBeDisabled();
  await expect(pagination(page).getByRole('button',{name:'Next'})).toBeDisabled();
 });

});

// Batch 150 — API whitelist, reset of orphaned URL state and inert rich-looking metadata.
 test('PAUD-088 Harmless URL trace is excluded from authorized audit GET',async({page})=>{
  const calls:string[]=[];await openPlatformAudit(page,{query:'trace=private-local-context&action=tenant.update',onCall:(m,p,q)=>{if(m==='GET'&&p===auditRoot)calls.push(q.toString());}});
  await expect.poll(()=>calls.length).toBeGreaterThan(0);
  const q=new URLSearchParams(calls[0]);expect(q.get('action')).toBe('tenant.update');expect(q.has('trace')).toBe(false);
 });
 test('PAUD-089 Clear filters removes orphaned deep-link keys and legacy entity aliases',async({page})=>{
  await openPlatformAudit(page,{query:'trace=orphan&entity_type=tenant&entity_id=legacy&category=old&offset=50'});
  await root(page).getByRole('button',{name:'Clear filters'}).click();
  expect(new URL(page.url()).search).toBe('');
 });
 test('PAUD-090 Nested untrusted audit metadata is rendered as inert JSON rather than HTML',async({page})=>{
  const hostile='<img src=x onerror=alert(1)>';
  await openPlatformAudit(page,{records:[{...tenantAuditEvent,metadata:{nested:{description:hostile},safe:true}}]});
  const r=row(page,tenantAuditEvent.action);await expect(r.locator('.platform-audit__metadata')).toContainText(hostile);
  await expect(r.locator('img,script,iframe')).toHaveCount(0);
 });
 test('PAUD-091 User-agent strings that resemble HTML stay inert request evidence',async({page})=>{
  const hostile='<svg onload=alert(1)>';await openPlatformAudit(page,{records:[{...tenantAuditEvent,user_agent:hostile}]});
  const r=row(page,tenantAuditEvent.action);await expect(r).toContainText(hostile);await expect(r.locator('svg,script,iframe')).toHaveCount(0);
 });
