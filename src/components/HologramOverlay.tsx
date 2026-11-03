import { useEffect, useRef, useState, type CSSProperties } from 'react';
import hologramSrc from '../assets/hologram.png';
import './HologramOverlay.css';

/**
 * Approximates the original Compose HologramOverlay which used the
 * accelerometer for a tilt/shimmer effect. Here we combine:
 * - CSS shimmer animation (always on)
 * - DeviceOrientationEvent when available (HTTPS + permission on iOS)
 */
export function HologramOverlay() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const allowed = useRef(false);

  useEffect(() => {
    const onOrient = (e: DeviceOrientationEvent) => {
      // beta: front-back (-180..180), gamma: left-right (-90..90)
      const x = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 45));
      const y = Math.max(-1, Math.min(1, (e.beta ?? 0) / 45));
      setTilt({ x, y });
    };

    const enable = () => {
      if (allowed.current) return;
      allowed.current = true;
      window.addEventListener('deviceorientation', onOrient);
    };

    // iOS 13+ requires explicit permission
    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof DOE.requestPermission === 'function') {
      // Defer until first user gesture is impractical here; try quietly
      DOE.requestPermission()
        .then((r) => {
          if (r === 'granted') enable();
        })
        .catch(() => {
          /* ignore — CSS shimmer still works */
        });
    } else {
      enable();
    }

    return () => {
      window.removeEventListener('deviceorientation', onOrient);
    };
  }, []);

  const style: CSSProperties = {
    transform: `translate(${tilt.x * 6}px, ${tilt.y * 4}px) rotate(${tilt.x * 3}deg)`,
    // shift highlight with tilt
    ['--holo-x' as string]: `${50 + tilt.x * 20}%`,
    ['--holo-y' as string]: `${40 + tilt.y * 15}%`,
  };

  return (
    <div className="hologram-overlay" style={style} aria-hidden>
      <img src={hologramSrc} alt="" className="hologram-overlay__img" draggable={false} />
      <div className="hologram-overlay__shimmer" />
    </div>
  );
}
