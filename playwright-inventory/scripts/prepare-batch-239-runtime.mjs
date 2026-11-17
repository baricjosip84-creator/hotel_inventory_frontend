import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const ids=f=>fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/).slice(1).map(s=>s.split(',')[0]);
const sort=a=>[...a].sort();
const p=read('batch-239-review.json'),b=read('batch-238-r2-review.json'),m=read('original-suite-approved.json');
const c=ids('INVENTORY_PLAYWRIGHT_BATCH_239_CONFIRMED_2672_PASS_IDS.csv'),r=ids('INVENTORY_PLAYWRIGHT_BATCH_239_REMAINING_266_IDS.csv'),s=ids('INVENTORY_PLAYWRIGHT_BATCH_239_SELECTED_16_IDS.csv'),role=ids('INVENTORY_PLAYWRIGHT_TENANT_ROLE_GATE_214_IDS.csv');
assert.equal(p.group,'BULK_SAFE_17');assert.equal(p.batch,239);assert.equal(p.count,16);
assert.equal(c.length,2672);assert.equal(r.length,266);assert.equal(role.length,214);
assert.equal(new Set([...c,...r]).size,2938);assert.equal(new Set(c).size,2672);assert.equal(new Set(r).size,266);
assert.deepEqual(sort(s),sort(p.selected));assert(s.every(x=>r.includes(x)&&!c.includes(x)&&!role.includes(x)));
assert.deepEqual(sort(m.approved_groups.BULK_SAFE_17.entries.flatMap(e=>e.ids)),sort(b.selected),'Exact Batch238 R2 preparation must precede Batch239');
function cases(str,f){
 const tree=ts.createSourceFile(f,str,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 assert.equal(tree.parseDiagnostics.length,0,'TS parse error '+f);
 const result=[];function walk(n){if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='test'&&ts.isStringLiteral(n.arguments[0])){
   const id=n.arguments[0].text.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];if(id)result.push({id,body:n.getText(tree)});
  }ts.forEachChild(n,walk);}walk(tree);return result;
}
const entries=[];
for(const [file,entry] of Object.entries(p.spec_files)){
 assert(/^tenant\/[\w-]+\/[\w-]+\.spec\.ts$/.test(file));const area=file.split('/')[1];assert(p.pages[area]);
 const disk='tests/'+file;let str=fs.readFileSync(disk,'utf8').replace(/\r\n/g,'\n');let prior=cases(str,file);
 assert.deepEqual(sort(entry.selected),sort(prior.filter(x=>entry.selected.includes(x.id)).map(x=>x.id)));
 for(const id of entry.selected){
  const raw=prior.find(x=>x.id===id).body;
  // Previous B237/B236 runtime may have already applied these exact transport-only replacements.
  const normalized=raw.replaceAll(`await openB237Target(page,'/${area}')`,'await loginAsTenant(page)').replaceAll('route.fallback()','route.continue()').replaceAll('r.fallback()','r.continue()');
  assert.equal(sha(normalized),p.tests[id].sha256_original_body,'Unreviewed selected original source drift '+id);
  assert(!/(test\.skip\(|\.skip\(|test\.only\(|loginAsDisposableRole\(|\brole\s*:|\b(?:route|r)\.(?:continue|fetch)\()/i.test(raw),'Unsafe role or action selected '+id);
 }
 // Force protected per-worker browser fixture. Preserve every original test ID and all assertions.
 str=str.replace(/import\s*\{([^}]*\btest\b[^}]*)\}\s*from\s*'@playwright\/test';/g,"import {$1} from '../../../support/liveOriginalSafeTest';");
 assert(str.includes('support/liveOriginalSafeTest'),'Protected fixture missing '+file);
 if(str.includes('await loginAsTenant(page)')){
   if(!str.includes("from '../../../support/b237TargetSession'"))str="import {openB237Target} from '../../../support/b237TargetSession';\n"+str;
   str=str.replaceAll('await loginAsTenant(page)',`await openB237Target(page,'/${area}')`);
 }
 str=str.replace(/\b(route|r)\.continue\(\)/g,'$1.fallback()');
 const next=cases(str,file);assert.deepEqual(next.map(x=>x.id),prior.map(x=>x.id),'Original ID changes forbidden '+file);
 for(const id of entry.selected){
  const a=prior.find(x=>x.id===id),b=next.find(x=>x.id===id);
  const normalize=x=>x.replaceAll(`await openB237Target(page,'/${area}')`,'await loginAsTenant(page)').replaceAll('route.fallback()','route.continue()').replaceAll('r.fallback()','r.continue()');
  assert.equal(normalize(b.body),normalize(a.body),'Selected original test assertion changed '+id);
  assert.equal((b.body.match(/\bexpect(?:\.poll|\.soft)?\s*\(/g)||[]).length,(a.body.match(/\bexpect(?:\.poll|\.soft)?\s*\(/g)||[]).length,'Assertion removed '+id);
 }
 assert.equal(ts.createSourceFile(file,str,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS).parseDiagnostics.length,0);
 fs.writeFileSync(disk,str);entries.push({file,ids:entry.selected,sha256:sha(str)});
}
assert.deepEqual(sort(entries.flatMap(e=>e.ids)),sort(p.selected));
m.approved_groups.BULK_SAFE_17={secret:true,entries};fs.writeFileSync('original-suite-approved.json',JSON.stringify(m,null,2)+'\n');
console.log('PASS B239: exactly 16 previously outstanding original IDs in 5 files; no role-gated IDs; protected fixture, no removed assertions; no previous PASS overlap.');
