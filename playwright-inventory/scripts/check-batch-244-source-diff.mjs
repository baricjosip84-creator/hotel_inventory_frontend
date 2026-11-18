// Verify the correction against the exact Git history, without writing source.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const p=JSON.parse(fs.readFileSync(new URL('../batch-244-review.json',import.meta.url),'utf8'));
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});
const sha=s=>crypto.createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex');
assert.equal(Object.keys(p.source_files).length,3);
assert.match(p.recovery_failed_commit,/^[a-f0-9]{40}$/);
git('merge-base','--is-ancestor',p.recovery_failed_commit,'HEAD');
for(const [file,r] of Object.entries(p.source_files)){
  assert.equal(git('rev-parse',r.bad_commit+'^').trim(),r.original_parent);
  assert.equal(sha(git('show',r.original_parent+':'+file)),r.before,'Original committed source mismatch: '+file);
  assert.equal(sha(git('show',r.bad_commit+':'+file)),r.bad_after,'Original B244 commit mismatch: '+file);
  assert.equal(sha(git('show','HEAD:'+file)),r.after,'Corrected committed source mismatch: '+file);
  assert.equal(sha(fs.readFileSync(root+file,'utf8')),r.after,'Corrected working source mismatch: '+file);
  console.log('PASS B244 R2 exact source history: '+file);
}
