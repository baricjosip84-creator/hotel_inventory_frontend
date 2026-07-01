import { useMemo, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type ClosureRow = {
  code: string;
  source_exception_code: string;
  domain: string;
  owner: string;
  severity_hint: string;
  source_exception_review_status: string;
  required_review_evidence: string[];
  required_closure_evidence: string[];
  closure_controls: string[];
  closure_status: string;
  release_condition: string;
};



type PageLink = {
  label: string;
  to: string;
};

const supportingLinks: PageLink[] = [
  { label: 'Exception Review', to: '/platform/commercial-launch-steady-state-exception-review' },
  { label: 'Operations Cadence', to: '/platform/commercial-launch-steady-state-operations-cadence' },
  { label: 'Steady-State Transition', to: '/platform/commercial-launch-steady-state-transition' },
  { label: 'Support Cockpit', to: '/platform/support-cockpit' },
  { label: 'Incidents', to: '/platform/incidents' },
  { label: 'Billing', to: '/platform/billing' },
  { label: 'Backup Restore', to: '/platform/backup-restore-validation' }
];

const sourcePostureLinks: PageLink[] = [
  { label: 'Exception review', to: '/platform/commercial-launch-steady-state-exception-review' },
  { label: 'Operations cadence', to: '/platform/commercial-launch-steady-state-operations-cadence' },
  { label: 'Steady-state transition', to: '/platform/commercial-launch-steady-state-transition' }
];

function evidenceLinksForRow(row: ClosureRow): PageLink[] {
  const links: PageLink[] = [
    { label: 'Exception Review', to: '/platform/commercial-launch-steady-state-exception-review' }
  ];

  if (row.domain.includes('missed_cadence')) {
    links.push({ label: 'Operations Cadence', to: '/platform/commercial-launch-steady-state-operations-cadence' });
    links.push({ label: 'Steady-State Transition', to: '/platform/commercial-launch-steady-state-transition' });
    links.push({ label: 'Monitoring Readiness', to: '/platform/monitoring-readiness' });
  }
  if (row.domain.includes('health_regression')) {
    links.push({ label: 'System Health', to: '/platform/system-health' });
    links.push({ label: 'Dependencies', to: '/platform/dependencies' });
    links.push({ label: 'Deployment Validation', to: '/platform/deployment-validation' });
  }
  if (row.domain.includes('customer_adoption')) {
    links.push({ label: 'Customer Success', to: '/platform/customer-success' });
    links.push({ label: 'Announcements', to: '/platform/announcements' });
  }
  if (row.domain.includes('support_sla')) {
    links.push({ label: 'Support Cockpit', to: '/platform/support-cockpit' });
    links.push({ label: 'Incidents', to: '/platform/incidents' });
  }
  if (row.domain.includes('billing_entitlement')) {
    links.push({ label: 'Billing', to: '/platform/billing' });
    links.push({ label: 'Tenants', to: '/platform/tenants' });
  }
  if (row.domain.includes('backup_restore')) {
    links.push({ label: 'Backup Restore', to: '/platform/backup-restore-validation' });
    links.push({ label: 'Tenant Exports', to: '/platform/tenant-exports' });
  }
  if (row.domain.includes('deployment_smoke_test')) {
    links.push({ label: 'Smoke Test', to: '/platform/commercial-launch-smoke-test-checklist' });
    links.push({ label: 'Releases', to: '/platform/releases' });
  }
  if (row.domain.includes('incident_prevention')) {
    links.push({ label: 'Incident Closure', to: '/platform/commercial-launch-incident-closure' });
    links.push({ label: 'Prevention Verification', to: '/platform/commercial-launch-prevention-verification' });
    links.push({ label: 'Runbooks', to: '/platform/runbooks' });
  }
  if (row.domain.includes('growth_governance')) {
    links.push({ label: 'Growth Observation', to: '/platform/commercial-launch-additional-growth-observation' });
    links.push({ label: 'Additional Growth Authorization', to: '/platform/commercial-launch-additional-growth-authorization' });
    links.push({ label: 'Expansion Health', to: '/platform/commercial-launch-expansion-health-observation' });
  }

  return links;
}

function renderLinks(links: PageLink[]) {
  return (
    <div style={styles.linkList}>
      {links.map((link) => (
        <a key={`${link.label}-${link.to}`} href={link.to} style={styles.link}>{link.label}</a>
      ))}
    </div>
  );
}


type ExceptionClosure = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  closure_rows: ClosureRow[];
  exception_review_posture: string;
  operations_cadence_posture: string;
  steady_state_transition_posture: string;
  closure_rules: string[];
  closure_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}

