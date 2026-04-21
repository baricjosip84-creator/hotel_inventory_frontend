import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
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
    setResolvedProductName(match.product_name || null);

    const params = new URLSearchParams();
    params.set('shipmentId', match.shipment_id);
    params.set('itemId', match.shipment_item_id);
    params.set('scannedBarcode', decodedText);

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
    <div style={{ padding: 20 }}>
      <h2>{modeLabel(mode)}</h2>

      <p style={{ marginBottom: 16, color: '#4b5563', lineHeight: 1.6 }}>
        {modeDescription(mode)}
      </p>

      {mode === 'product' ? (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 12,
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1d4ed8'
          }}
        >
          <strong>Selected shipment:</strong>
          <div style={{ marginTop: 4, wordBreak: 'break-all' }}>
            {shipmentId || 'Missing shipment ID'}
          </div>
          <div style={{ marginTop: 8 }}>
            <strong>Default scan location:</strong>
            <div style={{ marginTop: 4, wordBreak: 'break-all' }}>
              {locationId || 'Missing default location'}
            </div>
          </div>
        </div>
      ) : null}

      <div
        style={{
          marginBottom: 14,
          padding: 12,
          borderRadius: 12,
          background: mode === 'product' ? '#fff7ed' : '#eff6ff',
          border: mode === 'product' ? '1px solid #fdba74' : '1px solid #bfdbfe',
          color: mode === 'product' ? '#9a3412' : '#1d4ed8',
          lineHeight: 1.6
        }}
      >
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

      <div style={{ marginBottom: 10 }}>
        <button onClick={() => void startScanner()} disabled={isRunning || isResolving || isDecodingImage}>
          {isRunning ? 'Scanner Running' : 'Start Scanner'}
        </button>

        <button
          onClick={() => void stopScanner()}
          disabled={!isRunning}
          style={{ marginLeft: 10 }}
        >
          Stop Scanner
        </button>
      </div>

      {error && (
        <div style={{ color: 'red', marginBottom: 10 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {isResolving && (
        <div style={{ marginBottom: 10, color: '#1d4ed8' }}>
          {mode === 'product'
            ? 'Resolving product barcode in selected shipment...'
            : 'Resolving shipment from scanned QR code...'}
        </div>
      )}

      {isDecodingImage && (
        <div style={{ marginBottom: 10, color: '#1d4ed8' }}>
          Decoding image...
        </div>
      )}

      <div
        id="scanner-container"
        style={{
          width: '100%',
          maxWidth: mode === 'product' ? 460 : 400,
          margin: '0 auto 20px'
        }}
      />

      <div
        style={{
          marginTop: 10,
          padding: 16,
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          background: '#ffffff'
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>
          Manual / Fallback Options
        </h3>

        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label
              htmlFor="manual-code-input"
              style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}
            >
              Enter code manually
            </label>
            <input
              ref={manualInputRef}
              id="manual-code-input"
              type="text"
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              placeholder={mode === 'product' ? 'Enter product barcode' : 'Enter shipment QR text'}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                border: '1px solid #d1d5db',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 14
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => void handleManualSubmit()}
              disabled={isResolving || isDecodingImage}
            >
              Submit Manual Code
            </button>

            <button
              type="button"
              onClick={handleChooseImage}
              disabled={isResolving || isDecodingImage}
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
      </div>

      {result && (
        <div style={{ marginTop: 20 }}>
          <strong>Decoded Value:</strong>
          <div>{result}</div>
        </div>
      )}

      {resolvedShipmentId && (
        <div style={{ marginTop: 12, color: '#166534' }}>
          <strong>Resolved Shipment ID:</strong>
          <div>{resolvedShipmentId}</div>
        </div>
      )}

      {resolvedShipmentItemId && (
        <div style={{ marginTop: 12, color: '#166534' }}>
          <strong>Resolved Shipment Item ID:</strong>
          <div>{resolvedShipmentItemId}</div>
        </div>
      )}

      {resolvedProductName && (
        <div style={{ marginTop: 12, color: '#166534' }}>
          <strong>Matched Product:</strong>
          <div>{resolvedProductName}</div>
        </div>
      )}
    </div>
  );
}