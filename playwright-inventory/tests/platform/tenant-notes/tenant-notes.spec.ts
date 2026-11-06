import { test, expect, type Page } from '@playwright/test';
import { openTenantNotes, noteRows, noteTenants, notePermissions, noteCategories, noteVisibilities,
  NOTE_TENANT_A, NOTE_TENANT_B, NOTE_RECORD_A, NOTE_RECORD_B, type TenantNote } from '../../../support/tenantNotesFixture';

/** Batch 58, Platform Tenant Notes: independent synthetic browser cases. All GENERATED_UNRUN.
 * Assertions concerning intercepted HTTP are NOT proofs of real server authorization/persistence. */
const filters=(page:Page)=>page.locator('.platform-tenant-notes__form-grid--filters');
const editor=(page:Page)=>page.locator('#platform-tenant-notes-form');
const card=(page:Page,title:string)=>page.locator('.platform-tenant-notes__card').filter({hasText:title});
const stats=(page:Page)=>page.getByLabel('Tenant notes page summary');
const stat=(page:Page,label:string)=>stats(page).locator('.io-workspace-stat').filter({has:page.locator('.io-workspace-stat__label',{hasText:label})}).locator('.io-workspace-stat__value');
const goodResponse={error:{message:'Fixture service unavailable'}};
const makeNote=(i:number, patch:Partial<TenantNote>={}):TenantNote=>({
  ...noteRows[0],id:`11111111-1111-4111-8111-${String(i).padStart(12,'0')}`,title:`Fixture note ${String(i).padStart(3,'0')}`,
  body:`Synthetic note ${i}`,pinned:false,updated_at:'2026-10-02T12:00:00Z',...patch
});
const fullPage=Array.from({length:101},(_,i)=>makeNote(i+1));
async function fillReadyNote(page:Page,title='New synthetic note',body='Visible fixture only'){
  await editor(page).getByLabel('Tenant').selectOption(NOTE_TENANT_A);
  await editor(page).getByLabel('Title').fill(title);
  await editor(page).getByLabel('Note',{exact:true}).fill(body);
}

