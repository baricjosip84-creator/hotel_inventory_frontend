import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties, FormEvent } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useNavigate, useSearchParams } from 'react-router';
import { apiRequest, ApiError } from '../lib/api';
import { TENANT_PERMISSIONS, hasPermission } from '../lib/permissions';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';

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

    const audioWindow = window as Window & {
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioContextClass = window.AudioContext || audioWindow.webkitAudioContext;

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
    requires_lot_tracking?: boolean;
    requires_expiry_date?: boolean;
  };
  serial_tracking?: {
    enabled: boolean;
    require_on_receipt: boolean;
  };
  match_source?: 'label' | 'package' | 'product';
  package?: {
    id: string;
    package_name: string;
    barcode: string;
    units_per_package: number | string;
    is_default: boolean;
  } | null;
  label?: {
    id: string;
    barcode_value: string;
    lot_number?: string | null;
    batch_number?: string | null;
    expiry_date?: string | null;
  } | null;
  calculated?: {
    remaining_quantity: number | string;
    remaining_packages_estimate: number | string;
    can_receive_one_full_package: boolean;
  };
};

type ScannerMode = 'shipment' | 'product';

const MAX_SCANNED_CODE_LENGTH = 512;
const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;

function scannerResolutionError(error: unknown, mode: ScannerMode): string {
  if (error instanceof ApiError) {
    if (error.code === 'SHIPMENT_NOT_FOUND') {
      return 'No shipment matches this QR code.';
    }

    if (error.code === 'SHIPMENT_PRODUCT_NOT_FOUND') {
      return 'This barcode does not match an active item in the selected shipment.';
    }

    if (error.code === 'SHIPMENT_RECEIVING_CLOSED') {
      return 'This shipment is already finalized. Barcode receiving is closed.';
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return mode === 'product'
    ? 'The barcode could not be resolved in the selected shipment.'
    : 'The shipment QR code could not be resolved.';
}

function cameraStartError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : '';
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || message.includes('permission')) {
    return 'Camera permission was denied. Allow camera access in the browser, or use manual entry or image upload.';
  }

  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No usable camera was found on this device. Use manual entry or image upload.';
  }

  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'The camera is busy or unavailable. Close other camera applications and try again.';
  }

  if (name === 'OverconstrainedError') {
    return 'The requested rear camera is unavailable. The scanner could not open another suitable camera.';
  }

  return 'The camera could not be started. Check browser permission, HTTPS, and whether another application is using the camera.';
}

function shouldRetryWithSoftCameraConstraint(error: unknown): boolean {
  const name = error instanceof DOMException ? error.name : '';

  if (
    name === 'NotAllowedError' ||
    name === 'PermissionDeniedError' ||
    name === 'NotReadableError' ||
    name === 'TrackStartError'
  ) {
    return false;
  }

  // Exact rear-camera selection varies by browser/device. For every other
  // start failure, try once more with the softer environment preference.
  return true;
}

function modeLabel(mode: ScannerMode): string {
  return mode === 'product' ? 'Receiving Barcode Scanner' : 'Shipment QR Scanner';
}

