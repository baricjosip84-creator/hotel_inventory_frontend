/** Batch 69 — GENERATED_UNRUN. Browser-visible application behavior only.
 * Synthetic API replies are never evidence of real role enforcement, durable
 * approvals, external maintenance, deployment, notifications or tenant isolation. */
import {test,expect,type Page} from '@playwright/test';
import {openPlatformChanges,changePermissions,changeSeed,syntheticChangeRows,
 CHANGE_TENANT_A,CHANGE_TENANT_B,CHANGE_WINDOW_PLATFORM,CHANGE_WINDOW_TENANT,
 CHANGE_RUNBOOK,CHANGE_DRAFT,CHANGE_PENDING,CHANGE_APPROVED,CHANGE_EXECUTED} from '../../../support/platformChangeManagementFixture';

const area=(page:Page)=>page.locator('.platform-change-management');
const section=(page:Page,name:string)=>page.locator('.platform-change-management__section').filter({has:page.getByRole('heading',{name,exact:true})});
const form=(page:Page)=>page.locator('.platform-change-management__section').filter({has:page.getByRole('heading',{name:/^(Prepare|Edit) change request$/})});
const registry=(page:Page)=>section(page,'Change registry');
const card=(page:Page,name:string)=>registry(page).locator('.platform-change-management__card').filter({has:page.getByRole('heading',{name,exact:true})});
const full=changePermissions;
const without=(...denied:string[])=>full.filter(p=>!denied.includes(p));
async function title(page:Page,value:string){await form(page).getByLabel('Title',{exact:true}).fill(value);}
async function note(page:Page,name:string,value:string){await card(page,name).getByLabel('Reason / execution note').fill(value);}

