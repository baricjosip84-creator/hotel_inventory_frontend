import {spawn} from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {startBroker} from './b235-session-broker.mjs';
assert.equal(process.env.PW_ORIGINAL_SUITE_GROUP,'BULK_SAFE_17');
assert.equal(process.env.PW_LIVE_ORIGINAL_READONLY,'YES');
assert.equal(process.env.PW_BASE_URL,'https://hotel-inventory-frontend-mauve.vercel.app');
const broker=await startBroker();
const env={...process.env,PW_B235_SESSION_SOCKET:broker.socketPath,PLAYWRIGHT_JSON_OUTPUT_FILE:'batch-237-results.json'};
const run=(args,output)=>new Promise((resolve,reject)=>{
 const fd=output?fs.openSync(output,'w'):null;
 const child=spawn(process.execPath,args,{env,stdio:['ignore',fd===null?'inherit':fd,'inherit']});
 child.once('error',reject);child.once('close',code=>{if(fd!==null)fs.closeSync(fd);resolve(code??1);});
});
const required=async(args,output)=>assert.equal(await run(args,output),0,'B237 required step failed: '+args[0]);
try{
 await required(['scripts/preflight-batch-237-pages.mjs','--init']);
 await required(['node_modules/playwright/cli.js','test','--config=playwright.b237-preflight.config.ts','--reporter=list']);
 await required(['scripts/preflight-batch-237-pages.mjs','--apply']);
 await required(['node_modules/playwright/cli.js','test','--config=playwright.live-original.config.ts','--list'],'original-selected.txt');
 await required(['scripts/check-live-original-discovery.mjs']);
 assert(!fs.existsSync('.b234-auth-stop'),'B237 authentication circuit open; remaining unverified');
 process.exitCode=await run(['node_modules/playwright/cli.js','test','--config=playwright.live-original.config.ts','--workers=1','--reporter=list,json','--timeout=150000']);
}finally{await broker.close();}
