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

const permissions = read('src/lib/permissions.ts');
const usagePage = read('src/pages/InventoryUsagePage.tsx');
const stockPage = read('src/pages/StockPage.tsx');

const roleBlock = (role, nextRole) => {
  const start = permissions.indexOf(`  ${role}: Object.freeze([`);
  const end = nextRole
    ? permissions.indexOf(`  ${nextRole}: Object.freeze([`, start + 1)
    : permissions.indexOf('\n  ]),\n});', start + 1);
  if (start < 0 || end < 0) throw new Error(`FAIL - could not resolve ${role} frontend permission block`);
  return permissions.slice(start, end);
};

const admin = roleBlock('admin', 'manager');
const manager = roleBlock('manager', 'support_read_only');
const staff = roleBlock('staff', null);

// F-0002 — Admin stays non-operational by default, but UI follows effective permissions when explicitly opted in.
for (const permission of [
  'TENANT_PERMISSIONS.STOCK_CONSUME',
  'TENANT_PERMISSIONS.INVENTORY_USAGE_RECORD',
  'TENANT_PERMISSIONS.INVENTORY_USAGE_BULK_RECORD',
  'TENANT_PERMISSIONS.INVENTORY_USAGE_RUN_SCHEDULED'
]) check(!admin.includes(permission), `frontend Admin fallback omits ${permission} by default`);
check(manager.includes('TENANT_PERMISSIONS.STOCK_CONSUME') && manager.includes('TENANT_PERMISSIONS.INVENTORY_USAGE_RECORD') && manager.includes('TENANT_PERMISSIONS.INVENTORY_USAGE_RUN_SCHEDULED'), 'frontend Manager fallback retains direct and scheduled usage execution');
check(staff.includes('TENANT_PERMISSIONS.STOCK_CONSUME') && staff.includes('TENANT_PERMISSIONS.INVENTORY_USAGE_RECORD'), 'frontend Staff fallback retains ordinary usage execution');
check(usagePage.includes('const canRecordStockUsage = permissions.canConsumeStock && permissions.canRecordInventoryUsage;'), 'Inventory Usage direct-record action follows effective permissions instead of role name');
check(usagePage.includes('const canBulkRecordStockUsage = permissions.canConsumeStock && permissions.canBulkRecordInventoryUsage;'), 'Inventory Usage bulk-record action follows effective permissions instead of role name');
check(stockPage.includes('const canConsume = canConsumeStock && canRecordInventoryUsage;'), 'Stock consume action follows effective permissions instead of role name');
check(!usagePage.includes('!permissions.isAdmin') && !stockPage.includes('!isAdmin && canConsumeStock'), 'no frontend Admin-name hard block overrides explicit owner/operator permission opt-in');

// F-0023 — scheduled UI is only actionable when wrapper and underlying mutation authority are all present.
check(permissions.includes('canRunScheduledInventoryUsage:\n      can(TENANT_PERMISSIONS.INVENTORY_USAGE_RUN_SCHEDULED) &&\n      can(TENANT_PERMISSIONS.STOCK_CONSUME) &&\n      can(TENANT_PERMISSIONS.INVENTORY_USAGE_RECORD),'), 'scheduled usage capability composes wrapper, stock-consume, and ordinary-record permissions');
check(usagePage.includes('canRunScheduled: permissions.canRunScheduledInventoryUsage,'), 'Inventory Usage page passes the composed scheduled capability into its dashboard');

console.log(`PASS - v3.49.137 usage permission consistency frontend (${checks.length}/${checks.length})`);
for (const message of checks) console.log(`PASS - ${message}`);
