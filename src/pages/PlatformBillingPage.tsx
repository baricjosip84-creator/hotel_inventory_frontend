import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '../lib/platformPermissions';

type BillingTenant = {
  id: string;
  name: string;
  location?: string | null;
  status?: string;
  billing_status?: string;
  plan_code?: string;
  billing_customer_reference?: string | null;
  trial_ends_at?: string | null;
  current_period_ends_at?: string | null;
  billing_notes?: string | null;
  billing_event_count?: number;
  last_billing_event_at?: string | null;
};

type BillingEvent = {
  id: string;
  event_type: string;
  amount_cents?: number | null;
  currency?: string | null;
  external_reference?: string | null;
  note?: string | null;
  created_at: string;
  created_by_email?: string | null;
  created_by_name?: string | null;
};

type BillingDetails = { tenant: BillingTenant; events: BillingEvent[] };

const billingStatuses = ['not_configured', 'trialing', 'active', 'past_due', 'cancelled', 'comped'];
const eventTypes = ['note', 'invoice_sent', 'payment_received', 'payment_failed', 'trial_extended', 'subscription_started', 'subscription_cancelled', 'comp_granted', 'billing_status_changed'];

function readableError(error: unknown): string {
  return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error';
}

function isoDateInput(value?: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

function money(cents?: number | null, currency?: string | null): string {
  if (cents === null || cents === undefined) return '-';
  return `${((cents || 0) / 100).toFixed(2)} ${currency || ''}`.trim();
}

export default function PlatformBillingPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [billingForm, setBillingForm] = useState({
    billing_status: 'not_configured',
    plan_code: '',
    billing_customer_reference: '',
    trial_ends_at: '',
    current_period_ends_at: '',
    billing_notes: ''
  });
  const [eventForm, setEventForm] = useState({
    event_type: 'note',
    amount_cents: '',
    currency: 'EUR',
    external_reference: '',
    note: ''
  });

  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_WRITE);
  const overviewQuery = useQuery({
    queryKey: ['platform', 'billing', statusFilter],
    queryFn: () => platformApiRequest<BillingTenant[]>(`/platform/billing${statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ''}`)
  });
  const detailsQuery = useQuery({
    queryKey: ['platform', 'billing', selectedTenantId],
    queryFn: () => platformApiRequest<BillingDetails>(`/platform/billing/${selectedTenantId}`),
    enabled: Boolean(selectedTenantId)
  });

  useEffect(() => {
    if (!detailsQuery.data?.tenant) return;
    const tenant = detailsQuery.data.tenant;
    setBillingForm({
      billing_status: tenant.billing_status || 'not_configured',
      plan_code: tenant.plan_code || '',
      billing_customer_reference: tenant.billing_customer_reference || '',
      trial_ends_at: isoDateInput(tenant.trial_ends_at),
      current_period_ends_at: isoDateInput(tenant.current_period_ends_at),
      billing_notes: tenant.billing_notes || ''
    });
  }, [detailsQuery.data?.tenant?.id]);

  const saveBilling = useMutation({
    mutationFn: () => platformApiRequest(`/platform/billing/${selectedTenantId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...billingForm,
        trial_ends_at: billingForm.trial_ends_at || null,
        current_period_ends_at: billingForm.current_period_ends_at || null
      })
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform', 'billing'] });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'billing', selectedTenantId] });
    }
  });

  const createEvent = useMutation({
    mutationFn: () => platformApiRequest(`/platform/billing/${selectedTenantId}/events`, {
      method: 'POST',
      body: JSON.stringify({
        event_type: eventForm.event_type,
        amount_cents: eventForm.amount_cents ? Number.parseInt(eventForm.amount_cents, 10) : null,
        currency: eventForm.currency || null,
        external_reference: eventForm.external_reference || null,
        note: eventForm.note || null
      })
    }),
    onSuccess: async () => {
      setEventForm({ event_type: 'note', amount_cents: '', currency: 'EUR', external_reference: '', note: '' });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'billing'] });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'billing', selectedTenantId] });
    }
  });

  return (
    <div style={styles.page}>
      <header>
        <h1 style={styles.title}>Billing</h1>
        <p style={styles.subtitle}>Track tenant billing status, plan references, renewal dates, invoice/payment events, and billing notes. This is internal billing operations, not a payment-provider integration.</p>
      </header>

      <section style={styles.panel}>
        <div style={styles.toolbar}>
          <label>Status filter{' '}
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">all</option>
              {billingStatuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
        </div>
        {overviewQuery.error ? <div style={styles.error}>{readableError(overviewQuery.error)}</div> : null}
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Tenant</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Plan</th>
              <th style={styles.th}>Customer ref</th>
              <th style={styles.th}>Trial ends</th>
              <th style={styles.th}>Period ends</th>
              <th style={styles.th}>Events</th>
            </tr>
          </thead>
          <tbody>
            {(overviewQuery.data || []).map((tenant) => (
              <tr key={tenant.id}>
                <td style={styles.td}><button style={styles.linkButton} onClick={() => setSelectedTenantId(tenant.id)}>{tenant.name}</button></td>
                <td style={styles.td}>{tenant.billing_status || '-'}</td>
                <td style={styles.td}>{tenant.plan_code || '-'}</td>
                <td style={styles.td}>{tenant.billing_customer_reference || '-'}</td>
                <td style={styles.td}>{isoDateInput(tenant.trial_ends_at) || '-'}</td>
                <td style={styles.td}>{isoDateInput(tenant.current_period_ends_at) || '-'}</td>
                <td style={styles.td}>{tenant.billing_event_count || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {selectedTenantId && detailsQuery.data ? (
        <section style={styles.panel}>
          <h2>{detailsQuery.data.tenant.name}</h2>
          {canWrite ? (
            <div style={styles.grid}>
              <label style={styles.label}>Billing status
                <select style={styles.input} value={billingForm.billing_status} onChange={(event) => setBillingForm({ ...billingForm, billing_status: event.target.value })}>
                  {billingStatuses.map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
              <label style={styles.label}>Plan code
                <input style={styles.input} value={billingForm.plan_code} onChange={(event) => setBillingForm({ ...billingForm, plan_code: event.target.value })} />
              </label>
              <label style={styles.label}>Customer reference
                <input style={styles.input} value={billingForm.billing_customer_reference} onChange={(event) => setBillingForm({ ...billingForm, billing_customer_reference: event.target.value })} />
              </label>
              <label style={styles.label}>Trial ends
                <input style={styles.input} type="date" value={billingForm.trial_ends_at} onChange={(event) => setBillingForm({ ...billingForm, trial_ends_at: event.target.value })} />
              </label>
              <label style={styles.label}>Current period ends
                <input style={styles.input} type="date" value={billingForm.current_period_ends_at} onChange={(event) => setBillingForm({ ...billingForm, current_period_ends_at: event.target.value })} />
              </label>
              <label style={{ ...styles.label, gridColumn: '1 / -1' }}>Billing notes
                <textarea style={styles.textarea} value={billingForm.billing_notes} onChange={(event) => setBillingForm({ ...billingForm, billing_notes: event.target.value })} />
              </label>
              <button style={styles.button} onClick={() => saveBilling.mutate()} disabled={saveBilling.isPending}>Save billing profile</button>
            </div>
          ) : null}
          {saveBilling.error ? <div style={styles.error}>{readableError(saveBilling.error)}</div> : null}

          {canWrite ? (
            <div style={styles.eventBox}>
              <h3>Add billing event</h3>
              <div style={styles.grid}>
                <label style={styles.label}>Event type
                  <select style={styles.input} value={eventForm.event_type} onChange={(event) => setEventForm({ ...eventForm, event_type: event.target.value })}>
                    {eventTypes.map((type) => <option key={type}>{type}</option>)}
                  </select>
                </label>
                <label style={styles.label}>Amount cents
                  <input style={styles.input} inputMode="numeric" value={eventForm.amount_cents} onChange={(event) => setEventForm({ ...eventForm, amount_cents: event.target.value })} />
                </label>
                <label style={styles.label}>Currency
                  <input style={styles.input} value={eventForm.currency} onChange={(event) => setEventForm({ ...eventForm, currency: event.target.value.toUpperCase() })} />
                </label>
                <label style={styles.label}>External reference
                  <input style={styles.input} value={eventForm.external_reference} onChange={(event) => setEventForm({ ...eventForm, external_reference: event.target.value })} />
                </label>
                <label style={{ ...styles.label, gridColumn: '1 / -1' }}>Note
                  <textarea style={styles.textarea} value={eventForm.note} onChange={(event) => setEventForm({ ...eventForm, note: event.target.value })} />
                </label>
                <button style={styles.button} onClick={() => createEvent.mutate()} disabled={createEvent.isPending}>Add event</button>
              </div>
              {createEvent.error ? <div style={styles.error}>{readableError(createEvent.error)}</div> : null}
            </div>
          ) : null}

          <h3>Billing history</h3>
          <div style={styles.events}>
            {detailsQuery.data.events.map((event) => (
              <div key={event.id} style={styles.eventItem}>
                <strong>{event.event_type}</strong>
                <span>{new Date(event.created_at).toLocaleString()}</span>
                <span>{money(event.amount_cents, event.currency)}</span>
                <span>{event.external_reference || '-'}</span>
                <p>{event.note || 'No note'}</p>
              </div>
            ))}
            {!detailsQuery.data.events.length ? <p>No billing events yet.</p> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: '24px' },
  title: { margin: 0, fontSize: '30px' },
  subtitle: { color: '#6b7280', maxWidth: '820px' },
  panel: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '20px', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)' },
  toolbar: { display: 'flex', justifyContent: 'space-between', marginBottom: '16px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px', borderBottom: '1px solid #e5e7eb', fontSize: '13px', color: '#6b7280' },
  td: { padding: '10px', borderBottom: '1px solid #f3f4f6' },
  linkButton: { border: 0, background: 'transparent', color: '#2563eb', cursor: 'pointer', fontWeight: 700, padding: 0 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' },
  label: { display: 'flex', flexDirection: 'column', gap: '6px', fontWeight: 700, fontSize: '13px' },
  input: { padding: '10px', border: '1px solid #d1d5db', borderRadius: '10px' },
  textarea: { padding: '10px', border: '1px solid #d1d5db', borderRadius: '10px', minHeight: '80px' },
  button: { padding: '10px 14px', border: 0, borderRadius: '10px', background: '#111827', color: '#fff', cursor: 'pointer', fontWeight: 700 },
  eventBox: { marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' },
  events: { display: 'grid', gap: '10px' },
  eventItem: { display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '12px', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '12px' },
  error: { color: '#b91c1c', background: '#fee2e2', padding: '10px', borderRadius: '10px', marginTop: '10px' }
};
