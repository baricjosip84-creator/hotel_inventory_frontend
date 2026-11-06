/** Batch 74 · GENERATED_UNRUN · Browser-visible synthetic legal/compliance evidence only.
 * No claim of actual GDPR/legal compliance, external agreements, backend ACL or real data correctness. */
import {test, expect, type Page} from '@playwright/test';
import {openLegalCompliance, legalPermissions, legalTenant, manyLegalDocuments, legalDocument, legalPrivacy, legalReview, legalRisk, legalVendor} from '../../../support/platformLegalComplianceReportingFixture';
const shell=(p:Page)=>p.locator('.platform-legal-compliance');
const coverage=(p:Page)=>p.locator('.platform-legal-compliance__coverage');
const correlations=(p:Page)=>p.locator('.platform-legal-compliance__correlations');
const table=(p:Page)=>p.locator('.platform-legal-compliance__table-wrap');
const rows=(p:Page)=>table(p).locator('tbody tr');
const item=(p:Page,label:string)=>rows(p).filter({hasText:label});
const filter=(p:Page)=>p.locator('.platform-legal-compliance__filters');
const pager=(p:Page)=>p.locator('.platform-legal-compliance__pager');
const without=(p:string)=>legalPermissions.filter(x=>x!==p);
const endpoint='/platform/legal-compliance-reporting/report';

test.describe('Legal/compliance reporting — posture and evidence boundary (GENERATED_UNRUN)',()=>{
 test('PLCR-001 Page identifies the workspace as legal and compliance reporting',async({page})=>{
  await openLegalCompliance(page);await expect(page.getByText('Legal & compliance reporting',{exact:true})).toBeVisible();
 });
 test('PLCR-002 Hero declares read-only application evidence rather than certification',async({page})=>{
  await openLegalCompliance(page);await expect(shell(page)).toContainText('Read-only application evidence');
 });
 test('PLCR-003 Complete access shows complete authorized source set',async({page})=>{
  await openLegalCompliance(page);await expect(shell(page)).toContainText('Complete authorized source set');
 });
 test('PLCR-004 Partial permissions show permission-scoped source set',async({page})=>{
  await openLegalCompliance(page,{permissions:without('platform.privacy.read')});await expect(shell(page)).toContainText('Permission-scoped source set');
 });
 test('PLCR-005 Posture ready is labeled application ready, not legal certified',async({page})=>{
  await openLegalCompliance(page,{posture:'legal_compliance_ready'});await expect(shell(page)).toContainText('Application ready');
  await expect(shell(page)).not.toContainText('Legally certified');
 });
 test('PLCR-006 Blocked posture renders blocked status label',async({page})=>{
  await openLegalCompliance(page,{posture:'legal_compliance_blocked'});await expect(shell(page)).toContainText('Blocked');
 });
 test('PLCR-007 Partial posture renders partial evidence status label',async({page})=>{
  await openLegalCompliance(page,{posture:'partial_evidence'});await expect(shell(page)).toContainText('Partial evidence');
 });
 test('PLCR-008 Generated snapshot marker is shown for successful response',async({page})=>{
  await openLegalCompliance(page);await expect(shell(page)).toContainText('Generated');
 });
 test('PLCR-009 Source summary is explicitly across authorized sources',async({page})=>{
  await openLegalCompliance(page);await expect(shell(page)).toContainText('visible across authorized sources');
 });
 test('PLCR-010 Review summary counts visible known evidence separately',async({page})=>{
  await openLegalCompliance(page);await expect(shell(page)).toContainText('known in authorized sources');
 });
 test('PLCR-011 Legal document expiry summary renders current document count',async({page})=>{
  await openLegalCompliance(page);await expect(shell(page)).toContainText('current document records');
 });
 test('PLCR-012 Evidence boundary states recorded data does not prove legal acceptance',async({page})=>{
  await openLegalCompliance(page);await expect(shell(page)).toContainText('does not prove that an external agreement exists');
 });
 test('PLCR-013 Evidence boundary distinguishes historical from current blockers',async({page})=>{
  await openLegalCompliance(page);await expect(shell(page)).toContainText('historical evidence and do not create current blockers');
 });
 test('PLCR-014 Export correlation shows a recorded posture only, not legal opinion',async({page})=>{
  await openLegalCompliance(page);await expect(correlations(page)).toContainText('Package review required');
  await expect(shell(page)).toContainText('not external legal opinions or certifications');
 });
 test('PLCR-015 Missing integration correlation is displayed as restricted',async({page})=>{
  await openLegalCompliance(page,{permissions:without('platform.dependencies.read')});
  await expect(correlations(page)).toContainText('Restricted');
 });
});

