import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const source = readFileSync(process.env.BATCH167_PAGE_SOURCE || path.join(root,'src/pages/InventoryCapabilitiesPage.tsx'),'utf8');
const selectorSource = readFileSync(path.join(root,'src/components/inventory/ProductUomSelect.tsx'),'utf8');
const pkg = JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
let checks = 0;
const check = (label, fn) => { fn(); checks++; console.log('PASS',label); };
const ast = ts.createSourceFile('InventoryCapabilitiesPage.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
check('inventory capability TSX parses', () => assert.equal(ast.parseDiagnostics.length, 0));
const selectorAst = ts.createSourceFile('ProductUomSelect.tsx', selectorSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
check('shared UoM selector TSX parses', () => assert.equal(selectorAst.parseDiagnostics.length, 0));
check('regression is registered', () => assert.equal(pkg.scripts['check:batch167-uom-selector-cache-coherence'],'node scripts/check-batch167-uom-selector-cache-coherence.mjs'));
check('selector uses independently cached key', () => assert.match(selectorSource, /queryKey: \['product-uom-options', productId\]/));
check('selector has 60s cache retention', () => assert.match(selectorSource, /staleTime: 60_000/));
const panel = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'UomPanel');
check('original UoM panel located', () => assert(panel));
const vars = {};
(function walk(n) {
  if (ts.isVariableDeclaration(n) && ['save','remove'].includes(n.name.getText(ast))) vars[n.name.getText(ast)] = n;
  ts.forEachChild(n,walk);
})(panel);
check('original save mutation located', () => assert(vars.save));
check('original delete mutation located', () => assert(vars.remove));
const code = ts.transpileModule(`const saveOptions = ${vars.save.initializer.arguments[0].getText(ast)}; const deleteOptions = ${vars.remove.initializer.arguments[0].getText(ast)};`, {
  fileName:'batch167-handlers.ts', compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}
}).outputText;
const known = { base_uom: 'PCS', conversions: [{id:'a-conversion',uom_code:'CASE',uom_name:'Case',factor_to_base:'24',purchase_uom:false,issue_uom:false,version:1}] };
function setup(state='ok') {
 const cache = new Map([['product-uom-options|A',{base_uom:'PCS',conversions:[]}],['product-uom-options|B',{base_uom:'PCS',conversions:[]}]]);
 const events={set:[],invalidate:[],errors:[],success:[],clears:0};
 const qc={setQueryData(key,data){events.set.push(key);cache.set(key.join('|'),data);},invalidateQueries({queryKey}){events.invalidate.push(queryKey);cache.delete(queryKey.join('|'));return Promise.resolve();}};
 const activeUomProductRef={current:'A'},uomSelectionEpochRef={current:0},conversionRequestSeqRef={current:0};
 const apiRequest=async (url) => {assert.match(url,/\/products\/A\/uom$/); if (state==='fail') throw new Error('readback unavailable'); return state==='missing'?{base_uom:'PCS',conversions:[]}:known;};
 const clearUomForm=()=>events.clears++;
 const setConverted=()=>{};
 const setError=x=>events.errors.push(x);
 const showTenantActionError=x=>events.errors.push(x);
 const showTenantActionSuccess=x=>events.success.push(x);
 const messageFrom=e=>e.message;
 const ui=x=>x;
 const editingUom=null;
 const build = new Function('apiRequest','qc','activeUomProductRef','uomSelectionEpochRef','conversionRequestSeqRef','clearUomForm','setConverted','setError','ui','messageFrom','showTenantActionSuccess','showTenantActionError','editingUom',`${code}\nreturn {saveOptions,deleteOptions};`);
 const handlers = build(apiRequest,qc,activeUomProductRef,uomSelectionEpochRef,conversionRequestSeqRef,clearUomForm,setConverted,setError,ui,messageFrom,showTenantActionSuccess,showTenantActionError,editingUom);
 const payload={uom_code:'CASE',uom_name:'Case',factor_to_base:24,purchase_uom:false,issue_uom:false,expected_version:0};
 const saveVars={targetProductId:'A',targetSelectionEpoch:0,payload};
 const deleteVars={targetProductId:'A',targetSelectionEpoch:0,row:known.conversions[0]};
 return { ...handlers, cache, events, saveVars, deleteVars, activeUomProductRef, uomSelectionEpochRef };
}
const normal=setup();
check('before save other UoM selector has no CASE',()=>assert.equal(normal.cache.get('product-uom-options|A').conversions.length,0));
await normal.saveOptions.onSuccess({},normal.saveVars);
check('verified save populates UoM editing cache',()=>assert.deepEqual(normal.cache.get('uom|A'),known));
check('verified save also populates live workflow selector cache',()=>assert.deepEqual(normal.cache.get('product-uom-options|A'),known));
check('CASE=24 visible in workflow selector immediately',()=>assert.equal(Number(normal.cache.get('product-uom-options|A').conversions.find(x=>x.uom_code==='CASE').factor_to_base),24));
check('verified save sets both keys for original product',()=>assert.deepEqual(normal.events.set,[['uom','A'],['product-uom-options','A']]));
check('other product selector cache stays untouched',()=>assert.equal(normal.cache.get('product-uom-options|B').conversions.length,0));
check('verified save does not cause redundant invalidation',()=>assert.deepEqual(normal.events.invalidate,[]));
check('verified save preserves form reset',()=>assert.equal(normal.events.clears,1));
check('verified save still gives success feedback',()=>assert.equal(normal.events.success.length,1));
for (const state of ['missing','fail']) {
 const s=setup(state);await s.saveOptions.onSuccess({},s.saveVars);
 check(`${state}: existing UoM editing cache invalidated`,()=>assert(s.events.invalidate.some(k=>k.join('|')==='uom|A')));
 check(`${state}: independently cached selector invalidated`,()=>assert(s.events.invalidate.some(k=>k.join('|')==='product-uom-options|A')));
 check(`${state}: unrelated selector retained`,()=>assert(s.cache.has('product-uom-options|B')));
 check(`${state}: no verified selector data injected`,()=>assert.equal(s.events.set.length,0));
 check(`${state}: no misleading success`,()=>assert.equal(s.events.success.length,0));
}
{
 const s=setup();s.deleteOptions.onSuccess({},s.deleteVars);
 check('delete invalidates UoM page cache',()=>assert(s.events.invalidate.some(k=>k.join('|')==='uom|A')));
 check('delete invalidates workflow selector cache',()=>assert(s.events.invalidate.some(k=>k.join('|')==='product-uom-options|A')));
 check('delete retains unrelated product selector',()=>assert(s.cache.has('product-uom-options|B')));
}
{
 const s=setup();s.activeUomProductRef.current='B';s.uomSelectionEpochRef.current=1;
 await s.saveOptions.onSuccess({},s.saveVars);
 check('stale-product save still updates original product selector cache',()=>assert.deepEqual(s.cache.get('product-uom-options|A'),known));
 check('stale-product save does not touch B selector data',()=>assert.equal(s.cache.get('product-uom-options|B').conversions.length,0));
 check('stale-product save does not clear current form',()=>assert.equal(s.events.clears,0));
 s.deleteOptions.onSuccess({},s.deleteVars);
 check('stale-product delete invalidates original selector',()=>assert(!s.cache.has('product-uom-options|A')));
 check('stale-product delete does not clear current form',()=>assert.equal(s.events.clears,0));
}
{
 const s=setup();s.activeUomProductRef.current='A';s.uomSelectionEpochRef.current=2;
 await s.saveOptions.onSuccess({},s.saveVars);
 check('A-B-A session restores original selector cache',()=>assert.deepEqual(s.cache.get('product-uom-options|A'),known));
 check('A-B-A session does not clear newer A draft',()=>assert.equal(s.events.clears,0));
 s.deleteOptions.onSuccess({},s.deleteVars);
 check('A-B-A stale delete still invalidates original A selector',()=>assert(!s.cache.has('product-uom-options|A')));
 check('A-B-A stale delete leaves newly selected form alone',()=>assert.equal(s.events.clears,0));
}
console.log(`BATCH167 FOCUSED: ${checks}/${checks} PASS`);
