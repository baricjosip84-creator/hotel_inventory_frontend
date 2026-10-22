import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = fs.readFileSync(path.join(root, 'src/pages/ReportsPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/ReportsPage.css'), 'utf8');
const ledger = page.split("{activeTab === 'movement-ledger' ? (")[1]?.split("{activeTab === 'inventory-variance' ? (")[0] || '';
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`PASS ${passed}: ${name}`); }
check('Movement Ledger exists', () => assert.ok(ledger.includes('ledgerRows.map((row) =>')));
check('Known historical units retain signed quantity formatting', () => assert.match(ledger, /row\.product_unit\s*\? formatSignedQuantity\(row\.quantity_change, locale, ui, row\.product_unit\)/));
check('Unknown unit does not masquerade as current unit beside signed number', () => assert.doesNotMatch(ledger, /formatSignedQuantity\(row\.quantity_change, locale, ui, row\.product_unit \|\| ui\("Historical unit unavailable"\)\)/));
check('Missing unit renders as separate text block', () => assert.match(ledger, /className="reports-subtext reports-ledger-missing-unit"/));
check('Numeric sign preserved for positive change', () => assert.match(ledger, /toNumber\(row\.quantity_change\) > 0 \? '\+' : ''/));
check('Missing unit is not fabricated', () => assert.match(ledger, /ui\("Historical unit unavailable"\)/));
check('Other movement fields and filters remain intact', () => {assert.match(ledger, /ledgerFilters\.location/); assert.match(ledger, /humanizeMovementType\(row\.movement_type, ui\)/);});
check('Number cannot break mid-number', () => assert.match(css, /\.reports-ledger-signed-number\s*\{[^}]*white-space:\s*nowrap/));
check('Missing unit label wraps inside table cell', () => assert.match(css, /\.reports-ledger-missing-unit\s*\{[^}]*overflow-wrap:\s*anywhere/));
check('Original movement ledger data endpoint remains intact', () => assert.match(page, /`\/reports\/movement-ledger\$\{buildQueryString\(filters\)\}`/));
console.log(`${passed}/${passed} FT062 source checks PASS`);
