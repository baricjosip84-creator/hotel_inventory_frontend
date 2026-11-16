const ORIGIN='https://hotel-inventory-frontend-mauve.vercel.app';
const TARGETS={'/permissions':'Tenant permission management','/users':'Tenant user management','/products':'Product workspace'};
export async function ensureB235Target(page,route,renew,stop){
 const heading=TARGETS[route];if(!heading)throw Error('Unreviewed B235 target');
 const state=()=>{const url=new URL(page.url());return url.origin===ORIGIN?url.pathname.replace(/\/$/,''):'foreign';};
 let terminal,renewed=false;
 const observe=response=>{
  const u=new URL(response.url());
  if((u.origin===ORIGIN||(u.protocol==='https:'&&/(?:^|\.)onrender\.com$/i.test(u.hostname)))&&response.status()===429){terminal='HTTP 429';stop(terminal);}
 };
 const guard=()=>{if(terminal)throw Error('B235 target access stopped: '+terminal);};
 page.on('response',observe);
 try{
  for(let attempt=0;attempt<2;attempt++){
   guard();
   try{
    const doc=await page.goto(route,{waitUntil:'domcontentloaded',timeout:25000});
    if([401,403,429].includes(doc?.status())){terminal='HTTP '+doc.status();stop(terminal);guard();}
    await page.getByRole('heading',{name:heading,exact:true}).waitFor({state:'visible',timeout:20000});
    guard();if(state()!==route)throw Error('Unexpected protected B235 target route');return;
   }catch(error){
    guard();
    if(state()==='foreign'&&page.url()!=='about:blank')throw error;
    if(state()==='/login'&&!renewed&&attempt===0){renewed=true;await renew(page);guard();continue;}
    if(attempt===1)throw error;
   }
  }
 }finally{page.off('response',observe);}
}
