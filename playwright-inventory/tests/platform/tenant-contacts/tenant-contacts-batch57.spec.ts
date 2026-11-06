import { test, expect, type Page } from '@playwright/test';
import {
  openTenantContacts, CONTACT_TENANT_A, CONTACT_TENANT_B, CONTACT_RECORD_A,
  contactPermissionSnapshot, type ContactRecord
} from '../../../support/tenantContactsFixture';

/** Batch 57: PTCONT-007..060. Generated from PlatformTenantContactsPage and platform
 * tenantContacts route/service. Synthetic transport only; NO runtime or backend acceptance. */
const registry=(page:Page)=>page.locator('.platform-tenant-contacts__list');
const card=(page:Page,name:string)=>page.locator('.platform-tenant-contacts__card').filter({has:page.getByRole('heading',{name,exact:true})});
const filters=(page:Page)=>page.locator('.platform-tenant-contacts__form-grid--filters');
const editor=(page:Page)=>page.locator('#platform-tenant-contacts-form');
const stat=(page:Page,label:string)=>page.getByLabel('Tenant contact page summary').locator('.io-workspace-stat').filter({hasText:label}).locator('.io-workspace-stat__value');
const makeContact=(i:number,overrides:Partial<ContactRecord>={}):ContactRecord=>({
  id:`11111111-1111-4111-8111-${String(i+1).padStart(12,'0')}`,
  tenant_id:CONTACT_TENANT_A,tenant_name:'Fixture Hotel',contact_type:'operations',
  name:`Fixture Contact ${String(i).padStart(3,'0')}`,email:`fixture${i}@example.test`,phone:null,
  title:null,is_primary:false,escalation_order:1,notes:null,created_at:'2026-10-01T12:00:00Z',
  updated_at:'2026-10-02T12:00:00Z',created_by_name:null,...overrides
});
const fullPage=Array.from({length:101},(_,i)=>makeContact(i));
const apiError={error:{message:'Synthetic fixture rejection'}};

// Query-string validation and registry loading

