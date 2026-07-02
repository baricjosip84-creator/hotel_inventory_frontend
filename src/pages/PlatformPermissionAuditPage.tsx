import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { platformApiRequest } from "../lib/platformApi";

type PermissionAuditUser = {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  is_active: boolean;
  mfa_enabled: boolean;
  active_sessions: number;
  open_support_sessions: number;
  permission_count: number;
  write_permission_count: number;
  risk_flags: string[];
  review_required: boolean;
};

type PermissionAuditApiKey = {
  id: string;
  tenant_name?: string | null;
  name: string;
  scope_count: number;
  allowed_ip_count: number;
  expires_at?: string | null;
  last_used_at?: string | null;
  risk_flags: string[];
  review_required: boolean;
};

type PermissionAuditHardening = {
  feature: string;
  phase: number;
  step: number;
  posture: string;
  summary: {
    total_platform_users: number;
    privileged_platform_users: number;
    users_without_mfa: number;
    users_requiring_review: number;
    active_platform_sessions: number;
    active_support_access_users: number;
    active_api_keys: number;
    api_keys_requiring_review: number;
    api_keys_without_expiration: number;
    api_keys_without_ip_allowlist: number;
    overdue_access_reviews: number;
    pending_access_review_items: number;
  };
  governance_controls: {
    read_only: boolean;
    mutation_owner: string;
    source_routes: string[];
    recommended_review_scopes: string[];
  };
  platform_users: PermissionAuditUser[];
  api_keys: PermissionAuditApiKey[];
};

function badgeStyle(value: string): CSSProperties {
  if (value.includes("attention"))
    return { ...styles.badge, background: "#fee2e2", color: "#991b1b" };
  if (value.includes("review"))
    return { ...styles.badge, background: "#fef3c7", color: "#92400e" };
  return { ...styles.badge, background: "#dcfce7", color: "#166534" };
}

function formatDateTime(value?: string | null) {
  if (!value) return "never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "invalid date";
  return date.toLocaleString();
}

function boolLabel(value: boolean) {
  return value ? "yes" : "no";
}

function FlagList({ flags }: { flags: string[] }) {
  if (!flags.length) return <span style={styles.help}>No flags</span>;
  return (
    <div style={styles.flags}>
      {flags.map((flag) => (
        <span key={flag} style={styles.flag}>
          {flag}
        </span>
      ))}
    </div>
  );
}

