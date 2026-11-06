import { test, expect, type Page, type Route } from '@playwright/test';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';
import { loginAsDisposableRole } from '../../../support/roleSession';

// Batch 32 — browser request contracts for Scanner. Synthetic replies only;
// no real receiving, task update, camera device, or tenant mutation is performed.
const LOCATION='pw-scan-location', SHIPMENT='pw-scan-shipment', ITEM='pw-scan-line';
const productUrl=`/scanner?mode=product&shipmentId=${SHIPMENT}&locationId=${LOCATION}`;
const taskUrl='/scanner?mode=task&executionTaskId=pw-execution-task';
type Wire={method:string;path:string;body:any;headers:Record<string,string>};
type Settings={barcode?:Record<string,unknown>;lookupStatus?:number;lookupError?:string;receiveStatus?:number;
  version?:number|string|null;deferReceive?:boolean;taskError?:boolean;task?:Record<string,unknown>;
  shipmentStatus?:string; delayLookup?:number; qrStatus?:number};
const baseBarcode={shipment_item_id:ITEM,shipment_id:SHIPMENT,product_id:'pw-product-001',
 quantity:6,received_quantity:0,remaining_quantity:6,storage_location_id:LOCATION,
 product_name:'Synthetic Packing Tape',barcode:'CODE-1',
 product:{id:'pw-product-001',name:'Synthetic Packing Tape',requires_lot_tracking:false,requires_expiry_date:false},
 serial_tracking:{enabled:false,require_on_receipt:false},match_source:'product'};
const taskResult={verified:true,task_id:'pw-execution-task',task_code:'PW-TASK-001',
 product_id:'pw-product-001',product_name:'Synthetic Packing Tape',source_type:'transfer',
 source_id:'pw-transfer-one',source_route:'/stock-transfers',match_source:'product'};
async function open(page:Page,mode:'product'|'task'|'shipment'='product',opts:Settings={},role?:'PW_SCAN_NO_RECEIVE'|'PW_SCAN_TASK_NO_UPDATE'){
 if(role)await loginAsDisposableRole(page,role);else await loginAsTenant(page);
 const calls:Wire[]=[];
 await page.route('**/shipments**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const req=route.request(),uri=new URL(req.url()),path=uri.pathname;
  const wire={method:req.method(),path,body:req.postDataJSON?.()??null,headers:req.headers()};calls.push(wire);
  if(path.endsWith('/shipments/options'))return fulfillJson(route,{storage_locations:[{id:LOCATION,name:'Synthetic Storage'}]});
  if(path.endsWith(`/shipments/${SHIPMENT}`))return fulfillJson(route,{shipment:{id:SHIPMENT,
    version:opts.version===undefined?2:opts.version,status:opts.shipmentStatus||'pending',po_number:'PW-SHP-1'}});
  if(path.includes('/barcode/')){
   if(opts.delayLookup)await new Promise(done=>setTimeout(done,opts.delayLookup));
   if(opts.lookupStatus)return fulfillJson(route,{code:opts.lookupError||'SHIPMENT_PRODUCT_NOT_FOUND',message:'Synthetic barcode lookup failed'},opts.lookupStatus);
   return fulfillJson(route,{...baseBarcode,...opts.barcode});
  }
  if(path.endsWith('/receive')&&req.method()==='POST'){
   if(opts.deferReceive)await new Promise(done=>setTimeout(done,200));
   return fulfillJson(route,opts.receiveStatus?{code:'RECEIVE_REJECTED',message:'Synthetic receiving refused'}:{success:true},opts.receiveStatus||200);
  }
  if(path.includes('/shipments/qr/'))return fulfillJson(route,opts.qrStatus?{code:'RATE_LIMITED',message:'Synthetic QR rate limited'}:{id:SHIPMENT},opts.qrStatus||200);
  return fulfillJson(route,{code:'UNEXPECTED_SCANNER_ENDPOINT',message:path},404);
 });
 await page.route('**/execution-tasks/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const req=route.request(),path=new URL(req.url()).pathname;
  calls.push({method:req.method(),path,body:req.postDataJSON?.()??null,headers:req.headers()});
  if(path.endsWith('/mobile-scan-verify')&&req.method()==='POST')
   return fulfillJson(route,opts.taskError?{code:'SCANNER_BARCODE_UNMATCHED',message:'Synthetic task barcode rejected'}:{...taskResult,...opts.task},opts.taskError?422:200);
  return fulfillJson(route,{message:'Synthetic unmatched task endpoint'},404);
 });
 const url=mode==='product'?productUrl:mode==='task'?taskUrl:'/scanner';
 await page.goto(url);
 if(!role)await expect(page.getByRole('heading',{name:mode==='product'?'Receiving Barcode Scanner':mode==='task'?'Execution Task Scanner':'Shipment QR Scanner'})).toBeVisible();
 return calls;
}
const submit=async(page:Page,code='CODE-1')=>{await page.locator('#manual-code-input').fill(code);
 await page.getByRole('button',{name:'Submit Manual Code'}).click();};
