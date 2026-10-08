import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const mutations = read('src/components/enterpriseInventory/EnterpriseInventoryWorkflowMutations.ts');
const requests = read('src/components/enterpriseInventory/EnterpriseInventoryRequests.ts');
const feedback = read('src/components/enterpriseInventory/EnterpriseInventoryMutationFeedback.ts');
const api = read('src/lib/api.ts');
const invoices = read('src/components/enterpriseInventory/tabs/InvoicesTab.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(read('package.json'));
const lifecycle = mutations.match(/const supplierInvoiceLifecycleMutation = useMutation\(\{[\s\S]*?\n  \}\);/u)?.[0] ?? '';
const create = mutations.match(/const createSupplierInvoiceMutation = useMutation\(\{[\s\S]*?\n  \}\);/u)?.[0] ?? '';
const update = mutations.match(/const updateSupplierInvoiceMutation = useMutation\(\{[\s\S]*?\n  \}\);/u)?.[0] ?? '';
const catalogDeactivation = mutations.match(/const deactivateSupplierCatalogMutation = useMutation\(\{[\s\S]*?\n  \}\);/u)?.[0] ?? '';
const checks = [];
const check = (description, condition) => {
  checks.push(Boolean(condition));
  console.log(`${condition ? 'PASS' : 'FAIL'}: ${description}`);
};

check('Invoice lifecycle retains existing versioned POST endpoint', lifecycle.includes('`/enterprise-inventory/supplier-invoices/${invoice.id}/${action}`') && lifecycle.includes('invoice.version'));
check('Invoice lifecycle preserves cancellation reason and payment reference payloads', lifecycle.includes('reason: reason ||') && lifecycle.includes('payment_reference: paymentReference?.trim()'));
check('Only invoice lifecycle requests opt out of generic API toast', lifecycle.includes('{ skipMutationFeedback: true }') && !create.includes('skipMutationFeedback: true') && !update.includes('skipMutationFeedback: true'));
check('Existing invoice create action keeps dedicated success wording', create.includes('ui("Supplier invoice draft created successfully.")'));
check('Existing invoice edit action keeps dedicated success wording', update.includes('ui("Supplier invoice draft updated successfully.")'));
check('Invoice submit keeps precise success feedback', lifecycle.includes('if (input.action === "submit") return ui("Supplier invoice submitted successfully.")'));
check('Invoice match keeps precise success feedback', lifecycle.includes('if (input.action === "match") return ui("Supplier invoice marked matched.")'));
check('Invoice payment keeps precise success feedback', lifecycle.includes('if (input.action === "pay") return ui("Supplier invoice marked paid.")'));
check('Invoice cancel keeps precise success feedback', lifecycle.includes('if (input.action === "cancel") return ui("Supplier invoice cancelled.")'));
check('Invoice revision keeps precise success feedback', lifecycle.includes('return ui("Supplier invoice returned to draft for revision.")'));
check('Lifecycle continues to refresh invoice, notification, and approval rules data', lifecycle.includes('["enterprise-invoices", "enterprise-notifications", "enterprise-approval-rules"]'));
check('Lifecycle keeps specific failure feedback', lifecycle.includes('mutationFeedback.error(ui("Failed to update supplier invoice lifecycle."))'));
check('Versioned helper opt-out remains optional for existing callers', requests.includes('options?: { skipMutationFeedback?: boolean }') && requests.includes('options?.skipMutationFeedback === true ? { skipMutationFeedback: true } : {}'));
check('Versioned helper preserves HTTP method, version, and body', /method: 'POST',[\s\S]*?version,[\s\S]*?body: JSON\.stringify\(body\)/u.test(requests));
check('Supplier catalog lifecycle unchanged (no feedback opt-out)', catalogDeactivation.includes('postEnterpriseInventoryVersionedRequest<SupplierCatalogItem>') && !catalogDeactivation.includes('skipMutationFeedback: true'));
check('API respects feedback suppression while retaining actual request', api.includes('!(options as SafeMutationRequestInit).skipMutationFeedback') && api.includes('await performRequest(path, requestOptions)'));
check('Page-specific success message is still presented after successful mutation', feedback.includes('setStatusMessage(successMessage(variables))') && lifecycle.includes('onSuccess: mutationFeedback.variable'));
check('Invoices page still runs five lifecycle actions through the mutation', ['submit', 'match', 'pay', 'cancel', 'revise'].every(action => invoices.includes(`runLifecycle(invoice, '${action}')`) || (action === 'revise' && invoices.includes("runLifecycle(invoice, 'revise')"))));
check('Client-side role permissions, confirmation and payment-reference prompting retained', invoices.includes('TENANT_PERMISSIONS.INVOICES_MATCH') && invoices.includes('TENANT_PERMISSIONS.INVOICES_MARK_PAID') && invoices.includes('window.confirm(prompt)') && invoices.includes("window.prompt(ui('Payment reference')"));
check('All five existing invoice-specific translations remain available', [
  'Supplier invoice submitted successfully.',
  'Supplier invoice marked matched.',
  'Supplier invoice marked paid.',
  'Supplier invoice cancelled.',
  'Supplier invoice returned to draft for revision.'
].every(label => translations.includes(`["${label}",`)));
check('Regression check registered in package script', pkg.scripts?.['check:inventory-supplier-invoice-lifecycle-feedback-v349304'] === 'node scripts/check-supplier-invoice-lifecycle-feedback-surgical-fix-v349304.mjs');

const passed = checks.filter(Boolean).length;
console.log(`Supplier invoice lifecycle feedback: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);
