import { useState } from 'react';
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

export function useProductPageState() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [costStatusFilter, setCostStatusFilter] = useState('');
  const [costBasisFilter, setCostBasisFilter] = useState('');
  const [costVarianceStatusFilter, setCostVarianceStatusFilter] = useState('');
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
