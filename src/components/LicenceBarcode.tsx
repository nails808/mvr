import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import './LicenceBarcode.css';

interface LicenceBarcodeProps {
  /** Value encoded in the barcode — typically the licence number */
  value: string;
  className?: string;
}

/**
 * 1D Code 128 barcode for police / scanner use.
 * Dynamically encodes `value` (licence number). No human-readable text.
 */
export function LicenceBarcode({ value, className }: LicenceBarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const text = (value || '').trim();
    if (!text) {
      // Clear previous drawing
      while (el.firstChild) el.removeChild(el.firstChild);
      return;
    }

    try {
      JsBarcode(el, text, {
        format: 'CODE128',
        displayValue: false, // no human-readable numbers under the bars
        margin: 0,
        width: 1.6,
        height: 48,
        background: 'transparent',
        lineColor: '#0D2D6B',
      });
    } catch {
      // Invalid characters for Code128 — fail silently
      while (el.firstChild) el.removeChild(el.firstChild);
    }
  }, [value]);

  if (!(value || '').trim()) return null;

  return (
    <div className={`licence-barcode ${className ?? ''}`.trim()} aria-label="Licence barcode">
      <svg ref={svgRef} className="licence-barcode__svg" />
    </div>
  );
}
