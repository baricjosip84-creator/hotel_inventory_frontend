import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { TENANT_PERMISSIONS, hasPermission } from '../lib/permissions';
import { useRouteQueryState } from '../lib/useRouteQueryState';
import './ReliabilityCommandPage.css';

type ReliabilityView = 'posture' | 'review-path' | 'limits' | 'diagnostics';
type ReadinessFilter = 'watch' | 'degraded' | 'critical';
type SeverityFilter = 'all' | 'medium' | 'high' | 'critical';
type ResultLimit = '25' | '50' | '75' | '100';

type ReliabilityDimension = {
  key?: string;
  label?: string;
  score?: number | null;
  readiness?: string | null;
  evidence?: string[];
  recommendation?: string | null;
  source_path?: string | null;
};

type ReliabilityRisk = {
  risk_key?: string;
  label?: string;
  dimension?: string;
  severity?: string | null;
  readiness?: string | null;
  score?: number | null;
  evidence?: string[];
  recommended_owner?: string | null;
  recommended_runbook?: string | null;
  recommended_next_action?: string | null;
  source_path?: string | null;
};

type ReviewPathItem = {
  item_key?: string;
  label?: string;
  dimension?: string | null;
  severity?: string | null;
  readiness?: string | null;
  stage_status?: string | null;
  owner?: string | null;
  reviewer?: string | null;
  source_path?: string | null;
  instructions?: string[];
};

type ReviewStage = {
  key?: string;
  label?: string;
  description?: string;
  item_count?: number;
  items?: ReviewPathItem[];
};

type ReliabilityCommandResponse = {
  access?: {
    can_view_diagnostics?: boolean;
  };
  generated_at?: string;
  filters?: {
    limit?: number;
    min_readiness?: string | null;
    min_severity?: string | null;
  };
  overview?: {
    reliability_score?: number | null;
    readiness?: string | null;
    source_surface_count?: number;
    dimension_count?: number;
    risk_count?: number;
    closure_review_count?: number;
    scoring_note?: string;
  };
  source_summary?: Record<string, unknown>;
  dimensions?: ReliabilityDimension[];
  risks?: ReliabilityRisk[];
  review_path?: ReviewStage[];
  safety?: Record<string, boolean>;
  diagnostics?: unknown;
};

const READINESS_OPTIONS = [
  { value: 'watch', label: 'Watch or worse' },
  { value: 'degraded', label: 'Degraded or critical' },
  { value: 'critical', label: 'Critical only' }
] as const satisfies ReadonlyArray<{ value: ReadinessFilter; label: string }>;

const SEVERITY_OPTIONS = [
  { value: 'all', label: 'All severities' },
  { value: 'medium', label: 'Medium or higher' },
  { value: 'high', label: 'High or critical' },
  { value: 'critical', label: 'Critical only' }
] as const satisfies ReadonlyArray<{ value: SeverityFilter; label: string }>;

const LIMIT_OPTIONS = ['25', '50', '75', '100'] as const satisfies readonly ResultLimit[];

const SOURCE_LABELS: Record<string, string> = {
  '/action-center': 'Open Action Center',
  '/workflow-composer': 'Open Workflow Composer',
  '/intelligence-review': 'Open Intelligence Review',
  '/real-time-operations-feed': 'Open Operations Feed',
  '/collaboration': 'Open Collaboration',
  '/digital-twin': 'Open Digital Twin',
  '/reliability-command': 'Reliability Command'
};

function formatIdentifier(value?: string | number | null, fallback = 'Not reported'): string {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value)
    .replace(/[:/.-]+/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatNumber(value?: number | null): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Not assessed';
  return new Intl.NumberFormat().format(value);
}

function formatScore(value?: number | null): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Not assessed';
  return `${Number(value.toFixed(2))}%`;
}

function formatDateTime(value?: string | null): string {
  if (!value) return 'Not reported';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function toneClass(value?: string | null): string {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('critical') || normalized.includes('blocked') || normalized.includes('block until')) return 'reliability-badge--critical';
  if (normalized.includes('degraded') || normalized.includes('high') || normalized.includes('defer')) return 'reliability-badge--high';
  if (normalized.includes('watch') || normalized.includes('medium') || normalized.includes('conditional')) return 'reliability-badge--watch';
  if (normalized.includes('ready') || normalized.includes('complete') || normalized.includes('accept')) return 'reliability-badge--ready';
  return 'reliability-badge--neutral';
}

