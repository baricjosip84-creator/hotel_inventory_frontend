import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PurchaseOrdersPage.tsx'), 'utf8');
const translations = fs.readFileSync(path.join(root, 'src/i18n/tenantUiTranslations.ts'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
let failed = false;
let passed = 0;
const check = (name, ok) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
  if (!ok) failed = true;
  else passed += 1;
};

check('supplier preparation has local error state', page.includes("const [supplierPreparationError, setSupplierPreparationError] = useState<string | null>(null);"));
check('temporary delivery date is cleared whenever selected PO changes', /useEffect\(\(\) => \{\s*setShipmentDeliveryDate\(''\);\s*setSupplierPreparationError\(null\);\s*\}, \[selectedId\]\);/.test(page));
check('delivery-date requirement applies only when supplier send is allowed and there is no open shipment or persisted delivery date', /const selectedNeedsDeliveryDate = Boolean\([\s\S]*?selectedCanSendPurchaseOrder[\s\S]*?!selectedOpenShipment[\s\S]*?!selectedDetail\?\.expected_delivery_date[\s\S]*?\);/.test(page));
check('send readiness accepts an open shipment, persisted delivery date, or current local date', /const selectedDeliveryDateReady = Boolean\([\s\S]*?selectedOpenShipment[\s\S]*?selectedDetail\?\.expected_delivery_date[\s\S]*?shipmentDeliveryDate[\s\S]*?\);/.test(page));
check('delivery date field renders from selectedNeedsDeliveryDate', page.includes('{selectedNeedsDeliveryDate ? ('));
check('delivery date input is required', /type="date"[\s\S]*?value=\{shipmentDeliveryDate\}[\s\S]*?required/.test(page));
check('delivery guidance is linked accessibly only while the date is missing', page.includes("aria-describedby={!shipmentDeliveryDate ? 'purchase-order-delivery-date-guidance' : undefined}"));
check('typing a delivery date clears stale local supplier-preparation error', /setShipmentDeliveryDate\(event\.target\.value\);\s*setSupplierPreparationError\(null\);/.test(page));
check('plain-language delivery-date guidance is rendered beside the field', page.includes("{ui('Delivery date is required before sending this purchase order.')}"));
check('Send to supplier is disabled until selectedDeliveryDateReady', /disabled=\{preparePurchaseOrderSupplierEmailMutation\.isPending \|\| sendPurchaseOrderToSupplierMutation\.isPending \|\| !selectedDeliveryDateReady\}/.test(page));
check('disabled Send button explains why it is unavailable', page.includes("title={!selectedDeliveryDateReady ? ui('Delivery date is required before sending this purchase order.') : ui('Send to supplier')}"));
check('missing-date fallback stays local instead of emitting a duplicate toast', /if \(!selectedOpenShipment && !deliveryDate\) \{\s*setSupplierPreparationError\(ui\('Delivery date is required before sending this purchase order\.'\)\);\s*return;\s*\}/.test(page));
check('missing-date fallback does not call global error toast', !/if \(!selectedOpenShipment && !deliveryDate\) \{[\s\S]{0,300}showTenantActionError/.test(page));
check('open-shipment identification failure stays local to supplier preparation panel', /selectedHasOpenShipment && !selectedOpenShipment[\s\S]{0,260}setSupplierPreparationError\(message\);[\s\S]{0,80}return;/.test(page));
check('supplier preparation mutation errors are rendered through local supplier error state', /onError: \(error\) => \{\s*setSupplierEmailPreview\(null\);\s*setSupplierEmailShipmentId\(null\);\s*setSupplierPreparationError\(/.test(page));
check('supplier preparation success clears local error state', /setSupplierEmailShipmentId\(shipmentId\);\s*setSupplierPreparationError\(null\);/.test(page));
check('supplier preparation error is rendered next to Send to supplier controls', page.includes('{supplierPreparationError ? <p style={styles.error}>{supplierPreparationError}</p> : null}'));
check('old duplicate mutation-error rendering is removed from supplier action panel', !page.includes('{preparePurchaseOrderSupplierEmailMutation.error ? <p style={styles.error}>'));
check('existing translated delivery-date validation string remains available', translations.includes('["Delivery date is required before sending this purchase order."'));
check('Batch 053 guard is registered', pkg.scripts?.['check:inventory-purchase-order-delivery-date-gating-v349294'] === 'node scripts/check-purchase-order-delivery-date-gating-surgical-fix-v349294.mjs');

console.log(`Purchase order delivery-date gating surgical fix: ${passed}/20 PASS`);
if (failed) process.exit(1);
