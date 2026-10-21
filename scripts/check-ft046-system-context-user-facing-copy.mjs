import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/SystemContextPage.tsx'), 'utf8');
const catalog = fs.readFileSync(path.join(root, 'src/i18n/tenantUiTranslations.ts'), 'utf8');
const check = (condition, description) => {
  if (!condition) { console.error(`FAIL: ${description}`); process.exitCode = 1; }
  else console.log(`PASS: ${description}`);
};
const translationRows = new Map();
for (const rawLine of catalog.split(/\r?\n/)) {
  const trimmed = rawLine.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(',')) continue;
  try {
    const row = JSON.parse(trimmed.slice(0, -1));
    if (Array.isArray(row) && row.length === 5) translationRows.set(row[0], row);
  } catch {}
}
const raw = [
  'Review affected product reorder thresholds and create product_min_stock_update execution requests only after human analysis and approval.',
  'Review affected product pricing and create product_pricing_update execution requests only after human analysis and approval.'
];
const display = [
  'Review the affected reorder thresholds. After human review and approval, create a request to update minimum stock levels.',
  'Review the affected product prices. After human review and approval, create a request to update product pricing.'
];
check(page.includes('SYSTEM_CONTEXT_USER_FACING_OVERRIDES[value]') && page.includes('if (friendly) return ui(friendly);'), 'System Context applies user-facing text before its raw server fallback');
for (let i = 0; i < raw.length; i++) {
  check(page.includes(`'${raw[i]}':\n    '${display[i]}'`), `Backend recommendation ${i + 1} maps to plain-language text`);
  const row = translationRows.get(display[i]);
  check(Boolean(row && row.every((value) => value && !/product_(?:min_stock|pricing)_update/.test(value))), `Plain language for recommendation ${i + 1} in all five locales`);
}
check(page.includes("audit: 'Audit'") && translationRows.get('Audit')?.[4] === 'Revizija', 'Audit section label translates to Croatian');
check(translationRows.get('System Context workspace')?.[4] === 'Radni prostor konteksta sustava', 'System Context hero title is fully Croatian');
check(page.includes("request_type: 'system_recommendation'") && page.includes("requested_action: 'review_system_context_recommendations'"), 'Execution request protocol remains untouched');
if (!process.exitCode) console.log('FT046 System Context user-facing copy checks passed.');
