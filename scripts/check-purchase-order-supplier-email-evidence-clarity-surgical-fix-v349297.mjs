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

check('Supplier email evidence keeps a business-readable section heading', page.includes("ui('Supplier email evidence')"));
check('Each evidence row uses a human-readable record label instead of the generated filename', page.includes("ui('Supplier email record')"));
check('Evidence row keeps recipient', page.includes("ui('Recipient')}: {evidence.recipient_email}"));
check('Evidence row keeps prepared timestamp', page.includes("ui('Prepared')}: {formatDateTime(evidence.prepared_at)}"));
check('Evidence row keeps delivery status', page.includes("ui('Status')}: {ui(evidence.delivery_status === 'sent'"));
check('Operational evidence view no longer renders the generated PDF filename as the row title', !page.includes('<strong>{evidence.pdf_filename}</strong>'));
check('Operational evidence view no longer renders the full SHA-256 digest', !page.includes('<p>SHA-256 {evidence.pdf_sha256}</p>'));
check('Exact immutable PDF remains downloadable', page.includes("ui('Download exact sent PDF')"));
check('Download still uses the preserved evidence PDF filename internally', page.includes('evidence.id}/pdf`, evidence.pdf_filename)'));
check('Evidence explains that the exact sent PDF is preserved for audit', page.includes("ui('The exact sent PDF is preserved for audit and can be downloaded below.')"));
check('Human-readable evidence label is multilingual', translations.includes('["Supplier email record"'));
check('Preserved-PDF explanation is multilingual', translations.includes('["The exact sent PDF is preserved for audit and can be downloaded below."'));
check('Batch 057 frontend guard is registered', pkg.scripts?.['check:inventory-purchase-order-supplier-email-evidence-clarity-v349297'] === 'node scripts/check-purchase-order-supplier-email-evidence-clarity-surgical-fix-v349297.mjs');

console.log(`Purchase order supplier-email evidence clarity surgical fix: ${passed}/13 PASS`);
if (failed) process.exit(1);
