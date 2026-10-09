import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const controller = read('src/components/enterpriseInventory/EnterpriseInventoryPageController.ts');
const tabs = read('src/components/enterpriseInventory/EnterpriseInventoryTabs.tsx');
const config = read('src/components/enterpriseInventory/EnterpriseInventoryTabConfig.ts');
const page = read('src/pages/EnterpriseInventoryPage.tsx');
const mutations = read('src/components/enterpriseInventory/EnterpriseInventoryWorkflowMutations.ts');
const requests = read('src/components/enterpriseInventory/EnterpriseInventoryRequests.ts');
const feedback = read('src/components/enterpriseInventory/EnterpriseInventoryMutationFeedback.ts');
const notificationTab = read('src/components/enterpriseInventory/tabs/NotificationsTab.tsx');
const provider = read('src/app/AppProviders.tsx');
const api = read('src/lib/api.ts');
const translations = read('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(read('package.json'));

const queue = mutations.match(/const queueNotificationDeliveryMutation = useMutation\(\{[\s\S]*?\n  \}\);/u)?.[0] ?? '';
const processMutation = mutations.match(/const processNotificationDeliveriesMutation = useMutation\(\{[\s\S]*?\n  \}\);/u)?.[0] ?? '';
const checks = [];
const check = (label, ok) => {
  checks.push(Boolean(ok));
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
};

// Browser refresh persistence and direct-link navigation.
check('Selected tab is read from router search parameters', controller.includes('useSearchParams()') && controller.includes("searchParams.get('tab')?.trim()"));
check('Initial state honors a permitted tab URL on first render', /useState\(\(\) =>[\s\S]*?key === requestedTab && isEnterpriseInventoryTabAccessible\(key\)[\s\S]*?\? requestedTab/u.test(controller));
check('Initial fallback uses first permitted tab, not unconditional Par levels', controller.includes('findFirstAccessibleEnterpriseInventoryTab()'));
check('URL tab remains subject to permission and entitlement checks', controller.includes('hasPermission(tab[2])') && controller.includes('getTenantFeatureEntitlement(subscriptionAccess, feature)?.allowed !== false'));
check('History/deep-link changes synchronize back into page state', controller.includes('useEffect(() =>') && controller.includes('if (activeTab !== resolvedTab) setActiveTabState(resolvedTab)'));
check('Inaccessible URL tab gracefully falls back to accessible workspace', controller.includes('requestedTabAllowed') && controller.includes('findFirstAccessibleEnterpriseInventoryTab(subscriptionAccess)'));
check('User tab selection resolves updater or direct value', controller.includes("typeof nextTab === 'function' ? nextTab(activeTab) : nextTab"));
check('Tab selection validates permissions again before navigation', /const setActiveTab = useCallback[\s\S]*?key === selected && isEnterpriseInventoryTabAccessible\(key, subscriptionAccess\)/u.test(controller));
check('Tab clicks persist selection into tab query parameter', controller.includes("nextParams.set('tab', selected)") && controller.includes('setSearchParams(nextParams, { replace: true })'));
check('Tab selection preserves other URL query parameters', controller.includes('new URLSearchParams(searchParams)'));
check('Tab selection updates displayed state on click', controller.includes('setActiveTabState(selected)'));
check('Repeated clicks do not unnecessarily navigate', controller.includes('if (selected === requestedTab) return;'));
check('Existing tab controls retain selection callback', tabs.includes('onClick={() => onChange(key)}') && page.includes('onActiveTabChange={setActiveTab}'));
check('Notifications remains an explicitly permission-gated tab', config.includes("['notifications', 'Notifications', TENANT_PERMISSIONS.NOTIFICATIONS_READ]"));

// Queue vs delivered and generic-feedback suppression.
check('Queue still posts to the original delivery endpoint', queue.includes('"/enterprise-inventory/notifications/deliveries"'));
check('Queue retains same payload builder and HTTP request method', queue.includes('buildNotificationDeliveryPayload(input)') && requests.includes("method: 'POST'"));
check('Only queue request opts out of generic API toast', queue.includes('{ skipMutationFeedback: true }') && !processMutation.includes('skipMutationFeedback: true'));
check('Existing exact queue confirmation remains', queue.includes('ui("Notification delivery queued.")'));
check('Existing queue form reset and invalidations remain', queue.includes('resetNotificationDeliveryForm') && queue.includes('"enterprise-notifications", "enterprise-notification-deliveries"'));
check('Queue failure still reports specific error', queue.includes('ui("Failed to queue notification delivery.")'));
check('Notifications form suppresses generic global submit feedback', /<form onSubmit=\{onNotificationDeliverySubmit\}[^>]*data-skip-global-action-feedback="true"/u.test(notificationTab));
check('Generic submit layer respects form opt-out', provider.includes('form.dataset.skipGlobalActionFeedback') && provider.includes('isFormExplicitlySkipped(form)'));
check('Shared API honors skipMutationFeedback without skipping actual request', api.includes('skipMutationFeedback') && api.includes('await performRequest(path, requestOptions)'));
check('Queue retains permission/event/destination gating', notificationTab.includes('TENANT_PERMISSIONS.NOTIFICATIONS_WRITE') && notificationTab.includes('notificationDeliveryForm.notification_event_id') && notificationTab.includes('destinationRequired'));
check('Queued status not conflated with delivered evidence', notificationTab.includes("queued: 'Queued'") && notificationTab.includes("delivered: 'Delivered'"));
check('Existing five-language queue translation remains', translations.includes('["Notification delivery queued.",'));
check('Existing process-delivery operation unchanged', processMutation.includes('"/enterprise-inventory/notifications/deliveries/process"') && processMutation.includes('processed'));
check('Batch 074 checker registered in package scripts', pkg.scripts?.['check:notifications-tab-queue-feedback-surgical-fix-v349312'] === 'node scripts/check-notifications-tab-queue-feedback-surgical-fix-v349312.mjs');

const passed = checks.filter(Boolean).length;
console.log(`Inventory Controls Notifications navigation/queue feedback: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exitCode = 1;
