import { useMemo } from 'react';
import { Link } from 'react-router';
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
import './PlatformCommercialLaunchAcceptancePacketPage.css';

type EvidenceScope = {
  mode: string;
  status: string;
  review_limit: number | null;
  evaluated_tenants: number;
  total_tenants: number | null;
};

type AcceptancePacket = {
  code: string;
  source_control: string;
  source_key: string | null;
  domain: string;
  acceptance_owner: string;
  acceptance_rule: string | null;
  required_evidence: string;
  evidence_status: string;
  source_available: boolean;
  source_posture: string;
  source_summary: Record<string, unknown>;
  source_validation_note: string | null;
  source_error_code: string | null;
  evidence_scope: EvidenceScope | null;
  launch_area_status: string;
  launch_gate: string;
  launch_gate_context_only: boolean;
  acceptance_artifact: string;
  acceptance_artifact_storage: string;
  required_statement: string;
  required_acceptance_fields: string[];
  packet_status: string;
};

type CommercialLaunchAcceptancePacket = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  acceptance_packets: AcceptancePacket[];
  certificate_posture: string;
  certificate_summary: Record<string, unknown>;
  certificate_validation_note: string | null;
  certificate_registry_note: string | null;
  tenant_scope: {
    available: boolean;
    total_tenants: number | null;
    review_limit: number;
    error_code?: string;
  } | null;
  launch_readiness_posture: string;
  acceptance_persistence: {
    stored_in_application: boolean;
    external_records_observable: boolean;
    interpretation: string;
  };
  required_packet_controls: string[];
  launch_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';

type SummaryItem = {
  key: string;
  label: string;
  helper: string;
  tone?: 'default' | 'neutral' | 'good' | 'warn' | 'danger';
};

const summaryItems: SummaryItem[] = [
  { key: 'packets_total', label: 'Acceptance packets', helper: 'Owner-facing packets derived from current certificate controls.' },
  { key: 'packets_ready_for_acceptance', label: 'Ready for owner review', helper: 'Current evidence is ready to enter external manual signoff.', tone: 'good' },
  { key: 'packets_requiring_evidence_review', label: 'Evidence review', helper: 'Evidence or scope still needs explicit review before signoff.', tone: 'warn' },
  { key: 'packets_blocked', label: 'Blocked packets', helper: 'Packets blocked by missing or unavailable evidence.', tone: 'danger' },
  { key: 'manual_owner_signoffs_required', label: 'Manual signoffs', helper: 'Owner acceptances still required outside this application.', tone: 'warn' },
  { key: 'owner_signoffs_persisted_in_application', label: 'Signoffs stored', helper: 'This read-only board intentionally stores no owner signatures.', tone: 'neutral' }
];

const summaryLabels: Record<string, string> = {
  packets_total: 'Acceptance packets',
  packets_ready_for_acceptance: 'Ready for owner review',
  packets_requiring_evidence_review: 'Evidence review required',
  packets_blocked: 'Blocked packets',
  manual_owner_signoffs_required: 'Manual owner signoffs required',
  owner_signoffs_persisted_in_application: 'Owner signoffs stored in application'
};

const statusLabels: Record<string, string> = {
  commercial_launch_acceptance_packet_blocked: 'Blocked by evidence',
  commercial_launch_acceptance_packet_evidence_review_required: 'Evidence review required',
  commercial_launch_acceptance_packet_ready_for_manual_signoff: 'Ready for manual signoff',
  ready_for_manual_owner_acceptance: 'Ready for manual owner acceptance',
  evidence_review_required_before_manual_owner_acceptance: 'Evidence review required before owner acceptance',
  blocked_until_evidence_surface_ready: 'Blocked until evidence is ready',
  evidence_surface_ready: 'Evidence surface ready',
  evidence_review_required: 'Evidence review required',
  evidence_surface_blocked: 'Evidence surface blocked',
  evidence_source_unavailable: 'Evidence source unavailable',
  full_population: 'Full tenant population',
  full_population_reviewed: 'Full tenant population reviewed',
  full_population_inferred: 'Full tenant population inferred',
  scope_limit_review_required: 'Scope review required',
  not_limited_by_certificate: 'Not limited by certificate',
  external_not_persisted_by_application: 'External — not persisted by application'
};

