import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './PlatformAccessReviewsPage.css';

type Pagination = { limit: number; offset: number; total: number; has_more: boolean };
type EvidenceAccess = { platform_users: boolean; tenant_support: boolean; api_keys: boolean; webhooks: boolean; platform_user_identity: boolean };
type Review = {
  id: string; title: string; scope: string; status: string; due_at?: string | null; notes?: string | null; metadata?: Record<string, unknown>;
  created_at: string; created_by_email?: string | null; completed_by_email?: string | null; cancelled_by_email?: string | null;
  item_count?: number; pending_count?: number; needs_change_count?: number; revoked_count?: number;
};
type ReviewItem = {
  id: string; item_type: string; label: string; tenant_name?: string | null; source?: string | null; source_available?: boolean;
  status: string; decision_note?: string | null; decided_by_email?: string | null; decided_at?: string | null; metadata?: Record<string, unknown>;
};
type ReviewsResponse = {
  reviews: Review[]; scopes: string[]; statuses: string[]; item_statuses: string[]; pagination: Pagination;
  summary: { total: number; open: number; completed: number; cancelled: number; overdue: number };
  evidence_access: EvidenceAccess;
  evidence_contract: Record<string, boolean>;
};
type DetailResponse = { review: Review; items: ReviewItem[]; available_sources: string[]; omitted_sources: string[]; evidence_access: EvidenceAccess };
type ReviewForm = { title: string; scope: string; due_at: string; notes: string };

const PAGE_SIZE = 50;
const SCOPES = ['platform_users', 'tenant_support', 'api_keys', 'webhooks', 'mixed'];
const STATUSES = ['open', 'completed', 'cancelled'];
const DECISIONS = ['approved', 'needs_change', 'revoked', 'not_applicable'];
const emptyForm = (): ReviewForm => ({ title: '', scope: 'mixed', due_at: '', notes: '' });

