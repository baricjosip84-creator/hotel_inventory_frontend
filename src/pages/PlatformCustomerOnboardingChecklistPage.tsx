import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { platformApiRequest } from '../lib/platformApi';

type ChecklistItem = {
  code: string;
  label: string;
  evidence_key: string;
  launch_reason: string;
  evidence_value?: number;
  status?: string;
};

type TenantOnboardingRow = {
  tenant_id: string;
  tenant_name: string;
  status: string;
  evidence: Record<string, string | number | null>;
  checklist: ChecklistItem[];
  missing_checklist_codes: string[];
  next_best_step: string;
};

type OnboardingChecklistPackage = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  checklist_items: ChecklistItem[];
  tenants: TenantOnboardingRow[];
  validation_note: string;
};

type Tenant = { id: string; name: string };

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}

function badgeStyle(value: string): CSSProperties {
  if (value.includes('blocked') || value.includes('missing') || value.includes('incomplete')) {
    return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  }
  if (value.includes('needs') || value.includes('manual')) {
    return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  }
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string' && value.includes('T')) return new Date(value).toLocaleString();
  return String(value);
}

export default function PlatformCustomerOnboardingChecklistPage() {
  const [searchParams] = useSearchParams();
  const [tenantId, setTenantId] = useState(searchParams.get('tenant_id') || '');
  const [limit, setLimit] = useState(searchParams.get('limit') || '100');

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'for-customer-onboarding-checklist'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants')
  });

  const query = new URLSearchParams();
  if (tenantId) query.set('tenant_id', tenantId);
  query.set('limit', limit);

  const checklist = useQuery({
    queryKey: ['platform', 'customer-onboarding-checklist', tenantId, limit],
    queryFn: () => platformApiRequest<OnboardingChecklistPackage>(`/platform/customer-onboarding-checklist?${query.toString()}`)
  });

  const data = checklist.data;
  const summary = data?.summary || {};
  const summaryKeys = [
    'tenants_total',
    'ready_for_first_use',
    'blocked_by_tasks',
    'missing_evidence',
    'with_overdue_onboarding_tasks',
    'total_checklist_items',
    'checklist_items_with_evidence'
  ];

  const selectedTenantName = useMemo(() => (tenants.data || []).find((tenant) => tenant.id === tenantId)?.name, [tenantId, tenants.data]);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Customer onboarding checklist</h1>
          <p style={styles.subtitle}>First-use evidence for company profile, tenant admin, products, locations, stock or receiving, and first report review.</p>
        </div>
        {data ? <span style={badgeStyle(data.posture)}>{humanize(data.posture)}</span> : null}
      </header>

      <section style={styles.panel}>
        <div style={styles.filterGrid}>
          <div style={styles.filterControl}>
            <label style={styles.label}>Tenant filter</label>
            <select style={styles.input} value={tenantId} onChange={(event) => setTenantId(event.target.value)}>
              <option value="">All tenants</option>
              {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </div>
          <div style={styles.filterControl}>
            <label style={styles.label}>Tenant limit</label>
            <select style={styles.input} value={limit} onChange={(event) => setLimit(event.target.value)} disabled={Boolean(tenantId)}>
              <option value="25">Latest 25 tenants</option>
              <option value="50">Latest 50 tenants</option>
              <option value="100">Latest 100 tenants</option>
              <option value="300">Latest 300 tenants</option>
            </select>
          </div>
          <button style={styles.secondaryButton} onClick={() => checklist.refetch()} disabled={checklist.isFetching}>
            {checklist.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {selectedTenantName ? <span style={styles.help}>Showing onboarding evidence for {selectedTenantName}.</span> : <span style={styles.help}>Showing the latest {limit} tenants by creation date.</span>}
      </section>

      {checklist.isLoading ? <section style={styles.card}>Loading onboarding checklist…</section> : null}
      {checklist.error ? <section style={styles.card}>Unable to load onboarding checklist. <button style={styles.inlineButton} onClick={() => checklist.refetch()}>Retry</button></section> : null}

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
                  {['admin_user_count', 'product_count', 'storage_location_count', 'stock_row_count', 'shipment_count', 'onboarding_task_count', 'onboarding_task_completed_count', 'onboarding_task_overdue_count'].map((key) => (
                    <div key={key} style={styles.evidenceCard}>
                      <strong>{humanize(key)}</strong>
                      <span>{formatValue(tenant.evidence[key])}</span>
                    </div>
                  ))}
                </div>

                <div style={styles.checklistGrid}>
                  {tenant.checklist.map((item) => (
                    <div key={item.code} style={styles.checklistRow}>
                      <div>
                        <strong>{item.label}</strong>
                        <div style={styles.help}>{item.launch_reason}</div>
                      </div>
                      <div style={styles.checklistStatus}>
                        <span style={badgeStyle(item.status || 'missing_evidence')}>{humanize(item.status || 'missing_evidence')}</span>
                        <span style={styles.help}>Evidence: {item.evidence_value ?? 0}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={styles.nextStep}><strong>Next best step:</strong> {tenant.next_best_step}</div>
                <div style={styles.actionRow}>
                  <Link style={styles.linkButton} to="/platform/tenants">Open tenants</Link>
                  <Link style={styles.linkButton} to={`/platform/tenant-tasks?tenant_id=${tenant.tenant_id}&category=onboarding`}>Open onboarding tasks</Link>
                </div>
              </article>
            ))}
            {!checklist.isLoading && data.tenants.length === 0 ? <section style={styles.card}>No tenants found for this checklist.</section> : null}
          </section>
        </>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 20 },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' },
  title: { margin: 0, fontSize: 28 },
  subtitle: { margin: '6px 0 0', color: '#6b7280', maxWidth: 900 },
  badge: { padding: '8px 12px', borderRadius: 999, fontWeight: 800, whiteSpace: 'nowrap', fontSize: 12, textTransform: 'capitalize' },
  panel: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, display: 'grid', gap: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, alignItems: 'end' },
  filterControl: { display: 'grid', gap: 8 },
  label: { fontWeight: 800 },
  input: { border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 12px', maxWidth: 420 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  metaCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 },
  note: { color: '#374151', lineHeight: 1.5 },
  help: { color: '#6b7280', fontSize: 12 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  metric: { fontSize: 28, fontWeight: 900, marginTop: 8 },
  areaGrid: { display: 'grid', gap: 16 },
  tenantCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 18, display: 'grid', gap: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  areaHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  areaTitle: { margin: 0, fontSize: 20 },
  evidenceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 },
  evidenceCard: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'grid', gap: 8, background: '#f9fafb' },
  checklistGrid: { display: 'grid', gap: 10 },
  checklistRow: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' },
  checklistStatus: { display: 'grid', gap: 6, justifyItems: 'end' },
  nextStep: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, color: '#111827', lineHeight: 1.5 },
  secondaryButton: { border: '1px solid #d1d5db', background: '#fff', borderRadius: 10, padding: '10px 14px', fontWeight: 800, cursor: 'pointer' },
  inlineButton: { marginLeft: 10, border: '1px solid #d1d5db', background: '#fff', borderRadius: 8, padding: '6px 10px', fontWeight: 800, cursor: 'pointer' },
  actionRow: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  linkButton: { border: '1px solid #d1d5db', background: '#fff', borderRadius: 10, padding: '8px 12px', fontWeight: 800, color: '#111827', textDecoration: 'none' }
};
