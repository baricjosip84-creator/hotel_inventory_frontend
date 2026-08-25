import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const pageFiles = [
  'src/pages/PlatformUsersPage.tsx',
  'src/pages/PlatformPermissionsPage.tsx',
  'src/pages/PlatformSessionsPage.tsx',
  'src/pages/PlatformBillingPage.tsx',
  'src/pages/PlatformSubscriptionReadinessPage.tsx',
  'src/pages/PlatformLicensePlanEnforcementPage.tsx',
  'src/pages/PlatformCustomerSuccessAdminPage.tsx',
  'src/pages/PlatformEnterpriseIdentityGovernancePage.tsx',
  'src/pages/PlatformNotificationsPage.tsx',
  'src/pages/PlatformSecurityPage.tsx'
];

const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const sources = new Map(pageFiles.map((file) => [file, read(file)]));

for (const [file, source] of sources) {
  const unsafeNestedOptionalRead = source.match(/\?\.[A-Za-z_$][\w$]*\.[A-Za-z_$][\w$]*/g) || [];
  assert(
    unsafeNestedOptionalRead.length === 0,
    `${file} contains unsafe nested optional reads: ${unsafeNestedOptionalRead.join(', ')}`
  );
}

const directWorkspacePages = pageFiles.filter((file) => !file.endsWith('PlatformPermissionsPage.tsx'));
for (const file of directWorkspacePages) {
  const source = sources.get(file);
  assert(source.includes('io-operational-page io-workspace-page'), `${file} must use the shared Operational Workspace root.`);
  assert(source.includes('OperationalWorkspaceHero'), `${file} must use the shared Operational Workspace hero.`);
  assert(source.includes('io-workspace-panel'), `${file} must use shared Operational Workspace panel surfaces.`);
}

const permissionsSource = sources.get('src/pages/PlatformPermissionsPage.tsx');
const roleEditorSource = read('src/components/permissions/RolePermissionEditor.tsx');
assert(permissionsSource.includes('operationalWorkspace'), 'Platform Permissions must render RolePermissionEditor in Operational Workspace mode.');
assert(permissionsSource.includes('io-workspace-panel platform-permissions__evidence'), 'Platform Permissions evidence footer must use the shared workspace panel surface.');
assert(roleEditorSource.includes('io-operational-page io-workspace-page'), 'Operational RolePermissionEditor must use the shared workspace root classes.');

const sharedWorkspaceCss = read('src/components/ui/OperationalWorkspace.css');
assert(sharedWorkspaceCss.includes('.io-workspace-page .io-workspace-panel'), 'Shared Operational Workspace CSS must define panel framing.');
assert(sharedWorkspaceCss.includes('.io-workspace-page .io-workspace-card'), 'Shared Operational Workspace CSS must define card framing.');

const requiredRuntimeGuards = [
  ['src/pages/PlatformUsersPage.tsx', ['Array.isArray(rawData)', 'Array.isArray(data?.users)']],
  ['src/pages/PlatformPermissionsPage.tsx', ['Array.isArray(query.data?.roles)', 'Array.isArray(query.data?.permission_catalog)']],
  ['src/pages/PlatformSessionsPage.tsx', ['Array.isArray(data?.sessions)', 'Array.isArray(usersQuery.data)']],
  ['src/pages/PlatformBillingPage.tsx', ['Array.isArray(data?.tenants)', 'Array.isArray(detailsQuery.data?.events)', 'Array.isArray(catalogQuery.data?.plans)', 'Array.isArray(reconciliationResult?.actions)']],
  ['src/pages/PlatformSubscriptionReadinessPage.tsx', ['Array.isArray(data?.items)', 'Array.isArray(item.risk_flags)']],
  ['src/pages/PlatformLicensePlanEnforcementPage.tsx', ['Array.isArray(data?.plan_definitions)', 'Array.isArray(data?.items)', 'Array.isArray(item.enforcement_gaps)']],
  ['src/pages/PlatformCustomerSuccessAdminPage.tsx', ['Array.isArray(data?.items)', 'Array.isArray(data?.omitted_sources)', 'data?.evidence_access ||']],
  ['src/pages/PlatformEnterpriseIdentityGovernancePage.tsx', ['Array.isArray(data?.enabled_providers)', 'Array.isArray(data?.configuration_attention)', 'Object.entries(data?.config?.providers || {})']],
  ['src/pages/PlatformNotificationsPage.tsx', ['Array.isArray(data?.notifications)', 'Array.isArray(summaryRaw.by_status)', 'summaryRaw.evidence_access || {}']],
  ['src/pages/PlatformSecurityPage.tsx', ['Array.isArray(adminData?.users)', 'Array.isArray(adminData?.active_sessions)', 'Array.isArray(adminData?.omitted_sources)']]
];

for (const [file, snippets] of requiredRuntimeGuards) {
  const source = sources.get(file);
  for (const snippet of snippets) {
    assert(source.includes(snippet), `${file} is missing runtime response-shape guard: ${snippet}`);
  }
}

const historicalCrashPatterns = [
  'data?.users.length',
  'data?.evidence_access.platform_user_identity',
  'data?.enabled_providers.length',
  'data?.configuration_attention.length',
  'data?.runtime_attention.length',
  'data?.pagination.total'
];
for (const pattern of historicalCrashPatterns) {
  for (const [file, source] of sources) {
    assert(!source.includes(pattern), `${file} reintroduced production crash pattern: ${pattern}`);
  }
}

if (failures.length) {
  console.error('Platform UI/runtime-shape hardening check: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Platform UI/runtime-shape hardening check: PASS');
console.log(`Validated ${pageFiles.length} Platform pages for shared workspace UI and deployment-skew-safe response handling.`);