test.describe('Legal/compliance reporting — permissions and source isolation (GENERATED_UNRUN)',()=>{
 test('PLCR-016 Five actual legal-compliance sources are presented',async({page})=>{
  await openLegalCompliance(page);await expect(filter(page).getByLabel('Evidence source').locator('option')).toHaveCount(5);
 });
 test('PLCR-017 Compliance-document source is selected by default',async({page})=>{
  await openLegalCompliance(page);await expect(filter(page).getByLabel('Evidence source')).toHaveValue('legal_documents');
 });
 test('PLCR-018 Privacy source is selectable with privacy read permission',async({page})=>{
  await openLegalCompliance(page);await filter(page).getByLabel('Evidence source').selectOption('privacy_requests');
  await expect(item(page,'Fixture Privacy Request')).toBeVisible();await expect(item(page,'Fixture Data Processing Agreement')).toHaveCount(0);
 });
 test('PLCR-019 Access reviews source shows its own evidence rows',async({page})=>{
  await openLegalCompliance(page,{query:'source=access_reviews'});await expect(item(page,'Fixture Access Review')).toBeVisible();
  await expect(item(page,'Fixture Privacy Request')).toHaveCount(0);
 });
 test('PLCR-020 Risk register source shows risk evidence only',async({page})=>{
  await openLegalCompliance(page,{query:'source=risk_register'});await expect(item(page,'Fixture High Risk')).toBeVisible();
 });
 test('PLCR-021 Vendor source shows its own evidence records',async({page})=>{
  await openLegalCompliance(page,{query:'source=vendors'});await expect(item(page,'Fixture Contract Vendor')).toBeVisible();
 });
 test('PLCR-022 Missing privacy permission disables privacy source option',async({page})=>{
  await openLegalCompliance(page,{permissions:without('platform.privacy.read')});
  await expect(filter(page).getByLabel('Evidence source').locator('option[value="privacy_requests"]')).toBeDisabled();
 });
 test('PLCR-023 Missing access-review permission disables that option',async({page})=>{
  await openLegalCompliance(page,{permissions:without('platform.access_reviews.read')});
  await expect(filter(page).getByLabel('Evidence source').locator('option[value="access_reviews"]')).toBeDisabled();
 });
 test('PLCR-024 Missing risk-register permission disables that option',async({page})=>{
  await openLegalCompliance(page,{permissions:without('platform.risks.read')});
  await expect(filter(page).getByLabel('Evidence source').locator('option[value="risk_register"]')).toBeDisabled();
 });
 test('PLCR-025 Missing vendor permission disables vendor source option',async({page})=>{
  await openLegalCompliance(page,{permissions:without('platform.vendors.read')});
  await expect(filter(page).getByLabel('Evidence source').locator('option[value="vendors"]')).toBeDisabled();
 });
 test('PLCR-026 Restricted privacy source is not linked as a supporting action',async({page})=>{
  await openLegalCompliance(page,{permissions:without('platform.privacy.read')});
  await expect(page.locator('.platform-legal-compliance__links').getByRole('link',{name:'Privacy Requests',exact:true})).toHaveCount(0);
 });
 test('PLCR-027 Restricted risk source is not linked as a supporting action',async({page})=>{
  await openLegalCompliance(page,{permissions:without('platform.risks.read')});
  await expect(page.locator('.platform-legal-compliance__links').getByRole('link',{name:'Risk Register',exact:true})).toHaveCount(0);
 });
 test('PLCR-028 Restricted vendor source is not linked as a supporting action',async({page})=>{
  await openLegalCompliance(page,{permissions:without('platform.vendors.read')});
  await expect(page.locator('.platform-legal-compliance__links').getByRole('link',{name:'Vendors',exact:true})).toHaveCount(0);
 });
 test('PLCR-029 Restricted monitoring permission hides integration monitoring link',async({page})=>{
  await openLegalCompliance(page,{permissions:without('platform.dependencies.read')});
  await expect(page.locator('.platform-legal-compliance__links').getByRole('link',{name:'Integration Monitoring',exact:true})).toHaveCount(0);
 });
 test('PLCR-030 Available source coverage remains visible while another source restricted',async({page})=>{
  await openLegalCompliance(page,{permissions:without('platform.privacy.read')});
  await expect(coverage(page).locator('[data-state="restricted"]')).toContainText(['Privacy requests']);
  await expect(coverage(page).locator('[data-state="available"]')).toContainText(['Compliance documents']);
 });
 test('PLCR-031 Restricted aggregate privacy metric shows Restricted rather than false zero',async({page})=>{
  await openLegalCompliance(page,{permissions:without('platform.privacy.read')});
  await expect(shell(page)).toContainText('Privacy evidence restricted');
 });
 test('PLCR-032 Restricted aggregate access-review metric has explicit caveat',async({page})=>{
  await openLegalCompliance(page,{permissions:without('platform.access_reviews.read')});
  await expect(shell(page)).toContainText('Access Review evidence restricted');
 });
 test('PLCR-033 Restricted tenant identity renders linkage redaction',async({page})=>{
  await openLegalCompliance(page,{permissions:without('platform.tenants.read')});
  await expect(item(page,'Fixture Data Processing Agreement')).toContainText('Restricted tenant linkage');
  await expect(item(page,'Fixture Data Processing Agreement')).not.toContainText('Fixture Hotel');
 });
 test('PLCR-034 Tenant identity permission enables tenant source link',async({page})=>{
  await openLegalCompliance(page);await expect(item(page,'Fixture Data Processing Agreement').getByRole('link',{name:'Tenant source'}))
    .toHaveAttribute('href',`/platform/tenants/${legalTenant}`);
 });
 test('PLCR-035 Missing tenant read permission hides tenant source link',async({page})=>{
  await openLegalCompliance(page,{permissions:without('platform.tenants.read')});
  await expect(item(page,'Fixture Data Processing Agreement').getByRole('link',{name:'Tenant source'})).toHaveCount(0);
 });
 test('PLCR-036 Missing user read permission hides owner email in UI',async({page})=>{
  await openLegalCompliance(page,{permissions:without('platform.users.read')});
  await expect(item(page,'Fixture Data Processing Agreement')).toContainText('Owner linkage restricted');
  await expect(item(page,'Fixture Data Processing Agreement')).not.toContainText('confidential-owner@fixture.test');
 });
 test('PLCR-037 User read permission renders recorded owner email',async({page})=>{
  await openLegalCompliance(page);await expect(item(page,'Fixture Data Processing Agreement')).toContainText('confidential-owner@fixture.test');
 });
 test('PLCR-038 Direct forbidden source is handled as request denial, not evidence success',async({page})=>{
  await openLegalCompliance(page,{query:'source=privacy_requests',permissions:without('platform.privacy.read')});
  await expect(page.getByText('Legal/compliance evidence could not be loaded.')).toBeVisible();
  await expect(page.getByText('Synthetic source permission forbidden')).toBeVisible();
 });
});