function formatSentence(value?: string | null, fallback = 'Not reported'): string {
  const text = String(value || '').trim();
  if (!text) return fallback;
  if (text.includes('_') || /^[a-z0-9:-]+$/i.test(text) && !text.includes(' ')) return formatIdentifier(text, fallback);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatEvidence(value: string): string {
  const separatorIndex = value.indexOf(':');
  if (separatorIndex < 0) return formatSentence(value);
  const key = value.slice(0, separatorIndex);
  const raw = value.slice(separatorIndex + 1);
  const normalizedValue = raw.trim() === 'true' ? 'Yes' : raw.trim() === 'false' ? 'No' : formatSentence(raw, raw.trim() || 'Not reported');
  return `${formatIdentifier(key)}: ${normalizedValue}`;
}

function sourcePermissionAllows(path?: string | null): boolean {
  if (!path || path === '/reliability-command') return false;
  if (path === '/intelligence-review') return hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ);
  if (path === '/digital-twin') {
    return hasPermission(TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ)
      && hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ);
  }
  if (['/action-center', '/workflow-composer', '/real-time-operations-feed', '/collaboration'].includes(path)) {
    return hasPermission(TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ);
  }
  return false;
}

async function fetchReliabilityCommand(filters: {
  readiness: ReadinessFilter;
  severity: SeverityFilter;
  limit: ResultLimit;
}): Promise<ReliabilityCommandResponse> {
  const params = new URLSearchParams({
    min_readiness: filters.readiness,
    limit: filters.limit
  });
  if (filters.severity !== 'all') params.set('min_severity', filters.severity);
  return apiRequest<ReliabilityCommandResponse>(`/platform-reliability/command-board?${params.toString()}`);
}

