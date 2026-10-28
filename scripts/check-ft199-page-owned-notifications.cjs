'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name),'utf8');
const api=read('src/lib/api.ts'), req=read('src/pages/InventoryRequisitionsPage.tsx'), res=read('src/pages/InventoryReservationsPage.tsx'), mob=read('src/pages/MobileExecutionPage.tsx'), tr=read('src/i18n/tenantUiTranslations.ts');
let assertions=0;
function verify(label, predicate) { assert.ok(predicate,label); console.log('PASS '+label); assertions++; }
function segment(text, before, after){const p=text.indexOf(before), q=after?text.indexOf(after,p+1):text.length;assert.ok(p>=0&&q>p,`segment ${before}`);return text.slice(p,q);}
for(const [file,txt,jsx] of [['api.ts',api,false],['InventoryReservationsPage.tsx',res,true],['InventoryRequisitionsPage.tsx',req,true],['MobileExecutionPage.tsx',mob,true],['tenantUiTranslations.ts',tr,false]]){
 const ast=ts.createSourceFile(file,txt,ts.ScriptTarget.Latest,true,jsx?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 verify(file+' syntax parses',ast.parseDiagnostics.length===0);
}
verify('reservation page imports explicit one-event dispatcher',res.includes("import { showTenantActionSuccess } from '../lib/actionFeedback';"));
verify('requisition page imports explicit one-event dispatcher',req.includes("import { showTenantActionSuccess } from '../lib/actionFeedback';"));
const mutations=[
 ['draft update','const updateDraftMutation','const createMutation','Reservation draft updated successfully.'],
 ['creation','const createMutation','const conflictResolutionMutation','Reservation created successfully.'],
 ['conflict resolution','const conflictResolutionMutation','const expireDueMutation','Reservation conflict resolved successfully.'],
 ['expiration batch','const expireDueMutation','const actionMutation','Reservation expiration run completed.'],
 ['lifecycle','const actionMutation','const fulfillSelectedMutation',null],
 ['partial fulfillment','const fulfillSelectedMutation','const reservationRows','Reservation fulfilled successfully.']
];
for(const [name,start,end,message] of mutations){
 const s=segment(res,start,end);
 verify('reservation '+name+': API silent toast and preserves mutation request',s.includes('apiMutationRequest<')&&s.includes('skipMutationFeedback: true'));
 verify('reservation '+name+': page emits one specific success',message ? s.includes(`showTenantActionSuccess(ui('${message}'))`):s.includes('showTenantActionSuccess(ui(successByAction[variables.action]))'));
 verify('reservation '+name+': no generic success message',!s.includes("showTenantActionSuccess('Item created successfully.')"));
}
const life=segment(res,'const actionMutation','const fulfillSelectedMutation');
for(const [action,message] of Object.entries({activate:'Reservation activated successfully.',allocate:'Reservation allocated successfully.',release:'Remaining reservation quantity released successfully.',cancel:'Reservation cancelled successfully.',expire:'Reservation expired successfully.',fulfill:'Reservation fulfilled successfully.'})){
 verify('lifecycle action '+action+' maps to precise message',life.includes(`${action}: '${message}'`));
 verify('translation catalog includes '+message,tr.includes(`["${message}",`));
}
verify('lifecycle server request retains exact action POST path',life.includes('`/inventory-reservations/${id}/${action}`')&&life.includes("method: 'POST'"));
verify('allocation retains optimistic version guard',life.includes('body.expected_version = Number(reservation.version)'));
const rqFulfill=segment(req,'const fulfillMutation','const bulkFulfillmentMutation');
verify('single fulfillment POST bypasses shared toast',rqFulfill.includes('skipMutationFeedback: true'));
verify('single fulfillment emits exact one toast',rqFulfill.includes("showTenantActionSuccess(ui('Requisition fulfilled successfully.'))"));
const bulk=segment(req,'const bulkFulfillmentMutation','const exportBulkFulfillmentResults');
verify('bulk fulfillment POST bypasses shared toast',bulk.includes('skipMutationFeedback: true'));
verify('bulk fulfillment emits exact one toast',bulk.includes("showTenantActionSuccess(ui('Requisitions fulfilled successfully.'))"));
verify('both readiness previews silent', (req.match(/skipMutationFeedback: true \/\/ Read-only readiness query/g)||[]).length===2);
verify('API readiness POST fallback also silent',api.includes('!isReadOnlyRequisitionReadinessRequest(path, method)'));
verify('mobile direct and retry sync POST remain toast-silent',(mob.match(/skipMutationFeedback: true \/\/ Row-level status|skipMutationFeedback: true \/\/ Page displays/g)||[]).length===2);
verify('API suppresses HTTP-level toast for per-row mobile sync',api.includes('!isMobileSyncOperationBatchRequest(path, method)'));
verify('execution task creation has specific success mapping',api.includes("return 'Execution task created successfully.';"));
verify('five-language task creation catalog',tr.includes('["Execution task created successfully.",'));
verify('mobile queue switch clears stale feedback',segment(mob,'const updateQueueContext','const updateQueuePage').includes('setMessage(null); setEvidenceMessage(null); setActionError(null);'));
verify('mobile paging clears stale feedback',segment(mob,'const updateQueuePage','const [online').includes('setMessage(null); setEvidenceMessage(null); setActionError(null);'));
verify('mobile take uses the shared viewport success toast only on applied sync',mob.includes("if (action === 'take') {\n        showTenantActionSuccess(ui('Task assigned to you.'));") && !mob.includes("setMessage(action === 'take'"));
for(const key of ['Reservation created successfully.','Reservation draft updated successfully.','Reservation conflict resolved successfully.','Reservation expiration run completed.'])verify('5-language catalog '+key,tr.includes(`["${key}",`));
// Exercise the actual TypeScript mapping functions, not just source text matches.
function isolateFunction(source, name){
 const file=ts.createSourceFile('fixture.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 const fn=file.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
 assert.ok(fn,`missing function: ${name}`);
 const compiled=ts.transpileModule(fn.getText(file),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 const vm=require('node:vm');const ctx={};vm.runInNewContext(compiled+`\nthis.__fixture=${name};`,ctx);return ctx.__fixture;
}
const feedbackText=isolateFunction(api,'tenantMutationSuccessMessage');
verify('actual execution task create maps to precise toast',feedbackText('/execution-tasks','POST')==='Execution task created successfully.');
verify('actual allocation maps to precise toast',feedbackText('/inventory-reservations/fixture-1/allocate','POST')==='Reservation allocated successfully.');
verify('actual release maps to precise toast',feedbackText('/inventory-reservations/fixture-1/release','POST')==='Remaining reservation quantity released successfully.');
const noHttpToast=isolateFunction(api,'isMobileSyncOperationBatchRequest');
verify('mobile sync POST is never generic HTTP success',noHttpToast('/inventory-capabilities/mobile-sync','POST'));
verify('mobile sync GET does not trigger suppression',!noHttpToast('/inventory-capabilities/mobile-sync','GET'));
verify('unrelated POST remains unaffected',!noHttpToast('/execution-tasks','POST'));
verify('FT198 scoped lifecycle fallback preserved',api.includes("if (action === 'release') return 'Remaining reservation quantity released successfully.';"));
console.log(`${assertions}/${assertions} FT199 page-owned notification checks PASS`);
