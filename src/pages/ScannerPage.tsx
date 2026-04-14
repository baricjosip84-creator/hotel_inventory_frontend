import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

/**
 * PRODUCTION SCANNER (WORKS ON PHONE)
 */

export default function ScannerPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startScanner = async () => {
    setError(null);

    try {
      const scanner = new Html5Qrcode('scanner-container');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: 250
        },
        (decodedText) => {
          setResult(decodedText);
        },
        () => {}
      );

      setIsRunning(true);
    } catch (err: any) {
      setError(err.message || 'Failed to start camera');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop();
      await scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsRunning(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Scanner</h2>

      <div style={{ marginBottom: 10 }}>
        <button onClick={startScanner} disabled={isRunning}>
          Start Scanner
        </button>

        <button onClick={stopScanner} disabled={!isRunning} style={{ marginLeft: 10 }}>
          Stop Scanner
        </button>
      </div>

      {error && (
        <div style={{ color: 'red', marginBottom: 10 }}>
          {error}
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
    </div>
  );
}