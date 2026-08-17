import { useState } from 'react';
import { useSearchParams } from 'react-router';
import type { ProductCostRiskItem, ProductItem, ProductPackageItem } from '../../types/inventory';
import type {
  CostActionDetailFilterState,
  ProductFormState
} from './productCoreApi';
import type { CostHistoryFilterState } from './productCostHistoryApi';
import type { PackageFormState } from './productPackageApi';
import type {
  CostRiskDetailFilterState,
  CostValuationDetailFilterState
} from './productCostAssessmentApi';
import {
  emptyCostActionDetailFilters,
  emptyCostHistoryFilters,
  emptyCostRiskDetailFilters,
  emptyCostValuationDetailFilters,
  emptyPackageForm,
  emptyProductForm
} from './productFormDefaults';

export type ProductWorkspaceView = 'catalog' | 'valuation' | 'actions' | 'governance';

const isProductWorkspaceView = (value: string | null): value is ProductWorkspaceView =>
  value === 'catalog' || value === 'valuation' || value === 'actions' || value === 'governance';

export function useProductPageState() {
  const [searchParams] = useSearchParams();
  const [workspaceView, setWorkspaceView] = useState<ProductWorkspaceView>(() => {
    const requestedView = searchParams.get('view');
    return isProductWorkspaceView(requestedView) ? requestedView : 'catalog';
  });
  const [search, setSearch] = useState(() => searchParams.get('search')?.trim() || '');
  const [categoryFilter, setCategoryFilter] = useState(() => searchParams.get('category')?.trim() || '');
  const [supplierFilter, setSupplierFilter] = useState(() => searchParams.get('supplier_id')?.trim() || '');
  const [costStatusFilter, setCostStatusFilter] = useState(() => searchParams.get('cost_status')?.trim() || '');
  const [costBasisFilter, setCostBasisFilter] = useState(() => searchParams.get('cost_basis')?.trim() || '');
  const [costVarianceStatusFilter, setCostVarianceStatusFilter] = useState(
    () => searchParams.get('cost_variance_status')?.trim() || ''
  );
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyProductForm());
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [selectedPackageProduct, setSelectedPackageProduct] = useState<ProductItem | null>(null);
  const [selectedCostProduct, setSelectedCostProduct] = useState<ProductItem | ProductCostRiskItem | null>(null);
  const [costHistoryFilters, setCostHistoryFilters] = useState<CostHistoryFilterState>(emptyCostHistoryFilters());
  const [costValuationDetailFilters, setCostValuationDetailFilters] = useState<CostValuationDetailFilterState>(emptyCostValuationDetailFilters());
  const [costRiskDetailFilters, setCostRiskDetailFilters] = useState<CostRiskDetailFilterState>(emptyCostRiskDetailFilters());
  const [costActionDetailFilters, setCostActionDetailFilters] = useState<CostActionDetailFilterState>(emptyCostActionDetailFilters());
  const [editingPackage, setEditingPackage] = useState<ProductPackageItem | null>(null);
  const [packageForm, setPackageForm] = useState<PackageFormState>(emptyPackageForm());
  const [packageMessage, setPackageMessage] = useState<string | null>(null);
  const [packageError, setPackageError] = useState<string | null>(null);

  return {
    workspaceView,
    setWorkspaceView,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    supplierFilter,
    setSupplierFilter,
    costStatusFilter,
    setCostStatusFilter,
    costBasisFilter,
    setCostBasisFilter,
    costVarianceStatusFilter,
    setCostVarianceStatusFilter,
    editingProduct,
    setEditingProduct,
    form,
    setForm,
    formMessage,
    setFormMessage,
    formError,
    setFormError,
    selectedPackageProduct,
    setSelectedPackageProduct,
    selectedCostProduct,
    setSelectedCostProduct,
    costHistoryFilters,
    setCostHistoryFilters,
    costValuationDetailFilters,
    setCostValuationDetailFilters,
    costRiskDetailFilters,
    setCostRiskDetailFilters,
    costActionDetailFilters,
    setCostActionDetailFilters,
    editingPackage,
    setEditingPackage,
    packageForm,
    setPackageForm,
    packageMessage,
    setPackageMessage,
    packageError,
    setPackageError
  };
}