function badgeStyle(value: string): CSSProperties {
  if (value.includes('critical') || value.includes('blocked') || value.includes('rollback') || value.includes('hold')) return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  if (value.includes('high') || value.includes('waiting') || value.includes('manual') || value.includes('unclosed')) return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

export default function PlatformCommercialLaunchSteadyStateExceptionClosurePage() {
  const exceptionClosure = useQuery({
    queryKey: ['platform', 'commercial-launch-steady-state-exception-closure'],
    queryFn: () => platformApiRequest<ExceptionClosure>('/platform/commercial-launch-steady-state-exception-closure')
  });

  const data = exceptionClosure.data;
  const summary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);

  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Platform Commercial Launch Readiness</p>
          <h1 style={styles.title}>Commercial Launch Steady-State Exception Closure</h1>
          <p style={styles.description}>
            Step 233 turns steady-state exception review rows into a read-only closure board. It requires
            domain-specific closure evidence, owner signoff, and post-closure validation before commercial launch
            steady-state governance can be treated as closed.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={badgeStyle(data?.posture || 'loading')}>{humanize(data?.posture || 'loading')}</span>
          <span style={styles.generated}>{data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'Not generated yet'}</span>
          <button type="button" style={styles.button} onClick={() => exceptionClosure.refetch()} disabled={exceptionClosure.isFetching}>
            {exceptionClosure.isFetching ? 'Refreshing...' : exceptionClosure.error ? 'Retry' : 'Refresh'}
          </button>
        </div>
      </section>

      {exceptionClosure.isLoading ? <div style={styles.card}>Loading commercial launch steady-state exception closure board...</div> : null}
      {exceptionClosure.error ? <div style={styles.error}>Failed to load commercial launch steady-state exception closure board.</div> : null}

      {data ? (
        <>
          <section style={styles.grid}>
            {summary.map(([key, value]) => (
              <article key={key} style={styles.metricCard}>
                <span style={styles.metricLabel}>{humanize(key)}</span>
                <strong style={styles.metricValue}>{value}</strong>
              </article>
            ))}
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Snapshot metadata</h2>
            <div style={styles.metaGrid}>
              <span><strong>Phase:</strong> {data.phase}</span>
              <span><strong>Step:</strong> {data.step}</span>
              <span><strong>Generated:</strong> {new Date(data.generated_at).toLocaleString()}</span>
              <span><strong>Overall posture:</strong> {humanize(data.posture)}</span>
            </div>
            <div style={styles.supportingLinks}>{renderLinks(supportingLinks)}</div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Closure dependency chain</h2>
            <div style={styles.chainGrid}>
              {sourcePostureLinks.map((link) => {
                const postureMap: Record<string, string> = {
                  'Exception review': data.exception_review_posture,
                  'Operations cadence': data.operations_cadence_posture,
                  'Steady-state transition': data.steady_state_transition_posture
                };
                return (
                  <span key={link.label}>
                    <a href={link.to} style={styles.inlineLink}>{link.label}</a>: <strong>{humanize(postureMap[link.label] || 'unknown')}</strong>
                  </span>
                );
              })}
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Exception closure rows</h2>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Code</th>
                    <th style={styles.th}>Domain</th>
                    <th style={styles.th}>Owner</th>
                    <th style={styles.th}>Severity</th>
                    <th style={styles.th}>Closure status</th>
                    <th style={styles.th}>Required closure evidence</th>
                    <th style={styles.th}>Controls</th>
                    <th style={styles.th}>Evidence links</th>
                  </tr>
                </thead>
                <tbody>
                  {data.closure_rows.map((row) => (
                    <tr key={row.code}>
                      <td style={styles.td}><strong>{humanize(row.code)}</strong><br /><span style={styles.small}>Source: {humanize(row.source_exception_code)}</span></td>
                      <td style={styles.td}>{humanize(row.domain)}</td>
                      <td style={styles.td}>{humanize(row.owner)}</td>
                      <td style={styles.td}><span style={badgeStyle(row.severity_hint)}>{humanize(row.severity_hint)}</span></td>
                      <td style={styles.td}><span style={badgeStyle(row.closure_status)}>{humanize(row.closure_status)}</span></td>
                      <td style={styles.td}>{row.required_closure_evidence.join(', ')}</td>
                      <td style={styles.td}><ul style={styles.list}>{row.closure_controls.map((control) => <li key={control}>{control}</li>)}</ul></td>
                      <td style={styles.td}>{renderLinks(evidenceLinksForRow(row))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={styles.twoColumn}>
            <article style={styles.card}>
              <h2 style={styles.sectionTitle}>Closure rules</h2>
              <ul style={styles.list}>{data.closure_rules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
            </article>
            <article style={styles.card}>
              <h2 style={styles.sectionTitle}>Limitations</h2>
              <ul style={styles.list}>{data.closure_limitations.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Next best step</h2>
            <p style={styles.description}>{data.next_best_step}</p>
            <p style={styles.note}>{data.validation_note}</p>
          </section>
        </>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  header: { display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', padding: '1.5rem', background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb' },
  headerMeta: { display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', minWidth: '220px' },
  eyebrow: { margin: 0, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', fontWeight: 700 },
  title: { margin: '0.2rem 0', fontSize: '1.85rem', color: '#0f172a' },
  description: { margin: 0, color: '#475569', lineHeight: 1.6, maxWidth: '72rem' },
  button: { border: '1px solid #4f46e5', background: '#4f46e5', color: '#fff', borderRadius: '10px', padding: '0.5rem 0.8rem', fontWeight: 700, cursor: 'pointer' },
  generated: { color: '#64748b', fontSize: '0.85rem' },
  badge: { display: 'inline-flex', borderRadius: '999px', padding: '0.35rem 0.65rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'capitalize' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' },
  metricCard: { border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1rem', background: '#ffffff' },
  metricLabel: { display: 'block', color: '#64748b', fontSize: '0.82rem', textTransform: 'capitalize' },
  metricValue: { display: 'block', marginTop: '0.35rem', fontSize: '1.45rem', color: '#0f172a' },
  card: { border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1rem', background: '#ffffff' },
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', color: '#374151' },
  supportingLinks: { marginTop: '1rem' },
  sectionTitle: { margin: '0 0 0.75rem', color: '#0f172a', fontSize: '1.1rem' },
  chainGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.65rem', color: '#475569' },
  linkList: { display: 'flex', flexWrap: 'wrap', gap: '0.4rem' },
  link: { display: 'inline-flex', alignItems: 'center', borderRadius: '999px', border: '1px solid #c7d2fe', padding: '0.25rem 0.55rem', color: '#4338ca', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 700 },
  inlineLink: { color: '#4338ca', fontWeight: 700, textDecoration: 'none' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: '0.75rem', color: '#475569', fontSize: '0.8rem' },
  td: { verticalAlign: 'top', borderBottom: '1px solid #f1f5f9', padding: '0.75rem', color: '#334155', fontSize: '0.9rem' },
  list: { margin: 0, paddingLeft: '1.2rem', color: '#475569', lineHeight: 1.6 },
  twoColumn: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' },
  note: { margin: '0.75rem 0 0', color: '#64748b', lineHeight: 1.6 },
  small: { color: '#64748b', fontSize: '0.78rem' },
  error: { border: '1px solid #fecaca', borderRadius: '1rem', padding: '1rem', background: '#fef2f2', color: '#991b1b' }
};
