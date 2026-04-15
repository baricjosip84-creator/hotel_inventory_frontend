import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest, ApiError } from '../lib/api';

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
 *    - scan product barcode
 *    - resolve matching shipment item inside the selected shipment
 *    - return to shipments page with shipment + matched item selected
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

export default function ScannerPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const mode = (searchParams.get('mode') === 'product' ? 'product' : 'shipment') as ScannerMode;
  const shipmentId = searchParams.get('shipmentId') || '';

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [resolvedShipmentId, setResolvedShipmentId] = useState<string | null>(null);
  const [resolvedShipmentItemId, setResolvedShipmentItemId] = useState<string | null>(null);
  const [resolvedProductName, setResolvedProductName] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // Ignore stop errors if the scanner was already stopped.
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

    navigate(`/shipments?${params.toString()}`);
  };

  const handleResolvedScan = async (decodedText: string) => {
    setResult(decodedText);
    setResolvedShipmentId(null);
    setResolvedShipmentItemId(null);
    setResolvedProductName(null);
    setError(null);
    setIsResolving(true);

    try {
      /*
        Stop the camera immediately after a successful decode so the same code
        is not processed repeatedly.
      */
      await stopScanner();

      if (mode === 'product') {
        await resolveProductBarcode(decodedText);
      } else {
        await resolveShipmentCode(decodedText);
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

  const startScanner = async () => {
    setError(null);
    setResult(null);
    setResolvedShipmentId(null);
    setResolvedShipmentItemId(null);
    setResolvedProductName(null);

    try {
      /*
        Ensure any previous scanner instance is fully cleaned up before creating
        a new one.
      */
      await stopScanner();

      const scanner = new Html5Qrcode('scanner-container');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: 250
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
  };

  useEffect(() => {
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
        </div>
      ) : null}

      <div style={{ marginBottom: 10 }}>
        <button onClick={() => void startScanner()} disabled={isRunning || isResolving}>
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

      <div
        id="scanner-container"
        style={{
          width: '100%',
          maxWidth: 400,
          margin: '0 auto'
        }}
      />

      {result && (
        <div style={{ marginTop: 20 }}>
          <strong>Scanned Value:</strong>
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