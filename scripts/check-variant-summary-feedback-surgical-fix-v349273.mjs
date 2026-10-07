import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/InventoryCapabilitiesPage.tsx'), 'utf8');
const api = fs.readFileSync(path.join(root, 'src/lib/api.ts'), 'utf8');
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

check(page.includes("queryKey: ['inventory-capabilities-overview']"), 'Advanced Inventory overview uses a stable query key');
check(page.includes("void qc.invalidateQueries({ queryKey: ['inventory-capabilities-overview'] });"), 'variant creation invalidates the overview KPI query immediately');
check(page.includes("void qc.invalidateQueries({ queryKey: ['product-variants'] });"), 'variant creation still refreshes the variants table');
check(page.includes("onChanged();"), 'variant creation still refreshes shared product reference data');
check(page.includes("const parents = products.filter((p) => !p.parent_product_id);"), 'existing variants remain excluded from parent-product choices');
check(api.includes("/^\\/inventory-capabilities\\/products\\/[^/]+\\/variants$/"), 'shared mutation feedback recognizes the variant-create route');
check(api.includes("return 'Variant created successfully.';"), 'variant creation uses action-specific success feedback');
check(translations.includes('["Variant created successfully."'), 'variant success feedback is in the tenant multilingual catalog');
check(translations.includes('"Variante erfolgreich erstellt."'), 'German variant success translation is present');
check(translations.includes('"Variante creada correctamente."'), 'Spanish variant success translation is present');
check(translations.includes('"Variante créée avec succès."'), 'French variant success translation is present');
check(translations.includes('"Varijanta je uspješno stvorena."'), 'Croatian variant success translation is present');
check(page.includes("queryKey: ['product-variants']"), 'variant list remains independently queryable');
check(page.includes("<ProductSelect products={parents}"), 'variant creation still uses the filtered parent set');
check(page.includes("disabled={!canWrite || !parentId || !sku.trim() || !name.trim() || create.isPending}"), 'minimum variant-create gating remains intact');

if (backendRoot) {
  check(backend.includes("if (parent.parent_product_id) throw new AppError(409, 'VARIANT_PARENT_INVALID'"), 'backend rejects variant-on-variant nesting before child creation');
  check(backend.includes("if (parentStillActive.parent_product_id) throw new AppError(409, 'VARIANT_PARENT_INVALID'"), 'backend rechecks parent eligibility before final variant linkage');
  check(backend.includes('parent_product_id=$1, variant_attributes=$2::jsonb, variant_sku=$3'), 'backend variant linkage and attributes persistence remain intact');
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`Variant summary/feedback surgical guard PASS (${checks}/${checks})`);