// Registry, read-only surfaces and evidence projection: PRCHG-001..015.
test.describe('Platform Change Management — registry and evidence (GENERATED_UNRUN)',()=>{
 test('PRCHG-001 Change Management shows its read-permission boundary and page size',async({page})=>{
  await openPlatformChanges(page);await expect(area(page)).toContainText('PLATFORM_CHANGES_READ');await expect(area(page)).toContainText('Page size · 50');
 });
 test('PRCHG-002 Application executed status never asserts external completion',async({page})=>{
  await openPlatformChanges(page);await expect(area(page)).toContainText('Application execution ≠ external outcome.');await expect(area(page)).toContainText('external system outcome occurred successfully');
 });
 test('PRCHG-003 Summary cards distinguish open, pending, high risk and executed',async({page})=>{
  await openPlatformChanges(page);const stats=page.getByLabel('Change management summary');for(const label of ['Open changes','Pending approval','Open high risk','Executed records'])await expect(stats).toContainText(label);
 });
 test('PRCHG-004 Summary and registry use distinct GET endpoints',async({page})=>{
  const seen:string[]=[];await openPlatformChanges(page,{onCall:(m,p)=>{if(m==='GET')seen.push(p);}});
  await expect.poll(()=>seen.filter(p=>p==='/platform/change-management/summary').length).toBeGreaterThan(0);
  await expect.poll(()=>seen.filter(p=>p==='/platform/change-management').length).toBeGreaterThan(0);
 });
 test('PRCHG-005 List query uses 50-item pagination and offset zero',async({page})=>{
  const params:URLSearchParams[]=[];await openPlatformChanges(page,{onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/change-management')params.push(new URLSearchParams(q));}});
  await expect(card(page,'Fixture network update')).toBeVisible();expect(params[0].get('limit')).toBe('50');expect(params[0].get('offset')).toBe('0');
 });
 test('PRCHG-006 Six workflow states are displayed with their distinct registry cards',async({page})=>{
  await openPlatformChanges(page);for(const name of ['Fixture network update','Fixture access review','Fixture approved cutover','Fixture historical release','Fixture rejected request','Fixture cancelled request'])await expect(card(page,name)).toBeVisible();
 });
 test('PRCHG-007 No matching records show empty-state wording without external guarantees',async({page})=>{
  await openPlatformChanges(page,{rows:[]});await expect(registry(page)).toContainText('No change requests found.');await expect(registry(page)).toContainText('does not prove no external');
 });
 test('PRCHG-008 Linked evidence grid exposes four independent scopes',async({page})=>{
  await openPlatformChanges(page);const grid=area(page).locator('.platform-change-management__evidence-grid');for(const name of ['Tenant evidence','Maintenance evidence','Runbook evidence','Operator identity'])await expect(grid).toContainText(name);
 });
 test('PRCHG-009 Tenant source name is redacted without tenant-read permission',async({page})=>{
  await openPlatformChanges(page,{permissions:without('platform.tenants.read')});await expect(card(page,'Fixture network update')).toContainText('Redacted');await expect(card(page,'Fixture network update')).not.toContainText('Fixture Hotel');
 });
 test('PRCHG-010 Operator email is redacted without users-read permission',async({page})=>{
  await openPlatformChanges(page,{permissions:without('platform.users.read')});await expect(card(page,'Fixture network update')).not.toContainText('requester@fixture.test');await expect(area(page).locator('.platform-change-management__evidence-grid')).toContainText('Redacted');
 });
 test('PRCHG-011 Maintenance identity is redacted without its read permission',async({page})=>{
  await openPlatformChanges(page,{permissions:without('platform.maintenance.read')});await expect(card(page,'Fixture network update')).not.toContainText('Hotel window');await expect(card(page,'Fixture network update')).toContainText('Redacted');
 });
 test('PRCHG-012 Runbook identity is redacted without independent read permission',async({page})=>{
  await openPlatformChanges(page,{permissions:without('platform.runbooks.read')});await expect(card(page,'Fixture network update')).not.toContainText('Fixture recovery');await expect(card(page,'Fixture network update')).toContainText('Redacted');
 });
 test('PRCHG-013 Audit link exists only with audit permission',async({page})=>{
  await openPlatformChanges(page,{permissions:without('platform.audit.read')});await expect(card(page,'Fixture network update').getByRole('link',{name:'Audit evidence'})).toHaveCount(0);
 });
 test('PRCHG-014 Evidence links point at the correct platform source routes',async({page})=>{
  await openPlatformChanges(page);const entry=card(page,'Fixture network update');await expect(entry.getByRole('link',{name:'Audit evidence'})).toHaveAttribute('href',new RegExp(`target_id=${CHANGE_DRAFT}`));await expect(entry.getByRole('link',{name:'Tenant source'})).toHaveAttribute('href',new RegExp(CHANGE_TENANT_A));
  await expect(entry.getByRole('link',{name:'Maintenance source'})).toHaveAttribute('href','/platform/maintenance');await expect(entry.getByRole('link',{name:'Runbook source'})).toHaveAttribute('href','/platform/runbooks');
 });
 test('PRCHG-015 Registry displays safely formatted missing description and planned times',async({page})=>{
  await openPlatformChanges(page);await expect(card(page,'Fixture access review')).toContainText('No description recorded.');await expect(card(page,'Fixture access review')).toContainText('Not set');
 });
});

// URL-backed filters, read limitations and paging: PRCHG-016..033.
test.describe('Platform Change Management — URL filters and paging (GENERATED_UNRUN)',()=>{
 test('PRCHG-016 Valid status URL requests only pending-approval records',async({page})=>{
  const seen:URLSearchParams[]=[];await openPlatformChanges(page,{query:'status=pending_approval',onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/change-management')seen.push(new URLSearchParams(q));}});await expect(card(page,'Fixture access review')).toBeVisible();await expect(card(page,'Fixture network update')).toHaveCount(0);expect(seen[0].get('status')).toBe('pending_approval');
 });
 test('PRCHG-017 Invalid status URL blocks registry GET while showing recovery control',async({page})=>{
  const seen:string[]=[];await openPlatformChanges(page,{query:'status=unknown',onCall:(m,p)=>{if(m==='GET'&&p==='/platform/change-management')seen.push(p);}});await expect(registry(page)).toContainText('Invalid or unauthorized URL filter');expect(seen).toHaveLength(0);
 });
 test('PRCHG-018 Category URL filters the server request and fixture records',async({page})=>{
  const seen:URLSearchParams[]=[];await openPlatformChanges(page,{query:'category=security',onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/change-management')seen.push(new URLSearchParams(q));}});await expect(card(page,'Fixture access review')).toBeVisible();expect(seen[0].get('category')).toBe('security');
 });
 test('PRCHG-019 Invalid category URL cannot silently broaden the registry',async({page})=>{
  await openPlatformChanges(page,{query:'category=external'});await expect(registry(page).getByRole('button',{name:'Clear invalid filters'})).toBeVisible();
 });
 test('PRCHG-020 Risk-level URL is forwarded using risk_level',async({page})=>{
  const seen:URLSearchParams[]=[];await openPlatformChanges(page,{query:'risk_level=critical',onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/change-management')seen.push(new URLSearchParams(q));}});await expect(card(page,'Fixture approved cutover')).toBeVisible();expect(seen[0].get('risk_level')).toBe('critical');
 });
 test('PRCHG-021 Invalid risk URL displays filter blocking error',async({page})=>{
  await openPlatformChanges(page,{query:'risk_level=urgent'});await expect(registry(page)).toContainText('Clear the invalid filter before loading Change Management data.');
 });
 test('PRCHG-022 Valid tenant UUID filters results when tenant-read is available',async({page})=>{
  await openPlatformChanges(page,{query:`tenant_id=${CHANGE_TENANT_A}`});await expect(card(page,'Fixture network update')).toBeVisible();await expect(card(page,'Fixture access review')).toHaveCount(0);
 });
 test('PRCHG-023 Invalid tenant UUID blocks requests rather than treating it as all tenants',async({page})=>{
  const calls:string[]=[];await openPlatformChanges(page,{query:'tenant_id=wrong',onCall:(m,p)=>{if(m==='GET'&&p==='/platform/change-management')calls.push(p);}});await expect(registry(page)).toContainText('Invalid or unauthorized URL filter');expect(calls).toHaveLength(0);
 });
 test('PRCHG-024 Tenant URL filter is rejected without tenant-read permission',async({page})=>{
  await openPlatformChanges(page,{query:`tenant_id=${CHANGE_TENANT_A}`,permissions:without('platform.tenants.read')});await expect(registry(page)).toContainText('Invalid or unauthorized URL filter');await expect(registry(page)).toContainText('Tenant filter restricted');
 });
 test('PRCHG-025 Search URL is forwarded and matches description as well as title',async({page})=>{
  const seen:URLSearchParams[]=[];await openPlatformChanges(page,{query:'search=maintenance%20plan',onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/change-management')seen.push(new URLSearchParams(q));}});await expect(card(page,'Fixture network update')).toBeVisible();expect(seen[0].get('search')).toBe('maintenance plan');
 });
 test('PRCHG-026 Oversized URL search blocks registry before request',async({page})=>{
  const search='x'.repeat(201),calls:string[]=[];await openPlatformChanges(page,{query:`search=${search}`,onCall:(m,p)=>{if(m==='GET'&&p==='/platform/change-management')calls.push(p);}});await expect(registry(page)).toContainText('Invalid or unauthorized URL filter');expect(calls).toHaveLength(0);
 });
 test('PRCHG-027 Clear invalid filters removes only managed keys and resumes list load',async({page})=>{
  await openPlatformChanges(page,{query:'status=bad&keep=1'});await registry(page).getByRole('button',{name:'Clear invalid filters'}).click();await expect(card(page,'Fixture network update')).toBeVisible();expect(new URL(page.url()).searchParams.get('keep')).toBe('1');expect(new URL(page.url()).searchParams.has('status')).toBe(false);
 });
 test('PRCHG-028 Changing status select writes URL and resets result rows',async({page})=>{
  await openPlatformChanges(page);await registry(page).getByLabel('Status',{exact:true}).selectOption('executed');await expect(card(page,'Fixture historical release')).toBeVisible();expect(new URL(page.url()).searchParams.get('status')).toBe('executed');
 });
 test('PRCHG-029 Changing category select updates the URL filter',async({page})=>{
  await openPlatformChanges(page);await registry(page).getByLabel('Category',{exact:true}).selectOption('billing');await expect(card(page,'Fixture rejected request')).toBeVisible();expect(new URL(page.url()).searchParams.get('category')).toBe('billing');
 });
 test('PRCHG-030 Changing risk select updates URL-backed query',async({page})=>{
  await openPlatformChanges(page);await registry(page).getByLabel('Risk',{exact:true}).selectOption('low');await expect(card(page,'Fixture network update')).toBeVisible();expect(new URL(page.url()).searchParams.get('risk_level')).toBe('low');
 });
 test('PRCHG-031 Search input updates URL without allowing more than 200 characters',async({page})=>{
  await openPlatformChanges(page);await registry(page).getByPlaceholder('Title or description').fill('access');await expect(card(page,'Fixture access review')).toBeVisible();await expect(registry(page).getByPlaceholder('Title or description')).toHaveAttribute('maxlength','200');
 });
 test('PRCHG-032 Server pagination advances to offset 50 then returns to zero',async({page})=>{
  const seen:number[]=[];await openPlatformChanges(page,{rows:syntheticChangeRows(52),onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/change-management')seen.push(Number(q.get('offset')));}});await expect(registry(page)).toContainText('Page 1');await registry(page).getByRole('button',{name:'Next'}).click();await expect(registry(page)).toContainText('Page 2');await expect(card(page,'Fixture change 051')).toBeVisible();await registry(page).getByRole('button',{name:'Previous'}).click();await expect(card(page,'Fixture change 001')).toBeVisible();expect(seen).toContain(50);
 });
 test('PRCHG-033 Filter changes after page 2 return server offset to zero',async({page})=>{
  const seen:{status:string|null;offset:number}[]=[];await openPlatformChanges(page,{rows:syntheticChangeRows(53),onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/change-management')seen.push({status:q.get('status'),offset:Number(q.get('offset'))});}});await registry(page).getByRole('button',{name:'Next'}).click();await expect(registry(page)).toContainText('Page 2');await registry(page).getByLabel('Status',{exact:true}).selectOption('draft');await expect(registry(page)).toContainText('Page 1');await expect.poll(()=>seen.some(x=>x.status==='draft'&&x.offset===0)).toBe(true);
 });
});

// Permission-scoped editor, payloads, validation and mutation feedback: PRCHG-034..054.
test.describe('Platform Change Management — preparation and editing (GENERATED_UNRUN)',()=>{
 test('PRCHG-034 Write permission shows the preparation form and Save draft',async({page})=>{
  await openPlatformChanges(page);await expect(form(page).getByRole('button',{name:'Save draft'})).toBeVisible();await expect(form(page).getByRole('button',{name:'Submit for approval'})).toBeVisible();
 });
 test('PRCHG-035 Read-only permission removes editor but retains the registry',async({page})=>{
  await openPlatformChanges(page,{permissions:without('platform.changes.write')});await expect(form(page)).toHaveCount(0);await expect(card(page,'Fixture network update')).toBeVisible();
 });
 test('PRCHG-036 Empty title keeps save disabled and sends no POST',async({page})=>{
  const writes:string[]=[];await openPlatformChanges(page,{onCall:(m,p)=>{if(m==='POST'&&p==='/platform/change-management')writes.push(p);}});await expect(form(page).getByRole('button',{name:'Save draft'})).toBeDisabled();expect(writes).toHaveLength(0);
 });
 test('PRCHG-037 Title and description fields expose the real character limits',async({page})=>{
  await openPlatformChanges(page);await expect(form(page).getByLabel('Title',{exact:true})).toHaveAttribute('maxlength','200');await expect(form(page).getByLabel('Description')).toHaveAttribute('maxlength','5000');
 });
 test('PRCHG-038 Default draft category is operational and risk medium',async({page})=>{
  await openPlatformChanges(page);await expect(form(page).getByLabel('Category',{exact:true})).toHaveValue('operational');await expect(form(page).getByLabel('Risk level')).toHaveValue('medium');
 });
 test('PRCHG-039 Low-risk Save draft posts trimmed title and no approval request',async({page})=>{
  const sent:any[]=[];await openPlatformChanges(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p==='/platform/change-management')sent.push(b);}});await title(page,'  Fixture draft created  ');await form(page).getByLabel('Risk level').selectOption('low');await form(page).getByRole('button',{name:'Save draft'}).click();await expect(area(page)).toContainText('Change draft saved.');expect(sent[0].title).toBe('Fixture draft created');expect(sent[0].submit_for_approval).toBe(false);
 });
 test('PRCHG-040 Submit for approval uses submit_for_approval true',async({page})=>{
  const sent:any[]=[];await openPlatformChanges(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p==='/platform/change-management')sent.push(b);}});await title(page,'Fixture submitted request');await form(page).getByRole('button',{name:'Submit for approval'}).click();await expect(area(page)).toContainText('Change request submitted for approval.');expect(sent[0].submit_for_approval).toBe(true);
 });
 test('PRCHG-041 High-risk Save draft displays server-returned pending approval state',async({page})=>{
  await openPlatformChanges(page);await title(page,'High risk fixture');await form(page).getByLabel('Risk level').selectOption('high');await form(page).getByRole('button',{name:'Save draft'}).click();await expect(area(page)).toContainText('Change request submitted for approval.');
 });
 test('PRCHG-042 Critical-risk Save draft uses critical payload and pending feedback',async({page})=>{
  const sent:any[]=[];await openPlatformChanges(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p==='/platform/change-management')sent.push(b);}});await title(page,'Critical fixture');await form(page).getByLabel('Risk level').selectOption('critical');await form(page).getByRole('button',{name:'Save draft'}).click();await expect(area(page)).toContainText('Change request submitted for approval.');expect(sent[0].risk_level).toBe('critical');
 });
 test('PRCHG-043 Blank description serializes to null rather than empty text',async({page})=>{
  const sent:any[]=[];await openPlatformChanges(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p==='/platform/change-management')sent.push(b);}});await title(page,'No description fixture');await form(page).getByRole('button',{name:'Save draft'}).click();await expect(area(page)).toContainText('Change draft saved.');expect(sent[0].description).toBeNull();
 });
 test('PRCHG-044 Optional tenant and linked evidence IDs serialize in the POST payload',async({page})=>{
  const sent:any[]=[];await openPlatformChanges(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p==='/platform/change-management')sent.push(b);}});await title(page,'Linked fixture');await form(page).getByLabel('Tenant',{exact:true}).selectOption(CHANGE_TENANT_A);await form(page).getByLabel('Maintenance window').selectOption(CHANGE_WINDOW_TENANT);await form(page).getByLabel('Runbook').selectOption(CHANGE_RUNBOOK);await form(page).getByRole('button',{name:'Save draft'}).click();await expect(area(page)).toContainText('Change draft saved.');expect(sent[0].tenant_id).toBe(CHANGE_TENANT_A);expect(sent[0].maintenance_window_id).toBe(CHANGE_WINDOW_TENANT);expect(sent[0].runbook_id).toBe(CHANGE_RUNBOOK);
 });
 test('PRCHG-045 Missing tenant-read permission omits tenant_id entirely from the write payload',async({page})=>{
  const sent:any[]=[];await openPlatformChanges(page,{permissions:without('platform.tenants.read'),onCall:(m,p,_q,b)=>{if(m==='POST'&&p==='/platform/change-management')sent.push(b);}});await title(page,'No tenant link');await form(page).getByRole('button',{name:'Save draft'}).click();await expect(area(page)).toContainText('Change draft saved.');expect(Object.prototype.hasOwnProperty.call(sent[0],'tenant_id')).toBe(false);
 });
 test('PRCHG-046 Missing maintenance-read permission omits its reference rather than forcing null',async({page})=>{
  const sent:any[]=[];await openPlatformChanges(page,{permissions:without('platform.maintenance.read'),onCall:(m,p,_q,b)=>{if(m==='POST'&&p==='/platform/change-management')sent.push(b);}});await title(page,'No maintenance link');await form(page).getByRole('button',{name:'Save draft'}).click();await expect(area(page)).toContainText('Change draft saved.');expect(Object.prototype.hasOwnProperty.call(sent[0],'maintenance_window_id')).toBe(false);
 });
 test('PRCHG-047 Missing runbooks-read permission omits runbook_id in POST',async({page})=>{
  const sent:any[]=[];await openPlatformChanges(page,{permissions:without('platform.runbooks.read'),onCall:(m,p,_q,b)=>{if(m==='POST'&&p==='/platform/change-management')sent.push(b);}});await title(page,'No runbook link');await form(page).getByRole('button',{name:'Save draft'}).click();await expect(area(page)).toContainText('Change draft saved.');expect(Object.prototype.hasOwnProperty.call(sent[0],'runbook_id')).toBe(false);
 });
 test('PRCHG-048 Tenant selection clears any previously selected tenant maintenance window',async({page})=>{
  await openPlatformChanges(page);await form(page).getByLabel('Tenant',{exact:true}).selectOption(CHANGE_TENANT_A);await form(page).getByLabel('Maintenance window').selectOption(CHANGE_WINDOW_TENANT);await form(page).getByLabel('Tenant',{exact:true}).selectOption(CHANGE_TENANT_B);await expect(form(page).getByLabel('Maintenance window')).toHaveValue('');
 });
 test('PRCHG-049 Maintenance selector lists scheduled and active, but not completed windows',async({page})=>{
  await openPlatformChanges(page);const maintenance=form(page).getByLabel('Maintenance window');await expect(maintenance).toContainText('Global window');await expect(maintenance).not.toContainText('Past window');await form(page).getByLabel('Tenant',{exact:true}).selectOption(CHANGE_TENANT_A);await expect(maintenance).toContainText('Hotel window');
 });
 test('PRCHG-050 Cross-tenant maintenance window does not appear for the wrong tenant',async({page})=>{
  await openPlatformChanges(page);await form(page).getByLabel('Tenant',{exact:true}).selectOption(CHANGE_TENANT_B);await expect(form(page).getByLabel('Maintenance window')).not.toContainText('Hotel window');await expect(form(page).getByLabel('Maintenance window')).toContainText('Global window');
 });
 test('PRCHG-051 Planned end earlier than start displays a client-side warning without POST',async({page})=>{
  const sent:string[]=[];await openPlatformChanges(page,{onCall:(m,p)=>{if(m==='POST'&&p==='/platform/change-management')sent.push(p);}});await title(page,'Bad chronology');await form(page).getByLabel('Planned start').fill('2026-11-05T12:00');await form(page).getByLabel('Planned end').fill('2026-11-05T11:00');await form(page).getByRole('button',{name:'Save draft'}).click();await expect(form(page)).toContainText('Planned end must be after planned start.');expect(sent).toHaveLength(0);
 });
 test('PRCHG-052 Equal planned start and end are rejected before POST',async({page})=>{
  const sent:string[]=[];await openPlatformChanges(page,{onCall:(m,p)=>{if(m==='POST'&&p==='/platform/change-management')sent.push(p);}});await title(page,'Equal chronology');await form(page).getByLabel('Planned start').fill('2026-11-05T12:00');await form(page).getByLabel('Planned end').fill('2026-11-05T12:00');await form(page).getByRole('button',{name:'Save draft'}).click();await expect(form(page)).toContainText('Planned end must be after planned start.');expect(sent).toHaveLength(0);
 });
 test('PRCHG-053 Valid planned times serialize ISO timestamps',async({page})=>{
  const sent:any[]=[];await openPlatformChanges(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p==='/platform/change-management')sent.push(b);}});await title(page,'Planned valid');await form(page).getByLabel('Planned start').fill('2026-11-05T08:00');await form(page).getByLabel('Planned end').fill('2026-11-05T09:00');await form(page).getByRole('button',{name:'Save draft'}).click();await expect(area(page)).toContainText('Change draft saved.');expect(sent[0].planned_start_at).toMatch(/^2026-11-05T\d\d:/);expect(new Date(sent[0].planned_end_at).getTime()).toBeGreaterThan(new Date(sent[0].planned_start_at).getTime());
 });
 test('PRCHG-054 Editing an existing draft loads its values and provides Cancel edit',async({page})=>{
  await openPlatformChanges(page);await card(page,'Fixture network update').getByRole('button',{name:'Edit'}).click();await expect(form(page).getByLabel('Title',{exact:true})).toHaveValue('Fixture network update');await expect(form(page).getByRole('button',{name:'Cancel edit'})).toBeVisible();await form(page).getByRole('button',{name:'Cancel edit'}).click();await expect(form(page).getByLabel('Title',{exact:true})).toHaveValue('');
 });
});

