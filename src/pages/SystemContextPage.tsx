import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import type { SystemContextExecutionGateResponse, SystemContextResponse } from '../types/inventory';

function readableError(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'Unknown error';
}

function formatNumber(value: number | string | null | undefined): string {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed.toLocaleString() : '0';
}

function formatCurrency(value: number | string | null | undefined): string {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) : '$0.00';
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString();
}

function StatCard(props: { title: string; value: string; subtitle: string; tone?: 'default' | 'warn' | 'bad' }) {
  const valueStyle = props.tone === 'bad' ? styles.statValueBad : props.tone === 'warn' ? styles.statValueWarn : styles.statValue;
  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{props.title}</div>
      <div style={valueStyle}>{props.value}</div>
      <div style={styles.statSubtitle}>{props.subtitle}</div>
    </div>
  );
}

function Section(props: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="app-panel app-panel--padded" style={styles.panel}>
      <h3 style={styles.panelTitle}>{props.title}</h3>
      <p style={styles.panelSubtitle}>{props.subtitle}</p>
      {props.children}
    </section>
  );
}

function KeyValue(props: { label: string; value: string }) {
  return <div style={styles.keyValueRow}><strong>{props.label}</strong><span>{props.value}</span></div>;
}

export default function SystemContextPage() {
  const contextQuery = useQuery({
    queryKey: ['system-context'],
    queryFn: () => apiRequest<SystemContextResponse>('/system-context')
  });

  const executionGateQuery = useQuery({
    queryKey: ['system-context-execution-gate'],
    queryFn: () => apiRequest<SystemContextExecutionGateResponse>('/system-context/execution-gate')
  });

  const data = contextQuery.data;
  const executionGate = executionGateQuery.data;
  const riskCount = data?.risk_signals?.length ?? 0;
  const criticalCount = data?.risk_signals?.filter((signal) => signal.severity === 'critical').length ?? 0;
  const recommendationCount = data?.recommendations?.length ?? 0;
  const highPriorityRecommendationCount = data?.recommendations?.filter((item) => item.priority === 'high').length ?? 0;
  const readinessScore = Number(data?.automation_readiness?.score ?? 0);

  return (
    <div style={styles.page}>
      {contextQuery.error ? <div className="app-error-state">{readableError(contextQuery.error)}</div> : null}
      {executionGateQuery.error ? <div className="app-error-state">{readableError(executionGateQuery.error)}</div> : null}
      {contextQuery.isLoading ? <div className="app-empty-state">Loading system context...</div> : null}

      {data ? (
        <>
          <section className="app-grid-stats" style={styles.statsGrid}>
            <StatCard title="Context Status" value={data.status.replace(/_/g, ' ')} subtitle="Derived tenant posture for automation inputs." tone={data.status === 'attention_required' ? 'bad' : data.status === 'watch' ? 'warn' : 'default'} />
            <StatCard title="Risk Signals" value={String(riskCount)} subtitle="Signals exposed to future automation safely." tone={riskCount > 0 ? 'warn' : 'default'} />
            <StatCard title="Critical Signals" value={String(criticalCount)} subtitle="Signals requiring immediate human review." tone={criticalCount > 0 ? 'bad' : 'default'} />
            <StatCard title="Recommendations" value={String(recommendationCount)} subtitle={`${highPriorityRecommendationCount} high-priority automation prep items.`} tone={highPriorityRecommendationCount > 0 ? 'bad' : recommendationCount > 0 ? 'warn' : 'default'} />
            <StatCard title="Automation Readiness" value={`${Number.isFinite(readinessScore) ? readinessScore : 0}%`} subtitle={`${data?.automation_readiness?.status?.replace(/_/g, ' ') ?? 'not evaluated'} · ${formatNumber(data?.automation_readiness?.failed_checks)} blockers`} tone={(data?.automation_readiness?.failed_checks ?? 0) > 0 ? 'bad' : (data?.automation_readiness?.warning_checks ?? 0) > 0 ? 'warn' : 'default'} />
            <StatCard title="Context Quality" value={`${formatNumber(data.context_quality?.score)}%`} subtitle={data.context_quality?.status?.replace(/_/g, ' ') ?? 'not evaluated'} tone={data.context_quality?.status === 'limited' ? 'bad' : data.context_quality?.status === 'usable_with_review' ? 'warn' : 'default'} />
            <StatCard title="Context Freshness" value={data.context_freshness?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.context_freshness?.stale_sources)} stale · ${formatNumber(data.context_freshness?.aging_sources)} aging`} tone={(data.context_freshness?.stale_sources ?? 0) > 0 ? 'bad' : (data.context_freshness?.aging_sources ?? 0) > 0 || (data.context_freshness?.unknown_sources ?? 0) > 0 ? 'warn' : 'default'} />
            <StatCard title="Context Sources" value={String(data.context_sources?.length ?? 0)} subtitle="Included read-only source groups for explainability." />
            <StatCard title="Automation Plan" value={String(data.automation_plan?.length ?? 0)} subtitle="Manual-only phases derived from readiness and recommendations." />
            <StatCard title="Decision Boundaries" value={data.decision_boundaries?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.decision_boundaries?.escalation_conditions?.length)} escalation conditions`} tone={data.decision_boundaries?.status === 'restricted' ? 'bad' : data.decision_boundaries?.status === 'review_required' ? 'warn' : 'default'} />
            <StatCard title="Execution Gates" value={data.execution_gates?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.execution_gates?.blocked_gates)} blocked · ${formatNumber(data.execution_gates?.review_gates)} review`} tone={(data.execution_gates?.blocked_gates ?? 0) > 0 ? 'bad' : (data.execution_gates?.review_gates ?? 0) > 0 ? 'warn' : 'default'} />
            <StatCard title="Context Observability" value={data.context_observability?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.context_observability?.observed_signals)} signals · ${formatNumber(data.context_observability?.evidence_events_7d)} evidence events`} tone={data.context_observability?.status === 'blocked_observed' ? 'bad' : data.context_observability?.status === 'review_observed' ? 'warn' : 'default'} />
            <StatCard title="Review Checklist" value={data.automation_review_checklist?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.automation_review_checklist?.total_items)} items · ${formatNumber(data.automation_review_checklist?.critical_items)} critical`} tone={data.automation_review_checklist?.status === 'blocked' ? 'bad' : data.automation_review_checklist?.status === 'needs_review' || data.automation_review_checklist?.status === 'watch' ? 'warn' : 'default'} />
            <StatCard title="Action Hooks" value={data.automation_action_hooks?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.automation_action_hooks?.safe_read_only_hooks)} safe · ${formatNumber(data.automation_action_hooks?.approval_required_hooks)} approval required`} tone={(data.automation_action_hooks?.blocked_hooks ?? 0) > 0 ? 'bad' : (data.automation_action_hooks?.approval_required_hooks ?? 0) > 0 ? 'warn' : 'default'} />
            <StatCard title="Hook Policy" value={data.automation_hook_policy?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.automation_hook_policy?.read_only_allowed)} read-only · ${formatNumber(data.automation_hook_policy?.prohibited_mutations)} prohibited`} tone={(data.automation_hook_policy?.blocked ?? 0) > 0 ? 'bad' : (data.automation_hook_policy?.approval_required ?? 0) > 0 ? 'warn' : 'default'} />
            <StatCard title="Execution Log" value={data.automation_execution_log?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.automation_execution_log?.total_events)} events · ${formatNumber(data.automation_execution_log?.blocked_events)} blocked`} tone={(data.automation_execution_log?.blocked_events ?? 0) > 0 ? 'bad' : data.automation_execution_log?.status === 'review_events_present' ? 'warn' : 'default'} />
            <StatCard title="Execution Replay" value={data.automation_execution_replay?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.automation_execution_replay?.replayable_events)} replayable events · ${formatNumber(data.automation_execution_replay?.blocked_steps)} blocked steps`} tone={(data.automation_execution_replay?.status === 'blocked' || (data.automation_execution_replay?.blocked_steps ?? 0) > 1) ? 'bad' : data.automation_execution_replay?.status === 'needs_review' ? 'warn' : 'default'} />
            <StatCard title="Replay Verification" value={data.automation_execution_replay_verification?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.automation_execution_replay_verification?.passed_checks)} passed · ${formatNumber(data.automation_execution_replay_verification?.failed_checks)} failed`} tone={(data.automation_execution_replay_verification?.failed_checks ?? 0) > 0 ? 'bad' : (data.automation_execution_replay_verification?.review_checks ?? 0) > 0 ? 'warn' : 'default'} />
            <StatCard title="Dry Run Summary" value={data.automation_dry_run_summary?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.automation_dry_run_summary?.ready_scenarios)} ready · ${formatNumber(data.automation_dry_run_summary?.blocked_scenarios)} blocked`} tone={(data.automation_dry_run_summary?.status === 'blocked' || (data.automation_dry_run_summary?.blocked_scenarios ?? 0) > 1) ? 'bad' : data.automation_dry_run_summary?.status === 'approval_required' ? 'warn' : 'default'} />
            <StatCard title="Dry Run Evidence" value={data.automation_dry_run_evidence?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.automation_dry_run_evidence?.complete_items)} complete · ${formatNumber(data.automation_dry_run_evidence?.blocked_items)} blocked`} tone={(data.automation_dry_run_evidence?.blocked_items ?? 0) > 0 ? 'bad' : (data.automation_dry_run_evidence?.review_items ?? 0) > 0 ? 'warn' : 'default'} />
            <StatCard title="Dry Run Policy" value={data.automation_dry_run_policy?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.automation_dry_run_policy?.enforced_rules)} enforced · ${formatNumber(data.automation_dry_run_policy?.review_rules)} review`} tone={(data.automation_dry_run_policy?.blocked_rules ?? 0) > 1 ? 'bad' : (data.automation_dry_run_policy?.review_rules ?? 0) > 0 ? 'warn' : 'default'} />
            <StatCard title="Dry Run Outcomes" value={data.automation_dry_run_outcomes?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.automation_dry_run_outcomes?.ready_outcomes)} ready · ${formatNumber(data.automation_dry_run_outcomes?.approval_required_outcomes)} approval`} tone={(data.automation_dry_run_outcomes?.blocked_outcomes ?? 0) > 1 ? 'bad' : (data.automation_dry_run_outcomes?.approval_required_outcomes ?? 0) > 0 ? 'warn' : 'default'} />
            <StatCard title="Dry Run Closure" value={data.automation_dry_run_closure?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.automation_dry_run_closure?.closed_checks)} closed · ${formatNumber(data.automation_dry_run_closure?.review_required_checks)} review`} tone={(data.automation_dry_run_closure?.blocked_checks ?? 0) > 0 ? 'bad' : (data.automation_dry_run_closure?.review_required_checks ?? 0) > 0 ? 'warn' : 'default'} />
            <StatCard title="Live Execution Gate" value={executionGate ? (executionGate.allowed ? 'allowed' : 'blocked') : 'not evaluated'} subtitle={executionGate ? `${executionGate.risk_level.replace(/_/g, ' ')} risk · ${formatNumber(executionGate.blockers.length)} blockers` : 'Controlled live-execution preflight.'} tone={executionGate ? (!executionGate.allowed ? 'bad' : executionGate.risk_level === 'medium' ? 'warn' : 'default') : 'default'} />
          </section>

          <div style={styles.grid}>
            <Section title="Tenant Context" subtitle="Read-only identity and generation metadata.">
              <div style={styles.list}>
                <KeyValue label="Tenant" value={data.tenant.name} />
                <KeyValue label="Tenant ID" value={data.tenant.id} />
                <KeyValue label="Generated" value={formatDateTime(data.generated_at)} />
                <KeyValue label="Sections" value={data.sections.join(', ')} />
              </div>
            </Section>

            <Section title="Inventory Context" subtitle="Operational inventory shape used by future automation.">
              <div style={styles.list}>
                <KeyValue label="Products" value={formatNumber(data.context.inventory?.total_products)} />
                <KeyValue label="Stocked Products" value={formatNumber(data.context.inventory?.stocked_products)} />
                <KeyValue label="Low Stock Products" value={formatNumber(data.context.inventory?.low_stock_products)} />
                <KeyValue label="Storage Locations" value={formatNumber(data.context.inventory?.storage_locations)} />
              </div>
            </Section>

            <Section title="Procurement Context" subtitle="Open procurement workload summary.">
              <div style={styles.list}>
                <KeyValue label="Open Shipments" value={formatNumber(data.context.procurement?.open_shipments)} />
                <KeyValue label="Partial Shipments" value={formatNumber(data.context.procurement?.partial_shipments)} />
                <KeyValue label="Open Purchase Orders" value={formatNumber(data.context.procurement?.open_purchase_orders)} />
                <KeyValue label="Approved Purchase Orders" value={formatNumber(data.context.procurement?.approved_purchase_orders)} />
              </div>
            </Section>

            <Section title="Costing Context" subtitle="Costing health exposed after the closed costing module.">
              <div style={styles.list}>
                <KeyValue label="Costed Products" value={formatNumber(data.context.costing?.costed_products)} />
                <KeyValue label="Uncosted Stocked Products" value={formatNumber(data.context.costing?.uncosted_stocked_products)} />
                <KeyValue label="High Variance Products" value={formatNumber(data.context.costing?.high_variance_products)} />
                <KeyValue label="Estimated Value" value={formatCurrency(data.context.costing?.estimated_inventory_value)} />
              </div>
            </Section>

            <Section title="Risk Signals" subtitle="Human-readable, non-executing signals for future automation.">
              <div style={styles.list}>
                {data.risk_signals.length ? data.risk_signals.map((signal) => (
                  <article key={signal.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{signal.code.replace(/_/g, ' ')}</div>
                    <div style={styles.itemText}>{signal.message}</div>
                    <div style={styles.itemMeta}>{signal.severity.toUpperCase()} · Count {formatNumber(signal.count)}</div>
                  </article>
                )) : <div className="app-empty-state">No context risk signals.</div>}
              </div>
            </Section>

            <Section title="Automation Recommendations" subtitle="Derived next steps for humans before future automation acts on context.">
              <div style={styles.list}>
                {data.recommendations.length ? data.recommendations.map((item) => (
                  <article key={item.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{item.title}</div>
                    <div style={styles.itemText}>{item.action}</div>
                    <div style={styles.itemMeta}>{item.priority.toUpperCase()} · {item.source_section.replace(/_/g, ' ')}</div>
                  </article>
                )) : <div className="app-empty-state">No automation preparation recommendations.</div>}
              </div>
            </Section>

            <Section title="Automation Readiness" subtitle="Deterministic preflight checks for future automation and AI workflows.">
              <div style={styles.list}>
                <KeyValue label="Status" value={data.automation_readiness.status.replace(/_/g, ' ')} />
                <KeyValue label="Score" value={`${formatNumber(data.automation_readiness.score)}%`} />
                <KeyValue label="Passed Checks" value={formatNumber(data.automation_readiness.passed_checks)} />
                <KeyValue label="Warnings" value={formatNumber(data.automation_readiness.warning_checks)} />
                <KeyValue label="Blockers" value={formatNumber(data.automation_readiness.failed_checks)} />
                {data.automation_readiness.checks.map((check) => (
                  <article key={check.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{check.label}</div>
                    <div style={styles.itemText}>{check.message}</div>
                    <div style={styles.itemMeta}>{check.status.toUpperCase()} · {check.code.replace(/_/g, ' ')}</div>
                  </article>
                ))}
              </div>
            </Section>

            <Section title="Context Quality" subtitle="Confidence score for using this snapshot in read-only planning.">
              <div style={styles.list}>
                <KeyValue label="Status" value={data.context_quality.status.replace(/_/g, ' ')} />
                <KeyValue label="Score" value={`${formatNumber(data.context_quality.score)}%`} />
                <div style={styles.note}>{data.context_quality.summary}</div>
                {data.context_quality.factors.map((factor) => (
                  <article key={factor.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{factor.label}</div>
                    <div style={styles.itemText}>{factor.message}</div>
                    <div style={styles.itemMeta}>{factor.status.toUpperCase()} · {factor.code.replace(/_/g, ' ')}</div>
                  </article>
                ))}
                {data.context_quality.source_quality.map((source) => (
                  <article key={source.section} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{source.section.replace(/_/g, ' ')}</div>
                    <div style={styles.itemText}>{source.message}</div>
                    <div style={styles.itemMeta}>STATUS {source.status.toUpperCase()} · SCORE {formatNumber(source.score)}%</div>
                  </article>
                ))}
              </div>
            </Section>

            <Section title="Context Freshness" subtitle="Advisory timestamp posture for source groups used in this snapshot.">
              <div style={styles.list}>
                <KeyValue label="Status" value={data.context_freshness.status.replace(/_/g, ' ')} />
                <KeyValue label="Current Sources" value={formatNumber(data.context_freshness.current_sources)} />
                <KeyValue label="Aging Sources" value={formatNumber(data.context_freshness.aging_sources)} />
                <KeyValue label="Stale Sources" value={formatNumber(data.context_freshness.stale_sources)} />
                <KeyValue label="Unknown Sources" value={formatNumber(data.context_freshness.unknown_sources)} />
                {data.context_freshness.items.map((item) => (
                  <article key={item.section} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{item.section.replace(/_/g, ' ')}</div>
                    <div style={styles.itemText}>{item.message}</div>
                    <div style={styles.itemMeta}>STATUS {item.status.replace(/_/g, ' ').toUpperCase()} · AGE {item.age_hours === null || item.age_hours === undefined ? '-' : `${formatNumber(item.age_hours)}h`} · LAST OBSERVED {formatDateTime(item.last_observed_at)}</div>
                  </article>
                ))}
                {data.context_freshness.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>

            <Section title="Automation Plan" subtitle="Manual-only sequencing for future automation enablement.">
              <div style={styles.list}>
                {data.automation_plan?.length ? data.automation_plan.map((phase) => (
                  <article key={phase.phase} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{phase.title}</div>
                    <div style={styles.itemText}>{phase.description}</div>
                    <div style={styles.itemMeta}>PHASE {phase.phase.replace(/_/g, ' ').toUpperCase()} · STATUS {phase.status.replace(/_/g, ' ').toUpperCase()} · REQUIRED {phase.required_before_automation ? 'YES' : 'NO'}</div>
                    <div style={styles.itemMeta}>Evidence: {phase.evidence.join(', ')}</div>
                  </article>
                )) : <div className="app-empty-state">No automation plan phases available.</div>}
              </div>
            </Section>

            <Section title="Context Source Map" subtitle="Explainable source groups used to build this read-only context snapshot.">
              <div style={styles.list}>
                {data.context_sources.length ? data.context_sources.map((source) => (
                  <article key={source.section} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{source.section.replace(/_/g, ' ')}</div>
                    <div style={styles.itemText}>{source.description}</div>
                    <div style={styles.itemMeta}>STATUS {source.status.toUpperCase()} · Tables {source.source_tables.join(', ') || '-'} · Last observed {formatDateTime(source.last_observed_at)}</div>
                  </article>
                )) : <div className="app-empty-state">No context source metadata available.</div>}
              </div>
            </Section>

            <Section title="Decision Boundaries" subtitle="Explicit allow, restrict, and prohibit rules for future automation use.">
              <div style={styles.list}>
                <KeyValue label="Boundary Status" value={data.decision_boundaries.status.replace(/_/g, ' ')} />
                <KeyValue label="Allowed Use Cases" value={data.decision_boundaries.allowed_use_cases.join(', ') || '-'} />
                <KeyValue label="Restricted Use Cases" value={data.decision_boundaries.restricted_use_cases.join(', ') || '-'} />
                <KeyValue label="Prohibited Use Cases" value={data.decision_boundaries.prohibited_use_cases.join(', ') || '-'} />
                {data.decision_boundaries.boundaries.map((boundary) => (
                  <article key={boundary.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{boundary.title}</div>
                    <div style={styles.itemText}>{boundary.description}</div>
                    <div style={styles.itemMeta}>STATUS {boundary.status.replace(/_/g, ' ').toUpperCase()} · HUMAN REVIEW {boundary.required_human_review ? 'YES' : 'NO'} · SOURCES {boundary.source_sections.join(', ')}</div>
                  </article>
                ))}
                {data.decision_boundaries.escalation_conditions.length ? data.decision_boundaries.escalation_conditions.map((condition) => (
                  <article key={condition.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{condition.code.replace(/_/g, ' ')}</div>
                    <div style={styles.itemText}>{condition.message}</div>
                    <div style={styles.itemMeta}>{condition.severity.toUpperCase()} · Evidence {condition.evidence.join(', ')}</div>
                  </article>
                )) : <div className="app-empty-state">No decision-boundary escalation conditions.</div>}
              </div>
            </Section>

            <Section title="Execution Gates" subtitle="Derived preflight controls for future automation without granting mutation authority.">
              <div style={styles.list}>
                <KeyValue label="Gate Status" value={data.execution_gates.status.replace(/_/g, ' ')} />
                <KeyValue label="Open Gates" value={formatNumber(data.execution_gates.open_gates)} />
                <KeyValue label="Review Gates" value={formatNumber(data.execution_gates.review_gates)} />
                <KeyValue label="Blocked Gates" value={formatNumber(data.execution_gates.blocked_gates)} />
                {data.execution_gates.gates.map((gate) => (
                  <article key={gate.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{gate.label}</div>
                    <div style={styles.itemText}>{gate.description}</div>
                    <div style={styles.itemMeta}>STATUS {gate.status.replace(/_/g, ' ').toUpperCase()} · OWNER {gate.owner.replace(/_/g, ' ').toUpperCase()} · REQUIRED {gate.required_before_execution ? 'YES' : 'NO'}</div>
                    <div style={styles.itemMeta}>Evidence: {gate.evidence.join(', ') || '-'}</div>
                  </article>
                ))}
                {data.execution_gates.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>

            <Section title="Context Observability" subtitle="What this read-only snapshot could observe, explain, and support with evidence.">
              <div style={styles.list}>
                <KeyValue label="Status" value={data.context_observability.status.replace(/_/g, ' ')} />
                <KeyValue label="Observed Signals" value={formatNumber(data.context_observability.observed_signals)} />
                <KeyValue label="Evidence Events (7d)" value={formatNumber(data.context_observability.evidence_events_7d)} />
                <KeyValue label="Observable Sources" value={`${formatNumber(data.context_observability.observable_sources)} / ${formatNumber(data.context_observability.requested_sources)}`} />
                <KeyValue label="Latest Observed" value={formatDateTime(data.context_observability.latest_observed_at)} />
                {data.context_observability.items.map((item) => (
                  <article key={item.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{item.label}</div>
                    <div style={styles.itemText}>{item.message}</div>
                    <div style={styles.itemMeta}>STATUS {item.status.replace(/_/g, ' ').toUpperCase()} · Evidence {item.evidence.join(', ') || '-'}</div>
                  </article>
                ))}
                {data.context_observability.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>


            <Section title="Automation Review Checklist" subtitle="Prioritized human-review checklist derived from readiness, recommendations, and freshness signals.">
              <div style={styles.list}>
                <KeyValue label="Checklist Status" value={data.automation_review_checklist.status.replace(/_/g, ' ')} />
                <KeyValue label="Total Items" value={formatNumber(data.automation_review_checklist.total_items)} />
                <KeyValue label="Critical / High" value={`${formatNumber(data.automation_review_checklist.critical_items)} / ${formatNumber(data.automation_review_checklist.high_items)}`} />
                <KeyValue label="Medium / Low" value={`${formatNumber(data.automation_review_checklist.medium_items)} / ${formatNumber(data.automation_review_checklist.low_items)}`} />
                {data.automation_review_checklist.items.length ? data.automation_review_checklist.items.map((item) => (
                  <article key={item.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{item.title}</div>
                    <div style={styles.itemText}>{item.action}</div>
                    <div style={styles.itemMeta}>PRIORITY {item.priority.replace(/_/g, ' ').toUpperCase()} · CATEGORY {item.category.replace(/_/g, ' ').toUpperCase()} · OWNER {item.owner.replace(/_/g, ' ').toUpperCase()}</div>
                    <div style={styles.itemMeta}>Evidence: {item.evidence.join(', ') || '-'}</div>
                  </article>
                )) : <div className="app-empty-state">No automation review checklist items.</div>}
                {data.automation_review_checklist.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>


            <Section title="Automation Action Hooks" subtitle="Descriptor-only hooks for future read-only automation and human review routing.">
              <div style={styles.list}>
                <KeyValue label="Hook Status" value={data.automation_action_hooks.status.replace(/_/g, ' ')} />
                <KeyValue label="Total Hooks" value={formatNumber(data.automation_action_hooks.total_hooks)} />
                <KeyValue label="Safe Read-only Hooks" value={formatNumber(data.automation_action_hooks.safe_read_only_hooks)} />
                <KeyValue label="Approval Required" value={formatNumber(data.automation_action_hooks.approval_required_hooks)} />
                <KeyValue label="Blocked Hooks" value={formatNumber(data.automation_action_hooks.blocked_hooks)} />
                {data.automation_action_hooks.hooks.length ? data.automation_action_hooks.hooks.map((hook) => (
                  <article key={hook.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{hook.title}</div>
                    <div style={styles.itemText}>{hook.description}</div>
                    <div style={styles.itemMeta}>TYPE {hook.hook_type.replace(/_/g, ' ').toUpperCase()} · STATUS {hook.status.replace(/_/g, ' ').toUpperCase()} · OWNER {hook.owner.replace(/_/g, ' ').toUpperCase()}</div>
                    <div style={styles.itemMeta}>SAFE {hook.safe_to_trigger ? 'YES' : 'NO'} · APPROVAL {hook.requires_human_approval ? 'REQUIRED' : 'NOT REQUIRED'} · Evidence {hook.evidence.join(', ') || '-'}</div>
                  </article>
                )) : <div className="app-empty-state">No automation action hooks available.</div>}
                {data.automation_action_hooks.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>


            <Section title="Automation Hook Policy" subtitle="Read-only policy rules for exposing action-hook descriptors to future automation surfaces.">
              <div style={styles.list}>
                <KeyValue label="Policy Status" value={data.automation_hook_policy.status.replace(/_/g, ' ')} />
                <KeyValue label="Read-only Allowed" value={formatNumber(data.automation_hook_policy.read_only_allowed)} />
                <KeyValue label="Approval Required" value={formatNumber(data.automation_hook_policy.approval_required)} />
                <KeyValue label="Blocked" value={formatNumber(data.automation_hook_policy.blocked)} />
                <KeyValue label="Prohibited Mutations" value={formatNumber(data.automation_hook_policy.prohibited_mutations)} />
                {data.automation_hook_policy.rules.map((rule) => (
                  <article key={rule.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{rule.title}</div>
                    <div style={styles.itemText}>{rule.description}</div>
                    <div style={styles.itemMeta}>STATUS {rule.status.replace(/_/g, ' ').toUpperCase()} · Applies to {rule.applies_to.join(', ') || '-'}</div>
                  </article>
                ))}
                {data.automation_hook_policy.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>


            <Section title="Automation Execution Log" subtitle="Derived, non-persisted event descriptors for future automation traceability.">
              <div style={styles.list}>
                <KeyValue label="Log Status" value={data.automation_execution_log.status.replace(/_/g, ' ')} />
                <KeyValue label="Total Events" value={formatNumber(data.automation_execution_log.total_events)} />
                <KeyValue label="Hook Events" value={formatNumber(data.automation_execution_log.hook_events)} />
                <KeyValue label="Gate Events" value={formatNumber(data.automation_execution_log.gate_events)} />
                <KeyValue label="Blocked Events" value={formatNumber(data.automation_execution_log.blocked_events)} />
                {data.automation_execution_log.events.map((event) => (
                  <article key={event.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{event.title}</div>
                    <div style={styles.itemText}>{event.message}</div>
                    <div style={styles.itemMeta}>TYPE {event.event_type.replace(/_/g, ' ').toUpperCase()} · STATUS {event.status.replace(/_/g, ' ').toUpperCase()} · ACTOR {event.actor_type.replace(/_/g, ' ').toUpperCase()}</div>
                    <div style={styles.itemMeta}>Source {event.source.replace(/_/g, ' ')} · Evidence {event.evidence.join(', ') || '-'} · Occurred {formatDateTime(event.occurred_at)}</div>
                  </article>
                ))}
                {data.automation_execution_log.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>

            <Section title="Automation Execution Replay" subtitle="Read-only replay plan for explaining automation traces without executing hooks.">
              <div style={styles.list}>
                <KeyValue label="Replay Status" value={data.automation_execution_replay.status.replace(/_/g, ' ')} />
                <KeyValue label="Total Steps" value={formatNumber(data.automation_execution_replay.total_steps)} />
                <KeyValue label="Replayable Events" value={formatNumber(data.automation_execution_replay.replayable_events)} />
                <KeyValue label="Mutation Replay Allowed" value={data.automation_execution_replay.mutation_replay_allowed ? 'Yes' : 'No'} />
                {data.automation_execution_replay.steps.map((step) => (
                  <article key={step.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{step.sequence}. {step.title}</div>
                    <div style={styles.itemText}>{step.description}</div>
                    <div style={styles.itemMeta}>TYPE {step.replay_type.replace(/_/g, ' ').toUpperCase()} · STATUS {step.status.replace(/_/g, ' ').toUpperCase()}</div>
                    <div style={styles.itemMeta}>Evidence {step.evidence.join(', ') || '-'}</div>
                  </article>
                ))}
                {data.automation_execution_replay.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>


            <Section title="Automation Replay Verification" subtitle="Derived checks that verify replay output is safe, explainable, and non-mutating.">
              <div style={styles.list}>
                <KeyValue label="Verification Status" value={data.automation_execution_replay_verification.status.replace(/_/g, ' ')} />
                <KeyValue label="Verification Scope" value={data.automation_execution_replay_verification.verification_scope.replace(/_/g, ' ')} />
                <KeyValue label="Passed Checks" value={formatNumber(data.automation_execution_replay_verification.passed_checks)} />
                <KeyValue label="Review Checks" value={formatNumber(data.automation_execution_replay_verification.review_checks)} />
                <KeyValue label="Failed Checks" value={formatNumber(data.automation_execution_replay_verification.failed_checks)} />
                {data.automation_execution_replay_verification.checks.map((check) => (
                  <article key={check.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{check.title}</div>
                    <div style={styles.itemText}>{check.description}</div>
                    <div style={styles.itemMeta}>STATUS {check.status.replace(/_/g, ' ').toUpperCase()} · Evidence {check.evidence.join(', ') || '-'}</div>
                  </article>
                ))}
                {data.automation_execution_replay_verification.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>


            <Section title="Automation Dry Run Summary" subtitle="Descriptor-only dry-run scenarios for future read-only automation previews.">
              <div style={styles.list}>
                <KeyValue label="Dry Run Status" value={data.automation_dry_run_summary.status.replace(/_/g, ' ')} />
                <KeyValue label="Total Scenarios" value={formatNumber(data.automation_dry_run_summary.total_scenarios)} />
                <KeyValue label="Ready Scenarios" value={formatNumber(data.automation_dry_run_summary.ready_scenarios)} />
                <KeyValue label="Approval Required" value={formatNumber(data.automation_dry_run_summary.approval_required_scenarios)} />
                <KeyValue label="Blocked Scenarios" value={formatNumber(data.automation_dry_run_summary.blocked_scenarios)} />
                <KeyValue label="Mutation Scenarios Allowed" value={formatNumber(data.automation_dry_run_summary.mutation_scenarios_allowed)} />
                {data.automation_dry_run_summary.scenarios.map((scenario) => (
                  <article key={scenario.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{scenario.title}</div>
                    <div style={styles.itemText}>{scenario.description}</div>
                    <div style={styles.itemMeta}>TYPE {scenario.dry_run_type.replace(/_/g, ' ').toUpperCase()} · STATUS {scenario.status.replace(/_/g, ' ').toUpperCase()} · MUTATION {scenario.mutation_allowed ? 'ALLOWED' : 'BLOCKED'}</div>
                    <div style={styles.itemMeta}>Approval {scenario.human_approval_required ? 'required' : 'not required'} · Expected output: {scenario.expected_output}</div>
                    <div style={styles.itemMeta}>Inputs {scenario.required_inputs.join(', ') || '-'} · Evidence {scenario.evidence.join(', ') || '-'}</div>
                  </article>
                ))}
                {data.automation_dry_run_summary.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>


            <Section title="Automation Dry Run Evidence" subtitle="Derived evidence map for future dry-run previews and human review.">
              <div style={styles.list}>
                <KeyValue label="Evidence Status" value={data.automation_dry_run_evidence.status.replace(/_/g, ' ')} />
                <KeyValue label="Evidence Scope" value={data.automation_dry_run_evidence.evidence_scope.replace(/_/g, ' ')} />
                <KeyValue label="Complete Items" value={formatNumber(data.automation_dry_run_evidence.complete_items)} />
                <KeyValue label="Review Items" value={formatNumber(data.automation_dry_run_evidence.review_items)} />
                <KeyValue label="Blocked Items" value={formatNumber(data.automation_dry_run_evidence.blocked_items)} />
                {data.automation_dry_run_evidence.items.map((item) => (
                  <article key={item.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{item.title}</div>
                    <div style={styles.itemText}>{item.description}</div>
                    <div style={styles.itemMeta}>TYPE {item.evidence_type.replace(/_/g, ' ').toUpperCase()} · STATUS {item.status.replace(/_/g, ' ').toUpperCase()}</div>
                    <div style={styles.itemMeta}>Scenarios {item.scenario_codes.join(', ') || '-'} · Evidence {item.evidence.join(', ') || '-'}</div>
                  </article>
                ))}
                {data.automation_dry_run_evidence.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>


            <Section title="Automation Dry Run Policy" subtitle="Read-only policy controls for future dry-run previews.">
              <div style={styles.list}>
                <KeyValue label="Policy Status" value={data.automation_dry_run_policy.status.replace(/_/g, ' ')} />
                <KeyValue label="Total Rules" value={formatNumber(data.automation_dry_run_policy.total_rules)} />
                <KeyValue label="Enforced Rules" value={formatNumber(data.automation_dry_run_policy.enforced_rules)} />
                <KeyValue label="Review Rules" value={formatNumber(data.automation_dry_run_policy.review_rules)} />
                <KeyValue label="Blocked Rules" value={formatNumber(data.automation_dry_run_policy.blocked_rules)} />
                <KeyValue label="Mutation Allowed" value={data.automation_dry_run_policy.mutation_allowed ? 'Yes' : 'No'} />
                {data.automation_dry_run_policy.rules.map((rule) => (
                  <article key={rule.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{rule.title}</div>
                    <div style={styles.itemText}>{rule.description}</div>
                    <div style={styles.itemMeta}>TYPE {rule.rule_type.replace(/_/g, ' ').toUpperCase()} · STATUS {rule.status.replace(/_/g, ' ').toUpperCase()} · ENFORCEMENT {rule.enforcement.replace(/_/g, ' ').toUpperCase()}</div>
                    <div style={styles.itemMeta}>Required {rule.required ? 'yes' : 'no'} · Applies to {rule.applies_to.join(', ') || '-'}</div>
                  </article>
                ))}
                {data.automation_dry_run_policy.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>


            <Section title="Automation Dry Run Outcomes" subtitle="Final read-only outcome posture for dry-run previews after policy and evidence checks.">
              <div style={styles.list}>
                <KeyValue label="Outcome Status" value={data.automation_dry_run_outcomes.status.replace(/_/g, ' ')} />
                <KeyValue label="Total Outcomes" value={formatNumber(data.automation_dry_run_outcomes.total_outcomes)} />
                <KeyValue label="Ready Outcomes" value={formatNumber(data.automation_dry_run_outcomes.ready_outcomes)} />
                <KeyValue label="Approval Required" value={formatNumber(data.automation_dry_run_outcomes.approval_required_outcomes)} />
                <KeyValue label="Blocked Outcomes" value={formatNumber(data.automation_dry_run_outcomes.blocked_outcomes)} />
                <KeyValue label="Downstream Execution Allowed" value={data.automation_dry_run_outcomes.downstream_execution_allowed ? 'Yes' : 'No'} />
                {data.automation_dry_run_outcomes.outcomes.map((outcome) => (
                  <article key={outcome.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{outcome.title}</div>
                    <div style={styles.itemText}>{outcome.summary}</div>
                    <div style={styles.itemMeta}>SCENARIO {outcome.scenario_code.replace(/_/g, ' ').toUpperCase()} · STATUS {outcome.status.replace(/_/g, ' ').toUpperCase()} · SAFE TO PRESENT {outcome.safe_to_present ? 'YES' : 'NO'}</div>
                    <div style={styles.itemMeta}>Downstream execution {outcome.downstream_execution_allowed ? 'allowed' : 'blocked'} · Blocking reasons {outcome.blocking_reasons.join(', ') || '-'}</div>
                    <div style={styles.itemMeta}>Evidence {outcome.evidence.join(', ') || '-'}</div>
                  </article>
                ))}
                {data.automation_dry_run_outcomes.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>


            <Section title="Automation Dry Run Closure" subtitle="Closure checks that confirm the dry-run surface remains read-only and non-executing.">
              <div style={styles.list}>
                <KeyValue label="Closure Status" value={data.automation_dry_run_closure.status.replace(/_/g, ' ')} />
                <KeyValue label="Closure Scope" value={data.automation_dry_run_closure.closure_scope.replace(/_/g, ' ')} />
                <KeyValue label="Closed Checks" value={formatNumber(data.automation_dry_run_closure.closed_checks)} />
                <KeyValue label="Review Required" value={formatNumber(data.automation_dry_run_closure.review_required_checks)} />
                <KeyValue label="Blocked Checks" value={formatNumber(data.automation_dry_run_closure.blocked_checks)} />
                <KeyValue label="Ready For Execution Engine" value={data.automation_dry_run_closure.ready_for_future_execution_engine ? 'Yes' : 'No'} />
                {data.automation_dry_run_closure.checks.map((check) => (
                  <article key={check.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{check.title}</div>
                    <div style={styles.itemText}>{check.description}</div>
                    <div style={styles.itemMeta}>STATUS {check.status.replace(/_/g, ' ').toUpperCase()} · Evidence {check.evidence.join(', ') || '-'}</div>
                  </article>
                ))}
                {data.automation_dry_run_closure.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>


            <Section title="Live Execution Gate" subtitle="Read-only gate for discussing controlled real execution without running actions.">
              <div style={styles.list}>
                {executionGate ? (
                  <>
                    <KeyValue label="Allowed" value={executionGate.allowed ? 'Yes' : 'No'} />
                    <KeyValue label="Risk Level" value={executionGate.risk_level.replace(/_/g, ' ')} />
                    <KeyValue label="Evaluated" value={formatDateTime(executionGate.evaluated_at)} />
                    <KeyValue label="Required Permissions" value={executionGate.required_permissions.join(', ') || '-'} />
                    <div style={styles.note}>{executionGate.reason}</div>
                    <div style={styles.note}>{executionGate.recommendation}</div>
                    <article style={styles.itemCard}>
                      <div style={styles.itemTitle}>Gate Evidence</div>
                      <div style={styles.itemText}>Readiness {executionGate.evidence.readiness_status.replace(/_/g, ' ')} · Execution gates {executionGate.evidence.execution_gate_status.replace(/_/g, ' ')} · Dry run closure {executionGate.evidence.dry_run_closure_status.replace(/_/g, ' ')}</div>
                      <div style={styles.itemMeta}>FAILED READINESS {formatNumber(executionGate.evidence.readiness_failed_checks)} · CRITICAL RISKS {executionGate.evidence.critical_risk_signals.join(', ') || '-'} · HIGH RECOMMENDATIONS {executionGate.evidence.high_priority_recommendations.join(', ') || '-'}</div>
                      <div style={styles.itemMeta}>BLOCKED GATES {formatNumber(executionGate.evidence.blocked_execution_gates)} · DRY RUN BLOCKED {formatNumber(executionGate.evidence.dry_run_blocked_checks)} · MUTATION ALLOWED {executionGate.evidence.mutation_allowed_by_dry_run_policy ? 'YES' : 'NO'}</div>
                    </article>
                    {executionGate.blockers.length ? executionGate.blockers.map((blocker) => (
                      <article key={blocker} style={styles.itemCard}>
                        <div style={styles.itemTitle}>{blocker.replace(/_/g, ' ')}</div>
                        <div style={styles.itemText}>This blocker must be resolved before any controlled-execution design can proceed.</div>
                        <div style={styles.itemMeta}>BLOCKER · LIVE EXECUTION GATE</div>
                      </article>
                    )) : <div className="app-empty-state">No live execution gate blockers.</div>}
                    {executionGate.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
                  </>
                ) : <div className="app-empty-state">Live execution gate not loaded.</div>}
              </div>
            </Section>

            <Section title="Automation Contract" subtitle="Guardrails for future automation and AI use.">
              <div style={styles.list}>
                <KeyValue label="Read Only" value={data.automation_contract.read_only ? 'Yes' : 'No'} />
                <KeyValue label="Tenant Scoped" value={data.automation_contract.tenant_scoped ? 'Yes' : 'No'} />
                <KeyValue label="Mutation Allowed" value={data.automation_contract.mutation_allowed ? 'Yes' : 'No'} />
                {data.automation_contract.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>
          </div>
        </>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: '20px', width: '100%', minWidth: 0 },
  statsGrid: { width: '100%', minWidth: 0 },
  statCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '18px', minWidth: 0 },
  statTitle: { color: '#64748b', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' },
  statValue: { marginTop: '10px', fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', textTransform: 'capitalize' },
  statValueWarn: { marginTop: '10px', fontSize: '1.6rem', fontWeight: 800, color: '#b45309', textTransform: 'capitalize' },
  statValueBad: { marginTop: '10px', fontSize: '1.6rem', fontWeight: 800, color: '#b91c1c', textTransform: 'capitalize' },
  statSubtitle: { marginTop: '8px', color: '#475569', lineHeight: 1.5 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: '20px', width: '100%', minWidth: 0 },
  panel: { minWidth: 0, overflow: 'hidden' },
  panelTitle: { margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' },
  panelSubtitle: { margin: '8px 0 16px', color: '#475569', lineHeight: 1.5, wordBreak: 'break-word' },
  list: { display: 'grid', gap: '12px', minWidth: 0 },
  keyValueRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', minWidth: 0 },
  itemCard: { border: '1px solid #e5e7eb', borderRadius: '14px', padding: '14px', display: 'grid', gap: '8px', minWidth: 0 },
  itemTitle: { fontWeight: 800, color: '#0f172a', textTransform: 'capitalize', wordBreak: 'break-word' },
  itemText: { color: '#334155', lineHeight: 1.5, wordBreak: 'break-word' },
  itemMeta: { color: '#64748b', fontSize: '0.88rem', lineHeight: 1.45, wordBreak: 'break-word' },
  note: { color: '#334155', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '10px', lineHeight: 1.45 }
};
