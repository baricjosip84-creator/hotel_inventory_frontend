import type { useProductPageViewModel } from './useProductPageViewModel';
import { ProductPackagesPanel } from './ProductPackagesPanel';
import { ProductCostHistoryPanel } from './ProductCostHistoryPanel';

type ProductDetailSectionsPanelProps = ReturnType<typeof useProductPageViewModel>;

export function ProductDetailSectionsPanel(props: ProductDetailSectionsPanelProps) {
  return (
    <>
      <ProductPackagesPanel
        selectedPackageProduct={props.selectedPackageProduct}
        packagesQuery={props.packagesQuery}
        packages={props.packages}
        packageForm={props.packageForm}
        editingPackage={props.editingPackage}
        packageError={props.packageError}
        packageMessage={props.packageMessage}
        isPackageSubmitting={props.isPackageSubmitting}
        canManageProductPackages={props.canManageProductPackages}
        deletePackagePending={props.deletePackageMutation.isPending}
        setPackageForm={props.setPackageForm}
        onClosePackages={props.handleClosePackages}
        onSubmit={props.handlePackageSubmit}
        onCancelPackageEdit={props.handleCancelPackageEdit}
        onStartEditPackage={props.handleStartEditPackage}
        onDeletePackage={props.handleDeletePackage}
      />

      <ProductCostHistoryPanel
        selectedCostProduct={props.selectedCostProduct}
        costHistoryQuery={props.costHistoryQuery}
        standardCostHistoryQuery={props.standardCostHistoryQuery}
        costHistory={props.costHistory}
        standardCostHistory={props.standardCostHistory}
        costSummary={props.costSummary}
        costHistoryFilters={props.costHistoryFilters}
        setCostHistoryFilters={props.setCostHistoryFilters}
        onExportCostHistoryCsv={props.handleExportCostHistoryCsv}
        onExportStandardCostHistoryCsv={props.handleExportStandardCostHistoryCsv}
        onCloseCostHistory={props.handleCloseCostHistory}
        onClearCostHistoryFilters={props.handleClearCostHistoryFilters}
      />
    </>
  );
}
