#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8');
const layout = read('src/layouts/AppLayout.tsx');
const attentionItems = read('src/lib/sidebarAttentionItems.ts');
const replenishment = read('src/pages/ReplenishmentPlanningPage.tsx');
const transfers = read('src/pages/StockTransfersPage.tsx');
const purchaseOrders = read('src/pages/PurchaseOrdersPage.tsx');
const messages = read('src/i18n/messages.ts');
const commercialGuard = read('scripts/check-commercial-shell-regression.mjs');
const pkg = JSON.parse(read('package.json'));

const checks = [];
const check = (condition, label) => checks.push({ condition: Boolean(condition), label });
const has = (source, signal) => source.includes(signal);

check(has(layout, "item.to === '/replenishment-planning' && hasReplenishmentPlanningAttention"), 'sidebar dot points to Replenishment Planning when actionable planning work exists');
check(has(layout, "item.to === '/stock-transfers' && hasStockTransferAttention"), 'sidebar dot points to Stock Transfers when a replenishment-created draft is executable');
check(has(layout, "item.to === '/purchase-orders' && hasPurchaseOrderAttention"), 'existing Purchase Orders sidebar dot remains the authoritative PO handoff');
check(has(layout, 'hasReplenishmentPlanningAttention'), 'Replenishment Planning attention state is represented explicitly');
check(has(layout, 'hasStockTransferAttention'), 'Stock Transfer attention state is represented explicitly');
check(has(layout, 'purchase_orders.submission_count') || has(layout, 'submission_count:'), 'Purchase Order attention type includes submission work');
check(has(layout, 'send_count:'), 'Purchase Order attention type includes supplier-send work');
check(has(layout, 'canGovernReplenishmentPlanningForAttention'), 'Replenishment dot is capability-gated');
check(has(layout, 'canExecuteReplenishmentTransfersForAttention'), 'Stock Transfer dot is execution-capability-gated');
check(has(layout, 'canSubmitPurchaseOrdersForAttention'), 'PO submit dot is submit-capability-gated');
check(has(layout, 'canPreparePurchaseOrdersForAttention'), 'PO price-preparation dot is update-capability-gated');
check(has(layout, 'canSendPurchaseOrdersForAttention'), 'PO supplier-send dot is send-capability-gated');
check(has(layout, '!supportSession.isSupportSession'), 'sidebar attention still fails closed during support sessions');
check(has(layout, 'TENANT_MUTATION_FEEDBACK_EVENT'), 'successful workflow mutations still invalidate attention without page reload');
check(has(layout, "queryKey: ['tenant-sidebar', 'operational-navigation-attention']"), 'attention invalidation still targets the shared operational attention cache');

check(has(attentionItems, "| 'replenishment_planning'"), 'exact attention hook supports Replenishment Planning');
check(has(attentionItems, "| 'stock_transfers'"), 'exact attention hook supports Stock Transfers');
check(has(attentionItems, 'pending_transfer_ids?: string[]'), 'exact attention response includes pending replenishment transfer IDs');
check(has(attentionItems, 'pending_purchase_ids?: string[]'), 'exact attention response includes pending replenishment purchase IDs');
check(has(attentionItems, 'ready_materialize_run_ids?: string[]'), 'exact attention response includes ready-to-create-draft run IDs');
check(has(attentionItems, 'replenishment_execute_ids?: string[]'), 'exact attention response includes executable replenishment transfer IDs');
check(has(attentionItems, 'submission_ids?: string[]') && has(attentionItems, 'send_ids?: string[]'), 'exact Purchase Order attention distinguishes submit and send IDs');
check(has(attentionItems, 'identityKey') && has(attentionItems, 'permissionKey'), 'new exact attention surfaces retain user/permission-scoped cache identity');

check(has(replenishment, "useOperationalAttentionItems(\n    'replenishment_planning'"), 'Replenishment page consumes authoritative exact attention IDs');
check(has(replenishment, 'pendingTransferAttentionIds'), 'Replenishment page traces attention to exact pending transfer rows');
check(has(replenishment, 'pendingPurchaseAttentionIds'), 'Replenishment page traces attention to exact pending purchase rows');
check(has(replenishment, 'readyMaterializeRunIds'), 'Replenishment page traces attention to the exact run ready to create drafts');
check(has(replenishment, 'SidebarAttentionTabDot'), 'Replenishment page points to the correct internal Review/Create drafts tab');
check(has(replenishment, 'data-sidebar-attention-item={causesSidebarAttention ? "true" : undefined}'), 'Replenishment page marks exact pending rows');
check(has(replenishment, '<SidebarAttentionMarker label={ui(\'Attention required\')} />'), 'Replenishment exact records use the shared attention marker');

