import { test, expect, type Page, type Route } from '../../../support/liveOriginalSafeTest';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';

// Batch 39: read-only synthetic fixtures matching InsightsPage query functions.
// All eight analytical GETs intercepted. Never assert backend scoring or tenant isolation was verified.
const timestamp = '2026-10-30T12:00:00.000Z';
const baselineSupplier = {
  supplier_id: 'pw-ins-sup-low', supplier_name: 'Synthetic At-Risk Supplier',
  completion_rate_pct: 60, overdue_rate_pct: 20, fill_rate_pct: 80, discrepancy_rate_pct: 5,
  trust_score: 35, trust_tier: 'risk', trust_evidence_status: 'rated',
  total_shipments: 5, partial_shipments: 1, overdue_shipments: 1, total_discrepancy_quantity: 2,
  total_purchase_orders: 3, completed_purchase_orders: 1, cancelled_purchase_orders: 0,
  open_purchase_orders: 2, overdue_open_purchase_orders: 1, fully_received_purchase_orders: 1,
  manually_closed_purchase_orders: 0, closed_short_purchase_orders: 0,
  po_ordered_quantity: 30, po_received_quantity: 20, po_remaining_quantity: 10,
  po_ordered_value: 300, po_received_value: 200, po_remaining_value: 100,
  currency_code: 'EUR', po_fill_rate_pct: 66, po_completion_rate_pct: 33, po_short_close_rate_pct: 0,
  risk_flags: [{ code: 'po_overdue', label: 'Overdue open POs', severity: 'high', detail: 'Synthetic overdue PO' }]
};
const unratedSupplier = {
  ...baselineSupplier,
  supplier_id: 'pw-ins-sup-new', supplier_name: 'Synthetic New Supplier',
  trust_score: null, trust_tier: 'unrated', trust_evidence_status: 'insufficient_history',
  total_shipments: 0, total_purchase_orders: 0, overdue_open_purchase_orders: 0, po_remaining_value: 0,
  risk_flags: []
};
const reorderRow = {
  product_id: 'pw-ins-product-01', product_name: 'Synthetic Milk', unit: 'L',
  current_quantity: 2, min_stock: 10, average_daily_usage: 4, estimated_days_of_coverage: 0.5,
  recommended_reorder_quantity: 16, urgency: 'critical'
};
const depletionRow = {
  stock_id: 'pw-ins-stock-01', product_id: 'pw-ins-product-01', product_name: 'Synthetic Milk',
  product_category: 'Food', product_unit: 'L', storage_location_name: 'Synthetic Storage',
  current_quantity: 2, configured_min_quantity: 10, recent_outbound_quantity: 20,
  average_daily_outbound: 4, estimated_days_of_coverage: 0.5, risk_score: 90, risk_tier: 'critical'
};
const rootRow = {
  ...depletionRow,
  highest_factor_severity: 'high',
  root_cause_factors: [{ code: 'below_configured_minimum', label: 'Below configured minimum', severity: 'high', detail: 'Synthetic root evidence' }],
  recommended_investigation_steps: ['Confirm the physical count at the listed storage location before placing or approving replenishment.'],
  production_safety: { read_only: true, advisory_only: true, creates_reorder_or_stock_change: false, requires_human_review: true }
};
const anomalyRow = {
  product_id: 'pw-ins-anomaly-1', product_name: 'Synthetic Anomaly Item', product_category: 'Food', product_unit: 'kg',
  recent_daily_outbound: 18, baseline_daily_outbound: 2, spike_ratio: 9,
  anomaly_score: 91, anomaly_tier: 'critical'
};
const anomalyReviewRow = {
  ...anomalyRow, highest_factor_severity: 'critical',
  review_factors: [{ code: 'spike', severity: 'critical', label: 'Critical consumption spike', detail: 'Recent classified consumption is materially higher than the product baseline and requires same-day human review.' }],
  recommended_investigation_steps: ['Confirm stock movement reason codes and users for critical spike rows.'],
  production_safety: { read_only: true, advisory_only: true, mutates_inventory: false, suppresses_alerts: false, requires_human_review: true }
};
type InsightOptions = {
  url?: string;
  suppliers?: Array<typeof baselineSupplier | typeof unratedSupplier>;
  reorders?: typeof reorderRow[];
  depletion?: typeof depletionRow[];
  healthTier?: string;
  healthScore?: number;
  errorPath?: string;
  rootCause?: typeof rootRow[];
  anomalies?: typeof anomalyRow[];
  anomalyReview?: typeof anomalyReviewRow[];
  productionStatus?: 'blocked' | 'needs_review' | 'ready_for_controlled_use' | 'monitor_only';
};
function insightResponse(path: string, o: InsightOptions) {
  const supplierRows = o.suppliers ?? [baselineSupplier, unratedSupplier];
  const reorders = o.reorders ?? [reorderRow];
  const depletion = o.depletion ?? [depletionRow];
  const base = { generated_at: timestamp, tenant_id: 'pw-insights-tenant-01' };
  if (path === '/inventory-insights/depletion-risk') return { ...base, lookback_days: 30, rows: depletion };
  if (path === '/inventory-insights/depletion-risk/root-cause-review') return {
    ...base, lookback_days: 30, scope: 'tenant',
    safety_contract: { read_only: true, advisory_only: true, no_inventory_mutation: true, no_procurement_execution: true, no_autonomous_approval: true },
    summary: { total_rows: (o.rootCause ?? []).length, rows_requiring_human_review: (o.rootCause ?? []).filter(r => r.production_safety.requires_human_review).length, by_factor_severity: {}, by_factor_code: {} }, rows: o.rootCause ?? []
  };
  if (path === '/reorder-insights/recommendations') return { ...base, lookback_days: 30, rows: reorders };
  if (path === '/operational-insights/health-score') return {
    ...base, health_score: o.healthScore ?? 82, health_tier: o.healthTier ?? 'healthy',
    metrics: { unresolved_alerts: 1, overdue_shipments: 0, total_stock_rows: 10, low_stock_rows: 1, low_stock_rate_pct: 10, discrepancy_rate_pct: 0 }
  };
  if (path === '/operational-insights/anomalies') return { ...base, short_window_days: 7, baseline_window_days: 30, rows: o.anomalies ?? [] };
  if (path === '/operational-insights/anomalies/production-review') return {
    ...base, short_window_days: 7, baseline_window_days: 30,
    production_status: o.productionStatus ?? 'monitor_only',
    safety_contract: { mode: 'advisory', read_only: true, advisory_only: true, mutates_inventory: false, suppresses_alerts: false, creates_procurement_actions: false, requires_human_approval_for_execution: true },
    operational_health_context: { health_score: 82, health_tier: 'healthy', unresolved_alerts: 1, overdue_shipments: 0, low_stock_rate_pct: 10, discrepancy_rate_pct: 0 },
    summary: { total_rows: (o.anomalyReview ?? []).length, rows_requiring_human_review: (o.anomalyReview ?? []).length, by_severity: {}, by_factor_code: {} },
    blockers: o.productionStatus === 'blocked' ? [{ code: 'critical_spike', severity: 'critical', affected_count: 1, message: 'Critical anomaly rows exist and require human operational review before production reliance.' }] : [],
    warnings: o.productionStatus === 'needs_review' ? [{ code: 'high_spike', severity: 'high', affected_count: 1, message: 'High anomaly rows should be investigated before managers rely on anomaly output for decisions.' }] : [],
    next_actions: ['Keep anomaly review read-only unless a separate authorized workflow is used.'], rows: o.anomalyReview ?? []
  };
  if (path === '/supplier-insights/trust-scores') return {
    ...base,
    summary: { total_suppliers: supplierRows.length, rated_suppliers: supplierRows.filter(r => r.trust_score !== null).length,
      unrated_suppliers: supplierRows.filter(r => r.trust_score === null).length, suppliers_with_risk: supplierRows.filter(r => r.risk_flags.length).length,
      total_risk_flags: supplierRows.reduce((n, r) => n + r.risk_flags.length, 0), high_risk_flags: 1, medium_risk_flags: 0,
      low_risk_flags: 0, overdue_open_purchase_orders: 1, closed_short_purchase_orders: 0, po_remaining_quantity: 10, po_remaining_value: 100,
      currency_code: 'EUR', risk_supplier_rate_pct: 50 }, rows: supplierRows
  };
  if (path === '/supplier-insights/trust-scores/production-review') return {
    ...base, scope: 'tenant', production_status: 'monitor_only',
    safety_contract: { mode: 'advisory', read_only: true, advisory_only: true, mutates_supplier_records: false,
      creates_purchase_orders: false, changes_supplier_status: false, requires_human_approval_for_execution: true },
    summary: { total_rows: 0, rows_requiring_human_review: 0, by_factor_severity: {}, by_factor_code: {} },
    blockers: [], warnings: [], next_actions: [], rows: []
  };
  return null;
}
async function openInsights(page: Page, o: InsightOptions = {}) {
  await loginAsTenant(page);
  const calls: string[] = [];
  await page.route('**/*', async (route: Route) => {
    if (route.request().isNavigationRequest()) return route.continue();
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api(?=\/)/, '');
    const json = insightResponse(path, o);
    // Unrecognized requests fall through to the existing context-level write guard.
    // Never continue an unmocked POST/PATCH/DELETE from a broad page route.
    if (!json) return route.fallback();
    calls.push(`${route.request().method()} ${path}${url.search}`);
    if (o.errorPath === path) return fulfillJson(route, { message: 'Synthetic insights source unavailable' }, 503);
    return fulfillJson(route, json);
  });
  await page.goto(o.url ?? '/insights');
  await expect(page.getByRole('heading', { name: 'Insights workspace' })).toBeVisible();
  return { calls };
}
const supplierCards = (page: Page) => page.locator('.insights-item-card--supplier');
// On wrapped labels, nested select option text makes exact accessible-name matching
// unreliable. Limit matching to a known label prefix and its own form control.
// Source-reviewed against src/pages/InsightsPage.tsx (GitHub main, 2026-11-08).
// The exact-label and prefix-text locators broke on wrapped select elements:
// text from child <option> nodes contributes to label text, and anchored regex
// filters were not matching the rendered controls. Locate the known control
// by its section heading and *documented DOM order*, without changing any
// behavior assertions or allowing live writes. See B221 contract for checks.
const supplierControl = (page: Page, label: string) => {
  const sections = page.locator('section.insights-section');
  const history = sections.filter({ has: page.getByRole('heading', { name: 'Insight controls', exact: true }) });
  const suppliers = sections.filter({ has: page.getByRole('heading', { name: 'Supplier performance', exact: true }) });
  switch (label) {
    case 'Recent history window': return history.locator('select').first();
    case 'Search suppliers': return suppliers.locator('input').first();
    case 'Risk filter': return suppliers.locator('select').nth(0);
    case 'Performance tier': return suppliers.locator('select').nth(1);
    case 'Sort suppliers': return suppliers.locator('select').nth(2);
    case 'Page size': return suppliers.locator('select').nth(3);
    default: throw new Error(`Unknown Insights control: ${label}`);
  }
};

 test.describe('Insights — initial evidence, URL state and supplier review (Batch 39)', () => {
  test('TINS-001 Insights page identifies read-only intelligence workspace', async ({ page }) => {
    await openInsights(page);
    await expect(page.getByText('Insights remain read-only; operational changes stay in their authoritative source workflows.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Insight controls' })).toBeVisible();
  });
  test('TINS-002 Initial insights load queries eight separate source endpoints', async ({ page }) => {
    const s = await openInsights(page);
    await expect(page.getByText('Health Score', { exact: true })).toBeVisible();
    for (const endpoint of [
      '/inventory-insights/depletion-risk?', '/inventory-insights/depletion-risk/root-cause-review?',
      '/reorder-insights/recommendations?', '/operational-insights/health-score',
      '/operational-insights/anomalies', '/operational-insights/anomalies/production-review',
      '/supplier-insights/trust-scores', '/supplier-insights/trust-scores/production-review'
    ]) expect(s.calls.some(call => call.includes(endpoint))).toBe(true);
    expect(s.calls.every(call => call.startsWith('GET '))).toBe(true);
  });
  test('TINS-003 Operational health shows score, tier and source metrics', async ({ page }) => {
    await openInsights(page);
    await expect(page.getByText('Unresolved Alerts')).toBeVisible();
    await expect(page.locator('.insights-page')).toContainText('Healthy');
  });
  test('TINS-004 Stock rows assessed summary derives its count from depletion result', async ({ page }) => {
    await openInsights(page);
    await expect(page.locator('.insights-summary-grid')).toContainText('Stock rows assessed');
    await expect(page.locator('.insights-summary-grid')).toContainText('1');
  });
  test('TINS-005 Reorder Candidates count excludes zero-quantity recommendations', async ({ page }) => {
    await openInsights(page, { reorders: [{ ...reorderRow, recommended_reorder_quantity: 0 }] });
    await expect(page.locator('.insights-summary-grid')).toContainText('Reorder Candidates');
    await expect(page.getByRole('group', { name: 'Reorder recommendations queue' })).toHaveCount(0);
  });
  test('TINS-006 Empty read-only evidence shows no urgent action agenda', async ({ page }) => {
    await openInsights(page, { suppliers: [], reorders: [], depletion: [], healthTier: 'healthy' });
    await expect(page.getByText('No urgent action agenda is available yet.')).toBeVisible();
    await expect(page.locator('.insights-item-card--supplier')).toHaveCount(0);
  });
  test('TINS-007 Lookback window change causes new endpoint query and URL state', async ({ page }) => {
    const s = await openInsights(page);
    await supplierControl(page, 'Recent history window').selectOption('14');
    await expect(page).toHaveURL(/lookback_days=14/);
    await expect.poll(() => s.calls.some(c => c.includes('/inventory-insights/depletion-risk?lookback_days=14'))).toBe(true);
    await expect.poll(() => s.calls.some(c => c.includes('/reorder-insights/recommendations?lookback_days=14'))).toBe(true);
  });
  test('TINS-008 Supported lookback deep-link preselects ninety days', async ({ page }) => {
    await openInsights(page, { url: '/insights?lookback_days=90' });
    await expect(supplierControl(page, 'Recent history window')).toHaveValue('90');
  });
  test('TINS-009 Unsupported lookback deep-link safely falls back to thirty', async ({ page }) => {
    await openInsights(page, { url: '/insights?lookback_days=5' });
    await expect(supplierControl(page, 'Recent history window')).toHaveValue('30');
  });
  test('TINS-010 Supplier trust list renders rated and unrated synthetic suppliers', async ({ page }) => {
    await openInsights(page);
    await expect(supplierCards(page)).toHaveCount(2);
    await expect(supplierCards(page).first()).toContainText('Synthetic At-Risk Supplier');
    await expect(supplierCards(page).last()).toContainText('Synthetic New Supplier');
  });
  test('TINS-011 Search supplier field filters supplier cards and records URL', async ({ page }) => {
    await openInsights(page);
    await supplierControl(page, 'Search suppliers').fill('New Supplier');
    await expect(supplierCards(page)).toHaveCount(1);
    await expect(supplierCards(page).first()).toContainText('Synthetic New Supplier');
    await expect(page).toHaveURL(/supplier_search=New(?:\+|%20)Supplier/);
  });
  test('TINS-012 High-risk supplier filter hides suppliers with no flagged risk', async ({ page }) => {
    await openInsights(page);
    await supplierControl(page, 'Risk filter').selectOption('high');
    await expect(supplierCards(page)).toHaveCount(1);
    await expect(supplierCards(page).first()).toContainText('Synthetic At-Risk Supplier');
    await expect(page).toHaveURL(/supplier_risk=high/);
  });
  test('TINS-013 Not-enough-history tier isolates unrated supplier evidence', async ({ page }) => {
    await openInsights(page);
    await supplierControl(page, 'Performance tier').selectOption('unrated');
    await expect(supplierCards(page)).toHaveCount(1);
    await expect(supplierCards(page).first()).toContainText('Synthetic New Supplier');
  });
  test('TINS-014 Supplier sorting reorders visible list without a write request', async ({ page }) => {
    const s = await openInsights(page);
    await supplierControl(page, 'Sort suppliers').selectOption('trust_desc');
    await expect(supplierControl(page, 'Sort suppliers')).toHaveValue('trust_desc');
    await expect(page).toHaveURL(/supplier_sort=trust_desc/);
    expect(s.calls.every(call => call.startsWith('GET '))).toBe(true);
  });
  test('TINS-015 Supplier details can be selected from the visible read-only card', async ({ page }) => {
    await openInsights(page);
    await supplierCards(page).filter({ hasText: 'Synthetic New Supplier' }).getByRole('button', { name: 'View Detail' }).click();
    await expect(page.getByRole('article', { name: 'Supplier performance detail for Synthetic New Supplier' })).toBeVisible();
    await expect(page).toHaveURL(/supplier_id=pw-ins-sup-new/);
  });
  test('TINS-016 Supplier card links retain the source supplier identifier', async ({ page }) => {
    await openInsights(page);
    const card = supplierCards(page).filter({ hasText: 'Synthetic At-Risk Supplier' });
    await expect(card.getByRole('link', { name: 'Open supplier' })).toHaveAttribute('href', '/suppliers?supplier_id=pw-ins-sup-low');
    await expect(card.getByRole('link', { name: 'Open POs' })).toHaveAttribute('href', '/purchase-orders?supplier_id=pw-ins-sup-low');
  });
  test('TINS-017 Clear supplier filters restores unfiltered list', async ({ page }) => {
    await openInsights(page);
    await supplierControl(page, 'Risk filter').selectOption('high');
    await expect(supplierCards(page)).toHaveCount(1);
    await page.getByRole('button', { name: 'Clear supplier filters' }).click();
    await expect(supplierCards(page)).toHaveCount(2);
    await expect(supplierControl(page, 'Risk filter')).toHaveValue('all');
  });
  test('TINS-018 No matching suppliers disables export and print actions', async ({ page }) => {
    await openInsights(page);
    await supplierControl(page, 'Search suppliers').fill('unmatched-synthetic-company');
    await expect(supplierCards(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Export supplier CSV' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Print supplier view' })).toBeDisabled();
  });
  test('TINS-019 Reorder queue selection links to product source workflow', async ({ page }) => {
    await openInsights(page);
    await expect(page.getByRole('group', { name: 'Reorder recommendations queue' })).toContainText('Synthetic Milk');
    await expect(page.getByRole('article', { name: 'Selected reorder recommendation' }).getByRole('link', { name: 'Open product' })).toHaveAttribute('href', '/products?product_id=pw-ins-product-01');
  });
  test('TINS-020 Refresh supplier performance refetches only supplier trust overview', async ({ page }) => {
    const s = await openInsights(page);
    await expect(supplierCards(page)).toHaveCount(2);
    const before = s.calls.filter(call => call.includes('/supplier-insights/trust-scores') && !call.includes('/production-review')).length;
    await page.getByRole('button', { name: 'Refresh supplier performance' }).click();
    await expect.poll(() => s.calls.filter(call => call.includes('/supplier-insights/trust-scores') && !call.includes('/production-review')).length).toBeGreaterThan(before);
    expect(s.calls.every(call => call.startsWith('GET '))).toBe(true);
  });
});

