import { useEffect, useRef, useState } from 'react';
import hologramSrc from '../assets/hologram.png';
import './HologramOverlay.css';

/**
 * Holographic foil overlay — responds to device orientation (tilt)
 * and pointer movement as a desktop fallback.
 */
export function HologramOverlay() {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let targetX = 50;
    let targetY = 40;
    let curX = 50;
    let curY = 40;

    const apply = () => {
      curX += (targetX - curX) * 0.12;
      curY += (targetY - curY) * 0.12;
      el.style.setProperty('--holo-x', `${curX}%`);
      el.style.setProperty('--holo-y', `${curY}%`);
      el.style.setProperty('--holo-shine', `${((curX + curY) / 2).toFixed(1)}%`);
      el.style.setProperty('--holo-angle', `${((curX - 50) * 0.6).toFixed(2)}deg`);
      raf = requestAnimationFrame(apply);
    };
    raf = requestAnimationFrame(apply);

    const onOrient = (e: DeviceOrientationEvent) => {
      // beta: front-back (-180..180), gamma: left-right (-90..90)
      const gamma = e.gamma ?? 0;
      const beta = e.beta ?? 0;
      targetX = Math.min(100, Math.max(0, 50 + gamma * 1.2));
      targetY = Math.min(100, Math.max(0, 40 + (beta - 45) * 0.9));
      setReady(true);
    };

    const onPointer = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      targetX = ((e.clientX - r.left) / r.width) * 100;
      targetY = ((e.clientY - r.top) / r.height) * 100;
    };

    window.addEventListener('deviceorientation', onOrient);
    el.addEventListener('pointermove', onPointer);

    // iOS 13+ requires permission
    const doe = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof doe.requestPermission === 'function') {
      // Permission is requested on first user gesture; soft-fail if blocked
      const ask = () => {
        void doe.requestPermission?.().then((state) => {
          if (state === 'granted') setReady(true);
        });
        window.removeEventListener('click', ask);
        window.removeEventListener('touchend', ask);
      };
      window.addEventListener('click', ask, { once: true });
      window.addEventListener('touchend', ask, { once: true });
    } else {
      setReady(true);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('deviceorientation', onOrient);
      el.removeEventListener('pointermove', onPointer);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`holo-overlay ${ready ? 'holo-overlay--ready' : ''}`}
      aria-hidden
    >
      <img src={hologramSrc} alt="" className="holo-overlay__img" draggable={false} />
      <div className="holo-overlay__shine" />
      <div className="holo-overlay__glint" />
    </div>
  );
}
