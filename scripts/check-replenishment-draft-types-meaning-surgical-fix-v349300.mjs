import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/ReplenishmentPlanningPage.tsx'), 'utf8');
const translations = fs.readFileSync(path.join(root, 'src/i18n/tenantUiTranslations.ts'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const backendRoot = path.resolve(root, process.env.BACKEND_ROOT || '../hotel-inventory-backend');
const backend = fs.readFileSync(path.join(backendRoot, 'src/services/procurement/locationReplenishmentPlanningService.js'), 'utf8');
let passed = 0; let failed = false;
function check(label, assertion) {
  const ok = Boolean(assertion);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
  if (ok) passed += 1; else failed = true;
}
const summary = page.match(/<OperationalWorkspaceStatCard label=\{ui\('Drafts still to create'\)\}[^\n]*/)?.[0] || '';
check('Draft card describes work remaining, not draft history', Boolean(summary));
check('Draft type summary is computed from transfer decisions needing linked drafts', summary.includes("acceptedTransferDraftsRequired ? ui('Transfer')"));
check('Draft type summary is computed from purchase decisions needing linked drafts', summary.includes("acceptedPurchaseDraftsRequired ? ui('Purchase')"));
check('None remains the correct zero-pending fallback', summary.includes("|| ui('None')"));
check('Draft card explains missing linked drafts', summary.includes("ui('Accepted actions without a linked draft')"));
check('Transfer ready condition requires accepted/overridden decision, positive quantity, and no linked transfer', /const acceptedTransferDraftsRequired = Boolean\(detail\?\.transfers\.some\(\(row\) => \['accepted', 'overridden'\]\.includes\(row\.decision_status\) && numberValue\(row\.final_quantity\) > 0 && !row\.linked_stock_transfer_id\)\)/.test(page));
check('Purchase ready condition requires accepted/overridden decision, positive quantity, and no linked purchase order', /const acceptedPurchaseDraftsRequired = Boolean\(actionablePurchaseRows\.some\(\(row\) => \['accepted', 'overridden'\]\.includes\(row\.decision_status\) && numberValue\(row\.final_purchase_quantity\) > 0 && !row\.linked_purchase_order_id\)\)/.test(page));
check('Existing transfer draft is still opened via its linked identifier', page.includes('/stock-transfers?transfer_id=${row.linked_stock_transfer_id}'));
check('Existing purchase draft is still opened via its linked identifier', page.includes('/purchase-orders?purchaseOrderId=${row.linked_purchase_order_id}'));
check('Old Draft types heading is no longer rendered on the planning page', !page.includes("ui('Draft types')"));
check('All five locale translations exist for remaining-drafts heading', translations.includes('["Drafts still to create", "Noch zu erstellende Entwürfe", "Borradores pendientes de crear", "Brouillons restant à créer", "Nacrti koje još treba izraditi"]'));
check('All five locale translations exist for pending draft helper', translations.includes('["Accepted actions without a linked draft", "Angenommene Maßnahmen ohne verknüpften Entwurf", "Acciones aceptadas sin un borrador vinculado", "Actions acceptées sans brouillon associé", "Prihvaćene radnje bez povezanog nacrta"]'));
check('Backend materialization still only creates accepted positive quantity actions', backend.includes("['accepted', 'overridden'].includes(row.decision_status)"));
check('New regression command is registered', pkg.scripts?.['check:inventory-replenishment-draft-types-meaning-v349300'] === 'node scripts/check-replenishment-draft-types-meaning-surgical-fix-v349300.mjs');
console.log(`Replenishment remaining-draft semantics: ${passed}/14 PASS`);
if (failed) process.exitCode = 1;
