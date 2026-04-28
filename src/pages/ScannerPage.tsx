import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest, ApiError } from '../lib/api';

/**
 * SUCCESS FEEDBACK (beep + vibration)
 *
 * WHY THIS EXISTS
 * ----------------------------------------------------------------------------
 * Gives immediate operator feedback after a successful scan:
 * - short vibration on supported mobile devices
 * - short beep using Web Audio API
 */
const playSuccessFeedback = () => {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(120);
    }

    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;

    const audioCtx = new AudioContextClass();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.15);

    /**
     * Close audio context shortly after beep to avoid piling up contexts
     * over many scans.
     */
    window.setTimeout(() => {
      void audioCtx.close().catch(() => {
        // Ignore close errors.
      });
    }, 250);
  } catch {
    // Ignore feedback errors.
  }
};

/**
 * PRODUCTION SCANNER
 *
 * SUPPORTED MODES
 * ---------------
 * 1. Shipment mode
 *    - scan shipment QR
 *    - resolve shipment
 *    - open shipments page with shipment preselected
 *
 * 2. Product mode
 *    - requires shipmentId
 *    - accepts locationId when launched from shipments page
 *    - scan product barcode
 *    - resolve matching shipment item inside the selected shipment
 *    - return to shipments page with shipment + matched item selected
 *
 * THIS VERSION ADDS
 * -----------------
 * - stronger 1D barcode support
 * - larger/wider barcode scan region
 * - manual code entry fallback
 * - image upload decode fallback
 * - success beep + vibration feedback
 *
 * COMPATIBILITY
 * -------------
 * This version avoids newer html5-qrcode options that may not exist in your
 * installed package version.
 */

type ShipmentLookupResponse = {
  id: string;
  status: string;
};

type ProductBarcodeLookupResponse = {
  shipment_item_id: string;
  shipment_id: string;
  product_id: string;
  quantity: number | string;
  received_quantity: number | string;
  remaining_quantity: number | string;
  storage_location_id?: string | null;
  discrepancy?: number | string;
  discrepancy_reason?: string | null;
  product_name?: string;
  barcode: string;
  product?: {
    id: string;
    name: string;
    barcode?: string | null;
  };
  package?: {
    id: string;
    package_name: string;
    barcode: string;
    units_per_package: number | string;
    is_default: boolean;
  };
  calculated?: {
    remaining_quantity: number | string;
    remaining_packages_estimate: number | string;
    can_receive_one_full_package: boolean;
  };
};

type ScannerMode = 'shipment' | 'product';

function modeLabel(mode: ScannerMode): string {
  return mode === 'product' ? 'Product Barcode Scanner' : 'Shipment QR Scanner';
}

function modeDescription(mode: ScannerMode): string {
  return mode === 'product'
    ? 'Scan a product barcode for the currently selected shipment.'
    : 'Scan a shipment QR code to open that shipment directly.';
}

function getFormatsToSupport(mode: ScannerMode): Html5QrcodeSupportedFormats[] {
  if (mode === 'product') {
    return [
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.CODE_93,
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.ITF,
      Html5QrcodeSupportedFormats.CODABAR,
      Html5QrcodeSupportedFormats.QR_CODE
    ];
  }

  return [Html5QrcodeSupportedFormats.QR_CODE];
}

