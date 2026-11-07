import {test,expect,type Page,type Route} from '../../../support/liveOriginalSafeTest';
import {readFile} from 'node:fs/promises';
import {loginAsDisposableRole} from '../../../support/roleSession';
import {loginAsTenant,fulfillJson} from '../../../support/tenantSession';
// Batch 25: StockMovementsPage.tsx /stock-movements and GET /stock/movements.
// The audit ledger is read-only. Interception is limited to GETs and cannot establish persistence.
type MovementRequest={path:string;url:string;method:string};
type MovementRole='PW_SMV_LINKS_GRANTED'|'PW_SMV_NO_SHIPMENTS'|'PW_SMV_NO_TRANSFERS';
type MovementSetup={rows?:any[];summary?:Record<string,unknown>;optionsError?:boolean;summaryError?:boolean;listError?:boolean;exportError?:boolean;rowsForRequest?:(uri:URL)=>any[];role?:MovementRole};
const auditRow={id:'pw-movement-1',product_id:'pw-product',product_name:'Synthetic Product',product_unit:'pcs',storage_location_id:'pw-location',storage_location_name:'Warehouse',movement_type:'receipt',change:5,reason:'receiving',user_name:'Auditor',created_at:'2026-10-28T10:00:00Z',shipment_id:'pw-shipment',shipment_po_number:'PO-PW-1',unit_cost:2,total_cost:10,cost_currency:'EUR',cost_source:'purchase_order',package_id:'pw-package',package_name:'Sealed carton',package_barcode:'PK-PW-1',package_count_received:1,units_per_package:5};
const auditOptions={products:[{id:'pw-product',name:'Synthetic Product'}],shipments:[{id:'pw-shipment',po_number:'PO-PW-1'}],storage_locations:[{id:'pw-location',name:'Warehouse'}],movement_types:['receipt','adjustment'],cost_sources:['purchase_order']};
async function openMovementLedger(page:Page,setup:MovementSetup={},url='/stock-movements'){
 if(setup.role)await loginAsDisposableRole(page,setup.role);else await loginAsTenant(page);const seen:MovementRequest[]=[];
 await page.route('**/stock/movements**',async(route:Route)=>{
  const req=route.request();
  if(req.isNavigationRequest())return route.continue();
  const uri=new URL(req.url()),path=uri.pathname;
  seen.push({path,url:uri.toString(),method:req.method()});
  if(req.method()!=='GET')throw Error(`Unexpected write from read-only movement ledger: ${req.method()}`);
  if(path.endsWith('/filter-options'))return fulfillJson(route,setup.optionsError?{message:'Filter options unavailable'}:auditOptions,setup.optionsError?503:200);
  if(path.endsWith('/summary'))return fulfillJson(route,setup.summaryError?{message:'Summary unavailable'}:setup.summary??{total_rows:0,inbound_rows:0,outbound_rows:0,no_change_rows:0,package_audited_rows:0,costed_rows:0,received_cost_by_currency:[]},setup.summaryError?503:200);
  if(path.endsWith('/stock/movements')){const failed=setup.listError || (setup.exportError && uri.searchParams.get('limit')==='500');return fulfillJson(route,failed?{message:'Movement queue unavailable'}:setup.rowsForRequest?.(uri)??setup.rows??[],failed?503:200);}
  return fulfillJson(route,{message:'Unknown movement endpoint'},404);
 });
 await page.goto(url);await expect(page.getByText('Stock movement ledger',{exact:true})).toBeVisible();
 return seen;
}
const movementGET=(seen:MovementRequest[])=>seen.filter(r=>r.path.endsWith('/stock/movements'));
const requested=(seen:MovementRequest[],k:string,v:string)=>movementGET(seen).some(r=>new URL(r.url).searchParams.get(k)===v);
const filters=(p:Page)=>p.getByRole('heading',{name:'Filters'}).locator('xpath=ancestor::section[1]');

