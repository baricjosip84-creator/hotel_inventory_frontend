import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
const check = (name, condition) => checks.push({ name, condition: Boolean(condition) });

const returns = read('src/components/enterpriseInventory/tabs/SupplierReturnsTab.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');
const pkg = read('package.json');

check('eligible lot model carries serial tracking flag', returns.includes('serial_tracking_enabled?: boolean;'));
check('eligible lot model carries serial list', returns.includes('serial_numbers?: string[];'));
check('return history item carries serial list', /type SupplierReturnItem =[\s\S]{0,800}serial_numbers\?: string\[\];/.test(returns));
check('draft return line preserves serial list', /type DraftReturnItem =[\s\S]{0,220}serial_numbers: string\[\];/.test(returns));
check('supplier return uses shared serial parser', returns.includes("parseSerialNumbersInput(lineSerialNumbers)"));
check('serial-tracked return enforces whole quantity', returns.includes('Serial-tracked supplier returns require a whole-number quantity.'));
check('serial-tracked return enforces exact serial count', returns.includes('Select exactly {count} serial number(s) from this received lot.'));
check('serial selection is constrained to received lot', returns.includes('const availableSerials = new Set(selectedLot.serial_numbers ?? [])'));
check('non-tracked return rejects serial input', returns.includes('Serial numbers can only be entered for a serial-tracked product.'));
check('return API payload sends serial numbers', /items: draftItems\.map[\s\S]{0,220}serial_numbers: item\.serial_numbers/.test(returns));
check('serial input is shown only for tracked lot', returns.includes('selectedLot?.serial_tracking_enabled'));
check('available lot serials are shown to operator', returns.includes('Available serials for this lot: {serials}'));
check('draft table shows selected serials', returns.includes("item.serial_numbers.length ? item.serial_numbers.join(', ') : '—'"));
check('return history shows preserved serials', returns.includes("ui('Serials: {serials}')"));
check('serial input resets after line creation', returns.includes("setLineSerialNumbers('');"));
check('new serial-return messages are multilingual', translations.includes('Serial-tracked supplier returns require a whole-number quantity.') && translations.includes('Available serials for this lot: {serials}'));
check('v141 checker wired into check:ci', pkg.includes('check:simulation-physical-identifier-lifecycle-integrity-v349141'));

let passed = 0;
for (const item of checks) {
  if (item.condition) { passed += 1; console.log(`PASS ${item.name}`); }
  else console.error(`FAIL ${item.name}`);
}
console.log(`v3.49.141 physical identifier lifecycle integrity frontend: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);
