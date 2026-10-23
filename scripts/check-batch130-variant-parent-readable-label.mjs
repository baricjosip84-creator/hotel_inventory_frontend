import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const source = readFileSync(process.env.BATCH130_SOURCE || path.join(root,'src/pages/InventoryCapabilitiesPage.tsx'),'utf8');
const pkg = JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS',name); }
const sf = ts.createSourceFile('InventoryCapabilitiesPage.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
check('TSX syntactically parses',()=>assert.equal(sf.parseDiagnostics.length,0));
check('TSX isolated TypeScript transpiles',()=>assert.equal((ts.transpileModule(source,{fileName:'InventoryCapabilitiesPage.tsx',reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0));
check('focused script is registered',()=>assert.equal(pkg.scripts['check:batch130-variant-parent-readable-label'],'node scripts/check-batch130-variant-parent-readable-label.mjs'));
const helper=sf.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='productOptionLabel');
check('readable label helper exists',()=>assert(helper));
const executable=ts.transpileModule(helper.getText(sf),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const ctx=vm.createContext({}); vm.runInContext(executable+'\nthis.label = productOptionLabel;',ctx);
const label=ctx.label;
const samples=[
  ['legacy name first',{name:'Test Product EI',sku:'LEGACY-20260928-QUITE-LONG-IDENTIFIER'},true,'Test Product EI — LEGACY-20260928-QUITE-LONG-IDENTIFIER'],
  ['regular name first',{name:'Milk 1L',sku:'MILK-1L'},true,'Milk 1L — MILK-1L'],
  ['regular default SKU first',{name:'Milk 1L',sku:'MILK-1L'},false,'MILK-1L — Milk 1L'],
  ['trim whitespace',{name:'  Test Product  ',sku:'  LONG-CODE  '},true,'Test Product — LONG-CODE'],
  ['missing name avoids separator',{name:'',sku:'UNNAMED-1'},true,'UNNAMED-1'],
  ['missing sku avoids separator',{name:'Friendly product',sku:''},true,'Friendly product'],
  ['missing name default order',{name:'',sku:'UNNAMED-1'},false,'UNNAMED-1'],
  ['missing sku default order',{name:'Friendly product',sku:''},false,'Friendly product'],
  ['both missing',{name:'',sku:''},true,''],
  ['unicode name survives',{name:'Čokoladno mlijeko',sku:'MILK-C'},true,'Čokoladno mlijeko — MILK-C'],
  ['punctuation name survives',{name:'A / B (small)',sku:'AB-S'},true,'A / B (small) — AB-S'],
];
for(const [description,row,first,expected] of samples) check(description,()=>assert.equal(label(row,first),expected));
const pselect=source.slice(source.indexOf('function ProductSelect('),source.indexOf('function SerialsPanel('));
const variant=source.slice(source.indexOf('function VariantsPanel('),source.indexOf('const HIERARCHY_TYPE_RANK'));
check('ProductSelect defaults to legacy ordering',()=>assert.match(pselect,/nameFirst = false/));
check('ProductSelect takes optional prop',()=>assert.match(pselect,/nameFirst\?: boolean/));
check('ProductSelect option retains product id as stable value',()=>assert.match(pselect,/<option key={p.id} value={p.id}>/));
check('ProductSelect computes label from helper',()=>assert.match(pselect,/\{productOptionLabel\(p, nameFirst\)\}/));
check('Variant parent explicitly opts into name-first',()=>assert.match(variant,/<ProductSelect products={parents} value={parentId} onChange={changeParent} label={ui\('Parent product'\)} nameFirst \/>/));
check('Variant parent eligible products unchanged',()=>assert.match(variant,/const parents = products\.filter\(\(p\) => !p\.parent_product_id\)/));
check('Selected parent remains identified by real UUID',()=>assert.match(variant,/const parent = parents\.find\(\(p\) => p\.id === parentId\)/));
check('Form still sends actual selected parent ID',()=>assert.match(variant,/apiRequest\(`\/inventory-capabilities\/products\/\$\{parentId\}\/variants`/));
check('Create permission and attribute validity preserved',()=>assert.match(variant,/!canWrite \|\| !parentId \|\| !effectiveSku \|\| !name\.trim\(\) \|\| Boolean\(attributeIssue\) \|\| create\.isPending/));
check('Barcode and attribute payload remain unchanged',()=>assert.match(variant,/barcode: barcode \|\| null, attributes: structuredVariantAttributes\(attributeRows\)/));
check('SKU suggestion uses actual parent SKU',()=>assert.match(variant,/suggestVariantSku\(parent\?\.sku \|\| '', name/));
check('Other product selectors do not opt in',()=>{const other=source.replace(variant,'');assert(!/nameFirst\s*\/>/.test(other));});
check('No new translation keys required for formatting-only change',()=>assert.match(pselect,/ui\(label\)/));
console.log(`BATCH130 FOCUSED: ${checks}/${checks} PASS`);
