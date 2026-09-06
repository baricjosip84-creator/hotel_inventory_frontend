import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
const check = (name, condition) => checks.push({ name, condition: Boolean(condition) });

const types = read('src/components/enterpriseInventory/EnterpriseInventoryTypes.ts');
const api = read('src/components/enterpriseInventory/EnterpriseInventoryApi.ts');
const formState = read('src/components/enterpriseInventory/EnterpriseInventoryFormState.ts');
const controller = read('src/components/enterpriseInventory/EnterpriseInventoryPageController.ts');
const queries = read('src/components/enterpriseInventory/EnterpriseInventoryQueries.ts');
const panels = read('src/components/enterpriseInventory/EnterpriseInventoryCompliancePanels.tsx');
const tab = read('src/components/enterpriseInventory/tabs/NotificationsTab.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');
const pkg = read('package.json');

check('notification pagination type exists', types.includes('export type NotificationHistoryPagination'));
check('event page response type exists', types.includes('export type NotificationEventPage'));
check('delivery page response type exists', types.includes('export type NotificationDeliveryPage'));
check('delivery type exposes queue actor', types.includes('queued_by_user_id?: string | null'));
check('delivery type exposes process actor', types.includes('last_process_triggered_by_user_id?: string | null'));
check('events API sends offset and limit', /fetchNotifications\(offset = 0, limit = 50\)[\s\S]{0,300}offset: String\(offset\)[\s\S]{0,200}limit: String\(limit\)/.test(api));
check('deliveries API sends offset and limit', /fetchNotificationDeliveries\(offset = 0, limit = 50\)[\s\S]{0,300}offset: String\(offset\)[\s\S]{0,200}limit: String\(limit\)/.test(api));
check('event offset has tenant page state', formState.includes('notificationEventOffset') && formState.includes('setNotificationEventOffset'));
check('delivery offset has tenant page state', formState.includes('notificationDeliveryOffset') && formState.includes('setNotificationDeliveryOffset'));
check('controller passes event offset', controller.includes('notificationEventOffset'));
check('controller passes delivery offset', controller.includes('notificationDeliveryOffset'));
check('event query key includes offset', queries.includes("queryKey: ['enterprise-notifications', notificationEventOffset]"));
check('delivery query key includes offset', queries.includes("queryKey: ['enterprise-notification-deliveries', notificationDeliveryOffset]"));
check('event query fetches selected page', queries.includes('fetchNotifications(notificationEventOffset)'));
check('delivery query fetches selected page', queries.includes('fetchNotificationDeliveries(notificationDeliveryOffset)'));
check('panel consumes event page items', panels.includes('notifications={notificationsQuery.data?.items ?? []}'));
check('panel consumes delivery page items', panels.includes('deliveries={notificationDeliveriesQuery.data?.items ?? []}'));
check('panel passes event pagination', panels.includes('notificationPagination={notificationsQuery.data?.pagination}'));
check('panel passes delivery pagination', panels.includes('deliveryPagination={notificationDeliveriesQuery.data?.pagination}'));
check('delivery history displays queue actor', tab.includes("'Queued by'") && tab.includes('queued_by_name'));
check('delivery history displays process actor', tab.includes("'Last processed by'") && tab.includes('last_process_triggered_by_name'));
check('delivery history has previous navigation', tab.includes('onDeliveryOffsetChange(Math.max(0, deliveryOffset -'));
check('delivery history has next navigation', tab.includes('onDeliveryOffsetChange(deliveryOffset +'));
check('event history has previous navigation', tab.includes('onNotificationOffsetChange(Math.max(0, notificationOffset -'));
check('event history has next navigation', tab.includes('onNotificationOffsetChange(notificationOffset +'));
check('pagination displays exact visible range', tab.includes("ui('{start}–{end} of {total}')"));
check('queue actor has legacy fallback label', tab.includes("ui('System / legacy')"));
check('process actor has system worker fallback label', tab.includes("ui('System worker')"));
check('queue actor translation exists in five-language catalog', translations.includes('["Queued by",'));
check('process actor translation exists in five-language catalog', translations.includes('["Last processed by",'));
check('system worker translation exists', translations.includes('["System worker",'));
check('zero records translation exists', translations.includes('["0 records",'));
check('v144 checker wired into frontend check chain', pkg.includes('check:simulation-notification-delivery-accountability-v349144'));

let passed = 0;
for (const item of checks) {
  if (item.condition) { passed += 1; console.log(`PASS ${item.name}`); }
  else console.error(`FAIL ${item.name}`);
}
console.log(`v3.49.144 notification delivery accountability frontend: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);
