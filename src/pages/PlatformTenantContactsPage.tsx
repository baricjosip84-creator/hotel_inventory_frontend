import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';
import { scrollToFormSection } from '../lib/scrollToForm';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './PlatformTenantContactsPage.css';

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
  created_at?: string;
  updated_at?: string;
  created_by_name?: string | null;
  created_by_email?: string | null;
};

type Feedback = { tone: 'good' | 'warn'; text: string } | null;
type EditingContext = { id: string; tenantId: string; tenantName: string } | null;

const contactTypes = [
  'operations',
  'billing',
  'technical',
  'owner',
  'emergency',
  'procurement',
  'security',
  'legal',
  'other'
] as const;
const PAGE_SIZE = 100;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function readableError(error: unknown): string {
  return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error';
}

function humanize(value: string | null | undefined) {
  const text = String(value || '').trim().replaceAll('_', ' ');
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Not set';
}

function dateTime(value: string | null | undefined) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString();
}

function isKnownContactType(value: string): value is (typeof contactTypes)[number] {
  return contactTypes.includes(value as (typeof contactTypes)[number]);
}

export default function PlatformTenantContactsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [offset, setOffset] = useState(0);
  const [form, setForm] = useState(blankForm);
  const [editing, setEditing] = useState<EditingContext>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_UPDATE);
  const canReadBilling = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ);
  const canOpenSupportCockpit = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
    && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ)
    && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
    && hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ);

  const requestedTenantId = searchParams.get('tenant_id') || '';
  const requestedContactType = searchParams.get('contact_type') || '';
  const tenantId = uuidPattern.test(requestedTenantId) ? requestedTenantId : '';
  const contactType = isKnownContactType(requestedContactType) ? requestedContactType : '';
  const invalidTenantFilter = Boolean(requestedTenantId && !tenantId);
  const invalidContactTypeFilter = Boolean(requestedContactType && !contactType);
  const invalidFilters = invalidTenantFilter || invalidContactTypeFilter;

  useEffect(() => {
    setOffset(0);
  }, [tenantId, contactType, invalidTenantFilter, invalidContactTypeFilter]);

  useEffect(() => {
    if (editing && tenantId !== editing.tenantId) {
      setEditing(null);
      setForm(blankForm);
    }
  }, [tenantId, editing]);

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'for-contacts'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const contacts = useQuery({
    queryKey: ['platform', 'tenant-contacts', tenantId, contactType, offset],
    queryFn: () => {
      const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (tenantId) query.set('tenant_id', tenantId);
      if (contactType) query.set('contact_type', contactType);
      return platformApiRequest<Contact[]>(`/platform/tenant-contacts?${query.toString()}`);
    },
    enabled: !invalidFilters,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const rows = contacts.data || [];
  const selectedTenant = useMemo(
    () => (tenants.data || []).find((tenant) => tenant.id === tenantId),
    [tenants.data, tenantId]
  );
  const directChannelCount = rows.filter((contact) => Boolean(contact.email || contact.phone)).length;
  const pageNumber = Math.floor(offset / PAGE_SIZE) + 1;
  const hasPreviousPage = offset > 0;
  const hasNextPage = rows.length === PAGE_SIZE;

  const initialContactsError = contacts.isError && contacts.data === undefined;
  const refreshContactsError = contacts.isError && contacts.data !== undefined;
  const initialTenantsError = tenants.isError && tenants.data === undefined;
  const refreshTenantsError = tenants.isError && tenants.data !== undefined;
  const refreshing = contacts.isFetching || tenants.isFetching;

  const updateFilter = (key: 'tenant_id' | 'contact_type', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
    setFeedback(null);
  };

  const clearInvalidFilters = () => {
    const next = new URLSearchParams(searchParams);
    if (invalidTenantFilter) next.delete('tenant_id');
    if (invalidContactTypeFilter) next.delete('contact_type');
    setSearchParams(next, { replace: true });
  };

  const refreshAll = async () => {
    setFeedback(null);
    const work: Array<Promise<unknown>> = [tenants.refetch()];
    if (!invalidFilters) work.push(contacts.refetch());
    await Promise.all(work);
  };

  const contactPayload = () => ({
    ...form,
    name: form.name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    title: form.title.trim(),
    notes: form.notes.trim()
  });

  const resetEditor = () => {
    setEditing(null);
    setForm(blankForm);
    create.reset();
    update.reset();
  };

  const create = useMutation({
    mutationFn: () => platformApiRequest<Contact>(`/platform/tenant-contacts/tenants/${tenantId}`, {
      method: 'POST',
      body: JSON.stringify(contactPayload())
    }),
    onMutate: () => setFeedback(null),
    onSuccess: async () => {
      setForm(blankForm);
      setFeedback({ tone: 'good', text: 'Tenant contact created.' });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-contacts'] });
    }
  });

  const update = useMutation({
    mutationFn: (id: string) => platformApiRequest<Contact>(`/platform/tenant-contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(contactPayload())
    }),
    onMutate: () => setFeedback(null),
    onSuccess: async () => {
      setEditing(null);
      setForm(blankForm);
      setFeedback({ tone: 'good', text: 'Tenant contact updated.' });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-contacts'] });
    }
  });

  const remove = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/tenant-contacts/${id}`, { method: 'DELETE' }),
    onMutate: () => setFeedback(null),
    onSuccess: async (_data, deletedId) => {
      if (editing?.id === deletedId) {
        setEditing(null);
        setForm(blankForm);
      }
      setFeedback({ tone: 'good', text: 'Tenant contact deleted.' });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-contacts'] });
    }
  });

  const deleteContact = (contact: Contact) => {
    if (window.confirm(`Delete tenant contact ${contact.name}? This removes the platform contact record.`)) {
      remove.mutate(contact.id);
    }
  };

  const startEdit = (contact: Contact) => {
    updateFilter('tenant_id', contact.tenant_id);
    setEditing({ id: contact.id, tenantId: contact.tenant_id, tenantName: contact.tenant_name || contact.tenant_id });
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
    create.reset();
    update.reset();
    scrollToFormSection('platform-tenant-contacts-form');
  };

  const mutationError = create.error || update.error || remove.error;
  const selectedTenantLabel = selectedTenant?.name || (tenantId ? 'Selected tenant' : 'All tenants');

  return (
    <div className="platform-tenant-contacts">
      <OperationalWorkspaceHero
        iconPath="/platform/tenant-contacts"
        eyebrow="Platform tenant operations"
        title="Tenant contacts"
        description="Maintain the customer-side people Platform operations may need for day-to-day coordination, billing, technical support, ownership, emergencies, procurement, security, legal review, and escalation."
        meta={(
          <>
            <OperationalWorkspaceMetaPill>Source · GET /platform/tenant-contacts</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Read · TENANTS_READ</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>{canWrite ? 'Write · TENANTS_UPDATE' : 'Read-only operator'}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Page size · {PAGE_SIZE}</OperationalWorkspaceMetaPill>
          </>
        )}
        aside={(
          <div className="platform-tenant-contacts__hero-aside">
            <OperationalWorkspaceStatus value={canWrite ? 'Editable' : 'Read only'} label="Tenant contact registry" />
            <div className="platform-tenant-contacts__refresh-block">
              <button type="button" className="app-button app-button--secondary" onClick={refreshAll} disabled={refreshing}>
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
              <span>Failed background refreshes keep the last successful page visible.</span>
            </div>
          </div>
        )}
      />

      {feedback ? <div className={`platform-tenant-contacts__feedback${feedback.tone === 'warn' ? ' platform-tenant-contacts__feedback--warn' : ''}`}>{feedback.text}</div> : null}
      {mutationError ? <div className="platform-tenant-contacts__inline-error">Contact change failed: {readableError(mutationError)}</div> : null}
      {invalidFilters ? (
        <div className="platform-tenant-contacts__inline-error">
          The URL contains an invalid {invalidTenantFilter && invalidContactTypeFilter ? 'tenant and contact-type filter' : invalidTenantFilter ? 'tenant filter' : 'contact-type filter'}. The registry is not loaded until the invalid filter is cleared.
          <button type="button" className="app-button app-button--secondary" onClick={clearInvalidFilters}>Clear invalid filter</button>
        </div>
      ) : null}
      {initialTenantsError ? (
        <div className="platform-tenant-contacts__inline-note">Tenant selector failed to load: {readableError(tenants.error)} <button type="button" className="app-button app-button--secondary" onClick={() => tenants.refetch()}>Retry tenant list</button></div>
      ) : null}
      {refreshTenantsError ? <div className="platform-tenant-contacts__inline-note">Showing the last successful tenant selector snapshot. <button type="button" className="app-button app-button--secondary" onClick={() => tenants.refetch()}>Retry refresh</button></div> : null}
      {refreshContactsError ? <div className="platform-tenant-contacts__inline-note">Showing the last successful tenant contacts snapshot. <button type="button" className="app-button app-button--secondary" onClick={() => contacts.refetch()}>Retry refresh</button></div> : null}

      <OperationalWorkspaceStats ariaLabel="Tenant contact page summary">
        <OperationalWorkspaceStatCard label="Loaded contacts" value={rows.length} helper={`Current page ${pageNumber}; not an all-registry total`} iconPath="/platform/tenant-contacts" loading={contacts.isLoading && !contacts.data} />
        <OperationalWorkspaceStatCard label="Primary on page" value={rows.filter((row) => row.is_primary).length} helper="Primary-marked records in the loaded page" tone="good" iconPath="/platform/tenant-health" loading={contacts.isLoading && !contacts.data} />
        <OperationalWorkspaceStatCard label="Emergency on page" value={rows.filter((row) => row.contact_type === 'emergency').length} helper="Emergency-classified records in the loaded page" tone="warn" iconPath="/platform/incidents" loading={contacts.isLoading && !contacts.data} />
        <OperationalWorkspaceStatCard label="Direct channel" value={directChannelCount} helper="Loaded contacts with an email or phone number" tone={rows.length > 0 && directChannelCount < rows.length ? 'warn' : 'good'} iconPath="/platform/tenant-communications" loading={contacts.isLoading && !contacts.data} />
      </OperationalWorkspaceStats>

      <section className="io-workspace-card platform-tenant-contacts__section">
        <OperationalSectionHeader
          iconPath="/platform/tenant-contacts"
          title="Registry filters"
          description="Filters are reflected in the URL so a tenant-scoped contact view can be shared or reopened safely."
          actions={<span className="platform-tenant-contacts__muted">{selectedTenantLabel} · {contactType ? humanize(contactType) : 'All contact types'}</span>}
        />
        <div className="platform-tenant-contacts__form-grid platform-tenant-contacts__form-grid--filters">
          <label>Tenant
            <select value={tenantId} onChange={(event) => updateFilter('tenant_id', event.target.value)} disabled={Boolean(initialTenantsError)}>
              <option value="">All tenants</option>
              {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </label>
          <label>Contact type
            <select value={contactType} onChange={(event) => updateFilter('contact_type', event.target.value)}>
              <option value="">All contact types</option>
              {contactTypes.map((type) => <option key={type} value={type}>{humanize(type)}</option>)}
            </select>
          </label>
        </div>
      </section>

      {canWrite ? (
        <section id="platform-tenant-contacts-form" className="io-workspace-card platform-tenant-contacts__section">
          <OperationalSectionHeader
            iconPath="/platform/tenant-contacts"
            title={editing ? 'Edit tenant contact' : 'Add tenant contact'}
            description={editing
              ? `Editing ${editing.tenantName}. Tenant assignment itself is not changed by this form.`
              : 'Create an operational customer contact. Email and phone remain optional, but records without either are clearly identified as having no direct channel.'}
          />
          {!tenantId ? <div className="platform-tenant-contacts__inline-note">Select a tenant in the filter above before creating a contact.</div> : null}
          <div className="platform-tenant-contacts__form-grid">
            <label>Contact type
              <select value={form.contact_type} onChange={(event) => setForm({ ...form, contact_type: event.target.value })} disabled={create.isPending || update.isPending}>
                {contactTypes.map((type) => <option key={type} value={type}>{humanize(type)}</option>)}
              </select>
            </label>
            <label>Contact name
              <input maxLength={180} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Full name" disabled={create.isPending || update.isPending} />
            </label>
            <label>Title / role
              <input maxLength={180} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Role or responsibility" disabled={create.isPending || update.isPending} />
            </label>
            <label>Email
              <input type="email" maxLength={254} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@example.com" disabled={create.isPending || update.isPending} />
            </label>
            <label>Phone
              <input type="tel" maxLength={80} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Phone number" disabled={create.isPending || update.isPending} />
            </label>
            <label>Escalation order
              <input type="number" min={1} max={99} value={form.escalation_order} onChange={(event) => setForm({ ...form, escalation_order: Number(event.target.value) })} disabled={create.isPending || update.isPending} />
            </label>
            <label className="platform-tenant-contacts__checkbox"><input type="checkbox" checked={form.is_primary} onChange={(event) => setForm({ ...form, is_primary: event.target.checked })} disabled={create.isPending || update.isPending} /> Primary contact</label>
          </div>
          <label className="platform-tenant-contacts__notes-label">Notes
            <textarea maxLength={2000} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Operational context, preferred contact window, escalation notes…" disabled={create.isPending || update.isPending} />
          </label>
          <div className="platform-tenant-contacts__action-row">
            <button
              type="button"
              className="app-button app-button--primary"
              disabled={!tenantId || !form.name.trim() || create.isPending || update.isPending}
              onClick={() => editing ? update.mutate(editing.id) : create.mutate()}
            >
              {create.isPending || update.isPending ? 'Saving…' : editing ? 'Save contact' : 'Add contact'}
            </button>
            {editing ? <button type="button" className="app-button app-button--secondary" onClick={resetEditor} disabled={update.isPending}>Cancel edit</button> : null}
          </div>
        </section>
      ) : null}

      <section className="io-workspace-card platform-tenant-contacts__section">
        <OperationalSectionHeader
          iconPath="/platform/tenant-contacts"
          title="Contact registry"
          description="Each row is an application contact record. Primary status and escalation order are operator-maintained metadata; they do not prove a person has been contacted or acknowledged an escalation role."
          actions={(
            <div className="platform-tenant-contacts__pagination">
              <button type="button" className="app-button app-button--secondary" onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))} disabled={!hasPreviousPage || contacts.isFetching}>Previous</button>
              <span>Page {pageNumber}</span>
              <button type="button" className="app-button app-button--secondary" onClick={() => setOffset((current) => current + PAGE_SIZE)} disabled={!hasNextPage || contacts.isFetching}>Next</button>
            </div>
          )}
        />

        {initialContactsError ? (
          <div className="platform-tenant-contacts__blocking-error">
            <strong>Tenant contacts could not be loaded.</strong>
            <span>{readableError(contacts.error)}</span>
            <button type="button" className="app-button app-button--secondary" onClick={() => contacts.refetch()}>Retry</button>
          </div>
        ) : null}
        {contacts.isLoading && !contacts.data && !invalidFilters ? <div className="platform-tenant-contacts__loading">Loading tenant contacts…</div> : null}
        {!initialContactsError && !invalidFilters ? (
          <div className="platform-tenant-contacts__list">
            {rows.map((contact) => {
              const hasDirectChannel = Boolean(contact.email || contact.phone);
              return (
                <article key={contact.id} className="platform-tenant-contacts__card">
                  <div className="platform-tenant-contacts__card-header">
                    <div className="platform-tenant-contacts__card-title">
                      <div className="platform-tenant-contacts__badge-row">
                        <span className="platform-tenant-contacts__badge" data-tone="platform">{humanize(contact.contact_type)}</span>
                        {contact.is_primary ? <span className="platform-tenant-contacts__badge" data-tone="good">Primary</span> : null}
                        {!hasDirectChannel ? <span className="platform-tenant-contacts__badge" data-tone="warn">No direct channel</span> : null}
                      </div>
                      <h4>{contact.name}</h4>
                      <span>{contact.title || 'Role not recorded'} · escalation #{contact.escalation_order}</span>
                    </div>
                    <div className="platform-tenant-contacts__tenant-label">
                      <strong>{contact.tenant_name || contact.tenant_id}</strong>
                      <span>Updated {dateTime(contact.updated_at)}</span>
                    </div>
                  </div>

                  <div className="platform-tenant-contacts__channel-row">
                    {contact.email ? <a href={`mailto:${contact.email}`}>Email · {contact.email}</a> : <span>Email not recorded</span>}
                    {contact.phone ? <a href={`tel:${contact.phone}`}>Call · {contact.phone}</a> : <span>Phone not recorded</span>}
                  </div>
                  {contact.notes ? <p className="platform-tenant-contacts__notes">{contact.notes}</p> : <p className="platform-tenant-contacts__notes platform-tenant-contacts__muted">No operational notes.</p>}
                  <div className="platform-tenant-contacts__provenance">
                    <span>Recorded {dateTime(contact.created_at)}</span>
                    <span>Recorded by {contact.created_by_name || contact.created_by_email || 'Not recorded'}</span>
                  </div>
                  {canWrite ? (
                    <div className="platform-tenant-contacts__action-row">
                      <button type="button" className="app-button app-button--secondary" onClick={() => startEdit(contact)} disabled={remove.isPending}>Edit</button>
                      <button type="button" className="app-button app-button--danger" onClick={() => deleteContact(contact)} disabled={remove.isPending}>{remove.isPending ? 'Deleting…' : 'Delete'}</button>
                    </div>
                  ) : null}
                </article>
              );
            })}
            {!contacts.isLoading && rows.length === 0 ? (
              <div className="platform-tenant-contacts__empty">
                <strong>No tenant contacts match the current filters.</strong>
                <span>This means the application returned zero stored contact rows for this filter; it does not prove no contact exists outside the application.</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="io-workspace-card platform-tenant-contacts__section">
        <OperationalSectionHeader
          iconPath="/platform/tenant-timeline"
          title="Supporting tenant operations"
          description="Open related Platform workspaces. Tenant context is carried forward when a tenant is selected."
        />
        <div className="platform-tenant-contacts__link-row">
          <Link to={tenantId ? `/platform/tenants?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenants'}>Tenants</Link>
          <Link to={tenantId ? `/platform/customer-success-admin?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/customer-success-admin'}>Customer success</Link>
          <Link to={tenantId ? `/platform/tenant-communications?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenant-communications'}>Communications</Link>
          {canOpenSupportCockpit ? <Link to={tenantId ? `/platform/support-operations-cockpit?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/support-operations-cockpit'}>Support operations</Link> : null}
          {canReadBilling && tenantId ? <Link to={`/platform/billing?tenant_id=${encodeURIComponent(tenantId)}`}>Billing</Link> : null}
        </div>
      </section>
    </div>
  );
}
