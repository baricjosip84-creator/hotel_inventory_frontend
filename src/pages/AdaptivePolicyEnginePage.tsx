import { useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { useAppTranslation } from '../i18n/I18nContext';
import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
import { TENANT_PERMISSIONS, hasPermission } from '../lib/permissions';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import {
  OperationalWorkspaceHero,
  // OperationalWorkspaceMetaPill, // Hidden: repetitive tenant-facing technical badge.
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus,
  OperationalWorkspaceTab,
  OperationalWorkspaceTabs
} from '../components/ui/OperationalWorkspace';
import './decisionIntelligencePages.css';
import './AdaptivePolicyEnginePage.css';

type AdaptivePolicyView = 'evidence' | 'readiness' | 'diagnostics';

type AdaptivePolicyFilters = {
  policy_domain: string;
  policy_type: string;
  policy_status: string;
  recommendation_type: string;
  limit: string;
};

type CheckItem = {
  check_id?: string;
  label?: string;
  passed?: boolean;
  observed_count?: number;
  required_next_step?: string;
  [key: string]: unknown;
};

type BlockerItem = {
  blocker_id?: string;
  severity?: string;
  summary?: string;
  [key: string]: unknown;
};

type LifecycleSection = {
  ready_check_count?: number;
  blocked_check_count?: number;
  [key: string]: unknown;
};

type AdaptivePolicyRecord = {
  id?: string;
  policy_key?: string;
  title?: string;
  summary?: string;
  policy_domain?: string;
  policy_type?: string;
  policy_status?: string;
  confidence_score?: number | string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

type PolicySignalRecord = {
  policy_key?: string;
  signal_domain?: string;
  signal_type?: string;
  variance_score?: number | string | null;
  weight?: number | string | null;
  confidence_score?: number | string | null;
  observed_at?: string;
  [key: string]: unknown;
};

type PolicyRecommendationRecord = {
  id?: string;
  policy_id?: string;
  source_action_id?: string;
  policy_key?: string;
  recommendation_key?: string;
  recommendation_status?: string;
  recommendation_type?: string;
  explanation_summary?: string;
  confidence_score?: number | string | null;
  risk_level?: string;
  approval_requirement?: string;
  recommended_adjustment?: Record<string, unknown>;
  expected_impact?: Record<string, unknown>;
  created_at?: string;
  [key: string]: unknown;
};

type PolicyApplicationRecord = {
  id?: string;
  policy_id?: string;
  policy_key?: string;
  recommendation_id?: string;
  application_status?: string;
  previous_value?: Record<string, unknown>;
  applied_value?: Record<string, unknown>;
  change_summary?: string;
  source_workflow?: string;
  baseline_score?: number | string | null;
  applied_at?: string;
  last_reviewed_at?: string;
  closed_at?: string;
  close_reason?: string;
  [key: string]: unknown;
};

type PolicyEffectivenessRecord = {
  policy_key?: string;
  measurement_key?: string;
  measurement_type?: string;
  baseline_score?: number | string | null;
  observed_score?: number | string | null;
  delta_score?: number | string | null;
  confidence_score?: number | string | null;
  measured_at?: string;
  [key: string]: unknown;
};

type AdaptivePolicySummary = {
  filters?: Partial<AdaptivePolicyFilters> & { limit?: number };
  governance?: {
    policy_count?: number;
    signal_count?: number;
    recommendation_count?: number;
    effectiveness_measurement_count?: number;
    recommendation_ready_policy_count?: number;
    review_required_policy_count?: number;
    manual_application_approved_policy_count?: number;
    application_count?: number;
    active_application_count?: number;
    applied_monitoring_policy_count?: number;
    recalibration_review_policy_count?: number;
    rollback_review_policy_count?: number;
    review_required_recommendation_count?: number;
    high_risk_recommendation_count?: number;
    observed_domains?: string[];
    adaptive_policy_posture?: string;
    [key: string]: unknown;
  };
  policies?: AdaptivePolicyRecord[];
  signals?: PolicySignalRecord[];
  recommendations?: PolicyRecommendationRecord[];
  effectiveness?: PolicyEffectivenessRecord[];
  applications?: PolicyApplicationRecord[];
  analysis?: {
    analysis_run_id?: string;
    source?: string;
    status?: string;
    generated_policy_count?: number;
    analysis_generated_at?: string;
    analysis_started_at?: string;
    analysis_finished_at?: string;
    error_summary?: string | null;
  } | null;
  learning_feedback_loop?: LifecycleSection;
  outcome_reconciliation?: LifecycleSection;
  promotion_guard?: LifecycleSection;
  post_promotion_monitoring?: LifecycleSection;
  rollback_retirement_gate?: LifecycleSection;
  response_contract_audit?: LifecycleSection;
  supported_definitions?: unknown;
  [key: string]: unknown;
};

type LifecycleConfig = {
  key: keyof AdaptivePolicySummary;
  title: string;
  iconPath: string;
  description: string;
  decisionKey: string;
  scoreKey: string;
  blockersKey: string;
  checksKey: string;
  metrics: Array<{ label: string; key: string; format?: 'number' | 'percent' | 'delta' }>;
};

const DEFAULT_FILTERS: AdaptivePolicyFilters = {
  policy_domain: '',
  policy_type: '',
  policy_status: '',
  recommendation_type: '',
  limit: '25'
};

const POLICY_DOMAINS = [
  'inventory',
  'procurement',
  'reservation',
  'execution',
  'optimization',
  'control_tower',
  'financial',
  'integration',
  'system'
];

const POLICY_TYPES = [
  'dynamic_replenishment',
  'adaptive_reservation',
  'sla_cost_balance',
  'labor_allocation',
  'supplier_selection',
  'facility_balancing',
  'working_capital_control',
  'integration_throttle',
  'general'
];

const POLICY_STATUSES = [
  'draft',
  'observing',
  'recommendation_ready',
  'review_required',
  'approved_for_manual_application',
  'applied_monitoring',
  'recalibration_review',
  'rollback_review',
  'rejected',
  'retired'
];

const RECOMMENDATION_TYPES = [
  'tuning_adjustment',
  'threshold_adjustment',
  'objective_reweighting',
  'guardrail_tightening',
  'guardrail_relaxation',
  'policy_retirement',
  'general'
];

const DECISION_LABELS: Record<string, string> = {
  not_assessed_no_policy_evidence: 'Not assessed — no policy evidence',
  learning_review_required_before_policy_tuning: 'Learning review required before tuning',
  ready_for_governed_manual_policy_tuning_review: 'Ready for governed manual tuning review',
  outcome_reconciliation_required_before_policy_promotion: 'Outcome evidence must be reconciled before promotion',
  ready_for_governed_policy_promotion_review: 'Ready for governed promotion review',
  promotion_blocked_pending_governance_and_evidence: 'Promotion blocked pending evidence or approval',
  ready_for_manual_policy_promotion_review: 'Ready for manual promotion review',
  monitoring_or_drift_review_required: 'Monitoring or drift review required',
  monitoring_or_lifecycle_review_required: 'Monitoring or lifecycle review required',
  ready_for_manual_policy_stability_review: 'Ready for manual stability review',
  rollback_or_retirement_review_required: 'Rollback or retirement review required',
  rollback_recalibration_or_retirement_review_required: 'Rollback, recalibration, or retirement review required',
  ready_for_manual_policy_lifecycle_clearance: 'Ready for manual lifecycle clearance',
  no_policy_evidence_available: 'No policy evidence available',
  policy_governance_review_required: 'Governance review required',
  controlled_policy_observation: 'Controlled policy observation',
  applied_policy_monitoring: 'Applied policy monitoring'
};

const LIFECYCLE_SECTIONS: LifecycleConfig[] = [
  {
    key: 'learning_feedback_loop',
    title: 'Learning readiness',
    iconPath: '/decision-learning-feedback',
    description: 'Checks whether policies have enough signals, measured results, and human review evidence to support a tuning discussion.',
    decisionKey: 'learning_feedback_decision',
    scoreKey: 'learning_feedback_score',
    blockersKey: 'feedback_blockers',
    checksKey: 'feedback_checks',
    metrics: [
      { label: 'Policies', key: 'policy_count' },
      { label: 'Signals', key: 'signal_count' },
      { label: 'Recommendations', key: 'recommendation_count' },
      { label: 'Measurements', key: 'effectiveness_measurement_count' },
      { label: 'Average confidence', key: 'average_confidence_score', format: 'percent' },
      { label: 'Average measured change', key: 'average_effectiveness_delta', format: 'delta' }
    ]
  },
  {
    key: 'outcome_reconciliation',
    title: 'Outcome reconciliation',
    iconPath: '/reports',
    description: 'Checks whether actually applied policy changes can be traced to real before-and-after business outcomes.',
    decisionKey: 'outcome_reconciliation_decision',
    scoreKey: 'outcome_reconciliation_score',
    blockersKey: 'reconciliation_blockers',
    checksKey: 'reconciliation_checks',
    metrics: [
      { label: 'Reconciled policies', key: 'reconciled_policy_count' },
      { label: 'Positive outcomes', key: 'positive_outcome_count' },
      { label: 'Neutral outcomes', key: 'neutral_outcome_count' },
      { label: 'Negative outcomes', key: 'negative_outcome_count' },
      { label: 'Low-confidence outcomes', key: 'low_confidence_outcome_count' },
      { label: 'Average outcome confidence', key: 'average_outcome_confidence', format: 'percent' }
    ]
  },
  {
    key: 'promotion_guard',
    title: 'Promotion safety review',
    iconPath: '/permissions',
    description: 'Checks whether a policy pattern has enough signal, outcome, approval, and rollback evidence before wider manual reuse.',
    decisionKey: 'promotion_decision',
    scoreKey: 'promotion_score',
    blockersKey: 'promotion_blockers',
    checksKey: 'promotion_checks',
    metrics: [
      { label: 'Promotion candidates', key: 'promotion_candidate_count' },
      { label: 'High-risk candidates', key: 'high_risk_promotion_candidate_count' },
      { label: 'Evidence-covered policies', key: 'promotion_evidence_policy_count' },
      { label: 'Positive outcomes', key: 'positive_outcome_count' },
      { label: 'Negative outcomes', key: 'negative_outcome_count' },
      { label: 'Average candidate confidence', key: 'average_promotion_confidence', format: 'percent' }
    ]
  },
  {
    key: 'post_promotion_monitoring',
    title: 'Post-promotion monitoring',
    iconPath: '/reliability-command',
    description: 'Checks whether actually applied policies remain measured and connected to monitoring signals after the change was recorded.',
    decisionKey: 'monitoring_decision',
    scoreKey: 'monitoring_score',
    blockersKey: 'monitoring_blockers',
    checksKey: 'monitoring_checks',
    metrics: [
      { label: 'Applied policies', key: 'applied_policy_count' },
      { label: 'Measured applied policies', key: 'applied_policy_measurement_count' },
      { label: 'Signal-monitored policies', key: 'applied_policy_signal_count' },
      { label: 'Unmeasured applied policies', key: 'stale_or_unmeasured_applied_policy_count' },
      { label: 'Severe negative outcomes', key: 'severe_negative_outcome_count' },
      { label: 'Average outcome confidence', key: 'average_outcome_confidence', format: 'percent' }
    ]
  },
  {
    key: 'rollback_retirement_gate',
    title: 'Rollback and retirement review',
    iconPath: '/alerts',
    description: 'Checks whether negative results, retired policies, and high-risk recommendations have enough evidence for a manual lifecycle decision.',
    decisionKey: 'rollback_retirement_decision',
    scoreKey: 'rollback_retirement_score',
    blockersKey: 'rollback_retirement_blockers',
    checksKey: 'rollback_retirement_checks',
    metrics: [
      { label: 'Applied negative policies', key: 'applied_policy_with_negative_evidence_count' },
      { label: 'Severe negative policies', key: 'applied_policy_with_severe_negative_evidence_count' },
      { label: 'Retired policies with evidence', key: 'retired_policy_with_evidence_count' },
      { label: 'Low-confidence outcomes', key: 'low_confidence_outcome_count' },
      { label: 'High-risk recommendations', key: 'high_risk_recommendation_count' },
      { label: 'Average measured change', key: 'average_effectiveness_delta', format: 'delta' }
    ]
  }
];


const GENERATED_POLICY_COPY: Record<string, { title: string; summary: string }> = {
  'live:inventory:dynamic-replenishment': {
    title: 'Dynamic replenishment policy',
    summary: 'Checks whether products still need replenishment after reservations, reliable inbound, approved purchase-order commitments, and location-level stock rules are considered.'
  },
  'live:reservation:allocation': {
    title: 'Reservation allocation policy',
    summary: 'Checks whether active reservations are being allocated without blocked or partial allocation pressure.'
  },
  'live:procurement:supplier-selection': {
    title: 'Supplier delivery policy',
    summary: 'Checks supplier delivery and receiving performance using on-time delivery, late delivery, discrepancies, damaged or rejected quantities, and recent performance trend.'
  },
  'live:execution:task-flow': {
    title: 'Execution task flow policy',
    summary: 'Checks whether active execution work is becoming blocked and may need task-routing or labor-allocation tuning.'
  }
};

const GENERATED_RECOMMENDATION_COPY: Record<string, string> = {
  'live:inventory:dynamic-replenishment:tuning-review': 'Review replenishment thresholds and supply position because some products still need replenishment after committed supply and location rules are considered.',
  'live:reservation:allocation:tuning-review': 'Review reservation allocation rules because some active reservations have blocked or partial allocation.',
  'live:procurement:supplier-selection:tuning-review': 'Review supplier-selection or receiving rules because measured supplier evidence shows delivery or receiving risk.',
  'live:execution:task-flow:tuning-review': 'Review execution task-routing or labor-allocation rules because active work is blocked.'
};

function policyDisplayCopy(policy: AdaptivePolicyRecord, ui: (key: string) => string) {
  const generated = policy.policy_key ? GENERATED_POLICY_COPY[policy.policy_key] : undefined;
  return {
    title: generated ? ui(generated.title) : (policy.title || formatLabel(policy.policy_key)),
    summary: generated ? ui(generated.summary) : policy.summary
  };
}

function recommendationDisplaySummary(recommendation: PolicyRecommendationRecord, ui: (key: string) => string) {
  const generated = recommendation.recommendation_key ? GENERATED_RECOMMENDATION_COPY[recommendation.recommendation_key] : undefined;
  return generated ? ui(generated) : recommendation.explanation_summary;
}

function recommendedAdjustmentSummary(recommendation: PolicyRecommendationRecord, ui: (key: string) => string): string | null {
  const adjustment = recommendation.recommended_adjustment || {};
  const productCount = Number(adjustment.affected_product_count || 0);
  const locationCount = Number(adjustment.affected_location_count || 0);
  const supplierCount = Number(adjustment.affected_supplier_count || 0);
  const reservationCount = Number(adjustment.affected_reservation_count || 0);
  const taskCount = Number(adjustment.affected_task_count || 0);
  if (productCount > 0 || locationCount > 0) {
    return ui('Proposed review covers {products} product(s) and {locations} location(s).')
      .replace('{products}', String(productCount))
      .replace('{locations}', String(locationCount));
  }
  if (supplierCount > 0) return ui('Proposed review covers {count} supplier(s) with measured delivery or receiving risk.').replace('{count}', String(supplierCount));
  if (reservationCount > 0) return ui('Proposed review covers {count} reservation(s) with allocation pressure.').replace('{count}', String(reservationCount));
  if (taskCount > 0) return ui('Proposed review covers {count} blocked execution task(s).').replace('{count}', String(taskCount));
  return null;
}

function prettyPolicyValue(value: Record<string, unknown> | undefined): string {
  return JSON.stringify(value || {}, null, 2);
}

function summarizePolicyValue(value: Record<string, unknown> | undefined, ui: (key: string) => string): string {
  const entries = Object.entries(value || {});
  if (!entries.length) return ui('Not reported');
  return entries.slice(0, 4).map(([key, item]) => {
    if (item === null || item === undefined) return `${formatLabel(key)}: —`;
    if (typeof item === 'object') return `${formatLabel(key)}: ${ui('Detailed value recorded')}`;
    return `${formatLabel(key)}: ${String(item)}`;
  }).join(' · ');
}

function formatLabel(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not reported';
  const text = String(value);
  if (!/[_-]/.test(text)) {
    return text.includes(' ') ? text : `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
  }
  return text
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

const CANONICAL_LABELS: Record<string, string> = {
  ...DECISION_LABELS,
  inventory: 'Inventory',
  procurement: 'Procurement',
  reservation: 'Reservation',
  execution: 'Execution',
  optimization: 'Optimization',
  control_tower: 'Control tower',
  financial: 'Financial',
  integration: 'Integration',
  system: 'System',
  dynamic_replenishment: 'Dynamic replenishment',
  adaptive_reservation: 'Adaptive reservation',
  sla_cost_balance: 'SLA / cost balance',
  labor_allocation: 'Labour allocation',
  supplier_selection: 'Supplier selection',
  facility_balancing: 'Facility balancing',
  working_capital_control: 'Working capital control',
  integration_throttle: 'Integration throttle',
  general: 'General',
  draft: 'Draft',
  observing: 'Observing',
  recommendation_ready: 'Recommendation ready',
  review_required: 'Review required',
  approved_for_manual_application: 'Approved for manual application',
  applied_monitoring: 'Applied — monitoring',
  recalibration_review: 'Recalibration review',
  rollback_review: 'Rollback review',
  recalibrated: 'Recalibrated',
  rolled_back: 'Rolled back',
  rejected: 'Rejected',
  retired: 'Retired',
  tuning_adjustment: 'Tuning adjustment',
  threshold_adjustment: 'Threshold adjustment',
  objective_reweighting: 'Objective reweighting',
  guardrail_tightening: 'Guardrail tightening',
  guardrail_relaxation: 'Guardrail relaxation',
  policy_retirement: 'Policy retirement',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical'
};

function formatCanonicalLabel(value: unknown, ui: (englishText: string) => string): string {
  if (value === null || value === undefined || value === '') return ui('Not reported');
  const text = String(value);
  const canonical = CANONICAL_LABELS[text];
  return canonical ? ui(canonical) : formatLabel(value);
}

function formatNumber(value: unknown, locale: Parameters<typeof formatLocalizedNumber>[1]): string {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? formatLocalizedNumber(numeric, locale) : String(value);
}

function formatPercentage(value: unknown, locale: Parameters<typeof formatLocalizedNumber>[1]): string {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${formatLocalizedNumber(Math.round(numeric), locale)}%` : String(value);
}

function formatStoredConfidence(value: unknown, locale: Parameters<typeof formatLocalizedNumber>[1]): string {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  const percentage = numeric >= 0 && numeric <= 1 ? numeric * 100 : numeric;
  return `${formatLocalizedNumber(Math.round(percentage), locale)}%`;
}

function formatDelta(value: unknown, locale: Parameters<typeof formatLocalizedNumber>[1]): string {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return `${numeric > 0 ? '+' : ''}${formatLocalizedNumber(numeric, locale)}`;
}

function metricValue(value: unknown, format: 'number' | 'percent' | 'delta' | undefined, locale: Parameters<typeof formatLocalizedNumber>[1]): string {
  if (format === 'percent') return formatPercentage(value, locale);
  if (format === 'delta') return formatDelta(value, locale);
  return formatNumber(value, locale);
}

function StatusBadge({ value, tone }: { value: unknown; tone?: 'good' | 'warning' | 'danger' | 'neutral' }) {
  const { ui } = useAppTranslation();
  return <span className={`adaptive-policy-badge adaptive-policy-badge--${tone || 'neutral'}`}>{formatCanonicalLabel(value, ui)}</span>;
}

function MetricCard({
  label,
  value,
  format,
  iconPath,
  tone = 'blue'
}: {
  label: string;
  value: unknown;
  format?: 'number' | 'percent' | 'delta';
  iconPath?: string;
  tone?: 'blue' | 'green' | 'amber' | 'violet' | 'slate';
}) {
  const { locale, ui } = useAppTranslation();
  return (
    <OperationalWorkspaceStatCard
      label={ui(label)}
      value={metricValue(value, format, locale)}
      iconPath={iconPath}
      tone={tone === 'violet' ? 'blue' : tone}
    />
  );
}

function CheckList({ title, items, kind }: { title: string; items: CheckItem[] | BlockerItem[]; kind: 'checks' | 'blockers' }) {
  const { locale, ui } = useAppTranslation();
  return (
    <section className="adaptive-policy-check-card">
      <h3><span className={`adaptive-policy-heading-icon ${kind === 'blockers' ? 'adaptive-policy-heading-icon--warning' : ''}`}><TenantNavIcon path={kind === 'blockers' ? '/alerts' : '/permissions'} size={15} /></span>{ui(title)}</h3>
      {!items.length ? (
        <p className="adaptive-policy-muted">{ui('No items require attention in this section.')}</p>
      ) : (
        <div className="adaptive-policy-check-list">
          {items.map((item, index) => {
            const check = item as CheckItem;
            const blocker = item as BlockerItem;
            const passed = check.passed;
            return (
              <article className="adaptive-policy-check-item" key={`${title}-${check.check_id || blocker.blocker_id || index}`}>
                <div className="adaptive-policy-check-item__heading">
                  <strong>{check.label ? formatLabel(check.label) : blocker.summary || ui('Review item')}</strong>
                  {kind === 'checks' ? (
                    <span className={`adaptive-policy-badge adaptive-policy-badge--${passed ? 'good' : 'warning'}`}>{ui(passed ? 'Passed' : 'Needs attention')}</span>
                  ) : (
                    <StatusBadge value={blocker.severity || 'Review'} tone={blocker.severity === 'high' ? 'danger' : 'warning'} />
                  )}
                </div>
                {kind === 'checks' && check.required_next_step ? <p>{check.required_next_step}</p> : null}
                {kind === 'blockers' && blocker.summary ? <p>{blocker.summary}</p> : null}
                {kind === 'checks' && check.observed_count !== undefined ? (
                  <span className="adaptive-policy-observed">{ui('Evidence records counted: {count}').replace('{count}', formatLocalizedNumber(check.observed_count, locale))}</span>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function LifecycleCard({ config, section }: { config: LifecycleConfig; section?: LifecycleSection }) {
  const { ui } = useAppTranslation();
  const score = section?.[config.scoreKey];
  const decision = section?.[config.decisionKey];
  const blockers = (section?.[config.blockersKey] as BlockerItem[] | undefined) || [];
  const checks = (section?.[config.checksKey] as CheckItem[] | undefined) || [];

  return (
    <section className="card adaptive-policy-lifecycle">
      <div className="adaptive-policy-lifecycle__header">
        <div className="adaptive-policy-section-heading">
          <span className="adaptive-policy-heading-icon"><TenantNavIcon path={config.iconPath} size={17} /></span>
          <div>
            <h2>{ui(config.title)}</h2>
            <p className="card__subtext">{ui(config.description)}</p>
          </div>
        </div>
        <div className="adaptive-policy-decision">
          <span>{ui('Current assessment')}</span>
          <strong>{formatCanonicalLabel(decision, ui)}</strong>
        </div>
      </div>

      <div className="adaptive-policy-metrics">
        <MetricCard label="Readiness score" value={score === null ? null : score} format={score === null ? undefined : 'number'} />
        <MetricCard label="Passed checks" value={section?.ready_check_count} />
        <MetricCard label="Checks needing attention" value={section?.blocked_check_count} />
        {config.metrics.map((metric) => (
          <MetricCard key={metric.key} label={metric.label} value={section?.[metric.key]} format={metric.format} />
        ))}
      </div>

      <div className="adaptive-policy-check-grid">
        <CheckList title={ui('What needs attention')} items={blockers} kind="blockers" />
        <CheckList title={ui('Evidence checks')} items={checks} kind="checks" />
      </div>
    </section>
  );
}

function EvidenceSection({
  title,
  description,
  iconPath,
  rows,
  headers,
  renderRow
}: {
  title: string;
  description: string;
  iconPath: string;
  rows: Array<Record<string, unknown>>;
  headers: string[];
  renderRow: (row: Record<string, unknown>, index: number) => ReactNode;
}) {
  const { locale, ui } = useAppTranslation();
  return (
    <section className="card adaptive-policy-evidence-section">
      <div className="card__header">
        <div className="adaptive-policy-section-heading">
          <span className="adaptive-policy-heading-icon"><TenantNavIcon path={iconPath} size={17} /></span>
          <div>
            <h2>{ui(title)}</h2>
            <p className="card__subtext">{ui(description)}</p>
          </div>
        </div>
        <span className="adaptive-policy-badge adaptive-policy-badge--neutral">{ui('{count} returned').replace('{count}', formatLocalizedNumber(rows.length, locale))}</span>
      </div>
      {!rows.length ? (
        <p className="adaptive-policy-muted">{ui('No matching records were returned.')}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table adaptive-policy-table">
            <thead>
              <tr>{headers.map((header) => <th key={header}>{ui(header)}</th>)}</tr>
            </thead>
            <tbody>{rows.map(renderRow)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function AdaptivePolicyEnginePage() {
  const { locale, ui } = useAppTranslation();
  const canViewDiagnostics = hasPermission(TENANT_PERMISSIONS.TENANT_DIAGNOSTICS_READ);
  const canGovern = hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_GOVERN);
  const [view, setView] = useState<AdaptivePolicyView>('evidence');
  const [filters, setFilters] = useState<AdaptivePolicyFilters>(DEFAULT_FILTERS);
  const [applicationDraft, setApplicationDraft] = useState<{
    policyId: string;
    recommendationId: string;
    policyLabel: string;
    previousValue: string;
    appliedValue: string;
    changeSummary: string;
    sourceWorkflow: string;
  } | null>(null);
  const [lifecycleDraft, setLifecycleDraft] = useState<{ applicationId: string; action: string; actionLabel: string; reason: string } | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters]);

  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['adaptive-policy-engine-summary', queryString],
    queryFn: () => apiRequest<AdaptivePolicySummary>(`/decision-intelligence/adaptive-policy-engine-summary?${queryString}`)
  });

  const refreshAnalysis = useMutation({
    mutationFn: () => apiRequest<{ refreshed: boolean }>(
      '/decision-intelligence/adaptive-policy-engine-refresh',
      { method: 'POST' }
    ),
    onSuccess: async () => {
      await refetch();
    }
  });

  const recordApplication = useMutation({
    mutationFn: async (draft: NonNullable<typeof applicationDraft>) => {
      const previousValue = JSON.parse(draft.previousValue) as unknown;
      const appliedValue = JSON.parse(draft.appliedValue) as unknown;
      if (!previousValue || typeof previousValue !== 'object' || Array.isArray(previousValue)) throw new Error('Previous value must be a JSON object');
      if (!appliedValue || typeof appliedValue !== 'object' || Array.isArray(appliedValue)) throw new Error('Applied value must be a JSON object');
      return apiRequest(`/decision-intelligence/adaptive-policy-engine/policies/${encodeURIComponent(draft.policyId)}/applications`, {
        method: 'POST',
        body: JSON.stringify({
          recommendation_id: draft.recommendationId,
          previous_value: previousValue,
          applied_value: appliedValue,
          change_summary: draft.changeSummary.trim(),
          source_workflow: draft.sourceWorkflow.trim()
        })
      });
    },
    onSuccess: async () => {
      setApplicationDraft(null);
      await refetch();
    }
  });

  const transitionApplication = useMutation({
    mutationFn: (draft: NonNullable<typeof lifecycleDraft>) => apiRequest(
      `/decision-intelligence/adaptive-policy-engine/applications/${encodeURIComponent(draft.applicationId)}/action`,
      { method: 'POST', body: JSON.stringify({ action: draft.action, reason: draft.reason.trim() }) }
    ),
    onSuccess: async () => {
      setLifecycleDraft(null);
      await refetch();
    }
  });

  const policyCount = data?.governance?.policy_count ?? data?.policies?.length ?? 0;
  const signalCount = data?.governance?.signal_count ?? data?.signals?.length ?? 0;
  const recommendationCount = data?.governance?.recommendation_count ?? data?.recommendations?.length ?? 0;
  const measurementCount = data?.governance?.effectiveness_measurement_count ?? data?.effectiveness?.length ?? 0;
  const applicationCount = data?.governance?.application_count ?? data?.applications?.length ?? 0;
  const evidenceCount = policyCount + signalCount + recommendationCount + measurementCount + applicationCount;
  const hasEvidence = evidenceCount > 0;
  const pageUpdated = dataUpdatedAt ? formatLocalizedDateTime(dataUpdatedAt, locale) : ui('Not refreshed yet');
  const analysisGenerated = data?.analysis?.analysis_generated_at
    ? formatLocalizedDateTime(data.analysis.analysis_generated_at, locale)
    : ui('No analysis generated yet');

  const updateFilter = (key: keyof AdaptivePolicyFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const openApplicationRecorder = (recommendation: PolicyRecommendationRecord) => {
    if (!recommendation.id || !recommendation.policy_id) return;
    const policy = (data?.policies || []).find((candidate) => candidate.id === recommendation.policy_id);
    setApplicationDraft({
      policyId: recommendation.policy_id,
      recommendationId: recommendation.id,
      policyLabel: policyDisplayCopy(policy || { policy_key: recommendation.policy_key }, ui).title,
      previousValue: prettyPolicyValue((policy?.current_policy as Record<string, unknown> | undefined) || {}),
      appliedValue: prettyPolicyValue(recommendation.recommended_adjustment || {}),
      changeSummary: '',
      sourceWorkflow: 'manual_business_rule_change'
    });
    recordApplication.reset();
  };

  const openLifecycleAction = (application: PolicyApplicationRecord, action: string, actionLabel: string) => {
    if (!application.id) return;
    setLifecycleDraft({ applicationId: application.id, action, actionLabel, reason: '' });
    transitionApplication.reset();
  };

  if (isLoading) {
    return (
      <main className="decision-intelligence-page adaptive-policy-page adaptive-policy-page--refined io-operational-page io-workspace-page io-workspace-legacy-normalized">
        <section className="card adaptive-policy-state-card"><span className="adaptive-policy-state-icon"><TenantNavIcon path="/adaptive-policy-engine" size={18} /></span><p>{ui('Loading adaptive policy evidence…')}</p></section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="decision-intelligence-page adaptive-policy-page adaptive-policy-page--refined io-operational-page io-workspace-page io-workspace-legacy-normalized">
        <section className="card card--danger adaptive-policy-state-card adaptive-policy-state-card--danger">
          <span className="adaptive-policy-state-icon adaptive-policy-state-icon--danger"><TenantNavIcon path="/alerts" size={18} /></span><div><h2>{ui('Adaptive policy evidence could not be loaded')}</h2>
          <p>{ui('Check your Decision Intelligence access and try the read-only request again.')}</p>
          <button className="button" type="button" onClick={() => void refetch()}><TenantNavIcon path="/adaptive-policy-engine" size={14} />{ui('Retry')}</button></div>
        </section>
      </main>
    );
  }

  return (
    <main className="decision-intelligence-page adaptive-policy-page adaptive-policy-page--refined io-operational-page io-workspace-page io-workspace-legacy-normalized">
      {/* Hero meta pills remain intentionally hidden: Tenant-scoped / Human-governed decisions / Read-only evidence. */}
      <OperationalWorkspaceHero
        iconPath="/adaptive-policy-engine"
        eyebrow={ui('Decision intelligence & policy review')}
        title={ui('Adaptive Policy Engine')}
        description={ui('Checks real operating results to see whether recurring inventory, reservation, supplier, or execution rules may need human review and adjustment. Nothing is changed automatically.')}
        aside={<><OperationalWorkspaceStatus value={formatCanonicalLabel(data?.governance?.adaptive_policy_posture, ui)} label={`${ui('Policy review posture')} · ${ui('Analysis generated')} ${analysisGenerated} · ${ui('Page updated')} ${pageUpdated}`} />{canGovern ? <button className="button button--secondary" type="button" onClick={() => refreshAnalysis.mutate()} disabled={refreshAnalysis.isPending || isFetching}><TenantNavIcon path="/adaptive-policy-engine" size={14} />{ui(refreshAnalysis.isPending ? 'Refreshing analysis…' : 'Refresh policy analysis')}</button> : <button className="button button--secondary" type="button" onClick={() => void refetch()} disabled={isFetching}><TenantNavIcon path="/adaptive-policy-engine" size={14} />{ui(isFetching ? 'Refreshing…' : 'Refresh page')}</button>}</>}
      />
      {refreshAnalysis.isError ? <section className="card card--danger adaptive-policy-state-card adaptive-policy-state-card--danger"><p>{ui('Policy analysis could not be refreshed. No operating rule was changed.')}</p></section> : null}
      {refreshAnalysis.isSuccess ? <p className="adaptive-policy-limit-note">{ui('Policy analysis refreshed from current operating data. Any recommendation still requires human review.')}</p> : null}

<OperationalWorkspaceStats ariaLabel={ui('Adaptive policy evidence summary')}>
        <MetricCard label="Policies" value={policyCount} iconPath="/adaptive-policy-engine" tone="blue" />
        <MetricCard label="Signals" value={signalCount} iconPath="/insights" tone="violet" />
        <MetricCard label="Recommendations" value={recommendationCount} iconPath="/intelligence-review" tone="amber" />
        <MetricCard label="Measurements" value={measurementCount} iconPath="/reports" tone="green" />
        <MetricCard label="Applied changes" value={applicationCount} iconPath="/permissions" tone="slate" />
        <OperationalWorkspaceStatCard
          label={ui('Current posture')}
          value={formatCanonicalLabel(data?.governance?.adaptive_policy_posture, ui)}
          helper={ui('Current evidence and governance posture')}
          iconPath="/permissions"
          tone="slate"
        />
      </OperationalWorkspaceStats>

<OperationalWorkspaceTabs ariaLabel={ui('Adaptive policy page views')}>
        <OperationalWorkspaceTab active={view === 'evidence'} iconPath="/adaptive-policy-engine" label={ui('Policy evidence')} onClick={() => setView('evidence')} />
        <OperationalWorkspaceTab active={view === 'readiness'} iconPath="/reliability-command" label={ui('Readiness checks')} onClick={() => setView('readiness')} />
        {canViewDiagnostics ? <OperationalWorkspaceTab active={view === 'diagnostics'} iconPath="/admin-system" label={ui('Diagnostics')} onClick={() => setView('diagnostics')} /> : null}
      </OperationalWorkspaceTabs>

      <section className="card adaptive-policy-filters" aria-label={ui('Adaptive policy filters')}>
        <div className="card__header">
          <div className="adaptive-policy-section-heading">
            <span className="adaptive-policy-heading-icon"><TenantNavIcon path="/system-context" size={17} /></span>
            <div>
              <h2>{ui('Filter the evidence')}</h2>
              <p className="card__subtext">{ui('Filters apply consistently to policies and their related signals, recommendations, and measurements.')}</p>
            </div>
          </div>
          <button className="button button--secondary" type="button" onClick={() => setFilters(DEFAULT_FILTERS)} disabled={JSON.stringify(filters) === JSON.stringify(DEFAULT_FILTERS)}>
            <TenantNavIcon path="/system-context" size={14} />{ui('Clear filters')}
          </button>
        </div>
        <div className="adaptive-policy-filter-grid">
          <label>
            <span className="form-label">{ui('Business area')}</span>
            <select className="input" value={filters.policy_domain} onChange={(event) => updateFilter('policy_domain', event.target.value)}>
              <option value="">{ui('All areas')}</option>
              {POLICY_DOMAINS.map((value) => <option key={value} value={value}>{formatCanonicalLabel(value, ui)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">{ui('Policy type')}</span>
            <select className="input" value={filters.policy_type} onChange={(event) => updateFilter('policy_type', event.target.value)}>
              <option value="">{ui('All policy types')}</option>
              {POLICY_TYPES.map((value) => <option key={value} value={value}>{formatCanonicalLabel(value, ui)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">{ui('Policy status')}</span>
            <select className="input" value={filters.policy_status} onChange={(event) => updateFilter('policy_status', event.target.value)}>
              <option value="">{ui('All policy statuses')}</option>
              {POLICY_STATUSES.map((value) => <option key={value} value={value}>{formatCanonicalLabel(value, ui)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">{ui('Recommendation type')}</span>
            <select className="input" value={filters.recommendation_type} onChange={(event) => updateFilter('recommendation_type', event.target.value)}>
              <option value="">{ui('All recommendation types')}</option>
              {RECOMMENDATION_TYPES.map((value) => <option key={value} value={value}>{formatCanonicalLabel(value, ui)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">{ui('Maximum records per evidence list')}</span>
            <select className="input" value={filters.limit} onChange={(event) => updateFilter('limit', event.target.value)}>
              {['25', '50', '100', '200'].map((value) => <option key={value} value={value}>{formatLocalizedNumber(Number(value), locale)}</option>)}
            </select>
          </label>
        </div>
      </section>

      

      

      {!hasEvidence ? (
        <section className="card adaptive-policy-empty-state">
          <div className="adaptive-policy-section-heading"><span className="adaptive-policy-heading-icon adaptive-policy-heading-icon--slate"><TenantNavIcon path="/adaptive-policy-engine" size={17} /></span><h2>{ui('No adaptive policy evidence is available for this tenant and filter set')}</h2></div>
          <p>{ui('Readiness is not assessed when there are no policy, signal, recommendation, or effectiveness records. Zero records do not mean that policies are safe, approved, or ready for promotion.')}</p>
          <p>{ui('If you can govern Decision Intelligence, use Refresh policy analysis to rebuild this evidence from current operating data.')}</p>
        </section>
      ) : null}

      {view === 'evidence' ? (
        <>
          <p className="adaptive-policy-limit-note"><TenantNavIcon path="/system-context" size={14} />
            {ui('Lists show up to {limit} matching records in each evidence category. Totals and readiness checks use all matching evidence, not only the rows shown here.').replace('{limit}', formatLocalizedNumber(Number(filters.limit), locale))}
          </p>
          <EvidenceSection
            title={ui('Policies')}
            iconPath="/adaptive-policy-engine"
            description="The policy ideas currently being observed or manually reviewed."
            rows={(data?.policies || []) as Array<Record<string, unknown>>}
            headers={['Policy', 'Area', 'Type', 'Status', 'Confidence', 'Updated']}
            renderRow={(row, index) => {
              const policy = row as AdaptivePolicyRecord;
              const copy = policyDisplayCopy(policy, ui);
              return (
                <tr key={`${policy.policy_key || 'policy'}-${index}`}>
                  <td><strong>{copy.title}</strong>{copy.summary ? <span className="adaptive-policy-table__subtext">{copy.summary}</span> : null}</td>
                  <td>{formatCanonicalLabel(policy.policy_domain, ui)}</td>
                  <td>{formatCanonicalLabel(policy.policy_type, ui)}</td>
                  <td><StatusBadge value={policy.policy_status} /></td>
                  <td>{formatStoredConfidence(policy.confidence_score, locale)}</td>
                  <td>{formatLocalizedDateTime(policy.updated_at || policy.created_at, locale)}</td>
                </tr>
              );
            }}
          />
          <EvidenceSection
            title={ui('Observed signals')}
            iconPath="/insights"
            description="Measurements or indicators connected to the returned policies."
            rows={(data?.signals || []) as Array<Record<string, unknown>>}
            headers={['Policy', 'Area', 'Signal', 'Variance', 'Weight', 'Confidence', 'Observed']}
            renderRow={(row, index) => {
              const signal = row as PolicySignalRecord;
              return (
                <tr key={`${signal.policy_key || 'signal'}-${index}`}>
                  <td><strong>{formatLabel(signal.policy_key)}</strong></td>
                  <td>{formatCanonicalLabel(signal.signal_domain, ui)}</td>
                  <td>{formatLabel(signal.signal_type)}</td>
                  <td>{formatDelta(signal.variance_score, locale)}</td>
                  <td>{formatNumber(signal.weight, locale)}</td>
                  <td>{formatStoredConfidence(signal.confidence_score, locale)}</td>
                  <td>{formatLocalizedDateTime(signal.observed_at, locale)}</td>
                </tr>
              );
            }}
          />
          <EvidenceSection
            title={ui('Policy recommendations')}
            iconPath="/intelligence-review"
            description="Advisory policy changes that still require human review and manual application."
            rows={(data?.recommendations || []) as Array<Record<string, unknown>>}
            headers={['Policy', 'Recommendation', 'Type', 'Status', 'Risk', 'Confidence', 'Created', 'Review / action']}
            renderRow={(row, index) => {
              const recommendation = row as PolicyRecommendationRecord;
              const recommendationSummary = recommendationDisplaySummary(recommendation, ui);
              const adjustmentSummary = recommendedAdjustmentSummary(recommendation, ui);
              const hasActiveApplication = (data?.applications || []).some((application) => application.policy_id === recommendation.policy_id && ['applied_monitoring', 'recalibration_review', 'rollback_review'].includes(String(application.application_status)));
              return (
                <tr key={`${recommendation.recommendation_key || 'recommendation'}-${index}`}>
                  <td>{formatLabel(recommendation.policy_key)}</td>
                  <td><strong>{formatLabel(recommendation.recommendation_key)}</strong>{recommendationSummary ? <span className="adaptive-policy-table__subtext">{recommendationSummary}</span> : null}{adjustmentSummary ? <span className="adaptive-policy-table__subtext adaptive-policy-table__subtext--proposal">{adjustmentSummary}</span> : null}</td>
                  <td>{formatCanonicalLabel(recommendation.recommendation_type, ui)}</td>
                  <td><StatusBadge value={recommendation.recommendation_status} /></td>
                  <td><StatusBadge value={recommendation.risk_level} tone={['high', 'critical'].includes(String(recommendation.risk_level)) ? 'danger' : 'neutral'} /></td>
                  <td>{formatStoredConfidence(recommendation.confidence_score, locale)}</td>
                  <td>{formatLocalizedDateTime(recommendation.created_at, locale)}</td>
                  <td>
                    {recommendation.recommendation_status === 'review_required' && recommendation.source_action_id ? <a className="button button--secondary button--small" href={`/intelligence-review?source_action_id=${encodeURIComponent(recommendation.source_action_id)}`}>{ui('Review')}</a> : null}
                    {canGovern && recommendation.recommendation_status === 'approved_for_manual_application' && recommendation.id && recommendation.policy_id ? <button className="button button--secondary button--small" type="button" onClick={() => openApplicationRecorder(recommendation)}>{ui(hasActiveApplication ? 'Record approved recalibration' : 'Record applied change')}</button> : null}
                    {recommendation.recommendation_status !== 'review_required' && recommendation.recommendation_status !== 'approved_for_manual_application' ? ui('No review needed') : null}
                  </td>
                </tr>
              );
            }}
          />
          <EvidenceSection
            title={ui('Applied policy changes')}
            iconPath="/permissions"
            description="Approved recommendations appear here only after a person records that the business rule was actually changed. This record starts real before-and-after monitoring."
            rows={(data?.applications || []) as Array<Record<string, unknown>>}
            headers={['Policy', 'Status', 'Recorded change', 'Applied value', 'Baseline', 'Applied', 'Lifecycle action']}
            renderRow={(row, index) => {
              const application = row as PolicyApplicationRecord;
              return (
                <tr key={`${application.id || 'application'}-${index}`}>
                  <td><strong>{formatLabel(application.policy_key)}</strong></td>
                  <td><StatusBadge value={application.application_status} /></td>
                  <td><strong>{application.change_summary || ui('Not reported')}</strong>{application.source_workflow ? <span className="adaptive-policy-table__subtext">{ui('Source workflow')}: {formatLabel(application.source_workflow)}</span> : null}</td>
                  <td><span className="adaptive-policy-table__subtext">{summarizePolicyValue(application.applied_value, ui)}</span></td>
                  <td>{formatNumber(application.baseline_score, locale)}</td>
                  <td>{formatLocalizedDateTime(application.applied_at, locale)}</td>
                  <td>
                    {canGovern && application.application_status === 'applied_monitoring' ? <div className="adaptive-policy-row-actions"><button className="button button--secondary button--small" type="button" onClick={() => openLifecycleAction(application, 'open_recalibration_review', ui('Open recalibration review'))}>{ui('Recalibrate')}</button><button className="button button--secondary button--small" type="button" onClick={() => openLifecycleAction(application, 'open_rollback_review', ui('Open rollback review'))}>{ui('Rollback review')}</button><button className="button button--secondary button--small" type="button" onClick={() => openLifecycleAction(application, 'retire_policy', ui('Retire policy'))}>{ui('Retire')}</button></div> : null}
                    {canGovern && application.application_status === 'recalibration_review' ? <div className="adaptive-policy-row-actions"><button className="button button--secondary button--small" type="button" onClick={() => openLifecycleAction(application, 'open_rollback_review', ui('Open rollback review'))}>{ui('Rollback review')}</button><button className="button button--secondary button--small" type="button" onClick={() => openLifecycleAction(application, 'resume_monitoring', ui('Resume monitoring'))}>{ui('Resume')}</button><button className="button button--secondary button--small" type="button" onClick={() => openLifecycleAction(application, 'retire_policy', ui('Retire policy'))}>{ui('Retire')}</button></div> : null}
                    {canGovern && application.application_status === 'rollback_review' ? <div className="adaptive-policy-row-actions"><button className="button button--secondary button--small" type="button" onClick={() => openLifecycleAction(application, 'record_rollback', ui('Record completed rollback'))}>{ui('Record rollback')}</button><button className="button button--secondary button--small" type="button" onClick={() => openLifecycleAction(application, 'resume_monitoring', ui('Resume monitoring'))}>{ui('Resume')}</button><button className="button button--secondary button--small" type="button" onClick={() => openLifecycleAction(application, 'retire_policy', ui('Retire policy'))}>{ui('Retire')}</button></div> : null}
                    {!canGovern || !['applied_monitoring', 'recalibration_review', 'rollback_review'].includes(String(application.application_status)) ? ui('No action required') : null}
                  </td>
                </tr>
              );
            }}
          />
          <EvidenceSection
            title={ui('Effectiveness measurements')}
            iconPath="/reports"
            description="Baseline and observed results used to understand whether a policy helped, harmed, or had no measured change."
            rows={(data?.effectiveness || []) as Array<Record<string, unknown>>}
            headers={['Policy', 'Measurement', 'Type', 'Baseline', 'Observed', 'Change', 'Confidence', 'Measured']}
            renderRow={(row, index) => {
              const measurement = row as PolicyEffectivenessRecord;
              return (
                <tr key={`${measurement.measurement_key || 'measurement'}-${index}`}>
                  <td>{formatLabel(measurement.policy_key)}</td>
                  <td><strong>{formatLabel(measurement.measurement_key)}</strong></td>
                  <td>{formatLabel(measurement.measurement_type)}</td>
                  <td>{formatNumber(measurement.baseline_score, locale)}</td>
                  <td>{formatNumber(measurement.observed_score, locale)}</td>
                  <td>{formatDelta(measurement.delta_score, locale)}</td>
                  <td>{formatStoredConfidence(measurement.confidence_score, locale)}</td>
                  <td>{formatLocalizedDateTime(measurement.measured_at, locale)}</td>
                </tr>
              );
            }}
          />

          {applicationDraft ? (
            <section className="card adaptive-policy-governance-form">
              <div className="card__header"><div><h2>{ui('Record an actually applied policy change')}</h2><p className="card__subtext">{ui('Use this only after the approved business-rule change was really made outside the Adaptive Policy Engine. Approval alone is not application.')}</p></div></div>
              <div className="adaptive-policy-form-grid">
                <label><span className="form-label">{ui('Policy')}</span><input className="input" value={applicationDraft.policyLabel} readOnly /></label>
                <label><span className="form-label">{ui('Source workflow')}</span><input className="input" value={applicationDraft.sourceWorkflow} onChange={(event) => setApplicationDraft((current) => current ? { ...current, sourceWorkflow: event.target.value } : current)} /></label>
                <label className="adaptive-policy-form-grid__wide"><span className="form-label">{ui('Previous rule value')}</span><textarea className="input adaptive-policy-json-input" value={applicationDraft.previousValue} onChange={(event) => setApplicationDraft((current) => current ? { ...current, previousValue: event.target.value } : current)} /></label>
                <label className="adaptive-policy-form-grid__wide"><span className="form-label">{ui('Actually applied rule value')}</span><textarea className="input adaptive-policy-json-input" value={applicationDraft.appliedValue} onChange={(event) => setApplicationDraft((current) => current ? { ...current, appliedValue: event.target.value } : current)} /></label>
                <label className="adaptive-policy-form-grid__wide"><span className="form-label">{ui('What was actually changed?')}</span><textarea className="input" value={applicationDraft.changeSummary} onChange={(event) => setApplicationDraft((current) => current ? { ...current, changeSummary: event.target.value } : current)} maxLength={2000} /></label>
              </div>
              <p className="adaptive-policy-muted">{ui('The Adaptive Policy Engine records this change and its baseline for monitoring. It does not make the business-rule change itself.')}</p>
              {recordApplication.isError ? <p className="adaptive-policy-form-error">{ui('The applied change could not be recorded. Check the values, confirm the recommendation is approved, and try again.')}</p> : null}
              <div className="adaptive-policy-form-actions"><button className="button button--secondary" type="button" onClick={() => setApplicationDraft(null)} disabled={recordApplication.isPending}>{ui('Cancel')}</button><button className="button" type="button" onClick={() => applicationDraft && recordApplication.mutate(applicationDraft)} disabled={recordApplication.isPending || applicationDraft.changeSummary.trim().length < 10 || applicationDraft.sourceWorkflow.trim().length < 2}>{ui(recordApplication.isPending ? 'Recording applied change…' : 'Record applied change')}</button></div>
            </section>
          ) : null}

          {lifecycleDraft ? (
            <section className="card adaptive-policy-governance-form">
              <div className="card__header"><div><h2>{lifecycleDraft.actionLabel}</h2><p className="card__subtext">{ui('This records a human governance decision only. It does not automatically recalibrate, roll back, or retire an operating rule outside this engine.')}</p></div></div>
              <label><span className="form-label">{ui('Reason and evidence')}</span><textarea className="input" value={lifecycleDraft.reason} onChange={(event) => setLifecycleDraft((current) => current ? { ...current, reason: event.target.value } : current)} maxLength={2000} /></label>
              {transitionApplication.isError ? <p className="adaptive-policy-form-error">{ui('The lifecycle action could not be recorded. Refresh the page and check the current policy status before trying again.')}</p> : null}
              <div className="adaptive-policy-form-actions"><button className="button button--secondary" type="button" onClick={() => setLifecycleDraft(null)} disabled={transitionApplication.isPending}>{ui('Cancel')}</button><button className="button" type="button" onClick={() => lifecycleDraft && transitionApplication.mutate(lifecycleDraft)} disabled={transitionApplication.isPending || lifecycleDraft.reason.trim().length < 10}>{ui(transitionApplication.isPending ? 'Recording decision…' : 'Record governance decision')}</button></div>
            </section>
          ) : null}
        </>
      ) : null}

      {view === 'readiness' ? (
        hasEvidence ? (
          <>
            <section className="card adaptive-policy-readiness-note">
              <div className="adaptive-policy-section-heading">
                <span className="adaptive-policy-heading-icon adaptive-policy-heading-icon--amber"><TenantNavIcon path="/reliability-command" size={17} /></span>
                <div><h2>{ui('These checks support a human review; they are not approvals')}</h2>
              <p className="card__subtext">{ui('A passing check means the returned evidence satisfies that specific rule. It does not automatically approve, apply, promote, roll back, or retire a policy.')}</p></div>
              </div>
            </section>
            {LIFECYCLE_SECTIONS.map((config) => (
              <LifecycleCard key={config.key} config={config} section={data?.[config.key] as LifecycleSection | undefined} />
            ))}
          </>
        ) : (
          <section className="card adaptive-policy-not-assessed">
            <div className="adaptive-policy-section-heading"><span className="adaptive-policy-heading-icon adaptive-policy-heading-icon--slate"><TenantNavIcon path="/reliability-command" size={17} /></span><div><h2>{ui('Readiness checks are not assessed')}</h2>
            <p>{ui('At least one adaptive policy evidence record is required before these checks can produce a meaningful result.')}</p></div></div>
          </section>
        )
      ) : null}

      {view === 'diagnostics' && canViewDiagnostics ? (
        <section className="card adaptive-policy-diagnostics">
          <div className="card__header">
            <div className="adaptive-policy-section-heading">
              <span className="adaptive-policy-heading-icon adaptive-policy-heading-icon--slate"><TenantNavIcon path="/admin-system" size={17} /></span>
              <div>
                <h2>{ui('Technical response diagnostics')}</h2>
                <p className="card__subtext">{ui('Restricted implementation information for users with tenant diagnostics permission.')}</p>
              </div>
            </div>
          </div>
          <div className="adaptive-policy-metrics">
            <MetricCard label="Contract score" value={data?.response_contract_audit?.contract_score} />
            <MetricCard label="Rendered panels" value={data?.response_contract_audit?.rendered_panel_count} />
            <MetricCard label="Expected response keys" value={data?.response_contract_audit?.expected_response_key_count} />
            <MetricCard label="Missing response keys" value={data?.response_contract_audit?.missing_response_key_count} />
          </div>
          <details className="adaptive-policy-technical-details">
            <summary>{ui('View restricted response details')}</summary>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </details>
        </section>
      ) : null}
    </main>
  );
}
