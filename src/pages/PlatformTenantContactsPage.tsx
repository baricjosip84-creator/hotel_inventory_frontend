import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';
import { scrollToFormSection } from '../lib/scrollToForm';

type Tenant = { id: string; name: string; location?: string | null };
type Contact = {
  id: string;
  tenant_id: string;
  tenant_name?: string;
  contact_type: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  is_primary: boolean;
  escalation_order: number;
  notes?: string | null;
  updated_at?: string;
};

const contactTypes = ['operations', 'billing', 'technical', 'owner', 'emergency', 'other'];

function readableError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

const blankForm = {
  contact_type: 'operations',
  name: '',
  email: '',
  phone: '',
  title: '',
  is_primary: false,
  escalation_order: 1,
  notes: ''
};

export default function PlatformTenantContactsPage() {
  const qc = useQueryClient();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_UPDATE);
  const [searchParams] = useSearchParams();
  const [tenantId, setTenantId] = useState(searchParams.get('tenant_id') || '');
  const [contactType, setContactType] = useState('');
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'for-contacts'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants')
  });

  const query = new URLSearchParams();
  if (tenantId) query.set('tenant_id', tenantId);
  if (contactType) query.set('contact_type', contactType);

  const contacts = useQuery({
    queryKey: ['platform', 'tenant-contacts', tenantId, contactType],
    queryFn: () => platformApiRequest<Contact[]>(`/platform/tenant-contacts?${query.toString()}`)
  });

  const refreshAll = async () => {
    setMessage('');
    await Promise.all([tenants.refetch(), contacts.refetch()]);
  };

  const rows = contacts.data || [];
  const selectedTenant = useMemo(() => (tenants.data || []).find((tenant) => tenant.id === tenantId), [tenants.data, tenantId]);

  const contactPayload = () => ({
    ...form,
    name: form.name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    title: form.title.trim(),
    notes: form.notes.trim()
  });

  const create = useMutation({
    mutationFn: () => platformApiRequest<Contact>(`/platform/tenant-contacts/tenants/${tenantId}`, {
      method: 'POST',
      body: JSON.stringify(contactPayload())
    }),
    onSuccess: async () => {
      setForm(blankForm);
      setMessage('Contact saved.');
      await qc.invalidateQueries({ queryKey: ['platform', 'tenant-contacts'] });
    }
  });

  const update = useMutation({
    mutationFn: (id: string) => platformApiRequest<Contact>(`/platform/tenant-contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(contactPayload())
    }),
    onSuccess: async () => {
      setEditingId(null);
      setForm(blankForm);
      setMessage('Contact updated.');
      await qc.invalidateQueries({ queryKey: ['platform', 'tenant-contacts'] });
    }
  });

  const remove = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/tenant-contacts/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      setMessage('Contact deleted.');
      await qc.invalidateQueries({ queryKey: ['platform', 'tenant-contacts'] });
    }
  });

  const deleteContact = (contact: Contact) => {
    const ok = window.confirm(`Delete tenant contact ${contact.name}?`);
    if (ok) remove.mutate(contact.id);
  };

  const startEdit = (contact: Contact) => {
    setTenantId(contact.tenant_id);
    setEditingId(contact.id);
    scrollToFormSection('platform-tenant-contacts-form');
    setForm({
      contact_type: contact.contact_type || 'operations',
      name: contact.name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      title: contact.title || '',
      is_primary: contact.is_primary === true,
      escalation_order: contact.escalation_order || 1,
      notes: contact.notes || ''
    });
  };

  return <div style={styles.page}>
    <header style={styles.header}>
      <div>
        <h1 style={styles.title}>Tenant contacts</h1>
        <p style={styles.muted}>Store real customer contacts for billing, technical support, ownership, emergencies, and escalation. This is platform-only operational information.</p>
      </div>
      <button style={styles.secondaryButton} onClick={refreshAll} disabled={tenants.isFetching || contacts.isFetching}>{tenants.isFetching || contacts.isFetching ? 'Refreshing...' : 'Refresh'}</button>
    </header>

    <section style={styles.metadataGrid}>
      <div style={styles.metadataCard}><b>Source</b><span>GET /platform/tenant-contacts</span></div>
      <div style={styles.metadataCard}><b>Tenant filter</b><span>{selectedTenant?.name || 'All tenants'}</span></div>
      <div style={styles.metadataCard}><b>Contact type</b><span>{contactType || 'All contact types'}</span></div>
      <div style={styles.metadataCard}><b>Loaded rows</b><span>{contacts.isLoading ? 'Loading...' : rows.length}</span></div>
    </section>

    <section style={styles.panel}>
      <h2>Filters</h2>
      <div style={styles.formGrid}>
        <select style={styles.input} value={tenantId} onChange={(event) => setTenantId(event.target.value)}>
          <option value="">All tenants</option>
          {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
        </select>
        <select style={styles.input} value={contactType} onChange={(event) => setContactType(event.target.value)}>
          <option value="">All contact types</option>
          {contactTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </div>
    </section>

    {canWrite ? <section id="platform-tenant-contacts-form" style={styles.panel}>
      <h2>{editingId ? 'Edit contact' : 'Add contact'} {selectedTenant ? `for ${selectedTenant.name}` : ''}</h2>
      <div style={styles.formGrid}>
        {!tenantId ? <label style={styles.fieldLabel}>Tenant
          <select style={styles.input} value={tenantId} onChange={(event) => setTenantId(event.target.value)}>
            <option value="">Select tenant first</option>
            {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
          </select>
        </label> : null}
        <label style={styles.fieldLabel}>Contact type
          <select style={styles.input} value={form.contact_type} onChange={(event) => setForm({ ...form, contact_type: event.target.value })}>
            {contactTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label style={styles.fieldLabel}>Contact name
          <input style={styles.input} placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </label>
        <label style={styles.fieldLabel}>Title / role
          <input style={styles.input} placeholder="Title / role" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        </label>
        <label style={styles.fieldLabel}>Email
          <input style={styles.input} placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </label>
        <label style={styles.fieldLabel}>Phone
          <input style={styles.input} placeholder="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        </label>
        <label style={styles.fieldLabel}>Escalation order
          <input style={styles.input} type="number" min={1} max={99} placeholder="Escalation order" value={form.escalation_order} onChange={(event) => setForm({ ...form, escalation_order: Number(event.target.value) })} />
        </label>
        <label style={styles.checkboxLabel}><input type="checkbox" checked={form.is_primary} onChange={(event) => setForm({ ...form, is_primary: event.target.checked })} /> Primary contact</label>
      </div>
      <label style={styles.fieldLabel}>Notes
        <textarea style={styles.textarea} placeholder="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
      </label>
      <div style={styles.actions}>
        <button style={styles.button} disabled={!tenantId || !form.name.trim() || create.isPending || update.isPending} onClick={() => editingId ? update.mutate(editingId) : create.mutate()}>{editingId ? 'Save contact' : 'Add contact'}</button>
        {editingId ? <button style={styles.secondaryButton} onClick={() => { setEditingId(null); setForm(blankForm); }}>Cancel edit</button> : null}
      </div>
      {create.error ? <div style={styles.error}>{readableError(create.error)}</div> : null}
      {update.error ? <div style={styles.error}>{readableError(update.error)}</div> : null}
    </section> : null}

    {message ? <div style={styles.success}>{message}</div> : null}
    {tenants.error ? <div style={styles.error}>Tenant list failed: {readableError(tenants.error)} <button style={styles.inlineButton} onClick={() => tenants.refetch()}>Retry tenants</button></div> : null}
    {contacts.error ? <div style={styles.error}>Tenant contacts failed: {readableError(contacts.error)} <button style={styles.inlineButton} onClick={() => contacts.refetch()}>Retry contacts</button></div> : null}

    <section style={styles.summaryGrid}>
      <div style={styles.summaryCard}><b>Total contacts</b><span>{rows.length}</span></div>
      <div style={styles.summaryCard}><b>Primary contacts</b><span>{rows.filter((row) => row.is_primary).length}</span></div>
      <div style={styles.summaryCard}><b>Emergency contacts</b><span>{rows.filter((row) => row.contact_type === 'emergency').length}</span></div>
    </section>

    <section style={styles.list}>
      {rows.map((contact) => <article key={contact.id} style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h3 style={styles.cardTitle}>{contact.name} {contact.is_primary ? <span style={styles.badge}>primary</span> : null}</h3>
            <p style={styles.muted}>{contact.tenant_name || contact.tenant_id} · {contact.contact_type} · escalation #{contact.escalation_order}</p>
          </div>
          <span style={styles.badge}>{contact.title || 'contact'}</span>
        </div>
        <p style={styles.muted}>Email: {contact.email || '-'} · Phone: {contact.phone || '-'}</p>
        {contact.notes ? <p>{contact.notes}</p> : null}
        {canWrite ? <div style={styles.actions}>
          <button style={styles.secondaryButton} onClick={() => startEdit(contact)}>Edit</button>
          <button style={styles.dangerButton} onClick={() => deleteContact(contact)} disabled={remove.isPending}>Delete</button>
        </div> : null}
      </article>)}
      {!contacts.isLoading && rows.length === 0 ? <div style={styles.empty}>No tenant contacts match the current filters.</div> : null}
    </section>
  </div>;
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: 18, minWidth: 0, color: '#0f172a' },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 28, lineHeight: 1.15, letterSpacing: '-.025em', color: '#0f172a' },
  muted: { color: '#64748b', margin: '6px 0 0', lineHeight: 1.5 },
  panel: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, display: 'grid', gap: 12, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  input: { padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10, width: '100%', background: '#fff', color: '#0f172a', minWidth: 0 },
  fieldLabel: { display: 'grid', gap: 6, color: '#334155', fontSize: 13, fontWeight: 700 },
  textarea: { padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10, minHeight: 80, width: '100%', background: '#fff', color: '#0f172a' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: 8, color: '#334155' },
  actions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  button: { padding: '9px 13px', border: '1px solid var(--io-primary)', borderRadius: 9, background: 'var(--io-primary)', color: '#fff', cursor: 'pointer', width: 'fit-content', fontWeight: 700, boxShadow: '0 1px 2px rgba(15,23,42,.05)' },
  secondaryButton: { padding: '9px 13px', border: '1px solid #cbd5e1', borderRadius: 9, background: '#fff', color: '#0f172a', cursor: 'pointer', fontWeight: 700 },
  dangerButton: { padding: '9px 13px', border: '1px solid #fecaca', borderRadius: 9, background: '#fff', color: '#b91c1c', cursor: 'pointer', fontWeight: 700 },
  error: { color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 12 },
  success: { color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 12 },
  inlineButton: { marginLeft: 8, padding: '6px 10px', border: '1px solid #fecaca', borderRadius: 8, background: '#fff', color: '#b91c1c', cursor: 'pointer', fontWeight: 700 },
  metadataGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  metadataCard: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, display: 'grid', gap: 4, color: '#334155' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 },
  summaryCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, display: 'flex', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)' },
  list: { display: 'grid', gap: 12 },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  cardTitle: { margin: 0, color: '#0f172a' },
  badge: { background: 'var(--io-primary-soft)', color: 'var(--io-primary-dark)', border: '1px solid var(--io-primary-border)', padding: '4px 10px', borderRadius: 999, height: 'fit-content', fontSize: 12, fontWeight: 700 },
  empty: { background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12, padding: 18, color: '#64748b' }
};
