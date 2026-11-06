/** BATCH_085_GENERATED_UNRUN: 41 source-grounded Compliance Export package-page scenarios.
 * Synthetic HTTP interception cannot prove legal compliance, actual package generation, database truth, permission revocation or delivery. */
import {test,expect,type Page} from '@playwright/test';
import {openComplianceExport,exportRoot,exportPermissions,exportDoc,draftExportDoc,historicalExportDoc,
 exportTenant,manyExportDocs} from '../../../support/platformComplianceExportFixture';
const root=(p:Page)=>p.locator('.platform-compliance-export');
const section=(p:Page,title:string)=>root(p).locator('.platform-compliance-export__section').filter({has:p.getByRole('heading',{name:title,exact:true})});
const coverage=(p:Page)=>section(p,'Evidence coverage');
const required=(p:Page)=>section(p,'Required document coverage');
const supporting=(p:Page)=>section(p,'Supporting operations');
const evidence=(p:Page)=>section(p,'Document package evidence');
const rows=(p:Page)=>evidence(p).locator('tbody tr');
const row=(p:Page,title:string)=>rows(p).filter({hasText:title});
const pager=(p:Page)=>evidence(p).locator('.platform-compliance-export__pager');
const omit=(...p:string[])=>exportPermissions.filter(x=>!p.includes(x));