function modeDescription(mode: ScannerMode): string {
  return mode === 'product'
    ? 'Scan a product, package, or inventory label barcode for the currently selected shipment.'
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
    REVIEWED SCANNER WORKSPACE
    --------------------------
    The page supports shipment QR lookup and shipment-context barcode receiving.
    It keeps live-camera, manual-entry, image-decode, and navigation contracts,
    while adding production guardrails for permissions, required receiving context,
    duplicate decode suppression, secure-camera readiness, upload size/type checks,
    handheld scanner Enter submission, and success feedback only after a code resolves.
  */
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scanInFlightRef = useRef(false);
  const cameraDecodeLockRef = useRef(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const mode = (searchParams.get('mode') === 'product' ? 'product' : 'shipment') as ScannerMode;
  const shipmentId = searchParams.get('shipmentId') || '';
  const locationId = searchParams.get('locationId') || '';
  const shipmentLabel = searchParams.get('shipmentLabel') || '';
  const locationName = searchParams.get('locationName') || '';
  const canReceiveShipments = hasPermission(TENANT_PERMISSIONS.SHIPMENTS_RECEIVE);
  const isProductContextMissing = mode === 'product' && (!shipmentId || !locationId);
  const isProductPermissionMissing = mode === 'product' && !canReceiveShipments;
  const productModeUnavailableReason = mode !== 'product'
    ? null
    : isProductPermissionMissing
      ? 'Shipment receive permission is required for the receiving barcode scanner.'
      : !shipmentId
        ? 'Select a shipment before opening the receiving barcode scanner.'
        : !locationId
          ? 'Select a default storage location before opening the receiving barcode scanner.'
          : null;
  const secureCameraContext = typeof window === 'undefined' ? true : window.isSecureContext;
  const cameraApiAvailable = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
  const liveCameraUnavailableReason = !secureCameraContext
    ? 'Live camera scanning requires HTTPS. Manual entry and image upload remain available.'
    : !cameraApiAvailable
      ? 'This browser does not provide camera access. Manual entry and image upload remain available.'
      : null;

  const [isRunning, setIsRunning] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [resolvedShipmentId, setResolvedShipmentId] = useState<string | null>(null);
  const [resolvedShipmentItemId, setResolvedShipmentItemId] = useState<string | null>(null);
  const [resolvedProductName, setResolvedProductName] = useState<string | null>(null);
  const [resolvedPackageName, setResolvedPackageName] = useState<string | null>(null);
  const [resolvedUnitsPerPackage, setResolvedUnitsPerPackage] = useState<string | null>(null);
  const [resolvedLabel, setResolvedLabel] = useState<ProductBarcodeLookupResponse['label']>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isDecodingImage, setIsDecodingImage] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const scannerInputDisabled = isResolving || isDecodingImage || isProductContextMissing || isProductPermissionMissing;
  const liveScannerDisabled = isRunning || isStartingCamera || scannerInputDisabled || Boolean(liveCameraUnavailableReason);
  const manualSubmitDisabled = scannerInputDisabled || !manualCode.trim();

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
    playSuccessFeedback();
    navigate(`/shipments?shipmentId=${encodeURIComponent(shipment.id)}`);
  };

  const resolveProductBarcode = async (decodedText: string) => {
    if (!shipmentId) {
      throw new Error('No shipment selected for barcode receiving.');
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
    setResolvedLabel(match.label || null);

    const params = new URLSearchParams();
    params.set('shipmentId', match.shipment_id);
    params.set('itemId', match.shipment_item_id);
    params.set('scannedBarcode', decodedText);

    if (match.match_source) {
      params.set('matchSource', match.match_source);
    }

    if (match.label?.id) {
      params.set('barcodeLabelId', match.label.id);
      params.set('labelBarcode', match.label.barcode_value);
      if (match.label.lot_number) params.set('labelLot', match.label.lot_number);
      if (match.label.batch_number) params.set('labelBatch', match.label.batch_number);
      if (match.label.expiry_date) params.set('labelExpiry', match.label.expiry_date);
    }

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

    if (match.product?.requires_lot_tracking) {
      params.set('requiresLotTracking', 'true');
    }

    if (match.product?.requires_expiry_date) {
      params.set('requiresExpiryDate', 'true');
    }

    if (match.serial_tracking?.require_on_receipt) {
      params.set('requiresSerialOnReceipt', 'true');
    }

    params.set('locationId', locationId);

    playSuccessFeedback();
    navigate(`/shipments?${params.toString()}`);
  };

  const resolveDecodedValue = async (decodedText: string) => {
    if (scanInFlightRef.current) {
      return;
    }

    const cleanValue = decodedText.trim();

    if (!cleanValue) {
      setError('The scanned code is empty. Try again or enter the code manually.');
      return;
    }

    if (cleanValue.length > MAX_SCANNED_CODE_LENGTH) {
      setError(`The scanned code is longer than the supported ${MAX_SCANNED_CODE_LENGTH} characters.`);
      return;
    }

    scanInFlightRef.current = true;
    setResult(cleanValue);
    setResolvedShipmentId(null);
    setResolvedShipmentItemId(null);
    setResolvedProductName(null);
    setResolvedPackageName(null);
    setResolvedUnitsPerPackage(null);
    setResolvedLabel(null);
    setError(null);
    setIsResolving(true);

    try {
      if (mode === 'product') {
        await resolveProductBarcode(cleanValue);
      } else {
        await resolveShipmentCode(cleanValue);
      }
    } catch (err) {
      setError(scannerResolutionError(err, mode));
    } finally {
      scanInFlightRef.current = false;
      setIsResolving(false);
    }
  };

  const handleResolvedScan = async (decodedText: string) => {
    if (cameraDecodeLockRef.current) {
      return;
    }

    cameraDecodeLockRef.current = true;

    try {
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
    } finally {
      cameraDecodeLockRef.current = false;
    }
  };

  const startScanner = async () => {
    setError(null);

    if (productModeUnavailableReason) {
      setError(productModeUnavailableReason);
      return;
    }

    if (liveCameraUnavailableReason) {
      setError(liveCameraUnavailableReason);
      return;
    }
    setResult(null);
    setResolvedShipmentId(null);
    setResolvedShipmentItemId(null);
    setResolvedProductName(null);
    setResolvedPackageName(null);
    setResolvedUnitsPerPackage(null);
    setResolvedLabel(null);
    setIsStartingCamera(true);

    const availableWidth = typeof window === 'undefined'
      ? 420
      : Math.max(240, window.innerWidth - 72);
    const productScanWidth = Math.max(220, Math.min(360, availableWidth));
    const shipmentScanSize = Math.max(200, Math.min(280, availableWidth));
    const scanConfig = mode === 'product'
      ? {
          fps: 15,
          aspectRatio: 1.7777778,
          qrbox: {
            width: productScanWidth,
            height: Math.max(110, Math.round(productScanWidth * 0.44))
          },
          disableFlip: false
        }
      : {
          fps: 10,
          qrbox: shipmentScanSize,
          disableFlip: false
        };

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
        scanConfig,
        (decodedText) => {
          if (!scanInFlightRef.current) {
            void handleResolvedScan(decodedText);
          }
        },
        () => {}
      );

      setIsRunning(true);
    } catch (initialError) {
      if (!shouldRetryWithSoftCameraConstraint(initialError)) {
        await stopScanner();
        setError(cameraStartError(initialError));
        setIsStartingCamera(false);
        return;
      }

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
          scanConfig,
          (decodedText) => {
            if (!scanInFlightRef.current) {
              void handleResolvedScan(decodedText);
            }
          },
          () => {}
        );

        setIsRunning(true);
      } catch (err) {
        await stopScanner();
        setError(cameraStartError(err));
      }
    } finally {
      setIsStartingCamera(false);
    }
  };

  const handleManualSubmit = async () => {
    const trimmed = manualCode.trim();

    if (productModeUnavailableReason) {
      setError(productModeUnavailableReason);
      return;
    }

    if (!trimmed) {
      setError('Enter a code first.');
      return;
    }

    await stopScanner();
    await resolveDecodedValue(trimmed);
  };

  const handleChooseImage = () => {
    if (productModeUnavailableReason) {
      setError(productModeUnavailableReason);
      return;
    }

    fileInputRef.current?.click();
  };

  const handleImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Choose an image file containing a QR code or barcode.');
      event.target.value = '';
      return;
    }

    if (file.size <= 0 || file.size > MAX_IMAGE_UPLOAD_BYTES) {
      setError('Choose an image smaller than 10 MB.');
      event.target.value = '';
      return;
    }

    setError(null);
    setIsDecodingImage(true);
    let imageScanner: Html5Qrcode | null = null;

    try {
      await stopScanner();

      imageScanner = new Html5Qrcode('scanner-container', {
        formatsToSupport: getFormatsToSupport(mode),
        verbose: false
      });

      const decodedText = await imageScanner.scanFile(file, true);
      await resolveDecodedValue(decodedText);
    } catch {
      setError('No supported code could be decoded from this image. Try a sharper image or enter the value manually.');
    } finally {
      if (imageScanner) {
        try {
          await imageScanner.clear();
        } catch {
          // Ignore cleanup errors for the temporary image scanner.
        }
      }

      setIsDecodingImage(false);
      event.target.value = '';
    }
  };

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, []);

  return (
    <div className="io-scanner-page" style={styles.page}>
      <section className="app-panel app-panel--padded io-page-hero-panel" style={styles.heroPanel}>
        <div style={styles.heroHeader}>
          <div className="io-page-intro" style={styles.heroTextBlock}>
            <span className="io-page-intro__icon"><TenantNavIcon path="/scanner" size={24} /></span>
            <div className="io-page-intro__copy">
              <h2 style={styles.title}>{modeLabel(mode)}</h2>
              <p style={styles.description}>{modeDescription(mode)}</p>
            </div>
          </div>

          <span style={mode === 'product' ? styles.modeBadgeWarn : styles.modeBadgeInfo}>
            {mode === 'product' ? 'RECEIVING MODE' : 'SHIPMENT MODE'}
          </span>
        </div>

        {mode === 'product' ? (
          <div style={styles.contextPanel}>
            <div style={styles.contextGrid}>
              <div style={shipmentId ? styles.contextCard : styles.contextCardWarn}>
                <div style={styles.contextLabel}>Selected shipment</div>
                <div style={styles.contextValue}>{shipmentLabel || shipmentId || 'Missing shipment ID'}</div>
                {shipmentLabel && shipmentId ? (
                  <div style={styles.contextMeta}>Shipment ID: {shipmentId}</div>
                ) : null}
              </div>

              <div style={locationId ? styles.contextCard : styles.contextCardWarn}>
                <div style={styles.contextLabel}>Default scan location</div>
                <div style={styles.contextValue}>{locationName || locationId || 'Missing default location'}</div>
                {locationName && locationId ? (
                  <div style={styles.contextMeta}>Location ID: {locationId}</div>
                ) : null}
              </div>

              <div style={styles.contextCard}>
                <div style={styles.contextLabel}>Return path</div>
                <button
                  type="button"
                  onClick={() => navigate(shipmentId ? `/shipments?shipmentId=${encodeURIComponent(shipmentId)}` : '/shipments')}
                  style={styles.inlineButton}
                >
                  {shipmentId ? 'Open selected shipment' : 'Open shipments'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {mode === 'product' && productModeUnavailableReason ? (
          <div className="app-warning-state" style={styles.infoBanner}>
            {productModeUnavailableReason} Open the scanner from the Shipments page to preserve the selected shipment and destination.
          </div>
        ) : null}

        <div style={styles.statusStrip}>
          <div style={styles.statusItem}>
            <span style={styles.statusLabel}>Mode</span>
            <strong>{mode === 'product' ? 'Receiving barcode' : 'Shipment QR lookup'}</strong>
          </div>
          <div style={styles.statusItem}>
            <span style={styles.statusLabel}>Camera</span>
            <strong style={liveCameraUnavailableReason ? styles.statusWarnText : styles.statusSuccessText}>
              {liveCameraUnavailableReason ? 'Unavailable' : 'Ready'}
            </strong>
          </div>
          <div style={styles.statusItem}>
            <span style={styles.statusLabel}>Fallback</span>
            <strong>Manual entry or image</strong>
          </div>
        </div>

        <div style={mode === 'product' ? styles.operationNoticeWarn : styles.operationNoticeInfo}>
          {mode === 'product'
            ? 'A successful barcode scan returns to the selected shipment. Standard items are received immediately; tracked items pause for any required serial, lot/batch, or expiry details.'
            : 'Shipment QR lookup only opens the matching shipment. It does not change stock.'}
        </div>

        {mode === 'shipment' ? (
          <div style={styles.receivingHint}>
            <div>
              <strong>Receiving products by barcode?</strong>
              <div style={styles.receivingHintText}>Open a shipment, choose the receiving location, then use its Scan Barcode action.</div>
            </div>
            <button type="button" onClick={() => navigate('/shipments')} style={styles.secondaryButton}>
              Open Shipments
            </button>
          </div>
        ) : null}

        <details style={styles.helpDetails}>
          <summary style={styles.helpSummary}>Scanning help</summary>
          <div style={styles.helpBody}>
            {mode === 'product' ? (
              <>
                <div>Hold the barcode horizontally inside the wide scan area and avoid glare.</div>
                <div>Move slightly farther back if a 1D barcode will not focus.</div>
              </>
            ) : (
              <div>Center the shipment QR code inside the square scan area.</div>
            )}
            <div>If live scan fails, use manual entry or image upload below.</div>
            <div>Live camera scanning requires HTTPS and browser camera permission.</div>
          </div>
        </details>

        <div className="app-actions" style={styles.actionGrid}>
          <button
            onClick={() => void startScanner()}
            disabled={liveScannerDisabled}
            title={productModeUnavailableReason || liveCameraUnavailableReason || undefined}
            style={{
              ...styles.primaryButton,
              ...(liveScannerDisabled ? styles.disabledButton : {})
            }}
          >
            {isStartingCamera ? 'Starting Camera...' : isRunning ? 'Scanner Running' : 'Start Camera Scanner'}
          </button>

          <button
            onClick={() => void stopScanner()}
            disabled={!isRunning}
            style={{
              ...styles.secondaryButton,
              ...(!isRunning ? styles.disabledButton : {})
            }}
          >
            Stop Camera Scanner
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
              ? 'Resolving barcode in selected shipment...'
              : 'Resolving shipment from scanned QR code...'}
          </div>
        ) : null}

        {isDecodingImage ? (
          <div className="app-warning-state" style={styles.infoBanner}>Decoding image...</div>
        ) : null}

        <div style={styles.scannerShell}>
          <div style={styles.scannerStatus}>
            {isStartingCamera
              ? 'Requesting camera access...'
              : isRunning
                ? 'Camera is active. Hold one code inside the highlighted scan area.'
                : 'Camera preview appears here after Start Camera Scanner.'}
          </div>
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
          <div className="io-section-heading-with-icon" style={styles.panelHeaderText}>
            <span className="io-section-heading-icon"><TenantNavIcon path="/scanner" size={17} /></span>
            <div className="io-section-heading-copy">
              <h3 style={styles.panelTitle}>Manual Entry or Image</h3>
              <p style={styles.panelSubtitle}>
                Use a typed/scanned code or upload an image when the live camera is not practical.
              </p>
            </div>
          </div>
        </div>

        <form
          style={styles.formGrid}
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void handleManualSubmit();
          }}
        >
          <div style={styles.formField}>
            <label htmlFor="manual-code-input" style={styles.label}>
              Enter code manually
            </label>
            <input
              id="manual-code-input"
              type="text"
              value={manualCode}
              maxLength={MAX_SCANNED_CODE_LENGTH}
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="go"
              onChange={(event) => setManualCode(event.target.value)}
              placeholder={mode === 'product' ? 'Enter product, package, or inventory-label barcode' : 'Enter shipment QR text'}
              disabled={scannerInputDisabled}
              title={productModeUnavailableReason || undefined}
              style={{
                ...styles.input,
                ...(scannerInputDisabled ? styles.disabledInput : {})
              }}
            />
            <div style={styles.fieldHelper}>
              Type or paste the exact value. A USB or Bluetooth handheld scanner can enter the code here and submit with Enter.
            </div>
          </div>

          <div className="app-actions" style={styles.formActions}>
            <button
              type="submit"
              data-skip-global-action-feedback="true"
              disabled={manualSubmitDisabled}
              title={
                productModeUnavailableReason
                  ? productModeUnavailableReason
                  : !manualCode.trim()
                    ? 'Enter a barcode first'
                    : undefined
              }
              style={{
                ...styles.primaryButton,
                ...(manualSubmitDisabled ? styles.disabledButton : {})
              }}
            >
              Submit Manual Code
            </button>

            <button
              type="button"
              data-skip-global-action-feedback="true"
              onClick={handleChooseImage}
              disabled={scannerInputDisabled}
              title={productModeUnavailableReason || undefined}
              style={{
                ...styles.secondaryButton,
                ...(scannerInputDisabled ? styles.disabledButton : {})
              }}
            >
              Upload Image
            </button>
          </div>
          <div style={styles.fieldHelper}>Image upload is decoded only in this browser. Maximum file size: 10 MB.</div>
        </form>

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

      {result || resolvedShipmentId || resolvedShipmentItemId || resolvedProductName || resolvedPackageName || resolvedLabel ? (
        <section className="app-panel app-panel--padded" style={styles.panel}>
          <div style={styles.panelHeader}>
            <div className="io-section-heading-with-icon" style={styles.panelHeaderText}>
              <span className="io-section-heading-icon"><TenantNavIcon path="/scanner" size={17} /></span>
              <div className="io-section-heading-copy">
                <h3 style={styles.panelTitle}>Latest Scan Result</h3>
                <p style={styles.panelSubtitle}>
                  The last decoded value remains visible when resolution fails, so the operator can verify or correct it.
                </p>
              </div>
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

            {resolvedLabel ? (
              <div style={styles.resultCardSuccess}>
                <div style={styles.resultLabel}>Matched inventory label</div>
                <div style={styles.resultValue}>
                  {resolvedLabel.barcode_value}
                  {resolvedLabel.lot_number ? ` · Lot ${resolvedLabel.lot_number}` : ''}
                  {resolvedLabel.batch_number ? ` · Batch ${resolvedLabel.batch_number}` : ''}
                  {resolvedLabel.expiry_date ? ` · Expires ${new Date(resolvedLabel.expiry_date).toLocaleDateString()}` : ''}
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
    fontWeight: 800,
    color: '#0f172a',
    wordBreak: 'break-word'
  },
  description: {
    margin: '8px 0 0 0',
    color: '#64748b',
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
  contextCardWarn: {
    background: '#fff7ed',
    border: '1px solid #fdba74',
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
    fontWeight: 700,
    wordBreak: 'break-word'
  },
  contextMeta: {
    marginTop: '6px',
    color: '#475569',
    fontSize: '12px',
    lineHeight: 1.45,
    wordBreak: 'break-all'
  },
  statusStrip: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    background: '#f8fafc',
    overflow: 'hidden',
    minWidth: 0
  },
  statusItem: {
    display: 'grid',
    gap: '4px',
    padding: '12px 14px',
    borderRight: '1px solid #e2e8f0',
    minWidth: 0
  },
  statusLabel: {
    color: '#64748b',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.05em',
    textTransform: 'uppercase'
  },
  statusSuccessText: {
    color: '#166534'
  },
  statusWarnText: {
    color: '#9a3412'
  },
  operationNoticeInfo: {
    padding: '11px 13px',
    borderRadius: '10px',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    color: '#1e40af',
    lineHeight: 1.5
  },
  operationNoticeWarn: {
    padding: '11px 13px',
    borderRadius: '10px',
    background: '#fff7ed',
    border: '1px solid #fdba74',
    color: '#9a3412',
    lineHeight: 1.5,
    fontWeight: 600
  },
  receivingHint: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    padding: '12px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    background: '#ffffff'
  },
  receivingHintText: {
    marginTop: '4px',
    color: '#64748b',
    fontSize: '13px',
    lineHeight: 1.45
  },
  helpDetails: {
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    background: '#ffffff',
    padding: '0 12px'
  },
  helpSummary: {
    cursor: 'pointer',
    padding: '10px 0',
    color: '#334155',
    fontWeight: 700
  },
  helpBody: {
    display: 'grid',
    gap: '5px',
    padding: '0 0 12px 0',
    color: '#64748b',
    fontSize: '13px',
    lineHeight: 1.5
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
    borderRadius: '10px',
    padding: '11px 14px',
    background: '#2563eb',
    color: '#ffffff',
    fontWeight: 700,
    cursor: 'pointer'
  },
  secondaryButton: {
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    padding: '11px 14px',
    background: '#ffffff',
    color: '#0f172a',
    fontWeight: 700,
    cursor: 'pointer'
  },
  inlineButton: {
    border: '1px solid #93c5fd',
    borderRadius: '10px',
    padding: '8px 10px',
    background: '#ffffff',
    color: '#1d4ed8',
    fontWeight: 800,
    cursor: 'pointer'
  },
  disabledButton: {
    opacity: 0.55,
    cursor: 'not-allowed'
  },
  errorBanner: {
    lineHeight: 1.5
  },
  infoBanner: {
    lineHeight: 1.5
  },
  scannerShell: {
    width: '100%',
    minWidth: 0,
    display: 'grid',
    gap: '8px'
  },
  scannerStatus: {
    color: '#64748b',
    fontSize: '13px',
    lineHeight: 1.45
  },
  scannerContainer: {
    width: '100%',
    margin: '0 auto',
    minWidth: 0,
    overflow: 'hidden',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
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
    color: '#64748b',
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
  fieldHelper: {
    color: '#64748b',
    fontSize: '12px',
    lineHeight: 1.45
  },
  input: {
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
    boxSizing: 'border-box',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    padding: '11px 12px',
    fontSize: '14px',
    background: '#ffffff'
  },
  disabledInput: {
    background: '#f3f4f6',
    color: '#64748b',
    cursor: 'not-allowed'
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
    border: '1px solid #e2e8f0',
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