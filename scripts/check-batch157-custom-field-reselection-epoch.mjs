import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const root=process.cwd();
const source=readFileSync(process.env.BATCH157_SOURCE || path.join(root,'src/pages/InventoryCapabilitiesPage.tsx'),'utf8');
const pkg=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
let count=0;
const check=(label,run)=>{run();count++;console.log('PASS '+label)};
const sf=ts.createSourceFile('InventoryCapabilitiesPage.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
check('TSX parses cleanly',()=>assert.equal(sf.parseDiagnostics.length,0));
check('TSX transpiles cleanly',()=>assert.equal((ts.transpileModule(source,{fileName:'InventoryCapabilitiesPage.tsx',reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0));
check('registered as selected regression',()=>assert.equal(pkg.scripts['check:batch157-custom-field-reselection-epoch'],'node scripts/check-batch157-custom-field-reselection-epoch.mjs'));
const panel=sf.statements.find(x=>ts.isFunctionDeclaration(x)&&x.name?.text==='CustomFieldsPanel');
check('CustomFieldsPanel present',()=>assert(panel));
const defs={};let click='';
(function walk(n){if(ts.isVariableDeclaration(n)&&['saveValues','changeEntityId','changeEntityType','customFieldSelectionEpochRef'].includes(n.name.getText(sf)))defs[n.name.getText(sf)]=n;if(ts.isJsxAttribute(n)&&n.name.text==='onClick'&&n.getText(sf).includes('saveValues.mutate('))click=n.getText(sf);ts.forEachChild(n,walk)})(panel);
for(const name of ['saveValues','changeEntityId','changeEntityType','customFieldSelectionEpochRef'])check('declaration '+name,()=>assert(defs[name]));
check('epoch initialized as zero',()=>assert.match(defs.customFieldSelectionEpochRef.initializer.getText(sf),/useRef\(0\)/));
check('record switch increments epoch before changing active ID',()=>assert.match(defs.changeEntityId.initializer.getText(sf),/customFieldSelectionEpochRef\.current \+= 1;[\s\S]*?activeCustomValueTargetRef\.current =/));
check('entity switch increments epoch before changing active type',()=>assert.match(defs.changeEntityType.initializer.getText(sf),/customFieldSelectionEpochRef\.current \+= 1;[\s\S]*?activeCustomValueTargetRef\.current =/));
check('permission/reactive type reset also increments epoch',()=>assert((panel.getText(sf).match(/customFieldSelectionEpochRef\.current \+= 1;/g)||[]).length>=4));
check('click captures epoch along with submitted entity',()=>assert.match(click,/targetSelectionEpoch: customFieldSelectionEpochRef\.current/));
const src=defs.saveValues.initializer.arguments[0].getText(sf);
check('success checks original target AND selection epoch twice',()=>assert.equal((src.match(/customFieldSelectionEpochRef\.current === targetSelectionEpoch/g)||[]).length,3));
check('failed save checks selection epoch',()=>assert.match(src,/onError:[\s\S]*?customFieldSelectionEpochRef\.current === targetSelectionEpoch/));
check('server readback still verifies posted values',()=>assert.match(src,/verifyCustomFieldReadback\(payload\.values, readback\)/));
check('mutation preserves PUT route',()=>assert.match(src,/method: 'PUT'/));
check('mutation preserves immutable payload',()=>assert.match(src,/body: JSON\.stringify\(payload\)/));
check('verified original-record cache always gets its result',()=>assert.match(src,/qc\.setQueryData\(\['custom-field-values', targetEntityType, targetEntityId\], verifiedRows\)/));
check('input draft still disabled during active save',()=>assert.match(panel.getText(sf),/disabled=\{saveValues\.isPending\}/));
const js=ts.transpileModule('const options='+src+';', {fileName:'unit.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function create(){
 const state={current:{entityType:'product',entityId:'p-A'}}, epoch={current:7}, dirty={current:true};
 const events={cache:[],errors:[],success:[],failure:[],requests:[]};
 const apiRequest=async (route,opts)=>{events.requests.push({route,opts});return opts?{ok:true}:[{field_key:'test_country',data_type:'text',value:'Croatia'}]};
 const qc={setQueryData:(key,data)=>events.cache.push({key,data})};
 const factory=new Function('apiRequest','qc','activeCustomValueTargetRef','customFieldSelectionEpochRef','customFieldDraftDirtyRef','setError','showTenantActionSuccess','showTenantActionError','verifyCustomFieldReadback','ui','messageFrom',js+'return options;');
 const options=factory(apiRequest,qc,state,epoch,dirty,x=>events.errors.push(x),x=>events.success.push(x),x=>events.failure.push(x), (values,rows)=>Object.entries(values).every(([k,v])=>rows.some(r=>r.field_key===k&&r.value===v)),x=>x,x=>x.message);
 const vars={targetEntityType:'product',targetEntityId:'p-A',targetSelectionEpoch:epoch.current,payload:{values:{test_country:'Croatia'},value_versions:{test_country:2},definition_versions:{test_country:5}}};
 return {state,epoch,dirty,events,options,vars};
}
const verifiedRows=[{field_key:'test_country',data_type:'text',value:'Croatia'}];
{
 const t=create(); const r=await t.options.mutationFn(t.vars);
 check('real PUT still hits originally selected record',()=>assert.equal(t.events.requests[0].route,'/inventory-capabilities/custom-fields/product/p-A'));
 check('real GET readback hits same submitted record',()=>assert.equal(t.events.requests[1].route,t.events.requests[0].route));
 check('payload value and optimistic versions unchanged',()=>assert.deepEqual(JSON.parse(t.events.requests[0].opts.body),t.vars.payload));
 t.options.onSuccess(r,t.vars);
 check('normal A save caches confirmed values',()=>assert.deepEqual(t.events.cache[0].key,['custom-field-values','product','p-A']));
 check('normal A save clears its old error',()=>assert.deepEqual(t.events.errors,[null]));
 check('normal A save unlocks dirty form',()=>assert.equal(t.dirty.current,false));
 check('normal A save shows exactly one success',()=>assert.equal(t.events.success.length,1));
}
{
 const t=create();t.state.current={entityType:'product',entityId:'p-B'};t.epoch.current++;t.state.current={entityType:'product',entityId:'p-A'};t.epoch.current++;t.dirty.current=true;
 t.options.onSuccess({verifiedRows},t.vars);
 check('A-B-A stale response still populates ORIGINAL query cache',()=>assert.deepEqual(t.events.cache[0].key,['custom-field-values','product','p-A']));
 check('A-B-A stale success does not wipe new A draft',()=>assert.equal(t.dirty.current,true));
 check('A-B-A stale success does not clear new A error',()=>assert.deepEqual(t.events.errors,[]));
 check('A-B-A stale success emits no toast for new session',()=>assert.deepEqual(t.events.success,[]));
 t.options.onError(new Error('old write failed'),t.vars);
 check('A-B-A stale error does not appear in new A session',()=>assert.deepEqual(t.events.errors,[]));
}
{
 const t=create();t.epoch.current++; // same target, new session
 t.options.onSuccess({verifiedRows},t.vars);
 check('same ID new session protected on success',()=>assert.equal(t.dirty.current,true));
 check('same ID new session protected from stale toast',()=>assert.equal(t.events.success.length,0));
 t.options.onError(new Error('old readback failed'),t.vars);
 check('same ID new session protected from stale error',()=>assert.deepEqual(t.events.errors,[]));
}
{
 const t=create(); t.state.current={entityType:'supplier',entityId:'p-A'};t.epoch.current++;
 t.options.onSuccess({verifiedRows},t.vars);
 check('cross-entity previous save never clears current form',()=>assert.equal(t.dirty.current,true));
 check('cross-entity previous save still caches only original product',()=>assert.deepEqual(t.events.cache[0].key,['custom-field-values','product','p-A']));
 check('cross-entity previous save has no success notice',()=>assert.equal(t.events.success.length,0));
}
{
 const t=create();t.options.onError(new Error('invalid value format'),t.vars);
 check('current selection still receives genuine write error',()=>assert.equal(t.events.errors[0],'invalid value format'));
 check('current selection keeps edited draft after PUT failure',()=>assert.equal(t.dirty.current,true));
 check('current selection does not receive false verified toast',()=>assert.deepEqual(t.events.success,[]));
}
console.log(`BATCH157 FOCUSED ${count}/${count} PASS`);
