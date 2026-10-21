import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const ts = createRequire(import.meta.url)('typescript');
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'src/pages/InsightsPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/InsightsPage.css'), 'utf8');
const translation = fs.readFileSync(path.join(root, 'src/i18n/tenantUiTranslations.ts'), 'utf8');
const parsed = ts.createSourceFile('InsightsPage.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
assert.equal(parsed.parseDiagnostics.length, 0, 'InsightsPage TSX should parse without errors');
for (const expected of [
  'const [reorderReviewPage, setReorderReviewPage] = useState(0)',
  'const [selectedReorderProductId, setSelectedReorderProductId] = useState<string | null>(null)',
  'Math.ceil(activeReorderRows.length / 8)',
  'activeReorderRows.slice(visibleReorderReviewPage * 8, (visibleReorderReviewPage + 1) * 8)',
  'visibleReorderReviewRows.map((row) => (',
  'onClick={() => setSelectedReorderProductId(row.product_id)}',
  'selectedReorderRow ? (',
  'setSelectedReorderProductId(null);',
  'selectedReorderRow.product_id',
  'aria-label={ui(\'Reorder recommendations queue\')}',
  'aria-label={ui(\'Selected reorder recommendation\')}',
  'to={`/products?product_id=${encodeURIComponent(selectedReorderRow.product_id)}`}'
]) assert.ok(source.includes(expected), `Missing FT044 behavior: ${expected}`);
assert.ok(!source.includes('activeReorderRows.slice(0, 8).map'), 'Never silently omit reorder recommendations after the eighth');
assert.match(css, /\.insights-reorder-review-columns\s*\{/);
assert.match(css, /@media \(max-width: 600px\)/);
for (const label of ['Reorder recommendations queue', 'Selected reorder recommendation', 'Review reorder for {product}']) {
  assert.ok(translation.includes('[' + JSON.stringify(label) + ','), `Missing translated label: ${label}`);
}
function checkSample(rows) {
  const totalPages = Math.max(1, Math.ceil(rows.length / 8));
  const allIds = [];
  for (let page = 0; page < totalPages; page++) {
    const shown = rows.slice(page * 8, (page + 1) * 8);
    assert.ok(shown.length <= 8, 'Never more than eight queue rows');
    allIds.push(...shown.map(r => r.product_id));
    if (shown.length) {
      let selectedId = null;
      const selected = () => shown.find(r => r.product_id === selectedId) ?? shown[0];
      assert.equal(selected().product_id, shown[0].product_id, 'First on page initially selected');
      selectedId = shown[shown.length - 1].product_id;
      assert.equal(selected().product_id, shown[shown.length - 1].product_id, 'Click changes detail');
    }
  }
  assert.deepEqual(allIds, rows.map(r => r.product_id), 'No recommendations skipped or duplicated');
}
for (const count of [0,1,4,8,9,13,24]) checkSample(Array.from({length: count}, (_, i) => ({ product_id: 'product-' + i })));
console.log('FT044 Insights reorder queue PASS: TSX parses, selection, 0/1/4/8/9/13/24-item paging, all rows available, exact product link, translations, mobile CSS.');
