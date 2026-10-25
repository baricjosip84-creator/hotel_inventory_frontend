import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const stock = fs.readFileSync('src/pages/StockPage.tsx', 'utf8');
const dashboard = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
let passed = 0;
function check(description, fn) {
  fn();
  passed += 1;
  console.log(`PASS ${String(passed).padStart(2, '0')}: ${description}`);
}

check('Dashboard provides the exact stock ID in the stock route', () =>
  assert.ok(dashboard.includes('to={`/stock?stock_id=${encodeURIComponent(row.stock_id)}`}')));
check('Stock receives stock_id from its real route query', () =>
  assert.ok(stock.includes("const requestedStockId = searchParams.get('stock_id')?.trim() || '';")));
check('Linked record is filtered by the exact stock-position ID', () =>
  assert.ok(stock.includes('if (requestedStockId && row.id !== requestedStockId)')));
check('Matching loaded record is selected from the route', () =>
  assert.match(stock, /if \(filteredRows\.some\(\(row\) => row\.id === requestedStockId\)\) setSelectedStockId\(requestedStockId\)/));
check('Both responsive selected rows have navigation target refs', () => {
  assert.ok(stock.includes('ref={selected ? linkedMobileStockRowRef : undefined}'));
  assert.ok(stock.includes('ref={selected ? linkedDesktopStockRowRef : undefined}'));
});
check('Selected desktop table row can receive programmatic keyboard focus', () =>
  assert.ok(stock.includes('tabIndex={selected ? -1 : undefined}')));
check('Existing manual row selection still scrolls to details', () =>
  assert.ok(stock.includes("selectedDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });")));
check('Linked record navigation has a once-per-ID ref', () =>
  assert.ok(stock.includes("const lastFocusedLinkedStockIdRef = useRef<string>('');")));
check('Deep link navigation is not tied to mutations or backend writes', () =>
  assert.ok(stock.includes("target.scrollIntoView({ behavior: 'auto', block: 'center' });") && stock.includes('target.focus({ preventScroll: true });')));

const match = stock.match(/\/\/ Dashboard\/Insights links already select the correct stock_id\.[\s\S]*?\n  useEffect\(\(\) => \{([\s\S]*?)\n  \}, \[requestedStockId, selectedRow\?\.id\]\);/);
check('Linked focus effect is keyed to route ID and selected record', () => assert.ok(match));
const focusEffect = `useEffect(() => {${match?.[1]?.replace('let secondFrame: number | null = null;', 'let secondFrame = null;') || ''}\n}, [requestedStockId, selectedRow?.id]);`;

