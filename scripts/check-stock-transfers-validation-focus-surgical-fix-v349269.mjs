import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const pagePath = path.join(root, 'src/pages/StockTransfersPage.tsx');
const page = fs.readFileSync(pagePath, 'utf8');
const backendRoot = process.env.BACKEND_ROOT || '';
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) {
    console.error(`FAIL ${checks}: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS ${checks}: ${message}`);
  }
}

check(page.includes('const errorFeedbackRef = useRef<HTMLDivElement | null>(null);'), 'stock transfers has a dedicated focus target for actionable errors');
check(page.includes('const focusErrorFeedback = () => {'), 'stock transfers defines an explicit error-focus helper');
check(page.includes("errorFeedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });"), 'error focus scrolls the visible error into the current viewport');
check(page.includes("errorFeedbackRef.current?.focus({ preventScroll: true });"), 'error focus places keyboard focus on the visible error after scrolling');
check(page.includes("setError(normalizeError(mutationError, ui('Failed to create stock transfer.'), ui));\n      setMessage(null);\n      focusErrorFeedback();"), 'create-draft API rejection focuses its returned error');
check(page.includes("setError(normalizeError(mutationError, ui('Failed to update stock transfer.'), ui));\n      setMessage(null);\n      focusErrorFeedback();"), 'draft-update API rejection focuses its returned error');
check(page.includes('setError(validationError);\n      focusErrorFeedback();'), 'client-side transfer validation focuses the validation error');
check(page.includes("setError(ui('Refresh the selected transfer before saving draft changes.'));\n        focusErrorFeedback();"), 'stale edit-version validation also focuses the corrective message');
check(page.includes('ref={errorFeedbackRef}'), 'visible error state owns the dedicated focus ref');
check(page.includes('tabIndex={-1}'), 'visible error state is programmatically focusable without adding a normal tab stop');
check(page.includes('role="alert"'), 'visible error state exposes alert semantics');
check(page.includes('aria-live="assertive"'), 'visible error state is announced immediately to assistive technology');
check(page.includes('scrollMarginTop: 96'), 'error focus preserves space below the fixed application chrome');
check(page.includes("if (quantity > available) {\n          return `${sourceProduct.name} ${ui('has')}"), 'pre-submit availability validation remains intact');
check(page.includes('createMutation.mutate(form);'), 'valid transfer drafts still use the existing create mutation');

if (backendRoot) {
  const servicePath = path.join(backendRoot, 'src/services/inventory/stockTransferService.js');
  const service = fs.readFileSync(servicePath, 'utf8');
  check(service.includes('Insufficient unreserved source stock for ${product.name}. Required ${item.quantity}, available ${availableQuantity}; ${reservedQuantity} is reserved.'), 'backend unreserved-stock rejection remains intact');
  check(service.includes('Insufficient source stock for ${product.name}. Required ${item.quantity}, available ${availableQuantity}.'), 'backend source-stock rejection remains intact');
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`Stock transfers validation-focus surgical guard PASS (${checks}/${checks})`);
