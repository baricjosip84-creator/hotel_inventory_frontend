import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript'),sha=s=>crypto.createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex');
const json=f=>JSON.parse(fs.readFileSync(f,'utf8')),ids=f=>fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/).slice(1).map(s=>s.split(',')[0]),sort=a=>[...a].sort();
const p=json('batch-244-review.json'),m=json('original-suite-approved.json'),c=ids('INVENTORY_PLAYWRIGHT_BATCH_244_CONFIRMED_2686_PASS_IDS.csv'),r=ids('INVENTORY_PLAYWRIGHT_BATCH_244_REMAINING_252_IDS.csv'),s=ids('INVENTORY_PLAYWRIGHT_BATCH_244_SELECTED_5_IDS.csv');
assert.equal(p.batch,244);assert.equal(p.count,5);assert.equal(p.group,'BULK_SAFE_17');assert.deepEqual(sort(s),sort(p.selected));assert.equal(c.length,2686);assert.equal(r.length,252);assert.equal(new Set([...c,...r]).size,2938);assert(c.includes('TSN-042'));assert(s.every(id=>r.includes(id)&&!c.includes(id)));assert.deepEqual(m.approved_groups.BULK_SAFE_17.entries.flatMap(e=>e.ids),['TSN-042']);
const entries=[];
for(const [file,review] of Object.entries(p.spec_files)){
 const str=fs.readFileSync('tests/'+file,'utf8');assert.equal(sha(str),review.sha256,'Original runtime source mismatch: '+file);
 const tree=ts.createSourceFile(file,str,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);assert.equal(tree.parseDiagnostics.length,0);const cases=[];
 function walk(n){if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='test'&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0])){const id=n.arguments[0].text.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];if(id)cases.push(id);}ts.forEachChild(n,walk);}walk(tree);
 for(const id of review.selected)assert.equal(cases.filter(i=>i===id).length,1);
 entries.push({file,ids:review.selected,sha256:review.sha256});
}
assert.deepEqual(sort(entries.flatMap(e=>e.ids)),sort(s));
m.approved_groups.BULK_SAFE_17={secret:true,entries};fs.writeFileSync('original-suite-approved.json',JSON.stringify(m,null,2)+'\n');console.log('PASS B244: five exact original runtime tests, no test changes, no confirmed ID repeated.');
