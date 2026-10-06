import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const review = fs.readFileSync(path.join(root, 'src/pages/HumanInLoopAIReviewPage.tsx'), 'utf8');
const policy = fs.readFileSync(path.join(root, 'src/pages/AdaptivePolicyEnginePage.tsx'), 'utf8');
const policyCss = fs.readFileSync(path.join(root, 'src/pages/AdaptivePolicyEnginePage.css'), 'utf8');
const translations = fs.readFileSync(path.join(root, 'src/i18n/tenantUiTranslations.ts'), 'utf8');

const checks = [
  ['business readiness is shown to diagnostic users too', "{activeView === 'readiness' ? (", review],
  ['technical governance diagnostics are explicitly separated', 'Technical governance diagnostics', review],
  ['readiness status relationship explainer is present', 'How these statuses relate:', review],
  ['feature-level readiness is named canonical', 'Business readiness is the canonical feature-level view', review],
  ['manifest gates are identified as mutually exclusive', 'Eligible, blocked/waiver, and pending are mutually exclusive manifest outcomes', review],
  ['supporting diagnostics are explicitly allowed to overlap', 'supporting diagnostics. They may overlap', review],
  ['capability counts are distinguished from feature counts', 'capability totals are not feature totals', review],
  ['manifest accounting reconciles classified features', 'enablementClassifiedCount', review],
  ['pending manifest feature list is derived safely', 'enablementPendingFeatures', review],
  ['pending hardening features are named in manifest', 'Pending hardening features', review],
  ['pending fallback refuses to infer feature names', 'No feature name is inferred.', review],
  ['policy evidence has business-language guide', 'How to read this evidence', policy],
  ['variance is explained', 'How far the observed signal moved from its reference point', policy],
  ['weight is explained', 'How much this signal contributes to the policy analysis', policy],
  ['confidence is explained as evidence not approval', 'it is not automatic approval', policy],
  ['effectiveness requires before and after evidence', 'Only determined when both a baseline and a later measured result exist', policy],
  ['recommendation rows show policy signal history', 'Policy signal history:', policy],
  ['recommendation rows label latest signal without claiming source linkage', 'This is the latest policy evidence and may be newer than the recommendation itself.', policy],
  ['effectiveness title becomes observation when baseline is absent', "hasMeasuredEffectiveness ? 'Effectiveness measurements' : 'Current policy observations'", policy],
  ['effectiveness no-baseline copy refuses to overclaim', 'effectiveness cannot be determined yet', policy],
  ['recommendation table gets dedicated layout class', 'adaptive-policy-table--recommendations', policy],
  ['risk/confidence recommendation columns are kept readable', '.adaptive-policy-table--recommendations th:nth-child(5)', policyCss],
  ['recommendation badges do not split across lines', '.adaptive-policy-table--recommendations .adaptive-policy-badge', policyCss],
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
  'Technical governance diagnostics',
  'How these statuses relate:',
  'Pending hardening features',
  'How to read this evidence',
  'Evidence confidence',
  'Policy signal history:',
  'Current policy observations',
];
for (const key of translationKeys) {
  if (!translations.includes(`[\"${key}\"`)) {
    console.error(`FAIL translation row ${key}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS translation row ${key}`);
    passed += 1;
  }
}

const total = checks.length + translationKeys.length;
if (!process.exitCode) console.log(`PASS ${passed}/${total}`);
