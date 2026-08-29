import type { QueryClient } from '@tanstack/react-query';
import type { useProductPageData } from './useProductPageData';
import type { useProductPageState } from './useProductPageState';
import { buildProductActionHandlers } from './productActionHandlers';
import { buildProductCostHistoryHandlers } from './productCostHistoryHandlers';
import { useProductMutations } from './productMutations';
import { useAppTranslation } from '../../i18n/I18nContext';

type UseProductPageActionsParams = {
  queryClient: QueryClient;
  productPageState: ReturnType<typeof useProductPageState>;
  productPageData: ReturnType<typeof useProductPageData>;
  canManageProducts: boolean;
  canManageProductPackages: boolean;
};

export function useProductPageActions({
  queryClient,
  productPageState,
  productPageData,
  canManageProducts,
  canManageProductPackages
}: UseProductPageActionsParams) {
  const { ui } = useAppTranslation();
  const {
    createMutation,
    updateMutation,
    deleteMutation,
    createPackageMutation,
    updatePackageMutation,
    deletePackageMutation
  } = useProductMutations({
    queryClient,
    selectedPackageProduct: productPageState.selectedPackageProduct,
    setEditingProduct: productPageState.setEditingProduct,
    setSelectedPackageProduct: productPageState.setSelectedPackageProduct,
    setSelectedCostProduct: productPageState.setSelectedCostProduct,
    setEditingPackage: productPageState.setEditingPackage,
    setForm: productPageState.setForm,
    setPackageForm: productPageState.setPackageForm,
    setFormMessage: productPageState.setFormMessage,
    setFormError: productPageState.setFormError,
    setPackageMessage: productPageState.setPackageMessage,
    setPackageError: productPageState.setPackageError,
    ui
  });

  const productActionHandlers = buildProductActionHandlers({
    ...productPageState,
    canManageProducts,
    canManageProductPackages,
    createMutation,
    updateMutation,
    deleteMutation,
    createPackageMutation,
    updatePackageMutation,
    deletePackageMutation,
    ui
  });

  const costHistoryHandlers = buildProductCostHistoryHandlers({
    selectedCostProduct: productPageState.selectedCostProduct,
    products: productPageData.products,
    costHistory: productPageData.costHistory,
    standardCostHistory: productPageData.standardCostHistory,
    costReportSummary: productPageData.costReportSummary,
    costGovernanceAuditPack: productPageData.costGovernanceAuditPack,
    costGovernanceReviewPack: productPageData.costGovernanceReviewPack,
    costGovernanceClosureSummary: productPageData.costGovernanceClosureSummary,
    costGovernanceHandoffSummary: productPageData.costGovernanceHandoffSummary,
    costValuationDetails: productPageData.costValuationDetails,
    costActionDetails: productPageData.costActionDetails,
    costRiskDetails: productPageData.costRiskDetails,
    setSelectedCostProduct: productPageState.setSelectedCostProduct,
    setCostHistoryFilters: productPageState.setCostHistoryFilters,
    ui
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    createPackageMutation,
    updatePackageMutation,
    deletePackageMutation,
    ...productActionHandlers,
    ...costHistoryHandlers
  };
}
