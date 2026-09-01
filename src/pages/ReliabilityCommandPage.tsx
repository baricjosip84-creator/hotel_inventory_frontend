import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { useAppTranslation } from '../i18n/I18nContext';
import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
import { TENANT_PERMISSIONS, hasPermission } from '../lib/permissions';
import { useRouteQueryState } from '../lib/useRouteQueryState';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import { OperationalWorkspaceHero, OperationalWorkspaceMetaPill, OperationalWorkspaceStatCard, OperationalWorkspaceStatus, OperationalWorkspaceTab, OperationalWorkspaceTabs } from '../components/ui/OperationalWorkspace';
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
  assessment_available?: boolean;
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
  presentation?: {
    system_text_contract?: string;
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
    source_surface_total_count?: number;
    permission_limited_source_surface_count?: number;
    dimension_count?: number;
    unassessed_dimension_count?: number;
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

const CANONICAL_STATUS_LABELS: Record<string, string> = {
  ready: 'Ready',
  not_assessed: 'Not assessed',
  watch: 'Watch',
  degraded: 'Degraded',
  critical: 'Critical',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  not_ready: 'Not ready',
  defer: 'Defer',
  conditional_ready: 'Conditionally ready',
  ready_after_manual_confirmation: 'Ready after manual confirmation',
  block_until_reliability_review_complete: 'Block until reliability review is complete',
  defer_until_evidence_and_owner_confirmation_complete: 'Defer until evidence and owner confirmation are complete',
  accept_with_monitoring_after_manual_review: 'Accept with monitoring after manual review',
  accept_after_manual_reviewer_confirmation: 'Accept after manual reviewer confirmation',
  monitoring_blocked_until_manual_review: 'Monitoring blocked until manual review',
  monitoring_deferred_until_owner_confirmation: 'Monitoring deferred until owner confirmation',
  enhanced_monitoring_required: 'Enhanced monitoring required',
  standard_monitoring_after_manual_confirmation: 'Standard monitoring after manual confirmation',
  manual_incident_review_required_before_release: 'Manual incident review required before release',
  manual_incident_handoff_ready_if_observations_degrade: 'Manual incident handoff ready if observations degrade',
  manual_handoff_watch_required: 'Manual handoff watch required',
  standard_manual_handoff_reference: 'Standard manual handoff reference',
  blocked_pending_manual_incident_review: 'Blocked pending manual incident review',
  conditional_pending_owner_confirmation: 'Conditional pending owner confirmation',
  watch_pending_post_release_review: 'Watch pending post-release review',
  ready_for_manual_closure_review: 'Ready for manual closure review'
};

const SAFETY_LABELS: Record<string, string> = {
  read_only: 'Read only',
  source_workflows_remain_authoritative: 'Source workflows remain authoritative',
  creates_incident: 'Creates incident',
  executes_runbook: 'Executes runbook',
  sends_notification: 'Sends notification',
  records_signoff: 'Records signoff',
  records_decision: 'Records decision',
  changes_release_state: 'Changes release state',
  closes_risk: 'Closes risk',
  mutates_source_workflow: 'Mutates source workflow'
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

function formatNumber(value: number | null | undefined, locale: Parameters<typeof formatLocalizedNumber>[1], ui: (englishText: string) => string): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return ui('Not assessed');
  return formatLocalizedNumber(value, locale);
}

function formatScore(value: number | null | undefined, locale: Parameters<typeof formatLocalizedNumber>[1], ui: (englishText: string) => string): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return ui('Not assessed');
  return `${formatLocalizedNumber(Number(value.toFixed(2)), locale, { maximumFractionDigits: 2 })}%`;
}

function formatDateTime(value: string | null | undefined, locale: Parameters<typeof formatLocalizedDateTime>[1], ui: (englishText: string) => string): string {
  if (!value) return ui('Not reported');
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : formatLocalizedDateTime(date, locale);
}

