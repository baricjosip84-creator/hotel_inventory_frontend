import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
let passed = 0;
const check = (condition, label) => {
  if (!condition) throw new Error(`FAIL ${label}`);
  passed += 1;
  console.log(`PASS ${label}`);
};

const shipments = read('src/pages/ShipmentsPage.tsx');
const scanner = read('src/pages/ScannerPage.tsx');
const pkg = JSON.parse(read('package.json'));

check(shipments.includes("const focusShipmentDetail = useCallback"), 'Shipments has one reusable detail focus helper');
check(shipments.includes("document.getElementById('shipments-detail')"), 'focus helper targets the existing Selected Shipment panel');
check(shipments.includes("detail.scrollIntoView({ behavior, block: 'start' })"), 'focus helper brings Selected Shipment into view');
check(shipments.includes("detail.focus({ preventScroll: true })"), 'focus helper moves programmatic focus after scrolling');
check(shipments.includes("tabIndex={-1}"), 'Selected Shipment panel is programmatically focusable without adding a normal tab stop');
check(shipments.includes("aria-label={ui('Selected Shipment')}"), 'focused shipment detail retains a clear accessible label');
check(shipments.includes("scrollMarginTop: 104"), 'Selected Shipment focus target protects against the fixed workspace header');

check(shipments.includes("setWorkspaceSection('receiving');\n    setSelectedShipmentId(matchedShipment.id);"), 'scanner shipment handoff marks Receive & finalize as the active workspace');
check(shipments.includes("setSearchParams(nextParams, { replace: true });\n    focusShipmentDetail('smooth');"), 'scanner/barcode handoff focuses detail after consuming navigation params');
check(shipments.includes("[shipments, searchParams, setSearchParams, locale, ui, focusShipmentDetail]"), 'scanner handoff effect tracks the focus helper dependency');

check(shipments.includes("const selectShipment = (shipmentId: string) => {\n    setWorkspaceSection('receiving');"), 'direct shipment-card selection also enters the receiving workspace');
check(shipments.includes("setPageMessage(null);\n    focusShipmentDetail('smooth');\n  };"), 'direct shipment-card selection scrolls/focuses the opened record');

check(scanner.includes("navigate(`/shipments?shipmentId=${encodeURIComponent(shipment.id)}`)"), 'scanner still resolves a shipment through the existing shipmentId handoff');
check(shipments.includes("setPageMessage(ui('Shipment opened from scanner.'))"), 'scanner-specific success feedback remains intact');
check(shipments.includes("if (searchParams.get('source') === 'purchase-order' || searchParams.get('source') === 'dashboard')"), 'purchase-order and Dashboard handoffs remain isolated from scanner logic');

check(pkg.scripts?.['check:inventory-scanner-shipment-focus-surgical-fix-v349276'] === 'node scripts/check-scanner-shipment-focus-surgical-fix-v349276.mjs', 'Batch 034 guard is registered');

console.log(`Scanner -> shipment focus surgical fix: ${passed}/${passed} PASS`);
