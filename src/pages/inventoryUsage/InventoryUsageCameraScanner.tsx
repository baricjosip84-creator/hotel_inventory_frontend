import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const SUPPORTED_FORMATS: Html5QrcodeSupportedFormats[] = [
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

const REQUIRED_MATCHING_DECODE_COUNT = 2;
const DECODE_CONFIRMATION_WINDOW_MS = 1800;

type DecodeCandidate = {
  value: string;
  count: number;
  lastSeenAt: number;
};

type InventoryUsageCameraScannerProps = {
  disabled?: boolean;
  onDecoded: (barcode: string) => void;
};

const formatScannerError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error || '');
  const normalized = message.toLowerCase();

  if (normalized.includes('permission') || normalized.includes('notallowederror')) {
    return 'Camera access was denied. Allow camera access in the browser and try again.';
  }

  if (normalized.includes('notfounderror') || normalized.includes('requested device not found')) {
    return 'No usable camera was found on this device.';
  }

  if (normalized.includes('notreadableerror') || normalized.includes('could not start video source')) {
    return 'The camera is already in use by another application or browser tab.';
  }

  return message || 'Could not start the camera scanner.';
};

const playScanFeedback = () => {
  try {
    navigator.vibrate?.(120);
  } catch {
    // Vibration is optional and must never block a successful decode.
  }
};

