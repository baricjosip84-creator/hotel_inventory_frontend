import fs from 'node:fs';
import assert from 'node:assert/strict';
const manifest=JSON.parse(fs.readFileSync('original-suite-approved.json','utf8'));
const plan=JSON.parse(fs.readFileSync('batch-235-r4-review.json','utf8'));
const group=manifest.approved_groups.BULK_SAFE_16;
const all=group.entries.flatMap(e=>e.ids);
const sort=x=>[...x].sort();
assert.deepEqual(sort(all),sort(plan.recheck));
assert.equal(process.env.PW_BASE_URL,'https://hotel-inventory-frontend-mauve.vercel.app');
assert.equal(process.env.PW_LIVE_ORIGINAL_READONLY,'YES');assert.equal(process.env.PW_ORIGINAL_SUITE_GROUP,'BULK_SAFE_16');
const file='batch-235-live-access.json';
if(process.argv.includes('--init')){
 fs.writeFileSync(file,JSON.stringify({status:'AUTH_NOT_VERIFIED',pages:plan.pages,access:{},runnable:[],blocked:all},null,2));
 process.exit(0);
}
assert(process.argv.includes('--apply'));
const observed=JSON.parse(fs.readFileSync(file,'utf8'));
assert.equal(observed.status,'PROBED');
assert.deepEqual(sort(Object.keys(observed.access)),sort(Object.keys(plan.pages)));
assert(Object.values(observed.access).every(x=>['ACCESS_CONFIRMED','ACCESS_UNVERIFIED'].includes(x)));
const allowed=group.entries.filter(e=>observed.access[e.file.split('/')[1]]==='ACCESS_CONFIRMED');
const runnable=allowed.flatMap(e=>e.ids),blocked=all.filter(id=>!runnable.includes(id));
assert.equal(runnable.length+blocked.length,9);
fs.writeFileSync(file,JSON.stringify({...observed,runnable,blocked},null,2));
console.log('B235 access-confirmed '+runnable.length+'; access-unverified '+blocked.length+' (not PASS).');
console.log('ACCESS_UNVERIFIED IDs: '+blocked.join(','));
assert(runnable.length>0,'No authorized route available');
group.entries=allowed;fs.writeFileSync('original-suite-approved.json',JSON.stringify(manifest,null,2)+'\n');
