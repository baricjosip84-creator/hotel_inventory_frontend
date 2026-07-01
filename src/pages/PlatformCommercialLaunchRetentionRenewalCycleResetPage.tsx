import { useMemo, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { platformApiRequest } from "../lib/platformApi";

type RetentionRenewalCycleResetRow = {
  code: string;
  source_retention_renewal_archive_seal_code: string;
  source_retention_renewal_final_seal_code: string;
  source_retention_renewal_certification_code: string;
  source_retention_renewal_acceptance_code: string;
  source_retention_renewal_review_code: string;
  source_evidence_retention_seal_code?: string;
  source_final_evidence_archive_code?: string;
  source_durable_closure_certification_code?: string;
  source_resolution_verification_code?: string;
  source_recurrence_resolution_code?: string;
  source_recurrence_audit_code?: string;
  source_closure_code?: string;
  source_exception_code?: string;
  domain: string;
  owner: string;
  severity_hint: string;
  source_retention_renewal_archive_seal_status: string;
  required_retention_renewal_archive_seal?: string[];
  required_retention_renewal_cycle_reset: string[];
  retention_renewal_cycle_reset_controls: string[];
  retention_renewal_cycle_reset_status: string;
  release_condition: string;
};

type RetentionRenewalCycleResetBoard = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  retention_renewal_cycle_reset_rows: RetentionRenewalCycleResetRow[];
  retention_renewal_archive_seal_posture: string;
  retention_renewal_final_seal_posture: string;
  retention_renewal_certification_posture: string;
  retention_renewal_acceptance_posture: string;
  retention_renewal_review_posture: string;
  evidence_retention_seal_posture: string;
  final_evidence_archive_posture: string;
  durable_closure_certification_posture: string;
  resolution_verification_posture: string;
  recurrence_resolution_posture: string;
  recurrence_audit_posture: string;
  exception_closure_posture: string;
  exception_review_posture: string;
  operations_cadence_posture: string;
  steady_state_transition_posture: string;
  retention_renewal_cycle_reset_rules: string[];
  retention_renewal_cycle_reset_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

type PageLink = { label: string; to: string };

const supportingLinks: PageLink[] = [
  { label: "Renewal Archive Seal", to: "/platform/commercial-launch-retention-renewal-archive-seal" },
  { label: "Renewal Final Seal", to: "/platform/commercial-launch-retention-renewal-final-seal" },
  { label: "Renewal Certification", to: "/platform/commercial-launch-retention-renewal-certification" },
  { label: "Renewal Acceptance", to: "/platform/commercial-launch-retention-renewal-acceptance-docket" },
  { label: "Retention Renewal", to: "/platform/commercial-launch-retention-renewal-review" },
  { label: "Evidence Retention Seal", to: "/platform/commercial-launch-evidence-retention-seal" },
  { label: "Final Evidence Archive", to: "/platform/commercial-launch-final-evidence-archive" },
  { label: "Durable Closure", to: "/platform/commercial-launch-durable-closure-certification" },
  { label: "Resolution Verification", to: "/platform/commercial-launch-steady-state-resolution-verification" },
  { label: "Recurrence Resolution", to: "/platform/commercial-launch-steady-state-recurrence-resolution" },
  { label: "Recurrence Audit", to: "/platform/commercial-launch-steady-state-recurrence-audit" },
  { label: "Exception Closure", to: "/platform/commercial-launch-steady-state-exception-closure" },
  { label: "Exception Review", to: "/platform/commercial-launch-steady-state-exception-review" },
  { label: "Operations Cadence", to: "/platform/commercial-launch-steady-state-operations-cadence" },
  { label: "Steady-State Transition", to: "/platform/commercial-launch-steady-state-transition" },
  { label: "Runbooks", to: "/platform/runbooks" },
  { label: "Support Cockpit", to: "/platform/support-cockpit" },
  { label: "Billing", to: "/platform/billing" },
  { label: "Customer Success", to: "/platform/customer-success" },
];

const sourcePostureLinks: PageLink[] = [
  { label: "Retention renewal archive seal", to: "/platform/commercial-launch-retention-renewal-archive-seal" },
  { label: "Retention renewal final seal", to: "/platform/commercial-launch-retention-renewal-final-seal" },
  { label: "Retention renewal certification", to: "/platform/commercial-launch-retention-renewal-certification" },
  { label: "Retention renewal acceptance", to: "/platform/commercial-launch-retention-renewal-acceptance-docket" },
  { label: "Retention renewal review", to: "/platform/commercial-launch-retention-renewal-review" },
  { label: "Evidence retention seal", to: "/platform/commercial-launch-evidence-retention-seal" },
  { label: "Final evidence archive", to: "/platform/commercial-launch-final-evidence-archive" },
  { label: "Durable closure", to: "/platform/commercial-launch-durable-closure-certification" },
  { label: "Resolution verification", to: "/platform/commercial-launch-steady-state-resolution-verification" },
  { label: "Recurrence resolution", to: "/platform/commercial-launch-steady-state-recurrence-resolution" },
  { label: "Recurrence audit", to: "/platform/commercial-launch-steady-state-recurrence-audit" },
  { label: "Exception closure", to: "/platform/commercial-launch-steady-state-exception-closure" },
  { label: "Exception review", to: "/platform/commercial-launch-steady-state-exception-review" },
  { label: "Operations cadence", to: "/platform/commercial-launch-steady-state-operations-cadence" },
  { label: "Steady-state transition", to: "/platform/commercial-launch-steady-state-transition" },
];

function evidenceLinksForRow(row: RetentionRenewalCycleResetRow): PageLink[] {
  const links: PageLink[] = [...sourcePostureLinks];
  if (row.domain.includes("missed_cadence")) links.push({ label: "Operations Cadence", to: "/platform/commercial-launch-steady-state-operations-cadence" }, { label: "Monitoring Readiness", to: "/platform/monitoring-readiness" });
  if (row.domain.includes("health_regression")) links.push({ label: "System Health", to: "/platform/system-health" }, { label: "Dependencies", to: "/platform/dependencies" }, { label: "Deployment Validation", to: "/platform/deployment-validation" });
  if (row.domain.includes("customer_adoption")) links.push({ label: "Customer Success", to: "/platform/customer-success" }, { label: "Announcements", to: "/platform/announcements" });
  if (row.domain.includes("support_sla")) links.push({ label: "Support Cockpit", to: "/platform/support-cockpit" }, { label: "Incidents", to: "/platform/incidents" });
  if (row.domain.includes("billing_entitlement")) links.push({ label: "Billing", to: "/platform/billing" }, { label: "Tenants", to: "/platform/tenants" });
  if (row.domain.includes("backup_restore")) links.push({ label: "Backup Restore", to: "/platform/backup-restore-validation" }, { label: "Tenant Exports", to: "/platform/tenant-exports" }, { label: "Runbooks", to: "/platform/runbooks" });
  if (row.domain.includes("deployment_smoke_test")) links.push({ label: "Smoke Test", to: "/platform/commercial-launch-smoke-test-checklist" }, { label: "Releases", to: "/platform/releases" });
  if (row.domain.includes("incident_prevention")) links.push({ label: "Incident Closure", to: "/platform/commercial-launch-incident-closure" }, { label: "Prevention Verification", to: "/platform/commercial-launch-prevention-verification" }, { label: "Runbooks", to: "/platform/runbooks" });
  if (row.domain.includes("growth_governance")) links.push({ label: "Growth Observation", to: "/platform/commercial-launch-additional-growth-observation" }, { label: "Additional Growth Authorization", to: "/platform/commercial-launch-additional-growth-authorization" }, { label: "Expansion Health", to: "/platform/commercial-launch-expansion-health-observation" });
  return links;
}

function renderLinks(links: PageLink[]) {
  return <div style={styles.linkList}>{links.map((link) => <a key={`${link.label}-${link.to}`} href={link.to} style={styles.link}>{link.label}</a>)}</div>;
}

function humanize(value?: string) {
  return String(value || "not available").replaceAll("_", " ");
}

function badgeStyle(value: string): CSSProperties {
  if (value.includes("critical") || value.includes("blocked") || value.includes("rollback") || value.includes("hold")) return { ...styles.badge, background: "#fee2e2", color: "#991b1b" };
  if (value.includes("high") || value.includes("waiting") || value.includes("manual") || value.includes("reset") || value.includes("renewal") || value.includes("archive") || value.includes("seal")) return { ...styles.badge, background: "#fef3c7", color: "#92400e" };
  return { ...styles.badge, background: "#dcfce7", color: "#166534" };
}

export default function PlatformCommercialLaunchRetentionRenewalCycleResetPage() {
  const cycleResetBoard = useQuery({
    queryKey: ["platform", "commercial-launch-retention-renewal-cycle-reset"],
    queryFn: () => platformApiRequest<RetentionRenewalCycleResetBoard>("/platform/commercial-launch-retention-renewal-cycle-reset"),
  });

  const data = cycleResetBoard.data;
  const summary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);

  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Platform Commercial Launch Readiness</p>
          <h1 style={styles.title}>Commercial Launch Retention Renewal Cycle Reset Board</h1>
          <p style={styles.description}>
            Step 245 turns retention renewal archive seal rows into a read-only next-cycle reset board. It requires archive seal locators,
            next-cycle owner assignments, cadence references, renewal scope confirmation, and owner acceptance before the renewed governance
            cycle is treated as ready for the next review window.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={badgeStyle(data?.posture || "loading")}>{humanize(data?.posture || "loading")}</span>
          <span style={styles.generated}>{data?.generated_at ? new Date(data.generated_at).toLocaleString() : "Not generated yet"}</span>
          <button type="button" style={styles.button} onClick={() => cycleResetBoard.refetch()} disabled={cycleResetBoard.isFetching}>
            {cycleResetBoard.isFetching ? "Refreshing..." : cycleResetBoard.error ? "Retry" : "Refresh"}
          </button>
        </div>
      </section>

      {cycleResetBoard.isLoading ? <div style={styles.card}>Loading commercial launch retention renewal cycle reset board...</div> : null}
      {cycleResetBoard.error ? <div style={styles.error}>Failed to load commercial launch retention renewal cycle reset board.</div> : null}

      {data ? (
        <>
          <section style={styles.grid}>{summary.map(([key, value]) => <article key={key} style={styles.metricCard}><span style={styles.metricLabel}>{humanize(key)}</span><strong style={styles.metricValue}>{value}</strong></article>)}</section>

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
            <h2 style={styles.sectionTitle}>Cycle reset dependency chain</h2>
            <div style={styles.chainGrid}>
              {sourcePostureLinks.map((link, index) => {
                const postures = [data.retention_renewal_archive_seal_posture, data.retention_renewal_final_seal_posture, data.retention_renewal_certification_posture, data.retention_renewal_acceptance_posture, data.retention_renewal_review_posture, data.evidence_retention_seal_posture, data.final_evidence_archive_posture, data.durable_closure_certification_posture, data.resolution_verification_posture, data.recurrence_resolution_posture, data.recurrence_audit_posture, data.exception_closure_posture, data.exception_review_posture, data.operations_cadence_posture, data.steady_state_transition_posture];
                return <span key={link.label}><a href={link.to} style={styles.link}>{link.label}</a>: <strong>{humanize(postures[index])}</strong></span>;
              })}
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Retention renewal cycle reset rows</h2>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead><tr><th style={styles.th}>Code</th><th style={styles.th}>Domain</th><th style={styles.th}>Owner</th><th style={styles.th}>Severity</th><th style={styles.th}>Cycle reset status</th><th style={styles.th}>Required reset evidence</th><th style={styles.th}>Controls</th><th style={styles.th}>Evidence links</th></tr></thead>
                <tbody>{data.retention_renewal_cycle_reset_rows.map((row) => (
                  <tr key={row.code}>
                    <td style={styles.td}>
                      <strong>{humanize(row.code)}</strong><br />
                      <span style={styles.small}>Archive seal: {humanize(row.source_retention_renewal_archive_seal_code)}</span><br />
                      <span style={styles.small}>Final seal: {humanize(row.source_retention_renewal_final_seal_code)}</span><br />
                      <span style={styles.small}>Certification: {humanize(row.source_retention_renewal_certification_code)}</span><br />
                      <span style={styles.small}>Acceptance: {humanize(row.source_retention_renewal_acceptance_code)}</span><br />
                      <span style={styles.small}>Review: {humanize(row.source_retention_renewal_review_code)}</span>
                    </td>
                    <td style={styles.td}>{humanize(row.domain)}</td>
                    <td style={styles.td}>{humanize(row.owner)}</td>
                    <td style={styles.td}><span style={badgeStyle(row.severity_hint)}>{humanize(row.severity_hint)}</span></td>
                    <td style={styles.td}><span style={badgeStyle(row.retention_renewal_cycle_reset_status)}>{humanize(row.retention_renewal_cycle_reset_status)}</span></td>
                    <td style={styles.td}>{row.required_retention_renewal_cycle_reset.join(", ")}</td>
                    <td style={styles.td}><ul style={styles.list}>{row.retention_renewal_cycle_reset_controls.map((control) => <li key={control}>{control}</li>)}</ul></td>
                    <td style={styles.td}>{renderLinks(evidenceLinksForRow(row))}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Rules and limitations</h2>
            <div style={styles.twoColumns}>
              <div><h3 style={styles.subTitle}>Rules</h3><ul style={styles.list}>{data.retention_renewal_cycle_reset_rules.map((rule) => <li key={rule}>{rule}</li>)}</ul></div>
              <div><h3 style={styles.subTitle}>Limitations</h3><ul style={styles.list}>{data.retention_renewal_cycle_reset_limitations.map((rule) => <li key={rule}>{rule}</li>)}</ul></div>
            </div>
            <p style={styles.note}><strong>Next best step:</strong> {data.next_best_step}</p>
            <p style={styles.note}>{data.validation_note}</p>
          </section>
        </>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: 24 },
  header: { display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-start" },
  eyebrow: { margin: 0, color: "#64748b", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 },
  title: { margin: "8px 0", fontSize: 32, lineHeight: 1.1 },
  description: { margin: 0, maxWidth: 900, color: "#475569", lineHeight: 1.6 },
  headerMeta: { display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" },
  generated: { color: "#64748b", fontSize: 12 },
  button: { border: "1px solid #cbd5e1", borderRadius: 12, background: "#ffffff", color: "#0f172a", cursor: "pointer", fontWeight: 700, padding: "8px 12px" },
  badge: { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 700, textTransform: "capitalize" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 },
  metricCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 18 },
  metricLabel: { display: "block", color: "#64748b", fontSize: 12, textTransform: "capitalize" },
  metricValue: { display: "block", marginTop: 6, fontSize: 28 },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, padding: 20 },
  error: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 14, padding: 16 },
  sectionTitle: { marginTop: 0, fontSize: 20 },
  subTitle: { marginTop: 0, fontSize: 16 },
  chainGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10, color: "#475569" },
  metaGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10, color: "#475569" },
  supportingLinks: { marginTop: 14 },
  linkList: { display: "flex", flexWrap: "wrap", gap: 8 },
  link: { color: "#2563eb", fontWeight: 700, textDecoration: "none" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", borderBottom: "1px solid #e2e8f0", padding: "10px 8px", color: "#475569", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  td: { verticalAlign: "top", borderBottom: "1px solid #f1f5f9", padding: "12px 8px", color: "#334155" },
  small: { color: "#64748b", fontSize: 12 },
  list: { margin: 0, paddingLeft: 18 },
  twoColumns: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 },
  note: { color: "#475569", lineHeight: 1.6 },
};
