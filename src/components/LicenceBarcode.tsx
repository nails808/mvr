import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import './LicenceBarcode.css';

interface LicenceBarcodeProps {
  /** Value encoded in the barcode — typically the licence number */
  value: string;
  className?: string;
}

/**
 * 1D Code 128 barcode. Fills parent width (no human-readable text).
 */
export function LicenceBarcode({ value, className }: LicenceBarcodeProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const el = svgRef.current;
    if (!wrap || !el) return;

    const text = (value || '').trim();
    if (!text) {
      while (el.firstChild) el.removeChild(el.firstChild);
      return;
    }

    const draw = () => {
      const available = Math.max(wrap.clientWidth, 120);
      // CODE128 needs ~11 modules per char + quiet zones; pick bar width to fill
      const approxModules = text.length * 11 + 40;
      const barWidth = Math.max(1.2, Math.min(3, available / approxModules));

      try {
        JsBarcode(el, text, {
          format: 'CODE128',
          displayValue: false,
          margin: 0,
          width: barWidth,
          height: 64,
          background: 'transparent',
          lineColor: '#000000',
        });
        // Stretch SVG to full container width while keeping bar proportions via CSS
        el.setAttribute('width', String(available));
        el.style.width = '100%';
        el.style.height = '64px';
        el.setAttribute('preserveAspectRatio', 'none');
      } catch {
        while (el.firstChild) el.removeChild(el.firstChild);
      }
    };

    draw();

    const ro = new ResizeObserver(() => draw());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [value]);

  if (!(value || '').trim()) return null;

  return (
    <div
      ref={wrapRef}
      className={`licence-barcode ${className ?? ''}`.trim()}
      aria-label="Licence barcode"
    >
      <svg ref={svgRef} className="licence-barcode__svg" />
    </div>
  );
}
