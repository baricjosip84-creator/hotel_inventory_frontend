import fs from 'node:fs';
import {test,restoreBulkTenantSession,type Page} from '../support/liveOriginalSafeTest';
import {selectEnglishUI} from '../support/tenantSession';
const origin='https://hotel-inventory-frontend-mauve.vercel.app';
const targets:Record<string,{kind:'heading'|'text',marker:string}>={
 '/scanner':{kind:'heading',marker:'Shipment QR Scanner'},
};
async function accessTarget(page:Page,route:string){
 const target=targets[route];if(!target)throw Error('Unreviewed B241-r2 target');
 if(process.env.PW_LIVE_ORIGINAL_READONLY!=='YES'||process.env.PW_ORIGINAL_SUITE_GROUP!=='BULK_SAFE_17'||process.env.PW_BASE_URL!==origin)throw Error('Unapproved B241-r2 target');
 let terminal=false;
 const observe=(response:{url():string;status():number})=>{const u=new URL(response.url());if((u.origin===origin||(u.protocol==='https:'&&/(?:^|\.)onrender\.com$/i.test(u.hostname)))&&response.status()===429){terminal=true;fs.writeFileSync('.b234-auth-stop','HTTP 429',{mode:0o600});}};
 const guard=()=>{if(terminal||fs.existsSync('.b234-auth-stop'))throw Error('B241-r2 authentication circuit open');};
 page.on('response',observe);
 try{
  guard();await selectEnglishUI(page);
  for(let attempt=0;attempt<2;attempt++){
   guard();await new Promise(resolve=>setTimeout(resolve,5000));guard();
   try{
    const doc=await page.goto(route,{waitUntil:'domcontentloaded',timeout:25000});
    if([401,403,429].includes(doc?.status()??0)){terminal=true;fs.writeFileSync('.b234-auth-stop','HTTP '+doc?.status(),{mode:0o600});guard();}
    const locator=target.kind==='heading'?page.getByRole('heading',{name:target.marker,exact:true}):page.getByText(target.marker,{exact:true});
    await locator.first().waitFor({state:'visible',timeout:20000});guard();
    const u=new URL(page.url());if(u.origin!==origin||u.pathname.replace(/\/$/,'')!==route)throw Error('Unexpected protected target');return;
   }catch(error){guard();const u=new URL(page.url());if(u.origin!==origin||attempt===1)throw error;if(u.pathname==='/login')await restoreBulkTenantSession(page);}
  }
 }finally{page.off('response',observe);}
}
test('Batch 241-r2 protected target access',async({page})=>{
 const file='batch-241-r2-live-access.json',r=JSON.parse(fs.readFileSync(file,'utf8'));
 if(r.status!=='AUTH_NOT_VERIFIED'||r.expectedCount!==1||r.blocked.length!==1)throw Error('B241-r2 access report not initialized');
 test.setTimeout(600_000);const access:Record<string,string>={};
 for(const [area,mark] of Object.entries(r.pages as Record<string,{route:string}>)){
  try{await accessTarget(page,mark.route);access[area]='ACCESS_CONFIRMED';}
  catch{access[area]='ACCESS_UNVERIFIED';}
  console.log('B241-r2 '+area+': '+access[area]);
 }
 fs.writeFileSync(file,JSON.stringify({...r,status:'PROBED',access},null,2));
});
