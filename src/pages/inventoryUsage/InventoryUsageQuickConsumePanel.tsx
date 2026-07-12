import { useEffect, useMemo, useRef, useState } from 'react';
import { USAGE_REASON_OPTIONS } from './inventoryUsageConfig';
import { toNumber } from './inventoryUsageFormatting';
import { styles } from './inventoryUsageStyles';
import { InventoryUsageCameraScanner } from './InventoryUsageCameraScanner';
import type { InventoryUsageBarcodeRequest, InventoryUsageBarcodePreviewResponse, InventoryUsageBarcodeResponse, InventoryUsageStorageLocationOption } from './inventoryUsageTypes';


type BarcodePolicyErrorDetails = {
  storage_location_id?: string | null;
  storage_location_name?: string | null;
  current_quantity?: number | string | null;
  resulting_quantity?: number | string | null;
  minimum_quantity?: number | string | null;
  blocking_reasons?: string[];
  acknowledgement_required_reasons?: string[];
  critical_alert_count?: number | string | null;
  critical_alerts?: Array<{
    id?: string;
    type?: string | null;
    message?: string | null;
  }>;
  period_closure?: {
    id?: string;
    period_start?: string | null;
    period_end?: string | null;
    closed_at?: string | null;
  } | null;
};

type RecentBarcodeUsageScan = {
  barcode: string;
  productLabel: string;
  storage_location_id: string;
  locationLabel?: string | null;
  package_count?: number | string | null;
  consumption_reason?: string;
  department?: string | null;
  event_name?: string | null;
  last_recorded_at: string;
};

type SubmittedQuickConsumeDraft = {
  baselineResultId: string | null;
  fingerprint: string;
  barcode: string;
  storageLocationId: string;
};

const RECENT_BARCODE_SCANS_STORAGE_KEY = 'inventoryUsage.recentBarcodeScans';
const QUICK_CONSUME_DEFAULTS_STORAGE_KEY = 'inventoryUsage.quickConsumeDefaults';
const RECENT_BARCODE_SCANS_LIMIT = 8;



const getApiErrorDetails = (error?: Error | null): BarcodePolicyErrorDetails | null => {
  const maybeApiError = error as (Error & { details?: unknown }) | null | undefined;
  const details = maybeApiError?.details;

  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return null;
  }

  return details as BarcodePolicyErrorDetails;
};

const getApiErrorCode = (error?: Error | null): string | undefined => {
  const maybeApiError = error as (Error & { code?: string }) | null | undefined;
  return maybeApiError?.code;
};

const createClientScanId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    const value = token === 'x' ? random : ((random & 0x3) | 0x8);
    return value.toString(16);
  });
};

const normalizeQuickConsumeNumber = (value: number | string | undefined) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const createQuickConsumeDraftFingerprint = (draft: InventoryUsageBarcodeRequest) => JSON.stringify({
  barcode: draft.barcode.trim().toLowerCase(),
  storage_location_id: draft.storage_location_id.trim(),
  package_count: normalizeQuickConsumeNumber(draft.package_count),
  quantity: draft.quantity === undefined || draft.quantity === '' ? null : normalizeQuickConsumeNumber(draft.quantity),
  consumption_reason: draft.consumption_reason || 'internal_use',
  department: draft.department?.trim() || '',
  event_name: draft.event_name?.trim() || '',
  notes: draft.notes?.trim() || '',
  consumed_at: draft.consumed_at || '',
  client_scan_id: draft.client_scan_id || '',
  stock_risk_acknowledged: Boolean(draft.stock_risk_acknowledged),
  missing_evidence_acknowledged: Boolean(draft.missing_evidence_acknowledged),
  evidence_original_filename: draft.evidence_original_filename?.trim() || '',
  evidence_stored_filename: draft.evidence_stored_filename?.trim() || '',
  evidence_mime_type: draft.evidence_mime_type?.trim() || '',
  evidence_file_size_bytes: draft.evidence_file_size_bytes === undefined || draft.evidence_file_size_bytes === ''
    ? null
    : normalizeQuickConsumeNumber(draft.evidence_file_size_bytes),
  evidence_storage_path: draft.evidence_storage_path?.trim() || ''
});

const formatBarcodeTraceability = (match?: InventoryUsageBarcodeResponse['barcode_match']): string => {
  if (!match?.matched_label_barcode) return '';
  return [
    match.lot_number ? `Lot ${match.lot_number}` : '',
    match.batch_number ? `Batch ${match.batch_number}` : '',
    match.expiry_date ? `Expiry ${new Date(match.expiry_date).toLocaleDateString()}` : ''
  ].filter(Boolean).join(' · ');
};

const formatPolicyReason = (reason: string) => {
  switch (reason) {
    case 'missing_stock_row':
      return 'No stock row exists at the selected location';
    case 'insufficient_stock':
      return 'The scan would make stock negative';
    case 'critical_alert':
      return 'A critical unresolved alert blocks consumption';
    case 'closed_period':
      return 'The selected usage timestamp is inside a closed period';
    case 'stock_risk':
      return 'Stock-impact acknowledgement is required';
    case 'missing_evidence':
      return 'Evidence metadata or missing-evidence acknowledgement is required';
    default:
      return reason.replace(/_/g, ' ');
  }
};

