import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../lib/api';
import { TENANT_PERMISSIONS, hasPermission } from '../../../lib/permissions';
import { getActiveTenantCurrency } from '../../../lib/tenantCurrency';
import { useAppTranslation } from '../../../i18n/I18nContext';
import { SidebarAttentionMarker, sidebarAttentionItemStyle } from '../../ui/SidebarAttentionMarker';
import { useOperationalAttentionItems } from '../../../lib/sidebarAttentionItems';
import { formatLocalizedCurrency, formatLocalizedDate, formatLocalizedDateTime, formatLocalizedNumber } from '../../../i18n/formatters';
import { normalizeError } from '../EnterpriseInventoryFormat';
import { InputField, SelectField, TextareaField } from '../EnterpriseInventoryShared';
import { postEnterpriseInventoryRequest, postEnterpriseInventoryVersionedRequest } from '../EnterpriseInventoryRequests';
import { styles } from '../EnterpriseInventoryStyles';

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
  purchase_order_id?: string | null;
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

  const eligibleLotsQuery = useQuery({
    queryKey: ['enterprise-supplier-return-eligible-lots'],
    queryFn: () => apiRequest<EligibleReturnLot[]>('/enterprise-inventory/supplier-returns/eligible-lots'),
    enabled: canRead,
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

  const refreshReturnData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['enterprise-supplier-returns'] }),
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

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>{ui('Supplier returns')}</h2>
        {returnsQuery.isLoading ? <p style={styles.helper}>{ui('Loading…')}</p> : returnsQuery.isError ? (
          <p style={styles.error}>{normalizeError(returnsQuery.error, ui('Failed to load supplier returns.'))}</p>
        ) : (returnsQuery.data ?? []).length ? (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead><tr>{['Return', 'Supplier', 'Items', 'Reason', 'Value', 'Status', 'Created', 'Actions'].map((header) => <th key={header} style={styles.th}>{ui(header)}</th>)}</tr></thead>
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
