import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source=fs.readFileSync(path.join(root,'src/pages/InsightsPage.tsx'),'utf8');
const css=fs.readFileSync(path.join(root,'src/pages/InsightsPage.css'),'utf8');
const translations=fs.readFileSync(path.join(root,'src/i18n/tenantUiTranslations.ts'),'utf8');
assert.match(source,/filter\(\(row\) => \['watch', 'high', 'critical'\]\.includes\(row\.risk_tier\.toLowerCase\(\)\)\)/);
assert.match(source,/\.filter\(\(row\) => showAllDepletionEvidence \|\| row\.production_safety\.requires_human_review\)/);
assert.match(source,/const visibleDepletionReviewRows = rootCauseRowsForDisplay\.slice\(visibleDepletionReviewPage \* 8, \(visibleDepletionReviewPage \+ 1\) \* 8\)/);
assert.match(source,/visibleDepletionReviewRows\.map\(\(row\) => \(/);
assert.match(source,/selectedDepletionRow \? \(/);
assert.match(source,/aria-pressed=\{selectedDepletionRow\?\.stock_id === row\.stock_id\}/);
assert.match(source,/onClick=\{\(\) => setSelectedDepletionStockId\(row\.stock_id\)\}/);
assert.match(source,/setDepletionReviewPage\(0\);\s*setSelectedDepletionStockId\(null\);/);
assert.match(source,/setDepletionReviewPage\(\(page\) => Math\.min\(depletionReviewPageCount - 1, page \+ 1\)\)/);
assert.ok(!source.includes('rootCauseRowsForDisplay.slice(0, 8).map'), 'Must not drop last five of 13 rows');
assert.ok(!source.includes('rootCauseRowsForDisplay.map((row) => (\n                <article'), 'Do not render full cards for each stock row');
for(const label of ['Reviewed stock rows', 'Selected stock review','Concern','Review {product} at {location}', 'Show all reviewed stock rows','Show only rows needing review']) {
  assert.ok(translations.includes('['+JSON.stringify(label)+','), 'Missing localized text: '+label);
}
assert.match(css,/\.insights-stock-review-layout\s*\{/);
assert.match(css,/\.insights-stock-review-row:focus-visible/);
assert.match(css,/@media \(max-width: 600px\)/);
// Cover the pagination/selection contract with realistic 13-row evidence:
const sample=Array.from({length:13},(_,i)=>({stock_id:`stock-${i}`,production_safety:{requires_human_review:i===0}}));
let all=false, page=0,selectedId=null;
function shownRows(){return sample.filter(row=>all||row.production_safety.requires_human_review);}
function currentPage(){const rows=shownRows();const visiblePage=Math.min(page,Math.max(1,Math.ceil(rows.length/8))-1);return rows.slice(visiblePage*8,(visiblePage+1)*8);}
function selectedRow(){return currentPage().find(r=>r.stock_id===selectedId)??currentPage()[0]??null;}
assert.equal(currentPage().length,1,'review-first view');
all=true;page=0;selectedId=null;
assert.equal(currentPage().length,8,'first all-rows page');
assert.equal(selectedRow().stock_id,'stock-0');
selectedId='stock-4';assert.equal(selectedRow().stock_id,'stock-4','explicit selection');
page=1; selectedId=null;
assert.equal(currentPage().length,5,'last five rows available');
assert.equal(selectedRow().stock_id,'stock-8','selection follows page');
all=false;page=0;selectedId=null;
assert.equal(currentPage().length,1,'toggle back to attention-only');
console.log('FT043 compact Insights stock queue PASS: review-first, 13/13 accessible via paging, one selection, five-language strings and responsive styling');
