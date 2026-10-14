import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const read = (name) => fs.readFileSync(path.join(root,name), 'utf8');
const files = [
 'src/pages/products/productDirectoryScope.ts',
 'src/pages/products/productQueries.ts',
 'src/pages/products/useProductPageViewModel.ts',
 'src/pages/products/ProductListFiltersPanel.tsx',
 'src/pages/products/ProductListPanel.tsx',
 'src/pages/products/ProductManagementSectionsPanel.tsx',
 'src/i18n/tenantUiTranslations.ts'
];
for (const file of files) {
  const source = read(file);
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  check(ast.parseDiagnostics.length === 0, `${file}: TypeScript syntax`);
}
const pure = ts.transpileModule(read(files[0]),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const {scopedProductDirectoryFilters} = await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(pure));
const filters = {category:'Food',supplierId:'sup-x',costStatus:'costed',costBasis:'received',costVarianceStatus:'matched'};
const normal = scopedProductDirectoryFilters(filters, '');
check(normal === filters, 'normal browsing preserves original filters reference');
for (const key of Object.keys(filters)) check(normal[key] === filters[key], `normal browsing preserves ${key}`);
const focused = scopedProductDirectoryFilters(filters,'product-42');
for (const key of Object.keys(filters)) check(focused[key] === '', `focused product bypasses ${key}`);
check(filters.category === 'Food' && filters.supplierId === 'sup-x', 'scoping does not mutate source filters');
const whitespace = scopedProductDirectoryFilters(filters,'  ');
check(whitespace === filters, 'whitespace focus does not override filters');
const query = read(files[1]);
check(query.includes('scopedProductDirectoryFilters({'), 'product query actually invokes scoped filters');
check(query.includes('}, focusedProductId);'), 'product query uses current focused product');
check(query.includes('queryFn: () => fetchProducts({ search: \'\', ...directoryScope })'), 'API uses effective scope');
check(query.includes("'products', directoryScope.category, directoryScope.supplierId"), 'cache varies with effective scope');
const vm=read(files[2]);
check(vm.includes('focusedProductId: productPageState.focusedProductId'), 'focused product is passed to query');
const controls=read(files[3]);
check(controls.includes('setFocusedProductId(\'\');\n    change(value);'), 'search/filter interaction removes hidden focused ID');
check(controls.includes('setFocusedProductId(\'\');\n    setSearch(\'\');'), 'clear all filters removes focused ID');
check(controls.includes('Boolean(focusedProductId) || hasTextSearch'), 'focused ID enables Clear Filters');
for(const action of ['setSearch','setCategoryFilter','setSupplierFilter','setCostStatusFilter','setCostBasisFilter','setCostVarianceStatusFilter']){
 check(controls.includes(`beginBrowsing(${action}, event.target.value)`),`${action}: visible input changes exit focus`);
}
check(controls.includes('onDecoded={(value) => beginBrowsing(setSearch, value)}'), 'barcode scan exits focus');
check(controls.includes("focusedProductName || ui('Product not found')"), 'linked product missing state visible');
check(controls.includes("{ui('Show all products')}"), 'show-all action visible');
const list = read(files[4]);
check(list.includes('focusedProductName={products.find((product) => product.id === focusedProductId)?.name ?? null}'), 'matched product name shown');
check(list.includes("emptyMessage={focusedProductId ? ui('Product not found')"), 'empty linked product is not falsely called empty catalog');
const management = read(files[5]);
check(management.includes('setFocusedProductId={setFocusedProductId}'), 'focus exit handler passed to list');
const translations = read(files[6]);
check(translations.includes('["Show all products", "Alle Produkte anzeigen", "Mostrar todos los productos", "Afficher tous les produits", "Prikaži sve proizvode"]'), 'show-all translated into four additional languages');
console.log(`PASS ${checks}/${checks} Products directory focus, filtering and navigation checks`);
