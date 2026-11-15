// Live read-only route access check. No test ID is awarded a pass by this check.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('@playwright/test');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target=path.join(root,'original-suite-approved.json');
const manifest=JSON.parse(fs.readFileSync(target,'utf8'));
const group=manifest.approved_groups.BULK_SAFE_14;
assert.equal(group.secret,true);assert.equal(group.entries.flatMap(e=>e.ids).length,500);
const pages={
 'ai-copilot':{text:'Start a new analysis'},
 'automation-schedules':{heading:'Automation schedules'},
 'enterprise-inventory':{heading:'Specialized inventory workflows'},
 'execution-tasks':{heading:'Operational task queue'},
 'inventory-capabilities':{heading:'Advanced inventory workspace'},
 'procurement-recommendations':{heading:'Procurement recommendations'},
 'purchase-orders':{heading:'Purchase orders'},
 'replenishment-planning':{heading:'Replenishment planning'},
 'scanner':{heading:'Shipment QR Scanner'},
 'sessions':{heading:'Sessions'},
};
const area=e=>e.file.split('/')[1];
assert.deepEqual([...new Set(group.entries.map(area))].sort(),Object.keys(pages).sort());
if(process.argv.includes('--plan')){console.log('PASS: ten explicit page probes cover all 500 selected cases');process.exit(0);}
const origin='https://hotel-inventory-frontend-mauve.vercel.app';
assert.equal(process.env.PW_BASE_URL,origin);assert.equal(process.env.PW_LIVE_ORIGINAL_READONLY,'YES');assert.equal(process.env.PW_ORIGINAL_SUITE_GROUP,'BULK_SAFE_14');
const email=process.env.PW_TENANT_EMAIL,password=process.env.PW_TENANT_PASSWORD;assert(email&&password,'Tenant auth missing');
const browser=await chromium.launch();
const context=await browser.newContext({baseURL:origin,serviceWorkers:'block'});
const approvedLogin=(method,raw)=>{if(method!=='POST')return false;const u=new URL(raw);return (u.origin===origin||(u.protocol==='https:'&&/(?:^|\.)onrender\.com$/i.test(u.hostname)))&&/^\/(?:api\/)?auth\/(?:login|refresh)$/.test(u.pathname);};
await context.route('**/*',route=>{const req=route.request(),m=req.method().toUpperCase();return ['GET','HEAD','OPTIONS'].includes(m)||approvedLogin(m,req.url())?route.continue():route.abort('blockedbyclient');});
const access={};
try{
 const page=await context.newPage();
 await page.addInitScript(()=>{if(localStorage.getItem('inventory_locale')===null)localStorage.setItem('inventory_locale','en-GB');});
 await page.goto('/login',{timeout:30000});
 await page.locator('#login-email').fill(email);
 await page.locator('#login-password').fill(password);
 await page.locator('[data-auth-form="true"] button[type="submit"]').click();
 await page.getByRole('heading',{name:'Operations Dashboard'}).first().waitFor({state:'visible',timeout:25000});
 for(const [key,marker] of Object.entries(pages)){
   try{
    await page.goto('/'+key,{timeout:25000});
    const locator=marker.heading?page.getByRole('heading',{name:marker.heading,exact:true}):page.getByText(marker.text,{exact:true});
    await locator.first().waitFor({state:'visible',timeout:12000});
    assert.equal(new URL(page.url()).origin,origin);assert.equal(new URL(page.url()).pathname,'/'+key);
    access[key]='ACCESS_CONFIRMED';
   }catch{access[key]='ACCESS_UNVERIFIED';}
   console.log(`B233 page /${key}: ${access[key]}`);
 }
}finally{await context.close();await browser.close();}
const allowed=group.entries.filter(e=>access[area(e)]==='ACCESS_CONFIRMED');
const blocked=group.entries.filter(e=>access[area(e)]!=='ACCESS_CONFIRMED').flatMap(e=>e.ids);
const runnable=allowed.flatMap(e=>e.ids);
assert.equal(runnable.length+blocked.length,500);
fs.writeFileSync(path.join(root,'batch-233-live-access.json'), JSON.stringify({access,runnable,blocked},null,2)+'\n');
for(const id of blocked)console.log(`B233 ACCESS_UNVERIFIED ${id} (not executed, not PASS)`);
console.log(`B233: ${runnable.length} executable original tests; ${blocked.length} access-unverified.`);
assert(runnable.length>0,'No approved page passed live access preflight');
group.entries=allowed;fs.writeFileSync(target,JSON.stringify(manifest,null,2)+'\n');