export default function ScannerPage() {
  /*
    WHAT CHANGED
    ------------
    This file stays grounded in the ScannerPage you sent.

    The real scanner behavior is intentionally unchanged:
    - same shipment/product modes
    - same manual submit flow
    - same image decode flow
    - same resolve/navigation behavior
    - same html5-qrcode setup
    - same success feedback behavior

    This pass is UI-only and aligns the page with the shared polished shell:
    - main sections now use app-panel/app-panel--padded
    - state banners align with the shared success/error/warning styles
    - action rows align more closely with the shared app-actions rhythm
    - width guards and wrapping were tightened for long IDs / decoded values
    - no scanning logic or routing behavior was changed

    WHAT PROBLEM IT SOLVES
    ----------------------
    Makes ScannerPage feel like part of the same operational app as Shipments,
    Products, and the admin pages without changing decode behavior or backend contracts.
  */
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const manualInputRef = useRef<HTMLInputElement | null>(null);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const mode = (searchParams.get('mode') === 'product' ? 'product' : 'shipment') as ScannerMode;
  const shipmentId = searchParams.get('shipmentId') || '';
  const locationId = searchParams.get('locationId') || '';

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [resolvedShipmentId, setResolvedShipmentId] = useState<string | null>(null);
  const [resolvedShipmentItemId, setResolvedShipmentItemId] = useState<string | null>(null);
  const [resolvedProductName, setResolvedProductName] = useState<string | null>(null);
  const [resolvedPackageName, setResolvedPackageName] = useState<string | null>(null);
  const [resolvedUnitsPerPackage, setResolvedUnitsPerPackage] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isDecodingImage, setIsDecodingImage] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // Ignore stop errors if the scanner is already stopped.
      }

      try {
        await scannerRef.current.clear();
      } catch {
        // Ignore clear errors during cleanup.
      }

      scannerRef.current = null;
    }

    setIsRunning(false);
  };

  const resolveShipmentCode = async (decodedText: string) => {
    const shipment = await apiRequest<ShipmentLookupResponse>(
      `/shipments/qr/${encodeURIComponent(decodedText)}`
    );

    setResolvedShipmentId(shipment.id);
    navigate(`/shipments?shipmentId=${encodeURIComponent(shipment.id)}`);
  };

  const resolveProductBarcode = async (decodedText: string) => {
    if (!shipmentId) {
      throw new Error('No shipment selected for product scanning.');
    }

    const match = await apiRequest<ProductBarcodeLookupResponse>(
      `/shipments/${encodeURIComponent(shipmentId)}/barcode/${encodeURIComponent(decodedText)}`
    );

    setResolvedShipmentId(match.shipment_id);
    setResolvedShipmentItemId(match.shipment_item_id);
    setResolvedProductName(match.product?.name || match.product_name || null);
    setResolvedPackageName(match.package?.package_name || null);
    setResolvedUnitsPerPackage(
      match.package?.units_per_package !== undefined
        ? String(match.package.units_per_package)
        : null
    );

    const params = new URLSearchParams();
    params.set('shipmentId', match.shipment_id);
    params.set('itemId', match.shipment_item_id);
    params.set('scannedBarcode', decodedText);

    if (match.package?.id) {
      params.set('packageId', match.package.id);
      params.set('packageName', match.package.package_name);
      params.set('packageBarcode', match.package.barcode);
      params.set('unitsPerPackage', String(match.package.units_per_package));
    }

    if (match.calculated) {
      params.set(
        'remainingPackagesEstimate',
        String(match.calculated.remaining_packages_estimate)
      );
      params.set(
        'canReceiveOneFullPackage',
        String(match.calculated.can_receive_one_full_package)
      );
    }

    if (locationId) {
      params.set('locationId', locationId);
    }

    navigate(`/shipments?${params.toString()}`);
  };

  const resolveDecodedValue = async (decodedText: string) => {
    const cleanValue = decodedText.trim();

    setResult(cleanValue);
    setResolvedShipmentId(null);
    setResolvedShipmentItemId(null);
    setResolvedProductName(null);
    setResolvedPackageName(null);
    setResolvedUnitsPerPackage(null);
    setError(null);
    setIsResolving(true);

    try {
      if (mode === 'product') {
        await resolveProductBarcode(cleanValue);
      } else {
        await resolveShipmentCode(cleanValue);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to resolve scanned code.');
      }
    } finally {
      setIsResolving(false);
    }
  };

  const handleResolvedScan = async (decodedText: string) => {
    try {
      /**
       * Give immediate warehouse-style feedback on successful decode.
       */
      playSuccessFeedback();

      /*
        Stop the camera immediately after a successful decode so the same code
        is not processed repeatedly.
      */
      await stopScanner();
      await resolveDecodedValue(decodedText);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to process scanned code.');
      }
    }
  };

  const startScanner = async () => {
    setError(null);
    setResult(null);
    setResolvedShipmentId(null);
    setResolvedShipmentItemId(null);
    setResolvedProductName(null);
    setResolvedPackageName(null);
    setResolvedUnitsPerPackage(null);

    try {
      await stopScanner();

      const scanner = new Html5Qrcode('scanner-container', {
        formatsToSupport: getFormatsToSupport(mode),
        verbose: false
      });

      scannerRef.current = scanner;

      await scanner.start(
        {
          facingMode: { exact: 'environment' }
        },
        mode === 'product'
          ? {
              fps: 15,
              aspectRatio: 1.7777778,
              qrbox: { width: 360, height: 160 },
              disableFlip: false
            }
          : {
              fps: 10,
              qrbox: 280,
              disableFlip: false
            },
        (decodedText) => {
          if (!isResolving) {
            void handleResolvedScan(decodedText);
          }
        },
        () => {}
      );

      setIsRunning(true);
    } catch {
      /*
        Some devices reject exact rear-camera mode.
        Fall back to a softer camera request.
      */
      try {
        await stopScanner();

        const fallbackScanner = new Html5Qrcode('scanner-container', {
          formatsToSupport: getFormatsToSupport(mode),
          verbose: false
        });

        scannerRef.current = fallbackScanner;

        await fallbackScanner.start(
          { facingMode: 'environment' },
          mode === 'product'
            ? {
                fps: 15,
                aspectRatio: 1.7777778,
                qrbox: { width: 360, height: 160 },
                disableFlip: false
              }
            : {
                fps: 10,
                qrbox: 280,
                disableFlip: false
              },
          (decodedText) => {
            if (!isResolving) {
              void handleResolvedScan(decodedText);
            }
          },
          () => {}
        );

        setIsRunning(true);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message || 'Failed to start camera');
        } else {
          setError('Failed to start camera');
        }
      }
    }
  };

  const handleManualSubmit = async () => {
    const trimmed = manualCode.trim();

    if (!trimmed) {
      setError('Enter a code first.');
      return;
    }

    /**
     * Treat manual submission like a successful scan and give the same feedback.
     */
    playSuccessFeedback();

    await stopScanner();
    await resolveDecodedValue(trimmed);
  };

  const handleChooseImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError(null);
    setIsDecodingImage(true);

    try {
      await stopScanner();

      const imageScanner = new Html5Qrcode('scanner-container', {
        formatsToSupport: getFormatsToSupport(mode),
        verbose: false
      });

      const decodedText = await imageScanner.scanFile(file, true);

      try {
        await imageScanner.clear();
      } catch {
        // Ignore cleanup errors for temporary image scanner.
      }

      /**
       * Treat image decode like a successful scan and give the same feedback.
       */
      playSuccessFeedback();

      await resolveDecodedValue(decodedText);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Could not decode code from image.');
      } else {
        setError('Could not decode code from image.');
      }
    } finally {
      setIsDecodingImage(false);
      event.target.value = '';
    }
  };

  useEffect(() => {
    manualInputRef.current?.focus();

    return () => {
      void stopScanner();
    };
  }, []);

  return (
    <div style={styles.page}>
      <section className="app-panel app-panel--padded" style={styles.heroPanel}>
        <div style={styles.heroHeader}>
          <div style={styles.heroTextBlock}>
            <h2 style={styles.title}>{modeLabel(mode)}</h2>
            <p style={styles.description}>{modeDescription(mode)}</p>
          </div>

          <span style={mode === 'product' ? styles.modeBadgeWarn : styles.modeBadgeInfo}>
            {mode === 'product' ? 'PRODUCT MODE' : 'SHIPMENT MODE'}
          </span>
        </div>

        {mode === 'product' ? (
          <div style={styles.contextPanel}>
            <div style={styles.contextGrid}>
              <div style={styles.contextCard}>
                <div style={styles.contextLabel}>Selected shipment</div>
                <div style={styles.contextValue}>{shipmentId || 'Missing shipment ID'}</div>
              </div>

              <div style={styles.contextCard}>
                <div style={styles.contextLabel}>Default scan location</div>
                <div style={styles.contextValue}>{locationId || 'Missing default location'}</div>
              </div>
            </div>
          </div>
        ) : null}

        <div style={mode === 'product' ? styles.tipBannerWarn : styles.tipBannerInfo}>
          {mode === 'product' ? (
            <>
              <strong>Barcode scan tips:</strong>
              <div>Hold the barcode horizontally inside the wide scan area.</div>
              <div>Move a little farther back than you would for a QR code.</div>
              <div>Use strong light and avoid glare.</div>
              <div>If live scan fails, use manual entry or image upload below.</div>
            </>
          ) : (
            <>
              <strong>QR scan tips:</strong>
              <div>Center the QR code inside the square scan area.</div>
              <div>If live scan fails, use manual entry or image upload below.</div>
            </>
          )}
        </div>

        <div className="app-actions" style={styles.actionGrid}>
          <button
            onClick={() => void startScanner()}
            disabled={isRunning || isResolving || isDecodingImage}
            style={styles.primaryButton}
          >
            {isRunning ? 'Scanner Running' : 'Start Scanner'}
          </button>

          <button
            onClick={() => void stopScanner()}
            disabled={!isRunning}
            style={styles.secondaryButton}
          >
            Stop Scanner
          </button>

          <button
            type="button"
            onClick={handleChooseImage}
            disabled={isResolving || isDecodingImage}
            style={styles.secondaryButton}
          >
            Upload Image
          </button>
        </div>

        {error ? (
          <div className="app-error-state" style={styles.errorBanner}>
            <strong>Error:</strong> {error}
          </div>
        ) : null}

        {isResolving ? (
          <div className="app-warning-state" style={styles.infoBanner}>
            {mode === 'product'
              ? 'Resolving product barcode in selected shipment...'
              : 'Resolving shipment from scanned QR code...'}
          </div>
        ) : null}

        {isDecodingImage ? (
          <div className="app-warning-state" style={styles.infoBanner}>Decoding image...</div>
        ) : null}

        <div style={styles.scannerShell}>
          <div
            id="scanner-container"
            style={{
              ...styles.scannerContainer,
              ...(mode === 'product' ? styles.scannerContainerWide : styles.scannerContainerSquare)
            }}
          />
        </div>
      </section>

      <section className="app-panel app-panel--padded" style={styles.panel}>
        <div style={styles.panelHeader}>
          <div style={styles.panelHeaderText}>
            <h3 style={styles.panelTitle}>Manual / Fallback Options</h3>
            <p style={styles.panelSubtitle}>
              Use this when live camera decoding is unreliable in current warehouse conditions.
            </p>
          </div>
        </div>

        <div style={styles.formGrid}>
          <div style={styles.formField}>
            <label htmlFor="manual-code-input" style={styles.label}>
              Enter code manually
            </label>
            <input
              ref={manualInputRef}
              id="manual-code-input"
              type="text"
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              placeholder={mode === 'product' ? 'Enter product barcode' : 'Enter shipment QR text'}
              style={styles.input}
            />
          </div>

          <div className="app-actions" style={styles.formActions}>
            <button
              type="button"
              onClick={() => void handleManualSubmit()}
              disabled={isResolving || isDecodingImage}
              style={styles.primaryButton}
            >
              Submit Manual Code
            </button>

            <button
              type="button"
              onClick={handleChooseImage}
              disabled={isResolving || isDecodingImage}
              style={styles.secondaryButton}
            >
              Upload Image
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(event) => {
            void handleImageFileChange(event);
          }}
        />
      </section>

      {result || resolvedShipmentId || resolvedShipmentItemId || resolvedProductName || resolvedPackageName ? (
        <section className="app-panel app-panel--padded" style={styles.panel}>
          <div style={styles.panelHeader}>
            <div style={styles.panelHeaderText}>
              <h3 style={styles.panelTitle}>Latest Scan Result</h3>
              <p style={styles.panelSubtitle}>
                Real-time decode and resolution output from the existing scanner flow.
              </p>
            </div>
          </div>

          <div style={styles.resultGrid}>
            {result ? (
              <div style={styles.resultCard}>
                <div style={styles.resultLabel}>Decoded value</div>
                <div style={styles.resultValue}>{result}</div>
              </div>
            ) : null}

            {resolvedShipmentId ? (
              <div style={styles.resultCardSuccess}>
                <div style={styles.resultLabel}>Resolved shipment ID</div>
                <div style={styles.resultValue}>{resolvedShipmentId}</div>
              </div>
            ) : null}

            {resolvedShipmentItemId ? (
              <div style={styles.resultCardSuccess}>
                <div style={styles.resultLabel}>Resolved shipment item ID</div>
                <div style={styles.resultValue}>{resolvedShipmentItemId}</div>
              </div>
            ) : null}

            {resolvedProductName ? (
              <div style={styles.resultCardSuccess}>
                <div style={styles.resultLabel}>Matched product</div>
                <div style={styles.resultValue}>{resolvedProductName}</div>
              </div>
            ) : null}

            {resolvedPackageName ? (
              <div style={styles.resultCardSuccess}>
                <div style={styles.resultLabel}>Matched package</div>
                <div style={styles.resultValue}>
                  {resolvedPackageName}
                  {resolvedUnitsPerPackage ? ` · ${resolvedUnitsPerPackage} units/package` : ''}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    display: 'grid',
    gap: '20px',
    width: '100%',
    minWidth: 0
  },
  heroPanel: {
    display: 'grid',
    gap: '16px',
    minWidth: 0,
    overflow: 'hidden'
  },
  heroHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    flexWrap: 'wrap',
    minWidth: 0
  },
  heroTextBlock: {
    minWidth: 0
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 700,
    wordBreak: 'break-word'
  },
  description: {
    margin: '8px 0 0 0',
    color: '#4b5563',
    lineHeight: 1.6,
    wordBreak: 'break-word'
  },
  modeBadgeInfo: {
    display: 'inline-flex',
    padding: '8px 10px',
    borderRadius: '999px',
    background: '#eff6ff',
    color: '#1d4ed8',
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '0.06em',
    whiteSpace: 'nowrap'
  },
  modeBadgeWarn: {
    display: 'inline-flex',
    padding: '8px 10px',
    borderRadius: '999px',
    background: '#fff7ed',
    color: '#9a3412',
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '0.06em',
    whiteSpace: 'nowrap'
  },
  contextPanel: {
    minWidth: 0
  },
  contextGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '12px',
    minWidth: 0
  },
  contextCard: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '12px',
    padding: '14px',
    minWidth: 0
  },
  contextLabel: {
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#1d4ed8',
    marginBottom: '8px'
  },
  contextValue: {
    color: '#1e3a8a',
    lineHeight: 1.5,
    wordBreak: 'break-all'
  },
  tipBannerInfo: {
    padding: '12px 14px',
    borderRadius: '12px',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    color: '#1d4ed8',
    lineHeight: 1.6
  },
  tipBannerWarn: {
    padding: '12px 14px',
    borderRadius: '12px',
    background: '#fff7ed',
    border: '1px solid #fdba74',
    color: '#9a3412',
    lineHeight: 1.6
  },
  actionGrid: {
    /*
      What changed:
      - Switched the top scanner actions into a responsive grid.

      Why:
      - The original action row wrapped loosely and felt less stable on narrower screens.

      What problem this solves:
      - Keeps operator controls aligned and reachable without changing behavior.
    */
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '10px',
    width: '100%',
    minWidth: 0
  },
  primaryButton: {
    border: 'none',
    borderRadius: '12px',
    padding: '12px 16px',
    background: '#2563eb',
    color: '#ffffff',
    fontWeight: 700,
    cursor: 'pointer'
  },
  secondaryButton: {
    border: '1px solid #d1d5db',
    borderRadius: '12px',
    padding: '12px 16px',
    background: '#ffffff',
    color: '#111827',
    fontWeight: 700,
    cursor: 'pointer'
  },
  errorBanner: {
    lineHeight: 1.5
  },
  infoBanner: {
    lineHeight: 1.5
  },
  scannerShell: {
    width: '100%',
    minWidth: 0
  },
  scannerContainer: {
    width: '100%',
    margin: '0 auto',
    minWidth: 0,
    overflow: 'hidden',
    borderRadius: '14px',
    border: '1px solid #e5e7eb',
    background: '#f8fafc'
  },
  scannerContainerWide: {
    maxWidth: 460
  },
  scannerContainerSquare: {
    maxWidth: 400
  },
  panel: {
    minWidth: 0,
    overflow: 'hidden'
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap',
    minWidth: 0
  },
  panelHeaderText: {
    minWidth: 0
  },
  panelTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700,
    wordBreak: 'break-word'
  },
  panelSubtitle: {
    margin: '8px 0 0 0',
    color: '#6b7280',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  formGrid: {
    display: 'grid',
    gap: '14px',
    minWidth: 0
  },
  formField: {
    display: 'grid',
    gap: '8px',
    minWidth: 0
  },
  label: {
    fontWeight: 700,
    color: '#334155'
  },
  input: {
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
    boxSizing: 'border-box',
    border: '1px solid #d1d5db',
    borderRadius: '12px',
    padding: '12px 14px',
    fontSize: '14px',
    background: '#ffffff'
  },
  formActions: {
    minWidth: 0
  },
  resultGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '12px',
    minWidth: 0
  },
  resultCard: {
    border: '1px solid #e5e7eb',
    background: '#f8fafc',
    borderRadius: '12px',
    padding: '14px',
    minWidth: 0
  },
  resultCardSuccess: {
    border: '1px solid #bbf7d0',
    background: '#f0fdf4',
    borderRadius: '12px',
    padding: '14px',
    minWidth: 0
  },
  resultLabel: {
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#64748b',
    marginBottom: '8px'
  },
  resultValue: {
    color: '#0f172a',
    lineHeight: 1.5,
    wordBreak: 'break-all'
  }
};