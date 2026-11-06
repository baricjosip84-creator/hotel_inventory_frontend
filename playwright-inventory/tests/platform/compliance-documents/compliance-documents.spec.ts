/** BATCH_084_GENERATED_UNRUN: 41 source-based Platform Compliance Documents UI declarations.
 * Artificial API intercepts are NOT proof of real compliance, database persistence, server permissions or external document validity. */
import {test,expect,type Page} from '@playwright/test';
import {openComplianceDocuments,complianceRoot,docPermissions,documentTypes,fixtureDoc,activeDoc,archivedDoc,docId,
 tenantId,ownerId,manyDocuments} from '../../../support/platformComplianceDocumentsFixture';
const root=(p:Page)=>p.locator('.platform-compliance-documents');
const section=(p:Page,title:string)=>root(p).locator('.platform-compliance-documents__section').filter({has:p.getByRole('heading',{name:title,exact:true})});
const filters=(p:Page)=>section(p,'Filter registry');
const create=(p:Page)=>section(p,'Create compliance document');
const edit=(p:Page)=>section(p,'Edit document details');
const evidence=(p:Page)=>section(p,'Compliance document evidence');
const cards=(p:Page)=>evidence(p).locator('.platform-compliance-documents__card');
const card=(p:Page,title:string)=>cards(p).filter({has:p.getByRole('heading',{name:title,exact:true})});
const pagination=(p:Page)=>evidence(p).locator('.platform-compliance-documents__pagination');
const no=(...permissions:string[])=>docPermissions.filter(p=>!permissions.includes(p));

