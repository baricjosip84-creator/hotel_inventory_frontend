import type { Dispatch, SetStateAction } from 'react';
import { formatNumber, toNumber } from './EnterpriseInventoryFormat';
import type {
  ShipmentBarcodeLookup,
  ShipmentBarcodeScanForm,
  ShipmentReceivingForm
} from './EnterpriseInventoryTypes';

type SetStatusMessage = (message: string | null) => void;

export function createShipmentBarcodeLookupSuccessHandler(
  shipmentBarcodeScanForm: ShipmentBarcodeScanForm,
  setLastBarcodeLookup: Dispatch<SetStateAction<ShipmentBarcodeLookup | null>>,
  setShipmentReceivingForm: Dispatch<SetStateAction<ShipmentReceivingForm>>,
  setStatusMessage: SetStatusMessage
) {
  return (result: ShipmentBarcodeLookup) => {
    const scannedPackages = Math.max(toNumber(shipmentBarcodeScanForm.package_count), 1);
    const unitsPerPackage = Math.max(toNumber(result.package?.units_per_package), 1);
    const receivedUnits = result.package ? scannedPackages * unitsPerPackage : scannedPackages;

    setLastBarcodeLookup(result);
    setShipmentReceivingForm((current) => ({
      ...current,
      product_id: result.product_id,
      storage_location_id: result.storage_location_id || current.storage_location_id,
      quantity_received: String(receivedUnits),
      discrepancy_reason: result.discrepancy_reason || current.discrepancy_reason
    }));
    setStatusMessage(`Barcode resolved to ${result.product_name || result.product?.name || result.product_id}; ${formatNumber(receivedUnits)} unit(s) staged for receipt.`);
  };
}
