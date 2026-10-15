import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const get = p => fs.readFileSync(path.join(root,p),'utf8');
const alerts = get('src/pages/AlertsPage.tsx');
const css = get('src/pages/AlertsPage.css');
const moves = get('src/pages/StockMovementsPage.tsx');
const moveCss = get('src/pages/StockMovementsPage.css');
const usage = get('src/pages/inventoryUsage/InventoryUsageDashboard.tsx');
const action = get('src/pages/OperationalActionCenterPage.tsx');
const i18n = get('src/i18n/tenantUiTranslations.ts');
let checks=0;
function test(name,check){assert.ok(check,name);checks++;console.log('PASS',name)}
test('Alert queue precedes optional manual alert form',alerts.indexOf('id="alerts-queue"') < alerts.indexOf('alerts-section--manual'));
test('Manual alert form collapsed by default',alerts.includes('<details className="app-panel app-panel--padded alerts-section alerts-section--manual"') && !alerts.includes('<details open className="app-panel app-panel--padded alerts-section alerts-section--manual"'));
test('Alerts manual creation still permission guarded',alerts.includes('{canManageAlerts ? (\n        <details'));
test('Manual form retains submit behavior',alerts.includes('<form onSubmit={submitManualAlert}'));
test('Damage/waste alert uses meaningful destination',alerts.includes("'/inventory-usage#usage-damage-waste-review', label: 'Review damage and waste records'"));
test('Usage source anchor actually exists',usage.includes('id="usage-damage-waste-review"'));
test('Normal usage alerts still route to usage',alerts.includes("label: 'Open Inventory Usage'"));
test('Other families preserve their permission guards',alerts.includes("TENANT_PERMISSIONS.SHIPMENTS_READ") && alerts.includes('TENANT_PERMISSIONS.STOCK_READ'));
test('Alert disclosure click treatment present',css.includes('.alerts-manual-disclosure'));
test('Stock movement current product source label',moves.includes('Current product name — original snapshot missing'));
test('Stock movement current location source label',moves.includes('Current location name — original snapshot missing'));
test('Stock movement current actor source label',moves.includes('Current user name — original snapshot missing'));
test('Stock movement current unit source label',moves.includes('Current unit — original snapshot missing'));
test('Legacy no-catalog fallbacks still exist',moves.includes('Historical Product name unavailable'));
test('View button remains an interactive button',moves.includes('onClick={() => toggleMovementDetails(movement.id)}'));
test('View button cannot wrap',moveCss.includes('.stock-movements-details-button {') && /white-space:\s*nowrap/.test(moveCss));
test('Action score remains visible and now explained',action.includes('Internal ordering score, not a percentage or task priority.'));
for(const phrase of ['Current product name — original snapshot missing','Current location name — original snapshot missing','Current user name — original snapshot missing','Current unit — original snapshot missing','Review damage and waste records','Internal ordering score, not a percentage or task priority. Compare within this action queue; use Action urgency for decisions.']){
  test(`Croatian translation: ${phrase.slice(0,35)}`,i18n.includes(`"${phrase}"`));
}
console.log(`FT030: ${checks}/${checks} static regression guards passed`);
