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

check('selected purchase-order title is supplier-first rather than machine-reference-first', page.includes("title={selectedDetail ? `${ui('Purchase order')} · ${selectedDetail.supplier_name}` : ui('Purchase order detail')}"));
check('selected purchase-order reference remains visible as secondary context', page.includes("ui('Reference {reference} · review order progress, receiving, and available actions.')"));
check('purchase-order View still uses the existing focused detail workspace handoff', page.includes("navigateWorkspaceSection('detail', detailRef.current)") && page.includes('id="purchase-order-detail"'));
check('purchase-order audit has a dedicated business event label formatter', page.includes('function purchaseOrderAuditEventLabel(action: string'));
check('purchase-order audit has a dedicated business context formatter', page.includes('function purchaseOrderAuditMetadataSummary('));
check('creation action is human readable', page.includes("'purchase_order.created': 'Purchase order created'"));
check('submission action is human readable', page.includes("'purchase_order.submitted': 'Purchase order submitted for approval'"));
check('approval action is human readable', page.includes("'purchase_order.approved': 'Purchase order approved'"));
check('shipment creation action is human readable', page.includes("'purchase_order.shipment_created': 'Receiving shipment created'"));
check('recommendation conversion action is human readable', page.includes("'procurement_recommendation.po_draft_created': 'Purchase order draft created from procurement recommendation'"));
check('completion lifecycle actions are human readable', ['Purchase order completed','Purchase order manually closed','Purchase order reopened','Purchase order cancelled'].every((label) => page.includes(`'${label}'`)));
check('unknown audit actions are humanized instead of shown as raw dotted keys', page.includes('humanizeAuditToken(action)'));
check('audit list renders the human event label rather than event.action directly', page.includes('<strong>{purchaseOrderAuditEventLabel(event.action, ui)}</strong>') && !page.includes('<strong>{event.action}</strong>'));
check('audit detail disclosure is business-context wording', page.includes('<summary>{ui("Business context")}</summary>'));
check('status transition metadata is rendered as business language', page.includes("ui('Status: {from} → {to}')"));
check('quantity metadata uses readable labels', ['Ordered quantity: {quantity}','Received quantity: {quantity}','Remaining quantity: {quantity}','Shipment quantity: {quantity}'].every((label) => page.includes(`ui('${label}')`)));
check('technical recommendation keys are not rendered into business context', !page.includes('metadata.recommendation_keys') && !page.includes('recommendation_keys:'));
check('technical supplier/shipment ids are not rendered into business context', !page.includes('metadata.supplier_id') && !page.includes('metadata.shipment_id'));
check('empty metadata has an explicit business fallback', page.includes("ui('No additional business context recorded.')"));
check('audit CSV uses business-facing event and context formatters', page.includes('purchaseOrderAuditEventLabel(event.action, ui)') && page.includes('purchaseOrderAuditMetadataSummary(event.metadata, ui)'));
check('audit CSV headers avoid Entity Type / Entity ID / Metadata Summary wording', page.includes("[ui('Created At'), ui('Event'), ui('Actor'), ui('Record'), ui('Reference'), ui('Business context')]") && !page.includes("['Created At', 'Action', 'Actor', 'Entity Type', 'Entity ID', 'Metadata Summary']"));
check('audit print output uses purchase-order record label and PO reference instead of raw entity type/id', page.includes("<td>${escapeHtml(ui('Purchase order'))}</td>") && page.includes("<td>${escapeHtml(selectedDetail.po_number)}</td>"));
check('new purchase-order audit labels are translated across tenant locales', ['Purchase order created','Purchase order submitted for approval','Purchase order approved','Receiving shipment created','Business context','No additional business context recorded.','Reference {reference} · review order progress, receiving, and available actions.'].every((label) => translations.includes(`["${label}"`)));
check('supplier-first reference description translation is unique', (translations.match(/\["Reference \{reference\} · review order progress, receiving, and available actions\."/g) || []).length === 1);
check('Batch 051 guard is registered', pkg.scripts?.['check:inventory-purchase-order-business-audit-presentation-v349292'] === 'node scripts/check-purchase-order-business-audit-presentation-surgical-fix-v349292.mjs');

console.log(`Purchase-order business audit presentation surgical fix: ${passed}/25 PASS`);
if (failed) process.exit(1);
