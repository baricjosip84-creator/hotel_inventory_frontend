import { useMutation } from "@tanstack/react-query";
import type { createEnterpriseInventoryBoundMutationFeedback } from "./EnterpriseInventoryMutationFeedback";
import {
  buildProductPackagePayload,
  buildProductPayload,
  buildStorageLocationPayload,
  buildSupplierPayload,
} from "./EnterpriseInventoryPayloads";
import {
  deleteEnterpriseInventoryRequest,
  deleteEnterpriseInventoryVersionedRequest,
  patchEnterpriseInventoryRequest,
  postEnterpriseInventoryRequest,
} from "./EnterpriseInventoryRequests";
import {
  emptyProductForm,
  emptyProductPackageForm,
  emptyStorageLocationForm,
  emptySupplierForm,
} from "./EnterpriseInventoryForms";
import type {
  ProductForm,
  ProductOption,
  ProductPackage,
  ProductPackageForm,
  StorageLocationForm,
  StorageLocationOption,
  SupplierForm,
  SupplierOption,
} from "./EnterpriseInventoryTypes";

type EnterpriseInventoryMutationFeedback = ReturnType<
  typeof createEnterpriseInventoryBoundMutationFeedback
>;

type SetValue<TValue> = (value: TValue) => void;
type SetProductPackageForm = (
  value:
    | ProductPackageForm
    | ((current: ProductPackageForm) => ProductPackageForm),
) => void;

