import {test,expect,type Page} from '../../../support/liveOriginalSafeTest';
import {loginAsTenant,fulfillJson} from '../../../support/tenantSession';

// Batch 18: Digital Twin source-backed read-only UI, not an operational simulator.
// GET /operational-action-center/digital-twin-operational-visualization-summary
// Backend requires BOTH operational_action_center.read and decision_intelligence.read.
// Synthetic GET fixtures check presentation, not backend graph, authorization or tenant isolation.
// Batch 185: positive-flow focus keys satisfy backend /^dt_[a-f0-9]{24}$/; GET remains intercepted.
const endpoint='**/operational-action-center/digital-twin-operational-visualization-summary?*';
const sampleNode={node_key:'dt_000000000000000000000001',node_id:'pw-id-1',node_type:'product',twin_domain:'inventory_flow',label:'Synthetic inventory item',status:'active',importance_score:91,observed_at:'2026-11-01T10:00:00Z',source_surface:'/products',source_record_path:'/products?product_id=pw-id-1'};
const sampleEdge={edge_key:'pw-edge-1',source_node_key:'dt_000000000000000000000001',target_node_key:'dt_000000000000000000000002',relationship:'depends_on',twin_domain:'inventory_flow',source_label:'Synthetic inventory item',target_label:'Synthetic supplier',status:'active',confidence_score:0.8};
const sampleOverlay={overlay_key:'pw-overlay-1',overlay_type:'inventory_risk',twin_domain:'inventory_flow',urgency:'critical',title:'Synthetic critical shortage',summary:'Source evidence requires review',priority_score:92,confidence_score:0.85,source_surface:'/alerts',source_record_path:'/alerts?alert_id=pw-alert-1',source_node_key:'dt_000000000000000000000001'};
const pageInfo={offset:0,limit:50,returned:1,total_matching:1,from:1,to:1,has_previous:false,has_more:false,total_is_capped:false};
function twinData(overrides:Record<string,unknown>={}){
 return {definition:{execution_mode:'read_only'},access:{can_view_diagnostics:false},filters:{limit:50,search:'',node_offset:0,edge_offset:0,overlay_offset:0},summary:{total_nodes:1,total_edges:1,total_overlays:1,total_matching_nodes:1,total_matching_edges:1,total_matching_overlays:1,critical_overlays:1},pagination:{nodes:pageInfo,edges:pageInfo,overlays:pageInfo},coverage:{may_have_more_source_records:false},guidance:{recommended_view_mode:'topology'},nodes:[sampleNode],edges:[sampleEdge],overlays:[sampleOverlay],non_mutation_guarantee:true,generated_at:'2026-11-03T10:00:00Z',...overrides};
}
async function openTwin(page:Page,data:Record<string,unknown>=twinData()){
 await loginAsTenant(page);await page.route(endpoint,route=>fulfillJson(route,data));await page.goto('/digital-twin');
 await expect(page.getByText('Review relationships, dependencies, risks, and operational pressure')).toBeVisible();
}
const twinFilters=(page:Page)=>page.locator('.digital-twin-filters');
const nodePanel=(page:Page)=>page.locator('.digital-twin-context-section[aria-labelledby="digital-twin-node-title"]');
const edgePanel=(page:Page)=>page.locator('.digital-twin-context-section[aria-labelledby="digital-twin-edge-title"]');
const overlays=(page:Page)=>page.locator('.digital-twin-overlay-section');

