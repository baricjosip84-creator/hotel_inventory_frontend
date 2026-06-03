import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { useRouteQueryState } from '../lib/useRouteQueryState';

type ReadinessFilter = 'watch' | 'degraded' | 'critical' | 'ready';
type SeverityFilter = '' | 'critical' | 'high' | 'medium' | 'low';

type ReliabilitySummaryResponse = {
  generated_at?: string;
  readiness?: string;
  reliability_score?: number;
  source_surface_count?: number;
  readiness_dimensions?: Array<{
    key?: string;
    label?: string;
    readiness?: string;
    score?: number;
    recommendation?: string;
    source_surface?: string;
    evidence?: string[];
  }>;
  safety_contract?: Record<string, boolean>;
};

type RiskRegisterResponse = {
  risk_count?: number;
  readiness_risks?: Array<{
    risk_id?: string;
    label?: string;
    severity?: string;
    readiness?: string;
    score?: number;
    recommended_owner?: string;
    recommended_runbook?: string;
    recommended_next_action?: string;
    source_surface?: string;
  }>;
};

type ClosureBoardItem = {
  closure_item_id?: string;
  incident_handoff_plan_id?: string;
  release_packet_id?: string;
  risk_id?: string;
  sequence?: number;
  owner?: string;
  recommended_reviewer?: string;
  recommended_closure_owner?: string;
  closure_readiness?: string;
  handoff_readiness?: string;
  monitoring_readiness?: string;
  release_readiness?: string;
  readiness?: string;
  severity?: string;
  source_surface?: string;
  manual_closure_requirements?: string[];
  final_review_gate?: {
    gate_type?: string;
    required?: boolean;
    reviewer_notes_required?: boolean;
    source_workflow_confirmation_required?: boolean;
    closes_risk?: boolean;
    records_signoff?: boolean;
    mutates_source_workflow?: boolean;
  };
  closure_contract?: Record<string, boolean>;
};

type ClosureBoardResponse = {
  generated_at?: string;
  source_reliability_score?: number;
  source_readiness?: string;
  closure_item_count?: number;
  closure_readiness_summary?: Record<string, number>;
  closure_owner_summary?: Record<string, number>;
  closure_board?: ClosureBoardItem[];
  recommended_next_steps?: Array<{
    closure_item_id?: string;
    closure_owner?: string;
    closure_readiness?: string;
    gate?: string;
    first_manual_closure_requirement?: string;
  }>;
  closure_board_contract?: Record<string, boolean>;
};

type ReliabilityCommandResponse = {
  summary: ReliabilitySummaryResponse;
  risks: RiskRegisterResponse;
  closureBoard: ClosureBoardResponse;
};

const readinessOptions = ['watch', 'degraded', 'critical', 'ready'] as const satisfies readonly ReadinessFilter[];
const severityOptions = ['', 'critical', 'high', 'medium', 'low'] as const satisfies readonly SeverityFilter[];

function formatLabel(value?: string | number | null): string {
  if (value === undefined || value === null || value === '') return 'Not reported';
  return String(value).replace(/_/g, ' ');
}

function formatNumber(value?: number | null): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0';
  return new Intl.NumberFormat().format(value);
}

