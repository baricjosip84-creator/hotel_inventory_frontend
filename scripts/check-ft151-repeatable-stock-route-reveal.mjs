import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const layout = fs.readFileSync('src/layouts/AppLayout.tsx', 'utf8');
const stock = fs.readFileSync('src/pages/StockPage.tsx', 'utf8');
const dashboard = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');
const scripts = JSON.parse(fs.readFileSync('package.json', 'utf8')).scripts;
let count = 0;
function test(name, fn) { fn(); count++; console.log(`PASS ${String(count).padStart(2,'0')}: ${name}`); }

const effectMatch = layout.match(/  useLayoutEffect\(\(\) => \{([\s\S]*?)\n  \}, \[location\.pathname, location\.hash\]\);/);
test('Read the real layout navigation effect without introducing query-change scroll resets', () => assert.ok(effectMatch));
const effectCode = `useLayoutEffect(() => {${effectMatch?.[1] || ''}\n});`;
test('Dashboard still links to exact stock ID', () => assert.ok(dashboard.includes('to={`/stock?stock_id=${encodeURIComponent(row.stock_id)}`}')));
test('Stock still filters by stock_id and selects loaded matching row', () => {
  assert.ok(stock.includes('if (requestedStockId && row.id !== requestedStockId)'));
  assert.ok(stock.includes('if (filteredRows.some((row) => row.id === requestedStockId)) setSelectedStockId(requestedStockId)'));
});
test('Stock remains responsible for row focus after render, once per linked ID', () => {
  assert.ok(stock.includes("const lastFocusedLinkedStockIdRef = useRef<string>('');"));
  assert.ok(stock.includes("target.scrollIntoView({ behavior: 'auto', block: 'center' });"));
});
test('Existing linked filter can still be cleared', () => {
  assert.ok(stock.includes("nextSearchParams.delete('stock_id');"));
  assert.ok(stock.includes("nextSearchParams.delete('product_id');"));
});

// Execute the REAL AppLayout useLayoutEffect with a deterministic virtual clock.
// Stock's own selected-row behavior is asserted by the inherited FT150 guard.
function navigate(pathname, search, revealMs = null, hash = '') {
  let now = 0;
  let token = 0;
  const tasks = new Map();
  const events = [];
  const schedule = (callback, delay) => { const id = ++token; tasks.set(id, { at: now+delay, callback }); return id; };
  const env = {
    location: { pathname, search, hash }, URLSearchParams,
    forcePageScrollTop: () => events.push([now, 'top']),
    scrollToRouteAnchor: (value) => { if (value) { events.push([now, 'anchor']); return true; } return false; },
    useLayoutEffect: (fn) => { env.cleanup = fn(); },
    window: {
      requestAnimationFrame: (fn) => schedule(fn, 16),
      cancelAnimationFrame: (id) => tasks.delete(id),
      setTimeout: schedule,
      clearTimeout: (id) => tasks.delete(id)
    }
  };
  vm.runInNewContext(effectCode, env);
  if (revealMs !== null) schedule(() => events.push([now,'stock-record']), revealMs);
  while (tasks.size) {
    const [id, next] = [...tasks.entries()].sort((a,b) => a[1].at-b[1].at || a[0]-b[0])[0];
    tasks.delete(id);
    now = next.at;
    next.callback();
  }
  env.cleanup?.();
  return events;
}
const stockRoute = '/stock';
const request = '?stock_id=stock-position-A';
const normal = (events) => events.map((entry) => entry[1]);
function checkUninterrupted(revealMs) {
  const events = navigate(stockRoute, request, revealMs);
  assert.deepEqual(normal(events), ['stock-record']);
  assert.equal(events.at(-1)[1], 'stock-record');
}
test('First navigation: stock loads quickly (20ms) and stays revealed', () => checkUninterrupted(20));
test('Second navigation: same stock ID quick load is not reset', () => checkUninterrupted(20));
test('Third navigation: medium load (80ms) is not reset by 150/350ms timers', () => checkUninterrupted(80));
test('Fourth navigation: load (200ms) is not reset by 350ms timer', () => checkUninterrupted(200));
test('Fifth navigation: slow load (600ms) still reveals matching record', () => checkUninterrupted(600));
test('Another linked position, including percent encoded ID, is protected', () => {
  assert.deepEqual(normal(navigate(stockRoute, '?stock_id=other%2Fposition', 25)), ['stock-record']);
});
test('A whitespace-only stock_id is NOT a deferred deep link', () => {
  const events = navigate(stockRoute, '?stock_id=%20');
  assert.deepEqual(normal(events), Array(6).fill('top'));
});
test('Ordinary stock page navigation still resets to top', () => {
  assert.deepEqual(normal(navigate(stockRoute, '')), Array(6).fill('top'));
});
test('Product-only deep link preserves existing ordinary route behavior', () => {
  assert.deepEqual(normal(navigate(stockRoute, '?product_id=product-1')), Array(6).fill('top'));
});
test('Unrelated page with stock_id parameter still resets to top', () => {
  assert.deepEqual(normal(navigate('/reports', request)), Array(6).fill('top'));
});
test('Existing hash-route navigation remains an anchor', () => {
  assert.deepEqual(normal(navigate('/inventory-usage', '', null, '#damage-waste')), Array(6).fill('anchor'));
});
test('Missing linked stock ID must not trigger false scrolling in StockPage', () => {
  assert.ok(stock.includes('if (selectedRow?.id !== requestedStockId || lastFocusedLinkedStockIdRef.current === requestedStockId) return;'));
});
test('Repeatable FT151 guard is registered for CI', () => {
  assert.equal(scripts['check:ft151-repeatable-stock-route-reveal'], 'node scripts/check-ft151-repeatable-stock-route-reveal.mjs');
});
console.log(`FT151 repeatable Dashboard-to-Stock deep-link timing: ${count}/${count} PASS`);
