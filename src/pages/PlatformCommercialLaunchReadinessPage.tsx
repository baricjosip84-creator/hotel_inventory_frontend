import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './PlatformCommercialLaunchReadinessPage.css';

type LaunchReadinessArea = {
  code: string;
  domain: string;
  label: string;
  current_status: string;
  evidence_surfaces: string[];
  required_launch_controls: string[];
  next_best_step: string;
  launch_gate: string;
};

type LaunchReadinessPackage = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  areas: LaunchReadinessArea[];
  validation_note: string;
};

const statusSummaryItems = [
  { key: 'strong_foundation_present', label: 'Strong foundation', tone: 'good' },
  { key: 'medium_strong_foundation_present', label: 'Medium-strong foundation', tone: 'blue' },
  { key: 'medium_foundation_present', label: 'Medium foundation', tone: 'warn' },
  { key: 'partial_foundation_present', label: 'Partial foundation', tone: 'warn' },
  { key: 'not_complete', label: 'Not complete', tone: 'danger' },
  { key: 'manual_certificate_review_required', label: 'Manual certificate review', tone: 'warn' },
  { key: 'manual_evidence_required', label: 'Manual evidence required', tone: 'warn' }
] as const;

function humanize(value: string) {
  const normalized = value.replaceAll('_', ' ').trim();
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Not set';
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    strong_foundation_present: 'Strong foundation present',
    medium_strong_foundation_present: 'Medium-strong foundation present',
    medium_foundation_present: 'Medium foundation present',
    partial_foundation_present: 'Partial foundation present',
    not_complete: 'Not complete',
    manual_certificate_review_required: 'Manual certificate review required',
    manual_evidence_required: 'Manual evidence required'
  };
  return labels[value] || humanize(value);
}

function statusTone(value: string): 'good' | 'blue' | 'warn' | 'danger' {
  if (value.includes('not_ready') || value.includes('blocked') || value.includes('not_complete')) return 'danger';
  if (value.includes('manual_') || value.includes('partial') || value === 'medium_foundation_present') return 'warn';
  if (value.includes('medium_strong')) return 'blue';
  return 'good';
}

function formatDateTime(value: string | undefined) {
  if (!value) return 'Not available';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not available' : parsed.toLocaleString();
}

