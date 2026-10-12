import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const page = read('src/pages/DashboardPage.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');

const requireText = (source, text, label = text) => {
  if (!source.includes(text)) throw new Error(`Missing Dashboard v3.49.69 guard: ${label}`);
};
const rejectText = (source, text, label = text) => {
  if (source.includes(text)) throw new Error(`Obsolete Dashboard v3.49.69 behavior still present: ${label}`);
};

requireText(page, 'enabled: canUseSetupChecklist', 'permission-aware setup checklist query');
requireText(page, "ui('Setup checklist unavailable.')", 'truthful setup checklist error state');
requireText(page, 'const formatAvailableNumber', 'nullable summary formatter');
requireText(page, 'formatAvailableNumber(summary.master_data.total_products)', 'products null is not rendered as zero');
requireText(page, 'formatAvailableNumber(summary.master_data.total_suppliers)', 'suppliers null is not rendered as zero');
requireText(page, 'formatAvailableNumber(summary.master_data.total_storage_locations)', 'locations null is not rendered as zero');
requireText(page, "specificType !== 'other'", 'legacy generic movement type fallback');
requireText(page, 'row.movement_kind || specificType || \'other\'', 'semantic movement kind fallback');
// Batch114: Dashboard now translates known system reasons while preserving user-entered reasons.
requireText(page, 'function dashboardReasonLabel(row: RecentActivityRow, ui:', 'readable system reason formatter');
requireText(page, "const reason = String(row.reason || '').trim();", 'original reason is read without rewriting');
requireText(page, 'return reason;', 'unknown/user-authored reason preserved verbatim');
requireText(page, 'dashboardReasonLabel(row, ui)', 'recent-activity card calls reason formatter');
requireText(page, "if (reason === 'manual_adjustment') return ui('Manual adjustment');", 'known system reason localized');
rejectText(page, 'formatActivityReason(', 'reason rewriting helper');
requireText(page, "ui('Demand history incomplete')", 'demand data-quality warning');
requireText(page, "ui('Some demand movements are missing storage location context.')", 'missing-location demand-quality explanation');
requireText(page, 'row.unlocated_negative_quantity', 'backend missing-location demand-quality signal');
requireText(translations, '["Some demand movements are missing storage location context.",', 'missing-location explanation translation row');
requireText(page, 'reorderRecommendationsQuery.data?.evaluation?.products_evaluated', 'actual reorder evaluation count');

for (const label of ['Consumption', 'Receipt', 'Transfer Out', 'Transfer In', 'Count Reconciliation', 'Adjustment']) {
  requireText(translations, `[\"${label}\",`, `translation row: ${label}`);
}

rejectText(page, ': toNumber(row.estimated_days_of_coverage)}', 'raw coverage-day number formatting');
requireText(page, ': formatNumber(row.estimated_days_of_coverage)}', 'locale-aware coverage-day number formatting');
requireText(page, 'sort_by=reorder_quantity_desc&limit=6', 'server-ranked top reorder feed');

console.log('Dashboard v3.49.69 frontend surgical closure checks: PASS');
