import { useEffect, useRef } from 'react';
import hologramSrc from '../assets/hologram.png';
import './HologramOverlay.css';

/**
 * Holographic foil overlay with continuous automatic shimmer.
 * No device tilt or pointer movement required.
 */
export function HologramOverlay() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let start = performance.now();

    const apply = (now: number) => {
      const t = (now - start) / 1000;

      // Slow elliptical path for the highlight centre (no user input)
      const x = 50 + Math.sin(t * 0.55) * 28;
      const y = 42 + Math.cos(t * 0.42) * 22;
      // Sweeping diagonal shine position
      const shine = ((t * 18) % 120) - 10;
      // Gentle rocking angle
      const angle = Math.sin(t * 0.35) * 4.5;

      el.style.setProperty('--holo-x', `${x.toFixed(2)}%`);
      el.style.setProperty('--holo-y', `${y.toFixed(2)}%`);
      el.style.setProperty('--holo-shine', `${shine.toFixed(1)}%`);
      el.style.setProperty('--holo-angle', `${angle.toFixed(2)}deg`);

      raf = requestAnimationFrame(apply);
    };

    raf = requestAnimationFrame(apply);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={ref} className="holo-overlay holo-overlay--ready" aria-hidden>
      <img src={hologramSrc} alt="" className="holo-overlay__img" draggable={false} />
      <div className="holo-overlay__shine" />
      <div className="holo-overlay__glint" />
      <div className="holo-overlay__sweep" />
    </div>
  );
}
