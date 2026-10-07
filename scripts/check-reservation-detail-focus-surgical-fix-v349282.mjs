import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const file = fs.readFileSync(path.join(root, 'src/pages/InventoryReservationsPage.tsx'), 'utf8');

const checks = [
  ['useRef imported', /import \{[^}]*useRef[^}]*\} from 'react'/],
  ['reservation detail ref exists', /reservationDetailRef = useRef<HTMLElement \| null>\(null\)/],
  ['last-focused reservation guard exists', /lastFocusedReservationIdRef = useRef\(''\)/],
  ['focus waits for exact loaded reservation', /detailQuery\.data\.id !== selectedReservationId/],
  ['same reservation refresh does not refocus', /lastFocusedReservationIdRef\.current === selectedReservationId/],
  ['new selection is remembered before focus', /lastFocusedReservationIdRef\.current = selectedReservationId/],
  ['post-render scheduling used', /requestAnimationFrame/],
  ['detail scrolls into view', /reservationDetailRef\.current\?\.scrollIntoView\(\{ behavior: 'smooth', block: 'start' \}\)/],
  ['detail receives programmatic focus', /reservationDetailRef\.current\?\.focus\(\{ preventScroll: true \}\)/],
  ['animation-frame cleanup exists', /cancelAnimationFrame/],
  ['detail panel owns focus ref', /ref=\{reservationDetailRef\}/],
  ['detail panel is outside normal tab order', /id="reservation-detail"[\s\S]*?tabIndex=\{-1\}/],
  ['detail panel has accessible label', /aria-label=\{ui\("Reservation detail"\)\}/],
  ['fixed-header scroll margin exists', /scrollMarginTop: '104px'/],
  ['queue Open still selects exact reservation', /onClick=\{\(\) => handleSelectReservation\(reservation\.id\)\}/],
  ['exact reservation deep-link remains supported', /searchParams\.get\('reservationId'\)[\s\S]*?setSelectedReservationId\(reservationIdFromUrl\)/],
];

let pass = 0;
for (const [name, re] of checks) {
  const ok = re.test(file);
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}`);
  if (ok) pass += 1;
}
console.log(`\n${pass}/${checks.length} PASS`);
if (pass !== checks.length) process.exit(1);
