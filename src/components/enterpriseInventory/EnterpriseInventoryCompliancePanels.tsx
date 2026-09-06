import { NotificationsTab } from './tabs/NotificationsTab';
import { EnterpriseInventoryTabPanel } from './EnterpriseInventoryTabPanel';
import type { EnterpriseInventoryPanelBaseProps } from './EnterpriseInventoryPanelTypes';

export function EnterpriseInventoryCompliancePanels({
  activeTab,
  actions,
  formState,
  pageData,
}: EnterpriseInventoryPanelBaseProps) {
  const { notificationDeliveryForm, notificationDeliveryOffset, notificationEventOffset, setNotificationDeliveryForm, setNotificationDeliveryOffset, setNotificationEventOffset } = formState;
  const { notificationsQuery, notificationDeliveriesQuery } = pageData.queries;
  const {
    handleNotificationDeliverySubmit,
    queueNotificationDeliveryMutation,
  } = actions;

  return (
    <EnterpriseInventoryTabPanel activeTab={activeTab} tab="notifications">
      <NotificationsTab
        notificationDeliveryForm={notificationDeliveryForm}
        notifications={notificationsQuery.data?.items ?? []}
        notificationPagination={notificationsQuery.data?.pagination}
        notificationOffset={notificationEventOffset}
        deliveries={notificationDeliveriesQuery.data?.items ?? []}
        deliveryPagination={notificationDeliveriesQuery.data?.pagination}
        deliveryOffset={notificationDeliveryOffset}
        isLoading={notificationsQuery.isLoading}
        deliveriesLoading={notificationDeliveriesQuery.isLoading}
        isQueueingDelivery={queueNotificationDeliveryMutation.isPending}
        onNotificationDeliveryFormChange={setNotificationDeliveryForm}
        onNotificationDeliverySubmit={handleNotificationDeliverySubmit}
        onNotificationOffsetChange={setNotificationEventOffset}
        onDeliveryOffsetChange={setNotificationDeliveryOffset}
      />
    </EnterpriseInventoryTabPanel>
  );
}
