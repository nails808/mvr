import { useCallback, useEffect, useRef, useState } from 'react';
import './QrScannerScreen.css';

interface QrScannerScreenProps {
  onBack: () => void;
  onNeedPermission: () => void;
}

type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
};

function getBarcodeDetector(): BarcodeDetectorLike | null {
  const w = window as unknown as {
    BarcodeDetector?: new (opts?: { formats: string[] }) => BarcodeDetectorLike;
  };
  if (!w.BarcodeDetector) return null;
  try {
    return new w.BarcodeDetector({ formats: ['qr_code'] });
  } catch {
    return null;
  }
}

export function QrScannerScreen({ onBack, onNeedPermission }: QrScannerScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [session, setSession] = useState(0);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let detector: BarcodeDetectorLike | null = null;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera is not available on this device.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }

        detector = getBarcodeDetector();

        const tick = async () => {
          if (cancelled) return;
          const v = videoRef.current;
          if (v && detector && v.readyState >= 2) {
            try {
              const codes = await detector.detect(v);
              const value = codes[0]?.rawValue;
              if (value) {
                setResult(value);
                stopCamera();
                return;
              }
            } catch {
              /* keep scanning */
            }
          }
          raf = requestAnimationFrame(() => {
            void tick();
          });
        };
        raf = requestAnimationFrame(() => {
          void tick();
        });
      } catch (e) {
        const name = e instanceof DOMException ? e.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          onNeedPermission();
          return;
        }
        setError('Unable to start the camera. Check permissions and try again.');
      }
    };

    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stopCamera();
    };
  }, [onNeedPermission, stopCamera, session]);

  return (
    <div className="qr-scan">
      <header className="qr-scan__header">
        <button
          type="button"
          className="qr-scan__back"
          onClick={() => {
            stopCamera();
            onBack();
          }}
        >
          Close
        </button>
        <h1 className="qr-scan__title">Scan QR code</h1>
        <span className="qr-scan__spacer" />
      </header>

      <div className="qr-scan__stage">
        <video ref={videoRef} className="qr-scan__video" playsInline muted autoPlay />
        <div className="qr-scan__overlay" aria-hidden>
          <div className="qr-scan__frame" />
        </div>
        <p className="qr-scan__hint">Hover the QR code in front of your phone to scan</p>
      </div>

      {error && (
        <p className="qr-scan__status qr-scan__status--error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="qr-scan__result">
          <p className="qr-scan__result-label">Scanned</p>
          <p className="qr-scan__result-value">{result}</p>
          <button
            type="button"
            className="qr-scan__again"
            onClick={() => {
              setResult(null);
              setError(null);
              setSession((s) => s + 1);
            }}
          >
            Scan again
          </button>
        </div>
      )}
    </div>
  );
}
