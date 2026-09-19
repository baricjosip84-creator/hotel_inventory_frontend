#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const dashboard = read('src/pages/DashboardPage.tsx');
const shipments = read('src/pages/ShipmentsPage.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(read('package.json'));

const checks = [];
const check = (ok, label) => {
  checks.push([Boolean(ok), label]);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
};

const overdueStart = dashboard.indexOf("title={ui('Overdue Shipments')}");
const overdueEnd = dashboard.indexOf("title={ui('Unresolved Alerts')}", overdueStart);
const overdueBlock = dashboard.slice(overdueStart, overdueEnd);
check(
  overdueStart >= 0 && overdueEnd > overdueStart &&
    overdueBlock.includes('style={styles.tableRecordLink}') &&
    overdueBlock.includes("title={ui('Open Shipment')}") &&
    overdueBlock.includes("title={ui('Open Supplier')}") &&
    !overdueBlock.includes('<ActionLink'),
  'Dashboard overdue-shipment rows use clean direct record links instead of cramped action buttons'
);
check(
  dashboard.includes("tableRecordLink: {") && dashboard.includes("textUnderlineOffset: 2"),
  'Dashboard overdue record links have dedicated readable styling'
);

check(shipments.includes("ui('Edit ordered quantity')"),
  'Shipment line-edit controls are explicitly separated from receiving');
check(shipments.includes("ui('Changes the shipment line only; it does not receive stock.')"),
  'Shipment line-edit area explains that it does not receive inventory');
check(shipments.includes("ui('Save ordered quantity')") && shipments.includes("ui('Remove shipment line')"),
  'Ambiguous Save Line/Delete Line labels are replaced with precise actions');
check(shipments.includes('style={styles.receiveLineFieldWide}') && shipments.includes('style={styles.shortageReasonRow}'),
  'Shortage action is placed with its Discrepancy Reason control');
check(shipments.includes("? styles.secondaryButtonDisabled") && shipments.includes("? ui('Enter a discrepancy reason first.')"),
  'Save shortage reason has a visibly disabled state with an explicit explanation');
check(shipments.includes("disabled={\n                                      recordReceivingDiscrepancyMutation.isPending ||\n                                      !draft.discrepancy_reason.trim()"),
  'Save shortage reason remains blocked until a discrepancy reason is entered');
check(!shipments.includes("<div style={styles.receiveLineActionBlock}>\n                              <button\n                                type=\"button\"\n                                data-skip-global-action-feedback=\"true\"\n                                style={{\n                                  ...styles.mobileReceiveButton") || shipments.indexOf("ui('Save shortage reason')") < shipments.indexOf("<div style={styles.receiveLineActionBlock}>"),
  'Shortage action is no longer mixed into the Receive Item action block');

for (const phrase of [
  'Edit ordered quantity',
  'Changes the shipment line only; it does not receive stock.',
  'Save ordered quantity',
  'Remove shipment line',
  'Enter a discrepancy reason first.'
]) {
  check(translations.includes(`["${phrase}"`), `Tenant translation catalog contains: ${phrase}`);
}

check(pkg.scripts['check:inventory-testing-hardening-v349209'] === 'node scripts/check-inventory-testing-hardening-v349209.mjs',
  'v3.49.209 frontend guard is registered');
for (const key of ['prelint', 'prebuild', 'check:ci']) {
  check(pkg.scripts[key]?.includes('check:inventory-testing-hardening-v349208 && npm run check:inventory-testing-hardening-v349209'),
    `v3.49.209 frontend guard follows v3.49.208 in ${key}`);
}

const failed = checks.filter(([ok]) => !ok);
console.log(`v3.49.209 Dashboard/Shipment receiving UX guard: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