export default function ReliabilityCommandPage() {
  const [view, setView] = useState<ReliabilityView>('posture');
  const [readiness, setReadiness] = useRouteQueryState<ReadinessFilter>({
    paramName: 'readiness',
    defaultValue: 'watch',
    allowedValues: READINESS_OPTIONS.map((option) => option.value)
  });
  const [severity, setSeverity] = useRouteQueryState<SeverityFilter>({
    paramName: 'severity',
    defaultValue: 'all',
    allowedValues: SEVERITY_OPTIONS.map((option) => option.value)
  });
  const [limit, setLimit] = useRouteQueryState<ResultLimit>({
    paramName: 'limit',
    defaultValue: '25',
    allowedValues: LIMIT_OPTIONS
  });

  const queryKey = useMemo(() => ['platform-reliability-command', readiness, severity, limit], [readiness, severity, limit]);
  const commandQuery = useQuery({
    queryKey,
    queryFn: () => fetchReliabilityCommand({ readiness, severity, limit })
  });

  if (commandQuery.isLoading) {
    return <div className="reliability-state reliability-state--loading">Loading the reliability review…</div>;
  }

  if (commandQuery.error) {
    return (
      <div className="reliability-state reliability-state--error">
        <h2>Reliability review could not be loaded</h2>
        <p>{commandQuery.error instanceof ApiError ? commandQuery.error.message : 'The Reliability Command summary is temporarily unavailable.'}</p>
        <button className="button button--secondary" type="button" onClick={() => commandQuery.refetch()}>Retry</button>
      </div>
    );
  }

  const response = commandQuery.data;
  const canViewDiagnostics = Boolean(response?.access?.can_view_diagnostics);
  const overview = response?.overview || {};
  const dimensions = response?.dimensions || [];
  const risks = response?.risks || [];
  const reviewPath = response?.review_path || [];
  const safety = response?.safety || {};
  const activeFilterCount = Number(readiness !== 'watch') + Number(severity !== 'all') + Number(limit !== '25');

  const clearFilters = () => {
    setReadiness('watch');
    setSeverity('all');
    setLimit('25');
  };

  return (
    <div className="reliability-page">
      <section className="card reliability-intro">
        <div>
          <div className="reliability-eyebrow">Read-only operational reliability review</div>
          <h2>Review current pressure, safety checks, and the manual follow-up path</h2>
          <p className="card__subtext">
            Reliability Command combines permitted Action Center, Workspace, mobile execution, Operations Feed, Workflow Composer, Intelligence Review, Collaboration, and Digital Twin context. It provides advisory guidance only and never closes a risk, records approval, starts monitoring, opens an incident, sends a notification, or changes a source workflow.
          </p>
        </div>
        <div className="reliability-refresh">
          <span>Last refreshed</span>
          <strong>{formatDateTime(response?.generated_at)}</strong>
          <button className="button button--secondary" type="button" onClick={() => commandQuery.refetch()} disabled={commandQuery.isFetching}>
            {commandQuery.isFetching ? 'Refreshing…' : 'Refresh review'}
          </button>
        </div>
      </section>

      <section className="card reliability-filters" aria-labelledby="reliability-filter-title">
        <div className="reliability-section-heading">
          <div>
            <h2 id="reliability-filter-title">Filter the risk and review guidance</h2>
            <p className="card__subtext">The filters change which non-ready dimensions become review items. All nine reliability dimensions remain visible in the posture view.</p>
          </div>
          {activeFilterCount > 0 ? <button className="button button--secondary" type="button" onClick={clearFilters}>Clear filters</button> : null}
        </div>
        <div className="reliability-filter-grid">
          <label>
            <span>Risk readiness threshold</span>
            <select value={readiness} onChange={(event) => setReadiness(event.target.value as ReadinessFilter)}>
              {READINESS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span>Risk severity threshold</span>
            <select value={severity} onChange={(event) => setSeverity(event.target.value as SeverityFilter)}>
              {SEVERITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span>Maximum review items</span>
            <select value={limit} onChange={(event) => setLimit(event.target.value as ResultLimit)}>
              {LIMIT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        </div>
        <div className="reliability-filter-summary">
          <span>Readiness: <strong>{READINESS_OPTIONS.find((option) => option.value === readiness)?.label}</strong></span>
          <span>Severity: <strong>{SEVERITY_OPTIONS.find((option) => option.value === severity)?.label}</strong></span>
          <span>Up to <strong>{response?.filters?.limit || limit}</strong> items per review stage</span>
        </div>
      </section>

      <section className="reliability-summary-grid" aria-label="Reliability summary">
        <article className="card">
          <div className="card__label">Advisory reliability score</div>
          <div className="card__value">{formatScore(overview.reliability_score)}</div>
          <div className="card__subtext">Average of current operational pressure and read-only safety checks—not an uptime percentage.</div>
        </article>
        <article className="card">
          <div className="card__label">Overall posture</div>
          <div className="card__value">{formatIdentifier(overview.readiness, 'Not assessed')}</div>
          <span className={`reliability-badge ${toneClass(overview.readiness)}`}>{formatIdentifier(overview.readiness, 'Not assessed')}</span>
        </article>
        <article className="card">
          <div className="card__label">Review risks</div>
          <div className="card__value">{formatNumber(overview.risk_count ?? risks.length)}</div>
          <div className="card__subtext">Non-ready dimensions matching the selected thresholds.</div>
        </article>
        <article className="card">
          <div className="card__label">Manual closure guides</div>
          <div className="card__value">{formatNumber(overview.closure_review_count)}</div>
          <div className="card__subtext">Generated guidance only. No risk is closed and no signoff is recorded.</div>
        </article>
      </section>

      <div className="reliability-scoring-note">{overview.scoring_note}</div>

      <div className="reliability-view-switch" role="tablist" aria-label="Reliability Command views">
        <button type="button" role="tab" aria-selected={view === 'posture'} className={view === 'posture' ? 'is-active' : ''} onClick={() => setView('posture')}>Posture and risks</button>
        <button type="button" role="tab" aria-selected={view === 'review-path'} className={view === 'review-path' ? 'is-active' : ''} onClick={() => setView('review-path')}>Manual review path</button>
        <button type="button" role="tab" aria-selected={view === 'limits'} className={view === 'limits' ? 'is-active' : ''} onClick={() => setView('limits')}>Safety and limits</button>
        {canViewDiagnostics ? (
          <button type="button" role="tab" aria-selected={view === 'diagnostics'} className={view === 'diagnostics' ? 'is-active' : ''} onClick={() => setView('diagnostics')}>Diagnostics</button>
        ) : null}
      </div>

      {view === 'posture' ? (
        <section className="reliability-posture" aria-labelledby="reliability-posture-title">
          <div className="reliability-section-heading reliability-section-heading--outside">
            <div>
              <h2 id="reliability-posture-title">Reliability posture</h2>
              <p className="card__subtext">Review the nine dimensions first, then open the source workflow for any dimension that needs attention.</p>
            </div>
            <div className="reliability-shortcuts">
              {hasPermission(TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ) ? <Link className="button button--secondary" to="/action-center">Open Action Center</Link> : null}
              {hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ) ? <Link className="button button--secondary" to="/intelligence-review">Open Intelligence Review</Link> : null}
            </div>
          </div>

          <section className="reliability-dimension-grid" aria-label="Reliability dimensions">
            {dimensions.map((dimension) => {
              const sourcePath = dimension.source_path || null;
              return (
                <article className="card reliability-dimension-card" key={dimension.key || dimension.label}>
                  <div className="reliability-card-heading">
                    <div>
                      <div className="card__label">{formatIdentifier(dimension.key, 'Reliability dimension')}</div>
                      <h3>{dimension.label || 'Reliability dimension'}</h3>
                    </div>
                    <span className={`reliability-badge ${toneClass(dimension.readiness)}`}>{formatIdentifier(dimension.readiness, 'Not assessed')}</span>
                  </div>
                  <div className="reliability-score-line"><strong>{formatScore(dimension.score)}</strong><span>Dimension score</span></div>
                  <p className="card__subtext">{dimension.recommendation || 'No recommendation was reported.'}</p>
                  {dimension.evidence?.length ? (
                    <ul className="reliability-evidence-list">
                      {dimension.evidence.map((item) => <li key={item}>{formatEvidence(item)}</li>)}
                    </ul>
                  ) : null}
                  {sourcePath && sourcePermissionAllows(sourcePath) ? (
                    <div className="reliability-card-actions"><Link className="button button--secondary" to={sourcePath}>{SOURCE_LABELS[sourcePath] || 'Open source page'}</Link></div>
                  ) : null}
                </article>
              );
            })}
          </section>

          <section className="card reliability-risk-section" aria-labelledby="reliability-risk-title">
            <div className="reliability-section-heading">
              <div>
                <h2 id="reliability-risk-title">Risk triage guidance</h2>
                <p className="card__subtext">These are generated review recommendations for dimensions that match the filters. They are not saved incidents or assigned tasks.</p>
              </div>
              <span>{risks.length} returned</span>
            </div>
            {risks.length ? (
              <div className="reliability-risk-grid">
                {risks.map((risk) => {
                  const sourcePath = risk.source_path || null;
                  return (
                    <article className="reliability-risk-card" key={risk.risk_key || `${risk.dimension}-${risk.label}`}>
                      <div className="reliability-card-heading">
                        <div>
                          <h3>{risk.label || 'Reliability review item'}</h3>
                          <p>{formatIdentifier(risk.dimension)}</p>
                        </div>
                        <div className="reliability-badge-row">
                          <span className={`reliability-badge ${toneClass(risk.severity)}`}>{formatIdentifier(risk.severity)}</span>
                          <span className={`reliability-badge ${toneClass(risk.readiness)}`}>{formatIdentifier(risk.readiness)}</span>
                        </div>
                      </div>
                      <p>{risk.recommended_next_action || 'Review the source workflow and capture the human decision there.'}</p>
                      <dl className="reliability-facts">
                        <div><dt>Score</dt><dd>{formatScore(risk.score)}</dd></div>
                        <div><dt>Suggested owner</dt><dd>{formatIdentifier(risk.recommended_owner)}</dd></div>
                        <div><dt>Suggested runbook</dt><dd>{formatIdentifier(risk.recommended_runbook)}</dd></div>
                      </dl>
                      {sourcePath && sourcePermissionAllows(sourcePath) ? (
                        <div className="reliability-card-actions"><Link className="button button--secondary" to={sourcePath}>{SOURCE_LABELS[sourcePath] || 'Open source page'}</Link></div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="reliability-inline-empty">
                <h3>No non-ready risks match the current thresholds</h3>
                <p>All current dimensions are Ready or excluded by the selected threshold. This is not a release approval, uptime guarantee, or proof that every operational issue is closed.</p>
              </div>
            )}
          </section>
        </section>
      ) : null}

      {view === 'review-path' ? (
        <section aria-labelledby="reliability-review-path-title">
          <div className="card reliability-review-note">
            <h2 id="reliability-review-path-title">Generated manual review path</h2>
            <p className="card__subtext">The stages below translate each matching reliability risk into suggested investigation, evidence, review, release, monitoring, handoff, and closure guidance. They do not create records, upload evidence, record decisions, approve releases, start monitoring, open incidents, or close risks.</p>
          </div>
          <div className="reliability-stage-list">
            {reviewPath.map((stage, stageIndex) => (
              <details className="card reliability-stage" key={stage.key || stage.label} open={stageIndex === 0 && Boolean(stage.item_count)}>
                <summary>
                  <div>
                    <h3>{stage.label || 'Manual review stage'}</h3>
                    <p>{stage.description}</p>
                  </div>
                  <span>{formatNumber(stage.item_count ?? stage.items?.length ?? 0)} items</span>
                </summary>
                {stage.items?.length ? (
                  <div className="reliability-stage-items">
                    {stage.items.map((item) => {
                      const sourcePath = item.source_path || null;
                      return (
                        <article className="reliability-stage-item" key={item.item_key || `${stage.key}-${item.label}`}>
                          <div className="reliability-card-heading">
                            <div>
                              <h4>{item.label || 'Reliability review item'}</h4>
                              <p>{formatIdentifier(item.dimension)}</p>
                            </div>
                            <div className="reliability-badge-row">
                              <span className={`reliability-badge ${toneClass(item.severity)}`}>{formatIdentifier(item.severity)}</span>
                              <span className={`reliability-badge ${toneClass(item.stage_status)}`}>{formatIdentifier(item.stage_status)}</span>
                            </div>
                          </div>
                          <dl className="reliability-facts">
                            <div><dt>Suggested owner</dt><dd>{formatIdentifier(item.owner)}</dd></div>
                            <div><dt>Suggested reviewer</dt><dd>{formatIdentifier(item.reviewer)}</dd></div>
                          </dl>
                          {item.instructions?.length ? (
                            <ol className="reliability-instruction-list">
                              {item.instructions.map((instruction) => <li key={instruction}>{formatSentence(instruction)}</li>)}
                            </ol>
                          ) : null}
                          {sourcePath && sourcePermissionAllows(sourcePath) ? (
                            <div className="reliability-card-actions"><Link className="button button--secondary" to={sourcePath}>{SOURCE_LABELS[sourcePath] || 'Open source page'}</Link></div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="reliability-inline-empty">No matching risk generated guidance for this stage.</div>
                )}
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {view === 'limits' ? (
        <section className="reliability-limit-grid" aria-labelledby="reliability-limits-title">
          <div className="reliability-section-heading reliability-section-heading--outside">
            <div>
              <h2 id="reliability-limits-title">Safety and interpretation limits</h2>
              <p className="card__subtext">These rules apply to every score, risk, and review-stage item on the page.</p>
            </div>
          </div>
          <article className="card"><h3>Advisory score only</h3><p className="card__subtext">The score combines operational pressure and safety-contract checks. It is not uptime, service availability, deployment approval, or a legal assurance.</p></article>
          <article className="card"><h3>No automatic remediation</h3><p className="card__subtext">The page does not run a runbook, change stock, alter a workflow, call an integration, or execute a recommendation.</p></article>
          <article className="card"><h3>No approval or signoff</h3><p className="card__subtext">A Ready result does not record approval, signoff, release acceptance, or a decision.</p></article>
          <article className="card"><h3>No incident or notification</h3><p className="card__subtext">The page does not open an incident, page a team, send a message, or notify an external party.</p></article>
          <article className="card"><h3>No monitoring activation</h3><p className="card__subtext">Monitoring windows and cadence are guidance. Nothing is scheduled or activated here.</p></article>
          <article className="card"><h3>Source workflows stay authoritative</h3><p className="card__subtext">Evidence, owners, decisions, approvals, remediation, and closure must be handled in the linked source workflow.</p></article>
          <article className="card reliability-safety-summary">
            <h3>Backend safety confirmation</h3>
            <dl className="reliability-facts">
              {Object.entries(safety).map(([key, value]) => <div key={key}><dt>{formatIdentifier(key)}</dt><dd>{value ? 'Yes' : 'No'}</dd></div>)}
            </dl>
          </article>
        </section>
      ) : null}

      {view === 'diagnostics' && canViewDiagnostics ? (
        <section className="card reliability-diagnostics">
          <h2>Technical response diagnostics</h2>
          <p className="card__subtext">Restricted raw response details for users with tenant diagnostics permission.</p>
          {response?.diagnostics ? <pre>{JSON.stringify(response.diagnostics, null, 2)}</pre> : <div className="reliability-inline-empty">The backend did not return diagnostics for this account.</div>}
        </section>
      ) : null}
    </div>
  );
}
