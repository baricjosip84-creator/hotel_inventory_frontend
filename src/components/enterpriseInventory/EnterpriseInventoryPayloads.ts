import type {
  AlertForm,
  ApprovalRuleForm,
  AttachmentForm,
  AutomationScheduleForm,
  BarcodeLabelForm,
  CycleCountForm,
  NotificationDeliveryForm,
  ParLevelForm,
  ProductForm,
  ProductPackageForm,
  PurchaseOrderShipmentForm,
  RequisitionForm,
  StockAdjustmentForm,
  StockTransferForm,
  StorageLocationForm,
  SupplierCatalogForm,
  SupplierForm,
  SupplierInvoiceForm,
  ShipmentReceivingForm
} from './EnterpriseInventoryTypes';

export function buildAutomationSchedulePayload(input: AutomationScheduleForm): Record<string, unknown> {
  return {
    automation_type: input.automation_type,
    name: input.name.trim(),
    description: input.description.trim() || null,
    schedule_kind: input.schedule_kind,
    schedule_config: {
      frequency: input.schedule_kind,
      time: input.time || '09:00',
      timezone: input.timezone.trim() || 'Europe/Zagreb'
    },
    request_defaults: {
      default_status: input.default_status
    }
  };
}

export function buildParLevelPayload(input: ParLevelForm): Record<string, unknown> {
  return {
    product_id: input.product_id,
    storage_location_id: input.storage_location_id || null,
    department: input.department.trim() || null,
    min_quantity: Number(input.min_quantity),
    par_quantity: Number(input.par_quantity),
    reorder_quantity: Number(input.reorder_quantity),
    active: true
  };
}

export function buildRequisitionPayload(input: RequisitionForm): Record<string, unknown> {
  return {
    department: input.department.trim(),
    storage_location_id: input.storage_location_id || null,
    priority: input.priority,
    notes: input.notes.trim() || null,
    items: [
      {
        product_id: input.product_id,
        requested_quantity: Number(input.requested_quantity)
      }
    ]
  };
}

export function buildCycleCountPayload(input: CycleCountForm): Record<string, unknown> {
  return {
    storage_location_id: input.storage_location_id || null,
    department: input.department.trim() || null,
    notes: input.notes.trim() || null,
    items: [
      {
        product_id: input.product_id,
        storage_location_id: input.storage_location_id || null,
        expected_quantity: Number(input.expected_quantity),
        counted_quantity: input.counted_quantity === '' ? null : Number(input.counted_quantity)
      }
    ]
  };
}

export function buildStockAdjustmentPayload(input: StockAdjustmentForm): Record<string, unknown> {
  return {
    product_id: input.product_id,
    storage_location_id: input.storage_location_id,
    change: Number(input.change),
    reason: input.reason.trim() || 'manual_adjustment'
  };
}

export function buildStockTransferPayload(input: StockTransferForm): Record<string, unknown> {
  return {
    from_storage_location_id: input.from_storage_location_id,
    to_storage_location_id: input.to_storage_location_id,
    notes: input.notes.trim() || null,
    items: [
      {
        product_id: input.product_id,
        quantity: Number(input.quantity)
      }
    ]
  };
}

export function buildApprovalRulePayload(input: ApprovalRuleForm): Record<string, unknown> {
  return {
    entity_type: input.entity_type,
    department: input.department.trim() || null,
    storage_location_id: input.storage_location_id || null,
    min_amount: Number(input.min_amount || 0),
    max_amount: input.max_amount === '' ? null : Number(input.max_amount),
    required_role: input.required_role.trim(),
    active: true
  };
}


export function buildStorageLocationPayload(input: StorageLocationForm): Record<string, unknown> {
  return {
    name: input.name.trim(),
    temperature_zone: input.temperature_zone.trim() || null
  };
}

export function buildSupplierPayload(input: SupplierForm): Record<string, unknown> {
  return {
    name: input.name.trim(),
    email: input.email.trim() || null,
    contact_info: input.contact_info.trim() || null
  };
}

export function buildProductPayload(input: ProductForm): Record<string, unknown> {
  return {
    name: input.name.trim(),
    category: input.category.trim() || null,
    unit: input.unit.trim(),
    min_stock: Number(input.min_stock || 0),
    supplier_id: input.supplier_id || null,
    barcode: input.barcode.trim() || null,
    standard_unit_cost: input.standard_unit_cost === '' ? null : Number(input.standard_unit_cost),
    package_name: input.package_name.trim() || undefined,
    units_per_package: input.units_per_package === '' ? undefined : Number(input.units_per_package)
  };
}

export function buildSupplierCatalogPayload(input: SupplierCatalogForm): Record<string, unknown> {
  return {
    supplier_id: input.supplier_id,
    product_id: input.product_id,
    supplier_sku: input.supplier_sku.trim() || null,
    supplier_product_name: input.supplier_product_name.trim() || null,
    lead_time_days: Number(input.lead_time_days || 0),
    min_order_quantity: Number(input.min_order_quantity || 0),
    preferred: input.preferred,
    active: true,
    unit_cost: input.unit_cost === '' ? null : Number(input.unit_cost),
    currency: input.currency.trim() || 'EUR',
    effective_from: input.effective_from || null
  };
}