export function InventoryUsageCameraScanner({
  disabled = false,
  onDecoded
}: InventoryUsageCameraScannerProps) {
  const reactId = useId();
  const scannerContainerId = `inventory-usage-camera-${reactId.replace(/:/g, '')}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const startingRef = useRef(false);
  const decodeLockedRef = useRef(false);
  const decodeCandidateRef = useRef<DecodeCandidate>({ value: '', count: 0, lastSeenAt: 0 });
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isDecodingImage, setIsDecodingImage] = useState(false);
  const [decodedValue, setDecodedValue] = useState('');
  const [candidateValue, setCandidateValue] = useState('');
  const [confirmationCount, setConfirmationCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (scanner) {
      try {
        await scanner.stop();
      } catch {
        // Ignore stop errors when the scanner has already stopped.
      }

      try {
        await scanner.clear();
      } catch {
        // Ignore cleanup errors during scanner shutdown.
      }
    }

    setIsRunning(false);
    setIsStarting(false);
    startingRef.current = false;
  };

  const resetDecodeCandidate = () => {
    decodeCandidateRef.current = { value: '', count: 0, lastSeenAt: 0 };
    setCandidateValue('');
    setConfirmationCount(0);
  };

  const confirmDecodedValue = async (rawValue: string) => {
    const value = rawValue.trim();

    if (!value || decodeLockedRef.current) {
      return;
    }

    decodeLockedRef.current = true;
    playScanFeedback();
    await stopScanner();
    setDecodedValue(value);
    setCandidateValue('');
    setConfirmationCount(0);
    setError(null);
    onDecoded(value);
  };

  const handleCameraDecode = (rawValue: string) => {
    const value = rawValue.trim();

    if (!value || decodeLockedRef.current) {
      return;
    }

    const now = Date.now();
    const previous = decodeCandidateRef.current;
    const isRepeatedCandidate = previous.value === value
      && now - previous.lastSeenAt <= DECODE_CONFIRMATION_WINDOW_MS;
    const count = isRepeatedCandidate ? previous.count + 1 : 1;

    decodeCandidateRef.current = { value, count, lastSeenAt: now };
    setCandidateValue(value);
    setConfirmationCount(count);
    setError(null);

    if (count >= REQUIRED_MATCHING_DECODE_COUNT) {
      void confirmDecodedValue(value);
    }
  };

  const startScanner = async () => {
    if (disabled || startingRef.current || isRunning) {
      return;
    }

    startingRef.current = true;
    decodeLockedRef.current = false;
    resetDecodeCandidate();
    setDecodedValue('');
    setError(null);
    setIsStarting(true);

    const createScanner = () => new Html5Qrcode(scannerContainerId, {
      formatsToSupport: SUPPORTED_FORMATS,
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      verbose: false
    });

    const scannerConfig = {
      fps: 20,
      aspectRatio: 1.7777778,
      qrbox: (viewfinderWidth: number, viewfinderHeight: number) => ({
        width: Math.min(viewfinderWidth, Math.max(180, Math.floor(viewfinderWidth * 0.92))),
        height: Math.min(viewfinderHeight, Math.max(100, Math.floor(viewfinderHeight * 0.42)))
      }),
      disableFlip: false
    };

    try {
      await stopScanner();
      startingRef.current = true;
      setIsStarting(true);

      const scanner = createScanner();
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: { exact: 'environment' } },
          scannerConfig,
          handleCameraDecode,
          () => {}
        );
      } catch {
        await stopScanner();
        startingRef.current = true;
        setIsStarting(true);

        const fallbackScanner = createScanner();
        scannerRef.current = fallbackScanner;
        await fallbackScanner.start(
          { facingMode: 'environment' },
          scannerConfig,
          handleCameraDecode,
          () => {}
        );
      }

      setIsRunning(true);
      setIsStarting(false);
      startingRef.current = false;
    } catch (scannerError) {
      await stopScanner();
      setError(formatScannerError(scannerError));
    }
  };

  const openAndStartScanner = () => {
    if (disabled) {
      return;
    }

    setIsOpen(true);
    window.setTimeout(() => {
      void startScanner();
    }, 0);
  };

  const closeScanner = async () => {
    await stopScanner();
    setIsOpen(false);
    setError(null);
    setDecodedValue('');
    resetDecodeCandidate();
    decodeLockedRef.current = false;
  };

  const handleImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError(null);
    setDecodedValue('');
    resetDecodeCandidate();
    setIsDecodingImage(true);
    decodeLockedRef.current = false;

    try {
      await stopScanner();
      const imageScanner = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: SUPPORTED_FORMATS,
        verbose: false
      });
      scannerRef.current = imageScanner;
      const value = await imageScanner.scanFile(file, true);
      await confirmDecodedValue(value);
    } catch (imageError) {
      await stopScanner();
      setError(imageError instanceof Error && imageError.message
        ? imageError.message
        : 'No supported barcode or QR code could be decoded from that image.');
    } finally {
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
    <div style={cameraStyles.wrapper}>
      <button
        type="button"
        data-skip-global-action-feedback="true"
        style={{
          ...cameraStyles.scanButton,
          ...(disabled ? cameraStyles.disabledButton : {})
        }}
        onClick={openAndStartScanner}
        disabled={disabled}
        title={disabled ? 'Quick-consume permission is required before scanning' : 'Open this device camera and scan a barcode'}
      >
        Scan with camera
      </button>

      <span style={cameraStyles.fallbackText}>or paste/type the value</span>

      {isOpen ? (
        <div style={cameraStyles.panel}>
          <div style={cameraStyles.header}>
            <div>
              <strong style={cameraStyles.title}>Camera barcode scanner</strong>
              <p style={cameraStyles.description}>
                Use this phone, tablet, or computer camera. No separate scanner is required.
              </p>
            </div>
            <button
              type="button"
              data-skip-global-action-feedback="true"
              style={cameraStyles.secondaryButton}
              onClick={() => void closeScanner()}
            >
              Close
            </button>
          </div>

          <div style={cameraStyles.actions}>
            <button
              type="button"
              data-skip-global-action-feedback="true"
              style={{
                ...cameraStyles.primaryButton,
                ...((isRunning || isStarting || isDecodingImage) ? cameraStyles.disabledButton : {})
              }}
              onClick={() => void startScanner()}
              disabled={isRunning || isStarting || isDecodingImage}
            >
              {isStarting ? 'Starting camera...' : isRunning ? 'Camera running' : 'Start camera'}
            </button>
            <button
              type="button"
              data-skip-global-action-feedback="true"
              style={{
                ...cameraStyles.secondaryButton,
                ...(!isRunning ? cameraStyles.disabledButton : {})
              }}
              onClick={() => void stopScanner()}
              disabled={!isRunning}
            >
              Stop camera
            </button>
            <button
              type="button"
              data-skip-global-action-feedback="true"
              style={{
                ...cameraStyles.secondaryButton,
                ...((isStarting || isDecodingImage) ? cameraStyles.disabledButton : {})
              }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isStarting || isDecodingImage}
            >
              {isDecodingImage ? 'Decoding image...' : 'Scan from image'}
            </button>
          </div>

          <div style={cameraStyles.scannerShell}>
            <div id={scannerContainerId} style={cameraStyles.scannerContainer} />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(event) => void handleImageFileChange(event)}
          />

          {error ? <p style={cameraStyles.errorText}>{error}</p> : null}
          {!decodedValue && candidateValue ? (
            <p style={cameraStyles.confirmationText}>
              Detected <strong>{candidateValue}</strong>. Hold the camera still while the same value is confirmed
              {' '}({Math.min(confirmationCount, REQUIRED_MATCHING_DECODE_COUNT)}/{REQUIRED_MATCHING_DECODE_COUNT}).
            </p>
          ) : null}
          {decodedValue ? (
            <p style={cameraStyles.successText}>
              Barcode captured: <strong>{decodedValue}</strong>. It has been placed in the Barcode field; preview stock impact before recording.
            </p>
          ) : (
            <p style={cameraStyles.helpText}>
              Fill most of the wide scan area with one Code 128, EAN, UPC, QR, or other supported inventory barcode and hold it still. The scanner accepts a camera result only after the same value is decoded twice. Camera access requires HTTPS or localhost and browser permission.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

const cameraStyles: Record<string, CSSProperties> = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.6rem',
    gridColumn: '1 / -1'
  },
  scanButton: {
    border: 0,
    borderRadius: '0.75rem',
    background: '#2563eb',
    color: 'white',
    padding: '0.7rem 0.9rem',
    fontWeight: 800,
    cursor: 'pointer'
  },
  fallbackText: {
    color: '#64748b',
    fontSize: '0.85rem'
  },
  panel: {
    width: '100%',
    padding: '1rem',
    border: '1px solid #bfdbfe',
    borderRadius: '0.9rem',
    background: '#eff6ff'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '0.75rem'
  },
  title: {
    color: '#0f172a'
  },
  description: {
    margin: '0.25rem 0 0',
    color: '#475569',
    lineHeight: 1.5
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.65rem',
    marginTop: '0.85rem'
  },
  primaryButton: {
    border: 0,
    borderRadius: '0.7rem',
    background: '#2563eb',
    color: 'white',
    padding: '0.65rem 0.85rem',
    fontWeight: 800,
    cursor: 'pointer'
  },
  secondaryButton: {
    border: '1px solid #cbd5e1',
    borderRadius: '0.7rem',
    background: 'white',
    color: '#0f172a',
    padding: '0.65rem 0.85rem',
    fontWeight: 800,
    cursor: 'pointer'
  },
  disabledButton: {
    cursor: 'not-allowed',
    opacity: 0.55
  },
  scannerShell: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '0.85rem',
    overflow: 'hidden',
    borderRadius: '0.8rem',
    background: '#0f172a'
  },
  scannerContainer: {
    width: '100%',
    maxWidth: '760px',
    minHeight: '260px'
  },
  helpText: {
    margin: '0.75rem 0 0',
    color: '#475569',
    lineHeight: 1.5
  },
  confirmationText: {
    margin: '0.75rem 0 0',
    color: '#92400e',
    fontWeight: 700,
    lineHeight: 1.5,
    overflowWrap: 'anywhere'
  },
  successText: {
    margin: '0.75rem 0 0',
    color: '#166534',
    fontWeight: 700,
    overflowWrap: 'anywhere'
  },
  errorText: {
    margin: '0.75rem 0 0',
    color: '#b91c1c',
    fontWeight: 700
  }
};
