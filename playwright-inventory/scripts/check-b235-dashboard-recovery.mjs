import assert from 'node:assert/strict';
import {ensureB235Dashboard} from '../support/b235DashboardRecovery.mjs';
const origin='https://hotel-inventory-frontend-mauve.vercel.app';
function scenario(outcomes){
 let index=0,url='about:blank',current,listener,renewals=0;
 const stops=[];
 const page={
  url:()=>url,on:(event,fn)=>{listener=fn;},off:()=>{listener=null;},
  goto:async()=>{current=outcomes[index++];url=origin+(current.path??'/dashboard');if(current.refresh429)listener({url:()=>origin+'/api/auth/refresh',request:()=>({method:()=> 'POST'}),status:()=>429});return {status:()=>current.http??200};},
  getByRole:()=>({waitFor:async()=>{if(!current.visible)throw Error('heading missing');}})
 };
 return {run:()=>ensureB235Dashboard(page,async()=>{renewals++;url=origin+'/dashboard';current={visible:true};},reason=>stops.push(reason)),state:()=>({renewals,stops,gets:index,listener})};
}
let s=scenario([{visible:false},{visible:true}]);await s.run();assert.deepEqual(s.state(),{renewals:0,stops:[],gets:2,listener:null});
s=scenario([{visible:false,path:'/login'}]);await s.run();assert.equal(s.state().renewals,1);
s=scenario([{visible:false},{visible:false}]);await assert.rejects(s.run(),/heading missing/);assert.equal(s.state().renewals,0);
for(const status of [401,403,429]){
 s=scenario([{http:status,path:'/login'}]);await assert.rejects(s.run(),/authentication stopped/);assert.deepEqual(s.state().stops,['HTTP '+status]);assert.equal(s.state().renewals,0);
}
s=scenario([{path:'/login',refresh429:true}]);await assert.rejects(s.run(),/HTTP 429/);assert.equal(s.state().renewals,0);
console.log('PASS B235 dashboard recovery: bounded same-context GET retry, login redirect recovery, no renewal on render failure, hard stop on rejection/rate-limit.');
