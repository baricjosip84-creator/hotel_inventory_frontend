import type { Dispatch, SetStateAction } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../../lib/api';
import type { ProductCostRiskItem, ProductItem, ProductPackageItem } from '../../types/inventory';
import {
  createProduct,
  updateProduct,
  deleteProduct
} from './productCoreApi';
import {
  createProductPackage,
  updateProductPackage,
  deleteProductPackage
} from './productPackageApi';
import { emptyPackageForm, emptyProductForm } from './productFormDefaults';
import type { ProductFormState } from './productCoreApi';
import type { PackageFormState } from './productPackageApi';

type ProductMutationParams = {
  queryClient: QueryClient;
  selectedPackageProduct: ProductItem | null;
  setEditingProduct: Dispatch<SetStateAction<ProductItem | null>>;
  setSelectedPackageProduct: Dispatch<SetStateAction<ProductItem | null>>;
  setSelectedCostProduct: Dispatch<SetStateAction<ProductItem | ProductCostRiskItem | null>>;
  setEditingPackage: Dispatch<SetStateAction<ProductPackageItem | null>>;
  setForm: Dispatch<SetStateAction<ProductFormState>>;
  setPackageForm: Dispatch<SetStateAction<PackageFormState>>;
  setFormMessage: Dispatch<SetStateAction<string | null>>;
  setFormError: Dispatch<SetStateAction<string | null>>;
  setPackageMessage: Dispatch<SetStateAction<string | null>>;
  setPackageError: Dispatch<SetStateAction<string | null>>;
  ui: (englishText: string) => string;
};

const invalidateProductReadModels = async (queryClient: QueryClient) => {
  await queryClient.invalidateQueries({ queryKey: ['products'] });
  await queryClient.invalidateQueries({
    predicate: (query) => {
      const rootKey = query.queryKey[0];
      return typeof rootKey === 'string' && rootKey.startsWith('product-cost-');
    }
  });
  await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
};

const invalidatePackages = async (queryClient: QueryClient, selectedPackageProduct: ProductItem | null) => {
  await queryClient.invalidateQueries({ queryKey: ['products'] });
  if (selectedPackageProduct?.id) {
    await queryClient.invalidateQueries({
      queryKey: ['product-packages', selectedPackageProduct.id]
    });
  }
};

const productBarcodeErrorMessage = (error: ApiError, ui: (englishText: string) => string): string => {
  if (error.code === 'PRODUCT_BARCODE_ALREADY_EXISTS') {
    return ui('This barcode value is already used by another active product.');
  }
  if (error.code === 'PRODUCT_PACKAGE_BARCODE_ALREADY_EXISTS') {
    return ui('A product package with this barcode already exists.');
  }
  if (error.code === 'PRODUCT_PACKAGE_BARCODE_CONFLICTS_PRODUCT') {
    return ui('Only the default package may share the Product barcode.');
  }
  if (error.code === 'BARCODE_VALUE_EXISTS') {
    return ui('This barcode value is already used by an active inventory label.');
  }
  return error.message;
};

const productArchiveErrorMessage = (error: ApiError, ui: (englishText: string) => string): string => {
  if (error.code === 'PRODUCT_ARCHIVE_DEPENDENCY_HIDDEN') {
    return ui('This product cannot be archived because it is still referenced by active work that is not visible to this role.');
  }
  if (error.code === 'PRODUCT_HAS_DRAFT_CUSTOMER_RETURN') {
    return ui('This product has a customer return waiting to be received. Receive or cancel that return before archiving the product.');
  }
  return error.message;
};

export function useProductMutations({
  queryClient,
  selectedPackageProduct,
  setEditingProduct,
  setSelectedPackageProduct,
  setSelectedCostProduct,
  setEditingPackage,
  setForm,
  setPackageForm,
  setFormMessage,
  setFormError,
  setPackageMessage,
  setPackageError,
  ui
}: ProductMutationParams) {
  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: async () => {
      setEditingProduct(null);
      setForm(emptyProductForm());
      setFormError(null);
      setFormMessage(ui('Product created successfully.'));
      await invalidateProductReadModels(queryClient);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFormError(productBarcodeErrorMessage(error, ui));
      } else {
        setFormError(ui('Failed to create product.'));
      }
      setFormMessage(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateProduct,
    onSuccess: async () => {
      setEditingProduct(null);
      setForm(emptyProductForm());
      setFormError(null);
      setFormMessage(ui('Product updated successfully.'));
      await invalidateProductReadModels(queryClient);
      if (selectedPackageProduct?.id) {
        await queryClient.invalidateQueries({
          queryKey: ['product-packages', selectedPackageProduct.id]
        });
      }
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFormError(productBarcodeErrorMessage(error, ui));
      } else {
        setFormError(ui('Failed to update product.'));
      }
      setFormMessage(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: async () => {
      setEditingProduct(null);
      setSelectedPackageProduct(null);
      setSelectedCostProduct(null);
      setEditingPackage(null);
      setForm(emptyProductForm());
      setPackageForm(emptyPackageForm());
      setFormError(null);
      setPackageError(null);
      setFormMessage(ui('Product archived successfully.'));
      await invalidateProductReadModels(queryClient);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFormError(productArchiveErrorMessage(error, ui));
      } else {
        setFormError(ui('Failed to archive product.'));
      }
      setFormMessage(null);
    }
  });

  const createPackageMutation = useMutation({
    mutationFn: createProductPackage,
    onSuccess: async () => {
      setEditingPackage(null);
      setPackageForm(emptyPackageForm());
      setPackageError(null);
      setPackageMessage(ui('Package created successfully.'));
      await invalidatePackages(queryClient, selectedPackageProduct);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setPackageError(productBarcodeErrorMessage(error, ui));
      } else {
        setPackageError(ui('Failed to create package.'));
      }
      setPackageMessage(null);
    }
  });

  const updatePackageMutation = useMutation({
    mutationFn: updateProductPackage,
    onSuccess: async () => {
      setEditingPackage(null);
      setPackageForm(emptyPackageForm());
      setPackageError(null);
      setPackageMessage(ui('Package updated successfully.'));
      await invalidatePackages(queryClient, selectedPackageProduct);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setPackageError(productBarcodeErrorMessage(error, ui));
      } else {
        setPackageError(ui('Failed to update package.'));
      }
      setPackageMessage(null);
    }
  });

  const deletePackageMutation = useMutation({
    mutationFn: deleteProductPackage,
    onSuccess: async () => {
      setEditingPackage(null);
      setPackageForm(emptyPackageForm());
      setPackageError(null);
      setPackageMessage(ui('Package archived successfully.'));
      await invalidatePackages(queryClient, selectedPackageProduct);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setPackageError(error.message);
      } else {
        setPackageError(ui('Failed to archive package.'));
      }
      setPackageMessage(null);
    }
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    createPackageMutation,
    updatePackageMutation,
    deletePackageMutation
  };
}