test.describe('Compliance Documents — registry governance (BATCH_084_GENERATED_UNRUN)',()=>{
 test('PCDOC-001 Page exposes a dedicated compliance-document registry',async({page})=>{
  await openComplianceDocuments(page);await expect(root(page)).toContainText('Platform governance');await expect(evidence(page)).toContainText(fixtureDoc.title);
 });
 test('PCDOC-002 Evidence boundary rejects external legal verification inference',async({page})=>{
  await openComplianceDocuments(page);await expect(root(page).locator('.platform-compliance-documents__truth-note')).toContainText('do not prove the external document exists');
 });
 test('PCDOC-003 First registry request uses fifty documents at offset zero',async({page})=>{
  const qs:string[]=[];await openComplianceDocuments(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===complianceRoot)qs.push(q.toString());}});
  await expect.poll(()=>qs.length).toBeGreaterThan(0);const q=new URLSearchParams(qs.at(-1));expect(q.get('limit')).toBe('50');expect(q.get('offset')).toBe('0');
 });
 test('PCDOC-004 Registry summary uses filtered total, not current page length',async({page})=>{
  await openComplianceDocuments(page,{records:manyDocuments(55)});await expect(cards(page)).toHaveCount(50);
  await expect(root(page).getByLabel('Compliance document registry summary')).toContainText('55');
 });
 test('PCDOC-005 Missing platform compliance read permission guards route before fetching',async({page})=>{
  const hits:string[]=[];await openComplianceDocuments(page,{permissions:no('platform.compliance.read'),expectHeading:false,
   onCall:(m,p)=>{if(m==='GET'&&p===complianceRoot)hits.push(p);}});await expect(root(page)).toHaveCount(0);expect(hits).toHaveLength(0);
 });
 test('PCDOC-006 Read-only operator has no create, edit, review or archive actions',async({page})=>{
  await openComplianceDocuments(page,{permissions:no('platform.compliance.write')});
  await expect(create(page)).toHaveCount(0);await expect(card(page,fixtureDoc.title).getByRole('button')).toHaveCount(0);
 });
 test('PCDOC-007 Write permission exposes create draft and per-card lifecycle controls',async({page})=>{
  await openComplianceDocuments(page);await expect(create(page).getByRole('button',{name:'Create draft'})).toBeVisible();
  await expect(card(page,fixtureDoc.title).getByRole('button',{name:'Edit details'})).toBeVisible();
 });
 test('PCDOC-008 Evidence identity metadata reflects authorized source grants',async({page})=>{
  await openComplianceDocuments(page,{permissions:no('platform.tenants.read','platform.users.read')});
  await expect(root(page)).toContainText('Tenant identity restricted');await expect(root(page)).toContainText('Platform-user identity restricted');
 });
 test('PCDOC-009 Tenant linkage is redacted without TENANTS_READ',async({page})=>{
  await openComplianceDocuments(page,{permissions:no('platform.tenants.read')});
  await expect(card(page,fixtureDoc.title)).toContainText('Restricted tenant linkage');await expect(filters(page)).toContainText('Tenant filter restricted');
 });
 test('PCDOC-010 Owner linkage is redacted without platform user-read grant',async({page})=>{
  await openComplianceDocuments(page,{permissions:no('platform.users.read')});
  await expect(card(page,fixtureDoc.title)).toContainText('Restricted Platform-user linkage');await expect(create(page)).toContainText('Owner linkage preserved');
 });
 test('PCDOC-011 Writable fully permitted operator loads tenant and user choices',async({page})=>{
  const calls:string[]=[];await openComplianceDocuments(page,{onCall:(m,p)=>{if(m==='GET')calls.push(p);}});
  await expect.poll(()=>calls.includes('/platform/tenants')&&calls.includes('/platform/users')).toBe(true);
 });
 test('PCDOC-012 Read-only operator does not request edit-picker lookup data',async({page})=>{
  const calls:string[]=[];await openComplianceDocuments(page,{permissions:no('platform.compliance.write'),onCall:(m,p)=>{if(m==='GET')calls.push(p);}});
  await expect(evidence(page)).toContainText(fixtureDoc.title);expect(calls).not.toContain('/platform/users');
 });
 test('PCDOC-013 Successful create posts a new Draft rather than Active',async({page})=>{
  let payload:any;await openComplianceDocuments(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===complianceRoot)payload=b;}});
  await create(page).getByLabel('Title').fill('Fixture new contract');await create(page).getByRole('button',{name:'Create draft'}).click();
  await expect(root(page)).toContainText('created as Draft');await expect.poll(()=>Boolean(payload)).toBe(true);expect(payload).not.toHaveProperty('status');
 });
 test('PCDOC-014 Empty title blocks draft creation',async({page})=>{
  await openComplianceDocuments(page);await expect(create(page).getByRole('button',{name:'Create draft'})).toBeDisabled();
 });
 test('PCDOC-015 Whitespace-only title is not a valid document title',async({page})=>{
  await openComplianceDocuments(page);await create(page).getByLabel('Title').fill('   ');await expect(create(page).getByRole('button',{name:'Create draft'})).toBeDisabled();
 });
 test('PCDOC-016 Title, external URL and notes limits match original frontend',async({page})=>{
  await openComplianceDocuments(page);await expect(create(page).getByLabel('Title')).toHaveAttribute('maxlength','255');
  await expect(create(page).getByLabel('External document URL')).toHaveAttribute('maxlength','2048');
  await expect(create(page).getByLabel('Internal notes')).toHaveAttribute('maxlength','5000');
 });
 test('PCDOC-017 Invalid external URL disables save and displays validation',async({page})=>{
  await openComplianceDocuments(page);await create(page).getByLabel('Title').fill('DPA');await create(page).getByLabel('External document URL').fill('not-a-url');
  await expect(create(page)).toContainText('External URL must use http:// or https://');await expect(create(page).getByRole('button',{name:'Create draft'})).toBeDisabled();
 });
 test('PCDOC-018 HTTPS reference is accepted without claiming verification',async({page})=>{
  await openComplianceDocuments(page);await create(page).getByLabel('Title').fill('DPA');
  await create(page).getByLabel('External document URL').fill('https://example.test/doc');
  await expect(create(page).getByRole('button',{name:'Create draft'})).toBeEnabled();await expect(root(page).locator('.platform-compliance-documents__truth-note')).toContainText('recorded reference');
 });
 test('PCDOC-019 HTTP reference is source-allowed but remains only recorded metadata',async({page})=>{
  await openComplianceDocuments(page);await create(page).getByLabel('Title').fill('Policy');
  await create(page).getByLabel('External document URL').fill('http://example.test/policy');
  await expect(create(page).getByRole('button',{name:'Create draft'})).toBeEnabled();
 });
 test('PCDOC-020 Script protocol is rejected before mutation',async({page})=>{
  const writes:string[]=[];await openComplianceDocuments(page,{onCall:(m,p)=>{if(p===complianceRoot&&m!=='GET')writes.push(m);}});
  await create(page).getByLabel('Title').fill('Policy');await create(page).getByLabel('External document URL').fill('javascript:alert(1)');
  await expect(create(page).getByRole('button',{name:'Create draft'})).toBeDisabled();expect(writes).toHaveLength(0);
 });
 test('PCDOC-021 Reversed effective and expiry dates block form submission',async({page})=>{
  await openComplianceDocuments(page);await create(page).getByLabel('Title').fill('Agreement');
  await create(page).getByLabel('Effective date').fill('2030-12-02');await create(page).getByLabel('Expiry date').fill('2030-12-01');
  await expect(create(page)).toContainText('Effective date must be before or equal to expiry date');await expect(create(page).getByRole('button',{name:'Create draft'})).toBeDisabled();
 });
 test('PCDOC-022 Equal effective and expiry dates meet source date-window rule',async({page})=>{
  await openComplianceDocuments(page);await create(page).getByLabel('Title').fill('Agreement');
  await create(page).getByLabel('Effective date').fill('2030-12-01');await create(page).getByLabel('Expiry date').fill('2030-12-01');
  await expect(create(page).getByRole('button',{name:'Create draft'})).toBeEnabled();
 });
 test('PCDOC-023 Inactive platform users are excluded from owner selector',async({page})=>{
  await openComplianceDocuments(page);await expect(create(page).getByLabel('Owner').locator('option')).toHaveCount(2);
  await expect(create(page).getByLabel('Owner')).not.toContainText('disabled@example.test');
 });
 test('PCDOC-024 Tenant selector has authorized tenant choice and platform-wide option',async({page})=>{
  await openComplianceDocuments(page);await expect(create(page).getByLabel('Tenant')).toContainText('Fixture Tenant Alpha');
  await expect(create(page).getByLabel('Tenant')).toContainText('Platform-wide / none');
 });
 test('PCDOC-025 Empty optional fields become null in create payload',async({page})=>{
  let payload:any;await openComplianceDocuments(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===complianceRoot)payload=b;}});
  await create(page).getByLabel('Title').fill('Minimal');await create(page).getByRole('button',{name:'Create draft'}).click();
  await expect.poll(()=>Boolean(payload)).toBe(true);for(const field of ['external_url','notes','effective_at','expires_at','tenant_id','owner_platform_user_id'])expect(payload[field]).toBeNull();
 });
 test('PCDOC-026 Title is trimmed before POST payload submission',async({page})=>{
  let payload:any;await openComplianceDocuments(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===complianceRoot)payload=b;}});
  await create(page).getByLabel('Title').fill('  Trimmed title  ');await create(page).getByRole('button',{name:'Create draft'}).click();
  await expect.poll(()=>Boolean(payload)).toBe(true);expect(payload.title).toBe('Trimmed title');
 });
 test('PCDOC-027 Ordinary draft creation cannot submit an unreviewed Active status',async({page})=>{
  let payload:any;await openComplianceDocuments(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===complianceRoot)payload=b;}});
  await create(page).getByLabel('Title').fill('Draft only');await create(page).getByRole('button',{name:'Create draft'}).click();
  await expect.poll(()=>Boolean(payload)).toBe(true);expect(Object.keys(payload)).not.toContain('status');
 });
 test('PCDOC-028 Failed create shows error instead of false success',async({page})=>{
  await openComplianceDocuments(page,{overrides:{[`POST ${complianceRoot}`]:{status:422,json:{message:'Synthetic validation failure'}}}});
  await create(page).getByLabel('Title').fill('Rejected draft');await create(page).getByRole('button',{name:'Create draft'}).click();
  await expect(root(page)).toContainText('Action failed.');await expect(root(page)).not.toContainText('created as Draft.');
 });
 test('PCDOC-029 Initial GET failure exposes retry action',async({page})=>{
  await openComplianceDocuments(page,{overrides:{[`GET ${complianceRoot}`]:{status:503,json:{message:'Synthetic source unavailable'}}}});
  await expect(evidence(page)).toContainText('Compliance documents could not be loaded.');
  await expect(evidence(page).getByRole('button',{name:'Retry'})).toBeVisible();
 });
 test('PCDOC-030 Edit loads existing recorded document values into the form',async({page})=>{
  await openComplianceDocuments(page);await card(page,fixtureDoc.title).getByRole('button',{name:'Edit details'}).click();
  await expect(edit(page).getByLabel('Title')).toHaveValue(fixtureDoc.title);await expect(edit(page).getByLabel('External document URL')).toHaveValue(fixtureDoc.external_url);
 });
 test('PCDOC-031 Unchanged edit cannot submit a redundant PATCH',async({page})=>{
  await openComplianceDocuments(page);await card(page,fixtureDoc.title).getByRole('button',{name:'Edit details'}).click();
  await expect(edit(page).getByRole('button',{name:'Save details'})).toBeDisabled();
 });
 test('PCDOC-032 Cancel edit restores Create draft mode without mutation',async({page})=>{
  const patches:string[]=[];await openComplianceDocuments(page,{onCall:(m,p)=>{if(m==='PATCH')patches.push(p);}});
  await card(page,fixtureDoc.title).getByRole('button',{name:'Edit details'}).click();await edit(page).getByRole('button',{name:'Cancel edit'}).click();
  await expect(create(page)).toBeVisible();expect(patches).toHaveLength(0);
 });
 test('PCDOC-033 Detail edit PATCH excludes status and review fields',async({page})=>{
  let patch:any;await openComplianceDocuments(page,{onCall:(m,p,q,b)=>{if(m==='PATCH'&&p===`${complianceRoot}/${docId}`)patch=b;}});
  await card(page,fixtureDoc.title).getByRole('button',{name:'Edit details'}).click();await edit(page).getByLabel('Title').fill('Amended DPA');
  await edit(page).getByRole('button',{name:'Save details'}).click();await expect.poll(()=>Boolean(patch)).toBe(true);
  expect(patch.title).toBe('Amended DPA');for(const field of ['status','reviewed_at','reviewed_by_platform_user_id'])expect(patch).not.toHaveProperty(field);
 });
 test('PCDOC-034 Missing identity read grants omit linkages from PATCH payload',async({page})=>{
  let patch:any;await openComplianceDocuments(page,{permissions:no('platform.tenants.read','platform.users.read'),
   onCall:(m,p,q,b)=>{if(m==='PATCH'&&p===`${complianceRoot}/${docId}`)patch=b;}});
  await card(page,fixtureDoc.title).getByRole('button',{name:'Edit details'}).click();await edit(page).getByLabel('Title').fill('Safe edit');
  await edit(page).getByRole('button',{name:'Save details'}).click();await expect.poll(()=>Boolean(patch)).toBe(true);
  expect(patch).not.toHaveProperty('tenant_id');expect(patch).not.toHaveProperty('owner_platform_user_id');
 });
 test('PCDOC-035 Accepted explicit review records a structured outcome',async({page})=>{
  let body:any;await openComplianceDocuments(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===`${complianceRoot}/${docId}/review`)body=b;}});
  page.once('dialog',d=>d.accept());await card(page,fixtureDoc.title).getByRole('button',{name:'Record reviewed · Active'}).click();
  await expect.poll(()=>Boolean(body)).toBe(true);expect(body.status).toBe('active');await expect(root(page)).toContainText('Review recorded as Active.');
 });
 test('PCDOC-036 Cancelling explicit review dialog makes no mutation request',async({page})=>{
  const calls:string[]=[];await openComplianceDocuments(page,{onCall:(m,p)=>{if(p.endsWith('/review')&&m==='POST')calls.push(p);}});
  page.once('dialog',d=>d.dismiss());await card(page,fixtureDoc.title).getByRole('button',{name:'Record reviewed · Active'}).click();
  expect(calls).toHaveLength(0);
 });
 test('PCDOC-037 Review audit note is included in explicit review mutation',async({page})=>{
  let body:any;await openComplianceDocuments(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p.endsWith('/review'))body=b;}});
  await card(page,fixtureDoc.title).getByLabel('Review audit note').fill('Fixture evidence checked');
  page.once('dialog',d=>d.accept());await card(page,fixtureDoc.title).getByRole('button',{name:'Record Needs review'}).click();
  await expect.poll(()=>Boolean(body)).toBe(true);expect(body).toMatchObject({status:'needs_review',notes:'Fixture evidence checked'});
 });
 test('PCDOC-038 Accepted archive makes record immutable after mutation',async({page})=>{
  const paths:string[]=[];await openComplianceDocuments(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/archive'))paths.push(p);}});
  page.once('dialog',d=>d.accept());await card(page,fixtureDoc.title).getByRole('button',{name:'Archive'}).click();
  await expect.poll(()=>paths.length).toBe(1);await expect(card(page,fixtureDoc.title)).toContainText('Archived history is immutable.');
 });
 test('PCDOC-039 Cancelling archive confirmation leaves record editable',async({page})=>{
  const paths:string[]=[];await openComplianceDocuments(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/archive'))paths.push(p);}});
  page.once('dialog',d=>d.dismiss());await card(page,fixtureDoc.title).getByRole('button',{name:'Archive'}).click();
  expect(paths).toHaveLength(0);await expect(card(page,fixtureDoc.title).getByRole('button',{name:'Edit details'})).toBeVisible();
 });
 test('PCDOC-040 Already archived records have no edit, review or archive action',async({page})=>{
  await openComplianceDocuments(page);const historical=card(page,archivedDoc.title);await expect(historical).toContainText('Archived history is immutable.');
  await expect(historical.getByRole('button')).toHaveCount(0);
 });
 test('PCDOC-041 Next page advances server offset in fifty-row increments',async({page})=>{
  const queries:string[]=[];await openComplianceDocuments(page,{records:manyDocuments(55),onCall:(m,p,q)=>{if(m==='GET'&&p===complianceRoot)queries.push(q.toString());}});
  await pagination(page).getByRole('button',{name:'Next'}).click();await expect(cards(page)).toHaveCount(5);
  expect(new URLSearchParams(queries.at(-1)).get('offset')).toBe('50');
 });
});

