import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '../lib/platformPermissions';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './PlatformAuditRetentionPage.css';

type TenantDirectoryRow = { id: string; name: string; status?: string | null; plan_code?: string | null };
type TenantAuditRetention = {
  tenant_id: string;
  tenant_name: string;
  tenant_status: string;
  write_locked: boolean;
  retention_policy: string | null;
  retention_days: number | null;
  retain_until?: string | null;
  legal_hold: boolean | null;
  legal_hold_reason?: string | null;
  audit_event_count: number;
  tenant_export_archive_events: number | null;
  tenant_export_summary_events: number | null;
  first_audit_event_at?: string | null;
  last_audit_event_at?: string | null;
  audit_age_days?: number | null;
  due_for_retention_review: boolean | null;
  purge_blocked: boolean | null;
  archive_evidence_missing_for_due_review: boolean | null;
  risk_flags: string[];
};
type AuditRetentionSummary = {
  total_tenants: number | null;
  tenants_with_audit_events: number | null;
  tenants_due_for_retention_review: number | null;
  tenants_with_legal_hold: number | null;
  tenants_with_purge_blocked: number | null;
  tenants_with_tenant_archive_evidence: number | null;
  tenants_missing_export_evidence: number | null;
  tenants_with_extended_retention: number | null;
};
type AuditRetentionPolicy = {
  feature: string;
  phase: number;
  step: number;
  generated_at: string;
  posture: string;
  summary: AuditRetentionSummary;
  available_sources: string[];
  omitted_sources: string[];
  evidence_access: { tenant_identity: boolean; data_retention: boolean; tenant_export_audit: boolean };
  evidence_complete: boolean;
  required_permissions_by_source: Record<string, string[]>;
  governance_controls: {
    read_only: boolean;
    deletion_owner: string;
    mutation_owner: string;
    source_routes: string[];
    default_audit_retention_days: number;
    extended_audit_retention_days: number;
  };
  evidence_contract: {
    no_audit_log_deletion_is_performed: boolean;
    retention_thresholds_are_application_review_thresholds_not_legal_requirements: boolean;
    retention_policy_is_application_configuration_not_deletion_proof: boolean;
    retain_until_due_does_not_prove_deletion: boolean;
    tenant_export_preview_is_not_row_data_archive_evidence: boolean;
    tenant_archive_generation_does_not_prove_external_delivery_receipt_or_acceptance: boolean;
    tenant_write_lock_is_not_treated_as_a_retention_purge_blocker: boolean;
    absence_of_application_audit_rows_does_not_prove_external_or_backup_copies_are_absent: boolean;
  };
  pagination: { limit: number; offset: number; total: number | null; has_more: boolean };
  tenants: TenantAuditRetention[];
};

