import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { platformApiRequest } from '../lib/platformApi';

type ProvisioningControl = {
  code: string;
  label: string;
  evidence_key: string;
  launch_reason: string;
  evidence_value?: number;
  status?: string;
};

type ProvisioningPreset = {
  key: string;
  label: string;
  description: string;
  organization_type: string;
  feature_flags: Record<string, boolean>;
  limits: Record<string, number>;
  storage_locations: Array<{ name: string; temperature_zone?: string | null }>;
};

type ProvisioningTenantRow = {
  tenant_id: string;
  tenant_name: string;
  status: string;
  evidence: Record<string, string | number | null>;
  controls: ProvisioningControl[];
  missing_control_codes: string[];
  next_best_step: string;
};

type ProvisioningHardeningPackage = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  provisioning_presets: ProvisioningPreset[];
  hardening_controls: ProvisioningControl[];
  tenants: ProvisioningTenantRow[];
  validation_note: string;
};

type Tenant = { id: string; name: string };

const evidenceLabels: Record<string, string> = {
  organization_type: 'Organization type',
  plan_code: 'Commercial plan',
  billing_status: 'Billing status',
  feature_flag_count: 'Feature flag count',
  limit_count: 'Configured limit count',
  admin_user_count: 'Active admin count',
  storage_location_count: 'Active storage locations',
  provisioning_audit_count: 'Provisioning audit events',
  onboarding_task_count: 'Non-cancelled onboarding tasks',
  latest_provisioning_preset_key: 'Latest provisioning preset',
  latest_provisioning_audit_at: 'Latest provisioning audit',
  latest_onboarding_task_at: 'Latest onboarding handoff update'
};

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}

function badgeStyle(value: string): CSSProperties {
  if (value.includes('blocked') || value.includes('missing') || value.includes('incomplete')) {
    return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  }
  if (value.includes('no_tenants')) {
    return { ...styles.badge, background: '#f1f5f9', color: '#475569' };
  }
  if (value.includes('needs') || value.includes('ready_for_onboarding_task') || value.includes('review')) {
    return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  }
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string' && value.includes('T')) return new Date(value).toLocaleString();
  return String(value);
}