function SmallList({ items }: { items: string[] }) {
  return (
    <ul className="platform-launch-readiness__list">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

function AreaCard({ area }: { area: LaunchReadinessArea }) {
  return (
    <article className="app-panel app-panel--padded platform-launch-readiness__area-card">
      <div className="platform-launch-readiness__area-header">
        <div className="platform-launch-readiness__area-heading">
          <h3>{area.label}</h3>
          <span>{humanize(area.domain)}</span>
        </div>
        <span className="platform-launch-readiness__status-badge" data-tone={statusTone(area.current_status)}>
          {statusLabel(area.current_status)}
        </span>
      </div>

      <div className="platform-launch-readiness__next-step">
        <strong>Next best step</strong>
        <span>{area.next_best_step}</span>
      </div>

      <div className="platform-launch-readiness__gate-line">
        <strong>Review gate</strong>
        <span>{humanize(area.launch_gate)}</span>
      </div>

      <details className="platform-launch-readiness__details">
        <summary>Evidence surfaces ({area.evidence_surfaces.length})</summary>
        <div className="platform-launch-readiness__details-body"><SmallList items={area.evidence_surfaces} /></div>
      </details>

      <details className="platform-launch-readiness__details">
        <summary>Required controls ({area.required_launch_controls.length})</summary>
        <div className="platform-launch-readiness__details-body"><SmallList items={area.required_launch_controls} /></div>
      </details>
    </article>
  );
}

export default function PlatformCommercialLaunchReadinessPage() {
  const readinessQuery = useQuery({
    queryKey: ['platform', 'commercial-launch-readiness'],
    queryFn: () => platformApiRequest<LaunchReadinessPackage>('/platform/commercial-launch-readiness'),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const data = readinessQuery.data;
  const summary = data?.summary || {};
  const coreAreas = data?.areas.filter((area) => area.domain !== 'post_launch_controls') || [];
  const postLaunchAreas = data?.areas.filter((area) => area.domain === 'post_launch_controls') || [];
  const errorMessage = readinessQuery.error instanceof Error
    ? readinessQuery.error.message
    : 'The launch-readiness package could not be retrieved.';
  const initialLoadError = readinessQuery.isError && !data;
  const refreshError = readinessQuery.isError && Boolean(data);
  const blockedGates = summary.blocked_launch_gates ?? 0;

  return (
    <div className="io-operational-page io-workspace-page platform-launch-readiness">
      <OperationalWorkspaceHero
        iconPath="/platform/commercial-launch-readiness"
        eyebrow="Platform commercial operations"
        title="Commercial launch readiness"
        description="Review the ten core launch areas and the post-launch evidence-governance chain from one read-only capability board. This surface shows implementation and evidence posture; it does not certify a real customer launch."
        meta={<>
          <OperationalWorkspaceMetaPill>Platform-scoped</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Read-only readiness evidence</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Manual launch certification remains separate</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-launch-readiness__hero-aside">
            <OperationalWorkspaceStatus
              value={data ? blockedGates : '—'}
              label="blocked review gates in this package"
            />
            {data ? (
              <span className="platform-launch-readiness__posture" data-tone={statusTone(data.posture)}>
                {humanize(data.posture)}
              </span>
            ) : null}
            <div className="platform-launch-readiness__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={() => void readinessQuery.refetch()}
                disabled={readinessQuery.isFetching}
              >
                {readinessQuery.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      {readinessQuery.isLoading ? (
        <section className="app-panel app-panel--padded">Loading commercial launch readiness…</section>
      ) : null}

      {initialLoadError ? (
        <section className="app-error-state platform-launch-readiness__feedback" role="alert">
          <strong>Unable to load commercial launch readiness.</strong>
          <span>{errorMessage}</span>
          <button
            type="button"
            className="app-button app-button--danger platform-launch-readiness__retry"
            onClick={() => void readinessQuery.refetch()}
            disabled={readinessQuery.isFetching}
          >
            {readinessQuery.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-warning-state platform-launch-readiness__feedback" role="status">
          <strong>Latest readiness refresh failed.</strong>
          <span>Showing the last successful readiness package from {formatDateTime(data?.generated_at)}.</span>
          <span>{errorMessage}</span>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Commercial launch readiness key metrics">
            <OperationalWorkspaceStatCard
              label="Areas total"
              value={summary.areas_total ?? 0}
              helper="All core launch and post-launch control areas"
              iconPath="/platform/commercial-launch-readiness"
              tone="neutral"
            />
            <OperationalWorkspaceStatCard
              label="Core launch areas"
              value={summary.core_launch_areas_total ?? 0}
              helper="Pre-launch capability areas"
              iconPath="/platform/commercial-launch-readiness"
              tone="blue"
            />
            <OperationalWorkspaceStatCard
              label="Post-launch controls"
              value={summary.post_launch_controls_total ?? 0}
              helper="Evidence-governance checkpoints after launch"
              iconPath="/platform/commercial-launch-readiness"
              tone="neutral"
            />
            <OperationalWorkspaceStatCard
              label="Blocked gates"
              value={blockedGates}
              helper={`${summary.ready_launch_gates ?? 0} review-ready gates`}
              iconPath="/platform/commercial-launch-readiness"
              tone={blockedGates > 0 ? 'danger' : 'good'}
            />
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-launch-readiness__package-panel">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-readiness"
              title="Readiness package context"
              description="Static capability posture and evidence requirements for the current commercial-launch readiness package."
            />
            <div className="platform-launch-readiness__package-grid">
              <div>
                <strong>{data.phase}</strong>
                <span>{data.step}</span>
              </div>
              <div>
                <strong>Review-ready gates</strong>
                <span>{summary.ready_launch_gates ?? 0}</span>
              </div>
              <div>
                <strong>Blocked gates</strong>
                <span>{blockedGates}</span>
              </div>
              <div className="platform-launch-readiness__validation-note">
                <strong>Validation note</strong>
                <span>{data.validation_note}</span>
              </div>
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-launch-readiness__posture-panel">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-readiness"
              title="Implementation and evidence posture"
              description="Foundation labels describe what implementation or evidence support exists. Manual states remain intentionally separate from completed green states."
            />
            <div className="platform-launch-readiness__posture-grid">
              {statusSummaryItems.map(({ key, label, tone }) => (
                <div key={key} className="platform-launch-readiness__posture-item" data-tone={tone}>
                  <span>{label}</span>
                  <strong>{summary[key] ?? 0}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="platform-launch-readiness__section">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-readiness"
              title="Core launch readiness"
              description="Ten pre-launch capability areas. Foundation labels describe implementation/evidence posture, not proof that a launch has succeeded."
              actions={<span className="platform-launch-readiness__count-badge">{coreAreas.length} areas</span>}
            />
            <div className="platform-launch-readiness__area-grid">
              {coreAreas.map((area) => <AreaCard key={area.code} area={area} />)}
            </div>
          </section>

          <section className="platform-launch-readiness__section">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-readiness"
              title="Post-launch evidence controls"
              description="Manual governance checkpoints for incident closure, rollout, steady-state operations, retention, and renewal evidence. “Manual evidence required” is intentionally not treated as a completed green state."
              actions={<span className="platform-launch-readiness__count-badge">{postLaunchAreas.length} controls</span>}
            />
            <div className="platform-launch-readiness__area-grid">
              {postLaunchAreas.map((area) => <AreaCard key={area.code} area={area} />)}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
