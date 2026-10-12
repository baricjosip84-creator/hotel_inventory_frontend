import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const front = process.cwd();
const page = readFileSync(process.env.BATCH147_PAGE_SOURCE || path.join(front,'src/components/enterpriseInventory/tabs/AttachmentsTab.tsx'),'utf8');
const translations = readFileSync(path.join(front,'src/i18n/tenantUiTranslations.ts'),'utf8');
const routes = readFileSync(path.join(front,'../hotel-inventory-backend/src/routes/enterpriseInventory.js'),'utf8');
const api = readFileSync(path.join(front,'src/lib/api.ts'),'utf8');
const wrappers = readFileSync(path.join(front,'src/components/enterpriseInventory/EnterpriseInventoryRequests.ts'),'utf8');
const pkg = JSON.parse(readFileSync(path.join(front,'package.json'),'utf8'));
let checks=0;
function check(label,fn){fn();checks++;console.log('PASS',label);}
const parsed=ts.createSourceFile('AttachmentsTab.tsx',page,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
check('Attachments tab TSX parses',()=>assert.equal(parsed.parseDiagnostics.length,0));
check('Attachments tab transpiles',()=>assert.equal((ts.transpileModule(page,{fileName:'AttachmentsTab.tsx',reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0));
check('translations TS parses',()=>assert.equal(ts.createSourceFile('i18n.ts',translations,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS).parseDiagnostics.length,0));
check('registered test command',()=>assert.equal(pkg.scripts['check:batch147-attachment-download-failure'],'node scripts/check-batch147-attachment-download-failure.mjs'));
let downloadInitializer=null;
function walk(node){if(ts.isVariableDeclaration(node)&&node.name.getText(parsed)==='downloadAttachment')downloadInitializer=node.initializer?.getText(parsed);ts.forEachChild(node,walk);}walk(parsed);
check('actual download handler extracted',()=>assert(downloadInitializer?.includes('await downloadEnterpriseInventoryFile(')));
const compiled=ts.transpileModule(`const downloadAttachment = ${downloadInitializer};`,{fileName:'download147.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function setup({allowed=true,pending=false,reject=null,downloadResult=undefined}={}){
  const calls=[];const ids=[];const errors=[];let downloadingId=pending?'another-download':null;
  function setDownloadingId(value){downloadingId=value;ids.push(value);}
  function setDownloadError(value){errors.push(value);}
  async function downloadEnterpriseInventoryFile(url,filename){calls.push([url,filename]);if(reject)throw reject;return downloadResult;}
  const ui=(value)=>`translated:${value}`;
  const fn=new Function('_setDownloadingId','setDownloadError','downloadEnterpriseInventoryFile','ui','getDownloadingId','let downloadingId = getDownloadingId(); const activeDownloadRef = { current: null }; const setDownloadingId = (value) => { downloadingId=value; _setDownloadingId(value); };\n'+compiled+'\nreturn downloadAttachment;')(setDownloadingId,setDownloadError,downloadEnterpriseInventoryFile,ui,()=>downloadingId);
  return {fn,calls,ids,errors,item:{id:'id/one',original_filename:'invoice 2026.pdf',can_download:allowed}};
}
{
  const x=setup();
  await x.fn(x.item);
  check('success uses exact original download endpoint',()=>assert.deepEqual(x.calls,[['/enterprise-inventory/attachments/id%2Fone/download','invoice 2026.pdf']]));
  check('success clears previous local download error',()=>assert.equal(x.errors[0],null));
  check('success never shows failure message',()=>assert.equal(x.errors.length,1));
  check('success starts and clears pending state',()=>assert.deepEqual(x.ids,['id/one',null]));
}
{
  const x=setup({reject:new Error('Server returned 503')});
  await x.fn(x.item);
  check('download rejection consumed by the click handler',()=>assert.equal(x.calls.length,1));
  check('download failure has translated inline error',()=>assert.deepEqual(x.errors,[null,'translated:Failed to download attachment.']));
  check('download failure always clears spinner',()=>assert.deepEqual(x.ids,['id/one',null]));
  check('technical server error not leaked into local message',()=>assert(!x.errors.join(' ').includes('503')));
}
{
  const x=setup({reject:'network offline'});await x.fn(x.item);
  check('non-Error download rejections are consumed',()=>assert.equal(x.errors.at(-1),'translated:Failed to download attachment.'));
  check('non-Error rejection releases pending state',()=>assert.equal(x.ids.at(-1),null));
}
{
  const x=setup({allowed:false});await x.fn(x.item);
  check('cannot-download attachment never triggers request',()=>assert.equal(x.calls.length,0));
  check('cannot-download attachment never changes UI',()=>assert.equal(x.errors.length+x.ids.length,0));
}
{
  const x=setup({pending:true});await x.fn(x.item);
  check('concurrent attachment download guard retained',()=>assert.equal(x.calls.length,0));
  check('guard does not reset another download spinner',()=>assert.equal(x.ids.length,0));
}
{
  const x=setup({reject:new Error('first attempt fails')});await x.fn(x.item);
  await x.fn(x.item);
  check('second attempt still uses same permission-gated URL',()=>assert.equal(x.calls.length,2));
  check('each retry resets previous error before attempt',()=>assert.equal(x.errors[2],null));
}
check('error rendered with accessible alert role',()=>assert.match(page,/<div role="alert" style=\{styles\.error\}>\{downloadError\}<\/div>/));
check('error stays by attachment list, not upload form',()=>assert(page.indexOf('{downloadError &&')>page.indexOf("ui('Entity attachments')")));
check('error gated by attachment read permission',()=>assert(page.includes('downloadError && canReadAttachments && attachmentForm.entity_id')));
// Batch149 also clears the pending upload file when the attachment target changes.
// Preserve the original download-error invariant without asserting an obsolete
// byte-for-byte callback, and allow the new upload-safety step in between.
check('changing attachment entity type clears stale error',()=>assert(/setDownloadError\(null\);\s*(?:clearPendingAttachmentFile\(\);\s*)?setAttachmentForm\(\(current\) => \(\{ \.\.\.current, entity_type: value, entity_id: '' \}\)\)/.test(page)));
check('changing record clears stale error on both selectors',()=>assert.equal((page.match(/setDownloadError\(null\);\s*(?:clearPendingAttachmentFile\(\);\s*)?setAttachmentForm\(\(current\) => \(\{ \.\.\.current, entity_id: value \}\)\)/g)||[]).length,2));
check('existing styled file picker retained',()=>assert(page.includes('<EnterpriseFilePicker')));
check('file upload MIME and size restriction unchanged',()=>assert(page.includes('MAX_FILE_BYTES = 8 * 1024 * 1024')));
check('upload endpoint remains in workflow mutation',()=>assert(readFileSync(path.join(front,'src/components/enterpriseInventory/EnterpriseInventoryWorkflowMutations.ts'),'utf8').includes('/enterprise-inventory/attachments/upload?')));
check('download click still calls async function exactly once',()=>assert(page.includes('onClick={() => void downloadAttachment(item)}')));
check('per-file download permission enforced in UI',()=>assert(page.includes('if (!attachment.can_download || downloadingId) return;')));
check('real file and filename used',()=>assert(page.includes('attachment.original_filename')));
check('download endpoint uses encoded identifier',()=>assert(page.includes('encodeURIComponent(attachment.id)')));
check('backend enforces attachment read permission',()=>assert(routes.includes("router.get('/attachments/:id/download', requirePermission(TENANT_PERMISSIONS.ATTACHMENTS_READ)")));
check('backend enforces upload write permission',()=>assert(routes.includes("router.post('/attachments/upload', requirePermission(TENANT_PERMISSIONS.ATTACHMENTS_WRITE)")));
check('browser downloader still emits errors for failed responses',()=>assert(api.includes("message: error instanceof Error ? error.message : 'Download failed.'")));
check('download request uses GET',()=>assert(api.includes("performRequest(path, { method: 'GET' })")));
check('binary upload still suppresses generic creation success',()=>assert(wrappers.includes('skipMutationFeedback: true')));
check('archived record upload disabled',()=>assert(page.includes('const canUploadToSelectedRecord = canWriteAttachments && !selectedRecordArchived')));
check('archived record delete disabled',()=>assert(page.includes('disabled={!canWriteAttachments || selectedRecordArchived || deleteAttachmentMutation.isPending}')));
check('checksum still kept inside collapsed technical details',()=>assert(page.includes("ui('Technical details')") && page.includes('<code>{item.content_sha256}</code>')));
const lines=translations.split('\n').filter(x=>x.startsWith('  ["Failed to download attachment.",'));
check('exactly one five-language error row',()=>assert.equal(lines.length,1));
const translationsRow=JSON.parse(lines[0].trim().replace(/,$/,''));
check('translation row contains all five entries',()=>assert.equal(translationsRow.length,5));
for(const [i,lang] of ['English','German','Spanish','French','Croatian'].entries())check(`${lang} download error translation populated`,()=>assert(translationsRow[i].length>15));
console.log(`BATCH147 FOCUSED: ${checks}/${checks} PASS`);
