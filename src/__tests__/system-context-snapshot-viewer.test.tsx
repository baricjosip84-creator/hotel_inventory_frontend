/*
  System Context tenant-facing UX guard.

  The page must keep useful tenant workflows while hiding low-level forecast,
  execution-engine, and implementation plumbing from the normal tenant view.
*/

import fs from 'fs';
import path from 'path';

const pagePath = path.join(process.cwd(), 'src/pages/SystemContextPage.tsx');
const cssPath = path.join(process.cwd(), 'src/pages/SystemContextPage.css');
const typePath = path.join(process.cwd(), 'src/types/inventory.ts');

const pageSource = fs.readFileSync(pagePath, 'utf8');
const cssSource = fs.readFileSync(cssPath, 'utf8');
const typeSource = fs.readFileSync(typePath, 'utf8');

describe('system context tenant-facing experience', () => {
  test('keeps the page focused on tenant decisions rather than implementation internals', () => {
    expect(pageSource).toContain('See what the system currently knows about your operation');
    expect(pageSource).toContain('What needs attention');
    expect(pageSource).toContain('Recommended next steps');
    expect(pageSource).toContain('Operational snapshot');
    expect(pageSource).toContain('Data confidence');
    expect(pageSource).toContain('Safety boundaries');
  });

  test('separates overview, optional planning history, and permission-gated diagnostics', () => {
    expect(pageSource).toContain("type SystemContextView = 'overview' | 'history' | 'diagnostics'");
    expect(pageSource).toContain('canViewTenantDiagnostics');
    expect(pageSource).toContain("view === 'diagnostics' && canViewTenantDiagnostics");
    expect(pageSource).toContain('Internal Phase B/C/D step names');
  });

  test('does not fetch optional history until the user opens planning history', () => {
    expect(pageSource).toContain("const historyEnabled = view === 'history'");
    expect(pageSource).toContain("enabled: historyEnabled");
    expect(pageSource).toContain("enabled: historyEnabled && Boolean(selectedSnapshotId)");
  });

  test('preserves guarded snapshot and scenario capture', () => {
    expect(pageSource).toContain('/system-context/snapshots/capture');
    expect(pageSource).toContain('/system-context/snapshots/forecast-scenarios/capture');
    expect(pageSource).toContain('canGovernDecisionIntelligence');
    expect(pageSource).toContain('Save context snapshot');
    expect(pageSource).toContain('Save scenario set');
  });

  test('preserves governed review-request creation without direct execution', () => {
    expect(pageSource).toContain("request_type: 'system_recommendation'");
    expect(pageSource).toContain("requested_action: 'review_system_context_recommendations'");
    expect(pageSource).toContain('Create review request');
    expect(pageSource).toContain('does not execute actions');
  });

  test('keeps snapshot and scenario types available', () => {
    expect(typeSource).toContain('export interface SystemContextSnapshot');
    expect(typeSource).toContain('export interface SystemContextSnapshotCaptureResponse');
    expect(typeSource).toContain('export interface SystemContextSnapshotComparison');
    expect(typeSource).toContain('export interface SystemContextForecastScenarioSet');
  });

  test('includes responsive presentation rules', () => {
    expect(cssSource).toContain('.system-context-metrics');
    expect(cssSource).toContain('.system-context-two-column');
    expect(cssSource).toContain('@media (max-width: 820px)');
    expect(cssSource).toContain('@media (max-width: 560px)');
  });
});
