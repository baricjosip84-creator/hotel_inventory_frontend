/*
  Step 319

  Historical snapshot viewer foundation guard.

  Verifies the frontend exposes only read-only historical snapshot viewing
  concepts and does not expose capture or execution controls.
*/

import fs from 'fs';
import path from 'path';

const pagePath = path.join(process.cwd(), 'src/pages/SystemContextPage.tsx');
const typePath = path.join(process.cwd(), 'src/types/inventory.ts');

const pageSource = fs.readFileSync(pagePath, 'utf8');
const typeSource = fs.readFileSync(typePath, 'utf8');

describe('system context snapshot viewer foundation', () => {
  test('page exposes historical snapshot viewer metadata', () => {
    expect(pageSource).toContain('Historical Snapshot Viewer');
    expect(pageSource).toContain('GET /system-context/snapshots');
    expect(pageSource).toContain('GET /system-context/snapshots/:id');
    expect(pageSource).toContain('Read Only');
  });

  test('page exposes only guarded manual capture and blocks execution concepts', () => {
    expect(pageSource).toContain('Policy-guarded capture only');
        expect(pageSource).toContain('Capture Read-Only Snapshot');
        expect(pageSource).toContain('/system-context/snapshots/capture');
    expect(pageSource).toContain('No operational execution');
    expect(pageSource).toContain('Only manual read-only snapshot capture is exposed');
  });

  test('snapshot type exists', () => {
    expect(typeSource).toContain('export interface SystemContextSnapshot');
        expect(typeSource).toContain('export interface SystemContextSnapshotCaptureResponse');
    expect(typeSource).toContain('generated_at');
    expect(typeSource).toContain('forecast_scenarios');
    expect(typeSource).toContain('historical_signal_window');
  });
});


describe('system context snapshot real data loading', () => {
  test('page fetches snapshot list and detail through read-only APIs', () => {
    expect(pageSource).toContain("system-context-snapshots");
    expect(pageSource).toContain("/system-context/snapshots?limit=25");
    expect(pageSource).toContain("selectedSnapshotId");
    expect(pageSource).toContain("selectedSnapshotQuery");
    expect(pageSource).toContain("Snapshot Detail");
  });

  test('page includes loading, empty, and read-only detail states', () => {
    expect(pageSource).toContain("Loading snapshots");
    expect(pageSource).toContain("No snapshots yet");
    expect(pageSource).toContain("Read Only");
    expect(pageSource).toContain("Executes Actions");
  });

  test('snapshot detail type includes context snapshot payload support', () => {
    expect(typeSource).toContain("context_snapshot?");
  });
});


describe('polished snapshot detail rendering', () => {
  test('page renders stored intelligence payloads read-only', () => {
    expect(pageSource).toContain('Stored Predictive Readiness');
    expect(pageSource).toContain('Stored Forecast Scenarios');
    expect(pageSource).toContain('Stored Historical Signal Window');
    expect(pageSource).toContain('Capture Policy');
    expect(pageSource).toContain('Snapshot Fingerprint');
  });

  test('page renders payloads as JSON previews without mutation controls', () => {
    expect(pageSource).toContain('jsonPreview');
    expect(pageSource).not.toContain('mutation_enabled: true');
    expect(pageSource).not.toContain('/execute');
  });
});


describe('snapshot comparison panel', () => {
  test('page fetches and renders latest snapshot comparison read-only', () => {
    expect(pageSource).toContain('system-context-snapshot-comparison');
    expect(pageSource).toContain('/system-context/snapshots/compare/latest');
    expect(pageSource).toContain('Snapshot Comparison');
    expect(pageSource).toContain('Insufficient History');
    expect(pageSource).toContain('Executes Actions');
  });

  test('comparison type exists', () => {
    expect(typeSource).toContain('export interface SystemContextSnapshotComparison');
    expect(typeSource).toContain('comparisons: Array');
  });
});
