import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const root=process.cwd();
const file=process.env.BATCH127_SOURCE || path.join(root,'src/components/enterpriseInventory/tabs/SupplierReturnsTab.tsx');
const src=readFileSync(file,'utf8');
const translation=readFileSync(path.join(root,'src/i18n/tenantUiTranslations.ts'),'utf8');
const pkg=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
let checks=0;
const check=(label,fn)=>{fn();console.log(`PASS ${label}`);checks++};
const sf=ts.createSourceFile('SupplierReturnsTab.tsx',src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
check('SupplierReturns TSX parses',()=>assert.equal(sf.parseDiagnostics.length,0));
check('Translation source parses',()=>assert.equal(ts.createSourceFile('catalog.ts',translation,ts.ScriptTarget.Latest,true).parseDiagnostics.length,0));
check('TSX isolated transpilation works',()=>assert.equal((ts.transpileModule(src,{fileName:'SupplierReturnsTab.tsx',reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).diagnostics??[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0));
check('Batch127 runner registered',()=>assert.equal(pkg.scripts['check:batch127-supplier-return-line-readiness'],'node scripts/check-batch127-supplier-return-line-readiness.mjs'));
const fn=sf.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='getSupplierReturnLineQuantityState');
check('Quantity readiness helper exists as source function',()=>assert(fn));
const js=ts.transpileModule(fn.getText(sf),{fileName:'readiness.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const evaluate=new Function(js+'\nreturn getSupplierReturnLineQuantityState;')();
const lot=q=>({returnable_quantity:q});
const cases=[
 ['missing lot',null,'1','lot'],['missing lot and empty quantity',null,'','lot'],
 ['empty quantity',lot(35),'','required'],['whitespace only',lot(35),'  ','required'],
 ['zero',lot(35),'0','invalid'],['negative',lot(35),'-1','invalid'],
 ['nonnumeric',lot(35),'abc','invalid'],['Infinity',lot(35),'Infinity','invalid'],
 ['NaN',lot(35),'NaN','invalid'],['too many',lot(35),'36','exceeds'],
 ['no returnable stock',lot(0),'1','exceeds'],['unreadable lot amount',lot('xyz'),'1','exceeds'],
 ['valid 1',lot(35),'1','ready'],['valid bound',lot(35),'35','ready'],
 ['numeric string stock quantity',lot('35'),'2','ready'],['valid fractional',lot(0.5),'0.25','ready'],
 ['fractional too large',lot(0.5),'0.75','exceeds'],['very small positive',lot(35),'0.0001','ready'],
];
for (const [label,input,q,want] of cases) check(label,()=>assert.equal(evaluate(input,q),want));
check('The UI derives readiness from selected lot and user quantity',()=>assert.match(src,/const lineQuantityState = getSupplierReturnLineQuantityState\(selectedLot, lineQuantity\);/));
check('Write-permission and pending state still disable action',()=>assert.match(src,/const addReturnLineDisabled = !canWrite \|\| createReturnMutation\.isPending \|\| lineQuantityState !== 'ready';/));
check('Button uses actual derived disabled state',()=>assert.match(src,/disabled=\{addReturnLineDisabled\}/));
check('Button uses visually distinct disabled and primary states',()=>assert.match(src,/addReturnLineDisabled \? styles\.disabledButton : styles\.primaryButton/));
check('Button has accessible readiness description',()=>assert.match(src,/aria-describedby="supplier-return-line-readiness"/));
check('Hint announces state changes',()=>assert.match(src,/id="supplier-return-line-readiness" role="status" aria-live="polite"/));
check('Missing lot explanation retained',()=>assert.match(src,/lineQuantityState === 'lot' \? ui\('Select a received inventory lot to return\.'\)/));
check('Required quantity explanation visible',()=>assert.match(src,/lineQuantityState === 'required' \? ui\('Enter a return quantity to enable Add return line\.'\)/));
check('Invalid quantity explanation visible',()=>assert.match(src,/lineQuantityState === 'invalid' \? ui\('Return quantity must be greater than zero\.'\)/));
check('Exceeds maximum explains exact limit',()=>assert.match(src,/lineQuantityState === 'exceeds' \? ui\('Return quantity cannot exceed \{quantity\} for this lot\.'\)\.replace\('\{quantity\}', formatQuantity\(selectedLot\?\.returnable_quantity\)\)/));
check('Valid quantity is acknowledged',()=>assert.match(src,/ui\('Return quantity is valid\. You can add the return line\.'\)/));
check('Permission-specific reason shown',()=>assert.match(src,/TENANT_PERMISSIONS\.SUPPLIER_RETURNS_WRITE\)/));
check('Existing addDraftItem mutation kept',()=>assert.match(src,/const addDraftItem = \(\) => \{/));
check('Stock limit validation inside actual add action preserved',()=>assert.match(src,/if \(quantity > returnable \+ 0\.0000001\)/));
check('Serial-tracking validation inside add action preserved',()=>assert.match(src,/if \(serialNumbers\.length !== quantity\)/));
check('Original successful draft append preserved',()=>assert.match(src,/setDraftItems\(\(current\) => \[\s*\.\.\.current,/));
check('Existing supplier-return creation API preserved',()=>assert.match(src,/postEnterpriseInventoryRequest<SupplierReturn>\('\/enterprise-inventory\/supplier-returns'/));
check('New guidance does not mutate returned stock',()=>assert.equal(src.match(/onClick=\{addDraftItem\}/g)?.length,1));
for (const english of ['Enter a return quantity to enable Add return line.','Return quantity is valid. You can add the return line.']){
 const rows=translation.split('\n').filter(x=>x.trim().startsWith('["'+english+'",'));
 check('Unique translation: '+english,()=>assert.equal(rows.length,1));
 const values=JSON.parse(rows[0].trim().replace(/,$/,''));
 check('EN DE ES FR HR strings complete: '+english,()=>{assert.equal(values.length,5);assert(values.every(v=>v.length>15));assert(values.slice(1).every(v=>v!==english))});
}
check('Localized save busy label reused',()=>assert.match(src,/createReturnMutation\.isPending \? ui\('Saving…'\)/));
console.log(`Batch127 supplier-return line readiness: ${checks}/${checks} PASS`);
