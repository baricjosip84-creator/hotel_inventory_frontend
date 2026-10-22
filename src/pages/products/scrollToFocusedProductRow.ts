/** Locate and reveal the product selected by an Insights exact-product link.
 * The list is loaded asynchronously, so callers should retry after the
 * product query finishes instead of scrolling to the top of Products.
 */
export function productRowAnchorId(productId: string): string {
  return `product-row-${encodeURIComponent(productId)}`;
}

type ProductRowTarget = Pick<HTMLElement, 'scrollIntoView'>;

export function scrollToFocusedProductRow(
  productId: string,
  findTarget: (id: string) => ProductRowTarget | null = (id) => document.getElementById(id)
): boolean {
  if (!productId.trim()) return false;
  const target = findTarget(productRowAnchorId(productId));
  if (!target) return false;
  target.scrollIntoView({ block: 'center', behavior: 'auto' });
  return true;
}
