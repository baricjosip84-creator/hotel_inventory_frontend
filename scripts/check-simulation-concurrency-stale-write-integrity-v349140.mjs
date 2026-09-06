import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
const check = (name, condition) => checks.push({ name, condition: Boolean(condition) });

const users = read('src/pages/UsersPage.tsx');
const permissionApi = read('src/lib/permissionPolicies.ts');
const permissionPage = read('src/pages/TenantPermissionsPage.tsx');
const requisitions = read('src/pages/InventoryRequisitionsPage.tsx');
const reservations = read('src/pages/InventoryReservationsPage.tsx');
const types = read('src/components/enterpriseInventory/EnterpriseInventoryTypes.ts');
const forms = read('src/components/enterpriseInventory/EnterpriseInventoryForms.ts');
const payloads = read('src/components/enterpriseInventory/EnterpriseInventoryPayloads.ts');
const supplierCatalog = read('src/components/enterpriseInventory/tabs/SupplierCatalogsTab.tsx');
const parLevels = read('src/components/enterpriseInventory/tabs/ParLevelsTab.tsx');
const pkg = read('package.json');

check('user model carries revision', users.includes('revision: string;'));
check('user edit sends expected revision', users.includes('expected_revision: input.revision'));
check('user edit preserves loaded revision', users.includes('revision: editingUser.revision'));

check('tenant permission API requires expected revision argument', /saveTenantRolePermissionPolicy\([\s\S]{0,180}expectedRevision: string/.test(permissionApi));
check('tenant permission save sends expected revision', permissionApi.includes('body: JSON.stringify({ permissions, expected_revision: expectedRevision })'));
check('tenant permission reset sends expected revision', permissionApi.includes('body: JSON.stringify({ expected_revision: expectedRevision })'));
check('tenant permission page passes active revision on save', permissionPage.includes('draftPermissions, activeRole.revision'));
check('tenant permission page passes active revision on reset', permissionPage.includes('activeRole.role as BuiltInTenantRole, activeRole.revision'));
check('tenant permission page fails closed if revision missing', permissionPage.includes('if (!activeRole.revision) throw new Error'));

check('requisition edit retains loaded version', requisitions.includes('editingDraftVersion'));
check('requisition edit sends If-Match-Version', requisitions.includes("'If-Match-Version': String(editingDraftVersion)"));
check('requisition edit captures selected version', requisitions.includes('setEditingDraftVersion(selected.version)'));
check('requisition cancel clears edit version', requisitions.includes('setEditingDraftVersion(null)'));

check('reservation model carries version', /type InventoryReservation = \{[\s\S]{0,80}version: number \| string;/.test(reservations));
check('reservation edit mutation requires version input', reservations.includes('{ id: string; version: number | string; draft: ReservationDraft }'));
check('reservation edit sends If-Match-Version', reservations.includes("'If-Match-Version': String(version)"));
check('reservation edit passes selected version', reservations.includes('version: selectedReservation.version'));

check('supplier catalog form carries expected version', /export type SupplierCatalogForm = \{[\s\S]{0,80}expected_version: number \| string \| null;/.test(types));
check('supplier catalog empty form starts create mode', /emptySupplierCatalogForm:[\s\S]{0,100}expected_version: null/.test(forms));
check('supplier catalog payload includes expected version', /buildSupplierCatalogPayload[\s\S]{0,180}expected_version: Number\(input\.expected_version\)/.test(payloads));
check('supplier catalog edit captures item version', supplierCatalog.includes('expected_version: item.version'));
check('supplier catalog edit locks identity selectors', supplierCatalog.includes('createSupplierCatalogMutation.isPending || editing'));
check('supplier catalog edit offers cancel', supplierCatalog.includes("ui('Cancel edit')"));

check('par level model carries version', /export type ParLevel = \{[\s\S]{0,80}version: number \| string;/.test(types));
check('par level form carries expected version', /export type ParLevelForm = \{[\s\S]{0,80}expected_version: number \| string \| null;/.test(types));
check('par level empty form starts create mode', /emptyParLevelForm:[\s\S]{0,100}expected_version: null/.test(forms));
check('par level payload includes expected version', /buildParLevelPayload[\s\S]{0,180}expected_version: Number\(input\.expected_version\)/.test(payloads));
check('par level table exposes edit action', parLevels.includes('onClick={() => edit(item)}'));
check('par level edit captures item version', parLevels.includes('expected_version: item.version'));
check('par level edit locks identity fields', parLevels.includes('disabled={!canWriteParLevels || editing}'));
check('par level edit offers cancel', parLevels.includes("ui('Cancel edit')"));
check('v140 checker wired into check:ci', pkg.includes('check:simulation-concurrency-stale-write-integrity-v349140'));

let passed = 0;
for (const item of checks) {
  if (item.condition) { passed += 1; console.log(`PASS ${item.name}`); }
  else console.error(`FAIL ${item.name}`);
}
console.log(`v3.49.140 concurrency stale-write integrity frontend: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);