const readRecentBarcodeScans = (): RecentBarcodeUsageScan[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(RECENT_BARCODE_SCANS_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed.filter((item) => item?.barcode) : [];
  } catch {
    return [];
  }
};

const writeRecentBarcodeScans = (scans: RecentBarcodeUsageScan[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(RECENT_BARCODE_SCANS_STORAGE_KEY, JSON.stringify(scans.slice(0, RECENT_BARCODE_SCANS_LIMIT)));
  } catch {
    // Recent scan history is a convenience cache; recording usage must not depend on browser storage.
  }
};


type QuickConsumeShiftDefaults = {
  enabled?: boolean;
  storage_location_id?: string;
  consumption_reason?: string;
  department?: string;
  event_name?: string;
};

const readQuickConsumeShiftDefaults = (): QuickConsumeShiftDefaults => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(QUICK_CONSUME_DEFAULTS_STORAGE_KEY);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);

    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeQuickConsumeShiftDefaults = (defaults: QuickConsumeShiftDefaults) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (!defaults.enabled) {
      window.localStorage.removeItem(QUICK_CONSUME_DEFAULTS_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(QUICK_CONSUME_DEFAULTS_STORAGE_KEY, JSON.stringify(defaults));
  } catch {
    // Shift defaults are a convenience cache; barcode usage recording must not depend on browser storage.
  }
};

type InventoryUsageQuickConsumePanelProps = {
  canRecord: boolean;
  previewing?: boolean;
  previewError?: Error | null;
  previewResult?: InventoryUsageBarcodePreviewResponse | null;
  recording: boolean;
  error?: Error | null;
  result?: InventoryUsageBarcodeResponse | null;
  evidenceLinking?: boolean;
  evidenceError?: Error | null;
  evidenceResult?: { id?: string; original_filename?: string } | null;
  storageLocations: InventoryUsageStorageLocationOption[];
  storageLocationsLoading: boolean;
  storageLocationsError?: Error | null;
  onPreviewBarcodeUsage?: (payload: InventoryUsageBarcodeRequest) => void;
  onRecordBarcodeUsage: (payload: InventoryUsageBarcodeRequest) => void;
};

const defaultDraft: InventoryUsageBarcodeRequest = {
  barcode: '',
  storage_location_id: '',
  package_count: 1,
  consumption_reason: 'internal_use',
  department: '',
  event_name: '',
  notes: '',
  evidence_original_filename: '',
  evidence_stored_filename: '',
  evidence_mime_type: '',
  evidence_file_size_bytes: '',
  evidence_storage_path: ''
};


const buildInitialDraft = (): InventoryUsageBarcodeRequest => {
  const defaults = readQuickConsumeShiftDefaults();

  if (!defaults.enabled) {
    return defaultDraft;
  }

  return {
    ...defaultDraft,
    storage_location_id: defaults.storage_location_id || '',
    consumption_reason: defaults.consumption_reason || defaultDraft.consumption_reason,
    department: defaults.department || '',
    event_name: defaults.event_name || ''
  };
};

