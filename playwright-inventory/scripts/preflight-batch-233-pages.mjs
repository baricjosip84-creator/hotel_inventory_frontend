// Audit and apply the guarded Playwright page-access probe. No test ID passes here.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target=path.join(root,'original-suite-approved.json');
const manifest=JSON.parse(fs.readFileSync(target,'utf8'));
const group=manifest.approved_groups.BULK_SAFE_14;
assert.equal(group.secret,true);assert.equal(group.entries.flatMap(e=>e.ids).length,500);
const pages={
 'ai-copilot':{text:'Start a new analysis'},
 'automation-schedules':{heading:'Automation schedules'},
 'enterprise-inventory':{heading:'Specialized inventory workflows'},
 'execution-tasks':{heading:'Operational task queue'},
 'inventory-capabilities':{heading:'Advanced inventory workspace'},
 'procurement-recommendations':{heading:'Procurement recommendations'},
 'purchase-orders':{heading:'Purchase orders'},
 'replenishment-planning':{heading:'Replenishment planning'},
 'scanner':{heading:'Shipment QR Scanner'},
 'sessions':{heading:'Sessions'},
};
const area=e=>e.file.split('/')[1];
assert.deepEqual([...new Set(group.entries.map(area))].sort(),Object.keys(pages).sort());
if(process.argv.includes('--plan')){console.log('PASS: ten explicit page probes cover all 500 selected cases');process.exit(0);}
assert.equal(process.env.PW_BASE_URL,'https://hotel-inventory-frontend-mauve.vercel.app');assert.equal(process.env.PW_LIVE_ORIGINAL_READONLY,'YES');assert.equal(process.env.PW_ORIGINAL_SUITE_GROUP,'BULK_SAFE_14');
const report=path.join(root,'batch-233-live-access.json');
if(process.argv.includes('--init')){
 fs.writeFileSync(report,JSON.stringify({status:'AUTH_NOT_VERIFIED',pages,access:{},runnable:[],blocked:group.entries.flatMap(e=>e.ids)},null,2)+'\n');
 console.log('B233 access report initialized: all 500 originals remain unverified until real guarded login succeeds.');
 process.exit(0);
}
assert(process.argv.includes('--apply'),'Use --init or --apply');
const observed=JSON.parse(fs.readFileSync(report,'utf8'));
assert.equal(observed.status,'PROBED','Guarded page probe did not complete');
const access=observed.access;
assert.deepEqual(Object.keys(access).sort(),Object.keys(pages).sort());
assert(Object.values(access).every(v=>v==='ACCESS_CONFIRMED'||v==='ACCESS_UNVERIFIED'));
const allowed=group.entries.filter(e=>access[area(e)]==='ACCESS_CONFIRMED');
const blocked=group.entries.filter(e=>access[area(e)]!=='ACCESS_CONFIRMED').flatMap(e=>e.ids);
const runnable=allowed.flatMap(e=>e.ids);
assert.equal(runnable.length+blocked.length,500);
fs.writeFileSync(report, JSON.stringify({status:'PROBED',access,runnable,blocked},null,2)+'\n');
for(const id of blocked)console.log(`B233 ACCESS_UNVERIFIED ${id} (not executed, not PASS)`);
console.log(`B233: ${runnable.length} executable original tests; ${blocked.length} access-unverified.`);
assert(runnable.length>0,'No approved page passed live access preflight');
group.entries=allowed;fs.writeFileSync(target,JSON.stringify(manifest,null,2)+'\n');
