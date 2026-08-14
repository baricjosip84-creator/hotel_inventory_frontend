import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const source = fs.readFileSync(path.join(root, 'src/lib/permissions.ts'), 'utf8');

function roleBlock(role, nextRole) {
  const startMarker = `  ${role}: Object.freeze([`;
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`Missing ${role} permission block`);
  const end = nextRole
    ? source.indexOf(`  ${nextRole}: Object.freeze([`, start + startMarker.length)
    : source.indexOf('\n  ]),\n});', start + startMarker.length);
  if (end < 0) throw new Error(`Could not determine end of ${role} permission block`);
  return source.slice(start, end);
}

const admin = roleBlock('admin', 'manager');
const manager = roleBlock('manager', 'support_read_only');
const staff = roleBlock('staff', null);

for (const permission of [
  'TENANT_PERMISSIONS.STOCK_CONSUME',
  'TENANT_PERMISSIONS.INVENTORY_USAGE_RECORD',
  'TENANT_PERMISSIONS.INVENTORY_USAGE_BULK_RECORD'
]) {
  if (admin.includes(permission)) throw new Error(`Admin fallback must not include ${permission}`);
  if (!manager.includes(permission)) throw new Error(`Manager fallback must retain ${permission}`);
  if (!staff.includes(permission)) throw new Error(`Staff fallback must retain ${permission}`);
}

console.log('Tenant-owner role safety check passed');
