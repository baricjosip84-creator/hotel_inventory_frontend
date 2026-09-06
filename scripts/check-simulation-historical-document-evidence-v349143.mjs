import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
const check = (name, condition) => checks.push({ name, condition: Boolean(condition) });

const api = read('src/components/enterpriseInventory/EnterpriseInventoryApi.ts');
const queries = read('src/components/enterpriseInventory/EnterpriseInventoryQueries.ts');
const attachments = read('src/components/enterpriseInventory/tabs/AttachmentsTab.tsx');
const panels = read('src/components/enterpriseInventory/EnterpriseInventoryCatalogSupportPanels.tsx');
const mutations = read('src/components/enterpriseInventory/EnterpriseInventoryWorkflowMutations.ts');
const po = read('src/pages/PurchaseOrdersPage.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');
const pkg = read('package.json');

check('attachment historical options API exists', api.includes('fetchAttachmentEntityOptions'));
check('attachment historical options call dedicated endpoint', api.includes('/enterprise-inventory/attachments/entity-options?'));
check('attachment options query is permission-aware', queries.includes("attachmentEntityType === 'product' && canReadProducts") && queries.includes("attachmentEntityType === 'supplier' && canReadSuppliers"));
check('attachment options query is passed to tab', panels.includes('attachmentEntityOptionsQuery={attachmentEntityOptionsQuery}'));
check('archived attachment parents are merged into normal selector', attachments.includes('mergeHistoricalOptions'));
check('archived records are visibly labeled', attachments.includes("`${ui('Archived')} · ${item.label}`"));
check('read-only attachment users can choose business records', attachments.includes('(!canReadAttachments && !canWriteAttachments)'));
check('archived records block new uploads', attachments.includes('const canUploadToSelectedRecord = canWriteAttachments && !selectedRecordArchived'));
check('archived records block attachment deletion', attachments.includes('!canWriteAttachments || selectedRecordArchived || deleteAttachmentMutation.isPending'));
check('archived evidence helper is shown', attachments.includes('Archived records remain available for historical attachment review. New uploads and deletion are disabled.'));
check('attachment mutations refresh historical options', mutations.includes('enterprise-attachment-entity-options'));

check('purchase orders import authenticated file download', po.includes('apiDownloadFile, apiRequest'));
check('purchase orders define immutable email evidence model', po.includes('type SupplierEmailDeliveryEvidence = {'));
check('purchase orders fetch shipment email evidence history', po.includes('fetchShipmentSupplierEmailDeliveries'));
check('purchase order evidence combines all linked shipments', po.includes('Promise.all(selectedEmailShipmentIds.map'));
check('purchase order evidence refreshes after send', po.includes("invalidateQueries({ queryKey: ['purchase-order', 'supplier-email-evidence', selectedId] })"));
check('purchase order page explains immutable sent evidence', po.includes('Exact supplier-facing PDFs are preserved when an email is prepared'));
check('purchase order page shows full sha256', po.includes('<p>SHA-256 {evidence.pdf_sha256}</p>'));
check('purchase order page downloads exact persisted pdf', po.includes('/supplier-email-deliveries/${evidence.id}/pdf'));
check('purchase order page labels exact sent pdf download', po.includes("ui('Download exact sent PDF')"));
check('new historical evidence messages are multilingual', translations.includes('Archived records remain available for historical attachment review.') && translations.includes('Supplier email evidence') && translations.includes('Download exact sent PDF'));
check('prepared delivery state is multilingual', translations.includes('["Prepared",'));
check('v143 checker wired into frontend check chain', pkg.includes('check:simulation-historical-document-evidence-v349143'));

let passed = 0;
for (const item of checks) {
  if (item.condition) { passed += 1; console.log(`PASS ${item.name}`); }
  else console.error(`FAIL ${item.name}`);
}
console.log(`v3.49.143 historical document evidence integrity frontend: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);