test.describe('Stock Movements — read-only ledger, query links and filters (Batch 25)',()=>{
 test('TSMV-001 Ledger announces stock audit and read-only scope',async({page})=>{
  await openMovementLedger(page);await expect(page.getByText('Stock audit',{exact:true})).toBeVisible();
  await expect(page.getByText('This ledger is read-only.',{exact:false})).toBeVisible();
 });
 test('TSMV-002 Ledger loads options, summary, and paged movements from separate GET endpoints',async({page})=>{
  const seen=await openMovementLedger(page);
  for(const end of ['/filter-options','/summary','/stock/movements'])await expect.poll(()=>seen.some(r=>r.path.endsWith(end))).toBe(true);
  expect(seen.every(r=>r.method==='GET')).toBe(true);
 });
 test('TSMV-003 Summary tiles reflect filtered movement totals independent of row page',async({page})=>{
  await openMovementLedger(page,{summary:{total_rows:14,inbound_rows:8,outbound_rows:4,no_change_rows:2,package_audited_rows:3,costed_rows:6,received_cost_by_currency:[]}});
  for(const label of ['Movements','Stock Added','Stock Removed','Package Audited','Cost Captured','Inbound Cost'])
   await expect(page.getByText(label,{exact:true}).first()).toBeVisible();
  await expect(page.getByText('14',{exact:true}).first()).toBeVisible();
 });
 test('TSMV-004 Empty ledger shows the no-filter-matches state without an editable grid',async({page})=>{
  await openMovementLedger(page);await expect(page.getByText('No stock movements found for the current filters.')).toBeVisible();
  await expect(page.getByRole('button',{name:'View'})).toHaveCount(0);
 });
 test('TSMV-005 Product filter updates server query and shareable URL',async({page})=>{
  const seen=await openMovementLedger(page);await filters(page).getByLabel('Product').selectOption('pw-product');
  await expect.poll(()=>requested(seen,'product_id','pw-product')).toBe(true);
  await expect(page).toHaveURL(/product_id=pw-product/);
 });
 test('TSMV-006 Storage Location filter sends selected storage_location_id',async({page})=>{
  const seen=await openMovementLedger(page);await filters(page).getByLabel('Storage Location').selectOption('pw-location');
  await expect.poll(()=>requested(seen,'storage_location_id','pw-location')).toBe(true);
 });
 test('TSMV-007 Movement Type filter uses exact backend movement_type code',async({page})=>{
  const seen=await openMovementLedger(page);await filters(page).getByLabel('Movement Type').selectOption('adjustment');
  await expect.poll(()=>requested(seen,'movement_type','adjustment')).toBe(true);
 });
 test('TSMV-008 From Date filter passes inclusive start_date to GET and link',async({page})=>{
  const seen=await openMovementLedger(page);await filters(page).getByLabel('From Date').fill('2026-10-01');
  await expect.poll(()=>requested(seen,'start_date','2026-10-01')).toBe(true);
  await expect(page).toHaveURL(/start_date=2026-10-01/);
 });
 test('TSMV-009 To Date filter passes end_date and constrains start input max',async({page})=>{
  const seen=await openMovementLedger(page);await filters(page).getByLabel('To Date').fill('2026-10-31');
  await expect.poll(()=>requested(seen,'end_date','2026-10-31')).toBe(true);
  await expect(filters(page).getByLabel('From Date')).toHaveAttribute('max','2026-10-31');
 });
 test('TSMV-010 Search Ledger debounces and sends trimmed free text to list GET',async({page})=>{
  const seen=await openMovementLedger(page);
  await filters(page).getByLabel('Search Ledger').fill('  sealed carton  ');
  await expect.poll(()=>requested(seen,'search','sealed carton')).toBe(true);
  await expect(page).toHaveURL(/search=sealed\+carton/);
 });
 test('TSMV-011 More filters toggles expanded state and reveals shipment control',async({page})=>{
  await openMovementLedger(page);const b=filters(page).getByRole('button',{name:'More filters'});
  await expect(b).toHaveAttribute('aria-expanded','false');await b.click();
  await expect(filters(page).getByLabel('Shipment')).toBeVisible();
  await expect(filters(page).getByRole('button',{name:'Hide more filters'})).toHaveAttribute('aria-expanded','true');
 });
 test('TSMV-012 Shipment filter is sent to movement and summary GET queries',async({page})=>{
  const seen=await openMovementLedger(page);await filters(page).getByRole('button',{name:'More filters'}).click();
  await filters(page).getByLabel('Shipment').selectOption('pw-shipment');
  await expect.poll(()=>requested(seen,'shipment_id','pw-shipment')).toBe(true);
  await expect.poll(()=>seen.some(r=>r.path.endsWith('/summary')&&new URL(r.url).searchParams.get('shipment_id')==='pw-shipment')).toBe(true);
 });
 test('TSMV-013 Package Audit filter true requests only package-audited movements',async({page})=>{
  const seen=await openMovementLedger(page);await filters(page).getByRole('button',{name:'More filters'}).click();
  await filters(page).getByLabel('Package Audit').selectOption('true');
  await expect.poll(()=>requested(seen,'package_audited','true')).toBe(true);
 });
 test('TSMV-014 Package Audit false keeps manually recorded/base-unit movements',async({page})=>{
  const seen=await openMovementLedger(page);await filters(page).getByRole('button',{name:'More filters'}).click();
  await filters(page).getByLabel('Package Audit').selectOption('false');
  await expect.poll(()=>requested(seen,'package_audited','false')).toBe(true);
 });
 test('TSMV-015 Cost Status filter uses supported costed code',async({page})=>{
  const seen=await openMovementLedger(page);await filters(page).getByRole('button',{name:'More filters'}).click();
  await filters(page).getByLabel('Cost Status').selectOption('costed');
  await expect.poll(()=>requested(seen,'cost_status','costed')).toBe(true);
 });
 test('TSMV-016 Cost Source filter sends catalog-supported source code',async({page})=>{
  const seen=await openMovementLedger(page);await filters(page).getByRole('button',{name:'More filters'}).click();
  await filters(page).getByLabel('Cost Source').selectOption('purchase_order');
  await expect.poll(()=>requested(seen,'cost_source','purchase_order')).toBe(true);
 });
 test('TSMV-017 Clear Filters removes active query and restores default controls',async({page})=>{
  const seen=await openMovementLedger(page);await filters(page).getByLabel('Product').selectOption('pw-product');
  await expect.poll(()=>requested(seen,'product_id','pw-product')).toBe(true);
  await filters(page).getByRole('button',{name:/Clear Filters/}).click();
  await expect(filters(page).getByLabel('Product')).toHaveValue('');
  await expect.poll(()=>movementGET(seen).some(r=>!new URL(r.url).searchParams.has('product_id'))).toBe(true);
  await expect(page).not.toHaveURL(/product_id=/);
 });
 test('TSMV-018 Camel-case shared deep link hydrates canonical product and page filters',async({page})=>{
  const seen=await openMovementLedger(page,{},'/stock-movements?productId=pw-product&movementType=receipt&page=2&page_size=25');
  await expect(filters(page).getByLabel('Product')).toHaveValue('pw-product');
  await expect(filters(page).getByLabel('Movement Type')).toHaveValue('receipt');
  await expect.poll(()=>movementGET(seen).some(r=>{const q=new URL(r.url).searchParams;return q.get('product_id')==='pw-product'&&q.get('movement_type')==='receipt'&&q.get('offset')==='25';})).toBe(true);
 });
 test('TSMV-019 Rows per page 25 requests 26 rows to detect next page',async({page})=>{
  const seen=await openMovementLedger(page);await page.getByLabel('Rows per page').selectOption('25');
  await expect.poll(()=>requested(seen,'limit','26')).toBe(true);
  await expect(page).toHaveURL(/page_size=25/);
 });
 test('TSMV-020 Next page requests offset 25 and updates page URL',async({page})=>{
  const rows=Array.from({length:26},(_,i)=>({...auditRow,id:`pw-movement-${i}`}));
  const seen=await openMovementLedger(page,{rows,summary:{total_rows:60,inbound_rows:40,outbound_rows:20}});
  await page.getByLabel('Rows per page').selectOption('25');
  await page.getByRole('button',{name:'Next'}).click();
  await expect.poll(()=>requested(seen,'offset','25')).toBe(true);
  await expect(page).toHaveURL(/page=2/);
 });
});

