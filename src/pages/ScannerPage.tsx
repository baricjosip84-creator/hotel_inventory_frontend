import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { apiRequest, ApiError } from '../lib/api';

/**
 * PRODUCTION SCANNER
 *
 * PURPOSE
 * -------
 * This scanner now does more than just read a value.
 *
 * New behavior:
 * - scans QR code
 * - resolves shipment by QR through backend
 * - redirects user into Shipments page with selected shipment preloaded
 *
 * BACKEND CONTRACT
 * ----------------
 * GET /shipments/qr/:code
 * Response:
 * {
 *   id: string,
 *   status: string
 * }
 */

type ShipmentLookupResponse = {
  id: string;
  status: string;
};

export default function ScannerPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const navigate = useNavigate();

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [resolvedShipmentId, setResolvedShipmentId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // Ignore stop errors when the scanner is already stopped.
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

  const handleResolvedScan = async (decodedText: string) => {
    setResult(decodedText);
    setResolvedShipmentId(null);
    setError(null);
    setIsResolving(true);

    try {
      /*
        Stop the camera immediately after a successful decode so the same code
        is not processed repeatedly.
      */
      await stopScanner();

      /*
        Resolve the scanned QR code to a shipment in the current tenant.
      */
      const shipment = await apiRequest<ShipmentLookupResponse>(
        `/shipments/qr/${encodeURIComponent(decodedText)}`
      );

      setResolvedShipmentId(shipment.id);

      /*
        Open the existing shipments page and preselect the shipment using a
        query param. This avoids requiring a new shipment detail route.
      */
      navigate(`/shipments?shipmentId=${encodeURIComponent(shipment.id)}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to resolve shipment from QR code.');
      }
    } finally {
      setIsResolving(false);
    }
  };

  const startScanner = async () => {
    setError(null);
    setResult(null);
    setResolvedShipmentId(null);

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
          /*
            Ignore repeated reads while the app is already resolving the first
            successful scan.
          */
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
      <h2>Scanner</h2>

      <p style={{ marginBottom: 16, color: '#4b5563' }}>
        Scan a shipment QR code to open that shipment directly in the Shipments page.
      </p>

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
          Resolving shipment from scanned QR code...
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
    </div>
  );
}