import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useAppTranslation } from '../../i18n/I18nContext';

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

type ProductSearchBarcodeScannerProps = {
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

  return message || 'Could not start the barcode scanner.';
};

export function ProductSearchBarcodeScanner({ onDecoded }: ProductSearchBarcodeScannerProps) {
  const { ui } = useAppTranslation();
  const reactId = useId();
  const scannerContainerId = `product-search-camera-${reactId.replace(/:/g, '')}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const startingRef = useRef(false);
  const decodeLockedRef = useRef(false);
  const decodeCandidateRef = useRef<DecodeCandidate>({ value: '', count: 0, lastSeenAt: 0 });
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isDecodingImage, setIsDecodingImage] = useState(false);
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

  const closeScanner = async () => {
    await stopScanner();
    setIsOpen(false);
    setError(null);
    resetDecodeCandidate();
    decodeLockedRef.current = false;
  };

  const confirmDecodedValue = async (rawValue: string) => {
    const value = rawValue.trim();

    if (!value || decodeLockedRef.current) {
      return;
    }

    decodeLockedRef.current = true;

    try {
      navigator.vibrate?.(120);
    } catch {
      // Vibration feedback is optional.
    }

    await stopScanner();
    onDecoded(value);
    setIsOpen(false);
    setError(null);
    resetDecodeCandidate();
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
    if (startingRef.current || isRunning) {
      return;
    }

    startingRef.current = true;
    decodeLockedRef.current = false;
    resetDecodeCandidate();
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
      setError(ui(formatScannerError(scannerError)));
    }
  };

  const openAndStartScanner = () => {
    setIsOpen(true);
    window.setTimeout(() => {
      void startScanner();
    }, 0);
  };

  const handleImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError(null);
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
        : ui('No supported barcode or QR code could be decoded from that image.'));
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
    <div style={scannerStyles.contents}>
      <button
        type="button"
        data-skip-global-action-feedback="true"
        style={scannerStyles.scanButton}
        onClick={openAndStartScanner}
        aria-expanded={isOpen}
        aria-controls={`${scannerContainerId}-panel`}
      >
        {ui("Scan barcode")}
      </button>

      {isOpen ? (
        <div id={`${scannerContainerId}-panel`} style={scannerStyles.panel}>
          <div style={scannerStyles.header}>
            <div>
              <strong style={scannerStyles.title}>{ui("Find a product by barcode")}</strong>
              <p style={scannerStyles.description}>
                {ui("Scan a product or package barcode. A successful scan closes this panel and filters the Product List immediately.")}
              </p>
            </div>
            <button
              type="button"
              data-skip-global-action-feedback="true"
              style={scannerStyles.secondaryButton}
              onClick={() => void closeScanner()}
            >
              {ui("Close")}
            </button>
          </div>

          <div style={scannerStyles.actions}>
            <button
              type="button"
              data-skip-global-action-feedback="true"
              style={{
                ...scannerStyles.primaryButton,
                ...((isRunning || isStarting || isDecodingImage) ? scannerStyles.disabledButton : {})
              }}
              onClick={() => void startScanner()}
              disabled={isRunning || isStarting || isDecodingImage}
            >
              {isStarting ? ui('Starting camera...') : isRunning ? ui('Camera running') : ui('Start camera')}
            </button>
            <button
              type="button"
              data-skip-global-action-feedback="true"
              style={{
                ...scannerStyles.secondaryButton,
                ...(!isRunning ? scannerStyles.disabledButton : {})
              }}
              onClick={() => void stopScanner()}
              disabled={!isRunning}
            >
              {ui("Stop camera")}
            </button>
            <button
              type="button"
              data-skip-global-action-feedback="true"
              style={{
                ...scannerStyles.secondaryButton,
                ...((isStarting || isDecodingImage) ? scannerStyles.disabledButton : {})
              }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isStarting || isDecodingImage}
            >
              {isDecodingImage ? ui('Decoding image...') : ui('Scan from image')}
            </button>
          </div>

          <div style={scannerStyles.scannerShell}>
            <div id={scannerContainerId} style={scannerStyles.scannerContainer} />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(event) => void handleImageFileChange(event)}
          />

          {error ? <p style={scannerStyles.errorText}>{error}</p> : null}
          {candidateValue ? (
            <p style={scannerStyles.confirmationText}>
              {ui("Detected")} <strong>{candidateValue}</strong>{ui(". Hold still while the same value is confirmed")}
              {' '}({Math.min(confirmationCount, REQUIRED_MATCHING_DECODE_COUNT)}/{REQUIRED_MATCHING_DECODE_COUNT}).
            </p>
          ) : (
            <p style={scannerStyles.helpText}>
              {ui("Camera access requires HTTPS or localhost and browser permission. A handheld USB scanner can also type directly into the search field.")}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

const scannerStyles: Record<string, CSSProperties> = {
  contents: {
    display: 'contents'
  },
  scanButton: {
    alignSelf: 'end',
    border: 0,
    borderRadius: '10px',
    background: '#2563eb',
    color: '#ffffff',
    padding: '12px 16px',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  panel: {
    gridColumn: '1 / -1',
    width: '100%',
    padding: '16px',
    border: '1px solid #bfdbfe',
    borderRadius: '12px',
    background: '#eff6ff'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '12px'
  },
  title: {
    color: '#0f172a'
  },
  description: {
    margin: '4px 0 0',
    color: '#475569',
    lineHeight: 1.5
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginTop: '14px'
  },
  primaryButton: {
    border: 0,
    borderRadius: '10px',
    background: '#2563eb',
    color: '#ffffff',
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  secondaryButton: {
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    background: '#ffffff',
    color: '#0f172a',
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  disabledButton: {
    cursor: 'not-allowed',
    opacity: 0.55
  },
  scannerShell: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '14px',
    overflow: 'hidden',
    borderRadius: '12px',
    background: '#0f172a'
  },
  scannerContainer: {
    width: '100%',
    maxWidth: '760px',
    minHeight: '260px'
  },
  helpText: {
    margin: '12px 0 0',
    color: '#475569',
    lineHeight: 1.5
  },
  confirmationText: {
    margin: '12px 0 0',
    color: '#92400e',
    fontWeight: 700,
    lineHeight: 1.5,
    overflowWrap: 'anywhere'
  },
  errorText: {
    margin: '12px 0 0',
    color: '#b91c1c',
    fontWeight: 700
  }
};
