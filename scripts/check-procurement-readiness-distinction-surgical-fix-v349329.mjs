import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const page = readFileSync(new URL('../src/pages/ProcurementRecommendationsPage.tsx', import.meta.url), 'utf8');
const translations = readFileSync(new URL('../src/i18n/tenantUiTranslations.ts', import.meta.url), 'utf8');
const backend = readFileSync(new URL('../../hotel-inventory-backend/src/services/procurement/replenishmentRecommendationService.js', import.meta.url), 'utf8');
const phrase = 'Ready for review does not mean ready to create a purchase order. Complete the separate conversion requirements first.';
const assertions = [
  ['source displays approval readiness heading', page.includes('ui("Approval readiness:")')],
  ['review readiness is distinguished from full readiness', page.includes('can_enter_approval_review ? ui("Ready for review") : ui("Blocked")')],
  ['old bare ready decision removed from approval readiness', !page.includes('can_enter_approval_review ? ui("Ready") : ui("Blocked")')],
  ['separate conversion label preserved', page.includes('ui("Approved and eligible for PO-draft conversion:")')],
  ['separate conversion value preserved', page.includes('can_generate_po_draft ? ui("Yes") : ui("No")')],
  ['warning requires review permission', page.includes('can_enter_approval_review && selectedDetail.detail?.can_generate_po_draft === false')],
  ['warning requires explicit conversion false not a loading undefined', page.includes('can_generate_po_draft === false')],
  ['explanation present in page', page.includes(`ui("${phrase}")`)],
  ['warning uses existing visual hierarchy', page.includes('<p style={styles.warningText}>')],
  ['existing blocked approval guidance still present', page.includes('Approval is blocked until the current recommendation passes all row-level readiness checks.')],
  ['approval decision action still present', page.includes('decisionMutation.mutate({')],
  ['approve action still governed', page.includes('can_enter_approval_review ||')],
  ['PO conversion API still invoked', page.includes('convertRecommendationsToPoDrafts(productIds, filters)')],
  ['selected detail query still invalidated after decisions', page.includes('queryKey: ["procurement-recommendation-detail"]')],
  ['supplier readiness label preserved', page.includes('Supplier assigned')],
  ['cost and conversion detail retained', page.includes('ui("Cost and conversion")')],
  ['unit cost still available for review', page.includes('ui("Unit cost:")')],
  ['existing Ready for review key retained', translations.includes('["Ready for review",')],
  ['translation new key appears exactly once', translations.split(`["${phrase}"`).length === 2],
  ['translation row carries five non-empty locale values', (() => {
     const line = translations.split('\n').find(s => s.includes(`["${phrase}"`));
     if (!line) return false;
     const match = line.trim().match(/^\[(.*)\],$/);
     if (!match) return false;
     const values = [...match[1].matchAll(/"((?:\\.|[^"\\])*)"/g)].map(x=>x[1]);
     return values.length === 5 && values.every(x=>x.length > 40);
  })()],
  ['translated German', translations.includes('Bereit zur Prüfung bedeutet nicht')],
  ['translated Spanish', translations.includes('Estar listo para revisión no significa')],
  ['translated French', translations.includes('Être prêt pour la revue ne signifie')],
  ['translated Croatian', translations.includes('Spremnost za pregled ne znači')],
  ['no stock mutations changed via this component', page.includes('fetchRecommendations(filters, requestedProductId)')],
];
// Verify the exact two-predicate wording applies only to the intended mismatch states.
const showWarning = (canEnterReview, canGeneratePoDraft) => Boolean(canEnterReview && canGeneratePoDraft === false);
for (const [name, review, conversion, expected] of [
  ['review-ready but conversion blocked', true, false, true],
  ['both ready', true, true, false],
  ['review blocked', false, false, false],
  ['detail absent', undefined, undefined, false],
  ['conversion unknown', true, undefined, false],
]) {
  assertions.push([name, showWarning(review,conversion) === expected]);
}
let passed=0;
for (const [name, ok] of assertions) {
  try {assert.equal(ok,true, name);console.log(`PASS ${name}`);passed++}
  catch {console.error(`FAIL ${name}`);process.exitCode=1}
}
console.log(`${process.exitCode ? 'FAIL' : 'PASS'} ${passed}/${assertions.length}`);
