import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const panelPath = path.join(root, 'src/pages/inventoryUsage/InventoryUsageQuickConsumePanel.tsx');
const dashboardPath = path.join(root, 'src/pages/inventoryUsage/InventoryUsageDashboard.tsx');
const pagePath = path.join(root, 'src/pages/InventoryUsagePage.tsx');
const panel = fs.readFileSync(panelPath, 'utf8');
const dashboard = fs.readFileSync(dashboardPath, 'utf8');
const page = fs.readFileSync(pagePath, 'utf8');

const requiredPanelContracts = [
  ['await the exact quick-consume request', 'const response = await onRecordBarcodeUsage(payload);'],
  ['clear the barcode after the request resolves', "barcode: '',\n        package_count: 1"],
  ['do not depend on optional response fields to clear', 'const productLabel = response?.barcode_match?.product_name'],
  ['show a visible success status beside the action controls', 'ref={completionStatusRef} role="status" aria-live="polite" style={styles.successBanner}'],
  ['show an explicit completion message', 'Quick consume recorded successfully'],
  ['confirm the form is ready for another scan', 'Barcode cleared and ready for the next scan.'],
  ['surface local post-submit failures instead of swallowing them', 'setCompletionError(`Quick consume failed: ${message}`);'],
  ['disable barcode editing while recording', 'autoComplete="off"\n            disabled={recording}'],
  ['disable camera scanning while recording', 'disabled={!canRecord || recording}'],
  ['return focus to the barcode field', 'barcodeInputRef.current?.focus();']
];

for (const [label, contract] of requiredPanelContracts) {
  if (!panel.includes(contract)) {
    throw new Error(`Quick-consume completion contract missing: ${label}`);
  }
}

if (panel.includes('draftRevisionRef') || panel.includes('submittedDraftRevision')) {
  throw new Error('Quick-consume completion must not be blocked by draft-revision comparisons after a successful response.');
}

if (panel.includes('catch {\n      // The parent mutation exposes')) {
  throw new Error('Quick-consume completion must not silently swallow post-submit errors.');
}

const resetIndex = panel.indexOf("barcode: '',\n        package_count: 1");
const responseFormattingIndex = panel.indexOf('const productLabel = response?.barcode_match?.product_name');
if (resetIndex < 0 || responseFormattingIndex < 0 || resetIndex > responseFormattingIndex) {
  throw new Error('The successful quick-consume reset must happen before optional response formatting.');
}

if (!dashboard.includes('onRecordBarcodeUsage: (payload: InventoryUsageBarcodeRequest) => Promise<InventoryUsageBarcodeResponse>;')) {
  throw new Error('Quick-consume async contract missing: dashboard response promise.');
}

if (!page.includes('return barcodeUsageMutation.mutateAsync({')) {
  throw new Error('Quick-consume async contract missing: page returns the mutation promise.');
}

if (!page.includes('onSuccess: (data, variables) => {\n      barcodePreviewMutation.reset();')) {
  throw new Error('Quick-consume async contract missing: preview resets only after successful recording.');
}

console.log('Inventory usage quick-consume completion contract passed.');
