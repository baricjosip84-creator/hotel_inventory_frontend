import type { Dispatch, SetStateAction } from "react";
import type {
  ProductPackage,
  ProductPackageForm,
} from "./EnterpriseInventoryTypes";

type ProductPackageEditingHandlers = {
  beginEditProductPackage: (item: ProductPackage) => void;
  cancelEditProductPackage: () => void;
};

export function createEnterpriseInventoryProductPackageEditingHandlers(
  setProductPackageForm: Dispatch<SetStateAction<ProductPackageForm>>,
  setEditingProductPackageId: Dispatch<SetStateAction<string | null>>,
  emptyProductPackageForm: ProductPackageForm,
): ProductPackageEditingHandlers {
  return {
    beginEditProductPackage: (item) => {
      setProductPackageForm({
        product_id: item.product_id,
        package_name: item.package_name,
        barcode: item.barcode,
        units_per_package: String(item.units_per_package),
        is_default: Boolean(item.is_default),
        version: item.version ?? null,
      });
      setEditingProductPackageId(item.id);
    },
    cancelEditProductPackage: () => {
      setProductPackageForm((current) => ({
        ...emptyProductPackageForm,
        product_id: current.product_id,
      }));
      setEditingProductPackageId(null);
    },
  };
}
