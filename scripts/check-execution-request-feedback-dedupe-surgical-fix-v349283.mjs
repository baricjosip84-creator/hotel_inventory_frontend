import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/ExecutionRequestsPage.tsx'), 'utf8');
const api = fs.readFileSync(path.join(root, 'src/lib/api.ts'), 'utf8');

const functionBlock = (name, nextName) => {
  const start = page.indexOf(`const ${name} = async`);
  if (start < 0) return '';
  const end = nextName ? page.indexOf(`const ${nextName} = async`, start + 1) : page.length;
  return page.slice(start, end < 0 ? page.length : end);
};

const blocks = {
  createRecommendationRequest: functionBlock('createRecommendationRequest', 'createControlledProductRequest'),
  createControlledProductRequest: functionBlock('createControlledProductRequest', 'submitRequest'),
  submitRequest: functionBlock('submitRequest', 'approveRequest'),
  approveRequest: functionBlock('approveRequest', 'rejectRequest'),
  rejectRequest: functionBlock('rejectRequest', 'executeRequest'),
  executeRequest: functionBlock('executeRequest', 'executeNoopRequest'),
  executeNoopRequest: functionBlock('executeNoopRequest', 'loadRequestDetail'),
  prepareRetryRequest: functionBlock('prepareRetryRequest', 'cancelRequest'),
  cancelRequest: functionBlock('cancelRequest', 'clearFilters'),
};

const checks = [
  ['recommendation create suppresses shared mutation toast', /skipMutationFeedback:\s*true/.test(blocks.createRecommendationRequest)],
  ['controlled request create suppresses shared mutation toast', /skipMutationFeedback:\s*true/.test(blocks.createControlledProductRequest)],
  ['submit suppresses shared mutation toast', /skipMutationFeedback:\s*true/.test(blocks.submitRequest)],
  ['approve suppresses shared mutation toast', /skipMutationFeedback:\s*true/.test(blocks.approveRequest)],
  ['reject suppresses shared mutation toast', /skipMutationFeedback:\s*true/.test(blocks.rejectRequest)],
  ['execute suppresses shared mutation toast', /skipMutationFeedback:\s*true/.test(blocks.executeRequest)],
  ['no-op completion suppresses shared mutation toast', /skipMutationFeedback:\s*true/.test(blocks.executeNoopRequest)],
  ['retry preparation suppresses shared mutation toast', /skipMutationFeedback:\s*true/.test(blocks.prepareRetryRequest)],
  ['cancel suppresses shared mutation toast', /skipMutationFeedback:\s*true/.test(blocks.cancelRequest)],
  ['submit keeps page-owned success copy', /showTenantActionSuccess\(ui\('Execution request submitted for review\.'\)\)/.test(blocks.submitRequest)],
  ['approve keeps page-owned success copy', /showTenantActionSuccess\(ui\('Execution request approved\.'\)\)/.test(blocks.approveRequest)],
  ['reject keeps page-owned success copy', /showTenantActionSuccess\(ui\('Execution request rejected\.'\)\)/.test(blocks.rejectRequest)],
  ['execute keeps page-owned success copy', /showTenantActionSuccess\(ui\('Controlled execution completed\.'\)\)/.test(blocks.executeRequest)],
  ['no-op keeps page-owned success copy', /showTenantActionSuccess\(ui\('Request completed without a business-data change\.'\)\)/.test(blocks.executeNoopRequest)],
  ['retry keeps page-owned success copy', /showTenantActionSuccess\(ui\('Failed execution prepared for one controlled retry\.'\)\)/.test(blocks.prepareRetryRequest)],
  ['cancel keeps page-owned success copy', /showTenantActionSuccess\(ui\('Execution request cancelled\.'\)\)/.test(blocks.cancelRequest)],
  ['shared API feedback resolver remains intact for other callers', /normalizedPath\.endsWith\('\/submit'\)\) return 'Execution Request submitted successfully\.'/ .test(api)],
  ['mutation feedback skip option remains supported by shared API', /skipMutationFeedback\?: boolean/.test(api) && /!\(options as SafeMutationRequestInit\)\.skipMutationFeedback/.test(api)],
];

let pass = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}`);
  if (ok) pass += 1;
}
console.log(`\n${pass}/${checks.length} PASS`);
if (pass !== checks.length) process.exit(1);
