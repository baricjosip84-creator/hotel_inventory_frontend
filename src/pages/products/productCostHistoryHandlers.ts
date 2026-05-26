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
  setCostHistoryFilters
}: BuildProductCostHistoryHandlersParams) {
  const handleOpenCostHistory = (product: ProductItem | ProductCostRiskItem) => {
    setSelectedCostProduct(product);
    setCostHistoryFilters(emptyCostHistoryFilters());
  };

  const handleCloseCostHistory = () => {
    setSelectedCostProduct(null);
    setCostHistoryFilters(emptyCostHistoryFilters());
  };

  const handleClearCostHistoryFilters = () => {
    setCostHistoryFilters(emptyCostHistoryFilters());
  };

  const handleExportCostHistoryCsv = () => {
    exportCostHistoryCsv(selectedCostProduct, costHistory);
  };

  const handleExportStandardCostHistoryCsv = () => {
    exportStandardCostHistoryCsv(selectedCostProduct, standardCostHistory);
  };

  const handleExportProductsCsv = () => {
    exportProductsCsv(products);
  };

  const handleExportCostReportCsv = () => {
    exportCostReportCsv(costReportSummary);
  };

  const handlePrintCostReport = () => {
    printCostReport(costReportSummary);
  };

  const handleExportCostGovernanceAuditCsv = () => {
    exportCostGovernanceAuditCsv(costGovernanceAuditPack);
  };

  const handleExportCostGovernanceReviewPackCsv = () => {
    exportCostGovernanceReviewPackCsv(costGovernanceReviewPack);
  };

  const handleExportCostGovernanceClosureCsv = () => {
    exportCostGovernanceClosureCsv(costGovernanceClosureSummary);
  };

  const handleExportCostGovernanceHandoffCsv = () => {
    exportCostGovernanceHandoffCsv(costGovernanceHandoffSummary);
  };

  const handlePrintCostGovernanceAudit = () => {
    printCostGovernanceAudit(costGovernanceAuditPack);
  };

  const handleExportCostValuationDetailsCsv = () => {
    exportCostValuationDetailsCsv(costValuationDetails);
  };

  const handleExportCostActionDetailsCsv = () => {
    exportCostActionDetailsCsv(costActionDetails);
  };

  const handleExportCostRiskDetailsCsv = () => {
    exportCostRiskDetailsCsv(costRiskDetails);
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
