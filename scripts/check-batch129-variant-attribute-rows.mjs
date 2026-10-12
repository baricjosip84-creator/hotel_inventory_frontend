import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const source = readFileSync(process.env.BATCH129_SOURCE || path.join(root, 'src/pages/InventoryCapabilitiesPage.tsx'), 'utf8');
const catalog = readFileSync(path.join(root,'src/i18n/tenantUiTranslations.ts'), 'utf8');
const pkg = JSON.parse(readFileSync(path.join(root,'package.json'), 'utf8'));
const backend = readFileSync(path.join(process.env.BACKEND_ROOT || path.resolve(root, '../../backend/hotel-inventory-backend'), 'src/services/inventory/inventoryCapabilitiesService.js'),'utf8');
let checks = 0;
const check = (description, run) => { run(); checks += 1; console.log('PASS', description); };
const sf = ts.createSourceFile('InventoryCapabilitiesPage.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
check('TSX parses', () => assert.equal(sf.parseDiagnostics.length,0));
check('TSX isolated transpilation parses', () => assert.equal((ts.transpileModule(source,{fileName:'InventoryCapabilitiesPage.tsx',reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0));
check('catalog parses', () => assert.equal(ts.createSourceFile('tenantUiTranslations.ts',catalog,ts.ScriptTarget.Latest,true).parseDiagnostics.length,0));
check('script registered', () => assert.equal(pkg.scripts['check:batch129-variant-attribute-rows'],'node scripts/check-batch129-variant-attribute-rows.mjs'));
const helperNames=['variantAttributeIssue','structuredVariantAttributes'];
const helpers=helperNames.map(name=>{
 const node=sf.statements.find(n=>ts.isFunctionDeclaration(n) && n.name?.text===name);
 check(`${name} declared`,()=>assert(node));
 return ts.transpileModule(node.getText(sf),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
});
const ctx=vm.createContext({});
vm.runInContext(helpers.join('\n')+'\nthis.validate=variantAttributeIssue; this.payload=structuredVariantAttributes;',ctx);
const validate=ctx.validate;
const payload=ctx.payload;
const examples=[
 ['no attributes optional',[],null],
 ['one complete',[{id:1,key:'Color',value:'Red'}],null],
 ['multiple complete', [{id:1,key:'Color',value:'Red'},{id:2,key:'Size',value:'M'}],null],
 ['blank key',[{id:1,key:'',value:'Red'}],'Enter a name for each attribute.'],
 ['whitespace key',[{id:1,key:'  ',value:'Red'}],'Enter a name for each attribute.'],
 ['missing value',[{id:1,key:'Color',value:'   '}],'Enter a value for each attribute.'],
 ['incomplete second row',[{id:1,key:'Color',value:'Red'},{id:2,key:'Size',value:''}],'Enter a value for each attribute.'],
 ['duplicate exact',[{id:1,key:'Color',value:'Red'},{id:2,key:'Color',value:'Blue'}],'Attribute names must be unique.'],
 ['duplicate insensitive',[{id:1,key:' Color ',value:'Red'},{id:2,key:'color',value:'Blue'}],'Attribute names must be unique.'],
 ['reserved proto',[{id:1,key:'__proto__',value:'bad'}],'Use a different attribute name.'],
 ['reserved constructor',[{id:1,key:'Constructor',value:'bad'}],'Use a different attribute name.'],
 ['reserved prototype',[{id:1,key:'prototype',value:'bad'}],'Use a different attribute name.'],
];
for(const [name,rows,expected] of examples) check(name,()=>assert.equal(validate(rows),expected));
check('key and value trimming in actual payload',()=>assert.equal(JSON.stringify(payload([{id:1,key:' Color ',value:' Red '},{id:2,key:' Size ',value:' M '}])),'{"Color":"Red","Size":"M"}'));
check('commas and equal signs are preserved in values',()=>assert.equal(JSON.stringify(payload([{id:1,key:'Material',value:'Cotton, 100% = premium'}])),'{"Material":"Cotton, 100% = premium"}'));
check('empty rows produce empty JSON object',()=>assert.equal(JSON.stringify(payload([])),'{}'));
check('payload has safe null prototype',()=>assert.equal(Object.getPrototypeOf(payload([])),null));
check('legacy free text parser removed',()=>{assert(!source.includes('function parseAttributes(')); assert(!source.includes('Color=Red, Size=M'));});
check('state tracks stable rows',()=>assert.match(source,/useState<VariantAttributeRow\[\]>/));
check('row add action implemented',()=>assert.match(source,/const addAttribute = \(\) => setAttributeRows/));
check('row edit action implemented',()=>assert.match(source,/const updateAttribute = \(id: number, field: 'key' \| 'value', value: string\)/));
check('row removal action implemented',()=>assert.match(source,/const removeAttribute = \(id: number\) => setAttributeRows/));
check('accessible attribute name and value input controls',()=>{assert.match(source,/ui\('Attribute name'\)\}<input value=\{row\.key\}/);assert.match(source,/ui\('Attribute value'\)\}<input value=\{row\.value\}/);});
check('independent add and remove buttons do not submit form',()=>{assert.match(source,/type="button"[^>]*onClick=\{addAttribute\}/);assert.match(source,/type="button"[^>]*aria-label=\{`\$\{ui\('Remove attribute'\)\} \$\{index \+ 1\}`\}/);});
check('form submit blocked for incomplete and duplicate rows',()=>assert.match(source,/effectiveSku && !attributeIssue && !create\.isPending\) create\.mutate\(\)/));
check('create button disabled if attribute validation issue exists',()=>assert.match(source,/disabled=\{!canWrite \|\| !parentId \|\| !effectiveSku \|\| !name\.trim\(\) \|\| Boolean\(attributeIssue\) \|\| create\.isPending\}/));
check('error is accessible and translated',()=>assert.match(source,/className="form-error" role="alert">\{ui\(attributeIssue\)\}/));
check('success clears attribute rows',()=>assert.match(source,/setAttributeRows\(\[\]\); setError\(null\)/));
check('payload sends structured object not raw string',()=>assert.match(source,/body: JSON\.stringify\(\{ sku: effectiveSku, name, barcode: barcode \|\| null, attributes: structuredVariantAttributes\(attributeRows\) \}\)/));
check('read/list variant attributes preserved',()=>assert.match(source,/Object\.entries\(v\.variant_attributes \|\| \{\}\)/));
check('SKU generation and parent rules intact',()=>{assert.match(source,/const effectiveSku = editSku \? sku\.trim\(\) : suggestedSku/); assert.match(source,/const parents = products\.filter\(\(p\) => !p\.parent_product_id\)/);});
check('API and query invalidation preserved',()=>{assert.match(source,/apiRequest\(`\/inventory-capabilities\/products\/\$\{parentId\}\/variants`, \{ method: 'POST'/);assert.match(source,/queryKey: \['product-variants'\]/);});
check('backend persists attrs JSONB unchanged',()=>{assert.match(backend,/JSON\.stringify\(body\.attributes \|\| \{\}\)/);assert.match(backend,/if \(parent\.parent_product_id\) throw new AppError\(409, 'VARIANT_PARENT_INVALID'/);});
check('submit remains role-gated',()=>assert.match(source,/if \(canWrite && parentId && name\.trim\(\) && effectiveSku/));
check('row input/buttons role-gated',()=>assert.match(source,/placeholder=\{ui\('Color'\)\} disabled=\{!canWrite \|\| create\.isPending\}/));
const labels=['Variant attributes (optional)','Add details such as Color = Red or Size = Large. You can leave attributes empty.','Attribute name','Attribute value','Add attribute','Remove attribute','Enter a name for each attribute.','Enter a value for each attribute.','Use a different attribute name.','Attribute names must be unique.','Color','Red'];
for(const label of labels) check('five-language catalog '+label,()=>{
 const lines = catalog.split('\n').filter(line => line.startsWith('  ['+JSON.stringify(label)+','));
 assert.equal(lines.length,1);const row=JSON.parse(lines[0].trim().replace(/,$/,''));assert.equal(row.length,5);assert.equal(row[0],label);assert(row.every(v=>v.trim()));
});
console.log(`BATCH129 FOCUSED: ${checks}/${checks} PASS`);
