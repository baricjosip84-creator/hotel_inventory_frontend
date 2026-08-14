import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  'index.html',
  'src/pages/LoginPage.tsx',
  'src/pages/PlatformProvisioningPresetsPage.tsx',
  'src/layouts/AppLayout.tsx',
  'src/app/navigationRegistry.ts'
];
const joined = files.map((relative) => fs.readFileSync(path.join(root, relative), 'utf8')).join('\n');

for (const forbidden of [
  'HOTEL INVENTORY PLATFORM',
  'you@hotel.com',
  '<title>hotel-inventory-frontend</title>',
  'placeholder="hotel-premium"',
  'Multi-tenant control center',
  'Priority:',
  'Route:',
  'permission-gated',
  'Tenant: {tenantAccess.tenantId',
  'Runner is disabled and nothing executes automatically yet.'
]) {
  if (joined.includes(forbidden)) throw new Error(`Generic customer branding contract failed: found legacy customer-facing text ${forbidden}`);
}
for (const expected of [
  'INVENTORY OPERATIONS PLATFORM',
  'you@company.com',
  '<title>Inventory Operations Platform</title>',
  'placeholder="warehouse-standard"'
]) {
  if (!joined.includes(expected)) throw new Error(`Generic customer branding contract failed: missing ${expected}`);
}

console.log('Generic customer branding contract passed: tenant login/browser title and provisioning examples are no longer hotel-specific.');