test.describe('Digital Twin — snapshot, filters, relationships, source links (Batch 18)',()=>{
 test('TDT-001 Overview says read-only and not a live simulation',async({page})=>{
  await openTwin(page);await expect(page.getByText('Read-only operational context')).toBeVisible();
  await expect(page.getByText('It is not a live simulation and does not change source records.',{exact:false})).toBeVisible();
 });
 test('TDT-002 Pending snapshot fetch shows loading context',async({page})=>{
  await loginAsTenant(page);let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
  await page.route(endpoint,async route=>{await gate;await fulfillJson(route,twinData());});
  await page.goto('/digital-twin');await expect(page.getByRole('heading',{name:'Loading operational context'})).toBeVisible();
  release();await expect(page.getByText('Review relationships, dependencies, risks, and operational pressure')).toBeVisible();
 });
 test('TDT-003 GET failure shows Retry and successful recovery',async({page})=>{
  await loginAsTenant(page);let ok=false;let reads=0;
  await page.route(endpoint,route=>{reads++;return fulfillJson(route,ok?twinData():{message:'Synthetic unavailable'},ok?200:503);});
  await page.goto('/digital-twin');await expect(page.getByRole('heading',{name:'Operational context could not be loaded'})).toBeVisible();
  ok=true;await page.getByRole('button',{name:'Retry'}).click();await expect(page.getByText('Review relationships, dependencies, risks, and operational pressure')).toBeVisible();expect(reads).toBeGreaterThanOrEqual(2);
 });
 test('TDT-004 Empty snapshot displays source-focused empty state',async({page})=>{
  await openTwin(page,twinData({nodes:[],edges:[],overlays:[],summary:{total_matching_nodes:0,total_matching_edges:0,total_matching_overlays:0,critical_overlays:0}}));
  await expect(page.getByRole('heading',{name:'No operational context matches the current filters'})).toBeVisible();
  await expect(page.locator('.digital-twin-node-card')).toHaveCount(0);
 });
 test('TDT-005 Refresh issues another GET without mutation',async({page})=>{
  await openTwin(page);let reads=0;let writes=0;await page.route(endpoint,route=>{if(route.request().method()==='GET')reads++;else writes++;return fulfillJson(route,twinData());});
  await page.getByRole('button',{name:'Refresh context'}).click();await expect.poll(()=>reads).toBeGreaterThanOrEqual(1);expect(writes).toBe(0);
 });
 test('TDT-006 Operational area filter sends twin_domain query',async({page})=>{
  await openTwin(page);let requestUrl='';await page.route(endpoint,route=>{requestUrl=route.request().url();return fulfillJson(route,twinData());});
  await twinFilters(page).getByLabel('Operational area').selectOption('supplier_flow');
  await expect.poll(()=>new URL(requestUrl).searchParams.get('twin_domain')).toBe('supplier_flow');
 });
 test('TDT-007 Review perspective sends view_mode and changes request',async({page})=>{
  await openTwin(page);let url='';await page.route(endpoint,route=>{url=route.request().url();return fulfillJson(route,twinData());});
  await twinFilters(page).getByLabel('Review perspective').selectOption('congestion_heatmap');
  await expect.poll(()=>new URL(url || 'https://invalid.example').searchParams.get('view_mode')).toBe('congestion_heatmap');
  await expect(twinFilters(page)).toContainText('does not generate a live diagram, simulation, or measured heatmap');
 });
 test('TDT-008 Overlay urgency filter sends critical value',async({page})=>{
  await openTwin(page);let url='';await page.route(endpoint,route=>{url=route.request().url();return fulfillJson(route,twinData());});
  await twinFilters(page).getByLabel('Overlay urgency').selectOption('critical');await expect.poll(()=>new URL(url || 'https://invalid.example').searchParams.get('urgency')).toBe('critical');
 });
 test('TDT-009 Result limit option 100 requests a bounded hundred per list',async({page})=>{
  await openTwin(page);let url='';await page.route(endpoint,route=>{url=route.request().url();return fulfillJson(route,twinData());});
  await twinFilters(page).getByLabel('Maximum records per list').selectOption('100');await expect.poll(()=>new URL(url || 'https://invalid.example').searchParams.get('limit')).toBe('100');
 });
 test('TDT-010 Search submit trims input and sends exact search query',async({page})=>{
  await openTwin(page);let url='';await page.route(endpoint,route=>{url=route.request().url();return fulfillJson(route,twinData());});
  await twinFilters(page).getByLabel('Search connected records').fill('   Synthetic supplier   ');await twinFilters(page).getByRole('button',{name:'Search',exact:true}).click();
  await expect.poll(()=>new URL(url || 'https://invalid.example').searchParams.get('search')).toBe('Synthetic supplier');
 });
 test('TDT-011 Clear search sends empty search filter and removes active label',async({page})=>{
  await openTwin(page);let url='';await page.route(endpoint,route=>{url=route.request().url();return fulfillJson(route,twinData());});
  await twinFilters(page).getByLabel('Search connected records').fill('shipment');await twinFilters(page).getByRole('button',{name:'Search',exact:true}).click();
  await expect(twinFilters(page).getByRole('button',{name:'Clear search'})).toBeVisible();
  await twinFilters(page).getByRole('button',{name:'Clear search'}).click();await expect.poll(()=>new URL(url || 'https://invalid.example').searchParams.get('search')).toBe('');
  await expect(twinFilters(page).getByLabel('Search connected records')).toHaveValue('');
 });
 test('TDT-012 Clear filters resets all selectors and local text',async({page})=>{
  await openTwin(page);await twinFilters(page).getByLabel('Operational area').selectOption('facility');
  await twinFilters(page).getByLabel('Overlay urgency').selectOption('high');await twinFilters(page).getByRole('button',{name:'Clear filters'}).click();
  await expect(twinFilters(page).getByLabel('Operational area')).toHaveValue('all');
  await expect(twinFilters(page).getByLabel('Overlay urgency')).toHaveValue('all');
  await expect(twinFilters(page).getByLabel('Maximum records per list')).toHaveValue('50');
 });
 test('TDT-013 Summary cards use matching totals, not returned-card counts',async({page})=>{
  await openTwin(page,twinData({summary:{total_matching_nodes:73,total_matching_edges:89,total_matching_overlays:45,critical_overlays:6}}));
  const s=page.getByLabel('Digital Twin summary');for(const total of ['73','89','45','6'])await expect(s).toContainText(total);
  await expect(page.locator('.digital-twin-node-card')).toHaveCount(1);
 });
 test('TDT-014 Bounded source coverage displays explicit scan warning',async({page})=>{
  await openTwin(page,twinData({coverage:{may_have_more_source_records:true},summary:{total_matching_nodes:80,total_matching_edges:20,total_matching_overlays:4,critical_overlays:2}}));
  await expect(page.locator('.digital-twin-coverage-warning')).toContainText('additional older matching records outside this snapshot');
  await expect(page.getByLabel('Digital Twin summary')).toContainText('At least 80');
 });
 test('TDT-015 Highest-priority review button requests its exact focus node',async({page})=>{
  await openTwin(page,twinData({review_first:{title:'Synthetic urgent review',summary:'Inspect connected risk',node_key:'dt_000000000000000000000001',urgency:'critical'}}));
  let url='';await page.route(endpoint,route=>{url=route.request().url();return fulfillJson(route,twinData({review_first:{title:'Synthetic urgent review',node_key:'dt_000000000000000000000001'},focus:{found:true,node_key:'dt_000000000000000000000001',label:'Synthetic inventory item',connected_count:1}}));});
  await page.locator('.digital-twin-review-first').getByRole('button',{name:'Review connected context'}).click();
  await expect.poll(()=>new URL(url || 'https://invalid.example').searchParams.get('focus_node_key')).toBe('dt_000000000000000000000001');
  await expect(page.locator('.digital-twin-focus-panel')).toContainText('Synthetic inventory item');
 });
 test('TDT-016 Topology point focus opens connections with exact node ID',async({page})=>{
  await openTwin(page);let url='';await page.route(endpoint,route=>{url=route.request().url();return fulfillJson(route,twinData({focus:{found:true,node_key:'dt_000000000000000000000001',label:'Synthetic inventory item',connected_count:1}}));});
  await nodePanel(page).getByRole('button',{name:'Show connections'}).click();
  await expect.poll(()=>new URL(url || 'https://invalid.example').searchParams.get('focus_node_key')).toBe('dt_000000000000000000000001');
  await expect(page.locator('.digital-twin-focus-panel')).toContainText('1 directly connected records found');
 });
 test('TDT-017 Dependency list shows source, affected record and confidence',async({page})=>{
  await openTwin(page);await expect(edgePanel(page)).toContainText('Synthetic inventory item → Synthetic supplier');
  await expect(edgePanel(page)).toContainText('80%');
  await expect(edgePanel(page).getByRole('button',{name:'Review source'})).toBeVisible();
 });
 test('TDT-018 Risk overlay links to exact permitted alert source',async({page})=>{
  await openTwin(page);await expect(overlays(page).getByRole('heading',{name:'Synthetic critical shortage'})).toBeVisible();
  await expect(overlays(page).getByRole('link',{name:'Open exact source record'})).toHaveAttribute('href','/alerts?alert_id=pw-alert-1');
 });
 test('TDT-019 Safety tab states no simulation, allocation or source mutation',async({page})=>{
  await openTwin(page);await page.getByRole('tab',{name:'Safety and limits'}).click();
  for(const name of ['Not a live simulation','No automatic operational change','Perspective changes emphasis','Source permissions still apply'])await expect(page.getByRole('heading',{name})).toBeVisible();
  await expect(page.locator('.digital-twin-node-card')).toHaveCount(0);
 });
 test('TDT-020 Next topology page changes only node_offset',async({page})=>{
  await openTwin(page,twinData({pagination:{nodes:{...pageInfo,total_matching:2,has_more:true,next_offset:50},edges:pageInfo,overlays:pageInfo}}));
  let url='';await page.route(endpoint,route=>{url=route.request().url();return fulfillJson(route,twinData());});
  await nodePanel(page).getByRole('button',{name:'Next'}).click();
  await expect.poll(()=>new URL(url || 'https://invalid.example').searchParams.get('node_offset')).toBe('50');
  const params=new URL(url || 'https://invalid.example').searchParams;expect(params.get('edge_offset')).toBe('0');expect(params.get('overlay_offset')).toBe('0');
 });
});

