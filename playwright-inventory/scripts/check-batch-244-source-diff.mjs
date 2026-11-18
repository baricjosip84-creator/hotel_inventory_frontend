// Fail closed if a full source replacement would overwrite unrelated existing edits.
import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const p=JSON.parse(fs.readFileSync(new URL('../batch-244-review.json',import.meta.url),'utf8'));
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:4*1024*1024}),sha=s=>crypto.createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex');
assert.equal(Object.keys(p.source_files).length,3);
for(const [file,review] of Object.entries(p.source_files)){
 const s=fs.readFileSync(root+file,'utf8');assert.equal(sha(s),review.after,'Unexpected repaired source: '+file);assert.equal(sha(git('show','HEAD:'+file)),review.after);
 const last=git('log','-1','--format=%H','--',file).trim();assert.match(last,/^[a-f0-9]{40}$/);
 assert.equal(sha(git('show',last+'^:'+file)),review.before,'Previous committed source differs from reviewed baseline for '+file+'; STOP and request an exact patch.');
 console.log('PASS B244 source diff: '+file+' matches reviewed before and after.');
}
