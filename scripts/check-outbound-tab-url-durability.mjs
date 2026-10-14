import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(import.meta.dirname, '..');
const page = fs.readFileSync(path.join(root,'src/pages/OutboundPage.tsx'),'utf8');
const helper = fs.readFileSync(path.join(root,'src/lib/outboundRouteState.ts'),'utf8');
const workflow = fs.readFileSync(path.join(root,'.github/workflows/frontend-validation.yml'),'utf8');
let checks=0;
function check(ok, description) {assert.ok(ok,description);checks++;}
function eq(actual,expected,label){assert.deepEqual(actual,expected,label);checks++;}
for(const [filename,code,kind] of [['OutboundPage.tsx',page,ts.ScriptKind.TSX],['outboundRouteState.ts',helper,ts.ScriptKind.TS]]) {
 const syntax=ts.createSourceFile(filename,code,ts.ScriptTarget.Latest,true,kind).parseDiagnostics;
 eq(syntax.length,0,`${filename} parses cleanly`);
}
const js=ts.transpileModule(helper,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const module={exports:{}};
vm.runInNewContext(`(function(module,exports){${js}\n})(module,module.exports)`,{module,URLSearchParams}, {timeout:1500});
const { readOutboundRouteTab:read, updateOutboundRouteTab:update, OUTBOUND_ROUTE_TABS:tabs }=module.exports;
eq([...tabs],['orders','customers','returns','trace'],'all tabs supported');
const all={customers:true,returns:true}, none={customers:false,returns:false};
for(const tab of tabs){
 const params=new URLSearchParams(tab==='orders'?'':'tab='+tab);
 eq(read(params,all),tab,`${tab} initial or refreshed link`);
 const next=update(new URLSearchParams('utm_source=internal&shipmentId=kept'),tab);
 eq(read(next,all),tab,`${tab} navigates via URL`);
 eq(next.get('utm_source'),'internal',`${tab} retains attribution`);
 eq(next.get('shipmentId'),'kept',`${tab} preserves unrelated selection`);
 eq(read(new URLSearchParams(next.toString()),all),tab,`${tab} survives reload`);
}
for(const tab of ['customers','returns']){
 eq(read(new URLSearchParams('tab='+tab),none),'orders',`${tab} denied without permission`);
 eq(read(new URLSearchParams('tab='+tab),all),tab,`${tab} permitted`);
}
eq(read(new URLSearchParams('tab=other'),all),'orders','unknown tab safe fallback');
eq(read(new URLSearchParams('tab=__proto__'),all),'orders','prototype name ignored');
eq(read(new URLSearchParams(),all),'orders','legacy bookmarks still open Orders');
const original = new URLSearchParams('tab=customers&utm_medium=app&orderId=123');
const back=update(original,'returns');
eq(original.get('tab'),'customers','navigation does not mutate original URL');
eq(back.get('tab'),'returns','new selected tab URL');
eq(read(original,all),'customers','browser Back reads previous selection');
eq(read(back,all),'returns','browser Forward reads next selection');
eq(update(back,'orders').has('tab'),false,'default Orders keeps canonical URL');
eq(read(new URLSearchParams('tab=trace'),none),'trace','read-only trace remains accessible');
check(page.includes('useSearchParams()'),'component subscribes to live URL changes');
check(page.includes('readOutboundRouteTab(searchParams'),'render derives tab from URL, not stale state');
check(page.includes('updateOutboundRouteTab(searchParams, tab)'),'tab controls write URL');
check(page.includes('preventScrollReset: true'),'tab switching preserves scroll context');
check(!page.includes("useState<OutboundTab>('orders')"),'no stale ephemeral active-tab state');
check(!page.includes('setActiveTab('),'no disconnected local tab setter');
check(page.includes("enabled: activeTab === 'returns' && canReturnRead"),'return queries retain permission gate');
check(page.includes("enabled: activeTab === 'customers' && canCustomerRead"),'customer queries retain permission gate');
check(page.includes('onClick={() => setTab(\'trace\')}'),'trace control still functional');
check(page.includes('onClick={() => setTab(\'orders\')}'),'orders control still functional');
check(workflow.includes('npm run check:outbound-tab-url-durability'),'CI executes regression');
console.log(`Outbound tab URL/history durability: ${checks}/${checks} passed`);
