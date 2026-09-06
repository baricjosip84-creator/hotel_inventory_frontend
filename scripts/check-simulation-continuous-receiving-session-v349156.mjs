#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const scanner = read('src/pages/ScannerPage.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(read('package.json'));
const failures = [];
let passed = 0;
const check = (condition, message) => {
  if (!condition) failures.push(message);
  else { console.log(`PASS ${message}`); passed += 1; }
};

check(scanner.includes("apiRequest<{ shipment: ScannerShipmentContext }>(`/shipments/${encodeURIComponent(shipmentId)}`)"), 'scanner loads the real shipment detail envelope');
check(scanner.includes('return payload.shipment;'), 'scanner unwraps shipment detail instead of treating the envelope as a shipment');
check(scanner.includes('version: number;'), 'scanner shipment context carries optimistic version evidence');
check(scanner.includes("`/shipments/${encodeURIComponent(match.shipment_id)}/receive`"), 'simple scans receive directly inside the scanner session');
check(scanner.includes("'If-Match-Version': String(currentVersion)"), 'scanner direct receiving is version protected');
check(scanner.includes("storage_location_id: locationId"), 'scanner direct receiving preserves the verified destination location');
check(scanner.includes('const needsDetailedReceiving = Boolean('), 'scanner explicitly separates simple receiving from tracked-detail receiving');
check(scanner.includes('match.serial_tracking?.require_on_receipt'), 'serial-required receiving still hands off to detailed workflow');
check(scanner.includes('match.product?.requires_lot_tracking'), 'lot/batch-required receiving remains guarded');
check(scanner.includes('match.product?.requires_expiry_date'), 'expiry-required receiving remains guarded');
check(scanner.includes('navigate(`/shipments?${params.toString()}`);'), 'tracked receiving still opens the shipment form with scanner evidence');
check(scanner.includes('setSessionScanCount((count) => count + 1)'), 'receiving session counts successful scans');
check(scanner.includes('setSessionPackageCount((count) => count + 1)'), 'receiving session counts successful package receipts');
check(scanner.includes('setSessionUnitCount((count) => count + quantityToReceive)'), 'receiving session counts received base units');
check(scanner.includes('ui("Receiving session")') && scanner.includes('ui("Scans received")') && scanner.includes('ui("Units received")'), 'session totals are visible to the operator');
check(scanner.includes('ui("Scan Next Item")'), 'operator can scan the next identical package without reopening Scanner');
check(scanner.includes('ui("Finish receiving")'), 'operator has an explicit session finish action');
check(scanner.includes('isResolving || isReceivingScan || isDecodingImage'), 'new scans are blocked while a receive mutation is in flight');
check(scanner.includes('quantityToReceive > remaining'), 'full-package receiving cannot over-receive the shipment line');
check(scanner.includes("await shipmentContextQuery.refetch();"), 'shipment version/context is refreshed after each direct receipt');
check(scanner.includes("invalidateQueries({ queryKey: ['stock'] })"), 'scanner receipt refreshes stock-dependent surfaces');
check(!scanner.includes('void startScanner(true)') && !scanner.includes('await startScanner(true)'), 'camera is not auto-restarted into duplicate identical-barcode receipt risk');
for (const key of ['Receiving session','Scans received','Packages received','Units received','Scan Next Item','Finish receiving','Receiving scanned item...']) {
  check(translations.includes(`["${key}"`), `five-language catalog includes ${key}`);
}
check(pkg.scripts['check:ci'].includes('npm run check:simulation-continuous-receiving-session-v349156'), 'frontend check:ci runs the v156 scanner guard');

if (failures.length) {
  console.error('v3.49.156 continuous receiving session guard failed:');
  failures.forEach((f) => console.error(`- ${f}`));
  process.exit(1);
}
console.log(`v3.49.156 continuous receiving session: ${passed}/${passed} PASS`);
