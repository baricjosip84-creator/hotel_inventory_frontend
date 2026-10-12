import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const dashboard = read('src/pages/DashboardPage.tsx');
const customRole = read('src/pages/TenantPermissionsPage.tsx');
const catalog = read('src/i18n/tenantUiTranslations.ts');
const dashboardGuard = read('scripts/check-dashboard-surgical-closure-v34969.mjs');
const roleGuard = read('scripts/check-tenant-custom-role-management.mjs');
let count = 0;
const check = (condition, message) => { if (!condition) throw new Error(`Batch114: ${message}`); count += 1; };
// The historical test must follow the current business-readable Dashboard cards,
// without weakening the original safeguard for user-authored stock movement reasons.
check(dashboard.includes('function dashboardReasonLabel(row: RecentActivityRow, ui:'), 'Dashboard formatter');
check(dashboard.includes("const reason = String(row.reason || '').trim();"), 'raw reason reading');
check(dashboard.includes('return reason;'), 'user-entered reason preserved');
check(dashboard.includes('dashboardReasonLabel(row, ui)'), 'display uses formatter');
for (const phrase of ["reason === 'shipment_receive'", "reason.startsWith('stock_transfer_out:')", "reason.startsWith('outbound_dispatch:')", "reason === 'manual_adjustment'"]) {
  check(dashboard.includes(phrase), `system movement mapping ${phrase}`);
}
check(dashboardGuard.includes('unknown/user-authored reason preserved verbatim'), 'stale Dashboard expectation replaced');
check(!dashboardGuard.includes('raw user-entered movement reason'), 'obsolete raw-table assertion removed');
// Permission guard must still reject a deactivate attempt with active assigned users.
const current = 'Reassign or deactivate active users before deactivating this custom role.';
check(customRole.includes(`setErrorMessage(ui("${current}"))`), 'deactivation warning present');
check(customRole.includes('activeRole.can_deactivate === false'), 'deactivation eligibility guard present');
check(customRole.includes('if (!window.confirm('), 'confirmation retained');
check(customRole.includes('updateTenantCustomRole({ id, version: activeRole.version || 1, is_active: nextActive })'), 'backend action unchanged');
check(roleGuard.includes(`setErrorMessage(ui("${current}"))`), 'regression follows current deactivation warning');
check(!roleGuard.includes('setErrorMessage(ui("Reassign all users before deactivating this custom role."))'), 'stale custom-role expectation removed');
check(catalog.includes(`["${current}",`), 'five-language translation row exists');
check(customRole.includes('Reassign all users before deleting this custom role.'), 'separate delete safeguard retained');
check(roleGuard.includes('Reassign all users before deleting this custom role.'), 'delete regression preserved');
check(dashboardGuard.includes('raw coverage-day number formatting'), 'Dashboard unrelated guards preserved');
console.log(`Batch114 regression contract closure: ${count}/${count} PASS`);
