import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const purchaseOrdersPage = fs.readFileSync(path.join(root, 'src/pages/PurchaseOrdersPage.tsx'), 'utf8');
const shipmentsPage = fs.readFileSync(path.join(root, 'src/pages/ShipmentsPage.tsx'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
let failed = false;
let passed = 0;
const check = (name, ok) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
  if (!ok) failed = true;
  else passed += 1;
};

check('Purchase Orders supplier preview does not render internal PO notes', !purchaseOrdersPage.includes('supplierEmailPreview.document.notes'));
check('Shipments supplier preview does not render internal PO notes', !shipmentsPage.includes('supplierEmailPreview.document.notes'));
check('Purchase Orders supplier preview uses supplier SKU only', purchaseOrdersPage.includes("item.supplier_sku || ui('Not specified')"));
check('Shipments supplier preview uses supplier SKU only', shipmentsPage.includes("item.supplier_sku || ui('Not specified')"));
check('Purchase Orders supplier preview has no internal SKU fallback', !purchaseOrdersPage.includes("item.supplier_sku || item.sku || ui('Not specified')"));
check('Shipments supplier preview has no internal SKU fallback', !shipmentsPage.includes("item.supplier_sku || item.sku || ui('Not specified')"));
check('Purchase Orders supplier-preview type does not carry notes', !/type SupplierEmailPreview = \{[\s\S]*?notes\?: string \| null;[\s\S]*?\n\};/.test(purchaseOrdersPage));
check('Shipments supplier-preview type does not carry notes', !/type SupplierEmailPreview = \{[\s\S]*?notes\?: string \| null;[\s\S]*?\n\};/.test(shipmentsPage));
const purchaseOrderPreviewType = purchaseOrdersPage.slice(purchaseOrdersPage.indexOf('type SupplierEmailPreview = {'), purchaseOrdersPage.indexOf('/*', purchaseOrdersPage.indexOf('type SupplierEmailPreview = {')));
const shipmentPreviewType = shipmentsPage.slice(shipmentsPage.indexOf('type SupplierEmailPreview = {'), shipmentsPage.indexOf('type ShipmentWorkspaceSection', shipmentsPage.indexOf('type SupplierEmailPreview = {')));
check('Purchase Orders supplier-preview item type does not carry internal SKU', !/\n\s+sku\?: string \| null;/.test(purchaseOrderPreviewType));
check('Shipments supplier-preview item type does not carry internal SKU', !/\n\s+sku\?: string \| null;/.test(shipmentPreviewType));
check('Batch 054 frontend guard is registered', pkg.scripts?.['check:inventory-purchase-order-supplier-facing-redaction-v349295'] === 'node scripts/check-purchase-order-supplier-facing-redaction-surgical-fix-v349295.mjs');

console.log(`Purchase order supplier-facing redaction surgical fix: ${passed}/11 PASS`);
if (failed) process.exit(1);