// Batch 19 continuation: source-specific boundary, route-gate and read-only checks.
// Synthetic fixtures prove UI behavior only; do not interpret them as backend authorization proofs.
import {loginAsDisposableRole} from '../../../support/roleSession';
const twinQuery=(url:string)=>new URL(url || 'https://invalid.example').searchParams;
const focusFor=(key:string,extra:Record<string,unknown>={})=>({found:true,node_key:key,label:'Synthetic inventory item',node_type:'product',twin_domain:'inventory_flow',status:'active',connected_count:1,...extra});

test.describe('Digital Twin — deeper boundary, permissions and focus behavior (Batch 19)',()=>{
 test('TDT-021 Previous topology page uses server previous_offset',async({page})=>{
  await loginAsTenant(page);let current='';
  await page.route(endpoint,route=>{const p=twinQuery(route.request().url());current=p.get('node_offset')||'';
   const second=current==='50';const node=second?{...sampleNode,node_key:'dt_000000000000000000000051',label:'Page two record'}:sampleNode;
   return fulfillJson(route,twinData({nodes:[node],pagination:{nodes:{...pageInfo,offset:second?50:0,total_matching:80,has_previous:second,previous_offset:second?0:null,has_more:!second,next_offset:second?null:50,from:second?51:1,to:second?51:1},edges:pageInfo,overlays:pageInfo}}));});
  await page.goto('/digital-twin');await nodePanel(page).getByRole('button',{name:'Next'}).click();await expect.poll(()=>current).toBe('50');
  await expect(nodePanel(page)).toContainText('Page two record');await nodePanel(page).getByRole('button',{name:'Previous'}).click();
  await expect.poll(()=>current).toBe('0');await expect(nodePanel(page)).toContainText('Synthetic inventory item');
 });
 test('TDT-022 Dependency next advances edge_offset independently',async({page})=>{
  await openTwin(page,twinData({pagination:{nodes:pageInfo,edges:{...pageInfo,total_matching:60,has_more:true,next_offset:50},overlays:pageInfo}}));
  let url='';await page.route(endpoint,route=>{url=route.request().url();return fulfillJson(route,twinData());});
  await edgePanel(page).getByRole('button',{name:'Next'}).click();await expect.poll(()=>twinQuery(url).get('edge_offset')).toBe('50');
  expect(twinQuery(url).get('node_offset')).toBe('0');expect(twinQuery(url).get('overlay_offset')).toBe('0');
 });
 test('TDT-023 Overlay next advances overlay_offset independently',async({page})=>{
  await openTwin(page,twinData({pagination:{nodes:pageInfo,edges:pageInfo,overlays:{...pageInfo,total_matching:60,has_more:true,next_offset:50}}}));
  let url='';await page.route(endpoint,route=>{url=route.request().url();return fulfillJson(route,twinData());});
  await overlays(page).getByRole('button',{name:'Next'}).click();await expect.poll(()=>twinQuery(url).get('overlay_offset')).toBe('50');
  expect(twinQuery(url).get('node_offset')).toBe('0');expect(twinQuery(url).get('edge_offset')).toBe('0');
 });
 test('TDT-024 Missing or negative server next_offset never yields a negative request',async({page})=>{
  await openTwin(page,twinData({pagination:{nodes:{...pageInfo,has_more:true,next_offset:-5},edges:pageInfo,overlays:pageInfo}}));
  let extra=0;await page.route(endpoint,route=>{extra++;return fulfillJson(route,twinData());});
  await nodePanel(page).getByRole('button',{name:'Next'}).click();expect(extra).toBe(0);
  await expect(nodePanel(page).getByRole('button',{name:'Next'})).toBeEnabled();
 });
 test('TDT-025 Changing filter resets three offsets and focused node',async({page})=>{
  await loginAsTenant(page);let last='';
  await page.route(endpoint,route=>{last=route.request().url();const p=twinQuery(last);return fulfillJson(route,twinData({focus:p.has('focus_node_key')?focusFor(p.get('focus_node_key')||''):null,pagination:{nodes:{...pageInfo,has_more:true,next_offset:50},edges:pageInfo,overlays:pageInfo}}));});
  await page.goto('/digital-twin');await nodePanel(page).getByRole('button',{name:'Next'}).click();await expect.poll(()=>twinQuery(last).get('node_offset')).toBe('50');
  await nodePanel(page).getByRole('button',{name:'Show connections'}).click();await expect.poll(()=>twinQuery(last).get('focus_node_key')).toBe('dt_000000000000000000000001');
  await twinFilters(page).getByLabel('Operational area').selectOption('supplier_flow');await expect.poll(()=>twinQuery(last).get('twin_domain')).toBe('supplier_flow');
  for(const k of ['node_offset','edge_offset','overlay_offset'])expect(twinQuery(last).get(k)).toBe('0');
  expect(twinQuery(last).has('focus_node_key')).toBe(false);await expect(page.locator('.digital-twin-focus-panel')).toHaveCount(0);
 });
 test('TDT-026 Missing topology node key disables Show connections',async({page})=>{
  await openTwin(page,twinData({nodes:[{node_id:'pw-no-focus',node_type:'product',label:'Synthetic keyless point',source_surface:'/products'}]}));
  await expect(nodePanel(page).getByRole('button',{name:'Show connections'})).toBeDisabled();
  await expect(nodePanel(page).getByRole('button',{name:'Review connected context for Synthetic keyless point'})).toBeVisible();
 });
 test('TDT-027 Unrecognized and external source paths provide no link',async({page})=>{
  await openTwin(page,twinData({nodes:[{...sampleNode,source_surface:'https://outside.example/secret',source_record_path:'https://outside.example/secret'}],overlays:[{...sampleOverlay,source_surface:'/not-a-page',source_record_path:'/not-a-page?id=1'}]}));
  await expect(nodePanel(page).getByRole('link')).toHaveCount(0);await expect(overlays(page).getByRole('link',{name:'Open exact source record'})).toHaveCount(0);
 });
 test('TDT-028 Legacy control-tower deep path falls back to canonical Action Center',async({page})=>{
  await openTwin(page,twinData({overlays:[{...sampleOverlay,source_surface:'/control-tower',source_record_path:'/control-tower?source_action_id=pw-1'}]}));
  await expect(overlays(page).getByRole('link',{name:'Open exact source record'})).toHaveAttribute('href','/action-center');
 });
 test('TDT-029 Lacking product read hides only product deep link',async({page})=>{
  await loginAsDisposableRole(page,'PW_DT_NO_PRODUCTS');await page.route(endpoint,route=>fulfillJson(route,twinData()));await page.goto('/digital-twin');
  await expect(nodePanel(page).getByRole('heading',{name:'Synthetic inventory item'})).toBeVisible();
  await expect(nodePanel(page).getByRole('link',{name:'Open Synthetic inventory item'})).toHaveCount(0);
  await expect(page.getByText('Review relationships, dependencies, risks, and operational pressure')).toBeVisible();
 });
 test('TDT-030 Legacy control-tower source resolves to Action Center without external navigation',async({page})=>{
  await openTwin(page,twinData({nodes:[{...sampleNode,source_surface:'/control-tower',source_record_path:null}]}));
  await expect(nodePanel(page).getByRole('link',{name:'Open Synthetic inventory item'})).toHaveAttribute('href','/action-center');
 });
 test('TDT-031 Overlay from Alerts includes separate Action Center shortcut',async({page})=>{
  await openTwin(page);await expect(overlays(page).getByRole('link',{name:'Open Action Center'})).toHaveAttribute('href','/action-center');
  await expect(overlays(page).getByRole('link',{name:'Open exact source record'})).toHaveAttribute('href','/alerts?alert_id=pw-alert-1');
 });
 test('TDT-032 Action Center overlay does not duplicate its Action Center shortcut',async({page})=>{
  await openTwin(page,twinData({overlays:[{...sampleOverlay,source_surface:'/action-center',source_record_path:'/action-center?source_action_id=pw-1'}]}));
  await expect(overlays(page).getByRole('link',{name:'Open Action Center'})).toHaveCount(0);
  await expect(overlays(page).getByRole('link',{name:'Open exact source record'})).toHaveAttribute('href','/action-center?source_action_id=pw-1');
 });
 test('TDT-033 Permitted product link retains exact ID while unrelated path is suppressed',async({page})=>{
  await openTwin(page,twinData({nodes:[{...sampleNode,source_record_path:'/products?product_id=pw-id-1'},{...sampleNode,node_key:'dt_000000000000000000000002',label:'Synthetic unauthorized area',source_surface:'/unknown',source_record_path:'/unknown?x=1'}]}));
  await expect(nodePanel(page).getByRole('link',{name:'Open Synthetic inventory item'})).toHaveAttribute('href','/products?product_id=pw-id-1');
  await expect(nodePanel(page).getByRole('link',{name:'Open Synthetic unauthorized area'})).toHaveCount(0);
 });
 test('TDT-034 Missing selected graph node gives an unavailable-state recovery',async({page})=>{
  await loginAsTenant(page);await page.route(endpoint,route=>fulfillJson(route,twinData({focus:{found:false,node_key:'dt_000000000000000000000001'}})));
  await page.goto('/digital-twin');await nodePanel(page).getByRole('button',{name:'Show connections'}).click();
  await expect(page.locator('.digital-twin-focus-panel')).toContainText('Selected topology point is no longer available');
  await expect(page.locator('.digital-twin-focus-panel').getByRole('button',{name:'Clear selection'})).toBeVisible();
 });
 test('TDT-035 Clearing focused record removes focus_node_key and hides panel',async({page})=>{
  await loginAsTenant(page);let latest='';await page.route(endpoint,route=>{latest=route.request().url();return fulfillJson(route,twinData({focus:focusFor('dt_000000000000000000000001')}));});
  await page.goto('/digital-twin');await nodePanel(page).getByRole('button',{name:'Show connections'}).click();await expect.poll(()=>twinQuery(latest).has('focus_node_key')).toBe(true);
  await page.locator('.digital-twin-focus-panel').getByRole('button',{name:'Clear selection'}).click();
  await expect.poll(()=>twinQuery(latest).has('focus_node_key')).toBe(false);await expect(page.locator('.digital-twin-focus-panel')).toHaveCount(0);
 });
 test('TDT-036 Selected focus panel is keyboard focus target',async({page})=>{
  await loginAsTenant(page);await page.route(endpoint,route=>fulfillJson(route,twinData({focus:focusFor('dt_000000000000000000000001')})));
  await page.goto('/digital-twin');await nodePanel(page).getByRole('button',{name:'Show connections'}).click();
  await expect(page.locator('.digital-twin-focus-panel')).toBeFocused();await expect(page.locator('.digital-twin-focus-panel')).toHaveAttribute('tabindex','-1');
 });
 test('TDT-037 Impact-chain source button focuses exact from_node_key',async({page})=>{
  await loginAsTenant(page);let latest='';await page.route(endpoint,route=>{latest=route.request().url();return fulfillJson(route,twinData({focus:focusFor(twinQuery(latest).get('focus_node_key')||'dt_000000000000000000000001',{impact_chain:[{from_node_key:'pw-from',from_label:'Source supplier',to_node_key:'pw-to',to_label:'Affected shipment',relationship:'depends_on'}]})}));});
  await page.goto('/digital-twin');await nodePanel(page).getByRole('button',{name:'Show connections'}).click();
  await page.locator('.digital-twin-impact-chain').getByRole('button',{name:'Source supplier'}).click();await expect.poll(()=>twinQuery(latest).get('focus_node_key')).toBe('pw-from');
 });
 test('TDT-038 Impact-chain target button focuses exact to_node_key',async({page})=>{
  await loginAsTenant(page);let latest='';await page.route(endpoint,route=>{latest=route.request().url();return fulfillJson(route,twinData({focus:focusFor(twinQuery(latest).get('focus_node_key')||'dt_000000000000000000000001',{impact_chain:[{from_node_key:'pw-from',from_label:'Source supplier',to_node_key:'pw-to',to_label:'Affected shipment',relationship:'depends_on'}]})}));});
  await page.goto('/digital-twin');await nodePanel(page).getByRole('button',{name:'Show connections'}).click();
  await page.locator('.digital-twin-impact-chain').getByRole('button',{name:'Affected shipment'}).click();await expect.poll(()=>twinQuery(latest).get('focus_node_key')).toBe('pw-to');
 });
 test('TDT-039 Empty impact chain explicitly avoids inventing extra dependencies',async({page})=>{
  await loginAsTenant(page);await page.route(endpoint,route=>fulfillJson(route,twinData({focus:focusFor('dt_000000000000000000000001',{impact_chain:[]})})));
  await page.goto('/digital-twin');await nodePanel(page).getByRole('button',{name:'Show connections'}).click();
  await expect(page.locator('.digital-twin-focus-panel')).toContainText('No further dependency chain is visible for this record');
  await expect(page.locator('.digital-twin-impact-step')).toHaveCount(0);
 });
 test('TDT-040 Unavailable node, edge and overlay scores display Not scored',async({page})=>{
  await openTwin(page,twinData({nodes:[{...sampleNode,importance_score:null}],edges:[{...sampleEdge,confidence_score:null}],overlays:[{...sampleOverlay,priority_score:null,confidence_score:null}]}));
  await expect(nodePanel(page)).toContainText('Not scored');await expect(edgePanel(page)).toContainText('Not scored');
  await expect(overlays(page).getByText('Not scored')).toHaveCount(2);
 });
 test('TDT-041 Invalid source timestamp remains visibly unparsed, not a fabricated date',async({page})=>{
  await openTwin(page,twinData({nodes:[{...sampleNode,observed_at:'not-a-time'}],overlays:[{...sampleOverlay,created_at:'not-a-time'}]}));
  await expect(nodePanel(page)).toContainText('not-a-time');await expect(overlays(page)).toContainText('not-a-time');
 });
 test('TDT-042 Data freshness grid displays only first eight supplied sources',async({page})=>{
  const sources=Array.from({length:12},(_,i)=>({source_surface:'/products',age_minutes:i+2,freshness_state:'current'}));
  await openTwin(page,twinData({freshness:{sources,stale_source_count:0,aging_source_count:0}}));
  await expect(page.locator('.digital-twin-freshness-item')).toHaveCount(8);await expect(page.locator('.digital-twin-freshness-item').last()).toContainText('9 min ago');
 });
 test('TDT-043 Stale and aging source totals show freshness review warning',async({page})=>{
  await openTwin(page,twinData({freshness:{stale_source_count:2,aging_source_count:1,sources:[{source_surface:'/alerts',age_minutes:400,freshness_state:'stale_review'}]}}));
  await expect(page.locator('.digital-twin-freshness')).toContainText('3 source areas need freshness review');
  await expect(page.locator('.digital-twin-freshness-item--stale_review')).toHaveCount(1);
 });
 test('TDT-044 Freshness labels distinguish just now, minutes, hours and days',async({page})=>{
  await openTwin(page,twinData({freshness:{stale_source_count:0,aging_source_count:0,sources:[
   {source_surface:'/products',age_minutes:1},{source_surface:'/suppliers',age_minutes:17},
   {source_surface:'/alerts',age_minutes:180},{source_surface:'/action-center',age_minutes:2880}]}}));
  const grid=page.locator('.digital-twin-freshness-grid');for(const text of ['Just updated','17 min ago','3 h ago','2 d ago'])await expect(grid).toContainText(text);
 });
 test('TDT-045 Recommended view uses server guidance when no explicit view_mode filter',async({page})=>{
  await openTwin(page,twinData({guidance:{recommended_view_mode:'dependency_map',visualization_guidance:'Synthetic governed context',perspective_guidance:'Synthetic dependency priority'}}));
  await expect(twinFilters(page)).toContainText('Dependency review');await expect(page.locator('.digital-twin-perspective-note')).toContainText('Synthetic dependency priority');
  await expect(twinFilters(page).getByLabel('Review perspective')).toHaveValue('all');
 });
 test('TDT-046 Safety tab preserves selected filter and node focus without POST',async({page})=>{
  await loginAsTenant(page);let writes=0;let latest='';await page.route(endpoint,route=>{latest=route.request().url();if(route.request().method()!=='GET')writes++;return fulfillJson(route,twinData({focus:focusFor('dt_000000000000000000000001')}));});
  await page.goto('/digital-twin');await twinFilters(page).getByLabel('Operational area').selectOption('inventory_flow');
  await nodePanel(page).getByRole('button',{name:'Show connections'}).click();await expect.poll(()=>twinQuery(latest).get('focus_node_key')).toBe('dt_000000000000000000000001');
  await page.getByRole('tab',{name:'Safety and limits'}).click();await expect(page.getByRole('heading',{name:'No automatic operational change'})).toBeVisible();
  await page.getByRole('tab',{name:'Operational context'}).click();await expect(twinFilters(page).getByLabel('Operational area')).toHaveValue('inventory_flow');
  await expect(page.locator('.digital-twin-focus-panel')).toBeVisible();expect(writes).toBe(0);
 });
 test('TDT-047 Context shortcuts point only to registered Action Center and Collaboration paths',async({page})=>{
  await openTwin(page);const shortcuts=page.locator('.digital-twin-shortcuts');await expect(shortcuts.getByRole('link')).toHaveCount(2);
  await expect(shortcuts.getByRole('link',{name:'Open Action Center'})).toHaveAttribute('href','/action-center');
  await expect(shortcuts.getByRole('link',{name:'Open Collaboration'})).toHaveAttribute('href','/collaboration');
 });
 test('TDT-048 Both read permissions are mandatory before Digital Twin GET',async({browser,baseURL})=>{
  for(const role of ['PW_DT_NO_INTELLIGENCE','PW_DT_NO_ACTION'] as const){
   const context=await browser.newContext({baseURL});const restrictedPage=await context.newPage();
   try {
    await loginAsDisposableRole(restrictedPage,role);let reads=0;
    await restrictedPage.route(endpoint,route=>{reads++;return fulfillJson(route,twinData());});
    await restrictedPage.goto('/digital-twin');await expect(restrictedPage).toHaveURL(/\/dashboard(?:[?#]|$)/);
    await expect(restrictedPage.getByRole('heading',{name:'Operations Dashboard'})).toBeVisible();expect(reads).toBe(0);
   } finally {await context.close();}
  }
 });
 test('TDT-049 Filters, focus and safety views do not issue operational POST/PATCH/DELETE',async({page})=>{
  await loginAsTenant(page);const writes:string[]=[];page.on('request',request=>{
   if(/\/(?:operational-action-center|decision-intelligence)\//.test(request.url()) && !['GET','HEAD','OPTIONS'].includes(request.method()))writes.push(`${request.method()} ${request.url()}`);
  });
  await page.route(endpoint,route=>fulfillJson(route,twinData({focus:focusFor('dt_000000000000000000000001')})));await page.goto('/digital-twin');
  await twinFilters(page).getByLabel('Overlay urgency').selectOption('high');await nodePanel(page).getByRole('button',{name:'Show connections'}).click();
  await expect(page.locator('.digital-twin-focus-panel')).toBeVisible();await page.getByRole('tab',{name:'Safety and limits'}).click();
  expect(writes).toEqual([]);
 });
 test('TDT-050 Known risk title and summary keys use supported text, unknown key uses fallback',async({page})=>{
  await openTwin(page,twinData({overlays:[{...sampleOverlay,title:'Raw risk title',title_key:'digital_twin_risk_type:stockout_risk',summary_key:'digital_twin_action_source_workflow_only'},
   {...sampleOverlay,overlay_key:'pw-overlay-2',title:'Custom source risk',title_key:'unknown_risk_key',summary:'Original risk explanation',summary_key:'unknown_description_key'}]}));
  await expect(overlays(page).getByRole('heading',{name:'Stockout risk'})).toBeVisible();
  await expect(overlays(page)).toContainText('Use the source workflow for every human action');
  await expect(overlays(page).getByRole('heading',{name:'Custom source risk'})).toBeVisible();
  await expect(overlays(page)).toContainText('Original risk explanation');
 });
});