const receives=(r:Wire[])=>r.filter(x=>x.method==='POST'&&x.path.endsWith('/receive'));
const tasks=(r:Wire[])=>r.filter(x=>x.path.endsWith('/mobile-scan-verify'));
const scans=(r:Wire[])=>r.filter(x=>x.path.includes('/barcode/'));
const errors=(page:Page)=>page.locator('.app-error-state');

test.describe('Scanner — receiving, task verification, camera prerequisites (Batch 32)',()=>{
 test('TSN-021 Product barcode lookup uses selected shipment id and exact scanned code',async({page})=>{
  const seen=await open(page);await submit(page,'ABC-123');
  await expect.poll(()=>scans(seen).map(x=>x.path)).toContain(`/shipments/${SHIPMENT}/barcode/ABC-123`);
  await expect.poll(()=>receives(seen).length).toBe(1);
 });
 test('TSN-022 Missing product barcode reports shipment-specific not-found code',async({page})=>{
  const seen=await open(page,'product',{lookupStatus:404});await submit(page,'NO-MATCH');
  await expect(errors(page)).toContainText('This barcode does not match an active item in the selected shipment.');
  expect(receives(seen)).toHaveLength(0);
 });
 test('TSN-023 Simple barcode scan receives one unit only after version verification',async({page})=>{
  const seen=await open(page);await submit(page);
  await expect.poll(()=>receives(seen).length).toBe(1);
  const write=receives(seen)[0];expect(write.headers['if-match-version']).toBe('2');
  expect(write.body.items).toEqual([{product_id:'pw-product-001',quantity_received:1,
   storage_location_id:LOCATION,lot_number:null,batch_number:null,expiry_date:null}]);
 });
 test('TSN-024 Package barcode receives one package with underlying unit accounting',async({page})=>{
  const seen=await open(page,'product',{barcode:{match_source:'package',package:{id:'pw-package',package_name:'Case of tape',barcode:'PK-001',units_per_package:3,is_default:true}}});
  await submit(page,'PK-001');await expect.poll(()=>receives(seen).length).toBe(1);
  expect(receives(seen)[0].body.items[0]).toMatchObject({package_id:'pw-package',package_count_received:1,storage_location_id:LOCATION});
  await expect(page.getByText('Package received: 1 package (3 base units). Ready for the next scan.')).toBeVisible();
 });
 test('TSN-025 Package with more units than remaining shipment line is blocked',async({page})=>{
  const seen=await open(page,'product',{barcode:{remaining_quantity:2,package:{id:'pw-package',package_name:'Large carton',barcode:'PK-009',units_per_package:6,is_default:true}}});
  await submit(page);await expect(errors(page)).toContainText('Large carton contains 6 base units, but only 2 remain');
  expect(receives(seen)).toHaveLength(0);
 });
 test('TSN-026 Lot tracked product without label lot opens detailed receiving',async({page})=>{
  const seen=await open(page,'product',{barcode:{product:{...baseBarcode.product,requires_lot_tracking:true}}});
  await submit(page);await expect(page).toHaveURL(/\/shipments\?/);
  expect(new URL(page.url()).searchParams.get('requiresLotTracking')).toBe('true');expect(receives(seen)).toHaveLength(0);
 });
 test('TSN-027 Expiry required without expiry date opens detailed receiving',async({page})=>{
  const seen=await open(page,'product',{barcode:{product:{...baseBarcode.product,requires_expiry_date:true}}});
  await submit(page);await expect(page).toHaveURL(/\/shipments\?/);
  expect(new URL(page.url()).searchParams.get('requiresExpiryDate')).toBe('true');expect(receives(seen)).toHaveLength(0);
 });
 test('TSN-028 Serial receipt requirement routes to manual receiving instead of auto-post',async({page})=>{
  const seen=await open(page,'product',{barcode:{serial_tracking:{enabled:true,require_on_receipt:true}}});
  await submit(page);await expect(page).toHaveURL(/\/shipments\?/);
  expect(new URL(page.url()).searchParams.get('requiresSerialOnReceipt')).toBe('true');expect(receives(seen)).toHaveLength(0);
 });
 test('TSN-029 Ambiguous barcode does not arbitrarily choose a product line',async({page})=>{
  const seen=await open(page,'product',{lookupStatus:409,lookupError:'SCANNER_BARCODE_AMBIGUOUS'});await submit(page);
  await expect(errors(page)).toContainText('more than one active product');expect(receives(seen)).toHaveLength(0);
 });
 test('TSN-030 Already received line cannot receive additional stock',async({page})=>{
  const seen=await open(page,'product',{barcode:{remaining_quantity:0,received_quantity:6}});await submit(page);
  await expect(errors(page)).toContainText('Scanned item is already fully received.');expect(receives(seen)).toHaveLength(0);
 });
 test('TSN-031 Missing shipment version blocks receiving POST',async({page})=>{
  const seen=await open(page,'product',{version:'invalid-version'});await submit(page);
  await expect(errors(page)).toContainText('selected shipment version could not be verified');expect(receives(seen)).toHaveLength(0);
 });
 test('TSN-032 In-flight barcode resolution prevents a second manual submission',async({page})=>{
  const seen=await open(page,'product',{delayLookup:800});await page.locator('#manual-code-input').fill('SLOW-CODE');
  await page.getByRole('button',{name:'Submit Manual Code'}).click();
  await expect(page.getByRole('button',{name:'Submit Manual Code'})).toBeDisabled();
  await expect.poll(()=>receives(seen).length).toBe(1);expect(scans(seen)).toHaveLength(1);
 });
 test('TSN-033 Failed product lookup retains operator retry controls without success',async({page})=>{
  const seen=await open(page,'product',{lookupStatus:503,lookupError:'SCANNER_UNAVAILABLE'});
  await submit(page,'FIRST');await expect(errors(page)).toContainText('Synthetic barcode lookup failed');
  await submit(page,'SECOND');await expect.poll(()=>scans(seen).length).toBe(2);expect(receives(seen)).toHaveLength(0);
 });
 test('TSN-034 Inventory label handoff preserves lot batch and expiry parameters',async({page})=>{
  const label={id:'pw-label',barcode_value:'LABEL-0001',lot_number:'LOT-88',batch_number:'B-88',expiry_date:'2027-12-13'};
  const seen=await open(page,'product',{barcode:{match_source:'label',label,serial_tracking:{enabled:true,require_on_receipt:true}}});
  await submit(page,'LABEL-0001');await expect(page).toHaveURL(/\/shipments\?/);
  const q=new URL(page.url()).searchParams;
  expect([q.get('barcodeLabelId'),q.get('labelBarcode'),q.get('labelLot'),q.get('labelBatch'),q.get('labelExpiry')]).toEqual(['pw-label','LABEL-0001','LOT-88','B-88','2027-12-13']);
  expect(receives(seen)).toHaveLength(0);
 });
 test('TSN-035 Package handoff preserves remaining-package and package provenance',async({page})=>{
  const seen=await open(page,'product',{barcode:{package:{id:'pk-source',package_name:'Source case',barcode:'PK-SOURCE',units_per_package:5,is_default:true},
   calculated:{remaining_quantity:7,remaining_packages_estimate:1.4,can_receive_one_full_package:true},serial_tracking:{enabled:true,require_on_receipt:true}}});
  await submit(page,'PK-SOURCE');await expect(page).toHaveURL(/\/shipments\?/);
  const q=new URL(page.url()).searchParams;
  expect([q.get('packageId'),q.get('packageBarcode'),q.get('unitsPerPackage'),q.get('remainingPackagesEstimate'),q.get('canReceiveOneFullPackage')]).toEqual(['pk-source','PK-SOURCE','5','1.4','true']);
  expect(receives(seen)).toHaveLength(0);
 });
 test('TSN-036 Successful mocked receive increments the session count and clears code',async({page})=>{
  const seen=await open(page);await submit(page);await expect.poll(()=>receives(seen).length).toBe(1);
  await expect(page.getByText('Received 1 unit(s). Ready for the next scan.')).toBeVisible();
  await expect(page.locator('#manual-code-input')).toBeEmpty();
 });
 test('TSN-037 Failed receive POST does not claim success or clear operator input',async({page})=>{
  const seen=await open(page,'product',{receiveStatus:409});await submit(page,'REJECT-ME');
  await expect(errors(page)).toContainText('Synthetic receiving refused');
  await expect(page.locator('#manual-code-input')).toHaveValue('REJECT-ME');
  expect(receives(seen)).toHaveLength(1);await expect(page.getByText(/Received 1 unit\(s\)/)).toHaveCount(0);
 });
 test('TSN-038 Task scanner without executionTaskId blocks verification input',async({page})=>{
  const seen=await open(page,'task');await page.goto('/scanner?mode=task');
  await expect(page.getByText('Open the scanner from a Mobile Execution task',{exact:false})).toBeVisible();
  await expect(page.locator('#manual-code-input')).toBeDisabled();expect(tasks(seen)).toHaveLength(0);
 });
 test('TSN-039 Task verification sends exact task id and JSON scanned code',async({page})=>{
  const seen=await open(page,'task');await submit(page,'TASK-BAR-001');
  await expect.poll(()=>tasks(seen).length).toBe(1);
  expect(tasks(seen)[0].path).toBe('/execution-tasks/pw-execution-task/mobile-scan-verify');
  expect(tasks(seen)[0].body).toEqual({barcode:'TASK-BAR-001'});
 });
 test('TSN-040 Rejected task barcode shows error and does not show verified badge',async({page})=>{
  const seen=await open(page,'task',{taskError:true});await submit(page,'INVALID-TASK-ITEM');
  await expect(errors(page)).toContainText('Synthetic task barcode rejected');
  await expect(page.getByText('Verified execution task',{exact:true})).toHaveCount(0);expect(tasks(seen)).toHaveLength(1);
 });
 test('TSN-041 Verified task may expose authorized source workflow button',async({page})=>{
  const seen=await open(page,'task',{task:{source_type:'shipment',source_id:SHIPMENT,source_route:'/shipments'}});
  await submit(page);await expect(page.getByText('Verified execution task')).toBeVisible();
  await expect(page.getByRole('button',{name:'Open source workflow'})).toBeVisible();
  expect(receives(seen)).toHaveLength(0);
 });
 test('TSN-042 Task verification is not a stock receive transaction',async({page})=>{
  const seen=await open(page,'task');await submit(page);
  await expect(page.getByText('Task item verified. Complete the real source workflow before completing the execution task.')).toBeVisible();
  expect(tasks(seen)).toHaveLength(1);expect(receives(seen)).toHaveLength(0);
 });
 test('TSN-043 Undecodable image reports manual fallback without API write',async({page})=>{
  const seen=await open(page,'shipment');
  await page.locator('input[type=file][accept="image/*"]').setInputFiles({name:'unreadable.png',mimeType:'image/png',buffer:Buffer.from('invalid-png')});
  await expect(errors(page)).toContainText('No supported code could be decoded from this image.');
  await expect(page.locator('#manual-code-input')).toBeEnabled();expect(receives(seen)).toHaveLength(0);
 });
 test('TSN-044 Missing browser camera API disables live camera but leaves manual input',async({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:undefined});});
  const seen=await open(page,'shipment');
  await expect(page.getByRole('button',{name:'Start Camera Scanner'})).toBeDisabled();
  await expect(page.locator('#manual-code-input')).toBeEnabled();expect(receives(seen)).toHaveLength(0);
 });
 test('TSN-045 Hardware camera permission denial: reserved for controlled Phase 2 browser device fixture',async()=>{
  test.skip(true,'Requires controlled deterministic Html5Qrcode/camera permission fixture; no camera used in Phase 1.');
 });
 test('TSN-046 Live camera start/stop exclusivity: reserved for controlled Phase 2 device fixture',async()=>{
  test.skip(true,'Requires browser media stream and Html5Qrcode lifecycle fixture; no live hardware accessed in Phase 1.');
 });
 test('TSN-047 Zero-byte upload is rejected at file-size boundary',async({page})=>{
  const seen=await open(page,'shipment');
  await page.locator('input[type=file][accept="image/*"]').setInputFiles({name:'empty.png',mimeType:'image/png',buffer:Buffer.alloc(0)});
  await expect(errors(page)).toContainText('Choose an image smaller than 10 MB.');expect(receives(seen)).toHaveLength(0);
 });
 test('TSN-048 Manual barcode input limits text to maximum 512 characters',async({page})=>{
  const seen=await open(page,'shipment');const field=page.locator('#manual-code-input');
  await expect(field).toHaveAttribute('maxlength','512');await field.fill('X'.repeat(512));
  await expect(field).toHaveValue('X'.repeat(512));expect(receives(seen)).toHaveLength(0);
 });
 test('TSN-049 Rate-limited QR lookup shows error and allows a second attempt',async({page})=>{
  const seen=await open(page,'shipment',{qrStatus:429});await submit(page,'QR-FIRST');
  await expect(errors(page)).toContainText('Synthetic QR rate limited');
  await submit(page,'QR-RETRY');
  await expect.poll(()=>seen.filter(x=>x.path.includes('/shipments/qr/')).length).toBe(2);
  expect(receives(seen)).toHaveLength(0);
 });
 test('TSN-050 Route refuses receiving mode for a tenant without shipment-receive permission',async({page})=>{
  const seen=await open(page,'product',{},'PW_SCAN_NO_RECEIVE');
  await expect(page.getByRole('heading',{name:'Receiving Barcode Scanner'})).toHaveCount(0);
  await expect(page).not.toHaveURL(/\/scanner\?mode=product/);expect(receives(seen)).toHaveLength(0);
 });
});
