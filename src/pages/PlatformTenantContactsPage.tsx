import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
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
  const [tenantId, setTenantId] = useState('');
  const [contactType, setContactType] = useState('');
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const rows = contacts.data || [];
  const selectedTenant = useMemo(() => (tenants.data || []).find((tenant) => tenant.id === tenantId), [tenants.data, tenantId]);

  const create = useMutation({
    mutationFn: () => platformApiRequest<Contact>(`/platform/tenant-contacts/tenants/${tenantId}`, {
      method: 'POST',
      body: JSON.stringify(form)
    }),
    onSuccess: async () => {
      setForm(blankForm);
      await qc.invalidateQueries({ queryKey: ['platform', 'tenant-contacts'] });
    }
  });

  const update = useMutation({
    mutationFn: (id: string) => platformApiRequest<Contact>(`/platform/tenant-contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(form)
    }),
    onSuccess: async () => {
      setEditingId(null);
      setForm(blankForm);
      await qc.invalidateQueries({ queryKey: ['platform', 'tenant-contacts'] });
    }
  });

  const remove = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/tenant-contacts/${id}`, { method: 'DELETE' }),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ['platform', 'tenant-contacts'] })
  });

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
    <header>
      <h1 style={styles.title}>Tenant contacts</h1>
      <p style={styles.muted}>Store real customer contacts for billing, technical support, ownership, emergencies, and escalation. This is platform-only operational information.</p>
    </header>

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
        <button style={styles.button} disabled={!tenantId || !form.name || create.isPending || update.isPending} onClick={() => editingId ? update.mutate(editingId) : create.mutate()}>{editingId ? 'Save contact' : 'Add contact'}</button>
        {editingId ? <button style={styles.secondaryButton} onClick={() => { setEditingId(null); setForm(blankForm); }}>Cancel edit</button> : null}
      </div>
      {create.error ? <div style={styles.error}>{readableError(create.error)}</div> : null}
      {update.error ? <div style={styles.error}>{readableError(update.error)}</div> : null}
    </section> : null}

    {contacts.error ? <div style={styles.error}>{readableError(contacts.error)}</div> : null}

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
          <button style={styles.dangerButton} onClick={() => remove.mutate(contact.id)} disabled={remove.isPending}>Delete</button>
        </div> : null}
      </article>)}
      {!contacts.isLoading && rows.length === 0 ? <div style={styles.empty}>No tenant contacts match the current filters.</div> : null}
    </section>
  </div>;
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: '20px' },
  title: { margin: 0, fontSize: '28px' },
  muted: { color: '#6b7280', margin: '4px 0' },
  panel: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '18px', display: 'grid', gap: '12px' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' },
  input: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '10px', width: '100%' },
  fieldLabel: { display: 'grid', gap: '6px', color: '#374151', fontSize: '13px', fontWeight: 700 },
  textarea: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '10px', minHeight: '80px', width: '100%' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px' },
  actions: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  button: { padding: '10px 14px', border: 0, borderRadius: '10px', background: '#111827', color: '#fff', cursor: 'pointer', width: 'fit-content' },
  secondaryButton: { padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '10px', background: '#fff', color: '#111827', cursor: 'pointer' },
  dangerButton: { padding: '10px 14px', border: 0, borderRadius: '10px', background: '#991b1b', color: '#fff', cursor: 'pointer' },
  error: { color: '#991b1b', background: '#fee2e2', borderRadius: '10px', padding: '10px' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' },
  summaryCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between' },
  list: { display: 'grid', gap: '12px' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '16px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', gap: '12px' },
  cardTitle: { margin: 0 },
  badge: { background: '#eef2ff', color: '#3730a3', padding: '4px 10px', borderRadius: '999px', height: 'fit-content' },
  empty: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '18px' }
};
