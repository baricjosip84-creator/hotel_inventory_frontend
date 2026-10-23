import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = fs.readFileSync(new URL('../src/pages/DecisionLearningFeedbackPage.tsx', import.meta.url), 'utf8');
const translations = fs.readFileSync(new URL('../src/i18n/tenantUiTranslations.ts', import.meta.url), 'utf8');
let count = 0;
function check(label, cb) { cb(); count++; console.log(`PASS ${label}`); }
const from = source.indexOf('  const restoreEvidenceRowFocus = ');
const until = source.indexOf('  const createEvidenceFollowUp = ', from);
check('Return-to-row and cancel-edit handlers exist', () => assert(from > 0 && until > from));
const code = source.slice(from, until) + '\n globalThis.testFns = {viewEvidence, closeEvidenceDetail, cancelEvidenceEditing};';
const compilation = ts.transpileModule(code, {fileName:'focus-actions.ts',reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
check('Extracted actions parse as TypeScript',()=>assert.equal(compilation.diagnostics?.length,0));
const fullParse = ts.transpileModule(source, {fileName:'DecisionLearningFeedbackPage.tsx', reportDiagnostics:true, compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}});
check('Whole Learning Feedback page parses',()=>assert.equal(fullParse.diagnostics?.length,0));
check('Detail panel has top offset for sticky header',()=>assert.match(source,/ref=\{evidenceDetailRef\}[\s\S]{0,90}scrollMarginTop: 'clamp\(96px, 12vh, 152px\)'/));
check('Edit panel has matching sticky-header offset',()=>assert.match(source,/ref=\{feedbackFormRef\}[\s\S]{0,90}scrollMarginTop: 'clamp\(96px, 12vh, 152px\)'/));
check('Table detail click passes origin control',()=>assert(source.includes('onClick={(event) => onView(mode, row, event.currentTarget)}')));
check('Table edit click passes origin control',()=>assert(source.includes('onClick={(event) => onEdit(mode, row, event.currentTarget)}')));
check('Closing evidence invokes focus restoration',()=>assert.match(source,/onClose=\{closeEvidenceDetail\}/));
check('Cancel editing is rendered only for active edits',()=>assert.match(source,/form\.recordKey \? <button[^>]+onClick=\{cancelEvidenceEditing\}/));
check('Cancel editing cannot run during a save',()=>assert(source.includes('if (mutation.isPending) return;')));
check('Re-edit same record still triggers focus',()=>assert(source.includes('[form.recordKey, editFocusToken]')));
check('Five locales include explicit cancel copy',()=>assert(translations.includes('["Cancel editing", "Bearbeitung abbrechen", "Cancelar edición", "Annuler la modification", "Odustani od uređivanja"]')));

const deferred = () => {
 let resolve, reject;
 const promise = new Promise((yes,no)=>{resolve=yes;reject=no;});
 return {promise,resolve,reject};
};
const calls = new Map();
const setCalls = [];
const events = [];
const ctx = {
 URLSearchParams,
 window: {requestAnimationFrame: fn=>{ fn(); return 1; }},
 evidenceRequestSequenceRef: {current:0}, evidenceOriginRef:{current:null}, canReadInsights:true, canCreateExecutionRequests:false,
 mutation:{isPending:false},
 setMessage: x=>events.push(['message',x]),
 setSelectedEvidenceDetail: x=>events.push(['detail',x]),
 setSelectedEvidenceMode: x=>events.push(['mode',x]),
 setForm: x=>setCalls.push(x), setSourceId:x=>events.push(['source',x]), setSourceSearch:x=>events.push(['search',x]), setBusinessEvidenceSnapshots:x=>events.push(['snapshots',x]),
 setEditFocusToken: fn=>events.push(['editToken',fn(0)]),
 recordKeyForMode: (mode,row)=>row.id,
 evidenceTypeForMode: mode=>mode,
 apiRequest: uri=>{
  const key=new URL('https://fake.example'+uri).searchParams.get('evidence_key');
  const d=deferred();calls.set(key,d); return d.promise;
 },
 ui: v=>v, defaultForm:{recordKey:'',observedAt:''}, nowLocalDateTimeValue:()=> '2026-10-14T14:00',
 defaultSubtypeForMode:()=> 'normal',getActiveTenantCurrency:()=> 'EUR', statusOptions:{'learning-outcomes':['observed']},mode:'learning-outcomes',
};
vm.runInNewContext(compilation.outputText, vm.createContext(ctx), {timeout:2000});
const fns=ctx.testFns;
const row = id => ({id,isConnected:true, scrollIntoView:()=>events.push(['scroll',id]),focus:()=>events.push(['focus',id])});
const slow=row('slow'), latest=row('latest');
const first=fns.viewEvidence('learning-outcomes',{id:'slow'},slow);
const second=fns.viewEvidence('learning-outcomes',{id:'latest'},latest);
calls.get('latest').resolve({id:'latest'});
await second;
calls.get('slow').resolve({id:'slow'});
await first;
check('Latest click wins when server responses arrive out of order',()=>{
 assert.equal(events.filter(x=>x[0]==='detail').length,1);
 assert.equal(events.find(x=>x[0]==='detail')[1].id,'latest');
});
check('Correct originating row stored',()=>assert.equal(ctx.evidenceOriginRef.current,latest));
fns.closeEvidenceDetail();
check('Close clears selected detail and its mode',()=>assert.deepEqual(events.slice(-4,-2).map(v=>v[0]),['detail','mode']));
check('Close returns viewport and keyboard focus to originating row',()=>assert(events.some(x=>x[0]==='scroll' && x[1]==='latest') && events.some(x=>x[0]==='focus' && x[1]==='latest')));
await (async()=>{
 const delayed=fns.viewEvidence('learning-outcomes',{id:'delayed'},row('delayed'));
 fns.closeEvidenceDetail();
 calls.get('delayed').resolve({id:'delayed'});
 await delayed;
 check('Closing prevents an in-flight detail from reopening',()=>assert(!events.some(x=>x[0]==='detail' && x[1]?.id==='delayed')));
})();
check('Unloaded originating row does not throw when returning focus',()=>{
 ctx.evidenceOriginRef.current={isConnected:false}; fns.closeEvidenceDetail();
});
check('Cancel edit clears source, form key and evidence snapshots',()=>{
 ctx.evidenceOriginRef.current=latest;
 fns.cancelEvidenceEditing();
 assert.equal(setCalls.at(-1).recordKey,'');
 assert(events.some(x=>x[0]==='source' && x[1]===''));
 assert(events.some(x=>x[0]==='snapshots'));
});
check('Cancel restores the record row when it still exists',()=>assert(events.filter(x=>x[0]==='focus' && x[1]==='latest').length>=2));
check('Mode change invalidates stale record fetch',()=>assert.match(source,/const handleModeChange = [\s\S]{0,185}evidenceRequestSequenceRef\.current \+= 1;/));
check('Edit response has the same latest-request guard',()=>assert.match(source,/const editEvidence = [\s\S]*?if \(requestSequence !== evidenceRequestSequenceRef\.current\) return;[\s\S]*?setMode\(nextMode\);/));
check('Edit response stores exact origin for return focus',()=>assert.match(source,/const editEvidence = [\s\S]*?evidenceOriginRef\.current = origin;/));
check('Edit increments focus token after successful load',()=>assert.match(source,/const editEvidence = [\s\S]*?setEditFocusToken\(\(current\) => current \+ 1\);/));
check('Detail read guards late errors',()=>assert.match(source,/catch \(error\) \{\s+if \(requestSequence === evidenceRequestSequenceRef\.current\)/));
check('Cancel does not run while save pending',()=>{
 const before=setCalls.length;
 ctx.mutation.isPending=true;
 fns.cancelEvidenceEditing();
 assert.equal(setCalls.length,before);
});
console.log(`Learning Feedback focus/selection/cancel: ${count}/${count} PASS`);
