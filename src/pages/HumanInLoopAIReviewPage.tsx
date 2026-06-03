import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';

type AIOperationDomain = 'decision_intelligence' | 'ai_governance' | 'remediation' | 'simulation' | 'optimization' | 'multi_domain';
type ReviewState = 'pending_review' | 'approval_required' | 'escalated' | 'ready_for_human_decision';
type Urgency = 'critical' | 'high' | 'medium' | 'low';

type HumanAIReview = {
  review_id: string;
  source_action_id?: string;
  ai_operation_domain?: string;
  review_state?: string;
  urgency?: string;
  title?: string;
  summary?: string | null;
  confidence_visualization?: {
    confidence_score?: number;
    confidence_band?: string;
    visualization_type?: string;
    advisory_only?: boolean;
  };
  explainability_review?: {
    primary_factors?: string[];
    source_surface?: string;
    reasoning_visible_to_human?: boolean;
    human_action_only?: boolean;
  };
  simulation_preview?: {
    preview_available?: boolean;
    preview_execution_mode?: string;
    mutation_allowed_from_preview?: boolean;
  };
  override_capture_guidance?: {
    override_reason_required?: boolean;
    suggested_reason_categories?: string[];
    capture_only_in_source_governance_flow?: boolean;
  };
  governance_approval_guidance?: {
    approval_required?: boolean;
    approval_route?: string;
    endpoint_executes_approval?: boolean;
  };
  safety_contract?: Record<string, boolean>;
  created_at?: string | null;
  updated_at?: string | null;
};

type HumanAIReviewResponse = {
  definition?: {
    foundation_type?: string;
    execution_mode?: string;
    source_foundations?: string[];
    supported_ai_operation_domains?: string[];
    supported_review_states?: string[];
    human_in_loop_capabilities?: string[];
    safety_contract?: Record<string, boolean>;
  };
  filters?: {
    ai_operation_domain?: string | null;
    review_state?: string | null;
    urgency?: string | null;
    limit?: number;
  };
  summary?: {
    total_reviews?: number;
    approval_required_reviews?: number;
    escalated_reviews?: number;
    by_domain?: Record<string, number>;
    by_review_state?: Record<string, number>;
    by_urgency?: Record<string, number>;
  };
  guidance?: {
    next_review_id?: string | null;
    next_source_action_id?: string | null;
    next_review_state?: string | null;
    review_queue_guidance?: string;
    confidence_guidance?: string;
    override_guidance?: string;
    approval_guidance?: string;
    safety_contract?: Record<string, boolean>;
  };
  reviews?: HumanAIReview[];
  source_workspace_summary?: Record<string, unknown>;
  source_action_center_summary?: Record<string, unknown>;
  non_mutation_guarantee?: boolean;
  generated_at?: string;
};

const DOMAIN_FILTERS: Array<{ value: 'all' | AIOperationDomain; label: string }> = [
  { value: 'all', label: 'All AI domains' },
  { value: 'decision_intelligence', label: 'Decision intelligence' },
  { value: 'ai_governance', label: 'AI governance' },
  { value: 'remediation', label: 'Remediation' },
  { value: 'simulation', label: 'Simulation' },
  { value: 'optimization', label: 'Optimization' },
  { value: 'multi_domain', label: 'Multi-domain' }
];

const REVIEW_STATE_FILTERS: Array<{ value: 'all' | ReviewState; label: string }> = [
  { value: 'all', label: 'All review states' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'approval_required', label: 'Approval required' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'ready_for_human_decision', label: 'Ready for human decision' }
];

const URGENCY_FILTERS: Array<{ value: 'all' | Urgency; label: string }> = [
  { value: 'all', label: 'All urgency' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

const gridStyle: CSSProperties = {
  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))'
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  alignItems: 'center',
  marginBottom: 16
};

const selectStyle: CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 10,
  padding: '10px 12px',
  background: 'white',
  minWidth: 190
};

const reviewListStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: 14
};

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  borderRadius: 999,
  padding: '4px 9px',
  background: '#f3f4f6',
  color: '#374151',
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'capitalize'
};

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatLabel(value?: string | null): string {
  return String(value || 'unknown').replace(/_/g, ' ');
}

