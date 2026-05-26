import { apiRequest } from '../../lib/api';
import type {
  ProductItem,
  SupplierItem
} from '../../types/inventory';

export type ProductFormState = {
  name: string;
  category: string;
  unit: string;
  min_stock: string;
  standard_unit_cost: string;
  supplier_id: string;
  barcode: string;
};

export type CostActionDetailFilterState = {
  actionType: string;
  search: string;
  sort: string;
  direction: string;
};

export async function fetchProducts(filters: {
  search: string;
  category: string;
  supplierId: string;
  costStatus: string;
  costBasis: string;
  costVarianceStatus: string;
}): Promise<ProductItem[]> {
  const params = new URLSearchParams();

  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }

  if (filters.category.trim()) {
    params.set('category', filters.category.trim());
  }

  if (filters.supplierId.trim()) {
    params.set('supplier_id', filters.supplierId.trim());
  }

  if (filters.costStatus.trim()) {
    params.set('cost_status', filters.costStatus.trim());
  }

  if (filters.costBasis.trim()) {
    params.set('cost_basis', filters.costBasis.trim());
  }

  if (filters.costVarianceStatus.trim()) {
    params.set('cost_variance_status', filters.costVarianceStatus.trim());
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<ProductItem[]>(`/products${suffix}`);
}


export async function fetchSuppliers(): Promise<SupplierItem[]> {
  return apiRequest<SupplierItem[]>('/suppliers');
}

export async function createProduct(input: ProductFormState): Promise<ProductItem> {
  return apiRequest<ProductItem>('/products', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name.trim(),
      category: input.category.trim() || null,
      unit: input.unit.trim(),
      min_stock: Number(input.min_stock),
      standard_unit_cost: input.standard_unit_cost.trim() === '' ? null : Number(input.standard_unit_cost),
      supplier_id: input.supplier_id || null,
      barcode: input.barcode.trim() || null
    })
  });
}

export async function updateProduct(input: {
  product: ProductItem;
  values: ProductFormState;
}): Promise<ProductItem> {
  return apiRequest<ProductItem>(`/products/${input.product.id}`, {
    method: 'PATCH',
    headers: {
      'If-Match-Version': String(input.product.version)
    },
    body: JSON.stringify({
      name: input.values.name.trim(),
      category: input.values.category.trim() || null,
      unit: input.values.unit.trim(),
      min_stock: Number(input.values.min_stock),
      standard_unit_cost: input.values.standard_unit_cost.trim() === '' ? null : Number(input.values.standard_unit_cost),
      supplier_id: input.values.supplier_id || null,
      barcode: input.values.barcode.trim() || null
    })
  });
}

export async function deleteProduct(product: ProductItem): Promise<void> {
  await apiRequest(`/products/${product.id}`, {
    method: 'DELETE',
    headers: {
      'If-Match-Version': String(product.version)
    }
  });
}
