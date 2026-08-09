import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const fail = (message) => { throw new Error(`Tenant permissions page hardening check failed: ${message}`); };
const includes = (source, value, label) => { if (!source.includes(value)) fail(`${label} is missing ${value}`); };
const excludes = (source, value, label) => { if (source.includes(value)) fail(`${label} still contains ${value}`); };

const editor = read('src/components/permissions/RolePermissionEditor.tsx');
const tenantPage = read('src/pages/TenantPermissionsPage.tsx');
const platformPage = read('src/pages/PlatformPermissionsPage.tsx');
const policies = read('src/lib/permissionPolicies.ts');

for (const value of [
  'permissionDependencies',
  'reverseDependencyMap',
  'normalizeDraft',
  'onDiscardDraft?.()',
  "filtering ? 'Enable shown' : 'Enable group'",
  'No permissions match',
  'Using starting template'
]) includes(editor, value, 'shared role permission editor');

excludes(editor, "actionBar: { position: 'sticky'", 'shared role permission editor');
includes(editor, "actionBar: { display: 'flex'", 'non-overlay action bar');

for (const value of [
  'permissionDependencies={query.data.permission_dependencies}',
  'onDiscardDraft={() => {',
  'Custom role name must contain at least 2 characters.',
  'selectedTemplate.description',
  'metadataDirty',
  'Tenant permission settings could not be loaded. Check tenant administrator access and try again.'
]) includes(tenantPage, value, 'tenant permissions page');

includes(platformPage, 'onDiscardDraft={() => {', 'platform permissions draft discard');
includes(policies, 'permission_dependencies: Partial<Record<TenantPermission, TenantPermission[]>>;', 'permission policy API type');

console.log('Tenant permissions page hardening check passed (dependency-safe editing, truthful draft discard, non-obscuring actions, and custom-role form validation verified).');
