import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const json=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const ids=f=>fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/).slice(1).map(s=>s.split(',')[0]);
const sort=x=>[...x].sort();
const p=json('batch-240-review.json'),prior=json('batch-239-r2-review.json'),m=json('original-suite-approved.json');
const c=ids('INVENTORY_PLAYWRIGHT_BATCH_240_CONFIRMED_2680_PASS_IDS.csv'),r=ids('INVENTORY_PLAYWRIGHT_BATCH_240_REMAINING_258_IDS.csv'),s=ids('INVENTORY_PLAYWRIGHT_BATCH_240_SELECTED_3_IDS.csv');
const roles=ids('INVENTORY_PLAYWRIGHT_TENANT_ROLE_GATE_214_IDS.csv'),blocked=ids('INVENTORY_PLAYWRIGHT_BATCH_239_ACCESS_UNVERIFIED_8_IDS.csv');
assert.equal(p.batch,240);assert.equal(p.group,'BULK_SAFE_17');
assert.equal(c.length,2680);assert.equal(r.length,258);assert.equal(s.length,3);assert.equal(roles.length,214);assert.equal(blocked.length,8);
assert.equal(new Set([...c,...r]).size,2938);assert.deepEqual(sort(s),sort(p.selected));
assert(s.every(x=>r.includes(x)&&!c.includes(x)&&!roles.includes(x)&&!blocked.includes(x)));
assert(prior.selected.every(x=>c.includes(x)&&!r.includes(x)));
assert.deepEqual(sort(m.approved_groups.BULK_SAFE_17.entries.flatMap(e=>e.ids)),sort(prior.selected),'B239 R2 runtime preparation must precede B240');
function cases(str,file){
 const tree=ts.createSourceFile(file,str,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);assert.equal(tree.parseDiagnostics.length,0,'TS parse '+file);
 const a=[];function walk(n){if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='test'&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0])){
 const id=n.arguments[0].text.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];if(id)a.push({id,body:n.getText(tree),start:n.getStart(tree),end:n.end});}ts.forEachChild(n,walk);}walk(tree);return a;
}
const entries=[];
for(const [file,entry] of Object.entries(p.spec_files)){
 assert(/^tenant\/[\w-]+\/[\w-]+\.spec\.ts$/.test(file));const area=file.split('/')[1];assert(p.pages[area]);
 const path='tests/'+file;let str=fs.readFileSync(path,'utf8').replace(/\r\n/g,'\n');
 const before=cases(str,file),ops=[];
 assert(str.includes('support/liveOriginalSafeTest'),'Expected guarded fixture from prior runtime '+file);
 assert(!/\b(?:route|r)\.(?:continue|fetch)\(/.test(str),'Unsafe network forwarding '+file);
 for(const id of entry.selected){
  const t=before.find(t=>t.id===id);assert(t,'Missing reviewed original '+id);
  const normalized=t.body.replaceAll(`await openB237Target(page,'/${area}')`,'await loginAsTenant(page)').replaceAll('route.fallback()','route.continue()').replaceAll('r.fallback()','r.continue()');
  assert.equal(sha(normalized),p.tests[id].sha256_original_body,'Unreviewed original drift '+id);
  assert(!/loginAsDisposableRole\(|test\.skip\(|test\.only\(/.test(t.body));
  const {click,message}=p.tests[id];assert.equal(t.body.split(click).length,2,'Exact confirmation click anchor '+id);
  // Do not accept arbitrary prompts, substitute identities, or weaken original assertions.
  // When a reviewed global confirmation appears, perform the same user approval as a normal click.
  const handler=`page.once('dialog',d=>d.type()==='confirm'&&d.message()===${JSON.stringify(message)}?d.accept():d.dismiss());`;
  const next=t.body.replace(click,handler+' '+click);
  assert.equal(next.replace(handler+' ',''),t.body,'Only dialog handling may change '+id);
  ops.push({start:t.start,end:t.end,next});
 }
 for(const op of ops.sort((a,b)=>b.start-a.start))str=str.slice(0,op.start)+op.next+str.slice(op.end);
 const after=cases(str,file);assert.deepEqual(before.map(t=>t.id),after.map(t=>t.id));
 for(const t of before)if(!entry.selected.includes(t.id))assert.equal(after.find(a=>a.id===t.id).body,t.body,'Unselected original modified '+t.id);
 assert.equal(ts.createSourceFile(file,str,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS).parseDiagnostics.length,0);
 fs.writeFileSync(path,str);entries.push({file,ids:entry.selected,sha256:sha(str)});
}
assert.deepEqual(sort(entries.flatMap(e=>e.ids)),sort(s));m.approved_groups.BULK_SAFE_17={secret:true,entries};
fs.writeFileSync('original-suite-approved.json',JSON.stringify(m,null,2)+'\n');
console.log('PASS B240: three exact unresolved original tests; expected confirmation handling only; no previous PASS overlap, no role-gated IDs, unchanged original assertions.');
