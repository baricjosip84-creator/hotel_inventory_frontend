import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const front=process.cwd();
const source=readFileSync(process.env.BATCH150_PAGE_SOURCE||path.join(front,'src/components/enterpriseInventory/tabs/AttachmentsTab.tsx'),'utf8');
const backend=readFileSync(path.join(front,'../hotel-inventory-backend/src/routes/enterpriseInventory.js'),'utf8');
const pkg=JSON.parse(readFileSync(path.join(front,'package.json'),'utf8'));
let checked=0;
function check(title,fn){fn();checked++;console.log('PASS',title);}
const parsed=ts.createSourceFile('AttachmentsTab.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
check('TSX parses without syntax errors',()=>assert.equal(parsed.parseDiagnostics.length,0));
check('TSX transpiles without TS errors',()=>assert.equal((ts.transpileModule(source,{fileName:'AttachmentsTab.tsx',reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0));
let initializer;
function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(parsed)==='downloadAttachment') initializer=node.initializer?.getText(parsed);ts.forEachChild(node,visit)}visit(parsed);
check('real download handler extracted',()=>assert(initializer?.includes('downloadEnterpriseInventoryFile')));
const js=ts.transpileModule(`const downloadAttachment = ${initializer};`,{fileName:'download150.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function scenario({allowed=true,pending=false,fail=false}={}){
 const network=[],events=[],errs=[],lock={current:null};
 let resolvePending,rejectPending;let busy=pending?'previous-download':null;
 const downloadEnterpriseInventoryFile=(url,name)=>{network.push([url,name]);return new Promise((res,rej)=>{resolvePending=res;rejectPending=rej;});};
 const setDownloadError=(x)=>errs.push(x);
 // State is deliberately kept unchanged until another React render. This is
 // the race that the older state-only implementation cannot detect.
 const setDownloadingId=(v)=>events.push(v);
 const ui=x=>`translated:${x}`;
 const run=new Function('activeDownloadRef','downloadingId','setDownloadError','setDownloadingId','downloadEnterpriseInventoryFile','ui',js+'\nreturn downloadAttachment;')(lock,busy,setDownloadError,setDownloadingId,downloadEnterpriseInventoryFile,ui);
 return {run,network,events,errs,lock,resolve:()=>resolvePending?.(),reject:()=>rejectPending?.(new Error('unavailable')),file:{id:'attachment/#9',can_download:allowed,original_filename:'report 2026.pdf'}};
}
{
 const x=scenario(); const p=x.run(x.file);
 check('first click starts one GET download',()=>assert.equal(x.network.length,1));
 check('pending synchronous lock claims ID',()=>assert.equal(x.lock.current,x.file.id));
 check('UI pending state still set',()=>assert.deepEqual(x.events,['attachment/#9']));
 const second=x.run(x.file); const third=x.run({...x.file,id:'different'});
 check('rapid second click does not start another download',()=>assert.equal(x.network.length,1));
 check('rapid different attachment click does not start another download',()=>assert.equal(x.network.length,1));
 check('rapid ignored requests cannot steal lock',()=>assert.equal(x.lock.current,'attachment/#9'));
 check('ignored attempts cannot change loading state',()=>assert.deepEqual(x.events,['attachment/#9']));
 x.resolve();await Promise.all([p,second,third]);
 check('original requested URL encoded',()=>assert.equal(x.network[0][0],'/enterprise-inventory/attachments/attachment%2F%239/download'));
 check('original filename forwarded',()=>assert.equal(x.network[0][1],'report 2026.pdf'));
 check('success releases synchronous lock',()=>assert.equal(x.lock.current,null));
 check('success clears busy UI state',()=>assert.deepEqual(x.events,['attachment/#9',null]));
 check('success clears old error only',()=>assert.deepEqual(x.errs,[null]));
 const retry=x.run(x.file);check('after completion next download may start',()=>assert.equal(x.network.length,2));x.resolve();await retry;
 check('successful retry releases lock',()=>assert.equal(x.lock.current,null));
}
{
 const x=scenario({fail:true}); const p=x.run(x.file);
 check('failure scenario begins with lock held',()=>assert.equal(x.lock.current,x.file.id));
 check('failure scenario refuses duplicate before rejection',()=>{void x.run(x.file);assert.equal(x.network.length,1)});
 x.reject();await p;
 check('network rejection handled',()=>assert.equal(x.errs.at(-1),'translated:Failed to download attachment.'));
 check('network rejection releases synchronous lock',()=>assert.equal(x.lock.current,null));
 check('network rejection clears busy UI state',()=>assert.deepEqual(x.events,['attachment/#9',null]));
 const retry=x.run(x.file);check('retry allowed after rejection',()=>assert.equal(x.network.length,2));x.resolve();await retry;
 check('retry succeeds and clears lock',()=>assert.equal(x.lock.current,null));
}
{
 const x=scenario({allowed:false});await x.run(x.file);
 check('permission denial never starts GET',()=>assert.equal(x.network.length,0));
 check('permission denial never locks',()=>assert.equal(x.lock.current,null));
 check('permission denial does not alter pending state',()=>assert.equal(x.events.length,0));
}
{
 const x=scenario({pending:true});await x.run(x.file);
 check('existing React busy-state guard preserved',()=>assert.equal(x.network.length,0));
 check('existing busy state does not acquire lock',()=>assert.equal(x.lock.current,null));
}
check('guard checks both React state and synchronous ref',()=>assert(/if \(!attachment\.can_download \|\| downloadingId\) return;\s*if \(activeDownloadRef\.current !== null\) return;/.test(source)));
check('ref assigned before async network begins',()=>assert(source.indexOf('activeDownloadRef.current = attachment.id')<source.indexOf('await downloadEnterpriseInventoryFile(')));
check('ref cleared inside finally',()=>assert(/finally\s*\{\s*activeDownloadRef\.current = null;\s*setDownloadingId\(null\)/.test(source)));
check('hook-based ref initialized within component',()=>assert(source.includes('const activeDownloadRef = useRef<string | null>(null);')));
check('download availability guard preserved',()=>assert(source.includes('if (!attachment.can_download || downloadingId) return;')));
check('UI disables all buttons while busy',()=>assert(source.includes('disabled={!item.can_download || downloadingId !== null}')));
check('UI button styling remains visibly disabled',()=>assert(source.includes('item.can_download && downloadingId === null ? styles.smallButton : styles.disabledButton')));
check('UI busy status remains translated',()=>assert(source.includes("ui('Download in progress. Other downloads are temporarily unavailable.')")));
check('download error remains visible',()=>assert(source.includes('downloadError && canReadAttachments && attachmentForm.entity_id')));
check('existing permission read gate',()=>assert(source.includes('const canReadAttachments = hasPermission(TENANT_PERMISSIONS.ATTACHMENTS_READ)')));
check('exact read permission backend guard',()=>assert(backend.includes("router.get('/attachments/:id/download', requirePermission(TENANT_PERMISSIONS.ATTACHMENTS_READ)")));
check('existing write gate preserved',()=>assert(source.includes('canWriteAttachments && !selectedRecordArchived')));
check('original upload size cap preserved',()=>assert(source.includes('MAX_FILE_BYTES = 8 * 1024 * 1024')));
check('original input context cleanup retained',()=>assert(source.includes('const clearPendingAttachmentFile = () => {')));
check('original download link invoked from button',()=>assert(source.includes('onClick={() => void downloadAttachment(item)}')));
check('no new backend mutation endpoint',()=>assert(!source.includes('/attachments/download/start')));
check('test registered in npm package',()=>assert.equal(pkg.scripts['check:batch150-attachment-synchronous-download-lock'],'node scripts/check-batch150-attachment-synchronous-download-lock.mjs'));
console.log(`BATCH150 FOCUSED: ${checked}/${checked} PASS`);
