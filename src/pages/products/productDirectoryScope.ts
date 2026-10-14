/** A product deep link takes precedence over unrelated directory filters until the user browses again. */
export type ProductDirectoryFilters = {
  category: string;
  supplierId: string;
  costStatus: string;
  costBasis: string;
  costVarianceStatus: string;
};

export function scopedProductDirectoryFilters(
  filters: ProductDirectoryFilters,
  focusedProductId: string
): ProductDirectoryFilters {
  if (!focusedProductId.trim()) return filters;
  return {
    category: '',
    supplierId: '',
    costStatus: '',
    costBasis: '',
    costVarianceStatus: ''
  };
}