function canonicalStatusLabel(value: string | null | undefined, ui: (englishText: string) => string, fallback = 'Not assessed'): string {
  const normalized = String(value || '').trim();
  if (!normalized) return ui(fallback);
  return CANONICAL_STATUS_LABELS[normalized] ? ui(CANONICAL_STATUS_LABELS[normalized]) : formatIdentifier(normalized, ui(fallback));
}

function safetyLabel(value: string, ui: (englishText: string) => string): string {
  return SAFETY_LABELS[value] ? ui(SAFETY_LABELS[value]) : formatIdentifier(value);
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

const RELIABILITY_SYSTEM_TEXT_CONTRACT = 'platform_reliability_command_system_text_v1';

function systemText(value: string | null | undefined, systemOwned: boolean, ui: (englishText: string) => string, fallback = 'Not reported'): string {
  const normalized = String(value || '').trim();
  if (!normalized) return ui(fallback);
  return systemOwned ? ui(normalized) : normalized;
}

function systemIdentifier(value: string | null | undefined, systemOwned: boolean, ui: (englishText: string) => string, fallback = 'Not reported'): string {
  const formatted = formatIdentifier(value, ui(fallback));
  return systemOwned ? ui(formatted) : formatted;
}

function formatEvidence(
  value: string,
  locale: Parameters<typeof formatLocalizedNumber>[1],
  ui: (englishText: string) => string,
  systemOwned: boolean
): string {
  const separatorIndex = value.indexOf(':');
  if (separatorIndex < 0) return systemText(formatSentence(value), systemOwned, ui);
  const key = formatIdentifier(value.slice(0, separatorIndex));
  const raw = value.slice(separatorIndex + 1).trim();
  let normalizedValue: string;
  if (raw === 'true') normalizedValue = ui('Yes');
  else if (raw === 'false') normalizedValue = ui('No');
  else if (/^-?\d+(?:\.\d+)?$/.test(raw)) normalizedValue = formatLocalizedNumber(Number(raw), locale);
  else if (CANONICAL_STATUS_LABELS[raw]) normalizedValue = ui(CANONICAL_STATUS_LABELS[raw]);
  else normalizedValue = systemText(formatSentence(raw, raw || ui('Not reported')), systemOwned, ui);
  return `${systemOwned ? ui(key) : key}: ${normalizedValue}`;
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
  const { ui } = useAppTranslation();
  return (
    <OperationalWorkspaceStatCard
      label={ui(label)}
      value={value}
      helper={ui(copy)}
      tone={tone}
      iconPath={iconPath}
      badge={status ? <span className={`reliability-badge ${toneClass(status)}`}>{canonicalStatusLabel(status, ui)}</span> : null}
    />
  );
}

function ReliabilityNavLink({ path, label }: { path: string; label?: string }) {
  const { ui } = useAppTranslation();
  return (
    <Link className="button button--secondary reliability-link-button" to={path}>
      <TenantNavIcon path={path} size={16} />
      <span>{ui(label || SOURCE_LABELS[path] || 'Open source page')}</span>
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
  const { locale, ui } = useAppTranslation();
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
      <div className="io-operational-page io-workspace-page reliability-page" data-reliability-refined="true">
        <section className="card reliability-state reliability-state--loading" aria-live="polite">
          <span className="reliability-state-icon"><TenantNavIcon path="/reliability-command" size={22} /></span>
          <div>
            <h2>{ui('Loading the reliability review')}</h2>
            <p>{ui('Combining permitted operational pressure, safeguards, and manual follow-up guidance.')}</p>
          </div>
        </section>
      </div>
    );
  }

  if (commandQuery.error) {
    return (
      <div className="io-operational-page io-workspace-page reliability-page" data-reliability-refined="true">
        <section className="card reliability-state reliability-state--error">
          <span className="reliability-state-icon reliability-state-icon--error"><TenantNavIcon path="/alerts" size={22} /></span>
          <div>
            <h2>{ui('Reliability review could not be loaded')}</h2>
            <p>{commandQuery.error instanceof ApiError ? commandQuery.error.message : ui('The Reliability Command summary is temporarily unavailable.')}</p>
            <button className="button button--secondary" type="button" onClick={() => commandQuery.refetch()}>{ui('Retry')}</button>
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
  const systemOwned = response?.presentation?.system_text_contract === RELIABILITY_SYSTEM_TEXT_CONTRACT;
  const dimensionLabelByKey = new Map(
    dimensions
      .filter((dimension) => dimension.key)
      .map((dimension) => [String(dimension.key), systemText(dimension.label, systemOwned, ui, 'Reliability dimension')])
  );
  const unassessedDimensionCount = Number(overview.unassessed_dimension_count || 0);
  const activeFilterCount = Number(readiness !== 'watch') + Number(severity !== 'all') + Number(limit !== '25');

  const clearFilters = () => {
    setReadiness('watch');
    setSeverity('all');
    setLimit('25');
  };

  return (
    <div className="io-operational-page io-workspace-page reliability-page" data-reliability-refined="true">
      <OperationalWorkspaceHero
        iconPath="/reliability-command"
        eyebrow={ui('Read-only operational reliability review')}
        title={ui('Review current pressure, safety checks, and the manual follow-up path')}
        description={ui('Reliability Command combines permitted operational context into advisory guidance only. It never closes a risk, records approval, starts monitoring, opens an incident, sends a notification, or changes a source workflow.')}
        meta={<>
          <OperationalWorkspaceMetaPill>{ui('Read-only guidance')}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>{ui('Manual follow-up')}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>{ui('Source workflows authoritative')}</OperationalWorkspaceMetaPill>
        </>}
        aside={<div style={{ display: 'grid', gap: 8 }}>
          <OperationalWorkspaceStatus value={formatLocalizedNumber(risks.length, locale)} label={ui(risks.length === 1 ? '{count} review risk · refreshed {time}' : '{count} review risks · refreshed {time}').replace('{count}', formatLocalizedNumber(risks.length, locale)).replace('{time}', formatDateTime(response?.generated_at, locale, ui))} />
          <button className="app-button app-button--secondary" type="button" onClick={() => commandQuery.refetch()} disabled={commandQuery.isFetching}>
            {commandQuery.isFetching ? ui('Refreshing…') : ui('Refresh review')}
          </button>
        </div>}
      />

      <section className="card reliability-filters" aria-labelledby="reliability-filter-title">
        <div className="reliability-section-heading">
          <div className="reliability-section-title">
            <span className="reliability-heading-icon"><TenantNavIcon path="/reliability-command" size={18} /></span>
            <div>
              <h2 id="reliability-filter-title">{ui('Filter the risk and review guidance')}</h2>
              <p className="card__subtext">{ui('The filters change which non-ready dimensions become review items. All nine reliability dimensions remain visible in the posture view.')}</p>
            </div>
          </div>
          {activeFilterCount > 0 ? <button className="button button--secondary reliability-link-button" type="button" onClick={clearFilters}><TenantNavIcon path="/reliability-command" size={16} /><span>{ui('Clear filters')}</span></button> : null}
        </div>
        <div className="reliability-filter-grid">
          <label>
            <span>{ui('Risk readiness threshold')}</span>
            <select value={readiness} onChange={(event) => setReadiness(event.target.value as ReadinessFilter)}>
              {READINESS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{ui(option.label)}</option>)}
            </select>
          </label>
          <label>
            <span>{ui('Risk severity threshold')}</span>
            <select value={severity} onChange={(event) => setSeverity(event.target.value as SeverityFilter)}>
              {SEVERITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{ui(option.label)}</option>)}
            </select>
          </label>
          <label>
            <span>{ui('Maximum review items')}</span>
            <select value={limit} onChange={(event) => setLimit(event.target.value as ResultLimit)}>
              {LIMIT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        </div>
        <div className="reliability-filter-summary">
          <span>{ui('Readiness')}: <strong>{ui(READINESS_OPTIONS.find((option) => option.value === readiness)?.label || 'Watch or worse')}</strong></span>
          <span>{ui('Severity')}: <strong>{ui(SEVERITY_OPTIONS.find((option) => option.value === severity)?.label || 'All severities')}</strong></span>
          <span>{ui('Up to {count} items per review stage').replace('{count}', formatLocalizedNumber(Number(response?.filters?.limit || limit), locale))}</span>
        </div>
      </section>

      <section className="reliability-summary-grid io-workspace-stats" aria-label={ui('Reliability summary')}>
        <ReliabilitySummaryCard iconPath="/reliability-command" label="Advisory reliability score" value={formatScore(overview.reliability_score, locale, ui)} copy="Average of current operational pressure and read-only safety checks—not an uptime percentage." tone="blue" />
        <ReliabilitySummaryCard iconPath="/action-center" label="Overall posture" value={canonicalStatusLabel(overview.readiness, ui)} copy="Current advisory posture across the nine reliability dimensions." tone="green" status={overview.readiness} />
        <ReliabilitySummaryCard iconPath="/alerts" label="Review risks" value={formatNumber(overview.risk_count ?? risks.length, locale, ui)} copy="Non-ready dimensions matching the selected thresholds." tone="amber" />
        <ReliabilitySummaryCard iconPath="/workflow-composer" label="Manual closure guides" value={formatNumber(overview.closure_review_count, locale, ui)} copy="Generated guidance only. No risk is closed and no signoff is recorded." tone="slate" />
      </section>

      <div className="reliability-scoring-note"><TenantNavIcon path="/reliability-command" size={18} /><span>{systemText(overview.scoring_note, systemOwned, ui, 'Reliability scoring guidance is not available.')}</span></div>

      <OperationalWorkspaceTabs ariaLabel={ui('Reliability Command views')}>
        <OperationalWorkspaceTab active={view === 'posture'} iconPath="/reliability-command" label={ui('Posture and risks')} onClick={() => setView('posture')} />
        <OperationalWorkspaceTab active={view === 'review-path'} iconPath="/workflow-composer" label={ui('Manual review path')} onClick={() => setView('review-path')} />
        <OperationalWorkspaceTab active={view === 'limits'} iconPath="/reliability-command" label={ui('Safety and limits')} onClick={() => setView('limits')} />
      </OperationalWorkspaceTabs>

      {view === 'posture' ? (
        <section className="reliability-posture" aria-labelledby="reliability-posture-title">
          <div className="reliability-section-heading reliability-section-heading--outside">
            <div className="reliability-section-title">
              <span className="reliability-heading-icon"><TenantNavIcon path="/reliability-command" size={18} /></span>
              <div>
                <h2 id="reliability-posture-title">{ui('Reliability posture')}</h2>
                <p className="card__subtext">{ui('Review the nine dimensions first, then open the source workflow for any dimension that needs attention.')}</p>
              </div>
            </div>
            <div className="reliability-shortcuts">
              {hasPermission(TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ) ? <ReliabilityNavLink path="/action-center" /> : null}
              {hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ) ? <ReliabilityNavLink path="/intelligence-review" /> : null}
            </div>
          </div>

          <section className="reliability-dimension-grid" aria-label={ui('Reliability dimensions')}>
            {dimensions.map((dimension) => {
              const sourcePath = dimension.source_path || null;
              return (
                <article className="card reliability-dimension-card" key={dimension.key || dimension.label}>
                  <div className="reliability-card-heading">
                    <div className="reliability-card-title">
                      <span className="reliability-card-icon"><TenantNavIcon path={sourcePath || '/reliability-command'} size={17} /></span>
                      <div>
                        <div className="card__label">{ui('Reliability dimension')}</div>
                        <h3>{systemText(dimension.label, systemOwned, ui, 'Reliability dimension')}</h3>
                      </div>
                    </div>
                    <span className={`reliability-badge ${toneClass(dimension.readiness)}`}>{canonicalStatusLabel(dimension.readiness, ui)}</span>
                  </div>
                  <div className="reliability-score-line"><strong>{formatScore(dimension.score, locale, ui)}</strong><span>{ui('Dimension score')}</span></div>
                  <p className="card__subtext">{systemText(dimension.recommendation, systemOwned, ui, 'No recommendation was reported.')}</p>
                  {dimension.evidence?.length ? (
                    <ul className="reliability-evidence-list">
                      {dimension.evidence.map((item) => <li key={item}>{formatEvidence(item, locale, ui, systemOwned)}</li>)}
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
                  <h2 id="reliability-risk-title">{ui('Risk triage guidance')}</h2>
                  <p className="card__subtext">{ui('These are generated review recommendations for dimensions that match the filters. They are not saved incidents or assigned tasks.')}</p>
                </div>
              </div>
              <span className="reliability-returned-badge">{ui('{count} returned').replace('{count}', formatLocalizedNumber(risks.length, locale))}</span>
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
                            <h3>{systemText(risk.label, systemOwned, ui, 'Reliability review item')}</h3>
                            <p>{dimensionLabelByKey.get(String(risk.dimension || '')) || ui('Reliability dimension')}</p>
                          </div>
                        </div>
                        <div className="reliability-badge-row">
                          <span className={`reliability-badge ${toneClass(risk.severity)}`}>{canonicalStatusLabel(risk.severity, ui)}</span>
                          <span className={`reliability-badge ${toneClass(risk.readiness)}`}>{canonicalStatusLabel(risk.readiness, ui)}</span>
                        </div>
                      </div>
                      <p>{systemText(risk.recommended_next_action, systemOwned, ui, 'Review the source workflow and capture the human decision there.')}</p>
                      <dl className="reliability-facts">
                        <div><dt>{ui('Score')}</dt><dd>{formatScore(risk.score, locale, ui)}</dd></div>
                        <div><dt>{ui('Suggested owner')}</dt><dd>{systemIdentifier(risk.recommended_owner, systemOwned, ui)}</dd></div>
                        <div><dt>{ui('Suggested runbook')}</dt><dd>{systemIdentifier(risk.recommended_runbook, systemOwned, ui)}</dd></div>
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
                <h3>{ui(unassessedDimensionCount > 0 ? 'No assessed non-ready risks match the current thresholds' : 'No non-ready risks match the current thresholds')}</h3>
                <p>{ui(unassessedDimensionCount > 0
                  ? 'Some dimensions are not assessed because this role cannot read their required source surfaces. Assessed dimensions are Ready or excluded by the selected threshold.'
                  : 'All current dimensions are Ready or excluded by the selected threshold. This is not a release approval, uptime guarantee, or proof that every operational issue is closed.')}</p>
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
              <h2 id="reliability-review-path-title">{ui('Generated manual review path')}</h2>
              <p className="card__subtext">{ui('The stages below translate each matching reliability risk into suggested investigation, evidence, review, release, monitoring, handoff, and closure guidance. They do not create records, upload evidence, record decisions, approve releases, start monitoring, open incidents, or close risks.')}</p>
            </div>
          </div>
          <div className="reliability-stage-list">
            {reviewPath.map((stage, stageIndex) => (
              <details className="card reliability-stage" key={stage.key || stage.label} open={stageIndex === 0 && Boolean(stage.item_count)}>
                <summary>
                  <div className="reliability-stage-summary-title">
                    <span className="reliability-card-icon"><TenantNavIcon path={reviewStageIconPath(stage.key)} size={17} /></span>
                    <div>
                      <h3>{systemText(stage.label, systemOwned, ui, 'Manual review stage')}</h3>
                      <p>{systemText(stage.description, systemOwned, ui, 'Manual review guidance')}</p>
                    </div>
                  </div>
                  <span>{ui('{count} items').replace('{count}', formatNumber(stage.item_count ?? stage.items?.length ?? 0, locale, ui))}</span>
                </summary>
                {stage.items?.length ? (
                  <div className="reliability-stage-items">
                    {stage.items.map((item) => {
                      const sourcePath = item.source_path || null;
                      return (
                        <article className="reliability-stage-item" key={item.item_key || `${stage.key}-${item.label}`}>
                          <div className="reliability-card-heading">
                            <div>
                              <h4>{systemText(item.label, systemOwned, ui, 'Reliability review item')}</h4>
                              <p>{dimensionLabelByKey.get(String(item.dimension || '')) || ui('Reliability dimension')}</p>
                            </div>
                            <div className="reliability-badge-row">
                              <span className={`reliability-badge ${toneClass(item.severity)}`}>{canonicalStatusLabel(item.severity, ui)}</span>
                              <span className={`reliability-badge ${toneClass(item.stage_status)}`}>{canonicalStatusLabel(item.stage_status, ui)}</span>
                            </div>
                          </div>
                          <dl className="reliability-facts">
                            <div><dt>{ui('Suggested owner')}</dt><dd>{systemIdentifier(item.owner, systemOwned, ui)}</dd></div>
                            <div><dt>{ui('Suggested reviewer')}</dt><dd>{systemIdentifier(item.reviewer, systemOwned, ui)}</dd></div>
                          </dl>
                          {item.instructions?.length ? (
                            <ol className="reliability-instruction-list">
                              {item.instructions.map((instruction) => <li key={instruction}>{systemText(formatSentence(instruction), systemOwned, ui)}</li>)}
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
                  <div className="reliability-inline-empty">{ui('No matching risk generated guidance for this stage.')}</div>
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
                <h2 id="reliability-limits-title">{ui('Safety and interpretation limits')}</h2>
                <p className="card__subtext">{ui('These rules apply to every score, risk, and review-stage item on the page.')}</p>
              </div>
            </div>
          </div>
          <article className="card reliability-limit-card"><span className="reliability-limit-icon"><TenantNavIcon path="/reliability-command" size={18} /></span><div><h3>{ui('Advisory score only')}</h3><p className="card__subtext">{ui('The score combines operational pressure and safety-contract checks. It is not uptime, service availability, deployment approval, or a legal assurance.')}</p></div></article>
          <article className="card reliability-limit-card"><span className="reliability-limit-icon"><TenantNavIcon path="/workflow-composer" size={18} /></span><div><h3>{ui('No automatic remediation')}</h3><p className="card__subtext">{ui('The page does not run a runbook, change stock, alter a workflow, call an integration, or execute a recommendation.')}</p></div></article>
          <article className="card reliability-limit-card"><span className="reliability-limit-icon"><TenantNavIcon path="/intelligence-review" size={18} /></span><div><h3>{ui('No approval or signoff')}</h3><p className="card__subtext">{ui('A Ready result does not record approval, signoff, release acceptance, or a decision.')}</p></div></article>
          <article className="card reliability-limit-card"><span className="reliability-limit-icon"><TenantNavIcon path="/alerts" size={18} /></span><div><h3>{ui('No incident or notification')}</h3><p className="card__subtext">{ui('The page does not open an incident, page a team, send a message, or notify an external party.')}</p></div></article>
          <article className="card reliability-limit-card"><span className="reliability-limit-icon"><TenantNavIcon path="/real-time-operations-feed" size={18} /></span><div><h3>{ui('No monitoring activation')}</h3><p className="card__subtext">{ui('Monitoring windows and cadence are guidance. Nothing is scheduled or activated here.')}</p></div></article>
          <article className="card reliability-limit-card"><span className="reliability-limit-icon"><TenantNavIcon path="/action-center" size={18} /></span><div><h3>{ui('Source workflows stay authoritative')}</h3><p className="card__subtext">{ui('Evidence, owners, decisions, approvals, remediation, and closure must be handled in the linked source workflow.')}</p></div></article>
          <article className="card reliability-safety-summary">
            <div className="reliability-section-title"><span className="reliability-heading-icon reliability-heading-icon--slate"><TenantNavIcon path="/reliability-command" size={18} /></span><div><h3>{ui('Backend safety confirmation')}</h3><p className="card__subtext">{ui('The API confirms the same non-mutating guardrails shown above.')}</p></div></div>
            <dl className="reliability-facts reliability-safety-facts">
              {Object.entries(safety).map(([key, value]) => <div key={key}><dt>{safetyLabel(key, ui)}</dt><dd><span className={`reliability-safety-value ${value ? 'is-safe' : 'is-blocked'}`}>{value ? ui('Yes') : ui('No')}</span></dd></div>)}
            </dl>
          </article>
        </section>
      ) : null}

    </div>
  );
}
