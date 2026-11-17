import fs from 'node:fs';
import {test} from '../support/liveOriginalSafeTest';
import {openB237Target} from '../support/b237TargetSession';
test('Batch 239 R2 protected target access',async({page})=>{
 const file='batch-239-r2-live-access.json',r=JSON.parse(fs.readFileSync(file,'utf8'));
 if(r.status!=='AUTH_NOT_VERIFIED'||r.expectedCount!==5||r.blocked.length!==5)throw Error('B239 R2 access report not initialized');
 test.setTimeout(600_000);const access:Record<string,string>={};
 for(const [area,mark] of Object.entries(r.pages as Record<string,{route:string}>)){
  try{await openB237Target(page,mark.route);access[area]='ACCESS_CONFIRMED';}
  catch{access[area]='ACCESS_UNVERIFIED';}
  console.log('B239 R2 '+area+': '+access[area]);
 }
 fs.writeFileSync(file,JSON.stringify({...r,status:'PROBED',access},null,2));
});