function formatPercent(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Not scored';
  }

  return `${Math.round(value * 100)}%`;
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return 'Not reported';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function sourceSurfaceToAppPath(sourceSurface?: string): string | null {
  if (!sourceSurface || !sourceSurface.startsWith('/')) {
    return null;
  }

  const tenantRoutes = new Set([
    '/action-center',
    '/workspace',
    '/workflow-composer',
    '/system-context',
    '/insights',
    '/procurement-recommendations',
    '/execution-tasks',
    '/automation-schedules',
    '/reports'
  ]);

  return tenantRoutes.has(sourceSurface) ? sourceSurface : null;
}

async function fetchHumanAIReviewSummary(
  aiOperationDomain: 'all' | AIOperationDomain,
  reviewState: 'all' | ReviewState,
  urgency: 'all' | Urgency
): Promise<HumanAIReviewResponse> {
  const params = new URLSearchParams({ limit: '75' });

  if (aiOperationDomain !== 'all') {
    params.set('ai_operation_domain', aiOperationDomain);
  }

  if (reviewState !== 'all') {
    params.set('review_state', reviewState);
  }

  if (urgency !== 'all') {
    params.set('urgency', urgency);
  }

  return apiRequest<HumanAIReviewResponse>(`/operational-action-center/human-in-loop-ai-operations-summary?${params.toString()}`);
}

