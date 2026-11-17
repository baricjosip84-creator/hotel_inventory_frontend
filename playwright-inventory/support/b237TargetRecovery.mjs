const ORIGIN='https://hotel-inventory-frontend-mauve.vercel.app';
const TARGETS={"/alerts": ["heading", "Alert workspace"], "/ai-copilot": ["text", "Start a new analysis"], "/automation-schedules": ["heading", "Automation schedules"], "/digital-twin": ["heading", "Review relationships, dependencies, risks, and operational pressure"], "/enterprise-inventory": ["heading", "Specialized inventory workflows"], "/insights": ["heading", "Insights workspace"], "/inventory-usage": ["heading", "Inventory usage ledger"], "/mobile-execution": ["heading", "Mobile Execution"], "/procurement-recommendations": ["heading", "Procurement recommendations"], "/purchase-orders": ["heading", "Purchase orders"], "/reliability-command": ["heading", "Review current pressure, safety checks, and the manual follow-up path"], "/replenishment-planning": ["heading", "Replenishment planning"], "/reports": ["heading", "Management reporting workspace"], "/scanner": ["heading", "Shipment QR Scanner"], "/sessions": ["heading", "Sessions"], "/shipments": ["heading", "Inbound shipments"], "/stock-movements": ["heading", "Stock movement ledger"], "/stock-transfers": ["heading", "Stock transfer workspace"], "/stock": ["heading", "Stock workspace"], "/storage-locations": ["heading", "Storage location workspace"], "/users": ["heading", "Tenant user management"]};
export async function ensureB237Target(page,route,renew,stop){
 const mark=TARGETS[route];if(!mark)throw Error('Unreviewed B237 target');
 const state=()=>{const url=new URL(page.url());return url.origin===ORIGIN?url.pathname.replace(/\/$/,''):'foreign';};
 let terminal,renewed=false;
 const observe=response=>{
  const u=new URL(response.url());
  if((u.origin===ORIGIN||(u.protocol==='https:'&&/(?:^|\.)onrender\.com$/i.test(u.hostname)))&&response.status()===429){terminal='HTTP 429';stop(terminal);}
 };
 const guard=()=>{if(terminal)throw Error('B237 target access stopped: '+terminal);};
 page.on('response',observe);
 try{
  for(let attempt=0;attempt<2;attempt++){
   guard();
   try{
    const doc=await page.goto(route,{waitUntil:'domcontentloaded',timeout:25000});
    if([401,403,429].includes(doc?.status())){terminal='HTTP '+doc.status();stop(terminal);guard();}
    const locator=mark[0]==='heading'?page.getByRole('heading',{name:mark[1],exact:true}):page.getByText(mark[1],{exact:true});
    await locator.first().waitFor({state:'visible',timeout:20000});
    guard();if(state()!==route)throw Error('Unexpected protected B237 target route');return;
   }catch(error){
    guard();
    if(state()==='foreign'&&page.url()!=='about:blank')throw error;
    if(state()==='/login'&&!renewed&&attempt===0){renewed=true;await renew(page);guard();continue;}
    if(attempt===1)throw error;
   }
  }
 }finally{page.off('response',observe);}
}
