'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root,name),'utf8');
const api=read('src/lib/api.ts');
const req=read('src/pages/InventoryRequisitionsPage.tsx');
const res=read('src/pages/InventoryReservationsPage.tsx');
const mob=read('src/pages/MobileExecutionPage.tsx');
const tr=read('src/i18n/tenantUiTranslations.ts');
let count=0;
function check(name,test){assert.ok(test,name);console.log('PASS '+name);count++;}
for(const [file,src,jsx] of [['api.ts',api,false],['InventoryRequisitionsPage.tsx',req,true],['InventoryReservationsPage.tsx',res,true],['MobileExecutionPage.tsx',mob,true],['tenantUiTranslations.ts',tr,false]]){
 const ast=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true,jsx?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 check(file+' parses without syntax diagnostics',ast.parseDiagnostics.length===0);
}
function isolatedFunction(source, name) {
 const file=ts.createSourceFile('temp.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 const found=file.statements.find(s=>ts.isFunctionDeclaration(s)&&s.name?.text===name);
 assert.ok(found,'Function '+name+' exists');
 const transpiled=ts.transpileModule(found.getText(file),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 const sandbox={};vm.runInNewContext(transpiled+`\nthis.__test=${name};`,sandbox);
 return sandbox.__test;
}
const readonly=isolatedFunction(api,'isReadOnlyRequisitionReadinessRequest');
check('single requisition readiness is read-only',readonly('/inventory-requisitions/abc-1/readiness','POST'));
check('bulk requisition readiness is read-only',readonly('/inventory-requisitions/bulk-readiness','POST'));
check('query params do not change read-only scope',readonly('/inventory-requisitions/abc-1/readiness?preview=1','POST'));
check('actual fulfillment is NOT excluded',!readonly('/inventory-requisitions/abc-1/fulfill','POST'));
check('non-POST requests are not excluded',!readonly('/inventory-requisitions/abc-1/readiness','PATCH'));
check('shared API suppresses feedback for read-only readiness',api.includes('!isReadOnlyRequisitionReadinessRequest(path, method) &&'));
check('both readiness queries explicitly suppress shared toasts',(req.match(/skipMutationFeedback: true \/\/ Read-only readiness query/g)||[]).length===2);
check('actual fulfillment keeps one specific success confirmation',/inventory-requisitions\/\$\{selected\.id\}\/fulfill[^]*?method: 'POST'/.test(req) && (req.slice(req.indexOf('const fulfillMutation'), req.indexOf('const bulkFulfillmentMutation')).includes("showTenantActionSuccess(ui('Requisition fulfilled successfully.'))") || !req.slice(req.indexOf('const fulfillMutation'), req.indexOf('const bulkFulfillmentMutation')).includes('skipMutationFeedback: true')));
check('reservation lifecycle match is restricted to resource/action POST',/normalizedMethod === 'POST'[\s\S]*?normalizedPathOnly\.match\(\/\^\\\/inventory-reservations\\\/\[\^\/\]\+\\\/\(activate\|allocate\|release\|cancel\|expire\|fulfill\)\$\//.test(api));
const getMsg=isolatedFunction(api,'tenantMutationSuccessMessage');
check('allocate returns exact reservation-specific success',getMsg('/inventory-reservations/test-id/allocate','POST')==='Reservation allocated successfully.');
for(const [action,expected] of [['activate','Reservation activated successfully.'],['release','Remaining reservation quantity released successfully.'],['cancel','Reservation cancelled successfully.'],['expire','Reservation expired successfully.'],['fulfill','Reservation fulfilled successfully.']]){
 check('reservation '+action+' receives exact toast',getMsg('/inventory-reservations/test-id/'+action,'POST')===expected);
}
check('actual requisition fulfillment retains exact toast',getMsg('/inventory-requisitions/test-id/fulfill','POST')==='Requisition fulfilled successfully.');
for(const phrase of ['Reservation allocated successfully.','Reservation activated successfully.','Remaining reservation quantity released successfully.','Reservation cancelled successfully.','Reservation expired successfully.','Reservation fulfilled successfully.']){
 check('five-language catalogue includes '+phrase, tr.includes('["'+phrase+'",'));
}
const syncBlocks=mob.split("apiRequest<MobileSyncResponse>('/inventory-capabilities/mobile-sync', {").slice(1).map(part => part.split('});')[0]);
check('both direct and retry mobile sync operations suppress shared toast', syncBlocks.length===2 && syncBlocks.every(block=>block.includes('skipMutationFeedback: true')));
check('Mobile task action clears previous evidence feedback',mob.includes('setMessage(null); setEvidenceMessage(null); setActionError(null);'));
check('Evidence selection clears previous task feedback',mob.includes('setEvidenceTask(task); setMessage(null); setEvidenceMessage(null); setActionError(null);'));
check('Evidence upload clears previous task feedback',mob.includes('setEvidenceUploading(true); setMessage(null); setActionError(null); setEvidenceMessage(null);'));
// Upload confirmation is intentionally contextual: its visible message must name
// the persisted task and filename, and must follow readback verification.
const mobileAst = ts.createSourceFile('MobileExecutionPage.tsx', mob, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let uploadDeclaration = null;
function findUploadHandler(node) {
 if (ts.isVariableDeclaration(node) && node.name.getText(mobileAst) === 'uploadEvidence') uploadDeclaration = node;
 ts.forEachChild(node, findUploadHandler);
}
findUploadHandler(mobileAst);
check('Mobile upload handler is present', Boolean(uploadDeclaration?.initializer && ts.isArrowFunction(uploadDeclaration.initializer)));
const uploadCode = ts.transpileModule(`const uploadEvidence = ${uploadDeclaration.initializer.getText(mobileAst)};`, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
async function verifyMobileUploadBehavior() {
 const task = {id:'task-1',task_code:'TASK-ONE',title:'Actual task'};
 const file = {name:'report.txt',type:'text/plain'};
 const receipt = {id:'att-1',entity_type:'execution_task',entity_id:'task-1',original_filename:'report.txt'};
 function setup({uploadReceipt=receipt,readback=[receipt],postError=null,getError=null}={}) {
  const calls={messages:[],errors:[],requests:[],refetches:0};
  const context={
   evidenceTask:task,canUploadEvidence:true,URLSearchParams,encodeURIComponent,Error,Array,
   setEvidenceUploading:()=>{},setMessage:()=>{},setActionError:e=>calls.errors.push(e),
   setEvidenceMessage:m=>calls.messages.push(m),setEvidenceTask:()=>{},
   photoInputRef:{current:{value:'previous'}},evidenceInputRef:{current:{value:'previous'}},
   ui:message=>message,
   recentEvidenceQuery:{refetch:async()=>{calls.refetches++;}},
   apiRequest:async (url,opts)=>{
    calls.requests.push({url,opts});
    if(url.includes('/attachments/upload')) { if(postError) throw postError; return uploadReceipt; }
    if(getError)throw getError;
    return readback;
   }
  };
  vm.runInNewContext(uploadCode+'\nthis.__uploadEvidence=uploadEvidence;',context);
  return {calls,upload:()=>context.__uploadEvidence(file)};
 }
 let h=setup(); await h.upload();
 check('Mobile upload requests a task-scoped write without generic toast',h.calls.requests.length===2 && h.calls.requests[0].url.includes('entity_id=task-1') && h.calls.requests[0].opts.skipMutationFeedback===true);
 check('Mobile upload verifies server-side attachment readback',h.calls.requests[1].url.includes('entity_id=task-1') && h.calls.refetches===1);
 check('Verified upload displays exact task code and filename',h.calls.messages.some(m=>typeof m==='string' && m.includes('Evidence attached to the execution task successfully.') && m.includes('TASK-ONE') && m.includes('report.txt')));
 h=setup({uploadReceipt:{...receipt,entity_id:'other-task'}});await h.upload();
 check('Wrong-task receipt never reports successful attachment',h.calls.requests.length===1 && h.calls.refetches===0 && h.calls.messages.every(m=>!String(m).includes('Evidence attached to the execution task successfully.')));
 h=setup({readback:[]});await h.upload();
 check('Missing file in readback never reports successful attachment',h.calls.refetches===0 && h.calls.messages.every(m=>!String(m).includes('Evidence attached to the execution task successfully.')));
 h=setup({getError:new Error('readback unavailable')});await h.upload();
 check('Readback failure reports uncertainty rather than success',h.calls.messages.some(m=>typeof m==='string' && m.includes('file list could not be checked')) && h.calls.messages.every(m=>!String(m).includes('Evidence attached to the execution task successfully.')));
 h=setup({postError:new Error('upload failed')});await h.upload();
 check('Upload API failure displays error and no success',h.calls.errors.some(m=>String(m).includes('upload failed')) && h.calls.messages.every(m=>!String(m).includes('Evidence attached to the execution task successfully.')));
 console.log(`${count}/${count} FT198 focused checks PASS`);
}

check('Mobile task claim still has its own success message',mob.includes("ui('Task assigned to you.')"));
check('Reservation allocation still issues POST with expected version',res.includes('body.expected_version = Number(reservation.version)')&&res.includes('`/inventory-reservations/${id}/${action}`'));
verifyMobileUploadBehavior().catch(error=>{console.error(error);process.exitCode=1;});

