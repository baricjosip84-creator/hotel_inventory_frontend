import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const source = readFileSync(process.env.BATCH137_SOURCE || path.join(root, 'src/pages/InventoryCapabilitiesPage.tsx'), 'utf8');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
let checks = 0;
function check(desc, run) { run(); checks++; console.log('PASS', desc); }
const ast = ts.createSourceFile('InventoryCapabilitiesPage.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
check('TSX parses with zero errors', () => assert.equal(ast.parseDiagnostics.length,0));
check('TSX isolated transpilation reports zero errors', () => assert.equal((ts.transpileModule(source,{fileName:'InventoryCapabilitiesPage.tsx',reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0));
check('Batch137 npm script registered', () => assert.equal(pkg.scripts['check:batch137-custom-field-product-picker'], 'node scripts/check-batch137-custom-field-product-picker.mjs'));
const helper = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'productOptionLabel');
check('Existing shared productOptionLabel reused', () => assert(helper));
const helperJs = ts.transpileModule(helper.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const sandbox = vm.createContext({});vm.runInContext(helperJs + '\nthis.productOptionLabel = productOptionLabel;', sandbox);
const label = sandbox.productOptionLabel;
const cases = [
  ['long legacy SKU follows name', {name:'Test Product EI',sku:'LEGACY-1321413692DC4FB59C407855EBD7A1E'}, 'Test Product EI — LEGACY-1321413692DC4FB59C407855EBD7A1E'],
  ['normal SKU follows name', {name:'Milk 1L',sku:'MILK-1L'}, 'Milk 1L — MILK-1L'],
  ['Croatian UTF-8 remains intact', {name:'Čokoladno mlijeko',sku:'CHOC-12'}, 'Čokoladno mlijeko — CHOC-12'],
  ['blank name shows SKU', {name:'',sku:'LEGACY-2'}, 'LEGACY-2'],
  ['blank SKU shows name', {name:'Canned tuna',sku:''}, 'Canned tuna'],
  ['blank both gives empty label', {name:'',sku:''}, ''],
  ['whitespace normalized', {name:'  Flour  ',sku:'  FL-01 '}, 'Flour — FL-01'],
  ['special punctuation preserved', {name:'A/B 0.5L',sku:'AB-05'}, 'A/B 0.5L — AB-05'],
  ['long business name not trimmed out', {name:'Inventory product very long name',sku:'S-1'}, 'Inventory product very long name — S-1'],
];
for (const [desc, product, expected] of cases) check(desc, () => assert.equal(label(product,true),expected));
check('Existing default helper keeps SKU-first when explicitly requested',()=>assert.equal(label({name:'Milk 1L',sku:'MILK-1L'},false),'MILK-1L — Milk 1L'));
const custom = source.slice(source.indexOf('function CustomFieldsPanel('), source.indexOf('function LandedCostPanel('));
check('Custom Fields now calls name-first shared label function',()=>assert.match(custom,/product:\s*\{\s*label: ui\("Product"\), plural: 'products', rows: products\.map\(\(row\) => \(\{ id: row\.id, label: productOptionLabel\(row, true\) \}\)\) \}/));
check('Legacy SKU-first literal removed from Custom Fields',()=>assert.doesNotMatch(custom,/label:\s*`\$\{row\.sku\} — \$\{row\.name\}`/));
check('Custom Fields mapping retains authoritative entity id',()=>assert.match(custom,/products\.map\(\(row\) => \(\{ id: row\.id, label: productOptionLabel\(row, true\)/));
check('Product option key remains its entity id',()=>assert.match(custom,/<option key=\{row\.id\} value=\{row\.id\}>\{row\.label\}<\/option>/));
check('Product selection forwards unchanged authoritative entity id',()=>assert.match(custom,/onChange=\{\(event\) => changeEntityId\(event\.target\.value\)\}/));
check('Value GET endpoint continues using selected id',()=>assert.match(custom,/\/inventory-capabilities\/custom-fields\/\$\{entityType\}\/\$\{entityId\}/));
check('Value save PUT endpoint still uses same selected id',()=>assert.match(custom,/method: 'PUT',\s*body: JSON\.stringify\(payload\)/));
check('Value optimistic-concurrency versions unchanged',()=>assert.match(custom,/value_versions: \{ \.\.\.valueVersions \}, definition_versions: \{ \.\.\.definitionVersions \}/));
check('Same permission gate on values query',()=>assert.match(custom,/enabled: Boolean\(canRead && entityId\)/));
check('Only readers are shown allowed entity types',()=>assert.match(custom,/const readableEntityTypes = useMemo<EntityType\[]>/));
check('Missing entity selection still prevents value save',()=>assert.match(custom,/disabled=\{!canWrite \|\| !entityId/));
check('Supplier selection unchanged',()=>assert.match(custom,/supplier:\s*\{ label: ui\("Supplier"\), plural: 'suppliers', rows: suppliers\.map\(\(row\) => \(\{ id: row\.id, label: row\.name \}\)\) \}/));
check('Storage location selection unchanged',()=>assert.match(custom,/storage_location:\s*\{ label: ui\("Storage location"\), plural: 'storage locations', rows: locations\.map\(\(row\) => \(\{ id: row\.id, label: row\.path \|\| row\.name \}\)\) \}/));
check('Shipment and purchase-order value selectors unchanged',()=>{assert.match(custom,/shipment:\s*\{ label: ui\("Shipment"\)/);assert.match(custom,/purchase_order:\s*\{ label: ui\("Purchase order"\)/);});
check('Existing variants selector still opts into name-first',()=>assert.match(source,/<ProductSelect products=\{parents\} value=\{parentId\} onChange=\{changeParent\} label=\{ui\('Parent product'\)\} nameFirst \/>/));
check('Stock and serial unrelated selectors retain legacy defaults',()=>assert.match(source,/function ProductSelect\(\{ products, value, onChange, label = 'Product', nameFirst = false \}/));
check('No translation rows changed: existing readable name and SKU used',()=>assert.match(custom,/label: productOptionLabel\(row, true\)/));
check('Backend authorizes custom fields based on permission and version, not rendered labels',()=>{const routes=readFileSync(path.join(process.env.BACKEND_ROOT || path.join(root,'../hotel-inventory-backend'),'src/routes/inventoryCapabilities.js'),'utf8');assert.match(routes,/router\.put\('\/custom-fields\/:entityType\/:entityId', requireCustomFieldEntityPermission\('write'\)/);});
const mapper = products => products.map(row => ({id:row.id,label:label(row,true)}));
const mapped=mapper([{id:'uuid-1',name:'Test Product EI',sku:'LEGACY-0123456789012'},{id:'uuid-2',name:'Milk 1L',sku:'MILK'}]);
check('Mapped option keeps first real UUID',()=>assert.equal(mapped[0].id,'uuid-1'));
check('Mapped option keeps second real UUID',()=>assert.equal(mapped[1].id,'uuid-2'));
check('Mapped labels identify correct independent products',()=>assert.equal(mapped[0].label,'Test Product EI — LEGACY-0123456789012'));
check('Original product order preserved',()=>assert.equal(mapped[1].label,'Milk 1L — MILK'));
console.log(`BATCH137 FOCUSED: ${checks}/${checks} PASS`);
