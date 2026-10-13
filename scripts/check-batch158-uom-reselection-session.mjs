import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const root=process.cwd();
const source=readFileSync(process.env.BATCH158_SOURCE || path.join(root,'src/pages/InventoryCapabilitiesPage.tsx'),'utf8');
const pkg=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
let n=0;
function check(label,fn){fn();n++;console.log('PASS '+label)}
const ast=ts.createSourceFile('InventoryCapabilitiesPage.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
check('TSX parses',()=>assert.equal(ast.parseDiagnostics.length,0));
check('TSX transpiles',()=>assert.equal((ts.transpileModule(source,{fileName:'InventoryCapabilitiesPage.tsx',reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0));
check('Batch158 test registered',()=>assert.equal(pkg.scripts['check:batch158-uom-reselection-session'],'node scripts/check-batch158-uom-reselection-session.mjs'));
const panel=ast.statements.find(x=>ts.isFunctionDeclaration(x)&&x.name?.text==='UomPanel');
check('UomPanel exists',()=>assert(panel));
const declarations={}; let saveClick='', deleteClick='';
(function walk(x){if(ts.isVariableDeclaration(x)&&['save','remove','changeProduct','uomSelectionEpochRef'].includes(x.name.getText(ast))) declarations[x.name.getText(ast)]=x;if(ts.isJsxAttribute(x)&&x.name.text==='onClick'){const t=x.getText(ast);if(t.includes('save.mutate({'))saveClick=t;if(t.includes('remove.mutate({'))deleteClick=t}ts.forEachChild(x,walk)})(panel);
for(const k of ['save','remove','changeProduct','uomSelectionEpochRef'])check('declaration '+k,()=>assert(declarations[k]));
check('epoch synchronously increments on selection',()=>assert.match(declarations.changeProduct.getText(ast),/uomSelectionEpochRef\.current \+= 1;\s*activeUomProductRef\.current = id/));
check('save captures original selection epoch',()=>assert.match(saveClick,/targetSelectionEpoch: uomSelectionEpochRef\.current/));
check('delete captures original selection epoch',()=>assert.match(deleteClick,/targetSelectionEpoch: uomSelectionEpochRef\.current/));
const panelSource=panel.getText(ast);
for(const field of ['CASE','Case','24'])check(`edit ${field} locked during pending save`,()=>assert.match(panelSource,new RegExp(`placeholder=(?:\\{ui\\()?"${field}"[\\s\\S]{0,130}?disabled=\\{[^}]*save\\.isPending\\}`)));
for(const field of ['purchase','issue'])check(`checkbox ${field} locked during pending save`,()=>assert.match(panelSource,new RegExp(`checked=\\{${field}\\}[\\s\\S]{0,100}?disabled=\\{!canWrite \\|\\| save\\.isPending\\}`)));
const saveCode=declarations.save.initializer.arguments[0].getText(ast),delCode=declarations.remove.initializer.arguments[0].getText(ast);
check('save retains verified server GET',()=>assert.match(saveCode,/apiRequest<UomResponse>\(`/));
check('save confirms factor and usage flags',()=>{assert.match(saveCode,/factorMatches/);assert.match(saveCode,/purchase_uom/);assert.match(saveCode,/issue_uom/)});
check('save successful completion checks epoch',()=>assert.match(saveCode,/if \(targetSelectionEpoch !== undefined && uomSelectionEpochRef\.current !== targetSelectionEpoch\) return;[\s\S]*?clearUomForm/));
check('save failure checks epoch',()=>assert.match(saveCode,/onError:[\s\S]*?targetSelectionEpoch !== undefined && uomSelectionEpochRef\.current !== targetSelectionEpoch/));
check('delete successful completion checks epoch',()=>assert.match(delCode,/if \(targetSelectionEpoch !== undefined && uomSelectionEpochRef\.current !== targetSelectionEpoch\) return;[\s\S]*?clearUomForm/));
check('delete failed completion checks epoch',()=>assert.match(delCode,/onError:[\s\S]*?uomSelectionEpochRef\.current === targetSelectionEpoch/));
const code=ts.transpileModule(`const saveOptions=${saveCode};const deleteOptions=${delCode};const changeProduct=${declarations.changeProduct.initializer.getText(ast)};`,{fileName:'batch158-run.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function scenario(mode='valid'){
 const epoch={current:0},active={current:'p-A'},seq={current:0};
 const events={requests:[],cache:[],invalidations:[],clears:0,conversions:[],errors:[],success:[],failure:[],selected:[]};
 const qc={setQueryData:(key,data)=>events.cache.push({key,data}),invalidateQueries:({queryKey})=>events.invalidations.push(queryKey)};
 const apiRequest=async (url,opts)=>{events.requests.push({url,opts});if(opts)return {ok:true};if(mode==='throw')throw new Error('readback unavailable');return {base_uom:'pcs',conversions:mode==='missing'?[]:[{uom_code:'CASE',factor_to_base:24,purchase_uom:true,issue_uom:false}]}};
 const build=new Function('apiRequest','qc','activeUomProductRef','uomSelectionEpochRef','conversionRequestSeqRef','clearUomForm','setConverted','setError','ui','messageFrom','showTenantActionSuccess','showTenantActionError','editingUom','setProductId','setFromUom','setToUom',code+'return {saveOptions,deleteOptions,changeProduct};');
 const x=build(apiRequest,qc,active,epoch,seq,()=>events.clears++,x=>events.conversions.push(x),x=>events.errors.push(x),x=>x,e=>e.message,x=>events.success.push(x),x=>events.failure.push(x),{id:'CASE'},x=>events.selected.push(x),()=>{},()=>{});
 const payload={uom_code:'CASE',uom_name:'Case',factor_to_base:24,purchase_uom:true,issue_uom:false,expected_version:0};
 return {...x,epoch,active,seq,events,vars:{targetProductId:'p-A',targetSelectionEpoch:epoch.current,payload},removeVars:{targetProductId:'p-A',targetSelectionEpoch:epoch.current,row:{id:'u-1',version:3}}};
}
{
 const s=scenario();await s.saveOptions.mutationFn(s.vars);await s.saveOptions.onSuccess({},s.vars);
 check('normal CASE24 save posts target A',()=>assert.equal(s.events.requests[0].url,'/inventory-capabilities/products/p-A/uom'));
 check('normal CASE24 verified GET reads A',()=>assert.equal(s.events.requests[1].url,s.events.requests[0].url));
 check('normal verified save clears form',()=>assert.equal(s.events.clears,1));
 check('normal verified save reports success',()=>assert.equal(s.events.success.length,1));
}
{
 const s=scenario();s.changeProduct('p-B');s.changeProduct('p-A');
 check('A-B-A returns to same ID with different epoch',()=>{assert.equal(s.active.current,'p-A');assert.equal(s.epoch.current,2);assert.notEqual(s.epoch.current,s.vars.targetSelectionEpoch)});
 const clears=s.events.clears,events=s.events.success.length;
 await s.saveOptions.onSuccess({},s.vars);
 check('stale verified save still caches original A',()=>assert.deepEqual(s.events.cache.at(-1).key,['uom','p-A']));
 check('stale verified save does not clear newly selected A draft',()=>assert.equal(s.events.clears,clears));
 check('stale verified save does not report new-session success',()=>assert.equal(s.events.success.length,events));
 s.saveOptions.onError(new Error('old POST failed'),s.vars);
 check('stale save error does not affect new session',()=>assert.equal(s.events.errors.length,2)); // two changeProduct clear calls
}
{
 const s=scenario('missing');s.changeProduct('p-B');s.changeProduct('p-A');await s.saveOptions.onSuccess({},s.vars);
 check('stale unverified POST still invalidates original A query',()=>assert.deepEqual(s.events.invalidations.at(-1),['uom','p-A']));
 check('stale unverified POST cannot warn freshly selected A',()=>assert.equal(s.events.failure.length,0));
}
{
 const s=scenario('throw');s.changeProduct('p-B');s.changeProduct('p-A');await s.saveOptions.onSuccess({},s.vars);
 check('stale readback exception cannot warn new A session',()=>assert.equal(s.events.failure.length,0));
}
{
 const s=scenario();s.changeProduct('p-B');s.changeProduct('p-A');s.deleteOptions.onSuccess({},s.removeVars);
 check('stale delete invalidates original A cache',()=>assert.deepEqual(s.events.invalidations.at(-1),['uom','p-A']));
 check('stale delete does not clear newly selected A form',()=>assert.equal(s.events.clears,2));
 check('stale delete does not reset current conversion',()=>assert.equal(s.events.conversions.length,2));
 s.deleteOptions.onError(new Error('old delete failed'),s.removeVars);
 check('stale delete failure does not populate new A errors',()=>assert.equal(s.events.errors.length,2));
}
{
 const s=scenario();s.deleteOptions.onSuccess({},s.removeVars);
 check('current delete still clears edit form',()=>assert.equal(s.events.clears,1));
 check('current delete still refreshes original product',()=>assert.deepEqual(s.events.invalidations,[['uom','p-A']]));
 s.deleteOptions.onError(new Error('delete failed'),s.removeVars);
 check('current delete still reports error',()=>assert.equal(s.events.errors.at(-1),'delete failed'));
}
console.log(`BATCH158 FOCUSED ${n}/${n} PASS`);