// State transition actions and cross-role UI controls: PRCHG-055..070.
test.describe('Platform Change Management — governed transitions (GENERATED_UNRUN)',()=>{
 test('PRCHG-055 Edit draft sends PATCH to the selected change ID',async({page})=>{
  const sent:{path:string;body:any}[]=[];await openPlatformChanges(page,{onCall:(m,p,_q,b)=>{if(m==='PATCH')sent.push({path:p,body:b});}});await card(page,'Fixture network update').getByRole('button',{name:'Edit'}).click();await title(page,'Revised fixture window');await form(page).getByRole('button',{name:'Save changes'}).click();await expect(area(page)).toContainText('Change request updated.');expect(sent[0].path).toBe(`/platform/change-management/${CHANGE_DRAFT}`);expect(sent[0].body.title).toBe('Revised fixture window');
 });
 test('PRCHG-056 Existing draft Submit for approval PATCH contains only direct submit flag',async({page})=>{
  const sent:any[]=[];await openPlatformChanges(page,{onCall:(m,p,_q,b)=>{if(m==='PATCH'&&p.endsWith(CHANGE_DRAFT))sent.push(b);}});await card(page,'Fixture network update').getByRole('button',{name:'Submit for approval'}).click();await expect(area(page)).toContainText('Change request is pending approval.');expect(sent[0]).toEqual({submit_for_approval:true});
 });
 test('PRCHG-057 Pending approval remains editable but has no submit-again action',async({page})=>{
  await openPlatformChanges(page);const pending=card(page,'Fixture access review');await expect(pending.getByRole('button',{name:'Edit'})).toBeVisible();await expect(pending.getByRole('button',{name:'Submit for approval'})).toHaveCount(0);await pending.getByRole('button',{name:'Edit'}).click();await expect(form(page).getByRole('button',{name:'Submit for approval'})).toHaveCount(0);
 });
 test('PRCHG-058 Approved and executed records do not expose Edit',async({page})=>{
  await openPlatformChanges(page);await expect(card(page,'Fixture approved cutover').getByRole('button',{name:'Edit'})).toHaveCount(0);await expect(card(page,'Fixture historical release').getByRole('button',{name:'Edit'})).toHaveCount(0);
 });
 test('PRCHG-059 Approval is hidden without approve permission even if write is available',async({page})=>{
  await openPlatformChanges(page,{permissions:without('platform.changes.approve')});await expect(card(page,'Fixture access review').getByRole('button',{name:'Approve'})).toHaveCount(0);await expect(card(page,'Fixture access review').getByRole('button',{name:'Reject'})).toHaveCount(0);
 });
 test('PRCHG-060 Execution is hidden without execute permission while approval may remain',async({page})=>{
  await openPlatformChanges(page,{permissions:without('platform.changes.execute')});await expect(card(page,'Fixture approved cutover').getByRole('button',{name:'Mark executed'})).toHaveCount(0);await expect(card(page,'Fixture access review').getByRole('button',{name:'Approve'})).toBeVisible();
 });
 test('PRCHG-061 Dismissing approval confirmation sends no approve POST',async({page})=>{
  const calls:string[]=[];await openPlatformChanges(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/approve'))calls.push(p);}});page.once('dialog',dialog=>{void dialog.dismiss();});await card(page,'Fixture access review').getByRole('button',{name:'Approve'}).click();expect(calls).toHaveLength(0);await expect(card(page,'Fixture access review')).toContainText('Pending approval');
 });
 test('PRCHG-062 Accepting approval posts a trimmed reason, then shows approved state',async({page})=>{
  const calls:{path:string;body:any}[]=[];await openPlatformChanges(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p.endsWith('/approve'))calls.push({path:p,body:b});}});await note(page,'Fixture access review','  Reviewed evidence  ');page.once('dialog',dialog=>{void dialog.accept();});await card(page,'Fixture access review').getByRole('button',{name:'Approve'}).click();await expect(area(page)).toContainText('Change request recorded as approved.');expect(calls[0].path).toBe(`/platform/change-management/${CHANGE_PENDING}/approve`);expect(calls[0].body.reason).toBe('Reviewed evidence');
 });
 test('PRCHG-063 Reject confirmation cancellation prevents a mutation',async({page})=>{
  const calls:string[]=[];await openPlatformChanges(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/reject'))calls.push(p);}});page.once('dialog',dialog=>{void dialog.dismiss();});await card(page,'Fixture access review').getByRole('button',{name:'Reject'}).click();expect(calls).toHaveLength(0);
 });
 test('PRCHG-064 Accepting rejection records reason and rejected UI feedback',async({page})=>{
  const calls:any[]=[];await openPlatformChanges(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p.endsWith('/reject'))calls.push(b);}});await note(page,'Fixture access review','  More evidence needed  ');page.once('dialog',dialog=>{void dialog.accept();});await card(page,'Fixture access review').getByRole('button',{name:'Reject'}).click();await expect(area(page)).toContainText('Change request recorded as rejected.');expect(calls[0].reason).toBe('More evidence needed');
 });
 test('PRCHG-065 Cancellation is offered only for draft, pending and approved changes',async({page})=>{
  await openPlatformChanges(page);for(const name of ['Fixture network update','Fixture access review','Fixture approved cutover'])await expect(card(page,name).getByRole('button',{name:'Cancel',exact:true})).toBeVisible();for(const name of ['Fixture historical release','Fixture rejected request','Fixture cancelled request'])await expect(card(page,name).getByRole('button',{name:'Cancel',exact:true})).toHaveCount(0);
 });
 test('PRCHG-066 Dismissing cancellation confirmation does not send a request',async({page})=>{
  const calls:string[]=[];await openPlatformChanges(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/cancel'))calls.push(p);}});page.once('dialog',dialog=>{void dialog.dismiss();});await card(page,'Fixture network update').getByRole('button',{name:'Cancel',exact:true}).click();expect(calls).toHaveLength(0);
 });
 test('PRCHG-067 Accepting cancellation posts reason and shows cancelled status',async({page})=>{
  const calls:any[]=[];await openPlatformChanges(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p.endsWith('/cancel'))calls.push(b);}});await note(page,'Fixture network update','  Change withdrawn  ');page.once('dialog',dialog=>{void dialog.accept();});await card(page,'Fixture network update').getByRole('button',{name:'Cancel',exact:true}).click();await expect(area(page)).toContainText('Change request recorded as cancelled.');expect(calls[0].reason).toBe('Change withdrawn');
 });
 test('PRCHG-068 Dismissing execution confirmation does not mark change executed',async({page})=>{
  const calls:string[]=[];await openPlatformChanges(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/execute'))calls.push(p);}});page.once('dialog',dialog=>{void dialog.dismiss();});await card(page,'Fixture approved cutover').getByRole('button',{name:'Mark executed'}).click();expect(calls).toHaveLength(0);
 });
 test('PRCHG-069 Execution records notes and application status, not external outcome',async({page})=>{
  const calls:any[]=[];await openPlatformChanges(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p.endsWith('/execute'))calls.push(b);}});await note(page,'Fixture approved cutover','  Evidence recorded only  ');page.once('dialog',dialog=>{void dialog.accept();});await card(page,'Fixture approved cutover').getByRole('button',{name:'Mark executed'}).click();await expect(area(page)).toContainText('Change request recorded as executed.');expect(calls[0].notes).toBe('Evidence recorded only');await expect(area(page)).toContainText('Application execution ≠ external outcome.');
 });
 test('PRCHG-070 Synthetic server rejection of an approval keeps visible error feedback',async({page})=>{
  await openPlatformChanges(page,{responses:{[`POST /platform/change-management/${CHANGE_PENDING}/approve`]:{status:403,json:{message:'Fixture approval denied'}}}});page.once('dialog',dialog=>{void dialog.accept();});await card(page,'Fixture access review').getByRole('button',{name:'Approve'}).click();await expect(area(page).locator('.platform-change-management__warning')).toContainText('Action failed:');await expect(card(page,'Fixture access review')).toContainText('Pending approval');
 });
});

