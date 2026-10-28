'use strict';
// FT200: exercise the real MobileExecutionPage runAction branch after transpilation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'src/pages/MobileExecutionPage.tsx'), 'utf8');
const feedback = fs.readFileSync(path.join(root, 'src/lib/actionFeedback.ts'), 'utf8');
const sourceFile = ts.createSourceFile('MobileExecutionPage.tsx', page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
assert.equal(sourceFile.parseDiagnostics.length, 0, 'Mobile Execution source must parse');
let fn = null;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(sourceFile) === 'runAction') fn = node;
  ts.forEachChild(node, visit);
}
visit(sourceFile);
assert.ok(fn && fn.initializer && ts.isArrowFunction(fn.initializer), 'Mobile runAction handler required');
const code = ts.transpileModule(`const runAction = ${fn.initializer.getText(sourceFile)};`, {compilerOptions:{target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.None}}).outputText;
assert.ok(page.includes("import { showTenantActionSuccess } from '../lib/actionFeedback';"));
assert.ok(feedback.includes("export function showTenantActionSuccess(message: string)"));
assert.match(page, /skipMutationFeedback: true \/\/ Page displays/);
assert.ok(!page.includes("setMessage(action === 'take'"), 'No subtle inline Take Task success path');
assert.match(page, /if \(first\?\.status !== 'applied'\) throw new Error/);
let assertions = 6;
function makeHarness({online=true,result={results:[{status:'applied'}]},throwError=null}={}) {
  const calls={toast:[],messages:[],errors:[],requests:[],refetch:0,offline:0};
  const context={
    navigator:{onLine:online}, console, Date,
    makeId:()=>'op-test',getDeviceId:()=>'device-test',ui:(text)=>text,
    canRunAction:()=>true,pending:[],
    persistPending:()=>{calls.offline+=1;return true;},
    setMessage:(m)=>calls.messages.push(m),
    setEvidenceMessage:()=>{},setActionError:(e)=>calls.errors.push(e),
    setBusyTaskId:()=>{},setBlockReasonTaskId:()=>{},setBlockReason:()=>{},
    showTenantActionSuccess:(s)=>calls.toast.push(s),
    mobileExecutionQuery:{refetch:async()=>{calls.refetch+=1;}},
    apiRequest:async(path,options)=>{calls.requests.push({path,options});if(throwError)throw throwError;return result;},
    ApiError:class ApiError extends Error {},
    JSON
  };
  vm.runInNewContext(code+'\nthis.runAction = runAction;',context);
  return {calls,run:()=>context.runAction({id:'task-1',title:'Test task'},'take')};
}
(async()=>{
  let h=makeHarness(); await h.run();
  assert.deepEqual(h.calls.toast,['Task assigned to you.']); assertions++;
  assert.ok(!h.calls.messages.some(Boolean)); assertions++;
  assert.equal(h.calls.requests.length,1); assertions++;
  assert.equal(h.calls.requests[0].options.skipMutationFeedback,true); assertions++;
  assert.equal(h.calls.refetch,1); assertions++;
  assert.equal(h.calls.requests[0].path,'/inventory-capabilities/mobile-sync'); assertions++;

  h=makeHarness({result:{results:[{status:'failed',error:'Not allowed'}]}}); await h.run();
  assert.deepEqual(h.calls.toast,[]); assertions++;
  assert.ok(h.calls.errors.includes('Not allowed')); assertions++;
  assert.equal(h.calls.refetch,0); assertions++;

  h=makeHarness({result:{results:[]}}); await h.run();
  assert.deepEqual(h.calls.toast,[]); assertions++;
  assert.ok(h.calls.messages.some(m=>String(m).includes('queued because synchronization could not be confirmed'))); assertions++;

  h=makeHarness({online:false}); await h.run();
  assert.deepEqual(h.calls.toast,[]); assertions++;
  assert.equal(h.calls.requests.length,0); assertions++;
  assert.ok(h.calls.messages.some(m=>String(m).includes('queued on this device'))); assertions++;

  h=makeHarness({throwError:new Error('network down')}); await h.run();
  assert.deepEqual(h.calls.toast,[]); assertions++;
  assert.ok(h.calls.messages.some(m=>String(m).includes('queued because synchronization could not be confirmed'))); assertions++;
  console.log(`FT200 Mobile Take Task viewport toast: ${assertions}/${assertions} PASS`);
})().catch(e=>{console.error(e);process.exitCode=1;});
