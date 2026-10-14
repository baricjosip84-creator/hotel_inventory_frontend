import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); }
catch { ts = require(path.join(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(), 'typescript')); }
const sourceFile = process.argv[2] || path.resolve('src/pages/RealTimeOperationsFeedPage.tsx');
const source = fs.readFileSync(sourceFile, 'utf8');
function slice(start, stop) {
  const from = source.indexOf(`function ${start}(`);
  const to = source.indexOf(`function ${stop}(`, from + 1);
  assert.ok(from !== -1 && to > from, `Source boundaries for ${start} to ${stop}`);
  return source.slice(from, to);
}
const extracted = slice('sourceSurfaceToAppPath', 'timelineItemTimestamp') +
  slice('timelineItemSearchText', 'buildLastSeenStorageKey') +
  slice('sourceItemLink', 'relatedActionLink');
const { outputText } = ts.transpileModule(extracted, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } });
const context = {
  URLSearchParams,
  itemTitle: (item) => item.title || '',
  itemSummary: (item) => item.summary || '',
  itemRecommendedNextStep: (item) => item.recommended_next_step || '',
  canonicalLabel: (value) => value || '',
};
vm.createContext(context);
vm.runInContext(outputText, context);
const { sourceSurfaceToAppPath: route, sourceItemLink: link, timelineItemSearchText: search } = context;
let checks = 0;
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks++; };
for (const validRoute of ['/products','/suppliers','/storage-locations','/stock','/stock-movements',
  '/purchase-orders','/audit','/collaboration','/cross-domain-optimization','/alerts','/reports','/execution-tasks']) {
  equal(route(validRoute), validRoute, `Known tenant route ${validRoute} resolves`);
}
equal(route('/products?productId=123'), '/products?productId=123', 'Existing safe item-selection query is retained');
equal(route('/purchase-orders?purchaseOrderId=PO-34'), '/purchase-orders?purchaseOrderId=PO-34', 'PO link query retained');
equal(route('/control-tower'), '/action-center', 'Legacy control tower maps to app page');
equal(route('/operational-action-center/summary?search=PO'), '/action-center?search=PO', 'Legacy URL carries filter');
for (const invalid of ['https://evil.example','//evil.example/stock','/admin','/unknown','/products\\evil',
  '/products#fake','/products\nstock','/products\rstock']) {
  equal(route(invalid), null, `Unsupported URL rejected ${invalid}`);
}
const event = { timeline_type:'event_stream_message', source_surface:'/products?productId=abc',
  source_reference:{source_id:'c9ecf-837',source_type:'product'},
  timeline_item_id:'tl_unique_012',correlation_id:'corr_unique_985',delivery_event_name:'receivedShipment',
  title:'Inventory change', summary:'Updated', event_type:'inventory_event' };
equal(link(event, (x) => x)?.to, '/products?productId=abc', 'Event item opens exact product path');
equal(link({...event,source_surface:'/stock'},(x)=>x)?.to, '/stock', 'Stock source is available');
equal(link({...event,source_surface:'https://evil.example'},(x)=>x), null, 'Untrusted external URL hidden');
for (const token of ['c9ecf-837','tl_unique_012','corr_unique_985','receivedShipment','product']) {
 assert.ok(search(event, (x)=>x).includes(token.toLowerCase()), `Technical identifier ${token} can be searched`);
 checks++;
}
const alert = { timeline_type:'action_center_item', timeline_domain:'alerts', source_reference:{source_id:'a-01'} };
equal(link(alert,(x)=>x)?.to, '/alerts?resolved=false&alert_id=a-01', 'Alert focus route unchanged');
console.log(`PASS ${checks}/${checks} executable Operations Feed navigation/search checks`);
