import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const source = readFileSync(process.env.BATCH138_SOURCE || path.join(root,'src/pages/InventoryCapabilitiesPage.tsx'),'utf8');
const translations = readFileSync(path.join(root,'src/i18n/tenantUiTranslations.ts'),'utf8');
const pkg=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
let checks=0;
function check(label,run){run();checks++;console.log('PASS',label);}
const ast=ts.createSourceFile('InventoryCapabilitiesPage.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
check('TSX zero parse errors',()=>assert.equal(ast.parseDiagnostics.length,0));
check('TSX transpiles without isolated syntax errors',()=>assert.equal((ts.transpileModule(source,{fileName:'InventoryCapabilitiesPage.tsx',reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0));
check('Batch138 script registered',()=>assert.equal(pkg.scripts['check:batch138-uom-guidance'],'node scripts/check-batch138-uom-guidance.mjs'));
const uom=source.slice(source.indexOf('function UomPanel('),source.indexOf('function CustomFieldsPanel('));
check('UoM component exists',()=>assert(uom.length>3000));
check('Help region marked accessibly',()=>assert.match(uom,/aria-label=\{ui\("How units of measure work"\)\}/));
check('Base unit explanation shown above form',()=>assert.match(uom,/Inventory is counted in the base unit \(for example, pcs\)/));
check('Users learn when packs should be added',()=>assert.match(uom,/bought or issued in packs/));
check('Worked code / name / factor example is visible',()=>assert.match(uom,/enter CASE as the code, Case as the name and 24 as units in the base unit/));
check('Worked example states base-unit equation',()=>assert.match(uom,/1 CASE = 24 pcs/));
check('Users warned not to add base twice',()=>assert.match(uom,/Do not add the base unit again/));
check('Purchasing checkbox explained',()=>assert.match(uom,/Purchasing unit means this pack size/));
check('Issue checkbox explained',()=>assert.match(uom,/Issue\/selling unit means your team/));
check('Conversion test explains no stock change',()=>assert.match(uom,/Check quantities without changing stock/));
check('Forward conversion example given',()=>assert.match(uom,/2 CASE = 48 pcs/));
check('Reverse conversion example given',()=>assert.match(uom,/48 pcs = 2 CASE/));
check('Convert button now uses enabled primary styling',()=>assert.match(uom,/<button className="button" type="button" disabled=\{!productId \|\| !fromUom \|\| !toUom \|\| convert\.isPending\} onClick=\{\(\) => convert\.mutate\(\)\}/));
check('Convert still disabled until product and both units exist',()=>assert.match(uom,/disabled=\{!productId \|\| !fromUom \|\| !toUom \|\| convert\.isPending\}/));
check('Convert action still calls backend mutation',()=>assert.match(uom,/onClick=\{\(\) => convert\.mutate\(\)\}/));
check('Save uses same API path scoped to submitted product',()=>assert.match(uom,/`\/inventory-capabilities\/products\/\$\{targetProductId\}\/uom`, \{ method: 'POST'/));
check('Save version check preserved',()=>assert.match(uom,/expected_version: editingUom\?\.version \?\? 0/));
check('Save checkbox values preserved',()=>assert.match(uom,/purchase_uom: purchase, issue_uom: issue/));
check('Save requires write permission',()=>assert.match(uom,/disabled=\{!canWrite \|\| !productId/));
check('Conversion API route unchanged',()=>assert.match(uom,/`\/inventory-capabilities\/products\/\$\{productId\}\/uom\/convert`/));
check('Conversion payload unchanged',()=>assert.match(uom,/from_uom: fromUom, to_uom: toUom, quantity: Number\(convertQty\)/));
check('Conversion result remains visible',()=>assert.match(uom,/converted !== null \? <strong className="capability-result">/));
check('Product change still resets test state',()=>assert.match(uom,/setFromUom\(''\); setToUom\(''\); setConverted\(null\)/));
check('Save invalidates submitted product UoM query',()=>assert.match(uom,/invalidateQueries\(\{ queryKey: \['uom', targetProductId\] \}\)/));
check('Stock quantity mutation not introduced',()=>assert.doesNotMatch(uom,/\/stock\/adjust|\/stock\/count|\/stock-transfers/));
const strings=[
'How units of measure work',
'Inventory is counted in the base unit (for example, pcs). Add a different unit only when the same product is bought or issued in packs.',
'Example: enter CASE as the code, Case as the name and 24 as units in the base unit. This means 1 CASE = 24 pcs. Do not add the base unit again.',
'Purchasing unit means this pack size can be used when buying from suppliers. Issue/selling unit means your team can use it when issuing or selling stock.',
'Check quantities without changing stock. Example: 2 CASE = 48 pcs, and 48 pcs = 2 CASE.',
];
const rows=[...translations.matchAll(/^  (\[.*\]),?$/gm)].map(m=>{try {return JSON.parse(m[1].replace(/,$/,''));}catch{return null;}}).filter(Boolean);
for (const phrase of strings) check(`Five-language exact translation for ${phrase.slice(0,35)}`,()=>{const matches=rows.filter(row=>row[0]===phrase);assert.equal(matches.length,1);assert.equal(matches[0].length,5);assert(matches[0].every(x=>typeof x==='string'&&x.trim().length>5));});
check('Existing UoM error remains visible',()=>assert.match(uom,/Unable to save UoM/));
check('Existing conversion error remains visible',()=>assert.match(uom,/Unable to convert quantity/));
check('Existing delete action still version controlled',()=>assert.match(uom,/method: 'DELETE', version: row\.version/));
check('UoM table still shows base and saved conversions',()=>assert.match(uom,/query\.data\?\.conversions \|\| \[\]/));
console.log(`BATCH138 FOCUSED: ${checks}/${checks} PASS`);
