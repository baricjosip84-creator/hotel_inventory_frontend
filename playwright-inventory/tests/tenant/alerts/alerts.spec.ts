import { test, expect, type Page } from '../../../support/liveOriginalSafeTest';
import { fulfillJson, loginAsTenant } from '../../../support/tenantSession';

// Batch 5 — GENERATED_UNRUN. Source: frontend/src/pages/AlertsPage.tsx,
// frontend/src/lib/{alertQueueIntegrity,alertPresentation,permissions}.ts,
// backend/src/routes/alerts.js and controllers/alertsController.js.
// All alerts, products and network outcomes below are disposable synthetic fixtures.
// All alert writes are blocked unless an individual test explicitly intercepts them.
// Runtime/browser/compilation validation is deliberately deferred to Phase 2.
const baseTime = '2026-10-12T12:00:00.000Z';
type SyntheticAlert = {
  id: string; tenant_id: string; type: string; message: string;
  resolved: boolean; created_at: string; severity: 'info'|'warning'|'critical';
  escalation_level: number; acknowledged: boolean; product_id?: string | null;
  product_name?: string | null; stock_id?: string | null;
  resolved_at?: string | null; resolved_by_name?: string | null;
  resolution_note?: string | null; acknowledged_at?: string | null;
  acknowledged_by_name?: string | null; current_condition_status?: string | null;
  current_usable_quantity?: number | null; current_min_quantity?: number | null;
  current_shortage_quantity?: number | null; product_unit?: string | null;
  storage_location_name?: string | null;
};
const syntheticAlerts: SyntheticAlert[] = [
  { id:'pw-alert-manual', tenant_id:'pw-tenant', type:'Supplier delivery delay',
    message:'Synthetic supplier delivery follow-up', resolved:false, created_at:baseTime,
    severity:'warning', escalation_level:0, acknowledged:false },
  { id:'pw-alert-critical', tenant_id:'pw-tenant', type:'STOCK_LEDGER_DESYNC_BLOCKING',
    message:'Stock ledger mismatch detected at location R-01: stored 2, expected 5',
    resolved:false, created_at:baseTime, severity:'critical', escalation_level:1,
    acknowledged:false, product_id:'pw-product-01', product_name:'Synthetic Coffee', stock_id:'pw-stock-01' },
  { id:'pw-alert-low', tenant_id:'pw-tenant', type:'LOW_STOCK',
    message:'Stock below location minimum at "Shelf A"', resolved:false, created_at:baseTime,
    severity:'warning', escalation_level:0, acknowledged:false,
    product_id:'pw-product-01', product_name:'Synthetic Coffee',
    product_unit:'kg', stock_id:'pw-stock-01', storage_location_name:'Shelf A',
    current_condition_status:'active', current_usable_quantity:3, current_min_quantity:6,
    current_shortage_quantity:3 },
  { id:'pw-alert-shipment', tenant_id:'pw-tenant', type:'SHIPMENT_LATE',
    message:'Synthetic shipment awaiting receipt', resolved:false, created_at:baseTime,
    severity:'warning', escalation_level:1, acknowledged:true,
    acknowledged_by_name:'Synthetic Shift Manager', acknowledged_at:baseTime },
  { id:'pw-alert-resolved', tenant_id:'pw-tenant', type:'Internal audit follow-up',
    message:'Synthetic resolved operational item', resolved:true, created_at:baseTime,
    severity:'info', escalation_level:1, acknowledged:true, acknowledged_at:baseTime,
    resolved_at:baseTime, resolved_by_name:'Synthetic Quality Reviewer',
    resolution_note:'Synthetic investigation complete.' }
];
const alertCard = (page: Page, id: string) => page.locator(`#alert-${id}`);
const filtersPanel = (page: Page) => page.locator('section').filter({ has: page.getByRole('heading', { name: 'Filter the alert queue' }) }).first();
const statCard = (page: Page, label: string) => page.locator('.io-workspace-stat').filter({ has: page.locator('.io-workspace-stat__label').getByText(label, { exact: true }) });

function serverFilteredAlerts(url: URL, rows: SyntheticAlert[]) {
  const params = url.searchParams;
  return rows.filter(row => {
    const search = (params.get('search') || '').toLowerCase();
    if (search && ![row.type, row.message, row.product_name || ''].some(value => value.toLowerCase().includes(search))) return false;
    const resolved = params.get('resolved');
    if (resolved && row.resolved !== (resolved === 'true')) return false;
    const acknowledged = params.get('acknowledged');
    if (acknowledged && row.acknowledged !== (acknowledged === 'true')) return false;
    const severity = params.get('severity');
    if (severity && row.severity !== severity) return false;
    return true;
  }).slice(0, Number(params.get('limit') || 100));
}

// The frontend route /alerts also matches **/alerts; only XHR/fetch may receive JSON.
const isAlertApiGet = (route: import('@playwright/test').Route) =>
  route.request().method() === 'GET' && ['xhr', 'fetch'].includes(route.request().resourceType());
async function fixtureAlerts(page: Page, rows: SyntheticAlert[] = syntheticAlerts) {
  const list = (route: import('@playwright/test').Route) => isAlertApiGet(route)
    ? fulfillJson(route, serverFilteredAlerts(new URL(route.request().url()), rows)) : route.fallback();
  await page.route('**/alerts?*', list);
  await page.route('**/alerts', list);
  await page.route('**/alerts/*', route => {
    if (!isAlertApiGet(route)) return route.fallback();
    const id = new URL(route.request().url()).pathname.split('/').pop() || '';
    const record = rows.find(row => row.id === decodeURIComponent(id));
    return record ? fulfillJson(route, record) : fulfillJson(route, { error: { message:'Synthetic alert not found' } }, 404);
  });
  await page.route('**/admin/alerts/*', route => route.abort());
  await page.route('**/products', route => isAlertApiGet(route)
    ? fulfillJson(route, [{ id:'pw-product-01', name:'Synthetic Coffee', category:'Beverages' }]) : route.fallback());
}
async function openAlertWorkspace(page: Page, url = '/alerts', rows: SyntheticAlert[] = syntheticAlerts) {
  await loginAsTenant(page);
  await fixtureAlerts(page, rows);
  await page.goto(url);
  await expect(page.getByRole('heading', { name:'Alert workspace' })).toBeVisible();
}
async function setAlertPermissions(page: Page, permissions: string[]) {
  const original = await page.evaluate(() => JSON.parse(localStorage.getItem('inventory_tenant_effective_permissions') || '{}'));
  await page.route('**/permissions/me', route => fulfillJson(route, { ...original, scope:'tenant', permissions }));
  await page.reload();
  await expect(page.getByRole('heading', { name:'Alert workspace' })).toBeVisible();
}

