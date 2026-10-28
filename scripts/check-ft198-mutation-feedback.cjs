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
check('Mobile upload still has its own success message',mob.includes("setEvidenceMessage(ui('Evidence attached to the execution task successfully.'))"));
check('Mobile task claim still has its own success message',mob.includes("ui('Task assigned to you.')"));
check('Reservation allocation still issues POST with expected version',res.includes('body.expected_version = Number(reservation.version)')&&res.includes('`/inventory-reservations/${id}/${action}`'));
console.log(`${count}/${count} FT198 focused checks PASS`);
