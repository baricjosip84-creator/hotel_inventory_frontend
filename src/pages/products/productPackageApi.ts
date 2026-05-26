import { apiRequest } from '../../lib/api';
import type { ProductPackageItem } from '../../types/inventory';

export type PackageFormState = {
  package_name: string;
  barcode: string;
  units_per_package: string;
  is_default: boolean;
};

export async function fetchProductPackages(productId: string): Promise<ProductPackageItem[]> {
  return apiRequest<ProductPackageItem[]>(`/products/${productId}/packages`);
}

export async function createProductPackage(input: {
  productId: string;
  values: PackageFormState;
}): Promise<ProductPackageItem> {
  return apiRequest<ProductPackageItem>(`/products/${input.productId}/packages`, {
    method: 'POST',
    body: JSON.stringify({
      package_name: input.values.package_name.trim(),
      barcode: input.values.barcode.trim(),
      units_per_package: Number(input.values.units_per_package),
      is_default: input.values.is_default
    })
  });
}

export async function updateProductPackage(input: {
  productId: string;
  packageItem: ProductPackageItem;
  values: PackageFormState;
}): Promise<ProductPackageItem> {
  return apiRequest<ProductPackageItem>(
    `/products/${input.productId}/packages/${input.packageItem.id}`,
    {
      method: 'PATCH',
      headers: {
        /*
          Safe to send. If the backend route does not require optimistic locking
          for package rows yet, this header is ignored by Express.
        */
        'If-Match-Version': String(input.packageItem.version)
      },
      body: JSON.stringify({
        package_name: input.values.package_name.trim(),
        barcode: input.values.barcode.trim(),
        units_per_package: Number(input.values.units_per_package),
        is_default: input.values.is_default
      })
    }
  );
}

export async function deleteProductPackage(input: {
  productId: string;
  packageItem: ProductPackageItem;
}): Promise<void> {
  await apiRequest(`/products/${input.productId}/packages/${input.packageItem.id}`, {
    method: 'DELETE',
    headers: {
      /*
        Safe to send. If the backend route does not require optimistic locking
        for package rows yet, this header is ignored by Express.
      */
      'If-Match-Version': String(input.packageItem.version)
    }
  });
}