export function useEnterpriseInventoryMasterDataMutations(
  mutationFeedback: EnterpriseInventoryMutationFeedback,
  products: ProductOption[],
  editingStorageLocationId: string | null,
  setStorageLocationForm: SetValue<StorageLocationForm>,
  setEditingStorageLocationId: SetValue<string | null>,
  editingSupplierId: string | null,
  setSupplierForm: SetValue<SupplierForm>,
  setEditingSupplierId: SetValue<string | null>,
  editingProductId: string | null,
  setProductForm: SetValue<ProductForm>,
  setEditingProductId: SetValue<string | null>,
  setProductPackageForm: SetProductPackageForm,
  setEditingProductPackageId: SetValue<string | null>,
) {
  const saveStorageLocationMutation = useMutation({
    mutationFn: (input: StorageLocationForm) =>
      editingStorageLocationId
        ? patchEnterpriseInventoryRequest<StorageLocationOption>(
            `/storage-locations/${editingStorageLocationId}`,
            buildStorageLocationPayload(input),
          )
        : postEnterpriseInventoryRequest<StorageLocationOption>(
            "/storage-locations",
            buildStorageLocationPayload(input),
          ),
    onSuccess: mutationFeedback.resetting(
      "Storage location saved.",
      ["enterprise-storage-locations"],
      () => {
        setStorageLocationForm(emptyStorageLocationForm);
        setEditingStorageLocationId(null);
      },
    ),
    onError: mutationFeedback.error("Failed to save storage location."),
  });

  const deleteStorageLocationMutation = useMutation({
    mutationFn: (id: string) =>
      deleteEnterpriseInventoryRequest<{ message?: string }>(
        `/storage-locations/${id}`,
      ),
    onSuccess: mutationFeedback.invalidating("Storage location deleted.", [
      "enterprise-storage-locations",
    ]),
    onError: mutationFeedback.error("Failed to delete storage location."),
  });

  const saveSupplierMutation = useMutation({
    mutationFn: (input: SupplierForm) =>
      editingSupplierId
        ? patchEnterpriseInventoryRequest<SupplierOption>(
            `/suppliers/${editingSupplierId}`,
            buildSupplierPayload(input),
          )
        : postEnterpriseInventoryRequest<SupplierOption>(
            "/suppliers",
            buildSupplierPayload(input),
          ),
    onSuccess: mutationFeedback.resetting(
      "Supplier saved.",
      [
        "enterprise-suppliers",
        "enterprise-dashboard-summary",
        "enterprise-dashboard-supplier-performance",
      ],
      () => {
        setSupplierForm(emptySupplierForm);
        setEditingSupplierId(null);
      },
    ),
    onError: mutationFeedback.error("Failed to save supplier."),
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: (id: string) =>
      deleteEnterpriseInventoryRequest<{ message?: string }>(
        `/suppliers/${id}`,
      ),
    onSuccess: mutationFeedback.resetting(
      "Supplier deleted.",
      [
        "enterprise-suppliers",
        "enterprise-dashboard-summary",
        "enterprise-dashboard-supplier-performance",
      ],
      () => {
        setSupplierForm(emptySupplierForm);
        setEditingSupplierId(null);
      },
    ),
    onError: mutationFeedback.error("Failed to delete supplier."),
  });

  const saveProductMutation = useMutation({
    mutationFn: (input: ProductForm) => {
      const body = buildProductPayload(input);
      if (!editingProductId) {
        return postEnterpriseInventoryRequest<ProductOption>("/products", body);
      }

      const editingProduct = products.find(
        (item) => item.id === editingProductId,
      );
      return patchEnterpriseInventoryRequest<ProductOption>(
        `/products/${editingProductId}`,
        body,
        editingProduct?.version ?? undefined,
      );
    },
    onSuccess: mutationFeedback.resetting(
      "Product saved.",
      [
        "enterprise-products",
        "enterprise-dashboard-summary",
        "enterprise-product-cost-risk-summary",
        "enterprise-inventory-valuation-report",
      ],
      () => {
        setProductForm(emptyProductForm);
        setEditingProductId(null);
      },
    ),
    onError: mutationFeedback.error("Failed to save product."),
  });

  const deleteProductMutation = useMutation({
    mutationFn: (product: ProductOption) =>
      product.version
        ? deleteEnterpriseInventoryVersionedRequest<{ message?: string }>(
            `/products/${product.id}`,
            product.version,
          )
        : deleteEnterpriseInventoryRequest<{ message?: string }>(
            `/products/${product.id}`,
          ),
    onSuccess: mutationFeedback.resetting(
      "Product deleted.",
      [
        "enterprise-products",
        "enterprise-dashboard-summary",
        "enterprise-product-cost-risk-summary",
        "enterprise-inventory-valuation-report",
      ],
      () => {
        setProductForm(emptyProductForm);
        setEditingProductId(null);
      },
    ),
    onError: mutationFeedback.error("Failed to delete product."),
  });

  const resetProductPackageForm = () => {
    setProductPackageForm((current) => ({
      ...emptyProductPackageForm,
      product_id: current.product_id,
    }));
    setEditingProductPackageId(null);
  };

  const createProductPackageMutation = useMutation({
    mutationFn: (input: ProductPackageForm) =>
      postEnterpriseInventoryRequest<ProductPackage>(
        `/products/${input.product_id}/packages`,
        buildProductPackagePayload(input),
      ),
    onSuccess: mutationFeedback.resetting(
      "Product package barcode created.",
      ["enterprise-product-packages", "enterprise-products"],
      resetProductPackageForm,
    ),
    onError: mutationFeedback.error("Failed to create product package."),
  });

  const updateProductPackageMutation = useMutation({
    mutationFn: ({
      packageId,
      input,
    }: {
      packageId: string;
      input: ProductPackageForm;
    }) =>
      patchEnterpriseInventoryRequest<ProductPackage>(
        `/products/${input.product_id}/packages/${packageId}`,
        buildProductPackagePayload(input),
        input.version ?? undefined,
      ),
    onSuccess: mutationFeedback.resetting(
      "Product package barcode updated.",
      ["enterprise-product-packages", "enterprise-products"],
      resetProductPackageForm,
    ),
    onError: mutationFeedback.error("Failed to update product package."),
  });

  const deleteProductPackageMutation = useMutation({
    mutationFn: (item: ProductPackage) =>
      item.version !== undefined && item.version !== null
        ? deleteEnterpriseInventoryVersionedRequest<{ message: string }>(
            `/products/${item.product_id}/packages/${item.id}`,
            item.version,
          )
        : deleteEnterpriseInventoryRequest<{ message: string }>(
            `/products/${item.product_id}/packages/${item.id}`,
          ),
    onSuccess: mutationFeedback.invalidating(
      "Product package barcode deleted.",
      ["enterprise-product-packages", "enterprise-products"],
    ),
    onError: mutationFeedback.error("Failed to delete product package."),
  });

  return {
    saveStorageLocationMutation,
    deleteStorageLocationMutation,
    saveSupplierMutation,
    deleteSupplierMutation,
    saveProductMutation,
    deleteProductMutation,
    createProductPackageMutation,
    updateProductPackageMutation,
    deleteProductPackageMutation,
  };
}
