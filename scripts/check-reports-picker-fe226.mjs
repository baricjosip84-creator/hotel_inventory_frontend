// Executable Reports location selection and design regression, FE226.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const require = createRequire(import.meta.url);
let ts;
try {ts=require('typescript');}
catch {ts=require(path.join(execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim(),'typescript'));}
const read = name => fs.readFileSync(new URL(`../${name}`,import.meta.url),'utf8');
const source = read('src/components/reports/ReportPicker.tsx');
const page = read('src/pages/ReportsPage.tsx');
const css = read('src/pages/ReportsPage.css');
const pkg = JSON.parse(read('package.json'));
let count = 0;
function check(ok, message) { assert.ok(ok,message); count++; console.log('PASS',message); }
const parsed = ts.createSourceFile('ReportPicker.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
check(parsed.parseDiagnostics.length === 0, 'picker TSX syntax parses');
const pageParsed = ts.createSourceFile('ReportsPage.tsx',page,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
check(pageParsed.parseDiagnostics.length === 0, 'full Reports page TSX syntax parses');
check(!page.includes('<select'), 'Reports has no OS-native select popups');
check(page.includes('function HistoricalLocationFilterField') && page.includes("ui('Other or historical location…')"), 'historical location still has typed option');
check(page.includes('function AutocompleteFilterField') && page.includes("ui('Other product or manual search…')"), 'historical product still has manual search');
check(page.includes('updateAndClear(setLedgerFilters, \'location\', value)'), 'Movement Ledger writes actual selected location');
check(page.includes('fetchMovementLedger(ledgerFilters)'), 'Movement Ledger read is scoped by same filter state');
check(page.includes('buildQueryString(filters)'), 'API requests serialize selected filters');
check(page.includes('filterOptions.locations'), 'Location choices come from tenant filter options');
check(page.includes('value={ledgerFilters.location}'), 'ReportPicker is controlled by current Ledger location');
check(page.includes('Result limit') && page.includes('Threshold scope'), 'other report filters use shared picker');
check(css.includes('.reports-picker-menu') && css.includes('z-index: 90'), 'popup has distinct app style and layering');
check(css.includes('reports-picker-trigger:focus-visible'), 'keyboard focus has visible outline');
check(source.includes("document.addEventListener('pointerdown', closeOutside)"), 'outside click closes popup');
check(source.includes('aria-selected={optionValue === value}'), 'options expose selected state');
check(source.includes("event.key === 'Escape'"), 'Escape closes popup');
check(source.includes("event.key === 'ArrowDown'"), 'ArrowDown navigates popup');
check(source.includes("event.key === 'Enter'"), 'Enter commits focused option');
check(source.includes('onChange(nextValue)'), 'selection commits exact option value');
check(pkg.scripts['check:reports-picker-fe226'] === 'node scripts/check-reports-picker-fe226.mjs', 'regression is registered');

const cjs = ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
let hookState=[],hookIndex=0;
const createElement = (type, props, key) => ({type, props:props||{}, key});
const react = {
 useState(initial) { const i=hookIndex++; if (!(i in hookState)) hookState[i]=initial;
   return [hookState[i], value => hookState[i]=typeof value === 'function'?value(hookState[i]):value]; },
 useRef(initial=null){return {current:initial}},
 useMemo(fn){return fn()}, useEffect(){}, useId(){return 'test-instance'}
};
const module={exports:{}};
const context={module,exports:module.exports,Set,Boolean,Math,Number,String,console,
 require(specifier){
   if (specifier==='react') return react;
   if (specifier==='react/jsx-runtime') return {jsx:createElement,jsxs:createElement};
   if (specifier.includes('I18nContext')) return {useAppTranslation:()=>({ui:x=>x})};
   throw Error('Unexpected require '+specifier);
 }};
vm.runInNewContext(cjs,context,{timeout:2500});
const Picker=module.exports.default;
let selected;
const props={label:'Location', value:'Main Warehouse', options:[['','Any location'],['Main Warehouse','Main Warehouse'],['Kitchen Store','Kitchen Store'],['Storage Vezica','Storage Vezica']], onChange:value=>{selected=value}};
const walk = (node,fn) => {
 if (node===null || node===undefined || typeof node==='boolean') return null;
 if (Array.isArray(node)) {for(const v of node){const match=walk(v,fn);if(match)return match;}return null;}
 if(typeof node !== 'object')return null;
 if(fn(node))return node;
 return walk(node.props?.children,fn);
};
function render(){hookIndex=0;return Picker(props)}
let tree=render();
const combo=walk(tree,node=>node.props?.role==='combobox');
check(Boolean(combo),'real picker renders accessible combobox');
check(combo.props['aria-expanded']===false,'initial popup is collapsed');
combo.props.onClick();
tree=render();
check(walk(tree,node=>node.props?.role==='combobox').props['aria-expanded']===true,'click opens application popup');
const location=walk(tree,node=>node.props?.role==='option' && node.props?.children==='Kitchen Store');
check(Boolean(location), 'alternate location is exposed in picker');
location.props.onClick();
check(selected==='Kitchen Store', 'clicking another location emits exact persisted filter value');
props.value=selected;
tree=render();
check(walk(tree,node=>node.props?.role==='combobox').props['aria-expanded']===false,'selection closes popup');
check(walk(tree,node=>node.props?.className==='reports-picker-trigger-text').props.children==='Kitchen Store','selected Location is visible after a controlled rerender');
check(walk(tree,node=>node.props?.role==='combobox').props.disabled===false,'enabled control stays selectable');
console.log(`REPORTS PICKER FE226: ${count}/${count} PASS`);