test.describe('Alerts — query, filtering, summary and navigation', () => {
  test.beforeEach(async ({ page }) => { await openAlertWorkspace(page); });

  test('TALERT-001 default queue lists open synthetic alerts, not resolved records', async ({ page }) => {
    await expect(page.getByRole('heading', { name:'Alert queue', exact:true })).toBeVisible();
    await expect(alertCard(page, 'pw-alert-manual')).toBeVisible();
    await expect(alertCard(page, 'pw-alert-critical')).toBeVisible();
    await expect(alertCard(page, 'pw-alert-resolved')).toHaveCount(0);
  });

  test('TALERT-002 summary derives visible, open, critical and unacknowledged counts from filtered records', async ({ page }) => {
    const summaries = page.locator('.io-workspace-stats');
    await expect(summaries.getByText('Visible results')).toBeVisible();
    await expect(summaries.getByText('Critical open')).toBeVisible();
    await expect(summaries.getByText('Unacknowledged open')).toBeVisible();
    await expect(statCard(page, 'Visible results').locator('.io-workspace-stat__value')).toHaveText('4');
    await expect(statCard(page, 'Open').locator('.io-workspace-stat__value')).toHaveText('4');
    await expect(statCard(page, 'Critical open').locator('.io-workspace-stat__value')).toHaveText('1');
    await expect(statCard(page, 'Unacknowledged open').locator('.io-workspace-stat__value')).toHaveText('3');
  });

  test('TALERT-003 default server list request includes resolved=false and limit=100', async ({ page }) => {
    let query: URL | undefined;
    await page.route('**/alerts?*', route => {
      query = new URL(route.request().url());
      return fulfillJson(route, serverFilteredAlerts(query, syntheticAlerts));
    });
    await page.reload();
    await expect(alertCard(page, 'pw-alert-manual')).toBeVisible();
    expect(query?.searchParams.get('resolved')).toBe('false');
    expect(query?.searchParams.get('limit')).toBe('100');
  });

  test('TALERT-004 Apply filters trims text and sends search in URL and API list', async ({ page }) => {
    await filtersPanel(page).getByRole('textbox', { name:'Search' }).fill('  supplier delivery  ');
    await filtersPanel(page).getByRole('button', { name:'Apply filters' }).click();
    await expect(page).toHaveURL(/search=supplier\+delivery/);
    await expect(alertCard(page, 'pw-alert-manual')).toBeVisible();
    await expect(alertCard(page, 'pw-alert-critical')).toHaveCount(0);
  });

  test('TALERT-005 severity filter limits results and persists selected value', async ({ page }) => {
    await filtersPanel(page).getByRole('combobox', { name:'Severity' }).selectOption('critical');
    await filtersPanel(page).getByRole('button', { name:'Apply filters' }).click();
    await expect(page).toHaveURL(/severity=critical/);
    await expect(alertCard(page, 'pw-alert-critical')).toBeVisible();
    await expect(alertCard(page, 'pw-alert-manual')).toHaveCount(0);
    await expect(filtersPanel(page).getByRole('combobox', { name:'Severity' })).toHaveValue('critical');
  });

  test('TALERT-006 resolved-only queue shows completed records and their resolution note', async ({ page }) => {
    await filtersPanel(page).getByRole('combobox', { name:'Resolution state' }).selectOption('true');
    await filtersPanel(page).getByRole('button', { name:'Apply filters' }).click();
    await expect(alertCard(page, 'pw-alert-resolved')).toBeVisible();
    await expect(alertCard(page, 'pw-alert-resolved').getByText('Synthetic investigation complete.')).toBeVisible();
    await expect(alertCard(page, 'pw-alert-manual')).toHaveCount(0);
  });

  test('TALERT-007 ownership filter sends acknowledged=true and only shows acknowledged open rows', async ({ page }) => {
    await filtersPanel(page).getByRole('combobox', { name:'Ownership state' }).selectOption('true');
    await filtersPanel(page).getByRole('button', { name:'Apply filters' }).click();
    await expect(page).toHaveURL(/acknowledged=true/);
    await expect(alertCard(page, 'pw-alert-shipment')).toBeVisible();
    await expect(alertCard(page, 'pw-alert-manual')).toHaveCount(0);
  });

  test('TALERT-008 selected page size changes API limit and URL without inventing pagination', async ({ page }) => {
    let sentLimit: string | null = null;
    await page.route('**/alerts?*', route => {
      sentLimit = new URL(route.request().url()).searchParams.get('limit');
      return fulfillJson(route, serverFilteredAlerts(new URL(route.request().url()), syntheticAlerts));
    });
    await filtersPanel(page).getByRole('combobox', { name:'Maximum results' }).selectOption('25');
    await filtersPanel(page).getByRole('button', { name:'Apply filters' }).click();
    await expect(page).toHaveURL(/limit=25/);
    await expect(alertCard(page, 'pw-alert-manual')).toBeVisible();
    expect(sentLimit).toBe('25');
  });

  test('TALERT-009 Clear filters restores default search/severity/ownership/open state', async ({ page }) => {
    await filtersPanel(page).getByRole('textbox', { name:'Search' }).fill('absent');
    await filtersPanel(page).getByRole('combobox', { name:'Severity' }).selectOption('critical');
    await filtersPanel(page).getByRole('button', { name:'Apply filters' }).click();
    await expect(page.getByText('No alerts match the applied filters.')).toBeVisible();
    await filtersPanel(page).getByRole('button', { name:'Clear filters' }).click();
    await expect(filtersPanel(page).getByRole('textbox', { name:'Search' })).toHaveValue('');
    await expect(filtersPanel(page).getByRole('combobox', { name:'Severity' })).toHaveValue('');
    await expect(filtersPanel(page).getByRole('combobox', { name:'Resolution state' })).toHaveValue('false');
    await expect(alertCard(page, 'pw-alert-manual')).toBeVisible();
  });

  test('TALERT-010 bookmarked alert query restores filter controls on initial load', async ({ page }) => {
    await page.goto('/alerts?severity=warning&acknowledged=false&resolved=false&limit=50&search=stock');
    await expect(filtersPanel(page).getByRole('combobox', { name:'Severity' })).toHaveValue('warning');
    await expect(filtersPanel(page).getByRole('combobox', { name:'Ownership state' })).toHaveValue('false');
    await expect(filtersPanel(page).getByRole('combobox', { name:'Maximum results' })).toHaveValue('50');
    await expect(filtersPanel(page).getByRole('textbox', { name:'Search' })).toHaveValue('stock');
  });

  test('TALERT-011 applied filters survive full reload via URL query', async ({ page }) => {
    await filtersPanel(page).getByRole('combobox', { name:'Severity' }).selectOption('critical');
    await filtersPanel(page).getByRole('button', { name:'Apply filters' }).click();
    await expect(alertCard(page, 'pw-alert-critical')).toBeVisible();
    await page.reload();
    await expect(filtersPanel(page).getByRole('combobox', { name:'Severity' })).toHaveValue('critical');
    await expect(alertCard(page, 'pw-alert-manual')).toHaveCount(0);
  });

  test('TALERT-012 invalid bookmarked option values normalize to safe defaults', async ({ page }) => {
    await page.goto('/alerts?severity=extreme&resolved=unknown&acknowledged=maybe&limit=999');
    await expect(filtersPanel(page).getByRole('combobox', { name:'Severity' })).toHaveValue('');
    await expect(filtersPanel(page).getByRole('combobox', { name:'Resolution state' })).toHaveValue('false');
    await expect(filtersPanel(page).getByRole('combobox', { name:'Ownership state' })).toHaveValue('');
    await expect(filtersPanel(page).getByRole('combobox', { name:'Maximum results' })).toHaveValue('100');
  });

  test('TALERT-013 empty API queue shows explicit empty state instead of guessed counts', async ({ page }) => {
    await page.route('**/alerts?*', route => fulfillJson(route, []));
    await page.reload();
    await expect(page.getByText('No alerts match the applied filters.')).toBeVisible();
    await expect(page.locator('#alerts-queue article')).toHaveCount(0);
  });

  test('TALERT-014 API read error shows retry; a succeeding retry restores queue', async ({ page }) => {
    let failure = true;
    await page.route('**/alerts?*', route => failure
      ? fulfillJson(route, { error:{ message:'Synthetic alert outage' } }, 503)
      : fulfillJson(route, serverFilteredAlerts(new URL(route.request().url()), syntheticAlerts)));
    await page.reload();
    await expect(page.getByText('Alerts could not be loaded.')).toBeVisible();
    await expect(page.getByText('Synthetic alert outage')).toBeVisible();
    failure = false;
    await page.getByRole('button', { name:'Retry' }).click();
    await expect(alertCard(page, 'pw-alert-manual')).toBeVisible();
  });

  test('TALERT-015 Refresh alerts refetches queue instead of mutating alert records', async ({ page }) => {
    let reads = 0;
    await page.route('**/alerts?*', route => { reads++; return fulfillJson(route,
      serverFilteredAlerts(new URL(route.request().url()), syntheticAlerts)); });
    await page.getByRole('button', { name:'Refresh alerts' }).click();
    await expect(alertCard(page, 'pw-alert-manual')).toBeVisible();
    expect(reads).toBeGreaterThan(0);
  });
});