function humanize(value: string | null | undefined) {
  const normalized = String(value || '').trim().replaceAll('_', ' ');
  if (!normalized) return 'Not set';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function displayStatus(value: string | null | undefined) {
  if (!value) return 'Not available';
  return statusLabels[value] || humanize(value);
}

function displaySummaryKey(value: string) {
  return summaryLabels[value] || humanize(value);
}

function badgeTone(value: string | null | undefined): BadgeTone {
  const normalized = String(value || '').toLowerCase();
  if (
    normalized.includes('blocked')
    || normalized.includes('missing')
    || normalized.includes('unavailable')
    || normalized.includes('failed')
    || normalized.includes('incomplete')
  ) return 'danger';
  if (
    normalized.includes('manual')
    || normalized.includes('required')
    || normalized.includes('review')
    || normalized.includes('external')
    || normalized.includes('partial')
    || normalized.includes('scope_limit')
  ) return 'warn';
  if (normalized.includes('context_only') || normalized.includes('not_limited')) return 'neutral';
  if (normalized.includes('ready') || normalized.includes('clear') || normalized.includes('present') || normalized.includes('full_population')) return 'good';
  return 'accent';
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not available';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not available' : parsed.toLocaleString();
}

function readableError(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'The platform request failed.';
}

function formatEvidenceValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') {
    const parsed = /^\d{4}-\d{2}-\d{2}T/.test(value) ? new Date(value) : null;
    if (parsed && !Number.isNaN(parsed.getTime())) return parsed.toLocaleString();
    return value;
  }
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getPacketReviewLink(packet: AcceptancePacket) {
  const bySourceControl: Record<string, string> = {
    tenant_provisioning_accepted: '/platform/tenant-provisioning-hardening',
    customer_onboarding_accepted: '/platform/customer-onboarding-checklist',
    billing_subscription_accepted: '/platform/billing-subscription-activation',
    support_operations_accepted: '/platform/support-cockpit',
    production_monitoring_accepted: '/platform/monitoring-readiness',
    backup_restore_accepted: '/platform/backup-restore-validation',
    deployment_validation_accepted: '/platform/deployment-validation',
    documentation_completeness_accepted: '/platform/documentation-completeness',
    pilot_customer_readiness_accepted: '/platform/pilot-customer-readiness',
    commercial_readiness_closure_accepted: '/platform/commercial-readiness-verification-program'
  };
  return bySourceControl[packet.source_control] || '/platform/commercial-launch-certificate';
}

function getPacketReviewLabel(packet: AcceptancePacket) {
  const bySourceControl: Record<string, string> = {
    tenant_provisioning_accepted: 'Open provisioning evidence',
    customer_onboarding_accepted: 'Open onboarding evidence',
    billing_subscription_accepted: 'Open billing activation',
    support_operations_accepted: 'Open support cockpit',
    production_monitoring_accepted: 'Open monitoring readiness',
    backup_restore_accepted: 'Open backup restore',
    deployment_validation_accepted: 'Open deployment validation',
    documentation_completeness_accepted: 'Open documentation completeness',
    pilot_customer_readiness_accepted: 'Open pilot readiness',
    commercial_readiness_closure_accepted: 'Open readiness verification'
  };
  return bySourceControl[packet.source_control] || 'Open certificate evidence';
}

