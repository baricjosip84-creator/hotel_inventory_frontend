import { CycleCountsTab, ParLevelsTab, StockRiskTab } from "./tabs";
import { EnterpriseInventoryTabPanel } from "./EnterpriseInventoryTabPanel";
import type { EnterpriseInventoryPanelBaseProps } from "./EnterpriseInventoryPanelTypes";

type EnterpriseInventoryStockOperationsPanelsProps = EnterpriseInventoryPanelBaseProps;

export function EnterpriseInventoryStockOperationsPanels({
  activeTab,
  actions,
  formState,
  pageData,
}: EnterpriseInventoryStockOperationsPanelsProps) {
  const {
    cycleCountForm,
    parLevelForm,
    setCycleCountForm,
    setParLevelForm,
    setStockAdjustmentForm,
    stockAdjustmentForm,
  } = formState;

  const { queries, stableData, viewData } = pageData;

  const {
    cycleCountsQuery,
    lowStockQuery,
    parLevelsQuery,
    stockMovementsQuery,
  } = queries;

  const {
    lowStockItems,
    products,
    recentStockMovements,
    storageLocations,
  } = stableData;

  const { stockRiskSummary } = viewData;

  const {
    adjustStockMutation,
    createCycleCountMutation,
    createParLevelMutation,
    handleCycleCountSubmit,
    handleParLevelSubmit,
    handleStockAdjustmentSubmit,
    reconcileCycleCountMutation,
  } = actions;

  return (
    <>
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
    </>
  );
}
