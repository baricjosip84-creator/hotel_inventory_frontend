import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const pageSource = read('src/pages/ExecutionRequestsPage.tsx');
const routerSource = read('src/app/router.tsx');
const permissionsSource = read('src/lib/permissions.ts');

const rows = [];
for (const line of translationSource.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(',')) continue;
  try {
    const row = JSON.parse(trimmed.slice(0, -1));
    if (Array.isArray(row) && row.length === 5 && row.every((entry) => typeof entry === 'string' && entry.length > 0)) rows.push(row);
  } catch {}
}
const keys = rows.map((row) => row[0]);
const unique = new Set(keys);
if (keys.length !== unique.size) fail('Tenant UI translation catalog contains duplicate English keys.');
else pass(`Tenant UI catalog has ${keys.length} unique five-language rows.`);

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decodeLiteral(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const literals = [];
for (const match of pageSource.matchAll(literalPattern)) {
  try { literals.push(decodeLiteral(match[1])); } catch {}
}
const literalSet = new Set(literals);
const missing = [...literalSet].filter((key) => !unique.has(key));
if (missing.length) fail(`Execution Requests ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Execution Requests page has ${literalSet.size} catalog-backed literal UI keys.`);

const renderStart = pageSource.indexOf('export default function');
const renderSource = renderStart >= 0 ? pageSource.slice(renderStart) : pageSource;
const rawText = renderSource.split(/\r?\n/).flatMap((line) => [...line.matchAll(/<(?:h[1-6]|p|th|td|summary|span|option|button|label|dt|dd|strong|small|OperationalWorkspaceMetaPill|div)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g)].map((match) => match[1].trim()).filter(Boolean));
if (rawText.length) fail(`Raw direct JSX presentation remains in Execution Requests: ${rawText.join(' | ')}`);
else pass('Execution Requests page has zero raw direct JSX presentation text.');

const rawAttributePattern = /\b(?:eyebrow|title|description|placeholder|ariaLabel|aria-label|label|helper|hint)=("[^"]*[A-Za-z][^"]*"|'[^']*[A-Za-z][^']*')/g;
const rawAttributes = [...renderSource.matchAll(rawAttributePattern)].map((match) => match[0]);
if (rawAttributes.length) fail(`Raw presentation attributes remain in Execution Requests: ${rawAttributes.join(' | ')}`);
else pass('Execution Requests page has zero raw literal hero/section/placeholder/ARIA presentation attributes.');

for (const required of [
  "import { useAppTranslation } from '../i18n/I18nContext';",
  "import { formatLocalizedCurrency, formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';",
  "import type { AppLocale } from '../i18n/config';",
  "import { getActiveTenantCurrency } from '../lib/tenantCurrency';",
  'const { locale, ui } = useAppTranslation();',
  'formatLocalizedDateTime(parsed, locale)',
  'formatLocalizedNumber(value, locale, { maximumFractionDigits: 2 })',
  'formatLocalizedCurrency(Number(getRequestedValue(selected)), getActiveTenantCurrency(), locale, { maximumFractionDigits: 2 })',
]) if (!pageSource.includes(required)) fail(`Execution Requests shared multilingual/locale runtime missing: ${required}`);
if (!process.exitCode) pass('Execution Requests uses the shared tenant translation runtime and locale-aware date/number/currency presentation.');

for (const required of [
  "path: 'execution-requests'",
  'TENANT_PERMISSIONS.EXECUTION_REQUESTS_VIEW',
  '<ExecutionRequestsPage />',
]) if (!routerSource.includes(required)) fail(`Execution Requests tenant route contract changed or missing: ${required}`);
for (const required of [
  "EXECUTION_REQUESTS_VIEW: 'execution_requests.view'",
  "EXECUTION_REQUESTS_CREATE: 'execution_requests.create'",
  "EXECUTION_REQUESTS_SUBMIT: 'execution_requests.submit'",
  "EXECUTION_REQUESTS_CANCEL: 'execution_requests.cancel'",
  "EXECUTION_REQUESTS_REVIEW: 'execution_requests.review'",
  "EXECUTION_REQUESTS_EXECUTE: 'execution_requests.execute'",
]) if (!permissionsSource.includes(required)) fail(`Execution Requests frontend permission identifier changed unexpectedly: ${required}`);
if (!process.exitCode) pass('Execution Requests route and view/create/submit/cancel/review/execute permission identifiers remain unchanged.');

for (const required of [
  '`/execution-requests?${query}`',
  "'/execution-requests/options'",
  "'/execution-requests/recommendation-candidate'",
  "'/execution-requests/adapters'",
  "'/execution-requests/hardening-summary'",
  '`/execution-requests/${requestedRequestId}`',
  "'/execution-requests'",
  '`/execution-requests/${request.id}/submit`',
  '`/execution-requests/${request.id}/approve`',
  '`/execution-requests/${request.id}/reject`',
  '`/execution-requests/${request.id}/execute`',
  '`/execution-requests/${request.id}/execute-noop`',
  '`/execution-requests/${request.id}/audit-pack`',
  '`/execution-requests/${request.id}/security-audit`',
  '`/execution-requests/${request.id}/execution-review`',
  '`/execution-requests/${request.id}/prepare-retry`',
  '`/execution-requests/${request.id}/cancel`',
]) if (!pageSource.includes(required)) fail(`Execution Requests read/mutation endpoint contract changed or missing: ${required}`);
if (!process.exitCode) pass('Execution Requests list/options/adapters/hardening/detail/workflow/evidence endpoint contracts remain unchanged.');

for (const required of [
  'capabilities.canCreateExecutionRequests',
  'capabilities.canSubmitExecutionRequests',
  'capabilities.canCancelExecutionRequests',
  'capabilities.canReviewExecutionRequests',
  'capabilities.canExecuteExecutionRequests',
  'capabilities.canManageProducts',
  'capabilities.canViewSystemContext',
  'capabilities.canViewDecisionIntelligence',
]) if (!pageSource.includes(required)) fail(`Execution Requests capability boundary changed or missing: ${required}`);
if (!process.exitCode) pass('Create/submit/cancel/review/execute/product-write/System Context capability boundaries remain unchanged.');

for (const required of [
  "type ControlledRequestType = 'cost_standard_update' | 'product_min_stock_update';",
  "request_type: 'system_recommendation'",
  "source: 'system_context_page'",
  "requested_action: 'review_system_context_recommendation'",
  "source: 'execution_requests_page'",
  '? { standard_unit_cost: parsedValue }',
  ': { min_stock: parsedValue };',
  'body: JSON.stringify({ review_note: reviewNote.trim() || null })',
  'body: JSON.stringify({ rejection_reason: rejectionReason.trim() })',
  'body: JSON.stringify({ cancel_reason: cancelReason.trim() })',
]) if (!pageSource.includes(required)) fail(`Execution Requests canonical payload/value contract changed: ${required}`);
if (!process.exitCode) pass('Canonical request types, sources, action identifiers, product-field payloads, and review/cancel payload keys remain unchanged.');

for (const required of [
  "note: 'Created from the current System Context snapshot. Real execution is only available for approved controlled product-field requests.'",
  "body: JSON.stringify({ note: 'Submitted for human review from the registry UI.' })",
  "downloadCsv('execution-requests.csv'",
  "['Request ID', 'Workflow status', 'Request type', 'Product', 'Requested by', 'Created', 'Updated', 'Execution outcome', 'Reviewed by', 'Executed by', 'Review note', 'Rejection reason', 'Cancellation reason']",
]) if (!pageSource.includes(required)) fail(`Execution Requests stored note/technical CSV contract changed unexpectedly: ${required}`);
for (const forbidden of [
  "note: ui('Created from the current System Context snapshot.",
  "body: JSON.stringify({ note: ui('Submitted for human review from the registry UI.')",
  "downloadCsv(ui('execution-requests.csv')",
]) if (pageSource.includes(forbidden)) fail(`Execution Requests translates stored/technical payload data unexpectedly: ${forbidden}`);
if (!process.exitCode) pass('Stored lifecycle notes and technical CSV filename/header contract remain canonical English payload/schema data.');

for (const required of [
  'product.name', 'product.category', 'product.unit', 'request.id', 'request.requested_by_name', 'request.requested_by',
  'selected.payload?.reason', 'selected.payload?.note', 'selected.review_note', 'selected.rejection_reason', 'selected.cancel_reason',
  'event.label', 'adapter.label', 'adapter.description', 'hardeningSummary.closeout_recommendation', 'check.label', 'check.detail',
  'securityAudit.actor.role', 'check.message', 'auditPack.completeness.missing_actions', 'auditPack.notes',
  'review.retry_eligibility?.reason', 'review.failure.error_code', 'review.failure.error_message', 'review.review_notes',
  'beforeAfter.product_name', 'beforeAfter.product_id', 'JSON.stringify(value ?? null, null, 2)',
  'err instanceof ApiError ? err.message',
]) if (!pageSource.includes(required)) fail(`Execution Requests business/server-data evidence missing unexpectedly: ${required}`);
for (const forbidden of [
  'ui(product.name)', 'ui(product.category)', 'ui(product.unit)', 'ui(request.id)', 'ui(request.requested_by_name)', 'ui(request.requested_by)',
  'ui(selected.review_note)', 'ui(selected.rejection_reason)', 'ui(selected.cancel_reason)', 'ui(event.label)', 'ui(adapter.label)',
  'ui(adapter.description)', 'ui(hardeningSummary.closeout_recommendation)', 'ui(check.label)', 'ui(check.detail)', 'ui(check.message)',
  'ui(review.failure.error_code)', 'ui(review.failure.error_message)', 'ui(beforeAfter.product_name)', 'ui(beforeAfter.product_id)', 'ui(err.message)',
]) if (pageSource.includes(forbidden)) fail(`Execution Requests translates business/server data unexpectedly: ${forbidden}`);
if (!process.exitCode) pass('Product/request/user data, backend labels/guidance/evidence, notes, errors, and technical JSON remain raw business/server data.');

for (const required of [
  'Controlled execution requests', 'Create controlled product change', 'Request queue', 'Selected request', 'Workflow safeguards',
  'Approve this request? Approval does not execute it, but it makes the request eligible for a permitted execution step.',
  'Execute approved request: {adapter}? This is only enabled for controlled product-field updates.',
  'Complete this approved request without changing business data? This records a safe workflow completion only.',
  'Failed execution prepared for one controlled retry.', 'Security and separation-of-duties review', 'Technical snapshots (advanced)',
  'Workflow safeguard status', 'Built-in protections', 'Technical security evidence', 'Technical audit evidence',
  'Before / after evidence', 'No execution requests match the selected filters.',
  'Find new recommendation', 'New recommendation', 'Create minimum-stock request', 'No new recommendation found.',
]) if (!literalSet.has(required)) fail(`Execution Requests page-completion presentation is not catalog-backed: ${required}`);
if (!process.exitCode) pass('Execution Requests shell, create/queue/detail/actions, confirmations, safeguards, audit/security, and before/after presentation are catalog-backed.');

if (process.exitCode) process.exit(process.exitCode);
pass('Tenant Execution Requests multilingual page-completion checks passed.');
