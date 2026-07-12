import { expect, test, type Page, type Route } from '@playwright/test';

const encodeBase64Url = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url');

const accessToken = [
  encodeBase64Url({ alg: 'none', typ: 'JWT' }),
  encodeBase64Url({
    id: 'user-1',
    user_id: 'user-1',
    tenant_id: 'tenant-1',
    role: 'admin',
    exp: Math.floor(Date.now() / 1000) + 3600
  }),
  'test-signature'
].join('.');

const json = (route: Route, body: unknown, status = 200) => route.fulfill({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body)
});

async function mockUsageLedgerApi(page: Page, consumeSucceeds: boolean): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, '');

    if (request.method() === 'GET' && path === '/maintenance-context/current') {
      return json(route, { active: [], upcoming: [] });
    }
    if (request.method() === 'GET' && path === '/announcement-context/current') {
      return json(route, { announcements: [] });
    }
    if (request.method() === 'GET' && path === '/incident-context/current') {
      return json(route, { incidents: [] });
    }
    if (request.method() === 'GET' && path === '/tenants/subscription-access') {
      return json(route, {
        tenant: {
          id: 'tenant-1',
          name: 'Test Tenant',
          status: 'active',
          billing_status: 'active',
          plan_code: 'enterprise',
          trial_ends_at: null,
          current_period_ends_at: null
        },
        write_access: { allowed: true, blocker: null },
        plan_usage: [],
        plan_limit_blocked_resources: [],
        feature_entitlements: [],
        feature_blocked_resources: []
      });
    }
    if (request.method() === 'GET' && path === '/storage-locations') {
      return json(route, [{ id: 'loc-1', name: 'Main Warehouse', is_active: true, deleted_at: null }]);
    }
    if (request.method() === 'GET' && path === '/stock/usage/summary') {
      return json(route, {
        totals: {
          usage_count: 0,
          total_quantity: 0,
          estimated_usage_value: 0,
          missing_cost_count: 0,
          product_count: 0,
          location_count: 0,
          last_consumed_at: null
        },
        by_reason: [],
        by_department: [],
        by_location: [],
        by_user: [],
        by_day: [],
        by_product: []
      });
    }
    if (request.method() === 'GET' && path === '/stock/usage') {
      return json(route, []);
    }
    if (request.method() === 'GET' && path === '/stock/usage/exceptions') {
      return json(route, { summary: { exception_count: 0 }, rows: [] });
    }
    if (request.method() === 'GET' && path === '/stock/usage/impact') {
      return json(route, {
        summary: {
          impacted_count: 0,
          depleted_count: 0,
          below_minimum_count: 0,
          estimated_usage_value: 0,
          recommended_reorder_quantity: 0
        },
        rows: []
      });
    }
    if (request.method() === 'GET' && path === '/stock/usage/anomalies') {
      return json(route, {
        summary: { spike_count: 0, impacted_product_count: 0, highest_spike_multiplier: 0 },
        rows: []
      });
    }
    if (request.method() === 'GET' && path === '/stock/usage/templates') {
      return json(route, []);
    }
    if (request.method() === 'GET' && path === '/stock/usage/templates/scheduled') {
      return json(route, { summary: { due_count: 0, overdue_count: 0 }, rows: [], templates: [] });
    }
    if (request.method() === 'GET' && path === '/stock/usage/period-closures') {
      return json(route, []);
    }
    if (request.method() === 'POST' && path === '/stock/consume/barcode/preview') {
      const payload = JSON.parse(request.postData() || '{}') as Record<string, unknown>;
      return json(route, {
        message: 'Stock impact preview ready.',
        barcode_match: {
          barcode: payload.barcode,
          product_id: 'product-1',
          product_name: 'Test Product',
          product_unit: 'pcs',
          matched_label_barcode: true,
          match_source: 'label',
          package_count: 1
        },
        preview: {
          storage_location_id: 'loc-1',
          storage_location_name: 'Main Warehouse',
          usage_timestamp: new Date().toISOString(),
          consumption_reason: payload.consumption_reason || 'internal_use',
          has_evidence_metadata: false,
          package_count: Number(payload.package_count || 1),
          quantity_to_consume: 1,
          current_quantity: 10,
          resulting_quantity: 9,
          minimum_quantity: 0,
          has_stock_row: true,
          blocking_reasons: [],
          acknowledgement_required_reasons: [],
          recordable_after_acknowledgement: true,
          can_record_without_acknowledgement: true,
          period_open: true
        }
      });
    }
    if (request.method() === 'POST' && path === '/stock/consume/barcode') {
      const payload = JSON.parse(request.postData() || '{}') as Record<string, unknown>;

      if (!consumeSucceeds) {
        return json(route, {
          error: {
            code: 'QUICK_CONSUME_TEST_FAILURE',
            message: 'Test quick consume failure.'
          }
        }, 409);
      }

      return json(route, {
        idempotent_replay: false,
        usage: { id: 'usage-1', quantity: 1 },
        barcode_match: {
          barcode: payload.barcode,
          product_id: 'product-1',
          product_name: 'Test Product',
          product_unit: 'pcs',
          matched_label_barcode: true,
          match_source: 'label'
        },
        stock: {
          storage_location_id: 'loc-1',
          previous_quantity: 10,
          new_quantity: 9
        }
      });
    }

    if (request.method() === 'GET') {
      return json(route, []);
    }

    return json(route, {});
  });
}

async function openPreparedQuickConsume(page: Page): Promise<{
  barcode: ReturnType<Page['getByLabel']>;
  consume: ReturnType<Page['getByRole']>;
}> {
  await page.addInitScript((token) => {
    localStorage.setItem('inventory_access_token', token);
    localStorage.removeItem('inventory_refresh_token');
    localStorage.removeItem('inventoryUsage.quickConsumeDefaults');
  }, accessToken);

  await page.goto('/inventory-usage');

  const barcode = page.getByLabel('Barcode', { exact: true });
  await expect(barcode).toBeVisible();
  await barcode.fill('LBL-TEST123');

  const location = page.locator('label').filter({ hasText: 'Stock location' }).locator('select').first();
  await location.selectOption('loc-1');

  const preview = page.getByRole('button', { name: 'Preview stock impact' });
  await expect(preview).toBeEnabled();
  await preview.click();

  const consume = page.getByRole('button', { name: 'Quick consume' });
  await expect(consume).toBeEnabled();

  return { barcode, consume };
}

test.describe('inventory usage quick-consume confirmed completion', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('successful quick consume clears the complete scan form and reports completion', async ({ page }) => {
    await mockUsageLedgerApi(page, true);
    const { barcode, consume } = await openPreparedQuickConsume(page);

    await consume.click();

    await expect(barcode).toHaveValue('');
    await expect(page.getByLabel('Scan quantity', { exact: true })).toHaveValue('1');
    await expect(page.getByRole('status').filter({ hasText: 'Quick consume recorded successfully' }).first()).toBeVisible();
    await expect(page.locator('body')).toContainText('The scan form was cleared and is ready for the next barcode.');
    await expect(page.locator('body')).not.toContainText('Action started');
  });

  test('failed quick consume preserves the barcode and reports the backend failure', async ({ page }) => {
    await mockUsageLedgerApi(page, false);
    const { barcode, consume } = await openPreparedQuickConsume(page);

    await consume.click();

    await expect(barcode).toHaveValue('LBL-TEST123');
    await expect(page.getByRole('alert').filter({ hasText: 'Quick consume failed' }).first()).toBeVisible();
  });
});