test.describe('Alerts — deep links, context and rendering', () => {
  test.beforeEach(async ({ page }) => { await openAlertWorkspace(page); });

  test('TALERT-016 a focused alert already in the filtered queue is not duplicated', async ({ page }) => {
    await page.goto('/alerts?alert_id=pw-alert-manual');
    await expect(alertCard(page, 'pw-alert-manual')).toHaveCount(1);
    await expect(alertCard(page, 'pw-alert-manual')).toHaveClass(/alerts-alert-card--focused/);
    await expect(page.getByText('The linked alert is shown separately')).toHaveCount(0);
  });

  test('TALERT-017 focused resolved alert outside open queue is pinned but excluded from totals', async ({ page }) => {
    await page.goto('/alerts?alert_id=pw-alert-resolved&resolved=false');
    await expect(alertCard(page, 'pw-alert-resolved')).toBeVisible();
    await expect(page.getByText('The linked alert is shown separately and is not included in the filtered totals.')).toBeVisible();
    await expect(statCard(page, 'Visible results').locator('.io-workspace-stat__value')).toHaveText('4');
  });

  test('TALERT-018 unavailable linked alert reports lookup error without exposing unrelated record as target', async ({ page }) => {
    await page.goto('/alerts?alert_id=pw-not-found&resolved=false');
    await expect(page.getByText('Linked alert could not be loaded.')).toBeVisible();
    await expect(alertCard(page, 'pw-not-found')).toHaveCount(0);
    await expect(alertCard(page, 'pw-alert-manual')).toBeVisible();
  });

  test('TALERT-019 linked alert already in filtered queue stays visible when separate lookup fails', async ({ page }) => {
    await page.route('**/alerts/pw-alert-manual', route => fulfillJson(route,
      { error: { message:'Synthetic lookup unavailable' } }, 503));
    await page.goto('/alerts?alert_id=pw-alert-manual');
    await expect(alertCard(page, 'pw-alert-manual')).toBeVisible();
    await expect(page.getByText('Linked alert could not be loaded.')).toHaveCount(0);
  });

  test('TALERT-020 open critical blocking alert displays critical and operational-blocking markers', async ({ page }) => {
    await expect(alertCard(page, 'pw-alert-critical').locator('[class*="alerts-badge-row"]')).toContainText('Critical');
    await expect(alertCard(page, 'pw-alert-critical')).toContainText('System blocker');
    await expect(alertCard(page, 'pw-alert-critical')).toContainText('Open');
  });

  test('TALERT-021 low-stock current condition displays usable quantity, threshold and shortage', async ({ page }) => {
    const card = alertCard(page, 'pw-alert-low');
    await expect(card.getByText('Still below minimum')).toBeVisible();
    await expect(card.getByText('Current usable stock:')).toBeVisible();
    await expect(card.getByText('Minimum required:')).toBeVisible();
    await expect(card.getByText('Shortage:')).toBeVisible();
    await expect(card.getByText('Current usable stock:').locator('..')).toContainText('3 kg');
    await expect(card.getByText('Minimum required:').locator('..')).toContainText('6 kg');
    await expect(card.getByText('Shortage:').locator('..')).toContainText('3 kg');
  });

  test('TALERT-022 missing low-stock measurements remain unknown rather than displayed as numeric zero', async ({ page }) => {
    const low = { ...syntheticAlerts[2], current_usable_quantity:null, current_min_quantity:null, current_shortage_quantity:null };
    await page.route('**/alerts?*', route => isAlertApiGet(route) ? fulfillJson(route, [low]) : route.fallback());
    await page.reload();
    const card = alertCard(page, 'pw-alert-low');
    await expect(card.getByText('Current usable stock:')).toBeVisible();
    for (const name of ['Current usable stock:', 'Minimum required:', 'Shortage:']) {
      await expect(card.getByText(name).locator('..')).toContainText('—');
    }
  });

  test('TALERT-023 current-state system stock alert cannot be manually resolved or reopened', async ({ page }) => {
    await expect(alertCard(page, 'pw-alert-low').getByRole('button', { name:'Resolve' })).toHaveCount(0);
    await expect(alertCard(page, 'pw-alert-low').getByText('This system alert closes automatically')).toBeVisible();
    await expect(alertCard(page, 'pw-alert-critical').getByRole('button', { name:'Resolve' })).toHaveCount(0);
  });

  test('TALERT-024 shipment alerts link to the shipment source page rather than generic stock', async ({ page }) => {
    await expect(alertCard(page, 'pw-alert-shipment').getByRole('link', { name:'Open Shipments' })).toHaveAttribute('href', '/shipments');
  });

  test('TALERT-025 stock-linked critical alert has source workflow fallback to the stock record', async ({ page }) => {
    await expect(alertCard(page, 'pw-alert-critical').getByRole('link', { name:'Open Stock' }))
      .toHaveAttribute('href', '/stock?stock_id=pw-stock-01');
  });
});

