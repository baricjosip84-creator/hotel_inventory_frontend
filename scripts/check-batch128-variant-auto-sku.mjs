import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root=process.cwd();
const source=readFileSync(process.env.BATCH128_SOURCE || path.join(root,'src/pages/InventoryCapabilitiesPage.tsx'),'utf8');
const catalog=readFileSync(path.join(root,'src/i18n/tenantUiTranslations.ts'),'utf8');
const pkg=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
let checks=0;
const check=(name,run)=>{run();console.log('PASS',name);checks++};
const sf=ts.createSourceFile('InventoryCapabilitiesPage.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
check('capabilities source parses',()=>assert.equal(sf.parseDiagnostics.length,0));
check('capabilities isolated transpile parses',()=>assert.equal((ts.transpileModule(source,{fileName:'InventoryCapabilitiesPage.tsx',reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0));
check('translation source parses',()=>assert.equal(ts.createSourceFile('tenantUiTranslations.ts',catalog,ts.ScriptTarget.Latest,true).parseDiagnostics.length,0));
check('batch runner registered',()=>assert.equal(pkg.scripts['check:batch128-variant-auto-sku'],'node scripts/check-batch128-variant-auto-sku.mjs'));
const helperNode=sf.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='suggestVariantSku');
check('new pure SKU helper is declared',()=>assert(helperNode));
const helperJs=ts.transpileModule(helperNode.getText(sf),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const context=vm.createContext({});
vm.runInContext(helperJs+'\nthis.suggest=suggestVariantSku;',context);
const suggest=context.suggest;
const examples=[
 ['normal parent variant','TEST-EI','Red Large',[],'TEST-EI-RED-LARGE'],
 ['name empty','TEST-EI','',[],''],
 ['spaces only','TEST-EI','  ',[],''],
 ['accents','CAFE','Crème brûlée',[],'CAFE-CREME-BRULEE'],
 ['punctuation','P 1','Red / Medium!!',[],'P-1-RED-MEDIUM'],
 ['unicode name fallback','P2','红色',[],'P2-VARIANT'],
 ['empty parent fallback','','Large',[],'PRODUCT-LARGE'],
 ['duplicate base','TEST-EI','Red',['TEST-EI-RED'],'TEST-EI-RED-2'],
 ['duplicate case insensitive','TEST-EI','Red',['test-ei-red'],'TEST-EI-RED-2'],
 ['duplicate with next suffix','TEST-EI','Red',['TEST-EI-RED','TEST-EI-RED-2'],'TEST-EI-RED-3'],
 ['not globally resequencing','TEST-EI','Red',['TEST-EI-RED-7'],'TEST-EI-RED'],
];
for (const [label,parent,name,used,expected] of examples) check(label,()=>assert.equal(suggest(parent,name,used),expected));
check('generated SKU under 65 characters',()=>assert(suggest('Q'.repeat(90),'Z'.repeat(90),[]).length<=64));
check('existing variants cannot parent nested variant',()=>assert.match(source,/const parents = products\.filter\(\(p\) => !p\.parent_product_id\)/));
check('variant name is primary ordinary field',()=>assert.match(source,/ui\('Variant name'\)[\s\S]*?value=\{name\}/));
check('suggestion uses selected parent SKU',()=>assert.match(source,/suggestVariantSku\(parent\?\.sku \|\| '', name,/));
check('suggestion checks existing products and variants',()=>{assert.match(source,/\.\.\.products\.map\(\(product\) => product\.sku\)/);assert.match(source,/\.\.\.\(variants\.data \?\? \[\]\)\.map\(\(variant\) => variant\.sku\)/)});
check('optional manual override controls effective SKU',()=>assert.match(source,/const effectiveSku = editSku \? sku\.trim\(\) : suggestedSku;/));
check('override has explicit switch for edit and suggested',()=>{assert.match(source,/ui\('Use suggested SKU'\)/);assert.match(source,/ui\('Edit SKU'\)/);assert.match(source,/type="button"/)});
check('edit input only shown by optional editing',()=>assert.match(source,/editSku\s*\? <label>\{ui\('Custom variant SKU'\)\}<input value=\{sku\}/));
check('SKU payload remains required backend contract',()=>assert.match(source,/body: JSON\.stringify\(\{ sku: effectiveSku, name, barcode: barcode \|\| null, attributes: structuredVariantAttributes\(attributeRows\) \}\)/));
check('auto mode gate protects empty input and permissions',()=>assert.match(source,/disabled=\{!canWrite \|\| !parentId \|\| !effectiveSku \|\| !name\.trim\(\) \|\| Boolean\(attributeIssue\) \|\| create\.isPending\}/));
check('mutation callback retains success invalidation',()=>{for (const key of ['product-variants','inventory-capabilities-overview'])assert(source.includes(`queryKey: ['${key}']`));assert.match(source,/onChanged\(\);/)});
check('successful creation resets manual SKU option',()=>assert.match(source,/setSku\(''\); setEditSku\(false\); setName\(''\)/));
check('parent change clears stale override',()=>assert.match(source,/const changeParent = \(id: string\) => \{ setParentId\(id\); setEditSku\(false\); setSku\(''\)/));
check('default empty auto suggestion asks for name',()=>assert.match(source,/suggestedSku \|\| ui\('Enter a variant name to generate a SKU\.'\)/));
check('no backend/variant API change',()=>assert.match(source,/apiRequest\(`\/inventory-capabilities\/products\/\$\{parentId\}\/variants`, \{ method: 'POST'/));
check('backend parent restriction stays called',()=>{const base=process.env.BACKEND_ROOT || path.resolve(root,'../../backend/hotel-inventory-backend');const backend=readFileSync(path.join(base,'src/services/inventory/inventoryCapabilitiesService.js'),'utf8');assert.match(backend,/if \(parent\.parent_product_id\) throw new AppError\(409, 'VARIANT_PARENT_INVALID'/);assert.match(backend,/if \(!sku \|\| !name\) throw new AppError\(400, 'VARIANT_REQUIRED_FIELDS'/)});
const translations=[
 'Custom variant SKU', 'Enter a variant name to generate a SKU.', 'Use suggested SKU', 'Edit SKU',
 'The SKU is suggested from the parent and variant name. You can edit it if needed; duplicates are checked when saving.'
];
for (const label of translations) {
 check('five-language translation: '+label.slice(0,35),()=>{
   const lines=catalog.split('\n').filter(l=>l.startsWith('  [') && l.includes(JSON.stringify(label)+','));
   assert.equal(lines.length,1);
   const row=JSON.parse(lines[0].trim().replace(/,$/,''));
   assert.equal(row.length,5);
   assert.equal(row[0],label);
   assert(row.every(v=>typeof v==='string'&&v.trim()));
 });
}
console.log(`BATCH128 FOCUSED: ${checks}/${checks} PASS`);
