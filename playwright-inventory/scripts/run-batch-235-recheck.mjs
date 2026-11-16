import {spawn} from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {startBroker} from './b235-session-broker.mjs';
import {phasePlan,exactPass} from './b235-r3-phase-plan.mjs';
assert.equal(process.env.PW_ORIGINAL_SUITE_GROUP,'BULK_SAFE_16');
assert.equal(process.env.PW_LIVE_ORIGINAL_READONLY,'YES');
assert.equal(process.env.PW_BASE_URL,'https://hotel-inventory-frontend-mauve.vercel.app');
const broker=await startBroker();
const env={...process.env,PW_B235_SESSION_SOCKET:broker.socketPath,PLAYWRIGHT_JSON_OUTPUT_FILE:'batch-235-results.json'};
const run=(args,output)=>new Promise((resolve,reject)=>{
 const fd=output?fs.openSync(output,'w'):null;
 const child=spawn(process.execPath,args,{env,stdio:['ignore',fd===null?'inherit':fd,'inherit']});
 child.once('error',reject);
 child.once('close',code=>{if(fd!==null)fs.closeSync(fd);resolve(code??1);});
});
const required=async(args,output)=>assert.equal(await run(args,output),0,'B235 required step failed: '+args[0]);
try{
 await required(['scripts/preflight-batch-235-pages.mjs','--init']);
 // The probe must not overwrite the original-test JSON result.
 await required(['node_modules/playwright/cli.js','test','--config=playwright.b235-preflight.config.ts','--reporter=list']);
 await required(['scripts/preflight-batch-235-pages.mjs','--apply']);
 await required(['node_modules/playwright/cli.js','test','--config=playwright.live-original.config.ts','--list'],'original-selected.txt');
 await required(['scripts/check-live-original-discovery.mjs']);
 const manifestPath='original-suite-approved.json',original=fs.readFileSync(manifestPath,'utf8');
 const manifest=JSON.parse(original),group=manifest.approved_groups.BULK_SAFE_16;
 const plan=JSON.parse(fs.readFileSync('batch-235-r3-review.json','utf8'));
 const phaseGroups=phasePlan(group.entries,plan.canary);
 let combined=null,failed=false,canaryPassed=false;
 try{
  for(let i=0;i<phaseGroups.length;i++){
   const entries=phaseGroups[i];if(!entries.length)continue;
   if(fs.existsSync('.b234-auth-stop')){failed=true;console.error('B235 circuit open: remaining phase unresolved');break;}
   if(i===1&&!canaryPassed){failed=true;console.error('B235 permission canaries not both passed: 76-case permission phase remains unresolved');continue;}
   group.entries=entries;fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
   await required(['node_modules/playwright/cli.js','test','--config=playwright.live-original.config.ts','--list'],'original-selected.txt');
   await required(['scripts/check-live-original-discovery.mjs']);
   const reportFile='batch-235-phase-'+(i+1)+'-results.json';
   env.PLAYWRIGHT_JSON_OUTPUT_FILE=reportFile;
   console.log('B235 phase '+(i+1)+': '+entries.flatMap(e=>e.ids).length+' eligible original IDs');
   const code=await run(['node_modules/playwright/cli.js','test','--config=playwright.live-original.config.ts','--workers=1','--reporter=list,json']);
   if(code!==0)failed=true;
   if(!fs.existsSync(reportFile)){failed=true;continue;}
   const report=JSON.parse(fs.readFileSync(reportFile,'utf8'));
   if(i===0){canaryPassed=code===0&&exactPass(report,plan.canary);if(!canaryPassed)failed=true;}
   if(!combined)combined={...report,suites:[]};
   combined.suites.push(...report.suites);
   fs.writeFileSync('batch-235-results.json',JSON.stringify(combined,null,2));
  }
 }finally{fs.writeFileSync(manifestPath,original);}
 process.exitCode=failed?1:0;
}finally{await broker.close();}
