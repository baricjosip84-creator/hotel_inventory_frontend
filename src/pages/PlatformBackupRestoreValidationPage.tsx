import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { platformApiRequest } from '../lib/platformApi';

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

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}

function badgeStyle(value: string): CSSProperties {
  if (value === 'loading' || value.includes('no_tenants') || value.includes('not_available')) {
    return { ...styles.badge, background: '#f1f5f9', color: '#475569' };
  }
  if (value.includes('review') || value.includes('manual') || value.includes('sample')) {
    return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  }
  if (value.includes('blocked') || value.includes('missing')) {
    return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  }
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function formatValue(value: EvidenceValue | undefined) {
  if (value === null || value === undefined || value === '') return 'Not available';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'none';
  if (typeof value === 'object') {
    return Object.entries(value).map(([key, count]) => `${key}: ${count}`).join(', ') || 'none';
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleString();
  return String(value);
}

function readableError(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Unknown error';
}

function tenantExportLink(tenantId: string) {
  const params = new URLSearchParams({ tenant_id: tenantId });
  return `/platform/tenant-exports?${params.toString()}`;
}

export default function PlatformBackupRestoreValidationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tenantId, setTenantId] = useState(searchParams.get('tenant_id') || '');

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'for-backup-restore-validation'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants'),
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });

  const query = new URLSearchParams();
  if (tenantId) query.set('tenant_id', tenantId);

  const validation = useQuery({
    queryKey: ['platform', 'backup-restore-validation', tenantId],
    queryFn: () => {
      const queryString = query.toString();
      return platformApiRequest<BackupRestorePackage>(`/platform/backup-restore-validation${queryString ? `?${queryString}` : ''}`);
    },
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });

  const data = validation.data;
  const summary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const platformEvidence = useMemo(() => Object.entries(data?.platform_evidence || {}), [data?.platform_evidence]);

  function changeTenant(nextTenantId: string) {
    setTenantId(nextTenantId);
    const nextParams = new URLSearchParams(searchParams);
    if (nextTenantId) nextParams.set('tenant_id', nextTenantId);
    else nextParams.delete('tenant_id');
    setSearchParams(nextParams, { replace: true });
  }

  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Platform Commercial Launch Readiness</p>
          <h1 style={styles.title}>Backup Restore Validation</h1>
          <p style={styles.description}>
            Step 213 combines repository backup/recovery foundations, runtime backup-policy configuration,
            tenant export evidence, and tenant data scope into one read-only technical recovery precheck.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={badgeStyle(data?.posture || 'loading')}>{humanize(data?.posture || 'loading')}</span>
          <span style={styles.generated}>{data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'Not generated yet'}</span>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => { void tenants.refetch(); void validation.refetch(); }}
            disabled={tenants.isFetching || validation.isFetching}
          >
            {tenants.isFetching || validation.isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </section>

      <section style={styles.notice}>
        <strong>Operator precheck only.</strong> The application does not execute production database backups, restore databases,
        verify an external backup provider, or persist restore-drill completion. A clear tenant export scope is not disaster-recovery
        certification; a real isolated restore drill and operator-owned provider evidence are still required.
      </section>

      <section style={styles.card}>
        <label style={styles.label} htmlFor="backup-restore-tenant-filter">Tenant filter</label>
        <select
          id="backup-restore-tenant-filter"
          value={tenantId}
          onChange={(event) => changeTenant(event.target.value)}
          style={styles.select}
          disabled={tenants.isLoading}
        >
          <option value="">All tenants</option>
          {(tenants.data || []).map((tenant) => (
            <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
          ))}
        </select>
        {tenants.error ? (
          <p style={styles.inlineError}>Tenant filter options could not be loaded: {readableError(tenants.error)}</p>
        ) : null}
      </section>

      {validation.isLoading ? <div style={styles.card}>Loading backup restore validation...</div> : null}
      {validation.error ? (
        <div style={styles.error}>
          <span>Unable to load backup restore validation: {readableError(validation.error)}</span>
          <button
            type="button"
            style={styles.errorButton}
            onClick={() => void validation.refetch()}
            disabled={validation.isFetching}
          >
            {validation.isFetching ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      ) : null}

      {data ? (
        <>
          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Snapshot metadata</h2>
            <div style={styles.metadataGrid}>
              <div style={styles.metadataItem}><strong>Phase</strong><span>{data.phase}</span></div>
              <div style={styles.metadataItem}><strong>Step</strong><span>{data.step}</span></div>
              <div style={styles.metadataItem}><strong>Generated</strong><span>{data.generated_at ? new Date(data.generated_at).toLocaleString() : '-'}</span></div>
              <div style={styles.metadataItem}><strong>Validation</strong><span>{data.validation_note}</span></div>
            </div>
          </section>

          <section style={styles.grid}>
            {summary.map(([key, value]) => (
              <div key={key} style={styles.metric}>
                <div style={styles.metricValue}>{value}</div>
                <div style={styles.metricLabel}>{humanize(key)}</div>
              </div>
            ))}
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Platform recovery evidence</h2>
            <div style={styles.evidenceGrid}>
              {platformEvidence.map(([key, value]) => (
                <div key={key} style={styles.evidenceItem}>
                  <span style={styles.evidenceLabel}>{humanize(key)}</span>
                  <strong style={styles.breakAnywhere}>{formatValue(value)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Platform recovery controls</h2>
            <div style={styles.controlGrid}>
              {data.platform_controls.map((control) => (
                <article key={control.code} style={styles.controlCard}>
                  <div style={styles.controlHeader}>
                    <strong style={styles.breakAnywhere}>{control.label}</strong>
                    <span style={badgeStyle(control.status || 'missing')}>{humanize(control.status || 'missing')}</span>
                  </div>
                  <p style={styles.reason}>{control.launch_reason}</p>
                  <span style={styles.help}>Evidence: {humanize(control.evidence_key)} · value: {control.evidence_value ?? 'not persisted'}</span>
                </article>
              ))}
            </div>
          </section>

          <section style={styles.rows}>
            {data.tenants.length === 0 ? (
              <div style={styles.card}>No tenants match the current backup/restore filter.</div>
            ) : data.tenants.map((tenant) => (
              <article key={tenant.tenant_id} style={styles.tenantCard}>
                <div style={styles.tenantHeader}>
                  <div style={styles.minWidthZero}>
                    <h2 style={styles.tenantTitle}>{tenant.tenant_name}</h2>
                    <span style={styles.help}>Tenant status: {humanize(tenant.tenant_status || 'unknown')}</span>
                    <div style={styles.quickLinks}>
                      <Link style={styles.quickLink} to={tenantExportLink(tenant.tenant_id)}>Tenant export</Link>
                      <Link style={styles.quickLink} to="/platform/runbooks?category=maintenance">Runbooks</Link>
                      <Link style={styles.quickLink} to="/platform/documentation-completeness">Documentation</Link>
                    </div>
                  </div>
                  <span style={badgeStyle(tenant.status)}>{humanize(tenant.status)}</span>
                </div>

                <div style={styles.evidenceGrid}>
                  {Object.entries(tenant.evidence).map(([key, value]) => (
                    <div key={key} style={styles.evidenceItem}>
                      <span style={styles.evidenceLabel}>{humanize(key)}</span>
                      <strong style={styles.breakAnywhere}>{formatValue(value)}</strong>
                    </div>
                  ))}
                </div>

                <div style={styles.controlGrid}>
                  {tenant.controls.map((control) => (
                    <div key={control.code} style={styles.controlCard}>
                      <div style={styles.controlHeader}>
                        <strong style={styles.breakAnywhere}>{control.label}</strong>
                        <span style={badgeStyle(control.status || 'missing')}>{humanize(control.status || 'missing')}</span>
                      </div>
                      <p style={styles.reason}>{control.launch_reason}</p>
                      <span style={styles.help}>Evidence value: {control.evidence_value ?? 0}</span>
                    </div>
                  ))}
                </div>

                <div style={styles.nextStep}><strong>Next best step:</strong> {tenant.next_best_step}</div>
              </article>
            ))}
          </section>

          <section style={styles.note}><strong>Validation boundary:</strong> {data.validation_note}</section>
        </>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: 18, minWidth: 0, color: '#0f172a' },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' },
  eyebrow: { margin: 0, color: '#64748b', fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { margin: '4px 0', fontSize: 28, lineHeight: 1.15, letterSpacing: '-.025em', color: '#0f172a' },
  description: { margin: 0, color: '#64748b', maxWidth: 940, lineHeight: 1.5 },
  headerMeta: { display: 'grid', justifyItems: 'end', gap: 8 },
  generated: { color: '#64748b', fontSize: 12 },
  badge: { padding: '7px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, textTransform: 'capitalize', whiteSpace: 'nowrap' },
  notice: { background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 14, padding: 14, color: '#334155', lineHeight: 1.5 },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  label: { display: 'block', fontWeight: 800, marginBottom: 6 },
  select: { width: 'min(100%, 420px)', border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' },
  inlineError: { color: '#991b1b', margin: '10px 0 0', fontSize: 13 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 },
  metric: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  metricValue: { fontSize: 30, lineHeight: 1.1, fontWeight: 800, color: '#0f172a', overflowWrap: 'anywhere' },
  metricLabel: { color: '#64748b', textTransform: 'capitalize', fontSize: 12, marginTop: 4, overflowWrap: 'anywhere' },
  sectionTitle: { margin: '0 0 12px', fontSize: 18, letterSpacing: '-.015em', color: '#0f172a' },
  controlGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 },
  controlCard: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc', minWidth: 0 },
  controlHeader: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' },
  reason: { color: '#334155', lineHeight: 1.45, margin: '8px 0', overflowWrap: 'anywhere' },
  help: { color: '#64748b', fontSize: 12, overflowWrap: 'anywhere' },
  rows: { display: 'grid', gap: 16 },
  tenantCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 18, display: 'grid', gap: 14, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  tenantHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' },
  tenantTitle: { margin: 0, fontSize: 20, overflowWrap: 'anywhere' },
  evidenceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 },
  evidenceItem: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, display: 'grid', gap: 4, minWidth: 0 },
  evidenceLabel: { color: '#64748b', fontSize: 12, textTransform: 'capitalize', overflowWrap: 'anywhere' },
  nextStep: { background: 'var(--io-primary-soft)', border: '1px solid var(--io-primary-border)', borderRadius: 12, padding: 12, color: 'var(--io-primary-deep)', lineHeight: 1.5, overflowWrap: 'anywhere' },
  note: { background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 14, padding: 14, color: '#9a3412', lineHeight: 1.5, overflowWrap: 'anywhere' },
  error: { background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 14, padding: 14, color: '#991b1b', display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  errorButton: { border: '1px solid #991b1b', background: '#fff', color: '#991b1b', borderRadius: 8, padding: '6px 10px', fontWeight: 800, cursor: 'pointer' },
  secondaryButton: { border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', borderRadius: 9, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' },
  metadataGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  metadataItem: { display: 'grid', gap: 4, minWidth: 0, overflowWrap: 'anywhere' },
  quickLinks: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  quickLink: { border: '1px solid #cbd5e1', borderRadius: 999, padding: '4px 8px', color: 'var(--io-primary-dark)', textDecoration: 'none', fontSize: 12, fontWeight: 700 },
  breakAnywhere: { overflowWrap: 'anywhere' },
  minWidthZero: { minWidth: 0 }
};
