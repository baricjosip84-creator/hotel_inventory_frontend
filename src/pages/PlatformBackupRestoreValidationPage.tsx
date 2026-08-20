import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './PlatformBackupRestoreValidationPage.css';

type EvidenceValue = string | number | boolean | null | string[] | Record<string, number>;

type BackupRestoreControl = {
  code: string;
  label: string;
  evidence_key: string;
  launch_reason: string;
  evidence_value?: number | null;
  status?: string;
};

type BackupRestoreTenantRow = {
  tenant_id: string;
  tenant_name: string;
  tenant_status: string;
  status: string;
  evidence: Record<string, EvidenceValue>;
  controls: BackupRestoreControl[];
  missing_control_codes: string[];
  next_best_step: string;
};

type BackupRestorePackage = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  platform_evidence: Record<string, EvidenceValue>;
  platform_controls: BackupRestoreControl[];
  backup_restore_controls: BackupRestoreControl[];
  tenants: BackupRestoreTenantRow[];
  validation_note: string;
};

type Tenant = { id: string; name: string };
type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';

const summaryLabels: Record<string, string> = {
  tenants_total: 'Tenants reviewed',
  tenant_scope_ready: 'Tenant scopes ready',
  tenant_scope_blocked: 'Tenant scopes blocked',
  tenant_scope_review_required: 'Tenant review required',
  tenants_with_core_data: 'Tenants with core data',
  tenants_without_core_data: 'Tenants without core data',
  tenants_with_export_archive_evidence: 'Export evidence present',
  tenants_without_export_archive_evidence: 'Export evidence missing',
  exportable_table_count: 'Exportable tables',
  backup_policy_fields_configured: 'Backup policy fields configured',
  backup_policy_fields_total: 'Backup policy fields total',
  platform_controls_total: 'Platform controls',
  platform_controls_with_evidence: 'Platform controls with evidence',
  platform_controls_blocking: 'Platform blockers',
  platform_controls_review_required: 'Platform review required',
  total_controls: 'Total controls',
  controls_with_evidence: 'Controls with evidence'
};

const detailSummaryKeys = [
  'tenants_with_core_data',
  'tenants_without_core_data',
  'tenants_with_export_archive_evidence',
  'tenants_without_export_archive_evidence',
  'exportable_table_count',
  'backup_policy_fields_configured',
  'backup_policy_fields_total',
  'platform_controls_total',
  'platform_controls_with_evidence',
  'platform_controls_blocking',
  'platform_controls_review_required',
  'total_controls',
  'controls_with_evidence'
] as const;

const statusLabels: Record<string, string> = {
  backup_restore_validation_blocked: 'Backup / restore validation blocked',
  backup_restore_review_required: 'Backup / restore review required',
  backup_restore_technical_precheck_clear: 'Technical precheck clear',
  no_tenants_to_review_for_backup_restore: 'No tenants to review',
  tenant_backup_scope_ready: 'Tenant backup scope ready',
  tenant_backup_scope_blocked: 'Tenant backup scope blocked',
  tenant_backup_scope_review_required: 'Tenant backup scope review required',
  evidence_present: 'Evidence present',
  backup_restore_evidence_missing: 'Evidence missing',
  backup_policy_configuration_missing: 'Backup policy configuration missing',
  manual_restore_drill_verification_required: 'Manual restore-drill verification required',
  manual_restore_drill_required: 'Manual restore drill required',
  tenant_export_sample_review_required: 'Tenant export sample review required'
};

function humanize(value: string | null | undefined) {
  const normalized = String(value || '').trim().replaceAll('_', ' ');
  if (!normalized) return 'Not set';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function displayStatus(value: string | null | undefined) {
  if (!value) return 'Not available';
  return statusLabels[value] || humanize(value);
}

function displaySummaryKey(value: string) {
  return summaryLabels[value] || humanize(value);
}

function badgeTone(value: string | null | undefined): BadgeTone {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('blocked') || normalized.includes('missing')) return 'danger';
  if (normalized.includes('review') || normalized.includes('manual') || normalized.includes('sample')) return 'warn';
  if (normalized.includes('no_tenants') || normalized.includes('not_available')) return 'neutral';
  if (normalized.includes('ready') || normalized.includes('clear') || normalized.includes('evidence_present')) return 'good';
  return 'accent';
}

function formatValue(value: EvidenceValue | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'None';
  if (typeof value === 'object') {
    return Object.entries(value).map(([key, count]) => `${humanize(key)}: ${count}`).join(', ') || 'None';
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
  }
  return String(value);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not available';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not available' : parsed.toLocaleString();
}

