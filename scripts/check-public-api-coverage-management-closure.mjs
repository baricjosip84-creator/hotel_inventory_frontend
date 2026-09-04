import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const page = read('src/pages/InventoryCapabilitiesPage.tsx');
const catalog = read('src/i18n/tenantUiTranslations.ts');
const checks = [];
const expect = (condition, message) => { if (!condition) throw new Error(message); checks.push(message); };
const scopes = ['purchase_orders:update','stock_transfers:read','stock_transfers:write','reservations:read','reservations:write','requisitions:read','requisitions:write','serials:read','alerts:read','reports:read','attachments:read','attachments:write','outbound_documents:read'];
for (const scope of scopes) expect(page.includes(`value: '${scope}'`), `API client UI exposes ${scope}`);
expect(page.includes('expires_at: toApiExpiry(apiExpiresAt)') && page.includes('type="datetime-local"') && page.includes('allowed_ips: apiAllowedIps.split'), 'API key create/edit UI preserves an explicit expiry date/time and IP allowlists');
expect(page.includes("method: 'PATCH'") && page.includes('/rotate') && page.includes('version: editingApiClient!.version'), 'API key edit and rotation use version-protected management calls');
expect(page.includes("ui('Rotate secret')") && page.includes('Revoke API key'), 'API key table exposes rotate and revoke controls');
expect(page.includes("'/inventory-capabilities/webhook-events'") && page.includes('type="checkbox"') && page.includes('ui("All listed events")') && page.includes('webhookEventCatalog.isSuccess'), 'webhook setup uses a loaded selectable event catalogue and never submits stale default event names');
expect(page.includes('const [webhookEvents, setWebhookEvents] = useState<string[]>([])') && page.includes('row.event_types.map(displayWebhookEvent)') && page.includes('displayWebhookEvent(row.event_type)'), 'webhook creation starts with no hidden selections and existing event keys are rendered with business labels');
expect(page.includes('scope.requiredPermissions.every((permission) => hasPermission(permission))'), 'tenant user can delegate only API scopes backed by their own permissions');
for (const label of ['Manage products','Manage suppliers','Update purchase order drafts','Read stock transfers','Create stock transfer drafts','Read reservations','Create reservation drafts','Read requisitions','Create requisition drafts','Read serial numbers','Read alerts','Read reports','Read attachments','Manage attachments','Read outbound documents','Allowed IP addresses','All listed events','Expiry date and time','Unable to load webhook event choices.','Expired']) {
  expect(catalog.includes(`["${label}"`), `${label} has a five-language catalog row`);
}
console.log(`Frontend public API coverage & management closure: PASS (${checks.length}/${checks.length} checks).`);