function getTone(value?: string): CSSProperties {
  const normalized = (value || '').toLowerCase();
  if (normalized.includes('critical') || normalized.includes('blocked')) return { background: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' };
  if (normalized.includes('degraded') || normalized.includes('high') || normalized.includes('watch')) return { background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' };
  if (normalized.includes('ready') || normalized.includes('complete')) return { background: '#dcfce7', color: '#166534', borderColor: '#bbf7d0' };
  return { background: '#eef2ff', color: '#3730a3', borderColor: '#c7d2fe' };
}

async function fetchReliabilityCommand(readiness: ReadinessFilter, severity: SeverityFilter): Promise<ReliabilityCommandResponse> {
  const params = new URLSearchParams({ limit: '25', min_readiness: readiness });
  if (severity) params.set('min_severity', severity);

  const [summary, risks, closureBoard] = await Promise.all([
    apiRequest<ReliabilitySummaryResponse>('/platform-reliability/summary?limit=25'),
    apiRequest<RiskRegisterResponse>(`/platform-reliability/readiness-risks?${params.toString()}`),
    apiRequest<ClosureBoardResponse>(`/platform-reliability/readiness-closure-board?${params.toString()}`)
  ]);

  return { summary, risks, closureBoard };
}

export default function ReliabilityCommandPage() {
  const [readiness, setReadiness] = useRouteQueryState<ReadinessFilter>({
    paramName: 'readiness',
    defaultValue: 'watch',
    allowedValues: readinessOptions
  });
  const [severity, setSeverity] = useRouteQueryState<SeverityFilter>({
    paramName: 'severity',
    defaultValue: '',
    allowedValues: severityOptions
  });

  const commandQuery = useQuery({
    queryKey: ['platform-reliability-command', readiness, severity],
    queryFn: () => fetchReliabilityCommand(readiness, severity)
  });

  const closureItems = commandQuery.data?.closureBoard.closure_board || [];
  const riskItems = commandQuery.data?.risks.readiness_risks || [];
  const summary = commandQuery.data?.summary;
  const closureBoard = commandQuery.data?.closureBoard;

  const safetyFlags = useMemo(() => {
    const contract = closureBoard?.closure_board_contract || summary?.safety_contract || {};
    return Object.entries(contract).filter(([key]) => key.includes('read') || key.includes('mutates') || key.includes('executes') || key.includes('records') || key.includes('sends') || key.includes('closes')).slice(0, 8);
  }, [closureBoard, summary]);

  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>Phase 15 · Reliability Command UI</p>
          <h1 style={styles.title}>Reliability command</h1>
          <p style={styles.subtitle}>Commercial-grade readiness surface over the existing Feature #14 platform reliability endpoints. This page is read-only and keeps source workflows authoritative.</p>
        </div>
        <div style={styles.heroActions}>
          <Link className="button button--secondary" to="/action-center">Open action center</Link>
          <Link className="button button--secondary" to="/digital-twin">Open digital twin</Link>
        </div>
      </section>

      <section style={styles.filters}>
        <label style={styles.label}>Minimum readiness
          <select style={styles.input} value={readiness} onChange={(event) => setReadiness(event.target.value as ReadinessFilter)}>
            {readinessOptions.map((option) => <option key={option} value={option}>{formatLabel(option)}</option>)}
          </select>
        </label>
        <label style={styles.label}>Minimum severity
          <select style={styles.input} value={severity} onChange={(event) => setSeverity(event.target.value as SeverityFilter)}>
            {severityOptions.map((option) => <option key={option || 'all'} value={option}>{option ? formatLabel(option) : 'All severities'}</option>)}
          </select>
        </label>
        <button className="button" type="button" onClick={() => commandQuery.refetch()} disabled={commandQuery.isFetching}>{commandQuery.isFetching ? 'Refreshing…' : 'Refresh command board'}</button>
      </section>

      {commandQuery.isLoading ? <p style={styles.muted}>Loading reliability command board…</p> : null}
      {commandQuery.error ? <div style={styles.error}>{commandQuery.error instanceof ApiError ? commandQuery.error.message : 'Unable to load reliability command data.'}</div> : null}

      <section style={styles.grid4}>
        <MetricCard label="Reliability score" value={`${formatNumber(summary?.reliability_score ?? closureBoard?.source_reliability_score)}%`} tone={summary?.readiness || closureBoard?.source_readiness} />
        <MetricCard label="Source readiness" value={formatLabel(summary?.readiness || closureBoard?.source_readiness)} tone={summary?.readiness || closureBoard?.source_readiness} />
        <MetricCard label="Readiness risks" value={formatNumber(commandQuery.data?.risks.risk_count ?? riskItems.length)} tone={riskItems[0]?.severity} />
        <MetricCard label="Closure items" value={formatNumber(closureBoard?.closure_item_count ?? closureItems.length)} tone={closureItems[0]?.closure_readiness} />
      </section>

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Closure board</h2>
            <p style={styles.muted}>Final manual closure review guidance from `/platform-reliability/readiness-closure-board`.</p>
          </div>
          <span style={{ ...styles.badge, ...getTone(closureBoard?.source_readiness) }}>{formatLabel(closureBoard?.source_readiness)}</span>
        </div>
        <div style={styles.cardGrid}>
          {closureItems.map((item) => (
            <article key={item.closure_item_id || item.risk_id} style={styles.card}>
              <div style={styles.cardHeader}>
                <strong>{item.risk_id || item.closure_item_id}</strong>
                <span style={{ ...styles.badge, ...getTone(item.severity) }}>{formatLabel(item.severity)}</span>
              </div>
              <p style={styles.cardText}>{formatLabel(item.source_surface)}</p>
              <div style={styles.metaGrid}>
                <span><b>Closure</b>{formatLabel(item.closure_readiness)}</span>
                <span><b>Owner</b>{formatLabel(item.recommended_closure_owner)}</span>
                <span><b>Reviewer</b>{formatLabel(item.recommended_reviewer)}</span>
                <span><b>Gate</b>{formatLabel(item.final_review_gate?.gate_type)}</span>
              </div>
              <ul style={styles.requirements}>
                {(item.manual_closure_requirements || []).slice(0, 3).map((requirement) => <li key={requirement}>{requirement}</li>)}
              </ul>
              <p style={styles.safeLine}>Read-only: closes risk {String(Boolean(item.final_review_gate?.closes_risk))} · records signoff {String(Boolean(item.final_review_gate?.records_signoff))}</p>
            </article>
          ))}
          {!commandQuery.isLoading && closureItems.length === 0 ? <p style={styles.muted}>No closure items matched the selected filters.</p> : null}
        </div>
      </section>

      <section style={styles.twoColumn}>
        <div style={styles.panel}>
          <h2 style={styles.sectionTitle}>Readiness risk triage</h2>
          <div style={styles.stack}>
            {riskItems.slice(0, 6).map((risk) => (
              <div key={risk.risk_id} style={styles.listItem}>
                <div>
                  <strong>{risk.label || risk.risk_id}</strong>
                  <p style={styles.muted}>{risk.recommended_next_action || 'No recommendation reported.'}</p>
                </div>
                <span style={{ ...styles.badge, ...getTone(risk.severity) }}>{formatLabel(risk.severity)}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={styles.panel}>
          <h2 style={styles.sectionTitle}>Safety contract</h2>
          <div style={styles.stack}>
            {safetyFlags.map(([key, value]) => (
              <div key={key} style={styles.listItem}>
                <span>{formatLabel(key)}</span>
                <strong>{String(value)}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div style={styles.metricCard}>
      <span style={styles.metricLabel}>{label}</span>
      <strong style={styles.metricValue}>{value}</strong>
      <span style={{ ...styles.badge, ...getTone(tone) }}>{formatLabel(tone)}</span>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 20 },
  hero: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', padding: 24, background: 'linear-gradient(135deg, #111827, #1f2937)', color: 'white', borderRadius: 24, boxShadow: '0 20px 40px rgba(15, 23, 42, 0.18)' },
  heroActions: { display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' },
  eyebrow: { margin: '0 0 8px', fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: '#bfdbfe', fontWeight: 800 },
  title: { margin: 0, fontSize: 34, lineHeight: 1.1 },
  subtitle: { margin: '10px 0 0', maxWidth: 760, color: '#d1d5db', lineHeight: 1.6 },
  filters: { display: 'flex', alignItems: 'end', gap: 12, flexWrap: 'wrap', padding: 16, background: 'white', border: '1px solid #e5e7eb', borderRadius: 18 },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { minWidth: 190, border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 12px', background: 'white', color: '#111827' },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 },
  metricCard: { display: 'flex', flexDirection: 'column', gap: 8, padding: 18, background: 'white', border: '1px solid #e5e7eb', borderRadius: 18 },
  metricLabel: { color: '#6b7280', fontSize: 13, fontWeight: 700 },
  metricValue: { color: '#111827', fontSize: 28 },
  panel: { padding: 20, background: 'white', border: '1px solid #e5e7eb', borderRadius: 20 },
  panelHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 16 },
  sectionTitle: { margin: 0, color: '#111827', fontSize: 20 },
  muted: { margin: 0, color: '#6b7280', lineHeight: 1.5 },
  error: { padding: 14, background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 14 },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 },
  card: { border: '1px solid #e5e7eb', borderRadius: 16, padding: 16, background: '#f9fafb' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' },
  cardText: { margin: '10px 0', color: '#4b5563' },
  badge: { display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start', border: '1px solid', borderRadius: 999, padding: '4px 9px', fontSize: 12, fontWeight: 800, textTransform: 'capitalize' },
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, margin: '12px 0' },
  requirements: { margin: '12px 0', paddingLeft: 18, color: '#374151' },
  safeLine: { margin: 0, color: '#065f46', fontSize: 12, fontWeight: 700 },
  twoColumn: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 },
  stack: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 },
  listItem: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: 12, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 14 }
};
