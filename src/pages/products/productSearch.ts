import type { ProductItem } from '../../types/inventory';

const normalize = (value: unknown): string => String(value ?? '').trim().toLocaleLowerCase();

const wordStartsWith = (value: string, term: string): boolean =>
  value.split(/\s+/).some((word) => word.startsWith(term));

const productSearchFields = (product: ProductItem): string[] => [
  normalize(product.sku),
  normalize(product.name),
  normalize(product.category),
  normalize(product.unit),
  normalize(product.supplier_name),
  normalize(product.barcode),
  ...(product.package_barcodes ?? []).map(normalize)
].filter(Boolean);

const productSearchRank = (product: ProductItem, search: string): number => {
  const sku = normalize(product.sku);
  const name = normalize(product.name);
  const category = normalize(product.category);
  const supplier = normalize(product.supplier_name);
  const unit = normalize(product.unit);
  const barcodes = [
    normalize(product.barcode),
      ...(product.package_barcodes ?? []).map(normalize)
  ].filter(Boolean);

  if (sku === search) return 0;
  if (barcodes.some((barcode) => barcode === search)) return 1;
  if (sku.startsWith(search)) return 2;
  if (name === search) return 3;
  if (name.startsWith(search)) return 4;
  if (wordStartsWith(name, search)) return 5;
  if (name.includes(search)) return 6;
  if (category.startsWith(search) || supplier.startsWith(search)) return 7;
  if (unit.startsWith(search)) return 8;
  if (barcodes.some((barcode) => barcode.startsWith(search))) return 9;
  return 10;
};

export function filterProductsBySearch(products: ProductItem[], rawSearch: string): ProductItem[] {
  const normalizedSearch = normalize(rawSearch);

  if (!normalizedSearch) {
    return products;
  }

  const terms = normalizedSearch.split(/\s+/).filter(Boolean);

  return products
    .filter((product) => {
      const fields = productSearchFields(product);
      return terms.every((term) => fields.some((field) => field.includes(term)));
    })
    .sort((left, right) => {
      const rankDifference = productSearchRank(left, normalizedSearch) - productSearchRank(right, normalizedSearch);
      if (rankDifference !== 0) return rankDifference;
      return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
    });
}
