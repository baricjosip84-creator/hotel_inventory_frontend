import { test, expect, type Page } from '@playwright/test';
import { loginAsTenant } from '../../../support/tenantSession';
import { loginAsDisposableRole } from '../../../support/roleSession';

// Batch 44: source-grounded Inventory Controls router/tab access and page-local
// work areas. Requires a disposable tenant. Tests below assert browser-visible
// behavior only; they do not claim backend permission or mutation verification.
const tabs = (page: Page) => page.getByRole('tablist', { name: 'Inventory control work areas' });
const tab = (page: Page, name: string) => tabs(page).getByRole('tab', { name, exact: true });
const selected = (page: Page, name: string) => expect(tab(page, name)).toHaveAttribute('aria-selected', 'true');
async function openControls(page: Page, target = '/enterprise-inventory') {
  await loginAsTenant(page);
  await page.goto(target);
  await expect(page.getByRole('heading', { name: 'Specialized inventory workflows' })).toBeVisible();
}

test.describe('Enterprise Inventory — routed specialized work areas (Batch 44)', () => {
  test('TEI-001 Default entry chooses first accessible Par levels and shows its form', async ({ page }) => {
    await openControls(page);
    await selected(page, 'Par levels');
    await expect(page.getByRole('heading', { name: 'Create / update par level' })).toBeVisible();
  });
  test('TEI-002 Nine retained permission-visible work areas are in one tablist', async ({ page }) => {
    await openControls(page);
    await expect(tabs(page).getByRole('tab')).toHaveCount(9);
    for (const name of ['Par levels','Cycle counts','Supplier returns','Approvals','Supplier catalogs','Invoices','Barcode labels','Attachments','Notifications']) {
      await expect(tab(page, name)).toBeVisible();
    }
  });
  test('TEI-003 Legacy stock transfers control is not duplicated as an Enterprise tab', async ({ page }) => {
    await openControls(page);
    await expect(tabs(page).getByRole('tab', { name: 'Stock transfers' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Create / update par level' })).toBeVisible();
  });
  test('TEI-004 Cycle counts tab changes URL and replaces par form with counting form', async ({ page }) => {
    await openControls(page);
    await tab(page, 'Cycle counts').click();
    await expect(page).toHaveURL(/\/enterprise-inventory\?tab=cycle-counts/);
    await selected(page, 'Cycle counts');
    await expect(page.getByRole('heading', { name: 'Create cycle count' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Create \/ update par level' })).toHaveCount(0);
  });
  test('TEI-005 Supplier returns tab exposes creation and return draft', async ({ page }) => {
    await openControls(page);
    await tab(page, 'Supplier returns').click();
    await selected(page, 'Supplier returns');
    await expect(page.getByRole('heading', { name: 'Create supplier return' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Return draft' })).toBeVisible();
  });
  test('TEI-006 Approvals tab has rule creation and separate approval queue', async ({ page }) => {
    await openControls(page);
    await tab(page, 'Approvals').click();
    await selected(page, 'Approvals');
    await expect(page.getByRole('heading', { name: 'Create approval rule' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Approval queue' })).toBeVisible();
  });
  test('TEI-007 Supplier catalogs tab separates onboarding and manual linking', async ({ page }) => {
    await openControls(page);
    await tab(page, 'Supplier catalogs').click();
    await selected(page, 'Supplier catalogs');
    await expect(page.getByRole('heading', { name: 'Supplier catalog onboarding' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Manual supplier-product link' })).toBeVisible();
  });
  test('TEI-008 Invoices tab presents draft creation and invoice list', async ({ page }) => {
    await openControls(page);
    await tab(page, 'Invoices').click();
    await selected(page, 'Invoices');
    await expect(page.getByRole('heading', { name: 'Create supplier invoice draft' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Supplier invoices' })).toBeVisible();
  });
  test('TEI-009 Barcode labels tab shows preview separately from saved labels', async ({ page }) => {
    await openControls(page);
    await tab(page, 'Barcode labels').click();
    await selected(page, 'Barcode labels');
    await expect(page.getByRole('heading', { name: 'Create printable barcode label' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Saved barcode labels' })).toBeVisible();
  });
  test('TEI-010 Attachments tab separates upload form and entity attachment records', async ({ page }) => {
    await openControls(page);
    await tab(page, 'Attachments').click();
    await selected(page, 'Attachments');
    await expect(page.getByRole('heading', { name: 'Upload attachment' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Entity attachments' })).toBeVisible();
  });
  test('TEI-011 Notifications tab has queue form and event/delivery histories', async ({ page }) => {
    await openControls(page);
    await tab(page, 'Notifications').click();
    await selected(page, 'Notifications');
    await expect(page.getByRole('heading', { name: 'Queue notification delivery' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Notification events' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Delivery history' })).toBeVisible();
  });
  test('TEI-012 Deep-linking to notifications selects the corresponding panel', async ({ page }) => {
    await openControls(page, '/enterprise-inventory?tab=notifications');
    await selected(page, 'Notifications');
    await expect(page.getByRole('heading', { name: 'Queue notification delivery' })).toBeVisible();
  });
  test('TEI-013 Selected notifications tab survives reload through URL source of truth', async ({ page }) => {
    await openControls(page);
    await tab(page, 'Notifications').click();
    await expect(page).toHaveURL(/tab=notifications/);
    await page.reload();
    await selected(page, 'Notifications');
    await expect(page.getByRole('heading', { name: 'Notification events' })).toBeVisible();
  });
  test('TEI-014 Unsupported deep-link tab fails closed to first permitted work area', async ({ page }) => {
    await openControls(page, '/enterprise-inventory?tab=does-not-exist');
    await selected(page, 'Par levels');
    await expect(page.getByRole('heading', { name: 'Create / update par level' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Queue notification delivery' })).toHaveCount(0);
  });
  test('TEI-015 Dormant stock-transfers deep-link never renders duplicate transfers panel', async ({ page }) => {
    await openControls(page, '/enterprise-inventory?tab=stock-transfers');
    await selected(page, 'Par levels');
    await expect(tabs(page).getByRole('tab', { name: 'Stock transfers' })).toHaveCount(0);
  });
  test('TEI-016 Changing tabs preserves unrelated query parameters', async ({ page }) => {
    await openControls(page, '/enterprise-inventory?source=review&tab=par-levels');
    await tab(page, 'Cycle counts').click();
    await expect(page).toHaveURL(/source=review/);
    await expect(page).toHaveURL(/tab=cycle-counts/);
    await selected(page, 'Cycle counts');
  });
  test('TEI-017 Current workspace summary tracks selected tab rather than stale default', async ({ page }) => {
    await openControls(page);
    await tab(page, 'Attachments').click();
    const summary = page.getByRole('region', { name: 'Inventory controls summary' });
    await expect(summary).toContainText('Current workspace');
    await expect(summary).toContainText('Attachments');
  });
  test('TEI-018 Evaluate par levels is only offered while that work area is active', async ({ page }) => {
    await openControls(page);
    await expect(page.getByRole('button', { name: 'Evaluate par levels' })).toBeVisible();
    await tab(page, 'Cycle counts').click();
    await expect(page.getByRole('button', { name: 'Evaluate par levels' })).toHaveCount(0);
  });
  test('TEI-019 Par level form cannot submit without required product and quantities', async ({ page }) => {
    await openControls(page);
    const form = page.getByRole('heading', { name: 'Create / update par level' }).locator('..');
    await expect(form.getByLabel('Product')).toHaveAttribute('required', '');
    await expect(form.getByLabel('Minimum quantity')).toHaveAttribute('required', '');
    await expect(form.getByLabel('Par / target quantity')).toHaveAttribute('required', '');
    await form.getByRole('button', { name: 'Save par level' }).click();
    await expect(form.getByLabel('Product')).toBeInvalid();
  });
  test('TEI-020 Cycle count form requires product, location, and counted quantity', async ({ page }) => {
    await openControls(page);
    await tab(page, 'Cycle counts').click();
    const form = page.getByRole('heading', { name: 'Create cycle count' }).locator('..');
    for (const label of ['Storage location', 'Product', 'Counted quantity']) {
      await expect(form.getByLabel(label)).toHaveAttribute('required', '');
    }
    await form.getByRole('button', { name: 'Create cycle count' }).click();
    await expect(form.getByLabel('Storage location')).toBeInvalid();
  });
});
