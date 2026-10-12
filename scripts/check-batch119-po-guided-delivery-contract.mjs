/** Batch 119: protect the current Purchase Order delivery-date contract and its legacy regression guard. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const po = read('src/pages/PurchaseOrdersPage.tsx');
const guided = read('scripts/check-tenant-procurement-guided-workflow.mjs');
const focused = read('scripts/check-purchase-order-delivery-date-gating-surgical-fix-v349294.mjs');
const catalog = read('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(read('package.json'));
let passed = 0;
let failed = 0;
function check(label, value) {
  if (value) { passed++; console.log(`PASS ${label}`); }
  else { failed++; console.error(`FAIL ${label}`); }
}

// This is the live source contract, not the retired inline expression from the old regression script.
check('eligibility first requires an approved PO with remaining goods', /const selectedCanSendPurchaseOrderBase = Boolean\(\s*selectedDetail\?\.status === 'approved' &&\s*selectedRemainingQuantity > 0/.test(po));
check('supplier send retains manage-shipment capability', po.includes('capabilities.canManageShipments &&'));
check('supplier send retains shipment-send capability', po.includes('capabilities.canSendShipments'));
check('supplier email evidence must load safely before send', po.includes('selectedOpenShipmentEmailSafetyReady &&'));
check('sent supplier email prevents another send', po.includes('!selectedOpenShipmentHasSentSupplierEmail'));
check('missing-date UI applies only to eligible supplier-send workflow', /const selectedNeedsDeliveryDate = Boolean\(\s*selectedCanSendPurchaseOrder &&\s*!selectedOpenShipment &&\s*!selectedDetail\?\.expected_delivery_date\s*\)/.test(po));
check('send readiness permits existing open shipment', /const selectedDeliveryDateReady = Boolean\(\s*selectedOpenShipment \|\|/.test(po));
check('send readiness permits persisted PO date', /selectedOpenShipment \|\|\s*selectedDetail\?\.expected_delivery_date \|\|/.test(po));
check('send readiness permits entered date', /selectedDetail\?\.expected_delivery_date \|\|\s*shipmentDeliveryDate\s*\)/.test(po));
check('date input is conditional', po.includes('{selectedNeedsDeliveryDate ? ('));
check('date input uses HTML date type', /type="date"\s*value=\{shipmentDeliveryDate\}\s*required/.test(po));
check('date guidance is localized and labelled', po.includes("ui('Delivery date is required before sending this purchase order.')"));
check('date input clears stale validation error after editing', /setShipmentDeliveryDate\(event\.target\.value\);\s*setSupplierPreparationError\(null\);/.test(po));
check('send button respects readiness and pending mutations', /disabled=\{preparePurchaseOrderSupplierEmailMutation\.isPending \|\| sendPurchaseOrderToSupplierMutation\.isPending \|\| !selectedDeliveryDateReady\}/.test(po));
check('send button opens preview preparation rather than direct send', po.includes('onClick={prepareSelectedPurchaseOrderEmail}'));
check('preparation derives date from transient or persisted PO date', po.includes('const deliveryDate = shipmentDeliveryDate || selectedDetail.expected_delivery_date || null;'));
check('preparation refuses missing date when creating a shipment', /if \(!selectedOpenShipment && !deliveryDate\) \{\s*setSupplierPreparationError\(ui\('Delivery date is required before sending this purchase order\.'\)\);\s*return;\s*\}/.test(po));
check('preparation hands existing shipment id to mutation', po.includes('existingShipmentId: selectedOpenShipment?.id || null'));
check('preparation checks open shipment identification', po.includes('if (selectedHasOpenShipment && !selectedOpenShipment)'));
check('preview remains required before sending', po.includes('setSupplierEmailPreview(preview)') && po.includes('Confirm & Send Email'));
check('send operation requires explicitly entered recipient', po.includes('if (!supplierEmailRecipient.trim())'));
check('guided legacy guard now explicitly verifies missing-date UI', guided.includes("const selectedNeedsDeliveryDate = Boolean"));
check('guided legacy guard now explicitly verifies date readiness', guided.includes("const selectedDeliveryDateReady = Boolean"));
check('guided legacy guard now explicitly verifies missing-date rejection', guided.includes('if (!selectedOpenShipment && !deliveryDate)'));
check('obsolete exact-source expression is absent from guide', !guided.includes('!selectedOpenShipment && !selectedDetail.expected_delivery_date'));
check('independent preexisting date guard still covers date readiness', focused.includes('selectedDeliveryDateReady'));
check('independent preexisting date guard still covers duplicate-toast suppression', focused.includes('missing-date fallback does not call global error toast'));
check('translation catalogue retains missing delivery date message', catalog.includes('["Delivery date is required before sending this purchase order."'));
check('guided regression remains registered', pkg.scripts?.['check:tenant-procurement-guided-workflow'] === 'node scripts/check-tenant-procurement-guided-workflow.mjs');
check('existing dedicated delivery-date regression remains registered', pkg.scripts?.['check:inventory-purchase-order-delivery-date-gating-v349294'] === 'node scripts/check-purchase-order-delivery-date-gating-surgical-fix-v349294.mjs');
check('Batch119 guard is registered', pkg.scripts?.['check:batch119-po-guided-delivery-contract'] === 'node scripts/check-batch119-po-guided-delivery-contract.mjs');

for (const [script, expected] of [
  ['scripts/check-tenant-procurement-guided-workflow.mjs', 'Tenant procurement guided workflow v3.49.118: PASS (35/35 checks).'],
  ['scripts/check-purchase-order-delivery-date-gating-surgical-fix-v349294.mjs', 'Purchase order delivery-date gating surgical fix: 20/20 PASS'],
]) {
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8', timeout: 30_000 });
  check(`inherited ${path.basename(script)} executes successfully`, result.status === 0 && result.stdout.includes(expected));
}
console.log(`Batch119 Purchase Order guided-delivery regression closure: ${passed}/${passed + failed} PASS`);
if (failed) process.exit(1);
