import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root,'src/pages/ReportsPage.tsx'), 'utf8');
const catalog = fs.readFileSync(path.join(root,'src/i18n/tenantUiTranslations.ts'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'), 'utf8'));
const backend = fs.readFileSync(path.join(root,'../hotel-inventory-backend/src/services/analytics/reportService.js'), 'utf8');
let passed = 0;
function check(label, cb) { cb(); passed++; console.log(`PASS ${String(passed).padStart(2,'0')} ${label}`); }

const start = source.indexOf('function HistoricalLocationFilterField(');
const end = source.indexOf('function AutocompleteFilterField(',start);
const helper = source.slice(start,end);
const transfer = source.slice(source.indexOf("{activeTab === 'stock-transfer-activity' ? ("),source.indexOf("{activeTab === 'requisition-activity' ? ("));
check('Historical location selector helper exists',()=>assert.ok(start>0 && end>start));
check('Transfer location uses shared native select with custom fallback',()=>assert.match(transfer,/<HistoricalLocationFilterField label=\{ui\("Location"\)\}/));
check('Transfer no longer uses datalist popup',()=>assert.doesNotMatch(transfer,/<AutocompleteFilterField|report-locations-transfers/));
check('Other report autocomplete preserved',()=>assert.match(source,/<AutocompleteFilterField label=\{ui\("Product"\)\} value=\{ledgerFilters\.product\}/));
check('Tenant option list preserved',()=>assert.match(transfer,/options=\{filterOptions\.locations\}/));
check('Filters still update original transfer state',()=>assert.match(transfer,/onChange=\{\(value\) => updateAndClear\(setTransferFilters, 'location', value\)\}/));
check('Disabled state remains tied to export',()=>assert.match(transfer,/disabled=\{isExporting\}/));
check('Date and status filters and export controls preserved',()=>{assert.match(transfer,/DateRangeFields/);assert.match(transfer,/TRANSFER_STATUS_OPTIONS/);assert.match(transfer,/actions=\{actionButtons/);});
check('Location API still parameterized',()=>assert.match(backend,/getStockTransferActivityReport[\s\S]+?normalizedLocation[\s\S]+?ILIKE \$/));
check('Original available-choice selector unchanged',()=>assert.match(source,/function ChoiceFilterField\([\s\S]+?<select value=\{value\} onChange=\{\(event\) => onChange\(event\.target\.value\)\} disabled=\{disabled\}>/));
check('No-options case keeps typed filter',()=>assert.match(helper,/if \(!options\.length\) \{\s*return <TextFilterField/));
check('Manual input respects max length',()=>assert.match(helper,/maxLength=\{MAX_REPORT_FILTER_LENGTH\}/));
check('Registration is present',()=>assert.equal(pkg.scripts['check:reports-transfer-location-dropdown-v349343'],'node scripts/check-reports-transfer-location-dropdown-surgical-fix-v349343.mjs'));
const diagnostics = ts.transpileModule(source,{fileName:'ReportsPage.tsx',reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error)??[];
check('Source TypeScript transpilation has zero errors',()=>assert.equal(diagnostics.length,0));
const tr = ts.transpileModule(catalog,{fileName:'tenantUiTranslations.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
const module={exports:{}};
vm.runInNewContext(tr.outputText,{exports:module.exports,module,require:()=>({})},{filename:'tenantUiTranslations.js'});
const locales=['en-GB','de-DE','es-ES','fr-FR','hr-HR'];
for(const locale of locales){
  check(`${locale} has nonempty localized labels`,()=>{
    for(const key of ['Other or historical location…','Enter a historical location or search term']){
      const result=module.exports.translateTenantUi(locale,key);
      assert.ok(result.trim());
      if(locale!=='en-GB') assert.notEqual(result,key);
    }
  });
}
// Compile and exercise the actual helper with a minimal JSX/useState runtime.
const compiled = ts.transpileModule(`const MAX_REPORT_FILTER_LENGTH=120;\n${helper}\nexports.Filter=HistoricalLocationFilterField;`, {fileName:'filter.tsx',compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
let manualMode = false;
const jsx = (type,props)=>({type,props});
const fakeExports={};
vm.runInNewContext(compiled,{
  exports:fakeExports,
  require:(name)=>{assert.equal(name,'react/jsx-runtime');return {jsx,jsxs:jsx};},
  useState:()=>[manualMode,(val)=>{manualMode=val;}],
  useAppTranslation:()=>({ui:(value)=>value}),
  TextFilterField:()=>null
},{filename:'compiled-selector.js'});
const outputValues=[];
const render = (value='',options=['Main Warehouse','Secondary Store'])=>fakeExports.Filter({label:'Location',value,placeholder:'All locations', options,disabled:false,onChange:(next)=>outputValues.push(next)});
const childrenOf=(node)=>Array.isArray(node.props?.children)?node.props.children:[node.props?.children];
const selectOf=(tree)=>childrenOf(tree).find(x=>x?.type==='select');
const inputOf=(tree)=>childrenOf(tree).find(x=>x?.type==='input');
manualMode=false;
let tree=render();
check('Normal mode uses native select without text input',()=>{assert.ok(selectOf(tree));assert.equal(inputOf(tree),undefined);});
check('Selecting current location emits exact name',()=>{selectOf(tree).props.onChange({target:{value:'Main Warehouse'}});assert.equal(outputValues.at(-1),'Main Warehouse');});
check('Selecting other/historical enters manual mode without submitting placeholder',()=>{selectOf(tree).props.onChange({target:{value:'__historical_location__'}});assert.equal(outputValues.at(-1),'');assert.equal(manualMode,true);});
tree=render();
check('Manual mode renders labelled text input',()=>{assert.equal(inputOf(tree).props['aria-label'],'Enter a historical location or search term');});
check('Typing historical location passes real filter value',()=>{inputOf(tree).props.onChange({target:{value:'Old Warehouse'}});assert.equal(outputValues.at(-1),'Old Warehouse');});
manualMode=false;
tree=render('Retired Stockroom');
check('Previously applied historical filter remains editable',()=>assert.ok(inputOf(tree)));
check('Returning to All locations clears manual mode and applied value',()=>{selectOf(tree).props.onChange({target:{value:''}});assert.equal(outputValues.at(-1),'');assert.equal(manualMode,false);});
console.log(`Batch 105 report location dropdown: ${passed}/${passed} PASS`);