test.describe('Alerts — controlled acknowledge, resolve, reopen and escalation', () => {
  test.beforeEach(async ({ page }) => { await openAlertWorkspace(page); });

  test('TALERT-026 acknowledge sends POST without payload and displays explicit completion feedback', async ({ page }) => {
    let body: unknown; let called = 0;
    await page.route('**/alerts/pw-alert-manual/acknowledge', route => {
      called++; body = route.request().postDataJSON();
      return fulfillJson(route, { ...syntheticAlerts[0], acknowledged:true });
    });
    await alertCard(page, 'pw-alert-manual').getByRole('button', { name:'Acknowledge' }).click();
    await expect(page.getByRole('status').getByText(/Supplier delivery delay acknowledged successfully/)).toBeVisible();
    expect(body).toEqual({});
    expect(called).toBe(1);
  });

  test('TALERT-027 acknowledge failure is visible and never reports acknowledgement succeeded', async ({ page }) => {
    await page.route('**/alerts/pw-alert-manual/acknowledge', route => fulfillJson(route,
      { error:{ message:'Synthetic acknowledgement conflict' } }, 409));
    await alertCard(page, 'pw-alert-manual').getByRole('button', { name:'Acknowledge' }).click();
    await expect(page.getByRole('alert').getByText('Synthetic acknowledgement conflict')).toBeVisible();
    await expect(page.getByText('acknowledged successfully.')).toHaveCount(0);
  });

  test('TALERT-028 Resolve disabled until a three-character explanation is provided', async ({ page }) => {
    const card = alertCard(page, 'pw-alert-manual');
    await expect(card.getByRole('button', { name:'Resolve' })).toBeDisabled();
    await card.getByRole('textbox', { name:'Resolution note' }).fill('ok');
    await expect(card.getByRole('button', { name:'Resolve' })).toBeDisabled();
    await card.getByRole('textbox', { name:'Resolution note' }).fill('Checked source record');
    await expect(card.getByRole('button', { name:'Resolve' })).toBeEnabled();
  });

  test('TALERT-029 Resolve submits trimmed resolution_note to correct alert ID', async ({ page }) => {
    let submitted: unknown;
    await page.route('**/alerts/pw-alert-manual/resolve', route => {
      submitted = route.request().postDataJSON();
      return fulfillJson(route, { ...syntheticAlerts[0], resolved:true, resolution_note:'Checked source record' });
    });
    await alertCard(page, 'pw-alert-manual').getByRole('textbox', { name:'Resolution note' }).fill('  Checked source record  ');
    await alertCard(page, 'pw-alert-manual').getByRole('button', { name:'Resolve' }).click();
    await expect(page.getByRole('status').getByText(/Supplier delivery delay resolved successfully/)).toBeVisible();
    expect(submitted).toEqual({ resolution_note:'Checked source record' });
  });

  test('TALERT-030 rejected resolve shows backend reason and no false completion feedback', async ({ page }) => {
    await page.route('**/alerts/pw-alert-manual/resolve', route => fulfillJson(route,
      { error:{ message:'Synthetic alert resolution rejected' } }, 409));
    await alertCard(page, 'pw-alert-manual').getByRole('textbox', { name:'Resolution note' }).fill('Investigated incident');
    await alertCard(page, 'pw-alert-manual').getByRole('button', { name:'Resolve' }).click();
    await expect(page.getByRole('alert').getByText('Synthetic alert resolution rejected')).toBeVisible();
    await expect(page.getByText('resolved successfully.')).toHaveCount(0);
  });

  test('TALERT-031 dismissing Reopen confirmation sends no request and leaves resolved record', async ({ page }) => {
    let writes = 0;
    await page.route('**/alerts/pw-alert-resolved/reopen', route => { writes++; return route.abort(); });
    await page.goto('/alerts?resolved=true');
    page.once('dialog', dialog => dialog.dismiss());
    await alertCard(page, 'pw-alert-resolved').getByRole('button', { name:'Reopen' }).click();
    await expect(alertCard(page, 'pw-alert-resolved')).toBeVisible();
    expect(writes).toBe(0);
  });

  test('TALERT-032 confirming Reopen posts empty body and reports explicit outcome', async ({ page }) => {
    let submitted: unknown;
    await page.route('**/alerts/pw-alert-resolved/reopen', route => {
      submitted = route.request().postDataJSON();
      return fulfillJson(route, { ...syntheticAlerts[4], resolved:false, acknowledged:false, resolution_note:null });
    });
    await page.goto('/alerts?resolved=true');
    page.once('dialog', dialog => dialog.accept());
    await alertCard(page, 'pw-alert-resolved').getByRole('button', { name:'Reopen' }).click();
    await expect(page.getByRole('status').getByText(/Internal audit follow-up reopened successfully/)).toBeVisible();
    expect(submitted).toEqual({});
  });

  test('TALERT-033 escalation confirmation cancellation sends no POST', async ({ page }) => {
    let calls = 0;
    await page.route('**/alerts/pw-alert-manual/escalate', route => { calls++; return route.abort(); });
    page.once('dialog', dialog => dialog.dismiss());
    await alertCard(page, 'pw-alert-manual').getByRole('button', { name:'Increase escalation level' }).click();
    await expect(alertCard(page, 'pw-alert-manual')).toBeVisible();
    expect(calls).toBe(0);
  });

  test('TALERT-034 confirmed escalation makes one POST and states it is in-app only', async ({ page }) => {
    let calls = 0;
    await page.route('**/alerts/pw-alert-manual/escalate', route => {
      calls++; return fulfillJson(route, { ...syntheticAlerts[0], escalation_level:1 });
    });
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('does not send an email or webhook notification');
      await dialog.accept();
    });
    await alertCard(page, 'pw-alert-manual').getByRole('button', { name:'Increase escalation level' }).click();
    await expect(page.getByRole('status').getByText(/escalation level increased successfully/)).toBeVisible();
    expect(calls).toBe(1);
  });

  test('TALERT-035 rejected escalation shows server error without success message', async ({ page }) => {
    await page.route('**/alerts/pw-alert-manual/escalate', route => fulfillJson(route,
      { error:{ message:'Synthetic escalation blocked' } }, 409));
    page.once('dialog', dialog => dialog.accept());
    await alertCard(page, 'pw-alert-manual').getByRole('button', { name:'Increase escalation level' }).click();
    await expect(page.getByRole('alert').getByText('Synthetic escalation blocked')).toBeVisible();
    await expect(page.getByText('escalation level increased successfully.')).toHaveCount(0);
  });
});