check(has(transfers, "useOperationalAttentionItems('stock_transfers', canExecuteStockTransfersOperationally)"), 'Stock Transfers uses authoritative replenishment execution attention');
check(has(transfers, 'stockTransferAttentionIds.has(transfer.id)'), 'Stock Transfers marks only exact actionable transfer records');
check(has(transfers, 'data-sidebar-attention-item={causesSidebarAttention ? "true" : undefined}'), 'Stock Transfers marks exact attention cards');
check(has(transfers, 'const nextAttentionId = stockTransferAttentionItemsQuery.data?.attention_ids?.[0]'), 'Stock Transfers can focus the first actionable transfer when opened from the sidebar');
check(has(transfers, 'if (selectedTransferId || hasActiveFilters || stockTransferAttentionItemsQuery.isLoading) return;'), 'Stock Transfers does not override explicit selection or active filters');

check(has(purchaseOrders, "useOperationalAttentionItems('purchase_orders', canActOnPurchaseOrderAttention)"), 'Purchase Orders uses one exact attention source for submit/approve/send work');
check(has(purchaseOrders, 'capabilities.canSubmitPurchaseOrders'), 'Purchase Orders enables attention for users who can submit replenishment-created drafts');
check(has(purchaseOrders, 'capabilities.canUpdatePurchaseOrders'), 'Purchase Orders enables attention for users who can repair missing supplier prices');
check(has(purchaseOrders, 'capabilities.canApprovePurchaseOrders'), 'existing Purchase Order approval attention remains enabled');
check(has(purchaseOrders, 'capabilities.canManageShipments && capabilities.canSendShipments'), 'Purchase Orders enables attention for the supplier-send handoff');
check(has(purchaseOrders, 'purchaseOrderAttentionIds.has(row.id)'), 'Purchase Orders marks exact actionable records');
check(has(purchaseOrders, 'SidebarAttentionTabDot'), 'Purchase Orders still points to its Orders tab when work is hidden in another view');

for (const key of ['common.replenishmentPlanningAttention', 'common.stockTransfersAttention', 'common.purchaseOrdersAttention']) {
  const count = messages.split(`'${key}'`).length - 1;
  check(count === 5, `${key} exists in all five tenant locales`);
}

check(has(commercialGuard, "'/replenishment-planning'"), 'commercial shell guard approves the new Replenishment Planning attention destination');
check(has(commercialGuard, "'/stock-transfers'"), 'commercial shell guard approves the new Stock Transfers attention destination');
check(!commercialGuard.includes("['/mobile-execution', '/stock-transfers', '/automation-schedules']"), 'historical guard no longer blanket-forbids Stock Transfers attention');
check(has(commercialGuard, "['/mobile-execution', '/automation-schedules']"), 'Mobile Execution and Automation Schedules remain deliberately excluded');

check(pkg.scripts?.['check:inventory-testing-hardening-v349243'] === 'node scripts/check-inventory-testing-hardening-v349243.mjs', 'v3.49.243 frontend guard is registered');
for (const scriptName of ['prelint', 'prebuild', 'check:ci']) {
  const value = String(pkg.scripts?.[scriptName] || '');
  const previous = value.indexOf('check:inventory-testing-hardening-v349242');
  const current = value.indexOf('check:inventory-testing-hardening-v349243');
  check(previous >= 0 && current > previous, `v3.49.243 follows v3.49.242 in ${scriptName}`);
}

const failed = checks.filter((item) => !item.condition);
for (const item of checks) console.log(`${item.condition ? 'PASS' : 'FAIL'}: ${item.label}`);
if (failed.length) {
  console.error(`\nv3.49.243 Replenishment workflow attention frontend guard: ${checks.length - failed.length}/${checks.length} PASS`);
  process.exit(1);
}
console.log(`\nv3.49.243 Replenishment workflow attention frontend guard: ${checks.length}/${checks.length} PASS`);
