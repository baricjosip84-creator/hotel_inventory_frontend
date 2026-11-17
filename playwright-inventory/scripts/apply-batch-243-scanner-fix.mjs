// Apply ONLY the task-success presentation repair to the user's current checkout.
// No network, credentials, receiving logic, or unrelated source changes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const file=fileURLToPath(new URL('../../src/pages/ScannerPage.tsx',import.meta.url));
const check=process.argv.includes('--check');
assert(process.argv.length===2||(process.argv.length===3&&check),'Only optional --check is accepted');
const original=fs.readFileSync(file,'utf8');
const eol=original.includes('\r\n')?'\r\n':'\n';
const source=original.replace(/\r\n/g,'\n');
const message="setLastReceivedMessage(ui('Task item verified. Complete the real source workflow before completing the execution task.'));";
const productGuard="        {mode === 'product' ? (\n          <div style={styles.sessionPanel}>";
const productEnd="            {lastReceivedMessage ? <div className=\"app-success-state\" style={styles.sessionMessage}>{lastReceivedMessage}</div> : null}\n          </div>\n        ) : null}";
const anchor=productEnd+"\n\n        <div style={mode === 'product' ? styles.operationNoticeWarn : styles.operationNoticeInfo}>";
const addition="\n\n        {mode === 'task' && taskVerification && lastReceivedMessage ? (\n          <div className=\"app-success-state\" role=\"status\" style={styles.sessionMessage}>{lastReceivedMessage}</div>\n        ) : null}";
const patched=productEnd+addition+"\n\n        <div style={mode === 'product' ? styles.operationNoticeWarn : styles.operationNoticeInfo}>";
const once=(s,t)=>s.split(t).length===2;
assert(once(source,message),'Task-success setter has changed; current source requires review. No write.');
assert(once(source,productGuard),'Receiving-only panel structure has changed; current source requires review. No write.');
assert(once(source,productEnd),'Receiving-only success panel has changed; current source requires review. No write.');
assert(source.indexOf(productGuard)<source.indexOf(productEnd),'Unexpected receiving panel order; no write.');
if(once(source,patched)){console.log('PASS B243: task-success presentation already present; receiving panel preserved.');process.exit(0);}
assert(once(source,anchor),'Expected exact scanner rendering context not present; no write.');
assert(!source.includes(addition),'Ambiguous task-success rendering; no write.');
assert(!check,'B243 source fix not applied. Apply the supplied script and commit the changed ScannerPage.tsx before deployment.');
const next=source.replace(anchor,patched);
assert(once(next,patched)&&next.replace(patched,anchor)===source,'Unexpected source change; no write.');
fs.writeFileSync(file,next.replace(/\n/g,eol));
console.log('PASS B243: updated src/pages/ScannerPage.tsx; exact task message now rendered only for verified tasks. Receiving logic unchanged.');
