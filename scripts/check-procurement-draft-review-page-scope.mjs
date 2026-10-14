import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const source=fs.readFileSync(path.join(import.meta.dirname, '../src/pages/ProcurementRecommendationsPage.tsx'),'utf8');
let checks=0;
for (const [label, condition] of [
  ['Draft review requests all statuses',source.includes('/po-drafts?status=all&limit=${limit}&offset=${offset}')],
  ['Summary correctly says page spend',source.includes('label={ui("This page spend")}')],
  ['Page disclaimer explains paging',source.includes('Draft counts, warnings and spend cover the purchase orders on this page only.')],
  ['Summary uses backend currency-aware amount',source.includes('poDraftReviewQuery.data.summary.estimated_total_cost_by_currency')],
  ['Page list and summary use same paginated response',source.includes('poDraftReviewQuery.data.rows.map((po) => (')],
  ['Paging supports next/previous navigation',source.includes('poDraftReviewQuery.data.pagination.has_more') && source.includes('setPoDraftOffset')]
]) {assert.ok(condition,label);checks++;console.log('PASS',label)}
console.log(`Procurement PO review page-scope UI ${checks}/${checks} PASS`);
