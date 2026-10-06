import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const audit = read('src/pages/TenantAuditPage.tsx');
const auditCss = read('src/pages/TenantAuditPage.css');
const permissions = read('src/pages/TenantPermissionsPage.tsx');
const permissionsCss = read('src/pages/TenantPermissionsPage.css');
const roleEditorCss = read('src/components/permissions/RolePermissionEditor.css');
const users = read('src/pages/UsersPage.tsx');

const checks = [
  [audit.includes("queryFn: () => apiRequest<TenantAuditFilterOptions>('/audit/filter-options')"), 'Tenant Audit loads tenant-scoped filter options'],
  [audit.includes("ui('All actions')"), 'Tenant Audit exposes a human-readable all-actions selector'],
  [audit.includes("ui('All entities')"), 'Tenant Audit exposes a human-readable all-entities selector'],
  [audit.includes("Choose the business action you recognize. Exact audit codes stay behind the selector."), 'Tenant Audit explains business-action selection'],
  [audit.includes("Choose the business record type instead of guessing an internal entity name."), 'Tenant Audit explains business-entity selection'],
  [audit.includes('tenant-audit-filter-pending'), 'Tenant Audit marks unapplied filter changes'],
  [audit.includes('tenant-audit-filter-applied'), 'Tenant Audit marks active applied filters'],
  [auditCss.includes('.tenant-audit-filter-pending'), 'Tenant Audit pending-filter state has dedicated styling'],
  [permissions.includes('CUSTOM_ROLE_NAME_MAX_LENGTH = 80'), 'Custom-role name limit is explicit in source'],
  [permissions.includes('tenant-custom-role-name-count'), 'Create custom-role form exposes a name character counter'],
  [permissions.includes('tenant-custom-role-manage-name-count'), 'Manage custom-role form exposes a name character counter'],
  [permissionsCss.includes('overflow-wrap: anywhere'), 'Long custom-role names wrap safely in role cards'],
  [roleEditorCss.includes('position: fixed;') && roleEditorCss.includes('.role-permission-editor__message'), 'Permissions completion feedback stays visible in the viewport'],
  [users.includes('This email is already used by another tenant user.'), 'Users duplicate-email error remains business-readable'],
  [users.includes('Permanently delete inactive user'), 'Users permanent-delete confirmation remains record-specific and consequence-aware']
];

const failures = checks.filter(([passed]) => !passed);
for (const [passed, message] of checks) console.log(`${passed ? 'PASS' : 'FAIL'}: ${message}`);
if (failures.length) process.exit(1);
