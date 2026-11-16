const ORIGIN='https://hotel-inventory-frontend-mauve.vercel.app';
export async function ensureB235Dashboard(page,renew,stop){
 const state=()=>{const url=new URL(page.url());return url.origin===ORIGIN?url.pathname.replace(/\/$/,''):'foreign';};
 let terminal;
 const observe=response=>{
  const u=new URL(response.url());
  if(response.request().method()==='POST'&&(u.origin===ORIGIN||(u.protocol==='https:'&&/(?:^|\.)onrender\.com$/i.test(u.hostname)))&&/^\/(?:api\/)?auth\/(?:login|refresh)$/.test(u.pathname)&&response.status()===429){
   terminal='HTTP 429';stop(terminal);
  }
 };
 const guard=()=>{if(terminal)throw Error('B235 authentication stopped: '+terminal);};
 const ready=async()=>{
  await page.getByRole('heading',{name:'Operations Dashboard'}).waitFor({state:'visible',timeout:12000});
  guard();if(state()!=='/dashboard')throw Error('Unexpected protected dashboard route');
 };
 page.on('response',observe);
 try{
  for(let attempt=0;attempt<2;attempt++){
   guard();
   try{
    const doc=await page.goto('/dashboard',{waitUntil:'domcontentloaded',timeout:15000});
    if([401,403,429].includes(doc?.status())){terminal='HTTP '+doc.status();stop(terminal);guard();}
    await ready();return;
   }catch(error){
    guard();
    if(state()==='/login'){
     await renew(page);await ready();return;
    }
    if(state()==='foreign'&&page.url()!=='about:blank')throw error;
    if(attempt===1)throw error;
   }
  }
 }finally{page.off('response',observe);}
}
