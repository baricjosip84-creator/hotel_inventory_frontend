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
import './PlatformTenantNotesPage.css';

type Tenant = { id: string; name: string };
type TenantNote = {
  id: string;
  tenant_id: string;
  tenant_name: string;
  category: string;
  visibility: string;
  title: string;
  body: string;
  pinned: boolean;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
  created_by_email?: string | null;
  updated_by_email?: string | null;
};
type NotesResponse = { notes: TenantNote[]; categories: string[]; visibilities: string[] };
type Feedback = { tone: 'good' | 'warn'; text: string } | null;
type EditingContext = { id: string; tenantId: string; tenantName: string } | null;

const categoriesFallback = ['general', 'support', 'billing', 'security', 'onboarding', 'risk', 'operations', 'handover'] as const;
const visibilitiesFallback = ['internal', 'support', 'leadership'] as const;
const PAGE_SIZE = 100;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const blankForm = { tenant_id: '', category: 'general', visibility: 'internal', title: '', body: '', pinned: false };

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

function isKnownCategory(value: string) {
  return categoriesFallback.includes(value as (typeof categoriesFallback)[number]);
}

export default function PlatformTenantNotesPage() {
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
  const requestedCategory = searchParams.get('category') || '';
  const requestedSearch = searchParams.get('search') || '';
  const requestedArchived = searchParams.get('include_archived');

  const tenantId = uuidPattern.test(requestedTenantId) ? requestedTenantId : '';
  const category = isKnownCategory(requestedCategory) ? requestedCategory : '';
  const search = requestedSearch.length <= 200 ? requestedSearch : '';
  const includeArchived = requestedArchived === 'true';
  const invalidTenantFilter = Boolean(requestedTenantId && !tenantId);
  const invalidCategoryFilter = Boolean(requestedCategory && !category);
  const invalidSearchFilter = requestedSearch.length > 200;
  const invalidArchivedFilter = requestedArchived !== null && requestedArchived !== 'true' && requestedArchived !== 'false';
  const invalidFilters = invalidTenantFilter || invalidCategoryFilter || invalidSearchFilter || invalidArchivedFilter;

  useEffect(() => {
    setOffset(0);
  }, [tenantId, category, search, includeArchived, invalidTenantFilter, invalidCategoryFilter, invalidSearchFilter, invalidArchivedFilter]);

  useEffect(() => {
    if (!editing) setForm((current) => ({ ...current, tenant_id: tenantId || '' }));
  }, [tenantId, editing]);

  useEffect(() => {
    if (editing && tenantId && editing.tenantId !== tenantId) {
      setEditing(null);
      setForm({ ...blankForm, tenant_id: tenantId });
    }
  }, [tenantId, editing]);

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'notes-picker'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const notes = useQuery({
    queryKey: ['platform', 'tenant-notes', tenantId, category, search, includeArchived, offset],
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (tenantId) params.set('tenant_id', tenantId);
      if (category) params.set('category', category);
      if (search.trim()) params.set('search', search.trim());
      if (includeArchived) params.set('include_archived', 'true');
      return platformApiRequest<NotesResponse>(`/platform/tenant-notes?${params.toString()}`);
    },
    enabled: !invalidFilters,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const rows = notes.data?.notes || [];
  const categories = notes.data?.categories || [...categoriesFallback];
  const visibilities = notes.data?.visibilities || [...visibilitiesFallback];
  const selectedTenant = useMemo(() => (tenants.data || []).find((tenant) => tenant.id === tenantId), [tenants.data, tenantId]);
  const selectedTenantLabel = selectedTenant?.name || (tenantId ? 'Selected tenant' : 'All tenants');
  const pageNumber = Math.floor(offset / PAGE_SIZE) + 1;
  const hasPreviousPage = offset > 0;
  const hasNextPage = rows.length === PAGE_SIZE;
  const pinnedCount = rows.filter((note) => note.pinned).length;
  const archivedCount = rows.filter((note) => Boolean(note.archived_at)).length;

  const initialNotesError = notes.isError && notes.data === undefined;
  const refreshNotesError = notes.isError && notes.data !== undefined;
  const initialTenantsError = tenants.isError && tenants.data === undefined;
  const refreshTenantsError = tenants.isError && tenants.data !== undefined;
  const refreshing = tenants.isFetching || notes.isFetching;

  const updateFilter = (key: 'tenant_id' | 'category' | 'search' | 'include_archived', value: string | boolean) => {
    const next = new URLSearchParams(searchParams);
    if (typeof value === 'boolean') {
      if (value) next.set(key, 'true');
      else next.delete(key);
    } else if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
    setFeedback(null);
  };

  const clearInvalidFilters = () => {
    const next = new URLSearchParams(searchParams);
    if (invalidTenantFilter) next.delete('tenant_id');
    if (invalidCategoryFilter) next.delete('category');
    if (invalidSearchFilter) next.delete('search');
    if (invalidArchivedFilter) next.delete('include_archived');
    setSearchParams(next, { replace: true });
  };

  const refreshAll = async () => {
    setFeedback(null);
    const work: Array<Promise<unknown>> = [tenants.refetch()];
    if (!invalidFilters) work.push(notes.refetch());
    await Promise.all(work);
  };

  const notePayload = () => ({
    category: form.category,
    visibility: form.visibility,
    title: form.title.trim(),
    body: form.body.trim(),
    pinned: form.pinned
  });

  const resetEditor = () => {
    setEditing(null);
    setForm({ ...blankForm, tenant_id: tenantId || '' });
    createNote.reset();
    updateNote.reset();
  };

  const createNote = useMutation({
    mutationFn: () => platformApiRequest<TenantNote>(`/platform/tenant-notes/tenants/${form.tenant_id}`, {
      method: 'POST',
      body: JSON.stringify(notePayload())
    }),
    onMutate: () => setFeedback(null),
    onSuccess: async () => {
      setForm((current) => ({ ...blankForm, tenant_id: current.tenant_id, category: current.category, visibility: current.visibility }));
      setFeedback({ tone: 'good', text: 'Tenant note created.' });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-notes'] });
    }
  });

  const updateNote = useMutation({
    mutationFn: (id: string) => platformApiRequest<TenantNote>(`/platform/tenant-notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(notePayload())
    }),
    onMutate: () => setFeedback(null),
    onSuccess: async () => {
      setEditing(null);
      setForm({ ...blankForm, tenant_id: tenantId || '' });
      setFeedback({ tone: 'good', text: 'Tenant note updated.' });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-notes'] });
    }
  });

  const archiveNote = useMutation({
    mutationFn: (id: string) => platformApiRequest<TenantNote>(`/platform/tenant-notes/${id}/archive`, { method: 'POST' }),
    onMutate: () => setFeedback(null),
    onSuccess: async (_data, archivedId) => {
      if (editing?.id === archivedId) resetEditor();
      setFeedback({ tone: 'good', text: 'Tenant note archived.' });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-notes'] });
    }
  });

  const restoreNote = useMutation({
    mutationFn: (id: string) => platformApiRequest<TenantNote>(`/platform/tenant-notes/${id}/restore`, { method: 'POST' }),
    onMutate: () => setFeedback(null),
    onSuccess: async () => {
      setFeedback({ tone: 'good', text: 'Tenant note restored.' });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-notes'] });
    }
  });

  const startEdit = (note: TenantNote) => {
    if (note.archived_at) return;
    setFeedback(null);
    setEditing({ id: note.id, tenantId: note.tenant_id, tenantName: note.tenant_name || note.tenant_id });
    setForm({ tenant_id: note.tenant_id, category: note.category, visibility: note.visibility, title: note.title, body: note.body, pinned: note.pinned });
    createNote.reset();
    updateNote.reset();
    scrollToFormSection('platform-tenant-notes-form');
  };

  const archiveSelectedNote = (note: TenantNote) => {
    if (window.confirm(`Archive tenant note “${note.title}”? Archived notes must be restored before they can be edited.`)) {
      archiveNote.mutate(note.id);
    }
  };

  const restoreSelectedNote = (note: TenantNote) => {
    if (window.confirm(`Restore tenant note “${note.title}”?`)) restoreNote.mutate(note.id);
  };

  const mutationError = createNote.error || updateNote.error || archiveNote.error || restoreNote.error;
  const saving = createNote.isPending || updateNote.isPending;

  return (
    <div className="io-operational-page io-workspace-page platform-tenant-notes">
      <OperationalWorkspaceHero
        iconPath="/platform/tenant-notes"
        eyebrow="Platform tenant operations"
        title="Tenant notes"
        description="Maintain internal operational memory for tenant support, onboarding, billing context, security, risk, handovers, and day-to-day Platform coordination."
        meta={(
          <>
            <OperationalWorkspaceMetaPill>Source · GET /platform/tenant-notes</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Read · TENANTS_READ</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>{canWrite ? 'Write · TENANTS_UPDATE' : 'Read-only operator'}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Page size · {PAGE_SIZE}</OperationalWorkspaceMetaPill>
          </>
        )}
        aside={(
          <div className="platform-tenant-notes__hero-aside">
            <OperationalWorkspaceStatus value={canWrite ? 'Editable' : 'Read only'} label="Tenant note registry" />
            <div className="platform-tenant-notes__refresh-block">
              <button type="button" className="app-button app-button--secondary" onClick={refreshAll} disabled={refreshing}>
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
              <span>Failed background refreshes keep the last successful page visible.</span>
            </div>
          </div>
        )}
      />

      {feedback ? <div className={`platform-tenant-notes__feedback${feedback.tone === 'warn' ? ' platform-tenant-notes__feedback--warn' : ''}`}>{feedback.text}</div> : null}
      {mutationError ? <div className="platform-tenant-notes__inline-error">Note change failed: {readableError(mutationError)}</div> : null}
      {invalidFilters ? (
        <div className="platform-tenant-notes__inline-error">
          The URL contains an invalid tenant, category, search, or archived filter. The registry is not loaded until the invalid filter is cleared.
          <button type="button" className="app-button app-button--secondary" onClick={clearInvalidFilters}>Clear invalid filter</button>
        </div>
      ) : null}
      {initialTenantsError ? <div className="platform-tenant-notes__inline-note">Tenant selector failed to load: {readableError(tenants.error)} <button type="button" className="app-button app-button--secondary" onClick={() => tenants.refetch()}>Retry tenant list</button></div> : null}
      {refreshTenantsError ? <div className="platform-tenant-notes__inline-note">Showing the last successful tenant selector snapshot. <button type="button" className="app-button app-button--secondary" onClick={() => tenants.refetch()}>Retry refresh</button></div> : null}
      {refreshNotesError ? <div className="platform-tenant-notes__inline-note">Showing the last successful tenant notes snapshot. <button type="button" className="app-button app-button--secondary" onClick={() => notes.refetch()}>Retry refresh</button></div> : null}

      <OperationalWorkspaceStats ariaLabel="Tenant notes page summary">
        <OperationalWorkspaceStatCard label="Loaded notes" value={rows.length} helper={`Current page ${pageNumber}; not an all-registry total`} iconPath="/platform/tenant-notes" loading={notes.isLoading && !notes.data} />
        <OperationalWorkspaceStatCard label="Pinned on page" value={pinnedCount} helper="Pinned records in the loaded page" tone={pinnedCount > 0 ? 'good' : 'neutral'} iconPath="/platform/tenant-notes" loading={notes.isLoading && !notes.data} />
        <OperationalWorkspaceStatCard label="Archived on page" value={archivedCount} helper={includeArchived ? 'Archived records visible in this loaded page' : 'Archived records are currently excluded'} tone={archivedCount > 0 ? 'warn' : 'neutral'} iconPath="/platform/tenant-notes" loading={notes.isLoading && !notes.data} />
        <OperationalWorkspaceStatCard label="Tenant scope" value={tenantId ? 1 : 'All'} helper={selectedTenantLabel} iconPath="/platform/tenants" loading={tenants.isLoading && !tenants.data} />
      </OperationalWorkspaceStats>

      <section className="io-workspace-card platform-tenant-notes__section">
        <OperationalSectionHeader
          iconPath="/platform/tenant-notes"
          title="Registry filters"
          description="Filters are reflected in the URL so tenant-scoped operational memory can be shared or reopened safely."
          actions={<span className="platform-tenant-notes__muted">{selectedTenantLabel} · {category ? humanize(category) : 'All categories'}</span>}
        />
        <div className="platform-tenant-notes__form-grid platform-tenant-notes__form-grid--filters">
          <label>Tenant
            <select value={tenantId} onChange={(event) => updateFilter('tenant_id', event.target.value)} disabled={Boolean(initialTenantsError)}>
              <option value="">All tenants</option>
              {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </label>
          <label>Category
            <select value={category} onChange={(event) => updateFilter('category', event.target.value)}>
              <option value="">All categories</option>
              {categories.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
            </select>
          </label>
          <label>Search
            <input maxLength={200} value={search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Title, note body, or tenant" />
          </label>
          <label className="platform-tenant-notes__checkbox">
            <input type="checkbox" checked={includeArchived} onChange={(event) => updateFilter('include_archived', event.target.checked)} /> Include archived
          </label>
        </div>
      </section>

      {canWrite ? (
        <section id="platform-tenant-notes-form" className="io-workspace-card platform-tenant-notes__section">
          <OperationalSectionHeader
            iconPath="/platform/tenant-notes"
            title={editing ? 'Edit tenant note' : 'Add tenant note'}
            description={editing
              ? `Editing ${editing.tenantName}. Archived notes are intentionally immutable until restored.`
              : 'Create operational memory for a tenant. Visibility is an operator-maintained audience tag; it does not create a separate technical access-control boundary.'}
          />
          {!editing && !form.tenant_id ? <div className="platform-tenant-notes__inline-note">Select a tenant before creating a note.</div> : null}
          <div className="platform-tenant-notes__form-grid">
            <label>Tenant
              <select value={form.tenant_id} disabled={Boolean(editing) || saving || Boolean(initialTenantsError)} onChange={(event) => setForm({ ...form, tenant_id: event.target.value })}>
                <option value="">Choose tenant</option>
                {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
              </select>
            </label>
            <label>Category
              <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} disabled={saving}>
                {categories.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
              </select>
            </label>
            <label>Visibility tag
              <select value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value })} disabled={saving}>
                {visibilities.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
              </select>
            </label>
            <label className="platform-tenant-notes__title-field">Title
              <input maxLength={220} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Short operational subject" disabled={saving} />
            </label>
            <label className="platform-tenant-notes__checkbox"><input type="checkbox" checked={form.pinned} onChange={(event) => setForm({ ...form, pinned: event.target.checked })} disabled={saving} /> Pin note</label>
          </div>
          <label className="platform-tenant-notes__notes-label">Note
            <textarea maxLength={10000} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="Operational context, handover details, risk, support history, or follow-up memory…" disabled={saving} />
          </label>
          <div className="platform-tenant-notes__inline-note">Visibility is descriptive metadata only. Access to this page and its note content is governed by TENANTS_READ / TENANTS_UPDATE.</div>
          <div className="platform-tenant-notes__action-row">
            <button type="button" className="app-button app-button--primary" disabled={!form.tenant_id || !form.title.trim() || !form.body.trim() || saving} onClick={() => editing ? updateNote.mutate(editing.id) : createNote.mutate()}>
              {saving ? 'Saving…' : editing ? 'Save note' : 'Add note'}
            </button>
            {editing ? <button type="button" className="app-button app-button--secondary" onClick={resetEditor} disabled={saving}>Cancel edit</button> : null}
          </div>
        </section>
      ) : null}

      <section className="io-workspace-card platform-tenant-notes__section">
        <OperationalSectionHeader
          iconPath="/platform/tenant-notes"
          title="Tenant note registry"
          description="Pinned notes are ordered first. Within that, the API uses stable updated/created/id ordering and bounded pagination."
          actions={(
            <div className="platform-tenant-notes__pagination">
              <button type="button" className="app-button app-button--secondary" disabled={!hasPreviousPage || notes.isFetching} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Previous</button>
              <span>Page {pageNumber}</span>
              <button type="button" className="app-button app-button--secondary" disabled={!hasNextPage || notes.isFetching} onClick={() => setOffset(offset + PAGE_SIZE)}>Next</button>
            </div>
          )}
        />

        {initialNotesError ? (
          <div className="platform-tenant-notes__blocking-error">
            <strong>Tenant notes could not be loaded.</strong>
            <span>{readableError(notes.error)}</span>
            <button type="button" className="app-button app-button--secondary" onClick={() => notes.refetch()}>Retry</button>
          </div>
        ) : null}
        {notes.isLoading && !notes.data ? <div className="platform-tenant-notes__loading">Loading tenant notes…</div> : null}
        {!initialNotesError && !notes.isLoading && rows.length === 0 ? (
          <div className="platform-tenant-notes__empty">
            <strong>No tenant note records match this view.</strong>
            <span>This means the application returned no matching stored note rows for these filters. It does not prove no tenant context or external operational knowledge exists elsewhere.</span>
          </div>
        ) : null}

        {rows.length ? (
          <div className="platform-tenant-notes__list">
            {rows.map((note) => (
              <article key={note.id} className="platform-tenant-notes__card" data-archived={note.archived_at ? 'true' : 'false'}>
                <div className="platform-tenant-notes__card-header">
                  <div className="platform-tenant-notes__card-title">
                    <h4>{note.pinned ? 'Pinned · ' : ''}{note.title}</h4>
                    <div className="platform-tenant-notes__badge-row">
                      <span className="platform-tenant-notes__badge" data-tone="platform">{humanize(note.category)}</span>
                      <span className="platform-tenant-notes__badge">Visibility tag · {humanize(note.visibility)}</span>
                      {note.pinned ? <span className="platform-tenant-notes__badge" data-tone="good">Pinned</span> : null}
                      {note.archived_at ? <span className="platform-tenant-notes__badge" data-tone="warn">Archived</span> : <span className="platform-tenant-notes__badge" data-tone="good">Active</span>}
                    </div>
                  </div>
                  <div className="platform-tenant-notes__tenant-label">
                    <strong>{note.tenant_name || note.tenant_id}</strong>
                    <span>{note.tenant_id}</span>
                  </div>
                </div>

                <p className="platform-tenant-notes__notes">{note.body}</p>

                <div className="platform-tenant-notes__provenance">
                  <span>Created {dateTime(note.created_at)} by {note.created_by_email || 'unknown platform operator'}</span>
                  <span>Updated {dateTime(note.updated_at)} by {note.updated_by_email || 'unknown platform operator'}</span>
                  {note.archived_at ? <span>Archived {dateTime(note.archived_at)}</span> : null}
                </div>

                <div className="platform-tenant-notes__action-row">
                  {canWrite && !note.archived_at ? <button type="button" className="app-button app-button--secondary" onClick={() => startEdit(note)} disabled={saving}>Edit</button> : null}
                  {canWrite && !note.archived_at ? <button type="button" className="app-button app-button--secondary" onClick={() => archiveSelectedNote(note)} disabled={archiveNote.isPending}>Archive</button> : null}
                  {canWrite && note.archived_at ? <button type="button" className="app-button app-button--secondary" onClick={() => restoreSelectedNote(note)} disabled={restoreNote.isPending}>Restore</button> : null}
                  <Link className="app-button app-button--secondary" to={`/platform/tenants?tenant_id=${encodeURIComponent(note.tenant_id)}`}>Tenant record</Link>
                  <Link className="app-button app-button--secondary" to={`/platform/tenant-contacts?tenant_id=${encodeURIComponent(note.tenant_id)}`}>Tenant contacts</Link>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="io-workspace-card platform-tenant-notes__section">
        <OperationalSectionHeader
          iconPath="/platform/tenants"
          title="Supporting Platform surfaces"
          description="Use tenant notes as operational memory, then move to the underlying tenant, contact, support, customer-success, or billing evidence surface when action is required."
        />
        <div className="platform-tenant-notes__link-row">
          <Link to={tenantId ? `/platform/tenants?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenants'}>Tenants</Link>
          <Link to={tenantId ? `/platform/tenant-contacts?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenant-contacts'}>Tenant contacts</Link>
          <Link to="/platform/customer-success-admin">Customer Success</Link>
          {canOpenSupportCockpit ? <Link to={tenantId ? `/platform/support-operations-cockpit?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/support-operations-cockpit'}>Support Operations</Link> : null}
          {canReadBilling ? <Link to={tenantId ? `/platform/billing?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/billing'}>Billing</Link> : null}
        </div>
      </section>
    </div>
  );
}
