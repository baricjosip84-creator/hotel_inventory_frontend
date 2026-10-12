import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const root = process.cwd();
const page = readFileSync(path.join(root, 'src/pages/SuppliersPage.tsx'), 'utf8');
const translations = readFileSync(path.join(root, 'src/i18n/tenantUiTranslations.ts'), 'utf8');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const sf = ts.createSourceFile('SuppliersPage.tsx', page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let count = 0;
function check(description, fn) { fn(); count++; console.log('PASS', description); }
check('Supplier page TSX parses', () => assert.equal(sf.parseDiagnostics.length,0));
check('Supplier page transpiles', () => {
 const r=ts.transpileModule(page,{fileName:'SuppliersPage.tsx', reportDiagnostics:true, compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
 assert.equal(r.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
});
check('Translation catalog parses',()=>assert.equal(ts.createSourceFile('translations.ts',translations,ts.ScriptTarget.Latest,true).parseDiagnostics.length,0));
check('Runner registered',()=>assert.equal(pkg.scripts['check:batch124-supplier-refresh-feedback'],'node scripts/check-batch124-supplier-refresh-feedback.mjs'));
const expected = {
  suppliers: ['Supplier list refreshed successfully.','Could not refresh supplier list.'],
  performance: ['Supplier performance refreshed successfully.','Could not refresh supplier performance.'],
  delivery: ['Delivery status refreshed successfully.','Could not refresh delivery status.']
};
for(const [target,messages] of Object.entries(expected)) {
 check(`${target} refresh button calls guarded helper`, () => assert.match(page,new RegExp('onClick=\\{\\(\\) => void refreshSupplierSection\\(\\\''+target+'\\\'\\)\\}')));
 check(`${target} result shown near its own section`, () => assert.match(page,new RegExp('renderRefreshFeedback\\(\\\''+target+'\\\'\\)')));
 for(const message of messages) check(`${target} five-language catalog: ${message}`,()=>{
   const row=translations.split('\n').find(x=>x.trim().startsWith('["'+message+'",'));
   assert(row,`Missing translation for ${message}`);
   const r=JSON.parse(row.trim().replace(/,$/,''));assert.equal(r.length,5);assert(r.every(x=>typeof x==='string'&&x.length>0));
 });
}
check('Old silent refetch controls removed',()=>{
 assert.doesNotMatch(page,/onClick=\{\(\) => void (?:suppliersQuery|supplierPerformanceQuery|slaBreachesQuery)\.refetch\(\)\}/);
});
check('Query keys and endpoint contracts intact',()=>{
 for(const route of ['/suppliers/sla-breaches', '/suppliers/${supplierId}/performance']) assert(page.includes(route));
 for(const key of ["queryKey: ['suppliers']","queryKey: ['supplier-sla-breaches']","queryKey: ['supplier-performance', selectedPerformanceSupplier?.id]"]) assert(page.includes(key));
});
check('Feedback is accessible and action-scoped',()=>{
 assert.match(page,/role=\{feedback\.state === 'error' \? 'alert' : 'status'\}/);
 assert.match(page,/aria-live=\{feedback\.state === 'error' \? 'assertive' : 'polite'\}/);
 assert.match(page,/\[target\]: undefined/);
});
check('Existing refresh loading/disabled gates maintained',()=>{
 for(const q of ['suppliersQuery','supplierPerformanceQuery','slaBreachesQuery']) {
   assert.match(page,new RegExp('disabled=\\{'+q+'\\.isFetching\\}'));
   assert.match(page,new RegExp(q+'\\.isFetching \\? ui\\(\\\'Refreshing\\.\\.\\.\\\'\\)'));
 }
});
// Exercise the exact TypeScript function body, not a handwritten imitation.
let node;
function visit(n){ if(ts.isVariableDeclaration(n)&&n.name.getText(sf)==='refreshSupplierSection') node=n;ts.forEachChild(n,visit); }
visit(sf);
assert(node?.initializer,'Source refreshSupplierSection function missing');
const extracted='const refreshSupplierSection = '+node.initializer.getText(sf)+';';
const transpiled=ts.transpileModule(extracted,{fileName:'actual.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function harness(mode,opts={}) {
 const events=[], calls={suppliers:0,performance:0,delivery:0};
 let feedback={...opts.feedback};
 const mk=(name)=>({isFetching:opts.loading===name,refetch:async()=>{
   calls[name]++;
   if(opts.failure===name) return {isError:true,error:new Error('failed')};
   return {isError:false,error:null};
 }});
 const setRefreshFeedback=(change)=>{feedback=typeof change==='function'?change(feedback):change;events.push({...feedback});};
 const actual = new Function('suppliersQuery','supplierPerformanceQuery','slaBreachesQuery','selectedPerformanceSupplier','setRefreshFeedback','ui',transpiled+'\nreturn refreshSupplierSection;')(
    mk('suppliers'),mk('performance'),mk('delivery'),opts.noSelection?null:{id:'supplier-test'},setRefreshFeedback,(x)=>x);
 return { run:()=>actual(mode), calls,events,get feedback(){return feedback;} };
}
for(const target of Object.keys(expected)) {
 const ok=harness(target,{feedback:{[target]:{state:'error',text:'stale'}}});
 await ok.run();
 check(`${target}: success refetch occurs once`,()=>{assert.equal(ok.calls[target],1);assert.equal(Object.values(ok.calls).reduce((a,b)=>a+b,0),1);});
 check(`${target}: stale feedback cleared before refetch and accurate result shown`,()=>{
  assert.equal(ok.events[0][target],undefined);
  assert.deepEqual(ok.feedback[target],{state:'success',text:expected[target][0]});
 });
 const bad=harness(target,{failure:target});await bad.run();
 check(`${target}: error result not falsely labelled success`,()=>assert.deepEqual(bad.feedback[target],{state:'error',text:expected[target][1]}));
 const loading=harness(target,{loading:target});await loading.run();
 check(`${target}: loading gate blocks duplicate request`,()=>assert.equal(loading.calls[target],0));
}
const noSelection=harness('performance',{noSelection:true});await noSelection.run();
check('Performance refresh requires an explicit selected supplier',()=>assert.equal(noSelection.calls.performance,0));
console.log(`Batch124 Suppliers explicit refresh feedback: ${count}/${count} PASS`);
