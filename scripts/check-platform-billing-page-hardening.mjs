import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformBillingPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformBillingPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const pageAnchors = [
  "import './PlatformBillingPage.css'",
  'OperationalWorkspaceHero', 'OperationalWorkspaceStats', 'OperationalSectionHeader', 'useSearchParams',
  "workspace: 'true'", 'tenant_id', 'status', 'search', 'limit', 'offset', 'Previous', 'Next',
  'Showing the last successful Billing snapshot.', 'Platform-user identity evidence is restricted.', 'PLATFORM_USERS_READ',
  '/status', 'Record subscription renewal', 'does <strong>not</strong> create payment-received evidence',
  "const manualEventTypes = ['note', 'invoice_sent']", 'Provider-generated payment success and internal status/plan-change events cannot be forged here.',
  'target_type=platform_billing_events&target_id=', 'payment-provider webhook application evidence',
  'without confusing internal records with external settlement or customer receipt',
  'PLATFORM_BILLING_READ + TENANTS_READ'
];
for (const token of pageAnchors) {
  if (!page.includes(token)) throw new Error(`Platform Billing page hardening missing: ${token}`);
}

for (const token of ['.platform-billing__filters', '.platform-billing__table-wrap', '.platform-billing__workbench-grid', '.platform-billing__history', '.platform-billing__truth-grid', '@media(max-width:680px)']) {
  if (!css.includes(token)) throw new Error(`Platform Billing CSS hardening missing: ${token}`);
}

const routeStart = router.indexOf("path: 'billing'");
const routeSlice = router.slice(routeStart, routeStart + 420);
if (routeStart < 0 || !routeSlice.includes('PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ') || !routeSlice.includes('PLATFORM_PERMISSIONS.TENANTS_READ')) {
  throw new Error('Platform Billing route must require PLATFORM_BILLING_READ + TENANTS_READ.');
}
const navStart = layout.indexOf('to="/platform/billing"');
const navSlice = layout.slice(Math.max(0, navStart - 360), navStart + 280);
if (navStart < 0 || !navSlice.includes('PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ') || !navSlice.includes('PLATFORM_PERMISSIONS.TENANTS_READ')) {
  throw new Error('Platform Billing sidebar must require PLATFORM_BILLING_READ + TENANTS_READ.');
}
if (page.includes("const manualEventTypes = ['note', 'invoice_sent', 'payment_failed'")) throw new Error('Platform Billing manual events must not expose lifecycle payment failure.');
if (page.includes("event_type: 'payment_received'")) throw new Error('Platform Billing operator UI must not manufacture payment_received events.');
if (!pkg.scripts?.['check:platform-billing-page-hardening']) throw new Error('Platform Billing checker script missing from package.json.');
if (!pkg.scripts?.['check:ci']?.includes('check:platform-billing-page-hardening')) throw new Error('Platform Billing checker is not wired into check:ci.');

console.log('Platform Billing page hardening check: PASS');