export default function PlatformPermissionAuditPage() {
  const audit = useQuery({
    queryKey: ["platform", "permission-audit", "hardening"],
    queryFn: () =>
      platformApiRequest<PermissionAuditHardening>(
        "/platform/permission-audit/hardening",
      ),
  });

  const data = audit.data;
  const summary = data?.summary;
  const users = data?.platform_users || [];
  const apiKeys = data?.api_keys || [];
  const reviewedUsers = users.filter((user) => user.review_required).length;
  const reviewedKeys = apiKeys.filter((key) => key.review_required).length;
  const sourceRoutes = data?.governance_controls.source_routes || [];

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Permission audit hardening</h1>
          <p style={styles.subtitle}>
            Enterprise access posture across platform users, sessions, support
            access, API keys, and access reviews.
          </p>
          <div style={styles.headerActions}>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => audit.refetch()}
              disabled={audit.isFetching}
            >
              {audit.isFetching ? "Refreshing…" : "Refresh"}
            </button>
            <Link style={styles.linkButton} to="/platform/access-reviews">
              Access reviews
            </Link>
            <Link style={styles.linkButton} to="/platform/api-keys">
              API keys
            </Link>
            <Link style={styles.linkButton} to="/platform/sessions">
              Platform sessions
            </Link>
            <Link style={styles.linkButton} to="/platform/support-sessions">
              Support sessions
            </Link>
          </div>
        </div>
        {data ? (
          <span style={badgeStyle(data.posture)}>{data.posture}</span>
        ) : null}
      </header>

      {audit.isLoading ? (
        <section style={styles.card}>Loading permission audit posture…</section>
      ) : null}
      {audit.error ? (
        <section style={styles.errorCard}>
          <strong>Unable to load permission audit posture.</strong>
          <p style={styles.subtitle}>
            Check platform access review read permission and backend
            availability, then retry the current snapshot.
          </p>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => audit.refetch()}
            disabled={audit.isFetching}
          >
            Retry
          </button>
        </section>
      ) : null}

      {data ? (
        <section style={styles.metaGrid}>
          <div style={styles.metaItem}>
            <strong>Snapshot</strong>
            <span>
              {data.feature} · phase {data.phase} · step {data.step}
            </span>
          </div>
          <div style={styles.metaItem}>
            <strong>Source</strong>
            <span>/platform/permission-audit/hardening</span>
          </div>
          <div style={styles.metaItem}>
            <strong>Generated view</strong>
            <span>
              {users.length} platform users · {apiKeys.length} active API keys
            </span>
          </div>
          <div style={styles.metaItem}>
            <strong>Review scope</strong>
            <span>
              {data.governance_controls.recommended_review_scopes.join(", ")}
            </span>
          </div>
        </section>
      ) : null}

      {summary ? (
        <section style={styles.summaryGrid}>
          <div style={styles.card}>
            <strong>Platform users</strong>
            <div style={styles.metric}>{summary.total_platform_users}</div>
          </div>
          <div style={styles.card}>
            <strong>Privileged users</strong>
            <div style={styles.metric}>{summary.privileged_platform_users}</div>
          </div>
          <div style={styles.card}>
            <strong>Users without MFA</strong>
            <div style={styles.metric}>{summary.users_without_mfa}</div>
          </div>
          <div style={styles.card}>
            <strong>Users requiring review</strong>
            <div style={styles.metric}>{summary.users_requiring_review}</div>
          </div>
          <div style={styles.card}>
            <strong>Active sessions</strong>
            <div style={styles.metric}>{summary.active_platform_sessions}</div>
          </div>
          <div style={styles.card}>
            <strong>Active support access</strong>
            <div style={styles.metric}>
              {summary.active_support_access_users}
            </div>
          </div>
          <div style={styles.card}>
            <strong>API keys requiring review</strong>
            <div style={styles.metric}>{summary.api_keys_requiring_review}</div>
          </div>
          <div style={styles.card}>
            <strong>Overdue reviews</strong>
            <div style={styles.metric}>{summary.overdue_access_reviews}</div>
          </div>
          <div style={styles.card}>
            <strong>Pending review items</strong>
            <div style={styles.metric}>
              {summary.pending_access_review_items}
            </div>
          </div>
          <div style={styles.card}>
            <strong>API keys without expiration</strong>
            <div style={styles.metric}>
              {summary.api_keys_without_expiration}
            </div>
          </div>
          <div style={styles.card}>
            <strong>API keys without allowlist</strong>
            <div style={styles.metric}>
              {summary.api_keys_without_ip_allowlist}
            </div>
          </div>
          <div style={styles.card}>
            <strong>Active API keys</strong>
            <div style={styles.metric}>{summary.active_api_keys}</div>
          </div>
        </section>
      ) : null}

      {data ? (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Governance controls</h2>
          <p style={styles.subtitle}>
            Read-only: {boolLabel(data.governance_controls.read_only)} ·
            Mutation owner: {data.governance_controls.mutation_owner}
          </p>
          <div style={styles.flags}>
            {sourceRoutes.map((route) => (
              <span key={route} style={styles.flag}>
                {route}
              </span>
            ))}
          </div>
          <div style={styles.supportLinks}>
            <Link to="/platform/access-reviews">Open Access Reviews</Link>
            <Link to="/platform/api-keys">Open API Keys</Link>
            <Link to="/platform/security/admin">Open Security Admin</Link>
            <Link to="/platform/sessions">Open Platform Sessions</Link>
            <Link to="/platform/support-sessions">Open Support Sessions</Link>
          </div>
        </section>
      ) : null}

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Platform user permission posture</h2>
        <p style={styles.subtitle}>
          {reviewedUsers} of {users.length} platform users require review in the
          current snapshot.
        </p>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Permissions</th>
                <th style={styles.th}>Sessions</th>
                <th style={styles.th}>Evidence</th>
                <th style={styles.th}>Flags</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td style={styles.td}>
                    <strong>{user.email}</strong>
                    <br />
                    <span style={styles.help}>
                      {user.name || "No name"} · MFA{" "}
                      {user.mfa_enabled ? "on" : "off"}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {user.role}
                    <br />
                    <span style={styles.help}>
                      {user.is_active ? "active" : "inactive"} · review{" "}
                      {user.review_required ? "required" : "not required"}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {user.permission_count} total
                    <br />
                    <span style={styles.help}>
                      {user.write_permission_count} write/action
                    </span>
                  </td>
                  <td style={styles.td}>
                    {user.active_sessions} active
                    <br />
                    <span style={styles.help}>
                      {user.open_support_sessions} support
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.evidenceLinks}>
                      <Link to="/platform/sessions">Sessions</Link>
                      <Link to="/platform/support-sessions">Support</Link>
                      <Link to="/platform/access-reviews">Access review</Link>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <FlagList flags={user.risk_flags} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>API key permission posture</h2>
        <p style={styles.subtitle}>
          {reviewedKeys} of {apiKeys.length} active API keys require review in
          the current snapshot.
        </p>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Key</th>
                <th style={styles.th}>Tenant</th>
                <th style={styles.th}>Scope / allowlist</th>
                <th style={styles.th}>Lifecycle</th>
                <th style={styles.th}>Evidence</th>
                <th style={styles.th}>Flags</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((key) => (
                <tr key={key.id}>
                  <td style={styles.td}>
                    <strong>{key.name}</strong>
                    <br />
                    <span style={styles.help}>
                      review {key.review_required ? "required" : "not required"}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {key.tenant_name || "Platform/global"}
                  </td>
                  <td style={styles.td}>
                    {key.scope_count} scopes
                    <br />
                    <span style={styles.help}>
                      {key.allowed_ip_count} allowed IPs
                    </span>
                  </td>
                  <td style={styles.td}>
                    Expires: {formatDateTime(key.expires_at)}
                    <br />
                    <span style={styles.help}>
                      Last used: {formatDateTime(key.last_used_at)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.evidenceLinks}>
                      <Link to="/platform/api-keys">API Keys</Link>
                      <Link to="/platform/api-client-governance">
                        Governance
                      </Link>
                      <Link to="/platform/access-reviews">Access review</Link>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <FlagList flags={key.risk_flags} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: 20 },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  headerActions: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 },
  title: { margin: 0, fontSize: 28 },
  subtitle: { margin: "6px 0 0", color: "#64748b" },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  },
  metaItem: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    color: "#334155",
  },
  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 16,
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
  },
  errorCard: {
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: 14,
    padding: 16,
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
  },
  cardTitle: { margin: "0 0 12px", fontSize: 18 },
  metric: { fontSize: 28, fontWeight: 700, marginTop: 8 },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: "10px 8px",
    borderBottom: "1px solid #e2e8f0",
    fontSize: 12,
    textTransform: "uppercase",
    color: "#64748b",
  },
  td: {
    padding: "12px 8px",
    borderBottom: "1px solid #f1f5f9",
    verticalAlign: "top",
  },
  badge: {
    display: "inline-flex",
    borderRadius: 999,
    padding: "5px 10px",
    fontSize: 12,
    fontWeight: 700,
  },
  flags: { display: "flex", flexWrap: "wrap", gap: 6 },
  flag: {
    background: "#eef2ff",
    color: "#3730a3",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 12,
  },
  help: { color: "#64748b", fontSize: 12 },
  secondaryButton: {
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#0f172a",
    borderRadius: 10,
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: 700,
  },
  linkButton: {
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#1d4ed8",
    borderRadius: 10,
    padding: "8px 12px",
    textDecoration: "none",
    fontWeight: 700,
  },
  supportLinks: { display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 },
  evidenceLinks: { display: "flex", flexDirection: "column", gap: 4 },
};
