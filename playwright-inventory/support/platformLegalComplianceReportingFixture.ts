/** Batch 74: isolated, synthetic frontend fixture for legal/compliance reporting.
 * This is NOT legal certification, a live identity/permission check, database validation,
 * or verification that external agreements, controls, or notifications actually exist. */
import { expect, type Page, type Route } from '@playwright/test';
import { targetBaseURL } from './environment';
import { fulfillJson } from './tenantSession';
import { syntheticJwt, SYNTHETIC_PLATFORM_USER_ID } from './platformSession';

export const legalPermissions = [
  'platform.dashboard.read', 'platform.compliance.read', 'platform.privacy.read',
  'platform.access_reviews.read', 'platform.risks.read', 'platform.vendors.read',
  'platform.tenants.read', 'platform.users.read', 'platform.dependencies.read'
];
export const legalSources = [
  'legal_documents', 'privacy_requests', 'access_reviews', 'risk_register', 'vendors'
] as const;
export type LegalSource = typeof legalSources[number];
const sourcePermission: Record<LegalSource, string> = {
  legal_documents: 'platform.compliance.read', privacy_requests: 'platform.privacy.read',
  access_reviews: 'platform.access_reviews.read', risk_register: 'platform.risks.read',
  vendors: 'platform.vendors.read'
};
const typeSource: Record<string, LegalSource> = {
  legal_document: 'legal_documents', privacy_request: 'privacy_requests',
  access_review: 'access_reviews', compliance_risk: 'risk_register', vendor_legal: 'vendors'
};
export const legalTenant = '11111111-1111-4111-8111-111111111111';
export const legalDocument = {
  type: 'legal_document', id: 'doc-1', title: 'Fixture Data Processing Agreement',
  tenant_id: legalTenant, tenant_name: 'Fixture Hotel', tenant_present: true, status: 'active',
  owner_email: 'confidential-owner@fixture.test', owner_present: true,
  reviewed_at: '2026-10-01T12:00:00Z', expires_at: '2026-12-01T12:00:00Z',
  external_url_present: true, risk_flags: ['legal_document_expiring_soon'], report_state: 'legal_review_required'
};
export const legalHistorical = {
  ...legalDocument, id: 'doc-archived', title: 'Fixture Archived Agreement', status: 'archived',
  historical: true, external_url_present: false, reviewed_at: null, expires_at: null,
  risk_flags: [], report_state: 'historical'
};
export const legalPrivacy = {
  type: 'privacy_request', id: 'privacy-1', title: 'Fixture Privacy Request',
  tenant_id: legalTenant, tenant_name: 'Fixture Hotel', tenant_present: true,
  status: 'in_progress', request_type: 'access', priority: 'high',
  due_at: '2026-01-01T12:00:00Z', requester_email_present: true,
  assigned_owner_present: false, risk_flags: ['privacy_request_overdue'], report_state: 'legal_review_required'
};
export const legalReview = {
  type: 'access_review', id: 'review-1', title: 'Fixture Access Review', scope: 'platform',
  status: 'open', due_at: '2026-01-01T12:00:00Z', pending_items: 3,
  needs_change_items: 2, risk_flags: ['access_review_pending_items'], report_state: 'legal_review_required'
};
export const legalRisk = {
  type: 'compliance_risk', id: 'risk-1', title: 'Fixture High Risk',
  tenant_id: legalTenant, tenant_name: 'Fixture Hotel', tenant_present: true,
  status: 'monitoring', category: 'privacy', likelihood: 'high', impact: 'critical',
  severity_score: 12, owner_present: true, owner_email: 'risk-owner@fixture.test',
  review_due_at: '2026-01-01T12:00:00Z', risk_flags: ['high_compliance_risk'], report_state: 'legal_review_required'
};
export const legalVendor = {
  type: 'vendor_legal', id: 'vendor-1', name: 'Fixture Contract Vendor',
  tenant_id: null, tenant_name: null, tenant_present: false, status: 'active',
  category: 'software', risk_level: 'high', owner_present: false,
  contract_renewal_date: '2026-12-01T12:00:00Z', sla_reference_present: false,
  risk_flags: ['vendor_sla_reference_missing'], report_state: 'legal_review_required'
};
export type LegalItem = (typeof legalDocument | typeof legalHistorical | typeof legalPrivacy | typeof legalReview | typeof legalRisk | typeof legalVendor) & Record<string, any>;
export const legalRows: LegalItem[] = [legalDocument, legalHistorical, legalPrivacy, legalReview, legalRisk, legalVendor];
export function manyLegalDocuments(count: number): LegalItem[] {
  return Array.from({ length: count }, (_, i) => ({ ...legalDocument,
    id: `doc-${i + 1}`, title: `Fixture Document ${String(i + 1).padStart(3, '0')}` }));
}
export type LegalFixtureOpts = {
  query?: string; permissions?: string[]; rows?: LegalItem[];
  summary?: Record<string, any>; posture?: string; complete?: boolean;
  generatedAt?: string; correlations?: Record<string, any>;
  access?: Record<string, boolean>; responses?: Record<string, { status?: number; json: any }>;
  respond?: (method: string, path: string, query: URLSearchParams) => { status?: number; json: any } | undefined | Promise<{ status?: number; json: any } | undefined>;
  expectHeading?: boolean;
  onCall?: (method: string, path: string, query: URLSearchParams) => void;
};
export async function openLegalCompliance(page: Page, opts: LegalFixtureOpts = {}) {
  targetBaseURL();
  const permissions = opts.permissions ?? legalPermissions;
  const rows = opts.rows ?? legalRows;
  await page.addInitScript(token => {
    localStorage.setItem('inventory_platform_access_token', token);
    localStorage.setItem('inventory_locale', 'en-GB');
  }, syntheticJwt());
  await page.route('**/platform/**', async (route: Route) => {
    const req = route.request();
    if (req.isNavigationRequest()) return route.continue();
    const url = new URL(req.url()), path = url.pathname.replace(/^\/api(?=\/)/, '');
    const method = req.method(), query = url.searchParams;
    opts.onCall?.(method, path, query);
    if (path === '/platform/auth/refresh') return fulfillJson(route, { message: 'Synthetic refresh unavailable' }, 401);
    if (path === '/platform/auth/me') return fulfillJson(route, {
      id: SYNTHETIC_PLATFORM_USER_ID, email: 'legal-operator@fixture.test', role: 'superadmin', is_active: true
    });
    if (path === '/platform/permissions/me') return fulfillJson(route, {
      platform_user_id: SYNTHETIC_PLATFORM_USER_ID, role: 'superadmin', permissions
    });
    const response = (await opts.respond?.(method, path, query)) ?? opts.responses?.[`${method} ${path}`];
    if (response) return fulfillJson(route, response.json, response.status ?? 200);
    if (path === '/platform/legal-compliance-reporting/report' && method === 'GET') {
      const selected = (query.get('source') || 'all') as LegalSource;
      const access = Object.fromEntries(legalSources.map(source => [source, permissions.includes(sourcePermission[source])])) as Record<LegalSource, boolean>;
      const evidenceAccess = { ...access,
        tenant_identity: permissions.includes('platform.tenants.read'),
        platform_user_identity: permissions.includes('platform.users.read'),
        integration_monitoring: permissions.includes('platform.dependencies.read'), ...opts.access };
      if (selected !== 'all' && !evidenceAccess[selected]) return fulfillJson(route, { message: 'Synthetic source permission forbidden' }, 403);
      const available = legalSources.filter(source => evidenceAccess[source]);
      const omitted = legalSources.filter(source => !evidenceAccess[source]);
      const term = (query.get('search') ?? '').toLowerCase();
      const candidates = rows.filter(item => available.includes(typeSource[item.type]) && (selected === 'all' || typeSource[item.type] === selected));
      const filtered = candidates.filter(item => !term || [item.title, item.name, item.id, item.status, item.category]
        .filter(Boolean).join(' ').toLowerCase().includes(term));
      const limit = Number(query.get('limit') || 50), offset = Number(query.get('offset') || 0);
      const summary = { total_report_items: omitted.length ? null : rows.length,
        visible_report_items: rows.filter(item => available.includes(typeSource[item.type])).length,
        legal_documents: rows.filter(item => item.type === 'legal_document').length,
        privacy_requests: evidenceAccess.privacy_requests ? rows.filter(item => item.type === 'privacy_request').length : null,
        access_reviews: evidenceAccess.access_reviews ? rows.filter(item => item.type === 'access_review').length : null,
        compliance_risks: evidenceAccess.risk_register ? rows.filter(item => item.type === 'compliance_risk').length : null,
        vendors: evidenceAccess.vendors ? rows.filter(item => item.type === 'vendor_legal').length : null,
        items_requiring_review: omitted.length ? null : 5, visible_items_requiring_review: 5,
        expired_or_expiring_documents: 1, overdue_privacy_requests: evidenceAccess.privacy_requests ? 1 : null,
        overdue_access_reviews: evidenceAccess.access_reviews ? 1 : null,
        open_high_compliance_risks: evidenceAccess.risk_register ? 1 : null,
        vendors_requiring_legal_review: evidenceAccess.vendors ? 1 : null,
        tenants_with_legal_findings: evidenceAccess.tenant_identity ? 1 : null,
        ...(opts.summary ?? {}) };
      return fulfillJson(route, {
        feature: 'platform_legal_compliance_reporting', phase: 1, step: 1,
        generated_at: opts.generatedAt ?? '2026-11-04T09:00:00Z',
        requested_source: selected, posture: opts.posture ?? (omitted.length ? 'partial_evidence' : 'legal_compliance_review_required'),
        evidence_state: omitted.length ? 'partial_evidence' : 'complete',
        evidence_complete: opts.complete ?? omitted.length === 0,
        available_sources: available, omitted_sources: omitted, evidence_access: evidenceAccess,
        required_permissions_by_source: Object.fromEntries(legalSources.map(s => [s, [sourcePermission[s]]])),
        summary, source_summaries: {},
        pagination: { source: selected, limit, offset, total: filtered.length, has_more: offset + limit < filtered.length },
        correlated_postures: { compliance_export_package: 'package_review_required',
          integration_monitoring_surface: evidenceAccess.integration_monitoring ? 'integration_review_required' : null,
          ...opts.correlations },
        reporting_controls: { read_only: true, application_evidence_only: true, no_subject_data_export: true,
          no_secret_export: true, no_document_body_export: true, archived_documents_are_historical: true,
          inactive_or_archived_vendors_are_not_current_legal_blockers: true,
          source_records_do_not_prove_external_legal_validity_or_acceptance: true, ready_posture_is_application_evidence_only: true },
        evidence: filtered.slice(offset, offset + limit)
      });
    }
    // Never reach actual live platform endpoints in Phase 1 fixture.
    return fulfillJson(route, []);
  });
  await page.goto(`/platform/legal-compliance-reporting${opts.query ? `?${opts.query}` : ''}`);
  if (opts.expectHeading !== false) await expect(page.getByText('Legal & compliance reporting', { exact: true })).toBeVisible();
}