export function InventoryUsageQuickConsumePanel({
  canRecord,
  previewing = false,
  previewError,
  previewResult,
  recording,
  error,
  result,
  evidenceLinking = false,
  evidenceError,
  evidenceResult,
  storageLocations,
  storageLocationsLoading,
  storageLocationsError,
  onPreviewBarcodeUsage,
  onRecordBarcodeUsage
}: InventoryUsageQuickConsumePanelProps) {
  const [draft, setDraft] = useState<InventoryUsageBarcodeRequest>(buildInitialDraft);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const lastCompletedUsageIdRef = useRef<string | null>(result?.usage?.id || null);
  const submittedDraftRef = useRef<SubmittedQuickConsumeDraft | null>(null);
  const [recentScans, setRecentScans] = useState<RecentBarcodeUsageScan[]>(readRecentBarcodeScans);
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const [missingEvidenceAcknowledged, setMissingEvidenceAcknowledged] = useState(false);
  const [shiftDefaultsEnabled, setShiftDefaultsEnabled] = useState(() => Boolean(readQuickConsumeShiftDefaults().enabled));
  const [clientScanId, setClientScanId] = useState(createClientScanId);
  const isClientScanIdConflict = getApiErrorCode(error) === 'CLIENT_SCAN_ID_CONFLICT';
  const barcodePolicyErrorDetails = getApiErrorDetails(error);

  const packageCount = useMemo(() => {
    const parsed = Number(draft.package_count || 0);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [draft.package_count]);

  const activeLocations = useMemo(() => {
    return storageLocations
      .filter((location) => !location.deleted_at)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [storageLocations]);


  useEffect(() => {
    writeQuickConsumeShiftDefaults({
      enabled: shiftDefaultsEnabled,
      storage_location_id: draft.storage_location_id || '',
      consumption_reason: draft.consumption_reason || 'internal_use',
      department: draft.department || '',
      event_name: draft.event_name || ''
    });
  }, [draft.consumption_reason, draft.department, draft.event_name, draft.storage_location_id, shiftDefaultsEnabled]);

  useEffect(() => {
    if (!result?.barcode_match?.barcode || !result.stock?.storage_location_id) {
      return;
    }

    const location = storageLocations.find((item) => item.id === result.stock?.storage_location_id);
    const productLabel = result.barcode_match.product_name || result.barcode_match.product_id;
    const nextScan: RecentBarcodeUsageScan = {
      barcode: result.barcode_match.barcode,
      productLabel,
      storage_location_id: result.stock.storage_location_id,
      locationLabel: location?.name || null,
      package_count: result.barcode_match.package_count || 1,
      consumption_reason: result.usage?.consumption_reason || draft.consumption_reason || 'internal_use',
      department: result.usage?.department || draft.department || null,
      event_name: result.usage?.event_name || draft.event_name || null,
      last_recorded_at: new Date().toISOString()
    };

    setRecentScans((current) => {
      const deduped = current.filter((item) => !(item.barcode.toLowerCase() === nextScan.barcode.toLowerCase() && item.storage_location_id === nextScan.storage_location_id));
      const updated = [nextScan, ...deduped].slice(0, RECENT_BARCODE_SCANS_LIMIT);
      writeRecentBarcodeScans(updated);
      return updated;
    });
  }, [draft.consumption_reason, draft.department, draft.event_name, result, storageLocations]);

  const requiresEvidencePrompt = ['damage', 'waste'].includes(draft.consumption_reason || '');
  const hasEvidenceMetadata = Boolean(draft.evidence_original_filename?.trim() && draft.evidence_stored_filename?.trim());

  const draftConsumedAt = draft.consumed_at || '';
  const previewConsumedAt = previewResult?.preview?.usage_timestamp
    ? previewResult.preview.usage_timestamp.slice(0, 16)
    : '';
  const consumedAtStillMatchesPreview = draftConsumedAt
    ? previewConsumedAt === draftConsumedAt
    : Boolean(previewResult?.preview?.usage_timestamp);
  const previewReasonStillMatchesDraft = previewResult?.preview?.consumption_reason
    ? previewResult.preview.consumption_reason === (draft.consumption_reason || 'internal_use')
    : true;
  const previewEvidenceStillMatchesDraft = previewResult?.preview?.has_evidence_metadata === undefined
    ? true
    : Boolean(previewResult.preview.has_evidence_metadata) === hasEvidenceMetadata;

  const previewMatchesDraft = Boolean(
    previewResult?.barcode_match?.barcode
      && previewResult.preview?.storage_location_id
      && previewResult.barcode_match.barcode.toLowerCase() === draft.barcode.trim().toLowerCase()
      && previewResult.preview.storage_location_id === draft.storage_location_id
      && Number(previewResult.preview.package_count || 1) === packageCount
      && consumedAtStillMatchesPreview
      && previewReasonStillMatchesDraft
      && previewEvidenceStillMatchesDraft
  );
  const requiresFreshPreview = Boolean(onPreviewBarcodeUsage);
  const hasStalePreview = Boolean(previewResult?.preview && !previewMatchesDraft);

  const requiresMissingEvidenceAcknowledgement = requiresEvidencePrompt && !hasEvidenceMetadata;
  const previewBlockingReasons = previewMatchesDraft ? (previewResult?.preview?.blocking_reasons || []) : [];
  const previewAcknowledgementReasons = previewMatchesDraft ? (previewResult?.preview?.acknowledgement_required_reasons || []) : [];

  const criticalAlertBlocksSubmit = previewBlockingReasons.includes('critical_alert');
  const closedPeriodBlocksSubmit = previewBlockingReasons.includes('closed_period');

  const missingStockRowBlocksSubmit = Boolean(
    previewBlockingReasons.includes('missing_stock_row')
      || (previewMatchesDraft && previewResult?.preview?.has_stock_row === false)
  );

  const insufficientStockBlocksSubmit = previewBlockingReasons.includes('insufficient_stock');

  const activePreviewRisk = previewAcknowledgementReasons.includes('stock_risk');
  const previewRequiresEvidenceAcknowledgement = previewAcknowledgementReasons.includes('missing_evidence');

  const canPreview = canRecord
    && draft.barcode.trim().length > 0
    && draft.storage_location_id.trim().length > 0
    && packageCount > 0
    && !previewing
    && !recording;

  const canSubmit = canRecord
    && draft.barcode.trim().length > 0
    && draft.storage_location_id.trim().length > 0
    && packageCount > 0
    && !recording
    && (!requiresFreshPreview || previewMatchesDraft)
    && !criticalAlertBlocksSubmit
    && !closedPeriodBlocksSubmit
    && !missingStockRowBlocksSubmit
    && !insufficientStockBlocksSubmit
    && (!activePreviewRisk || riskAcknowledged)
    && (!requiresMissingEvidenceAcknowledgement || missingEvidenceAcknowledged)
    && (!previewRequiresEvidenceAcknowledgement || missingEvidenceAcknowledged);

  const missingPreviewRequirements = [
    draft.barcode.trim().length === 0 ? 'scan, paste, or enter a barcode' : '',
    draft.storage_location_id.trim().length === 0 ? 'select a stock location' : '',
    packageCount <= 0 ? 'enter a scan quantity greater than zero' : ''
  ].filter(Boolean);

  const actionGuidance = (() => {
    if (!canRecord) {
      return 'Recording permission is required before previewing or consuming stock.';
    }

    if (missingPreviewRequirements.length > 0) {
      return `Required before preview: ${missingPreviewRequirements.join(', ')}.`;
    }

    if (previewing) {
      return 'Stock-impact preview is running. Wait for it to finish.';
    }

    if (recording) {
      return 'Quick consume is being recorded. Wait for it to finish.';
    }

    if (requiresFreshPreview && !previewMatchesDraft) {
      return hasStalePreview
        ? 'The draft changed after the last preview. Preview stock impact again before quick consume.'
        : 'Preview stock impact first. Quick consume remains disabled until this exact draft passes preview.';
    }

    if (criticalAlertBlocksSubmit) {
      return 'Quick consume is blocked by an unresolved critical alert.';
    }

    if (closedPeriodBlocksSubmit) {
      return 'Quick consume is blocked because the selected usage time is inside a closed period.';
    }

    if (missingStockRowBlocksSubmit) {
      return 'Quick consume is blocked because no stock row exists at the selected location.';
    }

    if (insufficientStockBlocksSubmit) {
      return 'Quick consume is blocked because the requested quantity exceeds available stock.';
    }

    if ((activePreviewRisk && !riskAcknowledged) || (previewRequiresEvidenceAcknowledgement && !missingEvidenceAcknowledged) || (requiresMissingEvidenceAcknowledgement && !missingEvidenceAcknowledged)) {
      return 'Complete the required acknowledgement before quick consume.';
    }

    if (canSubmit) {
      return 'Preview is current. Quick consume is ready.';
    }

    return 'Complete the required fields and preview this draft before quick consume.';
  })();

  const updateDraft = (patch: Partial<InventoryUsageBarcodeRequest>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setRiskAcknowledged(false);
    setMissingEvidenceAcknowledged(false);
  };

  const buildPayload = (): InventoryUsageBarcodeRequest => ({
    barcode: draft.barcode.trim(),
    storage_location_id: draft.storage_location_id.trim(),
    package_count: packageCount,
    consumption_reason: draft.consumption_reason || undefined,
    department: draft.department?.trim() || undefined,
    event_name: draft.event_name?.trim() || undefined,
    notes: draft.notes?.trim() || undefined,
    consumed_at: draft.consumed_at || undefined,
    client_scan_id: clientScanId,
    stock_risk_acknowledged: activePreviewRisk && riskAcknowledged ? true : undefined,
    missing_evidence_acknowledged: (requiresMissingEvidenceAcknowledgement || previewRequiresEvidenceAcknowledgement) && missingEvidenceAcknowledged ? true : undefined,
    evidence_original_filename: draft.evidence_original_filename?.trim() || undefined,
    evidence_stored_filename: draft.evidence_stored_filename?.trim() || undefined,
    evidence_mime_type: draft.evidence_mime_type?.trim() || undefined,
    evidence_file_size_bytes: draft.evidence_file_size_bytes || undefined,
    evidence_storage_path: draft.evidence_storage_path?.trim() || undefined
  });

  useEffect(() => {
    const completedUsageId = result?.usage?.id;
    const submittedDraft = submittedDraftRef.current;

    if (!completedUsageId || !submittedDraft || lastCompletedUsageIdRef.current === completedUsageId) {
      return;
    }

    if (submittedDraft.baselineResultId === completedUsageId) {
      return;
    }

    const resultBarcode = result.barcode_match?.barcode?.trim().toLowerCase() || '';
    const resultStorageLocationId = result.stock?.storage_location_id || '';

    if (
      resultBarcode !== submittedDraft.barcode
      || resultStorageLocationId !== submittedDraft.storageLocationId
    ) {
      return;
    }

    const currentDraftFingerprint = createQuickConsumeDraftFingerprint({
      ...draft,
      client_scan_id: clientScanId,
      stock_risk_acknowledged: activePreviewRisk && riskAcknowledged ? true : undefined,
      missing_evidence_acknowledged: (requiresMissingEvidenceAcknowledgement || previewRequiresEvidenceAcknowledgement) && missingEvidenceAcknowledged ? true : undefined
    });

    lastCompletedUsageIdRef.current = completedUsageId;
    submittedDraftRef.current = null;

    if (currentDraftFingerprint !== submittedDraft.fingerprint) {
      return;
    }

    setRiskAcknowledged(false);
    setMissingEvidenceAcknowledged(false);
    setClientScanId(createClientScanId());
    setDraft((current) => ({
      ...current,
      barcode: '',
      package_count: 1,
      notes: '',
      evidence_original_filename: '',
      evidence_stored_filename: '',
      evidence_mime_type: '',
      evidence_file_size_bytes: '',
      evidence_storage_path: ''
    }));
    requestAnimationFrame(() => barcodeInputRef.current?.focus());
  }, [
    activePreviewRisk,
    clientScanId,
    draft,
    missingEvidenceAcknowledged,
    previewRequiresEvidenceAcknowledgement,
    requiresMissingEvidenceAcknowledgement,
    result,
    riskAcknowledged
  ]);
  const handlePreview = () => {
    if (!canPreview || !onPreviewBarcodeUsage) {
      return;
    }

    onPreviewBarcodeUsage(buildPayload());
  };

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }

    const payload = buildPayload();

    submittedDraftRef.current = {
      baselineResultId: result?.usage?.id || null,
      fingerprint: createQuickConsumeDraftFingerprint(payload),
      barcode: payload.barcode.trim().toLowerCase(),
      storageLocationId: payload.storage_location_id.trim()
    };

    onRecordBarcodeUsage(payload);
  };

  const handleScannerEnter = () => {
    if (canSubmit) {
      handleSubmit();
      return;
    }

    if (requiresFreshPreview && canPreview) {
      handlePreview();
    }
  };

  const handleReuseRecentScan = (scan: RecentBarcodeUsageScan) => {
    setClientScanId(createClientScanId());
    updateDraft({
      barcode: scan.barcode,
      storage_location_id: scan.storage_location_id,
      package_count: scan.package_count || 1,
      consumption_reason: scan.consumption_reason || draft.consumption_reason || 'internal_use',
      department: scan.department || draft.department || '',
      event_name: scan.event_name || draft.event_name || ''
    });
  };

  const handleClearRecentScans = () => {
    setRecentScans([]);
    writeRecentBarcodeScans([]);
  };

  const handleStartNewScanAfterConflict = () => {
    setClientScanId(createClientScanId());
    setRiskAcknowledged(false);
    setMissingEvidenceAcknowledged(false);
  };

  return (
    <section style={styles.card}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Barcode quick consume</h2>
          <p style={styles.sectionDescription}>
            Scan a product, package, or inventory-label barcode with this device camera, or paste/type its value.
            Package barcode quantity means packages; product and inventory-label quantity means base units.
          </p>
        </div>
        <span style={canRecord ? styles.successPill : styles.warningPill}>
          {canRecord ? 'Ready to record' : 'Record permission required'}
        </span>
      </div>

      <div style={styles.filterGrid}>
        <label style={styles.fieldLabel}>
          Barcode
          <input
            style={styles.input}
            ref={barcodeInputRef}
            value={draft.barcode}
            onChange={(event) => updateDraft({ barcode: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleScannerEnter();
              }
            }}
            placeholder="Paste or enter barcode value"
            autoComplete="off"
          />
        </label>

        <InventoryUsageCameraScanner
          disabled={!canRecord || recording}
          onDecoded={(barcode) => updateDraft({ barcode })}
        />

        <label style={styles.fieldLabel}>
          Stock location
          <select
            style={styles.input}
            value={draft.storage_location_id}
            onChange={(event) => updateDraft({ storage_location_id: event.target.value })}
            disabled={storageLocationsLoading || activeLocations.length === 0}
          >
            <option value="">{storageLocationsLoading ? 'Loading locations...' : 'Select location'}</option>
            {activeLocations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}{location.temperature_zone ? ` · ${location.temperature_zone}` : ''}
              </option>
            ))}
          </select>
        </label>

        <label style={styles.fieldLabel}>
          Scan quantity
          <input
            type="number"
            min="0.0001"
            step="0.0001"
            style={styles.input}
            value={draft.package_count ?? 1}
            onChange={(event) => updateDraft({ package_count: event.target.value })}
          />
        </label>

        <label style={styles.fieldLabel}>
          Reason
          <select
            style={styles.input}
            value={draft.consumption_reason || 'internal_use'}
            onChange={(event) => updateDraft({ consumption_reason: event.target.value })}
          >
            {USAGE_REASON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label style={styles.fieldLabel}>
          Department / team
          <input
            style={styles.input}
            value={draft.department || ''}
            onChange={(event) => updateDraft({ department: event.target.value })}
            placeholder="Housekeeping, kitchen, maintenance..."
          />
        </label>

        <label style={styles.fieldLabel}>
          Event / job
          <input
            style={styles.input}
            value={draft.event_name || ''}
            onChange={(event) => updateDraft({ event_name: event.target.value })}
            placeholder="Optional event or work order"
          />
        </label>

        <label style={styles.fieldLabel}>
          Consumed at
          <input
            type="datetime-local"
            style={styles.input}
            value={draft.consumed_at || ''}
            onChange={(event) => updateDraft({ consumed_at: event.target.value })}
          />
        </label>
      </div>

      <div style={styles.importPanel}>
        <div style={styles.sectionHeader}>
          <div>
            <h3 style={styles.subsectionTitle}>Shift-floor defaults</h3>
            <p style={styles.sectionDescription}>
              Keep the selected location, reason, department, and event between scans for mobile or scanner-heavy workflows.
              Barcode, quantity, notes, and evidence fields still reset after each successful consume.
            </p>
          </div>
          <span style={shiftDefaultsEnabled ? styles.successPill : styles.warningPill}>{shiftDefaultsEnabled ? 'Defaults saved' : 'One-off scan'}</span>
        </div>
        <div style={styles.bulkFooter}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={shiftDefaultsEnabled}
              onChange={(event) => setShiftDefaultsEnabled(event.target.checked)}
            />
            Reuse these shift defaults for the next barcode scans on this device.
          </label>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => {
              setShiftDefaultsEnabled(false);
              writeQuickConsumeShiftDefaults({ enabled: false });
            }}
          >
            Clear saved defaults
          </button>
        </div>
      </div>

      <div style={styles.importPanel}>
        <div style={styles.sectionHeader}>
          <div>
            <h3 style={styles.subsectionTitle}>Evidence attachment link</h3>
            <p style={styles.sectionDescription}>
              Optional: link an already-stored photo, PDF, or damage note file to the usage log after the barcode consume is recorded.
              {requiresEvidencePrompt ? ' Damage and waste scans should include evidence whenever possible.' : ''}
            </p>
          </div>
          <span style={requiresEvidencePrompt ? styles.warningPill : styles.successPill}>{requiresEvidencePrompt ? 'Evidence recommended' : 'Optional'}</span>
        </div>
        <div style={styles.filterGrid}>
          <label style={styles.fieldLabel}>
            Original filename
            <input
              style={styles.input}
              value={draft.evidence_original_filename || ''}
              onChange={(event) => updateDraft({ evidence_original_filename: event.target.value })}
              placeholder="damage-photo.jpg"
            />
          </label>
          <label style={styles.fieldLabel}>
            Stored filename
            <input
              style={styles.input}
              value={draft.evidence_stored_filename || ''}
              onChange={(event) => updateDraft({ evidence_stored_filename: event.target.value })}
              placeholder="tenant/uploads/damage-photo.jpg"
            />
          </label>
          <label style={styles.fieldLabel}>
            MIME type
            <input
              style={styles.input}
              value={draft.evidence_mime_type || ''}
              onChange={(event) => updateDraft({ evidence_mime_type: event.target.value })}
              placeholder="image/jpeg"
            />
          </label>
          <label style={styles.fieldLabel}>
            File size bytes
            <input
              type="number"
              min="0"
              step="1"
              style={styles.input}
              value={draft.evidence_file_size_bytes || ''}
              onChange={(event) => updateDraft({ evidence_file_size_bytes: event.target.value })}
              placeholder="Optional"
            />
          </label>
          <label style={styles.fieldLabel}>
            Storage path
            <input
              style={styles.input}
              value={draft.evidence_storage_path || ''}
              onChange={(event) => updateDraft({ evidence_storage_path: event.target.value })}
              placeholder="Optional object storage path or URL"
            />
          </label>
        </div>
      </div>

      <div style={styles.importPanel}>
        <label style={styles.fieldLabel}>
          Notes
          <textarea
            style={styles.textarea}
            rows={3}
            value={draft.notes || ''}
            onChange={(event) => updateDraft({ notes: event.target.value })}
            placeholder="Optional notes for governance, damage/waste detail, or shift context"
          />
        </label>

        {requiresMissingEvidenceAcknowledgement ? (
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={missingEvidenceAcknowledged}
              onChange={(event) => setMissingEvidenceAcknowledged(event.target.checked)}
            />
            Record this damage/waste scan without evidence attachment metadata.
          </label>
        ) : hasEvidenceMetadata ? (
          <p style={styles.successText}>Evidence metadata will be linked to the usage log after recording.</p>
        ) : null}

        <div style={styles.bulkFooter}>
          <p style={styles.sectionDescription}>
            The backend resolves active inventory labels first, then package and product barcodes, validates location stock, records a normal usage log, links the stock movement, stores operator acknowledgements in notes, and uses the same device-generated scan id for retries until a scan is confirmed. Camera scanning fills the barcode field; preview the stock impact before recording.
          </p>
          {requiresFreshPreview && !previewMatchesDraft ? (
            <p style={styles.warningText}>Preview the current scan before recording so stock, alert, period, reason, and evidence controls are checked against this exact draft.</p>
          ) : draftConsumedAt === '' && previewMatchesDraft ? (
            <p style={styles.sectionDescription}>Preview checked the current server-side usage timestamp because no manual consumed-at value is set.</p>
          ) : null}
          <p style={canSubmit ? styles.successText : styles.warningText}>{actionGuidance}</p>
          {onPreviewBarcodeUsage ? (
            <button
              type="button"
              style={{
                ...styles.secondaryButton,
                ...(!canPreview ? styles.disabledButton : {})
              }}
              onClick={handlePreview}
              disabled={!canPreview}
              aria-disabled={!canPreview}
              title={!canPreview ? actionGuidance : 'Preview stock impact for this draft'}
            >
              {previewing ? 'Previewing...' : 'Preview stock impact'}
            </button>
          ) : null}
          <button
            type="button"
            style={{
              ...styles.primaryButton,
              ...(!canSubmit ? styles.disabledButton : {})
            }}
            onClick={handleSubmit}
            disabled={!canSubmit}
            aria-disabled={!canSubmit}
            title={!canSubmit ? actionGuidance : 'Record this barcode quick consume'}
          >
            {recording ? 'Recording...' : 'Quick consume'}
          </button>
        </div>
      </div>



      {recentScans.length > 0 ? (
        <div style={styles.importPanel}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.subsectionTitle}>Recent barcode scans</h3>
              <p style={styles.sectionDescription}>Reuse common scan/location combinations for fast shift-floor consumption without retyping metadata.</p>
            </div>
            <button type="button" style={styles.secondaryButton} onClick={handleClearRecentScans}>Clear recent</button>
          </div>
          <div style={styles.breakdownList}>
            {recentScans.map((scan) => (
              <div key={`${scan.barcode}-${scan.storage_location_id}`} style={styles.breakdownRowStacked}>
                <div>
                  <strong>{scan.productLabel}</strong>
                  <p style={styles.sectionDescription}>
                    Barcode {scan.barcode} · {scan.locationLabel || scan.storage_location_id}
                    {scan.department ? ` · ${scan.department}` : ''}
                    {scan.event_name ? ` · ${scan.event_name}` : ''}
                  </p>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={() => handleReuseRecentScan(scan)}>
                  Reuse
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {previewError ? <p style={styles.errorText}>Barcode preview failed: {previewError.message}</p> : null}
      {previewResult?.preview ? (
        <div style={styles.importPanel}>
          <strong>{previewResult.barcode_match?.product_name || previewResult.barcode_match?.product_id}</strong>
          <p style={styles.sectionDescription}>
            {previewResult.barcode_match?.matched_label_barcode
              ? 'Inventory label · '
              : previewResult.barcode_match?.package_name
                ? `${previewResult.barcode_match.package_name} · `
                : ''}
            {toNumber(previewResult.preview.package_count)} {previewResult.barcode_match?.matched_label_barcode ? 'label(s)' : 'package(s)'} = {toNumber(previewResult.preview.quantity_to_consume)} {previewResult.barcode_match?.product_unit || 'units'}.
            {formatBarcodeTraceability(previewResult.barcode_match) ? ` ${formatBarcodeTraceability(previewResult.barcode_match)}.` : ''}
            {previewResult.preview.storage_location_name ? ` Location: ${previewResult.preview.storage_location_name}.` : ''}
            Current stock {toNumber(previewResult.preview.current_quantity)} → projected {toNumber(previewResult.preview.resulting_quantity)}.
          </p>
          {missingStockRowBlocksSubmit ? (
            <p style={styles.errorText}>No stock row exists for this product at {previewResult.preview.storage_location_name || 'the selected location'}. Create or receive stock at this location before recording barcode quick consume.</p>
          ) : null}
          {insufficientStockBlocksSubmit ? (
            <p style={styles.errorText}>This scan would make stock negative at the selected location. Receive stock, reduce package count, or choose another location before recording.</p>
          ) : null}
          {hasStalePreview ? (
            <p style={styles.warningText}>Preview is stale because barcode, location, package count, consumed-at timestamp, reason, or evidence metadata changed. Preview again before recording.</p>
          ) : draftConsumedAt === '' && previewMatchesDraft ? (
            <p style={styles.sectionDescription}>No consumed-at override is set; this preview used the current server-side usage timestamp.</p>
          ) : null}
          {previewResult.preview.blocked_by_critical_alert ? (
            <div style={styles.errorText}>
              <p style={{ margin: 0 }}>
                A critical unresolved alert currently blocks consumption for this product or tenant. Resolve the alert before recording.
                {previewResult.preview.critical_alert_count ? ` ${previewResult.preview.critical_alert_count} blocking alert(s) found.` : ''}
              </p>
              {(previewResult.preview.critical_alerts || []).length > 0 ? (
                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem' }}>
                  {(previewResult.preview.critical_alerts || []).slice(0, 3).map((alert) => (
                    <li key={alert.id || `${alert.type}-${alert.message}`}>
                      <strong>{alert.type || 'Critical alert'}</strong>{alert.message ? ` — ${alert.message}` : ''}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          {previewResult.preview.blocked_by_closed_period ? (
            <p style={styles.errorText}>The selected usage timestamp is inside a closed usage period. Reopen the period or choose a different timestamp before recording.</p>
          ) : null}
          {previewResult.preview.will_deplete && !previewResult.preview.blocked_by_insufficient_stock ? (
            <p style={styles.warningText}>This scan will deplete the selected location.</p>
          ) : previewResult.preview.will_go_below_minimum ? (
            <p style={styles.warningText}>This scan will leave stock below the configured minimum.</p>
          ) : previewResult.preview.has_sufficient_stock && !previewResult.preview.blocked_by_critical_alert && !previewResult.preview.blocked_by_closed_period ? (
            <p style={styles.successText}>Stock is available for this quick-consume scan.</p>
          ) : null}
          {previewResult.preview.requires_evidence_or_acknowledgement ? (
            <p style={styles.warningText}>Backend policy requires evidence metadata or a missing-evidence acknowledgement for this reason before recording.</p>
          ) : null}
          {(previewResult.preview.blocking_reasons || []).length > 0 ? (
            <div style={styles.errorText}>
              <p style={{ margin: 0 }}>Backend policy hard-blocks this scan for:</p>
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem' }}>
                {(previewResult.preview.blocking_reasons || []).map((reason) => (
                  <li key={reason}>{formatPolicyReason(reason)}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {(previewResult.preview.acknowledgement_required_reasons || []).length > 0 ? (
            <div style={styles.warningText}>
              <p style={{ margin: 0 }}>Backend policy requires acknowledgement for:</p>
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem' }}>
                {(previewResult.preview.acknowledgement_required_reasons || []).map((reason) => (
                  <li key={reason}>{formatPolicyReason(reason)}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {previewResult.preview.can_record_without_acknowledgement ? (
            <p style={styles.successText}>Backend preview confirms this scan can be recorded without additional acknowledgements.</p>
          ) : previewResult.preview.recordable_after_acknowledgement ? (
            <p style={styles.warningText}>Backend preview confirms this scan can be recorded after the required acknowledgement(s) are completed.</p>
          ) : null}
          {activePreviewRisk ? (
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={riskAcknowledged}
                onChange={(event) => setRiskAcknowledged(event.target.checked)}
              />
              I reviewed this stock-impact warning and still want to record the quick consume.
            </label>
          ) : null}
        </div>
      ) : null}
      {storageLocationsError ? <p style={styles.errorText}>Could not load storage locations: {storageLocationsError.message}</p> : null}
      {!storageLocationsLoading && activeLocations.length === 0 ? (
        <p style={styles.warningText}>Create an active storage location before using barcode quick consume.</p>
      ) : null}
      {error ? <p style={styles.errorText}>Barcode usage failed: {error.message}</p> : null}
      {barcodePolicyErrorDetails ? (
        <div style={styles.importPanel}>
          <h3 style={styles.subsectionTitle}>Backend policy response</h3>
          <p style={styles.sectionDescription}>
            The server returned safe policy details for this failed quick-consume attempt
            {barcodePolicyErrorDetails.storage_location_name ? ` at ${barcodePolicyErrorDetails.storage_location_name}` : ''}.
            {barcodePolicyErrorDetails.current_quantity !== undefined || barcodePolicyErrorDetails.resulting_quantity !== undefined ? ` Stock ${toNumber(barcodePolicyErrorDetails.current_quantity)} → ${toNumber(barcodePolicyErrorDetails.resulting_quantity)}.` : ''}
          </p>
          {(barcodePolicyErrorDetails.blocking_reasons || []).length > 0 ? (
            <div style={styles.errorText}>
              <p style={{ margin: 0 }}>Blocked by:</p>
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem' }}>
                {(barcodePolicyErrorDetails.blocking_reasons || []).map((reason) => (
                  <li key={reason}>{formatPolicyReason(reason)}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {(barcodePolicyErrorDetails.acknowledgement_required_reasons || []).length > 0 ? (
            <div style={styles.warningText}>
              <p style={{ margin: 0 }}>Acknowledgement required:</p>
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem' }}>
                {(barcodePolicyErrorDetails.acknowledgement_required_reasons || []).map((reason) => (
                  <li key={reason}>{formatPolicyReason(reason)}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {(barcodePolicyErrorDetails.critical_alerts || []).length > 0 ? (
            <div style={styles.errorText}>
              <p style={{ margin: 0 }}>Critical alert details:</p>
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem' }}>
                {(barcodePolicyErrorDetails.critical_alerts || []).slice(0, 3).map((alert) => (
                  <li key={alert.id || `${alert.type}-${alert.message}`}>
                    <strong>{alert.type || 'Critical alert'}</strong>{alert.message ? ` — ${alert.message}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
      {isClientScanIdConflict ? (
        <div style={styles.importPanel}>
          <p style={styles.warningText}>
            This device scan id already belongs to a different recorded barcode usage. Start a new scan id before retrying this draft.
          </p>
          <button type="button" style={styles.secondaryButton} onClick={handleStartNewScanAfterConflict}>
            Start new scan id
          </button>
        </div>
      ) : null}
      {evidenceError ? <p style={styles.errorText}>Usage was recorded, but evidence linking failed: {evidenceError.message}</p> : null}
      {evidenceLinking ? <p style={styles.sectionDescription}>Linking evidence attachment...</p> : null}
      {evidenceResult?.id ? <p style={styles.successText}>Evidence linked: {evidenceResult.original_filename || evidenceResult.id}</p> : null}
      {result?.barcode_match ? (
        <p style={styles.successText}>
          {result.idempotent_replay ? 'Already recorded' : 'Recorded'} {result.stock?.previous_quantity} → {result.stock?.new_quantity} for {result.barcode_match.product_name || result.barcode_match.product_id}
          {result.barcode_match.matched_label_barcode
            ? ` (inventory label${formatBarcodeTraceability(result.barcode_match) ? ` · ${formatBarcodeTraceability(result.barcode_match)}` : ''})`
            : result.barcode_match.package_name
              ? ` (${result.barcode_match.package_name})`
              : ''}.
        </p>
      ) : null}
    </section>
  );
}