function readableError(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Unknown error';
}

function shortId(value: string) {
  return value.length > 8 ? `${value.slice(0, 8)}…` : value;
}

function tenantExportLink(tenantId: string) {
  const params = new URLSearchParams({ tenant_id: tenantId });
  return `/platform/tenant-exports?${params.toString()}`;
}

export default function PlatformBackupRestoreValidationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tenantId = searchParams.get('tenant_id') || '';

  const tenantsQuery = useQuery({
    queryKey: ['platform', 'tenants', 'for-backup-restore-validation'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants'),
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });

  const query = new URLSearchParams();
  if (tenantId) query.set('tenant_id', tenantId);
  const queryString = query.toString();

  const validation = useQuery({
    queryKey: ['platform', 'backup-restore-validation', tenantId],
    queryFn: () => platformApiRequest<BackupRestorePackage>(`/platform/backup-restore-validation${queryString ? `?${queryString}` : ''}`),
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });

  const data = validation.data;
  const summary = data?.summary || {};
  const tenants = useMemo(() => tenantsQuery.data || [], [tenantsQuery.data]);
  const selectedTenant = useMemo(() => tenants.find((tenant) => tenant.id === tenantId), [tenantId, tenants]);
  const platformEvidence = useMemo(() => Object.entries(data?.platform_evidence || {}), [data?.platform_evidence]);
  const refreshError = validation.isError && Boolean(data);
  const initialLoadError = validation.isError && !data;
  const errorMessage = readableError(validation.error);
  const scopeLabel = tenantId
    ? selectedTenant?.name || `Selected tenant (${shortId(tenantId)})`
    : 'All tenants';

  function changeTenant(nextTenantId: string) {
    const nextParams = new URLSearchParams(searchParams);
    if (nextTenantId) nextParams.set('tenant_id', nextTenantId);
    else nextParams.delete('tenant_id');
    setSearchParams(nextParams, { replace: true });
  }

  function refreshAll() {
    void tenantsQuery.refetch();
    void validation.refetch();
  }

  return (
    <div className="io-operational-page io-workspace-page platform-backup-restore">
      <OperationalWorkspaceHero
        iconPath="/platform/backup-restore-validation"
        eyebrow="Platform Commercial Launch Readiness"
        title="Backup Restore Validation"
        description="Read-only technical recovery precheck across backup policy configuration, recovery runbooks, tenant export evidence, and tenant data scope."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 213 — Backup Restore Validation Board'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Operator precheck only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>No backup or restore mutations</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-backup-restore__hero-aside">
            <OperationalWorkspaceStatus
              value={data ? `${summary.tenant_scope_ready ?? 0}/${summary.tenants_total ?? 0}` : '—'}
              label="tenant scopes technically ready"
            />
            {data ? (
              <span className="platform-backup-restore__status-badge" data-tone={badgeTone(data.posture)}>
                {displayStatus(data.posture)}
              </span>
            ) : null}
            <div className="platform-backup-restore__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={refreshAll}
                disabled={tenantsQuery.isFetching || validation.isFetching}
              >
                {tenantsQuery.isFetching || validation.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <OperationalWorkspaceStats ariaLabel="Backup restore validation key metrics">
        <OperationalWorkspaceStatCard
          iconPath="/platform/backup-restore-validation"
          label="Tenants reviewed"
          value={summary.tenants_total ?? 0}
          helper="Tenants in the current recovery-evidence scope"
          loading={!data && validation.isLoading}
        />
        <OperationalWorkspaceStatCard
          iconPath="/platform/tenant-exports"
          label="Tenant scopes ready"
          value={summary.tenant_scope_ready ?? 0}
          helper="Data scope and audited export-path evidence are present"
          tone="good"
          loading={!data && validation.isLoading}
        />
        <OperationalWorkspaceStatCard
          iconPath="/platform/backup-restore-validation"
          label="Tenant scopes blocked"
          value={summary.tenant_scope_blocked ?? 0}
          helper="Required tenant recovery evidence is missing"
          tone={(summary.tenant_scope_blocked ?? 0) > 0 ? 'danger' : 'default'}
          loading={!data && validation.isLoading}
        />
        <OperationalWorkspaceStatCard
          iconPath="/platform/tenant-exports"
          label="Tenant review required"
          value={summary.tenant_scope_review_required ?? 0}
          helper="Export-path sampling or operator review remains"
          tone={(summary.tenant_scope_review_required ?? 0) > 0 ? 'warn' : 'default'}
          loading={!data && validation.isLoading}
        />
        <OperationalWorkspaceStatCard
          iconPath="/platform/runbooks"
          label="Platform blockers"
          value={summary.platform_controls_blocking ?? 0}
          helper="Missing runbook, implementation or policy evidence"
          tone={(summary.platform_controls_blocking ?? 0) > 0 ? 'danger' : 'default'}
          loading={!data && validation.isLoading}
        />
        <OperationalWorkspaceStatCard
          iconPath="/platform/runbooks"
          label="Platform review required"
          value={summary.platform_controls_review_required ?? 0}
          helper="Manual restore-drill verification still required"
          tone={(summary.platform_controls_review_required ?? 0) > 0 ? 'warn' : 'default'}
          loading={!data && validation.isLoading}
        />
      </OperationalWorkspaceStats>

      <section className="app-panel app-panel--padded platform-backup-restore__scope-panel">
        <OperationalSectionHeader
          iconPath="/platform/backup-restore-validation"
          title="Recovery scope"
          description="Review all tenants or one tenant. The selected tenant is stored in the URL so the same recovery scope can be reopened reliably."
        />
        <div className="platform-backup-restore__filter-grid">
          <label className="platform-backup-restore__field" htmlFor="backup-restore-tenant-filter">
            <span>Tenant filter</span>
            <select
              id="backup-restore-tenant-filter"
              value={tenantId}
              onChange={(event) => changeTenant(event.target.value)}
              disabled={tenantsQuery.isLoading && !tenantId}
            >
              <option value="">All tenants</option>
              {tenantId && !selectedTenant ? <option value={tenantId}>Selected tenant ({shortId(tenantId)})</option> : null}
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
              ))}
            </select>
          </label>
          <div className="platform-backup-restore__scope-copy">
            <strong>Current scope</strong>
            <span>{scopeLabel}</span>
          </div>
        </div>
        {tenantsQuery.error ? (
          <p className="platform-backup-restore__filter-warning">
            Tenant filter options could not be loaded: {readableError(tenantsQuery.error)}. The current URL scope is preserved.
          </p>
        ) : null}
      </section>

      {validation.isLoading && !data ? (
        <section className="app-panel app-panel--padded platform-backup-restore__feedback">
          <strong>Loading backup restore validation…</strong>
          <span>Collecting current recovery foundations, tenant export evidence, data scope and backup-policy posture.</span>
        </section>
      ) : null}

      {initialLoadError ? (
        <section className="app-panel app-panel--padded platform-backup-restore__feedback platform-backup-restore__feedback--error" role="alert">
          <strong>Unable to load backup restore validation: {errorMessage}</strong>
          <span>No successful recovery-evidence snapshot is currently available.</span>
          <button
            type="button"
            className="app-button app-button--secondary platform-backup-restore__retry"
            onClick={() => void validation.refetch()}
            disabled={validation.isFetching}
          >
            {validation.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-panel app-panel--padded platform-backup-restore__feedback platform-backup-restore__feedback--warning" role="status">
          <strong>Refresh failed — showing the last successful backup / restore snapshot.</strong>
          <span>{errorMessage}</span>
          <button
            type="button"
            className="app-button app-button--secondary platform-backup-restore__retry"
            onClick={() => void validation.refetch()}
            disabled={validation.isFetching}
          >
            {validation.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <section className="app-panel app-panel--padded platform-backup-restore__program-panel">
            <OperationalSectionHeader
              iconPath="/platform/backup-restore-validation"
              title="Recovery program context"
              description="Technical evidence for operator review. A clear application precheck is not disaster-recovery certification."
            />
            <div className="platform-backup-restore__program-grid">
              <div><strong>Phase</strong><span>{data.phase}</span></div>
              <div><strong>Step</strong><span>{data.step}</span></div>
              <div><strong>Generated</strong><span>{formatDateTime(data.generated_at)}</span></div>
              <div><strong>Control definitions</strong><span>{data.backup_restore_controls.length}</span></div>
              <div className="platform-backup-restore__operator-notice">
                <strong>Operator precheck only.</strong>
                <span>The application does not execute production database backups, restore databases, verify an external backup provider, or persist restore-drill completion. A real isolated restore drill and operator-owned provider evidence remain required.</span>
              </div>
              <details className="platform-backup-restore__validation-note">
                <summary>Validation boundary</summary>
                <p>{data.validation_note}</p>
              </details>
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-backup-restore__summary-panel">
            <OperationalSectionHeader
              iconPath="/platform/backup-restore-validation"
              title="Detailed recovery summary"
              description="Supporting counters behind the primary backup / restore readiness KPIs."
            />
            <div className="platform-backup-restore__summary-grid">
              {detailSummaryKeys.map((key) => (
                <div className="platform-backup-restore__summary-item" key={key}>
                  <span>{displaySummaryKey(key)}</span>
                  <strong>{summary[key] ?? 0}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-backup-restore__evidence-section">
            <OperationalSectionHeader
              iconPath="/platform/runbooks"
              title="Platform recovery evidence"
              description="Repository, runtime policy and implementation evidence used by the platform recovery controls. Configuration values themselves are not exposed."
            />
            <div className="platform-backup-restore__platform-grid">
              {platformEvidence.map(([key, value]) => (
                <div className="platform-backup-restore__platform-item" key={key}>
                  <span>{humanize(key)}</span>
                  <strong>{formatValue(value)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="platform-backup-restore__controls-section">
            <OperationalSectionHeader
              iconPath="/platform/runbooks"
              title="Platform recovery controls"
              description="Read-only platform controls covering export implementation, runbooks, backup-policy configuration and restore-drill verification."
            />
            <div className="platform-backup-restore__control-grid">
              {data.platform_controls.map((control) => (
                <article key={control.code} className="app-panel platform-backup-restore__control-card">
                  <div className="platform-backup-restore__control-heading">
                    <div>
                      <h3>{control.label}</h3>
                      <code>{control.code}</code>
                    </div>
                    <span className="platform-backup-restore__mini-badge" data-tone={badgeTone(control.status)}>
                      {displayStatus(control.status)}
                    </span>
                  </div>
                  <p>{control.launch_reason}</p>
                  <div className="platform-backup-restore__evidence-key">
                    <span>Evidence</span>
                    <code>{humanize(control.evidence_key)}</code>
                    <strong>{control.evidence_value ?? 'Not persisted'}</strong>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="platform-backup-restore__tenant-section">
            <OperationalSectionHeader
              iconPath="/platform/tenant-exports"
              title="Tenant recovery evidence"
              description="Per-tenant data scope and audited export-path evidence. Tenant export evidence is useful recovery evidence, but it is not a database restore."
            />
            {data.tenants.length === 0 ? (
              <div className="app-panel app-panel--padded platform-backup-restore__empty-state">
                No tenants match the current backup / restore filter.
              </div>
            ) : (
              <div className="platform-backup-restore__tenant-list">
                {data.tenants.map((tenant) => (
                  <article key={tenant.tenant_id} className="app-panel platform-backup-restore__tenant-card">
                    <div className="platform-backup-restore__tenant-header">
                      <div className="platform-backup-restore__tenant-title-wrap">
                        <span>{humanize(tenant.tenant_status)} lifecycle</span>
                        <h3>{tenant.tenant_name}</h3>
                        <code>{tenant.tenant_id}</code>
                      </div>
                      <span className="platform-backup-restore__status-badge" data-tone={badgeTone(tenant.status)}>
                        {displayStatus(tenant.status)}
                      </span>
                    </div>

                    <div className="platform-backup-restore__action-row">
                      <Link className="app-button app-button--secondary" to={tenantExportLink(tenant.tenant_id)}>Tenant export</Link>
                      <Link className="app-button app-button--secondary" to="/platform/runbooks?category=maintenance">Runbooks</Link>
                      <Link className="app-button app-button--secondary" to="/platform/documentation-completeness">Documentation</Link>
                    </div>

                    <div className="platform-backup-restore__evidence-grid">
                      {Object.entries(tenant.evidence).map(([key, value]) => (
                        <div key={key} className="platform-backup-restore__tenant-evidence">
                          <span>{humanize(key)}</span>
                          <strong>{formatValue(value)}</strong>
                        </div>
                      ))}
                    </div>

                    <div className="platform-backup-restore__control-status-grid">
                      {tenant.controls.map((control) => (
                        <div key={control.code} className="platform-backup-restore__tenant-control">
                          <span>{control.label}</span>
                          <strong>{formatValue(control.evidence_value)}</strong>
                          <em className="platform-backup-restore__mini-badge" data-tone={badgeTone(control.status)}>
                            {displayStatus(control.status)}
                          </em>
                        </div>
                      ))}
                    </div>

                    <div className="platform-backup-restore__missing-controls">
                      <strong>Controls needing attention</strong>
                      <span>{tenant.missing_control_codes.length ? tenant.missing_control_codes.map(humanize).join(', ') : 'None'}</span>
                    </div>

                    <div className="platform-backup-restore__next-step">
                      <strong>Next operator step</strong>
                      <span>{tenant.next_best_step}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
