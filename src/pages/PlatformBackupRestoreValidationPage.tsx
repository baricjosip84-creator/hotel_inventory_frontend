import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { platformApiRequest } from '../lib/platformApi';

type BackupRestoreControl = {
  code: string;
  label: string;
  evidence_key: string;
  launch_reason: string;
  evidence_value?: number;
  status?: string;
};

type BackupRestoreTenantRow = {
  tenant_id: string;
  tenant_name: string;
  tenant_status: string;
  status: string;
  evidence: Record<string, string | number | boolean | Record<string, number> | null>;
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
  platform_evidence: Record<string, string | number | boolean | null>;
  backup_restore_controls: BackupRestoreControl[];
  tenants: BackupRestoreTenantRow[];
  validation_note: string;
};

type Tenant = { id: string; name: string };

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}

function badgeStyle(value: string): CSSProperties {
  if (value.includes('blocked') || value.includes('missing')) {
    return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  }
  if (value.includes('review') || value.includes('required') || value.includes('drill')) {
    return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  }
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function formatValue(value: string | number | boolean | Record<string, number> | null | undefined) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'object') {
    return Object.entries(value).map(([key, count]) => `${key}: ${count}`).join(', ') || '-';
  }
  if (typeof value === 'string' && value.includes('T')) return new Date(value).toLocaleString();
  return String(value);
}

function tenantExportLink(tenantId: string) {
  const params = new URLSearchParams({ tenant_id: tenantId });
  return `/platform/tenant-exports?${params.toString()}`;
}

export default function PlatformBackupRestoreValidationPage() {
  const [tenantId, setTenantId] = useState('');

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'for-backup-restore-validation'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants')
  });

  const query = new URLSearchParams();
  if (tenantId) query.set('tenant_id', tenantId);

  const validation = useQuery({
    queryKey: ['platform', 'backup-restore-validation', tenantId],
    queryFn: () => platformApiRequest<BackupRestorePackage>(`/platform/backup-restore-validation?${query.toString()}`)
  });

  const data = validation.data;
  const summary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);

  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Platform Commercial Launch Readiness</p>
          <h1 style={styles.title}>Backup Restore Validation</h1>
          <p style={styles.description}>
            Step 213 joins tenant export coverage, backup/restore runbooks, rollback/recovery runbooks,
            core-data scope, and manual restore-drill requirements into one read-only launch validation board.
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

      <section style={styles.card}>
        <label style={styles.label} htmlFor="tenant-filter">Tenant filter</label>
        <select id="tenant-filter" value={tenantId} onChange={(event) => setTenantId(event.target.value)} style={styles.select}>
          <option value="">All tenants</option>
          {(tenants.data || []).map((tenant) => (
            <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
          ))}
        </select>
      </section>

      {validation.isLoading ? <div style={styles.card}>Loading backup restore validation...</div> : null}
      {validation.error ? (
        <div style={styles.error}>
          Failed to load backup restore validation.
          <button type="button" style={styles.errorButton} onClick={() => void validation.refetch()}>Retry</button>
        </div>
      ) : null}

      {data ? (
        <>
          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Snapshot metadata</h2>
            <div style={styles.metadataGrid}>
              <div><strong>Phase</strong><span>{data.phase}</span></div>
              <div><strong>Step</strong><span>{data.step}</span></div>
              <div><strong>Generated</strong><span>{data.generated_at ? new Date(data.generated_at).toLocaleString() : '-'}</span></div>
              <div><strong>Validation</strong><span>{data.validation_note}</span></div>
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
            <h2 style={styles.sectionTitle}>Platform evidence</h2>
            <div style={styles.evidenceGrid}>
              {Object.entries(data.platform_evidence).map(([key, value]) => (
                <div key={key} style={styles.evidenceItem}>
                  <span style={styles.evidenceLabel}>{humanize(key)}</span>
                  <strong>{formatValue(value)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Backup restore controls</h2>
            <div style={styles.controlGrid}>
              {data.backup_restore_controls.map((control) => (
                <article key={control.code} style={styles.controlCard}>
                  <strong>{control.label}</strong>
                  <p style={styles.reason}>{control.launch_reason}</p>
                  <span style={styles.help}>Evidence: {humanize(control.evidence_key)}</span>
                </article>
              ))}
            </div>
          </section>

          <section style={styles.rows}>
            {data.tenants.map((tenant) => (
              <article key={tenant.tenant_id} style={styles.tenantCard}>
                <div style={styles.tenantHeader}>
                  <div>
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
                      <strong>{formatValue(value)}</strong>
                    </div>
                  ))}
                </div>

                <div style={styles.controlGrid}>
                  {tenant.controls.map((control) => (
                    <div key={control.code} style={styles.controlCard}>
                      <div style={styles.controlHeader}>
                        <strong>{control.label}</strong>
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

          <section style={styles.note}>{data.validation_note}</section>
        </>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: 18 },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' },
  eyebrow: { margin: 0, color: '#6b7280', fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { margin: '4px 0', fontSize: 28 },
  description: { margin: 0, color: '#4b5563', maxWidth: 940, lineHeight: 1.5 },
  headerMeta: { display: 'grid', justifyItems: 'end', gap: 8 },
  generated: { color: '#6b7280', fontSize: 12 },
  badge: { padding: '7px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, textTransform: 'capitalize', whiteSpace: 'nowrap' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  label: { display: 'block', fontWeight: 800, marginBottom: 6 },
  select: { width: '100%', maxWidth: 420, border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 12px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 },
  metric: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16 },
  metricValue: { fontSize: 26, fontWeight: 900 },
  metricLabel: { color: '#6b7280', textTransform: 'capitalize', fontSize: 12, marginTop: 4 },
  sectionTitle: { margin: '0 0 12px', fontSize: 18 },
  controlGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 },
  controlCard: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#f9fafb' },
  controlHeader: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' },
  reason: { color: '#4b5563', lineHeight: 1.45, margin: '8px 0' },
  help: { color: '#6b7280', fontSize: 12 },
  rows: { display: 'grid', gap: 16 },
  tenantCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 18, display: 'grid', gap: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  tenantHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  tenantTitle: { margin: 0, fontSize: 20 },
  evidenceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 },
  evidenceItem: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, display: 'grid', gap: 4 },
  evidenceLabel: { color: '#6b7280', fontSize: 12, textTransform: 'capitalize' },
  nextStep: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 12, color: '#1e3a8a', lineHeight: 1.5 },
  note: { background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 14, padding: 14, color: '#9a3412', lineHeight: 1.5 },
  error: { background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 14, padding: 14, color: '#991b1b', display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' },
  errorButton: { border: '1px solid #991b1b', background: '#fff', color: '#991b1b', borderRadius: 8, padding: '6px 10px', fontWeight: 800, cursor: 'pointer' },
  secondaryButton: { border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', borderRadius: 10, padding: '8px 12px', fontWeight: 800, cursor: 'pointer' },
  metadataGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  quickLinks: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' },
  quickLink: { border: '1px solid #cbd5e1', borderRadius: '999px', padding: '4px 8px', color: '#0f766e', textDecoration: 'none', fontSize: '12px', fontWeight: 700 }
};
