import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ensureB235Target} from '../support/b235TargetRecovery.mjs';
const origin='https://hotel-inventory-frontend-mauve.vercel.app';
function scenario(route,outcomes){
 let index=0,url='about:blank',current,listener,renewals=0;
 const stops=[],gets=[];const names={'/permissions':'Tenant permission management','/users':'Tenant user management','/products':'Product workspace'};
 const page={url:()=>url,on:(event,fn)=>{listener=fn;},off:()=>{listener=null;},
  goto:async(path)=>{assert.equal(path,route);gets.push(path);current=outcomes[index++];url=current.foreign?'https://other.invalid/':origin+(current.path??route);if(current.rate)listener({url:()=>origin+'/api/permissions/me',status:()=>429});return {status:()=>current.http??200};},
  getByRole:(role,opts)=>{assert.equal(role,'heading');assert.deepEqual(opts,{name:names[route],exact:true});return {waitFor:async()=>{if(!current.visible)throw Error('heading missing');}};}
 };
 return {run:()=>ensureB235Target(page,route,async()=>{renewals++;url=origin+'/dashboard';},reason=>stops.push(reason)),state:()=>({renewals,stops,gets,listener})};
}
for(const route of ['/permissions','/users','/products']){
 let s=scenario(route,[{visible:false},{visible:true}]);await s.run();assert.deepEqual(s.state(),{renewals:0,stops:[],gets:[route,route],listener:null});
 s=scenario(route,[{visible:false,path:'/login'},{visible:true}]);await s.run();assert.equal(s.state().renewals,1);
 s=scenario(route,[{visible:false},{visible:false}]);await assert.rejects(s.run(),/heading missing/);assert.equal(s.state().renewals,0);
 s=scenario(route,[{visible:true,foreign:true}]);await assert.rejects(s.run(),/Unexpected protected/);assert.equal(s.state().gets.length,1);
 for(const http of [401,403,429]){s=scenario(route,[{http,path:'/login'}]);await assert.rejects(s.run(),/access stopped/);assert.deepEqual(s.state().stops,['HTTP '+http]);assert.equal(s.state().renewals,0);}
 s=scenario(route,[{visible:true,rate:true}]);await assert.rejects(s.run(),/HTTP 429/);assert.equal(s.state().gets.length,1);
}
await assert.rejects(ensureB235Target({},'/not-reviewed',()=>{},()=>{}),/Unreviewed/);
const group=JSON.parse(fs.readFileSync('original-suite-approved.json')).approved_groups.BULK_SAFE_16;
const ids=group.entries.flatMap(x=>x.ids).sort(),plan=JSON.parse(fs.readFileSync('batch-235-r4-review.json'));
assert.deepEqual(ids,[...plan.recheck].sort());assert.equal(ids.length,9);
console.log('PASS B235 R4: direct genuine protected route checks, missing heading, foreign redirect, renewal only on login, terminal rejection and 429; exact 9 selection.');
