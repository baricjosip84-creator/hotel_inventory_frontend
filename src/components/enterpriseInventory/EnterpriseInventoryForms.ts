import type {
  AlertFilters,
  AlertForm,
  AttachmentForm,
  AuditFilters,
  AutomationScheduleForm,
  ApprovalRuleForm,
  BarcodeLabelForm,
  CycleCountForm,
  ExecutionFilters,
  NotificationDeliveryForm,
  ParLevelForm,
  ProductForm,
  ProductPackageForm,
  PurchaseOrderShipmentForm,
  RequisitionForm,
  ShipmentBarcodeScanForm,
  ShipmentReceivingForm,
  StockAdjustmentForm,
  StockTransferForm,
  StorageLocationForm,
  SupplierCatalogForm,
  SupplierForm,
  SupplierInvoiceForm
} from './EnterpriseInventoryTypes';

export const emptyParLevelForm: ParLevelForm = {
  product_id: '',
  storage_location_id: '',
  department: '',
  min_quantity: '',
  par_quantity: '',
  reorder_quantity: ''
};

export const emptyRequisitionForm: RequisitionForm = {
  department: '',
  storage_location_id: '',
  priority: 'normal',
  notes: '',
  product_id: '',
  requested_quantity: ''
};

export const emptyCycleCountForm: CycleCountForm = {
  storage_location_id: '',
  department: '',
  notes: '',
  product_id: '',
  expected_quantity: '',
  counted_quantity: ''
};

export const emptyStockAdjustmentForm: StockAdjustmentForm = {
  product_id: '',
  storage_location_id: '',
  change: '',
  reason: 'manual_adjustment'
};

export const emptyStockTransferForm: StockTransferForm = {
  from_storage_location_id: '',
  to_storage_location_id: '',
  product_id: '',
  quantity: '',
  notes: ''
};

export const emptyStorageLocationForm: StorageLocationForm = {
  name: '',
  temperature_zone: ''
};

export const emptySupplierForm: SupplierForm = {
  name: '',
  email: '',
  contact_info: ''
};

export const emptyProductForm: ProductForm = {
  name: '',
  category: '',
  unit: '',
  min_stock: '0',
  supplier_id: '',
  barcode: '',
  standard_unit_cost: '',
  package_name: '',
  units_per_package: '1'
};

export const emptyProductPackageForm: ProductPackageForm = {
  product_id: '',
  package_name: '',
  barcode: '',
  units_per_package: '1',
  is_default: false
};

export const emptyPurchaseOrderShipmentForm: PurchaseOrderShipmentForm = {
  purchase_order_id: '',
  delivery_date: new Date().toISOString().slice(0, 10)
};

export const emptyShipmentReceivingForm: ShipmentReceivingForm = {
  shipment_id: '',
  product_id: '',
  storage_location_id: '',
  quantity_received: '',
  discrepancy_reason: '',
  receiving_note: ''
};

export const emptyShipmentBarcodeScanForm: ShipmentBarcodeScanForm = {
  barcode: '',
  package_count: '1'
};

export const emptyAutomationScheduleForm: AutomationScheduleForm = {
  automation_type: 'cost_risk_review',
  name: '',
  description: '',
  schedule_kind: 'manual',
  time: '09:00',
  timezone: 'Europe/Zagreb',
  default_status: 'draft'
};

export const emptyApprovalRuleForm: ApprovalRuleForm = {
  entity_type: 'department_requisition',
  department: '',
  storage_location_id: '',
  min_amount: '0',
  max_amount: '',
  required_role: 'manager'
};

export const emptyBarcodeLabelForm: BarcodeLabelForm = {
  product_id: '',
  barcode_value: '',
  barcode_type: 'CODE128',
  label_template: 'default',
  lot_number: '',
  batch_number: '',
  expiry_date: ''
};

export const emptySupplierCatalogForm: SupplierCatalogForm = {
  supplier_id: '',
  product_id: '',
  supplier_sku: '',
  supplier_product_name: '',
  lead_time_days: '0',
  min_order_quantity: '0',
  preferred: false,
  unit_cost: '',
  currency: 'EUR',
  effective_from: new Date().toISOString().slice(0, 10)
};

export const emptySupplierInvoiceForm: SupplierInvoiceForm = {
  supplier_id: '',
  purchase_order_id: '',
  shipment_id: '',
  invoice_number: '',
  invoice_date: new Date().toISOString().slice(0, 10),
  subtotal_amount: '',
  tax_amount: '0',
  total_amount: '',
  product_id: '',
  quantity: '',
  unit_cost: '',
  expected_quantity: '',
  expected_unit_cost: ''
};

export const emptyNotificationDeliveryForm: NotificationDeliveryForm = {
  notification_event_id: '',
  channel: 'in_app',
  recipient: ''
};

export const emptyAlertForm: AlertForm = {
  type: 'manual',
  message: '',
  product_id: '',
  severity: 'warning',
  escalation_level: '0'
};

export const emptyAlertFilters: AlertFilters = {
  resolved: 'false',
  acknowledged: '',
  severity: '',
  search: ''
};

export const emptyAuditFilters: AuditFilters = {
  action: '',
  entity_type: '',
  entity_id: '',
  user_id: '',
  support_only: false
};

export const emptyExecutionFilters: ExecutionFilters = {
  status: '',
  request_type: '',
  search: ''
};

export const emptyAttachmentForm: AttachmentForm = {
  entity_type: 'supplier_invoice',
  entity_id: '',
  original_filename: '',
  stored_filename: '',
  mime_type: '',
  file_size_bytes: '0',
  storage_path: ''
};