test.describe('Platform Compliance Export — permission-scoped package evidence (BATCH_085_GENERATED_UNRUN)',()=>{
 test('PCEXP-001 Route renders a read-only Compliance export workspace',async({page})=>{
  await openComplianceExport(page);await expect(root(page)).toContainText('Read-only application snapshot');
  await expect(root(page)).toContainText('does not generate a certified external compliance package');
 });
 test('PCEXP-002 Package query uses document_limit fifty and document_offset zero',async({page})=>{
  const seen:string[]=[];await openComplianceExport(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===exportRoot)seen.push(q.toString());}});
  await expect.poll(()=>seen.length).toBeGreaterThan(0);
  expect(new URLSearchParams(seen[0]).get('document_limit')).toBe('50');expect(new URLSearchParams(seen[0]).get('document_offset')).toBe('0');
 });
 test('PCEXP-003 Compliance read permission is required to open route',async({page})=>{
  const seen:string[]=[];await openComplianceExport(page,{permissions:omit('platform.compliance.read'),expectHeading:false,
   onCall:(m,p)=>{if(m==='GET'&&p===exportRoot)seen.push(p);}});
  await expect(root(page)).toHaveCount(0);expect(seen).toHaveLength(0);
 });
 test('PCEXP-004 Page exposes no synthetic package download, certificate or mutation action',async({page})=>{
  const writes:string[]=[];await openComplianceExport(page,{onCall:(m,p)=>{if(m!=='GET')writes.push(`${m} ${p}`);}});
  await expect(root(page).getByRole('button',{name:/Download|Certify|Generate package|Approve/})).toHaveCount(0);
  expect(writes.filter(x=>x.includes(exportRoot))).toHaveLength(0);
 });
 test('PCEXP-005 Evidence boundary explicitly rejects validity and delivery inference',async({page})=>{
  await openComplianceExport(page);await expect(coverage(page).locator('.platform-compliance-export__truth')).toContainText('recipient delivery');
  await expect(coverage(page).locator('.platform-compliance-export__truth')).toContainText('regulatory acceptance');
 });
 test('PCEXP-006 Full source grants show five available evidence families',async({page})=>{
  await openComplianceExport(page);await expect(coverage(page).locator('[data-state="available"]')).toHaveCount(5);
  await expect(coverage(page).locator('[data-state="restricted"]')).toHaveCount(0);
 });
 test('PCEXP-007 Privacy source omission is shown as restricted evidence',async({page})=>{
  await openComplianceExport(page,{permissions:omit('platform.privacy.read')});
  await expect(coverage(page)).toContainText('Privacy requests · restricted');
  await expect(root(page).getByLabel('Compliance export overview')).toContainText('Restricted');
 });
 test('PCEXP-008 Tenant export evidence requires combined tenant-export tenant-read and audit grants',async({page})=>{
  await openComplianceExport(page,{permissions:omit('platform.audit.read')});
  await expect(coverage(page)).toContainText('Tenant export evidence · restricted');
 });
 test('PCEXP-009 Audit retention is omitted without data-retention read grant',async({page})=>{
  await openComplianceExport(page,{permissions:omit('platform.data_retention.read')});
  await expect(coverage(page)).toContainText('Audit retention · restricted');
 });
 test('PCEXP-010 Permission audit is omitted without access reviews read grant',async({page})=>{
  await openComplianceExport(page,{permissions:omit('platform.access_reviews.read')});
  await expect(coverage(page)).toContainText('Permission audit · restricted');
 });
 test('PCEXP-011 Restricted sources do not turn nullable metrics into zero',async({page})=>{
  await openComplianceExport(page,{permissions:omit('platform.privacy.read','platform.access_reviews.read')});
  await expect(root(page).getByLabel('Compliance export overview')).toContainText('Restricted');
  await expect(root(page).getByLabel('Compliance export overview')).toContainText('Permission Audit evidence restricted or partial');
 });
 test('PCEXP-012 Partial permission set retains a visible permission-scoped evidence posture',async({page})=>{
  await openComplianceExport(page,{permissions:omit('platform.privacy.read'),evidenceComplete:false,posture:'compliance_export_partial_evidence'});
  await expect(root(page)).toContainText('Permission-scoped evidence');
  await expect(coverage(page)).toContainText('restricted');
 });
 test('PCEXP-013 Required types use registry-wide summary, not page rows',async({page})=>{
  await openComplianceExport(page,{documents:manyExportDocs(55),summary:{required_document_types:['dpa','security','privacy','subprocessor'],
   missing_required_document_types:['security']}});
  await expect(rows(page)).toHaveCount(50);await expect(required(page)).toContainText('Security · missing active record');
  await expect(required(page)).toContainText('Dpa · active record present');
 });
 test('PCEXP-014 Missing required document type has missing state',async({page})=>{
  await openComplianceExport(page);await expect(required(page).locator('[data-state="missing"]')).toHaveCount(3);
 });
 test('PCEXP-015 Present active required type is distinct from missing types',async({page})=>{
  await openComplianceExport(page);await expect(required(page).locator('[data-state="present"]')).toContainText('Dpa · active record present');
 });
 test('PCEXP-016 An active recorded type is explicitly not proof of legal effectiveness',async({page})=>{
  await openComplianceExport(page);await expect(required(page)).toContainText('do not verify the content');
 });
 test('PCEXP-017 Summary current document count excludes archived history',async({page})=>{
  await openComplianceExport(page);await expect(root(page).getByLabel('Compliance export overview')).toContainText('2');
  await expect(root(page).getByLabel('Compliance export overview')).toContainText('1 archived historical records');
 });
 test('PCEXP-018 Review count and 45-day helper stay separate from registered total',async({page})=>{
  await openComplianceExport(page,{summary:{documents_requiring_review:3,documents_expiring_soon:1}});
  await expect(root(page).getByLabel('Compliance export overview')).toContainText('1 expire within 45 days');
 });
 test('PCEXP-019 Privacy overdue helper follows authorized evidence only',async({page})=>{
  await openComplianceExport(page);await expect(root(page).getByLabel('Compliance export overview')).toContainText('1 overdue');
 });
 test('PCEXP-020 Tenant export count helper describes recorded evidence, not actual delivery',async({page})=>{
  await openComplianceExport(page);await expect(root(page).getByLabel('Compliance export overview')).toContainText('2/3 with recorded export evidence');
  await expect(coverage(page)).toContainText('recipient delivery');
 });
 test('PCEXP-021 Retention holds use permission-scoped numerical metrics',async({page})=>{
  await openComplianceExport(page);await expect(root(page).getByLabel('Compliance export overview')).toContainText('2 due for review');
 });
 test('PCEXP-022 Permission attention helper separates users and API keys',async({page})=>{
  await openComplianceExport(page);await expect(root(page).getByLabel('Compliance export overview')).toContainText('1 users · 1 API keys');
 });
 test('PCEXP-023 Application source links are permission gated for privacy',async({page})=>{
  await openComplianceExport(page,{permissions:omit('platform.privacy.read')});
  await expect(supporting(page).getByRole('link',{name:'Privacy requests'})).toHaveCount(0);
  await expect(supporting(page).getByRole('link',{name:'Compliance docs'})).toBeVisible();
 });
 test('PCEXP-024 Tenant exports link requires tenant-read and export grants',async({page})=>{
  await openComplianceExport(page,{permissions:omit('platform.tenants.export')});
  await expect(supporting(page).getByRole('link',{name:'Tenant exports'})).toHaveCount(0);
 });
 test('PCEXP-025 Audit retention link requires both audit and tenant read',async({page})=>{
  await openComplianceExport(page,{permissions:omit('platform.tenants.read')});
  await expect(supporting(page).getByRole('link',{name:'Audit retention'})).toHaveCount(0);
 });
 test('PCEXP-026 Data retention link requires data-retention read permission',async({page})=>{
  await openComplianceExport(page,{permissions:omit('platform.data_retention.read')});
  await expect(supporting(page).getByRole('link',{name:'Data retention'})).toHaveCount(0);
 });
 test('PCEXP-027 Access review and permission audit links share source read grant',async({page})=>{
  await openComplianceExport(page,{permissions:omit('platform.access_reviews.read')});
  await expect(supporting(page).getByRole('link',{name:'Permission audit'})).toHaveCount(0);
  await expect(supporting(page).getByRole('link',{name:'Access reviews'})).toHaveCount(0);
 });
 test('PCEXP-028 Document package table includes recorded risk flags and readiness',async({page})=>{
  await openComplianceExport(page);await expect(row(page,draftExportDoc.title)).toContainText('Document not active');
  await expect(row(page,draftExportDoc.title)).toContainText('Current source review required');
 });
 test('PCEXP-029 Ready current document is a recorded checks clear state',async({page})=>{
  await openComplianceExport(page);await expect(row(page,exportDoc.title)).toContainText('Recorded checks clear');
  await expect(row(page,exportDoc.title)).toContainText('No current application flags');
 });
 test('PCEXP-030 Archived row is marked historical rather than a live blocker',async({page})=>{
  await openComplianceExport(page);await expect(row(page,historicalExportDoc.title)).toHaveAttribute('data-historical','true');
  await expect(row(page,historicalExportDoc.title)).toContainText('Historical archived record');
 });
 test('PCEXP-031 Visible document rows do not expose raw external URLs or secret content',async({page})=>{
  await openComplianceExport(page);await expect(evidence(page).getByRole('link',{name:'Open recorded reference'})).toHaveCount(0);
  await expect(row(page,exportDoc.title)).toContainText('Reference recorded');
 });
 test('PCEXP-032 Missing reference is explicit, not a fabricated external check',async({page})=>{
  await openComplianceExport(page);await expect(row(page,draftExportDoc.title)).toContainText('No reference recorded');
 });
 test('PCEXP-033 Tenant name restricted but presence represented without identity read',async({page})=>{
  await openComplianceExport(page,{permissions:omit('platform.tenants.read')});await expect(row(page,exportDoc.title)).toContainText('Restricted');
  await expect(row(page,exportDoc.title)).not.toContainText('Fixture Tenant A');
 });
 test('PCEXP-034 Owner email restricted without platform user-read grant',async({page})=>{
  await openComplianceExport(page,{permissions:omit('platform.users.read')});await expect(row(page,exportDoc.title)).toContainText('Restricted');
  await expect(row(page,exportDoc.title)).not.toContainText('owner@fixture.test');
 });
 test('PCEXP-035 Tenant source link is not exposed without tenants read',async({page})=>{
  await openComplianceExport(page,{permissions:omit('platform.tenants.read')});
  await expect(row(page,exportDoc.title).getByRole('link',{name:'Tenant source'})).toHaveCount(0);
 });
 test('PCEXP-036 Tenant source link uses the recorded UUID when authorized',async({page})=>{
  await openComplianceExport(page);await expect(row(page,exportDoc.title).getByRole('link',{name:'Tenant source'})).toHaveAttribute('href',`/platform/tenants/${exportTenant}`);
 });
 test('PCEXP-037 Document evidence pagination moves by fifty without rewriting summary',async({page})=>{
  const calls:string[]=[];await openComplianceExport(page,{documents:manyExportDocs(55),onCall:(m,p,q)=>{if(m==='GET'&&p===exportRoot)calls.push(q.toString());}});
  await expect(rows(page)).toHaveCount(50);await pager(page).getByRole('button',{name:'Next'}).click();await expect(rows(page)).toHaveCount(5);
  expect(new URLSearchParams(calls.at(-1)).get('document_offset')).toBe('50');await expect(pager(page)).toContainText('51–55 of 55');
 });
 test('PCEXP-038 Previous document page restores offset zero',async({page})=>{
  await openComplianceExport(page,{documents:manyExportDocs(55),query:'document_offset=50'});
  await expect(pager(page)).toContainText('51–55 of 55');await pager(page).getByRole('button',{name:'Previous'}).click();
  await expect(rows(page)).toHaveCount(50);await expect(pager(page)).toContainText('1–50 of 55');
 });
 test('PCEXP-039 Invalid document offset blocks package GET until reset',async({page})=>{
  const calls:string[]=[];await openComplianceExport(page,{query:'document_offset=bad',onCall:(m,p)=>{if(m==='GET'&&p===exportRoot)calls.push(p);}});
  await expect(root(page)).toContainText('Invalid document page.');expect(calls).toHaveLength(0);
  await root(page).getByRole('button',{name:'Reset page'}).click();await expect(rows(page)).toHaveCount(3);
 });
 test('PCEXP-040 Initial package read failure is explicit and retryable',async({page})=>{
  await openComplianceExport(page,{overrides:{[`GET ${exportRoot}`]:{status:503,json:{message:'Synthetic package failure'}}}});
  await expect(root(page)).toContainText('Compliance export evidence could not be loaded.');
  await expect(root(page).getByRole('button',{name:'Retry'})).toBeVisible();
 });
 test('PCEXP-041 Empty document snapshot retains absence boundary without certifying compliance',async({page})=>{
  await openComplianceExport(page,{documents:[]});await expect(evidence(page)).toContainText('No compliance-document rows are available on this evidence page.');
  await expect(coverage(page)).toContainText('application evidence only');
 });
});