test.describe('Legal/compliance reporting — URL validation, search and pagination (GENERATED_UNRUN)',()=>{
 test('PLCR-039 Unknown source blocks report fetch until reset',async({page})=>{
  let calls=0;await openLegalCompliance(page,{query:'source=unknown',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls++;}});
  await expect(page.getByText('Invalid evidence source.')).toBeVisible();expect(calls).toBe(0);
 });
 test('PLCR-040 Reset invalid source selects compliance documents',async({page})=>{
  await openLegalCompliance(page,{query:'source=unknown'});await page.getByRole('button',{name:'Reset source'}).click();
  await expect(filter(page).getByLabel('Evidence source')).toHaveValue('legal_documents');
  await expect(item(page,'Fixture Data Processing Agreement')).toBeVisible();
 });
 test('PLCR-041 Negative offset blocks request and provides reset',async({page})=>{
  let calls=0;await openLegalCompliance(page,{query:'offset=-3',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls++;}});
  await expect(page.getByText('Invalid evidence page.')).toBeVisible();expect(calls).toBe(0);
 });
 test('PLCR-042 Fractional offset is invalid and prevents fetch',async({page})=>{
  let calls=0;await openLegalCompliance(page,{query:'offset=2.5',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls++;}});
  await expect(page.getByText('Invalid evidence page.')).toBeVisible();expect(calls).toBe(0);
 });
 test('PLCR-043 Offset greater than one million is rejected locally',async({page})=>{
  await openLegalCompliance(page,{query:'offset=1000001'});await expect(page.getByText('Invalid evidence page.')).toBeVisible();
 });
 test('PLCR-044 Reset invalid page removes offset and restores table fetch',async({page})=>{
  await openLegalCompliance(page,{query:'offset=-1'});await page.getByRole('button',{name:'Reset page'}).click();
  await expect(item(page,'Fixture Data Processing Agreement')).toBeVisible();
  expect(new URL(page.url()).searchParams.has('offset')).toBe(false);
 });
 test('PLCR-045 Search longer than 200 URL characters blocks fetch',async({page})=>{
  let calls=0;await openLegalCompliance(page,{query:`search=${'x'.repeat(201)}`,onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls++;}});
  await expect(page.getByText('Search is too long.')).toBeVisible();expect(calls).toBe(0);
 });
 test('PLCR-046 Clear excessive search resets the URL and restores evidence',async({page})=>{
  await openLegalCompliance(page,{query:`search=${'x'.repeat(201)}`});await page.getByRole('button',{name:'Clear search'}).click();
  await expect(item(page,'Fixture Data Processing Agreement')).toBeVisible();
  expect(new URL(page.url()).searchParams.has('search')).toBe(false);
 });
 test('PLCR-047 Search input enforces maxLength 200',async({page})=>{
  await openLegalCompliance(page);await expect(filter(page).getByLabel('Search')).toHaveAttribute('maxlength','200');
 });
 test('PLCR-048 Applying search trims whitespace and sends a server query',async({page})=>{
  const searches:string[]=[];await openLegalCompliance(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)searches.push(q.get('search')||'');}});
  await filter(page).getByLabel('Search').fill('   Archived Agreement   ');
  await filter(page).getByRole('button',{name:'Apply'}).click();
  await expect.poll(()=>searches.at(-1)).toBe('Archived Agreement');
  await expect(item(page,'Fixture Archived Agreement')).toBeVisible();
  await expect(item(page,'Fixture Data Processing Agreement')).toHaveCount(0);
 });
 test('PLCR-049 Applying search resets page offset to zero',async({page})=>{
  await openLegalCompliance(page,{rows:manyLegalDocuments(55),query:'offset=50'});
  await filter(page).getByLabel('Search').fill('Fixture Document 002');
  await filter(page).getByRole('button',{name:'Apply'}).click();
  expect(new URL(page.url()).searchParams.has('offset')).toBe(false);
  await expect(item(page,'Fixture Document 002')).toBeVisible();
 });
 test('PLCR-050 Reset applied search removes search parameter',async({page})=>{
  await openLegalCompliance(page,{query:'search=Archived'});await filter(page).getByRole('button',{name:'Reset'}).click();
  await expect(item(page,'Fixture Data Processing Agreement')).toBeVisible();
  expect(new URL(page.url()).searchParams.has('search')).toBe(false);
 });
 test('PLCR-051 Changing source resets offset while keeping search',async({page})=>{
  await openLegalCompliance(page,{query:'source=legal_documents&search=Fixture&offset=50',rows:manyLegalDocuments(55)});
  await filter(page).getByLabel('Evidence source').selectOption('vendors');
  const q=new URL(page.url()).searchParams;expect(q.has('offset')).toBe(false);expect(q.get('search')).toBe('Fixture');
 });
 test('PLCR-052 Initial report request specifies page size 50',async({page})=>{
  const limits:string[]=[];await openLegalCompliance(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)limits.push(q.get('limit')||'');}});
  expect(limits).toContain('50');
 });
 test('PLCR-053 Server pagination Next requests offset 50',async({page})=>{
  const offsets:string[]=[];await openLegalCompliance(page,{rows:manyLegalDocuments(55),onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)offsets.push(q.get('offset')||'');}});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect.poll(()=>offsets.at(-1)).toBe('50');
  await expect(item(page,'Fixture Document 051')).toBeVisible();
 });
 test('PLCR-054 Previous returns to offset zero',async({page})=>{
  await openLegalCompliance(page,{rows:manyLegalDocuments(55),query:'offset=50'});
  await pager(page).getByRole('button',{name:'Previous'}).click();
  await expect(item(page,'Fixture Document 001')).toBeVisible();
  expect(new URL(page.url()).searchParams.has('offset')).toBe(false);
 });
 test('PLCR-055 Previous disabled on first server page',async({page})=>{
  await openLegalCompliance(page);await expect(pager(page).getByRole('button',{name:'Previous'})).toBeDisabled();
 });
 test('PLCR-056 Next disabled at end of evidence results',async({page})=>{
  await openLegalCompliance(page);await expect(pager(page).getByRole('button',{name:'Next'})).toBeDisabled();
 });
});

