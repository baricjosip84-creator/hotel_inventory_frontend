import fs from 'node:fs';
import {test} from '../support/liveOriginalSafeTest';
import {openB236Target} from '../support/b236TargetSession';
test('Batch 236 guarded tenant page access',async({page})=>{
 const file='batch-236-live-access.json',report=JSON.parse(fs.readFileSync(file,'utf8'));
 if(report.status!=='AUTH_NOT_VERIFIED'||report.expectedCount!==64||report.blocked.length!==report.expectedCount)throw Error('B236 R2 access report not initialized');
 test.setTimeout(360_000);
 const access:Record<string,string>={};
 for(const [area,mark] of Object.entries(report.pages as Record<string,{route:string;heading?:string;text?:string}>)){
  try{
   await openB236Target(page,mark.route);
   access[area]='ACCESS_CONFIRMED';
  }catch{access[area]='ACCESS_UNVERIFIED';}
  console.log('B236 '+area+': '+access[area]);
 }
 fs.writeFileSync(file,JSON.stringify({...report,status:'PROBED',access},null,2));
});
