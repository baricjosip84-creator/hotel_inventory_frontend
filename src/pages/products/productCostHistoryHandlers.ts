import type { Dispatch, SetStateAction } from 'react';
import type {
  ProductCostActionDetailsResponse,
  ProductCostGovernanceAuditPackResponse,
  ProductCostGovernanceClosureSummaryResponse,
  ProductCostGovernanceHandoffSummaryResponse,
  ProductCostGovernanceReviewPackResponse,
  ProductCostReportSummaryResponse,
  ProductCostRiskDetailsResponse,
  ProductCostRiskItem,
  ProductCostValuationDetailsResponse,
  ProductItem,
} from '../../types/inventory';
import { emptyCostHistoryFilters } from './productFormDefaults';
import { scrollToFormSection } from '../../lib/scrollToForm';
import type { CostHistoryFilterState } from './productCostHistoryApi';
import { fetchAllProductCostHistory, fetchAllProductStandardCostHistory } from './productCostHistoryApi';
import {
  exportCostActionDetailsCsv,
  exportCostGovernanceAuditCsv,
  exportCostGovernanceClosureCsv,
  exportCostGovernanceHandoffCsv,
  exportCostGovernanceReviewPackCsv,
  exportCostHistoryCsv,
  exportCostReportCsv,
  exportCostRiskDetailsCsv,
  exportCostValuationDetailsCsv,
  exportProductsCsv,
  exportStandardCostHistoryCsv,
  printCostGovernanceAudit,
  printCostReport
} from './productCsvExports';

type BuildProductCostHistoryHandlersParams = {
  selectedCostProduct: ProductItem | ProductCostRiskItem | null;
  products: ProductItem[];
  costHistoryFilters: CostHistoryFilterState;
  costReportSummary?: ProductCostReportSummaryResponse;
  costGovernanceAuditPack?: ProductCostGovernanceAuditPackResponse;
  costGovernanceReviewPack?: ProductCostGovernanceReviewPackResponse;
  costGovernanceClosureSummary?: ProductCostGovernanceClosureSummaryResponse;
  costGovernanceHandoffSummary?: ProductCostGovernanceHandoffSummaryResponse;
  costValuationDetails?: ProductCostValuationDetailsResponse;
  costActionDetails?: ProductCostActionDetailsResponse;
  costRiskDetails?: ProductCostRiskDetailsResponse;
  setSelectedCostProduct: Dispatch<SetStateAction<ProductItem | ProductCostRiskItem | null>>;
  setCostHistoryFilters: Dispatch<SetStateAction<CostHistoryFilterState>>;
  ui: (englishText: string) => string;
  canViewStock: boolean;
};

export function buildProductCostHistoryHandlers({
  selectedCostProduct,
  products,
  costHistoryFilters,
  costReportSummary,
  costGovernanceAuditPack,
  costGovernanceReviewPack,
  costGovernanceClosureSummary,
  costGovernanceHandoffSummary,
  costValuationDetails,
  costActionDetails,
  costRiskDetails,
  setSelectedCostProduct,
  setCostHistoryFilters,
  ui,
  canViewStock
}: BuildProductCostHistoryHandlersParams) {
  const handleOpenCostHistory = (product: ProductItem | ProductCostRiskItem) => {
    setSelectedCostProduct(product);
    setCostHistoryFilters(emptyCostHistoryFilters());
    scrollToFormSection('product-cost-history-panel');
  };

  const handleCloseCostHistory = () => {
    setSelectedCostProduct(null);
    setCostHistoryFilters(emptyCostHistoryFilters());
  };

  const handleClearCostHistoryFilters = () => {
    setCostHistoryFilters(emptyCostHistoryFilters());
  };

  const handleExportCostHistoryCsv = async () => {
    if (!selectedCostProduct) return;
    const completeHistory = await fetchAllProductCostHistory(selectedCostProduct.id, costHistoryFilters);
    exportCostHistoryCsv(selectedCostProduct, completeHistory, ui);
  };

  const handleExportStandardCostHistoryCsv = async () => {
    if (!selectedCostProduct) return;
    const completeHistory = await fetchAllProductStandardCostHistory(selectedCostProduct.id);
    exportStandardCostHistoryCsv(selectedCostProduct, completeHistory, ui);
  };

  const handleExportProductsCsv = () => {
    exportProductsCsv(products, ui, canViewStock);
  };

  const handleExportCostReportCsv = () => {
    exportCostReportCsv(costReportSummary, ui);
  };

  const handlePrintCostReport = () => {
    printCostReport(costReportSummary);
  };

  const handleExportCostGovernanceAuditCsv = () => {
    exportCostGovernanceAuditCsv(costGovernanceAuditPack, ui);
  };

  const handleExportCostGovernanceReviewPackCsv = () => {
    exportCostGovernanceReviewPackCsv(costGovernanceReviewPack, ui);
  };

  const handleExportCostGovernanceClosureCsv = () => {
    exportCostGovernanceClosureCsv(costGovernanceClosureSummary, ui);
  };

  const handleExportCostGovernanceHandoffCsv = () => {
    exportCostGovernanceHandoffCsv(costGovernanceHandoffSummary, ui);
  };

  const handlePrintCostGovernanceAudit = () => {
    printCostGovernanceAudit(costGovernanceAuditPack);
  };

  const handleExportCostValuationDetailsCsv = () => {
    exportCostValuationDetailsCsv(costValuationDetails, ui);
  };

  const handleExportCostActionDetailsCsv = () => {
    exportCostActionDetailsCsv(costActionDetails, ui);
  };

  const handleExportCostRiskDetailsCsv = () => {
    exportCostRiskDetailsCsv(costRiskDetails, ui);
  };

  return {
    handleOpenCostHistory,
    handleCloseCostHistory,
    handleClearCostHistoryFilters,
    handleExportCostHistoryCsv,
    handleExportStandardCostHistoryCsv,
    handleExportProductsCsv,
    handleExportCostReportCsv,
    handlePrintCostReport,
    handleExportCostGovernanceAuditCsv,
    handleExportCostGovernanceReviewPackCsv,
    handleExportCostGovernanceClosureCsv,
    handleExportCostGovernanceHandoffCsv,
    handlePrintCostGovernanceAudit,
    handleExportCostValuationDetailsCsv,
    handleExportCostActionDetailsCsv,
    handleExportCostRiskDetailsCsv
  };
}