const PAGE_SIZE = 50;
function readableError(error: unknown) { return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error'; }
function metric(value: number | null | undefined) { return value === null || value === undefined ? 'Restricted' : value; }
function pretty(value?: string | null) { return value ? value.replaceAll('_', ' ') : 'Not recorded'; }
function formatDate(value?: string | null) { if (!value) return 'Not recorded'; const d = new Date(value); return Number.isNaN(d.getTime()) ? 'Not recorded' : d.toLocaleDateString(); }
function formatDateTime(value?: string | null) { if (!value) return 'Not recorded'; const d = new Date(value); return Number.isNaN(d.getTime()) ? 'Not recorded' : d.toLocaleString(); }
function postureLabel(value?: string | null) {
  if (value === 'audit_retention_hold_required') return 'Hold present';
  if (value === 'audit_retention_review_required') return 'Review required';
  if (value === 'audit_retention_evidence_restricted') return 'Partial evidence';
  if (value === 'audit_retention_governed') return 'Checks clear';
  return 'Loading';
}
function flagLabel(value: string) {
  const labels: Record<string,string> = {
    audit_retention_age_due: 'Audit age threshold reached',
    tenant_retention_due: 'Retain-until date reached',
    legal_hold_active: 'Legal hold active',
    purge_blocked: 'Purge blocked by legal hold',
    tenant_archive_evidence_missing_for_due_review: 'Full archive evidence missing for due review',
    no_audit_events: 'No tenant-linked audit events'
  };
  return labels[value] || pretty(value);
}

export default function PlatformAuditRetentionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const canReadRetention = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DATA_RETENTION_READ);
  const canReadTenantExports = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT) && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ);
  const canReadCompliance = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_COMPLIANCE_READ);
  const search = searchParams.get('search') || '';
  const tenantId = searchParams.get('tenant_id') || '';
  const offset = Math.max(0, Number(searchParams.get('offset') || 0) || 0);

  const tenantsQuery = useQuery({
    queryKey: ['platform','tenants','audit-retention-directory'],
    queryFn: () => platformApiRequest<TenantDirectoryRow[]>('/platform/tenants'),
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (tenantId) params.set('tenant_id', tenantId);
    if (search.trim()) params.set('search', search.trim());
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(offset));
    return params.toString();
  }, [tenantId, search, offset]);

  const policy = useQuery({
    queryKey: ['platform','audit-retention','policy',queryString],
    queryFn: () => platformApiRequest<AuditRetentionPolicy>(`/platform/audit-retention/policy?${queryString}`),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous
  });

  const data = policy.data;
  const summary = data?.summary;
  const pagination = data?.pagination;
  const refreshError = policy.isError && Boolean(data);
  const pageStart = pagination?.total ? pagination.offset + 1 : 0;
  const pageEnd = pagination && data ? Math.min(pagination.offset + data.tenants.length, pagination.total || 0) : 0;

  const updateParams = (patch: Record<string,string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key,value] of Object.entries(patch)) { if (value) next.set(key,value); else next.delete(key); }
    if (!Object.prototype.hasOwnProperty.call(patch,'offset')) next.delete('offset');
    setSearchParams(next,{ replace:true });
  };
  const refresh = async () => { await Promise.all([tenantsQuery.refetch(), policy.refetch()]); };

  return <div className="io-operational-page io-workspace-page platform-audit-retention">
    <OperationalWorkspaceHero
      iconPath="/platform/audit-retention"
      eyebrow="Platform Governance"
      title="Audit retention"
      description="Read-only governance for tenant-linked Platform audit age, application retention review thresholds, legal-hold state and tenant export archive evidence. This workspace does not delete audit logs or prove legal, backup, delivery or deletion outcomes."
      meta={<>
        <OperationalWorkspaceMetaPill>AUDIT_READ + TENANTS_READ</OperationalWorkspaceMetaPill>
        <OperationalWorkspaceMetaPill>{data?.evidence_complete ? 'Complete configured evidence' : 'Permission-scoped evidence'}</OperationalWorkspaceMetaPill>
        <OperationalWorkspaceMetaPill>Read only</OperationalWorkspaceMetaPill>
        {data?.generated_at ? <OperationalWorkspaceMetaPill>Generated {formatDateTime(data.generated_at)}</OperationalWorkspaceMetaPill> : null}
      </>}
      aside={<div className="platform-audit-retention__hero-aside">
        <OperationalWorkspaceStatus value={postureLabel(data?.posture)} label="application retention posture" />
        <button type="button" className="app-button app-button--secondary" disabled={policy.isFetching} onClick={()=>void refresh()}>{policy.isFetching ? 'Refreshing…' : 'Refresh'}</button>
      </div>}
    />

    <OperationalWorkspaceStats ariaLabel="Audit retention summary">
      <OperationalWorkspaceStatCard iconPath="/platform/audit-retention" label="Tenants" value={metric(summary?.total_tenants)} helper="Filtered tenant registry" loading={!data && policy.isLoading} />
      <OperationalWorkspaceStatCard iconPath="/platform/audit" label="With audit evidence" value={metric(summary?.tenants_with_audit_events)} helper="Tenant-linked Platform audit events" loading={!data && policy.isLoading} />
      <OperationalWorkspaceStatCard iconPath="/platform/data-retention" label="Due for review" value={metric(summary?.tenants_due_for_retention_review)} helper={canReadRetention ? 'Application review threshold or retain-until date reached' : 'Requires Data Retention read'} tone={(summary?.tenants_due_for_retention_review || 0)>0?'warn':'default'} loading={!data && policy.isLoading} />
      <OperationalWorkspaceStatCard iconPath="/platform/data-retention" label="Legal holds" value={metric(summary?.tenants_with_legal_hold)} helper="Application-recorded active holds" tone={(summary?.tenants_with_legal_hold || 0)>0?'danger':'default'} loading={!data && policy.isLoading} />
      <OperationalWorkspaceStatCard iconPath="/platform/tenant-exports" label="Full archive evidence" value={metric(summary?.tenants_with_tenant_archive_evidence)} helper={canReadTenantExports?'Tenants with at least one recorded full archive':'Requires Tenant Export read'} loading={!data && policy.isLoading} />
      <OperationalWorkspaceStatCard iconPath="/platform/tenant-exports" label="Due archive gaps" value={metric(summary?.tenants_missing_export_evidence)} helper="Due tenants without recorded full archive generation" tone={(summary?.tenants_missing_export_evidence || 0)>0?'warn':'default'} loading={!data && policy.isLoading} />
    </OperationalWorkspaceStats>

    {refreshError ? <div className="platform-audit-retention__warning" role="status"><strong>Showing the last successful snapshot.</strong><span>Refresh failed: {readableError(policy.error)}</span></div> : null}
    {data && !data.evidence_complete ? <div className="platform-audit-retention__warning" role="status"><strong>Evidence is permission-scoped.</strong><span>Restricted source families: {data.omitted_sources.map(pretty).join(', ')}. Restricted values remain Restricted/null and are not treated as zero.</span></div> : null}

    <section className="io-workspace-panel platform-audit-retention__section">
      <OperationalSectionHeader iconPath="/platform/audit-retention" title="Tenant audit-retention registry" description="Server-side tenant search, targeting and pagination. Retention and export columns are shown only when their underlying source permissions are available." />
      <div className="platform-audit-retention__filters">
        <label>Tenant<select value={tenantId} onChange={(event)=>updateParams({tenant_id:event.target.value})}><option value="">All tenants</option>{(tenantsQuery.data || []).map((tenant)=><option key={tenant.id} value={tenant.id}>{tenant.name} · {pretty(tenant.status)}</option>)}</select></label>
        <label className="platform-audit-retention__search">Search<input value={search} onChange={(event)=>updateParams({search:event.target.value})} placeholder="Tenant name or status" /></label>
        {(tenantId || search) ? <button type="button" className="app-button app-button--secondary" onClick={()=>setSearchParams({}, {replace:true})}>Clear filters</button> : null}
      </div>

      {policy.isError && !data ? <div className="platform-audit-retention__blocking-error"><strong>Audit retention evidence could not be loaded.</strong><span>{readableError(policy.error)}</span><button type="button" className="app-button app-button--secondary" onClick={()=>void policy.refetch()}>Retry</button></div> : null}
      {policy.isLoading && !data ? <div className="platform-audit-retention__loading">Loading audit retention evidence…</div> : null}

      {data ? <div className="platform-audit-retention__registry">
        {data.tenants.map((tenant)=><article className="platform-audit-retention__card" key={tenant.tenant_id}>
          <div className="platform-audit-retention__card-header">
            <div><h4>{tenant.tenant_name}</h4><p>{pretty(tenant.tenant_status)}{tenant.write_locked?' · tenant writes locked':''}</p></div>
            <div className="platform-audit-retention__badges">
              {tenant.legal_hold===true?<span data-tone="danger">Legal hold</span>:tenant.legal_hold===false?<span data-tone="good">No hold</span>:<span>Hold restricted</span>}
              {tenant.due_for_retention_review===true?<span data-tone="warn">Review due</span>:tenant.due_for_retention_review===false?<span data-tone="good">Threshold clear</span>:<span>Due state restricted</span>}
            </div>
          </div>
          <div className="platform-audit-retention__metrics-grid">
            <div><span>Audit events</span><strong>{tenant.audit_event_count}</strong><small>{formatDate(tenant.first_audit_event_at)} → {formatDate(tenant.last_audit_event_at)}</small></div>
            <div><span>Audit age</span><strong>{tenant.audit_age_days===null||tenant.audit_age_days===undefined?'Not available':`${tenant.audit_age_days} days`}</strong><small>Oldest tenant-linked Platform audit event</small></div>
            <div><span>Review threshold</span><strong>{tenant.retention_days===null?'Restricted':`${tenant.retention_days} days`}</strong><small>{tenant.retention_policy===null?'Retention policy restricted':`${pretty(tenant.retention_policy)} application policy`}</small></div>
            <div><span>Retain until</span><strong>{tenant.retention_policy===null?'Restricted':formatDate(tenant.retain_until)}</strong><small>A due date does not prove deletion</small></div>
            <div><span>Full tenant archives</span><strong>{tenant.tenant_export_archive_events===null?'Restricted':tenant.tenant_export_archive_events}</strong><small>{tenant.tenant_export_summary_events===null?'Summary evidence restricted':`${tenant.tenant_export_summary_events} summary-only package(s)`}</small></div>
            <div><span>Purge blocker</span><strong>{tenant.purge_blocked===null?'Restricted':tenant.purge_blocked?'Legal hold active':'No application hold'}</strong><small>Tenant write lock is not treated as a purge hold</small></div>
          </div>
          {tenant.legal_hold_reason ? <div className="platform-audit-retention__note"><strong>Recorded legal-hold reason</strong><span>{tenant.legal_hold_reason}</span></div> : null}
          <div className="platform-audit-retention__flags">{tenant.risk_flags.length?tenant.risk_flags.map((flag)=><span key={flag}>{flagLabel(flag)}</span>):<span data-tone="good">No visible retention flags</span>}</div>
          <div className="platform-audit-retention__links">
            <Link to={`/platform/audit?tenant_id=${encodeURIComponent(tenant.tenant_id)}`}>Tenant audit</Link>
            {canReadRetention?<Link to={`/platform/data-retention?tenant_id=${encodeURIComponent(tenant.tenant_id)}`}>Data retention</Link>:null}
            {canReadTenantExports?<Link to={`/platform/tenant-exports?tenant_id=${encodeURIComponent(tenant.tenant_id)}`}>Tenant exports</Link>:null}
          </div>
        </article>)}
        {!data.tenants.length?<div className="platform-audit-retention__empty"><strong>No tenants match these filters.</strong><span>Change the tenant/search filters or refresh the registry.</span></div>:null}
        {pagination?<div className="platform-audit-retention__pager"><span>Showing {pageStart}–{pageEnd} of {pagination.total ?? 'Restricted'}</span><div><button type="button" className="app-button app-button--secondary" disabled={pagination.offset===0||policy.isFetching} onClick={()=>updateParams({offset:String(Math.max(0,pagination.offset-PAGE_SIZE))})}>Previous</button><button type="button" className="app-button app-button--secondary" disabled={!pagination.has_more||policy.isFetching} onClick={()=>updateParams({offset:String(pagination.offset+PAGE_SIZE)})}>Next</button></div></div>:null}
      </div>:null}
    </section>

    <section className="io-workspace-panel platform-audit-retention__section">
      <OperationalSectionHeader iconPath="/platform/audit-retention" title="Evidence boundary" description="This page is a governance/readiness view, not a deletion executor or legal certification surface." />
      <div className="platform-audit-retention__truth">
        <strong>Application evidence only.</strong>
        <span>The 365/2,555-day values are application review thresholds derived from recorded retention-policy categories; they are not legal advice or proof of a contractual/statutory retention period. A reached threshold or retain-until date does not prove data was deleted. A generated tenant archive does not prove secure external delivery, receipt or acceptance. A summary-only export is not full row-data archive evidence. Absence of application audit rows does not prove backups, replicas or other external copies are absent.</span>
      </div>
      <div className="platform-audit-retention__coverage">
        {(data?.available_sources || ['audit','tenant_registry']).map((source)=><span key={source} data-state="available">{pretty(source)} · available</span>)}
        {(data?.omitted_sources || []).map((source)=><span key={source} data-state="restricted">{pretty(source)} · restricted</span>)}
      </div>
      <div className="platform-audit-retention__supporting-links">
        <Link to="/platform/audit">Platform Audit</Link>
        {canReadRetention?<Link to="/platform/data-retention">Data retention</Link>:null}
        {canReadTenantExports?<Link to="/platform/tenant-exports">Tenant exports</Link>:null}
        {canReadCompliance?<Link to="/platform/compliance-export">Compliance export</Link>:null}
      </div>
    </section>
  </div>;
}
