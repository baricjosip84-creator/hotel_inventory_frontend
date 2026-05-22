import {
  AlertsTab,
  AuditTrailTab,
  NotificationsTab,
} from "./tabs";
import { EnterpriseInventoryTabPanel } from "./EnterpriseInventoryTabPanel";
import type { EnterpriseInventoryPanelBaseProps } from "./EnterpriseInventoryPanelTypes";

type EnterpriseInventoryCompliancePanelsProps = EnterpriseInventoryPanelBaseProps;

export function EnterpriseInventoryCompliancePanels({
  activeTab,
  actions,
  formState,
  pageData,
}: EnterpriseInventoryCompliancePanelsProps) {
  const {
    alertFilters,
    alertForm,
    alertResolutionNotes,
    auditFilters,
    notificationDeliveryForm,
    setAlertFilters,
    setAlertForm,
    setAlertResolutionNotes,
    setAuditFilters,
    setNotificationDeliveryForm,
  } = formState;

  const { queries, stableData, viewData } = pageData;

  const { alertsQuery, auditLogsQuery, notificationsQuery } = queries;

  const { alerts, auditLogs, products } = stableData;

  const { alertsSummary } = viewData;

  const {
    acknowledgeAlertMutation,
    createAlertMutation,
    escalateAlertMutation,
    handleAlertSubmit,
    handleNotificationDeliverySubmit,
    processNotificationDeliveriesMutation,
    queueNotificationDeliveryMutation,
    reopenAlertMutation,
    resolveAlertMutation,
  } = actions;

  return (
    <>
      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="alerts">
        <AlertsTab
          alertForm={alertForm}
          alertFilters={alertFilters}
          alertResolutionNotes={alertResolutionNotes}
          alerts={alerts}
          alertsSummary={alertsSummary}
          isLoading={alertsQuery.isLoading}
          products={products}
          isCreatingAlert={createAlertMutation.isPending}
          isAcknowledgingAlert={acknowledgeAlertMutation.isPending}
          isEscalatingAlert={escalateAlertMutation.isPending}
          isResolvingAlert={resolveAlertMutation.isPending}
          isReopeningAlert={reopenAlertMutation.isPending}
          onAlertFormChange={setAlertForm}
          onAlertFiltersChange={setAlertFilters}
          onAlertResolutionNotesChange={setAlertResolutionNotes}
          onAlertSubmit={handleAlertSubmit}
          onAcknowledgeAlert={acknowledgeAlertMutation.mutate}
          onEscalateAlert={escalateAlertMutation.mutate}
          onResolveAlert={resolveAlertMutation.mutate}
          onReopenAlert={reopenAlertMutation.mutate}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="audit">
        <AuditTrailTab
          auditFilters={auditFilters}
          auditLogs={auditLogs}
          isLoading={auditLogsQuery.isLoading}
          onAuditFiltersChange={setAuditFilters}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="notifications">
        <NotificationsTab
          notificationDeliveryForm={notificationDeliveryForm}
          notifications={notificationsQuery.data ?? []}
          isLoading={notificationsQuery.isLoading}
          isQueueingDelivery={queueNotificationDeliveryMutation.isPending}
          isProcessingDeliveries={
            processNotificationDeliveriesMutation.isPending
          }
          onNotificationDeliveryFormChange={setNotificationDeliveryForm}
          onNotificationDeliverySubmit={handleNotificationDeliverySubmit}
          onProcessNotificationDeliveries={() =>
            processNotificationDeliveriesMutation.mutate()
          }
        />
      </EnterpriseInventoryTabPanel>
    </>
  );
}
