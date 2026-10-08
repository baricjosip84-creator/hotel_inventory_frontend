import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const api = fs.readFileSync(path.join(root, 'src/lib/api.ts'), 'utf8');
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

check('Purchase Orders keeps a specific mutation label', api.includes("if (normalizedPath.includes('/purchase-orders')) return 'Purchase order';"));
check('purchase order creation has explicit feedback', api.includes("normalizedPathOnly === '/purchase-orders'") && api.includes("return 'Purchase order created successfully.';"));
check('purchase order update has explicit feedback', api.includes("/^\\/purchase-orders\\/[^/]+$/.test(normalizedPathOnly)") && api.includes("return 'Purchase order updated successfully.';"));
check('purchase order lifecycle routes are matched explicitly', api.includes("/(submit|approve|cancel|close|reopen|create-shipment)$/"));
check('submit feedback is action-specific', api.includes("if (action === 'submit') return 'Purchase order submitted successfully.';"));
check('approve feedback is action-specific', api.includes("if (action === 'approve') return 'Purchase order approved successfully.';"));
check('cancel feedback is action-specific', api.includes("if (action === 'cancel') return 'Purchase order cancelled successfully.';"));
check('close feedback is action-specific', api.includes("if (action === 'close') return 'Purchase order closed successfully.';"));
check('reopen feedback is action-specific', api.includes("if (action === 'reopen') return 'Purchase order reopened successfully.';"));
check('shipment preparation feedback describes the actual pre-send state', api.includes("return 'Shipment prepared. Review the supplier email before sending.';"));

check('PO draft creation suppresses duplicate shared feedback because the page owns the final confirmation', /createPurchaseOrder[\s\S]*?skipMutationFeedback: true/.test(page));
check('PO draft creation keeps its page-owned confirmation', page.includes("showTenantActionSuccess(ui('PO draft created'));"));
check('supplier email preview suppresses misleading generic Shipment created feedback', /supplier-email-preview[\s\S]*?skipMutationFeedback: true/.test(page));
check('supplier email send suppresses generic shared feedback because the page owns the final delivery message', /send-to-supplier[\s\S]*?skipMutationFeedback: true/.test(page));
check('supplier email send keeps the rich page-owned success confirmation', page.includes('showTenantActionSuccess(data.message || fallbackMessage);'));
check('shipment preparation still uses the purchase-order create-shipment endpoint', page.includes('`/purchase-orders/${id}/create-shipment`'));

for (const message of [
  'Purchase order created successfully.',
  'Purchase order updated successfully.',
  'Purchase order submitted successfully.',
  'Purchase order approved successfully.',
  'Purchase order cancelled successfully.',
  'Purchase order closed successfully.',
  'Purchase order reopened successfully.',
  'Shipment prepared. Review the supplier email before sending.'
]) {
  check(`${message} is translated`, translations.includes(`["${message}"`));
  check(`${message} translation key is unique`, (translations.match(new RegExp(`\\[\\"${message.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}`, 'g')) || []).length === 1);
}

check('Batch 052 guard is registered', pkg.scripts?.['check:inventory-purchase-order-action-feedback-v349293'] === 'node scripts/check-purchase-order-action-feedback-surgical-fix-v349293.mjs');

console.log(`Purchase order action feedback surgical fix: ${passed}/33 PASS`);
if (failed) process.exit(1);
