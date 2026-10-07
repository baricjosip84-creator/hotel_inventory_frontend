import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/StorageLocationsPage.tsx'), 'utf8');
const panel = fs.readFileSync(path.join(root, 'src/components/imports/InventoryCsvImportPanel.tsx'), 'utf8');
const importApi = fs.readFileSync(path.join(root, 'src/components/imports/inventoryCsvImport.ts'), 'utf8');
const translations = fs.readFileSync(path.join(root, 'src/i18n/tenantUiTranslations.ts'), 'utf8');
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

check(importApi.includes("'/inventory-imports/preview'"), 'inventory import preview still uses the existing preview endpoint');
check(importApi.includes('skipMutationFeedback: true'), 'validation preview suppresses the shared mutation success/error toast');
check(importApi.includes('Validation creates no tenant inventory data.'), 'source documents why validation must not look like a created tenant item');
check(panel.includes('onInteraction?: () => void;'), 'shared CSV panel exposes a narrow interaction callback for parent-page stale-feedback cleanup');
check(panel.includes("const [messageTone, setMessageTone] = useState<'info' | 'success' | 'warning'>('info');"), 'CSV feedback distinguishes neutral, successful, and invalid validation outcomes');
check(panel.includes("setMessageTone(preview.status === 'validated' ? 'success' : 'warning');"), 'invalid preview completion is explicitly warning-toned rather than success-toned');
check(panel.includes("messageTone === 'success' ? 'app-success-state' : messageTone === 'warning' ? 'app-warning-state' : 'app-info-state'"), 'CSV feedback renders with semantic app state styling');
check(panel.includes('onInteraction?.();\n    resetPreview();'), 'choosing a new CSV begins a new workflow and clears parent stale feedback');
check(panel.includes('onInteraction?.();\n    setBusy(true);'), 'validating a CSV begins a new workflow and clears parent stale feedback');
check(panel.includes('const startOver = () => {\n    onInteraction?.();'), 'Start Over also clears unrelated parent feedback');
check(page.includes('const [refreshMessage, setRefreshMessage] = useState<string | null>(null);'), 'Storage Locations owns refresh-specific success feedback');
check(page.includes('const [refreshError, setRefreshError] = useState<string | null>(null);'), 'Storage Locations owns refresh-specific failure feedback');
check(page.includes('const clearTransientFeedback = () => {'), 'Storage Locations defines one workflow-boundary feedback cleanup helper');
check(page.includes('setFormError(null);\n    setFormMessage(null);\n    setRefreshError(null);\n    setRefreshMessage(null);'), 'workflow-boundary cleanup clears both old form and refresh feedback');
check(page.includes("onChange={(event) => updateFormField('name', event.target.value)}"), 'starting a new name edit clears stale prior-operation feedback');
check(page.includes("onChange={(event) => updateFormField('temperature_zone', event.target.value)}"), 'starting a new storage-condition edit clears stale prior-operation feedback');
check(page.includes('onInteraction={clearTransientFeedback}'), 'bulk-import interaction is wired to clear stale create/retire feedback');
check(page.includes('const handleRefreshLocations = async () => {\n    clearTransientFeedback();\n    const result = await locationsQuery.refetch();'), 'Refresh Locations begins cleanly instead of leaving the prior save/retire message visible');
check(page.includes("setRefreshError(ui('Unable to refresh storage locations.'));"), 'failed refresh gets refresh-specific feedback');
check(page.includes("setRefreshMessage(ui('Storage locations refreshed.'));"), 'successful refresh gets explicit refresh completion feedback');
check(page.includes('onClick={() => void handleRefreshLocations()}'), 'Refresh Locations uses the explicit feedback-aware refresh handler');
check(page.includes('refreshMessage ? <div className="app-success-state"'), 'refresh success is rendered next to the list workflow');
check(page.includes('refreshError ? <div className="app-error-state"'), 'refresh failure is rendered next to the list workflow');
check(translations.includes('["Storage locations refreshed."'), 'refresh success copy is translated');
check(translations.includes('["Unable to refresh storage locations."'), 'refresh failure copy is translated');

if (process.exitCode) process.exit(process.exitCode);
console.log(`Storage Locations feedback-state surgical guard PASS (${checks}/${checks})`);
