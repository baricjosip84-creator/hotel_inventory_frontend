import { FormEvent, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
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
import './PlatformLegalComplianceReportingPage.css';

type SourceKey = 'legal_documents' | 'privacy_requests' | 'access_reviews' | 'risk_register' | 'vendors';
type Pagination = { source: string; limit: number; offset: number; total: number; has_more: boolean };
type SourceSummary = { total?: number; current_total?: number; requiring_review?: number; overdue?: number; open_high?: number; historical?: number };
type EvidenceAccess = Record<SourceKey, boolean> & { tenant_identity: boolean; platform_user_identity: boolean; integration_monitoring: boolean };
type ReportSummary = {
  total_report_items: number | null;
  visible_report_items: number;
  legal_documents: number;
  privacy_requests: number | null;
  access_reviews: number | null;
  compliance_risks: number | null;
  vendors: number | null;
  items_requiring_review: number | null;
  visible_items_requiring_review: number;
  expired_or_expiring_documents: number;
  overdue_privacy_requests: number | null;
  overdue_access_reviews: number | null;
  open_high_compliance_risks: number | null;
  vendors_requiring_legal_review: number | null;
  tenants_with_legal_findings: number | null;
};
type EvidenceItem = {
  type: 'legal_document' | 'privacy_request' | 'access_review' | 'compliance_risk' | 'vendor_legal';
  id: string;
  title?: string;
  name?: string;
  tenant_id?: string | null;
  tenant_name?: string | null;
  tenant_present?: boolean;
  status?: string;
  owner_email?: string | null;
  owner_present?: boolean;
  assigned_owner_present?: boolean;
  request_type?: string;
  priority?: string;
  scope?: string;
  category?: string;
  likelihood?: string;
  impact?: string;
  severity_score?: number;
  risk_level?: string;
  external_url_present?: boolean;
  sla_reference_present?: boolean;
  reviewed_at?: string | null;
  expires_at?: string | null;
  due_at?: string | null;
  review_due_at?: string | null;
  contract_renewal_date?: string | null;
  pending_items?: number;
  needs_change_items?: number;
  requester_email_present?: boolean;
  historical?: boolean;
  risk_flags: string[];
  report_state: string;
};
type LegalComplianceReport = {
  feature: string;
  phase: number;
  step: number;
  generated_at: string;
  requested_source: string;
  posture: string;
  evidence_state: string;
  evidence_complete: boolean;
  available_sources: SourceKey[];
  omitted_sources: SourceKey[];
  evidence_access: EvidenceAccess;
  required_permissions_by_source: Record<string, string[]>;
  summary: ReportSummary;
  source_summaries: Partial<Record<SourceKey, SourceSummary>>;
  pagination: Pagination;
  correlated_postures: { compliance_export_package: string | null; integration_monitoring_surface: string | null };
  reporting_controls: {
    read_only: boolean;
    application_evidence_only: boolean;
    no_subject_data_export: boolean;
    no_secret_export: boolean;
    no_document_body_export: boolean;
    archived_documents_are_historical: boolean;
    inactive_or_archived_vendors_are_not_current_legal_blockers: boolean;
    source_records_do_not_prove_external_legal_validity_or_acceptance: boolean;
    ready_posture_is_application_evidence_only: boolean;
  };
  evidence: EvidenceItem[];
};

const PAGE_SIZE = 50;
const SOURCE_OPTIONS: Array<{ value: SourceKey; label: string; href: string; permission: string }> = [
  { value: 'legal_documents', label: 'Compliance documents', href: '/platform/compliance-documents', permission: PLATFORM_PERMISSIONS.PLATFORM_COMPLIANCE_READ },
  { value: 'privacy_requests', label: 'Privacy requests', href: '/platform/privacy-requests', permission: PLATFORM_PERMISSIONS.PLATFORM_PRIVACY_READ },
  { value: 'access_reviews', label: 'Access reviews', href: '/platform/access-reviews', permission: PLATFORM_PERMISSIONS.PLATFORM_ACCESS_REVIEWS_READ },
  { value: 'risk_register', label: 'Risk register', href: '/platform/risk-register', permission: PLATFORM_PERMISSIONS.PLATFORM_RISKS_READ },
  { value: 'vendors', label: 'Vendors', href: '/platform/vendors', permission: PLATFORM_PERMISSIONS.PLATFORM_VENDORS_READ }
];

function readableError(error: unknown) { return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error'; }
function pretty(value?: string | null) { const text = String(value || '').replaceAll('_', ' ').trim(); return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Not recorded'; }
function dateOnly(value?: string | null) { if (!value) return 'Not recorded'; const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleDateString(); }
function metric(value: number | null | undefined) { return value === null || value === undefined ? 'Restricted' : value; }
function sourceOption(value: SourceKey) { return SOURCE_OPTIONS.find((option) => option.value === value)!; }
function itemLabel(item: EvidenceItem) { return item.title || item.name || item.id; }
function sourceForItem(item: EvidenceItem): SourceKey {
  if (item.type === 'legal_document') return 'legal_documents';
  if (item.type === 'privacy_request') return 'privacy_requests';
  if (item.type === 'access_review') return 'access_reviews';
  if (item.type === 'compliance_risk') return 'risk_register';
  return 'vendors';
}
function itemDetail(item: EvidenceItem) {
  switch (item.type) {
    case 'legal_document':
      return `${item.external_url_present ? 'Reference recorded' : 'No external reference'} · reviewed ${dateOnly(item.reviewed_at)} · expires ${dateOnly(item.expires_at)}`;
    case 'privacy_request':
      return `${pretty(item.request_type)} · ${pretty(item.priority)} priority · due ${dateOnly(item.due_at)} · ${item.requester_email_present ? 'requester email recorded' : 'requester email not recorded'}`;
    case 'access_review':
      return `${pretty(item.scope)} · due ${dateOnly(item.due_at)} · ${item.pending_items || 0} pending · ${item.needs_change_items || 0} needs change`;
    case 'compliance_risk':
      return `${pretty(item.category)} · ${pretty(item.likelihood)} likelihood / ${pretty(item.impact)} impact · score ${item.severity_score ?? '—'} · review ${dateOnly(item.review_due_at)}`;
    case 'vendor_legal':
      return `${pretty(item.category)} · ${pretty(item.risk_level)} risk · renewal ${dateOnly(item.contract_renewal_date)} · ${item.sla_reference_present ? 'SLA reference recorded' : 'SLA reference missing'}`;
  }
}
function tenantText(item: EvidenceItem, canReadTenantIdentity: boolean) {
  if (!item.tenant_present && !item.tenant_id) return 'Platform-wide';
  if (!canReadTenantIdentity) return 'Restricted tenant linkage';
  return item.tenant_name || 'Tenant name unavailable';
}
function ownerText(item: EvidenceItem, canReadUserIdentity: boolean) {
  const present = item.owner_present ?? item.assigned_owner_present;
  if (present === undefined) return null;
  if (!present) return 'No owner recorded';
  if (!canReadUserIdentity) return 'Owner linkage restricted';
  return item.owner_email || 'Owner assigned';
}
function postureLabel(value: string) {
  if (value === 'legal_compliance_ready') return 'Application ready';
  if (value === 'legal_compliance_review_required') return 'Review required';
  if (value === 'legal_compliance_blocked') return 'Blocked';
  if (value === 'partial_evidence') return 'Partial evidence';
  return pretty(value);
}

export default function PlatformLegalComplianceReportingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSource = searchParams.get('source') || 'legal_documents';
  const knownSource = SOURCE_OPTIONS.some((option) => option.value === rawSource);
  const selectedSource = (knownSource ? rawSource : 'legal_documents') as SourceKey;
  const rawOffset = searchParams.get('offset') || '0';
  const parsedOffset = Number(rawOffset);
  const invalidOffset = !Number.isInteger(parsedOffset) || parsedOffset < 0 || parsedOffset > 1000000;
  const offset = invalidOffset ? 0 : parsedOffset;
  const search = searchParams.get('search') || '';
  const invalidSearch = search.length > 200;
  const [searchDraft, setSearchDraft] = useState(search);
  useEffect(() => setSearchDraft(search), [search]);

  const localAccess: Record<SourceKey, boolean> = {
    legal_documents: hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_COMPLIANCE_READ),
    privacy_requests: hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_PRIVACY_READ),
    access_reviews: hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ACCESS_REVIEWS_READ),
    risk_register: hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RISKS_READ),
    vendors: hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_VENDORS_READ)
  };
  const canReadTenants = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ);
  const canReadUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canReadIntegrationMonitoring = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ);

  const query = useQuery({
    queryKey: ['platform', 'legal-compliance-reporting', selectedSource, search, offset],
    queryFn: () => platformApiRequest<LegalComplianceReport>(`/platform/legal-compliance-reporting/report?source=${selectedSource}&limit=${PAGE_SIZE}&offset=${offset}${search ? `&search=${encodeURIComponent(search)}` : ''}`),
    enabled: knownSource && !invalidOffset && !invalidSearch,
    placeholderData: (previous) => previous
  });
  const data = query.data;
  const summary = data?.summary;
  const pagination = data?.pagination;
  const staleWarning = Boolean(query.isError && data);
  const blockingError = Boolean(query.isError && !data);

  const setPageState = (updates: { source?: SourceKey; search?: string; offset?: number }) => {
    const next = new URLSearchParams(searchParams);
    if (updates.source) next.set('source', updates.source);
    if (updates.search !== undefined) updates.search ? next.set('search', updates.search) : next.delete('search');
    const nextOffset = updates.offset ?? 0;
    if (nextOffset > 0) next.set('offset', String(nextOffset)); else next.delete('offset');
    setSearchParams(next, { replace: true });
  };
  const applySearch = (event: FormEvent) => { event.preventDefault(); setPageState({ search: searchDraft.trim(), offset: 0 }); };

  return <div className="io-operational-page io-workspace-page platform-legal-compliance io-workspace-shell">
    <OperationalWorkspaceHero
      iconPath="/platform/legal-compliance-reporting"
      eyebrow="Legal & compliance governance"
      title="Legal & compliance reporting"
      description="Correlate current application evidence across compliance documents, privacy requests, access reviews, risks and vendors without bypassing the permissions of those source areas. Restricted evidence is omitted, never converted into a reassuring zero."
      meta={<>
        <OperationalWorkspaceMetaPill>Read-only application evidence</OperationalWorkspaceMetaPill>
        <OperationalWorkspaceMetaPill>{data?.evidence_complete ? 'Complete authorized source set' : 'Permission-scoped source set'}</OperationalWorkspaceMetaPill>
        <OperationalWorkspaceMetaPill>{data ? `Generated ${new Date(data.generated_at).toLocaleString()}` : 'Loading snapshot'}</OperationalWorkspaceMetaPill>
      </>}
      aside={<OperationalWorkspaceStatus value={data ? postureLabel(data.posture) : 'Loading'} label={data?.evidence_complete ? 'current application posture' : 'current available-evidence posture'} />}
    />

    {!knownSource ? <div className="platform-legal-compliance__blocking"><strong>Invalid evidence source.</strong><span>Select one of the supported legal/compliance evidence sources.</span><button type="button" className="app-button app-button--secondary" onClick={() => setPageState({ source: 'legal_documents', offset: 0 })}>Reset source</button></div> : null}
    {invalidOffset ? <div className="platform-legal-compliance__blocking"><strong>Invalid evidence page.</strong><span>Offset must be a whole number between 0 and 1,000,000.</span><button type="button" className="app-button app-button--secondary" onClick={() => setPageState({ offset: 0 })}>Reset page</button></div> : null}
    {invalidSearch ? <div className="platform-legal-compliance__blocking"><strong>Search is too long.</strong><span>Search text is limited to 200 characters.</span><button type="button" className="app-button app-button--secondary" onClick={() => setPageState({ search: '', offset: 0 })}>Clear search</button></div> : null}
    {blockingError ? <div className="platform-legal-compliance__blocking"><strong>Legal/compliance evidence could not be loaded.</strong><span>{readableError(query.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => void query.refetch()}>Retry</button></div> : null}
    {staleWarning ? <div className="platform-legal-compliance__stale"><strong>Showing the last successful snapshot.</strong><span>Refresh failed: {readableError(query.error)}</span></div> : null}

    {summary ? <OperationalWorkspaceStats ariaLabel="Legal and compliance overview">
      <OperationalWorkspaceStatCard label="Current report items" value={metric(summary.total_report_items)} helper={`${summary.visible_report_items} visible across authorized sources`} tone="blue" iconPath="/platform/legal-compliance-reporting" />
      <OperationalWorkspaceStatCard label="Items requiring review" value={metric(summary.items_requiring_review)} helper={`${summary.visible_items_requiring_review} known in authorized sources`} tone={summary.visible_items_requiring_review ? 'amber' : 'green'} iconPath="/platform/legal-compliance-reporting" />
      <OperationalWorkspaceStatCard label="Expired / expiring documents" value={summary.expired_or_expiring_documents} helper={`${summary.legal_documents} current document records`} tone={summary.expired_or_expiring_documents ? 'amber' : 'green'} iconPath="/platform/compliance-documents" />
      <OperationalWorkspaceStatCard label="Overdue privacy requests" value={metric(summary.overdue_privacy_requests)} helper={summary.privacy_requests === null ? 'Privacy evidence restricted' : `${summary.privacy_requests} privacy records`} tone="red" iconPath="/platform/privacy-requests" />
      <OperationalWorkspaceStatCard label="Overdue access reviews" value={metric(summary.overdue_access_reviews)} helper={summary.access_reviews === null ? 'Access Review evidence restricted' : `${summary.access_reviews} review records`} tone="amber" iconPath="/platform/access-reviews" />
      <OperationalWorkspaceStatCard label="Open high risks" value={metric(summary.open_high_compliance_risks)} helper={summary.compliance_risks === null ? 'Risk Register evidence restricted' : `${summary.compliance_risks} current risk records`} tone="red" iconPath="/platform/risk-register" />
      <OperationalWorkspaceStatCard label="Vendor legal review" value={metric(summary.vendors_requiring_legal_review)} helper={summary.vendors === null ? 'Vendor evidence restricted' : `${summary.vendors} current vendor records`} tone="amber" iconPath="/platform/vendors" />
      <OperationalWorkspaceStatCard label="Tenants with findings" value={metric(summary.tenants_with_legal_findings)} helper={summary.tenants_with_legal_findings === null ? 'Requires TENANTS_READ plus tenant-linked source access' : 'Distinct tenant linkages with current findings'} tone="amber" iconPath="/platform/tenants" />
    </OperationalWorkspaceStats> : null}

    <section className="io-workspace-panel platform-legal-compliance__section">
      <OperationalSectionHeader iconPath="/platform/legal-compliance-reporting" title="Evidence coverage" description="The report remains available with PLATFORM_COMPLIANCE_READ, but each protected source keeps its own read boundary. Requesting a forbidden source fails closed." actions={<button type="button" className="app-button app-button--secondary" disabled={query.isFetching} onClick={() => void query.refetch()}>{query.isFetching ? 'Refreshing…' : 'Refresh'}</button>} />
      <div className="platform-legal-compliance__coverage">
        {SOURCE_OPTIONS.map((option) => {
          const available = data?.evidence_access?.[option.value] ?? localAccess[option.value];
          return <span key={option.value} data-state={available ? 'available' : 'restricted'}><strong>{option.label}</strong><small>{available ? 'Available' : `Restricted · ${option.permission}`}</small></span>;
        })}
      </div>
      <div className="platform-legal-compliance__identity-note">
        <span>Tenant identity: <strong>{data?.evidence_access.tenant_identity ?? canReadTenants ? 'Available' : 'Restricted'}</strong></span>
        <span>Platform-user identity: <strong>{data?.evidence_access.platform_user_identity ?? canReadUsers ? 'Available' : 'Restricted'}</strong></span>
      </div>
    </section>

    <section className="io-workspace-panel platform-legal-compliance__section">
      <OperationalSectionHeader iconPath="/platform/compliance-export" title="Correlated application postures" description="These are supporting application surfaces, not external legal opinions or certifications." />
      <div className="platform-legal-compliance__correlations">
        <div><strong>Compliance export</strong><span>{data ? pretty(data.correlated_postures.compliance_export_package) : 'Loading'}</span></div>
        <div><strong>Integration monitoring</strong><span>{data?.correlated_postures.integration_monitoring_surface ? pretty(data.correlated_postures.integration_monitoring_surface) : 'Restricted'}</span></div>
      </div>
      <div className="platform-legal-compliance__links">
        <Link to="/platform/compliance-documents">Compliance Docs</Link>
        {localAccess.privacy_requests ? <Link to="/platform/privacy-requests">Privacy Requests</Link> : null}
        {localAccess.access_reviews ? <Link to="/platform/access-reviews">Access Reviews</Link> : null}
        {localAccess.risk_register ? <Link to="/platform/risk-register">Risk Register</Link> : null}
        {localAccess.vendors ? <Link to="/platform/vendors">Vendors</Link> : null}
        <Link to="/platform/compliance-export">Compliance Export</Link>
        {canReadIntegrationMonitoring ? <Link to="/platform/integration-monitoring">Integration Monitoring</Link> : null}
      </div>
    </section>

    <section className="io-workspace-panel platform-legal-compliance__section">
      <OperationalSectionHeader iconPath={sourceOption(selectedSource).href} title="Evidence registry" description="Choose one authorized source at a time for true server pagination. Summary cards remain registry-wide across every authorized source and are not narrowed by this evidence-table search." />
      <form className="platform-legal-compliance__filters" onSubmit={applySearch}>
        <label>Evidence source<select value={selectedSource} onChange={(event) => setPageState({ source: event.target.value as SourceKey, offset: 0 })}>{SOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value} disabled={!localAccess[option.value]}>{option.label}{localAccess[option.value] ? '' : ' — Restricted'}</option>)}</select></label>
        <label className="platform-legal-compliance__search">Search<input value={searchDraft} maxLength={200} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Search this evidence source" /></label>
        <button type="submit" className="app-button app-button--secondary" disabled={query.isFetching}>Apply</button>
        {(search || offset > 0) ? <button type="button" className="app-button app-button--ghost" onClick={() => { setSearchDraft(''); setPageState({ search: '', offset: 0 }); }}>Reset</button> : null}
      </form>

      <div className="platform-legal-compliance__table-wrap"><table><thead><tr><th>Item</th><th>Source</th><th>Tenant</th><th>State</th><th>Recorded evidence</th><th>Flags</th><th>Source action</th></tr></thead><tbody>
        {(data?.evidence || []).map((item) => {
          const source = sourceForItem(item); const option = sourceOption(source); const owner = ownerText(item, data?.evidence_access.platform_user_identity ?? canReadUsers);
          return <tr key={`${item.type}:${item.id}`} data-historical={Boolean(item.historical)}>
            <td><strong>{itemLabel(item)}</strong><small>{pretty(item.status)}{owner ? ` · ${owner}` : ''}</small></td>
            <td>{option.label}</td>
            <td>{tenantText(item, data?.evidence_access.tenant_identity ?? canReadTenants)}</td>
            <td><span className="platform-legal-compliance__state" data-state={item.report_state}>{pretty(item.report_state)}</span></td>
            <td>{itemDetail(item)}</td>
            <td>{item.risk_flags.length ? <div className="platform-legal-compliance__flags">{item.risk_flags.map((flag) => <span key={flag}>{pretty(flag)}</span>)}</div> : <span className="platform-legal-compliance__muted">No current application flags</span>}</td>
            <td><Link to={option.href}>Open source page</Link>{canReadTenants && item.tenant_id ? <small><Link to={`/platform/tenants/${item.tenant_id}`}>Tenant source</Link></small> : null}</td>
          </tr>;
        })}
        {!data?.evidence.length && !query.isLoading ? <tr><td colSpan={7} className="platform-legal-compliance__empty">No evidence rows match this source and search.</td></tr> : null}
      </tbody></table></div>
      {pagination ? <div className="platform-legal-compliance__pager"><span>Showing {pagination.total ? pagination.offset + 1 : 0}–{Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} {sourceOption(selectedSource).label.toLowerCase()} records</span><div><button type="button" className="app-button app-button--secondary" disabled={pagination.offset === 0 || query.isFetching} onClick={() => setPageState({ offset: Math.max(0, pagination.offset - PAGE_SIZE) })}>Previous</button><button type="button" className="app-button app-button--secondary" disabled={!pagination.has_more || query.isFetching} onClick={() => setPageState({ offset: pagination.offset + PAGE_SIZE })}>Next</button></div></div> : null}
    </section>

    <section className="io-workspace-panel platform-legal-compliance__section">
      <OperationalSectionHeader iconPath="/platform/legal-compliance-reporting" title="Evidence boundary" description="What this report can and cannot truthfully claim." />
      <div className="platform-legal-compliance__truth"><strong>Application governance evidence only.</strong><span>A recorded document, review, privacy workflow, risk state, vendor record or supporting application posture does not prove that an external agreement exists, that legal advice was obtained, that a customer accepted a term, that an external control operated effectively, or that a real-world obligation was satisfied.</span><span>Archived documents, closed/cancelled risks, and inactive/archived vendors are historical evidence and do not create current blockers by themselves.</span></div>
    </section>
  </div>;
}
