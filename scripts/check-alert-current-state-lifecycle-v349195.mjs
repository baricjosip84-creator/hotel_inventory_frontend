import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const files = {
  packageJson: read('package.json'),
  alerts: read('src/pages/AlertsPage.tsx'),
  stock: read('src/pages/StockPage.tsx'),
  presentation: read('src/lib/alertPresentation.ts'),
  translations: read('src/i18n/tenantUiTranslations.ts'),
  systemContext: read('src/pages/SystemContextPage.tsx'),
  usageDashboard: read('src/pages/inventoryUsage/InventoryUsageDashboard.tsx'),
  usageQuickConsume: read('src/pages/inventoryUsage/InventoryUsageQuickConsumePanel.tsx'),
  usageScheduled: read('src/pages/inventoryUsage/InventoryUsageScheduledTemplatesPanel.tsx'),
  usageTemplates: read('src/pages/inventoryUsage/InventoryUsageTemplatesPanel.tsx'),
  usageTypes: read('src/pages/inventoryUsage/inventoryUsageTypes.ts')
};

let passed = 0;
const failures = [];
const check = (label, condition) => {
  if (condition) {
    passed += 1;
    console.log(`PASS: ${label}`);
  } else {
    failures.push(label);
    console.error(`FAIL: ${label}`);
  }
};
const has = (text, token) => text.includes(token);

