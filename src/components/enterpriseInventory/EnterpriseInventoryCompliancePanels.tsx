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
        onNotificationDeliveryFormChange={setNotificationDeliveryForm}
        onNotificationDeliverySubmit={handleNotificationDeliverySubmit}
      />
    </EnterpriseInventoryTabPanel>
  );
}