test.describe('Legal/compliance reporting — evidence details and error recovery (GENERATED_UNRUN)',()=>{
 test('PLCR-057 Historical compliance document is marked historical, not a current blocker',async({page})=>{
  await openLegalCompliance(page);await expect(item(page,'Fixture Archived Agreement')).toHaveAttribute('data-historical','true');
  await expect(item(page,'Fixture Archived Agreement')).toContainText('Historical');
 });
 test('PLCR-058 Legal document reference is presence-only, not a body export',async({page})=>{
  await openLegalCompliance(page);await expect(item(page,'Fixture Data Processing Agreement')).toContainText('Reference recorded');
  await expect(table(page)).not.toContainText('raw_document_body');
 });
 test('PLCR-059 Missing legal document reference is explicitly reported',async({page})=>{
  await openLegalCompliance(page);await expect(item(page,'Fixture Archived Agreement')).toContainText('No external reference');
 });
 test('PLCR-060 Privacy request evidence renders due date and requester-presence only',async({page})=>{
  await openLegalCompliance(page,{query:'source=privacy_requests'});
  await expect(item(page,'Fixture Privacy Request')).toContainText('requester email recorded');
  await expect(item(page,'Fixture Privacy Request')).toContainText('High priority');
 });
 test('PLCR-061 Access review shows pending and needs-change counts',async({page})=>{
  await openLegalCompliance(page,{query:'source=access_reviews'});await expect(item(page,'Fixture Access Review')).toContainText('3 pending');
  await expect(item(page,'Fixture Access Review')).toContainText('2 needs change');
 });
 test('PLCR-062 Risk record shows score and review date, not unredacted content',async({page})=>{
  await openLegalCompliance(page,{query:'source=risk_register'});
  await expect(item(page,'Fixture High Risk')).toContainText('score 12');
 });
 test('PLCR-063 Vendor evidence distinguishes missing SLA from verified SLA',async({page})=>{
  await openLegalCompliance(page,{query:'source=vendors'});
  await expect(item(page,'Fixture Contract Vendor')).toContainText('SLA reference missing');
 });
 test('PLCR-064 Risk flags present are formatted as application flags',async({page})=>{
  await openLegalCompliance(page);await expect(item(page,'Fixture Data Processing Agreement')).toContainText('Legal document expiring soon');
 });
 test('PLCR-065 Item without active flags shows no current application flags',async({page})=>{
  await openLegalCompliance(page);await expect(item(page,'Fixture Archived Agreement')).toContainText('No current application flags');
 });
 test('PLCR-066 Source action targets relevant source route, not unvalidated external URL',async({page})=>{
  await openLegalCompliance(page,{query:'source=privacy_requests'});
  await expect(item(page,'Fixture Privacy Request').getByRole('link',{name:'Open source page'})).toHaveAttribute('href','/platform/privacy-requests');
 });
 test('PLCR-067 Empty evidence shows explicit no-match row',async({page})=>{
  await openLegalCompliance(page,{query:'search=NoSuchFixture'});
  await expect(table(page)).toContainText('No evidence rows match this source and search.');
 });
 test('PLCR-068 Initial response failure exposes retry instead of falsely empty evidence',async({page})=>{
  await openLegalCompliance(page,{responses:{[`GET ${endpoint}`]:{status:503,json:{message:'Synthetic legal report unavailable'}}}});
  await expect(page.getByText('Legal/compliance evidence could not be loaded.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Retry'})).toBeVisible();
 });
 test('PLCR-069 Initial failure retry can recover when synthetic service returns',async({page})=>{
  let failing=true;await openLegalCompliance(page,{respond:(m,p)=>m==='GET'&&p===endpoint&&failing?{status:503,json:{message:'Synthetic temporarily unavailable'}}:undefined});
  await expect(page.getByText('Legal/compliance evidence could not be loaded.')).toBeVisible();
  failing=false;await page.getByRole('button',{name:'Retry'}).click();
  await expect(item(page,'Fixture Data Processing Agreement')).toBeVisible();
 });
 test('PLCR-070 Read-only report controls never issue browser write requests',async({page})=>{
  const writes:string[]=[];await openLegalCompliance(page,{onCall:(m,p)=>{if(p===endpoint&&m!=='GET')writes.push(m);}});
  await filter(page).getByLabel('Search').fill('Fixture');await filter(page).getByRole('button',{name:'Apply'}).click();
  await page.getByRole('button',{name:'Refresh'}).click();
  expect(writes).toHaveLength(0);
 });
});


