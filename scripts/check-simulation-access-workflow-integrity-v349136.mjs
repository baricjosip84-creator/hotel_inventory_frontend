#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const checks = [];
const check = (condition, message) => {
  if (!condition) throw new Error(`FAIL - ${message}`);
  checks.push(message);
};

const permissions = read('src/lib/permissions.ts');
const policyTypes = read('src/lib/permissionPolicies.ts');
const editor = read('src/components/permissions/RolePermissionEditor.tsx');
const page = read('src/pages/TenantPermissionsPage.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');

// F-0012
const staffBlock = permissions.slice(permissions.indexOf('staff: Object.freeze(['), permissions.indexOf('])', permissions.indexOf('staff: Object.freeze([')) + 2);
check(staffBlock.includes('TENANT_PERMISSIONS.INVENTORY_REQUISITIONS_CANCEL_OWN'), 'frontend Staff fallback includes Cancel Own for inventory requisitions');
check(!staffBlock.includes('TENANT_PERMISSIONS.INVENTORY_REQUISITIONS_CANCEL_ANY'), 'frontend Staff fallback does not include Cancel Any');

// F-0011
check(policyTypes.includes('user_count?: number | null;'), 'tenant role policy type carries assignment count');
check(editor.includes('{role.user_count ?? 0} {ui("assigned users")}'), 'built-in role cards show real assignment impact');
check(editor.includes('${activeRole.user_count ?? 0} ${ui("assigned users")}'), 'built-in role editor repeats assignment impact before changes are saved');

// F-0015
check(policyTypes.includes('active_user_count?: number | null;') && policyTypes.includes('inactive_user_count?: number | null;'), 'custom-role policy type distinguishes active and inactive assignments');
check(page.includes('(activeRole.active_user_count || 0) > 0'), 'custom-role lifecycle warning is driven by active assignments');
check(page.includes('inactive historical assignment is preserved. This role can be deactivated, but not deleted until the assignment is removed.'), 'single inactive historical assignment is explained without blocking deactivation');
check(page.includes('inactive historical assignments are preserved. This role can be deactivated, but not deleted until the assignments are removed.'), 'multiple inactive historical assignments are explained without blocking deactivation');
check(page.includes('Reassign or deactivate active users before deactivating this custom role.'), 'deactivation error explains the actual active-user blocker');
check(page.includes('activeRole.can_deactivate === false'), 'UI still obeys backend lifecycle capability rather than bypassing it');
check(page.includes('activeRole.can_delete === false'), 'UI keeps deletion separate from deactivation safety');
check(translations.includes('["Reassign or deactivate active users before deactivating this custom role."'), 'new role lifecycle guidance is translated across tenant locales');
check(translations.includes('["inactive historical assignment is preserved. This role can be deactivated, but not deleted until the assignment is removed."'), 'historical-assignment guidance is translated across tenant locales');

console.log(`PASS - v3.49.136 access and workflow integrity frontend (${checks.length}/${checks.length})`);
for (const message of checks) console.log(`PASS - ${message}`);