check('Alerts response type carries exact stock_id', has(files.alerts, 'stock_id?: string | null'));
check('Alerts response type carries current usable quantity', has(files.alerts, 'current_usable_quantity?: number | string | null'));
check('Alerts response type carries current location minimum', has(files.alerts, 'current_min_quantity?: number | string | null'));
check('Alerts response type carries current shortage', has(files.alerts, 'current_shortage_quantity?: number | string | null'));
check('Alerts response type carries current condition status', has(files.alerts, "current_condition_status?: 'active' | 'recovered' | 'source_unavailable' | null"));
check('Open Stock prefers exact stock position ID', has(files.alerts, '`/stock?stock_id=${encodeURIComponent(alert.stock_id)}`'));
check('Product ID is only a fallback when exact stock ID is unavailable', /if \(alert\.stock_id && hasPermission\(TENANT_PERMISSIONS\.STOCK_READ\)\)[\s\S]{0,260}if \(alert\.product_id && hasPermission\(TENANT_PERMISSIONS\.STOCK_READ\)\)/.test(files.alerts));
check('Open unresolved Low Stock shows live Current condition', has(files.alerts, 'Current condition') && has(files.alerts, 'Still below minimum'));
check('Live Low Stock condition is not misleadingly shown on resolved history cards', has(files.alerts, 'isLowStockAlert && !alert.resolved && alert.current_condition_status'));
check('Live Low Stock shows usable stock, required minimum and shortage', has(files.alerts, 'Current usable stock') && has(files.alerts, 'Minimum required') && has(files.alerts, 'Shortage'));
check('Current-state alerts explain automatic closure', has(files.alerts, 'This system alert closes automatically when the underlying condition is no longer active.'));
check('Current-state alerts do not expose ordinary manual Resolve form', has(files.alerts, '!alert.resolved && canManageAlerts && !isCurrentStateAlert'));
check('Current-state alerts do not expose ordinary Reopen action', /alert\.resolved && canManageAlerts && !isCurrentStateAlert/.test(files.alerts));
check('Automatically resolved alert history is labelled', has(files.alerts, "autoResolved ? ui('Resolved automatically')"));
check('Automatic system resolution notes are localized only when owned', has(files.presentation, 'formatAlertResolutionNote'));
check('LOW_STOCK is classified as current-state system alert', /LOW_STOCK: 'Automatically resolved: stock recovered/.test(files.presentation));
check('Orphan shipment-item integrity is classified as current-state system alert', has(files.presentation, 'ORPHANED_SHIPMENT_ITEM_BLOCKING: \'Automatically resolved: no shipment item remains without its required parent shipment relationship.\''));
check('System-health degradation is classified as current-state system alert', has(files.presentation, 'SYSTEM_HEALTH_DEGRADED_BLOCKING: \'Automatically resolved: the tenant application-integrity health evidence is no longer degraded.\''));
check('Integrity-sweep negative stock is current-state without reclassifying blocked-attempt alerts', has(files.presentation, "type === 'NEGATIVE_STOCK_BLOCKING' && message === NEGATIVE_STOCK_INTEGRITY_MESSAGE"));
check('Integrity-sweep over-receipt is current-state without reclassifying blocked-attempt alerts', has(files.presentation, "type === 'OVER_RECEIVED_BLOCKING' && message === OVER_RECEIVED_INTEGRITY_MESSAGE"));
check('Alerts page uses record-aware current-state classification', has(files.alerts, 'const isCurrentStateAlert = isCurrentStateSystemAlert(alert);'));
check('Legacy and mixed-condition automatic resolution notes are recognized without owning arbitrary notes', has(files.presentation, 'SPECIAL_AUTO_RESOLUTION_NOTES.get(note) === type'));
check('New automatic-resolution notes have multilingual catalog rows', has(files.translations, '["Automatically resolved: no shipment item remains without its required parent shipment relationship."') && has(files.translations, '["Automatically resolved: the tenant application-integrity health evidence is no longer degraded."') && has(files.translations, '["Automatically resolved: legacy product-level Low Stock tracking was replaced by exact location-based tracking."') && has(files.translations, '["Automatically resolved: the exact stock position is no longer negative."') && has(files.translations, '["Automatically resolved: no active shipment line for this product remains over-received."'));
check('Stock mutations invalidate Alerts', has(files.stock, "queryKey: ['alerts']"));
check('Stock mutations invalidate Action Center', has(files.stock, "queryKey: ['operational-action-center']"));
check('Stock mutations invalidate sidebar attention', has(files.stock, "queryKey: ['tenant-sidebar', 'operational-navigation-attention']"));
check('Opening-stock import uses the same operational invalidation path', /onCommitted=\{async \(\) => \{\s*await invalidateStockOperationalQueries\(\);/.test(files.stock));

check('Low Stock source-unavailable automatic resolution is catalog-backed', has(files.translations, '["Automatically resolved: the tracked stock position is no longer active or available."'));
check('Low Stock inactive-threshold automatic resolution is catalog-backed', has(files.translations, '["Automatically resolved: this stock position no longer has an active minimum threshold."'));
check('System Context uses the reconciled product/location minimum wording', has(files.systemContext, "'Products are below a product-level reorder minimum or an active location minimum.'") && has(files.translations, '["Products are below a product-level reorder minimum or an active location minimum."'));
check('Inventory Usage labels the business quantity as current usable stock', has(files.usageDashboard, 'ui("Current usable stock")'));
check('Quick Consume explains stock/lot desync explicitly', has(files.usageQuickConsume, "case 'stock_lot_desync':") && has(files.usageQuickConsume, "Aggregate stock and available lot balances do not reconcile"));
check('Quick Consume explains insufficient usable lot stock explicitly', has(files.usageQuickConsume, "case 'insufficient_usable_lot_stock':") && has(files.usageQuickConsume, "There is not enough non-expired available lot stock"));
check('Scheduled Usage renders stock/lot desync as a blocking condition', has(files.usageScheduled, "status === 'stock_lot_desync'") && has(files.usageScheduled, "case 'stock_lot_desync':"));
check('Scheduled Usage renders insufficient usable lot stock as a blocking condition', has(files.usageScheduled, "status === 'insufficient_usable_lot_stock'") && has(files.usageScheduled, "case 'insufficient_usable_lot_stock':"));
check('Usage template readiness exposes stock/lot and usable-stock blockers', has(files.usageTemplates, 'stock_lot_desync_count') && has(files.usageTemplates, 'insufficient_usable_lot_stock_count'));
check('Usage readiness type names stock/lot desync explicitly', has(files.usageTypes, "'stock_lot_desync' | 'insufficient_stock' | 'insufficient_usable_lot_stock'"));
check('Scheduled Usage type names current usable-stock blockers explicitly', has(files.usageTypes, "'missing_stock' | 'stock_lot_desync' | 'insufficient_stock' | 'insufficient_usable_lot_stock'"));

check('v3.49.195 lifecycle guard is registered', has(files.packageJson, 'check:alert-current-state-lifecycle-v349195'));
check('v3.49.195 lifecycle guard runs after v3.49.194 in prelint', /"prelint"[^\n]*check:command-wide-operational-closure-v349194 && npm run check:alert-current-state-lifecycle-v349195/.test(files.packageJson));
check('v3.49.195 lifecycle guard runs after v3.49.194 in prebuild', /"prebuild"[^\n]*check:command-wide-operational-closure-v349194 && npm run check:alert-current-state-lifecycle-v349195/.test(files.packageJson));
check('v3.49.195 lifecycle guard runs after v3.49.194 in check:ci', /"check:ci"[^\n]*check:command-wide-operational-closure-v349194 && npm run check:alert-current-state-lifecycle-v349195/.test(files.packageJson));

if (failures.length) {
  console.error(`v3.49.195 alert current-state lifecycle frontend guard: ${passed}/${passed + failures.length} PASS`);
  process.exit(1);
}
console.log(`v3.49.195 alert current-state lifecycle frontend guard: PASS (${passed}/${passed})`);
