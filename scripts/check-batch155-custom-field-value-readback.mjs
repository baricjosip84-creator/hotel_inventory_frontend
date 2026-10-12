import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const source = readFileSync(process.env.BATCH155_PAGE_SOURCE || path.join(root, 'src/pages/InventoryCapabilitiesPage.tsx'), 'utf8');
const helper = readFileSync(path.join(root, 'src/lib/customFieldValueReadback.ts'), 'utf8');
const translations = readFileSync(path.join(root, 'src/i18n/tenantUiTranslations.ts'), 'utf8');
const routes = readFileSync(path.join(root, '../hotel-inventory-backend/src/routes/inventoryCapabilities.js'), 'utf8');
const service = readFileSync(path.join(root, '../hotel-inventory-backend/src/services/inventory/inventoryCapabilitiesService.js'), 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
let checks = 0;
const check = (name, fun) => {fun();checks++;console.log('PASS',name)};
const ast = ts.createSourceFile('InventoryCapabilitiesPage.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
check('TSX parses', () => assert.equal(ast.parseDiagnostics.length,0));
check('TSX transpiles', () => assert.equal((ts.transpileModule(source,{fileName:'InventoryCapabilitiesPage.tsx',reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).diagnostics || []).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0));
check('new regression registered',()=>assert.equal(pkg.scripts['check:batch155-custom-field-value-readback'],'node scripts/check-batch155-custom-field-value-readback.mjs'));
check('value verification helper imported',()=>assert.match(source,/import \{ verifyCustomFieldReadback \} from '\.\.\/lib\/customFieldValueReadback'/));
check('tenant permission for write preserved',()=>assert.match(routes,/router\.put\('\/custom-fields\/:entityType\/:entityId', requireCustomFieldEntityPermission\('write'\)/));
check('backend remains JSON encoded text',()=>assert.match(service,/JSON\.stringify\(value\)/));
check('database-bound value explicitly cast as jsonb',()=>assert.match(service,/\$5::jsonb/));
for(const phrase of ['Custom field values saved and verified.','The save was accepted, but its values could not be verified. Refresh before retrying.'])
 check(`${phrase} translated in all five locales`,()=>assert.match(translations,new RegExp('\\["'+phrase.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'",\\s*"[^"\\n]+",\\s*"[^"\\n]+",\\s*"[^"\\n]+",\\s*"[^"\\n]+"\\]')));
const helperJs = ts.transpileModule(helper,{fileName:'customFieldValueReadback.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const module = {exports:{}};
new Function('module','exports',helperJs)(module,module.exports);
const verify = module.exports.verifyCustomFieldReadback;
const rows = [{field_key:'test_country',data_type:'text',value:'Croatia'}];
check('Croatia string readback accepted',()=>assert.equal(verify({test_country:'Croatia'},rows),true));
check('different stored text rejected',()=>assert.equal(verify({test_country:'Croatia'},[{...rows[0],value:'Italy'}]),false));
check('missing field rejected',()=>assert.equal(verify({test_country:'Croatia'},[]),false));
check('null text rejected',()=>assert.equal(verify({test_country:'Croatia'},[{...rows[0],value:null}]),false));
check('text numeric coercion rejected',()=>assert.equal(verify({test_country:'42'},[{...rows[0],value:42}]),false));
check('empty optional value validates stored JSON null',()=>assert.equal(verify({test_country:''},[{...rows[0],value:null}]),true));
check('empty optional not silently accepted as nonempty',()=>assert.equal(verify({test_country:''},rows),false));
check('boolean false remains false',()=>assert.equal(verify({active:false},[{field_key:'active',data_type:'boolean',value:false}]),true));
check('boolean true is not equivalent to false',()=>assert.equal(verify({active:true},[{field_key:'active',data_type:'boolean',value:false}]),false));
check('numeric field exact numeric comparison',()=>assert.equal(verify({weight:'24'},[{field_key:'weight',data_type:'number',value:24}]),true));
check('numeric mismatch rejected',()=>assert.equal(verify({weight:'24'},[{field_key:'weight',data_type:'number',value:25}]),false));
check('select text confirmed exactly',()=>assert.equal(verify({country:'Croatia'},[{field_key:'country',data_type:'select',value:'Croatia'}]),true));
check('date returned verbatim',()=>assert.equal(verify({date:'2026-10-12'},[{field_key:'date',data_type:'date',value:'2026-10-12'}]),true));
check('multi-field verification rejects missing second value',()=>assert.equal(verify({test_country:'Croatia',city:'Rijeka'},rows),false));
const panel=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='CustomFieldsPanel');
check('original CustomFieldsPanel present',()=>assert(panel));
let save;
(function walk(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='saveValues')save=node;ts.forEachChild(node,walk)})(panel);
check('saveValues mutation located',()=>assert(save));
const mutationSrc=save.initializer.arguments[0].getText(ast);
check('write suppresses early success toast',()=>assert.match(mutationSrc,/skipMutationFeedback: true/));
check('write then GET checks committed row',()=>assert.match(mutationSrc,/await apiRequest<CustomValueRow\[]>\(endpoint\)/));
check('mismatch triggers uncertainty',()=>assert.match(mutationSrc,/CUSTOM_FIELD_READBACK_UNVERIFIED/));
check('success caches verified server rows',()=>assert.match(mutationSrc,/qc\.setQueryData\(\['custom-field-values', targetEntityType, targetEntityId\], verifiedRows\)/));
check('new selection is protected on callback',()=>assert.match(mutationSrc,/activeCustomValueTargetRef\.current\.entityId === targetEntityId/));
check('failed verification does not reload and erase entered values',()=>assert.doesNotMatch(mutationSrc,/invalidateQueries\(/));
check('UI values cannot change while saving',()=>assert.match(panel.getText(ast),/disabled=\{saveValues\.isPending\}/));
const js=ts.transpileModule(`const options=${mutationSrc};`,{fileName:'callbacks.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function scenario(mode='good') {
 const events={requests:[],errors:[],cached:[],invalidated:[],success:[],failure:[]};
 const state={current:{entityType:'product',entityId:'p-A'}};
 const customFieldDraftDirtyRef={current:true};
 const customFieldSelectionEpochRef={current:0};
 const apiRequest=async (url,opts) => {
  events.requests.push({url,opts});
  if(opts){if(mode==='putFail')throw new Error('invalid value format'); return {ok:true};}
  if(mode==='getFail')throw new Error('network interrupted');
  if(mode==='mismatch')return [{...rows[0],value:'Italy'}];
  if(mode==='missing')return [];
  return rows;
 };
 const qc={setQueryData:(k,v)=>events.cached.push({k,v}),invalidateQueries:({queryKey})=>events.invalidated.push(queryKey)};
 const setError=v=>events.errors.push(v), ui=v=>v, messageFrom=e=>e.message;
 const showTenantActionSuccess=v=>events.success.push(v), showTenantActionError=v=>events.failure.push(v);
 const factory=new Function('apiRequest','qc','activeCustomValueTargetRef','customFieldSelectionEpochRef','customFieldDraftDirtyRef','setError','ui','messageFrom','showTenantActionSuccess','showTenantActionError','verifyCustomFieldReadback',js+'; return options;');
 const options=factory(apiRequest,qc,state,customFieldSelectionEpochRef,customFieldDraftDirtyRef,setError,ui,messageFrom,showTenantActionSuccess,showTenantActionError,verify);
 const vars={targetEntityType:'product',targetEntityId:'p-A',targetSelectionEpoch:0,payload:{values:{test_country:'Croatia'},value_versions:{test_country:0},definition_versions:{test_country:1}}};
 return {events,state,options,vars,customFieldDraftDirtyRef};
}
{
 const s=scenario();const result=await s.options.mutationFn(s.vars);
 check('PUT first, GET second',()=>assert.deepEqual(s.events.requests.map(v=>Boolean(v.opts)),[true,false]));
 check('PUT exact original record',()=>assert.equal(s.events.requests[0].url,'/inventory-capabilities/custom-fields/product/p-A'));
 check('GET exact original record',()=>assert.equal(s.events.requests[1].url,s.events.requests[0].url));
 check('Croatia remains plain JSON string in payload',()=>assert.equal(JSON.parse(s.events.requests[0].opts.body).values.test_country,'Croatia'));
 check('PUT does not emit premature success',()=>assert.equal(s.events.requests[0].opts.skipMutationFeedback,true));
 check('successful result includes verified rows',()=>assert.deepEqual(result.verifiedRows,rows));
 s.options.onSuccess(result,s.vars);
 check('verified result cached under original record',()=>assert.deepEqual(s.events.cached[0],{k:['custom-field-values','product','p-A'],v:rows}));
 check('confirmed success notification',()=>assert.deepEqual(s.events.success,['Custom field values saved and verified.']));
 check('verified save permits version refresh',()=>assert.equal(s.customFieldDraftDirtyRef.current,false));
 check('confirmed form error cleared',()=>assert.deepEqual(s.events.errors,[null]));
}
for (const mode of ['mismatch','missing','getFail']) {
 const s=scenario(mode), before=s.events;
 let error; try{await s.options.mutationFn(s.vars)}catch(e){error=e;}
 check(`${mode} recognized as unverified after PUT`,()=>assert.equal(error?.message,'CUSTOM_FIELD_READBACK_UNVERIFIED'));
 check(`${mode} never emits a false successful green feedback`,()=>assert.deepEqual(before.success,[]));
 s.options.onError(error,s.vars);
 check(`${mode} shows persistence-unknown guidance`,()=>assert.match(before.errors.at(-1),/accepted, but its values could not be verified/));
 check(`${mode} leaves query untouched to preserve entered data`,()=>assert.deepEqual(before.invalidated,[]));
}
{
 const s=scenario('putFail');let error;try{await s.options.mutationFn(s.vars)}catch(e){error=e;}
 check('failed PUT retains original error',()=>assert.equal(error.message,'invalid value format'));
 check('failed PUT never triggers readback',()=>assert.equal(s.events.requests.length,1));
 s.options.onError(error,s.vars);
 check('failed PUT is not mislabeled as accepted',()=>assert.equal(s.events.errors.at(-1),'invalid value format'));
 check('failed PUT emits no extra verification toast',()=>assert.deepEqual(s.events.failure,[]));
}
{
 const s=scenario();const result=await s.options.mutationFn(s.vars);s.state.current={entityType:'product',entityId:'p-B'};s.options.onSuccess(result,s.vars);
 check('record switch still caches original record only',()=>assert.deepEqual(s.events.cached[0].k,['custom-field-values','product','p-A']));
 check('record switch emits no misleading current-record toast',()=>assert.deepEqual(s.events.success,[]));
 check('record switch does not reset current unsaved-draft flag',()=>assert.equal(s.customFieldDraftDirtyRef.current,true));
 check('record switch does not clear new record error',()=>assert.deepEqual(s.events.errors,[]));
}
console.log(`Batch155 custom fields verified readback: ${checks}/${checks} PASS`);