test.describe('Tenant Contacts — URL and filtering',()=>{
  test('PTCONT-007 Unsupported contact_type in URL is rejected before registry query',async ({page})=>{
    const calls:string[]=[];
    await openTenantContacts(page,{query:'contact_type=unlisted',onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-contacts')calls.push(p);}});
    await expect(page.locator('.platform-tenant-contacts__inline-error')).toContainText('invalid contact-type filter');
    expect(calls).toHaveLength(0);
    await page.getByRole('button',{name:'Clear invalid filter'}).click();
    await expect(page).not.toHaveURL(/contact_type=/);
    await expect.poll(()=>calls.length).toBeGreaterThan(0);
  });
  test('PTCONT-008 Invalid tenant and contact-type URL filters can be cleared together',async ({page})=>{
    await openTenantContacts(page,{query:'tenant_id=bad&contact_type=unknown'});
    await expect(page.locator('.platform-tenant-contacts__inline-error')).toContainText('invalid tenant and contact-type filter');
    await page.getByRole('button',{name:'Clear invalid filter'}).click();
    await expect(page).not.toHaveURL(/tenant_id=|contact_type=/);
    await expect(registry(page)).toContainText('Fixture Contact');
  });
  test('PTCONT-009 Clearing tenant filter retains contact type and removes tenant_id from URL',async ({page})=>{
    await openTenantContacts(page,{query:`tenant_id=${CONTACT_TENANT_A}&contact_type=operations`});
    await filters(page).getByLabel('Tenant').selectOption('');
    await expect(page).toHaveURL(/contact_type=operations/);
    await expect(page).not.toHaveURL(/tenant_id=/);
    await expect(registry(page)).toContainText('Fixture Contact');
  });
  test('PTCONT-010 Clearing contact type preserves selected tenant filter',async ({page})=>{
    const calls:URLSearchParams[]=[];
    await openTenantContacts(page,{query:`tenant_id=${CONTACT_TENANT_A}&contact_type=operations`,onCall:(m,p,_b,q)=>{if(m==='GET'&&p==='/platform/tenant-contacts')calls.push(new URLSearchParams(q));}});
    await filters(page).getByLabel('Contact type').selectOption('');
    await expect(page).not.toHaveURL(/contact_type=/);
    await expect(page).toHaveURL(new RegExp(`tenant_id=${CONTACT_TENANT_A}`));
    await expect.poll(()=>calls.some(q=>q.get('tenant_id')===CONTACT_TENANT_A&&!q.has('contact_type'))).toBe(true);
  });
  test('PTCONT-011 Changing filters resets current pagination offset to zero',async ({page})=>{
    const seen:number[]=[];
    await openTenantContacts(page,{contacts:fullPage,onCall:(m,p,_b,q)=>{if(m==='GET'&&p==='/platform/tenant-contacts')seen.push(Number(q.get('offset')));}});
    await expect(page.getByRole('button',{name:'Next'})).toBeEnabled();
    await page.getByRole('button',{name:'Next'}).click();
    await expect(page.getByText('Page 2',{exact:true})).toBeVisible();
    await filters(page).getByLabel('Contact type').selectOption('operations');
    await expect(page.getByText('Page 1',{exact:true})).toBeVisible();
    await expect.poll(()=>seen.slice(-1)[0]).toBe(0);
  });
  test('PTCONT-012 Filter selection survives reload through URL search parameters',async ({page})=>{
    await openTenantContacts(page,{query:`tenant_id=${CONTACT_TENANT_A}&contact_type=operations`});
    await page.reload();
    await expect(filters(page).getByLabel('Tenant')).toHaveValue(CONTACT_TENANT_A);
    await expect(filters(page).getByLabel('Contact type')).toHaveValue('operations');
    await expect(page.locator('.platform-tenant-contacts__card')).toHaveCount(1);
  });
});

// Directory loading errors are separate from contacts loading errors.
test.describe('Tenant Contacts — loading, refresh, classification',()=>{
  test('PTCONT-013 Tenant directory failure preserves contact-type filter and offers Retry tenant list',async ({page})=>{
    let failing=true;
    await openTenantContacts(page,{query:'contact_type=emergency',respond:(m,p)=>m==='GET'&&p==='/platform/tenants'&&failing?{status:503,json:apiError}:undefined});
    await expect(page.getByText(/Tenant selector failed to load:/)).toBeVisible();
    await expect(page.getByRole('button',{name:'Retry tenant list'})).toBeVisible();
    await expect(filters(page).getByLabel('Contact type')).toHaveValue('emergency');
    failing=false;
    await page.getByRole('button',{name:'Retry tenant list'}).click();
    await expect(filters(page).getByLabel('Tenant')).toBeEnabled();
  });
  test('PTCONT-014 Refreshed tenant directory failure displays last successful selector snapshot',async ({page})=>{
    let fail=false;
    await openTenantContacts(page,{respond:(m,p)=>m==='GET'&&p==='/platform/tenants'&&fail?{status:503,json:apiError}:undefined});
    await expect(filters(page).getByLabel('Tenant').locator('option')).toHaveCount(3);
    fail=true;await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await expect(page.getByText('Showing the last successful tenant selector snapshot.')).toBeVisible();
    await expect(filters(page).getByLabel('Tenant').locator('option')).toHaveCount(3);
    fail=false;await page.getByRole('button',{name:'Retry refresh'}).first().click();
    await expect(page.getByText('Showing the last successful tenant selector snapshot.')).toHaveCount(0);
  });
  test('PTCONT-015 Initial contact listing failure shows blocked registry and Retry action',async ({page})=>{
    let fail=true;
    await openTenantContacts(page,{respond:(m,p)=>m==='GET'&&p==='/platform/tenant-contacts'&&fail?{status:503,json:apiError}:undefined});
    await expect(page.getByText('Tenant contacts could not be loaded.')).toBeVisible();
    await expect(page.getByRole('button',{name:'Retry',exact:true})).toBeVisible();
    fail=false;await page.getByRole('button',{name:'Retry',exact:true}).click();
    await expect(card(page,'Fixture Contact')).toBeVisible();
  });
  test('PTCONT-016 Refresh failure preserves last successfully loaded contact page',async ({page})=>{
    let fail=false;
    await openTenantContacts(page,{respond:(m,p)=>m==='GET'&&p==='/platform/tenant-contacts'&&fail?{status:503,json:apiError}:undefined});
    await expect(card(page,'Fixture Contact')).toBeVisible();fail=true;
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await expect(page.getByText('Showing the last successful tenant contacts snapshot.')).toBeVisible();
    await expect(card(page,'Fixture Contact')).toBeVisible();
  });
  test('PTCONT-017 Refresh reissues directory and contacts queries for valid filters',async ({page})=>{
    const hits:string[]=[];
    await openTenantContacts(page,{onCall:(m,p)=>{if(m==='GET'&&['/platform/tenants','/platform/tenant-contacts'].includes(p))hits.push(p);}});
    await expect(card(page,'Fixture Contact')).toBeVisible();
    const before=hits.length;await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await expect.poll(()=>hits.length).toBeGreaterThanOrEqual(before+2);
    expect(hits.slice(before)).toContain('/platform/tenants');
    expect(hits.slice(before)).toContain('/platform/tenant-contacts');
  });
  test('PTCONT-018 Contact-type dropdown includes nine source-defined classification values',async ({page})=>{
    await openTenantContacts(page);
    const options=await filters(page).getByLabel('Contact type').locator('option').evaluateAll(nodes=>nodes.map(n=>(n as HTMLOptionElement).value));
    expect(options).toEqual(['','operations','billing','technical','owner','emergency','procurement','security','legal','other']);
  });
  test('PTCONT-019 Empty registry displays no-match text without claiming no external contact exists',async ({page})=>{
    await openTenantContacts(page,{contacts:[]});
    await expect(page.getByText('No tenant contacts match the current filters.')).toBeVisible();
    await expect(page.getByText(/does not prove no contact exists outside the application/)).toBeVisible();
  });
  test('PTCONT-020 Loaded contact count reflects current page rows not whole registry count',async ({page})=>{
    await openTenantContacts(page,{contacts:fullPage});
    await expect(stat(page,'Loaded contacts')).toHaveText('100');
    await page.getByRole('button',{name:'Next'}).click();
    await expect(stat(page,'Loaded contacts')).toHaveText('1');
    await expect(page.getByText('Current page 2; not an all-registry total')).toBeVisible();
  });
  test('PTCONT-021 Primary counter reflects primary-marked records in current page only',async ({page})=>{
    await openTenantContacts(page,{contacts:[makeContact(1,{is_primary:true}),makeContact(2,{is_primary:false}),makeContact(3,{is_primary:true})]});
    await expect(stat(page,'Primary on page')).toHaveText('2');
    await expect(stat(page,'Loaded contacts')).toHaveText('3');
  });
  test('PTCONT-022 Emergency counter reflects emergency-classified records in current page only',async ({page})=>{
    await openTenantContacts(page,{contacts:[makeContact(1,{contact_type:'emergency'}),makeContact(2,{contact_type:'technical'}),makeContact(3,{contact_type:'emergency'})]});
    await expect(stat(page,'Emergency on page')).toHaveText('2');
  });
  test('PTCONT-023 Direct-channel counter includes contacts with email or phone only',async ({page})=>{
    await openTenantContacts(page,{contacts:[makeContact(1,{email:null,phone:'+385999'}),makeContact(2,{email:'x@example.test',phone:null}),makeContact(3,{email:null,phone:null})]});
    await expect(stat(page,'Direct channel')).toHaveText('2');
    await expect(card(page,'Fixture Contact 003')).toContainText('No direct channel');
  });
  test('PTCONT-024 Next page is disabled when fewer than 100 records are returned',async ({page})=>{
    await openTenantContacts(page);
    await expect(page.getByRole('button',{name:'Next'})).toBeDisabled();
    await expect(page.getByRole('button',{name:'Previous'})).toBeDisabled();
  });
  test('PTCONT-025 Exactly 100 records enables Next and queries offset 100',async ({page})=>{
    const offsets:number[]=[];
    await openTenantContacts(page,{contacts:fullPage.slice(0,100),onCall:(m,p,_b,q)=>{if(m==='GET'&&p==='/platform/tenant-contacts')offsets.push(Number(q.get('offset')));}});
    await expect(page.locator('.platform-tenant-contacts__card')).toHaveCount(100);
    await expect(page.getByRole('button',{name:'Next'})).toBeEnabled();
    await page.getByRole('button',{name:'Next'}).click();
    await expect.poll(()=>offsets).toContain(100);
    await expect(page.getByText('Page 2',{exact:true})).toBeVisible();
  });
  test('PTCONT-026 Previous page returns to offset zero',async ({page})=>{
    const offsets:number[]=[];
    await openTenantContacts(page,{contacts:fullPage,onCall:(m,p,_b,q)=>{if(m==='GET'&&p==='/platform/tenant-contacts')offsets.push(Number(q.get('offset')));}});
    await expect(page.getByRole('button',{name:'Next'})).toBeEnabled();
    await page.getByRole('button',{name:'Next'}).click();
    await expect(page.getByText('Page 2',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Previous'}).click();
    await expect(page.getByText('Page 1',{exact:true})).toBeVisible();
    await expect.poll(()=>offsets.slice(-1)[0]).toBe(0);
  });
  test('PTCONT-027 Pagination controls are disabled during active page fetching',async ({page})=>{
    await openTenantContacts(page,{contacts:fullPage,delayMs:{'GET /platform/tenant-contacts':650}});
    await expect(page.getByRole('button',{name:'Next'})).toBeEnabled();
    await page.getByRole('button',{name:'Next'}).click();
    await expect(page.getByRole('button',{name:'Previous'})).toBeDisabled();
    await expect(page.getByRole('button',{name:'Next'})).toBeDisabled();
    await expect(card(page,'Fixture Contact 100')).toBeVisible();
  });
  test('PTCONT-028 Contact list renders role or fallback role not recorded',async ({page})=>{
    await openTenantContacts(page);
    await expect(card(page,'Fixture Contact')).toContainText('Duty manager · escalation #1');
    await expect(card(page,'No Channel Contact')).toContainText('Role not recorded · escalation #2');
  });
  test('PTCONT-029 Unknown update timestamp displays Not recorded',async ({page})=>{
    await openTenantContacts(page,{contacts:[makeContact(1,{updated_at:'not-a-date'})]});
    await expect(card(page,'Fixture Contact 001')).toContainText('Updated Not recorded');
  });
  test('PTCONT-030 Contact provenance displays creator name or fallback email',async ({page})=>{
    await openTenantContacts(page,{contacts:[makeContact(1,{created_by_name:'Fixture Owner',created_by_email:'owner@example.test'}),makeContact(2,{created_by_name:null,created_by_email:'other@example.test'})]});
    await expect(card(page,'Fixture Contact 001')).toContainText('Recorded by Fixture Owner');
    await expect(card(page,'Fixture Contact 002')).toContainText('Recorded by other@example.test');
  });
  test('PTCONT-031 Missing creator identity displays Not recorded in provenance',async ({page})=>{
    await openTenantContacts(page);
    await expect(card(page,'No Channel Contact')).toContainText('Recorded by Not recorded');
    await expect(card(page,'No Channel Contact')).toContainText('Recorded Not recorded');
  });
  test('PTCONT-032 Contact notes display content or No operational notes fallback',async ({page})=>{
    await openTenantContacts(page);
    await expect(card(page,'Fixture Contact').locator('.platform-tenant-contacts__notes')).toHaveText('Fixture only');
    await expect(card(page,'No Channel Contact').locator('.platform-tenant-contacts__notes')).toHaveText('No operational notes.');
  });
  test('PTCONT-033 Primary badge renders only on primary-marked records',async ({page})=>{
    await openTenantContacts(page);
    await expect(card(page,'Fixture Contact').locator('.platform-tenant-contacts__badge',{hasText:'Primary'})).toHaveCount(1);
    await expect(card(page,'No Channel Contact').locator('.platform-tenant-contacts__badge',{hasText:'Primary'})).toHaveCount(0);
  });
  test('PTCONT-034 Contact type classification humanizes underscore-separated values',async ({page})=>{
    await openTenantContacts(page,{contacts:[makeContact(1,{contact_type:'technical_support'})]});
    await expect(card(page,'Fixture Contact 001').locator('.platform-tenant-contacts__badge').first()).toHaveText('Technical support');
  });
});

// Create: client-side guards, browser attributes, trimmed request payloads.
test.describe('Tenant Contacts — create',()=>{
  test('PTCONT-035 Creation form requires selected tenant before enabling Add contact',async ({page})=>{
    await openTenantContacts(page);
    await editor(page).getByLabel('Contact name').fill('Operator');
    await expect(editor(page).getByRole('button',{name:'Add contact'})).toBeDisabled();
    await expect(editor(page)).toContainText('Select a tenant in the filter above before creating a contact.');
    await filters(page).getByLabel('Tenant').selectOption(CONTACT_TENANT_A);
    await expect(editor(page).getByRole('button',{name:'Add contact'})).toBeEnabled();
  });
  test('PTCONT-036 Whitespace-only name disables Add contact',async ({page})=>{
    await openTenantContacts(page,{query:`tenant_id=${CONTACT_TENANT_A}`});
    await editor(page).getByLabel('Contact name').fill('     ');
    await expect(editor(page).getByRole('button',{name:'Add contact'})).toBeDisabled();
    await editor(page).getByLabel('Contact name').fill('  Fixture  ');
    await expect(editor(page).getByRole('button',{name:'Add contact'})).toBeEnabled();
  });
  test('PTCONT-037 Name input enforces maxlength 180 in browser',async ({page})=>{
    await openTenantContacts(page,{query:`tenant_id=${CONTACT_TENANT_A}`});
    const name=editor(page).getByLabel('Contact name');
    await expect(name).toHaveAttribute('maxlength','180');
    await name.pressSequentially('a'.repeat(181));
    await expect(name).toHaveValue('a'.repeat(180));
  });
  test('PTCONT-038 Email input exposes type email and maxlength 254',async ({page})=>{
    await openTenantContacts(page,{query:`tenant_id=${CONTACT_TENANT_A}`});
    const email=editor(page).getByLabel('Email');
    await expect(email).toHaveAttribute('type','email');
    await expect(email).toHaveAttribute('maxlength','254');
  });
  test('PTCONT-039 Phone field enforces maxlength 80 and uses tel input',async ({page})=>{
    await openTenantContacts(page,{query:`tenant_id=${CONTACT_TENANT_A}`});
    const phone=editor(page).getByLabel('Phone');
    await expect(phone).toHaveAttribute('type','tel');
    await expect(phone).toHaveAttribute('maxlength','80');
  });
  test('PTCONT-040 Escalation input exposes min 1 and max 99 boundaries',async ({page})=>{
    await openTenantContacts(page,{query:`tenant_id=${CONTACT_TENANT_A}`});
    const order=editor(page).getByLabel('Escalation order');
    await expect(order).toHaveAttribute('type','number');
    await expect(order).toHaveAttribute('min','1');
    await expect(order).toHaveAttribute('max','99');
    await expect(order).toHaveValue('1');
  });
  test('PTCONT-041 Notes textarea exposes maxlength 2000',async ({page})=>{
    await openTenantContacts(page,{query:`tenant_id=${CONTACT_TENANT_A}`});
    await expect(editor(page).getByLabel('Notes')).toHaveAttribute('maxlength','2000');
  });
  test('PTCONT-042 Create payload trims name and optional contact fields before POST',async ({page})=>{
    const writes:Record<string,unknown>[]=[];
    await openTenantContacts(page,{query:`tenant_id=${CONTACT_TENANT_A}`,onCall:(m,p,b)=>{if(m==='POST'&&p.endsWith(`/tenants/${CONTACT_TENANT_A}`))writes.push(b as Record<string,unknown>);}});
    await editor(page).getByLabel('Contact name').fill('  New operator  ');
    await editor(page).getByLabel('Title / role').fill('  Supervisor  ');
    await editor(page).getByLabel('Email').fill('  operator@example.test  ');
    await editor(page).getByLabel('Phone').fill('  +385111000  ');
    await editor(page).getByLabel('Notes').fill('  Contact after 9  ');
    await editor(page).getByLabel('Primary contact').check();
    await editor(page).getByLabel('Escalation order').fill('3');
    await editor(page).getByRole('button',{name:'Add contact'}).click();
    await expect.poll(()=>writes.length).toBe(1);
    expect(writes[0]).toMatchObject({name:'New operator',title:'Supervisor',email:'operator@example.test',phone:'+385111000',notes:'Contact after 9',is_primary:true,escalation_order:3,contact_type:'operations'});
  });
  test('PTCONT-043 Create POST uses selected tenant identifier rather than row tenant ID',async ({page})=>{
    const posts:string[]=[];
    await openTenantContacts(page,{query:`tenant_id=${CONTACT_TENANT_B}`,onCall:(m,p)=>{if(m==='POST')posts.push(p);}});
    await editor(page).getByLabel('Contact name').fill('Warehouse supervisor');
    await editor(page).getByRole('button',{name:'Add contact'}).click();
    await expect.poll(()=>posts.length).toBe(1);
    expect(posts[0]).toBe(`/platform/tenant-contacts/tenants/${CONTACT_TENANT_B}`);
  });
  test('PTCONT-044 Create success feedback and refreshed registry appear after synthetic response',async ({page})=>{
    const listCalls:number[]=[];
    await openTenantContacts(page,{query:`tenant_id=${CONTACT_TENANT_A}`,onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-contacts')listCalls.push(1);}});
    await expect(card(page,'Fixture Contact')).toBeVisible();
    const before=listCalls.length;
    await editor(page).getByLabel('Contact name').fill('Added fixture contact');
    await editor(page).getByRole('button',{name:'Add contact'}).click();
    await expect(page.getByText('Tenant contact created.')).toBeVisible();
    await expect(card(page,'Added fixture contact')).toBeVisible();
    await expect(editor(page).getByLabel('Contact name')).toHaveValue('');
    await expect.poll(()=>listCalls.length).toBeGreaterThan(before);
  });
  test('PTCONT-045 Create failure shows Contact change failed and preserves form contents',async ({page})=>{
    await openTenantContacts(page,{query:`tenant_id=${CONTACT_TENANT_A}`,responses:{[`POST /platform/tenant-contacts/tenants/${CONTACT_TENANT_A}`]:{status:422,json:apiError}}});
    await editor(page).getByLabel('Contact name').fill('Unsent fixture');
    await editor(page).getByRole('button',{name:'Add contact'}).click();
    await expect(page.locator('.platform-tenant-contacts__inline-error')).toContainText('Contact change failed:');
    await expect(editor(page).getByLabel('Contact name')).toHaveValue('Unsent fixture');
    await expect(page.getByText('Tenant contact created.')).toHaveCount(0);
  });
});

// Edit and delete flows. The mutable in-memory fixture is per test, not a real DB.
test.describe('Tenant Contacts — edit and delete',()=>{
  test('PTCONT-046 Edit opens current contact values and locks tenant assignment',async ({page})=>{
    await openTenantContacts(page,{query:`tenant_id=${CONTACT_TENANT_A}`});
    await card(page,'Fixture Contact').getByRole('button',{name:'Edit'}).click();
    await expect(editor(page).getByRole('heading',{name:'Edit tenant contact'})).toBeVisible();
    await expect(editor(page).getByLabel('Contact name')).toHaveValue('Fixture Contact');
    await expect(editor(page).getByLabel('Title / role')).toHaveValue('Duty manager');
    await expect(editor(page).getByLabel('Primary contact')).toBeChecked();
    await expect(editor(page)).toContainText('Tenant assignment itself is not changed by this form.');
    await expect(editor(page).getByLabel('Tenant')).toHaveCount(0);
  });
  test('PTCONT-047 Edit switches save action from Add contact to Save contact',async ({page})=>{
    await openTenantContacts(page,{query:`tenant_id=${CONTACT_TENANT_A}`});
    await card(page,'Fixture Contact').getByRole('button',{name:'Edit'}).click();
    await expect(editor(page).getByRole('button',{name:'Save contact'})).toBeEnabled();
    await expect(editor(page).getByRole('button',{name:'Add contact'})).toHaveCount(0);
    await expect(editor(page).getByRole('button',{name:'Cancel edit'})).toBeVisible();
  });
  test('PTCONT-048 Edit PATCH targets existing contact ID with trimmed payload',async ({page})=>{
    const patches:{path:string;body:unknown}[]=[];
    await openTenantContacts(page,{query:`tenant_id=${CONTACT_TENANT_A}`,onCall:(m,p,b)=>{if(m==='PATCH')patches.push({path:p,body:b});}});
    await card(page,'Fixture Contact').getByRole('button',{name:'Edit'}).click();
    await editor(page).getByLabel('Contact name').fill('  Updated operator  ');
    await editor(page).getByLabel('Notes').fill('  Updated context  ');
    await editor(page).getByRole('button',{name:'Save contact'}).click();
    await expect.poll(()=>patches.length).toBe(1);
    expect(patches[0].path).toBe(`/platform/tenant-contacts/${CONTACT_RECORD_A}`);
    expect(patches[0].body).toMatchObject({name:'Updated operator',notes:'Updated context'});
  });
  test('PTCONT-049 Edit success resets form and displays update feedback',async ({page})=>{
    await openTenantContacts(page,{query:`tenant_id=${CONTACT_TENANT_A}`});
    await card(page,'Fixture Contact').getByRole('button',{name:'Edit'}).click();
    await editor(page).getByLabel('Contact name').fill('Updated contact');
    await editor(page).getByRole('button',{name:'Save contact'}).click();
    await expect(page.getByText('Tenant contact updated.')).toBeVisible();
    await expect(editor(page).getByRole('heading',{name:'Add tenant contact'})).toBeVisible();
    await expect(editor(page).getByLabel('Contact name')).toHaveValue('');
    await expect(card(page,'Updated contact')).toBeVisible();
  });
  test('PTCONT-050 Edit failure retains editing state for correction',async ({page})=>{
    await openTenantContacts(page,{query:`tenant_id=${CONTACT_TENANT_A}`,responses:{[`PATCH /platform/tenant-contacts/${CONTACT_RECORD_A}`]:{status:409,json:apiError}}});
    await card(page,'Fixture Contact').getByRole('button',{name:'Edit'}).click();
    await editor(page).getByLabel('Contact name').fill('Rejected update');
    await editor(page).getByRole('button',{name:'Save contact'}).click();
    await expect(page.locator('.platform-tenant-contacts__inline-error')).toContainText('Contact change failed:');
    await expect(editor(page).getByLabel('Contact name')).toHaveValue('Rejected update');
    await expect(editor(page).getByRole('button',{name:'Save contact'})).toBeVisible();
    await expect(page.getByText('Tenant contact updated.')).toHaveCount(0);
  });
  test('PTCONT-051 Cancel edit restores blank add editor without mutating server',async ({page})=>{
    const writes:string[]=[];
    await openTenantContacts(page,{query:`tenant_id=${CONTACT_TENANT_A}`,onCall:(m,p)=>{if(['PATCH','POST','DELETE'].includes(m))writes.push(p);}});
    await card(page,'Fixture Contact').getByRole('button',{name:'Edit'}).click();
    await editor(page).getByLabel('Contact name').fill('Unsaved change');
    await editor(page).getByRole('button',{name:'Cancel edit'}).click();
    await expect(editor(page).getByRole('heading',{name:'Add tenant contact'})).toBeVisible();
    await expect(editor(page).getByLabel('Contact name')).toHaveValue('');
    expect(writes).toEqual([]);
  });
  test('PTCONT-052 Changing selected tenant cancels active edit and clears form state',async ({page})=>{
    await openTenantContacts(page,{query:`tenant_id=${CONTACT_TENANT_A}`});
    await card(page,'Fixture Contact').getByRole('button',{name:'Edit'}).click();
    await filters(page).getByLabel('Tenant').selectOption(CONTACT_TENANT_B);
    await expect(editor(page).getByRole('heading',{name:'Add tenant contact'})).toBeVisible();
    await expect(editor(page).getByLabel('Contact name')).toHaveValue('');
    await expect(page).toHaveURL(new RegExp(`tenant_id=${CONTACT_TENANT_B}`));
  });
  test('PTCONT-053 Delete confirmation dismissal produces no DELETE request',async ({page})=>{
    const deletes:string[]=[];
    await openTenantContacts(page,{onCall:(m,p)=>{if(m==='DELETE')deletes.push(p);}});
    page.once('dialog',dialog=>dialog.dismiss());
    await card(page,'Fixture Contact').getByRole('button',{name:'Delete'}).click();
    expect(deletes).toEqual([]);
    await expect(card(page,'Fixture Contact')).toBeVisible();
  });
  test('PTCONT-054 Confirmed delete issues contact-specific DELETE request',async ({page})=>{
    const deletes:string[]=[];
    await openTenantContacts(page,{onCall:(m,p)=>{if(m==='DELETE')deletes.push(p);}});
    page.once('dialog',dialog=>dialog.accept());
    await card(page,'Fixture Contact').getByRole('button',{name:'Delete'}).click();
    await expect.poll(()=>deletes.length).toBe(1);
    expect(deletes[0]).toBe(`/platform/tenant-contacts/${CONTACT_RECORD_A}`);
  });
  test('PTCONT-055 Delete success shows feedback and refreshes visible contact list',async ({page})=>{
    const queries:number[]=[];
    await openTenantContacts(page,{onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-contacts')queries.push(1);}});
    await expect(card(page,'Fixture Contact')).toBeVisible();const before=queries.length;
    page.once('dialog',dialog=>dialog.accept());
    await card(page,'Fixture Contact').getByRole('button',{name:'Delete'}).click();
    await expect(page.getByText('Tenant contact deleted.')).toBeVisible();
    await expect(card(page,'Fixture Contact')).toHaveCount(0);
    await expect.poll(()=>queries.length).toBeGreaterThan(before);
  });
  test('PTCONT-056 Delete failure shows error and does not claim success',async ({page})=>{
    await openTenantContacts(page,{responses:{[`DELETE /platform/tenant-contacts/${CONTACT_RECORD_A}`]:{status:409,json:apiError}}});
    page.once('dialog',dialog=>dialog.accept());
    await card(page,'Fixture Contact').getByRole('button',{name:'Delete'}).click();
    await expect(page.locator('.platform-tenant-contacts__inline-error')).toContainText('Contact change failed:');
    await expect(card(page,'Fixture Contact')).toBeVisible();
    await expect(page.getByText('Tenant contact deleted.')).toHaveCount(0);
  });
  test('PTCONT-057 Write actions disable during pending create update or delete request',async ({page})=>{
    await openTenantContacts(page,{query:`tenant_id=${CONTACT_TENANT_A}`,delayMs:{
      [`POST /platform/tenant-contacts/tenants/${CONTACT_TENANT_A}`]:700,
      [`PATCH /platform/tenant-contacts/${CONTACT_RECORD_A}`]:700,
      [`DELETE /platform/tenant-contacts/${CONTACT_RECORD_A}`]:700
    }});
    await editor(page).getByLabel('Contact name').fill('Pending create');
    await editor(page).getByRole('button',{name:'Add contact'}).click();
    await expect(editor(page).getByRole('button',{name:'Saving…'})).toBeDisabled();
    await expect(page.getByText('Tenant contact created.')).toBeVisible();
    await card(page,'Fixture Contact').getByRole('button',{name:'Edit'}).click();
    await editor(page).getByRole('button',{name:'Save contact'}).click();
    await expect(editor(page).getByRole('button',{name:'Saving…'})).toBeDisabled();
    await expect(page.getByText('Tenant contact updated.')).toBeVisible();
    page.once('dialog',dialog=>dialog.accept());
    await card(page,'Fixture Contact').getByRole('button',{name:'Delete'}).click();
    await expect(card(page,'Fixture Contact').getByRole('button',{name:'Deleting…'})).toBeDisabled();
    await expect(page.getByText('Tenant contact deleted.')).toBeVisible();
  });
});

// Links are UI access and query propagation, not proof of backend authorization.
test.describe('Tenant Contacts — supporting platform workspaces',()=>{
  test('PTCONT-058 Support operations link requires all four source-defined permissions',async ({page})=>{
    const needed=['platform.sla.read','platform.incidents.read','platform.support_sessions.read'];
    await openTenantContacts(page,{permissions:contactPermissionSnapshot});
    await expect(page.getByRole('link',{name:'Support operations'})).toHaveAttribute('href','/platform/support-operations-cockpit');
    for(const missing of needed){
      await page.unroute('**/platform/**');
      await openTenantContacts(page,{permissions:contactPermissionSnapshot.filter(p=>p!==missing)});
      await expect(page.getByRole('link',{name:'Support operations'})).toHaveCount(0);
    }
    // The fourth prerequisite is TENANTS_READ on the ROUTE itself, not merely on this link.
    await page.unroute('**/platform/**');
    await openTenantContacts(page,{permissions:contactPermissionSnapshot.filter(p=>p!=='platform.tenants.read'),expectHeading:false});
    await expect(page).not.toHaveURL(/\/platform\/tenant-contacts(?:\?|$)/);
  });
  test('PTCONT-059 Billing link needs billing read permission and selected tenant',async ({page})=>{
    await openTenantContacts(page);
    await expect(page.getByRole('link',{name:'Billing',exact:true})).toHaveCount(0);
    await filters(page).getByLabel('Tenant').selectOption(CONTACT_TENANT_A);
    await expect(page.getByRole('link',{name:'Billing',exact:true})).toHaveAttribute('href',`/platform/billing?tenant_id=${CONTACT_TENANT_A}`);
    await page.unroute('**/platform/**');
    await openTenantContacts(page,{query:`tenant_id=${CONTACT_TENANT_A}`,permissions:contactPermissionSnapshot.filter(p=>p!=='platform.billing.read')});
    await expect(page.getByRole('link',{name:'Billing',exact:true})).toHaveCount(0);
  });
  test('PTCONT-060 Supporting tenant links retain selected tenant_id through navigation',async ({page})=>{
    await openTenantContacts(page,{query:`tenant_id=${CONTACT_TENANT_A}`});
    const expected=['/platform/tenants','/platform/customer-success-admin','/platform/tenant-communications','/platform/support-operations-cockpit'];
    for(const route of expected){
      await expect(page.locator(`.platform-tenant-contacts__link-row a[href="${route}?tenant_id=${CONTACT_TENANT_A}"]`)).toHaveCount(1);
    }
    await expect(page.getByRole('link',{name:'Billing',exact:true})).toHaveAttribute('href',`/platform/billing?tenant_id=${CONTACT_TENANT_A}`);
  });
});
