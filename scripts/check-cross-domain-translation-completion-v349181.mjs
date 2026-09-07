import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const failures = [];
let passed = 0;
const check = (condition, message) => {
  if (condition) { console.log(`PASS: ${message}`); passed += 1; }
  else failures.push(message);
};

const packageJson = JSON.parse(read('package.json'));
const ci = String(packageJson.scripts?.['check:ci'] || '');
const page = read('src/pages/CrossDomainOptimizationPage.tsx');
const translationSource = read('src/i18n/tenantUiTranslations.ts');
const multilingualGuard = read('scripts/check-tenant-cross-domain-optimization-multilingual.mjs');

const rows = [];
for (const line of translationSource.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(',')) continue;
  try {
    const row = JSON.parse(trimmed.slice(0, -1));
    if (Array.isArray(row) && row.length === 5 && row.every((item) => typeof item === 'string')) rows.push(row);
  } catch {}
}
const byEnglish = new Map(rows.map((row) => [row[0], row]));

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decode(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const keys = [];
for (const match of page.matchAll(literalPattern)) {
  try { keys.push(decode(match[1])); } catch {}
}
for (const match of page.matchAll(/\b(?:title|description): '([^']+)'/g)) keys.push(match[1]);
for (const match of page.matchAll(/\b(?:title|description)="([^"]+)"/g)) keys.push(match[1]);
for (const match of page.matchAll(/headers=\{\[([^\]]+)\]\}/g)) {
  for (const item of match[1].matchAll(/'([^']+)'/g)) keys.push(item[1]);
}
const canonicalStart = page.indexOf('const CANONICAL_LABELS');
const canonicalEnd = page.indexOf('const REVIEW_SECTIONS', canonicalStart + 1);
if (canonicalStart >= 0 && canonicalEnd > canonicalStart) {
  for (const match of page.slice(canonicalStart, canonicalEnd).matchAll(/: '([^']+)'/g)) keys.push(match[1]);
}
const displayKeys = [...new Set(keys)];
const identical = displayKeys.filter((key) => {
  const row = byEnglish.get(key);
  return row && row.slice(1).every((value) => value === row[0]);
});

check(ci.startsWith('npm run check:tenant-multilingual-closure-audit && '), 'tenant multilingual closure audit still leads frontend CI');
check(ci.includes('npm run check:cross-domain-translation-completion-v349181'), 'v3.49.181 Cross-Domain translation completion guard is wired into frontend CI');
check(ci.indexOf('check:cross-domain-translation-completion-v349181') < ci.indexOf('check:command-pages-fifth-audit-closure-v349180'), 'v3.49.181 guard runs before the older v3.49.180 closure guard');
check(displayKeys.length >= 250, 'Cross-Domain translation completion guard covers the full current display-key surface');
check(identical.length === 0, `Cross-Domain has zero all-English five-column display rows${identical.length ? `: ${identical.join(' | ')}` : ''}`);
check(byEnglish.get('Create a planning review')?.[4] === 'Izradi pregled planiranja', 'Croatian planning-review creation copy is genuinely translated');
check(byEnglish.get('What gets better or worse?')?.[1] === 'Was wird besser oder schlechter?', 'German tradeoff prompt is genuinely translated');
check(byEnglish.get('Quarterly')?.[2] === 'Trimestral' && byEnglish.get('Quarterly')?.[3] === 'Trimestriel' && byEnglish.get('Quarterly')?.[4] === 'Tromjesečno', 'monitoring cadence labels are translated in Spanish, French, and Croatian');
check(multilingualGuard.includes('untranslatedPlaceholders') && multilingualGuard.includes('duplicated as English across all five locale columns'), 'standing Cross-Domain multilingual guard rejects future English placeholder rows');

if (failures.length) {
  console.error(`Cross-Domain translation completion v3.49.181: ${passed} passed / ${failures.length} failed.`);
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log(`Cross-Domain translation completion v3.49.181: ${passed}/${passed} PASS.`);
