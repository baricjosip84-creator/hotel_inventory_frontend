#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8');
const attentionItems = read('src/lib/sidebarAttentionItems.ts');
const permissions = read('src/lib/permissions.ts');
const permissionPolicies = read('src/lib/permissionPolicies.ts');
const layout = read('src/layouts/AppLayout.tsx');
const pkg = JSON.parse(read('package.json'));

const checks = [];
const check = (condition, label) => checks.push({ condition: Boolean(condition), label });
const has = (source, signal) => source.includes(signal);

check(has(permissionPolicies, 'loaded_at: new Date().toISOString()'), 'permission refresh still records freshness normally');
check(has(layout, "window.addEventListener('focus', refreshPermissions)"), 'window-focus permission refresh remains intact');
check(has(layout, "document.addEventListener('visibilitychange', onVisibilityChange)"), 'visibility permission refresh remains intact');
check(has(permissions, 'TENANT_PERMISSION_SNAPSHOT_EVENT'), 'permission snapshot change event remains intact');

check(has(attentionItems, 'const permissionKey = permissionSnapshot'), 'exact-record attention retains permission-scoped cache identity');
check(has(attentionItems, "[...permissionSnapshot.permissions].sort().join(',')"), 'permission cache identity is derived from the stable effective permission set');
check(has(attentionItems, "permissionSnapshot.custom_role_id || 'standard-role'"), 'custom-role identity remains part of the exact attention cache scope');
check(!has(attentionItems, "permissionSnapshot?.loaded_at || 'no-permission-snapshot'"), 'volatile permission loaded_at is no longer used as an attention query key');
check(!/permissionKey\s*=\s*[^;]*loaded_at/s.test(attentionItems), 'no loaded_at-based permission cache identity remains');
check(has(attentionItems, "queryKey: ['tenant-sidebar', 'operational-navigation-attention', 'items', surface, identityKey, permissionKey]"), 'exact attention query still keeps tenant/user/role/permission isolation');
check(has(attentionItems, 'refetchOnWindowFocus: true'), 'focus still refreshes exact attention using the same stable query rather than a blank replacement query');
check(has(attentionItems, 'staleTime: 30_000'), 'existing exact-attention freshness policy remains unchanged');
check(has(attentionItems, 'retry: 1'), 'existing exact-attention retry behavior remains unchanged');

check(pkg.scripts?.['check:inventory-testing-hardening-v349244'] === 'node scripts/check-inventory-testing-hardening-v349244.mjs', 'v3.49.244 frontend guard is registered');
for (const scriptName of ['prelint', 'prebuild', 'check:ci']) {
  const value = String(pkg.scripts?.[scriptName] || '');
  const previous = value.indexOf('check:inventory-testing-hardening-v349243');
  const current = value.indexOf('check:inventory-testing-hardening-v349244');
  check(previous >= 0 && current > previous, `v3.49.244 follows v3.49.243 in ${scriptName}`);
}

const failed = checks.filter((item) => !item.condition);
for (const item of checks) console.log(`${item.condition ? 'PASS' : 'FAIL'}: ${item.label}`);
if (failed.length) {
  console.error(`\nv3.49.244 Page attention stability guard: ${checks.length - failed.length}/${checks.length} PASS`);
  process.exit(1);
}
console.log(`\nv3.49.244 Page attention stability guard: ${checks.length}/${checks.length} PASS`);