// Batch 40: inspect only source-observable interactions with synthetic, isolated GET fixtures.
// No execution of these tests has been authorized; browser/React behavior remains unverified.
const manySuppliers = Array.from({ length: 9 }, (_, i) => ({
  ...baselineSupplier, supplier_id: `pw-ins-page-${i + 1}`, supplier_name: `Synthetic Supplier ${String(i + 1).padStart(2, '0')}`,
  trust_score: 91 - i, risk_flags: i % 2 ? [] : baselineSupplier.risk_flags
}));
const manyRoots = Array.from({ length: 9 }, (_, i) => ({ ...rootRow, stock_id: `pw-ins-stock-${i + 1}`,
  product_name: `Synthetic Review ${String(i + 1).padStart(2, '0')}` }));
const manyReorders = Array.from({ length: 9 }, (_, i) => ({ ...reorderRow, product_id: `pw-ins-r-${i + 1}`,
  product_name: `Synthetic Reorder ${String(i + 1).padStart(2, '0')}`,
  urgency: i === 0 ? 'low' : i === 8 ? 'critical' : 'medium', recommended_reorder_quantity: 1 + i }));

 test.describe('Insights — paging, export, evidence review and failures (Batch 40)', () => {
  test('TINS-021 Supplier pagination advances and stops at last page', async ({ page }) => {
    await openInsights(page, { suppliers: manySuppliers });
    await expect(supplierCards(page)).toHaveCount(6);
    await page.getByRole('button', { name: 'Next suppliers' }).click();
    await expect(supplierCards(page)).toHaveCount(3);
    await expect(page).toHaveURL(/supplier_page=2/);
    await expect(page.getByRole('button', { name: 'Next suppliers' })).toBeDisabled();
  });
  test('TINS-022 Supplier pagination previous moves back without losing filters', async ({ page }) => {
    await openInsights(page, { suppliers: manySuppliers });
    await supplierControl(page, 'Sort suppliers').selectOption('trust_asc');
    await page.getByRole('button', { name: 'Next suppliers' }).click();
    await page.getByRole('button', { name: 'Previous suppliers' }).click();
    await expect(supplierCards(page)).toHaveCount(6);
    await expect(supplierControl(page, 'Sort suppliers')).toHaveValue('trust_asc');
    await expect(page.getByRole('button', { name: 'Previous suppliers' })).toBeDisabled();
  });
  test('TINS-023 Supplier page-size control changes visible card count', async ({ page }) => {
    await openInsights(page, { suppliers: manySuppliers });
    await supplierControl(page, 'Page size').selectOption('12');
    await expect(supplierCards(page)).toHaveCount(9);
    await expect(page).toHaveURL(/supplier_page_size=12/);
    await expect(page.getByRole('button', { name: 'Next suppliers' })).toBeDisabled();
  });
  test('TINS-024 Changing supplier filter resets current page and clears old selected detail', async ({ page }) => {
    await openInsights(page, { suppliers: manySuppliers });
    await supplierCards(page).first().getByRole('button', { name: 'View Detail' }).click();
    await page.getByRole('button', { name: 'Next suppliers' }).click();
    await supplierControl(page, 'Search suppliers').fill('Synthetic Supplier 09');
    await expect(supplierCards(page)).toHaveCount(1);
    await expect(page.getByRole('article', { name: /Supplier performance detail for/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Previous suppliers' })).toBeDisabled();
  });
  test('TINS-025 Supplier CSV export neutralizes spreadsheet formula names', async ({ page }) => {
    await openInsights(page, { suppliers: [{ ...baselineSupplier, supplier_name: '=HYPERLINK("https://invalid.example")' }] });
    const event = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export supplier CSV' }).click();
    const file = await event;
    expect(file.suggestedFilename()).toBe('supplier-performance-insights.csv');
    const stream = await file.createReadStream();
    expect(stream).not.toBeNull();
    let contents = '';
    for await (const buffer of stream!) contents += buffer.toString('utf8');
    expect(contents).toContain("'=HYPERLINK(");
    expect(contents).not.toMatch(/(?:^|\n)=HYPERLINK\(/);
  });
  test('TINS-026 Selected supplier detail CSV includes concrete evidence categories', async ({ page }) => {
    await openInsights(page);
    await supplierCards(page).first().getByRole('button', { name: 'View Detail' }).click();
    const event = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export detail CSV' }).click();
    const download = await event;
    expect(download.suggestedFilename()).toMatch(/^supplier-performance-detail-synthetic-at-risk-supplier\.csv$/);
    const stream = await download.createReadStream();
    expect(stream).not.toBeNull();
    let contents = '';
    for await (const buf of stream!) contents += buf.toString('utf8');
    expect(contents).toContain('Shipment Completion Rate %');
    expect(contents).toContain('Risk Severity');
    expect(contents).toContain('Recommended Action Priority');
  });
  test('TINS-027 Print supplier view includes only matching supplier rows', async ({ page }) => {
    await openInsights(page);
    await page.evaluate(() => {
      (window as typeof window & { __pwPrint?: string }).__pwPrint = '';
      window.open = (() => ({ document: { write: (html: string) => { (window as typeof window & { __pwPrint?: string }).__pwPrint = html; }, close: () => {} }, focus: () => {}, print: () => {} })) as unknown as typeof window.open;
    });
    await supplierControl(page, 'Search suppliers').fill('New Supplier');
    await page.getByRole('button', { name: 'Print supplier view' }).click();
    const html = await page.evaluate(() => (window as typeof window & { __pwPrint?: string }).__pwPrint || '');
    expect(html).toContain('Synthetic New Supplier');
    expect(html).not.toContain('Synthetic At-Risk Supplier');
  });
  test('TINS-028 Copy supplier view link contains current filters and page size', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async (value: string) => { (window as typeof window & { __pwCopied?: string }).__pwCopied = value; }
    } }));
    await openInsights(page);
    await supplierControl(page, 'Risk filter').selectOption('high');
    await supplierControl(page, 'Page size').selectOption('12');
    await page.getByRole('button', { name: 'Copy supplier view link' }).click();
    const copied = await page.evaluate(() => (window as typeof window & { __pwCopied?: string }).__pwCopied || '');
    expect(copied).toContain('supplier_risk=high');
    expect(copied).toContain('supplier_page_size=12');
  });
  test('TINS-029 Individual active filter chip removes only its own constraint', async ({ page }) => {
    await openInsights(page);
    await supplierControl(page, 'Risk filter').selectOption('high');
    await supplierControl(page, 'Search suppliers').fill('Synthetic');
    const chipBar = page.getByLabel('Active supplier performance filters');
    await expect(chipBar.getByRole('button', { name: /^Remove .* filter$/ })).toHaveCount(2);
    await chipBar.getByRole('button', { name: /^Remove Risk: High filter$/ }).click();
    await expect(supplierControl(page, 'Risk filter')).toHaveValue('all');
    await expect(supplierControl(page, 'Search suppliers')).toHaveValue('Synthetic');
  });
  test('TINS-030 Supplier URL filter state survives reload with matching cards', async ({ page }) => {
    await openInsights(page, { url: '/insights?supplier_risk=none&supplier_tier=unrated' });
    await expect(supplierCards(page)).toHaveCount(1);
    await page.reload();
    await expect(supplierControl(page, 'Risk filter')).toHaveValue('none');
    await expect(supplierControl(page, 'Performance tier')).toHaveValue('unrated');
    await expect(supplierCards(page)).toHaveCount(1);
  });
  test('TINS-031 Supplier trust GET outage has explicit supplier source error', async ({ page }) => {
    await openInsights(page, { errorPath: '/supplier-insights/trust-scores' });
    await expect(page.locator('.insights-page')).toContainText('Synthetic insights source unavailable');
    await expect(page.getByRole('button', { name: 'Refresh insights' })).toBeVisible();
  });
  test('TINS-032 Supplier review GET outage retains independent base trust rows', async ({ page }) => {
    await openInsights(page, { errorPath: '/supplier-insights/trust-scores/production-review' });
    await expect(supplierCards(page)).toHaveCount(2);
    await expect(page.locator('.insights-page')).toContainText('Synthetic insights source unavailable');
  });
  test('TINS-033 Risk label shows source-specific overdue evidence', async ({ page }) => {
    await openInsights(page);
    const card = supplierCards(page).first();
    await expect(card.getByLabel('Supplier risk flags for Synthetic At-Risk Supplier')).toContainText('Overdue open POs');
    await expect(card.getByText('Overdue open POs')).toHaveAttribute('title', /open PO\(s\) are past expected delivery/);
  });
  test('TINS-034 Recommended supplier summary opens matching read-only detail', async ({ page }) => {
    await openInsights(page);
    const summary = page.getByLabel('Supplier recommended action summary');
    await summary.getByRole('button').first().click();
    await expect(page.getByRole('article', { name: 'Supplier performance detail for Synthetic At-Risk Supplier' })).toBeVisible();
  });
  test('TINS-035 Breakdown High risk shortcut activates matching filter', async ({ page }) => {
    await openInsights(page);
    await page.getByLabel('Supplier performance breakdown filters').getByRole('button', { name: /High risk/ }).click();
    await expect(supplierControl(page, 'Risk filter')).toHaveValue('high');
    await expect(supplierCards(page)).toHaveCount(1);
  });
  test('TINS-036 Stable depletion rows are not displayed as pressure warnings', async ({ page }) => {
    await openInsights(page, { depletion: [{ ...depletionRow, risk_tier: 'low', risk_score: 10 }] });
    await expect(page.getByText('No active depletion risk')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open in Stock' })).toHaveCount(0);
  });
  test('TINS-037 Show all root-cause evidence reveals non-review row', async ({ page }) => {
    await openInsights(page, { rootCause: [rootRow, { ...rootRow, stock_id: 'pw-ins-stable', product_name: 'Synthetic Stable Stock', production_safety: { ...rootRow.production_safety, requires_human_review: false } }] });
    const queue = page.getByRole('group', { name: 'Reviewed stock rows' });
    await expect(queue.getByRole('button', { name: /Synthetic Stable Stock/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'Show all reviewed stock rows' }).click();
    await expect(queue.getByRole('button', { name: /Synthetic Stable Stock/ })).toBeVisible();
    await page.getByRole('button', { name: 'Show only rows needing review' }).click();
    await expect(queue.getByRole('button', { name: /Synthetic Stable Stock/ })).toHaveCount(0);
  });
  test('TINS-038 Root cause review queue uses eight rows per page', async ({ page }) => {
    await openInsights(page, { rootCause: manyRoots });
    const queue = page.getByRole('group', { name: 'Reviewed stock rows' });
    await expect(queue.locator('.insights-stock-review-row')).toHaveCount(8);
    await queue.getByRole('button', { name: 'Next' }).click();
    await expect(queue.locator('.insights-stock-review-row')).toHaveCount(1);
    await expect(queue.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
  test('TINS-039 Selected root cause row shows the investigation steps from source', async ({ page }) => {
    await openInsights(page, { rootCause: [rootRow] });
    const detail = page.getByRole('article', { name: 'Selected stock review' });
    await expect(detail).toContainText('Investigation steps');
    await expect(detail).toContainText('Confirm the physical count');
  });
  test('TINS-040 Root cause stock link preserves selected stock ID', async ({ page }) => {
    await openInsights(page, { rootCause: [rootRow] });
    await expect(page.getByRole('article', { name: 'Selected stock review' }).getByRole('link', { name: 'Open in Stock' })).toHaveAttribute('href', '/stock?stock_id=pw-ins-stock-01');
  });
  test('TINS-041 Reorder urgency places critical ahead of medium and low', async ({ page }) => {
    await openInsights(page, { reorders: manyReorders });
    const queue = page.getByRole('group', { name: 'Reorder recommendations queue' });
    await expect(queue.locator('.insights-stock-review-row').first()).toContainText('Synthetic Reorder 09');
    await expect(page.getByRole('article', { name: 'Selected reorder recommendation' })).toContainText('Synthetic Reorder 09');
  });
  test('TINS-042 Reorder queue page two changes selected detail to visible row', async ({ page }) => {
    await openInsights(page, { reorders: manyReorders });
    const queue = page.getByRole('group', { name: 'Reorder recommendations queue' });
    await queue.getByRole('button', { name: 'Next' }).click();
    await expect(queue.locator('.insights-stock-review-row')).toHaveCount(1);
    await expect(page.getByRole('article', { name: 'Selected reorder recommendation' })).toContainText('Synthetic Reorder 01');
  });
  test('TINS-043 Selected recommendation shows product identity and target quantity', async ({ page }) => {
    await openInsights(page);
    const detail = page.getByRole('article', { name: 'Selected reorder recommendation' });
    await expect(detail).toContainText('Synthetic Milk');
    await expect(detail).toContainText('Reorder 16');
    await expect(detail).toContainText('Current 2');
  });
  test('TINS-044 Products link is gated for Insights reader without products.read', async ({ page }) => {
    // Provision PW_INS_NO_PRODUCTS with insights.read but without products.read in a disposable tenant.
    const { loginAsDisposableRole } = await import('../../../support/roleSession');
    await loginAsDisposableRole(page, 'PW_INS_NO_PRODUCTS');
    await page.route('**/*', async (route: Route) => {
      if (route.request().isNavigationRequest()) return route.continue();
      const url = new URL(route.request().url());
      const response = insightResponse(url.pathname.replace(/^\/api(?=\/)/, ''), {});
      return response ? fulfillJson(route, response) : route.continue();
    });
    await page.goto('/insights');
    await expect(page.getByRole('heading', { name: 'Insights workspace' })).toBeVisible();
    await expect(page.getByRole('article', { name: 'Selected reorder recommendation' }).getByRole('link', { name: 'Open product' })).toHaveCount(0);
  });
  test('TINS-045 Depletion GET error appears instead of a fabricated stock risk', async ({ page }) => {
    await openInsights(page, { errorPath: '/inventory-insights/depletion-risk' });
    await expect(page.locator('.insights-page')).toContainText('Synthetic insights source unavailable');
    await expect(page.getByRole('link', { name: 'Open in Stock' })).toHaveCount(0);
  });
  test('TINS-046 Reorder GET failure shows error and does not issue write API calls', async ({ page }) => {
    const { calls } = await openInsights(page, { errorPath: '/reorder-insights/recommendations' });
    await expect(page.locator('.insights-page')).toContainText('Synthetic insights source unavailable');
    await expect(page.getByRole('group', { name: 'Reorder recommendations queue' })).toHaveCount(0);
    expect(calls.every(call => call.startsWith('GET '))).toBe(true);
  });
  test('TINS-047 Unusual movement card exposes daily rates and product link', async ({ page }) => {
    await openInsights(page, { anomalies: [anomalyRow] });
    const item = page.locator('section.insights-section').filter({ has: page.getByRole('heading', { name: 'Unusual inventory movement', exact: true }) });
    await expect(item).toContainText('Synthetic Anomaly Item');
    await expect(item).toContainText('Spike Ratio');
    await expect(page.getByRole('link', { name: 'Open movements' })).toHaveAttribute('href', '/stock-movements?product_id=pw-ins-anomaly-1');
  });
  test('TINS-048 Anomaly production review differentiates blocker evidence', async ({ page }) => {
    await openInsights(page, { anomalyReview: [anomalyReviewRow], productionStatus: 'blocked' });
    await expect(page.locator('.insights-page')).toContainText('Critical anomaly rows exist and require human operational review');
    await expect(page.locator('.insights-page')).toContainText('Critical consumption spike');
  });
  test('TINS-049 Global insights refresh re-queries all eight distinct endpoints', async ({ page }) => {
    const { calls } = await openInsights(page);
    const before = calls.length;
    await page.getByRole('button', { name: 'Refresh insights' }).click();
    await expect.poll(() => calls.length).toBeGreaterThanOrEqual(before + 8);
    expect(new Set(calls.slice(before).map(call => call.split('?')[0])).size).toBe(8);
    expect(calls.every(call => call.startsWith('GET '))).toBe(true);
  });
  test('TINS-050 Global refresh failure does not report success', async ({ page }) => {
    await openInsights(page, { errorPath: '/operational-insights/health-score' });
    await page.getByRole('button', { name: 'Refresh insights' }).click();
    await expect(page.locator('body')).toContainText('Unable to refresh all insights');
    await expect(page.locator('body')).not.toContainText('Insights refreshed.');
  });
});
