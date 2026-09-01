import { useEffect, useRef, useState } from 'react';
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
  const [searchParams, setSearchParams] = useSearchParams();
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
  const lastSyncedSearchParamsRef = useRef(searchParams.toString());
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

  useEffect(() => {
    const currentSearchParams = searchParams.toString();

    if (currentSearchParams !== lastSyncedSearchParamsRef.current) {
      const requestedView = searchParams.get('view');
      setWorkspaceView(isProductWorkspaceView(requestedView) ? requestedView : 'catalog');
      setSearch(searchParams.get('search')?.trim() || '');
      setCategoryFilter(searchParams.get('category')?.trim() || '');
      setSupplierFilter(searchParams.get('supplier_id')?.trim() || '');
      setCostStatusFilter(searchParams.get('cost_status')?.trim() || '');
      setCostBasisFilter(searchParams.get('cost_basis')?.trim() || '');
      setCostVarianceStatusFilter(searchParams.get('cost_variance_status')?.trim() || '');
      lastSyncedSearchParamsRef.current = currentSearchParams;
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    const setOrDelete = (key: string, value: string, defaultValue = '') => {
      const normalized = value.trim();
      if (!normalized || normalized === defaultValue) nextParams.delete(key);
      else nextParams.set(key, normalized);
    };

    setOrDelete('view', workspaceView, 'catalog');
    setOrDelete('search', search);
    setOrDelete('category', categoryFilter);
    setOrDelete('supplier_id', supplierFilter);
    setOrDelete('cost_status', costStatusFilter);
    setOrDelete('cost_basis', costBasisFilter);
    setOrDelete('cost_variance_status', costVarianceStatusFilter);

    if (nextParams.toString() !== currentSearchParams) {
      lastSyncedSearchParamsRef.current = nextParams.toString();
      setSearchParams(nextParams, { replace: true });
    }
  }, [
    categoryFilter,
    costBasisFilter,
    costStatusFilter,
    costVarianceStatusFilter,
    search,
    searchParams,
    setSearchParams,
    supplierFilter,
    workspaceView
  ]);

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
