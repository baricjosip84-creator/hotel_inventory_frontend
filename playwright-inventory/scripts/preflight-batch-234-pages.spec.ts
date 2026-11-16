import fs from 'node:fs';
import { test } from '../support/liveOriginalSafeTest';
import { loginAsTenant } from '../support/tenantSession';
test('Batch 234 guarded page access probe',async({page})=>{
 const file='batch-234-live-access.json',initial=JSON.parse(fs.readFileSync(file,'utf8'));
 if(initial.status!=='AUTH_NOT_VERIFIED'||initial.blocked.length!==86)throw new Error('Batch 234 report not initialized');
 await loginAsTenant(page);const access:Record<string,string>={};
 for(const [key,marker] of Object.entries(initial.pages as Record<string,{heading:string;tabs?:string[]}>)){
  try{
   await page.goto('/'+key,{timeout:25_000});await page.getByRole('heading',{name:marker.heading,exact:true}).first().waitFor({state:'visible',timeout:12_000});
   const actual=new URL(page.url());if(actual.origin!=='https://hotel-inventory-frontend-mauve.vercel.app'||actual.pathname!=='/'+key)throw new Error('Unexpected route');
   if(marker.tabs){const tabs=page.getByRole('tablist',{name:'Inventory control work areas'});for(const name of marker.tabs)await tabs.getByRole('tab',{name,exact:true}).waitFor({state:'visible',timeout:5_000});}
   access[key]='ACCESS_CONFIRMED';
  }catch{access[key]='ACCESS_UNVERIFIED';}console.log(`B234 page /${key}: ${access[key]}`);
 }
 fs.writeFileSync(file,JSON.stringify({...initial,status:'PROBED',access},null,2)+'\n');
});
