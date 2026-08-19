import { NotificationsTab } from './tabs/NotificationsTab';
import { EnterpriseInventoryTabPanel } from './EnterpriseInventoryTabPanel';
import type { EnterpriseInventoryPanelBaseProps } from './EnterpriseInventoryPanelTypes';

export function EnterpriseInventoryCompliancePanels({
  activeTab,
  actions,
  formState,
  pageData,
}: EnterpriseInventoryPanelBaseProps) {
  const { notificationDeliveryForm, setNotificationDeliveryForm } = formState;
  const { notificationsQuery, notificationDeliveriesQuery } = pageData.queries;
  const {
    handleNotificationDeliverySubmit,
    processNotificationDeliveriesMutation,
    queueNotificationDeliveryMutation,
  } = actions;

  return (
    <EnterpriseInventoryTabPanel activeTab={activeTab} tab="notifications">
      <NotificationsTab
        notificationDeliveryForm={notificationDeliveryForm}
        notifications={notificationsQuery.data ?? []}
        deliveries={notificationDeliveriesQuery.data ?? []}
        isLoading={notificationsQuery.isLoading}
        deliveriesLoading={notificationDeliveriesQuery.isLoading}
        isQueueingDelivery={queueNotificationDeliveryMutation.isPending}
        isProcessingDeliveries={processNotificationDeliveriesMutation.isPending}
        onNotificationDeliveryFormChange={setNotificationDeliveryForm}
        onNotificationDeliverySubmit={handleNotificationDeliverySubmit}
        onProcessNotificationDeliveries={() => processNotificationDeliveriesMutation.mutate()}
      />
    </EnterpriseInventoryTabPanel>
  );
}
