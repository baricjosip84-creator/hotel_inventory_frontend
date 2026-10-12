import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const source = readFileSync(process.env.BATCH149_PAGE_SOURCE || path.join(root, 'src/components/enterpriseInventory/tabs/AttachmentsTab.tsx'), 'utf8');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const backend = readFileSync(path.join(root, '../hotel-inventory-backend/src/routes/enterpriseInventory.js'), 'utf8');
let checks = 0;
function check(description, action) { action(); ++checks; console.log('PASS', description); }
const parsed = ts.createSourceFile('AttachmentsTab.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
check('TSX parses cleanly', () => assert.equal(parsed.parseDiagnostics.length, 0));
check('TSX transpiles cleanly', () => assert.equal((ts.transpileModule(source, {fileName:'AttachmentsTab.tsx',reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}}).diagnostics || []).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0));
check('regression command registered', () => assert.equal(pkg.scripts['check:batch149-attachment-target-file-reset'],'node scripts/check-batch149-attachment-target-file-reset.mjs'));
const elements=[]; let resetFunction;
function walk(node){
 if(ts.isJsxSelfClosingElement(node)&&(node.tagName.getText(parsed)==='SelectField'||node.tagName.getText(parsed)==='InputField')) elements.push(node);
 if(ts.isVariableDeclaration(node)&&node.name.getText(parsed)==='clearPendingAttachmentFile') resetFunction=node.initializer?.getText(parsed);
 ts.forEachChild(node,walk);
}
walk(parsed);
check('shared file reset helper exists',()=>assert.ok(resetFunction));
const reset = new Function('setSelectedFile','setFileError','fileInputRef',`return (${resetFunction});`);
check('clear helper clears selected file',()=>assert.match(resetFunction,/setSelectedFile\(null\)/));
check('clear helper clears validation error',()=>assert.match(resetFunction,/setFileError\(null\)/));
check('clear helper resets actual native input',()=>assert.match(resetFunction,/fileInputRef\.current\.value\s*=\s*''/));
function getAttr(el,attr){const found=el.attributes.properties.find(p=>p.name?.text===attr);return found?.initializer?.expression?.getText(parsed);}
const targetLabels=['Attach to','Business record','Business record ID'];
const controls=targetLabels.map(label=>{
 const found=elements.filter(el=>getAttr(el,'label')===`ui('${label}')`);
 check(`${label} has one selector`,()=>assert.equal(found.length,1));
 return {label,change:getAttr(found[0],'onChange'),disabled:getAttr(found[0],'disabled')};
});
for(const c of controls){
 check(`${c.label} has a change callback`,()=>assert.ok(c.change));
 check(`${c.label} calls shared clear routine`,()=>assert.match(c.change,/clearPendingAttachmentFile\(\)/));
 check(`${c.label} clears previous download error`,()=>assert.match(c.change,/setDownloadError\(null\)/));
 check(`${c.label} updates current attachment target`,()=>assert.match(c.change,/setAttachmentForm/));
 check(`${c.label} remains disabled during pending uploads`,()=>assert.match(c.disabled,/createAttachmentMutation\.isPending/));
}
for(const c of controls){
 const realFile={name:'customer-invoice.pdf',size:1024};let selected=realFile,uploadError='stale validation message',downloadError='stale download error';
 const inputRef={current:{value:'C:\\fakepath\\customer-invoice.pdf'}};
 let form={entity_type:'supplier_invoice',entity_id:'INV-A',description:'original description'};
 let updated=0;
 const clear=reset(v=>selected=v,v=>uploadError=v,inputRef);
 const onChange = new Function('setDownloadError','clearPendingAttachmentFile','setAttachmentForm',`return (${c.change});`)(v=>downloadError=v,clear,f=>{form=f(form);++updated;});
 onChange(c.label==='Attach to'?'product':'INV-B');
 check(`${c.label} removes stale File object`,()=>assert.equal(selected,null));
 check(`${c.label} clears file browser selection`,()=>assert.equal(inputRef.current.value,''));
 check(`${c.label} clears stale upload error`,()=>assert.equal(uploadError,null));
 check(`${c.label} clears stale download error`,()=>assert.equal(downloadError,null));
 check(`${c.label} updates record state once`,()=>assert.equal(updated,1));
 check(`${c.label} preserves unrelated attachment details`,()=>assert.equal(form.description,'original description'));
 check(`${c.label} correct target persisted`,()=>assert.equal(c.label==='Attach to'?form.entity_type:form.entity_id,c.label==='Attach to'?'product':'INV-B'));
 check(`${c.label} parent ID cleared on entity type change`,()=>assert.equal(form.entity_id,c.label==='Attach to'?'':'INV-B'));
}
check('upload action requires selected file',()=>assert.match(source,/!attachmentForm\.entity_id\s*\|\|\s*!selectedFile/));
check('upload button disabled without selected file',()=>assert.match(source,/disabled=\{!canUploadToSelectedRecord\s*\|\|[^\n]*!selectedFile\}/));
check('upload still sends exact current form and chosen file',()=>assert.match(source,/form: attachmentForm,\s*file: selectedFile/));
check('successful upload resets file object',()=>assert.match(source,/afterSuccess:\s*\(\)\s*=>\s*\{\s*setSelectedFile\(null\)/));
check('file size maximum unchanged',()=>assert.match(source,/const MAX_FILE_BYTES = 8 \* 1024 \* 1024/));
check('empty files rejected',()=>assert.match(source,/file\.size <= 0/));
check('oversize files rejected',()=>assert.match(source,/file\.size > MAX_FILE_BYTES/));
check('archived record uploading remains blocked',()=>assert.match(source,/canWriteAttachments && !selectedRecordArchived/));
check('download permission gate preserved',()=>assert.match(source,/TENANT_PERMISSIONS\.ATTACHMENTS_READ/));
check('upload permission gate preserved',()=>assert.match(source,/TENANT_PERMISSIONS\.ATTACHMENTS_WRITE/));
check('backend attachment upload permission preserved',()=>assert.match(backend,/router\.post\('\/attachments\/upload', requirePermission\(TENANT_PERMISSIONS\.ATTACHMENTS_WRITE\)/));
check('backend attachment download permission preserved',()=>assert.match(backend,/router\.get\('\/attachments\/:id\/download', requirePermission\(TENANT_PERMISSIONS\.ATTACHMENTS_READ\)/));
check('existing single-download guard preserved',()=>assert.match(source,/if \(!attachment\.can_download \|\| downloadingId\) return/));
check('existing delete permission remains',()=>assert.match(source,/disabled=\{!canWriteAttachments \|\| selectedRecordArchived \|\| deleteAttachmentMutation\.isPending\}/));
console.log(`BATCH149 FOCUSED: ${checks}/${checks} PASS`);
