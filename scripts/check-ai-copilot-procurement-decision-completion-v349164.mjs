import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const copilot = read('src/pages/AIOperationsCopilotPage.tsx');
const review = read('src/pages/HumanInLoopAIReviewPage.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');

let passed = 0;
function check(label, condition) {
  if (!condition) throw new Error(`FAIL: ${label}`);
  passed += 1;
  console.log(`PASS: ${label}`);
}
function includesAll(source, parts) { return parts.every((part) => source.includes(part)); }

check('Copilot shows corrected stock position including reservations and approved PO commitments', includesAll(copilot, ['Active reservations', 'Available after reservations', 'Approved PO not yet shipped', 'True inventory position']));
check('Copilot explains consumption-only replenishment evidence', copilot.includes('Demand here means real consumption only. Transfers, write-offs, returns, and stock corrections are not counted as demand.'));
check('Copilot shows true priority totals/sample explanation', copilot.includes('Priority counts use the complete permitted set. The explanation shows only the highest-priority sample from each area.'));
check('Supplier performance explains rate/sample/trend comparison', copilot.includes('Supplier comparison uses recent delivery and receiving rates, the number of shipments measured, and the trend versus the previous period—not raw problem counts alone.'));
check('Evidence cards become links when href exists', includesAll(copilot, ['item.href', '<Link key=', 'styles.evidenceLink']));
check('Standard cost is evidence-first', includesAll(copilot, ['Cost evidence before proposal', 'Suggested reference:', '90-day weighted cost', 'Current supplier price']));
check('Standard-cost material override explanation is enforced in UI', includesAll(copilot, ['standardCostMaterialOverride', 'Why use a materially different standard cost?', 'more than 10%']));
check('Run history exposes search/type/status/product/date filters', includesAll(copilot, ['historySearch', 'historyIntent', 'historyStatus', 'historyProductSearch', 'historyCreatedFrom', 'historyCreatedTo']));
check('Useful/incorrect feedback is offered with governed-learning warning', includesAll(copilot, ['Useful', 'Not useful / incorrect', 'governed Learning Feedback', 'does not automatically train a model']));
check('Negative feedback UI limit matches backend 1,000-character contract', copilot.includes('rows={3} maxLength={1000} value={feedbackComment}'));
check('Replenishment result can be sent for fresh review', includesAll(copilot, ['Send recommendation for review', 'Preparing fresh review proposal…', 'No Purchase Order was created.']));
check('Promoted proposal links directly to Intelligence Review', includesAll(copilot, ['Open in Intelligence Review', '/intelligence-review']));
check('Intelligence Review identifies replenishment PO proposal type', review.includes("review.proposal_request_type === 'replenishment_purchase_order_draft'"));
check('Generic Execution Request handoff is suppressed for replenishment PO review', review.includes('&& !isReplenishmentPOReview'));
check('Approved replenishment review exposes Prepare Purchase Order Draft', includesAll(review, ['Prepare Purchase Order Draft', 'canCreatePurchaseOrders', "lifecycle?.current_status === 'approved_for_manual_action'"]));
check('PO handoff safety explanation is visible', review.includes('It will not submit or approve it.'));
check('Existing linked PO can be opened from Intelligence Review', includesAll(review, ['Open linked Purchase Order', '/purchase-orders?purchaseOrderId=']));
check('Idempotent PO creation message does not falsely claim a new PO', review.includes('A Draft Purchase Order is already linked to this approved replenishment review.'));

for (const text of [
  'Active reservations',
  'Approved PO not yet shipped',
  'Cost evidence before proposal',
  'Send recommendation for review',
  'Not useful / incorrect',
  'Prepare Purchase Order Draft',
  'A Draft Purchase Order is already linked to this approved replenishment review.'
]) {
  check(`translation catalog contains: ${text}`, translations.includes(`'${text}'`) || translations.includes(`\"${text}\"`));
}

console.log(`AI Copilot procurement decision completion frontend guard: ${passed}/${passed} PASS.`);
