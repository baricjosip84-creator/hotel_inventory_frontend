import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const pagePath = path.join(root, 'src/pages/TenantSettingsPage.tsx');
const source = fs.readFileSync(pagePath, 'utf8');
const cssPath = path.join(root, 'src/pages/TenantSettingsPage.css');
const cssSource = fs.readFileSync(cssPath, 'utf8');

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
  "Discard unsaved tenant settings and leave this page?",
  "window.addEventListener('beforeunload', warnBeforeUnload)",
  "Confirm the inventory currency before saving this currency change.",
  "You changed the currency. Confirm it above before saving.",
  "Enter a valid business email address.",
  "disabled={!canUpdateTenants || isWriteLocked || isSaving || !isDirty || !formValid}",
  "queryClient.setQueryData<TenantSettingsRow[]>(['tenants'], [tenant])",
  "OperationalWorkspaceHero",
  "OperationalWorkspaceStats",
  "OperationalSectionHeader",
  "tenant-settings-page io-operational-page io-workspace-page",
  "Supplier document identity",
  "Governance & accounting controls",
  "Tenant-managed",
  "Tenant settings only",
  "formatOrganizationTypeLabel",
  "tenant-settings-current-card__organization-type",
  "tenant-settings-organization-type-input"
];

for (const anchor of required) {
  if (!source.includes(anchor)) {
    console.error(`[tenant-settings-hardening] missing required anchor: ${anchor}`);
    process.exit(1);
  }
}

const requiredCss = [
  '.tenant-settings-record',
  '.tenant-settings-form-group',
  '.tenant-settings-control-grid',
  '.tenant-settings-currency-block',
  '.tenant-settings-record-item--id > strong',
  '.tenant-settings-page .app-button:disabled',
  'text-transform: capitalize',
  '@media (max-width: 820px)'
];

for (const anchor of requiredCss) {
  if (!cssSource.includes(anchor)) {
    console.error(`[tenant-settings-hardening] missing required UI CSS anchor: ${anchor}`);
    process.exit(1);
  }
}

const forbidden = [
  'Metadata JSON',
  'selectedTenantId',
  'setSelectedTenantId',
  "setSuccessMessage('Tenant settings updated. Inventory currency",
  'Platform controls excluded',
  "? 'Editable'"
];

for (const anchor of forbidden) {
  if (source.includes(anchor)) {
    console.error(`[tenant-settings-hardening] forbidden legacy anchor still present: ${anchor}`);
    process.exit(1);
  }
}

console.log('Tenant Settings page hardening check passed.');
