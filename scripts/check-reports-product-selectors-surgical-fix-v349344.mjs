import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'src/pages/ReportsPage.tsx'),'utf8');
const i18n=fs.readFileSync(path.join(root,'src/i18n/tenantUiTranslations.ts'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
let passed=0;
function check(name,fn){fn();console.log(`PASS ${String(++passed).padStart(2,'0')} ${name}`);}
const start=source.indexOf('function AutocompleteFilterField(');
const end=source.indexOf('\nfunction DateRangeFields(',start);
const helper=source.slice(start,end);
check('Report product selector helper exists',()=>assert.ok(start>0&&end>start));
check('Old datalist popup removed from helper',()=>assert.doesNotMatch(helper,/<datalist|list=\{/));
check('Native select is present',()=>assert.match(helper,/<select[\s\S]*?value=\{manual \? manualOptionValue : value\}/));
check('Current tenant products appear as native options',()=>assert.match(helper,/options\.map\(\(option\) => <option key=\{option\} value=\{option\}>\{option\}<\/option>\)/));
check('Manual mode remains available for unknown and partial product names',()=>assert.match(helper,/customMode \|\| Boolean\(value && !options\.includes\(value\)\)/));
check('No catalog still permits free-text search',()=>assert.match(helper,/if \(!options\.length\) \{\s*return <TextFilterField/));
check('Typed product search retains maximum filter length',()=>assert.match(helper,/maxLength=\{MAX_REPORT_FILTER_LENGTH\}/));
check('Export-disabled state applies to both inputs',()=>assert.equal((helper.match(/disabled=\{disabled\}/g)||[]).length,3));
check('Manually typed product is not sent as the sentinel',()=>assert.match(helper,/onChange\(event\.target\.value\)/));
const contexts=[['product-movements','movementFilters'],['movement-ledger','ledgerFilters'],['purchase-order-commitments','poCommitmentFilters'],['purchasing-spend','spendFilters'],['slow-moving','slowFilters'],['usage-summary','usageFilters']];
for(const [tab,state] of contexts){
  const panel=source.slice(source.indexOf(`{activeTab === '${tab}' ? (`));
  const endPanel=panel.indexOf("\n      {activeTab === ");
  const area=endPanel<0?panel:panel.slice(0,endPanel);
  check(`${tab}: existing filter uses shared product selector`,()=>assert.match(area,new RegExp(`<AutocompleteFilterField label=\\{ui\\("Product"\\)\\} value=\\{${state}\\.product\\}`)));
  check(`${tab}: query state and tenant catalog remain connected`,()=>{assert.match(area,/options=\{filterOptions\.products\}/);assert.match(area,new RegExp(`updateAndClear\\(set[A-Za-z]+Filters, 'product', value\\)`));});
}
check('Registered regression script',()=>assert.equal(pkg.scripts['check:reports-product-selectors-v349344'],'node scripts/check-reports-product-selectors-surgical-fix-v349344.mjs'));
const diagnostics=ts.transpileModule(source,{fileName:'ReportsPage.tsx',reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error)??[];
check('Reports TSX has no isolated syntax diagnostics',()=>assert.equal(diagnostics.length,0));
const translated=ts.transpileModule(i18n,{fileName:'tenantUiTranslations.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
const module={exports:{}};
vm.runInNewContext(translated.outputText,{exports:module.exports,module,require:()=>({})});
for(const locale of ['en-GB','de-DE','es-ES','fr-FR','hr-HR']) {
  check(`Product selector messages translated: ${locale}`,()=>{
    for(const key of ['Other product or manual search…','Enter a product name or search term']){
      const value=module.exports.translateTenantUi(locale,key);assert.ok(value?.trim());if(locale!=='en-GB')assert.notEqual(value,key);
    }
  });
}
const transpiled=ts.transpileModule(`const MAX_REPORT_FILTER_LENGTH=120;\n${helper}\nexports.Filter=AutocompleteFilterField;`,{fileName:'productFilter.tsx',compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
let customMode=false;
const jsx=(type,props)=>({type,props});
const exports={};
vm.runInNewContext(transpiled,{exports,require:(name)=>{assert.equal(name,'react/jsx-runtime');return{jsx,jsxs:jsx};},useState:()=>[customMode,(value)=>{customMode=value;}],useAppTranslation:()=>({ui:(text)=>text}),TextFilterField:()=>null});
const results=[];
const render=(value='',options=['Milk','Crasssh Peanuts'])=>exports.Filter({label:'Product',value,placeholder:'Any product name',options,onChange:(v)=>results.push(v),disabled:false,listId:'products-report'});
const children=(node)=>Array.isArray(node.props.children)?node.props.children:[node.props.children];
const select=(node)=>children(node).find(x=>x?.type==='select');
const input=(node)=>children(node).find(x=>x?.type==='input');
customMode=false;
let tree=render();
check('Default is one select and no duplicate text box',()=>{assert.ok(select(tree));assert.equal(input(tree),undefined);});
check('Select current product keeps original filter string',()=>{select(tree).props.onChange({target:{value:'Milk'}});assert.equal(results.at(-1),'Milk');});
check('Manual search option clears previous product and enables input',()=>{select(tree).props.onChange({target:{value:'__manual_product_search__'}});assert.equal(customMode,true);assert.equal(results.at(-1),'');});
tree=render();
check('Manual input renders a clear accessible label',()=>assert.equal(input(tree).props['aria-label'],'Enter a product name or search term'));
check('Partial name search forwards exact text',()=>{input(tree).props.onChange({target:{value:'Crasssh'}});assert.equal(results.at(-1),'Crasssh');});
customMode=false;
tree=render('Discontinued Peanuts');
check('Existing historical product filter stays editable when not in catalog',()=>assert.ok(input(tree)));
check('Selecting Any product clears filter and leaves manual mode',()=>{select(tree).props.onChange({target:{value:''}});assert.equal(customMode,false);assert.equal(results.at(-1),'');});
check('No catalog falls back to controlled free text field',()=>{const fallback=render('Old product',[]);assert.equal(fallback.props.value,'Old product');assert.equal(fallback.type.name,'TextFilterField');});
console.log(`Batch 106 Reports product selector: ${passed}/${passed} PASS`);
