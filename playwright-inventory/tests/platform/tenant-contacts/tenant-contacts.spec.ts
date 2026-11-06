import { test, expect } from '@playwright/test';
import { openTenantContacts, CONTACT_TENANT_A, contactRecords, contactPermissionSnapshot } from '../../../support/tenantContactsFixture';

/** Batch 56 initial Platform Tenant Contacts scenarios, GENERATED_UNRUN and synthetic only. */
test.describe('Platform Tenant Contacts — initial registry and filter contract',()=>{
  test('PTCONT-001 Page identifies source, page-size, and loaded-page-only counts',async ({page})=>{
    await openTenantContacts(page);
    await expect(page.getByText('Source · GET /platform/tenant-contacts')).toBeVisible();
    await expect(page.getByText('Page size · 100')).toBeVisible();
    const stats=page.getByLabel('Tenant contact page summary');
    await expect(stats).toContainText('Loaded contacts');
    await expect(stats).toContainText('Current page 1; not an all-registry total');
    await expect(stats).toContainText('Direct channel');
  });
  test('PTCONT-002 Tenant deep link applies tenant_id with limit and offset to contacts request',async ({page})=>{
    const calls:URLSearchParams[]=[];
    await openTenantContacts(page,{query:`tenant_id=${CONTACT_TENANT_A}`,
      onCall:(m,path,_b,query)=>{if(m==='GET'&&path==='/platform/tenant-contacts')calls.push(new URLSearchParams(query));}});
    await expect.poll(()=>calls.length).toBeGreaterThan(0);
    expect(calls[calls.length-1]?.get('tenant_id')).toBe(CONTACT_TENANT_A);
    expect(calls[calls.length-1]?.get('limit')).toBe('100');expect(calls[calls.length-1]?.get('offset')).toBe('0');
    await expect(page.locator('.platform-tenant-contacts__card')).toHaveCount(1);
  });
  test('PTCONT-003 Malformed tenant_id blocks contacts query and offers invalid-filter recovery',async ({page})=>{
    const contactQueries:string[]=[];
    await openTenantContacts(page,{query:'tenant_id=malformed-id',onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-contacts')contactQueries.push(p);}});
    await expect(page.locator('.platform-tenant-contacts__inline-error')).toContainText('invalid tenant filter');
    expect(contactQueries).toHaveLength(0);
    await page.getByRole('button',{name:'Clear invalid filter'}).click();
    await expect(page).not.toHaveURL(/tenant_id=/);
    await expect.poll(()=>contactQueries.length).toBeGreaterThan(0);
  });
  test('PTCONT-004 Contact-type filter updates URL and applies server-side query',async ({page})=>{
    const types:string[]=[];
    await openTenantContacts(page,{onCall:(m,p,_b,q)=>{if(m==='GET'&&p==='/platform/tenant-contacts')types.push(q.get('contact_type')||'');}});
    await page.locator('.platform-tenant-contacts__form-grid--filters').getByLabel('Contact type').selectOption('emergency');
    await expect(page).toHaveURL(/contact_type=emergency/);
    await expect.poll(()=>types.includes('emergency')).toBe(true);
    await expect(page.locator('.platform-tenant-contacts__card')).toHaveCount(1);
    await expect(page.locator('.platform-tenant-contacts__card')).toContainText('No Channel Contact');
  });
  test('PTCONT-005 Read-only operator has registry but no editor or mutation controls',async ({page})=>{
    await openTenantContacts(page,{permissions:contactPermissionSnapshot.filter(p=>p!=='platform.tenants.update')});
    await expect(page.getByText('Read-only operator')).toBeVisible();
    await expect(page.locator('#platform-tenant-contacts-form')).toHaveCount(0);
    await expect(page.locator('.platform-tenant-contacts__card').first().getByRole('button',{name:'Delete'})).toHaveCount(0);
    await expect(page.locator('.platform-tenant-contacts__card').first().getByRole('button',{name:'Edit'})).toHaveCount(0);
  });
  test('PTCONT-006 Registry shows real channel links or explicit absence, without claiming contact delivery',async ({page})=>{
    await openTenantContacts(page);
    const withChannel=page.locator('.platform-tenant-contacts__card').filter({hasText:contactRecords[0].name});
    await expect(withChannel.getByRole('link',{name:'Email · fixture@example.test'})).toHaveAttribute('href','mailto:fixture@example.test');
    await expect(withChannel.getByRole('link',{name:'Call · +385111222'})).toHaveAttribute('href','tel:+385111222');
    const missing=page.locator('.platform-tenant-contacts__card').filter({hasText:'No Channel Contact'});
    await expect(missing).toContainText('No direct channel');
    await expect(missing).toContainText('Email not recorded');
    await expect(missing).toContainText('Phone not recorded');
  });
});
