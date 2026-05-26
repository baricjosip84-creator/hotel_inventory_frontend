import { ProductPageContent } from './products/ProductPageContent';
import { useProductPageViewModel } from './products/useProductPageViewModel';

export default function ProductsPage() {
  const productPageViewModel = useProductPageViewModel();

  return <ProductPageContent {...productPageViewModel} />;
}
