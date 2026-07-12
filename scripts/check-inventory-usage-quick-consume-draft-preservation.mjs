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
  ['clear only after the request resolves successfully', "barcode: '',\n          package_count: 1"],
  ['preserve a draft edited while the request is pending', 'draftRevisionRef.current === submittedDraftRevision'],
  ['show a visible success status beside the action controls', 'role="status" aria-live="polite" style={styles.successBanner}'],
  ['show an explicit completion message', 'Quick consume recorded successfully'],
  ['confirm the form is ready for another scan', 'Barcode cleared and ready for the next scan.'],
  ['disable preview while recording', '&& !recording;'],
  ['disable camera scanning while recording', 'disabled={!canRecord || recording}']
];

const requiredAsyncContracts = [
  ['dashboard forwards a response promise', 'onRecordBarcodeUsage: (payload: InventoryUsageBarcodeRequest) => Promise<InventoryUsageBarcodeResponse>;'],
  ['page returns the mutation promise', 'return barcodeUsageMutation.mutateAsync({'],
  ['preview is cleared only after successful recording', 'onSuccess: (data, variables) => {\n      barcodePreviewMutation.reset();']
];

for (const [label, contract] of requiredPanelContracts) {
  if (!panel.includes(contract)) {
    throw new Error(`Quick-consume completion contract missing: ${label}`);
  }
}

if (panel.includes('lastCompletedUsageIdRef') || panel.includes('submittedDraftRef')) {
  throw new Error('Quick-consume completion must not depend on stale mutation-result effects.');
}

if (!dashboard.includes(requiredAsyncContracts[0][1])) {
  throw new Error(`Quick-consume async contract missing: ${requiredAsyncContracts[0][0]}`);
}

for (const [label, contract] of requiredAsyncContracts.slice(1)) {
  if (!page.includes(contract)) {
    throw new Error(`Quick-consume async contract missing: ${label}`);
  }
}

console.log('Inventory usage quick-consume completion and draft-preservation contract passed.');
