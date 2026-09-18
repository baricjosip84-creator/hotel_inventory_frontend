#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const execution = read('src/pages/ExecutionRequestsPage.tsx');
const purchaseOrders = read('src/pages/PurchaseOrdersPage.tsx');
const inventoryTypes = read('src/types/inventory.ts');
const translations = read('src/i18n/tenantUiTranslations.ts');
const packageJson = read('package.json');

let passed = 0;
const failures = [];
const check = (label, condition) => {
  if (condition) {
    passed += 1;
    console.log(`PASS: ${label}`);
  } else {
    failures.push(label);
    console.error(`FAIL: ${label}`);
  }
};
const sliceBetween = (source, startToken, endToken) => {
  const start = source.indexOf(startToken);
  if (start < 0) return '';
  const end = source.indexOf(endToken, start + startToken.length);
  return end < 0 ? source.slice(start) : source.slice(start, end);
};

const createWorkspaceTab = sliceBetween(
  purchaseOrders,
  "active={activeWorkspaceSection === 'create'}",
  "active={activeWorkspaceSection === 'detail'}"
);
check('The actual Create order workspace tab resets a completed locked create before navigating',
  createWorkspaceTab.includes('if (createdDraftId && !editingId) resetForm();')
  && createWorkspaceTab.includes("navigateWorkspaceSection('create', createRef.current)"));
check('The Create order workspace-tab assertion is scoped to that tab instead of matching another button elsewhere',
  createWorkspaceTab.includes("label={editingId ? ui('Edit draft') : ui('Create order')}")
  && !createWorkspaceTab.includes('Create purchase order'));

const attentionBlock = sliceBetween(execution, 'const causesSidebarAttention =', 'return (');
check('Execution Request row attention excludes requests the current reviewer is blocked from acting on',
  attentionBlock.includes("request.status === 'pending_review'")
  && attentionBlock.includes('!request.action_eligibility?.review?.blocked'));
check('Execution Request row attention excludes requests the current executor is blocked from acting on',
  attentionBlock.includes("request.status === 'approved'")
  && attentionBlock.includes('!request.action_eligibility?.execute?.blocked'));
check('Retry-ready failed requests still retain their distinct attention behavior',
  attentionBlock.includes("request.execution_status === 'failed'")
  && attentionBlock.includes('request.execution_review?.retry_eligibility?.eligible === true'));

const securityPanel = sliceBetween(execution, 'function ExecutionSecurityAuditPanel', 'function ExecutionAuditPackPanel');
check('Security Audit visibly distinguishes same-person review that used a recorded staffing fallback',
  securityPanel.includes('requester_reviewer_fallback_recorded')
  && securityPanel.includes("ui('Yes — staffing fallback recorded')"));
check('Security Audit visibly distinguishes same-person execution that used a recorded staffing fallback',
  securityPanel.includes('reviewer_executor_fallback_recorded')
  && securityPanel.includes("ui('Yes — staffing fallback recorded')"));
check('Security Audit shows whether any staffing fallback was used',
  securityPanel.includes("ui('Staffing fallback used')") && securityPanel.includes('staffing_fallback_used'));
check('Execution Request security-audit type includes the new fallback evidence fields',
  inventoryTypes.includes('requester_reviewer_fallback_recorded: boolean;')
  && inventoryTypes.includes('reviewer_executor_fallback_recorded: boolean;')
  && inventoryTypes.includes('staffing_fallback_used: boolean;'));
check('Staffing fallback security wording has complete five-language catalog entries',
  translations.includes('["Yes — staffing fallback recorded"')
  && translations.includes('["Staffing fallback used"'));

check('v3.49.200 frontend hardening guard is registered', packageJson.includes('check:inventory-testing-hardening-v349200'));
check('v3.49.200 follows v3.49.199 in prelint', /check:inventory-testing-hardening-v349199 && npm run check:inventory-testing-hardening-v349200/.test(packageJson));
check('v3.49.200 follows v3.49.199 in prebuild', /check:inventory-testing-hardening-v349199 && npm run check:inventory-testing-hardening-v349200/.test(packageJson));
check('v3.49.200 is wired into check:ci', packageJson.includes('npm run check:inventory-testing-hardening-v349200'));

if (failures.length) {
  console.error(`v3.49.200 Inventory testing hardening frontend guard: ${passed}/${passed + failures.length} PASS`);
  process.exit(1);
}
console.log(`v3.49.200 Inventory testing hardening frontend guard: PASS (${passed}/${passed})`);