export default function PlatformCommercialLaunchAcceptancePacketPage() {
  const packet = useQuery({
    queryKey: ['platform', 'commercial-launch-acceptance-packet'],
    queryFn: () => platformApiRequest<CommercialLaunchAcceptancePacket>('/platform/commercial-launch-acceptance-packet'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const data = packet.data;
  const summary = data?.summary || {};
  const detailedSummary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const initialLoadError = packet.isError && !data;
  const refreshError = packet.isError && Boolean(data);
  const requestError = readableError(packet.error);

  return (
    <div className="io-operational-page io-workspace-page platform-launch-acceptance">
      <OperationalWorkspaceHero
        iconPath="/platform/commercial-launch-acceptance-packet"
        eyebrow="Platform Commercial Launch Readiness"
        title="Commercial Launch Acceptance Packet"
        description="Read-only owner-signoff preparation built from the current Launch Certificate evidence. It preserves blocked, review-required and ready evidence states without pretending that an owner signed, an external ticket exists or production launch has been approved."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 218 — Commercial Launch Acceptance Packet'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Owner-signoff preparation only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>External acceptance records required</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-launch-acceptance__hero-aside">
            <OperationalWorkspaceStatus
              value={data ? `${summary.packets_ready_for_acceptance ?? 0}/${summary.packets_total ?? 0}` : '—'}
              label="packets ready for manual owner review"
            />
            {data ? (
              <span className="platform-launch-acceptance__status-badge" data-tone={badgeTone(data.posture)}>
                {displayStatus(data.posture)}
              </span>
            ) : null}
            <div className="platform-launch-acceptance__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={() => void packet.refetch()}
                disabled={packet.isFetching}
              >
                {packet.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <section className="app-panel app-panel--padded platform-launch-acceptance__boundary-panel">
        <OperationalSectionHeader
          iconPath="/platform/commercial-launch-acceptance-packet"
          title="Acceptance boundary"
          description="The packet prepares the evidence an accountable owner must review, then stops before the external signature or go/no-go decision."
        />
        <div className="platform-launch-acceptance__boundary-grid">
          <div className="platform-launch-acceptance__boundary-notice">
            <strong>Owner-signoff preparation only.</strong>
            <span>
              A packet marked ready means its current technical evidence is ready for an owner to review and sign externally. It does not mean an owner has signed, a go/no-go decision exists, a customer accepted launch, or production launch has been approved.
            </span>
          </div>
          <div className="platform-launch-acceptance__supporting-pages">
            <strong>Supporting readiness pages</strong>
            <span>This page requires the combined read permissions for the underlying evidence surfaces, so every shortcut below is within the page&apos;s existing access boundary.</span>
            <div className="platform-launch-acceptance__link-row">
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-certificate">Launch certificate</Link>
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-readiness">Launch readiness</Link>
              <Link className="app-button app-button--secondary" to="/platform/tenant-provisioning-hardening">Provisioning</Link>
              <Link className="app-button app-button--secondary" to="/platform/customer-onboarding-checklist">Onboarding</Link>
              <Link className="app-button app-button--secondary" to="/platform/billing-subscription-activation">Billing activation</Link>
              <Link className="app-button app-button--secondary" to="/platform/support-cockpit">Support cockpit</Link>
              <Link className="app-button app-button--secondary" to="/platform/monitoring-readiness">Monitoring</Link>
              <Link className="app-button app-button--secondary" to="/platform/backup-restore-validation">Backup restore</Link>
              <Link className="app-button app-button--secondary" to="/platform/deployment-validation">Deployment validation</Link>
              <Link className="app-button app-button--secondary" to="/platform/documentation-completeness">Documentation</Link>
              <Link className="app-button app-button--secondary" to="/platform/pilot-customer-readiness">Pilot readiness</Link>
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-go-no-go-register">Launch go/no-go</Link>
            </div>
          </div>
        </div>
      </section>

      {packet.isLoading ? <section className="app-panel app-panel--padded">Loading Commercial Launch Acceptance Packet…</section> : null}

      {initialLoadError ? (
        <section className="app-error-state platform-launch-acceptance__feedback" role="alert">
          <strong>Unable to load Commercial Launch Acceptance Packet.</strong>
          <span>{requestError}</span>
          <button
            type="button"
            className="app-button app-button--danger platform-launch-acceptance__retry"
            onClick={() => void packet.refetch()}
            disabled={packet.isFetching}
          >
            {packet.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-panel app-panel--padded platform-launch-acceptance__feedback platform-launch-acceptance__feedback--warning" role="status">
          <strong>Refresh failed.</strong>
          <span>Showing the last successful Commercial Launch Acceptance Packet snapshot. {requestError}</span>
          <button
            type="button"
            className="app-button app-button--secondary platform-launch-acceptance__retry"
            onClick={() => void packet.refetch()}
            disabled={packet.isFetching}
          >
            {packet.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Commercial launch acceptance summary">
            {summaryItems.map((item) => (
              <OperationalWorkspaceStatCard
                key={item.key}
                label={item.label}
                value={summary[item.key] ?? 0}
                helper={item.helper}
                tone={item.tone}
              />
            ))}
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-launch-acceptance__context-panel">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-acceptance-packet"
              title="Current certificate context"
              description="Snapshot identity, tenant evidence scope, certificate posture and signoff persistence boundary inherited from the current Launch Certificate."
            />
            <div className="platform-launch-acceptance__context-grid">
              <div><strong>Phase</strong><span>{data.phase}</span></div>
              <div><strong>Step</strong><span>{data.step}</span></div>
              <div><strong>Generated</strong><span>{formatDateTime(data.generated_at)}</span></div>
              <div><strong>Certificate posture</strong><span>{displayStatus(data.certificate_posture)}</span></div>
              <div><strong>Launch readiness registry</strong><span>{displayStatus(data.launch_readiness_posture)}</span></div>
              <div><strong>Tenant population</strong><span>{data.tenant_scope?.total_tenants ?? 'Unavailable'}</span></div>
              <div><strong>Tenant review cap</strong><span>{data.tenant_scope?.review_limit ?? 'Not available'}</span></div>
              <div><strong>Signoff storage</strong><span>{data.acceptance_persistence.stored_in_application ? 'Stored in application' : 'External only'}</span></div>
            </div>
            <div className="platform-launch-acceptance__persistence-note">
              <strong>Signatures and external approval tickets are not stored or observable</strong>
              <span>{data.acceptance_persistence.interpretation}</span>
            </div>
            {data.certificate_registry_note ? (
              <div className="platform-launch-acceptance__registry-note">
                <strong>Static registry gate is context only</strong>
                <span>{data.certificate_registry_note}</span>
              </div>
            ) : null}
            {data.certificate_validation_note ? (
              <details className="platform-launch-acceptance__details">
                <summary>Launch Certificate validation note</summary>
                <p>{data.certificate_validation_note}</p>
              </details>
            ) : null}
            <details className="platform-launch-acceptance__details">
              <summary>Detailed acceptance counters</summary>
              <div className="platform-launch-acceptance__summary-grid">
                {detailedSummary.map(([key, value]) => (
                  <div key={key}>
                    <span>{displaySummaryKey(key)}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </details>
          </section>

          <section className="platform-launch-acceptance__packets-section">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-acceptance-packet"
              title="Owner acceptance packets"
              description="Each packet shows the current certificate evidence, upstream source posture and scope, source evidence summary, required external acceptance statement and fields."
            />
            {data.acceptance_packets.length === 0 ? (
              <section className="app-panel app-panel--padded platform-launch-acceptance__empty-state">
                <strong>No acceptance packets are available.</strong>
                <span>Return to Launch Certificate and verify that the certificate controls were generated before requesting owner signoff.</span>
              </section>
            ) : (
              <div className="platform-launch-acceptance__packet-grid">
                {data.acceptance_packets.map((item) => {
                  const sourceSummary = Object.entries(item.source_summary || {});
                  return (
                    <article key={item.code} className="app-panel platform-launch-acceptance__packet-card">
                      <div className="platform-launch-acceptance__packet-heading">
                        <div>
                          <h3>{humanize(item.source_control)}</h3>
                          <span>{humanize(item.domain)} · owner: {humanize(item.acceptance_owner)}</span>
                        </div>
                        <span className="platform-launch-acceptance__status-badge" data-tone={badgeTone(item.packet_status)}>
                          {displayStatus(item.packet_status)}
                        </span>
                      </div>

                      <div className="platform-launch-acceptance__packet-meta-grid">
                        <div>
                          <span>Current certificate evidence</span>
                          <strong data-tone={badgeTone(item.evidence_status)}>{displayStatus(item.evidence_status)}</strong>
                        </div>
                        <div>
                          <span>Current upstream posture</span>
                          <strong data-tone={badgeTone(item.source_posture)}>{displayStatus(item.source_posture)}</strong>
                        </div>
                        <div>
                          <span>Source availability</span>
                          <strong data-tone={item.source_available ? 'good' : 'danger'}>{item.source_available ? 'Available' : 'Unavailable'}</strong>
                        </div>
                        <div>
                          <span>Static registry gate</span>
                          <strong data-tone="neutral">{displayStatus(item.launch_gate)} · Context only</strong>
                        </div>
                      </div>

                      {item.evidence_scope ? (
                        <div className="platform-launch-acceptance__scope-box">
                          <div>
                            <span>Evidence scope</span>
                            <strong data-tone={badgeTone(item.evidence_scope.status)}>{displayStatus(item.evidence_scope.status)}</strong>
                          </div>
                          <span>
                            Evaluated {item.evidence_scope.evaluated_tenants}
                            {item.evidence_scope.total_tenants !== null ? ` of ${item.evidence_scope.total_tenants}` : ''}
                            {item.evidence_scope.review_limit ? ` · cap ${item.evidence_scope.review_limit}` : ''}
                          </span>
                        </div>
                      ) : (
                        <div className="platform-launch-acceptance__scope-box">
                          <div><span>Evidence scope</span><strong data-tone="neutral">Not scope-limited</strong></div>
                        </div>
                      )}

                      {item.source_error_code ? (
                        <div className="platform-launch-acceptance__source-warning" role="status">
                          <strong>Evidence source error</strong>
                          <span>{humanize(item.source_error_code)}</span>
                        </div>
                      ) : null}

                      {sourceSummary.length > 0 ? (
                        <details className="platform-launch-acceptance__details platform-launch-acceptance__details--packet">
                          <summary>Current source evidence summary</summary>
                          <div className="platform-launch-acceptance__source-summary-grid">
                            {sourceSummary.map(([key, value]) => (
                              <div key={key}>
                                <span>{humanize(key)}</span>
                                <strong>{formatEvidenceValue(value)}</strong>
                              </div>
                            ))}
                          </div>
                        </details>
                      ) : null}

                      {item.source_validation_note ? (
                        <details className="platform-launch-acceptance__details platform-launch-acceptance__details--packet">
                          <summary>Source validation note</summary>
                          <p>{item.source_validation_note}</p>
                        </details>
                      ) : null}

                      <div className="platform-launch-acceptance__evidence-path">
                        <span>Required evidence endpoint</span>
                        <code>{item.required_evidence}</code>
                        {item.acceptance_rule ? <p>{item.acceptance_rule}</p> : null}
                      </div>

                      <div className="platform-launch-acceptance__packet-actions">
                        <Link className="app-button app-button--secondary" to={getPacketReviewLink(item)}>
                          {getPacketReviewLabel(item)}
                        </Link>
                      </div>

                      <div className="platform-launch-acceptance__artifact-box">
                        <span>External acceptance artifact</span>
                        <strong>{item.acceptance_artifact}</strong>
                        <p>{item.required_statement}</p>
                        <small>Storage: {displayStatus(item.acceptance_artifact_storage)}</small>
                      </div>

                      <div className="platform-launch-acceptance__fields-box">
                        <span>Required acceptance fields</span>
                        <div className="platform-launch-acceptance__chips">
                          {item.required_acceptance_fields.map((field) => (
                            <span key={field} className="platform-launch-acceptance__chip">{humanize(field)}</span>
                          ))}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="platform-launch-acceptance__decision-grid">
            <div className="app-panel app-panel--padded platform-launch-acceptance__decision-panel">
              <OperationalSectionHeader
                iconPath="/platform/commercial-launch-acceptance-packet"
                title="Required packet controls"
                description="Rules that must remain true before these packets can support the final manual launch decision."
              />
              <ul className="platform-launch-acceptance__list">
                {data.required_packet_controls.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div className="app-panel app-panel--padded platform-launch-acceptance__decision-panel">
              <OperationalSectionHeader
                iconPath="/platform/commercial-launch-acceptance-packet"
                title="Launch limitations carried forward"
                description="Limitations inherited from Launch Certificate that owner signoff must explicitly understand rather than silently erase."
              />
              <ul className="platform-launch-acceptance__list">
                {data.launch_limitations.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-launch-acceptance__next-step">
            <strong>Next best step</strong>
            <span>{data.next_best_step}</span>
          </section>

          <details className="app-panel app-panel--padded platform-launch-acceptance__details platform-launch-acceptance__details--validation">
            <summary>Acceptance packet validation note</summary>
            <p>{data.validation_note}</p>
          </details>
        </>
      ) : null}
    </div>
  );
}