export default function PlatformTenantProvisioningHardeningPage() {
  const [searchParams] = useSearchParams();
  const [tenantId, setTenantId] = useState(searchParams.get('tenant_id') || '');
  const [limit, setLimit] = useState(searchParams.get('limit') || '100');

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'for-provisioning-hardening'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants'),
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });

  const query = new URLSearchParams();
  if (tenantId) query.set('tenant_id', tenantId);
  query.set('limit', limit);

  const hardening = useQuery({
    queryKey: ['platform', 'tenant-provisioning-hardening', tenantId, limit],
    queryFn: () => platformApiRequest<ProvisioningHardeningPackage>(`/platform/tenant-provisioning-hardening?${query.toString()}`),
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });

  const data = hardening.data;
  const summary = data?.summary || {};
  const summaryKeys = [
    'tenants_total',
    'hardened_for_onboarding',
    'missing_provisioning_evidence',
    'missing_initial_admin',
    'missing_starter_locations',
    'missing_audit_trail',
    'missing_onboarding_handoff',
    'total_controls',
    'controls_with_evidence'
  ];

  const selectedTenantName = useMemo(() => (tenants.data || []).find((tenant) => tenant.id === tenantId)?.name, [tenantId, tenants.data]);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Tenant provisioning hardening</h1>
          <p style={styles.subtitle}>Read-only launch gate for explicit preset evidence, commercial plan and billing seed, active tenant admin, starter locations, provisioning audit trail, and onboarding handoff.</p>
        </div>
        {data ? <span style={badgeStyle(data.posture)}>{humanize(data.posture)}</span> : null}
      </header>

      <section style={styles.panel}>
        <div style={styles.filterGrid}>
          <div style={styles.filterControl}>
            <label style={styles.label} htmlFor="provisioning-hardening-tenant-filter">Tenant filter</label>
            <select id="provisioning-hardening-tenant-filter" style={styles.input} value={tenantId} onChange={(event) => setTenantId(event.target.value)}>
              <option value="">All tenants</option>
              {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </div>
          <div style={styles.filterControl}>
            <label style={styles.label} htmlFor="provisioning-hardening-tenant-limit">Tenant limit</label>
            <select id="provisioning-hardening-tenant-limit" style={styles.input} value={limit} onChange={(event) => setLimit(event.target.value)} disabled={Boolean(tenantId)}>
              <option value="25">Latest 25 tenants</option>
              <option value="50">Latest 50 tenants</option>
              <option value="100">Latest 100 tenants</option>
              <option value="300">Latest 300 tenants</option>
            </select>
          </div>
          <button style={styles.secondaryButton} onClick={() => hardening.refetch()} disabled={hardening.isFetching}>
            {hardening.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {selectedTenantName ? <span style={styles.help}>Showing provisioning evidence for {selectedTenantName}.</span> : <span style={styles.help}>Showing the latest {limit} tenants by creation date.</span>}
        {tenants.error ? <span style={styles.errorText}>Tenant filter options could not be loaded. The hardening board can still be reviewed with its current filter.</span> : null}
      </section>

      {hardening.isLoading ? <section style={styles.card}>Loading provisioning hardening board…</section> : null}
      {hardening.error ? (
        <section style={styles.errorCard}>
          <strong>Unable to load provisioning hardening board.</strong>
          <span style={styles.errorText}>{hardening.error instanceof Error ? hardening.error.message : 'The platform request failed.'}</span>
          <button style={styles.inlineButton} onClick={() => hardening.refetch()} disabled={hardening.isFetching}>Retry</button>
        </section>
      ) : null}

      {data ? (
        <>
          <section style={styles.metaCard}>
            <div><strong>{data.phase}</strong><br /><span style={styles.help}>{data.step}</span></div>
            <div><strong>Generated</strong><br /><span style={styles.help}>{new Date(data.generated_at).toLocaleString()}</span></div>
            <div style={styles.note}>{data.validation_note}</div>
          </section>

          <section style={styles.summaryGrid}>
            {summaryKeys.map((key) => (
              <div key={key} style={styles.card}>
                <strong>{humanize(key)}</strong>
                <div style={styles.metric}>{summary[key] ?? 0}</div>
              </div>
            ))}
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Available commercial presets</h2>
            <p style={styles.sectionHelp}>These are the presets the live provisioning service can apply. A tenant is not treated as preset-provisioned merely because its current fields resemble one of these presets; the hardening board also requires explicit provisioning audit evidence.</p>
            <div style={styles.presetGrid}>
              {data.provisioning_presets.map((preset) => (
                <article key={preset.key} style={styles.presetCard}>
                  <strong>{preset.label}</strong>
                  <span style={styles.help}>{preset.description}</span>
                  <span style={styles.help}>Organization type: {preset.organization_type}</span>
                  <span style={styles.help}>Starter locations: {preset.storage_locations.length}</span>
                  <span style={styles.help}>Feature flags: {Object.keys(preset.feature_flags || {}).length}</span>
                  <span style={styles.help}>Configured limits: {Object.keys(preset.limits || {}).length}</span>
                </article>
              ))}
            </div>
          </section>

          <section style={styles.areaGrid}>
            {data.tenants.map((tenant) => (
              <article key={tenant.tenant_id} style={styles.tenantCard}>
                <div style={styles.areaHeader}>
                  <div>
                    <h2 style={styles.areaTitle}>{tenant.tenant_name}</h2>
                    <div style={styles.help}>{tenant.tenant_id}</div>
                  </div>
                  <span style={badgeStyle(tenant.status)}>{humanize(tenant.status)}</span>
                </div>

                <div style={styles.evidenceGrid}>
                  {[
                    'organization_type',
                    'plan_code',
                    'billing_status',
                    'feature_flag_count',
                    'limit_count',
                    'admin_user_count',
                    'storage_location_count',
                    'provisioning_audit_count',
                    'onboarding_task_count',
                    'latest_provisioning_preset_key',
                    'latest_provisioning_audit_at',
                    'latest_onboarding_task_at'
                  ].map((key) => (
                    <div key={key} style={styles.evidenceCard}>
                      <strong>{evidenceLabels[key] || humanize(key)}</strong>
                      <span style={styles.evidenceValue}>{formatValue(tenant.evidence[key])}</span>
                    </div>
                  ))}
                </div>

                <div style={styles.checklistGrid}>
                  {tenant.controls.map((control) => (
                    <div key={control.code} style={styles.checklistRow}>
                      <div style={styles.checklistCopy}>
                        <strong>{control.label}</strong>
                        <div style={styles.help}>{control.launch_reason}</div>
                      </div>
                      <div style={styles.checklistStatus}>
                        <span style={badgeStyle(control.status || 'missing_evidence')}>{humanize(control.status || 'missing_evidence')}</span>
                        <span style={styles.help}>Evidence: {control.evidence_value ?? 0}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={styles.nextStep}><strong>Next best step:</strong> {tenant.next_best_step}</div>
                <div style={styles.actionRow}>
                  <Link style={styles.linkButton} to="/platform/tenants">Open tenants</Link>
                  <Link style={styles.linkButton} to="/platform/provisioning">Open provisioning</Link>
                  <Link style={styles.linkButton} to={`/platform/tenant-tasks?tenant_id=${tenant.tenant_id}&category=onboarding`}>Open onboarding tasks</Link>
                  <Link style={styles.linkButton} to="/platform/audit">Open platform audit</Link>
                </div>
              </article>
            ))}
            {!hardening.isLoading && data.tenants.length === 0 ? <section style={styles.card}>No tenants found for this board.</section> : null}
          </section>
        </>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 20, color: '#0f172a' },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 28, lineHeight: 1.15, letterSpacing: '-.025em', color: '#0f172a' },
  subtitle: { margin: '6px 0 0', color: '#64748b', maxWidth: 900 },
  badge: { padding: '8px 12px', borderRadius: 999, fontWeight: 800, whiteSpace: 'nowrap', fontSize: 12, textTransform: 'capitalize' },
  panel: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, display: 'grid', gap: 8, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)' },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, alignItems: 'end' },
  filterControl: { display: 'grid', gap: 8 },
  label: { fontWeight: 800 },
  input: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', maxWidth: 420 },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)' },
  errorCard: { background: '#fff7f7', border: '1px solid #fecaca', borderRadius: 14, padding: 18, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  errorText: { color: '#991b1b', fontSize: 12, lineHeight: 1.5, overflowWrap: 'anywhere' },
  metaCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 },
  note: { color: '#334155', lineHeight: 1.5, overflowWrap: 'anywhere' },
  help: { color: '#64748b', fontSize: 12, overflowWrap: 'anywhere' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  metric: { fontSize: 30, lineHeight: 1.1, fontWeight: 800, marginTop: 8, color: '#0f172a' },
  sectionTitle: { margin: '0 0 8px', fontSize: 20, letterSpacing: '-.015em', color: '#0f172a' },
  sectionHelp: { margin: '0 0 14px', color: '#64748b', fontSize: 13, lineHeight: 1.5, maxWidth: 980 },
  presetGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  presetCard: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, display: 'grid', gap: 6, background: '#f8fafc', minWidth: 0 },
  areaGrid: { display: 'grid', gap: 16 },
  tenantCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 18, display: 'grid', gap: 16, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  areaHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' },
  areaTitle: { margin: 0, fontSize: 20 },
  evidenceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 },
  evidenceCard: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, display: 'grid', gap: 8, background: '#f8fafc', minWidth: 0 },
  evidenceValue: { overflowWrap: 'anywhere' },
  checklistGrid: { display: 'grid', gap: 10 },
  checklistRow: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' },
  checklistCopy: { flex: '1 1 360px', minWidth: 0 },
  checklistStatus: { display: 'grid', gap: 6, justifyItems: 'end' },
  nextStep: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, color: '#0f172a', lineHeight: 1.5, overflowWrap: 'anywhere' },
  secondaryButton: { border: '1px solid #cbd5e1', background: '#fff', borderRadius: 9, padding: '10px 14px', fontWeight: 700, cursor: 'pointer' },
  inlineButton: { marginLeft: 10, border: '1px solid #cbd5e1', background: '#fff', borderRadius: 8, padding: '6px 10px', fontWeight: 700, cursor: 'pointer' },
  actionRow: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  linkButton: { border: '1px solid #cbd5e1', background: '#fff', borderRadius: 9, padding: '8px 12px', fontWeight: 800, color: '#1d4ed8', textDecoration: 'none' }
};
