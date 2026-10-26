/* FT191: source-backed reproduction of AppLayout scroll-reset race.
 * Requisition deep links already select and asynchronously focus the correct
 * reservation, but AppLayout delayed reset at 0/50/150/350ms hid it again.
 * No production navigation, database writes or network activity. */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const layout = fs.readFileSync('src/layouts/AppLayout.tsx', 'utf8');
const requisitions = fs.readFileSync('src/pages/InventoryRequisitionsPage.tsx', 'utf8');
const reservations = fs.readFileSync('src/pages/InventoryReservationsPage.tsx', 'utf8');
const packageMeta = JSON.parse(fs.readFileSync('package.json', 'utf8'));
let passed = 0;
const test = (label, action) => { action(); passed += 1; console.log(`PASS ${String(passed).padStart(2,'0')} ${label}`); };

const effectMatch = layout.match(/  useLayoutEffect\(\(\) => \{([\s\S]*?)\n  \}, \[location\.pathname, location\.hash\]\);/);
test('Real AppLayout scroll effect exists, and does not rerun for query changes', () => assert.ok(effectMatch));
const effect = `useLayoutEffect(() => {${effectMatch?.[1] || ''}\n});`;

function simulate(pathname, search, selectedRecordReadyAtMs = null, hash = '') {
  let now = 0;
  let token = 0;
  const work = new Map();
  const events = [];
  const schedule = (fn, delay) => { const id = ++token; work.set(id, { at: now + delay, fn }); return id; };
  const env = {
    URLSearchParams, location: { pathname, search, hash },
    forcePageScrollTop: () => events.push([now, 'RESET_TO_TOP']),
    scrollToRouteAnchor: (value) => { if (value) { events.push([now, 'SCROLL_ANCHOR']); return true; } return false; },
    useLayoutEffect: fn => { env.cleanup = fn(); },
    window: {
      requestAnimationFrame: fn => schedule(fn, 16), cancelAnimationFrame: id => work.delete(id),
      setTimeout: schedule, clearTimeout: id => work.delete(id)
    }
  };
  vm.runInNewContext(effect, env, { timeout: 2000 });
  if (selectedRecordReadyAtMs !== null) schedule(() => events.push([now, 'DETAIL_FOCUSED']), selectedRecordReadyAtMs);
  while (work.size) {
    const [id, job] = [...work.entries()].sort((a,b) => a[1].at-b[1].at || a[0]-b[0])[0];
    work.delete(id); now = job.at; job.fn();
  }
  env.cleanup?.();
  return events.map(([,kind]) => kind);
}
for (const delay of [20, 80, 200, 600]) {
  test(`Reservation ID deep link retains async focused detail after ${delay}ms`, () =>
    assert.deepEqual(simulate('/inventory-reservations','?reservationId=exact-123', delay), ['DETAIL_FOCUSED']));
}
test('Second navigation to same linked reservation remains focused', () =>
  assert.deepEqual(simulate('/inventory-reservations','?reservationId=exact-123', 70), ['DETAIL_FOCUSED']));
test('F5 reload linked reservation remains focused', () =>
  assert.deepEqual(simulate('/inventory-reservations','?reservationId=exact-123', 210), ['DETAIL_FOCUSED']));
test('Legacy snake_case reservation_id link remains supported', () =>
  assert.deepEqual(simulate('/inventory-reservations','?reservation_id=legacy-123', 30), ['DETAIL_FOCUSED']));
test('Whitespace-only deep-link still resets to the top', () =>
  assert.deepEqual(simulate('/inventory-reservations','?reservationId=%20'), Array(6).fill('RESET_TO_TOP')));
test('Ordinary Reservations navigation still resets to the top', () =>
  assert.deepEqual(simulate('/inventory-reservations',''), Array(6).fill('RESET_TO_TOP')));
test('Unrelated route with reservationId still resets to the top', () =>
  assert.deepEqual(simulate('/reports','?reservationId=exact-123'), Array(6).fill('RESET_TO_TOP')));
test('Inherited Stock deep link still has race protection', () =>
  assert.deepEqual(simulate('/stock','?stock_id=a', 90), ['DETAIL_FOCUSED']));
test('Inherited Alerts queue link still has race protection', () =>
  assert.deepEqual(simulate('/alerts','?focus_queue=true', 90), ['DETAIL_FOCUSED']));
test('Existing hash anchors continue to navigate to their section', () =>
  assert.deepEqual(simulate('/reports','',null,'#monthly'), Array(6).fill('SCROLL_ANCHOR')));
test('Requisitions links to exact selected linked reservation ID', () =>
  assert.match(requisitions, /navigate\(`\/inventory-reservations\?reservationId=\$\{encodeURIComponent\(linkedReservation\.id\)\}\`\)/));
test('Reservations reads both exact-ID query parameter variants', () =>
  assert.match(reservations, /selectedRecordId\(searchParams, 'reservationId', 'reservation_id'\)/));
test('Reservations focus awaits matching async record and remains accessible', () => {
  assert.match(reservations,/detailQuery\.data\.id !== selectedReservationId/);
  assert.match(reservations,/reservationDetailRef\.current\?\.scrollIntoView/);
  assert.match(reservations,/reservationDetailRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
});
test('Regression registered as npm run check:ft191-reservation-deep-link-timing', () =>
  assert.equal(packageMeta.scripts['check:ft191-reservation-deep-link-timing'], 'node scripts/check-ft191-reservation-deep-link-timing.mjs'));
console.log(`FT191 linked-reservation navigation timing: ${passed}/${passed} PASS`);
