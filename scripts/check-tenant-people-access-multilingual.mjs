import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translations = read('src/i18n/tenantUiTranslations.ts');
const provider = read('src/i18n/I18nProvider.tsx');
const context = read('src/i18n/I18nContext.ts');
const targets = [
  'src/pages/UsersPage.tsx',
  'src/pages/TenantPermissionsPage.tsx',
  'src/pages/SessionsPage.tsx',
  'src/components/permissions/RolePermissionEditor.tsx'
];

if (!context.includes('ui: (englishText: string) => string')) fail('I18n context must expose the tenant UI translator.');
else pass('I18n context exposes tenant UI translation.');
if (!provider.includes('translateTenantUi(locale, englishText)')) fail('I18n provider must bind tenant UI translation to the active locale.');
else pass('I18n provider binds tenant UI translation to the active locale.');

const requiredCatalogPhrases = [
  'People & access', 'Create tenant user', 'Deactivate user',
  'Tenant permission management', 'Save permissions for', 'Custom role library',
  'Sessions', 'No sessions on this page', 'support-session access · refreshed',
  'Search permissions', 'Protected role baselines', 'permission work areas'
];
for (const phrase of requiredCatalogPhrases) {
  if (!translations.includes(JSON.stringify(phrase))) fail(`Missing tenant people/access translation row: ${phrase}`);
}
if (!process.exitCode) pass(`${requiredCatalogPhrases.length} representative people/access translation rows are present.`);

for (const file of targets) {
  const source = read(file);
  if (!source.includes('useAppTranslation')) fail(`${file} must use the shared translation context.`);
  if (!source.includes('ui(')) fail(`${file} must render localized UI strings.`);
  else pass(`${file} uses the shared localized UI contract.`);
}

const users = read('src/pages/UsersPage.tsx');
if (!users.includes('toLocaleString(locale)')) fail('Users page dates must be formatted with the selected locale.');
if (users.includes("return { email: 'This email is already used by another tenant user.' }")) fail('Users mutation validation must not return hard-coded English UI text.');
if (users.includes('`Deactivate user "${user.name}"?')) fail('Users lifecycle confirmation must be localized.');
else pass('Users validation, lifecycle messaging and dates are localization-aware.');

const sessions = read('src/pages/SessionsPage.tsx');
if (!sessions.includes('toLocaleString(locale)')) fail('Sessions page dates must be formatted with the selected locale.');
if (sessions.includes("return 'No sessions on this page'")) fail('Sessions pagination state must be localized.');
if (sessions.includes('`support-session access · refreshed ${')) fail('Sessions hero metadata must be localized.');
else pass('Sessions state, device metadata and timestamps are localization-aware.');

const permissions = read('src/pages/TenantPermissionsPage.tsx');
if (permissions.includes('setErrorMessage(RESERVED_TENANT_CUSTOM_ROLE_NAME_MESSAGE)')) fail('Reserved-role validation must pass through translation.');
if (permissions.includes('`Save permissions for ${roleName(activeRole)}?')) fail('Permission save confirmation must be localized.');
else pass('Tenant permission lifecycle messaging is localization-aware.');

const editor = read('src/components/permissions/RolePermissionEditor.tsx');
if (editor.includes('`${role.override_count} saved overrides`')) fail('Role editor override metadata must be localized.');
if (editor.includes('`Requires: ${(dependencyMap')) fail('Role editor dependency tooltip must be localized.');
else pass('Shared role permission editor metadata is localization-aware.');

if (!process.exitCode) console.log('Tenant people/access multilingual hardening: PASS');
