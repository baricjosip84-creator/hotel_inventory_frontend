import fs from 'node:fs';
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const po = read('src/pages/PurchaseOrdersPage.tsx');
const shipments = read('src/pages/ShipmentsPage.tsx');
const catalog = read('src/i18n/tenantUiTranslations.ts');
const css = read('src/pages/PurchaseOrdersPage.css');
const uomSelect = read('src/components/inventory/ProductUomSelect.tsx');
const checks = [];
const expect = (condition, message) => { if (!condition) throw new Error(message); checks.push(message); };

expect(po.includes('/purchase-orders/create-options') && po.includes('purchaseOrderCreateOptionsQuery') && po.includes('supplierProducts'), 'Purchase Order product choices come from supplier-scoped create options');
expect(po.includes("!form.supplier_id || purchaseOrderCreateOptionsQuery.isLoading") && po.includes('Select a supplier first'), 'Purchase Order product selection is blocked until supplier is chosen and supplier options are ready');
expect(po.includes('Purchase price per unit') && po.includes('current_supplier_unit_cost') && po.includes('current price is prefilled'), 'Purchase Order supplier price is clearly labelled and auto-prefilled from current supplier pricing');
expect(po.includes('Line total') && po.includes('Number(item.quantity) * Number(item.unit_cost)'), 'Purchase Order line total is shown from entered quantity and purchase price');
expect(css.includes('grid-template-columns: minmax(260px, 1.55fr)') && css.includes('align-items: start;'), 'Purchase Order item fields remain aligned in the guided four-column layout');
expect(uomSelect.includes('factor_to_base') && uomSelect.includes('onSelectionChange') && po.includes('factorToBase'), 'Supplier price follows the selected purchase ordering unit conversion');

expect(po.includes("if (status === 'create_shipment') return 'Send to supplier';"), 'Purchase Order next action presents supplier sending instead of internal shipment creation');
expect(po.includes('selectedCanSendPurchaseOrder') && po.includes('capabilities.canSendShipments') && po.includes('capabilities.canManageShipments'), 'Purchase Order supplier-send action requires both shipment-send and shipment-management capability');
expect(po.includes("selectedOpenShipment = (selectedDetail?.linked_shipments || []).find((shipment) => shipment.status !== 'received')"), 'Purchase Order supplier-send flow reuses an existing open receiving shipment when present');
expect(po.includes('if (!shipmentId)') && po.includes('createShipmentFromPurchaseOrder(purchaseOrderId, deliveryDate, version)'), 'Purchase Order supplier-send flow automatically creates the receiving shipment only when none is open');
expect(po.includes('/shipments/${input.shipmentId}/supplier-email-preview') && po.includes('/shipments/${input.shipmentId}/send-to-supplier'), 'Purchase Order page uses the exact existing shipment supplier-email preview and send endpoints');
expect(po.includes('setSupplierEmailPreview(preview)') && po.includes('Confirm & Send Email'), 'Purchase Order page preserves the existing preview-before-send confirmation flow');
expect(po.includes('supplierEmailPreview.document.pdf_filename') && po.includes('supplierEmailPreview.document.qr_code') && po.includes('supplierEmailPreview.document.items.map'), 'Purchase Order page previews the same PDF, Receiving QR, and order-item document content');
expect(/const selectedNeedsDeliveryDate = Boolean\(\s*selectedCanSendPurchaseOrder &&\s*!selectedOpenShipment &&\s*!selectedDetail\?\.expected_delivery_date\s*\)/.test(po), 'Purchase Order delivery-date input is needed only when sending is eligible and no open shipment or saved date exists');
expect(/const selectedDeliveryDateReady = Boolean\(\s*selectedOpenShipment \|\|\s*selectedDetail\?\.expected_delivery_date \|\|\s*shipmentDeliveryDate\s*\)/.test(po), 'Purchase Order supplier-send readiness accepts existing shipment, saved date, or newly supplied date');
expect(po.includes("if (!selectedOpenShipment && !deliveryDate)") && po.includes("setSupplierPreparationError(ui('Delivery date is required before sending this purchase order.'))"), 'Purchase Order supplier-send refuses preparation without a shipment or delivery date and shows local guidance');
expect(!po.includes("navigate(`/shipments?shipmentId=${encodeURIComponent(payload.shipment.id)}&source=purchase-order`)"), 'Sending a Purchase Order no longer navigates the user to Shipments just to email the supplier');
expect(po.includes('Manual Create shipment is intentionally not exposed') && !/^              \{selectedCanCreateShipment/m.test(po), 'Manual Create shipment is not exposed in the normal Purchase Order workflow');
expect(!/^  const createInboundReservationMutation =/m.test(po) && po.includes('Inbound reservation action intentionally hidden'), 'Inbound reservation remains hidden from the normal Purchase Order workflow');

expect(shipments.includes('{!selectedShipment.purchase_order_id ? (') && shipments.includes('Preview & Send Supplier Shipment Request'), 'Shipment page keeps supplier-request email only for shipments that are not linked to a Purchase Order');
expect(!shipments.includes("selectedShipment.purchase_order_id\n                          ? ui('Preview & Send Purchase Order')"), 'Linked Purchase Orders are no longer emailed from the Shipment page');
expect(shipments.includes('Use this page when supplier goods arrive.') && shipments.includes('Purchase Order = what you ordered. Shipment = what arrived from that order.'), 'Shipments page now explains its receiving purpose in short normal language');
expect(shipments.includes('From PO {po}. Receive the goods below. The PO updates automatically as quantities are received.'), 'Linked shipment still shows short PO handoff context');
expect(shipments.includes('async function fetchShipmentById(shipmentId: string)') && shipments.includes("apiRequest<ShipmentDetailResponse>(`/shipments/${shipmentId}`)"), 'Direct shipment opening remains stable by shipment id');
expect(shipments.includes("source') === 'purchase-order'") && shipments.includes('effect is reserved for scanner/barcode navigation only'), 'Purchase Order shipment handoff remains separated from scanner navigation logic');

for (const text of [
  'Send to supplier',
  '4. Send to supplier',
  'Send the approved Purchase Order. Receiving is prepared automatically.',
  'Use this page when supplier goods arrive.',
  '1. Open the delivery',
  '2. Confirm what arrived',
  '3. Finalize',
  'Purchase Order = what you ordered. Shipment = what arrived from that order.',
  'Delivery date is required before sending this purchase order.',
  'Open a supplier email preview. Nothing is sent until you confirm in the preview.'
]) {
  expect(catalog.includes(`[${JSON.stringify(text)}`) || catalog.includes(`['${text}'`), `translation catalog includes ${text}`);
}

console.log(`Tenant procurement guided workflow v3.49.118: PASS (${checks.length}/${checks.length} checks).`);
