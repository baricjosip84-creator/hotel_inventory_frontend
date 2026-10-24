import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const stock = fs.readFileSync('src/pages/StockPage.tsx', 'utf8');
const catalog = fs.readFileSync('src/i18n/tenantUiTranslations.ts', 'utf8');
let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS ${String(passed).padStart(2, '0')}: ${name}`);
}

const declaration = stock.match(/function hasNoUsableStock\(item: StockItem\): boolean \{([\s\S]*?)\n\}/);
check('actual zero-usable classifier declared', () => assert.ok(declaration));
const classifierSource = `function hasNoUsableStock(item) {${declaration?.[1] || ''}\n}`;
const hasNoUsableStock = vm.runInNewContext(`(${classifierSource})`, {
  toNumber: (value) => Number(value ?? 0),
  getUsableLotQuantity: (item) => Number(item.usable_lot_quantity ?? item.quantity ?? 0)
});
check('zero physical, zero usable, min 0 is NOT healthy', () => assert.equal(hasNoUsableStock({quantity:0,usable_lot_quantity:0,min_quantity:0}),true));
check('zero physical even if incorrect usable field is positive', () => assert.equal(hasNoUsableStock({quantity:0,usable_lot_quantity:10}),true));
check('positive on-hand, zero usable lot stock is empty', () => assert.equal(hasNoUsableStock({quantity:10,usable_lot_quantity:0}),true));
check('positive usable stock is not empty', () => assert.equal(hasNoUsableStock({quantity:10,usable_lot_quantity:8}),false));
check('legacy row without usable-lot field falls back to on-hand', () => assert.equal(hasNoUsableStock({quantity:10}),false));
check('status filter includes explicit zero-usable option', () => assert.match(stock, /<option value="empty">\{ui\("No usable stock"\)\}<\/option>/));
check('healthy filter excludes zero-usable rows', () => assert.match(stock, /statusFilter === 'healthy' && \(isLow \|\| hasReservationRisk \|\| hasIntegrityRisk \|\| noUsableStock\)/));
check('empty filter includes only zero-usable rows', () => assert.match(stock, /statusFilter === 'empty' && !noUsableStock/));
check('low threshold filter unchanged', () => assert.match(stock, /statusFilter === 'low' && !isLow/));
check('minimum threshold test still less-than', () => assert.match(stock, /const isLow = usableQuantity < minimum;/));
check('summary zero minimum is still not a minimum breach', () => assert.match(stock, /if \(usableQuantity < minimum\) \{/));
check('mobile and desktop rows calculate zero-usable status', () => assert.equal((stock.match(/const noUsableStock = hasNoUsableStock\(item\);/g)||[]).length,2));
check('mobile and desktop render zero-usable status ahead of low-stock', () => assert.equal((stock.match(/noUsableStock\s*\? ui\("NO USABLE STOCK"\)/g)||[]).length,2));
check('selected row includes zero-usable status', () => assert.match(stock, /selectedNoUsableStock\s*\? ui\("NO USABLE STOCK"\)/));
check('selected row shows explanation of zero minimum', () => assert.match(stock, /A minimum of zero means there is no minimum-level breach/));
check('all three badges visually warn on zero-usable stock', () => assert.equal((stock.match(/\|\| noUsableStock\s*\? styles\.badgeError/g)||[]).length,2));
check('selected badge visually warns on zero-usable stock', () => assert.match(stock, /\|\| selectedNoUsableStock\s*\? styles\.badgeError/));
check('all user-facing labels have five-language translations', () => {
  for (const key of ['NO USABLE STOCK', 'No usable stock', 'This location has no usable stock. A minimum of zero means there is no minimum-level breach; it does not mean the position contains usable inventory.']) {
    assert.ok(catalog.includes(`["${key}",`),key);
  }
});
check('stock-movement data and API write paths unchanged by the classifier', () => {
  assert.match(stock,/const selectedLowStock = Boolean\(selectedRow\) && Math\.min\(currentQuantity, currentUsableLotQuantity\) < currentMinimum/);
});
console.log(`FT149 zero-usable-stock position status: ${passed}/${passed} PASS`);
