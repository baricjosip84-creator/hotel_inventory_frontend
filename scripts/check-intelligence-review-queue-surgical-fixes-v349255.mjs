import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/HumanInLoopAIReviewPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/HumanInLoopAIReviewPage.css'), 'utf8');
const translations = fs.readFileSync(path.join(root, 'src/i18n/tenantUiTranslations.ts'), 'utf8');

const checks = [
  ['review queue uses dedicated wider layout', 'className="ai-review-page__queue-list"', page],
  ['review queue is limited to two desktop columns', 'grid-template-columns: repeat(2, minmax(0, 1fr));', css],
  ['review queue collapses to one column at narrower desktop width', '@media (max-width: 1180px)', css],
  ['machine-style source scope gets human fallback', "return canonical ? ui(canonical) : formatLabel(raw);", page],
  ['minimum-stock source scope has business label', "prepare_min_stock_proposal: 'Minimum-stock proposal'", page],
  ['raw source id moved behind technical disclosure', "<details className=\"ai-review-page__technical-details\"", page],
  ['review lifecycle explicitly says review outcome', 'ui("Review outcome:")', page],
  ['linked execution is presented separately', "ui('Linked Execution Request:')", page],
  ['approval required badge is not duplicated by approval-required state', "!== 'approval_required'", page],
  ['decision draft starts neutral', "decision: '',", page],
  ['decision dropdown has neutral placeholder', '<option value="" disabled>{ui(\'Select decision\')}</option>', page],
  ['decision validation requires deliberate selection', "ui('Select a review decision before recording it.')", page],
  ['submit no longer silently falls back to first allowed decision', "draft.decision && allowed.includes(draft.decision) ? draft.decision : undefined", page],
  ['single-page pagination hides navigation controls', "reviewQuery.data?.pagination?.previous_offset !== null", page],
];

let passed = 0;
for (const [name, needle, haystack] of checks) {
  if (!haystack.includes(needle)) {
    console.error(`FAIL ${name}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS ${name}`);
    passed += 1;
  }
}

const translationKeys = [
  'Select decision',
  'Select a review decision before recording it.',
  'Review outcome:',
  'Linked Execution Request:',
];
for (const key of translationKeys) {
  if (!translations.includes(`["${key}"`)) {
    console.error(`FAIL translation row ${key}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS translation row ${key}`);
    passed += 1;
  }
}

const total = checks.length + translationKeys.length;
if (!process.exitCode) console.log(`PASS ${passed}/${total}`);
