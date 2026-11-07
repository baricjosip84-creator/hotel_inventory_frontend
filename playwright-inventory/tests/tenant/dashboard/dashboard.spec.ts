import { test, expect } from '../../../support/liveOriginalSafeTest';
import { fulfillJson, loginAsTenant, summaryFixture } from '../../../support/tenantSession';

// Sources: frontend/src/pages/DashboardPage.tsx; frontend/src/app/router.tsx;
// backend/src/routes/dashboard.js; backend/src/services/analytics/dashboardService.js.
// Integration cases require a disposable administrator/manager tenant with relevant permissions.

test.describe('Tenant dashboard — /dashboard', () => {
  test.beforeEach(async ({ page }) => { await loginAsTenant(page); });

  test('TDASH-001 root entry navigates to the protected dashboard, not a duplicate page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard(?:[?#]|$)/);
    await expect(page.getByRole('heading', { name: 'Operations Dashboard' })).toBeVisible();
  });

  test('TDASH-002 dashboard summary values are rendered in corresponding permission-visible KPI cards', async ({ page }) => {
    await page.route('**/dashboard/summary', async (route) => fulfillJson(route, summaryFixture));
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Operations Dashboard' })).toBeVisible();
    const products = page.locator('.io-workspace-stat').filter({ has: page.locator('.io-workspace-stat__label', { hasText: 'Products' }) });
    await expect(products.locator('.io-workspace-stat__value')).toHaveText('19');
    const suppliers = page.locator('.io-workspace-stat').filter({ has: page.locator('.io-workspace-stat__label', { hasText: 'Suppliers' }) });
    await expect(suppliers.locator('.io-workspace-stat__value')).toHaveText('7');
  });

  test('TDASH-003 backend summary failure shows explicit dashboard error instead of stale metrics', async ({ page }) => {
    await page.route('**/dashboard/summary', async (route) => fulfillJson(route, { error: { message: 'Synthetic summary outage' } }, 503));
    await page.reload();
    await expect(page.getByText(/Failed to load dashboard summary: Synthetic summary outage/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Operations Dashboard' })).toHaveCount(0);
  });

  test('TDASH-004 Open Stock quick action goes to the stock page', async ({ page }) => {
    await page.getByRole('link', { name: 'Open Stock', exact: true }).first().click();
    await expect(page).toHaveURL(/\/stock(?:[?#]|$)/);
  });

  test('TDASH-005 Review Alerts quick action carries the unresolved-focus query', async ({ page }) => {
    await page.getByRole('link', { name: 'Review Alerts', exact: true }).click();
    await expect(page).toHaveURL(/\/alerts\?resolved=false&focus_queue=true/);
  });

  test('TDASH-006 Open Shipments quick action enters the shipments page', async ({ page }) => {
    await page.getByRole('link', { name: 'Open Shipments', exact: true }).click();
    await expect(page).toHaveURL(/\/shipments(?:[?#]|$)/);
  });

  test('TDASH-007 empty low-stock response shows a positive no-shortages state', async ({ page }) => {
    await page.route('**/dashboard/low-stock?limit=8', async (route) => fulfillJson(route, []));
    await page.reload();
    await expect(page.getByText('No positions below location minimum.', { exact: true })).toBeVisible();
  });

  test('TDASH-008 overdue shipment record opens the exact shipment query context', async ({ page }) => {
    await page.route('**/dashboard/overdue-shipments?limit=8', async (route) => fulfillJson(route, [{
      id: '11111111-2222-4333-8444-555555555555', supplier_id: '22222222-3333-4444-8555-666666666666',
      supplier_name: 'Supplier PW Example', delivery_date: '2026-01-15', status: 'pending',
      po_number: 'PW-OVERDUE-0001', qr_code: 'SYNTHETIC', created_at: '2026-01-10',
      version: 1, line_count: 1, total_ordered_quantity: 9, total_received_quantity: 0
    }]));
    await page.reload();
    await page.getByRole('link', { name: 'PW-OVERDUE-0001' }).click();
    await expect(page).toHaveURL(/\/shipments\?shipmentId=11111111-2222-4333-8444-555555555555&source=dashboard/);
  });

  test('TDASH-009 alert detail action keeps the selected alert identifier', async ({ page }) => {
    await page.route('**/dashboard/unresolved-alerts?limit=8', async (route) => fulfillJson(route, [{
      id: '33333333-4444-4555-8666-777777777777', type: 'low_stock', message: 'Synthetic shortage for UI assertion',
      severity: 'warning', escalation_level: 1, acknowledged: false, created_at: '2026-01-15T12:00:00Z'
    }]));
    await page.reload();
    await page.getByRole('link', { name: 'Open in Alerts' }).click();
    await expect(page).toHaveURL(/\/alerts\?alert_id=33333333-4444-4555-8666-777777777777/);
  });

  test('TDASH-010 incomplete tenant setup checklist links to its real products route', async ({ page }) => {
    await page.route('**/dashboard/setup-checklist', async (route) => fulfillJson(route, {
      complete: false, completed_steps: 0, total_steps: 1,
      steps: [{ key: 'products', label: 'Add products', done: false, path: '/products' }]
    }));
    await page.reload();
    await expect(page.getByText('Getting started', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: /Add products/ }).click();
    await expect(page).toHaveURL(/\/products(?:[?#]|$)/);
  });

  test('TDASH-011 empty recent activity renders the documented historical empty state', async ({ page }) => {
    await page.route('**/dashboard/recent-activity?limit=10', async (route) => fulfillJson(route, []));
    await page.reload();
    await expect(page.getByText('No recent activity.', { exact: true })).toBeVisible();
  });

  test('TDASH-012 empty overdue shipments shows the clean delivery state', async ({ page }) => {
    await page.route('**/dashboard/overdue-shipments?limit=8', async (route) => fulfillJson(route, []));
    await page.reload();
    await expect(page.getByText('No overdue shipments.', { exact: true })).toBeVisible();
  });

  test('TDASH-013 empty unresolved alert list displays no-alerts confirmation', async ({ page }) => {
    await page.route('**/dashboard/unresolved-alerts?limit=8', async (route) => fulfillJson(route, []));
    await page.reload();
    await expect(page.getByText('No unresolved alerts', { exact: true })).toBeVisible();
  });
});

// Batch 2 — source-backed additions. Every case is GENERATED_UNRUN.
// Dashboard sections and fixture structures were traced to DashboardPage.tsx.
const sectionByTitle = (page: import('@playwright/test').Page, title: string) =>
  page.locator('section.dashboard-panel').filter({ has: page.getByRole('heading', { name: title, exact: true }) });

test.describe('Tenant dashboard — previously inventoried remaining scenarios', () => {
  test.beforeEach(async ({ page }) => { await loginAsTenant(page); });

  test('TDASH-014 a reduced effective-permission snapshot hides inaccessible KPI cards and quick actions', async ({ page }) => {
    // /permissions/me is the source of truth after authentication; do not forge JWTs.
    const snapshot = await page.evaluate(() => {
      const raw = localStorage.getItem('inventory_tenant_effective_permissions');
      return raw ? JSON.parse(raw) as Record<string, unknown> : null;
    });
    expect(snapshot?.tenant_id, 'Real disposable tenant session must load /permissions/me').toBeTruthy();
    await page.route('**/permissions/me', async (route) => fulfillJson(route, {
      ...snapshot, scope: 'tenant', permissions: ['dashboard.read', 'insights.read']
    }));
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Operations Dashboard' })).toBeVisible();
    await expect(page.locator('.io-workspace-stat__label', { hasText: 'Products' })).toHaveCount(0);
    await expect(page.locator('.io-workspace-stat__label', { hasText: 'Suppliers' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Open Stock', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Open Suppliers', exact: true })).toHaveCount(0);
  });

  test('TDASH-015 product, supplier, storage-location, outbound and insight actions use exact routed pages', async ({ page }) => {
    const actions: Array<[RegExp | string, RegExp]> = [
      [/^(Manage|Open) Products$/, /\/products(?:[?#]|$)/],
      ['Open Suppliers', /\/suppliers(?:[?#]|$)/],
      ['Open Locations', /\/storage-locations(?:[?#]|$)/],
      ['Open Outbound', /\/outbound(?:[?#]|$)/],
      ['Open Insights', /\/insights(?:[?#]|$)/]
    ];
    for (const [name, url] of actions) {
      await page.getByRole('link', { name }).first().click();
      await expect(page).toHaveURL(url);
      await page.goto('/dashboard');
      await expect(page.getByRole('heading', { name: 'Operations Dashboard' })).toBeVisible();
    }
  });

  test('TDASH-016 populated location-minimum shortages show product, location, quantity, minimum and deficit', async ({ page }) => {
    await page.route('**/dashboard/low-stock?limit=8', (route) => fulfillJson(route, [{
      id: 'pw-stock-row', product_id: 'pw-product', product_name: 'Synthetic Rye Flour',
      storage_location_id: 'pw-location', storage_location_name: 'Synthetic Kitchen',
      quantity: 3, min_stock: 12, shortage: 9, updated_at: '2026-10-01T10:00:00Z'
    }]));
    await page.reload();
    const record = sectionByTitle(page, 'Positions Below Location Minimum').locator('.dashboard-record-card').filter({ hasText: 'Synthetic Rye Flour' });
    await expect(record).toContainText('Synthetic Kitchen');
    await expect(record).toContainText('Qty');
    await expect(record).toContainText('Location Minimum');
    await expect(record).toContainText('Shortage');
    await expect(record.locator('.dashboard-record-card__metrics b')).toHaveText(['3', '12', '9']);
  });

  test('TDASH-017 location-shortages API failure shows a scoped error', async ({ page }) => {
    await page.route('**/dashboard/low-stock?limit=8', (route) => fulfillJson(route, { error: { message: 'Synthetic shortages unavailable' } }, 503));
    await page.reload();
    await expect(sectionByTitle(page, 'Positions Below Location Minimum').getByText('Synthetic shortages unavailable')).toBeVisible();
  });

  test('TDASH-018 overdue-shipments endpoint failure shows a scoped error', async ({ page }) => {
    await page.route('**/dashboard/overdue-shipments?limit=8', (route) => fulfillJson(route, { error: { message: 'Synthetic overdue endpoint unavailable' } }, 503));
    await page.reload();
    await expect(sectionByTitle(page, 'Overdue Shipments').getByText('Synthetic overdue endpoint unavailable')).toBeVisible();
  });

  test('TDASH-019 unresolved-alerts endpoint failure shows a scoped error', async ({ page }) => {
    await page.route('**/dashboard/unresolved-alerts?limit=8', (route) => fulfillJson(route, { error: { message: 'Synthetic alerts unavailable' } }, 503));
    await page.reload();
    await expect(sectionByTitle(page, 'Unresolved Alerts').getByText('Synthetic alerts unavailable')).toBeVisible();
  });

  test('TDASH-020 complete setup checklist is not rendered', async ({ page }) => {
    await page.route('**/dashboard/setup-checklist', (route) => fulfillJson(route, {
      complete: true, completed_steps: 2, total_steps: 2, steps: [
        { key: 'products', label: 'Add products', done: true, path: '/products' },
        { key: 'stock', label: 'Add stock', done: true, path: '/stock' }
      ]
    }));
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Operations Dashboard' })).toBeVisible();
    await expect(page.getByText('Getting started', { exact: true })).toHaveCount(0);
  });

  test('TDASH-021 movement activity displays classified reason, actor, location and signed quantity', async ({ page }) => {
    await page.route('**/dashboard/recent-activity?limit=10', (route) => fulfillJson(route, [{
      id: 'pw-movement', product_id: 'pw-product', product_name: 'Synthetic Stock Item',
      product_unit: 'kg', storage_location_id: 'pw-location', storage_location_name: 'Synthetic Storeroom',
      shipment_id: 'pw-shipment', movement_type: 'receipt', movement_kind: 'receipt',
      change: 6, reason: 'shipment_receive', user_id: 'pw-actor', user_name: 'Synthetic Operator',
      created_at: '2026-10-01T10:00:00Z'
    }]));
    await page.reload();
    const activity = page.locator('.dashboard-activity-card').filter({ hasText: 'Synthetic Stock Item' });
    await expect(activity).toContainText('+6');
    await expect(activity).toContainText('Synthetic Storeroom');
    await expect(activity).toContainText('Shipment received');
    await expect(activity).toContainText('Synthetic Operator');
  });

  test('TDASH-022 supplier performance shows shipment counts and opens the selected supplier', async ({ page }) => {
    await page.route('**/dashboard/supplier-performance?limit=8', (route) => fulfillJson(route, [{
      supplier_id: 'pw-supplier-04', supplier_name: 'Synthetic Orchard Foods', total_shipments: 7,
      pending_shipments: 3, partial_shipments: 1, received_shipments: 2, overdue_shipments: 1
    }]));
    await page.reload();
    const supplier = sectionByTitle(page, 'Supplier Performance').locator('.dashboard-record-card').filter({ hasText: 'Synthetic Orchard Foods' });
    await expect(supplier.locator('.dashboard-record-card__metrics b')).toHaveText(['7','3','1','2','1']);
    await supplier.getByRole('link', { name: 'Open Supplier' }).click();
    await expect(page).toHaveURL(/\/suppliers\?supplier_id=pw-supplier-04/);
  });

  test('TDASH-023 zero supplier performance records show the source-defined empty message', async ({ page }) => {
    await page.route('**/dashboard/supplier-performance?limit=8', (route) => fulfillJson(route, []));
    await page.reload();
    await expect(sectionByTitle(page, 'Supplier Performance').getByText('No supplier performance rows found.', { exact: true })).toBeVisible();
  });

  test('TDASH-024 depletion-risk product opens the exact stock_id route', async ({ page }) => {
    await page.route('**/inventory-insights/depletion-risk?lookback_days=30', (route) => fulfillJson(route, {
      generated_at: '2026-10-01T10:00:00Z', tenant_id: 'pw-tenant', lookback_days: 30,
      rows: [{ stock_id: 'pw-stock-risk-07', product_id: 'pw-product', product_name: 'Synthetic Risk Item',
        storage_location_id: 'pw-location', storage_location_name: 'Synthetic Storeroom', product_unit: 'pcs',
        current_quantity: 4, configured_min_quantity: 20, recent_outbound_quantity: 25,
        average_daily_outbound: 1, estimated_days_of_coverage: 4, risk_score: 95,
        risk_tier: 'critical', updated_at: '2026-10-01T10:00:00Z', version: 1 }] }));
    await page.reload();
    await expect(sectionByTitle(page, 'Depletion Risk').getByText('Synthetic Risk Item')).toBeVisible();
    await sectionByTitle(page, 'Depletion Risk').getByRole('link', { name: 'Open Stock' }).click();
    await expect(page).toHaveURL(/\/stock\?stock_id=pw-stock-risk-07/);
  });

  test('TDASH-025 depletion-risk API failure shows the source message in its section', async ({ page }) => {
    await page.route('**/inventory-insights/depletion-risk?lookback_days=30', (route) => fulfillJson(route, { error: { message: 'Synthetic depletion risk unavailable' } }, 503));
    await page.reload();
    await expect(sectionByTitle(page, 'Depletion Risk').getByText('Synthetic depletion risk unavailable')).toBeVisible();
  });

  test('TDASH-026 positive reorder recommendation navigates to its product filter', async ({ page }) => {
    await page.route('**/reorder-insights/recommendations?lookback_days=30&active_only=true&sort_by=reorder_quantity_desc&limit=6', (route) => fulfillJson(route, {
      generated_at: '2026-10-01T10:00:00Z', tenant_id: 'pw-tenant', lookback_days: 30,
      evaluation: { products_evaluated: 1, products_with_incomplete_demand_history: 0, demand_history_complete: true },
      rows: [{ product_id: 'pw-reorder-product', product_name: 'Synthetic Purchase Item', unit: 'box',
        current_quantity: 2, min_stock: 9, recent_outbound: 14, average_daily_usage: 0.5,
        estimated_days_of_coverage: 4, recommended_reorder_quantity: 16, urgency: 'high' }]
    }));
    await page.reload();
    const section = sectionByTitle(page, 'Reorder Recommendations');
    await expect(section.getByText('Synthetic Purchase Item')).toBeVisible();
    await section.getByRole('link', { name: 'Review recommendation' }).click();
    await expect(page).toHaveURL(/\/procurement-recommendations\?product_id=pw-reorder-product/);
  });

  test('TDASH-027 operational health score renders score, tier and discrepancy/low-stock rates', async ({ page }) => {
    await page.route('**/operational-insights/health-score', (route) => fulfillJson(route, {
      generated_at: '2026-10-01T10:00:00Z', tenant_id: 'pw-tenant', health_score: 77, health_tier: 'good',
      metrics: { unresolved_alerts: 1, overdue_shipments: 2, total_stock_rows: 20,
        low_stock_rows: 4, low_stock_rate_pct: 20, total_ordered_quantity: 100,
        total_discrepancy_quantity: 5, discrepancy_rate_pct: 5 },
      penalties: { alert_penalty: 3, overdue_penalty: 6, low_stock_penalty: 8, discrepancy_penalty: 6 }
    }));
    await page.reload();
    const health = page.locator('.app-panel').filter({ hasText: 'Operational Health' }).filter({ hasText: 'Discrepancy Rate' }).first();
    await expect(health).toContainText('77');
    await expect(health).toContainText('Good');
    await expect(health).toContainText('20%');
    await expect(health).toContainText('5%');
  });

  test('TDASH-028 classified anomaly opens product-filtered stock-movements page', async ({ page }) => {
    await page.route('**/operational-insights/anomalies?short_window_days=7&baseline_window_days=30', (route) => fulfillJson(route, {
      generated_at: '2026-10-01T10:00:00Z', tenant_id: 'pw-tenant', short_window_days: 7, baseline_window_days: 30,
      rows: [{ product_id: 'pw-anomaly-05', product_name: 'Synthetic Demand Spike',
        short_window_days: 7, baseline_window_days: 30, recent_outbound_quantity: 26,
        baseline_outbound_quantity: 10, recent_daily_outbound: 4, baseline_daily_outbound: 1,
        spike_ratio: 4, anomaly_score: 88, anomaly_tier: 'critical' }]
    }));
    await page.reload();
    const anomalies = sectionByTitle(page, 'Inventory Anomalies');
    await expect(anomalies.getByText('Synthetic Demand Spike')).toBeVisible();
    await anomalies.getByRole('link', { name: 'Open Stock Movements' }).click();
    await expect(page).toHaveURL(/\/stock-movements\?product_id=pw-anomaly-05/);
  });

  test('TDASH-029 Reports action is hidden on denied entitlement and shown when authorized', async ({ page }) => {
    let allowed = false;
    await page.route('**/tenants/subscription-access', (route) => fulfillJson(route, {
      tenant: { id: 'pw-tenant', name: 'Disposable Test Tenant', status: 'active', billing_status: 'active',
        plan_code: 'test', trial_ends_at: null, current_period_ends_at: null },
      write_access: { allowed: true, blocker: null }, plan_usage: [], plan_limit_blocked_resources: [],
      feature_entitlements: [{ feature: 'reports', allowed }]
    }));
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Operations Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open Reports', exact: true })).toHaveCount(0);
    allowed = true;
    await page.reload();
    await expect(page.getByRole('link', { name: 'Open Reports', exact: true })).toBeVisible();
  });
});

// Newly discovered browser-testable Dashboard behavior in the same actual page.
test.describe('Tenant dashboard — additional traced states', () => {
  test.beforeEach(async ({ page }) => { await loginAsTenant(page); });

  test('TDASH-030 an unresolved summary request shows the loading state, not stale KPIs', async ({ page }) => {
    let finish!: () => void;
    const held = new Promise<void>((resolve) => { finish = resolve; });
    await page.route('**/dashboard/summary', async (route) => {
      await held;
      await fulfillJson(route, summaryFixture);
    });
    try {
      await page.reload();
      await expect(page.getByText('Loading dashboard...', { exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Operations Dashboard' })).toHaveCount(0);
    } finally {
      finish();
    }
    await expect(page.getByRole('heading', { name: 'Operations Dashboard' })).toBeVisible();
  });

  test('TDASH-031 outbound orders display open, waiting and partial-shipment counts', async ({ page }) => {
    await page.route('**/outbound/summary', (route) => fulfillJson(route, {
      open_orders: 8, packed_orders: 3, partially_dispatched_orders: 2,
      units_waiting: 34, pending_customer_returns: 1
    }));
    await page.reload();
    const openOrders = page.locator('.io-workspace-stat').filter({ has: page.locator('.io-workspace-stat__label', { hasText: 'Open Outbound Orders' }) });
    await expect(openOrders.locator('.io-workspace-stat__value')).toHaveText('8');
    await expect(openOrders).toContainText('34');
    const partial = page.locator('.io-workspace-stat').filter({ has: page.locator('.io-workspace-stat__label', { hasText: 'Partial Customer Shipments' }) });
    await expect(partial.locator('.io-workspace-stat__value')).toHaveText('2');
  });

  test('TDASH-032 outbound API failure renders unavailable indicator rather than fabricated count', async ({ page }) => {
    await page.route('**/outbound/summary', (route) => fulfillJson(route, { error: { message: 'Synthetic outbound outage' } }, 503));
    await page.reload();
    const card = page.locator('.io-workspace-stat').filter({ has: page.locator('.io-workspace-stat__label', { hasText: 'Open Outbound Orders' }) });
    await expect(card.locator('.io-workspace-stat__value')).toHaveText('—');
    await expect(card).toContainText('Outbound summary unavailable');
  });

  test('TDASH-033 incomplete depletion demand history warns without presenting perfect coverage', async ({ page }) => {
    await page.route('**/inventory-insights/depletion-risk?lookback_days=30', (route) => fulfillJson(route, {
      generated_at: '2026-10-01T10:00:00Z', tenant_id: 'pw-tenant', lookback_days: 30,
      rows: [{ stock_id: 'pw-stock-incomplete', product_id: 'pw-product', product_name: 'Synthetic Gap',
        storage_location_id: 'pw-location', storage_location_name: 'Synthetic Storeroom',
        current_quantity: 5, configured_min_quantity: 10, recent_outbound_quantity: 4,
        average_daily_outbound: 1, estimated_days_of_coverage: 5, risk_score: 90,
        risk_tier: 'critical', demand_history_complete: false, classification_coverage_pct: 55,
        unlocated_negative_quantity: 3, updated_at: '2026-10-01T10:00:00Z', version: 1 }] }));
    await page.reload();
    const section = sectionByTitle(page, 'Depletion Risk');
    await expect(section.getByText('Demand history incomplete', { exact: true })).toBeVisible();
    await expect(section).toContainText('55%');
    await expect(section).toContainText('Some demand movements are missing storage location context.');
  });

  test('TDASH-034 no depletion candidates displays the stable-stock explanation', async ({ page }) => {
    await page.route('**/inventory-insights/depletion-risk?lookback_days=30', (route) => fulfillJson(route, {
      generated_at: '2026-10-01T10:00:00Z', tenant_id: 'pw-tenant', lookback_days: 30, rows: []
    }));
    await page.reload();
    await expect(sectionByTitle(page, 'Depletion Risk').getByText('No active depletion risk', { exact: true })).toBeVisible();
  });

  test('TDASH-035 empty reorder result with incomplete history is explicitly non-authoritative', async ({ page }) => {
    await page.route('**/reorder-insights/recommendations?lookback_days=30&active_only=true&sort_by=reorder_quantity_desc&limit=6', (route) => fulfillJson(route, {
      generated_at: '2026-10-01T10:00:00Z', tenant_id: 'pw-tenant', lookback_days: 30,
      evaluation: { products_evaluated: 9, products_with_incomplete_demand_history: 3, demand_history_complete: false }, rows: []
    }));
    await page.reload();
    const section = sectionByTitle(page, 'Reorder Recommendations');
    await expect(section.getByText('Reorder signal needs review', { exact: true })).toBeVisible();
    await expect(section).toContainText('not fully authoritative');
  });

  test('TDASH-036 ordinary anomaly tiers are filtered from the critical anomaly list', async ({ page }) => {
    await page.route('**/operational-insights/anomalies?short_window_days=7&baseline_window_days=30', (route) => fulfillJson(route, {
      generated_at: '2026-10-01T10:00:00Z', tenant_id: 'pw-tenant', short_window_days: 7, baseline_window_days: 30,
      rows: [{ product_id: 'pw-normal', product_name: 'Synthetic Ordinary Item',
        short_window_days: 7, baseline_window_days: 30, recent_outbound_quantity: 4,
        baseline_outbound_quantity: 4, recent_daily_outbound: 1, baseline_daily_outbound: 1,
        spike_ratio: 1, anomaly_score: 0, anomaly_tier: 'normal' }]
    }));
    await page.reload();
    const section = sectionByTitle(page, 'Inventory Anomalies');
    await expect(section.getByText('No abnormal consumption patterns', { exact: true })).toBeVisible();
    await expect(section.getByText('Synthetic Ordinary Item')).toHaveCount(0);
  });

  test('TDASH-037 unclassified historical movement retains an explicit warning label', async ({ page }) => {
    await page.route('**/dashboard/recent-activity?limit=10', (route) => fulfillJson(route, [{
      id: 'pw-legacy', product_id: 'pw-product', product_name: 'Synthetic Legacy Item',
      product_unit: 'kg', storage_location_name: null, movement_kind: 'unclassified',
      change: -2, reason: 'legacy_unknown_code', user_id: null, user_name: null,
      created_at: '2026-10-01T10:00:00Z'
    }]));
    await page.reload();
    const activity = page.locator('.dashboard-activity-card').filter({ hasText: 'Synthetic Legacy Item' });
    await expect(activity).toContainText('Unclassified legacy movement');
    await expect(activity).toContainText('Historical location unavailable');
    await expect(activity).toContainText('System');
  });

  test('TDASH-038 missing insights permission shows explicit health access explanation', async ({ page }) => {
    const snapshot = await page.evaluate(() => {
      const raw = localStorage.getItem('inventory_tenant_effective_permissions');
      return raw ? JSON.parse(raw) as Record<string, unknown> : null;
    });
    expect(snapshot?.tenant_id).toBeTruthy();
    await page.route('**/permissions/me', (route) => fulfillJson(route, {
      ...snapshot, scope: 'tenant', permissions: ['dashboard.read']
    }));
    await page.reload();
    await expect(page.getByText('Your role can view the operational dashboard but not management insights.')).toBeVisible();
    await expect(sectionByTitle(page, 'Depletion Risk')).toContainText('not depletion-risk insights');
  });

  test('TDASH-039 setup checklist endpoint error is visible without hiding the dashboard', async ({ page }) => {
    await page.route('**/dashboard/setup-checklist', (route) => fulfillJson(route, { error: { message: 'Synthetic checklist unavailable' } }, 503));
    await page.reload();
    await expect(page.getByText('Synthetic checklist unavailable')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Operations Dashboard' })).toBeVisible();
  });

  test('TDASH-040 supplier-performance endpoint error shows a scoped failure', async ({ page }) => {
    await page.route('**/dashboard/supplier-performance?limit=8', (route) => fulfillJson(route, { error: { message: 'Synthetic supplier-performance failure' } }, 503));
    await page.reload();
    await expect(sectionByTitle(page, 'Supplier Performance').getByText('Synthetic supplier-performance failure')).toBeVisible();
  });

  test('TDASH-041 overdue shipment supplier link preserves exact supplier_id context', async ({ page }) => {
    await page.route('**/dashboard/overdue-shipments?limit=8', (route) => fulfillJson(route, [{
      id: 'pw-shipment', supplier_id: 'pw-supplier-53', supplier_name: 'Synthetic Food Supplier',
      delivery_date: '2026-01-15', status: 'pending', po_number: 'PW-OVERDUE-53', qr_code: 'PW',
      created_at: '2026-01-10', version: 1, line_count: 1,
      total_ordered_quantity: 7, total_received_quantity: 0
    }]));
    await page.reload();
    const record = sectionByTitle(page, 'Overdue Shipments').locator('.dashboard-record-card').filter({ hasText: 'PW-OVERDUE-53' });
    await record.getByRole('link', { name: 'Synthetic Food Supplier' }).click();
    await expect(page).toHaveURL(/\/suppliers\?supplier_id=pw-supplier-53/);
  });

  test('TDASH-042 recent activity endpoint error is isolated to its section', async ({ page }) => {
    await page.route('**/dashboard/recent-activity?limit=10', (route) => fulfillJson(route, { error: { message: 'Synthetic activity failure' } }, 503));
    await page.reload();
    await expect(sectionByTitle(page, 'Recent Activity').getByText('Synthetic activity failure')).toBeVisible();
  });

  test('TDASH-043 reorder insight failure remains explicit inside the recommendations panel', async ({ page }) => {
    await page.route('**/reorder-insights/recommendations?lookback_days=30&active_only=true&sort_by=reorder_quantity_desc&limit=6', (route) => fulfillJson(route, { error: { message: 'Synthetic reorder failure' } }, 503));
    await page.reload();
    await expect(sectionByTitle(page, 'Reorder Recommendations').getByText('Synthetic reorder failure')).toBeVisible();
  });
});

// Batch 179 — additional immutable-source-traced Dashboard read-only boundaries.
// All service results in this block are synthetic intercepted GETs; none establish
// backend calculations, tenant authorization, persistence or runtime acceptance.
type B179Page = import('@playwright/test').Page;
const b179Panel = (p: B179Page, heading: string) =>
  p.locator('section.dashboard-panel').filter({ has: p.getByRole('heading', { name: heading, exact: true }) });
const b179Kpi = (p: B179Page, title: string) =>
  p.locator('.io-workspace-stat').filter({ has: p.locator('.io-workspace-stat__label', { hasText: title }) });
const b179Get = async (p: B179Page, endpoint: string, result: unknown, status = 200) => {
  await p.route(`**${endpoint}`, (route) => fulfillJson(route, result, status));
  await p.reload();
};
const b179Health = {
  generated_at:'2026-11-01T10:00:00Z',tenant_id:'pw-b179-tenant',health_score:82,health_tier:'good',
  metrics:{unresolved_alerts:2,overdue_shipments:1,total_stock_rows:10,low_stock_rows:3,
    low_stock_rate_pct:30,total_ordered_quantity:20,total_discrepancy_quantity:2,discrepancy_rate_pct:10},
  penalties:{alert_penalty:1,overdue_penalty:1,low_stock_penalty:2,discrepancy_penalty:2}
};
const b179Depletion = (id: number, score: number, extra: Record<string, unknown> = {}) => ({
  stock_id:`pw-b179-stock-${id}`,product_id:`pw-b179-product-${id}`,product_name:`PW Depletion ${id}`,
  storage_location_id:`pw-b179-location-${id}`,storage_location_name:'PW B179 Storeroom',product_unit:'kg',
  current_quantity:6,configured_min_quantity:12,recent_outbound_quantity:4,average_daily_outbound:2,
  estimated_days_of_coverage:3,risk_score:score,risk_tier:'high',updated_at:'2026-11-01T10:00:00Z',version:1,
  ...extra
});
const b179Reorder = (id: number, quantity: number, extra: Record<string, unknown> = {}) => ({
  product_id:`pw-b179-product-${id}`,product_name:`PW Reorder ${id}`,unit:'kg',current_quantity:4,
  min_stock:10,recent_outbound:6,average_daily_usage:2,estimated_days_of_coverage:2,
  recommended_reorder_quantity:quantity,urgency:'high',...extra
});
const b179Anomaly = (id: number, tier = 'high', extra: Record<string, unknown> = {}) => ({
  product_id:`pw-b179-anomaly-${id}`,product_name:`PW Anomaly ${id}`,product_category:'Pantry',product_unit:'kg',
  short_window_days:7,baseline_window_days:30,recent_outbound_quantity:14,baseline_outbound_quantity:3,
  recent_daily_outbound:2,baseline_daily_outbound:1,spike_ratio:2,anomaly_score:68,anomaly_tier:tier,
  ...extra
});
const b179Activity = (id: string, extra: Record<string, unknown> = {}) => ({
  id:`pw-b179-activity-${id}`,product_id:'pw-b179-product',product_name:`PW Movement ${id}`,product_unit:'kg',
  storage_location_id:'pw-b179-location',storage_location_name:'PW Main Shelf',movement_kind:'adjustment',
  movement_type:'manual_adjustment',change:1,reason:'manual_adjustment',user_id:null,user_name:null,
  created_at:'2026-11-01T10:00:00Z',...extra
});
const b179ActivityCard = (p:B179Page, marker:string) =>
  p.locator('.dashboard-activity-card').filter({ hasText: marker });
const b179ReorderResponse = (rows: unknown[]) => ({
  generated_at:'2026-11-01T10:00:00Z',tenant_id:'pw-b179-tenant',lookback_days:30,
  evaluation:{products_evaluated:rows.length,products_with_incomplete_demand_history:0,demand_history_complete:true},rows
});
const b179DepletionResponse = (rows: unknown[]) => ({
  generated_at:'2026-11-01T10:00:00Z',tenant_id:'pw-b179-tenant',lookback_days:30,rows
});
const b179AnomaliesResponse = (rows: unknown[]) => ({
  generated_at:'2026-11-01T10:00:00Z',tenant_id:'pw-b179-tenant',short_window_days:7,baseline_window_days:30,rows
});

test.describe('Tenant dashboard — source-backed resilience and insight boundaries (Batch 179)', () => {
  test.beforeEach(async ({ page }) => { await loginAsTenant(page); });

  test('TDASH-044 nullable master-data counts retain an unavailable dash, not numeric zero', async ({ page }) => {
    await b179Get(page,'/dashboard/summary',{...summaryFixture,master_data:{total_products:null,total_suppliers:null,total_storage_locations:null}});
    for (const label of ['Products','Suppliers','Storage Locations'])
      await expect(b179Kpi(page,label).locator('.io-workspace-stat__value')).toHaveText('—');
  });
  test('TDASH-045 unavailable shipment summary omits shipment counters without affecting products', async ({ page }) => {
    await b179Get(page,'/dashboard/summary',{...summaryFixture,shipments:null});
    await expect(b179Kpi(page,'Pending Shipments')).toHaveCount(0);
    await expect(b179Kpi(page,'Partial Shipments')).toHaveCount(0);
    await expect(b179Kpi(page,'Products')).toContainText('19');
  });
  test('TDASH-046 unavailable alert summary does not fabricate zero alert counters', async ({ page }) => {
    await b179Get(page,'/dashboard/summary',{...summaryFixture,alerts:null});
    await expect(b179Kpi(page,'Critical Alerts')).toHaveCount(0);
    await expect(b179Kpi(page,'Unresolved Alerts')).toHaveCount(0);
  });
  test('TDASH-047 absent stock summary does not present a fictitious low-stock count', async ({ page }) => {
    await b179Get(page,'/dashboard/summary',{...summaryFixture,stock:null});
    await expect(b179Kpi(page,'Positions Below Location Minimum')).toHaveCount(0);
    await expect(b179Kpi(page,'Products')).toContainText('19');
  });
  test('TDASH-048 zero partially dispatched outbound orders do not create a partial KPI card', async ({ page }) => {
    await b179Get(page,'/outbound/summary',{open_orders:2,packed_orders:0,partially_dispatched_orders:0,units_waiting:3,pending_customer_returns:0});
    await expect(b179Kpi(page,'Open Outbound Orders')).toContainText('2');
    await expect(b179Kpi(page,'Partial Customer Shipments')).toHaveCount(0);
  });
  test('TDASH-049 incomplete setup shows progress and visibly distinguishes completed steps', async ({ page }) => {
    await b179Get(page,'/dashboard/setup-checklist',{complete:false,completed_steps:1,total_steps:2,
      steps:[{key:'products',label:'Add products',done:true,path:'/products'},
        {key:'suppliers',label:'Add suppliers',done:false,path:'/suppliers'}]});
    const setup=page.getByText('Getting started',{exact:true}).locator('xpath=ancestor::section[1]');
    await expect(setup).toContainText('1/2');
    await expect(setup.getByRole('link',{name:/✓ Add products/})).toHaveAttribute('href','/products');
    await expect(setup.getByRole('link',{name:/○ Add suppliers/})).toHaveAttribute('href','/suppliers');
  });
  test('TDASH-050 health-score progress width clamps an excessive service value to 100 percent', async ({ page }) => {
    await b179Get(page,'/operational-insights/health-score',{...b179Health,health_score:150});
    const panel=page.getByText('Operational Health',{exact:true}).locator('xpath=ancestor::div[contains(@class,"app-panel")][1]');
    await expect(panel.locator('div[aria-hidden="true"] > div').last()).toHaveCSS('width',/\d/);
    await expect(panel.locator('div[aria-hidden="true"] > div').last()).toHaveAttribute('style',/width:\s*100%/);
    await expect(panel).toContainText('150'); // Displayed source is not silently rewritten.
  });
  test('TDASH-051 health-score progress width clamps negative service values to zero percent', async ({ page }) => {
    await b179Get(page,'/operational-insights/health-score',{...b179Health,health_score:-12});
    const panel=page.getByText('Operational Health',{exact:true}).locator('xpath=ancestor::div[contains(@class,"app-panel")][1]');
    await expect(panel.locator('div[aria-hidden="true"] > div').last()).toHaveAttribute('style',/width:\s*0%/);
  });
  test('TDASH-052 health-service failure is scoped without hiding the dashboard title', async ({ page }) => {
    await b179Get(page,'/operational-insights/health-score',{error:{message:'PW B179 health failure'}},503);
    await expect(page.getByText('PW B179 health failure')).toBeVisible();
    await expect(page.getByRole('heading',{name:'Operations Dashboard'})).toBeVisible();
  });
  test('TDASH-053 depletion risk ranks descending by numeric score and limits display to six', async ({ page }) => {
    const rows=Array.from({length:8},(_,i)=>b179Depletion(i+1,i+1));
    await b179Get(page,'/inventory-insights/depletion-risk?lookback_days=30',b179DepletionResponse(rows));
    await expect(b179Panel(page,'Depletion Risk').getByText(/^PW Depletion \d+$/)).toHaveText(
      ['PW Depletion 8','PW Depletion 7','PW Depletion 6','PW Depletion 5','PW Depletion 4','PW Depletion 3']);
  });
  test('TDASH-054 unavailable depletion coverage renders a dash rather than zero days', async ({ page }) => {
    await b179Get(page,'/inventory-insights/depletion-risk?lookback_days=30',b179DepletionResponse([
      b179Depletion(54,80,{estimated_days_of_coverage:null})]));
    const panel=b179Panel(page,'Depletion Risk');
    await expect(panel.getByText('Coverage Days').locator('xpath=following-sibling::strong[1]')).toHaveText('-');
  });
  test('TDASH-055 depletion consumption metric prefers classified consumption over outbound fallback', async ({ page }) => {
    await b179Get(page,'/inventory-insights/depletion-risk?lookback_days=30',b179DepletionResponse([
      b179Depletion(55,80,{recent_consumption_quantity:9,recent_outbound_quantity:4})]));
    await expect(b179Panel(page,'Depletion Risk').getByText('Recent Consumption').locator('xpath=following-sibling::strong[1]')).toHaveText('9');
  });
  test('TDASH-056 older depletion payload falls back to outbound if classified consumption is absent', async ({ page }) => {
    await b179Get(page,'/inventory-insights/depletion-risk?lookback_days=30',b179DepletionResponse([b179Depletion(56,80,{recent_outbound_quantity:7})]));
    await expect(b179Panel(page,'Depletion Risk').getByText('Recent Consumption').locator('xpath=following-sibling::strong[1]')).toHaveText('7');
  });
  test('TDASH-057 incomplete depletion data without coverage percentage explicitly shows zero percent', async ({ page }) => {
    await b179Get(page,'/inventory-insights/depletion-risk?lookback_days=30',b179DepletionResponse([
      b179Depletion(57,85,{demand_history_complete:false,classification_coverage_pct:null,unlocated_negative_quantity:0})]));
    const panel=b179Panel(page,'Depletion Risk');
    await expect(panel).toContainText('Demand history incomplete');
    await expect(panel).toContainText('Classified movement coverage: 0%');
    await expect(panel.getByText('Some demand movements are missing storage location context.')).toHaveCount(0);
  });
  test('TDASH-058 reorder recommendations sort descending and display at most six positive quantities', async ({ page }) => {
    const rows=Array.from({length:8},(_,i)=>b179Reorder(i+1,i+1));
    await b179Get(page,'/reorder-insights/recommendations?lookback_days=30&active_only=true&sort_by=reorder_quantity_desc&limit=6',b179ReorderResponse(rows));
    await expect(b179Panel(page,'Reorder Recommendations').getByText(/^PW Reorder \d+$/)).toHaveText(
      ['PW Reorder 8','PW Reorder 7','PW Reorder 6','PW Reorder 5','PW Reorder 4','PW Reorder 3']);
  });
  test('TDASH-059 negative and zero reorder quantities do not become purchase actions', async ({ page }) => {
    await b179Get(page,'/reorder-insights/recommendations?lookback_days=30&active_only=true&sort_by=reorder_quantity_desc&limit=6',
      b179ReorderResponse([b179Reorder(1,-5),b179Reorder(2,0)]));
    const panel=b179Panel(page,'Reorder Recommendations');
    await expect(panel.getByText('No reorder action required')).toBeVisible();
    await expect(panel.getByText(/^PW Reorder/)).toHaveCount(0);
    await expect(panel.getByRole('link',{name:'Review recommendation'})).toHaveCount(0);
  });
  test('TDASH-060 reorder coverage remains an unknown dash when estimates are null', async ({ page }) => {
    await b179Get(page,'/reorder-insights/recommendations?lookback_days=30&active_only=true&sort_by=reorder_quantity_desc&limit=6',
      b179ReorderResponse([b179Reorder(60,4,{estimated_days_of_coverage:null})]));
    await expect(b179Panel(page,'Reorder Recommendations').getByText('Coverage Days').locator('xpath=following-sibling::strong[1]')).toHaveText('-');
  });
  test('TDASH-061 reorder daily consumption prefers newer classified metric', async ({ page }) => {
    await b179Get(page,'/reorder-insights/recommendations?lookback_days=30&active_only=true&sort_by=reorder_quantity_desc&limit=6',
      b179ReorderResponse([b179Reorder(61,4,{average_daily_consumption:8,average_daily_usage:2})]));
    await expect(b179Panel(page,'Reorder Recommendations').getByText('Daily Consumption').locator('xpath=following-sibling::strong[1]')).toHaveText('8');
  });
  test('TDASH-062 reorder daily consumption falls back to legacy usage field', async ({ page }) => {
    await b179Get(page,'/reorder-insights/recommendations?lookback_days=30&active_only=true&sort_by=reorder_quantity_desc&limit=6',
      b179ReorderResponse([b179Reorder(62,4,{average_daily_usage:3})]));
    await expect(b179Panel(page,'Reorder Recommendations').getByText('Daily Consumption').locator('xpath=following-sibling::strong[1]')).toHaveText('3');
  });
  test('TDASH-063 reorder action preserves URL-encoded product identifier for procurement handoff', async ({ page }) => {
    await b179Get(page,'/reorder-insights/recommendations?lookback_days=30&active_only=true&sort_by=reorder_quantity_desc&limit=6',
      b179ReorderResponse([b179Reorder(63,4,{product_id:'item/a?x=2'})]));
    await expect(b179Panel(page,'Reorder Recommendations').getByRole('link',{name:'Review recommendation'}))
      .toHaveAttribute('href','/procurement-recommendations?product_id=item%2Fa%3Fx%3D2');
  });
  test('TDASH-064 anomaly normal tier is filtered case-insensitively', async ({ page }) => {
    await b179Get(page,'/operational-insights/anomalies?short_window_days=7&baseline_window_days=30',
      b179AnomaliesResponse([b179Anomaly(1,'NORMAL'),b179Anomaly(2,'Normal'),b179Anomaly(3,'critical')]));
    const panel=b179Panel(page,'Inventory Anomalies');
    await expect(panel.getByText('PW Anomaly 3')).toBeVisible();
    await expect(panel.getByText('PW Anomaly 1')).toHaveCount(0);
    await expect(panel.getByText('PW Anomaly 2')).toHaveCount(0);
  });
  test('TDASH-065 anomaly cards retain service order rather than re-sort by anomaly score', async ({ page }) => {
    const rows=Array.from({length:8},(_,i)=>b179Anomaly(i+1,'high',{anomaly_score:100-i}));
    await b179Get(page,'/operational-insights/anomalies?short_window_days=7&baseline_window_days=30',b179AnomaliesResponse(rows));
    await expect(b179Panel(page,'Inventory Anomalies').getByText(/^PW Anomaly \d+$/)).toHaveText(
      ['PW Anomaly 1','PW Anomaly 2','PW Anomaly 3','PW Anomaly 4','PW Anomaly 5','PW Anomaly 6']);
  });
  test('TDASH-066 anomaly daily consumption fields override legacy outbound fields independently', async ({ page }) => {
    await b179Get(page,'/operational-insights/anomalies?short_window_days=7&baseline_window_days=30',
      b179AnomaliesResponse([b179Anomaly(66,'high',{recent_daily_consumption:9,baseline_daily_consumption:3,
        recent_daily_outbound:2,baseline_daily_outbound:1})]));
    const panel=b179Panel(page,'Inventory Anomalies');
    await expect(panel.getByText('Recent Daily Consumption').locator('xpath=following-sibling::strong[1]')).toHaveText('9');
    await expect(panel.getByText('Baseline Daily Consumption').locator('xpath=following-sibling::strong[1]')).toHaveText('3');
  });
  test('TDASH-067 anomaly data-quality warning uses coverage percentage when history is incomplete', async ({ page }) => {
    await b179Get(page,'/operational-insights/anomalies?short_window_days=7&baseline_window_days=30',
      b179AnomaliesResponse([b179Anomaly(67,'watch',{demand_history_complete:false,classification_coverage_pct:45})]));
    const panel=b179Panel(page,'Inventory Anomalies');
    await expect(panel.getByText('Demand history incomplete')).toBeVisible();
    await expect(panel).toContainText('Classified movement coverage: 45%');
  });
  test('TDASH-068 unlinked alert displays neutral product fallback and acknowledged state', async ({ page }) => {
    await b179Get(page,'/dashboard/unresolved-alerts?limit=8',[{id:'pw-b179-alert',type:'manual',message:'PW inspection note',
      product_name:null,severity:'info',escalation_level:2,acknowledged:true,created_at:'2026-11-01T10:00:00Z'}]);
    const panel=b179Panel(page,'Unresolved Alerts');
    await expect(panel).toContainText('No product linked');
    await expect(panel.getByText('Acknowledged').locator('xpath=following-sibling::strong[1]')).toHaveText('Yes');
    await expect(panel.getByText('Escalation Level').locator('xpath=following-sibling::strong[1]')).toHaveText('2');
  });
  test('TDASH-069 supplier performance shows the five distinct source counts', async ({ page }) => {
    await b179Get(page,'/dashboard/supplier-performance?limit=8',[{
      supplier_id:'pw-b179-supplier',supplier_name:'PW B179 Supplier',total_shipments:14,
      pending_shipments:2,partial_shipments:3,received_shipments:8,overdue_shipments:1}]);
    const record=b179Panel(page,'Supplier Performance').locator('.dashboard-record-card').filter({hasText:'PW B179 Supplier'});
    await expect(record.locator('.dashboard-record-card__metrics b')).toHaveText(['14','2','3','8','1']);
  });
  test('TDASH-070 legacy low-stock row with missing product name uses explicit historical fallback', async ({ page }) => {
    await b179Get(page,'/dashboard/low-stock?limit=8',[{id:'pw-b179-low',product_id:'pw-b179-product',product_name:null,
      storage_location_id:'pw-b179-bin',storage_location_name:'PW Store',quantity:'2',min_stock:'6',shortage:'4',updated_at:'2026-11-01T10:00:00Z'}]);
    const panel=b179Panel(page,'Positions Below Location Minimum');
    await expect(panel.getByText('Historical Product name unavailable')).toBeVisible();
    await expect(panel.locator('.dashboard-record-card__metrics b')).toHaveText(['2','6','4']);
  });
  test('TDASH-071 activity uses explicit signed quantities for positive negative and zero movements', async ({ page }) => {
    await b179Get(page,'/dashboard/recent-activity?limit=10',[
      b179Activity('plus',{change:3.5}),b179Activity('minus',{change:-2}),b179Activity('zero',{change:0})]);
    await expect(b179ActivityCard(page,'PW Movement plus').locator('.dashboard-activity-card__change span')).toHaveText('+3.5');
    await expect(b179ActivityCard(page,'PW Movement minus').locator('.dashboard-activity-card__change span')).toHaveText('-2');
    await expect(b179ActivityCard(page,'PW Movement zero').locator('.dashboard-activity-card__change span')).toHaveText('0');
  });
  test('TDASH-072 historical activity preserves unknown actor, location, unit and product fallbacks', async ({ page }) => {
    await b179Get(page,'/dashboard/recent-activity?limit=10',[b179Activity('legacy',{
      product_name:null,product_unit:null,storage_location_name:null,user_id:'pw-b179-deleted-user',user_name:null})]);
    const record=b179ActivityCard(page,'Historical Product name unavailable');
    await expect(record).toContainText('Historical unit unavailable');
    await expect(record).toContainText('Historical location unavailable');
    await expect(record).toContainText('Historical actor unavailable');
  });
  test('TDASH-073 customer return reason shows safe reference and condition while preserving raw tooltip', async ({ page }) => {
    const raw='customer_return:RET-PW123:damaged';
    await b179Get(page,'/dashboard/recent-activity?limit=10',[b179Activity('customer',{reason:raw})]);
    const record=b179ActivityCard(page,'PW Movement customer');
    await expect(record.locator('.dashboard-activity-card__details b[title]')).toContainText('Customer return RET-PW123 · Damaged');
    await expect(record.locator('.dashboard-activity-card__details b[title]')).toHaveAttribute('title',raw);
  });
  test('TDASH-074 customer return rejects an unsafe reference in visible reason while keeping evidence in tooltip', async ({ page }) => {
    const raw='customer_return:<unknown-ref>:expired';
    await b179Get(page,'/dashboard/recent-activity?limit=10',[b179Activity('unsafe',{reason:raw})]);
    const reason=b179ActivityCard(page,'PW Movement unsafe').locator('.dashboard-activity-card__details b[title]');
    await expect(reason).toContainText('Customer return · Expired');
    await expect(reason).not.toContainText('<unknown-ref>');
    await expect(reason).toHaveAttribute('title',raw);
  });
  test('TDASH-075 persisted shipment receipt maps source reference to business-facing reason', async ({ page }) => {
    const raw='SHP–ABC2'; // Unicode dash supported by the source reference recognizer.
    await b179Get(page,'/dashboard/recent-activity?limit=10',[b179Activity('receipt',{
      movement_kind:'receipt',movement_type:'shipment_receive',shipment_id:'pw-b179-shipment',reason:raw})]);
    const reason=b179ActivityCard(page,'PW Movement receipt').locator('.dashboard-activity-card__details b[title]');
    await expect(reason).toHaveText('Shipment received');
    await expect(reason).toHaveAttribute('title',raw);
  });
  test('TDASH-076 unclassified legacy movement cannot be reclassified from a receipt-shaped reason', async ({ page }) => {
    const raw='shipment_receive:SHP-LEGACY';
    await b179Get(page,'/dashboard/recent-activity?limit=10',[b179Activity('unproven',{
      movement_kind:'unclassified',movement_type:'shipment_receive',reason:raw})]);
    const record=b179ActivityCard(page,'PW Movement unproven');
    await expect(record).toContainText('Unproven legacy movement');
    await expect(record.locator('.dashboard-activity-card__details b[title]')).toHaveText('Unclassified legacy movement — review source record');
    await expect(record.locator('.dashboard-activity-card__details b[title]')).toHaveAttribute('title',raw);
  });
  test('TDASH-077 stock transfer evidence is presented as a business event rather than an audit key', async ({ page }) => {
    const raw='stock_transfer_out:PW-TRANSFER-22';
    await b179Get(page,'/dashboard/recent-activity?limit=10',[b179Activity('transfer',{reason:raw})]);
    const reason=b179ActivityCard(page,'PW Movement transfer').locator('.dashboard-activity-card__details b[title]');
    await expect(reason).toHaveText('Stock transfer');
    await expect(reason).toHaveAttribute('title',raw);
  });
  test('TDASH-078 outbound dispatch reason exposes order reference without leaking the audit-key prefix', async ({ page }) => {
    const raw='outbound_dispatch:PW-ORD-42';
    await b179Get(page,'/dashboard/recent-activity?limit=10',[b179Activity('dispatch',{reason:raw})]);
    const reason=b179ActivityCard(page,'PW Movement dispatch').locator('.dashboard-activity-card__details b[title]');
    await expect(reason).toHaveText('Order PW-ORD-42');
    await expect(reason).toHaveAttribute('title',raw);
  });
});