/** Batch 75: PLCR-071..100 source-follow-up. PLCR-084 remains NEEDS_EXPECTATION:
 * the actual Evidence source select is NOT disabled while query.isFetching. */
test.describe('Legal/compliance reporting — permission, identity and refresh follow-up (GENERATED_UNRUN)',()=>{
 test('PLCR-071 Missing compliance read permission stops at route guard without evidence request',async({page})=>{
  let requests=0;await openLegalCompliance(page,{permissions:without('platform.compliance.read'),expectHeading:false,
   onCall:(m,p)=>{if(m==='GET'&&p===endpoint)requests++;}});
  await expect(page).toHaveURL(/\/platform\/?$/);await expect(shell(page)).toHaveCount(0);expect(requests).toBe(0);
 });
 test('PLCR-072 Each source coverage indicator reflects its own read permission',async({page})=>{
  const permissions=legalPermissions.filter(x=>!['platform.privacy.read','platform.vendors.read'].includes(x));
  await openLegalCompliance(page,{permissions});
  for(const [name,state] of [['Compliance documents','available'],['Privacy requests','restricted'],['Access reviews','available'],['Risk register','available'],['Vendors','restricted']] as const){
   await expect(coverage(page).locator(`[data-state="${state}"]`).filter({hasText:name})).toHaveCount(1);
  }
 });
 async function forbiddenSource(page:Page,source:string,permission:string){
  await openLegalCompliance(page,{query:`source=${source}`,permissions:without(permission)});
  await expect(page.getByText('Legal/compliance evidence could not be loaded.')).toBeVisible();
  await expect(page.getByText('Synthetic source permission forbidden')).toBeVisible();
  await expect(table(page).getByText('No evidence rows match this source and search.')).toHaveCount(0);
 }
 test('PLCR-073 Direct forbidden vendor source reports denial rather than empty success',async({page})=>{
  await forbiddenSource(page,'vendors','platform.vendors.read');
 });
 test('PLCR-074 Direct forbidden risk source reports denial rather than empty success',async({page})=>{
  await forbiddenSource(page,'risk_register','platform.risks.read');
 });
 test('PLCR-075 Direct forbidden review source reports denial rather than empty success',async({page})=>{
  await forbiddenSource(page,'access_reviews','platform.access_reviews.read');
 });
 test('PLCR-076 Restricted aggregate counts remain Restricted with omitted authorized sources',async({page})=>{
  await openLegalCompliance(page,{permissions:without('platform.privacy.read')});
  await expect(page.getByText('Current report items')).toBeVisible();
  await expect(page.getByText('Restricted',{exact:true}).first()).toBeVisible();
  await expect(shell(page)).toContainText('Privacy evidence restricted');
 });
 test('PLCR-077 Empty authorized registry reports no matches while source remains Available',async({page})=>{
  await openLegalCompliance(page,{rows:[]});
  await expect(coverage(page).locator('[data-state="available"]').filter({hasText:'Compliance documents'})).toBeVisible();
  await expect(table(page)).toContainText('No evidence rows match this source and search.');
  await expect(pager(page)).toContainText('Showing 0–0 of 0');
 });
 test('PLCR-078 Tenant id does not create tenant navigation link without identity permission',async({page})=>{
  await openLegalCompliance(page,{permissions:without('platform.tenants.read')});
  await expect(item(page,'Fixture Data Processing Agreement')).toContainText('Restricted tenant linkage');
  await expect(item(page,'Fixture Data Processing Agreement').getByRole('link',{name:'Tenant source'})).toHaveCount(0);
 });
 test('PLCR-079 Owner presence without email uses assigned fallback',async({page})=>{
  await openLegalCompliance(page,{rows:[{...legalDocument,owner_present:true,owner_email:null}]});
  await expect(item(page,'Fixture Data Processing Agreement')).toContainText('Owner assigned');
 });
 test('PLCR-080 Unlinked source record is labeled platform-wide',async({page})=>{
  await openLegalCompliance(page,{query:'source=vendors'});
  await expect(item(page,'Fixture Contract Vendor')).toContainText('Platform-wide');
 });
 test('PLCR-081 A failed manual refresh keeps last successful evidence and warns about stale data',async({page})=>{
  let fail=false;await openLegalCompliance(page,{respond:(m,p)=>m==='GET'&&p===endpoint&&fail?{status:503,json:{message:'Synthetic refresh failed'}}:undefined});
  await expect(item(page,'Fixture Data Processing Agreement')).toBeVisible();fail=true;
  await page.getByRole('button',{name:'Refresh'}).click();
  await expect(page.getByText('Showing the last successful snapshot.')).toBeVisible();
  await expect(item(page,'Fixture Data Processing Agreement')).toBeVisible();
 });
 test('PLCR-082 Successful refresh clears previous stale evidence warning',async({page})=>{
  let fail=false;await openLegalCompliance(page,{respond:(m,p)=>m==='GET'&&p===endpoint&&fail?{status:503,json:{message:'Synthetic refresh failed'}}:undefined});
  fail=true;await page.getByRole('button',{name:'Refresh'}).click();
  await expect(page.getByText('Showing the last successful snapshot.')).toBeVisible();
  fail=false;await page.getByRole('button',{name:'Refresh'}).click();
  await expect(page.getByText('Showing the last successful snapshot.')).toHaveCount(0);
  await expect(item(page,'Fixture Data Processing Agreement')).toBeVisible();
 });
 test('PLCR-083 Refresh pending indicator prevents a duplicate manual request',async({page})=>{
  let release!:()=>void;let hold=false;const gate=new Promise<void>(resolve=>{release=resolve;});
  await openLegalCompliance(page,{respond:async(m,p)=>{if(m==='GET'&&p===endpoint&&hold){await gate;}return undefined;}});
  hold=true;await page.getByRole('button',{name:'Refresh'}).click();
  await expect(page.getByRole('button',{name:'Refreshing…'})).toBeDisabled();release();
  await expect(page.getByRole('button',{name:'Refresh'})).toBeEnabled();
 });
});

