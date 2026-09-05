import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../lib/api';
import { TENANT_PERMISSIONS, hasPermission } from '../../../lib/permissions';
import { getActiveTenantCurrency } from '../../../lib/tenantCurrency';
import { useAppTranslation } from '../../../i18n/I18nContext';
import { SidebarAttentionMarker } from '../../ui/SidebarAttentionMarker';
import { sidebarAttentionItemStyle } from '../../ui/SidebarAttentionStyles';
import { useOperationalAttentionItems } from '../../../lib/sidebarAttentionItems';
import { formatLocalizedCurrency, formatLocalizedDate, formatLocalizedDateTime, formatLocalizedNumber } from '../../../i18n/formatters';
import { normalizeError } from '../EnterpriseInventoryFormat';
import { InputField, SelectField, TextareaField } from '../EnterpriseInventoryShared';
import { patchEnterpriseInventoryRequest, postEnterpriseInventoryRequest, postEnterpriseInventoryVersionedRequest } from '../EnterpriseInventoryRequests';
import { styles } from '../EnterpriseInventoryStyles';
import type { SupplierInvoice, SupplierInvoiceItem } from '../EnterpriseInventoryTypes';

type EligibleReturnLot = {
  inventory_lot_id: string;
  product_id: string;
  product_name: string;
  storage_location_id: string;
  storage_location_name: string;
  shipment_id: string;
  shipment_item_id: string;
  purchase_order_id?: string | null;
  po_number?: string | null;
  supplier_id: string;
  supplier_name: string;
  lot_number?: string | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  condition: 'available' | 'hold' | 'quarantine' | 'damaged' | 'rejected';
  physical_quantity: number | string;
  reserved_return_quantity: number | string;
  reserved_inventory_quantity?: number | string;
  returnable_quantity: number | string;
  unit_cost?: number | string | null;
  unit_cost_currency?: string | null;
  received_at?: string | null;
};

type SupplierReturnItem = {
  id: string;
  inventory_lot_id: string;
  shipment_id?: string | null;
  shipment_item_id?: string | null;
  purchase_order_id?: string | null;
  product_id: string;
  product_name?: string | null;
  storage_location_name?: string | null;
  source_condition: string;
  quantity: number | string;
  unit_cost?: number | string | null;
  unit_cost_currency?: string | null;
  line_amount: number | string;
  lot_number?: string | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  reason?: string | null;
};

type SupplierReturnCreditItem = {
  id: string;
  supplier_return_item_id: string;
  supplier_invoice_item_id: string;
  product_id: string;
  product_name?: string | null;
  returned_quantity: number | string;
  invoice_unit_cost: number | string;
  expected_line_subtotal: number | string;
};

type SupplierReturnCredit = {
  id: string;
  supplier_return_id: string;
  supplier_invoice_id: string;
  invoice_number?: string | null;
  supplier_invoice_status?: string | null;
  status: 'expected' | 'credit_note_received' | 'settled' | 'waived' | string;
  currency: string;
  expected_subtotal_amount: number | string;
  expected_tax_amount: number | string;
  expected_total_amount: number | string;
  actual_subtotal_amount?: number | string | null;
  actual_tax_amount?: number | string | null;
  actual_total_amount?: number | string | null;
  credit_note_number?: string | null;
  credit_note_date?: string | null;
  settlement_method?: string | null;
  settlement_reference?: string | null;
  settlement_notes?: string | null;
  notes?: string | null;
  waiver_reason?: string | null;
  created_at: string;
  updated_at?: string | null;
  version: number | string;
  items: SupplierReturnCreditItem[];
};

type SupplierReturn = {
  id: string;
  return_number: string;
  supplier_id: string;
  supplier_name: string;
  status: string;
  reason: string;
  notes?: string | null;
  currency: string;
  total_amount: number | string;
  valuation_status?: 'known' | 'unavailable';
  submitted_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  dispatched_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  version: number;
  items: SupplierReturnItem[];
  credit_reconciliations?: SupplierReturnCredit[];
};

type DraftReturnItem = {
  inventory_lot_id: string;
  quantity: number;
  reason: string;
  lot: EligibleReturnLot;
};

type ReturnLifecycleAction = 'submit' | 'approve' | 'reject' | 'dispatch' | 'complete' | 'cancel';

type ReturnLifecycleInput = {
  item: SupplierReturn;
  action: ReturnLifecycleAction;
  reason?: string;
};

