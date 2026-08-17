import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { TENANT_PERMISSIONS, hasPermission } from '../lib/permissions';
import { useRouteQueryState } from '../lib/useRouteQueryState';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import './ReliabilityCommandPage.css';

type ReliabilityView = 'posture' | 'review-path' | 'limits';
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

function ReliabilitySummaryCard({
  iconPath,
  label,
  value,
  copy,
  tone = 'blue',
  status
}: {
  iconPath: string;
  label: string;
  value: string;
  copy: string;
  tone?: 'blue' | 'slate' | 'amber' | 'green';
  status?: string | null;
}) {
  return (
    <article className="card reliability-summary-card" data-tone={tone}>
      <div className="reliability-summary-card__topline">
        <span className="reliability-summary-icon"><TenantNavIcon path={iconPath} size={18} /></span>
        <span className="card__label">{label}</span>
      </div>
      <div className="card__value reliability-summary-value">{value}</div>
      {status ? <span className={`reliability-badge ${toneClass(status)}`}>{formatIdentifier(status, 'Not assessed')}</span> : null}
      <div className="card__subtext">{copy}</div>
    </article>
  );
}

function ReliabilityNavLink({ path, label }: { path: string; label?: string }) {
  return (
    <Link className="button button--secondary reliability-link-button" to={path}>
      <TenantNavIcon path={path} size={16} />
      <span>{label || SOURCE_LABELS[path] || 'Open source page'}</span>
    </Link>
  );
}