// Batch 26: Existing ledger fixtures are read-only; these tests prove observable UI behavior only.
test.describe('Stock Movements — evidence, pagination, safe references and export (Batch 26)',()=>{
 test('TSMV-021 Previous navigation restores prior page without removing product filter',async({page})=>{
  const entries=Array.from({length:26},(_,i)=>({...auditRow,id:`pw-movement-${i}`}));
  const seen=await openMovementLedger(page,{rows:entries,summary:{total_rows:60}},'/stock-movements?product_id=pw-product&page_size=25');
  await page.getByRole('button',{name:'Next'}).click();await expect(page).toHaveURL(/page=2/);
  await page.getByRole('button',{name:'Previous'}).click();
  await expect(page).not.toHaveURL(/page=2/);await expect(filters(page).getByLabel('Product')).toHaveValue('pw-product');
  await expect.poll(()=>requested(seen,'product_id','pw-product')).toBe(true);
 });
 test('TSMV-022 Out-of-range deep-linked page clamps to final summary-backed page',async({page})=>{
  const seen=await openMovementLedger(page,{rows:[auditRow],summary:{total_rows:26}},'/stock-movements?page=99&page_size=25');
  await expect(page).toHaveURL(/page=2/);
  await expect.poll(()=>requested(seen,'offset','25')).toBe(true);
  await expect(page.getByRole('button',{name:'Next'})).toBeDisabled();
 });
 test('TSMV-023 Missing summary uses extra row, not an invented total, for next-page availability',async({page})=>{
  const records=Array.from({length:26},(_,i)=>({...auditRow,id:`pw-sample-${i}`}));
  const seen=await openMovementLedger(page,{rows:records,summaryError:true},'/stock-movements?page_size=25');
  await expect(page.getByText('Full total unavailable.',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:'Next'}).click();await expect.poll(()=>requested(seen,'offset','25')).toBe(true);
 });
 test('TSMV-024 Summary failure warns while keeping visible audit movement',async({page})=>{
  await openMovementLedger(page,{rows:[auditRow],summaryError:true});
  await expect(page.getByText('The full filtered summary could not be loaded.',{exact:false})).toBeVisible();
  await expect(page.getByText('Synthetic Product',{exact:true})).toBeVisible();
 });
 test('TSMV-025 Filter-option failure preserves free-text ledger search',async({page})=>{
  const seen=await openMovementLedger(page,{rows:[auditRow],optionsError:true});
  await expect(page.getByText('Filter options could not be loaded.',{exact:false})).toBeVisible();
  await filters(page).getByLabel('Search Ledger').fill('  warehouse  ');
  await expect.poll(()=>requested(seen,'search','warehouse')).toBe(true);
 });
 test('TSMV-026 List GET failure shows request error rather than empty-state claim',async({page})=>{
  await openMovementLedger(page,{listError:true});
  await expect(page.getByText('Failed to load stock movements:',{exact:false})).toBeVisible();
  await expect(page.getByText('No stock movements found for the current filters.')).toHaveCount(0);
 });
 test('TSMV-027 View reveals three distinct evidence panels for a recorded movement',async({page})=>{
  await openMovementLedger(page,{rows:[auditRow],summary:{total_rows:1}});
  await page.getByRole('button',{name:'View'}).click();
  const detail=page.locator('tr.stock-movements-details-row');
  for(const title of ['Cost evidence','Package evidence','Audit context'])await expect(detail.getByText(title,{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Hide'})).toHaveAttribute('aria-expanded','true');
 });
 test('TSMV-028 Hide collapses evidence without changing the audit record',async({page})=>{
  await openMovementLedger(page,{rows:[auditRow],summary:{total_rows:1}});
  await page.getByRole('button',{name:'View'}).click();await expect(page.locator('tr.stock-movements-details-row')).toHaveCount(1);
  await page.getByRole('button',{name:'Hide'}).click();await expect(page.locator('tr.stock-movements-details-row')).toHaveCount(0);
  await expect(page.getByText('Synthetic Product',{exact:true})).toBeVisible();
 });
 test('TSMV-029 Positive stock change displays a signed increase',async({page})=>{
  await openMovementLedger(page,{rows:[{...auditRow,change:5}],summary:{total_rows:1}});
  await expect(page.locator('table tbody tr').first().getByText('+5',{exact:true})).toBeVisible();
 });
 test('TSMV-030 Negative change is signed and labelled as consumption rather than receipt',async({page})=>{
  await openMovementLedger(page,{rows:[{...auditRow,change:-3,movement_type:'usage',reason:'usage:maintenance'}],summary:{total_rows:1}});
  const row=page.locator('table tbody tr').first();
  await expect(row.getByText('-3',{exact:true})).toBeVisible();
  await expect(row.getByText('Stock consumed',{exact:true})).toBeVisible();
 });
 test('TSMV-031 Unclassified zero-change event does not masquerade as a proven receipt',async({page})=>{
  await openMovementLedger(page,{rows:[{...auditRow,change:0,movement_kind:'unclassified',movement_type:'shipment_receive',reason:'legacy_event'}],summary:{total_rows:1,no_change_rows:1}});
  await expect(page.getByText('Unproven legacy movement',{exact:true})).toBeVisible();
  await expect(page.locator('table tbody tr').first().getByText('0',{exact:true})).toBeVisible();
 });
 test('TSMV-032 Current-catalog product name is explicitly identified as historical fallback',async({page})=>{
  await openMovementLedger(page,{rows:[{...auditRow,product_name_source:'current_catalog'}]});
  await expect(page.getByText('Current product name — original snapshot missing')).toBeVisible();
 });
 test('TSMV-033 Current catalog storage name is flagged as not the recorded snapshot',async({page})=>{
  await openMovementLedger(page,{rows:[{...auditRow,storage_location_name_source:'current_catalog'}]});
  await expect(page.getByText('Current location name — original snapshot missing')).toBeVisible();
 });
 test('TSMV-034 Missing historical unit is flagged beside the row and in audit context',async({page})=>{
  await openMovementLedger(page,{rows:[{...auditRow,product_unit:null,product_unit_source:'current_catalog'}]});
  await expect(page.getByText('Historical unit unavailable').first()).toBeVisible();
  await page.getByRole('button',{name:'View'}).click();
  await expect(page.getByText('Historical unit evidence is unavailable for this legacy movement.')).toBeVisible();
 });
 test('TSMV-035 Current directory actor cannot be mistaken for original name snapshot',async({page})=>{
  await openMovementLedger(page,{rows:[{...auditRow,user_name:'Current employee',actor_name_source:'current_directory'}]});
  await expect(page.getByText('Current user name — original snapshot missing')).toBeVisible();
  await expect(page.getByText('Current employee')).toBeVisible();
 });
 test('TSMV-036 Costed movement exposes total, unit, source and currency in evidence',async({page})=>{
  await openMovementLedger(page,{rows:[{...auditRow,total_cost:10,unit_cost:2,cost_currency:'EUR',cost_source:'product_standard'}]});
  await page.getByRole('button',{name:'View'}).click();
  const detail=page.locator('.stock-movements-details-row');
  await expect(detail.getByText('Product standard cost')).toBeVisible();
  await expect(detail.getByText(/Total:.*10/)).toBeVisible();
  await expect(detail.getByText(/Unit:.*2/)).toBeVisible();
 });
 test('TSMV-037 Uncosted movement does not fabricate a zero-valued cost',async({page})=>{
  await openMovementLedger(page,{rows:[{...auditRow,total_cost:null,unit_cost:null,cost_source:null}]});
  await page.getByRole('button',{name:'View'}).click();
  await expect(page.getByText('No cost captured for this movement.')).toBeVisible();
 });
 test('TSMV-038 Package-audited row retains barcode, received quantity and unit basis',async({page})=>{
  await openMovementLedger(page,{rows:[auditRow]});await page.getByRole('button',{name:'View'}).click();
  const detail=page.locator('tr.stock-movements-details-row');
  await expect(detail.getByText('Barcode: PK-PW-1')).toBeVisible();
  await expect(detail.getByText(/5 units per package/)).toBeVisible();
  await expect(detail.getByText(/1 × Sealed carton/)).toBeVisible();
 });
 test('TSMV-039 Manual non-package movement shows explicit missing package evidence',async({page})=>{
  await openMovementLedger(page,{rows:[{...auditRow,package_id:null,package_name:null,package_barcode:null,package_count_received:null}]});
  await page.getByRole('button',{name:'View'}).click();
  await expect(page.getByText('Base-unit or manual movement; no package receiving evidence.')).toBeVisible();
 });
 test('TSMV-040 Audit context preserves classification and sanitized recorded reason',async({page})=>{
  await openMovementLedger(page,{rows:[{...auditRow,movement_type:'manual_adjustment',reason:'manual_adjustment'}]});
  await page.getByRole('button',{name:'View'}).click();
  const detail=page.locator('tr.stock-movements-details-row');
  await expect(detail.getByText('Movement classification: Manual adjustment')).toBeVisible();
  await expect(detail.getByText('Recorded reason: manual_adjustment')).toBeVisible();
 });
 test('TSMV-041 Shipment reference is a link only when shipment read permission exists',async({page})=>{
  await openMovementLedger(page,{rows:[auditRow],role:'PW_SMV_LINKS_GRANTED'});
  await expect(page.locator('a.stock-movements-reference-link')).toHaveAttribute('href','/shipments?shipmentId=pw-shipment');
 });
 test('TSMV-042 Shipment reference stays text without shipment read permission',async({page})=>{
  await openMovementLedger(page,{rows:[auditRow],role:'PW_SMV_NO_SHIPMENTS'});
  await expect(page.locator('a.stock-movements-reference-link')).toHaveCount(0);
  await expect(page.getByText('PO-PW-1',{exact:true})).toBeVisible();
 });
 test('TSMV-043 Transfer reference links to transfer detail when permitted',async({page})=>{
  await openMovementLedger(page,{rows:[{...auditRow,shipment_id:null,stock_transfer_id:'pw-transfer',movement_type:'stock_transfer_in'}],role:'PW_SMV_LINKS_GRANTED'});
  await expect(page.locator('a.stock-movements-reference-link')).toHaveAttribute('href','/stock-transfers?transfer_id=pw-transfer');
 });
 test('TSMV-044 Transfer reference is plain text without transfer read permission',async({page})=>{
  await openMovementLedger(page,{rows:[{...auditRow,shipment_id:null,stock_transfer_id:'pw-transfer',movement_type:'stock_transfer_out'}],role:'PW_SMV_NO_TRANSFERS'});
  await expect(page.locator('a.stock-movements-reference-link')).toHaveCount(0);
  await expect(page.getByText('Stock transfer',{exact:true})).toBeVisible();
 });
 test('TSMV-045 Export requests the full filtered ledger in batches of 500',async({page})=>{
  const exportRows=Array.from({length:500},(_,i)=>({...auditRow,id:`pw-csv-${i}`}));
  const seen=await openMovementLedger(page,{summary:{total_rows:502},rows:[auditRow],rowsForRequest:(uri)=>uri.searchParams.get('limit')==='500'?uri.searchParams.get('offset')==='500'?[{...auditRow,id:'pw-last-a'},{...auditRow,id:'pw-last-b'}]:exportRows:[auditRow]});
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export Filtered CSV'}).click();await download;
  const batches=movementGET(seen).filter(r=>new URL(r.url).searchParams.get('limit')==='500');
  expect(batches.map(r=>new URL(r.url).searchParams.get('offset'))).toEqual(['0','500']);
 });
 test('TSMV-046 CSV export retains product and period filters across its GET',async({page})=>{
  const seen=await openMovementLedger(page,{rows:[auditRow],summary:{total_rows:1}},'/stock-movements?product_id=pw-product&start_date=2026-10-01');
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export Filtered CSV'}).click();await download;
  await expect.poll(()=>movementGET(seen).some(r=>{const q=new URL(r.url).searchParams;return q.get('limit')==='500'&&q.get('product_id')==='pw-product'&&q.get('start_date')==='2026-10-01';})).toBe(true);
 });
 test('TSMV-047 CSV escapes spreadsheet formulas in free text instead of executing them',async({page})=>{
  await openMovementLedger(page,{rows:[{...auditRow,product_name:'=2+3'}],summary:{total_rows:1}});
  const promise=page.waitForEvent('download');await page.getByRole('button',{name:'Export Filtered CSV'}).click();
  const download=await promise,content=await readFile(await download.path(),'utf8');
  expect(content).toContain("'=2+3");expect(content).not.toMatch(/(^|,)\s*=2\+3/);
 });
 test('TSMV-048 CSV export GET failure shows an error and no download',async({page})=>{
  await openMovementLedger(page,{rows:[auditRow],summary:{total_rows:1},exportError:true});
  const seenDownloads:string[]=[];page.on('download',d=>seenDownloads.push(d.suggestedFilename()));
  await page.getByRole('button',{name:'Export Filtered CSV'}).click();
  await expect(page.getByText('Movement queue unavailable',{exact:false})).toBeVisible();
  expect(seenDownloads).toEqual([]);
 });
 test('TSMV-049 Refresh ledger re-fetches filter choices, filtered totals and visible rows',async({page})=>{
  const seen=await openMovementLedger(page,{rows:[auditRow],summary:{total_rows:1}});
  const before={list:seen.filter(r=>r.path.endsWith('/stock/movements')).length,summary:seen.filter(r=>r.path.endsWith('/summary')).length,options:seen.filter(r=>r.path.endsWith('/filter-options')).length};
  await page.getByRole('button',{name:'Refresh ledger'}).click();
  await expect.poll(()=>seen.filter(r=>r.path.endsWith('/stock/movements')).length).toBeGreaterThan(before.list);
  await expect.poll(()=>seen.filter(r=>r.path.endsWith('/summary')).length).toBeGreaterThan(before.summary);
  await expect.poll(()=>seen.filter(r=>r.path.endsWith('/filter-options')).length).toBeGreaterThan(before.options);
 });
 test('TSMV-050 Exact legacy reason link can be removed without removing other filters',async({page})=>{
  const seen=await openMovementLedger(page,{rows:[auditRow]},'/stock-movements?reason=legacy_proof&product_id=pw-product');
  await expect(page.getByText('An exact reason filter from a shared link is active.')).toBeVisible();
  await expect.poll(()=>requested(seen,'reason','legacy_proof')).toBe(true);
  await page.locator('.stock-movements-legacy-filter').getByRole('button',{name:'Remove'}).click();
  await expect(page).not.toHaveURL(/reason=/);
  await expect(filters(page).getByLabel('Product')).toHaveValue('pw-product');
 });
});

// Batch 174 — source-traced read-only movement evidence and deep-link boundaries.
// All fixture GETs are synthetic; real tenant security, posting, and persistence remain unverified.
test.describe('Stock Movements — deep links, legacy proof and safe evidence (Batch 174)',()=>{
 test('TSMV-051 Pristine read-only ledger disables Clear Filters',async({page})=>{
  const seen=await openMovementLedger(page);
  await expect(filters(page).getByRole('button',{name:'Clear Filters'})).toBeDisabled();
  expect(seen.every(r=>r.method==='GET')).toBe(true);
 });
 test('TSMV-052 Search input enforces the source 255-character boundary',async({page})=>{
  await openMovementLedger(page);
  await expect(filters(page).getByLabel('Search Ledger')).toHaveAttribute('maxlength','255');
 });
 test('TSMV-053 Unsupported page size falls back to 50 and a 51-row GET',async({page})=>{
  const seen=await openMovementLedger(page,{},'/stock-movements?page_size=17');
  await expect(page.getByLabel('Rows per page')).toHaveValue('50');
  await expect.poll(()=>requested(seen,'limit','51')).toBe(true);
 });
 test('TSMV-054 Unrecognized package-audit deep link cannot select an invalid filter',async({page})=>{
  const seen=await openMovementLedger(page,{},'/stock-movements?package_audited=maybe');
  await filters(page).getByRole('button',{name:'More filters'}).click();
  await expect(filters(page).getByLabel('Package Audit')).toHaveValue('all');
  await expect.poll(()=>movementGET(seen).some(r=>!new URL(r.url).searchParams.has('package_audited'))).toBe(true);
 });
 test('TSMV-055 Unrecognized cost-status deep link defaults to All',async({page})=>{
  const seen=await openMovementLedger(page,{},'/stock-movements?cost_status=unknown');
  await filters(page).getByRole('button',{name:'More filters'}).click();
  await expect(filters(page).getByLabel('Cost Status')).toHaveValue('all');
  await expect.poll(()=>movementGET(seen).some(r=>!new URL(r.url).searchParams.has('cost_status'))).toBe(true);
 });
 test('TSMV-056 Canonical snake-case product deep link takes precedence over camel-case alias',async({page})=>{
  const seen=await openMovementLedger(page,{},'/stock-movements?product_id=pw-product&productId=ignored-product');
  await expect(filters(page).getByLabel('Product')).toHaveValue('pw-product');
  await expect.poll(()=>requested(seen,'product_id','pw-product')).toBe(true);
  expect(movementGET(seen).every(r=>new URL(r.url).searchParams.get('product_id')!=='ignored-product')).toBe(true);
 });
 test('TSMV-057 Legacy from/to aliases hydrate both period controls and GET',async({page})=>{
  const seen=await openMovementLedger(page,{},'/stock-movements?from=2026-10-01&to=2026-10-31');
  await expect(filters(page).getByLabel('From Date')).toHaveValue('2026-10-01');
  await expect(filters(page).getByLabel('To Date')).toHaveValue('2026-10-31');
  await expect.poll(()=>movementGET(seen).some(r=>{const q=new URL(r.url).searchParams;return q.get('start_date')==='2026-10-01'&&q.get('end_date')==='2026-10-31';})).toBe(true);
 });
 test('TSMV-058 Changing another filter resets deep-linked pagination to first page',async({page})=>{
  const seen=await openMovementLedger(page,{summary:{total_rows:150}},'/stock-movements?page=2&product_id=pw-product');
  await filters(page).getByLabel('Storage Location').selectOption('pw-location');
  await expect(page).not.toHaveURL(/[?&]page=2(?:&|$)/);
  await expect.poll(()=>movementGET(seen).some(r=>{const q=new URL(r.url).searchParams;return q.get('storage_location_id')==='pw-location'&&q.get('offset')==='0';})).toBe(true);
 });
 test('TSMV-059 Two independent filters are represented in the Clear Filters count',async({page})=>{
  await openMovementLedger(page,{},'/stock-movements?product_id=pw-product&start_date=2026-10-01');
  await expect(filters(page).getByRole('button',{name:/Clear Filters \(2\)/})).toBeEnabled();
 });
 test('TSMV-060 Advanced shipment deep link automatically expands its filter controls',async({page})=>{
  await openMovementLedger(page,{},'/stock-movements?shipment_id=pw-shipment');
  await expect(filters(page).getByLabel('Shipment')).toHaveValue('pw-shipment');
  await expect(filters(page).getByRole('button',{name:/Hide more filters/})).toHaveAttribute('aria-expanded','true');
 });
 test('TSMV-061 Collapsing advanced controls does not discard active cost filter',async({page})=>{
  const seen=await openMovementLedger(page,{},'/stock-movements?cost_status=uncosted');
  await filters(page).getByRole('button',{name:/Hide more filters/}).click();
  await expect(filters(page).getByLabel('Cost Status')).toHaveCount(0);
  await expect(page).toHaveURL(/cost_status=uncosted/);
  await expect.poll(()=>requested(seen,'cost_status','uncosted')).toBe(true);
 });
 test('TSMV-062 From Date constrains To Date minimum without a mutation',async({page})=>{
  await openMovementLedger(page);
  await filters(page).getByLabel('From Date').fill('2026-10-05');
  await expect(filters(page).getByLabel('To Date')).toHaveAttribute('min','2026-10-05');
 });
 test('TSMV-063 Costed deep link hydrates filter and filtered summary request',async({page})=>{
  const seen=await openMovementLedger(page,{},'/stock-movements?cost_status=costed');
  await expect(filters(page).getByLabel('Cost Status')).toHaveValue('costed');
  await expect.poll(()=>seen.some(r=>r.path.endsWith('/summary')&&new URL(r.url).searchParams.get('cost_status')==='costed')).toBe(true);
 });
 test('TSMV-064 No-change movement summary explains non-stock-changing events',async({page})=>{
  await openMovementLedger(page,{summary:{total_rows:4,no_change_rows:2}});
  await expect(page.getByLabel('Filtered stock movement summary')).toContainText('2 event(s) did not change usable stock');
 });
 test('TSMV-065 Mixed-currency inbound summary keeps currencies distinct',async({page})=>{
  await openMovementLedger(page,{summary:{total_rows:2,inbound_rows:2,received_cost_by_currency:[{currency_code:'EUR',received_cost:10},{currency_code:'USD',received_cost:7}]}});
  const summary=page.getByLabel('Filtered stock movement summary');
  await expect(summary).toContainText('EUR');
  await expect(summary).toContainText('USD');
  await expect(summary).toContainText('currencies are never added together');
 });
 test('TSMV-066 No user identity is explicitly attributed to system or support actor',async({page})=>{
  await openMovementLedger(page,{rows:[{...auditRow,user_id:null,user_name:null}]});
  await expect(page.locator('table tbody > tr').first().getByText('System / support actor',{exact:true})).toBeVisible();
 });
 test('TSMV-067 User identifier without historical name shows unavailable actor warning',async({page})=>{
  await openMovementLedger(page,{rows:[{...auditRow,user_id:'pw-missing-user',user_name:null}]});
  await expect(page.locator('table tbody > tr').first().getByText('Historical actor unavailable',{exact:true})).toBeVisible();
 });
 test('TSMV-068 Missing product and location names show explicit historical placeholders',async({page})=>{
  await openMovementLedger(page,{rows:[{...auditRow,product_name:null,storage_location_name:null}]});
  const row=page.locator('table tbody > tr').first();
  await expect(row.getByText('Historical Product name unavailable',{exact:true})).toBeVisible();
  await expect(row.getByText('Historical location unavailable',{exact:true})).toBeVisible();
 });
 test('TSMV-069 Current-catalog unit displays missing original snapshot warning',async({page})=>{
  await openMovementLedger(page,{rows:[{...auditRow,product_unit:'pcs',product_unit_source:'current_catalog'}]});
  await expect(page.locator('table tbody > tr').first().getByText('Current unit — original snapshot missing',{exact:true})).toBeVisible();
 });
 test('TSMV-070 Restricted historical shipment has no link and no invented PO number',async({page})=>{
  await openMovementLedger(page,{rows:[{...auditRow,shipment_po_number:null}],role:'PW_SMV_NO_SHIPMENTS'});
  const row=page.locator('table tbody > tr').first();
  await expect(row.getByText('Historical shipment reference unavailable',{exact:true})).toBeVisible();
  await expect(row.locator('a.stock-movements-reference-link')).toHaveCount(0);
 });
 test('TSMV-071 Shipment-item unit-cost provenance is distinguished from standard cost',async({page})=>{
  await openMovementLedger(page,{rows:[{...auditRow,cost_source:'shipment_item_unit_cost'}]});
  await page.getByRole('button',{name:'View'}).click();
  await expect(page.locator('tr.stock-movements-details-row').getByText('Shipment item unit cost',{exact:true})).toBeVisible();
 });
 test('TSMV-072 Package ID without a historical name shows an evidence warning',async({page})=>{
  await openMovementLedger(page,{rows:[{...auditRow,package_id:'pw-package',package_name:null,package_barcode:null}]});
  await page.getByRole('button',{name:'View'}).click();
  await expect(page.locator('tr.stock-movements-details-row').getByText('Historical package evidence unavailable',{exact:true})).toBeVisible();
 });
 test('TSMV-073 Historical package name is retained even without package ID',async({page})=>{
  await openMovementLedger(page,{rows:[{...auditRow,package_id:null,package_name:'Archived crate',package_barcode:null,package_count_received:null}]});
  await page.getByRole('button',{name:'View'}).click();
  await expect(page.locator('tr.stock-movements-details-row').getByText('Archived crate',{exact:true})).toBeVisible();
 });
 test('TSMV-074 Unclassified legacy UUID does not leak from the row or audit context',async({page})=>{
  const uuid='123e4567-e89b-42d3-a456-426614174000';
  await openMovementLedger(page,{rows:[{...auditRow,movement_kind:'unclassified',movement_type:'shipment_receive',reason:`legacy:${uuid}`}]});
  await expect(page.locator('table tbody > tr').first()).toContainText('Legacy technical reason unavailable');
  await page.getByRole('button',{name:'View'}).click();
  await expect(page.locator('table')).not.toContainText(uuid);
  await expect(page.locator('tr.stock-movements-details-row')).toContainText('Legacy technical reason unavailable');
 });
 test('TSMV-075 Waste usage reason is displayed in human terms rather than raw code',async({page})=>{
  await openMovementLedger(page,{rows:[{...auditRow,movement_type:'usage',reason:'usage:waste',change:-2}]});
  const row=page.locator('table tbody > tr').first();
  await expect(row.getByText('Stock consumed',{exact:true})).toBeVisible();
  await expect(row.getByText('Waste',{exact:true})).toBeVisible();
 });
 test('TSMV-076 Reversed damage usage is marked as reversal not a new consumption',async({page})=>{
  await openMovementLedger(page,{rows:[{...auditRow,movement_type:'usage_reversal',reason:'usage_reversal:damage',change:2}]});
  const row=page.locator('table tbody > tr').first();
  await expect(row.getByText('Usage reversed',{exact:true})).toBeVisible();
  await expect(row.getByText('Reversed Damage',{exact:true})).toBeVisible();
 });
 test('TSMV-077 Cycle count reconciliation does not expose internal receiving note',async({page})=>{
  await openMovementLedger(page,{rows:[{...auditRow,movement_type:'cycle_count_reconciliation',reason:'cycle_count_reconciliation',receiving_note:'INTERNAL_CYCLE_NOTE'}]});
  await expect(page.locator('table')).not.toContainText('INTERNAL_CYCLE_NOTE');
  await page.getByRole('button',{name:'View'}).click();
  await expect(page.locator('table')).not.toContainText('INTERNAL_CYCLE_NOTE');
 });
 test('TSMV-078 Supplier return receiving note is evidence text rather than shipment link',async({page})=>{
  await openMovementLedger(page,{rows:[{...auditRow,movement_type:'supplier_return_dispatch',reason:'supplier_return_dispatch',receiving_note:'Supplier return SR-42'}],role:'PW_SMV_LINKS_GRANTED'});
  const row=page.locator('table tbody > tr').first();
  await expect(row).toContainText('Supplier return SR-42');
  await expect(row.locator('a.stock-movements-reference-link')).toHaveCount(0);
 });
});