export function SupplierReturnsTab() {
  const { locale, ui } = useAppTranslation();
  const queryClient = useQueryClient();
  const canRead = hasPermission(TENANT_PERMISSIONS.SUPPLIER_RETURNS_READ);
  const canWrite = hasPermission(TENANT_PERMISSIONS.SUPPLIER_RETURNS_WRITE);
  const canDispatch = hasPermission(TENANT_PERMISSIONS.SUPPLIER_RETURNS_DISPATCH);
  const canApprove = hasPermission(TENANT_PERMISSIONS.APPROVALS_EXECUTE);
  const canReadInvoices = hasPermission(TENANT_PERMISSIONS.INVOICES_READ);
  const canWriteInvoices = hasPermission(TENANT_PERMISSIONS.INVOICES_WRITE);
  const canManageCredits = canWrite && canWriteInvoices;
  const inventoryControlAttentionItemsQuery = useOperationalAttentionItems('inventory_controls', canApprove || canDispatch);
  const approvalAttentionKeys = new Set(inventoryControlAttentionItemsQuery.data?.approval_item_keys || []);
  const directApprovalAttentionIds = new Set(inventoryControlAttentionItemsQuery.data?.supplier_return_approval_ids || []);
  const dispatchAttentionIds = new Set(inventoryControlAttentionItemsQuery.data?.supplier_return_dispatch_ids || []);

  const [selectedLotId, setSelectedLotId] = useState('');
  const [lineQuantity, setLineQuantity] = useState('');
  const [lineReason, setLineReason] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [notes, setNotes] = useState('');
  const [draftItems, setDraftItems] = useState<DraftReturnItem[]>([]);
  const [creditReturnId, setCreditReturnId] = useState('');
  const [creditInvoiceId, setCreditInvoiceId] = useState('');
  const [creditReturnItemIds, setCreditReturnItemIds] = useState<string[]>([]);
  const [expectedCreditTax, setExpectedCreditTax] = useState('0');
  const [creditNotes, setCreditNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatQuantity = (value: number | string | null | undefined) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? formatLocalizedNumber(parsed, locale, { maximumFractionDigits: 4 }) : '—';
  };
  const formatMoney = (value: number | string | null | undefined, currency?: string | null) => {
    const parsed = Number(value);
    return Number.isFinite(parsed)
      ? formatLocalizedCurrency(parsed, currency || getActiveTenantCurrency(), locale, { maximumFractionDigits: 4 })
      : '—';
  };
  const conditionLabel = (value: string | null | undefined) => {
    const labels: Record<string, string> = {
      available: 'Available', hold: 'Hold', quarantine: 'Quarantine', damaged: 'Damaged', rejected: 'Rejected',
    };
    return value && labels[value] ? ui(labels[value]) : String(value || '—');
  };
  const statusLabel = (value: string | null | undefined) => {
    const labels: Record<string, string> = {
      draft: 'Draft', submitted: 'Submitted', pending_approval: 'Pending approval', approved: 'Approved',
      rejected: 'Rejected', dispatched: 'Dispatched', completed: 'Completed', cancelled: 'Cancelled',
      expected: 'Expected', credit_note_received: 'Credit note received', settled: 'Settled', waived: 'Waived',
    };
    return value && labels[value] ? ui(labels[value]) : String(value || '—');
  };
  const lotIdentity = (lot: Pick<EligibleReturnLot, 'lot_number' | 'batch_number'>) =>
    lot.lot_number || lot.batch_number || ui('Unnumbered lot');

  const returnsQuery = useQuery({
    queryKey: ['enterprise-supplier-returns'],
    queryFn: () => apiRequest<SupplierReturn[]>('/enterprise-inventory/supplier-returns'),
    enabled: canRead,
  });

  const invoicesQuery = useQuery({
    queryKey: ['enterprise-supplier-invoices'],
    queryFn: () => apiRequest<SupplierInvoice[]>('/enterprise-inventory/supplier-invoices'),
    enabled: canReadInvoices,
  });

  const eligibleLotsQuery = useQuery({
    queryKey: ['enterprise-supplier-return-eligible-lots'],
    queryFn: () => apiRequest<EligibleReturnLot[]>('/enterprise-inventory/supplier-returns/eligible-lots'),
    enabled: canWrite,
  });

  const selectedSupplierId = draftItems[0]?.lot.supplier_id ?? null;
  const draftValuationCurrencies = useMemo(
    () => [...new Set(draftItems
      .filter((item) => item.lot.unit_cost !== null && item.lot.unit_cost !== undefined && item.lot.unit_cost_currency)
      .map((item) => String(item.lot.unit_cost_currency)))],
    [draftItems],
  );
  const selectedDraftCurrency = draftValuationCurrencies.length === 1 ? draftValuationCurrencies[0] : null;
  const draftCurrencyConflict = draftValuationCurrencies.length > 1;
  const draftValuationKnown = draftItems.length > 0
    && !draftCurrencyConflict
    && draftItems.every((item) => item.lot.unit_cost !== null && item.lot.unit_cost !== undefined && Boolean(item.lot.unit_cost_currency));
  const eligibleLots = useMemo(() => eligibleLotsQuery.data ?? [], [eligibleLotsQuery.data]);
  const availableLotOptions = useMemo(
    () => eligibleLots.filter((lot) => {
      if (draftItems.some((item) => item.inventory_lot_id === lot.inventory_lot_id)) return false;
      if (selectedSupplierId && lot.supplier_id !== selectedSupplierId) return false;
      if (selectedDraftCurrency && lot.unit_cost !== null && lot.unit_cost !== undefined && lot.unit_cost_currency && lot.unit_cost_currency !== selectedDraftCurrency) return false;
      return true;
    }),
    [draftItems, eligibleLots, selectedDraftCurrency, selectedSupplierId],
  );

  const selectedLot = eligibleLots.find((lot) => lot.inventory_lot_id === selectedLotId) ?? null;
  const draftTotal = draftItems.reduce((total, item) => {
    const unitCost = Number(item.lot.unit_cost ?? 0);
    return total + (Number.isFinite(unitCost) ? unitCost * item.quantity : 0);
  }, 0);


  const findCreditInvoiceLine = (returnItem: SupplierReturnItem, invoice: SupplierInvoice | null): SupplierInvoiceItem | null => {
    if (!invoice) return null;
    const productLines = invoice.items.filter((line) => line.product_id === returnItem.product_id);
    const direct = productLines.filter((line) => Boolean(line.shipment_item_id && returnItem.shipment_item_id && line.shipment_item_id === returnItem.shipment_item_id));
    if (direct.length === 1) return direct[0];
    const hasHeaderLineage = Boolean(
      (invoice.shipment_id && returnItem.shipment_id && invoice.shipment_id === returnItem.shipment_id)
      || (invoice.purchase_order_id && returnItem.purchase_order_id && invoice.purchase_order_id === returnItem.purchase_order_id)
    );
    return hasHeaderLineage && productLines.length === 1 ? productLines[0] : null;
  };

  const completedReturns = (returnsQuery.data ?? []).filter((item) => item.status === 'completed');
  const selectedCreditReturn = completedReturns.find((item) => item.id === creditReturnId) ?? null;
  const activeCreditReturnItemIds = new Set(
    (selectedCreditReturn?.credit_reconciliations ?? [])
      .filter((credit) => credit.status !== 'waived')
      .flatMap((credit) => credit.items.map((item) => item.supplier_return_item_id)),
  );
  const candidateInvoices = (invoicesQuery.data ?? []).filter((invoice) => (
    selectedCreditReturn
    && invoice.supplier_id === selectedCreditReturn.supplier_id
    && ['matched', 'paid'].includes(invoice.status)
  ));
  const selectedCreditInvoice = candidateInvoices.find((invoice) => invoice.id === creditInvoiceId) ?? null;
  const creditEligibleItems = (selectedCreditReturn?.items ?? []).filter((item) => (
    !activeCreditReturnItemIds.has(item.id) && Boolean(findCreditInvoiceLine(item, selectedCreditInvoice))
  ));
  const expectedCreditSubtotal = creditEligibleItems
    .filter((item) => creditReturnItemIds.includes(item.id))
    .reduce((sum, item) => {
      const invoiceLine = findCreditInvoiceLine(item, selectedCreditInvoice);
      return sum + Number(item.quantity || 0) * Number(invoiceLine?.unit_cost || 0);
    }, 0);
  const expectedCreditTaxNumber = Number(expectedCreditTax);
  const creditDraftValid = Boolean(
    canManageCredits
    && selectedCreditReturn
    && selectedCreditInvoice
    && creditReturnItemIds.length
    && Number.isFinite(expectedCreditTaxNumber)
    && expectedCreditTaxNumber >= 0
  );

  const refreshReturnData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['enterprise-supplier-returns'] }),
      queryClient.invalidateQueries({ queryKey: ['enterprise-supplier-invoices'] }),
      queryClient.invalidateQueries({ queryKey: ['enterprise-supplier-return-eligible-lots'] }),
      queryClient.invalidateQueries({ queryKey: ['enterprise-stock-overview'] }),
      queryClient.invalidateQueries({ queryKey: ['enterprise-stock-movements'] }),
      queryClient.invalidateQueries({ queryKey: ['enterprise-notifications'] }),
      queryClient.invalidateQueries({ queryKey: ['enterprise-audit'] }),
    ]);
  };

  const createReturnMutation = useMutation({
    mutationFn: () => postEnterpriseInventoryRequest<SupplierReturn>('/enterprise-inventory/supplier-returns', {
      reason: returnReason.trim(),
      notes: notes.trim() || null,
      items: draftItems.map((item) => ({
        inventory_lot_id: item.inventory_lot_id,
        quantity: item.quantity,
        reason: item.reason.trim() || null,
      })),
    }),
    onSuccess: async (created) => {
      setDraftItems([]);
      setSelectedLotId('');
      setLineQuantity('');
      setLineReason('');
      setReturnReason('');
      setNotes('');
      setError(null);
      setMessage(ui('Supplier return {returnNumber} created as a draft.').replace('{returnNumber}', created.return_number || ''));
      await refreshReturnData();
    },
    onError: (mutationError) => {
      setMessage(null);
      setError(normalizeError(mutationError, ui('Failed to create supplier return.')));
    },
  });

  const lifecycleMutation = useMutation({
    mutationFn: async ({ item, action, reason }: ReturnLifecycleInput) => {
      if (action === 'approve' || action === 'reject') {
        return postEnterpriseInventoryRequest<{ message: string; version: number }>(
          '/enterprise-inventory/approvals/execute',
          {
            entity_type: 'supplier_return',
            entity_id: item.id,
            action: action === 'approve' ? 'approved' : 'rejected',
            comment: reason || null,
          },
        );
      }
      if (action === 'cancel') {
        return postEnterpriseInventoryVersionedRequest<SupplierReturn>(
          `/enterprise-inventory/supplier-returns/${item.id}/cancel`,
          item.version,
          { reason: reason || null },
        );
      }
      return postEnterpriseInventoryVersionedRequest<SupplierReturn>(
        `/enterprise-inventory/supplier-returns/${item.id}/${action}`,
        item.version,
      );
    },
    onSuccess: async (_result, input) => {
      const messages: Record<ReturnLifecycleAction, string> = {
        submit: 'Supplier return {returnNumber} submitted successfully.',
        approve: 'Supplier return {returnNumber} approved successfully.',
        reject: 'Supplier return {returnNumber} rejected successfully.',
        dispatch: 'Supplier return {returnNumber} dispatched successfully.',
        complete: 'Supplier return {returnNumber} completed successfully.',
        cancel: 'Supplier return {returnNumber} cancelled successfully.',
      };
      setError(null);
      setMessage(ui(messages[input.action]).replace('{returnNumber}', input.item.return_number));
      await refreshReturnData();
    },
    onError: (mutationError) => {
      setMessage(null);
      setError(normalizeError(mutationError, ui('Failed to update supplier return.')));
    },
  });

  const createCreditMutation = useMutation({
    mutationFn: () => postEnterpriseInventoryRequest<SupplierReturnCredit>(
      `/enterprise-inventory/supplier-returns/${selectedCreditReturn?.id}/credit-reconciliations`,
      {
        supplier_invoice_id: selectedCreditInvoice?.id,
        supplier_return_item_ids: creditReturnItemIds,
        expected_tax_amount: expectedCreditTaxNumber,
        notes: creditNotes.trim() || null,
      },
    ),
    onSuccess: async () => {
      setCreditReturnId('');
      setCreditInvoiceId('');
      setCreditReturnItemIds([]);
      setExpectedCreditTax('0');
      setCreditNotes('');
      setError(null);
      setMessage(ui('Supplier return credit expectation created successfully.'));
      await refreshReturnData();
    },
    onError: (mutationError) => {
      setMessage(null);
      setError(normalizeError(mutationError, ui('Failed to create supplier return credit expectation.')));
    },
  });

  const creditLifecycleMutation = useMutation({
    mutationFn: async ({ credit, action, payload }: { credit: SupplierReturnCredit; action: 'expected' | 'credit_note' | 'settle' | 'waive'; payload: Record<string, unknown> }) => {
      const base = `/enterprise-inventory/supplier-return-credit-reconciliations/${credit.id}`;
      if (action === 'expected') return patchEnterpriseInventoryRequest<SupplierReturnCredit>(`${base}/expected`, payload, credit.version);
      return postEnterpriseInventoryVersionedRequest<SupplierReturnCredit>(`${base}/${action === 'credit_note' ? 'credit-note' : action}`, credit.version, payload);
    },
    onSuccess: async (_result, input) => {
      const labels = {
        expected: 'Supplier return credit expectation updated.',
        credit_note: 'Supplier credit note recorded.',
        settle: 'Supplier return credit settled.',
        waive: 'Supplier return credit expectation waived.',
      } as const;
      setError(null);
      setMessage(ui(labels[input.action]));
      await refreshReturnData();
    },
    onError: (mutationError) => {
      setMessage(null);
      setError(normalizeError(mutationError, ui('Failed to update supplier return credit reconciliation.')));
    },
  });

  const handleCreditReturnChange = (returnId: string) => {
    setCreditReturnId(returnId);
    setCreditInvoiceId('');
    setCreditReturnItemIds([]);
    setExpectedCreditTax('0');
    setCreditNotes('');
  };

  const handleCreditInvoiceChange = (invoiceId: string) => {
    setCreditInvoiceId(invoiceId);
    const invoice = candidateInvoices.find((item) => item.id === invoiceId) ?? null;
    const compatibleIds = (selectedCreditReturn?.items ?? [])
      .filter((item) => !activeCreditReturnItemIds.has(item.id) && Boolean(findCreditInvoiceLine(item, invoice)))
      .map((item) => item.id);
    setCreditReturnItemIds(compatibleIds);
  };

  const toggleCreditReturnItem = (itemId: string) => {
    setCreditReturnItemIds((current) => current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]);
  };

  const adjustExpectedCredit = (credit: SupplierReturnCredit) => {
    if (creditLifecycleMutation.isPending) return;
    const taxInput = window.prompt(ui('Expected supplier credit tax:'), String(credit.expected_tax_amount ?? 0));
    if (taxInput === null) return;
    const tax = Number(taxInput);
    if (!Number.isFinite(tax) || tax < 0) {
      setError(ui('Expected supplier credit tax must be zero or greater.'));
      return;
    }
    const notesInput = window.prompt(ui('Supplier credit notes (optional):'), credit.notes || '');
    if (notesInput === null) return;
    creditLifecycleMutation.mutate({ credit, action: 'expected', payload: { expected_tax_amount: tax, notes: notesInput.trim() || null } });
  };

  const recordCreditNote = (credit: SupplierReturnCredit) => {
    if (creditLifecycleMutation.isPending) return;
    const number = window.prompt(ui('Supplier credit-note number:'));
    if (!number?.trim()) return;
    const date = window.prompt(ui('Supplier credit-note date (YYYY-MM-DD):'), new Date().toISOString().slice(0, 10));
    if (!date?.trim()) return;
    const subtotalInput = window.prompt(ui('Actual supplier credit subtotal:'), String(credit.expected_subtotal_amount ?? 0));
    if (subtotalInput === null) return;
    const taxInput = window.prompt(ui('Actual supplier credit tax:'), String(credit.expected_tax_amount ?? 0));
    if (taxInput === null) return;
    const subtotal = Number(subtotalInput);
    const tax = Number(taxInput);
    if (!Number.isFinite(subtotal) || subtotal < 0 || !Number.isFinite(tax) || tax < 0) {
      setError(ui('Actual supplier credit subtotal and tax must be zero or greater.'));
      return;
    }
    creditLifecycleMutation.mutate({ credit, action: 'credit_note', payload: { credit_note_number: number.trim(), credit_note_date: date.trim(), actual_subtotal_amount: subtotal, actual_tax_amount: tax } });
  };

  const settleCredit = (credit: SupplierReturnCredit) => {
    if (creditLifecycleMutation.isPending) return;
    const suggestedMethod = credit.supplier_invoice_status === 'paid' ? 'refund' : 'invoice_offset';
    const method = window.prompt(ui('Settlement method (refund, invoice_offset, other):'), suggestedMethod);
    if (method === null) return;
    if (!['refund', 'invoice_offset', 'other'].includes(method.trim())) {
      setError(ui('Settlement method must be refund, invoice_offset, or other.'));
      return;
    }
    const reference = window.prompt(ui('Settlement reference:'));
    if (!reference?.trim()) return;
    const settlementNotes = window.prompt(ui('Settlement notes (optional):'), '');
    if (settlementNotes === null) return;
    creditLifecycleMutation.mutate({ credit, action: 'settle', payload: { settlement_method: method.trim(), settlement_reference: reference.trim(), settlement_notes: settlementNotes.trim() || null } });
  };

  const waiveCredit = (credit: SupplierReturnCredit) => {
    if (creditLifecycleMutation.isPending) return;
    const reason = window.prompt(ui('Reason for waiving this expected supplier credit:'));
    if (!reason?.trim()) return;
    creditLifecycleMutation.mutate({ credit, action: 'waive', payload: { reason: reason.trim() } });
  };

  const addDraftItem = () => {
    setMessage(null);
    setError(null);
    if (!selectedLot) {
      setError(ui('Select a received inventory lot to return.'));
      return;
    }
    const quantity = Number(lineQuantity);
    const returnable = Number(selectedLot.returnable_quantity ?? 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError(ui('Return quantity must be greater than zero.'));
      return;
    }
    if (quantity > returnable + 0.0000001) {
      setError(ui('Return quantity cannot exceed {quantity} for this lot.').replace('{quantity}', formatQuantity(returnable)));
      return;
    }
    setDraftItems((current) => [
      ...current,
      { inventory_lot_id: selectedLot.inventory_lot_id, quantity, reason: lineReason, lot: selectedLot },
    ]);
    setSelectedLotId('');
    setLineQuantity('');
    setLineReason('');
  };

  const runLifecycleAction = (item: SupplierReturn, action: ReturnLifecycleAction) => {
    if (lifecycleMutation.isPending) return;
    if (action === 'reject') {
      const reason = window.prompt(ui('Reason for rejecting {returnNumber}:').replace('{returnNumber}', item.return_number));
      if (reason === null) return;
      lifecycleMutation.mutate({ item, action, reason });
      return;
    }
    if (action === 'cancel') {
      const reason = window.prompt(ui('Reason for cancelling {returnNumber}:').replace('{returnNumber}', item.return_number));
      if (reason === null) return;
      lifecycleMutation.mutate({ item, action, reason });
      return;
    }
    const prompts: Partial<Record<ReturnLifecycleAction, string>> = {
      submit: ui('Submit {returnNumber}?').replace('{returnNumber}', item.return_number),
      approve: ui('Approve {returnNumber}?').replace('{returnNumber}', item.return_number),
      dispatch: ui('Dispatch {returnNumber}? This removes the returned quantity from physical inventory.').replace('{returnNumber}', item.return_number),
      complete: ui('Mark {returnNumber} completed after the supplier has received it?').replace('{returnNumber}', item.return_number),
    };
    if (prompts[action] && !window.confirm(prompts[action])) return;
    lifecycleMutation.mutate({ item, action });
  };

  if (!canRead) {
    return <section style={styles.card}><p style={styles.helper}>{ui('Supplier returns require {permission} permission.').replace('{permission}', TENANT_PERMISSIONS.SUPPLIER_RETURNS_READ)}</p></section>;
  }

  return (
    <section style={styles.stack}>
      {message ? <div style={styles.success}>{message}</div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}

      <section className="inventory-controls-grid" style={styles.grid}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>{ui('Create supplier return')}</h2>
          <p style={styles.helper}>{ui('Return received stock to its original supplier. Items in one return must belong to the same supplier.')}</p>
          <div style={{ marginTop: 14 }}>
            <SelectField
              label={ui('Received lot')}
              value={selectedLotId}
              onChange={setSelectedLotId}
              disabled={!canWrite || createReturnMutation.isPending}
              options={availableLotOptions.map((lot) => ({
                value: lot.inventory_lot_id,
                label: ui('{supplier} · {product} · {condition} · {lot} · {quantity} available to return')
                  .replace('{supplier}', lot.supplier_name)
                  .replace('{product}', lot.product_name)
                  .replace('{condition}', conditionLabel(lot.condition))
                  .replace('{lot}', lotIdentity(lot))
                  .replace('{quantity}', formatQuantity(lot.returnable_quantity)),
              }))}
            />
            <InputField label={ui('Return quantity')} type="number" min="0.0001" max={selectedLot ? String(selectedLot.returnable_quantity) : undefined} value={lineQuantity} onChange={setLineQuantity} disabled={!canWrite || createReturnMutation.isPending} />
            <InputField label={ui('Line reason (optional)')} value={lineReason} onChange={setLineReason} disabled={!canWrite || createReturnMutation.isPending} />
            {selectedLot ? (
              <p style={styles.helper}>
                {ui('{product} · {location} · {condition} · lot {lot} · expiry {expiry} · returnable {quantity}')
                  .replace('{product}', selectedLot.product_name)
                  .replace('{location}', selectedLot.storage_location_name)
                  .replace('{condition}', conditionLabel(selectedLot.condition))
                  .replace('{lot}', lotIdentity(selectedLot))
                  .replace('{expiry}', selectedLot.expiry_date ? formatLocalizedDate(selectedLot.expiry_date, locale) : '—')
                  .replace('{quantity}', formatQuantity(selectedLot.returnable_quantity))}
              </p>
            ) : null}
            <button type="button" onClick={addDraftItem} disabled={!canWrite || !selectedLotId || !lineQuantity || createReturnMutation.isPending} style={!canWrite || !selectedLotId || !lineQuantity || createReturnMutation.isPending ? styles.disabledButton : styles.secondaryButton}>
              {ui('Add return line')}
            </button>
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>{ui('Return draft')}</h2>
          {draftItems.length ? (
            <div style={styles.stack}>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead><tr>{['Product', 'Condition', 'Lot / batch', 'Quantity', 'Reason', 'Action'].map((header) => <th key={header} style={styles.th}>{ui(header)}</th>)}</tr></thead>
                  <tbody>
                    {draftItems.map((item) => (
                      <tr key={item.inventory_lot_id}>
                        <td style={styles.td}>{item.lot.product_name}<div style={styles.helper}>{item.lot.supplier_name}</div></td>
                        <td style={styles.td}>{conditionLabel(item.lot.condition)}</td>
                        <td style={styles.td}>{lotIdentity(item.lot)}<div style={styles.helper}>{ui('Expiry {date}').replace('{date}', item.lot.expiry_date ? formatLocalizedDate(item.lot.expiry_date, locale) : '—')}</div></td>
                        <td style={styles.td}>{formatQuantity(item.quantity)}</td>
                        <td style={styles.td}>{item.reason || '—'}</td>
                        <td style={styles.td}><button type="button" style={styles.dangerButton} disabled={createReturnMutation.isPending} onClick={() => setDraftItems((current) => current.filter((line) => line.inventory_lot_id !== item.inventory_lot_id))}>{ui('Remove')}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TextareaField label={ui('Return reason')} value={returnReason} onChange={setReturnReason} required disabled={!canWrite || createReturnMutation.isPending} />
              <TextareaField label={ui('Notes')} value={notes} onChange={setNotes} disabled={!canWrite || createReturnMutation.isPending} />
              <p style={styles.helper}>{ui('Estimated return value: {value}').replace('{value}', draftValuationKnown ? formatMoney(draftTotal, selectedDraftCurrency) : ui('Not available'))}</p>
              <button type="button" disabled={!canWrite || !returnReason.trim() || draftCurrencyConflict || createReturnMutation.isPending} style={!canWrite || !returnReason.trim() || draftCurrencyConflict || createReturnMutation.isPending ? styles.disabledButton : styles.primaryButton} onClick={() => createReturnMutation.mutate()}>
                {createReturnMutation.isPending ? ui('Creating…') : ui('Create return draft')}
              </button>
            </div>
          ) : <p style={styles.helper}>{ui('Add one or more received lots from the same supplier.')}</p>}
        </div>
      </section>

      {canReadInvoices ? (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>{ui('Supplier return financial reconciliation')}</h2>
          <p style={styles.helper}>{ui('Keep physical return valuation separate from the supplier credit. Link completed return lines to the original matched or paid invoice so the expected credit uses the invoiced price, then record the supplier credit note and settlement without rewriting the original invoice.')}</p>
          <div style={{ ...styles.formGrid, marginTop: 14 }}>
            <SelectField
              label={ui('Completed supplier return')}
              value={creditReturnId}
              onChange={handleCreditReturnChange}
              disabled={!canManageCredits || createCreditMutation.isPending || creditLifecycleMutation.isPending}
              options={completedReturns.map((item) => ({ value: item.id, label: `${item.return_number} · ${item.supplier_name}` }))}
            />
            <SelectField
              label={ui('Original matched / paid invoice')}
              value={creditInvoiceId}
              onChange={handleCreditInvoiceChange}
              disabled={!canManageCredits || !selectedCreditReturn || createCreditMutation.isPending || creditLifecycleMutation.isPending}
              options={candidateInvoices.map((invoice) => ({ value: invoice.id, label: `${invoice.invoice_number} · ${statusLabel(invoice.status)} · ${formatMoney(invoice.total_amount, invoice.currency)}` }))}
            />
            <InputField label={ui('Expected credit tax')} type="number" min="0" step="0.0001" value={expectedCreditTax} onChange={setExpectedCreditTax} disabled={!canManageCredits || !selectedCreditInvoice || createCreditMutation.isPending || creditLifecycleMutation.isPending} />
          </div>
          {selectedCreditReturn && selectedCreditInvoice ? (
            <div style={{ marginTop: 12 }}>
              <p style={styles.helper}>{ui('Select the returned invoice lines covered by this supplier credit. The expected subtotal is calculated from the original invoice unit price, not the inventory lot cost.')}</p>
              <div style={{ marginTop: 10 }}>
                {creditEligibleItems.length ? creditEligibleItems.map((item) => {
                  const invoiceLine = findCreditInvoiceLine(item, selectedCreditInvoice);
                  const lineExpected = Number(item.quantity || 0) * Number(invoiceLine?.unit_cost || 0);
                  return (
                    <label key={item.id} style={styles.checkboxRow}>
                      <input type="checkbox" checked={creditReturnItemIds.includes(item.id)} onChange={() => toggleCreditReturnItem(item.id)} disabled={!canManageCredits || createCreditMutation.isPending || creditLifecycleMutation.isPending} />
                      <span>{item.product_name || ui('Product')} · {formatQuantity(item.quantity)} × {formatMoney(invoiceLine?.unit_cost, selectedCreditInvoice.currency)} = {formatMoney(lineExpected, selectedCreditInvoice.currency)}</span>
                    </label>
                  );
                }) : <p style={styles.helper}>{ui('No unreconciled return lines can be safely matched to this invoice.')}</p>}
              </div>
              <TextareaField label={ui('Supplier credit notes (optional)')} value={creditNotes} onChange={setCreditNotes} disabled={!canManageCredits || createCreditMutation.isPending || creditLifecycleMutation.isPending} />
              <p style={styles.helper}>{ui('Expected supplier credit: subtotal {subtotal} · tax {tax} · total {total}')
                .replace('{subtotal}', formatMoney(expectedCreditSubtotal, selectedCreditInvoice.currency))
                .replace('{tax}', formatMoney(Number.isFinite(expectedCreditTaxNumber) ? expectedCreditTaxNumber : 0, selectedCreditInvoice.currency))
                .replace('{total}', formatMoney(expectedCreditSubtotal + (Number.isFinite(expectedCreditTaxNumber) ? expectedCreditTaxNumber : 0), selectedCreditInvoice.currency))}</p>
              <button type="button" style={creditDraftValid && !createCreditMutation.isPending ? styles.primaryButton : styles.disabledButton} disabled={!creditDraftValid || createCreditMutation.isPending || creditLifecycleMutation.isPending} onClick={() => createCreditMutation.mutate()}>
                {createCreditMutation.isPending ? ui('Creating…') : ui('Create expected supplier credit')}
              </button>
            </div>
          ) : null}
          {!canManageCredits ? <p style={{ ...styles.helper, marginTop: 12 }}>{ui('Managing supplier credits requires both Supplier Returns Write and Supplier Invoices Write permissions.')}</p> : null}
        </section>
      ) : null}

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>{ui('Supplier returns')}</h2>
        {returnsQuery.isLoading ? <p style={styles.helper}>{ui('Loading…')}</p> : returnsQuery.isError ? (
          <p style={styles.error}>{normalizeError(returnsQuery.error, ui('Failed to load supplier returns.'))}</p>
        ) : (returnsQuery.data ?? []).length ? (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead><tr>{['Return', 'Supplier', 'Items', 'Reason', 'Value', 'Status', 'Financial credit', 'Created', 'Actions'].map((header) => <th key={header} style={styles.th}>{ui(header)}</th>)}</tr></thead>
              <tbody>
                {(returnsQuery.data ?? []).map((item) => {
                  const causesSidebarAttention = approvalAttentionKeys.has(`supplier_return:${item.id}`) || directApprovalAttentionIds.has(item.id) || dispatchAttentionIds.has(item.id);
                  return (
                  <tr
                    key={item.id}
                    style={causesSidebarAttention ? sidebarAttentionItemStyle : undefined}
                    data-sidebar-attention-item={causesSidebarAttention ? "true" : undefined}
                  >
                    <td style={styles.td}><strong>{item.return_number}</strong>{causesSidebarAttention ? <div style={{ marginTop: 6 }}><SidebarAttentionMarker label={ui('Attention required')} /></div> : null}</td>
                    <td style={styles.td}>{item.supplier_name}</td>
                    <td style={styles.td}>{(item.items ?? []).map((line) => (
                      <div key={line.id} style={{ marginBottom: 6 }}>
                        <strong>{line.product_name || ui('Product')}</strong> · {formatQuantity(line.quantity)} · {conditionLabel(line.source_condition)}
                        <div style={styles.helper}>{line.storage_location_name || '—'} · {line.lot_number || line.batch_number || ui('Unnumbered lot')}</div>
                      </div>
                    ))}</td>
                    <td style={styles.td}>{item.reason}</td>
                    <td style={styles.td}>{item.valuation_status === 'unavailable' ? ui('Not available') : formatMoney(item.total_amount, item.currency)}</td>
                    <td style={styles.td}>{statusLabel(item.status)}</td>
                    <td style={styles.td}>
                      {(item.credit_reconciliations ?? []).length ? (item.credit_reconciliations ?? []).map((credit) => (
                        <div key={credit.id} style={{ marginBottom: 10 }}>
                          <strong>{credit.invoice_number || ui('Supplier invoice')}</strong> · {statusLabel(credit.status)}
                          <div style={styles.helper}>{ui('Expected: {value}').replace('{value}', formatMoney(credit.expected_total_amount, credit.currency))}</div>
                          {credit.actual_total_amount != null ? <div style={styles.helper}>{ui('Actual: {value}').replace('{value}', formatMoney(credit.actual_total_amount, credit.currency))}</div> : null}
                          {credit.credit_note_number ? <div style={styles.helper}>{ui('Credit note: {number} · {date}').replace('{number}', credit.credit_note_number).replace('{date}', credit.credit_note_date ? formatLocalizedDate(credit.credit_note_date, locale) : '—')}</div> : null}
                          {credit.settlement_reference ? <div style={styles.helper}>{ui('Settlement: {method} · {reference}').replace('{method}', credit.settlement_method || '—').replace('{reference}', credit.settlement_reference)}</div> : null}
                          {credit.waiver_reason ? <div style={styles.helper}>{ui('Waived: {reason}').replace('{reason}', credit.waiver_reason)}</div> : null}
                          {canManageCredits ? (
                            <div style={{ ...styles.actions, marginTop: 6 }}>
                              {credit.status === 'expected' ? <>
                                <button type="button" style={styles.secondarySmallButton} disabled={creditLifecycleMutation.isPending} onClick={() => adjustExpectedCredit(credit)}>{ui('Adjust expected credit')}</button>
                                <button type="button" style={styles.smallButton} disabled={creditLifecycleMutation.isPending} onClick={() => recordCreditNote(credit)}>{ui('Record credit note')}</button>
                                <button type="button" style={styles.dangerButton} disabled={creditLifecycleMutation.isPending} onClick={() => waiveCredit(credit)}>{ui('Waive')}</button>
                              </> : null}
                              {credit.status === 'credit_note_received' ? <button type="button" style={styles.smallButton} disabled={creditLifecycleMutation.isPending} onClick={() => settleCredit(credit)}>{ui('Settle credit')}</button> : null}
                            </div>
                          ) : null}
                        </div>
                      )) : <span style={styles.helper}>{item.status === 'completed' ? ui('No supplier credit reconciliation yet.') : '—'}</span>}
                    </td>
                    <td style={styles.td}>{formatLocalizedDateTime(item.created_at, locale)}</td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        {item.status === 'draft' ? <button type="button" disabled={!canWrite || lifecycleMutation.isPending} style={canWrite && !lifecycleMutation.isPending ? styles.smallButton : styles.disabledButton} onClick={() => runLifecycleAction(item, 'submit')}>{ui('Submit')}</button> : null}
                        {item.status === 'pending_approval' ? <>
                          <button type="button" disabled={!canApprove || lifecycleMutation.isPending} style={canApprove && !lifecycleMutation.isPending ? styles.smallButton : styles.disabledButton} title={!canApprove ? ui('Requires {permission} permission.').replace('{permission}', TENANT_PERMISSIONS.APPROVALS_EXECUTE) : undefined} onClick={() => runLifecycleAction(item, 'approve')}>{ui('Approve')}</button>
                          <button type="button" disabled={!canApprove || lifecycleMutation.isPending} style={canApprove && !lifecycleMutation.isPending ? styles.dangerButton : styles.disabledButton} title={!canApprove ? ui('Requires {permission} permission.').replace('{permission}', TENANT_PERMISSIONS.APPROVALS_EXECUTE) : undefined} onClick={() => runLifecycleAction(item, 'reject')}>{ui('Reject')}</button>
                        </> : null}
                        {item.status === 'approved' ? <button type="button" disabled={!canDispatch || lifecycleMutation.isPending} style={canDispatch && !lifecycleMutation.isPending ? styles.smallButton : styles.disabledButton} title={!canDispatch ? ui('Requires {permission} permission.').replace('{permission}', TENANT_PERMISSIONS.SUPPLIER_RETURNS_DISPATCH) : undefined} onClick={() => runLifecycleAction(item, 'dispatch')}>{ui('Dispatch')}</button> : null}
                        {item.status === 'dispatched' ? <button type="button" disabled={!canDispatch || lifecycleMutation.isPending} style={canDispatch && !lifecycleMutation.isPending ? styles.smallButton : styles.disabledButton} onClick={() => runLifecycleAction(item, 'complete')}>{ui('Complete')}</button> : null}
                        {['draft', 'pending_approval', 'approved'].includes(item.status) ? <button type="button" disabled={!canWrite || lifecycleMutation.isPending} style={canWrite && !lifecycleMutation.isPending ? styles.dangerButton : styles.disabledButton} onClick={() => runLifecycleAction(item, 'cancel')}>{ui('Cancel')}</button> : null}
                        {!['draft', 'pending_approval', 'approved', 'dispatched'].includes(item.status) ? <span style={styles.helper}>—</span> : null}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p style={styles.helper}>{ui('No supplier returns yet.')}</p>}
      </section>
    </section>
  );
}
