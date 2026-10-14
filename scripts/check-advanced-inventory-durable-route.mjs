import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const source = fs.readFileSync(path.join(root,'src/pages/InventoryCapabilitiesPage.tsx'),'utf8');
const helper = fs.readFileSync(path.join(root,'src/lib/advancedInventoryRouteState.ts'),'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
let passed=0;
function check(name,fn){fn(); passed++; console.log('PASS '+name);}

// Runtime test the actual TypeScript helper, rather than recreating its logic in the test.
const js=ts.transpileModule(helper,{fileName:'advancedInventoryRouteState.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const module={exports:{}};
new Function('module','exports',js)(module,module.exports);
const {ADVANCED_INVENTORY_TABS,readAdvancedInventoryRouteState:read,updateAdvancedInventoryRouteParams:update}=module.exports;
const url=(search='')=>new URLSearchParams(search);
const stringify=(p)=>p.toString();

check('helper TS parses',()=>assert.equal(ts.createSourceFile('helper.ts',helper,ts.ScriptTarget.Latest,true).parseDiagnostics.length,0));
check('all visible capability tabs supported',()=>assert.deepEqual(ADVANCED_INVENTORY_TABS,['integrations','serials','uom','custom-fields','landed-cost','variants','hierarchy','bom','mobile']));
check('missing URL uses historical serial tab',()=>assert.deepEqual(read(url()),{tab:'serials',uomProductId:''}));
check('invalid URL tab falls back safely',()=>assert.deepEqual(read(url('capability_tab=not-a-tab&uom_product_id=abc')),{tab:'serials',uomProductId:''}));
check('dangerous-looking tab ignored',()=>assert.equal(read(url('capability_tab=__proto__')).tab,'serials'));
check('deep link restores UOM product',()=>assert.deepEqual(read(url('capability_tab=uom&uom_product_id=product-123')),{tab:'uom',uomProductId:'product-123'}));
check('empty product id safe',()=>assert.deepEqual(read(url('capability_tab=uom&uom_product_id=%20%20')),{tab:'uom',uomProductId:''}));
check('non-UOM tabs do not load hidden UOM product',()=>assert.equal(read(url('capability_tab=custom-fields&uom_product_id=p-A')).uomProductId,''));
check('tab param retains its original spelling',()=>assert.equal(read(url('capability_tab=landed-cost')).tab,'landed-cost'));

for(const tab of ADVANCED_INVENTORY_TABS){
  const changed=update(url('tenant_ref=keep&sort=asc&capability_tab=uom&uom_product_id=p-A'),{type:'tab',tab});
  check(`switch ${tab} preserves unrelated query params`,()=>{assert.equal(changed.get('tenant_ref'),'keep');assert.equal(changed.get('sort'),'asc');});
  check(`switch ${tab} round trips`,()=>assert.equal(read(changed).tab,tab));
  check(`switch ${tab} clears stale product outside UOM`,()=>assert.equal(changed.get('uom_product_id'),tab==='uom'?'p-A':null));
}
check('default tab omits redundant param',()=>assert.equal(update(url('capability_tab=uom'),{type:'tab',tab:'serials'}).has('capability_tab'),false));
check('product selection sets UOM tab atomically',()=>assert.deepEqual(read(update(url('capability_tab=serials'),{type:'uom-product',productId:'p-B'})),{tab:'uom',uomProductId:'p-B'}));
check('product selection preserves unrelated query params',()=>assert.equal(update(url('tracking=1'),{type:'uom-product',productId:'p-C'}).get('tracking'),'1'));
check('clear product removes id but keeps UOM tab',()=>assert.deepEqual(read(update(url('capability_tab=uom&uom_product_id=p-A'),{type:'uom-product',productId:''})),{tab:'uom',uomProductId:''}));
check('product ID whitespace trimmed',()=>assert.equal(read(update(url(),{type:'uom-product',productId:' p-D '})).uomProductId,'p-D'));
check('original query params object not mutated',()=>{const p=url('capability_tab=serials&trace=abc');update(p,{type:'tab',tab:'bom'});assert.equal(p.get('capability_tab'),'serials');assert.equal(p.get('trace'),'abc');});
check('URL serialization survives reload',()=>{const after=update(url('c=1'),{type:'uom-product',productId:'product A/£'});assert.deepEqual(read(url(stringify(after))),{tab:'uom',uomProductId:'product A/£'});});
check('Back returns exact preceding tab/product',()=>{const before=url('capability_tab=uom&uom_product_id=A'),after=update(before,{type:'uom-product',productId:'B'});assert.equal(read(url(before)).uomProductId,'A');assert.equal(read(url(after)).uomProductId,'B');});

const ast=ts.createSourceFile('InventoryCapabilitiesPage.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
check('Advanced Inventory page TSX parses',()=>assert.equal(ast.parseDiagnostics.length,0));
check('Advanced Inventory page TSX transpiles',()=>assert.equal((ts.transpileModule(source,{fileName:'InventoryCapabilitiesPage.tsx',reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0));
check('React-router URL hooks are installed',()=>assert.match(source,/const \[searchParams, setSearchParams\] = useSearchParams\(\)/));
check('tab state reads from route',()=>assert.match(source,/const routeState = readAdvancedInventoryRouteState\(searchParams\)/));
check('tab state no longer uses ephemeral useState',()=>assert.doesNotMatch(source,/const \[tab, setTab\] = useState/));
check('permission-gated tab selection',()=>assert.match(source,/visibleTabs\.some\(\(item\) => item\.key === routeState\.tab\)/));
check('URL permission fallback uses replace instead of push',()=>assert.match(source,/updateAdvancedInventoryRouteParams\(current, \{ type: 'tab', tab \}\), \{ replace: true \}/));
check('tab click writes URL',()=>assert.match(source,/onClick=\{\(\) => selectTab\(item\.key\)\}/));
check('UOM panel gets bookmarked product',()=>assert.match(source,/routeProductId=\{routeState\.uomProductId\}/));
check('UOM picker updates URL',()=>assert.match(source,/onChange=\{\(id\) => \{ changeProduct\(id\); onRouteProductChange\(id\); \}\}/));
check('UOM initial selection derives from URL',()=>assert.match(source,/const \[productId, setProductId\] = useState\(routeProductId\)/));
check('Back/Forward syncs URL selection back into panel',()=>assert.match(source,/if \(activeUomProductRef\.current !== routeProductId\) changeProduct\(routeProductId\)/));
check('old product session invalidated on navigation',()=>assert.match(source,/const changeProduct = \(id: string\) => \{ uomSelectionEpochRef\.current \+= 1; activeUomProductRef\.current = id; conversionRequestSeqRef\.current \+= 1/));
check('form changes do not update stock',()=>assert.doesNotMatch(source.slice(source.indexOf('function UomPanel('),source.indexOf('function CustomFieldsPanel(')),/onRouteProductChange\([^)]*\)[\s\S]{0,30}stock_adjust/));
check('regression included in npm scripts',()=>assert.equal(packageJson.scripts['check:advanced-inventory-durable-route'],'node scripts/check-advanced-inventory-durable-route.mjs'));
check('regression runs in CI',()=>assert.match(fs.readFileSync(path.join(root,'.github/workflows/frontend-validation.yml'),'utf8'),/npm run check:advanced-inventory-durable-route/));
check('old FE203 route absence is reproducible (when baseline supplied)',()=>{
 const archivePage=process.env.BASELINE_FE203_PAGE;
 if(!archivePage)return;
 const previous=fs.readFileSync(archivePage,'utf8');
 assert.match(previous,/const \[tab, setTab\] = useState<TabKey>\('serials'\)/);
 assert.match(previous,/const \[productId, setProductId\] = useState\(''\)/);
});
console.log(`ADVANCED INVENTORY ROUTE FOCUSED ${passed}/${passed} PASS`);
