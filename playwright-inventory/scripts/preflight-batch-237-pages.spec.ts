import fs from 'node:fs';
import {test} from '../support/liveOriginalSafeTest';
import {openB237Target} from '../support/b237TargetSession';
test('Batch 237 guarded tenant page access',async({page})=>{
 const file='batch-237-live-access.json',report=JSON.parse(fs.readFileSync(file,'utf8'));
 if(report.status!=='AUTH_NOT_VERIFIED'||report.expectedCount!==95||report.blocked.length!==report.expectedCount)throw Error('B237 access report not initialized');
 test.setTimeout(1_200_000);
 const access:Record<string,string>={};
 for(const [area,mark] of Object.entries(report.pages as Record<string,{route:string;heading?:string;text?:string}>)){
  try{
   await openB237Target(page,mark.route);
   access[area]='ACCESS_CONFIRMED';
  }catch{access[area]='ACCESS_UNVERIFIED';}
  console.log('B237 '+area+': '+access[area]);
 }
 fs.writeFileSync(file,JSON.stringify({...report,status:'PROBED',access},null,2));
});
