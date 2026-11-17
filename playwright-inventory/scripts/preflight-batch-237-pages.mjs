import fs from 'node:fs';
import assert from 'node:assert/strict';
const m=JSON.parse(fs.readFileSync('original-suite-approved.json','utf8')),p=JSON.parse(fs.readFileSync('batch-237-r4-review.json','utf8'));
const g=m.approved_groups.BULK_SAFE_17,all=g.entries.flatMap(e=>e.ids),sort=x=>[...x].sort();
assert.deepEqual(sort(all),sort(p.selected));
assert.equal(process.env.PW_BASE_URL,'https://hotel-inventory-frontend-mauve.vercel.app');
assert.equal(process.env.PW_LIVE_ORIGINAL_READONLY,'YES');assert.equal(process.env.PW_ORIGINAL_SUITE_GROUP,'BULK_SAFE_17');
const file='batch-237-live-access.json';
if(process.argv.includes('--init')){
 fs.writeFileSync(file,JSON.stringify({status:'AUTH_NOT_VERIFIED',expectedCount:p.selected.length,pages:p.pages,access:{},runnable:[],blocked:all},null,2));process.exit(0);
}
assert(process.argv.includes('--apply'));
const report=JSON.parse(fs.readFileSync(file,'utf8'));
assert.equal(report.status,'PROBED');assert.deepEqual(sort(Object.keys(report.access)),sort(Object.keys(p.pages)));
assert(Object.values(report.access).every(x=>['ACCESS_CONFIRMED','ACCESS_UNVERIFIED'].includes(x)));
g.entries=g.entries.filter(e=>report.access[e.file.split('/')[1]]==='ACCESS_CONFIRMED');
const runnable=g.entries.flatMap(e=>e.ids),blocked=all.filter(id=>!runnable.includes(id));
fs.writeFileSync(file,JSON.stringify({...report,runnable,blocked},null,2));
console.log('B237 access-confirmed '+runnable.length+'; access-unverified '+blocked.length+' (not PASS).');
console.log('ACCESS_UNVERIFIED IDs: '+blocked.join(','));
assert(runnable.length>0,'No authorized route available');
fs.writeFileSync('original-suite-approved.json',JSON.stringify(m,null,2)+'\n');
