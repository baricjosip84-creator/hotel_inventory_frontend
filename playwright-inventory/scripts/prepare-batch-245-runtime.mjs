import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
const sha=s=>crypto.createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const ids=f=>fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/).slice(1).map(s=>s.split(',')[0]);
const sort=a=>[...a].sort(),stem='INVENTORY_PLAYWRIGHT_BATCH_245_';
const p=read('batch-245-review.json'),m=read('original-suite-approved.json');
const c=ids(stem+'CONFIRMED_2691_PASS_IDS.csv'),r=ids(stem+'REMAINING_247_IDS.csv'),s=ids(stem+'SELECTED_19_IDS.csv'),b=ids(stem+'BLOCKED_228_IDS.csv');
assert.equal(p.batch,245);assert.equal(p.count,19);assert.equal(p.group,'BULK_SAFE_17');
assert.equal(c.length,2691);assert.equal(r.length,247);assert.equal(s.length,19);assert.equal(b.length,228);
assert.equal(new Set([...c,...r]).size,2938);assert.equal(new Set([...s,...b]).size,247);
assert.deepEqual(sort([...s,...b]),sort(r));assert.deepEqual(sort(s),sort(p.selected));
assert(p.previous_batch_green.every(id=>c.includes(id)));
assert.deepEqual(sort(m.approved_groups.BULK_SAFE_17.entries.flatMap(e=>e.ids)),sort(p.previous_batch_green),'B244 R4 preparation must precede B245');
function cases(str,f){
 const tree=ts.createSourceFile(f,str,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),result=new Map();
 assert.equal(tree.parseDiagnostics.length,0,'Invalid TypeScript '+f);
 function walk(n){if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='test'&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0])){const id=n.arguments[0].text.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];if(id){assert(!result.has(id),'Duplicate '+id);result.set(id,n.getText(tree));}}ts.forEachChild(n,walk);}walk(tree);return result;
}
const entries=[],sourceUnverified=[];
for(const [file,review] of Object.entries(p.spec_files)){
 assert(/^tenant\/[\w-]+\/[\w-]+\.spec\.ts$/.test(file));
 const disk='tests/'+file,area=file.split('/')[1],normalize=x=>x.replaceAll(`await openB237Target(page,'/${area}')`,'await loginAsTenant(page)').replaceAll('route.fallback()','route.continue()').replaceAll('r.fallback()','r.continue()');
 let str=fs.readFileSync(disk,'utf8').replace(/\r\n/g,'\n');
 const prior=cases(str,file),eligible=[];
 for(const id of review.selected){
   const raw=prior.get(id);assert(raw,'Missing original '+id);
   assert.equal(p.tests[id].file,file);assert(s.includes(id));
   if(!p.tests[id].allowed_body_sha256.includes(sha(normalize(raw)))){sourceUnverified.push(id);continue;}
   assert(!/test\.(?:skip|only)\(|loginAsDisposableRole\(|\b(?:route|r)\.fetch\(|page\.request\./.test(raw),'Unsafe selected case '+id);
   eligible.push(id);
 }
 if(!eligible.length)continue;
 str=str.replace(/import\s*\{([^}]*\btest\b[^}]*)\}\s*from\s*'@playwright\/test';/g,"import {$1} from '../../../support/liveOriginalSafeTest';");
 assert(str.includes('support/liveOriginalSafeTest'),'Protected fixture absent '+file);
 // Preserve original assertions; only transport fallback and requisition document navigation.
 str=str.replace(/\b(route|r)\.continue\(\)/g,'$1.fallback()');
 if(eligible.includes('TIR-020')){
   const anchor="await page.route('**/inventory-requisitions**',async(route:Route)=>{";
   const at=str.indexOf(anchor);assert(at>=0,'Requisition fixture anchor changed');
   const following=str.slice(at+anchor.length,at+anchor.length+240);
   if(!following.includes('isNavigationRequest()'))str=str.replace(anchor,anchor+'\n  if(route.request().isNavigationRequest())return route.fallback();');
 }
 const next=cases(str,file);assert.deepEqual([...next.keys()],[...prior.keys()],'Original IDs changed');
 for(const id of eligible)assert.equal(normalize(next.get(id)),normalize(prior.get(id)),'Selected assertion changed '+id);
 fs.writeFileSync(disk,str);entries.push({file,ids:eligible,sha256:sha(str)});
}
const approved=entries.flatMap(e=>e.ids);
assert.deepEqual(sort([...approved,...sourceUnverified]),sort(s));
m.approved_groups.BULK_SAFE_17={secret:true,entries};fs.writeFileSync('original-suite-approved.json',JSON.stringify(m,null,2)+'\n');
fs.writeFileSync('batch-245-source-review.json',JSON.stringify({approved,sourceUnverified},null,2)+'\n');
console.log('B245 source verified '+approved.length+'/19; source drift (not executed): '+sourceUnverified.join(','));
assert(approved.length>0,'No reviewed original source matches');
