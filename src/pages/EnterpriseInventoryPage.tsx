import { useState } from "react";
import {
  AlertsTab,
  ApprovalsTab,
  AttachmentsTab,
  AuditTrailTab,
  AutomationTab,
  CostControlTab,
  CycleCountsTab,
  ExecutionTab,
  ForecastTab,
  InsightsTab,
  InvoicesTab,
  LabelsTab,
  LocationsTab,
  NotificationsTab,
  OperationsDashboardTab,
  PackagesTab,
  ParLevelsTab,
  ProcurementMatchTab,
  ProductsTab,
  ReceivingTab,
  ReportsTab,
  RequisitionsTab,
  StockRiskTab,
  StockTransfersTab,
  SuppliersTab,
  SystemContextTab,
} from "../components/enterpriseInventory/tabs";
import { EnterpriseInventoryPageLayout } from "../components/enterpriseInventory/EnterpriseInventoryPageLayout";
import { EnterpriseInventoryTabPanel } from "../components/enterpriseInventory/EnterpriseInventoryTabPanel";
import { useEnterpriseInventoryPageFeedback } from "../components/enterpriseInventory/EnterpriseInventoryPageFeedback";
import { useEnterpriseInventoryStableData } from "../components/enterpriseInventory/EnterpriseInventoryStableData";
import { useEnterpriseInventoryFormState } from "../components/enterpriseInventory/EnterpriseInventoryFormState";
import {
  emptyAlertForm,
  emptyApprovalRuleForm,
  emptyBarcodeLabelForm,
  emptyNotificationDeliveryForm,
  emptyProductForm,
  emptyProductPackageForm,
  emptyPurchaseOrderShipmentForm,
  emptyShipmentBarcodeScanForm,
  emptyStorageLocationForm,
  emptySupplierCatalogForm,
  emptySupplierForm,
  emptySupplierInvoiceForm,
} from "../components/enterpriseInventory/EnterpriseInventoryForms";
import { useProductCostDerivedData } from "../components/enterpriseInventory/EnterpriseInventoryCostData";
import { useEnterpriseInventoryViewData } from "../components/enterpriseInventory/EnterpriseInventoryViewData";
import { useEnterpriseInventoryExecutionMutations } from "../components/enterpriseInventory/EnterpriseInventoryExecutionMutations";
import { useEnterpriseInventoryAutomationMutations } from "../components/enterpriseInventory/EnterpriseInventoryAutomationMutations";
import { useEnterpriseInventoryStockMutations } from "../components/enterpriseInventory/EnterpriseInventoryStockMutations";
import { useEnterpriseInventoryMasterDataMutations } from "../components/enterpriseInventory/EnterpriseInventoryMasterDataMutations";
import { useEnterpriseInventoryProcurementMutations } from "../components/enterpriseInventory/EnterpriseInventoryProcurementMutations";
import { useEnterpriseInventoryWorkflowMutations } from "../components/enterpriseInventory/EnterpriseInventoryWorkflowMutations";
import { createEnterpriseInventorySubmitHandlers } from "../components/enterpriseInventory/EnterpriseInventorySubmitHandlers";
import { useEnterpriseInventoryQueries } from "../components/enterpriseInventory/EnterpriseInventoryQueries";

