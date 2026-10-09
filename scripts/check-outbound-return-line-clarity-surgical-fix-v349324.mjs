import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
const page=read('src/pages/OutboundPage.tsx');
const css=read('src/pages/OutboundPage.css');
const i18n=read('src/i18n/tenantUiTranslations.ts');
const pkg=JSON.parse(read('package.json'));
const a=page.indexOf('{returnForm.items.map((line, index) => {');
const b=page.indexOf('{returnablePageCount > 1 ?',a);
assert(a>0 && b>a);
const form=page.slice(a,b);
const tests=[
['line maps original array',()=>assert.match(form,/returnForm\.items\.map\(\(line, index\)/)],
['each item group identified by original index',()=>assert.match(form,/key=\{index\} className="outbound-return-line-editor" role="group"/)],
['accessible translated line label',()=>assert.match(form,/aria-label=\{ui\('Item \{number\}'\)\.replace\('\{number\}', String\(index \+ 1\)\)\}/)],
['visible translated line number',()=>assert.match(form,/<strong>\{ui\('Item \{number\}'\)\.replace\('\{number\}', String\(index \+ 1\)\)\}<\/strong>/)],
['remove stays scoped to index',()=>assert.match(form,/onClick=\{\(\) => removeReturnLine\(index\)\}/)],
['cannot remove last remaining line',()=>assert.match(form,/disabled=\{returnForm\.items\.length === 1\}/)],
['remove appears before input grid',()=>assert(form.indexOf('removeReturnLine(index)')<form.indexOf('outbound-return-line-grid'))],
['dispatched stock selector retained',()=>assert.match(form,/value=\{line\.allocation_id\} onChange=\{\(event\) => chooseReturnAllocation\(index, event\.target\.value\)\}/)],
['destination selector retained',()=>assert.match(form,/value=\{line\.storage_location_id\} onChange=\{\(event\) => updateReturnLine\(index, \{ storage_location_id: event\.target\.value \}\)\}/)],
['quantity input retains max and updates',()=>assert.match(form,/max=\{selected \? toNumber\(selected\.returnable_quantity\) : undefined\}/)],
['quantity input still clears prior serial selection',()=>assert.match(form,/quantity: event\.target\.value, serial_numbers: \[\]/)],
['condition selector retained',()=>assert.match(form,/value=\{line\.condition\} onChange=\{\(event\) => updateReturnLine\(index,/)],
['selected summary only when stock selected',()=>assert.match(form,/\{selected \? <div className="outbound-return-selected-stock"/)],
['selected summary shows order id',()=>assert.match(form,/ui\('Order'\)[\s\S]*?selected\.order_number/)],
['selected summary shows customer',()=>assert.match(form,/ui\('Customer'\)[\s\S]*?selected\.customer_name/)],
['selected summary shows product',()=>assert.match(form,/ui\('Product'\)[\s\S]*?selected\.product_name/)],
['selected summary shows remaining quantity and lot',()=>assert.match(form,/ui\('Still returnable'\)[\s\S]*?selected\.returnable_quantity[\s\S]*?formatLot\(selected\)/)],
['archived-stock warning preserved',()=>assert.match(form,/selected\?\.product_archived \? <div className="outbound-alert outbound-alert--warning"/)],
['exact serial selection preserved',()=>assert.match(form,/selected\.returnable_serial_numbers\.map/)],
['original create action still guarded by validation',()=>assert.match(page,/disabled=\{Boolean\(returnFormValidation\) \|\| mutation\.isPending/)],
['existing create handler retained',()=>assert.match(page,/onClick=\{createReturn\}/)],
['line area has visible boundary',()=>assert.match(css,/\.outbound-return-line-editor \{[\s\S]*?border-left: 3px solid/)],
['focus highlights owning line',()=>assert.match(css,/\.outbound-return-line-editor:focus-within \{/)],
['selected data has contained background',()=>assert.match(css,/\.outbound-return-selected-stock \{[\s\S]*?background: #f8fafc;/)],
['selected stock labels wrap',()=>assert.match(css,/\.outbound-return-selected-stock strong \{[^}]*overflow-wrap: anywhere/)],
['narrow viewport collapses selected summary',()=>assert.match(css,/@media \(max-width: 760px\) \{\s*\.outbound-return-selected-stock \{ grid-template-columns: 1fr;/)],
['existing responsive input grid remains',()=>assert.match(css, /\.outbound-return-line-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/)],
['five-language Item number key exists',()=>assert.match(i18n,/\["Item \{number\}", "Element \{number\}", "Elemento \{number\}", "Élément \{number\}", "Stavka \{number\}"\]/)],
['five-language metric exists',()=>assert.match(i18n,/\["Still returnable", "Noch rückgabefähig", "Aún retornable", "Encore retournable", "Još se može vratiti"\]/)],
['script registered',()=>assert.equal(pkg.scripts['check:outbound-return-line-clarity-v349324'],'node scripts/check-outbound-return-line-clarity-surgical-fix-v349324.mjs')]
];
for(const [name,fn] of tests){fn(); console.log('PASS:',name)}
console.log(`Outbound Customer Returns line clarity guard: ${tests.length}/${tests.length} PASS`);
