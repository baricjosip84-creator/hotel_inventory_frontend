#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const checks = [];
const check = (condition, message) => {
  if (!condition) throw new Error(`FAIL - ${message}`);
  checks.push(message);
};

const stock = read('src/pages/StockPage.tsx');
const stockRisk = read('src/components/enterpriseInventory/tabs/StockRiskTab.tsx');
const operations = read('src/components/enterpriseInventory/tabs/OperationsDashboardTab.tsx');
const dashboard = read('src/pages/DashboardPage.tsx');
const alerts = read('src/pages/AlertsPage.tsx');

check(stock.includes('effective_min_quantity?: number | string | null;'), 'Stock page consumes backend effective location minimum');
check(stock.includes('return Math.max(toNumber(item.min_quantity), 0);'), 'Stock page fallback is location-only when older payloads lack effective minimum');
check(!stock.includes('return locationMinimum > 0 ? locationMinimum : toNumber(item.product_min_stock);'), 'Stock page no longer repeats Product minimum per location');
check(stockRisk.includes('return Math.max(toNumber(item.min_quantity), 0);'), 'Enterprise Stock Risk fallback is location-only');
check(!stockRisk.includes('toNumber(item.product_min_stock)'), 'Enterprise Stock Risk cannot reintroduce Product-per-location fallback');
check(operations.includes('item.effective_min_quantity ?? item.min_quantity ?? 0'), 'Enterprise Operations Dashboard uses effective location minimum without Product fallback');
check(dashboard.includes("<th style={styles.th}>{ui('Minimum')}</th>"), 'Dashboard low-stock table presents the configured location minimum explicitly');
check(alerts.includes('storage_location_id?: string | null;') && alerts.includes('storage_location_name?: string | null;'), 'Alerts page accepts location-scoped alert evidence');
check(alerts.includes("alert.storage_location_name ? ` · ${ui('Location:')} ${alert.storage_location_name}` : ''"), 'Alerts queue visibly shows the affected storage location');

console.log(`PASS - v3.49.133 threshold/alert frontend remediation (${checks.length}/${checks.length})`);
for (const message of checks) console.log(`PASS - ${message}`);