function EnterpriseInventoryPage() {
  const [activeTab, setActiveTab] = useState("par-levels");
  const {
    errorMessage,
    mutationFeedback,
    refreshSystemContext,
    setErrorMessage,
    setStatusMessage,
    statusMessage,
  } = useEnterpriseInventoryPageFeedback();
  const {
    alertFilters,
    alertForm,
    alertResolutionNotes,
    approvalRuleForm,
    attachmentForm,
    auditFilters,
    automationDisableReasons,
    automationScheduleForm,
    barcodeLabelForm,
    cycleCountForm,
    editingProductId,
    editingProductPackageId,
    editingStorageLocationId,
    editingSupplierId,
    executionFilters,
    lastBarcodeLookup,
    notificationDeliveryForm,
    parLevelForm,
    productForm,
    productPackageForm,
    productSearch,
    purchaseOrderShipmentForm,
    requisitionForm,
    selectedSupplierPerformanceId,
    setAlertFilters,
    setAlertForm,
    setAlertResolutionNotes,
    setApprovalRuleForm,
    setAttachmentForm,
    setAuditFilters,
    setAutomationDisableReasons,
    setAutomationScheduleForm,
    setBarcodeLabelForm,
    setCycleCountForm,
    setEditingProductId,
    setEditingProductPackageId,
    setEditingStorageLocationId,
    setEditingSupplierId,
    setExecutionFilters,
    setLastBarcodeLookup,
    setNotificationDeliveryForm,
    setParLevelForm,
    setProductForm,
    setProductPackageForm,
    setProductSearch,
    setPurchaseOrderShipmentForm,
    setRequisitionForm,
    setSelectedSupplierPerformanceId,
    setShipmentBarcodeScanForm,
    setShipmentReceivingForm,
    setStockAdjustmentForm,
    setStockTransferForm,
    setStorageLocationForm,
    setSupplierCatalogForm,
    setSupplierForm,
    setSupplierInvoiceForm,
    setSupplierSearch,
    shipmentBarcodeScanForm,
    shipmentReceivingForm,
    stockAdjustmentForm,
    stockTransferForm,
    storageLocationForm,
    supplierCatalogForm,
    supplierForm,
    supplierInvoiceForm,
    supplierSearch,
  } = useEnterpriseInventoryFormState();

  const {
    productsQuery,
    productPackagesQuery,
    storageLocationsQuery,
    suppliersQuery,
    availableSuppliersQuery,
    supplierSlaBreachesQuery,
    supplierPerformanceQuery,
    lowStockQuery,
    stockMovementsQuery,
    dashboardSummaryQuery,
    dashboardLowStockQuery,
    dashboardOverdueShipmentsQuery,
    dashboardUnresolvedAlertsQuery,
    dashboardRecentActivityQuery,
    dashboardSupplierPerformanceQuery,
    inventoryValuationReportQuery,
    stockByLocationReportQuery,
    productMovementReportQuery,
    procurementSummaryReportQuery,
    productCostRiskSummaryQuery,
    productCostValuationSummaryQuery,
    productCostValuationDetailsQuery,
    productCostActionSummaryQuery,
    productCostActionPlanSummaryQuery,
    productCostActionCategorySummaryQuery,
    productCostActionImpactSummaryQuery,
    productCostActionSupplierSummaryQuery,
    productCostActionSourceSummaryQuery,
    productCostActionAgeSummaryQuery,
    productCostActionCoverageSummaryQuery,
    productCostAlertSummaryQuery,
    productCostRecommendationSummaryQuery,
    productCostDashboardSummaryQuery,
    productCostReportSummaryQuery,
    productCostGovernanceSummaryQuery,
    productCostGovernanceDetailsQuery,
    productCostGovernanceAuditPackQuery,
    productCostGovernanceSignoffSummaryQuery,
    productCostGovernanceReviewQueueQuery,
    productCostGovernanceReviewPackQuery,
    productCostGovernanceClosureSummaryQuery,
    productCostGovernanceHandoffSummaryQuery,
    productCostHardeningSummaryQuery,
    productCostOperationsRunbookSummaryQuery,
    productCostOperationsControlSummaryQuery,
    productCostOperationsEvidenceSummaryQuery,
    productCostOperationsReadinessSummaryQuery,
    reorderRecommendationsQuery,
    depletionRiskQuery,
    supplierTrustScoresQuery,
    operationalHealthQuery,
    inventoryAnomaliesQuery,
    demandForecastQuery,
    automationTypesQuery,
    automationSchedulesQuery,
    automationRunnerReadinessQuery,
    automationRunnerStatusQuery,
    automationRunEventsQuery,
    automationRunnerSafetyReportQuery,
    automationRunnerGovernancePackQuery,
    automationRunnerOperationsReviewQuery,
    automationRunnerAccountabilityDigestQuery,
    automationRunnerPolicyMatrixQuery,
    systemStatusQuery,
    systemContextQuery,
    systemExecutionGateQuery,
    systemContextSnapshotsQuery,
    systemContextSnapshotComparisonQuery,
    systemContextForecastRiskQuery,
    supportContextQuery,
    maintenanceContextQuery,
    announcementContextQuery,
    incidentContextQuery,
    executionAdaptersQuery,
    executionHardeningQuery,
    executionRequestsQuery,
    stockTransfersQuery,
    purchaseOrdersQuery,
    shipmentsQuery,
    shipmentItemsQuery,
    parLevelsQuery,
    cycleCountsQuery,
    requisitionsQuery,
    approvalRulesQuery,
    invoicesQuery,
    supplierCatalogQuery,
    notificationsQuery,
    alertsQuery,
    auditLogsQuery,
    barcodeLabelsQuery,
    attachmentsQuery,
  } = useEnterpriseInventoryQueries({
    productSearch,
    productPackageProductId: productPackageForm.product_id,
    supplierSearch,
    selectedSupplierPerformanceId,
    executionFilters,
    shipmentReceivingShipmentId: shipmentReceivingForm.shipment_id,
    alertFilters,
    auditFilters,
    attachmentEntityType: attachmentForm.entity_type,
    attachmentEntityId: attachmentForm.entity_id,
  });

  const stableData = useEnterpriseInventoryStableData({
    productsQuery,
    storageLocationsQuery,
    suppliersQuery,
    availableSuppliersQuery,
    supplierSlaBreachesQuery,
    lowStockQuery,
    stockMovementsQuery,
    dashboardLowStockQuery,
    dashboardOverdueShipmentsQuery,
    dashboardUnresolvedAlertsQuery,
    dashboardRecentActivityQuery,
    dashboardSupplierPerformanceQuery,
    reorderRecommendationsQuery,
    depletionRiskQuery,
    supplierTrustScoresQuery,
    inventoryAnomaliesQuery,
    systemContextSnapshotsQuery,
    automationSchedulesQuery,
    automationRunEventsQuery,
    automationRunnerSafetyReportQuery,
    automationRunnerGovernancePackQuery,
    automationRunnerOperationsReviewQuery,
    automationRunnerPolicyMatrixQuery,
    automationRunnerAccountabilityDigestQuery,
    executionRequestsQuery,
    executionAdaptersQuery,
    stockTransfersQuery,
    purchaseOrdersQuery,
    shipmentsQuery,
    alertsQuery,
    auditLogsQuery,
    shipmentItemsQuery,
  });

  const {
    products,
    storageLocations,
    suppliers,
    availableSuppliers,
    supplierSlaBreaches,
    lowStockItems,
    recentStockMovements,
    dashboardLowStockRows,
    dashboardOverdueShipments,
    dashboardUnresolvedAlerts,
    dashboardRecentActivity,
    dashboardSupplierPerformance,
  } = stableData;

  const {
    productCostRiskSummary,
    highVarianceCostRows,
    missingCostRows,
    inconsistentCostRows,
    productCostValuationSummary,
    productCostBasisRows,
    productCostCategoryRows,
    productCostTopValueRows,
    productCostValuationDetailRows,
    productCostActionRows,
    productCostPriorityBands,
    productCostNextActions,
    productCostActionCategories,
    productCostImpactRows,
    productCostTopImpactProducts,
    productCostActionSuppliers,
    productCostActionSources,
    productCostActionAgeBands,
    productCostActionCoverageRows,
    productCostCoverageGaps,
    productCostAlertGroups,
    productCostTopAlerts,
    productCostRecommendationGroups,
    productCostTopRecommendations,
    productCostDashboardCategories,
    productCostDashboardPriorityProducts,
    productCostGovernanceChecklist,
    productCostGovernanceFailedChecklist,
    productCostGovernanceWatchChecklist,
    productCostGovernanceRemediationPlan,
    productCostGovernancePriorityProducts,
    productCostGovernanceAuditRows,
    productCostGovernanceSignoffChecklist,
    productCostGovernanceBlockers,
    productCostGovernanceWarnings,
    productCostGovernanceQueueItems,
    productCostGovernanceReviewExportRows,
    productCostGovernanceClosureChecklist,
    productCostGovernanceHandoffChecklist,
    productCostGovernanceOwnerSummary,
    productCostHardeningFailedChecklist,
    productCostOperationsRhythm,
    productCostOperationsEscalationRules,
    productCostOperationsControlChecks,
    productCostOperationsEvidenceSections,
    productCostOperationsReadinessChecklist,
  } = useProductCostDerivedData({
    productCostRiskSummaryQuery,
    productCostValuationSummaryQuery,
    productCostValuationDetailsQuery,
    productCostActionSummaryQuery,
    productCostActionPlanSummaryQuery,
    productCostActionCategorySummaryQuery,
    productCostActionImpactSummaryQuery,
    productCostActionSupplierSummaryQuery,
    productCostActionSourceSummaryQuery,
    productCostActionAgeSummaryQuery,
    productCostActionCoverageSummaryQuery,
    productCostAlertSummaryQuery,
    productCostRecommendationSummaryQuery,
    productCostDashboardSummaryQuery,
    productCostGovernanceSummaryQuery,
    productCostGovernanceDetailsQuery,
    productCostGovernanceAuditPackQuery,
    productCostGovernanceSignoffSummaryQuery,
    productCostGovernanceReviewQueueQuery,
    productCostGovernanceReviewPackQuery,
    productCostGovernanceClosureSummaryQuery,
    productCostGovernanceHandoffSummaryQuery,
    productCostHardeningSummaryQuery,
    productCostOperationsRunbookSummaryQuery,
    productCostOperationsControlSummaryQuery,
    productCostOperationsEvidenceSummaryQuery,
    productCostOperationsReadinessSummaryQuery,
  });
  const {
    reorderRecommendations,
    depletionRiskRows,
    supplierTrustScores,
    inventoryAnomalies,
    systemContextSnapshots,
    automationSchedules,
    automationRunEvents,
    automationRunnerSafetyChecks,
    automationRunnerGovernanceChecks,
    automationRunnerOperationsChecks,
    automationRunnerPolicyRows,
    automationRunnerActorBreakdown,
    automationRunnerRequestBreakdown,
    automationRunnerDueSchedules,
    automationRunnerLinkedRequests,
    executionRequests,
    executionAdapters,
    stockTransfers,
    purchaseOrders,
    shipments,
    alerts,
    auditLogs,
    selectedShipmentItems,
  } = stableData;

  const {
    alertsSummary,
    approvalQueue,
    insightsSummary,
    operationsDashboardSummary,
    procurementMatchRows,
    procurementSummary,
    receivingSummary,
    selectedProductPackages,
    selectedReceivingShipment,
    selectedSupplierName,
    stockRiskSummary,
    stockTransferSummary,
  } = useEnterpriseInventoryViewData({
    alerts,
    cycleCounts: cycleCountsQuery.data ?? [],
    dashboardSummary: dashboardSummaryQuery.data,
    depletionRiskRows,
    inventoryAnomalies,
    invoices: invoicesQuery.data ?? [],
    lowStockItems,
    productPackages: productPackagesQuery.data,
    purchaseOrders,
    requisitions: requisitionsQuery.data ?? [],
    reorderRecommendations,
    selectedShipmentId: shipmentReceivingForm.shipment_id,
    selectedShipmentItems,
    shipments,
    stockTransfers,
    suppliers,
    supplierTrustScores,
  });

  const {
    submitExecutionRequestMutation,
    approveExecutionRequestMutation,
    rejectExecutionRequestMutation,
    executeExecutionRequestMutation,
    executeNoopExecutionRequestMutation,
    cancelExecutionRequestMutation,
  } = useEnterpriseInventoryExecutionMutations(mutationFeedback);

  const {
    createAutomationScheduleMutation,
    dryRunAutomationScheduleMutation,
    runAutomationScheduleMutation,
    pauseAutomationScheduleMutation,
    resumeAutomationScheduleMutation,
    disableAutomationScheduleMutation,
  } = useEnterpriseInventoryAutomationMutations(
    mutationFeedback,
    setAutomationScheduleForm,
  );

  const {
    createParLevelMutation,
    evaluateParLevelsMutation,
    createRequisitionMutation,
    createCycleCountMutation,
    reconcileCycleCountMutation,
    adjustStockMutation,
    createStockTransferMutation,
    executeStockTransferMutation,
    cancelStockTransferMutation,
  } = useEnterpriseInventoryStockMutations(
    mutationFeedback,
    setParLevelForm,
    setRequisitionForm,
    setCycleCountForm,
    setStockAdjustmentForm,
    setStockTransferForm,
  );

  const {
    saveStorageLocationMutation,
    deleteStorageLocationMutation,
    saveSupplierMutation,
    deleteSupplierMutation,
    saveProductMutation,
    deleteProductMutation,
    createProductPackageMutation,
    updateProductPackageMutation,
    deleteProductPackageMutation,
  } = useEnterpriseInventoryMasterDataMutations(
    mutationFeedback,
    products,
    editingStorageLocationId,
    setStorageLocationForm,
    setEditingStorageLocationId,
    editingSupplierId,
    setSupplierForm,
    setEditingSupplierId,
    editingProductId,
    setProductForm,
    setEditingProductId,
    setProductPackageForm,
    setEditingProductPackageId,
  );

  const {
    createShipmentFromPurchaseOrderMutation,
    purchaseOrderLifecycleMutation,
    receiveShipmentMutation,
    barcodeLookupMutation,
    finalizeShipmentMutation,
  } = useEnterpriseInventoryProcurementMutations(
    mutationFeedback,
    purchaseOrders,
    shipments,
    shipmentReceivingForm,
    shipmentBarcodeScanForm,
    setPurchaseOrderShipmentForm,
    emptyPurchaseOrderShipmentForm,
    setShipmentReceivingForm,
    setLastBarcodeLookup,
    setStatusMessage,
  );

  const {
    captureSystemContextSnapshotMutation,
    createApprovalRuleMutation,
    executeApprovalMutation,
    createSupplierCatalogMutation,
    createSupplierInvoiceMutation,
    createBarcodeLabelMutation,
    queueNotificationDeliveryMutation,
    processNotificationDeliveriesMutation,
    createAlertMutation,
    acknowledgeAlertMutation,
    resolveAlertMutation,
    reopenAlertMutation,
    escalateAlertMutation,
    createAttachmentMutation,
  } = useEnterpriseInventoryWorkflowMutations({
    mutationFeedback,
    resetApprovalRuleForm: () => setApprovalRuleForm(emptyApprovalRuleForm),
    resetSupplierCatalogForm: () =>
      setSupplierCatalogForm(emptySupplierCatalogForm),
    resetSupplierInvoiceForm: () =>
      setSupplierInvoiceForm(emptySupplierInvoiceForm),
    resetBarcodeLabelForm: () => setBarcodeLabelForm(emptyBarcodeLabelForm),
    resetNotificationDeliveryForm: () =>
      setNotificationDeliveryForm(emptyNotificationDeliveryForm),
    resetAlertForm: () => setAlertForm(emptyAlertForm),
    setAlertResolutionNotes,
    setAttachmentForm,
  });

  const {
    beginEditProductPackage,
    cancelEditProductPackage,
    handleAlertSubmit,
    handleAttachmentSubmit,
    handleBarcodeLabelSubmit,
    handleCycleCountSubmit,
    handleNotificationDeliverySubmit,
    handleParLevelSubmit,
    handleProductPackageSubmit,
    handlePurchaseOrderLifecycleAction,
    handlePurchaseOrderShipmentSubmit,
    handleShipmentBarcodeLookupSubmit,
    handleShipmentReceivingSubmit,
    handleStockAdjustmentSubmit,
  } = createEnterpriseInventorySubmitHandlers({
    parLevelForm,
    cycleCountForm,
    stockAdjustmentForm,
    purchaseOrderShipmentForm,
    shipmentBarcodeScanForm,
    shipmentReceivingForm,
    barcodeLabelForm,
    productPackageForm,
    notificationDeliveryForm,
    alertForm,
    attachmentForm,
    editingProductPackageId,
    emptyProductPackageForm,
    setErrorMessage,
    setStatusMessage,
    setProductPackageForm,
    setEditingProductPackageId,
    createParLevelMutation,
    createCycleCountMutation,
    adjustStockMutation,
    createShipmentFromPurchaseOrderMutation,
    purchaseOrderLifecycleMutation,
    barcodeLookupMutation,
    receiveShipmentMutation,
    createBarcodeLabelMutation,
    createProductPackageMutation,
    updateProductPackageMutation,
    queueNotificationDeliveryMutation,
    createAlertMutation,
    createAttachmentMutation,
  });

  return (
    <EnterpriseInventoryPageLayout
      activeTab={activeTab}
      onActiveTabChange={setActiveTab}
      statusMessage={statusMessage}
      errorMessage={errorMessage}
      onEvaluateParLevels={() => evaluateParLevelsMutation.mutate()}
      evaluatingParLevels={evaluateParLevelsMutation.isPending}
    >

      <EnterpriseInventoryTabPanel
        activeTab={activeTab}
        tab="operations-dashboard"
      >
        <OperationsDashboardTab
          summary={operationsDashboardSummary}
          lowStockRows={dashboardLowStockRows}
          lowStockLoading={dashboardLowStockQuery.isLoading}
          overdueShipments={dashboardOverdueShipments}
          overdueShipmentsLoading={dashboardOverdueShipmentsQuery.isLoading}
          unresolvedAlerts={dashboardUnresolvedAlerts}
          unresolvedAlertsLoading={dashboardUnresolvedAlertsQuery.isLoading}
          recentActivity={dashboardRecentActivity}
          recentActivityLoading={dashboardRecentActivityQuery.isLoading}
          supplierPerformance={dashboardSupplierPerformance}
          supplierPerformanceLoading={
            dashboardSupplierPerformanceQuery.isLoading
          }
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="par-levels">
        <ParLevelsTab
          form={parLevelForm}
          onFormChange={setParLevelForm}
          onSubmit={handleParLevelSubmit}
          isSaving={createParLevelMutation.isPending}
          products={products}
          storageLocations={storageLocations}
          parLevels={parLevelsQuery.data ?? []}
          loading={parLevelsQuery.isLoading}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="cycle-counts">
        <CycleCountsTab
          cycleCountForm={cycleCountForm}
          onCycleCountFormChange={setCycleCountForm}
          onCycleCountSubmit={handleCycleCountSubmit}
          isCreatingCycleCount={createCycleCountMutation.isPending}
          stockAdjustmentForm={stockAdjustmentForm}
          onStockAdjustmentFormChange={setStockAdjustmentForm}
          onStockAdjustmentSubmit={handleStockAdjustmentSubmit}
          isAdjustingStock={adjustStockMutation.isPending}
          products={products}
          storageLocations={storageLocations}
          cycleCounts={cycleCountsQuery.data ?? []}
          loading={cycleCountsQuery.isLoading}
          isReconciling={reconcileCycleCountMutation.isPending}
          onReconcile={(id) => reconcileCycleCountMutation.mutate(id)}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="stock-risk">
        <StockRiskTab
          lowStockItems={lowStockItems}
          lowStockLoading={lowStockQuery.isLoading}
          recentStockMovements={recentStockMovements}
          stockMovementsLoading={stockMovementsQuery.isLoading}
          stockRiskSummary={stockRiskSummary}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="insights">
        <InsightsTab
          operationalHealth={operationalHealthQuery.data}
          operationalHealthLoading={operationalHealthQuery.isLoading}
          inventoryAnomalies={inventoryAnomalies}
          inventoryAnomaliesLoading={inventoryAnomaliesQuery.isLoading}
          reorderRecommendations={reorderRecommendations}
          reorderRecommendationsLoading={reorderRecommendationsQuery.isLoading}
          depletionRiskRows={depletionRiskRows}
          depletionRiskLoading={depletionRiskQuery.isLoading}
          supplierTrustScores={supplierTrustScores}
          supplierTrustScoresLoading={supplierTrustScoresQuery.isLoading}
          insightsSummary={insightsSummary}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="forecast">
        <ForecastTab
          demandForecastRows={demandForecastQuery.data ?? []}
          isLoading={demandForecastQuery.isLoading}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="execution">
        <ExecutionTab
          systemStatusQuery={systemStatusQuery}
          executionRequestsQuery={executionRequestsQuery}
          executionAdaptersQuery={executionAdaptersQuery}
          executionHardeningQuery={executionHardeningQuery}
          executionRequests={executionRequests}
          executionAdapters={executionAdapters}
          executionFilters={executionFilters}
          setExecutionFilters={setExecutionFilters}
          submitExecutionRequestMutation={submitExecutionRequestMutation}
          approveExecutionRequestMutation={approveExecutionRequestMutation}
          rejectExecutionRequestMutation={rejectExecutionRequestMutation}
          executeExecutionRequestMutation={executeExecutionRequestMutation}
          executeNoopExecutionRequestMutation={
            executeNoopExecutionRequestMutation
          }
          cancelExecutionRequestMutation={cancelExecutionRequestMutation}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="system-context">
        <SystemContextTab
          systemExecutionGateQuery={systemExecutionGateQuery}
          systemContextQuery={systemContextQuery}
          systemContextSnapshotsQuery={systemContextSnapshotsQuery}
          systemContextSnapshotComparisonQuery={
            systemContextSnapshotComparisonQuery
          }
          systemContextForecastRiskQuery={systemContextForecastRiskQuery}
          supportContextQuery={supportContextQuery}
          maintenanceContextQuery={maintenanceContextQuery}
          announcementContextQuery={announcementContextQuery}
          incidentContextQuery={incidentContextQuery}
          systemContextSnapshots={systemContextSnapshots}
          captureSystemContextSnapshotMutation={
            captureSystemContextSnapshotMutation
          }
          refreshSystemContextQueries={refreshSystemContext}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="automation">
        <AutomationTab
          automationSchedules={automationSchedules}
          automationRunEvents={automationRunEvents}
          automationScheduleForm={automationScheduleForm}
          setAutomationScheduleForm={setAutomationScheduleForm}
          automationDisableReasons={automationDisableReasons}
          setAutomationDisableReasons={setAutomationDisableReasons}
          automationTypesQuery={automationTypesQuery}
          automationSchedulesQuery={automationSchedulesQuery}
          automationRunnerReadinessQuery={automationRunnerReadinessQuery}
          automationRunnerStatusQuery={automationRunnerStatusQuery}
          automationRunEventsQuery={automationRunEventsQuery}
          automationRunnerSafetyReportQuery={automationRunnerSafetyReportQuery}
          automationRunnerGovernancePackQuery={
            automationRunnerGovernancePackQuery
          }
          automationRunnerOperationsReviewQuery={
            automationRunnerOperationsReviewQuery
          }
          automationRunnerAccountabilityDigestQuery={
            automationRunnerAccountabilityDigestQuery
          }
          automationRunnerPolicyMatrixQuery={automationRunnerPolicyMatrixQuery}
          automationRunnerSafetyChecks={automationRunnerSafetyChecks}
          automationRunnerGovernanceChecks={automationRunnerGovernanceChecks}
          automationRunnerOperationsChecks={automationRunnerOperationsChecks}
          automationRunnerPolicyRows={automationRunnerPolicyRows}
          automationRunnerActorBreakdown={automationRunnerActorBreakdown}
          automationRunnerRequestBreakdown={automationRunnerRequestBreakdown}
          automationRunnerDueSchedules={automationRunnerDueSchedules}
          automationRunnerLinkedRequests={automationRunnerLinkedRequests}
          createAutomationScheduleMutation={createAutomationScheduleMutation}
          dryRunAutomationScheduleMutation={dryRunAutomationScheduleMutation}
          runAutomationScheduleMutation={runAutomationScheduleMutation}
          pauseAutomationScheduleMutation={pauseAutomationScheduleMutation}
          resumeAutomationScheduleMutation={resumeAutomationScheduleMutation}
          disableAutomationScheduleMutation={disableAutomationScheduleMutation}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="reports">
        <ReportsTab
          inventoryValuationReport={inventoryValuationReportQuery.data}
          inventoryValuationLoading={inventoryValuationReportQuery.isLoading}
          stockByLocationRows={stockByLocationReportQuery.data ?? []}
          stockByLocationLoading={stockByLocationReportQuery.isLoading}
          productMovementRows={productMovementReportQuery.data ?? []}
          productMovementLoading={productMovementReportQuery.isLoading}
          procurementSummaryReport={procurementSummaryReportQuery.data}
          procurementSummaryLoading={procurementSummaryReportQuery.isLoading}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="cost-control">
        <CostControlTab
          highVarianceCostRows={highVarianceCostRows}
          inconsistentCostRows={inconsistentCostRows}
          missingCostRows={missingCostRows}
          productCostActionAgeBands={productCostActionAgeBands}
          productCostActionAgeSummaryQuery={productCostActionAgeSummaryQuery}
          productCostActionCategories={productCostActionCategories}
          productCostActionCategorySummaryQuery={
            productCostActionCategorySummaryQuery
          }
          productCostActionCoverageRows={productCostActionCoverageRows}
          productCostActionCoverageSummaryQuery={
            productCostActionCoverageSummaryQuery
          }
          productCostActionImpactSummaryQuery={
            productCostActionImpactSummaryQuery
          }
          productCostActionPlanSummaryQuery={productCostActionPlanSummaryQuery}
          productCostActionRows={productCostActionRows}
          productCostActionSourceSummaryQuery={
            productCostActionSourceSummaryQuery
          }
          productCostActionSources={productCostActionSources}
          productCostActionSummaryQuery={productCostActionSummaryQuery}
          productCostActionSupplierSummaryQuery={
            productCostActionSupplierSummaryQuery
          }
          productCostActionSuppliers={productCostActionSuppliers}
          productCostAlertGroups={productCostAlertGroups}
          productCostAlertSummaryQuery={productCostAlertSummaryQuery}
          productCostBasisRows={productCostBasisRows}
          productCostCategoryRows={productCostCategoryRows}
          productCostCoverageGaps={productCostCoverageGaps}
          productCostDashboardCategories={productCostDashboardCategories}
          productCostDashboardPriorityProducts={
            productCostDashboardPriorityProducts
          }
          productCostDashboardSummaryQuery={productCostDashboardSummaryQuery}
          productCostGovernanceAuditPackQuery={
            productCostGovernanceAuditPackQuery
          }
          productCostGovernanceAuditRows={productCostGovernanceAuditRows}
          productCostGovernanceBlockers={productCostGovernanceBlockers}
          productCostGovernanceChecklist={productCostGovernanceChecklist}
          productCostGovernanceClosureChecklist={
            productCostGovernanceClosureChecklist
          }
          productCostGovernanceClosureSummaryQuery={
            productCostGovernanceClosureSummaryQuery
          }
          productCostGovernanceDetailsQuery={productCostGovernanceDetailsQuery}
          productCostGovernanceFailedChecklist={
            productCostGovernanceFailedChecklist
          }
          productCostGovernanceHandoffChecklist={
            productCostGovernanceHandoffChecklist
          }
          productCostGovernanceHandoffSummaryQuery={
            productCostGovernanceHandoffSummaryQuery
          }
          productCostGovernanceOwnerSummary={productCostGovernanceOwnerSummary}
          productCostGovernancePriorityProducts={
            productCostGovernancePriorityProducts
          }
          productCostGovernanceQueueItems={productCostGovernanceQueueItems}
          productCostGovernanceRemediationPlan={
            productCostGovernanceRemediationPlan
          }
          productCostGovernanceReviewExportRows={
            productCostGovernanceReviewExportRows
          }
          productCostGovernanceReviewPackQuery={
            productCostGovernanceReviewPackQuery
          }
          productCostGovernanceReviewQueueQuery={
            productCostGovernanceReviewQueueQuery
          }
          productCostGovernanceSignoffChecklist={
            productCostGovernanceSignoffChecklist
          }
          productCostGovernanceSignoffSummaryQuery={
            productCostGovernanceSignoffSummaryQuery
          }
          productCostGovernanceSummaryQuery={productCostGovernanceSummaryQuery}
          productCostGovernanceWarnings={productCostGovernanceWarnings}
          productCostGovernanceWatchChecklist={
            productCostGovernanceWatchChecklist
          }
          productCostHardeningFailedChecklist={
            productCostHardeningFailedChecklist
          }
          productCostHardeningSummaryQuery={productCostHardeningSummaryQuery}
          productCostImpactRows={productCostImpactRows}
          productCostNextActions={productCostNextActions}
          productCostOperationsControlChecks={
            productCostOperationsControlChecks
          }
          productCostOperationsControlSummaryQuery={
            productCostOperationsControlSummaryQuery
          }
          productCostOperationsEscalationRules={
            productCostOperationsEscalationRules
          }
          productCostOperationsEvidenceSections={
            productCostOperationsEvidenceSections
          }
          productCostOperationsEvidenceSummaryQuery={
            productCostOperationsEvidenceSummaryQuery
          }
          productCostOperationsReadinessChecklist={
            productCostOperationsReadinessChecklist
          }
          productCostOperationsReadinessSummaryQuery={
            productCostOperationsReadinessSummaryQuery
          }
          productCostOperationsRhythm={productCostOperationsRhythm}
          productCostOperationsRunbookSummaryQuery={
            productCostOperationsRunbookSummaryQuery
          }
          productCostPriorityBands={productCostPriorityBands}
          productCostRecommendationGroups={productCostRecommendationGroups}
          productCostRecommendationSummaryQuery={
            productCostRecommendationSummaryQuery
          }
          productCostReportSummaryQuery={productCostReportSummaryQuery}
          productCostRiskSummary={productCostRiskSummary}
          productCostRiskSummaryQuery={productCostRiskSummaryQuery}
          productCostTopAlerts={productCostTopAlerts}
          productCostTopImpactProducts={productCostTopImpactProducts}
          productCostTopRecommendations={productCostTopRecommendations}
          productCostTopValueRows={productCostTopValueRows}
          productCostValuationDetailRows={productCostValuationDetailRows}
          productCostValuationDetailsQuery={productCostValuationDetailsQuery}
          productCostValuationSummary={productCostValuationSummary}
          productCostValuationSummaryQuery={productCostValuationSummaryQuery}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="stock-transfers">
        <StockTransfersTab
          products={products}
          storageLocations={storageLocations}
          stockTransferForm={stockTransferForm}
          setStockTransferForm={setStockTransferForm}
          stockTransferSummary={stockTransferSummary}
          stockTransfers={stockTransfers}
          stockTransfersQuery={stockTransfersQuery}
          createStockTransferMutation={createStockTransferMutation}
          executeStockTransferMutation={executeStockTransferMutation}
          cancelStockTransferMutation={cancelStockTransferMutation}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="products">
        <ProductsTab
          editingProductId={editingProductId}
          emptyProductForm={emptyProductForm}
          emptyProductPackageForm={emptyProductPackageForm}
          productForm={productForm}
          productSearch={productSearch}
          products={products}
          productsQuery={productsQuery}
          saveProductMutation={saveProductMutation}
          deleteProductMutation={deleteProductMutation}
          setActiveTab={setActiveTab}
          setEditingProductId={setEditingProductId}
          setProductForm={setProductForm}
          setProductPackageForm={setProductPackageForm}
          setProductSearch={setProductSearch}
          suppliers={suppliers}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="suppliers">
        <SuppliersTab
          availableSuppliers={availableSuppliers}
          deleteSupplierMutation={deleteSupplierMutation}
          editingSupplierId={editingSupplierId}
          emptySupplierForm={emptySupplierForm}
          saveSupplierMutation={saveSupplierMutation}
          selectedSupplierPerformanceId={selectedSupplierPerformanceId}
          setEditingSupplierId={setEditingSupplierId}
          setSelectedSupplierPerformanceId={setSelectedSupplierPerformanceId}
          setSupplierForm={setSupplierForm}
          setSupplierSearch={setSupplierSearch}
          supplierForm={supplierForm}
          supplierPerformanceQuery={supplierPerformanceQuery}
          supplierSearch={supplierSearch}
          supplierSlaBreaches={supplierSlaBreaches}
          supplierSlaBreachesQuery={supplierSlaBreachesQuery}
          suppliers={suppliers}
          suppliersQuery={suppliersQuery}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="locations">
        <LocationsTab
          editingStorageLocationId={editingStorageLocationId}
          emptyStorageLocationForm={emptyStorageLocationForm}
          storageLocationForm={storageLocationForm}
          setEditingStorageLocationId={setEditingStorageLocationId}
          setStorageLocationForm={setStorageLocationForm}
          storageLocations={storageLocations}
          storageLocationsQuery={storageLocationsQuery}
          saveStorageLocationMutation={saveStorageLocationMutation}
          deleteStorageLocationMutation={deleteStorageLocationMutation}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel
        activeTab={activeTab}
        tab="procurement-match"
      >
        <ProcurementMatchTab
          createShipmentFromPurchaseOrderMutation={
            createShipmentFromPurchaseOrderMutation
          }
          handlePurchaseOrderLifecycleAction={
            handlePurchaseOrderLifecycleAction
          }
          handlePurchaseOrderShipmentSubmit={handlePurchaseOrderShipmentSubmit}
          invoicesQuery={invoicesQuery}
          procurementMatchRows={procurementMatchRows}
          procurementSummary={procurementSummary}
          purchaseOrderLifecycleMutation={purchaseOrderLifecycleMutation}
          purchaseOrders={purchaseOrders}
          purchaseOrdersQuery={purchaseOrdersQuery}
          purchaseOrderShipmentForm={purchaseOrderShipmentForm}
          setPurchaseOrderShipmentForm={setPurchaseOrderShipmentForm}
          shipmentsQuery={shipmentsQuery}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="receiving">
        <ReceivingTab
          barcodeLookupMutation={barcodeLookupMutation}
          emptyShipmentBarcodeScanForm={emptyShipmentBarcodeScanForm}
          finalizeShipmentMutation={finalizeShipmentMutation}
          handleShipmentBarcodeLookupSubmit={handleShipmentBarcodeLookupSubmit}
          handleShipmentReceivingSubmit={handleShipmentReceivingSubmit}
          lastBarcodeLookup={lastBarcodeLookup}
          receiveShipmentMutation={receiveShipmentMutation}
          receivingSummary={receivingSummary}
          selectedReceivingShipment={selectedReceivingShipment}
          selectedShipmentItems={selectedShipmentItems}
          setLastBarcodeLookup={setLastBarcodeLookup}
          setShipmentBarcodeScanForm={setShipmentBarcodeScanForm}
          setShipmentReceivingForm={setShipmentReceivingForm}
          shipmentBarcodeScanForm={shipmentBarcodeScanForm}
          shipmentItemsQuery={shipmentItemsQuery}
          shipmentReceivingForm={shipmentReceivingForm}
          shipments={shipments}
          shipmentsQuery={shipmentsQuery}
          storageLocations={storageLocations}
        />
      </EnterpriseInventoryTabPanel>
      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="requisitions">
        <RequisitionsTab
          createRequisitionMutation={createRequisitionMutation}
          products={products}
          requisitionForm={requisitionForm}
          requisitionsQuery={requisitionsQuery}
          setRequisitionForm={setRequisitionForm}
          storageLocations={storageLocations}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="approvals">
        <ApprovalsTab
          approvalQueue={approvalQueue}
          approvalRuleForm={approvalRuleForm}
          approvalRulesQuery={approvalRulesQuery}
          createApprovalRuleMutation={createApprovalRuleMutation}
          executeApprovalMutation={executeApprovalMutation}
          setApprovalRuleForm={setApprovalRuleForm}
          storageLocations={storageLocations}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="invoices">
        <InvoicesTab
          createSupplierCatalogMutation={createSupplierCatalogMutation}
          createSupplierInvoiceMutation={createSupplierInvoiceMutation}
          invoicesQuery={invoicesQuery}
          products={products}
          purchaseOrders={purchaseOrders}
          selectedSupplierName={selectedSupplierName}
          setSupplierCatalogForm={setSupplierCatalogForm}
          setSupplierInvoiceForm={setSupplierInvoiceForm}
          shipments={shipments}
          supplierCatalogForm={supplierCatalogForm}
          supplierCatalogQuery={supplierCatalogQuery}
          supplierInvoiceForm={supplierInvoiceForm}
          suppliers={suppliers}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="labels">
        <LabelsTab
          barcodeLabelForm={barcodeLabelForm}
          barcodeLabelsQuery={barcodeLabelsQuery}
          createBarcodeLabelMutation={createBarcodeLabelMutation}
          products={products}
          setBarcodeLabelForm={setBarcodeLabelForm}
          onBarcodeLabelSubmit={handleBarcodeLabelSubmit}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="packages">
        <PackagesTab
          editingProductPackageId={editingProductPackageId}
          emptyProductPackageForm={emptyProductPackageForm}
          productPackageForm={productPackageForm}
          productPackagesQuery={productPackagesQuery}
          products={products}
          selectedProductPackages={selectedProductPackages}
          createProductPackageMutation={createProductPackageMutation}
          updateProductPackageMutation={updateProductPackageMutation}
          deleteProductPackageMutation={deleteProductPackageMutation}
          beginEditProductPackage={beginEditProductPackage}
          cancelEditProductPackage={cancelEditProductPackage}
          setEditingProductPackageId={setEditingProductPackageId}
          setProductPackageForm={setProductPackageForm}
          onProductPackageSubmit={handleProductPackageSubmit}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="attachments">
        <AttachmentsTab
          attachmentForm={attachmentForm}
          attachmentsQuery={attachmentsQuery}
          createAttachmentMutation={createAttachmentMutation}
          setAttachmentForm={setAttachmentForm}
          onAttachmentSubmit={handleAttachmentSubmit}
        />
      </EnterpriseInventoryTabPanel>

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
    </EnterpriseInventoryPageLayout>
  );
}

export default EnterpriseInventoryPage;