function readableError(error: unknown) { return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error'; }
function pretty(value?: string | null) { const text = String(value || '').replaceAll('_', ' ').trim(); return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Not recorded'; }
function dateTime(value?: string | null) { if (!value) return 'Not recorded'; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? 'Not recorded' : parsed.toLocaleString(); }
function toIsoOrNull(value: string) { if (!value) return null; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString(); }
function clean(value: string) { const text = value.trim(); return text || null; }
function metadataEntries(metadata?: Record<string, unknown>) {
  return Object.entries(metadata || {}).filter(([, value]) => value !== null && value !== undefined && String(value).trim()).slice(0, 8);
}
function statusTone(status: string) { if (status === 'completed' || status === 'approved') return 'good'; if (['cancelled', 'needs_change', 'revoked'].includes(status)) return 'danger'; return 'warn'; }

export default function PlatformAccessReviewsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ACCESS_REVIEWS_WRITE);
  const canReadUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canReadTenants = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ);
  const canReadApiKeys = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_API_KEYS_READ);
  const canReadWebhooks = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_WEBHOOKS_READ);
  const canReadSupport = hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ);
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);

  const requestedStatus = searchParams.get('status') || 'open';
  const requestedScope = searchParams.get('scope') || '';
  const requestedSearch = searchParams.get('search') || '';
  const status = STATUSES.includes(requestedStatus) ? requestedStatus : '';
  const scope = SCOPES.includes(requestedScope) ? requestedScope : '';
  const search = requestedSearch.length <= 200 ? requestedSearch : '';
  const invalidFilters = Boolean((requestedStatus && !status) || (requestedScope && !scope) || (requestedSearch && !search));

  const [offset, setOffset] = useState(0);
  const [selectedReviewId, setSelectedReviewId] = useState('');
  const [form, setForm] = useState<ReviewForm>(() => emptyForm());
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [mutationError, setMutationError] = useState('');
  useEffect(() => { setOffset(0); }, [status, scope, search, invalidFilters]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (status) params.set('status', status); if (scope) params.set('scope', scope); if (search.trim()) params.set('search', search.trim());
    return params.toString();
  }, [status, scope, search, offset]);

  const reviews = useQuery({
    queryKey: ['platform', 'access-reviews', status, scope, search, offset],
    queryFn: () => platformApiRequest<ReviewsResponse>(`/platform/access-reviews?${queryString}`),
    enabled: !invalidFilters,
    placeholderData: (previousData) => previousData
  });
  const detail = useQuery({
    queryKey: ['platform', 'access-review-detail', selectedReviewId],
    queryFn: () => platformApiRequest<DetailResponse>(`/platform/access-reviews/${selectedReviewId}`),
    enabled: Boolean(selectedReviewId),
    placeholderData: (previousData) => previousData
  });

  const sourceAllowed = (source: string) => source === 'mixed' ? (canReadUsers || canReadTenants || canReadApiKeys || canReadWebhooks) : ({ platform_users: canReadUsers, tenant_support: canReadTenants, api_keys: canReadApiKeys, webhooks: canReadWebhooks } as Record<string, boolean>)[source];
  const formInvalid = !form.title.trim() || !SCOPES.includes(form.scope) || !sourceAllowed(form.scope) || Boolean(form.due_at && !toIsoOrNull(form.due_at));

  const refresh = async () => { await reviews.refetch(); if (selectedReviewId) await detail.refetch(); };
  const invalidate = async () => { await queryClient.invalidateQueries({ queryKey: ['platform', 'access-reviews'] }); if (selectedReviewId) await queryClient.invalidateQueries({ queryKey: ['platform', 'access-review-detail', selectedReviewId] }); };

  const createReview = useMutation({
    mutationFn: () => platformApiRequest<DetailResponse>('/platform/access-reviews', { method: 'POST', body: JSON.stringify({ title: form.title.trim(), scope: form.scope, due_at: toIsoOrNull(form.due_at), notes: clean(form.notes) }) }),
    onMutate: () => { setMutationError(''); setMessage(''); },
    onSuccess: async (data) => { setMessage('Access review created.'); setForm(emptyForm()); setSelectedReviewId(data.review.id); await invalidate(); },
    onError: (error) => setMutationError(readableError(error))
  });
  const decideItem = useMutation({
    mutationFn: ({ itemId, decision }: { itemId: string; decision: string }) => platformApiRequest(`/platform/access-reviews/${selectedReviewId}/items/${itemId}/decision`, { method: 'POST', body: JSON.stringify({ status: decision, decision_note: clean(decisionNotes[itemId] || '') }) }),
    onMutate: () => { setMutationError(''); setMessage(''); },
    onSuccess: async (_data, variables) => { setMessage(`Review item marked ${pretty(variables.decision)}.`); setDecisionNotes((current) => ({ ...current, [variables.itemId]: '' })); await invalidate(); },
    onError: (error) => setMutationError(readableError(error))
  });
  const completeReview = useMutation({
    mutationFn: () => platformApiRequest(`/platform/access-reviews/${selectedReviewId}/complete`, { method: 'POST', body: JSON.stringify({}) }),
    onMutate: () => { setMutationError(''); setMessage(''); }, onSuccess: async () => { setMessage('Access review completed.'); await invalidate(); }, onError: (error) => setMutationError(readableError(error))
  });
  const cancelReview = useMutation({
    mutationFn: () => platformApiRequest(`/platform/access-reviews/${selectedReviewId}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'Cancelled from Platform Access Reviews workspace' }) }),
    onMutate: () => { setMutationError(''); setMessage(''); }, onSuccess: async () => { setMessage('Access review cancelled.'); await invalidate(); }, onError: (error) => setMutationError(readableError(error))
  });

  const response = reviews.data;
  const selected = detail.data?.review;
  const items = detail.data?.items || [];
  const pendingCount = items.filter((item) => item.status === 'pending').length;
  const staleWarning = Boolean(reviews.isError && response);
  const blockingError = Boolean(reviews.isError && !response);
  const pageNumber = response ? Math.floor(response.pagination.offset / response.pagination.limit) + 1 : 1;

  return <div className="platform-access-reviews io-workspace-shell">
    <OperationalWorkspaceHero iconPath="/platform/access-reviews" eyebrow="Security governance" title="Access reviews" description="Create evidence snapshots for privileged access governance, decide each captured item, and close the review only when its application evidence has been assessed." meta={<><OperationalWorkspaceMetaPill>Source-scoped evidence</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>Platform audit recorded</OperationalWorkspaceMetaPill></>} aside={<OperationalWorkspaceStatus value={response?.summary.open ?? '—'} label="open reviews" />} />

    {message ? <div className="platform-access-reviews__message" data-tone="good">{message}</div> : null}
    {mutationError ? <div className="platform-access-reviews__message" data-tone="danger">{mutationError}</div> : null}
    {staleWarning ? <div className="platform-access-reviews__message" data-tone="warn">Refresh failed. Showing the last successful snapshot.</div> : null}
    {invalidFilters ? <div className="platform-access-reviews__message" data-tone="danger">One or more URL filters are invalid. Clear or correct them before loading evidence.</div> : null}

    <OperationalWorkspaceStats ariaLabel="Access review summary">
      <OperationalWorkspaceStatCard label="Filtered reviews" value={response?.summary.total ?? '—'} helper="Registry-wide filtered total" iconPath="/platform/access-reviews" />
      <OperationalWorkspaceStatCard label="Open" value={response?.summary.open ?? '—'} helper="Still accepting decisions" tone="warn" iconPath="/platform/access-reviews" />
      <OperationalWorkspaceStatCard label="Overdue" value={response?.summary.overdue ?? '—'} helper="Open and past recorded due time" tone={(response?.summary.overdue || 0) > 0 ? 'danger' : 'good'} iconPath="/platform/access-reviews" />
      <OperationalWorkspaceStatCard label="Completed" value={response?.summary.completed ?? '—'} helper="Application workflow completed" tone="good" iconPath="/platform/access-reviews" />
    </OperationalWorkspaceStats>

    <section className="io-workspace-panel platform-access-reviews__section">
      <OperationalSectionHeader iconPath="/platform/access-reviews" title="Evidence boundaries" description="Access Reviews is the governing workspace; each captured source still follows the permission boundary of the source system." actions={<button type="button" className="app-button app-button--secondary" disabled={reviews.isFetching || detail.isFetching} onClick={() => void refresh()}>{reviews.isFetching || detail.isFetching ? 'Refreshing…' : 'Refresh'}</button>} />
      <div className="platform-access-reviews__source-grid">
        <div data-available={canReadUsers}><strong>Platform users</strong><span>{canReadUsers ? 'Available' : 'Restricted · PLATFORM_USERS_READ required'}</span></div>
        <div data-available={canReadTenants}><strong>Tenant support policy</strong><span>{canReadTenants ? 'Available' : 'Restricted · TENANTS_READ required'}</span></div>
        <div data-available={canReadApiKeys}><strong>API keys</strong><span>{canReadApiKeys ? 'Available' : 'Restricted · PLATFORM_API_KEYS_READ required'}</span></div>
        <div data-available={canReadWebhooks}><strong>Webhooks</strong><span>{canReadWebhooks ? 'Available' : 'Restricted · PLATFORM_WEBHOOKS_READ required'}</span></div>
      </div>
      <p className="platform-access-reviews__truth">A captured item, decision, completion state, or due date is application governance evidence only. It does not independently prove that external access was removed, customer authorization exists, or a real-world control was effective.</p>
    </section>

    {canWrite ? <section className="io-workspace-panel platform-access-reviews__section">
      <OperationalSectionHeader iconPath="/platform/access-reviews" title="Start access review" description="Single-source reviews require that source permission. Mixed reviews capture only the source families you are currently authorized to read and record omitted sources explicitly." />
      <div className="platform-access-reviews__form-grid">
        <label>Title<input value={form.title} maxLength={200} onChange={(e) => setForm((value) => ({ ...value, title: e.target.value }))} /></label>
        <label>Scope<select value={form.scope} onChange={(e) => setForm((value) => ({ ...value, scope: e.target.value }))}>{SCOPES.map((value) => <option key={value} value={value} disabled={!sourceAllowed(value)}>{pretty(value)}{!sourceAllowed(value) ? ' · permission required' : ''}</option>)}</select></label>
        <label>Due time<input type="datetime-local" value={form.due_at} onChange={(e) => setForm((value) => ({ ...value, due_at: e.target.value }))} /></label>
        <label className="platform-access-reviews__span-all">Notes<textarea value={form.notes} maxLength={5000} onChange={(e) => setForm((value) => ({ ...value, notes: e.target.value }))} /></label>
      </div>
      {formInvalid ? <div className="platform-access-reviews__validation">Enter a title, choose an available scope, and use a valid due time if one is set.</div> : null}
      <button type="button" className="app-button app-button--primary" disabled={formInvalid || createReview.isPending} onClick={() => createReview.mutate()}>{createReview.isPending ? 'Creating…' : 'Create review'}</button>
    </section> : null}

    <section className="io-workspace-panel platform-access-reviews__section">
      <OperationalSectionHeader iconPath="/platform/access-reviews" title="Review registry" description="Filters are stored in the URL. Counts above describe the whole filtered registry, not only this loaded page." />
      <div className="platform-access-reviews__filters">
        <label>Status<select value={status} onChange={(e) => setSearchParams((current) => { const next=new URLSearchParams(current); if(e.target.value) next.set('status',e.target.value); else next.delete('status'); return next; })}><option value="">All statuses</option>{STATUSES.map((value)=><option key={value} value={value}>{pretty(value)}</option>)}</select></label>
        <label>Scope<select value={scope} onChange={(e) => setSearchParams((current) => { const next=new URLSearchParams(current); if(e.target.value) next.set('scope',e.target.value); else next.delete('scope'); return next; })}><option value="">All scopes</option>{SCOPES.map((value)=><option key={value} value={value}>{pretty(value)}</option>)}</select></label>
        <label>Search<input value={search} maxLength={200} placeholder="Title or notes" onChange={(e) => setSearchParams((current) => { const next=new URLSearchParams(current); if(e.target.value) next.set('search',e.target.value); else next.delete('search'); return next; }, { replace:true })} /></label>
      </div>
      {blockingError ? <div className="platform-access-reviews__blocking"><strong>Access reviews could not be loaded.</strong><span>{readableError(reviews.error)}</span><button className="app-button app-button--secondary" type="button" onClick={() => void reviews.refetch()}>Retry</button></div> : null}
      {!blockingError && reviews.isLoading ? <div className="platform-access-reviews__empty">Loading access reviews…</div> : null}
      {!blockingError && response && !response.reviews.length ? <div className="platform-access-reviews__empty"><strong>No access reviews match these filters.</strong><span>This means no matching application review records were returned; it says nothing about external access activity.</span></div> : null}
      <div className="platform-access-reviews__list">{(response?.reviews || []).map((review) => <article key={review.id} className={`platform-access-reviews__card${selectedReviewId===review.id?' is-selected':''}`}>
        <div><h4>{review.title}</h4><p>{pretty(review.scope)} · created {dateTime(review.created_at)} · {review.created_by_email || (canReadUsers ? 'Creator unavailable' : 'Creator identity restricted')}</p></div>
        <div className="platform-access-reviews__badges"><span data-tone={statusTone(review.status)}>{pretty(review.status)}</span><span>{review.pending_count || 0} pending / {review.item_count || 0} total</span>{review.due_at ? <span data-tone={review.status==='open' && new Date(review.due_at).getTime()<Date.now()?'danger':'neutral'}>Due {dateTime(review.due_at)}</span> : null}</div>
        <div className="platform-access-reviews__card-actions"><button type="button" className="app-button app-button--secondary" onClick={() => setSelectedReviewId(review.id)}>Open evidence</button></div>
      </article>)}</div>
      {response ? <div className="platform-access-reviews__pagination"><button type="button" className="app-button app-button--secondary" disabled={offset===0 || reviews.isFetching} onClick={() => setOffset((value)=>Math.max(0,value-PAGE_SIZE))}>Previous</button><span>Page {pageNumber} · up to {PAGE_SIZE} reviews · {response.pagination.total} filtered total</span><button type="button" className="app-button app-button--secondary" disabled={!response.pagination.has_more || reviews.isFetching} onClick={() => setOffset((value)=>value+PAGE_SIZE)}>Next</button></div> : null}
    </section>

    {selectedReviewId ? <section className="io-workspace-panel platform-access-reviews__section">
      <OperationalSectionHeader iconPath="/platform/access-reviews" title={selected ? `Review evidence · ${selected.title}` : 'Review evidence'} description="Restricted source families remain visible only as restricted placeholders; their labels, metadata, tenant identity, and decision notes are withheld server-side." actions={selected && canWrite && selected.status==='open' ? <div className="platform-access-reviews__actions"><button type="button" className="app-button app-button--primary" disabled={pendingCount>0 || completeReview.isPending} onClick={() => { if(window.confirm('Complete this access review? Every item must already have a decision.')) completeReview.mutate(); }}>Complete</button><button type="button" className="app-button app-button--secondary" disabled={cancelReview.isPending} onClick={() => { if(window.confirm('Cancel this access review? Existing decisions will become immutable.')) cancelReview.mutate(); }}>Cancel</button></div> : undefined} />
      {detail.isError && !detail.data ? <div className="platform-access-reviews__blocking"><strong>Selected review could not be loaded.</strong><span>{readableError(detail.error)}</span><button className="app-button app-button--secondary" type="button" onClick={() => void detail.refetch()}>Retry detail</button></div> : null}
      {detail.data ? <><div className="platform-access-reviews__source-state"><strong>Available sources:</strong> {detail.data.available_sources.map(pretty).join(', ') || 'None'}<br/><strong>Omitted/restricted sources:</strong> {detail.data.omitted_sources.map(pretty).join(', ') || 'None'}</div>
      <div className="platform-access-reviews__items">{items.map((item) => <article key={item.id} className="platform-access-reviews__item" data-restricted={item.source_available===false}>
        <div className="platform-access-reviews__item-head"><div><h4>{item.label}</h4><p>{pretty(item.item_type)} · {item.tenant_name || (item.source_available===false ? 'Tenant identity restricted' : 'Platform-wide')}</p></div><span data-tone={statusTone(item.status)}>{pretty(item.status)}</span></div>
        {item.source_available===false ? <div className="platform-access-reviews__restricted">Source evidence is restricted by the underlying source permission. Decision controls are unavailable for this item.</div> : <div className="platform-access-reviews__metadata">{metadataEntries(item.metadata).map(([key,value])=><div key={key}><span>{pretty(key)}</span><strong>{Array.isArray(value)?value.join(', '):String(value)}</strong></div>)}</div>}
        <div className="platform-access-reviews__decision"><span>{item.decision_note || (item.decided_by_email ? `Decided by ${item.decided_by_email}` : item.decided_at ? 'Decision recorded · identity restricted' : 'No decision recorded')}</span>{item.decided_at ? <small>{dateTime(item.decided_at)}</small> : null}</div>
        {canWrite && selected?.status==='open' && item.source_available!==false ? <div className="platform-access-reviews__decision-controls"><input value={decisionNotes[item.id] || ''} maxLength={5000} placeholder="Decision note" onChange={(e)=>setDecisionNotes((current)=>({...current,[item.id]:e.target.value}))}/>{DECISIONS.map((decision)=><button key={decision} type="button" className="app-button app-button--secondary" disabled={decideItem.isPending} onClick={()=>decideItem.mutate({itemId:item.id,decision})}>{pretty(decision)}</button>)}</div> : null}
      </article>)}</div></> : null}
    </section> : null}

    <section className="io-workspace-panel platform-access-reviews__section"><OperationalSectionHeader iconPath="/platform/access-reviews" title="Supporting operations" description="Only destinations allowed by the current Platform permission snapshot are shown." /><div className="platform-access-reviews__links">{canReadUsers?<Link to="/platform/users">Platform users</Link>:null}{canReadApiKeys?<Link to="/platform/api-keys">API keys</Link>:null}{canReadWebhooks?<Link to="/platform/webhooks">Webhooks</Link>:null}{canReadSupport?<Link to="/platform/support-sessions">Support sessions</Link>:null}{canReadAudit?<Link to="/platform/audit">Platform audit</Link>:null}</div></section>
  </div>;
}
