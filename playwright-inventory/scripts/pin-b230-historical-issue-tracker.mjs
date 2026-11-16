// The B230 validators were authored against the exact 200-record tracker
// installed before the first B235 run. Future growing trackers must NOT
// invalidate those frozen contracts or discard newly tracked issues.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repo=path.dirname(root);
// Actual checkout SHA from logs_118774260852.zip; both B230 validators
// passed at this commit before the B235 browser execution started.
const priorCommit='46519798181b7dd0ef494e479683f87a9e47fc3b';
const filename='APPLICATION_ISSUES_TRACKER.csv';
const snapshotName='.b230-historical-issue-tracker.csv';
const scripts=['check-batch-230-contract.mjs','check-batch-230-recheck-contract.mjs'];
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const ids=csv=>{
  // Parse only first CSV column, which is the stable issue_id (unquoted,
  // no embedded newline or commas); ignore any multiline notes.
  const out=[];
  for(const line of csv.replace(/^\uFEFF/,'').split(/\r?\n/)){
    const m=line.match(/^((?:PW|CLOSED|AUDIT|OPS|HIST|UX|FIX|APP|ENV|ACCEPT)-[A-Z0-9_-]+),/);
    if(m)out.push(m[1]);
  }
  assert.equal(new Set(out).size,out.length,'Duplicate issue_id in tracker');
  return out;
};
const current=read(filename);
const currentIds=ids(current);
const pinned=execFileSync('git',['show',priorCommit+':playwright-inventory/'+filename],{cwd:repo,encoding:'utf8',maxBuffer:4*1024*1024});
const historicalIds=ids(pinned);
const verifiedB235Ids=ids(read('docs/issue-evidence/INVENTORY_APPLICATION_ISSUES_TRACKER_BATCH_235_INTERIM_2026-11-16.csv'));
assert.equal(historicalIds.length,200,'Pinned B230 tracker does not contain its original 200 issue IDs');
assert.equal(historicalIds.filter(id=>id.startsWith('PW-')).length,186,'Pinned B230 tracker does not contain 186 original Playwright issues');
assert.equal(verifiedB235Ids.length,640,'B235 cumulative evidence snapshot is incomplete');
assert(currentIds.length>=640,'Cumulative tracker lost recorded issues');
const actual=new Set(currentIds);
assert(historicalIds.every(id=>actual.has(id)),'Cumulative tracker lost an issue from B230');
assert(verifiedB235Ids.every(id=>actual.has(id)),'Cumulative tracker lost a recorded B235 issue');
assert.equal(sha(read(filename)),sha(current),'Cumulative tracker changed during validation');
fs.writeFileSync(path.join(root,snapshotName),pinned,{mode:0o600});

// Preserve the frozen assertions (including exact historical row counts).
// Isolate only their input path, not their expected values or checks of
// source bodies, reviewed ID selection, permissions or production safety.
for(const [index,script] of scripts.entries()){
  const scriptPath=path.join(root,'scripts',script);
  const old=fs.readFileSync(scriptPath,'utf8');
  const literal=/(['"`])([^'"`\r\n]*\/)?APPLICATION_ISSUES_TRACKER\.csv\1/g;
  const matches=[...old.matchAll(literal)];
  if(index===0)assert(matches.length>=1,'B230 frozen tracker reference missing');
  const updated=old.replace(literal,(_,quote,prefix='')=>quote+prefix+snapshotName+quote);
  assert.equal(updated.replaceAll(snapshotName,filename),old,'Unrelated historical contract edit');
  if(matches.length)fs.writeFileSync(scriptPath,updated);
}
assert.equal(sha(read(filename)),sha(current),'Cumulative tracker was modified');
console.log('PASS B230 historical tracker input: pinned 200 records (186 original Playwright issues); all 640 B235 evidence IDs preserved in active cumulative tracker; original checks retained.');
