import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/InventoryCapabilitiesPage.tsx'), 'utf8');
const api = fs.readFileSync(path.join(root, 'src/lib/api.ts'), 'utf8');
const backendRoot = process.env.BACKEND_ROOT;
const backend = backendRoot ? fs.readFileSync(path.join(backendRoot, 'src/services/inventory/inventoryCapabilitiesService.js'), 'utf8') : '';
const auth = backendRoot ? fs.readFileSync(path.join(backendRoot, 'src/middleware/tenantApiKeyAuth.js'), 'utf8') : '';
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) {
    console.error(`FAIL ${checks}: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS ${checks}: ${message}`);
  }
}

check(page.includes("useState<{ value: string; clientId: string } | null>(null)"), 'one-time API secret is associated with its API-client id');
check(page.includes("setRevealedKey({ value: data.api_key, clientId: data.id })"), 'created or rotated API secret records the owning client id');
check(page.includes("if (revealedKey?.clientId === client.id) setRevealedKey(null)"), 'revoking the displayed API client clears its one-time secret immediately');
check(page.includes("onSuccess: (_data, client) =>"), 'revoke success handler receives the exact API client that was revoked');
check(page.includes("/inventory-capabilities/api-clients/${client.id}/revoke"), 'revoke still targets the selected API client');
check(page.includes("version: client.version"), 'revoke still preserves optimistic version control');
check(page.includes("reason: 'Revoked from tenant Integrations page'"), 'revoke still records its audit reason');
check(page.includes("{revealedKey.value}"), 'one-time banner renders only the tracked secret value');
check(page.includes("Copy this key now. It is only shown once:"), 'one-time secret disclosure warning remains intact');
check(page.includes("client.status === 'active' && canWrite"), 'revoked clients still lose management actions in the table');
check(api.includes("return 'API key revoked successfully.';"), 'shared mutation feedback remains revoke-specific');
check(api.includes("return 'API key secret rotated successfully.';"), 'shared mutation feedback remains rotation-specific');

if (backendRoot) {
  check(backend.includes("SET status = 'revoked', revoked_at = NOW()"), 'backend revoke still marks tenant API client revoked');
  check(backend.includes('revoked_by_user_id'), 'backend revoke still records the revoking user');
  check(backend.includes('revoke_reason'), 'backend revoke still records the reason');
  check(auth.includes("status='active' AND revoked_at IS NULL"), 'tenant API authentication still accepts only active non-revoked client credentials');
  check(auth.includes('API key is invalid, expired, or revoked'), 'revoked API key authentication failure remains explicit');
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`API-key secret hygiene surgical guard PASS (${checks}/${checks})`);
