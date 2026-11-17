// Read-only guard: the source replacement must be exactly the reviewed four-line insertion.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const file='src/pages/ScannerPage.tsx';
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:4*1024*1024});
const norm=s=>s.replace(/\r\n/g,'\n');
const source=norm(fs.readFileSync(root+file,'utf8'));
const addition="\n\n        {mode === 'task' && taskVerification && lastReceivedMessage ? (\n          <div className=\"app-success-state\" role=\"status\" style={styles.sessionMessage}>{lastReceivedMessage}</div>\n        ) : null}";
assert.equal(source.split(addition).length,2,'Exact B243 source repair missing or duplicated');
const last=git('log','-1','--format=%H','--',file).trim();assert.match(last,/^[a-f0-9]{40}$/);
const previous=norm(git('show',last+'^:'+file));
assert.equal(source,norm(git('show','HEAD:'+file)),'Checkout differs from committed file');
assert.equal(source.replace(addition,''),previous,'ScannerPage.tsx replacement differs from previous committed source beyond four reviewed added lines. STOP: restore current source and request an exact patch.');
console.log('PASS B243 source diff: only the four reviewed JSX lines added; all pre-existing source preserved.');
