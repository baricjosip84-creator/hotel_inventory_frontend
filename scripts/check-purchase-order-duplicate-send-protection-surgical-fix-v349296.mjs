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

check('Purchase Orders identifies sent evidence for the current open receiving shipment', page.includes("evidence.shipment_id === selectedOpenShipment.id && evidence.delivery_status === 'sent'"));
check('Purchase Orders fails closed while supplier-email evidence is loading', page.includes('!supplierEmailEvidenceQuery.isLoading'));
check('Purchase Orders fails closed while supplier-email evidence is refetching', page.includes('!supplierEmailEvidenceQuery.isFetching'));
check('Purchase Orders fails closed when supplier-email evidence load failed', page.includes('!supplierEmailEvidenceQuery.error'));
check('Send eligibility explicitly excludes an already-sent open shipment', page.includes('!selectedOpenShipmentHasSentSupplierEmail'));
check('Send eligibility explicitly requires supplier-email history readiness', page.includes('selectedOpenShipmentEmailSafetyReady'));
check('Prepare handler blocks an already-sent receiving shipment before mutation', page.includes("if (selectedOpenShipmentHasSentSupplierEmail)"));
check('Prepare handler blocks when supplier-email history is not safely loaded', page.includes("if (!selectedOpenShipmentEmailSafetyReady)"));
check('Tenant sees an explicit already-sent state instead of another Send button', page.includes("ui('Supplier email already sent')"));
check('Already-sent explanation directs the user to recorded evidence', page.includes('Use the recorded evidence below; sending it again is blocked to prevent duplicate supplier communication.'));
check('Already-sent text is translated', translations.includes('["Supplier email already sent"'));
check('Duplicate-send explanation is translated', translations.includes('["This receiving shipment already has a sent supplier email.'));
check('History-load safety message is translated', translations.includes('["Supplier email history must be loaded before sending.'));
check('Batch 055 frontend guard is registered', pkg.scripts?.['check:inventory-purchase-order-duplicate-send-protection-v349296'] === 'node scripts/check-purchase-order-duplicate-send-protection-surgical-fix-v349296.mjs');

console.log(`Purchase order duplicate-send protection surgical fix: ${passed}/14 PASS`);
if (failed) process.exit(1);
