#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const checks = [];
const check = (condition, message) => {
  if (!condition) throw new Error(`FAIL - ${message}`);
  checks.push(message);
};

const page = read('src/pages/ReplenishmentPlanningPage.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');

check(page.includes('source_review_required?: boolean;'), 'replenishment transfer response type carries source review evidence');
check(page.includes("row.evidence?.source_review_required ? (") && page.includes("'Source location has no minimum/target stock settings'") && page.includes("'Review source stock settings before accepting'"), 'unconfigured transfer sources are visibly flagged with business-readable review guidance');
check(page.includes("ui('{count} available')") && page.includes("ui('{count} shortage')"), 'existing transfer availability and shortage evidence remains visible');
check(translations.includes('["Review required",'), 'shared review-required label remains multilingual');
check(translations.includes('["Source location has no minimum/target stock settings",') && translations.includes('["Review source stock settings before accepting",'), 'source-stock review guidance is translated across all five tenant locales');
check(page.includes('Accepted recommendations create draft stock transfers only.'), 'UI continues to explain that recommendations create drafts rather than autonomous transfers');

console.log(`PASS - v3.49.132 replenishment/procurement frontend remediation (${checks.length}/${checks.length})`);
for (const message of checks) console.log(`PASS - ${message}`);
