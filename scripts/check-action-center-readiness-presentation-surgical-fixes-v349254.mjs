import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/OperationalActionCenterPage.tsx'), 'utf8');
const translations = fs.readFileSync(path.join(root, 'src/i18n/tenantUiTranslations.ts'), 'utf8');

const checks = [
  ['governance section state stored in URL', "expanded_sections"],
  ['focused advanced section stored in URL', "action_section"],
  ['governance section restores open state', "open={governanceDetailsOpen}"],
  ['diagnostics section restores open state', "open={diagnosticsDetailsOpen}"],
  ['restored section scrolls into view', "scrollIntoView({ behavior: 'smooth', block: 'start' })"],
  ['zero remediation coverage renders N/A', "remediationActionCount > 0 ? formatPercent(remediationFeedback.source_evidence_coverage_score, locale) : ui('N/A')"],
  ['zero review-ready coverage renders N/A', "reviewReadyActionCount > 0 ? formatPercent(effectivenessReview.governance_coverage_score, locale) : ui('N/A')"],
  ['zero escalation-candidate score renders N/A', "escalationCandidateCount > 0 ? formatPercent(escalationGovernance.governance_gate_score, locale) : ui('N/A')"],
  ['zero closure-candidate score renders N/A', "closureCandidateCount > 0 ? formatPercent(closureGate.escalation_clearance_score, locale) : ui('N/A')"],
  ['governance business summary added', "ui('What this means')"],
  ['governance source workflow links added', "ui('Open execution tasks')"],
  ['technical evidence rendered as structured list', 'action-center-evidence-list'],
  ['required permission safely wraps', "overflowWrap: 'anywhere'"],
];

let passed = 0;
for (const [name, needle] of checks) {
  const ok = page.includes(needle);
  if (!ok) {
    console.error(`FAIL ${name}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS ${name}`);
    passed += 1;
  }
}

const translationKeys = [
  'What this means',
  'Open alerts',
  'Open reliability command',
  'No eligible remediation actions were available for this percentage.',
  'No review-ready actions were available for this percentage.',
  'No escalation candidates were available for this percentage.',
  'No closure candidates were available for this percentage.',
];
for (const key of translationKeys) {
  const ok = translations.includes(`["${key}"`);
  if (!ok) {
    console.error(`FAIL translation row ${key}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS translation row ${key}`);
    passed += 1;
  }
}

const total = checks.length + translationKeys.length;
if (!process.exitCode) console.log(`PASS ${passed}/${total}`);