/** Batch 86: remaining PCEXP-042..080. Browser declarations are intentionally unexecuted;
 * source-dependent backend, SQL, cross-principal, legal and malformed-response cases remain explicitly skipped. */
test.describe('Platform Compliance Export — offset, refresh, evidence boundaries (BATCH_086_GENERATED_UNRUN)',()=>{
 test('PCEXP-042 Invalid negative package offset blocks data query until reset',async({page})=>{
  const hits:string[]=[];await openComplianceExport(page,{query:'document_offset=-1',onCall:(m,p)=>{if(m==='GET'&&p===exportRoot)hits.push(p);}});
  await expect(root(page)).toContainText('Invalid document page.');expect(hits).toHaveLength(0);
  await root(page).getByRole('button',{name:'Reset page'}).click();await expect(rows(page)).toHaveCount(3);
 });
 test('PCEXP-043 Fractional document offset is invalid and requires explicit reset',async({page})=>{
  const hits:string[]=[];await openComplianceExport(page,{query:'document_offset=1.5',onCall:(m,p)=>{if(m==='GET'&&p===exportRoot)hits.push(p);}});
  await expect(root(page)).toContainText('whole number between 0 and 1,000,000');expect(hits).toHaveLength(0);
  await root(page).getByRole('button',{name:'Reset page'}).click();await expect(pager(page)).toContainText('1–3 of 3');
 });
 test('PCEXP-044 Package offset over one million is invalid and requires reset',async({page})=>{
  const hits:string[]=[];await openComplianceExport(page,{query:'document_offset=1000001',onCall:(m,p)=>{if(m==='GET'&&p===exportRoot)hits.push(p);}});
  await expect(root(page)).toContainText('Invalid document page.');expect(hits).toHaveLength(0);
  await root(page).getByRole('button',{name:'Reset page'}).click();await expect(rows(page)).toHaveCount(3);
 });
 test('PCEXP-045 Initial offset 50 uses server document offset and preserves other URL parameters',async({page})=>{
  const calls:string[]=[];await openComplianceExport(page,{documents:manyExportDocs(55),query:'document_offset=50&source=fixture',
   onCall:(m,p,q)=>{if(m==='GET'&&p===exportRoot)calls.push(q.toString());}});
  await expect(rows(page)).toHaveCount(5);expect(new URLSearchParams(calls.at(-1)).get('document_offset')).toBe('50');
  expect(new URL(page.url()).searchParams.get('source')).toBe('fixture');
 });
 test('PCEXP-046 Next button is disabled if no more document rows exist',async({page})=>{
  await openComplianceExport(page);await expect(pager(page).getByRole('button',{name:'Next'})).toBeDisabled();
 });
 test('PCEXP-047 Previous is disabled at offset zero despite nonempty registry',async({page})=>{
  await openComplianceExport(page);await expect(rows(page)).toHaveCount(3);
  await expect(pager(page).getByRole('button',{name:'Previous'})).toBeDisabled();
 });
 test('PCEXP-048 Pagination empty state reports zero of zero and blocks next',async({page})=>{
  await openComplianceExport(page,{documents:[]});await expect(pager(page)).toContainText('0–0 of 0');
  await expect(pager(page).getByRole('button',{name:'Next'})).toBeDisabled();
 });
 test('PCEXP-049 Changing offset retains unknown but harmless URL parameters',async({page})=>{
  await openComplianceExport(page,{documents:manyExportDocs(51),query:'tab=history&view=compact'});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect(rows(page)).toHaveCount(1);
  const q=new URL(page.url()).searchParams;expect(q.get('tab')).toBe('history');expect(q.get('view')).toBe('compact');expect(q.get('document_offset')).toBe('50');
 });
 test('PCEXP-050 Refresh issues a fresh permission-scoped package GET without mutation',async({page})=>{
  const calls:string[]=[];await openComplianceExport(page,{onCall:(m,p)=>{if(p===exportRoot)calls.push(m);}});
  await expect.poll(()=>calls.length).toBeGreaterThan(0);await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect.poll(()=>calls.length).toBeGreaterThan(1);expect(calls.every(m=>m==='GET')).toBe(true);
 });
 test('PCEXP-051 Refresh disables control while GET is pending',async({page})=>{
  let calls=0;let release:()=>void=()=>{};
  const gate=new Promise<void>(resolve=>{release=resolve;});
  await openComplianceExport(page,{respond:async(m,p)=>{if(m==='GET'&&p===exportRoot&&++calls===2){await gate;}return undefined;}});
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(root(page).getByRole('button',{name:'Refreshing…'})).toBeDisabled();release();
  await expect(root(page).getByRole('button',{name:'Refresh'})).toBeEnabled();
 });
 test('PCEXP-052 Failed refresh retains last successful package snapshot with stale warning',async({page})=>{
  let calls=0;await openComplianceExport(page,{respond:(m,p)=>m==='GET'&&p===exportRoot&&++calls>1?{status:503,json:{message:'Synthetic snapshot unavailable'}}:undefined});
  await expect(row(page,exportDoc.title)).toBeVisible();await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(root(page).locator('.platform-compliance-export__stale')).toContainText('Showing the last successful snapshot.');
  await expect(row(page,exportDoc.title)).toBeVisible();
 });
 test('PCEXP-053 Recovered retry removes stale warning without inventing legal proof',async({page})=>{
  let failRefresh=false;await openComplianceExport(page,{respond:(m,p)=>m==='GET'&&p===exportRoot&&failRefresh?{status:503,json:{message:'Synthetic temporary failure'}}:undefined});
  failRefresh=true;await root(page).getByRole('button',{name:'Refresh'}).click();await expect(root(page).locator('.platform-compliance-export__stale')).toBeVisible();
  failRefresh=false;await root(page).getByRole('button',{name:'Refresh'}).click();await expect(root(page).locator('.platform-compliance-export__stale')).toHaveCount(0);
  await expect(coverage(page)).toContainText('regulatory acceptance');
 });
 test('PCEXP-054 Server error message is displayed in blocking failure state',async({page})=>{
  await openComplianceExport(page,{overrides:{[`GET ${exportRoot}`]:{status:403,json:{message:'Synthetic package source denied'}}}});
  await expect(root(page).locator('.platform-compliance-export__blocking')).toContainText('Synthetic package source denied');
  await expect(root(page).getByRole('button',{name:'Retry'})).toBeVisible();
 });
 test('PCEXP-055 Restricted privacy totals never imply that no privacy requests exist',async({page})=>{
  await openComplianceExport(page,{permissions:omit('platform.privacy.read')});
  await expect(root(page).getByLabel('Compliance export overview')).toContainText('Privacy evidence restricted');
  await expect(coverage(page)).toContainText('Privacy requests · restricted');
 });
 test('PCEXP-056 Tenant export absence is not asserted as proof of delivery failure',async({page})=>{
  await openComplianceExport(page,{summary:{tenants_missing_export_evidence:3,tenants_with_export_evidence:0,total_tenants:3}});
  await expect(root(page).getByLabel('Compliance export overview')).toContainText('0/3 with recorded export evidence');
  await expect(coverage(page)).toContainText('recipient delivery');
 });
 test('PCEXP-057 Full source access without complete permission audit remains partial evidence',async({page})=>{
  await openComplianceExport(page,{evidenceComplete:false,posture:'compliance_export_partial_evidence',summary:{permission_evidence_complete:false}});
  await expect(root(page)).toContainText('Permission-scoped evidence');
  await expect(root(page)).toContainText(/partial evidence/i);
 });
 test('PCEXP-058 Blocked posture is not relabeled ready merely because document count is nonzero',async({page})=>{
  await openComplianceExport(page,{posture:'compliance_export_blocked'});
  await expect(row(page,exportDoc.title)).toBeVisible();await expect(root(page)).toContainText('Compliance export blocked');
 });
 test('PCEXP-059 Permission review attention posture stays a distinct risk signal',async({page})=>{
  await openComplianceExport(page,{summary:{permission_attention_required:6,users_requiring_permission_review:4,api_keys_requiring_permission_review:2}});
  await expect(root(page).getByLabel('Compliance export overview')).toContainText('4 users · 2 API keys');
 });
 test('PCEXP-060 Archival documents excluded from live review burden despite historical expiration',async({page})=>{
  await openComplianceExport(page,{documents:[exportDoc,{...historicalExportDoc,expires_at:'2020-01-01T00:00:00Z',risk_flags:['expired']}]});
  await expect(root(page).getByLabel('Compliance export overview')).toContainText('1 archived historical records');
  await expect(row(page,historicalExportDoc.title)).toHaveAttribute('data-historical','true');
 });
 test('PCEXP-061 Missing required active DPA record reported even when draft exists',async({page})=>{
  await openComplianceExport(page,{documents:[{...draftExportDoc,document_type:'dpa'}]});
  await expect(required(page)).toContainText('Dpa · missing active record');
 });
 test('PCEXP-062 Permission-sensitive source names are not displayed as fully available when omitted',async({page})=>{
  await openComplianceExport(page,{permissions:omit('platform.privacy.read','platform.audit.read')});
  for(const label of ['Privacy requests · restricted','Tenant export evidence · restricted','Audit retention · restricted']) await expect(coverage(page)).toContainText(label);
 });
 test('PCEXP-063 Restricted tenant ID is never shown in a source link or text',async({page})=>{
  await openComplianceExport(page,{permissions:omit('platform.tenants.read')});
  await expect(row(page,exportDoc.title).getByRole('link',{name:'Tenant source'})).toHaveCount(0);
  await expect(row(page,exportDoc.title)).not.toContainText(exportTenant);
 });
 test('PCEXP-064 Restricted owner identity never leaks into evidence cards',async({page})=>{
  await openComplianceExport(page,{permissions:omit('platform.users.read')});
  await expect(evidence(page)).not.toContainText('owner@fixture.test');await expect(row(page,exportDoc.title)).toContainText('Restricted');
 });
 test('PCEXP-065 Explicitly absent review date displays Not recorded',async({page})=>{
  await openComplianceExport(page);await expect(row(page,draftExportDoc.title)).toContainText('Not recorded');
 });
 test('PCEXP-066 Malformed recorded date displays Invalid date and no fabricated date',async({page})=>{
  await openComplianceExport(page,{documents:[{...exportDoc,reviewed_at:'not-a-date'}]});
  await expect(row(page,exportDoc.title)).toContainText('Invalid date');
 });
 test('PCEXP-067 Document reference presence without URL never renders a clickable external link',async({page})=>{
  await openComplianceExport(page);await expect(row(page,exportDoc.title)).toContainText('Reference recorded');
  await expect(row(page,exportDoc.title).locator('a[href^="http"]')).toHaveCount(0);
 });
 test('PCEXP-068 Permission-gated supporting operations cannot be reached using hidden links',async({page})=>{
  await openComplianceExport(page,{permissions:omit('platform.privacy.read','platform.access_reviews.read','platform.data_retention.read')});
  for(const link of ['Privacy requests','Access reviews','Permission audit','Data retention'])
   await expect(supporting(page).getByRole('link',{name:link})).toHaveCount(0);
 });
 test('PCEXP-069 Package-only view never emits POST PATCH PUT or DELETE to package route',async({page})=>{
  const writes:string[]=[];await openComplianceExport(page,{onCall:(m,p)=>{if(p===exportRoot&&m!=='GET')writes.push(m);}});
  await root(page).getByRole('button',{name:'Refresh'}).click();await expect(rows(page)).toHaveCount(3);expect(writes).toHaveLength(0);
 });
 test('PCEXP-070 Recorded current-document readiness never claims certification',async({page})=>{
  await openComplianceExport(page,{documents:[exportDoc]});await expect(row(page,exportDoc.title)).toContainText('Recorded checks clear');
  await expect(coverage(page)).toContainText('certification');
 });
 test('PCEXP-071 Empty required-document list must be interpreted only as application snapshot state',async({page})=>{
  await openComplianceExport(page,{summary:{required_document_types:[],missing_required_document_types:[]}});
  await expect(required(page).locator('[data-state]')).toHaveCount(0);
  await expect(required(page)).toContainText('do not verify the content');
 });
 test('PCEXP-072 Malformed response schema must be hardened before browser acceptance',async()=>{
  test.skip(true,'Source accesses response.evidence_access/document_evidence_access without runtime schema guards; requires frontend hardening and Phase 2');
 });
 test('PCEXP-073 Joi backend rejects invalid document offsets and disallowed query properties',async()=>{
  test.skip(true,'Backend Joi enforcement requires real isolated API, invalid query submissions and authenticated principal in Phase 2');
 });
 test('PCEXP-074 Backend package source inclusion must enforce every real permission combination',async()=>{
  test.skip(true,'Synthetic permissions/me cannot establish actual backend source permission checks; Phase 2 separate principals');
 });
 test('PCEXP-075 Independent SQL records and audit events need database acceptance',async()=>{
  test.skip(true,'Requires real disposable PostgreSQL and real audit rows; mocked GET does not verify SQL semantics');
 });
 test('PCEXP-076 Two tenant principals must verify response redaction and isolation',async()=>{
  test.skip(true,'Requires two real tenants and independent operator permissions; mock output cannot prove tenant isolation');
 });
 test('PCEXP-077 Actual privacy request lifecycle cannot be proved from mocked package totals',async()=>{
  test.skip(true,'Requires real privacy-request workflows and package summary readback with disposable data');
 });
 test('PCEXP-078 Retention holds and required document SQL aggregation require real PostgreSQL acceptance',async()=>{
  test.skip(true,'Requires PostgreSQL fixtures, cross-source rollups and transaction snapshots');
 });
 test('PCEXP-079 External document validity and signatures require independent human/legal evidence',async()=>{
  test.skip(true,'Legal/external document evidence is out of scope for browser mocks; separate authorized review required');
 });
 test('PCEXP-080 Certified compliance export and recipient delivery require a separate validated workflow',async()=>{
  test.skip(true,'Source is deliberately read-only and cannot generate certified export/delivery evidence');
 });
});

