import { test, expect, type Page, type Route } from '@playwright/test';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';

// Batch 31: Scanner — synthetic read-only QR and receiving-context browser contracts.
// Camera hardware is never started; no real scan, supplier action, or stock posting is performed.
type Read={method:string;path:string};
const context={id:'pw-scan-shipment',status:'pending',version:2,po_number:'SCAN-SHIP-100',qr_code:'QR-100'};
const options={storage_locations:[{id:'pw-scan-location',name:'Synthetic backroom'}]};
async function openScanner(page:Page,uri='/scanner',settings:{contextError?:boolean;optionsError?:boolean;lookupError?:boolean;lookupId?:string;shipmentStatus?:string}={}){
 await loginAsTenant(page);const reads:Read[]=[];
 await page.route('**/shipments**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const req=route.request(),path=new URL(req.url()).pathname;
  reads.push({method:req.method(),path});
  if(req.method()!=='GET')throw Error(`Unexpected scanner mutation ${path}`);
  if(path.endsWith('/shipments/options'))return fulfillJson(route,settings.optionsError?{message:'Synthetic location lookup rejected'}:options,settings.optionsError?503:200);
  if(path.includes('/shipments/qr/'))return fulfillJson(route,settings.lookupError?{code:'SHIPMENT_NOT_FOUND',message:'No synthetic shipment'}:{id:settings.lookupId||context.id,status:'pending'},settings.lookupError?404:200);
  if(path.endsWith(`/shipments/${context.id}`))return fulfillJson(route,settings.contextError?{message:'Synthetic shipment context rejected'}:{shipment:{...context,status:settings.shipmentStatus||context.status}},settings.contextError?404:200);
  if(path.endsWith('/shipments'))return fulfillJson(route,[{...context,supplier_id:'pw-supp-a',supplier_name:'Synthetic Supplier',delivery_date:'2026-12-10',line_count:1,total_ordered_quantity:4,total_received_quantity:0}]);
  return fulfillJson(route,{message:'Unmatched synthetic shipment read'},404);
 });
 await page.route('**/shipment-items/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  reads.push({method:route.request().method(),path:new URL(route.request().url()).pathname});
  if(route.request().method()!=='GET')throw Error('Unexpected shipment item mutation');
  return fulfillJson(route,[]);
 });
 await page.goto(uri);
 await expect(page.getByRole('heading',{name:/Shipment QR Scanner|Product Barcode Scanner|Execution Task Barcode Scanner|Receiving Barcode Scanner/})).toBeVisible();
 return reads;
}
const manual=(page:Page)=>page.locator('#manual-code-input');
const submit=(page:Page)=>page.getByRole('button',{name:'Submit Manual Code'});
const noWrites=(seen:Read[])=>expect(seen.filter(v=>v.method!=='GET')).toHaveLength(0);