test.describe('Platform Tenant Notes — source-traced browser behavior, Batch 58',()=>{
  test('PTNOTE-001 Page identifies endpoint, permission context and fixed page size',async ({page})=>{
    await openTenantNotes(page);
    await expect(page.getByText('Source · GET /platform/tenant-notes')).toBeVisible();
    await expect(page.getByText('Read · TENANTS_READ')).toBeVisible();
    await expect(page.getByText('Write · TENANTS_UPDATE')).toBeVisible();
    await expect(page.getByText('Page size · 100')).toBeVisible();
  });
  test('PTNOTE-002 Base query requests limit 100 and offset 0',async ({page})=>{
    const queries:URLSearchParams[]=[];
    await openTenantNotes(page,{onCall:(m,p,_b,q)=>{if(m==='GET'&&p==='/platform/tenant-notes')queries.push(new URLSearchParams(q));}});
    await expect.poll(()=>queries.length).toBeGreaterThan(0);
    expect(queries[0].get('limit')).toBe('100');expect(queries[0].get('offset')).toBe('0');
    expect(queries[0].has('tenant_id')).toBe(false);expect(queries[0].has('include_archived')).toBe(false);
  });
  test('PTNOTE-003 Tenant deep link applies valid UUID to request and tenant scope',async ({page})=>{
    const tenants:string[]=[];
    await openTenantNotes(page,{query:`tenant_id=${NOTE_TENANT_A}`,onCall:(m,p,_b,q)=>{if(m==='GET'&&p==='/platform/tenant-notes')tenants.push(q.get('tenant_id')||'');}});
    await expect.poll(()=>tenants).toContain(NOTE_TENANT_A);
    await expect(stat(page,'Tenant scope')).toHaveText('1');
    await expect(page.locator('.platform-tenant-notes__card')).toHaveCount(1);
  });
  test('PTNOTE-004 Tenant selector updates URL and refreshes filtered notes',async ({page})=>{
    await openTenantNotes(page,{query:'include_archived=true'});
    await filters(page).getByLabel('Tenant').selectOption(NOTE_TENANT_B);
    await expect(page).toHaveURL(new RegExp('tenant_id='+NOTE_TENANT_B));
    await expect(card(page,'Fixture archived risk')).toBeVisible();
    await expect(card(page,'Fixture handover')).toHaveCount(0);
  });
  test('PTNOTE-005 Category selection updates URL and restricts notes',async ({page})=>{
    await openTenantNotes(page,{query:'include_archived=true'});
    await filters(page).getByLabel('Category').selectOption('risk');
    await expect(page).toHaveURL(/category=risk/);
    await expect(card(page,'Fixture archived risk')).toBeVisible();
    await expect(card(page,'Fixture handover')).toHaveCount(0);
  });
  test('PTNOTE-006 Known categories match source-defined fallback registry options',async ({page})=>{
    await openTenantNotes(page);
    const values=await filters(page).getByLabel('Category').locator('option').evaluateAll(nodes=>nodes.map(n=>(n as HTMLOptionElement).value));
    expect(values).toEqual(['',...noteCategories]);
  });
  test('PTNOTE-007 Search input updates URL and API query after trimming',async ({page})=>{
    const values:string[]=[];
    await openTenantNotes(page,{onCall:(m,p,_b,q)=>{if(m==='GET'&&p==='/platform/tenant-notes')values.push(q.get('search')||'');}});
    await filters(page).getByLabel('Search').fill(' handover ');
    await expect(page).toHaveURL(/search=/);
    await expect.poll(()=>values.includes('handover')).toBe(true);
    await expect(card(page,'Fixture handover')).toBeVisible();
  });
  test('PTNOTE-008 Search field exposes maxLength 200',async ({page})=>{
    await openTenantNotes(page);
    await expect(filters(page).getByLabel('Search')).toHaveAttribute('maxlength','200');
  });
  test('PTNOTE-009 Archived toggle transmits true and renders archived notes',async ({page})=>{
    const values:string[]=[];
    await openTenantNotes(page,{onCall:(m,p,_b,q)=>{if(m==='GET'&&p==='/platform/tenant-notes')values.push(q.get('include_archived')||'');}});
    await expect(card(page,'Fixture archived risk')).toHaveCount(0);
    await filters(page).getByLabel('Include archived').check();
    await expect.poll(()=>values.includes('true')).toBe(true);
    await expect(card(page,'Fixture archived risk')).toBeVisible();
  });
  test('PTNOTE-010 Unchecking archived removes query parameter',async ({page})=>{
    await openTenantNotes(page,{query:'include_archived=true'});
    await expect(card(page,'Fixture archived risk')).toBeVisible();
    await filters(page).getByLabel('Include archived').uncheck();
    await expect(page).not.toHaveURL(/include_archived=/);
    await expect(card(page,'Fixture archived risk')).toHaveCount(0);
  });
  test('PTNOTE-011 Invalid tenant UUID blocks notes loading until cleared',async ({page})=>{
    const calls:string[]=[];
    await openTenantNotes(page,{query:'tenant_id=not-a-uuid',onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-notes')calls.push(p);}});
    await expect(page.locator('.platform-tenant-notes__inline-error')).toContainText('invalid tenant');
    expect(calls).toHaveLength(0);
    await page.getByRole('button',{name:'Clear invalid filter'}).click();
    await expect.poll(()=>calls.length).toBeGreaterThan(0);
  });
  test('PTNOTE-012 Unknown category URL blocks notes request until cleared',async ({page})=>{
    const calls:string[]=[];
    await openTenantNotes(page,{query:'category=unlisted',onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-notes')calls.push(p);}});
    await expect(page.getByRole('button',{name:'Clear invalid filter'})).toBeVisible();
    expect(calls).toHaveLength(0);
    await page.getByRole('button',{name:'Clear invalid filter'}).click();
    await expect.poll(()=>calls.length).toBeGreaterThan(0);
  });
  test('PTNOTE-013 Search URL over 200 characters blocks notes request',async ({page})=>{
    const calls:string[]=[];
    await openTenantNotes(page,{query:'search='+('z'.repeat(201)),onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-notes')calls.push(p);}});
    await expect(page.locator('.platform-tenant-notes__inline-error')).toContainText('invalid tenant, category, search, or archived filter');
    expect(calls).toHaveLength(0);
  });
  test('PTNOTE-014 Malformed include_archived value blocks listing',async ({page})=>{
    const calls:string[]=[];
    await openTenantNotes(page,{query:'include_archived=yes',onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-notes')calls.push(p);}});
    await expect(page.getByRole('button',{name:'Clear invalid filter'})).toBeVisible();
    expect(calls).toHaveLength(0);
  });
  test('PTNOTE-015 Clear invalid filters retains valid tenant/category filters',async ({page})=>{
    await openTenantNotes(page,{query:`tenant_id=${NOTE_TENANT_A}&category=support&include_archived=wrong`});
    await page.getByRole('button',{name:'Clear invalid filter'}).click();
    await expect(page).toHaveURL(new RegExp('tenant_id='+NOTE_TENANT_A));
    await expect(page).toHaveURL(/category=support/);
    await expect(page).not.toHaveURL(/include_archived=/);
    await expect(card(page,'Fixture handover')).toBeVisible();
  });
  test('PTNOTE-016 Initial notes HTTP error gives blocking error and retry',async ({page})=>{
    await openTenantNotes(page,{responses:{'GET /platform/tenant-notes':{status:503,json:goodResponse}}});
    await expect(page.getByText('Tenant notes could not be loaded.')).toBeVisible();
    await expect(page.getByRole('button',{name:'Retry',exact:true})).toBeVisible();
  });
  test('PTNOTE-017 Notes retry reissues listing request after initial outage',async ({page})=>{
    let failing=true;
    await openTenantNotes(page,{respond:(m,p)=>m==='GET'&&p==='/platform/tenant-notes'&&failing?{status:503,json:goodResponse}:undefined});
    await expect(page.getByText('Tenant notes could not be loaded.')).toBeVisible();
    failing=false;await page.getByRole('button',{name:'Retry',exact:true}).click();
    await expect(card(page,'Fixture handover')).toBeVisible();
  });
  test('PTNOTE-018 Background refresh failure retains last notes snapshot',async ({page})=>{
    let failing=false;
    await openTenantNotes(page,{respond:(m,p)=>m==='GET'&&p==='/platform/tenant-notes'&&failing?{status:503,json:goodResponse}:undefined});
    await expect(card(page,'Fixture handover')).toBeVisible();
    failing=true;await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await expect(page.getByText('Showing the last successful tenant notes snapshot.')).toBeVisible();
    await expect(card(page,'Fixture handover')).toBeVisible();
  });
  test('PTNOTE-019 Retry refresh clears last-notes-snapshot warning after recovery',async ({page})=>{
    let failing=false;
    await openTenantNotes(page,{respond:(m,p)=>m==='GET'&&p==='/platform/tenant-notes'&&failing?{status:503,json:goodResponse}:undefined});
    await expect(card(page,'Fixture handover')).toBeVisible();failing=true;
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await expect(page.getByText('Showing the last successful tenant notes snapshot.')).toBeVisible();
    failing=false;await page.getByRole('button',{name:'Retry refresh'}).click();
    await expect(page.getByText('Showing the last successful tenant notes snapshot.')).toHaveCount(0);
  });
  test('PTNOTE-020 Initial tenant list error disables tenant filter and exposes retry',async ({page})=>{
    await openTenantNotes(page,{responses:{'GET /platform/tenants':{status:503,json:goodResponse}}});
    await expect(page.getByText(/Tenant selector failed to load:/)).toBeVisible();
    await expect(filters(page).getByLabel('Tenant')).toBeDisabled();
    await expect(page.getByRole('button',{name:'Retry tenant list'})).toBeVisible();
  });
  test('PTNOTE-021 Retry tenant list recovers dropdown without resetting notes',async ({page})=>{
    let failing=true;
    await openTenantNotes(page,{respond:(m,p)=>m==='GET'&&p==='/platform/tenants'&&failing?{status:503,json:goodResponse}:undefined});
    await expect(filters(page).getByLabel('Tenant')).toBeDisabled();
    failing=false;await page.getByRole('button',{name:'Retry tenant list'}).click();
    await expect(filters(page).getByLabel('Tenant')).toBeEnabled();
    await expect(card(page,'Fixture handover')).toBeVisible();
  });
  test('PTNOTE-022 Refreshed tenant list failure preserves previous dropdown snapshot',async ({page})=>{
    let failing=false;
    await openTenantNotes(page,{respond:(m,p)=>m==='GET'&&p==='/platform/tenants'&&failing?{status:503,json:goodResponse}:undefined});
    await expect(filters(page).getByLabel('Tenant').locator('option')).toHaveCount(3);
    failing=true;await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await expect(page.getByText('Showing the last successful tenant selector snapshot.')).toBeVisible();
    await expect(filters(page).getByLabel('Tenant').locator('option')).toHaveCount(3);
  });
  test('PTNOTE-023 Explicit Refresh refetches tenants and notes',async ({page})=>{
    const calls:string[]=[];
    await openTenantNotes(page,{onCall:(m,p)=>{if(m==='GET'&&['/platform/tenants','/platform/tenant-notes'].includes(p))calls.push(p);}});
    await expect(card(page,'Fixture handover')).toBeVisible();
    const before=calls.length;
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await expect.poll(()=>calls.length).toBeGreaterThanOrEqual(before+2);
    expect(calls.slice(before)).toContain('/platform/tenants');
    expect(calls.slice(before)).toContain('/platform/tenant-notes');
  });
  test('PTNOTE-024 Invalid filters still allow tenant selector refresh but not notes loading',async ({page})=>{
    const calls:string[]=[];
    await openTenantNotes(page,{query:'category=bad',onCall:(m,p)=>{if(m==='GET')calls.push(p);}});
    const before=calls.filter(p=>p==='/platform/tenants').length;
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await expect.poll(()=>calls.filter(p=>p==='/platform/tenants').length).toBeGreaterThan(before);
    expect(calls).not.toContain('/platform/tenant-notes');
  });
  test('PTNOTE-025 Summary counters describe loaded page rather than registry totals',async ({page})=>{
    await openTenantNotes(page);
    await expect(stat(page,'Loaded notes')).toHaveText('1');
    await expect(stat(page,'Pinned on page')).toHaveText('1');
    await expect(stat(page,'Archived on page')).toHaveText('0');
    await expect(stats(page)).toContainText('not an all-registry total');
  });
  test('PTNOTE-026 Including archived updates archived counter and badges',async ({page})=>{
    await openTenantNotes(page,{query:'include_archived=true'});
    await expect(stat(page,'Loaded notes')).toHaveText('2');
    await expect(stat(page,'Archived on page')).toHaveText('1');
    await expect(card(page,'Fixture archived risk').locator('.platform-tenant-notes__badge',{hasText:'Archived'})).toHaveCount(1);
  });
  test('PTNOTE-027 Empty list explains scope of no-match result',async ({page})=>{
    await openTenantNotes(page,{notes:[]});
    await expect(page.getByText('No tenant note records match this view.')).toBeVisible();
    await expect(page.getByText(/does not prove no tenant context or external operational knowledge/)).toBeVisible();
  });
  test('PTNOTE-028 Previous and Next disabled when page contains fewer than 100 rows',async ({page})=>{
    await openTenantNotes(page);
    await expect(page.getByRole('button',{name:'Previous'})).toBeDisabled();
    await expect(page.getByRole('button',{name:'Next'})).toBeDisabled();
  });
  test('PTNOTE-029 Exactly 100 rows enable Next with offset 100',async ({page})=>{
    const offsets:number[]=[];
    await openTenantNotes(page,{notes:fullPage.slice(0,100),onCall:(m,p,_b,q)=>{if(m==='GET'&&p==='/platform/tenant-notes')offsets.push(Number(q.get('offset')));}});
    await expect(page.locator('.platform-tenant-notes__card')).toHaveCount(100);
    await page.getByRole('button',{name:'Next'}).click();
    await expect.poll(()=>offsets).toContain(100);
    await expect(page.getByText('Page 2',{exact:true})).toBeVisible();
  });
  test('PTNOTE-030 Previous returns from second page to offset zero',async ({page})=>{
    const offsets:number[]=[];
    await openTenantNotes(page,{notes:fullPage,onCall:(m,p,_b,q)=>{if(m==='GET'&&p==='/platform/tenant-notes')offsets.push(Number(q.get('offset')));}});
    await page.getByRole('button',{name:'Next'}).click();
    await expect(page.getByText('Page 2',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Previous'}).click();
    await expect(page.getByText('Page 1',{exact:true})).toBeVisible();
    await expect.poll(()=>offsets.slice(-1)[0]).toBe(0);
  });
  test('PTNOTE-031 Tenant/category filter change resets offset to page one',async ({page})=>{
    const offsets:number[]=[];
    await openTenantNotes(page,{notes:fullPage,onCall:(m,p,_b,q)=>{if(m==='GET'&&p==='/platform/tenant-notes')offsets.push(Number(q.get('offset')));}});
    await page.getByRole('button',{name:'Next'}).click();
    await expect(page.getByText('Page 2',{exact:true})).toBeVisible();
    await filters(page).getByLabel('Category').selectOption('risk');
    await expect(page.getByText('Page 1',{exact:true})).toBeVisible();
    await expect.poll(()=>offsets.slice(-1)[0]).toBe(0);
  });
  test('PTNOTE-032 Record card humanizes category/visibility and shows provenance',async ({page})=>{
    await openTenantNotes(page);
    await expect(card(page,'Fixture handover')).toContainText('Support');
    await expect(card(page,'Fixture handover')).toContainText('Visibility tag · Internal');
    await expect(card(page,'Fixture handover')).toContainText('creator@example.test');
    await expect(card(page,'Fixture handover')).toContainText('editor@example.test');
  });
  test('PTNOTE-033 Date and operator metadata use safe fallbacks for absent provenance',async ({page})=>{
    await openTenantNotes(page,{query:'include_archived=true'});
    await expect(card(page,'Fixture archived risk')).toContainText('Created Not recorded by unknown platform operator');
    await expect(card(page,'Fixture archived risk')).toContainText('Updated');
    await expect(card(page,'Fixture archived risk')).toContainText('Archived');
  });
  test('PTNOTE-034 Pinned record renders marker and pinned summary count',async ({page})=>{
    await openTenantNotes(page);
    await expect(card(page,'Fixture handover').getByRole('heading',{name:'Pinned · Fixture handover'})).toBeVisible();
    await expect(stat(page,'Pinned on page')).toHaveText('1');
  });
  test('PTNOTE-035 Read-only permission removes editor, edit, archive, and restore',async ({page})=>{
    await openTenantNotes(page,{query:'include_archived=true',permissions:notePermissions.filter(p=>p!=='platform.tenants.update')});
    await expect(page.getByText('Read-only operator')).toBeVisible();
    await expect(editor(page)).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Edit',exact:true})).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Archive',exact:true})).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Restore',exact:true})).toHaveCount(0);
  });
  test('PTNOTE-036 Support Operations and Billing links follow distinct permissions',async ({page})=>{
    await openTenantNotes(page,{permissions:['platform.tenants.read']});
    const links=page.locator('.platform-tenant-notes__link-row');
    await expect(links.getByRole('link',{name:'Support Operations'})).toHaveCount(0);
    await expect(links.getByRole('link',{name:'Billing'})).toHaveCount(0);
    await expect(links.getByRole('link',{name:'Tenant contacts'})).toBeVisible();
  });
  test('PTNOTE-037 Editor disabled until tenant is selected',async ({page})=>{
    await openTenantNotes(page);
    await editor(page).getByLabel('Title').fill('Fixture title');
    await editor(page).getByLabel('Note',{exact:true}).fill('Fixture body');
    await expect(editor(page).getByRole('button',{name:'Add note'})).toBeDisabled();
    await expect(editor(page)).toContainText('Select a tenant before creating a note.');
  });
  test('PTNOTE-038 Whitespace-only title and body keep Add note disabled',async ({page})=>{
    await openTenantNotes(page);
    await editor(page).getByLabel('Tenant').selectOption(NOTE_TENANT_A);
    await editor(page).getByLabel('Title').fill('  ');
    await editor(page).getByLabel('Note',{exact:true}).fill('  ');
    await expect(editor(page).getByRole('button',{name:'Add note'})).toBeDisabled();
  });
  test('PTNOTE-039 Editor exposes source-defined title and body lengths',async ({page})=>{
    await openTenantNotes(page);
    await expect(editor(page).getByLabel('Title')).toHaveAttribute('maxlength','220');
    await expect(editor(page).getByLabel('Note',{exact:true})).toHaveAttribute('maxlength','10000');
  });
  test('PTNOTE-040 Editor offers exact category and visibility classification values',async ({page})=>{
    await openTenantNotes(page);
    const cats=await editor(page).getByLabel('Category').locator('option').evaluateAll(nodes=>nodes.map(n=>(n as HTMLOptionElement).value));
    const tags=await editor(page).getByLabel('Visibility tag').locator('option').evaluateAll(nodes=>nodes.map(n=>(n as HTMLOptionElement).value));
    expect(cats).toEqual(noteCategories);expect(tags).toEqual(noteVisibilities);
    await expect(editor(page)).toContainText('Visibility is descriptive metadata only');
  });
  test('PTNOTE-041 Create trims title/body and sends selected metadata with POST tenant path',async ({page})=>{
    const calls:Array<{path:string;body:any}>=[];
    await openTenantNotes(page,{onCall:(m,p,b)=>{if(m==='POST'&&p.includes('/platform/tenant-notes/tenants/'))calls.push({path:p,body:b});}});
    await fillReadyNote(page,'  Fixture title  ','  Fixture body  ');
    await editor(page).getByLabel('Category').selectOption('handover');
    await editor(page).getByLabel('Visibility tag').selectOption('support');
    await editor(page).getByLabel('Pin note').check();
    await editor(page).getByRole('button',{name:'Add note'}).click();
    await expect.poll(()=>calls.length).toBe(1);
    expect(calls[0].path).toBe(`/platform/tenant-notes/tenants/${NOTE_TENANT_A}`);
    expect(calls[0].body).toEqual({title:'Fixture title',body:'Fixture body',category:'handover',visibility:'support',pinned:true});
  });
  test('PTNOTE-042 Successful create gives feedback and list readback from synthetic query',async ({page})=>{
    await openTenantNotes(page);
    await fillReadyNote(page,'New fixture note','Synthetic detail');
    await editor(page).getByRole('button',{name:'Add note'}).click();
    await expect(page.getByText('Tenant note created.')).toBeVisible();
    await expect(card(page,'New fixture note')).toContainText('Synthetic detail');
    await expect(editor(page).getByLabel('Title')).toHaveValue('');
  });
  test('PTNOTE-043 Create error retains entered fields and displays explicit failure',async ({page})=>{
    await openTenantNotes(page,{responses:{[`POST /platform/tenant-notes/tenants/${NOTE_TENANT_A}`]:{status:500,json:goodResponse}}});
    await fillReadyNote(page,'Keep after error','Must not vanish');
    await editor(page).getByRole('button',{name:'Add note'}).click();
    await expect(page.getByText(/Note change failed:/)).toBeVisible();
    await expect(editor(page).getByLabel('Title')).toHaveValue('Keep after error');
    await expect(card(page,'Keep after error')).toHaveCount(0);
  });
  test('PTNOTE-044 Edit opens existing note in a locked tenant selector',async ({page})=>{
    await openTenantNotes(page);
    await card(page,'Fixture handover').getByRole('button',{name:'Edit'}).click();
    await expect(editor(page).getByRole('heading',{name:'Edit tenant note'})).toBeVisible();
    await expect(editor(page).getByLabel('Tenant')).toBeDisabled();
    await expect(editor(page).getByLabel('Title')).toHaveValue('Fixture handover');
    await expect(editor(page).getByLabel('Pin note')).toBeChecked();
  });
  test('PTNOTE-045 Cancel edit returns to Add note without network PATCH',async ({page})=>{
    const patches:string[]=[];
    await openTenantNotes(page,{onCall:(m,p)=>{if(m==='PATCH')patches.push(p);}});
    await card(page,'Fixture handover').getByRole('button',{name:'Edit'}).click();
    await editor(page).getByLabel('Title').fill('Unsubmitted change');
    await editor(page).getByRole('button',{name:'Cancel edit'}).click();
    await expect(editor(page).getByRole('heading',{name:'Add tenant note'})).toBeVisible();
    await expect(editor(page).getByLabel('Title')).toHaveValue('');
    expect(patches).toHaveLength(0);
  });
  test('PTNOTE-046 Save edit PATCHes selected ID and refreshes synthetic list',async ({page})=>{
    const changes:Array<{path:string;body:any}>=[];
    await openTenantNotes(page,{onCall:(m,p,b)=>{if(m==='PATCH')changes.push({path:p,body:b});}});
    await card(page,'Fixture handover').getByRole('button',{name:'Edit'}).click();
    await editor(page).getByLabel('Title').fill('Updated handover');
    await editor(page).getByLabel('Pin note').uncheck();
    await editor(page).getByRole('button',{name:'Save note'}).click();
    await expect.poll(()=>changes.length).toBe(1);
    expect(changes[0].path).toBe(`/platform/tenant-notes/${NOTE_RECORD_A}`);
    expect(changes[0].body.title).toBe('Updated handover');expect(changes[0].body.pinned).toBe(false);
    await expect(page.getByText('Tenant note updated.')).toBeVisible();
    await expect(card(page,'Updated handover')).toBeVisible();
  });
  test('PTNOTE-047 Failed edit retains editing state with retryable fields',async ({page})=>{
    await openTenantNotes(page,{responses:{[`PATCH /platform/tenant-notes/${NOTE_RECORD_A}`]:{status:409,json:{message:'Restore the tenant note before editing it'}}}});
    await card(page,'Fixture handover').getByRole('button',{name:'Edit'}).click();
    await editor(page).getByLabel('Title').fill('Pending change');
    await editor(page).getByRole('button',{name:'Save note'}).click();
    await expect(page.getByText(/Note change failed:/)).toBeVisible();
    await expect(editor(page).getByLabel('Title')).toHaveValue('Pending change');
    await expect(editor(page).getByRole('button',{name:'Save note'})).toBeVisible();
  });
  test('PTNOTE-048 Dismissed archive confirmation does not POST',async ({page})=>{
    const archives:string[]=[];
    await openTenantNotes(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/archive'))archives.push(p);}});
    page.once('dialog',dialog=>dialog.dismiss());
    await card(page,'Fixture handover').getByRole('button',{name:'Archive'}).click();
    expect(archives).toHaveLength(0);
    await expect(card(page,'Fixture handover')).toBeVisible();
  });
  test('PTNOTE-049 Confirm archive POSTs note ID and removes record from active view',async ({page})=>{
    const archives:string[]=[];
    await openTenantNotes(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/archive'))archives.push(p);}});
    page.once('dialog',dialog=>dialog.accept());
    await card(page,'Fixture handover').getByRole('button',{name:'Archive'}).click();
    await expect.poll(()=>archives).toContain(`/platform/tenant-notes/${NOTE_RECORD_A}/archive`);
    await expect(page.getByText('Tenant note archived.')).toBeVisible();
    await expect(card(page,'Fixture handover')).toHaveCount(0);
  });
  test('PTNOTE-050 Archived note has Restore, lacks Edit, and linking to tenant/contacts remains available',async ({page})=>{
    await openTenantNotes(page,{query:'include_archived=true'});
    const archived=card(page,'Fixture archived risk');
    await expect(archived.getByRole('button',{name:'Restore'})).toBeVisible();
    await expect(archived.getByRole('button',{name:'Edit'})).toHaveCount(0);
    await expect(archived.getByRole('link',{name:'Tenant record'})).toHaveAttribute('href',`/platform/tenants?tenant_id=${NOTE_TENANT_B}`);
    await expect(archived.getByRole('link',{name:'Tenant contacts'})).toHaveAttribute('href',`/platform/tenant-contacts?tenant_id=${NOTE_TENANT_B}`);
  });
  // Batch 59: previously source-inventoried PTNOTE-051–060; all GENERATED_UNRUN.
  test('PTNOTE-051 Dismiss restore confirmation without POST',async ({page})=>{
    const calls:string[]=[];
    await openTenantNotes(page,{query:'include_archived=true',onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/restore'))calls.push(p);}});
    page.once('dialog',dialog=>dialog.dismiss());
    await card(page,'Fixture archived risk').getByRole('button',{name:'Restore'}).click();
    expect(calls).toHaveLength(0);
    await expect(card(page,'Fixture archived risk')).toHaveAttribute('data-archived','true');
  });
  test('PTNOTE-052 Confirm restore and verify active record readback',async ({page})=>{
    const calls:string[]=[];
    await openTenantNotes(page,{query:'include_archived=true',onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/restore'))calls.push(p);}});
    page.once('dialog',dialog=>dialog.accept());
    await card(page,'Fixture archived risk').getByRole('button',{name:'Restore'}).click();
    await expect.poll(()=>calls).toContain(`/platform/tenant-notes/${NOTE_RECORD_B}/restore`);
    await expect(page.getByText('Tenant note restored.')).toBeVisible();
    await expect(card(page,'Fixture archived risk').getByRole('button',{name:'Edit'})).toBeVisible();
    await expect(card(page,'Fixture archived risk').getByRole('button',{name:'Restore'})).toHaveCount(0);
  });
  test('PTNOTE-053 Restore server error retains archived state and gives feedback',async ({page})=>{
    await openTenantNotes(page,{query:'include_archived=true',responses:{[`POST /platform/tenant-notes/${NOTE_RECORD_B}/restore`]:{status:409,json:{message:'Restore conflict'}}}});
    page.once('dialog',dialog=>dialog.accept());
    await card(page,'Fixture archived risk').getByRole('button',{name:'Restore'}).click();
    await expect(page.getByText(/Note change failed:/)).toBeVisible();
    await expect(card(page,'Fixture archived risk').getByRole('button',{name:'Restore'})).toBeVisible();
    await expect(card(page,'Fixture archived risk').getByRole('button',{name:'Edit'})).toHaveCount(0);
  });
  test('PTNOTE-054 Archive server error retains active controls and gives failure',async ({page})=>{
    await openTenantNotes(page,{responses:{[`POST /platform/tenant-notes/${NOTE_RECORD_A}/archive`]:{status:500,json:{message:'Archive failed'}}}});
    page.once('dialog',dialog=>dialog.accept());
    await card(page,'Fixture handover').getByRole('button',{name:'Archive'}).click();
    await expect(page.getByText(/Note change failed:/)).toBeVisible();
    await expect(card(page,'Fixture handover').getByRole('button',{name:'Edit'})).toBeVisible();
    await expect(card(page,'Fixture handover').getByRole('button',{name:'Restore'})).toHaveCount(0);
  });
  test('PTNOTE-055 Archiving a note being edited resets current editor safely',async ({page})=>{
    await openTenantNotes(page,{query:'include_archived=true'});
    await card(page,'Fixture handover').getByRole('button',{name:'Edit'}).click();
    await editor(page).getByLabel('Title').fill('Unsaved draft');
    page.once('dialog',dialog=>dialog.accept());
    await card(page,'Fixture handover').getByRole('button',{name:'Archive'}).click();
    await expect(page.getByText('Tenant note archived.')).toBeVisible();
    await expect(editor(page).getByRole('heading',{name:'Add tenant note'})).toBeVisible();
    await expect(editor(page).getByLabel('Title')).toHaveValue('');
  });
  test('PTNOTE-056 Pending create disables editor fields and actions',async ({page})=>{
    await openTenantNotes(page,{delayMs:{[`POST /platform/tenant-notes/tenants/${NOTE_TENANT_A}`]:1500}});
    await fillReadyNote(page,'Delayed create','Synthetic pending only');
    await editor(page).getByRole('button',{name:'Add note'}).click();
    await expect(editor(page).getByRole('button',{name:'Saving…'})).toBeDisabled();
    await expect(editor(page).getByLabel('Title')).toBeDisabled();
    await expect(editor(page).getByLabel('Tenant')).toBeDisabled();
    await expect(page.getByText('Tenant note created.')).toBeVisible();
  });
  test('PTNOTE-057 Changing tenant URL filter resets editor when editing another tenant',async ({page})=>{
    await openTenantNotes(page);
    await card(page,'Fixture handover').getByRole('button',{name:'Edit'}).click();
    await expect(editor(page).getByRole('heading',{name:'Edit tenant note'})).toBeVisible();
    await filters(page).getByLabel('Tenant').selectOption(NOTE_TENANT_B);
    await expect(editor(page).getByRole('heading',{name:'Add tenant note'})).toBeVisible();
    await expect(editor(page).getByLabel('Title')).toHaveValue('');
    await expect(editor(page).getByLabel('Tenant')).toHaveValue(NOTE_TENANT_B);
  });
  test('PTNOTE-058 Refresh and pagination actions are disabled while notes are fetching',async ({page})=>{
    const many=Array.from({length:100},(_,i)=>makeNote(i+1));
    await openTenantNotes(page,{notes:many,delayMs:{'GET /platform/tenant-notes':1200}});
    await expect(page.getByRole('button',{name:'Next'})).toBeEnabled();
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await expect(page.getByRole('button',{name:'Refresh',exact:true})).toBeDisabled();
    await expect(page.getByRole('button',{name:'Next'})).toBeDisabled();
    await expect(page.getByRole('button',{name:'Refresh',exact:true})).toBeEnabled();
  });
  test('PTNOTE-059 Tenant-scoped supporting links preserve exact selected tenant_id',async ({page})=>{
    await openTenantNotes(page,{query:`tenant_id=${NOTE_TENANT_A}`});
    const links=page.locator('.platform-tenant-notes__link-row');
    await expect(links.getByRole('link',{name:'Tenants',exact:true})).toHaveAttribute('href',`/platform/tenants?tenant_id=${NOTE_TENANT_A}`);
    await expect(links.getByRole('link',{name:'Tenant contacts'})).toHaveAttribute('href',`/platform/tenant-contacts?tenant_id=${NOTE_TENANT_A}`);
    await expect(links.getByRole('link',{name:'Customer Success'})).toHaveAttribute('href','/platform/customer-success-admin');
  });
  test('PTNOTE-060 Support and Billing navigation links require matching permissions and retain tenant scope',async ({page})=>{
    await openTenantNotes(page,{query:`tenant_id=${NOTE_TENANT_A}`,permissions:notePermissions});
    const links=page.locator('.platform-tenant-notes__link-row');
    await expect(links.getByRole('link',{name:'Support Operations'})).toHaveAttribute('href',`/platform/support-operations-cockpit?tenant_id=${NOTE_TENANT_A}`);
    await expect(links.getByRole('link',{name:'Billing'})).toHaveAttribute('href',`/platform/billing?tenant_id=${NOTE_TENANT_A}`);
  });
});
