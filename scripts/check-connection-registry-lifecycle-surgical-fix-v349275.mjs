import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const backendRoot = process.env.BACKEND_ROOT || path.resolve(root, '../hotel-inventory-backend');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readBackend = (file) => fs.readFileSync(path.join(backendRoot, file), 'utf8');
let passed = 0;
const check = (condition, label) => {
  if (!condition) throw new Error(`FAIL ${label}`);
  passed += 1;
  console.log(`PASS ${label}`);
};

const page = read('src/pages/InventoryCapabilitiesPage.tsx');
const api = read('src/lib/api.ts');
const i18n = read('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(read('package.json'));
const validation = readBackend('src/validations/inventoryCapabilities.validation.js');
const service = readBackend('src/services/inventory/inventoryCapabilitiesService.js');
const routes = readBackend('src/routes/inventoryCapabilities.js');

check(page.includes('const changeConnectionStatus = useMutation'), 'connection lifecycle mutation exists');
check(page.includes("status: row.status === 'disabled' ? 'configured' : 'disabled'"), 'row lifecycle toggles configured/disabled only');
check(page.includes("row.status === 'disabled' ? ui(\"Enable\") : ui(\"Disable\")"), 'connection table exposes direct Enable/Disable action');
check(page.includes("queryKey: ['inventory-external-connections']"), 'connection list is refreshed after lifecycle changes');
check(page.includes("queryKey: ['inventory-capabilities-overview']"), 'overview is refreshed after lifecycle changes');
check(page.includes('editingConnection?.id === row.id'), 'editing state is cleared if the same connection lifecycle changes');
check(page.includes('disabled={saveConnection.isPending || changeConnectionStatus.isPending}'), 'edit/lifecycle actions are guarded during writes');

check(validation.includes("status: Joi.string().valid('configured', 'disabled', 'error').optional()"), 'status is optional in shared save validation');
check(!validation.includes("status: Joi.string().valid('configured', 'disabled', 'error').default('configured')"), 'validation no longer silently defaults status during edits');
check(service.includes("const hasStatus = Object.prototype.hasOwnProperty.call(body, 'status')"), 'backend distinguishes omitted status from explicit lifecycle change');
check(service.includes('status=CASE WHEN $9::boolean THEN $10 ELSE status END'), 'backend preserves status on ordinary edits');
check(service.includes("? body.status : null"), 'backend binds only supported explicit status values');
check(service.includes("const status = ['configured', 'disabled', 'error'].includes(body.status) ? body.status : 'configured';"), 'new connections still default to configured status');
check(routes.includes("router.post('/connections'"), 'existing governed connection save route remains authoritative');

check(api.includes("return 'Connection disabled successfully.'"), 'disable feedback is action-specific');
check(api.includes("return 'Connection enabled successfully.'"), 'enable feedback is action-specific');
check(api.includes("return 'Connection updated successfully.'"), 'ordinary edit feedback is action-specific');
check(api.includes("return 'Connection saved successfully.'"), 'create feedback is action-specific');
for (const message of ['Connection saved successfully.','Connection updated successfully.','Connection disabled successfully.','Connection enabled successfully.','Unable to update connection status.']) {
  check(i18n.includes(`[\"${message}\"`), `${message} is in tenant translation catalog`);
}
check(pkg.scripts?.['check:inventory-connection-registry-lifecycle-surgical-fix-v349275'] === 'node scripts/check-connection-registry-lifecycle-surgical-fix-v349275.mjs', 'Batch 033 guard is registered');

console.log(`Connection registry lifecycle surgical fix: ${passed}/${passed} PASS`);
