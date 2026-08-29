import type { Dispatch, SetStateAction } from 'react';
import type {
  ProductCostActionDetailsResponse,
  ProductCostGovernanceAuditPackResponse,
  ProductCostGovernanceClosureSummaryResponse,
  ProductCostGovernanceHandoffSummaryResponse,
  ProductCostGovernanceReviewPackResponse,
  ProductCostHistoryItem,
  ProductCostReportSummaryResponse,
  ProductCostRiskDetailsResponse,
  ProductCostRiskItem,
  ProductCostValuationDetailsResponse,
  ProductItem,
  ProductStandardCostHistoryItem
} from '../../types/inventory';
import { emptyCostHistoryFilters } from './productFormDefaults';
import { scrollToFormSection } from '../../lib/scrollToForm';
import type { CostHistoryFilterState } from './productCostHistoryApi';
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
  costHistory: ProductCostHistoryItem[];
  standardCostHistory: ProductStandardCostHistoryItem[];
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
};

export function buildProductCostHistoryHandlers({
  selectedCostProduct,
  products,
  costHistory,
  standardCostHistory,
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
  ui
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

  const handleExportCostHistoryCsv = () => {
    exportCostHistoryCsv(selectedCostProduct, costHistory, ui);
  };

  const handleExportStandardCostHistoryCsv = () => {
    exportStandardCostHistoryCsv(selectedCostProduct, standardCostHistory, ui);
  };

  const handleExportProductsCsv = () => {
    exportProductsCsv(products, ui);
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
