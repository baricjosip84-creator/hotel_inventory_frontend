import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const page = read('src/pages/TenantAuditPage.tsx');
const catalog = read('src/i18n/tenantUiTranslations.ts');
const router = read('src/app/router.tsx');
const permissions = read('src/lib/permissions.ts');
const historical = read('scripts/check-tenant-audit-page-hardening.mjs');

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

for (const row of rows) {
  const expected = [...row[0].matchAll(/\{[^{}]+\}/g)].map((m) => m[0]).sort().join('|');
  for (const translated of row.slice(1)) {
    const actual = [...translated.matchAll(/\{[^{}]+\}/g)].map((m) => m[0]).sort().join('|');
    if (actual !== expected) fail(`Placeholder mismatch for tenant UI key: ${row[0]}`);
  }
}
if (!process.exitCode) pass('Tenant UI placeholder parity is intact across all five languages.');

if (!router.includes("path: 'audit'") || !router.includes('requiredPermissions={[TENANT_PERMISSIONS.AUDIT_READ]}') || !router.includes('<TenantAuditPage />')) {
  fail('Tenant Audit route permission/mount contract changed or missing.');
} else pass('Tenant Audit remains mounted at /audit behind AUDIT_READ.');
if (!permissions.includes("AUDIT_READ: 'audit.read'")) fail('AUDIT_READ permission identifier changed or missing.');
else pass('AUDIT_READ permission identifier remains canonical.');

for (const required of ['useAppTranslation', 'formatLocalizedDateTime(', 'formatLocalizedNumber(']) {
  if (!page.includes(required)) fail(`Tenant Audit locale presentation contract missing: ${required}`);
}
if (!process.exitCode) pass('Tenant Audit uses the established translation runtime and locale-aware date/number formatting.');

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
const actionBlock = page.match(/const PATH_ACTION_LABELS: Record<string, string> = \{([\s\S]*?)\n\};/);
if (!actionBlock) fail('PATH_ACTION_LABELS display mapping is missing.');
else for (const match of actionBlock[1].matchAll(/:\s*'([^']+)'/g)) displayKeys.add(match[1]);
const missing = [...displayKeys].filter((key) => !unique.has(key)).sort();
if (missing.length) fail(`Tenant Audit UI keys missing translations: ${missing.join(' | ')}`);
else pass(`Tenant Audit has ${displayKeys.size} catalog-backed literal/dynamic UI keys.`);

const rawTextPattern = /<(?:h[1-6]|p|th|td|summary|span|option|button|label|strong|small)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g;
const rawAttributePattern = /\b(?:placeholder|title|ariaLabel|aria-label|label|helper|hint)=("[^"]*[A-Za-z][^"]*"|'[^']*[A-Za-z][^']*')/g;
const rawText = [...page.matchAll(rawTextPattern)].map((m) => m[1].trim()).filter((value) => value && !/^\d+$/.test(value));
const rawAttributes = [...page.matchAll(rawAttributePattern)].map((m) => m[0]);
if (rawText.length) fail(`Raw direct JSX presentation remains in TenantAuditPage: ${rawText.join(' | ')}`);
if (rawAttributes.length) fail(`Raw literal presentation attributes remain in TenantAuditPage: ${rawAttributes.join(' | ')}`);
if (!rawText.length && !rawAttributes.length) pass('TenantAuditPage has zero raw direct JSX text and raw literal presentation attributes.');

for (const endpoint of ['/audit?', '/audit/summary?', '/audit/export.csv?', '/audit/${id}']) {
  if (!page.includes(endpoint)) fail(`Tenant Audit endpoint contract changed or missing: ${endpoint}`);
}
if (!process.exitCode) pass('Tenant Audit list, summary, CSV export, and detail endpoint paths remain canonical.');

for (const required of [
  "params.set('response_mode', 'page')",
  "params.set('metadata_mode', 'summary')",
  "params.set('support_only', 'true')",
  "apiDownloadFile(`/audit/export.csv?${params.toString()}`, `tenant-audit-${new Date().toISOString().slice(0, 10)}.csv`)",
  'JSON.stringify(detailQuery.data.metadata || {}, null, 2)',
  'visibleEvidenceEntries(detailQuery.data.metadata)',
]) if (!page.includes(required)) fail(`Tenant Audit query/export/evidence invariant missing: ${required}`);
if (!process.exitCode) pass('Tenant Audit paging, summary metadata mode, support filter, CSV filename, and full-detail evidence behavior remain intact.');

for (const required of [
  'row.user_name', 'row.user_email', 'row.entity_type', 'row.entity_id',
  'request.supportReason', 'request.path', 'request.requestId',
  'metadataDisplayValue(value)', 'formatLabel(key)', 'readableError(',
]) if (!page.includes(required)) fail(`Tenant Audit business/server raw-data boundary changed or missing: ${required}`);
if (!process.exitCode) pass('Tenant actor/business identifiers, backend metadata values, support reasons, technical paths/IDs, and concrete backend error data remain raw.');

for (const required of [
  "if (row.action === 'create') return ui('Created')",
  "if (row.action === 'update') return ui('Updated')",
  "if (row.action === 'delete') return ui('Deleted')",
  "if (row.action === 'replace') return ui('Replaced')",
  "PATH_ACTION_LABELS[last] ? ui(PATH_ACTION_LABELS[last]) : formatLabel(last)",
]) if (!page.includes(required)) fail(`Tenant Audit known-action display mapping changed or missing: ${required}`);
if (!process.exitCode) pass('Known audit actions are localized only at display time while unknown backend action/entity values remain canonical/raw.');

if (!historical.includes("params.set('limit', '5000')") || !historical.includes('apiDownloadFile') || !historical.includes('Raw metadata')) {
  fail('Historical Tenant Audit hardening checker safeguards are missing.');
} else pass('Historical Tenant Audit hardening safeguards remain present.');

if (process.exitCode) process.exit(process.exitCode);
pass('Tenant Audit multilingual page-completion check passed.');