// Batch 70 — PRCHG-071..100. Synthetic browser observations, not server guarantees.
test.describe('Platform Change Management — recovery and boundary coverage (GENERATED_UNRUN)',()=>{
 test('PRCHG-071 Status filter persists in the URL across a direct reload',async({page})=>{
  await openPlatformChanges(page,{query:'status=approved'});await expect(registry(page).getByLabel('Status')).toHaveValue('approved');await page.reload();await expect(registry(page).getByLabel('Status')).toHaveValue('approved');await expect(card(page,'Fixture approved cutover')).toBeVisible();
 });
 test('PRCHG-072 Changing category from page two resets server offset to zero',async({page})=>{
  const offsets:string[]=[];await openPlatformChanges(page,{rows:syntheticChangeRows(64),onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/change-management')offsets.push(q.get('offset')||'');}});await registry(page).getByRole('button',{name:'Next'}).click();await expect(registry(page)).toContainText('Page 2');await registry(page).getByLabel('Category').selectOption('security');await expect(registry(page)).toContainText('Page 1');await expect.poll(()=>offsets.at(-1)).toBe('0');
 });
 test('PRCHG-073 Tenant filter retains independently selected status and risk query fields',async({page})=>{
  await openPlatformChanges(page,{query:'status=draft&risk_level=low'});await registry(page).getByLabel('Tenant').selectOption(CHANGE_TENANT_A);await expect.poll(()=>new URL(page.url()).searchParams.get('status')).toBe('draft');expect(new URL(page.url()).searchParams.get('risk_level')).toBe('low');expect(new URL(page.url()).searchParams.get('tenant_id')).toBe(CHANGE_TENANT_A);
 });
 test('PRCHG-074 Initial rate-limit rejection displays a retryable registry error',async({page})=>{
  await openPlatformChanges(page,{respond:(m,p)=>m==='GET'&&p==='/platform/change-management'?{status:429,json:{message:'Synthetic request rate limited'}}:undefined});await expect(registry(page)).toContainText('Change registry unavailable');await expect(registry(page).getByRole('button',{name:'Retry'})).toBeVisible();await expect(registry(page)).not.toContainText('No change requests found.');
 });
 test('PRCHG-075 Summary-only failure does not hide independently available registry data',async({page})=>{
  await openPlatformChanges(page,{respond:(m,p)=>m==='GET'&&p==='/platform/change-management/summary'?{status:503,json:{message:'Synthetic summary failure'}}:undefined});await expect(card(page,'Fixture network update')).toBeVisible();await expect(area(page)).toContainText('Summary unavailable');
 });
 test('PRCHG-076 Failed summary refetch retains its previous metric snapshot with warning',async({page})=>{
  let fail=false;await openPlatformChanges(page,{respond:(m,p)=>m==='GET'&&p==='/platform/change-management/summary'&&fail?{status:503,json:{message:'Summary refresh failed'}}:undefined});await expect(area(page)).toContainText('Open changes');fail=true;await area(page).getByRole('button',{name:'Refresh'}).click();await expect(area(page)).toContainText('last successful Change Management snapshot');await expect(area(page)).toContainText('Open changes');
 });
 test('PRCHG-077 HTTP 503 initial registry error is not rendered as an empty record set',async({page})=>{
  await openPlatformChanges(page,{responses:{'GET /platform/change-management':{status:503,json:{message:'Fixture registry offline'}}}});await expect(registry(page)).toContainText('Change registry unavailable');await expect(registry(page).getByRole('button',{name:'Retry'})).toBeVisible();await expect(registry(page).locator('.platform-change-management__empty')).toHaveCount(0);
 });
 test('PRCHG-078 Registry Retry recovers after an explicitly released synthetic failure',async({page})=>{
  let fail=true;await openPlatformChanges(page,{respond:(m,p)=>m==='GET'&&p==='/platform/change-management'&&fail?{status:503,json:{message:'Temporary registry outage'}}:undefined});await expect(registry(page).getByRole('button',{name:'Retry'})).toBeVisible();fail=false;await registry(page).getByRole('button',{name:'Retry'}).click();await expect(card(page,'Fixture network update')).toBeVisible();
 });
 test('PRCHG-079 Refresh error retains last successful registry cards with stale warning',async({page})=>{
  let fail=false;await openPlatformChanges(page,{respond:(m,p)=>m==='GET'&&p==='/platform/change-management'&&fail?{status:503,json:{message:'Fixture refresh failed'}}:undefined});await expect(card(page,'Fixture network update')).toBeVisible();fail=true;await area(page).getByRole('button',{name:'Refresh'}).click();await expect(area(page)).toContainText('last successful Change Management snapshot');await expect(card(page,'Fixture network update')).toBeVisible();
 });
 test('PRCHG-080 Manual Refresh requests list, summary and eligible selector sources',async({page})=>{
  const seen:string[]=[];await openPlatformChanges(page,{onCall:(m,p)=>{if(m==='GET')seen.push(p);}});await expect(card(page,'Fixture network update')).toBeVisible();seen.length=0;await area(page).getByRole('button',{name:'Refresh'}).click();await expect.poll(()=>seen.includes('/platform/change-management')&&seen.includes('/platform/change-management/summary')&&seen.includes('/platform/tenants')&&seen.includes('/platform/maintenance')&&seen.includes('/platform/runbooks')).toBe(true);
 });
 test('PRCHG-081 Rate-limited refetch exposes source error without claiming a backoff',async({page})=>{
  let fail=false;await openPlatformChanges(page,{respond:(m,p)=>m==='GET'&&p==='/platform/change-management'&&fail?{status:429,json:{message:'Synthetic quota exceeded'}}:undefined});await expect(card(page,'Fixture network update')).toBeVisible();fail=true;await area(page).getByRole('button',{name:'Refresh'}).click();await expect(area(page)).toContainText('Synthetic quota exceeded');
 });
 test('PRCHG-082 Registry HTTP 403 shows an access error, not proven real authorization',async({page})=>{
  await openPlatformChanges(page,{respond:(m,p)=>m==='GET'&&p==='/platform/change-management'?{status:403,json:{message:'Fixture access denied'}}:undefined});await expect(registry(page)).toContainText('Fixture access denied');await expect(registry(page)).not.toContainText('No change requests found.');
 });
 test('PRCHG-083 Create 409 retains draft input and displays the rejected mutation',async({page})=>{
  await openPlatformChanges(page,{responses:{'POST /platform/change-management':{status:409,json:{message:'Fixture duplicate change'}}}});await title(page,'Unsent conflict');await form(page).getByRole('button',{name:'Save draft'}).click();await expect(form(page).getByLabel('Title',{exact:true})).toHaveValue('Unsent conflict');await expect(area(page)).toContainText('Fixture duplicate change');
 });
 test('PRCHG-084 Create HTTP 403 never renders a saved-draft success message',async({page})=>{
  await openPlatformChanges(page,{responses:{'POST /platform/change-management':{status:403,json:{message:'Fixture write denied'}}}});await title(page,'Write guard check');await form(page).getByRole('button',{name:'Save draft'}).click();await expect(area(page)).toContainText('Fixture write denied');await expect(area(page)).not.toContainText('Change draft saved.');
 });
 test('PRCHG-085 Edit 409 keeps editor values so operator can resolve conflict',async({page})=>{
  await openPlatformChanges(page,{responses:{[`PATCH /platform/change-management/${CHANGE_DRAFT}`]:{status:409,json:{message:'Fixture stale version'}}}});await card(page,'Fixture network update').getByRole('button',{name:'Edit'}).click();await title(page,'Keep my edits');await form(page).getByRole('button',{name:'Save changes'}).click();await expect(area(page)).toContainText('Fixture stale version');await expect(form(page).getByLabel('Title',{exact:true})).toHaveValue('Keep my edits');
 });
 test('PRCHG-086 Approval 409 leaves the original pending card and reports error',async({page})=>{
  await openPlatformChanges(page,{responses:{[`POST /platform/change-management/${CHANGE_PENDING}/approve`]:{status:409,json:{message:'Fixture approval conflict'}}}});page.once('dialog',d=>{void d.accept();});await card(page,'Fixture access review').getByRole('button',{name:'Approve'}).click();await expect(area(page)).toContainText('Fixture approval conflict');await expect(card(page,'Fixture access review')).toContainText('Pending approval');
 });
 test('PRCHG-087 Execute 409 leaves an approved card without external-completion claims',async({page})=>{
  await openPlatformChanges(page,{responses:{[`POST /platform/change-management/${CHANGE_APPROVED}/execute`]:{status:409,json:{message:'Fixture execution rejected'}}}});page.once('dialog',d=>{void d.accept();});await card(page,'Fixture approved cutover').getByRole('button',{name:'Mark executed'}).click();await expect(area(page)).toContainText('Fixture execution rejected');await expect(card(page,'Fixture approved cutover')).toContainText('Approved');
 });
 test('PRCHG-088 Cancel HTTP 403 does not change an approved visible record',async({page})=>{
  await openPlatformChanges(page,{responses:{[`POST /platform/change-management/${CHANGE_APPROVED}/cancel`]:{status:403,json:{message:'Fixture cancel forbidden'}}}});page.once('dialog',d=>{void d.accept();});await card(page,'Fixture approved cutover').getByRole('button',{name:'Cancel'}).click();await expect(area(page)).toContainText('Fixture cancel forbidden');await expect(card(page,'Fixture approved cutover')).toContainText('Approved');
 });
 test('PRCHG-089 A later successful action clears the previous mutation error',async({page})=>{
  let fail=true;await openPlatformChanges(page,{respond:(m,p)=>m==='POST'&&p==='/platform/change-management'&&fail?{status:409,json:{message:'Temporary action rejection'}}:undefined});await title(page,'Recovery draft');await form(page).getByRole('button',{name:'Save draft'}).click();await expect(area(page)).toContainText('Temporary action rejection');fail=false;await form(page).getByRole('button',{name:'Save draft'}).click();await expect(area(page)).toContainText('Change draft saved.');await expect(area(page)).not.toContainText('Temporary action rejection');
 });
 test('PRCHG-090 Pending create request disables duplicate draft and submit actions',async({page})=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});const sent:any[]=[];await openPlatformChanges(page,{asyncRespond:async(m,p,_q,b)=>{if(m==='POST'&&p==='/platform/change-management'){sent.push(b);await gate;}return undefined;}});await title(page,'Delayed write');await form(page).getByRole('button',{name:'Save draft'}).click();await expect(form(page).getByRole('button',{name:'Save draft'})).toBeDisabled();await expect(form(page).getByRole('button',{name:'Submit for approval'})).toBeDisabled();release();await expect(area(page)).toContainText('Change draft saved.');expect(sent).toHaveLength(1);
 });
 test('PRCHG-091 Action-note input accepts 1001 characters but backend reason contract limits 1000',async({page})=>{
  const seen:any[]=[];await openPlatformChanges(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p.endsWith('/approve'))seen.push(b);},responses:{[`POST /platform/change-management/${CHANGE_PENDING}/approve`]:{status:400,json:{message:'Reason must not exceed 1000 characters'}}}});await note(page,'Fixture access review','x'.repeat(1001));await expect(card(page,'Fixture access review').getByLabel('Reason / execution note')).toHaveValue('x'.repeat(1001));page.once('dialog',d=>{void d.accept();});await card(page,'Fixture access review').getByRole('button',{name:'Approve'}).click();await expect(area(page)).toContainText('Reason must not exceed 1000 characters');expect(seen[0].reason).toHaveLength(1001);
 });
 test('PRCHG-092 Successful action clears its reason input after readback',async({page})=>{
  await openPlatformChanges(page);await note(page,'Fixture access review','Synthetic approval explanation');page.once('dialog',d=>{void d.accept();});await card(page,'Fixture access review').getByRole('button',{name:'Approve'}).click();await expect(area(page)).toContainText('Change request recorded as approved.');await expect(card(page,'Fixture access review').getByLabel('Reason / execution note')).toHaveValue('');
 });
 test('PRCHG-093 Failed linked-selector GET does not prevent an unlinked draft',async({page})=>{
  await openPlatformChanges(page,{responses:{'GET /platform/runbooks':{status:503,json:{message:'Runbooks temporarily unavailable'}}}});await title(page,'Independent draft');await form(page).getByRole('button',{name:'Save draft'}).click();await expect(area(page)).toContainText('Change draft saved.');
 });
 test('PRCHG-094 Tenant directory failure does not render other tenant names in the form',async({page})=>{
  await openPlatformChanges(page,{responses:{'GET /platform/tenants':{status:503,json:{message:'Tenant directory unavailable'}}}});await expect(form(page).getByLabel('Tenant',{exact:true})).not.toContainText('Fixture Hotel');await expect(form(page).getByLabel('Tenant',{exact:true})).toContainText('Platform-wide / none');
 });
 test('PRCHG-095 Unscoped form offers platform windows without choosing a tenant',async({page})=>{
  await openPlatformChanges(page);await expect(form(page).getByLabel('Tenant',{exact:true})).toHaveValue('');await expect(form(page).getByLabel('Maintenance window')).toContainText('Global window');await expect(form(page).getByLabel('Maintenance window')).not.toContainText('Hotel window');
 });
 test('PRCHG-096 Runbook selector GET requires write plus runbook-read permission',async({page})=>{
  const calls:string[]=[];await openPlatformChanges(page,{permissions:without('platform.changes.write'),onCall:(m,p)=>{if(m==='GET'&&p==='/platform/runbooks')calls.push(p);}});await expect(registry(page)).toBeVisible();expect(calls).toHaveLength(0);await expect(area(page).getByRole('heading',{name:'Prepare change request'})).toHaveCount(0);
 });
 test('PRCHG-097 Clearing a browser date field sends null rather than a fabricated ISO value',async({page})=>{
  const writes:any[]=[];await openPlatformChanges(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p==='/platform/change-management')writes.push(b);}});await title(page,'Cleared date');const start=form(page).getByLabel('Planned start');await start.fill('2026-11-05T12:00');await start.fill('');await form(page).getByRole('button',{name:'Save draft'}).click();await expect(area(page)).toContainText('Change draft saved.');expect(writes[0].planned_start_at).toBeNull();
 });
 test('PRCHG-098 Combined valid URL filters reach the API separately',async({page})=>{
  const seen:URLSearchParams[]=[];await openPlatformChanges(page,{query:`status=draft&category=maintenance&risk_level=low&tenant_id=${CHANGE_TENANT_A}&search=Fixture`,onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/change-management')seen.push(new URLSearchParams(q));}});await expect(card(page,'Fixture network update')).toBeVisible();for(const [k,v] of Object.entries({status:'draft',category:'maintenance',risk_level:'low',tenant_id:CHANGE_TENANT_A,search:'Fixture'}))expect(seen[0].get(k)).toBe(v);
 });
 test('PRCHG-099 Supporting links hide permission-denied releases and audit',async({page})=>{
  await openPlatformChanges(page,{permissions:without('platform.releases.read','platform.audit.read','platform.maintenance.read','platform.runbooks.read','platform.tenants.read')});const links=section(page,'Supporting operations');for(const name of ['Releases','Platform audit','Maintenance','Runbooks','Tenants'])await expect(links.getByRole('link',{name})).toHaveCount(0);
 });
 test('PRCHG-100 Missing change-read permission is enforced by frontend route guard',async({page})=>{
  await openPlatformChanges(page,{permissions:without('platform.changes.read'),expectHeading:false});await expect(page.getByRole('heading',{name:'Change management',exact:true})).toHaveCount(0);await expect.poll(()=>page.url()).not.toMatch(/\/platform\/change-management(?:\?|$)/);
 });
});
