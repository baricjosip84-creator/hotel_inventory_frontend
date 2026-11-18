import fs from 'node:fs';
import {test,restoreBulkTenantSession,type Page} from '../support/liveOriginalSafeTest';
import {selectEnglishUI} from '../support/tenantSession';
const origin='https://hotel-inventory-frontend-mauve.vercel.app';
const targets:Record<string,{kind:'heading'|'text',marker:string}>={
 '/inventory-capabilities':{kind:'heading',marker:'Advanced inventory workspace'},
 '/intelligence-review':{kind:'heading',marker:'Intelligence Review'},
 '/inventory-requisitions':{kind:'text',marker:'Internal stock requests'},
 '/inventory-usage':{kind:'heading',marker:'Inventory usage ledger'},
 '/products':{kind:'heading',marker:'Product workspace'},
 '/sessions':{kind:'heading',marker:'Sessions'},
 '/shipments':{kind:'heading',marker:'Inbound shipments'},
 '/stock':{kind:'text',marker:'Stock workspace'},
};
async function accessTarget(page:Page,route:string){
 const target=targets[route];if(!target)throw Error('Unreviewed B245 target');
 if(process.env.PW_LIVE_ORIGINAL_READONLY!=='YES'||process.env.PW_ORIGINAL_SUITE_GROUP!=='BULK_SAFE_17'||process.env.PW_BASE_URL!==origin)throw Error('Unapproved B245 target');
 let terminal=false;
 const observe=(response:{url():string;status():number})=>{const u=new URL(response.url());if((u.origin===origin||(u.protocol==='https:'&&/(?:^|\.)onrender\.com$/i.test(u.hostname)))&&response.status()===429){terminal=true;fs.writeFileSync('.b234-auth-stop','HTTP 429',{mode:0o600});}};
 const guard=()=>{if(terminal||fs.existsSync('.b234-auth-stop'))throw Error('B245 authentication circuit open');};
 page.on('response',observe);
 try{
  guard();await selectEnglishUI(page);
  for(let attempt=0;attempt<2;attempt++){
   guard();await new Promise(resolve=>setTimeout(resolve,5000));guard();
   try{
    const doc=await page.goto(route,{waitUntil:'domcontentloaded',timeout:25000});
    if([401,429].includes(doc?.status()??0)){terminal=true;fs.writeFileSync('.b234-auth-stop','HTTP '+doc?.status(),{mode:0o600});guard();}
    if(doc?.status()===403)throw Error('Protected route denied');
    const locator=target.kind==='heading'?page.getByRole('heading',{name:target.marker,exact:true}):page.getByText(target.marker,{exact:true});
    await locator.first().waitFor({state:'visible',timeout:20000});guard();
    const u=new URL(page.url());if(u.origin!==origin||u.pathname.replace(/\/$/,'')!==route)throw Error('Unexpected protected target');return;
   }catch(error){guard();const u=new URL(page.url());if(u.origin!==origin||attempt===1)throw error;if(u.pathname==='/login')await restoreBulkTenantSession(page);}
  }
 }finally{page.off('response',observe);}
}
test('Batch 245 protected target access',async({page})=>{
 const file='batch-245-live-access.json',r=JSON.parse(fs.readFileSync(file,'utf8'));
 if(r.status!=='AUTH_NOT_VERIFIED'||r.expectedCount!==19||r.blocked.length!==19)throw Error('B245 access report not initialized');
 test.setTimeout(1_200_000);const access:Record<string,string>={};
 for(const [area,mark] of Object.entries(r.pages as Record<string,{route:string}>)){
  try{await accessTarget(page,mark.route);access[area]='ACCESS_CONFIRMED';}
  catch{access[area]='ACCESS_UNVERIFIED';}
  console.log('B245 '+area+': '+access[area]);
  if(area==='products'&&access[area]==='ACCESS_CONFIRMED'){
   for(const name of ['Cost & value','Cost review','Cost controls']){
    const tab=page.getByRole('tab',{name,exact:true});
    console.log('B245 products: '+name+' visible='+await tab.isVisible().catch(()=>false)+' enabled='+await tab.isEnabled({timeout:3000}).catch(()=>false));
   }
  }
 }
 fs.writeFileSync(file,JSON.stringify({...r,status:'PROBED',access},null,2));
});
