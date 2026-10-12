import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const front=process.cwd();
const source=readFileSync(process.env.BATCH148_PAGE_SOURCE||path.join(front,'src/components/enterpriseInventory/tabs/AttachmentsTab.tsx'),'utf8');
const translations=readFileSync(path.join(front,'src/i18n/tenantUiTranslations.ts'),'utf8');
const backend=readFileSync(path.join(front,'../hotel-inventory-backend/src/routes/enterpriseInventory.js'),'utf8');
const pkg=JSON.parse(readFileSync(path.join(front,'package.json'),'utf8'));
let assertions=0;
const check=(label,fn)=>{fn();assertions++;console.log('PASS',label)};
const parsed=ts.createSourceFile('AttachmentsTab.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
check('Attachments TSX valid syntax',()=>assert.equal(parsed.parseDiagnostics.length,0));
check('component transpiles',()=>assert.equal((ts.transpileModule(source,{fileName:'AttachmentsTab.tsx',reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0));
check('test command registered',()=>assert.equal(pkg.scripts['check:batch148-attachment-download-busy-state'],'node scripts/check-batch148-attachment-download-busy-state.mjs'));
let downloadButton=null;
function walk(node){
 if(ts.isJsxOpeningElement(node)&&node.tagName.getText(parsed)==='button'&&node.attributes.getText(parsed).includes('downloadAttachment(item)'))downloadButton=node;
 ts.forEachChild(node,walk);
}
walk(parsed);
check('unique attachment download button found',()=>assert(downloadButton));
function attrValue(key){
 const found=downloadButton.attributes.properties.find(x=>x.name?.text===key);
 return found?.initializer?.expression?.getText(parsed);
}
const disabledExpr=attrValue('disabled'),styleExpr=attrValue('style');
check('download button has disabled expression',()=>assert(disabledExpr));
check('download button has style expression',()=>assert(styleExpr));
const compiled=ts.transpileModule(`function state(item,downloadingId,styles){return {disabled:${disabledExpr},style:${styleExpr}}}`,{fileName:'download-state.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const evaluate=new Function('return '+compiled.replace(/"use strict";/,'').replace(/^exports\..*$/gm,'')+'\nreturn state;')();
const styles={smallButton:{kind:'actionable'},disabledButton:{kind:'disabled'}};
const possible=[
 {file:{id:'A',can_download:true},current:null,disabled:false,style:'actionable',description:'idle eligible file'},
 {file:{id:'A',can_download:false},current:null,disabled:true,style:'disabled',description:'metadata-only file'},
 {file:{id:'A',can_download:true},current:'A',disabled:true,style:'disabled',description:'actively downloading file'},
 {file:{id:'B',can_download:true},current:'A',disabled:true,style:'disabled',description:'other file while A downloads'},
 {file:{id:'C',can_download:false},current:'A',disabled:true,style:'disabled',description:'metadata-only file during download'},
 {file:{id:'B',can_download:true},current:'B',disabled:true,style:'disabled',description:'actively downloading second file'},
 {file:{id:'B',can_download:true},current:null,disabled:false,style:'actionable',description:'second file available after A finishes'},
];
for(const v of possible){
 const state=evaluate(v.file,v.current,styles);
 check(`${v.description} disabled`,()=>assert.equal(state.disabled,v.disabled));
 check(`${v.description} visual style`,()=>assert.equal(state.style.kind,v.style));
}
check('visible status message during download',()=>assert(source.includes('downloadingId && canReadAttachments && attachmentForm.entity_id')));
check('status announced accessibly',()=>assert(source.includes('<p role="status" style={styles.helper}>' )));
check('status explains disabled files',()=>assert(source.includes("ui('Download in progress. Other downloads are temporarily unavailable.')")));
check('status located adjacent to attachment table',()=>assert(source.indexOf('Download in progress. Other downloads')>source.indexOf("ui('Entity attachments')")));
check('status hidden when no read access',()=>assert(source.includes('downloadingId && canReadAttachments && attachmentForm.entity_id')));
check('only active row shows downloading text',()=>assert(source.includes("downloadingId === item.id ? ui('Downloading…')")));
check('metadata-only row still labeled accurately',()=>assert(source.includes("item.can_download ? ui('Download') : ui('Metadata only')")));
check('download click still invokes original handler',()=>assert(source.includes('onClick={() => void downloadAttachment(item)}')));
check('single-flight guard remains',()=>assert(source.includes('if (!attachment.can_download || downloadingId) return;')));
check('pending set before async transport',()=>assert(source.indexOf('setDownloadingId(attachment.id)')<source.indexOf('await downloadEnterpriseInventoryFile(')));
check('pending always reset after transport',()=>assert(source.includes('finally {\n      setDownloadingId(null);')));
check('failed download still displays inline error',()=>assert(source.includes("setDownloadError(ui('Failed to download attachment.'))")));
check('success/failure downloads use same transport',()=>assert(source.includes('await downloadEnterpriseInventoryFile(')));
check('download endpoint unchanged',()=>assert(source.includes('`/enterprise-inventory/attachments/${encodeURIComponent(attachment.id)}/download`')));
check('download original filename preserved',()=>assert(source.includes('attachment.original_filename')));
check('upload form still exists',()=>assert(source.includes('onSubmit={handleUpload}')));
check('attachment deletion still gated',()=>assert(source.includes('disabled={!canWriteAttachments || selectedRecordArchived || deleteAttachmentMutation.isPending}')));
check('backend download READ permission intact',()=>assert(backend.includes("router.get('/attachments/:id/download', requirePermission(TENANT_PERMISSIONS.ATTACHMENTS_READ)")));
check('backend upload WRITE permission intact',()=>assert(backend.includes("router.post('/attachments/upload', requirePermission(TENANT_PERMISSIONS.ATTACHMENTS_WRITE)")));
const row=translations.split('\n').filter(x=>x.startsWith('  ["Download in progress. Other downloads are temporarily unavailable.",'));
check('one busy-status localization row',()=>assert.equal(row.length,1));
const values=JSON.parse(row[0].trim().replace(/,$/,''));
check('five complete language entries',()=>assert.equal(values.length,5));
for(const [ix,language] of ['English','German','Spanish','French','Croatian'].entries())check(`busy status ${language} translated`,()=>assert(values[ix].length>25));
console.log(`BATCH148 FOCUSED: ${assertions}/${assertions} PASS`);
