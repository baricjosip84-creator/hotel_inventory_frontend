// Exercise the actual changed frontend handlers, without network or fixture modification.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const ts=createRequire(import.meta.url)('typescript');
const root=fileURLToPath(new URL('../../',import.meta.url));
function parse(file,kind=ts.ScriptKind.TSX){
 const ast=ts.createSourceFile(file,fs.readFileSync(root+file,'utf8'),ts.ScriptTarget.Latest,true,kind);
 assert.equal(ast.parseDiagnostics.length,0,file);return ast;
}
function declarations(ast,names){
 const found=new Map();function walk(n){if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name)&&names.includes(n.name.text)&&n.initializer)found.set(n.name.text,n.initializer.getText(ast));ts.forEachChild(n,walk);}walk(ast);
 return names.map(n=>{assert(found.has(n),n);return `const ${n}=${found.get(n)};`;}).join('\n');
}
const ins=parse('src/pages/InsightsPage.tsx');const storage=parse('src/pages/StorageLocationsPage.tsx');
const insightNames=['updateSupplierView','setSupplierSearch','setSupplierRiskFilter','setSupplierTierFilter','setSupplierSort','setSupplierPageSize','setSupplierPage','setSelectedSupplierId'];
const makeInsights=new Function('searchParams','setSearchParams','supplierPage',ts.transpile(declarations(ins,insightNames))+`\nreturn {${insightNames.join(',')}};`);
const lib=fs.readFileSync(root+'src/lib/storageLocationDirectoryUrl.ts','utf8');
const helper=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(ts.transpileModule(lib,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText));
const storageNames=['changeDirectorySearch','changeDirectoryZone','clearFilters'];
const makeStorage=new Function('searchParams','setSearchParams','search','zoneFilter','requestedLocationId','setSearchDraft','storageLocationDirectoryFilterParams','storageLocationDirectoryShowAllParams',ts.transpile(declarations(storage,storageNames))+`\nreturn {${storageNames.join(',')}};`);
let checks=0;
function equal(a,b){assert.equal(a,b);checks++;}
function setup(url,kind){let current=new URLSearchParams(url),writes=0;const set=(p,o)=>{assert.equal(o.replace,true);assert(p instanceof URLSearchParams);current=p;writes++;};return {get params(){return current;},get writes(){return writes;},render(){return kind==='i'?makeInsights(current,set,Number(current.get('supplier_page')||1)):makeStorage(current,set,current.get('search')||'',current.get('zone')||'',current.get('location_id')||'',()=>{},helper.storageLocationDirectoryFilterParams,helper.storageLocationDirectoryShowAllParams);}};}
const i=setup('origin=fixture','i');i.render().setSelectedSupplierId('old');i.render().setSupplierPage(p=>p+1);equal(i.params.get('supplier_page'),'2');i.render().setSupplierSearch('Synthetic Supplier 09');equal(i.params.get('supplier_search'),'Synthetic Supplier 09');equal(i.params.has('supplier_page'),false);equal(i.params.has('supplier_id'),false);equal(i.params.get('origin'),'fixture');equal(i.writes,3);
for(const [name,value,key] of [['setSupplierRiskFilter','high','supplier_risk'],['setSupplierTierFilter','risk','supplier_tier'],['setSupplierSort','trust_asc','supplier_sort'],['setSupplierPageSize',12,'supplier_page_size']]){const c=setup('supplier_id=old&supplier_page=2&origin=fixture','i');c.render()[name](value);equal(c.params.get(key),String(value));equal(c.params.has('supplier_page'),false);equal(c.params.has('supplier_id'),false);equal(c.params.get('origin'),'fixture');equal(c.writes,1);}
const chips=setup('supplier_search=old&supplier_risk=high&supplier_tier=risk&supplier_page=2&supplier_id=old&origin=x','i');chips.render().updateSupplierView({supplier_search:null,supplier_risk:'all',supplier_tier:'all'},true);equal(chips.params.toString(),'origin=x');equal(chips.writes,1);
const mixed=setup('supplier_risk=high&supplier_tier=risk&supplier_page=2&supplier_id=old&origin=x','i');mixed.render().updateSupplierView({supplier_tier:'strong',supplier_risk:'all'},true);equal(mixed.params.get('supplier_tier'),'strong');equal(mixed.params.has('supplier_risk'),false);equal(mixed.params.has('supplier_page'),false);equal(mixed.params.has('supplier_id'),false);equal(mixed.writes,1);
const s=setup('source=fixture&location_id=cold','s');s.render().changeDirectorySearch('warehouse');s.render().changeDirectoryZone('Ambient');equal(s.params.toString(),'source=fixture&search=warehouse&zone=Ambient');equal(s.writes,2);s.render().clearFilters();equal(s.params.toString(),'source=fixture');equal(s.writes,3);
const z=setup('location_id=main&origin=inventory','s');z.render().changeDirectoryZone('Chilled');equal(z.params.toString(),'origin=inventory&zone=Chilled');equal(z.writes,1);
const text=setup('origin=x','s');text.render().changeDirectorySearch('warehouse ');text.render().changeDirectorySearch('warehouse annex');equal(text.params.get('search'),'warehouse annex');equal(text.params.get('origin'),'x');
console.log(`PASS ${checks}/${checks} actual frontend URL-handler assertions (local, not browser execution)`);
