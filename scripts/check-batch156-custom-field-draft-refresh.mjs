import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const source = readFileSync(process.env.BATCH156_SOURCE || path.join(root, 'src/pages/InventoryCapabilitiesPage.tsx'), 'utf8');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
let checks = 0;
const check = (message, fn) => { fn(); checks++; console.log(`PASS ${message}`); };
const ast = ts.createSourceFile('InventoryCapabilitiesPage.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
check('page syntax parses', () => assert.equal(ast.parseDiagnostics.length, 0));
check('page transpiles', () => assert.equal((ts.transpileModule(source, {fileName:'InventoryCapabilitiesPage.tsx', reportDiagnostics:true, compilerOptions:{jsx:ts.JsxEmit.ReactJSX, target:ts.ScriptTarget.ES2022}}).diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0));
check('regression script registered',()=>assert.equal(pkg.scripts['check:batch156-custom-field-draft-refresh'],'node scripts/check-batch156-custom-field-draft-refresh.mjs'));
const panel=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='CustomFieldsPanel');
check('custom fields panel present',()=>assert(panel));
let ref=null, save=null, changeRecord=null,changeType=null;
const effects=[];
(function walk(n) {
 if(ts.isVariableDeclaration(n)){
  const name=n.name.getText(ast);
  if(name==='customFieldDraftDirtyRef')ref=n;
  if(name==='saveValues')save=n;
  if(name==='changeEntityId')changeRecord=n;
  if(name==='changeEntityType')changeType=n;
 }
 if(ts.isCallExpression(n)&&n.expression.getText(ast)==='useEffect') effects.push(n);
 ts.forEachChild(n,walk);
})(panel);
check('draft dirty synchronous ref exists',()=>assert(ref));
check('dirty flag initialized as false',()=>assert.match(ref?.initializer?.getText(ast)||'',/useRef\(false\)/));
const effect=effects.find(n=>n.arguments[0]?.getText(ast).includes('entityValues.data'));
check('server row hydration effect found',()=>assert(effect));
check('hydration checks draft before changing form',()=>assert.match(effect.arguments[0].getText(ast),/if \(!entityValues\.data \|\| customFieldDraftDirtyRef\.current\) return/));
const transpile = (code)=>ts.transpileModule(code,{fileName:'behavior.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const effectCode=transpile('const hydrateEffect='+effect.arguments[0].getText(ast)+';');
function hydrationHarness(dirty,rows) {
 const events={values:[],valueVersions:[],definitionVersions:[]};
 const ref={current:dirty};
 const eff=new Function('entityValues','customFieldDraftDirtyRef','setValues','setValueVersions','setDefinitionVersions',effectCode+'return hydrateEffect;')(
  {data:rows},ref,v=>events.values.push(v),v=>events.valueVersions.push(v),v=>events.definitionVersions.push(v));
 return {run:()=>eff(),events,ref};
}
const croatia=[{field_key:'test_country',value:'Croatia',data_type:'text',value_version:2,definition_version:7}];
{
 const h=hydrationHarness(true,croatia);h.run();
 check('editing draft survives an automatic GET refetch',()=>assert.equal(h.events.values.length,0));
 check('editing draft keeps existing optimistic value versions',()=>assert.equal(h.events.valueVersions.length,0));
 check('editing draft keeps definition versions',()=>assert.equal(h.events.definitionVersions.length,0));
}
{
 const h=hydrationHarness(false,croatia);h.run();
 check('clean draft hydrates persisted Croatia',()=>assert.equal(h.events.values[0].test_country,'Croatia'));
 check('clean draft refreshes value version',()=>assert.equal(h.events.valueVersions[0].test_country,2));
 check('clean draft refreshes definition version',()=>assert.equal(h.events.definitionVersions[0].test_country,7));
}
{
 const h=hydrationHarness(false,[{field_key:'test_country',value:null,data_type:'text',value_version:0,definition_version:1},{field_key:'active',value:true,data_type:'boolean',value_version:3,definition_version:4}]);h.run();
 check('clean hydration retains empty text',()=>assert.equal(h.events.values[0].test_country,''));
 check('clean hydration retains boolean true',()=>assert.equal(h.events.values[0].active,true));
 check('clean hydration retains boolean value version',()=>assert.equal(h.events.valueVersions[0].active,3));
}
{
 const h=hydrationHarness(false,null);h.run();
 check('empty loading state never wipes draft',()=>assert.equal(h.events.values.length,0));
}
const panelText=panel.getText(ast);
check('record selector clears dirty state',()=>assert.match(changeRecord.initializer.getText(ast),/customFieldDraftDirtyRef\.current = false/));
check('entity selector clears dirty state',()=>assert.match(changeType.initializer.getText(ast),/customFieldDraftDirtyRef\.current = false/));
check('reactive type switch clears dirty state',()=>assert.match(panelText,/activeCustomValueTargetRef\.current = \{ entityType, entityId: '' \};\s*customFieldDraftDirtyRef\.current = false/));
const dirtyOnChange=(panelText.match(/customFieldDraftDirtyRef\.current = true; setValues/g)||[]).length;
check('text numeric date select and checkbox handlers mark dirty',()=>assert.equal(dirtyOnChange,3));
check('save mutation retained',()=>assert(save));
const saveSrc=save.initializer.getText(ast);
check('save still uses original target association',()=>assert.match(saveSrc,/targetEntityType, targetEntityId/));
check('save still reads back written values',()=>assert.match(saveSrc,/verifyCustomFieldReadback\(payload\.values, readback\)/));
check('save success clears dirty only when same target',()=>assert.match(saveSrc,/if \(activeCustomValueTargetRef\.current\.entityType === targetEntityType && activeCustomValueTargetRef\.current\.entityId === targetEntityId && customFieldSelectionEpochRef\.current === targetSelectionEpoch\) \{\s*\/\/[\s\S]*?customFieldDraftDirtyRef\.current = false/));
check('save caches fresh verified rows after allowing rehydration',()=>assert.match(saveSrc,/customFieldDraftDirtyRef\.current = false;[\s\S]*?qc\.setQueryData\(\['custom-field-values', targetEntityType, targetEntityId\], verifiedRows\)/));
check('server verification failure still preserves input',()=>assert.match(saveSrc,/CUSTOM_FIELD_READBACK_UNVERIFIED/));
check('failed save does not clear dirty flag',()=>{const from=saveSrc.indexOf('onError:');assert(from>=0);assert(!saveSrc.slice(from).includes('customFieldDraftDirtyRef.current = false'));});
check('text input still disabled while saving',()=>assert.match(panelText,/disabled=\{saveValues\.isPending\} type=\{row\.data_type === 'number'/));
check('save button still permission and loading gated',()=>assert.match(panelText,/disabled=\{!canWrite \|\| !entityId \|\| entityValues\.isLoading \|\| entityValues\.isError \|\| !entityValues\.data \|\| saveValues\.isPending\}/));
console.log(`BATCH156 FOCUSED ${checks}/${checks} PASS`);