// Batch 150 — package URL guards, identity rendering and permission evidence error handling.
 test('PCEXP-081 Resetting invalid page retains harmless navigation context',async({page})=>{
  const calls:string[]=[];await openComplianceExport(page,{query:'document_offset=-3&trace=existing',onCall:(m,p,q)=>{if(m==='GET'&&p===exportRoot)calls.push(q.toString());}});
  await expect(root(page)).toContainText('Invalid document page.');expect(calls).toHaveLength(0);
  await root(page).getByRole('button',{name:'Reset page'}).click();
  const q=new URL(page.url()).searchParams;expect(q.get('trace')).toBe('existing');expect(q.has('document_offset')).toBe(false);
  await expect.poll(()=>calls.length).toBeGreaterThan(0);expect(new URLSearchParams(calls.at(-1)).get('document_offset')).toBe('0');
 });
 test('PCEXP-082 Non-finite document offsets never cause a package GET',async({page})=>{
  let calls=0;await openComplianceExport(page,{query:'document_offset=Infinity',onCall:(m,p)=>{if(m==='GET'&&p===exportRoot)calls++;}});
  await expect(root(page)).toContainText('Invalid document page.');expect(calls).toBe(0);
 });
 test('PCEXP-083 HTML-shaped document title renders as text and not as an image',async({page})=>{
  const hostile='<img src=x onerror=alert(1)>';await openComplianceExport(page,{documents:[{...exportDoc,title:hostile}]});
  await expect(row(page,hostile)).toBeVisible();await expect(row(page,hostile).locator('img,script,iframe')).toHaveCount(0);
 });
 test('PCEXP-084 HTML-shaped owner identity cannot inject SVG in authorized evidence',async({page})=>{
  const hostile='<svg onload=alert(1)>';await openComplianceExport(page,{documents:[{...exportDoc,owner_email:hostile}]});
  await expect(row(page,exportDoc.title)).toContainText(hostile);await expect(row(page,exportDoc.title).locator('svg,script,iframe')).toHaveCount(0);
 });
 test('PCEXP-085 Unrelated navigation metadata is not forwarded to package API',async({page})=>{
  const calls:string[]=[];await openComplianceExport(page,{query:'trace=sensitive-local-only&document_offset=0',onCall:(m,p,q)=>{if(m==='GET'&&p===exportRoot)calls.push(q.toString());}});
  await expect.poll(()=>calls.length).toBeGreaterThan(0);expect(new URL(page.url()).searchParams.get('trace')).toBe('sensitive-local-only');
  const request=new URLSearchParams(calls[0]);expect(request.has('trace')).toBe(false);expect(request.get('document_limit')).toBe('50');
 });
 test('PCEXP-086 HTTP 429 initial package failure is an error with retry, not a success result',async({page})=>{
  await openComplianceExport(page,{overrides:{[`GET ${exportRoot}`]:{status:429,json:{message:'Synthetic rate limit exceeded'}}}});
  await expect(root(page).locator('.platform-compliance-export__blocking')).toContainText('Synthetic rate limit exceeded');
  await expect(root(page).getByRole('button',{name:'Retry'})).toBeVisible();
  await expect(root(page).getByLabel('Compliance export overview')).toHaveCount(0);
 });
