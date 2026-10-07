import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const page = read('src/pages/OutboundPage.tsx');
const css = read('src/pages/OutboundPage.css');
const pkg = JSON.parse(read('package.json'));
let passed = 0;
const check = (condition, label) => {
  if (!condition) throw new Error(`FAIL ${label}`);
  passed += 1;
  console.log(`PASS ${label}`);
};

check(page.includes("const orderDetailRef = useRef<HTMLElement | null>(null);"), 'Outbound has a dedicated order-detail focus target');
check(page.includes("const clearOrderTransientState = () => {"), 'Outbound centralizes order-scoped transient-state cleanup');
check(page.includes("setDocumentPreview(null);\n    setEmailCompose(null);\n    setAttachmentFile(null);"), 'order switch clears document preview, email preview, and pending attachment state');
check(page.includes("const toggleOrderDetails = (orderId: string) => {"), 'order details use a single open/close transition helper');
check(page.includes("clearOrderTransientState();\n    setOrderAuditPage(1);\n    setSelectedOrderId(isClosing ? '' : orderId);"), 'switching order clears stale context before selecting the new record');
check(page.includes("const closeOrderDetails = () => {\n    clearOrderTransientState();\n    setSelectedOrderId('');"), 'closing order details clears transient order context');

check(page.includes("useEffect(() => {\n    if (!selectedOrderId) return undefined;"), 'selected-order change drives post-render focus behavior');
check(page.includes("detail.scrollIntoView({ behavior: 'smooth', block: 'start' });"), 'opened order details scroll into view');
check(page.includes("detail.focus({ preventScroll: true });"), 'opened order details receive programmatic focus');
check(page.includes("}, [selectedOrderId]);"), 'focus effect is scoped to selected-order changes');

check(page.includes("onClick={() => toggleOrderDetails(order.id)}"), 'order-card Open Details uses the context-safe transition helper');
check(page.includes("ref={orderDetailRef} tabIndex={-1} aria-label={ui('Order details')}"), 'Order details is focusable without adding a normal tab stop and keeps an accessible label');
check(page.includes("onClick={closeOrderDetails}"), 'detail-panel Close Details uses the same context cleanup path');
check(css.includes(".outbound-detail-workspace {\n  display: grid;\n  gap: 14px;\n  scroll-margin-top: 104px;"), 'order detail focus target protects against the fixed workspace header');
check(css.includes(".outbound-detail-workspace:focus"), 'focused order detail has visible focus treatment');

check(page.includes("skipMutationFeedback: true"), 'read-only document/email preview feedback suppression remains intact');
check(page.includes("const sendPreviewedEmail = async () =>"), 'actual email-send workflow remains separate from preview/open behavior');
check(pkg.scripts?.['check:inventory-outbound-order-detail-context-surgical-fix-v349277'] === 'node scripts/check-outbound-order-detail-context-surgical-fix-v349277.mjs', 'Batch 035 guard is registered');

console.log(`Outbound order detail/context surgical fix: ${passed}/${passed} PASS`);
