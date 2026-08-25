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
import './PlatformTenantCommunicationsPage.css';

type Tenant = { id: string; name: string };
type Communication = {
  id: string;
  tenant_id: string;
  tenant_name: string;
  channel: string;
  direction: string;
  subject: string;
  summary: string;
  external_reference?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  occurred_at: string;
  follow_up_required: boolean;
  follow_up_due_at?: string | null;
  resolved_at?: string | null;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
  created_by_email?: string | null;
  updated_by_email?: string | null;
  resolved_by_email?: string | null;
};
type CommunicationsResponse = {
  communications: Communication[];
  summary: { total: number; open_followups: number; archived: number; by_channel: Record<string, number> };
  channels: string[];
  directions: string[];
  pagination: { limit: number; offset: number; has_more: boolean };
};
type Feedback = { tone: 'good' | 'warn'; text: string } | null;
type EditingContext = { id: string; tenantId: string; tenantName: string; openFollowUp: boolean } | null;

const channelsFallback = ['email', 'phone', 'meeting', 'chat', 'ticket', 'onsite', 'other'] as const;
const directionsFallback = ['inbound', 'outbound', 'internal'] as const;
const PAGE_SIZE = 100;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const blankForm = {
  tenant_id: '',
  channel: 'email',
  direction: 'outbound',
  subject: '',
  summary: '',
  external_reference: '',
  contact_name: '',
  contact_email: '',
  occurred_at: '',
  follow_up_required: false,
  follow_up_due_at: ''
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

function toLocalDateTimeInput(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function localInputToIso(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isKnownChannel(value: string): value is (typeof channelsFallback)[number] {
  return channelsFallback.includes(value as (typeof channelsFallback)[number]);
}

function isKnownDirection(value: string): value is (typeof directionsFallback)[number] {
  return directionsFallback.includes(value as (typeof directionsFallback)[number]);
}

export default function PlatformTenantCommunicationsPage() {
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
  const requestedChannel = searchParams.get('channel') || '';
  const requestedDirection = searchParams.get('direction') || '';
  const requestedFollowUp = searchParams.get('follow_up');
  const requestedSearch = searchParams.get('search') || '';
  const requestedArchived = searchParams.get('include_archived');

  const tenantId = uuidPattern.test(requestedTenantId) ? requestedTenantId : '';
  const channel = isKnownChannel(requestedChannel) ? requestedChannel : '';
  const direction = isKnownDirection(requestedDirection) ? requestedDirection : '';
  const followUp = requestedFollowUp === 'true' || requestedFollowUp === 'false' ? requestedFollowUp : '';
  const search = requestedSearch.length <= 200 ? requestedSearch : '';
  const includeArchived = requestedArchived === 'true';

  const invalidTenantFilter = Boolean(requestedTenantId && !tenantId);
  const invalidChannelFilter = Boolean(requestedChannel && !channel);
  const invalidDirectionFilter = Boolean(requestedDirection && !direction);
  const invalidFollowUpFilter = requestedFollowUp !== null && !followUp;
  const invalidSearchFilter = requestedSearch.length > 200;
  const invalidArchivedFilter = requestedArchived !== null && requestedArchived !== 'true' && requestedArchived !== 'false';
  const invalidFilters = invalidTenantFilter || invalidChannelFilter || invalidDirectionFilter || invalidFollowUpFilter || invalidSearchFilter || invalidArchivedFilter;

  useEffect(() => {
    setOffset(0);
  }, [tenantId, channel, direction, followUp, search, includeArchived, invalidTenantFilter, invalidChannelFilter, invalidDirectionFilter, invalidFollowUpFilter, invalidSearchFilter, invalidArchivedFilter]);

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
    queryKey: ['platform', 'tenants', 'communications-picker'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const communications = useQuery({
    queryKey: ['platform', 'tenant-communications', tenantId, channel, direction, followUp, search, includeArchived, offset],
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (tenantId) params.set('tenant_id', tenantId);
      if (channel) params.set('channel', channel);
      if (direction) params.set('direction', direction);
      if (followUp) params.set('follow_up', followUp);
      if (search.trim()) params.set('search', search.trim());
      if (includeArchived) params.set('include_archived', 'true');
      return platformApiRequest<CommunicationsResponse>(`/platform/tenant-communications?${params.toString()}`);
    },
    enabled: !invalidFilters,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const rows = communications.data?.communications || [];
  const channels = communications.data?.channels || [...channelsFallback];
  const directions = communications.data?.directions || [...directionsFallback];
  const selectedTenant = useMemo(() => (tenants.data || []).find((tenant) => tenant.id === tenantId), [tenants.data, tenantId]);
  const selectedTenantLabel = selectedTenant?.name || (tenantId ? 'Selected tenant' : 'All tenants');
  const pageNumber = Math.floor(offset / PAGE_SIZE) + 1;
  const hasPreviousPage = offset > 0;
  const hasNextPage = communications.data?.pagination?.has_more === true;
  const openFollowUps = rows.filter((item) => item.follow_up_required && !item.resolved_at).length;
  const archivedOnPage = rows.filter((item) => Boolean(item.archived_at)).length;
  const customerFacingOnPage = rows.filter((item) => item.direction === 'inbound' || item.direction === 'outbound').length;

  const initialCommunicationsError = communications.isError && communications.data === undefined;
  const refreshCommunicationsError = communications.isError && communications.data !== undefined;
  const initialTenantsError = tenants.isError && tenants.data === undefined;
  const refreshTenantsError = tenants.isError && tenants.data !== undefined;
  const refreshing = communications.isFetching || tenants.isFetching;

  const updateFilter = (key: 'tenant_id' | 'channel' | 'direction' | 'follow_up' | 'search' | 'include_archived', value: string | boolean) => {
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
    if (invalidChannelFilter) next.delete('channel');
    if (invalidDirectionFilter) next.delete('direction');
    if (invalidFollowUpFilter) next.delete('follow_up');
    if (invalidSearchFilter) next.delete('search');
    if (invalidArchivedFilter) next.delete('include_archived');
    setSearchParams(next, { replace: true });
  };

  const refreshAll = async () => {
    setFeedback(null);
    const work: Array<Promise<unknown>> = [tenants.refetch()];
    if (!invalidFilters) work.push(communications.refetch());
    await Promise.all(work);
  };

  const communicationPayload = () => ({
    channel: form.channel,
    direction: form.direction,
    subject: form.subject.trim(),
    summary: form.summary.trim(),
    external_reference: form.external_reference.trim() || '',
    contact_name: form.contact_name.trim() || '',
    contact_email: form.contact_email.trim() || '',
    occurred_at: localInputToIso(form.occurred_at),
    follow_up_required: form.follow_up_required,
    follow_up_due_at: form.follow_up_required ? localInputToIso(form.follow_up_due_at) : null
  });

  const resetEditor = () => {
    setEditing(null);
    setForm({ ...blankForm, tenant_id: tenantId || '' });
    createCommunication.reset();
    updateCommunication.reset();
  };

  const createCommunication = useMutation({
    mutationFn: () => platformApiRequest<Communication>(`/platform/tenant-communications/tenants/${form.tenant_id}`, {
      method: 'POST',
      body: JSON.stringify(communicationPayload())
    }),
    onMutate: () => setFeedback(null),
    onSuccess: async () => {
      setForm({ ...blankForm, tenant_id: tenantId || '' });
      setFeedback({ tone: 'good', text: 'Tenant communication logged.' });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-communications'] });
    }
  });

  const updateCommunication = useMutation({
    mutationFn: (id: string) => platformApiRequest<Communication>(`/platform/tenant-communications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(communicationPayload())
    }),
    onMutate: () => setFeedback(null),
    onSuccess: async () => {
      setEditing(null);
      setForm({ ...blankForm, tenant_id: tenantId || '' });
      setFeedback({ tone: 'good', text: 'Tenant communication updated.' });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-communications'] });
    }
  });

  const resolveFollowUp = useMutation({
    mutationFn: (id: string) => platformApiRequest<Communication>(`/platform/tenant-communications/${id}/resolve-follow-up`, { method: 'POST' }),
    onMutate: () => setFeedback(null),
    onSuccess: async (_data, id) => {
      if (editing?.id === id) resetEditor();
      setFeedback({ tone: 'good', text: 'Communication follow-up resolved.' });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-communications'] });
    }
  });

  const archiveCommunication = useMutation({
    mutationFn: (id: string) => platformApiRequest<Communication>(`/platform/tenant-communications/${id}/archive`, { method: 'POST' }),
    onMutate: () => setFeedback(null),
    onSuccess: async (_data, id) => {
      if (editing?.id === id) resetEditor();
      setFeedback({ tone: 'good', text: 'Tenant communication archived.' });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-communications'] });
    }
  });

  const restoreCommunication = useMutation({
    mutationFn: (id: string) => platformApiRequest<Communication>(`/platform/tenant-communications/${id}/restore`, { method: 'POST' }),
    onMutate: () => setFeedback(null),
    onSuccess: async () => {
      setFeedback({ tone: 'good', text: 'Tenant communication restored.' });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-communications'] });
    }
  });

  const saving = createCommunication.isPending || updateCommunication.isPending;
  const mutationError = createCommunication.error || updateCommunication.error || resolveFollowUp.error || archiveCommunication.error || restoreCommunication.error;
  const canSave = Boolean(form.tenant_id && form.subject.trim() && form.summary.trim()) && (!form.follow_up_due_at || form.follow_up_required);

  const startEdit = (item: Communication) => {
    if (item.archived_at) return;
    updateFilter('tenant_id', item.tenant_id);
    const openFollowUp = item.follow_up_required && !item.resolved_at;
    setEditing({ id: item.id, tenantId: item.tenant_id, tenantName: item.tenant_name || item.tenant_id, openFollowUp });
    setForm({
      tenant_id: item.tenant_id,
      channel: item.channel || 'email',
      direction: item.direction || 'outbound',
      subject: item.subject || '',
      summary: item.summary || '',
      external_reference: item.external_reference || '',
      contact_name: item.contact_name || '',
      contact_email: item.contact_email || '',
      occurred_at: toLocalDateTimeInput(item.occurred_at),
      follow_up_required: item.follow_up_required === true,
      follow_up_due_at: toLocalDateTimeInput(item.follow_up_due_at)
    });
    createCommunication.reset();
    updateCommunication.reset();
    scrollToFormSection('platform-tenant-communications-form');
  };

  const resolveSelectedFollowUp = (item: Communication) => {
    if (window.confirm(`Resolve the open follow-up for “${item.subject}”?`)) resolveFollowUp.mutate(item.id);
  };

  const archiveSelectedCommunication = (item: Communication) => {
    if (window.confirm(`Archive “${item.subject}”? Archived communications are removed from normal follow-up and timeline views until restored.`)) {
      archiveCommunication.mutate(item.id);
    }
  };

  const heroStatus = invalidFilters ? 'Filter invalid' : initialCommunicationsError ? 'Unavailable' : refreshCommunicationsError ? 'Stale snapshot' : communications.isLoading && !communications.data ? 'Loading' : 'Operational log';
  const heroStatusLabel = invalidFilters ? 'Clear invalid URL filters' : initialCommunicationsError ? 'Retry required' : refreshCommunicationsError ? 'Last successful data retained' : 'Application-recorded communications';

  return (
    <div className="io-operational-page io-workspace-page platform-tenant-communications">
      <OperationalWorkspaceHero
        iconPath="/platform/tenant-communications"
        eyebrow="Platform tenant operations"
        title="Tenant communications"
        description="Record customer-facing and internal communication evidence, follow-up obligations, and references used by Platform operations. A stored communication row records what an operator entered; it does not by itself prove message delivery, receipt, acknowledgement, or an external outcome."
        meta={(
          <>
            <OperationalWorkspaceMetaPill>Source · GET /platform/tenant-communications</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Read · TENANTS_READ</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Write · TENANTS_UPDATE</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Current page · {selectedTenantLabel}</OperationalWorkspaceMetaPill>
          </>
        )}
        aside={(
          <div className="platform-tenant-communications__hero-aside">
            <OperationalWorkspaceStatus value={heroStatus} label={heroStatusLabel} />
            <div className="platform-tenant-communications__refresh-block">
              <button type="button" className="app-button app-button--secondary" onClick={refreshAll} disabled={refreshing}>Refresh</button>
              <span>{refreshing ? 'Refreshing…' : 'Refresh tenant selector and communication snapshot'}</span>
            </div>
          </div>
        )}
      />

      {refreshCommunicationsError ? <div className="platform-tenant-communications__warning">Communication refresh failed. Showing the last successful communications snapshot.</div> : null}
      {refreshTenantsError ? <div className="platform-tenant-communications__warning">Tenant selector refresh failed. Showing the last successful tenant selector snapshot.</div> : null}
      {feedback ? <div className="platform-tenant-communications__feedback" data-tone={feedback.tone}>{feedback.text}</div> : null}
      {mutationError ? <div className="platform-tenant-communications__warning">Action failed: {readableError(mutationError)}</div> : null}

      {invalidFilters ? (
        <div className="platform-tenant-communications__blocking-error">
          <strong>One or more URL filters are invalid.</strong>
          <span>The registry is not loaded until the invalid filter is cleared.</span>
          <button type="button" className="app-button app-button--secondary" onClick={clearInvalidFilters}>Clear invalid filters</button>
        </div>
      ) : null}

      {initialTenantsError ? (
        <div className="platform-tenant-communications__blocking-error">
          <strong>Tenant selector could not be loaded.</strong>
          <span>{readableError(tenants.error)}</span>
          <button type="button" className="app-button app-button--secondary" onClick={() => tenants.refetch()}>Retry tenants</button>
        </div>
      ) : null}

      <OperationalWorkspaceStats ariaLabel="Tenant communications current-page summary">
        <OperationalWorkspaceStatCard label="Loaded records" value={rows.length} helper="Current page only; not an all-registry total" tone="neutral" iconPath="/platform/tenant-communications" loading={communications.isLoading && !communications.data} />
        <OperationalWorkspaceStatCard label="Open follow-ups" value={openFollowUps} helper="Loaded records with an unresolved follow-up obligation" tone={openFollowUps > 0 ? 'warn' : 'good'} iconPath="/platform/tenant-tasks" loading={communications.isLoading && !communications.data} />
        <OperationalWorkspaceStatCard label="Customer-facing" value={customerFacingOnPage} helper="Loaded inbound or outbound records" tone="blue" iconPath="/platform/tenant-contacts" loading={communications.isLoading && !communications.data} />
        <OperationalWorkspaceStatCard label="Archived loaded" value={archivedOnPage} helper={includeArchived ? 'Archived rows visible on this page' : 'Archived rows excluded by current filter'} tone={archivedOnPage > 0 ? 'slate' : 'neutral'} iconPath="/platform/tenant-timeline" loading={communications.isLoading && !communications.data} />
      </OperationalWorkspaceStats>

      <section className="io-workspace-card platform-tenant-communications__section">
        <OperationalSectionHeader
          iconPath="/platform/tenant-communications"
          title="Communication filters"
          description="Filters are stored in the URL so links from Tenants, Contacts, Customer Success, and commercial-readiness workspaces can carry tenant context safely."
        />
        <div className="platform-tenant-communications__form-grid platform-tenant-communications__form-grid--filters">
          <label>Tenant
            <select value={tenantId} onChange={(event) => updateFilter('tenant_id', event.target.value)} disabled={Boolean(initialTenantsError)}>
              <option value="">All tenants</option>
              {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </label>
          <label>Channel
            <select value={channel} onChange={(event) => updateFilter('channel', event.target.value)}>
              <option value="">All channels</option>
              {channelsFallback.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
            </select>
          </label>
          <label>Direction
            <select value={direction} onChange={(event) => updateFilter('direction', event.target.value)}>
              <option value="">All directions</option>
              {directionsFallback.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
            </select>
          </label>
          <label>Follow-up flag
            <select value={followUp} onChange={(event) => updateFilter('follow_up', event.target.value)}>
              <option value="">Any</option>
              <option value="true">Follow-up required</option>
              <option value="false">No follow-up required</option>
            </select>
          </label>
          <label className="platform-tenant-communications__search-field">Search
            <input maxLength={200} value={search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Subject, summary, tenant, contact, email, or reference" />
          </label>
          <label className="platform-tenant-communications__checkbox">
            <input type="checkbox" checked={includeArchived} onChange={(event) => updateFilter('include_archived', event.target.checked)} /> Include archived
          </label>
        </div>
      </section>

      {canWrite ? (
        <section id="platform-tenant-communications-form" className="io-workspace-card platform-tenant-communications__section">
          <OperationalSectionHeader
            iconPath="/platform/tenant-communications"
            title={editing ? 'Edit tenant communication' : 'Log tenant communication'}
            description={editing
              ? `Editing ${editing.tenantName}. Archived communications are immutable until restored. Open follow-ups are resolved with the dedicated record action so resolution evidence stays explicit.`
              : 'Log application evidence about a communication. Channel and direction are operator-recorded metadata; an outbound record does not by itself prove delivery or acknowledgement.'}
          />
          {!editing && !form.tenant_id ? <div className="platform-tenant-communications__inline-note">Select a tenant before logging a communication.</div> : null}
          <div className="platform-tenant-communications__form-grid">
            <label>Tenant
              <select value={form.tenant_id} disabled={Boolean(editing) || saving || Boolean(initialTenantsError)} onChange={(event) => setForm({ ...form, tenant_id: event.target.value })}>
                <option value="">Choose tenant</option>
                {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
              </select>
            </label>
            <label>Channel
              <select value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value })} disabled={saving}>
                {channels.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
              </select>
            </label>
            <label>Direction
              <select value={form.direction} onChange={(event) => setForm({ ...form, direction: event.target.value })} disabled={saving}>
                {directions.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
              </select>
            </label>
            <label>Occurred at
              <input type="datetime-local" value={form.occurred_at} onChange={(event) => setForm({ ...form, occurred_at: event.target.value })} disabled={saving} />
            </label>
            <label>Contact name
              <input maxLength={180} value={form.contact_name} onChange={(event) => setForm({ ...form, contact_name: event.target.value })} placeholder="Person or team" disabled={saving} />
            </label>
            <label>Contact email
              <input type="email" maxLength={254} value={form.contact_email} onChange={(event) => setForm({ ...form, contact_email: event.target.value })} placeholder="name@example.com" disabled={saving} />
            </label>
            <label>Ticket / reference
              <input maxLength={240} value={form.external_reference} onChange={(event) => setForm({ ...form, external_reference: event.target.value })} placeholder="External ticket, thread, or reference" disabled={saving} />
            </label>
            <label className="platform-tenant-communications__subject-field">Subject
              <input maxLength={220} value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="Short communication subject" disabled={saving} />
            </label>
          </div>
          <label className="platform-tenant-communications__notes-label">Summary
            <textarea maxLength={10000} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} placeholder="What was communicated, requested, discussed, or observed?" disabled={saving} />
          </label>
          <div className="platform-tenant-communications__followup-row">
            <label className="platform-tenant-communications__checkbox">
              <input
                type="checkbox"
                checked={form.follow_up_required}
                disabled={saving || Boolean(editing?.openFollowUp)}
                onChange={(event) => setForm({ ...form, follow_up_required: event.target.checked, follow_up_due_at: event.target.checked ? form.follow_up_due_at : '' })}
              /> Follow-up required
            </label>
            <label>Follow-up due
              <input type="datetime-local" value={form.follow_up_due_at} onChange={(event) => setForm({ ...form, follow_up_due_at: event.target.value })} disabled={saving || !form.follow_up_required} />
            </label>
          </div>
          {editing?.openFollowUp ? <div className="platform-tenant-communications__inline-note">This record has an open follow-up. Use “Resolve follow-up” on the record rather than clearing the flag in the edit form.</div> : null}
          <div className="platform-tenant-communications__action-row">
            <button type="button" className="app-button app-button--primary" disabled={!canSave || saving} onClick={() => editing ? updateCommunication.mutate(editing.id) : createCommunication.mutate()}>
              {saving ? 'Saving…' : editing ? 'Save communication' : 'Log communication'}
            </button>
            {editing ? <button type="button" className="app-button app-button--secondary" onClick={resetEditor} disabled={saving}>Cancel edit</button> : null}
          </div>
        </section>
      ) : null}

      <section className="io-workspace-card platform-tenant-communications__section">
        <OperationalSectionHeader
          iconPath="/platform/tenant-communications"
          title="Communication registry"
          description="Open follow-ups are ordered first, then due date and occurrence time. The API uses deterministic ID tie-breaking and bounded pagination. Current-page metrics are not all-registry totals."
          actions={(
            <div className="platform-tenant-communications__pagination">
              <button type="button" className="app-button app-button--secondary" disabled={!hasPreviousPage || communications.isFetching} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Previous</button>
              <span>Page {pageNumber}</span>
              <button type="button" className="app-button app-button--secondary" disabled={!hasNextPage || communications.isFetching} onClick={() => setOffset(offset + PAGE_SIZE)}>Next</button>
            </div>
          )}
        />

        {initialCommunicationsError ? (
          <div className="platform-tenant-communications__blocking-error">
            <strong>Tenant communications could not be loaded.</strong>
            <span>{readableError(communications.error)}</span>
            <button type="button" className="app-button app-button--secondary" onClick={() => communications.refetch()}>Retry</button>
          </div>
        ) : null}
        {communications.isLoading && !communications.data && !invalidFilters ? <div className="platform-tenant-communications__loading">Loading tenant communications…</div> : null}
        {!initialCommunicationsError && !communications.isLoading && !invalidFilters && rows.length === 0 ? (
          <div className="platform-tenant-communications__empty">
            <strong>No tenant communication records match this view.</strong>
            <span>This means the application returned no matching stored communication rows for these filters. It does not prove no external communication, message, call, meeting, or acknowledgement exists elsewhere.</span>
          </div>
        ) : null}

        {rows.length ? (
          <div className="platform-tenant-communications__list">
            {rows.map((item) => {
              const openFollowUp = item.follow_up_required && !item.resolved_at;
              return (
                <article key={item.id} className="platform-tenant-communications__card" data-archived={item.archived_at ? 'true' : 'false'}>
                  <div className="platform-tenant-communications__card-header">
                    <div className="platform-tenant-communications__card-title">
                      <h4>{item.subject}</h4>
                      <div className="platform-tenant-communications__badge-row">
                        <span className="platform-tenant-communications__badge" data-tone="platform">{humanize(item.channel)}</span>
                        <span className="platform-tenant-communications__badge">{humanize(item.direction)}</span>
                        {openFollowUp ? <span className="platform-tenant-communications__badge" data-tone="warn">Open follow-up</span> : item.resolved_at ? <span className="platform-tenant-communications__badge" data-tone="good">Follow-up resolved</span> : null}
                        {item.archived_at ? <span className="platform-tenant-communications__badge" data-tone="warn">Archived</span> : <span className="platform-tenant-communications__badge" data-tone="good">Active</span>}
                      </div>
                    </div>
                    <div className="platform-tenant-communications__tenant-label">
                      <strong>{item.tenant_name || item.tenant_id}</strong>
                      <span>{item.tenant_id}</span>
                    </div>
                  </div>

                  <div className="platform-tenant-communications__evidence-grid">
                    <div><span>Occurred</span><strong>{dateTime(item.occurred_at)}</strong></div>
                    <div><span>Contact</span><strong>{item.contact_name || 'Not recorded'}</strong></div>
                    <div><span>Reference</span><strong>{item.external_reference || 'Not recorded'}</strong></div>
                    <div><span>Follow-up due</span><strong>{item.follow_up_due_at ? dateTime(item.follow_up_due_at) : 'Not recorded'}</strong></div>
                  </div>

                  {item.contact_email ? <div className="platform-tenant-communications__channel-row"><a href={`mailto:${item.contact_email}`}>Email · {item.contact_email}</a></div> : null}
                  <p className="platform-tenant-communications__notes">{item.summary}</p>

                  <div className="platform-tenant-communications__truth-note">This row records application-entered communication evidence. Channel, direction, contact and reference fields do not independently prove delivery, receipt, acknowledgement, or external completion.</div>

                  <div className="platform-tenant-communications__provenance">
                    <span>Created {dateTime(item.created_at)} by {item.created_by_email || 'unknown platform operator'}</span>
                    <span>Updated {dateTime(item.updated_at)} by {item.updated_by_email || 'unknown platform operator'}</span>
                    {item.resolved_at ? <span>Follow-up resolved {dateTime(item.resolved_at)} by {item.resolved_by_email || 'unknown platform operator'}</span> : null}
                    {item.archived_at ? <span>Archived {dateTime(item.archived_at)}</span> : null}
                  </div>

                  <div className="platform-tenant-communications__action-row">
                    {canWrite && !item.archived_at ? <button type="button" className="app-button app-button--secondary" onClick={() => startEdit(item)} disabled={saving}>Edit</button> : null}
                    {canWrite && openFollowUp && !item.archived_at ? <button type="button" className="app-button app-button--secondary" onClick={() => resolveSelectedFollowUp(item)} disabled={resolveFollowUp.isPending}>Resolve follow-up</button> : null}
                    {canWrite && !item.archived_at && !openFollowUp ? <button type="button" className="app-button app-button--secondary" onClick={() => archiveSelectedCommunication(item)} disabled={archiveCommunication.isPending}>Archive</button> : null}
                    {canWrite && item.archived_at ? <button type="button" className="app-button app-button--secondary" onClick={() => restoreCommunication.mutate(item.id)} disabled={restoreCommunication.isPending}>Restore</button> : null}
                    <Link className="app-button app-button--secondary" to={`/platform/tenants?tenant_id=${encodeURIComponent(item.tenant_id)}`}>Tenant record</Link>
                    <Link className="app-button app-button--secondary" to={`/platform/tenant-contacts?tenant_id=${encodeURIComponent(item.tenant_id)}`}>Tenant contacts</Link>
                    <Link className="app-button app-button--secondary" to={`/platform/tenant-timeline?tenant_id=${encodeURIComponent(item.tenant_id)}`}>Tenant timeline</Link>
                  </div>
                  {openFollowUp ? <div className="platform-tenant-communications__inline-note">Resolve the follow-up before archiving. Open follow-ups feed Customer Success and Support Operations evidence and must not disappear through archive.</div> : null}
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="io-workspace-card platform-tenant-communications__section">
        <OperationalSectionHeader
          iconPath="/platform/tenant-timeline"
          title="Supporting tenant operations"
          description="Open the underlying tenant, contact, note, timeline, customer-success, support, or billing surfaces when the communication record points to work that must be verified or completed elsewhere."
        />
        <div className="platform-tenant-communications__link-row">
          <Link to={tenantId ? `/platform/tenants?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenants'}>Tenants</Link>
          <Link to={tenantId ? `/platform/tenant-contacts?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenant-contacts'}>Tenant contacts</Link>
          <Link to={tenantId ? `/platform/tenant-notes?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenant-notes'}>Tenant notes</Link>
          <Link to={tenantId ? `/platform/tenant-timeline?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenant-timeline'}>Tenant timeline</Link>
          <Link to={tenantId ? `/platform/customer-success-admin?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/customer-success-admin'}>Customer Success</Link>
          {canOpenSupportCockpit ? <Link to={tenantId ? `/platform/support-operations-cockpit?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/support-operations-cockpit'}>Support Operations</Link> : null}
          {canReadBilling && tenantId ? <Link to={`/platform/billing?tenant_id=${encodeURIComponent(tenantId)}`}>Billing</Link> : null}
        </div>
      </section>
    </div>
  );
}
