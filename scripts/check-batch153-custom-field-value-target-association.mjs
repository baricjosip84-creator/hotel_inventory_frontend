import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const source = readFileSync(process.env.BATCH153_PAGE_SOURCE || path.join(root, 'src/pages/InventoryCapabilitiesPage.tsx'), 'utf8');
const backend = readFileSync(path.join(root, '../hotel-inventory-backend/src/routes/inventoryCapabilities.js'), 'utf8');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const ast = ts.createSourceFile('InventoryCapabilitiesPage.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let checks = 0;
function check(label, fn) { fn(); checks++; console.log('PASS', label); }
check('page TSX syntax valid', () => assert.equal(ast.parseDiagnostics.length, 0));
check('page TSX transpiles cleanly', () => assert.equal((ts.transpileModule(source, {fileName:'InventoryCapabilitiesPage.tsx',reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).diagnostics || []).filter(d=>d.category===ts.DiagnosticCategory.Error).length, 0));
check('Batch153 check registered', () => assert.equal(pkg.scripts['check:batch153-custom-field-value-target-association'],'node scripts/check-batch153-custom-field-value-target-association.mjs'));
const panel = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'CustomFieldsPanel');
check('CustomFieldsPanel found', () => assert(panel));
const defs = {};
let click = null, typeChange = null;
(function visit(node) {
 if (ts.isVariableDeclaration(node) && ['saveValues','changeEntityType','changeEntityId','activeCustomValueTargetRef'].includes(node.name.getText(ast))) defs[node.name.getText(ast)] = node;
 if (ts.isJsxAttribute(node) && node.name.text === 'onClick' && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
  const body = node.initializer.expression.getText(ast);
  if (body.includes('saveValues.mutate(')) click = body;
 }
 if (ts.isJsxAttribute(node) && node.name.text === 'onChange' && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
  const body = node.initializer.expression.getText(ast);
  if (body.includes('changeEntityType(')) typeChange = body;
 }
 ts.forEachChild(node,visit);
})(panel);
for (const name of ['saveValues','changeEntityType','changeEntityId','activeCustomValueTargetRef']) check(`${name} declared`, () => assert(defs[name]));
check('entity-type selector uses synchronous change handler',()=>assert.match(typeChange,/changeEntityType\(event\.target\.value as EntityType\)/));
check('entity change resets active record immediately',()=>assert.match(defs.changeEntityType.getText(ast),/activeCustomValueTargetRef\.current = \{ entityType: nextEntityType, entityId: '' \};[\s\S]*?setEntityType\(nextEntityType\)/));
check('record change updates active target immediately',()=>assert.match(defs.changeEntityId.getText(ast),/activeCustomValueTargetRef\.current = \{ entityType, entityId: nextEntityId \};[\s\S]*?setEntityId\(nextEntityId\)/));
check('read-permission forced entity change also updates reference',()=>assert.match(panel.getText(ast),/if \(!canRead\) \{[\s\S]*?activeCustomValueTargetRef\.current = \{ entityType: nextType, entityId: '' \}/));
check('reactive entity reset also updates reference',()=>assert.match(panel.getText(ast),/activeCustomValueTargetRef\.current = \{ entityType, entityId: '' \};\s*(?:customFieldDraftDirtyRef\.current = false;\s*)?setEntityId\(''\)/));
check('click captures entity and record IDs',()=>assert.match(click,/targetEntityType: entityType, targetEntityId: entityId/));
check('click copies submitted values',()=>assert.match(click,/values: \{ \.\.\.values \}/));
check('click copies value versions',()=>assert.match(click,/value_versions: \{ \.\.\.valueVersions \}/));
check('click copies definition versions',()=>assert.match(click,/definition_versions: \{ \.\.\.definitionVersions \}/));
check('write route uses captured entity type and ID',()=>assert.match(defs.saveValues.getText(ast),/custom-fields\/\$\{targetEntityType\}\/\$\{targetEntityId\}/));
check('write retains PUT with immutable submitted payload',()=>assert.match(defs.saveValues.getText(ast),/method: 'PUT',[\s\S]*?body: JSON\.stringify\(payload\)/));
check('write updates original record cache after readback',()=>assert.match(defs.saveValues.getText(ast),/setQueryData\(\['custom-field-values', targetEntityType, targetEntityId\], verifiedRows\)/));
check('save success guards new selection error',()=>assert.match(defs.saveValues.getText(ast),/activeCustomValueTargetRef\.current\.entityType === targetEntityType && activeCustomValueTargetRef\.current\.entityId === targetEntityId\) \{[\s\S]*?setError\(null\)/));
check('save failure guards new selection error',()=>assert.match(defs.saveValues.getText(ast),/onError:[\s\S]*?activeCustomValueTargetRef\.current\.entityType === targetEntityType && activeCustomValueTargetRef\.current\.entityId === targetEntityId\) \{/));
check('save permission gate retained',()=>assert.match(panel.getText(ast),/disabled=\{!canWrite \|\| !entityId \|\| entityValues\.isLoading \|\| entityValues\.isError \|\| !entityValues\.data \|\| saveValues\.isPending\}/));
check('backend write permission retained',()=>assert.match(backend,/router\.put\('\/custom-fields\/:entityType\/:entityId', requireCustomFieldEntityPermission\('write'\)/));
check('backend validation retained',()=>assert.match(backend,/validate\(validation\.customFieldValuesSave\)/));
const exprSource = `const saveOptions = ${defs.saveValues.initializer.arguments[0].getText(ast)};\n`+
 `const changeEntityId = ${defs.changeEntityId.initializer.getText(ast)};\n`+
 `const changeEntityType = ${defs.changeEntityType.initializer.getText(ast)};\n`;
const exprJs = ts.transpileModule(exprSource,{fileName:'custom-target-test.ts', compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function make() {
 const activeCustomValueTargetRef = {current:{entityType:'product',entityId:'p-A'}};
 const customFieldDraftDirtyRef = {current:true};
 const observed = {requests:[],invalidations:[],cache:[],errors:[],selectedIds:[],selectedTypes:[],values:[],versions:[],definitionVersions:[]};
 const apiRequest = (url, opts) => {observed.requests.push({url,opts});return Promise.resolve(opts ? {ok:true} : url.includes('/supplier/') ? [{field_key:'region',data_type:'text',value:'Rijeka'}] : [{field_key:'test_country',data_type:'text',value:'Croatia'}]);};
 const qc = {invalidateQueries: ({queryKey})=>observed.invalidations.push(queryKey), setQueryData:(key,data)=>observed.cache.push({key,data})};
 const setError = value => observed.errors.push(value);
 const setEntityId = value=>observed.selectedIds.push(value);
 const setEntityType = value=>observed.selectedTypes.push(value);
 const setValues = value=>observed.values.push(value);
 const setValueVersions = value=>observed.versions.push(value);
 const setDefinitionVersions = value=>observed.definitionVersions.push(value);
 const messageFrom = error => error.message;
 const ui = value=>value;
 const maker = new Function('apiRequest','qc','activeCustomValueTargetRef','customFieldDraftDirtyRef','setError','setEntityId','setEntityType','setValues','setValueVersions','setDefinitionVersions','messageFrom','ui','entityType','verifyCustomFieldReadback','showTenantActionSuccess','showTenantActionError',exprJs+'\nreturn {saveOptions,changeEntityId,changeEntityType};');
 const handlers=maker(apiRequest,qc,activeCustomValueTargetRef,customFieldDraftDirtyRef,setError,setEntityId,setEntityType,setValues,setValueVersions,setDefinitionVersions,messageFrom,ui,'product',(values,rows)=>Object.entries(values).every(([key,value])=>rows.some(row=>row.field_key===key && row.value===value)),()=>{},()=>{});
 return {...handlers,observed,activeCustomValueTargetRef,customFieldDraftDirtyRef};
}
const payload = {values:{test_country:'Croatia'},value_versions:{test_country:0},definition_versions:{test_country:1}};
const vars = {targetEntityType:'product',targetEntityId:'p-A',payload};
{
 const h=make(); const savedResult=await h.saveOptions.mutationFn(vars);
 check('PUT targets submitted product A',()=>assert.equal(h.observed.requests[0].url,'/inventory-capabilities/custom-fields/product/p-A'));
 check('PUT method preserved',()=>assert.equal(h.observed.requests[0].opts.method,'PUT'));
 check('submitted Croatia value/version payload preserved',()=>assert.deepEqual(JSON.parse(h.observed.requests[0].opts.body),payload));
 h.changeEntityId('p-B');
 check('selection ref changed synchronously to product B',()=>assert.deepEqual(h.activeCustomValueTargetRef.current,{entityType:'product',entityId:'p-B'}));
 check('selection resets previous dirty draft',()=>assert.equal(h.customFieldDraftDirtyRef.current,false));
 check('new product field values reset',()=>assert.deepEqual(h.observed.values,[{}]));
 check('new product versions reset',()=>assert.deepEqual(h.observed.versions,[{}]));
 check('new product definition versions reset',()=>assert.deepEqual(h.observed.definitionVersions,[{}]));
 const errorCount = h.observed.errors.length;
 h.saveOptions.onSuccess(savedResult,vars);
 check('late success caches verified data only for product A',()=>assert.deepEqual(h.observed.cache[0].key,['custom-field-values','product','p-A']));
 check('late product A success leaves product B errors untouched',()=>assert.equal(h.observed.errors.length,errorCount));
 h.saveOptions.onError(new Error('product A save failed'),vars);
 check('late product A error cannot appear on B',()=>assert.equal(h.observed.errors.length,errorCount));
}
{
 const h=make(); h.changeEntityType('supplier');
 check('switch entity type invalidates active product synchronously',()=>assert.deepEqual(h.activeCustomValueTargetRef.current,{entityType:'supplier',entityId:''}));
 h.saveOptions.onError(new Error('product A error'),vars);
 check('error from previous entity type suppressed',()=>assert.equal(h.observed.errors.length,0));
 h.saveOptions.onSuccess({verifiedRows:[{field_key:'test_country',data_type:'text',value:'Croatia'}]},vars);
 check('previous entity type refresh remains correctly scoped',()=>assert.deepEqual(h.observed.cache[0].key,['custom-field-values','product','p-A']));
 check('success from previous entity does not erase current error',()=>assert.equal(h.observed.errors.length,0));
}
{
 const h=make(); h.saveOptions.onSuccess({verifiedRows:[{field_key:'test_country',data_type:'text',value:'Croatia'}]},vars);
 check('normal save caches verified current record',()=>assert.deepEqual(h.observed.cache[0].key,['custom-field-values','product','p-A']));
 check('normal success clears prior page error',()=>assert.deepEqual(h.observed.errors,[null]));
 check('verified same-record save resets draft dirty flag',()=>assert.equal(h.customFieldDraftDirtyRef.current,false));
 h.saveOptions.onError(new Error('invalid value format'),vars);
 check('normal save failure remains visible',()=>assert.equal(h.observed.errors.at(-1),'invalid value format'));
}
{
 const h=make(); const supplier={targetEntityType:'supplier',targetEntityId:'s-1',payload:{values:{region:'Rijeka'},value_versions:{region:2},definition_versions:{region:4}}};
 await h.saveOptions.mutationFn(supplier);
 check('supplier request uses submitted type and identifier',()=>assert.equal(h.observed.requests[0].url,'/inventory-capabilities/custom-fields/supplier/s-1'));
 check('supplier version map preserved',()=>assert.deepEqual(JSON.parse(h.observed.requests[0].opts.body),supplier.payload));
}
console.log(`Batch153 custom-field target association: ${checks}/${checks} PASS`);