export function buildSupplierInvoicePayload(input: SupplierInvoiceForm): Record<string, unknown> {
  return {
    supplier_id: input.supplier_id,
    purchase_order_id: input.purchase_order_id || null,
    shipment_id: input.shipment_id || null,
    invoice_number: input.invoice_number.trim(),
    invoice_date: input.invoice_date,
    currency: 'EUR',
    subtotal_amount: Number(input.subtotal_amount || 0),
    tax_amount: Number(input.tax_amount || 0),
    total_amount: Number(input.total_amount || 0),
    items: [
      {
        product_id: input.product_id,
        quantity: Number(input.quantity || 0),
        unit_cost: Number(input.unit_cost || 0),
        expected_quantity: input.expected_quantity === '' ? null : Number(input.expected_quantity),
        expected_unit_cost: input.expected_unit_cost === '' ? null : Number(input.expected_unit_cost)
      }
    ]
  };
}

export function buildBarcodeLabelPayload(input: BarcodeLabelForm): Record<string, unknown> {
  return {
    product_id: input.product_id,
    barcode_value: input.barcode_value.trim() || null,
    barcode_type: input.barcode_type,
    label_template: input.label_template.trim() || 'default',
    lot_number: input.lot_number.trim() || null,
    batch_number: input.batch_number.trim() || null,
    expiry_date: input.expiry_date || null
  };
}

export function buildProductPackagePayload(input: ProductPackageForm): Record<string, unknown> {
  return {
    package_name: input.package_name.trim(),
    barcode: input.barcode.trim(),
    units_per_package: Number(input.units_per_package),
    is_default: input.is_default
  };
}

export function buildNotificationDeliveryPayload(input: NotificationDeliveryForm): Record<string, unknown> {
  return {
    notification_event_id: input.notification_event_id,
    channel: input.channel,
    recipient: input.recipient.trim() || null
  };
}

export function buildAlertPayload(input: AlertForm): Record<string, unknown> {
  return {
    type: input.type.trim(),
    message: input.message.trim(),
    product_id: input.product_id || null,
    severity: input.severity || undefined,
    escalation_level: input.escalation_level === '' ? undefined : Number(input.escalation_level)
  };
}

export function buildAttachmentPayload(input: AttachmentForm): Record<string, unknown> {
  return {
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    original_filename: input.original_filename.trim(),
    stored_filename: input.stored_filename.trim(),
    mime_type: input.mime_type.trim() || null,
    file_size_bytes: Number(input.file_size_bytes || 0),
    storage_path: input.storage_path.trim() || null
  };
}


export function buildExecutionNotePayload(note?: string): Record<string, unknown> {
  return { note: note || null };
}

export function buildExecutionReviewPayload(review_note?: string): Record<string, unknown> {
  return { review_note: review_note || null };
}

export function buildExecutionRejectPayload(rejection_reason: string): Record<string, unknown> {
  return { rejection_reason };
}

export function buildExecutionCancelPayload(cancel_reason: string): Record<string, unknown> {
  return { cancel_reason };
}

export function buildSystemContextSnapshotPayload(): Record<string, unknown> {
  return { sections: ['inventory', 'procurement', 'costing', 'alerts', 'audit', 'access'] };
}

export function buildAutomationDisablePayload(reason: string): Record<string, unknown> {
  return { disabled_reason: reason.trim() || 'Disabled from enterprise inventory UI' };
}

export function buildStockTransferCancelPayload(): Record<string, unknown> {
  return { reason: 'cancelled_from_enterprise_inventory_ui' };
}

export function buildPurchaseOrderShipmentPayload(input: PurchaseOrderShipmentForm): Record<string, unknown> {
  return { delivery_date: input.delivery_date || null };
}

export function buildPurchaseOrderLifecyclePayload(
  action: 'submit' | 'approve' | 'close' | 'reopen' | 'cancel',
  reason?: string
): Record<string, unknown> | undefined {
  if (action === 'close') {
    return { reason: reason?.trim() || 'Closed from enterprise inventory control tower.' };
  }
  if (action === 'cancel') {
    return { reason: reason?.trim() || null };
  }
  return undefined;
}

export function buildShipmentReceivingPayload(input: ShipmentReceivingForm): Record<string, unknown> {
  return {
    items: [
      {
        product_id: input.product_id,
        storage_location_id: input.storage_location_id,
        quantity_received: Number(input.quantity_received),
        discrepancy_reason: input.discrepancy_reason.trim() || null,
        receiving_note: input.receiving_note.trim() || null
      }
    ]
  };
}

export function buildApprovalExecutionPayload(input: { entity_type: string; entity_id: string; action: 'approved' | 'rejected' }): Record<string, unknown> {
  return {
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    action: input.action
  };
}

export function buildAlertResolvePayload(resolution_note: string): Record<string, unknown> {
  return { resolution_note: resolution_note.trim() || null };
}

export function buildAlertEscalationPayload(): Record<string, unknown> {
  return { severity: 'critical' };
}
