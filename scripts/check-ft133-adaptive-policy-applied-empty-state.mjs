import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = fs.readFileSync(path.join(root, 'src/pages/AdaptivePolicyEnginePage.tsx'), 'utf8');
const translations = fs.readFileSync(path.join(root, 'src/i18n/tenantUiTranslations.ts'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const checks = [
  ['The shared evidence section supports a purpose-specific empty message', page.includes('emptyMessage?: string;')],
  ['The zero-row section uses a supplied message instead of always saying no matches', page.includes("ui(emptyMessage || 'No matching records were returned.')")],
  ['Policy and recommendation filters are recognized as active', page.includes('filters.policy_domain || filters.policy_type || filters.policy_status || filters.recommendation_type')],
  ['Source-action deep links count as a scoped filter', page.includes('filters.recommendation_type || requestedSourceActionId')],
  ['Applied policy changes gives a no-records message when filters are clear', page.includes("emptyMessage={!hasActiveEvidenceFilters ? 'No applied policy changes have been recorded yet.' : undefined}")],
  ['The unfiltered no-application state does not imply an actual policy change', page.includes('No applied policy changes have been recorded yet.')],
  ['A filtered zero-row result still uses the general no-matches message', page.includes("emptyMessage || 'No matching records were returned.'")],
  ['Applied change recording remains governed rather than automatic', page.includes("recommendation.recommendation_status === 'approved_for_manual_application'")],
  ['Applied policy change rows retain their existing lifecycle actions', page.includes("onClick={() => openLifecycleAction(application, 'open_rollback_review'")],
  ['No new API mutations introduced by this correction', (page.match(/apiRequest\(/g) || []).length === 2],
  ['Translations include the exact new message in five locales', /^  \["No applied policy changes have been recorded yet\.", "[^"]+", "[^"]+", "[^"]+", "[^"]+"\],/m.test(translations)],
  ['New static guard is registered', packageJson.scripts?.['check:ft133-adaptive-policy-applied-empty-state'] === 'node scripts/check-ft133-adaptive-policy-applied-empty-state.mjs'],
  ['New guard is included in the CI chain', packageJson.scripts?.['check:ci']?.includes('npm run check:ft133-adaptive-policy-applied-empty-state')],
];
let passed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`); if(ok) passed++; }
console.log(`FT133 Applied policy no-records state: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exitCode = 1;
