import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let checks = 0;
const check = (condition, label) => { assert.ok(condition, label); checks += 1; };
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const files = [
  'src/pages/InsightsPage.tsx',
  'src/pages/products/ProductListPanel.tsx',
  'src/pages/products/ProductListTablePanel.tsx',
  'src/pages/products/scrollToFocusedProductRow.ts'
];
for (const file of files) {
  const content = read(file);
  const ast = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  check(ast.parseDiagnostics.length === 0, `${file} parses`);
}
const js = ts.transpileModule(read(files[3]), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const { productRowAnchorId, scrollToFocusedProductRow } = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(js));
check(productRowAnchorId('p/x? y') === 'product-row-p%2Fx%3F%20y', 'IDs safely map to unique row anchors');
const visited = [];
const found = scrollToFocusedProductRow('p/x? y', (id) => {
  visited.push(id);
  return { scrollIntoView: (options) => visited.push(options) };
});
check(found && visited[0] === 'product-row-p%2Fx%3F%20y', 'exact requested product row is located');
check(visited[1].block === 'center' && visited[1].behavior === 'auto', 'exact row is scrolled into visible center');
check(!scrollToFocusedProductRow('not-found', () => null), 'missing product does not scroll');
check(!scrollToFocusedProductRow('  ', () => { throw Error('should not resolve empty ID'); }), 'blank product ID never scrolls');
const insights = read(files[0]);
check(insights.includes('to={`/products?product_id=${encodeURIComponent(selectedReorderRow.product_id)}`}'), 'Insights link preserves exact product ID and old regression guard');
const panel = read(files[1]);
check(panel.includes('focusedProductId={focusedProductId}'), 'selected product ID is passed to rendered table');
const table = read(files[2]);
for (const snippet of [
  'id={productRowAnchorId(product.id)}',
  'product.id === focusedProductId',
  'products.some((product) => product.id === focusedProductId)',
  'scrollToFocusedProductRow(focusedProductId)',
  'window.requestAnimationFrame(reveal)',
  'window.setTimeout(reveal, 420)',
  'window.clearTimeout(settled)',
  'window.cancelAnimationFrame(frame)'
]) check(table.includes(snippet), `selected-row rendering/reveal retains: ${snippet}`);
check(read('src/pages/products/ProductsPage.css').includes('.products-linked-product-row'), 'selected row visually highlighted');
console.log(`PASS ${checks}/${checks} FT061 exact-product anchor and async scrolling regression`);
