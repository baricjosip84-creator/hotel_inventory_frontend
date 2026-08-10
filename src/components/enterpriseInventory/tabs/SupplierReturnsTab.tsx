import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../lib/api';
import { TENANT_PERMISSIONS, hasPermission } from '../../../lib/permissions';
import { formatCurrency, formatDate, formatDateTime, formatNumber, normalizeError } from '../EnterpriseInventoryFormat';
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
  condition: 'available' | 'quarantine' | 'damaged' | 'rejected';
  physical_quantity: number | string;
  reserved_return_quantity: number | string;
  returnable_quantity: number | string;
  unit_cost?: number | string | null;
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

const labelize = (value: string | null | undefined) =>
  value ? value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()) : '-';

const lotIdentity = (lot: Pick<EligibleReturnLot, 'lot_number' | 'batch_number'>) =>
  lot.lot_number || lot.batch_number || 'Unnumbered lot';

export function SupplierReturnsTab() {
  const queryClient = useQueryClient();
  const canRead = hasPermission(TENANT_PERMISSIONS.SUPPLIER_RETURNS_READ);
  const canWrite = hasPermission(TENANT_PERMISSIONS.SUPPLIER_RETURNS_WRITE);
  const canDispatch = hasPermission(TENANT_PERMISSIONS.SUPPLIER_RETURNS_DISPATCH);
  const canApprove = hasPermission(TENANT_PERMISSIONS.APPROVALS_EXECUTE);

  const [selectedLotId, setSelectedLotId] = useState('');
  const [lineQuantity, setLineQuantity] = useState('');
  const [lineReason, setLineReason] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [notes, setNotes] = useState('');
  const [draftItems, setDraftItems] = useState<DraftReturnItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  const eligibleLots = useMemo(() => eligibleLotsQuery.data ?? [], [eligibleLotsQuery.data]);
  const availableLotOptions = useMemo(
    () => eligibleLots.filter((lot) => {
      if (draftItems.some((item) => item.inventory_lot_id === lot.inventory_lot_id)) return false;
      return !selectedSupplierId || lot.supplier_id === selectedSupplierId;
    }),
    [draftItems, eligibleLots, selectedSupplierId],
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
      setMessage(`Supplier return ${created.return_number || ''} created as a draft.`.trim());
      await refreshReturnData();
    },
    onError: (mutationError) => {
      setMessage(null);
      setError(normalizeError(mutationError, 'Failed to create supplier return.'));
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
      const successLabels: Record<ReturnLifecycleAction, string> = {
        submit: 'submitted',
        approve: 'approved',
        reject: 'rejected',
        dispatch: 'dispatched',
        complete: 'completed',
        cancel: 'cancelled',
      };
      setError(null);
      setMessage(`${input.item.return_number} ${successLabels[input.action]} successfully.`);
      await refreshReturnData();
    },
    onError: (mutationError) => {
      setMessage(null);
      setError(normalizeError(mutationError, 'Failed to update supplier return.'));
    },
  });

  const addDraftItem = () => {
    setMessage(null);
    setError(null);
    if (!selectedLot) {
      setError('Select a received inventory lot to return.');
      return;
    }
    const quantity = Number(lineQuantity);
    const returnable = Number(selectedLot.returnable_quantity ?? 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Return quantity must be greater than zero.');
      return;
    }
    if (quantity > returnable + 0.0000001) {
      setError(`Return quantity cannot exceed ${formatNumber(returnable)} for this lot.`);
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
      const reason = window.prompt(`Reason for rejecting ${item.return_number}:`);
      if (reason === null) return;
      lifecycleMutation.mutate({ item, action, reason });
      return;
    }
    if (action === 'cancel') {
      const reason = window.prompt(`Reason for cancelling ${item.return_number}:`);
      if (reason === null) return;
      lifecycleMutation.mutate({ item, action, reason });
      return;
    }
    const prompts: Partial<Record<ReturnLifecycleAction, string>> = {
      submit: `Submit ${item.return_number}?`,
      approve: `Approve ${item.return_number}?`,
      dispatch: `Dispatch ${item.return_number}? This removes the returned quantity from physical inventory.`,
      complete: `Mark ${item.return_number} completed after the supplier has received it?`,
    };
    if (prompts[action] && !window.confirm(prompts[action])) return;
    lifecycleMutation.mutate({ item, action });
  };

  if (!canRead) {
    return <section style={styles.card}><p style={styles.helper}>Supplier returns require {TENANT_PERMISSIONS.SUPPLIER_RETURNS_READ} permission.</p></section>;
  }

  return (
    <section style={styles.stack}>
      {message ? <div style={styles.success}>{message}</div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}

      <section style={styles.grid}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Create supplier return</h2>
          <p style={styles.helper}>Return received stock to its original supplier. Items in one return must belong to the same supplier.</p>
          <div style={{ marginTop: 14 }}>
            <SelectField
              label="Received lot"
              value={selectedLotId}
              onChange={setSelectedLotId}
              disabled={!canWrite || createReturnMutation.isPending}
              options={availableLotOptions.map((lot) => ({
                value: lot.inventory_lot_id,
                label: `${lot.supplier_name} · ${lot.product_name} · ${labelize(lot.condition)} · ${lotIdentity(lot)} · ${formatNumber(lot.returnable_quantity)} available to return`,
              }))}
            />
            <InputField
              label="Return quantity"
              type="number"
              min="0.0001"
              max={selectedLot ? String(selectedLot.returnable_quantity) : undefined}
              value={lineQuantity}
              onChange={setLineQuantity}
              disabled={!canWrite || createReturnMutation.isPending}
            />
            <InputField
              label="Line reason (optional)"
              value={lineReason}
              onChange={setLineReason}
              disabled={!canWrite || createReturnMutation.isPending}
            />
            {selectedLot ? (
              <p style={styles.helper}>
                {selectedLot.product_name} · {selectedLot.storage_location_name} · {labelize(selectedLot.condition)} · lot {lotIdentity(selectedLot)} · expiry {formatDate(selectedLot.expiry_date)} · returnable {formatNumber(selectedLot.returnable_quantity)}
              </p>
            ) : null}
            <button
              type="button"
              onClick={addDraftItem}
              disabled={!canWrite || !selectedLotId || !lineQuantity || createReturnMutation.isPending}
              style={!canWrite || !selectedLotId || !lineQuantity || createReturnMutation.isPending ? styles.disabledButton : styles.secondaryButton}
            >
              Add return line
            </button>
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Return draft</h2>
          {draftItems.length ? (
            <div style={styles.stack}>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Product</th>
                      <th style={styles.th}>Condition</th>
                      <th style={styles.th}>Lot / batch</th>
                      <th style={styles.th}>Quantity</th>
                      <th style={styles.th}>Reason</th>
                      <th style={styles.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftItems.map((item) => (
                      <tr key={item.inventory_lot_id}>
                        <td style={styles.td}>{item.lot.product_name}<div style={styles.helper}>{item.lot.supplier_name}</div></td>
                        <td style={styles.td}>{labelize(item.lot.condition)}</td>
                        <td style={styles.td}>{lotIdentity(item.lot)}<div style={styles.helper}>Expiry {formatDate(item.lot.expiry_date)}</div></td>
                        <td style={styles.td}>{formatNumber(item.quantity)}</td>
                        <td style={styles.td}>{item.reason || '-'}</td>
                        <td style={styles.td}>
                          <button type="button" style={styles.dangerButton} disabled={createReturnMutation.isPending} onClick={() => setDraftItems((current) => current.filter((line) => line.inventory_lot_id !== item.inventory_lot_id))}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TextareaField label="Return reason" value={returnReason} onChange={setReturnReason} required disabled={!canWrite || createReturnMutation.isPending} />
              <TextareaField label="Notes" value={notes} onChange={setNotes} disabled={!canWrite || createReturnMutation.isPending} />
              <p style={styles.helper}>Estimated return value: {formatCurrency(draftTotal)}</p>
              <button
                type="button"
                disabled={!canWrite || !returnReason.trim() || createReturnMutation.isPending}
                style={!canWrite || !returnReason.trim() || createReturnMutation.isPending ? styles.disabledButton : styles.primaryButton}
                onClick={() => createReturnMutation.mutate()}
              >
                {createReturnMutation.isPending ? 'Creating…' : 'Create return draft'}
              </button>
            </div>
          ) : (
            <p style={styles.helper}>Add one or more received lots from the same supplier.</p>
          )}
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Supplier returns</h2>
        {returnsQuery.isLoading ? (
          <p style={styles.helper}>Loading…</p>
        ) : returnsQuery.isError ? (
          <p style={styles.error}>{normalizeError(returnsQuery.error, 'Failed to load supplier returns.')}</p>
        ) : (returnsQuery.data ?? []).length ? (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Return</th>
                  <th style={styles.th}>Supplier</th>
                  <th style={styles.th}>Items</th>
                  <th style={styles.th}>Reason</th>
                  <th style={styles.th}>Value</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(returnsQuery.data ?? []).map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}><strong>{item.return_number}</strong></td>
                    <td style={styles.td}>{item.supplier_name}</td>
                    <td style={styles.td}>
                      {(item.items ?? []).map((line) => (
                        <div key={line.id} style={{ marginBottom: 6 }}>
                          <strong>{line.product_name || 'Product'}</strong> · {formatNumber(line.quantity)} · {labelize(line.source_condition)}
                          <div style={styles.helper}>{line.storage_location_name || '-'} · {line.lot_number || line.batch_number || 'Unnumbered lot'}</div>
                        </div>
                      ))}
                    </td>
                    <td style={styles.td}>{item.reason}</td>
                    <td style={styles.td}>{formatCurrency(item.total_amount, item.currency)}</td>
                    <td style={styles.td}>{labelize(item.status)}</td>
                    <td style={styles.td}>{formatDateTime(item.created_at)}</td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        {item.status === 'draft' ? (
                          <button type="button" disabled={!canWrite || lifecycleMutation.isPending} style={canWrite && !lifecycleMutation.isPending ? styles.smallButton : styles.disabledButton} onClick={() => runLifecycleAction(item, 'submit')}>Submit</button>
                        ) : null}
                        {item.status === 'pending_approval' ? (
                          <>
                            <button type="button" disabled={!canApprove || lifecycleMutation.isPending} style={canApprove && !lifecycleMutation.isPending ? styles.smallButton : styles.disabledButton} title={!canApprove ? `Requires ${TENANT_PERMISSIONS.APPROVALS_EXECUTE} permission.` : undefined} onClick={() => runLifecycleAction(item, 'approve')}>Approve</button>
                            <button type="button" disabled={!canApprove || lifecycleMutation.isPending} style={canApprove && !lifecycleMutation.isPending ? styles.dangerButton : styles.disabledButton} title={!canApprove ? `Requires ${TENANT_PERMISSIONS.APPROVALS_EXECUTE} permission.` : undefined} onClick={() => runLifecycleAction(item, 'reject')}>Reject</button>
                          </>
                        ) : null}
                        {item.status === 'approved' ? (
                          <button type="button" disabled={!canDispatch || lifecycleMutation.isPending} style={canDispatch && !lifecycleMutation.isPending ? styles.smallButton : styles.disabledButton} title={!canDispatch ? `Requires ${TENANT_PERMISSIONS.SUPPLIER_RETURNS_DISPATCH} permission.` : undefined} onClick={() => runLifecycleAction(item, 'dispatch')}>Dispatch</button>
                        ) : null}
                        {item.status === 'dispatched' ? (
                          <button type="button" disabled={!canDispatch || lifecycleMutation.isPending} style={canDispatch && !lifecycleMutation.isPending ? styles.smallButton : styles.disabledButton} onClick={() => runLifecycleAction(item, 'complete')}>Complete</button>
                        ) : null}
                        {['draft', 'pending_approval', 'approved'].includes(item.status) ? (
                          <button type="button" disabled={!canWrite || lifecycleMutation.isPending} style={canWrite && !lifecycleMutation.isPending ? styles.dangerButton : styles.disabledButton} onClick={() => runLifecycleAction(item, 'cancel')}>Cancel</button>
                        ) : null}
                        {!['draft', 'pending_approval', 'approved', 'dispatched'].includes(item.status) ? <span style={styles.helper}>-</span> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={styles.helper}>No supplier returns yet.</p>
        )}
      </section>
    </section>
  );
}
