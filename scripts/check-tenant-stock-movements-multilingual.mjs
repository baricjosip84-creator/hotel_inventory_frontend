import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const page = read('src/pages/StockMovementsPage.tsx');
const catalog = read('src/i18n/tenantUiTranslations.ts');
const rows = [];
for (const line of catalog.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(',')) continue;
  try {
    const row = JSON.parse(trimmed.slice(0, -1));
    if (Array.isArray(row) && row.length === 5 && row.every((entry) => typeof entry === 'string' && entry.length > 0)) rows.push(row);
  } catch {}
}
const keys = rows.map((row) => row[0]);
const unique = new Set(keys);
if (keys.length !== unique.size) fail('Tenant UI translation catalog contains duplicate English keys.');
else pass(`Tenant UI catalog has ${keys.length} unique five-language rows.`);

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decodeLiteral(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const displayKeys = new Set();
for (const match of page.matchAll(literalPattern)) {
  try { displayKeys.add(decodeLiteral(match[1])); } catch {}
}
const movementLabels = page.match(/const MOVEMENT_LABELS: Record<string, string> = \{([\s\S]*?)\n\};/);
if (!movementLabels) fail('Stock Movements known movement-label mapping is missing.');
else for (const match of movementLabels[1].matchAll(/:\s*'([^']+)'/g)) displayKeys.add(match[1]);
for (const key of ['Historical shipment reference unavailable']) displayKeys.add(key);
const missing = [...displayKeys].filter((key) => !unique.has(key)).sort();
if (missing.length) fail(`Stock Movements UI keys missing translations: ${missing.join(' | ')}`);
else pass(`Stock Movements has ${displayKeys.size} catalog-backed deterministic UI keys.`);

for (const anchor of [
  "movementKind === 'unclassified' && ['stock_count', 'manual_adjustment', 'other'].includes(explicitType)",
  "return 'unproven_legacy';",
  "return reason;",
  "safeReasonDisplay(movement, ui) || ui(\"not recorded\")",
  "movement.product_unit || ui(\"Historical unit unavailable\")",
  "movement.product_name || ui(\"Historical Product name unavailable\")",
  "movement.storage_location_name || ui(\"Historical location unavailable\")",
  "disabled={rows.length === 0 || isExporting}",
  "for (let offset = 0; ; offset += 500)",
  "if (batch.length < 500) break;"
]) if (!page.includes(anchor)) fail(`Stock Movements audit-safe presentation contract missing: ${anchor}`);
if (!process.exitCode) pass('Stock Movements preserves unknown/operator evidence and keeps export independent from summary health.');

for (const forbidden of [
  'ui(humanizeCode(filters.reason))',
  'Movement ID',
  'Actor ID',
  "ui('Product ID')",
  "ui('Storage Location ID')",
  "ui('Shipment ID')",
  "ui('Transfer ID')"
]) if (page.includes(forbidden)) fail(`Stock Movements exposes/transforms forbidden audit data: ${forbidden}`);
if (!process.exitCode) pass('Stock Movements normal UI and CSV do not expose raw technical identifiers or translate exact user reason filters.');

if (!page.includes("if (typeof value === 'number') return String(value);") || !page.includes("if (/^[=+\\-@]/.test(text)) text = `'${text}`;")) fail('Stock Movements CSV formula-injection/numeric-preservation guard is missing.');
else pass('Stock Movements CSV formula-injection guard is present without converting numeric negatives to text.');

if (process.exitCode) process.exit(process.exitCode);
