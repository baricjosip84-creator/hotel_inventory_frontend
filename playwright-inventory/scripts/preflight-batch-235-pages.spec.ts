import fs from 'node:fs';
import {test} from '../support/liveOriginalSafeTest';
import {loginAsTenant} from '../support/tenantSession';
test('Batch 235 guarded tenant page access',async({page})=>{
 const file='batch-235-live-access.json',report=JSON.parse(fs.readFileSync(file,'utf8'));
 if(report.status!=='AUTH_NOT_VERIFIED'||report.blocked.length!==162)throw Error('B235 access report not initialized');
 await loginAsTenant(page);
 const access:Record<string,string>={};
 for(const [area,mark] of Object.entries(report.pages as Record<string,{route:string;heading?:string;text?:string}>)){
  try{
   await page.goto(mark.route,{timeout:25000});
   const loc=mark.heading?page.getByRole('heading',{name:mark.heading,exact:true}):page.getByText(mark.text!,{exact:true});
   await loc.first().waitFor({state:'visible',timeout:12000});
   const url=new URL(page.url());
   if(url.origin!=='https://hotel-inventory-frontend-mauve.vercel.app'||url.pathname!==mark.route)throw Error('Unexpected route');
   access[area]='ACCESS_CONFIRMED';
  }catch{access[area]='ACCESS_UNVERIFIED';}
  console.log('B235 '+area+': '+access[area]);
 }
 fs.writeFileSync(file,JSON.stringify({...report,status:'PROBED',access},null,2));
});