test.describe('Scanner — QR lookup, safeguards and receiving context (Batch 31)',()=>{
 test('TSN-001 Default scanner opens shipment QR lookup without stock activity',async({page})=>{
  const seen=await openScanner(page);
  await expect(page.getByText('Shipment QR lookup',{exact:true}).first()).toBeVisible();
  await expect(page.getByText('Shipment QR lookup only opens the matching shipment.',{exact:false})).toBeVisible();noWrites(seen);
 });
 test('TSN-002 Manual submission is disabled while the scanned value is blank',async({page})=>{
  const seen=await openScanner(page);await expect(manual(page)).toBeEmpty();await expect(submit(page)).toBeDisabled();noWrites(seen);
 });
 test('TSN-003 Help reveals camera and manual fallback instructions without starting a camera',async({page})=>{
  const seen=await openScanner(page);await page.getByText('Scanning help',{exact:true}).click();
  await expect(page.getByText('Center the shipment QR code inside the square scan area.')).toBeVisible();
  await expect(page.getByText('Live camera scanning requires HTTPS and browser camera permission.')).toBeVisible();noWrites(seen);
 });
 test('TSN-004 Manual and upload controls remain available without initiating hardware capture',async({page})=>{
  const seen=await openScanner(page);
  await expect(manual(page)).toBeEnabled();await expect(page.getByRole('button',{name:'Upload Image'})).toBeEnabled();
  await expect(page.getByRole('button',{name:'Stop Camera Scanner'})).toBeDisabled();noWrites(seen);
 });
 test('TSN-005 Manual QR submit issues exact encoded lookup and no POST',async({page})=>{
  const seen=await openScanner(page,undefined,{lookupError:true});await manual(page).fill('QR-ONE');await submit(page).click();
  await expect.poll(()=>seen.filter(r=>r.path.endsWith('/shipments/qr/QR-ONE')).length).toBe(1);noWrites(seen);
 });
 test('TSN-006 Unknown shipment QR shows specific lookup failure',async({page})=>{
  const seen=await openScanner(page,undefined,{lookupError:true});await manual(page).fill('NOT-FOUND');await manual(page).press('Enter');
  await expect(page.getByText('No shipment matches this QR code.')).toBeVisible();noWrites(seen);
 });
 test('TSN-007 Failed lookup retains decoded code and offers correction without dispatching stock',async({page})=>{
  const seen=await openScanner(page,undefined,{lookupError:true});await manual(page).fill('BAD-QR');await submit(page).click();
  await expect(page.getByRole('heading',{name:'Latest Scan Result'})).toBeVisible();
  await expect(page.getByText('BAD-QR',{exact:true}).last()).toBeVisible();noWrites(seen);
 });
 test('TSN-008 Surrounding spaces are removed before QR resolution',async({page})=>{
  const seen=await openScanner(page,undefined,{lookupError:true});await manual(page).fill('  TRIM-QR  ');await submit(page).click();
  await expect.poll(()=>seen.filter(x=>x.path.endsWith('/shipments/qr/TRIM-QR')).length).toBe(1);noWrites(seen);
 });
 test('TSN-009 Verification mode loads its specific shipment context through read-only GET',async({page})=>{
  const seen=await openScanner(page,'/scanner?shipmentId=pw-scan-shipment');
  await expect.poll(()=>seen.filter(x=>x.path.endsWith('/shipments/pw-scan-shipment')).length).toBe(1);
  await expect(page.getByText('Verification target:',{exact:false})).toBeVisible();noWrites(seen);
 });
 test('TSN-010 Verification rejects a QR code belonging to a different shipment',async({page})=>{
  const seen=await openScanner(page,'/scanner?shipmentId=pw-scan-shipment',{lookupId:'pw-other-shipment'});
  await manual(page).fill('QR-OTHER');await submit(page).click();
  await expect(page.getByText('This QR code belongs to a different shipment than the one selected for verification.')).toBeVisible();
  await expect(page).toHaveURL(/\/scanner\?/);noWrites(seen);
 });
 test('TSN-011 Matching verification QR navigates to its shipment rather than posting stock',async({page})=>{
  const seen=await openScanner(page,'/scanner?shipmentId=pw-scan-shipment');
  await manual(page).fill('QR-100');await submit(page).click();
  await expect(page).toHaveURL(/\/shipments\?shipmentId=pw-scan-shipment/);noWrites(seen);
 });
 test('TSN-012 Failed verification-context GET prevents manual scan submission',async({page})=>{
  const seen=await openScanner(page,'/scanner?shipmentId=pw-scan-shipment',{contextError:true});
  await expect(page.getByText('The shipment selected for verification could not be loaded.',{exact:false})).toBeVisible();
  await expect(manual(page)).toBeDisabled();noWrites(seen);
 });
 test('TSN-013 Unknown scanner mode safely falls back to shipment QR lookup',async({page})=>{
  const seen=await openScanner(page,'/scanner?mode=unknown');
  await expect(page.getByText('Shipment QR lookup',{exact:true}).first()).toBeVisible();noWrites(seen);
 });
 test('TSN-014 Product scanner without shipment id blocks manual and image input',async({page})=>{
  const seen=await openScanner(page,'/scanner?mode=product&locationId=pw-scan-location');
  await expect(page.getByText('Select a shipment before opening the receiving barcode scanner.',{exact:false})).toBeVisible();
  await expect(manual(page)).toBeDisabled();await expect(page.getByRole('button',{name:'Upload Image'})).toBeDisabled();noWrites(seen);
 });
 test('TSN-015 Product scanner without destination blocks scan submission',async({page})=>{
  const seen=await openScanner(page,'/scanner?mode=product&shipmentId=pw-scan-shipment');
  await expect(page.getByText('Select a default storage location before opening the receiving barcode scanner.',{exact:false})).toBeVisible();
  await expect(manual(page)).toBeDisabled();noWrites(seen);
 });
 test('TSN-016 Unknown destination is rejected after options fetch',async({page})=>{
  const seen=await openScanner(page,'/scanner?mode=product&shipmentId=pw-scan-shipment&locationId=missing');
  await expect.poll(()=>seen.filter(x=>x.path.endsWith('/shipments/options')).length).toBeGreaterThan(0);
  await expect(page.getByText('The selected storage location is no longer available.',{exact:false})).toBeVisible();
  await expect(manual(page)).toBeDisabled();noWrites(seen);
 });
 test('TSN-017 Finalized receiving context disables product barcode entry',async({page})=>{
  const seen=await openScanner(page,'/scanner?mode=product&shipmentId=pw-scan-shipment&locationId=pw-scan-location',{shipmentStatus:'received'});
  await expect(page.getByText('This shipment is already finalized. Barcode receiving is closed.',{exact:false})).toBeVisible();
  await expect(manual(page)).toBeDisabled();noWrites(seen);
 });
 test('TSN-018 Valid product context exposes session metrics with zero recorded receipts',async({page})=>{
  const seen=await openScanner(page,'/scanner?mode=product&shipmentId=pw-scan-shipment&locationId=pw-scan-location');
  await expect(manual(page)).toBeEnabled();
  await expect(page.getByText('Scans received')).toBeVisible();await expect(page.getByText('Packages received')).toBeVisible();
  await expect(page.getByText('Units received')).toBeVisible();noWrites(seen);
 });
 test('TSN-019 Finish receiving returns to the exact shipment without a barcode mutation',async({page})=>{
  const seen=await openScanner(page,'/scanner?mode=product&shipmentId=pw-scan-shipment&locationId=pw-scan-location');
  await page.getByRole('button',{name:'Finish receiving'}).click();await expect(page).toHaveURL(/\/shipments\?shipmentId=pw-scan-shipment/);noWrites(seen);
 });
 test('TSN-020 Invalid image type and oversize image are refused before decoding',async({page})=>{
  const seen=await openScanner(page);const upload=page.locator('input[type=file][accept="image/*"]');
  await upload.setInputFiles({name:'wrong.txt',mimeType:'text/plain',buffer:Buffer.from('not-an-image')});
  await expect(page.getByText('Choose an image file containing a QR code or barcode.')).toBeVisible();
  await upload.setInputFiles({name:'too-large.png',mimeType:'image/png',buffer:Buffer.alloc(10*1024*1024+1,0)});
  await expect(page.getByText('Choose an image smaller than 10 MB.')).toBeVisible();noWrites(seen);
 });
});