export default function HumanInLoopAIReviewPage() {
  const [aiOperationDomain, setAiOperationDomain] = useState<'all' | AIOperationDomain>('all');
  const [reviewState, setReviewState] = useState<'all' | ReviewState>('all');
  const [urgency, setUrgency] = useState<'all' | Urgency>('all');

  const reviewQuery = useQuery({
    queryKey: ['human-in-loop-ai-review', aiOperationDomain, reviewState, urgency],
    queryFn: () => fetchHumanAIReviewSummary(aiOperationDomain, reviewState, urgency)
  });

  const response = reviewQuery.data;
  const summary = response?.summary || {};
  const guidance = response?.guidance || {};
  const reviews = response?.reviews || [];
  const safetyEntries = useMemo(() => {
    return Object.entries(response?.definition?.safety_contract || {}).filter(([, enabled]) => enabled);
  }, [response?.definition?.safety_contract]);

  return (
    <div>
      <div className="card-grid" style={gridStyle}>
        <div className="card">
          <div className="card__label">AI review queue</div>
          <div className="card__value">{numberValue(summary.total_reviews ?? reviews.length)}</div>
          <div className="card__subtext">Human-in-the-loop recommendation reviews from decision intelligence and AI governance surfaces.</div>
        </div>
        <div className="card">
          <div className="card__label">Approval required</div>
          <div className="card__value">{numberValue(summary.approval_required_reviews)}</div>
          <div className="card__subtext">Reviews that must stay inside existing governed approval workflows.</div>
        </div>
        <div className="card">
          <div className="card__label">Escalated</div>
          <div className="card__value">{numberValue(summary.escalated_reviews)}</div>
          <div className="card__subtext">High-attention review items requiring management or governance follow-up.</div>
        </div>
        <div className="card">
          <div className="card__label">Execution mode</div>
          <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(response?.definition?.execution_mode)}</div>
          <div className="card__subtext">This page does not execute recommendations, approvals, overrides, or source-system actions.</div>
        </div>
      </div>

      <section className="section">
        <div className="section__title">Human-in-the-loop AI controls</div>
        <div className="card">
          <div style={toolbarStyle}>
            <select style={selectStyle} value={aiOperationDomain} onChange={(event) => setAiOperationDomain(event.target.value as 'all' | AIOperationDomain)}>
              {DOMAIN_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select style={selectStyle} value={reviewState} onChange={(event) => setReviewState(event.target.value as 'all' | ReviewState)}>
              {REVIEW_STATE_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select style={selectStyle} value={urgency} onChange={(event) => setUrgency(event.target.value as 'all' | Urgency)}>
              {URGENCY_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button className="button button--secondary" type="button" onClick={() => reviewQuery.refetch()} disabled={reviewQuery.isFetching}>
              {reviewQuery.isFetching ? 'Refreshing…' : 'Refresh review queue'}
            </button>
            <Link className="button button--secondary" to="/workflow-composer">Open workflow composer</Link>
            <Link className="button button--secondary" to="/system-context">Open system context</Link>
          </div>

          {reviewQuery.isLoading ? (
            <p className="card__subtext">Loading human-in-the-loop AI review queue…</p>
          ) : reviewQuery.error ? (
            <p className="form-error">
              {reviewQuery.error instanceof ApiError
                ? reviewQuery.error.message
                : 'Unable to load human-in-the-loop AI review queue.'}
            </p>
          ) : (
            <p className="card__subtext">
              {guidance.review_queue_guidance || 'Review recommendations, confidence, explainability, simulation context, and approval requirements before acting elsewhere.'}
            </p>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section__title">Review queue</div>
        {reviews.length === 0 && !reviewQuery.isLoading ? (
          <div className="empty-state">No AI review items match the selected filters.</div>
        ) : (
          <div style={reviewListStyle}>
            {reviews.map((review) => {
              const sourcePath = sourceSurfaceToAppPath(review.explainability_review?.source_surface || review.governance_approval_guidance?.approval_route);
              const confidence = review.confidence_visualization;
              return (
                <article className="card" key={review.review_id}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    <span style={badgeStyle}>{formatLabel(review.urgency)}</span>
                    <span style={badgeStyle}>{formatLabel(review.review_state)}</span>
                    <span style={badgeStyle}>{formatLabel(review.ai_operation_domain)}</span>
                    {review.governance_approval_guidance?.approval_required ? <span style={badgeStyle}>Approval required</span> : null}
                  </div>
                  <h3 style={{ marginTop: 0 }}>{review.title || review.review_id}</h3>
                  <p className="card__subtext">{review.summary || 'No review summary was provided.'}</p>
                  <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', marginTop: 12 }}>
                    <div>
                      <div className="card__label">Confidence</div>
                      <strong>{formatPercent(confidence?.confidence_score)}</strong>
                      <div className="card__subtext">{formatLabel(confidence?.confidence_band)} · advisory only</div>
                    </div>
                    <div>
                      <div className="card__label">Simulation</div>
                      <strong>{review.simulation_preview?.preview_available ? 'Available' : 'Not available'}</strong>
                      <div className="card__subtext">{formatLabel(review.simulation_preview?.preview_execution_mode)}</div>
                    </div>
                    <div>
                      <div className="card__label">Updated</div>
                      <strong>{formatDateTime(review.updated_at || review.created_at)}</strong>
                    </div>
                  </div>

                  {review.explainability_review?.primary_factors?.length ? (
                    <div style={{ marginTop: 12 }}>
                      <div className="card__label">Explainability factors</div>
                      <p className="card__subtext">{review.explainability_review.primary_factors.map(formatLabel).join(' · ')}</p>
                    </div>
                  ) : null}

                  {review.override_capture_guidance?.suggested_reason_categories?.length ? (
                    <div style={{ marginTop: 12 }}>
                      <div className="card__label">Override reason guidance</div>
                      <p className="card__subtext">
                        {review.override_capture_guidance.override_reason_required ? 'Reason required: ' : 'Reason optional: '}
                        {review.override_capture_guidance.suggested_reason_categories.map(formatLabel).join(', ')}
                      </p>
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
                    {sourcePath ? <Link className="button button--secondary" to={sourcePath}>Open source surface</Link> : null}
                    <Link className="button button--secondary" to="/action-center">Open action center</Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section__title">Governance and safety</div>
        <div className="card-grid" style={gridStyle}>
          <div className="card">
            <div className="card__label">Confidence guidance</div>
            <p className="card__subtext">{guidance.confidence_guidance || 'Confidence is advisory only and never authorizes automatic execution.'}</p>
          </div>
          <div className="card">
            <div className="card__label">Override guidance</div>
            <p className="card__subtext">{guidance.override_guidance || 'Overrides must be captured in governed source workflows.'}</p>
          </div>
          <div className="card">
            <div className="card__label">Approval guidance</div>
            <p className="card__subtext">{guidance.approval_guidance || 'Approvals must be completed in existing governed workflows.'}</p>
          </div>
          <div className="card">
            <div className="card__label">Safety contract</div>
            <p className="card__subtext">
              {safetyEntries.length
                ? safetyEntries.map(([key]) => formatLabel(key)).join(' · ')
                : 'No mutation, execution, approval, or override is performed by this endpoint.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