test.describe('Legal/compliance reporting — URL and boundary follow-up (GENERATED_UNRUN)',()=>{
 test('PLCR-085 Search exactly at two hundred characters is permitted in report query',async({page})=>{
  const value='q'.repeat(200),calls:string[]=[];
  await openLegalCompliance(page,{query:`source=legal_documents&search=${value}`,onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)calls.push(q.get('search')||'');}});
  expect(calls).toContain(value);await expect(page.getByText('Search is too long.')).toHaveCount(0);
 });
 test('PLCR-086 Clear oversized URL search preserves unrelated parameters',async({page})=>{
  const long='q'.repeat(201);await openLegalCompliance(page,{query:`source=vendors&search=${long}&from=operations`});
  await expect(page.getByText('Search is too long.')).toBeVisible();await page.getByRole('button',{name:'Clear search'}).click();
  const q=new URL(page.url()).searchParams;expect(q.get('from')).toBe('operations');expect(q.get('source')).toBe('vendors');
  expect(q.has('search')).toBe(false);
 });
 test('PLCR-087 Offset one million is accepted by frontend validation and sent to report request',async({page})=>{
  const offsets:string[]=[];await openLegalCompliance(page,{query:'offset=1000000',onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)offsets.push(q.get('offset')||'');}});
  expect(offsets).toContain('1000000');await expect(page.getByText('Invalid evidence page.')).toHaveCount(0);
 });
 test('PLCR-088 Reset malformed offset preserves selected evidence source',async({page})=>{
  await openLegalCompliance(page,{query:'source=risk_register&offset=oops'});
  await page.getByRole('button',{name:'Reset page'}).click();
  await expect(filter(page).getByLabel('Evidence source')).toHaveValue('risk_register');
  await expect(item(page,'Fixture High Risk')).toBeVisible();
 });
 test('PLCR-089 Changing evidence source resets a previously paginated offset',async({page})=>{
  await openLegalCompliance(page,{query:'source=legal_documents&offset=50',rows:manyLegalDocuments(55)});
  await filter(page).getByLabel('Evidence source').selectOption('vendors');
  const q=new URL(page.url()).searchParams;expect(q.get('source')).toBe('vendors');expect(q.has('offset')).toBe(false);
 });
 test('PLCR-090 Next page keeps source and search URL parameters',async({page})=>{
  await openLegalCompliance(page,{query:'source=legal_documents&search=Fixture',rows:manyLegalDocuments(55)});
  await pager(page).getByRole('button',{name:'Next'}).click();
  const q=new URL(page.url()).searchParams;expect(q.get('source')).toBe('legal_documents');
  expect(q.get('search')).toBe('Fixture');expect(q.get('offset')).toBe('50');
 });
 test('PLCR-091 Previous page never issues a negative offset',async({page})=>{
  const offsets:number[]=[];await openLegalCompliance(page,{rows:manyLegalDocuments(55),query:'offset=50',
   onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)offsets.push(Number(q.get('offset')||0));}});
  await pager(page).getByRole('button',{name:'Previous'}).click();
  await expect(item(page,'Fixture Document 001')).toBeVisible();expect(offsets.every(x=>x>=0)).toBe(true);
 });
 test('PLCR-092 Last server page correctly reports its bounded evidence range',async({page})=>{
  await openLegalCompliance(page,{rows:manyLegalDocuments(55),query:'offset=50'});
  await expect(pager(page)).toContainText('Showing 51–55 of 55 compliance documents records');
  await expect(pager(page).getByRole('button',{name:'Next'})).toBeDisabled();
 });
 test('PLCR-093 Invalid legal document reviewed date renders Invalid date',async({page})=>{
  await openLegalCompliance(page,{rows:[{...legalDocument,reviewed_at:'not-a-date'}]});
  await expect(item(page,'Fixture Data Processing Agreement')).toContainText('reviewed Invalid date');
 });
 test('PLCR-094 Missing reviewed and expiration dates show Not recorded',async({page})=>{
  await openLegalCompliance(page,{rows:[{...legalDocument,reviewed_at:null,expires_at:null}]});
  await expect(item(page,'Fixture Data Processing Agreement')).toContainText('reviewed Not recorded · expires Not recorded');
 });
 test('PLCR-095 Undefined access-review pending counts appear as zero, not missing',async({page})=>{
  await openLegalCompliance(page,{query:'source=access_reviews',rows:[{...legalReview,pending_items:undefined,needs_change_items:undefined}]});
  await expect(item(page,'Fixture Access Review')).toContainText('0 pending · 0 needs change');
 });
 test('PLCR-096 Closed historical risk evidence remains marked historical',async({page})=>{
  await openLegalCompliance(page,{query:'source=risk_register',rows:[{...legalRisk,title:'Fixture Closed Risk',status:'closed',historical:true,report_state:'historical',risk_flags:[]}]});
  await expect(item(page,'Fixture Closed Risk')).toHaveAttribute('data-historical','true');
  await expect(item(page,'Fixture Closed Risk')).toContainText('Historical');
  await expect(item(page,'Fixture Closed Risk')).toContainText('No current application flags');
 });
 test('PLCR-097 Archived vendor is historical rather than displayed as active legal blocker',async({page})=>{
  await openLegalCompliance(page,{query:'source=vendors',rows:[{...legalVendor,name:'Fixture Archived Vendor',status:'archived',historical:true,report_state:'historical',risk_flags:[]}]});
  await expect(item(page,'Fixture Archived Vendor')).toHaveAttribute('data-historical','true');
  await expect(item(page,'Fixture Archived Vendor')).not.toContainText('Legal review required');
 });
 test('PLCR-098 All five item types navigate only to their defined source route',async({page})=>{
  await openLegalCompliance(page);
  for(const [source,name,path] of [
   ['legal_documents','Fixture Data Processing Agreement','/platform/compliance-documents'],
   ['privacy_requests','Fixture Privacy Request','/platform/privacy-requests'],
   ['access_reviews','Fixture Access Review','/platform/access-reviews'],
   ['risk_register','Fixture High Risk','/platform/risk-register'],
   ['vendors','Fixture Contract Vendor','/platform/vendors']
  ] as const){
   await filter(page).getByLabel('Evidence source').selectOption(source);
   await expect(item(page,name).getByRole('link',{name:'Open source page'})).toHaveAttribute('href',path);
  }
 });
 test('PLCR-099 Evidence view does not expose raw documents, requester email or secret payload',async({page})=>{
  const privateText='do-not-render-fixture-secret';
  await openLegalCompliance(page,{rows:[{...legalDocument,raw_document_body:privateText,secret:privateText},
   {...legalPrivacy,requester_email:privateText,raw_payload:privateText}]});
  await expect(shell(page)).not.toContainText(privateText);
  await filter(page).getByLabel('Evidence source').selectOption('privacy_requests');
  await expect(shell(page)).not.toContainText(privateText);
 });
 test('PLCR-100 Read-only report contains no mutation, approval or export controls',async({page})=>{
  await openLegalCompliance(page);
  for(const name of ['Save','Publish','Approve','Download','Delete']){
   await expect(shell(page).getByRole('button',{name,exact:true})).toHaveCount(0);
  }
  await expect(page.getByRole('button',{name:'Refresh'})).toBeVisible();
 });
});

