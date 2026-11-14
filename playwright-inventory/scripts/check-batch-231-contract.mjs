import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const review=JSON.parse(fs.readFileSync(path.join(root,'batch-231-review.json'),'utf8'));
const current=JSON.parse(fs.readFileSync(path.join(root,'original-suite-approved.json'),'utf8'));
const check=(c,m)=>assert(c,m);
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
check(review.group==='BULK_SAFE_12'&&review.batch===231&&review.selected.length===180,'Wrong B231 reviewed batch');
check(current.expected_suite_ids===9900&&current.expected_spec_files===152,'Original suite baseline not 9900/152');
const originals=new Set();
for(const [name,group] of Object.entries(current.approved_groups)){
  if(name==='BULK_SAFE_12') continue;
  for(const e of (group.entries??[group])) for(const id of e.ids??[]) originals.add(id);
}
check(originals.size===1632,'Historical 1,632 attempted original IDs were modified');
check(current.approved_groups.BULK_SAFE_11?.entries?.length===18,'Batch 230 original reviewed group missing');
const priorRecheck=current.approved_groups.BULK_SAFE_11_RECHECK;
const knownRecheck=new Set(['TALERT-049','TPROD-064','TSH-029','TSTR-034','TSTR-037','TSTR-041','TSTR-043','TSUP-026','TSUP-043']);
if (!priorRecheck) {
  check(process.env.PW_B231_OFFLINE_BASELINE==='YES','Final B230 nine-test recheck not installed; never run B231 against an older source');
} else {
  const ids=(priorRecheck.entries??[priorRecheck]).flatMap(e=>e.ids);
  check(ids.length===9&&ids.every(id=>knownRecheck.has(id)),'Final B230 nine-test recheck approvals unexpectedly changed');
}
const files=fs.readdirSync(path.join(root,'tests/tenant'),{withFileTypes:true});
check(files.length>0,'Tenant originals unavailable');
const selected=new Set(); const pinned=new Map(); const byFile=new Map();
for (const item of review.selected){
  check(/^[A-Z0-9]+-\d{3}$/.test(item.id),'Bad test ID: '+item.id);
  check(!selected.has(item.id)&&!originals.has(item.id),'Previously attempted or duplicate test: '+item.id);
  check(item.file.startsWith('tenant/')&&item.file.endsWith('.spec.ts')&&!item.file.includes('..'),'Unsafe original spec path');
  check(/^[a-f0-9]{64}$/.test(item.sha256),'Missing source-reviewed body hash: '+item.id);
  selected.add(item.id); pinned.set(item.id,item); if(!byFile.has(item.file))byFile.set(item.file,[]);byFile.get(item.file).push(item.id);
}
check(selected.size===180&&byFile.size===19,'Expected 180 unique scenarios across 19 ORIGINAL tenant specs');
let examined=0;
for(const [file,ids] of byFile){
  const raw=fs.readFileSync(path.join(root,'tests',file),'utf8');
  check(raw.includes("from '../../../support/liveOriginalSafeTest'"),'Source uses non-guarded test fixture: '+file);
  const tree=ts.createSourceFile(file,raw,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  check(tree.parseDiagnostics.length===0,'TS parse error: '+file);
  const located=new Map();
  const visit=n=>{
    if(ts.isCallExpression(n)&&n.arguments.length>1&&ts.isStringLiteral(n.arguments[0])){
      const e=n.expression;
      const normal=ts.isIdentifier(e)&&['test','it'].includes(e.text);
      const skipped=ts.isPropertyAccessExpression(e)&&e.expression.getText(tree)==='test'&&e.name.text==='skip';
      if(normal||skipped){
        const id=n.arguments[0].text.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];
        if(id&&selected.has(id)){
          check(!located.has(id),'Duplicate selected ID: '+id);
          const body=n.arguments[1].getText(tree);
          check(!skipped,`Skipped original test selected: ${id}`);
          check(sha(body)===pinned.get(id).sha256,`Original source body drift: ${id}. Stop; never run a changed scenario`);
          for(const x of [/loginAsDisposableRole\s*\(/,/\brole\s*:/,/PW_[A-Z_]+/,/\b(?:page|request)\.request\.(?:post|patch|put|delete)\s*\(/,/\broute\.continue\s*\(/,/\.waitForTimeout\s*\(/,/\btest\.skip\s*\(/])
            check(!x.test(body),`Disallowed setup or unsafe operation in ${id}: ${x}`);
          check(/\bexpect\s*\(/.test(body),`No meaningful source assertion: ${id}`);
          located.set(id,true);examined++;
        }
      }
    }
    ts.forEachChild(n,visit);
  }; visit(tree);
  check(located.size===ids.length,`Missing selected original test(s) in ${file}`);
}
const guard=fs.readFileSync(path.join(root,'support/liveOriginalSafeTest.ts'),'utf8');
const environment=fs.readFileSync(path.join(root,'support/environment.ts'),'utf8');
const cfg=fs.readFileSync(path.join(root,'playwright.live-original.config.ts'),'utf8');
for(const mark of ["page.context().route('**/*'","property === 'continue'","property === 'fulfill'","return route.abort('blockedbyclient')"])
  check(guard.includes(mark),'Live-network non-GET safety guard missing: '+mark);
check(environment.includes('PW_DISPOSABLE_ORIGIN')&&environment.includes('PW_LIVE_ORIGINAL_READONLY')&&environment.includes('approvedLiveOrigin'),'Tenant credential/environment gate missing');
check(cfg.includes('target.origin !== approvedOrigin')&&cfg.includes("trace: 'off', screenshot: 'off', video: 'off'"),'Origin restriction or no-artifact settings missing');
const selectedCsv=fs.readFileSync(path.join(root,'INVENTORY_PLAYWRIGHT_BATCH_231_SELECTED_180_IDS.csv'),'utf8').trim().split(/\r?\n/);
check(selectedCsv.length===181,'Incorrect B231 selection CSV count');
check(selectedCsv.slice(1).every(line=>selected.has(line.split(',')[0])),'Selection CSV contains an unapproved ID');
if(current.approved_groups.BULK_SAFE_12){
  const deployed=current.approved_groups.BULK_SAFE_12;
  check(deployed.secret===true,'Runtime B231 group not gated to credentials');
  check(deployed.entries.length===byFile.size,'Runtime group entry count drift');
  const actual=deployed.entries.flatMap(e=>e.ids);
  check(actual.length===180&&actual.every(id=>selected.has(id)),'Runtime allowlist differs from reviewed IDs');
  for(const e of deployed.entries)check(sha(fs.readFileSync(path.join(root,'tests',e.file)))===e.sha256,'Runtime source file drift: '+e.file);
}
console.log(`PASS B231: ${examined} pinned, previously unattempted original test bodies / 19 source files`);
console.log('PASS B231: 1,632 prior attempted excluded; final B230 recheck gate checked; no role/disposable source actions');
console.log('PASS B231: protected origin, non-GET network guard, auth boundary, exact live test source and no artifacts');
console.log('NOT VERIFIED: live UI behavior and actual GitHub browser PASS (requires the one controlled GitHub run)');