/** BATCH_085_GENERATED_UNRUN: source-scoped registry controls. Backend/role/concurrency acceptance cases are explicitly skipped pending Phase 2. */
test.describe('Compliance Documents — filtering, error recovery and evidence boundaries (BATCH_085_GENERATED_UNRUN)',()=>{
 test('PCDOC-042 Edit save server validation error preserves draft values for retry',async({page})=>{
  await openComplianceDocuments(page,{overrides:{[`PATCH ${complianceRoot}/${docId}`]:{status:422,json:{message:'Synthetic revision validation rejected'}}}});
  await card(page,fixtureDoc.title).getByRole('button',{name:'Edit details'}).click();await edit(page).getByLabel('Title').fill('Edited but rejected');
  await edit(page).getByRole('button',{name:'Save details'}).click();await expect(root(page)).toContainText('Action failed.');
  await expect(edit(page).getByLabel('Title')).toHaveValue('Edited but rejected');await expect(root(page)).not.toContainText('Compliance document details saved.');
 });
 test('PCDOC-043 Review mutation error preserves selected record and audit note',async({page})=>{
  await openComplianceDocuments(page,{overrides:{[`POST ${complianceRoot}/${docId}/review`]:{status:409,json:{message:'Synthetic review conflict'}}}});
  await card(page,fixtureDoc.title).getByLabel('Review audit note').fill('Review should remain');
  page.once('dialog',dialog=>dialog.accept());await card(page,fixtureDoc.title).getByRole('button',{name:'Record reviewed · Active'}).click();
  await expect(root(page)).toContainText('Action failed.');await expect(card(page,fixtureDoc.title).getByLabel('Review audit note')).toHaveValue('Review should remain');
  await expect(card(page,fixtureDoc.title).getByRole('button',{name:'Edit details'})).toBeVisible();
 });
 test('PCDOC-044 Archive mutation conflict reports failure and retains active controls',async({page})=>{
  await openComplianceDocuments(page,{overrides:{[`POST ${complianceRoot}/${docId}/archive`]:{status:409,json:{message:'Synthetic archive conflict'}}}});
  page.once('dialog',dialog=>dialog.accept());await card(page,fixtureDoc.title).getByRole('button',{name:'Archive'}).click();
  await expect(root(page)).toContainText('Action failed.');await expect(card(page,fixtureDoc.title).getByRole('button',{name:'Archive'})).toBeVisible();
 });
 test('PCDOC-045 Permission changed during open page should block unauthorized mutation',async()=>{
  test.skip(true,'Requires genuine independent principal/session revocation and HTTP RBAC acceptance in Phase 2; a fixed synthetic grant cannot model post-load server revocation.');
 });
 test('PCDOC-046 Status dropdown filters registry by recorded workflow status',async({page})=>{
  const seen:string[]=[];await openComplianceDocuments(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===complianceRoot)seen.push(q.toString());}});
  await filters(page).getByLabel('Status').selectOption('active');await expect(cards(page)).toHaveCount(1);
  await expect(card(page,activeDoc.title)).toBeVisible();await expect.poll(()=>seen.at(-1)||'').toContain('status=active');
 });
 test('PCDOC-047 Document type dropdown filters server records without changing status',async({page})=>{
  const seen:string[]=[];await openComplianceDocuments(page,{query:'status=active',onCall:(m,p,q)=>{if(m==='GET'&&p===complianceRoot)seen.push(q.toString());}});
  await filters(page).getByLabel('Document type').selectOption('security');await expect(card(page,activeDoc.title)).toBeVisible();
  const q=new URLSearchParams(seen.at(-1));expect(q.get('document_type')).toBe('security');expect(q.get('status')).toBe('active');
 });
 test('PCDOC-048 Search matches recorded title or notes and uses server search parameter',async({page})=>{
  const seen:string[]=[];await openComplianceDocuments(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===complianceRoot)seen.push(q.toString());}});
  await filters(page).getByLabel('Search').fill('Security evidence');await expect(card(page,activeDoc.title)).toBeVisible();
  expect(new URLSearchParams(seen.at(-1)).get('search')).toBe('Security evidence');
 });
 test('PCDOC-049 Tenant dropdown sets tenant UUID filter only with TENANTS_READ',async({page})=>{
  const seen:string[]=[];await openComplianceDocuments(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===complianceRoot)seen.push(q.toString());}});
  await filters(page).getByLabel('Tenant').selectOption(tenantId);await expect(card(page,fixtureDoc.title)).toBeVisible();
  expect(new URLSearchParams(seen.at(-1)).get('tenant_id')).toBe(tenantId);
 });
 test('PCDOC-050 Expiring within 45 days checkbox uses an explicit expiring=true query',async({page})=>{
  const seen:string[]=[];await openComplianceDocuments(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===complianceRoot)seen.push(q.toString());}});
  await filters(page).getByLabel('Expiring within 45 days').check();await expect.poll(()=>seen.at(-1)||'').toContain('expiring=true');
 });
 test('PCDOC-051 Invalid initial status URL blocks GET instead of dropping malformed filter',async({page})=>{
  const seen:string[]=[];await openComplianceDocuments(page,{query:'status=not_a_status',onCall:(m,p)=>{if(m==='GET'&&p===complianceRoot)seen.push(p);}});
  await expect(evidence(page)).toContainText('Invalid or unauthorized filter.');expect(seen).toHaveLength(0);
 });
 test('PCDOC-052 Invalid initial type URL blocks GET instead of silently coercing type',async({page})=>{
  const seen:string[]=[];await openComplianceDocuments(page,{query:'document_type=unknown',onCall:(m,p)=>{if(m==='GET'&&p===complianceRoot)seen.push(p);}});
  await expect(evidence(page)).toContainText('Invalid or unauthorized filter.');expect(seen).toHaveLength(0);
 });
 test('PCDOC-053 Oversized initial search URL requires explicit correction before GET',async({page})=>{
  const seen:string[]=[];await openComplianceDocuments(page,{query:'search='+encodeURIComponent('x'.repeat(201)),onCall:(m,p)=>{if(m==='GET'&&p===complianceRoot)seen.push(p);}});
  await expect(evidence(page)).toContainText('Invalid or unauthorized filter.');expect(seen).toHaveLength(0);
 });
 test('PCDOC-054 Invalid initial expiring URL triggers blocking warning',async({page})=>{
  const seen:string[]=[];await openComplianceDocuments(page,{query:'expiring=perhaps',onCall:(m,p)=>{if(m==='GET'&&p===complianceRoot)seen.push(p);}});
  await expect(evidence(page)).toContainText('Invalid or unauthorized filter.');expect(seen).toHaveLength(0);
 });
 test('PCDOC-055 Unauthorized initial tenant query is blocked and does not leak links',async({page})=>{
  const seen:string[]=[];await openComplianceDocuments(page,{query:`tenant_id=${tenantId}`,permissions:no('platform.tenants.read'),onCall:(m,p)=>{if(m==='GET'&&p===complianceRoot)seen.push(p);}});
  await expect(evidence(page)).toContainText('Invalid or unauthorized filter.');await expect(evidence(page).getByRole('link',{name:'Tenant',exact:true})).toHaveCount(0);
  expect(seen).toHaveLength(0);
 });
 test('PCDOC-056 Clearing an invalid URL filter resumes a valid registry query',async({page})=>{
  const seen:string[]=[];await openComplianceDocuments(page,{query:'status=invalid',onCall:(m,p,q)=>{if(m==='GET'&&p===complianceRoot)seen.push(q.toString());}});
  await expect(evidence(page)).toContainText('Invalid or unauthorized filter.');await filters(page).getByLabel('Status').selectOption('draft');
  await expect(card(page,fixtureDoc.title)).toBeVisible();expect(new URLSearchParams(seen.at(-1)).get('status')).toBe('draft');
 });
 test('PCDOC-057 Changing type or status keeps unrelated safe URL parameters',async({page})=>{
  await openComplianceDocuments(page,{query:'search=Fixture&status=draft'});await filters(page).getByLabel('Document type').selectOption('dpa');
  await expect.poll(()=>new URL(page.url()).searchParams.get('search')).toBe('Fixture');
  expect(new URL(page.url()).searchParams.get('status')).toBe('draft');expect(new URL(page.url()).searchParams.get('document_type')).toBe('dpa');
 });
 test('PCDOC-058 Search change resets server pagination offset to zero',async({page})=>{
  const seen:string[]=[];await openComplianceDocuments(page,{records:manyDocuments(55),onCall:(m,p,q)=>{if(m==='GET'&&p===complianceRoot)seen.push(q.toString());}});
  await pagination(page).getByRole('button',{name:'Next'}).click();await expect(cards(page)).toHaveCount(5);
  await filters(page).getByLabel('Search').fill('Fixture Document 001');await expect(cards(page)).toHaveCount(1);
  expect(new URLSearchParams(seen.at(-1)).get('offset')).toBe('0');
 });
 test('PCDOC-059 Next and Previous pagers use 50-row boundaries and filtered totals',async({page})=>{
  await openComplianceDocuments(page,{records:manyDocuments(55)});await pagination(page).getByRole('button',{name:'Next'}).click();
  await expect(pagination(page)).toContainText('Page 2');await pagination(page).getByRole('button',{name:'Previous'}).click();
  await expect(pagination(page)).toContainText('Page 1');await expect(cards(page)).toHaveCount(50);
 });
 test('PCDOC-060 Summary counts reflect filtered registry not just current pagination',async({page})=>{
  await openComplianceDocuments(page,{records:manyDocuments(55)});await expect(cards(page)).toHaveCount(50);
  await expect(root(page).getByLabel('Compliance document registry summary')).toContainText('55');
  await pagination(page).getByRole('button',{name:'Next'}).click();await expect(root(page).getByLabel('Compliance document registry summary')).toContainText('55');
 });
 test('PCDOC-061 Archived rows do not count as overdue based on historical expiration',async({page})=>{
  await openComplianceDocuments(page,{records:[{...archivedDoc,expires_at:'2020-01-01T00:00:00.000Z'}]});
  await expect(card(page,archivedDoc.title)).not.toContainText('Expiry overdue');
  await expect(root(page).getByLabel('Compliance document registry summary')).toContainText('0');
 });
 test('PCDOC-062 Unreviewed draft displays missing review metadata without invented reviewer',async({page})=>{
  await openComplianceDocuments(page);await expect(card(page,fixtureDoc.title)).toContainText('Not recorded');
  await expect(card(page,fixtureDoc.title)).not.toContainText('Reviewed by fixture owner');
 });
 test('PCDOC-063 Reviewer identity stays restricted when user-read permission is absent',async({page})=>{
  await openComplianceDocuments(page,{permissions:no('platform.users.read'),records:[{...fixtureDoc,reviewed_by_platform_user_id:ownerId,
   reviewed_by_email:'reviewer@example.test',reviewer_present:true,reviewed_at:'2026-11-02T11:00:00.000Z'}]});
  await expect(card(page,fixtureDoc.title)).toContainText('Restricted Platform-user identity');
  await expect(card(page,fixtureDoc.title)).not.toContainText('reviewer@example.test');
 });
 test('PCDOC-064 External URL uses safe new-tab noreferrer noopener reference link',async({page})=>{
  await openComplianceDocuments(page);const link=card(page,fixtureDoc.title).getByRole('link',{name:'Open recorded reference'});
  await expect(link).toHaveAttribute('target','_blank');await expect(link).toHaveAttribute('rel',/noreferrer/);await expect(link).toHaveAttribute('rel',/noopener/);
 });
 test('PCDOC-065 Absent external URL displays an explicit missing-reference indicator',async({page})=>{
  await openComplianceDocuments(page);await expect(card(page,activeDoc.title)).toContainText('No external URL recorded');
  await expect(card(page,activeDoc.title).getByRole('link',{name:'Open recorded reference'})).toHaveCount(0);
 });
 test('PCDOC-066 Tenant link exists only for a visible authorized tenant identity',async({page})=>{
  await openComplianceDocuments(page,{permissions:no('platform.tenants.read')});await expect(card(page,fixtureDoc.title).getByRole('link',{name:'Tenant',exact:true})).toHaveCount(0);
 });
 test('PCDOC-067 Audit link exists only when platform audit read is authorized',async({page})=>{
  await openComplianceDocuments(page,{permissions:no('platform.audit.read')});await expect(card(page,fixtureDoc.title).getByRole('link',{name:'Audit',exact:true})).toHaveCount(0);
 });
 test('PCDOC-068 Active workflow state does not assert real external agreement effectiveness',async({page})=>{
  await openComplianceDocuments(page);await expect(root(page).locator('.platform-compliance-documents__truth-note')).toContainText('do not prove');
  await expect(card(page,activeDoc.title)).toContainText('Active');
 });
 test('PCDOC-069 Invalid date string is not represented as a valid document date',async({page})=>{
  await openComplianceDocuments(page,{records:[{...fixtureDoc,effective_at:'not-a-date'}]});await expect(card(page,fixtureDoc.title)).toContainText('Invalid date');
 });
 test('PCDOC-070 Empty authorized registry has explicit no-record evidence boundary',async({page})=>{
  await openComplianceDocuments(page,{records:[]});await expect(evidence(page)).toContainText('No matching application records.');
  await expect(evidence(page)).toContainText('does not prove that no external legal/compliance document exists');
 });
 test('PCDOC-071 Failed refresh retains last successful snapshot with stale-data warning',async({page})=>{
  let calls=0;await openComplianceDocuments(page,{respond:(m,p)=>{if(m==='GET'&&p===complianceRoot&&++calls>1)return {status:503,json:{message:'Synthetic retry rejection'}};}});
  await expect(card(page,fixtureDoc.title)).toBeVisible();await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(root(page)).toContainText('Showing the last successful snapshot.');await expect(card(page,fixtureDoc.title)).toBeVisible();
 });
 test('PCDOC-072 Retry after failed refresh recovers current recorded registry',async({page})=>{
  let calls=0,failRefresh=true;await openComplianceDocuments(page,{respond:(m,p)=>{
   if(m==='GET'&&p===complianceRoot&&++calls>1&&failRefresh)return {status:503,json:{message:'Transient synthetic error'}};
  }});
  await expect(card(page,fixtureDoc.title)).toBeVisible();await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(root(page)).toContainText('Showing the last successful snapshot.');
  failRefresh=false;await root(page).getByRole('button',{name:'Retry'}).click();
  await expect(root(page).locator('.platform-compliance-documents__warning')).toHaveCount(0);
  await expect(card(page,fixtureDoc.title)).toBeVisible();
 });
 test('PCDOC-073 Refresh refetches authorized identity pickers only for writable operators',async({page})=>{
  const calls:string[]=[];await openComplianceDocuments(page,{onCall:(m,p)=>{if(m==='GET')calls.push(p);}});
  const oldT=calls.filter(x=>x==='/platform/tenants').length,oldU=calls.filter(x=>x==='/platform/users').length;
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>calls.filter(x=>x==='/platform/tenants').length).toBeGreaterThan(oldT);
  await expect.poll(()=>calls.filter(x=>x==='/platform/users').length).toBeGreaterThan(oldU);
 });
 test('PCDOC-074 Conflicting concurrent edit is surfaced as error not success',async({page})=>{
  await openComplianceDocuments(page,{overrides:{[`PATCH ${complianceRoot}/${docId}`]:{status:409,json:{message:'Conflicting update'}}}});
  await card(page,fixtureDoc.title).getByRole('button',{name:'Edit details'}).click();await edit(page).getByLabel('Title').fill('Conflict changed');
  await edit(page).getByRole('button',{name:'Save details'}).click();await expect(root(page)).toContainText('Action failed.');
  await expect(root(page)).not.toContainText('Compliance document details saved.');
 });
 test('PCDOC-075 Restricted tenant and owner references cannot be reassigned via PATCH',async({page})=>{
  let payload:any;await openComplianceDocuments(page,{permissions:no('platform.tenants.read','platform.users.read'),
   onCall:(m,p,q,b)=>{if(m==='PATCH'&&p===`${complianceRoot}/${docId}`)payload=b;}});
  await card(page,fixtureDoc.title).getByRole('button',{name:'Edit details'}).click();await edit(page).getByLabel('Title').fill('Unprivileged linkage-safe edit');
  await edit(page).getByRole('button',{name:'Save details'}).click();await expect.poll(()=>Boolean(payload)).toBe(true);
  expect(payload).not.toHaveProperty('tenant_id');expect(payload).not.toHaveProperty('owner_platform_user_id');
 });
 test('PCDOC-076 Archived records reject further server-side changes in independent acceptance',async()=>{
  test.skip(true,'Requires PostgreSQL/service acceptance with genuine independent principal in Phase 2; intercepted UI cannot verify server-side immutable record invariants.');
 });
 test('PCDOC-077 Backend Joi rejects invalid UUID, prohibited status and alias conflicts',async()=>{
  test.skip(true,'Requires nonintercepted backend Joi tests in authorized Phase 2.');
 });
 test('PCDOC-078 Backend SQL list, review, archive and audit durability need independent acceptance',async()=>{
  test.skip(true,'Requires transactional PostgreSQL/audit verification; no database is accessed in Phase 1.');
 });
 test('PCDOC-079 Real principal role and two-tenant permission isolation need Phase 2',async()=>{
  test.skip(true,'Needs two independently authenticated disposable principals and tenant isolation in Phase 2.');
 });
 test('PCDOC-080 External document reachability legal effectiveness and acceptance need Phase 2',async()=>{
  test.skip(true,'External legal validity or contract acceptance cannot be inferred from a mocked registry reference.');
 });
});
