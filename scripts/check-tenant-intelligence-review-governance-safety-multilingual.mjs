import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const pageSource = read('src/pages/HumanInLoopAIReviewPage.tsx');
const routerSource = read('src/app/router.tsx');

const rows = [];
for (const line of translationSource.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(',')) continue;
  try {
    const row = JSON.parse(trimmed.slice(0, -1));
    if (Array.isArray(row) && row.length === 5 && row.every((item) => typeof item === 'string')) rows.push(row);
  } catch {}
}
const keys = rows.map((row) => row[0]);
const unique = new Set(keys);
if (keys.length !== unique.size) fail('Tenant UI translation catalog contains duplicate English keys.');
else pass(`Tenant UI catalog has ${keys.length} unique five-language rows.`);

const startMarker = '<div className="section__title">{ui("Governance and safety")}</div>';
const start = pageSource.indexOf(startMarker);
const end = pageSource.indexOf('</section>', start);
if (start < 0 || end < 0 || end <= start) {
  fail('Could not isolate Governance and Safety multilingual slice.');
  process.exit(1);
}
const slice = pageSource.slice(start, end + '</section>'.length);
pass('Governance and Safety is isolated as the terminal Readiness presentation section.');

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decode(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const literals = [];
for (const match of slice.matchAll(literalPattern)) { try { literals.push(decode(match[1])); } catch {} }
const missing = [...new Set(literals.filter((key) => !unique.has(key)))];
if (missing.length) fail(`Governance and Safety ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Governance and Safety slice has ${new Set(literals).size} catalog-backed literal UI keys.`);

const safetyDisplayLabels = [
  'Read only',
  'Advisory only',
  'Tenant isolated',
  'Permission gated',
  'Audit traceable source',
  'Human action only',
  'Approval gated when required',
  'No inventory mutation',
  'No procurement mutation',
  'No execution mutation',
  'No financial mutation',
  'No ERP writeback',
  'No accounting writeback',
  'No supplier execution',
  'No carrier execution',
  'No external workflow execution',
  'No external AI callout'
];
const missingSafetyLabels = safetyDisplayLabels.filter((key) => !unique.has(key));
if (missingSafetyLabels.length) fail(`Safety-contract display labels missing translations: ${missingSafetyLabels.join(' | ')}`);
else pass(`${safetyDisplayLabels.length} canonical safety-contract display labels are catalog-backed.`);

const requiredPresentation = [
  'ui("Governance and safety")',
  'ui("Confidence guidance")',
  'ui("Override guidance")',
  'ui("Approval guidance")',
  'ui("Safety contract")',
  'guidance.confidence_guidance || ui("Confidence is advisory only and never authorizes automatic execution.")',
  'guidance.override_guidance || ui("Overrides must be captured in governed source workflows.")',
  'guidance.approval_guidance || ui("Approvals must be completed in existing governed workflows.")',
  'safetyEntries.map(([key]) => ui(formatLabel(key))).join(\' · \')',
  'ui("No mutation, execution, approval, or override is performed by this endpoint.")'
];
for (const value of requiredPresentation) if (!slice.includes(value)) fail(`Localized Governance and Safety presentation missing: ${value}`);
if (!process.exitCode) pass('Governance and Safety frontend-owned presentation uses the shared translation contract.');

const forbidden = [
  '>Governance and safety<',
  '>Confidence guidance<',
  '>Override guidance<',
  '>Approval guidance<',
  '>Safety contract<',
  "|| 'Confidence is advisory only and never authorizes automatic execution.'",
  "|| 'Overrides must be captured in governed source workflows.'",
  "|| 'Approvals must be completed in existing governed workflows.'",
  ": 'No mutation, execution, approval, or override is performed by this endpoint.'",
  'safetyEntries.map(([key]) => formatLabel(key))'
];
for (const value of forbidden) if (slice.includes(value)) fail(`English-only Governance and Safety presentation remains: ${value}`);
if (!process.exitCode) pass('No English-only Governance and Safety presentation remains in the terminal section.');

const serverData = [
  'guidance.confidence_guidance || ui(',
  'guidance.override_guidance || ui(',
  'guidance.approval_guidance || ui(',
  'Object.entries(response?.definition?.safety_contract || {}).filter(([, enabled]) => enabled)'
];
for (const value of serverData) if (!pageSource.includes(value)) fail(`Expected backend governance/safety data boundary missing: ${value}`);
for (const value of [
  'ui(guidance.confidence_guidance)',
  'ui(guidance.override_guidance)',
  'ui(guidance.approval_guidance)'
]) if (slice.includes(value)) fail(`Backend-returned governance guidance must not be blindly translated: ${value}`);
if (!process.exitCode) pass('Backend-returned confidence, override, and approval guidance remain raw server data when present.');

if (!slice.includes('ui(formatLabel(key))')) fail('Safety-contract technical keys are not localized only at the display-label boundary.');
else pass('Canonical safety-contract keys remain technical data while their generated display labels are localized.');

if (slice.includes('apiRequest<') || slice.includes('method:') || slice.includes('.mutate(')) fail('Governance and Safety presentation slice must not introduce mutation calls.');
else pass('Governance and Safety slice remains presentation-only and does not introduce mutations.');

for (const value of ["path: 'intelligence-review'", 'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ']) if (!routerSource.includes(value)) fail(`Router/permission contract changed: ${value}`);
if (!process.exitCode) pass('Intelligence Review route and permission contract remain unchanged.');

const rawText = pageSource.split(/\r?\n/).flatMap((line) => {
  const match = line.match(/>\s*([A-Za-z][^<>{}]*)\s*</);
  return match ? [match[1].trim()] : [];
}).filter(Boolean);
if (rawText.length) fail(`Raw JSX presentation remains in HumanInLoopAIReviewPage: ${rawText.join(' | ')}`);
else pass('HumanInLoopAIReviewPage has no remaining raw JSX presentation text.');

const tail = pageSource.slice(end + '</section>'.length);
if (/section__title/.test(tail)) fail('Unexpected presentation section exists after terminal Governance and Safety boundary.');
else pass('Governance and Safety is the terminal presentation section in the current Intelligence Review source.');

if (!process.exitCode) pass('Tenant Intelligence Review Governance & Safety multilingual gate passed.');
