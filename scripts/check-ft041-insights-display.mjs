// FT041 standalone Insights presentation contract (no network/deps required).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'src/pages/InsightsPage.tsx'),'utf8');
const translations=fs.readFileSync(path.join(root,'src/i18n/tenantUiTranslations.ts'),'utf8');
assert.match(source,/filter\(\(row\) => \['watch', 'high', 'critical'\]\.includes\(row\.risk_tier\.toLowerCase\(\)\)\)/);
assert.match(source,/depletionRootCauseQuery\.data\?\.rows \?\? \[\]\)\s*\.filter\(\(row\) => showAllDepletionEvidence \|\| row\.production_safety\.requires_human_review\)/);
assert.match(source,/rootCauseRowsForDisplay\.slice\(0, 8\)/);
assert.match(source,/showAllDepletionEvidence \? ui\('Show only rows needing review'\) : ui\('Show all reviewed stock rows'\)/);
assert.match(source,/stable: 'Stable'/);
for(const label of ['No stock rows require review.','Show only rows needing review','Show all reviewed stock rows']) {
  assert.ok(translations.includes('['+JSON.stringify(label)+','),'Missing translated UI label '+label);
}
console.log('PASS: FT041 Insights only puts at-risk stock in warnings; routine root-cause detail is opt-in; all new labels localized.');
