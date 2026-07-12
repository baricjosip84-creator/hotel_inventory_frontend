import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const panelPath = path.join(root, 'src/pages/inventoryUsage/InventoryUsageQuickConsumePanel.tsx');
const pagePath = path.join(root, 'src/pages/InventoryUsagePage.tsx');
const panel = fs.readFileSync(panelPath, 'utf8');
const page = fs.readFileSync(pagePath, 'utf8');

const requiredPanelContracts = [
  ['ignore stale mutation data on mount', "useRef<string | null>(result?.usage?.id || null)"],
  ['track the exact submitted draft', 'submittedDraftRef.current = {'],
  ['guard against the pre-submit result', 'submittedDraft.baselineResultId === completedUsageId'],
  ['match the completed result to the submitted barcode', 'resultBarcode !== submittedDraft.barcode'],
  ['match the completed result to the submitted location', 'resultStorageLocationId !== submittedDraft.storageLocationId'],
  ['preserve a draft changed while recording', 'currentDraftFingerprint !== submittedDraft.fingerprint'],
  ['disable preview while recording', '&& !recording;'],
  ['disable camera scanning while recording', 'disabled={!canRecord || recording}']
];

const requiredPageContracts = [
  ['clear stale record/evidence state before preview', 'barcodeUsageMutation.reset();\n    barcodeEvidenceAttachmentMutation.reset();\n    barcodePreviewMutation.reset();'],
  ['clear stale record/evidence state before recording', 'const handleRecordBarcodeUsage = (payload: InventoryUsageBarcodeRequest) => {\n    barcodeUsageMutation.reset();\n    barcodeEvidenceAttachmentMutation.reset();'],
  ['clear the completed preview only after recording succeeds', 'onSuccess: (data, variables) => {\n      barcodePreviewMutation.reset();']
];

for (const [label, contract] of requiredPanelContracts) {
  if (!panel.includes(contract)) {
    throw new Error(`Quick-consume draft-preservation contract missing: ${label}`);
  }
}

for (const [label, contract] of requiredPageContracts) {
  if (!page.includes(contract)) {
    throw new Error(`Quick-consume mutation-state contract missing: ${label}`);
  }
}

console.log('Inventory usage quick-consume draft-preservation contract passed.');