function reviewStageIconPath(stageKey?: string | null): string {
  if (['runbook_planning', 'release_review', 'monitoring_review', 'incident_handoff', 'closure_review'].includes(String(stageKey || ''))) {
    return '/reliability-command';
  }
  if (['acceptance_review', 'evidence_review', 'signoff_review', 'decision_review'].includes(String(stageKey || ''))) {
    return '/intelligence-review';
  }
  return '/workflow-composer';
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
    return (
      <div className="reliability-page" data-reliability-refined="true">
        <section className="card reliability-state reliability-state--loading" aria-live="polite">
          <span className="reliability-state-icon"><TenantNavIcon path="/reliability-command" size={22} /></span>
          <div>
            <h2>Loading the reliability review</h2>
            <p>Combining permitted operational pressure, safeguards, and manual follow-up guidance.</p>
          </div>
        </section>
      </div>
    );
  }

  if (commandQuery.error) {
    return (
      <div className="reliability-page" data-reliability-refined="true">
        <section className="card reliability-state reliability-state--error">
          <span className="reliability-state-icon reliability-state-icon--error"><TenantNavIcon path="/alerts" size={22} /></span>
          <div>
            <h2>Reliability review could not be loaded</h2>
            <p>{commandQuery.error instanceof ApiError ? commandQuery.error.message : 'The Reliability Command summary is temporarily unavailable.'}</p>
            <button className="button button--secondary" type="button" onClick={() => commandQuery.refetch()}>Retry</button>
          </div>
        </section>
      </div>
    );
  }

  const response = commandQuery.data;
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
    <div className="reliability-page" data-reliability-refined="true">
      <section className="card reliability-intro">
        <div className="reliability-intro__content">
          <span className="reliability-hero-icon"><TenantNavIcon path="/reliability-command" size={24} /></span>
          <div className="reliability-intro__copy">
            <div className="reliability-eyebrow">Read-only operational reliability review</div>
            <h2>Review current pressure, safety checks, and the manual follow-up path</h2>
            <p className="card__subtext">
              Reliability Command combines permitted Action Center, Workspace, mobile execution, Operations Feed, Workflow Composer, Intelligence Review, Collaboration, and Digital Twin context. It provides advisory guidance only and never closes a risk, records approval, starts monitoring, opens an incident, sends a notification, or changes a source workflow.
            </p>
            <div className="reliability-hero-badges" aria-label="Reliability Command guardrails">
              <span><TenantNavIcon path="/reliability-command" size={14} /> Read-only guidance</span>
              <span><TenantNavIcon path="/workflow-composer" size={14} /> Manual follow-up</span>
              <span><TenantNavIcon path="/action-center" size={14} /> Source workflows authoritative</span>
            </div>
          </div>
        </div>
        <div className="reliability-refresh">
          <span className="reliability-refresh__label">Last refreshed</span>
          <strong>{formatDateTime(response?.generated_at)}</strong>
          <button className="button button--secondary reliability-link-button" type="button" onClick={() => commandQuery.refetch()} disabled={commandQuery.isFetching}>
            <TenantNavIcon path="/reliability-command" size={16} />
            <span>{commandQuery.isFetching ? 'Refreshing…' : 'Refresh review'}</span>
          </button>
        </div>
      </section>

      <section className="card reliability-filters" aria-labelledby="reliability-filter-title">
        <div className="reliability-section-heading">
          <div className="reliability-section-title">
            <span className="reliability-heading-icon"><TenantNavIcon path="/reliability-command" size={18} /></span>
            <div>
              <h2 id="reliability-filter-title">Filter the risk and review guidance</h2>
              <p className="card__subtext">The filters change which non-ready dimensions become review items. All nine reliability dimensions remain visible in the posture view.</p>
            </div>
          </div>
          {activeFilterCount > 0 ? <button className="button button--secondary reliability-link-button" type="button" onClick={clearFilters}><TenantNavIcon path="/reliability-command" size={16} /><span>Clear filters</span></button> : null}
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
        <ReliabilitySummaryCard iconPath="/reliability-command" label="Advisory reliability score" value={formatScore(overview.reliability_score)} copy="Average of current operational pressure and read-only safety checks—not an uptime percentage." tone="blue" />
        <ReliabilitySummaryCard iconPath="/action-center" label="Overall posture" value={formatIdentifier(overview.readiness, 'Not assessed')} copy="Current advisory posture across the nine reliability dimensions." tone="green" status={overview.readiness} />
        <ReliabilitySummaryCard iconPath="/alerts" label="Review risks" value={formatNumber(overview.risk_count ?? risks.length)} copy="Non-ready dimensions matching the selected thresholds." tone="amber" />
        <ReliabilitySummaryCard iconPath="/workflow-composer" label="Manual closure guides" value={formatNumber(overview.closure_review_count)} copy="Generated guidance only. No risk is closed and no signoff is recorded." tone="slate" />
      </section>

      <div className="reliability-scoring-note"><TenantNavIcon path="/reliability-command" size={18} /><span>{overview.scoring_note}</span></div>

      <div className="reliability-view-switch" role="tablist" aria-label="Reliability Command views">
        <button type="button" role="tab" aria-selected={view === 'posture'} className={view === 'posture' ? 'is-active' : ''} onClick={() => setView('posture')}><TenantNavIcon path="/reliability-command" size={16} /><span>Posture and risks</span></button>
        <button type="button" role="tab" aria-selected={view === 'review-path'} className={view === 'review-path' ? 'is-active' : ''} onClick={() => setView('review-path')}><TenantNavIcon path="/workflow-composer" size={16} /><span>Manual review path</span></button>
        <button type="button" role="tab" aria-selected={view === 'limits'} className={view === 'limits' ? 'is-active' : ''} onClick={() => setView('limits')}><TenantNavIcon path="/reliability-command" size={16} /><span>Safety and limits</span></button>
      </div>

      {view === 'posture' ? (
        <section className="reliability-posture" aria-labelledby="reliability-posture-title">
          <div className="reliability-section-heading reliability-section-heading--outside">
            <div className="reliability-section-title">
              <span className="reliability-heading-icon"><TenantNavIcon path="/reliability-command" size={18} /></span>
              <div>
                <h2 id="reliability-posture-title">Reliability posture</h2>
                <p className="card__subtext">Review the nine dimensions first, then open the source workflow for any dimension that needs attention.</p>
              </div>
            </div>
            <div className="reliability-shortcuts">
              {hasPermission(TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ) ? <ReliabilityNavLink path="/action-center" /> : null}
              {hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ) ? <ReliabilityNavLink path="/intelligence-review" /> : null}
            </div>
          </div>

          <section className="reliability-dimension-grid" aria-label="Reliability dimensions">
            {dimensions.map((dimension) => {
              const sourcePath = dimension.source_path || null;
              return (
                <article className="card reliability-dimension-card" key={dimension.key || dimension.label}>
                  <div className="reliability-card-heading">
                    <div className="reliability-card-title">
                      <span className="reliability-card-icon"><TenantNavIcon path={sourcePath || '/reliability-command'} size={17} /></span>
                      <div>
                        <div className="card__label">{formatIdentifier(dimension.key, 'Reliability dimension')}</div>
                        <h3>{dimension.label || 'Reliability dimension'}</h3>
                      </div>
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
                    <div className="reliability-card-actions"><ReliabilityNavLink path={sourcePath} /></div>
                  ) : null}
                </article>
              );
            })}
          </section>

          <section className="card reliability-risk-section" aria-labelledby="reliability-risk-title">
            <div className="reliability-section-heading">
              <div className="reliability-section-title">
                <span className="reliability-heading-icon reliability-heading-icon--amber"><TenantNavIcon path="/alerts" size={18} /></span>
                <div>
                  <h2 id="reliability-risk-title">Risk triage guidance</h2>
                  <p className="card__subtext">These are generated review recommendations for dimensions that match the filters. They are not saved incidents or assigned tasks.</p>
                </div>
              </div>
              <span className="reliability-returned-badge">{risks.length} returned</span>
            </div>
            {risks.length ? (
              <div className="reliability-risk-grid">
                {risks.map((risk) => {
                  const sourcePath = risk.source_path || null;
                  return (
                    <article className="reliability-risk-card" key={risk.risk_key || `${risk.dimension}-${risk.label}`}>
                      <div className="reliability-card-heading">
                        <div className="reliability-card-title">
                          <span className="reliability-card-icon reliability-card-icon--amber"><TenantNavIcon path={sourcePath || '/alerts'} size={17} /></span>
                          <div>
                            <h3>{risk.label || 'Reliability review item'}</h3>
                            <p>{formatIdentifier(risk.dimension)}</p>
                          </div>
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
                        <div className="reliability-card-actions"><ReliabilityNavLink path={sourcePath} /></div>
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
            <span className="reliability-hero-icon reliability-hero-icon--slate"><TenantNavIcon path="/workflow-composer" size={22} /></span>
            <div>
              <h2 id="reliability-review-path-title">Generated manual review path</h2>
              <p className="card__subtext">The stages below translate each matching reliability risk into suggested investigation, evidence, review, release, monitoring, handoff, and closure guidance. They do not create records, upload evidence, record decisions, approve releases, start monitoring, open incidents, or close risks.</p>
            </div>
          </div>
          <div className="reliability-stage-list">
            {reviewPath.map((stage, stageIndex) => (
              <details className="card reliability-stage" key={stage.key || stage.label} open={stageIndex === 0 && Boolean(stage.item_count)}>
                <summary>
                  <div className="reliability-stage-summary-title">
                    <span className="reliability-card-icon"><TenantNavIcon path={reviewStageIconPath(stage.key)} size={17} /></span>
                    <div>
                      <h3>{stage.label || 'Manual review stage'}</h3>
                      <p>{stage.description}</p>
                    </div>
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
                            <div className="reliability-card-actions"><ReliabilityNavLink path={sourcePath} /></div>
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
            <div className="reliability-section-title">
              <span className="reliability-heading-icon"><TenantNavIcon path="/reliability-command" size={18} /></span>
              <div>
                <h2 id="reliability-limits-title">Safety and interpretation limits</h2>
                <p className="card__subtext">These rules apply to every score, risk, and review-stage item on the page.</p>
              </div>
            </div>
          </div>
          <article className="card reliability-limit-card"><span className="reliability-limit-icon"><TenantNavIcon path="/reliability-command" size={18} /></span><div><h3>Advisory score only</h3><p className="card__subtext">The score combines operational pressure and safety-contract checks. It is not uptime, service availability, deployment approval, or a legal assurance.</p></div></article>
          <article className="card reliability-limit-card"><span className="reliability-limit-icon"><TenantNavIcon path="/workflow-composer" size={18} /></span><div><h3>No automatic remediation</h3><p className="card__subtext">The page does not run a runbook, change stock, alter a workflow, call an integration, or execute a recommendation.</p></div></article>
          <article className="card reliability-limit-card"><span className="reliability-limit-icon"><TenantNavIcon path="/intelligence-review" size={18} /></span><div><h3>No approval or signoff</h3><p className="card__subtext">A Ready result does not record approval, signoff, release acceptance, or a decision.</p></div></article>
          <article className="card reliability-limit-card"><span className="reliability-limit-icon"><TenantNavIcon path="/alerts" size={18} /></span><div><h3>No incident or notification</h3><p className="card__subtext">The page does not open an incident, page a team, send a message, or notify an external party.</p></div></article>
          <article className="card reliability-limit-card"><span className="reliability-limit-icon"><TenantNavIcon path="/real-time-operations-feed" size={18} /></span><div><h3>No monitoring activation</h3><p className="card__subtext">Monitoring windows and cadence are guidance. Nothing is scheduled or activated here.</p></div></article>
          <article className="card reliability-limit-card"><span className="reliability-limit-icon"><TenantNavIcon path="/action-center" size={18} /></span><div><h3>Source workflows stay authoritative</h3><p className="card__subtext">Evidence, owners, decisions, approvals, remediation, and closure must be handled in the linked source workflow.</p></div></article>
          <article className="card reliability-safety-summary">
            <div className="reliability-section-title"><span className="reliability-heading-icon reliability-heading-icon--slate"><TenantNavIcon path="/reliability-command" size={18} /></span><div><h3>Backend safety confirmation</h3><p className="card__subtext">The API confirms the same non-mutating guardrails shown above.</p></div></div>
            <dl className="reliability-facts reliability-safety-facts">
              {Object.entries(safety).map(([key, value]) => <div key={key}><dt>{formatIdentifier(key)}</dt><dd><span className={`reliability-safety-value ${value ? 'is-safe' : 'is-blocked'}`}>{value ? 'Yes' : 'No'}</span></dd></div>)}
            </dl>
          </article>
        </section>
      ) : null}

    </div>
  );
}
