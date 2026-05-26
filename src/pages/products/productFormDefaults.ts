import type {
  ProductFormState,
  CostActionDetailFilterState
} from './productCoreApi';
import type { CostHistoryFilterState } from './productCostHistoryApi';
import type { PackageFormState } from './productPackageApi';
import type {
  CostValuationDetailFilterState,
  CostRiskDetailFilterState
} from './productCostAssessmentApi';

export function emptyProductForm(): ProductFormState {
  return {
    name: '',
    category: '',
    unit: '',
    min_stock: '0',
    standard_unit_cost: '',
    supplier_id: '',
    barcode: ''
  };
}

export function emptyPackageForm(): PackageFormState {
  return {
    package_name: '',
    barcode: '',
    units_per_package: '1',
    is_default: false
  };
}

export function emptyCostHistoryFilters(): CostHistoryFilterState {
  return {
    costSource: '',
    costFrom: '',
    costTo: ''
  };
}

export function emptyCostValuationDetailFilters(): CostValuationDetailFilterState {
  return {
    valuationBasis: '',
    search: '',
    sort: 'estimated_value',
    direction: 'desc'
  };
}

export function emptyCostRiskDetailFilters(): CostRiskDetailFilterState {
  return {
    riskType: '',
    search: '',
    sort: 'risk_priority',
    direction: 'desc'
  };
}

export function emptyCostActionDetailFilters(): CostActionDetailFilterState {
  return {
    actionType: '',
    search: '',
    sort: 'action_priority',
    direction: 'desc'
  };
}