// Batch 6 — pending manual creation, role split, override and system-state scenarios.
// Every mutation is intercepted with a synthetic response or aborted by fixtureAlerts.
const manualPanel = (page: Page) => page.locator('details.alerts-section--manual');
async function openManualPanel(page: Page) {
  const panel = manualPanel(page);
  await panel.locator('summary').click();
  await expect(panel).toHaveAttribute('open', '');
  return panel;
}
async function fillManualAlert(page: Page, type = 'Synthetic supplier follow-up', message = 'Synthetic operational issue verified') {
  const panel = await openManualPanel(page);
  await panel.getByRole('textbox', { name: 'Alert type' }).fill(type);
  await panel.getByRole('textbox', { name: 'Alert message' }).fill(message);
  return panel;
}
const overrideArea = (page: Page, id = 'pw-alert-critical') => alertCard(page, id).locator('.app-warning-state').filter({ hasText:'Emergency blocking-alert override' });

test.describe('Alerts — manual create, permissions and controlled emergency override', () => {
  test.beforeEach(async ({ page }) => { await openAlertWorkspace(page); });

  test('TALERT-036 manual alert details starts collapsed and expands to disclose form', async ({ page }) => {
    const panel = manualPanel(page);
    await expect(panel).not.toHaveAttribute('open', '');
    await expect(panel.getByRole('textbox', { name:'Alert type' })).not.toBeVisible();
    await panel.locator('summary').click();
    await expect(panel.getByRole('textbox', { name:'Alert type' })).toBeVisible();
  });

  test('TALERT-037 blank or whitespace-only type disables manual creation without write', async ({ page }) => {
    const panel = await fillManualAlert(page);
    await panel.getByRole('textbox', { name:'Alert type' }).fill('   ');
    await expect(panel.getByRole('button', { name:'Create alert' })).toBeDisabled();
    await expect(panel.getByRole('textbox', { name:'Alert type' })).toHaveAttribute('required', '');
  });

  test('TALERT-038 blank or whitespace-only message disables manual creation without write', async ({ page }) => {
    const panel = await fillManualAlert(page);
    await panel.getByRole('textbox', { name:'Alert message' }).fill('  ');
    await expect(panel.getByRole('button', { name:'Create alert' })).toBeDisabled();
    await expect(panel.getByRole('textbox', { name:'Alert message' })).toHaveAttribute('required', '');
  });

  test('TALERT-039 successful manual create trims payload, resets form and reports completion', async ({ page }) => {
    let submitted: unknown; let calls = 0;
    await page.route('**/alerts', route => {
      if (route.request().method() !== 'POST') return route.fallback();
      calls++; submitted = route.request().postDataJSON();
      return fulfillJson(route, { ...syntheticAlerts[0], id:'pw-created-alert' }, 201);
    });
    const panel = await fillManualAlert(page, '  Synthetic supplier follow-up  ', '  Synthetic operational issue verified  ');
    await panel.getByRole('button', { name:'Create alert' }).click();
    await expect(page.getByRole('status').getByText('Manual alert created successfully.')).toBeVisible();
    await expect(panel.getByRole('textbox', { name:'Alert type' })).toBeEmpty();
    await expect(panel.getByRole('textbox', { name:'Alert message' })).toBeEmpty();
    expect(submitted).toEqual({ type:'Synthetic supplier follow-up', message:'Synthetic operational issue verified', severity:'warning', product_id:null, escalation_level:0 });
    expect(calls).toBe(1);
  });

  test('TALERT-040 rejected manual create shows error while retaining entered values', async ({ page }) => {
    await page.route('**/alerts', route => route.request().method() === 'POST'
      ? fulfillJson(route, { error:{ message:'Synthetic create denied' } }, 403) : route.fallback());
    const panel = await fillManualAlert(page);
    await panel.getByRole('button', { name:'Create alert' }).click();
    await expect(page.getByRole('alert').getByText('Synthetic create denied')).toBeVisible();
    await expect(panel.getByRole('textbox', { name:'Alert type' })).toHaveValue('Synthetic supplier follow-up');
    await expect(page.getByText('Manual alert created successfully.')).toHaveCount(0);
  });

  test('TALERT-041 cancellation of Critical create confirmation sends no POST', async ({ page }) => {
    let posts = 0;
    await page.route('**/alerts', route => {
      if (route.request().method() === 'POST') posts++;
      return route.abort();
    });
    const panel = await fillManualAlert(page);
    await panel.getByRole('combobox', { name:'Severity' }).selectOption('critical');
    await expect(panel.getByText('Critical alerts can block protected stock')).toBeVisible();
    page.once('dialog', dialog => dialog.dismiss());
    await panel.getByRole('button', { name:'Create alert' }).click();
    await expect(panel.getByRole('textbox', { name:'Alert message' })).toHaveValue('Synthetic operational issue verified');
    expect(posts).toBe(0);
  });

  test('TALERT-042 accepted Critical create confirmation submits critical and zero escalation', async ({ page }) => {
    let submitted: any;
    await page.route('**/alerts', route => route.request().method() === 'POST'
      ? (submitted = route.request().postDataJSON(), fulfillJson(route, { ...syntheticAlerts[0], severity:'critical' }, 201))
      : route.fallback());
    const panel = await fillManualAlert(page);
    await panel.getByRole('combobox', { name:'Severity' }).selectOption('critical');
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Create a Critical alert?');
      await dialog.accept();
    });
    await panel.getByRole('button', { name:'Create alert' }).click();
    await expect(page.getByRole('status').getByText('Manual alert created successfully.')).toBeVisible();
    expect(submitted).toMatchObject({ severity:'critical', escalation_level:0 });
  });

  test('TALERT-043 optional linked product is sent in manual create payload', async ({ page }) => {
    let submitted: any;
    await page.route('**/alerts', route => route.request().method() === 'POST'
      ? (submitted = route.request().postDataJSON(), fulfillJson(route, syntheticAlerts[0], 201))
      : route.fallback());
    const panel = await fillManualAlert(page);
    await panel.getByRole('combobox', { name:'Related product (optional)' }).selectOption('pw-product-01');
    await panel.getByRole('button', { name:'Create alert' }).click();
    await expect(page.getByRole('status').getByText('Manual alert created successfully.')).toBeVisible();
    expect(submitted.product_id).toBe('pw-product-01');
  });

  test('TALERT-044 product lookup failure leaves unlinked manual alert creation available', async ({ page }) => {
    await page.route('**/products', route => fulfillJson(route, { error:{ message:'Synthetic products unavailable' } }, 503));
    await page.reload();
    const panel = await fillManualAlert(page);
    await expect(panel.getByText('Products could not be loaded.')).toBeVisible();
    await expect(panel.getByRole('combobox', { name:'Related product (optional)' })).toHaveValue('');
    await expect(panel.getByRole('button', { name:'Create alert' })).toBeEnabled();
  });

  test('TALERT-045 alerts.read without alerts.write permits filters but hides mutation controls', async ({ page }) => {
    await setAlertPermissions(page, ['alerts.read', 'products.read', 'stock.read', 'suppliers.read']);
    await expect(page.getByRole('heading', { name:'Filter the alert queue' })).toBeVisible();
    await expect(page.getByRole('button', { name:'Apply filters' })).toBeVisible();
    await expect(manualPanel(page)).toHaveCount(0);
    const card = alertCard(page, 'pw-alert-manual');
    for (const action of ['Acknowledge', 'Resolve', 'Increase escalation level']) {
      await expect(card.getByRole('button', { name:action })).toHaveCount(0);
    }
    await expect(card.getByRole('link', { name:'Open Suppliers' })).toBeVisible();
  });

  test('TALERT-046 alerts.override without alerts.write allows emergency override only', async ({ page }) => {
    await setAlertPermissions(page, ['alerts.read', 'alerts.override', 'stock.read']);
    await expect(manualPanel(page)).toHaveCount(0);
    await expect(overrideArea(page)).toBeVisible();
    await expect(alertCard(page, 'pw-alert-critical').getByRole('button', { name:'Acknowledge' })).toHaveCount(0);
    await expect(alertCard(page, 'pw-alert-manual').getByRole('button', { name:'Resolve' })).toHaveCount(0);
  });

  test('TALERT-047 emergency override requires trimmed reason of three or more characters', async ({ page }) => {
    const box = overrideArea(page);
    const reason = box.getByRole('textbox', { name:'Mandatory override reason' });
    const submit = box.getByRole('button', { name:'Override and close blocking alert' });
    await expect(submit).toBeDisabled();
    await reason.fill(' a ');
    await expect(submit).toBeDisabled();
    await reason.fill('abc');
    await expect(submit).toBeEnabled();
  });

  test('TALERT-048 emergency override confirmation cancellation does not send POST', async ({ page }) => {
    let posts = 0;
    await page.route('**/admin/alerts/pw-alert-critical/override', route => { posts++; return route.abort(); });
    const box = overrideArea(page);
    await box.getByRole('textbox', { name:'Mandatory override reason' }).fill('Investigated incident');
    page.once('dialog', dialog => dialog.dismiss());
    await box.getByRole('button', { name:'Override and close blocking alert' }).click();
    await expect(box.getByRole('textbox', { name:'Mandatory override reason' })).toHaveValue('Investigated incident');
    expect(posts).toBe(0);
  });

  test('TALERT-049 successful override sends trimmed reason and displays closure confirmation', async ({ page }) => {
    let submitted: unknown;
    await page.route('**/admin/alerts/pw-alert-critical/override', route => {
      submitted = route.request().postDataJSON();
      return fulfillJson(route, { message:'Synthetic override accepted', alert:{ ...syntheticAlerts[1], resolved:true } });
    });
    const box = overrideArea(page);
    await box.getByRole('textbox', { name:'Mandatory override reason' }).fill('  Reconciled stock ledger  ');
    page.once('dialog', async dialog => { expect(dialog.message()).toContain('emergency administrative action'); await dialog.accept(); });
    await box.getByRole('button', { name:'Override and close blocking alert' }).click();
    await expect(page.getByRole('status').getByText('Blocking alert overridden and closed successfully.')).toBeVisible();
    expect(submitted).toEqual({ reason:'Reconciled stock ledger' });
  });

  test('TALERT-050 emergency override rejection retains reason and shows backend error', async ({ page }) => {
    await page.route('**/admin/alerts/pw-alert-critical/override', route => fulfillJson(route,
      { error:{ message:'Synthetic override not authorized' } }, 403));
    const box = overrideArea(page);
    await box.getByRole('textbox', { name:'Mandatory override reason' }).fill('Checked inventory history');
    page.once('dialog', dialog => dialog.accept());
    await box.getByRole('button', { name:'Override and close blocking alert' }).click();
    await expect(page.getByRole('alert').getByText('Synthetic override not authorized')).toBeVisible();
    await expect(box.getByRole('textbox', { name:'Mandatory override reason' })).toHaveValue('Checked inventory history');
  });

  test('TALERT-051 nonblocking or already resolved alerts do not show emergency override', async ({ page }) => {
    await expect(overrideArea(page, 'pw-alert-manual')).toHaveCount(0);
    await expect(overrideArea(page, 'pw-alert-low')).toHaveCount(0);
    await page.goto('/alerts?resolved=true');
    await expect(overrideArea(page, 'pw-alert-resolved')).toHaveCount(0);
  });

  test('TALERT-052 recovered low stock shows recovery, not active shortage warning', async ({ page }) => {
    const low = { ...syntheticAlerts[2], current_condition_status:'recovered' as const, current_usable_quantity:8, current_shortage_quantity:0 };
    await page.route('**/alerts?*', route => isAlertApiGet(route) ? fulfillJson(route, [low]) : route.fallback());
    await page.reload();
    const card = alertCard(page, 'pw-alert-low');
    await expect(card.locator('.app-success-state').getByText('Recovered')).toBeVisible();
    await expect(card.getByText('Still below minimum')).toHaveCount(0);
    await expect(card.getByText('Shortage:').locator('..')).toContainText('0 kg');
  });

  test('TALERT-053 automatically resolved system alert is labeled resolved automatically', async ({ page }) => {
    const resolved = { ...syntheticAlerts[2], resolved:true, resolved_at:baseTime, resolution_note:'Automatically resolved: stock recovered to or above the configured location minimum.' };
    await page.route('**/alerts?*', route => isAlertApiGet(route) ? fulfillJson(route, [resolved]) : route.fallback());
    await page.goto('/alerts?resolved=true');
    const card = alertCard(page, 'pw-alert-low');
    await expect(card.getByText('Resolved automatically')).toBeVisible();
    await expect(card.getByText('Automatically resolved: stock recovered to or above the configured location minimum.')).toBeVisible();
  });
});

