const ORIGIN='https://hotel-inventory-frontend-mauve.vercel.app';
const TARGETS={'/execution-tasks':['heading','Operational task queue'],'/execution-requests':['heading','Controlled execution requests'],'/inventory-requisitions':['text','Internal stock requests'],'/inventory-capabilities':['heading','Advanced inventory workspace']};
export async function ensureB236Target(page,route,renew,stop){
 const mark=TARGETS[route];if(!mark)throw Error('Unreviewed B236 target');
 const state=()=>{const url=new URL(page.url());return url.origin===ORIGIN?url.pathname.replace(/\/$/,''):'foreign';};
 let terminal,renewed=false;
 const observe=response=>{
  const u=new URL(response.url());
  if((u.origin===ORIGIN||(u.protocol==='https:'&&/(?:^|\.)onrender\.com$/i.test(u.hostname)))&&response.status()===429){terminal='HTTP 429';stop(terminal);}
 };
 const guard=()=>{if(terminal)throw Error('B236 target access stopped: '+terminal);};
 page.on('response',observe);
 try{
  for(let attempt=0;attempt<2;attempt++){
   guard();
   try{
    const doc=await page.goto(route,{waitUntil:'domcontentloaded',timeout:25000});
    if([401,403,429].includes(doc?.status())){terminal='HTTP '+doc.status();stop(terminal);guard();}
    const locator=mark[0]==='heading'?page.getByRole('heading',{name:mark[1],exact:true}):page.getByText(mark[1],{exact:true});
    await locator.first().waitFor({state:'visible',timeout:20000});
    guard();if(state()!==route)throw Error('Unexpected protected B236 target route');return;
   }catch(error){
    guard();
    if(state()==='foreign'&&page.url()!=='about:blank')throw error;
    if(state()==='/login'&&!renewed&&attempt===0){renewed=true;await renew(page);guard();continue;}
    if(attempt===1)throw error;
   }
  }
 }finally{page.off('response',observe);}
}
