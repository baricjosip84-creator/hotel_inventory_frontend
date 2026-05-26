import { useQueryClient } from '@tanstack/react-query';
import { getRoleCapabilities } from '../../lib/permissions';
import { useProductPageActions } from './useProductPageActions';
import { useProductPageData } from './useProductPageData';
import { useProductPageState } from './useProductPageState';
import { useProductPageQueries } from './productQueries';

export function useProductPageViewModel() {
  const queryClient = useQueryClient();
  const { role, canManageProducts, canViewProductPackages, canManageProductPackages } = getRoleCapabilities();

  const productPageState = useProductPageState();

  const queries = useProductPageQueries({
    search: productPageState.search,
    categoryFilter: productPageState.categoryFilter,
    supplierFilter: productPageState.supplierFilter,
    costStatusFilter: productPageState.costStatusFilter,
    costBasisFilter: productPageState.costBasisFilter,
    costVarianceStatusFilter: productPageState.costVarianceStatusFilter,
    selectedPackageProduct: productPageState.selectedPackageProduct,
    selectedCostProduct: productPageState.selectedCostProduct,
    canViewProductPackages,
    costHistoryFilters: productPageState.costHistoryFilters,
    costValuationDetailFilters: productPageState.costValuationDetailFilters,
    costRiskDetailFilters: productPageState.costRiskDetailFilters,
    costActionDetailFilters: productPageState.costActionDetailFilters
  });

  const productPageData = useProductPageData(queries);

  const productPageActions = useProductPageActions({
    queryClient,
    productPageState,
    productPageData,
    canManageProducts,
    canManageProductPackages
  });

  return {
    ...productPageState,
    ...productPageData,
    costValuationQuery: queries.costValuationQuery,
    costValuationDetailsQuery: queries.costValuationDetailsQuery,
    handleOpenCostHistory: productPageActions.handleOpenCostHistory,
    handleExportCostValuationDetailsCsv: productPageActions.handleExportCostValuationDetailsCsv,
    costActionQuery: queries.costActionQuery,
    costActionPlanQuery: queries.costActionPlanQuery,
    costActionCategoryQuery: queries.costActionCategoryQuery,
    costActionImpactQuery: queries.costActionImpactQuery,
    costActionSupplierQuery: queries.costActionSupplierQuery,
    costActionSourceQuery: queries.costActionSourceQuery,
    costActionAgeQuery: queries.costActionAgeQuery,
    costActionCoverageQuery: queries.costActionCoverageQuery,
    costDashboardQuery: queries.costDashboardQuery,
    costHardeningQuery: queries.costHardeningQuery,
    costGovernanceQuery: queries.costGovernanceQuery,
    costGovernanceDetailsQuery: queries.costGovernanceDetailsQuery,
    costGovernanceAuditQuery: queries.costGovernanceAuditQuery,
    costGovernanceSignoffQuery: queries.costGovernanceSignoffQuery,
    costGovernanceReviewQueueQuery: queries.costGovernanceReviewQueueQuery,
    costGovernanceReviewPackQuery: queries.costGovernanceReviewPackQuery,
    costGovernanceClosureQuery: queries.costGovernanceClosureQuery,
    costGovernanceHandoffQuery: queries.costGovernanceHandoffQuery,
    costOperationsRunbookQuery: queries.costOperationsRunbookQuery,
    costOperationsControlQuery: queries.costOperationsControlQuery,
    costOperationsEvidenceQuery: queries.costOperationsEvidenceQuery,
    costOperationsReadinessQuery: queries.costOperationsReadinessQuery,
    costGovernanceFinalQuery: queries.costGovernanceFinalQuery,
    costPerformanceQuery: queries.costPerformanceQuery,
    costSecurityAuditQuery: queries.costSecurityAuditQuery,
    handleExportCostGovernanceAuditCsv: productPageActions.handleExportCostGovernanceAuditCsv,
    handleExportCostGovernanceReviewPackCsv: productPageActions.handleExportCostGovernanceReviewPackCsv,
    handleExportCostGovernanceClosureCsv: productPageActions.handleExportCostGovernanceClosureCsv,
    handleExportCostGovernanceHandoffCsv: productPageActions.handleExportCostGovernanceHandoffCsv,
    handlePrintCostGovernanceAudit: productPageActions.handlePrintCostGovernanceAudit,
    costReportQuery: queries.costReportQuery,
    handleExportCostReportCsv: productPageActions.handleExportCostReportCsv,
    handlePrintCostReport: productPageActions.handlePrintCostReport,
    costAlertQuery: queries.costAlertQuery,
    costRecommendationQuery: queries.costRecommendationQuery,
    costActionDetailsQuery: queries.costActionDetailsQuery,
    handleExportCostActionDetailsCsv: productPageActions.handleExportCostActionDetailsCsv,
    costRiskQuery: queries.costRiskQuery,
    costRiskDetailsQuery: queries.costRiskDetailsQuery,
    handleExportCostRiskDetailsCsv: productPageActions.handleExportCostRiskDetailsCsv,
    canManageProducts,
    role,
    isSubmitting: productPageActions.createMutation.isPending || productPageActions.updateMutation.isPending,
    handleSubmit: productPageActions.handleSubmit,
    handleCancelEdit: productPageActions.handleCancelEdit,
    packagesQuery: queries.packagesQuery,
    isPackageSubmitting: productPageActions.createPackageMutation.isPending || productPageActions.updatePackageMutation.isPending,
    canManageProductPackages,
    deletePackageMutation: productPageActions.deletePackageMutation,
    handleClosePackages: productPageActions.handleClosePackages,
    handlePackageSubmit: productPageActions.handlePackageSubmit,
    handleCancelPackageEdit: productPageActions.handleCancelPackageEdit,
    handleStartEditPackage: productPageActions.handleStartEditPackage,
    handleDeletePackage: productPageActions.handleDeletePackage,
    costHistoryQuery: queries.costHistoryQuery,
    standardCostHistoryQuery: queries.standardCostHistoryQuery,
    handleExportCostHistoryCsv: productPageActions.handleExportCostHistoryCsv,
    handleExportStandardCostHistoryCsv: productPageActions.handleExportStandardCostHistoryCsv,
    handleCloseCostHistory: productPageActions.handleCloseCostHistory,
    handleClearCostHistoryFilters: productPageActions.handleClearCostHistoryFilters,
    productsQuery: queries.productsQuery,
    deleteMutation: productPageActions.deleteMutation,
    handleExportProductsCsv: productPageActions.handleExportProductsCsv,
    handleOpenPackages: productPageActions.handleOpenPackages,
    handleStartEdit: productPageActions.handleStartEdit,
    handleDelete: productPageActions.handleDelete
  };
}
