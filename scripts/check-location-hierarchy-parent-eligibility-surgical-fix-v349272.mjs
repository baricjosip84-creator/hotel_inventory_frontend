import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/InventoryCapabilitiesPage.tsx'), 'utf8');
const translations = fs.readFileSync(path.join(root, 'src/i18n/tenantUiTranslations.ts'), 'utf8');
const backendRoot = process.env.BACKEND_ROOT;
const backend = backendRoot ? fs.readFileSync(path.join(backendRoot, 'src/services/inventory/inventoryCapabilitiesService.js'), 'utf8') : '';
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) {
    console.error(`FAIL ${checks}: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS ${checks}: ${message}`);
  }
}

check(page.includes("const HIERARCHY_TYPE_RANK: Record<string, number> = { warehouse: 0, zone: 1, aisle: 2, rack: 3, shelf: 4, bin: 5 };"), 'frontend uses the same broad-to-specific hierarchy order as the backend');
check(page.includes("function isEligibleHierarchyParent(candidate: Location, childType: string): boolean"), 'frontend has one explicit parent-eligibility rule');
check(page.includes("if (childType === 'warehouse') return false;"), 'warehouse locations cannot be assigned a parent');
check(page.includes("if (parentType === 'bin' || parentType === 'storage') return false;"), 'bins and legacy storage locations are excluded as parents');
check(page.includes("if (childType === 'storage') return true;"), 'legacy storage children may still sit beneath valid container types');
check(page.includes('childRank > parentRank'), 'container hierarchy must move from broader to more specific levels');
check(page.includes('const eligibleParents = useMemo('), 'parent options are derived from the current selected location type');
check(page.includes("location.id !== locationId && isEligibleHierarchyParent(location, type)"), 'the selected location cannot parent itself and candidates are filtered by structural eligibility');
check(page.includes('const selectedParentIsEligible = !parentId || eligibleParents.some'), 'current parent eligibility is tracked explicitly');
check(page.includes('{eligibleParents.map((l) => <option'), 'Parent dropdown renders only eligible normal choices');
check(page.includes('Current parent is not eligible for this type'), 'legacy/current invalid parent remains visible as an explicit non-selectable state');
check(page.includes('disabled>{selectedParent.name}'), 'known-invalid current parent is disabled rather than offered as a valid choice');
check(page.includes('Only locations that can contain the selected type are shown. Bins and legacy storage locations cannot be parents.'), 'Parent field explains why choices are filtered');
check(page.includes('Warehouses must stay at the top level.'), 'warehouse top-level rule is explained before save');
check(page.includes('!selectedParentIsEligible || save.isPending'), 'Save hierarchy is blocked while the current parent is known to be structurally invalid');
check(page.includes('The current parent cannot contain the selected location type. Choose an eligible parent or Top level before saving.'), 'invalid-current-parent state has an immediate recovery message');
check(translations.includes('["Current parent is not eligible for this type"'), 'invalid-parent option label is multilingual');
check(translations.includes('["Warehouses must stay at the top level."'), 'warehouse helper is multilingual');
check(translations.includes('["Only locations that can contain the selected type are shown. Bins and legacy storage locations cannot be parents."'), 'parent-filter explanation is multilingual');
check(translations.includes('["The current parent cannot contain the selected location type. Choose an eligible parent or Top level before saving."'), 'invalid-parent recovery message is multilingual');

if (backendRoot) {
  check(backend.includes("if (effectiveType === 'warehouse' && effectiveParentId)"), 'backend warehouse top-level safeguard remains authoritative');
  check(backend.includes("if (['bin', 'storage'].includes(parentType))"), 'backend still rejects bin/legacy-storage parents');
  check(backend.includes("rank[effectiveType] <= rank[parentType]"), 'backend still rejects invalid hierarchy ordering');
  check(backend.includes("LOCATION_HIERARCHY_CYCLE"), 'backend cycle protection remains intact');
  check(backend.includes("LOCATION_LEAF_HAS_CHILDREN"), 'backend leaf-has-children protection remains intact');
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`Location hierarchy parent-eligibility surgical guard PASS (${checks}/${checks})`);