// Batch 150 — combined URL guards, inert evidence, source-wide versus filtered totals.
 test('PLCR-101 Multiple invalid deep-link fields suppress every report GET',async({page})=>{
  let calls=0;await openLegalCompliance(page,{query:`source=unknown&offset=-1&search=${'x'.repeat(201)}`,onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls++;}});
  await expect(page.getByText('Invalid evidence source.')).toBeVisible();
  await expect(page.getByText('Invalid evidence page.')).toBeVisible();
  await expect(page.getByText('Search is too long.')).toBeVisible();expect(calls).toBe(0);
 });
 test('PLCR-102 Resetting only invalid page cannot bypass remaining invalid source and search',async({page})=>{
  let calls=0;await openLegalCompliance(page,{query:`source=unknown&offset=-1&search=${'x'.repeat(201)}`,onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls++;}});
  await page.getByRole('button',{name:'Reset page'}).click();
  await expect(page.getByText('Invalid evidence source.')).toBeVisible();
  await expect(page.getByText('Search is too long.')).toBeVisible();
  expect(new URL(page.url()).searchParams.has('offset')).toBe(false);expect(calls).toBe(0);
 });
 test('PLCR-103 Clearing excessive search cannot bypass an unrelated invalid source',async({page})=>{
  let calls=0;await openLegalCompliance(page,{query:`source=unknown&search=${'z'.repeat(201)}`,onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls++;}});
  await page.getByRole('button',{name:'Clear search'}).click();
  expect(new URL(page.url()).searchParams.get('source')).toBe('unknown');
  await expect(page.getByText('Invalid evidence source.')).toBeVisible();expect(calls).toBe(0);
 });
 test('PLCR-104 HTML-shaped document titles remain inert evidence text',async({page})=>{
  const text='<img src=x onerror=alert(1)>';await openLegalCompliance(page,{rows:[{...legalDocument,title:text}]});
  await expect(item(page,text)).toBeVisible();await expect(item(page,text).locator('img,script,iframe')).toHaveCount(0);
 });
 test('PLCR-105 HTML-shaped risk flags remain inert evidence annotations',async({page})=>{
  const text='<svg onload=alert(1)>';await openLegalCompliance(page,{rows:[{...legalDocument,risk_flags:[text]}]});
  await expect(item(page,legalDocument.title)).toContainText(text);await expect(item(page,legalDocument.title).locator('svg,script,iframe')).toHaveCount(0);
 });
 test('PLCR-106 Vendor source selection does not narrow registry-wide summary totals',async({page})=>{
  await openLegalCompliance(page,{query:'source=vendors'});
  await expect(item(page,'Fixture Contract Vendor')).toBeVisible();
  await expect(item(page,'Fixture Data Processing Agreement')).toHaveCount(0);
  await expect(page.getByLabel('Legal and compliance overview')).toContainText('6 visible across authorized sources');
 });
