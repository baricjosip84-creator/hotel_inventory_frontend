import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const supplierSource = read('src/pages/SuppliersPage.tsx');
const storageSource = read('src/pages/StorageLocationsPage.tsx');
const importSource = read('src/components/imports/InventoryCsvImportPanel.tsx');

const rows = [];
for (const line of translationSource.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(',')) continue;
  try {
    const row = JSON.parse(trimmed.slice(0, -1));
    if (Array.isArray(row) && row.length === 5 && row.every((item) => typeof item === 'string')) rows.push(row);
  } catch {
    // Non-row TypeScript syntax is ignored.
  }
}

const catalogKeys = rows.map((row) => row[0]);
const uniqueKeys = new Set(catalogKeys);
if (catalogKeys.length !== uniqueKeys.size) {
  const seen = new Set();
  const duplicates = [...new Set(catalogKeys.filter((key) => seen.has(key) || !seen.add(key)))];
  fail(`Tenant UI translation catalog has duplicate English keys: ${duplicates.join(', ')}`);
} else {
  pass(`Tenant UI catalog has ${catalogKeys.length} unique five-language rows.`);
}

const literalUiPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function literalUiKeys(source) {
  const keys = [];
  for (const match of source.matchAll(literalUiPattern)) {
    const literal = match[1];
    try {
      const value = JSON.parse(literal.startsWith("'")
        ? `"${literal.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
        : literal);
      keys.push(value);
    } catch {
      // The current target files use simple quoted literals; ignore any future complex literal here.
    }
  }
  return keys;
}

for (const [label, source] of [
  ['Suppliers', supplierSource],
  ['Storage Locations', storageSource],
  ['CSV import', importSource]
]) {
  if (!source.includes('useAppTranslation')) fail(`${label} surface must use the shared translation context.`);
  const keys = literalUiKeys(source);
  const missing = [...new Set(keys.filter((key) => !uniqueKeys.has(key)))];
  if (missing.length) fail(`${label} has ui() literals missing from the five-language catalog: ${missing.join(' | ')}`);
  else pass(`${label} has ${new Set(keys).size} catalog-backed literal UI keys.`);
}

const requiredRows = [
  'Supplier workspace', 'Bulk Supplier Import', 'Delivery Follow-up', 'Supplier Performance:',
  'Storage location workspace', 'Bulk Storage Location Import', 'Condition Labels to Review',
  'Choose a CSV file.', 'Commit Validated Import', 'Showing the first 100 validation problems.',
  'Ambient', 'Refrigerated', 'Frozen', 'Not classified'
];
for (const key of requiredRows) {
  if (!uniqueKeys.has(key)) fail(`Missing representative supplier/storage translation row: ${key}`);
}
if (!process.exitCode) pass(`${requiredRows.length} representative supplier/storage/import rows are present in all five locales.`);

if (!supplierSource.includes("formatLocalizedDate") || !supplierSource.includes('formatLocalizedNumber')) {
  fail('Suppliers must use locale-aware date and number formatting.');
}
if (!supplierSource.includes('{ui(accessRoleLabel)}')) fail('Suppliers built-in access role label must translate at display time.');
if (supplierSource.includes('>Add supplier<') || supplierSource.includes("setFormMessage('Supplier created successfully.')")) {
  fail('Suppliers regressed to hard-coded English UI copy.');
} else pass('Suppliers actions, workflow feedback, role labels, dates and counts are localization-aware.');

if (!storageSource.includes('formatLocalizedDateTime') || !storageSource.includes('formatLocalizedNumber')) {
  fail('Storage Locations must use locale-aware date/time and number formatting.');
}
if (!storageSource.includes("location.temperature_zone ? location.temperature_zone : ui('Not classified')")) {
  fail('Saved storage-condition evidence must remain verbatim while only the empty-state label is translated.');
}
if (storageSource.includes('{ui(formatTemperatureZone(location.temperature_zone))}')) {
  fail('Tenant-entered storage-condition evidence must not be reinterpreted through the translation catalog.');
}
if (!storageSource.includes('value={zone} label={ui(zone)}')) {
  fail('Recommended storage-condition suggestions must keep canonical values while displaying localized labels.');
}
if (storageSource.includes('>Create Storage Location<') || storageSource.includes("setFormMessage('Storage location created successfully.')")) {
  fail('Storage Locations regressed to hard-coded English UI copy.');
} else pass('Storage lifecycle, canonical condition display, role labels, dates and counts are localization-aware.');

if (!importSource.includes('formatLocalizedNumber')) fail('Shared CSV importer must localize row counts.');
if (!importSource.includes("ui('Validation passed for all')") || !importSource.includes('ui("Download Validation Errors")')) {
  fail('Shared CSV importer validation/commit workflow is not comprehensively localized.');
}
if (importSource.includes('>Validate CSV<') || importSource.includes("setMessage('Import committed successfully.')")) {
  fail('Shared CSV importer regressed to hard-coded English workflow copy.');
} else pass('Shared CSV import validation, commit, error table and counts are localization-aware.');

if (!process.exitCode) console.log('Tenant supplier/storage multilingual hardening: PASS');
