import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const pagePath = path.join(root, 'src/pages/TenantSettingsPage.tsx');
const source = fs.readFileSync(pagePath, 'utf8');

const required = [
  "refetchOnWindowFocus: false",
  "staleTime: 30_000",
  "Current Tenant",
  "UNSAVED CHANGES",
  "Tenant write lock is active.",
  "Save or reset your unsaved changes before refreshing tenant settings.",
  "Season end cannot be before season start.",
  "Tenant-base costs and valuation. No automatic FX conversion.",
  "Legacy currency confirmation required",
  "disabled={!canUpdateTenants || isWriteLocked || isSaving || !isDirty || !formValid}",
  "queryClient.setQueryData<TenantSettingsRow[]>(['tenants'], [tenant])"
];

for (const anchor of required) {
  if (!source.includes(anchor)) {
    console.error(`[tenant-settings-hardening] missing required anchor: ${anchor}`);
    process.exit(1);
  }
}

const forbidden = [
  'Metadata JSON',
  'selectedTenantId',
  'setSelectedTenantId',
  "setSuccessMessage('Tenant settings updated. Inventory currency"
];

for (const anchor of forbidden) {
  if (source.includes(anchor)) {
    console.error(`[tenant-settings-hardening] forbidden legacy anchor still present: ${anchor}`);
    process.exit(1);
  }
}

console.log('Tenant Settings page hardening check passed.');