// Batch 180 — source-traced tenant Alerts family routing and read-only display boundaries.
// These synthetic GET fixtures do not prove backend alert creation, permission grants,
// data lineage, tenant isolation or any production route destination.
async function openB180Alert(page: Page, id: string, type: string, extra: Record<string, unknown> = {}) {
  const row = {
    ...syntheticAlerts[0], id, type, message: `Synthetic alert ${id} for source-link rendering`, ...extra
  } as SyntheticAlert;
  await openAlertWorkspace(page, row.resolved ? '/alerts?resolved=true' : '/alerts', [row]);
  const card = alertCard(page, id);
  await expect(card).toBeVisible();
  return card;
}

test.describe('Tenant Alerts — source workflow precedence and legacy card evidence (Batch 180)', () => {
  test('TALERT-054 transfer family opens Stock Transfers instead of generic stock', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-054', 'TRANSFER_NEEDS_REVIEW', {stock_id:'pw-stock-a'});
    await expect(card.getByRole('link',{name:'Open Stock Transfers'})).toHaveAttribute('href','/stock-transfers');
    await expect(card.getByRole('link',{name:'Open Stock',exact:true})).toHaveCount(0);
  });
  test('TALERT-055 reservation family opens Reservations instead of generic stock', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-055', 'RESERVATION_BLOCKED', {stock_id:'pw-stock-b'});
    await expect(card.getByRole('link',{name:'Open Reservations'})).toHaveAttribute('href','/inventory-reservations');
  });
  test('TALERT-056 requisition family opens Requisitions instead of generic stock', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-056', 'REQUISITION_REVIEW', {stock_id:'pw-stock-c'});
    await expect(card.getByRole('link',{name:'Open Requisitions'})).toHaveAttribute('href','/inventory-requisitions');
  });
  test('TALERT-057 damage family navigates directly to the usage damage-waste anchor', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-057', 'DAMAGE_NOTICE');
    await expect(card.getByRole('link',{name:'Review damage and waste records'})).toHaveAttribute('href','/inventory-usage#usage-damage-waste-review');
  });
  test('TALERT-058 waste family uses the same focused damage-waste review workflow', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-058', 'WASTE_RECORDED');
    await expect(card.getByRole('link',{name:'Review damage and waste records'})).toHaveAttribute('href','/inventory-usage#usage-damage-waste-review');
  });
  test('TALERT-059 usage exceptions link to Inventory Usage instead of Action Center', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-059', 'USAGE_EXCEPTIONS');
    await expect(card.getByRole('link',{name:'Open Inventory Usage'})).toHaveAttribute('href','/inventory-usage');
  });
  test('TALERT-060 consumption anomalies link to Inventory Usage', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-060', 'CONSUMPTION_SPIKE');
    await expect(card.getByRole('link',{name:'Open Inventory Usage'})).toHaveAttribute('href','/inventory-usage');
  });
  test('TALERT-061 PO-prefixed exceptions route to Purchase Orders', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-061', 'PO_RECEIVING_HOLD');
    await expect(card.getByRole('link',{name:'Open Purchase Orders'})).toHaveAttribute('href','/purchase-orders');
  });
  test('TALERT-062 purchase-order text family routes to Purchase Orders', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-062', 'PURCHASE_ORDER_MISMATCH');
    await expect(card.getByRole('link',{name:'Open Purchase Orders'})).toHaveAttribute('href','/purchase-orders');
  });
  test('TALERT-063 procurement text family routes to Purchase Orders', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-063', 'PROCUREMENT_APPROVAL_DELAY');
    await expect(card.getByRole('link',{name:'Open Purchase Orders'})).toHaveAttribute('href','/purchase-orders');
  });
  test('TALERT-064 supplier family links to Suppliers even when product-linked', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-064', 'SUPPLIER_QUALITY_HOLD',{product_id:'pw-product-a'});
    await expect(card.getByRole('link',{name:'Open Suppliers'})).toHaveAttribute('href','/suppliers');
  });
  test('TALERT-065 execution family links to Execution Tasks', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-065', 'EXECUTION_TASK_LATE');
    await expect(card.getByRole('link',{name:'Open Execution Tasks'})).toHaveAttribute('href','/execution-tasks');
  });
  test('TALERT-066 system health blocker points to Admin System status', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-066', 'SYSTEM_HEALTH_DEGRADED_BLOCKING', {severity:'critical'});
    await expect(card.getByRole('link',{name:'Open Admin System'})).toHaveAttribute('href','/admin-system');
  });
  test('TALERT-067 over-received shipment exceptions use Shipments source workflow', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-067', 'OVER_RECEIVED_BLOCKING',{stock_id:'pw-stock-d'});
    await expect(card.getByRole('link',{name:'Open Shipments'})).toHaveAttribute('href','/shipments');
  });
  test('TALERT-068 PO over-received blocker must not be mistaken for shipment over-receipt', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-068', 'PO_OVER_RECEIVED_BLOCKING',{stock_id:'pw-stock-e'});
    await expect(card.getByRole('link',{name:'Open Purchase Orders'})).toHaveAttribute('href','/purchase-orders');
    await expect(card.getByRole('link',{name:'Open Shipments'})).toHaveCount(0);
  });
  test('TALERT-069 shipment category wins before a linked stock fallback', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-069', 'SHIPMENT_INCOMPLETE',{stock_id:'pw-stock-f'});
    await expect(card.getByRole('link',{name:'Open Shipments'})).toHaveAttribute('href','/shipments');
    await expect(card.getByRole('link',{name:'Open Stock',exact:true})).toHaveCount(0);
  });
  test('TALERT-070 stock identifier is encoded in stock fallback query', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-070', 'Manual stock follow-up',{stock_id:'stock / review&item=7',product_id:'pw-product-f'});
    await expect(card.getByRole('link',{name:'Open Stock',exact:true})).toHaveAttribute('href','/stock?stock_id=stock%20%2F%20review%26item%3D7');
  });
  test('TALERT-071 product identifier is encoded when stock ID is absent', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-071', 'Manual product follow-up',{product_id:'item / & test'});
    await expect(card.getByRole('link',{name:'Open Stock',exact:true})).toHaveAttribute('href','/stock?product_id=item%20%2F%20%26%20test');
  });
  test('TALERT-072 unlinked manual alert falls back to Action Center', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-072', 'Uncategorized manual notice');
    await expect(card.getByRole('link',{name:'Open Action Center'})).toHaveAttribute('href','/action-center');
  });
  test('TALERT-073 card without linked product reports No product linked', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-073', 'Manual label check');
    await expect(card).toContainText('No product linked');
    await expect(card).not.toContainText('Linked product unavailable');
  });
  test('TALERT-074 product ID without display name states linked product unavailable', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-074', 'Manual missing product',{product_id:'pw-product-missing',product_name:null});
    await expect(card).toContainText('Linked product unavailable');
    await expect(card).not.toContainText('No product linked');
  });
  test('TALERT-075 linked storage location name is displayed in header metadata', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-075', 'Manual location check',{storage_location_name:'Synthetic Cooler B'});
    await expect(card).toContainText('Location: Synthetic Cooler B');
  });
  test('TALERT-076 source-unavailable low-stock condition hides unsourced quantity cells', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-076', 'LOW_STOCK',{current_condition_status:'source_unavailable',current_usable_quantity:99,current_min_quantity:3,current_shortage_quantity:0});
    await expect(card).toContainText('Stock position no longer available');
    await expect(card.getByText('Current usable stock:')).toHaveCount(0);
    await expect(card.getByText('Minimum required:')).toHaveCount(0);
    await expect(card.getByText('Shortage:')).toHaveCount(0);
  });
  test('TALERT-077 resolved low-stock record no longer shows active stock-condition callout', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-077', 'LOW_STOCK',{resolved:true,current_condition_status:'active'});
    await expect(card.getByText('Current condition')).toHaveCount(0);
    await expect(card.getByText('Still below minimum')).toHaveCount(0);
  });
  test('TALERT-078 informational open alert does not carry critical blocking badges', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-078', 'Manual informational note',{severity:'info'});
    await expect(card).toHaveAttribute('data-severity','info');
    await expect(card).not.toContainText('Operational blocker');
    await expect(card).not.toContainText('System blocker');
  });
  test('TALERT-079 warning severity blocking-suffix record does not claim critical block', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-079', 'CUSTOM_BLOCKING',{severity:'warning'});
    await expect(card).toHaveAttribute('data-severity','warning');
    await expect(card).not.toContainText('System blocker');
    await expect(card).not.toContainText('Operational blocker');
  });
  test('TALERT-080 critical unclassified manual type shows operational blocker', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-080', 'Manual critical investigation',{severity:'critical'});
    await expect(card).toContainText('Operational blocker');
    await expect(card).not.toContainText('System blocker');
  });
  test('TALERT-081 resolved critical type does not retain active blocking indicator', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-081', 'STOCK_LEDGER_DESYNC_BLOCKING',{severity:'critical',resolved:true});
    await expect(card).toHaveAttribute('data-resolved','true');
    await expect(card).not.toContainText('System blocker');
  });
  test('TALERT-082 owned alert shows named owner and suppresses repeat Acknowledge', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-082', 'Manual owned follow-up',{acknowledged:true,acknowledged_by_name:'Synthetic Owner'});
    await expect(card).toContainText('Synthetic Owner');
    await expect(card.getByRole('button',{name:'Acknowledge'})).toHaveCount(0);
  });
  test('TALERT-083 acknowledged row without owner name uses explicit acknowledgement fallback', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-083', 'Manual owner missing',{acknowledged:true,acknowledged_by_name:null});
    await expect(card.locator('.alerts-key-card').first()).toContainText('Acknowledged');
    await expect(card.locator('.alerts-key-card').first()).not.toContainText('Not acknowledged');
  });
  test('TALERT-084 missing last-escalation date explains that no escalation is recorded', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-084', 'Manual escalation status',{escalation_level:0});
    await expect(card.locator('.alerts-key-card').nth(1)).toContainText('Not escalated.');
  });
  test('TALERT-085 recorded escalation date replaces the Not escalated fallback', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-085', 'Manual escalation timestamp',{escalation_level:2,last_escalated_at:'2026-10-09T12:30:00Z'});
    await expect(card.locator('.alerts-key-card').nth(1)).toContainText('Last escalated');
    await expect(card.locator('.alerts-key-card').nth(1)).not.toContainText('Not escalated.');
  });
  test('TALERT-086 missing resolved timestamp remains unknown instead of guessed', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-086', 'Manual closed without timestamp',{resolved:true,resolved_at:null});
    await expect(card.locator('.alerts-key-card').nth(2)).toContainText('—');
  });
  test('TALERT-087 resolved alert without a note does not create an invented note box', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-087', 'Manual note unavailable',{resolved:true,resolution_note:null});
    await expect(card.getByText('Resolution note',{exact:true})).toHaveCount(0);
  });
  test('TALERT-088 current-state stock integrity alert explains automatic closure rather than manual resolution', async ({ page }) => {
    const card = await openB180Alert(page, 'pw-b180-088', 'STOCK_LEDGER_DESYNC_BLOCKING',{severity:'critical'});
    await expect(card).toContainText('This system alert closes automatically when the underlying condition is no longer active.');
    await expect(card.getByRole('button',{name:'Resolve'})).toHaveCount(0);
    await expect(card.getByRole('button',{name:'Increase escalation level'})).toBeVisible();
  });
});
