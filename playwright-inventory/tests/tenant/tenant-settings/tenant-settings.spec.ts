import { test, expect, type Page, type Route } from '@playwright/test';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';
import { loginAsDisposableRole } from '../../../support/roleSession';

// Batch 38-39: source-derived TenantSettingsPage scenarios (45 generated, none executed).
// All PUT calls are intercepted; the original application and real tenants are never changed.
type TenantRow = {
  id: string; name: string; location: string | null; organization_type: string;
  legal_name: string | null; business_email: string | null; business_phone: string | null;
  tax_id: string | null; business_address: string | null;
  default_purchase_order_payment_terms: string | null;
  require_separate_purchase_order_approver: boolean;
  season_start: string | null; season_end: string | null;
  inventory_currency: string; inventory_currency_configured_at: string | null;
  default_locale: string; write_locked: boolean;
  created_at: string; updated_at: string;
};
const tenant: TenantRow = {
  id: 'pw-tenant-settings-01', name: 'Synthetic Inventory Hotel', location: 'Rijeka', organization_type: 'hotel',
  legal_name: 'Synthetic Hotel d.o.o.', business_email: 'purchase@example.invalid', business_phone: '+385000000',
  tax_id: 'PW-TAX-001', business_address: 'Synthetic Street 1',
  default_purchase_order_payment_terms: 'Net 30', require_separate_purchase_order_approver: true,
  season_start: '2026-05-01', season_end: '2026-09-30', inventory_currency: 'EUR',
  inventory_currency_configured_at: '2026-01-01T09:00:00.000Z', default_locale: 'en-GB', write_locked: false,
  created_at: '2026-01-01T09:00:00.000Z', updated_at: '2026-10-10T09:00:00.000Z'
};
type TenantCall = { method: string; path: string; payload?: Record<string, unknown> };
type SettingsOptions = { record?: TenantRow; empty?: boolean; getStatus?: number; getStatusAfterInitial?: number; saveStatus?: number; saveDelayMs?: number; role?: 'PW_TSET_READ_ONLY' };
async function openSettings(page: Page, options: SettingsOptions = {}) {
  if (options.role) await loginAsDisposableRole(page, options.role);
  else await loginAsTenant(page);
  const calls: TenantCall[] = [];
  let current = { ...(options.record ?? tenant) };
  await page.route('**/*', async (route: Route) => {
    if (route.request().isNavigationRequest()) return route.continue();
    const u = new URL(route.request().url());
    const path = u.pathname;
    const method = route.request().method();
    if (!/^\/(?:api\/)?tenants(?:\/[^/]+)?$/.test(path)) return route.continue();
    if (path.endsWith('/currency-context') || path.endsWith('/subscription-access')) return route.continue();
    const payload = method === 'PUT' ? route.request().postDataJSON() as Record<string, unknown> : undefined;
    calls.push({ method, path, payload });
    if (method === 'GET' && /\/tenants$/.test(path)) {
      const status = options.getStatus ?? (calls.filter(c => c.method === 'GET' && /\/tenants$/.test(c.path)).length > 1 ? options.getStatusAfterInitial : undefined);
      return fulfillJson(route, status ? { message: 'Synthetic tenant settings unavailable' } : options.empty ? [] : [current], status ?? 200);
    }
    if (method === 'PUT' && path.endsWith(`/tenants/${current.id}`)) {
      if (options.saveDelayMs) await new Promise(resolve => setTimeout(resolve, options.saveDelayMs));
      if (options.saveStatus) return fulfillJson(route, { message: 'Synthetic tenant settings save denied' }, options.saveStatus);
      current = { ...current, ...payload, updated_at: '2026-11-03T12:00:00.000Z' } as TenantRow;
      return fulfillJson(route, current);
    }
    return fulfillJson(route, { message: 'No synthetic tenant-settings mutation for this request' }, 405);
  });
  await page.goto('/tenant-settings');
  await expect(page.locator('#tenant-settings-workspace-top')).toBeVisible();
  return { calls };
}
const field = (page: Page, label: string) => page.locator('.tenant-settings-field').filter({ has: page.getByText(label, { exact: true }) });
const save = (page: Page) => page.getByRole('button', { name: 'Save tenant settings' });
const putCalls = (calls: TenantCall[]) => calls.filter(c => c.method === 'PUT' && /\/tenants\//.test(c.path));

test.describe('Tenant Settings — profile and first validation workflows (Batch 38)', () => {
  test('TSET-001 Tenant settings route displays the current tenant identity and record', async ({ page }) => {
    await openSettings(page);
    await expect(page.getByRole('heading', { name: 'Tenant settings' })).toBeVisible();
    await expect(page.locator('.tenant-settings-current-card')).toContainText('Synthetic Inventory Hotel');
    await expect(page.locator('.tenant-settings-record')).toContainText(tenant.id);
  });
  test('TSET-002 Settings loads authorized tenant via GET and does not request platform-owned mutation', async ({ page }) => {
    const s = await openSettings(page);
    await expect(field(page, 'Name').locator('input')).toHaveValue(tenant.name);
    expect(s.calls.filter(c => c.method === 'GET' && /\/tenants$/.test(c.path))).toHaveLength(1);
    expect(putCalls(s.calls)).toHaveLength(0);
  });
  test('TSET-003 Profile and supplier identity are populated from current tenant data', async ({ page }) => {
    await openSettings(page);
    await expect(field(page, 'Location').locator('input')).toHaveValue('Rijeka');
    await expect(field(page, 'Organization type').locator('input')).toHaveValue('hotel');
    await expect(field(page, 'Legal / company name').locator('input')).toHaveValue('Synthetic Hotel d.o.o.');
    await expect(field(page, 'Business / delivery address').locator('textarea')).toHaveValue('Synthetic Street 1');
  });
  test('TSET-004 Tenant overview reports the configured EUR inventory currency', async ({ page }) => {
    await openSettings(page);
    await expect(page.locator('.tenant-settings-currency-status')).toContainText('Inventory currency confirmed');
    await expect(field(page, 'Currency code').locator('input')).toHaveValue('EUR');
  });
  test('TSET-005 Purchase-order approval separation is enabled from tenant policy', async ({ page }) => {
    await openSettings(page);
    await expect(page.locator('.tenant-settings-control-card--approval input[type=checkbox]')).toBeChecked();
    await expect(page.locator('.tenant-settings-control-card--approval')).toContainText('REQUIRED');
  });
  test('TSET-006 Operating-season fields display persisted start and end dates', async ({ page }) => {
    await openSettings(page);
    await expect(field(page, 'Season start').locator('input')).toHaveValue('2026-05-01');
    await expect(field(page, 'Season end').locator('input')).toHaveValue('2026-09-30');
    await expect(page.locator('.tenant-settings-control-card--season')).toContainText('Configured');
  });
  test('TSET-007 Empty optional profile fields keep safe blank form values', async ({ page }) => {
    await openSettings(page, { record: { ...tenant, location: null, legal_name: null, business_email: null, business_address: null } });
    await expect(field(page, 'Location').locator('input')).toHaveValue('');
    await expect(field(page, 'Legal / company name').locator('input')).toHaveValue('');
    await expect(field(page, 'Business email').locator('input')).toHaveValue('');
    await expect(page.locator('.tenant-settings-current-card')).toContainText('No location configured');
  });
  test('TSET-008 Editing name marks form unsaved and enables saving valid changes', async ({ page }) => {
    await openSettings(page);
    await field(page, 'Name').locator('input').fill('Synthetic Updated Hotel');
    await expect(page.locator('.tenant-settings-badge--unsaved')).toContainText('UNSAVED CHANGES');
    await expect(save(page)).toBeEnabled();
  });
  test('TSET-009 Removing required company name presents field error and disables submit', async ({ page }) => {
    const s = await openSettings(page);
    await field(page, 'Name').locator('input').fill('');
    await expect(field(page, 'Name')).toContainText('Company name is required.');
    await expect(save(page)).toBeDisabled();
    expect(putCalls(s.calls)).toHaveLength(0);
  });
  test('TSET-010 Empty organization type is invalid and cannot be submitted', async ({ page }) => {
    await openSettings(page);
    await field(page, 'Organization type').locator('input').fill('');
    await expect(field(page, 'Organization type').locator('input')).toHaveAttribute('aria-invalid', 'true');
    await expect(save(page)).toBeDisabled();
  });
  test('TSET-011 Invalid supplier-facing email is identified without PUT call', async ({ page }) => {
    const s = await openSettings(page);
    await field(page, 'Business email').locator('input').fill('not-an-email');
    await expect(field(page, 'Business email')).toContainText('Enter a valid business email address.');
    await expect(save(page)).toBeDisabled();
    expect(putCalls(s.calls)).toHaveLength(0);
  });
  test('TSET-012 Valid business email re-enables save after an invalid entry', async ({ page }) => {
    await openSettings(page);
    await field(page, 'Business email').locator('input').fill('bad-value');
    await expect(save(page)).toBeDisabled();
    await field(page, 'Business email').locator('input').fill('orders@example.invalid');
    await expect(field(page, 'Business email').locator('input')).toHaveAttribute('aria-invalid', 'false');
    await expect(save(page)).toBeEnabled();
  });
  test('TSET-013 Inverted operating-season dates show validation and prevent save', async ({ page }) => {
    await openSettings(page);
    await field(page, 'Season start').locator('input').fill('2026-12-01');
    await field(page, 'Season end').locator('input').fill('2026-01-01');
    await expect(field(page, 'Season end')).toContainText('Season end cannot be before season start.');
    await expect(save(page)).toBeDisabled();
  });
  test('TSET-014 Currency must be exactly three alphabetic characters', async ({ page }) => {
    await openSettings(page);
    await field(page, 'Currency code').locator('input').fill('EU');
    await expect(field(page, 'Currency code')).toContainText('Enter a 3-letter currency code');
    await expect(save(page)).toBeDisabled();
  });
  test('TSET-015 Reset changes restores original profile and removes unsaved indicator', async ({ page }) => {
    await openSettings(page);
    await field(page, 'Name').locator('input').fill('Temporary Name');
    await page.getByRole('button', { name: 'Reset changes' }).click();
    await expect(field(page, 'Name').locator('input')).toHaveValue(tenant.name);
    await expect(page.locator('.tenant-settings-badge--unsaved')).toHaveCount(0);
    await expect(save(page)).toBeDisabled();
  });
  test('TSET-016 Saving trims identity fields and shows response-backed success', async ({ page }) => {
    const s = await openSettings(page);
    await field(page, 'Name').locator('input').fill('  Hotel Update  ');
    await field(page, 'Business email').locator('input').fill('  updated@example.invalid  ');
    await save(page).click();
    await expect(page.locator('.tenant-settings-message[role=status]')).toContainText('Tenant settings saved.');
    expect(putCalls(s.calls)).toHaveLength(1);
    expect(putCalls(s.calls)[0].path).toMatch(/\/tenants\/pw-tenant-settings-01$/);
    expect(putCalls(s.calls)[0].payload).toMatchObject({ name: 'Hotel Update', business_email: 'updated@example.invalid', inventory_currency: 'EUR', confirm_inventory_currency: false });
  });
  test('TSET-017 Failed PUT preserves the unsaved edit and displays server error', async ({ page }) => {
    const s = await openSettings(page, { saveStatus: 403 });
    await field(page, 'Name').locator('input').fill('Uncommitted Hotel');
    await save(page).click();
    await expect(page.locator('.tenant-settings-message[role=alert]')).toContainText('Synthetic tenant settings save denied');
    await expect(field(page, 'Name').locator('input')).toHaveValue('Uncommitted Hotel');
    await expect(page.locator('.tenant-settings-badge--unsaved')).toBeVisible();
    expect(putCalls(s.calls)).toHaveLength(1);
  });
  test('TSET-018 Tenant.read role without tenant.update sees read-only form and no save access', async ({ page }) => {
    const s = await openSettings(page, { role: 'PW_TSET_READ_ONLY' });
    await expect(page.getByText('Your role can read tenant settings but cannot update them.')).toBeVisible();
    await expect(field(page, 'Name').locator('input')).toBeDisabled();
    await expect(save(page)).toBeDisabled();
    expect(putCalls(s.calls)).toHaveLength(0);
  });
  test('TSET-019 Active tenant write lock disables editing even for update-authorized role', async ({ page }) => {
    const s = await openSettings(page, { record: { ...tenant, write_locked: true } });
    await expect(page.getByText('Tenant write lock is active.')).toBeVisible();
    await expect(field(page, 'Business email').locator('input')).toBeDisabled();
    await expect(save(page)).toBeDisabled();
    expect(putCalls(s.calls)).toHaveLength(0);
  });
  test('TSET-020 Empty GET response shows missing-tenant error instead of an editable form', async ({ page }) => {
    const s = await openSettings(page, { empty: true });
    await expect(page.getByText('The backend did not return the current tenant.')).toBeVisible();
    await expect(page.locator('form.tenant-settings-form')).toHaveCount(0);
    expect(putCalls(s.calls)).toHaveLength(0);
  });
});


// Batch 39: remaining source-inspected Tenant Settings scenarios. No live settings mutations.
test.describe('Tenant Settings — refresh, governance, limits, navigation and security (Batch 39)', () => {
  test('TSET-021 Failed initial GET displays settings load error without editable form', async ({ page }) => {
    const s = await openSettings(page, { getStatus: 503 });
    await expect(page.locator('.tenant-settings-message.app-error-state')).toContainText('Failed to load tenant settings:');
    await expect(page.locator('form.tenant-settings-form')).toHaveCount(0);
    expect(putCalls(s.calls)).toHaveLength(0);
  });
  test('TSET-022 Refresh refetches settings and acknowledges completed read', async ({ page }) => {
    const s = await openSettings(page);
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.locator('.tenant-settings-message[role=status]')).toContainText('Tenant settings refreshed.');
    expect(s.calls.filter(c => c.method === 'GET' && /\/tenants$/.test(c.path)).length).toBeGreaterThanOrEqual(2);
    expect(putCalls(s.calls)).toHaveLength(0);
  });
  test('TSET-023 Failed refresh shows an error instead of claiming refreshed', async ({ page }) => {
    await openSettings(page, { getStatusAfterInitial: 503 });
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.locator('.tenant-settings-message[role=alert]')).toContainText('Synthetic tenant settings unavailable');
    await expect(page.locator('.tenant-settings-message[role=status]')).toHaveCount(0);
  });
  test('TSET-024 Dirty form disables refresh and preserves pending field edit', async ({ page }) => {
    const s = await openSettings(page);
    await field(page, 'Name').locator('input').fill('Pending unsaved change');
    await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeDisabled();
    await expect(field(page, 'Name').locator('input')).toHaveValue('Pending unsaved change');
    expect(s.calls.filter(c => c.method === 'GET' && /\/tenants$/.test(c.path))).toHaveLength(1);
  });
  test('TSET-025 Reset after failed save clears inline error and does not repeat PUT', async ({ page }) => {
    const s = await openSettings(page, { saveStatus: 409 });
    await field(page, 'Name').locator('input').fill('Rejected edit');
    await save(page).click();
    await expect(page.locator('.tenant-settings-message[role=alert]')).toBeVisible();
    await page.getByRole('button', { name: 'Reset changes' }).click();
    await expect(page.locator('.tenant-settings-message[role=alert]')).toHaveCount(0);
    await expect(field(page, 'Name').locator('input')).toHaveValue(tenant.name);
    expect(putCalls(s.calls)).toHaveLength(1);
  });
  test('TSET-026 Self-approval policy reports the distinct overview and form status', async ({ page }) => {
    await openSettings(page, { record: { ...tenant, require_separate_purchase_order_approver: false } });
    await expect(page.locator('.tenant-settings-control-card--approval')).toContainText('SELF-APPROVAL');
    await expect(page.locator('.tenant-settings-control-card--approval input[type=checkbox]')).not.toBeChecked();
    await expect(page.locator('.tenant-settings-page')).toContainText('Self-approval');
  });
  test('TSET-027 Approval separation toggle persists false in intercepted tenant PUT', async ({ page }) => {
    const s = await openSettings(page);
    await page.locator('.tenant-settings-control-card--approval input[type=checkbox]').uncheck();
    await expect(page.locator('.tenant-settings-control-card--approval')).toContainText('SELF-APPROVAL');
    await save(page).click();
    await expect(page.locator('.tenant-settings-message[role=status]')).toContainText('Tenant settings saved.');
    expect(putCalls(s.calls)).toHaveLength(1);
    expect(putCalls(s.calls)[0].payload?.require_separate_purchase_order_approver).toBe(false);
  });
  test('TSET-028 Default language selection submits tenant locale, not personal UI change', async ({ page }) => {
    const s = await openSettings(page);
    await field(page, 'Default application language').locator('select').selectOption('hr-HR');
    await expect(page.getByRole('heading', { name: 'Tenant settings' })).toBeVisible();
    await save(page).click();
    expect(putCalls(s.calls)[0].payload?.default_locale).toBe('hr-HR');
    await expect(page.locator('.tenant-settings-message[role=status]')).toContainText('Tenant settings saved.');
  });
  test('TSET-029 Configured tenant currency change rejected by API is not reported saved', async ({ page }) => {
    const s = await openSettings(page, { saveStatus: 409 });
    await field(page, 'Currency code').locator('input').fill('USD');
    await expect(save(page)).toBeEnabled();
    await save(page).click();
    await expect(page.locator('.tenant-settings-message[role=alert]')).toContainText('Synthetic tenant settings save denied');
    await expect(page.locator('.tenant-settings-badge--unsaved')).toBeVisible();
    expect(putCalls(s.calls)[0].payload?.inventory_currency).toBe('USD');
  });
  test('TSET-030 Changing unconfirmed legacy currency needs explicit acknowledgement', async ({ page }) => {
    const s = await openSettings(page, { record: { ...tenant, inventory_currency_configured_at: null } });
    await field(page, 'Currency code').locator('input').fill('GBP');
    await expect(page.locator('.tenant-settings-currency-notice')).toContainText('You changed the currency. Confirm it above before saving.');
    await expect(save(page)).toBeDisabled();
    expect(putCalls(s.calls)).toHaveLength(0);
  });
  test('TSET-031 Editing legacy currency clears previous acknowledgement', async ({ page }) => {
    await openSettings(page, { record: { ...tenant, inventory_currency_configured_at: null } });
    const checkbox = page.locator('.tenant-settings-currency-notice input[type=checkbox]');
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    await field(page, 'Currency code').locator('input').fill('USD');
    await expect(checkbox).not.toBeChecked();
    await expect(save(page)).toBeDisabled();
  });
  test('TSET-032 Confirmed legacy currency change submits explicit confirmation flag', async ({ page }) => {
    const s = await openSettings(page, { record: { ...tenant, inventory_currency_configured_at: null } });
    await field(page, 'Currency code').locator('input').fill('USD');
    await page.locator('.tenant-settings-currency-notice input[type=checkbox]').check();
    await expect(save(page)).toBeEnabled();
    await save(page).click();
    await expect(page.locator('.tenant-settings-message[role=status]')).toContainText('Tenant settings saved.');
    expect(putCalls(s.calls)[0].payload).toMatchObject({ inventory_currency: 'USD', confirm_inventory_currency: true });
  });
  test('TSET-033 Existing legacy code can be explicitly confirmed without changing code', async ({ page }) => {
    const s = await openSettings(page, { record: { ...tenant, inventory_currency_configured_at: null } });
    await page.locator('.tenant-settings-currency-notice input[type=checkbox]').check();
    await expect(page.locator('.tenant-settings-badge--unsaved')).toBeVisible();
    await save(page).click();
    expect(putCalls(s.calls)[0].payload).toMatchObject({ inventory_currency: 'EUR', confirm_inventory_currency: true });
  });
  test('TSET-034 Pending PUT disables duplicate submit, reset and editing', async ({ page }) => {
    const s = await openSettings(page, { saveDelayMs: 1200 });
    await field(page, 'Name').locator('input').fill('Pending server update');
    await save(page).click();
    await expect(page.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Reset changes' })).toBeDisabled();
    await expect(field(page, 'Name').locator('input')).toBeDisabled();
    await expect(page.locator('.tenant-settings-message[role=status]')).toContainText('Tenant settings saved.');
    expect(putCalls(s.calls)).toHaveLength(1);
  });
  test('TSET-035 Declining discard confirmation retains dirty form and route', async ({ page }) => {
    await openSettings(page);
    await field(page, 'Name').locator('input').fill('Keep this draft');
    page.once('dialog', async dialog => { expect(dialog.message()).toContain('Discard unsaved tenant settings'); await dialog.dismiss(); });
    await page.locator('a[href="/dashboard"]').first().click();
    await expect(page).toHaveURL(/\/tenant-settings$/);
    await expect(field(page, 'Name').locator('input')).toHaveValue('Keep this draft');
  });
  test('TSET-036 Accepting discard confirmation proceeds through tenant navigation', async ({ page }) => {
    await openSettings(page);
    await field(page, 'Name').locator('input').fill('Discard this draft');
    page.once('dialog', async dialog => { expect(dialog.message()).toContain('Discard unsaved tenant settings'); await dialog.accept(); });
    await page.locator('a[href="/dashboard"]').first().click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });
  test('TSET-037 Dirty state registers a cancellable before-unload warning', async ({ page }) => {
    await openSettings(page);
    await field(page, 'Name').locator('input').fill('Draft for unload');
    const prevented = await page.evaluate(() => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(prevented).toBe(true);
  });
  test('TSET-038 Name field enforces its source 160-character input ceiling', async ({ page }) => {
    await openSettings(page);
    const input = field(page, 'Name').locator('input');
    await expect(input).toHaveAttribute('maxlength', '160');
    await input.fill('N'.repeat(170));
    await expect(input).toHaveValue('N'.repeat(160));
  });
  test('TSET-039 Location field enforces its 255-character input ceiling', async ({ page }) => {
    await openSettings(page);
    const input = field(page, 'Location').locator('input');
    await expect(input).toHaveAttribute('maxlength', '255');
    await input.fill('L'.repeat(270));
    await expect(input).toHaveValue('L'.repeat(255));
  });
  test('TSET-040 Supplier phone and VAT fields both restrict length to 100', async ({ page }) => {
    await openSettings(page);
    for (const label of ['Business phone', 'Tax / VAT ID']) {
      const input = field(page, label).locator('input');
      await expect(input).toHaveAttribute('maxlength', '100');
      await input.fill('9'.repeat(115));
      await expect(input).toHaveValue('9'.repeat(100));
    }
  });
  test('TSET-041 Business address field limits typed text to 2000 characters', async ({ page }) => {
    await openSettings(page);
    const input = field(page, 'Business / delivery address').locator('textarea');
    await expect(input).toHaveAttribute('maxlength', '2000');
    await input.fill('A'.repeat(2015));
    await expect(input).toHaveValue('A'.repeat(2000));
  });
  test('TSET-042 Payment terms field limits typed text to 1000 characters', async ({ page }) => {
    await openSettings(page);
    const input = field(page, 'Default purchase order payment terms').locator('textarea');
    await expect(input).toHaveAttribute('maxlength', '1000');
    await input.fill('P'.repeat(1015));
    await expect(input).toHaveValue('P'.repeat(1000));
  });
  test('TSET-043 Lack of tenant.read redirects at ProtectedRoute before settings renders', async ({ page }) => {
    await loginAsDisposableRole(page, 'PW_TSET_NO_READ');
    await page.goto('/tenant-settings');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('form.tenant-settings-form')).toHaveCount(0);
  });
  test('TSET-044 Single-sided operating season shows Partial and identifies missing endpoint', async ({ page }) => {
    await openSettings(page, { record: { ...tenant, season_start: '2026-05-01', season_end: null } });
    await expect(page.locator('.io-workspace-stats')).toContainText('Partial');
    await expect(page.locator('.io-workspace-stats')).toContainText('No end');
    await expect(page.locator('.tenant-settings-control-card--season')).toContainText('Partial');
  });
  test('TSET-045 Tenant settings exposes PUT only, not tenant creation, deletion or platform locking', async ({ page }) => {
    const s = await openSettings(page);
    await expect(page.locator('form.tenant-settings-form')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete tenant' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Create tenant' })).toHaveCount(0);
    await field(page, 'Name').locator('input').fill('Tenant identity only');
    await save(page).click();
    await expect(page.locator('.tenant-settings-message[role=status]')).toContainText('Tenant settings saved.');
    expect(s.calls.filter(c => c.method !== 'GET' && c.method !== 'PUT')).toHaveLength(0);
    expect(putCalls(s.calls)).toHaveLength(1);
  });
});
// Batch 169: Tenant Settings — independent payload normalization, draft-state,
// boundary, governance, refresh and permission checks against synthetic API responses.
// Browser declarations only; no backend/tenant writes or runtime verification performed.
test.describe('Tenant Settings — additional source-backed boundaries (Batch 169)', () => {
  test('TSET-046 Returning a changed name to its original value clears dirty state without PUT', async ({ page }) => {
    const s = await openSettings(page);
    const input = field(page, 'Name').locator('input');
    await input.fill('Temporary edit');
    await expect(page.locator('.tenant-settings-badge--unsaved')).toBeVisible();
    await input.fill(tenant.name);
    await expect(page.locator('.tenant-settings-badge--saved')).toBeVisible();
    await expect(save(page)).toBeDisabled();
    expect(putCalls(s.calls)).toHaveLength(0);
  });
  test('TSET-047 Whitespace-only location legal name and business phone become null in PUT', async ({ page }) => {
    const s = await openSettings(page);
    await field(page, 'Location').locator('input').fill('   ');
    await field(page, 'Legal / company name').locator('input').fill('  ');
    await field(page, 'Business phone').locator('input').fill('  ');
    await save(page).click();
    await expect(page.locator('.tenant-settings-message[role=status]')).toContainText('Tenant settings saved.');
    expect(putCalls(s.calls)[0].payload).toMatchObject({ location: null, legal_name: null, business_phone: null });
  });
  test('TSET-048 Whitespace-only tax address and payment terms become null in PUT', async ({ page }) => {
    const s = await openSettings(page);
    await field(page, 'Tax / VAT ID').locator('input').fill(' ');
    await field(page, 'Business / delivery address').locator('textarea').fill('   ');
    await field(page, 'Default purchase order payment terms').locator('textarea').fill('   ');
    await save(page).click();
    await expect(page.locator('.tenant-settings-message[role=status]')).toContainText('Tenant settings saved.');
    expect(putCalls(s.calls)[0].payload).toMatchObject({ tax_id: null, business_address: null, default_purchase_order_payment_terms: null });
  });
  test('TSET-049 Organization type and supplier name are trimmed separately on PUT', async ({ page }) => {
    const s = await openSettings(page);
    await field(page, 'Organization type').locator('input').fill('  resort  ');
    await field(page, 'Legal / company name').locator('input').fill('  Another Legal Name  ');
    await save(page).click();
    await expect(page.locator('.tenant-settings-message[role=status]')).toContainText('Tenant settings saved.');
    expect(putCalls(s.calls)[0].payload).toMatchObject({ organization_type: 'resort', legal_name: 'Another Legal Name' });
  });
  test('TSET-050 A supplier-contact edit transmits each distinct field without changing tenant ID', async ({ page }) => {
    const s = await openSettings(page);
    await field(page, 'Business email').locator('input').fill('sales@example.invalid');
    await field(page, 'Business phone').locator('input').fill('+385 000 222');
    await field(page, 'Tax / VAT ID').locator('input').fill('HR00011122233');
    await save(page).click();
    await expect(page.locator('.tenant-settings-message[role=status]')).toContainText('Tenant settings saved.');
    expect(putCalls(s.calls)).toHaveLength(1);
    expect(putCalls(s.calls)[0].path).toMatch(new RegExp('/tenants/' + tenant.id + '$'));
    expect(putCalls(s.calls)[0].payload).toMatchObject({ business_email: 'sales@example.invalid', business_phone: '+385 000 222', tax_id: 'HR00011122233' });
  });
  test('TSET-051 Organization type is capped at source-defined 80 characters', async ({ page }) => {
    await openSettings(page);
    const input = field(page, 'Organization type').locator('input');
    await expect(input).toHaveAttribute('maxlength', '80');
    await input.fill('O'.repeat(95));
    await expect(input).toHaveValue('O'.repeat(80));
  });
  test('TSET-052 Supplier legal name is capped at 255 characters', async ({ page }) => {
    await openSettings(page);
    const input = field(page, 'Legal / company name').locator('input');
    await expect(input).toHaveAttribute('maxlength', '255');
    await input.fill('L'.repeat(265));
    await expect(input).toHaveValue('L'.repeat(255));
  });
  test('TSET-053 Supplier business email is capped at 255 characters', async ({ page }) => {
    await openSettings(page);
    const input = field(page, 'Business email').locator('input');
    await expect(input).toHaveAttribute('maxlength', '255');
    await input.fill('A'.repeat(260));
    await expect(input).toHaveValue('A'.repeat(255));
  });
  test('TSET-054 Entering lowercase currency renders and sends uppercase ISO text', async ({ page }) => {
    const s = await openSettings(page);
    const input = field(page, 'Currency code').locator('input');
    await input.fill('usd');
    await expect(input).toHaveValue('USD');
    await save(page).click();
    await expect(page.locator('.tenant-settings-message[role=status]')).toContainText('Tenant settings saved.');
    expect(putCalls(s.calls)[0].payload?.inventory_currency).toBe('USD');
  });
  test('TSET-055 Numeric three-character currency fails pattern validation before PUT', async ({ page }) => {
    const s = await openSettings(page);
    await field(page, 'Currency code').locator('input').fill('123');
    await expect(field(page, 'Currency code').locator('input')).toHaveAttribute('aria-invalid', 'true');
    await expect(save(page)).toBeDisabled();
    expect(putCalls(s.calls)).toHaveLength(0);
  });
  test('TSET-056 Blank inventory currency blocks a dirty form from submitting', async ({ page }) => {
    const s = await openSettings(page);
    await field(page, 'Currency code').locator('input').fill('');
    await expect(field(page, 'Currency code')).toContainText('Enter a 3-letter currency code');
    await expect(save(page)).toBeDisabled();
    expect(putCalls(s.calls)).toHaveLength(0);
  });
  test('TSET-057 Clearing saved operating season dates serializes both dates as null', async ({ page }) => {
    const s = await openSettings(page);
    await field(page, 'Season start').locator('input').fill('');
    await field(page, 'Season end').locator('input').fill('');
    await save(page).click();
    await expect(page.locator('.tenant-settings-message[role=status]')).toContainText('Tenant settings saved.');
    expect(putCalls(s.calls)[0].payload).toMatchObject({ season_start: null, season_end: null });
  });
  test('TSET-058 Season-end date minimum tracks the edited start date', async ({ page }) => {
    await openSettings(page);
    await field(page, 'Season start').locator('input').fill('2026-07-01');
    await expect(field(page, 'Season end').locator('input')).toHaveAttribute('min', '2026-07-01');
    await field(page, 'Season start').locator('input').fill('');
    await expect(field(page, 'Season end').locator('input')).not.toHaveAttribute('min');
  });
  test('TSET-059 Draft season badge updates before save while overview reflects persisted season', async ({ page }) => {
    const s = await openSettings(page, { record: { ...tenant, season_start: null, season_end: null } });
    await expect(page.locator('.tenant-settings-control-card--season')).toContainText('Not set');
    await field(page, 'Season start').locator('input').fill('2026-05-15');
    await expect(page.locator('.tenant-settings-control-card--season')).toContainText('Partial');
    await expect(page.locator('.io-workspace-stats')).toContainText('Not set');
    expect(putCalls(s.calls)).toHaveLength(0);
  });
  test('TSET-060 Organization type slug gets a readable tenant identity label', async ({ page }) => {
    await openSettings(page, { record: { ...tenant, organization_type: 'regional_distribution-center' } });
    await expect(page.locator('.tenant-settings-current-card__organization-type')).toHaveText('Regional Distribution Center');
  });
  test('TSET-061 Missing organization type falls back to facility in overview and form', async ({ page }) => {
    await openSettings(page, { record: { ...tenant, organization_type: null as unknown as string } });
    await expect(field(page, 'Organization type').locator('input')).toHaveValue('facility');
    await expect(page.locator('.tenant-settings-current-card__organization-type')).toHaveText('Facility');
  });
  test('TSET-062 Absent approval-policy field falls back to separation enabled', async ({ page }) => {
    await openSettings(page, { record: { ...tenant, require_separate_purchase_order_approver: null as unknown as boolean } });
    await expect(page.locator('.tenant-settings-control-card--approval input[type=checkbox]')).toBeChecked();
    await expect(page.locator('.tenant-settings-control-card--approval')).toContainText('REQUIRED');
  });
  test('TSET-063 Legacy tenant unrelated profile edit keeps confirmation flag false', async ({ page }) => {
    const s = await openSettings(page, { record: { ...tenant, inventory_currency_configured_at: null } });
    await field(page, 'Location').locator('input').fill('New Location');
    await expect(page.locator('.tenant-settings-currency-notice input[type=checkbox]')).not.toBeChecked();
    await save(page).click();
    await expect(page.locator('.tenant-settings-message[role=status]')).toContainText('Tenant settings saved.');
    expect(putCalls(s.calls)[0].payload).toMatchObject({ inventory_currency: 'EUR', confirm_inventory_currency: false });
  });
  test('TSET-064 Reset clears a legacy currency acknowledgement without sending PUT', async ({ page }) => {
    const s = await openSettings(page, { record: { ...tenant, inventory_currency_configured_at: null } });
    const checkbox = page.locator('.tenant-settings-currency-notice input[type=checkbox]');
    await checkbox.check();
    await expect(page.locator('.tenant-settings-badge--unsaved')).toBeVisible();
    await page.getByRole('button', { name: 'Reset changes' }).click();
    await expect(checkbox).not.toBeChecked();
    await expect(save(page)).toBeDisabled();
    expect(putCalls(s.calls)).toHaveLength(0);
  });
  test('TSET-065 Successful name edit updates persisted overview and clears unsaved badge', async ({ page }) => {
    const s = await openSettings(page);
    await field(page, 'Name').locator('input').fill('Renamed Synthetic Hotel');
    await save(page).click();
    await expect(page.locator('.tenant-settings-message[role=status]')).toContainText('Tenant settings saved.');
    await expect(page.locator('.tenant-settings-current-card')).toContainText('Renamed Synthetic Hotel');
    await expect(page.locator('.tenant-settings-badge--saved')).toBeVisible();
    await expect(save(page)).toBeDisabled();
    expect(putCalls(s.calls)).toHaveLength(1);
  });
  test('TSET-066 Payment terms remain visible after a successful intercepted update', async ({ page }) => {
    const s = await openSettings(page);
    await field(page, 'Default purchase order payment terms').locator('textarea').fill('Net 15 from receipt');
    await save(page).click();
    await expect(page.locator('.tenant-settings-message[role=status]')).toContainText('Tenant settings saved.');
    await expect(field(page, 'Default purchase order payment terms').locator('textarea')).toHaveValue('Net 15 from receipt');
    expect(putCalls(s.calls)[0].payload?.default_purchase_order_payment_terms).toBe('Net 15 from receipt');
  });
  test('TSET-067 Refresher is reenabled after a successful save settles all dirty state', async ({ page }) => {
    await openSettings(page);
    await field(page, 'Name').locator('input').fill('Saved Now');
    await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeDisabled();
    await save(page).click();
    await expect(page.locator('.tenant-settings-message[role=status]')).toContainText('Tenant settings saved.');
    await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
  });
  test('TSET-068 Editing a new field clears prior save confirmation until next successful PUT', async ({ page }) => {
    const s = await openSettings(page);
    await field(page, 'Name').locator('input').fill('First Commit');
    await save(page).click();
    await expect(page.locator('.tenant-settings-message[role=status]')).toContainText('Tenant settings saved.');
    await field(page, 'Location').locator('input').fill('Second Draft Location');
    await expect(page.locator('.tenant-settings-message[role=status]')).toHaveCount(0);
    await expect(page.locator('.tenant-settings-badge--unsaved')).toBeVisible();
    expect(putCalls(s.calls)).toHaveLength(1);
  });
  test('TSET-069 Changing a field after failed PUT clears stale error but preserves draft', async ({ page }) => {
    const s = await openSettings(page, { saveStatus: 409 });
    await field(page, 'Name').locator('input').fill('Rejected Draft');
    await save(page).click();
    await expect(page.locator('.tenant-settings-message[role=alert]')).toContainText('Synthetic tenant settings save denied');
    await field(page, 'Location').locator('input').fill('Still Unsaved');
    await expect(page.locator('.tenant-settings-message[role=alert]')).toHaveCount(0);
    await expect(field(page, 'Name').locator('input')).toHaveValue('Rejected Draft');
    await expect(page.locator('.tenant-settings-badge--unsaved')).toBeVisible();
    expect(putCalls(s.calls)).toHaveLength(1);
  });
  test('TSET-070 Reverting an unsaved approval toggle restores baseline without API mutation', async ({ page }) => {
    const s = await openSettings(page);
    const checkbox = page.locator('.tenant-settings-control-card--approval input[type=checkbox]');
    await checkbox.uncheck();
    await expect(page.locator('.tenant-settings-badge--unsaved')).toBeVisible();
    await checkbox.check();
    await expect(page.locator('.tenant-settings-badge--saved')).toBeVisible();
    await expect(save(page)).toBeDisabled();
    expect(putCalls(s.calls)).toHaveLength(0);
  });
  test('TSET-071 Write lock applies to governance, locale and currency controls together', async ({ page }) => {
    const s = await openSettings(page, { record: { ...tenant, write_locked: true } });
    await expect(field(page, 'Default application language').locator('select')).toBeDisabled();
    await expect(page.locator('.tenant-settings-control-card--approval input[type=checkbox]')).toBeDisabled();
    await expect(field(page, 'Season start').locator('input')).toBeDisabled();
    await expect(field(page, 'Currency code').locator('input')).toBeDisabled();
    expect(putCalls(s.calls)).toHaveLength(0);
  });
});
