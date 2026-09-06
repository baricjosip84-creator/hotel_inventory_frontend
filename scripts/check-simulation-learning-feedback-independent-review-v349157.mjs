import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const page = read('src/pages/DecisionLearningFeedbackPage.tsx');
const permissions = read('src/lib/permissions.ts');
const translations = read('src/i18n/tenantUiTranslations.ts');
const pkg = read('package.json');
let passed = 0;
const checks = [];
const check = (label, condition) => {
  checks.push(label);
  if (!condition) {
    console.error(`FAIL - ${label}`);
    process.exitCode = 1;
  } else {
    passed += 1;
    console.log(`PASS - ${label}`);
  }
};

check('override permission is canonical', permissions.includes("DECISION_INTELLIGENCE_REVIEW_OVERRIDE: 'decision_intelligence.review_override'"));
const adminBlock = permissions.slice(permissions.indexOf('admin: Object.freeze(['), permissions.indexOf('manager: Object.freeze(['));
const managerBlock = permissions.slice(permissions.indexOf('manager: Object.freeze(['), permissions.indexOf('staff: Object.freeze(['));
check('Admin receives explicit independent-review override', adminBlock.includes('DECISION_INTELLIGENCE_REVIEW_OVERRIDE'));
check('Manager does not receive independent-review override', !managerBlock.includes('DECISION_INTELLIGENCE_REVIEW_OVERRIDE'));
check('page reads current tenant user identity', page.includes("import { getCurrentTenantUserId } from '../lib/auth';") && page.includes('const currentUserId = getCurrentTenantUserId();'));
check('page resolves override authority separately from normal governance', page.includes('canOverrideIndependentReview = hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_REVIEW_OVERRIDE)'));
check('review item contract carries creator identity', page.includes('created_by_user_id?: string | null') && page.includes('created_by_user_name?: string | null'));
check('review item contract carries latest recorder identity', page.includes('recorded_by_user_id?: string | null') && page.includes('recorded_by_user_name?: string | null'));
check('review mutation supports explicit override evidence', page.includes('independence_override?: boolean') && page.includes('override_reason?: string'));
check('same creator/latest recorder is detected', page.includes('currentUserId === createdById || currentUserId === recordedById'));
check('legacy unknown recorder is detected', page.includes('const recorderUnknown = !createdById && !recordedById'));
check('ordinary user cannot bypass blocked independent review', page.includes('requiresOverride && !canOverrideIndependentReview'));
check('same-user error is explicit', page.includes("ui('You recorded this evidence. Another authorized user must review it.')"));
check('legacy identity error is explicit', page.includes("ui('Recorder identity is unavailable for this legacy evidence. A governed override is required to resolve it.')"));
check('override asks for a reason', page.includes("window.prompt(ui('Explain why independent review cannot be used (at least 10 characters).')"));
check('override reason minimum is enforced client-side', page.includes('if (overrideReason.length < 10)'));
check('override request is explicit', page.includes('independence_override: true') && page.includes('override_reason: overrideReason'));
check('review board visibly identifies recorder', page.includes("<th>{ui('Recorder')}</th>") && page.includes("item.recorded_by_user_name || item.created_by_user_name || ui('Unknown recorder')"));
check('review board visibly marks independent-review requirement', page.includes("ui('Independent review required')"));
check('non-override users cannot resolve blocked rows from UI', page.includes('(independentReviewBlocked && !canOverrideIndependentReview)'));
for (const key of [
  'Recorder',
  'Unknown recorder',
  'Independent review required',
  'Recorder identity is unavailable for this legacy evidence. A governed override is required to resolve it.',
  'You recorded this evidence. Another authorized user must review it.',
  'Explain why independent review cannot be used (at least 10 characters).',
  'Override reason must be at least 10 characters.'
]) {
  check(`translation catalog includes ${key}`, translations.includes(`["${key}"`));
}
check('v157 frontend guard wired into check:ci', pkg.includes('check:simulation-learning-feedback-independent-review-v349157'));

if (process.exitCode) process.exit(process.exitCode);
console.log(`v3.49.157 learning feedback independent review frontend: ${passed}/${checks.length} PASS`);