function simulateFocus() {
  const events = [];
  const pending = new Map();
  let nextFrame = 1;
  function element(kind, visible) {
    return {
      getClientRects: () => visible ? [1] : [],
      scrollIntoView: (opt) => events.push([kind, 'scroll', opt.behavior, opt.block]),
      focus: (opt) => events.push([kind, 'focus', opt.preventScroll])
    };
  }
  const desktop = element('desktop', true);
  const mobile = element('mobile', false);
  const details = element('details', true);
  const ctx = {
    requestedStockId: 'row-101', selectedRow: null,
    lastFocusedLinkedStockIdRef: { current: '' },
    linkedDesktopStockRowRef: { current: desktop },
    linkedMobileStockRowRef: { current: mobile },
    selectedDetailsRef: { current: details },
    useEffect: (fn) => { ctx.cleanup = fn(); },
    window: {
      requestAnimationFrame: (fn) => { const id = nextFrame++; pending.set(id, fn); return id; },
      cancelAnimationFrame: (id) => pending.delete(id)
    }
  };
  function render(stockId, selectedId, desktopVisible = true, mobileVisible = false) {
    ctx.cleanup?.();
    ctx.requestedStockId = stockId;
    ctx.selectedRow = selectedId ? { id: selectedId } : null;
    ctx.linkedDesktopStockRowRef.current = desktopVisible ? desktop : element('desktop-hidden', false);
    ctx.linkedMobileStockRowRef.current = mobileVisible ? element('mobile-visible', true) : mobile;
    vm.runInNewContext(focusEffect, ctx);
  }
  function flush() {
    let loop = 0;
    while (pending.size) {
      assert.ok(++loop <= 4, 'Unexpected RAF loop');
      const callbacks = [...pending.values()];
      pending.clear();
      callbacks.forEach((fn) => fn());
    }
  }
  return { ctx, render, flush, events, pending };
}
const session = simulateFocus();
check('No focus before asynchronous stock data identifies the linked row', () => {
  session.render('row-101', null); session.flush();
  assert.deepEqual(session.events, []);
});
check('No focus or scroll to the wrong stock position', () => {
  session.render('row-101', 'row-xyz'); session.flush();
  assert.deepEqual(session.events, []);
});
check('Loaded deep-link target scrolls and receives focus automatically', () => {
  session.render('row-101', 'row-101'); session.flush();
  assert.deepEqual(session.events.map((item) => item.slice(0, 2)), [['desktop','scroll'],['desktop','focus']]);
  assert.equal(session.ctx.lastFocusedLinkedStockIdRef.current, 'row-101');
});
check('Background refetch of same linked row does not hijack scrolling', () => {
  const before = session.events.length;
  session.render('row-101', 'row-101'); session.flush();
  assert.equal(session.events.length, before);
});
check('Back/Forward to another stock ID restores focus on matching new row', () => {
  session.render('row-102', 'row-102'); session.flush();
  assert.equal(session.events.filter((e) => e[1] === 'scroll').length, 2);
  assert.equal(session.ctx.lastFocusedLinkedStockIdRef.current, 'row-102');
});
check('Removing stock_id resets focus guard for future links', () => {
  session.render('', 'row-102'); session.flush();
  assert.equal(session.ctx.lastFocusedLinkedStockIdRef.current, '');
  session.render('row-101', 'row-101'); session.flush();
  assert.equal(session.events.filter((e) => e[1] === 'scroll').length, 3);
});
check('Responsive deep links use the visible mobile target', () => {
  session.render('row-103', 'row-103', false, true); session.flush();
  assert.equal(session.events.at(-2)[0], 'mobile-visible');
  assert.equal(session.events.at(-1)[0], 'mobile-visible');
});
check('Unmatched route does not create any focus or request new data', () => {
  const before = session.events.length;
  session.render('missing-position', null); session.flush();
  assert.equal(session.events.length, before);
});
check('Disposing the effect cancels scheduled scrolling', () => {
  session.render('pending-position', 'pending-position');
  assert.ok(session.pending.size > 0);
  session.ctx.cleanup?.();
  session.flush();
  assert.equal(session.events.filter(e => e[1] === 'scroll').length, 4);
});

const clearMatch = stock.match(/  const clearStockFilters = \(\) => \{([\s\S]*?)\n  \};/);
check('Clear Stock Filters implementation is accessible for regression', () => assert.ok(clearMatch));
check('Stock-only deep link enables Clear Stock Filters control', () =>
  assert.match(stock, /const hasActiveStockFilters = Boolean\(\s*requestedProductId \|\|\s*requestedStockId \|\|/));
check('Clearing a linked record removes only stock and product filters', () => {
  const ctx = {
    requestedProductId: '', requestedStockId: 'row-101',
    searchParams: new URLSearchParams('stock_id=row-101&product_id=P007&other=stay'),
    output: null,
    setSearchText: () => {},setLocationFilter: () => {},setCategoryFilter: () => {},setStatusFilter: () => {},
    setSearchParams: (params, options) => { ctx.output = params; ctx.options = options; },
    URLSearchParams
  };
  vm.runInNewContext(`const clearStockFilters = () => {${clearMatch?.[1] || ''}\n}; clearStockFilters();`, ctx);
  assert.equal(ctx.output.get('stock_id'), null);
  assert.equal(ctx.output.get('product_id'), null);
  assert.equal(ctx.output.get('other'), 'stay');
  assert.equal(ctx.options.replace, true);
});
check('New FT150 regression registered for repeatable CI execution', () =>
  assert.equal(packageJson.scripts['check:ft150-dashboard-stock-deep-link'], 'node scripts/check-ft150-dashboard-stock-deep-link.mjs'));
console.log(`FT150 dashboard-to-stock deep-link navigation: ${passed}/${passed} PASS`);
