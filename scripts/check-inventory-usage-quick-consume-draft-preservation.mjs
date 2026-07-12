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

const requiredPageContracts = [
  ['confirmed completion state', 'const [barcodeCompletion, setBarcodeCompletion] = useState({ key: 0, message: "" });'],
  ['preview reset after confirmed recording', 'onSuccess: (data, variables) => {\n      barcodePreviewMutation.reset();'],
  ['parent-owned completion key increment', 'key: current.key + 1'],
  ['specific successful completion message', 'Quick consume recorded successfully'],
  ['global success feedback', 'detail: { type: "success", message: completionMessage }'],
  ['global failure feedback', 'detail: { type: "error", message: `Quick consume failed: ${message}` }'],
  ['mutation promise returned to the panel', 'return barcodeUsageMutation.mutateAsync({']
];

for (const [label, contract] of requiredPageContracts) {
  if (!page.includes(contract)) {
    throw new Error(`Quick-consume page completion contract missing: ${label}`);
  }
}

const requiredDashboardContracts = [
  ['completion key prop', 'barcodeCompletionKey?: number;'],
  ['completion message prop', 'barcodeCompletionMessage?: string;'],
  ['panel remount on each confirmed success', 'key={barcodeCompletionKey}'],
  ['completion message passed into remounted panel', 'completionMessage={barcodeCompletionMessage}'],
  ['async record contract', 'onRecordBarcodeUsage: (payload: InventoryUsageBarcodeRequest) => Promise<InventoryUsageBarcodeResponse>;']
];

for (const [label, contract] of requiredDashboardContracts) {
  if (!dashboard.includes(contract)) {
    throw new Error(`Quick-consume dashboard completion contract missing: ${label}`);
  }
}

const requiredPanelContracts = [
  ['completion message initializes on remount', 'const [successMessage, setSuccessMessage] = useState(completionMessage);'],
  ['exact request is awaited', 'await onRecordBarcodeUsage(payload);'],
  ['success message is visible beside controls', '<div role="status" aria-live="polite" style={styles.successBanner}>'],
  ['failure message is visible beside controls', '<div role="alert" style={styles.errorText}>'],
  ['barcode is locked during recording', 'autoComplete="off"\n            disabled={recording}'],
  ['camera is locked during recording', 'disabled={!canRecord || recording}'],
  ['generic action feedback is suppressed for preview', 'data-skip-global-action-feedback="true"'],
  ['draft edits clear stale completion feedback', "setSuccessMessage('');\n    setCompletionError('');"]
];

for (const [label, contract] of requiredPanelContracts) {
  if (!panel.includes(contract)) {
    throw new Error(`Quick-consume panel completion contract missing: ${label}`);
  }
}

const forbiddenPanelPatterns = [
  ['result-watching reset effect', 'lastCompletedUsageIdRef'],
  ['draft-revision completion gate', 'draftRevisionRef'],
  ['child-owned barcode clearing after mutation', "barcode: '',\n        package_count: 1"],
  ['silent completion failure', 'catch {\n      //']
];

for (const [label, pattern] of forbiddenPanelPatterns) {
  if (panel.includes(pattern)) {
    throw new Error(`Quick-consume completion still contains forbidden race-prone behavior: ${label}`);
  }
}

console.log('Inventory usage quick-consume confirmed-completion contract passed.');
