import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import {createRequire,Module} from 'node:module';
import {startBroker} from './b235-session-broker.mjs';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const origin='https://hotel-inventory-frontend-mauve.vercel.app';
const saved=Object.fromEntries(['PW_LIVE_ORIGINAL_READONLY','PW_ORIGINAL_SUITE_GROUP','PW_BASE_URL'].map(k=>[k,process.env[k]]));
const state={cookies:[],origins:[{origin,localStorage:[{name:'inventory_access_token',value:'synthetic.'+Buffer.from(JSON.stringify({exp:Date.now()/1000+3600})).toString('base64url')+'.synthetic'}]}]};
try {
 process.env.PW_LIVE_ORIGINAL_READONLY='YES';process.env.PW_ORIGINAL_SUITE_GROUP='BULK_SAFE_16';process.env.PW_BASE_URL=origin;
 const filename='support/liveOriginalSafeTest.ts',source=fs.readFileSync(filename,'utf8');
 const out=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 let cached={snapshot:state,lastLoginAt:Date.now()},stopped=false,exchanges=0;
 const extension=new Module(filename);
 extension.require=id=>{
  if(id==='@playwright/test')return {test:{extend:f=>f},expect:()=>{}};
  if(id==='./environment')return {requireDisposableTenantCredentials:()=>({email:'fixture@example.invalid',password:'fake'})};
  if(id==='node:fs')return {existsSync:()=>stopped,readFileSync:()=>'',writeFileSync:()=>{}};
  if(id==='./b235SessionBroker')return {exchangeB235Session:async v=>{exchanges++;if(v!==undefined)cached=v;return cached;}};
  return require(id);
 };
 extension._compile(out,filename);
 const fixture=extension.exports.test.bulkSession[0];
 const noNewLoginBrowser={newContext:async()=>{throw Error('Unexpected additional login');}};
 for(let worker=0;worker<4;worker++){
  await fixture({browser:noNewLoginBrowser},async session=>assert.deepEqual(session.snapshot,state));
 }
 assert.equal(exchanges,8,'A replacement worker must reuse and republish the same proven snapshot');
 stopped=true;
 await assert.rejects(fixture({browser:noNewLoginBrowser},async()=>assert.fail('Circuit-open worker executed')),/circuit open/);
 stopped=false;
 console.log('PASS B235 synthetic auth fixture: four consecutive replacement workers reused the same JWT without new login; terminal circuit still prevents access.');
 // GitHub runners permit private Unix domain sockets. Run actual roundtrip
 // before credentials are exposed. Locally, restricted containers may deny
 // listen; never suppress a failed broker roundtrip on GitHub itself.
 if(process.env.GITHUB_ACTIONS==='true'){
  const broker=await startBroker();
  const request=(method,body)=>new Promise((resolve,reject)=>{
   const r=http.request({socketPath:broker.socketPath,path:'/session',method},res=>{
    let text='';res.on('data',d=>text+=d);res.on('end',()=>resolve([res.statusCode,JSON.parse(text)]));
   });r.on('error',reject);r.end(body===undefined?undefined:JSON.stringify(body));
  });
  try{
   assert.deepEqual(await request('GET'),[200,null]);
   assert.deepEqual(await request('PUT',{invalid:true}),[400,null]);
   assert.deepEqual(await request('PUT',cached),[200,null]);
   assert.deepEqual(await request('GET'),[200,cached]);
   assert.equal(fs.statSync(broker.socketPath).mode&0o777,0o600);
   console.log('PASS B235 private Unix socket: roundtrip, invalid request rejection and 0600 permissions.');
  }finally{await broker.close();}
  assert(!fs.existsSync(broker.socketPath),'Broker socket must be removed');
 }
}finally{for(const [key,value] of Object.entries(saved))if(value===undefined)delete process.env[key];else process.env[key]=value;}
