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
};

const invalidateProductReadModels = async (queryClient: QueryClient) => {
  await queryClient.invalidateQueries({ queryKey: ['products'] });
  await queryClient.invalidateQueries({ queryKey: ['product-cost-risk-summary'] });
  await queryClient.invalidateQueries({ queryKey: ['product-cost-valuation-summary'] });
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
  setPackageError
}: ProductMutationParams) {
  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: async () => {
      setEditingProduct(null);
      setForm(emptyProductForm());
      setFormError(null);
      setFormMessage('Product created successfully.');
      await invalidateProductReadModels(queryClient);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError('Failed to create product.');
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
      setFormMessage('Product updated successfully.');
      await invalidateProductReadModels(queryClient);
      if (selectedPackageProduct?.id) {
        await queryClient.invalidateQueries({
          queryKey: ['product-packages', selectedPackageProduct.id]
        });
      }
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError('Failed to update product.');
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
      setFormMessage('Product deleted successfully.');
      await invalidateProductReadModels(queryClient);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError('Failed to delete product.');
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
      setPackageMessage('Package created successfully.');
      await invalidatePackages(queryClient, selectedPackageProduct);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setPackageError(error.message);
      } else {
        setPackageError('Failed to create package.');
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
      setPackageMessage('Package updated successfully.');
      await invalidatePackages(queryClient, selectedPackageProduct);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setPackageError(error.message);
      } else {
        setPackageError('Failed to update package.');
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
      setPackageMessage('Package deleted successfully.');
      await invalidatePackages(queryClient, selectedPackageProduct);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setPackageError(error.message);
      } else {
        setPackageError('Failed to delete package.');
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
